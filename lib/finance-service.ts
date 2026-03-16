import { prisma } from "./prisma";
import { NotificationService, NotificationType } from "./notifications";
import { WalletTransactionType, NotificationType as PrismaNotificationType } from "@prisma/client";
import { getPlatformCommissionRate } from "./actions/settings-actions";

export class FinanceService {
  /**
   * Gets or creates the system wallet (singleton)
   */
  private static async getSystemWallet(tx: any) {
    let systemWallet = await tx.wallet.findFirst({
      where: { type: "SYSTEM" }
    });
    if (!systemWallet) {
      systemWallet = await tx.wallet.create({
        data: {
          type: "SYSTEM",
          balance: 0,
          currency: "USD"
        }
      });
    }
    return systemWallet;
  }

  /**
   * Calculates platform commission for a booking.
   * Includes both the fixed Service Fee and the percentage-based commission.
   */
  static async calculateCommission(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { location: true },
    });

    if (!booking) throw new Error("Booking not found");

    // Fetch active rules, ordered by priority (highest first)
    const rules = await prisma.commissionRule.findMany({
      where: { isActive: true },
      orderBy: { priority: "desc" },
    });

    const subtotal = booking.totalPrice - booking.taxes - booking.fees;
    const baseFee = booking.fees || 0;
    let commissionAmount = 0;
    const defaultRate = await getPlatformCommissionRate();
    let appliedRate = defaultRate;
    let ruleDetails = `Service Fee ($${baseFee.toFixed(2)}) + Commission (${defaultRate}%)`;

    if (rules.length > 0) {
      // Apply the highest priority rule that meets the criteria
      const rule = rules.find(r => !r.minBookingValue || subtotal >= r.minBookingValue);

      if (rule) {
        if (rule.type === "PERCENTAGE") {
          commissionAmount = subtotal * (rule.value / 100);
          appliedRate = rule.value;
          ruleDetails = `Service Fee ($${baseFee.toFixed(2)}) + Commission (${rule.value}%)`;
        } else if (rule.type === "FIXED") {
          commissionAmount = rule.value;
          // Calculate effective percentage for display purposes
          appliedRate = subtotal > 0 ? parseFloat(((rule.value / subtotal) * 100).toFixed(1)) : 0;
          ruleDetails = `Service Fee ($${baseFee.toFixed(2)}) + Fixed Fee ($${rule.value.toFixed(2)})`;
        }

        // Apply max commission cap if exists (on the commissionAmount part only)
        if (rule.maxCommission && commissionAmount > rule.maxCommission) {
          commissionAmount = rule.maxCommission;
          appliedRate = subtotal > 0 ? parseFloat(((rule.maxCommission / subtotal) * 100).toFixed(1)) : 0;
          ruleDetails += ` (Capped at $${rule.maxCommission.toFixed(2)})`;
        }
      } else {
        commissionAmount = subtotal * (defaultRate / 100);
      }
    } else {
      commissionAmount = subtotal * (defaultRate / 100);
    }

    const totalPlatformEarnings = commissionAmount + baseFee;

    return {
      amount: parseFloat(totalPlatformEarnings.toFixed(2)),
      details: ruleDetails,
      rate: appliedRate
    };
  }

  /**
   * Records initial payment in the owner's total balance (not yet available)
   */
  static async recordPreliminaryEarnings(bookingId: string, tx?: any) {
    const prismaClient = tx || prisma;

    try {
      const booking = await prismaClient.booking.findUnique({
        where: { id: bookingId },
        include: {
          location: {
            include: { owner: true }
          }
        },
      });

      if (!booking) throw new Error("Booking not found");
      const ownerId = booking.location.owner.id;

      // 1. Get or create wallet
      let wallet = await prismaClient.wallet.findUnique({
        where: { ownerId }
      });

      if (!wallet) {
        wallet = await prismaClient.wallet.create({
          data: {
            ownerId,
            balance: 0,
            totalBalance: 0,
            currency: "USD"
          }
        });
      }

      // 2. Create DEPOSITED transaction
      await prismaClient.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.DEPOSITED,
          amount: booking.totalPrice,
          description: `Payment received for booking ${booking.confirmationCode} (Held in total balance)`,
          status: "COMPLETED",
          reference: bookingId
        }
      });

      // 3. Increment totalBalance
      await (prismaClient.wallet as any).update({
        where: { id: wallet.id },
        data: {
          totalBalance: { increment: booking.totalPrice }
        }
      });
 
      console.log(`[Finance Service] ✅ Preliminary earnings recorded for booking ${booking.confirmationCode}: $${booking.totalPrice}`);
      return { success: true };
    } catch (error) {
      console.error("[Finance Service Error] RECORD_PRELIMINARY_EARNINGS_ERROR:", error);
      throw error;
    }
  }

  /**
   * Credits earnings to owner's available balance and system wallet after booking completion
   * This now releases the ENTIRE amount (Base + Extensions + Overstays) held in totalBalance.
   */
  static async creditEarnings(bookingId: string, txClient?: any) {
    const prismaClient = txClient || prisma;

    try {
      const booking = await (prismaClient.booking as any).findUnique({
        where: { id: bookingId },
        include: {
          location: {
            include: { owner: true }
          },
          parkingSession: true
        },
      });

      if (!booking) throw new Error("Booking not found");

      const ownerId = booking.location.owner.id;
      const userId = booking.location.owner.userId;

      // 1. Check if already fully credited (idempotency)
      const existingTx = await prismaClient.walletTransaction.findFirst({
        where: { reference: bookingId, type: "EARNED" as any, status: "COMPLETED" }
      });

      if (existingTx) {
          // If already has an EARNED transaction, check if it covers the current total price
          const txSum = await prismaClient.walletTransaction.aggregate({
            where: { walletId: ownerId, reference: bookingId, type: "EARNED" as any, status: "COMPLETED" },
            _sum: { amount: true }
          });
          
          if (txSum._sum.amount && Math.abs(txSum._sum.amount - booking.totalPrice) < 1) {
              console.log(`Booking ${bookingId} already fully settled.`);
              return;
          }
      }

      // Safety: Only release if vehicle has actually checked out OR it's a manual cleanup
      if (!booking.parkingSession?.actualCheckOutTime && booking.status !== "COMPLETED") {
        console.warn(`Booking ${bookingId} has not checked out yet. Settlement postponed.`);
        return;
      }

      const executeCredit = async (tx: any) => {
        // 1. Get owner wallet
        const wallet = await tx.wallet.findUnique({
          where: { ownerId }
        });

        if (!wallet) throw new Error("Owner wallet not found");

        // 2. Calculate platform commission on the FULL total
        const totalGross = booking.totalPrice;
        
        // Use pre-calculated ownerEarnings from booking if available, otherwise calculate
        let netEarnings: number;
        let platformCommission: number;
        let commissionDetails = "Platform Commission";

        const commissionInfo = await this.calculateCommission(bookingId);
        platformCommission = commissionInfo.amount;
        netEarnings = parseFloat((totalGross - platformCommission).toFixed(2));
        commissionDetails = commissionInfo.details;

        // 3. Decrement totalBalance, Increment available balance
        await (tx.wallet as any).update({
          where: { id: wallet.id },
          data: {
            totalBalance: { decrement: totalGross },
            balance: { increment: netEarnings }
          }
        });

        // 4. Create EARNED transaction for owner
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "EARNED" as any,
            amount: netEarnings,
            description: `Total earnings released for booking ${booking.confirmationCode} (incl. extras)`,
            status: "COMPLETED",
            reference: bookingId
          }
        });

        // 5. Create COMMISSION transaction (deduction record for owner)
        await (tx.walletTransaction as any).create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.COMMISSION,
            amount: -platformCommission,
            description: `Platform fee for booking ${booking.confirmationCode} (${commissionDetails})`,
            status: "COMPLETED",
            reference: bookingId
          }
        });

        // 6. Credit System Wallet
        const systemWallet = await this.getSystemWallet(tx);
        await (tx.wallet as any).update({
          where: { id: systemWallet.id },
          data: {
            balance: { increment: platformCommission }
          }
        });

        // 7. Create System Transaction
        await (tx.walletTransaction as any).create({
          data: {
            walletId: systemWallet.id,
            type: WalletTransactionType.COMMISSION,
            amount: platformCommission,
            description: `Commission from booking ${booking.confirmationCode} (${booking.location.name})`,
            status: "COMPLETED",
            reference: bookingId
          }
        });

        // 8. Notify Owner
        await NotificationService.create({
          userId,
          title: "Earnings Available",
          message: `Your earnings of $${netEarnings.toFixed(2)} from booking ${booking.confirmationCode} are now available for withdrawal.`,
          type: NotificationType.EARNINGS_CREDITED,
          metadata: { bookingId, netEarnings }
        });
 
        console.log(`[Finance Service] ✅ Earnings credited for booking ${booking.confirmationCode}. Owner: $${netEarnings}, System: $${platformCommission}`);
        return { netEarnings, platformCommission };
      };

      if (txClient) {
        return await executeCredit(txClient);
      } else {
        return await prisma.$transaction(async (tx) => {
          return await executeCredit(tx);
        });
      }
    } catch (error) {
      console.error("[Finance Service Error] CREDIT_EARNINGS_ERROR:", error);
      throw error;
    }
  }

  /**
   * Processes a refund deduction from the wallet
   */
  static async processRefundDeduction(bookingId: string, refundAmount: number) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          location: {
            include: { owner: true }
          }
        },
      });

      if (!booking) throw new Error("Booking not found");
      const ownerId = booking.location.owner.id;
      const userId = booking.location.owner.userId;

      const wallet = await prisma.wallet.findUnique({
        where: { ownerId }
      });

      if (!wallet) return;

      return await prisma.$transaction(async (tx) => {
        // Create REFUND transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.REFUND,
            amount: -refundAmount,
            description: `Refund deduction for booking ${booking.confirmationCode}`,
            status: "COMPLETED",
            reference: bookingId
          }
        });

        // Update balance (deduct from available if it was already earned, 
        // OR we might need to deduct from totalBalance if it hasn't been earned yet)
        if (booking.status !== "COMPLETED") {
          await (tx.wallet as any).update({
            where: { id: wallet.id },
            data: {
              totalBalance: { decrement: refundAmount }
            }
          });
        } else {
          await (tx.wallet as any).update({
            where: { id: wallet.id },
            data: {
              balance: { decrement: refundAmount }
            }
          });
        }

        // Notify Owner
        await NotificationService.create({
          userId,
          title: "Refund Deduction",
          message: `A refund of $${refundAmount.toFixed(2)} has been deducted from your wallet for booking ${booking.confirmationCode}.`,
          type: NotificationType.REFUND_DEDUCTION,
          metadata: { bookingId, refundAmount }
        });
 
        console.log(`[Finance Service] ✅ Refund processed for booking ${booking.confirmationCode}: -$${refundAmount}`);
      });
    } catch (error) {
      console.error("[Finance Service Error] REFUND_DEDUCTION_ERROR:", error);
      throw error;
    }
  }

  /**
   * Records extra earnings from extensions or overstays.
   * Funds are HELD in totalBalance and only released via creditEarnings.
   */
  static async recordExtraEarnings(bookingId: string, amount: number, type: 'EXTENSION' | 'OVERSTAY', txClient?: any) {
    const prismaClient = txClient || prisma;

    try {
      const booking = await prismaClient.booking.findUnique({
        where: { id: bookingId },
        include: {
          location: {
            include: { owner: true }
          }
        },
      });

      if (!booking) throw new Error("Booking not found");
      const ownerId = booking.location.owner.id;

      const executeExtraEarnings = async (tx: any) => {
        // 1. Get or create owner wallet
        let wallet = await tx.wallet.findUnique({
          where: { ownerId }
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              ownerId,
              balance: 0,
              totalBalance: 0,
              currency: "USD"
            }
          });
        }

        // 2. Increment totalBalance only (Funds are HELD)
        await (tx.wallet as any).update({
          where: { id: wallet.id },
          data: {
            totalBalance: { increment: amount }
          }
        });

        // 3. Create DEPOSITED transaction to record receipt
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.DEPOSITED,
            amount: amount,
            description: `Payment for ${type.toLowerCase()} received for booking ${booking.confirmationCode} (Held)`,
            status: "COMPLETED",
            reference: bookingId
          }
        });

        return { success: true };
      };

      if (txClient) {
        return await executeExtraEarnings(txClient);
      } else {
        return await prisma.$transaction(async (tx) => {
          return await executeExtraEarnings(tx);
        });
      }
    } catch (error) {
      console.error("[RECORD_EXTRA_EARNINGS_ERROR]", error);
      throw error;
    }
  }
}

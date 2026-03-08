import { prisma } from "./prisma";
import { NotificationService, NotificationType } from "./notifications";
import { WalletTransactionType } from "@prisma/client";
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
   * Calculates platform commission for a booking
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
    let commissionAmount = 0;
    const defaultRate = await getPlatformCommissionRate();
    let appliedRate = defaultRate;
    let ruleDetails = `Platform Commission ${defaultRate}%`;

    if (rules.length > 0) {
      // Apply the highest priority rule that meets the criteria
      const rule = rules.find(r => !r.minBookingValue || subtotal >= r.minBookingValue);

      if (rule) {
        if (rule.type === "PERCENTAGE") {
          commissionAmount = subtotal * (rule.value / 100);
          appliedRate = rule.value;
          ruleDetails = `Platform Commission ${rule.value}%`;
        } else if (rule.type === "FIXED") {
          commissionAmount = rule.value;
          // Calculate effective percentage for display purposes
          appliedRate = parseFloat(((rule.value / subtotal) * 100).toFixed(1));
          ruleDetails = `Platform Commission $${rule.value.toFixed(2)} Fixed (${appliedRate}%)`;
        }

        // Apply max commission cap if exists
        if (rule.maxCommission && commissionAmount > rule.maxCommission) {
          commissionAmount = rule.maxCommission;
          appliedRate = parseFloat(((rule.maxCommission / subtotal) * 100).toFixed(1));
          ruleDetails += ` (Capped at $${rule.maxCommission.toFixed(2)})`;
        }
      } else {
        commissionAmount = subtotal * (defaultRate / 100);
      }
    } else {
      commissionAmount = subtotal * (defaultRate / 100);
    }

    return {
      amount: parseFloat(commissionAmount.toFixed(2)),
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
          type: "DEPOSITED" as any,
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

      return { success: true };
    } catch (error) {
      console.error("[RECORD_PRELIMINARY_EARNINGS_ERROR]", error);
      throw error;
    }
  }

  /**
   * Credits earnings to owner's available balance and system wallet after booking completion
   */
  static async creditEarnings(bookingId: string, txClient?: any) {
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
      const userId = booking.location.owner.userId;

      // Check if already credited to available balance (idempotency)
      const existingTx = await prismaClient.walletTransaction.findFirst({
        where: { reference: bookingId, type: "EARNED" as any }
      });

      if (existingTx) {
        console.warn(`Booking ${bookingId} already credited to available balance`);
        return;
      }

      const executeCredit = async (tx: any) => {
        // 1. Get owner wallet
        const wallet = await tx.wallet.findUnique({
          where: { ownerId }
        });

        if (!wallet) throw new Error("Owner wallet not found");

        // 2. Calculate platform commission
        // Use pre-calculated ownerEarnings from booking if available, otherwise calculate from rules
        const ownerEarningsFromBooking = booking.ownerEarnings;
        let netEarnings: number;
        let platformCommission: number;
        let commissionDetails = "Platform Commission";

        if (ownerEarningsFromBooking !== null && ownerEarningsFromBooking !== undefined) {
          netEarnings = ownerEarningsFromBooking;
          platformCommission = parseFloat((booking.totalPrice - netEarnings).toFixed(2));
        } else {
          const commissionInfo = await this.calculateCommission(bookingId);
          const subtotal = booking.totalPrice - booking.taxes - booking.fees;

          // Owner get: Subtotal - Commission + Taxes
          netEarnings = parseFloat((subtotal - commissionInfo.amount + booking.taxes).toFixed(2));
          // Admin get: Commission + Fees (implicit via subtraction)
          platformCommission = parseFloat((booking.totalPrice - netEarnings).toFixed(2));
          commissionDetails = commissionInfo.details;
        }

        // 3. Decrement totalBalance, Increment available balance
        await (tx.wallet as any).update({
          where: { id: wallet.id },
          data: {
            totalBalance: { decrement: booking.totalPrice },
            balance: { increment: netEarnings }
          }
        });

        // 3. Create EARNED transaction for owner
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "EARNED" as any,
            amount: netEarnings,
            description: `Earnings released for booking ${booking.confirmationCode}`,
            status: "COMPLETED",
            reference: bookingId
          }
        });

        // 4. Create COMMISSION transaction (deduction record for owner)
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

        // 5. Credit System Wallet
        const systemWallet = await this.getSystemWallet(tx);
        await (tx.wallet as any).update({
          where: { id: systemWallet.id },
          data: {
            balance: { increment: platformCommission }
          }
        });

        // 6. Create System Transaction
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

        // 7. Notify Owner
        await NotificationService.create({
          userId,
          title: "Earnings Available",
          message: `Your earnings of $${netEarnings.toFixed(2)} from booking ${booking.confirmationCode} are now available for withdrawal.`,
          type: NotificationType.EARNINGS_CREDITED,
          metadata: { bookingId, netEarnings }
        });

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
      console.error("[CREDIT_EARNINGS_ERROR]", error);
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
      });
    } catch (error) {
      console.error("[REFUND_DEDUCTION_ERROR]", error);
      throw error;
    }
  }
}

import { prisma } from "./prisma";
import { NotificationService, NotificationType } from "./notifications";

export enum WalletTransactionType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
  WITHDRAWAL = "WITHDRAWAL",
  REFUND = "REFUND",
  COMMISSION = "COMMISSION",
  MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT",
}

export class FinanceService {
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

    // Default commission if no rules found: 15%
    let commissionAmount = 0;
    
    if (rules.length > 0) {
      // Apply the highest priority rule that meets the criteria
      const rule = rules.find(r => !r.minBookingValue || booking.totalPrice >= r.minBookingValue);
      
      if (rule) {
        if (rule.type === "PERCENTAGE") {
          commissionAmount = (booking.totalPrice * (rule.value / 100));
        } else if (rule.type === "FIXED") {
          commissionAmount = rule.value;
        }

        // Apply max commission cap if exists
        if (rule.maxCommission && commissionAmount > rule.maxCommission) {
          commissionAmount = rule.maxCommission;
        }
      } else {
        // Fallback if no rule matches minBookingValue (though unlikely if a base rule exists)
        commissionAmount = booking.totalPrice * 0.15;
      }
    } else {
      // Default fallback: 15%
      commissionAmount = booking.totalPrice * 0.15;
    }

    return parseFloat(commissionAmount.toFixed(2));
  }

  /**
   * Credits earnings to owner's wallet after booking completion
   */
  static async creditEarnings(bookingId: string) {
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
      if (booking.status !== "COMPLETED") {
          // In a real system, we only credit when completed.
          // For now, we allow calling this explicitly.
      }

      const ownerId = booking.location.owner.id;
      const userId = booking.location.owner.userId;

      // Check if already credited (idempotency)
      const existingTx = await prisma.walletTransaction.findFirst({
        where: { reference: bookingId, type: "CREDIT" }
      });

      if (existingTx) {
        console.warn(`Booking ${bookingId} already credited to wallet`);
        return;
      }

      return await prisma.$transaction(async (tx) => {
        // 1. Get or create wallet
        let wallet = await tx.wallet.findUnique({
          where: { ownerId }
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              ownerId,
              balance: 0,
              currency: "USD"
            }
          });
        }

        const platformCommission = await this.calculateCommission(bookingId);
        const netEarnings = booking.totalPrice - platformCommission;

        // 2. Create CREDIT transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "CREDIT" as any,
            amount: booking.totalPrice,
            description: `Earnings for booking ${booking.confirmationCode}`,
            status: "COMPLETED",
            reference: bookingId
          }
        });

        // 3. Create COMMISSION transaction (deduction)
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "COMMISSION" as any,
            amount: -platformCommission,
            description: `Platform fee for booking ${booking.confirmationCode}`,
            status: "COMPLETED",
            reference: bookingId
          }
        });

        // 4. Update wallet balance
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: netEarnings }
          }
        });

        // 5. Notify Owner
        await NotificationService.create({
          userId,
          title: "Earnings Credited",
          message: `You earned $${netEarnings.toFixed(2)} from booking ${booking.confirmationCode}.`,
          type: "EARNINGS_CREDITED" as any,
          metadata: { bookingId, netEarnings }
        });

        return { updatedWallet, netEarnings };
      });
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
            type: "REFUND" as any,
            amount: -refundAmount,
            description: `Refund deduction for booking ${booking.confirmationCode}`,
            status: "COMPLETED",
            reference: bookingId
          }
        });

        // Update balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: refundAmount }
          }
        });

        // Notify Owner
        await NotificationService.create({
          userId,
          title: "Refund Deduction",
          message: `A refund of $${refundAmount.toFixed(2)} has been deducted from your wallet for booking ${booking.confirmationCode}.`,
          type: "REFUND_DEDUCTION" as any,
          metadata: { bookingId, refundAmount }
        });
      });
    } catch (error) {
      console.error("[REFUND_DEDUCTION_ERROR]", error);
      throw error;
    }
  }
}

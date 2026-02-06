import { prisma } from "@/lib/prisma";
import { PricingRule } from "@prisma/client";

/**
 * Checks if a parking location has available spots for a given time range.
 * Logic: Finds all bookings that overlap with the selected range and compares 
 * against the total spots available at the location.
 */
export async function checkLocationAvailability(
  locationId: string,
  checkIn: Date,
  checkOut: Date,
  totalSpots: number
) {
  const overlappingBookings = await prisma.booking.count({
    where: {
      locationId,
      status: { in: ["CONFIRMED", "PENDING"] },
      AND: [
        { checkIn: { lt: checkOut } },
        { checkOut: { gt: checkIn } },
      ],
    },
  });

  return totalSpots - overlappingBookings > 0;
}

/**
 * Calculates dynamic pricing based on base rate, active pricing rules, promotions, and commissions.
 */
export function calculatePricing(
  basePrice: number,
  rules: PricingRule[],
  checkIn: Date,
  checkOut: Date,
  promotion?: { type: string; value: number } | null,
  commissionRule?: { type: string; value: number } | null
) {
  const durationInHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  const durationInDays = Math.ceil(durationInHours / 24);

  // 1. Apply Dynamic Pricing Rules
  let multiplier = 1.0;
  const activeRules = rules.filter(rule => {
    if (!rule.isActive) return false;
    if (rule.startDate && rule.startDate > checkIn) return false;
    if (rule.endDate && rule.endDate < checkOut) return false;
    // Optional: add daysOfWeek check here
    return true;
  });

  if (activeRules.length > 0) {
    multiplier = Math.max(...activeRules.map(r => r.multiplier));
  }

  const subtotalBeforeDiscount = basePrice * durationInDays * multiplier;

  // 2. Apply Promotion
  let discount = 0;
  if (promotion) {
    if (promotion.type === "percentage") {
      discount = subtotalBeforeDiscount * (promotion.value / 100);
    } else if (promotion.type === "fixed") {
      discount = promotion.value;
    }
  }

  const subtotal = Math.max(0, subtotalBeforeDiscount - discount);
  const taxes = subtotal * 0.12; // 12% Tax
  const fees = 5.99; // Standard Service Fee
  const total = subtotal + taxes + fees;

  // 3. Calculate Commission (based on subtotal)
  let commission = 0;
  if (commissionRule) {
    if (commissionRule.type === "percentage") {
      commission = subtotal * (commissionRule.value / 100);
    } else if (commissionRule.type === "fixed") {
      commission = commissionRule.value;
    }
  } else {
    // Default 15% commission if no rule found
    commission = subtotal * 0.15;
  }

  const ownerEarnings = subtotal - commission;

  return {
    basePrice,
    multiplier,
    durationInDays,
    subtotalBeforeDiscount: Number(subtotalBeforeDiscount.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    subtotal: Number(subtotal.toFixed(2)),
    taxes: Number(taxes.toFixed(2)),
    fees: Number(fees.toFixed(2)),
    total: Number(total.toFixed(2)),
    commission: Number(commission.toFixed(2)),
    ownerEarnings: Number(ownerEarnings.toFixed(2)),
  };
}

/**
 * Generates a unique confirmation code for bookings.
 */
export function generateConfirmationCode() {
  return `PK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
}

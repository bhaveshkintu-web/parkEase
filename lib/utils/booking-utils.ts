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
 * Calculates dynamic pricing based on base rate and active pricing rules.
 */
export function calculatePricing(
  basePrice: number,
  rules: PricingRule[],
  checkIn: Date,
  checkOut: Date
) {
  const durationInHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  const durationInDays = Math.ceil(durationInHours / 24);

  // Apply highest multiplier from active rules
  let multiplier = 1.0;
  const now = new Date();

  const activeRules = rules.filter(rule => {
    if (!rule.isActive) return false;
    if (rule.startDate && rule.startDate > checkIn) return false;
    if (rule.endDate && rule.endDate < checkOut) return false;
    return true;
  });

  if (activeRules.length > 0) {
    multiplier = Math.max(...activeRules.map(r => r.multiplier));
  }

  const subtotal = basePrice * durationInDays * multiplier;
  const taxes = subtotal * 0.12; // 12% Tax
  const fees = 5.99; // Standard Service Fee

  return {
    basePrice,
    multiplier,
    durationInDays,
    subtotal: Number(subtotal.toFixed(2)),
    taxes: Number(taxes.toFixed(2)),
    fees: Number(fees.toFixed(2)),
    total: Number((subtotal + taxes + fees).toFixed(2)),
  };
}

/**
 * Generates a unique confirmation code for bookings.
 */
export function generateConfirmationCode() {
  return `PK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
}

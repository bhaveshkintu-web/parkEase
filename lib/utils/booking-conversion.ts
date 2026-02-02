import { prisma } from "@/lib/prisma";
import { generateConfirmationCode } from "./booking-utils";
import { BookingRequest, Booking, ParkingSession } from "@prisma/client";

export async function convertRequestToBooking(requestId: string, processedById: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch the request
    const request = await tx.bookingRequest.findUnique({
      where: { id: requestId },
      include: { location: true }
    });

    if (!request) throw new Error("Request not found");
    if (request.status !== "PENDING") throw new Error("Request is not in PENDING status");

    // 2. Create the Booking
    const booking = await tx.booking.create({
      data: {
        userId: request.customerId || undefined, // Optional customer ID
        locationId: request.parkingId,
        checkIn: request.requestedStart,
        checkOut: request.requestedEnd,
        guestFirstName: request.customerName.split(" ")[0] || "Guest",
        guestLastName: request.customerName.split(" ").slice(1).join(" ") || "Customer",
        guestEmail: "", // We might not have this from walk-in
        guestPhone: request.customerPhone || "",
        vehiclePlate: request.vehiclePlate,
        vehicleType: request.vehicleType,
        vehicleMake: "Other", // Placeholder for walk-in
        vehicleModel: "Other",
        vehicleColor: "Other",
        totalPrice: request.estimatedAmount,
        taxes: request.estimatedAmount * 0.12, // Standard tax
        fees: 0, // Walk-in might have no fees
        status: "CONFIRMED",
        confirmationCode: generateConfirmationCode(),
      }
    });

    // 3. Update the request status and link bookingId
    const updatedRequest = await tx.bookingRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        processedById,
        processedAt: new Date(),
        bookingId: booking.id,
      }
    });

    // 4. Create ParkingSession
    const isWalkIn = request.requestType === "WALK_IN";
    const now = new Date();
    const shouldAutoCheckIn = isWalkIn && (request.requestedStart <= now);

    await tx.parkingSession.create({
      data: {
        bookingId: booking.id,
        locationId: request.parkingId,
        status: shouldAutoCheckIn ? "checked_in" : "pending",
        checkInTime: shouldAutoCheckIn ? now : undefined,
      }
    });

    // 5. Update Location occupancy
    await tx.parkingLocation.update({
      where: { id: request.parkingId },
      data: { availableSpots: { decrement: 1 } }
    });

    // 6. Update Analytics
    await tx.locationAnalytics.upsert({
      where: { locationId: request.parkingId },
      create: {
        locationId: request.parkingId,
        totalBookings: 1,
        revenue: request.estimatedAmount,
      },
      update: {
        totalBookings: { increment: 1 },
        revenue: { increment: request.estimatedAmount },
      }
    });

    return { request: updatedRequest, booking };
  });
}

export async function handleExtensionRequest(requestId: string, processedById: string) {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.bookingRequest.findUnique({
      where: { id: requestId }
    });

    if (!request || !request.originalBookingId) throw new Error("Invalid extension request");

    // 1. Update request status
    const updatedRequest = await tx.bookingRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        processedById,
        processedAt: new Date(),
      }
    });

    // 2. Update existing Booking
    const booking = await tx.booking.update({
      where: { id: request.originalBookingId },
      data: {
        checkOut: request.requestedEnd,
        totalPrice: { increment: request.estimatedAmount }
      }
    });

    // 3. Update active session if exists
    await tx.parkingSession.updateMany({
      where: { bookingId: request.originalBookingId },
      data: {
        status: "checked_in" // Ensure it's active
      }
    });

    return { request: updatedRequest, booking };
  });
}

"use server";

import { prisma } from "@/lib/prisma";

/**
 * Find booking by license plate and phone number
 */
export async function findBookingByLicensePlate(licensePlate: string, phone: string) {
  try {
    // Normalize inputs
    const normalizedPlate = licensePlate.trim().toUpperCase();
    const normalizedPhone = phone.trim().replace(/\D/g, ''); // Remove non-digits

    if (!normalizedPlate || !normalizedPhone) {
      return { success: false, error: "License plate and phone number are required" };
    }

    // Search for bookings matching the criteria
    const bookings = await prisma.booking.findMany({
      where: {
        vehiclePlate: {
          equals: normalizedPlate,
          mode: 'insensitive',
        },
        guestPhone: {
          contains: normalizedPhone,
        },
      },
      include: {
        location: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`[Find Booking Action] Search by license plate ${normalizedPlate} for phone ${normalizedPhone}. Found: ${bookings.length}`);

    if (bookings.length === 0) {
      return { 
        success: false, 
        error: "No booking found with the provided license plate and phone number" 
      };
    }

    // Return booking details
    return { 
      success: true, 
      data: bookings.map(booking => ({
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        status: booking.status,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guestFirstName: booking.guestFirstName,
        guestLastName: booking.guestLastName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        vehicleMake: booking.vehicleMake,
        vehicleModel: booking.vehicleModel,
        vehicleColor: booking.vehicleColor,
        vehiclePlate: booking.vehiclePlate,
        totalPrice: booking.totalPrice,
        taxes: booking.taxes,
        fees: booking.fees,
        qrCode: booking.qrCode,
        location: booking.location,
        createdAt: booking.createdAt,
      }))
    };
  } catch (error) {
    console.error("Failed to find booking by license plate:", error);
    return { success: false, error: "Failed to search for booking" };
  }
}

/**
 * Find booking by confirmation code
 */
export async function findBookingByConfirmationCode(code: string) {
  try {
    const normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      return { success: false, error: "Confirmation code is required" };
    }

    const booking = await prisma.booking.findUnique({
      where: {
        confirmationCode: normalizedCode,
      },
      include: {
        location: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    if (!booking) {
      console.log(`[Find Booking Action] No booking found for code: ${normalizedCode}`);
      return { 
        success: false, 
        error: "No booking found with the provided confirmation code" 
      };
    }

    console.log(`[Find Booking Action] ✅ Found booking ${booking.id} for code: ${normalizedCode}`);
    return { 
      success: true, 
      data: [{
        id: booking.id,
        confirmationCode: booking.confirmationCode,
        status: booking.status,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guestFirstName: booking.guestFirstName,
        guestLastName: booking.guestLastName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        vehicleMake: booking.vehicleMake,
        vehicleModel: booking.vehicleModel,
        vehicleColor: booking.vehicleColor,
        vehiclePlate: booking.vehiclePlate,
        totalPrice: booking.totalPrice,
        taxes: booking.taxes,
        fees: booking.fees,
        qrCode: booking.qrCode,
        location: booking.location,
        createdAt: booking.createdAt,
      }]
    };
  } catch (error) {
    console.error(`[Find Booking Action Error] Failed to find booking by confirmation code ${code}:`, error);
    return { success: false, error: "Failed to search for booking" };
  }
}

/**
 * Resend booking confirmation email
 */
export async function resendBookingConfirmation(bookingId: string, newEmail: string) {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return { success: false, error: "Invalid email address" };
    }

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // Update email if different
    if (booking.guestEmail !== newEmail) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { guestEmail: newEmail },
      });
    }

    // Send confirmation email (reuse existing email function)
    const { sendReservationReceipt } = await import("@/lib/notifications");
    const result = await sendReservationReceipt(bookingId, newEmail);

    if (result.success) {
      console.log(`[Find Booking Action] ✅ Confirmation email resent to ${newEmail} for booking ${bookingId}`);
      return { 
        success: true, 
        message: `Confirmation email sent to ${newEmail}` 
      };
    } else {
      console.error(`[Find Booking Action Error] Failed to resend email to ${newEmail} for ${bookingId}:`, result.error);
      return { 
        success: false, 
        error: result.error || "Failed to send confirmation email" 
      };
    }
  } catch (error) {
    console.error(`[Find Booking Action Error] Failed to resend booking confirmation for ${bookingId}:`, error);
    return { success: false, error: "Failed to resend confirmation email" };
  }
}

"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
// NOTE: Ensure prisma client is properly instantiated in lib/prisma.ts or similar
import { PrismaClient } from "@prisma/client"

// Instantiate PrismaClient here if a global instance isn't available
const prisma = new PrismaClient()

/**
 * Creates a booking and optionally initiates a payment record.
 * @param formData - Form data from the booking submission
 */
export async function createBooking(formData: FormData) {
  const userId = formData.get("userId") as string
  const locationId = formData.get("locationId") as string
  const checkIn = new Date(formData.get("checkIn") as string)
  const checkOut = new Date(formData.get("checkOut") as string)
  
  // Example price calculation
  const totalPrice = parseFloat(formData.get("totalPrice") as string)

  try {
    // Transaction: Create Booking AND Payment record ensures data integrity
    const booking = await prisma.booking.create({
      data: {
        userId,
        locationId,
        checkIn,
        checkOut,
        totalPrice,
        taxes: 0, // Simplified
        fees: 0,  // Simplified
        guestFirstName: formData.get("guestFirstName") as string,
        guestLastName: formData.get("guestLastName") as string,
        guestEmail: formData.get("guestEmail") as string,
        guestPhone: formData.get("guestPhone") as string,
        vehicleMake: formData.get("vehicleMake") as string,
        vehicleModel: formData.get("vehicleModel") as string,
        vehicleColor: formData.get("vehicleColor") as string,
        vehiclePlate: formData.get("vehiclePlate") as string,
        confirmationCode: `RES-${Date.now()}`, // Simple ID generation
        status: "PENDING",
        // Nested write: Initialize payment formatted as 'pending'
        payment: {
          create: {
            amount: totalPrice,
            provider: "stripe", // Example default
            transactionId: `pend_${Date.now()}`,
            status: "pending",
            currency: "USD"
          }
        }
      },
      include: {
        payment: true, // Return payment info to confirm creation
      },
    })

    console.log("Booking created:", booking.id)
    
    // In a real app, you might redirect to a payment page or confirmation
    // redirect(\`/booking/\${booking.id}/payment\`)
    return { success: true, bookingId: booking.id }

  } catch (error) {
    console.error("Failed to create booking:", error)
    return { success: false, error: "Booking creation failed" }
  }
}

/**
 * Cancels a booking and creates a refund request if applicable.
 */
export async function cancelBooking(bookingId: string, reason: string) {
  try {
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        // Create a related RefundRequest record automatically
        refunds: {
          create: {
            amount: 0, // Logic to determine refundable amount would go here
            reason: reason,
            status: "PENDING",
            description: "User requested cancellation"
          }
        }
      }
    })

    revalidatePath(\`/bookings/\${bookingId}\`)
    return { success: true }
  } catch (error) {
    return { success: false, error: "Cancellation failed" }
  }
}

/**
 * Retrieves booking details with all related entities deeply nested.
 */
export async function getBookingDetails(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      location: {
        select: {
          name: true,
          address: true,
          city: true,
          images: true
        }
      },
      payment: true,
      parkingSession: true, // See if they have active parking
      refunds: true
    }
  })

  return booking
}

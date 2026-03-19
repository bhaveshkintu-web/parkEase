import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event;

  try {
    const stripe = getStripe();
    if (!stripe) throw new Error("Stripe not configured");

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("[Webhook Error] STRIPE_WEBHOOK_SECRET is not set in environment variables.");
      return new NextResponse("Webhook Secret Missing", { status: 400 });
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`[Webhook Error] ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as any;

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
        const paymentIntent = event.data.object as any;
        console.log(`[Webhook] ✅ PaymentIntent succeeded: ${paymentIntent.id}`);
        
        try {
          // 1. Update the Payment record first
          const paymentUpdate = await prisma.payment.updateMany({
            where: { transactionId: paymentIntent.id },
            data: { status: "SUCCESS" }
          });
          console.log(`[Webhook] Updated ${paymentUpdate.count} payment record(s) to SUCCESS`);
  
          // 2. Update the Booking status
          const booking = await prisma.booking.updateMany({
            where: { 
              OR: [
                { payments: { some: { transactionId: paymentIntent.id } } },
                { id: paymentIntent.metadata?.bookingId }
              ]
            },
            data: {
              status: BookingStatus.CONFIRMED
            }
          });
  
          if (booking.count > 0) {
            console.log(`[Webhook] Success: Updated ${booking.count} booking(s) to CONFIRMED`);

            // 3. Handle Wallet Reconciliation
            // If the booking is already COMPLETED (checked out), we should 
            // trigger the credit release for this late payment.
            const checkoutCheck = await prisma.booking.findFirst({
               where: { 
                 payments: { some: { transactionId: paymentIntent.id } },
                 status: "COMPLETED"
               }
            });

            if (checkoutCheck) {
               console.log(`[Webhook] 💰 Late payment for COMPLETED booking ${checkoutCheck.id}. Re-running creditEarnings...`);
               const { FinanceService } = await import("@/lib/finance-service");
               await FinanceService.creditEarnings(checkoutCheck.id);
            }

            // 4. Save Payment Method for future use if it was a setup charge
            // This ensures "Primary Card" is stored correctly in our DB
            if (paymentIntent.customer && paymentIntent.payment_method && paymentIntent.setup_future_usage) {
               try {
                 const { getPaymentMethod } = await import("@/lib/stripe");
                 const pmDetails = await getPaymentMethod(paymentIntent.payment_method);
                 
                 if (pmDetails.success) {
                    const user = await prisma.user.findFirst({
                      where: { stripeCustomerId: paymentIntent.customer }
                    });

                    if (user) {
                      // Check if PM already exists
                      const existingPM = await prisma.paymentMethod.findFirst({
                        where: { 
                          userId: user.id,
                          stripeMethodId: paymentIntent.payment_method
                        }
                      });

                      if (!existingPM) {
                        // Check if user has any existing cards to decide if this should be default
                        const pmCount = await prisma.paymentMethod.count({
                          where: { userId: user.id }
                        });

                        await (prisma.paymentMethod as any).create({
                          data: {
                            userId: user.id,
                            stripeMethodId: paymentIntent.payment_method,
                            brand: pmDetails.brand,
                            last4: pmDetails.last4,
                            expiryMonth: pmDetails.expMonth,
                            expiryYear: pmDetails.expYear,
                            isDefault: pmCount === 0,
                            cardholderName: "Saved Card"
                          }
                        });
                        console.log(`[Webhook] ✅ Automatically saved card ${pmDetails.last4} for user ${user.id}`);
                      }
                    }
                 }
               } catch (pmError) {
                 console.error("[Webhook PM Sync Error]", pmError);
               }
            }
          } else {
            console.warn(`[Webhook Warning] No booking found for PaymentIntent ${paymentIntent.id}`);
          }
        } catch (dbError) {
          console.error(`[Webhook DB Error] Failed to update records:`, dbError);
        }
        break;

    case "payment_intent.payment_failed":
      const failedIntent = event.data.object as any;
      console.log(`[Webhook] ❌ PaymentIntent failed: ${failedIntent.id}`);
      // Mark booking as FAILED or keep PENDING? 
      // Usually keep PENDING to allow retry, but log it.
      break;

    default:
      console.log(`[Webhook] Unhandled event type ${event.type}`);
  }

  return new NextResponse(null, { status: 200 });
}

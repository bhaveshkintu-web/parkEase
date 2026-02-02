import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate ownership
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!paymentMethod || paymentMethod.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if used in active bookings
    const activeBookingCount = await prisma.booking.count({
      where: {
        payment: {
          // @ts-ignore - Prisma client out of sync
          paymentMethodId: id,
        },
        status: {
          in: ["PENDING", "CONFIRMED"], // or whatever signifies "active"
        },
      },
    });

    if (activeBookingCount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete card which is used in an active booking" 
      }, { status: 400 });
    }

    const wasDefault = paymentMethod.isDefault;

    // Delete the card
    await prisma.paymentMethod.delete({
      where: { id },
    });

    // If default card deleted → set latest card as default
    if (wasDefault) {
      const latestCard = await prisma.paymentMethod.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });

      if (latestCard) {
        await prisma.paymentMethod.update({
          where: { id: latestCard.id },
          data: { isDefault: true },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PAYMENT_METHOD_DELETE]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

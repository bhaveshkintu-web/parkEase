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
        payments: {
          some: {
            paymentMethodId: id,
          }
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
    const userId = session.user.id;

    // Soft-delete the card
    await prisma.paymentMethod.update({
      where: { id },
      data: { 
        // @ts-ignore - Prisma client type sync issue
        isActive: false,
        isDefault: false, // Ensure it's no longer default
      },
    });

    // If default card soft-deleted → set latest ACTIVE card as default
    if (wasDefault) {
      const latestCard = await prisma.paymentMethod.findFirst({
        // @ts-ignore - Prisma client type sync issue
        where: { userId, isActive: true },
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

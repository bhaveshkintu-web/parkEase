import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role?.toUpperCase() !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");

    const userId = session.user.id;
    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: { wallet: true }
    });

    if (!ownerProfile) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Filter condition
    const where: any = {
      location: {
        ownerId: ownerProfile.id,
        ...(locationId && locationId !== "all" ? { id: locationId } : {})
      },
      status: status && status !== "all" ? status : { in: ["CONFIRMED", "COMPLETED"] },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        location: true,
        payments: true
      },
      orderBy: { createdAt: "desc" }
    });

    // We need to match each booking with its commission transaction
    // Or calculate it on the fly if transactions aren't found (though they should be there for COMPLETED)
    const walletId = ownerProfile.wallet?.id;
    const commissionTxs = walletId ? await prisma.walletTransaction.findMany({
      where: {
        walletId,
        type: "COMMISSION",
        status: "COMPLETED",
        reference: { in: bookings.map(b => b.id) }
      }
    }) : [];

    const data = bookings.map(booking => {
      const commissionTx = commissionTxs.find(tx => tx.reference === booking.id);
      const commission = Math.abs(commissionTx?.amount || 0);

      return {
        id: booking.id,
        location: (booking as any).location?.name || "Unknown",
        guestName: `${(booking as any).guestFirstName} ${(booking as any).guestLastName}`,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
        // Aggregate gross from all payments
        gross: (booking as any).payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || booking.totalPrice,
        taxes: booking.taxes,
        fees: booking.fees,
        commission: commission,
        net: (booking as any).totalPrice - commission,
        status: booking.status,
        // SUCCESS if any payment is successful
        paymentStatus: (booking as any).payments?.some((p: any) => p.status === "SUCCESS") ? "SUCCESS" : "PENDING"
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[OWNER_EARNINGS_BREAKDOWN_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

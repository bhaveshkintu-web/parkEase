import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { code, amount } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
    }

    const promotion = await prisma.promotion.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promotion || !promotion.isActive) {
      return NextResponse.json({ error: "Invalid or inactive promo code" }, { status: 404 });
    }

    const now = new Date();
    if (promotion.validFrom > now || promotion.validUntil < now) {
      return NextResponse.json({ error: "Promo code has expired or is not yet active" }, { status: 400 });
    }

    if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
      return NextResponse.json({ error: "Promo code usage limit reached" }, { status: 400 });
    }

    if (promotion.minBookingValue && amount && amount < promotion.minBookingValue) {
      return NextResponse.json({
        error: `Minimum booking value of $${promotion.minBookingValue} required for this code`,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      promotion: {
        id: promotion.id,
        code: promotion.code,
        type: promotion.type,
        value: promotion.value,
        maxDiscount: promotion.maxDiscount,
      }
    });
  } catch (error) {
    console.error("[PROMOTION_VALIDATE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

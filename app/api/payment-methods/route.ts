import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(paymentMethods);
  } catch (error: any) {
    console.error("[PAYMENT_METHODS_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { cardToken, brand, last4, expiryMonth, expiryYear, cardholderName, setAsDefault } = body;

    // Basic validation
    if (!brand || !last4 || !expiryMonth || !expiryYear) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Duplicate check
    const existing = await prisma.paymentMethod.findFirst({
      where: {
        userId: session.user.id,
        last4,
        expiryMonth,
        expiryYear,
        brand,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Card already exists" }, { status: 400 });
    }

    // Check if user has any existing cards
    const userCardsCount = await prisma.paymentMethod.count({
      where: { userId: session.user.id },
    });

    const shouldBeDefault = userCardsCount === 0 || setAsDefault === true;

    // If setting as default, update other cards
    if (shouldBeDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const newPaymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: session.user.id,
        brand,
        last4,
        expiryMonth,
        expiryYear,
        cardholderName,
        isDefault: shouldBeDefault,
      },
    });

    return NextResponse.json(newPaymentMethod);
  } catch (error: any) {
    console.error("[PAYMENT_METHODS_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

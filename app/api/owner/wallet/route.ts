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

    const userId = session.user.id;

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId },
      include: {
        wallet: {
          include: {
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        },
      },
    });

    if (!ownerProfile || !ownerProfile.wallet) {
      // Create wallet if it doesn't exist (defensive)
      if (ownerProfile) {
        const newWallet = await prisma.wallet.create({
          data: {
            ownerId: ownerProfile.id,
            balance: 0,
            currency: "USD",
          },
          include: { transactions: true }
        });
        return NextResponse.json(newWallet);
      }
      return NextResponse.json({ error: "Owner profile not found" }, { status: 404 });
    }

    return NextResponse.json(ownerProfile.wallet);
  } catch (error) {
    console.error("[OWNER_WALLET_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

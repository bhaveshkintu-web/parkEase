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

    const wallet = await prisma.wallet.findFirst({
      where: { owner: { userId } },
      include: {
        owner: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!wallet) {
      // Check if owner exists but no wallet
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId }
      });

      if (ownerProfile) {
        const newWallet = await prisma.wallet.create({
          data: {
            ownerId: ownerProfile.id,
            balance: 0,
            currency: "USD",
          },
          include: { 
            owner: true,
            transactions: true 
          }
        });
        return NextResponse.json(newWallet);
      }
      return NextResponse.json({ error: "Owner profile not found" }, { status: 404 });
    }

    return NextResponse.json(wallet);
  } catch (error) {
    console.error("[OWNER_WALLET_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { ownerProfileSchema } from "@/lib/validations";

/**
 * @api {get} /api/owner/profile Get owner profile
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.ownerProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        documents: true,
        wallet: true,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[OWNER_PROFILE_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * @api {post} /api/owner/profile Create or update owner profile
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = ownerProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    const profile = await prisma.ownerProfile.upsert({
      where: { userId: session.user.id },
      update: {
        businessName: data.businessName,
        businessType: data.businessType,
        taxId: data.taxId,
        registrationNumber: data.registrationNumber,
        street: data.street,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
      },
      create: {
        userId: session.user.id,
        businessName: data.businessName,
        businessType: data.businessType,
        taxId: data.taxId,
        registrationNumber: data.registrationNumber,
        street: data.street,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        status: "pending",
        verificationStatus: "unverified",
      },
    });

    // Also ensure a wallet exists for the owner
    await prisma.wallet.upsert({
      where: { ownerId: profile.id },
      update: {},
      create: {
        ownerId: profile.id,
        balance: 0,
        currency: "USD",
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[OWNER_PROFILE_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

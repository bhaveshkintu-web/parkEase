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
      console.error("[OWNER_PROFILE_VALIDATION_ERROR]", result.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    // Get existing profile to preserve data
    const existingProfile = await prisma.ownerProfile.findUnique({
      where: { userId: session.user.id }
    });

    const profile = await prisma.ownerProfile.upsert({
      where: { userId: session.user.id },
      update: {
        businessName: data.businessName || existingProfile?.businessName || "New Owner",
        businessType: data.businessType || existingProfile?.businessType || "individual",
        taxId: data.taxId !== undefined ? data.taxId : existingProfile?.taxId,
        registrationNumber: data.registrationNumber !== undefined ? data.registrationNumber : existingProfile?.registrationNumber,
        street: data.street || existingProfile?.street || "Pending Address",
        city: data.city || existingProfile?.city || "Pending City",
        state: data.state || existingProfile?.state || "Pending State",
        zipCode: data.zipCode || existingProfile?.zipCode || "00000",
        country: data.country || existingProfile?.country || "USA",
        bankName: data.bankName !== undefined ? data.bankName : existingProfile?.bankName,
        bankAccountName: data.bankAccountName !== undefined ? data.bankAccountName : existingProfile?.bankAccountName,
        accountNumber: data.accountNumber !== undefined ? data.accountNumber : existingProfile?.accountNumber,
        routingNumber: data.routingNumber !== undefined ? data.routingNumber : existingProfile?.routingNumber,
      },
      create: {
        userId: session.user.id,
        businessName: data.businessName || "New Owner",
        businessType: data.businessType || "individual",
        taxId: data.taxId,
        registrationNumber: data.registrationNumber,
        street: data.street || "Pending Address",
        city: data.city || "Pending City",
        state: data.state || "Pending State",
        zipCode: data.zipCode || "00000",
        country: data.country || "USA",
        bankName: data.bankName,
        bankAccountName: data.bankAccountName,
        accountNumber: data.accountNumber,
        routingNumber: data.routingNumber,
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

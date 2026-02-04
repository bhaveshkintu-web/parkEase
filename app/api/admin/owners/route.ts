import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * @api {get} /api/admin/owners Get all owner profiles
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // pending, approved, rejected, suspended

    const where = status ? { status } : {};

    const owners = await prisma.ownerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        documents: true,
        locations: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ owners });
  } catch (error) {
    console.error("[ADMIN_OWNERS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * @api {post} /api/admin/owners Create a new owner
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const data = await req.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      businessName,
      businessType,
      taxId,
      registrationNumber,
      street,
      city,
      state,
      zipCode,
      country,
      bankAccountName,
      bankName,
      accountNumber,
      routingNumber,
    } = data;

    // Validate required fields
    if (!firstName || !lastName || !email || !businessName || !street || !city || !state || !zipCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    // Create owner user and profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User
      // Generate a temporary password that they should change
      const tempPassword = Math.random().toString(36).slice(-8);
      // Note: We should ideally hash this. Using bcryptjs as it is in package.json
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          phone,
          role: "OWNER",
          password: hashedPassword,
          status: "ACTIVE",
          emailVerified: true,
        },
      });

      // 2. Create Owner Profile
      const ownerProfile = await tx.ownerProfile.create({
        data: {
          userId: user.id,
          businessName,
          businessType,
          taxId,
          registrationNumber,
          street,
          city,
          state,
          zipCode,
          country,
          bankAccountName,
          bankName,
          accountNumber,
          routingNumber,
          status: "pending",
          verificationStatus: "unverified",
        },
      });

      // 3. Create Wallet
      await tx.wallet.create({
        data: {
          ownerId: ownerProfile.id,
          balance: 0,
          currency: "USD",
        },
      });

      return { user, ownerProfile };
    });

    return NextResponse.json({ 
      message: "Owner created successfully", 
      owner: result.ownerProfile 
    });
  } catch (error) {
    console.error("[ADMIN_OWNERS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

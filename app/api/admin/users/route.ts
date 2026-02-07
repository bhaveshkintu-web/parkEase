import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { generateToken } from "@/lib/token";
import { generateToken } from "@/lib/token";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/mailer";

// Schema for user creation
const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "OWNER", "WATCHMAN", "ADMIN", "SUPPORT"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  password: z.string().optional(),
  sendInvite: z.boolean().default(false),
});

/**
 * @api {get} /api/admin/users Get all users
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user: currentUser } = session;
    const role = currentUser.role?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (roleFilter && roleFilter !== "all") {
      where.role = roleFilter.toUpperCase() as any;
    }
    if (status && status !== "all") {
      where.status = status.toUpperCase() as any;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        take: limit,
        skip,
        include: {
          ownerProfile: {
            select: {
              id: true,
              businessName: true,
              status: true,
            },
          },
          _count: {
            select: {
              bookings: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Calculate metadata counts for the top bar
    const [totalUsers, activeUsers, ownersCount, suspendedUsers] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "OWNER" } }),
      prisma.user.count({ where: { status: "SUSPENDED" } }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        totalUsers,
        activeUsers,
        ownersCount,
        suspendedUsers,
      },
    });
  } catch (error) {
    console.error("[ADMIN_USERS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * @api {post} /api/admin/users Create a new user
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = createUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.formErrors },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, phone, role, status, sendInvite } = result.data;

    // Check existing email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Handle password
    // Generate a random password if not provided or if sending invite
    const effectivePassword = password || Math.random().toString(36).slice(-8); 
    const hashedPassword = await bcrypt.hash(effectivePassword, 10);

    const emailVerified = !sendInvite; 

    let verifyToken = null;
    let verifyTokenExpiry = null;
    let rawVerifyToken = null;

    if (sendInvite) {
       const tokenData = generateToken();
       verifyToken = tokenData.hashedToken;
       verifyTokenExpiry = tokenData.expiry; // Need to ensure schema supports this or use it if available
       rawVerifyToken = tokenData.rawToken;
    }

    // Create user transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          phone,
          role: role as any,
          status: status as any,
          password: hashedPassword,
          emailVerified,
          verifyToken,
          tokenExpiry: verifyTokenExpiry,
        },
      });

      // Special Logic for OWNER
      if (role === "OWNER") {
        await tx.ownerProfile.create({
          data: {
            userId: user.id,
            businessName: `${firstName}'s Business`, 
            businessType: "Individual",
            street: "Pending",
            city: "Pending",
            state: "Pending",
            zipCode: "00000",
            country: "USA",
            status: "pending",
          },
        });
      }

      return user;
    });

    if (sendInvite && rawVerifyToken) {
      try {
        await sendVerificationEmail(email, rawVerifyToken);
      } catch (emailError) {
        console.error("Failed to send invite email:", emailError);
      }
    } else {
      // If NOT sending invite, we assume manual creation + auto-verify
      // Send welcome email with credentials
      try {
        await sendWelcomeEmail(
          email,
          `${firstName} ${lastName}`,
          effectivePassword,
          role
        );
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_USERS_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

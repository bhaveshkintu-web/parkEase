import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "OWNER", "WATCHMAN", "ADMIN", "SUPPORT"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        ownerProfile: true,
        watchmanProfile: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
            disputes: true,
            paymentMethods: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[ADMIN_USER_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.formErrors },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, phone, role, status } = result.data;

    // Verify user exists and check email uniqueness if changed
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existingUser.email !== email) {
      const emailCheck = await prisma.user.findUnique({
        where: { email },
      });
      if (emailCheck) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }
    }

    // Role Change Logic
    const oldRole = existingUser.role;
    const isRoleChanged = oldRole !== role;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          firstName,
          lastName,
          email,
          phone,
          role: role as any,
          status: status as any,
        },
      });

      if (isRoleChanged) {
        // If changed TO Owner, ensure OwnerProfile
        if (role === "OWNER") {
          const ownerProfile = await tx.ownerProfile.findUnique({
            where: { userId: id },
          });
          if (!ownerProfile) {
            await tx.ownerProfile.create({
              data: {
                userId: id,
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
        }
        // If changed FROM Owner, strictly speaking we might want to deactivate the profile, 
        // but requirements say "keep OwnerProfile but mark inactive"
        if (oldRole === "OWNER" && role !== "OWNER") {
             const ownerProfile = await tx.ownerProfile.findUnique({
            where: { userId: id },
          });
          if (ownerProfile) {
             // Assuming status field on OwnerProfile is string based on schema review
             // "pending", "approved", "rejected", etc. 
             // Schema: status String @default("pending")
             // We can mark it as something else or just leave it. 
             // Requirement: "mark inactive". Let's assume a generic status or just leave it alone since "inactive" isn't explicitly an enum option for that string field in schema but likely a valid string value.
             // Actually looking at schema, OwnerProfile status is just String. So "inactive" is fine.
             await tx.ownerProfile.update({
                 where: { userId: id },
                 data: { status: "inactive" }
             });
          }
        }
      }

      return user;
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("[ADMIN_USER_PUT]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        userId: id,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
    });

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: "Cannot delete user with active bookings" },
        { status: 400 }
      );
    }
    
    // Check if self delete
    if (session.user.id === id) {
         return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    // Soft delete: UserStatus.INACTIVE
    const deletedUser = await prisma.user.update({
      where: { id },
      data: {
        status: "INACTIVE",
        // isDeleted: true // Schema doesn't have isDeleted, so relying on status
      },
    });

    return NextResponse.json({ success: true, user: deletedUser });
  } catch (error) {
    console.error("[ADMIN_USER_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

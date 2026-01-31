import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await (prisma as any).ownerLead.findMany({
      orderBy: { createdAt: "desc" },
    });

    const pendingOwners = await prisma.ownerProfile.findMany({
      where: { status: "pending" },
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
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform pending owners to match lead shape if needed, 
    // or keep them separate. The frontend currently expects 'leads' array.
    const normalizedOwners = pendingOwners.map((owner) => ({
      id: owner.id,
      fullName: `${owner.user.firstName} ${owner.user.lastName}`,
      email: owner.user.email,
      phone: owner.user.phone || "N/A",
      businessName: owner.businessName,
      businessType: owner.businessType,
      city: owner.city,
      state: owner.state,
      country: owner.country,
      status: owner.status,
      createdAt: owner.createdAt,
      isAdminCreated: true, // Flag to distinguish from leads
    }));

    return NextResponse.json({
      leads: [...leads, ...normalizedOwners]
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadId, action, notes } = await req.json();

    if (!leadId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let lead = await (prisma as any).ownerLead.findUnique({
      where: { id: leadId },
    });

    let ownerProfile = null;
    if (!lead) {
      ownerProfile = await prisma.ownerProfile.findUnique({
        where: { id: leadId },
        include: { user: true }
      });
    }

    if (!lead && !ownerProfile) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (action === "reject") {
      if (lead) {
        await (prisma as any).ownerLead.update({
          where: { id: leadId },
          data: { status: "rejected", adminNotes: notes },
        });
      } else {
        await prisma.ownerProfile.update({
          where: { id: leadId },
          data: { status: "rejected" },
        });
      }
      return NextResponse.json({ message: "Rejected successfully" });
    }

    if (action === "approve") {
      if (ownerProfile) {
        // Just update existing profile
        await prisma.ownerProfile.update({
          where: { id: leadId },
          data: { status: "approved", verificationStatus: "verified" },
        });
        return NextResponse.json({ message: "Owner profile approved successfully" });
      }

      // 1. Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: lead!.email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 }
        );
      }

      // 2. Create User and OwnerProfile in a transaction
      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const [firstName, ...lastNameParts] = lead!.fullName.split(" ");
      const lastName = lastNameParts.join(" ") || ".";

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: lead!.email,
            firstName,
            lastName,
            phone: lead!.phone,
            password: hashedPassword,
            role: "OWNER",
            status: "ACTIVE",
          },
        });

        await tx.ownerProfile.create({
          data: {
            userId: user.id,
            businessName: lead!.businessName,
            businessType: lead!.businessType,
            city: lead!.city,
            state: lead!.state,
            country: lead!.country,
            street: "N/A",
            zipCode: "N/A",
            status: "approved",
            verificationStatus: "verified",
          },
        });

        await (tx as any).ownerLead.update({
          where: { id: leadId },
          data: { status: "approved", adminNotes: notes },
        });
      });

      console.log(`Approved owner: ${lead!.email}. Temp password: ${tempPassword}`);

      return NextResponse.json({
        message: "Owner approved and account created successfully",
        tempPassword,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing approval:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

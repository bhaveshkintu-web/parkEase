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

    // Fetch leads
    const leads = await prisma.ownerLead.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Fetch pending owner profiles (registered users waiting for approval)
    const pendingProfiles = await prisma.ownerProfile.findMany({
      where: { status: "pending" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    // Map profiles to OwnerLead shape for unified UI
    const profileLeads = pendingProfiles.map(p => ({
      id: `profile:${p.id}`, // Prefix to distinguish
      fullName: `${p.user.firstName} ${p.user.lastName}`,
      email: p.user.email,
      phone: p.user.phone || "N/A",
      businessName: p.businessName,
      businessType: p.businessType,
      city: p.city,
      state: p.state,
      country: p.country,
      status: p.status, // "pending"
      createdAt: p.createdAt.toISOString(),
      isProfile: true, // Flag to identify origin
      profileId: p.id,
      userId: p.userId
    }));

    // Combine and sort by date
    const combined = [...profileLeads, ...leads].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ leads: combined });
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

    // Handle Profile Approval/Rejection
    if (String(leadId).startsWith("profile:")) {
      const profileId = leadId.split(":")[1];

      if (action === "reject") {
        // We might want to mark as rejected or suspended. 
        // For now, let's look at the schema. "rejected" might not be a valid status in db?
        // Checking schema... OwnerProfile status is string.
        await prisma.ownerProfile.update({
          where: { id: profileId },
          data: { status: "rejected" } // adminNotes not on profile?
        });
        return NextResponse.json({ message: "Owner application rejected" });
      }

      if (action === "approve") {
        await prisma.ownerProfile.update({
          where: { id: profileId },
          data: {
            status: "approved", // or 'active'? Schema default is 'pending'.
            verificationStatus: "verified"
          }
        });

        // Also ensure user role is OWNER if not already (should be)
        // Send email notification here if needed

        return NextResponse.json({ message: "Owner application approved successfully" });
      }
    }

    // Handle Lead Approval (Original Logic)
    const lead = await prisma.ownerLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (action === "reject") {
      await prisma.ownerLead.update({
        where: { id: leadId },
        data: {
          status: "rejected",
          adminNotes: notes,
        },
      });
      return NextResponse.json({ message: "Lead rejected successfully" });
    }

    if (action === "approve") {
      // 1. Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: lead.email },
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

      const [firstName, ...lastNameParts] = lead.fullName.split(" ");
      const lastName = lastNameParts.join(" ") || ".";

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: lead.email,
            firstName,
            lastName,
            phone: lead.phone,
            password: hashedPassword,
            role: "OWNER",
            status: "ACTIVE",
          },
        });

        await tx.ownerProfile.create({
          data: {
            userId: user.id,
            businessName: lead.businessName,
            businessType: lead.businessType,
            city: lead.city,
            state: lead.state,
            country: lead.country,
            street: "N/A", // Default to N/A as lead might not have full address
            zipCode: "N/A",
            status: "approved", // Auto-approve converted leads
            verificationStatus: "verified",
          },
        });

        await tx.ownerLead.update({
          where: { id: leadId },
          data: {
            status: "approved",
            adminNotes: notes,
          },
        });
      });

      // TODO: Send email with tempPassword or password reset link
      console.log(`Approved owner: ${lead.email}. Temp password: ${tempPassword}`);

      return NextResponse.json({
        message: "Owner approved and account created successfully",
        tempPassword, // In a real app, send via email only
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing approval:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

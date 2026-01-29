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

    const leads = await prisma.ownerLead.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leads });
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
            status: "active",
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

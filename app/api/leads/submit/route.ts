import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      businessName,
      businessType,
      city,
      state,
      country,
    } = body;

    // Basic validation
    if (!fullName || !email || !phone || !businessName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for existing lead with same email or phone
    const existingLead = await prisma.ownerLead.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    });

    if (existingLead) {
      const field = existingLead.email === email ? "Email" : "Phone number";
      return NextResponse.json(
        { error: `${field} is already registered with another request.` },
        { status: 409 } // Conflict
      );
    }

    // Create lead
    const lead = await prisma.ownerLead.create({
      data: {
        fullName,
        email,
        phone,
        businessName,
        businessType,
        city,
        state,
        country,
        status: "pending",
      },
    });

    return NextResponse.json(
      { message: "Lead submitted successfully", leadId: lead.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

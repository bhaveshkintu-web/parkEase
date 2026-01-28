// N
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateInquirySchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const inquiry = await prisma.businessInquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      return NextResponse.json(
        { message: "Inquiry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ inquiry });
  } catch (error) {
    console.error("Failed to fetch inquiry:", error);
    return NextResponse.json(
      { message: "Failed to fetch inquiry" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateInquirySchema.parse(body);

    const inquiry = await prisma.businessInquiry.update({
      where: { id },
      data: validatedData as any,
    });

    return NextResponse.json({ inquiry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid data", errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error("Failed to update inquiry:", error);
    return NextResponse.json(
      { message: "Failed to update inquiry" },
      { status: 500 }
    );
  }
}

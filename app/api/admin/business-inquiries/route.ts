// N
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const businessType = searchParams.get("businessType");
    const query = searchParams.get("q");

    const where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (businessType && businessType !== "all") {
      where.businessType = businessType;
    }

    if (query) {
      where.OR = [
        { fullName: { contains: query, mode: "insensitive" } },
        { companyName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ];
    }

    const inquiries = await prisma.businessInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ inquiries });
  } catch (error) {
    console.error("Failed to fetch inquiries:", error);
    return NextResponse.json(
      { message: "Failed to fetch inquiries" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const page = await prisma.cMSPage.findUnique({
      where: {
        slug,
        status: "PUBLISHED" // Only return published pages
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Error fetching CMS page:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

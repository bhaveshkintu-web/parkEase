import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "all") {
      where.status = status.toUpperCase();
    }

    const pages = await prisma.cMSPage.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ pages });
  } catch (error) {
    console.error("Error fetching CMS pages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { slug, title, content, metaTitle, metaDescription, status } = body;

    if (!slug || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.cMSPage.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A page with this slug already exists" },
        { status: 400 }
      );
    }

    const page = await prisma.cMSPage.create({
      data: {
        slug,
        title,
        content,
        metaTitle,
        metaDescription,
        status: status || "DRAFT",
        createdBy: session.user.id,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error("Error creating CMS page:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

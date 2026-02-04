import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { TicketStatus } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPPORT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as TicketStatus | null;
  const email = searchParams.get("email");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search");

  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) where.status = status;
  if (email) {
    where.email = {
      contains: email,
      mode: "insensitive",
    };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { message: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [tickets, total, statusCounts] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      })
    ]);

    const counts = statusCounts.reduce((acc: any, curr: any) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 });

    return NextResponse.json({
      tickets,
      stats: {
        total,
        open: counts.OPEN,
        inProgress: counts.IN_PROGRESS,
        resolved: counts.RESOLVED,
      },
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching support tickets:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

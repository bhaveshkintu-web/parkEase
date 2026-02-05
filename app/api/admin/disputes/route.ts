import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { DisputeStatus, DisputePriority } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPPORT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as DisputeStatus | null;
  const priority = searchParams.get("priority") as DisputePriority | null;
  const email = searchParams.get("email");
  const bookingId = searchParams.get("bookingId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search");

  const skip = (page - 1) * limit;

  const where: any = {
    isDeleted: false,
  };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (bookingId) where.bookingId = bookingId;
  if (email) {
    where.user = {
      email: {
        contains: email,
        mode: "insensitive",
      },
    };
  }
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { bookingId: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  try {
    const [disputes, total, statusCounts] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          booking: {
            select: {
              confirmationCode: true,
              totalPrice: true,
            },
          },
          assignedAdmin: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.dispute.count({ where }),
      prisma.dispute.groupBy({
        by: ['status'],
        where: { isDeleted: false },
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
      disputes,
      stats: {
        total: Object.values(counts).reduce((a: any, b: any) => a + b, 0) as number,
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
    console.error("Error fetching disputes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

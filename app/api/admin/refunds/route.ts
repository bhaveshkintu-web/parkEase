import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPPORT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status && status !== "all") {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { booking: { confirmationCode: { contains: search, mode: "insensitive" } } },
      { booking: { user: { email: { contains: search, mode: "insensitive" } } } },
      { booking: { user: { firstName: { contains: search, mode: "insensitive" } } } },
      { booking: { user: { lastName: { contains: search, mode: "insensitive" } } } },
      { reason: { contains: search, mode: "insensitive" } },
    ];
  }

    try {
      const [refunds, total, statusCounts, pendingSum, pendingOwners, pendingLocations] = await Promise.all([
        prisma.refundRequest.findMany({
          where,
          include: {
            booking: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  }
                }
              }
            },
            dispute: {
              select: {
                id: true,
                subject: true,
              }
            }
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.refundRequest.count({ where }),
        prisma.refundRequest.groupBy({
          by: ['status'],
          _count: {
            id: true
          }
        }),
        prisma.refundRequest.aggregate({
          where: { status: 'PENDING' },
          _sum: {
            amount: true
          }
        }),
        prisma.ownerProfile.count({ where: { status: 'pending' } }),
        prisma.parkingLocation.count({ where: { status: 'PENDING' } })
      ]);

      const counts = statusCounts.reduce((acc: any, curr: any) => {
        acc[curr.status] = curr._count.id;
        return acc;
      }, { PENDING: 0, APPROVED: 0, PROCESSED: 0, REJECTED: 0 });

      return NextResponse.json({
        refunds,
        stats: {
          total,
          pending: counts.PENDING,
          approved: counts.APPROVED,
          processed: counts.PROCESSED,
          rejected: counts.REJECTED,
          totalPendingAmount: pendingSum._sum.amount || 0,
          totalPendingApprovals: counts.PENDING + pendingOwners + pendingLocations
        },
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

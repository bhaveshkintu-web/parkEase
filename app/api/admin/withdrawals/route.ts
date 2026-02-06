import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
export const dynamic = 'force-dynamic';

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
      { accountName: { contains: search, mode: "insensitive" } },
      { bankName: { contains: search, mode: "insensitive" } },
      { wallet: { owner: { businessName: { contains: search, mode: "insensitive" } } } },
      { wallet: { owner: { user: { email: { contains: search, mode: "insensitive" } } } } },
    ];
  }

  try {
    const [withdrawals, total, statusCounts] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        include: {
          wallet: {
            include: {
              owner: {
                select: {
                  businessName: true,
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.withdrawalRequest.count({ where }),
      prisma.withdrawalRequest.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      })
    ]);

    const counts = statusCounts.reduce((acc: any, curr: any) => {
      acc[curr.status] = curr._count.id;
      return acc;
    }, { PENDING: 0, APPROVED: 0, PROCESSED: 0, REJECTED: 0, FAILED: 0 });

    const totalPendingAmountData = await prisma.withdrawalRequest.aggregate({
      where: { status: 'PENDING' },
      _sum: {
        amount: true
      }
    });

    return NextResponse.json({
      withdrawals,
      stats: {
        total,
        pending: counts.PENDING,
        approved: counts.APPROVED,
        processed: counts.PROCESSED,
        rejected: counts.REJECTED,
        failed: counts.FAILED,
        totalPendingAmount: totalPendingAmountData._sum.amount || 0,
      },
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching admin withdrawals:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

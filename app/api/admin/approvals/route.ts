import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * @api {get} /api/admin/approvals Get pending parking location approvals
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // PENDING, ACTIVE, etc.

    const where: any = {};
    if (status) {
      where.status = status.toUpperCase();
    }

    const locations = await prisma.parkingLocation.findMany({
      where,
      include: {
        owner: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        analytics: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("[ADMIN_APPROVALS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

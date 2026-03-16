import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const vehicles = await prisma.savedVehicle.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    console.log(`[User Vehicles API] ✅ Fetched ${vehicles.length} vehicles for user: ${session.user.id}`);
    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("[User Vehicles API Error] Failed to fetch vehicles:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

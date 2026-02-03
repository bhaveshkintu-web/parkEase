import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role?.toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const params = await context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Owner ID is required" }, { status: 400 });
    }

    const owner = await prisma.ownerProfile.findUnique({
      where: { id },
      select: {
        userId: true,
        user: { select: { email: true, firstName: true } }
      }
    });

    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    // Simulate sending email
    console.log(`[EMAIL MOCK] Sending 'Request Documents' email to ${owner.user.email}`);

    // You could also log this action in a database table called 'Notifications' or similar if it existed

    return NextResponse.json({
      message: "Document request sent successfully",
      sentTo: owner.user.email
    });
  } catch (error) {
    console.error("[ADMIN_REQUEST_DOCS] Error:", error);
    return NextResponse.json({ 
      error: "Internal error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

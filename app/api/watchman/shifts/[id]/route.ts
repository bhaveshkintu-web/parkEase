import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        console.log("=== END SHIFT REQUEST ===");
        const session = await getServerSession(authOptions);
        console.log("Session user:", session?.user?.email, "Role:", session?.user?.role);

        if (!session || !session.user || session.user.role?.toUpperCase() !== "WATCHMAN") {
            console.error("Auth failed - Role check failed");
            return NextResponse.json({ error: "Unauthorized: Watchman role required" }, { status: 401 });
        }

        const body = await request.json();
        const { status } = body;

        // Await params in Next.js 15+
        const { id: shiftId } = await params;

        console.log("Ending shift:", shiftId, "New status:", status);

        if (!status) {
            console.error("No status provided");
            return NextResponse.json({ error: "Status required" }, { status: 400 });
        }

        const updateData: any = { status };
        if (status === "COMPLETED") {
            updateData.actualEnd = new Date();
            console.log("Setting actualEnd to:", updateData.actualEnd);
        }

        console.log("Updating shift in database...");
        const updatedShift = await prisma.watchmanShift.update({
            where: { id: shiftId },
            data: updateData
        });

        console.log("Shift updated successfully:", updatedShift.id);
        return NextResponse.json({ shift: updatedShift, success: true });

    } catch (error: any) {
        console.error("=== ERROR UPDATING SHIFT ===");
        console.error("Error type:", error.constructor.name);
        console.error("Error message:", error.message);
        console.error("Full error:", error);
        return NextResponse.json({
            error: "Failed to update shift",
            details: error.message,
            type: error.constructor.name
        }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    try {
        if (!session || !session.user || session.user.role?.toUpperCase() !== "WATCHMAN") {
            return NextResponse.json({ error: "Unauthorized: Watchman role required" }, { status: 401 });
        }

        const body = await request.json();
        const { status } = body;

        // Await params in Next.js 15+
        const { id: shiftId } = await params;

        if (!status) {
            return NextResponse.json({ error: "Status required" }, { status: 400 });
        }

        const updateData: any = { status };
        if (status === "COMPLETED") {
            updateData.actualEnd = new Date();
        }

        const updatedShift = await prisma.watchmanShift.update({
            where: { id: shiftId },
            data: updateData
        });

        console.log(`[Watchman Shift ID API] ✅ Shift ${shiftId} updated to ${status} for user: ${session.user.id}`);
        return NextResponse.json({ shift: updatedShift, success: true });

    } catch (error: any) {
        console.error(`[Watchman Shift ID API Error] PATCH failed for shift ${await params.then(p => p.id)}:`, error);
        return NextResponse.json({
            error: "Failed to update shift",
            details: error.message,
            type: error.constructor.name
        }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== "WATCHMAN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { status } = await request.json();
        const shiftId = params.id;

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

        return NextResponse.json({ shift: updatedShift });

    } catch (error: any) {
        console.error("Error updating shift:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

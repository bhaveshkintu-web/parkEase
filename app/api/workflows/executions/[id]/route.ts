
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const execution = await prisma.workflowExecution.findUnique({
            where: { id },
            include: {
                workflow: {
                    select: { name: true }
                }
            }
        });

        if (!execution) {
            return NextResponse.json({ error: "Execution not found" }, { status: 404 });
        }

        return NextResponse.json(execution);
    } catch (error: any) {
        return NextResponse.json(
            { error: "Failed to fetch execution", details: error.message },
            { status: 500 }
        );
    }
}

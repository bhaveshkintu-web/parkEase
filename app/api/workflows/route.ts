
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, description, definition } = body;

        // Basic validation
        if (!name || !definition) {
            return NextResponse.json(
                { error: "Name and definition are required" },
                { status: 400 }
            );
        }

        const workflow = await prisma.workflow.create({
            data: {
                name,
                description,
                definition: definition, // Expecting valid JSON
            },
        });

        return NextResponse.json(workflow, { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { error: "Failed to create workflow", details: error.message },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const workflows = await prisma.workflow.findMany({
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(workflows);
    } catch (error: any) {
        return NextResponse.json(
            { error: "Failed to fetch workflows" },
            { status: 500 }
        );
    }
}

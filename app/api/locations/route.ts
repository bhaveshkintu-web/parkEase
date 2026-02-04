import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const locations = await prisma.parkingLocation.findMany({
            where: {
                status: "ACTIVE",
            },
            select: {
                id: true,
                name: true,
                city: true,
                airportCode: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json(locations);
    } catch (error) {
        console.error("Locations API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

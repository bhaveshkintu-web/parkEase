import { prisma } from "../lib/prisma";
import fs from "fs";

async function main() {
    const todayBookings = await prisma.booking.findMany({
        where: {
            createdAt: {
                gte: new Date(Date.now() - 2 * 60 * 60 * 1000) // last 2 hours
            }
        },
        orderBy: { createdAt: 'desc' },
        include: { parkingSession: true }
    });

    fs.writeFileSync("diag_all.json", JSON.stringify(todayBookings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

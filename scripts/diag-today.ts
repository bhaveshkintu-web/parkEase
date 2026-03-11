import { prisma } from "../lib/prisma";
import fs from "fs";

async function main() {
    const userEmail = "vidhipatel5044@gmail.com";

    const todayBookings = await prisma.booking.findMany({
        where: {
            guestEmail: userEmail,
            createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
        },
        orderBy: { createdAt: 'desc' },
        include: { parkingSession: true }
    });

    fs.writeFileSync("diag_today.json", JSON.stringify(todayBookings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

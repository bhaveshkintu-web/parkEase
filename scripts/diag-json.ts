import { prisma } from "../lib/prisma";
import fs from "fs";

async function main() {
    const userEmail = "vidhipatel5044@gmail.com";
    const now = new Date();

    const latestBooking = await prisma.booking.findFirst({
        where: { guestEmail: userEmail },
        orderBy: { createdAt: 'desc' },
        include: { parkingSession: true }
    });

    const out = {
        now: now.toISOString(),
        latestBooking,
        warningWindowEnd: new Date(now.getTime() + 45 * 60 * 1000).toISOString()
    };

    fs.writeFileSync("diag.json", JSON.stringify(out, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

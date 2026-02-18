import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const ownerEmail = "vidhikumaripatel.it22@scet.ac.in";
    const watchmanEmail = "vidhipatel5044@gmail.com";

    const ownerUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
    const watchmanUser = await prisma.user.findUnique({ where: { email: watchmanEmail } });

    if (!ownerUser || !watchmanUser) {
        console.error("Users not found");
        return;
    }

    // 1. Set roles
    await prisma.user.update({ where: { id: ownerUser.id }, data: { role: "OWNER" } });
    await prisma.user.update({ where: { id: watchmanUser.id }, data: { role: "WATCHMAN" } });

    // 2. Ensure Owner Profile exists
    const ownerProfile = await prisma.ownerProfile.upsert({
        where: { userId: ownerUser.id },
        update: {},
        create: {
            userId: ownerUser.id,
            businessName: "ParkZipply Owner",
            businessType: "individual",
            street: "Main St", city: "New York", state: "NY", zipCode: "10001", country: "USA",
            status: "approved", verificationStatus: "verified"
        }
    });

    // 3. Link locations to owner
    const locations = await prisma.parkingLocation.findMany();
    for (const loc of locations) {
        await prisma.parkingLocation.update({
            where: { id: loc.id },
            data: { ownerId: ownerProfile.id }
        });
    }

    // 4. Create Watchman profile via RAW SQL to avoid Prisma Client validation issues
    const watchmanId = `wm_${Math.random().toString(36).substring(2, 11)}`;
    const existingWatchman = await prisma.$queryRawUnsafe(`SELECT id FROM "Watchman" WHERE "userId" = $1`, watchmanUser.id) as any[];

    let activeWatchmanId: string;
    if (existingWatchman.length > 0) {
        activeWatchmanId = existingWatchman[0].id;
        await prisma.$executeRawUnsafe(`UPDATE "Watchman" SET "ownerId" = $1 WHERE id = $2`, ownerProfile.id, activeWatchmanId);
        console.log(`Updated existing watchman ${activeWatchmanId}`);
    } else {
        activeWatchmanId = watchmanId;
        await prisma.$executeRawUnsafe(`
            INSERT INTO "Watchman" (id, "userId", "ownerId", status, "createdAt")
            VALUES ($1, $2, $3, 'ACTIVE', NOW())
        `, activeWatchmanId, watchmanUser.id, ownerProfile.id);
        console.log(`Created new watchman ${activeWatchmanId}`);
    }

    // 5. Assign watchman to locations via Raw SQL
    for (const loc of locations) {
        // Link in junction table for many-to-many
        try {
            // Prisma's default junction table name is usually "_ParkingLocationToWatchman" or similar
            // Let's check common junction table names or just use shifts
            console.log(`Setting up shift for location ${loc.id}...`);
            const shiftId = `shift_${Math.random().toString(36).substring(2, 11)}`;
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);

            await prisma.$executeRawUnsafe(`
                INSERT INTO "WatchmanShift" (id, "watchmanId", "locationId", "scheduledStart", "scheduledEnd", status)
                VALUES ($1, $2, $3, $4, $5, 'SCHEDULED')
            `, shiftId, activeWatchmanId, loc.id, now, tomorrow);

            // Try linkage
            await prisma.$executeRawUnsafe(`
                INSERT INTO "_ParkingLocationToWatchman" ("A", "B")
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
            `, loc.id, activeWatchmanId);
        } catch (e) {
            console.log(`Linkage/Shift failed for ${loc.id}: ${e instanceof Error ? e.message.substring(0, 100) : "Unknown error"}`);
        }
    }

    console.log("Environment Setup Complete:");
    console.log(`- Owner: ${ownerEmail}`);
    console.log(`- Watchman: ${watchmanEmail}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

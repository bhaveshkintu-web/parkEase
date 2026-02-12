
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = "vidhipatel5044@gmail.com";
    console.log(`Checking user with email: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            watchmanProfile: true
        }
    });

    if (!user) {
        console.log("User not found");
        return;
    }

    console.log("User found:", user.id, user.firstName, user.lastName, user.role);

    if (!user.watchmanProfile) {
        console.log("No watchman profile found for this user.");

        // Check if maybe there is a watchman record but not connected in the way include expects?
        // schema: watchmanProfile   Watchman?
        // Watchman model: userId String @unique, user User @relation(...)

        const watchmanDirect = await prisma.watchman.findUnique({
            where: { userId: user.id }
        });
        console.log("Direct watchman query by userId:", watchmanDirect);
    } else {
        console.log("Watchman profile:", user.watchmanProfile);

        // Test creating a shift (simulating API POST)
        const watchmanId = user.watchmanProfile.id;
        // Find a location first
        const location = await prisma.parkingLocation.findFirst({
            where: { ownerId: user.watchmanProfile.ownerId }
        });

        if (location) {
            console.log("Found location:", location.id);
            try {
                // Check active shift first
                const active = await prisma.watchmanShift.findFirst({
                    where: { watchmanId, status: "ACTIVE" }
                });

                if (active) {
                    console.log("Watchman already has active shift:", active.id);
                    // End it for testing?
                    // await prisma.watchmanShift.update({ where: { id: active.id }, data: { status: 'COMPLETED' } });
                } else {
                    console.log("Creating new test shift...");
                    const newShift = await prisma.watchmanShift.create({
                        data: {
                            watchmanId,
                            locationId: location.id,
                            scheduledStart: new Date(),
                            scheduledEnd: new Date(Date.now() + 8 * 60 * 60 * 1000),
                            actualStart: new Date(),
                            status: "ACTIVE"
                            // totalCheckIns should default to 0
                        }
                    });
                    console.log("Shift created successfully:", newShift);

                    // Create activity log
                    const newLog = await prisma.watchmanActivityLog.create({
                        data: {
                            watchmanId,
                            type: "shift_start",
                            details: { note: "Debug test start" },
                            timestamp: new Date()
                        }
                    });
                    console.log("Activity log created successfully:", newLog);
                }
            } catch (err) {
                console.error("Error creating shift or log:", err);
            }
        } else {
            console.log("No location found for watchman owner");
        }

        const shifts = await prisma.watchmanShift.findMany({
            where: { watchmanId: user.watchmanProfile.id },
            orderBy: { scheduledStart: 'desc' },
            take: 5
        });
        console.log(`Found ${shifts.length} shifts. Last 5:`, shifts);

        const logs = await prisma.watchmanActivityLog.findMany({
            where: { watchmanId: user.watchmanProfile.id },
            orderBy: { timestamp: 'desc' },
            take: 5
        });
        console.log(`Found ${logs.length} activity logs. Last 5:`, logs);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

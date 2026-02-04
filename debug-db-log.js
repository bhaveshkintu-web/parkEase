
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking WatchmanActivityLog...");
        const logs = await prisma.watchmanActivityLog.findMany({ take: 1 });
        console.log("Found logs:", logs);

        // Try to create a dummy log if a watchman exists
        const watchman = await prisma.watchman.findFirst();
        if (watchman) {
            console.log("Found watchman:", watchman.id);
            const newLog = await prisma.watchmanActivityLog.create({
                data: {
                    watchmanId: watchman.id,
                    type: "TEST_LOG",
                    details: { test: true }
                }
            });
            console.log("Created log:", newLog);

            // Clean up
            await prisma.watchmanActivityLog.delete({ where: { id: newLog.id } });
            console.log("Cleaned up log.");
        } else {
            console.log("No watchman found to test creation.");
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const watchmanEmail = "vidhipatel5044@gmail.com"; // We can use this as watchman too
    const user = await prisma.user.findUnique({ where: { email: watchmanEmail } });
    const location = await prisma.parkingLocation.findFirst();

    if (!user || !location) {
        console.error("User or location not found");
        return;
    }

    const requestId = `req_${Math.random().toString(36).substring(2, 11)}`;

    await prisma.bookingRequest.create({
        data: {
            id: requestId,
            customerName: "Smit Patel",
            customerPhone: "9876543210",
            customerEmail: "smit@example.com",
            vehiclePlate: "GJ01AB1234",
            vehicleType: "SEDAN",
            parkingId: location.id,
            parkingName: location.name,
            requestedStart: new Date(),
            requestedEnd: new Date(Date.now() + 3600000 * 2), // 2 hours later
            estimatedAmount: 20.0,
            requestedById: user.id,
            status: "PENDING",
            priority: "NORMAL",
            requestType: "WALK_IN"
        }
    });

    console.log(`Created booking request ${requestId} for ${location.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

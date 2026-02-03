import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const watchmanEmail = "vidhipatel5044@gmail.com";
    const user = await prisma.user.findUnique({ where: { email: watchmanEmail } });
    const location = await prisma.parkingLocation.findFirst();

    if (!user || !location) {
        console.error("User or location not found");
        return;
    }

    const now = new Date();

    // 1. PENDING SESSION
    const booking1 = await prisma.booking.create({
        data: {
            locationId: location.id,
            checkIn: new Date(now.getTime() + 3600000), // 1h later
            checkOut: new Date(now.getTime() + 7200000), // 2h later
            guestFirstName: "Pending", guestLastName: "User", guestEmail: "p@example.com", guestPhone: "1",
            vehiclePlate: "PEND-123", vehicleMake: "Toyota", vehicleModel: "Camry", vehicleColor: "Silver",
            totalPrice: 20, taxes: 2, fees: 1, confirmationCode: "CONF-PEND"
        }
    });
    await prisma.parkingSession.create({
        data: { bookingId: booking1.id, locationId: location.id, status: "RESERVED" }
    });

    // 2. ACTIVE SESSION
    const booking2 = await prisma.booking.create({
        data: {
            locationId: location.id,
            checkIn: new Date(now.getTime() - 3600000), // 1h ago
            checkOut: new Date(now.getTime() + 3600000), // 1h from now
            guestFirstName: "Active", guestLastName: "User", guestEmail: "a@example.com", guestPhone: "2",
            vehiclePlate: "ACTI-456", vehicleMake: "Honda", vehicleModel: "Civic", vehicleColor: "Blue",
            totalPrice: 20, taxes: 2, fees: 1, confirmationCode: "CONF-ACTI"
        }
    });
    await prisma.parkingSession.create({
        data: { bookingId: booking2.id, locationId: location.id, status: "CHECKED_IN", checkInTime: new Date(now.getTime() - 3600000) }
    });

    // 3. OVERSTAY SESSION
    const booking3 = await prisma.booking.create({
        data: {
            locationId: location.id,
            checkIn: new Date(now.getTime() - 7200000), // 2h ago
            checkOut: new Date(now.getTime() - 3600000), // 1h ago
            guestFirstName: "Overstay", guestLastName: "User", guestEmail: "o@example.com", guestPhone: "3",
            vehiclePlate: "OVER-789", vehicleMake: "Ford", vehicleModel: "F-150", vehicleColor: "Black",
            totalPrice: 20, taxes: 2, fees: 1, confirmationCode: "CONF-OVER"
        }
    });
    await prisma.parkingSession.create({
        data: { bookingId: booking3.id, locationId: location.id, status: "CHECKED_IN", checkInTime: new Date(now.getTime() - 7200000) }
    });

    console.log("Mock sessions created: 1 Pending, 1 Active, 1 Overstay");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

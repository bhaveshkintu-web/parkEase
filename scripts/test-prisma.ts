import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.user.count();
    console.log("User count:", count);
    const locations = await prisma.parkingLocation.findMany({ take: 1 });
    console.log("Locations found:", locations.length);
    if (locations.length > 0) {
        console.log("Location ID:", locations[0].id);
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

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const emails = ["vidhikumaripatel.it22@scet.ac.in", "vidhipatel5044@gmail.com"];

    for (const email of emails) {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log(`User ${email} not found`);
            continue;
        }

        // Ensure role is OWNER
        await prisma.user.update({
            where: { id: user.id },
            data: { role: "OWNER" }
        });

        // Create Owner Profile with required fields
        const profile = await prisma.ownerProfile.upsert({
            where: { userId: user.id },
            update: {},
            create: {
                userId: user.id,
                businessName: "ParkEase Testing",
                businessType: "individual",
                street: "Main St",
                city: "New York",
                state: "NY",
                zipCode: "10001",
                country: "USA",
                status: "approved",
                verificationStatus: "verified"
            }
        });

        console.log(`Owner profile created/fixed for ${email}: ${profile.id}`);

        // Link all locations to this profile
        const locations = await prisma.parkingLocation.findMany();
        for (const loc of locations) {
            await (prisma as any).parkingLocation.update({
                where: { id: loc.id },
                data: { ownerId: profile.id }
            });
            console.log(`Linked location ${loc.name} to owner ${email}`);
        }
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

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const loc = await prisma.parkingLocation.findFirst({
        where: { name: 'surat' }
    });
    console.log('Location Status:', loc?.status);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

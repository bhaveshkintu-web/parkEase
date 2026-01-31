import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Available models in Prisma:');
    const keys = Object.keys(prisma);
    keys.forEach(k => {
        if (!k.startsWith('_') && !k.startsWith('$')) {
            console.log(`- ${k}`);
        }
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

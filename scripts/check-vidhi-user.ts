import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'vidhipatel5044@gmail.com' },
        include: { watchmanProfile: true }
    });

    console.log('User status:', JSON.stringify(user, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

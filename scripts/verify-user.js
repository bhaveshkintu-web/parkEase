
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyUser() {
    try {
        const user = await prisma.user.update({
            where: { email: 'vidhipatel5044@gmail.com' },
            data: { emailVerified: true },
        });
        console.log('User verified:', user.email);
    } catch (e) {
        console.error('Error verifying user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyUser();

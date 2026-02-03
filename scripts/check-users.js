
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany();
        console.log('Users found:', users.map(u => ({ email: u.email, verified: u.emailVerified })));
    } catch (e) {
        console.error('Error listing users:', e);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();

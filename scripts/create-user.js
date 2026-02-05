
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUser() {
    const email = 'vidhipatel5044@gmail.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                emailVerified: true
            },
            create: {
                email,
                password: hashedPassword,
                firstName: 'Vidhi',
                lastName: 'Patel',
                emailVerified: true,
            },
        });
        console.log('User created/updated:', user.email);
    } catch (e) {
        console.error('Error creating user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

createUser();

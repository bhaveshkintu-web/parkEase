
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'vidhipatel5044@gmail.com';
    const password = 'password123';

    console.log(`Checking user: ${email}...`);

    try {
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        if (existingUser) {
            console.log('User found. Updating password and verification status...');
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    password: hashedPassword,
                    emailVerified: true,
                    status: 'ACTIVE'
                },
            });
            console.log('User updated successfully.');
        } else {
            console.log('User not found. Creating new user...');
            await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName: 'Vidhi',
                    lastName: 'Patel',
                    role: 'CUSTOMER',
                    emailVerified: true,
                    status: 'ACTIVE'
                },
            });
            console.log('User created successfully.');
        }

        console.log(`
--------------------------------------------------
LOGIN CREDENTIALS:
Email:    ${email}
Password: ${password}
--------------------------------------------------
`);

    } catch (error) {
        console.error('Error fixing login:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

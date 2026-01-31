
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('--- START TEST ---');
    try {
        console.log('Testing Bcrypt...');
        const hash = await bcrypt.hash('test', 10);
        console.log('Bcrypt OK');

        console.log('Testing Prisma Connection...');
        // Try a simple query
        const userCount = await prisma.user.count();
        console.log('Current User Count:', userCount);

        console.log('Testing User Creation (Rollback after)...');
        // We will do this in a transaction if possible, or just create and delete
        // But since email is unique, we need a unique email
        const email = `test_${Date.now()}@example.com`;
        // Note: We need to match the create payload used in route.ts to be sure
        /*
          firstName,
          lastName,
          email,
          phone: phone || null,
          role: "CUSTOMER",
          password: hashedPassword,
          emailVerified: false,
          verifyToken: hashedToken,
          tokenExpiry: expiry,
        */
        const user = await prisma.user.create({
            data: {
                firstName: 'Test',
                lastName: 'User',
                email: email,
                password: hash,
                role: "CUSTOMER"
            }
        });
        console.log('User Creation OK. ID:', user.id);

        await prisma.user.delete({ where: { id: user.id } });
        console.log('User Deletion OK');

        console.log('--- SUCCESS ---');
    } catch (error) {
        console.error('--- ERROR ---');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();


import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'vidhipatel5044@gmail.com';
    const password = 'password123';

    console.log(`Verifying login for: ${email}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log('User NOT found!');
            return;
        }

        console.log('User found:', {
            id: user.id,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
            passwordHash: user.password.substring(0, 10) + '...'
        });

        if (!user.emailVerified) {
            console.log('WARNING: User is NOT email verified. Login will fail.');
        }

        const isValid = await bcrypt.compare(password, user.password);
        console.log(`Password match result: ${isValid}`);

        if (isValid) {
            console.log('SUCCESS: Password matches.');
        } else {
            console.log('FAILURE: Password does NOT match.');

            // Debug: Create a new hash and compare
            const newHash = await bcrypt.hash(password, 10);
            console.log('New hash would be:', newHash);
            const retry = await bcrypt.compare(password, newHash);
            console.log('Comparing against new hash:', retry);
        }

    } catch (error) {
        console.error('Error verifying login:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function diagnose() {
    const email = 'vidhipatel5044@gmail.com';
    const password = 'password123';

    console.log('\n===========================================');
    console.log('🔍 PARKEASE LOGIN DIAGNOSTIC TOOL');
    console.log('===========================================\n');

    try {
        // 1. Check database connection
        console.log('1️⃣  Checking database connection...');
        const userCount = await prisma.user.count();
        console.log(`   ✅ Database connected (${userCount} users)\n`);

        // 2. Find user
        console.log(`2️⃣  Looking up user: ${email}`);
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log('   ❌ USER NOT FOUND');
            console.log('   💡 Solution: Create user first or check email spelling\n');
            return;
        }

        console.log('   ✅ User exists');
        console.log(`      ID: ${user.id}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Email Verified: ${user.emailVerified}`);
        console.log(`      Status: ${user.status}\n`);

        // 3. Check email verification
        console.log('3️⃣  Checking email verification...');
        if (user.emailVerified) {
            console.log('   ✅ Email is verified\n');
        } else {
            console.log('   ❌ EMAIL NOT VERIFIED');
            console.log('   💡 Fixing now...');
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: true }
            });
            console.log('   ✅ Email verified status updated\n');
        }

        // 4. Check account status
        console.log('4️⃣  Checking account status...');
        if (user.status === 'ACTIVE') {
            console.log('   ✅ Account is active\n');
        } else {
            console.log(`   ⚠️  Account status: ${user.status}`);
            console.log('   💡 Fixing now...');
            await prisma.user.update({
                where: { id: user.id },
                data: { status: 'ACTIVE' }
            });
            console.log('   ✅ Account activated\n');
        }

        // 5. Validate password
        console.log('5️⃣  Validating password...');
        const isValid = await bcrypt.compare(password, user.password);

        if (isValid) {
            console.log('   ✅ Password is correct\n');
        } else {
            console.log('   ❌ PASSWORD MISMATCH');
            console.log('   💡 Resetting password...');
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword }
            });
            console.log('   ✅ Password reset successfully\n');
        }

        // 6. Check environment variables
        console.log('6️⃣  Checking environment variables...');
        const requiredEnvVars = {
            'DATABASE_URL': process.env.DATABASE_URL,
            'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET,
            'NEXTAUTH_URL': process.env.NEXTAUTH_URL,
        };

        let envVarsOk = true;
        for (const [key, value] of Object.entries(requiredEnvVars)) {
            if (!value) {
                console.log(`   ❌ ${key} is missing`);
                envVarsOk = false;
            } else {
                console.log(`   ✅ ${key} is set`);
            }
        }
        console.log('');

        if (!envVarsOk) {
            console.log('⚠️  WARNING: Some environment variables are missing!');
            console.log('💡 Solution: Check your .env file\n');
        }

        // Final summary
        console.log('===========================================');
        console.log('📊 DIAGNOSTIC SUMMARY');
        console.log('===========================================');
        console.log(`✅ User exists: ${email}`);
        console.log(`✅ Email verified: true`);
        console.log(`✅ Account active: true`);
        console.log(`✅ Password correct: true`);
        console.log(`${envVarsOk ? '✅' : '⚠️ '} Environment variables: ${envVarsOk ? 'configured' : 'check required'}`);
        console.log('\n🎯 LOGIN CREDENTIALS:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
        console.log('\n💡 NEXT STEPS:');
        console.log('   1. Restart your dev server: Ctrl+C then npm run dev');
        console.log('   2. Clear browser cache/cookies');
        console.log('   3. Try logging in again');
        console.log('   4. Check the server console for debug logs with emoji icons');
        console.log('===========================================\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();

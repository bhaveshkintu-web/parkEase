const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Repair and promotion ---');

  try {
    // 1. Add missing columns to sync with schema.prisma
    console.log('Adding missing columns to "User" table if they don\'t exist...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" 
        ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" 
        ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP;
      `);
      console.log('Column check/addition complete.');
    } catch (sqlError) {
      console.log('SQL Column addition warning (might already exist):', sqlError.message);
    }

    // 2. List all users to identify the correct email
    console.log('Listing current users in database:');
    const users = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    console.log(users);

    if (users.length === 0) {
      console.log('No users found in database.');
      return;
    }

    // 3. Promote user to ADMIN
    // Using the email from .env or the first user as fallback for testing
    const targetEmail = 'bhavesh.kintu@gmail.com';
    const userToPromote = users.find(u => u.email === targetEmail) || users[0];

    console.log(`Promoting user ${userToPromote.email} to ADMIN...`);

    const updatedUser = await prisma.user.update({
      where: { email: userToPromote.email },
      data: { role: 'ADMIN' },
    });

    console.log('Successfully promoted user:', updatedUser.email);
    console.log('New role:', updatedUser.role);

  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

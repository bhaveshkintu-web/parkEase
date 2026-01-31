
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing Prisma Connection...');
    const count = await prisma.user.count();
    console.log('User count:', count);
    console.log('Prisma Connection Success!');

    console.log('Testing Bcrypt...');
    const hash = await bcrypt.hash('password123', 10);
    console.log('Bcrypt Hash Success:', hash);

  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

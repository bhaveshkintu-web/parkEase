import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const result = await prisma.$queryRawUnsafe(`
    SELECT typname FROM pg_type 
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE nspname = 'public' AND typtype = 'e'
  `);
    console.log(result);
}
main().finally(() => prisma.$disconnect());

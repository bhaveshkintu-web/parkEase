import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// export const prisma = globalForPrisma.prisma ?? new PrismaClient()
// Disable cache for now to ensure model updates are picked up
export const prisma = new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

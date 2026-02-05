
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        const userCount = await prisma.user.count()
        console.log('Successfully connected to database.')
        console.log('User count:', userCount)
        process.exit(0)
    } catch (error) {
        console.error('Failed to connect to database:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()

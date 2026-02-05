
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const watchmen = await prisma.user.findMany({
        where: { role: 'WATCHMAN' },
        select: {
            id: true,
            email: true,
            watchmanProfile: {
                include: {
                    assignedLocations: true
                }
            }
        }
    })
    console.log('Watchmen in DB:', JSON.stringify(watchmen, null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())

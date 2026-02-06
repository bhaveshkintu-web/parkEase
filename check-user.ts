import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findUnique({
        where: { id: "cml9ceznk0009u178lkfchlwl" }
    })
    console.log("User found:", JSON.stringify(user, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())

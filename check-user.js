const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.findUnique({
        where: { id: "cml9ceznk0009u178lkfchlwl" }
    })
    if (user) {
        console.log("ID MATCHED")
        console.log("AVATAR_VALUE:", user.avatar)
    } else {
        console.log("USER NOT FOUND")
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())

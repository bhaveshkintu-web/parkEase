const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning up OwnerLead table...')
  try {
    await prisma.ownerLead.deleteMany({})
    console.log('OwnerLead table cleared successfully.')
  } catch (error) {
    console.error('Error clearing table:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

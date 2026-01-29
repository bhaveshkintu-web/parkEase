const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Checking database leads...')
  try {
    const leads = await prisma.ownerLead.findMany()
    console.log('Total leads found:', leads.length)
    console.log('Leads:', JSON.stringify(leads, null, 2))
  } catch (error) {
    console.error('Error checking leads:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()

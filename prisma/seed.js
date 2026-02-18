import { PrismaClient, UserRole, UserStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash("Password@123", 10)

  // 🔹 ADMIN
  await prisma.user.create({
    data: {
      email: "admin@parkzipply.com",
      firstName: "System",
      lastName: "Admin",
      password,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  })

  // 🔹 OWNER
  await prisma.user.create({
    data: {
      email: "owner@parkzipply.com",
      firstName: "Parking",
      lastName: "Owner",
      password,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  })

  // 🔹 CUSTOMER
  await prisma.user.create({
    data: {
      email: "customer@parkzipply.com",
      firstName: "Normal",
      lastName: "Customer",
      password,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      emailVerified: true, // default bhi chalega
    },
  })

  // 🔹 WATCHMAN
  await prisma.user.create({
    data: {
      email: "watchman@parkzipply.com",
      firstName: "Gate",
      lastName: "Watchman",
      password,
      role: UserRole.WATCHMAN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  })

  console.log("✅ All role-wise users seeded successfully")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
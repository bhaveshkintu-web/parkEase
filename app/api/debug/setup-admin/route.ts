import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log('--- Starting Database Repair via API ---');

    // 1. Add missing columns to sync with schema.prisma
    // We use separate try-catch for each to avoid failure if one already exists
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT`);
    } catch (e) { console.log("resetToken already exists or error:", e); }

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP`);
    } catch (e) { console.log("resetTokenExpiry already exists or error:", e); }

    // 2. Promote user to ADMIN
    const targetEmail = 'bhavesh.kintu@gmail.com';

    // Check if user exists first
    const user = await prisma.user.findUnique({ where: { email: targetEmail } });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: `User with email ${targetEmail} not found. Please register first.`
      });
    }

    const updatedUser = await prisma.user.update({
      where: { email: targetEmail },
      data: { role: 'ADMIN' as any }, // 'ADMIN' matches the Prisma ENUM
    });

    return NextResponse.json({
      success: true,
      message: "Database repair and Admin promotion successful!",
      details: {
        email: updatedUser.email,
        newRole: updatedUser.role,
        addedColumns: ["resetToken", "resetTokenExpiry"]
      }
    });

  } catch (error: any) {
    console.error('Debug API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error"
    }, { status: 500 });
  }
}

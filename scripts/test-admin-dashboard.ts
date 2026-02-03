/**
 * Test script to verify admin dashboard API
 * Run this with: npx ts-node scripts/test-admin-dashboard.ts
 */

import { prisma } from '../lib/prisma';

async function testDashboardQueries() {
  console.log('\n🔍 Testing Admin Dashboard Queries...\n');

  try {
    // Test 1: Count users
    console.log('1️⃣ Counting users...');
    const totalUsers = await prisma.user.count();
    console.log(`   ✅ Total users: ${totalUsers}`);
  } catch (error) {
    console.error('   ❌ Error counting users:', error);
  }

  try {
    // Test 2: Count owners
    console.log('\n2️⃣ Counting owner profiles...');
    const totalOwners = await prisma.ownerProfile.count();
    console.log(`   ✅ Total owners: ${totalOwners}`);
  } catch (error) {
    console.error('   ❌ Error counting owners:', error);
  }

  try {
    // Test 3: Count locations
    console.log('\n3️⃣ Counting parking locations...');
    const totalLocations = await prisma.parkingLocation.count();
    console.log(`   ✅ Total locations: ${totalLocations}`);
  } catch (error) {
    console.error('   ❌ Error counting locations:', error);
  }

  try {
    // Test 4: Count bookings
    console.log('\n4️⃣ Counting bookings...');
    const totalBookings = await prisma.booking.count();
    console.log(`   ✅ Total bookings: ${totalBookings}`);
  } catch (error) {
    console.error('   ❌ Error counting bookings:', error);
  }

  try {
    // Test 5: Count active locations (using ENUM)
    console.log('\n5️⃣ Counting active locations (status = ACTIVE)...');
    const activeLocations = await prisma.parkingLocation.count({
      where: { status: 'ACTIVE' as any }
    });
    console.log(`   ✅ Active locations: ${activeLocations}`);
  } catch (error) {
    console.error('   ❌ Error counting active locations:', error);
  }

  try {
    // Test 6: Count pending owners
    console.log('\n6️⃣ Counting pending owners...');
    const pendingOwners = await prisma.ownerProfile.count({
      where: { status: 'pending' }
    });
    console.log(`   ✅ Pending owners: ${pendingOwners}`);
  } catch (error) {
    console.error('   ❌ Error counting pending owners:', error);
  }

  try {
    // Test 7: Calculate total revenue
    console.log('\n7️⃣ Calculating total revenue...');
    const revenueData = await prisma.booking.aggregate({
      _sum: {
        totalPrice: true,
      },
    });
    console.log(`   ✅ Total revenue: $${revenueData._sum.totalPrice || 0}`);
  } catch (error) {
    console.error('   ❌ Error calculating revenue:', error);
  }

  // Test 8: Check admin user exists
  try {
    console.log('\n8️⃣ Checking for admin users...');
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        email: true,
        emailVerified: true,
        role: true,
      }
    });
    console.log(`   ✅ Found ${adminUsers.length} admin user(s):`);
    adminUsers.forEach(user => {
      console.log(`      - ${user.email} (verified: ${user.emailVerified})`);
    });
    
    if (adminUsers.length === 0) {
      console.log('\n   ⚠️  WARNING: No admin users found!');
      console.log('   Create an admin user using Prisma Studio or SQL:');
      console.log('   UPDATE "User" SET role = \'ADMIN\', "emailVerified" = true WHERE email = \'your@email.com\';');
    }
  } catch (error) {
    console.error('   ❌ Error checking admin users:', error);
  }

  console.log('\n✨ Test complete!\n');
  await prisma.$disconnect();
}

testDashboardQueries().catch(console.error);

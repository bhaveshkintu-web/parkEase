/**
 * Verification script for analytics queries
 * Run with: npx ts-node scripts/verify-analytics.ts
 */

import { getOverviewMetrics, getTopLocations, getDateRangeFromPeriod } from '../lib/db/analytics.queries';
import { prisma } from '../lib/prisma';

async function verify() {
  console.log('--- Analytics Verification ---\n');

  const period = '30d';
  const dateRange = getDateRangeFromPeriod(period);

  try {
    console.log(`Checking overview metrics for period: ${period}...`);
    const metrics = await getOverviewMetrics(dateRange);
    console.log('Metrics Result:', JSON.stringify(metrics, null, 2));

    if (metrics.totalRevenue.current > 0) {
      console.log('✅ Total revenue is now being correctly calculated!');
    } else {
      console.log('⚠️ Total revenue is still $0. Checking database for existing payments...');
      const paymentCount = await prisma.payment.count({
        where: { status: 'SUCCESS' }
      });
      console.log(`Found ${paymentCount} total payments with status 'SUCCESS' in the database.`);
    }

    console.log('\nChecking top locations...');
    const locations = await getTopLocations(dateRange, 5);
    console.log('Top Locations Result:', JSON.stringify(locations, null, 2));

    if (locations.locations.length > 0 && locations.locations[0].revenue > 0) {
      console.log('✅ Top locations revenue is now being correctly calculated!');
    } else {
      console.log('⚠️ Top locations revenue is still $0.');
    }

    console.log('\nChecking booking distribution...');
    const { getBookingDistribution } = await import('../lib/db/analytics.queries');
    const distribution = await getBookingDistribution(dateRange);
    console.log('Distribution Result:', JSON.stringify(distribution, null, 2));

    if (distribution.totalBookings === metrics.totalBookings.current) {
      console.log('✅ Booking counts are consistent between overview and distribution!');
    } else {
      console.log(`❌ Booking counts mismatch: Overview=${metrics.totalBookings.current}, Distribution=${distribution.totalBookings}`);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verify();

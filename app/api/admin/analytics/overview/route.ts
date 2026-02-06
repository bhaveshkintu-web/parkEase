// Admin Analytics Overview API Route
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getOverviewMetrics, getDateRangeFromPeriod } from '@/lib/db/analytics.queries';
import type { DateRangePeriod } from '@/lib/types/analytics.types';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || '30d') as DateRangePeriod;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // Get date range
    const dateRange = getDateRangeFromPeriod(period, startDate, endDate);

    // Fetch overview metrics
    const metrics = await getOverviewMetrics(dateRange);

    return NextResponse.json({
      success: true,
      data: metrics,
      period,
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics overview' },
      { status: 500 }
    );
  }
}

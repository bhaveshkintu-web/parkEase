// Analytics Type Definitions for Admin Dashboard

export type DateRangePeriod = '7d' | '30d' | '90d' | '1y' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  period: DateRangePeriod;
}

export interface MetricChange {
  value: number;
  percentage: number;
  isPositive: boolean;
}

export interface OverviewMetric {
  current: number;
  previous: number;
  change: MetricChange;
}

export interface OverviewMetrics {
  totalRevenue: OverviewMetric;
  totalBookings: OverviewMetric;
  activeLocations: OverviewMetric;
  averageOccupancy: OverviewMetric;
}

export interface RevenueTrendDataPoint {
  month: string;
  monthLabel: string;
  revenue: number;
  bookings: number;
  year: number;
}

export interface RevenueTrendResponse {
  data: RevenueTrendDataPoint[];
  totalRevenue: number;
  totalBookings: number;
}

export interface BookingCategory {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface BookingDistributionResponse {
  categories: BookingCategory[];
  totalBookings: number;
}

export interface TopLocationData {
  id: string;
  rank: number;
  name: string;
  city: string;
  state: string | null;
  revenue: number;
  bookings: number;
  occupancy: number;
  airportCode: string | null;
}

export interface TopLocationsResponse {
  locations: TopLocationData[];
  totalCount: number;
}

// API Request Params
export interface AnalyticsQueryParams {
  period?: DateRangePeriod;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// CSV Export Types
export interface ExportData {
  overview: OverviewMetrics;
  revenueTrend: RevenueTrendDataPoint[];
  bookingDistribution: BookingCategory[];
  topLocations: TopLocationData[];
}

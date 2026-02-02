export interface ShuttleInfo {
  enabled: boolean;
  hours: string;
  frequency: string;
  pickupInstructions: string;
  phone: string;
  trackingUrl?: string;
}

export interface RedeemStep {
  step: number;
  title: string;
  description: string;
}

export interface CancellationPolicy {
  type: "free" | "partial" | "nonrefundable";
  deadline: string;
  description: string;
}

export interface ParkingLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  zipCode: string;
  airport: string;
  airportCode: string;
  coordinates: { lat: number; lng: number };
  pricePerDay: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  amenities: string[];
  images: string[];
  shuttle: boolean;
  shuttleInfo?: ShuttleInfo;
  covered: boolean;
  selfPark: boolean;
  valet: boolean;
  open24Hours: boolean;
  distance: string;
  availableSpots: number;
  totalSpots: number;
  description: string;
  redeemSteps?: RedeemStep[];
  specialInstructions?: string[];
  cancellationPolicy?: CancellationPolicy;
  heightLimit?: string;
  securityFeatures: string[];
  ownerId?: string;
}

export interface Destination {
  id: string;
  type: "airport" | "city" | "venue";
  code?: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  coordinates: { lat: number; lng: number };
}

export interface SearchParams {
  location: string;
  destination?: Destination;
  checkIn: Date;
  checkOut: Date;
  parkingType: "airport" | "hourly" | "monthly";
}

export interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface VehicleInfo {
  make: string;
  model: string;
  color: string;
  licensePlate: string;
}

export interface Quote {
  id: string;
  locationId: string;
  checkIn: Date;
  checkOut: Date;
  basePrice: number;
  taxes: number;
  fees: number;
  discount?: number;
  totalPrice: number;
  expiresAt: Date;
}

export interface ReservationHold {
  id: string;
  quoteId: string;
  expiresAt: Date;
}

export interface Booking {
  id: string;
  locationId: string;
  location: ParkingLocation;
  checkIn: Date;
  checkOut: Date;
  guestInfo: GuestInfo;
  vehicleInfo: VehicleInfo;
  totalPrice: number;
  taxes: number;
  fees: number;
  status: "pending" | "confirmed" | "cancelled";
  confirmationCode: string;
  qrCode: string;
  createdAt: Date;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  state: string;
  image: string;
}

export interface Review {
  id: string;
  locationId: string;
  author: string;
  rating: number;
  date: Date;
  title: string;
  content: string;
  helpful: number;
}

export interface FilterState {
  priceRange: [number, number];
  shuttle: boolean;
  covered: boolean;
  selfPark: boolean;
  valet: boolean;
  evCharging: boolean;
  open24Hours: boolean;
  freeCancellation: boolean;
  heightLimit?: string;
}

// User & Auth Types
export type UserRole = "customer" | "owner" | "watchman" | "admin" | "support";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: string;
  emailVerified: boolean;
  role: UserRole;
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  preferences: UserPreferences;
  // Owner specific
  ownerId?: string;
  ownerProfile?: OwnerProfile;
  assignedParkingIds?: string[];
}

// Watchman Types
export interface Watchman {
  id: string;
  userId: string;
  ownerId: string;
  name: string;
  phone: string;
  email: string;
  assignedParkingIds: string[];
  status: "active" | "inactive" | "archived";
  shift: "morning" | "evening" | "night" | "all";
  createdAt: Date;
  lastActive?: Date;
  todayCheckIns: number;
  todayCheckOuts: number;
}

// Owner Wallet Types
export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  lastUpdated: Date;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: "credit" | "debit" | "withdrawal" | "refund" | "commission";
  amount: number;
  description: string;
  status: "pending" | "completed" | "failed";
  reference?: string;
  createdAt: Date;
}

export interface WithdrawalRequest {
  id: string;
  walletId: string;
  amount: number;
  bankDetails: BankDetails;
  status: "pending" | "processing" | "completed" | "rejected";
  requestedAt: Date;
  processedAt?: Date;
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  routingNumber?: string;
  ifscCode?: string;
}

// Check-in/Check-out Types
export interface ParkingSession {
  id: string;
  bookingId: string;
  parkingId: string;
  vehiclePlate: string;
  vehicleType: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  checkInBy?: string;
  checkOutBy?: string;
  status: "pending" | "checked_in" | "checked_out" | "overstay" | "violation";
  notes?: string;
  photos?: string[];
}

// Watchman Booking Request Types
export interface WatchmanBookingRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleType: string;
  parkingId: string;
  parkingName: string;
  spotNumber?: string;
  requestType: "walk_in" | "extension" | "modification" | "early_checkout";
  originalBookingId?: string;
  requestedStart: Date;
  requestedEnd: Date;
  estimatedAmount: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  priority: "normal" | "urgent";
  notes?: string;
  requestedBy: string;
  requestedAt: Date;
  processedBy?: string;
  processedAt?: Date;
  rejectionReason?: string;
}

// Watchman Activity Types
export interface WatchmanActivityLog {
  id: string;
  watchmanId: string;
  watchmanName: string;
  type: "shift_start" | "shift_end" | "check_in" | "check_out" | "booking_request" | "incident" | "break_start" | "break_end" | "patrol";
  timestamp: Date;
  details: {
    vehiclePlate?: string;
    bookingId?: string;
    parkingId?: string;
    spotNumber?: string;
    notes?: string;
    location?: string;
  };
}

export interface ShiftBreak {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  type?: "lunch" | "short" | "emergency";
}

export interface WatchmanShift {
  id: string;
  watchmanId: string;
  watchmanName: string;
  parkingId: string;
  parkingName: string;
  shiftDate: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  status: "scheduled" | "active" | "completed" | "missed" | "partial";
  breaks: ShiftBreak[];
  activities: WatchmanActivityLog[];
  totalCheckIns: number;
  totalCheckOuts: number;
  incidentsReported: number;
}

// Dispute Types
export interface Dispute {
  id: string;
  bookingId: string;
  userId: string;
  type: "refund" | "overcharge" | "service" | "damage" | "other";
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo?: string;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Commission & Pricing Types
export interface CommissionRule {
  id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  appliesTo: "all" | "airport" | "hourly" | "monthly";
  minBookingValue?: number;
  maxCommission?: number;
  isActive: boolean;
}

export interface PricingRule {
  id: string;
  parkingId?: string;
  name: string;
  type: "surge" | "discount" | "holiday" | "weekend";
  multiplier: number;
  startDate?: Date;
  endDate?: Date;
  daysOfWeek?: number[];
  isActive: boolean;
}

// Promotion Types
export interface Promotion {
  id: string;
  code: string;
  name: string;
  type: "percentage" | "fixed" | "free_day";
  value: number;
  minBookingValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
}

export interface SecurityPreferences {
  twoFactorEnabled: boolean;
  twoFactorMethod?: "authenticator" | "sms" | "email";
  loginAlerts: boolean;
  loginAlertEmail: boolean;
  loginAlertSms: boolean;
  trustedDevices: TrustedDevice[];
  passwordLastChanged?: Date;
  securityQuestions?: SecurityQuestion[];
  sessionTimeout: number; // minutes
  requirePasswordForSensitive: boolean;
}

export interface TrustedDevice {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  lastActive: Date;
  location?: string;
  isCurrent: boolean;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answerHash: string;
}

export interface LoginActivity {
  id: string;
  timestamp: Date;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  status: "success" | "failed" | "blocked";
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    sms: boolean;
    marketing: boolean;
  };
  defaultVehicleId?: string;
  defaultPaymentId?: string;
  security?: SecurityPreferences;
}

// Saved Vehicle Types
export interface SavedVehicle {
  id: string;
  userId: string;
  nickname?: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  state: string;
  isDefault: boolean;
  createdAt: Date;
}

// Payment Method Types
export interface PaymentMethod {
  id: string;
  userId: string;
  type: "card" | "paypal";
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  isDefault: boolean;
  createdAt: Date;
}

// Enhanced Reservation Types
export interface Reservation extends Booking {
  userId?: string;
  modificationHistory: ModificationRecord[];
  cancellationEligibility: {
    eligible: boolean;
    refundAmount: number;
    deadline: Date;
  };
}

export interface ModificationRecord {
  id: string;
  type: "date_change" | "vehicle_change" | "extension";
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  priceDifference: number;
  createdAt: Date;
}

// Owner Reply Type
export interface OwnerReply {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  ownerId: string;
  ownerName: string;
}

// Admin Review Types
export interface AdminReview extends Review {
  status: "pending" | "approved" | "rejected" | "flagged";
  flagReason?: string;
  moderatorNotes?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
  reportCount: number;
  userEmail?: string;
  ownerReply?: OwnerReply;
}

// Admin Location Types
export interface AdminParkingLocation extends ParkingLocation {
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "PENDING";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  analytics: LocationAnalytics;
}

export interface LocationAnalytics {
  totalBookings: number;
  revenue: number;
  averageRating: number;
  occupancyRate: number;
}

// Parking Approval Types
export interface ParkingApproval {
  id: string;
  locationId: string;
  location: Partial<AdminParkingLocation>;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  status: "pending" | "under_review" | "approved" | "rejected" | "requires_changes";
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  requiredChanges?: string[];
  documents: ParkingDocument[];
}

export interface ParkingDocument {
  id: string;
  type: "license" | "insurance" | "ownership" | "permit" | "photo" | "other";
  name: string;
  url: string;
  uploadedAt: Date;
  verified: boolean;
}

// Refund Types
export interface RefundRequest {
  id: string;
  bookingId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  reason: "cancellation" | "service_issue" | "duplicate_charge" | "overcharge" | "no_show" | "other";
  description: string;
  status: "pending" | "approved" | "partial" | "rejected" | "processed";
  approvedAmount?: number;
  processedAt?: Date;
  processedBy?: string;
  paymentMethod: string;
  createdAt: Date;
}

// CMS Content Types
export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  status: "draft" | "published" | "archived";
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  createdBy: string;
  updatedBy?: string;
}

// Analytics Types
export interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
  commissions: number;
}

export interface OccupancyData {
  locationId: string;
  locationName: string;
  date: string;
  hour?: number;
  occupiedSpots: number;
  totalSpots: number;
  rate: number;
}

export interface OwnerPerformance {
  ownerId: string;
  ownerName: string;
  totalLocations: number;
  activeLocations: number;
  totalBookings: number;
  totalRevenue: number;
  avgRating: number;
  responseRate: number;
  disputeRate: number;
}

export interface WatchmanActivity {
  watchmanId: string;
  watchmanName: string;
  date: string;
  checkIns: number;
  checkOuts: number;
  violations: number;
  avgResponseTime: number;
  shiftsCompleted: number;
}

// Owner Profile Types (for Admin Management)
export interface OwnerProfile {
  id: string;
  userId: string;
  user: User;
  businessName: string;
  businessType: "individual" | "company" | "partnership";
  taxId?: string;
  registrationNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  bankDetails?: BankDetails;
  documents: OwnerDocument[];
  status: "pending" | "approved" | "suspended" | "rejected";
  verificationStatus: "unverified" | "in_review" | "verified" | "failed";
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  suspendedAt?: Date;
  suspendedReason?: string;
  // Aggregated stats
  stats: OwnerStats;
}

export interface OwnerDocument {
  id: string;
  type: "id_proof" | "business_license" | "tax_certificate" | "bank_statement" | "address_proof" | "other";
  name: string;
  url: string;
  status: "pending" | "verified" | "rejected";
  uploadedAt: Date;
  verifiedAt?: Date;
  rejectionReason?: string;
}

export interface OwnerStats {
  totalLocations: number;
  activeLocations: number;
  totalBookings: number;
  totalRevenue: number;
  totalEarnings: number;
  totalCommissionPaid: number;
  pendingWithdrawals: number;
  avgRating: number;
  disputeCount: number;
  resolvedDisputes: number;
  watchmenCount: number;
}

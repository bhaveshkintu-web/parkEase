"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type {
  SavedVehicle,
  PaymentMethod,
  Reservation,
  AdminReview,
  AdminParkingLocation,
  Watchman,
  Wallet,
  WalletTransaction,
  WithdrawalRequest,
  ParkingSession,
  Dispute,
  User,
  BankDetails,
  ParkingApproval,
  RefundRequest,
  CommissionRule,
  PricingRule,
  Promotion,
  CMSPage,
  OwnerProfile,
  WatchmanBookingRequest,
} from "./types";
import { parkingLocations, reviews as baseReviews } from "./data";

// Generate mock data
function generateMockVehicles(userId: string): SavedVehicle[] {
  return [
    {
      id: "veh_1",
      userId,
      nickname: "Daily Driver",
      make: "Toyota",
      model: "Camry",
      year: 2022,
      color: "Silver",
      licensePlate: "ABC1234",
      state: "CA",
      isDefault: true,
      createdAt: new Date("2024-03-15"),
    },
    {
      id: "veh_2",
      userId,
      nickname: "Weekend Car",
      make: "Honda",
      model: "CR-V",
      year: 2021,
      color: "Blue",
      licensePlate: "XYZ5678",
      state: "CA",
      isDefault: false,
      createdAt: new Date("2024-05-20"),
    },
  ];
}

function generateMockPayments(userId: string): PaymentMethod[] {
  return [
    {
      id: "pay_1",
      userId,
      type: "card",
      last4: "4242",
      brand: "Visa",
      expiryMonth: 12,
      expiryYear: 2027,
      cardholderName: "John Doe",
      isDefault: true,
      createdAt: new Date("2024-02-10"),
    },
    {
      id: "pay_2",
      userId,
      type: "card",
      last4: "5555",
      brand: "Mastercard",
      expiryMonth: 8,
      expiryYear: 2026,
      cardholderName: "John Doe",
      isDefault: false,
      createdAt: new Date("2024-06-01"),
    },
  ];
}

function generateMockReservations(userId: string): Reservation[] {
  if (parkingLocations.length === 0) return [];
  const now = new Date();
  const upcoming = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  return [
    {
      id: "res_1",
      userId,
      locationId: parkingLocations[0].id,
      location: parkingLocations[0],
      checkIn: upcoming,
      checkOut: new Date(upcoming.getTime() + 5 * 24 * 60 * 60 * 1000),
      guestInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "demo@parkease.com",
        phone: "+1 (555) 123-4567",
      },
      vehicleInfo: {
        make: "Toyota",
        model: "Camry",
        color: "Silver",
        licensePlate: "ABC1234",
      },
      totalPrice: 59.95,
      taxes: 5.4,
      fees: 2.99,
      status: "confirmed",
      confirmationCode: "PKE-ABC123",
      qrCode: "PKE-ABC123",
      createdAt: new Date(),
      modificationHistory: [],
      cancellationEligibility: {
        eligible: true,
        refundAmount: 59.95,
        deadline: new Date(upcoming.getTime() - 24 * 60 * 60 * 1000),
      },
    },
    {
      id: "res_2",
      userId,
      locationId: parkingLocations[1].id,
      location: parkingLocations[1],
      checkIn: past,
      checkOut: new Date(past.getTime() + 3 * 24 * 60 * 60 * 1000),
      guestInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "demo@parkease.com",
        phone: "+1 (555) 123-4567",
      },
      vehicleInfo: {
        make: "Honda",
        model: "CR-V",
        color: "Blue",
        licensePlate: "XYZ5678",
      },
      totalPrice: 41.97,
      taxes: 3.78,
      fees: 2.99,
      status: "confirmed",
      confirmationCode: "PKE-DEF456",
      qrCode: "PKE-DEF456",
      createdAt: past,
      modificationHistory: [],
      cancellationEligibility: {
        eligible: false,
        refundAmount: 0,
        deadline: past,
      },
    },
  ];
}

function generateAdminReviews(): AdminReview[] {
  return baseReviews.map((review, index) => ({
    ...review,
    status: index === 0 ? "pending" : index === 1 ? "flagged" : "approved",
    flagReason: index === 1 ? "Potentially fake review" : undefined,
    reportCount: index === 1 ? 3 : 0,
    userEmail: `user${index + 1}@example.com`,
  }));
}

function generateAdminLocations(): AdminParkingLocation[] {
  return parkingLocations.map((loc, index) => ({
    ...loc,
    status: index === 0 ? "active" : index === 1 ? "active" : "maintenance",
    createdBy: "admin_1",
    createdAt: new Date("2023-06-01"),
    updatedAt: new Date(),
    analytics: {
      totalBookings: Math.floor(Math.random() * 500) + 100,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      averageRating: loc.rating,
      occupancyRate: Math.floor(Math.random() * 40) + 60,
    },
  }));
}

function generateMockWatchmen(ownerId: string): Watchman[] {
  if (parkingLocations.length === 0) return [];
  return [
    {
      id: "wm_1",
      userId: "user_wm_1",
      ownerId,
      name: "Robert Chen",
      phone: "+1 (555) 234-5678",
      email: "robert.chen@parkease.com",
      assignedParkingIds: [parkingLocations[0]?.id || "loc_1"],
      status: "active",
      shift: "morning",
      createdAt: new Date("2024-01-15"),
      lastActive: new Date(),
      todayCheckIns: 12,
      todayCheckOuts: 8,
    },
    {
      id: "wm_2",
      userId: "user_wm_2",
      ownerId,
      name: "Maria Garcia",
      phone: "+1 (555) 345-6789",
      email: "maria.garcia@parkease.com",
      assignedParkingIds: [parkingLocations[0]?.id || "loc_1", parkingLocations[1]?.id || "loc_2"],
      status: "active",
      shift: "evening",
      createdAt: new Date("2024-02-20"),
      lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
      todayCheckIns: 15,
      todayCheckOuts: 18,
    },
    {
      id: "wm_3",
      userId: "user_wm_3",
      ownerId,
      name: "James Wilson",
      phone: "+1 (555) 456-7890",
      email: "james.wilson@parkease.com",
      assignedParkingIds: [parkingLocations[1]?.id || "loc_2"],
      status: "inactive",
      shift: "night",
      createdAt: new Date("2024-03-10"),
      todayCheckIns: 0,
      todayCheckOuts: 0,
    },
  ];
}

function generateMockWallet(userId: string): Wallet {
  return {
    id: `wallet_${userId}`,
    userId,
    balance: 12456.78,
    currency: "USD",
    lastUpdated: new Date(),
  };
}

function generateMockTransactions(walletId: string): WalletTransaction[] {
  const now = new Date();
  return [
    {
      id: "txn_1",
      walletId,
      type: "credit",
      amount: 145.99,
      description: "Booking #PKE-XYZ789 completed",
      status: "completed",
      reference: "PKE-XYZ789",
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "txn_2",
      walletId,
      type: "commission",
      amount: -14.60,
      description: "Platform commission (10%)",
      status: "completed",
      reference: "PKE-XYZ789",
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "txn_3",
      walletId,
      type: "withdrawal",
      amount: -5000.00,
      description: "Bank withdrawal",
      status: "completed",
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: "txn_4",
      walletId,
      type: "credit",
      amount: 89.97,
      description: "Booking #PKE-ABC456 completed",
      status: "completed",
      reference: "PKE-ABC456",
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: "txn_5",
      walletId,
      type: "refund",
      amount: -29.99,
      description: "Refund for cancellation #PKE-DEF123",
      status: "completed",
      reference: "PKE-DEF123",
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

function generateMockDisputes(): Dispute[] {
  const now = new Date();
  return [
    {
      id: "disp_1",
      bookingId: "res_1",
      userId: "user_1",
      type: "refund",
      subject: "Parking spot was unavailable",
      description: "Arrived at the parking lot but my reserved spot was taken by another vehicle. Had to find alternative parking.",
      status: "open",
      priority: "high",
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: "disp_2",
      bookingId: "res_2",
      userId: "user_2",
      type: "overcharge",
      subject: "Charged more than quoted price",
      description: "I was charged $45.99 but the quote was $39.99. Please refund the difference.",
      status: "in_progress",
      priority: "medium",
      assignedTo: "admin_1",
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "disp_3",
      bookingId: "res_3",
      userId: "user_3",
      type: "service",
      subject: "Shuttle never arrived",
      description: "Waited for 45 minutes but the shuttle never showed up. Had to take an expensive taxi.",
      status: "resolved",
      priority: "high",
      assignedTo: "admin_1",
      resolution: "Full refund provided and $50 credit added to account",
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  ];
}

function generateMockParkingApprovals(): ParkingApproval[] {
  const now = new Date();
  return [
    {
      id: "appr_1",
      locationId: "loc_pending_1",
      location: {
        name: "Downtown Express Parking",
        address: "456 Main Street, Los Angeles, CA 90012",
        airport: "LAX",
      },
      ownerId: "owner_2",
      ownerName: "David Kim",
      ownerEmail: "david.kim@email.com",
      status: "pending",
      submittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      documents: [
        { id: "doc_1", type: "license", name: "Business License.pdf", url: "#", uploadedAt: now, verified: false },
        { id: "doc_2", type: "insurance", name: "Insurance Certificate.pdf", url: "#", uploadedAt: now, verified: false },
      ],
    },
    {
      id: "appr_2",
      locationId: "loc_pending_2",
      location: {
        name: "Airport Value Parking",
        address: "789 Aviation Blvd, San Francisco, CA 94128",
        airport: "SFO",
      },
      ownerId: "owner_3",
      ownerName: "Lisa Chen",
      ownerEmail: "lisa.chen@email.com",
      status: "under_review",
      submittedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      reviewedBy: "admin_1",
      documents: [
        { id: "doc_3", type: "license", name: "License.pdf", url: "#", uploadedAt: now, verified: true },
        { id: "doc_4", type: "insurance", name: "Insurance.pdf", url: "#", uploadedAt: now, verified: true },
        { id: "doc_5", type: "permit", name: "Operating Permit.pdf", url: "#", uploadedAt: now, verified: false },
      ],
    },
  ];
}

function generateMockRefundRequests(): RefundRequest[] {
  const now = new Date();
  return [
    {
      id: "ref_1",
      bookingId: "res_10",
      userId: "user_5",
      userName: "Alice Brown",
      userEmail: "alice.brown@email.com",
      amount: 45.99,
      reason: "cancellation",
      description: "Flight was cancelled, no longer need parking",
      status: "pending",
      paymentMethod: "Visa ****4242",
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      id: "ref_2",
      bookingId: "res_11",
      userId: "user_6",
      userName: "Bob Wilson",
      userEmail: "bob.wilson@email.com",
      amount: 89.99,
      reason: "service_issue",
      description: "Shuttle service was extremely late causing us to almost miss our flight",
      status: "approved",
      approvedAmount: 44.99,
      paymentMethod: "Mastercard ****5555",
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: "ref_3",
      bookingId: "res_12",
      userId: "user_7",
      userName: "Carol Davis",
      userEmail: "carol.davis@email.com",
      amount: 29.99,
      reason: "duplicate_charge",
      description: "I was charged twice for the same booking",
      status: "processed",
      approvedAmount: 29.99,
      processedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      processedBy: "admin_1",
      paymentMethod: "Visa ****1234",
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  ];
}

function generateMockCommissionRules(): CommissionRule[] {
  return [
    { id: "comm_1", name: "Standard Commission", type: "percentage", value: 10, appliesTo: "all", isActive: true },
    { id: "comm_2", name: "Airport Premium", type: "percentage", value: 15, appliesTo: "airport", minBookingValue: 50, isActive: true },
    { id: "comm_3", name: "Monthly Discount", type: "percentage", value: 8, appliesTo: "monthly", isActive: true },
    { id: "comm_4", name: "Minimum Fee", type: "fixed", value: 2.99, appliesTo: "all", isActive: true },
  ];
}

function generateMockPricingRules(): PricingRule[] {
  return [
    { id: "price_1", name: "Weekend Surge", type: "weekend", multiplier: 1.25, daysOfWeek: [0, 6], isActive: true },
    { id: "price_2", name: "Holiday Premium", type: "holiday", multiplier: 1.5, startDate: new Date("2026-12-23"), endDate: new Date("2026-12-26"), isActive: true },
    { id: "price_3", name: "Off-Peak Discount", type: "discount", multiplier: 0.85, isActive: false },
  ];
}

function generateMockPromotions(): Promotion[] {
  const now = new Date();
  return [
    {
      id: "promo_1",
      code: "WELCOME20",
      name: "New User Discount",
      type: "percentage",
      value: 20,
      maxDiscount: 30,
      usageLimit: 1000,
      usedCount: 456,
      validFrom: new Date("2026-01-01"),
      validUntil: new Date("2026-12-31"),
      isActive: true,
    },
    {
      id: "promo_2",
      code: "SUMMER10",
      name: "Summer Sale",
      type: "fixed",
      value: 10,
      minBookingValue: 40,
      usageLimit: 500,
      usedCount: 123,
      validFrom: new Date("2026-06-01"),
      validUntil: new Date("2026-08-31"),
      isActive: true,
    },
    {
      id: "promo_3",
      code: "FREEPARK",
      name: "Free Day Promo",
      type: "free_day",
      value: 1,
      minBookingValue: 100,
      usageLimit: 100,
      usedCount: 87,
      validFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      validUntil: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      isActive: false,
    },
  ];
}

function generateMockCMSPages(): CMSPage[] {
  const now = new Date();
  return [
    {
      id: "cms_1",
      slug: "privacy-policy",
      title: "Privacy Policy",
      content: "# Privacy Policy\n\nLast updated: January 2026\n\nThis Privacy Policy describes how ParkEase collects, uses, and shares your information...",
      metaTitle: "Privacy Policy | ParkEase",
      metaDescription: "Learn how ParkEase protects your privacy and handles your personal data.",
      status: "published",
      createdAt: new Date("2025-06-01"),
      updatedAt: now,
      publishedAt: new Date("2025-06-01"),
      createdBy: "admin_1",
    },
    {
      id: "cms_2",
      slug: "terms-of-service",
      title: "Terms of Service",
      content: "# Terms of Service\n\nEffective: January 2026\n\nBy using ParkEase, you agree to these Terms of Service...",
      metaTitle: "Terms of Service | ParkEase",
      metaDescription: "Read the terms and conditions for using ParkEase parking services.",
      status: "published",
      createdAt: new Date("2025-06-01"),
      updatedAt: now,
      publishedAt: new Date("2025-06-01"),
      createdBy: "admin_1",
    },
    {
      id: "cms_3",
      slug: "about-us",
      title: "About Us",
      content: "# About ParkEase\n\nParkEase is the leading parking reservation platform...",
      status: "draft",
      createdAt: new Date("2026-01-10"),
      updatedAt: new Date("2026-01-10"),
      createdBy: "admin_1",
    },
  ];
}

function generateMockUsers(): User[] {
  return [
    { id: "user_1", email: "john.doe@email.com", firstName: "John", lastName: "Doe", phone: "+1 555-1234", role: "customer", status: "active", emailVerified: true, createdAt: new Date("2024-01-15"), preferences: { notifications: { email: true, sms: true, marketing: false } } },
    { id: "user_2", email: "jane.smith@email.com", firstName: "Jane", lastName: "Smith", phone: "+1 555-2345", role: "customer", status: "active", emailVerified: true, createdAt: new Date("2024-02-20"), preferences: { notifications: { email: true, sms: false, marketing: true } } },
    { id: "user_3", email: "mike.owner@email.com", firstName: "Mike", lastName: "Chen", phone: "+1 555-3456", role: "owner", status: "active", emailVerified: true, createdAt: new Date("2023-08-10"), ownerId: "owner_1", preferences: { notifications: { email: true, sms: true, marketing: true } } },
    { id: "user_4", email: "sarah.watch@email.com", firstName: "Sarah", lastName: "Watch", phone: "+1 555-4567", role: "watchman", status: "active", emailVerified: true, createdAt: new Date("2024-03-01"), preferences: { notifications: { email: true, sms: true, marketing: false } } },
    { id: "user_5", email: "admin@parkease.com", firstName: "Admin", lastName: "User", phone: "+1 555-9999", role: "admin", status: "active", emailVerified: true, createdAt: new Date("2023-01-01"), preferences: { notifications: { email: true, sms: false, marketing: false } } },
    { id: "user_6", email: "david.kim@email.com", firstName: "David", lastName: "Kim", phone: "+1 555-5678", role: "owner", status: "active", emailVerified: true, createdAt: new Date("2023-10-15"), ownerId: "owner_2", preferences: { notifications: { email: true, sms: true, marketing: true } } },
    { id: "user_7", email: "lisa.chen@email.com", firstName: "Lisa", lastName: "Chen", phone: "+1 555-6789", role: "owner", status: "suspended", emailVerified: true, createdAt: new Date("2024-01-20"), ownerId: "owner_3", preferences: { notifications: { email: true, sms: false, marketing: false } } },
  ];
}

function generateMockOwnerProfiles(): OwnerProfile[] {
  const users = generateMockUsers();
  const ownerUsers = users.filter(u => u.role === "owner");

  return [
    {
      id: "owner_1",
      userId: "user_3",
      user: ownerUsers[0],
      businessName: "Chen Parking Solutions",
      businessType: "company",
      taxId: "12-3456789",
      registrationNumber: "CA-2023-0456",
      address: {
        street: "123 Business Park Dr",
        city: "Los Angeles",
        state: "CA",
        zipCode: "90012",
        country: "USA",
      },
      bankDetails: {
        accountName: "Chen Parking Solutions LLC",
        accountNumber: "****4567",
        bankName: "Bank of America",
        routingNumber: "****1234",
      },
      documents: [
        { id: "doc_1", type: "business_license", name: "Business License 2024.pdf", url: "#", status: "verified", uploadedAt: new Date("2023-08-15"), verifiedAt: new Date("2023-08-20") },
        { id: "doc_2", type: "tax_certificate", name: "Tax Certificate.pdf", url: "#", status: "verified", uploadedAt: new Date("2023-08-15"), verifiedAt: new Date("2023-08-20") },
        { id: "doc_3", type: "id_proof", name: "Driver License.pdf", url: "#", status: "verified", uploadedAt: new Date("2023-08-15"), verifiedAt: new Date("2023-08-20") },
      ],
      status: "approved",
      verificationStatus: "verified",
      createdAt: new Date("2023-08-10"),
      approvedAt: new Date("2023-08-20"),
      approvedBy: "admin_1",
      stats: {
        totalLocations: 3,
        activeLocations: 2,
        totalBookings: 1245,
        totalRevenue: 89456.78,
        totalEarnings: 80511.10,
        totalCommissionPaid: 8945.68,
        pendingWithdrawals: 1250.00,
        avgRating: 4.7,
        disputeCount: 5,
        resolvedDisputes: 4,
        watchmenCount: 3,
      },
    },
    {
      id: "owner_2",
      userId: "user_6",
      user: ownerUsers[1] || ownerUsers[0],
      businessName: "Kim Airport Parking",
      businessType: "individual",
      address: {
        street: "456 Airport Blvd",
        city: "San Francisco",
        state: "CA",
        zipCode: "94128",
        country: "USA",
      },
      bankDetails: {
        accountName: "David Kim",
        accountNumber: "****8901",
        bankName: "Chase Bank",
        routingNumber: "****5678",
      },
      documents: [
        { id: "doc_4", type: "id_proof", name: "Passport.pdf", url: "#", status: "verified", uploadedAt: new Date("2023-10-20"), verifiedAt: new Date("2023-10-25") },
        { id: "doc_5", type: "address_proof", name: "Utility Bill.pdf", url: "#", status: "pending", uploadedAt: new Date("2024-01-10") },
      ],
      status: "approved",
      verificationStatus: "verified",
      createdAt: new Date("2023-10-15"),
      approvedAt: new Date("2023-10-25"),
      approvedBy: "admin_1",
      stats: {
        totalLocations: 2,
        activeLocations: 2,
        totalBookings: 876,
        totalRevenue: 54321.00,
        totalEarnings: 48888.90,
        totalCommissionPaid: 5432.10,
        pendingWithdrawals: 0,
        avgRating: 4.5,
        disputeCount: 2,
        resolvedDisputes: 2,
        watchmenCount: 2,
      },
    },
    {
      id: "owner_3",
      userId: "user_7",
      user: ownerUsers[2] || ownerUsers[0],
      businessName: "Lisa's Parking Hub",
      businessType: "individual",
      address: {
        street: "789 Parking Way",
        city: "San Diego",
        state: "CA",
        zipCode: "92101",
        country: "USA",
      },
      documents: [
        { id: "doc_6", type: "id_proof", name: "ID Card.pdf", url: "#", status: "rejected", uploadedAt: new Date("2024-01-25"), rejectionReason: "Document expired" },
      ],
      status: "suspended",
      verificationStatus: "failed",
      createdAt: new Date("2024-01-20"),
      suspendedAt: new Date("2024-02-15"),
      suspendedReason: "Multiple customer complaints and unresolved disputes",
      stats: {
        totalLocations: 1,
        activeLocations: 0,
        totalBookings: 145,
        totalRevenue: 8765.00,
        totalEarnings: 7888.50,
        totalCommissionPaid: 876.50,
        pendingWithdrawals: 500.00,
        avgRating: 3.2,
        disputeCount: 12,
        resolvedDisputes: 3,
        watchmenCount: 1,
      },
    },
  ];
}

function generateMockParkingSessions(): ParkingSession[] {
  if (parkingLocations.length === 0) return [];
  const now = new Date();
  return [
    {
      id: "sess_1",
      bookingId: "res_1",
      parkingId: parkingLocations[0]?.id || "loc_1",
      vehiclePlate: "ABC1234",
      vehicleType: "Sedan",
      checkInTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      status: "checked_in",
      checkInBy: "wm_1",
    },
    {
      id: "sess_2",
      bookingId: "res_2",
      parkingId: parkingLocations[0]?.id || "loc_1",
      vehiclePlate: "XYZ5678",
      vehicleType: "SUV",
      checkInTime: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      checkOutTime: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      status: "checked_out",
      checkInBy: "wm_1",
      checkOutBy: "wm_2",
    },
    {
      id: "sess_3",
      bookingId: "res_3",
      parkingId: parkingLocations[0]?.id || "loc_1",
      vehiclePlate: "DEF9012",
      vehicleType: "Sedan",
      status: "pending",
    },
    {
      id: "sess_4",
      bookingId: "res_4",
      parkingId: parkingLocations[1]?.id || "loc_2",
      vehiclePlate: "GHI3456",
      vehicleType: "Truck",
      checkInTime: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      status: "overstay",
      checkInBy: "wm_2",
      notes: "Vehicle exceeded booking duration by 2 hours",
    },
  ];
}

interface DataStoreContextType {
  // Vehicles
  vehicles: SavedVehicle[];
  addVehicle: (vehicle: Omit<SavedVehicle, "id" | "userId" | "createdAt">) => Promise<SavedVehicle>;
  updateVehicle: (id: string, data: Partial<SavedVehicle>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  setDefaultVehicle: (id: string) => Promise<void>;

  // Payments
  payments: PaymentMethod[];
  addPayment: (payment: Omit<PaymentMethod, "id" | "userId" | "createdAt">) => Promise<PaymentMethod>;
  updatePayment: (id: string, data: Partial<PaymentMethod>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  setDefaultPayment: (id: string) => Promise<void>;

  // Reservations
  reservations: Reservation[];
  addReservation: (reservation: Omit<Reservation, "id" | "modificationHistory" | "cancellationEligibility">) => Promise<Reservation>;
  updateReservation: (id: string, data: Partial<Reservation>) => Promise<void>;
  cancelReservation: (id: string) => Promise<{ refundAmount: number }>;

  // Admin: Reviews
  adminReviews: AdminReview[];
  moderateReview: (id: string, action: "approve" | "reject" | "flag", notes?: string) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  addOwnerReply: (reviewId: string, content: string, ownerId: string, ownerName: string) => Promise<void>;
  updateOwnerReply: (reviewId: string, content: string) => Promise<void>;
  deleteOwnerReply: (reviewId: string) => Promise<void>;

  // Admin: Locations
  adminLocations: AdminParkingLocation[];
  addLocation: (location: Omit<AdminParkingLocation, "id" | "createdAt" | "updatedAt" | "analytics">) => Promise<AdminParkingLocation>;
  updateLocation: (id: string, data: Partial<AdminParkingLocation>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  setLocationStatus: (id: string, status: AdminParkingLocation["status"]) => Promise<void>;

  // Owner: Watchmen
  watchmen: Watchman[];
  addWatchman: (watchman: Omit<Watchman, "id" | "createdAt" | "todayCheckIns" | "todayCheckOuts">) => Promise<Watchman>;
  updateWatchman: (id: string, data: Partial<Watchman>) => Promise<void>;
  deleteWatchman: (id: string) => Promise<void>;

  // Owner: Wallet
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  requestWithdrawal: (amount: number, bankDetails: BankDetails) => Promise<WithdrawalRequest>;

  // Watchman: Sessions
  parkingSessions: ParkingSession[];
  checkInVehicle: (sessionId: string, watchmanId: string) => Promise<void>;
  checkOutVehicle: (sessionId: string, watchmanId: string) => Promise<void>;

  // Admin: Disputes
  disputes: Dispute[];
  updateDispute: (id: string, data: Partial<Dispute>) => Promise<void>;

  // Admin: Parking Approvals
  parkingApprovals: ParkingApproval[];
  reviewParkingApproval: (id: string, action: "approve" | "reject" | "request_changes", notes?: string, changes?: string[]) => Promise<void>;

  // Admin: Refunds
  refundRequests: RefundRequest[];
  processRefund: (id: string, action: "approve" | "partial" | "reject", amount?: number) => Promise<void>;

  // Watchman: Booking Requests
  bookingRequests: WatchmanBookingRequest[];
  fetchBookingRequests: (parkingId?: string) => Promise<void>;
  fetchWatchmanLocations: () => Promise<void>;
  addBookingRequest: (request: Omit<WatchmanBookingRequest, "id" | "requestedAt" | "requestedById" | "status">) => Promise<WatchmanBookingRequest>;
  updateBookingRequestStatus: (id: string, status: WatchmanBookingRequest["status"], rejectionReason?: string) => Promise<void>;

  // Admin: Commissions
  commissionRules: CommissionRule[];
  addCommissionRule: (rule: Omit<CommissionRule, "id">) => Promise<CommissionRule>;
  updateCommissionRule: (id: string, data: Partial<CommissionRule>) => Promise<void>;
  deleteCommissionRule: (id: string) => Promise<void>;

  // Admin: Pricing
  pricingRules: PricingRule[];
  addPricingRule: (rule: Omit<PricingRule, "id">) => Promise<PricingRule>;
  updatePricingRule: (id: string, data: Partial<PricingRule>) => Promise<void>;
  deletePricingRule: (id: string) => Promise<void>;

  // Admin: Promotions
  promotions: Promotion[];
  addPromotion: (promo: Omit<Promotion, "id" | "usedCount">) => Promise<Promotion>;
  updatePromotion: (id: string, data: Partial<Promotion>) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;

  // Admin: CMS
  cmsPages: CMSPage[];
  addCMSPage: (page: Omit<CMSPage, "id" | "createdAt" | "updatedAt">) => Promise<CMSPage>;
  updateCMSPage: (id: string, data: Partial<CMSPage>) => Promise<void>;
  deleteCMSPage: (id: string) => Promise<void>;
  publishCMSPage: (id: string) => Promise<void>;

  // Admin: Users
  users: User[];

  // Admin: Owner Management
  ownerProfiles: OwnerProfile[];
  addOwnerProfile: (profile: Omit<OwnerProfile, "id" | "createdAt" | "stats">) => Promise<OwnerProfile>;
  updateOwnerProfile: (id: string, data: Partial<OwnerProfile>) => Promise<void>;
  deleteOwnerProfile: (id: string) => Promise<void>;
  approveOwner: (id: string, adminId: string) => Promise<void>;
  suspendOwner: (id: string, reason: string) => Promise<void>;
  reactivateOwner: (id: string) => Promise<void>;
  verifyOwnerDocument: (ownerId: string, documentId: string, action: "verify" | "reject", reason?: string) => Promise<void>;

  // Loading states
  isLoading: boolean;
  initializeForUser: (userId: string) => void;
  initializeForOwner: (ownerId: string) => void;
  initializeForWatchman: (watchmanId: string) => void;
  currentOwnerProfile: OwnerProfile | null;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export function DataStoreProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<SavedVehicle[]>([]);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [adminReviews, setAdminReviews] = useState<AdminReview[]>(generateAdminReviews());
  const [adminLocations, setAdminLocations] = useState<AdminParkingLocation[]>(generateAdminLocations());
  const [watchmen, setWatchmen] = useState<Watchman[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [parkingSessions, setParkingSessions] = useState<ParkingSession[]>(generateMockParkingSessions());
  const [disputes, setDisputes] = useState<Dispute[]>(generateMockDisputes());
  const [parkingApprovals, setParkingApprovals] = useState<ParkingApproval[]>(generateMockParkingApprovals());
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>(generateMockRefundRequests());
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>(generateMockCommissionRules());
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(generateMockPricingRules());
  const [promotions, setPromotions] = useState<Promotion[]>(generateMockPromotions());
  const [cmsPages, setCmsPages] = useState<CMSPage[]>(generateMockCMSPages());
  const [users, setUsers] = useState<User[]>(generateMockUsers());
  const [ownerProfiles, setOwnerProfiles] = useState<OwnerProfile[]>(generateMockOwnerProfiles());
  const [currentOwnerProfile, setCurrentOwnerProfile] = useState<OwnerProfile | null>(null);
  const [bookingRequests, setBookingRequests] = useState<WatchmanBookingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const initializeForUser = useCallback((userId: string) => {
    if (currentUserId === userId) return;
    setIsLoading(true);
    setCurrentUserId(userId);
    setVehicles(generateMockVehicles(userId));
    setPayments(generateMockPayments(userId));
    setReservations(generateMockReservations(userId));
    setIsLoading(false);
  }, [currentUserId]);

  const initializeForOwner = useCallback((ownerId: string) => {
    setIsLoading(true);
    setWatchmen(generateMockWatchmen(ownerId));
    setWallet(generateMockWallet(ownerId));
    setTransactions(generateMockTransactions(`wallet_${ownerId}`));
    setIsLoading(false);
  }, []);

  const initializeForWatchman = useCallback((_watchmanId: string) => {
    setIsLoading(true);
    setParkingSessions(generateMockParkingSessions());
    // Generate some mock reservations for the watchman to scan
    setReservations(generateMockReservations("demo_user"));
    fetchBookingRequests();
    fetchWatchmanLocations();
    setIsLoading(false);
  }, []);

  // Vehicle operations
  const addVehicle = useCallback(async (vehicle: Omit<SavedVehicle, "id" | "userId" | "createdAt">) => {
    await new Promise((r) => setTimeout(r, 500));
    const newVehicle: SavedVehicle = {
      ...vehicle,
      id: `veh_${Date.now()}`,
      userId: currentUserId || "",
      createdAt: new Date(),
    };
    setVehicles((prev) => {
      if (newVehicle.isDefault) {
        return [...prev.map((v) => ({ ...v, isDefault: false })), newVehicle];
      }
      return [...prev, newVehicle];
    });
    return newVehicle;
  }, [currentUserId]);

  const updateVehicle = useCallback(async (id: string, data: Partial<SavedVehicle>) => {
    await new Promise((r) => setTimeout(r, 500));
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...data } : v)));
  }, []);

  const deleteVehicle = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const setDefaultVehicle = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setVehicles((prev) =>
      prev.map((v) => ({ ...v, isDefault: v.id === id }))
    );
  }, []);

  // Payment operations
  const addPayment = useCallback(async (payment: Omit<PaymentMethod, "id" | "userId" | "createdAt">) => {
    await new Promise((r) => setTimeout(r, 500));
    const newPayment: PaymentMethod = {
      ...payment,
      id: `pay_${Date.now()}`,
      userId: currentUserId || "",
      createdAt: new Date(),
    };
    setPayments((prev) => {
      if (newPayment.isDefault) {
        return [...prev.map((p) => ({ ...p, isDefault: false })), newPayment];
      }
      return [...prev, newPayment];
    });
    return newPayment;
  }, [currentUserId]);

  const updatePayment = useCallback(async (id: string, data: Partial<PaymentMethod>) => {
    await new Promise((r) => setTimeout(r, 500));
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deletePayment = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const setDefaultPayment = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setPayments((prev) =>
      prev.map((p) => ({ ...p, isDefault: p.id === id }))
    );
  }, []);

  // Reservation operations
  const addReservation = useCallback(async (reservation: Omit<Reservation, "id" | "modificationHistory" | "cancellationEligibility">) => {
    await new Promise((r) => setTimeout(r, 500));
    const newReservation: Reservation = {
      ...reservation,
      id: `res_${Date.now()}`,
      modificationHistory: [],
      cancellationEligibility: {
        eligible: true,
        refundAmount: reservation.totalPrice,
        deadline: new Date(new Date(reservation.checkIn).getTime() - 24 * 60 * 60 * 1000),
      },
    };
    setReservations((prev) => [newReservation, ...prev]);
    return newReservation;
  }, []);

  const updateReservation = useCallback(async (id: string, data: Partial<Reservation>) => {
    await new Promise((r) => setTimeout(r, 500));
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  }, []);

  const cancelReservation = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    let refundAmount = 0;
    setReservations((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          refundAmount = r.cancellationEligibility.eligible ? r.cancellationEligibility.refundAmount : 0;
          return { ...r, status: "cancelled" };
        }
        return r;
      })
    );
    return { refundAmount };
  }, []);

  // Admin review operations
  const moderateReview = useCallback(async (id: string, action: "approve" | "reject" | "flag", notes?: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setAdminReviews((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
            ...r,
            status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "flagged",
            moderatorNotes: notes,
            moderatedAt: new Date(),
            moderatedBy: currentUserId || undefined,
          }
          : r
      )
    );
  }, [currentUserId]);

  const deleteReview = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setAdminReviews((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Owner reply operations
  const addOwnerReply = useCallback(async (reviewId: string, content: string, ownerId: string, ownerName: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setAdminReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? {
            ...review,
            ownerReply: {
              id: `reply_${Date.now()}`,
              content,
              createdAt: new Date(),
              ownerId,
              ownerName,
            },
          }
          : review
      )
    );
  }, []);

  const updateOwnerReply = useCallback(async (reviewId: string, content: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setAdminReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId && review.ownerReply
          ? {
            ...review,
            ownerReply: {
              ...review.ownerReply,
              content,
              updatedAt: new Date(),
            },
          }
          : review
      )
    );
  }, []);

  const deleteOwnerReply = useCallback(async (reviewId: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setAdminReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId ? { ...review, ownerReply: undefined } : review
      )
    );
  }, []);

  // Admin location operations
  const addLocation = useCallback(async (location: Omit<AdminParkingLocation, "id" | "createdAt" | "updatedAt" | "analytics">) => {
    await new Promise((r) => setTimeout(r, 500));
    const newLocation: AdminParkingLocation = {
      ...location,
      id: `loc_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      analytics: {
        totalBookings: 0,
        revenue: 0,
        averageRating: 0,
        occupancyRate: 0,
      },
    };
    setAdminLocations((prev) => [newLocation, ...prev]);
    return newLocation;
  }, []);

  const updateLocation = useCallback(async (id: string, data: Partial<AdminParkingLocation>) => {
    await new Promise((r) => setTimeout(r, 500));
    setAdminLocations((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...data, updatedAt: new Date() } : l))
    );
  }, []);

  const deleteLocation = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setAdminLocations((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const setLocationStatus = useCallback(async (id: string, status: AdminParkingLocation["status"]) => {
    await new Promise((r) => setTimeout(r, 500));
    setAdminLocations((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status, updatedAt: new Date() } : l))
    );
  }, []);

  // Watchman operations
  const addWatchman = useCallback(async (watchman: Omit<Watchman, "id" | "createdAt" | "todayCheckIns" | "todayCheckOuts">) => {
    await new Promise((r) => setTimeout(r, 500));
    const newWatchman: Watchman = {
      ...watchman,
      id: `wm_${Date.now()}`,
      createdAt: new Date(),
      todayCheckIns: 0,
      todayCheckOuts: 0,
    };
    setWatchmen((prev) => [...prev, newWatchman]);
    return newWatchman;
  }, []);

  const updateWatchman = useCallback(async (id: string, data: Partial<Watchman>) => {
    await new Promise((r) => setTimeout(r, 500));
    setWatchmen((prev) => prev.map((w) => (w.id === id ? { ...w, ...data } : w)));
  }, []);

  const deleteWatchman = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setWatchmen((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // Wallet operations
  const requestWithdrawal = useCallback(async (amount: number, bankDetails: BankDetails) => {
    await new Promise((r) => setTimeout(r, 500));
    const withdrawal: WithdrawalRequest = {
      id: `wd_${Date.now()}`,
      walletId: wallet?.id || "",
      amount,
      bankDetails,
      status: "pending",
      requestedAt: new Date(),
    };
    // Deduct from wallet
    setWallet((prev) => prev ? { ...prev, balance: prev.balance - amount } : null);
    // Add transaction
    setTransactions((prev) => [{
      id: `txn_${Date.now()}`,
      walletId: wallet?.id || "",
      type: "withdrawal",
      amount: -amount,
      description: "Withdrawal request",
      status: "pending",
      createdAt: new Date(),
    }, ...prev]);
    return withdrawal;
  }, [wallet]);

  // Parking session operations
  const checkInVehicle = useCallback(async (sessionId: string, watchmanId: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setParkingSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, status: "checked_in", checkInTime: new Date(), checkInBy: watchmanId }
          : s
      )
    );
  }, []);

  const checkOutVehicle = useCallback(async (sessionId: string, watchmanId: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setParkingSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, status: "checked_out", checkOutTime: new Date(), checkOutBy: watchmanId }
          : s
      )
    );
  }, []);

  // Dispute operations
  const updateDispute = useCallback(async (id: string, data: Partial<Dispute>) => {
    await new Promise((r) => setTimeout(r, 500));
    setDisputes((prev) => prev.map((d) => (d.id === id ? { ...d, ...data, updatedAt: new Date() } : d)));
  }, []);

  // Parking Approval operations
  const reviewParkingApproval = useCallback(async (id: string, action: "approve" | "reject" | "request_changes", notes?: string, changes?: string[]) => {
    await new Promise((r) => setTimeout(r, 500));
    setParkingApprovals((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
            ...a,
            status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "requires_changes",
            reviewNotes: notes,
            requiredChanges: changes,
            reviewedAt: new Date(),
            reviewedBy: currentUserId || undefined,
          }
          : a
      )
    );
  }, [currentUserId]);

  // Refund operations
  const processRefund = useCallback(async (id: string, action: "approve" | "partial" | "reject", amount?: number) => {
    await new Promise((r) => setTimeout(r, 500));
    setRefundRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
            ...r,
            status: action === "reject" ? "rejected" : action === "partial" ? "partial" : "approved",
            approvedAmount: action === "reject" ? 0 : amount || r.amount,
            processedAt: new Date(),
            processedBy: currentUserId || undefined,
          }
          : r
      )
    );
  }, [currentUserId]);

  // Commission Rule operations
  const addCommissionRule = useCallback(async (rule: Omit<CommissionRule, "id">) => {
    await new Promise((r) => setTimeout(r, 500));
    const newRule: CommissionRule = { ...rule, id: `comm_${Date.now()}` };
    setCommissionRules((prev) => [...prev, newRule]);
    return newRule;
  }, []);

  const updateCommissionRule = useCallback(async (id: string, data: Partial<CommissionRule>) => {
    await new Promise((r) => setTimeout(r, 500));
    setCommissionRules((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }, []);

  const deleteCommissionRule = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setCommissionRules((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Pricing Rule operations
  const addPricingRule = useCallback(async (rule: Omit<PricingRule, "id">) => {
    await new Promise((r) => setTimeout(r, 500));
    const newRule: PricingRule = { ...rule, id: `price_${Date.now()}` };
    setPricingRules((prev) => [...prev, newRule]);
    return newRule;
  }, []);

  const updatePricingRule = useCallback(async (id: string, data: Partial<PricingRule>) => {
    await new Promise((r) => setTimeout(r, 500));
    setPricingRules((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deletePricingRule = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setPricingRules((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Promotion operations
  const addPromotion = useCallback(async (promo: Omit<Promotion, "id" | "usedCount">) => {
    await new Promise((r) => setTimeout(r, 500));
    const newPromo: Promotion = { ...promo, id: `promo_${Date.now()}`, usedCount: 0 };
    setPromotions((prev) => [...prev, newPromo]);
    return newPromo;
  }, []);

  const updatePromotion = useCallback(async (id: string, data: Partial<Promotion>) => {
    await new Promise((r) => setTimeout(r, 500));
    setPromotions((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deletePromotion = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // CMS Page operations
  const addCMSPage = useCallback(async (page: Omit<CMSPage, "id" | "createdAt" | "updatedAt">) => {
    await new Promise((r) => setTimeout(r, 500));
    const now = new Date();
    const newPage: CMSPage = { ...page, id: `cms_${Date.now()}`, createdAt: now, updatedAt: now };
    setCmsPages((prev) => [...prev, newPage]);
    return newPage;
  }, []);

  const updateCMSPage = useCallback(async (id: string, data: Partial<CMSPage>) => {
    await new Promise((r) => setTimeout(r, 500));
    setCmsPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...data, updatedAt: new Date() } : p)));
  }, []);

  const deleteCMSPage = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setCmsPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const publishCMSPage = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    const now = new Date();
    setCmsPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "published", publishedAt: now, updatedAt: now } : p))
    );
  }, []);

  // Owner Profile operations
  const addOwnerProfile = useCallback(async (profile: Omit<OwnerProfile, "id" | "createdAt" | "stats">) => {
    await new Promise((r) => setTimeout(r, 500));
    const newProfile: OwnerProfile = {
      ...profile,
      id: `owner_${Date.now()}`,
      createdAt: new Date(),
      stats: {
        totalLocations: 0,
        activeLocations: 0,
        totalBookings: 0,
        totalRevenue: 0,
        totalEarnings: 0,
        totalCommissionPaid: 0,
        pendingWithdrawals: 0,
        avgRating: 0,
        disputeCount: 0,
        resolvedDisputes: 0,
        watchmenCount: 0,
      },
    };
    setOwnerProfiles((prev) => [...prev, newProfile]);
    return newProfile;
  }, []);

  const updateOwnerProfile = useCallback(async (id: string, data: Partial<OwnerProfile>) => {
    await new Promise((r) => setTimeout(r, 500));
    setOwnerProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deleteOwnerProfile = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setOwnerProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const approveOwner = useCallback(async (id: string, adminId: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setOwnerProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "approved", verificationStatus: "verified", approvedAt: new Date(), approvedBy: adminId }
          : p
      )
    );
  }, []);

  const suspendOwner = useCallback(async (id: string, reason: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setOwnerProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "suspended", suspendedAt: new Date(), suspendedReason: reason }
          : p
      )
    );
  }, []);

  const reactivateOwner = useCallback(async (id: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setOwnerProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "approved", suspendedAt: undefined, suspendedReason: undefined }
          : p
      )
    );
  }, []);

  const verifyOwnerDocument = useCallback(async (ownerId: string, documentId: string, action: "verify" | "reject", reason?: string) => {
    await new Promise((r) => setTimeout(r, 500));
    setOwnerProfiles((prev) =>
      prev.map((p) =>
        p.id === ownerId
          ? {
            ...p,
            documents: p.documents.map((d) =>
              d.id === documentId
                ? {
                  ...d,
                  status: action === "verify" ? "verified" : "rejected",
                  verifiedAt: action === "verify" ? new Date() : undefined,
                  rejectionReason: action === "reject" ? reason : undefined,
                }
                : d
            ),
          }
          : p
      )
    );
  }, []);

  const fetchBookingRequests = useCallback(async (parkingId?: string) => {
    try {
      let url = "/api/watchman/requests";
      if (parkingId) url += `?parkingId=${parkingId}`;
      const res = await fetch(url);
      const text = await res.text();

      if (!res.ok) {
        console.error(`Fetch requests failed (${res.status}):`, text.substring(0, 200));
        return; // Don't throw, just log
      }

      try {
        const data = JSON.parse(text);
        setBookingRequests(data);
      } catch (parseError) {
        console.error("Failed to parse booking requests JSON. Response start:", text.substring(0, 100));
        // Don't re-throw
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchWatchmanLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/watchman/locations");
      const text = await res.text();

      if (!res.ok) {
        console.error(`Fetch locations failed (${res.status}):`, text.substring(0, 200));
        return; // Don't throw
      }

      try {
        const data = JSON.parse(text);
        setAdminLocations(data);
      } catch (parseError) {
        console.error("Failed to parse watchman locations JSON. Response start:", text.substring(0, 100));
        // Don't re-throw
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const addBookingRequest = useCallback(async (request: Omit<WatchmanBookingRequest, "id" | "requestedAt" | "requestedById" | "status">) => {
    const res = await fetch("/api/watchman/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create request");

    // Optimistically update the list
    setBookingRequests((prev) => [data, ...prev]);
    return data;
  }, []);

  const updateBookingRequestStatus = useCallback(async (id: string, status: WatchmanBookingRequest["status"], rejectionReason?: string) => {
    const res = await fetch(`/api/watchman/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason }),
    });
    if (!res.ok) throw new Error("Failed to update status");
    const updatedRequest = await res.json();
    setBookingRequests((prev) => prev.map((r) => (r.id === id ? updatedRequest : r)));
  }, []);

  return (
    <DataStoreContext.Provider
      value={{
        vehicles,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        setDefaultVehicle,
        payments,
        addPayment,
        updatePayment,
        deletePayment,
        setDefaultPayment,
        reservations,
        addReservation,
        updateReservation,
        cancelReservation,
        adminReviews,
        moderateReview,
        deleteReview,
        addOwnerReply,
        updateOwnerReply,
        deleteOwnerReply,
        adminLocations,
        addLocation,
        updateLocation,
        deleteLocation,
        setLocationStatus,
        watchmen,
        addWatchman,
        updateWatchman,
        deleteWatchman,
        wallet,
        transactions,
        requestWithdrawal,
        parkingSessions,
        checkInVehicle,
        checkOutVehicle,
        disputes,
        updateDispute,
        parkingApprovals,
        reviewParkingApproval,
        refundRequests,
        processRefund,
        commissionRules,
        addCommissionRule,
        updateCommissionRule,
        deleteCommissionRule,
        pricingRules,
        addPricingRule,
        updatePricingRule,
        deletePricingRule,
        promotions,
        addPromotion,
        updatePromotion,
        deletePromotion,
        cmsPages,
        addCMSPage,
        updateCMSPage,
        deleteCMSPage,
        publishCMSPage,
        users,
        ownerProfiles,
        addOwnerProfile,
        updateOwnerProfile,
        deleteOwnerProfile,
        approveOwner,
        suspendOwner,
        reactivateOwner,
        verifyOwnerDocument,
        isLoading,
        initializeForUser,
        initializeForOwner,
        initializeForWatchman,
        currentOwnerProfile,
        bookingRequests,
        fetchBookingRequests,
        fetchWatchmanLocations,
        addBookingRequest,
        updateBookingRequestStatus,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStore() {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error("useDataStore must be used within a DataStoreProvider");
  }
  return context;
}

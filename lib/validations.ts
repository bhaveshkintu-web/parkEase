import { z } from "zod";

// Auth validations
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().min(10, "Please enter a valid phone number"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Vehicle validations
export const vehicleSchema = z.object({
  nickname: z.string().max(30).optional(),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z
    .number()
    .min(1900, "Invalid year")
    .max(new Date().getFullYear() + 1, "Invalid year"),
  color: z.string().min(1, "Color is required"),
  licensePlate: z.string().min(2, "License plate is required").max(20),
  state: z.string().length(2, "Use 2-letter state code"),
  isDefault: z.boolean().optional(),
});

// Payment validations
export const paymentSchema = z.object({
  cardNumber: z.string().min(13, "Invalid card number").max(19),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(new Date().getFullYear()),
  cvv: z.string().min(3).max(4),
  cardholderName: z.string().min(1, "Cardholder name is required"),
  isDefault: z.boolean().optional(),
});

// Reservation modification validations
export const reservationModifySchema = z.object({
  checkIn: z.date(),
  checkOut: z.date(),
}).refine((data) => data.checkOut > data.checkIn, {
  message: "Check-out must be after check-in",
  path: ["checkOut"],
});

// Owner profile validations
export const ownerProfileSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters").optional().nullable(),
  businessType: z.enum(["individual", "company"]).optional().nullable(),
  taxId: z.string().nullable().optional(),
  registrationNumber: z.string().nullable().optional(),
  street: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAccountName: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  routingNumber: z.string().nullable().optional(),
});

// Owner location creation validations
export const ownerLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
  country: z.string().min(1, "Country is required"),
  zipCode: z.string().optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
  airportCode: z.string().optional().nullable().transform(v => v === "" || v === null ? undefined : v),
  latitude: z.number({ required_error: "Latitude is required" }),
  longitude: z.number({ required_error: "Longitude is required" }),
  description: z.string().min(10, "Description must be at least 10 characters").optional().or(z.literal("")).transform(v => v === "" ? undefined : v),
  heightLimit: z.string().optional().nullable(),
  securityFeatures: z.array(z.string()).default([]),
  pricePerDay: z.number().min(0.01, "Price must be greater than 0"),
  originalPrice: z.number().min(0.01, "Original price must be greater than 0").optional().nullable(),
  totalSpots: z.number().int().min(1, "Must have at least 1 spot"),
  amenities: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]), // Made optional until image upload is implemented
  shuttle: z.boolean().default(false),
  covered: z.boolean().default(false),
  selfPark: z.boolean().default(true),
  valet: z.boolean().default(false),
  open24Hours: z.boolean().default(false),
  cancellationPolicy: z.enum(["free", "moderate", "strict"]).default("free"),
  cancellationDeadline: z.string().default("24"),
});

// Admin review moderation validations
export const reviewModerationSchema = z.object({
  action: z.enum(["approve", "reject", "flag"]),
  moderatorNotes: z.string().optional(),
  flagReason: z.string().optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ReservationModifyInput = z.infer<typeof reservationModifySchema>;
export type OwnerLocationInput = z.infer<typeof ownerLocationSchema>;
export type OwnerProfileInput = z.infer<typeof ownerProfileSchema>;
export type ReviewModerationInput = z.infer<typeof reviewModerationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

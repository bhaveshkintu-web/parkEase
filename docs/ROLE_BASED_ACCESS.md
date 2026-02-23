# Role-Based Access Control - Complete Guide

## Overview
ParkZipply supports 5 user roles with distinct interfaces and permissions, matching Way.com functionality:

1. **CUSTOMER** - Book parking, manage reservations
2. **OWNER** - Manage parking locations, view earnings
3. **WATCHMAN** - Check-in/out vehicles, manage shifts
4. **ADMIN** - Full system access, approve owners, moderate content
5. **SUPPORT** - Customer support, handle disputes

---

## Role Routing Matrix

| Role | Login Redirect | Dashboard Path | Access Level |
|------|---------------|----------------|--------------|
| **CUSTOMER** | `/account` | Customer account dashboard | Own bookings only |
| **OWNER** | `/owner` | Owner dashboard | Own locations only |
| **WATCHMAN** | `/watchman` | Watchman dashboard | Assigned locations |
| **ADMIN** | `/admin` | Admin dashboard | Full system access |
| **SUPPORT** | `/admin` | Admin dashboard (support view) | Read-only + disputes |

---

## 1. CUSTOMER Role

### Dashboard: `/account`
**Features:**
- View upcoming & past reservations
- Manage saved vehicles
- Manage payment methods
- Update profile & security settings
- View booking history

**Key Pages:**
- `/account` - Dashboard overview
- `/account/reservations` - All bookings
- `/account/vehicles` - Saved vehicles
- `/account/payments` - Payment methods
- `/account/profile` - Profile settings
- `/account/security` - Security settings

**Permissions:**
- ✅ Search & book parking
- ✅ Modify own reservations
- ✅ Request refunds
- ✅ Leave reviews
- ❌ Cannot access owner/admin areas

---

## 2. OWNER Role

### Dashboard: `/owner`
**Features:**
- Manage parking locations
- View earnings & analytics
- Manage watchmen staff
- Handle bookings for locations
- Wallet & withdrawal management
- Respond to reviews

**Key Pages:**
- `/owner` - Dashboard with stats
- `/owner/profile` - Business profile (required first)
- `/owner/locations` - All locations
- `/owner/locations/new` - Add new location
- `/owner/bookings` - Location bookings
- `/owner/earnings` - Revenue analytics
- `/owner/wallet` - Wallet & withdrawals
- `/owner/watchmen` - Staff management
- `/owner/reviews` - Customer reviews

**Onboarding Flow:**
1. Login → Redirected to `/owner/profile` (if no profile)
2. Complete business information
3. Profile status: `pending` (awaiting admin approval)
4. In development: Can add locations immediately
5. In production: Must wait for admin approval

**Permissions:**
- ✅ Create/edit own locations
- ✅ View own bookings & earnings
- ✅ Manage own watchmen
- ✅ Respond to reviews
- ❌ Cannot access other owners' data
- ❌ Cannot access admin functions

---

## 3. WATCHMAN Role

### Dashboard: `/watchman`
**Features:**
- Check-in/out vehicles
- View assigned parking locations
- Manage shift schedules
- Report incidents
- View today's bookings

**Key Pages:**
- `/watchman` - Dashboard with today's activity
- `/watchman/check-in` - Vehicle check-in
- `/watchman/check-out` - Vehicle check-out
- `/watchman/sessions` - Active parking sessions
- `/watchman/schedule` - Shift schedule

**Permissions:**
- ✅ Check-in/out vehicles at assigned locations
- ✅ View bookings for assigned locations
- ✅ Report incidents
- ✅ Manage own shifts
- ❌ Cannot access other locations
- ❌ Cannot modify bookings

---

## 4. ADMIN Role

### Dashboard: `/admin`
**Features:**
- Full system oversight
- Owner approval workflow
- Location management
- User management
- Content moderation
- Analytics & reporting
- Commission & pricing rules

**Key Pages:**
- `/admin` - System analytics dashboard
- `/admin/owners` - Owner management & approval
- `/admin/locations` - All parking locations
- `/admin/users` - User management
- `/admin/reviews` - Review moderation
- `/admin/disputes` - Dispute resolution
- `/admin/refunds` - Refund requests
- `/admin/approvals` - Pending approvals
- `/admin/analytics` - System analytics
- `/admin/commissions` - Commission rules
- `/admin/pricing` - Pricing rules
- `/admin/promotions` - Promo codes
- `/admin/content` - CMS pages

**Key Workflows:**

**Owner Approval:**
```
1. View pending owners: GET /api/admin/owners?status=pending
2. Review business details & documents
3. Approve: PATCH /api/admin/owners/{id}/approve
   Body: { "action": "approve" }
4. Owner can now add locations
```

**Location Management:**
- View all locations across all owners
- Activate/deactivate locations
- Edit location details
- View location analytics

**Permissions:**
- ✅ Full access to all data
- ✅ Approve/reject owners
- ✅ Moderate reviews
- ✅ Handle disputes
- ✅ Manage system settings
- ✅ Can impersonate other roles for testing

---

## 5. SUPPORT Role

### Dashboard: `/admin` (Support View)
**Features:**
- Customer support interface
- View user bookings
- Handle disputes
- Process refunds
- View user profiles (read-only)

**Key Pages:**
- `/admin/disputes` - Active disputes
- `/admin/refunds` - Refund requests
- `/admin/users` - User lookup (read-only)

**Permissions:**
- ✅ View all user data (read-only)
- ✅ Handle disputes
- ✅ Process refunds
- ✅ View bookings
- ❌ Cannot modify locations
- ❌ Cannot approve owners
- ❌ Cannot change system settings

---

## Testing Each Role

### Setup Test Users

**Option 1: Using Prisma Studio (http://localhost:5555)**
1. Open `User` table
2. Create/edit user
3. Set `role` field to desired role (CUSTOMER, OWNER, WATCHMAN, ADMIN, SUPPORT)
4. Set `emailVerified` to `true`

**Option 2: Using SQL**
```sql
-- Create test users for each role
INSERT INTO "User" (id, email, "firstName", "lastName", password, role, "emailVerified")
VALUES 
  ('user_customer', 'customer@test.com', 'Test', 'Customer', '$2a$10$...', 'CUSTOMER', true),
  ('user_owner', 'owner@test.com', 'Test', 'Owner', '$2a$10$...', 'OWNER', true),
  ('user_watchman', 'watchman@test.com', 'Test', 'Watchman', '$2a$10$...', 'WATCHMAN', true),
  ('user_admin', 'admin@test.com', 'Test', 'Admin', '$2a$10$...', 'ADMIN', true),
  ('user_support', 'support@test.com', 'Test', 'Support', '$2a$10$...', 'SUPPORT', true);
```

### Test Scenarios

#### Test 1: CUSTOMER Login
```
1. Login as customer@test.com
2. Should redirect to: /account
3. Verify: Can see reservations, vehicles, payments
4. Try accessing: /owner → Should redirect to /account
5. Try accessing: /admin → Should redirect to /account
```

#### Test 2: OWNER Login
```
1. Login as owner@test.com
2. Should redirect to: /owner/profile (first time) or /owner
3. Complete profile if needed
4. Verify: Can see locations, earnings, wallet
5. Try adding a location
6. Try accessing: /admin → Should redirect to /owner
```

#### Test 3: WATCHMAN Login
```
1. Login as watchman@test.com
2. Should redirect to: /watchman
3. Verify: Can see assigned locations, today's bookings
4. Try check-in flow
5. Try accessing: /owner → Should redirect to /watchman
6. Try accessing: /admin → Should redirect to /watchman
```

#### Test 4: ADMIN Login
```
1. Login as admin@test.com
2. Should redirect to: /admin
3. Verify: Can see all system data
4. Test owner approval workflow
5. Test location management
6. Verify: Can access /owner and /watchman (admin override)
```

#### Test 5: SUPPORT Login
```
1. Login as support@test.com
2. Should redirect to: /admin
3. Verify: Can see disputes, refunds
4. Verify: Cannot modify locations or approve owners
```

---

## Current Implementation Status

### ✅ Fully Implemented
- [x] CUSTOMER role & dashboard
- [x] OWNER role & dashboard
- [x] ADMIN role & dashboard
- [x] Role-based routing (all roles)
- [x] Owner profile creation
- [x] Location creation (owners)
- [x] Admin owner approval APIs

### 🔄 Partially Implemented
- [~] WATCHMAN dashboard (UI exists, needs API integration)
- [~] SUPPORT role (uses admin dashboard, needs permission restrictions)

### 📝 Using Mock Data
- Wallet & transactions (owner)
- Watchmen management (owner)
- Check-in/out functionality (watchman)
- Some analytics

---

## API Endpoints by Role

### Customer APIs
- `GET /api/user/profile` - Get profile
- `POST /api/user/profile` - Update profile
- `GET /api/bookings` - Get bookings
- `POST /api/bookings` - Create booking

### Owner APIs
- `GET /api/owner/profile` - Get owner profile
- `POST /api/owner/profile` - Create/update profile
- `GET /api/owner/locations` - Get locations
- `POST /api/owner/locations` - Create location

### Admin APIs
- `GET /api/admin/owners` - List all owners
- `PATCH /api/admin/owners/{id}/approve` - Approve owner
- `GET /api/admin/locations` - All locations
- `GET /api/admin/users` - All users

---

## Database Role Values

**Important:** Roles in database are UPPERCASE:
```typescript
enum UserRole {
  CUSTOMER  // Default
  OWNER
  WATCHMAN
  ADMIN
  SUPPORT
}
```

All role checks in code are case-insensitive to handle both formats.

---

## Quick Reference

**Change User Role:**
```sql
UPDATE "User" 
SET role = 'ADMIN' 
WHERE email = 'your@email.com';
```

**Check Current Role:**
```sql
SELECT email, role, "emailVerified" 
FROM "User" 
WHERE email = 'your@email.com';
```

**Approve Owner Profile:**
```sql
UPDATE "OwnerProfile"
SET status = 'approved', "verificationStatus" = 'verified'
WHERE "userId" = 'user_id';
```

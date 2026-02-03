# Owner Approval & Testing Guide

## Quick Start - Approve Your Owner Profile

### Option 1: Using SQL (Fastest for Testing)

1. **Find your owner profile ID:**
   ```sql
   SELECT id, "userId", "businessName", status, "verificationStatus" 
   FROM "OwnerProfile" 
   WHERE "userId" = 'YOUR_USER_ID';
   ```

2. **Approve the profile:**
   ```sql
   UPDATE "OwnerProfile"
   SET 
     status = 'approved',
     "verificationStatus" = 'verified'
   WHERE id = 'YOUR_OWNER_PROFILE_ID';
   ```

### Option 2: Using Admin API

```bash
# Get all pending owners
curl http://localhost:3000/api/admin/owners?status=pending

# Approve an owner
curl -X PATCH http://localhost:3000/api/admin/owners/OWNER_ID/approve \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}'
```

### Option 3: Development Mode (Auto-Allowed)

In development mode (`NODE_ENV !== "production"`), you can add locations even with a pending profile. The system will show a warning but allow the operation.

---

## Complete Testing Flow (Way.com Style)

### 1. **Owner Registration & Profile Creation**

**Test Steps:**
- [ ] Register as a new user
- [ ] User role should be set to `OWNER` in database
- [ ] Login with owner credentials
- [ ] Verify redirect to `/owner/profile` (first-time setup)
- [ ] Fill out business information form
- [ ] Submit and verify profile created in database with `status: 'pending'`

**Expected Database State:**
```sql
SELECT * FROM "User" WHERE email = 'owner@test.com';
-- role: OWNER, emailVerified: true

SELECT * FROM "OwnerProfile" WHERE "userId" = 'user_id';
-- status: pending, verificationStatus: unverified
```

---

### 2. **Admin Approval Process**

**Test Steps:**
- [ ] Login as admin
- [ ] Navigate to `/admin/owners` (or use API)
- [ ] View pending owner profiles
- [ ] Approve the owner profile
- [ ] Verify status changed to `approved` and `verified`

**API Test:**
```bash
# List pending owners
GET /api/admin/owners?status=pending

# Approve owner
PATCH /api/admin/owners/{id}/approve
Body: { "action": "approve" }
```

---

### 3. **Add Parking Location**

**Test Steps:**
- [ ] Login as approved owner
- [ ] Navigate to `/owner/locations/new`
- [ ] Fill out location form (4 steps):
  - Step 1: Location details (name, address, airport)
  - Step 2: Pricing & capacity
  - Step 3: Services & amenities
  - Step 4: Review & submit
- [ ] Submit form
- [ ] Verify success toast message
- [ ] Verify redirect to `/owner/locations`

**Expected Database State:**
```sql
SELECT * FROM "ParkingLocation" WHERE "ownerId" = 'owner_profile_id';
-- Should have new location with all details

SELECT * FROM "LocationAnalytics" WHERE "locationId" = 'location_id';
-- Should have analytics record initialized
```

---

### 4. **View Owner Dashboard**

**Test Steps:**
- [ ] Navigate to `/owner` dashboard
- [ ] Verify real location data is displayed (not mock data)
- [ ] Check stats are calculated correctly:
  - Total locations count
  - Active locations
  - Total spots
  - Occupancy rate
- [ ] Verify wallet shows (mock data for now)
- [ ] Verify watchmen section (mock data for now)

---

### 5. **Role-Based Access Control**

**Test Steps:**
- [ ] Login as CUSTOMER
- [ ] Try to access `/owner` → Should redirect to `/account`
- [ ] Login as OWNER
- [ ] Access `/owner` → Should work
- [ ] Access `/admin` → Should redirect to `/owner`
- [ ] Login as ADMIN
- [ ] Access `/owner` → Should work
- [ ] Access `/admin` → Should work

---

## Database Verification Queries

```sql
-- Check user and role
SELECT id, email, "firstName", "lastName", role, status 
FROM "User" 
WHERE email = 'your@email.com';

-- Check owner profile
SELECT * FROM "OwnerProfile" WHERE "userId" = 'user_id';

-- Check locations
SELECT l.id, l.name, l.city, l.status, l."ownerId", l."totalSpots"
FROM "ParkingLocation" l
WHERE l."ownerId" = 'owner_profile_id';

-- Check analytics
SELECT * FROM "LocationAnalytics" WHERE "locationId" = 'location_id';

-- Check wallet
SELECT * FROM "Wallet" WHERE "ownerId" = 'owner_profile_id';
```

---

## Common Issues & Solutions

### Issue: "Owner profile not found"
**Solution:** Create profile at `/owner/profile` first

### Issue: "Owner profile is pending approval"
**Solution:** 
- Development: Should auto-allow
- Production: Run SQL to approve or use admin API

### Issue: Location not showing on dashboard
**Solution:** 
- Check `initializeForOwner()` is being called
- Verify API returns locations
- Check browser console for errors

### Issue: Redirect loop
**Solution:**
- Clear browser cache
- Check `hasProfile` state in owner layout
- Verify `/api/owner/profile` returns 200 or 404 correctly

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Ensure admin approval workflow is in place
- [ ] Test email notifications for profile approval
- [ ] Verify all role-based redirects work
- [ ] Test with multiple owner accounts
- [ ] Verify location creation requires approved profile
- [ ] Test location editing and deletion
- [ ] Verify analytics are tracking correctly

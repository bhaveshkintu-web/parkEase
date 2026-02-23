-- ============================================
-- ParkZipply Role Testing - Quick SQL Scripts
-- ============================================

-- 1. VIEW ALL USERS AND THEIR ROLES
-- ============================================
SELECT 
  id,
  email,
  "firstName",
  "lastName",
  role,
  "emailVerified",
  "createdAt"
FROM "User"
ORDER BY "createdAt" DESC;


-- 2. CHANGE USER ROLE
-- ============================================
-- Replace 'your@email.com' with actual email

-- Make user a CUSTOMER
UPDATE "User" 
SET role = 'CUSTOMER' 
WHERE email = 'your@email.com';

-- Make user an OWNER
UPDATE "User" 
SET role = 'OWNER' 
WHERE email = 'your@email.com';

-- Make user a WATCHMAN
UPDATE "User" 
SET role = 'WATCHMAN' 
WHERE email = 'your@email.com';

-- Make user an ADMIN
UPDATE "User" 
SET role = 'ADMIN' 
WHERE email = 'your@email.com';

-- Make user SUPPORT
UPDATE "User" 
SET role = 'SUPPORT' 
WHERE email = 'your@email.com';


-- 3. CREATE TEST USERS FOR EACH ROLE
-- ============================================
-- Note: You'll need to hash passwords properly
-- For testing, use the registration form to create users, then update roles

-- After creating users via registration, update their roles:
UPDATE "User" SET role = 'CUSTOMER' WHERE email = 'customer@test.com';
UPDATE "User" SET role = 'OWNER' WHERE email = 'owner@test.com';
UPDATE "User" SET role = 'WATCHMAN' WHERE email = 'watchman@test.com';
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@test.com';
UPDATE "User" SET role = 'SUPPORT' WHERE email = 'support@test.com';


-- 4. VERIFY EMAIL FOR TEST USERS
-- ============================================
UPDATE "User" 
SET "emailVerified" = true 
WHERE email IN (
  'customer@test.com',
  'owner@test.com', 
  'watchman@test.com',
  'admin@test.com',
  'support@test.com'
);


-- 5. OWNER PROFILE MANAGEMENT
-- ============================================

-- Check if user has owner profile
SELECT 
  u.email,
  u.role,
  op.id as "profileId",
  op."businessName",
  op.status,
  op."verificationStatus"
FROM "User" u
LEFT JOIN "OwnerProfile" op ON u.id = op."userId"
WHERE u.role = 'OWNER';

-- Approve owner profile
UPDATE "OwnerProfile"
SET 
  status = 'approved',
  "verificationStatus" = 'verified'
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'owner@test.com');

-- Create wallet for owner (if not exists)
INSERT INTO "Wallet" ("ownerId", balance, currency)
SELECT op.id, 0, 'USD'
FROM "OwnerProfile" op
WHERE op."userId" = (SELECT id FROM "User" WHERE email = 'owner@test.com')
AND NOT EXISTS (
  SELECT 1 FROM "Wallet" WHERE "ownerId" = op.id
);


-- 6. VIEW OWNER LOCATIONS
-- ============================================
SELECT 
  l.id,
  l.name,
  l.city,
  l.status,
  l."totalSpots",
  l."pricePerDay",
  op."businessName" as "ownerName"
FROM "ParkingLocation" l
JOIN "OwnerProfile" op ON l."ownerId" = op.id
ORDER BY l."createdAt" DESC;


-- 7. ROLE-BASED ROUTING TEST QUERIES
-- ============================================

-- Get user info for login testing
SELECT 
  email,
  role,
  "emailVerified",
  CASE 
    WHEN role = 'CUSTOMER' THEN '/account'
    WHEN role = 'OWNER' THEN '/owner'
    WHEN role = 'WATCHMAN' THEN '/watchman'
    WHEN role = 'ADMIN' THEN '/admin'
    WHEN role = 'SUPPORT' THEN '/admin'
    ELSE '/account'
  END as "expectedRedirect"
FROM "User"
WHERE email = 'your@email.com';


-- 8. CLEANUP TEST DATA
-- ============================================
-- Use with caution! This will delete test users

-- Delete specific test user
DELETE FROM "User" WHERE email = 'test@example.com';

-- Delete all test users (be careful!)
-- DELETE FROM "User" WHERE email LIKE '%@test.com';


-- 9. QUICK ROLE SWITCH FOR TESTING
-- ============================================
-- Useful for testing different roles with same account

-- Switch to CUSTOMER
UPDATE "User" SET role = 'CUSTOMER' WHERE email = 'your@email.com';

-- Switch to OWNER (ensure profile exists)
UPDATE "User" SET role = 'OWNER' WHERE email = 'your@email.com';

-- Switch to ADMIN
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your@email.com';

-- Switch to WATCHMAN
UPDATE "User" SET role = 'WATCHMAN' WHERE email = 'your@email.com';


-- 10. VERIFY ROLE-BASED DATA ACCESS
-- ============================================

-- Check what an owner can see
SELECT 
  l.name,
  l.city,
  l.status,
  COUNT(DISTINCT b.id) as "totalBookings"
FROM "ParkingLocation" l
LEFT JOIN "Booking" b ON l.id = b."locationId"
WHERE l."ownerId" = (
  SELECT id FROM "OwnerProfile" 
  WHERE "userId" = (SELECT id FROM "User" WHERE email = 'owner@test.com')
)
GROUP BY l.id, l.name, l.city, l.status;

-- Check what admin can see (everything)
SELECT 
  COUNT(*) as "totalUsers",
  COUNT(CASE WHEN role = 'CUSTOMER' THEN 1 END) as "customers",
  COUNT(CASE WHEN role = 'OWNER' THEN 1 END) as "owners",
  COUNT(CASE WHEN role = 'WATCHMAN' THEN 1 END) as "watchmen",
  COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as "admins"
FROM "User";

-- Quick script to approve an owner profile for testing
-- Replace 'YOUR_OWNER_PROFILE_ID' with the actual ID from your database

UPDATE "OwnerProfile"
SET 
  status = 'approved',
  "verificationStatus" = 'verified'
WHERE id = 'YOUR_OWNER_PROFILE_ID';

-- To find your owner profile ID, run:
-- SELECT id, "userId", "businessName", status, "verificationStatus" FROM "OwnerProfile";

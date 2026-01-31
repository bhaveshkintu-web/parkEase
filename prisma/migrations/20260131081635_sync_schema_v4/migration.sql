/*
  Warnings:

  - Added the required column `updatedAt` to the `CommissionRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PricingRule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Promotion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Promotion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ParkingStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "CommissionRule" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "maxCommission" DOUBLE PRECISION,
ADD COLUMN     "minBookingValue" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ParkingLocation" ADD COLUMN     "cancellationPolicy" JSONB,
ADD COLUMN     "redeemSteps" JSONB,
ADD COLUMN     "shuttleInfo" JSONB,
ADD COLUMN     "specialInstructions" TEXT[],
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PricingRule" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "daysOfWeek" INTEGER[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "maxDiscount" DOUBLE PRECISION,
ADD COLUMN     "minBookingValue" DOUBLE PRECISION,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

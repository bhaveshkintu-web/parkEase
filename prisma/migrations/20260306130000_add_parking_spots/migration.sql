-- CreateEnum
CREATE TYPE "SpotStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "spotId" TEXT,
ADD COLUMN     "spotIdentifier" TEXT;

-- CreateTable
CREATE TABLE "ParkingSpot" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "status" "SpotStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingSpot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParkingSpot_locationId_idx" ON "ParkingSpot"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingSpot_locationId_identifier_key" ON "ParkingSpot"("locationId", "identifier");

-- AddForeignKey
ALTER TABLE "ParkingSpot" ADD CONSTRAINT "ParkingSpot_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ParkingLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "ParkingSpot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

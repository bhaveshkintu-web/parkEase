-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'OVERSTAY';
ALTER TYPE "BookingStatus" ADD VALUE 'WAITING_OVERSTAY_PAYMENT';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SESSION_EXPIRY_WARNING';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "extensionPaymentId" TEXT,
ADD COLUMN     "overstayPaymentId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "type" TEXT;
-- AlterTable
ALTER TABLE "ParkingSession" ADD COLUMN "actualCheckInTime" TIMESTAMP(3),
ADD COLUMN "actualCheckOutTime" TIMESTAMP(3),
ADD COLUMN "overstayMinutes" INTEGER,
ADD COLUMN "overstayCharge" DOUBLE PRECISION,
ADD COLUMN "paymentStatus" TEXT,
ADD COLUMN "expiryWarningSentAt" TIMESTAMP(3);

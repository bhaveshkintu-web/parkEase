-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'EXPIRED';

-- CreateTable
CREATE TABLE "UserSession" (
    "phone" VARCHAR(20) NOT NULL,
    "state" VARCHAR(50) NOT NULL DEFAULT 'idle',
    "data" JSONB DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("phone")
);

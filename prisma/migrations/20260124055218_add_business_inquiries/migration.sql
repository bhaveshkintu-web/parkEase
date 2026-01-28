-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('AUTO_REPAIR', 'BANKING', 'CAR_WASH', 'INSURANCE', 'PARKING', 'OTHER');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'IN_PROGRESS', 'QUALIFIED', 'CONVERTED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "BusinessInquiry" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "businessType" "BusinessType" NOT NULL,
    "message" TEXT,
    "source" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "assignedTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessInquiry_status_createdAt_idx" ON "BusinessInquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessInquiry_email_idx" ON "BusinessInquiry"("email");

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('OWNER', 'SYSTEM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletTransactionType" ADD VALUE 'DEPOSITED';
ALTER TYPE "WalletTransactionType" ADD VALUE 'EARNED';

-- AlterTable (Wallet)
ALTER TABLE "Wallet" ADD COLUMN "type" "WalletType" NOT NULL DEFAULT 'OWNER',
ADD COLUMN "totalBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "accountName" TEXT,
ADD COLUMN "accountNumber" TEXT,
ADD COLUMN "bankName" TEXT,
ADD COLUMN "routingNumber" TEXT,
ALTER COLUMN "ownerId" DROP NOT NULL;


-- CreateIndex
CREATE INDEX "Wallet_type_idx" ON "Wallet"("type");


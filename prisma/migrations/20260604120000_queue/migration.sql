-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('NEW', 'MAKING', 'READY', 'SERVED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "queueNo" TEXT,
ADD COLUMN     "queueDate" TEXT,
ADD COLUMN     "queueStatus" "QueueStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "queueStartedAt" TIMESTAMP(3),
ADD COLUMN     "queueReadyAt" TIMESTAMP(3),
ADD COLUMN     "queueServedAt" TIMESTAMP(3),
ADD COLUMN     "cancelReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_queueDate_queueNo_key" ON "Sale"("queueDate", "queueNo");

-- CreateIndex
CREATE INDEX "Sale_queueDate_queueStatus_idx" ON "Sale"("queueDate", "queueStatus");

-- CreateEnum
CREATE TYPE "SharedOrderStatus" AS ENUM ('OPEN', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SharedOrderItem" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT,
    "vendorPartNumber" TEXT,
    "unitSize" TEXT,
    "categoryName" TEXT,
    "quantity" INTEGER NOT NULL,
    "estimatedUnitPriceCents" INTEGER,
    "notes" TEXT,
    "status" "SharedOrderStatus" NOT NULL DEFAULT 'OPEN',
    "requestedByTenant" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "requestedByUserName" TEXT NOT NULL,
    "orderedAt" TIMESTAMP(3),
    "orderedByTenant" TEXT,
    "orderedByUserId" TEXT,
    "orderedByUserName" TEXT,
    "receivedAt" TIMESTAMP(3),
    "receivedByTenant" TEXT,
    "receivedByUserId" TEXT,
    "receivedByUserName" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByTenant" TEXT,
    "cancelledByUserId" TEXT,
    "cancelledByUserName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedOrderItem_status_createdAt_idx" ON "SharedOrderItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SharedOrderItem_requestedByTenant_status_idx" ON "SharedOrderItem"("requestedByTenant", "status");

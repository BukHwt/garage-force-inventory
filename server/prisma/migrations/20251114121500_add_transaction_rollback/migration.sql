-- AlterTable
ALTER TABLE "InventoryTransaction"
ADD COLUMN "isReverted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "revertedAt" TIMESTAMP(3),
ADD COLUMN "revertedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "InventoryTransaction_isReverted_idx" ON "InventoryTransaction"("isReverted");

-- AddForeignKey
ALTER TABLE "InventoryTransaction"
ADD CONSTRAINT "InventoryTransaction_revertedByUserId_fkey" FOREIGN KEY ("revertedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

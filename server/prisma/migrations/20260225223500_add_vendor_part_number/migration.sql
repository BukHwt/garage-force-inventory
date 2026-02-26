-- AlterTable
ALTER TABLE "Product" ADD COLUMN "vendorPartNumber" TEXT;

-- CreateIndex
CREATE INDEX "Product_vendorPartNumber_idx" ON "Product"("vendorPartNumber");

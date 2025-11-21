-- CreateEnum
CREATE TYPE "ProductConsumableType" AS ENUM ('REUSABLE', 'SINGLE_USE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "consumableType" "ProductConsumableType" NOT NULL DEFAULT 'REUSABLE';

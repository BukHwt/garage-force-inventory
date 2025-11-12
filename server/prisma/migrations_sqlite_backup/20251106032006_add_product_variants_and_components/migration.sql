-- CreateTable
CREATE TABLE "ProductComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kitProductId" TEXT NOT NULL,
    "componentProductId" TEXT NOT NULL,
    "quantityRequired" INTEGER NOT NULL DEFAULT 1,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "componentLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductComponent_kitProductId_fkey" FOREIGN KEY ("kitProductId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductComponent_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "color" TEXT,
    "unitSize" TEXT,
    "manufacturer" TEXT,
    "categoryId" TEXT,
    "imageUrl" TEXT,
    "notes" TEXT,
    "productType" TEXT NOT NULL DEFAULT 'simple',
    "parentProductId" TEXT,
    "reorderPoint" INTEGER,
    "maxStockLevel" INTEGER,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "supplierType" TEXT NOT NULL DEFAULT 'OPEN_SOURCE',
    "averageUsagePerJob" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_parentProductId_fkey" FOREIGN KEY ("parentProductId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("averageUsagePerJob", "categoryId", "color", "createdAt", "description", "id", "imageUrl", "leadTimeDays", "manufacturer", "maxStockLevel", "name", "notes", "reorderPoint", "sku", "supplierType", "unitSize", "updatedAt") SELECT "averageUsagePerJob", "categoryId", "color", "createdAt", "description", "id", "imageUrl", "leadTimeDays", "manufacturer", "maxStockLevel", "name", "notes", "reorderPoint", "sku", "supplierType", "unitSize", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ProductComponent_kitProductId_idx" ON "ProductComponent"("kitProductId");

-- CreateIndex
CREATE INDEX "ProductComponent_componentProductId_idx" ON "ProductComponent"("componentProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductComponent_kitProductId_componentProductId_key" ON "ProductComponent"("kitProductId", "componentProductId");

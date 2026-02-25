import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

type Report = {
  mapped: Array<{
    mainName: string;
    canonicalSku: string;
    canonicalName: string;
    unitSize?: string;
    category: string;
    confidence: string;
  }>;
  needsReview: Array<any>;
  unmappedCanonical: Array<{
    category: string;
    sku: string;
    name: string;
    unitSize?: string;
  }>;
  mainOnly: Array<any>;
  renameOnly?: Array<{ mainName: string; newName: string; found: boolean }>;
};

const mainUrl = process.env.DATABASE_URL_MAIN || process.env.DATABASE_URL;
if (!mainUrl) {
  throw new Error('DATABASE_URL (or DATABASE_URL_MAIN) must be set for main tenant');
}

const prisma = new PrismaClient({ datasources: { db: { url: mainUrl } } });
const reportPath = path.resolve(process.cwd(), 'scripts', 'report-main-vs-adam.json');
const renamePath = path.resolve(process.cwd(), 'scripts', 'rename.overrides.json');

function loadReport(): Report {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Report not found at ${reportPath}. Run npm run report:main-vs-adam first.`);
  }
  return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
}

function loadRenames(): Record<string, string> {
  if (!fs.existsSync(renamePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(renamePath, 'utf-8'));
  } catch (err) {
    console.warn('Failed to parse rename overrides, continuing without renames', err);
    return {};
  }
}

async function ensureCategory(name: string) {
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.category.create({ data: { name } });
  return created.id;
}

async function applyMapped(report: Report) {
  for (const item of report.mapped) {
    // Fix miscategorized hybrid chips: only keep Hybrid when name contains hybrid; otherwise treat as 1/4" Chips
    const nameLower = item.canonicalName.toLowerCase();
    let categoryName = item.category;
    if (categoryName.toLowerCase().includes('hybrid') && !nameLower.includes('hybrid')) {
      categoryName = '1/4" Chips';
    }

    const categoryId = await ensureCategory(categoryName);
    const matchesByName = await prisma.product.findMany({
      where: { name: item.mainName },
    });
    const existingBySku = await prisma.product.findUnique({ where: { sku: item.canonicalSku } });

    if (existingBySku) {
      // Update the canonical SKU product
      await prisma.product.update({
        where: { id: existingBySku.id },
        data: {
          name: item.canonicalName,
          unitSize: item.unitSize || undefined,
          categoryId,
          supplierType: 'GARAGE_FORCE_REQUIRED',
          productType: 'simple',
          consumableType: 'REUSABLE',
          manufacturer: 'Garage Force',
        },
      });
      // Update name matches (excluding the SKU product) without setting SKU to avoid conflicts
      for (const prod of matchesByName) {
        if (prod.id === existingBySku.id) continue;
        await prisma.product.update({
          where: { id: prod.id },
          data: {
            name: item.canonicalName,
            unitSize: item.unitSize || undefined,
            categoryId,
            supplierType: 'GARAGE_FORCE_REQUIRED',
            productType: 'simple',
            consumableType: 'REUSABLE',
            manufacturer: 'Garage Force',
          },
        });
      }
    } else if (matchesByName.length) {
      // Update the first name match with the SKU; others without SKU to avoid conflicts
      const [first, ...rest] = matchesByName;
      await prisma.product.update({
        where: { id: first.id },
        data: {
          sku: item.canonicalSku,
          name: item.canonicalName,
          unitSize: item.unitSize || undefined,
          categoryId,
          supplierType: 'GARAGE_FORCE_REQUIRED',
          productType: 'simple',
          consumableType: 'REUSABLE',
          manufacturer: 'Garage Force',
        },
      });
      for (const prod of rest) {
        await prisma.product.update({
          where: { id: prod.id },
          data: {
            name: item.canonicalName,
            unitSize: item.unitSize || undefined,
            categoryId,
            supplierType: 'GARAGE_FORCE_REQUIRED',
            productType: 'simple',
            consumableType: 'REUSABLE',
            manufacturer: 'Garage Force',
          },
        });
      }
    } else {
      // If not found by name or SKU, upsert by SKU
      await prisma.product.upsert({
        where: { sku: item.canonicalSku },
        update: {
          name: item.canonicalName,
          unitSize: item.unitSize || undefined,
          categoryId,
          supplierType: 'GARAGE_FORCE_REQUIRED',
          productType: 'simple',
          consumableType: 'REUSABLE',
        },
        create: {
          sku: item.canonicalSku,
          name: item.canonicalName,
          unitSize: item.unitSize || undefined,
          categoryId,
          supplierType: 'GARAGE_FORCE_REQUIRED',
          productType: 'simple',
          consumableType: 'REUSABLE',
          manufacturer: 'Garage Force',
        },
      });
    }
  }
}

async function applyRenames(renames: Record<string, string>) {
  for (const [currentName, newName] of Object.entries(renames)) {
    const matches = await prisma.product.findMany({ where: { name: currentName } });
    if (!matches.length) continue;
    for (const prod of matches) {
      await prisma.product.update({ where: { id: prod.id }, data: { name: newName } });
    }
  }
}

async function insertUnmapped(report: Report) {
  for (const item of report.unmappedCanonical) {
    const categoryId = await ensureCategory(item.category);
    await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        unitSize: item.unitSize || undefined,
        categoryId,
        supplierType: 'GARAGE_FORCE_REQUIRED',
        productType: 'simple',
        consumableType: 'REUSABLE',
      },
      create: {
        sku: item.sku,
        name: item.name,
        unitSize: item.unitSize || undefined,
        categoryId,
        supplierType: 'GARAGE_FORCE_REQUIRED',
        productType: 'simple',
        consumableType: 'REUSABLE',
        manufacturer: 'Garage Force',
      },
    });
  }
}

// Merge duplicates by canonical name: move inventory to the canonical product (prefer matching SKU), then delete extras.
async function dedupeByCanonicalName(report: Report) {
  const canonicalNames = new Map<string, string | undefined>();
  for (const item of report.mapped) {
    canonicalNames.set(item.canonicalName, item.canonicalSku);
  }

  for (const [canonicalName, canonicalSku] of canonicalNames) {
    const products = await prisma.product.findMany({
      where: { name: canonicalName },
      select: { id: true, sku: true },
    });
    if (products.length <= 1) continue;

    const keep =
      products.find((p) => p.sku === canonicalSku) ??
      products.find((p) => p.sku) ??
      products[0];

    for (const prod of products) {
      if (prod.id === keep.id) continue;
      // Move inventory items to the canonical product
      await prisma.inventoryItem.updateMany({
        where: { productId: prod.id },
        data: { productId: keep.id },
      });
      // Delete the duplicate product
      await prisma.product.delete({ where: { id: prod.id } });
    }
  }
}

async function main() {
  const report = loadReport();
  const renames = loadRenames();
  console.log(`Applying mapped (${report.mapped.length}) and renames (${Object.keys(renames).length}), inserting ${report.unmappedCanonical.length} unmapped Adam SKUs.`);

  await applyMapped(report);
  await applyRenames(renames);
  await insertUnmapped(report);
   await dedupeByCanonicalName(report);

  console.log('Apply completed.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

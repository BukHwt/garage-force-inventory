import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

type TenantName = 'main' | 'adam';

type ProductSnapshot = {
  id: string;
  sku: string | null;
  name: string;
  category: string | null;
  isTracked: boolean;
  inventoryQuantity: number;
};

type CatalogDiffReport = {
  generatedAt: string;
  mainProducts: number;
  adamProducts: number;
  mainSkus: number;
  adamSkus: number;
  missingInAdam: string[];
  missingInMain: string[];
  categoryMismatches: Array<{
    sku: string;
    mainCategory: string | null;
    adamCategory: string | null;
    mainName: string;
    adamName: string;
  }>;
  nameMismatches: Array<{
    sku: string;
    mainName: string;
    adamName: string;
  }>;
  duplicateSkus: {
    main: Array<{ sku: string; count: number }>;
    adam: Array<{ sku: string; count: number }>;
  };
  noSkuProducts: {
    main: number;
    adam: number;
  };
  allowedDifferences: {
    isTrackedDiffCount: number;
    inventoryQuantityDiffCount: number;
  };
};

const mainUrl = process.env.DATABASE_URL_MAIN || process.env.DATABASE_URL;
const adamUrl = process.env.DATABASE_URL_ADAM;
const args = process.argv.slice(2);
const stdoutOnly = args.includes('--stdout-only');
const detailsOnly = args.includes('--details-only');
const maxItemsArg = args.find((arg) => arg.startsWith('--max-items='));
const maxItems = maxItemsArg ? Number(maxItemsArg.split('=')[1]) : 25;

if (!mainUrl || !adamUrl) {
  throw new Error('Set DATABASE_URL_MAIN (or DATABASE_URL) and DATABASE_URL_ADAM.');
}

const prismaMain = new PrismaClient({ datasources: { db: { url: mainUrl } } });
const prismaAdam = new PrismaClient({ datasources: { db: { url: adamUrl } } });

function normalizeSku(sku: string | null) {
  return sku ? sku.trim().toUpperCase() : null;
}

function normalizeName(name: string) {
  return name.replace(/\s+/g, ' ').trim();
}

function normalizeCategory(category: string | null) {
  return category ? category.replace(/\s+/g, ' ').trim() : null;
}

function getDuplicateSkus(rows: ProductSnapshot[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const sku = normalizeSku(row.sku);
    if (!sku) continue;
    counts.set(sku, (counts.get(sku) || 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([sku, count]) => ({ sku, count }))
    .sort((a, b) => b.count - a.count || a.sku.localeCompare(b.sku));
}

async function loadTenantProducts(prisma: PrismaClient): Promise<ProductSnapshot[]> {
  const rows = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      isTracked: true,
      category: { select: { name: true } },
      inventoryItems: { select: { quantity: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category?.name ?? null,
    isTracked: row.isTracked,
    inventoryQuantity: row.inventoryItems.reduce((sum, item) => sum + item.quantity, 0),
  }));
}

function toSkuMap(rows: ProductSnapshot[], tenant: TenantName) {
  const map = new Map<string, ProductSnapshot>();
  for (const row of rows) {
    const sku = normalizeSku(row.sku);
    if (!sku) continue;
    if (map.has(sku)) {
      console.warn(`[${tenant}] duplicate SKU encountered during map build: ${sku}`);
      continue;
    }
    map.set(sku, row);
  }
  return map;
}

function printSection(title: string, lines: string[]) {
  console.log(`\n=== ${title} ===`);
  if (!lines.length) {
    console.log('None');
    return;
  }
  for (const line of lines) {
    console.log(line);
  }
}

function cappedLines<T>(rows: T[], mapper: (row: T) => string, limit: number) {
  const lines = rows.slice(0, limit).map(mapper);
  if (rows.length > limit) {
    lines.push(`...and ${rows.length - limit} more`);
  }
  return lines;
}

async function main() {
  const [mainProducts, adamProducts] = await Promise.all([
    loadTenantProducts(prismaMain),
    loadTenantProducts(prismaAdam),
  ]);

  const mainSkuMap = toSkuMap(mainProducts, 'main');
  const adamSkuMap = toSkuMap(adamProducts, 'adam');

  const mainSkus = Array.from(mainSkuMap.keys()).sort();
  const adamSkus = Array.from(adamSkuMap.keys()).sort();

  const adamSkuSet = new Set(adamSkus);
  const mainSkuSet = new Set(mainSkus);

  const missingInAdam = mainSkus.filter((sku) => !adamSkuSet.has(sku));
  const missingInMain = adamSkus.filter((sku) => !mainSkuSet.has(sku));

  const sharedSkus = mainSkus.filter((sku) => adamSkuSet.has(sku));
  const categoryMismatches: CatalogDiffReport['categoryMismatches'] = [];
  const nameMismatches: CatalogDiffReport['nameMismatches'] = [];

  let isTrackedDiffCount = 0;
  let inventoryQuantityDiffCount = 0;

  for (const sku of sharedSkus) {
    const mainProduct = mainSkuMap.get(sku)!;
    const adamProduct = adamSkuMap.get(sku)!;

    const mainCategory = normalizeCategory(mainProduct.category);
    const adamCategory = normalizeCategory(adamProduct.category);
    const mainName = normalizeName(mainProduct.name);
    const adamName = normalizeName(adamProduct.name);

    if (mainCategory !== adamCategory) {
      categoryMismatches.push({
        sku,
        mainCategory,
        adamCategory,
        mainName,
        adamName,
      });
    }

    if (mainName !== adamName) {
      nameMismatches.push({
        sku,
        mainName,
        adamName,
      });
    }

    if (mainProduct.isTracked !== adamProduct.isTracked) {
      isTrackedDiffCount += 1;
    }

    if (mainProduct.inventoryQuantity !== adamProduct.inventoryQuantity) {
      inventoryQuantityDiffCount += 1;
    }
  }

  const report: CatalogDiffReport = {
    generatedAt: new Date().toISOString(),
    mainProducts: mainProducts.length,
    adamProducts: adamProducts.length,
    mainSkus: mainSkus.length,
    adamSkus: adamSkus.length,
    missingInAdam,
    missingInMain,
    categoryMismatches: categoryMismatches.sort((a, b) => a.sku.localeCompare(b.sku)),
    nameMismatches: nameMismatches.sort((a, b) => a.sku.localeCompare(b.sku)),
    duplicateSkus: {
      main: getDuplicateSkus(mainProducts),
      adam: getDuplicateSkus(adamProducts),
    },
    noSkuProducts: {
      main: mainProducts.filter((p) => !normalizeSku(p.sku)).length,
      adam: adamProducts.filter((p) => !normalizeSku(p.sku)).length,
    },
    allowedDifferences: {
      isTrackedDiffCount,
      inventoryQuantityDiffCount,
    },
  };

  if (!stdoutOnly) {
    const outPath = path.resolve(process.cwd(), 'scripts', 'report-tenant-catalog-diff.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    if (!detailsOnly) {
      console.log(`Report written to ${outPath}`);
    }
  }

  if (!detailsOnly) {
    console.log(
      [
        `Generated: ${report.generatedAt}`,
        `Main products: ${report.mainProducts} | Adam products: ${report.adamProducts}`,
        `Main SKUs: ${report.mainSkus} | Adam SKUs: ${report.adamSkus}`,
        `Missing in adam: ${report.missingInAdam.length}`,
        `Missing in main: ${report.missingInMain.length}`,
        `Category mismatches: ${report.categoryMismatches.length}`,
        `Name mismatches: ${report.nameMismatches.length}`,
        `Tracked flag differences (allowed): ${report.allowedDifferences.isTrackedDiffCount}`,
        `Inventory quantity differences (allowed): ${report.allowedDifferences.inventoryQuantityDiffCount}`,
        `No-SKU products -> main: ${report.noSkuProducts.main}, adam: ${report.noSkuProducts.adam}`,
      ].join('\n'),
    );
  }

  printSection(
    'Missing In Adam (problem)',
    cappedLines(report.missingInAdam, (sku) => sku, maxItems),
  );
  printSection(
    'Missing In Main (problem)',
    cappedLines(report.missingInMain, (sku) => sku, maxItems),
  );
  printSection(
    'Category Mismatches (problem)',
    cappedLines(
      report.categoryMismatches,
      (row) =>
        `${row.sku} | main="${row.mainCategory ?? 'Uncategorized'}" | adam="${row.adamCategory ?? 'Uncategorized'}" | mainName="${row.mainName}" | adamName="${row.adamName}"`,
      maxItems,
    ),
  );
  printSection(
    'Name Mismatches (review)',
    cappedLines(
      report.nameMismatches,
      (row) => `${row.sku} | main="${row.mainName}" | adam="${row.adamName}"`,
      maxItems,
    ),
  );
  printSection(
    'Duplicate SKUs In Main (problem)',
    cappedLines(report.duplicateSkus.main, (row) => `${row.sku} x${row.count}`, maxItems),
  );
  printSection(
    'Duplicate SKUs In Adam (problem)',
    cappedLines(report.duplicateSkus.adam, (row) => `${row.sku} x${row.count}`, maxItems),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaMain.$disconnect();
    await prismaAdam.$disconnect();
  });

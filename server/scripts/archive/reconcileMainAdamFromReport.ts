import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

type Report = {
  needsReview: Array<{
    mainName: string;
    canonicalSku?: string;
    canonicalName?: string;
  }>;
  mainOnly: Array<{
    id: string;
    name: string;
    category?: string;
  }>;
};

const mainUrl = process.env.DATABASE_URL_MAIN || process.env.DATABASE_URL;
const adamUrl = process.env.DATABASE_URL_ADAM;
const reportPath = path.resolve(process.cwd(), 'scripts', 'report-main-vs-adam.json');
const apply = process.argv.includes('--apply');

if (!mainUrl || !adamUrl) {
  throw new Error('Set DATABASE_URL_MAIN (or DATABASE_URL) and DATABASE_URL_ADAM.');
}

if (!fs.existsSync(reportPath)) {
  throw new Error(`Report not found at ${reportPath}. Run npm run report:main-vs-adam first.`);
}

const prismaMain = new PrismaClient({ datasources: { db: { url: mainUrl } } });
const prismaAdam = new PrismaClient({ datasources: { db: { url: adamUrl } } });

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as Report;

async function ensureCategory(prisma: PrismaClient, name: string) {
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.category.create({ data: { name } });
  return created.id;
}

async function countProducts(prisma: PrismaClient) {
  return prisma.product.count();
}

async function countHybridMismatches(prisma: PrismaClient) {
  return prisma.product.count({
    where: {
      category: { is: { name: { contains: 'hybrid', mode: 'insensitive' } } },
      name: { contains: '1/4"', mode: 'insensitive' },
      NOT: { name: { contains: 'hybrid', mode: 'insensitive' } },
    },
  });
}

async function fixHybridMismatches(prisma: PrismaClient, tenantLabel: string) {
  const chipCategoryId = await ensureCategory(prisma, '1/4" Chips');
  const wrong = await prisma.product.findMany({
    where: {
      category: { is: { name: { contains: 'hybrid', mode: 'insensitive' } } },
      name: { contains: '1/4"', mode: 'insensitive' },
      NOT: { name: { contains: 'hybrid', mode: 'insensitive' } },
    },
    select: { id: true, name: true },
  });

  if (!apply) {
    console.log(`[dry-run] ${tenantLabel}: hybrid miscategorized to fix=${wrong.length}`);
    return wrong.length;
  }

  for (const product of wrong) {
    await prisma.product.update({
      where: { id: product.id },
      data: { categoryId: chipCategoryId },
    });
  }

  console.log(`${tenantLabel}: hybrid miscategorized fixed=${wrong.length}`);
  return wrong.length;
}

async function reconcileMainNeedsReview() {
  let removed = 0;
  let movedInventory = 0;
  let movedTransactions = 0;
  let skippedWithActivity = 0;

  for (const item of report.needsReview) {
    const candidates = await prismaMain.product.findMany({
      where: { name: item.mainName },
      select: { id: true, name: true, sku: true },
    });
    if (!candidates.length) continue;

    const target =
      (item.canonicalSku
        ? await prismaMain.product.findUnique({
            where: { sku: item.canonicalSku },
            select: { id: true },
          })
        : null) ||
      (item.canonicalName
        ? await prismaMain.product.findFirst({
            where: { name: item.canonicalName },
            select: { id: true },
          })
        : null);

    for (const candidate of candidates) {
      if (target && target.id === candidate.id) continue;

      const inventoryCount = await prismaMain.inventoryItem.count({ where: { productId: candidate.id } });
      const txnCount = await prismaMain.inventoryTransaction.count({ where: { productId: candidate.id } });

      if (!apply) {
        if (!target && (inventoryCount > 0 || txnCount > 0)) {
          skippedWithActivity += 1;
          continue;
        }
        removed += 1;
        movedInventory += inventoryCount;
        movedTransactions += txnCount;
        continue;
      }

      if (!target && (inventoryCount > 0 || txnCount > 0)) {
        skippedWithActivity += 1;
        console.warn(
          `main: skipped delete for "${candidate.name}" (${candidate.id}) because no canonical target and activity exists`,
        );
        continue;
      }

      if (target) {
        if (inventoryCount) {
          await prismaMain.inventoryItem.updateMany({
            where: { productId: candidate.id },
            data: { productId: target.id },
          });
        }
        if (txnCount) {
          await prismaMain.inventoryTransaction.updateMany({
            where: { productId: candidate.id },
            data: { productId: target.id },
          });
        }
      }

      await prismaMain.product.delete({ where: { id: candidate.id } });
      removed += 1;
      movedInventory += inventoryCount;
      movedTransactions += txnCount;
    }
  }

  const mode = apply ? '' : '[dry-run] ';
  console.log(
    `${mode}main: needsReview removed=${removed}, inventory moved=${movedInventory}, transactions moved=${movedTransactions}, skippedWithActivity=${skippedWithActivity}`,
  );
  return { removed, movedInventory, movedTransactions, skippedWithActivity };
}

async function addMainOnlyToAdam() {
  const uniqueByName = new Map<string, { id: string; name: string; category?: string }>();
  for (const item of report.mainOnly) {
    uniqueByName.set(item.name.trim().toLowerCase(), item);
  }
  const mainOnlyUnique = Array.from(uniqueByName.values());

  const mainProducts = await prismaMain.product.findMany({
    where: { id: { in: mainOnlyUnique.map((x) => x.id) } },
    select: {
      name: true,
      description: true,
      sku: true,
      color: true,
      unitSize: true,
      manufacturer: true,
      imageUrl: true,
      notes: true,
      productType: true,
      consumableType: true,
      reorderPoint: true,
      maxStockLevel: true,
      leadTimeDays: true,
      supplierType: true,
      averageUsagePerJob: true,
      isTracked: true,
      category: { select: { name: true } },
    },
  });

  const mainByName = new Map(mainProducts.map((p) => [p.name.trim().toLowerCase(), p]));
  let created = 0;
  let existing = 0;

  for (const item of mainOnlyUnique) {
    const source = mainByName.get(item.name.trim().toLowerCase());
    if (!source) continue;

    const found =
      (source.sku
        ? await prismaAdam.product.findUnique({
            where: { sku: source.sku },
            select: { id: true },
          })
        : null) ||
      (await prismaAdam.product.findFirst({
        where: { name: source.name },
        select: { id: true },
      }));

    if (found) {
      existing += 1;
      continue;
    }

    const categoryName = source.category?.name || item.category || 'Uncategorized';
    const categoryId = await ensureCategory(prismaAdam, categoryName);

    if (!apply) {
      created += 1;
      continue;
    }

    await prismaAdam.product.create({
      data: {
        name: source.name,
        description: source.description,
        sku: source.sku || undefined,
        color: source.color,
        unitSize: source.unitSize,
        manufacturer: source.manufacturer,
        imageUrl: source.imageUrl,
        notes: source.notes,
        productType: source.productType,
        consumableType: source.consumableType,
        reorderPoint: source.reorderPoint,
        maxStockLevel: source.maxStockLevel,
        leadTimeDays: source.leadTimeDays,
        supplierType: source.supplierType,
        averageUsagePerJob: source.averageUsagePerJob,
        isTracked: source.isTracked,
        categoryId,
      },
    });
    created += 1;
  }

  const mode = apply ? '' : '[dry-run] ';
  console.log(`${mode}adam: mainOnly unique=${mainOnlyUnique.length}, created=${created}, alreadyExists=${existing}`);
  return { created, existing, uniqueMainOnly: mainOnlyUnique.length };
}

async function run() {
  const beforeMain = await countProducts(prismaMain);
  const beforeAdam = await countProducts(prismaAdam);
  const beforeMainHybrid = await countHybridMismatches(prismaMain);
  const beforeAdamHybrid = await countHybridMismatches(prismaAdam);

  console.log(`Before -> main=${beforeMain}, adam=${beforeAdam}`);
  console.log(`Before hybrid mismatches -> main=${beforeMainHybrid}, adam=${beforeAdamHybrid}`);

  await reconcileMainNeedsReview();
  await addMainOnlyToAdam();
  await fixHybridMismatches(prismaMain, 'main');
  await fixHybridMismatches(prismaAdam, 'adam');

  const afterMain = await countProducts(prismaMain);
  const afterAdam = await countProducts(prismaAdam);
  const afterMainHybrid = await countHybridMismatches(prismaMain);
  const afterAdamHybrid = await countHybridMismatches(prismaAdam);

  const mode = apply ? 'APPLY' : 'DRY RUN';
  console.log(`[${mode}] After -> main=${afterMain}, adam=${afterAdam}`);
  console.log(`[${mode}] After hybrid mismatches -> main=${afterMainHybrid}, adam=${afterAdamHybrid}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaMain.$disconnect();
    await prismaAdam.$disconnect();
  });

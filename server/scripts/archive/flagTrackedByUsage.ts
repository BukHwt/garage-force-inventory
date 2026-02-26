import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const tenantArg = process.argv.find((arg) => arg.startsWith('--tenant='))?.split('=')[1];
const tenant = tenantArg === 'main' || tenantArg === 'adam' ? tenantArg : undefined;

const targetUrl =
  process.env.TARGET_DATABASE_URL ||
  (tenant === 'main'
    ? process.env.DATABASE_URL_MAIN || process.env.DATABASE_URL
    : tenant === 'adam'
      ? process.env.DATABASE_URL_ADAM
      : process.env.DATABASE_URL_MAIN || process.env.DATABASE_URL || process.env.DATABASE_URL_ADAM);

if (!targetUrl) {
  throw new Error('Set TARGET_DATABASE_URL (or DATABASE_URL_MAIN/DATABASE_URL/DATABASE_URL_ADAM)');
}

const resolvedTargetUrl: string = targetUrl;
const prisma = new PrismaClient({ datasources: { db: { url: resolvedTargetUrl } } });

async function run() {
  const dbHost = new URL(resolvedTargetUrl).host;
  const beforeTracked = await prisma.product.count({ where: { isTracked: true } });
  console.log(`Target tenant=${tenant ?? 'auto'} host=${dbHost} tracked(before)=${beforeTracked}`);

  // Reset all to false
  const reset = await prisma.product.updateMany({ data: { isTracked: false } });

  // IDs with reorderPoint set
  const reorder = await prisma.product.findMany({
    where: { NOT: { reorderPoint: null } },
    select: { id: true },
  });

  // IDs with inventory > 0
  const withInventory = await prisma.$queryRaw<
    Array<{ productId: string }>
  >`SELECT "productId" FROM "InventoryItem" GROUP BY "productId" HAVING SUM(quantity) > 0`;

  const ids = new Set<string>();
  reorder.forEach((r) => ids.add(r.id));
  withInventory.forEach((r) => ids.add(r.productId));

  const updated = await prisma.product.updateMany({
    where: { id: { in: Array.from(ids) } },
    data: { isTracked: true },
  });

  const afterTracked = await prisma.product.count({ where: { isTracked: true } });
  console.log(`Reset to false: ${reset.count}, set tracked true: ${updated.count}, tracked(after)=${afterTracked}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

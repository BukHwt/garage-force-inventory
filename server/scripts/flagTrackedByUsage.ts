import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const targetUrl =
  process.env.TARGET_DATABASE_URL ||
  process.env.DATABASE_URL_MAIN ||
  process.env.DATABASE_URL ||
  process.env.DATABASE_URL_ADAM;

if (!targetUrl) {
  throw new Error('Set TARGET_DATABASE_URL (or DATABASE_URL_MAIN/DATABASE_URL/DATABASE_URL_ADAM)');
}

const prisma = new PrismaClient({ datasources: { db: { url: targetUrl } } });

async function run() {
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

  console.log(`Reset to false: ${reset.count}, set tracked true: ${updated.count}`);
}

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const mainUrl = process.env.DATABASE_URL_MAIN || process.env.DATABASE_URL;
const adamUrl = process.env.DATABASE_URL_ADAM;

if (!mainUrl || !adamUrl) {
  throw new Error('Set DATABASE_URL_MAIN (or DATABASE_URL) and DATABASE_URL_ADAM to sync tracking flags.');
}

const prismaMain = new PrismaClient({ datasources: { db: { url: mainUrl } } });
const prismaAdam = new PrismaClient({ datasources: { db: { url: adamUrl } } });

async function run() {
  // Pull tracked SKUs from main
  const trackedMain = await prismaMain.product.findMany({
    where: { isTracked: true, sku: { not: null } },
    select: { sku: true },
  });

  const skus = trackedMain
    .map((p) => p.sku)
    .filter((sku): sku is string => Boolean(sku));

  console.log(`Tracked SKUs in main: ${skus.length}`);

  // Reset DemoViewer to false
  const reset = await prismaAdam.product.updateMany({ data: { isTracked: false } });

  let updated = 0;
  if (skus.length) {
    const res = await prismaAdam.product.updateMany({
      where: { sku: { in: skus } },
      data: { isTracked: true },
    });
    updated = res.count;
  }

  console.log(`DemoViewer reset: ${reset.count}, set tracked true from main SKUs: ${updated}`);
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

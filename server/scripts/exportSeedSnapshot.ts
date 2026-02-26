import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

type SnapshotUser = {
  name: string;
  role: 'OWNER' | 'TECH' | 'VIEWER';
  isActive: boolean;
  pinHash: string;
};

type SnapshotLocation = {
  name: string;
  description: string | null;
};

type SnapshotCategory = {
  name: string;
};

type SnapshotInventoryItem = {
  location: string;
  quantity: number;
  status: string;
  batchNumber: string | null;
  expiresAt: string | null;
  notes: string | null;
};

type SnapshotComponent = {
  componentSku: string | null;
  componentName: string;
  quantityRequired: number;
  isOptional: boolean;
  componentLabel: string | null;
  sortOrder: number;
};

type SnapshotProduct = {
  name: string;
  sku: string | null;
  vendorPartNumber: string | null;
  description: string | null;
  color: string | null;
  unitSize: string | null;
  manufacturer: string | null;
  imageUrl: string | null;
  notes: string | null;
  productType: string;
  consumableType: 'REUSABLE' | 'SINGLE_USE';
  parentSku: string | null;
  parentName: string | null;
  isTracked: boolean;
  reorderPoint: number | null;
  maxStockLevel: number | null;
  leadTimeDays: number;
  supplierType: string;
  averageUsagePerJob: number | null;
  category: string | null;
  inventory: SnapshotInventoryItem[];
  components: SnapshotComponent[];
};

type InventorySnapshot = {
  version: 1;
  exportedAt: string;
  sourceTenant: string;
  sourceSchema: string;
  users: SnapshotUser[];
  locations: SnapshotLocation[];
  categories: SnapshotCategory[];
  products: SnapshotProduct[];
};

function parseSchemaFromUrl(url?: string) {
  if (!url) return 'unknown';
  const match = url.match(/schema=([^&]+)/);
  return match?.[1] ?? 'public';
}

function getTenantUrl(tenant: string) {
  if (tenant === 'main') {
    return process.env.DATABASE_URL_MAIN ?? process.env.DATABASE_URL;
  }
  if (tenant === 'adam') {
    return process.env.DATABASE_URL_ADAM;
  }
  return undefined;
}

function resolveDefaultOutputPath(tenant: 'main' | 'adam', canonical: boolean) {
  const filename = canonical
    ? `seed.snapshot.${tenant}.json`
    : `seed.snapshot.${tenant}.candidate.json`;
  return path.resolve(process.cwd(), 'prisma', 'data', filename);
}

async function exportTenantSnapshot(
  tenant: 'main' | 'adam',
  outputPath: string,
  options: { overwrite: boolean },
) {
  const url = getTenantUrl(tenant);
  if (!url) {
    throw new Error(`Missing database URL for tenant "${tenant}".`);
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const [users, locations, categories, products] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.product.findMany({
      include: {
        category: true,
        parentProduct: true,
        inventoryItems: {
          include: { location: true },
          orderBy: [{ location: { name: 'asc' } }, { createdAt: 'asc' }],
        },
        kitComponents: {
          include: { componentProduct: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ name: 'asc' }, { sku: 'asc' }],
    }),
  ]);

  try {
    const snapshot: InventorySnapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      sourceTenant: tenant,
      sourceSchema: parseSchemaFromUrl(url),
      users: users.map((user) => ({
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        pinHash: user.pinHash,
      })),
      locations: locations.map((location) => ({
        name: location.name,
        description: location.description,
      })),
      categories: categories.map((category) => ({ name: category.name })),
      products: products.map((product) => ({
        name: product.name,
        sku: product.sku,
        vendorPartNumber: product.vendorPartNumber,
        description: product.description,
        color: product.color,
        unitSize: product.unitSize,
        manufacturer: product.manufacturer,
        imageUrl: product.imageUrl,
        notes: product.notes,
        productType: product.productType,
        consumableType: product.consumableType,
        parentSku: product.parentProduct?.sku ?? null,
        parentName: product.parentProduct?.name ?? null,
        isTracked: product.isTracked,
        reorderPoint: product.reorderPoint,
        maxStockLevel: product.maxStockLevel,
        leadTimeDays: product.leadTimeDays,
        supplierType: product.supplierType,
        averageUsagePerJob: product.averageUsagePerJob,
        category: product.category?.name ?? null,
        inventory: product.inventoryItems.map((item) => ({
          location: item.location.name,
          quantity: item.quantity,
          status: item.status,
          batchNumber: item.batchNumber,
          expiresAt: item.expiresAt ? item.expiresAt.toISOString() : null,
          notes: item.notes,
        })),
        components: product.kitComponents.map((component) => ({
          componentSku: component.componentProduct.sku,
          componentName: component.componentProduct.name,
          quantityRequired: component.quantityRequired,
          isOptional: component.isOptional,
          componentLabel: component.componentLabel,
          sortOrder: component.sortOrder,
        })),
      })),
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    if (fs.existsSync(outputPath) && !options.overwrite) {
      throw new Error(
        `Refusing to overwrite existing file: ${outputPath}. Re-run with --overwrite or use a different --out path.`,
      );
    }
    fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf-8');

    console.log(`Snapshot exported to ${outputPath}`);
    console.log(`Tenant: ${snapshot.sourceTenant}`);
    console.log(`Schema: ${snapshot.sourceSchema}`);
    console.log(`Users: ${snapshot.users.length}`);
    console.log(`Locations: ${snapshot.locations.length}`);
    console.log(`Categories: ${snapshot.categories.length}`);
    console.log(`Products: ${snapshot.products.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const tenantArg = process.argv.find((arg) => arg.startsWith('--tenant='));
  const requestedTenant = tenantArg?.replace('--tenant=', '') as 'main' | 'adam' | undefined;
  const allTenants = process.argv.includes('--all-tenants');
  const outputArg = process.argv.find((arg) => arg.startsWith('--out='));
  const overwrite = process.argv.includes('--overwrite');
  const canonical = process.argv.includes('--canonical');

  if (allTenants) {
    if (outputArg) {
      throw new Error('--out is not supported with --all-tenants. Use default output names.');
    }

    const targets: Array<'main' | 'adam'> = [];
    if (getTenantUrl('main')) targets.push('main');
    if (getTenantUrl('adam')) targets.push('adam');

    if (!targets.length) {
      throw new Error('No tenant database URLs found. Set DATABASE_URL/DATABASE_URL_MAIN and/or DATABASE_URL_ADAM.');
    }

    for (const tenant of targets) {
      const outputPath = resolveDefaultOutputPath(tenant, canonical);
      await exportTenantSnapshot(tenant, outputPath, { overwrite });
    }
    return;
  }

  const tenant = requestedTenant ?? 'main';
  if (tenant !== 'main' && tenant !== 'adam') {
    throw new Error(`Unsupported tenant "${tenant}". Use --tenant=main or --tenant=adam.`);
  }

  const outputPath = outputArg
    ? path.resolve(process.cwd(), outputArg.replace('--out=', ''))
    : resolveDefaultOutputPath(tenant, canonical);

  await exportTenantSnapshot(tenant, outputPath, { overwrite });
}

main()
  .catch((error) => {
    console.error('Failed to export snapshot:', error);
    process.exit(1);
  });

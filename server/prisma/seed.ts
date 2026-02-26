import { PrismaClient, ProductConsumableType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

type SnapshotUser = {
  name: string;
  role: UserRole;
  isActive?: boolean;
  pin?: string;
  pinHash?: string;
};

type SnapshotLocation = {
  name: string;
  description?: string | null;
};

type SnapshotCategory = {
  name: string;
};

type SnapshotInventoryItem = {
  location: string;
  quantity: number;
  status?: string;
  batchNumber?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
};

type SnapshotComponent = {
  componentSku?: string | null;
  componentName?: string | null;
  quantityRequired?: number;
  isOptional?: boolean;
  componentLabel?: string | null;
  sortOrder?: number;
};

type SnapshotProduct = {
  name: string;
  sku?: string | null;
  vendorPartNumber?: string | null;
  description?: string | null;
  color?: string | null;
  unitSize?: string | null;
  manufacturer?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  productType?: string;
  consumableType?: ProductConsumableType;
  parentSku?: string | null;
  parentName?: string | null;
  isTracked?: boolean;
  reorderPoint?: number | null;
  maxStockLevel?: number | null;
  leadTimeDays?: number;
  supplierType?: string;
  averageUsagePerJob?: number | null;
  category?: string | null;
  inventory?: SnapshotInventoryItem[];
  components?: SnapshotComponent[];
};

type InventorySnapshot = {
  version: 1;
  exportedAt?: string;
  sourceSchema?: string;
  users: SnapshotUser[];
  locations: SnapshotLocation[];
  categories: SnapshotCategory[];
  products: SnapshotProduct[];
};

type LegacyInventorySeedFile = {
  products: Array<{
    name: string;
    sku: string | null;
    category: string;
    supplierType: string;
    productType: string;
    unitSize: string | null;
    description: string | null;
    color: string | null;
    reorderPoint: number | null;
    maxStockLevel: number | null;
    leadTimeDays: number;
    notes: string | null;
    consumableType?: ProductConsumableType;
    inventory: Array<{
      location: string;
      quantity: number;
      status: string;
      notes?: string;
    }>;
  }>;
};

const prisma = new PrismaClient();
const defaultSnapshotPath = path.resolve(process.cwd(), 'prisma', 'data', 'seed.snapshot.json');
const legacyPath = path.resolve(process.cwd(), 'prisma', 'data', 'inventory.json');

const defaultUsers: SnapshotUser[] = [
  { name: 'DemoOwner', role: 'OWNER', pin: '5555', isActive: true },
  { name: 'DemoTechnician', role: 'TECH', pin: '5555', isActive: true },
  { name: 'DemoManager', role: 'OWNER', pin: '5555', isActive: true },
  { name: 'DemoViewer', role: 'VIEWER', pin: '5555', isActive: true },
];

function parseSchemaFromUrl(url?: string) {
  if (!url) return 'public';
  const match = url.match(/schema=([^&]+)/);
  return match?.[1] ?? 'public';
}

function resolveSnapshotPath() {
  const schema = parseSchemaFromUrl(process.env.DATABASE_URL);
  const normalizedSchema = schema.toLowerCase() === 'public' ? 'main' : schema;
  const schemaSpecificPath = path.resolve(
    process.cwd(),
    'prisma',
    'data',
    `seed.snapshot.${normalizedSchema}.json`,
  );

  if (fs.existsSync(schemaSpecificPath)) {
    return schemaSpecificPath;
  }
  return defaultSnapshotPath;
}

function parseSnapshot(): InventorySnapshot {
  const snapshotPath = resolveSnapshotPath();
  if (fs.existsSync(snapshotPath)) {
    const raw = fs.readFileSync(snapshotPath, 'utf-8');
    const parsed = JSON.parse(raw) as InventorySnapshot;

    if (!Array.isArray(parsed.products)) {
      throw new Error('Snapshot file is invalid: products must be an array.');
    }

    return {
      version: 1,
      exportedAt: parsed.exportedAt,
      sourceSchema: parsed.sourceSchema,
      users: parsed.users ?? defaultUsers,
      locations: parsed.locations ?? [],
      categories: parsed.categories ?? [],
      products: parsed.products,
    };
  }

  if (!fs.existsSync(legacyPath)) {
    throw new Error(
      'No seed file found. Expected prisma/data/seed.snapshot.json, prisma/data/seed.snapshot.<schema>.json, or prisma/data/inventory.json.',
    );
  }

  const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf-8')) as LegacyInventorySeedFile;

  const inferredLocations = Array.from(
    new Set(legacy.products.flatMap((product) => product.inventory.map((item) => item.location))),
  ).map((name) => ({ name }));

  const inferredCategories = Array.from(new Set(legacy.products.map((product) => product.category))).map(
    (name) => ({ name }),
  );

  return {
    version: 1,
    users: defaultUsers,
    locations: inferredLocations,
    categories: inferredCategories,
    products: legacy.products.map((product) => ({
      name: product.name,
      sku: product.sku,
      vendorPartNumber: null,
      category: product.category,
      supplierType: product.supplierType,
      productType: product.productType,
      unitSize: product.unitSize,
      description: product.description,
      color: product.color,
      reorderPoint: product.reorderPoint,
      maxStockLevel: product.maxStockLevel,
      leadTimeDays: product.leadTimeDays,
      notes: product.notes,
      consumableType: product.consumableType ?? 'REUSABLE',
      inventory: product.inventory.map((item) => ({
        location: item.location,
        quantity: item.quantity,
        status: item.status,
        notes: item.notes ?? null,
      })),
    })),
  };
}

function keyForProduct(product: { sku?: string | null; name: string }) {
  const sku = (product.sku ?? '').trim();
  if (sku) return `sku:${sku}`;
  return `name:${product.name.trim().toLowerCase()}`;
}

async function resetTables() {
  console.log('Clearing existing data...');
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.productComponent.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers(users: SnapshotUser[]) {
  console.log('Creating users...');
  for (const user of users) {
    let pinHash = user.pinHash;

    if (!pinHash && user.pin) {
      pinHash = await bcrypt.hash(user.pin, 10);
    }

    if (!pinHash) {
      throw new Error(`User ${user.name} must include either pin or pinHash in snapshot.`);
    }

    await prisma.user.create({
      data: {
        name: user.name,
        role: user.role,
        pinHash,
        isActive: user.isActive ?? true,
      },
    });
  }
}

async function seedLocations(locations: SnapshotLocation[], products: SnapshotProduct[]) {
  const locationNamesFromProducts = products.flatMap((product) =>
    (product.inventory ?? []).map((item) => item.location),
  );

  const names = new Set<string>([
    ...locations.map((location) => location.name),
    ...locationNamesFromProducts,
  ]);

  const locationInput = new Map(locations.map((location) => [location.name, location]));
  const idByName = new Map<string, string>();

  for (const name of Array.from(names).sort((a, b) => a.localeCompare(b))) {
    const record = await prisma.location.create({
      data: {
        name,
        description: locationInput.get(name)?.description ?? null,
      },
    });
    idByName.set(name, record.id);
  }

  return idByName;
}

async function seedCategories(categories: SnapshotCategory[], products: SnapshotProduct[]) {
  const names = new Set<string>([
    ...categories.map((category) => category.name),
    ...products.map((product) => product.category).filter((value): value is string => Boolean(value)),
  ]);

  const idByName = new Map<string, string>();
  for (const name of Array.from(names).sort((a, b) => a.localeCompare(b))) {
    const category = await prisma.category.create({ data: { name } });
    idByName.set(name, category.id);
  }

  return idByName;
}

async function seedProducts(
  products: SnapshotProduct[],
  categoryIds: Map<string, string>,
  locationIds: Map<string, string>,
) {
  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));
  const productIds = new Map<string, string>();

  for (const product of sortedProducts) {
    const categoryId = product.category ? categoryIds.get(product.category) : undefined;

    const created = await prisma.product.create({
      data: {
        name: product.name,
        sku: product.sku ?? null,
        vendorPartNumber: product.vendorPartNumber ?? null,
        description: product.description ?? null,
        color: product.color ?? null,
        unitSize: product.unitSize ?? null,
        manufacturer: product.manufacturer ?? null,
        imageUrl: product.imageUrl ?? null,
        notes: product.notes ?? null,
        productType: product.productType ?? 'simple',
        consumableType: product.consumableType ?? 'REUSABLE',
        isTracked: product.isTracked ?? false,
        reorderPoint: product.reorderPoint ?? null,
        maxStockLevel: product.maxStockLevel ?? null,
        leadTimeDays: product.leadTimeDays ?? 7,
        supplierType: product.supplierType ?? 'OPEN_SOURCE',
        averageUsagePerJob: product.averageUsagePerJob ?? null,
        categoryId,
      },
    });

    productIds.set(keyForProduct(product), created.id);
  }

  for (const product of sortedProducts) {
    if (!product.parentSku && !product.parentName) continue;

    const productId = productIds.get(keyForProduct(product));
    if (!productId) continue;

    const parentKey = product.parentSku
      ? keyForProduct({ sku: product.parentSku, name: product.parentName ?? product.parentSku })
      : keyForProduct({ name: product.parentName ?? '', sku: null });

    const parentId = productIds.get(parentKey);
    if (!parentId) {
      throw new Error(`Missing parent product for ${product.name}: ${product.parentSku ?? product.parentName}`);
    }

    await prisma.product.update({
      where: { id: productId },
      data: { parentProductId: parentId },
    });
  }

  for (const product of sortedProducts) {
    const productId = productIds.get(keyForProduct(product));
    if (!productId) continue;

    for (const item of product.inventory ?? []) {
      const locationId = locationIds.get(item.location);
      if (!locationId) {
        throw new Error(`Missing location mapping for ${item.location}`);
      }

      await prisma.inventoryItem.create({
        data: {
          productId,
          locationId,
          quantity: item.quantity,
          status: item.status ?? 'SEALED',
          batchNumber: item.batchNumber ?? null,
          expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
          notes: item.notes ?? null,
        },
      });
    }
  }

  for (const product of sortedProducts) {
    const kitProductId = productIds.get(keyForProduct(product));
    if (!kitProductId) continue;

    for (const component of product.components ?? []) {
      const componentKey = component.componentSku
        ? keyForProduct({ sku: component.componentSku, name: component.componentName ?? component.componentSku })
        : keyForProduct({ name: component.componentName ?? '', sku: null });

      const componentProductId = productIds.get(componentKey);
      if (!componentProductId) {
        throw new Error(
          `Missing component product for ${product.name}: ${component.componentSku ?? component.componentName}`,
        );
      }

      await prisma.productComponent.create({
        data: {
          kitProductId,
          componentProductId,
          quantityRequired: component.quantityRequired ?? 1,
          isOptional: component.isOptional ?? false,
          componentLabel: component.componentLabel ?? null,
          sortOrder: component.sortOrder ?? 0,
        },
      });
    }
  }
}

async function main() {
  const snapshot = parseSnapshot();

  console.log('Seeding database from snapshot baseline...');
  await resetTables();
  await seedUsers(snapshot.users);

  const locationIds = await seedLocations(snapshot.locations, snapshot.products);
  console.log(`Created ${locationIds.size} locations`);

  const categoryIds = await seedCategories(snapshot.categories, snapshot.products);
  console.log(`Created ${categoryIds.size} categories`);

  await seedProducts(snapshot.products, categoryIds, locationIds);
  console.log(`Created ${snapshot.products.length} products`);
  console.log('Seeding complete.');
}

main()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, UserRole } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

type InventorySeedFile = {
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
    consumableType?: string;
    inventory: Array<{
      location: string;
      quantity: number;
      status: string;
      notes?: string;
    }>;
  }>;
};

const prisma = new PrismaClient();

const dataPath = path.resolve(process.cwd(), 'prisma', 'data', 'inventory.json');
const rawData = fs.readFileSync(dataPath, 'utf-8');
const seedData = JSON.parse(rawData) as InventorySeedFile;

const locationDescriptions: Record<string, string> = {
  Warehouse: 'Main storage location',
  Trailer: 'Mobile inventory for jobs',
  Personal: 'Garage/truck overflow storage',
};

const singleUseProducts = new Set(
  [
    '1 Quart Bucket',
    '2.5 Quart Bucket',
    '5 Quart Bucket',
    '10 Quart Bucket',
    '18" Paint Roller Tray',
    '18" Roller',
    '18" Sanding Disc',
    '9" Paint Roller',
    '9" Paint Roller Tray',
    '44 Gallon Drum Liner',
    'Dust Collector Liner',
    'Finish Squeegie',
    'Grinder Diamonds - Coating',
    'Grinder Diamonds - Hard',
    'Grinder Diamonds - Medium',
    'Grinder Diamonds - Soft',
    'HEPA Filter',
    'Large Gloves',
    'Dixie Cups',
    'Moisture Test Kit',
    "Painter's Tape",
    'Putty Knife',
    'Rags',
    'Shotblast Shot',
    'Silica Sand',
    'Squeegie Head Holder',
    'Stir Wand',
    'Cyclo-1',
    '1/4" Squeegie Replacement Head',
    '1/8" Squeegie Replacement Head',
    'Squeegie Head Holder',
  ].map((name) => name.trim()),
);

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

const defaultUsers: Array<{ name: string; role: UserRole; pin: string }> = [
  { name: 'Steve', role: 'OWNER', pin: '9143' },
  { name: 'Alex', role: 'TECH', pin: '7995' },
  { name: 'Dan', role: 'OWNER', pin: '7770' },
  { name: 'Adam', role: 'VIEWER', pin: '5185' },
];

async function seedUsers() {
  console.log('Creating default users...');
  for (const user of defaultUsers) {
    const pinHash = await bcrypt.hash(user.pin, 10);
    await prisma.user.create({
      data: {
        name: user.name,
        role: user.role,
        pinHash,
      },
    });
  }
}

async function seedLocations() {
  const uniqueLocations = Array.from(
    new Set(seedData.products.flatMap((p) => p.inventory.map((item) => item.location))),
  );

  const map = new Map<string, string>();
  for (const name of uniqueLocations) {
    const location = await prisma.location.create({
      data: {
        name,
        description: locationDescriptions[name] ?? null,
      },
    });
    map.set(name, location.id);
  }
  return map;
}

async function seedCategories() {
  const uniqueCategories = Array.from(new Set(seedData.products.map((p) => p.category)));
  const map = new Map<string, string>();

  for (const name of uniqueCategories) {
    const category = await prisma.category.create({
      data: { name },
    });
    map.set(name, category.id);
  }

  return map;
}

async function seedProducts(
  categoryMap: Map<string, string>,
  locationMap: Map<string, string>,
) {
  for (const product of seedData.products) {
    const categoryId = categoryMap.get(product.category);
    if (!categoryId) {
      throw new Error(`Missing category mapping for ${product.category}`);
    }

    const inventoryToCreate = product.inventory.map((item) => {
      const locationId = locationMap.get(item.location);
      if (!locationId) {
        throw new Error(`Missing location mapping for ${item.location}`);
      }
      return {
        locationId,
        quantity: item.quantity,
        status: item.status,
        notes: item.notes ?? null,
      };
    });

    const consumableType =
      (product.consumableType as 'REUSABLE' | 'SINGLE_USE' | undefined) ??
      (singleUseProducts.has(product.name) ? 'SINGLE_USE' : 'REUSABLE');

    const createdProduct = await prisma.product.create({
      data: {
        name: product.name,
        sku: product.sku,
        description: product.description,
        unitSize: product.unitSize,
        manufacturer: product.supplierType === 'OPEN_SOURCE' ? 'Various' : 'Garage Force',
        categoryId,
        productType: product.productType,
        supplierType: product.supplierType,
        consumableType,
        color: product.color,
        reorderPoint: product.reorderPoint ?? undefined,
        maxStockLevel: product.maxStockLevel ?? undefined,
        leadTimeDays: product.leadTimeDays,
        notes: product.notes,
        inventoryItems: {
          create: inventoryToCreate,
        },
      },
    });

    console.log(`✓ Seeded product: ${createdProduct.name}`);
  }
}

async function main() {
  console.log('Seeding database with real inventory snapshot...');
  await resetTables();
  await seedUsers();

  const locationMap = await seedLocations();
  console.log(`✓ Created ${locationMap.size} locations`);

  const categoryMap = await seedCategories();
  console.log(`✓ Created ${categoryMap.size} categories`);

  await seedProducts(categoryMap, locationMap);
  console.log('Seeding complete!');
}

main()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

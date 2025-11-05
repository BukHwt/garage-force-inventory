import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create the 3 locations
  const warehouse = await prisma.location.upsert({
    where: { name: 'Warehouse' },
    update: {},
    create: {
      name: 'Warehouse',
      description: 'Main storage location',
    },
  });

  const trailer = await prisma.location.upsert({
    where: { name: 'Trailer' },
    update: {},
    create: {
      name: 'Trailer',
      description: 'Mobile inventory for jobs (limited space: 3-6 buckets, chip boxes, equipment)',
    },
  });

  const personal = await prisma.location.upsert({
    where: { name: 'Personal' },
    update: {},
    create: {
      name: 'Personal',
      description: 'Garage/truck overflow storage',
    },
  });

  console.log('Created locations:', { warehouse, trailer, personal });

  // Create some example categories
  const coatings = await prisma.category.upsert({
    where: { name: 'Coatings' },
    update: {},
    create: {
      name: 'Coatings',
    },
  });

  const chips = await prisma.category.upsert({
    where: { name: 'Decorative Chips' },
    update: {},
    create: {
      name: 'Decorative Chips',
    },
  });

  const disposables = await prisma.category.upsert({
    where: { name: 'Disposables' },
    update: {},
    create: {
      name: 'Disposables',
    },
  });

  const equipment = await prisma.category.upsert({
    where: { name: 'Equipment' },
    update: {},
    create: {
      name: 'Equipment',
    },
  });

  console.log('Created categories:', { coatings, chips, disposables, equipment });

  // Create sample products with inventory

  // Product 1: Base Coat (LOW STOCK - will trigger reorder alert)
  const baseCoat = await prisma.product.create({
    data: {
      name: 'Base Coat Sealer',
      sku: 'GF-BC-001',
      description: 'Primary base coat for garage floors',
      color: 'Clear',
      unitSize: '5 gallon bucket',
      manufacturer: 'Garage Force',
      categoryId: coatings.id,
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 20,
      maxStockLevel: 50,
      leadTimeDays: 7,
      averageUsagePerJob: 10,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 8 },
          { locationId: trailer.id, quantity: 4 },
        ],
      },
    },
  });

  // Product 2: Top Coat (GOOD STOCK)
  const topCoat = await prisma.product.create({
    data: {
      name: 'Polyaspartic Top Coat',
      sku: 'GF-TC-002',
      description: 'High-gloss protective top coat',
      color: 'Clear',
      unitSize: '5 gallon bucket',
      manufacturer: 'Garage Force',
      categoryId: coatings.id,
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 15,
      maxStockLevel: 40,
      leadTimeDays: 7,
      averageUsagePerJob: 8,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 18 },
          { locationId: trailer.id, quantity: 6 },
          { locationId: personal.id, quantity: 2 },
        ],
      },
    },
  });

  // Product 3: Decorative Chips - Granite (CRITICAL LOW)
  const graniteChips = await prisma.product.create({
    data: {
      name: 'Decorative Chips - Granite Blend',
      sku: 'GF-CH-GRAN',
      description: 'Premium granite color blend chips',
      color: 'Granite',
      unitSize: '50 lb box',
      manufacturer: 'Garage Force',
      categoryId: chips.id,
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 10,
      maxStockLevel: 25,
      leadTimeDays: 7,
      averageUsagePerJob: 3,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 3 },
          { locationId: trailer.id, quantity: 2 },
        ],
      },
    },
  });

  // Product 4: Decorative Chips - Mocha (GOOD STOCK)
  const mochaChips = await prisma.product.create({
    data: {
      name: 'Decorative Chips - Mocha Blend',
      sku: 'GF-CH-MOCH',
      description: 'Warm mocha color blend chips',
      color: 'Mocha',
      unitSize: '50 lb box',
      manufacturer: 'Garage Force',
      categoryId: chips.id,
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 8,
      maxStockLevel: 20,
      leadTimeDays: 7,
      averageUsagePerJob: 3,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 12 },
          { locationId: trailer.id, quantity: 3 },
        ],
      },
    },
  });

  // Product 5: Primer (GOOD STOCK)
  const primer = await prisma.product.create({
    data: {
      name: 'Concrete Primer',
      sku: 'GF-PR-001',
      description: 'Epoxy primer for concrete preparation',
      unitSize: '5 gallon bucket',
      manufacturer: 'Garage Force',
      categoryId: coatings.id,
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 12,
      maxStockLevel: 30,
      leadTimeDays: 7,
      averageUsagePerJob: 6,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 15 },
          { locationId: trailer.id, quantity: 3 },
        ],
      },
    },
  });

  // Product 6: Disposable Brushes (LOCAL AVAILABLE)
  const brushes = await prisma.product.create({
    data: {
      name: 'Disposable Brush Set',
      sku: 'DISP-BR-001',
      description: '3-pack disposable brushes',
      unitSize: '3-pack',
      categoryId: disposables.id,
      supplierType: 'OPEN_SOURCE',
      reorderPoint: 5,
      maxStockLevel: 20,
      leadTimeDays: 1,
      averageUsagePerJob: 1,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 8 },
          { locationId: trailer.id, quantity: 4 },
          { locationId: personal.id, quantity: 2 },
        ],
      },
    },
  });

  // Product 7: Paint Roller Covers (LOW STOCK)
  const rollers = await prisma.product.create({
    data: {
      name: 'Paint Roller Covers',
      sku: 'DISP-RL-001',
      description: '9-inch roller covers',
      unitSize: '10-pack',
      categoryId: disposables.id,
      supplierType: 'GARAGE_FORCE_OPTIONAL',
      reorderPoint: 8,
      maxStockLevel: 15,
      leadTimeDays: 7,
      averageUsagePerJob: 2,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 3 },
          { locationId: trailer.id, quantity: 1 },
        ],
      },
    },
  });

  // Product 8: Mixing Paddles (GOOD STOCK)
  const paddles = await prisma.product.create({
    data: {
      name: 'Mixing Paddles',
      sku: 'EQ-MIX-001',
      description: 'Heavy-duty mixing paddles for drill',
      unitSize: 'each',
      categoryId: equipment.id,
      supplierType: 'OPEN_SOURCE',
      reorderPoint: 3,
      maxStockLevel: 10,
      leadTimeDays: 2,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 5 },
          { locationId: trailer.id, quantity: 2 },
        ],
      },
    },
  });

  console.log('Created sample products with inventory');
  console.log('Products with reorder alerts:');
  console.log('  - Base Coat Sealer: 12 total (reorder at 20) ⚠️');
  console.log('  - Granite Chips: 5 total (reorder at 10) ⚠️');
  console.log('  - Roller Covers: 4 total (reorder at 8) ⚠️');

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

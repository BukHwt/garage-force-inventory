import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================================
  // 1. CREATE LOCATIONS
  // ============================================
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

  console.log('✓ Created locations:', { warehouse, trailer, personal });

  // ============================================
  // 2. CREATE CATEGORIES
  // ============================================
  const coatings = await prisma.category.upsert({
    where: { name: 'Coatings' },
    update: {},
    create: { name: 'Coatings' },
  });

  const repair = await prisma.category.upsert({
    where: { name: 'Repair Products' },
    update: {},
    create: { name: 'Repair Products' },
  });

  const decorative = await prisma.category.upsert({
    where: { name: 'Decorative Chips' },
    update: {},
    create: { name: 'Decorative Chips' },
  });

  const tools = await prisma.category.upsert({
    where: { name: 'Application Tools' },
    update: {},
    create: { name: 'Application Tools' },
  });

  const disposables = await prisma.category.upsert({
    where: { name: 'Disposables' },
    update: {},
    create: { name: 'Disposables' },
  });

  console.log('✓ Created categories');

  // ============================================
  // 3. CREATE CYCLOSPARTIC BASE COAT COMPONENTS
  // ============================================

  // Part A - Universal (Component)
  const partA1Gal = await prisma.product.create({
    data: {
      name: 'Cyclospartic Base Coat Part A',
      sku: 'CS-BASE-A-1GAL',
      description: 'Universal resin component for Cyclospartic base coat system',
      unitSize: '1 gallon',
      manufacturer: 'Garage Force',
      categoryId: coatings.id,
      productType: 'component',
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 15,
      maxStockLevel: 50,
      leadTimeDays: 7,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 28 },
          { locationId: trailer.id, quantity: 4, status: 'SEALED' },
          { locationId: trailer.id, quantity: 2, status: 'OPEN' },
        ],
      },
    },
  });

  const partA5Gal = await prisma.product.create({
    data: {
      name: 'Cyclospartic Base Coat Part A',
      sku: 'CS-BASE-A-5GAL',
      description: 'Universal resin component for Cyclospartic base coat system',
      unitSize: '5 gallon',
      manufacturer: 'Garage Force',
      categoryId: coatings.id,
      productType: 'component',
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 8,
      maxStockLevel: 25,
      leadTimeDays: 7,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 12 },
        ],
      },
    },
  });

  // Part B - Tan (Component)
  const partBTan = await prisma.product.create({
    data: {
      name: 'Cyclospartic Base Coat Part B - Tan',
      sku: 'CS-BASE-B-TAN-1GAL',
      description: 'Pre-tinted hardener component - Tan color',
      color: 'Tan',
      unitSize: '1 gallon',
      manufacturer: 'Garage Force',
      categoryId: coatings.id,
      productType: 'component',
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 10,
      maxStockLevel: 30,
      leadTimeDays: 7,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 18 },
          { locationId: trailer.id, quantity: 3, status: 'SEALED' },
          { locationId: trailer.id, quantity: 1, status: 'OPEN' },
        ],
      },
    },
  });

  // Part B - Gray (Component) - LOW STOCK
  const partBGray = await prisma.product.create({
    data: {
      name: 'Cyclospartic Base Coat Part B - Gray',
      sku: 'CS-BASE-B-GRAY-1GAL',
      description: 'Pre-tinted hardener component - Gray color',
      color: 'Gray',
      unitSize: '1 gallon',
      manufacturer: 'Garage Force',
      categoryId: coatings.id,
      productType: 'component',
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 12,
      maxStockLevel: 30,
      leadTimeDays: 7,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 6 },
          { locationId: trailer.id, quantity: 2 },
        ],
      },
    },
  });

  // Part B - Clear (Component)
  const partBClear = await prisma.product.create({
    data: {
      name: 'Cyclospartic Base Coat Part B - Clear',
      sku: 'CS-BASE-B-CLEAR-1GAL',
      description: 'Clear hardener component for on-site custom tinting',
      color: 'Clear',
      unitSize: '1 gallon',
      manufacturer: 'Garage Force',
      categoryId: coatings.id,
      productType: 'component',
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 8,
      maxStockLevel: 20,
      leadTimeDays: 7,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 12 },
          { locationId: personal.id, quantity: 2 },
        ],
      },
    },
  });

  console.log('✓ Created Cyclospartic components (Part A & Part B variants)');

  // ============================================
  // 4. CREATE BASE COAT KIT (References components)
  // ============================================
  const baseCoatKit = await prisma.product.create({
    data: {
      name: 'Cyclospartic Base Coat Kit',
      sku: 'CS-BASE-KIT',
      description: 'Complete two-part Cyclospartic base coat system (Part A + Part B)',
      manufacturer: 'Garage Force',
      categoryId: coatings.id,
      productType: 'kit',
      supplierType: 'GARAGE_FORCE_REQUIRED',
    },
  });

  // Link components to kit
  await prisma.productComponent.create({
    data: {
      kitProductId: baseCoatKit.id,
      componentProductId: partA1Gal.id,
      quantityRequired: 1,
      componentLabel: 'Part A (Resin)',
      sortOrder: 1,
    },
  });

  // Part B options (one required)
  await prisma.productComponent.create({
    data: {
      kitProductId: baseCoatKit.id,
      componentProductId: partBTan.id,
      quantityRequired: 1,
      isOptional: true,
      componentLabel: 'Part B (Hardener) - Choose Color',
      sortOrder: 2,
    },
  });

  await prisma.productComponent.create({
    data: {
      kitProductId: baseCoatKit.id,
      componentProductId: partBGray.id,
      quantityRequired: 1,
      isOptional: true,
      componentLabel: 'Part B (Hardener) - Choose Color',
      sortOrder: 2,
    },
  });

  await prisma.productComponent.create({
    data: {
      kitProductId: baseCoatKit.id,
      componentProductId: partBClear.id,
      quantityRequired: 1,
      isOptional: true,
      componentLabel: 'Part B (Hardener) - Choose Color',
      sortOrder: 2,
    },
  });

  console.log('✓ Created Base Coat Kit with component relationships');

  // ============================================
  // 5. CREATE REPAIR PRODUCTS
  // ============================================
  const crackFiller = await prisma.product.create({
    data: {
      name: 'Cyclospartic Crack Filler',
      sku: 'CS-CRACK-FILL-1QT',
      description: 'Professional-grade crack and joint filler for concrete prep',
      unitSize: '1 quart',
      manufacturer: 'Garage Force',
      categoryId: repair.id,
      productType: 'simple',
      supplierType: 'GARAGE_FORCE_REQUIRED',
      reorderPoint: 5,
      maxStockLevel: 15,
      leadTimeDays: 7,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 8 },
          { locationId: trailer.id, quantity: 2, status: 'SEALED' },
          { locationId: trailer.id, quantity: 1, status: 'OPEN' },
        ],
      },
    },
  });

  console.log('✓ Created repair products');

  // ============================================
  // 6. CREATE DECORATIVE FLAKES/CHIPS
  // ============================================
  const flakeGlacier = await prisma.product.create({
    data: {
      name: 'Decorative Flakes - Glacier Blend',
      sku: 'FLAKE-025-GLACIER',
      description: '1/4" decorative chips in Glacier color blend',
      color: 'Glacier (Blue/White/Gray)',
      unitSize: '5 lb box',
      manufacturer: 'Garage Force',
      categoryId: decorative.id,
      productType: 'simple',
      supplierType: 'GARAGE_FORCE_OPTIONAL',
      reorderPoint: 20,
      maxStockLevel: 60,
      leadTimeDays: 10,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 35 },
          { locationId: trailer.id, quantity: 6, status: 'SEALED' },
          { locationId: trailer.id, quantity: 2, status: 'OPEN' },
        ],
      },
    },
  });

  const flakeSunset = await prisma.product.create({
    data: {
      name: 'Decorative Flakes - Sunset Blend',
      sku: 'FLAKE-025-SUNSET',
      description: '1/4" decorative chips in Sunset color blend',
      color: 'Sunset (Orange/Red/Tan)',
      unitSize: '5 lb box',
      manufacturer: 'Garage Force',
      categoryId: decorative.id,
      productType: 'simple',
      supplierType: 'GARAGE_FORCE_OPTIONAL',
      reorderPoint: 15,
      maxStockLevel: 50,
      leadTimeDays: 10,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 28 },
          { locationId: trailer.id, quantity: 5 },
        ],
      },
    },
  });

  // LOW STOCK flakes
  const flakeGranite = await prisma.product.create({
    data: {
      name: 'Decorative Flakes - Granite Blend',
      sku: 'FLAKE-025-GRANITE',
      description: '1/4" decorative chips in Granite color blend',
      color: 'Granite (Black/White/Gray)',
      unitSize: '5 lb box',
      manufacturer: 'Garage Force',
      categoryId: decorative.id,
      productType: 'simple',
      supplierType: 'GARAGE_FORCE_OPTIONAL',
      reorderPoint: 20,
      maxStockLevel: 60,
      leadTimeDays: 10,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 12 },
          { locationId: trailer.id, quantity: 3 },
        ],
      },
    },
  });

  console.log('✓ Created decorative flakes');

  // ============================================
  // 7. CREATE APPLICATION TOOLS
  // ============================================
  const squeegee = await prisma.product.create({
    data: {
      name: 'Notched Squeegee - 18"',
      sku: 'TOOL-SQGEE-18',
      description: 'Professional notched squeegee for coating application',
      unitSize: '18 inch',
      manufacturer: 'Generic',
      categoryId: tools.id,
      productType: 'simple',
      supplierType: 'OPEN_SOURCE',
      reorderPoint: 3,
      maxStockLevel: 10,
      leadTimeDays: 3,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 6 },
          { locationId: trailer.id, quantity: 2 },
        ],
      },
    },
  });

  const spikeShoes = await prisma.product.create({
    data: {
      name: 'Spike Shoes',
      sku: 'TOOL-SPIKE-SHOES',
      description: 'Professional spike shoes for walking on wet coatings',
      unitSize: 'Pair',
      manufacturer: 'Generic',
      categoryId: tools.id,
      productType: 'simple',
      supplierType: 'OPEN_SOURCE',
      reorderPoint: 2,
      maxStockLevel: 6,
      leadTimeDays: 5,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 3 },
          { locationId: trailer.id, quantity: 1 },
        ],
      },
    },
  });

  console.log('✓ Created application tools');

  // ============================================
  // 8. CREATE DISPOSABLES
  // ============================================
  const rollerCovers = await prisma.product.create({
    data: {
      name: 'Roller Covers - 3/8" Nap',
      sku: 'DISP-ROLLER-38',
      description: '9" roller covers with 3/8" nap for coating application',
      unitSize: '6 pack',
      manufacturer: 'Generic',
      categoryId: disposables.id,
      productType: 'simple',
      supplierType: 'OPEN_SOURCE',
      reorderPoint: 10,
      maxStockLevel: 30,
      leadTimeDays: 3,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 8 },
          { locationId: trailer.id, quantity: 3, status: 'SEALED' },
          { locationId: trailer.id, quantity: 1, status: 'OPEN' },
        ],
      },
    },
  });

  const gloves = await prisma.product.create({
    data: {
      name: 'Nitrile Gloves - Large',
      sku: 'DISP-GLOVES-L',
      description: 'Chemical-resistant nitrile gloves',
      unitSize: 'Box of 100',
      manufacturer: 'Generic',
      categoryId: disposables.id,
      productType: 'simple',
      supplierType: 'OPEN_SOURCE',
      reorderPoint: 3,
      maxStockLevel: 10,
      leadTimeDays: 2,
      inventoryItems: {
        create: [
          { locationId: warehouse.id, quantity: 5 },
          { locationId: trailer.id, quantity: 1, status: 'SEALED' },
          { locationId: trailer.id, quantity: 1, status: 'OPEN' },
        ],
      },
    },
  });

  console.log('✓ Created disposables');

  console.log('\n================================');
  console.log('✓ Database seeding completed!');
  console.log('================================\n');
  console.log('Product Summary:');
  console.log('- Cyclospartic Base Coat Kit (with Part A & Part B variants)');
  console.log('- Crack Filler');
  console.log('- Decorative Flakes (3 color blends)');
  console.log('- Application Tools (2 items)');
  console.log('- Disposables (2 items)');
  console.log('\nLow Stock Alerts:');
  console.log('- Cyclospartic Base Coat Part B - Gray (8 units < 12 reorder point)');
  console.log('- Decorative Flakes - Granite Blend (15 units < 20 reorder point)');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

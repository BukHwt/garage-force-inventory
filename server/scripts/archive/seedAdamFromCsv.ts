import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

type ParsedProduct = {
  category: string;
  sku: string;
  name: string;
  unitSize?: string;
  notes?: string;
};

// Configure target tenant (adam only)
const targetUrl = process.env.DATABASE_URL_ADAM;

if (!targetUrl) {
  throw new Error('DATABASE_URL_ADAM is required to seed DemoViewer schema');
}

const prisma = new PrismaClient({
  datasources: { db: { url: targetUrl } },
});

const csvPath = path.resolve(
  process.cwd(),
  'prisma',
  'data',
  'Inventory.xlsx - Sheet1.csv',
);

function loadCsv(): ParsedProduct[] {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const records: string[][] = parse(raw, {
    relaxColumnCount: true,
    skipEmptyLines: false,
  });

  let currentCategory = '';
  let pendingUnitSize: string | undefined;
  const products: ParsedProduct[] = [];

  const isHeaderRow = (row: string[]) =>
    (row[0]?.trim().toLowerCase() === 'part #' && row[1]?.trim().toLowerCase() === 'description') ||
    (row[0]?.trim() === '' && row[1]?.trim().toLowerCase() === 'description');

  const shouldSkipCategory = (name: string) =>
    ['equipment', 'tools'].some((word) => name.toLowerCase().includes(word));

  for (const row of records) {
    const [partRaw = '', descRaw = '', priceRaw = '', optionsRaw = ''] = row.map((cell) =>
      (cell ?? '').trim(),
    );

    // Blank row
    if (!partRaw && !descRaw && !priceRaw && !optionsRaw) {
      continue;
    }

    // Category row (single value in first cell)
    if (partRaw && !descRaw && !priceRaw && !optionsRaw) {
      if (!shouldSkipCategory(partRaw)) {
        currentCategory = partRaw;
      } else {
        currentCategory = ''; // skip equipment/tools sections entirely
      }
      continue;
    }

    // Skip headers
    if (isHeaderRow(row)) {
      continue;
    }

    // Unit size/option row following a product
    if (!partRaw && !descRaw && optionsRaw) {
      pendingUnitSize = optionsRaw;
      continue;
    }

    // If there's no part number, skip (could be stray note rows)
    if (!partRaw) {
      continue;
    }

    // Clean description and unit size
    const cleanedDesc = descRaw.replace(/[�]+/g, '').trim();
    const unitSize = pendingUnitSize || optionsRaw || undefined;

    if (!currentCategory) {
      currentCategory = 'Uncategorized';
    }

        // Fix miscategorized hybrid chips: only keep Hybrid Series when name contains hybrid; otherwise treat as 1/4" Chips
    const nameLower = cleanedDesc.toLowerCase();
    let effectiveCategory = currentCategory;
    if (currentCategory.toLowerCase().includes('hybrid') && !nameLower.includes('hybrid')) {
      effectiveCategory = '1/4" Chips';
    }

    products.push({
      category: effectiveCategory,
      sku: partRaw,
      name: cleanedDesc || partRaw,
      unitSize,
    });

    pendingUnitSize = undefined;
  }

  return products;
}

const explicitUnitOverrides: Array<{ test: (name: string, category: string) => boolean; unit: string }> = [
  // Stonebridge chips
  {
    test: (_name, category) => category.toLowerCase().includes('stonebridge series'),
    unit: '40 lb box',
  },
  // Universal Color Tint - Bulk -> 1 Gallon
  {
    test: (name) => /universal color tint/i.test(name) && /bulk/i.test(name),
    unit: '1 Gallon',
  },
  // Universal Color Tint (non-bulk) -> 1 Quart
  {
    test: (name) => /universal color tint/i.test(name) && !/bulk/i.test(name),
    unit: '1 Quart',
  },
  // Finished Sample Sets
  {
    test: (name, category) => /finished sample set/i.test(name) || /finished sample/i.test(category),
    unit: 'Each',
  },
  // Polos (apparel)
  {
    test: (name) => /polo/i.test(name),
    unit: 'Each',
  },
  // Marketing materials (default each)
  {
    test: (_name, category) =>
      /marketing materials/i.test(category) && !/brochure/i.test(category) && !/brochure/i.test(_name),
    unit: 'Each',
  },
  // Brochures (cases)
  {
    test: (name, category) => /brochure/i.test(name) || /brochure/i.test(category),
    unit: 'Case',
  },
  // 50-packs
  {
    test: (name) => /(GFA-CycloCat|GFA-CCFCcat4|GFA-CCFCcat8)/i.test(name),
    unit: '50 Pack',
  },
  // 250 pack marketing flyers
  {
    test: (name) => /GARAFL-00/i.test(name),
    unit: '250 Pack',
  },
  // Cyclo-1 Single Component
  {
    test: (name) => /cyclo-1 single component/i.test(name),
    unit: '2 Gallon Kit',
  },
  // DL3000 / Dual Cartridge Tip
  {
    test: (name) => /dl3000 dust collector/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /dual cartridge caulk gun tip/i.test(name),
    unit: 'Each',
  },
  // ESD
  {
    test: (name) => /esd 4700 primer/i.test(name),
    unit: '1 Gallon',
  },
  {
    test: (name) => /esd 4700 top coat/i.test(name),
    unit: '1 Gallon',
  },
  {
    test: (name) => /esd prime & seal primer/i.test(name),
    unit: '1 Gallon',
  },
  // Fortification Formula
  {
    test: (name) => /fortification formula/i.test(name),
    unit: 'Kit',
  },
  // GF Flexible Control Joint Fill
  {
    test: (name) => /flexible control joint fill/i.test(name),
    unit: 'Dual Cart',
  },
  // GF Grip large/small
  {
    test: (name) => /gf grip (large|small)/i.test(name),
    unit: '15 lb Bucket (Openable)',
  },
  // GF Patch - Repair Paste
  {
    test: (name) => /gf patch - repair paste/i.test(name),
    unit: '64 oz Box (Openable)',
  },
  {
    test: (name) => /grounding connectors/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /hardness pick test/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /infrared thermometer gun/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /knee pads/i.test(name),
    unit: 'Pair',
  },
  {
    test: (name) => /laser measure/i.test(name),
    unit: 'Each',
  },
  // Lavina Quick Change
  {
    test: (name) => /lavina quick change/i.test(name),
    unit: 'Set of 9',
  },
  // Level Coat High Flow
  {
    test: (name) => /level coat: high flow clear/i.test(name),
    unit: '3 Gallon Kit',
  },
  {
    test: (name) => /national a95 blaster hex screw/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /oscillating multitool triangular carbide rasp/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /ph pencil for concrete/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /polyethylene tape/i.test(name),
    unit: 'Roll',
  },
  {
    test: (name) => /polyurea base coat: a/i.test(name),
    unit: '5 Gallon Pail',
  },
  {
    test: (name) => /purge flap for dl2000/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /replacement blast wheel for blast pro/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /replacement front and rear brushes for blast pro/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /replacement left and right side brushes for blast pro/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /replacement spikes for shoe-in spike shoes/i.test(name),
    unit: 'Set',
  },
  {
    test: (name) => /respirator - paint and pesticide/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /^safety glasses$/i.test(name),
    unit: 'Pair',
  },
  {
    test: (name) => /shoe-in spike shoes/i.test(name),
    unit: 'Pair',
  },
  {
    test: (name) => /shot valve assembly for blast pro/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /tornado 5\" diamond cup/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /toro ultra electric blower vac/i.test(name),
    unit: 'Each',
  },
  {
    test: (name) => /ultra durability plus/i.test(name),
    unit: '1 Quart',
  },
  {
    test: (name) => /wagner concrete pinless moisture meter/i.test(name),
    unit: 'Each',
  },
];

const skuUnitOverrides: Record<string, string> = {
  'GF-CYCLO-BASE-BT': '5 Gallon',
  'GF-CYCLO-BASE-BG': '5 Gallon',
  GF00203B: '5 Gallon',
  '10434': '5 Gallon',
  '10433B': '5 Gallon',
  '10412B': '5 Gallon',
  '10422B': '5 Gallon',
  '10411B': '5 Gallon',
  '10424B': '5 Gallon',
  '367866': '2 Gallon Pail', // Alpha Coat (Single Component)
  'GFA-21': 'Each',
};

function inferUnitSize(sku: string, name: string, category: string, rawUnit?: string) {
  if (skuUnitOverrides[sku]) return skuUnitOverrides[sku];

  const clean = rawUnit?.trim() ?? '';
  const lowerName = name.toLowerCase();
  const catLower = category.toLowerCase();

  // Force chip/quartz to 40 lb box
  if (catLower.includes('chip') || catLower.includes('quartz')) {
    return '40 lb box';
  }
  // 1/4" chip blends not in chip category
  if (/1\/4/.test(name) && /(blend|chip)/i.test(name)) {
    return '40 lb box';
  }
  // Hybrid series chip blends
  if (catLower.includes('hybrid series')) {
    return '40 lb box';
  }

  // Explicit overrides
  for (const rule of explicitUnitOverrides) {
    if (rule.test(name, category)) {
      return rule.unit;
    }
  }

  // If an explicit unit was provided, use it
  if (clean) return clean;

  // Common weight patterns
  const matchLb = name.match(/(\d+(\.\d+)?)\s*(lb|lbs|pound|pounds)/i);
  if (matchLb) {
    return `${matchLb[1]} lb`;
  }
  const matchOz = name.match(/(\d+(\.\d+)?)\s*(oz|ounce|ounces)/i);
  if (matchOz) {
    return `${matchOz[1]} oz`;
  }

  // Gallons
  const matchGallon = name.match(/(\d+(\.\d+)?)\s*(gallon|gal)/i);
  if (matchGallon) {
    return `${matchGallon[1]} Gallon`;
  }

  // Apparel/gear
  if (/hat/i.test(lowerName)) return 'Hat';
  if (/hoodie|shirt|t-?shirt|apparel/i.test(lowerName)) return 'Each';
  if (/glove/i.test(lowerName)) return 'Pair';
  if (/filter/i.test(lowerName)) return 'Filter';
  if (/liner/i.test(lowerName)) return 'Liner';
  if (/hose/i.test(lowerName)) return 'Hose';
  if (/squeegee/i.test(lowerName)) return 'Each';
  if (/tray/i.test(lowerName)) return 'Tray';
  if (/sanding pad/i.test(lowerName)) return 'Pad';
  if (/grinder|buffer|scraper|vacuum|shot blaster|floor buffer/i.test(lowerName)) return 'Tool';
  if (/ear muff/i.test(lowerName)) return 'Each';
  if (/magnet/i.test(lowerName)) return 'Each';
  if (/putty knife/i.test(lowerName)) return 'Each';
  if (/dualie/i.test(lowerName)) return 'Each';
  if (/roller frame/i.test(lowerName)) return 'Each';
  if (/cup wheel/i.test(lowerName)) return 'Each';
  if (/silica sand/i.test(lowerName)) return '50 lb bag';
  if (/calcium chloride moisture test/i.test(lowerName)) return 'Kit';
  if (/abrasion resistance additive/i.test(lowerName)) return 'Pouch';
  if (/crack chase blade/i.test(lowerName)) return 'Blade';

  // Containers
  if (/bucket/i.test(lowerName)) return 'Bucket';
  if (/pouch/i.test(lowerName)) return 'Pouch';
  if (/bag/i.test(lowerName)) return 'Bag';
  if (/case/i.test(lowerName)) return 'Case';
  if (/kit/i.test(lowerName)) return 'Kit';
  if (/pack/i.test(lowerName)) return 'Pack';
  if (/box/i.test(lowerName)) return 'Box';
  if (/container/i.test(lowerName)) return 'Container';

  return undefined;
}

async function seed() {
  const products = loadCsv();
  console.log(`Parsed ${products.length} rows from CSV`);

  // Upsert categories first
  const categoryIds = new Map<string, string>();
  for (const item of products) {
    if (categoryIds.has(item.category)) continue;
    const category = await prisma.category.upsert({
      where: { name: item.category },
      update: {},
      create: { name: item.category },
    });
    categoryIds.set(item.category, category.id);
  }

  let created = 0;
  for (const item of products) {
    const categoryId = categoryIds.get(item.category);
    const unitSize = inferUnitSize(item.sku, item.name, item.category, item.unitSize);
    await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        unitSize,
        categoryId,
        supplierType: 'GARAGE_FORCE_REQUIRED',
        productType: 'simple',
        consumableType: 'REUSABLE',
      },
      create: {
        sku: item.sku,
        name: item.name,
        unitSize,
        categoryId,
        supplierType: 'GARAGE_FORCE_REQUIRED',
        productType: 'simple',
        consumableType: 'REUSABLE',
        manufacturer: 'Garage Force',
      },
    });
    created += 1;
  }

  console.log(`Seeded/updated ${created} products into DemoViewer schema`);
}

seed()
  .catch((err) => {
    console.error('Seed failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

type CanonicalProduct = {
  category: string;
  sku: string;
  name: string;
  unitSize?: string;
};

type MainProduct = {
  id: string;
  name: string;
  category?: string;
};

type Report = {
  mapped: Array<{ mainName: string; canonicalSku: string; canonicalName: string; unitSize?: string; category: string; confidence: string }>;
  needsReview: Array<{ mainName: string; canonicalSku?: string; canonicalName?: string; unitSize?: string; category?: string; reason: string }>;
  unmappedCanonical: CanonicalProduct[];
  mainOnly: MainProduct[];
  renameOnly: Array<{ mainName: string; newName: string; found: boolean }>;
};

const overridesPath = path.resolve(process.cwd(), 'scripts', 'mapping.overrides.json');
const renamesPath = path.resolve(process.cwd(), 'scripts', 'rename.overrides.json');
const csvPath = path.resolve(process.cwd(), 'prisma', 'data', 'Inventory.xlsx - Sheet1.csv');
const mainUrl = process.env.DATABASE_URL_MAIN || process.env.DATABASE_URL;

if (!mainUrl) {
  throw new Error('DATABASE_URL (or DATABASE_URL_MAIN) must be set for main tenant');
}

const prismaMain = new PrismaClient({ datasources: { db: { url: mainUrl } } });

function loadOverrides(): Record<string, string> {
  if (!fs.existsSync(overridesPath)) return {};
  try {
    const raw = fs.readFileSync(overridesPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse overrides file; proceeding without overrides', err);
    return {};
  }
}

function loadRenames(): Record<string, string> {
  if (!fs.existsSync(renamesPath)) return {};
  try {
    const raw = fs.readFileSync(renamesPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse renames file; proceeding without renames', err);
    return {};
  }
}

// Unit inference (mirrors seedAdamFromCsv)
const explicitUnitOverrides: Array<{ test: (name: string, category: string) => boolean; unit: string }> = [
  // Stonebridge chips
  { test: (_name, category) => category.toLowerCase().includes('stonebridge series'), unit: '40 lb box' },
  // Universal Color Tint - Bulk -> 1 Gallon
  { test: (name) => /universal color tint/i.test(name) && /bulk/i.test(name), unit: '1 Gallon' },
  // Universal Color Tint (non-bulk) -> 1 Quart
  { test: (name) => /universal color tint/i.test(name) && !/bulk/i.test(name), unit: '1 Quart' },
  // Finished Sample Sets
  { test: (name, category) => /finished sample set/i.test(name) || /finished sample/i.test(category), unit: 'Each' },
  // Polos (apparel)
  { test: (name) => /polo/i.test(name), unit: 'Each' },
  // Marketing materials (default each)
  {
    test: (_name, category) =>
      /marketing materials/i.test(category) && !/brochure/i.test(category) && !/brochure/i.test(_name),
    unit: 'Each',
  },
  // Brochures (cases)
  { test: (name, category) => /brochure/i.test(name) || /brochure/i.test(category), unit: 'Case' },
  // 50-packs
  { test: (name) => /(GFA-CycloCat|GFA-CCFCcat4|GFA-CCFCcat8)/i.test(name), unit: '50 Pack' },
  // 250 pack marketing flyers
  { test: (name) => /GARAFL-00/i.test(name), unit: '250 Pack' },
  // Cyclo-1 Single Component
  { test: (name) => /cyclo-1 single component/i.test(name), unit: '2 Gallon Kit' },
  // DL3000 / Dual Cartridge Tip
  { test: (name) => /dl3000 dust collector/i.test(name), unit: 'Each' },
  { test: (name) => /dual cartridge caulk gun tip/i.test(name), unit: 'Each' },
  // ESD
  { test: (name) => /esd 4700 primer/i.test(name), unit: '1 Gallon' },
  { test: (name) => /esd 4700 top coat/i.test(name), unit: '1 Gallon' },
  { test: (name) => /esd prime & seal primer/i.test(name), unit: '1 Gallon' },
  // Fortification Formula
  { test: (name) => /fortification formula/i.test(name), unit: 'Kit' },
  // GF Flexible Control Joint Fill
  { test: (name) => /flexible control joint fill/i.test(name), unit: 'Dual Cart' },
  // GF Grip large/small
  { test: (name) => /gf grip (large|small)/i.test(name), unit: '15 lb Bucket (Openable)' },
  // GF Patch - Repair Paste
  { test: (name) => /gf patch - repair paste/i.test(name), unit: '64 oz Box (Openable)' },
  { test: (name) => /grounding connectors/i.test(name), unit: 'Each' },
  { test: (name) => /hardness pick test/i.test(name), unit: 'Each' },
  { test: (name) => /infrared thermometer gun/i.test(name), unit: 'Each' },
  { test: (name) => /knee pads/i.test(name), unit: 'Pair' },
  { test: (name) => /laser measure/i.test(name), unit: 'Each' },
  // Lavina Quick Change
  { test: (name) => /lavina quick change/i.test(name), unit: 'Set of 9' },
  // Level Coat High Flow
  { test: (name) => /level coat: high flow clear/i.test(name), unit: '3 Gallon Kit' },
  { test: (name) => /national a95 blaster hex screw/i.test(name), unit: 'Each' },
  { test: (name) => /oscillating multitool triangular carbide rasp/i.test(name), unit: 'Each' },
  { test: (name) => /ph pencil for concrete/i.test(name), unit: 'Each' },
  { test: (name) => /polyethylene tape/i.test(name), unit: 'Roll' },
  { test: (name) => /polyurea base coat: a/i.test(name), unit: '5 Gallon Pail' },
  { test: (name) => /purge flap for dl2000/i.test(name), unit: 'Each' },
  { test: (name) => /replacement blast wheel for blast pro/i.test(name), unit: 'Each' },
  { test: (name) => /replacement front and rear brushes for blast pro/i.test(name), unit: 'Each' },
  { test: (name) => /replacement left and right side brushes for blast pro/i.test(name), unit: 'Each' },
  { test: (name) => /replacement spikes for shoe-in spike shoes/i.test(name), unit: 'Set' },
  { test: (name) => /respirator - paint and pesticide/i.test(name), unit: 'Each' },
  { test: (name) => /^safety glasses$/i.test(name), unit: 'Pair' },
  { test: (name) => /shoe-in spike shoes/i.test(name), unit: 'Pair' },
  { test: (name) => /shot valve assembly for blast pro/i.test(name), unit: 'Each' },
  { test: (name) => /tornado 5\" diamond cup/i.test(name), unit: 'Each' },
  { test: (name) => /toro ultra electric blower vac/i.test(name), unit: 'Each' },
  { test: (name) => /ultra durability plus/i.test(name), unit: '1 Quart' },
  { test: (name) => /wagner concrete pinless moisture meter/i.test(name), unit: 'Each' },
  // Buckets, trays, rollers, etc.
  { test: (name) => /roller frame/i.test(name), unit: 'Each' },
  { test: (name) => /dualie/i.test(name), unit: 'Each' },
  { test: (name) => /paint tray/i.test(name), unit: 'Tray' },
  { test: (name) => /ear muff/i.test(name), unit: 'Each' },
  { test: (name) => /magnet/i.test(name), unit: 'Each' },
  { test: (name) => /silica sand 480/i.test(name), unit: '50 lb bag' },
  { test: (name) => /crack chase blade/i.test(name), unit: 'Blade' },
  { test: (name) => /squeegee/i.test(name), unit: 'Each' },
  { test: (name) => /tray/i.test(name), unit: 'Tray' },
  { test: (name) => /cup wheel/i.test(name), unit: 'Each' },
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
  '367866': '2 Gallon Pail',
  'GFA-21': 'Each',
};

function inferUnitSize(sku: string, name: string, category: string, rawUnit?: string) {
  if (skuUnitOverrides[sku]) return skuUnitOverrides[sku];

  const clean = rawUnit?.trim() ?? '';
  const lowerName = name.toLowerCase();
  const catLower = category.toLowerCase();

  if (catLower.includes('chip') || catLower.includes('quartz')) return '40 lb box';
  if (/1\/4/.test(name) && /(blend|chip)/i.test(name)) return '40 lb box';
  if (catLower.includes('hybrid series')) return '40 lb box';

  for (const rule of explicitUnitOverrides) {
    if (rule.test(name, category)) return rule.unit;
  }

  if (clean) return clean;

  const matchLb = name.match(/(\d+(\.\d+)?)\s*(lb|lbs|pound|pounds)/i);
  if (matchLb) return `${matchLb[1]} lb`;
  const matchOz = name.match(/(\d+(\.\d+)?)\s*(oz|ounce|ounces)/i);
  if (matchOz) return `${matchOz[1]} oz`;
  const matchGallon = name.match(/(\d+(\.\d+)?)\s*(gallon|gal)/i);
  if (matchGallon) return `${matchGallon[1]} Gallon`;

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

function loadCanonical(): CanonicalProduct[] {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const records: string[][] = parse(raw, {
    relaxColumnCount: true,
    skipEmptyLines: false,
  });

  let currentCategory = '';
  let pendingUnitSize: string | undefined;
  const products: CanonicalProduct[] = [];

  const isHeaderRow = (row: string[]) =>
    (row[0]?.trim().toLowerCase() === 'part #' && row[1]?.trim().toLowerCase() === 'description') ||
    (row[0]?.trim() === '' && row[1]?.trim().toLowerCase() === 'description');

  const shouldSkipCategory = (name: string) =>
    ['equipment', 'tools'].some((word) => name.toLowerCase().includes(word));

  for (const row of records) {
    const [partRaw = '', descRaw = '', priceRaw = '', optionsRaw = ''] = row.map((cell) =>
      (cell ?? '').trim(),
    );

    if (!partRaw && !descRaw && !priceRaw && !optionsRaw) {
      continue;
    }

    if (partRaw && !descRaw && !priceRaw && !optionsRaw) {
      if (!shouldSkipCategory(partRaw)) {
        currentCategory = partRaw;
      } else {
        currentCategory = '';
      }
      continue;
    }

    if (isHeaderRow(row)) continue;

    if (!partRaw && !descRaw && optionsRaw) {
      pendingUnitSize = optionsRaw;
      continue;
    }

    if (!partRaw) continue;

    const cleanedDesc = descRaw.replace(/[�]+/g, '').trim();
    const unitSize = pendingUnitSize || optionsRaw || undefined;
    if (!currentCategory) currentCategory = 'Uncategorized';

    products.push({
      category: currentCategory,
      sku: partRaw,
      name: cleanedDesc || partRaw,
      unitSize: inferUnitSize(partRaw, cleanedDesc || partRaw, currentCategory, unitSize),
    });

    pendingUnitSize = undefined;
  }

  return products;
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMatch(mainName: string, canonName: string) {
  const nMain = normalizeName(mainName);
  const nCanon = normalizeName(canonName);
  if (nMain === nCanon) return 1.0;
  if (nMain.includes(nCanon) || nCanon.includes(nMain)) return 0.6;
  return 0;
}

function findBestMatch(mainName: string, canonical: CanonicalProduct[]) {
  let best: { product: CanonicalProduct; score: number } | null = null;
  for (const item of canonical) {
    const score = scoreMatch(mainName, item.name);
    if (score > (best?.score ?? 0)) {
      best = { product: item, score };
    }
  }
  return best;
}

async function loadMainProducts(): Promise<MainProduct[]> {
  const products = await prismaMain.product.findMany({
    select: {
      id: true,
      name: true,
      category: { select: { name: true } },
    },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category?.name,
  }));
}

async function main() {
  const overrides = loadOverrides();
  const renames = loadRenames();
  const canonical = loadCanonical();
  const mainProducts = await loadMainProducts();

  const canonicalBySku = new Map(canonical.map((p) => [p.sku, p]));
  const canonicalUsed = new Set<string>();

  const report: Report = {
    mapped: [],
    needsReview: [],
    unmappedCanonical: [],
    mainOnly: [],
    renameOnly: [],
  };

  // Capture rename-only items (no SKU) for reference
  for (const [mainName, newName] of Object.entries(renames)) {
    const found = Boolean(mainProducts.find((p) => p.name === mainName));
    report.renameOnly.push({ mainName, newName, found });
  }

  for (const mainProd of mainProducts) {
    const overrideSku = overrides[mainProd.name];
    if (overrideSku) {
      const target = canonicalBySku.get(overrideSku);
      if (target) {
        canonicalUsed.add(target.sku);
        report.mapped.push({
          mainName: mainProd.name,
          canonicalSku: target.sku,
          canonicalName: target.name,
          unitSize: target.unitSize,
          category: target.category,
          confidence: 'override',
        });
        continue;
      }
    }

    const best = findBestMatch(mainProd.name, canonical);
    if (best && best.score >= 0.9) {
      canonicalUsed.add(best.product.sku);
      report.mapped.push({
        mainName: mainProd.name,
        canonicalSku: best.product.sku,
        canonicalName: best.product.name,
        unitSize: best.product.unitSize,
        category: best.product.category,
        confidence: 'high',
      });
    } else if (best && best.score >= 0.6) {
      report.needsReview.push({
        mainName: mainProd.name,
        canonicalSku: best.product.sku,
        canonicalName: best.product.name,
        unitSize: best.product.unitSize,
        category: best.product.category,
        reason: `low confidence match (score ${best.score.toFixed(2)})`,
      });
    } else {
      report.mainOnly.push(mainProd);
    }
  }

  for (const item of canonical) {
    if (!canonicalUsed.has(item.sku)) {
      report.unmappedCanonical.push(item);
    }
  }

  const outPath = path.resolve(process.cwd(), 'scripts', 'report-main-vs-adam.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Report written to ${outPath}`);
  console.log(`Mapped: ${report.mapped.length}, Needs review: ${report.needsReview.length}, Unmapped Adam: ${report.unmappedCanonical.length}, Main-only: ${report.mainOnly.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaMain.$disconnect();
  });

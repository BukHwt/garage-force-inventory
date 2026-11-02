import { Prisma } from '@prisma/client';
import { Request, Response, Router } from 'express';
import { getPrismaClient, getTenantKeys } from '../lib/prismaTenants.js';

const router = Router();

const TENANT_LABELS: Record<string, string> = {
  main: 'Demo Franchise North',
  adam: 'Demo Franchise South',
};

type NeighborInventoryLocation = {
  locationId: string;
  locationName: string;
  quantity: number;
};

type NeighborInventoryProduct = {
  productId: string;
  name: string;
  sku: string | null;
  vendorPartNumber: string | null;
  unitSize: string | null;
  category: { id: string; name: string } | null;
  totalQuantity: number;
  locations: NeighborInventoryLocation[];
};

function normalizeTenant(value: unknown) {
  return typeof value === 'string' ? value.toLowerCase().trim() : '';
}

function normalizeSearch(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

router.get('/tenants', (req: Request, res: Response) => {
  const tenants = getTenantKeys()
    .filter((tenantKey) => tenantKey !== req.tenant)
    .map((tenantKey) => ({
      key: tenantKey,
      label: TENANT_LABELS[tenantKey] ?? tenantKey,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  res.json({
    currentTenant: req.tenant,
    tenants,
  });
});

router.get('/inventory', async (req: Request, res: Response) => {
  try {
    const targetTenant = normalizeTenant(req.query.tenant);
    const search = normalizeSearch(req.query.search);

    if (!targetTenant) {
      return res.status(400).json({ error: 'Target tenant is required.' });
    }

    if (targetTenant === req.tenant) {
      return res.status(400).json({ error: 'Neighbor inventory must target a different tenant.' });
    }

    const configuredTenants = getTenantKeys();
    if (!configuredTenants.includes(targetTenant)) {
      return res.status(400).json({ error: 'Unknown tenant requested.' });
    }

    const targetPrisma = getPrismaClient(targetTenant);
    const where: Prisma.InventoryItemWhereInput = {
      quantity: { gt: 0 },
      ...(search
        ? {
            product: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { vendorPartNumber: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const inventoryItems = await targetPrisma.inventoryItem.findMany({
      where,
      include: {
        product: {
          include: {
            category: true,
          },
        },
        location: true,
      },
      orderBy: [{ product: { name: 'asc' } }, { location: { name: 'asc' } }],
    });

    const byProductId = new Map<
      string,
      NeighborInventoryProduct & { locationMap: Map<string, NeighborInventoryLocation> }
    >();

    for (const item of inventoryItems) {
      const existingProduct = byProductId.get(item.productId);
      if (!existingProduct) {
        byProductId.set(item.productId, {
          productId: item.productId,
          name: item.product.name,
          sku: item.product.sku,
          vendorPartNumber: item.product.vendorPartNumber,
          unitSize: item.product.unitSize,
          category: item.product.category
            ? {
                id: item.product.category.id,
                name: item.product.category.name,
              }
            : null,
          totalQuantity: item.quantity,
          locations: [],
          locationMap: new Map([
            [
              item.locationId,
              {
                locationId: item.locationId,
                locationName: item.location.name,
                quantity: item.quantity,
              },
            ],
          ]),
        });
        continue;
      }

      existingProduct.totalQuantity += item.quantity;
      const existingLocation = existingProduct.locationMap.get(item.locationId);
      if (existingLocation) {
        existingLocation.quantity += item.quantity;
      } else {
        existingProduct.locationMap.set(item.locationId, {
          locationId: item.locationId,
          locationName: item.location.name,
          quantity: item.quantity,
        });
      }
    }

    const products = Array.from(byProductId.values())
      .map((product) => {
        const { locationMap, ...rest } = product;
        return {
          ...rest,
          locations: Array.from(locationMap.values()).sort((a, b) =>
            a.locationName.localeCompare(b.locationName),
          ),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      sourceTenant: targetTenant,
      sourceLabel: TENANT_LABELS[targetTenant] ?? targetTenant,
      products,
    });
  } catch (error) {
    console.error('Error fetching neighbor inventory:', error);
    res.status(500).json({ error: 'Failed to fetch neighbor inventory' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireEditor } from '../middleware/auth.js';
import { aggregateInventoryItems } from '../lib/inventory.js';

const router = Router();

class RequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

router.use((req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return requireEditor(req, res, next);
});

type InventoryWithLocation = Prisma.InventoryItemGetPayload<{
  include: { location: true };
}>;

async function getInventoryRows(
  prisma: Prisma.TransactionClient | Request['prisma'],
  productId: string,
  locationId: string,
) {
  return prisma.inventoryItem.findMany({
    where: { productId, locationId },
    include: { location: true },
    orderBy: { createdAt: 'asc' },
  });
}

function getTotalQuantity(items: Array<{ quantity: number }>) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

async function setCanonicalInventoryQuantity(
  prisma: Prisma.TransactionClient | Request['prisma'],
  params: {
    productId: string;
    locationId: string;
    quantity: number;
    status?: 'SEALED' | 'OPEN';
    batchNumber?: string | null;
    expiresAt?: Date | null;
    notes?: string | null;
  },
) {
  const items = await prisma.inventoryItem.findMany({
    where: {
      productId: params.productId,
      locationId: params.locationId,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (params.quantity <= 0) {
    if (items.length) {
      await prisma.inventoryItem.deleteMany({
        where: {
          id: { in: items.map((item) => item.id) },
        },
      });
    }
    return null;
  }

  const primary = items[0];
  const nextStatus = params.status ?? 'SEALED';

  if (!primary) {
    return prisma.inventoryItem.create({
      data: {
        productId: params.productId,
        locationId: params.locationId,
        quantity: params.quantity,
        status: nextStatus,
        batchNumber: params.batchNumber ?? undefined,
        expiresAt: params.expiresAt ?? undefined,
        notes: params.notes ?? undefined,
      },
      include: {
        location: true,
      },
    });
  }

  if (items.length > 1) {
    await prisma.inventoryItem.deleteMany({
      where: {
        id: { in: items.slice(1).map((item) => item.id) },
      },
    });
  }

  return prisma.inventoryItem.update({
    where: { id: primary.id },
    data: {
      quantity: params.quantity,
      status: nextStatus,
      batchNumber: params.batchNumber === undefined ? primary.batchNumber : params.batchNumber,
      expiresAt: params.expiresAt === undefined ? primary.expiresAt : params.expiresAt,
      notes: params.notes === undefined ? primary.notes : params.notes,
    },
    include: {
      location: true,
    },
  });
}

async function buildInventorySummary(
  prisma: Prisma.TransactionClient | Request['prisma'],
  productId: string,
  locationId: string,
) {
  const items = await getInventoryRows(prisma, productId, locationId);
  return aggregateInventoryItems(items as InventoryWithLocation[])[0] ?? null;
}

// Get all inventory items with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { productId, locationId, search } = req.query;

    const inventoryItems = await req.prisma.inventoryItem.findMany({
      where: {
        ...(productId && { productId: productId as string }),
        ...(locationId && { locationId: locationId as string }),
        ...(search && {
          OR: [
            {
              product: {
                is: {
                  name: {
                    contains: search as string,
                  },
                },
              },
            },
            {
              product: {
                is: {
                  description: {
                    contains: search as string,
                  },
                },
              },
            },
            {
              product: {
                is: {
                  sku: {
                    contains: search as string,
                  },
                },
              },
            },
            {
              batchNumber: {
                contains: search as string,
              },
            },
          ],
        }),
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        location: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const grouped = new Map<string, typeof inventoryItems>();
    for (const item of inventoryItems) {
      const key = `${item.productId}:${item.locationId}`;
      const bucket = grouped.get(key) ?? [];
      bucket.push(item);
      grouped.set(key, bucket);
    }

    res.json(
      Array.from(grouped.values()).map((items) => ({
        ...items[0],
        quantity: getTotalQuantity(items),
        status: 'SEALED',
      })),
    );
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

// Get a single inventory item by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inventoryItem = await req.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        location: true,
      },
    });

    if (!inventoryItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const relatedItems = await getInventoryRows(req.prisma, inventoryItem.productId, inventoryItem.locationId);
    const aggregated = aggregateInventoryItems(relatedItems as InventoryWithLocation[])[0];

    if (!aggregated) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({
      ...inventoryItem,
      id: aggregated.id,
      quantity: aggregated.quantity,
      status: aggregated.status,
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

router.patch('/stock', async (req: Request, res: Response) => {
  try {
    const { productId, locationId, quantity } = req.body;

    if (!productId || !locationId) {
      return res.status(400).json({ error: 'Product and location are required' });
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'Quantity must be a non-negative integer' });
    }

    const [product, location] = await Promise.all([
      req.prisma.product.findUnique({ where: { id: productId } }),
      req.prisma.location.findUnique({ where: { id: locationId } }),
    ]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const result = await req.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingItems = await getInventoryRows(tx, productId, locationId);
      const previousQuantity = getTotalQuantity(existingItems);
      const delta = quantity - previousQuantity;

      const inventoryItem = await setCanonicalInventoryQuantity(tx, {
        productId,
        locationId,
        quantity,
        status: 'SEALED',
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          transactionType: 'ADJUSTMENT',
          fromLocationId: locationId,
          quantity: delta,
          notes: `Adjusted stock at ${location.name} from ${previousQuantity} to ${quantity}`,
          performedByUserId: req.user?.id,
        },
      });

      return {
        inventoryItem,
        transaction,
        previousQuantity,
        nextQuantity: quantity,
      };
    });

    const summary = await buildInventorySummary(req.prisma, productId, locationId);
    res.json({
      inventoryItem: summary,
      previousQuantity: result.previousQuantity,
      nextQuantity: result.nextQuantity,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error('Error setting inventory stock:', error);
    res.status(500).json({ error: 'Failed to set inventory stock' });
  }
});

// Adjust inventory quantity (legacy endpoint)
router.patch('/:id/adjust', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adjustment } = req.body;

    if (typeof adjustment !== 'number') {
      return res.status(400).json({ error: 'Adjustment must be a number' });
    }

    const currentItem = await req.prisma.inventoryItem.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!currentItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const existingItems = await getInventoryRows(req.prisma, currentItem.productId, currentItem.locationId);
    const currentQuantity = getTotalQuantity(existingItems);
    const nextQuantity = currentQuantity + adjustment;

    if (nextQuantity < 0) {
      return res.status(400).json({ error: 'Adjustment would result in negative quantity' });
    }

    await req.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await setCanonicalInventoryQuantity(tx, {
        productId: currentItem.productId,
        locationId: currentItem.locationId,
        quantity: nextQuantity,
        status: 'SEALED',
      });

      await tx.inventoryTransaction.create({
        data: {
          productId: currentItem.productId,
          transactionType: 'ADJUSTMENT',
          fromLocationId: currentItem.locationId,
          quantity: adjustment,
          notes: `Adjusted stock at ${currentItem.location.name} from ${currentQuantity} to ${nextQuantity}`,
          performedByUserId: req.user?.id,
        },
      });
    });

    const summary = await buildInventorySummary(req.prisma, currentItem.productId, currentItem.locationId);
    res.json(summary);
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

// Transfer inventory between locations
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const { productId, fromLocationId, toLocationId, quantity, notes } = req.body;

    if (!productId || !fromLocationId || !toLocationId) {
      return res.status(400).json({ error: 'Product and both locations are required' });
    }

    if (fromLocationId === toLocationId) {
      return res.status(400).json({ error: 'Source and destination locations must be different' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    const [product, fromLocation, toLocation] = await Promise.all([
      req.prisma.product.findUnique({ where: { id: productId } }),
      req.prisma.location.findUnique({ where: { id: fromLocationId } }),
      req.prisma.location.findUnique({ where: { id: toLocationId } }),
    ]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (!fromLocation) {
      return res.status(404).json({ error: 'Source location not found' });
    }
    if (!toLocation) {
      return res.status(404).json({ error: 'Destination location not found' });
    }

    const result = await req.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const sourceItems = await getInventoryRows(tx, productId, fromLocationId);
      const sourceQuantity = getTotalQuantity(sourceItems);

      if (sourceQuantity < quantity) {
        throw new RequestError(`Insufficient quantity at source location. Available: ${sourceQuantity}, Requested: ${quantity}`);
      }

      const destinationItems = await getInventoryRows(tx, productId, toLocationId);
      const destinationQuantity = getTotalQuantity(destinationItems);

      await setCanonicalInventoryQuantity(tx, {
        productId,
        locationId: fromLocationId,
        quantity: sourceQuantity - quantity,
        status: 'SEALED',
      });

      await setCanonicalInventoryQuantity(tx, {
        productId,
        locationId: toLocationId,
        quantity: destinationQuantity + quantity,
        status: 'SEALED',
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          transactionType: 'TRANSFER',
          fromLocationId,
          toLocationId,
          quantity,
          notes: notes || `Transferred ${quantity} ${product.unitSize || 'units'} from ${fromLocation.name} to ${toLocation.name}`,
          performedByUserId: req.user?.id,
        },
      });

      return { transaction };
    });

    const [fromItem, toItem] = await Promise.all([
      buildInventorySummary(req.prisma, productId, fromLocationId),
      buildInventorySummary(req.prisma, productId, toLocationId),
    ]);

    res.status(200).json({ fromItem, toItem, transaction: result.transaction });
  } catch (error) {
    console.error('Error transferring inventory:', error);
    if (error instanceof RequestError) {
      return res.status(error.status).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Failed to transfer inventory';
    res.status(500).json({ error: message });
  }
});

// Receive inventory (creates transaction and updates/creates inventory item)
router.post('/receive', async (req: Request, res: Response) => {
  try {
    const { productId, locationId, quantity, batchNumber, expiresAt, notes } = req.body;

    if (!productId || !locationId) {
      return res.status(400).json({ error: 'Product and location are required' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    const [product, location] = await Promise.all([
      req.prisma.product.findUnique({ where: { id: productId } }),
      req.prisma.location.findUnique({ where: { id: locationId } }),
    ]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const result = await req.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingItems = await getInventoryRows(tx, productId, locationId);
      const previousQuantity = getTotalQuantity(existingItems);
      const inventoryItem = await setCanonicalInventoryQuantity(tx, {
        productId,
        locationId,
        quantity: previousQuantity + quantity,
        status: 'SEALED',
        batchNumber: batchNumber ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes: notes ?? null,
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          transactionType: 'RECEIPT',
          toLocationId: locationId,
          quantity,
          notes: notes || `Received ${quantity} ${product.unitSize || 'units'} at ${location.name}`,
          performedByUserId: req.user?.id,
        },
      });

      return { inventoryItem, transaction };
    });

    const summary = await buildInventorySummary(req.prisma, productId, locationId);
    res.status(201).json({ inventoryItem: summary, transaction: result.transaction });
  } catch (error) {
    console.error('Error receiving inventory:', error);
    res.status(500).json({ error: 'Failed to receive inventory' });
  }
});

// Deprecated endpoints retained for compatibility
router.post('/unseal', async (_req: Request, res: Response) => {
  res.status(410).json({ error: 'Unseal is no longer supported in the simplified inventory workflow' });
});

router.post('/use', async (req: Request, res: Response) => {
  try {
    const { productId, locationId, quantity, notes } = req.body;

    if (!productId || !locationId) {
      return res.status(400).json({ error: 'Product and location are required' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    const [product, location] = await Promise.all([
      req.prisma.product.findUnique({ where: { id: productId } }),
      req.prisma.location.findUnique({ where: { id: locationId } }),
    ]);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const result = await req.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const items = await getInventoryRows(tx, productId, locationId);
      const previousQuantity = getTotalQuantity(items);

      if (previousQuantity < quantity) {
        throw new RequestError(`Insufficient quantity at location. Available: ${previousQuantity}, Requested: ${quantity}`);
      }

      const nextQuantity = previousQuantity - quantity;
      await setCanonicalInventoryQuantity(tx, {
        productId,
        locationId,
        quantity: nextQuantity,
        status: 'SEALED',
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          transactionType: 'ADJUSTMENT',
          fromLocationId: locationId,
          quantity: nextQuantity - previousQuantity,
          notes: notes || `Reduced stock at ${location.name} from ${previousQuantity} to ${nextQuantity}`,
          performedByUserId: req.user?.id,
        },
      });

      return { transaction };
    });

    const summary = await buildInventorySummary(req.prisma, productId, locationId);
    res.status(200).json({ inventoryItem: summary, transaction: result.transaction });
  } catch (error) {
    console.error('Error using inventory:', error);
    if (error instanceof RequestError) {
      return res.status(error.status).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : 'Failed to use inventory';
    res.status(500).json({ error: message });
  }
});

export default router;

import { Request, Response, Router } from 'express';
import { SharedOrderStatus } from '@prisma/client';
import { requireEditor } from '../middleware/auth.js';
import { getPrismaClient } from '../lib/prismaTenants.js';

const router = Router();

const mainPrisma = getPrismaClient('main');
const STATUS_VALUES = new Set<SharedOrderStatus>(['OPEN', 'ORDERED', 'RECEIVED', 'CANCELLED']);

router.use((req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return requireEditor(req, res, next);
});

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text.length ? text : null;
}

function parsePositiveInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseNonNegativeIntOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function parseStatus(value: unknown) {
  const status = normalizeText(value).toUpperCase() as SharedOrderStatus;
  if (STATUS_VALUES.has(status)) {
    return status;
  }
  return null;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const status = parseStatus(req.query.status);
    const search = normalizeText(req.query.search);

    const items = await mainPrisma.sharedOrderItem.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { productName: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { vendorPartNumber: { contains: search, mode: 'insensitive' } },
                { requestedByUserName: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    res.json(items);
  } catch (error) {
    console.error('Error fetching shared orders:', error);
    res.status(500).json({ error: 'Failed to fetch shared orders' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const productName = normalizeText(req.body?.productName);
    const quantity = parsePositiveInt(req.body?.quantity);
    const estimatedUnitPriceCents = parseNonNegativeIntOrNull(req.body?.estimatedUnitPriceCents);

    if (productName.length < 2) {
      return res.status(400).json({ error: 'Product name must be at least 2 characters.' });
    }

    if (!quantity) {
      return res.status(400).json({ error: 'Quantity must be a positive whole number.' });
    }

    if (req.body?.estimatedUnitPriceCents !== undefined && estimatedUnitPriceCents === null) {
      return res.status(400).json({ error: 'Estimated unit price must be a non-negative whole number of cents.' });
    }

    const created = await mainPrisma.sharedOrderItem.create({
      data: {
        productName,
        sku: normalizeOptionalText(req.body?.sku),
        vendorPartNumber: normalizeOptionalText(req.body?.vendorPartNumber),
        unitSize: normalizeOptionalText(req.body?.unitSize),
        categoryName: normalizeOptionalText(req.body?.categoryName),
        quantity,
        estimatedUnitPriceCents,
        notes: normalizeOptionalText(req.body?.notes),
        status: 'OPEN',
        requestedByTenant: req.tenant,
        requestedByUserId: req.user?.id ?? null,
        requestedByUserName: req.user?.name ?? 'Unknown',
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating shared order item:', error);
    res.status(500).json({ error: 'Failed to create shared order item' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productName = normalizeText(req.body?.productName);
    const quantity = parsePositiveInt(req.body?.quantity);
    const estimatedUnitPriceCents = parseNonNegativeIntOrNull(req.body?.estimatedUnitPriceCents);

    if (productName.length < 2) {
      return res.status(400).json({ error: 'Product name must be at least 2 characters.' });
    }

    if (!quantity) {
      return res.status(400).json({ error: 'Quantity must be a positive whole number.' });
    }

    if (req.body?.estimatedUnitPriceCents !== undefined && estimatedUnitPriceCents === null) {
      return res.status(400).json({ error: 'Estimated unit price must be a non-negative whole number of cents.' });
    }

    const updated = await mainPrisma.sharedOrderItem.update({
      where: { id },
      data: {
        productName,
        sku: normalizeOptionalText(req.body?.sku),
        vendorPartNumber: normalizeOptionalText(req.body?.vendorPartNumber),
        unitSize: normalizeOptionalText(req.body?.unitSize),
        categoryName: normalizeOptionalText(req.body?.categoryName),
        quantity,
        estimatedUnitPriceCents,
        notes: normalizeOptionalText(req.body?.notes),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating shared order item:', error);
    res.status(500).json({ error: 'Failed to update shared order item' });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = parseStatus(req.body?.status);
    if (!status) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const now = new Date();
    const data: Record<string, unknown> = { status };

    if (status === 'ORDERED') {
      data.orderedAt = now;
      data.orderedByTenant = req.tenant;
      data.orderedByUserId = req.user?.id ?? null;
      data.orderedByUserName = req.user?.name ?? 'Unknown';
    }

    if (status === 'RECEIVED') {
      data.receivedAt = now;
      data.receivedByTenant = req.tenant;
      data.receivedByUserId = req.user?.id ?? null;
      data.receivedByUserName = req.user?.name ?? 'Unknown';
    }

    if (status === 'CANCELLED') {
      data.cancelledAt = now;
      data.cancelledByTenant = req.tenant;
      data.cancelledByUserId = req.user?.id ?? null;
      data.cancelledByUserName = req.user?.name ?? 'Unknown';
    }

    const updated = await mainPrisma.sharedOrderItem.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error changing shared order status:', error);
    res.status(500).json({ error: 'Failed to update shared order status' });
  }
});

router.post('/mark-open-ordered', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const result = await mainPrisma.sharedOrderItem.updateMany({
      where: { status: 'OPEN' },
      data: {
        status: 'ORDERED',
        orderedAt: now,
        orderedByTenant: req.tenant,
        orderedByUserId: req.user?.id ?? null,
        orderedByUserName: req.user?.name ?? 'Unknown',
      },
    });

    res.json({ updatedCount: result.count });
  } catch (error) {
    console.error('Error marking open items as ordered:', error);
    res.status(500).json({ error: 'Failed to mark open items as ordered' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await mainPrisma.sharedOrderItem.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting shared order item:', error);
    res.status(500).json({ error: 'Failed to delete shared order item' });
  }
});

export default router;

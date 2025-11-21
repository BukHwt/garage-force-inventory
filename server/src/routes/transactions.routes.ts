import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { requireEditor } from '../middleware/auth.js';

type InventoryStatus = 'SEALED' | 'OPEN';

const includeTransactionRelations = {
  product: {
    select: {
      id: true,
      name: true,
      unitSize: true,
      sku: true,
    },
  },
  fromLocation: {
    select: {
      id: true,
      name: true,
    },
  },
  toLocation: {
    select: {
      id: true,
      name: true,
    },
  },
  performedBy: {
    select: {
      id: true,
      name: true,
    },
  },
  revertedBy: {
    select: {
      id: true,
      name: true,
    },
  },
};

type TransactionWithRelations = Prisma.InventoryTransactionGetPayload<{
  include: typeof includeTransactionRelations;
}>;

const router = Router();
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

class RollbackError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RollbackError';
    this.status = status;
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const limitParam = parseInt((req.query.limit as string) ?? '', 10);
    const take = Number.isFinite(limitParam)
      ? Math.max(1, Math.min(limitParam, MAX_LIMIT))
      : DEFAULT_LIMIT;

    const transactions = await prisma.inventoryTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: includeTransactionRelations,
    });

    const enriched = await Promise.all(
      transactions.map(async (transaction) => ({
        ...transaction,
        rollbackEligible: await canRollbackTransaction(transaction),
      }))
    );

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.post('/:id/rollback', requireEditor, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const transaction = await prisma.inventoryTransaction.findUnique({
      where: { id },
      include: includeTransactionRelations,
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.isReverted) {
      return res.status(400).json({ error: 'Transaction was already rolled back' });
    }

    const relevantLocationIds = getRelevantLocationIds(transaction);
    await assertNoSubsequentActivity(transaction.productId, transaction.createdAt, relevantLocationIds);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const quantity = Math.abs(transaction.quantity);

      switch (transaction.transactionType) {
        case 'RECEIPT': {
          if (!transaction.toLocationId) {
            throw new RollbackError('Receipt transaction is missing a destination location');
          }
          await decrementInventory(tx, {
            productId: transaction.productId,
            locationId: transaction.toLocationId,
            quantity,
            status: 'SEALED',
          });
          break;
        }
        case 'CONSUMPTION': {
          if (!transaction.fromLocationId) {
            throw new RollbackError('Consumption transaction is missing a source location');
          }
          await incrementInventory(tx, {
            productId: transaction.productId,
            locationId: transaction.fromLocationId,
            quantity,
            status: 'OPEN',
          });
          break;
        }
        case 'TRANSFER': {
          if (!transaction.fromLocationId || !transaction.toLocationId) {
            throw new RollbackError('Transfer transaction is missing location data');
          }
          await decrementInventory(tx, {
            productId: transaction.productId,
            locationId: transaction.toLocationId,
            quantity,
            status: 'SEALED',
          });
          await incrementInventory(tx, {
            productId: transaction.productId,
            locationId: transaction.fromLocationId,
            quantity,
            status: 'SEALED',
          });
          break;
        }
        case 'ADJUSTMENT': {
          if (!transaction.fromLocationId) {
            throw new RollbackError('Adjustment transaction is missing location data');
          }
          await decrementInventory(tx, {
            productId: transaction.productId,
            locationId: transaction.fromLocationId,
            quantity,
            status: 'OPEN',
          });
          await incrementInventory(tx, {
            productId: transaction.productId,
            locationId: transaction.fromLocationId,
            quantity,
            status: 'SEALED',
          });
          break;
        }
        default:
          throw new RollbackError(`Rollback is not supported for ${transaction.transactionType} transactions`, 422);
      }

      return tx.inventoryTransaction.update({
        where: { id: transaction.id },
        data: {
          isReverted: true,
          revertedAt: new Date(),
          revertedByUserId: req.user?.id,
        },
        include: includeTransactionRelations,
      });
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof RollbackError) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error('Error rolling back transaction:', error);
    res.status(500).json({ error: 'Failed to roll back transaction' });
  }
});

async function assertNoSubsequentActivity(productId: string, createdAt: Date, locationIds: string[]) {
  if (!locationIds.length) {
    return;
  }

  const hasConflict = await hasSubsequentActivity(productId, createdAt, locationIds);

  if (hasConflict) {
    throw new RollbackError(
      'This transaction cannot be rolled back because newer activity exists for the affected product at the same location.',
    );
  }
}

async function decrementInventory(
  tx: Prisma.TransactionClient,
  params: { productId: string; locationId: string; quantity: number; status: InventoryStatus },
) {
  const { productId, locationId, quantity, status } = params;
  if (quantity <= 0) {
    throw new RollbackError('Quantity must be greater than zero');
  }

  const items = await tx.inventoryItem.findMany({
    where: { productId, locationId, status },
    orderBy: { createdAt: 'asc' },
  });

  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  if (total < quantity) {
    throw new RollbackError(`Insufficient ${status.toLowerCase()} inventory available at the selected location`);
  }

  let remaining = quantity;
  for (const item of items) {
    if (remaining <= 0) break;
    const deduction = Math.min(item.quantity, remaining);
    const newQuantity = item.quantity - deduction;
    if (newQuantity <= 0) {
      await tx.inventoryItem.delete({ where: { id: item.id } });
    } else {
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: newQuantity },
      });
    }
    remaining -= deduction;
  }
}

async function incrementInventory(
  tx: Prisma.TransactionClient,
  params: { productId: string; locationId: string; quantity: number; status: InventoryStatus },
) {
  const { productId, locationId, quantity, status } = params;
  if (quantity <= 0) {
    throw new RollbackError('Quantity must be greater than zero');
  }

  const existing = await tx.inventoryItem.findFirst({
    where: { productId, locationId, status },
  });

  if (existing) {
    await tx.inventoryItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await tx.inventoryItem.create({
      data: {
        productId,
        locationId,
        quantity,
        status,
      },
    });
  }
}

function getRelevantLocationIds(transaction: TransactionWithRelations) {
  switch (transaction.transactionType) {
    case 'RECEIPT':
      return transaction.toLocationId ? [transaction.toLocationId] : [];
    case 'CONSUMPTION':
      return transaction.fromLocationId ? [transaction.fromLocationId] : [];
    case 'TRANSFER':
      return [transaction.fromLocationId, transaction.toLocationId].filter((value): value is string => Boolean(value));
    case 'ADJUSTMENT':
      return transaction.fromLocationId ? [transaction.fromLocationId] : [];
    default:
      return [];
  }
}

async function canRollbackTransaction(transaction: TransactionWithRelations) {
  if (transaction.isReverted) {
    return false;
  }

  const supportedTypes: Record<string, true> = {
    RECEIPT: true,
    CONSUMPTION: true,
    TRANSFER: true,
    ADJUSTMENT: true,
  };

  if (!supportedTypes[transaction.transactionType]) {
    return false;
  }

  const relevantLocations = getRelevantLocationIds(transaction);
  if (!relevantLocations.length) {
    return false;
  }

  if (await hasSubsequentActivity(transaction.productId, transaction.createdAt, relevantLocations)) {
    return false;
  }

  const quantity = Math.abs(transaction.quantity);
  switch (transaction.transactionType) {
    case 'RECEIPT': {
      const destination = transaction.toLocationId;
      if (!destination) return false;
      return hasSufficientInventory(transaction.productId, destination, 'SEALED', quantity);
    }
    case 'TRANSFER': {
      const destination = transaction.toLocationId;
      if (!destination) return false;
      return hasSufficientInventory(transaction.productId, destination, 'SEALED', quantity);
    }
    case 'ADJUSTMENT': {
      const locationId = transaction.fromLocationId;
      if (!locationId) return false;
      return hasSufficientInventory(transaction.productId, locationId, 'OPEN', quantity);
    }
    case 'CONSUMPTION':
    default:
      return true;
  }
}

async function hasSufficientInventory(
  productId: string,
  locationId: string,
  status: InventoryStatus,
  quantity: number,
) {
  if (quantity <= 0) {
    return false;
  }

  const aggregate = await prisma.inventoryItem.aggregate({
    _sum: {
      quantity: true,
    },
    where: {
      productId,
      locationId,
      status,
    },
  });

  const available = aggregate._sum.quantity ?? 0;
  return available >= quantity;
}

async function hasSubsequentActivity(productId: string, createdAt: Date, locationIds: string[]) {
  if (!locationIds.length) {
    return false;
  }

  const conflict = await prisma.inventoryTransaction.findFirst({
    where: {
      productId,
      isReverted: false,
      createdAt: { gt: createdAt },
      OR: locationIds.flatMap((locationId) => ([
        { fromLocationId: locationId },
        { toLocationId: locationId },
      ])),
    },
    orderBy: { createdAt: 'asc' },
  });

  return Boolean(conflict);
}

export default router;

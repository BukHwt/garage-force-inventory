import { Router, Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { requireEditor } from '../middleware/auth.js';

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
  const prisma = req.prisma;
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
        rollbackEligible: await canRollbackTransaction(prisma, transaction),
      })),
    );

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.post('/:id/rollback', requireEditor, async (req: Request, res: Response) => {
  const { id } = req.params;
  const prisma = req.prisma;

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
    await assertNoSubsequentActivity(prisma, transaction.productId, transaction.createdAt, relevantLocationIds);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      switch (transaction.transactionType) {
        case 'RECEIPT': {
          if (!transaction.toLocationId) {
            throw new RollbackError('Receipt transaction is missing a destination location');
          }

          await adjustLocationQuantity(tx, {
            productId: transaction.productId,
            locationId: transaction.toLocationId,
            delta: -Math.abs(transaction.quantity),
          });
          break;
        }
        case 'TRANSFER': {
          if (!transaction.fromLocationId || !transaction.toLocationId) {
            throw new RollbackError('Transfer transaction is missing location data');
          }

          const quantity = Math.abs(transaction.quantity);
          await adjustLocationQuantity(tx, {
            productId: transaction.productId,
            locationId: transaction.toLocationId,
            delta: -quantity,
          });
          await adjustLocationQuantity(tx, {
            productId: transaction.productId,
            locationId: transaction.fromLocationId,
            delta: quantity,
          });
          break;
        }
        case 'ADJUSTMENT': {
          if (!transaction.fromLocationId) {
            throw new RollbackError('Adjustment transaction is missing location data');
          }

          await adjustLocationQuantity(tx, {
            productId: transaction.productId,
            locationId: transaction.fromLocationId,
            delta: -transaction.quantity,
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

    res.json({
      ...updated,
      rollbackEligible: false,
    });
  } catch (error) {
    if (error instanceof RollbackError) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error('Error rolling back transaction:', error);
    res.status(500).json({ error: 'Failed to roll back transaction' });
  }
});

async function assertNoSubsequentActivity(
  prisma: PrismaClient,
  productId: string,
  createdAt: Date,
  locationIds: string[],
) {
  if (!locationIds.length) {
    return;
  }

  const hasConflict = await hasSubsequentActivity(prisma, productId, createdAt, locationIds);

  if (hasConflict) {
    throw new RollbackError(
      'This transaction cannot be rolled back because newer activity exists for the affected product at the same location.',
    );
  }
}

async function adjustLocationQuantity(
  tx: Prisma.TransactionClient,
  params: { productId: string; locationId: string; delta: number },
) {
  const items = await tx.inventoryItem.findMany({
    where: {
      productId: params.productId,
      locationId: params.locationId,
    },
    orderBy: { createdAt: 'asc' },
  });

  const currentQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const nextQuantity = currentQuantity + params.delta;

  if (nextQuantity < 0) {
    throw new RollbackError('Insufficient inventory available at the selected location');
  }

  if (nextQuantity === 0) {
    if (items.length) {
      await tx.inventoryItem.deleteMany({
        where: {
          id: {
            in: items.map((item) => item.id),
          },
        },
      });
    }
    return;
  }

  const primary = items[0];
  if (!primary) {
    await tx.inventoryItem.create({
      data: {
        productId: params.productId,
        locationId: params.locationId,
        quantity: nextQuantity,
        status: 'SEALED',
      },
    });
    return;
  }

  if (items.length > 1) {
    await tx.inventoryItem.deleteMany({
      where: {
        id: {
          in: items.slice(1).map((item) => item.id),
        },
      },
    });
  }

  await tx.inventoryItem.update({
    where: { id: primary.id },
    data: {
      quantity: nextQuantity,
      status: 'SEALED',
    },
  });
}

function getRelevantLocationIds(transaction: TransactionWithRelations) {
  switch (transaction.transactionType) {
    case 'RECEIPT':
      return transaction.toLocationId ? [transaction.toLocationId] : [];
    case 'TRANSFER':
      return [transaction.fromLocationId, transaction.toLocationId].filter((value): value is string => Boolean(value));
    case 'ADJUSTMENT':
      return transaction.fromLocationId ? [transaction.fromLocationId] : [];
    default:
      return [];
  }
}

async function canRollbackTransaction(prisma: PrismaClient, transaction: TransactionWithRelations) {
  if (transaction.isReverted) {
    return false;
  }

  const supportedTypes: Record<string, true> = {
    RECEIPT: true,
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

  if (await hasSubsequentActivity(prisma, transaction.productId, transaction.createdAt, relevantLocations)) {
    return false;
  }

  switch (transaction.transactionType) {
    case 'RECEIPT': {
      const destination = transaction.toLocationId;
      if (!destination) return false;
      return hasSufficientInventory(prisma, transaction.productId, destination, Math.abs(transaction.quantity));
    }
    case 'TRANSFER': {
      const destination = transaction.toLocationId;
      if (!destination) return false;
      return hasSufficientInventory(prisma, transaction.productId, destination, Math.abs(transaction.quantity));
    }
    case 'ADJUSTMENT': {
      const locationId = transaction.fromLocationId;
      if (!locationId) return false;
      if (transaction.quantity <= 0) {
        return true;
      }
      return hasSufficientInventory(prisma, transaction.productId, locationId, transaction.quantity);
    }
    default:
      return false;
  }
}

async function hasSufficientInventory(
  prisma: PrismaClient,
  productId: string,
  locationId: string,
  quantity: number,
) {
  if (quantity <= 0) {
    return true;
  }

  const aggregate = await prisma.inventoryItem.aggregate({
    _sum: {
      quantity: true,
    },
    where: {
      productId,
      locationId,
    },
  });

  const available = aggregate._sum.quantity ?? 0;
  return available >= quantity;
}

async function hasSubsequentActivity(prisma: PrismaClient, productId: string, createdAt: Date, locationIds: string[]) {
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

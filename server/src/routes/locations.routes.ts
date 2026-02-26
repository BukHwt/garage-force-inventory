import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireEditor } from '../middleware/auth.js';

const router = Router();
const UNIQUE_LOCATION_ERROR = 'Location names must be unique.';

function normalizeName(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDescription(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

router.use((req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return requireEditor(req, res, next);
});

// Get all locations
router.get('/', async (req: Request, res: Response) => {
  try {
    const locations = await req.prisma.location.findMany({
      include: {
        _count: {
          select: { inventoryItems: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Get a single location by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const location = await req.prisma.location.findUnique({
      where: { id },
      include: {
        inventoryItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// Create a new location
router.post('/', async (req: Request, res: Response) => {
  try {
    const name = normalizeName(req.body?.name);
    const description = normalizeDescription(req.body?.description);

    if (name.length === 0) {
      return res.status(400).json({ error: 'Location name is required.' });
    }

    if (name.length < 2) {
      return res.status(400).json({ error: 'Location name must be at least 2 characters.' });
    }

    const existing = await req.prisma.location.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existing) {
      return res.status(400).json({ error: UNIQUE_LOCATION_ERROR });
    }

    const location = await req.prisma.location.create({
      data: {
        name,
        description,
      },
    });

    res.status(201).json(location);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return res.status(400).json({ error: UNIQUE_LOCATION_ERROR });
    }
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Update a location
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hasName = req.body && Object.prototype.hasOwnProperty.call(req.body, 'name');
    const hasDescription = req.body && Object.prototype.hasOwnProperty.call(req.body, 'description');

    if (!hasName && !hasDescription) {
      return res.status(400).json({ error: 'At least one field is required.' });
    }

    const data: { name?: string; description?: string | null } = {};
    if (hasName) {
      const normalizedName = normalizeName(req.body?.name);
      if (normalizedName.length === 0) {
        return res.status(400).json({ error: 'Location name is required.' });
      }
      if (normalizedName.length < 2) {
        return res.status(400).json({ error: 'Location name must be at least 2 characters.' });
      }

      const duplicate = await req.prisma.location.findFirst({
        where: {
          id: { not: id },
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });
      if (duplicate) {
        return res.status(400).json({ error: UNIQUE_LOCATION_ERROR });
      }

      data.name = normalizedName;
    }

    if (hasDescription) {
      data.description = normalizeDescription(req.body?.description);
    }

    const location = await req.prisma.location.update({
      where: { id },
      data,
    });

    res.json(location);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return res.status(404).json({ error: 'Location not found' });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return res.status(400).json({ error: UNIQUE_LOCATION_ERROR });
    }
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Delete a location
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inventoryTotals = await req.prisma.inventoryItem.aggregate({
      where: { locationId: id },
      _sum: { quantity: true },
    });
    const totalQuantity = inventoryTotals._sum.quantity ?? 0;

    if (totalQuantity > 0) {
      return res.status(400).json({
        error: 'Cannot delete location with existing inventory. Move inventory out of this location first.',
      });
    }

    await req.prisma.location.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return res.status(404).json({ error: 'Location not found' });
    }
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;

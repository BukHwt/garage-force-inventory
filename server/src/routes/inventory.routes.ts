import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// Get all inventory items with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { productId, locationId, search } = req.query;

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        ...(productId && { productId: productId as string }),
        ...(locationId && { locationId: locationId as string }),
        ...(search && {
          OR: [
            { product: { name: { contains: search as string, mode: 'insensitive' } } },
            { product: { description: { contains: search as string, mode: 'insensitive' } } },
            { product: { sku: { contains: search as string, mode: 'insensitive' } } },
            { batchNumber: { contains: search as string, mode: 'insensitive' } },
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

    res.json(inventoryItems);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

// Get a single inventory item by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const inventoryItem = await prisma.inventoryItem.findUnique({
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

    res.json(inventoryItem);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

// Create a new inventory item
router.post('/', async (req: Request, res: Response) => {
  try {
    const { productId, locationId, quantity, batchNumber, expiresAt, notes } = req.body;

    if (!productId || !locationId) {
      return res.status(400).json({ error: 'Product and location are required' });
    }

    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        productId,
        locationId,
        quantity: quantity || 1,
        batchNumber,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        notes,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        location: true,
      },
    });

    res.status(201).json(inventoryItem);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Update an inventory item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { productId, locationId, quantity, batchNumber, expiresAt, notes } = req.body;

    const inventoryItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(productId && { productId }),
        ...(locationId && { locationId }),
        ...(quantity !== undefined && { quantity }),
        ...(batchNumber !== undefined && { batchNumber }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        location: true,
      },
    });

    res.json(inventoryItem);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Delete an inventory item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.inventoryItem.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// Adjust inventory quantity (add/subtract)
router.patch('/:id/adjust', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adjustment } = req.body;

    if (typeof adjustment !== 'number') {
      return res.status(400).json({ error: 'Adjustment must be a number' });
    }

    const currentItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!currentItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const newQuantity = currentItem.quantity + adjustment;

    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Adjustment would result in negative quantity' });
    }

    const inventoryItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        quantity: newQuantity,
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
        location: true,
      },
    });

    res.json(inventoryItem);
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// Get all items with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { locationId, categoryId, search } = req.query;

    const items = await prisma.item.findMany({
      where: {
        ...(locationId && { locationId: locationId as string }),
        ...(categoryId && { categoryId: categoryId as string }),
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        location: true,
        category: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get a single item by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        location: true,
        category: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Create a new item
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, quantity, locationId, categoryId, imageUrl, notes } = req.body;

    if (!name || !locationId) {
      return res.status(400).json({ error: 'Name and location are required' });
    }

    const item = await prisma.item.create({
      data: {
        name,
        description,
        quantity: quantity || 1,
        locationId,
        categoryId,
        imageUrl,
        notes,
      },
      include: {
        location: true,
        category: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Update an item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, quantity, locationId, categoryId, imageUrl, notes } = req.body;

    const item = await prisma.item.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(quantity !== undefined && { quantity }),
        ...(locationId && { locationId }),
        ...(categoryId !== undefined && { categoryId }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        location: true,
        category: true,
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete an item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.item.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;

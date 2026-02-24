import { Router, Request, Response } from 'express';
import { requireEditor } from '../middleware/auth.js';

const router = Router();

router.use((req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return requireEditor(req, res, next);
});

// Get all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await req.prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get a single category by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await req.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            inventoryItems: {
              include: {
                location: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create a new category
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const category = await req.prisma.category.create({
      data: {
        name,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update a category
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const category = await req.prisma.category.update({
      where: { id },
      data: { name },
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category has any products before deletion
    const productCount = await req.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with existing products. Please reassign or delete the products first.'
      });
    }

    await req.prisma.category.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;

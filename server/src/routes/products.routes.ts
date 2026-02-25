import { Router, Request, Response } from 'express';
import { requireEditor } from '../middleware/auth.js';

const router = Router();

router.use((req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return requireEditor(req, res, next);
});

// Get all products with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoryId, search } = req.query;
    const includeUntracked = req.query.includeUntracked === 'true';

    const products = await req.prisma.product.findMany({
      where: {
        ...(includeUntracked ? {} : { isTracked: true }),
        ...(categoryId && { categoryId: categoryId as string }),
        ...(search && {
          OR: [
            { name: { contains: search as string } },
            { description: { contains: search as string } },
            { sku: { contains: search as string } },
            { color: { contains: search as string } },
          ],
        }),
      },
      include: {
        category: true,
        inventoryItems: {
          include: {
            location: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get a single product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await req.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventoryItems: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create a new product
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      sku,
      color,
      unitSize,
      manufacturer,
      categoryId,
      imageUrl,
      notes,
      consumableType,
      supplierType,
      reorderPoint,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const product = await req.prisma.product.create({
      data: {
        name,
        description,
        sku,
        color,
        unitSize,
        manufacturer,
        categoryId,
        imageUrl,
        notes,
        consumableType,
        supplierType,
        reorderPoint,
      },
      include: {
        category: true,
        inventoryItems: {
          include: {
            location: true,
          },
        },
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update a product
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      sku,
      color,
      unitSize,
      manufacturer,
      categoryId,
      imageUrl,
      notes,
      reorderPoint,
      supplierType,
      consumableType,
    } = req.body;

    let reorderPointValue: number | null | undefined = undefined;
    if (reorderPoint !== undefined) {
      if (reorderPoint === '' || reorderPoint === null) {
        reorderPointValue = null;
      } else {
        const num = Number(reorderPoint);
        if (!Number.isFinite(num)) {
          return res.status(400).json({ error: 'reorderPoint must be a number or empty to clear' });
        }
        reorderPointValue = num;
      }
    }

    const product = await req.prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(sku !== undefined && { sku }),
        ...(color !== undefined && { color }),
        ...(unitSize !== undefined && { unitSize }),
        ...(manufacturer !== undefined && { manufacturer }),
        ...(categoryId !== undefined && { categoryId }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(notes !== undefined && { notes }),
        ...(reorderPoint !== undefined && { reorderPoint: reorderPointValue }),
        ...(supplierType !== undefined && { supplierType }),
        ...(consumableType !== undefined && { consumableType }),
      },
      include: {
        category: true,
        inventoryItems: {
          include: {
            location: true,
          },
        },
      },
    });

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete a product (will cascade delete inventory items)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await req.prisma.product.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;

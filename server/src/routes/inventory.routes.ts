import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { requireEditor } from '../middleware/auth.js';

const router = Router();

router.use((req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  return requireEditor(req, res, next);
});

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

// Adjust inventory quantity (add/subtract) and/or status
router.patch('/:id/adjust', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adjustment, status } = req.body;

    if (typeof adjustment !== 'number') {
      return res.status(400).json({ error: 'Adjustment must be a number' });
    }

    // Validate status if provided
    if (status !== undefined && status !== 'SEALED' && status !== 'OPEN') {
      return res.status(400).json({ error: 'Status must be either SEALED or OPEN' });
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
        ...(status !== undefined && { status }),
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

// Transfer inventory between locations
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const { productId, fromLocationId, toLocationId, quantity, notes } = req.body;

    // Validation
    if (!productId || !fromLocationId || !toLocationId) {
      return res.status(400).json({ error: 'Product and both locations are required' });
    }

    if (fromLocationId === toLocationId) {
      return res.status(400).json({ error: 'Source and destination locations must be different' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Verify both locations exist
    const [fromLocation, toLocation] = await Promise.all([
      prisma.location.findUnique({ where: { id: fromLocationId } }),
      prisma.location.findUnique({ where: { id: toLocationId } }),
    ]);

    if (!fromLocation) {
      return res.status(404).json({ error: 'Source location not found' });
    }

    if (!toLocation) {
      return res.status(404).json({ error: 'Destination location not found' });
    }

    // Check if source has inventory
    const fromItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        locationId: fromLocationId,
      },
    });

    if (!fromItem) {
      return res.status(400).json({ error: 'No inventory available at source location' });
    }

    if (fromItem.quantity < quantity) {
      return res.status(400).json({
        error: `Insufficient quantity at source location. Available: ${fromItem.quantity}, Requested: ${quantity}`,
      });
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update or delete from source location
      let updatedFromItem = null;
      const newFromQuantity = fromItem.quantity - quantity;

      if (newFromQuantity > 0) {
        // Update quantity at source
        updatedFromItem = await tx.inventoryItem.update({
          where: { id: fromItem.id },
          data: { quantity: newFromQuantity },
          include: {
            product: {
              include: {
                category: true,
              },
            },
            location: true,
          },
        });
      } else {
        // Remove from source location (quantity becomes 0)
        await tx.inventoryItem.delete({
          where: { id: fromItem.id },
        });
      }

      // Check if destination already has this product
      const existingToItem = await tx.inventoryItem.findFirst({
        where: {
          productId,
          locationId: toLocationId,
        },
      });

      let toItem;

      if (existingToItem) {
        // Add to existing inventory at destination
        toItem = await tx.inventoryItem.update({
          where: { id: existingToItem.id },
          data: {
            quantity: existingToItem.quantity + quantity,
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
      } else {
        // Create new inventory item at destination
        toItem = await tx.inventoryItem.create({
          data: {
            productId,
            locationId: toLocationId,
            quantity,
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
      }

      // Create transaction record
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

      return { fromItem: updatedFromItem, toItem, transaction };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error transferring inventory:', error);
    res.status(500).json({ error: 'Failed to transfer inventory' });
  }
});

// Receive inventory (creates transaction and updates/creates inventory item)
router.post('/receive', async (req: Request, res: Response) => {
  try {
    const { productId, locationId, quantity, batchNumber, expiresAt, notes } = req.body;

    // Validation
    if (!productId || !locationId) {
      return res.status(400).json({ error: 'Product and location are required' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check if sealed inventory already exists for this product at this location
      const existingSealedItem = await tx.inventoryItem.findFirst({
        where: {
          productId,
          locationId,
          status: 'SEALED',
        },
      });

      let inventoryItem;

      if (existingSealedItem) {
        // Update existing sealed inventory item
        inventoryItem = await tx.inventoryItem.update({
          where: { id: existingSealedItem.id },
          data: {
            quantity: existingSealedItem.quantity + quantity,
            ...(batchNumber && { batchNumber }),
            ...(expiresAt && { expiresAt: new Date(expiresAt) }),
            ...(notes && { notes }),
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
      } else {
        // Create new sealed inventory item
        inventoryItem = await tx.inventoryItem.create({
          data: {
            productId,
            locationId,
            quantity,
            status: 'SEALED',
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
      }

      // Create transaction record
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          transactionType: 'RECEIPT',
          toLocationId: locationId,
          quantity,
          notes: notes || `Received ${quantity} ${product.unitSize || 'units'}`,
          performedByUserId: req.user?.id,
        },
      });

      return { inventoryItem, transaction };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error receiving inventory:', error);
    res.status(500).json({ error: 'Failed to receive inventory' });
  }
});

// Unseal containers (move specified quantity from SEALED to OPEN status)
router.post('/unseal', async (req: Request, res: Response) => {
  try {
    const { productId, locationId, quantity = 1 } = req.body;

    // Validation
    if (!productId || !locationId) {
      return res.status(400).json({ error: 'Product and location are required' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Find sealed inventory at this location
    const sealedItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        locationId,
        status: 'SEALED',
      },
    });

    if (!sealedItem) {
      return res.status(400).json({ error: 'No sealed inventory available at this location' });
    }

    if (sealedItem.quantity < quantity) {
      return res.status(400).json({
        error: `Insufficient sealed inventory. Available: ${sealedItem.quantity}, Requested: ${quantity}`
      });
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Reduce sealed inventory by specified quantity
      let updatedSealedItem = null;
      const newSealedQuantity = sealedItem.quantity - quantity;

      if (newSealedQuantity > 0) {
        // Update sealed inventory
        updatedSealedItem = await tx.inventoryItem.update({
          where: { id: sealedItem.id },
          data: { quantity: newSealedQuantity },
          include: {
            product: {
              include: {
                category: true,
              },
            },
            location: true,
          },
        });
      } else {
        // Remove sealed inventory item (quantity becomes 0)
        await tx.inventoryItem.delete({
          where: { id: sealedItem.id },
        });
      }

      // Check if open inventory already exists at this location
      const existingOpenItem = await tx.inventoryItem.findFirst({
        where: {
          productId,
          locationId,
          status: 'OPEN',
        },
      });

      let openItem;

      if (existingOpenItem) {
        // Add to existing open inventory
        openItem = await tx.inventoryItem.update({
          where: { id: existingOpenItem.id },
          data: {
            quantity: existingOpenItem.quantity + quantity,
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
      } else {
        // Create new open inventory item
        openItem = await tx.inventoryItem.create({
          data: {
            productId,
            locationId,
            quantity,
            status: 'OPEN',
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
      }

      // Create transaction record
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          transactionType: 'ADJUSTMENT',
          fromLocationId: locationId,
          toLocationId: locationId,
          quantity,
          notes: `Unsealed ${quantity} ${product.unitSize || 'unit'}${quantity > 1 ? 's' : ''} at ${location.name}`,
          performedByUserId: req.user?.id,
        },
      });

      return { sealedItem: updatedSealedItem, openItem, transaction };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error unsealing inventory:', error);
    res.status(500).json({ error: 'Failed to unseal inventory' });
  }
});

// Use/consume inventory (for job usage)
router.post('/use', async (req: Request, res: Response) => {
  try {
    const { productId, locationId, quantity, jobReference, notes } = req.body;

    // Validation
    if (!productId || !locationId) {
      return res.status(400).json({ error: 'Product and location are required' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than zero' });
    }

    if (!jobReference) {
      return res.status(400).json({ error: 'Job reference is required for usage tracking' });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Check if inventory exists at this location
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        locationId,
      },
    });

    if (!inventoryItem) {
      return res.status(400).json({ error: 'No inventory available at this location' });
    }

    if (inventoryItem.quantity < quantity) {
      return res.status(400).json({
        error: `Insufficient quantity at location. Available: ${inventoryItem.quantity}, Requested: ${quantity}`,
      });
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Decrease quantity at location
      const newQuantity = inventoryItem.quantity - quantity;

      let updatedInventoryItem = null;

      if (newQuantity > 0) {
        // Update inventory item
        updatedInventoryItem = await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: { quantity: newQuantity },
          include: {
            product: {
              include: {
                category: true,
              },
            },
            location: true,
          },
        });
      } else {
        // Remove inventory item (quantity becomes 0)
        await tx.inventoryItem.delete({
          where: { id: inventoryItem.id },
        });
      }

      // Create CONSUMPTION transaction
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          transactionType: 'CONSUMPTION',
          fromLocationId: locationId,
          quantity,
          jobReference,
          notes: notes || `Used ${quantity} ${product.unitSize || 'units'} for job ${jobReference}`,
          performedByUserId: req.user?.id,
        },
      });

      return { inventoryItem: updatedInventoryItem, transaction };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error using inventory:', error);
    res.status(500).json({ error: 'Failed to use inventory' });
  }
});

export default router;

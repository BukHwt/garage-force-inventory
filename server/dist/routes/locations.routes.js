import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { requireEditor } from '../middleware/auth.js';
const router = Router();
router.use((req, res, next) => {
    if (req.method === 'GET') {
        return next();
    }
    return requireEditor(req, res, next);
});
// Get all locations
router.get('/', async (req, res) => {
    try {
        const locations = await prisma.location.findMany({
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
    }
    catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});
// Get a single location by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const location = await prisma.location.findUnique({
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
    }
    catch (error) {
        console.error('Error fetching location:', error);
        res.status(500).json({ error: 'Failed to fetch location' });
    }
});
// Create a new location
router.post('/', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        const location = await prisma.location.create({
            data: {
                name,
                description,
            },
        });
        res.status(201).json(location);
    }
    catch (error) {
        console.error('Error creating location:', error);
        res.status(500).json({ error: 'Failed to create location' });
    }
});
// Update a location
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const location = await prisma.location.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
            },
        });
        res.json(location);
    }
    catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ error: 'Failed to update location' });
    }
});
// Delete a location
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if location has inventory items
        const itemCount = await prisma.inventoryItem.count({
            where: { locationId: id },
        });
        if (itemCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete location with existing inventory. Please move or delete the items first.'
            });
        }
        await prisma.location.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting location:', error);
        res.status(500).json({ error: 'Failed to delete location' });
    }
});
export default router;
//# sourceMappingURL=locations.routes.js.map
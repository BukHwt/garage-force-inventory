import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '12h';
if (!JWT_SECRET) {
    console.warn('JWT_SECRET environment variable is not set. Auth routes will fail until configured.');
}
router.get('/users', async (_req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, name: true, role: true },
            orderBy: { name: 'asc' },
        });
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching users for auth:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
router.post('/login', async (req, res) => {
    if (!JWT_SECRET) {
        return res.status(500).json({ error: 'Authentication is not configured' });
    }
    const { userId, pin } = req.body;
    if (!userId || !pin) {
        return res.status(400).json({ error: 'User and PIN are required' });
    }
    try {
        const user = await prisma.user.findFirst({
            where: { id: userId, isActive: true },
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isValid = await bcrypt.compare(pin, user.pinHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ sub: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_TTL });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Failed to log in' });
    }
});
router.get('/me', authenticate, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json({ user: req.user });
});
export default router;
//# sourceMappingURL=auth.routes.js.map
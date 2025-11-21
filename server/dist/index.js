import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRouter from './routes/products.routes.js';
import inventoryRouter from './routes/inventory.routes.js';
import locationsRouter from './routes/locations.routes.js';
import categoriesRouter from './routes/categories.routes.js';
import authRouter from './routes/auth.routes.js';
import { authenticate } from './middleware/auth.js';
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json());
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});
// Routes
app.use('/api/auth', authRouter);
app.use(authenticate);
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/categories', categoriesRouter);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map
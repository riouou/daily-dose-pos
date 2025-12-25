import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// In-memory store for orders
let orders = [];

// API Endpoints
app.get('/api/orders', (req, res) => {
    res.json(orders);
});

app.post('/api/orders', (req, res) => {
    const newOrder = req.body;
    // Ensure the order has server-side timestamp and status if not provided
    if (!newOrder.createdAt) newOrder.createdAt = new Date();
    if (!newOrder.status) newOrder.status = 'new';

    orders.unshift(newOrder); // Add to beginning
    res.status(201).json(newOrder);
});

app.patch('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
        return res.status(404).json({ error: 'Order not found' });
    }

    orders[orderIndex].status = status;
    res.json(orders[orderIndex]);
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing: serve index.html for all non-static requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

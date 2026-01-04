import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { query, getClient } from './db.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import compression from 'compression';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
    }
});

const PORT = process.env.PORT || 8080;

app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());
app.use(express.json());

app.use(express.json());

// Initialize DB
// Initialize DB
const initDb = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                opened_at TIMESTAMP DEFAULT NOW(),
                closed_at TIMESTAMP,
                status VARCHAR(20) DEFAULT 'OPEN',
                total_orders INTEGER DEFAULT 0,
                total_sales DECIMAL(10,2) DEFAULT 0
            )
        `);
        // Ensure columns exist for existing tables
        try {
            await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0`);
            await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS total_sales DECIMAL(10,2) DEFAULT 0`);
            // Add deleted column to menu_items for soft delete
            await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE`);
            // Add flavors column to menu_items (JSONB array of strings)
            await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS flavors JSONB DEFAULT '[]'`);
            await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS max_flavors INTEGER DEFAULT 1`);

            // Add table_number to orders
            await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number INTEGER`);
            // Add beeper_number to orders
            await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS beeper_number INTEGER`);

            // Add selected_flavors to order_items (Array support)
            await query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_flavors JSONB DEFAULT '[]'`);

            // Backwards compatibility for legacy code (soft deprecated)
            await query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_flavor VARCHAR(255)`);

            // Add is_test to orders for testing mode
            await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE`);
            // Add created_at to categories for consistent ordering if needed?
            // Add sort_order to categories
            await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`);
        } catch (e) { /* ignore if exists */ }

        console.log('Sessions table ensured');
    } catch (err) {
        console.error('Failed to init DB:', err);
    }
};

const attachItemsToOrders = async (orders) => {
    if (orders.length === 0) return [];

    const orderIds = orders.map(o => o.id);
    const { rows: items } = await query(
        `SELECT * FROM order_items WHERE order_id = ANY($1::text[])`,
        [orderIds]
    );

    const itemsMap = {};
    items.forEach(item => {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];

        // Coalesce legacy selected_flavor into the array if needed
        let finalFlavors = item.selected_flavors || [];
        if (!finalFlavors.length && item.selected_flavor) {
            finalFlavors = [item.selected_flavor];
        }

        itemsMap[item.order_id].push({
            menuItem: {
                id: item.menu_item_id,
                name: item.menu_item_name_snapshot,
                price: parseFloat(item.menu_item_price_snapshot)
            },
            quantity: item.quantity,
            selectedFlavors: finalFlavors,
            // Keep legacy field for now if frontend expects it, or better yet, deprecate it.
            // We'll map the first one to support old frontend logic if it exists
            selectedFlavor: finalFlavors[0] || null
        });
    });

    return orders.map(order => ({
        ...order,
        total: parseFloat(order.total_amount),
        createdAt: order.created_at, // Map snake_case to camelCase
        tableNumber: order.table_number,
        beeperNumber: order.beeper_number,
        items: itemsMap[order.id] || []
    }));
};

// Global Test Mode State
let TEST_MODE = false;
let MAINTENANCE_MODE = false;

app.get('/api/menu', async (req, res) => {
    try {
        const { rows: categories } = await query('SELECT name FROM categories ORDER BY sort_order ASC, name ASC');
        // Filter out deleted items
        const { rows: items } = await query('SELECT * FROM menu_items WHERE deleted = FALSE OR deleted IS NULL ORDER BY category, name');

        console.log(`Fetched ${items.length} active menu items`);

        const formattedItems = items.map(item => ({
            ...item,
            price: parseFloat(item.price),
            isAvailable: item.is_available,
            image: item.image_url,
            flavors: Array.isArray(item.flavors) ? item.flavors : [],
            maxFlavors: item.max_flavors || 1
        }));

        res.json({
            categories: categories.map(c => c.name),
            items: formattedItems
        });
    } catch (err) {
        console.error('Error fetching menu:', err);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});

app.post('/api/menu/items', async (req, res) => {
    const newItem = req.body;
    if (!newItem.id) newItem.id = Date.now().toString();

    try {
        await query(
            `INSERT INTO menu_items (id, name, price, category, emoji, image_url, description, is_available, deleted, flavors, max_flavors)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                newItem.id,
                newItem.name,
                newItem.price,
                newItem.category,
                newItem.emoji,
                newItem.image,
                newItem.description,
                newItem.isAvailable ?? true,
                false,
                JSON.stringify(newItem.flavors || []),
                newItem.maxFlavors || 1
            ]
        );
        res.status(201).json(newItem);
        io.emit('menu:update');
    } catch (err) {
        console.error('Error adding menu item:', err);
        res.status(500).json({ error: 'Failed to add menu item' });
    }
});

app.put('/api/menu/items/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
        if (updates.price !== undefined) { fields.push(`price = $${idx++}`); values.push(updates.price); }
        if (updates.category !== undefined) { fields.push(`category = $${idx++}`); values.push(updates.category); }
        if (updates.emoji !== undefined) { fields.push(`emoji = $${idx++}`); values.push(updates.emoji); }
        if (updates.image !== undefined) { fields.push(`image_url = $${idx++}`); values.push(updates.image); }
        if (updates.isAvailable !== undefined) { fields.push(`is_available = $${idx++}`); values.push(updates.isAvailable); }
        if (updates.flavors !== undefined) { fields.push(`flavors = $${idx++}`); values.push(JSON.stringify(updates.flavors)); }
        if (updates.maxFlavors !== undefined) { fields.push(`max_flavors = $${idx++}`); values.push(updates.maxFlavors); }

        if (fields.length === 0) return res.json({ message: 'No updates provided' });

        values.push(id);
        const sql = `UPDATE menu_items SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;

        const { rows } = await query(sql, values);
        if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });

        const updatedItem = rows[0];
        res.json({
            ...updatedItem,
            price: parseFloat(updatedItem.price),
            isAvailable: updatedItem.is_available,
            image: updatedItem.image_url,
            flavors: Array.isArray(updatedItem.flavors) ? updatedItem.flavors : [],
            maxFlavors: updatedItem.max_flavors || 1
        });
        io.emit('menu:update');
    } catch (err) {
        console.error('Error updating menu item:', err);
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

app.delete('/api/menu/items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Soft delete
        await query('UPDATE menu_items SET deleted = TRUE WHERE id = $1', [id]);
        res.json({ success: true });
        io.emit('menu:update');
    } catch (err) {
        console.error('Error deleting menu item:', err);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
});

app.post('/api/menu/categories', async (req, res) => {
    const { category } = req.body;
    try {
        // Get max sort_order
        const { rows: maxRows } = await query('SELECT MAX(sort_order) as max_order FROM categories');
        const nextOrder = (maxRows[0].max_order || 0) + 1;

        await query('INSERT INTO categories (name, sort_order) VALUES ($1, $2) ON CONFLICT DO NOTHING', [category, nextOrder]);
        const { rows } = await query('SELECT name FROM categories ORDER BY sort_order ASC, name ASC');
        res.json(rows.map(c => c.name));
        io.emit('menu:update');
    } catch (err) {
        console.error('Error adding category:', err);
        res.status(500).json({ error: 'Failed to add category' });
    }
});

app.delete('/api/menu/categories/:name', async (req, res) => {
    const { name } = req.params;
    if (name === 'All') return res.status(400).json({ error: 'Cannot delete default category' });

    try {
        await query('DELETE FROM categories WHERE name = $1', [name]);
        const { rows } = await query('SELECT name FROM categories ORDER BY name');
        res.json(rows.map(c => c.name));
        io.emit('menu:update');
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ error: err.message || 'Failed to delete category' });
    }
});

app.put('/api/menu/categories/reorder', async (req, res) => {
    const { categories } = req.body; // Expects array of strings ['Cat1', 'Cat2', ...]
    if (!Array.isArray(categories)) return res.status(400).json({ error: 'Invalid categories array' });

    try {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            // Update each category's sort_order based on index
            for (let i = 0; i < categories.length; i++) {
                await client.query('UPDATE categories SET sort_order = $1 WHERE name = $2', [i, categories[i]]);
            }
            await client.query('COMMIT');

            const { rows } = await client.query('SELECT name FROM categories ORDER BY sort_order ASC, name ASC');
            res.json(rows.map(c => c.name));
            io.emit('menu:update');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error reordering categories:', err);
        res.status(500).json({ error: 'Failed to reorder categories' });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const { rows: orders } = await query(
            `SELECT * FROM orders 
             WHERE status != 'closed' 
             AND created_at > (NOW() - INTERVAL '24 hours')
             ORDER BY created_at DESC`
        );
        const fullOrders = await attachItemsToOrders(orders);
        res.json(fullOrders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.post('/api/orders', async (req, res) => {
    const newOrder = req.body;
    if (!newOrder.id) newOrder.id = `DAILY-${Date.now()}`;
    const createdAt = newOrder.createdAt || new Date();

    const client = await getClient();
    try {
        // Check for active session
        const { rows: activeSession } = await client.query("SELECT * FROM sessions WHERE status = 'OPEN'");

        // ALLOW ORDERS IF TEST MODE IS ON, even if closed
        if (MAINTENANCE_MODE) {
            return res.status(503).json({ error: 'System is currently in maintenance mode. Please try again later.' });
        }

        if (activeSession.length === 0 && !TEST_MODE) {
            return res.status(403).json({ error: 'Store is closed. Please open the store first.' });
        }

        await client.query('BEGIN');

        await client.query(
            `INSERT INTO orders (id, status, total_amount, customer_name, created_at, table_number, beeper_number, is_test)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                newOrder.id,
                newOrder.status || 'new',
                newOrder.total || 0,
                newOrder.customerName,
                createdAt,
                newOrder.tableNumber || null,
                newOrder.beeperNumber || null,
                TEST_MODE
            ]
        );

        if (newOrder.items && newOrder.items.length > 0) {
            for (const item of newOrder.items) {
                // Determine flavors to save.
                // Support both legacy single selectedFlavor and new selectedFlavors array
                const flavorsToSave = item.selectedFlavors || (item.selectedFlavor ? [item.selectedFlavor] : []);

                await client.query(
                    `INSERT INTO order_items (order_id, menu_item_id, menu_item_name_snapshot, menu_item_price_snapshot, quantity, selected_flavors)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        newOrder.id,
                        item.menuItem.id,
                        item.menuItem.name,
                        item.menuItem.price,
                        item.quantity,
                        JSON.stringify(flavorsToSave)
                    ]
                );
            }
        }

        await client.query('COMMIT');

        const finalOrder = { ...newOrder, is_test: TEST_MODE };

        res.status(201).json(finalOrder);

        // Emit new order - client should maybe visualize test orders differently?
        io.emit('order:new', finalOrder);

        invalidateAnalyticsCache(); // Invalidate cache on new order

        // If in test mode, maybe warn admins?
        if (TEST_MODE) {
            io.emit('console:log', { message: `[TEST] New Order placed: ${newOrder.id}`, type: 'warning' });
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', err);
        res.status(500).json({ error: 'Failed to create order' });
    } finally {
        client.release();
    }
});

app.patch('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        await query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);

        const { rows } = await query('SELECT * FROM orders WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });

        const fullOrders = await attachItemsToOrders(rows);
        const updatedOrder = fullOrders[0];

        res.json(updatedOrder);

        io.emit('order:update', updatedOrder);
        invalidateAnalyticsCache(); // Invalidate on status change
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

app.post('/api/admin/close-day', async (req, res) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('sv');

    try {
        // Calculate totals for the session being closed
        // We look for active orders (not closed) that are about to be closed
        const { rows: metrics } = await query(
            `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_sales 
             FROM orders 
             WHERE status != 'closed' AND is_test = FALSE`
        );

        const sessionOrders = parseInt(metrics[0]?.total_orders || 0);
        const sessionSales = parseFloat(metrics[0]?.total_sales || 0);

        // Close the session in DB
        await query(
            `UPDATE sessions 
             SET status = 'CLOSED', closed_at = $1, total_orders = $2, total_sales = $3 
             WHERE status = 'OPEN'`,
            [now, sessionOrders, sessionSales]
        );

        const result = await query(
            `UPDATE orders 
             SET status = 'closed', closed_at = $1 
             WHERE status != 'closed'`,
            [now]
        );

        const { rows: summaryRows } = await query(
            `SELECT COUNT(*) as total_orders, SUM(total_amount) as total_sales 
             FROM orders 
             WHERE closed_at = $1 AND is_test = FALSE`,
            [now]
        );

        const { rows: todayMetrics } = await query(
            `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_sales 
             FROM orders 
             WHERE DATE(closed_at) = DATE($1) AND is_test = FALSE`,
            [now]
        );

        res.json({
            message: 'Day closed successfully',
            summary: {
                date: dateStr,
                totalOrders: parseInt(todayMetrics[0].total_orders),
                totalSales: parseFloat(todayMetrics[0].total_sales)
            }
        });

        invalidateAnalyticsCache(); // Invalidate on close day

    } catch (err) {
        console.error('Error closing day:', err);
        res.status(500).json({ error: 'Failed to close day' });
    }

});

app.post('/api/admin/open-day', async (req, res) => {
    try {
        const { rows: active } = await query("SELECT * FROM sessions WHERE status = 'OPEN'");
        if (active.length > 0) return res.status(400).json({ error: 'Session already open' });

        await query("INSERT INTO sessions (status) VALUES ('OPEN')");
        res.json({ message: 'Session opened successfully' });
    } catch (err) {
        console.error('Error opening day:', err);
        res.status(500).json({ error: 'Failed to open day' });
    }
});

app.get('/api/admin/status', async (req, res) => {
    try {
        const { rows } = await query('SELECT * FROM sessions ORDER BY opened_at DESC LIMIT 1');
        const lastSession = rows[0];

        if (!lastSession || lastSession.status === 'CLOSED') {
            return res.json({
                status: 'CLOSED',
                lastClosed: lastSession?.closed_at
            });
        }

        res.json({
            status: 'OPEN',
            openedAt: lastSession.opened_at,
            id: lastSession.id
        });
    } catch (err) {
        console.error('Error getting status:', err);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

app.get('/api/admin/history', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // Get total count
        const { rows: countRows } = await query(`SELECT COUNT(*) FROM sessions WHERE status = 'CLOSED'`);
        const total = parseInt(countRows[0].count);

        // Fetch paginated sessions
        const { rows: sessionRows } = await query(`
            SELECT * FROM sessions 
            WHERE status = 'CLOSED' 
            ORDER BY closed_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const historyList = sessionRows.map(row => ({
            filename: row.id.toString(),
            date: new Date(row.closed_at).toLocaleDateString('sv'),
            openedAt: row.opened_at,
            closedAt: row.closed_at,
            totalOrders: parseInt(row.total_orders || 0),
            totalSales: parseFloat(row.total_sales || 0)
        }));

        res.json({
            items: historyList,
            meta: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.get('/api/admin/history/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Check if id is a date string (legacy) or a session ID (integer)
        const isSessionId = /^\d+$/.test(id);

        let orders = [];
        let sessionData = null;

        if (isSessionId) {
            // Fetch by Session ID
            const { rows: sessions } = await query('SELECT * FROM sessions WHERE id = $1', [id]);
            if (sessions.length === 0) return res.status(404).json({ error: 'Session not found' });
            sessionData = sessions[0];

            const { rows: sessionOrders } = await query(
                `SELECT * FROM orders 
                 WHERE created_at >= $1 AND created_at <= $2 AND is_test = FALSE
                 ORDER BY created_at DESC`,
                [sessionData.opened_at, sessionData.closed_at]
            );
            orders = sessionOrders;

        } else {
            // Legacy Date Fetch
            const { rows: dateOrders } = await query(
                `SELECT * FROM orders 
                 WHERE status = 'closed' AND DATE(closed_at) = DATE($1) AND is_test = FALSE
                 ORDER BY closed_at DESC`,
                [id] // id is date string
            );
            orders = dateOrders;
        }

        if (orders.length === 0 && !sessionData) {
            return res.status(404).json({ error: 'No history found' });
        }

        const fullOrders = await attachItemsToOrders(orders);
        const totalSales = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

        // Return structured data
        res.json({
            date: sessionData ? new Date(sessionData.closed_at).toLocaleDateString('sv') : id,
            closedAt: sessionData ? sessionData.closed_at : orders[0]?.closed_at,
            openedAt: sessionData ? sessionData.opened_at : null,
            totalOrders: orders.length,
            totalSales: totalSales,
            orders: fullOrders
        });
    } catch (err) {
        console.error('Error fetching history detail:', err);
        res.status(500).json({ error: 'Failed to fetch history detail' });
    }
});

// Simple in-memory cache for analytics
const analyticsCache = new Map(); // Key: period, Value: { data, timestamp }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const invalidateAnalyticsCache = () => {
    analyticsCache.clear();
    // console.log('Analytics cache cleared');
};

app.get('/api/admin/analytics', async (req, res) => {
    const { period } = req.query;

    // Check cache
    const cached = analyticsCache.get(period);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        // console.log(`Serving cached analytics for ${period}`);
        return res.json(cached.data);
    }

    let timeFilter;

    if (period === 'today') {
        timeFilter = "DATE(created_at) = CURRENT_DATE";
    } else {
        const limitDays = period === 'month' ? 30 : 6; // 6 days ago + today = 7 days
        timeFilter = `DATE(created_at) >= CURRENT_DATE - INTERVAL '${limitDays} days'`;
    }

    try {
        const dailySql = `
            SELECT 
                DATE(created_at) as date, 
                COUNT(*) as orders, 
                SUM(total_amount) as sales 
            FROM orders
            WHERE ${timeFilter} AND is_test = FALSE
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;
        const { rows: dailyRows } = await query(dailySql);

        const dailyTotals = dailyRows.map(r => ({
            date: r.date.toISOString().split('T')[0],
            sales: parseFloat(r.sales),
            orders: parseInt(r.orders)
        }));

        const itemsSql = `
            SELECT 
                menu_item_name_snapshot as name, 
                SUM(quantity) as quantity, 
                SUM(quantity * menu_item_price_snapshot) as sales
            FROM order_items
            JOIN orders ON orders.id = order_items.order_id
            WHERE ${timeFilter.replace('created_at', 'orders.created_at')} AND orders.is_test = FALSE
            GROUP BY menu_item_name_snapshot
            ORDER BY quantity DESC
            LIMIT 10
        `;
        const { rows: itemRows } = await query(itemsSql);

        const topItems = itemRows.map(r => ({
            name: r.name,
            quantity: parseInt(r.quantity),
            sales: parseFloat(r.sales)
        }));



        const hourlySql = `
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour, 
                COUNT(*) as orders 
            FROM orders
            WHERE ${timeFilter} AND is_test = FALSE
            GROUP BY hour
            ORDER BY hour ASC
        `;
        const { rows: hourlyRows } = await query(hourlySql);

        // Fill in missing hours
        const hourlyStats = Array.from({ length: 24 }, (_, i) => {
            const match = hourlyRows.find(r => parseInt(r.hour) === i);
            return {
                hour: i,
                label: `${i}:00`,
                orders: match ? parseInt(match.orders) : 0
            };
        });

        const responseData = { dailyTotals, topItems, hourlyStats };

        // Save to cache
        analyticsCache.set(period, {
            data: responseData,
            timestamp: Date.now()
        });

        res.json(responseData);

    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Admin Command Endpoint
app.post('/api/admin/command', async (req, res) => {
    const { command, args } = req.body;

    // Helper to log
    const log = (msg, type = 'info') => ({ message: msg, type });

    try {
        switch (command.toLowerCase()) {
            case 'help':
                return res.json([
                    log('Available commands:', 'info'),
                    log('  test [on|off] - Toggle testing mode', 'success'),
                    log('  status - Show system status', 'info'),
                    log('  delete-day [YYYY-MM-DD] - Delete orders for a date', 'error'),
                    log('  void [order_id] - Void a specific order', 'warning'),
                    log('  delete-analytics CONFIRM - Clear all analytics/history', 'error'),
                    log('  reset-data CONFIRM - WIPE ALL ORDERS (Same as above)', 'error'),
                    log('  maintenance [on|off] - Toggle maintenance mode', 'warning'),
                    log('  connections - Show active socket clients', 'info'),
                    log('  seed [count] - Generate random test orders (Requires Test Mode)', 'success'),
                    log('  reset-availability - Mark all items available', 'success'),
                    log('  export [table] - Dump table data JSON', 'info'),
                    log('  sql [query] - Run SELECT query', 'warning'),
                ]);

            case 'test':
                if (args[0] === 'on') {
                    TEST_MODE = true;
                    io.emit('test-mode', true);
                    return res.json([log('TESTING MODE ENABLED. Orders will not be saved to analytics.', 'warning')]);
                } else if (args[0] === 'off') {
                    TEST_MODE = false;
                    io.emit('test-mode', false);
                    return res.json([log('Testing mode disabled. Live analytics resumed.', 'success')]);
                }
                return res.json([log(`Testing mode is currently: ${TEST_MODE ? 'ON' : 'OFF'}`, 'info')]);

            case 'status':
                const { rows: dbTime } = await query('SELECT NOW()');
                return res.json([
                    log(`System Time: ${new Date().toLocaleString()}`, 'info'),
                    log(`DB Connection: OK (${dbTime[0].now})`, 'success'),
                    log(`Test Mode: ${TEST_MODE ? 'ACTIVE' : 'INACTIVE'}`, TEST_MODE ? 'warning' : 'success'),
                ]);

            case 'void':
                const orderId = args[0];
                if (!orderId) return res.json([log('Usage: void [order_id]', 'error')]);

                const { rowCount } = await query("UPDATE orders SET status = 'voided' WHERE id = $1", [orderId]);
                if (rowCount === 0) return res.json([log(`Order ${orderId} not found`, 'error')]);

                io.emit('order:update', { id: orderId, status: 'voided' }); // Simplified packet just to trigger refresh
                invalidateAnalyticsCache();
                return res.json([log(`Order ${orderId} has been voided.`, 'success')]);

            case 'delete-day':
                const date = args[0];
                if (!date) return res.json([log('Usage: delete-day [YYYY-MM-DD] or "today"', 'error')]);

                let targetDate = date;
                if (date === 'today') targetDate = new Date().toISOString().split('T')[0];

                // Delete items first via cascade or manual
                // DB usually doesn't cascade by default unless configured.
                // Safest to delete orders and let items hang (bad) or delete items via subquery.

                await query(`
                    DELETE FROM order_items 
                    WHERE order_id IN (SELECT id FROM orders WHERE DATE(created_at) = DATE($1))
                `, [targetDate]);

                const { rowCount: deletedOrders } = await query(
                    "DELETE FROM orders WHERE DATE(created_at) = DATE($1)",
                    [targetDate]
                );

                invalidateAnalyticsCache();
                return res.json([log(`Deleted ${deletedOrders} orders for ${targetDate}`, 'success')]);

            case 'delete-analytics':
                if (args[0] !== 'CONFIRM') return res.json([log('To delete all analytics, type: delete-analytics CONFIRM', 'error')]);

                await query('TRUNCATE TABLE order_items CASCADE');
                await query('TRUNCATE TABLE orders CASCADE');
                await query('TRUNCATE TABLE sessions CASCADE');

                io.emit('order:refresh'); // Refresh clients
                invalidateAnalyticsCache();
                return res.json([log('ANALYTICS DELETED. All order history wiped.', 'success')]);

            case 'maintenance':
                if (args[0] === 'on') {
                    MAINTENANCE_MODE = true;
                    io.emit('maintenance', true);
                    return res.json([log('MAINTENANCE MODE ON. Orders are now blocked.', 'warning')]);
                } else if (args[0] === 'off') {
                    MAINTENANCE_MODE = false;
                    io.emit('maintenance', false);
                    return res.json([log('Maintenance mode disabled. Store is open.', 'success')]);
                }
                return res.json([log('Usage: maintenance [on|off]', 'info')]);

            case 'connections':
                const count = io.engine.clientsCount;
                return res.json([log(`Active Connections: ${count}`, 'info')]);

            case 'reset-availability':
                await query('UPDATE menu_items SET is_available = TRUE');
                io.emit('menu:update');
                return res.json([log('All menu items reset to AVAILABLE.', 'success')]);

            case 'export':
                const table = args[0];
                const validTables = ['orders', 'order_items', 'menu_items', 'sessions', 'categories'];
                if (!validTables.includes(table)) {
                    return res.json([log(`Invalid table. Available: ${validTables.join(', ')}`, 'error')]);
                }
                const { rows: exportData } = await query(`SELECT * FROM ${table}`);
                return res.json([
                    log(`Exporting ${exportData.length} rows from ${table}...`, 'info'),
                    log(JSON.stringify(exportData), 'info')
                ]);

            case 'sql':
                const sqlQuery = args.join(' ');
                if (!sqlQuery.toLowerCase().startsWith('select')) {
                    return res.json([log('Only SELECT queries are allowed.', 'error')]);
                }
                try {
                    const { rows: sqlRows } = await query(sqlQuery);
                    return res.json([
                        log(`Query executed. Rows: ${sqlRows.length}`, 'success'),
                        log(JSON.stringify(sqlRows, null, 2), 'info')
                    ]);
                } catch (err) {
                    return res.json([log(`SQL Error: ${err.message}`, 'error')]);
                }

            case 'seed':
                try {
                    const seedCount = parseInt(args[0]) || 5;
                    const isSilent = args.includes('hidden'); // allow 'seed 5 hidden' for invisible test data

                    if (!TEST_MODE) return res.json([log('Enable TEST MODE first (test on) to use this command safely.', 'error')]);

                    const { rows: items } = await query('SELECT * FROM menu_items WHERE is_available = TRUE');
                    if (items.length === 0) return res.json([log('No menu items available to seed.', 'error')]);

                    let seeded = 0;
                    for (let i = 0; i < seedCount; i++) {
                        const orderId = `SEED-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                        const numItems = Math.floor(Math.random() * 4) + 1;
                        let total = 0;
                        const orderItems = [];

                        for (let j = 0; j < numItems; j++) {
                            const item = items[Math.floor(Math.random() * items.length)];
                            const qty = Math.floor(Math.random() * 2) + 1;
                            total += parseFloat(item.price) * qty;
                            orderItems.push({ ...item, quantity: qty });
                        }

                        // NOTE: We set is_test = FALSE by default so they show up in analytics!
                        // Unless 'hidden' arg is passed.
                        await query(
                            `INSERT INTO orders (id, status, total_amount, customer_name, created_at, table_number, beeper_number, is_test)
                             VALUES ($1, 'closed', $2, $3, NOW(), $4, $5, $6)`,
                            [orderId, total, `Test User ${i}`, Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 50) + 1, isSilent]
                        );

                        for (const item of orderItems) {
                            await query(
                                `INSERT INTO order_items (order_id, menu_item_id, menu_item_name_snapshot, menu_item_price_snapshot, quantity)
                                 VALUES ($1, $2, $3, $4, $5)`,
                                [orderId, item.id, item.name, item.price, item.quantity]
                            );
                        }
                        seeded++;
                    }
                    io.emit('order:refresh');
                    invalidateAnalyticsCache();
                    return res.json([
                        log(`Seeded ${seeded} orders.`, 'success'),
                        log(isSilent ? 'Hidden from analytics (is_test=true)' : 'Visible in Analytics. Run delete-analytics to wipe.', 'info')
                    ]);
                } catch (err) {
                    console.error('Seed error:', err);
                    return res.json([log(`Seed failed: ${err.message}`, 'error')]);
                }

            case 'reset-data':
                if (args[0] !== 'CONFIRM') return res.json([log('To wipe all data, type: reset-data CONFIRM', 'error')]);

                io.emit('order:refresh');
                invalidateAnalyticsCache();
                return res.json([log('SYSTEM RESET. ALL DATA WIPED.', 'error')]);

            case 'broadcast':
                const msg = args.join(' ');
                io.emit('broadcast', msg);
                return res.json([log(`Broadcast sent: "${msg}"`, 'success')]);

            default:
                return res.json([log(`Unknown command: ${command}`, 'error')]);
        }
    } catch (e) {
        console.error(e);
        res.json([log(`Error executing command: ${e.message}`, 'error')]);
    }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const startServer = async () => {
    await initDb();
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();

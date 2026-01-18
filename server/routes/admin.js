import express from 'express';
import { query } from '../db.js';
import { attachItemsToOrders } from '../utils/helpers.js';
import { AppState } from '../utils/state.js';

export const createAdminRouter = (io) => {
    const router = express.Router();

    // GET /api/admin/status
    router.get('/status', async (req, res) => {
        try {
            const { rows: openSessions } = await query("SELECT * FROM sessions WHERE status = 'OPEN'");
            res.json({
                status: openSessions.length > 0 ? 'OPEN' : 'CLOSED',
                session: openSessions[0] || null,
                maintenance: AppState.isMaintenance,
                isTest: AppState.isTest
            });
        } catch (err) {
            console.error('Error fetching session status:', err);
            res.status(500).json({ error: 'Status check failed' });
        }
    });

    // POST /api/admin/open-day
    router.post('/open-day', async (req, res) => {
        try {
            const { rows: openSessions } = await query("SELECT * FROM sessions WHERE status = 'OPEN'");
            if (openSessions.length > 0) return res.status(400).json({ error: 'Session already open' });

            const { rows: newSession } = await query(
                `INSERT INTO sessions (status, opened_at, total_orders, total_sales) 
                 VALUES ('OPEN', NOW(), 0, 0) RETURNING *`
            );

            // Reset maintenance
            AppState.isMaintenance = false;

            res.json(newSession[0]);
            io.emit('session:update', { status: 'OPEN' });
        } catch (err) {
            console.error('Error opening day:', err);
            res.status(500).json({ error: 'Failed to open day' });
        }
    });

    // POST /api/admin/close-day
    router.post('/close-day', async (req, res) => {
        try {
            const { rows: openSessions } = await query("SELECT * FROM sessions WHERE status = 'OPEN'");
            if (openSessions.length === 0) return res.status(400).json({ error: 'No open session' });

            const session = openSessions[0];
            const { rows: closed } = await query(
                `UPDATE sessions 
                 SET status = 'CLOSED', closed_at = NOW() 
                 WHERE id = $1 RETURNING *`,
                [session.id]
            );

            // Set maintenance
            // AppState.isMaintenance = true; // REMOVED: Auto-maintenance confuses separate "Closed" state

            // Also mark all open orders as Closed/Completed?
            // Optional: for now just close the session tracking.

            // Send summary
            res.json({
                success: true,
                summary: {
                    date: new Date(closed[0].closed_at).toLocaleDateString(),
                    orders: closed[0].total_orders,
                    sales: closed[0].total_sales
                }
            });
            io.emit('session:update', { status: 'CLOSED' });

        } catch (err) {
            console.error('Error closing day:', err);
            res.status(500).json({ error: 'Failed to close day' });
        }
    });

    // GET /api/admin/history
    router.get('/history', async (req, res) => {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        try {
            const { rows: items } = await query(
                `SELECT * FROM sessions 
                 WHERE status = 'CLOSED' 
                 ORDER BY closed_at DESC 
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            );

            const { rows: count } = await query(`SELECT COUNT(*) FROM sessions WHERE status = 'CLOSED'`);

            res.json({
                items: items.map(s => ({
                    id: s.id,
                    date: new Date(s.opened_at).toLocaleDateString(),
                    openedAt: s.opened_at,
                    closedAt: s.closed_at,
                    totalOrders: s.total_orders,
                    totalSales: parseFloat(s.total_sales)
                })),
                meta: {
                    page: parseInt(page),
                    totalPages: Math.ceil(parseInt(count[0].count) / limit)
                }
            });
        } catch (err) {
            console.error('Error fetching history:', err);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    });

    // GET /api/admin/history/:id
    router.get('/history/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const { rows: sessions } = await query(`SELECT * FROM sessions WHERE id = $1`, [id]);
            if (sessions.length === 0) return res.status(404).json({ error: 'Session not found' });

            const session = sessions[0];

            // Retention Policy Check: If closed > 24 hours ago, deny details
            const closedDate = new Date(session.closed_at);
            const now = new Date();
            const hoursSinceClose = (now - closedDate) / (1000 * 60 * 60);

            if (hoursSinceClose > 24) {
                return res.status(410).json({ error: 'Detailed receipts expired' });
            }

            // Fetch orders for this session
            // Logic: Orders created between opened_at and closed_at (or just associated if we had session_id column, but we use time range)
            const { rows: orders } = await query(
                `SELECT * FROM orders 
                 WHERE created_at >= $1 AND created_at <= $2`,
                [session.opened_at, session.closed_at]
            );

            const fullOrders = await attachItemsToOrders(orders);

            res.json({
                ...session,
                date: new Date(session.opened_at).toLocaleDateString(),
                openedAt: session.opened_at,
                closedAt: session.closed_at,
                totalOrders: session.total_orders,
                totalSales: parseFloat(session.total_sales),
                orders: fullOrders
            });

        } catch (err) {
            console.error('Error fetching session details:', err);
            res.status(500).json({ error: 'Failed to fetch details' });
        }
    });

    // GET /api/admin/analytics
    router.get('/analytics', async (req, res) => {
        const { period = 'week' } = req.query;
        // Basic analytics logic
        let dateFilter = `created_at > NOW() - INTERVAL '7 days'`;
        if (period === 'today') dateFilter = `created_at > CURRENT_DATE`;
        if (period === 'month') dateFilter = `created_at > NOW() - INTERVAL '30 days'`;

        try {
            // Top Items
            const { rows: topItems } = await query(`
                SELECT menu_item_name_snapshot as name, SUM(quantity) as quantity, SUM(menu_item_price_snapshot * quantity) as sales
                FROM order_items 
                JOIN orders ON orders.id = order_items.order_id
                WHERE orders.status != 'cancelled' AND ${dateFilter}
                GROUP BY name
                ORDER BY quantity DESC
                LIMIT 5
            `);

            // Daily Totals (Graph)
            const { rows: dailyTotals } = await query(`
                SELECT DATE(created_at) as date, SUM(total_amount) as sales, COUNT(*) as orders
                FROM orders
                WHERE status != 'cancelled' AND ${dateFilter}
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);

            // Total Cups Sold (Drinks only)
            const { rows: cupsData } = await query(`
                SELECT SUM(quantity) as total
                FROM order_items
                JOIN menu_items ON menu_items.id = order_items.menu_item_id
                JOIN orders ON orders.id = order_items.order_id
                WHERE orders.status != 'cancelled' 
                AND menu_items.type = 'drink'
                AND ${dateFilter.replace('created_at', 'orders.created_at')}
            `);

            res.json({
                topItems,
                dailyTotals,
                hourlyStats: [], // Simplified for now
                totalCups: parseInt(cupsData[0]?.total || 0)
            });

        } catch (err) {
            console.error('Error fetching analytics:', err);
            res.status(500).json({ error: 'Failed to fetch analytics' });
        }
    });

    // POST /api/admin/command (Developer Console)
    router.post('/command', async (req, res) => {
        const { command, args } = req.body;
        const logs = [];

        try {
            switch (command) {
                case 'help':
                    logs.push(
                        { message: 'Available commands:', type: 'info' },
                        { message: '  seed [count] - Generate dummy orders', type: 'info' },
                        { message: '  clear - Clear console', type: 'info' },
                        { message: '  version - Show server version', type: 'info' },
                        { message: '  maintenance [on|off] - Toggle maintenance mode', type: 'info' },
                        { message: '  test-mode [on|off] - Toggle test mode (orders allowed when closed)', type: 'info' },
                        { message: '  delete-analytics - [DANGER] Wipe all orders/sessions', type: 'info' }
                    );
                    break;

                case 'version':
                    logs.push({ message: 'Daily Dose POS Server v1.0.0 (Refactored)', type: 'success' });
                    break;

                case 'maintenance':
                    if (args[0] === 'on') {
                        AppState.isMaintenance = true;
                        logs.push({ message: 'Maintenance Mode ENABLED. Store is closed.', type: 'warning' });
                    } else if (args[0] === 'off') {
                        AppState.isMaintenance = false;
                        logs.push({ message: 'Maintenance Mode DISABLED. Store is open.', type: 'success' });
                    } else {
                        logs.push({ message: 'Usage: maintenance [on|off]', type: 'error' });
                    }
                    io.emit('session:update', { maintenance: AppState.isMaintenance });
                    break;

                case 'test-mode':
                    if (args[0] === 'on') {
                        AppState.isTest = true;
                        logs.push({ message: 'Test Mode ENABLED.', type: 'warning' });
                    } else if (args[0] === 'off') {
                        AppState.isTest = false;
                        logs.push({ message: 'Test Mode DISABLED.', type: 'success' });
                    } else {
                        logs.push({ message: 'Usage: test-mode [on|off]', type: 'error' });
                    }
                    break;

                case 'delete-analytics':
                    // Wipes orders and sessions to reset analytics
                    try {
                        await query('TRUNCATE TABLE order_items CASCADE');
                        await query('TRUNCATE TABLE orders CASCADE');
                        await query('TRUNCATE TABLE sessions CASCADE');
                        logs.push({ message: 'All analytics and orders have been wiped.', type: 'success' });
                        io.emit('order:update', {});
                        io.emit('session:update', {});
                    } catch (e) {
                        logs.push({ message: 'Failed to wipe analytics: ' + e.message, type: 'error' });
                    }
                    break;

                case 'seed':
                    const count = parseInt(args[0]) || 5;
                    logs.push({ message: `Seeding ${count} dummy orders...`, type: 'info' });

                    // Simple Seeder Logic
                    const { rows: items } = await query('SELECT * FROM menu_items WHERE deleted = FALSE LIMIT 5');
                    if (items.length === 0) {
                        logs.push({ message: 'No menu items found to seed with.', type: 'error' });
                        break;
                    }

                    for (let i = 0; i < count; i++) {
                        const randomItem = items[Math.floor(Math.random() * items.length)];
                        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
                        const newOrderId = `DD-SEED-${randomSuffix}`;

                        await query(
                            `INSERT INTO orders (id, customer_name, total_amount, status, is_test, payment_method, payment_status, created_at)
                             VALUES ($1, $2, $3, 'completed', TRUE, 'Cash', 'paid', NOW() - (random() * interval '7 days'))`,
                            [newOrderId, `Test User ${i + 1}`, parseFloat(randomItem.price)]
                        );
                        // Optional: Insert item detail for analytics validity?
                        // For faster seeding, we skip, but it might affect "Top Items" analytics if we rely on order_items table.
                        // Let's add the item to order_items to make analytics work properly.
                        await query(
                            `INSERT INTO order_items (order_id, menu_item_id, menu_item_name_snapshot, menu_item_price_snapshot, quantity, selected_flavors)
                             VALUES ($1, $2, $3, $4, 1, '[]')`,
                            [newOrderId, randomItem.id, randomItem.name, randomItem.price]
                        );
                    }
                    logs.push({ message: 'Seeding complete.', type: 'success' });
                    io.emit('order:update', {}); // Trigger refresh
                    break;

                default:
                    logs.push({ message: `Unknown command: ${command}`, type: 'error' });
            }

            res.json(logs);

        } catch (err) {
            console.error('Command failed:', err);
            res.status(500).json([{ message: 'Internal Server Error', type: 'error' }]);
        }
    });

    return router;
};

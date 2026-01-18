import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { query } from './db.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import compression from 'compression';
import helmet from 'helmet';

import { globalLimiter } from './middleware/rateLimiter.js';

// Routers
import { createMenuRouter } from './routes/menu.js';
import { createOrderRouter } from './routes/orders.js';
import { createAdminRouter } from './routes/admin.js';
import { AppState } from './utils/state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
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
app.use(globalLimiter);

// Log requests
app.use((req, res, next) => {
    // console.log(`${req.method} ${req.path}`);
    next();
});

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
        // Ensure columns exist (Migrations check)
        try {
            await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0`);
            await query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS total_sales DECIMAL(10,2) DEFAULT 0`);
            await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE`);
            await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS flavors JSONB DEFAULT '[]'`);
            await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS max_flavors INTEGER DEFAULT 1`);
            await query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'food'`);
            await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number INTEGER`);
            await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS beeper_number INTEGER`);
            await query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_flavors JSONB DEFAULT '[]'`);
            await query(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_flavor VARCHAR(255)`);
            await query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`);
            await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`);
            await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'paid'`);
            await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_tendered DECIMAL(10, 2)`);
            await query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10, 2)`);

            await query(`
                CREATE TABLE IF NOT EXISTS settings (
                    key VARCHAR(255) PRIMARY KEY,
                    value TEXT
                )
            `);
            await query(`INSERT INTO settings (key, value) VALUES ('theme', 'dark') ON CONFLICT DO NOTHING`);

            // Add Indexes for Performance
            await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
            await query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`);
            await query(`CREATE INDEX IF NOT EXISTS idx_orders_closed_at ON orders(closed_at)`);
            await query(`CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)`);

        } catch (e) { /* ignore */ }

        console.log('Database initialized');
    } catch (err) {
        console.error('Failed to init DB:', err);
    }
};

// Mount Routers
// Mount Routers
import { createSettingsRouter } from './routes/settings.js';
app.use('/api/menu', createMenuRouter(io));
app.use('/api/orders', createOrderRouter(io));
app.use('/api/admin', createAdminRouter(io));
app.use('/api/settings', createSettingsRouter(io));

// Serve Frontend (if needed)
// app.use(express.static(path.join(__dirname, '../client/dist')));
// app.get('*', (req, res) => {
//    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
// });

// Socket Connection
io.on('connection', (socket) => {
    // console.log('Client connected', socket.id);
});

httpServer.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await initDb();
});

// Handle Shutdown
process.on('SIGTERM', () => {
    process.exit(0);
});


import { query } from '../db.js';

const migrate = async () => {
    try {
        await query("ALTER TABLE orders ADD COLUMN order_type VARCHAR(20) DEFAULT 'dine-in';");
        console.log("Column 'order_type' added successfully.");
    } catch (e) {
        if (e.message.includes('duplicate column')) {
            console.log("Column 'order_type' already exists.");
        } else {
            console.error("Migration failed:", e);
        }
    }
    process.exit(0);
};

migrate();

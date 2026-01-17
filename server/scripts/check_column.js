
import { query } from '../db.js';

const checkColumn = async () => {
    try {
        const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_type';");
        if (res.rows.length > 0) {
            console.log("Column 'order_type' EXISTS.");
        } else {
            console.log("Column 'order_type' MISSING.");
        }
    } catch (e) {
        console.error("Check failed:", e);
    }
    process.exit(0);
};

checkColumn();

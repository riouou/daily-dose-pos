
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkColumns() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'menu_items';
    `);
        console.log('Columns:', res.rows.map(r => r.column_name).sort());
    } catch (err) {
        console.error('Error checking columns:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkColumns();

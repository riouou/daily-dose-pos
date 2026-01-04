import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

async function createDb() {
    if (process.env.DATABASE_URL) {
        console.log('ℹ️ DATABASE_URL detected. Skipping database creation step (Assuming DB exists).');
        return;
    }

    console.log(`Connecting to ${process.env.PGHOST}:${process.env.PGPORT} as ${process.env.PGUSER}...`);

    const client = new Client({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: 'postgres', // Connect to default maintenance DB
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
    });

    try {
        await client.connect();
        console.log('Connected to maintenance database.');

        try {
            await client.query('CREATE DATABASE daily_dose');
            console.log('✅ Database "daily_dose" created successfully.');
        } catch (err) {
            if (err.code === '42P04') {
                console.log('ℹ️ Database "daily_dose" already exists.');
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error('❌ Failed to create database:', err);
    } finally {
        await client.end();
    }
}

createDb();

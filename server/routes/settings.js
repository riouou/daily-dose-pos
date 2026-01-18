import express from 'express';
import { query } from '../db.js';

export const createSettingsRouter = (io) => {
    const router = express.Router();

    // GET /api/settings
    // Returns object: { key1: val1, key2: val2 }
    router.get('/', async (req, res) => {
        try {
            const { rows } = await query('SELECT key, value FROM settings');
            const settings = rows.reduce((acc, row) => {
                acc[row.key] = row.value;
                return acc;
            }, {});
            res.json(settings);
        } catch (err) {
            console.error('Failed to get settings:', err);
            res.status(500).json({ error: 'Failed to fetch settings' });
        }
    });

    // POST /api/settings
    // Body: { key: string, value: string }
    router.post('/', async (req, res) => {
        const { key, value } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ error: 'Missing key or value' });
        }

        try {
            await query(
                `INSERT INTO settings (key, value) 
                 VALUES ($1, $2) 
                 ON CONFLICT (key) DO UPDATE SET value = $2`,
                [key, value]
            );
            res.json({ success: true, key, value });
        } catch (err) {
            console.error('Failed to save setting:', err);
            res.status(500).json({ error: 'Failed to save setting' });
        }
    });

    return router;
};

import express from 'express';
import { query } from '../db.js';
import { validate } from '../middleware/validate.js';
import { menuItemSchema, categorySchema } from '../schemas/index.js';

export const createMenuRouter = (io) => {
    const router = express.Router();

    // GET /api/menu
    router.get('/', async (req, res) => {
        try {
            const { rows: categories } = await query('SELECT name FROM categories ORDER BY sort_order ASC, name ASC');
            // Filter out deleted items
            const { rows: items } = await query('SELECT * FROM menu_items WHERE deleted = FALSE OR deleted IS NULL ORDER BY category, name');

            // console.log(`Fetched ${items.length} active menu items`);

            const formattedItems = items.map(item => ({
                ...item,
                price: parseFloat(item.price),
                isAvailable: item.is_available,
                image: item.image_url,
                flavors: Array.isArray(item.flavors) ? item.flavors : [],
                maxFlavors: item.max_flavors || 1,
                type: item.type || 'food'
            }));

            // Fetch global addons
            const { rows: settingsRows } = await query("SELECT value FROM settings WHERE key = 'global_addons'");
            let globalAddons = [];
            if (settingsRows.length > 0) {
                try {
                    globalAddons = JSON.parse(settingsRows[0].value);
                } catch (e) { /* ignore */ }
            }

            res.json({
                categories: categories.map(c => c.name),
                items: formattedItems,
                globalAddons
            });
        } catch (err) {
            console.error('Error fetching menu:', err);
            res.status(500).json({ error: 'Failed to fetch menu' });
        }
    });

    // POST /api/menu/items
    router.post('/items', validate(menuItemSchema), async (req, res) => {
        const newItem = req.body;
        if (!newItem.id) newItem.id = Date.now().toString();

        try {
            await query(
                `INSERT INTO menu_items (id, name, price, category, is_available, image_url, items, flavors, max_flavors, type) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    newItem.id,
                    newItem.name,
                    newItem.price,
                    newItem.category,
                    newItem.isAvailable !== undefined ? newItem.isAvailable : true,
                    newItem.image,
                    JSON.stringify(newItem.items || []), // For combos, if any
                    JSON.stringify(newItem.flavors || []),
                    newItem.maxFlavors || 1,
                    newItem.type || 'food'
                ]
            );
            res.status(201).json(newItem);
            io.emit('menu:update');
        } catch (err) {
            console.error('Error adding menu item:', err);
            res.status(500).json({ error: 'Failed to add menu item' });
        }
    });

    // PUT /api/menu/items/:id
    router.put('/items/:id', validate(menuItemSchema.partial()), async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        try {
            const fields = [];
            const values = [];
            let idx = 1;

            if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
            if (updates.price !== undefined) { fields.push(`price = $${idx++}`); values.push(updates.price); }
            if (updates.category !== undefined) { fields.push(`category = $${idx++}`); values.push(updates.category); }
            if (updates.isAvailable !== undefined) { fields.push(`is_available = $${idx++}`); values.push(updates.isAvailable); }
            if (updates.image !== undefined) { fields.push(`image_url = $${idx++}`); values.push(updates.image); }
            if (updates.items !== undefined) { fields.push(`items = $${idx++}`); values.push(JSON.stringify(updates.items)); }
            if (updates.flavors !== undefined) { fields.push(`flavors = $${idx++}`); values.push(JSON.stringify(updates.flavors)); }
            if (updates.maxFlavors !== undefined) { fields.push(`max_flavors = $${idx++}`); values.push(updates.maxFlavors); }
            if (updates.type !== undefined) { fields.push(`type = $${idx++}`); values.push(updates.type); }

            if (fields.length === 0) return res.status(400).json({ error: 'No updates provided' });

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
                maxFlavors: updatedItem.max_flavors || 1,
                type: updatedItem.type || 'food'
            });
            io.emit('menu:update');
        } catch (err) {
            console.error('Error updating menu item:', err);
            res.status(500).json({ error: 'Failed to update menu item' });
        }
    });

    // DELETE /api/menu/items/:id (Soft Delete)
    router.delete('/items/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await query('UPDATE menu_items SET deleted = TRUE WHERE id = $1', [id]);
            res.json({ success: true });
            io.emit('menu:update');
        } catch (err) {
            console.error('Error deleting menu item:', err);
            res.status(500).json({ error: 'Failed to delete menu item' });
        }
    });

    // Categories Logic

    // POST /api/menu/categories
    router.post('/categories', validate(categorySchema), async (req, res) => {
        const { name } = req.body;
        try {
            await query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
            const { rows } = await query('SELECT name FROM categories ORDER BY sort_order ASC, name ASC');
            res.json(rows.map(c => c.name));
            io.emit('menu:update');
        } catch (err) {
            console.error('Error adding category:', err);
            res.status(500).json({ error: 'Failed to add category' });
        }
    });

    // DELETE /api/menu/categories/:name
    router.delete('/categories/:name', async (req, res) => {
        const { name } = req.params;
        if (name === 'All') return res.status(400).json({ error: 'Cannot delete default category' });

        try {
            await query('DELETE FROM categories WHERE name = $1', [name]);
            // Also delete (soft delete) items in this category or move them? 
            // For now, let's keep them but they won't show in any valid category tab. 
            // Or better: Move to "Uncategorized" or just leave them.
            // The frontend filters by category.

            const { rows } = await query('SELECT name FROM categories ORDER BY sort_order ASC, name ASC');
            res.json(rows.map(c => c.name));
            io.emit('menu:update');
        } catch (err) {
            console.error('Error deleting category:', err);
            res.status(500).json({ error: 'Failed to delete category' });
        }
    });


    // PUT /api/menu/categories/reorder
    router.put('/categories/reorder', async (req, res) => {
        const { categories } = req.body; // Expects array of strings ['Cat1', 'Cat2', ...]
        if (!Array.isArray(categories)) return res.status(400).json({ error: 'Invalid categories array' });

        const client = await import('../db.js').then(mod => mod.getClient());
        try {
            await client.query('BEGIN');
            for (let i = 0; i < categories.length; i++) {
                await client.query('UPDATE categories SET sort_order = $1 WHERE name = $2', [i, categories[i]]);
            }
            await client.query('COMMIT');

            const { rows } = await client.query('SELECT name FROM categories ORDER BY sort_order ASC, name ASC');
            res.json(rows.map(c => c.name));
            io.emit('menu:update');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error reordering categories:', err);
            res.status(500).json({ error: 'Failed to reorder categories' });
        } finally {
            client.release();
        }
    });

    return router;
};

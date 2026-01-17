import { query } from '../db.js';

export const attachItemsToOrders = async (orders) => {
    if (orders.length === 0) return [];

    const orderIds = orders.map(o => o.id);
    const { rows: items } = await query(
        `SELECT * FROM order_items WHERE order_id = ANY($1::text[])`,
        [orderIds]
    );

    // Fetch MenuItem details (Type, Emoji) to enrich the snapshot
    const menuItemIds = [...new Set(items.map(i => i.menu_item_id))];
    let menuDetails = {};
    if (menuItemIds.length > 0) {
        const { rows: details } = await query(
            `SELECT id, type, emoji FROM menu_items WHERE id = ANY($1::text[])`,
            [menuItemIds]
        );
        details.forEach(d => {
            menuDetails[d.id] = d;
        });
    }

    const itemsMap = {};
    items.forEach(item => {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];

        // Coalesce legacy selected_flavor into the array if needed
        let finalFlavors = item.selected_flavors || [];
        if (!finalFlavors.length && item.selected_flavor) {
            finalFlavors = [item.selected_flavor];
        }

        const detail = menuDetails[item.menu_item_id] || {};

        itemsMap[item.order_id].push({
            menuItem: {
                id: item.menu_item_id,
                name: item.menu_item_name_snapshot,
                price: parseFloat(item.menu_item_price_snapshot),
                type: detail.type || 'food', // Default to food if not found
                emoji: detail.emoji || '🍽️'
            },
            quantity: item.quantity,
            selectedFlavors: finalFlavors,
            selectedFlavor: finalFlavors[0] || null
        });
    });

    return orders.map(order => ({
        ...order,
        total: parseFloat(order.total_amount),
        createdAt: order.created_at, // Map snake_case to camelCase
        tableNumber: order.table_number,
        beeperNumber: order.beeper_number,
        customerName: order.customer_name,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        amountTendered: parseFloat(order.amount_tendered || 0),
        changeAmount: parseFloat(order.change_amount || 0),
        isTest: order.is_test,
        orderType: order.order_type,
        items: itemsMap[order.id] || []
    }));
};

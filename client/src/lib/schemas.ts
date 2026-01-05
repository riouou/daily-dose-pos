import { z } from 'zod';

export const orderItemSchema = z.object({
    menuItem: z.object({
        id: z.string().or(z.number()),
        name: z.string(),
        price: z.number()
    }),
    quantity: z.number().int().positive(),
    selectedFlavors: z.array(z.string()).optional(),
    selectedFlavor: z.string().optional().nullable() // For legacy support
});

export const orderSchema = z.object({
    items: z.array(orderItemSchema).min(1, "Order must contain at least one item"),
    customerName: z.string().optional(),
    tableNumber: z.number().int().positive().optional().nullable(),
    beeperNumber: z.number().int().positive().optional().nullable(),
    isTest: z.boolean().optional(),
    paymentMethod: z.enum(['Cash', 'Card', 'Pay Later']).optional(),
    amountTendered: z.number().optional(),
    changeAmount: z.number().optional()
});

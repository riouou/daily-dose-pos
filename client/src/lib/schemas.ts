import { z } from 'zod';

import { PAYMENT_METHOD_OPTIONS } from './constants';

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
    paymentMethod: z.enum(PAYMENT_METHOD_OPTIONS).optional(),
    amountTendered: z.number().optional(),
    changeAmount: z.number().optional()
});

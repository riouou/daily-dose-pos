import { z } from 'zod';

const flavorSectionSchema = z.object({
    name: z.string(),
    options: z.array(z.union([
        z.string(),
        z.object({ name: z.string(), price: z.number().optional() })
    ])),
    max: z.number().optional()
});

export const menuItemSchema = z.object({
    id: z.string().optional(), // ID is often generated or preserved
    name: z.string().min(1, "Name is required"),
    price: z.number().or(z.string().transform(val => parseFloat(val))).refine(val => !isNaN(val) && val >= 0, { message: "Price must be a positive number" }),
    category: z.string().min(1, "Category is required"),
    emoji: z.string().optional(),
    image: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    isAvailable: z.boolean().optional(),
    flavors: z.union([
        z.array(z.string()),
        z.array(flavorSectionSchema)
    ]).optional(),
    maxFlavors: z.number().int().min(1).optional(),
    type: z.enum(['food', 'drink']).optional()
});

export const categorySchema = z.object({
    category: z.string().min(1, "Category name is required")
});

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
    paymentMethod: z.enum(['Cash', 'Card', 'Pay Later']).optional(), // Adjust based on actual values
    amountTendered: z.number().optional(),
    changeAmount: z.number().optional()
});

export const settingsSchema = z.object({
    key: z.string().min(1),
    value: z.string()
});

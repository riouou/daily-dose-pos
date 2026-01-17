export const PAYMENT_METHOD_OPTIONS = [
    'Cash',
    'GCash',
    'Bank Transfer',
    'Pay Later',
    'Card'
] as const;

export type PaymentMethod = typeof PAYMENT_METHOD_OPTIONS[number];

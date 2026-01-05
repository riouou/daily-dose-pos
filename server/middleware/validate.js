import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
    try {
        // schema.parse throws if validation fails
        // We validate req.body by default, but you can extend this to params/query if needed
        // For strict body validation, we're using parsing directly on req.body

        // If the schema is designed to validate the whole body object
        req.body = schema.parse(req.body);

        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.errors.map(e => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            });
        }
        return res.status(500).json({ error: 'Internal Server Error during validation' });
    }
};

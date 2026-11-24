import { ZodError } from 'zod';
import { badRequest } from './errors.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  try {
    const parsed = schema.parse(req[source]);
    req[source] = parsed;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return next(
        badRequest(
          'Invalid request data',
          error.issues.map((issue) => ({
            field: issue.path.join('.') || source,
            message: issue.message,
          })),
        ),
      );
    }
    return next(error);
  }
};

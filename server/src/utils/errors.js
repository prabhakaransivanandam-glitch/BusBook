export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const badRequest = (message, details) => new ApiError(400, message, details);
export const unauthorized = (message = 'Authentication required') => new ApiError(401, message);
export const forbidden = (message = 'You do not have permission for this action') =>
  new ApiError(403, message);
export const notFound = (message = 'Resource not found') => new ApiError(404, message);
export const conflict = (message, details) => new ApiError(409, message, details);

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
  }

  if (error?.name === 'CastError') {
    return res.status(400).json({ error: `Invalid value for ${error.path}` });
  }

  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return res.status(409).json({ error: `${field} already exists` });
  }

  if (error?.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: Object.fromEntries(
        Object.entries(error.errors).map(([key, value]) => [key, value.message]),
      ),
    });
  }

  console.error('[BusBook] Unhandled error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}

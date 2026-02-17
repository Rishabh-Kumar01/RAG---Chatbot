/**
 * Global error handler middleware.
 *
 * Express recognizes this as an error handler because it has 4 parameters.
 * Normalizes Mongoose, JWT, and custom errors into consistent JSON responses.
 */
const errorHandler = (err, req, res, next) => {
    let error = {
        message: err.message || 'Something went wrong',
        statusCode: err.statusCode || 500,
        status: err.status || 'error',
        isOperational: err.isOperational || false,
    };

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        error.message = messages.join('. ');
        error.statusCode = 400;
    }

    // Mongoose cast error (e.g., invalid ObjectId)
    if (err.name === 'CastError') {
        error.message = `Invalid ${err.path}: ${err.value}`;
        error.statusCode = 400;
    }

    // MongoDB duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        error.message = `${field} already exists`;
        error.statusCode = 409;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token. Please log in again.';
        error.statusCode = 401;
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expired. Please log in again.';
        error.statusCode = 401;
    }

    // Send response
    const response = {
        success: false,
        error: error.message,
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(error.statusCode).json(response);
};

export default errorHandler;

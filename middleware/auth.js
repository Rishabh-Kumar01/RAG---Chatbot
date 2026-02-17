import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository.js';
import AppError from '../utils/error.js';

/**
 * Protect middleware — Verifies JWT and attaches user to req.
 *
 * 1. Extract token from Authorization header (Bearer <token>).
 * 2. Verify token (signature + expiry).
 * 3. Look up user in the database.
 * 4. Attach user to req.user for downstream use.
 *
 * For RAG: req.user._id is used to filter vectors in Qdrant (multi-tenant isolation).
 */
const protect = async (req, res, next) => {
    try {
        let token;

        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer')) {
            token = authHeader.split(' ')[1];
        }

        if (!token) {
            throw new AppError('Not authenticated. Please log in.', 401);
        }

        // Verify token (checks signature and expiry)
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                throw new AppError('Token expired. Please log in again.', 401);
            }
            if (jwtError.name === 'JsonWebTokenError') {
                throw new AppError('Invalid token. Please log in again.', 401);
            }
            throw new AppError('Authentication failed.', 401);
        }

        // Check if user still exists
        const user = await userRepository.findById(decoded.id);

        if (!user) {
            throw new AppError('User belonging to this token no longer exists.', 401);
        }

        // Attach user to request object
        req.user = user;

        next();
    } catch (error) {
        next(error);
    }
};

export default protect;

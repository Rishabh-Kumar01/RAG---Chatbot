import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository.js';
import AppError from '../utils/error.js';

/**
 * Auth Service — Business logic for authentication.
 * Register, login, and JWT token generation.
 */
class AuthService {
    /**
     * Register a new user.
     */
    register = async ({ username, email, password }) => {
        if (!username || !email || !password) {
            throw new AppError('Username, email, and password are required', 400);
        }

        // Create user (repository handles duplicate detection)
        const user = await userRepository.create({ username, email, password });

        const token = this.generateToken(user._id);

        return {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
            token,
        };
    };

    /**
     * Log in an existing user.
     * "Invalid email or password" is intentionally vague to prevent user enumeration.
     */
    login = async ({ email, password }) => {
        if (!email || !password) {
            throw new AppError('Email and password are required', 400);
        }

        // Find user WITH password field
        const user = await userRepository.findOne({ email }, true);

        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            throw new AppError('Invalid email or password', 401);
        }

        const token = this.generateToken(user._id);

        return {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
            },
            token,
        };
    };

    /**
     * Generate a signed JWT token.
     * Only stores user ID in payload — keep tokens small.
     */
    generateToken = (userId) => {
        return jwt.sign(
            { id: userId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
    };
}

export default new AuthService();

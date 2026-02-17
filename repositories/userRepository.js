import User from '../models/User.js';
import AppError from '../utils/error.js';

/**
 * User Repository — Data access layer for the User model.
 * Only this file imports the User model.
 */
class UserRepository {
    /**
     * Create a new user document.
     * Password hashed automatically by pre-save hook.
     */
    create = async ({ username, email, password }) => {
        try {
            const user = await User.create({ username, email, password });
            return user;
        } catch (error) {
            // Handle MongoDB duplicate key error (code 11000)
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                throw new AppError(`${field} already exists`, 409);
            }
            throw new AppError(`Failed to create user: ${error.message}`, 500);
        }
    };

    /**
     * Find a user by any field(s).
     * @param {boolean} includePassword - Whether to include the password field
     */
    findOne = async (query, includePassword = false) => {
        try {
            let userQuery = User.findOne(query);

            if (includePassword) {
                userQuery = userQuery.select('+password');
            }

            return await userQuery;
        } catch (error) {
            throw new AppError(`Failed to find user: ${error.message}`, 500);
        }
    };

    /**
     * Find a user by their MongoDB _id.
     */
    findById = async (id) => {
        try {
            return await User.findById(id);
        } catch (error) {
            throw new AppError(`Failed to find user: ${error.message}`, 500);
        }
    };
}

export default new UserRepository();

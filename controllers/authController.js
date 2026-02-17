import authService from '../services/authService.js';

/**
 * Auth Controller — Handles HTTP request/response for auth endpoints.
 * Arrow functions as class properties for automatic `this` binding.
 */
class AuthController {
    /**
     * POST /api/auth/register
     */
    register = async (req, res, next) => {
        try {
            const { username, email, password } = req.body;
            const result = await authService.register({ username, email, password });

            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/auth/login
     */
    login = async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const result = await authService.login({ email, password });

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/auth/me
     * Returns the currently authenticated user's profile.
     * Requires the `protect` middleware to run first (sets req.user).
     */
    getMe = async (req, res, next) => {
        try {
            res.status(200).json({
                success: true,
                data: {
                    user: {
                        id: req.user._id,
                        username: req.user.username,
                        email: req.user.email,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new AuthController();

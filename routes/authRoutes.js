import { Router } from 'express';
import authController from '../controllers/authController.js';
import protect from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public routes (no JWT required)
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Protected routes (JWT required)
router.get('/me', protect, authController.getMe);

export default router;

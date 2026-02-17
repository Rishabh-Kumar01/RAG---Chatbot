import { Router } from 'express';
import chatController from '../controllers/chatController.js';
import protect from '../middleware/auth.js';

const router = Router();

// All chat routes require authentication
router.use(protect);

// POST /api/chat — Send a message and get a streamed response
router.post('/', chatController.sendMessage);

// GET /api/chat/conversations — List all conversations for a user
router.get('/conversations', chatController.getConversations);

// GET /api/chat/conversations/:id — Get a single conversation with messages
router.get('/conversations/:id', chatController.getConversation);

export default router;

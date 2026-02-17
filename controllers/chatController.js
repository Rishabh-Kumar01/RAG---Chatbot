import chatService from '../services/chatService.js';
import conversationRepository from '../repositories/conversationRepository.js';

class ChatController {
    /**
     * Handle incoming chat messages and stream the response.
     * Uses Server-Sent Events (SSE) for token-by-token streaming.
     * req.user is set by the protect middleware.
     */
    sendMessage = async (req, res, next) => {
        try {
            const { conversationId, message } = req.body;
            const userId = req.user._id;

            if (!message) {
                return res.status(400).json({ success: false, error: 'Message is required' });
            }

            // Set SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // Stream response tokens
            const stream = chatService.chat(userId, conversationId, message);

            for await (const event of stream) {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            }

            res.end();
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get all conversations for the authenticated user.
     */
    getConversations = async (req, res, next) => {
        try {
            const userId = req.user._id;

            const conversations = await conversationRepository.findByUser(userId);
            res.json({ success: true, data: conversations });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get a single conversation with all messages.
     */
    getConversation = async (req, res, next) => {
        try {
            const { id } = req.params;
            const userId = req.user._id;

            const conversation = await conversationRepository.findOne({ _id: id, userId });
            if (!conversation) {
                return res.status(404).json({ success: false, error: 'Conversation not found' });
            }

            res.json({ success: true, data: conversation });
        } catch (error) {
            next(error);
        }
    };
}

export default new ChatController();

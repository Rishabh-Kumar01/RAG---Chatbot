import Conversation from '../models/Conversation.js';
import AppError from '../utils/error.js';

class ConversationRepository {
    /**
     * Create a new conversation.
     */
    create = async (data) => {
        try {
            return await Conversation.create(data);
        } catch (error) {
            throw new AppError(`Conversation creation failed: ${error.message}`, 500);
        }
    };

    /**
     * Find a single conversation matching the query.
     */
    findOne = async (query) => {
        return await Conversation.findOne(query);
    };

    /**
     * Find a conversation by ID.
     */
    findById = async (id) => {
        return await Conversation.findById(id);
    };

    /**
     * Find all conversations for a user (returns metadata only, not full messages).
     */
    findByUser = async (userId) => {
        return await Conversation.find({ userId, isActive: true })
            .select('title createdAt updatedAt totalTokens')
            .sort({ updatedAt: -1 });
    };

    /**
     * Add messages to a conversation.
     */
    addMessages = async (conversationId, messages) => {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw new AppError('Conversation not found', 404);

        conversation.messages.push(...messages);
        await conversation.save();
        return conversation;
    };

    /**
     * Update the running summary and summaryUpToIndex.
     */
    updateSummary = async (conversationId, summary, summaryUpToIndex) => {
        return await Conversation.findByIdAndUpdate(
            conversationId,
            { summary, summaryUpToIndex },
            { new: true }
        );
    };

    /**
     * Update a conversation by ID.
     */
    update = async (id, data) => {
        return await Conversation.findByIdAndUpdate(id, data, { new: true });
    };
}

export default new ConversationRepository();

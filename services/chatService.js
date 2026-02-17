import ragService from './ragService.js';
import llmService from './llmService.js';
import contextService from './contextService.js';
import guardrailService from './guardrailService.js';
import conversationRepository from '../repositories/conversationRepository.js';
import AppError from '../utils/error.js';
import { buildRagPrompt, DEFAULT_SYSTEM_PROMPT } from '../utils/promptTemplates.js';

class ChatService {
    /**
     * Main chat handler — orchestrates the entire flow.
     *
     * @param {string} userId - The authenticated user's ID
     * @param {string} conversationId - The conversation ID (or null for new conversation)
     * @param {string} userMessage - The user's message
     * @returns {AsyncGenerator} Yields streamed response tokens
     */
    chat = async function* (userId, conversationId, userMessage) {
        // Step 1: Input guardrails — check for prompt injection, toxic content, etc.
        const inputCheck = await guardrailService.validateInput(userMessage);
        if (!inputCheck.safe) {
            yield { type: 'error', content: inputCheck.reason };
            return;
        }

        // Step 2: Load or create conversation
        let conversation;
        if (conversationId) {
            conversation = await conversationRepository.findOne({
                _id: conversationId,
                userId,
            });
            if (!conversation) throw new AppError('Conversation not found', 404);
        } else {
            conversation = await conversationRepository.create({
                userId,
                title: userMessage.substring(0, 50),
            });
        }

        // Step 3: Context management — get summary + recent messages
        const { summary, recentMessages } = await contextService.getContext(conversation);

        // Step 4: Query rewriting — improve search query using conversation context
        const searchQuery = await this.rewriteQuery(userMessage, recentMessages);

        // Step 5: RAG retrieval — search both user and platform knowledge bases
        const retrievedChunks = await ragService.retrieve(searchQuery, userId, {
            topK: 5,
            userWeight: 1.2,
            platformWeight: 1.0,
        });

        // Step 6: Build the prompt
        const messages = buildRagPrompt({
            systemPrompt: DEFAULT_SYSTEM_PROMPT,
            conversationSummary: summary,
            retrievedChunks,
            recentMessages,
            userQuestion: userMessage,
        });

        // Step 7: Call the LLM with streaming
        let fullResponse = '';
        for await (const token of llmService.streamGenerate(messages)) {
            fullResponse += token;
            yield { type: 'token', content: token };
        }

        // Step 8: Save messages to conversation
        await conversationRepository.addMessages(conversation._id, [
            {
                role: 'user',
                content: userMessage,
            },
            {
                role: 'assistant',
                content: fullResponse,
                metadata: {
                    retrievedChunks: retrievedChunks.map(c => ({
                        text: c.text.substring(0, 200), // Truncate for storage
                        score: c.score,
                        source: c.source,
                        fileName: c.fileName,
                    })),
                    modelUsed: llmService.currentModel,
                },
            },
        ]);

        // Step 9: Check if context compaction is needed
        await contextService.compactIfNeeded(conversation._id);

        yield { type: 'done', conversationId: conversation._id };
    };

    /**
     * Rewrite a vague query into a precise search query.
     */
    rewriteQuery = async (userMessage, conversationHistory) => {
        if (!conversationHistory || conversationHistory.length === 0) {
            return userMessage;
        }

        const recentContext = conversationHistory
            .slice(-4)
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');

        const prompt = `Given this conversation:\n${recentContext}\n\nThe user just asked: "${userMessage}"\n\nRewrite as a standalone search query. Return ONLY the query.`;

        try {
            const rewritten = await llmService.generate(prompt, { maxTokens: 100 });
            return rewritten.trim() || userMessage;
        } catch {
            // If rewriting fails, use original query
            return userMessage;
        }
    };
}

export default new ChatService();

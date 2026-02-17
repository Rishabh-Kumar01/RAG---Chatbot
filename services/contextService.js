import llmService from './llmService.js';
import conversationRepository from '../repositories/conversationRepository.js';

class ContextService {
    constructor() {
        this.RECENT_WINDOW = 10;         // Keep last 10 messages verbatim
        this.COMPACTION_THRESHOLD = 20;  // Start compacting after 20 messages
        this.MAX_SUMMARY_TOKENS = 500;   // Max tokens for the running summary
    }

    /**
     * Get the conversation context for the current turn.
     * Returns a summary of older messages + recent messages verbatim.
     */
    getContext = async (conversation) => {
        const messages = conversation.messages || [];
        const summary = conversation.summary || '';

        if (messages.length <= this.RECENT_WINDOW) {
            // Short conversation — return all messages, no summary needed
            return {
                summary: '',
                recentMessages: messages.map(m => ({
                    role: m.role,
                    content: m.content,
                })),
            };
        }

        // Long conversation — return summary + recent window
        return {
            summary,
            recentMessages: messages.slice(-this.RECENT_WINDOW).map(m => ({
                role: m.role,
                content: m.content,
            })),
        };
    };

    /**
     * Check if compaction is needed and perform it.
     * Called after each new message is saved.
     */
    compactIfNeeded = async (conversationId) => {
        const conversation = await conversationRepository.findById(conversationId);
        const messages = conversation.messages || [];
        const summarizedUpTo = conversation.summaryUpToIndex || 0;

        // Only compact if we have enough unsummarized messages
        const unsummarizedCount = messages.length - this.RECENT_WINDOW - summarizedUpTo;
        if (unsummarizedCount < this.COMPACTION_THRESHOLD) {
            return; // Not enough new messages to justify summarization
        }

        // Get the messages that need to be summarized
        const toSummarize = messages.slice(
            summarizedUpTo,
            messages.length - this.RECENT_WINDOW
        );

        // Build the summarization prompt
        const existingSummary = conversation.summary || '';
        const newSummary = await this.generateSummary(existingSummary, toSummarize);

        // Update the conversation with the new summary
        await conversationRepository.updateSummary(
            conversationId,
            newSummary,
            messages.length - this.RECENT_WINDOW // New summaryUpToIndex
        );
    };

    /**
     * Generate a recursive summary.
     * Takes the existing summary + new messages and produces an updated summary.
     */
    generateSummary = async (existingSummary, newMessages) => {
        const messagesText = newMessages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');

        const prompt = existingSummary
            ? `Here is a summary of the conversation so far:
${existingSummary}

Here are the new messages since that summary:
${messagesText}

Update the summary to include the key information from these new messages.
Keep it concise (under 300 words). Focus on:
- Key facts, decisions, and agreements
- User preferences and requirements mentioned
- Important questions asked and answers given
- Any action items or follow-ups

Return ONLY the updated summary.`
            : `Summarize the following conversation. Focus on key facts, decisions, preferences, and important Q&A.
Keep it concise (under 300 words).

${messagesText}

Return ONLY the summary.`;

        return await llmService.generate(prompt, { maxTokens: this.MAX_SUMMARY_TOKENS });
    };
}

export default new ContextService();

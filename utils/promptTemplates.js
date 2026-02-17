/**
 * Default system prompt with RAG grounding instructions.
 */
export const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided context.

CRITICAL RULES:
1. ONLY answer based on the information in the <retrieved_context> section.
2. If the context does not contain enough information to answer the question, say:
   "I don't have enough information in my knowledge base to answer that question."
3. NEVER make up information that is not in the context.
4. When you use information from a source, mention which source it came from (e.g., "According to [Source 1: filename]...").
5. If the conversation summary provides relevant background, you may reference it.
6. Keep responses concise and directly relevant to the question.
7. If the user's question is a greeting or casual conversation (not a knowledge question), respond naturally without citing sources.`;

/**
 * Build the final prompt that gets sent to the LLM.
 * Structure: System Prompt → Conversation Summary → Retrieved Context → Recent Messages → Question
 */
export const buildRagPrompt = ({
    systemPrompt,
    conversationSummary,
    retrievedChunks,
    recentMessages,
    userQuestion,
}) => {
    const messages = [];

    // 1. System prompt (defines chatbot behavior and grounding rules)
    let system = systemPrompt || DEFAULT_SYSTEM_PROMPT;

    // 2. Add conversation summary if it exists (compacted history)
    if (conversationSummary) {
        system += `\n\n<conversation_summary>\n${conversationSummary}\n</conversation_summary>`;
    }

    // 3. Add retrieved context chunks
    if (retrievedChunks && retrievedChunks.length > 0) {
        const contextBlock = retrievedChunks
            .map((chunk, i) => `[Source ${i + 1}: ${chunk.fileName}]\n${chunk.text}`)
            .join('\n\n');

        system += `\n\n<retrieved_context>\n${contextBlock}\n</retrieved_context>`;
    }

    messages.push({ role: 'system', content: system });

    // 4. Add recent conversation messages (verbatim, not summarized)
    if (recentMessages && recentMessages.length > 0) {
        for (const msg of recentMessages) {
            messages.push({ role: msg.role, content: msg.content });
        }
    }

    // 5. Add the current user question
    messages.push({ role: 'user', content: userQuestion });

    return messages;
};

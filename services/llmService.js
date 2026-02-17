import { GoogleGenerativeAI } from '@google/generative-ai';
import AppError from '../utils/error.js';

class LlmService {
    constructor() {
        this.currentModel = 'gemini-2.0-flash';
        this.genAI = null;
        this.model = null;
    }

    /**
     * Initialize the Google Generative AI client lazily.
     */
    _init() {
        if (!this.genAI) {
            const apiKey = process.env.GOOGLE_AI_API_KEY;
            if (!apiKey || apiKey === 'AIza...') {
                throw new AppError('GOOGLE_AI_API_KEY not configured in .env', 500);
            }
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: this.currentModel });
        }
    }

    /**
     * Generate a complete (non-streaming) response.
     * Used for query rewriting, summarization, etc.
     *
     * @param {string} prompt - The prompt text
     * @param {object} options - Generation options
     * @returns {string} The generated text
     */
    generate = async (prompt, options = {}) => {
        this._init();
        const { maxTokens = 1024 } = options;

        try {
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: maxTokens,
                },
            });

            return result.response.text();
        } catch (error) {
            throw new AppError(`LLM generation failed: ${error.message}`, 500);
        }
    };

    /**
     * Stream a response token by token.
     * Used for the main chat response.
     *
     * @param {Array} messages - Array of { role, content } messages
     * @returns {AsyncGenerator<string>} Yields response tokens
     */
    streamGenerate = async function* (messages) {
        this._init();

        try {
            // Convert our message format to Gemini format
            // Gemini uses 'user' and 'model' roles, and the system prompt goes in systemInstruction
            const systemMessage = messages.find(m => m.role === 'system');
            const chatMessages = messages.filter(m => m.role !== 'system');

            // Build Gemini-compatible history and current message
            const history = [];
            for (let i = 0; i < chatMessages.length - 1; i++) {
                const msg = chatMessages[i];
                history.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }],
                });
            }

            const lastMessage = chatMessages[chatMessages.length - 1];

            // Create a chat session with system instruction
            const chatModel = this.genAI.getGenerativeModel({
                model: this.currentModel,
                systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
            });

            const chat = chatModel.startChat({ history });

            const result = await chat.sendMessageStream(lastMessage.content);

            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    yield text;
                }
            }
        } catch (error) {
            throw new AppError(`LLM streaming failed: ${error.message}`, 500);
        }
    };
}

export default new LlmService();

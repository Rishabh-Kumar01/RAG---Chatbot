import ollama from 'ollama';
import AppError from '../utils/error.js';

class EmbeddingService {
    constructor() {
        this.model = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
    }

    /**
     * Embed a single text string.
     * Returns a Float64Array of 768 dimensions.
     */
    embedText = async (text) => {
        try {
            // nomic-embed-text requires a prefix for optimal performance
            const prefixedText = `search_document: ${text}`;

            const response = await ollama.embeddings({
                model: this.model,
                prompt: prefixedText,
            });

            return response.embedding;
        } catch (error) {
            throw new AppError(`Embedding failed: ${error.message}`, 500);
        }
    };

    /**
     * Embed a search query (uses different prefix than documents).
     * This distinction improves retrieval quality.
     */
    embedQuery = async (query) => {
        try {
            // Queries use a different prefix than documents
            const prefixedQuery = `search_query: ${query}`;

            const response = await ollama.embeddings({
                model: this.model,
                prompt: prefixedQuery,
            });

            return response.embedding;
        } catch (error) {
            throw new AppError(`Query embedding failed: ${error.message}`, 500);
        }
    };

    /**
     * Embed multiple texts in batch.
     * Processes sequentially to avoid overwhelming Ollama.
     */
    embedBatch = async (texts, type = 'document') => {
        const embeddings = [];
        const prefix = type === 'query' ? 'search_query: ' : 'search_document: ';

        for (const text of texts) {
            const response = await ollama.embeddings({
                model: this.model,
                prompt: `${prefix}${text}`,
            });
            embeddings.push(response.embedding);
        }

        return embeddings;
    };
}

export default new EmbeddingService();

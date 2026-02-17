import embeddingService from './embeddingService.js';
import vectorRepository from '../repositories/vectorRepository.js';
import AppError from '../utils/error.js';

class RagService {
    /**
     * Full retrieval pipeline: embed query → search both namespaces → merge results.
     *
     * @param {string} query - The (possibly rewritten) search query
     * @param {string} userId - The user's ID for filtering user-specific data
     * @param {object} options - Configuration options
     * @returns {Array} Ranked array of relevant text chunks with metadata
     */
    retrieve = async (query, userId, options = {}) => {
        const {
            topK = 5,              // Number of results to return
            userWeight = 1.2,      // Boost factor for user-specific results
            platformWeight = 1.0,  // Boost factor for platform results
            scoreThreshold = 0.5,  // Minimum similarity score
        } = options;

        // Step 1: Embed the query
        const queryVector = await embeddingService.embedQuery(query);

        // Step 2: Search BOTH namespaces in parallel
        const [userResults, platformResults] = await Promise.all([
            // Search user's private knowledge base
            vectorRepository.search('user_knowledge', queryVector, {
                limit: topK,
                filter: {
                    must: [
                        { key: 'userId', match: { value: userId.toString() } },
                    ],
                },
            }),

            // Search platform-wide knowledge base
            vectorRepository.search('platform_knowledge', queryVector, {
                limit: topK,
            }),
        ]);

        // Step 3: Merge and rank results
        const merged = this.mergeAndRank(
            userResults,
            platformResults,
            userWeight,
            platformWeight,
            scoreThreshold
        );

        // Step 4: Return top K results
        return merged.slice(0, topK);
    };

    /**
     * Merge results from two namespaces, apply weights, and sort.
     */
    mergeAndRank = (userResults, platformResults, userWeight, platformWeight, threshold) => {
        const scored = [];

        for (const result of userResults) {
            if (result.score >= threshold) {
                scored.push({
                    text: result.payload.text,
                    score: result.score * userWeight,  // Boost user-specific results
                    source: 'user',
                    fileName: result.payload.fileName,
                    documentId: result.payload.documentId,
                    chunkIndex: result.payload.chunkIndex,
                });
            }
        }

        for (const result of platformResults) {
            if (result.score >= threshold) {
                scored.push({
                    text: result.payload.text,
                    score: result.score * platformWeight,
                    source: 'platform',
                    fileName: result.payload.fileName,
                    documentId: result.payload.documentId,
                    chunkIndex: result.payload.chunkIndex,
                });
            }
        }

        // Sort by weighted score (highest first)
        scored.sort((a, b) => b.score - a.score);

        return scored;
    };
}

export default new RagService();

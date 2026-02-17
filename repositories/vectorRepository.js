import { QdrantClient } from '@qdrant/js-client-rest';
import AppError from '../utils/error.js';

class VectorRepository {
    constructor() {
        this.client = new QdrantClient({
            url: process.env.QDRANT_URL || 'http://localhost:6333',
        });
    }

    /**
     * Insert or update points (vectors + payloads) in a collection.
     */
    upsertPoints = async (collectionName, points) => {
        try {
            await this.client.upsert(collectionName, {
                wait: true,
                points,
            });
        } catch (error) {
            throw new AppError(`Vector upsert failed: ${error.message}`, 500);
        }
    };

    /**
     * Search for similar vectors in a collection.
     * Optionally filter by payload fields (e.g., userId).
     */
    search = async (collectionName, queryVector, { limit = 5, filter = null } = {}) => {
        try {
            const searchParams = {
                vector: queryVector,
                limit,
                with_payload: true,  // Return the stored text and metadata
                score_threshold: 0.5, // Minimum similarity score (0-1)
            };

            if (filter) {
                searchParams.filter = filter;
            }

            const results = await this.client.search(collectionName, searchParams);
            return results;
        } catch (error) {
            throw new AppError(`Vector search failed: ${error.message}`, 500);
        }
    };

    /**
     * Delete points by their IDs.
     */
    deletePoints = async (collectionName, ids) => {
        try {
            await this.client.delete(collectionName, {
                wait: true,
                points: ids,
            });
        } catch (error) {
            throw new AppError(`Vector delete failed: ${error.message}`, 500);
        }
    };

    /**
     * Delete all points matching a filter (e.g., all chunks for a user).
     */
    deleteByFilter = async (collectionName, filter) => {
        try {
            await this.client.delete(collectionName, {
                wait: true,
                filter,
            });
        } catch (error) {
            throw new AppError(`Vector filter delete failed: ${error.message}`, 500);
        }
    };
}

export default new VectorRepository();

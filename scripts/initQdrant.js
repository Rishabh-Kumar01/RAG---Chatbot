import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });

const VECTOR_SIZE = 768; // nomic-embed-text output dimensions

const initCollections = async () => {
    // Collection for user-specific knowledge (multi-tenant via payload filtering)
    await client.createCollection('user_knowledge', {
        vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
        },
        // Optimize for filtered searches (by userId)
        optimizers_config: {
            indexing_threshold: 1000,
        },
    });

    // Create payload index on userId for fast filtering
    await client.createPayloadIndex('user_knowledge', {
        field_name: 'userId',
        field_schema: 'keyword',
    });

    // Collection for platform-wide knowledge (shared, no user filter)
    await client.createCollection('platform_knowledge', {
        vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
        },
    });

    console.log('Qdrant collections initialized successfully');
};

initCollections().catch(console.error);

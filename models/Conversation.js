import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    metadata: {
        // Store which chunks were retrieved for this message (for debugging/evaluation)
        retrievedChunks: [{
            text: String,
            score: Number,
            source: String,
            fileName: String,
        }],
        tokenCount: Number,
        modelUsed: String,
    },
}, { timestamps: true });

const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    title: {
        type: String,
        default: 'New Conversation',
    },
    messages: [messageSchema],
    summary: {
        type: String,   // Running summary of older messages (context compaction)
        default: '',
    },
    summaryUpToIndex: {
        type: Number,   // Index up to which messages have been summarized
        default: 0,
    },
    totalTokens: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

export default mongoose.model('Conversation', conversationSchema);

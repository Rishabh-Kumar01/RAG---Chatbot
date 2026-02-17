import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    fileType: {
        type: String,
        enum: ['pdf', 'docx', 'csv', 'txt'],
        required: true,
    },
    filePath: {
        type: String,  // Path in file storage (local or R2)
        required: true,
    },
    fileSize: {
        type: Number,  // Bytes
    },
    chunkIds: [{
        type: String,  // UUIDs of chunks stored in Qdrant
    }],
    chunkCount: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['uploading', 'processing', 'ready', 'failed'],
        default: 'uploading',
    },
    errorMessage: String,
    metadata: {
        title: String,
        description: String,
        tags: [String],
    },
}, { timestamps: true });

export default mongoose.model('Document', documentSchema);

import fs from 'fs/promises';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { v4 as uuidv4 } from 'uuid';
import embeddingService from './embeddingService.js';
import vectorRepository from '../repositories/vectorRepository.js';
import documentRepository from '../repositories/documentRepository.js';
import AppError from '../utils/error.js';

class DocumentService {
    constructor() {
        // Configure the text splitter
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,       // Target ~1000 characters per chunk
            chunkOverlap: 200,     // 200 character overlap between chunks
            separators: ['\n\n', '\n', '. ', ' ', ''], // Split priority order
        });
    }

    /**
     * Full ingestion pipeline: parse → chunk → embed → store
     */
    ingestDocument = async (userId, filePath, fileName, fileType) => {
        // Step 1: Create document record in MongoDB
        const doc = await documentRepository.create({
            userId,
            fileName,
            fileType,
            filePath,
            status: 'processing',
        });

        try {
            // Step 2: Extract raw text from the file
            const rawText = await this.parseDocument(filePath, fileType);

            if (!rawText || rawText.trim().length === 0) {
                throw new AppError('No text could be extracted from the document', 400);
            }

            // Step 3: Split text into chunks
            const chunks = await this.textSplitter.splitText(rawText);

            // Step 4: Embed all chunks
            const embeddings = await embeddingService.embedBatch(chunks, 'document');

            // Step 5: Store chunks + embeddings in Qdrant
            const chunkIds = [];
            const points = chunks.map((chunk, index) => {
                const id = uuidv4();
                chunkIds.push(id);

                return {
                    id,
                    vector: embeddings[index],
                    payload: {
                        userId: userId.toString(),  // For multi-tenant filtering
                        documentId: doc._id.toString(),
                        fileName,
                        chunkIndex: index,
                        totalChunks: chunks.length,
                        text: chunk,               // Store the raw text for retrieval
                        createdAt: new Date().toISOString(),
                    },
                };
            });

            await vectorRepository.upsertPoints('user_knowledge', points);

            // Step 6: Update document record with chunk info
            await documentRepository.update(doc._id, {
                chunkIds,
                chunkCount: chunks.length,
                status: 'ready',
            });

            return {
                documentId: doc._id,
                chunksCreated: chunks.length,
                status: 'ready',
            };
        } catch (error) {
            // Mark document as failed
            await documentRepository.update(doc._id, {
                status: 'failed',
                errorMessage: error.message,
            });
            throw error;
        }
    };

    /**
     * Extract text from various file formats.
     */
    parseDocument = async (filePath, fileType) => {
        const buffer = await fs.readFile(filePath);

        switch (fileType) {
            case 'pdf': {
                const data = await pdf(buffer);
                return data.text;
            }
            case 'docx': {
                const result = await mammoth.extractRawText({ buffer });
                return result.value;
            }
            case 'txt': {
                return buffer.toString('utf-8');
            }
            case 'csv': {
                // For CSV, convert to readable text format
                return buffer.toString('utf-8');
            }
            default:
                throw new AppError(`Unsupported file type: ${fileType}`, 400);
        }
    };

    /**
     * Delete all chunks for a document from Qdrant + MongoDB.
     */
    deleteDocument = async (userId, documentId) => {
        const doc = await documentRepository.findOne({ _id: documentId, userId });
        if (!doc) throw new AppError('Document not found', 404);

        // Delete chunks from Qdrant
        if (doc.chunkIds && doc.chunkIds.length > 0) {
            await vectorRepository.deletePoints('user_knowledge', doc.chunkIds);
        }

        // Delete document record from MongoDB
        await documentRepository.delete(documentId);

        // Delete file from storage
        try {
            await fs.unlink(doc.filePath);
        } catch (e) {
            // File may already be gone, don't throw
        }

        return { deleted: true, chunksRemoved: doc.chunkIds?.length || 0 };
    };
}

export default new DocumentService();

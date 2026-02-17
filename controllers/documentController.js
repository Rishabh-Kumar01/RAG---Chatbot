import documentService from '../services/documentService.js';
import documentRepository from '../repositories/documentRepository.js';
import path from 'path';

class DocumentController {
    /**
     * Upload and ingest a document.
     * req.user is set by the protect middleware.
     */
    uploadDocument = async (req, res, next) => {
        try {
            const userId = req.user._id;

            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No file uploaded' });
            }

            const { originalname, path: filePath, size } = req.file;
            const ext = path.extname(originalname).slice(1).toLowerCase();

            const result = await documentService.ingestDocument(
                userId,
                filePath,
                originalname,
                ext
            );

            res.status(201).json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };

    /**
     * List all documents for the authenticated user.
     */
    getDocuments = async (req, res, next) => {
        try {
            const userId = req.user._id;

            const documents = await documentRepository.findByUser(userId);
            res.json({ success: true, data: documents });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Delete a document and its associated chunks.
     */
    deleteDocument = async (req, res, next) => {
        try {
            const userId = req.user._id;
            const { id } = req.params;

            const result = await documentService.deleteDocument(userId, id);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    };
}

export default new DocumentController();

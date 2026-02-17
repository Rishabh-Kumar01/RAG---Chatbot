import { Router } from 'express';
import documentController from '../controllers/documentController.js';
import upload from '../middleware/upload.js';
import protect from '../middleware/auth.js';

const router = Router();

// All document routes require authentication
router.use(protect);

// POST /api/documents — Upload and ingest a document
router.post('/', upload.single('file'), documentController.uploadDocument);

// GET /api/documents — List all documents for a user
router.get('/', documentController.getDocuments);

// DELETE /api/documents/:id — Delete a document and its chunks
router.delete('/:id', documentController.deleteDocument);

export default router;

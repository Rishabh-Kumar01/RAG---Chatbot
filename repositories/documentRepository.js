import Document from '../models/Document.js';
import AppError from '../utils/error.js';

class DocumentRepository {
    /**
     * Create a new document record.
     */
    create = async (data) => {
        try {
            return await Document.create(data);
        } catch (error) {
            throw new AppError(`Document creation failed: ${error.message}`, 500);
        }
    };

    /**
     * Find a single document matching the query.
     */
    findOne = async (query) => {
        return await Document.findOne(query);
    };

    /**
     * Find all documents for a user.
     */
    findByUser = async (userId) => {
        return await Document.find({ userId }).sort({ createdAt: -1 });
    };

    /**
     * Find a document by ID.
     */
    findById = async (id) => {
        return await Document.findById(id);
    };

    /**
     * Update a document by ID.
     */
    update = async (id, data) => {
        return await Document.findByIdAndUpdate(id, data, { new: true });
    };

    /**
     * Delete a document by ID.
     */
    delete = async (id) => {
        return await Document.findByIdAndDelete(id);
    };
}

export default new DocumentRepository();

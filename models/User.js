import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User schema definition.
 *
 * The userId field in this model links to vectors in Qdrant.
 * Every document upload and vector search filters by this user's _id.
 * This is the foundation of multi-tenant data isolation.
 */
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [30, 'Username cannot exceed 30 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email address',
            ],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Never return password in queries by default
        },
    },
    {
        timestamps: true,
    }
);

/**
 * Pre-save hook: Hash password before saving.
 * Uses regular function (not arrow) because `this` must refer to the document.
 */
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

/**
 * Instance method: Compare a candidate password with the stored hash.
 * Since password has select: false, query must use .select('+password').
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const pendingRegistrationSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    registrationId: { type: String, required: true },
    fullName: { type: String, required: true },
    username: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, default: null },
    passwordHash: { type: String, required: true, select: false },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    nextResendAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    delivered: { type: Boolean, default: false }
}, { timestamps: true });

pendingRegistrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PendingRegistration', pendingRegistrationSchema);

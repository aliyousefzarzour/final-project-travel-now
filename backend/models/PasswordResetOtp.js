const mongoose = require('mongoose');

const passwordResetOtpSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ['tourist', 'company', 'admin'], default: 'tourist' },
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 }
}, { timestamps: true });

passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);

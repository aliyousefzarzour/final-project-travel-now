// =================== EMAIL VERIFICATION TOKEN MODEL ===================
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const emailVerificationTokenSchema = new mongoose.Schema({
    email:     { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date,   required: true },
    attempts:  { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 }
}, { timestamps: true });

// TTL — MongoDB auto-deletes expired documents
emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Generate a 6-digit code, hash it, store it, return the raw code
emailVerificationTokenSchema.statics.generate = async function(email) {
    const code      = String(Math.floor(100000 + Math.random() * 900000));
    const tokenHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.deleteMany({ email: email.toLowerCase().trim() });
    await this.create({ email: email.toLowerCase().trim(), tokenHash, expiresAt });
    return code;
};

// Verify a code — returns { ok, reason }
emailVerificationTokenSchema.statics.verify = async function(email, code) {
    const record = await this.findOne({ email: email.toLowerCase().trim() })
        .select('+tokenHash')
        .sort('-createdAt');

    if (!record)                         return { ok: false, reason: 'No verification code found. Please request a new one.' };
    if (record.expiresAt < new Date())   return { ok: false, reason: 'Verification code has expired. Please request a new one.' };
    if (record.attempts >= 5)            return { ok: false, reason: 'Too many attempts. Please request a new code.' };

    const match = await bcrypt.compare(String(code).trim(), record.tokenHash);
    if (!match) {
        record.attempts += 1;
        await record.save();
        return { ok: false, reason: `Incorrect code. ${5 - record.attempts} attempt(s) left.` };
    }

    // Valid — delete immediately to prevent reuse
    await this.deleteOne({ _id: record._id });
    return { ok: true };
};

module.exports = mongoose.model('EmailVerificationToken', emailVerificationTokenSchema);

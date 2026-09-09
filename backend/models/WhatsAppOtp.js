// =================== WHATSAPP OTP MODEL ===================
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const whatsAppOtpSchema = new mongoose.Schema({
    phone:      { type: String, required: true, index: true },
    otpHash:    { type: String, required: true, select: false },
    expiresAt:  { type: Date,   required: true },
    verifiedAt: { type: Date,   default: null },
    attempts:   { type: Number, default: 0 },
    // Cooldown: when next resend is allowed
    nextResendAt: { type: Date, default: null }
}, { timestamps: true });

// Auto-expire documents after expiresAt
whatsAppOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Statics
whatsAppOtpSchema.statics.generate = async function(phone) {
    // Generate a 6-digit OTP
    const otp     = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 8);
    const now     = new Date();

    // Upsert: remove old, create fresh
    await this.deleteMany({ phone });
    await this.create({
        phone,
        otpHash,
        expiresAt:    new Date(now.getTime() + 10 * 60 * 1000), // 10 min
        nextResendAt: new Date(now.getTime() + 60 * 1000)       // 60 sec cooldown
    });
    return otp; // raw OTP — send via WhatsApp, don't store
};

whatsAppOtpSchema.statics.verify = async function(phone, candidateOtp) {
    const record = await this.findOne({ phone, verifiedAt: null })
        .select('+otpHash')
        .sort('-createdAt');
    if (!record) return { ok: false, reason: 'OTP not found or already used' };
    if (record.expiresAt < new Date()) return { ok: false, reason: 'OTP expired' };
    if (record.attempts >= 5) return { ok: false, reason: 'Too many attempts. Request a new OTP.' };

    const match = await bcrypt.compare(String(candidateOtp), record.otpHash);
    if (!match) {
        record.attempts += 1;
        await record.save();
        return { ok: false, reason: `Incorrect OTP. ${5 - record.attempts} attempt(s) left.` };
    }

    record.verifiedAt = new Date();
    await record.save();
    return { ok: true };
};

module.exports = mongoose.model('WhatsAppOtp', whatsAppOtpSchema);

// =================== FEEDBACK MODEL ===================
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    // userId optional — contact form submissions won't have it
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Guest info (from contact form)
    guestName:  { type: String },
    guestEmail: { type: String },
    guestPhone: { type: String },
    // Content
    rating:  { type: Number, min: 1, max: 5, default: null },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    // Source: 'contact' = from contact page, 'feedback' = from feedback widget
    source: { type: String, enum: ['contact', 'feedback'], default: 'feedback' },
    image: String,
    isRead: { type: Boolean, default: false },
    adminResponse: String,
    userReply: String,
    userRepliedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);

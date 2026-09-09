// =================== CHAT MESSAGE MODEL ===================
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender:  { type: String, enum: ['user', 'admin'], required: true },
    text:    { type: String, required: true },
    readAt:  { type: Date, default: null }
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject:  { type: String, default: 'Support Chat' },
    status:   { type: String, enum: ['open', 'closed'], default: 'open' },
    messages: [messageSchema],
    // unread counts
    userUnread:  { type: Number, default: 0 },
    adminUnread: { type: Number, default: 0 },
    lastMessage: { type: String, default: '' },
    lastAt:      { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);

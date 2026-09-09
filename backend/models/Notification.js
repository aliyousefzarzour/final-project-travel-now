// =================== NOTIFICATION MODEL ===================
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: [
            'offer',
            'booking',
            'company',
            'company_approval',
            'company_rejection',
            'password_reset',
            'post',
            'favorite',
            'saved_trip',
            'admin',
            'admin_reply',
            'user_reply',
            'system'
        ],
        default: 'system'
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);

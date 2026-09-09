// =================== FEEDBACK CONTROLLER ===================
const Feedback = require('../models/Feedback');

// Submit feedback from contact page (no auth required)
exports.createFromContact = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ message: 'Name, email, subject and message are required' });
        }
        const feedback = await Feedback.create({
            guestName:  name.trim(),
            guestEmail: email.trim().toLowerCase(),
            guestPhone: phone || null,
            subject:    subject.trim(),
            message:    message.trim(),
            source:     'contact',
            userId:     null
        });
        res.status(201).json({ message: 'Message sent successfully', feedback });
    } catch (err) {
        console.error('Contact submit error:', err);
        res.status(500).json({ message: 'Failed to send message', error: err.message });
    }
};

// Submit feedback (logged-in users)
exports.create = async (req, res) => {
    try {
        const feedback = await Feedback.create({
            ...req.body,
            userId: req.user.id,
            source: req.body.source || 'feedback'
        });
        res.status(201).json({ message: 'Feedback submitted successfully', feedback });
    } catch (err) {
        res.status(500).json({ message: 'Feedback submission failed' });
    }
};

// Get user's feedback history
exports.getMyFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find({ userId: req.user.id })
            .sort('-createdAt')
            .catch(() => []);
        res.json({ feedback });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all feedback (admin)
exports.getAll = async (req, res) => {
    try {
        const feedback = await Feedback.find()
            .populate('userId', 'fullName email')
            .sort('-createdAt')
            .catch(() => []);
        res.json({ feedback });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Mark as read (admin)
exports.markRead = async (req, res) => {
    try {
        await Feedback.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ message: 'Marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin reply to feedback — sends notification to user
exports.adminReply = async (req, res) => {
    try {
        const { reply } = req.body;
        if (!reply || !reply.trim()) {
            return res.status(400).json({ message: 'Reply text is required' });
        }

        const feedback = await Feedback.findByIdAndUpdate(
            req.params.id,
            { adminResponse: reply.trim(), isRead: true },
            { new: true }
        ).populate('userId', 'fullName email');

        if (!feedback) return res.status(404).json({ message: 'Feedback not found' });

        // Send notification to user if they have an account
        if (feedback.userId?._id) {
            const { send: sendNotification } = require('./notificationController');
            await sendNotification(
                feedback.userId._id,
                'admin_reply',
                '📩 Admin replied to your message',
                reply.trim(),
                `/pages/notifications.html?feedback=${feedback._id}`
            );
        }

        res.json({ message: 'Reply sent successfully', feedback });
    } catch (err) {
        console.error('Admin reply error:', err);
        res.status(500).json({ message: 'Failed to send reply', error: err.message });
    }
};

// User reply to admin (from notification) — sends notification to admin
exports.userReply = async (req, res) => {
    try {
        const { reply } = req.body;
        if (!reply || !reply.trim()) {
            return res.status(400).json({ message: 'Reply text is required' });
        }

        const feedback = await Feedback.findOne({
            _id: req.params.id,
            userId: req.user.id
        }).catch(() => null);

        if (!feedback) return res.status(404).json({ message: 'Message not found' });

        // Append user reply to message thread
        const userReplyText = `\n\n--- User Reply (${new Date().toLocaleDateString('en-GB')}) ---\n${reply.trim()}`;
        await Feedback.findByIdAndUpdate(req.params.id, {
            $set: { userReply: reply.trim(), userRepliedAt: new Date() }
        });

        // Notify admin via the admin user (send to all admins via model)
        const User = require('../models/User');
        const adminUser = await User.findOne({ role: 'admin' }).catch(() => null);
        if (adminUser) {
            const { send: sendNotification } = require('./notificationController');
            await sendNotification(
                adminUser._id,
                'user_reply',
                `💬 User replied to your message`,
                `${req.user.fullName || 'A user'} replied to their feedback "${feedback.subject}": "${reply.trim().slice(0, 80)}${reply.length > 80 ? '…' : ''}"`,
                `/admin/admin.html#feedback`
            );
        }

        res.json({ message: 'Reply sent successfully' });
    } catch (err) {
        console.error('User reply error:', err);
        res.status(500).json({ message: 'Failed to send reply', error: err.message });
    }
};

// Get single feedback by ID (for user to view full conversation)
exports.getById = async (req, res) => {
    try {
        const feedback = await Feedback.findOne({
            _id: req.params.id,
            $or: [{ userId: req.user.id }, { _id: req.params.id }]
        }).catch(() => null);

        if (!feedback) return res.status(404).json({ message: 'Not found' });
        res.json({ feedback });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete feedback (admin)
exports.remove = async (req, res) => {
    try {
        await Feedback.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// =================== NOTIFICATION CONTROLLER ===================
const Notification = require('../models/Notification');

// Get user notifications
exports.getMy = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
        const skip = (page - 1) * limit;
        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find({ userId: req.user.id })
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .catch(() => []),
            Notification.countDocuments({ userId: req.user.id }).catch(() => 0),
            Notification.countDocuments({ userId: req.user.id, isRead: false }).catch(() => 0)
        ]);
        res.json({
            notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit) || 1
            },
            unreadCount
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Mark as read
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: 'Marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deleteAll = async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user.id });
        res.json({ message: 'All notifications deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Send notification (internal)
exports.send = async (userId, type, title, message, link = null) => {
    try {
        const notification = await Notification.create({
            userId,
            type,
            title,
            message,
            link
        });

        // Real-time push via Socket.IO (non-fatal if Socket not ready)
        try {
            const { emitToUser } = require('../services/socketService');
            emitToUser(String(userId), 'new_notification', {
                _id:       notification._id,
                type,
                title,
                message,
                link,
                isRead:    false,
                createdAt: notification.createdAt
            });
        } catch (_) {}

        return notification;
    } catch (err) {
        console.error('Notification failed:', err.message);
    }
};

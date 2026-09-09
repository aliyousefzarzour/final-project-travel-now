// =================== ADMIN CONTROLLER ===================
const User = require('../models/User');
const Company = require('../models/Company');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Feedback = require('../models/Feedback');
const Offer = require('../models/Offer');
const Attraction = require('../models/Attraction');

// Analytics dashboard
exports.getAnalytics = async (req, res) => {
    try {
        const [
            totalUsers, totalCompanies, totalBookings,
            totalPayments, totalReviews, totalFeedback
        ] = await Promise.all([
            User.countDocuments().catch(() => 0),
            Company.countDocuments().catch(() => 0),
            Booking.countDocuments().catch(() => 0),
            Payment.aggregate([
                { $match: { status: 'succeeded' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).catch(() => []),
            Review.countDocuments().catch(() => 0),
            Feedback.countDocuments().catch(() => 0)
        ]);

        const revenue = totalPayments[0]?.total || 0;

        res.json({
            analytics: {
                totalUsers,
                totalCompanies,
                totalBookings,
                revenue,
                totalReviews,
                totalFeedback
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Unable to load analytics', error: err.message });
    }
};

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort('-createdAt').catch(() => []);
        res.json({ users });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Ban/Unban user
exports.toggleBanUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.isBanned = !user.isBanned;
        await user.save();
        res.json({ message: user.isBanned ? 'User banned' : 'User unbanned', user });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all bookings (admin view)
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('userId', 'fullName email phone')
            .populate('offerId', 'title type destination')
            .populate('attractionId', 'name category governorate')
            .populate('companyId', 'companyName email phone')
            .sort('-createdAt')
            .catch(() => []);
        res.json({ bookings });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Send custom notification to a user (admin)
exports.sendNotification = async (req, res) => {
    try {
        const { title, message } = req.body;
        const { userId } = req.params;
        if (!title || !message) return res.status(400).json({ message: 'Title and message required' });

        const { send } = require('./notificationController');
        await send(userId, 'admin', title, message, null);

        res.json({ message: 'Notification sent' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all payments (admin view)
exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('userId', 'fullName email phone')
            .populate({
                path: 'bookingId',
                select: 'title amount travelDate companyId',
                populate: { path: 'companyId', select: 'companyName email phone' }
            })
            .sort('-createdAt')
            .catch(() => []);
        res.json({ payments });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

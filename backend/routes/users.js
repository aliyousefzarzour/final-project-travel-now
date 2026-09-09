// =================== USER ROUTES ===================
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/collectionController');
const User = require('../models/User');

router.get('/profile', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

router.get('/profile/details', authMiddleware, async (req, res) => {
    const user = await User.findById(req.user.id).select('-password').catch(() => null);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
});

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const allowedFields = ['fullName', 'username', 'country', 'phone', 'profilePicture'];
        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        // Check if username is already taken by another user
        if (updates.username) {
            const existing = await User.findOne({
                username: updates.username,
                _id: { $ne: req.user.id }
            }).catch(() => null);
            if (existing) {
                return res.status(400).json({ message: 'Username is already taken, try another one.' });
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: false }
        ).select('-password').catch(err => { throw err; });

        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'Profile updated', user });
    } catch (err) {
        console.error('Update profile error:', err.message, err.code);
        // Handle MongoDB duplicate key errors gracefully
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || 'field';
            return res.status(400).json({ message: `${field} is already taken. Please choose a different one.` });
        }
        res.status(500).json({ message: 'Update failed: ' + err.message });
    }
});

router.get('/profile/summary', authMiddleware, ctrl.getProfileSummary);

module.exports = router;

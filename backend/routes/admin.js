// =================== ADMIN ROUTES ===================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const reviewCtrl = require('../controllers/reviewController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/analytics', authMiddleware, requireRole('admin'), ctrl.getAnalytics);
router.get('/users', authMiddleware, requireRole('admin'), ctrl.getAllUsers);
router.put('/users/:id/ban', authMiddleware, requireRole('admin'), ctrl.toggleBanUser);
router.get('/bookings', authMiddleware, requireRole('admin'), ctrl.getAllBookings);
router.get('/payments', authMiddleware, requireRole('admin'), ctrl.getAllPayments);
router.get('/reviews', authMiddleware, requireRole('admin'), reviewCtrl.getAll);
router.delete('/reviews/:id', authMiddleware, requireRole('admin'), reviewCtrl.delete);
router.post('/notify/:userId', authMiddleware, requireRole('admin'), ctrl.sendNotification);

module.exports = router;

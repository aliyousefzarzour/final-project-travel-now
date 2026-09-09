// =================== FEEDBACK ROUTES ===================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/feedbackController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Public — contact page (no auth needed)
router.post('/contact', ctrl.createFromContact);

// Logged-in users
router.post('/', authMiddleware, ctrl.create);
router.get('/my', authMiddleware, ctrl.getMyFeedback);
router.get('/:id', authMiddleware, ctrl.getById);
router.put('/:id/user-reply', authMiddleware, ctrl.userReply);

// Admin only
router.get('/', authMiddleware, requireRole('admin'), ctrl.getAll);
router.put('/:id/read', authMiddleware, requireRole('admin'), ctrl.markRead);
router.put('/:id/reply', authMiddleware, requireRole('admin'), ctrl.adminReply);
router.delete('/:id', authMiddleware, requireRole('admin'), ctrl.remove);

module.exports = router;

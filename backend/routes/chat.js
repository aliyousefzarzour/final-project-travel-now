// =================== CHAT ROUTES ===================
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/chatController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// User routes
router.get('/my',              authMiddleware, ctrl.getMyChat);
router.post('/my/send',        authMiddleware, ctrl.userSend);

// Admin only
router.get('/',                authMiddleware, requireRole('admin'), ctrl.getAllChats);
router.get('/:id',             authMiddleware, requireRole('admin'), ctrl.getChatById);
router.post('/admin-init/:userId', authMiddleware, requireRole('admin'), ctrl.adminInitChat);
router.post('/:id/send',       authMiddleware, requireRole('admin'), ctrl.adminSend);
router.put('/:id/read',        authMiddleware, requireRole('admin'), ctrl.adminMarkRead);

module.exports = router;

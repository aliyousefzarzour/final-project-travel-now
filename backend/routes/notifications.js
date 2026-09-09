// =================== NOTIFICATION ROUTES ===================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/auth');

router.get('/my', authMiddleware, ctrl.getMy);
router.put('/my/read-all', authMiddleware, ctrl.markAllAsRead);
router.delete('/my', authMiddleware, ctrl.deleteAll);
router.put('/:id/read', authMiddleware, ctrl.markAsRead);

module.exports = router;

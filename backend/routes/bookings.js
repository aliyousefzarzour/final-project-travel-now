// =================== BOOKING ROUTES ===================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bookingController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.post('/', authMiddleware, ctrl.create);
router.get('/my', authMiddleware, ctrl.getMyBookings);
router.get('/company/bookings', authMiddleware, requireRole('company'), ctrl.getCompanyBookings);
router.get('/:id', authMiddleware, ctrl.getById);
router.get('/', authMiddleware, requireRole('admin'), ctrl.getAll);
router.put('/:id', authMiddleware, ctrl.update);
router.put('/:id/cancel', authMiddleware, ctrl.cancel);
router.delete('/:id', authMiddleware, ctrl.remove);

module.exports = router;

// =================== PAYMENT ROUTES (PCI-DSS) ===================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.post('/paymob/callback', ctrl.paymobCallback);

router.post('/create-intent', authMiddleware, requireRole('tourist'), ctrl.createPaymentIntent);
router.post('/confirm', authMiddleware, ctrl.confirmPayment);
router.get('/booking/:bookingId', authMiddleware, ctrl.getBookingPaymentStatus);
router.get('/my', authMiddleware, ctrl.getMyPayments);
router.get('/', authMiddleware, requireRole('admin'), ctrl.getAll);

module.exports = router;

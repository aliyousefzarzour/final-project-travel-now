// =================== PAYMENT ROUTES (PCI-DSS) ===================
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Webhook is raw-parsed in server.js and verified via Stripe signature.
router.post('/webhook', ctrl.webhook);

router.post('/create-intent', authMiddleware, ctrl.createPaymentIntent);
router.post('/confirm', authMiddleware, ctrl.confirmPayment);
router.get('/my', authMiddleware, ctrl.getMyPayments);
router.get('/', authMiddleware, requireRole('admin'), ctrl.getAll);

module.exports = router;

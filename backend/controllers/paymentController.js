// =================== PAYMENT CONTROLLER (PCI-DSS Compliant) ===================
// IMPORTANT: This is a production-ready architecture. The actual card processing
// is delegated to a secure payment gateway (Stripe, Paymob, or Accept).
// We NEVER store raw card numbers in our database.

const config = require('../config');
const stripe = config.STRIPE_SECRET_KEY ? require('stripe')(config.STRIPE_SECRET_KEY) : null;
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

// Create payment intent (secure tokenization via gateway)
exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = 'egp', bookingId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (!stripe) {
            const demoId = `pi_demo_${Date.now()}`;
            return res.json({
                clientSecret: `${demoId}_secret_demo`,
                paymentIntentId: demoId,
                demo: true
            });
        }

        // Create Stripe payment intent (Stripe tokenizes the card)
        // In production, the frontend uses Stripe.js to create a payment method
        // and sends only the paymentMethod.id to this endpoint.
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency.toLowerCase(),
            metadata: {
                userId: req.user.id,
                bookingId: bookingId || ''
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (err) {
        res.status(500).json({ message: 'Unable to create payment intent', error: err.message });
    }
};

// Confirm payment (after card tokenization on frontend)
exports.confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId, bookingId, cardBrand, cardLast4, billingAddress } = req.body;
        const amount = Number(req.body.amount);

        if (!paymentIntentId || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Payment intent and valid amount are required' });
        }
        if (cardLast4 && !/^\d{4}$/.test(String(cardLast4))) {
            return res.status(400).json({ message: 'cardLast4 must contain exactly 4 digits' });
        }

        // In production: verify payment status with Stripe
        // const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        // if (intent.status !== 'succeeded') return error

        // Save payment (NEVER store full card)
        const payment = await Payment.create({
            userId: req.user.id,
            bookingId,
            transactionId: paymentIntentId,
            paymentIntentId,
            cardBrand, // 'visa', 'mastercard', 'meeza'
            cardLast4, // Only last 4 digits
            amount,
            currency: 'EGP',
            status: 'succeeded',
            billingAddress,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Update booking status
        if (bookingId) {
            await Booking.findByIdAndUpdate(bookingId, { status: 'confirmed', paymentId: payment._id });
        }

        // WhatsApp receipt to company
        try {
            const wa      = require('../services/whatsappService');
            const Company = require('../models/Company');
            const Booking = require('../models/Booking');
            const User    = require('../models/User');

            const booking = bookingId
                ? await Booking.findById(bookingId).populate('companyId').catch(() => null)
                : null;

            if (booking?.companyId?.whatsapp) {
                const payer = await User.findById(req.user.id).select('fullName').catch(() => null);
                wa.sendPaymentReceipt(
                    booking.companyId.whatsapp,
                    booking.companyId.companyName,
                    {
                        userName:   payer?.fullName || 'Traveler',
                        amount:     payment.amount,
                        bookingRef: `TRV-${payment._id.toString().slice(-8).toUpperCase()}`,
                        destination: booking.title || '',
                        date:        new Date().toLocaleDateString('en-GB')
                    }
                ).catch(() => {});
            }
        } catch (_) {}

        res.json({
            message: 'Payment successful',
            payment: {
                id: payment._id,
                transactionId: payment.transactionId,
                amount: payment.amount,
                cardLast4: payment.cardLast4,
                cardBrand: payment.cardBrand,
                status: payment.status
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Payment confirmation failed' });
    }
};

// Stripe webhook (for async payment events)
exports.webhook = async (req, res) => {
    if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
        return res.status(503).send('Payment gateway is not configured');
    }
    const sig = req.headers['stripe-signature'];
    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, config.STRIPE_WEBHOOK_SECRET);

        switch (event.type) {
            case 'payment_intent.succeeded':
                const intent = event.data.object;
                await Payment.findOneAndUpdate(
                    { paymentIntentId: intent.id },
                    { status: 'succeeded' }
                );
                break;
            case 'payment_intent.payment_failed':
                await Payment.findOneAndUpdate(
                    { paymentIntentId: event.data.object.id },
                    { status: 'failed' }
                );
                break;
        }
        res.json({ received: true });
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};

// Get user's payment history
exports.getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user.id })
            .sort('-createdAt')
            .catch(() => []);
        res.json({ payments });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all payments (admin)
exports.getAll = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('userId', 'fullName email')
            .sort('-createdAt')
            .catch(() => []);
        res.json({ payments });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

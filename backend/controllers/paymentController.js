const crypto = require('crypto');
const mongoose = require('mongoose');
const config = require('../config');
const paymob = require('../services/paymobService');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Post = require('../models/Post');
const User = require('../models/User');
const { getTrustedBookingPrice } = require('../services/bookingPricing');

function getSandboxConfig(res) {
    try {
        return paymob.getSandboxConfig(config);
    } catch (error) {
        res.status(503).json({
            code: 'PAYMOB_SANDBOX_NOT_CONFIGURED',
            message: error.message
        });
        return null;
    }
}

function buildBillingData(user, booking) {
    const name = String(booking.contactInfo?.name || user.fullName || '').trim().split(/\s+/);
    const phone = String(booking.contactInfo?.phone || user.phone || '').trim();
    if (!phone) {
        throw new Error('A phone number is required for Paymob checkout');
    }

    return {
        apartment: 'N/A',
        first_name: (name[0] || 'Traveler').slice(0, 50),
        last_name: (name.slice(1).join(' ') || 'Guest').slice(0, 50),
        street: 'N/A',
        building: 'N/A',
        phone_number: phone,
        city: 'Cairo',
        country: 'EG',
        email: user.email,
        floor: 'N/A',
        state: 'Cairo',
        postal_code: 'NA'
    };
}

async function releaseFailedAttempt(payment) {
    await Promise.all([
        Payment.findOneAndUpdate(
            { _id: payment._id, status: 'pending' },
            { $set: { status: 'failed' } }
        ),
        Booking.findOneAndUpdate(
            { _id: payment.bookingId, paymentId: String(payment._id), status: 'pending' },
            { $unset: { paymentId: 1 } }
        )
    ]);
}

exports.createPaymentIntent = async (req, res) => {
    const sandbox = getSandboxConfig(res);
    if (!sandbox) return;

    if (['amount', 'currency', 'paymentIntentId', 'paymentStatus', 'success'].some(field => field in req.body)) {
        return res.status(400).json({ message: 'Payment amount, currency, and status are server-managed' });
    }
    const { bookingId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ message: 'A valid bookingId is required' });
    }

    try {
        let booking = await Booking.findOne({
            _id: bookingId,
            userId: req.user.id
        });
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.status !== 'pending') {
            return res.status(409).json({ message: 'Only pending bookings can be paid' });
        }

        if (booking.paymentId) {
            const existingPayment = await Payment.findById(booking.paymentId);
            if (existingPayment?.status === 'pending') {
                return res.status(409).json({
                    code: 'PAYMENT_ALREADY_PENDING',
                    message: 'A checkout has already been created for this booking'
                });
            }
            return res.status(409).json({ message: 'This booking is not available for another payment attempt' });
        }

        let trustedPrice;
        try {
            trustedPrice = await getTrustedBookingPrice(booking, req.user.id);
        } catch (error) {
            return res.status(409).json({ message: error.message });
        }
        const amountCents = Math.round(trustedPrice.amount * 100);
        if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
            return res.status(409).json({ message: 'Booking has no valid payable amount' });
        }
        if (booking.amount !== trustedPrice.amount || booking.currency !== trustedPrice.currency) {
            booking = await Booking.findOneAndUpdate(
                { _id: booking._id, userId: req.user.id, status: 'pending', paymentId: null },
                { $set: { amount: trustedPrice.amount, currency: trustedPrice.currency } },
                { new: true }
            );
            if (!booking) return res.status(409).json({ message: 'Booking changed and is no longer eligible for payment' });
        }

        const user = await User.findById(req.user.id).select('fullName email phone');
        if (!user) return res.status(404).json({ message: 'User account not found' });
        let billingData;
        try {
            billingData = buildBillingData(user, booking);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        const paymentAttemptId = crypto.randomUUID();
        const payment = await Payment.create({
            userId: req.user.id,
            bookingId: booking._id,
            gateway: 'paymob',
            transactionId: `attempt:${paymentAttemptId}`,
            paymentAttemptId,
            amount: amountCents / 100,
            amountCents,
            currency: 'EGP',
            status: 'pending',
            checkoutExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        const lockedBooking = await Booking.findOneAndUpdate(
            { _id: booking._id, userId: req.user.id, status: 'pending', paymentId: null },
            { $set: { paymentId: String(payment._id) } },
            { new: true }
        );
        if (!lockedBooking) {
            await Payment.deleteOne({ _id: payment._id });
            return res.status(409).json({ message: 'Booking is already being paid or is no longer eligible' });
        }

        const returnUrl = new URL(sandbox.returnUrl);
        returnUrl.searchParams.set('bookingId', String(booking._id));
        const payload = {
            amount: amountCents,
            currency: 'EGP',
            payment_methods: [sandbox.integrationId],
            items: [{
                name: String(booking.title).slice(0, 50),
                amount: amountCents,
                description: String(booking.title).slice(0, 255),
                quantity: 1
            }],
            billing_data: billingData,
            special_reference: paymentAttemptId,
            expiration: 3600,
            notification_url: sandbox.callbackUrl,
            redirection_url: returnUrl.toString()
        };

        let intention;
        try {
            intention = await paymob.createIntention(payload, sandbox);
            if (
                !intention?.client_secret ||
                !intention?.id ||
                !Number.isSafeInteger(intention.intention_order_id) ||
                intention.intention_order_id <= 0
            ) {
                throw new Error('Paymob intention response is missing required checkout identifiers');
            }
            await Payment.findOneAndUpdate(
                { _id: payment._id, status: 'pending' },
                {
                    $set: {
                        paymobIntentionId: String(intention.id),
                        paymobOrderId: String(intention.intention_order_id),
                        paymentIntentId: String(intention.id)
                    }
                }
            );
        } catch (error) {
            console.error('Paymob sandbox intention creation failed:', error.message);
            await releaseFailedAttempt(payment);
            return res.status(502).json({ message: 'Unable to start Paymob sandbox checkout' });
        }

        return res.status(201).json({
            checkoutUrl: paymob.createCheckoutUrl(sandbox.publicKey, intention.client_secret),
            bookingId: String(booking._id),
            amount: amountCents / 100,
            currency: 'EGP',
            status: 'pending',
            testMode: true
        });
    } catch (error) {
        console.error('Payment initialization failed:', error.message);
        return res.status(500).json({ message: 'Unable to initialize payment' });
    }
};

exports.confirmPayment = (req, res) => res.status(410).json({
    code: 'CLIENT_CONFIRMATION_DISABLED',
    message: 'Client-submitted payment confirmations are disabled. Paymob verifies payment status.'
});

exports.paymobCallback = async (req, res) => {
    let sandbox;
    try {
        sandbox = paymob.getSandboxConfig(config);
    } catch (error) {
        return res.status(503).json({ message: 'Paymob sandbox callback verification is not configured' });
    }

    const callback = req.body;
    const transaction = callback?.obj;
    const signature = req.query.hmac || callback?.hmac;
    try {
        if (!paymob.verifyCallbackHmac(callback, signature, sandbox.hmacSecret)) {
            return res.status(401).json({ message: 'Invalid Paymob callback signature' });
        }
    } catch (error) {
        return res.status(400).json({ message: 'Invalid Paymob callback payload' });
    }

    if (Number(transaction.integration_id) !== sandbox.integrationId) {
        return res.status(409).json({ message: 'Paymob callback does not match the configured sandbox integration' });
    }

    const orderId = String(transaction.order.id);
    const paymentAttemptId = String(transaction.order.merchant_order_id || '');
    if (!paymentAttemptId) {
        return res.status(400).json({ message: 'Paymob callback is missing its payment reference' });
    }

    try {
        const payment = await Payment.findOne({
            gateway: 'paymob',
            paymobOrderId: orderId,
            paymentAttemptId
        });
        if (!payment) return res.status(404).json({ message: 'Paymob payment attempt not found' });

        const amountCents = Number(transaction.amount_cents);
        const orderAmountCents = Number(transaction.order.amount_cents);
        if (
            !Number.isSafeInteger(amountCents) ||
            amountCents !== payment.amountCents ||
            orderAmountCents !== payment.amountCents ||
            transaction.currency !== payment.currency ||
            transaction.order.currency !== payment.currency
        ) {
            return res.status(409).json({ message: 'Paymob transaction amount or currency does not match the booking' });
        }

        const transactionId = String(transaction.id);
        if (payment.status !== 'pending') {
            if (payment.paymobTransactionId === transactionId) {
                if (payment.status === 'failed' || payment.status === 'cancelled') {
                    await Booking.findOneAndUpdate(
                        { _id: payment.bookingId, paymentId: String(payment._id), status: 'pending' },
                        { $unset: { paymentId: 1 } }
                    );
                }
                return res.json({ received: true, duplicate: true });
            }
            return res.status(409).json({ message: 'Payment attempt has already been processed' });
        }

        if (transaction.pending === true) {
            return res.json({ received: true, status: 'pending' });
        }

        const verifiedSuccess = transaction.success === true &&
            transaction.error_occured === false &&
            transaction.is_refunded === false &&
            transaction.is_voided === false;

        if (!verifiedSuccess) {
            const status = transaction.is_voided === true ? 'cancelled' : 'failed';
            const updated = await Payment.findOneAndUpdate(
                { _id: payment._id, status: 'pending' },
                { $set: { status, paymobTransactionId: transactionId, transactionId } },
                { new: true }
            );
            if (updated) {
                await Booking.findOneAndUpdate(
                    { _id: payment.bookingId, paymentId: String(payment._id), status: 'pending' },
                    { $unset: { paymentId: 1 } }
                );
            }
            return res.json({ received: true, status });
        }

        const session = await mongoose.startSession();
        let duplicate = false;
        try {
            await session.withTransaction(async () => {
                const currentPayment = await Payment.findById(payment._id).session(session);
                if (currentPayment?.status === 'succeeded') {
                    if (currentPayment.paymobTransactionId !== transactionId) {
                        throw new Error('PAYMENT_ATTEMPT_ALREADY_PROCESSED');
                    }
                    duplicate = true;
                    return;
                }
                if (!currentPayment || currentPayment.status !== 'pending') {
                    throw new Error('PAYMENT_ATTEMPT_NOT_PENDING');
                }

                const updatedPayment = await Payment.findOneAndUpdate(
                    { _id: payment._id, status: 'pending' },
                    {
                        $set: {
                            status: 'succeeded',
                            paymobTransactionId: transactionId,
                            transactionId
                        }
                    },
                    { new: true, session }
                );
                if (!updatedPayment) throw new Error('PAYMENT_ATTEMPT_NOT_PENDING');

                const booking = await Booking.findOneAndUpdate(
                    {
                        _id: payment.bookingId,
                        userId: payment.userId,
                        status: 'pending',
                        paymentId: String(payment._id)
                    },
                    { $set: { status: 'confirmed' } },
                    { new: true, session }
                );
                if (!booking) throw new Error('BOOKING_NOT_ELIGIBLE');

                if (booking.type === 'proposal') {
                    const post = await Post.findOneAndUpdate(
                        {
                            _id: booking.proposalPostId,
                            userId: booking.userId,
                            marketplaceStatus: 'locked',
                            acceptedProposalId: booking.proposalId
                        },
                        { $set: { marketplaceStatus: 'closed', isActive: false } },
                        { new: true, session }
                    );
                    if (!post) throw new Error('PROPOSAL_NOT_ELIGIBLE');
                }
            });
        } finally {
            await session.endSession();
        }

        if (!duplicate) await sendVerifiedReceipt(payment);
        return res.json({ received: true, status: 'succeeded', duplicate });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Paymob transaction was already associated with another payment' });
        }
        if (['PAYMENT_ATTEMPT_ALREADY_PROCESSED', 'PAYMENT_ATTEMPT_NOT_PENDING'].includes(error.message)) {
            return res.status(409).json({ message: 'Payment attempt is no longer pending' });
        }
        if (['BOOKING_NOT_ELIGIBLE', 'PROPOSAL_NOT_ELIGIBLE'].includes(error.message)) {
            return res.status(409).json({ message: 'Booking is no longer eligible for payment' });
        }
        console.error('Paymob callback processing failed:', error.message);
        return res.status(503).json({ message: 'Paymob callback could not be processed; booking remains unpaid' });
    }
};

async function sendVerifiedReceipt(payment) {
    try {
        const [booking, payer] = await Promise.all([
            Booking.findById(payment.bookingId).populate('companyId'),
            User.findById(payment.userId).select('fullName')
        ]);
        if (!booking?.companyId?.whatsapp) return;

        const wa = require('../services/whatsappService');
        await wa.sendPaymentReceipt(
            booking.companyId.whatsapp,
            booking.companyId.companyName,
            {
                userName: payer?.fullName || 'Traveler',
                amount: payment.amount,
                bookingRef: `TRV-${payment._id.toString().slice(-8).toUpperCase()}`,
                destination: booking.title || '',
                date: new Date().toLocaleDateString('en-GB')
            }
        );
    } catch (error) {
        console.error('Verified payment receipt notification failed:', error.message);
    }
}

exports.getBookingPaymentStatus = async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.bookingId)) {
        return res.status(400).json({ message: 'Invalid bookingId' });
    }

    try {
        const booking = await Booking.findOne({
            _id: req.params.bookingId,
            userId: req.user.id
        });
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        const payment = booking.paymentId
            ? await Payment.findById(booking.paymentId)
            : await Payment.findOne({ bookingId: booking._id, gateway: 'paymob' }).sort('-createdAt');
        return res.json({
            bookingId: String(booking._id),
            status: payment?.status || (booking.status === 'cancelled' ? 'cancelled' : 'pending'),
            amount: payment?.amount ?? booking.amount,
            currency: payment?.currency || booking.currency,
            canInitiate: booking.status === 'pending' &&
                (!booking.paymentId || ['failed', 'cancelled'].includes(payment?.status)),
            testMode: true
        });
    } catch (error) {
        console.error('Payment status lookup failed:', error.message);
        return res.status(500).json({ message: 'Unable to retrieve payment status' });
    }
};

exports.getMyPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ userId: req.user.id })
            .sort('-createdAt');
        res.json({ payments });
    } catch (error) {
        res.status(500).json({ message: 'Unable to retrieve payments' });
    }
};

exports.getAll = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('userId', 'fullName email')
            .sort('-createdAt');
        res.json({ payments });
    } catch (error) {
        res.status(500).json({ message: 'Unable to retrieve payments' });
    }
};

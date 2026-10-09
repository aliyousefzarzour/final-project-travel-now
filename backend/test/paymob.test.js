const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const config = require('../config');
const paymob = require('../services/paymobService');
const paymentController = require('../controllers/paymentController');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Offer = require('../models/Offer');
const User = require('../models/User');

const TEST_HMAC_SECRET = 'sandbox_hmac_secret_for_unit_tests_only_123456';
const TEST_CONFIG = {
    PAYMOB_MODE: 'sandbox',
    PAYMOB_SECRET_KEY: 'egy_sk_test_unit_test_only',
    PAYMOB_PUBLIC_KEY: 'egy_pk_test_unit_test_only',
    PAYMOB_CARD_INTEGRATION_ID: '123456',
    PAYMOB_HMAC_SECRET: TEST_HMAC_SECRET,
    PAYMOB_CALLBACK_URL: 'https://sandbox.example.test/api/payments/paymob/callback',
    PAYMOB_RETURN_URL: 'http://localhost:8000/pages/payment.html'
};

function patch(t, target, property, replacement) {
    const original = target[property];
    target[property] = replacement;
    t.after(() => { target[property] = original; });
}

function configureSandbox(t, overrides = {}) {
    for (const [key, value] of Object.entries({ ...TEST_CONFIG, ...overrides })) {
        patch(t, config, key, value);
    }
}

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

function request(body = {}, user = { id: '507f1f77bcf86cd799439011', role: 'tourist' }) {
    return {
        body,
        user,
        query: {},
        ip: '127.0.0.1',
        get: () => 'Paymob sandbox unit test'
    };
}

function transactionCallback(overrides = {}) {
    return {
        type: 'TRANSACTION',
        obj: {
            id: 192036465,
            amount_cents: 21400,
            created_at: '2026-10-10T00:00:00.000000',
            currency: 'EGP',
            error_occured: false,
            has_parent_transaction: false,
            integration_id: 123456,
            is_3d_secure: true,
            is_auth: false,
            is_capture: false,
            is_refunded: false,
            is_standalone_payment: true,
            is_voided: false,
            owner: 302852,
            pending: false,
            success: true,
            source_data: { pan: '2346', sub_type: 'MasterCard', type: 'card' },
            order: {
                id: 217503754,
                amount_cents: 21400,
                currency: 'EGP',
                merchant_order_id: 'attempt-reference'
            },
            ...overrides
        }
    };
}

function signatureFor(callback) {
    return crypto.createHmac('sha512', TEST_HMAC_SECRET)
        .update(paymob.getCallbackHmacString(callback), 'utf8')
        .digest('hex');
}

function mockSuccessfulCallbackModels(t, status = 'pending') {
    const payment = {
        _id: 'payment-record',
        userId: '507f1f77bcf86cd799439011',
        bookingId: 'booking-record',
        gateway: 'paymob',
        paymentAttemptId: 'attempt-reference',
        paymobOrderId: '217503754',
        paymobTransactionId: null,
        amount: 214,
        amountCents: 21400,
        currency: 'EGP',
        status
    };
    const booking = {
        _id: 'booking-record',
        userId: payment.userId,
        paymentId: payment._id,
        type: 'offer',
        status: 'pending'
    };
    let paymentUpdates = 0;
    let bookingUpdates = 0;

    patch(t, Payment, 'findOne', async () => payment);
    patch(t, Payment, 'findById', () => ({ session: async () => payment }));
    patch(t, Payment, 'findOneAndUpdate', async (_filter, update) => {
        paymentUpdates += 1;
        Object.assign(payment, update.$set || {});
        return payment;
    });
    patch(t, Booking, 'findOneAndUpdate', async (_filter, update) => {
        bookingUpdates += 1;
        Object.assign(booking, update.$set || {});
        return booking;
    });
    patch(t, Booking, 'findById', () => ({ populate: async () => ({ companyId: null }) }));
    patch(t, User, 'findById', () => ({ select: async () => null }));
    patch(t, mongoose, 'startSession', async () => ({
        withTransaction: async callback => callback(),
        endSession: async () => {}
    }));

    return {
        payment,
        booking,
        get paymentUpdates() { return paymentUpdates; },
        get bookingUpdates() { return bookingUpdates; }
    };
}

test('sandbox configuration requires explicit test-mode keys, integration, HMAC and HTTPS callback', () => {
    assert.equal(paymob.getSandboxConfig(TEST_CONFIG).integrationId, 123456);
    assert.throws(() => paymob.getSandboxConfig({ ...TEST_CONFIG, PAYMOB_MODE: 'live' }), /explicitly set to sandbox/);
    assert.throws(() => paymob.getSandboxConfig({ ...TEST_CONFIG, PAYMOB_MODE: '' }), /explicitly set to sandbox/);
    assert.throws(() => paymob.getSandboxConfig({ ...TEST_CONFIG, PAYMOB_SECRET_KEY: 'egy_sk_live_nope' }), /test secret key/);
    assert.throws(() => paymob.getSandboxConfig({ ...TEST_CONFIG, PAYMOB_PUBLIC_KEY: '' }), /test public key/);
    assert.throws(() => paymob.getSandboxConfig({ ...TEST_CONFIG, PAYMOB_CARD_INTEGRATION_ID: '' }), /integration ID/);
    assert.throws(() => paymob.getSandboxConfig({ ...TEST_CONFIG, PAYMOB_HMAC_SECRET: '' }), /HMAC_SECRET/);
    assert.throws(() => paymob.getSandboxConfig({ ...TEST_CONFIG, PAYMOB_CALLBACK_URL: 'http://callback.test/hook' }), /HTTPS/);
});

test('intention request uses Paymob documented endpoint and token authorization without logging or returning credentials', async () => {
    let calledUrl;
    let calledOptions;
    const result = await paymob.createIntention(
        { amount: 21400, currency: 'EGP', payment_methods: [123456] },
        { secretKey: TEST_CONFIG.PAYMOB_SECRET_KEY },
        async (url, options) => {
            calledUrl = url;
            calledOptions = options;
            return { ok: true, json: async () => ({ id: 'intent-id' }) };
        }
    );

    assert.equal(calledUrl, 'https://accept.paymob.com/v1/intention/');
    assert.equal(calledOptions.headers.Authorization, `Token ${TEST_CONFIG.PAYMOB_SECRET_KEY}`);
    assert.deepEqual(JSON.parse(calledOptions.body), {
        amount: 21400,
        currency: 'EGP',
        payment_methods: [123456]
    });
    assert.deepEqual(result, { id: 'intent-id' });
});

test('hosted checkout URL uses the documented Egypt Unified Checkout origin', () => {
    const url = new URL(paymob.createCheckoutUrl(TEST_CONFIG.PAYMOB_PUBLIC_KEY, 'one_time_checkout_secret'));
    assert.equal(url.origin, 'https://eg.checkout.paymob.com');
    assert.equal(url.searchParams.get('publicKey'), TEST_CONFIG.PAYMOB_PUBLIC_KEY);
    assert.equal(url.searchParams.get('clientSecret'), 'one_time_checkout_secret');
});

test('payment status reports an unpaid cancelled booking without permitting checkout', async t => {
    const bookingId = '507f1f77bcf86cd799439012';
    patch(t, Booking, 'findOne', async () => ({
        _id: bookingId,
        userId: '507f1f77bcf86cd799439011',
        paymentId: null,
        status: 'cancelled',
        amount: 214,
        currency: 'EGP'
    }));
    patch(t, Payment, 'findOne', () => ({ sort: async () => null }));
    const req = request();
    req.params = { bookingId };
    const res = response();

    await paymentController.getBookingPaymentStatus(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'cancelled');
    assert.equal(res.body.canInitiate, false);
});

test('Paymob callback HMAC follows the official ordered fields and rejects missing or forged signatures', () => {
    const callback = transactionCallback();
    const signed = paymob.getCallbackHmacString(callback);
    assert.equal(
        signed,
        '214002026-10-10T00:00:00.000000EGPfalsefalse192036465123456truefalsefalsefalsetruefalse217503754302852false2346MasterCardcardtrue'
    );
    const signature = signatureFor(callback);
    assert.equal(paymob.verifyCallbackHmac(callback, signature, TEST_HMAC_SECRET), true);
    assert.equal(paymob.verifyCallbackHmac(callback, `${signature.slice(0, -1)}0`, TEST_HMAC_SECRET), false);
    assert.equal(paymob.verifyCallbackHmac(callback, undefined, TEST_HMAC_SECRET), false);
    assert.throws(() => paymob.getCallbackHmacString({ obj: { order: {}, source_data: {} } }), /missing signed fields/);
});

test('payment initiation refuses missing sandbox configuration before any booking or provider call', async t => {
    configureSandbox(t, {
        PAYMOB_MODE: '',
        PAYMOB_SECRET_KEY: '',
        PAYMOB_PUBLIC_KEY: '',
        PAYMOB_CARD_INTEGRATION_ID: '',
        PAYMOB_HMAC_SECRET: '',
        PAYMOB_CALLBACK_URL: '',
        PAYMOB_RETURN_URL: ''
    });
    patch(t, Booking, 'findOne', async () => assert.fail('Booking must not be loaded without payment config'));

    const res = response();
    await paymentController.createPaymentIntent(request({ bookingId: '507f1f77bcf86cd799439011' }), res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'PAYMOB_SANDBOX_NOT_CONFIGURED');
});

test('payment initiation rejects client-supplied amounts and checks booking ownership', async t => {
    configureSandbox(t);
    patch(t, Booking, 'findOne', async () => null);

    const forged = response();
    await paymentController.createPaymentIntent(
        request({ bookingId: '507f1f77bcf86cd799439011', amount: 1, currency: 'USD' }),
        forged
    );
    assert.equal(forged.statusCode, 400);

    const unauthorized = response();
    await paymentController.createPaymentIntent(
        request({ bookingId: '507f1f77bcf86cd799439011' }),
        unauthorized
    );
    assert.equal(unauthorized.statusCode, 404);
});

test('payment initialization derives amount from the owned booking offer and returns only checkout URL and public status', async t => {
    configureSandbox(t);
    const booking = {
        _id: '507f1f77bcf86cd799439011',
        userId: '507f1f77bcf86cd799439011',
        offerId: '507f1f77bcf86cd799439012',
        type: 'offer',
        title: 'Cairo trip',
        travelers: 1,
        amount: 1,
        currency: 'USD',
        status: 'pending',
        paymentId: null,
        contactInfo: { name: 'Test Traveler', phone: '+201000000000' }
    };
    const payment = { _id: 'payment-record' };
    const updates = [];
    let payload;
    let createdAttemptId;
    let persistedIntention;

    patch(t, Booking, 'findOne', async filter => filter.userId === booking.userId ? booking : null);
    patch(t, Booking, 'findOneAndUpdate', async (_filter, update) => {
        updates.push(update);
        if (update.$set.amount) {
            booking.amount = update.$set.amount;
            booking.currency = update.$set.currency;
        }
        if (update.$set.paymentId) booking.paymentId = update.$set.paymentId;
        return booking;
    });
    patch(t, Offer, 'findOne', async () => ({ price: 100, bookingDeadline: null }));
    patch(t, User, 'findById', () => ({
        select: async () => ({ fullName: 'Test Traveler', email: 'traveler@example.test', phone: '' })
    }));
    patch(t, Payment, 'create', async data => {
        createdAttemptId = data.paymentAttemptId;
        assert.equal(data.amountCents, 21400);
        assert.equal(data.amount, 214);
        assert.equal(data.status, 'pending');
        assert.equal(data.gateway, 'paymob');
        return payment;
    });
    patch(t, Payment, 'findOneAndUpdate', async (_filter, update) => {
        persistedIntention = update.$set;
        return payment;
    });
    patch(t, paymob, 'createIntention', async body => {
        payload = body;
        return {
            id: 'intention-id',
            intention_order_id: 217503754,
            client_secret: 'one_time_checkout_secret'
        };
    });

    const res = response();
    await paymentController.createPaymentIntent(
        request({
            bookingId: booking._id,
            amount: 0.01,
            currency: 'USD'
        }),
        res
    );
    assert.equal(res.statusCode, 400);
    assert.equal(payload, undefined);

    const validRes = response();
    await paymentController.createPaymentIntent(request({ bookingId: booking._id }), validRes);
    assert.equal(validRes.statusCode, 201);
    assert.equal(payload.amount, 21400);
    assert.equal(payload.currency, 'EGP');
    assert.deepEqual(payload.payment_methods, [123456]);
    assert.equal(payload.special_reference, createdAttemptId);
    assert.equal(payload.notification_url, TEST_CONFIG.PAYMOB_CALLBACK_URL);
    assert.equal(payload.billing_data.phone_number, '+201000000000');
    assert.equal(persistedIntention.paymobIntentionId, 'intention-id');
    assert.equal(persistedIntention.paymobOrderId, '217503754');
    assert.equal(validRes.body.amount, 214);
    assert.equal(validRes.body.testMode, true);
    assert.deepEqual(Object.keys(validRes.body).sort(), ['amount', 'bookingId', 'checkoutUrl', 'currency', 'status', 'testMode'].sort());
    assert.equal(updates.length, 2);
});

test('client-forged confirmation is rejected and never touches payment or booking models', async t => {
    patch(t, Payment, 'create', async () => assert.fail('Forged confirmation must not create a payment'));
    patch(t, Booking, 'findByIdAndUpdate', async () => assert.fail('Forged confirmation must not confirm a booking'));

    const res = response();
    paymentController.confirmPayment(request({
        paymentIntentId: 'forged',
        bookingId: '507f1f77bcf86cd799439011',
        amount: 1,
        success: true
    }), res);
    assert.equal(res.statusCode, 410);
});

test('callback rejects missing and invalid HMAC signatures before accessing a payment', async t => {
    configureSandbox(t);
    patch(t, Payment, 'findOne', async () => assert.fail('Unverified callback must not load a payment'));
    const callback = transactionCallback();

    const missing = response();
    await paymentController.paymobCallback({ body: callback, query: {} }, missing);
    assert.equal(missing.statusCode, 401);

    const invalid = response();
    await paymentController.paymobCallback({ body: callback, query: { hmac: 'bad' } }, invalid);
    assert.equal(invalid.statusCode, 401);
});

test('callback refuses incorrect amount or currency without changing payment or booking', async t => {
    configureSandbox(t);
    const state = mockSuccessfulCallbackModels(t);
    for (const changed of [
        { amount_cents: 1 },
        { currency: 'USD' },
        { order: { ...transactionCallback().obj.order, currency: 'USD' } }
    ]) {
        const callback = transactionCallback(changed);
        const res = response();
        await paymentController.paymobCallback({
            body: callback,
            query: { hmac: signatureFor(callback) }
        }, res);
        assert.equal(res.statusCode, 409);
    }
    assert.equal(state.payment.status, 'pending');
    assert.equal(state.paymentUpdates, 0);
    assert.equal(state.bookingUpdates, 0);
});

test('failed Paymob transactions never confirm the booking', async t => {
    configureSandbox(t);
    const state = mockSuccessfulCallbackModels(t);
    const failure = transactionCallback({ success: false });
    const failureRes = response();
    await paymentController.paymobCallback({
        body: failure,
        query: { hmac: signatureFor(failure) }
    }, failureRes);
    assert.equal(failureRes.statusCode, 200);
    assert.equal(failureRes.body.status, 'failed');
    assert.equal(state.payment.status, 'failed');
    assert.equal(state.booking.status, 'pending');
});

test('voided Paymob transactions are recorded as cancelled and never confirm the booking', async t => {
    configureSandbox(t);
    const cancelledState = mockSuccessfulCallbackModels(t);
    const cancelled = transactionCallback({ success: false, is_voided: true, id: 192036466 });
    const cancelledRes = response();
    await paymentController.paymobCallback({
        body: cancelled,
        query: { hmac: signatureFor(cancelled) }
    }, cancelledRes);
    assert.equal(cancelledRes.statusCode, 200);
    assert.equal(cancelledRes.body.status, 'cancelled');
    assert.equal(cancelledState.payment.status, 'cancelled');
    assert.equal(cancelledState.booking.status, 'pending');
});

test('verified success atomically confirms booking and duplicate callbacks are idempotent', async t => {
    configureSandbox(t);
    const state = mockSuccessfulCallbackModels(t);
    const callback = transactionCallback();
    const req = { body: callback, query: { hmac: signatureFor(callback) } };

    const first = response();
    await paymentController.paymobCallback(req, first);
    assert.equal(first.statusCode, 200);
    assert.equal(first.body.status, 'succeeded');
    assert.equal(state.payment.status, 'succeeded');
    assert.equal(state.payment.paymobTransactionId, String(callback.obj.id));
    assert.equal(state.booking.status, 'confirmed');
    assert.equal(state.paymentUpdates, 1);
    assert.equal(state.bookingUpdates, 1);

    const duplicate = response();
    await paymentController.paymobCallback(req, duplicate);
    assert.equal(duplicate.statusCode, 200);
    assert.equal(duplicate.body.duplicate, true);
    assert.equal(state.paymentUpdates, 1);
    assert.equal(state.bookingUpdates, 1);
});

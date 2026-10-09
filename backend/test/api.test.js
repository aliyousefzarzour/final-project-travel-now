const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../config');
const app = require('../server');

function tokenFor(role = 'tourist') {
    return jwt.sign(
        { id: '507f1f77bcf86cd799439011', email: `${role}@example.com`, role },
        config.JWT_SECRET,
        { expiresIn: '1h' }
    );
}

test('health endpoint responds without requiring MongoDB', async () => {
    const response = await request(app).get('/api/health').expect(200);
    assert.equal(response.body.status, 'OK');
    assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test('protected endpoints reject missing tokens', async () => {
    const response = await request(app).get('/api/users/profile').expect(401);
    assert.equal(response.body.error, 'Authentication required');
});

test('admin payment listing rejects non-admin users', async () => {
    const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${tokenFor('tourist')}`)
        .expect(403);
    assert.equal(response.body.error, 'Insufficient permissions');
});

test('payment intent refuses initiation when sandbox configuration is missing', async t => {
    const previousMode = config.PAYMOB_MODE;
    config.PAYMOB_MODE = '';
    t.after(() => { config.PAYMOB_MODE = previousMode; });

    const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${tokenFor('tourist')}`)
        .send({ bookingId: '507f1f77bcf86cd799439011' })
        .expect(503);

    assert.equal(response.body.code, 'PAYMOB_SANDBOX_NOT_CONFIGURED');
});

test('legacy client confirmation endpoint rejects forged payment evidence', async () => {
    const response = await request(app)
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${tokenFor('tourist')}`)
        .send({
            paymentIntentId: 'forged',
            bookingId: '507f1f77bcf86cd799439011',
            amount: 1,
            success: true
        })
        .expect(410);

    assert.equal(response.body.code, 'CLIENT_CONFIRMATION_DISABLED');
});

test('booking creation cannot accept client-supplied paid status or price', async () => {
    const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${tokenFor('tourist')}`)
        .send({
            type: 'offer',
            offerId: '507f1f77bcf86cd799439012',
            title: 'Client title',
            amount: 1,
            status: 'confirmed'
        })
        .expect(400);

    assert.match(response.body.message, /server-managed/);
});

test('non-tourists cannot initialize a Paymob checkout', async () => {
    await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${tokenFor('company')}`)
        .send({ bookingId: '507f1f77bcf86cd799439011' })
        .expect(403);
});

test('password reset does not allow userId-only reset bypass', async () => {
    const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ userId: '507f1f77bcf86cd799439011', newPassword: 'NewPass123' })
        .expect(400);

    assert.equal(response.body.message, 'Phone/OTP or Email/OTP required');
});

test('email reset OTP verification requires both email and code', async () => {
    const response = await request(app)
        .post('/api/auth/forgot-password/verify')
        .send({ email: 'traveler@example.com' })
        .expect(400);

    assert.equal(response.body.message, 'Email and code are required');
});

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

test('payment intent returns a demo intent when Stripe is not configured', async () => {
    const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${tokenFor('tourist')}`)
        .send({ amount: 2500, currency: 'egp' })
        .expect(200);

    assert.equal(response.body.demo, true);
    assert.match(response.body.paymentIntentId, /^pi_demo_/);
    assert.match(response.body.clientSecret, /_secret_demo$/);
});

test('password reset does not allow userId-only reset bypass', async () => {
    const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ userId: '507f1f77bcf86cd799439011', newPassword: 'NewPass123' })
        .expect(400);

    assert.equal(response.body.message, 'Phone/OTP or Email/OTP required');
});

'use strict';

// Use only an isolated loopback database, never server.js or .env.
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const databaseName = `travelnow_registration_test_${crypto.randomBytes(16).toString('hex')}`;
const mongoUri = `mongodb://127.0.0.1:27017/${databaseName}`;
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

let app;
let User;
let PendingRegistration;
let config;
let emailService;
let originalSendEmail;
let connection;
let connectionAttempted = false;
let ownsDatabase = false;
let mailMode = 'delivered';
const mailbox = [];
const originalEnvironment = new Map();

function assertTestDatabase() {
    assert.ok(ownsDatabase, 'Refusing to operate on a database not owned by this test');
    assert.equal(connection, mongoose.connection);
    assert.equal(connection.readyState, 1);
    assert.equal(connection.host, '127.0.0.1');
    assert.equal(connection.port, 27017);
    assert.equal(connection.name, databaseName);
    assert.equal(connection.db.databaseName, databaseName);
    assert.match(databaseName, /^travelnow_registration_test_[a-f0-9]{32}$/);
}

function post(endpoint, body) {
    assertTestDatabase();
    return request(app)
        .post(`/api/auth/${endpoint}`)
        .send(body)
        .timeout({ response: 10_000, deadline: 15_000 });
}

function profile(overrides = {}) {
    const suffix = crypto.randomBytes(8).toString('hex');
    return {
        fullName: 'Registration Test Traveler',
        username: `reg_${suffix}`,
        email: `reg_${suffix}@example.com`,
        country: 'Egypt',
        password: `Registration!42_${suffix}`,
        // Deliberately omit phone so neither registration nor login sends WhatsApp.
        ...overrides
    };
}

function assertNoSecrets(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
        assert.ok(!['password', 'passwordHash', 'code', 'codeHash'].includes(key),
            `Response exposed ${key}`);
        assertNoSecrets(child);
    }
}

function assertNoSession(response) {
    assert.equal(Object.hasOwn(response.body, 'user'), false, 'Unexpected user response');
    assert.equal(Object.hasOwn(response.body, 'token'), false, 'Unexpected JWT response');
    assert.notEqual(response.body.autoVerified, true);
    assert.notEqual(response.body.verified, true);
    assert.equal(response.headers['set-cookie'], undefined, 'Unexpected session cookie');
    assertNoSecrets(response.body);
}

function assertNoPlaintext(value, password, code) {
    if (value && typeof value === 'object') {
        for (const child of Object.values(value)) assertNoPlaintext(child, password, code);
    } else {
        assert.notEqual(value, password, 'Plaintext password persisted');
        assert.notEqual(value, code, 'Plaintext OTP persisted');
    }
}

function lastMail(email) {
    const message = mailbox.filter(item => item.to === email).at(-1);
    assert.ok(message, `No captured verification email for ${email}`);
    return message;
}

async function register(overrides = {}) {
    const input = profile(overrides);
    const startedAt = Date.now();
    const messageCount = mailbox.length;
    const response = await post('register', input).expect(202);
    const finishedAt = Date.now();
    assertNoSession(response);
    assert.equal(response.body.requiresEmailVerification, true);
    assert.equal(response.body.email, input.email);
    assert.match(response.body.registrationId, /^[a-f0-9]{64}$/i);
    assert.equal(mailbox.length, messageCount + 1);
    const message = lastMail(input.email);
    assert.equal(message.mode, 'delivered');
    assert.equal(await User.countDocuments({ email: input.email }), 0);
    return { input, registrationId: response.body.registrationId, code: message.code, startedAt, finishedAt };
}

function verificationBody(registration, overrides = {}) {
    return {
        email: registration.input.email,
        registrationId: registration.registrationId,
        code: registration.code,
        ...overrides
    };
}

function resendBody(registration) {
    return { email: registration.input.email, registrationId: registration.registrationId };
}

function differentCode(code) {
    return code === '000000' ? '000001' : '000000';
}

function differentId(id) {
    return (id[0] === 'a' ? 'b' : 'a') + id.slice(1);
}

async function unlockResend(registration) {
    const result = await PendingRegistration.updateOne(resendBody(registration), {
        $set: { nextResendAt: new Date(Date.now() - 1000) }
    });
    assert.equal(result.matchedCount, 1);
}

async function assertCannotLogin(input) {
    const response = await post('login', { email: input.email, password: input.password }).expect(401);
    assertNoSession(response);
}

function assertToken(response, user) {
    assert.equal(typeof response.body.token, 'string');
    const claims = jwt.verify(response.body.token, config.JWT_SECRET);
    assert.equal(claims.id, String(user._id));
    assert.equal(claims.email, user.email);
    assert.equal(claims.role, 'tourist');
    assert.equal(response.body.user.role, 'tourist');
    assertNoSecrets(response.body);
}

describe('email-OTP registration integration (isolated local MongoDB)', { concurrency: false }, () => {
    before(async () => {
        assert.equal(mongoose.connection.readyState, 0, 'Refusing to reuse an existing Mongo connection');
        for (const [key, value] of Object.entries({
            NODE_ENV: 'test',
            MONGODB_URI: mongoUri,
            JWT_SECRET: crypto.randomBytes(32).toString('hex'),
            ADMIN_EMAIL: '',
            ADMIN_PASSWORD: ''
        })) {
            originalEnvironment.set(key, process.env[key]);
            process.env[key] = value;
        }

        connectionAttempted = true;
        try {
            await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
        } catch (error) {
            throw new Error('Registration tests require MongoDB at 127.0.0.1:27017; no remote or download fallback is used.', { cause: error });
        }
        connection = mongoose.connection;
        assert.equal(connection.name, databaseName);
        assert.deepEqual(await connection.db.listCollections({}, { nameOnly: true }).toArray(), [],
            'Refusing to use or drop an already-populated database');
        ownsDatabase = true;
        assertTestDatabase();

        // Stub transport before the controller destructures sendEmail.
        emailService = require('../services/emailService');
        originalSendEmail = emailService.sendEmail;
        emailService.sendEmail = async (to, subject, html) => {
            assert.equal(typeof html, 'string');
            // Match the OTP element, not digits in names or CSS.
            const matches = [...html.matchAll(/<div\b[^>]*font-family\s*:\s*monospace[^>]*>\s*([0-9]{6})\s*<\/div>/gi)];
            assert.equal(matches.length, 1, 'Expected exactly one six-digit code in the verification template');
            mailbox.push({ to, subject, html, code: matches[0][1], mode: mailMode });
            if (mailMode === 'throw') throw new Error('Simulated SMTP rejection');
            if (mailMode === 'demo') return { demo: true };
            return {
                accepted: [to], rejected: [],
                messageId: `registration-test-${mailbox.length}`,
                response: '250 2.0.0 OK'
            };
        };

        User = require('../models/User');
        PendingRegistration = require('../models/PendingRegistration');
        config = require('../config');
        app = express();
        app.use(express.json());
        app.use('/api/auth', require('../routes/auth'));
        await Promise.all([User.init(), PendingRegistration.init()]);
    });

    beforeEach(async () => {
        assertTestDatabase();
        await Promise.all([User.deleteMany({}), PendingRegistration.deleteMany({})]);
        mailbox.length = 0;
        mailMode = 'delivered';
    });

    after(async () => {
        try {
            if (ownsDatabase) {
                assertTestDatabase();
                await connection.dropDatabase();
            }
        } finally {
            try {
                if (connectionAttempted) await mongoose.disconnect();
            } finally {
                if (originalSendEmail) emailService.sendEmail = originalSendEmail;
                for (const [key, value] of originalEnvironment) {
                    if (value === undefined) delete process.env[key];
                    else process.env[key] = value;
                }
            }
        }
    });

    it('retains current registration validation without creating records or sending email', async () => {
        for (const invalid of [
            { fullName: 'x' }, { fullName: 'x'.repeat(101) },
            { username: 'ab' }, { username: 'x'.repeat(31) }, { username: 'invalid-name' },
            { email: 'not-an-email' }, { country: '' }, { password: '12345' }
        ]) {
            const response = await post('register', profile(invalid)).expect(400);
            assertNoSession(response);
        }
        assert.equal(await User.countDocuments({}), 0);
        assert.equal(await PendingRegistration.countDocuments({}), 0);
        assert.equal(mailbox.length, 0);
    });

    it('stores only a pending registration with hidden hashes and no usable account', async () => {
        const registration = await register();
        const { input, code, registrationId, startedAt, finishedAt } = registration;
        const visible = await PendingRegistration.findOne({ email: input.email }).lean();
        assert.ok(visible);
        assert.equal(Object.hasOwn(visible, 'passwordHash'), false);
        assert.equal(Object.hasOwn(visible, 'codeHash'), false);
        assert.equal(PendingRegistration.schema.path('passwordHash').options.select, false);
        assert.equal(PendingRegistration.schema.path('codeHash').options.select, false);
        const indexes = await PendingRegistration.collection.indexes();
        assert.ok(indexes.some(index => index.unique && index.key.email === 1 && Object.keys(index.key).length === 1),
            'Pending email must have its own unique index');

        // Native collection reads bypass select:false and any JSON transforms.
        const raw = await PendingRegistration.collection.findOne({ email: input.email });
        assert.equal(raw.registrationId, registrationId);
        assert.equal(raw.fullName, input.fullName);
        assert.equal(raw.username, input.username);
        assert.equal(raw.country, input.country);
        assert.ok(raw.phone == null || raw.phone === '');
        assert.equal(raw.attempts, 0);
        assert.equal(raw.delivered, true);
        assert.ok(raw.expiresAt instanceof Date);
        assert.ok(raw.nextResendAt instanceof Date);
        assert.ok(raw.expiresAt.getTime() >= startedAt + DAY - 1000);
        assert.ok(raw.expiresAt.getTime() <= finishedAt + DAY + 1000);
        assert.ok(raw.nextResendAt.getTime() >= startedAt + MINUTE - 1000);
        assert.ok(raw.nextResendAt.getTime() <= finishedAt + MINUTE + 1000);
        assert.match(raw.passwordHash, /^\$2[aby]\$\d{2}\$/);
        assert.equal(await bcrypt.compare(input.password, raw.passwordHash), true);
        assert.equal(typeof raw.codeHash, 'string');
        assert.ok(raw.codeHash.length > code.length);
        assert.equal(Object.hasOwn(raw, 'password'), false);
        assert.equal(Object.hasOwn(raw, 'code'), false);
        assertNoPlaintext(raw, input.password, code);
        assert.equal(await User.countDocuments({}), 0);
        await assertCannotLogin(input);
    });

    for (const injectedRole of ['admin', 'company']) {
        it(`verifies once, transfers the bcrypt hash, permits login, and ignores ${injectedRole} injection`, async () => {
            const registration = await register({ role: injectedRole, authProvider: 'google', isEmailVerified: true });
            await assertCannotLogin(registration.input);
            const pending = await PendingRegistration.findOne(resendBody(registration)).select('+passwordHash');
            const response = await post('register/verify', verificationBody(registration, {
                role: injectedRole, authProvider: 'google', password: 'InjectedPassword!42', fullName: 'Injected name'
            })).expect(201);
            assert.equal(response.body.verified, true);
            const user = await User.findOne({ email: registration.input.email }).select('+password');
            assert.ok(user);
            assert.equal(user.role, 'tourist');
            assert.equal(user.authProvider, 'local');
            assert.equal(user.isEmailVerified, true);
            assert.equal(user.fullName, registration.input.fullName);
            assert.equal(user.username, registration.input.username);
            assert.equal(user.country, registration.input.country);
            assert.equal(user.password, pending.passwordHash, 'Password hash must transfer without double hashing');
            assert.equal(await bcrypt.compare(registration.input.password, user.password), true);
            assertToken(response, user);
            assert.equal(await User.countDocuments({}), 1);
            assert.equal(await PendingRegistration.countDocuments({ email: user.email }), 0);

            const login = await post('login', {
                email: user.email, password: registration.input.password
            }).expect(200);
            assertToken(login, user);
            assertNoSession(await post('register/verify', verificationBody(registration)).expect(400));
            assert.equal(await User.countDocuments({}), 1);
        });
    }

    it('counts wrong codes without creating a user and still accepts the correct code before lockout', async () => {
        const registration = await register();
        for (let attempt = 1; attempt <= 4; attempt += 1) {
            assertNoSession(await post('register/verify', verificationBody(registration, {
                code: differentCode(registration.code)
            })).expect(400));
            const pending = await PendingRegistration.findOne(resendBody(registration));
            assert.equal(pending.attempts, attempt);
            assert.equal(await User.countDocuments({}), 0);
        }
        await post('register/verify', verificationBody(registration)).expect(201);
        assert.equal(await User.countDocuments({}), 1);
    });

    it('locks on the fifth wrong attempt, including against the subsequently correct code', async () => {
        const registration = await register();
        for (let attempt = 1; attempt <= 5; attempt += 1) {
            assertNoSession(await post('register/verify', verificationBody(registration, {
                code: differentCode(registration.code)
            })).expect(400));
        }
        const pending = await PendingRegistration.findOne(resendBody(registration));
        if (pending) assert.equal(pending.attempts, 5);
        assertNoSession(await post('register/verify', verificationBody(registration)).expect(400));
        assert.equal(await User.countDocuments({}), 0);
        await assertCannotLogin(registration.input);
    });

    it('rejects expired and undelivered registrations even with the correct code', async () => {
        for (const change of [
            { expiresAt: new Date(Date.now() - 1000) },
            { delivered: false }
        ]) {
            const registration = await register();
            await PendingRegistration.updateOne(resendBody(registration), { $set: change });
            assertNoSession(await post('register/verify', verificationBody(registration)).expect(400));
            await assertCannotLogin(registration.input);
        }
        assert.equal(await User.countDocuments({}), 0);
    });

    it('requires the correct email and registrationId as well as the code', async () => {
        const registration = await register();
        for (const overrides of [
            { registrationId: differentId(registration.registrationId) },
            { email: profile().email }
        ]) {
            assertNoSession(await post('register/verify', verificationBody(registration, overrides)).expect(400));
        }
        assert.equal(await User.countDocuments({}), 0);
        await post('register/verify', verificationBody(registration)).expect(201);
    });

    it('rejects malformed verification bodies, including numeric codes and query operators', async () => {
        const registration = await register();
        const valid = verificationBody(registration);
        const missing = ['email', 'registrationId', 'code'].map(key => {
            const body = { ...valid };
            delete body[key];
            return body;
        });
        for (const body of [
            ...missing,
            ...['12345', '1234567', 'abcdef', Number(registration.code), { $ne: null }]
                .map(code => ({ ...valid, code })),
            { ...valid, email: { $ne: null } },
            { ...valid, registrationId: { $ne: null } },
            { ...valid, registrationId: 'not-a-registration-id' }
        ]) {
            assertNoSession(await post('register/verify', body).expect(400));
            assert.equal(await User.countDocuments({}), 0);
        }
        await post('register/verify', valid).expect(201);
    });

    it('blocks repeated registration and resend during cooldown, then rotates only the OTP', async () => {
        const registration = await register();
        const before = await PendingRegistration.collection.findOne(resendBody(registration));
        assertNoSession(await post('register/resend', resendBody(registration)).expect(429));
        assertNoSession(await post('register', {
            ...registration.input, fullName: 'Replacement attempt', password: 'ReplacementPassword!42'
        }).expect(429));
        assert.equal(mailbox.length, 1);
        assert.deepEqual(await PendingRegistration.collection.findOne(resendBody(registration)), before);

        await unlockResend(registration);
        const startedAt = Date.now();
        assertNoSession(await post('register/resend', resendBody(registration)).expect(200));
        const code = lastMail(registration.input.email).code;
        assert.notEqual(code, registration.code);
        assert.equal(mailbox.length, 2);
        const pending = await PendingRegistration.findOne(resendBody(registration)).select('+codeHash');
        assert.ok(pending);
        assert.notEqual(pending.codeHash, before.codeHash);
        assert.equal(pending.delivered, true);
        assert.ok(pending.nextResendAt.getTime() >= startedAt + MINUTE - 1000);
        assert.ok(pending.nextResendAt.getTime() <= Date.now() + MINUTE + 1000);
        assertNoSession(await post('register/resend', resendBody(registration)).expect(429));
        assert.equal(mailbox.length, 2);
        assertNoSession(await post('register/verify', verificationBody(registration)).expect(400));
        assert.equal(await User.countDocuments({}), 0);
        await post('register/verify', verificationBody(registration, { code })).expect(201);
    });

    it('resend rejects missing, mismatched, expired, and malformed registrations without sending mail', async () => {
        const registration = await register();
        await unlockResend(registration);
        for (const body of [
            { ...resendBody(registration), registrationId: differentId(registration.registrationId) },
            { ...resendBody(registration), email: profile().email }
        ]) {
            const response = await post('register/resend', body);
            assert.ok([400, 404].includes(response.status));
            assertNoSession(response);
        }
        for (const body of [{}, { email: registration.input.email }, {
            ...resendBody(registration), registrationId: { $ne: null }
        }]) {
            assertNoSession(await post('register/resend', body).expect(400));
        }
        await PendingRegistration.updateOne(resendBody(registration), {
            $set: { expiresAt: new Date(Date.now() - 1000) }
        });
        const expired = await post('register/resend', resendBody(registration));
        assert.ok([400, 404].includes(expired.status));
        assertNoSession(expired);
        assert.equal(mailbox.length, 1);
        assert.equal(await User.countDocuments({}), 0);
    });

    for (const failure of ['throw', 'demo']) {
        it(`fails registration closed when email transport returns ${failure}`, async () => {
            const input = profile();
            mailMode = failure;
            assertNoSession(await post('register', input).expect(503));
            const attemptedMail = lastMail(input.email);
            const pending = await PendingRegistration.findOne({ email: input.email });
            if (pending) assert.equal(pending.delivered, false);
            assertNoSession(await post('register/verify', {
                email: input.email,
                registrationId: pending?.registrationId || crypto.randomBytes(32).toString('hex'),
                code: attemptedMail.code
            }).expect(400));
            assert.equal(await User.countDocuments({}), 0);
            await assertCannotLogin(input);
        });

        it(`fails resend closed when email transport returns ${failure}`, async () => {
            const registration = await register();
            await unlockResend(registration);
            mailMode = failure;
            assertNoSession(await post('register/resend', resendBody(registration)).expect(503));
            const attemptedMail = lastMail(registration.input.email);
            assert.equal(attemptedMail.mode, failure);
            const pending = await PendingRegistration.findOne({ email: registration.input.email });
            if (pending) assert.equal(pending.delivered, false);
            for (const code of new Set([registration.code, attemptedMail.code])) {
                assertNoSession(await post('register/verify', verificationBody(registration, { code })).expect(400));
            }
            assert.equal(await User.countDocuments({}), 0);
            await assertCannotLogin(registration.input);
        });
    }

    it('protects an existing user from duplicate email or username registration', async () => {
        const input = profile();
        const user = await User.create({ ...input, isEmailVerified: true });
        const before = await User.collection.findOne({ _id: user._id });
        for (const duplicate of [
            profile({ email: input.email }), profile({ username: input.username })
        ]) {
            assertNoSession(await post('register', duplicate).expect(409));
        }
        assert.deepEqual(await User.collection.findOne({ _id: user._id }), before);
        assert.equal(await User.countDocuments({}), 1);
        assert.equal(await PendingRegistration.countDocuments({}), 0);
        assert.equal(mailbox.length, 0);
        assertToken(await post('login', { email: input.email, password: input.password }).expect(200), user);
    });

    it('atomically consumes a code under parallel verification and creates exactly one User', async () => {
        const registration = await register();
        const responses = await Promise.all(Array.from({ length: 6 }, () =>
            post('register/verify', verificationBody(registration))));
        const successes = responses.filter(response => response.status === 201);
        assert.equal(successes.length, 1, 'Exactly one request may create an account and receive a JWT');
        assert.equal(successes[0].body.verified, true);
        for (const response of responses.filter(item => item.status !== 201)) {
            assert.equal(response.status, 400);
            assertNoSession(response);
        }
        assert.equal(await User.countDocuments({}), 1);
        assert.equal(await PendingRegistration.countDocuments({ email: registration.input.email }), 0);
        const user = await User.findOne({ email: registration.input.email });
        assertToken(successes[0], user);
        assertNoSession(await post('register/verify', verificationBody(registration)).expect(400));
    });

    it('rotates registrationId on superseding signup and rejects the stale ID even with the newest OTP', async () => {
        const first = await register();
        await unlockResend(first);
        const second = await register({
            email: first.input.email, fullName: 'Superseding Traveler', password: 'SupersedingPassword!42'
        });
        assert.notEqual(second.registrationId, first.registrationId);
        assert.equal(await PendingRegistration.countDocuments({ email: first.input.email }), 1);
        assertNoSession(await post('register/verify', verificationBody(first)).expect(400));
        assertNoSession(await post('register/verify', verificationBody(first, { code: second.code })).expect(400));
        const staleResend = await post('register/resend', resendBody(first));
        assert.ok([400, 404].includes(staleResend.status));
        assertNoSession(staleResend);
        assert.equal(mailbox.length, 2);
        assert.equal(await User.countDocuments({}), 0);
        await post('register/verify', verificationBody(second)).expect(201);
        const user = await User.findOne({ email: second.input.email }).select('+password');
        assert.equal(user.fullName, second.input.fullName);
        assert.equal(user.username, second.input.username);
        assert.equal(await bcrypt.compare(second.input.password, user.password), true);
        assert.equal(await bcrypt.compare(first.input.password, user.password), false);
        assert.equal(await User.countDocuments({}), 1);
    });

    for (const conflictField of ['email', 'username']) {
        it(`does not overwrite an existing verified user created before verification (${conflictField} conflict)`, async () => {
            const registration = await register();
            const existingInput = profile({ [conflictField]: registration.input[conflictField] });
            const existing = await User.create({ ...existingInput, isEmailVerified: true });
            const before = await User.collection.findOne({ _id: existing._id });
            assertNoSession(await post('register/verify', verificationBody(registration)).expect(409));
            assert.equal(await User.countDocuments({}), 1);
            assert.deepEqual(await User.collection.findOne({ _id: existing._id }), before);
            assertToken(await post('login', {
                email: existingInput.email, password: existingInput.password
            }).expect(200), existing);
            await assertCannotLogin(registration.input);
        });
    }

    it('does not insert a malformed pending profile by bypassing User schema validation', async () => {
        const registration = await register();
        // Corrupt pending data must still fail User validation.
        await PendingRegistration.collection.updateOne(resendBody(registration), {
            $unset: { fullName: '', username: '' }
        });
        const response = await post('register/verify', verificationBody(registration));
        // Corrupt internal data has no prescribed public status, but must fail.
        assert.ok(response.status >= 400 && response.status < 600);
        assertNoSession(response);
        assert.equal(await User.countDocuments({}), 0);
        await assertCannotLogin(registration.input);
    });
});

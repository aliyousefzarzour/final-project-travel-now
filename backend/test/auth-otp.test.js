const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const User = require('../models/User');
const { verifyResetOtp } = require('../controllers/authController');

test('verifying a password-reset code does not reset the password or consume the code', async () => {
    const code = '123456';
    const record = {
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 0,
        otpHash: await bcrypt.hash(code, 4)
    };
    const originalOtpFindOne = PasswordResetOtp.findOne;
    const originalUserFindOne = User.findOne;
    let userLookups = 0;
    let statusCode = 200;
    let responseBody;

    PasswordResetOtp.findOne = () => ({
        select: async () => record
    });
    User.findOne = () => {
        userLookups += 1;
        throw new Error('Verification must not load or update a user');
    };

    try {
        await verifyResetOtp(
            { body: { email: 'traveler@example.com', otp: code } },
            {
                status(code) {
                    statusCode = code;
                    return this;
                },
                json(body) {
                    responseBody = body;
                    return this;
                }
            }
        );
    } finally {
        PasswordResetOtp.findOne = originalOtpFindOne;
        User.findOne = originalUserFindOne;
    }

    assert.equal(statusCode, 200);
    assert.equal(responseBody.verified, true);
    assert.equal(record.attempts, 0);
    assert.equal(userLookups, 0);
});

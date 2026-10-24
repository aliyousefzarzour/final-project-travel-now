// =================== INPUT VALIDATION MIDDLEWARE ===================
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const list = errors.array();
        return res.status(400).json({
            error: 'Validation failed',
            // Clients read `message`, so the first field error has to be in it —
            // otherwise every rejection shows up as a generic "failed".
            message: list.map(e => e.msg).join('. '),
            details: list
        });
    }
    next();
};

const registerValidation = [
    body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be 2-100 characters'),
    body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/).withMessage('Invalid username'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('country').trim().notEmpty().withMessage('Country is required'),
    // The form labels phone as optional, so null/empty must not block a signup.
    body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 25 }).withMessage('Phone is too long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required')
];

const registrationCodeValidation = [
    body('email').isString().bail().trim().isEmail().bail().normalizeEmail(),
    body('registrationId').isString().bail().matches(/^[a-f0-9]{64}$/).withMessage('Please start registration again')
];

const registrationVerifyValidation = [
    ...registrationCodeValidation,
    body('code').isString().bail().matches(/^\d{6}$/).withMessage('Enter the 6-digit verification code')
];

module.exports = { validate, registerValidation, loginValidation, registrationCodeValidation, registrationVerifyValidation };

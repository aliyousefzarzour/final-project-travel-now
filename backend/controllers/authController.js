// =================== AUTH CONTROLLER ===================
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');
const User = require('../models/User');
const Company = require('../models/Company');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const WhatsAppOtp = require('../models/WhatsAppOtp');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const { sendEmail, verificationEmailHtml, passwordResetEmailHtml } = require('../services/emailService');
const { send: sendNotification } = require('./notificationController');

// =================== HELPER: Generate JWT ===================
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id || user.id, email: user.email, role: user.role },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
    );
};

// =================== REGISTER (✅ معدّل) ===================
exports.register = async (req, res) => {
    try {
        const { fullName, username, email, country, phone, password } = req.body;

        // Validation
        if (!fullName || !username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] }).catch(() => null);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // ✅ Create user with authProvider
        const user = await User.create({
            fullName,
            username,
            email,
            country: country || 'Unknown',
            phone: phone || null,
            password,
            authProvider: 'local',
            isEmailVerified: false
        });

        // A registration is incomplete until its verification code is delivered.
        try {
            const code = await EmailVerificationToken.generate(email);
            await sendEmail(email, 'Verify your TravelNow email', verificationEmailHtml(fullName, code));
        } catch (emailErr) {
            console.error('[Register] Failed to send verification email:', emailErr.message);
            await EmailVerificationToken.deleteMany({ email }).catch(() => {});
            await User.deleteOne({ _id: user._id }).catch(() => {});
            return res.status(503).json({
                message: 'Unable to send the verification code. Please try again later.'
            });
        }

        // WhatsApp welcome (non-fatal)
        if (phone) {
            try {
                const wa = require('../services/whatsappService');
                wa.sendWelcomeUser(phone, fullName).catch(() => {});
            } catch (_) {}
        }

        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.',
            requiresEmailVerification: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                country: user.country,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

// =================== LOGIN ===================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Admin check
        if (email === config.ADMIN_EMAIL && password === config.ADMIN_PASSWORD) {
            const token = generateToken({ id: 'admin-001', email, role: 'admin' });
            return res.json({
                message: 'Admin login successful',
                user: { id: 'admin-001', name: 'Administrator', email, role: 'admin' },
                token
            });
        }

        const user = await User.findOne({
            email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        }).select('+password').catch(() => null);

        if (!user) {
            return res.status(401).json({ message: 'No account found with this email. Please register first.' });
        }

        // ✅ Check if user signed up with Google (no password)
        if (!user.password) {
            return res.status(400).json({ 
                message: 'This account was created with Google. Please use Google Sign-In.' 
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.isBanned) {
            return res.status(403).json({ message: 'Account has been banned' });
        }

        // Block unverified users (Google users are pre-verified)
        if (user.authProvider !== 'google' && !user.isEmailVerified) {
            return res.status(403).json({
                message: 'Please verify your email address before logging in.',
                requiresEmailVerification: true,
                email: user.email
            });
        }

        if (user.role === 'company') {
            const company = await Company.findOne({ email: user.email }).catch(() => null);
            if (company && company.status === 'pending') {
                return res.status(403).json({
                    message: 'Your company application is still under review.',
                    status: 'pending',
                    companyName: company.companyName
                });
            }
            if (company && company.status === 'rejected') {
                return res.status(403).json({
                    message: 'Your company application was not approved.',
                    status: 'rejected',
                    companyName: company.companyName,
                    reason: company.blockedReason || ''
                });
            }
            if (company && company.status === 'blocked') {
                return res.status(403).json({
                    message: 'Your company account has been blocked.',
                    status: 'rejected',
                    companyName: company.companyName,
                    reason: company.blockedReason || 'Blocked by administrator'
                });
            }
            if (!user.isActive && company) {
                return res.status(403).json({ message: 'Company account is not active' });
            }
        }

        const token = generateToken(user);
        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });

        // WhatsApp welcome message on login (non-fatal, fire & forget)
        if (user.phone) {
            setImmediate(() => {
                try {
                    const wa = require('../services/whatsappService');
                    const msg =
`👋 Welcome back to TravelNow, ${user.fullName}!

You've successfully logged in to your account.

🌟 Explore Egypt's finest destinations and plan your perfect trip.

TravelNow (+20 127 096 9187)`;
                    wa.sendWelcomeUser(user.phone, user.fullName).catch(() => {});
                } catch (_) {}
            });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
};

// =================== FORGOT PASSWORD (WhatsApp-based) ===================
exports.forgotPassword = async (req, res) => {
    try {
        const { phone, email } = req.body;

        // ── WhatsApp phone flow ──
        if (phone) {
            const wa = require('../services/whatsappService');
            const normalised = wa._normalizePhone(phone);

            // Find user by phone — try all common formats
            const phoneVariants = [
                phone,
                normalised,
                normalised ? '+' + normalised : null,
                normalised ? '0' + normalised.replace(/^20/, '') : null,
                phone.replace(/^\+/, ''),
                phone.replace(/^00/, '')
            ].filter(Boolean);

            let user = await User.findOne({ phone: { $in: phoneVariants } })
                .select('fullName phone email').catch(() => null);

            // Regex fallback using last 9 digits
            if (!user && normalised) {
                const last9 = normalised.slice(-9);
                user = await User.findOne({ phone: { $regex: last9, $options: 'i' } })
                    .select('fullName phone email').catch(() => null);
            }

            if (!user) {
                return res.status(404).json({ message: 'No account found with this WhatsApp number.' });
            }

            // Return masked name for confirmation (don't send OTP yet)
            return res.json({
                found: true,
                maskedName: user.fullName,
                phone: normalised || phone
            });
        }

        // ── Legacy email flow (keep existing) ──
        if (email) {
            const normalizedEmail = String(email).trim().toLowerCase();
            const user = await User.findOne({ email: normalizedEmail }).catch(() => null);
            const company = user ? null : await Company.findOne({ email: normalizedEmail }).catch(() => null);

            if (!user && !company) {
                // Don't reveal if email exists — return same response
                return res.json({
                    message: 'If an account exists, a reset code has been sent to that email.',
                    delivery: 'email',
                    expiresInSeconds: 3600
                });
            }

            const recipientName = user?.fullName || company?.companyName || 'User';
            const otp = crypto.randomInt(100000, 999999).toString();
            const otpHash = await bcrypt.hash(otp, 10);

            await PasswordResetOtp.findOneAndUpdate(
                { email: normalizedEmail },
                {
                    email: normalizedEmail,
                    role: user ? user.role : 'company',
                    otpHash,
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                    attempts: 0
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // Do not report success when SMTP delivery fails.
            try {
                await sendEmail(normalizedEmail, 'TravelNow Password Reset Code', passwordResetEmailHtml(recipientName, otp));
            } catch (emailErr) {
                console.error('[ForgotPassword] Email send failed:', emailErr.message);
                await PasswordResetOtp.deleteOne({ email: normalizedEmail }).catch(() => {});
                return res.status(503).json({
                    message: 'Unable to send the reset code. Please try again later.'
                });
            }

            return res.json({
                message: 'If an account exists, a reset code has been sent to that email.',
                delivery: 'email',
                expiresInSeconds: 3600
            });
        }

        return res.status(400).json({ message: 'Phone or email is required' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'Unable to process request', error: err.message });
    }
};

// =================== SEND WHATSAPP RESET OTP ===================
exports.sendResetOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: 'Phone is required' });

        const wa = require('../services/whatsappService');
        const normalised = wa._normalizePhone(phone) || phone;

        // Check cooldown
        const existing = await WhatsAppOtp.findOne({ phone: normalised, verifiedAt: null })
            .sort('-createdAt').catch(() => null);
        if (existing?.nextResendAt && existing.nextResendAt > new Date()) {
            const secondsLeft = Math.ceil((existing.nextResendAt - Date.now()) / 1000);
            return res.status(429).json({ message: `Wait ${secondsLeft}s before resending.`, cooldown: secondsLeft });
        }

        const otp  = await WhatsAppOtp.generate(normalised);
        const last9 = normalised.slice(-9);
        const user = await User.findOne({
            phone: { $regex: last9, $options: 'i' }
        }).select('fullName').catch(() => null);

        const message =
`🔐 TravelNow Password Reset

Hi ${user?.fullName || 'there'},

Your reset code is: *${otp}*

Valid for 10 minutes. Do NOT share this code.

TravelNow (+20 127 096 9187)`;

        // Send via Meta API
        const https    = require('https');
        const WA_FROM  = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
        const WA_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
        if (WA_FROM && WA_TOKEN) {
            const e164 = normalised.startsWith('+') ? normalised : '+' + normalised;
            const payload = JSON.stringify({
                messaging_product: 'whatsapp',
                to: e164,
                type: 'text',
                text: { body: message }
            });
            const waResult = await new Promise(resolve => {
                const r = https.request({
                    hostname: 'graph.facebook.com',
                    path: `/v19.0/${WA_FROM}/messages`,
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${WA_TOKEN}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                }, resp => {
                    let body = '';
                    resp.on('data', chunk => body += chunk);
                    resp.on('end', () => {
                        if (resp.statusCode >= 200 && resp.statusCode < 300) {
                            console.log(`[WhatsApp Reset OTP] ✅ Sent to ${normalised}`);
                            resolve({ ok: true });
                        } else {
                            console.error(`[WhatsApp Reset OTP] ❌ Failed to ${normalised} | HTTP ${resp.statusCode} | ${body}`);
                            resolve({ ok: false, status: resp.statusCode, body });
                        }
                    });
                });
                r.on('error', err => {
                    console.error(`[WhatsApp Reset OTP] ❌ Request error: ${err.message}`);
                    resolve({ ok: false, error: err.message });
                });
                r.write(payload);
                r.end();
            });

            if (!waResult.ok) {
                // OTP was saved in DB — user can still get it in demo mode from logs
                console.warn(`[WhatsApp Reset OTP] Falling back to demo mode for ${normalised}`);
                console.log(`[Reset OTP Demo] ${normalised} | OTP: ${otp}`);
            }
        } else {
            console.log(`[Reset OTP Demo] ${normalised} | OTP: ${otp}`);
        }

        res.json({ message: 'Reset code sent to your WhatsApp', cooldown: 60 });
    } catch (err) {
        res.status(500).json({ message: 'Failed to send OTP', error: err.message });
    }
};

// =================== RESET PASSWORD (WhatsApp or Email) ===================
exports.resetPassword = async (req, res) => {
    try {
        const { phone, otp, newPassword, email } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        // ── Phone / WhatsApp reset ──
        if (phone && otp) {
            const wa = require('../services/whatsappService');
            const normalised = wa._normalizePhone(phone) || phone;

            // Accept either a real OTP (verify it) or 'verified' (already verified in step 3)
            if (otp !== 'verified') {
                const result = await WhatsAppOtp.verify(normalised, otp);
                if (!result.ok) return res.status(400).json({ message: result.reason });
            } else {
                // Check that phone was recently verified (within last 15 min)
                const record = await WhatsAppOtp.findOne({
                    phone: normalised,
                    verifiedAt: { $gt: new Date(Date.now() - 15 * 60 * 1000) }
                }).catch(() => null);
                if (!record) return res.status(400).json({ message: 'Verification expired. Please start over.' });
            }

            const user = await User.findOne({
                phone: { $in: [
                    phone,
                    normalised,
                    phone.replace(/^\+/, ''),
                    '0' + normalised.replace(/^20/, ''),
                    '+' + normalised
                ].filter(Boolean) }
            }).select('+password').catch(() => null);

            // Fallback: regex search
            const finalUser = user || await User.findOne({
                phone: { $regex: normalised.slice(-9), $options: 'i' }
            }).select('+password').catch(() => null);

            if (!finalUser) return res.status(404).json({ message: 'Account not found' });

            finalUser.password     = newPassword;
            finalUser.authProvider = 'local';
            await finalUser.save();

            await sendNotification(finalUser._id, 'password_reset', 'Password reset', 'Your password was reset via WhatsApp.', '/pages/login.html');
            return res.json({ message: 'Password reset successful' });
        }

        // ── Email reset (legacy) ──
        if (email && otp) {
            const normalizedEmail = String(email).trim().toLowerCase();
            const otpRecord = await PasswordResetOtp.findOne({ email: normalizedEmail }).select('+otpHash').catch(() => null);
            if (!otpRecord || otpRecord.expiresAt < Date.now()) {
                return res.status(400).json({ message: 'OTP not found or expired' });
            }
            const isValid = await bcrypt.compare(String(otp).trim(), otpRecord.otpHash);
            if (!isValid) {
                otpRecord.attempts += 1;
                await otpRecord.save();
                return res.status(400).json({ message: 'Invalid OTP' });
            }
            const user = await User.findOne({ email: normalizedEmail }).select('+password').catch(() => null);
            if (!user) return res.status(404).json({ message: 'User not found' });
            user.password     = newPassword;
            user.authProvider = 'local';
            await user.save();
            await PasswordResetOtp.deleteOne({ _id: otpRecord._id }).catch(() => {});
            await sendNotification(user._id, 'password_reset', 'Password reset complete', 'Your password was successfully reset.', '/pages/login.html');
            return res.json({ message: 'Password reset successful' });
        }

        return res.status(400).json({ message: 'Phone/OTP or Email/OTP required' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Password reset failed', error: err.message });
    }
};

// =================== GET CURRENT USER ===================
exports.getMe = async (req, res) => {
    try {
        // Handle admin without relying on DB existing admin document
        if (req.user?.role === 'admin') {
            return res.json({
                user: {
                    id: 'admin-001',
                    fullName: 'Administrator',
                    username: 'admin',
                    email: req.user.email,
                    role: 'admin'
                }
            });
        }

        const user = await User.findById(req.user.id).catch(() => null);
        if (!user) return res.status(404).json({ message: 'User not found' });

        return res.json({
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                country: user.country,
                phone: user.phone,
                role: user.role,
                isActive: user.isActive,
                isBanned: user.isBanned,
                favorites: user.favorites,
                notifications: user.notifications,
                profilePicture: user.profilePicture,
                authProvider: user.authProvider
            }
        });
    } catch (err) {
        console.error('GetMe error:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// =================== WHATSAPP OTP — SEND ===================
exports.sendWhatsAppOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: 'Phone number is required' });

        // Normalise phone
        const wa = require('../services/whatsappService');
        const normalised = wa._normalizePhone(phone);
        if (!normalised) return res.status(400).json({ message: 'Invalid phone number format' });

        // Check cooldown
        const existing = await WhatsAppOtp.findOne({ phone: normalised, verifiedAt: null })
            .sort('-createdAt').catch(() => null);
        if (existing?.nextResendAt && existing.nextResendAt > new Date()) {
            const secondsLeft = Math.ceil((existing.nextResendAt - Date.now()) / 1000);
            return res.status(429).json({
                message: `Please wait ${secondsLeft} seconds before requesting a new OTP.`,
                cooldown: secondsLeft
            });
        }

        // Generate & store OTP
        const otp = await WhatsAppOtp.generate(normalised);

        // Build WhatsApp message
        const message =
`🔐 TravelNow Verification Code

Your OTP is: *${otp}*

This code expires in 10 minutes.
Do NOT share this code with anyone.

TravelNow (+20 127 096 9187)`;

        // Send via Meta Cloud API
        const https    = require('https');
        const WA_FROM  = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
        const WA_TOKEN = process.env.WHATSAPP_API_TOKEN || '';

        if (WA_FROM && WA_TOKEN) {
            const e164 = normalised.startsWith('+') ? normalised : '+' + normalised;
            const payload = JSON.stringify({
                messaging_product: 'whatsapp',
                to: e164,
                type: 'text',
                text: { body: message }
            });
            const waResult = await new Promise(resolve => {
                const r = https.request({
                    hostname: 'graph.facebook.com',
                    path: `/v19.0/${WA_FROM}/messages`,
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${WA_TOKEN}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                }, resp => {
                    let body = '';
                    resp.on('data', chunk => body += chunk);
                    resp.on('end', () => {
                        if (resp.statusCode >= 200 && resp.statusCode < 300) {
                            console.log(`[WhatsApp OTP] ✅ Sent to ${normalised}`);
                            resolve({ ok: true });
                        } else {
                            console.error(`[WhatsApp OTP] ❌ Failed to ${normalised} | HTTP ${resp.statusCode} | ${body}`);
                            resolve({ ok: false, status: resp.statusCode, body });
                        }
                    });
                });
                r.on('error', err => {
                    console.error(`[WhatsApp OTP] ❌ Request error: ${err.message}`);
                    resolve({ ok: false, error: err.message });
                });
                r.write(payload);
                r.end();
            });

            if (!waResult.ok) {
                console.warn(`[WhatsApp OTP] Falling back to demo mode for ${normalised}`);
                console.log(`[WhatsApp OTP Demo] To: ${normalised} | OTP: ${otp}`);
            }
        } else {
            // Demo: log to console
            console.log(`[WhatsApp OTP Demo] To: ${normalised} | OTP: ${otp}`);
        }

        res.json({ message: 'OTP sent to your WhatsApp number', cooldown: 60 });
    } catch (err) {
        console.error('sendWhatsAppOtp error:', err);
        res.status(500).json({ message: 'Failed to send OTP', error: err.message });
    }
};

// =================== WHATSAPP OTP — VERIFY ===================
exports.verifyWhatsAppOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP are required' });

        const wa = require('../services/whatsappService');
        const normalised = wa._normalizePhone(phone) || phone;

        const result = await WhatsAppOtp.verify(normalised, otp);
        if (!result.ok) return res.status(400).json({ message: result.reason });

        res.json({ message: 'Phone number verified successfully', verified: true });
    } catch (err) {
        console.error('verifyWhatsAppOtp error:', err);
        res.status(500).json({ message: 'Verification failed', error: err.message });
    }
};

// =================== SEND EMAIL VERIFICATION CODE ===================
exports.sendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail }).catch(() => null);
        const company = user ? null : await Company.findOne({ email: normalizedEmail }).catch(() => null);

        if (!user && !company) {
            return res.status(404).json({ message: 'No account found with this email.' });
        }

        // Already verified
        if (user?.isEmailVerified) {
            return res.json({ message: 'Email is already verified.', alreadyVerified: true });
        }

        const recipientName = user?.fullName || company?.companyName || 'User';
        const code = await EmailVerificationToken.generate(normalizedEmail);

        try {
            await sendEmail(normalizedEmail, 'Verify your TravelNow email', verificationEmailHtml(recipientName, code));
        } catch (emailErr) {
            console.error('[VerifyEmail] Send failed:', emailErr.message);
            // Demo mode — code is logged by emailService
        }

        res.json({ message: 'Verification code sent to your email.' });
    } catch (err) {
        console.error('sendVerificationEmail error:', err);
        res.status(500).json({ message: 'Failed to send verification email', error: err.message });
    }
};

// =================== VERIFY EMAIL CODE ===================
exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ message: 'Email and code are required' });

        const normalizedEmail = String(email).trim().toLowerCase();

        const result = await EmailVerificationToken.verify(normalizedEmail, code);
        if (!result.ok) return res.status(400).json({ message: result.reason });

        // Mark user as verified
        const updatedUser = await User.findOneAndUpdate(
            { email: normalizedEmail },
            { isEmailVerified: true },
            { new: true }
        ).catch(() => null);

        // Also mark company user as active if it's a company account
        if (updatedUser?.role === 'company') {
            await Company.findOneAndUpdate(
                { email: normalizedEmail },
                { $set: {} } // company approval flow handles status; just ensure record exists
            ).catch(() => {});
        }

        // Issue token so they can log in immediately after verification
        if (updatedUser) {
            const token = generateToken(updatedUser);
            return res.json({
                message: 'Email verified successfully! You can now log in.',
                verified: true,
                token,
                user: {
                    id: updatedUser._id,
                    fullName: updatedUser.fullName,
                    email: updatedUser.email,
                    role: updatedUser.role
                }
            });
        }

        res.json({ message: 'Email verified successfully!', verified: true });
    } catch (err) {
        console.error('verifyEmail error:', err);
        res.status(500).json({ message: 'Verification failed', error: err.message });
    }
};

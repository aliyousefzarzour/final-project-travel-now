// =================== AUTH ROUTES ===================
const express = require('express');
const router = express.Router();
const config = require('../config');
const { authMiddleware } = require('../middleware/auth');
const { validate, registerValidation, loginValidation } = require('../middleware/validation');
const ctrl = require('../controllers/authController');

// المكتبات المطلوبة لتسجيل الدخول بجوجل
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');

// ✅ الـ Client ID الخاص بمشروعك
const GOOGLE_CLIENT_ID = "472844156998-o2uftp7651tsbfdo00hv07h95vlou5vb.apps.googleusercontent.com";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// =================== STANDARD ROUTES ===================
router.post('/register', registerValidation, validate, ctrl.register);
router.post('/login', loginValidation, validate, ctrl.login);
router.post('/forgot-password',      ctrl.forgotPassword);
router.post('/forgot-password/send', ctrl.sendResetOtp);
router.post('/reset-password',       ctrl.resetPassword);
router.get('/me', authMiddleware, ctrl.getMe);

// =================== EMAIL VERIFICATION ROUTES ===================
router.post('/verify-email/send',   ctrl.sendVerificationEmail);
router.post('/verify-email/verify', ctrl.verifyEmail);

// =================== WHATSAPP OTP ROUTES ===================
router.post('/whatsapp-otp/send',   ctrl.sendWhatsAppOtp);
router.post('/whatsapp-otp/verify', ctrl.verifyWhatsAppOtp);

// =================== GOOGLE ACCESS TOKEN ROUTE ===================
router.post('/google-access-token', async (req, res) => {
    try {
        const { access_token, email, name, picture, sub } = req.body;
        if (!email || !sub) return res.status(400).json({ message: 'Invalid Google data' });

        let user = await User.findOne({ email }).catch(() => null);
        if (!user) {
            try {
                user = await User.create({
                    fullName: name || email.split('@')[0],
                    username: email.split('@')[0] + '_' + Date.now().toString().slice(-4),
                    email,
                    role: 'tourist',
                    googleId: sub,
                    authProvider: 'google'
                });
            } catch (createErr) {
                if (createErr.code === 11000) {
                    user = await User.create({
                        fullName: name || email.split('@')[0],
                        username: email.split('@')[0] + '_' + Math.random().toString(36).slice(-6),
                        email,
                        role: 'tourist',
                        googleId: sub,
                        authProvider: 'google'
                    });
                } else throw createErr;
            }
        } else if (!user.googleId) {
            user.googleId = sub;
            user.authProvider = user.authProvider || 'google';
            await user.save();
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, email: user.email },
            config.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            user: { id: user._id, _id: user._id, fullName: user.fullName, username: user.username, email: user.email, role: user.role },
            token
        });
    } catch (err) {
        console.error('Google access token error:', err);
        res.status(500).json({ message: 'Google Sign-In failed', error: err.message });
    }
});

// =================== GOOGLE LOGIN ROUTES ===================
// ✅ Route أساسي (اللي الـ frontend الجديد هيبعت عليه)
router.post('/google', async (req, res) => {
    await handleGoogleAuth(req, res);
});

// ✅ Route بديل (الـ frontend القديم بيبعت على ده)
router.post('/google-login', async (req, res) => {
    await handleGoogleAuth(req, res);
});

// ✅ قبول `token` أو `credential` (للتوافق)
async function handleGoogleAuth(req, res) {
    const credential = req.body.credential || req.body.token;

    if (!credential) {
        return res.status(400).json({ 
            success: false,
            message: "Token/Credential is required" 
        });
    }

    try {
        // 1. التحقق من صحة التوكن عبر سيرفرات جوجل
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { 
            email, 
            name, 
            picture, 
            email_verified,
            sub: googleId 
        } = payload;

        if (!email_verified) {
            return res.status(401).json({ 
                success: false,
                message: "Google email is not verified" 
            });
        }

        // 2. البحث عن المستخدم
        let user = await User.findOne({ email });
        let isNewUser = false;
        
        if (!user) {
            // ✅ إنشاء مستخدم جديد
            try {
                // Generate random password (هاش) لأن الـ schema غالباً بتطلبه
                const randomPassword = crypto.randomBytes(20).toString('hex');
                
                user = await User.create({
                    fullName: name,
                    username: email.split('@')[0] + '_' + Date.now().toString().slice(-4), // فريد
                    email: email,
                    role: 'tourist',
                    profilePic: picture,
                    googleId: googleId, // ✅ لو الـ schema بتدعمه
                    authProvider: 'google',
                    // password ممكن يكون مش مطلوب - شوف الـ User model
                });
                isNewUser = true;
                console.log('✅ New Google user created:', email);
            } catch (createErr) {
                console.error("❌ User creation error:", createErr);
                
                // ✅ لو مشكلة username مكرر، جرب تاني
                if (createErr.code === 11000) {
                    user = await User.create({
                        fullName: name,
                        username: email.split('@')[0] + '_' + Math.random().toString(36).slice(-6),
                        email: email,
                        role: 'tourist',
                        profilePic: picture,
                        googleId: googleId,
                        authProvider: 'google',
                    });
                } else {
                    throw createErr;
                }
            }
        } else {
            // ✅ تحديث الـ googleId والصورة لو مش موجودين
            if (!user.googleId) {
                user.googleId = googleId;
                user.authProvider = user.authProvider || 'google';
                await user.save();
            }
            console.log('✅ Existing user logged in via Google:', email);
        }

        // 3. إصدار JWT خاص بسيرفرك
        const localToken = jwt.sign(
            { 
                id: user._id, 
                role: user.role,
                email: user.email 
            }, 
            config.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // 4. إرسال البيانات والتوكن للفرونت إند
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                _id: user._id, // ✅ للاتنين (frontend بيبستخدم _id أحياناً)
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                role: user.role,
                profilePic: user.profilePic || picture
            },
            token: localToken,
            isNewUser
        });

    } catch (error) {
        console.error("❌ Google Auth Error:", error);
        res.status(401).json({ 
            success: false,
            message: "Invalid Google Token",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

module.exports = router;

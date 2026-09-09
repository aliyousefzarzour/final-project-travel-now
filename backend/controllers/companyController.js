// =================== COMPANY CONTROLLER ===================
const Company = require('../models/Company');
const User    = require('../models/User');
const config  = require('../config');
const EmailVerificationToken = require('../models/EmailVerificationToken');
const { sendEmail, verificationEmailHtml, companyDecisionEmailHtml } = require('../services/emailService');
const { send: sendNotification } = require('./notificationController');

const ADMIN_WA = process.env.ADMIN_WHATSAPP || '201270969187'; // رقم الأدمن

// Register new company (pending verification)
exports.register = async (req, res) => {
    try {
        const { password, confirmPassword, ...companyData } = req.body;

        // ── Duplicate checks ──
        // (disabled — allow same email/phone for multiple accounts)

        if (!password || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        // ── Create user account (inactive until approved) ──
        let user;
        try {
            user = await User.create({
                fullName: companyData.ownerName,
                username: companyData.companyName.toLowerCase().replace(/\s+/g, '-') + '_' + Date.now().toString().slice(-4),
                email:    companyData.email,
                country:  companyData.country || 'Egypt',
                phone:    companyData.phone,
                password,
                role:     'company',
                isActive: false
            });
        } catch (userErr) {
            if (userErr.code === 11000) {
                return res.status(400).json({ message: 'Username or email already taken.' });
            }
            throw userErr;
        }

        const filePath = (fieldName) =>
            req.files?.[fieldName]?.[0]?.path
                ? `/${req.files[fieldName][0].path.replace(/\\/g, '/')}`
                : undefined;

        const company = await Company.create({
            ...companyData,
            whatsapp: companyData.whatsapp || companyData.phone,
            userId:  user._id,
            status:  'pending',
            logo: filePath('logo') || null,
            documents: {
                commercial: filePath('docCommercial') || null,
                tax:        filePath('docTax')        || null,
                tourism:    filePath('docTourism')    || null,
                ministry:   filePath('docMinistry')   || null,
                ownerId:    filePath('docOwnerId')    || null
            }
        });

        // ── Send email verification code to company ──
        try {
            const code = await EmailVerificationToken.generate(companyData.email);
            await sendEmail(
                companyData.email,
                'Verify your TravelNow Company Email',
                verificationEmailHtml(companyData.companyName || companyData.ownerName, code)
            );
            console.log('[Company Register] Verification email sent to:', companyData.email);
        } catch (emailErr) {
            console.error('[Company Register] Failed to send verification email:', emailErr.message);
        }

        // ── Send company details to Admin via WhatsApp ──
        try {
            console.log('[Company Register] Sending WhatsApp to admin:', ADMIN_WA);
            const msg =
`🏢 NEW COMPANY REGISTRATION — TravelNow

Company:  ${company.companyName}
Owner:    ${company.ownerName}
Email:    ${company.email}
Phone:    ${company.phone}
WhatsApp: ${company.whatsapp || '-'}
Location: ${company.address}, ${company.governorate}

📋 Licenses:
• Commercial Reg: ${company.commercialReg}
• Tax Card:       ${company.taxCard}
• Tourism License:${company.tourismLicense}

Experience: ${company.experience || 0} years
Services:   ${company.services || '-'}
Description: ${company.description || '-'}

🔗 Review in Admin Panel:
http://localhost:5500/admin/admin.html

TravelNow Admin System`;

            // Use internal send directly
            const https    = require('https');
            const WA_FROM  = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
            const WA_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
            const adminPhone = ADMIN_WA;

            if (WA_FROM && WA_TOKEN) {
                const payload = JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: adminPhone,
                    type: 'text',
                    text: { body: msg }
                });
                await new Promise(resolve => {
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
                        let d = '';
                        resp.on('data', c => d += c);
                        resp.on('end', () => {
                            console.log('[WA Admin] Response:', d.slice(0, 200));
                            resolve();
                        });
                    });
                    r.on('error', e => { console.error('[WA Admin] Error:', e.message); resolve(); });
                    r.write(payload); r.end();
                });
            } else {
                // Demo: log
                console.log(`[Admin WA Notification]\n${msg}`);
            }
        } catch (_) {}

        // ── wa.me deep-link fallback for old flow ──
        const waMsg = encodeURIComponent(
            `NEW COMPANY: ${company.companyName} | ${company.email} | ${company.phone}`
        );
        const whatsappUrl = `https://wa.me/${ADMIN_WA}?text=${waMsg}`;

        res.status(201).json({
            message: 'Registration submitted. Please verify your email to complete registration.',
            requiresEmailVerification: true,
            company,
            whatsappUrl
        });
    } catch (err) {
        console.error('Company register error:', err);
        const databaseUnavailable = /buffering timed out|MongoServerSelectionError|ECONNREFUSED|Could not connect to any servers/i.test(err.message);
        res.status(databaseUnavailable ? 503 : 500).json({
            message: databaseUnavailable
                ? 'Database is temporarily unavailable. Please try again in a moment.'
                : 'Registration failed',
            error: err.message
        });
    }
};

// Get all approved companies (public)
exports.getApproved = async (req, res) => {
    try {
        const companies = await Company.find({ status: 'approved' })
            .sort({ rating: -1 })
            .catch(() => []);
        res.json({ companies });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get pending companies (admin only)
exports.getPending = async (req, res) => {
    try {
        const companies = await Company.find({ status: 'pending' }).catch(() => []);
        res.json({ companies });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Approve company (admin only)
exports.approve = async (req, res) => {
    try {
        const company = await Company.findByIdAndUpdate(
            req.params.id,
            {
                status: 'approved',
                verified: true,
                ministry: true,
                trusted: true
            },
            { new: true }
        ).catch(() => null);

        if (!company) return res.status(404).json({ message: 'Company not found' });
        if (company.userId) {
            await User.findByIdAndUpdate(company.userId, { isActive: true, role: 'company', isEmailVerified: true }).catch(() => null);
            await sendNotification(
                company.userId,
                'company_approval',
                'Company approved',
                'Your company account has been approved. You can now log in.',
                '/pages/company-login.html'
            );
        }

        try {
            await sendEmail(
                company.email,
                'Your TravelNow company application was approved',
                companyDecisionEmailHtml(company.companyName, true)
            );
        } catch (emailErr) {
            console.error('[Company Approve] Failed to send email:', emailErr.message);
        }

        // WhatsApp welcome to company
        try {
            const wa = require('../services/whatsappService');
            if (company.whatsapp) {
                wa.sendWelcomeCompany(company.whatsapp, company.companyName).catch(() => {});
            }
        } catch (_) {}

        res.json({ message: 'Company approved', company });
    } catch (err) {
        res.status(500).json({ message: 'Approval failed' });
    }
};

// Reject company (admin only)
exports.reject = async (req, res) => {
    try {
        const reason = String(req.body.reason || '').trim();
        if (!reason) return res.status(400).json({ message: 'A rejection reason is required' });
        const company = await Company.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected', blockedReason: reason },
            { new: true }
        ).catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company not found' });
        if (company.userId) {
            await User.findByIdAndUpdate(company.userId, { isActive: false }).catch(() => null);
            await sendNotification(
                company.userId,
                'company_rejection',
                'Company rejected',
                `Your company application was rejected. Reason: ${reason}`,
                '/pages/company-register.html'
            );
        }
        try {
            await sendEmail(
                company.email,
                'Your TravelNow company application was rejected',
                companyDecisionEmailHtml(company.companyName, false, reason)
            );
        } catch (emailErr) {
            console.error('[Company Reject] Failed to send email:', emailErr.message);
        }
        res.json({ message: 'Company rejected', company });
    } catch (err) {
        res.status(500).json({ message: 'Rejection failed' });
    }
};

// Block company (admin only)
exports.block = async (req, res) => {
    try {
        const company = await Company.findByIdAndUpdate(
            req.params.id,
            { status: 'blocked', blockedReason: req.body.reason || 'Blocked by administrator' },
            { new: true }
        ).catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company not found' });
        if (company.userId) {
            await User.findByIdAndUpdate(company.userId, { isActive: false }).catch(() => null);
            await sendNotification(
                company.userId,
                'company_rejection',
                'Company blocked',
                `Your company account was blocked.${req.body.reason ? ` Reason: ${req.body.reason}` : ''}`,
                '/pages/company-login.html'
            );
        }
        res.json({ message: 'Company blocked', company });
    } catch (err) {
        res.status(500).json({ message: 'Blocking failed', error: err.message });
    }
};

// Unblock company (admin only)
exports.unblock = async (req, res) => {
    try {
        const company = await Company.findByIdAndUpdate(
            req.params.id,
            { status: 'approved', blockedReason: '' },
            { new: true }
        ).catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company not found' });
        if (company.userId) {
            await User.findByIdAndUpdate(company.userId, { isActive: true }).catch(() => null);
            await sendNotification(
                company.userId,
                'company_approval',
                'Company unblocked',
                'Your company account has been restored.',
                '/pages/company-login.html'
            );
        }
        res.json({ message: 'Company unblocked', company });
    } catch (err) {
        res.status(500).json({ message: 'Unblocking failed', error: err.message });
    }
};

// Update company (owner or admin)
exports.update = async (req, res) => {
    try {
        const companyId = req.params.id;
        const company = await Company.findById(companyId).catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        // allow admin or owner
        const isAdmin = req.user && req.user.role === 'admin';
        const isOwner = req.user && String(req.user.id || req.user._id) === String(company.userId);
        if (!isAdmin && !isOwner) return res.status(403).json({ message: 'Not authorized to update this company' });

        // merge fields
        const updatable = [
            'companyName','ownerName','phone','whatsapp','website','address','governorate','country','location',
            'commercialReg','taxCard','tourismLicense','ministryLicense','iata','experience','employees',
            'services','packages','description'
        ];
        updatable.forEach(k => {
            if (typeof req.body[k] !== 'undefined') company[k] = req.body[k];
        });

        // handle files if any
        const filePath = (fieldName) => req.files?.[fieldName]?.[0]?.path ? `/${req.files[fieldName][0].path.replace(/\\/g, '/')}` : undefined;
        if (req.files) {
            company.logo = filePath('logo') || company.logo;
            company.documents = company.documents || {};
            company.documents.commercial = filePath('docCommercial') || company.documents.commercial;
            company.documents.tax = filePath('docTax') || company.documents.tax;
            company.documents.tourism = filePath('docTourism') || company.documents.tourism;
            company.documents.ministry = filePath('docMinistry') || company.documents.ministry;
            company.documents.ownerId = filePath('docOwnerId') || company.documents.ownerId;
        }

        const saved = await company.save();
        res.json({ message: 'Company updated', company: saved });
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
};

// Get company by ID
exports.getById = async (req, res) => {
    try {
        const company = await Company.findById(req.params.id).catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company not found' });
        res.json({ company });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get company status by email (public — for polling)
exports.getStatus = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: 'Email required' });
        const company = await Company.findOne({ email }).select('status blockedReason companyName').catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company not found' });
        res.json({ status: company.status, companyName: company.companyName, blockedReason: company.blockedReason || '' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Verify company email (after registration, before admin review)
exports.verifyCompanyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ message: 'Email and code are required' });

        const normalizedEmail = String(email).trim().toLowerCase();

        const result = await EmailVerificationToken.verify(normalizedEmail, code);
        if (!result.ok) return res.status(400).json({ message: result.reason });

        // Mark user email as verified (but company still pending admin approval)
        await User.findOneAndUpdate(
            { email: normalizedEmail },
            { isEmailVerified: true }
        ).catch(() => {});

        res.json({
            message: 'Email verified. Please wait for admin approval.',
            emailVerified: true
        });
    } catch (err) {
        console.error('verifyCompanyEmail error:', err);
        res.status(500).json({ message: 'Verification failed', error: err.message });
    }
};

// Resend company email verification code
exports.resendCompanyVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const normalizedEmail = String(email).trim().toLowerCase();
        const company = await Company.findOne({ email: normalizedEmail }).select('companyName ownerName').catch(() => null);
        if (!company) return res.status(404).json({ message: 'Company not found' });

        const code = await EmailVerificationToken.generate(normalizedEmail);
        try {
            await sendEmail(
                normalizedEmail,
                'Verify your TravelNow Company Email',
                verificationEmailHtml(company.companyName || company.ownerName, code)
            );
        } catch (emailErr) {
            console.error('[ResendCompanyEmail] Failed:', emailErr.message);
        }

        res.json({ message: 'Verification code resent to your email.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to resend', error: err.message });
    }
};

// =================== WHATSAPP SERVICE ===================
// TravelNow Official WhatsApp Business Number: +20 127 096 9187
//
// Architecture:
//   1. If WHATSAPP_API_TOKEN is set → uses Meta WhatsApp Cloud API (production)
//   2. Otherwise → generates wa.me deep-link (logs it; works in demo mode)

// Ensure env vars are loaded even if this module is required standalone
require('dotenv').config();

const https = require('https');

const WA_FROM  = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WA_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const BUSINESS_NUMBER = '+20 127 096 9187';

// ── Internal: send via Meta Cloud API ──
async function sendCloudAPI(to, body) {
    if (!WA_FROM || !WA_TOKEN) return false;

    const phone = normalizePhone(to);
    if (!phone) return false;

    // Meta API requires E.164 format with + prefix
    const e164 = phone.startsWith('+') ? phone : '+' + phone;

    const payload = JSON.stringify({
        messaging_product: 'whatsapp',
        to: e164,
        type: 'text',
        text: { body }
    });

    return new Promise(resolve => {
        const req = https.request({
            hostname: 'graph.facebook.com',
            path: `/v19.0/${WA_FROM}/messages`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WA_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(true);
                } else {
                    console.error('[WhatsApp] API error:', data);
                    resolve(false);
                }
            });
        });
        req.on('error', err => { console.error('[WhatsApp] Request error:', err.message); resolve(false); });
        req.write(payload);
        req.end();
    });
}

// ── Fallback: log wa.me deep-link ──
function logDeepLink(phone, message) {
    const clean = normalizePhone(phone) || phone;
    const link  = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
    console.log(`[WhatsApp Demo] Would send to ${phone}:\n  ${message}\n  Link: ${link}`);
    return link;
}

// ── Send message (auto-choose API or fallback) ──
async function send(phone, message) {
    if (!phone) return null;
    const sent = await sendCloudAPI(phone, message);
    if (!sent) logDeepLink(phone, message);
    return sent;
}

// ── Normalise Egyptian phone numbers to E.164 ──
function normalizePhone(phone) {
    if (!phone) return null;
    let p = String(phone).replace(/[\s\-().+]/g, '');
    if (p.startsWith('00')) p = p.slice(2);
    if (p.startsWith('0'))  p = '20' + p.slice(1);
    if (!p.startsWith('20')) p = '20' + p;
    return /^\d{10,15}$/.test(p) ? p : null;
}

// ============================================================
//  PUBLIC NOTIFICATION FUNCTIONS
// ============================================================

/**
 * Welcome message to a newly registered tourist.
 */
exports.sendWelcomeUser = async (phone, name) => {
    const msg =
`👋 Welcome to TravelNow, ${name}!

🌟 Your account is ready. You can now:
• Browse 300+ Egyptian attractions
• Post travel requests & receive company proposals
• Use Yala Plan to build your itinerary

Start exploring: https://travelnow.eg

This message is from TravelNow (${BUSINESS_NUMBER})`;
    return send(phone, msg);
};

/**
 * Welcome message to a newly registered company (sent after admin approval).
 */
exports.sendWelcomeCompany = async (phone, companyName) => {
    const msg =
`🏢 Welcome, ${companyName}!

Your company has been approved on TravelNow.

You can now:
• View traveler requests
• Send trip proposals
• Receive bookings & payments

Login to your dashboard: https://travelnow.eg/pages/company-dashboard.html

TravelNow (${BUSINESS_NUMBER})`;
    return send(phone, msg);
};

/**
 * Notify user that a company sent a proposal on their post.
 */
exports.sendProposalNotification = async (userPhone, companyName, price, destination, postLink) => {
    const msg =
`📋 New Trip Proposal on TravelNow!

Company: ${companyName}
Destination: ${destination}
Price: ${Number(price).toLocaleString()} EGP

View and compare all proposals:
${postLink || 'https://travelnow.eg/pages/posts.html'}

TravelNow (${BUSINESS_NUMBER})`;
    return send(userPhone, msg);
};

/**
 * Notify the winning company that their proposal was accepted.
 */
exports.sendProposalAccepted = async (companyPhone, companyName, userName, userPhone, destination, price) => {
    const msg =
`🎉 Your Proposal Was Accepted!

Hi ${companyName},

Great news! ${userName} accepted your trip proposal.

Destination: ${destination}
Amount: ${Number(price).toLocaleString()} EGP
Client phone: ${userPhone || 'See dashboard'}

The traveler is proceeding to payment. Check your dashboard:
https://travelnow.eg/pages/company-dashboard.html

TravelNow (${BUSINESS_NUMBER})`;
    return send(companyPhone, msg);
};

/**
 * Send payment receipt to company after booking confirmed.
 */
exports.sendPaymentReceipt = async (companyPhone, companyName, receiptData) => {
    const { userName, amount, bookingRef, destination, date } = receiptData;
    const msg =
`✅ Payment Confirmed — TravelNow

Hi ${companyName},

A booking has been paid and confirmed!

━━━━━━━━━━━━━━━━━━━━━
Customer:     ${userName}
Destination:  ${destination || '-'}
Amount Paid:  ${Number(amount).toLocaleString()} EGP
Booking Ref:  ${bookingRef || '-'}
Date:         ${date || new Date().toLocaleDateString()}
━━━━━━━━━━━━━━━━━━━━━

View booking in dashboard:
https://travelnow.eg/pages/company-dashboard.html

TravelNow (${BUSINESS_NUMBER})`;
    return send(companyPhone, msg);
};

/**
 * Notify all followers of a company when a new offer is published.
 * followerPhones: array of phone strings
 */
exports.sendPromotionToFollowers = async (followerPhones, companyName, offerTitle, price, profileLink, offerId) => {
    if (!followerPhones?.length) return;

    const offerDirectLink = offerId
        ? `http://travelnow.eg/pages/company-profile.html?id=${offerId}&offer=true`
        : (profileLink || 'https://travelnow.eg/pages/companies.html');

    const msg =
`🔔 New Offer from ${companyName}!

📦 *${offerTitle}*
💰 Price: ${Number(price).toLocaleString()} EGP

👆 View & Book Now:
${offerDirectLink}

You're receiving this because you follow ${companyName} on TravelNow.
TravelNow (${BUSINESS_NUMBER})`;

    // Send sequentially with small delay to avoid rate limits
    for (const phone of followerPhones) {
        await send(phone, msg);
        await new Promise(r => setTimeout(r, 250));
    }
};

// Export normalizePhone for testing
exports._normalizePhone = normalizePhone;

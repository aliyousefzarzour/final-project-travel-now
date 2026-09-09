// =================== EMAIL SERVICE (Nodemailer + Gmail SMTP) ===================
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const user = process.env.EMAIL_USER;
    const pass = String(process.env.EMAIL_PASS || '').replace(/\s+/g, '');

    if (!user || !pass) {
        console.warn('[EmailService] EMAIL_USER / EMAIL_PASS not set — running in demo mode');
        return null;
    }

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });

    return transporter;
}

async function sendEmail(to, subject, html) {
    const t    = getTransporter();
    const from = process.env.EMAIL_FROM || `TravelNow <${process.env.EMAIL_USER}>`;

    if (!t) {
        console.log(`\n[EMAIL DEMO] To: ${to} | Subject: ${subject}\n`);
        return { demo: true };
    }

    const info = await t.sendMail({ from, to, subject, html });
    console.log(`[EmailService] ✅ Sent to ${to} | messageId: ${info.messageId}`);
    return info;
}

function verificationEmailHtml(name, code) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Poppins,Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0a1d2e,#1a3a5c);padding:32px 24px;text-align:center;">
      <h1 style="color:#d4af37;font-family:serif;margin:0;letter-spacing:2px;">TRAVELNOW</h1>
      <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:0.9rem;">Email Verification</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#0a1d2e;font-size:1rem;margin-top:0;">Hi <strong>${name}</strong>,</p>
      <p style="color:#444;line-height:1.7;">Thank you for registering with TravelNow. Use the code below to verify your email:</p>
      <div style="text-align:center;margin:28px 0;">
        <div style="display:inline-block;background:#0a1d2e;color:#d4af37;font-size:2rem;font-weight:700;letter-spacing:10px;padding:16px 32px;border-radius:12px;font-family:monospace;">
          ${code}
        </div>
      </div>
      <p style="color:#666;font-size:0.85rem;line-height:1.6;">This code expires in <strong>24 hours</strong>.<br>If you did not create an account, ignore this email.</p>
    </div>
    <div style="background:#f9f9f9;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
      <p style="color:#aaa;font-size:0.75rem;margin:0;">TravelNow — Egypt's Premier Tourism Platform</p>
    </div>
  </div>
</body>
</html>`;
}

function passwordResetEmailHtml(name, code) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Poppins,Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#0a1d2e,#1a3a5c);padding:32px 24px;text-align:center;">
      <h1 style="color:#d4af37;font-family:serif;margin:0;letter-spacing:2px;">TRAVELNOW</h1>
      <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:0.9rem;">Password Reset</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#0a1d2e;font-size:1rem;margin-top:0;">Hi <strong>${name}</strong>,</p>
      <p style="color:#444;line-height:1.7;">Use the code below to reset your password:</p>
      <div style="text-align:center;margin:28px 0;">
        <div style="display:inline-block;background:#0a1d2e;color:#d4af37;font-size:2rem;font-weight:700;letter-spacing:10px;padding:16px 32px;border-radius:12px;font-family:monospace;">
          ${code}
        </div>
      </div>
      <p style="color:#666;font-size:0.85rem;line-height:1.6;">This code expires in <strong>1 hour</strong>.<br>If you did not request this, ignore this email.</p>
    </div>
    <div style="background:#f9f9f9;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
      <p style="color:#aaa;font-size:0.75rem;margin:0;">TravelNow — Egypt's Premier Tourism Platform</p>
    </div>
  </div>
</body>
</html>`;
}

function companyDecisionEmailHtml(companyName, approved, reason = '') {
  const intro = approved
    ? 'Congratulations! Your TravelNow company account has been approved and is ready to use.'
    : 'We reviewed your TravelNow company application and could not approve it at this time.';
  const details = approved
    ? '<p style="color:#444;line-height:1.7;">You can now sign in and manage your company profile, offers, and bookings.</p><p style="text-align:center;margin:28px 0;"><a href="http://127.0.0.1:5500/pages/company-login.html" style="display:inline-block;background:#d4af37;color:#0a1d2e;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Go to Company Login</a></p>'
    : `<div style="background:#fff4f4;border-left:4px solid #dc3545;padding:14px 16px;margin:20px 0;color:#5a1a1a;"><strong>Reason:</strong><br>${reason || 'Please contact support for more information.'}</div><p style="color:#444;line-height:1.7;">You may update your information and apply again.</p>`;

  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
<div style="background:#0a1d2e;padding:28px 24px;text-align:center;"><h1 style="color:#d4af37;margin:0;">TRAVELNOW</h1><p style="color:#fff;margin:8px 0 0;">Company Application Update</p></div>
<div style="padding:28px 24px;"><p style="color:#0a1d2e;">Hello <strong>${companyName}</strong>,</p><p style="color:#444;line-height:1.7;">${intro}</p>${details}</div>
<div style="background:#f9f9f9;padding:14px 24px;text-align:center;color:#888;font-size:12px;">TravelNow - Egypt Tourism Platform</div></div></body></html>`;
}

module.exports = { sendEmail, verificationEmailHtml, passwordResetEmailHtml, companyDecisionEmailHtml };

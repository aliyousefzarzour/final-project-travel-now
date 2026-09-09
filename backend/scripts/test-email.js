require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

console.log('EMAIL_USER:', process.env.EMAIL_USER || 'MISSING');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'MISSING');

const { sendEmail, verificationEmailHtml } = require('../services/emailService');

async function test() {
    try {
        const result = await sendEmail(
            process.env.EMAIL_USER,
            'Test - TravelNow Verification Code',
            verificationEmailHtml('Ali', '847291')
        );
        console.log('✅ Email sent!', result.messageId || '');
    } catch (err) {
        console.error('❌ ERROR:', err.message);
    }
}

test();

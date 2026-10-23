// =================== CANONICAL EMAIL ===================
// Signup runs express-validator's normalizeEmail(), which strips dots from a
// Gmail local part, so "A.B@gmail.com" is stored as "ab@gmail.com". Lookups that
// only lowercase the input therefore never find that account, and the email
// verification code can never be resent or redeemed. Anything matching a user by
// email for verification has to apply the same rule.
module.exports = function canonicalEmail(raw) {
    const email  = String(raw || '').trim().toLowerCase();
    const at     = email.lastIndexOf('@');
    if (at < 1) return email;
    const local  = email.slice(0, at);
    const domain = email.slice(at + 1);
    const isGmail = domain === 'gmail.com' || domain === 'googlemail.com';
    return isGmail ? `${local.replace(/\./g, '')}@gmail.com` : email;
};

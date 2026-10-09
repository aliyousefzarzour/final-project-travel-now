const crypto = require('crypto');

const INTENTION_URL = 'https://accept.paymob.com/v1/intention/';
const CHECKOUT_URL = 'https://eg.checkout.paymob.com/';

const CALLBACK_HMAC_FIELDS = [
    'amount_cents',
    'created_at',
    'currency',
    'error_occured',
    'has_parent_transaction',
    'id',
    'integration_id',
    'is_3d_secure',
    'is_auth',
    'is_capture',
    'is_refunded',
    'is_standalone_payment',
    'is_voided',
    'order_id',
    'owner',
    'pending',
    'source_data.pan',
    'source_data.sub_type',
    'source_data.type',
    'success'
];

function requireHttpsUrl(value, variableName, allowLocalHttp = false) {
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        throw new Error(`${variableName} must be an absolute URL`);
    }

    const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !(allowLocalHttp && localHost && parsed.protocol === 'http:')) {
        throw new Error(`${variableName} must use HTTPS`);
    }
    return parsed;
}

function getSandboxConfig(config) {
    if (config.PAYMOB_MODE !== 'sandbox') {
        throw new Error('PAYMOB_MODE must be explicitly set to sandbox');
    }
    if (!/^(?:[a-z]{3}_)?sk_test_[A-Za-z0-9_-]+$/.test(config.PAYMOB_SECRET_KEY || '')) {
        throw new Error('PAYMOB_SECRET_KEY must be a Paymob test secret key');
    }
    if (!/^(?:[a-z]{3}_)?pk_test_[A-Za-z0-9_-]+$/.test(config.PAYMOB_PUBLIC_KEY || '')) {
        throw new Error('PAYMOB_PUBLIC_KEY must be a Paymob test public key');
    }
    if (!/^\d+$/.test(config.PAYMOB_CARD_INTEGRATION_ID || '')) {
        throw new Error('PAYMOB_CARD_INTEGRATION_ID must be a configured test integration ID');
    }
    if (typeof config.PAYMOB_HMAC_SECRET !== 'string' || config.PAYMOB_HMAC_SECRET.length < 32) {
        throw new Error('PAYMOB_HMAC_SECRET is missing or invalid');
    }

    const callbackUrl = requireHttpsUrl(config.PAYMOB_CALLBACK_URL, 'PAYMOB_CALLBACK_URL');
    const returnUrl = requireHttpsUrl(config.PAYMOB_RETURN_URL, 'PAYMOB_RETURN_URL', true);

    return {
        secretKey: config.PAYMOB_SECRET_KEY,
        publicKey: config.PAYMOB_PUBLIC_KEY,
        integrationId: Number(config.PAYMOB_CARD_INTEGRATION_ID),
        hmacSecret: config.PAYMOB_HMAC_SECRET,
        callbackUrl: callbackUrl.toString(),
        returnUrl: returnUrl.toString()
    };
}

function getCallbackHmacString(callback) {
    const transaction = callback?.obj;
    if (!transaction || !transaction.order || !transaction.source_data) {
        throw new Error('Paymob callback transaction data is incomplete');
    }

    const values = {
        amount_cents: transaction.amount_cents,
        created_at: transaction.created_at,
        currency: transaction.currency,
        error_occured: transaction.error_occured,
        has_parent_transaction: transaction.has_parent_transaction,
        id: transaction.id,
        integration_id: transaction.integration_id,
        is_3d_secure: transaction.is_3d_secure,
        is_auth: transaction.is_auth,
        is_capture: transaction.is_capture,
        is_refunded: transaction.is_refunded,
        is_standalone_payment: transaction.is_standalone_payment,
        is_voided: transaction.is_voided,
        order_id: transaction.order.id,
        owner: transaction.owner,
        pending: transaction.pending,
        'source_data.pan': transaction.source_data.pan,
        'source_data.sub_type': transaction.source_data.sub_type,
        'source_data.type': transaction.source_data.type,
        success: transaction.success
    };

    const missing = CALLBACK_HMAC_FIELDS.filter(field => values[field] === undefined || values[field] === null);
    if (missing.length) {
        throw new Error(`Paymob callback is missing signed fields: ${missing.join(', ')}`);
    }
    return CALLBACK_HMAC_FIELDS.map(field => String(values[field])).join('');
}

function verifyCallbackHmac(callback, providedHmac, secret) {
    if (typeof providedHmac !== 'string' || !/^[a-f\d]{128}$/i.test(providedHmac)) {
        return false;
    }
    const expected = crypto.createHmac('sha512', secret)
        .update(getCallbackHmacString(callback), 'utf8')
        .digest();
    const received = Buffer.from(providedHmac, 'hex');
    return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function createCheckoutUrl(publicKey, clientSecret) {
    const url = new URL(CHECKOUT_URL);
    url.searchParams.set('publicKey', publicKey);
    url.searchParams.set('clientSecret', clientSecret);
    return url.toString();
}

async function createIntention(payload, sandboxConfig, fetchImplementation = fetch) {
    const response = await fetchImplementation(INTENTION_URL, {
        method: 'POST',
        headers: {
            Authorization: `Token ${sandboxConfig.secretKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
        throw new Error(`Paymob intention request failed with HTTP ${response.status}`);
    }

    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error('Paymob returned an invalid intention response');
    }
    return data;
}

module.exports = {
    CALLBACK_HMAC_FIELDS,
    createCheckoutUrl,
    createIntention,
    getCallbackHmacString,
    getSandboxConfig,
    verifyCallbackHmac
};

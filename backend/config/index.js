// =================== CONFIG ===================
module.exports = {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // ✅ Support multiple origins (comma-separated string OR single)
    FRONTEND_URL: process.env.FRONTEND_URL || [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:5501',        // ✅ Live Server
        'http://127.0.0.1:5501',        // ✅ Live Server
        'http://localhost:8000',        // ✅ Python static server / preview
        'http://127.0.0.1:8000',        // ✅ Python static server / preview
        'http://localhost:8080',
        'http://127.0.0.1:8080'
    ].join(','),
    
    // لو عايز تسمح لأي origin (development only!)
    // FRONTEND_URL: '*',

    JWT_SECRET: process.env.JWT_SECRET || 'travelnow-super-secret-key-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

    // MongoDB
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/travelnow',

    // Stripe (Payment Gateway)
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

    // Admin contact and bootstrap credentials
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
    ADMIN_PHONE: process.env.ADMIN_PHONE || '',
    ADMIN_WHATSAPP: process.env.ADMIN_WHATSAPP || ''
};

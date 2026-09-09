// =================== TRAVELNOW BACKEND - MAIN SERVER ===================
require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');
const path    = require('path');
const connectDB = require('./database/connection');
const config  = require('./config');
const socketService = require('./services/socketService');

const app    = express();
const server = http.createServer(app); // wrap express in http.Server for Socket.IO
const PORT   = config.PORT;

connectDB();

// =================== MIDDLEWARE ===================
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const allowedOrigins = config.FRONTEND_URL === '*'
    ? true
    : config.FRONTEND_URL.split(',').map(origin => origin.trim()).filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        const isLocalPreview = !!origin && (
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            origin.startsWith('http://[::1]:') ||
            origin.startsWith('https://localhost:') ||
            origin.startsWith('https://127.0.0.1:')
        );

        if (!origin || allowedOrigins === true || allowedOrigins.includes(origin) || isLocalPreview || config.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Stripe webhooks require the raw request body for signature verification.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' }
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts' }
});
app.use('/api/', limiter);

// =================== ROUTES ===================
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/attractions', require('./routes/attractions'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/follows',   require('./routes/follows'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/chat',     require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/trip-planner', require('./routes/trip-planner'));
app.use('/api/admin', require('./routes/admin'));

// =================== HEALTH ===================
app.get('/', (req, res) => res.json({ name: 'TravelNow API', version: '1.0.0', status: 'running' }));
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// =================== ERROR HANDLING ===================
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    const status = err.status || 500;
    res.status(status).json({ error: status >= 500 ? 'Internal Server Error' : err.message });
});

// =================== START ===================
if (require.main === module) {
    // Init Socket.IO before listening
    socketService.init(server);

    server.listen(PORT, () => {
        console.log(`TravelNow API running on http://localhost:${PORT}`);
        console.log(`Environment: ${config.NODE_ENV}`);
    });
}

module.exports = app;

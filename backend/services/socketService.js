// =================== SOCKET.IO SERVICE ===================
// Central singleton — import this anywhere to emit real-time events.
//
//   const { emitToUser, emitToAll } = require('../services/socketService');
//   emitToUser(userId, 'new_notification', { title, message });

const jwt = require('jsonwebtoken');
const config = require('../config');

let _io = null;

// Map: userId (string) → Set of socket IDs
const userSockets = new Map();

/**
 * Initialise Socket.IO with an existing http.Server.
 * Call once from server.js.
 */
function init(httpServer) {
    const { Server } = require('socket.io');

    _io = new Server(httpServer, {
        cors: {
            origin: config.FRONTEND_URL === '*'
                ? '*'
                : config.FRONTEND_URL.split(',').map(o => o.trim()),
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    _io.use((socket, next) => {
        // Authenticate via JWT token sent as handshake auth or query param
        const token = socket.handshake.auth?.token
            || socket.handshake.headers?.authorization?.replace('Bearer ', '')
            || socket.handshake.query?.token;

        if (!token) return next(new Error('Authentication required'));
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            socket.userId = String(decoded.id || decoded._id);
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    _io.on('connection', socket => {
        const uid = socket.userId;
        if (!userSockets.has(uid)) userSockets.set(uid, new Set());
        userSockets.get(uid).add(socket.id);
        console.log(`[Socket] User ${uid} connected (${socket.id})`);

        // Join personal room
        socket.join(`user:${uid}`);

        socket.on('disconnect', () => {
            const set = userSockets.get(uid);
            if (set) {
                set.delete(socket.id);
                if (set.size === 0) userSockets.delete(uid);
            }
            console.log(`[Socket] User ${uid} disconnected (${socket.id})`);
        });

        // Ping/pong keepalive
        socket.on('ping', () => socket.emit('pong'));
    });

    console.log('[Socket.IO] Initialised');
    return _io;
}

/**
 * Emit an event to a specific user (all their open tabs/devices).
 */
function emitToUser(userId, event, data) {
    if (!_io) return;
    _io.to(`user:${String(userId)}`).emit(event, data);
}

/**
 * Emit an event to ALL connected clients.
 */
function emitToAll(event, data) {
    if (!_io) return;
    _io.emit(event, data);
}

/**
 * Emit an event to a set of userIds (e.g. all followers).
 */
function emitToUsers(userIds, event, data) {
    if (!_io || !userIds?.length) return;
    userIds.forEach(uid => emitToUser(uid, event, data));
}

/**
 * Returns the raw io instance if needed.
 */
function getIO() { return _io; }

module.exports = { init, emitToUser, emitToAll, emitToUsers, getIO };

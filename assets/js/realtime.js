/**
 * TravelNow — Real-Time Client (Socket.IO)
 * Include this AFTER auth.js on any page that needs live updates.
 *
 * Features:
 *  - Auto-connects with JWT token
 *  - Shows toast on new_notification
 *  - Fires 'travelnow:post_updated' custom event so any page can listen
 *  - Updates navbar notification badge in real-time
 *  - Auto-reconnects silently on disconnect
 */
(function () {
    'use strict';

    const SOCKET_URL = (window.TRAVELNOW_API_BASE || 'http://localhost:5000').replace('/api', '');

    let socket = null;
    let reconnectTimer = null;

    function getToken() {
        if (window.Storage && typeof Storage.getToken === 'function') return Storage.getToken();
        const t = sessionStorage.getItem('travelnow-token');
        return (t && t !== 'null' && t !== 'undefined') ? t.replace(/^['"]|['"]$/g, '').trim() : null;
    }

    function connect() {
        const token = getToken();
        if (!token) return; // not logged in — skip

        // Dynamically load socket.io-client from CDN if not already loaded
        if (typeof io === 'undefined') {
            const s = document.createElement('script');
            s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
            s.onload  = () => initSocket(token);
            s.onerror = () => console.warn('[RT] Socket.IO CDN unavailable — real-time disabled');
            document.head.appendChild(s);
        } else {
            initSocket(token);
        }
    }

    function initSocket(token) {
        if (socket && socket.connected) return;

        socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 10,
            reconnectionDelay: 3000,
            timeout: 10000
        });

        socket.on('connect', () => {
            console.log('[RT] Connected:', socket.id);
            if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        });

        socket.on('disconnect', reason => {
            console.warn('[RT] Disconnected:', reason);
        });

        socket.on('connect_error', err => {
            console.warn('[RT] Connection error:', err.message);
        });

        // ── New notification ──
        socket.on('new_notification', notification => {
            showLiveNotification(notification);
            incrementNavBadge();
        });

        // ── Live chat message (from admin) ──
        socket.on('chat_message', data => {
            const { message } = data;
            if (!message || message.sender !== 'admin') return;

            // If on chat page — let chat.html handle it (it also listens)
            if (window.location.pathname.includes('chat.html')) return;

            // Otherwise show toast + badge
            if (typeof showToast === 'function') {
                showToast('💬 New message from Support', 'info');
            }
            incrementNavBadge();

            // Dispatch custom event so any page can listen
            window.dispatchEvent(new CustomEvent('travelnow:chat_message', { detail: data }));
        });

        // ── Post updated (new proposal, locked, closed) ──
        socket.on('post_updated', data => {            // Dispatch custom DOM event so pages can react
            window.dispatchEvent(new CustomEvent('travelnow:post_updated', { detail: data }));

            if (data.event === 'new_proposal') {
                showToast(`📋 New proposal from ${data.companyName} — ${Number(data.price || 0).toLocaleString()} EGP`, 'info');
            }
        });

        // ── Company offer published (for followers) ──
        socket.on('company_offer', data => {
            showToast(`🏢 ${data.companyName}: ${data.title}`, 'info');
            window.dispatchEvent(new CustomEvent('travelnow:company_offer', { detail: data }));
        });

        socket.on('pong', () => {}); // keepalive ack
    }

    // ── Live notification toast (richer than simple showToast) ──
    function showLiveNotification(n) {
        if (typeof showToast === 'function') {
            showToast(`🔔 ${n.title}: ${n.message}`, 'info');
        }

        // Also append to notifications container if on that page
        const container = document.getElementById('notifications-container');
        if (container) {
            const div = document.createElement('div');
            div.className = 'dashboard-card mb-3 notification-card is-unread unread-bg';
            div.style.animation = 'fadeInDown 0.4s ease';
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-start gap-3">
                    <div>
                        <h5 style="color:#d4af37">${escapeHtml(n.title)}</h5>
                        <p class="mb-1">${escapeHtml(n.message)}</p>
                        <small class="text-muted">Just now</small>
                    </div>
                    <span style="background:rgba(212,175,55,0.15);color:#d4af37;border-radius:20px;padding:2px 10px;font-size:0.72rem;font-weight:700;white-space:nowrap;">NEW</span>
                </div>
            `;
            container.insertBefore(div, container.firstChild);
        }
    }

    function escapeHtml(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ── Navbar notification badge ──
    function incrementNavBadge() {
        let badge = document.getElementById('rt-notif-badge');
        if (!badge) {
            // Inject badge next to bell icon in navbar if present
            const bellLink = document.querySelector('.tn-navbar a[href*="notifications"]');
            if (!bellLink) return;
            badge = document.createElement('span');
            badge.id = 'rt-notif-badge';
            badge.style.cssText = 'background:#d4af37;color:#0a1d2e;border-radius:50%;font-size:0.65rem;font-weight:800;padding:1px 5px;margin-left:4px;vertical-align:middle;';
            badge.textContent = '1';
            bellLink.appendChild(badge);
        } else {
            const current = parseInt(badge.textContent, 10) || 0;
            badge.textContent = current + 1;
        }
    }

    // ── Public API ──
    window.TnRT = {
        connect,
        disconnect: () => { if (socket) socket.disconnect(); },
        emit: (event, data) => { if (socket && socket.connected) socket.emit(event, data); },
        getSocket: () => socket
    };

    // Auto-connect on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', connect);
    } else {
        connect();
    }
})();

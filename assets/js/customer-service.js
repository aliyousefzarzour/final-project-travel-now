/**
 * TravelNow — Customer Service Chat Widget
 * Add this script to any page that needs the support chat bubble.
 * Requires: auth.js (loaded before this file)
 */
(function () {
    'use strict';

    // ── Config ──
    const API = (window.TRAVELNOW_API_BASE || 'http://' + window.location.hostname + ':5000/api');
    const SOCKET_URL = API.replace('/api', '');
    let chatId   = null;
    let socket   = null;
    let isOpen   = false;
    let unread   = 0;

    function getToken() {
        if (window.Storage && typeof Storage.getToken === 'function') return Storage.getToken();
        const t = sessionStorage.getItem('travelnow-token');
        return (t && t !== 'null') ? t.replace(/^['"]|['"]$/g,'').trim() : null;
    }

    function getUser() {
        try {
            if (window.Storage) return Storage.get('travelnow-user');
            return JSON.parse(sessionStorage.getItem('travelnow-user'));
        } catch { return null; }
    }

    // ── Inject CSS ──
    const style = document.createElement('style');
    style.textContent = `
        #cs-widget * { box-sizing: border-box; font-family: 'Poppins', sans-serif; }

        /* Bubble button */
        #cs-bubble {
            position: fixed; bottom: 28px; right: 28px; z-index: 9999;
            width: 58px; height: 58px; border-radius: 50%;
            background: linear-gradient(135deg, #d4af37, #c9a227);
            border: none; cursor: pointer;
            box-shadow: 0 6px 22px rgba(212,175,55,0.45);
            display: flex; align-items: center; justify-content: center;
            transition: transform .2s, box-shadow .2s;
        }
        #cs-bubble:hover { transform: scale(1.1); box-shadow: 0 8px 28px rgba(212,175,55,0.55); }
        #cs-bubble svg  { width: 26px; height: 26px; fill: #0a1d2e; }
        #cs-unread {
            position: absolute; top: -3px; right: -3px;
            background: #e53e3e; color: #fff;
            border-radius: 50%; min-width: 20px; height: 20px;
            font-size: 0.68rem; font-weight: 700;
            display: none; align-items: center; justify-content: center;
            border: 2px solid #fff;
        }

        /* Chat panel */
        #cs-panel {
            position: fixed; bottom: 100px; right: 28px; z-index: 9998;
            width: 340px; max-width: calc(100vw - 32px);
            height: 480px; max-height: calc(100vh - 130px);
            border-radius: 20px; overflow: hidden;
            box-shadow: 0 16px 56px rgba(0,0,0,0.25);
            display: flex; flex-direction: column;
            background: #fff;
            transform: scale(0.85) translateY(20px);
            opacity: 0; pointer-events: none;
            transition: transform .25s cubic-bezier(.2,.9,.3,1), opacity .22s ease;
            border: 1px solid rgba(212,175,55,0.2);
        }
        #cs-panel.open {
            transform: scale(1) translateY(0);
            opacity: 1; pointer-events: all;
        }

        /* Header */
        #cs-head {
            background: linear-gradient(135deg, #d4af37, #c9a227);
            padding: 14px 16px;
            display: flex; align-items: center; gap: 12px;
            flex-shrink: 0;
        }
        #cs-head-icon {
            width: 40px; height: 40px; border-radius: 50%;
            background: rgba(10,29,46,0.2);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        #cs-head-icon svg { width: 20px; height: 20px; fill: #0a1d2e; }
        #cs-head h4 { margin: 0 0 1px; font-size: 0.88rem; font-weight: 700; color: #0a1d2e; }
        #cs-head p  { margin: 0; font-size: 0.72rem; color: rgba(10,29,46,0.65); display:flex;align-items:center;gap:4px; }
        #cs-online-dot { width: 7px; height: 7px; border-radius: 50%; background: #1a8a3c; flex-shrink:0; }
        #cs-close-btn {
            margin-left: auto; background: rgba(10,29,46,0.18);
            border: none; color: #0a1d2e;
            width: 28px; height: 28px; border-radius: 50%;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            flex-shrink: 0; font-size: 0.85rem;
        }

        /* Messages */
        #cs-messages {
            flex: 1; overflow-y: auto; padding: 14px;
            display: flex; flex-direction: column; gap: 10px;
            scroll-behavior: smooth;
        }
        #cs-messages::-webkit-scrollbar { width: 3px; }
        #cs-messages::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius:3px; }

        .cs-msg-row { display: flex; align-items: flex-end; gap: 7px; animation: csFadeUp .2s ease; }
        .cs-msg-row.out { flex-direction: row-reverse; }
        @keyframes csFadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }

        .cs-av {
            width: 28px; height: 28px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.68rem; font-weight: 700; flex-shrink: 0;
        }
        .cs-av.admin { background: linear-gradient(135deg,#d4af37,#c9a227); color: #0a1d2e; }
        .cs-av.user  { background: rgba(212,175,55,0.15); color: #c9a227; border: 1.5px solid rgba(212,175,55,0.3); }

        .cs-bubble {
            max-width: 78%; padding: 9px 13px;
            border-radius: 16px; font-size: 0.82rem;
            line-height: 1.55; word-break: break-word; white-space: pre-wrap;
        }
        .cs-bubble.admin { background: #f3f4f6; color: #1a1a2e; border-bottom-left-radius: 4px; }
        .cs-bubble.user  { background: linear-gradient(135deg,#d4af37,#c9a227); color: #0a1d2e; border-bottom-right-radius: 4px; }
        .cs-time { font-size: 0.62rem; color: #bbb; margin-top: 2px; }
        .cs-msg-row.out .cs-time { text-align: right; }

        /* Typing */
        #cs-typing { display:none; align-items:center; gap:6px; padding: 2px 0 6px; }
        .cs-dots span {
            display:inline-block; width:6px; height:6px; border-radius:50%;
            background:#d4af37; opacity:.5; animation:csBounce .7s infinite;
        }
        .cs-dots span:nth-child(2){animation-delay:.1s}
        .cs-dots span:nth-child(3){animation-delay:.2s}
        @keyframes csBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}

        /* Empty */
        #cs-empty {
            flex:1; display:flex; flex-direction:column;
            align-items:center; justify-content:center;
            gap:10px; color:#ccc; padding:24px; text-align:center;
        }
        #cs-empty svg { width:44px; height:44px; opacity:.25; fill:#d4af37; }
        #cs-empty p { font-size:0.8rem; margin:0; }

        /* Input */
        #cs-input-wrap {
            padding: 10px 12px; border-top: 1px solid rgba(0,0,0,0.07);
            display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0;
            background: #fff;
        }
        #cs-input {
            flex: 1; border: 1.5px solid rgba(212,175,55,0.3);
            border-radius: 18px; padding: 8px 14px;
            font-size: 0.82rem; outline: none; resize: none;
            max-height: 80px; font-family: inherit; background: transparent;
            color: #1a1a2e; transition: border-color .2s; line-height: 1.4;
        }
        #cs-input:focus { border-color: #d4af37; }
        #cs-send {
            width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
            background: linear-gradient(135deg,#d4af37,#c9a227);
            border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 3px 10px rgba(212,175,55,.35);
            transition: transform .15s;
        }
        #cs-send:hover { transform: scale(1.08); }
        #cs-send:disabled { opacity:.45; transform:none; cursor:not-allowed; }
        #cs-send svg { width:16px; height:16px; fill:#0a1d2e; }

        /* Login prompt */
        #cs-login-prompt {
            flex:1; display:flex; flex-direction:column;
            align-items:center; justify-content:center;
            gap:12px; padding:24px; text-align:center;
        }
        #cs-login-prompt p { font-size:0.82rem; color:#666; margin:0; }
        #cs-login-prompt a {
            display:inline-block; background:linear-gradient(135deg,#d4af37,#c9a227);
            color:#0a1d2e; font-weight:700; font-size:0.82rem;
            padding:8px 22px; border-radius:20px; text-decoration:none;
        }

        @media(max-width:400px){
            #cs-panel{width:calc(100vw - 16px);right:8px;}
            #cs-bubble{bottom:16px;right:16px;}
        }
    `;
    document.head.appendChild(style);

    // ── Build HTML ──
    const widget = document.createElement('div');
    widget.id = 'cs-widget';
    widget.innerHTML = `
        <!-- Floating bubble -->
        <button id="cs-bubble" aria-label="Open support chat" onclick="window._csToggle()">
            <svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
            <span id="cs-unread"></span>
        </button>

        <!-- Panel -->
        <div id="cs-panel" role="dialog" aria-label="Customer Service Chat">
            <!-- Header -->
            <div id="cs-head">
                <div id="cs-head-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 1a11 11 0 100 22A11 11 0 0012 1zm0 4a3 3 0 110 6 3 3 0 010-6zm0 14.5a8.5 8.5 0 01-6.5-3.04C5.68 14.84 8.67 13.5 12 13.5s6.32 1.34 6.5 2.96A8.5 8.5 0 0112 19.5z"/></svg>
                </div>
                <div>
                    <h4>Customer Service</h4>
                    <p><span id="cs-online-dot"></span>Online — We're here to help</p>
                </div>
                <button id="cs-close-btn" onclick="window._csToggle()" aria-label="Close">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
                </button>
            </div>

            <!-- Body: login prompt OR chat -->
            <div id="cs-body" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;">
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    // ── Render body based on auth state ──
    function renderBody() {
        const token = getToken();
        const user  = getUser();
        const body  = document.getElementById('cs-body');

        if (!token || !user) {
            body.innerHTML = `
                <div id="cs-login-prompt">
                    <svg viewBox="0 0 24 24" style="width:52px;height:52px;fill:#d4af37;opacity:0.6"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
                    <p>Login to chat with our support team</p>
                    <a href="${window.location.pathname.includes('/pages/') ? '' : 'pages/'}login.html">Login to Chat</a>
                </div>`;
            return;
        }

        body.innerHTML = `
            <div id="cs-messages">
                <div id="cs-empty">
                    <svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
                    <p>Hello ${user.fullName || ''}! 👋<br>How can we help you today?</p>
                </div>
            </div>
            <div id="cs-typing">
                <div class="cs-av admin">A</div>
                <div class="cs-dots"><span></span><span></span><span></span></div>
            </div>
            <div id="cs-input-wrap">
                <textarea id="cs-input" placeholder="Type your message…" rows="1" maxlength="800"
                    onkeydown="window._csKey(event)"
                    oninput="window._csInput(this)"></textarea>
                <button id="cs-send" disabled onclick="window._csSend()">
                    <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
            </div>`;

        loadHistory();
        initSocket();
    }

    // ── Helpers ──
    function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }
    function fmtTime(d){ return new Date(d).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }
    function userInitials(){ const u=getUser(); return (u?.fullName||'U').charAt(0).toUpperCase(); }

    function appendMsg(msg, animate=true) {
        const box   = document.getElementById('cs-messages');
        if (!box) return;
        const empty = document.getElementById('cs-empty');
        if (empty) empty.remove();

        const isUser = msg.sender === 'user';
        const row = document.createElement('div');
        row.className = 'cs-msg-row ' + (isUser ? 'out' : '');
        if (!animate) row.style.animation = 'none';
        row.innerHTML = `
            <div class="cs-av ${isUser?'user':'admin'}">${isUser ? userInitials() : 'A'}</div>
            <div>
                <div class="cs-bubble ${isUser?'user':'admin'}">${esc(msg.text)}</div>
                <div class="cs-time">${fmtTime(msg.createdAt||new Date())}</div>
            </div>`;
        box.appendChild(row);
        box.scrollTop = box.scrollHeight;
    }

    async function loadHistory() {
        const token = getToken();
        if (!token) return;
        try {
            const r    = await fetch(API + '/chat/my', { headers:{ Authorization:'Bearer '+token } });
            const data = await r.json();
            chatId = data.chat?._id;
            (data.chat?.messages || []).forEach(m => appendMsg(m, false));
        } catch(e) { console.warn('[CS]', e.message); }
    }

    async function sendMsg(text) {
        const token = getToken();
        if (!token || !text.trim()) return;
        appendMsg({ sender:'user', text, createdAt:new Date() });
        try {
            const r    = await fetch(API + '/chat/my/send', {
                method:'POST',
                headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
                body: JSON.stringify({ text })
            });
            const data = await r.json();
            chatId = chatId || data.chatId;
        } catch(e) { console.warn('[CS]', e.message); }
    }

    function initSocket() {
        if (socket) return;
        const token = getToken();
        if (!token) return;

        const load = () => {
            socket = window.io(SOCKET_URL, {
                auth: { token }, transports:['websocket','polling'],
                reconnectionAttempts: 5
            });
            socket.on('chat_message', data => {
                if (data.message?.sender !== 'admin') return;
                if (!isOpen) {
                    unread++;
                    const badge = document.getElementById('cs-unread');
                    if (badge) { badge.textContent = unread; badge.style.display='flex'; }
                }
                const typing = document.getElementById('cs-typing');
                if (typing) { typing.style.display='flex'; }
                const box = document.getElementById('cs-messages');
                if (box) box.scrollTop = box.scrollHeight;
                setTimeout(() => {
                    if (typing) typing.style.display='none';
                    appendMsg(data.message);
                }, 700);
            });
        };

        if (typeof window.io !== 'undefined') { load(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        s.onload  = load;
        s.onerror = () => {};
        document.head.appendChild(s);
    }

    // ── Public API ──
    window._csToggle = function () {
        isOpen = !isOpen;
        const panel = document.getElementById('cs-panel');
        if (isOpen) {
            panel.classList.add('open');
            renderBody();
            // Clear unread
            unread = 0;
            const badge = document.getElementById('cs-unread');
            if (badge) badge.style.display = 'none';
            setTimeout(() => document.getElementById('cs-input')?.focus(), 300);
        } else {
            panel.classList.remove('open');
        }
    };

    window._csKey = function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            window._csSend();
        }
    };

    window._csInput = function (el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 80) + 'px';
        const btn = document.getElementById('cs-send');
        if (btn) btn.disabled = !el.value.trim();
    };

    window._csSend = async function () {
        const input = document.getElementById('cs-input');
        const text  = input?.value?.trim();
        if (!text) return;
        input.value = '';
        input.style.height = 'auto';
        const btn = document.getElementById('cs-send');
        if (btn) btn.disabled = true;
        await sendMsg(text);
    };

    // Auto-init socket if logged in on page load
    const token = getToken();
    if (token) {
        setTimeout(initSocket, 1000);
    }

})();

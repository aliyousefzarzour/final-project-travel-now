// =================== AUTHENTICATION - TRAVELNOW ===================
const defaultApiBase = window.location.hostname.endsWith('github.io')
    ? 'https://travelnow-api.vercel.app/api'
    : `http://${window.location.hostname}:5000/api`;
const API_BASE = window.TRAVELNOW_API_BASE
    || localStorage.getItem('travelnow-api-base')
    || defaultApiBase;

const nativeFetch = window.fetch.bind(window);
window._nativeFetch = nativeFetch; // expose for multipart uploads
const AUTH_USER_KEY = 'travelnow-user';
const AUTH_TOKEN_KEY = 'travelnow-token';

// =================== CURRENCY HELPER ===================
// Exchange rate: 1 USD = 50 EGP (update as needed)
const USD_RATE = 50;

/**
 * Format a price showing both EGP and USD equivalent.
 * Usage: formatPrice(1800) → "1,800 EGP (~$36)"
 */
function formatPrice(egp, options = {}) {
    if (!egp && egp !== 0) return '—';
    const usd = Math.round(Number(egp) / USD_RATE);
    const egpStr = Number(egp).toLocaleString();
    if (options.usdOnly) return `$${usd.toLocaleString()}`;
    if (options.egpOnly) return `${egpStr} EGP`;
    return `${egpStr} EGP <span style="color:rgba(255,255,255,0.45);font-size:0.85em">(~$${usd.toLocaleString()})</span>`;
}

/**
 * Plain text version (no HTML)
 */
function formatPriceText(egp) {
    if (!egp && egp !== 0) return '—';
    const usd = Math.round(Number(egp) / USD_RATE);
    return `${Number(egp).toLocaleString()} EGP (~$${usd.toLocaleString()})`;
}

window.formatPrice     = formatPrice;
window.formatPriceText = formatPriceText;
window.USD_RATE        = USD_RATE;

// ✅ دالة fetch معدّلة لإرسال التوكن تلقائياً + تحويل الـ URL
window.fetch = (resource, options = {}) => {
    // تجهيز options و headers
    options = options || {};
    options.headers = options.headers || {};

    // استخدام sessionStorage للحماية من التداخل بين التابات
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
        const cleanToken = token.replace(/^["']|["']$/g, '').trim();
        options.headers['Authorization'] = `Bearer ${cleanToken}`;
    }

    // تحويل الـ URL من نسبي لمطلق
    let url = resource;
    if (typeof resource === 'string') {
        if (resource.startsWith('../api/')) {
            url = API_BASE + resource.slice('../api'.length);
        } else if (resource.startsWith('/api/')) {
            url = API_BASE + resource.slice('/api'.length);
        } else if (resource.startsWith('api/')) {
            url = API_BASE + '/' + resource.slice('api/'.length);
        }
    }

    return nativeFetch(url, options);
};

// =================== STORAGE HELPERS ===================
const Storage = {
    set: (key, val) => {
        if (key === AUTH_USER_KEY) {
            sessionStorage.setItem(key, JSON.stringify(val));
        } else if (key === AUTH_TOKEN_KEY) {
            sessionStorage.setItem(key, String(val));
        } else {
            localStorage.setItem(key, JSON.stringify(val));
        }
    },
    get: (key) => {
        try {
            if (key === AUTH_USER_KEY) {
                return JSON.parse(sessionStorage.getItem(key));
            }
            if (key === AUTH_TOKEN_KEY) {
                return sessionStorage.getItem(key);
            }
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            return null;
        }
    },
    remove: (key) => {
        if (key === AUTH_USER_KEY || key === AUTH_TOKEN_KEY) {
            sessionStorage.removeItem(key);
        } else {
            localStorage.removeItem(key);
        }
    },
    // ✅ مساعدات للتوكن
    getToken: () => {
        const t = sessionStorage.getItem(AUTH_TOKEN_KEY);
        if (!t || t === 'null' || t === 'undefined') return null;
        return t.replace(/^['"]|['"]$/g, '').trim();
    },
    setToken: (token) => {
        if (token) sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    }
};

// =================== USER TYPE SELECTION ===================
function selectUserType(type) {
    if (type === 'tourist') {
        window.location.href = 'login.html?type=tourist';
    } else if (type === 'company') {
        window.location.href = 'company-register.html';
    }
}

// =================== TOAST NOTIFICATION ===================
function showToast(message, type = 'success') {
    // إزالة أي toast قديم
    const oldToasts = document.querySelectorAll('.toast-msg');
    oldToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast-msg toast-${type}`;
    const iconMap = { 
        success: 'check-circle', 
        error: 'exclamation-circle', 
        warning: 'exclamation-triangle', 
        info: 'info-circle' 
    };
    const icon = iconMap[type] || 'info-circle';
    const iconEl = document.createElement('i');
    iconEl.className = `fas fa-${icon}`;
    toast.appendChild(iconEl);
    toast.appendChild(document.createTextNode(String(message)));
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// =================== LOGIN HANDLER ===================
async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;
    const rememberMe = form.remember?.checked || false;

    // Validation
    if (!email || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Invalid email format', 'error');
        return;
    }

    const btn = form.querySelector('[type=submit]');
    if (btn) {
        btn.dataset.originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    }

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, rememberMe })
        });

        const data = await res.json();
        console.log('📥 Login response:', { status: res.status, data });

        if (res.ok) {
            if (!data.token) {
                console.error('❌ No token in response!');
                showToast('Server error: No token received', 'error');
                if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText; }
                return;
            }

            // ✅ تخزين البيانات بشكل صحيح - في sessionStorage و localStorage للـ admin
            Storage.set('travelnow-user', { ...data.user, token: data.token });
            Storage.setToken(data.token);
            // Persist admin session across tabs/refreshes
            if (data.user.role === 'admin') {
                localStorage.setItem('travelnow-user', JSON.stringify({ ...data.user, token: data.token }));
                localStorage.setItem('travelnow-token', data.token);
            }
            
            console.log('✅ Token saved:', Storage.getToken());
            console.log('✅ User saved:', Storage.get('travelnow-user'));

            showToast('Login successful! Redirecting...');
            
            setTimeout(() => {
                const role = data.user.role;
                if (role === 'admin') window.location.href = '../admin/admin.html';
                else if (role === 'company') window.location.href = '../pages/company-dashboard.html';
                else window.location.href = '../pages/dashboard.html';
            }, 900);
        } else {
            showToast(data.message || 'Invalid credentials', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText; }
        }
    } catch (err) {
        console.error('❌ Login error:', err);
        showToast('Unable to reach the server. Please try again.', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText; }
    }
}

// =================== GOOGLE LOGIN HANDLER (✅ معدل) ===================
async function handleGoogleLogin(response) {
    const credential = response.credential;
    console.log('🔐 Google credential received');

    // ✅ المحاولة الأولى: ابعت للـ backend
    try {
        const res = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
        });

        const data = await res.json();
        console.log('📥 Google backend response:', { status: res.status, data });

        if (res.ok && data.token) {
            // ✅ تخزين JWT من الـ backend
            Storage.set('travelnow-user', { ...data.user, token: data.token });
            Storage.setToken(data.token);

            showToast(`Welcome back, ${data.user.fullName || data.user.name}!`);
            setTimeout(() => {
                const role = data.user.role || 'tourist';
                if (role === 'admin') window.location.href = '../admin/admin.html';
                else if (role === 'company') window.location.href = '../pages/company-dashboard.html';
                else window.location.href = '../pages/dashboard.html';
            }, 900);
            return;
        } else {
            console.warn('⚠️ Backend rejected:', data.message);
            showToast(data.message || 'Google Login failed on server', 'error');
            return; // 🛑 Don't fallback if backend actually responded
        }
    } catch (err) {
        console.error('❌ Backend not reachable for Google login:', err);
    }

    // ⚠️ Fallback محلي - فقط لو الـ backend مش شغال
    console.warn('⚠️ Using local fallback for Google login');
    try {
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const googleUser = JSON.parse(jsonPayload);

        const localUserData = {
            fullName: googleUser.name,
            username: googleUser.email.split('@')[0],
            email: googleUser.email,
            role: 'tourist',
            profilePic: googleUser.picture,
            token: credential
        };

        Storage.set('travelnow-user', localUserData);
        Storage.setToken(credential);

        showToast(`Welcome, ${googleUser.name}! (Offline mode)`);
        setTimeout(() => { window.location.href = '../pages/dashboard.html'; }, 900);

    } catch (err) {
        console.error('❌ Google Auth Error:', err);
        showToast('Google authentication failed. Please try email login.', 'error');
    }
}

// =================== REGISTRATION HANDLER ===================
async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        fullName: form.fullName.value.trim(),
        username: form.username.value.trim(),
        email: form.email.value.trim(),
        country: form.country?.value || '',
        phone: form.phone.value.trim(),
        password: form.password.value,
        confirmPassword: form.confirmPassword.value
    };

    if (!data.fullName || !data.username || !data.email || !data.phone || !data.password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        showToast('Invalid email format', 'error');
        return;
    }
    if (data.password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    if (data.password !== data.confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    const btn = form.querySelector('[type=submit]');
    if (btn) {
        btn.dataset.originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    }

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        console.log('📥 Register response:', { status: res.status, result });

        if (res.ok) {
            showToast('Registration successful! Please login.');
            setTimeout(() => window.location.href = 'login.html?type=tourist', 1500);
        } else {
            showToast(result.message || 'Registration failed', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText; }
        }
    } catch (err) {
        console.error('❌ Register error:', err);
        showToast('Unable to reach the server. Please try again.', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText; }
    }
}

// =================== AUTH GUARDS ===================
function requireAuth() {
    const user = Storage.get('travelnow-user');
    const token = Storage.getToken();
    if (!user || !token) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

function requireAdmin() {
    const user = Storage.get('travelnow-user');
    const token = Storage.getToken();
    if (!user || user.role !== 'admin') {
        // Try localStorage fallback before redirecting
        try {
            const lsUser = JSON.parse(localStorage.getItem('travelnow-user'));
            const lsToken = localStorage.getItem('travelnow-token');
            if (lsUser && lsUser.role === 'admin' && lsToken) {
                sessionStorage.setItem('travelnow-user', JSON.stringify(lsUser));
                sessionStorage.setItem('travelnow-token', lsToken);
                return lsUser;
            }
        } catch(_) {}
        window.location.href = '../index.html';
        return null;
    }
    return user;
}

function requireCompany() {
    const user = Storage.get('travelnow-user');
    if (!user || (user.role !== 'company' && user.role !== 'admin')) {
        window.location.href = '../pages/login.html';
        return null;
    }
    return user;
}

function logout() {
    Storage.remove('travelnow-user');
    Storage.remove('travelnow-token');
    window.location.href = '../index.html';
}

// =================== ESCAPING BUTTON (Form Fun) ===================
function initEscapingButton() {
    const form = document.querySelector('form');
    const button = form?.querySelector('[type=submit]');
    if (!form || !button) return;

    button.dataset.originalText = button.innerHTML;
    button.addEventListener('mouseover', () => {
        const requiredFields = Array.from(form.querySelectorAll('[required]'));
        const hasEmptyRequiredField = requiredFields.some(field => !String(field.value || '').trim());
        if (!hasEmptyRequiredField || button.disabled) return;

        const maxX = Math.max(window.innerWidth - button.offsetWidth - 24, 0);
        const maxY = Math.max(window.innerHeight - button.offsetHeight - 24, 0);
        button.style.position = 'fixed';
        button.style.zIndex = '10000';
        button.style.left = `${Math.floor(Math.random() * maxX)}px`;
        button.style.top = `${Math.floor(Math.random() * maxY)}px`;
    });

    form.addEventListener('input', () => {
        const requiredFields = Array.from(form.querySelectorAll('[required]'));
        const hasEmptyRequiredField = requiredFields.some(field => !String(field.value || '').trim());
        if (!hasEmptyRequiredField) {
            button.style.position = '';
            button.style.left = '';
            button.style.top = '';
            button.style.zIndex = '';
        }
    });
}

// =================== TOAST STYLES ===================
const toastCSS = document.createElement('style');
toastCSS.textContent = `
.toast-msg {
    position: fixed;
    top: 24px;
    right: 24px;
    padding: 14px 22px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    z-index: 99999;
    font-weight: 500;
    font-size: 0.92rem;
    transform: translateX(calc(100% + 30px));
    transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
    border-left: 4px solid #28a745;
    color: #1a1a2e;
    max-width: 360px;
    display: flex;
    align-items: center;
    gap: 10px;
}
.toast-msg.toast-error { border-left-color: #dc3545; }
.toast-msg.toast-warning { border-left-color: #ffc107; }
.toast-msg.toast-info { border-left-color: #0dcaf0; }
.toast-msg.show { transform: translateX(0); }
.toast-msg i { font-size: 1rem; color: #28a745; flex-shrink:0; }
.toast-msg.toast-error i { color: #dc3545; }
.toast-msg.toast-warning i { color: #ffc107; }
.toast-msg.toast-info i { color: #0dcaf0; }
@media(max-width:600px) {
    .toast-msg { right:12px; top:12px; left:12px; max-width:none; }
}
`;
document.head.appendChild(toastCSS);

// =================== NAV BUTTONS INIT ===================
document.addEventListener('DOMContentLoaded', () => {
    const user = Storage.get('travelnow-user');
    
    const loginNavBtn = document.getElementById('login-nav-btn');
    if (loginNavBtn) {
        if (user) {
            loginNavBtn.innerHTML = '<i class="fas fa-user"></i> PROFILE';
            if (user.role === 'admin') {
                loginNavBtn.href = 'admin/admin.html';
            } else if (user.role === 'company') {
                loginNavBtn.href = 'pages/company-dashboard.html';
            } else {
                loginNavBtn.href = 'pages/dashboard.html';
            }
        } else {
            loginNavBtn.href = 'pages/user-type.html';
        }
    }

    const heroLoginBtn = document.getElementById('hero-login-btn');
    if (heroLoginBtn) {
        if (user) {
            heroLoginBtn.innerHTML = '<i class="fas fa-tachometer-alt"></i> GO TO DASHBOARD';
            if (user.role === 'admin') {
                heroLoginBtn.href = 'admin/admin.html';
            } else if (user.role === 'company') {
                heroLoginBtn.href = 'pages/company-dashboard.html';
            } else {
                heroLoginBtn.href = 'pages/dashboard.html';
            }
        } else {
            heroLoginBtn.href = 'pages/user-type.html';
        }
    }
});

// =================== EXPOSE GLOBALLY ===================
window.selectUserType = selectUserType;
window.handleLogin = handleLogin;
window.handleGoogleLogin = handleGoogleLogin;
window.handleRegister = handleRegister;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;
window.requireCompany = requireCompany;
window.logout = logout;
window.initEscapingButton = initEscapingButton;
window.showToast = showToast;
window.Storage = Storage;
window.API_BASE = API_BASE;

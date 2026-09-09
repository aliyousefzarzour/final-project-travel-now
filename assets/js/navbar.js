// (function () {
//     // Nav items for regular users
//     const NAV_ITEMS = [
//         { id: 'home',         label: 'Home',         icon: 'fa-home',           path: 'index.html' },
//         { id: 'attractions',  label: 'Attractions',  icon: 'fa-landmark',       path: 'attractions.html' },
//         { id: 'map',          label: 'Map',          icon: 'fa-map-marked-alt', path: 'map.html' },
//         { id: 'companies',    label: 'Companies',    icon: 'fa-building',       path: 'companies.html' },
//         { id: 'trip-planner', label: 'Trip Planner', icon: 'fa-route',          path: 'trip-planner.html' },
//         { id: 'bookings',     label: 'Bookings',     icon: 'fa-calendar-check', path: 'bookings.html', auth: true },
//         { id: 'about',        label: 'About',        icon: 'fa-info-circle',    path: 'about.html' },
//         { id: 'contact',      label: 'Contact',      icon: 'fa-envelope',       path: 'contact.html' }
//     ];

//     // Nav items for company role only
//     const COMPANY_NAV_ITEMS = [
//         { id: 'overview',         label: 'Overview',         icon: 'fa-chart-pie',      path: 'company-dashboard.html' },
//         { id: 'bookings',         label: 'Bookings',         icon: 'fa-calendar-check', path: 'company-bookings.html' },
//         { id: 'my-offers',        label: 'My Offers',        icon: 'fa-tags',           path: 'my-offers.html' },
//         { id: 'posts',            label: 'Posts',            icon: 'fa-bullhorn',       path: 'posts.html' },
//         { id: 'company-profile',  label: 'Company Profile',  icon: 'fa-user-tie',       path: 'company-profile.html' }
//     ];

//     function getPaths() {
//         const inPages = /\/pages\//.test(window.location.pathname);
//         return {
//             root:  inPages ? '../' : '',
//             pages: inPages ? ''    : 'pages/'
//         };
//     }

//     function getUser() {
//         try {
//             if (window.Storage && typeof window.Storage.get === 'function') {
//                 return window.Storage.get('travelnow-user') || null;
//             }
//             return JSON.parse(sessionStorage.getItem('travelnow-user')) || null;
//         } catch (_) {
//             return null;
//         }
//     }

//     function buildNavLinks(activePage, variant) {
//         const { root, pages } = getPaths();
//         const user = getUser();

//         // لو الـ role شركة، بنستخدم لينكات الشركة بس
//         if (user && user.role === 'company') {
//             return COMPANY_NAV_ITEMS.map(item => {
//                 const href   = `${pages}${item.path}`;
//                 const active = item.id === activePage ? ' active' : '';
//                 return `
//                 <li class="nav-item">
//                     <a class="nav-link${active}" href="${href}">
//                         <i class="fas ${item.icon}"></i> ${item.label}
//                     </a>
//                 </li>`;
//             }).join('');
//         }

//         // اليوزر العادي
//         const EXTRA_IDS = ['trip-planner', 'bookings', 'about', 'contact'];
//         const items = variant === 'minimal'
//             ? NAV_ITEMS.filter(item => ['home', 'attractions'].includes(item.id))
//             : NAV_ITEMS.filter(item => !item.auth || user);

//         return items.map(item => {
//             const href    = item.id === 'home'
//                 ? `${root}index.html`
//                 : `${pages}${item.path}`;
//             const active  = item.id === activePage ? ' active' : '';
//             const isExtra = EXTRA_IDS.includes(item.id) ? ' nav-item-extra' : '';
//             return `
//             <li class="nav-item${isExtra}">
//                 <a class="nav-link${active}" href="${href}">
//                     <i class="fas ${item.icon}"></i> ${item.label}
//                 </a>
//             </li>`;
//         }).join('');
//     }

//     function buildAuthButton() {
//         const { pages } = getPaths();
//         const user = getUser();
//         if (user) {
//             const profilePath = user.role === 'company'
//                 ? `${pages}company-dashboard.html`
//                 : user.role === 'admin'
//                     ? '../admin/admin.html'
//                     : `${pages}dashboard.html`;
//             return `<a href="${profilePath}" class="btn btn-gold btn-sm">
//                         <i class="fas fa-user-circle"></i> Profile
//                     </a>`;
//         }
//         return `<a href="${pages}user-type.html" class="btn btn-gold btn-sm">
//                     <i class="fas fa-sign-in-alt"></i> Login
//                 </a>`;
//     }

//     window.initTravelNav = function initTravelNav(options = {}) {
//         const mount = document.getElementById('tn-navbar');
//         if (!mount) return;

//         const { root }    = getPaths();
//         const activePage  = options.activePage || mount.dataset.page    || '';
//         const variant     = options.variant    || mount.dataset.variant || 'full';
//         const extraHtml   = options.extraHtml  || mount.dataset.extraHtml || '';
//         const navLinks    = buildNavLinks(activePage, variant);

//         mount.innerHTML = `
//             <nav class="navbar navbar-expand-lg fixed-top tn-navbar" id="tn-nav-el">
//                 <div class="container">

//                     <!-- FAR LEFT: Brand -->
//                     <a class="navbar-brand" href="${root}index.html">
//                         <i class="fas fa-pyramid"></i> TRAVEL<span>NOW</span>
//                     </a>

//                     <!-- CENTER: Nav links (desktop) + links+actions (mobile) -->
//                     <div class="collapse navbar-collapse" id="tnNavMenu">
//                         <ul class="navbar-nav">
//                             ${navLinks}
//                         </ul>
//                         <!-- Mobile-only actions inside collapse -->
//                         <div class="tn-nav-actions-mobile">
//                             <button id="theme-toggle-mobile" class="theme-toggle" aria-label="Toggle theme" type="button">
//                                 <i class="fas fa-moon"></i>
//                             </button>
//                             ${buildAuthButton()}
//                             ${extraHtml}
//                         </div>
//                     </div>

//                     <!-- FAR RIGHT: Actions (desktop only) -->
//                     <div class="tn-nav-actions">
//                         <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme" type="button">
//                             <i class="fas fa-moon"></i>
//                         </button>
//                         ${buildAuthButton()}
//                         ${extraHtml}
//                     </div>

//                     <!-- Mobile toggler (☰) -->
//                     <button class="navbar-toggler"
//                             type="button"
//                             data-bs-toggle="collapse"
//                             data-bs-target="#tnNavMenu"
//                             aria-controls="tnNavMenu"
//                             aria-expanded="false"
//                             aria-label="Toggle navigation">
//                         <span class="navbar-toggler-icon">
//                             <span></span>
//                         </span>
//                     </button>

//                 </div>
//             </nav>
//         `;

//         // Body class for offset
//         document.body.classList.add('has-tn-navbar');

//         // Scroll shadow effect
//         const navEl = document.getElementById('tn-nav-el');
//         if (navEl) {
//             const onScroll = () => {
//                 navEl.classList.toggle('scrolled', window.scrollY > 20);
//             };
//             window.addEventListener('scroll', onScroll, { passive: true });
//             onScroll();
//         }

//         // Close mobile menu on nav-link click
//         const collapse = document.getElementById('tnNavMenu');
//         if (collapse) {
//             collapse.querySelectorAll('.nav-link').forEach(link => {
//                 link.addEventListener('click', () => {
//                     if (collapse.classList.contains('show')) {
//                         const bsCollapse = bootstrap.Collapse.getInstance(collapse);
//                         if (bsCollapse) bsCollapse.hide();
//                     }
//                 });
//             });
//         }

//         // Init theme toggle
//         if (typeof window.initThemeToggle === 'function') {
//             window.initThemeToggle();
//         }
//         const mobileToggle = document.getElementById('theme-toggle-mobile');
//         if (mobileToggle) {
//             mobileToggle.addEventListener('click', () => {
//                 const desktopToggle = document.getElementById('theme-toggle');
//                 if (desktopToggle) desktopToggle.click();
//             });
//         }
//     };

//     document.addEventListener('DOMContentLoaded', () => {
//         if (document.getElementById('tn-navbar')) {
//             initTravelNav();
//         }
//         injectHistoryNav();
//     });

//     function injectHistoryNav() {
//         if (document.getElementById('tn-history-nav')) return;

//         const wrap = document.createElement('div');
//         wrap.id = 'tn-history-nav';
//         wrap.setAttribute('aria-label', 'Page navigation');
//         wrap.innerHTML = `
//             <button id="tn-nav-back" class="tn-hist-btn" title="Go back" aria-label="Go back" disabled>
//                 <i class="fas fa-chevron-left"></i>
//             </button>
//             <button id="tn-nav-fwd" class="tn-hist-btn" title="Go forward" aria-label="Go forward" disabled>
//                 <i class="fas fa-chevron-right"></i>
//             </button>
//         `;
//         document.body.appendChild(wrap);

//         const backBtn = document.getElementById('tn-nav-back');
//         const fwdBtn  = document.getElementById('tn-nav-fwd');

//         backBtn.addEventListener('click', () => {
//             history.back();
//             setTimeout(() => { fwdBtn.disabled = false; }, 150);
//         });

//         fwdBtn.addEventListener('click', () => {
//             history.forward();
//         });

//         if (history.length > 1) backBtn.disabled = false;

//         window.addEventListener('popstate', () => {
//             backBtn.disabled = false;
//             fwdBtn.disabled  = false;
//         });
//     }
// })();






(function () {
    // Nav items for regular users
    const NAV_ITEMS = [
        { id: 'home',         label: 'Home',         icon: 'fa-home',           path: 'index.html' },
        { id: 'attractions',  label: 'Attractions',  icon: 'fa-landmark',       path: 'attractions.html' },
        { id: 'map',          label: 'Map',          icon: 'fa-map-marked-alt', path: 'map.html' },
        { id: 'companies',    label: 'Companies',    icon: 'fa-building',       path: 'companies.html' },
        { id: 'trip-planner', label: '🗺️ Yala Plan', icon: 'fa-map-marked-alt', path: 'trip-planner.html' },
        { id: 'bookings',     label: 'Bookings',     icon: 'fa-calendar-check', path: 'bookings.html', auth: true },
        { id: 'about',        label: 'About',        icon: 'fa-info-circle',    path: 'about.html' },
        { id: 'contact',      label: 'Contact',      icon: 'fa-envelope',       path: 'contact.html' }
    ];

    // Nav items for company role only
    const COMPANY_NAV_ITEMS = [
        { id: 'overview',   label: 'Company Profile', icon: 'fa-chart-pie',      path: 'company-dashboard.html' },
        { id: 'bookings',   label: 'Bookings',        icon: 'fa-calendar-check', path: 'company-dashboard.html#bookings' },
        { id: 'my-offers',  label: 'My Offers',       icon: 'fa-tags',           path: 'company-dashboard.html#offers' }
    ];

    function getPaths() {
        const inPages = /\/pages\//.test(window.location.pathname);
        return {
            root:  inPages ? '../' : '',
            pages: inPages ? ''    : 'pages/'
        };
    }

    function getUser() {
        try {
            if (window.Storage && typeof window.Storage.get === 'function') {
                return window.Storage.get('travelnow-user') || null;
            }
            return JSON.parse(sessionStorage.getItem('travelnow-user')) || null;
        } catch (_) {
            return null;
        }
    }

    function buildNavLinks(activePage, variant) {
        const { root, pages } = getPaths();
        const user = getUser();

        // لو الـ role شركة، بنستخدم لينكات الشركة بس
        if (user && user.role === 'company') {
            return COMPANY_NAV_ITEMS.map(item => {
                const href   = `${pages}${item.path}`;
                const active = item.id === activePage ? ' active' : '';
                return `
                <li class="nav-item">
                    <a class="nav-link${active}" href="${href}">
                        <i class="fas ${item.icon}"></i> ${item.label}
                    </a>
                </li>`;
            }).join('');
        }

        // اليوزر العادي
        const EXTRA_IDS = ['trip-planner', 'bookings', 'about', 'contact'];
        const items = variant === 'minimal'
            ? NAV_ITEMS.filter(item => ['home', 'attractions'].includes(item.id))
            : NAV_ITEMS.filter(item => !item.auth || user);

        return items.map(item => {
            const href    = item.id === 'home'
                ? `${root}index.html`
                : `${pages}${item.path}`;
            const active  = item.id === activePage ? ' active' : '';
            const isExtra = EXTRA_IDS.includes(item.id) ? ' nav-item-extra' : '';
            return `
            <li class="nav-item${isExtra}">
                <a class="nav-link${active}" href="${href}">
                    <i class="fas ${item.icon}"></i> ${item.label}
                </a>
            </li>`;
        }).join('');
    }

    function buildAuthButton() {
        const { pages } = getPaths();
        const user = getUser();
        if (user) {
            const profilePath = user.role === 'company'
                ? `${pages}company-dashboard.html`
                : user.role === 'admin'
                    ? '../admin/admin.html'
                    : `${pages}dashboard.html`;
            return `<a href="${profilePath}" class="btn btn-gold btn-sm">
                        <i class="fas fa-user-circle"></i> Profile
                    </a>`;
        }
        return `<a href="${pages}user-type.html" class="btn btn-gold btn-sm">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>`;
    }

    window.initTravelNav = function initTravelNav(options = {}) {
        const mount = document.getElementById('tn-navbar');
        if (!mount) return;

        const { root }    = getPaths();
        const activePage  = options.activePage || mount.dataset.page    || '';
        const variant     = options.variant    || mount.dataset.variant || 'full';
        const extraHtml   = options.extraHtml  || mount.dataset.extraHtml || '';
        const navLinks    = buildNavLinks(activePage, variant);

        mount.innerHTML = `
            <nav class="navbar navbar-expand-lg fixed-top tn-navbar" id="tn-nav-el">
                <div class="container">

                    <!-- FAR LEFT: Brand -->
                    <a class="navbar-brand" href="${root}index.html">
                        <i class="fas fa-pyramid"></i> TRAVEL<span>NOW</span>
                    </a>

                    <!-- CENTER: Nav links (desktop) + links+actions (mobile) -->
                    <div class="collapse navbar-collapse" id="tnNavMenu">
                        <ul class="navbar-nav">
                            ${navLinks}
                        </ul>
                        <!-- Mobile-only actions inside collapse -->
                        <div class="tn-nav-actions-mobile">
                            <button id="theme-toggle-mobile" class="theme-toggle" aria-label="Toggle theme" type="button">
                                <i class="fas fa-moon"></i>
                            </button>
                            ${buildAuthButton()}
                            ${extraHtml}
                        </div>
                    </div>

                    <!-- FAR RIGHT: Actions (desktop only) -->
                    <div class="tn-nav-actions">
                        <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme" type="button">
                            <i class="fas fa-moon"></i>
                        </button>
                        ${buildAuthButton()}
                        ${extraHtml}
                    </div>

                    <!-- Mobile toggler (☰) -->
                    <button class="navbar-toggler"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#tnNavMenu"
                            aria-controls="tnNavMenu"
                            aria-expanded="false"
                            aria-label="Toggle navigation">
                        <span class="navbar-toggler-icon">
                            <span></span>
                        </span>
                    </button>

                </div>
            </nav>
        `;

        // Body class for offset
        document.body.classList.add('has-tn-navbar');

        // Scroll shadow effect
        const navEl = document.getElementById('tn-nav-el');
        if (navEl) {
            const onScroll = () => {
                navEl.classList.toggle('scrolled', window.scrollY > 20);
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        }

        // Close mobile menu on nav-link click
        const collapse = document.getElementById('tnNavMenu');
        if (collapse) {
            collapse.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    if (collapse.classList.contains('show')) {
                        const bsCollapse = bootstrap.Collapse.getInstance(collapse);
                        if (bsCollapse) bsCollapse.hide();
                    }
                });
            });
        }

        // Init theme toggle
        if (typeof window.initThemeToggle === 'function') {
            window.initThemeToggle();
        }
        const mobileToggle = document.getElementById('theme-toggle-mobile');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                const desktopToggle = document.getElementById('theme-toggle');
                if (desktopToggle) desktopToggle.click();
            });
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('tn-navbar')) {
            initTravelNav();
        }
        injectHistoryNav();
    });

    function injectHistoryNav() {
        if (document.getElementById('tn-history-nav')) return;

        const wrap = document.createElement('div');
        wrap.id = 'tn-history-nav';
        wrap.setAttribute('aria-label', 'Page navigation');
        wrap.innerHTML = `
            <button id="tn-nav-back" class="tn-hist-btn" title="Go back" aria-label="Go back" disabled>
                <i class="fas fa-chevron-left"></i>
            </button>
            <button id="tn-nav-fwd" class="tn-hist-btn" title="Go forward" aria-label="Go forward" disabled>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        document.body.appendChild(wrap);

        const backBtn = document.getElementById('tn-nav-back');
        const fwdBtn  = document.getElementById('tn-nav-fwd');

        backBtn.addEventListener('click', () => {
            history.back();
            setTimeout(() => { fwdBtn.disabled = false; }, 150);
        });

        fwdBtn.addEventListener('click', () => {
            history.forward();
        });

        if (history.length > 1) backBtn.disabled = false;

        window.addEventListener('popstate', () => {
            backBtn.disabled = false;
            fwdBtn.disabled  = false;
        });
    }
})();
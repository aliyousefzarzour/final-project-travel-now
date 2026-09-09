// =================== LANDING PAGE LOGIC ===================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Swiper
    if (typeof Swiper !== 'undefined') {
        const swiper = new Swiper('.mySwiper', {
            loop: true,
            autoplay: { delay: 5000, disableOnInteraction: false },
            effect: 'fade',
            fadeEffect: { crossFade: true },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' }
        });

        const nextBtn = document.querySelector('.swiper-button-next');
        const prevBtn = document.querySelector('.swiper-button-prev');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => swiper.slideNext());
        }
        if (prevBtn) {
            prevBtn.addEventListener('click', () => swiper.slidePrev());
        }
    }

    // Navbar scroll effect
    const navbar = document.getElementById('main-navbar');
    if (navbar) {
        const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    // Close mobile menu when a nav link is clicked
    const navMenu   = document.getElementById('navMenu');
    const toggler   = document.querySelector('#main-navbar .navbar-toggler');
    if (navMenu) {
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (navMenu.classList.contains('show')) {
                    const bsCollapse = bootstrap.Collapse.getInstance(navMenu);
                    if (bsCollapse) bsCollapse.hide();
                }
            });
        });
    }

    // Login buttons - now use direct href to user-type.html (no event listener needed)

    // Mobile theme toggle mirrors desktop
    const mobileToggle = document.getElementById('theme-toggle-mobile');
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            const desktopToggle = document.getElementById('theme-toggle');
            if (desktopToggle) desktopToggle.click();
        });
    }
});

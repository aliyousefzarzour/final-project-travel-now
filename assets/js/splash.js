
(function() {
    const splashScreen = document.getElementById('splash-screen');
    const splashVideo = document.getElementById('splash-video');
    const landingPage = document.getElementById('landing-page');
    const splashLoader = document.getElementById('splash-loader');
    const countdownEl = document.getElementById('countdown');
    const countdownNum = document.getElementById('countdown-number');
    const skipBtn = document.getElementById('skip-btn');

    if (localStorage.getItem('splashSeen')) {
        if (splashScreen) splashScreen.style.display = 'none';
        if (landingPage) landingPage.style.display = 'block';
        if (typeof AOS !== 'undefined') {
            AOS.init({ duration: 1000, once: true });
        }
        return;
    }

    let countdownValue = 5;
    let countdownInterval;
    let navigated = false;

    if (splashVideo) {
        const playPromise = splashVideo.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                console.log('Autoplay blocked, using fallback');
            });
        }

        splashVideo.addEventListener('ended', () => {
            navigateToLanding();
        });
    }

    setTimeout(() => {
        if (splashLoader) splashLoader.style.display = 'none';
        if (countdownEl) countdownEl.style.display = 'block';
        if (skipBtn) skipBtn.style.display = 'inline-block';

        countdownInterval = setInterval(() => {
            countdownValue--;
            if (countdownNum) countdownNum.textContent = countdownValue;
            if (countdownValue <= 0) {
                clearInterval(countdownInterval);
                navigateToLanding();
            }
        }, 1000);
    }, 5000);

    if (skipBtn) {
        skipBtn.addEventListener('click', navigateToLanding);
    }

    function navigateToLanding() {
        if (navigated) return;
        navigated = true;
        if (countdownInterval) clearInterval(countdownInterval);

        localStorage.setItem('splashSeen', 'true');

        if (splashScreen) splashScreen.classList.add('fade-out');
        setTimeout(() => {
            splashScreen.style.display = 'none';
            landingPage.style.display = 'block';
            if (typeof AOS !== 'undefined') {
                AOS.init({ duration: 1000, once: true });
            }
        }, 1000);
    }
})();

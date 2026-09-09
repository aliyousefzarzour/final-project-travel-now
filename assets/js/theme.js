(function() {
    const savedTheme = localStorage.getItem('travelnow-theme') || 'light';

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    function bindThemeToggle(themeToggle) {
        if (!themeToggle || themeToggle.dataset.bound === 'true') return;
        themeToggle.dataset.bound = 'true';

        const icon = themeToggle.querySelector('i');
        if (savedTheme === 'dark' && icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');

            if (icon) {
                if (isDark) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
            }

            localStorage.setItem('travelnow-theme', isDark ? 'dark' : 'light');
            document.dispatchEvent(new CustomEvent('travelnow-theme-changed', {
                detail: { theme: isDark ? 'dark' : 'light' }
            }));
        });
    }

    window.initThemeToggle = function initThemeToggle() {
        bindThemeToggle(document.getElementById('theme-toggle'));
    };

    document.addEventListener('DOMContentLoaded', () => {
        initThemeToggle();
    });
})();

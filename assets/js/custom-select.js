/**
 * TravelNow — Custom Select Dropdown
 * Automatically replaces all <select class="form-select"> elements
 * with a fully styled custom dropdown that works in both light & dark mode.
 *
 * Usage: just include this script after the page loads.
 * The real <select> is kept hidden so form submission still works.
 */

(function () {
    'use strict';

    const ARROW_SVG = `<svg class="tn-select-arrow" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>`;

    /**
     * Build a custom select around one native <select> element.
     * @param {HTMLSelectElement} select
     */
    function buildCustomSelect(select) {
        // Skip if already enhanced or inside a tn-select-wrapper
        if (select.closest('.tn-select-wrapper')) return;

        // ── Create wrapper ──
        const wrapper = document.createElement('div');
        wrapper.className = 'tn-select-wrapper';

        // Insert wrapper before select, then move select inside
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        select.classList.add('tn-select-hidden');

        // ── Trigger button ──
        const trigger = document.createElement('div');
        trigger.className = 'tn-select-trigger';
        trigger.setAttribute('role', 'combobox');
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('tabindex', '0');

        const triggerText = document.createElement('span');
        triggerText.className = 'tn-select-text';

        trigger.appendChild(triggerText);
        trigger.insertAdjacentHTML('beforeend', ARROW_SVG);
        wrapper.appendChild(trigger);

        // ── Dropdown panel ──
        const dropdown = document.createElement('div');
        dropdown.className = 'tn-select-dropdown';
        dropdown.setAttribute('role', 'listbox');
        wrapper.appendChild(dropdown);

        // ── Populate options ──
        function rebuildOptions() {
            dropdown.innerHTML = '';
            Array.from(select.options).forEach((opt, idx) => {
                const item = document.createElement('div');
                item.className = 'tn-select-option';
                item.setAttribute('role', 'option');
                item.dataset.value = opt.value;
                item.dataset.index = idx;
                item.textContent = opt.text;

                if (opt.selected) {
                    item.classList.add('selected');
                    triggerText.textContent = opt.text;
                }

                item.addEventListener('click', function (e) {
                    e.stopPropagation();
                    selectOption(idx);
                    closeDropdown();
                });

                dropdown.appendChild(item);
            });

            // If nothing selected, show first option text
            if (!triggerText.textContent) {
                triggerText.textContent = select.options[0]?.text || '';
            }
        }

        function selectOption(idx) {
            select.selectedIndex = idx;
            // Sync UI
            Array.from(dropdown.querySelectorAll('.tn-select-option')).forEach((el, i) => {
                el.classList.toggle('selected', i === idx);
            });
            triggerText.textContent = select.options[idx]?.text || '';
            trigger.setAttribute('aria-expanded', 'false');

            // Fire change event on the real select so JS listeners (e.g. filter functions) still work
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function openDropdown() {
            // Close any other open dropdowns first
            document.querySelectorAll('.tn-select-dropdown.open').forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove('open');
                    d.closest('.tn-select-wrapper')?.querySelector('.tn-select-trigger')?.classList.remove('open');
                }
            });
            dropdown.classList.add('open');
            trigger.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
        }

        function closeDropdown() {
            dropdown.classList.remove('open');
            trigger.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        function toggleDropdown() {
            dropdown.classList.contains('open') ? closeDropdown() : openDropdown();
        }

        // ── Events ──
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleDropdown();
        });

        // Keyboard navigation
        trigger.addEventListener('keydown', function (e) {
            const currentIdx = select.selectedIndex;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDropdown();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = Math.min(currentIdx + 1, select.options.length - 1);
                selectOption(next);
                if (!dropdown.classList.contains('open')) openDropdown();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = Math.max(currentIdx - 1, 0);
                selectOption(prev);
            } else if (e.key === 'Escape') {
                closeDropdown();
            } else if (e.key === 'Tab') {
                closeDropdown();
            }
        });

        // When the real select changes programmatically, sync the custom UI
        select.addEventListener('change', function () {
            const idx = select.selectedIndex;
            Array.from(dropdown.querySelectorAll('.tn-select-option')).forEach((el, i) => {
                el.classList.toggle('selected', i === idx);
            });
            triggerText.textContent = select.options[idx]?.text || '';
        });

        rebuildOptions();

        // Observe option changes (e.g. dynamically added options)
        const observer = new MutationObserver(rebuildOptions);
        observer.observe(select, { childList: true, subtree: true });
    }

    /**
     * Initialise all form-select elements in the document.
     */
    function initAll() {
        document.querySelectorAll('select.form-select').forEach(buildCustomSelect);
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

    // Also handle selects added dynamically (e.g. inside modals)
    const bodyObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
                if (node.nodeType !== 1) return;
                if (node.matches('select.form-select')) {
                    buildCustomSelect(node);
                }
                node.querySelectorAll?.('select.form-select').forEach(buildCustomSelect);
            });
        });
    });

    document.addEventListener('DOMContentLoaded', function () {
        bodyObserver.observe(document.body, { childList: true, subtree: true });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function () {
        document.querySelectorAll('.tn-select-dropdown.open').forEach(d => {
            d.classList.remove('open');
            d.closest('.tn-select-wrapper')?.querySelector('.tn-select-trigger')?.classList.remove('open');
        });
    });

    // Expose for manual use if needed
    window.TnSelect = { init: initAll, build: buildCustomSelect };
})();

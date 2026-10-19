/**
 * TravelNow - SOS Emergency Assistance
 * 
 * Official Egyptian Emergency Contacts
 * Sources verified from:
 * - US Embassy Egypt: https://eg.usembassy.gov/services/emergency-contact-information-for-u-s-citizens/
 * - UK Foreign Travel Advice: https://www.gov.uk/foreign-travel-advice/egypt
 * - expatfocus.com: https://www.expatfocus.com/egypt/guide/egypt-emergencies
 * - Egyptian Streets: https://egyptianstreets.com/2022/11/01/112-egypt-announces-its-very-own-911-hotline
 * 
 * Last verified: October 2026
 */

(function() {
    'use strict';

    // Official Egyptian Emergency Contacts
    const EMERGENCY_CONTACTS = [
        {
            id: 'unified-emergency',
            name: 'Unified Emergency',
            phone: '112',
            category: 'police',
            icon: 'fa-phone-volume',
            description: 'Egypt\'s unified emergency number connecting to all emergency services including police, ambulance, fire, and road assistance. Available 24/7 from any phone.',
            verified: true,
            source: 'Egyptian Government - National Emergency Network'
        },
        {
            id: 'tourist-police',
            name: 'Tourist Police',
            phone: '126',
            category: 'tourism',
            icon: 'fa-user-shield',
            description: 'Specialized police unit for tourist assistance, safety concerns, reporting crimes, and emergencies specifically affecting tourists in Egypt.',
            verified: true,
            source: 'US Embassy Egypt, UK Foreign Office'
        },
        {
            id: 'ambulance',
            name: 'Ambulance',
            phone: '123',
            category: 'medical',
            icon: 'fa-ambulance',
            description: 'Emergency medical services and ambulance dispatch for medical emergencies, urgent medical assistance, and hospital transport.',
            verified: true,
            source: 'US Embassy Egypt, Egyptian Emergency Services'
        },
        {
            id: 'police',
            name: 'Police Emergency',
            phone: '122',
            category: 'police',
            icon: 'fa-shield-alt',
            description: 'General police emergency hotline for reporting crimes, security threats, and requesting immediate police assistance.',
            verified: true,
            source: 'US Embassy Egypt, Egyptian Police'
        },
        {
            id: 'fire',
            name: 'Fire Department',
            phone: '180',
            category: 'fire',
            icon: 'fa-fire-extinguisher',
            description: 'Fire emergency services and civil protection for fires, building emergencies, rescue operations, and hazardous situations.',
            verified: true,
            source: 'Egyptian Civil Protection Authority'
        },
        {
            id: 'traffic-police',
            name: 'Traffic Police',
            phone: '128',
            category: 'police',
            icon: 'fa-traffic-light',
            description: 'Traffic police hotline for reporting traffic accidents, road hazards, and traffic-related emergencies.',
            verified: true,
            source: 'Egyptian Traffic Authority'
        },
        {
            id: 'electricity',
            name: 'Electricity Emergency',
            phone: '121',
            category: 'utility',
            icon: 'fa-bolt',
            description: 'Emergency hotline for electrical hazards, power outages, damaged power lines, and urgent electricity-related issues.',
            verified: true,
            source: 'Egyptian Electricity Holding Company'
        },
        {
            id: 'gas',
            name: 'Gas Emergency',
            phone: '129',
            category: 'utility',
            icon: 'fa-fire',
            description: 'Natural gas emergency hotline for gas leaks, suspected gas hazards, and urgent gas-related safety concerns.',
            verified: true,
            source: 'Egyptian Natural Gas Holding Company'
        },
        {
            id: 'consumer-protection',
            name: 'Consumer Protection',
            phone: '19588',
            category: 'consumer',
            icon: 'fa-balance-scale',
            description: 'Consumer protection hotline for reporting fraud, scams, unfair business practices, and consumer rights violations.',
            verified: true,
            source: 'Egyptian Consumer Protection Agency'
        }
    ];

    // Category configuration
    const CATEGORIES = {
        medical: { label: 'Medical', color: '#28a745' },
        police: { label: 'Police & Safety', color: '#007bff' },
        fire: { label: 'Fire & Rescue', color: '#fd7e14' },
        tourism: { label: 'Tourism Assistance', color: '#d4af37' },
        utility: { label: 'Public Utilities', color: '#6c757d' },
        consumer: { label: 'Consumer Protection', color: '#20c997' }
    };

    // State
    let modalOpen = false;
    let searchQuery = '';

    // Initialize SOS Emergency feature
    function initSOSEmergency() {
        // Don't initialize on pages that shouldn't have SOS (like admin panel)
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath.includes('/admin/') || currentPath.includes('admin.html')) {
            return;
        }

        createFloatingButton();
        createModal();
        attachEventListeners();
    }

    // Create floating SOS button
    function createFloatingButton() {
        const existingBtn = document.getElementById('sos-emergency-btn');
        if (existingBtn) return; // Already created

        const btn = document.createElement('button');
        btn.id = 'sos-emergency-btn';
        btn.className = 'sos-emergency-btn';
        btn.setAttribute('aria-label', 'Open emergency assistance');
        btn.setAttribute('title', 'Emergency Assistance');
        btn.innerHTML = `
            <i class="fas fa-phone-volume"></i>
            <span>SOS</span>
        `;

        document.body.appendChild(btn);
    }

    // Create modal structure
    function createModal() {
        const existingModal = document.getElementById('sos-modal');
        if (existingModal) return; // Already created

        // Backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'sos-modal-backdrop';
        backdrop.className = 'sos-modal-backdrop';

        // Modal
        const modal = document.createElement('div');
        modal.id = 'sos-modal';
        modal.className = 'sos-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'sos-modal-title');
        modal.setAttribute('aria-modal', 'true');

        modal.innerHTML = `
            <div class="sos-modal-dialog">
                <div class="sos-modal-content">
                    <div class="sos-modal-header">
                        <button class="sos-modal-close" id="sos-modal-close" aria-label="Close emergency assistance">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="sos-modal-header-content">
                            <div class="sos-modal-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="sos-modal-title-group">
                                <h2 class="sos-modal-title" id="sos-modal-title">Emergency Assistance</h2>
                                <p class="sos-modal-subtitle">Important emergency contacts for your safety in Egypt</p>
                            </div>
                        </div>
                    </div>
                    <div class="sos-modal-body">
                        <div class="sos-search-bar">
                            <i class="fas fa-search sos-search-icon"></i>
                            <input 
                                type="text" 
                                class="sos-search-input" 
                                id="sos-search-input"
                                placeholder="Search emergency services..."
                                aria-label="Search emergency services"
                            >
                        </div>
                        <div class="sos-contacts-grid" id="sos-contacts-grid">
                            <!-- Contacts will be rendered here -->
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(modal);

        renderContacts();
    }

    // Render emergency contact cards
    function renderContacts(filter = '') {
        const grid = document.getElementById('sos-contacts-grid');
        if (!grid) return;

        const filteredContacts = EMERGENCY_CONTACTS.filter(contact => {
            if (!filter) return true;
            const searchLower = filter.toLowerCase();
            return (
                contact.name.toLowerCase().includes(searchLower) ||
                contact.description.toLowerCase().includes(searchLower) ||
                contact.phone.includes(searchLower) ||
                CATEGORIES[contact.category].label.toLowerCase().includes(searchLower)
            );
        });

        if (filteredContacts.length === 0) {
            grid.innerHTML = `
                <div class="sos-no-results">
                    <i class="fas fa-search"></i>
                    <p>No emergency services found matching "${filter}"</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filteredContacts.map(contact => {
            const categoryLabel = CATEGORIES[contact.category].label;
            return `
                <div class="sos-contact-card" data-category="${contact.category}">
                    <div class="sos-contact-icon sos-icon-${contact.category}">
                        <i class="fas ${contact.icon}"></i>
                    </div>
                    <div class="sos-contact-info">
                        <h3 class="sos-contact-name">
                            ${contact.name}
                            <span style="font-size: 0.7rem; font-weight: 500; opacity: 0.7;">(${categoryLabel})</span>
                        </h3>
                        <div class="sos-contact-phone">${contact.phone}</div>
                        <p class="sos-contact-desc">${contact.description}</p>
                        <a href="tel:${contact.phone}" class="sos-call-btn">
                            <i class="fas fa-phone"></i>
                            Call Now
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Attach event listeners
    function attachEventListeners() {
        // Open modal
        document.addEventListener('click', function(e) {
            if (e.target.closest('#sos-emergency-btn')) {
                openModal();
            }
        });

        // Close modal
        document.addEventListener('click', function(e) {
            const closeBtn = e.target.closest('#sos-modal-close');
            const backdrop = e.target.closest('#sos-modal-backdrop');
            
            if (closeBtn || backdrop) {
                closeModal();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modalOpen) {
                closeModal();
            }
        });

        // Search functionality
        document.addEventListener('input', function(e) {
            if (e.target.id === 'sos-search-input') {
                searchQuery = e.target.value;
                renderContacts(searchQuery);
            }
        });

        // Prevent modal close when clicking inside modal content
        document.addEventListener('click', function(e) {
            if (e.target.closest('.sos-modal-content')) {
                e.stopPropagation();
            }
        });
    }

    // Open modal
    function openModal() {
        const modal = document.getElementById('sos-modal');
        const backdrop = document.getElementById('sos-modal-backdrop');
        
        if (!modal || !backdrop) return;

        modalOpen = true;
        backdrop.classList.add('show');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Focus management
        const searchInput = document.getElementById('sos-search-input');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }

        // Announce to screen readers
        modal.setAttribute('aria-hidden', 'false');
    }

    // Close modal
    function closeModal() {
        const modal = document.getElementById('sos-modal');
        const backdrop = document.getElementById('sos-modal-backdrop');
        
        if (!modal || !backdrop) return;

        modalOpen = false;
        backdrop.classList.remove('show');
        modal.classList.remove('show');
        document.body.style.overflow = '';

        // Clear search
        const searchInput = document.getElementById('sos-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchQuery = '';
            renderContacts();
        }

        // Focus management - return focus to SOS button
        const sosBtn = document.getElementById('sos-emergency-btn');
        if (sosBtn) {
            sosBtn.focus();
        }

        modal.setAttribute('aria-hidden', 'true');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSOSEmergency);
    } else {
        initSOSEmergency();
    }

    // Expose public API
    window.TravelNowSOS = {
        open: openModal,
        close: closeModal,
        getContacts: () => EMERGENCY_CONTACTS,
        version: '1.0.0'
    };

})();

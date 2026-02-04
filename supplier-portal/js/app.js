// WeDealize Supplier Portal - Main Entry Point
// Application initialization and module orchestration

import Config from './config.js';
import store from './core/store.js';
import router from './core/router.js';
import eventBus, { Events } from './core/eventBus.js';

// Services
import api from './services/api.js';
import authService from './services/auth.js';
import productService from './services/product.js';
import poService from './services/po.js';

// Components
import toast from './components/toast.js';
import modal from './components/modal.js';

// Modules
import authModule from './modules/auth.js';
import catalogModule from './modules/catalog.js';
import productModule from './modules/product.js';
import salesModule from './modules/sales.js';

// Utils
import { delay } from './utils/format.js';
import { $, $$, show, hide } from './utils/dom.js';

/**
 * WeDealize Supplier Portal Application
 */
class App {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize application
     */
    async init() {
        if (this.initialized) return;

        console.log('WeDealize Supplier Portal initializing...');

        // Initialize store from localStorage
        store.initFromStorage();

        // Initialize router
        router.init();

        // Initialize modules
        authModule.init();
        catalogModule.init();
        productModule.init();
        salesModule.init();

        // Bind global events
        this.bindGlobalEvents();

        // Set up language switch
        this.initLanguageSwitch();

        // Check initial auth state
        if (store.get('auth.isLoggedIn')) {
            this.loadInitialData();
        }

        this.initialized = true;
        console.log('WeDealize Supplier Portal initialized');
    }

    /**
     * Bind global events
     */
    bindGlobalEvents() {
        // Navigation change handler
        eventBus.on(Events.NAV_CHANGE, ({ section }) => {
            router.navigate(section);
        });

        // Auth events
        eventBus.on(Events.AUTH_LOGIN, () => {
            this.loadInitialData();
        });

        eventBus.on(Events.AUTH_LOGOUT, () => {
            // Clear state
            store.set('products.items', []);
            store.set('po.items', []);
        });
    }

    /**
     * Load initial data after login
     */
    async loadInitialData() {
        try {
            // Load notifications
            await this.loadNotifications();

            // Check data completeness
            await this.checkDataCompleteness();
        } catch (error) {
            console.log('Initial data load error:', error);
        }
    }

    /**
     * Load notifications
     */
    async loadNotifications() {
        const supplierId = store.get('auth.supplierId') || '1';

        try {
            const data = await api.get(`/notifications/${supplierId}`);
            store.set('notifications', {
                items: data.notifications,
                unreadCount: data.unread_count
            });
            this.updateNotificationBadge(data.unread_count);
        } catch (error) {
            console.log('Failed to load notifications');
        }
    }

    /**
     * Update notification badge
     */
    updateNotificationBadge(count) {
        const badge = $('#notification-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    /**
     * Check data completeness
     */
    async checkDataCompleteness() {
        const supplierId = store.get('auth.supplierId') || '1';

        try {
            const data = await api.get(`/data-completeness/${supplierId}`);
            store.set('completeness', data);
            this.updateCompletenessUI(data);
        } catch (error) {
            // Demo data
            const demoData = {
                completeness_score: 65,
                total_products: 24,
                missing_summary: [
                    { type: 'moq', label: 'Minimum Order Quantity', count: 5, priority: 'high', products: ['Aged Parmesan', 'Raw Honey', 'Balsamic Vinegar'] },
                    { type: 'certifications', label: 'Certifications', count: 8, priority: 'medium', products: [] },
                    { type: 'images', label: 'Product Images', count: 12, priority: 'medium', products: [] }
                ],
                recommendations: [
                    'Critical: Please add Minimum Order Quantity for 5 products.',
                    'Adding certifications can increase buyer confidence.'
                ]
            };
            store.set('completeness', demoData);
            this.updateCompletenessUI(demoData);
        }
    }

    /**
     * Update completeness UI
     */
    updateCompletenessUI(data) {
        if (data.completeness_score < 100) {
            this.showDataCompletenessAlert(data);
        }

        const completenessEl = $('#stat-completeness');
        if (completenessEl) {
            completenessEl.textContent = `${data.completeness_score}%`;
        }

        if (data.missing_summary) {
            for (const item of data.missing_summary) {
                const countEl = $(`#missing-${item.type}-count`);
                if (countEl) {
                    countEl.textContent = item.count;
                }
            }
        }
    }

    /**
     * Show data completeness alert
     */
    showDataCompletenessAlert(data) {
        const alert = $('#data-completeness-alert');
        if (!alert) return;

        alert.style.display = 'flex';

        const scoreEl = alert.querySelector('.completeness-score');
        if (scoreEl) {
            scoreEl.textContent = `${data.completeness_score}%`;
        }

        const missingList = alert.querySelector('.missing-list');
        if (missingList && data.missing_summary) {
            missingList.innerHTML = data.missing_summary
                .filter(item => item.count > 0)
                .slice(0, 3)
                .map(item => `
                    <div class="missing-item ${item.priority}">
                        <span class="missing-label">${item.label}</span>
                        <span class="missing-count">${item.count} products</span>
                        <button class="btn-fix" onclick="filterMissing('${item.type}')">Fix</button>
                    </div>
                `).join('');
        }

        const recommendationsEl = alert.querySelector('.recommendations');
        if (recommendationsEl && data.recommendations) {
            recommendationsEl.innerHTML = data.recommendations
                .slice(0, 2)
                .map(rec => `<p class="recommendation">${rec}</p>`)
                .join('');
        }
    }

    /**
     * Dismiss completeness alert
     */
    dismissCompletenessAlert() {
        const alert = $('#data-completeness-alert');
        if (alert) {
            alert.style.display = 'none';
        }
    }

    /**
     * Initialize language switch
     */
    initLanguageSwitch() {
        $$('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                $$('.lang-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const lang = btn.dataset.lang;
                if (lang && typeof setLanguage === 'function') {
                    setLanguage(lang);
                }
            });
        });
    }

    /**
     * Toggle price list section
     */
    togglePriceListSection() {
        const section = $('#pricelist-section');
        const content = $('#pricelist-content');

        if (section && content) {
            section.classList.toggle('expanded');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Show section
     */
    showSection(sectionName) {
        router.navigate(sectionName);
    }

    /**
     * Toggle submenu
     */
    toggleSubmenu(btn) {
        router.toggleSubmenu(btn);
    }
}

// Create app instance
const app = new App();

// Global functions for backward compatibility
window.showSection = (section) => app.showSection(section);
window.toggleSubmenu = (btn) => app.toggleSubmenu(btn);
window.togglePriceListSection = () => app.togglePriceListSection();
window.dismissCompletenessAlert = () => app.dismissCompletenessAlert();
window.showDashboard = () => authModule.showDashboard();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Export for module usage
export default app;

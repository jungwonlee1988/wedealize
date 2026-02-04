// WeDealize Supplier Portal - Router
// SPA navigation management

import eventBus, { Events } from './eventBus.js';
import store from './store.js';

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.beforeHooks = [];
        this.afterHooks = [];
    }

    /**
     * Register a route
     * @param {string} name - Route name (section name)
     * @param {Object} options - Route options
     */
    register(name, options = {}) {
        this.routes.set(name, {
            name,
            panel: options.panel || `panel-${name}`,
            onEnter: options.onEnter,
            onLeave: options.onLeave,
            requiresAuth: options.requiresAuth !== false
        });
    }

    /**
     * Navigate to a section
     * @param {string} sectionName - Section to navigate to
     * @param {Object} params - Optional parameters
     */
    navigate(sectionName, params = {}) {
        const route = this.routes.get(sectionName);

        if (!route) {
            console.warn(`Route not found: ${sectionName}`);
            return false;
        }

        // Check auth requirement
        if (route.requiresAuth && !store.get('auth.isLoggedIn')) {
            console.warn('Authentication required');
            return false;
        }

        // Run before hooks
        for (const hook of this.beforeHooks) {
            if (hook(sectionName, this.currentRoute) === false) {
                return false;
            }
        }

        // Leave current route
        if (this.currentRoute && this.currentRoute.onLeave) {
            this.currentRoute.onLeave();
        }

        // Hide all panels
        document.querySelectorAll('.dashboard-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        // Show target panel
        const targetPanel = document.getElementById(route.panel);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }

        // Update nav button states
        this.updateNavState(sectionName);

        // Enter new route
        if (route.onEnter) {
            route.onEnter(params);
        }

        // Update state
        const previousRoute = this.currentRoute;
        this.currentRoute = route;
        store.set('ui.currentSection', sectionName);

        // Run after hooks
        for (const hook of this.afterHooks) {
            hook(sectionName, previousRoute);
        }

        // Emit event
        eventBus.emit(Events.NAV_CHANGE, { section: sectionName, params });

        return true;
    }

    /**
     * Update navigation button active states
     * @param {string} sectionName - Active section
     */
    updateNavState(sectionName) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');

            if (btn.dataset.section === sectionName) {
                btn.classList.add('active');

                // Expand parent submenu if exists
                const navGroup = btn.closest('.nav-group');
                if (navGroup) {
                    navGroup.classList.add('expanded');
                }
            }
        });
    }

    /**
     * Toggle submenu
     * @param {HTMLElement} parentBtn - Parent nav button
     */
    toggleSubmenu(parentBtn) {
        const navGroup = parentBtn.closest('.nav-group');
        if (navGroup) {
            navGroup.classList.toggle('expanded');
            eventBus.emit(Events.NAV_SUBMENU_TOGGLE, {
                group: navGroup,
                expanded: navGroup.classList.contains('expanded')
            });
        }
    }

    /**
     * Add navigation guard (before hook)
     * @param {Function} hook - Hook function
     */
    beforeEach(hook) {
        this.beforeHooks.push(hook);
    }

    /**
     * Add after navigation hook
     * @param {Function} hook - Hook function
     */
    afterEach(hook) {
        this.afterHooks.push(hook);
    }

    /**
     * Get current route
     * @returns {Object} Current route object
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Initialize router with default routes
     */
    init() {
        // Register default routes
        this.register('dashboard', {
            panel: 'panel-dashboard'
        });

        this.register('catalog-register', {
            panel: 'panel-catalog-register'
        });

        this.register('product-list', {
            panel: 'panel-product-list'
        });

        this.register('po-management', {
            panel: 'panel-po-management'
        });

        this.register('profile', {
            panel: 'panel-profile'
        });

        // Bind nav button clicks
        this.bindNavButtons();
    }

    /**
     * Bind click handlers to nav buttons
     */
    bindNavButtons() {
        document.querySelectorAll('.nav-btn:not(.nav-parent)').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                if (section) {
                    this.navigate(section);
                }
            });
        });

        // Bind parent nav buttons (submenu toggles)
        document.querySelectorAll('.nav-btn.nav-parent').forEach(btn => {
            btn.addEventListener('click', () => {
                this.toggleSubmenu(btn);
            });
        });
    }
}

// Create singleton instance
const router = new Router();

export default router;

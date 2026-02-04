// WeDealize Supplier Portal - State Store
// Centralized state management (inspired by Redux/Vuex)

import eventBus, { Events } from './eventBus.js';
import Config from '../config.js';

class Store {
    constructor() {
        // Initial state
        this.state = {
            // Auth state
            auth: {
                isLoggedIn: false,
                token: null,
                supplierId: null,
                email: null,
                name: null
            },

            // UI state
            ui: {
                currentSection: 'dashboard',
                language: 'en',
                isLoading: false
            },

            // Product state
            products: {
                items: [],
                filter: 'all',
                totalCount: 0,
                currentPage: 1
            },

            // Catalog registration state
            catalog: {
                currentStep: 1,
                extractedProducts: [],
                priceMatchedProducts: [],
                uploadedFiles: {
                    catalog: null,
                    pricelist: null,
                    cert: []
                },
                currentJobId: null
            },

            // PO state
            po: {
                items: [],
                filter: 'all',
                searchTerm: ''
            },

            // Notifications
            notifications: {
                items: [],
                unreadCount: 0
            },

            // Data completeness
            completeness: {
                score: 0,
                missingSummary: [],
                recommendations: []
            }
        };

        // Listeners for state changes
        this.listeners = new Set();
    }

    /**
     * Get current state
     * @param {string} path - Dot notation path (e.g., 'auth.isLoggedIn')
     * @returns {*} State value
     */
    get(path) {
        if (!path) return this.state;

        return path.split('.').reduce((obj, key) => {
            return obj && obj[key] !== undefined ? obj[key] : undefined;
        }, this.state);
    }

    /**
     * Set state value
     * @param {string} path - Dot notation path
     * @param {*} value - New value
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();

        let obj = this.state;
        for (const key of keys) {
            if (!obj[key]) obj[key] = {};
            obj = obj[key];
        }

        const oldValue = obj[lastKey];
        obj[lastKey] = value;

        // Notify listeners
        this.notify(path, value, oldValue);
    }

    /**
     * Update state with partial object
     * @param {string} path - Dot notation path
     * @param {Object} partial - Partial update object
     */
    update(path, partial) {
        const current = this.get(path);
        if (typeof current === 'object' && !Array.isArray(current)) {
            this.set(path, { ...current, ...partial });
        } else {
            this.set(path, partial);
        }
    }

    /**
     * Subscribe to state changes
     * @param {Function} listener - Callback function(path, newValue, oldValue)
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all listeners
     */
    notify(path, newValue, oldValue) {
        this.listeners.forEach(listener => {
            try {
                listener(path, newValue, oldValue);
            } catch (error) {
                console.error('Store listener error:', error);
            }
        });
    }

    /**
     * Initialize store from localStorage
     */
    initFromStorage() {
        const { STORAGE_KEYS } = Config;

        const isLoggedIn = localStorage.getItem(STORAGE_KEYS.LOGGED_IN) === 'true';

        if (isLoggedIn) {
            this.set('auth', {
                isLoggedIn: true,
                token: localStorage.getItem(STORAGE_KEYS.TOKEN),
                supplierId: localStorage.getItem(STORAGE_KEYS.SUPPLIER_ID),
                email: localStorage.getItem(STORAGE_KEYS.EMAIL),
                name: localStorage.getItem(STORAGE_KEYS.NAME)
            });
        }
    }

    /**
     * Save auth state to localStorage
     */
    saveAuthToStorage() {
        const { STORAGE_KEYS } = Config;
        const auth = this.get('auth');

        if (auth.isLoggedIn) {
            localStorage.setItem(STORAGE_KEYS.LOGGED_IN, 'true');
            localStorage.setItem(STORAGE_KEYS.TOKEN, auth.token || '');
            localStorage.setItem(STORAGE_KEYS.SUPPLIER_ID, auth.supplierId || '');
            localStorage.setItem(STORAGE_KEYS.EMAIL, auth.email || '');
            localStorage.setItem(STORAGE_KEYS.NAME, auth.name || '');
        } else {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        }
    }

    /**
     * Clear auth state
     */
    clearAuth() {
        this.set('auth', {
            isLoggedIn: false,
            token: null,
            supplierId: null,
            email: null,
            name: null
        });
        this.saveAuthToStorage();
        eventBus.emit(Events.AUTH_LOGOUT);
    }

    /**
     * Reset catalog state
     */
    resetCatalog() {
        this.set('catalog', {
            currentStep: 1,
            extractedProducts: [],
            priceMatchedProducts: [],
            uploadedFiles: {
                catalog: null,
                pricelist: null,
                cert: []
            },
            currentJobId: null
        });
    }
}

// Create singleton instance
const store = new Store();

export default store;

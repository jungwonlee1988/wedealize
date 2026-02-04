// WeDealize Supplier Portal - Event Bus
// Centralized event communication system (Pub/Sub pattern)

class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event (one-time)
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            callback(...args);
        };
        this.on(event, wrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.events.has(event)) {
            this.events.get(event).delete(callback);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`EventBus error in ${event}:`, error);
                }
            });
        }
    }

    /**
     * Clear all listeners for an event
     * @param {string} event - Event name
     */
    clear(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}

// Event name constants
export const Events = {
    // Auth events
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_ERROR: 'auth:error',

    // Navigation events
    NAV_CHANGE: 'nav:change',
    NAV_SUBMENU_TOGGLE: 'nav:submenu:toggle',

    // Product events
    PRODUCTS_LOADED: 'products:loaded',
    PRODUCT_UPDATED: 'product:updated',
    PRODUCT_DELETED: 'product:deleted',

    // Catalog events
    CATALOG_UPLOADED: 'catalog:uploaded',
    CATALOG_EXTRACTED: 'catalog:extracted',
    CATALOG_STEP_CHANGE: 'catalog:step:change',

    // PO events
    PO_LOADED: 'po:loaded',
    PO_UPDATED: 'po:updated',
    PO_CONFIRMED: 'po:confirmed',

    // Notification events
    NOTIFICATION_RECEIVED: 'notification:received',
    NOTIFICATION_READ: 'notification:read',

    // UI events
    TOAST_SHOW: 'toast:show',
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close',

    // Data events
    DATA_COMPLETENESS_UPDATE: 'data:completeness:update'
};

// Create singleton instance
const eventBus = new EventBus();

export default eventBus;

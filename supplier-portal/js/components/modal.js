// WeDealize Supplier Portal - Modal Component
// Reusable modal dialog system

import eventBus, { Events } from '../core/eventBus.js';
import { $, $$, hide, show } from '../utils/dom.js';

class Modal {
    constructor() {
        this.activeModals = new Map();
        this.init();
    }

    /**
     * Initialize modal event listeners
     */
    init() {
        // Close modal on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-overlay')) {
                const modalId = e.target.id || e.target.closest('.modal')?.id;
                if (modalId) {
                    this.close(modalId);
                }
            }
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const lastModal = Array.from(this.activeModals.keys()).pop();
                if (lastModal) {
                    this.close(lastModal);
                }
            }
        });

        // Listen for modal events
        eventBus.on(Events.MODAL_OPEN, ({ id, data }) => this.open(id, data));
        eventBus.on(Events.MODAL_CLOSE, ({ id }) => this.close(id));
    }

    /**
     * Open modal by ID
     * @param {string} modalId - Modal element ID
     * @param {Object} data - Data to pass to modal
     */
    open(modalId, data = {}) {
        const modal = $(`#${modalId}`);
        if (!modal) {
            console.warn(`Modal not found: ${modalId}`);
            return;
        }

        modal.style.display = 'flex';
        this.activeModals.set(modalId, data);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Focus first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) firstInput.focus();
        }, 100);

        eventBus.emit('modal:opened', { id: modalId, data });
    }

    /**
     * Close modal by ID
     * @param {string} modalId - Modal element ID
     */
    close(modalId) {
        const modal = $(`#${modalId}`);
        if (!modal) return;

        modal.style.display = 'none';
        this.activeModals.delete(modalId);

        // Restore body scroll if no modals open
        if (this.activeModals.size === 0) {
            document.body.style.overflow = '';
        }

        eventBus.emit('modal:closed', { id: modalId });
    }

    /**
     * Close all modals
     */
    closeAll() {
        this.activeModals.forEach((_, id) => this.close(id));
    }

    /**
     * Check if modal is open
     * @param {string} modalId - Modal element ID
     * @returns {boolean}
     */
    isOpen(modalId) {
        return this.activeModals.has(modalId);
    }

    /**
     * Get modal data
     * @param {string} modalId - Modal element ID
     * @returns {Object}
     */
    getData(modalId) {
        return this.activeModals.get(modalId);
    }

    /**
     * Create and show a confirmation dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<boolean>}
     */
    confirm(options = {}) {
        const {
            title = 'Confirm',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'primary' // primary, danger, warning
        } = options;

        return new Promise((resolve) => {
            // Create modal element
            const modalId = 'confirm-modal-' + Date.now();
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content confirm-dialog">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary cancel-btn">${cancelText}</button>
                        <button class="btn btn-${type} confirm-btn">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Event handlers
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');

            const cleanup = (result) => {
                modal.remove();
                resolve(result);
            };

            confirmBtn.addEventListener('click', () => cleanup(true));
            cancelBtn.addEventListener('click', () => cleanup(false));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cleanup(false);
            });

            modal.style.display = 'flex';
        });
    }

    /**
     * Create and show an alert dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<void>}
     */
    alert(options = {}) {
        const {
            title = 'Alert',
            message = '',
            buttonText = 'OK',
            type = 'info' // info, success, warning, error
        } = options;

        return new Promise((resolve) => {
            const modalId = 'alert-modal-' + Date.now();
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content alert-dialog ${type}">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary ok-btn">${buttonText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const okBtn = modal.querySelector('.ok-btn');
            const cleanup = () => {
                modal.remove();
                resolve();
            };

            okBtn.addEventListener('click', cleanup);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cleanup();
            });

            modal.style.display = 'flex';
        });
    }

    /**
     * Create and show a prompt dialog
     * @param {Object} options - Dialog options
     * @returns {Promise<string|null>}
     */
    prompt(options = {}) {
        const {
            title = 'Input',
            message = '',
            placeholder = '',
            defaultValue = '',
            confirmText = 'OK',
            cancelText = 'Cancel'
        } = options;

        return new Promise((resolve) => {
            const modalId = 'prompt-modal-' + Date.now();
            const modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content prompt-dialog">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body">
                        ${message ? `<p>${message}</p>` : ''}
                        <input type="text" class="form-input prompt-input" placeholder="${placeholder}" value="${defaultValue}">
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary cancel-btn">${cancelText}</button>
                        <button class="btn btn-primary confirm-btn">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const input = modal.querySelector('.prompt-input');
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');

            const cleanup = (result) => {
                modal.remove();
                resolve(result);
            };

            confirmBtn.addEventListener('click', () => cleanup(input.value));
            cancelBtn.addEventListener('click', () => cleanup(null));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') cleanup(input.value);
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cleanup(null);
            });

            modal.style.display = 'flex';
            input.focus();
            input.select();
        });
    }
}

// Create singleton instance
const modal = new Modal();

// Global functions for backward compatibility
window.closeProductModal = () => modal.close('product-modal');

export default modal;

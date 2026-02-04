// WeDealize Supplier Portal - Toast Component
// Toast notification system

import eventBus, { Events } from '../core/eventBus.js';

class Toast {
    constructor() {
        this.container = null;
        this.queue = [];
        this.isShowing = false;
        this.init();
    }

    /**
     * Initialize toast container and styles
     */
    init() {
        // Inject styles if not present
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .toast-container {
                    position: fixed;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    pointer-events: none;
                }

                .toast {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 24px;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                    color: white;
                    pointer-events: auto;
                    animation: toastSlideUp 0.3s ease;
                }

                .toast.toast-success { background: #10b981; }
                .toast.toast-error { background: #ef4444; }
                .toast.toast-warning { background: #f59e0b; }
                .toast.toast-info { background: #2563eb; }

                .toast-icon {
                    font-size: 1.1rem;
                }

                .toast-message {
                    flex: 1;
                }

                .toast-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 1.2rem;
                    cursor: pointer;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                    padding: 0;
                    margin-left: 8px;
                }

                .toast-close:hover {
                    opacity: 1;
                }

                @keyframes toastSlideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes toastFadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }

                .toast.hiding {
                    animation: toastFadeOut 0.3s ease forwards;
                }
            `;
            document.head.appendChild(style);
        }

        // Create container
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);

        // Listen for toast events
        eventBus.on(Events.TOAST_SHOW, ({ message, type }) => {
            this.show(message, type);
        });
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in ms (default: 3000)
     */
    show(message, type = 'success', duration = 3000) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.success}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        this.container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);

        return toast;
    }

    /**
     * Show success toast
     * @param {string} message - Toast message
     */
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    /**
     * Show error toast
     * @param {string} message - Toast message
     */
    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    /**
     * Show warning toast
     * @param {string} message - Toast message
     */
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Show info toast
     * @param {string} message - Toast message
     */
    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    /**
     * Clear all toasts
     */
    clear() {
        this.container.innerHTML = '';
    }
}

// Create singleton instance
const toast = new Toast();

// Global function for backward compatibility
window.showToast = (message, type) => toast.show(message, type);

export default toast;

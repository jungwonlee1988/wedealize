// WeDealize Supplier Portal - Auth Module
// Authentication UI and event handlers

import authService from '../services/auth.js';
import store from '../core/store.js';
import eventBus, { Events } from '../core/eventBus.js';
import toast from '../components/toast.js';
import { $, $$, show, hide, addClass, removeClass } from '../utils/dom.js';

class AuthModule {
    constructor() {
        this.verificationTimerId = null;
    }

    /**
     * Initialize auth module
     */
    init() {
        this.bindAuthTabs();
        this.bindForms();
        this.bindCodeInputs();
        this.checkInitialAuthState();

        // Listen for auth events
        eventBus.on(Events.AUTH_LOGIN, () => this.onLoginSuccess());
        eventBus.on(Events.AUTH_LOGOUT, () => this.onLogout());
    }

    /**
     * Bind auth tab switching
     */
    bindAuthTabs() {
        $$('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                $$('.auth-tab').forEach(t => removeClass(t, 'active'));
                addClass(tab, 'active');

                this.hideAllForms();
                const formId = tab.dataset.tab + '-form';
                const form = $(`#${formId}`);
                if (form) addClass(form, 'active');
            });
        });
    }

    /**
     * Bind form submissions
     */
    bindForms() {
        // Login form
        const loginForm = $('#login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = $('#register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    /**
     * Bind verification code inputs
     */
    bindCodeInputs() {
        $$('.code-input').forEach(input => {
            input.addEventListener('input', (e) => this.handleCodeInput(e));
            input.addEventListener('keydown', (e) => this.handleCodeKeydown(e));
        });
    }

    /**
     * Check initial auth state
     */
    checkInitialAuthState() {
        store.initFromStorage();

        if (store.get('auth.isLoggedIn')) {
            this.showDashboard();
        }
    }

    /**
     * Hide all auth forms
     */
    hideAllForms() {
        removeClass('#login-form', 'active');
        removeClass('#register-form', 'active');
        hide('#verify-form');
        hide('#forgot-form');
        hide('#reset-sent-form');
    }

    /**
     * Handle login
     */
    async handleLogin(e) {
        if (e) e.preventDefault();

        const email = $('#login-email')?.value;
        const password = $('#login-password')?.value;

        if (!email || !password) {
            toast.warning('Please enter email and password');
            return;
        }

        try {
            await authService.login(email, password);
            toast.success(t('toast.loginSuccess'));
        } catch (error) {
            toast.error(error.message || 'Login failed');
        }
    }

    /**
     * Handle registration
     */
    async handleRegister(e) {
        if (e) e.preventDefault();

        const categories = Array.from(document.querySelectorAll('#reg-categories-container input:checked')).map(cb => cb.value);
        const data = {
            company: $('#reg-company')?.value,
            email: $('#reg-email')?.value,
            password: $('#reg-password')?.value,
            country: $('#reg-country')?.value,
            categories
        };

        if (!data.company || !data.email || !data.password) {
            toast.warning('Please fill in all required fields');
            return;
        }

        if (!categories.length) {
            toast.warning('Please select at least one product category');
            return;
        }

        try {
            await authService.register(data);
            this.showVerificationForm(data.email);
            toast.success('Verification code sent to your email');
        } catch (error) {
            toast.error(error.message || 'Registration failed');
        }
    }

    /**
     * Show verification form
     */
    showVerificationForm(email) {
        this.hideAllForms();
        hide('.auth-tabs');
        show('#verify-form');

        const emailDisplay = $('#verify-email-display');
        if (emailDisplay) emailDisplay.textContent = email;

        // Clear code inputs
        $$('.code-input').forEach(input => {
            input.value = '';
            removeClass(input, 'filled', 'error');
        });

        const firstInput = $('.code-input');
        if (firstInput) firstInput.focus();

        this.startResendTimer();
    }

    /**
     * Handle code input
     */
    handleCodeInput(e) {
        const input = e.target;
        const index = parseInt(input.dataset.index);

        // Numbers only
        input.value = input.value.replace(/[^0-9]/g, '');

        if (input.value) {
            addClass(input, 'filled');

            // Move to next input
            if (index < 5) {
                const nextInput = $(`.code-input[data-index="${index + 1}"]`);
                if (nextInput) nextInput.focus();
            }
        } else {
            removeClass(input, 'filled');
        }

        // Auto verify when complete
        const code = Array.from($$('.code-input')).map(i => i.value).join('');
        if (code.length === 6) {
            this.verifyEmail();
        }
    }

    /**
     * Handle code keydown (backspace)
     */
    handleCodeKeydown(e) {
        const input = e.target;
        const index = parseInt(input.dataset.index);

        if (e.key === 'Backspace' && !input.value && index > 0) {
            const prevInput = $(`.code-input[data-index="${index - 1}"]`);
            if (prevInput) {
                prevInput.focus();
                prevInput.value = '';
                removeClass(prevInput, 'filled');
            }
        }
    }

    /**
     * Verify email with code
     */
    async verifyEmail() {
        const code = Array.from($$('.code-input')).map(i => i.value).join('');

        if (code.length !== 6) {
            toast.error('Please enter the 6-digit verification code');
            return;
        }

        try {
            await authService.verifyEmail(code);
            toast.success('Email verified! Welcome to WeDealize.');
        } catch (error) {
            $$('.code-input').forEach(input => {
                addClass(input, 'error');
                setTimeout(() => removeClass(input, 'error'), 500);
            });
            toast.error(error.message || 'Invalid verification code');
        }
    }

    /**
     * Resend verification code
     */
    async resendVerificationCode() {
        try {
            await authService.resendVerificationCode();
            toast.success('Verification code resent');
            this.startResendTimer();
        } catch (error) {
            toast.error('Failed to resend code');
        }
    }

    /**
     * Start resend timer
     */
    startResendTimer() {
        const resendBtn = $('#resend-btn');
        const timerEl = $('#resend-timer');
        const countEl = $('#timer-count');

        if (!resendBtn || !timerEl) return;

        resendBtn.disabled = true;
        hide(resendBtn);
        show(timerEl, 'inline');

        authService.startResendTimer(
            (seconds) => {
                if (countEl) countEl.textContent = seconds;
            },
            () => {
                resendBtn.disabled = false;
                show(resendBtn, 'inline');
                hide(timerEl);
            }
        );
    }

    /**
     * Back to register
     */
    backToRegister() {
        authService.clearVerificationTimer();
        this.hideAllForms();
        show('.auth-tabs', 'flex');
        addClass('#register-form', 'active');
        $(`.auth-tab[data-tab="register"]`)?.click();
    }

    /**
     * Show forgot password form
     */
    showForgotPassword(e) {
        if (e) e.preventDefault();
        this.hideAllForms();
        hide('.auth-tabs');
        show('#forgot-form');
    }

    /**
     * Send reset link
     */
    async sendResetLink() {
        const email = $('#forgot-email')?.value;

        if (!email) {
            toast.error('Please enter your email address');
            return;
        }

        try {
            await authService.forgotPassword(email);
            this.showResetSent(email);
        } catch (error) {
            toast.error('Failed to send reset link');
        }
    }

    /**
     * Show reset sent confirmation
     */
    showResetSent(email) {
        this.hideAllForms();
        show('#reset-sent-form');
        const emailDisplay = $('#reset-email-display');
        if (emailDisplay) emailDisplay.textContent = email;
    }

    /**
     * Back to login
     */
    backToLogin() {
        this.hideAllForms();
        show('.auth-tabs', 'flex');
        addClass('#login-form', 'active');
        addClass('.auth-tab[data-tab="login"]', 'active');
        removeClass('.auth-tab[data-tab="register"]', 'active');
    }

    /**
     * Handle Google login
     */
    handleGoogleLogin() {
        authService.googleLogin();
    }

    /**
     * Logout
     */
    logout() {
        authService.logout();
    }

    /**
     * On login success - show dashboard
     */
    onLoginSuccess() {
        this.showDashboard();
    }

    /**
     * On logout - show auth section
     */
    onLogout() {
        show('#auth-section', 'flex');
        hide('#dashboard-section');
        hide('#user-menu');
        show('.auth-tabs', 'flex');
    }

    /**
     * Show dashboard
     */
    showDashboard() {
        hide('#auth-section');
        show('#dashboard-section');
        show('#user-menu', 'flex');

        const userName = $('#user-name');
        if (userName) {
            userName.textContent = store.get('auth.name') || 'Supplier';
        }
    }
}

// Create singleton instance
const authModule = new AuthModule();

// Global functions for backward compatibility
window.handleLogin = (e) => authModule.handleLogin(e);
window.handleRegister = (e) => authModule.handleRegister(e);
window.handleGoogleLogin = () => authModule.handleGoogleLogin();
window.verifyEmail = () => authModule.verifyEmail();
window.resendVerificationCode = () => authModule.resendVerificationCode();
window.backToRegister = () => authModule.backToRegister();
window.showForgotPassword = (e) => authModule.showForgotPassword(e);
window.sendResetLink = () => authModule.sendResetLink();
window.backToLogin = () => authModule.backToLogin();
window.logout = () => authModule.logout();

export default authModule;

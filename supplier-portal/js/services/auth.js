// WeDealize Supplier Portal - Auth Service
// Authentication business logic

import api from './api.js';
import store from '../core/store.js';
import eventBus, { Events } from '../core/eventBus.js';
import Config from '../config.js';

class AuthService {
    constructor() {
        this.pendingRegistration = null;
        this.verificationTimer = null;
    }

    /**
     * Login with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     */
    async login(email, password) {
        // Demo response fallback
        const demoResponse = {
            access_token: 'demo_token_' + Date.now(),
            supplier_id: 1,
            company_name: email.split('@')[0] || 'Demo Supplier',
            email: email
        };

        let response = demoResponse;

        try {
            response = await api.post('/login', { email, password });
        } catch (error) {
            console.log('Backend unavailable, using demo mode:', error.message);
        }

        this.setAuthState(response);
        eventBus.emit(Events.AUTH_LOGIN, response);

        return response;
    }

    /**
     * Register new user (step 1: send verification)
     * @param {Object} data - Registration data
     */
    async register(data) {
        this.pendingRegistration = data;

        try {
            await api.post('/auth/send-verification', {
                email: data.email,
                companyName: data.company
            });
        } catch (error) {
            console.log('Using demo mode for verification');
        }

        return { success: true, email: data.email };
    }

    /**
     * Verify email with code
     * @param {string} code - Verification code
     */
    async verifyEmail(code) {
        if (!this.pendingRegistration) {
            throw new Error('No pending registration');
        }

        try {
            const response = await api.post('/auth/verify-email', {
                email: this.pendingRegistration.email,
                code: code,
                companyName: this.pendingRegistration.company,
                password: this.pendingRegistration.password,
                country: this.pendingRegistration.country,
                category: this.pendingRegistration.category
            });

            this.completeRegistration(response);
            return response;

        } catch (error) {
            // Demo mode: accept 123456
            if (code === '123456') {
                const demoResponse = {
                    supplier_id: '1',
                    access_token: 'demo_token'
                };
                this.completeRegistration(demoResponse);
                return demoResponse;
            }
            throw new Error('Invalid verification code');
        }
    }

    /**
     * Complete registration after verification
     * @param {Object} response - API response
     */
    completeRegistration(response) {
        store.set('auth', {
            isLoggedIn: true,
            token: response.access_token || 'demo_token',
            supplierId: response.supplier_id || '1',
            email: this.pendingRegistration.email,
            name: this.pendingRegistration.company
        });

        store.saveAuthToStorage();
        this.clearVerificationTimer();
        this.pendingRegistration = null;

        eventBus.emit(Events.AUTH_LOGIN, response);
    }

    /**
     * Resend verification code
     */
    async resendVerificationCode() {
        if (!this.pendingRegistration) return;

        try {
            await api.post('/auth/send-verification', {
                email: this.pendingRegistration.email,
                companyName: this.pendingRegistration.company
            });
        } catch (error) {
            console.log('Using demo mode for resend');
        }

        return { success: true };
    }

    /**
     * Start resend timer
     * @param {Function} onTick - Callback for each second
     * @param {Function} onComplete - Callback when timer completes
     */
    startResendTimer(onTick, onComplete) {
        this.clearVerificationTimer();

        let seconds = 60;
        onTick(seconds);

        this.verificationTimer = setInterval(() => {
            seconds--;
            onTick(seconds);

            if (seconds <= 0) {
                this.clearVerificationTimer();
                onComplete();
            }
        }, 1000);
    }

    /**
     * Clear verification timer
     */
    clearVerificationTimer() {
        if (this.verificationTimer) {
            clearInterval(this.verificationTimer);
            this.verificationTimer = null;
        }
    }

    /**
     * Google OAuth login
     */
    async googleLogin() {
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.initialize({
                client_id: Config.GOOGLE_CLIENT_ID,
                callback: (response) => this.handleGoogleCredential(response),
                auto_select: false
            });

            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    this.googlePopupLogin();
                }
            });
        } else {
            this.googleDemoLogin();
        }
    }

    /**
     * Google popup login fallback
     */
    googlePopupLogin() {
        if (typeof google !== 'undefined' && google.accounts?.oauth2) {
            const client = google.accounts.oauth2.initTokenClient({
                client_id: Config.GOOGLE_CLIENT_ID,
                scope: 'email profile',
                callback: async (response) => {
                    if (response.access_token) {
                        await this.fetchGoogleUserInfo(response.access_token);
                    }
                }
            });
            client.requestAccessToken();
        } else {
            this.googleDemoLogin();
        }
    }

    /**
     * Handle Google credential
     * @param {Object} response - Google credential response
     */
    async handleGoogleCredential(response) {
        if (response.credential) {
            try {
                const result = await api.post('/auth/google', {
                    credential: response.credential
                });
                this.setAuthState(result);
                eventBus.emit(Events.AUTH_LOGIN, result);
            } catch (error) {
                this.googleDemoLogin();
            }
        }
    }

    /**
     * Fetch Google user info
     * @param {string} accessToken - Google access token
     */
    async fetchGoogleUserInfo(accessToken) {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const userInfo = await response.json();
            await this.processGoogleUserInfo(userInfo);
        } catch (error) {
            this.googleDemoLogin();
        }
    }

    /**
     * Process Google user info
     * @param {Object} userInfo - Google user info
     */
    async processGoogleUserInfo(userInfo) {
        try {
            const response = await api.post('/auth/google-userinfo', {
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
                google_id: userInfo.id
            });

            store.set('auth', {
                isLoggedIn: true,
                token: response.access_token,
                supplierId: response.supplier_id,
                email: userInfo.email,
                name: response.company_name || userInfo.name
            });

            store.saveAuthToStorage();
            eventBus.emit(Events.AUTH_LOGIN, response);

        } catch (error) {
            this.googleDemoLogin();
        }
    }

    /**
     * Google demo login (API unavailable)
     */
    googleDemoLogin() {
        store.set('auth', {
            isLoggedIn: true,
            token: 'google_demo_token',
            supplierId: '1',
            email: 'demo@gmail.com',
            name: 'Google User'
        });

        store.saveAuthToStorage();
        eventBus.emit(Events.AUTH_LOGIN, { demo: true });
    }

    /**
     * Send password reset link
     * @param {string} email - User email
     */
    async forgotPassword(email) {
        try {
            await api.post('/auth/forgot-password', { email });
        } catch (error) {
            console.log('Using demo mode for password reset');
        }

        return { success: true, email };
    }

    /**
     * Logout
     */
    logout() {
        store.clearAuth();
        this.clearVerificationTimer();
        this.pendingRegistration = null;
    }

    /**
     * Set auth state from API response
     * @param {Object} response - Login response
     */
    setAuthState(response) {
        store.set('auth', {
            isLoggedIn: true,
            token: response.access_token,
            supplierId: response.supplier_id,
            email: response.email,
            name: response.company_name
        });

        store.saveAuthToStorage();
    }

    /**
     * Get pending registration email
     */
    getPendingEmail() {
        return this.pendingRegistration?.email;
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return store.get('auth.isLoggedIn');
    }
}

// Create singleton instance
const authService = new AuthService();

export default authService;

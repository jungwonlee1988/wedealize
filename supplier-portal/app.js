// WeDealize Supplier Portal - Bootstrapper
// Domain-specific logic is in js/wd-*.js files

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // Login form submit listener
        var loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        // Auth check: validate token and show dashboard or auth
        if (localStorage.getItem('supplier_logged_in') === 'true') {
            var token = localStorage.getItem('supplier_token');
            if (!token) {
                handleSessionExpired();
                return;
            }

            try {
                var payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp && payload.exp * 1000 < Date.now()) {
                    handleSessionExpired();
                    return;
                }
            } catch (e) {
                console.warn('Token decode failed:', e);
                handleSessionExpired();
                return;
            }

            showDashboard();
        } else {
            removeFlashGuard();
        }

        // Initialize custom country select
        initCountrySelect();

        // Restore sidebar collapsed state
        if (localStorage.getItem('sidebar-collapsed') === 'true') {
            var sidebar = document.querySelector('.wd-sidebar');
            if (sidebar) sidebar.classList.add('collapsed');
        }

        // Render registration category checkbox grid
        if (document.getElementById('reg-categories-container')) {
            renderCategoryCheckboxGrid('reg-categories-container');
        }

        // Hash-based section init
        var hash = window.location.hash.slice(1);
        if (hash) {
            showSectionFromHash(hash);
        }
    });

    // Browser back/forward button handler
    window.addEventListener('popstate', function() {
        var hash = window.location.hash.slice(1);
        if (hash) {
            showSectionFromHash(hash);
        }
    });

})();

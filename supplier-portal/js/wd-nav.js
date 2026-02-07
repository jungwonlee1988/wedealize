// WeDealize - Navigation
(function() {
    'use strict';

    // === Public API ===

    window.showDashboard = function() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'flex';
        document.getElementById('user-menu').style.display = 'flex';
        removeFlashGuard();
        document.getElementById('user-name').textContent = localStorage.getItem('supplier_name') || 'Supplier';
        document.body.classList.add('dashboard-mode');

        if (typeof initSidebar === 'function') {
            var hash = window.location.hash.slice(1);
            initSidebar(hash || 'overview');
        }

        loadDashboardProductStats();
        // loadWorkspaces() is now called from initSidebar() in sidebar.js
    };

    window.loadDashboardProductStats = async function() {
        try {
            var data = await apiCall('/products');
            if (typeof updateProductStats === 'function') {
                updateProductStats(data.products || []);
            }
        } catch (e) {
            console.error('Failed to load dashboard stats:', e);
        }
    };

    window.showSection = function(sectionName) {
        if (window.location.hash !== '#' + sectionName) {
            history.pushState(null, '', '#' + sectionName);
        }

        document.querySelectorAll('.dashboard-panel').forEach(function(panel) {
            panel.classList.remove('active');
        });

        var targetPanel = document.getElementById('panel-' + sectionName);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }

        // Update nav button active state (legacy nav-btn)
        document.querySelectorAll('.nav-btn').forEach(function(btn) {
            btn.classList.remove('active');
            if (btn.dataset.section === sectionName) {
                btn.classList.add('active');
                var navGroup = btn.closest('.nav-group');
                if (navGroup) navGroup.classList.add('expanded');
            }
        });

        // New design system navigation (wd-nav-item)
        document.querySelectorAll('.wd-nav-item').forEach(function(item) {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
                var navGroup = item.closest('.wd-nav-group');
                if (navGroup) navGroup.classList.add('expanded');
            }
        });

        // Section-specific data loading
        switch (sectionName) {
            case 'product-list':
                if (typeof loadProducts === 'function') loadProducts();
                break;
            case 'catalog':
                if (typeof loadUploadHistory === 'function') loadUploadHistory();
                break;
            case 'po-management':
                if (typeof loadPOListFromAPI === 'function') loadPOListFromAPI();
                break;
            case 'inv-management':
                if (typeof loadInvoiceListFromAPI === 'function') loadInvoiceListFromAPI();
                break;
            case 'credit-management':
                if (typeof loadCreditsFromAPI === 'function') loadCreditsFromAPI();
                break;
            case 'accounts':
                if (typeof loadAccountListFromAPI === 'function') loadAccountListFromAPI();
                break;
            case 'buyer-discovery':
                break;
            case 'profile':
                if (typeof loadCompanyCerts === 'function') loadCompanyCerts();
                break;
            case 'settings':
                if (typeof loadTeamMembers === 'function') loadTeamMembers();
                break;
        }
    };

    window.showSectionFromHash = function(sectionName) {
        document.querySelectorAll('.dashboard-panel').forEach(function(panel) {
            panel.classList.remove('active');
        });

        var targetPanel = document.getElementById('panel-' + sectionName);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }

        document.querySelectorAll('.wd-nav-item').forEach(function(item) {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
                var navGroup = item.closest('.wd-nav-group');
                if (navGroup) navGroup.classList.add('expanded');
            }
        });

        // Section-specific data loading (same as showSection)
        switch (sectionName) {
            case 'product-list':
                if (typeof loadProducts === 'function') loadProducts();
                break;
            case 'catalog':
                if (typeof loadUploadHistory === 'function') loadUploadHistory();
                break;
            case 'po-management':
                if (typeof loadPOListFromAPI === 'function') loadPOListFromAPI();
                break;
            case 'inv-management':
                if (typeof loadInvoiceListFromAPI === 'function') loadInvoiceListFromAPI();
                break;
            case 'credit-management':
                if (typeof loadCreditsFromAPI === 'function') loadCreditsFromAPI();
                break;
            case 'accounts':
                if (typeof loadAccountListFromAPI === 'function') loadAccountListFromAPI();
                break;
            case 'buyer-discovery':
                break;
            case 'profile':
                if (typeof loadCompanyCerts === 'function') loadCompanyCerts();
                break;
            case 'settings':
                if (typeof loadTeamMembers === 'function') loadTeamMembers();
                break;
        }
    };

    window.togglePriceListSection = function() {
        var section = document.getElementById('pricelist-section');
        var content = document.getElementById('pricelist-content');
        if (section && content) {
            section.classList.toggle('expanded');
            content.style.display = content.style.display === 'none' ? 'block' : 'none';
        }
    };

})();

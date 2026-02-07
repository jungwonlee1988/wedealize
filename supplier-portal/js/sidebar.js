// WeDealize Supplier Portal - Shared Sidebar Component
// This file provides a unified sidebar across all pages

(function() {
    'use strict';

    // Sidebar HTML template
    const sidebarHTML = `
        <div class="wd-sidebar-header">
            <button class="wd-sidebar-toggle" onclick="toggleSidebar()" title="Toggle sidebar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </button>
        </div>
        <div class="wd-workspace-switcher" id="workspace-switcher" style="display:none">
            <button class="wd-workspace-current" id="workspace-current-btn" onclick="toggleWorkspaceMenu()">
                <span class="wd-workspace-name" id="current-workspace-name">My Workspace</span>
                <svg class="wd-workspace-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="wd-workspace-menu" id="workspace-menu" style="display:none"></div>
        </div>
        <nav class="wd-sidebar-nav">
            <a class="wd-nav-item" data-section="overview" onclick="navigateTo('overview')">
                <svg class="wd-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span data-i18n="dashboard.overview">Overview</span>
            </a>
            <div class="wd-nav-group" data-group="product">
                <a class="wd-nav-item wd-nav-parent" onclick="toggleSubmenu(this)">
                    <svg class="wd-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    <span data-i18n="dashboard.product">Product</span>
                    <svg class="wd-nav-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </a>
                <div class="wd-nav-submenu">
                    <a class="wd-nav-item wd-nav-child" data-section="catalog" onclick="navigateTo('catalog')">
                        <span data-i18n="dashboard.catalogRegistration">Catalog Registration</span>
                    </a>
                    <a class="wd-nav-item wd-nav-child" data-section="product-list" onclick="navigateTo('product-list')">
                        <span data-i18n="dashboard.productList">Product List</span>
                    </a>
                </div>
            </div>
            <div class="wd-nav-group" data-group="sales">
                <a class="wd-nav-item wd-nav-parent" onclick="toggleSubmenu(this)">
                    <svg class="wd-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    <span data-i18n="dashboard.sales">Sales</span>
                    <svg class="wd-nav-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </a>
                <div class="wd-nav-submenu">
                    <a class="wd-nav-item wd-nav-child" data-section="po-management" onclick="navigateTo('po-management')">
                        <span data-i18n="dashboard.poManagement">PO Management</span>
                    </a>
                    <a class="wd-nav-item wd-nav-child" data-section="inv-management" onclick="navigateTo('inv-management')">
                        <span data-i18n="dashboard.invManagement">INV Management</span>
                    </a>
                    <a class="wd-nav-item wd-nav-child" data-section="credit-management" onclick="navigateTo('credit-management')">
                        <span data-i18n="dashboard.creditManagement">Credit Management</span>
                    </a>
                </div>
            </div>
            <a class="wd-nav-item" data-section="accounts" onclick="navigateTo('accounts')">
                <svg class="wd-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span data-i18n="dashboard.accountManagement">Account Management</span>
            </a>
            <a class="wd-nav-item" data-section="buyer-discovery" onclick="navigateTo('buyer-discovery')">
                <svg class="wd-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                <span data-i18n="dashboard.buyerDiscovery">Buyer Discovery</span>
            </a>
            <a class="wd-nav-item" data-section="inquiries" onclick="navigateTo('inquiries')">
                <svg class="wd-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span data-i18n="dashboard.inquiries">Inquiries</span>
            </a>
            <a class="wd-nav-item" data-section="profile" onclick="navigateTo('profile')">
                <svg class="wd-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span data-i18n="dashboard.companyProfile">Company Profile</span>
            </a>
            <a class="wd-nav-item" data-section="settings" onclick="navigateTo('settings')">
                <svg class="wd-nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span data-i18n="dashboard.settings">Settings</span>
            </a>
        </nav>
        <div class="wd-sidebar-footer">
            <div class="wd-user-profile">
                <div class="wd-user-avatar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="wd-user-info">
                    <span class="wd-user-name" id="sidebar-user-name">User</span>
                    <span class="wd-user-email" id="sidebar-user-email"></span>
                </div>
            </div>
        </div>
    `;

    /**
     * Initialize the sidebar
     * @param {string} activeSection - The current active section (e.g., 'product-list', 'po-management')
     */
    window.initSidebar = function(activeSection) {
        const sidebar = document.querySelector('.wd-sidebar');
        if (!sidebar) return;

        // Inject sidebar HTML
        sidebar.innerHTML = sidebarHTML;

        // Set user info
        const userName = localStorage.getItem('user_name') || 'User';
        const userEmail = localStorage.getItem('user_email') || '';
        const sidebarUserName = document.getElementById('sidebar-user-name');
        const sidebarUserEmail = document.getElementById('sidebar-user-email');
        if (sidebarUserName) sidebarUserName.textContent = userName;
        if (sidebarUserEmail) sidebarUserEmail.textContent = userEmail;

        // Set active state
        if (activeSection) {
            setActiveSection(activeSection);
        }

        // Apply i18n if available
        if (typeof updateUILanguage === 'function') {
            updateUILanguage();
        }

        // Load workspace switcher (apiCall/escapeHtml from wd-utils.js available at call time)
        console.log('[WS] initSidebar: apiCall available:', typeof apiCall === 'function');
        if (typeof apiCall === 'function') {
            loadWorkspaces();
        } else {
            console.warn('[WS] apiCall not available, skipping workspace load');
        }
    };

    /**
     * Set the active section in sidebar
     * @param {string} section - The section to mark as active
     */
    function setActiveSection(section) {
        // Remove all active states
        document.querySelectorAll('.wd-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.wd-nav-group').forEach(group => {
            group.classList.remove('expanded');
        });

        // Find and activate the correct item
        const activeItem = document.querySelector(`.wd-nav-item[data-section="${section}"]`);
        if (activeItem) {
            activeItem.classList.add('active');

            // If it's a child item, expand the parent group
            const parentGroup = activeItem.closest('.wd-nav-group');
            if (parentGroup) {
                parentGroup.classList.add('expanded');
            }
        }

        // Expand group based on section
        const sectionGroups = {
            'catalog': 'product',
            'product-list': 'product',
            'po-management': 'sales',
            'inv-management': 'sales',
            'credit-management': 'sales'
        };

        const groupName = sectionGroups[section];
        if (groupName) {
            const group = document.querySelector(`.wd-nav-group[data-group="${groupName}"]`);
            if (group) {
                group.classList.add('expanded');
            }
        }
    }

    /**
     * Navigate to a section
     * - For portal.html: use showSection (in-page navigation)
     * - For detail pages: redirect to portal.html#section
     */
    window.navigateTo = function(section) {
        // If showSection exists (portal.html), use in-page navigation
        if (typeof showSection === 'function') {
            showSection(section);
        } else {
            // Detail pages: redirect to portal.html
            window.location.href = `portal.html#${section}`;
        }
    };

    /**
     * Toggle workspace dropdown menu
     */
    window.toggleWorkspaceMenu = function() {
        var menu = document.getElementById('workspace-menu');
        if (menu) {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
    };

    /**
     * Render workspace switcher dropdown
     */
    function renderWorkspaces(workspaces) {
        if (!workspaces || workspaces.length <= 1) return;

        var switcher = document.getElementById('workspace-switcher');
        if (!switcher) return;
        switcher.style.display = 'block';

        var currentId = localStorage.getItem('supplier_id');
        var currentWs = workspaces.find(function(w) { return w.id === currentId; });
        var nameEl = document.getElementById('current-workspace-name');
        if (nameEl && currentWs) {
            nameEl.textContent = currentWs.company_name;
        }

        var menu = document.getElementById('workspace-menu');
        if (!menu) return;

        var html = '';
        for (var i = 0; i < workspaces.length; i++) {
            var ws = workspaces[i];
            var isActive = ws.id === currentId;
            var roleLabel = ws.is_own ? 'Owner' : ws.role;
            html += '<button class="wd-workspace-option' + (isActive ? ' active' : '') + '"'
                + ' onclick="switchWorkspace(\'' + ws.id + '\')"'
                + (isActive ? ' disabled' : '')
                + '>'
                + '<span class="wd-workspace-option-name">' + escapeHtml(ws.company_name) + '</span>'
                + '<span class="wd-workspace-option-role">' + escapeHtml(roleLabel) + '</span>'
                + '</button>';
        }
        menu.innerHTML = html;
    }

    /**
     * Load workspaces from cache then API
     */
    window.loadWorkspaces = async function() {
        console.log('[WS] loadWorkspaces called, apiCall:', typeof apiCall, 'escapeHtml:', typeof escapeHtml);

        // Render immediately from cache to prevent flicker
        try {
            var cached = localStorage.getItem('workspaces');
            console.log('[WS] cache:', cached ? 'found (' + JSON.parse(cached).length + ' items)' : 'empty');
            if (cached) renderWorkspaces(JSON.parse(cached));
        } catch (e) {
            console.error('[WS] cache render error:', e);
        }

        // Then refresh from API
        try {
            console.log('[WS] calling API /auth/my-workspaces...');
            var data = await apiCall('/auth/my-workspaces');
            var workspaces = data.workspaces || [];
            console.log('[WS] API returned', workspaces.length, 'workspaces:', JSON.stringify(workspaces.map(function(w) { return w.company_name; })));
            if (workspaces.length > 1) {
                localStorage.setItem('workspaces', JSON.stringify(workspaces));
            } else {
                localStorage.removeItem('workspaces');
            }
            renderWorkspaces(workspaces);
            console.log('[WS] switcher display:', document.getElementById('workspace-switcher')?.style.display);
        } catch (e) {
            console.error('[WS] API error:', e);
        }
    };

    /**
     * Switch to a different workspace
     */
    window.switchWorkspace = async function(supplierId) {
        try {
            var res = await apiCall('/auth/switch-workspace', {
                method: 'POST',
                body: JSON.stringify({ supplierId: supplierId })
            });
            localStorage.setItem('supplier_token', res.access_token);
            localStorage.setItem('supplier_id', res.supplier_id);
            localStorage.setItem('supplier_name', res.company_name);
            window.location.reload();
        } catch (e) {
            console.error('Failed to switch workspace:', e);
            if (typeof showToast === 'function') {
                showToast('Failed to switch workspace', 'error');
            }
        }
    };

    // Close workspace menu when clicking outside
    document.addEventListener('click', function(e) {
        var switcher = document.getElementById('workspace-switcher');
        if (switcher && !switcher.contains(e.target)) {
            var menu = document.getElementById('workspace-menu');
            if (menu) menu.style.display = 'none';
        }
    });

    /**
     * Toggle sidebar collapsed state (saves to localStorage)
     */
    window.toggleSidebar = function() {
        const sidebar = document.querySelector('.wd-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
        }
    };

    /**
     * Toggle submenu expansion
     * Handles both .nav-group (legacy) and .wd-nav-group
     */
    window.toggleSubmenu = function(btn) {
        const sidebar = document.querySelector('.wd-sidebar');
        const isCollapsed = sidebar && sidebar.classList.contains('collapsed');

        // If collapsed, navigate to first child section
        if (isCollapsed) {
            const navGroup = btn.closest('.wd-nav-group') || btn.closest('.nav-group');
            if (navGroup) {
                const firstChild = navGroup.querySelector('.wd-nav-child, .nav-child');
                if (firstChild) {
                    const section = firstChild.getAttribute('data-section');
                    if (section) {
                        navigateTo(section);
                        return;
                    }
                    const onclick = firstChild.getAttribute('onclick');
                    if (onclick) {
                        const match = onclick.match(/showSection\(['"]([^'"]+)['"]\)/);
                        if (match) {
                            navigateTo(match[1]);
                            return;
                        }
                    }
                }
            }
            return;
        }

        // Otherwise toggle the submenu - support both nav-group and wd-nav-group
        let navGroup = btn.closest('.nav-group');
        if (navGroup) {
            navGroup.classList.toggle('expanded');
            return;
        }
        navGroup = btn.closest('.wd-nav-group');
        if (navGroup) {
            navGroup.classList.toggle('expanded');
        }
    };

})();

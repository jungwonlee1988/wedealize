// WeDealize - Account Management
(function() {
    'use strict';

    // === Private State ===
    window._editingAccountId = null;

    // === Public API ===

    window.viewAccountDetail = async function(accountId) {
        var drawer = document.getElementById('account-detail-drawer');
        var overlay = document.getElementById('account-drawer-overlay');
        if (drawer) {
            drawer.classList.add('active');
            if (overlay) overlay.classList.add('active');
            window.currentAccountId = accountId;

            try {
                var acc = await apiCall('/accounts/' + accountId);

                var titleEl = document.getElementById('account-drawer-title');
                var subtitleEl = document.getElementById('account-drawer-subtitle');
                if (titleEl) titleEl.textContent = acc.company_name || '';
                if (subtitleEl) subtitleEl.textContent = acc.country || '';

                var infoEl = document.getElementById('account-drawer-info');
                if (infoEl) {
                    infoEl.innerHTML =
                        '<div class="wd-info-item"><span class="wd-info-label">Contact</span><span class="wd-info-value">' + escapeHtml(acc.contact_name || '-') + '</span></div>' +
                        '<div class="wd-info-item"><span class="wd-info-label">Position</span><span class="wd-info-value">' + escapeHtml(acc.contact_position || '-') + '</span></div>' +
                        '<div class="wd-info-item"><span class="wd-info-label">Email</span><span class="wd-info-value">' + escapeHtml(acc.email || '-') + '</span></div>' +
                        '<div class="wd-info-item"><span class="wd-info-label">Phone</span><span class="wd-info-value">' + escapeHtml(acc.phone || '-') + '</span></div>' +
                        '<div class="wd-info-item"><span class="wd-info-label">Currency</span><span class="wd-info-value">' + escapeHtml(acc.currency || 'USD') + '</span></div>' +
                        '<div class="wd-info-item"><span class="wd-info-label">Incoterms</span><span class="wd-info-value">' + escapeHtml(acc.incoterms || '-') + '</span></div>' +
                        '<div class="wd-info-item"><span class="wd-info-label">Payment Terms</span><span class="wd-info-value">' + escapeHtml(acc.payment_terms || '-') + '</span></div>' +
                        '<div class="wd-info-item"><span class="wd-info-label">Address</span><span class="wd-info-value">' + escapeHtml(acc.address || '-') + '</span></div>';
                }
            } catch (e) {
                console.error('Failed to load account detail:', e);
            }
        }
    };

    window.closeAccountDrawer = function() {
        var drawer = document.getElementById('account-detail-drawer');
        var overlay = document.getElementById('account-drawer-overlay');
        if (drawer) drawer.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    };

    window.viewAccountProducts = function(accountId) {
        showToast('Viewing product breakdown for ' + accountId, 'info');
        viewAccountDetail(accountId);
    };

    window.toggleAccountPIFilter = function(event) {
        event.stopPropagation();
        var dropdown = document.getElementById('account-pi-filter-dropdown');
        if (dropdown) dropdown.classList.toggle('show');
    };

    window.applyAccountPIFilter = function(status) {
        var dropdown = document.getElementById('account-pi-filter-dropdown');
        var filterBtn = document.getElementById('account-pi-filter-btn');
        if (dropdown) dropdown.classList.remove('show');
        if (filterBtn) {
            var statusText = status === 'all' ? 'All Status' : status === 'completed' ? 'Completed' : 'In Progress';
            filterBtn.querySelector('.wd-filter-text').textContent = statusText;
        }
        var rows = document.querySelectorAll('#accounts-table-body tr');
        rows.forEach(function(row) {
            var rowStatus = row.dataset.piStatus || '';
            row.style.display = (status === 'all' || rowStatus === status) ? '' : 'none';
        });
    };

    window.sortAccountTable = function(column) {
        console.log('Sorting accounts by:', column);
    };

    window.changeAccountSalesYear = function() {
        var yearSelect = document.getElementById('account-sales-year');
        if (yearSelect) console.log('Changed to year:', yearSelect.value);
    };

    window.openAccountModal = function(accountId) {
        var modal = document.getElementById('account-modal');
        var titleEl = document.getElementById('account-modal-title');
        var form = document.getElementById('account-form');
        if (form) form.reset();
        window._editingAccountId = null;

        if (accountId) {
            window._editingAccountId = accountId;
            if (titleEl) titleEl.textContent = 'Edit Account';
            loadAccountIntoForm(accountId);
        } else {
            if (titleEl) titleEl.textContent = 'Add Account';
        }
        if (modal) modal.style.display = 'flex';
    };

    window.closeAccountModal = function() {
        var modal = document.getElementById('account-modal');
        if (modal) modal.style.display = 'none';
        window._editingAccountId = null;
    };

    async function loadAccountIntoForm(accountId) {
        try {
            var acc = await apiCall('/accounts/' + accountId);

            var setVal = function(id, val) { var el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('account-company-name', acc.company_name);
            setVal('account-country', acc.country);
            setVal('account-address', acc.address);
            setVal('account-contact-name', acc.contact_name);
            setVal('account-contact-position', acc.contact_position);
            setVal('account-email', acc.email);
            setVal('account-phone', acc.phone);
            setVal('account-currency', acc.currency);
            setVal('account-incoterms', acc.incoterms);
            setVal('account-payment-terms', acc.payment_terms);
            setVal('account-notes', acc.notes);
        } catch (e) {
            console.error('Failed to load account into form:', e);
            showToast('Failed to load account data', 'error');
        }
    }

    window.saveAccount = async function() {
        var companyName = document.getElementById('account-company-name')?.value?.trim();
        if (!companyName) {
            showToast('Company name is required', 'error');
            return;
        }

        var payload = {
            companyName: companyName,
            country: document.getElementById('account-country')?.value || '',
            address: document.getElementById('account-address')?.value || '',
            contactName: document.getElementById('account-contact-name')?.value || '',
            contactPosition: document.getElementById('account-contact-position')?.value || '',
            email: document.getElementById('account-email')?.value || '',
            phone: document.getElementById('account-phone')?.value || '',
            currency: document.getElementById('account-currency')?.value || 'USD',
            incoterms: document.getElementById('account-incoterms')?.value || '',
            paymentTerms: document.getElementById('account-payment-terms')?.value || '',
            notes: document.getElementById('account-notes')?.value || ''
        };

        try {
            var isEdit = !!window._editingAccountId;
            var endpoint = isEdit ? '/accounts/' + window._editingAccountId : '/accounts';
            var method = isEdit ? 'PATCH' : 'POST';

            await apiCall(endpoint, {
                method: method,
                body: JSON.stringify(payload)
            });

            showToast(isEdit ? 'Account updated!' : 'Account created!', 'success');
            closeAccountModal();
            loadAccountListFromAPI();
        } catch (e) {
            console.error('Failed to save account:', e);
            showToast(e.message || 'Failed to save account', 'error');
        }
    };

    window.loadAccountListFromAPI = async function() {
        var tbody = document.getElementById('accounts-table-body');
        if (!tbody) return;

        try {
            var accounts = await apiCall('/accounts');

            if (!accounts.length) {
                tbody.innerHTML = renderEmptyRow(7, 'No accounts yet. Click "Add Account" to create one.');
                return;
            }

            tbody.innerHTML = accounts.map(function(acc) {
                return '<tr data-account-id="' + acc.id + '" onclick="viewAccountDetail(\'' + acc.id + '\')" class="wd-table-row-clickable">' +
                    '<td>' + renderCellGroup(acc.company_name, acc.country || '') + '</td>' +
                    '<td>' + escapeHtml(acc.contact_name || '-') + '</td>' +
                    '<td>-</td><td>-</td><td>-</td>' +
                    '<td>' + escapeHtml(acc.email || '-') + '</td>' +
                    '<td><div class="wd-table-actions">' +
                    '<button class="wd-btn wd-btn-sm wd-btn-outline" onclick="event.stopPropagation(); openAccountModal(\'' + acc.id + '\')" title="Edit">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
                    '<button class="wd-btn wd-btn-sm wd-btn-outline" onclick="event.stopPropagation(); deleteAccountFromAPI(\'' + acc.id + '\')" title="Delete" style="color:#ef4444;">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
                    '</div></td></tr>';
            }).join('');
        } catch (e) {
            console.error('Failed to load accounts:', e);
            tbody.innerHTML = renderEmptyRow(7, 'No accounts yet. Click "Add Account" to create one.');
        }
    };

    window.deleteAccountFromAPI = async function(accountId) {
        if (!confirm('Are you sure you want to delete this account?')) return;
        try {
            await apiCall('/accounts/' + accountId, { method: 'DELETE' });
            showToast('Account deleted', 'success');
            loadAccountListFromAPI();
        } catch (e) {
            console.error('Failed to delete account:', e);
            showToast('Failed to delete account', 'error');
        }
    };

    window.filterAccounts = function() {
        var searchInput = document.getElementById('account-search');
        var searchTerm = (searchInput?.value || '').toLowerCase();
        var rows = document.querySelectorAll('#accounts-table-body tr');
        rows.forEach(function(row) {
            row.style.display = row.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
        });
    };

    // Account tooltip functions
    window.showProductTooltip = function(event, month) {
        var tooltip = document.getElementById('product-tooltip');
        if (!tooltip) return;

        var monthlyData = {
            '2026-01': { label: 'January 2026', total: '$9,700', products: [
                { name: 'Extra Virgin Olive Oil 500ml', qty: '140 pcs', amount: '$3,500' },
                { name: 'Aged Parmesan 24 months', qty: '50 pcs', amount: '$3,250' },
                { name: 'Organic Honey 350g', qty: '100 pcs', amount: '$1,800' },
                { name: 'Balsamic Vinegar 250ml', qty: '36 pcs', amount: '$1,150' }
            ]},
            '2026-02': { label: 'February 2026', total: '$5,420', products: [
                { name: 'Extra Virgin Olive Oil 500ml', qty: '80 pcs', amount: '$2,000' },
                { name: 'Truffle Oil 100ml', qty: '24 pcs', amount: '$1,920' },
                { name: 'Aged Parmesan 24 months', qty: '20 pcs', amount: '$1,500' }
            ]}
        };

        var data = monthlyData[month];
        if (!data) { tooltip.style.display = 'none'; return; }

        var headerMonth = tooltip.querySelector('.wd-tooltip-month');
        var headerTotal = tooltip.querySelector('.wd-tooltip-total');
        var productsList = tooltip.querySelector('.wd-tooltip-products');

        if (headerMonth) headerMonth.textContent = data.label;
        if (headerTotal) headerTotal.textContent = data.total;
        if (productsList) {
            productsList.innerHTML = data.products.map(function(p) {
                return '<div class="wd-tooltip-product">' +
                    '<span class="wd-tooltip-product-name">' + p.name + '</span>' +
                    '<span class="wd-tooltip-product-qty">' + p.qty + '</span>' +
                    '<span class="wd-tooltip-product-amount">' + p.amount + '</span></div>';
            }).join('');
        }

        var rect = event.target.getBoundingClientRect();
        tooltip.style.display = 'block';
        tooltip.style.top = (rect.bottom + 8) + 'px';
        tooltip.style.left = rect.left + 'px';

        var tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = (window.innerWidth - tooltipRect.width - 16) + 'px';
        }
    };

    window.hideProductTooltip = function() {
        var tooltip = document.getElementById('product-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    };

    window.togglePIProducts = function(element) {
        element.classList.toggle('expanded');
    };
    window.toggleINVProducts = window.togglePIProducts;

    // Stubs
    window.editAccount = function(id) { openAccountModal(id); };
    window.createINVForAccount = function(id) { showToast('Create invoice for account', 'info'); };
    window.viewAccount = function(id) { viewAccountDetail(id); };

})();

// WeDealize - Invoice (PI) Management
(function() {
    'use strict';

    // === Public API ===

    window.loadInvoiceListFromAPI = async function() {
        var tbody = document.getElementById('inv-table-body');
        if (!tbody) return;

        try {
            var invoices = await apiCall('/pi');
            renderInvoiceListFromAPI(Array.isArray(invoices) ? invoices : []);
        } catch (e) {
            console.error('Failed to load invoices from API:', e);
            tbody.innerHTML = renderEmptyRow(9, 'No invoices found');
        }
    };

    function renderInvoiceListFromAPI(invoices) {
        var tbody = document.getElementById('inv-table-body');
        if (!tbody) return;

        if (invoices.length === 0) {
            tbody.innerHTML = renderEmptyRow(9, 'No invoices yet. Click "New Invoice" to create one.');
            return;
        }

        tbody.innerHTML = invoices.map(function(inv) {
            var totalAmount = inv.total_amount ?? 0;
            var currency = inv.currency || 'USD';

            return '<tr data-status="' + inv.status + '" data-id="' + inv.id + '" onclick="viewINVDetail(\'' + inv.id + '\')" class="wd-table-row-clickable">' +
                '<td>' + (inv.pi_number || '-') + '</td>' +
                '<td><span class="wd-badge ' + getStatusBadgeClass(inv.status) + '">' + (inv.status || 'draft') + '</span></td>' +
                '<td>' + (inv.payment_status || '-') + '</td>' +
                '<td>' + (inv.po_number || '-') + '</td>' +
                '<td>' + (inv.buyer_name || '-') + '</td>' +
                '<td>' + wdFormatCurrency(totalAmount, currency) + '</td>' +
                '<td>' + wdFormatDate(inv.created_at) + '</td>' +
                '</tr>';
        }).join('');
    }

    window.openINVModal = function(invId) {
        window.location.href = invId ? 'inv-edit.html?id=' + invId : 'inv-edit.html?id=new';
    };

    window.openPIModal = function(invId) {
        openINVModal(invId);
    };

    window.viewINVDetail = function(invNumber) {
        window.location.href = 'inv-edit.html?id=' + encodeURIComponent(invNumber);
    };

    window.viewPOFromINV = function(poNumber) {
        window.location.href = 'po-edit.html?id=' + encodeURIComponent(poNumber);
    };

    window.populateINVBuyerDropdown = async function() {
        var buyerSelect = document.getElementById('inv-buyer-select');
        if (!buyerSelect) return;

        buyerSelect.innerHTML = '<option value="">Loading buyers...</option>';

        try {
            var accounts = await apiCall('/accounts');

            buyerSelect.innerHTML = '<option value="">Select a buyer...</option>';
            (Array.isArray(accounts) ? accounts : []).forEach(function(acc) {
                var opt = document.createElement('option');
                opt.value = acc.company_name;
                opt.setAttribute('data-name', acc.company_name);
                opt.setAttribute('data-email', acc.email || '');
                opt.setAttribute('data-country', acc.country || '');
                opt.textContent = acc.company_name + (acc.country ? ' (' + acc.country + ')' : '');
                buyerSelect.appendChild(opt);
            });

            if (accounts.length === 0) {
                buyerSelect.innerHTML = '<option value="">No accounts found — add one in Account Management</option>';
            }
        } catch (e) {
            console.error('Failed to load buyers:', e);
            buyerSelect.innerHTML = '<option value="">Failed to load buyers</option>';
        }
    };

    window.closeINVModal = function() {
        var modalEl = document.getElementById('inv-modal');
        if (modalEl) modalEl.style.display = 'none';
    };

    window.createAndSendINV = async function() {
        var invData = collectINVData();
        if (!invData) return;
        invData.status = 'sent';

        try {
            var endpoint = window._editingINVId ? '/pi/' + window._editingINVId : '/pi';
            var method = window._editingINVId ? 'PATCH' : 'POST';

            await apiCall(endpoint, {
                method: method,
                body: JSON.stringify(invData)
            });

            showToast(window._editingINVId ? 'INV updated & sent!' : 'INV created & sent!', 'success');
            closeINVModal();
            if (typeof loadInvoiceListFromAPI === 'function') loadInvoiceListFromAPI();
        } catch (e) {
            showToast(e.message || 'Failed to create INV', 'error');
        }
    };

    window.toggleINVSource = function(source) {
        var poSelection = document.getElementById('inv-po-selection');
        var buyerSelect = document.getElementById('inv-buyer-select');

        if (source === 'po') {
            if (poSelection) poSelection.style.display = '';
            if (buyerSelect) buyerSelect.disabled = false;
        } else {
            if (poSelection) poSelection.style.display = 'none';
            if (buyerSelect) buyerSelect.disabled = false;
        }
        resetINVItems();
        var infoCard = document.getElementById('inv-buyer-info-card');
        if (infoCard) infoCard.style.display = 'none';
        var creditSection = document.getElementById('inv-credit-section');
        if (creditSection) creditSection.style.display = 'none';
    };

    window.loadPOForINV = function() {
        var poSelect = document.getElementById('inv-po-select');
        if (!poSelect || !poSelect.value) return;

        var selectedOption = poSelect.selectedOptions[0];
        var buyerCode = selectedOption?.getAttribute('data-buyer');

        if (buyerCode) {
            var buyerSelect = document.getElementById('inv-buyer-select');
            if (buyerSelect) {
                buyerSelect.value = buyerCode;
                loadBuyerForINV();
            }
        }
        showToast('PO data loaded. Add products below.', 'info');
    };

    window.loadBuyerForINV = async function() {
        var buyerSelect = document.getElementById('inv-buyer-select');
        if (!buyerSelect) return;

        var selectedOption = buyerSelect.selectedOptions[0];
        var infoCard = document.getElementById('inv-buyer-info-card');
        var creditSection = document.getElementById('inv-credit-section');

        if (!buyerSelect.value) {
            if (infoCard) infoCard.style.display = 'none';
            if (creditSection) creditSection.style.display = 'none';
            return;
        }

        var name = selectedOption?.getAttribute('data-name') || '-';
        var country = selectedOption?.getAttribute('data-country') || '-';
        var currency = document.getElementById('inv-currency')?.value || 'USD';

        var companyEl = document.getElementById('inv-buyer-company-display');
        var countryEl = document.getElementById('inv-buyer-country-display');
        var creditEl = document.getElementById('inv-buyer-credit-display');

        if (companyEl) companyEl.textContent = name;
        if (countryEl) countryEl.textContent = country;
        if (infoCard) infoCard.style.display = '';

        try {
            var buyerCredits = await apiCall('/credits/buyer/' + encodeURIComponent(name));
            var totalCredit = buyerCredits.reduce(function(sum, c) { return sum + parseFloat(c.amount); }, 0);

            if (creditEl) creditEl.textContent = currency + ' ' + totalCredit.toFixed(2);

            if (buyerCredits.length > 0) {
                if (creditSection) creditSection.style.display = '';
                var badge = document.getElementById('available-credit-badge');
                if (badge) badge.textContent = currency + ' ' + totalCredit.toFixed(2) + ' available';

                var creditList = document.getElementById('inv-available-credits');
                if (creditList) {
                    creditList.innerHTML = buyerCredits.map(function(credit) {
                        return '<label class="wd-checkbox-card" style="display: flex; align-items: center; gap: 8px; padding: 12px;">' +
                            '<input type="checkbox" class="inv-credit-checkbox" value="' + credit.id + '" data-amount="' + credit.amount + '" onchange="calculateINVTotals()">' +
                            '<div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">' +
                            '<span style="font-weight: 600;">' + credit.credit_number + '</span>' +
                            '<span class="wd-text-muted" style="font-size: 12px;">from ' + (credit.invoice_number || 'N/A') + ' · ' + credit.reason + '</span>' +
                            '</div>' +
                            '<span style="font-weight: 600; color: var(--success);">-' + currency + ' ' + parseFloat(credit.amount).toFixed(2) + '</span>' +
                            '</label>';
                    }).join('');
                }
            } else {
                if (creditSection) creditSection.style.display = 'none';
                if (creditEl) creditEl.textContent = currency + ' 0.00';
            }
        } catch (e) {
            console.error('Failed to load credits:', e);
            if (creditSection) creditSection.style.display = 'none';
            if (creditEl) creditEl.textContent = currency + ' 0.00';
        }

        calculateINVTotals();
    };

    window.previewProductToAdd = function() {
        var productSelect = document.getElementById('inv-product-select');
        var addBtn = productSelect?.parentElement?.querySelector('.wd-btn-primary');
        if (addBtn) addBtn.disabled = !productSelect.value;
    };

    window.addProductToINV = function() {
        var productSelect = document.getElementById('inv-product-select');
        if (!productSelect || !productSelect.value) { showToast('Select a product first', 'warning'); return; }

        var selectedOption = productSelect.selectedOptions[0];
        var productId = productSelect.value;
        var name = selectedOption.getAttribute('data-name') || selectedOption.textContent;
        var price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
        var unit = selectedOption.getAttribute('data-unit') || 'pcs';

        var tbody = document.getElementById('pi-items-tbody');
        if (!tbody) return;

        var emptyRow = tbody.querySelector('.wd-empty-row');
        if (emptyRow) emptyRow.remove();

        var existing = tbody.querySelector('tr[data-product-id="' + productId + '"]');
        if (existing) { showToast('Product already added', 'warning'); return; }

        var idx = tbody.querySelectorAll('tr').length;
        var tr = document.createElement('tr');
        tr.setAttribute('data-row', idx);
        tr.setAttribute('data-product-id', productId);
        tr.innerHTML = '<td class="wd-text-bold">' + name + '</td>' +
            '<td><input type="number" class="wd-input wd-input-sm pi-item-qty" min="1" value="1" onchange="calculateINVTotals()"></td>' +
            '<td>' + unit + '</td>' +
            '<td><input type="number" class="wd-input wd-input-sm pi-item-price" min="0" step="0.01" value="' + price.toFixed(2) + '" onchange="calculateINVTotals()"></td>' +
            '<td class="pi-item-amount wd-text-right wd-text-bold">' + price.toFixed(2) + '</td>' +
            '<td><button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePIItemRow(this)" title="Remove">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>';
        tbody.appendChild(tr);

        productSelect.value = '';
        previewProductToAdd();
        calculateINVTotals();
    };

    window.removePIItemRow = function(btn) {
        var row = btn.closest('tr');
        if (row) row.remove();

        var tbody = document.getElementById('pi-items-tbody');
        if (tbody && tbody.querySelectorAll('tr').length === 0) {
            tbody.innerHTML = '<tr class="wd-empty-row"><td colspan="6" class="wd-text-center wd-text-muted" style="padding: 24px;">' +
                '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>' +
                '<div data-i18n="pi.noItemsYet">No items added yet. Select a PO or add products above.</div></td></tr>';
        }
        calculateINVTotals();
    };

    function resetINVItems() {
        var tbody = document.getElementById('pi-items-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr class="wd-empty-row"><td colspan="6" class="wd-text-center wd-text-muted" style="padding: 24px;">' +
                '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>' +
                '<div data-i18n="pi.noItemsYet">No items added yet. Select a PO or add products above.</div></td></tr>';
        }
        calculateINVTotals();
    }

    window.calculateINVTotals = function() {
        var tbody = document.getElementById('pi-items-tbody');
        var subtotal = 0;

        if (tbody) {
            tbody.querySelectorAll('tr:not(.wd-empty-row)').forEach(function(row) {
                var qty = parseFloat(row.querySelector('.pi-item-qty')?.value) || 0;
                var price = parseFloat(row.querySelector('.pi-item-price')?.value) || 0;
                var amount = qty * price;
                var amountTd = row.querySelector('.pi-item-amount');
                if (amountTd) amountTd.textContent = amount.toFixed(2);
                subtotal += amount;
            });
        }

        var creditDiscount = 0;
        document.querySelectorAll('.inv-credit-checkbox:checked').forEach(function(cb) {
            creditDiscount += parseFloat(cb.dataset.amount) || 0;
        });
        creditDiscount = Math.min(creditDiscount, subtotal);

        var total = subtotal - creditDiscount;
        var currency = document.getElementById('inv-currency')?.value || 'USD';

        var subtotalEl = document.getElementById('pi-subtotal');
        var discountEl = document.getElementById('pi-credit-discount');
        var totalEl = document.getElementById('pi-total');

        if (subtotalEl) subtotalEl.textContent = currency + ' ' + subtotal.toFixed(2);
        if (discountEl) discountEl.textContent = '-' + currency + ' ' + creditDiscount.toFixed(2);
        if (totalEl) totalEl.textContent = currency + ' ' + total.toFixed(2);
    };

    window.updatePICurrency = function() {
        calculateINVTotals();
        loadBuyerForINV();
    };

    function collectINVData() {
        var buyerSelect = document.getElementById('inv-buyer-select');
        if (!buyerSelect?.value) { showToast('Select a buyer', 'error'); return null; }

        var tbody = document.getElementById('pi-items-tbody');
        var items = [];
        if (tbody) {
            tbody.querySelectorAll('tr:not(.wd-empty-row)').forEach(function(row) {
                items.push({
                    productId: row.getAttribute('data-product-id') || '',
                    productName: row.querySelector('td:first-child')?.textContent || '',
                    quantity: parseInt(row.querySelector('.pi-item-qty')?.value) || 0,
                    unitPrice: parseFloat(row.querySelector('.pi-item-price')?.value) || 0,
                    unit: row.querySelectorAll('td')[2]?.textContent || 'pcs'
                });
            });
        }

        if (items.length === 0) { showToast('Add at least one product', 'error'); return null; }

        var appliedCredits = [];
        document.querySelectorAll('.inv-credit-checkbox:checked').forEach(function(cb) {
            appliedCredits.push({ creditId: cb.value, amount: parseFloat(cb.dataset.amount) || 0 });
        });

        return {
            buyerName: buyerSelect.selectedOptions[0]?.getAttribute('data-name') || '',
            piDate: document.getElementById('pi-date')?.value || new Date().toISOString().split('T')[0],
            currency: document.getElementById('inv-currency')?.value || 'USD',
            incoterms: document.getElementById('pi-incoterms')?.value || 'FOB',
            paymentMethod: document.getElementById('pi-payment-method')?.value || 'tt30',
            validUntil: document.getElementById('pi-valid-until')?.value || undefined,
            remarks: document.getElementById('pi-remarks')?.value || undefined,
            items: items,
            appliedCredits: appliedCredits.length > 0 ? appliedCredits : undefined,
            poNumber: document.getElementById('inv-po-select')?.value || undefined
        };
    }

    window.saveAsDraft = async function() {
        var invData = collectINVData();
        if (!invData) return;
        invData.status = 'draft';

        try {
            var endpoint = window._editingINVId ? '/pi/' + window._editingINVId : '/pi';
            var method = window._editingINVId ? 'PATCH' : 'POST';

            await apiCall(endpoint, {
                method: method,
                body: JSON.stringify(invData)
            });

            showToast('PI saved as draft!', 'success');
            closeINVModal();
            if (typeof loadInvoiceListFromAPI === 'function') loadInvoiceListFromAPI();
        } catch (e) {
            showToast(e.message || 'Failed to save draft', 'error');
        }
    };

    // === PI Filters ===

    window.filterPIByTab = function(tabType) {
        var tabs = document.querySelectorAll('#panel-pi-management .wd-tab');
        tabs.forEach(function(tab) { tab.classList.remove('active'); });
        event.target.classList.add('active');

        var tabFilter = document.getElementById('pi-tab-filter');
        if (tabFilter) tabFilter.value = tabType;

        var rows = document.querySelectorAll('#pi-table-body tr');
        rows.forEach(function(row) {
            var rowTab = row.dataset.tab || 'active';
            if (tabType === 'active') {
                row.style.display = rowTab !== 'cancelled' ? '' : 'none';
            } else if (tabType === 'cancelled') {
                row.style.display = rowTab === 'cancelled' ? '' : 'none';
            }
        });
    };

    window.togglePIStatusFilter = function(event) {
        event.stopPropagation();
        var dropdown = document.getElementById('pi-status-filter-dropdown');
        if (dropdown) dropdown.classList.toggle('show');
        var paymentDropdown = document.getElementById('pi-payment-filter-dropdown');
        if (paymentDropdown) paymentDropdown.classList.remove('show');
    };

    window.applyPIStatusFilter = function(status) {
        var dropdown = document.getElementById('pi-status-filter-dropdown');
        var hiddenFilter = document.getElementById('pi-status-filter');
        if (dropdown) dropdown.classList.remove('show');
        if (hiddenFilter) hiddenFilter.value = status;
        applyPIFilters();
    };

    window.togglePIPaymentFilter = function(event) {
        event.stopPropagation();
        var dropdown = document.getElementById('pi-payment-filter-dropdown');
        if (dropdown) dropdown.classList.toggle('show');
        var statusDropdown = document.getElementById('pi-status-filter-dropdown');
        if (statusDropdown) statusDropdown.classList.remove('show');
    };

    window.applyPIPaymentFilter = function(payment) {
        var dropdown = document.getElementById('pi-payment-filter-dropdown');
        if (dropdown) dropdown.classList.remove('show');
        window.piPaymentFilter = payment;
        applyPIFilters();
    };

    function applyPIFilters() {
        var tabFilter = document.getElementById('pi-tab-filter')?.value || 'active';
        var statusFilter = document.getElementById('pi-status-filter')?.value || 'all';
        var paymentFilter = window.piPaymentFilter || 'all';

        var rows = document.querySelectorAll('#pi-table-body tr');
        rows.forEach(function(row) {
            var rowTab = row.dataset.tab || 'active';
            var rowStatus = row.dataset.status || '';
            var rowPayment = row.dataset.payment || '';

            var showByTab = tabFilter === 'active' ? rowTab !== 'cancelled' : rowTab === 'cancelled';
            var showByStatus = statusFilter === 'all' || rowStatus === statusFilter;
            var showByPayment = paymentFilter === 'all' || rowPayment === paymentFilter;

            row.style.display = (showByTab && showByStatus && showByPayment) ? '' : 'none';
        });
    }

    window.sortPITable = function(column) {
        console.log('Sorting PI by:', column);
    };

    // === INV aliases for portal.html compatibility ===
    window.filterINVByTab = window.filterPIByTab;
    window.sortINVTable = window.sortPITable;
    window.toggleINVStatusFilter = window.togglePIStatusFilter;
    window.applyINVStatusFilter = window.applyPIStatusFilter;
    window.toggleINVPaymentFilter = window.togglePIPaymentFilter;
    window.applyINVPaymentFilter = window.applyPIPaymentFilter;
    window.updateINVCurrency = window.updatePICurrency;
    window.filterINVList = function() { /* stub */ };
    window.viewPI = function(id) { window.openINVModal(id); };
    window.loadINVListFromAPI = window.loadInvoiceListFromAPI;

})();

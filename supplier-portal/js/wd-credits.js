// WeDealize - Credit Management
(function() {
    'use strict';

    // === Public API ===

    window.loadCreditsFromAPI = async function() {
        var tbody = document.getElementById('credit-table-body');
        if (!tbody) return;

        try {
            var credits = await apiCall('/credits');
            renderCreditsFromAPI(Array.isArray(credits) ? credits : []);
        } catch (e) {
            console.error('Failed to load credits from API:', e);
            tbody.innerHTML = renderEmptyRow(8, 'No credits found');
        }
    };

    function renderCreditsFromAPI(credits) {
        var tbody = document.getElementById('credit-table-body');
        if (!tbody) return;

        if (credits.length === 0) {
            tbody.innerHTML = renderEmptyRow(8, 'No credits yet. Click "New Credit" to create one.');
            return;
        }

        var reasonLabels = {
            damaged: 'Damaged', quality: 'Quality Issue', short: 'Short Shipment',
            wrong: 'Wrong Item', expired: 'Expired', other: 'Other'
        };

        tbody.innerHTML = credits.map(function(credit) {
            var reasonLabel = reasonLabels[credit.reason] || credit.reason || '-';
            return '<tr data-status="' + credit.status + '" data-tab="' + (credit.status === 'cancelled' ? 'cancelled' : 'active') + '" data-id="' + credit.id + '">' +
                '<td><a href="#" class="wd-link" onclick="viewCreditDetail(\'' + credit.id + '\')">' + (credit.credit_number || '-') + '</a></td>' +
                '<td>' + (credit.buyer_name || '-') + '</td>' +
                '<td>' + (credit.invoice_number || '-') + '</td>' +
                '<td>' + (credit.product_name || '-') + '</td>' +
                '<td>' + reasonLabel + '</td>' +
                '<td>' + wdFormatCurrency(credit.amount || 0) + '</td>' +
                '<td><span class="wd-badge ' + getStatusBadgeClass(credit.status) + '">' + (credit.status || 'draft') + '</span></td>' +
                '<td>' + wdFormatDate(credit.created_at) + '</td>' +
                '</tr>';
        }).join('');
    }

    window.filterCreditByTab = function(tabType) {
        var tabs = document.querySelectorAll('#panel-credit-management .wd-tab');
        tabs.forEach(function(tab) { tab.classList.remove('active'); });
        event.target.classList.add('active');

        var tabFilter = document.getElementById('credit-tab-filter');
        if (tabFilter) tabFilter.value = tabType;
        applyCreditFilters();
    };

    window.toggleCreditStatusFilter = function(event) {
        event.stopPropagation();
        var dropdown = document.getElementById('credit-status-filter-dropdown');
        if (dropdown) dropdown.classList.toggle('show');
    };

    window.applyCreditStatusFilter = function(status) {
        var dropdown = document.getElementById('credit-status-filter-dropdown');
        if (dropdown) dropdown.classList.remove('show');
        var statusFilter = document.getElementById('credit-status-filter');
        if (statusFilter) statusFilter.value = status;
        applyCreditFilters();
    };

    function applyCreditFilters() {
        var tabFilter = document.getElementById('credit-tab-filter')?.value || 'active';
        var statusFilter = document.getElementById('credit-status-filter')?.value || 'all';
        var searchValue = document.getElementById('credit-search')?.value?.toLowerCase() || '';

        var rows = document.querySelectorAll('#credit-table-body tr');
        rows.forEach(function(row) {
            var rowTab = row.dataset.tab || 'active';
            var rowStatus = row.dataset.status || '';
            var showByTab = tabFilter === 'active' ? rowTab !== 'cancelled' : rowTab === 'cancelled';
            var showByStatus = statusFilter === 'all' || rowStatus === statusFilter;
            var showBySearch = true;
            if (searchValue) {
                showBySearch = row.textContent.toLowerCase().includes(searchValue);
            }
            row.style.display = (showByTab && showByStatus && showBySearch) ? '' : 'none';
        });
    }

    window.filterCredits = function() { applyCreditFilters(); };

    window.openCreditPage = function(creditId) {
        window.location.href = creditId ? 'credit-edit.html?id=' + creditId : 'credit-edit.html?id=new';
    };

    window.closeCreditModal = function() {
        var modal = document.getElementById('credit-modal');
        if (modal) modal.style.display = 'none';
    };

    window.saveCredit = function() {
        var invoice = document.getElementById('credit-invoice-select')?.value;
        var product = document.getElementById('credit-product-select')?.value;
        var reason = document.getElementById('credit-reason')?.value;
        var qty = document.getElementById('credit-qty')?.value;
        var amount = document.getElementById('credit-amount')?.value;

        if (!invoice || !product || !reason || !qty || !amount) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        closeCreditModal();
        showToast('Credit submitted successfully', 'success');
    };

    window.loadInvoiceProducts = function() {
        var invoiceSelect = document.getElementById('credit-invoice-select');
        var productSelect = document.getElementById('credit-product-select');
        if (!invoiceSelect || !productSelect) return;

        var invoice = invoiceSelect.value;
        if (!invoice) {
            productSelect.innerHTML = '<option value="">Select Invoice first...</option>';
            return;
        }

        var productsByInvoice = {
            'INV-2024-0089': [
                { value: 'olive-oil-500', label: 'Extra Virgin Olive Oil 500ml - $25.00/unit' },
                { value: 'balsamic-250', label: 'Balsamic Vinegar 250ml - $18.00/unit' }
            ],
            'INV-2024-0088': [
                { value: 'parmesan-24m', label: 'Aged Parmesan 24 months - $160.00/unit' },
                { value: 'mozzarella-500', label: 'Buffalo Mozzarella 500g - $22.00/unit' }
            ],
            'INV-2024-0087': [
                { value: 'honey-350', label: 'Organic Honey 350g - $18.00/unit' },
                { value: 'maple-500', label: 'Maple Syrup 500ml - $24.00/unit' }
            ]
        };

        var products = productsByInvoice[invoice] || [];
        productSelect.innerHTML = '<option value="">Select product...</option>';
        products.forEach(function(p) {
            var option = document.createElement('option');
            option.value = p.value;
            option.textContent = p.label;
            productSelect.appendChild(option);
        });
    };

    window.handleCreditFiles = function(event) {
        var files = event.target.files;
        var fileList = document.getElementById('credit-file-list');
        if (!fileList || !files) return;

        fileList.innerHTML = '';
        Array.from(files).forEach(function(file) {
            var fileItem = document.createElement('div');
            fileItem.className = 'wd-file-item';
            fileItem.innerHTML = '<span class="wd-file-name">' + file.name + '</span>' +
                '<span class="wd-file-size">(' + (file.size / 1024).toFixed(1) + ' KB)</span>';
            fileList.appendChild(fileItem);
        });
    };

    window.sortCreditTable = function(column) {
        console.log('Sorting Credit by:', column);
    };

    window.viewCreditDetail = function(creditId) {
        window.location.href = 'credit-edit.html?id=' + encodeURIComponent(creditId);
    };

    window.viewInvoiceFromCredit = function(invoiceNumber) {
        window.location.href = 'inv-edit.html?id=' + encodeURIComponent(invoiceNumber);
    };

    // Stubs
    window.saveCreditAsDraft = function() { showToast('Credit saved as draft', 'success'); };

})();

// WeDealize Supplier Portal - PO Edit Page Script
// Handles both new PO creation and existing PO detail view/edit

(function() {
    'use strict';

    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
    let currentPOId = null;
    let isNewMode = false;
    let poItemRowIndex = 1;

    // Demo PO data for detail view
    const demoPOData = {
        'PO-2026-0051': {
            po_number: 'PO-2026-0051', status: 'Draft', statusClass: 'wd-badge-gray', date: '2026.02.05 09:30',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
            incoterms: 'FCA', paymentTerms: 'TT', currency: 'EUR', notes: '',
            items: [{ name: 'Frozen Butter Croissant Dough (24% Butter)', quantity: 40, unit: 'boxes', price: 20.16 }]
        },
        '20260202171': {
            po_number: '20260202171', status: 'Received', statusClass: 'wd-badge-info', date: '2026.02.02 17:10',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
            incoterms: 'FCA', paymentTerms: 'TT', currency: 'EUR', notes: 'Please ensure proper cold chain handling.',
            items: [{ name: 'Frozen Butter Croissant Dough (24% Butter)', quantity: 40, unit: 'boxes', price: 20.16 }]
        },
        'PO20260203048953': {
            po_number: 'PO20260203048953', status: 'Confirmed', statusClass: 'wd-badge-success', date: '2026.02.03 13:44',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
            incoterms: 'FCA', paymentTerms: 'TT', currency: 'EUR', notes: '',
            items: [{ name: 'Frozen Butter Croissant Dough (24% Butter)', quantity: 40, unit: 'boxes', price: 20.16 }]
        },
        'PO2026012800A2C': {
            po_number: 'PO2026012800A2C', status: 'Confirmed', statusClass: 'wd-badge-success', date: '2026.01.28 14:22',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
            incoterms: 'FOB', paymentTerms: 'NET30', currency: 'USD', notes: 'Urgent order - expedited shipping required.',
            items: [
                { name: 'Premium Organic Coffee Beans 1kg', quantity: 100, unit: 'bags', price: 45.00 },
                { name: 'Artisan Dark Chocolate 500g', quantity: 50, unit: 'boxes', price: 28.50 }
            ]
        }
    };

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const token = localStorage.getItem('supplier_token');
        if (!token) {
            window.location.href = 'portal.html';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        currentPOId = urlParams.get('id');
        isNewMode = !currentPOId || currentPOId === 'new';

        if (isNewMode) {
            setupNewMode();
        } else {
            setupDetailMode();
            loadPOData(currentPOId);
        }

        bindFormEvents();
    }

    function setupNewMode() {
        document.body.classList.remove('detail-mode');
        document.body.classList.add('new-mode');
        document.getElementById('page-title').textContent = 'Add Purchase Order';
    }

    function setupDetailMode() {
        document.body.classList.remove('new-mode');
        document.body.classList.add('detail-mode');
        document.getElementById('page-title').textContent = 'PO Detail';
        document.getElementById('po-form-container').classList.add('edit-mode');
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) saveBtn.style.display = 'inline-flex';
    }

    function bindFormEvents() {
        const form = document.getElementById('po-edit-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    }

    async function loadPOData(poId) {
        try {
            const token = localStorage.getItem('supplier_token');
            const response = await fetch(`${API_BASE_URL}/po/${poId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const po = await response.json();
                populateDetailForm(po);
                return;
            }
        } catch (error) {
            console.log('API fetch failed, using demo data');
        }

        // Fallback to demo data
        const demoData = demoPOData[poId] || {
            po_number: poId, status: 'Received', statusClass: 'wd-badge-info', date: new Date().toLocaleString('ko-KR'),
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
            incoterms: 'FCA', paymentTerms: 'TT', currency: 'EUR', notes: '',
            items: [{ name: 'Frozen Butter Croissant Dough (24% Butter)', quantity: 40, unit: 'boxes', price: 20.16 }]
        };
        populateDetailForm(demoData);
    }

    function populateDetailForm(po) {
        // Status bar
        document.getElementById('po-number-display').textContent = po.po_number || currentPOId;
        const statusEl = document.getElementById('po-status');
        if (statusEl) {
            var status = po.status || 'Received';
            statusEl.textContent = status;
            statusEl.className = 'wd-badge ' + (window.getStatusBadgeClass ? getStatusBadgeClass(status) : 'wd-badge-info');
        }
        document.getElementById('po-date-display').textContent = po.created_at ? wdFormatDate(po.created_at) : (po.date || '');

        // PO Number & Date
        setInputValue('po-number', po.po_number);
        setInputValue('po-date', po.order_date ? po.order_date.split('T')[0] : '');

        // Exporter (Seller) — API returns flat fields or demo has nested
        setInputValue('exporter-name', po.exporter_name || (po.exporter && po.exporter.name) || '');
        setInputValue('exporter-contact', po.exporter_contact || (po.exporter && po.exporter.contact) || '');
        setInputValue('exporter-email', po.exporter_email || (po.exporter && po.exporter.email) || '');
        setInputValue('exporter-phone', po.exporter_phone || (po.exporter && po.exporter.phone) || '');

        // Importer (Buyer) — API returns buyer_name etc.
        setInputValue('importer-name', po.buyer_name || (po.importer && po.importer.name) || '');
        setInputValue('importer-contact', po.buyer_contact || (po.importer && po.importer.contact) || '');
        setInputValue('importer-email', po.buyer_email || (po.importer && po.importer.email) || '');
        setInputValue('importer-phone', po.buyer_phone || (po.importer && po.importer.phone) || '');

        // Trade info
        setSelectValue('incoterms', po.incoterms);
        setSelectValue('payment-terms', po.payment_terms || po.paymentTerms);
        setSelectValue('currency', po.currency);
        setInputValue('notes', po.notes || '');

        // Items — API returns order_items
        var items = po.order_items || po.items || [];
        renderItems(items);
    }

    function setInputValue(id, value) {
        var el = document.getElementById(id);
        if (el && value !== null && value !== undefined) el.value = value;
    }

    function setSelectValue(id, value) {
        var el = document.getElementById(id);
        if (el && value) el.value = value;
    }

    function renderItems(items) {
        const tbody = document.getElementById('po-items-tbody');
        tbody.innerHTML = '';

        let totalQty = 0;
        let totalAmount = 0;

        items.forEach((item, index) => {
            const qty = item.quantity || 0;
            const price = item.price || item.unit_price || 0;
            const subtotal = qty * price;
            totalQty += qty;
            totalAmount += subtotal;

            const row = document.createElement('tr');
            row.setAttribute('data-row', index);
            row.innerHTML = `
                <td><input type="text" class="wd-input po-item-name" value="${item.name || item.product_name || ''}" placeholder="Item name"></td>
                <td><input type="number" class="wd-input po-item-qty" min="1" value="${qty}" onchange="calculatePOItemSubtotal(${index})"></td>
                <td><select class="wd-select po-item-unit">
                    <option ${item.unit === 'pcs' ? 'selected' : ''}>pcs</option>
                    <option ${item.unit === 'boxes' ? 'selected' : ''}>boxes</option>
                    <option ${item.unit === 'bags' ? 'selected' : ''}>bags</option>
                    <option ${item.unit === 'cases' ? 'selected' : ''}>cases</option>
                    <option ${item.unit === 'kg' ? 'selected' : ''}>kg</option>
                </select></td>
                <td><input type="number" class="wd-input po-item-price" min="0" step="0.01" value="${price}" onchange="calculatePOItemSubtotal(${index})"></td>
                <td class="po-item-subtotal" style="text-align:right;font-weight:600;">${subtotal.toFixed(2)}</td>
                <td><button type="button" class="wd-btn-icon" onclick="removePOItemRow(${index})" style="padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>
            `;
            tbody.appendChild(row);
        });

        poItemRowIndex = items.length;
        document.getElementById('items-count').textContent = items.length;
        document.getElementById('total-qty').textContent = totalQty;
        document.getElementById('total-currency').textContent = document.getElementById('currency').value;
        document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
    }

    // === Validation ===

    function clearValidationErrors() {
        document.querySelectorAll('.wd-input-error').forEach(function(el) {
            el.classList.remove('wd-input-error');
        });
    }

    function markError(el) {
        if (el) {
            el.classList.add('wd-input-error');
            el.addEventListener('input', function handler() {
                el.classList.remove('wd-input-error');
                el.removeEventListener('input', handler);
            }, { once: true });
            el.addEventListener('change', function handler() {
                el.classList.remove('wd-input-error');
                el.removeEventListener('change', handler);
            }, { once: true });
        }
    }

    function validateRequired() {
        clearValidationErrors();
        var errors = [];

        // New mode: PO Number, Order Date
        if (isNewMode) {
            var poNumberEl = document.getElementById('po-number');
            if (!poNumberEl?.value?.trim()) {
                markError(poNumberEl);
                errors.push('PO Number');
            }
            var poDateEl = document.getElementById('po-date');
            if (!poDateEl?.value) {
                markError(poDateEl);
                errors.push('Order Date');
            }
        }

        // Exporter Company
        var exporterEl = document.getElementById('exporter-name');
        if (!exporterEl?.value?.trim()) {
            markError(exporterEl);
            errors.push('Exporter Company');
        }

        // Importer (Buyer) Company
        var importerEl = document.getElementById('importer-name');
        if (!importerEl?.value?.trim()) {
            markError(importerEl);
            errors.push('Buyer Company');
        }

        var items = document.querySelectorAll('#po-items-tbody tr[data-row]');
        if (items.length === 0) {
            errors.push('Items (at least one)');
        } else {
            var hasValidItem = false;
            items.forEach(function(row) {
                var nameEl = row.querySelector('.po-item-name');
                if (nameEl?.value?.trim()) {
                    hasValidItem = true;
                } else {
                    markError(nameEl);
                }
            });
            if (!hasValidItem) {
                errors.push('Item name');
            }
        }

        if (errors.length > 0) {
            showToast('Please fill in required fields: ' + errors.join(', '), 'error');
            return false;
        }
        return true;
    }

    // === Form Data ===

    function collectFormData() {
        var items = [];
        document.querySelectorAll('#po-items-tbody tr[data-row]').forEach(function(row) {
            var name = row.querySelector('.po-item-name')?.value;
            var qty = row.querySelector('.po-item-qty')?.value;
            var unit = row.querySelector('.po-item-unit')?.value;
            var price = row.querySelector('.po-item-price')?.value;

            if (name && qty && price) {
                items.push({
                    productName: name,
                    quantity: parseInt(qty),
                    unit: unit || 'pcs',
                    unitPrice: parseFloat(price)
                });
            }
        });

        var data = {
            buyerName: document.getElementById('importer-name')?.value || '',
            buyerContact: document.getElementById('importer-contact')?.value || undefined,
            buyerEmail: document.getElementById('importer-email')?.value || undefined,
            buyerPhone: document.getElementById('importer-phone')?.value || undefined,
            items: items,
            currency: document.getElementById('currency')?.value || 'USD',
            incoterms: document.getElementById('incoterms')?.value || 'FOB',
            paymentTerms: document.getElementById('payment-terms')?.value || 'TT',
            notes: document.getElementById('notes')?.value || undefined
        };

        if (isNewMode) {
            data.poNumber = document.getElementById('po-number')?.value?.trim() || undefined;
            data.orderDate = document.getElementById('po-date')?.value || new Date().toISOString().split('T')[0];
        }

        return data;
    }

    // === Save ===

    async function handleFormSubmit(e) {
        e.preventDefault();

        if (!validateRequired()) return;

        var formData = collectFormData();
        formData.status = 'created';

        var submitBtn = document.querySelector('button[type="submit"]');
        var originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
        submitBtn.disabled = true;

        try {
            await savePOToAPI(formData);
            showToast('Purchase Order saved successfully!', 'success');
            setTimeout(function() {
                window.location.href = 'portal.html#po-management';
            }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to save PO', 'error');
        }

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }

    async function savePOToAPI(formData) {
        var token = localStorage.getItem('supplier_token');
        var endpoint = isNewMode
            ? `${API_BASE_URL}/po`
            : `${API_BASE_URL}/po/${currentPOId}`;
        var method = isNewMode ? 'POST' : 'PATCH';

        var response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(formData)
        });

        if (response.status === 401) {
            handleSessionExpired();
            throw new Error('Session expired');
        }

        if (!response.ok) {
            var err = await response.json().catch(function() { return {}; });
            throw new Error(err.message || 'Failed to save PO');
        }

        return await response.json();
    }

    // Global functions
    window.savePO = async function() {
        if (!validateRequired()) return;

        var saveBtn = document.getElementById('save-btn');
        var originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
        saveBtn.disabled = true;

        try {
            var formData = collectFormData();
            await savePOToAPI(formData);
            showToast('Purchase Order updated successfully!', 'success');
        } catch (error) {
            console.error('Save PO error:', error);
            showToast(error.message || 'Failed to save PO', 'error');
        }

        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    };

    window.savePOAsDraft = async function() {
        if (!validateRequired()) return;

        var formData = collectFormData();
        formData.status = 'draft';

        try {
            await savePOToAPI(formData);
            showToast('PO saved as draft', 'success');
            setTimeout(function() {
                window.location.href = 'portal.html#po-management';
            }, 1000);
        } catch (error) {
            console.error('Save draft error:', error);
            showToast(error.message || 'Failed to save draft', 'error');
        }
    };

    window.addPOItemRow = function(item) {
        var tbody = document.getElementById('po-items-tbody');
        var index = poItemRowIndex++;

        var name = item ? (item.product_name || item.name || '') : '';
        var qty = item ? (item.quantity || 1) : 1;
        var unit = item ? (item.unit || 'pcs') : 'pcs';
        var price = item ? (item.unit_price || item.price || 0) : 0;

        var row = document.createElement('tr');
        row.setAttribute('data-row', index);
        row.innerHTML = `
            <td><input type="text" class="wd-input po-item-name" placeholder="Item name" value="${name}"></td>
            <td><input type="number" class="wd-input po-item-qty" min="1" value="${qty}" onchange="calculatePOItemSubtotal(${index})"></td>
            <td><select class="wd-select po-item-unit">
                <option ${unit === 'pcs' ? 'selected' : ''}>pcs</option>
                <option ${unit === 'boxes' ? 'selected' : ''}>boxes</option>
                <option ${unit === 'bags' ? 'selected' : ''}>bags</option>
                <option ${unit === 'cases' ? 'selected' : ''}>cases</option>
                <option ${unit === 'kg' ? 'selected' : ''}>kg</option>
            </select></td>
            <td><input type="number" class="wd-input po-item-price" min="0" step="0.01" value="${price}" onchange="calculatePOItemSubtotal(${index})"></td>
            <td class="po-item-subtotal" style="text-align:right;font-weight:600;">0.00</td>
            <td><button type="button" class="wd-btn-icon" onclick="removePOItemRow(${index})" style="padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>
        `;
        tbody.appendChild(row);
        updateTotals();
    };

    window.removePOItemRow = function(index) {
        var row = document.querySelector('#po-items-tbody tr[data-row="' + index + '"]');
        if (row) {
            row.remove();
            updateTotals();
        }
    };

    window.calculatePOItemSubtotal = function(index) {
        var row = document.querySelector('#po-items-tbody tr[data-row="' + index + '"]');
        if (!row) return;

        var qty = parseFloat(row.querySelector('.po-item-qty')?.value) || 0;
        var price = parseFloat(row.querySelector('.po-item-price')?.value) || 0;
        var subtotal = qty * price;

        var subtotalEl = row.querySelector('.po-item-subtotal');
        if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);

        updateTotals();
    };

    function updateTotals() {
        var totalQty = 0;
        var totalAmount = 0;

        document.querySelectorAll('#po-items-tbody tr[data-row]').forEach(function(row) {
            var qty = parseFloat(row.querySelector('.po-item-qty')?.value) || 0;
            var price = parseFloat(row.querySelector('.po-item-price')?.value) || 0;
            totalQty += qty;
            totalAmount += qty * price;
        });

        var itemsCount = document.querySelectorAll('#po-items-tbody tr[data-row]').length;
        document.getElementById('items-count').textContent = itemsCount;
        document.getElementById('total-qty').textContent = totalQty;
        document.getElementById('total-currency').textContent = document.getElementById('currency').value;
        document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
    }

    window.handlePOFileUpload = function(event) {
        var file = event.target?.files?.[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            showToast('File too large (max 20MB)', 'error');
            return;
        }

        document.getElementById('po-file-name').textContent = file.name;
        showToast('File selected: ' + file.name, 'info');
    };

    window.deletePOFromDetail = function() {
        if (!currentPOId || isNewMode) return;
        var poNumber = document.getElementById('po-number-display')?.textContent || currentPOId;
        showDeleteConfirm({
            title: 'Delete Purchase Order',
            message: 'Are you sure you want to delete <strong>' + escapeHtml(poNumber) + '</strong>? This action cannot be undone.',
            onConfirm: async function() {
                try {
                    var token = localStorage.getItem('supplier_token');
                    var response = await fetch(API_BASE_URL + '/po/' + currentPOId, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (response.status === 401) { handleSessionExpired(); return; }
                    if (!response.ok && response.status !== 204) {
                        var err = await response.json().catch(function() { return {}; });
                        throw new Error(err.message || 'Failed to delete PO');
                    }
                    showToast('Purchase Order deleted', 'success');
                    setTimeout(function() { window.location.href = 'portal.html#po-management'; }, 1000);
                } catch (error) {
                    console.error('Delete PO error:', error);
                    showToast(error.message || 'Failed to delete PO', 'error');
                }
            }
        });
    };

    window.downloadPO = function() {
        showToast('Preparing download...', 'info');
        setTimeout(function() { window.print(); }, 500);
    };

})();

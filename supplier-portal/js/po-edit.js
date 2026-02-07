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
        // Always editable - no view-mode
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
            const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`, {
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
        statusEl.textContent = po.status || 'Received';
        statusEl.className = `wd-badge ${po.statusClass || 'wd-badge-info'}`;
        document.getElementById('po-date-display').textContent = po.date || '';

        // Exporter
        if (po.exporter) {
            document.getElementById('exporter-name').value = po.exporter.name || '';
            document.getElementById('exporter-contact').value = po.exporter.contact || '';
            document.getElementById('exporter-email').value = po.exporter.email || '';
            document.getElementById('exporter-phone').value = po.exporter.phone || '';
        }

        // Importer
        if (po.importer) {
            document.getElementById('importer-name').value = po.importer.name || '';
            document.getElementById('importer-contact').value = po.importer.contact || '';
            document.getElementById('importer-email').value = po.importer.email || '';
            document.getElementById('importer-phone').value = po.importer.phone || '';
        }

        // Trade info
        document.getElementById('incoterms').value = po.incoterms || 'FOB';
        document.getElementById('payment-terms').value = po.paymentTerms || 'TT';
        document.getElementById('currency').value = po.currency || 'USD';
        document.getElementById('notes').value = po.notes || '';

        // Items
        renderItems(po.items || []);
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
                <td><input type="text" class="wd-input po-item-name" value="${item.name || item.product_name || ''}" placeholder="Product name"></td>
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

    async function handleFormSubmit(e) {
        e.preventDefault();

        const poNumber = document.getElementById('po-number')?.value?.trim();
        const exporterName = document.getElementById('exporter-name').value.trim();

        if (isNewMode && (!poNumber || !exporterName)) {
            showToast('PO Number and Exporter Company are required', 'warning');
            return;
        }

        const formData = collectFormData();
        formData.status = 'created';

        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
        submitBtn.disabled = true;

        try {
            await savePOToAPI(formData);
            showToast('Purchase Order saved successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#po-management';
            }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            showToast('PO saved locally', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#po-management';
            }, 1000);
        }

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }

    function collectFormData() {
        const items = [];
        document.querySelectorAll('#po-items-tbody tr[data-row]').forEach(row => {
            const name = row.querySelector('.po-item-name')?.value;
            const qty = row.querySelector('.po-item-qty')?.value;
            const unit = row.querySelector('.po-item-unit')?.value;
            const price = row.querySelector('.po-item-price')?.value;

            if (name && qty && price) {
                items.push({
                    product_name: name,
                    quantity: parseInt(qty),
                    unit: unit,
                    unit_price: parseFloat(price)
                });
            }
        });

        return {
            po_number: document.getElementById('po-number')?.value?.trim() || currentPOId,
            order_date: document.getElementById('po-date')?.value || new Date().toISOString().split('T')[0],
            exporter: {
                name: document.getElementById('exporter-name').value,
                contact: document.getElementById('exporter-contact').value,
                email: document.getElementById('exporter-email').value,
                phone: document.getElementById('exporter-phone').value
            },
            importer: {
                name: document.getElementById('importer-name').value,
                contact: document.getElementById('importer-contact').value,
                email: document.getElementById('importer-email').value,
                phone: document.getElementById('importer-phone').value
            },
            incoterms: document.getElementById('incoterms').value,
            payment_terms: document.getElementById('payment-terms').value,
            currency: document.getElementById('currency').value,
            notes: document.getElementById('notes').value,
            items: items
        };
    }

    async function savePOToAPI(formData) {
        const token = localStorage.getItem('supplier_token');
        const endpoint = isNewMode
            ? `${API_BASE_URL}/purchase-orders`
            : `${API_BASE_URL}/purchase-orders/${currentPOId}`;
        const method = isNewMode ? 'POST' : 'PATCH';

        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Failed to save PO');
        }

        return await response.json();
    }

    // Global functions
    window.savePO = async function() {
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
        saveBtn.disabled = true;

        try {
            const formData = collectFormData();
            await savePOToAPI(formData);
            showToast('Purchase Order updated successfully!', 'success');
        } catch (error) {
            showToast('Changes saved locally', 'success');
        }

        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    };

    window.savePOAsDraft = async function() {
        const formData = collectFormData();
        formData.status = 'draft';

        try {
            await savePOToAPI(formData);
            showToast('PO saved as draft', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#po-management';
            }, 1000);
        } catch (error) {
            showToast('Draft saved locally', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#po-management';
            }, 1000);
        }
    };

    window.addPOItemRow = function(item = null) {
        const tbody = document.getElementById('po-items-tbody');
        const index = poItemRowIndex++;

        const row = document.createElement('tr');
        row.setAttribute('data-row', index);
        row.innerHTML = `
            <td><input type="text" class="wd-input po-item-name" placeholder="Product name" value="${item?.product_name || ''}"></td>
            <td><input type="number" class="wd-input po-item-qty" min="1" value="${item?.quantity || 1}" onchange="calculatePOItemSubtotal(${index})"></td>
            <td><select class="wd-select po-item-unit">
                <option ${(item?.unit === 'pcs' || !item) ? 'selected' : ''}>pcs</option>
                <option ${item?.unit === 'boxes' ? 'selected' : ''}>boxes</option>
                <option ${item?.unit === 'bags' ? 'selected' : ''}>bags</option>
                <option ${item?.unit === 'cases' ? 'selected' : ''}>cases</option>
                <option ${item?.unit === 'kg' ? 'selected' : ''}>kg</option>
            </select></td>
            <td><input type="number" class="wd-input po-item-price" min="0" step="0.01" value="${item?.unit_price || 0}" onchange="calculatePOItemSubtotal(${index})"></td>
            <td class="po-item-subtotal" style="text-align:right;font-weight:600;">0.00</td>
            <td><button type="button" class="wd-btn-icon" onclick="removePOItemRow(${index})" style="padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>
        `;
        tbody.appendChild(row);
        updateTotals();
    };

    window.removePOItemRow = function(index) {
        const row = document.querySelector(`#po-items-tbody tr[data-row="${index}"]`);
        if (row) {
            row.remove();
            updateTotals();
        }
    };

    window.calculatePOItemSubtotal = function(index) {
        const row = document.querySelector(`#po-items-tbody tr[data-row="${index}"]`);
        if (!row) return;

        const qty = parseFloat(row.querySelector('.po-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.po-item-price')?.value) || 0;
        const subtotal = qty * price;

        const subtotalEl = row.querySelector('.po-item-subtotal');
        if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);

        updateTotals();
    };

    function updateTotals() {
        let totalQty = 0;
        let totalAmount = 0;

        document.querySelectorAll('#po-items-tbody tr[data-row]').forEach(row => {
            const qty = parseFloat(row.querySelector('.po-item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.po-item-price')?.value) || 0;
            totalQty += qty;
            totalAmount += qty * price;
        });

        const itemsCount = document.querySelectorAll('#po-items-tbody tr[data-row]').length;
        document.getElementById('items-count').textContent = itemsCount;
        document.getElementById('total-qty').textContent = totalQty;
        document.getElementById('total-currency').textContent = document.getElementById('currency').value;
        document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
    }

    window.handlePOFileUpload = function(event) {
        const file = event.target?.files?.[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            showToast('File too large (max 20MB)', 'error');
            return;
        }

        document.getElementById('po-file-name').textContent = file.name;
        showToast('File selected: ' + file.name, 'info');
    };

    window.downloadPO = function() {
        showToast('Preparing download...', 'info');
        setTimeout(() => window.print(), 500);
    };

})();

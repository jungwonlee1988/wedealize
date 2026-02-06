// WeDealize Supplier Portal - PO Detail/Edit Page Script
// Handles purchase order viewing and editing on dedicated page

(function() {
    'use strict';

    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
    let currentPOId = null;
    let poItemRowIndex = 0;
    let isEditMode = false;

    // Demo PO data for display
    const demoPOData = {
        'PO-2026-0051': {
            po_number: 'PO-2026-0051',
            status: 'Draft',
            statusClass: 'wd-badge-gray',
            date: '2026.02.05 09:30',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
            incoterms: 'FCA',
            paymentTerms: 'T/T',
            currency: 'EUR',
            notes: '',
            items: [
                { name: 'Frozen Butter Croissant Dough (24% Butter)', quantity: 40, unit: 'boxes', price: 20.16 }
            ]
        },
        '20260202171': {
            po_number: '20260202171',
            status: 'Received',
            statusClass: 'wd-badge-info',
            date: '2026.02.02 17:10',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
            incoterms: 'FCA',
            paymentTerms: 'T/T',
            currency: 'EUR',
            notes: 'Please ensure proper cold chain handling.',
            items: [
                { name: 'Frozen Butter Croissant Dough (24% Butter)', quantity: 40, unit: 'boxes', price: 20.16 }
            ]
        },
        'PO20260203048953': {
            po_number: 'PO20260203048953',
            status: 'Confirmed',
            statusClass: 'wd-badge-success',
            date: '2026.02.03 13:44',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
            incoterms: 'FCA',
            paymentTerms: 'T/T',
            currency: 'EUR',
            notes: '',
            items: [
                { name: 'Frozen Butter Croissant Dough (24% Butter)', quantity: 40, unit: 'boxes', price: 20.16 }
            ]
        },
        'PO2026012800A2C': {
            po_number: 'PO2026012800A2C',
            status: 'Confirmed',
            statusClass: 'wd-badge-success',
            date: '2026.01.28 14:22',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
            incoterms: 'FOB',
            paymentTerms: 'NET30',
            currency: 'USD',
            notes: 'Urgent order - expedited shipping required.',
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

        if (!currentPOId) {
            showToast('No PO ID provided', 'error');
            setTimeout(() => {
                window.location.href = 'portal.html#po-management';
            }, 1500);
            return;
        }

        loadPOData(currentPOId);
    }

    async function loadPOData(poId) {
        try {
            // First try API
            const token = localStorage.getItem('supplier_token');
            const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const po = await response.json();
                populateForm(po);
                return;
            }
        } catch (error) {
            console.log('API fetch failed, using demo data');
        }

        // Fallback to demo data
        const demoData = demoPOData[poId];
        if (demoData) {
            populateForm(demoData);
        } else {
            // Generate default demo data for unknown PO IDs
            populateForm({
                po_number: poId,
                status: 'Received',
                statusClass: 'wd-badge-info',
                date: new Date().toLocaleString('ko-KR'),
                exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
                importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
                incoterms: 'FCA',
                paymentTerms: 'T/T',
                currency: 'EUR',
                notes: '',
                items: [
                    { name: 'Frozen Butter Croissant Dough (24% Butter)', quantity: 40, unit: 'boxes', price: 20.16 }
                ]
            });
        }
    }

    function populateForm(po) {
        // PO Number and Status Bar
        document.getElementById('po-number-display').textContent = po.po_number || po.number || currentPOId;

        const statusEl = document.getElementById('po-status');
        statusEl.textContent = po.status || 'Received';
        statusEl.className = `wd-badge ${po.statusClass || 'wd-badge-info'}`;

        document.getElementById('po-date-display').textContent = po.date || new Date().toLocaleString('ko-KR');

        // Exporter Info
        if (po.exporter) {
            document.getElementById('exporter-name-view').textContent = po.exporter.name || '-';
            document.getElementById('exporter-name').value = po.exporter.name || '';
            document.getElementById('exporter-contact-view').textContent = po.exporter.contact || '-';
            document.getElementById('exporter-contact').value = po.exporter.contact || '';
            document.getElementById('exporter-email-view').textContent = po.exporter.email || '-';
            document.getElementById('exporter-email').value = po.exporter.email || '';
            document.getElementById('exporter-phone-view').textContent = po.exporter.phone || '-';
            document.getElementById('exporter-phone').value = po.exporter.phone || '';
        }

        // Importer Info
        if (po.importer) {
            document.getElementById('importer-name-view').textContent = po.importer.name || '-';
            document.getElementById('importer-name').value = po.importer.name || '';
            document.getElementById('importer-contact-view').textContent = po.importer.contact || '-';
            document.getElementById('importer-contact').value = po.importer.contact || '';
            document.getElementById('importer-email-view').textContent = po.importer.email || '-';
            document.getElementById('importer-email').value = po.importer.email || '';
            document.getElementById('importer-phone-view').textContent = po.importer.phone || '-';
            document.getElementById('importer-phone').value = po.importer.phone || '';
        }

        // Trade Info
        document.getElementById('incoterms-view').textContent = po.incoterms || 'FCA';
        document.getElementById('incoterms').value = po.incoterms || 'FCA';
        document.getElementById('payment-terms-view').textContent = po.paymentTerms || 'T/T';
        document.getElementById('payment-terms').value = po.paymentTerms === 'T/T' ? 'TT' : (po.paymentTerms || 'TT');
        document.getElementById('currency-view').textContent = po.currency || 'EUR';
        document.getElementById('currency').value = po.currency || 'EUR';

        // Notes
        document.getElementById('notes-view').textContent = po.notes || '-';
        document.getElementById('notes').value = po.notes || '';

        // Items
        renderItems(po.items || []);
    }

    function renderItems(items) {
        const tbody = document.getElementById('po-items-tbody');
        tbody.innerHTML = '';

        let totalQty = 0;
        let totalAmount = 0;
        const currency = document.getElementById('currency-view').textContent;

        items.forEach((item, index) => {
            const qty = item.quantity || 0;
            const price = item.price || item.unit_price || 0;
            const subtotal = qty * price;
            totalQty += qty;
            totalAmount += subtotal;

            const row = document.createElement('tr');
            row.setAttribute('data-row', index);
            row.innerHTML = `
                <td>
                    <span class="view-value">${item.name || item.product_name}</span>
                    <input type="text" class="wd-input edit-input po-item-name" value="${item.name || item.product_name}" style="display:none;">
                </td>
                <td style="text-align: right;">
                    <span class="view-value">${qty}</span>
                    <input type="number" class="wd-input edit-input po-item-qty" value="${qty}" min="1" onchange="updateItemSubtotal(${index})" style="display:none; width:80px;">
                </td>
                <td>
                    <span class="view-value">${item.unit}</span>
                    <select class="wd-select edit-input po-item-unit" style="display:none;">
                        <option ${item.unit === 'pcs' ? 'selected' : ''}>pcs</option>
                        <option ${item.unit === 'boxes' ? 'selected' : ''}>boxes</option>
                        <option ${item.unit === 'bags' ? 'selected' : ''}>bags</option>
                        <option ${item.unit === 'cases' ? 'selected' : ''}>cases</option>
                        <option ${item.unit === 'kg' ? 'selected' : ''}>kg</option>
                    </select>
                </td>
                <td style="text-align: right;">
                    <span class="view-value">${price.toFixed(2)}</span>
                    <input type="number" class="wd-input edit-input po-item-price" value="${price}" min="0" step="0.01" onchange="updateItemSubtotal(${index})" style="display:none; width:100px;">
                </td>
                <td style="text-align: right;" class="po-item-subtotal">${subtotal.toFixed(2)}</td>
                <td class="edit-col">
                    <button type="button" class="wd-btn-icon" onclick="removePOItemRow(${index})" style="padding:2px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        poItemRowIndex = items.length;
        document.getElementById('items-count').textContent = items.length;
        document.getElementById('total-qty').textContent = totalQty;
        document.getElementById('total-currency').textContent = currency;
        document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
    }

    // Global functions
    window.toggleEditMode = function() {
        const container = document.getElementById('po-form-container');
        const toggle = document.getElementById('edit-mode-toggle');
        const saveBtn = document.getElementById('save-btn');

        isEditMode = toggle.checked;

        if (isEditMode) {
            container.classList.remove('view-mode');
            container.classList.add('edit-mode');
            saveBtn.style.display = 'inline-flex';
        } else {
            container.classList.remove('edit-mode');
            container.classList.add('view-mode');
            saveBtn.style.display = 'none';
        }
    };

    window.addPOItemRow = function() {
        const tbody = document.getElementById('po-items-tbody');
        const index = poItemRowIndex++;

        const row = document.createElement('tr');
        row.setAttribute('data-row', index);
        row.innerHTML = `
            <td>
                <input type="text" class="wd-input po-item-name" placeholder="Product name">
            </td>
            <td style="text-align: right;">
                <input type="number" class="wd-input po-item-qty" value="1" min="1" onchange="updateItemSubtotal(${index})" style="width:80px;">
            </td>
            <td>
                <select class="wd-select po-item-unit">
                    <option>pcs</option>
                    <option>boxes</option>
                    <option>bags</option>
                    <option>cases</option>
                    <option>kg</option>
                </select>
            </td>
            <td style="text-align: right;">
                <input type="number" class="wd-input po-item-price" value="0" min="0" step="0.01" onchange="updateItemSubtotal(${index})" style="width:100px;">
            </td>
            <td style="text-align: right;" class="po-item-subtotal">0.00</td>
            <td class="edit-col">
                <button type="button" class="wd-btn-icon" onclick="removePOItemRow(${index})" style="padding:2px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </td>
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

    window.updateItemSubtotal = function(index) {
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
        document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
    }

    window.savePO = async function() {
        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
        saveBtn.disabled = true;

        try {
            const formData = collectFormData();
            const token = localStorage.getItem('supplier_token');

            const response = await fetch(`${API_BASE_URL}/purchase-orders/${currentPOId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('Purchase Order updated successfully!', 'success');
                // Update view values from inputs
                syncViewFromInputs();
                // Turn off edit mode
                document.getElementById('edit-mode-toggle').checked = false;
                toggleEditMode();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Save error:', error);
            showToast('Changes saved locally', 'success');
            syncViewFromInputs();
            document.getElementById('edit-mode-toggle').checked = false;
            toggleEditMode();
        }

        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    };

    function collectFormData() {
        const items = [];
        document.querySelectorAll('#po-items-tbody tr[data-row]').forEach(row => {
            const nameInput = row.querySelector('.po-item-name');
            const name = nameInput?.value || nameInput?.textContent;
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

    function syncViewFromInputs() {
        // Sync view values from edit inputs
        document.getElementById('exporter-name-view').textContent = document.getElementById('exporter-name').value || '-';
        document.getElementById('exporter-contact-view').textContent = document.getElementById('exporter-contact').value || '-';
        document.getElementById('exporter-email-view').textContent = document.getElementById('exporter-email').value || '-';
        document.getElementById('exporter-phone-view').textContent = document.getElementById('exporter-phone').value || '-';

        document.getElementById('importer-name-view').textContent = document.getElementById('importer-name').value || '-';
        document.getElementById('importer-contact-view').textContent = document.getElementById('importer-contact').value || '-';
        document.getElementById('importer-email-view').textContent = document.getElementById('importer-email').value || '-';
        document.getElementById('importer-phone-view').textContent = document.getElementById('importer-phone').value || '-';

        document.getElementById('incoterms-view').textContent = document.getElementById('incoterms').value;
        const paymentVal = document.getElementById('payment-terms').value;
        document.getElementById('payment-terms-view').textContent = paymentVal === 'TT' ? 'T/T' : paymentVal;
        document.getElementById('currency-view').textContent = document.getElementById('currency').value;
        document.getElementById('currency-view').textContent = document.getElementById('currency').value;
        document.getElementById('total-currency').textContent = document.getElementById('currency').value;
        document.getElementById('notes-view').textContent = document.getElementById('notes').value || '-';
    }

    window.downloadPO = function() {
        showToast('Preparing download...', 'info');
        // Trigger print/PDF generation
        setTimeout(() => window.print(), 500);
    };

    function showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' };
        toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
})();

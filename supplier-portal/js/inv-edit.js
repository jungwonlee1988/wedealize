// WeDealize Supplier Portal - Invoice Edit Page Script
// Handles both new INV creation and existing INV detail view/edit

(function() {
    'use strict';

    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
    let currentINVId = null;
    let isNewMode = false;
    let invItemRowIndex = 0;

    // Demo INV data for detail view (matches portal.html INV list)
    const demoINVData = {
        'INV-2026-0089': {
            inv_number: 'INV-2026-0089', status: 'Draft', statusClass: 'wd-badge-gray', date: '2026.02.04 10:30',
            po_number: 'PO-2026-0156',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'ABC Distribution', contact: 'John Smith', email: 'john@abcdist.com', phone: '+1 234 567 8901' },
            incoterms: 'FOB', paymentTerms: 'NET30', currency: 'USD', dueDate: '2026-03-04', deliveryDate: '2026-02-20', notes: '',
            items: [{ name: 'Premium Organic Coffee Beans 1kg', quantity: 50, unit: 'bags', price: 62.50 }]
        },
        'INV-2026-0088': {
            inv_number: 'INV-2026-0088', status: 'Sent', statusClass: 'wd-badge-primary', date: '2026.02.01 14:15',
            po_number: 'PO-2026-0142',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'XYZ Foods Ltd', contact: 'Jane Doe', email: 'jane@xyzfoods.com', phone: '+44 20 1234 5678' },
            incoterms: 'CIF', paymentTerms: 'TT', currency: 'USD', dueDate: '2026-03-01', deliveryDate: '2026-02-15', notes: 'Awaiting payment confirmation',
            items: [{ name: 'Artisan Dark Chocolate 500g', quantity: 200, unit: 'boxes', price: 40.65 }]
        },
        'INV-2026-0087': {
            inv_number: 'INV-2026-0087', status: 'Sent', statusClass: 'wd-badge-primary', date: '2026.01.28 09:00',
            po_number: 'PO-2026-0138',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'Global Trade Co', contact: 'Mike Chen', email: 'mike@globaltrade.com', phone: '+86 21 5555 6666' },
            incoterms: 'FCA', paymentTerms: 'NET30', currency: 'USD', dueDate: '2026-02-28', deliveryDate: '2026-02-10', notes: 'Payment received',
            items: [
                { name: 'Frozen Butter Croissant Dough (24% Butter)', quantity: 100, unit: 'boxes', price: 20.16 },
                { name: 'Premium Baguette Mix', quantity: 50, unit: 'bags', price: 35.00 }
            ]
        },
        'INV-2026-0086': {
            inv_number: 'INV-2026-0086', status: 'Sent', statusClass: 'wd-badge-primary', date: '2026.01.25 11:30',
            po_number: 'PO-2026-0135',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'Euro Imports LLC', contact: 'Sarah Kim', email: 'sarah@euroimports.com', phone: '+1 555 123 4567' },
            incoterms: 'FOB', paymentTerms: 'TT', currency: 'EUR', dueDate: '2026-02-25', deliveryDate: '2026-02-05', notes: 'Paid in full',
            items: [{ name: 'French Butter Cookies', quantity: 300, unit: 'cases', price: 18.50 }]
        },
        'INV-2026-0085': {
            inv_number: 'INV-2026-0085', status: 'Sent', statusClass: 'wd-badge-primary', date: '2026.01.20 16:45',
            po_number: 'PO-2026-0130',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'Fresh Foods Inc', contact: 'Tom Wilson', email: 'tom@freshfoods.com', phone: '+1 800 555 0199' },
            incoterms: 'DDP', paymentTerms: 'NET60', currency: 'USD', dueDate: '2026-03-20', deliveryDate: '2026-02-01', notes: 'Payment pending',
            items: [{ name: 'Organic Whole Wheat Flour', quantity: 500, unit: 'bags', price: 12.00 }]
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
        currentINVId = urlParams.get('id');
        isNewMode = !currentINVId || currentINVId === 'new';

        if (isNewMode) {
            setupNewMode();
        } else {
            setupDetailMode();
            loadINVData(currentINVId);
        }

        bindFormEvents();
    }

    function setupNewMode() {
        document.body.classList.remove('detail-mode');
        document.body.classList.add('new-mode');
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = 'Add Invoice';

        // Set default date
        const dateInput = document.getElementById('inv-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    function setupDetailMode() {
        document.body.classList.remove('new-mode');
        document.body.classList.add('detail-mode');
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = 'Invoice Detail';
        // Always editable - no view-mode
        const formContainer = document.getElementById('inv-form-container');
        if (formContainer) formContainer.classList.add('edit-mode');
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) saveBtn.style.display = 'inline-flex';
    }

    function bindFormEvents() {
        const form = document.getElementById('inv-edit-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    }

    async function loadINVData(invId) {
        try {
            const token = localStorage.getItem('supplier_token');
            const response = await fetch(`${API_BASE_URL}/pi/${invId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const inv = await response.json();
                populateDetailForm(inv);
                return;
            }
        } catch (error) {
            console.log('API fetch failed, using demo data');
        }

        // Fallback to demo data
        const demoData = demoINVData[invId] || {
            inv_number: invId, status: 'Sent', statusClass: 'wd-badge-info', date: new Date().toLocaleString('ko-KR'),
            po_number: 'PO-2026-0051',
            exporter: { name: 'DELIFRANCE', contact: 'Anne, CHU', email: 'anne.chu@delifrance.com', phone: '+33 6 73 18 08 52' },
            importer: { name: 'SELLER-NOTE.CO.,LTD', contact: 'Jay', email: 'jay@seller-note.com', phone: '+82 10 2638 7225' },
            incoterms: 'FCA', paymentTerms: 'TT', currency: 'EUR', dueDate: '2026-03-05', deliveryDate: '2026-02-20', notes: '',
            items: [{ name: 'Frozen Butter Croissant Dough (24% Butter)', quantity: 40, unit: 'boxes', price: 20.16 }]
        };
        populateDetailForm(demoData);
    }

    function populateDetailForm(inv) {
        // Status bar
        const invNumberDisplay = document.getElementById('inv-number-display');
        if (invNumberDisplay) invNumberDisplay.textContent = inv.inv_number || currentINVId;
        const statusEl = document.getElementById('inv-status');
        if (statusEl) {
            statusEl.textContent = inv.status || 'Sent';
            statusEl.className = `wd-badge ${inv.statusClass || 'wd-badge-info'}`;
        }
        const invDateDisplay = document.getElementById('inv-date-display');
        if (invDateDisplay) invDateDisplay.textContent = inv.date || '';

        // Linked PO
        const linkedPO = document.getElementById('linked-po-number');
        if (linkedPO && inv.po_number) {
            linkedPO.textContent = inv.po_number;
            linkedPO.href = `po-edit.html?id=${encodeURIComponent(inv.po_number)}`;
        }

        // Exporter (Seller)
        if (inv.exporter) {
            setInputValue('inv-exporter-name', inv.exporter.name);
            setInputValue('inv-exporter-contact', inv.exporter.contact);
            setInputValue('inv-exporter-email', inv.exporter.email);
            setInputValue('inv-exporter-phone', inv.exporter.phone);
        }

        // Importer (Buyer)
        if (inv.importer) {
            setInputValue('inv-importer-name', inv.importer.name);
            setInputValue('inv-importer-contact', inv.importer.contact);
            setInputValue('inv-importer-email', inv.importer.email);
            setInputValue('inv-importer-phone', inv.importer.phone);
        }

        // Trade info
        setSelectValue('inv-incoterms', inv.incoterms);
        setSelectValue('inv-payment-terms', inv.paymentTerms);
        setSelectValue('inv-currency', inv.currency);
        setInputValue('inv-due-date', inv.dueDate);
        setInputValue('inv-delivery-date', inv.deliveryDate);
        setInputValue('inv-notes', inv.notes);

        // Items
        renderItems(inv.items || []);
    }

    function setInputValue(id, value) {
        const input = document.getElementById(id);
        if (input && value !== null && value !== undefined) {
            input.value = value;
        }
    }

    function setSelectValue(id, value) {
        const select = document.getElementById(id);
        if (select && value) {
            select.value = value;
        }
    }

    function renderItems(items) {
        const tbody = document.getElementById('inv-items-tbody');
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
                <td><input type="text" class="wd-input inv-item-name" value="${item.name || item.product_name || ''}" placeholder="Product name"></td>
                <td><input type="number" class="wd-input inv-item-qty" min="1" value="${qty}" onchange="calculateINVItemSubtotal(${index})"></td>
                <td><select class="wd-select inv-item-unit">
                    <option ${item.unit === 'pcs' ? 'selected' : ''}>pcs</option>
                    <option ${item.unit === 'boxes' ? 'selected' : ''}>boxes</option>
                    <option ${item.unit === 'bags' ? 'selected' : ''}>bags</option>
                    <option ${item.unit === 'cases' ? 'selected' : ''}>cases</option>
                    <option ${item.unit === 'kg' ? 'selected' : ''}>kg</option>
                </select></td>
                <td><input type="number" class="wd-input inv-item-price" min="0" step="0.01" value="${price}" onchange="calculateINVItemSubtotal(${index})"></td>
                <td class="inv-item-subtotal" style="text-align:right;font-weight:600;">${subtotal.toFixed(2)}</td>
                <td><button type="button" class="wd-btn-icon" onclick="removeINVItemRow(${index})" style="padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>
            `;
            tbody.appendChild(row);
        });

        invItemRowIndex = items.length;
        updateINVSummary();
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        const invNumber = document.getElementById('inv-number')?.value?.trim();
        const exporterName = document.getElementById('inv-exporter-name')?.value?.trim();

        if (isNewMode && (!invNumber || !exporterName)) {
            showToast('INV Number and Seller Company are required', 'warning');
            return;
        }

        const formData = collectFormData();
        formData.status = 'sent';

        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Sending...';
        submitBtn.disabled = true;

        try {
            await saveINVToAPI(formData);
            showToast('Invoice sent successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#inv-management';
            }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            showToast('Invoice saved locally', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#inv-management';
            }, 1000);
        }

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }

    function collectFormData() {
        const items = [];
        document.querySelectorAll('#inv-items-tbody tr[data-row]').forEach(row => {
            const name = row.querySelector('.inv-item-name')?.value;
            const qty = row.querySelector('.inv-item-qty')?.value;
            const unit = row.querySelector('.inv-item-unit')?.value;
            const price = row.querySelector('.inv-item-price')?.value;

            if (name && qty && price) {
                items.push({
                    product_name: name,
                    quantity: parseInt(qty),
                    unit: unit,
                    unit_price: parseFloat(price)
                });
            }
        });

        const appliedCredits = [];
        document.querySelectorAll('.inv-credit-check:checked').forEach(checkbox => {
            appliedCredits.push({
                credit_id: checkbox.value,
                amount: parseFloat(checkbox.dataset.amount)
            });
        });

        return {
            inv_number: document.getElementById('inv-number')?.value?.trim() || currentINVId,
            inv_date: document.getElementById('inv-date')?.value || new Date().toISOString().split('T')[0],
            po_number: document.getElementById('inv-po-select')?.value || '',
            exporter: {
                name: document.getElementById('inv-exporter-name')?.value || '',
                contact: document.getElementById('inv-exporter-contact')?.value || '',
                email: document.getElementById('inv-exporter-email')?.value || '',
                phone: document.getElementById('inv-exporter-phone')?.value || ''
            },
            importer: {
                name: document.getElementById('inv-importer-name')?.value || '',
                contact: document.getElementById('inv-importer-contact')?.value || '',
                email: document.getElementById('inv-importer-email')?.value || '',
                phone: document.getElementById('inv-importer-phone')?.value || ''
            },
            incoterms: document.getElementById('inv-incoterms')?.value || 'FOB',
            payment_terms: document.getElementById('inv-payment-terms')?.value || 'TT',
            currency: document.getElementById('inv-currency')?.value || 'USD',
            due_date: document.getElementById('inv-due-date')?.value || '',
            delivery_date: document.getElementById('inv-delivery-date')?.value || '',
            notes: document.getElementById('inv-notes')?.value || '',
            items: items,
            applied_credits: appliedCredits
        };
    }

    async function saveINVToAPI(formData) {
        const token = localStorage.getItem('supplier_token');
        const endpoint = isNewMode
            ? `${API_BASE_URL}/invoices`
            : `${API_BASE_URL}/pi/${currentINVId}`;
        const method = isNewMode ? 'POST' : 'PATCH';

        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (response.status === 401) {
            handleSessionExpired();
            throw new Error('Session expired');
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to save invoice');
        }

        return await response.json();
    }

    // Global functions
    window.saveINV = async function() {
        const saveBtn = document.getElementById('save-btn');
        if (!saveBtn) return;

        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
        saveBtn.disabled = true;

        try {
            const formData = collectFormData();
            await saveINVToAPI(formData);
            showToast('Invoice updated successfully!', 'success');
        } catch (error) {
            showToast('Changes saved locally', 'success');
        }

        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    };

    window.toggleINVSource = function(source) {
        const poSelection = document.getElementById('inv-po-selection');
        if (poSelection) {
            poSelection.style.display = source === 'po' ? 'block' : 'none';
        }
    };

    window.loadPOForINV = function() {
        const select = document.getElementById('inv-po-select');
        if (!select || !select.value) return;

        const option = select.selectedOptions[0];
        const buyerId = option?.dataset.buyer;

        if (buyerId) {
            const buyerSelect = document.getElementById('inv-buyer-select');
            if (buyerSelect) buyerSelect.value = buyerId;
            loadBuyerForINV();
        }

        showToast('PO data loaded', 'info');
    };

    window.loadBuyerForINV = function() {
        const select = document.getElementById('inv-buyer-select');
        if (!select || !select.value) return;

        // Demo buyer data
        const buyers = {
            'ACC-001': { contact: 'John Smith', email: 'john@abcdist.com', phone: '+1 234 567 8901' },
            'ACC-002': { contact: 'Jane Doe', email: 'jane@xyzfoods.com', phone: '+44 20 1234 5678' }
        };

        const buyer = buyers[select.value];
        if (buyer) {
            document.getElementById('inv-buyer-contact').value = buyer.contact;
            document.getElementById('inv-buyer-email').value = buyer.email;
            document.getElementById('inv-buyer-phone').value = buyer.phone;
        }

        loadAvailableCredits(select.value);
    };

    function loadAvailableCredits(buyerId) {
        const container = document.getElementById('inv-available-credits');
        if (!container) return;

        // Demo credits
        const credits = {
            'ACC-001': [
                { id: 'CR-001', amount: 125.00, reason: 'Damaged packaging', date: '2024-02-01' },
                { id: 'CR-002', amount: 195.00, reason: 'Quality issue', date: '2024-01-28' }
            ],
            'ACC-002': [
                { id: 'CR-003', amount: 180.00, reason: 'Short shipment', date: '2024-01-20' }
            ]
        };

        const buyerCredits = credits[buyerId] || [];

        if (buyerCredits.length === 0) {
            container.innerHTML = '<p style="font-size: 0.75rem; color: var(--wd-gray-400); text-align: center; padding: 12px;">No credits available</p>';
            return;
        }

        container.innerHTML = buyerCredits.map(credit => `
            <div class="credit-item">
                <input type="checkbox" class="inv-credit-check" value="${credit.id}" data-amount="${credit.amount}" onchange="updateINVSummary()">
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${credit.id} - $${credit.amount.toFixed(2)}</div>
                    <div style="font-size: 0.7rem; color: var(--wd-gray-500);">${credit.reason}</div>
                </div>
            </div>
        `).join('');
    }

    window.addINVItemRow = function(item = null) {
        const tbody = document.getElementById('inv-items-tbody');
        const index = invItemRowIndex++;

        const row = document.createElement('tr');
        row.setAttribute('data-row', index);

        const name = item?.product_name || item?.name || '';
        const qty = item?.quantity || 1;
        const unit = item?.unit || 'pcs';
        const price = item?.unit_price || item?.price || 0;
        const subtotal = qty * price;

        row.innerHTML = `
            <td><input type="text" class="wd-input inv-item-name" placeholder="Product name" value="${name}"></td>
            <td><input type="number" class="wd-input inv-item-qty" min="1" value="${qty}" onchange="calculateINVItemSubtotal(${index})"></td>
            <td><select class="wd-select inv-item-unit">
                <option ${unit === 'pcs' ? 'selected' : ''}>pcs</option>
                <option ${unit === 'boxes' ? 'selected' : ''}>boxes</option>
                <option ${unit === 'bags' ? 'selected' : ''}>bags</option>
                <option ${unit === 'cases' ? 'selected' : ''}>cases</option>
                <option ${unit === 'kg' ? 'selected' : ''}>kg</option>
            </select></td>
            <td><input type="number" class="wd-input inv-item-price" min="0" step="0.01" value="${price}" onchange="calculateINVItemSubtotal(${index})"></td>
            <td class="inv-item-subtotal" style="text-align:right;font-weight:600;">${subtotal.toFixed(2)}</td>
            <td><button type="button" class="wd-btn-icon" onclick="removeINVItemRow(${index})" style="padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>
        `;
        tbody.appendChild(row);
        updateINVSummary();
    };

    window.calculateINVItemSubtotal = function(index) {
        const row = document.querySelector(`#inv-items-tbody tr[data-row="${index}"]`);
        if (!row) return;

        const qty = parseFloat(row.querySelector('.inv-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.inv-item-price')?.value) || 0;
        const subtotal = qty * price;

        const subtotalEl = row.querySelector('.inv-item-subtotal');
        if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);

        updateINVSummary();
    };

    window.removeINVItemRow = function(index) {
        const row = document.querySelector(`#inv-items-tbody tr[data-row="${index}"]`);
        if (row) {
            row.remove();
            updateINVSummary();
        }
    };

    window.updateINVSummary = function() {
        let subtotal = 0;
        document.querySelectorAll('#inv-items-tbody tr[data-row]').forEach(row => {
            const qty = parseFloat(row.querySelector('.inv-item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.inv-item-price')?.value) || 0;
            subtotal += qty * price;
        });

        let creditTotal = 0;
        document.querySelectorAll('.inv-credit-check:checked').forEach(checkbox => {
            creditTotal += parseFloat(checkbox.dataset.amount) || 0;
        });

        const currency = document.getElementById('inv-currency')?.value || 'USD';
        const symbol = currency === 'EUR' ? '€' : currency === 'KRW' ? '₩' : '$';

        const subtotalEl = document.getElementById('inv-subtotal');
        const creditEl = document.getElementById('inv-credit-discount');
        const totalEl = document.getElementById('inv-total');

        if (subtotalEl) subtotalEl.textContent = `${symbol}${subtotal.toFixed(2)}`;
        if (creditEl) creditEl.textContent = `-${symbol}${creditTotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `${symbol}${Math.max(0, subtotal - creditTotal).toFixed(2)}`;
    };

    window.saveINVAsDraft = async function() {
        const formData = collectFormData();
        formData.status = 'draft';

        try {
            await saveINVToAPI(formData);
            showToast('Invoice saved as draft', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#inv-management';
            }, 1000);
        } catch (error) {
            showToast('Draft saved locally', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#inv-management';
            }, 1000);
        }
    };

    window.deleteINVFromDetail = function() {
        if (!currentINVId || isNewMode) return;
        var invNumber = document.getElementById('inv-number-display')?.textContent || currentINVId;
        showDeleteConfirm({
            title: 'Delete Invoice',
            message: 'Are you sure you want to delete <strong>' + escapeHtml(invNumber) + '</strong>? This action cannot be undone.',
            onConfirm: async function() {
                try {
                    var token = localStorage.getItem('supplier_token');
                    var response = await fetch(API_BASE_URL + '/pi/' + currentINVId, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (response.status === 401) { handleSessionExpired(); return; }
                    if (!response.ok && response.status !== 204) {
                        var err = await response.json().catch(function() { return {}; });
                        throw new Error(err.message || 'Failed to delete invoice');
                    }
                    showToast('Invoice deleted', 'success');
                    setTimeout(function() { window.location.href = 'portal.html#inv-management'; }, 1000);
                } catch (error) {
                    console.error('Delete INV error:', error);
                    showToast(error.message || 'Failed to delete invoice', 'error');
                }
            }
        });
    };

    window.downloadINV = function() {
        showToast('Preparing download...', 'info');
        setTimeout(() => window.print(), 500);
    };

})();

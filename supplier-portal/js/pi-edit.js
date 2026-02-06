// WeDealize Supplier Portal - PI Edit Page Script
// Handles proforma invoice editing on dedicated page

(function() {
    'use strict';

    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
    let currentPIId = null;
    let isNewPI = false;
    let piItemRowIndex = 0;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const token = localStorage.getItem('supplier_token');
        if (!token) {
            window.location.href = 'portal.html';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        currentPIId = urlParams.get('id');
        isNewPI = !currentPIId || currentPIId === 'new';

        if (!isNewPI) {
            const titleEl = document.querySelector('.page-title');
            if (titleEl) {
                titleEl.textContent = 'Edit Proforma Invoice';
                titleEl.setAttribute('data-i18n', 'pi.editPI');
            }
            loadPIData(currentPIId);
        }

        // Set default date
        const dateInput = document.getElementById('pi-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        bindFormEvents();
    }

    function bindFormEvents() {
        const form = document.getElementById('pi-edit-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    }

    async function loadPIData(piId) {
        try {
            const token = localStorage.getItem('supplier_token');
            const response = await fetch(`${API_BASE_URL}/proforma-invoices/${piId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                handleSessionExpired();
                return;
            }

            if (!response.ok) throw new Error('Failed to load PI');

            const pi = await response.json();
            populateForm(pi);
        } catch (error) {
            console.error('Load PI error:', error);
            showToast('Failed to load proforma invoice data', 'error');
            setTimeout(() => {
                window.location.href = 'portal.html#pi-management';
            }, 1500);
        }
    }

    function populateForm(pi) {
        const subtitle = document.getElementById('pi-subtitle');
        if (subtitle) subtitle.textContent = pi.pi_number || '';

        setSelectValue('pi-po-select', pi.po_number);
        setSelectValue('pi-buyer-select', pi.buyer_id);
        setInputValue('pi-date', pi.pi_date);
        setInputValue('pi-notes', pi.notes);

        if (pi.items && pi.items.length > 0) {
            const tbody = document.getElementById('pi-items-tbody');
            tbody.innerHTML = '';
            pi.items.forEach(item => {
                addPIItemRow(item);
            });
        }

        updatePISummary();
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

    async function handleFormSubmit(e) {
        e.preventDefault();

        const buyerSelect = document.getElementById('pi-buyer-select');
        if (!buyerSelect.value) {
            showToast('Please select a buyer', 'warning');
            return;
        }

        const formData = collectFormData();

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Sending...';
        submitBtn.disabled = true;

        try {
            await savePI(formData);
            showToast('Proforma Invoice sent successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#pi-management';
            }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to send proforma invoice', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    function collectFormData() {
        const items = [];
        document.querySelectorAll('#pi-items-tbody tr[data-row]').forEach(row => {
            const productId = row.dataset.productId;
            const name = row.querySelector('.pi-item-name')?.textContent || row.dataset.productName;
            const qty = row.querySelector('.pi-item-qty')?.value;
            const unit = row.querySelector('.pi-item-unit')?.textContent || row.dataset.unit;
            const price = row.querySelector('.pi-item-price')?.value;

            if (name && qty && price) {
                items.push({
                    product_id: productId,
                    product_name: name,
                    quantity: parseInt(qty),
                    unit: unit,
                    unit_price: parseFloat(price)
                });
            }
        });

        const appliedCredits = [];
        document.querySelectorAll('.pi-credit-check:checked').forEach(checkbox => {
            appliedCredits.push({
                credit_id: checkbox.value,
                amount: parseFloat(checkbox.dataset.amount)
            });
        });

        return {
            po_number: document.getElementById('pi-po-select').value,
            buyer_id: document.getElementById('pi-buyer-select').value,
            pi_date: document.getElementById('pi-date').value,
            notes: document.getElementById('pi-notes').value.trim(),
            items: items,
            applied_credits: appliedCredits,
            status: 'sent'
        };
    }

    async function savePI(formData) {
        const token = localStorage.getItem('supplier_token');
        const isUpdate = currentPIId && currentPIId !== 'new';
        const endpoint = isUpdate
            ? `${API_BASE_URL}/proforma-invoices/${currentPIId}`
            : `${API_BASE_URL}/proforma-invoices`;
        const method = isUpdate ? 'PATCH' : 'POST';

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
            throw new Error(err.message || 'Failed to save proforma invoice');
        }

        return await response.json();
    }

    function handleSessionExpired() {
        localStorage.removeItem('supplier_token');
        showToast('Session expired. Please login again.', 'warning');
        setTimeout(() => {
            window.location.href = 'portal.html';
        }, 1500);
    }

    // Global functions
    window.togglePISource = function(source) {
        const poSelection = document.getElementById('pi-po-selection');
        if (poSelection) {
            poSelection.style.display = source === 'po' ? 'block' : 'none';
        }
    };

    window.loadPOForPI = function() {
        const select = document.getElementById('pi-po-select');
        if (!select || !select.value) return;

        const option = select.selectedOptions[0];
        const buyerId = option?.dataset.buyer;

        if (buyerId) {
            const buyerSelect = document.getElementById('pi-buyer-select');
            if (buyerSelect) buyerSelect.value = buyerId;
            loadBuyerForPI();
        }

        showToast('PO data loaded', 'info');
    };

    window.loadBuyerForPI = function() {
        const select = document.getElementById('pi-buyer-select');
        if (!select || !select.value) return;

        const infoCard = document.getElementById('pi-buyer-info-card');
        if (infoCard) infoCard.style.display = 'block';

        // Demo data
        const buyers = {
            'ACC-001': { company: 'ABC Distribution Co.', country: 'USA', credit: '$320.00' },
            'ACC-002': { company: 'XYZ Foods Ltd', country: 'UK', credit: '$180.00' },
            'ACC-003': { company: 'Global Trade Co', country: 'Germany', credit: '$0.00' }
        };

        const buyer = buyers[select.value] || { company: '-', country: '-', credit: '$0.00' };

        document.getElementById('pi-buyer-company-display').textContent = buyer.company;
        document.getElementById('pi-buyer-country-display').textContent = buyer.country;
        document.getElementById('pi-buyer-credit-display').textContent = buyer.credit;

        loadAvailableCredits(select.value);
    };

    function loadAvailableCredits(buyerId) {
        const container = document.getElementById('pi-available-credits');
        const badge = document.getElementById('available-credit-badge');

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
        const totalCredit = buyerCredits.reduce((sum, c) => sum + c.amount, 0);

        if (badge) badge.textContent = `$${totalCredit.toFixed(2)} available`;

        if (buyerCredits.length === 0) {
            container.innerHTML = '<p class="wd-text-muted">No credits available for this buyer</p>';
            return;
        }

        container.innerHTML = buyerCredits.map(credit => `
            <label class="wd-checkbox-card" style="display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 8px;">
                <input type="checkbox" class="pi-credit-check" value="${credit.id}" data-amount="${credit.amount}" onchange="updatePISummary()">
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${credit.id} - $${credit.amount.toFixed(2)}</div>
                    <div class="wd-text-sm wd-text-muted">${credit.reason} (${credit.date})</div>
                </div>
            </label>
        `).join('');
    }

    window.addProductToPI = function() {
        const select = document.getElementById('pi-product-select');
        if (!select || !select.value) {
            showToast('Please select a product', 'warning');
            return;
        }

        const option = select.selectedOptions[0];
        const product = {
            id: select.value,
            name: option.dataset.name,
            price: parseFloat(option.dataset.price),
            unit: option.dataset.unit
        };

        addPIItemRow(product);
        select.value = '';
        updatePISummary();
    };

    function addPIItemRow(item) {
        const tbody = document.getElementById('pi-items-tbody');

        // Remove empty row if exists
        const emptyRow = tbody.querySelector('.wd-empty-row');
        if (emptyRow) emptyRow.remove();

        const index = piItemRowIndex++;
        const row = document.createElement('tr');
        row.setAttribute('data-row', index);
        row.dataset.productId = item.id || item.product_id || '';
        row.dataset.productName = item.name || item.product_name || '';
        row.dataset.unit = item.unit || 'pcs';

        const qty = item.quantity || 1;
        const price = item.price || item.unit_price || 0;
        const subtotal = qty * price;

        row.innerHTML = `
            <td class="pi-item-name">${item.name || item.product_name || ''}</td>
            <td><input type="number" class="wd-input wd-input-sm pi-item-qty" min="1" value="${qty}" onchange="updatePIItemSubtotal(${index})"></td>
            <td class="pi-item-unit">${item.unit || 'pcs'}</td>
            <td><input type="number" class="wd-input wd-input-sm pi-item-price" min="0" step="0.01" value="${price.toFixed(2)}" onchange="updatePIItemSubtotal(${index})"></td>
            <td class="pi-item-subtotal wd-text-right wd-text-bold">$${subtotal.toFixed(2)}</td>
            <td>
                <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePIItemRow(${index})" title="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    }

    window.updatePIItemSubtotal = function(index) {
        const row = document.querySelector(`#pi-items-tbody tr[data-row="${index}"]`);
        if (!row) return;

        const qty = parseFloat(row.querySelector('.pi-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.pi-item-price')?.value) || 0;
        const subtotal = qty * price;

        const subtotalEl = row.querySelector('.pi-item-subtotal');
        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

        updatePISummary();
    };

    window.removePIItemRow = function(index) {
        const row = document.querySelector(`#pi-items-tbody tr[data-row="${index}"]`);
        if (row) {
            row.remove();
            updatePISummary();

            // Show empty row if no items
            const tbody = document.getElementById('pi-items-tbody');
            if (!tbody.querySelector('tr[data-row]')) {
                tbody.innerHTML = `
                    <tr class="wd-empty-row">
                        <td colspan="6" style="text-align: center; color: var(--wd-gray-400); padding: 32px;">
                            No items added yet. Select a product and click "Add Product".
                        </td>
                    </tr>
                `;
            }
        }
    };

    window.updatePISummary = function() {
        let subtotal = 0;
        document.querySelectorAll('#pi-items-tbody tr[data-row]').forEach(row => {
            const qty = parseFloat(row.querySelector('.pi-item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.pi-item-price')?.value) || 0;
            subtotal += qty * price;
        });

        let creditTotal = 0;
        document.querySelectorAll('.pi-credit-check:checked').forEach(checkbox => {
            creditTotal += parseFloat(checkbox.dataset.amount) || 0;
        });

        const subtotalEl = document.getElementById('pi-subtotal');
        const creditEl = document.getElementById('pi-credit-discount');
        const totalEl = document.getElementById('pi-total');

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (creditEl) creditEl.textContent = `-$${creditTotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${Math.max(0, subtotal - creditTotal).toFixed(2)}`;
    };

    window.savePIAsDraft = async function() {
        const formData = collectFormData();
        formData.status = 'draft';

        try {
            await savePI(formData);
            showToast('Proforma Invoice saved as draft', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#pi-management';
            }, 1000);
        } catch (error) {
            showToast(error.message || 'Failed to save draft', 'error');
        }
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

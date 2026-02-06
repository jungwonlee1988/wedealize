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
        setInputValue('pi-number', pi.pi_number);
        setInputValue('pi-date', pi.pi_date);
        setSelectValue('pi-po-select', pi.po_number);
        setSelectValue('pi-buyer-select', pi.buyer_id);
        setInputValue('pi-buyer-contact', pi.buyer_contact);
        setInputValue('pi-buyer-email', pi.buyer_email);
        setInputValue('pi-buyer-phone', pi.buyer_phone);
        setSelectValue('pi-currency', pi.currency);
        setSelectValue('pi-incoterms', pi.incoterms);
        setSelectValue('pi-payment-terms', pi.payment_terms);
        setInputValue('pi-validity', pi.validity_date);
        setInputValue('pi-delivery-date', pi.delivery_date);
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

        const piNumber = document.getElementById('pi-number').value.trim();
        const buyerSelect = document.getElementById('pi-buyer-select');

        if (!piNumber) {
            showToast('PI Number is required', 'warning');
            return;
        }

        if (!buyerSelect.value) {
            showToast('Please select a buyer', 'warning');
            return;
        }

        const formData = collectFormData();

        const submitBtn = document.querySelector('button[type="submit"]');
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
            const name = row.querySelector('.pi-item-name')?.value || row.querySelector('.pi-item-name')?.textContent;
            const qty = row.querySelector('.pi-item-qty')?.value;
            const unit = row.querySelector('.pi-item-unit')?.value || row.querySelector('.pi-item-unit')?.textContent;
            const price = row.querySelector('.pi-item-price')?.value;

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
        document.querySelectorAll('.pi-credit-check:checked').forEach(checkbox => {
            appliedCredits.push({
                credit_id: checkbox.value,
                amount: parseFloat(checkbox.dataset.amount)
            });
        });

        return {
            pi_number: document.getElementById('pi-number').value.trim(),
            pi_date: document.getElementById('pi-date').value,
            po_number: document.getElementById('pi-po-select').value,
            buyer_id: document.getElementById('pi-buyer-select').value,
            buyer_contact: document.getElementById('pi-buyer-contact').value.trim(),
            buyer_email: document.getElementById('pi-buyer-email').value.trim(),
            buyer_phone: document.getElementById('pi-buyer-phone').value.trim(),
            currency: document.getElementById('pi-currency').value,
            incoterms: document.getElementById('pi-incoterms').value,
            payment_terms: document.getElementById('pi-payment-terms').value,
            validity_date: document.getElementById('pi-validity').value,
            delivery_date: document.getElementById('pi-delivery-date').value,
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

        // Demo buyer data
        const buyers = {
            'ACC-001': { contact: 'John Smith', email: 'john@abcdist.com', phone: '+1 234 567 8901' },
            'ACC-002': { contact: 'Jane Doe', email: 'jane@xyzfoods.com', phone: '+44 20 1234 5678' }
        };

        const buyer = buyers[select.value];
        if (buyer) {
            document.getElementById('pi-buyer-contact').value = buyer.contact;
            document.getElementById('pi-buyer-email').value = buyer.email;
            document.getElementById('pi-buyer-phone').value = buyer.phone;
        }

        loadAvailableCredits(select.value);
    };

    function loadAvailableCredits(buyerId) {
        const container = document.getElementById('pi-available-credits');

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
                <input type="checkbox" class="pi-credit-check" value="${credit.id}" data-amount="${credit.amount}" onchange="updatePISummary()">
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${credit.id} - $${credit.amount.toFixed(2)}</div>
                    <div style="font-size: 0.7rem; color: var(--wd-gray-500);">${credit.reason}</div>
                </div>
            </div>
        `).join('');
    }

    window.addPIItemRow = function(item = null) {
        const tbody = document.getElementById('pi-items-tbody');
        const index = piItemRowIndex++;

        const row = document.createElement('tr');
        row.setAttribute('data-row', index);

        const name = item?.product_name || item?.name || '';
        const qty = item?.quantity || 1;
        const unit = item?.unit || 'pcs';
        const price = item?.unit_price || item?.price || 0;
        const subtotal = qty * price;

        row.innerHTML = `
            <td><input type="text" class="wd-input pi-item-name" placeholder="Product name" value="${name}"></td>
            <td><input type="number" class="wd-input pi-item-qty" min="1" value="${qty}" onchange="calculatePIItemSubtotal(${index})"></td>
            <td><select class="wd-select pi-item-unit">
                <option ${unit === 'pcs' ? 'selected' : ''}>pcs</option>
                <option ${unit === 'boxes' ? 'selected' : ''}>boxes</option>
                <option ${unit === 'cases' ? 'selected' : ''}>cases</option>
                <option ${unit === 'kg' ? 'selected' : ''}>kg</option>
            </select></td>
            <td><input type="number" class="wd-input pi-item-price" min="0" step="0.01" value="${price}" onchange="calculatePIItemSubtotal(${index})"></td>
            <td class="pi-item-subtotal" style="text-align:right;font-weight:600;">${subtotal.toFixed(2)}</td>
            <td><button type="button" class="wd-btn-icon" onclick="removePIItemRow(${index})" style="padding:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>
        `;
        tbody.appendChild(row);
        updatePISummary();
    };

    window.calculatePIItemSubtotal = function(index) {
        const row = document.querySelector(`#pi-items-tbody tr[data-row="${index}"]`);
        if (!row) return;

        const qty = parseFloat(row.querySelector('.pi-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.pi-item-price')?.value) || 0;
        const subtotal = qty * price;

        const subtotalEl = row.querySelector('.pi-item-subtotal');
        if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);

        updatePISummary();
    };

    window.removePIItemRow = function(index) {
        const row = document.querySelector(`#pi-items-tbody tr[data-row="${index}"]`);
        if (row) {
            row.remove();
            updatePISummary();
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

        const currency = document.getElementById('pi-currency')?.value || 'USD';
        const symbol = currency === 'EUR' ? '€' : currency === 'KRW' ? '₩' : '$';

        const subtotalEl = document.getElementById('pi-subtotal');
        const creditEl = document.getElementById('pi-credit-discount');
        const totalEl = document.getElementById('pi-total');

        if (subtotalEl) subtotalEl.textContent = `${symbol}${subtotal.toFixed(2)}`;
        if (creditEl) creditEl.textContent = `-${symbol}${creditTotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `${symbol}${Math.max(0, subtotal - creditTotal).toFixed(2)}`;
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

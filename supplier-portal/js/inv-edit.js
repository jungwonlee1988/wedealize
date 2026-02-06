// WeDealize Supplier Portal - Invoice Edit Page Script
// Handles invoice editing on dedicated page

(function() {
    'use strict';

    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
    let currentINVId = null;
    let isNewINV = false;
    let invItemRowIndex = 0;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const token = localStorage.getItem('supplier_token');
        if (!token) {
            window.location.href = 'portal.html';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        currentINVId = urlParams.get('id');
        isNewINV = !currentINVId || currentINVId === 'new';

        if (!isNewINV) {
            const titleEl = document.querySelector('.page-title');
            if (titleEl) {
                titleEl.textContent = 'Edit Invoice';
                titleEl.setAttribute('data-i18n', 'inv.editINV');
            }
            loadINVData(currentINVId);
        }

        // Set default date
        const dateInput = document.getElementById('inv-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        bindFormEvents();
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
            const response = await fetch(`${API_BASE_URL}/invoices/${invId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                handleSessionExpired();
                return;
            }

            if (!response.ok) throw new Error('Failed to load invoice');

            const inv = await response.json();
            populateForm(inv);
        } catch (error) {
            console.error('Load invoice error:', error);
            showToast('Failed to load invoice data', 'error');
            setTimeout(() => {
                window.location.href = 'portal.html#inv-management';
            }, 1500);
        }
    }

    function populateForm(inv) {
        setInputValue('inv-number', inv.inv_number);
        setInputValue('inv-date', inv.inv_date);
        setSelectValue('inv-po-select', inv.po_number);
        setSelectValue('inv-buyer-select', inv.buyer_id);
        setInputValue('inv-buyer-contact', inv.buyer_contact);
        setInputValue('inv-buyer-email', inv.buyer_email);
        setInputValue('inv-buyer-phone', inv.buyer_phone);
        setSelectValue('inv-currency', inv.currency);
        setSelectValue('inv-incoterms', inv.incoterms);
        setSelectValue('inv-payment-terms', inv.payment_terms);
        setInputValue('inv-due-date', inv.due_date);
        setInputValue('inv-delivery-date', inv.delivery_date);
        setInputValue('inv-notes', inv.notes);

        if (inv.items && inv.items.length > 0) {
            const tbody = document.getElementById('inv-items-tbody');
            tbody.innerHTML = '';
            inv.items.forEach(item => {
                addINVItemRow(item);
            });
        }

        updateINVSummary();
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

        const invNumber = document.getElementById('inv-number').value.trim();
        const buyerSelect = document.getElementById('inv-buyer-select');

        if (!invNumber) {
            showToast('INV Number is required', 'warning');
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
            await saveINV(formData);
            showToast('Invoice sent successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#inv-management';
            }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to send invoice', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    function collectFormData() {
        const items = [];
        document.querySelectorAll('#inv-items-tbody tr[data-row]').forEach(row => {
            const name = row.querySelector('.inv-item-name')?.value || row.querySelector('.inv-item-name')?.textContent;
            const qty = row.querySelector('.inv-item-qty')?.value;
            const unit = row.querySelector('.inv-item-unit')?.value || row.querySelector('.inv-item-unit')?.textContent;
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
            inv_number: document.getElementById('inv-number').value.trim(),
            inv_date: document.getElementById('inv-date').value,
            po_number: document.getElementById('inv-po-select').value,
            buyer_id: document.getElementById('inv-buyer-select').value,
            buyer_contact: document.getElementById('inv-buyer-contact').value.trim(),
            buyer_email: document.getElementById('inv-buyer-email').value.trim(),
            buyer_phone: document.getElementById('inv-buyer-phone').value.trim(),
            currency: document.getElementById('inv-currency').value,
            incoterms: document.getElementById('inv-incoterms').value,
            payment_terms: document.getElementById('inv-payment-terms').value,
            due_date: document.getElementById('inv-due-date').value,
            delivery_date: document.getElementById('inv-delivery-date').value,
            notes: document.getElementById('inv-notes').value.trim(),
            items: items,
            applied_credits: appliedCredits,
            status: 'sent'
        };
    }

    async function saveINV(formData) {
        const token = localStorage.getItem('supplier_token');
        const isUpdate = currentINVId && currentINVId !== 'new';
        const endpoint = isUpdate
            ? `${API_BASE_URL}/invoices/${currentINVId}`
            : `${API_BASE_URL}/invoices`;
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
            throw new Error(err.message || 'Failed to save invoice');
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
            await saveINV(formData);
            showToast('Invoice saved as draft', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#inv-management';
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

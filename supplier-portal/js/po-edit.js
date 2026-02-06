// WeDealize Supplier Portal - PO Edit Page Script
// Handles purchase order editing on dedicated page

(function() {
    'use strict';

    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
    let currentPOId = null;
    let isNewPO = false;
    let poItemRowIndex = 0;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const token = localStorage.getItem('supplier_token');
        if (!token) {
            window.location.href = 'portal.html';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        currentPOId = urlParams.get('id');
        isNewPO = !currentPOId || currentPOId === 'new';

        // Update page title for edit mode
        if (!isNewPO) {
            const titleEl = document.querySelector('.page-title');
            if (titleEl) {
                titleEl.textContent = 'Edit Purchase Order';
                titleEl.setAttribute('data-i18n', 'po.editPO');
            }
            loadPOData(currentPOId);
        }

        // Set default date to today
        const dateInput = document.getElementById('po-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        bindFormEvents();
        setupDragDrop();
    }

    function bindFormEvents() {
        const form = document.getElementById('po-edit-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    }

    function setupDragDrop() {
        const uploadArea = document.getElementById('po-upload-area');
        if (!uploadArea) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            });
        });

        uploadArea.addEventListener('drop', handlePOFileUpload);
    }

    async function loadPOData(poId) {
        try {
            const token = localStorage.getItem('supplier_token');
            const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                handleSessionExpired();
                return;
            }

            if (!response.ok) throw new Error('Failed to load PO');

            const po = await response.json();
            populateForm(po);
        } catch (error) {
            console.error('Load PO error:', error);
            showToast('Failed to load purchase order data', 'error');
            setTimeout(() => {
                window.location.href = 'portal.html#po-management';
            }, 1500);
        }
    }

    function populateForm(po) {
        const subtitle = document.getElementById('po-subtitle');
        if (subtitle) subtitle.textContent = po.po_number || '';

        setInputValue('po-number', po.po_number);
        setInputValue('po-date', po.order_date);
        setInputValue('po-buyer-company', po.buyer_company);
        setInputValue('po-buyer-contact', po.buyer_contact);
        setInputValue('po-buyer-email', po.buyer_email);
        setInputValue('po-buyer-phone', po.buyer_phone);
        setInputValue('po-buyer-address', po.buyer_address);
        setSelectValue('po-currency', po.currency);
        setSelectValue('po-incoterms', po.incoterms);
        setSelectValue('po-payment-terms', po.payment_terms);
        setInputValue('po-notes', po.notes);

        if (po.items && po.items.length > 0) {
            const tbody = document.getElementById('po-items-tbody');
            tbody.innerHTML = '';
            po.items.forEach((item, index) => {
                addPOItemRow(item);
            });
        }

        updatePOTotal();
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

        const poNumber = document.getElementById('po-number').value.trim();
        const buyerCompany = document.getElementById('po-buyer-company').value.trim();

        if (!poNumber || !buyerCompany) {
            showToast('PO Number and Company Name are required', 'warning');
            return;
        }

        const formData = collectFormData();

        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
        submitBtn.disabled = true;

        try {
            await savePO(formData);
            showToast('Purchase Order saved successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#po-management';
            }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to save purchase order', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
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
            po_number: document.getElementById('po-number').value.trim(),
            order_date: document.getElementById('po-date').value,
            buyer_company: document.getElementById('po-buyer-company').value.trim(),
            buyer_contact: document.getElementById('po-buyer-contact').value.trim(),
            buyer_email: document.getElementById('po-buyer-email').value.trim(),
            buyer_phone: document.getElementById('po-buyer-phone').value.trim(),
            buyer_address: document.getElementById('po-buyer-address').value.trim(),
            currency: document.getElementById('po-currency').value,
            incoterms: document.getElementById('po-incoterms').value,
            payment_terms: document.getElementById('po-payment-terms').value,
            notes: document.getElementById('po-notes').value.trim(),
            items: items
        };
    }

    async function savePO(formData) {
        const token = localStorage.getItem('supplier_token');
        const isUpdate = currentPOId && currentPOId !== 'new';
        const endpoint = isUpdate
            ? `${API_BASE_URL}/purchase-orders/${currentPOId}`
            : `${API_BASE_URL}/purchase-orders`;
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
            throw new Error(err.message || 'Failed to save purchase order');
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
    window.handlePOFileUpload = function(event) {
        event.preventDefault();
        const files = event.dataTransfer?.files || event.target?.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

        if (!allowedTypes.includes(file.type)) {
            showToast('Invalid file type', 'error');
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            showToast('File too large (max 20MB)', 'error');
            return;
        }

        const uploadedFileEl = document.getElementById('po-uploaded-file');
        const filenameEl = document.getElementById('po-uploaded-filename');
        if (uploadedFileEl && filenameEl) {
            filenameEl.textContent = file.name;
            uploadedFileEl.style.display = 'flex';
        }

        const fileInput = document.getElementById('po-file-input');
        if (fileInput) fileInput.value = '';
    };

    window.removePOFile = function() {
        const uploadedFileEl = document.getElementById('po-uploaded-file');
        if (uploadedFileEl) uploadedFileEl.style.display = 'none';
        const fileInput = document.getElementById('po-file-input');
        if (fileInput) fileInput.value = '';
    };

    window.addPOItemRow = function(item = null) {
        const tbody = document.getElementById('po-items-tbody');
        const index = poItemRowIndex++;

        const row = document.createElement('tr');
        row.setAttribute('data-row', index);
        row.innerHTML = `
            <td><input type="text" class="wd-input wd-input-sm po-item-name" required placeholder="Product name" value="${item?.product_name || ''}"></td>
            <td><input type="number" class="wd-input wd-input-sm po-item-qty" required min="1" value="${item?.quantity || 1}" onchange="calculatePOItemSubtotal(${index})"></td>
            <td>
                <select class="wd-select wd-select-sm po-item-unit">
                    <option value="pcs" ${item?.unit === 'pcs' ? 'selected' : ''}>pcs</option>
                    <option value="boxes" ${item?.unit === 'boxes' ? 'selected' : ''}>boxes</option>
                    <option value="cases" ${item?.unit === 'cases' ? 'selected' : ''}>cases</option>
                    <option value="pallets" ${item?.unit === 'pallets' ? 'selected' : ''}>pallets</option>
                    <option value="kg" ${item?.unit === 'kg' ? 'selected' : ''}>kg</option>
                    <option value="lbs" ${item?.unit === 'lbs' ? 'selected' : ''}>lbs</option>
                    <option value="liters" ${item?.unit === 'liters' ? 'selected' : ''}>liters</option>
                </select>
            </td>
            <td><input type="number" class="wd-input wd-input-sm po-item-price" required min="0" step="0.01" value="${item?.unit_price || 0}" onchange="calculatePOItemSubtotal(${index})"></td>
            <td class="po-item-subtotal wd-text-right wd-text-bold">${((item?.quantity || 1) * (item?.unit_price || 0)).toFixed(2)}</td>
            <td>
                <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePOItemRow(${index})" title="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(row);
        updatePOTotal();
    };

    window.removePOItemRow = function(index) {
        const row = document.querySelector(`#po-items-tbody tr[data-row="${index}"]`);
        if (row) {
            row.remove();
            updatePOTotal();
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

        updatePOTotal();
    };

    window.updatePOTotal = function() {
        let total = 0;
        document.querySelectorAll('#po-items-tbody tr[data-row]').forEach(row => {
            const qty = parseFloat(row.querySelector('.po-item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.po-item-price')?.value) || 0;
            total += qty * price;
        });

        const totalEl = document.getElementById('po-total');
        if (totalEl) totalEl.textContent = total.toFixed(2);
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

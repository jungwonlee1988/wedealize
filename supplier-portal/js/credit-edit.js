// WeDealize Supplier Portal - Credit Edit Page Script
// Handles credit editing on dedicated page

(function() {
    'use strict';

    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
    let currentCreditId = null;
    let isNewCredit = false;
    let uploadedFiles = [];

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const token = localStorage.getItem('supplier_token');
        if (!token) {
            window.location.href = 'portal.html';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        currentCreditId = urlParams.get('id');
        isNewCredit = !currentCreditId || currentCreditId === 'new';

        if (isNewCredit) {
            document.body.classList.remove('detail-mode');
            document.body.classList.add('new-mode');
        } else {
            document.body.classList.remove('new-mode');
            document.body.classList.add('detail-mode');
            const titleEl = document.querySelector('.page-title');
            if (titleEl) titleEl.textContent = 'Credit Detail';
            loadCreditData(currentCreditId);
        }

        bindFormEvents();
        setupDragDrop();
    }

    function bindFormEvents() {
        const form = document.getElementById('credit-edit-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    }

    function setupDragDrop() {
        const uploadArea = document.getElementById('credit-upload-area');
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

        uploadArea.addEventListener('drop', (e) => {
            handleCreditFiles({ target: { files: e.dataTransfer.files } });
        });
    }

    async function loadCreditData(creditId) {
        try {
            const token = localStorage.getItem('supplier_token');
            const response = await fetch(`${API_BASE_URL}/credits/${creditId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                handleSessionExpired();
                return;
            }

            if (!response.ok) throw new Error('Failed to load credit');

            const credit = await response.json();
            populateForm(credit);
        } catch (error) {
            console.error('Load credit error:', error);
            showToast('Failed to load credit data', 'error');
            setTimeout(() => {
                window.location.href = 'portal.html#credit-management';
            }, 1500);
        }
    }

    function populateForm(credit) {
        // Status bar
        var numberEl = document.getElementById('credit-number-display');
        if (numberEl) numberEl.textContent = credit.credit_number || currentCreditId;
        var statusEl = document.getElementById('credit-status-badge');
        if (statusEl) {
            statusEl.textContent = credit.status || 'draft';
            statusEl.className = 'wd-badge ' + (window.getStatusBadgeClass ? getStatusBadgeClass(credit.status) : 'wd-badge-info');
        }
        var dateEl = document.getElementById('credit-date-display');
        if (dateEl) dateEl.textContent = credit.created_at ? wdFormatDate(credit.created_at) : '';

        setSelectValue('credit-invoice-select', credit.invoice_number);
        setSelectValue('credit-product-select', credit.product_name);
        setSelectValue('credit-reason', credit.reason);
        setInputValue('credit-qty', credit.affected_quantity);
        setInputValue('credit-amount', credit.amount);
        setInputValue('credit-description', credit.description);
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

        const invoiceSelect = document.getElementById('credit-invoice-select');
        const productSelect = document.getElementById('credit-product-select');
        const reason = document.getElementById('credit-reason').value;
        const qty = document.getElementById('credit-qty').value;
        const amount = document.getElementById('credit-amount').value;

        if (!invoiceSelect.value || !productSelect.value || !reason || !qty || !amount) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }

        const formData = collectFormData();
        formData.status = 'submitted';

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
        submitBtn.disabled = true;

        try {
            await saveCredit(formData);
            showToast('Credit submitted successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#credit-management';
            }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to submit credit', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    function collectFormData() {
        var invoiceSelect = document.getElementById('credit-invoice-select');
        var productSelect = document.getElementById('credit-product-select');
        return {
            invoiceNumber: invoiceSelect.value,
            buyerName: invoiceSelect.options[invoiceSelect.selectedIndex]?.text?.split(' - ')[1] || '',
            productName: productSelect.options[productSelect.selectedIndex]?.text || '',
            reason: document.getElementById('credit-reason').value,
            affectedQuantity: parseInt(document.getElementById('credit-qty').value),
            amount: parseFloat(document.getElementById('credit-amount').value),
            description: document.getElementById('credit-description').value.trim()
        };
    }

    async function saveCredit(formData) {
        const token = localStorage.getItem('supplier_token');
        const isUpdate = currentCreditId && currentCreditId !== 'new';
        const endpoint = isUpdate
            ? `${API_BASE_URL}/credits/${currentCreditId}`
            : `${API_BASE_URL}/credits`;
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
            throw new Error(err.message || 'Failed to save credit');
        }

        return await response.json();
    }

    // Global functions
    window.loadInvoiceProducts = function() {
        const invoiceSelect = document.getElementById('credit-invoice-select');
        const productSelect = document.getElementById('credit-product-select');

        if (!invoiceSelect.value) {
            productSelect.innerHTML = '<option value="">Select Invoice first...</option>';
            return;
        }

        // Demo products based on invoice
        const products = {
            'INV-2024-0089': [
                { id: 'PROD-001', name: 'Extra Virgin Olive Oil 500ml' },
                { id: 'PROD-002', name: 'Aged Parmesan 24 months 1kg' }
            ],
            'INV-2024-0088': [
                { id: 'PROD-003', name: 'Organic Honey 350g' },
                { id: 'PROD-004', name: 'Balsamic Vinegar 250ml' }
            ],
            'INV-2024-0087': [
                { id: 'PROD-005', name: 'Truffle Oil 100ml' },
                { id: 'PROD-006', name: 'Dried Pasta 500g' }
            ]
        };

        const invoiceProducts = products[invoiceSelect.value] || [];

        productSelect.innerHTML = '<option value="">Select a product...</option>' +
            invoiceProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    };

    window.handleCreditFiles = function(event) {
        const files = event.target?.files;
        if (!files || files.length === 0) return;

        const fileList = document.getElementById('credit-file-list');

        Array.from(files).forEach(file => {
            // Validate file type
            if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                showToast(`Invalid file type: ${file.name}`, 'error');
                return;
            }

            // Validate file size (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                showToast(`File too large: ${file.name} (max 10MB)`, 'error');
                return;
            }

            uploadedFiles.push(file);

            const fileItem = document.createElement('div');
            fileItem.className = 'wd-uploaded-file';
            fileItem.style.display = 'flex';
            fileItem.style.alignItems = 'center';
            fileItem.style.justifyContent = 'space-between';
            fileItem.style.padding = '8px 12px';
            fileItem.style.background = 'var(--wd-gray-50)';
            fileItem.style.borderRadius = '6px';
            fileItem.style.marginBottom = '8px';

            fileItem.innerHTML = `
                <div class="wd-file-info" style="display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${file.type.startsWith('image/')
                            ? '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'
                            : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'}
                    </svg>
                    <span>${file.name}</span>
                    <span class="wd-text-muted wd-text-sm">(${(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button type="button" class="wd-btn-icon" onclick="removeCreditFile(this, '${file.name}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            `;

            fileList.appendChild(fileItem);
        });

        // Reset file input
        const fileInput = document.getElementById('credit-files');
        if (fileInput) fileInput.value = '';
    };

    window.removeCreditFile = function(button, filename) {
        uploadedFiles = uploadedFiles.filter(f => f.name !== filename);
        button.closest('.wd-uploaded-file').remove();
    };

    window.deleteCreditFromDetail = function() {
        if (!currentCreditId || isNewCredit) return;
        var creditNumber = document.getElementById('credit-number-display')?.textContent || currentCreditId;
        showDeleteConfirm({
            title: 'Delete Credit',
            message: 'Are you sure you want to delete <strong>' + escapeHtml(creditNumber) + '</strong>? This action cannot be undone.',
            onConfirm: async function() {
                try {
                    var token = localStorage.getItem('supplier_token');
                    var response = await fetch(API_BASE_URL + '/credits/' + currentCreditId, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (response.status === 401) { handleSessionExpired(); return; }
                    if (!response.ok && response.status !== 204) {
                        var err = await response.json().catch(function() { return {}; });
                        throw new Error(err.message || 'Failed to delete credit');
                    }
                    showToast('Credit deleted', 'success');
                    setTimeout(function() { window.location.href = 'portal.html#credit-management'; }, 1000);
                } catch (error) {
                    console.error('Delete credit error:', error);
                    showToast(error.message || 'Failed to delete credit', 'error');
                }
            }
        });
    };

    window.saveCreditChanges = async function() {
        var saveBtn = document.getElementById('save-btn');
        if (!saveBtn) return;
        var originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
        saveBtn.disabled = true;

        try {
            var formData = collectFormData();
            await saveCredit(formData);
            showToast('Credit updated successfully!', 'success');
        } catch (error) {
            showToast(error.message || 'Failed to update credit', 'error');
        }

        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    };

    window.saveCreditAsDraft = async function() {
        const formData = collectFormData();
        formData.status = 'draft';

        try {
            await saveCredit(formData);
            showToast('Credit saved as draft', 'success');
            setTimeout(() => {
                window.location.href = 'portal.html#credit-management';
            }, 1000);
        } catch (error) {
            showToast(error.message || 'Failed to save draft', 'error');
        }
    };

})();

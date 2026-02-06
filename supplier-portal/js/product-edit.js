// WeDealize Supplier Portal - Product Edit Page Script
// Handles both new product creation and existing product detail view/edit

(function() {
    'use strict';

    // Configuration - use same API as main app
    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
    let currentProductId = null;
    let isNewMode = false;

    // Demo Product data for detail view (matching portal.html Product List)
    const demoProductData = {
        '1': {
            id: '1',
            name: 'Extra Virgin Olive Oil 500ml',
            sku: 'OIL-001',
            category: 'oils',
            categoryName: 'Oils & Vinegars',
            status: 'active',
            statusLabel: 'Complete',
            statusClass: 'wd-badge-success',
            description: 'Premium cold-pressed extra virgin olive oil from Andalusia, Spain. Rich flavor with fruity notes.',
            minPrice: 7.20,
            maxPrice: 8.50,
            moq: 200,
            moqUnit: 'bottles',
            leadTime: 14,
            certifications: ['organic', 'haccp'],
            notes: 'Store in cool, dry place away from direct sunlight.',
            updatedAt: '2026.02.05'
        },
        '2': {
            id: '2',
            name: 'Balsamic Vinegar of Modena IGP',
            sku: 'VIN-002',
            category: 'oils',
            categoryName: 'Oils & Vinegars',
            status: 'active',
            statusLabel: 'Complete',
            statusClass: 'wd-badge-success',
            description: 'Authentic balsamic vinegar from Modena, Italy. Aged 12 years in oak barrels.',
            minPrice: 12.00,
            maxPrice: 15.00,
            moq: 100,
            moqUnit: 'bottles',
            leadTime: 21,
            certifications: ['igp'],
            notes: '',
            updatedAt: '2026.02.04'
        },
        '3': {
            id: '3',
            name: 'Aged Parmesan 24 months',
            sku: 'CHE-003',
            category: 'dairy',
            categoryName: 'Dairy & Cheese',
            status: 'active',
            statusLabel: 'Incomplete',
            statusClass: 'wd-badge-warning',
            description: 'Parmigiano-Reggiano DOP aged for 24 months. Produced in Emilia-Romagna region.',
            minPrice: 18.00,
            maxPrice: 22.00,
            moq: null,
            moqUnit: '',
            leadTime: 30,
            certifications: ['dop'],
            notes: 'Keep refrigerated.',
            updatedAt: '2026.02.03'
        },
        '4': {
            id: '4',
            name: 'Organic Raw Honey 500g',
            sku: 'HON-004',
            category: 'honey',
            categoryName: 'Honey & Spreads',
            status: 'active',
            statusLabel: 'Complete',
            statusClass: 'wd-badge-success',
            description: 'Pure raw honey from wildflower meadows. Unpasteurized and unfiltered.',
            minPrice: 8.50,
            maxPrice: 10.00,
            moq: 150,
            moqUnit: 'pieces',
            leadTime: 10,
            certifications: ['organic', 'non-gmo'],
            notes: 'May crystallize over time - this is natural.',
            updatedAt: '2026.02.02'
        },
        '5': {
            id: '5',
            name: 'Artisan Pasta Collection',
            sku: 'PAS-005',
            category: 'pasta',
            categoryName: 'Pasta & Grains',
            status: 'draft',
            statusLabel: 'Draft',
            statusClass: 'wd-badge-gray',
            description: 'Hand-crafted bronze die pasta made with 100% durum wheat semolina.',
            minPrice: 3.50,
            maxPrice: 4.50,
            moq: 500,
            moqUnit: 'pieces',
            leadTime: 7,
            certifications: ['vegan'],
            notes: '',
            updatedAt: '2026.01.30'
        }
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', init);

    /**
     * Initialize the product edit page
     */
    function init() {
        // Check authentication
        const token = localStorage.getItem('supplier_token');
        if (!token) {
            window.location.href = 'portal.html';
            return;
        }

        // Parse product ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        currentProductId = urlParams.get('id');
        isNewMode = !currentProductId || currentProductId === 'new';

        if (isNewMode) {
            setupNewMode();
        } else {
            setupDetailMode();
            loadProductData(currentProductId);
        }

        // Bind form events
        bindFormEvents();
    }

    /**
     * Setup new product mode
     */
    function setupNewMode() {
        document.body.classList.remove('detail-mode');
        document.body.classList.add('new-mode');
        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            titleEl.textContent = 'Add New Product';
        }
    }

    /**
     * Setup detail view mode
     */
    function setupDetailMode() {
        document.body.classList.remove('new-mode');
        document.body.classList.add('detail-mode');
        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            titleEl.textContent = 'Product Detail';
        }
        // Always editable - no view-mode
        const formContainer = document.getElementById('product-form-container');
        if (formContainer) {
            formContainer.classList.add('edit-mode');
        }
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) saveBtn.style.display = 'inline-flex';
    }

    /**
     * Bind form events
     */
    function bindFormEvents() {
        // Form submission
        const form = document.getElementById('product-edit-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }

        // Image upload
        const imageInput = document.getElementById('product-image');
        if (imageInput) {
            imageInput.addEventListener('change', handleImageUpload);
        }

        // Remove image button
        const removeImageBtn = document.getElementById('remove-image-btn');
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', handleImageRemove);
        }
    }

    /**
     * Load product data from API or demo data
     */
    async function loadProductData(productId) {
        try {
            const token = localStorage.getItem('supplier_token');
            const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                handleSessionExpired();
                return;
            }

            if (response.ok) {
                const product = await response.json();
                populateForm(product);
                return;
            }
        } catch (error) {
            console.log('API fetch failed, using demo data');
        }

        // Fallback to demo data
        const demoData = demoProductData[productId] || {
            id: productId,
            name: `Product ${productId}`,
            sku: `SKU-${productId}`,
            category: 'oils',
            categoryName: 'Oils & Vinegars',
            status: 'active',
            statusLabel: 'Complete',
            statusClass: 'wd-badge-success',
            description: '',
            minPrice: 0,
            maxPrice: 0,
            moq: 100,
            moqUnit: 'pieces',
            leadTime: 14,
            certifications: [],
            notes: '',
            updatedAt: new Date().toLocaleDateString('ko-KR')
        };
        populateForm(demoData);
    }

    /**
     * Populate form with product data
     */
    function populateForm(product) {
        // Status bar
        const skuDisplay = document.getElementById('product-sku-display');
        if (skuDisplay) {
            skuDisplay.textContent = product.sku || product.id || 'N/A';
        }

        const statusBadge = document.getElementById('product-status-badge');
        if (statusBadge) {
            statusBadge.textContent = product.statusLabel || 'Active';
            statusBadge.className = `wd-badge ${product.statusClass || 'wd-badge-success'}`;
        }

        const dateDisplay = document.getElementById('product-date-display');
        if (dateDisplay) {
            dateDisplay.textContent = `Updated: ${product.updatedAt || ''}`;
        }

        // Basic info
        setInputValue('product-name', product.name);
        setInputValue('product-sku', product.sku);
        setSelectValue('product-category', product.category);
        setSelectValue('product-status', product.status || 'active');
        setInputValue('product-description', product.description);

        // Price info
        setInputValue('price-min', product.minPrice || product.min_price);
        setInputValue('price-max', product.maxPrice || product.max_price);
        setInputValue('product-moq', product.moq);
        setSelectValue('moq-unit', product.moqUnit || product.moq_unit);
        setInputValue('lead-time', product.leadTime || product.lead_time);

        // Certifications
        if (product.certifications && Array.isArray(product.certifications)) {
            const checkboxes = document.querySelectorAll('input[name="certs"]');
            checkboxes.forEach(cb => {
                cb.checked = product.certifications.includes(cb.value);
            });
        }

        // Notes
        setInputValue('product-notes', product.notes);

        // Image
        if (product.image_url || product.imageUrl) {
            showProductImage(product.image_url || product.imageUrl);
        }
    }

    /**
     * Set input value helper
     */
    function setInputValue(id, value) {
        const input = document.getElementById(id);
        if (input && value !== null && value !== undefined) {
            input.value = value;
        }
    }

    /**
     * Set select value helper
     */
    function setSelectValue(id, value) {
        const select = document.getElementById(id);
        if (select && value) {
            select.value = value;
        }
    }

    /**
     * Toggle edit mode (for detail view)
     */
    /**
     * Save product changes (for detail edit mode)
     */
    window.saveProductChanges = async function() {
        const formData = collectFormData();

        // Validate
        if (!formData.name) {
            showToast('Product name is required', 'warning');
            return;
        }

        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn ? saveBtn.innerHTML : '';
        if (saveBtn) {
            saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
            saveBtn.disabled = true;
        }

        try {
            await saveProduct(formData);
            showToast('Product updated successfully!', 'success');
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to save product', 'error');
        } finally {
            if (saveBtn) {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
        }
    };

    window.deleteProductFromDetail = async function() {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const token = localStorage.getItem('supplier_token');
            const res = await fetch(`${API_BASE_URL}/products/${currentProductId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) { handleSessionExpired(); return; }
            if (!res.ok) throw new Error('Failed to delete product');

            showToast('Product deleted', 'success');
            setTimeout(() => { window.location.href = 'portal.html#product-list'; }, 1000);
        } catch (error) {
            console.error('Delete error:', error);
            showToast(error.message || 'Failed to delete', 'error');
        }
    };

    /**
     * Handle form submission (for new product mode)
     */
    async function handleFormSubmit(e) {
        e.preventDefault();

        // Validate required fields
        const name = document.getElementById('product-name').value.trim();

        if (!name) {
            showToast('Product name is required', 'warning');
            document.getElementById('product-name').focus();
            return;
        }

        // Collect form data
        const formData = collectFormData();

        // Show saving state
        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
            submitBtn.disabled = true;
        }

        try {
            await saveProduct(formData);
            showToast('Product saved successfully!', 'success');

            // Redirect to products page after short delay
            setTimeout(() => {
                window.location.href = 'portal.html#product-list';
            }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to save product', 'error');
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    /**
     * Collect form data
     */
    function collectFormData() {
        // Get selected certifications
        const certCheckboxes = document.querySelectorAll('input[name="certs"]:checked');
        const certifications = Array.from(certCheckboxes).map(cb => cb.value);

        return {
            name: document.getElementById('product-name')?.value?.trim() || '',
            sku: document.getElementById('product-sku')?.value?.trim() || null,
            category: document.getElementById('product-category')?.value || null,
            status: document.getElementById('product-status')?.value || 'active',
            description: document.getElementById('product-description')?.value?.trim() || null,
            minPrice: parseFloat(document.getElementById('price-min')?.value) || null,
            maxPrice: parseFloat(document.getElementById('price-max')?.value) || null,
            moq: parseInt(document.getElementById('product-moq')?.value) || null,
            moqUnit: document.getElementById('moq-unit')?.value || null,
            leadTime: parseInt(document.getElementById('lead-time')?.value) || null,
            certifications: certifications,
            notes: document.getElementById('product-notes')?.value?.trim() || null
        };
    }

    /**
     * Save product to API
     */
    async function saveProduct(formData) {
        const token = localStorage.getItem('supplier_token');
        const isUpdate = currentProductId && currentProductId !== 'new';
        const endpoint = isUpdate
            ? `${API_BASE_URL}/products/${currentProductId}`
            : `${API_BASE_URL}/products`;
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
            throw new Error(err.message || 'Failed to save product');
        }

        return await response.json();
    }

    /**
     * Handle session expired
     */
    function handleSessionExpired() {
        localStorage.removeItem('supplier_token');
        showToast('Session expired. Please login again.', 'warning');
        setTimeout(() => {
            window.location.href = 'portal.html';
        }, 1500);
    }

    /**
     * Handle image upload
     */
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'warning');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'warning');
            return;
        }

        // Preview image
        const reader = new FileReader();
        reader.onload = (event) => {
            showProductImage(event.target.result);
        };
        reader.readAsDataURL(file);
    }

    /**
     * Show product image preview
     */
    function showProductImage(src) {
        const placeholder = document.getElementById('image-placeholder');
        const previewImg = document.getElementById('preview-img');
        const removeBtn = document.getElementById('remove-image-btn');

        if (placeholder) placeholder.style.display = 'none';
        if (previewImg) {
            previewImg.src = src;
            previewImg.style.display = 'block';
        }
        if (removeBtn) removeBtn.style.display = 'inline-flex';
    }

    /**
     * Handle image removal
     */
    function handleImageRemove() {
        const placeholder = document.getElementById('image-placeholder');
        const previewImg = document.getElementById('preview-img');
        const removeBtn = document.getElementById('remove-image-btn');
        const imageInput = document.getElementById('product-image');

        if (placeholder) placeholder.style.display = 'flex';
        if (previewImg) {
            previewImg.src = '';
            previewImg.style.display = 'none';
        }
        if (removeBtn) removeBtn.style.display = 'none';
        if (imageInput) imageInput.value = '';
    }

    /**
     * Show toast notification
     */
    function showToast(message, type = 'info') {
        // Create toast container if not exists
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '&#10003;',
            error: '&#10007;',
            warning: '&#9888;',
            info: '&#8505;'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Show animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

})();

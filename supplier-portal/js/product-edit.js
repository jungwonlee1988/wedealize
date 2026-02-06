// WeDealize Supplier Portal - Product Edit Page Script
// Handles product editing on dedicated page

(function() {
    'use strict';

    // Configuration - use same API as main app
    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
    let currentProductId = null;
    let isNewProduct = false;

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
        isNewProduct = !currentProductId || currentProductId === 'new';

        // Update page title for new products
        if (isNewProduct) {
            const titleEl = document.querySelector('.page-title');
            if (titleEl) {
                titleEl.textContent = 'Add New Product';
                titleEl.setAttribute('data-i18n', 'productEdit.addTitle');
            }
        }

        // Load product data if editing
        if (!isNewProduct) {
            loadProductData(currentProductId);
        }

        // Bind form events
        bindFormEvents();
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
     * Load product data from API
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

            if (!response.ok) {
                throw new Error('Failed to load product');
            }

            const product = await response.json();
            populateForm(product);
        } catch (error) {
            console.error('Load product error:', error);
            showToast('Failed to load product data', 'error');
            setTimeout(() => {
                window.location.href = 'portal.html#products';
            }, 1500);
        }
    }

    /**
     * Populate form with product data
     */
    function populateForm(product) {
        // Update subtitle
        const subtitle = document.getElementById('product-subtitle');
        if (subtitle) {
            subtitle.textContent = product.sku ? `SKU: ${product.sku}` : '';
        }

        // Basic info
        setInputValue('product-name', product.name);
        setInputValue('product-sku', product.sku);
        setSelectValue('product-category', product.category);
        setSelectValue('product-status', product.status || 'active');
        setInputValue('product-description', product.description);

        // Price info
        setInputValue('price-min', product.min_price);
        setInputValue('price-max', product.max_price);
        setInputValue('product-moq', product.moq);
        setSelectValue('moq-unit', product.moq_unit);
        setInputValue('lead-time', product.lead_time);

        // Certifications
        if (product.certifications && Array.isArray(product.certifications)) {
            const checkboxes = document.querySelectorAll('input[name="certs"]');
            checkboxes.forEach(cb => {
                cb.checked = product.certifications.includes(cb.value);
            });
        }

        // Image
        if (product.image_url) {
            showProductImage(product.image_url);
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
     * Handle form submission
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
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Saving...';
        submitBtn.disabled = true;

        try {
            await saveProduct(formData);
            showToast('Product saved successfully!', 'success');

            // Redirect to products page after short delay
            setTimeout(() => {
                window.location.href = 'portal.html#products';
            }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to save product', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
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
            name: document.getElementById('product-name').value.trim(),
            sku: document.getElementById('product-sku').value.trim() || null,
            category: document.getElementById('product-category').value || null,
            status: document.getElementById('product-status').value || 'active',
            description: document.getElementById('product-description').value.trim() || null,
            minPrice: parseFloat(document.getElementById('price-min').value) || null,
            maxPrice: parseFloat(document.getElementById('price-max').value) || null,
            moq: parseInt(document.getElementById('product-moq').value) || null,
            moqUnit: document.getElementById('moq-unit').value || null,
            leadTime: parseInt(document.getElementById('lead-time').value) || null,
            certifications: certifications
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
        // Use existing toast function if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

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

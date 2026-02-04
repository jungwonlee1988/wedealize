// WeDealize Supplier Portal - Product Module
// Product list UI and interactions

import productService from '../services/product.js';
import store from '../core/store.js';
import eventBus, { Events } from '../core/eventBus.js';
import toast from '../components/toast.js';
import modal from '../components/modal.js';
import { $, $$, show, hide, html } from '../utils/dom.js';

class ProductModule {
    /**
     * Initialize product module
     */
    init() {
        this.bindEvents();

        // Listen for product events
        eventBus.on(Events.PRODUCTS_LOADED, (products) => this.renderProductList(products));
        eventBus.on(Events.PRODUCT_UPDATED, () => this.refresh());
    }

    /**
     * Bind UI events
     */
    bindEvents() {
        const filterSelect = $('#product-list-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => this.filterProducts());
        }
    }

    /**
     * Load products
     */
    async loadProducts(filter = null) {
        return await productService.loadProducts(filter);
    }

    /**
     * Filter products
     */
    filterProducts() {
        const filter = $('#product-list-filter')?.value;
        const rows = $$('#product-list-tbody tr');

        rows.forEach(row => {
            const isIncomplete = row.classList.contains('incomplete-row');
            let showRow = true;

            switch (filter) {
                case 'complete':
                    showRow = !isIncomplete;
                    break;
                case 'incomplete':
                    showRow = isIncomplete;
                    break;
                case 'no-moq':
                case 'no-image':
                case 'no-cert':
                    showRow = isIncomplete;
                    break;
            }

            row.style.display = showRow ? '' : 'none';
        });
    }

    /**
     * Filter by missing type
     */
    filterMissing(type) {
        const filterSelect = $('#product-filter');
        if (filterSelect) {
            filterSelect.value = `no-${type}`;
        }
        this.filterProducts();
    }

    /**
     * Render product list
     */
    renderProductList(products) {
        const container = $('#product-list');
        if (!container) return;

        container.innerHTML = products.map(product => `
            <div class="product-row ${product.completeness < 70 ? 'incomplete' : ''}">
                <div class="product-info">
                    <span class="product-name">${product.name}</span>
                    <span class="product-sku">${product.sku}</span>
                </div>
                <div class="product-moq">
                    ${product.moq ? product.moq : '<span class="missing">Missing</span>'}
                </div>
                <div class="product-price">
                    ${product.unit_price ? `$${product.unit_price}` : '<span class="missing">—</span>'}
                </div>
                <div class="product-certs">
                    ${product.certifications?.length > 0
                        ? product.certifications.map(c => `<span class="cert-badge">${c}</span>`).join('')
                        : '<span class="missing">None</span>'}
                </div>
                <div class="product-actions">
                    <button class="btn-edit" onclick="editProduct(${product.id})">Edit</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Edit product
     */
    editProduct(productId) {
        modal.open('product-modal');

        // Demo data
        const demoProducts = {
            1: { name: 'Extra Virgin Olive Oil 500ml', sku: 'OIL-001', moq: 200, certs: ['organic', 'haccp'] },
            3: { name: 'Aged Parmesan 24 months', sku: 'CHE-003', moq: null, certs: ['dop'] },
            5: { name: 'Raw Honey 500g', sku: 'HON-005', moq: null, certs: [] }
        };

        const product = demoProducts[productId] || demoProducts[1];

        const nameInput = $('#edit-product-name');
        const skuInput = $('#edit-product-sku');
        const moqInput = $('#edit-moq');
        const alert = $('#modal-missing-alert');

        if (nameInput) nameInput.value = product.name;
        if (skuInput) skuInput.value = product.sku;
        if (moqInput) moqInput.value = product.moq || '';

        if (alert) {
            alert.style.display = (!product.moq || product.certs.length === 0) ? 'flex' : 'none';
        }
    }

    /**
     * Edit extracted product
     */
    editExtractedProduct(productId) {
        console.log('Edit extracted product:', productId);
        modal.open('product-modal');
    }

    /**
     * Edit product price
     */
    editProductPrice(productId) {
        const extractedProducts = store.get('catalog.extractedProducts') || [];
        const product = extractedProducts.find(p => p.id === productId);
        if (!product) return;

        modal.open('product-modal');

        const nameInput = $('#edit-product-name');
        const priceInput = $('#edit-price-min');

        if (nameInput) nameInput.value = product.name;
        if (priceInput) priceInput.value = product.price?.replace(/[^0-9.]/g, '') || '';

        const modalEl = $('#product-modal');
        if (modalEl) {
            modalEl.dataset.editingProductId = productId;
            modalEl.dataset.editingContext = 'price';
        }
    }

    /**
     * Save product
     */
    async saveProduct() {
        const productId = $('#edit-product-id')?.value;
        const moq = $('#edit-moq')?.value;

        if (!moq) {
            toast.warning('Please fill in MOQ (required)');
            return;
        }

        const result = await productService.updateProduct(productId || 1, {
            product_id: parseInt(productId || 1),
            moq: parseInt(moq)
        });

        modal.close('product-modal');
        toast.success('Product updated successfully!');

        await this.refresh();
    }

    /**
     * Export products to CSV
     */
    async exportProducts() {
        toast.info('Exporting products to CSV...');

        const result = await productService.exportToCSV();

        if (result.success) {
            toast.success(`Successfully exported ${result.count} products`);
        } else {
            toast.error(result.error || 'Failed to export products');
        }
    }

    /**
     * Open add product modal
     */
    openAddProductModal() {
        toast.info('Add product feature coming soon');
    }

    /**
     * Refresh product list
     */
    async refresh() {
        await this.loadProducts();
    }

    /**
     * Update selected count (for extracted products)
     */
    updateSelectedCount() {
        const checkboxes = $$('.extract-checkbox:checked');
        const count = checkboxes.length;

        const countEl = $('#selected-count');
        const moveBtn = $('#move-to-list-btn');

        if (countEl) countEl.textContent = `(${count})`;
        if (moveBtn) moveBtn.disabled = count === 0;
    }

    /**
     * Toggle select all extracted
     */
    toggleSelectAllExtracted() {
        const selectAll = $('#select-all-extracted');
        const checkboxes = $$('.extract-checkbox');

        checkboxes.forEach(cb => {
            cb.checked = selectAll?.checked || false;
        });

        this.updateSelectedCount();
    }

    /**
     * Select all extracted
     */
    selectAllExtracted() {
        const selectAll = $('#select-all-extracted');
        if (selectAll) selectAll.checked = true;
        this.toggleSelectAllExtracted();
    }

    /**
     * Move to product list
     */
    moveToProductList() {
        const checkboxes = $$('.extract-checkbox:checked');
        const count = checkboxes.length;

        if (count === 0) {
            toast.warning(t('catalog.selectProducts'));
            return;
        }

        // Remove selected rows
        checkboxes.forEach(cb => {
            const row = cb.closest('tr');
            if (row) row.remove();
        });

        // Reset selection
        const selectAll = $('#select-all-extracted');
        if (selectAll) selectAll.checked = false;
        this.updateSelectedCount();

        toast.success(`${count} ${t('catalog.movedSuccess')}`);

        // Navigate to product list
        setTimeout(() => {
            eventBus.emit(Events.NAV_CHANGE, { section: 'product-list' });
        }, 1000);
    }
}

// Create singleton instance
const productModule = new ProductModule();

// Global functions for backward compatibility
window.filterProductList = () => productModule.filterProducts();
window.filterMissing = (type) => productModule.filterMissing(type);
window.editProduct = (id) => productModule.editProduct(id);
window.editExtractedProduct = (id) => productModule.editExtractedProduct(id);
window.editProductPrice = (id) => productModule.editProductPrice(id);
window.saveProduct = () => productModule.saveProduct();
window.exportProducts = () => productModule.exportProducts();
window.openAddProductModal = () => productModule.openAddProductModal();
window.updateSelectedCount = () => productModule.updateSelectedCount();
window.toggleSelectAllExtracted = () => productModule.toggleSelectAllExtracted();
window.selectAllExtracted = () => productModule.selectAllExtracted();
window.moveToProductList = () => productModule.moveToProductList();
window.addMOQ = (id) => productModule.editProduct(id);
window.addCert = (id) => productModule.editProduct(id);

export default productModule;

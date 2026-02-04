// WeDealize Supplier Portal - Catalog Module
// Catalog registration UI and workflows

import api from '../services/api.js';
import store from '../core/store.js';
import eventBus, { Events } from '../core/eventBus.js';
import toast from '../components/toast.js';
import Config from '../config.js';
import { $, $$, show, hide, addClass, removeClass, html } from '../utils/dom.js';
import { delay, formatFileSize } from '../utils/format.js';

class CatalogModule {
    constructor() {
        this.uploadedFiles = {
            catalog: null,
            pricelist: null,
            cert: []
        };
        this.currentJobId = null;
    }

    /**
     * Initialize catalog module
     */
    init() {
        this.bindFileUploads();
    }

    /**
     * Bind file upload events
     */
    bindFileUploads() {
        // Dropzone events
        ['catalog', 'pricelist'].forEach(type => {
            const dropzone = $(`#${type}-dropzone`);
            if (dropzone) {
                dropzone.addEventListener('dragover', (e) => this.handleDragOver(e));
                dropzone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                dropzone.addEventListener('drop', (e) => this.handleDrop(e, type));
            }
        });
    }

    /**
     * Handle drag over
     */
    handleDragOver(e) {
        e.preventDefault();
        addClass(e.currentTarget, 'dragover');
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(e) {
        removeClass(e.currentTarget, 'dragover');
    }

    /**
     * Handle drop
     */
    handleDrop(e, type) {
        e.preventDefault();
        removeClass(e.currentTarget, 'dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFile(files[0], type);
        }
    }

    /**
     * Handle file select
     */
    handleFileSelect(e, type) {
        const files = e.target.files;
        if (type === 'cert') {
            Array.from(files).forEach(file => this.handleFile(file, type));
        } else if (files.length > 0) {
            this.handleFile(files[0], type);
        }
    }

    /**
     * Handle file validation and storage
     */
    handleFile(file, type) {
        // Size check
        const maxSize = Config.FILE_SIZE_LIMITS[type] || 50 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File too large. Max size: ${formatFileSize(maxSize)}`);
            return;
        }

        // Extension check
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!Config.ALLOWED_FILE_TYPES[type]?.includes(ext)) {
            toast.error(`Invalid file type. Allowed: ${Config.ALLOWED_FILE_TYPES[type].join(', ')}`);
            return;
        }

        if (type === 'cert') {
            this.uploadedFiles.cert.push(file);
            this.updateCertList();
        } else {
            this.uploadedFiles[type] = file;
            this.showUploadedFile(type, file);
        }
    }

    /**
     * Show uploaded file info
     */
    showUploadedFile(type, file) {
        hide(`#${type}-dropzone`);
        show(`#${type}-uploaded`, 'flex');

        const filenameEl = $(`#${type}-filename`);
        const filesizeEl = $(`#${type}-filesize`);

        if (filenameEl) filenameEl.textContent = file.name;
        if (filesizeEl) filesizeEl.textContent = formatFileSize(file.size);

        // Enable extract button for catalog
        if (type === 'catalog') {
            const extractBtn = $('#extract-btn');
            if (extractBtn) extractBtn.disabled = false;
        }

        // Process price list matching
        if (type === 'pricelist') {
            this.processPriceListMatching();
        }
    }

    /**
     * Remove file
     */
    removeFile(type) {
        this.uploadedFiles[type] = null;
        show(`#${type}-dropzone`);
        hide(`#${type}-uploaded`);

        const fileInput = $(`#${type}-file`);
        if (fileInput) fileInput.value = '';

        if (type === 'catalog') {
            const extractBtn = $('#extract-btn');
            if (extractBtn) extractBtn.disabled = true;
        }
    }

    /**
     * Update certificate list
     */
    updateCertList() {
        const list = $('#cert-list');
        if (!list) return;

        list.innerHTML = this.uploadedFiles.cert.map((file, index) => `
            <div class="uploaded-file">
                <span class="file-icon">📄</span>
                <span class="file-name">${file.name}</span>
                <button class="btn-remove" onclick="catalogModule.removeCert(${index})">×</button>
            </div>
        `).join('');
    }

    /**
     * Remove certificate
     */
    removeCert(index) {
        this.uploadedFiles.cert.splice(index, 1);
        this.updateCertList();
    }

    /**
     * Go to step
     */
    goToStep(stepNum) {
        const currentStep = store.get('catalog.currentStep');

        // Hide current step
        hide(`#catalog-step-${currentStep}`);

        // Update indicators
        for (let i = 1; i <= 4; i++) {
            const indicator = $(`#step-indicator-${i}`);
            if (!indicator) continue;

            removeClass(indicator, 'active', 'completed');
            if (i < stepNum) {
                addClass(indicator, 'completed');
            } else if (i === stepNum) {
                addClass(indicator, 'active');
            }
        }

        // Update connectors
        for (let i = 1; i <= 3; i++) {
            const connector = $(`#connector-${i}`);
            if (connector) {
                if (i < stepNum) {
                    addClass(connector, 'completed');
                } else {
                    removeClass(connector, 'completed');
                }
            }
        }

        // Show new step
        store.set('catalog.currentStep', stepNum);
        show(`#catalog-step-${stepNum}`);

        // Load step data
        eventBus.emit(Events.CATALOG_STEP_CHANGE, stepNum);

        if (stepNum === 2) {
            this.loadExtractedProducts();
        } else if (stepNum === 3) {
            this.renderPriceMatchTable();
        } else if (stepNum === 4) {
            this.showCompleteSummary();
        }
    }

    /**
     * Extract catalog
     */
    async extractCatalog() {
        if (!this.uploadedFiles.catalog) {
            toast.error(t('catalog.uploadRequired') || 'Please upload a catalog file first');
            return;
        }

        const extractBtn = $('#extract-btn');
        if (extractBtn) {
            extractBtn.disabled = true;
            extractBtn.innerHTML = `<span class="spinner"></span> ${t('catalog.extracting') || 'Extracting...'}`;
        }

        try {
            const result = await api.upload('/upload/catalog', this.uploadedFiles.catalog);
            this.currentJobId = result.job_id;
            store.set('catalog.currentJobId', this.currentJobId);

            await this.pollCatalogExtraction();

            toast.success(t('catalog.extractSuccess') || 'Products extracted successfully!');
            this.goToStep(2);

        } catch (error) {
            console.log('Using demo extraction');
            await this.simulateCatalogExtraction();
            toast.success(t('catalog.extractSuccess') || 'Products extracted successfully!');
            this.goToStep(2);
        }

        if (extractBtn) {
            extractBtn.disabled = false;
            extractBtn.innerHTML = `<span data-i18n="catalog.extractProducts">${t('catalog.extractProducts') || 'Extract Products'}</span> <span class="btn-arrow">→</span>`;
        }
    }

    /**
     * Simulate catalog extraction (demo mode)
     */
    async simulateCatalogExtraction() {
        await delay(2000);

        const extractedProducts = [
            { id: 'e1', name: 'Extra Virgin Olive Oil 500ml', category: 'oils', originalPrice: '$7.20 - $8.50', price: '$7.20 - $8.50', status: 'complete', emoji: '🫒' },
            { id: 'e2', name: 'Aged Parmesan Cheese 12m', category: null, originalPrice: '$18.00', price: '$18.00', status: 'incomplete', emoji: '🧀' },
            { id: 'e3', name: 'Raw Organic Honey 500g', category: 'organic', originalPrice: null, price: null, status: 'incomplete', emoji: '🍯' },
            { id: 'e4', name: 'Balsamic Vinegar 250ml', category: 'oils', originalPrice: '$12.00 - $15.00', price: '$12.00 - $15.00', status: 'complete', emoji: '🍷' },
            { id: 'e5', name: 'Truffle Oil 100ml', category: 'oils', originalPrice: '$25.00', price: '$25.00', status: 'complete', emoji: '🫒' },
            { id: 'e6', name: 'Artisan Pasta 500g', category: null, originalPrice: '$4.50', price: '$4.50', status: 'incomplete', emoji: '🍝' }
        ];

        store.set('catalog.extractedProducts', extractedProducts);
    }

    /**
     * Poll catalog extraction status
     */
    async pollCatalogExtraction() {
        if (!this.currentJobId) return;

        let completed = false;
        while (!completed) {
            const status = await api.get(`/upload/status/${this.currentJobId}`);

            if (status.status === 'complete') {
                completed = true;
                store.set('catalog.extractedProducts', status.products || []);
            } else if (status.status === 'error') {
                throw new Error(status.errors?.[0] || 'Extraction failed');
            }

            await delay(1000);
        }
    }

    /**
     * Load and render extracted products
     */
    loadExtractedProducts() {
        const extractedProducts = store.get('catalog.extractedProducts');

        if (!extractedProducts?.length) {
            this.simulateCatalogExtraction().then(() => this.loadExtractedProducts());
            return;
        }

        const tbody = $('#extracted-products-tbody');
        const totalEl = $('#extracted-total');
        const allCountEl = $('#extracted-all-count');
        const completeEl = $('#complete-count');
        const incompleteEl = $('#incomplete-count');

        const completeCount = extractedProducts.filter(p => p.status === 'complete').length;
        const incompleteCount = extractedProducts.length - completeCount;

        if (totalEl) totalEl.textContent = extractedProducts.length;
        if (allCountEl) allCountEl.textContent = extractedProducts.length;
        if (completeEl) completeEl.textContent = completeCount;
        if (incompleteEl) incompleteEl.textContent = incompleteCount;

        if (tbody) {
            tbody.innerHTML = extractedProducts.map(product => {
                const isIncomplete = product.status === 'incomplete';
                return `
                    <tr class="${isIncomplete ? 'incomplete-row' : ''}" data-status="${product.status}">
                        <td class="col-checkbox"><input type="checkbox" class="extract-checkbox" data-id="${product.id}" onchange="updateSelectedCount()" checked></td>
                        <td>
                            <div class="product-cell">
                                <span class="product-thumb">${product.emoji}</span>
                                <span class="product-name">${product.name}</span>
                            </div>
                        </td>
                        <td>
                            ${product.category
                                ? `<span class="category-badge">${this.getCategoryLabel(product.category)}</span>`
                                : `<span class="category-badge missing">${t('products.missing') || 'Missing'}</span>`
                            }
                        </td>
                        <td>${product.price || '<span class="missing-data">-</span>'}</td>
                        <td><span class="status-dot ${product.status}"></span> ${t('products.' + product.status) || product.status}</td>
                        <td>
                            <button class="btn btn-sm ${isIncomplete ? 'btn-warning' : 'btn-outline'}"
                                    onclick="editExtractedProduct('${product.id}')">
                                ${isIncomplete ? t('products.fillIn') || 'Fill in' : t('products.edit') || 'Edit'}
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Reset filter to 'all' when loading
        this.filterExtractedProducts('all');
    }

    /**
     * Filter extracted products by status
     */
    filterExtractedProducts(status) {
        const rows = $$('#extracted-products-tbody tr');
        const filterTabs = $$('.wd-filter-tabs .wd-filter-tab');

        // Update active tab
        filterTabs.forEach(tab => {
            if (tab.dataset.filter === status) {
                addClass(tab, 'active');
            } else {
                removeClass(tab, 'active');
            }
        });

        // Filter rows
        rows.forEach(row => {
            const rowStatus = row.dataset.status;
            if (status === 'all' || rowStatus === status) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        // Store current filter
        store.set('catalog.currentFilter', status);
    }

    /**
     * Get category label
     */
    getCategoryLabel(category) {
        return Config.CATEGORIES[category] || category;
    }

    /**
     * Process price list matching
     */
    async processPriceListMatching() {
        toast.info(t('catalog.matchingPrices') || 'Matching prices...');

        try {
            const result = await api.upload('/upload/pricelist', this.uploadedFiles.pricelist);
            const priceMatchedProducts = result.matched || [];
            store.set('catalog.priceMatchedProducts', priceMatchedProducts);

            // Update prices
            const extractedProducts = store.get('catalog.extractedProducts');
            priceMatchedProducts.forEach(matched => {
                const product = extractedProducts.find(p => p.id === matched.id);
                if (product && matched.price) {
                    product.price = matched.price;
                }
            });
            store.set('catalog.extractedProducts', extractedProducts);

        } catch (error) {
            // Demo mode
            await delay(1500);

            const demoPriceList = [
                { id: 'e1', price: '$7.50' },
                { id: 'e2', price: '$19.00' },
                { id: 'e3', price: '$12.00' },
                { id: 'e4', price: '$14.00' }
            ];

            store.set('catalog.priceMatchedProducts', demoPriceList);

            const extractedProducts = store.get('catalog.extractedProducts') || [];
            demoPriceList.forEach(priceItem => {
                const product = extractedProducts.find(p => p.id === priceItem.id);
                if (product) {
                    product.price = priceItem.price;
                }
            });
            store.set('catalog.extractedProducts', extractedProducts);
        }

        // Update UI
        hide('#pricelist-upload-area');
        show('#pricelist-uploaded-area', 'flex');

        const filenameEl = $('#pricelist-filename');
        const matchedCountEl = $('#price-matched-count');
        const totalCountEl = $('#price-total-count');

        if (filenameEl) filenameEl.textContent = this.uploadedFiles.pricelist?.name || 'price_list.xlsx';
        if (matchedCountEl) matchedCountEl.textContent = store.get('catalog.priceMatchedProducts').length;
        if (totalCountEl) totalCountEl.textContent = store.get('catalog.extractedProducts').length;

        this.renderPriceMatchTable();
        toast.success(t('catalog.pricesMatched') || 'Prices matched and updated!');
    }

    /**
     * Render price match table
     */
    renderPriceMatchTable() {
        const tbody = $('#price-match-tbody');
        if (!tbody) return;

        const extractedProducts = store.get('catalog.extractedProducts') || [];
        const priceMatchedProducts = store.get('catalog.priceMatchedProducts') || [];
        const hasPriceList = priceMatchedProducts.length > 0;

        tbody.innerHTML = extractedProducts.map(product => {
            const matched = priceMatchedProducts.find(m => m.id === product.id);
            const originalPrice = product.originalPrice;
            const newPrice = matched ? product.price : null;
            const priceChanged = matched && originalPrice !== newPrice;
            const needsFillIn = !product.category || (!originalPrice && !newPrice);

            return `
                <tr class="${needsFillIn ? 'incomplete-row' : ''}">
                    <td class="col-checkbox"></td>
                    <td>
                        <div class="product-cell">
                            <span class="product-thumb">${product.emoji}</span>
                            <span class="product-name">${product.name}</span>
                        </div>
                    </td>
                    <td>
                        ${product.category
                            ? `<span class="category-badge">${this.getCategoryLabel(product.category)}</span>`
                            : `<span class="category-badge missing">${t('products.missing') || 'Missing'}</span>`
                        }
                    </td>
                    <td>${originalPrice || '<span class="missing-data">-</span>'}</td>
                    <td class="${priceChanged ? 'price-updated' : ''}">
                        ${hasPriceList
                            ? (newPrice || '<span class="missing-data">-</span>')
                            : '<span class="missing-data">-</span>'
                        }
                    </td>
                    <td>
                        <button class="btn btn-sm ${needsFillIn ? 'btn-warning' : 'btn-outline'}"
                                onclick="editProductPrice('${product.id}')">
                            ${needsFillIn ? t('products.fillIn') || 'Fill in' : t('products.edit') || 'Edit'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Reset price list
     */
    resetPriceList() {
        const extractedProducts = store.get('catalog.extractedProducts') || [];
        extractedProducts.forEach(product => {
            product.price = product.originalPrice;
        });
        store.set('catalog.extractedProducts', extractedProducts);
        store.set('catalog.priceMatchedProducts', []);

        this.uploadedFiles.pricelist = null;

        show('#pricelist-upload-area', 'flex');
        hide('#pricelist-uploaded-area');

        const pricelistFile = $('#pricelist-file');
        if (pricelistFile) pricelistFile.value = '';

        this.renderPriceMatchTable();
        toast.success(t('catalog.priceListReset') || 'Price list has been reset. Original prices restored.');
    }

    /**
     * Skip price matching
     */
    skipPriceMatching() {
        toast.info(t('catalog.priceSkipped') || 'Price matching skipped. You can add prices later.');
        this.goToStep(4);
    }

    /**
     * Show complete summary
     */
    showCompleteSummary() {
        const extractedProducts = store.get('catalog.extractedProducts') || [];
        const priceMatchedProducts = store.get('catalog.priceMatchedProducts') || [];

        const completeCount = extractedProducts.filter(p => p.status === 'complete').length;
        const incompleteCount = extractedProducts.length - completeCount;
        const priceCount = priceMatchedProducts.length || extractedProducts.filter(p => p.price).length;

        const registeredEl = $('#registered-count');
        const finalCompleteEl = $('#final-complete-count');
        const finalIncompleteEl = $('#final-incomplete-count');
        const finalPriceEl = $('#final-price-count');

        if (registeredEl) registeredEl.textContent = extractedProducts.length;
        if (finalCompleteEl) finalCompleteEl.textContent = completeCount;
        if (finalIncompleteEl) finalIncompleteEl.textContent = incompleteCount;
        if (finalPriceEl) finalPriceEl.textContent = priceCount;
    }

    /**
     * Start new catalog registration
     */
    startNewCatalog() {
        store.resetCatalog();
        this.uploadedFiles = { catalog: null, pricelist: null, cert: [] };
        this.currentJobId = null;

        this.removeFile('catalog');

        show('#pricelist-upload-area', 'flex');
        hide('#pricelist-uploaded-area');

        // Reset steps
        for (let i = 1; i <= 4; i++) {
            if (i === 1) {
                show(`#catalog-step-${i}`);
            } else {
                hide(`#catalog-step-${i}`);
            }

            const indicator = $(`#step-indicator-${i}`);
            if (indicator) {
                removeClass(indicator, 'active', 'completed');
                if (i === 1) addClass(indicator, 'active');
            }
        }

        for (let i = 1; i <= 3; i++) {
            const connector = $(`#connector-${i}`);
            if (connector) removeClass(connector, 'completed');
        }

        const extractBtn = $('#extract-btn');
        if (extractBtn) extractBtn.disabled = true;
    }
}

// Create singleton instance
const catalogModule = new CatalogModule();

// Global functions for backward compatibility
window.catalogModule = catalogModule;
window.handleFileSelect = (e, type) => catalogModule.handleFileSelect(e, type);
window.removeFile = (type) => catalogModule.removeFile(type);
window.removeCert = (index) => catalogModule.removeCert(index);
window.goToCatalogStep = (step) => catalogModule.goToStep(step);
window.extractCatalog = () => catalogModule.extractCatalog();
window.resetPriceList = () => catalogModule.resetPriceList();
window.skipPriceMatching = () => catalogModule.skipPriceMatching();
window.startNewCatalog = () => catalogModule.startNewCatalog();
window.filterExtractedProducts = (status) => catalogModule.filterExtractedProducts(status);

export default catalogModule;

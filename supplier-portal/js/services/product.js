// WeDealize Supplier Portal - Product Service
// Product management business logic

import api from './api.js';
import store from '../core/store.js';
import eventBus, { Events } from '../core/eventBus.js';
import { parsePriceRange, escapeCsvField } from '../utils/format.js';
import Config from '../config.js';

class ProductService {
    /**
     * Load products for current supplier
     * @param {string} filter - Optional filter (moq, images, certs)
     */
    async loadProducts(filter = null) {
        const supplierId = store.get('auth.supplierId') || '1';

        try {
            let endpoint = `/products/${supplierId}`;
            if (filter) {
                endpoint += `?filter_missing=${filter}`;
            }

            const data = await api.get(endpoint);
            store.set('products.items', data.products);
            store.set('products.totalCount', data.products.length);
            eventBus.emit(Events.PRODUCTS_LOADED, data.products);

            return data.products;

        } catch (error) {
            console.log('Using demo products');
            const demoProducts = this.getDemoProducts();
            store.set('products.items', demoProducts);
            store.set('products.totalCount', demoProducts.length);
            eventBus.emit(Events.PRODUCTS_LOADED, demoProducts);

            return demoProducts;
        }
    }

    /**
     * Update product
     * @param {number} productId - Product ID
     * @param {Object} data - Update data
     */
    async updateProduct(productId, data) {
        try {
            await api.put(`/products/${productId}`, data);
            eventBus.emit(Events.PRODUCT_UPDATED, { productId, data });

            // Refresh completeness
            const supplierId = store.get('auth.supplierId') || '1';
            await api.post(`/data-completeness/refresh/${supplierId}`);

            return { success: true };

        } catch (error) {
            console.log('Demo mode: product update simulated');
            eventBus.emit(Events.PRODUCT_UPDATED, { productId, data });
            return { success: true, demo: true };
        }
    }

    /**
     * Get all products for export
     */
    async getAllProducts() {
        const supplierId = store.get('auth.supplierId') || '1';

        // 1. Try API
        try {
            const data = await api.get(`/products/${supplierId}`, { all: true });
            if (data.products?.length > 0) {
                return data.products;
            }
        } catch (error) {
            console.log('API unavailable, using local data');
        }

        // 2. Use extracted products from catalog
        const extractedProducts = store.get('catalog.extractedProducts');
        if (extractedProducts?.length > 0) {
            return extractedProducts.map(p => ({
                name: p.name,
                category: p.category ? this.getCategoryLabel(p.category) : '',
                sku: p.sku || '',
                price: p.price || '',
                moq: p.moq || '',
                certifications: p.certifications || [],
                status: p.status || ''
            }));
        }

        // 3. Extract from DOM
        const tableProducts = this.extractProductsFromTable();
        if (tableProducts.length > 0) {
            return tableProducts;
        }

        // 4. Return demo data
        return this.getDemoProducts();
    }

    /**
     * Extract products from table DOM
     */
    extractProductsFromTable() {
        const products = [];
        const rows = document.querySelectorAll('#product-list-tbody tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 7) {
                const nameEl = cells[0].querySelector('.product-name');
                const categoryEl = cells[1].querySelector('.category-badge');
                const certBadges = cells[5].querySelectorAll('.cert-badge');
                const statusEl = cells[6].querySelector('.status-dot');

                products.push({
                    name: nameEl?.textContent.trim() || '',
                    category: categoryEl?.textContent.trim() || '',
                    sku: cells[2]?.textContent.trim() || '',
                    price: cells[3]?.textContent.trim() || '',
                    moq: cells[4]?.textContent.replace(/Missing|Add/gi, '').trim() || '',
                    certifications: Array.from(certBadges).map(b => b.textContent.trim()),
                    status: statusEl?.classList.contains('complete') ? 'Complete' : 'Incomplete'
                });
            }
        });

        return products;
    }

    /**
     * Export products to CSV
     */
    async exportToCSV() {
        const products = await this.getAllProducts();

        if (!products || products.length === 0) {
            return { success: false, error: 'No products to export' };
        }

        // CSV headers
        const headers = ['Product Name', 'Category', 'SKU', 'Min Price (FOB)', 'Max Price (FOB)', 'MOQ', 'Certifications', 'Status'];

        // Build CSV
        const csvRows = [headers.join(',')];

        products.forEach(product => {
            const { minPrice, maxPrice } = parsePriceRange(product.price);
            const row = [
                escapeCsvField(product.name || ''),
                escapeCsvField(product.category || ''),
                escapeCsvField(product.sku || ''),
                escapeCsvField(minPrice),
                escapeCsvField(maxPrice),
                escapeCsvField(product.moq || ''),
                escapeCsvField(Array.isArray(product.certifications)
                    ? product.certifications.join('; ')
                    : (product.certifications || '')),
                escapeCsvField(product.status || '')
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        // Add BOM for Unicode
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `products_export_${timestamp}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true, count: products.length };
    }

    /**
     * Get category label
     * @param {string} category - Category key
     */
    getCategoryLabel(category) {
        return Config.CATEGORIES[category] || category;
    }

    /**
     * Get demo products
     */
    getDemoProducts() {
        return [
            { name: 'Extra Virgin Olive Oil 500ml', category: 'Oils & Vinegars', sku: 'OIL-001', price: '$7.20 - $8.50', moq: '200 bottles', certifications: ['Organic', 'HACCP'], status: 'Complete' },
            { name: 'Aged Parmesan 24 months', category: 'Dairy & Cheese', sku: 'CHE-003', price: '$18.00 - $22.00', moq: '', certifications: ['DOP'], status: 'Incomplete' },
            { name: 'Raw Organic Honey 500g', category: 'Organic & Health', sku: 'HON-005', price: '$12.00', moq: '100 jars', certifications: ['Organic'], status: 'Complete' },
            { name: 'Balsamic Vinegar 250ml', category: 'Oils & Vinegars', sku: 'VIN-002', price: '$12.00 - $15.00', moq: '150 bottles', certifications: ['IGP'], status: 'Complete' },
            { name: 'Truffle Oil 100ml', category: 'Oils & Vinegars', sku: 'OIL-010', price: '$25.00', moq: '50 bottles', certifications: [], status: 'Incomplete' },
            { name: 'Artisan Pasta 500g', category: 'Pasta & Grains', sku: 'PAS-001', price: '$4.50', moq: '300 packs', certifications: ['Organic'], status: 'Complete' },
            { name: 'San Marzano Tomatoes 400g', category: 'Canned Goods', sku: 'CAN-001', price: '$3.20', moq: '500 cans', certifications: ['DOP'], status: 'Complete' },
            { name: 'Prosciutto di Parma 200g', category: 'Deli & Meats', sku: 'MEA-001', price: '$15.00 - $18.00', moq: '100 packs', certifications: ['DOP', 'HACCP'], status: 'Complete' },
            { name: 'Pecorino Romano 300g', category: 'Dairy & Cheese', sku: 'CHE-005', price: '$14.00', moq: '', certifications: ['DOP'], status: 'Incomplete' },
            { name: 'Limoncello 500ml', category: 'Beverages', sku: 'BEV-001', price: '$18.00', moq: '100 bottles', certifications: [], status: 'Incomplete' }
        ];
    }
}

// Create singleton instance
const productService = new ProductService();

export default productService;

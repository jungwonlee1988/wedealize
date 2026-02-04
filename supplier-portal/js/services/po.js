// WeDealize Supplier Portal - PO Service
// Purchase Order management business logic

import api from './api.js';
import store from '../core/store.js';
import eventBus, { Events } from '../core/eventBus.js';
import { escapeCsvField } from '../utils/format.js';

class POService {
    /**
     * Load PO list
     */
    async loadPOList() {
        const supplierId = store.get('auth.supplierId') || '1';

        try {
            const data = await api.get(`/po/${supplierId}`);
            store.set('po.items', data.orders);
            eventBus.emit(Events.PO_LOADED, data.orders);
            return data.orders;

        } catch (error) {
            console.log('Using demo PO data');
            const demoPO = this.getDemoPOData();
            store.set('po.items', demoPO);
            eventBus.emit(Events.PO_LOADED, demoPO);
            return demoPO;
        }
    }

    /**
     * Get PO details
     * @param {string} poNumber - PO number
     */
    async getPODetail(poNumber) {
        try {
            const data = await api.get(`/po/detail/${poNumber}`);
            return data;
        } catch (error) {
            // Demo data
            return this.getDemoPODetail(poNumber);
        }
    }

    /**
     * Confirm PO
     * @param {string} poNumber - PO number
     */
    async confirmPO(poNumber) {
        try {
            await api.post(`/po/${poNumber}/confirm`);
            eventBus.emit(Events.PO_CONFIRMED, poNumber);
            return { success: true };
        } catch (error) {
            console.log('Demo mode: PO confirmed');
            eventBus.emit(Events.PO_CONFIRMED, poNumber);
            return { success: true, demo: true };
        }
    }

    /**
     * Update shipping info
     * @param {string} poNumber - PO number
     * @param {Object} shippingData - Shipping information
     */
    async updateShipping(poNumber, shippingData) {
        try {
            await api.put(`/po/${poNumber}/shipping`, shippingData);
            eventBus.emit(Events.PO_UPDATED, { poNumber, shippingData });
            return { success: true };
        } catch (error) {
            console.log('Demo mode: shipping updated');
            return { success: true, demo: true };
        }
    }

    /**
     * Filter PO by status
     * @param {string} status - Status filter
     */
    filterByStatus(status) {
        store.set('po.filter', status);
        return store.get('po.items').filter(po => {
            if (status === 'all') return true;
            return po.status === status;
        });
    }

    /**
     * Search PO
     * @param {string} searchTerm - Search term
     */
    search(searchTerm) {
        store.set('po.searchTerm', searchTerm);
        const term = searchTerm.toLowerCase();
        return store.get('po.items').filter(po => {
            return po.poNumber.toLowerCase().includes(term) ||
                   po.buyerName.toLowerCase().includes(term);
        });
    }

    /**
     * Export PO list to CSV
     */
    async exportToCSV() {
        const poData = this.getAllPOFromTable();

        if (!poData || poData.length === 0) {
            return { success: false, error: 'No PO data to export' };
        }

        // CSV headers
        const headers = ['PO Number', 'Buyer', 'Country', 'Order Date', 'Items', 'Total Amount', 'Status'];

        // Build CSV
        const csvRows = [headers.join(',')];

        poData.forEach(po => {
            const row = [
                escapeCsvField(po.poNumber),
                escapeCsvField(po.buyerName),
                escapeCsvField(po.country),
                escapeCsvField(po.orderDate),
                escapeCsvField(po.items),
                escapeCsvField(po.totalAmount),
                escapeCsvField(po.status)
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        // Add BOM
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // Download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `po_export_${timestamp}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return { success: true, count: poData.length };
    }

    /**
     * Extract PO data from table DOM
     */
    getAllPOFromTable() {
        const poData = [];
        const rows = document.querySelectorAll('#po-list-tbody tr');

        rows.forEach(row => {
            const poNumber = row.querySelector('.po-number')?.textContent || '';
            const buyerName = row.querySelector('.buyer-name')?.textContent || '';
            const buyerCountry = row.querySelector('.buyer-country')?.textContent || '';
            const cells = row.querySelectorAll('td');
            const orderDate = cells[2]?.textContent || '';
            const items = cells[3]?.textContent || '';
            const totalAmount = row.querySelector('.amount')?.textContent || '';
            const statusBadge = row.querySelector('.status-badge');
            const status = statusBadge?.textContent || '';

            poData.push({
                poNumber,
                buyerName,
                country: buyerCountry.replace(/[^\w\s]/g, '').trim(),
                orderDate,
                items,
                totalAmount,
                status
            });
        });

        return poData;
    }

    /**
     * Get demo PO data
     */
    getDemoPOData() {
        return [
            { poNumber: 'PO-2026-001', buyerName: 'Fresh Foods Co.', country: 'US', orderDate: '2026-02-01', items: 5, totalAmount: '$12,500', status: 'pending' },
            { poNumber: 'PO-2026-002', buyerName: 'Euro Gourmet', country: 'DE', orderDate: '2026-02-03', items: 3, totalAmount: '$8,200', status: 'confirmed' },
            { poNumber: 'PO-2026-003', buyerName: 'Asian Delights', country: 'JP', orderDate: '2026-01-28', items: 8, totalAmount: '$15,800', status: 'shipped' }
        ];
    }

    /**
     * Get demo PO detail
     * @param {string} poNumber - PO number
     */
    getDemoPODetail(poNumber) {
        return {
            poNumber,
            buyer: { name: 'Fresh Foods Co.', country: 'US', email: 'buyer@freshfoods.com' },
            items: [
                { product: 'Extra Virgin Olive Oil 500ml', qty: 200, price: '$7.50', total: '$1,500' },
                { product: 'Aged Parmesan 24m', qty: 50, price: '$19.00', total: '$950' }
            ],
            total: '$2,450',
            status: 'pending'
        };
    }
}

// Create singleton instance
const poService = new POService();

export default poService;

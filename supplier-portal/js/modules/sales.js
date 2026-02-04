// WeDealize Supplier Portal - Sales Module
// PO Management UI and interactions

import poService from '../services/po.js';
import store from '../core/store.js';
import eventBus, { Events } from '../core/eventBus.js';
import toast from '../components/toast.js';
import modal from '../components/modal.js';
import { $, $$ } from '../utils/dom.js';

class SalesModule {
    /**
     * Initialize sales module
     */
    init() {
        this.bindEvents();

        // Listen for PO events
        eventBus.on(Events.PO_LOADED, (orders) => this.renderPOList(orders));
        eventBus.on(Events.PO_CONFIRMED, (poNumber) => this.onPOConfirmed(poNumber));
    }

    /**
     * Bind UI events
     */
    bindEvents() {
        const filterSelect = $('#po-status-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => this.filterPOList());
        }

        const searchInput = $('#po-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.searchPO());
        }
    }

    /**
     * Load PO list
     */
    async loadPOList() {
        return await poService.loadPOList();
    }

    /**
     * Filter PO list
     */
    filterPOList() {
        const filter = $('#po-status-filter')?.value;
        const searchTerm = $('#po-search')?.value.toLowerCase() || '';
        const rows = $$('#po-list-tbody tr');

        rows.forEach(row => {
            const status = row.dataset.status || '';
            const poNumber = row.querySelector('.po-number')?.textContent.toLowerCase() || '';
            const buyerName = row.querySelector('.buyer-name')?.textContent.toLowerCase() || '';

            const matchesFilter = filter === 'all' || status === filter;
            const matchesSearch = !searchTerm || poNumber.includes(searchTerm) || buyerName.includes(searchTerm);

            row.style.display = (matchesFilter && matchesSearch) ? '' : 'none';
        });

        // Update stats count based on visible rows
        this.updateFilteredStats();
    }

    /**
     * Update stats based on filtered results
     */
    updateFilteredStats() {
        const rows = $$('#po-list-tbody tr');
        const stats = {
            pending: 0,
            confirmed: 0,
            shipping: 0,
            completed: 0
        };

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                const status = row.dataset.status || '';
                if (stats[status] !== undefined) {
                    stats[status]++;
                }
            }
        });
    }

    /**
     * Search PO - applies both search and filter together
     */
    searchPO() {
        // Reuse filterPOList which now handles both filter and search
        this.filterPOList();
    }

    /**
     * Toggle status filter dropdown
     */
    toggleStatusFilter(event) {
        event.stopPropagation();
        const dropdown = $('#status-filter-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }

        // Close dropdown when clicking outside
        const closeDropdown = (e) => {
            if (!e.target.closest('.column-filter')) {
                dropdown?.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        };
        setTimeout(() => document.addEventListener('click', closeDropdown), 0);
    }

    /**
     * Apply status filter from column dropdown
     */
    applyStatusFilter(status) {
        const filterInput = $('#po-status-filter');
        if (filterInput) {
            filterInput.value = status;
        }
        this.filterPOList();

        // Update filter icon state
        const filterBtn = $('.filter-icon-btn');
        if (filterBtn) {
            filterBtn.classList.toggle('active', status !== 'all');
        }

        // Close dropdown
        const dropdown = $('#status-filter-dropdown');
        dropdown?.classList.remove('show');
    }

    /**
     * View PO detail
     */
    async viewPODetail(poNumber) {
        toast.info(`Viewing details for ${poNumber}`);

        const detail = await poService.getPODetail(poNumber);
        // TODO: Show PO detail modal with detail data
        console.log('PO Detail:', detail);
    }

    /**
     * Confirm PO
     */
    async confirmPO(poNumber) {
        const confirmed = await modal.confirm({
            title: 'Confirm Order',
            message: `Confirm order ${poNumber}?`,
            confirmText: 'Confirm',
            type: 'primary'
        });

        if (confirmed) {
            await poService.confirmPO(poNumber);
            toast.success(`Order ${poNumber} confirmed!`);
        }
    }

    /**
     * Update shipping
     */
    updateShipping(poNumber) {
        toast.info(`Update shipping for ${poNumber}`);
        // TODO: Show shipping info modal
    }

    /**
     * Track shipment
     */
    trackShipment(poNumber) {
        toast.info(`Tracking shipment for ${poNumber}`);
        // TODO: Show tracking info modal
    }

    /**
     * Export PO list
     */
    async exportPOList() {
        toast.info('Exporting PO list to CSV...');

        const result = await poService.exportToCSV();

        if (result.success) {
            toast.success(`Successfully exported ${result.count} PO records`);
        } else {
            toast.error(result.error || 'Failed to export PO list');
        }
    }

    /**
     * Render PO list
     */
    renderPOList(orders) {
        const tbody = $('#po-list-tbody');
        if (!tbody || !orders) return;

        tbody.innerHTML = orders.map(order => `
            <tr data-status="${order.status}" data-po="${order.poNumber}" data-buyer="${order.buyerName}">
                <td>
                    <a href="#" class="po-number" onclick="viewPODetail('${order.poNumber}')">${order.poNumber}</a>
                </td>
                <td>
                    <div class="buyer-cell">
                        <span class="buyer-name">${order.buyerName}</span>
                        <span class="buyer-country">${this.getCountryFlag(order.country)} ${order.country}</span>
                    </div>
                </td>
                <td>${order.orderDate}</td>
                <td>${order.items} items</td>
                <td><span class="amount">${order.totalAmount}</span></td>
                <td><span class="status-badge ${order.status}">${this.getStatusLabel(order.status)}</span></td>
                <td>
                    ${this.getActionButtons(order)}
                </td>
            </tr>
        `).join('');

        // Apply current filter after rendering
        this.filterPOList();
    }

    /**
     * Get country flag emoji
     */
    getCountryFlag(countryCode) {
        const flags = {
            'US': '🇺🇸',
            'DE': '🇩🇪',
            'JP': '🇯🇵',
            'KR': '🇰🇷',
            'CN': '🇨🇳',
            'GB': '🇬🇧',
            'FR': '🇫🇷',
            'IT': '🇮🇹'
        };
        return flags[countryCode] || '🌍';
    }

    /**
     * Get status label
     */
    getStatusLabel(status) {
        const labels = {
            pending: 'Pending',
            confirmed: 'Confirmed',
            shipped: 'Shipped',
            delivered: 'Delivered',
            cancelled: 'Cancelled'
        };
        return labels[status] || status;
    }

    /**
     * Get action buttons based on status
     */
    getActionButtons(order) {
        switch (order.status) {
            case 'pending':
                return `<button class="btn btn-sm btn-primary" onclick="confirmPO('${order.poNumber}')">Confirm</button>`;
            case 'confirmed':
                return `<button class="btn btn-sm btn-outline" onclick="updateShipping('${order.poNumber}')">Update Shipping</button>`;
            case 'shipped':
                return `<button class="btn btn-sm btn-outline" onclick="trackShipment('${order.poNumber}')">Track</button>`;
            default:
                return `<button class="btn btn-sm btn-outline" onclick="viewPODetail('${order.poNumber}')">View</button>`;
        }
    }

    /**
     * On PO confirmed callback
     */
    onPOConfirmed(poNumber) {
        // Refresh list or update row status
        this.loadPOList();
    }
}

// Create singleton instance
const salesModule = new SalesModule();

// Global functions for backward compatibility
window.filterPOList = () => salesModule.filterPOList();
window.searchPO = () => salesModule.searchPO();
window.toggleStatusFilter = (event) => salesModule.toggleStatusFilter(event);
window.applyStatusFilter = (status) => salesModule.applyStatusFilter(status);
window.viewPODetail = (poNumber) => salesModule.viewPODetail(poNumber);
window.confirmPO = (poNumber) => salesModule.confirmPO(poNumber);
window.updateShipping = (poNumber) => salesModule.updateShipping(poNumber);
window.trackShipment = (poNumber) => salesModule.trackShipment(poNumber);
window.exportPOList = () => salesModule.exportPOList();

export default salesModule;

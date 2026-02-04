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

    // ==================== Credit Management ====================

    /**
     * Open credit modal for new credit
     */
    openCreditModal(creditId = null) {
        const modalEl = $('#credit-modal');
        const titleEl = $('#credit-modal-title');
        const form = $('#credit-form');

        if (!modalEl) return;

        // Reset form
        if (form) form.reset();
        $('#credit-file-list').innerHTML = '';
        $('#credit-product-select').innerHTML = '<option value="">Select Invoice first...</option>';

        if (creditId) {
            titleEl.textContent = 'Edit Credit';
            this.loadCreditData(creditId);
        } else {
            titleEl.textContent = 'New Credit';
        }

        modalEl.style.display = 'flex';
    }

    /**
     * Close credit modal
     */
    closeCreditModal() {
        const modalEl = $('#credit-modal');
        if (modalEl) {
            modalEl.style.display = 'none';
        }
    }

    /**
     * Load Invoice products when Invoice is selected (for Credit registration)
     */
    loadInvoiceProducts() {
        const invoiceSelect = $('#credit-invoice-select');
        const productSelect = $('#credit-product-select');

        if (!invoiceSelect || !productSelect) return;

        const invoiceNumber = invoiceSelect.value;

        if (!invoiceNumber) {
            productSelect.innerHTML = '<option value="">Select Invoice first...</option>';
            return;
        }

        // Demo products based on selected Invoice
        const products = {
            'INV-2024-0089': [
                { sku: 'OIL-001', name: 'Extra Virgin Olive Oil 500ml', qty: 100, price: 25.00 },
                { sku: 'OIL-002', name: 'Balsamic Vinegar 250ml', qty: 50, price: 18.00 }
            ],
            'INV-2024-0088': [
                { sku: 'CHE-003', name: 'Aged Parmesan 24 months', qty: 30, price: 160.00 },
                { sku: 'CHE-001', name: 'Mozzarella Fresh 200g', qty: 80, price: 12.00 }
            ],
            'INV-2024-0087': [
                { sku: 'HON-002', name: 'Organic Honey 350g', qty: 200, price: 18.00 },
                { sku: 'HON-001', name: 'Raw Honey 500g', qty: 150, price: 22.00 }
            ]
        };

        const invoiceProducts = products[invoiceNumber] || [];
        productSelect.innerHTML = '<option value="">Select a product...</option>' +
            invoiceProducts.map(p => `<option value="${p.sku}" data-price="${p.price}">${p.name} (${p.qty} units @ $${p.price})</option>`).join('');
    }

    /**
     * Handle credit file uploads
     */
    handleCreditFiles(event) {
        const files = event.target.files;
        const fileList = $('#credit-file-list');

        if (!fileList) return;

        Array.from(files).forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'wd-file-item';
            fileItem.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
                <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
            `;
            fileList.appendChild(fileItem);
        });
    }

    /**
     * Save credit
     */
    async saveCredit() {
        const form = $('#credit-form');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }

        const invoiceSelect = $('#credit-invoice-select');
        const selectedOption = invoiceSelect?.options[invoiceSelect.selectedIndex];

        const creditData = {
            invoiceNumber: invoiceSelect?.value,
            buyerName: selectedOption?.dataset.buyer || '',
            productSku: $('#credit-product-select')?.value,
            reason: $('#credit-reason')?.value,
            quantity: parseInt($('#credit-qty')?.value) || 0,
            amount: parseFloat($('#credit-amount')?.value) || 0,
            description: $('#credit-description')?.value
        };

        // Demo: Show success
        toast.success('Credit submitted successfully!');
        this.closeCreditModal();

        // TODO: API call to save credit
        console.log('Credit data:', creditData);
    }

    /**
     * Filter credits
     */
    filterCredits() {
        const statusFilter = $('#credit-status-filter')?.value || 'all';
        const searchTerm = $('#credit-search')?.value.toLowerCase() || '';
        const rows = $$('#credit-table-body tr');

        rows.forEach(row => {
            const status = row.querySelector('.wd-badge')?.textContent.toLowerCase() || '';
            const invoiceNumber = row.querySelector('.wd-link')?.textContent.toLowerCase() || '';
            const buyerName = row.querySelector('.buyer-name')?.textContent.toLowerCase() || '';
            const product = row.querySelector('.wd-product-name')?.textContent.toLowerCase() || '';

            const matchesStatus = statusFilter === 'all' || status.includes(statusFilter);
            const matchesSearch = !searchTerm ||
                invoiceNumber.includes(searchTerm) ||
                buyerName.includes(searchTerm) ||
                product.includes(searchTerm);

            row.style.display = (matchesStatus && matchesSearch) ? '' : 'none';
        });
    }

    /**
     * View credit detail
     */
    viewCreditDetail(creditId) {
        toast.info(`Viewing credit ${creditId}`);
        // TODO: Show credit detail modal
    }

    /**
     * Edit credit
     */
    editCredit(creditId) {
        this.openCreditModal(creditId);
        toast.info(`Editing credit ${creditId}`);
    }

    /**
     * View Invoice from credit
     */
    viewInvoiceFromCredit(invoiceNumber) {
        // Navigate to PI Management and show detail
        window.showSection('pi-management');
        setTimeout(() => {
            this.viewPI(invoiceNumber);
        }, 300);
    }

    /**
     * Export credits to CSV
     */
    exportCredits() {
        toast.info('Exporting credits to CSV...');

        // Demo export
        const csvContent = 'Credit ID,PO Number,Product,Reason,Amount,Status,Date\n' +
            'CR-2024-001,PO-2024-0156,Extra Virgin Olive Oil,Damaged packaging,$125.00,Pending,2024-02-01\n' +
            'CR-2024-002,PO-2024-0142,Aged Parmesan,Quality issue,$320.00,Approved,2024-01-28\n' +
            'CR-2024-003,PO-2024-0138,Organic Honey,Short shipment,$180.00,Used,2024-01-20';

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'credits_export.csv';
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Credits exported successfully!');
    }

    // ==================== PI (Proforma Invoice) Management ====================

    /**
     * Open PI modal for new or edit
     */
    openPIModal(piId = null) {
        const modalEl = $('#pi-modal');
        const titleEl = $('#pi-modal-title');
        const form = $('#pi-form');

        if (!modalEl) return;

        // Reset form
        if (form) form.reset();
        this.clearPIItems();
        this.clearPICredits();
        this.updatePISummary();

        if (piId) {
            titleEl.textContent = 'Edit Proforma Invoice';
            this.loadPIData(piId);
        } else {
            titleEl.textContent = 'Create Proforma Invoice';
        }

        modalEl.style.display = 'flex';
    }

    /**
     * Close PI modal
     */
    closePIModal() {
        const modalEl = $('#pi-modal');
        if (modalEl) {
            modalEl.style.display = 'none';
        }
    }

    /**
     * Load PO data when creating PI
     * Credits are loaded based on Buyer, not PO
     */
    loadPOForPI() {
        const poSelect = $('#pi-po-select');
        const itemsContainer = $('#pi-items-container');
        const creditsContainer = $('#pi-available-credits');
        const creditBadge = $('#available-credit-badge');

        if (!poSelect || !itemsContainer) return;

        const poNumber = poSelect.value;
        const selectedOption = poSelect.options[poSelect.selectedIndex];

        if (!poNumber) {
            this.clearPIItems();
            this.clearPICredits();
            this.updatePISummary();
            this.hidePISections();
            return;
        }

        // Show all sections when PO is selected
        this.showPISections();

        // Demo: PO items data with buyer info
        const poData = {
            'PO-2024-0156': {
                buyer: 'ABC Distribution',
                items: [
                    { sku: 'OIL-001', name: 'Extra Virgin Olive Oil 500ml', qty: 100, price: 25.00 },
                    { sku: 'OIL-002', name: 'Balsamic Vinegar 250ml', qty: 50, price: 18.00 }
                ]
            },
            'PO-2024-0142': {
                buyer: 'XYZ Foods Ltd',
                items: [
                    { sku: 'CHE-003', name: 'Aged Parmesan 24 months', qty: 30, price: 160.00 },
                    { sku: 'CHE-001', name: 'Mozzarella Fresh 200g', qty: 80, price: 12.00 }
                ]
            },
            'PO-2024-0138': {
                buyer: 'Global Trade Co',
                items: [
                    { sku: 'HON-002', name: 'Organic Honey 350g', qty: 200, price: 18.00 },
                    { sku: 'HON-001', name: 'Raw Honey 500g', qty: 150, price: 22.00 }
                ]
            }
        };

        // Demo: Credits by Buyer (not by PO)
        // These are unused/approved credits from this buyer's previous invoices
        const creditsByBuyer = {
            'ABC Distribution': [
                { id: 'CR-2024-001', invoiceRef: 'INV-2024-0089', reason: 'Damaged packaging', amount: 125.00, status: 'approved' }
            ],
            'XYZ Foods Ltd': [
                { id: 'CR-2024-002', invoiceRef: 'INV-2024-0088', reason: 'Quality issue', amount: 320.00, status: 'approved' }
            ],
            'Global Trade Co': []  // No available credits
        };

        const data = poData[poNumber];
        if (!data) {
            this.clearPIItems();
            this.clearPICredits();
            return;
        }

        // Render items
        const itemsTbody = $('#pi-items-tbody');
        if (itemsTbody) {
            itemsTbody.innerHTML = data.items.map((item, idx) => `
                <tr data-sku="${item.sku}">
                    <td>
                        <div class="wd-product-cell">
                            <span class="wd-product-name">${item.name}</span>
                            <span class="wd-product-sku">SKU: ${item.sku}</span>
                        </div>
                    </td>
                    <td>
                        <input type="number" class="wd-input wd-input-sm pi-qty" value="${item.qty}" min="1"
                               onchange="updatePIItemTotal(${idx})" style="width: 70px;">
                    </td>
                    <td>
                        <input type="number" class="wd-input wd-input-sm pi-price" value="${item.price}" min="0" step="0.01"
                               onchange="updatePIItemTotal(${idx})" style="width: 90px;">
                    </td>
                    <td class="pi-item-total wd-text-right">$${(item.qty * item.price).toFixed(2)}</td>
                </tr>
            `).join('');
        }

        // Load credits based on Buyer (not PO)
        const buyerCredits = creditsByBuyer[data.buyer] || [];
        const totalAvailableCredit = buyerCredits.reduce((sum, c) => sum + c.amount, 0);

        if (creditBadge) {
            creditBadge.textContent = `$${totalAvailableCredit.toFixed(2)} available`;
        }

        if (creditsContainer) {
            if (buyerCredits.length > 0) {
                creditsContainer.innerHTML = buyerCredits.map(credit => `
                    <div class="wd-credit-item">
                        <label class="wd-checkbox-label">
                            <input type="checkbox" class="pi-credit-check" value="${credit.id}"
                                   data-amount="${credit.amount}" onchange="updatePISummary()">
                            <div class="credit-info">
                                <span class="credit-id">${credit.id}</span>
                                <span class="credit-ref">from ${credit.invoiceRef}</span>
                                <span class="credit-reason">${credit.reason}</span>
                            </div>
                            <span class="credit-amount wd-text-success">-$${credit.amount.toFixed(2)}</span>
                        </label>
                    </div>
                `).join('');
            } else {
                creditsContainer.innerHTML = '<p class="wd-text-muted">No available credits for this buyer</p>';
            }
        }

        this.updatePISummary();
    }

    /**
     * Show PI form sections
     */
    showPISections() {
        $('#pi-items-section')?.style && ($('#pi-items-section').style.display = 'block');
        $('#pi-credit-section')?.style && ($('#pi-credit-section').style.display = 'block');
        $('#pi-summary-section')?.style && ($('#pi-summary-section').style.display = 'block');
        $('#pi-terms-section')?.style && ($('#pi-terms-section').style.display = 'block');
    }

    /**
     * Hide PI form sections
     */
    hidePISections() {
        $('#pi-items-section')?.style && ($('#pi-items-section').style.display = 'none');
        $('#pi-credit-section')?.style && ($('#pi-credit-section').style.display = 'none');
        $('#pi-summary-section')?.style && ($('#pi-summary-section').style.display = 'none');
        $('#pi-terms-section')?.style && ($('#pi-terms-section').style.display = 'none');
    }

    /**
     * Clear PI items
     */
    clearPIItems() {
        const container = $('#pi-items-tbody');
        if (container) {
            container.innerHTML = '<tr><td colspan="4" class="wd-text-center wd-text-muted">Select a PO to load items</td></tr>';
        }
    }

    /**
     * Clear PI credits
     */
    clearPICredits() {
        const container = $('#pi-available-credits');
        const badge = $('#available-credit-badge');
        if (container) {
            container.innerHTML = '<p class="wd-text-muted">Select a PO to see available credits from this buyer</p>';
        }
        if (badge) {
            badge.textContent = '$0.00 available';
        }
    }

    /**
     * Update PI item total when qty/price changes
     */
    updatePIItemTotal(index) {
        const rows = $$('#pi-items-tbody tr');
        if (!rows[index]) return;

        const row = rows[index];
        const qty = parseFloat(row.querySelector('.pi-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.pi-price')?.value) || 0;
        const totalCell = row.querySelector('.pi-item-total');

        if (totalCell) {
            totalCell.textContent = `$${(qty * price).toFixed(2)}`;
        }

        this.updatePISummary();
    }

    /**
     * Update PI summary (subtotal, credits, total)
     */
    updatePISummary() {
        // Calculate subtotal from items
        let subtotal = 0;
        $$('#pi-items-tbody tr').forEach(row => {
            const qty = parseFloat(row.querySelector('.pi-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.pi-price')?.value) || 0;
            subtotal += qty * price;
        });

        // Calculate applied credits (from buyer's available credits)
        let creditTotal = 0;
        $$('.pi-credit-check:checked').forEach(checkbox => {
            creditTotal += parseFloat(checkbox.dataset.amount) || 0;
        });

        // Update display
        const subtotalEl = $('#pi-subtotal');
        const creditEl = $('#pi-credit-discount');
        const totalEl = $('#pi-total');

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (creditEl) creditEl.textContent = `-$${creditTotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${Math.max(0, subtotal - creditTotal).toFixed(2)}`;
    }

    /**
     * Filter PI list
     */
    filterPIList() {
        const statusFilter = $('#pi-status-filter')?.value || 'all';
        const searchTerm = $('#pi-search')?.value.toLowerCase() || '';
        const rows = $$('#pi-table-body tr');

        rows.forEach(row => {
            const status = row.dataset.status || '';
            const piNumber = row.querySelector('.pi-number')?.textContent.toLowerCase() || '';
            const poNumber = row.querySelector('.po-ref')?.textContent.toLowerCase() || '';
            const buyer = row.querySelector('.buyer-name')?.textContent.toLowerCase() || '';

            const matchesStatus = statusFilter === 'all' || status === statusFilter;
            const matchesSearch = !searchTerm ||
                piNumber.includes(searchTerm) ||
                poNumber.includes(searchTerm) ||
                buyer.includes(searchTerm);

            row.style.display = (matchesStatus && matchesSearch) ? '' : 'none';
        });
    }

    /**
     * View PI detail
     */
    viewPI(piNumber) {
        toast.info(`Viewing PI ${piNumber}`);
        // TODO: Show PI detail view/print preview
    }

    /**
     * Edit PI
     */
    editPI(piNumber) {
        this.openPIModal(piNumber);
    }

    /**
     * Send PI to buyer
     */
    async sendPI(piNumber) {
        const confirmed = await modal.confirm({
            title: 'Send Proforma Invoice',
            message: `Send ${piNumber} to the buyer?`,
            confirmText: 'Send',
            type: 'primary'
        });

        if (confirmed) {
            toast.success(`${piNumber} sent to buyer!`);
            // TODO: API call to send PI
        }
    }

    /**
     * Download PI as PDF
     */
    downloadPI(piNumber) {
        toast.info(`Downloading ${piNumber} as PDF...`);
        // TODO: Generate and download PDF
        setTimeout(() => {
            toast.success(`${piNumber} downloaded!`);
        }, 1000);
    }

    /**
     * Save PI as draft
     */
    async saveAsDraft() {
        const piData = this.collectPIFormData();

        if (!piData.poNumber) {
            toast.error('Please select a PO');
            return;
        }

        toast.success('PI saved as draft!');
        this.closePIModal();

        // TODO: API call to save draft
        console.log('PI Draft:', piData);
    }

    /**
     * Create and send PI
     */
    async createAndSendPI() {
        const piData = this.collectPIFormData();

        if (!piData.poNumber) {
            toast.error('Please select a PO');
            return;
        }

        const confirmed = await modal.confirm({
            title: 'Create & Send PI',
            message: 'Create this Proforma Invoice and send it to the buyer?',
            confirmText: 'Create & Send',
            type: 'primary'
        });

        if (confirmed) {
            toast.success('PI created and sent to buyer!');
            this.closePIModal();

            // TODO: API call to create and send PI
            console.log('PI Data:', piData);
        }
    }

    /**
     * Collect PI form data
     */
    collectPIFormData() {
        const poSelect = $('#pi-po-select');
        const selectedOption = poSelect?.options[poSelect.selectedIndex];
        const poText = selectedOption?.text || '';
        // Extract buyer name from option text (e.g., "PO-2024-0156 - ABC Distribution (Feb 01, 2024)")
        const buyerMatch = poText.match(/- (.+?) \(/);
        const buyerName = buyerMatch ? buyerMatch[1] : '';

        const items = [];
        $$('#pi-items-tbody tr').forEach(row => {
            const sku = row.dataset.sku;
            if (!sku) return;

            items.push({
                sku: sku,
                qty: parseInt(row.querySelector('.pi-qty')?.value) || 0,
                price: parseFloat(row.querySelector('.pi-price')?.value) || 0
            });
        });

        const appliedCredits = [];
        $$('.pi-credit-check:checked').forEach(checkbox => {
            appliedCredits.push({
                creditId: checkbox.value,
                amount: parseFloat(checkbox.dataset.amount) || 0
            });
        });

        return {
            poNumber: poSelect?.value,
            buyerName: buyerName,
            items: items,
            appliedCredits: appliedCredits,
            paymentMethod: $('#pi-payment-method')?.value,
            validUntil: $('#pi-valid-until')?.value,
            remarks: $('#pi-remarks')?.value
        };
    }

    /**
     * Load PI data for editing
     */
    loadPIData(piId) {
        // TODO: Load PI data from API
        toast.info(`Loading PI ${piId}...`);
    }

    /**
     * View PO from PI
     */
    viewPOFromPI(poNumber) {
        window.showSection('po-management');
        setTimeout(() => {
            this.viewPODetail(poNumber);
        }, 300);
    }

    /**
     * Export PI list to CSV
     */
    exportPIList() {
        toast.info('Exporting PI list to CSV...');

        const csvContent = 'PI Number,PO Reference,Buyer,Issue Date,Subtotal,Credit,Total,Status\n' +
            'PI-2024-0089,PO-2024-0156,Gourmet Foods Inc.,2024-02-01,$3400.00,$125.00,$3275.00,Sent\n' +
            'PI-2024-0088,PO-2024-0142,European Delights,2024-01-30,$5760.00,$320.00,$5440.00,Draft\n' +
            'PI-2024-0087,PO-2024-0138,Health Foods Co.,2024-01-28,$6900.00,$0.00,$6900.00,Paid';

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'proforma_invoices_export.csv';
        a.click();
        URL.revokeObjectURL(url);

        toast.success('PI list exported successfully!');
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

// Credit Management global functions
window.openCreditModal = (creditId) => salesModule.openCreditModal(creditId);
window.closeCreditModal = () => salesModule.closeCreditModal();
window.loadInvoiceProducts = () => salesModule.loadInvoiceProducts();
window.handleCreditFiles = (event) => salesModule.handleCreditFiles(event);
window.saveCredit = () => salesModule.saveCredit();
window.filterCredits = () => salesModule.filterCredits();
window.viewCreditDetail = (creditId) => salesModule.viewCreditDetail(creditId);
window.editCredit = (creditId) => salesModule.editCredit(creditId);
window.viewInvoiceFromCredit = (invoiceNumber) => salesModule.viewInvoiceFromCredit(invoiceNumber);
window.exportCredits = () => salesModule.exportCredits();

// PI (Proforma Invoice) Management global functions
window.openPIModal = (piId) => salesModule.openPIModal(piId);
window.closePIModal = () => salesModule.closePIModal();
window.loadPOForPI = () => salesModule.loadPOForPI();
window.updatePIItemTotal = (index) => salesModule.updatePIItemTotal(index);
window.updatePISummary = () => salesModule.updatePISummary();
window.filterPIList = () => salesModule.filterPIList();
window.viewPI = (piNumber) => salesModule.viewPI(piNumber);
window.editPI = (piNumber) => salesModule.editPI(piNumber);
window.sendPI = (piNumber) => salesModule.sendPI(piNumber);
window.downloadPI = (piNumber) => salesModule.downloadPI(piNumber);
window.saveAsDraft = () => salesModule.saveAsDraft();
window.createAndSendPI = () => salesModule.createAndSendPI();
window.viewPOFromPI = (poNumber) => salesModule.viewPOFromPI(poNumber);
window.exportPIList = () => salesModule.exportPIList();

export default salesModule;

// WeDealize Supplier Portal - Sales Module
// PO Management UI and interactions

import poService from '../services/po.js';
import api from '../services/api.js';
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
     * Load INV list from API
     */
    async loadINVList() {
        try {
            const invList = await api.get('/invoices');
            this.renderINVTableRows(invList);
            return invList;
        } catch (error) {
            console.error('Failed to load INV list:', error);
            // Silently fail - keep existing demo data in HTML
            return [];
        }
    }

    /**
     * Render INV list into table
     */
    renderINVTableRows(invList) {
        const tbody = $('#inv-table-body');
        if (!tbody || !invList) return;

        if (invList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="wd-text-center wd-text-muted" style="padding: 40px;">
                        No invoices yet. Click "Add INV" to get started.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = invList.map(inv => {
            const statusBadgeClass = {
                draft: 'wd-badge-outline',
                sent: 'wd-badge-primary',
                cancelled: 'wd-badge-danger'
            }[inv.status] || 'wd-badge-outline';

            const paymentBadgeClass = inv.payment_status === 'paid' ? 'wd-badge-success' : 'wd-badge-warning';
            const itemCount = inv.invoice_items?.length || 0;
            const invDate = inv.inv_date ? new Date(inv.inv_date).toLocaleDateString() : '-';

            return `
                <tr data-status="${inv.status}" data-payment="${inv.payment_status}" data-id="${inv.id}">
                    <td>
                        <a href="#" class="wd-link inv-number" onclick="viewINVDetail('${inv.id}')">${inv.inv_number}</a>
                    </td>
                    <td>
                        ${inv.po_number ? `<a href="#" class="wd-link po-ref" onclick="viewPOFromINV('${inv.po_number}')">${inv.po_number}</a>` : '<span class="wd-text-muted">-</span>'}
                    </td>
                    <td>
                        <div class="wd-buyer-cell">
                            <span class="buyer-name">${inv.buyer_name}</span>
                            ${inv.buyer_country ? `<span class="wd-text-muted">${inv.buyer_country}</span>` : ''}
                        </div>
                    </td>
                    <td>${invDate}</td>
                    <td class="wd-text-right">$${parseFloat(inv.subtotal).toFixed(2)}</td>
                    <td class="wd-text-right wd-text-success">${parseFloat(inv.credit_discount) > 0 ? `-$${parseFloat(inv.credit_discount).toFixed(2)}` : '-'}</td>
                    <td class="wd-text-right wd-text-bold">$${parseFloat(inv.total_amount).toFixed(2)}</td>
                    <td><span class="wd-badge ${statusBadgeClass}">${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</span></td>
                    <td>
                        <div class="wd-action-btns">
                            ${inv.status === 'draft' ? `<button class="wd-btn-text wd-btn-sm" onclick="sendINV('${inv.id}')">Send</button>` : ''}
                            <button class="wd-btn-icon" onclick="editINV('${inv.id}')" title="Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Apply current filter
        this.filterINVList();
    }

    /**
     * Load Credit list from API
     */
    async loadCreditList() {
        try {
            const creditList = await api.get('/credits');
            this.renderCreditTableRows(creditList);
            return creditList;
        } catch (error) {
            console.error('Failed to load credit list:', error);
            return [];
        }
    }

    /**
     * Render Credit list into table
     */
    renderCreditTableRows(creditList) {
        const tbody = $('#credit-table-body');
        if (!tbody || !creditList) return;

        if (creditList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="wd-text-center wd-text-muted" style="padding: 40px;">
                        No credits yet. Click "New Credit" to register one.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = creditList.map(credit => {
            const statusBadgeClass = {
                draft: 'wd-badge-outline',
                approved: 'wd-badge-success',
                used: 'wd-badge-primary',
                cancelled: 'wd-badge-danger'
            }[credit.status] || 'wd-badge-outline';

            const reasonLabels = {
                damaged: 'Damaged',
                quality: 'Quality Issue',
                short: 'Short Shipment',
                wrong: 'Wrong Item',
                expired: 'Expired',
                other: 'Other'
            };

            const createdDate = credit.created_at ? new Date(credit.created_at).toLocaleDateString() : '-';

            return `
                <tr data-status="${credit.status}" data-id="${credit.id}">
                    <td>
                        <a href="#" class="wd-link" onclick="viewCreditDetail('${credit.id}')">${credit.credit_number}</a>
                    </td>
                    <td>
                        ${credit.invoice_number ? `<a href="#" class="wd-link" onclick="viewInvoiceFromCredit('${credit.invoice_number}')">${credit.invoice_number}</a>` : '<span class="wd-text-muted">-</span>'}
                    </td>
                    <td>
                        <span class="buyer-name">${credit.buyer_name}</span>
                    </td>
                    <td>
                        <span class="wd-product-name">${credit.product_name || '-'}</span>
                    </td>
                    <td>${reasonLabels[credit.reason] || credit.reason}</td>
                    <td class="wd-text-right wd-text-bold">$${parseFloat(credit.amount).toFixed(2)}</td>
                    <td><span class="wd-badge ${statusBadgeClass}">${credit.status.charAt(0).toUpperCase() + credit.status.slice(1)}</span></td>
                    <td>${createdDate}</td>
                    <td>
                        <div class="wd-action-btns">
                            ${credit.status === 'draft' ? `<button class="wd-btn-text wd-btn-sm" onclick="approveCredit('${credit.id}')">Approve</button>` : ''}
                            <button class="wd-btn-icon" onclick="editCredit('${credit.id}')" title="Edit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Apply current filter
        this.filterCredits();
    }

    /**
     * Approve a credit (draft → approved)
     */
    async approveCredit(creditId) {
        try {
            await api.patch(`/credits/${creditId}`, { status: 'approved' });
            toast.success('Credit approved!');
            this.loadCreditList();
        } catch (error) {
            toast.error(error.message || 'Failed to approve credit');
        }
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
    async confirmPO(poId) {
        const confirmed = await modal.confirm({
            title: 'Confirm Order',
            message: `Confirm this purchase order?`,
            confirmText: 'Confirm',
            type: 'primary'
        });

        if (confirmed) {
            try {
                await poService.confirmPO(poId);
                toast.success('Order confirmed!');
                this.loadPOList();
            } catch (error) {
                toast.error(error.message || 'Failed to confirm PO');
            }
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

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:#888;">No purchase orders found</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(order => {
            const poNumber = order.po_number || order.poNumber || '';
            const buyerName = order.buyer_name || order.buyerName || '';
            const buyerCountry = order.buyer_country || order.country || '';
            const status = order.status || '';
            const totalAmount = order.total_amount ?? order.totalAmount ?? 0;
            const currency = order.currency || 'USD';
            const paymentTerms = order.payment_terms || order.paymentTerms || '-';
            const incoterms = order.incoterms || '-';
            const createdBy = order.created_by || order.createdBy || '-';
            const updatedAt = order.updated_at || order.updatedAt || order.created_at || '';
            const items = order.order_items || order.items || [];
            const itemCount = typeof items === 'number' ? items : items.length;
            const productName = Array.isArray(items) && items.length > 0
                ? (items[0].product_name || items[0].productName || '-')
                : '-';
            const formattedAmount = typeof totalAmount === 'number'
                ? `${currency} ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : totalAmount;
            const formattedDate = updatedAt ? new Date(updatedAt).toLocaleDateString() : '-';
            const orderId = order.id || '';

            return `
            <tr data-status="${status}" data-po="${poNumber}" data-buyer="${buyerName}" data-id="${orderId}">
                <td>
                    <a href="#" class="po-number" onclick="viewPODetail('${orderId}')">${poNumber}</a>
                </td>
                <td><span class="status-badge ${status}">${this.getStatusLabel(status)}</span></td>
                <td>${productName}${itemCount > 1 ? ` (+${itemCount - 1})` : ''}</td>
                <td><span class="amount">${formattedAmount}</span></td>
                <td>
                    <div class="buyer-cell">
                        <span class="buyer-name">${buyerName}</span>
                    </div>
                </td>
                <td>${paymentTerms}</td>
                <td>${incoterms}</td>
                <td>${formattedDate}</td>
                <td>
                    ${this.getPOActionButtons(order)}
                </td>
            </tr>`;
        }).join('');

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
            draft: 'Draft',
            pending: 'Pending',
            confirmed: 'Confirmed',
            shipping: 'Shipping',
            shipped: 'Shipped',
            delivered: 'Delivered',
            cancelled: 'Cancelled'
        };
        return labels[status] || status;
    }

    /**
     * Get PO action buttons based on status
     */
    getPOActionButtons(order) {
        const orderId = order.id || '';
        const poNumber = order.po_number || order.poNumber || '';
        let buttons = '';

        if (order.status === 'draft' || order.status === 'pending') {
            buttons += `<button class="btn btn-sm btn-outline" onclick="editPO('${orderId}')" title="Edit">Edit</button> `;
            buttons += `<button class="btn btn-sm btn-danger" onclick="deletePO('${orderId}')" title="Delete">Delete</button>`;
        }
        if (order.status === 'pending') {
            buttons = `<button class="btn btn-sm btn-primary" onclick="confirmPO('${orderId}')">Confirm</button> ` + buttons;
        }
        if (order.status === 'confirmed') {
            buttons = `<button class="btn btn-sm btn-outline" onclick="viewPODetail('${orderId}')">View</button>`;
        }
        if (order.status === 'shipping' || order.status === 'shipped') {
            buttons = `<button class="btn btn-sm btn-outline" onclick="viewPODetail('${orderId}')">Track</button>`;
        }
        if (!buttons) {
            buttons = `<button class="btn btn-sm btn-outline" onclick="viewPODetail('${orderId}')">View</button>`;
        }

        return buttons;
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
     * Open credit page for new/edit credit
     */
    openCreditModal(creditId = null) {
        // Navigate to dedicated credit edit page
        window.location.href = creditId ? `credit-edit.html?id=${creditId}` : 'credit-edit.html?id=new';
    }

    /**
     * Load credit data for editing
     */
    async loadCreditData(creditId) {
        try {
            const credit = await api.get(`/credits/${creditId}`);

            const invoiceSelect = $('#credit-invoice-select');
            if (invoiceSelect && credit.invoice_number) {
                invoiceSelect.value = credit.invoice_number;
            }

            const reasonSelect = $('#credit-reason');
            if (reasonSelect && credit.reason) {
                reasonSelect.value = credit.reason;
            }

            const qtyInput = $('#credit-qty');
            if (qtyInput && credit.affected_quantity) {
                qtyInput.value = credit.affected_quantity;
            }

            const amountInput = $('#credit-amount');
            if (amountInput && credit.amount) {
                amountInput.value = credit.amount;
            }

            const descInput = $('#credit-description');
            if (descInput && credit.description) {
                descInput.value = credit.description;
            }

            // Store editing credit id
            this._editingCreditId = creditId;
        } catch (error) {
            toast.error(error.message || 'Failed to load credit data');
        }
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
     * Save credit as draft
     */
    async saveCreditAsDraft() {
        const creditData = this.collectCreditFormData();
        creditData.status = 'draft';

        if (!creditData.buyerName) {
            toast.error('Please select an invoice to identify the buyer');
            return;
        }

        if (!creditData.reason) {
            toast.error('Please select a reason');
            return;
        }

        try {
            const result = await api.post('/credits', creditData);
            toast.success('Credit saved as draft!');
            this.closeCreditModal();

            this.logActivity('created', 'credit', result.credit_number, `${result.credit_number} (Draft)`, {
                status: 'draft'
            });

            this.loadCreditList();
        } catch (error) {
            toast.error(error.message || 'Failed to save credit as draft');
        }
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

        const creditData = this.collectCreditFormData();
        creditData.status = 'approved';

        if (!creditData.buyerName) {
            toast.error('Please select an invoice to identify the buyer');
            return;
        }

        try {
            const result = await api.post('/credits', creditData);
            toast.success('Credit submitted successfully!');
            this.closeCreditModal();

            this.logActivity('created', 'credit', result.credit_number, result.credit_number);

            this.loadCreditList();
        } catch (error) {
            toast.error(error.message || 'Failed to submit credit');
        }
    }

    /**
     * Collect credit form data
     */
    collectCreditFormData() {
        const invoiceSelect = $('#credit-invoice-select');
        const selectedOption = invoiceSelect?.options[invoiceSelect.selectedIndex];
        const productSelect = $('#credit-product-select');
        const productOption = productSelect?.options[productSelect?.selectedIndex];

        return {
            invoiceNumber: invoiceSelect?.value || null,
            buyerName: selectedOption?.dataset.buyer || '',
            productName: productOption?.textContent?.split(' (')[0] || '',
            productSku: productSelect?.value || null,
            reason: $('#credit-reason')?.value || '',
            affectedQuantity: parseInt($('#credit-qty')?.value) || 0,
            amount: parseFloat($('#credit-amount')?.value) || 0,
            description: $('#credit-description')?.value || null
        };
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
     * Toggle Credit status filter dropdown
     */
    toggleCreditStatusFilter(event) {
        event.stopPropagation();
        const dropdown = $('#credit-status-filter-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
        const closeDropdown = (e) => {
            if (!e.target.closest('.wd-column-filter')) {
                dropdown?.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        };
        setTimeout(() => document.addEventListener('click', closeDropdown), 0);
    }

    /**
     * Apply Credit status filter
     */
    applyCreditStatusFilter(status) {
        const filterInput = $('#credit-status-filter');
        if (filterInput) filterInput.value = status;
        this.filterCredits();
        const dropdown = $('#credit-status-filter-dropdown');
        dropdown?.classList.remove('show');
    }

    /**
     * Sort Credit table
     */
    sortCreditTable(column) {
        toast.info(`Sorting credits by ${column}`);
        // TODO: Implement Credit table sorting
    }

    /**
     * View credit detail
     */
    viewCreditDetail(creditId) {
        toast.info(`Viewing credit ${creditId}`);
        // TODO: Show credit detail modal
    }

    /**
     * Edit credit - navigate to dedicated edit page
     */
    editCredit(creditId) {
        window.location.href = `credit-edit.html?id=${creditId}`;
    }

    /**
     * View Invoice from credit
     */
    viewInvoiceFromCredit(invoiceNumber) {
        // Navigate to INV Management and show detail
        window.showSection('inv-management');
        setTimeout(() => {
            this.viewINV(invoiceNumber);
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

    // ==================== INV (Invoice) Management ====================

    /**
     * Close INV modal
     */
    closeINVModal() {
        const modalEl = $('#inv-modal');
        if (modalEl) {
            modalEl.style.display = 'none';
        }
    }

    /**
     * Clear INV credits
     */
    clearINVCredits() {
        const container = $('#inv-available-credits');
        const badge = $('#available-credit-badge');
        if (container) {
            container.innerHTML = '<p class="wd-text-muted">Select a PO to see available credits from this buyer</p>';
        }
        if (badge) {
            badge.textContent = '$0.00 available';
        }
    }

    /**
     * Update INV summary (subtotal, credits, total)
     */
    updateINVSummary() {
        // Calculate subtotal from items
        let subtotal = 0;
        $$('#inv-items-tbody tr:not(.wd-empty-row)').forEach(row => {
            const qty = parseFloat(row.querySelector('.inv-item-qty')?.value || row.querySelector('.inv-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.inv-item-price')?.value || row.querySelector('.inv-price')?.value) || 0;
            subtotal += qty * price;
        });

        // Calculate applied credits (from buyer's available credits)
        let creditTotal = 0;
        $$('.inv-credit-check:checked').forEach(checkbox => {
            creditTotal += parseFloat(checkbox.dataset.amount) || 0;
        });

        // Update display
        const subtotalEl = $('#inv-subtotal');
        const creditEl = $('#inv-credit-discount');
        const totalEl = $('#inv-total');

        if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        if (creditEl) creditEl.textContent = `-$${creditTotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `$${Math.max(0, subtotal - creditTotal).toFixed(2)}`;
    }

    /**
     * Filter INV list
     */
    filterINVList() {
        const statusFilter = $('#inv-status-filter')?.value || 'all';
        const searchTerm = $('#inv-search')?.value.toLowerCase() || '';
        const rows = $$('#inv-table-body tr');

        rows.forEach(row => {
            const status = row.dataset.status || '';
            const invNumber = row.querySelector('.inv-number')?.textContent.toLowerCase() || '';
            const poNumber = row.querySelector('.po-ref')?.textContent.toLowerCase() || '';
            const buyer = row.querySelector('.buyer-name')?.textContent.toLowerCase() || '';

            const matchesStatus = statusFilter === 'all' || status === statusFilter;
            const matchesSearch = !searchTerm ||
                invNumber.includes(searchTerm) ||
                poNumber.includes(searchTerm) ||
                buyer.includes(searchTerm);

            row.style.display = (matchesStatus && matchesSearch) ? '' : 'none';
        });
    }

    /**
     * Toggle INV status filter dropdown
     */
    toggleINVStatusFilter(event) {
        event.stopPropagation();
        const dropdown = $('#inv-status-filter-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
        const closeDropdown = (e) => {
            if (!e.target.closest('.wd-column-filter')) {
                dropdown?.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        };
        setTimeout(() => document.addEventListener('click', closeDropdown), 0);
    }

    /**
     * Apply INV status filter
     */
    applyINVStatusFilter(status) {
        const filterInput = $('#inv-status-filter');
        if (filterInput) filterInput.value = status;
        this.filterINVList();
        const dropdown = $('#inv-status-filter-dropdown');
        dropdown?.classList.remove('show');
    }

    /**
     * Sort INV table
     */
    sortINVTable(column) {
        toast.info(`Sorting by ${column}`);
        // TODO: Implement INV table sorting
    }

    /**
     * View INV detail (click row)
     */
    viewINVDetail(invNumber) {
        toast.info(`Viewing details for ${invNumber}`);
        // TODO: Show INV detail drawer/modal
    }

    /**
     * View INV
     */
    viewINV(invNumber) {
        toast.info(`Viewing INV ${invNumber}`);
        // TODO: Show INV detail view/print preview
    }

    /**
     * Edit INV - navigate to dedicated edit page
     */
    editINV(invNumber) {
        window.location.href = `inv-edit.html?id=${invNumber}`;
    }

    /**
     * Send INV to buyer
     */
    async sendINV(invId) {
        const confirmed = await modal.confirm({
            title: 'Send Invoice',
            message: `Send this INV to the buyer?`,
            confirmText: 'Send',
            type: 'primary'
        });

        if (confirmed) {
            try {
                await api.post(`/invoices/${invId}/send`);
                toast.success('INV sent to buyer!');
                this.loadINVList();
            } catch (error) {
                toast.error(error.message || 'Failed to send INV');
            }
        }
    }

    /**
     * Download INV as PDF
     */
    downloadINV(invNumber) {
        toast.info(`Downloading ${invNumber} as PDF...`);
        // TODO: Generate and download PDF
        setTimeout(() => {
            toast.success(`${invNumber} downloaded!`);
        }, 1000);
    }

    /**
     * Save INV as draft
     */
    async saveAsDraft() {
        const invData = this.collectINVFormData();

        if (!invData.items || invData.items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        if (!invData.buyerName) {
            toast.error('Please select a buyer');
            return;
        }

        try {
            const result = await api.post('/invoices', { ...invData, status: 'draft' });
            toast.success('INV saved as draft!');
            this.closeINVModal();

            this.logActivity('created', 'inv', result.inv_number, `${result.inv_number} (Draft)`, {
                poNumber: invData.poNumber,
                status: 'draft'
            });

            // Refresh INV list
            this.loadINVList();
        } catch (error) {
            toast.error(error.message || 'Failed to save INV as draft');
        }
    }

    /**
     * Create and send INV
     */
    async createAndSendINV() {
        const invData = this.collectINVFormData();

        if (!invData.items || invData.items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }

        if (!invData.buyerName) {
            toast.error('Please select a buyer');
            return;
        }

        const confirmed = await modal.confirm({
            title: 'Create & Send INV',
            message: 'Create this Proforma Invoice and send it to the buyer?',
            confirmText: 'Create & Send',
            type: 'primary'
        });

        if (confirmed) {
            try {
                const result = await api.post('/invoices', { ...invData, status: 'sent' });
                toast.success('INV created and sent to buyer!');
                this.closeINVModal();

                this.logActivity('sent', 'pi', result.inv_number, result.inv_number, {
                    poNumber: invData.poNumber,
                    buyer: invData.buyerName
                });

                // Refresh INV list
                this.loadINVList();
            } catch (error) {
                toast.error(error.message || 'Failed to create and send INV');
            }
        }
    }

    /**
     * Generate INV number
     */
    generateINVNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
        return `INV-${year}-${seq}`;
    }

    /**
     * Collect INV form data
     */
    collectINVFormData() {
        const poSelect = $('#inv-po-select');
        const selectedOption = poSelect?.options[poSelect.selectedIndex];
        const poText = selectedOption?.text || '';
        // Extract buyer name from option text (e.g., "PO-2024-0156 - ABC Distribution (Feb 01, 2024)")
        const buyerMatch = poText.match(/- (.+?) \(/);

        // Try buyer select first (enhanced modal), fall back to PO-based buyer
        const buyerSelect = $('#inv-buyer-select');
        const buyerOption = buyerSelect?.options[buyerSelect?.selectedIndex];
        const buyerName = buyerOption?.dataset?.name || (buyerMatch ? buyerMatch[1] : '');

        const items = [];
        $$('#inv-items-tbody tr:not(.wd-empty-row)').forEach(row => {
            const name = row.querySelector('.inv-item-name')?.value || row.querySelector('.wd-product-name')?.textContent || '';
            const sku = row.querySelector('.inv-item-sku')?.value || row.dataset.sku || '';
            const qty = parseInt(row.querySelector('.inv-item-qty')?.value || row.querySelector('.inv-qty')?.value) || 0;
            const unit = row.querySelector('.inv-item-unit')?.value || 'pcs';
            const price = parseFloat(row.querySelector('.inv-item-price')?.value || row.querySelector('.inv-price')?.value) || 0;

            if (name && qty > 0) {
                items.push({
                    productName: name,
                    productSku: sku,
                    quantity: qty,
                    unit: unit,
                    unitPrice: price
                });
            }
        });

        const appliedCredits = [];
        $$('.inv-credit-check:checked').forEach(checkbox => {
            appliedCredits.push({
                creditId: checkbox.value,
                amount: parseFloat(checkbox.dataset.amount) || 0
            });
        });

        return {
            poNumber: poSelect?.value || null,
            buyerName: buyerName,
            buyerEmail: buyerOption?.dataset?.email || null,
            buyerCountry: buyerOption?.dataset?.country || null,
            invDate: $('#inv-date')?.value || new Date().toISOString().split('T')[0],
            validUntil: $('#inv-valid-until')?.value || null,
            items: items,
            appliedCredits: appliedCredits,
            currency: $('#inv-currency')?.value || 'USD',
            incoterms: $('#inv-incoterms')?.value || null,
            paymentMethod: $('#inv-payment-method')?.value || null,
            remarks: $('#inv-remarks')?.value || null
        };
    }

    /**
     * Load INV data for editing
     */
    async loadINVData(invId) {
        try {
            const pi = await api.get(`/pi/${invId}`);
            // Populate form fields
            const dateInput = $('#inv-date');
            if (dateInput && inv.inv_date) dateInput.value = inv.inv_date;

            const validInput = $('#inv-valid-until');
            if (validInput && pi.valid_until) validInput.value = pi.valid_until;

            const currencyInput = $('#inv-currency');
            if (currencyInput && pi.currency) currencyInput.value = pi.currency;

            const incotermsInput = $('#inv-incoterms');
            if (incotermsInput && pi.incoterms) incotermsInput.value = pi.incoterms;

            const paymentInput = $('#inv-payment-method');
            if (paymentInput && pi.payment_method) paymentInput.value = pi.payment_method;

            const remarksInput = $('#inv-remarks');
            if (remarksInput && pi.remarks) remarksInput.value = pi.remarks;

            // Load items
            if (inv.invoice_items && inv.invoice_items.length > 0) {
                const tbody = $('#inv-items-tbody');
                if (tbody) {
                    tbody.innerHTML = '';
                    this.piItemCounter = 0;
                    inv.invoice_items.forEach(item => {
                        this.addItemRowToINV(item.product_sku, item.product_name, item.quantity, item.unit, parseFloat(item.unit_price));
                    });
                }
            }

            this.updateINVSummary();

            // Store editing INV id
            this._editingINVId = invId;
        } catch (error) {
            toast.error(error.message || 'Failed to load INV data');
        }
    }

    /**
     * View PO from INV
     */
    viewPOFromINV(poNumber) {
        window.showSection('po-management');
        setTimeout(() => {
            this.viewPODetail(poNumber);
        }, 300);
    }

    // ==================== PO Manual Registration ====================

    /**
     * Open Add PO page (or edit if poId provided)
     */
    openAddPOModal(poId = null) {
        // Navigate to dedicated PO edit page
        window.location.href = poId ? `po-edit.html?id=${poId}` : 'po-edit.html?id=new';
    }

    /**
     * Close Add PO modal
     */
    closeAddPOModal() {
        const modalEl = $('#add-po-modal');
        if (modalEl) {
            modalEl.style.display = 'none';
        }
    }

    /**
     * Reset PO items table to initial state
     */
    resetPOItemsTable() {
        const tbody = $('#add-po-items-tbody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr data-row="0">
                <td><input type="text" class="wd-input wd-input-sm po-item-name" required placeholder="Product name"></td>
                <td><input type="number" class="wd-input wd-input-sm po-item-qty" required min="1" value="1" onchange="calculatePOItemSubtotal(0)"></td>
                <td>
                    <select class="wd-select wd-select-sm po-item-unit">
                        <option value="pcs">pcs</option>
                        <option value="boxes">boxes</option>
                        <option value="cases">cases</option>
                        <option value="pallets">pallets</option>
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                        <option value="liters">liters</option>
                    </select>
                </td>
                <td><input type="number" class="wd-input wd-input-sm po-item-price" required min="0" step="0.01" value="0" onchange="calculatePOItemSubtotal(0)"></td>
                <td class="po-item-subtotal wd-text-right wd-text-bold">0.00</td>
                <td>
                    <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePOItemRow(0)" title="Remove">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </td>
            </tr>
        `;
        this.updatePOTotal();
    }

    /**
     * Handle PO file upload (drag & drop or click)
     */
    handlePOFileUpload(event) {
        event.preventDefault();
        event.stopPropagation();

        const uploadArea = $('#po-upload-area');
        uploadArea?.classList.remove('dragover');

        let files;
        if (event.dataTransfer) {
            files = event.dataTransfer.files;
        } else if (event.target.files) {
            files = event.target.files;
        }

        if (!files || files.length === 0) return;

        const file = files[0]; // Only handle first file

        // Validate file type
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error(`Invalid file type: ${file.name}`);
            return;
        }

        // Validate file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            toast.error(`File too large: ${file.name} (max 20MB)`);
            return;
        }

        // Store file reference
        this.poUploadedFiles = [file];

        // Update UI
        const uploadedFileEl = $('#po-uploaded-file');
        const filenameEl = $('#po-uploaded-filename');

        if (uploadedFileEl && filenameEl) {
            filenameEl.textContent = file.name;
            uploadedFileEl.style.display = 'flex';
        }

        // Reset file input
        const fileInput = $('#po-file-input');
        if (fileInput) fileInput.value = '';
    }

    /**
     * Setup drag and drop for PO upload area
     */
    setupPOUploadDragDrop() {
        const uploadArea = $('#po-upload-area');
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

        uploadArea.addEventListener('drop', (e) => this.handlePOFileUpload(e));
    }

    /**
     * Get file icon based on file type
     */
    getFileIcon(mimeType) {
        if (mimeType.includes('pdf')) {
            return '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 14.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>';
        } else if (mimeType.includes('image')) {
            return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
        } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
            return '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM9 13h2v2H9v-2zm0 4h2v2H9v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2z"/></svg>';
        } else if (mimeType.includes('word') || mimeType.includes('document')) {
            return '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 12h8v2H8v-2zm0 4h8v2H8v-2z"/></svg>';
        }
        return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Remove uploaded PO file
     */
    removePOFile() {
        const uploadedFileEl = $('#po-uploaded-file');
        if (uploadedFileEl) {
            uploadedFileEl.style.display = 'none';
        }
        this.poUploadedFiles = [];
    }

    /**
     * Add new item row to PO items table
     */
    addPOItemRow() {
        const tbody = $('#add-po-items-tbody');
        if (!tbody) return;

        const rowCount = tbody.querySelectorAll('tr').length;
        const newRow = document.createElement('tr');
        newRow.dataset.row = rowCount;
        newRow.innerHTML = `
            <td><input type="text" class="wd-input wd-input-sm po-item-name" required placeholder="Product name"></td>
            <td><input type="number" class="wd-input wd-input-sm po-item-qty" required min="1" value="1" onchange="calculatePOItemSubtotal(${rowCount})"></td>
            <td>
                <select class="wd-select wd-select-sm po-item-unit">
                    <option value="pcs">pcs</option>
                    <option value="boxes">boxes</option>
                    <option value="cases">cases</option>
                    <option value="pallets">pallets</option>
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                    <option value="liters">liters</option>
                </select>
            </td>
            <td><input type="number" class="wd-input wd-input-sm po-item-price" required min="0" step="0.01" value="0" onchange="calculatePOItemSubtotal(${rowCount})"></td>
            <td class="po-item-subtotal wd-text-right wd-text-bold">0.00</td>
            <td>
                <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePOItemRow(${rowCount})" title="Remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </td>
        `;
        tbody.appendChild(newRow);
    }

    /**
     * Remove item row from PO items table
     */
    removePOItemRow(rowIndex) {
        const tbody = $('#add-po-items-tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        if (rows.length <= 1) {
            toast.warning('At least one item is required');
            return;
        }

        const row = tbody.querySelector(`tr[data-row="${rowIndex}"]`);
        if (row) {
            row.remove();
            this.updatePOTotal();
            this.reindexPOItemRows();
        }
    }

    /**
     * Reindex PO item rows after deletion
     */
    reindexPOItemRows() {
        const tbody = $('#add-po-items-tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.dataset.row = index;

            // Update onchange handlers
            const qtyInput = row.querySelector('.po-item-qty');
            const priceInput = row.querySelector('.po-item-price');
            const removeBtn = row.querySelector('.wd-btn-icon-danger');

            if (qtyInput) qtyInput.setAttribute('onchange', `calculatePOItemSubtotal(${index})`);
            if (priceInput) priceInput.setAttribute('onchange', `calculatePOItemSubtotal(${index})`);
            if (removeBtn) removeBtn.setAttribute('onclick', `removePOItemRow(${index})`);
        });
    }

    /**
     * Calculate PO item subtotal
     */
    calculatePOItemSubtotal(rowIndex) {
        const tbody = $('#add-po-items-tbody');
        if (!tbody) return;

        const row = tbody.querySelector(`tr[data-row="${rowIndex}"]`);
        if (!row) return;

        const qty = parseFloat(row.querySelector('.po-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.po-item-price')?.value) || 0;
        const subtotalCell = row.querySelector('.po-item-subtotal');

        const subtotal = qty * price;
        if (subtotalCell) {
            subtotalCell.textContent = subtotal.toFixed(2);
        }

        this.updatePOTotal();
    }

    /**
     * Handle PO product selection from dropdown
     */
    onPOProductSelect(rowIndex) {
        const tbody = $('#add-po-items-tbody');
        if (!tbody) return;

        const row = tbody.querySelector(`tr[data-row="${rowIndex}"]`);
        if (!row) return;

        const select = row.querySelector('.po-item-product');
        if (!select) return;

        const selectedOption = select.options[select.selectedIndex];
        const price = parseFloat(selectedOption?.dataset.price) || 0;
        const unit = selectedOption?.dataset.unit || 'pcs';

        // Auto-fill price and unit from selected product
        const priceInput = row.querySelector('.po-item-price');
        const unitSelect = row.querySelector('.po-item-unit');

        if (priceInput) priceInput.value = price;
        if (unitSelect) unitSelect.value = unit;

        this.calculatePOItemSubtotal(rowIndex);
    }

    /**
     * Update PO total
     */
    updatePOTotal() {
        const tbody = $('#add-po-items-tbody');
        const totalEl = $('#add-po-total-amount');
        const currencyEl = $('#add-po-currency-symbol');
        if (!tbody) return;

        let total = 0;
        tbody.querySelectorAll('tr').forEach(row => {
            const qty = parseFloat(row.querySelector('.po-item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.po-item-price')?.value) || 0;
            total += qty * price;
        });

        const currency = $('#add-po-currency')?.value || 'USD';
        if (currencyEl) currencyEl.textContent = currency;
        if (totalEl) totalEl.textContent = total.toFixed(2);
    }

    /**
     * Save PO as draft
     */
    async savePOAsDraft() {
        try {
            const rawItems = this.collectPOItems();
            const items = rawItems.map(item => ({
                productName: item.name,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
            }));

            const poData = {
                poNumber: $('#add-po-number')?.value || undefined,
                orderDate: $('#add-po-date')?.value || undefined,
                buyerName: $('#add-po-buyer-company')?.value,
                buyerContact: $('#add-po-buyer-contact')?.value || undefined,
                buyerEmail: $('#add-po-buyer-email')?.value || undefined,
                buyerPhone: $('#add-po-buyer-phone')?.value || undefined,
                buyerAddress: $('#add-po-buyer-address')?.value || undefined,
                currency: $('#add-po-currency')?.value || 'USD',
                incoterms: $('#add-po-incoterms')?.value || undefined,
                paymentTerms: $('#add-po-payment-terms')?.value || undefined,
                items,
                notes: $('#add-po-notes')?.value || undefined,
                status: 'draft'
            };

            if (this.editingPOId) {
                await api.patch(`/po/${this.editingPOId}`, poData);
                toast.success('PO draft updated!');
            } else {
                await poService.createPO(poData);
                toast.success('PO saved as draft!');
            }

            this.closeAddPOModal();
            this.loadPOList();
        } catch (error) {
            toast.error(error.message || 'Failed to save PO draft');
        }
    }

    /**
     * Save PO (manual registration)
     */
    async savePO() {
        const form = $('#add-po-form');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }

        const buyerCompany = $('#add-po-buyer-company')?.value;
        if (!buyerCompany) {
            toast.error('Buyer company is required');
            return;
        }

        const rawItems = this.collectPOItems();
        if (rawItems.length === 0 || !rawItems.some(item => item.name)) {
            toast.error('At least one product item is required');
            return;
        }

        const items = rawItems.map(item => ({
            productName: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
        }));

        const poData = {
            poNumber: $('#add-po-number')?.value || undefined,
            orderDate: $('#add-po-date')?.value || undefined,
            buyerName: buyerCompany,
            buyerContact: $('#add-po-buyer-contact')?.value || undefined,
            buyerEmail: $('#add-po-buyer-email')?.value || undefined,
            buyerPhone: $('#add-po-buyer-phone')?.value || undefined,
            buyerAddress: $('#add-po-buyer-address')?.value || undefined,
            currency: $('#add-po-currency')?.value || 'USD',
            incoterms: $('#add-po-incoterms')?.value || undefined,
            paymentTerms: $('#add-po-payment-terms')?.value || undefined,
            items,
            notes: $('#add-po-notes')?.value || undefined,
            status: 'pending'
        };

        try {
            if (this.editingPOId) {
                await api.patch(`/po/${this.editingPOId}`, poData);
                toast.success('PO updated successfully!');
            } else {
                const result = await poService.createPO(poData);
                const poNum = result?.po_number || poData.poNumber || 'PO';
                toast.success(`PO ${poNum} registered successfully!`);
            }

            this.closeAddPOModal();
            this.loadPOList();
        } catch (error) {
            toast.error(error.message || 'Failed to save PO');
        }
    }

    /**
     * Generate auto PO number
     */
    generatePONumber() {
        const date = new Date();
        const year = date.getFullYear();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `PO-${year}-${random}`;
    }

    /**
     * Collect PO items from table
     */
    collectPOItems() {
        const items = [];
        const tbody = $('#add-po-items-tbody');
        if (!tbody) return items;

        tbody.querySelectorAll('tr').forEach(row => {
            const item = {
                name: row.querySelector('.po-item-name')?.value || '',
                quantity: parseInt(row.querySelector('.po-item-qty')?.value) || 0,
                unit: row.querySelector('.po-item-unit')?.value || 'pcs',
                unitPrice: parseFloat(row.querySelector('.po-item-price')?.value) || 0
            };

            if (item.name) {
                item.subtotal = item.quantity * item.unitPrice;
                items.push(item);
            }
        });

        return items;
    }

    /**
     * Load PO data into form for editing
     */
    async loadPOData(poId) {
        try {
            const data = await poService.getPODetail(poId);
            if (!data) return;

            const setVal = (sel, val) => { const el = $(sel); if (el && val) el.value = val; };

            setVal('#add-po-number', data.po_number);
            setVal('#add-po-date', data.order_date ? data.order_date.split('T')[0] : '');
            setVal('#add-po-buyer-company', data.buyer_name);
            setVal('#add-po-buyer-contact', data.buyer_contact);
            setVal('#add-po-buyer-email', data.buyer_email);
            setVal('#add-po-buyer-phone', data.buyer_phone);
            setVal('#add-po-buyer-address', data.buyer_address);
            setVal('#add-po-currency', data.currency);
            setVal('#add-po-incoterms', data.incoterms);
            setVal('#add-po-payment-terms', data.payment_terms);
            setVal('#add-po-notes', data.notes);

            // Populate items
            const items = data.order_items || [];
            if (items.length > 0) {
                const tbody = $('#add-po-items-tbody');
                if (!tbody) return;

                tbody.innerHTML = items.map((item, idx) => `
                    <tr data-row="${idx}">
                        <td><input type="text" class="wd-input wd-input-sm po-item-name" required placeholder="Product name" value="${item.product_name || ''}"></td>
                        <td><input type="number" class="wd-input wd-input-sm po-item-qty" required min="1" value="${item.quantity || 1}" onchange="calculatePOItemSubtotal(${idx})"></td>
                        <td>
                            <select class="wd-select wd-select-sm po-item-unit">
                                ${['pcs', 'boxes', 'cases', 'pallets', 'kg', 'lbs', 'liters'].map(u =>
                                    `<option value="${u}" ${(item.unit || 'pcs') === u ? 'selected' : ''}>${u}</option>`
                                ).join('')}
                            </select>
                        </td>
                        <td><input type="number" class="wd-input wd-input-sm po-item-price" required min="0" step="0.01" value="${item.unit_price || 0}" onchange="calculatePOItemSubtotal(${idx})"></td>
                        <td class="po-item-subtotal wd-text-right wd-text-bold">${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                        <td>
                            <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePOItemRow(${idx})" title="Remove">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </td>
                    </tr>
                `).join('');

                this.updatePOTotal();
            }
        } catch (error) {
            toast.error('Failed to load PO data');
        }
    }

    /**
     * Delete PO
     */
    async deletePO(poId) {
        if (!confirm('Are you sure you want to delete this purchase order?')) return;

        try {
            await poService.deletePO(poId);
            toast.success('PO deleted successfully');
            this.loadPOList();
        } catch (error) {
            toast.error(error.message || 'Failed to delete PO');
        }
    }

    /**
     * Edit PO - opens modal in edit mode
     */
    editPO(poId) {
        this.openAddPOModal(poId);
    }

    // ==================== Account Management ====================

    /**
     * Open account modal
     */
    openAccountModal(accountId = null) {
        const modalEl = $('#account-modal');
        const titleEl = $('#account-modal-title');
        const form = $('#account-form');

        if (!modalEl) return;

        // Reset form
        if (form) form.reset();

        if (accountId) {
            titleEl.textContent = 'Edit Account';
            this.loadAccountData(accountId);
        } else {
            titleEl.textContent = 'Add Account';
        }

        modalEl.style.display = 'flex';
    }

    /**
     * Close account modal
     */
    closeAccountModal() {
        const modalEl = $('#account-modal');
        if (modalEl) {
            modalEl.style.display = 'none';
        }
    }

    /**
     * Load account data for editing
     */
    loadAccountData(accountId) {
        // Demo data
        const accounts = {
            'ACC-001': {
                companyName: 'ABC Distribution',
                country: 'KR',
                address: '123 Gangnam-daero, Seoul',
                contactName: 'Kim Min-jun',
                contactPosition: 'Purchasing Manager',
                email: 'kim@abcdist.co.kr',
                phone: '+82 2 1234 5678',
                currency: 'USD',
                incoterms: 'CIF',
                paymentTerms: 'tt30'
            },
            'ACC-002': {
                companyName: 'XYZ Foods Ltd',
                country: 'JP',
                address: '456 Shibuya, Tokyo',
                contactName: 'Tanaka Yuki',
                contactPosition: 'Import Manager',
                email: 'tanaka@xyzfoods.jp',
                phone: '+81 3 9876 5432',
                currency: 'USD',
                incoterms: 'FOB',
                paymentTerms: 'lc'
            }
        };

        const data = accounts[accountId];
        if (!data) return;

        $('#account-company-name').value = data.companyName;
        $('#account-country').value = data.country;
        $('#account-address').value = data.address;
        $('#account-contact-name').value = data.contactName;
        $('#account-contact-position').value = data.contactPosition;
        $('#account-email').value = data.email;
        $('#account-phone').value = data.phone;
        $('#account-currency').value = data.currency;
        $('#account-incoterms').value = data.incoterms;
        $('#account-payment-terms').value = data.paymentTerms;
    }

    /**
     * Save account
     */
    async saveAccount() {
        const form = $('#account-form');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
            return;
        }

        const accountData = {
            companyName: $('#account-company-name')?.value,
            country: $('#account-country')?.value,
            address: $('#account-address')?.value,
            contactName: $('#account-contact-name')?.value,
            contactPosition: $('#account-contact-position')?.value,
            email: $('#account-email')?.value,
            phone: $('#account-phone')?.value,
            currency: $('#account-currency')?.value,
            incoterms: $('#account-incoterms')?.value,
            paymentTerms: $('#account-payment-terms')?.value,
            notes: $('#account-notes')?.value
        };

        const isEdit = !!this.editingAccountId;

        try {
            if (isEdit) {
                await api.patch(`/accounts/${this.editingAccountId}`, accountData);
            } else {
                await api.post('/accounts', accountData);
            }
            toast.success(isEdit ? 'Account updated!' : 'Account created!');
            this.closeAccountModal();
            if (typeof loadAccountListFromAPI === 'function') loadAccountListFromAPI();
            this.logActivity(isEdit ? 'updated' : 'created', 'account', this.editingAccountId, accountData.companyName);
        } catch (error) {
            toast.error(error.message || 'Failed to save account');
        }
    }

    /**
     * Generate account ID
     */
    generateAccountId() {
        const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
        return `ACC-${seq}`;
    }

    /**
     * View account detail
     */
    viewAccount(accountId) {
        toast.info(`Viewing account ${accountId}`);
        // TODO: Show account detail view
    }

    /**
     * Edit account
     */
    editAccount(accountId) {
        this.openAccountModal(accountId);
    }

    /**
     * Filter accounts
     */
    filterAccounts() {
        const statusFilter = $('#account-status-filter')?.value || 'all';
        const searchTerm = $('#account-search')?.value.toLowerCase() || '';
        const rows = $$('#accounts-table-body tr');

        rows.forEach(row => {
            const status = row.dataset.status || '';
            const companyName = row.querySelector('.wd-company-name')?.textContent.toLowerCase() || '';
            const contactName = row.querySelector('.wd-contact-name')?.textContent.toLowerCase() || '';
            const contactEmail = row.querySelector('.wd-contact-email')?.textContent.toLowerCase() || '';

            const matchesStatus = statusFilter === 'all' || status === statusFilter;
            const matchesSearch = !searchTerm ||
                companyName.includes(searchTerm) ||
                contactName.includes(searchTerm) ||
                contactEmail.includes(searchTerm);

            row.style.display = (matchesStatus && matchesSearch) ? '' : 'none';
        });
    }

    /**
     * Toggle Account INV filter dropdown
     */
    toggleAccountINVFilter(event) {
        event.stopPropagation();
        const dropdown = $('#account-inv-filter-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
        const closeDropdown = (e) => {
            if (!e.target.closest('.wd-column-filter')) {
                dropdown?.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        };
        setTimeout(() => document.addEventListener('click', closeDropdown), 0);
    }

    /**
     * Apply Account INV status filter
     */
    applyAccountINVFilter(status) {
        const filterInput = $('#account-inv-status-filter');
        if (filterInput) filterInput.value = status;

        const rows = $$('#accounts-table-body tr');
        rows.forEach(row => {
            const piStatus = row.dataset.piStatus || '';
            const matchesFilter = status === 'all' || piStatus === status;
            row.style.display = matchesFilter ? '' : 'none';
        });

        const dropdown = $('#account-inv-filter-dropdown');
        dropdown?.classList.remove('show');
    }

    /**
     * Filter accounts by month
     */
    filterAccountsByMonth() {
        const month = $('#account-month-filter')?.value || 'all';
        toast.info(`Filtering by ${month === 'all' ? 'all time' : month}`);
        // TODO: Filter accounts by selected month and reload data
    }

    /**
     * Sort Account table
     */
    sortAccountTable(column) {
        toast.info(`Sorting accounts by ${column}`);
        // TODO: Implement Account table sorting
    }

    /**
     * View account detail (drawer)
     */
    viewAccountDetail(accountId) {
        const drawer = $('#account-detail-drawer');
        const overlay = $('#account-drawer-overlay');
        if (drawer) {
            drawer.classList.add('active');
            if (overlay) overlay.classList.add('active');
            window.currentAccountId = accountId;
            // TODO: Load account detail data based on accountId
        }
    }

    /**
     * View account products breakdown
     */
    viewAccountProducts(accountId) {
        toast.info(`Viewing product breakdown for ${accountId}`);
        this.viewAccountDetail(accountId);
    }

    /**
     * Close account detail drawer
     */
    closeAccountDrawer() {
        const drawer = $('#account-detail-drawer');
        const overlay = $('#account-drawer-overlay');
        if (drawer) {
            drawer.classList.remove('active');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * Show product tooltip on month hover
     */
    showProductTooltip(event, month) {
        const tooltip = $('#product-tooltip');
        if (!tooltip) return;

        // Demo data - in production, this would come from API
        const monthlyData = {
            '2026-01': {
                label: 'January 2026',
                total: '$9,700',
                products: [
                    { name: 'Extra Virgin Olive Oil 500ml', qty: '140 pcs', amount: '$3,500' },
                    { name: 'Aged Parmesan 24 months', qty: '50 pcs', amount: '$3,250' },
                    { name: 'Organic Honey 350g', qty: '100 pcs', amount: '$1,800' },
                    { name: 'Balsamic Vinegar 250ml', qty: '36 pcs', amount: '$1,150' }
                ]
            },
            '2026-02': {
                label: 'February 2026',
                total: '$5,420',
                products: [
                    { name: 'Extra Virgin Olive Oil 500ml', qty: '80 pcs', amount: '$2,000' },
                    { name: 'Aged Parmesan 24 months', qty: '30 pcs', amount: '$1,950' },
                    { name: 'Organic Honey 350g', qty: '50 pcs', amount: '$900' },
                    { name: 'Balsamic Vinegar 250ml', qty: '18 pcs', amount: '$570' }
                ]
            }
        };

        const data = monthlyData[month];
        if (!data) return;

        // Update tooltip content
        tooltip.querySelector('.wd-tooltip-month').textContent = data.label;
        tooltip.querySelector('.wd-tooltip-total').textContent = data.total;

        const productsContainer = $('#tooltip-products');
        productsContainer.innerHTML = data.products.map(p => `
            <div class="wd-tooltip-product">
                <div class="wd-tooltip-product-info">
                    <span class="wd-tooltip-product-name">${p.name}</span>
                    <span class="wd-tooltip-product-qty">${p.qty}</span>
                </div>
                <span class="wd-tooltip-product-amount">${p.amount}</span>
            </div>
        `).join('');

        // Position tooltip
        const rect = event.target.closest('.wd-sales-cell').getBoundingClientRect();
        tooltip.style.display = 'block';
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 8}px`;

        // Adjust if going off screen
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth - 20) {
            tooltip.style.left = `${window.innerWidth - tooltipRect.width - 20}px`;
        }
        if (tooltipRect.bottom > window.innerHeight - 20) {
            tooltip.style.top = `${rect.top - tooltipRect.height - 8}px`;
        }
    }

    /**
     * Hide product tooltip
     */
    hideProductTooltip() {
        const tooltip = $('#product-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    /**
     * Toggle INV products detail view
     */
    toggleINVProducts(element) {
        const detail = element.querySelector('.wd-inv-products-detail');
        if (!detail) return;

        const isExpanded = element.classList.contains('expanded');

        if (isExpanded) {
            element.classList.remove('expanded');
            detail.style.display = 'none';
        } else {
            element.classList.add('expanded');
            detail.style.display = 'block';
        }
    }

    /**
     * Change account sales year
     */
    changeAccountSalesYear() {
        const year = $('#account-sales-year')?.value || '2024';
        toast.info(`Loading sales data for ${year}...`);
        // TODO: Load sales data for selected year from API
    }

    /**
     * Export accounts
     */
    exportAccounts() {
        toast.info('Exporting accounts to CSV...');

        const csvContent = 'Account ID,Company,Country,Contact,Email,Total Orders,Status\n' +
            'ACC-001,ABC Distribution,South Korea,Kim Min-jun,kim@abcdist.co.kr,$45600,Active\n' +
            'ACC-002,XYZ Foods Ltd,Japan,Tanaka Yuki,tanaka@xyzfoods.jp,$78200,Active\n' +
            'ACC-003,Global Trade Co,United States,John Smith,j.smith@globaltrade.com,$122000,Active';

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'accounts_export.csv';
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Accounts exported successfully!');
    }

    /**
     * Create INV for specific account
     */
    createINVForAccount(accountId) {
        this.openINVModal();

        // Wait for modal to open then select buyer
        setTimeout(() => {
            const buyerSelect = $('#inv-buyer-select');
            if (buyerSelect) {
                buyerSelect.value = accountId;
                this.loadBuyerForINV();
            }
            // Switch to manual mode
            const newRadio = document.querySelector('input[name="inv-source"][value="new"]');
            if (newRadio) {
                newRadio.checked = true;
                this.toggleINVSource('new');
            }
        }, 100);
    }

    // ==================== Enhanced INV Modal ====================

    /**
     * Toggle INV source between PO and New
     */
    toggleINVSource(source) {
        const poSelection = $('#inv-po-selection');

        if (source === 'po') {
            if (poSelection) poSelection.style.display = 'block';
        } else {
            if (poSelection) poSelection.style.display = 'none';
            // Clear PO selection
            const poSelect = $('#inv-po-select');
            if (poSelect) poSelect.value = '';
        }
    }

    /**
     * Open INV page for new/edit INV
     */
    openINVModal(invId = null) {
        // Navigate to dedicated INV edit page
        window.location.href = invId ? `inv-edit.html?id=${invId}` : 'inv-edit.html?id=new';
    }

    /**
     * Clear INV items table
     */
    clearINVItemsTable() {
        const tbody = $('#inv-items-tbody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr class="wd-empty-row">
                <td colspan="6" class="wd-text-center wd-text-muted" style="padding: 24px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                    <div>No items added yet. Select a PO or add products above.</div>
                </td>
            </tr>
        `;
        this.piItemCounter = 0;
    }

    /**
     * Load buyer info for INV
     */
    loadBuyerForINV() {
        const buyerSelect = $('#inv-buyer-select');
        if (!buyerSelect) return;

        const selectedOption = buyerSelect.options[buyerSelect.selectedIndex];
        const buyerId = buyerSelect.value;

        if (!buyerId) {
            $('#inv-buyer-info-card')?.style && ($('#inv-buyer-info-card').style.display = 'none');
            $('#inv-credit-section')?.style && ($('#inv-credit-section').style.display = 'none');
            return;
        }

        // Show buyer info card
        const infoCard = $('#inv-buyer-info-card');
        if (infoCard) {
            infoCard.style.display = 'block';
            $('#inv-buyer-company-display').textContent = selectedOption.dataset.name || '-';
            $('#inv-buyer-country-display').textContent = selectedOption.dataset.country || '-';
            $('#inv-buyer-credit-display').textContent = `$${selectedOption.dataset.credit || '0.00'}`;
        }

        // Load credits for this buyer
        this.loadCreditsForBuyer(buyerId);
    }

    /**
     * Load credits for buyer
     */
    async loadCreditsForBuyer(buyerNameOrId) {
        const creditSection = $('#inv-credit-section');
        const creditsContainer = $('#inv-available-credits');
        const creditBadge = $('#available-credit-badge');

        if (!creditSection || !creditsContainer) return;

        // Get buyer name from the buyer select option
        const buyerSelect = $('#inv-buyer-select');
        const buyerOption = buyerSelect?.options[buyerSelect?.selectedIndex];
        const buyerName = buyerOption?.dataset?.name || buyerNameOrId || '';

        if (!buyerName) {
            creditSection.style.display = 'none';
            return;
        }

        try {
            const buyerCredits = await api.get(`/credits/buyer/${encodeURIComponent(buyerName)}`);
            const totalCredit = buyerCredits.reduce((sum, c) => sum + parseFloat(c.amount), 0);

            if (creditBadge) {
                creditBadge.textContent = `$${totalCredit.toFixed(2)} available`;
            }

            if (buyerCredits.length > 0) {
                creditSection.style.display = 'block';
                creditsContainer.innerHTML = buyerCredits.map(credit => `
                    <div class="wd-credit-item">
                        <label class="wd-checkbox-label">
                            <input type="checkbox" class="pi-credit-check" value="${credit.id}"
                                   data-amount="${credit.amount}" onchange="updateINVSummary()">
                            <div class="credit-info">
                                <span class="credit-id">${credit.credit_number}</span>
                                <span class="credit-ref">from ${credit.invoice_number || 'N/A'}</span>
                                <span class="credit-reason">${credit.reason}</span>
                            </div>
                            <span class="credit-amount wd-text-success">-$${parseFloat(credit.amount).toFixed(2)}</span>
                        </label>
                    </div>
                `).join('');
            } else {
                creditSection.style.display = 'none';
                creditsContainer.innerHTML = '<p class="wd-text-muted">No available credits for this buyer</p>';
            }
        } catch (error) {
            console.error('Failed to load credits for buyer:', error);
            // Fallback: hide credit section
            creditSection.style.display = 'none';
            creditsContainer.innerHTML = '<p class="wd-text-muted">No available credits for this buyer</p>';
        }

        this.updateINVSummary();
    }

    /**
     * Load PO for INV
     */
    loadPOForINV() {
        const poSelect = $('#inv-po-select');
        const buyerSelect = $('#inv-buyer-select');

        if (!poSelect) return;

        const poNumber = poSelect.value;
        const selectedOption = poSelect.options[poSelect.selectedIndex];
        const buyerId = selectedOption?.dataset.buyer;

        if (!poNumber) {
            this.clearINVItemsTable();
            return;
        }

        // Auto-select buyer from PO
        if (buyerId && buyerSelect) {
            buyerSelect.value = buyerId;
            this.loadBuyerForINV();
        }

        // Demo PO data
        const poData = {
            'PO-2024-0156': [
                { sku: 'OIL-001', name: 'Extra Virgin Olive Oil 500ml', qty: 100, unit: 'bottles', price: 25.00 },
                { sku: 'OIL-002', name: 'Balsamic Vinegar 250ml', qty: 50, unit: 'bottles', price: 18.00 }
            ],
            'PO-2024-0142': [
                { sku: 'CHE-003', name: 'Aged Parmesan 24 months', qty: 30, unit: 'pcs', price: 160.00 },
                { sku: 'CHE-001', name: 'Mozzarella Fresh 200g', qty: 80, unit: 'pcs', price: 12.00 }
            ],
            'PO-2024-0138': [
                { sku: 'HON-002', name: 'Organic Honey 350g', qty: 200, unit: 'jars', price: 18.00 },
                { sku: 'HON-001', name: 'Raw Honey 500g', qty: 150, unit: 'jars', price: 22.00 }
            ]
        };

        const items = poData[poNumber];
        if (!items) return;

        // Clear and add items
        const tbody = $('#inv-items-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        this.piItemCounter = 0;

        items.forEach((item, idx) => {
            this.addItemRowToINV(item.sku, item.name, item.qty, item.unit, item.price);
        });

        this.updateINVSummary();
    }

    /**
     * Add product to INV from dropdown
     */
    addProductToINV() {
        const productSelect = $('#inv-product-select');
        if (!productSelect || !productSelect.value) {
            toast.warning('Please select a product first');
            return;
        }

        const selectedOption = productSelect.options[productSelect.selectedIndex];
        const sku = productSelect.value;
        const name = selectedOption.dataset.name;
        const price = parseFloat(selectedOption.dataset.price) || 0;
        const unit = selectedOption.dataset.unit || 'pcs';

        this.addItemRowToINV(sku, name, 1, unit, price);

        // Reset dropdown
        productSelect.value = '';
        this.updateINVSummary();
    }

    /**
     * Add manual item to INV
     */
    addManualItemToINV() {
        this.addItemRowToINV('', '', 1, 'pcs', 0, true);
        this.updateINVSummary();
    }

    /**
     * Add item row to INV table
     */
    addItemRowToINV(sku, name, qty, unit, price, isEditable = false) {
        const tbody = $('#inv-items-tbody');
        if (!tbody) return;

        // Remove empty row if exists
        const emptyRow = tbody.querySelector('.wd-empty-row');
        if (emptyRow) emptyRow.remove();

        if (!this.piItemCounter) this.piItemCounter = 0;
        const rowIndex = this.piItemCounter++;

        const subtotal = qty * price;
        const row = document.createElement('tr');
        row.dataset.row = rowIndex;
        row.dataset.sku = sku;

        if (isEditable) {
            row.innerHTML = `
                <td>
                    <input type="text" class="wd-input wd-input-sm pi-item-name" value="${name}" placeholder="Product name" required>
                    <input type="hidden" class="pi-item-sku" value="${sku}">
                </td>
                <td><input type="number" class="wd-input wd-input-sm pi-item-qty" value="${qty}" min="1" onchange="updateINVItemRow(${rowIndex})"></td>
                <td>
                    <select class="wd-select wd-select-sm pi-item-unit" onchange="updateINVItemRow(${rowIndex})">
                        <option value="pcs" ${unit === 'pcs' ? 'selected' : ''}>pcs</option>
                        <option value="bottles" ${unit === 'bottles' ? 'selected' : ''}>bottles</option>
                        <option value="jars" ${unit === 'jars' ? 'selected' : ''}>jars</option>
                        <option value="boxes" ${unit === 'boxes' ? 'selected' : ''}>boxes</option>
                        <option value="cases" ${unit === 'cases' ? 'selected' : ''}>cases</option>
                        <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
                    </select>
                </td>
                <td><input type="number" class="wd-input wd-input-sm pi-item-price" value="${price}" min="0" step="0.01" onchange="updateINVItemRow(${rowIndex})"></td>
                <td class="pi-item-subtotal wd-text-right wd-text-bold">$${subtotal.toFixed(2)}</td>
                <td>
                    <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removeINVItemRow(${rowIndex})" title="Remove">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>
                    <div class="wd-product-cell">
                        <span class="wd-product-name">${name}</span>
                        <span class="wd-product-sku">SKU: ${sku}</span>
                    </div>
                    <input type="hidden" class="pi-item-name" value="${name}">
                    <input type="hidden" class="pi-item-sku" value="${sku}">
                </td>
                <td><input type="number" class="wd-input wd-input-sm pi-item-qty" value="${qty}" min="1" onchange="updateINVItemRow(${rowIndex})"></td>
                <td>
                    <select class="wd-select wd-select-sm pi-item-unit">
                        <option value="pcs" ${unit === 'pcs' ? 'selected' : ''}>pcs</option>
                        <option value="bottles" ${unit === 'bottles' ? 'selected' : ''}>bottles</option>
                        <option value="jars" ${unit === 'jars' ? 'selected' : ''}>jars</option>
                        <option value="boxes" ${unit === 'boxes' ? 'selected' : ''}>boxes</option>
                        <option value="cases" ${unit === 'cases' ? 'selected' : ''}>cases</option>
                        <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
                    </select>
                </td>
                <td><input type="number" class="wd-input wd-input-sm pi-item-price" value="${price}" min="0" step="0.01" onchange="updateINVItemRow(${rowIndex})"></td>
                <td class="pi-item-subtotal wd-text-right wd-text-bold">$${subtotal.toFixed(2)}</td>
                <td>
                    <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removeINVItemRow(${rowIndex})" title="Remove">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </td>
            `;
        }

        tbody.appendChild(row);
    }

    /**
     * Update INV item row
     */
    updateINVItemRow(rowIndex) {
        const tbody = $('#inv-items-tbody');
        if (!tbody) return;

        const row = tbody.querySelector(`tr[data-row="${rowIndex}"]`);
        if (!row) return;

        const qty = parseFloat(row.querySelector('.inv-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.inv-item-price')?.value) || 0;
        const subtotalCell = row.querySelector('.pi-item-subtotal');

        if (subtotalCell) {
            subtotalCell.textContent = `$${(qty * price).toFixed(2)}`;
        }

        this.updateINVSummary();
    }

    /**
     * Remove INV item row
     */
    removeINVItemRow(rowIndex) {
        const tbody = $('#inv-items-tbody');
        if (!tbody) return;

        const row = tbody.querySelector(`tr[data-row="${rowIndex}"]`);
        if (row) {
            row.remove();
        }

        // If no items left, show empty message
        if (tbody.querySelectorAll('tr:not(.wd-empty-row)').length === 0) {
            this.clearINVItemsTable();
        }

        this.updateINVSummary();
    }

    /**
     * Update INV currency display
     */
    updateINVCurrency() {
        this.updateINVSummary();
    }

    /**
     * Preview product before adding
     */
    previewProductToAdd() {
        // Could show a preview - for now just log
        const productSelect = $('#inv-product-select');
        if (productSelect?.value) {
            const opt = productSelect.options[productSelect.selectedIndex];
            console.log('Selected product:', opt.dataset);
        }
    }

    /**
     * Export INV list to CSV
     */
    exportINVList() {
        toast.info('Exporting INV list to CSV...');

        const csvContent = 'INV Number,PO Reference,Buyer,Issue Date,Subtotal,Credit,Total,Status\n' +
            'INV-2024-0089,PO-2024-0156,Gourmet Foods Inc.,2024-02-01,$3400.00,$125.00,$3275.00,Sent\n' +
            'INV-2024-0088,PO-2024-0142,European Delights,2024-01-30,$5760.00,$320.00,$5440.00,Draft\n' +
            'INV-2024-0087,PO-2024-0138,Health Foods Co.,2024-01-28,$6900.00,$0.00,$6900.00,Paid';

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'invoices_export.csv';
        a.click();
        URL.revokeObjectURL(url);

        toast.success('INV list exported successfully!');
    }

    // ==================== Buyer Discovery ====================

    /**
     * Switch between buyer tabs (inquired/potential)
     */
    switchBuyerTab(tab) {
        // Update tab buttons
        const tabs = $$('.wd-tab-btn[data-buyer-tab]');
        tabs.forEach(t => {
            if (t.dataset.buyerTab === tab) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // Update tab content
        const inquiredContent = $('#inquired-buyers-content');
        const potentialContent = $('#potential-buyers-content');

        if (tab === 'inquired') {
            if (inquiredContent) inquiredContent.style.display = 'block';
            if (potentialContent) potentialContent.style.display = 'none';
        } else {
            if (inquiredContent) inquiredContent.style.display = 'none';
            if (potentialContent) potentialContent.style.display = 'block';
        }
    }

    /**
     * Show subscription modal for premium features
     */
    showSubscriptionModal() {
        // Create modal if it doesn't exist
        let modalEl = $('#subscription-modal');
        if (!modalEl) {
            const modalHtml = `
                <div id="subscription-modal" class="wd-modal-overlay">
                    <div class="wd-modal wd-modal-md">
                        <div class="wd-modal-header">
                            <h3>Unlock Premium Features</h3>
                            <button type="button" class="wd-modal-close" onclick="closeSubscriptionModal()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                        <div class="wd-modal-body" style="text-align: center; padding: 32px;">
                            <div style="margin-bottom: 24px;">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--wd-primary)" stroke-width="1.5" style="margin-bottom: 16px;">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                    <path d="M2 17l10 5 10-5"/>
                                    <path d="M2 12l10 5 10-5"/>
                                </svg>
                                <h2 style="margin-bottom: 8px;">Premium Buyer Discovery</h2>
                                <p class="wd-text-muted">Get access to potential buyers actively searching for your products</p>
                            </div>

                            <div style="background: var(--wd-gray-50); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: left;">
                                <h4 style="margin-bottom: 16px;">What's included:</h4>
                                <ul style="list-style: none; padding: 0; margin: 0;">
                                    <li style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wd-success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                        <span>View buyers searching for your product categories</span>
                                    </li>
                                    <li style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wd-success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                        <span>Access buyer contact information</span>
                                    </li>
                                    <li style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wd-success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                        <span>Real-time search keyword alerts</span>
                                    </li>
                                    <li style="display: flex; align-items: center; gap: 12px;">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wd-success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                                        <span>Priority listing in distributor search results</span>
                                    </li>
                                </ul>
                            </div>

                            <div style="display: flex; gap: 12px; justify-content: center;">
                                <button type="button" class="wd-btn wd-btn-outline" onclick="closeSubscriptionModal()">Maybe Later</button>
                                <button type="button" class="wd-btn wd-btn-primary" onclick="startSubscription()">
                                    Start Free Trial
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 4px;"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modalEl = $('#subscription-modal');
        }

        modalEl.style.display = 'flex';
    }

    /**
     * Close subscription modal
     */
    closeSubscriptionModal() {
        const modalEl = $('#subscription-modal');
        if (modalEl) {
            modalEl.style.display = 'none';
        }
    }

    /**
     * Start subscription process
     */
    startSubscription() {
        toast.info('Redirecting to subscription page...');
        this.closeSubscriptionModal();
        // TODO: Integrate with payment/subscription system
    }

    /**
     * View inquiry from buyer
     */
    viewInquiryFromBuyer(inquiryId) {
        toast.info(`Opening inquiry ${inquiryId}...`);
        // Navigate to inquiries section and open the specific inquiry
        window.showSection('inquiries');
        // TODO: Open specific inquiry detail
    }

    /**
     * Contact buyer from discovery
     */
    contactBuyer(buyerId) {
        toast.info(`Opening contact form for buyer ${buyerId}...`);
        // TODO: Open contact modal or redirect to messaging
    }

    /**
     * Filter inquired buyers
     */
    filterInquiredBuyers() {
        const searchTerm = $('#inquired-buyer-search')?.value.toLowerCase() || '';
        const cards = $$('#inquired-buyers-content .wd-discovery-card');

        cards.forEach(card => {
            const companyName = card.querySelector('.wd-company-name')?.textContent.toLowerCase() || '';
            const product = card.querySelector('.wd-inquiry-product')?.textContent.toLowerCase() || '';

            const matches = !searchTerm || companyName.includes(searchTerm) || product.includes(searchTerm);
            card.style.display = matches ? '' : 'none';
        });
    }

    // ==================== Team Management ====================

    /**
     * Open invite member modal
     */
    openInviteMemberModal() {
        // Check team member limit for free plan
        const currentMemberCount = this.getTeamMemberCount();
        const isPremium = this.isPremiumSubscriber();
        const FREE_MEMBER_LIMIT = 3;

        if (!isPremium && currentMemberCount >= FREE_MEMBER_LIMIT) {
            // Show upgrade modal instead
            this.showTeamLimitModal();
            return;
        }

        const modalEl = $('#invite-member-modal');
        const form = $('#invite-member-form');

        if (form) form.reset();
        if (modalEl) modalEl.style.display = 'flex';
    }

    /**
     * Get current team member count
     */
    getTeamMemberCount() {
        const tbody = $('#team-members-tbody');
        if (!tbody) return 0;
        return tbody.querySelectorAll('tr').length;
    }

    /**
     * Update team member count display
     */
    updateTeamMemberCountDisplay() {
        const countEl = $('#team-member-count');
        const limitNoteEl = $('#team-limit-note');
        const currentCount = this.getTeamMemberCount();
        const isPremium = this.isPremiumSubscriber();
        const FREE_LIMIT = 3;

        if (countEl) {
            if (isPremium) {
                countEl.textContent = `${currentCount} members`;
                countEl.className = 'wd-badge wd-badge-primary';
            } else {
                countEl.textContent = `${currentCount} / ${FREE_LIMIT} members`;
                if (currentCount >= FREE_LIMIT) {
                    countEl.className = 'wd-badge wd-badge-warning';
                } else {
                    countEl.className = 'wd-badge wd-badge-outline';
                }
            }
        }

        if (limitNoteEl) {
            limitNoteEl.style.display = isPremium ? 'none' : 'inline';
        }
    }

    /**
     * Check if user has premium subscription
     */
    isPremiumSubscriber() {
        // TODO: Check actual subscription status from backend/store
        // For now, check if there's a premium flag in localStorage
        return localStorage.getItem('wedealize_subscription') === 'premium';
    }

    /**
     * Show team limit modal
     */
    showTeamLimitModal() {
        let modalEl = $('#team-limit-modal');
        if (!modalEl) {
            const modalHtml = `
                <div id="team-limit-modal" class="wd-modal-overlay">
                    <div class="wd-modal wd-modal-sm">
                        <div class="wd-modal-header">
                            <h3>Team Member Limit</h3>
                            <button type="button" class="wd-modal-close" onclick="closeTeamLimitModal()">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                        <div class="wd-modal-body" style="text-align: center; padding: 32px;">
                            <div style="width: 64px; height: 64px; background: var(--wd-gray-100); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--wd-gray-500)" stroke-width="1.5">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                            <h4 style="margin: 0 0 8px;">You've reached the free limit</h4>
                            <p class="wd-text-muted" style="margin: 0 0 24px;">Free plan allows up to 3 team members.<br>Upgrade to Premium for unlimited team members.</p>
                            <div style="display: flex; gap: 12px; justify-content: center;">
                                <button type="button" class="wd-btn wd-btn-outline" onclick="closeTeamLimitModal()">Maybe Later</button>
                                <button type="button" class="wd-btn wd-btn-primary" onclick="closeTeamLimitModal(); showUpgradeModal();">
                                    Upgrade to Premium
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modalEl = $('#team-limit-modal');
        }
        modalEl.style.display = 'flex';
    }

    /**
     * Close team limit modal
     */
    closeTeamLimitModal() {
        const modalEl = $('#team-limit-modal');
        if (modalEl) modalEl.style.display = 'none';
    }

    /**
     * Close invite member modal
     */
    closeInviteMemberModal() {
        const modalEl = $('#invite-member-modal');
        if (modalEl) modalEl.style.display = 'none';
    }

    /**
     * Send team invite
     */
    async sendInvite(event) {
        if (event) event.preventDefault();

        const email = $('#invite-email')?.value;
        const role = $('#invite-role')?.value || 'member';
        const message = $('#invite-message')?.value;

        if (!email) {
            toast.error('Please enter an email address');
            return;
        }

        const submitBtn = $('#invite-member-form')?.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
        }

        try {
            const result = await api.post('/team/invite', { email, role, message });
            toast.success(`Invitation sent to ${email}`);
            this.closeInviteMemberModal();

            // Add pending member to table with real ID
            this.addPendingMember(email, role, result.member?.id);
        } catch (error) {
            toast.error(error.message || 'Failed to send invitation');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Invite';
            }
        }
    }

    /**
     * Add pending member to table
     */
    addPendingMember(email, role, memberId) {
        const tbody = $('#team-members-tbody');
        if (!tbody) return;

        const initials = email.substring(0, 2).toUpperCase();
        const roleLabels = {
            admin: { text: 'Admin', class: 'wd-badge-secondary' },
            member: { text: 'Member', class: 'wd-badge-outline' },
            viewer: { text: 'Viewer', class: 'wd-badge-outline' }
        };
        const roleInfo = roleLabels[role] || roleLabels.member;
        const rowId = memberId || initials;

        const newRow = document.createElement('tr');
        newRow.dataset.memberId = rowId;
        newRow.innerHTML = `
            <td>
                <div class="wd-member-cell">
                    <div class="wd-member-avatar wd-avatar-pending">${initials}</div>
                    <div class="wd-member-info">
                        <span class="wd-member-name">${email.split('@')[0]}</span>
                        <span class="wd-member-email">${email}</span>
                    </div>
                </div>
            </td>
            <td><span class="wd-badge ${roleInfo.class}">${roleInfo.text}</span></td>
            <td><span class="wd-badge wd-badge-warning">Pending</span></td>
            <td>Invite sent</td>
            <td>
                <div class="wd-action-btns">
                    <button class="wd-btn-text wd-btn-sm" onclick="resendInvite('${rowId}')">Resend</button>
                    <button class="wd-btn-icon wd-btn-icon-danger" onclick="cancelInvite('${rowId}')" title="Cancel">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(newRow);

        // Update member count display
        this.updateTeamMemberCountDisplay();
    }

    /**
     * Edit team member
     */
    editMember(memberId) {
        toast.info(`Editing member ${memberId}...`);
        // TODO: Open edit modal
    }

    /**
     * Remove team member
     */
    async removeMember(memberId) {
        if (confirm('Are you sure you want to remove this team member?')) {
            try {
                await api.delete(`/team/members/${memberId}`);

                // Find and remove the row
                const tbody = $('#team-members-tbody');
                const row = tbody?.querySelector(`tr[data-member-id="${memberId}"]`);
                if (row) {
                    row.remove();
                } else {
                    // Fallback: find by avatar text
                    const rows = tbody?.querySelectorAll('tr');
                    rows?.forEach(r => {
                        const avatar = r.querySelector('.wd-member-avatar');
                        if (avatar && avatar.textContent.trim() === memberId) {
                            r.remove();
                        }
                    });
                }

                toast.success('Team member removed');
                this.updateTeamMemberCountDisplay();
            } catch (error) {
                toast.error(error.message || 'Failed to remove team member');
            }
        }
    }

    /**
     * Resend invite
     */
    async resendInvite(memberId) {
        try {
            await api.post(`/team/resend-invite/${memberId}`);
            toast.success('Invitation resent successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to resend invitation');
        }
    }

    /**
     * Cancel invite
     */
    async cancelInvite(memberId) {
        if (confirm('Are you sure you want to cancel this invitation?')) {
            try {
                await api.delete(`/team/members/${memberId}`);

                // Find and remove the row
                const tbody = $('#team-members-tbody');
                const row = tbody?.querySelector(`tr[data-member-id="${memberId}"]`);
                if (row) {
                    row.remove();
                } else {
                    // Fallback: find by avatar text
                    const rows = tbody?.querySelectorAll('tr');
                    rows?.forEach(r => {
                        const avatar = r.querySelector('.wd-member-avatar');
                        if (avatar && avatar.textContent.trim() === memberId) {
                            r.remove();
                        }
                    });
                }

                toast.info('Invitation cancelled');
                this.updateTeamMemberCountDisplay();
            } catch (error) {
                toast.error(error.message || 'Failed to cancel invitation');
            }
        }
    }

    // ==================== Subscription & Payment (Lemon Squeezy) ====================

    /**
     * Show upgrade modal
     */
    showUpgradeModal() {
        this.showSubscriptionModal();
    }

    /**
     * Start checkout with Lemon Squeezy
     */
    async startCheckout(plan) {
        toast.info('Redirecting to checkout...');

        // Lemon Squeezy checkout URLs (replace with actual product URLs)
        const checkoutUrls = {
            premium: 'https://wedealize.lemonsqueezy.com/buy/premium-plan',
            // Add more plans as needed
        };

        const checkoutUrl = checkoutUrls[plan];
        if (checkoutUrl) {
            // Open Lemon Squeezy checkout in new window
            // In production, you might want to use Lemon Squeezy's JavaScript SDK for embedded checkout
            window.open(checkoutUrl, '_blank');
        } else {
            toast.error('Invalid plan selected');
        }
    }

    /**
     * Initialize Lemon Squeezy
     * Call this when the app loads to set up webhook handling
     */
    initLemonSqueezy() {
        // Listen for Lemon Squeezy events (if using embedded checkout)
        window.addEventListener('message', (event) => {
            if (event.data.type === 'Lemon_Squeezy:checkout_complete') {
                this.onPaymentComplete(event.data);
            }
        });
    }

    /**
     * Handle payment completion
     */
    onPaymentComplete(data) {
        toast.success('Payment successful! Your subscription is now active.');

        // Refresh subscription status
        this.refreshSubscriptionStatus();

        // Unlock premium features
        this.unlockPremiumFeatures();
    }

    /**
     * Refresh subscription status from backend
     */
    async refreshSubscriptionStatus() {
        // TODO: Fetch subscription status from backend
        // The backend should verify with Lemon Squeezy API
        console.log('Refreshing subscription status...');
    }

    /**
     * Unlock premium features in UI
     */
    unlockPremiumFeatures() {
        // Remove blur from potential buyers
        const blurredSections = $$('.wd-blurred');
        blurredSections.forEach(section => {
            section.classList.remove('wd-blurred');
        });

        // Remove premium overlays
        const overlays = $$('.wd-blurred-overlay');
        overlays.forEach(overlay => {
            overlay.style.display = 'none';
        });

        // Update plan badge
        const planBadge = $('.wd-subscription-status .wd-badge');
        if (planBadge) {
            planBadge.textContent = 'Premium';
            planBadge.className = 'wd-badge wd-badge-primary';
        }
    }

    /**
     * Manage subscription (redirect to Lemon Squeezy customer portal)
     */
    manageSubscription() {
        // Lemon Squeezy customer portal URL
        const portalUrl = 'https://wedealize.lemonsqueezy.com/billing';
        window.open(portalUrl, '_blank');
    }

    // ==================== Activity Log ====================

    /**
     * Log an activity
     */
    logActivity(action, type, targetId, targetName, details = {}) {
        const currentUser = this.getCurrentUser();
        const activity = {
            id: `ACT-${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.name,
            userInitials: currentUser.initials,
            action: action, // created, updated, deleted, confirmed, sent, etc.
            type: type, // product, po, pi, account, credit
            targetId: targetId,
            targetName: targetName,
            details: details,
            timestamp: new Date().toISOString()
        };

        // Store in localStorage (in production, send to backend)
        const activities = this.getActivities();
        activities.unshift(activity);

        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.pop();
        }

        localStorage.setItem('wedealize_activities', JSON.stringify(activities));

        // Update UI if activity log is visible
        this.prependActivityItem(activity);

        return activity;
    }

    /**
     * Get current user info
     */
    getCurrentUser() {
        // TODO: Get from actual auth state
        const userEmail = localStorage.getItem('wedealize_email') || 'jungwon.lee@seller-note.com';
        const userName = localStorage.getItem('wedealize_name') || 'Jungwon Lee';
        const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

        return {
            id: userEmail,
            name: userName,
            email: userEmail,
            initials: initials
        };
    }

    /**
     * Get all activities from storage
     */
    getActivities() {
        try {
            return JSON.parse(localStorage.getItem('wedealize_activities') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Prepend new activity item to the UI
     */
    prependActivityItem(activity) {
        const list = $('#activity-log-list');
        if (!list) return;

        const timeAgo = this.getTimeAgo(new Date(activity.timestamp));
        const actionText = this.getActivityActionText(activity);

        const item = document.createElement('div');
        item.className = 'wd-activity-item';
        item.dataset.member = activity.userInitials;
        item.dataset.type = activity.type;
        item.innerHTML = `
            <div class="wd-activity-avatar">${activity.userInitials}</div>
            <div class="wd-activity-content">
                <div class="wd-activity-text">
                    <strong>${activity.userName}</strong> ${actionText}
                </div>
                <div class="wd-activity-meta">
                    <span class="wd-activity-type">${activity.type}</span>
                    <span class="wd-activity-time">${timeAgo}</span>
                </div>
            </div>
        `;

        list.insertBefore(item, list.firstChild);
    }

    /**
     * Get activity action text
     */
    getActivityActionText(activity) {
        const actions = {
            created: 'created',
            updated: 'updated',
            deleted: 'deleted',
            confirmed: 'confirmed',
            sent: 'sent',
            registered: 'registered'
        };

        const typeLabels = {
            product: 'product',
            po: 'PO',
            inv: 'INV',
            account: 'account',
            credit: 'credit'
        };

        const action = actions[activity.action] || activity.action;
        const typeLabel = typeLabels[activity.type] || activity.type;

        if (activity.targetId && activity.targetName) {
            return `${action} ${typeLabel} <a href="#" onclick="viewActivityTarget('${activity.type}', '${activity.targetId}')">${activity.targetName}</a>`;
        } else if (activity.targetName) {
            return `${action} ${activity.targetName}`;
        }
        return `${action} ${typeLabel}`;
    }

    /**
     * Get time ago string
     */
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    }

    /**
     * Filter activity log
     */
    filterActivityLog() {
        const memberFilter = $('#activity-member-filter')?.value || 'all';
        const typeFilter = $('#activity-type-filter')?.value || 'all';
        const items = $$('#activity-log-list .wd-activity-item');

        items.forEach(item => {
            const member = item.dataset.member;
            const type = item.dataset.type;

            const matchesMember = memberFilter === 'all' || member === memberFilter;
            const matchesType = typeFilter === 'all' || type === typeFilter;

            item.style.display = (matchesMember && matchesType) ? '' : 'none';
        });
    }

    /**
     * Load more activities
     */
    loadMoreActivities() {
        toast.info('Loading more activities...');
        // TODO: Load from backend with pagination
    }

    /**
     * View activity target
     */
    viewActivityTarget(type, targetId) {
        switch (type) {
            case 'po':
                window.showSection('po-management');
                setTimeout(() => this.viewPODetail(targetId), 300);
                break;
            case 'pi':
                window.showSection('inv-management');
                setTimeout(() => this.viewINV(targetId), 300);
                break;
            case 'product':
                window.showSection('product-list');
                setTimeout(() => window.editProduct(targetId), 300);
                break;
            case 'account':
                window.showSection('accounts');
                setTimeout(() => this.viewAccount(targetId), 300);
                break;
            case 'credit':
                window.showSection('credit-management');
                setTimeout(() => this.viewCreditDetail(targetId), 300);
                break;
        }
    }

    /**
     * Get author info HTML for table cells
     */
    getAuthorCellHTML(userName, date, showDate = true) {
        const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const dateStr = date ? new Date(date).toLocaleDateString() : '';

        return `
            <div class="wd-author-cell">
                <div class="wd-author-avatar">${initials}</div>
                <div>
                    <span class="wd-author-name">${userName}</span>
                    ${showDate && dateStr ? `<span class="wd-author-date">${dateStr}</span>` : ''}
                </div>
            </div>
        `;
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
window.confirmPO = (poId) => salesModule.confirmPO(poId);
window.updateShipping = (poNumber) => salesModule.updateShipping(poNumber);
window.trackShipment = (poNumber) => salesModule.trackShipment(poNumber);
window.exportPOList = () => salesModule.exportPOList();

// Credit Management global functions
window.openCreditModal = (creditId) => salesModule.openCreditModal(creditId);
window.closeCreditModal = () => salesModule.closeCreditModal();
window.loadInvoiceProducts = () => salesModule.loadInvoiceProducts();
window.handleCreditFiles = (event) => salesModule.handleCreditFiles(event);
window.saveCredit = () => salesModule.saveCredit();
window.saveCreditAsDraft = () => salesModule.saveCreditAsDraft();
window.filterCredits = () => salesModule.filterCredits();
window.viewCreditDetail = (creditId) => salesModule.viewCreditDetail(creditId);
window.editCredit = (creditId) => salesModule.editCredit(creditId);
window.viewInvoiceFromCredit = (invoiceNumber) => salesModule.viewInvoiceFromCredit(invoiceNumber);
window.exportCredits = () => salesModule.exportCredits();
window.toggleCreditStatusFilter = (event) => salesModule.toggleCreditStatusFilter(event);
window.applyCreditStatusFilter = (status) => salesModule.applyCreditStatusFilter(status);
window.sortCreditTable = (column) => salesModule.sortCreditTable(column);
window.approveCredit = (creditId) => salesModule.approveCredit(creditId);
window.loadINVList = () => salesModule.loadINVList();
window.loadCreditList = () => salesModule.loadCreditList();

// INV (Invoice) Management global functions
window.openINVModal = (invId) => salesModule.openINVModal(invId);
window.closeINVModal = () => salesModule.closeINVModal();
window.loadPOForINV = () => salesModule.loadPOForINV();
window.updatePIItemTotal = (index) => salesModule.updateINVItemRow(index);
window.updateINVSummary = () => salesModule.updateINVSummary();
window.filterINVList = () => salesModule.filterINVList();
window.viewINV = (invNumber) => salesModule.viewINV(invNumber);
window.viewINVDetail = (invNumber) => salesModule.viewINVDetail(invNumber);
window.editINV = (invNumber) => salesModule.editINV(invNumber);
window.sendINV = (invNumber) => salesModule.sendINV(invNumber);
window.downloadINV = (invNumber) => salesModule.downloadINV(invNumber);
window.saveAsDraft = () => salesModule.saveAsDraft();
window.createAndSendINV = () => salesModule.createAndSendINV();
window.viewPOFromINV = (poNumber) => salesModule.viewPOFromINV(poNumber);
window.exportINVList = () => salesModule.exportINVList();
window.toggleINVStatusFilter = (event) => salesModule.toggleINVStatusFilter(event);
window.applyINVStatusFilter = (status) => salesModule.applyINVStatusFilter(status);
window.sortINVTable = (column) => salesModule.sortINVTable(column);

// Enhanced INV functions
window.toggleINVSource = (source) => salesModule.toggleINVSource(source);
window.loadBuyerForINV = () => salesModule.loadBuyerForINV();
window.addProductToINV = () => salesModule.addProductToINV();
window.addManualItemToINV = () => salesModule.addManualItemToINV();
window.updateINVItemRow = (index) => salesModule.updateINVItemRow(index);
window.removeINVItemRow = (index) => salesModule.removeINVItemRow(index);
window.updateINVCurrency = () => salesModule.updateINVCurrency();
window.previewProductToAdd = () => salesModule.previewProductToAdd();

// Account Management global functions
window.openAccountModal = (accountId) => salesModule.openAccountModal(accountId);
window.closeAccountModal = () => salesModule.closeAccountModal();
window.saveAccount = () => salesModule.saveAccount();
window.viewAccount = (accountId) => salesModule.viewAccount(accountId);
window.editAccount = (accountId) => salesModule.editAccount(accountId);
window.filterAccounts = () => salesModule.filterAccounts();
window.exportAccounts = () => salesModule.exportAccounts();
window.createINVForAccount = (accountId) => salesModule.createINVForAccount(accountId);
window.viewAccountDetail = (accountId) => salesModule.viewAccountDetail(accountId);
window.viewAccountProducts = (accountId) => salesModule.viewAccountProducts(accountId);
window.closeAccountDrawer = () => salesModule.closeAccountDrawer();
window.filterAccountsByMonth = () => salesModule.filterAccountsByMonth();
window.toggleAccountINVFilter = (event) => salesModule.toggleAccountINVFilter(event);
window.applyAccountINVFilter = (status) => salesModule.applyAccountINVFilter(status);
window.sortAccountTable = (column) => salesModule.sortAccountTable(column);

// PO Manual Registration global functions
window.openAddPOModal = (poId) => salesModule.openAddPOModal(poId);
window.closeAddPOModal = () => salesModule.closeAddPOModal();
window.editPO = (poId) => salesModule.editPO(poId);
window.deletePO = (poId) => salesModule.deletePO(poId);
window.handlePOFileUpload = (event) => salesModule.handlePOFileUpload(event);
window.removePOFile = () => salesModule.removePOFile();
window.addPOItemRow = () => salesModule.addPOItemRow();
window.removePOItemRow = (rowIndex) => salesModule.removePOItemRow(rowIndex);
window.calculatePOItemSubtotal = (rowIndex) => salesModule.calculatePOItemSubtotal(rowIndex);
window.updatePOTotal = () => salesModule.updatePOTotal();
window.updatePOCurrency = () => salesModule.updatePOTotal();
window.savePO = () => salesModule.savePO();
window.savePOAsDraft = () => salesModule.savePOAsDraft();
window.onPOProductSelect = (rowIndex) => salesModule.onPOProductSelect(rowIndex);

// Buyer Discovery global functions
window.switchBuyerTab = (tab) => salesModule.switchBuyerTab(tab);
window.showSubscriptionModal = () => salesModule.showSubscriptionModal();
window.closeSubscriptionModal = () => salesModule.closeSubscriptionModal();
window.startSubscription = () => salesModule.startSubscription();
window.viewInquiryFromBuyer = (inquiryId) => salesModule.viewInquiryFromBuyer(inquiryId);
window.contactBuyer = (buyerId) => salesModule.contactBuyer(buyerId);
window.filterInquiredBuyers = () => salesModule.filterInquiredBuyers();

// Team Management global functions
window.openInviteMemberModal = () => salesModule.openInviteMemberModal();
window.closeInviteMemberModal = () => salesModule.closeInviteMemberModal();
window.closeTeamLimitModal = () => salesModule.closeTeamLimitModal();
window.sendInvite = (event) => salesModule.sendInvite(event);
window.editMember = (memberId) => salesModule.editMember(memberId);
window.removeMember = (memberId) => salesModule.removeMember(memberId);
window.resendInvite = (memberId) => salesModule.resendInvite(memberId);
window.cancelInvite = (memberId) => salesModule.cancelInvite(memberId);
window.updateTeamMemberCountDisplay = () => salesModule.updateTeamMemberCountDisplay();

// Subscription & Payment global functions
window.showUpgradeModal = () => salesModule.showUpgradeModal();
window.startCheckout = (plan) => salesModule.startCheckout(plan);
window.manageSubscription = () => salesModule.manageSubscription();

// Activity Log global functions
window.logActivity = (action, type, targetId, targetName, details) => salesModule.logActivity(action, type, targetId, targetName, details);
window.filterActivityLog = () => salesModule.filterActivityLog();
window.loadMoreActivities = () => salesModule.loadMoreActivities();
window.viewActivityTarget = (type, targetId) => salesModule.viewActivityTarget(type, targetId);

// Settings Tab Navigation
window.switchSettingsTab = (tabName) => {
    // Update tab buttons
    const tabContainer = document.querySelector('#panel-settings .wd-tabs');
    if (tabContainer) {
        tabContainer.querySelectorAll('.wd-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('onclick')?.includes(tabName)) {
                tab.classList.add('active');
            }
        });
    }

    // Update panels
    const panels = document.querySelectorAll('[id^="settings-"][id$="-panel"]');
    panels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `settings-${tabName}-panel`) {
            panel.classList.add('active');
        }
    });
};

export default salesModule;

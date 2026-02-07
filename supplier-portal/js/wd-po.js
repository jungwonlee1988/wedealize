// WeDealize - Purchase Order Management
(function() {
    'use strict';

    // === Private State ===
    // (none currently needed — all state lives in the DOM or window._editingPOId / window._poUploadedFile)

    // === Private Functions ===

    function updatePOEmptyState(isEmpty) {
        var emptyRow = document.getElementById('po-empty-row');

        if (isEmpty) {
            if (!emptyRow) {
                var tbody = document.getElementById('po-list-tbody');
                emptyRow = document.createElement('tr');
                emptyRow.id = 'po-empty-row';
                emptyRow.innerHTML = '<td colspan="7" class="empty-state">No orders found matching your criteria.</td>';
                tbody.appendChild(emptyRow);
            }
            emptyRow.style.display = '';
        } else if (emptyRow) {
            emptyRow.style.display = 'none';
        }
    }

    // === Public API (bridged to window for HTML onclick handlers) ===

    window.applyPOFilters = function() {
        var statusFilter = document.getElementById('po-status-filter').value;
        var searchTerm = document.getElementById('po-search').value.toLowerCase().trim();
        var rows = document.querySelectorAll('#po-list-tbody tr');
        var visibleCount = 0;

        rows.forEach(function(row) {
            var status = row.dataset.status || '';
            var poNumber = (row.dataset.po || '').toLowerCase();
            var buyerName = (row.dataset.buyer || '').toLowerCase();

            var matchesStatus = statusFilter === 'all' || status === statusFilter;
            var matchesSearch = !searchTerm ||
                poNumber.includes(searchTerm) ||
                buyerName.includes(searchTerm);

            if (matchesStatus && matchesSearch) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        updatePOEmptyState(visibleCount === 0);
    };

    window.updatePOEmptyState = function(isEmpty) {
        updatePOEmptyState(isEmpty);
    };

    window.filterPOList = function() {
        window.applyPOFilters();
    };

    window.searchPO = function() {
        window.applyPOFilters();
    };

    window.viewPODetail = function(poNumber) {
        window.location.href = 'po-edit.html?id=' + encodeURIComponent(poNumber);
    };

    window.backToPOList = function() {
        document.getElementById('panel-po-detail').style.display = 'none';
        document.getElementById('panel-po-management').style.display = 'block';
    };

    window.downloadPO = function() {
        showToast('PDF download coming soon', 'info');
    };

    window.cancelPO = function() {
        if (confirm('Are you sure you want to cancel this order?')) {
            showToast('Order cancellation coming soon', 'info');
        }
    };

    window.confirmPO = function(poNumber) {
        if (confirm('Confirm order ' + poNumber + '?')) {
            showToast('Order confirmation coming soon', 'info');
        }
    };

    window.updateShipping = function(poNumber) {
        showToast('Shipping update coming soon', 'info');
    };

    window.trackShipment = function(poNumber) {
        showToast('Shipment tracking coming soon', 'info');
    };

    window.exportPOList = async function() {
        showToast('Exporting PO list to CSV...', 'info');

        try {
            var poData = window.getAllPOData();

            if (!poData || poData.length === 0) {
                showToast('No PO data to export', 'warning');
                return;
            }

            var headers = ['PO Number', 'Buyer', 'Country', 'Order Date', 'Items', 'Total Amount', 'Status'];

            var csvRows = [];
            csvRows.push(headers.join(','));

            poData.forEach(function(po) {
                var row = [
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

            var csvContent = csvRows.join('\n');
            var BOM = '\uFEFF';
            var blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

            var link = document.createElement('a');
            var url = URL.createObjectURL(blob);
            var timestamp = new Date().toISOString().slice(0, 10);

            link.setAttribute('href', url);
            link.setAttribute('download', 'po_export_' + timestamp + '.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast('Successfully exported ' + poData.length + ' PO records', 'success');

        } catch (error) {
            console.error('PO Export error:', error);
            showToast('Failed to export PO list', 'error');
        }
    };

    window.getAllPOData = function() {
        var poData = [];
        var rows = document.querySelectorAll('#po-list-tbody tr');

        rows.forEach(function(row) {
            var poNumber = row.querySelector('.po-number')?.textContent || '';
            var buyerName = row.querySelector('.buyer-name')?.textContent || '';
            var buyerCountry = row.querySelector('.buyer-country')?.textContent || '';
            var cells = row.querySelectorAll('td');
            var orderDate = cells[2]?.textContent || '';
            var items = cells[3]?.textContent || '';
            var totalAmount = row.querySelector('.amount')?.textContent || '';
            var statusBadge = row.querySelector('.status-badge');
            var status = statusBadge?.textContent || '';

            poData.push({
                poNumber: poNumber,
                buyerName: buyerName,
                country: buyerCountry.replace(/[^\w\s]/g, '').trim(),
                orderDate: orderDate,
                items: items,
                totalAmount: totalAmount,
                status: status
            });
        });

        return poData;
    };

    window.toggleStatusFilter = function(event) {
        event.stopPropagation();
        var dropdown = document.getElementById('status-filter-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }

        var closeDropdown = function(e) {
            if (!e.target.closest('.column-filter')) {
                if (dropdown) dropdown.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        };
        setTimeout(function() { document.addEventListener('click', closeDropdown); }, 0);
    };

    window.applyStatusFilter = function(status) {
        var filterInput = document.getElementById('po-status-filter');
        if (filterInput) {
            filterInput.value = status;
        }

        window.applyPOFilters();

        var filterBtn = document.querySelector('.wd-filter-btn');
        if (filterBtn) {
            if (status !== 'all') {
                filterBtn.classList.add('active');
            } else {
                filterBtn.classList.remove('active');
            }
        }

        var dropdown = document.getElementById('status-filter-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    };

    window.filterPOByTab = function(tabType) {
        var tabs = document.querySelectorAll('.wd-tab');
        tabs.forEach(function(tab) { tab.classList.remove('active'); });
        event.target.classList.add('active');

        var rows = document.querySelectorAll('#po-list-tbody tr');
        rows.forEach(function(row) {
            var status = row.dataset.status || '';
            if (tabType === 'active') {
                row.style.display = status !== 'cancelled' ? '' : 'none';
            } else if (tabType === 'cancelled') {
                row.style.display = status === 'cancelled' ? '' : 'none';
            }
        });
    };

    window.sortPOTable = function(column) {
        showToast('Sort by ' + column + ' coming soon', 'info');
    };

    window.openAddPOModal = function(poId) {
        window.location.href = poId ? 'po-edit.html?id=' + poId : 'po-edit.html?id=new';
    };

    window.closeAddPOModal = function() {
        var modalEl = document.getElementById('add-po-modal');
        if (modalEl) modalEl.style.display = 'none';
    };

    window.collectPOItems = function() {
        var items = [];
        var tbody = document.getElementById('add-po-items-tbody');
        if (!tbody) return items;

        tbody.querySelectorAll('tr').forEach(function(row) {
            var item = {
                productName: row.querySelector('.po-item-name')?.value || '',
                quantity: parseInt(row.querySelector('.po-item-qty')?.value) || 0,
                unit: row.querySelector('.po-item-unit')?.value || 'pcs',
                unitPrice: parseFloat(row.querySelector('.po-item-price')?.value) || 0
            };
            if (item.productName) items.push(item);
        });

        return items;
    };

    window.savePO = async function() {
        var form = document.getElementById('add-po-form');
        if (form && !form.checkValidity()) { form.reportValidity(); return; }

        var buyerCompany = document.getElementById('add-po-buyer-company')?.value;
        if (!buyerCompany) { showToast('Buyer company is required', 'error'); return; }

        var items = window.collectPOItems();
        if (items.length === 0) { showToast('At least one product item is required', 'error'); return; }

        var poData = {
            poNumber: document.getElementById('add-po-number')?.value || undefined,
            orderDate: document.getElementById('add-po-date')?.value || undefined,
            buyerName: buyerCompany,
            buyerContact: document.getElementById('add-po-buyer-contact')?.value || undefined,
            buyerEmail: document.getElementById('add-po-buyer-email')?.value || undefined,
            buyerPhone: document.getElementById('add-po-buyer-phone')?.value || undefined,
            buyerAddress: document.getElementById('add-po-buyer-address')?.value || undefined,
            currency: document.getElementById('add-po-currency')?.value || 'USD',
            incoterms: document.getElementById('add-po-incoterms')?.value || undefined,
            paymentTerms: document.getElementById('add-po-payment-terms')?.value || undefined,
            items: items,
            notes: document.getElementById('add-po-notes')?.value || undefined,
            status: 'pending'
        };

        try {
            var endpoint = window._editingPOId ? '/po/' + window._editingPOId : '/po';
            var method = window._editingPOId ? 'PATCH' : 'POST';

            await apiCall(endpoint, {
                method: method,
                body: JSON.stringify(poData)
            });

            showToast(window._editingPOId ? 'PO updated!' : 'PO registered!', 'success');
            window.closeAddPOModal();
            if (typeof window.loadPOListFromAPI === 'function') window.loadPOListFromAPI();
        } catch (e) {
            showToast(e.message || 'Failed to save PO', 'error');
        }
    };

    window.savePOAsDraft = async function() {
        var items = window.collectPOItems();
        var poData = {
            poNumber: document.getElementById('add-po-number')?.value || undefined,
            orderDate: document.getElementById('add-po-date')?.value || undefined,
            buyerName: document.getElementById('add-po-buyer-company')?.value || '',
            buyerContact: document.getElementById('add-po-buyer-contact')?.value || undefined,
            buyerEmail: document.getElementById('add-po-buyer-email')?.value || undefined,
            buyerPhone: document.getElementById('add-po-buyer-phone')?.value || undefined,
            buyerAddress: document.getElementById('add-po-buyer-address')?.value || undefined,
            currency: document.getElementById('add-po-currency')?.value || 'USD',
            incoterms: document.getElementById('add-po-incoterms')?.value || undefined,
            paymentTerms: document.getElementById('add-po-payment-terms')?.value || undefined,
            items: items,
            notes: document.getElementById('add-po-notes')?.value || undefined,
            status: 'draft'
        };

        try {
            var endpoint = window._editingPOId ? '/po/' + window._editingPOId : '/po';
            var method = window._editingPOId ? 'PATCH' : 'POST';

            await apiCall(endpoint, {
                method: method,
                body: JSON.stringify(poData)
            });

            showToast('PO saved as draft!', 'success');
            window.closeAddPOModal();
            if (typeof window.loadPOListFromAPI === 'function') window.loadPOListFromAPI();
        } catch (e) {
            showToast(e.message || 'Failed to save draft', 'error');
        }
    };

    window.addPOItemRow = function() {
        var tbody = document.getElementById('add-po-items-tbody');
        if (!tbody) return;
        var idx = tbody.querySelectorAll('tr').length;
        var tr = document.createElement('tr');
        tr.setAttribute('data-row', idx);
        tr.innerHTML =
            '<td><input type="text" class="wd-input wd-input-sm po-item-name" required placeholder="Product name"></td>' +
            '<td><input type="number" class="wd-input wd-input-sm po-item-qty" required min="1" value="1" onchange="calculatePOItemSubtotal(' + idx + ')"></td>' +
            '<td>' +
                '<select class="wd-select wd-select-sm po-item-unit">' +
                    '<option value="pcs">pcs</option>' +
                    '<option value="boxes">boxes</option>' +
                    '<option value="cases">cases</option>' +
                    '<option value="pallets">pallets</option>' +
                    '<option value="kg">kg</option>' +
                    '<option value="lbs">lbs</option>' +
                    '<option value="liters">liters</option>' +
                '</select>' +
            '</td>' +
            '<td><input type="number" class="wd-input wd-input-sm po-item-price" required min="0" step="0.01" value="0" onchange="calculatePOItemSubtotal(' + idx + ')"></td>' +
            '<td class="po-item-subtotal wd-text-right wd-text-bold">0.00</td>' +
            '<td>' +
                '<button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePOItemRow(' + idx + ')" title="Remove">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
            '</td>';
        tbody.appendChild(tr);
    };

    window.removePOItemRow = function(idx) {
        var tbody = document.getElementById('add-po-items-tbody');
        if (!tbody) return;
        var rows = tbody.querySelectorAll('tr');
        if (rows.length <= 1) { showToast('At least one item row is required', 'warning'); return; }
        var row = tbody.querySelector('tr[data-row="' + idx + '"]');
        if (row) row.remove();
        // Re-index remaining rows
        tbody.querySelectorAll('tr').forEach(function(tr, i) {
            tr.setAttribute('data-row', i);
            var qtyInput = tr.querySelector('.po-item-qty');
            var priceInput = tr.querySelector('.po-item-price');
            var removeBtn = tr.querySelector('.wd-btn-icon-danger');
            if (qtyInput) qtyInput.setAttribute('onchange', 'calculatePOItemSubtotal(' + i + ')');
            if (priceInput) priceInput.setAttribute('onchange', 'calculatePOItemSubtotal(' + i + ')');
            if (removeBtn) removeBtn.setAttribute('onclick', 'removePOItemRow(' + i + ')');
        });
        window.updatePOTotal();
    };

    window.onPOProductSelect = function(idx) {
        // For text input mode this is a no-op; kept for compatibility
    };

    window.calculatePOItemSubtotal = function(idx) {
        var tbody = document.getElementById('add-po-items-tbody');
        if (!tbody) return;
        var row = tbody.querySelector('tr[data-row="' + idx + '"]');
        if (!row) return;
        var qty = parseFloat(row.querySelector('.po-item-qty')?.value) || 0;
        var price = parseFloat(row.querySelector('.po-item-price')?.value) || 0;
        var subtotal = qty * price;
        var subtotalTd = row.querySelector('.po-item-subtotal');
        if (subtotalTd) subtotalTd.textContent = subtotal.toFixed(2);
        window.updatePOTotal();
    };

    window.updatePOTotal = function() {
        var tbody = document.getElementById('add-po-items-tbody');
        if (!tbody) return;
        var total = 0;
        tbody.querySelectorAll('.po-item-subtotal').forEach(function(td) {
            total += parseFloat(td.textContent) || 0;
        });
        var totalEl = document.getElementById('add-po-total-amount');
        if (totalEl) totalEl.textContent = total.toFixed(2);
        var currencyEl = document.getElementById('add-po-currency-symbol');
        var currencySelect = document.getElementById('add-po-currency');
        if (currencyEl && currencySelect) currencyEl.textContent = currencySelect.value;
    };

    window.updatePOCurrency = function() {
        window.updatePOTotal();
    };

    window.handlePOFileUpload = function(event) {
        var file = event.target.files[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { showToast('File size exceeds 20MB limit', 'error'); event.target.value = ''; return; }
        var uploadArea = document.getElementById('po-upload-area');
        var uploadedFile = document.getElementById('po-uploaded-file');
        var filenameEl = document.getElementById('po-uploaded-filename');
        if (uploadArea) uploadArea.style.display = 'none';
        if (uploadedFile) uploadedFile.style.display = 'flex';
        if (filenameEl) filenameEl.textContent = file.name;
        window._poUploadedFile = file;
    };

    window.removePOFile = function() {
        var uploadArea = document.getElementById('po-upload-area');
        var uploadedFile = document.getElementById('po-uploaded-file');
        var fileInput = document.getElementById('po-file-input');
        if (uploadArea) uploadArea.style.display = '';
        if (uploadedFile) uploadedFile.style.display = 'none';
        if (fileInput) fileInput.value = '';
        window._poUploadedFile = null;
    };

    window.loadPODataForEdit = async function(poId) {
        try {
            var data = await apiCall('/po/' + poId);

            var setVal = function(id, val) { var el = document.getElementById(id); if (el && val) el.value = val; };
            setVal('add-po-number', data.po_number);
            setVal('add-po-date', data.order_date ? data.order_date.split('T')[0] : '');
            setVal('add-po-buyer-company', data.buyer_name);
            setVal('add-po-buyer-contact', data.buyer_contact);
            setVal('add-po-buyer-email', data.buyer_email);
            setVal('add-po-buyer-phone', data.buyer_phone);
            setVal('add-po-buyer-address', data.buyer_address);
            setVal('add-po-currency', data.currency);
            setVal('add-po-incoterms', data.incoterms);
            setVal('add-po-payment-terms', data.payment_terms);
            setVal('add-po-notes', data.notes);

            var items = data.order_items || [];
            if (items.length > 0) {
                var tbody = document.getElementById('add-po-items-tbody');
                if (tbody) {
                    tbody.innerHTML = items.map(function(item, idx) {
                        var unitOptions = ['pcs','boxes','cases','pallets','kg','lbs','liters'].map(function(u) {
                            return '<option value="' + u + '" ' + ((item.unit || 'pcs') === u ? 'selected' : '') + '>' + u + '</option>';
                        }).join('');
                        var subtotal = ((item.quantity || 0) * (item.unit_price || 0)).toFixed(2);
                        return '<tr data-row="' + idx + '">' +
                            '<td><input type="text" class="wd-input wd-input-sm po-item-name" required placeholder="Product name" value="' + (item.product_name || '') + '"></td>' +
                            '<td><input type="number" class="wd-input wd-input-sm po-item-qty" required min="1" value="' + (item.quantity || 1) + '" onchange="calculatePOItemSubtotal(' + idx + ')"></td>' +
                            '<td><select class="wd-select wd-select-sm po-item-unit">' + unitOptions + '</select></td>' +
                            '<td><input type="number" class="wd-input wd-input-sm po-item-price" required min="0" step="0.01" value="' + (item.unit_price || 0) + '" onchange="calculatePOItemSubtotal(' + idx + ')"></td>' +
                            '<td class="po-item-subtotal wd-text-right wd-text-bold">' + subtotal + '</td>' +
                            '<td>' +
                                '<button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePOItemRow(' + idx + ')" title="Remove">' +
                                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                                '</button>' +
                            '</td>' +
                        '</tr>';
                    }).join('');
                    window.updatePOTotal();
                }
            }
        } catch (e) {
            showToast('Failed to load PO data', 'error');
        }
    };

    window.loadPOListFromAPI = async function() {
        try {
            var orders = await apiCall('/po');
            window.renderPOListFromAPI(Array.isArray(orders) ? orders : []);
        } catch (e) {
            console.log('Failed to load PO list from API');
        }
    };

    window.renderPOListFromAPI = function(orders) {
        var tbody = document.getElementById('po-list-tbody');
        if (!tbody) return;

        if (orders.length === 0) {
            tbody.innerHTML = renderEmptyRow(9, 'No purchase orders found');
            return;
        }

        tbody.innerHTML = orders.map(function(order) {
            var poNumber = order.po_number || '';
            var status = order.status || '';
            var totalAmount = order.total_amount ?? 0;
            var currency = order.currency || 'USD';
            var buyerName = order.buyer_name || '';
            var paymentTerms = order.payment_terms || '-';
            var incoterms = order.incoterms || '-';
            var items = order.order_items || [];
            var productName = items.length > 0 ? (items[0].product_name || '-') : '-';
            var itemExtra = items.length > 1 ? ' (+' + (items.length - 1) + ')' : '';
            var updatedAt = order.updated_at || order.created_at || '';
            var orderId = order.id || '';

            var statusLabels = {draft:'Draft',pending:'Pending',confirmed:'Confirmed',shipping:'Shipping',delivered:'Delivered',cancelled:'Cancelled'};
            var statusLabel = statusLabels[status] || status;

            return '<tr data-status="' + status + '" data-po="' + poNumber + '" onclick="viewPODetail(\'' + orderId + '\')" class="wd-table-row-clickable">' +
                '<td>' + poNumber + '</td>' +
                '<td><span class="wd-badge ' + getStatusBadgeClass(status) + '">' + statusLabel + '</span></td>' +
                '<td>' + productName + itemExtra + '</td>' +
                '<td>' + wdFormatCurrency(totalAmount, currency) + '</td>' +
                '<td>' + buyerName + '</td>' +
                '<td>' + paymentTerms + '</td>' +
                '<td>' + incoterms + '</td>' +
                '<td>' + wdFormatDate(updatedAt) + '</td>' +
                '<td>-</td>' +
            '</tr>';
        }).join('');
    };

    window.deletePO = function(poId) {
        showDeleteConfirm({
            title: 'Delete Purchase Order',
            message: 'Are you sure you want to delete this PO?<br>This action cannot be undone.',
            onConfirm: async function() {
                try {
                    await apiCall('/po/' + poId, { method: 'DELETE' });
                    showToast('PO deleted', 'success');
                    window.loadPOListFromAPI();
                } catch (e) {
                    showToast('Failed to delete PO', 'error');
                }
            }
        });
    };

    window.editPO = function(poId) {
        window.openAddPOModal(poId);
    };

})();

// WeDealize - Product Management
(function() {
    'use strict';

    // === Private State ===
    var _productListPage = 1;
    var _productListPageSize = 20;
    var _productListAll = [];
    var _productFilteredList = null;

    // === Private Functions ===

    function populateProductFilterOptions(products) {
        var catDropdown = document.getElementById('pf-category-dropdown');
        if (catDropdown) {
            var cats = [...new Set(products.map(function(p) { return p.category; }).filter(Boolean))].sort();
            var cur = document.getElementById('pf-category-value')?.value || '';
            catDropdown.innerHTML =
                '<label class="wd-filter-option"><input type="radio" name="pf-category" value="" ' + (!cur ? 'checked' : '') + ' onchange="applyProductFilter(\'category\',\'\')"><span>All</span></label>' +
                cats.map(function(c) {
                    return '<label class="wd-filter-option"><input type="radio" name="pf-category" value="' + escapeHtml(c) + '" ' + (cur === c ? 'checked' : '') + ' onchange="applyProductFilter(\'category\',\'' + escapeHtml(c) + '\')"><span>' + escapeHtml(c) + '</span></label>';
                }).join('');
        }
        var certDropdown = document.getElementById('pf-cert-dropdown');
        if (certDropdown) {
            var certs = [...new Set(products.flatMap(function(p) { return p.certifications || []; }))].sort();
            var cur2 = document.getElementById('pf-cert-value')?.value || '';
            certDropdown.innerHTML =
                '<label class="wd-filter-option"><input type="radio" name="pf-cert" value="" ' + (!cur2 ? 'checked' : '') + ' onchange="applyProductFilter(\'cert\',\'\')"><span>All</span></label>' +
                certs.map(function(c) {
                    return '<label class="wd-filter-option"><input type="radio" name="pf-cert" value="' + escapeHtml(c) + '" ' + (cur2 === c ? 'checked' : '') + ' onchange="applyProductFilter(\'cert\',\'' + escapeHtml(c) + '\')"><span>' + escapeHtml(c) + '</span></label>';
                }).join('');
        }
    }

    function applyProductFilters() {
        var search = (document.getElementById('product-search')?.value || '').toLowerCase().trim();
        var category = document.getElementById('pf-category-value')?.value || '';
        var cert = document.getElementById('pf-cert-value')?.value || '';
        var status = document.getElementById('pf-status-value')?.value || '';

        _productFilteredList = _productListAll.filter(function(p) {
            if (search && !(p.name || '').toLowerCase().includes(search) && !(p.sku || '').toLowerCase().includes(search)) return false;
            if (category && p.category !== category) return false;
            if (cert && !(p.certifications || []).includes(cert)) return false;
            if (status === 'complete' && (p.completeness || 0) < 70) return false;
            if (status === 'incomplete' && (p.completeness || 0) >= 70) return false;
            return true;
        });

        _productListPage = 1;
        renderProductListPage();
    }

    function renderProductListPage() {
        var tbody = document.getElementById('product-list-tbody');
        if (!tbody) return;

        var products = _productFilteredList || _productListAll;
        var paginationEl = document.getElementById('product-list-pagination');

        if (!products.length) {
            var msg = _productFilteredList !== null
                ? 'No products match the current filters.'
                : 'No products yet. Click "Add Product" to create one.';
            tbody.innerHTML = renderEmptyRow(8, msg);
            if (paginationEl) paginationEl.style.display = 'none';
            return;
        }

        var totalPages = Math.ceil(products.length / _productListPageSize);
        if (_productListPage > totalPages) _productListPage = totalPages;
        var start = (_productListPage - 1) * _productListPageSize;
        var pageProducts = products.slice(start, start + _productListPageSize);

        var isIncomplete = function(p) { return (p.completeness || 0) < 70; };
        var productThumbSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></svg>';

        tbody.innerHTML = pageProducts.map(function(product) {
            var priceDisplay = product.min_price
                ? (product.max_price ? '$' + product.min_price + ' - $' + product.max_price : '$' + product.min_price)
                : '<span class="wd-text-muted">-</span>';

            var moqDisplay = product.moq
                ? product.moq + (product.moq_unit ? ' ' + product.moq_unit : '')
                : renderBadge('Missing', 'warning');

            return '<tr class="' + (isIncomplete(product) ? 'wd-row-warning' : '') + ' wd-table-row-clickable" onclick="editProduct(\'' + product.id + '\')">' +
                '<td>' + renderCellGroup(product.name, product.sku || '', productThumbSvg) + '</td>' +
                '<td>' + (product.category ? renderBadge(product.category, 'outline') : renderBadge('Missing', 'warning')) + '</td>' +
                '<td>' + escapeHtml(product.sku || '-') + '</td>' +
                '<td>' + priceDisplay + '</td>' +
                '<td>' + moqDisplay + '</td>' +
                '<td>' + (product.certifications?.length > 0
                    ? product.certifications.map(function(c) { return renderBadge(c, 'success'); }).join(' ')
                    : '<span class="wd-text-muted">None</span>') + '</td>' +
                '<td>' + renderBadge(isIncomplete(product) ? 'Incomplete' : 'Complete', isIncomplete(product) ? 'warning' : 'success') + '</td>' +
                '<td><span class="wd-cell-secondary">' + wdFormatDate(product.created_at) + '</span></td>' +
                '</tr>';
        }).join('');

        // Render pagination
        if (paginationEl) {
            if (totalPages <= 1) {
                paginationEl.style.display = 'none';
            } else {
                paginationEl.style.display = 'flex';
                var end = Math.min(start + _productListPageSize, products.length);
                var pagesHtml = '';
                for (var i = 1; i <= totalPages; i++) {
                    pagesHtml += '<button class="wd-pagination-btn' + (i === _productListPage ? ' active' : '') + '" onclick="goProductListPage(' + i + ')">' + i + '</button>';
                }
                paginationEl.innerHTML =
                    '<div class="wd-pagination-info">' +
                    '<span>Showing ' + (start + 1) + '-' + end + ' of ' + products.length + '</span>' +
                    '<select class="wd-select" style="width: 80px; padding: 6px 10px;" onchange="changeProductListPageSize(this.value)">' +
                    '<option value="20"' + (_productListPageSize === 20 ? ' selected' : '') + '>20</option>' +
                    '<option value="50"' + (_productListPageSize === 50 ? ' selected' : '') + '>50</option>' +
                    '<option value="100"' + (_productListPageSize === 100 ? ' selected' : '') + '>100</option>' +
                    '</select>' +
                    '<span>per page</span>' +
                    '</div>' +
                    '<div class="wd-pagination-pages">' +
                    '<button class="wd-pagination-btn" onclick="goProductListPage(' + (_productListPage - 1) + ')" ' + (_productListPage === 1 ? 'disabled' : '') + '>&lt;</button>' +
                    pagesHtml +
                    '<button class="wd-pagination-btn" onclick="goProductListPage(' + (_productListPage + 1) + ')" ' + (_productListPage === totalPages ? 'disabled' : '') + '>&gt;</button>' +
                    '</div>';
            }
        }
    }

    function renderProductList(products) {
        _productListAll = products;
        _productFilteredList = null;
        _productListPage = 1;
        populateProductFilterOptions(products);
        renderProductListPage();
        updateProductStats(products);
    }

    // === Public API ===

    window.openAddProductModal = function() {
        window.location.href = 'product-edit.html?id=new';
    };

    window.editProduct = function(productId) {
        window.location.href = 'product-edit.html?id=' + productId;
    };

    window.closeProductModal = function() {
        document.getElementById('product-modal').style.display = 'none';
        window._editingProductId = null;
        window._editingExtractedProductId = null;
    };

    window.saveProduct = async function() {
        if (window._editingExtractedProductId) {
            if (typeof saveExtractedProductFromModal === 'function') {
                saveExtractedProductFromModal();
            }
            return;
        }

        var name = document.getElementById('edit-product-name')?.value?.trim();
        if (!name) {
            showToast('Product name is required', 'error');
            return;
        }

        var certifications = [];
        document.querySelectorAll('#product-cert-grid input[type="checkbox"]:checked').forEach(function(cb) {
            certifications.push(cb.value);
        });

        var payload = {
            name: name,
            sku: document.getElementById('edit-product-sku')?.value || '',
            category: document.getElementById('edit-product-category')?.value || '',
            description: document.getElementById('edit-product-description')?.value || '',
            minPrice: parseFloat(document.getElementById('edit-price-min')?.value) || null,
            maxPrice: parseFloat(document.getElementById('edit-price-max')?.value) || null,
            moq: parseInt(document.getElementById('edit-moq')?.value) || null,
            moqUnit: document.getElementById('edit-moq-unit')?.value || '',
            certifications: certifications
        };

        try {
            var isEdit = !!window._editingProductId;
            var endpoint = isEdit ? '/products/' + window._editingProductId : '/products';
            var method = isEdit ? 'PATCH' : 'POST';

            await apiCall(endpoint, {
                method: method,
                body: JSON.stringify(payload)
            });

            showToast(isEdit ? 'Product updated!' : 'Product created!', 'success');
            closeProductModal();
            loadProducts();
        } catch (e) {
            console.error('Failed to save product:', e);
            showToast(e.message || 'Failed to save product', 'error');
        }
    };

    window.deleteProduct = async function(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await apiCall('/products/' + productId, { method: 'DELETE' });
            showToast('Product deleted', 'success');
            loadProducts();
        } catch (e) {
            console.error('Failed to delete product:', e);
            showToast('Failed to delete product', 'error');
        }
    };

    window.loadProducts = async function(filter) {
        var tbody = document.getElementById('product-list-tbody');
        if (!tbody) return;

        try {
            var endpoint = '/products';
            var params = new URLSearchParams();
            if (filter) params.set('status', filter);
            if (params.toString()) endpoint += '?' + params.toString();

            var data = await apiCall(endpoint);
            renderProductList(data.products || []);
        } catch (error) {
            console.error('Failed to load products:', error);
            if (tbody) {
                tbody.innerHTML = renderEmptyRow(8, 'No products yet. Click "Add Product" to create one.');
            }
        }
    };

    window.searchProducts = function() {
        applyProductFilters();
    };

    window.toggleProductFilter = function(event, dropdownId) {
        event.stopPropagation();
        document.querySelectorAll('#pf-category-dropdown, #pf-cert-dropdown, #pf-status-dropdown').forEach(function(d) {
            if (d.id !== dropdownId) d.classList.remove('show');
        });
        var dropdown = document.getElementById(dropdownId);
        if (dropdown) dropdown.classList.toggle('show');
        var closeDropdown = function(e) {
            if (!e.target.closest('.wd-column-filter')) {
                dropdown?.classList.remove('show');
                document.removeEventListener('click', closeDropdown);
            }
        };
        setTimeout(function() { document.addEventListener('click', closeDropdown); }, 0);
    };

    window.applyProductFilter = function(type, value) {
        var hiddenInput = document.getElementById('pf-' + type + '-value');
        if (hiddenInput) hiddenInput.value = value;

        var dropdownId = 'pf-' + type + '-dropdown';
        var dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            dropdown.classList.remove('show');
            var btn = dropdown.parentElement?.querySelector('.wd-filter-btn');
            if (btn) btn.classList.toggle('active', value !== '');
        }
        applyProductFilters();
    };

    window.goProductListPage = function(page) {
        var totalPages = Math.ceil((_productFilteredList || _productListAll).length / _productListPageSize);
        if (page < 1 || page > totalPages) return;
        _productListPage = page;
        renderProductListPage();
    };

    window.changeProductListPageSize = function(size) {
        _productListPageSize = parseInt(size, 10);
        _productListPage = 1;
        renderProductListPage();
    };

    window.filterMissing = function(type) {
        showSection('product-list');
        var filterEl = document.getElementById('product-list-filter');
        if (filterEl) {
            filterEl.value = 'no-' + type;
            filterProductList();
        }
    };

    window.filterProductList = function() {
        var filter = document.getElementById('product-list-filter').value;
        var rows = document.querySelectorAll('#product-list-tbody tr');
        rows.forEach(function(row) {
            var isWarning = row.classList.contains('wd-row-warning');
            var show = true;
            switch (filter) {
                case 'complete': show = !isWarning; break;
                case 'incomplete': show = isWarning; break;
                case 'no-moq': case 'no-image': case 'no-cert': show = isWarning; break;
            }
            row.style.display = show ? '' : 'none';
        });
    };

    window.addMOQ = function(productId) { window.location.href = 'product-edit.html?id=' + productId; };
    window.addCert = function(productId) { window.location.href = 'product-edit.html?id=' + productId; };

    window.exportProducts = async function() {
        showToast('Exporting products to CSV...', 'info');
        try {
            var products = await getAllProducts();
            if (!products || products.length === 0) {
                showToast('No products to export', 'warning');
                return;
            }

            var headers = ['Product Name', 'Category', 'SKU', 'Min Price (FOB)', 'Max Price (FOB)', 'MOQ', 'Certifications', 'Status'];
            var csvRows = [headers.join(',')];

            products.forEach(function(product) {
                var pr = parsePriceRange(product.price);
                var row = [
                    escapeCsvField(product.name || ''),
                    escapeCsvField(product.category || ''),
                    escapeCsvField(product.sku || ''),
                    escapeCsvField(pr.minPrice),
                    escapeCsvField(pr.maxPrice),
                    escapeCsvField(product.moq || ''),
                    escapeCsvField(Array.isArray(product.certifications) ? product.certifications.join('; ') : (product.certifications || '')),
                    escapeCsvField(product.status || '')
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
            link.setAttribute('download', 'products_export_' + timestamp + '.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('Successfully exported ' + products.length + ' products', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export products', 'error');
        }
    };

    // === Stats & Quality ===

    window.updateProductStats = function(products) {
        var total = products.length;
        if (total === 0) {
            setTextById('stat-completeness', '0%');
            setTextById('stat-products', '0');
            setTextById('dash-completeness-pct', '0%');
            setStyleById('dash-completeness-bar', 'width', '0%');
            setTextById('dash-missing-moq', '0 products');
            setTextById('dash-missing-price', '0 products');
            setTextById('dash-missing-certs', '0 products');
            updateQualityCard(0, [], 0);
            return;
        }

        var hasName = products.filter(function(p) { return p.name; }).length;
        var hasPrice = products.filter(function(p) { return p.min_price != null; }).length;
        var hasMoq = products.filter(function(p) { return p.moq != null; }).length;
        var hasCerts = products.filter(function(p) { return p.certifications?.length > 0; }).length;
        var hasSku = products.filter(function(p) { return p.sku; }).length;
        var hasCategory = products.filter(function(p) { return p.category; }).length;

        var avgCompleteness = Math.round(
            products.reduce(function(sum, p) { return sum + (p.completeness || 0); }, 0) / total
        );

        var missingPrice = total - hasPrice;
        var missingMoq = total - hasMoq;
        var missingCerts = total - hasCerts;

        setTextById('stat-completeness', avgCompleteness + '%');
        setTextById('stat-products', String(total));
        setTextById('dash-completeness-pct', avgCompleteness + '%');
        setStyleById('dash-completeness-bar', 'width', avgCompleteness + '%');
        setTextById('dash-missing-moq', missingMoq + ' products');
        setTextById('dash-missing-price', missingPrice + ' products');
        setTextById('dash-missing-certs', missingCerts + ' products');

        var fields = [
            { label: 'Name', filled: hasName, total: total },
            { label: 'Price', filled: hasPrice, total: total },
            { label: 'MOQ', filled: hasMoq, total: total, filter: 'moq' },
            { label: 'SKU', filled: hasSku, total: total },
            { label: 'Category', filled: hasCategory, total: total },
            { label: 'Certs', filled: hasCerts, total: total, filter: 'cert' }
        ];
        updateQualityCard(avgCompleteness, fields, total);
    };

    function updateQualityCard(pct, fields, totalProducts) {
        var circle = document.getElementById('dq-ring-circle');
        var ringVal = document.getElementById('quality-ring-value');
        var circumference = 2 * Math.PI * 52;

        if (circle) {
            var offset = circumference - (pct / 100) * circumference;
            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = offset;
            if (pct >= 80) circle.style.stroke = 'var(--wd-success)';
            else if (pct >= 50) circle.style.stroke = 'var(--wd-warning)';
            else circle.style.stroke = 'var(--wd-error)';
        }
        if (ringVal) ringVal.textContent = pct + '%';

        var summary = document.getElementById('dq-summary');
        if (summary) {
            var completeFields = fields.filter(function(f) { return f.filled === f.total; }).length;
            var totalFields = fields.length;
            if (pct === 100) {
                summary.innerHTML = '<span class="wd-dq-summary-text"><strong>All ' + totalProducts + ' products</strong> have complete data across <strong>' + totalFields + ' fields</strong>. Your catalog is ready for buyers.</span>';
            } else {
                var missingCount = fields.reduce(function(sum, f) { return sum + (f.total - f.filled); }, 0);
                summary.innerHTML = '<span class="wd-dq-summary-text"><strong>' + completeFields + '/' + totalFields + ' fields</strong> fully complete across <strong>' + totalProducts + ' products</strong>. ' + missingCount + ' missing value' + (missingCount > 1 ? 's' : '') + ' to fill.</span>';
            }
        }

        var container = document.getElementById('quality-checklist');
        if (!container) return;

        if (!fields.length || totalProducts === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#999;">No products yet.</div>';
            return;
        }

        container.innerHTML = fields.map(function(f) {
            var isComplete = f.filled === f.total;
            var pctField = Math.round((f.filled / f.total) * 100);
            var missing = f.total - f.filled;
            var barCls = isComplete ? '' : ' incomplete';
            var countCls = isComplete ? 'complete' : 'incomplete';
            var link = (!isComplete && f.filter)
                ? '<a href="#" class="wd-dq-field-link" onclick="filterMissing(\'' + f.filter + '\'); return false;">' + missing + ' missing &rarr;</a>'
                : '';
            return '<div class="wd-dq-field">' +
                '<div class="wd-dq-field-top">' +
                '<span class="wd-dq-field-label">' + f.label + '</span>' +
                '<span class="wd-dq-field-count ' + countCls + '">' + f.filled + '/' + f.total + '</span>' +
                '</div>' +
                '<div class="wd-dq-field-bar">' +
                '<div class="wd-dq-field-bar-fill' + barCls + '" style="width:' + pctField + '%;"></div>' +
                '</div>' +
                link +
                '</div>';
        }).join('');
    }

    window.checkDataCompleteness = async function() {
        try {
            var data = await apiCall('/products');
            updateProductStats(data.products || []);
        } catch (e) {
            console.error('Failed to refresh product stats:', e);
        }
    };

    window.dismissCompletenessAlert = function() {
        var alert = document.getElementById('data-completeness-alert');
        if (alert) alert.style.display = 'none';
    };

    // === Helper Functions ===

    window.getAllProducts = async function() {
        try {
            var data = await apiCall('/products');
            return data.products || [];
        } catch (error) {
            console.error('Failed to fetch products from API:', error);
        }
        return [];
    };

    window.getDemoProducts = function() {
        return [
            { name: 'Extra Virgin Olive Oil 500ml', category: 'Oils & Vinegars', sku: 'OIL-001', price: '$7.20 - $8.50', moq: '200 bottles', certifications: ['Organic'], status: 'Complete' },
            { name: 'Aged Parmesan 24 months', category: 'Dairy & Cheese', sku: 'CHE-003', price: '$18.00 - $22.00', moq: '', certifications: ['DOP'], status: 'Incomplete' },
            { name: 'Raw Organic Honey 500g', category: 'Organic & Health', sku: 'HON-005', price: '$12.00', moq: '100 jars', certifications: ['Organic'], status: 'Complete' },
            { name: 'Balsamic Vinegar 250ml', category: 'Oils & Vinegars', sku: 'VIN-002', price: '$12.00 - $15.00', moq: '150 bottles', certifications: ['IGP'], status: 'Complete' },
            { name: 'Truffle Oil 100ml', category: 'Oils & Vinegars', sku: 'OIL-010', price: '$25.00', moq: '50 bottles', certifications: [], status: 'Incomplete' },
            { name: 'Artisan Pasta 500g', category: 'Pasta & Grains', sku: 'PAS-001', price: '$4.50', moq: '300 packs', certifications: ['Organic'], status: 'Complete' },
            { name: 'San Marzano Tomatoes 400g', category: 'Canned Goods', sku: 'CAN-001', price: '$3.20', moq: '500 cans', certifications: ['DOP'], status: 'Complete' },
            { name: 'Prosciutto di Parma 200g', category: 'Deli & Meats', sku: 'MEA-001', price: '$15.00 - $18.00', moq: '100 packs', certifications: ['DOP'], status: 'Complete' },
            { name: 'Pecorino Romano 300g', category: 'Dairy & Cheese', sku: 'CHE-005', price: '$14.00', moq: '', certifications: ['DOP'], status: 'Incomplete' },
            { name: 'Limoncello 500ml', category: 'Beverages', sku: 'BEV-001', price: '$18.00', moq: '100 bottles', certifications: [], status: 'Incomplete' }
        ];
    };

    window.extractProductsFromTable = function() {
        var products = [];
        var rows = document.querySelectorAll('#product-list-tbody tr');
        rows.forEach(function(row) {
            var cells = row.querySelectorAll('td');
            if (cells.length >= 7) {
                var nameEl = cells[0].querySelector('.product-name');
                var categoryEl = cells[1].querySelector('.category-badge');
                var certBadges = cells[5].querySelectorAll('.cert-badge');
                var statusEl = cells[6].querySelector('.status-dot');
                products.push({
                    name: nameEl ? nameEl.textContent.trim() : '',
                    category: categoryEl ? categoryEl.textContent.trim() : '',
                    sku: cells[2] ? cells[2].textContent.trim() : '',
                    price: cells[3] ? cells[3].textContent.trim() : '',
                    moq: cells[4] ? cells[4].textContent.replace(/Missing|Add/gi, '').trim() : '',
                    certifications: Array.from(certBadges).map(function(b) { return b.textContent.trim(); }),
                    status: statusEl ? (statusEl.classList.contains('complete') ? 'Complete' : 'Incomplete') : ''
                });
            }
        });
        return products;
    };

})();

// WeDealize - Catalog Extraction
(function() {
    'use strict';

    // ==================== Private State ====================

    var currentCatalogStep = 1;
    var extractedProducts = [];
    var priceMatchedProducts = [];
    var uploadedFiles = {
        catalog: null,
        pricelist: null,
        cert: []
    };
    var currentJobId = null;

    // ==================== File Upload ====================

    function handleFile(file, type) {
        // File size check
        var maxSize = type === 'cert' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast('File too large. Max size: ' + (maxSize / 1024 / 1024) + 'MB', 'error');
            return;
        }

        // File extension check
        var allowedTypes = {
            catalog: ['.pdf', '.xlsx', '.xls', '.csv'],
            pricelist: ['.pdf', '.xlsx', '.xls', '.csv'],
            cert: ['.pdf', '.jpg', '.jpeg', '.png']
        };

        var ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes[type].includes(ext)) {
            showToast('Invalid file type. Allowed: ' + allowedTypes[type].join(', '), 'error');
            return;
        }

        if (type === 'cert') {
            uploadedFiles.cert.push(file);
            updateCertList();
        } else {
            uploadedFiles[type] = file;
            showUploadedFile(type, file.name);
        }
    }

    // Second version (lines 3166-3194) — more complete with file size display and extract button enable
    function showUploadedFile(type, filename) {
        var dropzone = document.getElementById(type + '-dropzone');
        var uploaded = document.getElementById(type + '-uploaded');
        var filenameEl = document.getElementById(type + '-filename');
        var filesizeEl = document.getElementById(type + '-filesize');

        if (dropzone) dropzone.style.display = 'none';
        if (uploaded) uploaded.style.display = 'flex';
        if (filenameEl) filenameEl.textContent = filename;

        // File size display
        if (filesizeEl && uploadedFiles[type]) {
            var size = uploadedFiles[type].size;
            var sizeStr = size < 1024 * 1024
                ? (size / 1024).toFixed(1) + ' KB'
                : (size / (1024 * 1024)).toFixed(1) + ' MB';
            filesizeEl.textContent = sizeStr;
        }

        // Enable Extract button on catalog upload
        if (type === 'catalog') {
            document.getElementById('extract-btn').disabled = false;
        }

        // Process price list matching on pricelist upload
        if (type === 'pricelist') {
            processPriceListMatching();
        }
    }

    function handleFileSelect(e, type) {
        var files = e.target.files;
        if (type === 'cert') {
            Array.from(files).forEach(function(file) { handleFile(file, type); });
        } else if (files.length > 0) {
            handleFile(files[0], type);
        }
    }

    function removeFile(type) {
        uploadedFiles[type] = null;
        document.getElementById(type + '-dropzone').style.display = 'block';
        document.getElementById(type + '-uploaded').style.display = 'none';
        document.getElementById(type + '-file').value = '';
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('dragover');
    }

    function handleDrop(e, type) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');

        var files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0], type);
        }
    }

    function updateCertList() {
        var list = document.getElementById('cert-list');
        list.innerHTML = uploadedFiles.cert.map(function(file, index) {
            return '<div class="uploaded-file">' +
                '<span class="file-icon">📄</span>' +
                '<span class="file-name">' + file.name + '</span>' +
                '<button class="btn-remove" onclick="removeCert(' + index + ')">×</button>' +
                '</div>';
        }).join('');
    }

    function removeCert(index) {
        uploadedFiles.cert.splice(index, 1);
        updateCertList();
    }

    // ==================== File Processing ====================

    function delay(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    }

    async function processUploads() {
        if (!uploadedFiles.catalog) {
            showToast('Please upload a product catalog (required)', 'error');
            return;
        }

        document.getElementById('processing-status').style.display = 'block';
        var steps = ['upload', 'parse', 'extract', 'review'];

        try {
            // Step 1: Upload files
            updateProcessingStep(steps, 0);

            var catalogResult = await uploadFile('/upload/catalog', uploadedFiles.catalog);
            currentJobId = catalogResult.job_id;

            if (uploadedFiles.pricelist) {
                await uploadFile('/upload/pricelist', uploadedFiles.pricelist);
            }

            for (var i = 0; i < uploadedFiles.cert.length; i++) {
                await uploadFile('/upload/certificate', uploadedFiles.cert[i], { certificate_type: 'general' });
            }

            // Step 2-4: Poll server processing status
            await pollProcessingStatus(steps);

        } catch (error) {
            console.error('Upload error:', error);
            showToast(error.message || 'Upload failed. Please try again.', 'error');
            document.getElementById('processing-status').style.display = 'none';
            return;
        }

        // Complete
        document.getElementById('step-' + steps[steps.length - 1]).classList.remove('active');
        document.getElementById('step-' + steps[steps.length - 1]).classList.add('complete');
        document.getElementById('progress-fill').style.width = '100%';
        document.getElementById('progress-text').textContent = 'Processing complete!';

        showToast('Catalog processed successfully!');

        await delay(2000);
        document.getElementById('processing-status').style.display = 'none';

        checkDataCompleteness();
    }

    function updateProcessingStep(steps, currentIndex) {
        if (currentIndex > 0) {
            document.getElementById('step-' + steps[currentIndex - 1]).classList.remove('active');
            document.getElementById('step-' + steps[currentIndex - 1]).classList.add('complete');
        }

        document.getElementById('step-' + steps[currentIndex]).classList.add('active');

        var progress = (currentIndex + 1) * 25;
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-text').textContent = getStepMessage(steps[currentIndex]);
    }

    async function pollProcessingStatus(steps) {
        if (!currentJobId) {
            // Demo simulation before API integration
            for (var i = 1; i < steps.length; i++) {
                updateProcessingStep(steps, i);
                await delay(1500);
            }
            document.getElementById('stat-products').textContent = '24';
            return;
        }

        // Actual status polling with API
        var completed = false;
        var lastStage = 0;

        while (!completed) {
            try {
                var status = await apiCall('/upload/status/' + currentJobId);

                var stageMap = {
                    'uploading': 0,
                    'parsing': 1,
                    'extracting': 2,
                    'validating': 3,
                    'complete': 4,
                    'error': -1
                };

                var currentStage = stageMap[status.status] || 0;

                if (currentStage !== lastStage && currentStage >= 0 && currentStage < steps.length) {
                    updateProcessingStep(steps, currentStage);
                    lastStage = currentStage;
                }

                if (status.status === 'complete') {
                    completed = true;
                    document.getElementById('stat-products').textContent = status.products_extracted || '0';
                } else if (status.status === 'error') {
                    throw new Error(status.errors?.[0] || 'Processing failed');
                }

                await delay(1000);
            } catch (error) {
                throw error;
            }
        }
    }

    function getStepMessage(step) {
        var messages = {
            upload: 'Uploading files...',
            parse: 'Parsing document structure...',
            extract: 'Extracting product information with AI...',
            review: 'Validating data...'
        };
        return messages[step];
    }

    // ==================== Extracted Products ====================

    function updateSelectedCount() {
        var checked = document.querySelectorAll('.extract-checkbox:checked').length;
        var total = document.querySelectorAll('.extract-checkbox').length;
        var selectedEl = document.getElementById('selected-count');
        var totalEl = document.getElementById('total-count');

        if (selectedEl) selectedEl.textContent = checked;
        if (totalEl) totalEl.textContent = total;
    }

    function toggleSelectAllExtracted() {
        var selectAll = document.getElementById('select-all-extracted');
        var checkboxes = document.querySelectorAll('.extract-checkbox');

        checkboxes.forEach(function(cb) {
            cb.checked = selectAll.checked;
        });

        updateSelectedCount();
    }

    function selectAllExtracted() {
        var selectAll = document.getElementById('select-all-extracted');
        selectAll.checked = true;
        toggleSelectAllExtracted();
    }

    function moveToProductList() {
        var checkboxes = document.querySelectorAll('.extract-checkbox:checked');
        var count = checkboxes.length;

        if (count === 0) {
            showToast(t('catalog.selectProducts'), 'warning');
            return;
        }

        checkboxes.forEach(function(cb) {
            var row = cb.closest('tr');
            if (row) {
                row.remove();
            }
        });

        document.getElementById('select-all-extracted').checked = false;
        updateSelectedCount();

        showToast(count + ' ' + t('catalog.movedSuccess'), 'success');

        setTimeout(function() {
            showSection('product-list');
        }, 1000);
    }

    function editExtractedProduct(productId) {
        var product = extractedProducts.find(function(p) { return p.id === productId; });
        if (!product) return;

        var modal = document.getElementById('product-modal');
        if (!modal) return;

        // Set modal title
        var titleEl = document.getElementById('product-modal-title');
        if (titleEl) titleEl.textContent = 'Edit Extracted Product';

        // Populate form fields
        var nameEl = document.getElementById('edit-product-name');
        var skuEl = document.getElementById('edit-product-sku');
        var catEl = document.getElementById('edit-product-category');
        var descEl = document.getElementById('edit-product-description');
        var minPriceEl = document.getElementById('edit-price-min');
        var maxPriceEl = document.getElementById('edit-price-max');
        var moqEl = document.getElementById('edit-moq');
        var moqUnitEl = document.getElementById('edit-moq-unit');

        if (nameEl) nameEl.value = product.name || '';
        if (skuEl) skuEl.value = product.sku || '';
        if (catEl) catEl.value = product.category || '';
        if (descEl) descEl.value = product.description || '';
        if (minPriceEl) minPriceEl.value = product.minPrice ?? '';
        if (maxPriceEl) maxPriceEl.value = product.maxPrice ?? '';
        if (moqEl) moqEl.value = product.moq ?? '';
        if (moqUnitEl) moqUnitEl.value = product.moqUnit || '';

        // Certifications checkboxes
        var certGrid = document.getElementById('product-cert-grid');
        if (certGrid) {
            certGrid.querySelectorAll('input[type="checkbox"]').forEach(function(cb) {
                cb.checked = (product.certifications || []).some(function(c) {
                    return c.toLowerCase().includes(cb.value.toLowerCase());
                });
            });
        }

        // Store editing context for save
        window._editingExtractedProductId = productId;
        window._editingProductId = null; // not a DB product

        modal.style.display = 'flex';
    }

    function saveExtractedProductFromModal() {
        var productId = window._editingExtractedProductId;
        if (!productId) return false;

        var product = extractedProducts.find(function(p) { return p.id === productId; });
        if (!product) return false;

        // Read form values back
        product.name = document.getElementById('edit-product-name')?.value || product.name;
        product.sku = document.getElementById('edit-product-sku')?.value || null;
        product.category = document.getElementById('edit-product-category')?.value || null;
        product.description = document.getElementById('edit-product-description')?.value || null;
        product.minPrice = parseFloat(document.getElementById('edit-price-min')?.value) || null;
        product.maxPrice = parseFloat(document.getElementById('edit-price-max')?.value) || null;
        product.moq = parseInt(document.getElementById('edit-moq')?.value) || null;
        product.moqUnit = document.getElementById('edit-moq-unit')?.value || null;

        // Certifications
        var certs = [];
        document.querySelectorAll('#product-cert-grid input[type="checkbox"]:checked').forEach(function(cb) {
            certs.push(cb.value);
        });
        product.certifications = certs;

        // Recalculate status & price display
        var hasPrice = product.minPrice != null || product.maxPrice != null;
        product.status = (product.name && product.category && hasPrice) ? 'complete' : 'incomplete';
        product.emoji = getCategoryEmoji(product.category);

        if (product.minPrice != null && product.maxPrice != null && product.minPrice !== product.maxPrice) {
            product.price = '$' + product.minPrice.toFixed(2) + ' - $' + product.maxPrice.toFixed(2);
        } else if (product.minPrice != null) {
            product.price = '$' + product.minPrice.toFixed(2);
        } else if (product.maxPrice != null) {
            product.price = '$' + product.maxPrice.toFixed(2);
        } else {
            product.price = null;
        }
        product.originalPrice = product.price;

        // Clear context & close modal
        window._editingExtractedProductId = null;
        document.getElementById('product-modal').style.display = 'none';

        // Refresh table
        loadExtractedProducts();
        showToast('Product updated!', 'success');
        return true;
    }

    // ==================== Catalog Step Navigation ====================

    function goToCatalogStep(stepNum) {
        // Hide current step
        document.getElementById('catalog-step-' + currentCatalogStep).style.display = 'none';

        // Update step indicators (3 steps)
        for (var i = 1; i <= 3; i++) {
            var indicator = document.getElementById('step-indicator-' + i);
            if (!indicator) continue;
            indicator.classList.remove('active', 'completed');

            if (i < stepNum) {
                indicator.classList.add('completed');
            } else if (i === stepNum) {
                indicator.classList.add('active');
            }
        }

        // Update connectors
        for (var j = 1; j <= 2; j++) {
            var connector = document.getElementById('connector-' + j);
            if (connector) {
                if (j < stepNum) {
                    connector.classList.add('completed');
                } else {
                    connector.classList.remove('completed');
                }
            }
        }

        // Show new step
        currentCatalogStep = stepNum;
        document.getElementById('catalog-step-' + stepNum).style.display = 'block';

        // Load data for step
        if (stepNum === 2) {
            loadExtractedProducts();
        } else if (stepNum === 3) {
            // Complete — register products to DB
            registerExtractedProducts().then(function(count) {
                showCompleteSummary(count);
            });
        }
    }

    // ==================== PDF -> Image Rendering Helpers ====================

    async function renderPdfPageToBase64(pdfDoc, pageNum) {
        var page = await pdfDoc.getPage(pageNum);
        var scale = 1.5;
        var viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        var ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        return canvas.toDataURL('image/jpeg', 0.6);
    }

    async function renderAllPdfPages(file) {
        var arrayBuffer = await file.arrayBuffer();
        var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        var totalPages = pdf.numPages;
        var images = [];
        for (var i = 1; i <= totalPages; i++) {
            updateExtractionProgress('rendering', i, totalPages);
            var base64 = await renderPdfPageToBase64(pdf, i);
            images.push({ data: base64, pageNumber: i });
        }
        return images;
    }

    async function sendExtractionBatch(images, fileName, batchIndex, totalBatches) {
        return await apiCall('/catalog/extract', {
            method: 'POST',
            body: JSON.stringify({ images: images, fileName: fileName, batchIndex: batchIndex, totalBatches: totalBatches }),
            timeout: 120000
        });
    }

    function updateExtractionProgress(phase, current, total) {
        var progressEl = document.getElementById('extraction-progress');
        var barEl = document.getElementById('extraction-progress-bar');
        var textEl = document.getElementById('extraction-status-text');
        var pctEl = document.getElementById('extraction-progress-pct');
        if (!progressEl) return;

        progressEl.style.display = 'block';
        var pct = 0;
        var label = '';

        if (phase === 'rendering') {
            // 0% - 30%
            pct = Math.round((current / total) * 30);
            label = 'Rendering page ' + current + '/' + total + '...';
        } else if (phase === 'extracting') {
            // 30% - 95%
            pct = 30 + Math.round((current / total) * 65);
            label = 'AI extracting batch ' + current + '/' + total + '...';
        } else if (phase === 'complete') {
            pct = 100;
            label = 'Extraction complete! ' + current + ' products found.';
        }

        barEl.style.width = pct + '%';
        textEl.textContent = label;
        pctEl.textContent = pct + '%';
    }

    // ==================== Category Helpers ====================

    function getCategoryEmoji(category) {
        var map = {
            'evoo': '🫒', 'olive-oil': '🫒', 'seed-oils': '🫒', 'nut-oils': '🥜', 'truffle-oil': '🫒',
            'balsamic': '🍷', 'wine-vinegar': '🍷', 'sauces': '🥫', 'mustard-dressings': '🥗',
            'hard-cheese': '🧀', 'soft-cheese': '🧀', 'aged-cheese': '🧀', 'butter-cream': '🧈',
            'cured-meats': '🥩', 'sausages': '🌭', 'smoked-meats': '🥓',
            'dried-pasta': '🍝', 'fresh-pasta': '🍝', 'rice': '🍚', 'flour-semolina': '🌾',
            'bread': '🍞', 'biscuits-cookies': '🍪', 'chocolate': '🍫', 'pastries': '🥐',
            'tomato-products': '🍅', 'pickles-olives': '🫒', 'preserved-veg': '🥫', 'jams-spreads': '🍯',
            'wine': '🍷', 'spirits': '🥃', 'coffee': '☕', 'tea': '🍵', 'juices-soft': '🧃',
            'fresh-fish': '🐟', 'canned-fish': '🐟', 'shellfish': '🦐', 'smoked-fish': '🐟',
            'spice-blends': '🌶️', 'herbs': '🌿', 'honey': '🍯',
            'nuts-dried-fruit': '🥜', 'chips-crackers': '🍘', 'bars': '🍫',
            'organic': '🌱', 'gluten-free': '🌾', 'vegan-plant': '🥬', 'frozen': '🧊',
        };
        return map[category] || '📦';
    }

    function getCategoryLabel(category) {
        var labels = {
            'evoo': 'Extra Virgin Olive Oil', 'olive-oil': 'Olive Oil', 'seed-oils': 'Seed Oils',
            'nut-oils': 'Nut Oils', 'truffle-oil': 'Truffle Oil', 'balsamic': 'Balsamic Vinegar',
            'wine-vinegar': 'Wine Vinegar', 'sauces': 'Sauces & Pesto', 'mustard-dressings': 'Mustard & Dressings',
            'hard-cheese': 'Hard Cheese', 'soft-cheese': 'Soft Cheese', 'aged-cheese': 'Aged Cheese',
            'butter-cream': 'Butter & Cream', 'cured-meats': 'Cured Meats', 'sausages': 'Sausages',
            'smoked-meats': 'Smoked Meats', 'dried-pasta': 'Dried Pasta', 'fresh-pasta': 'Fresh Pasta',
            'rice': 'Rice', 'flour-semolina': 'Flour & Semolina', 'bread': 'Bread',
            'biscuits-cookies': 'Biscuits & Cookies', 'chocolate': 'Chocolate', 'pastries': 'Pastries',
            'tomato-products': 'Tomato Products', 'pickles-olives': 'Pickles & Olives',
            'preserved-veg': 'Preserved Vegetables', 'jams-spreads': 'Jams & Spreads',
            'wine': 'Wine', 'spirits': 'Spirits', 'coffee': 'Coffee', 'tea': 'Tea',
            'juices-soft': 'Juices & Soft Drinks', 'fresh-fish': 'Fresh Fish', 'canned-fish': 'Canned Fish',
            'shellfish': 'Shellfish', 'smoked-fish': 'Smoked Fish', 'spice-blends': 'Spice Blends',
            'herbs': 'Herbs', 'honey': 'Honey', 'nuts-dried-fruit': 'Nuts & Dried Fruit',
            'chips-crackers': 'Chips & Crackers', 'bars': 'Snack Bars', 'organic': 'Organic',
            'gluten-free': 'Gluten-Free', 'vegan-plant': 'Vegan & Plant-Based', 'frozen': 'Frozen Foods',
            // Legacy keys
            'oils': 'Oils & Vinegars', 'dairy': 'Dairy & Cheese', 'beverages': 'Beverages',
            'snacks': 'Snacks', 'pasta': 'Pasta & Grains', 'canned': 'Canned Goods', 'deli': 'Deli & Meats'
        };
        if (Array.isArray(category)) {
            return category.map(function(c) { return labels[c] || c; }).join(', ');
        }
        return labels[category] || category;
    }

    // ==================== Catalog Extraction ====================

    async function extractCatalog() {
        if (!uploadedFiles.catalog) {
            showToast(t('catalog.uploadRequired') || 'Please upload a catalog file first', 'error');
            return;
        }

        var file = uploadedFiles.catalog;
        var isPdf = file.name.toLowerCase().endsWith('.pdf');

        if (!isPdf) {
            showToast('Currently only PDF files are supported for AI extraction.', 'error');
            return;
        }

        var extractBtn = document.getElementById('extract-btn');
        extractBtn.disabled = true;
        extractBtn.innerHTML = '<span class="spinner"></span> ' + (t('catalog.extracting') || 'Extracting...');

        try {
            // Phase 1: Render PDF pages to images
            var allImages = await renderAllPdfPages(file);

            // Phase 2: Send in batches of 5 pages
            var BATCH_SIZE = 5;
            var totalBatches = Math.ceil(allImages.length / BATCH_SIZE);
            var allProducts = [];

            for (var i = 0; i < totalBatches; i++) {
                updateExtractionProgress('extracting', i + 1, totalBatches);
                var batch = allImages.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
                var result = await sendExtractionBatch(batch, file.name, i, totalBatches);
                if (result.products && result.products.length) {
                    allProducts = allProducts.concat(result.products);
                }
            }

            // Deduplicate by product_name + brand + unit_spec
            var seen = new Set();
            var unique = [];
            for (var j = 0; j < allProducts.length; j++) {
                var p = allProducts[j];
                var name = (p.product_name || p.name || '').toLowerCase().trim();
                var brand = (p.brand || '').toLowerCase().trim();
                var spec = (p.unit_spec || '').toLowerCase().trim();
                var key = name + '|' + brand + '|' + spec;
                if (name && !seen.has(key)) {
                    seen.add(key);
                    unique.push(p);
                }
            }

            // Transform to frontend format — keep full extracted data
            extractedProducts = unique.map(function(p, idx) {
                var cur = p.currency || 'USD';
                var sym = cur === 'EUR' ? '€' : cur === 'KRW' ? '₩' : '$';
                var priceStr = null;
                if (p.unit_price != null) {
                    priceStr = sym + Number(p.unit_price).toFixed(2);
                } else if (p.case_price != null) {
                    priceStr = sym + Number(p.case_price).toFixed(2) + '/cs';
                }

                return Object.assign({}, p, {
                    id: 'e' + (idx + 1),
                    // computed display fields
                    price: priceStr,
                    emoji: getCategoryEmoji(p.category),
                });
            });

            updateExtractionProgress('complete', extractedProducts.length, 0);

            await recordCatalogUpload(file.name, 'product_catalog', file.size, 'processed', extractedProducts.length);
            showToast(extractedProducts.length + ' products extracted successfully!', 'success');
            goToCatalogStep(2);

        } catch (error) {
            console.error('Extraction error:', error);

            // Fallback: demo simulation
            await simulateCatalogExtraction();
            await recordCatalogUpload(file.name, 'product_catalog', file.size, 'processed', extractedProducts.length);
            showToast(t('catalog.extractSuccess') || 'Products extracted (demo mode)', 'success');
            goToCatalogStep(2);
        }

        // Hide progress & restore button
        var progressEl = document.getElementById('extraction-progress');
        if (progressEl) progressEl.style.display = 'none';
        extractBtn.disabled = false;
        extractBtn.innerHTML = '<span data-i18n="catalog.extractProducts">' + (t('catalog.extractProducts') || 'Extract Products') + '</span> <span class="btn-arrow">\u2192</span>';
    }

    // Demo mode fallback
    async function simulateCatalogExtraction() {
        await delay(2000);
        extractedProducts = [
            { id: 'e1', brand: 'Frantoio', product_name: 'Extra Virgin Olive Oil', unit_spec: '500ml', category: 'evoo', unit_price: 7.20, currency: 'USD', price_basis: 'FOB', shelf_life: '18 months', price: '$7.20', emoji: '🫒' },
            { id: 'e2', brand: 'Parmigiano', product_name: 'Aged Parmesan Cheese 12m', unit_spec: '1kg', category: 'aged-cheese', unit_price: 18.00, currency: 'EUR', price_basis: 'EXW', shelf_life: '12 months', price: '€18.00', emoji: '🧀' },
            { id: 'e3', brand: null, product_name: 'Raw Organic Honey', unit_spec: '500g', category: 'honey', unit_price: null, currency: null, price_basis: null, shelf_life: '24 months', price: null, emoji: '🍯' },
            { id: 'e4', brand: 'Acetaia', product_name: 'Balsamic Vinegar', unit_spec: '250ml', category: 'balsamic', unit_price: 12.00, currency: 'USD', price_basis: 'FOB', shelf_life: '3 years', price: '$12.00', emoji: '🍷' },
            { id: 'e5', brand: 'Tartufi', product_name: 'Truffle Oil', unit_spec: '100ml', category: 'truffle-oil', unit_price: 25.00, currency: 'USD', price_basis: 'CIF', shelf_life: null, price: '$25.00', emoji: '🫒' },
            { id: 'e6', brand: 'Pastificio', product_name: 'Artisan Pasta Penne', unit_spec: '500g', category: 'dried-pasta', case_price: 27.00, packing_qty: 12, currency: 'USD', price_basis: 'EXW', shelf_life: '24 months', price: '$27.00/cs', emoji: '🍝' }
        ];
    }

    // ==================== Product Registration ====================

    async function registerExtractedProducts() {
        // Only checked products
        var checkboxes = document.querySelectorAll('.extract-checkbox:checked');
        var selectedIds = new Set();
        checkboxes.forEach(function(cb) { selectedIds.add(cb.getAttribute('data-id')); });

        var toRegister = extractedProducts.filter(function(p) { return selectedIds.has(p.id); });
        if (!toRegister.length) {
            showToast('No products selected for registration.', 'error');
            return 0;
        }

        // Transform to CreateProductDto format
        var dtos = toRegister.map(function(p) {
            return {
                name: p.product_name || p.name || 'Unknown',
                sku: p.barcode || undefined,
                category: p.category || undefined,
                description: p.description || undefined,
                minPrice: p.unit_price ?? undefined,
                maxPrice: p.unit_price ?? undefined,
                certifications: (p.certifications && p.certifications.length) ? p.certifications : undefined,
            };
        });

        try {
            var result = await apiCall('/products/bulk', {
                method: 'POST',
                body: JSON.stringify(dtos),
            });
            return result.count || dtos.length;
        } catch (error) {
            console.error('Bulk registration failed:', error);
            showToast('Failed to register products: ' + error.message, 'error');
            return 0;
        }
    }

    // ==================== Extracted Products Display ====================

    function loadExtractedProducts() {
        var tbody = document.getElementById('extracted-products-tbody');
        var totalEl = document.getElementById('extracted-total');

        if (!extractedProducts.length) {
            if (tbody) tbody.innerHTML = renderEmptyRow(8, 'No products extracted yet.');
            return;
        }

        totalEl.textContent = extractedProducts.length;

        var m = '<span class="wd-text-muted">-</span>';
        tbody.innerHTML = extractedProducts.map(function(product) {
            var name = product.product_name || product.name || 'Unknown';
            return '<tr>' +
                '<td class="col-checkbox"><input type="checkbox" class="extract-checkbox" data-id="' + product.id + '" onchange="updateSelectedCount()" checked></td>' +
                '<td>' +
                    '<div class="wd-product-cell">' +
                        '<span class="wd-product-thumb">' + product.emoji + '</span>' +
                        '<span class="wd-product-name">' + escapeHtml(name) + '</span>' +
                    '</div>' +
                '</td>' +
                '<td>' + (product.unit_spec || m) + '</td>' +
                '<td>' + (product.brand || m) + '</td>' +
                '<td>' +
                    (product.category
                        ? '<span class="wd-badge wd-badge-outline">' + getCategoryLabel(product.category) + '</span>'
                        : m
                    ) +
                '</td>' +
                '<td>' + (product.price || m) + '</td>' +
                '<td>' + (product.price_basis ? '<span class="wd-badge wd-badge-outline">' + product.price_basis + '</span>' : m) + '</td>' +
                '<td>' + (product.shelf_life || m) + '</td>' +
                '</tr>';
        }).join('');

        // Initial select count (all checked)
        updateSelectedCount();
    }

    // ==================== Complete Summary ====================

    function showCompleteSummary(registeredCount) {
        var total = registeredCount ?? extractedProducts.length;
        document.getElementById('registered-count').textContent = total;

        if (registeredCount > 0) {
            showToast(registeredCount + ' products registered to your catalog!', 'success');
        }
    }

    function startNewCatalog() {
        extractedProducts = [];
        uploadedFiles.catalog = null;

        removeFile('catalog');

        // Go to step 1
        currentCatalogStep = 1;
        for (var i = 1; i <= 3; i++) {
            var stepEl = document.getElementById('catalog-step-' + i);
            if (stepEl) stepEl.style.display = i === 1 ? 'block' : 'none';
            var indicator = document.getElementById('step-indicator-' + i);
            if (indicator) {
                indicator.classList.remove('active', 'completed');
                if (i === 1) indicator.classList.add('active');
            }
        }

        // Reset connectors
        for (var j = 1; j <= 2; j++) {
            var connector = document.getElementById('connector-' + j);
            if (connector) connector.classList.remove('completed');
        }

        document.getElementById('extract-btn').disabled = true;
    }

    // ==================== Upload History ====================

    async function loadUploadHistory() {
        var tbody = document.getElementById('upload-history-tbody');
        if (!tbody) return;

        try {
            var data = await apiCall('/catalog-uploads');
            renderUploadHistory(data.uploads || []);
        } catch (error) {
            // Table may not exist yet — fail silently
            if (tbody) tbody.innerHTML = renderEmptyRow(6, 'No upload history yet.');
        }
    }

    function renderUploadHistory(uploads) {
        var tbody = document.getElementById('upload-history-tbody');
        if (!tbody) return;

        if (!uploads.length) {
            tbody.innerHTML = renderEmptyRow(6, 'No upload history yet.');
            return;
        }

        tbody.innerHTML = uploads.map(function(upload) {
            var date = new Date(upload.created_at);
            var dateStr = date.getFullYear() + '.' + String(date.getMonth() + 1).padStart(2, '0') + '.' + String(date.getDate()).padStart(2, '0');

            var typeBadge = upload.file_type === 'price_list'
                ? '<span class="wd-badge wd-badge-success">Price List</span>'
                : '<span class="wd-badge wd-badge-info">Product Catalog</span>';

            var statusMap = {
                pending: '<span class="wd-badge wd-badge-warning">Pending</span>',
                processing: '<span class="wd-badge wd-badge-info">Processing</span>',
                processed: '<span class="wd-badge wd-badge-success">Processed</span>',
                matched: '<span class="wd-badge wd-badge-success">Matched</span>',
                failed: '<span class="wd-badge wd-badge-danger">Failed</span>',
            };
            var statusBadge = statusMap[upload.status] || ('<span class="wd-badge wd-badge-gray">' + escapeHtml(upload.status) + '</span>');

            var productsText = upload.products_extracted > 0
                ? upload.products_extracted + ' extracted'
                : '-';

            return '<tr>' +
                '<td>' +
                    '<div style="display: flex; align-items: center; gap: 8px;">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                        escapeHtml(upload.file_name) +
                    '</div>' +
                '</td>' +
                '<td>' + typeBadge + '</td>' +
                '<td>' + dateStr + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + productsText + '</td>' +
                '<td>' +
                    '<button class="wd-btn wd-btn-outline wd-btn-sm" onclick="deleteUploadHistory(\'' + upload.id + '\')" title="Delete" style="color:#ef4444;">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                    '</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    async function recordCatalogUpload(fileName, fileType, fileSize, status, productsExtracted) {
        try {
            await apiCall('/catalog-uploads', {
                method: 'POST',
                body: JSON.stringify({ fileName: fileName, fileType: fileType, fileSize: fileSize, status: status, productsExtracted: productsExtracted })
            });
        } catch (error) {
            console.error('Failed to record catalog upload:', error);
        }
    }

    async function deleteUploadHistory(id) {
        if (!confirm('Delete this upload record?')) return;

        try {
            await apiCall('/catalog-uploads/' + id, { method: 'DELETE' });
            showToast('Upload record deleted', 'success');
            loadUploadHistory();
        } catch (error) {
            console.error('Failed to delete upload record:', error);
            showToast('Failed to delete upload record', 'error');
        }
    }

    // ==================== Catalog Extraction Polling ====================

    async function pollCatalogExtraction() {
        if (!currentJobId) return;

        var completed = false;
        while (!completed) {
            try {
                var status = await apiCall('/upload/status/' + currentJobId);

                if (status.status === 'complete') {
                    completed = true;
                    extractedProducts = status.products || [];
                } else if (status.status === 'error') {
                    throw new Error(status.errors?.[0] || 'Extraction failed');
                }

                await delay(1000);
            } catch (error) {
                throw error;
            }
        }
    }

    // ==================== Price List Matching ====================

    async function processPriceListMatching() {
        showToast(t('catalog.matchingPrices') || 'Matching prices...', 'info');

        try {
            // API call attempt
            var result = await uploadFile('/upload/pricelist', uploadedFiles.pricelist);
            priceMatchedProducts = result.matched || [];

            // Overwrite prices from API result
            priceMatchedProducts.forEach(function(matched) {
                var product = extractedProducts.find(function(p) { return p.id === matched.id; });
                if (product && matched.price) {
                    product.price = matched.price;
                }
            });
        } catch (error) {
            // Demo mode: simulation — change some prices
            await delay(1500);

            var demoPriceList = [
                { id: 'e1', price: '$7.50' },
                { id: 'e2', price: '$19.00' },
                { id: 'e3', price: '$12.00' },
                { id: 'e4', price: '$14.00' },
            ];

            priceMatchedProducts = demoPriceList;

            // Overwrite prices
            demoPriceList.forEach(function(priceItem) {
                var product = extractedProducts.find(function(p) { return p.id === priceItem.id; });
                if (product) {
                    product.price = priceItem.price;
                }
            });
        }

        // UI update — hide upload area and show uploaded info
        document.getElementById('pricelist-upload-area').style.display = 'none';
        document.getElementById('pricelist-uploaded-area').style.display = 'flex';
        document.getElementById('pricelist-filename').textContent = uploadedFiles.pricelist?.name || 'price_list.xlsx';
        document.getElementById('price-matched-count').textContent = priceMatchedProducts.length;
        document.getElementById('price-total-count').textContent = extractedProducts.length;

        // Render matching table
        renderPriceMatchTable();

        // Record price list upload to history
        var plFile = uploadedFiles.pricelist;
        if (plFile) {
            await recordCatalogUpload(plFile.name, 'price_list', plFile.size, 'matched', priceMatchedProducts.length);
        }

        showToast(t('catalog.pricesMatched') || 'Prices matched and updated!', 'success');
    }

    function renderPriceMatchTable() {
        var tbody = document.getElementById('price-match-tbody');
        if (!tbody) return;

        var hasPriceList = priceMatchedProducts.length > 0;

        tbody.innerHTML = extractedProducts.map(function(product) {
            var matched = priceMatchedProducts.find(function(m) { return m.id === product.id; });
            var originalPrice = product.originalPrice;
            var newPrice = matched ? product.price : null;
            var priceChanged = matched && originalPrice !== newPrice;
            var needsFillIn = !product.category || (!originalPrice && !newPrice);

            return '<tr class="' + (needsFillIn ? 'wd-row-warning' : '') + '">' +
                '<td class="col-checkbox"></td>' +
                '<td>' +
                    '<div class="wd-product-cell">' +
                        '<span class="wd-product-thumb">' + product.emoji + '</span>' +
                        '<span class="wd-product-name">' + product.name + '</span>' +
                    '</div>' +
                '</td>' +
                '<td>' +
                    (product.category
                        ? '<span class="wd-badge wd-badge-outline">' + getCategoryLabel(product.category) + '</span>'
                        : '<span class="wd-badge wd-badge-warning">' + (t('products.missing') || 'Missing') + '</span>'
                    ) +
                '</td>' +
                '<td>' + (originalPrice || '<span class="wd-text-muted">-</span>') + '</td>' +
                '<td class="' + (priceChanged ? 'wd-price-updated' : '') + '">' +
                    (hasPriceList
                        ? (newPrice || '<span class="wd-text-muted">-</span>')
                        : '<span class="wd-text-muted">-</span>'
                    ) +
                '</td>' +
                '<td>' +
                    '<button class="wd-btn wd-btn-sm ' + (needsFillIn ? 'wd-btn-warning' : 'wd-btn-outline') + '"' +
                            ' onclick="editProductPrice(\'' + product.id + '\')">' +
                        (needsFillIn ? (t('products.fillIn') || 'Fill in') : (t('products.edit') || 'Edit')) +
                    '</button>' +
                '</td>' +
                '</tr>';
        }).join('');
    }

    function editProductPrice(productId) {
        window.location.href = 'product-edit.html?id=' + productId;
    }

    // ==================== Bridge to window for HTML onclick ====================

    // File upload
    window.handleFileSelect = handleFileSelect;
    window.removeFile = removeFile;
    window.handleDragOver = handleDragOver;
    window.handleDragLeave = handleDragLeave;
    window.handleDrop = handleDrop;
    window.showUploadedFile = showUploadedFile;
    window.updateCertList = updateCertList;
    window.removeCert = removeCert;

    // File processing
    window.processUploads = processUploads;
    window.updateProcessingStep = updateProcessingStep;
    window.pollProcessingStatus = pollProcessingStatus;
    window.getStepMessage = getStepMessage;

    // Extracted products
    window.updateSelectedCount = updateSelectedCount;
    window.toggleSelectAllExtracted = toggleSelectAllExtracted;
    window.selectAllExtracted = selectAllExtracted;
    window.moveToProductList = moveToProductList;
    window.editExtractedProduct = editExtractedProduct;
    window.saveExtractedProductFromModal = saveExtractedProductFromModal;

    // Catalog steps
    window.goToCatalogStep = goToCatalogStep;
    window.extractCatalog = extractCatalog;

    // Category helpers
    window.getCategoryEmoji = getCategoryEmoji;
    window.getCategoryLabel = getCategoryLabel;

    // Registration & display
    window.registerExtractedProducts = registerExtractedProducts;
    window.loadExtractedProducts = loadExtractedProducts;
    window.showCompleteSummary = showCompleteSummary;
    window.startNewCatalog = startNewCatalog;

    // Upload history
    window.loadUploadHistory = loadUploadHistory;
    window.deleteUploadHistory = deleteUploadHistory;

    // Price matching
    window.editProductPrice = editProductPrice;

})();

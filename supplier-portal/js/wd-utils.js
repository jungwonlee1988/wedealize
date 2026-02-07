// WeDealize - Shared Utilities
(function() {
    'use strict';

    // === Constants ===
    var API_TIMEOUT = 15000;

    // Toast styles are in design-system.css (.wd-toast)

    // === Session Management ===

    window.handleSessionExpired = function() {
        removeFlashGuard();
        showToast('Session expired. Please log in again.', 'error');
        localStorage.removeItem('supplier_logged_in');
        localStorage.removeItem('supplier_token');
        localStorage.removeItem('supplier_id');
        localStorage.removeItem('supplier_email');
        localStorage.removeItem('supplier_name');
        setTimeout(function() {
            window.location.href = 'portal.html';
        }, 1500);
    };

    window.removeFlashGuard = function removeFlashGuard() {
        var g = document.getElementById('flash-guard');
        if (g) g.remove();
    };

    // === API Helpers ===

    window.apiCall = async function(endpoint, options) {
        options = options || {};
        var token = localStorage.getItem('supplier_token');
        var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers);

        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        var controller = new AbortController();
        var timeoutMs = options.timeout || API_TIMEOUT;
        var timeoutId = setTimeout(function() { controller.abort(); }, timeoutMs);

        try {
            var response = await fetch(API_BASE_URL + endpoint, Object.assign({}, options, {
                headers: headers,
                signal: controller.signal
            }));

            clearTimeout(timeoutId);

            if (response.status === 401) {
                handleSessionExpired();
                throw new Error('Session expired');
            }

            if (!response.ok) {
                var error = await response.json().catch(function() { return {}; });
                throw new Error(error.message || error.detail || 'API request failed');
            }

            if (response.status === 204) return null;
            var text = await response.text();
            return text ? JSON.parse(text) : null;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('API Error:', error);
            throw error;
        }
    };

    window.uploadFile = async function(endpoint, file, additionalData) {
        additionalData = additionalData || {};
        var token = localStorage.getItem('supplier_token');
        var formData = new FormData();
        formData.append('file', file);
        formData.append('supplier_id', localStorage.getItem('supplier_id') || '1');

        for (var key in additionalData) {
            formData.append(key, additionalData[key]);
        }

        var headers = {};
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        var response = await fetch(API_BASE_URL + endpoint, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (!response.ok) {
            var error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }

        return await response.json();
    };

    // === Toast Notifications ===

    var _toastTimer = null;
    var _toastProtectedUntil = 0;

    window.showToast = function(message, type) {
        type = type || 'success';
        var now = Date.now();

        var existing = document.querySelector('.wd-toast');
        if (existing && now < _toastProtectedUntil) return;
        if (existing) existing.remove();
        if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }

        var icons = { success: '\u2713', error: '\u2717', warning: '\u26A0', info: '\u2139' };
        var duration = (type === 'error' || type === 'warning') ? 5000 : 3000;

        var toast = document.createElement('div');
        toast.className = 'wd-toast wd-toast-' + type;
        toast.innerHTML = '<span class="wd-toast-icon">' + (icons[type] || icons.success) + '</span>' +
            '<span class="wd-toast-message">' + message + '</span>' +
            '<button class="wd-toast-close">\u00D7</button>';

        function dismissToast() {
            _toastProtectedUntil = 0;
            if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
            toast.classList.add('wd-toast-out');
            setTimeout(function() { toast.remove(); }, 300);
        }

        toast.querySelector('.wd-toast-close').addEventListener('click', dismissToast);
        document.body.appendChild(toast);

        if (type === 'error' || type === 'warning') {
            _toastProtectedUntil = now + 2000;
        }

        _toastTimer = setTimeout(dismissToast, duration);
    };

    // === HTML/Text Utilities ===

    window.escapeHtml = function(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    window.setTextById = function(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    window.setStyleById = function(id, prop, val) {
        var el = document.getElementById(id);
        if (el) el.style[prop] = val;
    };

    window.delay = function(ms) {
        return new Promise(function(resolve) { setTimeout(resolve, ms); });
    };

    window.getTimeAgo = function(dateStr) {
        if (!dateStr) return 'N/A';
        var diff = Date.now() - new Date(dateStr).getTime();
        var minutes = Math.floor(diff / 60000);
        if (minutes < 60) return minutes <= 1 ? 'Just now' : minutes + ' minutes ago';
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
        var days = Math.floor(hours / 24);
        return days + ' day' + (days > 1 ? 's' : '') + ' ago';
    };

    // === CSV Utilities ===

    window.escapeCsvField = function(field) {
        if (field === null || field === undefined) return '';
        var str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    };

    window.parsePriceRange = function(priceStr) {
        if (!priceStr) return { minPrice: '', maxPrice: '' };
        var str = String(priceStr).trim();
        var rangeMatch = str.match(/\$?\s*([\d,.]+)\s*[-~]\s*\$?\s*([\d,.]+)/);
        if (rangeMatch) {
            return { minPrice: rangeMatch[1].replace(/,/g, ''), maxPrice: rangeMatch[2].replace(/,/g, '') };
        }
        var singleMatch = str.match(/\$?\s*([\d,.]+)/);
        if (singleMatch) {
            var price = singleMatch[1].replace(/,/g, '');
            return { minPrice: price, maxPrice: price };
        }
        return { minPrice: '', maxPrice: '' };
    };

    // === Design System Utilities ===

    window.wdFormatDate = function(dateStr, format) {
        format = format || 'short';
        if (!dateStr) return '-';
        var d = new Date(dateStr);
        if (isNaN(d.getTime())) return '-';
        if (format === 'iso') return d.toISOString().slice(0, 10);
        if (format === 'long') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    window.wdFormatCurrency = function(amount, currency) {
        currency = currency || 'USD';
        var num = parseFloat(amount);
        if (isNaN(num)) return '-';
        return currency + ' ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    window.renderBadge = function(text, type) {
        type = type || 'outline';
        if (!text) return '';
        return '<span class="wd-badge wd-badge-' + escapeHtml(type) + '">' + escapeHtml(text) + '</span>';
    };

    window.renderEmptyRow = function(colspan, message) {
        return '<tr><td colspan="' + colspan + '" class="wd-table-empty">' + message + '</td></tr>';
    };

    window.renderCellGroup = function(primary, secondary, thumbHtml) {
        return '<div class="wd-cell-group">' +
            (thumbHtml ? '<div class="wd-cell-thumb">' + thumbHtml + '</div>' : '') +
            '<div><span class="wd-cell-primary">' + escapeHtml(primary) + '</span>' +
            (secondary ? '<div class="wd-cell-secondary">' + escapeHtml(secondary) + '</div>' : '') +
            '</div></div>';
    };

    window.getStatusBadgeClass = function(status) {
        var map = {
            draft: 'wd-badge-secondary', pending: 'wd-badge-warning', confirmed: 'wd-badge-success',
            shipping: 'wd-badge-info', delivered: 'wd-badge-success', cancelled: 'wd-badge-danger',
            sent: 'wd-badge-primary', paid: 'wd-badge-success', overdue: 'wd-badge-danger',
            approved: 'wd-badge-success', used: 'wd-badge-primary',
            active: 'wd-badge-success', inactive: 'wd-badge-secondary',
            complete: 'wd-badge-success', incomplete: 'wd-badge-warning',
            valid: 'wd-badge-success', expired: 'wd-badge-danger'
        };
        return map[status] || 'wd-badge-outline';
    };

})();

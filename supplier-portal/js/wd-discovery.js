// WeDealize - Buyer Discovery
(function() {
    'use strict';

    // === Public API ===

    window.switchBuyerTab = function(tab) {
        document.getElementById('tab-inquired')?.classList.toggle('active', tab === 'inquired');
        document.getElementById('tab-potential')?.classList.toggle('active', tab === 'potential');

        var inquiredPanel = document.getElementById('buyer-tab-inquired');
        var potentialPanel = document.getElementById('buyer-tab-potential');
        if (inquiredPanel) inquiredPanel.style.display = tab === 'inquired' ? 'block' : 'none';
        if (potentialPanel) potentialPanel.style.display = tab === 'potential' ? 'block' : 'none';

        if (tab === 'inquired') {
            loadInquiredBuyers();
        }
    };

    window.loadInquiredBuyers = async function() {
        var container = document.getElementById('inquired-buyers-list');
        if (!container) return;

        container.innerHTML = '<p class="wd-loading-message">Loading...</p>';

        try {
            var data = await apiCall('/inquiries');
            renderInquiredBuyers(data.inquiries || []);
        } catch (error) {
            console.error('Failed to load inquiries:', error);
            container.innerHTML = '<p class="wd-loading-message">Failed to load inquiries. Please try again.</p>';
        }
    };

    function renderInquiredBuyers(inquiries) {
        var container = document.getElementById('inquired-buyers-list');
        if (!container) return;

        if (!inquiries || inquiries.length === 0) {
            container.innerHTML = '<div class="wd-empty-block">' +
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                '<p>No inquiries yet</p>' +
                '<p>Buyer inquiries will appear here when buyers contact you.</p></div>';
            return;
        }

        container.innerHTML = inquiries.map(function(inquiry) {
            var statusBadge = getInquiryStatusBadge(inquiry.status);
            var productNames = (inquiry.products || []).map(function(p) { return p.name; }).join(', ') || 'N/A';
            var timeAgo = getTimeAgo(inquiry.created_at);

            return '<div class="wd-discovery-card" data-inquiry-id="' + inquiry.id + '">' +
                '<div class="wd-discovery-header">' +
                '<div class="wd-discovery-company">' +
                '<h4 class="wd-discovery-name">' + escapeHtml(inquiry.buyer_company) + '</h4>' +
                (inquiry.buyer_country ? '<span class="wd-discovery-country">' + escapeHtml(inquiry.buyer_country) + '</span>' : '') +
                '</div>' +
                '<div class="wd-flex wd-items-center wd-gap-2">' +
                statusBadge +
                '<select class="wd-input wd-select-inline" onchange="updateInquiryStatus(\'' + inquiry.id + '\', this.value)">' +
                '<option value="active" ' + (inquiry.status === 'active' ? 'selected' : '') + '>Active</option>' +
                '<option value="responded" ' + (inquiry.status === 'responded' ? 'selected' : '') + '>Responded</option>' +
                '<option value="closed" ' + (inquiry.status === 'closed' ? 'selected' : '') + '>Closed</option>' +
                '</select></div></div>' +
                '<div class="wd-discovery-body">' +
                '<div class="wd-discovery-info-grid">' +
                '<div class="wd-discovery-info"><span class="wd-discovery-label">Contact</span><span class="wd-discovery-value">' + escapeHtml(inquiry.buyer_contact || 'N/A') + '</span></div>' +
                '<div class="wd-discovery-info"><span class="wd-discovery-label">Email</span><span class="wd-discovery-value">' + escapeHtml(inquiry.buyer_email || 'N/A') + '</span></div>' +
                '<div class="wd-discovery-info"><span class="wd-discovery-label">Interested In</span><span class="wd-discovery-value">' + escapeHtml(productNames) + '</span></div>' +
                '<div class="wd-discovery-info"><span class="wd-discovery-label">Created</span><span class="wd-discovery-value">' + timeAgo + '</span></div>' +
                '</div>' +
                (inquiry.message ? '<p class="wd-inquiry-message">' + escapeHtml(inquiry.message) + '</p>' : '') +
                '</div>' +
                '<div class="wd-discovery-footer">' +
                '<button class="wd-btn wd-btn-outline wd-btn-sm" onclick="deleteInquiry(\'' + inquiry.id + '\')">Delete</button>' +
                '<button class="wd-btn wd-btn-primary wd-btn-sm" onclick="viewInquiryDetail(\'' + inquiry.id + '\')">View Details</button>' +
                '</div></div>';
        }).join('');
    }

    function getInquiryStatusBadge(status) {
        var map = {
            active: '<span class="wd-badge wd-badge-success">Active</span>',
            responded: '<span class="wd-badge wd-badge-info">Responded</span>',
            closed: '<span class="wd-badge wd-badge-warning">Closed</span>'
        };
        return map[status] || '<span class="wd-badge">' + (status || 'Unknown') + '</span>';
    }

    window.updateInquiryStatus = async function(inquiryId, status) {
        try {
            await apiCall('/inquiries/' + inquiryId, {
                method: 'PATCH',
                body: JSON.stringify({ status: status })
            });
            showToast('Inquiry status updated to ' + status, 'success');
            loadInquiredBuyers();
        } catch (error) {
            console.error('Failed to update inquiry status:', error);
            showToast('Failed to update status', 'error');
        }
    };

    window.deleteInquiry = async function(inquiryId) {
        if (!confirm('Are you sure you want to delete this inquiry?')) return;
        try {
            await apiCall('/inquiries/' + inquiryId, { method: 'DELETE' });
            showToast('Inquiry deleted', 'success');
            loadInquiredBuyers();
        } catch (error) {
            console.error('Failed to delete inquiry:', error);
            showToast('Failed to delete inquiry', 'error');
        }
    };

    window.viewInquiryDetail = function(inquiryId) {
        showToast('Inquiry detail view coming soon', 'info');
    };

    window.showSubscriptionModal = function() {
        showToast('Premium subscription coming soon!', 'info');
    };

})();

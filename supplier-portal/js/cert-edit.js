// WeDealize Supplier Portal - Certification Edit Page Script
// Handles both new certification creation and existing certification detail view/edit

(function() {
    'use strict';

    const API_BASE_URL = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
    let currentCertId = null;
    let isNewMode = false;
    let currentCertData = null;

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const token = localStorage.getItem('supplier_token');
        if (!token) {
            window.location.href = 'portal.html';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        currentCertId = urlParams.get('id');
        isNewMode = !currentCertId || currentCertId === 'new';

        if (isNewMode) {
            setupNewMode();
        } else {
            setupDetailMode();
            loadCertData(currentCertId);
        }

        bindFormEvents();
    }

    function setupNewMode() {
        document.body.classList.remove('detail-mode');
        document.body.classList.add('new-mode');
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = 'Add Certification';
    }

    function setupDetailMode() {
        document.body.classList.remove('new-mode');
        document.body.classList.add('detail-mode');
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = 'Certification Detail';
        // Always editable - no view-mode
        const formContainer = document.getElementById('cert-form-container');
        if (formContainer) formContainer.classList.add('edit-mode');
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) saveBtn.style.display = 'inline-flex';
    }

    function bindFormEvents() {
        const form = document.getElementById('cert-edit-form');
        if (form) form.addEventListener('submit', handleFormSubmit);

        const fileInput = document.getElementById('cert-file-input');
        if (fileInput) fileInput.addEventListener('change', handleFileSelect);
    }

    // ---- Data Loading ----

    async function loadCertData(certId) {
        try {
            const token = localStorage.getItem('supplier_token');
            const response = await fetch(`${API_BASE_URL}/certifications/${certId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                handleSessionExpired();
                return;
            }

            if (response.ok) {
                const cert = await response.json();
                currentCertData = cert;
                populateForm(cert);
                loadRenewalHistory(certId);
                return;
            }
        } catch (error) {
            console.log('API single-cert fetch failed, trying list fallback');
        }

        // Fallback: load all and filter
        try {
            const token = localStorage.getItem('supplier_token');
            const res = await fetch(`${API_BASE_URL}/certifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const { certifications } = await res.json();
                const cert = certifications.find(c => c.id === certId);
                if (cert) {
                    currentCertData = cert;
                    populateForm(cert);
                    loadRenewalHistory(certId);
                    return;
                }
            }
        } catch (e) {
            console.error('Fallback load failed:', e);
        }

        showToast('Certification not found', 'error');
    }

    function populateForm(cert) {
        // Status bar
        const numberDisplay = document.getElementById('cert-number-display');
        if (numberDisplay) numberDisplay.textContent = cert.certificate_number || cert.name || '-';

        const statusBadge = document.getElementById('cert-status-badge');
        if (statusBadge) {
            const s = cert.status || 'valid';
            const map = { valid: 'wd-badge-success', expired: 'wd-badge-danger', pending: 'wd-badge-warning' };
            statusBadge.textContent = s.charAt(0).toUpperCase() + s.slice(1);
            statusBadge.className = `wd-badge ${map[s] || 'wd-badge-secondary'}`;
        }

        const dateDisplay = document.getElementById('cert-date-display');
        if (dateDisplay && cert.updated_at) {
            dateDisplay.textContent = `Updated: ${new Date(cert.updated_at).toLocaleDateString()}`;
        }

        // Form fields
        setVal('cert-name', cert.name);
        setVal('cert-number', cert.certificate_number);
        setVal('cert-issuer', cert.issuer);
        setVal('cert-status', cert.status || 'valid');
        setVal('cert-issue-date', cert.issue_date);
        setVal('cert-expiry-date', cert.expiry_date);
        setVal('cert-document-url', cert.document_url);
    }

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    }

    function collectFormData() {
        return {
            name: document.getElementById('cert-name')?.value?.trim() || '',
            certificateNumber: document.getElementById('cert-number')?.value?.trim() || '',
            issuer: document.getElementById('cert-issuer')?.value?.trim() || '',
            status: document.getElementById('cert-status')?.value || 'valid',
            issueDate: document.getElementById('cert-issue-date')?.value || '',
            expiryDate: document.getElementById('cert-expiry-date')?.value || '',
            documentUrl: document.getElementById('cert-document-url')?.value?.trim() || '',
        };
    }

    // ---- Create / Update / Delete ----

    async function handleFormSubmit(e) {
        e.preventDefault();
        const formData = collectFormData();
        if (!formData.name) {
            showToast('Certification name is required', 'warning');
            return;
        }

        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) { submitBtn.innerHTML = '<span class="spinner"></span> Saving...'; submitBtn.disabled = true; }

        try {
            const token = localStorage.getItem('supplier_token');
            const res = await fetch(`${API_BASE_URL}/certifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });

            if (res.status === 401) { handleSessionExpired(); return; }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to create certification');
            }

            showToast('Certification created!', 'success');
            setTimeout(() => { window.location.href = 'portal.html#profile'; }, 1000);
        } catch (error) {
            console.error('Save error:', error);
            showToast(error.message || 'Failed to save', 'error');
            if (submitBtn) { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }
        }
    }

    window.saveCertChanges = async function() {
        const formData = collectFormData();
        if (!formData.name) {
            showToast('Certification name is required', 'warning');
            return;
        }

        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn ? saveBtn.innerHTML : '';
        if (saveBtn) { saveBtn.innerHTML = '<span class="spinner"></span> Saving...'; saveBtn.disabled = true; }

        try {
            const token = localStorage.getItem('supplier_token');
            const res = await fetch(`${API_BASE_URL}/certifications/${currentCertId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });

            if (res.status === 401) { handleSessionExpired(); return; }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to update certification');
            }

            const updated = await res.json();
            currentCertData = updated;
            populateForm(updated);
            showToast('Certification updated!', 'success');

            // Switch back to view mode
            const toggle = document.getElementById('edit-mode-toggle');
            if (toggle) { toggle.checked = false; toggleEditMode(); }
        } catch (error) {
            console.error('Update error:', error);
            showToast(error.message || 'Failed to update', 'error');
        } finally {
            if (saveBtn) { saveBtn.innerHTML = originalText; saveBtn.disabled = false; }
        }
    };

    window.deleteCert = async function() {
        if (!confirm('Are you sure you want to delete this certification?')) return;

        try {
            const token = localStorage.getItem('supplier_token');
            const res = await fetch(`${API_BASE_URL}/certifications/${currentCertId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) { handleSessionExpired(); return; }
            if (!res.ok) throw new Error('Failed to delete certification');

            showToast('Certification deleted', 'success');
            setTimeout(() => { window.location.href = 'portal.html#profile'; }, 1000);
        } catch (error) {
            console.error('Delete error:', error);
            showToast(error.message || 'Failed to delete', 'error');
        }
    };

    // ---- Edit Mode Toggle ----


    // ---- Renewal History ----

    async function loadRenewalHistory(certId) {
        const container = document.getElementById('renewal-history');
        if (!container) return;

        try {
            const token = localStorage.getItem('supplier_token');
            const res = await fetch(`${API_BASE_URL}/certifications/${certId}/renewals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to load renewals');
            const { renewals } = await res.json();
            renderRenewalHistory(renewals || []);
        } catch (error) {
            console.log('Failed to load renewal history:', error);
            container.innerHTML = '<div class="renewal-empty">No renewal history</div>';
        }
    }

    function renderRenewalHistory(renewals) {
        const container = document.getElementById('renewal-history');
        if (!container) return;

        if (!renewals.length) {
            container.innerHTML = '<div class="renewal-empty">No renewal history</div>';
            return;
        }

        container.innerHTML = `
            <table class="renewal-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Previous Expiry</th>
                        <th>New Expiry</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${renewals.map(r => `
                        <tr>
                            <td>${r.renewed_at ? new Date(r.renewed_at).toLocaleDateString() : '-'}</td>
                            <td>${r.previous_expiry_date || '-'}</td>
                            <td>${r.new_expiry_date || '-'}</td>
                            <td>${escapeHtml(r.notes || '-')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // ---- Renewal Modal ----

    window.openRenewalModal = function() {
        const modal = document.getElementById('renewal-modal');
        if (!modal) return;

        // Pre-fill current expiry
        const currentExpiry = currentCertData?.expiry_date || '';
        document.getElementById('renewal-current-expiry').value = currentExpiry;

        // Default new expiry = current expiry + 1 year
        if (currentExpiry) {
            const d = new Date(currentExpiry);
            d.setFullYear(d.getFullYear() + 1);
            document.getElementById('renewal-new-expiry').value = d.toISOString().split('T')[0];
        } else {
            document.getElementById('renewal-new-expiry').value = '';
        }

        document.getElementById('renewal-notes').value = '';
        modal.style.display = 'flex';
    };

    window.closeRenewalModal = function() {
        const modal = document.getElementById('renewal-modal');
        if (modal) modal.style.display = 'none';
    };

    window.saveRenewal = async function() {
        const newExpiry = document.getElementById('renewal-new-expiry')?.value;
        if (!newExpiry) {
            showToast('New expiry date is required', 'warning');
            return;
        }

        try {
            const token = localStorage.getItem('supplier_token');
            const res = await fetch(`${API_BASE_URL}/certifications/${currentCertId}/renewals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    newExpiryDate: newExpiry,
                    notes: document.getElementById('renewal-notes')?.value?.trim() || ''
                })
            });

            if (res.status === 401) { handleSessionExpired(); return; }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to create renewal');
            }

            showToast('Certification renewed!', 'success');
            closeRenewalModal();

            // Reload cert data and renewal history
            loadCertData(currentCertId);
        } catch (error) {
            console.error('Renewal error:', error);
            showToast(error.message || 'Failed to renew', 'error');
        }
    };

    // ---- File Upload UI ----

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showToast('File must be less than 10MB', 'warning');
            return;
        }

        const fileList = document.getElementById('file-list');
        if (fileList) {
            fileList.innerHTML = `
                <div class="file-item">
                    <span class="file-item-name">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        ${escapeHtml(file.name)}
                    </span>
                    <button type="button" class="wd-btn wd-btn-sm wd-btn-outline" onclick="removeFile()" style="padding:2px 6px; color:#ef4444;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            `;
        }

        // Hide upload area text
        const uploadArea = document.getElementById('file-upload-area');
        if (uploadArea) uploadArea.style.display = 'none';
    }

    window.removeFile = function() {
        const fileInput = document.getElementById('cert-file-input');
        if (fileInput) fileInput.value = '';
        const fileList = document.getElementById('file-list');
        if (fileList) fileList.innerHTML = '';
        const uploadArea = document.getElementById('file-upload-area');
        if (uploadArea) uploadArea.style.display = '';
    };

})();

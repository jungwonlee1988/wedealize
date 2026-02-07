// WeDealize - Settings & Team Management
(function() {
    'use strict';

    // === Settings Tabs ===

    window.switchSettingsTab = function(tabName) {
        var tabContainer = document.querySelector('#panel-settings .wd-tabs');
        if (tabContainer) {
            tabContainer.querySelectorAll('.wd-tab').forEach(function(tab) {
                tab.classList.remove('active');
                if (tab.getAttribute('onclick')?.includes(tabName)) {
                    tab.classList.add('active');
                }
            });
        }
        var panels = document.querySelectorAll('[id^="settings-"][id$="-panel"]');
        panels.forEach(function(panel) {
            panel.classList.remove('active');
            if (panel.id === 'settings-' + tabName + '-panel') {
                panel.classList.add('active');
            }
        });
    };

    // === Team Management ===

    window.loadTeamMembers = async function() {
        var tbody = document.getElementById('team-members-tbody');
        if (!tbody) return;

        var ownerName = localStorage.getItem('user_name') || 'Owner';
        var ownerEmail = localStorage.getItem('user_email') || '';
        var ownerInitials = ownerName.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);

        var rows = '<tr>' +
            '<td><div class="wd-member-cell">' +
            '<div class="wd-member-avatar">' + escapeHtml(ownerInitials) + '</div>' +
            '<div class="wd-member-info">' +
            '<span class="wd-member-name">' + escapeHtml(ownerName) + '</span>' +
            '<span class="wd-member-email">' + escapeHtml(ownerEmail) + '</span>' +
            '</div></div></td>' +
            '<td><span class="wd-badge wd-badge-primary">Owner</span></td>' +
            '<td><span class="wd-badge wd-badge-success">Active</span></td>' +
            '<td>-</td><td>-</td></tr>';

        try {
            var members = await apiCall('/team/members');
            var memberList = Array.isArray(members) ? members : [];

            memberList.forEach(function(m) {
                var name = m.name || m.email.split('@')[0];
                var initials = name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
                var isActive = m.status === 'active';
                var isPending = m.status === 'pending';

                // Role: active members get dropdown, pending gets static badge
                var roleCell = '';
                if (isActive) {
                    roleCell = '<select class="wd-select wd-select-sm" style="width:120px" onchange="updateMemberRole(\'' + m.id + '\', this.value)">' +
                        '<option value="admin" ' + (m.role === 'admin' ? 'selected' : '') + '>Admin</option>' +
                        '<option value="member" ' + (m.role === 'member' ? 'selected' : '') + '>Member</option>' +
                        '<option value="viewer" ' + (m.role === 'viewer' ? 'selected' : '') + '>Viewer</option>' +
                        '</select>';
                } else {
                    roleCell = m.role === 'admin'
                        ? '<span class="wd-badge wd-badge-secondary">Admin</span>'
                        : m.role === 'viewer'
                            ? '<span class="wd-badge wd-badge-outline">Viewer</span>'
                            : '<span class="wd-badge wd-badge-outline">Member</span>';
                }

                var statusBadge = isActive
                    ? '<span class="wd-badge wd-badge-success">Active</span>'
                    : '<span class="wd-badge wd-badge-warning">Pending</span>';

                var lastActive = isActive && m.joined_at
                    ? wdFormatDate(m.joined_at)
                    : isPending ? 'Invite sent' : '-';

                // Actions: delete for active, resend/cancel for pending
                var actions = '';
                if (isActive) {
                    actions = '<button class="wd-btn-icon wd-btn-icon-danger" onclick="removeMember(\'' + m.id + '\')" title="Remove">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                        '</button>';
                } else if (isPending) {
                    actions = '<div class="wd-table-actions">' +
                        '<button class="wd-btn wd-btn-outline wd-btn-sm" onclick="resendInvite(\'' + m.id + '\')">Resend</button>' +
                        '<button class="wd-btn-icon wd-btn-icon-danger" onclick="cancelInvite(\'' + m.id + '\')" title="Cancel">' +
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                        '</button></div>';
                }

                rows += '<tr>' +
                    '<td><div class="wd-member-cell">' +
                    '<div class="wd-member-avatar' + (isPending ? ' wd-avatar-pending' : '') + '">' + escapeHtml(initials) + '</div>' +
                    '<div class="wd-member-info">' +
                    '<span class="wd-member-name">' + escapeHtml(name) + '</span>' +
                    '<span class="wd-member-email">' + escapeHtml(m.email) + '</span>' +
                    '</div></div></td>' +
                    '<td>' + roleCell + '</td>' +
                    '<td>' + statusBadge + '</td>' +
                    '<td>' + lastActive + '</td>' +
                    '<td>' + actions + '</td></tr>';
            });

            var countEl = document.getElementById('team-member-count');
            if (countEl) countEl.textContent = (memberList.length + 1) + ' members';
        } catch (err) {
            console.error('Failed to load team members:', err);
        }

        tbody.innerHTML = rows;
    };

    window.openInviteMemberModal = function() {
        var modal = document.getElementById('invite-member-modal');
        if (modal) {
            modal.style.display = 'flex';
            var form = document.getElementById('invite-member-form');
            if (form) form.reset();
        }
    };

    window.closeInviteMemberModal = function() {
        var modal = document.getElementById('invite-member-modal');
        if (modal) modal.style.display = 'none';
    };

    window.sendInvite = async function(event) {
        if (event) event.preventDefault();
        var email = document.getElementById('invite-email')?.value?.trim();
        var role = document.getElementById('invite-role')?.value || 'member';
        var message = document.getElementById('invite-message')?.value?.trim() || '';

        if (!email) {
            showToast('Please enter an email address', 'error');
            return;
        }

        try {
            await apiCall('/team/invite', {
                method: 'POST',
                body: JSON.stringify({ email: email, role: role, message: message || undefined })
            });
            showToast('Invitation sent successfully', 'success');
            closeInviteMemberModal();
            loadTeamMembers();
        } catch (err) {
            showToast(err.message || 'Failed to send invitation', 'error');
        }
    };

    window.updateMemberRole = async function(memberId, newRole) {
        try {
            await apiCall('/team/members/' + memberId, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole })
            });
            showToast('Role updated', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to update role', 'error');
            loadTeamMembers();
        }
    };

    window.removeMember = async function(memberId) {
        if (!confirm('Are you sure you want to remove this team member?')) return;
        try {
            await apiCall('/team/members/' + memberId, { method: 'DELETE' });
            showToast('Team member removed', 'success');
            loadTeamMembers();
        } catch (err) {
            showToast(err.message || 'Failed to remove member', 'error');
        }
    };

    window.resendInvite = async function(memberId) {
        try {
            await apiCall('/team/resend-invite/' + memberId, { method: 'POST' });
            showToast('Invitation resent', 'success');
        } catch (err) {
            showToast(err.message || 'Failed to resend invitation', 'error');
        }
    };

    window.cancelInvite = async function(memberId) {
        if (!confirm('Cancel this invitation?')) return;
        try {
            await apiCall('/team/members/' + memberId, { method: 'DELETE' });
            showToast('Invitation cancelled', 'success');
            loadTeamMembers();
        } catch (err) {
            showToast(err.message || 'Failed to cancel invitation', 'error');
        }
    };

    // === Company Certifications ===

    window.openCompanyCertModal = function(certId) {
        window.location.href = certId ? 'cert-edit.html?id=' + certId : 'cert-edit.html?id=new';
    };

    window.loadCompanyCerts = async function() {
        var tbody = document.getElementById('company-certs-table-body');
        if (!tbody) return;

        try {
            var data = await apiCall('/certifications');
            var certifications = data.certifications;

            if (!certifications.length) {
                tbody.innerHTML = renderEmptyRow(6, 'No certifications yet. Click "Add Certification" to add one.');
                return;
            }

            tbody.innerHTML = certifications.map(function(cert) {
                return '<tr>' +
                    '<td><a href="cert-edit.html?id=' + cert.id + '" class="wd-link" style="font-weight:600;">' + escapeHtml(cert.name) + '</a></td>' +
                    '<td>' + escapeHtml(cert.issuer || '-') + '</td>' +
                    '<td>' + wdFormatDate(cert.issue_date) + '</td>' +
                    '<td>' + wdFormatDate(cert.expiry_date) + '</td>' +
                    '<td><span class="wd-badge ' + getStatusBadgeClass(cert.status) + '">' + escapeHtml(cert.status || 'valid') + '</span></td>' +
                    '<td><div class="wd-table-actions">' +
                    '<a href="cert-edit.html?id=' + cert.id + '" class="wd-btn wd-btn-sm wd-btn-outline" title="Edit">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></a>' +
                    '<button class="wd-btn wd-btn-sm wd-btn-outline" onclick="deleteCompanyCert(\'' + cert.id + '\')" title="Delete" style="color:#ef4444;">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
                    '</div></td></tr>';
            }).join('');
        } catch (e) {
            console.error('Failed to load certifications:', e);
            tbody.innerHTML = renderEmptyRow(6, 'No certifications yet. Click "Add Certification" to add one.');
        }
    };

    window.deleteCompanyCert = async function(certId) {
        if (!confirm('Are you sure you want to delete this certification?')) return;
        try {
            await apiCall('/certifications/' + certId, { method: 'DELETE' });
            showToast('Certification deleted', 'success');
            loadCompanyCerts();
        } catch (e) {
            console.error('Failed to delete certification:', e);
            showToast('Failed to delete certification', 'error');
        }
    };

    // Stubs
    window.filterActivityLog = function() { /* stub */ };
    window.loadMoreActivities = function() { /* stub */ };
    window.showUpgradeModal = function() { showToast('Upgrade modal coming soon', 'info'); };
    window.startCheckout = function() { showToast('Checkout coming soon', 'info'); };

})();

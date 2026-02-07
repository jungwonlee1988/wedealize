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

    var FREE_PLAN_MEMBER_LIMIT = 3; // Owner + active team members
    var _activeTeamCount = 1; // At least owner

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
                var role = m.role || 'member';
                var roleCell = '';
                if (isActive) {
                    roleCell = '<select class="wd-select wd-select-sm" style="width:120px" onchange="updateMemberRole(\'' + m.id + '\', this.value)">' +
                        '<option value="admin" ' + (role === 'admin' ? 'selected' : '') + '>Admin</option>' +
                        '<option value="member" ' + (role === 'member' ? 'selected' : '') + '>Member</option>' +
                        '<option value="viewer" ' + (role === 'viewer' ? 'selected' : '') + '>Viewer</option>' +
                        '</select>';
                } else {
                    roleCell = role === 'admin'
                        ? '<span class="wd-badge wd-badge-secondary">Admin</span>'
                        : role === 'viewer'
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

            var activeCount = 1 + memberList.filter(function(m) { return m.status === 'active'; }).length;
            _activeTeamCount = activeCount;

            var countEl = document.getElementById('team-member-count');
            if (countEl) countEl.textContent = activeCount + ' / ' + FREE_PLAN_MEMBER_LIMIT + ' members';
        } catch (err) {
            console.error('Failed to load team members:', err);
        }

        tbody.innerHTML = rows;
    };

    window.openInviteMemberModal = function() {
        if (_activeTeamCount >= FREE_PLAN_MEMBER_LIMIT) {
            var limitModal = document.getElementById('team-limit-modal');
            if (limitModal) limitModal.style.display = 'flex';
            return;
        }
        var modal = document.getElementById('invite-member-modal');
        if (modal) {
            modal.style.display = 'flex';
            var form = document.getElementById('invite-member-form');
            if (form) form.reset();
        }
    };

    window.closeTeamLimitModal = function(goToSubscription) {
        var limitModal = document.getElementById('team-limit-modal');
        if (limitModal) limitModal.style.display = 'none';
        if (goToSubscription) switchSettingsTab('subscription');
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

    // === Activity Log ===

    var _activityPage = 1;
    var _activityTotal = 0;

    var CATEGORY_ICONS = {
        team: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        product: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
        account: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        pi: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
        credit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
    };

    var CATEGORY_COLORS = {
        team: '#6366f1',
        product: '#10b981',
        account: '#f59e0b',
        pi: '#3b82f6',
        credit: '#8b5cf6'
    };

    function renderActivityItem(log) {
        var icon = CATEGORY_ICONS[log.category] || CATEGORY_ICONS.product;
        var color = CATEGORY_COLORS[log.category] || '#6b7280';
        var initials = (log.actor_email || '?').substring(0, 2).toUpperCase();
        var timeAgo = getTimeAgo(log.created_at);
        var actorName = log.actor_name || log.actor_email.split('@')[0];

        return '<div class="wd-activity-item">' +
            '<div class="wd-activity-avatar" style="background:' + color + '15; color:' + color + '">' + icon + '</div>' +
            '<div class="wd-activity-content">' +
            '<div class="wd-activity-text"><strong>' + escapeHtml(actorName) + '</strong> ' + escapeHtml(log.description || log.action_type) + '</div>' +
            '<div class="wd-activity-meta">' +
            '<span class="wd-activity-type">' + escapeHtml(log.category) + '</span>' +
            '<span class="wd-activity-time">' + escapeHtml(timeAgo) + '</span>' +
            '</div></div></div>';
    }

    function getTimeAgo(dateStr) {
        var now = new Date();
        var date = new Date(dateStr);
        var diffMs = now - date;
        var diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return diffMin + 'm ago';
        var diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return diffHr + 'h ago';
        var diffDay = Math.floor(diffHr / 24);
        if (diffDay < 7) return diffDay + 'd ago';
        return wdFormatDate(dateStr);
    }

    window.loadActivityLog = async function(page) {
        var container = document.getElementById('activity-log-list');
        if (!container) return;

        page = page || 1;
        var category = document.getElementById('activity-type-filter')?.value || 'all';

        try {
            var params = '?page=' + page + '&limit=20';
            if (category && category !== 'all') params += '&category=' + category;

            var result = await apiCall('/activity-logs' + params);
            _activityPage = result.page || page;
            _activityTotal = result.total || 0;
            var logs = result.logs || [];

            if (page === 1) {
                if (!logs.length) {
                    container.innerHTML = '<div class="wd-empty-block" style="padding: 40px 0; text-align: center; color: var(--wd-gray-400);">' +
                        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>' +
                        '<p>No activity yet</p></div>';
                    return;
                }
                container.innerHTML = '';
            }

            logs.forEach(function(log) {
                container.insertAdjacentHTML('beforeend', renderActivityItem(log));
            });

            // Show/hide "Load More" button
            var existingBtn = container.querySelector('.wd-load-more-btn');
            if (existingBtn) existingBtn.remove();

            var totalShown = page * 20;
            if (totalShown < _activityTotal) {
                container.insertAdjacentHTML('beforeend',
                    '<div style="text-align:center; padding:16px;">' +
                    '<button class="wd-btn wd-btn-outline wd-btn-sm wd-load-more-btn" onclick="loadMoreActivities()">Load More</button>' +
                    '</div>');
            }
        } catch (err) {
            console.error('Failed to load activity log:', err);
            if (page === 1) {
                container.innerHTML = '<div class="wd-empty-block" style="padding: 40px 0; text-align: center; color: var(--wd-gray-400);">' +
                    '<p>Failed to load activity log</p></div>';
            }
        }
    };

    window.filterActivityLog = function() {
        loadActivityLog(1);
    };

    window.loadMoreActivities = function() {
        loadActivityLog(_activityPage + 1);
    };

    // === Recent Activity (Dashboard) ===

    window.loadRecentActivity = async function() {
        var container = document.getElementById('recent-activity-list');
        if (!container) return;

        try {
            var logs = await apiCall('/activity-logs/recent');
            logs = Array.isArray(logs) ? logs : [];

            if (!logs.length) {
                container.innerHTML = '<div class="wd-empty-state" style="padding: 24px; text-align: center; color: var(--wd-gray-400);">' +
                    '<p>No recent activity</p></div>';
                return;
            }

            container.innerHTML = logs.map(function(log) {
                return renderActivityItem(log);
            }).join('');
        } catch (err) {
            console.error('Failed to load recent activity:', err);
        }
    };

    // Stubs
    window.showUpgradeModal = function() { showToast('Upgrade modal coming soon', 'info'); };
    window.startCheckout = function() { showToast('Checkout coming soon', 'info'); };

})();

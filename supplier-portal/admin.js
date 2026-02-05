// WeDealize Admin Dashboard
// Supplier Management Interface

(function() {
    'use strict';

    // Configuration
    const API_BASE_URL = 'https://supplier-api-blush.vercel.app/api/v1/admin';
    const DEFAULT_ADMIN_KEY = 'wedealize-admin-2024';
    const STORAGE_KEY = 'admin_key';

    // State
    let state = {
        adminKey: '',
        suppliers: [],
        stats: null,
        countries: [],
        categories: [],
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0
        },
        filters: {
            search: '',
            country: '',
            category: ''
        },
        platformStats: null,
        signupTrends: [],
        distributions: null,
        recentActivity: [],
        selectedSupplier: null,
        charts: {
            signup: null,
            distribution: null
        }
    };

    // DOM Elements
    const elements = {
        authScreen: document.getElementById('authScreen'),
        adminLayout: document.getElementById('adminLayout'),
        authForm: document.getElementById('authForm'),
        adminPassword: document.getElementById('adminPassword'),
        authError: document.getElementById('authError'),
        logoutBtn: document.getElementById('logoutBtn'),
        searchInput: document.getElementById('searchInput'),
        countryFilter: document.getElementById('countryFilter'),
        categoryFilter: document.getElementById('categoryFilter'),
        refreshBtn: document.getElementById('refreshBtn'),
        exportBtn: document.getElementById('exportBtn'),
        tableContent: document.getElementById('tableContent'),
        tableCount: document.getElementById('tableCount'),
        pagination: document.getElementById('pagination'),
        paginationInfo: document.getElementById('paginationInfo'),
        paginationControls: document.getElementById('paginationControls'),
        statTotal: document.getElementById('statTotal'),
        statToday: document.getElementById('statToday'),
        statWeek: document.getElementById('statWeek'),
        statMonth: document.getElementById('statMonth'),
        // Platform stats
        pStatProducts: document.getElementById('pStatProducts'),
        pStatOrders: document.getElementById('pStatOrders'),
        pStatPIs: document.getElementById('pStatPIs'),
        pStatInquiries: document.getElementById('pStatInquiries'),
        pStatCredits: document.getElementById('pStatCredits'),
        pStatSuppliers: document.getElementById('pStatSuppliers'),
        // Charts
        trendPeriod: document.getElementById('trendPeriod'),
        distributionType: document.getElementById('distributionType'),
        signupChart: document.getElementById('signupChart'),
        distributionChart: document.getElementById('distributionChart'),
        // Activity
        activityToggle: document.getElementById('activityToggle'),
        activityToggleIcon: document.getElementById('activityToggleIcon'),
        activityList: document.getElementById('activityList'),
        // Modals
        supplierModal: document.getElementById('supplierModal'),
        modalTitle: document.getElementById('modalTitle'),
        tabInfo: document.getElementById('tabInfo'),
        tabEdit: document.getElementById('tabEdit'),
        tabRelated: document.getElementById('tabRelated'),
        deleteModal: document.getElementById('deleteModal'),
        deleteMessage: document.getElementById('deleteMessage'),
        toastContainer: document.getElementById('toastContainer')
    };

    // ───── API Helper ─────
    async function apiRequest(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'x-admin-key': state.adminKey,
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });

            if (response.status === 401) {
                handleLogout();
                throw new Error('Unauthorized');
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            // Check content type for CSV
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('text/csv')) {
                return await response.text();
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    function apiPatch(endpoint, body) {
        return apiRequest(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    }

    function apiDelete(endpoint) {
        return apiRequest(endpoint, { method: 'DELETE' });
    }

    // ───── Authentication ─────
    function handleAuth(event) {
        event.preventDefault();
        const password = elements.adminPassword.value.trim();

        if (!password) {
            showAuthError('Please enter a password');
            return;
        }

        state.adminKey = password;
        sessionStorage.setItem(STORAGE_KEY, password);
        validateAndLoad();
    }

    async function validateAndLoad() {
        try {
            await loadStats();
            showAdminDashboard();
            loadFilters();
            loadSuppliers();
            // Load new data in parallel
            loadPlatformStats();
            loadSignupTrends();
            loadDistributions();
            loadRecentActivity();
        } catch (error) {
            showAuthError('Invalid password. Please try again.');
            state.adminKey = '';
            sessionStorage.removeItem(STORAGE_KEY);
        }
    }

    function showAuthError(message) {
        elements.authError.textContent = message;
        elements.authError.style.display = 'block';
    }

    function hideAuthError() {
        elements.authError.style.display = 'none';
    }

    function showAdminDashboard() {
        elements.authScreen.style.display = 'none';
        elements.adminLayout.style.display = 'block';
    }

    function showAuthScreen() {
        elements.authScreen.style.display = 'flex';
        elements.adminLayout.style.display = 'none';
    }

    function handleLogout() {
        state.adminKey = '';
        sessionStorage.removeItem(STORAGE_KEY);
        showAuthScreen();
        elements.adminPassword.value = '';
        hideAuthError();
    }

    // ───── Data Loading ─────
    async function loadStats() {
        const stats = await apiRequest('/suppliers/stats');
        state.stats = stats;
        renderStats();
    }

    async function loadFilters() {
        try {
            const [countries, categories] = await Promise.all([
                apiRequest('/suppliers/countries'),
                apiRequest('/suppliers/categories')
            ]);

            state.countries = countries;
            state.categories = categories;
            renderFilters();
        } catch (error) {
            console.error('Failed to load filters:', error);
        }
    }

    async function loadSuppliers() {
        showLoading();

        try {
            const params = new URLSearchParams({
                page: state.pagination.page.toString(),
                limit: state.pagination.limit.toString()
            });

            if (state.filters.search) {
                params.set('search', state.filters.search);
            }
            if (state.filters.country) {
                params.set('country', state.filters.country);
            }
            if (state.filters.category) {
                params.set('category', state.filters.category);
            }

            const response = await apiRequest(`/suppliers?${params.toString()}`);

            state.suppliers = response.data;
            state.pagination.total = response.total;
            state.pagination.totalPages = response.totalPages;
            state.pagination.page = response.page;

            renderTable();
            renderPagination();
        } catch (error) {
            console.error('Failed to load suppliers:', error);
            showError('Failed to load suppliers. Please try again.');
        }
    }

    async function loadPlatformStats() {
        try {
            const stats = await apiRequest('/stats/platform');
            state.platformStats = stats;
            renderPlatformStats();
        } catch (error) {
            console.error('Failed to load platform stats:', error);
        }
    }

    async function loadSignupTrends() {
        try {
            const period = elements.trendPeriod.value;
            const daysMap = { daily: 30, weekly: 90, monthly: 365 };
            const days = daysMap[period] || 30;

            const data = await apiRequest(`/stats/signup-trends?period=${period}&days=${days}`);
            state.signupTrends = data;
            renderSignupChart();
        } catch (error) {
            console.error('Failed to load signup trends:', error);
        }
    }

    async function loadDistributions() {
        try {
            const data = await apiRequest('/stats/distributions');
            state.distributions = data;
            renderDistributionChart();
        } catch (error) {
            console.error('Failed to load distributions:', error);
        }
    }

    async function loadRecentActivity() {
        try {
            const data = await apiRequest('/activity/recent?limit=20');
            state.recentActivity = data;
            renderActivityFeed();
        } catch (error) {
            console.error('Failed to load activity:', error);
        }
    }

    // ───── Rendering ─────
    function renderStats() {
        if (!state.stats) return;

        elements.statTotal.textContent = formatNumber(state.stats.total);
        elements.statToday.textContent = formatNumber(state.stats.today);
        elements.statWeek.textContent = formatNumber(state.stats.thisWeek);
        elements.statMonth.textContent = formatNumber(state.stats.thisMonth);
    }

    function renderPlatformStats() {
        if (!state.platformStats) return;
        const s = state.platformStats;
        elements.pStatProducts.textContent = formatNumber(s.products);
        elements.pStatOrders.textContent = formatNumber(s.orders);
        elements.pStatPIs.textContent = formatNumber(s.proformaInvoices);
        elements.pStatInquiries.textContent = formatNumber(s.inquiries);
        elements.pStatCredits.textContent = formatNumber(s.credits);
        elements.pStatSuppliers.textContent = formatNumber(s.suppliers);
    }

    function renderFilters() {
        elements.countryFilter.innerHTML = '<option value="">All Countries</option>';
        state.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            elements.countryFilter.appendChild(option);
        });

        elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';
        state.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = getCategoryLabel(category);
            elements.categoryFilter.appendChild(option);
        });
    }

    function renderTable() {
        if (state.suppliers.length === 0) {
            elements.tableContent.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3>No suppliers found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
            elements.tableCount.textContent = '0 suppliers';
            elements.pagination.style.display = 'none';
            return;
        }

        const tableHTML = `
            <table class="suppliers-table">
                <thead>
                    <tr>
                        <th>Company</th>
                        <th>Country</th>
                        <th>Category</th>
                        <th>Email Verified</th>
                        <th>Status</th>
                        <th>Registered</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.suppliers.map(supplier => `
                        <tr onclick="openSupplierDetail('${supplier.id}')">
                            <td>
                                <div class="company-cell">
                                    <span class="company-name">${escapeHtml(supplier.company_name || '-')}</span>
                                    <span class="company-email">${escapeHtml(supplier.email)}</span>
                                </div>
                            </td>
                            <td>${escapeHtml(supplier.country || '-')}</td>
                            <td>${renderCategoryBadges(supplier.category)}</td>
                            <td>
                                <span class="verified-badge ${supplier.email_verified ? 'verified' : 'unverified'}">
                                    ${supplier.email_verified ? 'Verified' : 'Unverified'}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge ${supplier.is_active !== false ? 'active' : 'inactive'}">
                                    ${supplier.is_active !== false ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>${formatDate(supplier.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        elements.tableContent.innerHTML = tableHTML;
        elements.tableCount.textContent = `${state.pagination.total} suppliers`;
        elements.pagination.style.display = 'flex';
    }

    function renderPagination() {
        const { page, limit, total, totalPages } = state.pagination;

        if (totalPages <= 1) {
            elements.pagination.style.display = 'none';
            return;
        }

        const start = (page - 1) * limit + 1;
        const end = Math.min(page * limit, total);

        elements.paginationInfo.textContent = `Showing ${start}-${end} of ${total}`;

        let controlsHTML = '';

        controlsHTML += `
            <button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6"></path>
                </svg>
            </button>
        `;

        const maxVisible = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            controlsHTML += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                controlsHTML += `<span style="padding: 0 8px; color: var(--wd-gray-400);">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            controlsHTML += `
                <button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                controlsHTML += `<span style="padding: 0 8px; color: var(--wd-gray-400);">...</span>`;
            }
            controlsHTML += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        controlsHTML += `
            <button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"></path>
                </svg>
            </button>
        `;

        elements.paginationControls.innerHTML = controlsHTML;
    }

    // ───── Charts ─────
    function renderSignupChart() {
        if (!state.signupTrends || state.signupTrends.length === 0) return;

        const ctx = elements.signupChart.getContext('2d');

        if (state.charts.signup) {
            state.charts.signup.destroy();
        }

        const labels = state.signupTrends.map(d => {
            const date = new Date(d.date + 'T00:00:00');
            const period = elements.trendPeriod.value;
            if (period === 'monthly') {
                return date.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
            }
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const data = state.signupTrends.map(d => d.count);

        state.charts.signup = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Signups',
                    data,
                    backgroundColor: 'rgba(21, 101, 192, 0.7)',
                    borderColor: 'rgba(21, 101, 192, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            maxTicksLimit: 15
                        }
                    }
                }
            }
        });
    }

    function renderDistributionChart() {
        if (!state.distributions) return;

        const ctx = elements.distributionChart.getContext('2d');
        const type = elements.distributionType.value;

        if (state.charts.distribution) {
            state.charts.distribution.destroy();
        }

        const source = type === 'category' ? state.distributions.categories : state.distributions.countries;
        if (!source || source.length === 0) return;

        // Take top 8, group rest as "Other"
        const top = source.slice(0, 8);
        const rest = source.slice(8);
        const otherCount = rest.reduce((sum, item) => sum + item.count, 0);

        const labels = top.map(d => type === 'category' ? getCategoryLabel(d.name) : d.name);
        const data = top.map(d => d.count);

        if (otherCount > 0) {
            labels.push('Other');
            data.push(otherCount);
        }

        const colors = [
            '#1565c0', '#2e7d32', '#e65100', '#7b1fa2',
            '#c62828', '#00838f', '#ef6c00', '#4527a0',
            '#9e9e9e'
        ];

        state.charts.distribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 12,
                            padding: 12,
                            font: { size: 11 }
                        }
                    }
                }
            }
        });
    }

    // ───── Activity Feed ─────
    function renderActivityFeed() {
        if (!state.recentActivity || state.recentActivity.length === 0) {
            elements.activityList.innerHTML = '<div class="empty-state"><p>No recent activity</p></div>';
            return;
        }

        const iconMap = {
            supplier_signup: { cls: 'signup', icon: '+' },
            product_added: { cls: 'product', icon: 'P' },
            order_created: { cls: 'order', icon: 'O' },
            pi_created: { cls: 'pi', icon: 'PI' }
        };

        const html = state.recentActivity.map(activity => {
            const iconInfo = iconMap[activity.type] || { cls: 'signup', icon: '?' };
            return `
                <div class="activity-item">
                    <div class="activity-icon ${iconInfo.cls}">${iconInfo.icon}</div>
                    <div class="activity-content">
                        <div class="activity-message">${escapeHtml(activity.message)}</div>
                        <div class="activity-time">${formatRelativeTime(activity.timestamp)}</div>
                    </div>
                </div>
            `;
        }).join('');

        elements.activityList.innerHTML = html;
    }

    function toggleActivityFeed() {
        elements.activityList.classList.toggle('collapsed');
        elements.activityToggleIcon.classList.toggle('collapsed');
    }

    // ───── Supplier Detail Modal ─────
    async function openSupplierDetail(id) {
        try {
            const supplier = await apiRequest(`/suppliers/${id}`);
            state.selectedSupplier = supplier;
            elements.modalTitle.textContent = supplier.company_name || 'Supplier Detail';
            renderSupplierInfo();
            renderEditForm();
            renderRelatedData();
            switchTab('info');
            elements.supplierModal.classList.remove('hidden');
        } catch (error) {
            showToast('Failed to load supplier details', 'error');
        }
    }

    function closeSupplierModal() {
        elements.supplierModal.classList.add('hidden');
        state.selectedSupplier = null;
    }

    function switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.detail-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.detail-tab').forEach(tab => {
            if (tab.textContent.toLowerCase().includes(tabName === 'related' ? 'related' : tabName)) {
                tab.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        const tabEl = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
        if (tabEl) tabEl.classList.add('active');
    }

    function renderSupplierInfo() {
        const s = state.selectedSupplier;
        if (!s) return;

        const isActive = s.is_active !== false;

        elements.tabInfo.innerHTML = `
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Company Name</span>
                    <span class="info-value">${escapeHtml(s.company_name || '-')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email</span>
                    <span class="info-value">${escapeHtml(s.email || '-')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Country</span>
                    <span class="info-value">${escapeHtml(s.country || '-')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Category</span>
                    <span class="info-value">${renderCategoryBadges(s.category)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Phone</span>
                    <span class="info-value">${escapeHtml(s.phone || '-')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Website</span>
                    <span class="info-value">${escapeHtml(s.website || '-')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Year Established</span>
                    <span class="info-value">${s.year_established || '-'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Employees</span>
                    <span class="info-value">${escapeHtml(s.employees || '-')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Email Verified</span>
                    <span class="info-value">
                        <span class="verified-badge ${s.email_verified ? 'verified' : 'unverified'}">
                            ${s.email_verified ? 'Verified' : 'Unverified'}
                        </span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status</span>
                    <span class="info-value">
                        <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                            ${isActive ? 'Active' : 'Inactive'}
                        </span>
                    </span>
                </div>
                <div class="info-item full-width">
                    <span class="info-label">Description</span>
                    <span class="info-value">${escapeHtml(s.description || '-')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Registered</span>
                    <span class="info-value">${formatDate(s.created_at)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Last Updated</span>
                    <span class="info-value">${formatDate(s.updated_at)}</span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="wd-btn wd-btn-outline" onclick="toggleSupplierStatus()">
                    ${isActive ? 'Deactivate' : 'Reactivate'}
                </button>
                <button class="btn-danger" onclick="confirmDeleteSupplier()">Delete Supplier</button>
            </div>
        `;
    }

    function renderEditForm() {
        const s = state.selectedSupplier;
        if (!s) return;

        elements.tabEdit.innerHTML = `
            <div class="edit-form">
                <div class="wd-form-group">
                    <label class="wd-form-label">Company Name</label>
                    <input type="text" id="editCompanyName" class="wd-input" value="${escapeHtml(s.company_name || '')}">
                </div>
                <div class="wd-form-group">
                    <label class="wd-form-label">Country</label>
                    <input type="text" id="editCountry" class="wd-input" value="${escapeHtml(s.country || '')}">
                </div>
                <div class="wd-form-group">
                    <label class="wd-form-label">Categories</label>
                    <div id="editCategoryContainer" style="max-height:240px;overflow-y:auto;border:1px solid var(--wd-gray-200);border-radius:6px;padding:8px">
                    </div>
                </div>
                <div class="wd-form-group">
                    <label class="wd-form-label">Phone</label>
                    <input type="text" id="editPhone" class="wd-input" value="${escapeHtml(s.phone || '')}">
                </div>
                <div class="wd-form-group">
                    <label class="wd-form-label">Website</label>
                    <input type="text" id="editWebsite" class="wd-input" value="${escapeHtml(s.website || '')}">
                </div>
                <div class="wd-form-group">
                    <label class="wd-form-label">Year Established</label>
                    <input type="number" id="editYearEstablished" class="wd-input" value="${s.year_established || ''}">
                </div>
                <div class="wd-form-group">
                    <label class="wd-form-label">Employees</label>
                    <input type="text" id="editEmployees" class="wd-input" value="${escapeHtml(s.employees || '')}">
                </div>
                <div class="wd-form-group full-width">
                    <label class="wd-form-label">Description</label>
                    <textarea id="editDescription" class="wd-input" rows="3">${escapeHtml(s.description || '')}</textarea>
                </div>
                <div class="wd-form-group full-width" style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="wd-btn wd-btn-outline" onclick="switchTab('info')">Cancel</button>
                    <button class="wd-btn wd-btn-primary" onclick="saveSupplier()">Save Changes</button>
                </div>
            </div>
        `;

        // Populate edit category checkboxes
        const editContainer = document.getElementById('editCategoryContainer');
        if (editContainer) {
            const selected = Array.isArray(s.category) ? s.category : (s.category ? [s.category] : []);
            const groups = {
                'Oils & Fats': ['evoo','olive-oil','seed-oils','nut-oils','truffle-oil'],
                'Vinegars & Condiments': ['balsamic','wine-vinegar','sauces','mustard-dressings'],
                'Dairy & Cheese': ['hard-cheese','soft-cheese','aged-cheese','butter-cream'],
                'Meat & Charcuterie': ['cured-meats','sausages','smoked-meats'],
                'Pasta & Grains': ['dried-pasta','fresh-pasta','rice','flour-semolina'],
                'Bakery & Confectionery': ['bread','biscuits-cookies','chocolate','pastries'],
                'Canned & Preserved': ['tomato-products','pickles-olives','preserved-veg','jams-spreads'],
                'Beverages': ['wine','spirits','coffee','tea','juices-soft'],
                'Seafood': ['fresh-fish','canned-fish','shellfish','smoked-fish'],
                'Spices, Herbs & Sweeteners': ['spice-blends','herbs','honey'],
                'Snacks & Nuts': ['nuts-dried-fruit','chips-crackers','bars'],
                'Specialty & Health': ['organic','gluten-free','vegan-plant','frozen']
            };
            let html = '';
            for (const [group, slugs] of Object.entries(groups)) {
                html += `<div style="margin-bottom:8px"><strong style="font-size:12px;color:var(--wd-gray-600)">${group}</strong><div class="wd-checkbox-grid" style="margin-top:4px">`;
                for (const slug of slugs) {
                    const checked = selected.includes(slug) ? 'checked' : '';
                    html += `<label class="wd-checkbox-card"><input type="checkbox" class="edit-cat-cb" value="${slug}" ${checked}><span class="wd-checkbox-label">${getCategoryLabel(slug)}</span></label>`;
                }
                html += `</div></div>`;
            }
            editContainer.innerHTML = html;
        }
    }

    function renderRelatedData() {
        const s = state.selectedSupplier;
        if (!s || !s.counts) return;

        const c = s.counts;
        elements.tabRelated.innerHTML = `
            <div class="counts-grid">
                <div class="count-card">
                    <div class="count-value">${formatNumber(c.products)}</div>
                    <div class="count-label">Products</div>
                </div>
                <div class="count-card">
                    <div class="count-value">${formatNumber(c.orders)}</div>
                    <div class="count-label">Orders</div>
                </div>
                <div class="count-card">
                    <div class="count-value">${formatNumber(c.proformaInvoices)}</div>
                    <div class="count-label">Proforma Invoices</div>
                </div>
                <div class="count-card">
                    <div class="count-value">${formatNumber(c.inquiries)}</div>
                    <div class="count-label">Inquiries</div>
                </div>
                <div class="count-card">
                    <div class="count-value">${formatNumber(c.accounts)}</div>
                    <div class="count-label">Accounts</div>
                </div>
                <div class="count-card">
                    <div class="count-value">${formatNumber(c.teamMembers)}</div>
                    <div class="count-label">Team Members</div>
                </div>
            </div>
        `;
    }

    // ───── Supplier Edit ─────
    async function saveSupplier() {
        if (!state.selectedSupplier) return;

        const dto = {};
        const companyName = document.getElementById('editCompanyName').value.trim();
        const country = document.getElementById('editCountry').value.trim();
        const categories = Array.from(document.querySelectorAll('.edit-cat-cb:checked')).map(cb => cb.value);
        const phone = document.getElementById('editPhone').value.trim();
        const website = document.getElementById('editWebsite').value.trim();
        const yearEstablished = document.getElementById('editYearEstablished').value;
        const employees = document.getElementById('editEmployees').value.trim();
        const description = document.getElementById('editDescription').value.trim();

        if (companyName) dto.companyName = companyName;
        if (country !== undefined) dto.country = country;
        dto.categories = categories;
        if (phone !== undefined) dto.phone = phone;
        if (website !== undefined) dto.website = website;
        if (yearEstablished) dto.yearEstablished = parseInt(yearEstablished, 10);
        if (employees !== undefined) dto.employees = employees;
        if (description !== undefined) dto.description = description;

        try {
            await apiPatch(`/suppliers/${state.selectedSupplier.id}`, dto);
            showToast('Supplier updated successfully', 'success');

            // Refresh data
            const updated = await apiRequest(`/suppliers/${state.selectedSupplier.id}`);
            state.selectedSupplier = updated;
            elements.modalTitle.textContent = updated.company_name || 'Supplier Detail';
            renderSupplierInfo();
            renderEditForm();
            switchTab('info');
            loadSuppliers();
        } catch (error) {
            showToast('Failed to update supplier', 'error');
        }
    }

    // ───── Status Toggle ─────
    async function toggleSupplierStatus() {
        if (!state.selectedSupplier) return;

        const currentActive = state.selectedSupplier.is_active !== false;
        const newStatus = !currentActive;

        try {
            await apiPatch(`/suppliers/${state.selectedSupplier.id}/status`, { isActive: newStatus });
            showToast(`Supplier ${newStatus ? 'reactivated' : 'deactivated'} successfully`, 'success');

            // Refresh
            const updated = await apiRequest(`/suppliers/${state.selectedSupplier.id}`);
            state.selectedSupplier = updated;
            renderSupplierInfo();
            loadSuppliers();
        } catch (error) {
            showToast('Failed to update supplier status', 'error');
        }
    }

    // ───── Supplier Delete ─────
    function confirmDeleteSupplier() {
        if (!state.selectedSupplier) return;
        const name = state.selectedSupplier.company_name || 'this supplier';
        elements.deleteMessage.textContent =
            `This will permanently delete "${name}" and all associated data including products, orders, invoices, and team members. This action cannot be undone.`;
        elements.deleteModal.classList.remove('hidden');
    }

    function closeDeleteModal() {
        elements.deleteModal.classList.add('hidden');
    }

    async function deleteSupplierAction() {
        if (!state.selectedSupplier) return;

        try {
            await apiDelete(`/suppliers/${state.selectedSupplier.id}`);
            showToast('Supplier deleted successfully', 'success');
            closeDeleteModal();
            closeSupplierModal();
            loadSuppliers();
            loadStats();
            loadPlatformStats();
        } catch (error) {
            showToast('Failed to delete supplier', 'error');
        }
    }

    // ───── CSV Export ─────
    async function exportSuppliers() {
        try {
            const params = new URLSearchParams();
            if (state.filters.search) params.set('search', state.filters.search);
            if (state.filters.country) params.set('country', state.filters.country);
            if (state.filters.category) params.set('category', state.filters.category);

            const url = `${API_BASE_URL}/suppliers/export?${params.toString()}`;
            const response = await fetch(url, {
                headers: {
                    'x-admin-key': state.adminKey
                }
            });

            if (!response.ok) throw new Error('Export failed');

            const csv = await response.text();
            const blob = new Blob([csv], { type: 'text/csv' });
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `suppliers_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            showToast('CSV exported successfully', 'success');
        } catch (error) {
            showToast('Failed to export CSV', 'error');
        }
    }

    // ───── Toast ─────
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }

    // ───── UI Helpers ─────
    function showLoading() {
        elements.tableContent.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
            </div>
        `;
    }

    function showError(message) {
        elements.tableContent.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <h3>Error</h3>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    // ───── Event Handlers ─────
    function handleSearch() {
        state.filters.search = elements.searchInput.value.trim();
        state.pagination.page = 1;
        loadSuppliers();
    }

    function handleCountryFilter() {
        state.filters.country = elements.countryFilter.value;
        state.pagination.page = 1;
        loadSuppliers();
    }

    function handleCategoryFilter() {
        state.filters.category = elements.categoryFilter.value;
        state.pagination.page = 1;
        loadSuppliers();
    }

    function handlePageClick(event) {
        const btn = event.target.closest('.pagination-btn');
        if (!btn || btn.disabled) return;

        const page = parseInt(btn.dataset.page, 10);
        if (isNaN(page)) return;

        state.pagination.page = page;
        loadSuppliers();
    }

    function handleRefresh() {
        loadStats();
        loadSuppliers();
        loadPlatformStats();
        loadSignupTrends();
        loadDistributions();
        loadRecentActivity();
    }

    // ───── Utility Functions ─────
    function formatNumber(num) {
        if (num === undefined || num === null) return '-';
        return num.toLocaleString();
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return formatDate(dateStr);
    }

    function getCategoryLabel(category) {
        const labels = {
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
            'oils': 'Oils & Vinegars', 'dairy': 'Dairy & Cheese', 'beverages': 'Beverages',
            'snacks': 'Snacks', 'pasta': 'Pasta & Grains', 'canned': 'Canned Goods', 'deli': 'Deli & Meats'
        };
        if (Array.isArray(category)) {
            if (category.length === 0) return '-';
            return category.map(c => labels[c] || c).join(', ');
        }
        return labels[category] || category || '-';
    }

    function renderCategoryBadges(category) {
        if (!category) return '-';
        const cats = Array.isArray(category) ? category : [category];
        if (cats.length === 0) return '-';
        if (cats.length <= 2) {
            return cats.map(c => `<span class="status-badge active" style="font-size:11px;margin:1px">${escapeHtml(getCategoryLabel(c))}</span>`).join(' ');
        }
        return cats.slice(0, 2).map(c => `<span class="status-badge active" style="font-size:11px;margin:1px">${escapeHtml(getCategoryLabel(c))}</span>`).join(' ')
            + ` <span class="status-badge" style="font-size:11px;margin:1px">+${cats.length - 2}</span>`;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ───── Window Globals (onclick bridge) ─────
    window.openSupplierDetail = openSupplierDetail;
    window.closeSupplierModal = closeSupplierModal;
    window.closeDeleteModal = closeDeleteModal;
    window.switchTab = switchTab;
    window.saveSupplier = saveSupplier;
    window.toggleSupplierStatus = toggleSupplierStatus;
    window.confirmDeleteSupplier = confirmDeleteSupplier;
    window.deleteSupplier = deleteSupplierAction;

    // ───── Initialize ─────
    function init() {
        // Check for stored admin key
        const storedKey = sessionStorage.getItem(STORAGE_KEY);
        if (storedKey) {
            state.adminKey = storedKey;
            validateAndLoad();
        }

        // Event listeners
        elements.authForm.addEventListener('submit', handleAuth);
        elements.adminPassword.addEventListener('input', hideAuthError);
        elements.logoutBtn.addEventListener('click', handleLogout);
        elements.refreshBtn.addEventListener('click', handleRefresh);
        elements.exportBtn.addEventListener('click', exportSuppliers);
        elements.countryFilter.addEventListener('change', handleCountryFilter);
        elements.categoryFilter.addEventListener('change', handleCategoryFilter);
        elements.paginationControls.addEventListener('click', handlePageClick);
        elements.activityToggle.addEventListener('click', toggleActivityFeed);
        elements.trendPeriod.addEventListener('change', loadSignupTrends);
        elements.distributionType.addEventListener('change', renderDistributionChart);

        // Debounced search
        const debouncedSearch = debounce(handleSearch, 300);
        elements.searchInput.addEventListener('input', debouncedSearch);

        // Close modals on overlay click
        elements.supplierModal.addEventListener('click', function(e) {
            if (e.target === elements.supplierModal) closeSupplierModal();
        });
        elements.deleteModal.addEventListener('click', function(e) {
            if (e.target === elements.deleteModal) closeDeleteModal();
        });
    }

    // Start
    init();
})();

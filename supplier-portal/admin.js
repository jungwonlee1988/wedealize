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
        tableContent: document.getElementById('tableContent'),
        tableCount: document.getElementById('tableCount'),
        pagination: document.getElementById('pagination'),
        paginationInfo: document.getElementById('paginationInfo'),
        paginationControls: document.getElementById('paginationControls'),
        statTotal: document.getElementById('statTotal'),
        statToday: document.getElementById('statToday'),
        statWeek: document.getElementById('statWeek'),
        statMonth: document.getElementById('statMonth')
    };

    // API Helper
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

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Authentication
    function handleAuth(event) {
        event.preventDefault();
        const password = elements.adminPassword.value.trim();

        if (!password) {
            showAuthError('Please enter a password');
            return;
        }

        // Store the admin key
        state.adminKey = password;
        sessionStorage.setItem(STORAGE_KEY, password);

        // Try to validate by fetching stats
        validateAndLoad();
    }

    async function validateAndLoad() {
        try {
            await loadStats();
            showAdminDashboard();
            loadFilters();
            loadSuppliers();
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

    // Data Loading
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

    // Rendering
    function renderStats() {
        if (!state.stats) return;

        elements.statTotal.textContent = formatNumber(state.stats.total);
        elements.statToday.textContent = formatNumber(state.stats.today);
        elements.statWeek.textContent = formatNumber(state.stats.thisWeek);
        elements.statMonth.textContent = formatNumber(state.stats.thisMonth);
    }

    function renderFilters() {
        // Country filter
        elements.countryFilter.innerHTML = '<option value="">All Countries</option>';
        state.countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            elements.countryFilter.appendChild(option);
        });

        // Category filter
        elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';
        const categoryLabels = {
            oils: 'Oils & Vinegars',
            dairy: 'Dairy & Cheese',
            organic: 'Organic & Health',
            beverages: 'Beverages',
            snacks: 'Snacks',
            sauces: 'Sauces',
            pasta: 'Pasta & Grains',
            canned: 'Canned Goods',
            deli: 'Deli & Meats'
        };

        state.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = categoryLabels[category] || category;
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
                        <th>Status</th>
                        <th>Registered</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.suppliers.map(supplier => `
                        <tr>
                            <td>
                                <div class="company-cell">
                                    <span class="company-name">${escapeHtml(supplier.company_name || '-')}</span>
                                    <span class="company-email">${escapeHtml(supplier.email)}</span>
                                </div>
                            </td>
                            <td>${escapeHtml(supplier.country || '-')}</td>
                            <td>${escapeHtml(getCategoryLabel(supplier.category))}</td>
                            <td>
                                <span class="verified-badge ${supplier.email_verified ? 'verified' : 'unverified'}">
                                    ${supplier.email_verified ? '✓ Verified' : 'Unverified'}
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

        // Build pagination controls
        let controlsHTML = '';

        // Previous button
        controlsHTML += `
            <button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6"></path>
                </svg>
            </button>
        `;

        // Page numbers
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

        // Next button
        controlsHTML += `
            <button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"></path>
                </svg>
            </button>
        `;

        elements.paginationControls.innerHTML = controlsHTML;
    }

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

    // Event Handlers
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
    }

    // Utility Functions
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

    function getCategoryLabel(category) {
        const labels = {
            oils: 'Oils & Vinegars',
            dairy: 'Dairy & Cheese',
            organic: 'Organic & Health',
            beverages: 'Beverages',
            snacks: 'Snacks',
            sauces: 'Sauces',
            pasta: 'Pasta & Grains',
            canned: 'Canned Goods',
            deli: 'Deli & Meats'
        };
        return labels[category] || category || '-';
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

    // Initialize
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
        elements.countryFilter.addEventListener('change', handleCountryFilter);
        elements.categoryFilter.addEventListener('change', handleCategoryFilter);
        elements.paginationControls.addEventListener('click', handlePageClick);

        // Debounced search
        const debouncedSearch = debounce(handleSearch, 300);
        elements.searchInput.addEventListener('input', debouncedSearch);
    }

    // Start
    init();
})();

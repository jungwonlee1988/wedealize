// WeDealize Supplier Portal JavaScript

// ==================== API Configuration ====================

// API_BASE_URL은 i18n.js에서 정의됨
const API_TIMEOUT = 15000; // 15초 타임아웃

// 401 응답 시 세션 만료 처리
function handleSessionExpired() {
    showToast('Session expired. Please log in again.', 'error');
    localStorage.removeItem('supplier_logged_in');
    localStorage.removeItem('supplier_token');
    localStorage.removeItem('supplier_id');
    localStorage.removeItem('supplier_email');
    localStorage.removeItem('supplier_name');
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 1500);
}

// API 호출 헬퍼 (타임아웃 포함)
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('supplier_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // 타임아웃 컨트롤러
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
            handleSessionExpired();
            throw new Error('Session expired');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'API request failed');
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('API Error:', error);
        throw error;
    }
}

// 파일 업로드 헬퍼
async function uploadFile(endpoint, file, additionalData = {}) {
    const token = localStorage.getItem('supplier_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('supplier_id', localStorage.getItem('supplier_id') || '1');

    for (const [key, value] of Object.entries(additionalData)) {
        formData.append(key, value);
    }

    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
    }

    return await response.json();
}

// ==================== Auth ====================

// Google OAuth Configuration (실제 배포 시 Google Cloud Console에서 발급받은 Client ID로 교체)
const GOOGLE_CLIENT_ID = '922089603849-fgcilcaqoohkqs0dslblb6giq7v0r2nh.apps.googleusercontent.com';

// 임시 저장용 (회원가입 시 이메일 인증 전까지)
let pendingRegistration = null;
let verificationTimer = null;

// Auth Tab 전환
document.querySelectorAll('.wd-auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.wd-auth-tab').forEach(t => t.classList.remove('active'));
        hideAllAuthForms();

        tab.classList.add('active');
        const formId = tab.dataset.tab + '-form';
        document.getElementById(formId).classList.add('active');
    });
});

function hideAllAuthForms() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('verify-form').style.display = 'none';
    document.getElementById('forgot-form').style.display = 'none';
    document.getElementById('reset-sent-form').style.display = 'none';
}

// 로그인 처리
async function handleLogin(e) {
    if (e) e.preventDefault();
    console.log('handleLogin called');

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    console.log('Email:', email, 'Password:', password ? '***' : 'empty');

    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }

    // 백엔드 로그인 시도
    try {
        const response = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        console.log('Login via backend successful');

        // 토큰 및 정보 저장
        localStorage.setItem('supplier_logged_in', 'true');
        localStorage.setItem('supplier_token', response.access_token);
        localStorage.setItem('supplier_id', response.supplier_id);
        localStorage.setItem('supplier_email', response.email);
        localStorage.setItem('supplier_name', response.company_name);

        console.log('Showing dashboard...');
        showToast(t('toast.loginSuccess'), 'success');
        showDashboard();
    } catch (apiError) {
        console.error('Login failed:', apiError.message);

        // 로컬 테스트용: API 실패 시 데모 모드로 로그인
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Demo mode login (localhost)');
            localStorage.setItem('supplier_logged_in', 'true');
            localStorage.setItem('supplier_token', 'demo_token');
            localStorage.setItem('supplier_id', 'demo_supplier');
            localStorage.setItem('supplier_email', email);
            localStorage.setItem('supplier_name', email.split('@')[0] || 'Demo User');
            localStorage.setItem('wedealize_email', email);
            localStorage.setItem('wedealize_name', email.split('@')[0] || 'Demo User');

            showToast('Demo mode: Logged in successfully!', 'success');
            showDashboard();
            return;
        }

        showToast('Invalid email or password', 'error');
    }
}

// 로그인 버튼 직접 클릭 핸들러 (폴백)
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// 회원가입 처리 - 이메일 인증 단계로 전환
async function handleRegister(e) {
    e.preventDefault();
    const company = document.getElementById('reg-company').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const country = document.getElementById('reg-country')?.value;
    const category = document.getElementById('reg-category')?.value;

    // 회원가입 정보 임시 저장
    pendingRegistration = { company, email, password, country, category };

    try {
        // API 호출: 인증 코드 발송 요청
        await apiCall('/auth/send-verification', {
            method: 'POST',
            body: JSON.stringify({ email, companyName: company })
        });

        showVerificationForm(email);
        showToast('Verification code sent to your email.');

    } catch (error) {
        console.error('Send verification error:', error);
        // 데모 모드: API 없어도 인증 화면으로 전환
        showVerificationForm(email);
        showToast('Verification code sent to your email.');
    }
}

// 이메일 인증 화면 표시
function showVerificationForm(email) {
    hideAllAuthForms();
    document.querySelector('.wd-auth-tabs').style.display = 'none';
    document.getElementById('verify-form').style.display = 'block';
    document.getElementById('verify-email-display').textContent = email;

    // 인증 코드 입력 필드 초기화
    document.querySelectorAll('.wd-code-input').forEach(input => {
        input.value = '';
        input.classList.remove('filled', 'error');
    });
    document.querySelector('.wd-code-input').focus();

    // 재전송 타이머 시작
    startResendTimer();
}

// 인증 코드 입력 핸들러
function handleCodeInput(e) {
    const input = e.target;
    const index = parseInt(input.dataset.index);
    const value = input.value;

    // 숫자만 허용
    input.value = value.replace(/[^0-9]/g, '');

    if (input.value) {
        input.classList.add('filled');
        // 다음 입력 필드로 포커스 이동
        if (index < 5) {
            const nextInput = document.querySelector(`.wd-code-input[data-index="${index + 1}"]`);
            if (nextInput) nextInput.focus();
        }
    } else {
        input.classList.remove('filled');
    }

    // 모든 필드 입력 완료 시 자동 인증
    const allInputs = document.querySelectorAll('.wd-code-input');
    const code = Array.from(allInputs).map(i => i.value).join('');
    if (code.length === 6) {
        verifyEmail();
    }
}

// 인증 코드 붙여넣기 핸들러
function handleCodePaste(e) {
    e.preventDefault();
    const pastedData = (e.clipboardData || window.clipboardData).getData('text');
    const digits = pastedData.replace(/[^0-9]/g, '').slice(0, 6);

    if (digits.length > 0) {
        const allInputs = document.querySelectorAll('.wd-code-input');
        digits.split('').forEach((digit, i) => {
            if (allInputs[i]) {
                allInputs[i].value = digit;
                allInputs[i].classList.add('filled');
            }
        });

        // 마지막 입력 필드로 포커스
        const lastIndex = Math.min(digits.length - 1, 5);
        allInputs[lastIndex].focus();

        // 6자리 모두 입력되면 자동 인증
        if (digits.length === 6) {
            verifyEmail();
        }
    }
}

// 인증 코드 키보드 핸들러 (백스페이스 처리)
function handleCodeKeydown(e) {
    const input = e.target;
    const index = parseInt(input.dataset.index);

    if (e.key === 'Backspace' && !input.value && index > 0) {
        const prevInput = document.querySelector(`.wd-code-input[data-index="${index - 1}"]`);
        if (prevInput) {
            prevInput.focus();
            prevInput.value = '';
            prevInput.classList.remove('filled');
        }
    }
}

// 이메일 인증 확인
async function verifyEmail() {
    const allInputs = document.querySelectorAll('.wd-code-input');
    const code = Array.from(allInputs).map(i => i.value).join('');

    if (code.length !== 6) {
        showToast('Please enter the 6-digit verification code.', 'error');
        return;
    }

    try {
        // API 호출: 인증 코드 확인 및 회원가입 완료
        const response = await apiCall('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({
                email: pendingRegistration.email,
                code: code,
                companyName: pendingRegistration.company,
                password: pendingRegistration.password,
                country: pendingRegistration.country,
                category: pendingRegistration.category
            })
        });

        completeRegistration(response);

    } catch (error) {
        console.error('Verification error:', error);
        // 인증 실패 애니메이션
        allInputs.forEach(input => {
            input.classList.add('error');
            setTimeout(() => input.classList.remove('error'), 500);
        });
        showToast('Invalid verification code. Please try again.', 'error');
    }
}

// 회원가입 완료
function completeRegistration(response) {
    localStorage.setItem('supplier_logged_in', 'true');
    localStorage.setItem('supplier_token', response.access_token);
    localStorage.setItem('supplier_id', response.supplier_id);
    localStorage.setItem('supplier_email', pendingRegistration.email);
    localStorage.setItem('supplier_name', pendingRegistration.company);

    // 타이머 정리
    if (verificationTimer) {
        clearInterval(verificationTimer);
        verificationTimer = null;
    }

    pendingRegistration = null;
    document.querySelector('.wd-auth-tabs').style.display = 'flex';
    showDashboard();
    showToast('Email verified! Welcome to WeDealize.');
}

// 인증 코드 재전송
async function resendVerificationCode() {
    if (!pendingRegistration) return;

    try {
        await apiCall('/auth/send-verification', {
            method: 'POST',
            body: JSON.stringify({
                email: pendingRegistration.email,
                companyName: pendingRegistration.company
            })
        });

        showToast('Verification code resent.');
        startResendTimer();

    } catch (error) {
        console.error('Resend error:', error);
        showToast('Verification code resent.');
        startResendTimer();
    }
}

// 재전송 타이머
function startResendTimer() {
    const resendBtn = document.getElementById('resend-btn');
    const timerEl = document.getElementById('resend-timer');
    const countEl = document.getElementById('timer-count');

    resendBtn.disabled = true;
    resendBtn.style.display = 'none';
    timerEl.style.display = 'inline';

    let seconds = 60;
    countEl.textContent = seconds;

    if (verificationTimer) clearInterval(verificationTimer);

    verificationTimer = setInterval(() => {
        seconds--;
        countEl.textContent = seconds;

        if (seconds <= 0) {
            clearInterval(verificationTimer);
            resendBtn.disabled = false;
            resendBtn.style.display = 'inline';
            timerEl.style.display = 'none';
        }
    }, 1000);
}

// 회원가입으로 돌아가기
function backToRegister() {
    if (verificationTimer) {
        clearInterval(verificationTimer);
        verificationTimer = null;
    }
    hideAllAuthForms();
    document.querySelector('.wd-auth-tabs').style.display = 'flex';
    document.getElementById('register-form').classList.add('active');
    document.querySelector('.wd-auth-tab[data-tab="register"]').click();
}

// 알림 로드
async function loadNotifications() {
    const supplierId = localStorage.getItem('supplier_id') || '1';

    try {
        const data = await apiCall(`/notifications/${supplierId}`);
        updateNotificationBadge(data.unread_count);
        renderNotifications(data.notifications);
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderNotifications(notifications) {
    const container = document.getElementById('notification-list');
    if (!container) return;

    container.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="handleNotificationClick(${n.id}, '${n.action_url}')">
            <div class="notification-icon ${n.type}">${getNotificationIcon(n.type)}</div>
            <div class="notification-content">
                <div class="notification-title">${n.title}</div>
                <div class="notification-message">${n.message}</div>
            </div>
        </div>
    `).join('');
}

function getNotificationIcon(type) {
    const icons = {
        data_completion: '📊',
        inquiry: '📨',
        system: '🔔'
    };
    return icons[type] || '🔔';
}

async function handleNotificationClick(notificationId, actionUrl) {
    try {
        await apiCall(`/notifications/${notificationId}/read`, { method: 'PUT' });
    } catch (e) {}

    if (actionUrl) {
        // 내부 네비게이션
        if (actionUrl.startsWith('/products')) {
            showSection('product-list');
        } else if (actionUrl.startsWith('/inquiries')) {
            showSection('inquiries');
        }
    }
}

// Google 소셜 로그인
function handleGoogleLogin() {
    // Google OAuth 초기화 및 로그인
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredential,
            auto_select: false
        });

        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // 팝업이 표시되지 않으면 수동으로 One Tap 표시
                console.log('Google One Tap not displayed, trying popup...');
                googlePopupLogin();
            }
        });
    } else {
        console.error('Google SDK not loaded');
        showToast('Google login is not available. Please try again later.', 'error');
    }
}

// Google OAuth 팝업 방식
function googlePopupLogin() {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile',
            callback: (response) => {
                if (response.access_token) {
                    fetchGoogleUserInfo(response.access_token);
                }
            }
        });
        client.requestAccessToken();
    } else {
        showToast('Google login is not available. Please try again later.', 'error');
    }
}

// Google Credential 콜백
function handleGoogleCredential(response) {
    if (response.credential) {
        // JWT 토큰을 백엔드로 전송
        processGoogleAuth(response.credential);
    }
}

// Google 사용자 정보 가져오기
async function fetchGoogleUserInfo(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const userInfo = await response.json();
        processGoogleUserInfo(userInfo);
    } catch (error) {
        console.error('Failed to fetch Google user info:', error);
        showToast('Google login failed. Please try again.', 'error');
    }
}

// Google 인증 처리 (백엔드 연동)
async function processGoogleAuth(credential) {
    try {
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            if (res.status === 401) {
                showToast(err.message || '아직 가입되지 않은 계정입니다. 가입 먼저 해주세요.', 'error');
                return;
            }
            throw new Error(err.message || 'Google login failed');
        }

        const response = await res.json();
        localStorage.setItem('supplier_logged_in', 'true');
        localStorage.setItem('supplier_token', response.access_token);
        localStorage.setItem('supplier_id', response.supplier_id);
        localStorage.setItem('supplier_email', response.email);
        localStorage.setItem('supplier_name', response.company_name || response.email.split('@')[0]);

        showDashboard();
        loadNotifications();
        showToast('Successfully logged in with Google!');

    } catch (error) {
        console.error('Google auth error:', error);
        showToast(error.message || 'Google login failed. Please try again.', 'error');
    }
}

// Google 사용자 정보로 로그인 (팝업 방식 - access_token → userinfo)
async function processGoogleUserInfo(userInfo) {
    // 팝업 방식은 credential(JWT)이 없으므로 지원 불가 알림
    showToast('No account found for this email. Please register first.', 'error');
}

// 비밀번호 찾기 화면
function showForgotPassword(e) {
    e.preventDefault();
    hideAllAuthForms();
    document.querySelector('.wd-auth-tabs').style.display = 'none';
    document.getElementById('forgot-form').style.display = 'block';
}

// 비밀번호 재설정 링크 발송
async function sendResetLink() {
    const email = document.getElementById('forgot-email').value;

    if (!email) {
        showToast('Please enter your email address.', 'error');
        return;
    }

    try {
        await apiCall('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        showResetSent(email);

    } catch (error) {
        console.error('Reset link error:', error);
        // 데모 모드
        showResetSent(email);
    }
}

// 재설정 링크 발송 완료 화면
function showResetSent(email) {
    hideAllAuthForms();
    document.getElementById('reset-sent-form').style.display = 'block';
    document.getElementById('reset-email-display').textContent = email;
}

// 로그인으로 돌아가기
function backToLogin() {
    hideAllAuthForms();
    document.querySelector('.wd-auth-tabs').style.display = 'flex';
    document.getElementById('login-form').classList.add('active');
    document.querySelector('.wd-auth-tab[data-tab="login"]').classList.add('active');
    document.querySelector('.wd-auth-tab[data-tab="register"]').classList.remove('active');
}

// 로그아웃
function logout() {
    localStorage.removeItem('supplier_logged_in');
    localStorage.removeItem('supplier_token');
    localStorage.removeItem('supplier_id');
    localStorage.removeItem('supplier_email');
    localStorage.removeItem('supplier_name');

    // index 페이지로 리다이렉트
    window.location.href = '../index.html';
}

// 대시보드 표시
function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('user-menu').style.display = 'flex';
    document.getElementById('user-name').textContent = localStorage.getItem('supplier_name') || 'Supplier';
    document.body.classList.add('dashboard-mode');
}

// 초기 로드 시 로그인 상태 확인
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('supplier_logged_in') === 'true') {
        const token = localStorage.getItem('supplier_token');
        if (!token) {
            handleSessionExpired();
            return;
        }

        // JWT 토큰 만료 여부 로컬 확인
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && payload.exp * 1000 < Date.now()) {
                handleSessionExpired();
                return;
            }
        } catch (e) {
            console.warn('Token decode failed:', e);
            handleSessionExpired();
            return;
        }

        showDashboard();
    }

    // Custom Country Select 초기화
    initCountrySelect();
});

// ==================== Custom Country Select ====================

function initCountrySelect() {
    const countrySelect = document.getElementById('country-select');
    if (!countrySelect) return;

    const trigger = document.getElementById('country-trigger');
    const dropdown = document.getElementById('country-dropdown');
    const searchInput = document.getElementById('country-search');
    const countryList = document.getElementById('country-list');
    const hiddenInput = document.getElementById('reg-country');
    const selectedFlag = document.getElementById('selected-flag');
    const selectedCountry = document.getElementById('selected-country');

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        countrySelect.classList.toggle('open');

        if (countrySelect.classList.contains('open')) {
            searchInput.focus();
            searchInput.value = '';
            filterCountries('');
        }
    });

    // Handle country option click
    countryList.addEventListener('click', (e) => {
        const option = e.target.closest('.wd-country-option');
        if (!option) return;

        const value = option.dataset.value;
        const name = option.dataset.name;
        const flagImg = option.querySelector('.wd-country-option-flag');

        // Update hidden input value
        hiddenInput.value = value;

        // Update trigger display with image flag
        if (flagImg) {
            selectedFlag.src = flagImg.src;
            selectedFlag.alt = value;
            selectedFlag.style.display = 'block';
        }
        selectedCountry.textContent = name;
        selectedCountry.classList.remove('placeholder');

        // Update selected state
        countryList.querySelectorAll('.wd-country-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        option.classList.add('selected');

        // Close dropdown
        countrySelect.classList.remove('open');
    });

    // Filter countries on search
    searchInput.addEventListener('input', (e) => {
        filterCountries(e.target.value.toLowerCase());
    });

    // Prevent search input click from closing dropdown
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!countrySelect.contains(e.target)) {
            countrySelect.classList.remove('open');
        }
    });

    // Close dropdown on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && countrySelect.classList.contains('open')) {
            countrySelect.classList.remove('open');
        }
    });

    function filterCountries(searchTerm) {
        const options = countryList.querySelectorAll('.wd-country-option');
        const groupLabels = countryList.querySelectorAll('.wd-country-group-label');

        // Track which groups have visible options
        const visibleGroups = new Set();

        options.forEach(option => {
            const name = (option.dataset.name || '').toLowerCase();
            const code = (option.dataset.value || '').toLowerCase();

            if (name.includes(searchTerm) || code.includes(searchTerm)) {
                option.style.display = '';
                // Find the group this option belongs to
                let prevSibling = option.previousElementSibling;
                while (prevSibling) {
                    if (prevSibling.classList.contains('wd-country-group-label')) {
                        visibleGroups.add(prevSibling);
                        break;
                    }
                    prevSibling = prevSibling.previousElementSibling;
                }
            } else {
                option.style.display = 'none';
            }
        });

        // Show/hide group labels based on visible options
        groupLabels.forEach(label => {
            label.style.display = visibleGroups.has(label) ? '' : 'none';
        });
    }
}

// ==================== Sidebar Toggle ====================

function toggleSidebar() {
    const sidebar = document.querySelector('.wd-sidebar');
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
}

// Restore sidebar state on page load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('sidebar-collapsed') === 'true') {
        document.querySelector('.wd-sidebar')?.classList.add('collapsed');
    }
});

// ==================== Dashboard Navigation ====================

function showSection(sectionName) {
    // 패널 전환
    document.querySelectorAll('.dashboard-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`panel-${sectionName}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }

    // 네비게이션 버튼 활성화 상태 업데이트 (기존 nav-btn)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionName) {
            btn.classList.add('active');
            const navGroup = btn.closest('.nav-group');
            if (navGroup) {
                navGroup.classList.add('expanded');
            }
        }
    });

    // 새 디자인 시스템 네비게이션 (wd-nav-item)
    document.querySelectorAll('.wd-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
            const navGroup = item.closest('.wd-nav-group');
            if (navGroup) {
                navGroup.classList.add('expanded');
            }
        }
    });

    // Section-specific data loading
    if (sectionName === 'accounts') {
        loadAccountListFromAPI();
    }
    if (sectionName === 'buyer-discovery') {
        loadInquiredBuyers();
    }
}

// 서브메뉴 토글
function toggleSubmenu(btn) {
    // 기존 nav-group 지원
    let navGroup = btn.closest('.nav-group');
    if (navGroup) {
        navGroup.classList.toggle('expanded');
        return;
    }

    // 새 wd-nav-group 지원
    navGroup = btn.closest('.wd-nav-group');
    if (navGroup) {
        navGroup.classList.toggle('expanded');
    }
}

// ==================== Price List Toggle ====================

function togglePriceListSection() {
    const section = document.getElementById('pricelist-section');
    const content = document.getElementById('pricelist-content');

    if (section && content) {
        section.classList.toggle('expanded');
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    }
}

// ==================== Extracted Products ====================

// 선택된 상품 수 업데이트
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.extract-checkbox:checked');
    const count = checkboxes.length;
    const countEl = document.getElementById('selected-count');
    const moveBtn = document.getElementById('move-to-list-btn');

    if (countEl) {
        countEl.textContent = `(${count})`;
    }
    if (moveBtn) {
        moveBtn.disabled = count === 0;
    }
}

// 전체 선택 토글
function toggleSelectAllExtracted() {
    const selectAll = document.getElementById('select-all-extracted');
    const checkboxes = document.querySelectorAll('.extract-checkbox');

    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });

    updateSelectedCount();
}

// 전체 선택 버튼
function selectAllExtracted() {
    const selectAll = document.getElementById('select-all-extracted');
    selectAll.checked = true;
    toggleSelectAllExtracted();
}

// 상품 목록으로 이동
function moveToProductList() {
    const checkboxes = document.querySelectorAll('.extract-checkbox:checked');
    const count = checkboxes.length;

    if (count === 0) {
        showToast(t('catalog.selectProducts'), 'warning');
        return;
    }

    // 선택된 상품의 행 제거
    checkboxes.forEach(cb => {
        const row = cb.closest('tr');
        if (row) {
            row.remove();
        }
    });

    // 선택 카운트 초기화
    document.getElementById('select-all-extracted').checked = false;
    updateSelectedCount();

    // 성공 메시지
    showToast(`${count} ${t('catalog.movedSuccess')}`, 'success');

    // 상품 목록 패널로 이동
    setTimeout(() => {
        showSection('product-list');
    }, 1000);
}

// 추출된 상품 편집
function editExtractedProduct(productId) {
    // TODO: 모달 열기 및 데이터 로드
    console.log('Edit extracted product:', productId);
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 상품 목록 필터
function filterProductList() {
    const filter = document.getElementById('product-list-filter').value;
    const rows = document.querySelectorAll('#product-list-tbody tr');

    rows.forEach(row => {
        const isWarning = row.classList.contains('wd-row-warning');
        let show = true;

        switch (filter) {
            case 'complete':
                show = !isWarning;
                break;
            case 'incomplete':
                show = isWarning;
                break;
            case 'no-moq':
            case 'no-image':
            case 'no-cert':
                show = isWarning;
                break;
        }

        row.style.display = show ? '' : 'none';
    });
}

// ==================== File Upload ====================

const uploadedFiles = {
    catalog: null,
    pricelist: null,
    cert: []
};

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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0], type);
    }
}

function handleFileSelect(e, type) {
    const files = e.target.files;
    if (type === 'cert') {
        // 인증서는 여러 개 가능
        Array.from(files).forEach(file => handleFile(file, type));
    } else if (files.length > 0) {
        handleFile(files[0], type);
    }
}

function handleFile(file, type) {
    // 파일 크기 체크
    const maxSize = type === 'cert' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast(`File too large. Max size: ${maxSize / 1024 / 1024}MB`, 'error');
        return;
    }

    // 파일 확장자 체크
    const allowedTypes = {
        catalog: ['.pdf', '.xlsx', '.xls', '.csv'],
        pricelist: ['.pdf', '.xlsx', '.xls', '.csv'],
        cert: ['.pdf', '.jpg', '.jpeg', '.png']
    };

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes[type].includes(ext)) {
        showToast(`Invalid file type. Allowed: ${allowedTypes[type].join(', ')}`, 'error');
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

function showUploadedFile(type, filename) {
    document.getElementById(`${type}-dropzone`).style.display = 'none';
    document.getElementById(`${type}-uploaded`).style.display = 'flex';
    document.getElementById(`${type}-filename`).textContent = filename;
}

function removeFile(type) {
    uploadedFiles[type] = null;
    document.getElementById(`${type}-dropzone`).style.display = 'block';
    document.getElementById(`${type}-uploaded`).style.display = 'none';
    document.getElementById(`${type}-file`).value = '';
}

function updateCertList() {
    const list = document.getElementById('cert-list');
    list.innerHTML = uploadedFiles.cert.map((file, index) => `
        <div class="uploaded-file">
            <span class="file-icon">📄</span>
            <span class="file-name">${file.name}</span>
            <button class="btn-remove" onclick="removeCert(${index})">×</button>
        </div>
    `).join('');
}

function removeCert(index) {
    uploadedFiles.cert.splice(index, 1);
    updateCertList();
}

// ==================== File Processing ====================

let currentJobId = null;

async function processUploads() {
    // 카탈로그는 필수
    if (!uploadedFiles.catalog) {
        showToast('Please upload a product catalog (required)', 'error');
        return;
    }

    // 처리 상태 표시
    document.getElementById('processing-status').style.display = 'block';
    const steps = ['upload', 'parse', 'extract', 'review'];

    try {
        // Step 1: 파일 업로드
        updateProcessingStep(steps, 0);

        // 카탈로그 업로드
        const catalogResult = await uploadFile('/upload/catalog', uploadedFiles.catalog);
        currentJobId = catalogResult.job_id;

        // 가격표 업로드 (선택)
        if (uploadedFiles.pricelist) {
            await uploadFile('/upload/pricelist', uploadedFiles.pricelist);
        }

        // 인증서 업로드 (선택)
        for (const cert of uploadedFiles.cert) {
            await uploadFile('/upload/certificate', cert, { certificate_type: 'general' });
        }

        // Step 2-4: 서버 처리 상태 폴링
        await pollProcessingStatus(steps);

    } catch (error) {
        console.error('Upload error:', error);
        showToast(error.message || 'Upload failed. Please try again.', 'error');
        document.getElementById('processing-status').style.display = 'none';
        return;
    }

    // 완료
    document.getElementById(`step-${steps[steps.length - 1]}`).classList.remove('active');
    document.getElementById(`step-${steps[steps.length - 1]}`).classList.add('complete');
    document.getElementById('progress-fill').style.width = '100%';
    document.getElementById('progress-text').textContent = 'Processing complete!';

    showToast('Catalog processed successfully!');

    // 2초 후 상태 패널 숨기고 결과 표시
    await delay(2000);
    document.getElementById('processing-status').style.display = 'none';

    // 데이터 완성도 체크 요청
    checkDataCompleteness();
}

function updateProcessingStep(steps, currentIndex) {
    // 이전 단계 완료 표시
    if (currentIndex > 0) {
        document.getElementById(`step-${steps[currentIndex - 1]}`).classList.remove('active');
        document.getElementById(`step-${steps[currentIndex - 1]}`).classList.add('complete');
    }

    // 현재 단계 활성화
    document.getElementById(`step-${steps[currentIndex]}`).classList.add('active');

    // 진행률 업데이트
    const progress = (currentIndex + 1) * 25;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = getStepMessage(steps[currentIndex]);
}

async function pollProcessingStatus(steps) {
    if (!currentJobId) {
        // API 연동 전: 데모 시뮬레이션
        for (let i = 1; i < steps.length; i++) {
            updateProcessingStep(steps, i);
            await delay(1500);
        }
        document.getElementById('stat-products').textContent = '24';
        return;
    }

    // API 연동 후: 실제 상태 폴링
    let completed = false;
    let lastStage = 0;

    while (!completed) {
        try {
            const status = await apiCall(`/upload/status/${currentJobId}`);

            // 단계 매핑
            const stageMap = {
                'uploading': 0,
                'parsing': 1,
                'extracting': 2,
                'validating': 3,
                'complete': 4,
                'error': -1
            };

            const currentStage = stageMap[status.status] || 0;

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
    const messages = {
        upload: 'Uploading files...',
        parse: 'Parsing document structure...',
        extract: 'Extracting product information with AI...',
        review: 'Validating data...'
    };
    return messages[step];
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Data Completeness Check ====================

async function checkDataCompleteness() {
    const supplierId = localStorage.getItem('supplier_id') || '1';

    try {
        const data = await apiCall(`/data-completeness/${supplierId}`);
        updateCompletenessUI(data);
    } catch (error) {
        console.error('Failed to fetch completeness data:', error);
        // 데모 데이터 사용
        const demoData = {
            completeness_score: 65,
            total_products: 24,
            missing_summary: [
                { type: 'moq', label: 'Minimum Order Quantity', count: 5, priority: 'high', products: ['Aged Parmesan', 'Raw Honey', 'Balsamic Vinegar'] },
                { type: 'certifications', label: 'Certifications', count: 8, priority: 'medium', products: [] },
                { type: 'images', label: 'Product Images', count: 12, priority: 'medium', products: [] }
            ],
            recommendations: [
                'Critical: Please add Minimum Order Quantity for 5 products.',
                'Adding certifications can increase buyer confidence.'
            ]
        };
        updateCompletenessUI(demoData);
    }
}

function updateCompletenessUI(data) {
    // 완성도가 100% 미만이면 알림 표시
    if (data.completeness_score < 100) {
        showDataCompletenessAlert(data);
    }

    // 대시보드 통계 업데이트
    const completenessEl = document.getElementById('stat-completeness');
    if (completenessEl) {
        completenessEl.textContent = `${data.completeness_score}%`;
    }

    // 누락 항목별 카운트 업데이트
    if (data.missing_summary) {
        for (const item of data.missing_summary) {
            const countEl = document.getElementById(`missing-${item.type}-count`);
            if (countEl) {
                countEl.textContent = item.count;
            }
        }
    }
}

function showDataCompletenessAlert(data) {
    const alert = document.getElementById('data-completeness-alert');
    if (!alert) return;

    alert.style.display = 'flex';

    // 완성도 점수 업데이트
    const scoreEl = alert.querySelector('.completeness-score');
    if (scoreEl) {
        scoreEl.textContent = `${data.completeness_score}%`;
    }

    // 누락 항목 목록 업데이트
    const missingList = alert.querySelector('.missing-list');
    if (missingList && data.missing_summary) {
        missingList.innerHTML = data.missing_summary
            .filter(item => item.count > 0)
            .slice(0, 3)
            .map(item => `
                <div class="missing-item ${item.priority}">
                    <span class="missing-label">${item.label}</span>
                    <span class="missing-count">${item.count} products</span>
                    <button class="btn-fix" onclick="filterMissing('${item.type}')">Fix</button>
                </div>
            `).join('');
    }

    // 권장 사항 표시
    const recommendationsEl = alert.querySelector('.recommendations');
    if (recommendationsEl && data.recommendations) {
        recommendationsEl.innerHTML = data.recommendations
            .slice(0, 2)
            .map(rec => `<p class="recommendation">${rec}</p>`)
            .join('');
    }
}

function dismissCompletenessAlert() {
    const alert = document.getElementById('data-completeness-alert');
    if (alert) {
        alert.style.display = 'none';
    }
}

// ==================== Product Management ====================

function filterMissing(type) {
    showSection('product-list');
    document.getElementById('product-filter').value = `no-${type}`;
    // 필터 적용
}

// ==================== Product CRUD ====================

function openAddProductModal() {
    window._editingProductId = null;
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-edit-form').reset();
    // Clear all certification checkboxes
    document.querySelectorAll('#product-cert-grid input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('product-modal').style.display = 'flex';
}

async function editProduct(productId) {
    window._editingProductId = productId;
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-edit-form').reset();
    document.querySelectorAll('#product-cert-grid input[type="checkbox"]').forEach(cb => cb.checked = false);

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/products/${productId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) { handleSessionExpired(); return; }
        if (!res.ok) throw new Error('Failed to load product');
        const product = await res.json();

        document.getElementById('edit-product-name').value = product.name || '';
        document.getElementById('edit-product-sku').value = product.sku || '';
        document.getElementById('edit-product-category').value = product.category || '';
        document.getElementById('edit-product-status').value = product.status || 'active';
        document.getElementById('edit-product-description').value = product.description || '';
        document.getElementById('edit-price-min').value = product.min_price || '';
        document.getElementById('edit-price-max').value = product.max_price || '';
        document.getElementById('edit-moq').value = product.moq || '';
        document.getElementById('edit-moq-unit').value = product.moq_unit || '';

        // Set certification checkboxes
        if (product.certifications && product.certifications.length > 0) {
            product.certifications.forEach(cert => {
                const cb = document.querySelector(`#product-cert-grid input[value="${cert}"]`);
                if (cb) cb.checked = true;
            });
        }
    } catch (e) {
        console.error('Failed to load product for edit:', e);
        showToast('Failed to load product data', 'error');
    }

    document.getElementById('product-modal').style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
    window._editingProductId = null;
}

async function saveProduct() {
    const name = document.getElementById('edit-product-name')?.value?.trim();
    if (!name) {
        showToast('Product name is required', 'error');
        return;
    }

    // Gather selected certifications
    const certifications = [];
    document.querySelectorAll('#product-cert-grid input[type="checkbox"]:checked').forEach(cb => {
        certifications.push(cb.value);
    });

    const payload = {
        name,
        sku: document.getElementById('edit-product-sku')?.value || '',
        category: document.getElementById('edit-product-category')?.value || '',
        status: document.getElementById('edit-product-status')?.value || 'active',
        description: document.getElementById('edit-product-description')?.value || '',
        minPrice: parseFloat(document.getElementById('edit-price-min')?.value) || null,
        maxPrice: parseFloat(document.getElementById('edit-price-max')?.value) || null,
        moq: parseInt(document.getElementById('edit-moq')?.value) || null,
        moqUnit: document.getElementById('edit-moq-unit')?.value || '',
        certifications,
    };

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const isEdit = !!window._editingProductId;
        const url = isEdit ? `${baseUrl}/products/${window._editingProductId}` : `${baseUrl}/products`;
        const method = isEdit ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (res.status === 401) { handleSessionExpired(); return; }
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to save product');
        }

        showToast(isEdit ? 'Product updated!' : 'Product created!', 'success');
        closeProductModal();
        loadProducts();
    } catch (e) {
        console.error('Failed to save product:', e);
        showToast(e.message || 'Failed to save product', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) { handleSessionExpired(); return; }
        if (!res.ok) throw new Error('Failed to delete product');
        showToast('Product deleted', 'success');
        loadProducts();
    } catch (e) {
        console.error('Failed to delete product:', e);
        showToast('Failed to delete product', 'error');
    }
}

// Product list load from API
async function loadProducts(filter = null) {
    const tbody = document.getElementById('product-list-tbody');
    if (!tbody) return;

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        let url = `${baseUrl}/products`;
        const params = new URLSearchParams();
        if (filter) params.set('status', filter);
        if (params.toString()) url += `?${params.toString()}`;

        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) { handleSessionExpired(); return; }
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        renderProductList(data.products || []);
    } catch (error) {
        console.error('Failed to load products:', error);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:#999;">No products yet. Click "Add Product" to create one.</td></tr>`;
        }
    }
}

function renderProductList(products) {
    const tbody = document.getElementById('product-list-tbody');
    if (!tbody) return;

    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:#999;">No products yet. Click "Add Product" to create one.</td></tr>`;
        return;
    }

    const isIncomplete = (p) => (p.completeness || 0) < 70;

    tbody.innerHTML = products.map(product => {
        const priceDisplay = product.min_price
            ? (product.max_price ? `$${product.min_price} - $${product.max_price}` : `$${product.min_price}`)
            : '<span class="wd-text-muted">-</span>';

        const moqDisplay = product.moq
            ? `${product.moq}${product.moq_unit ? ' ' + product.moq_unit : ''}`
            : '<span class="wd-badge wd-badge-warning">Missing</span>';

        return `
        <tr class="${isIncomplete(product) ? 'wd-row-warning' : ''}">
            <td>
                <div class="wd-product-cell">
                    <div class="wd-product-thumb">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/></svg>
                    </div>
                    <div>
                        <span class="wd-product-name">${escapeHtml(product.name)}</span>
                        <div class="wd-product-sub">${escapeHtml(product.sku || '')}</div>
                    </div>
                </div>
            </td>
            <td>${product.category ? `<span class="wd-badge wd-badge-outline">${escapeHtml(product.category)}</span>` : '<span class="wd-badge wd-badge-warning">Missing</span>'}</td>
            <td>${escapeHtml(product.sku || '-')}</td>
            <td>${priceDisplay}</td>
            <td>${moqDisplay}</td>
            <td>
                ${product.certifications?.length > 0
                    ? product.certifications.map(c => `<span class="wd-badge wd-badge-success">${escapeHtml(c)}</span>`).join(' ')
                    : '<span class="wd-text-muted">None</span>'}
            </td>
            <td><span class="wd-badge ${isIncomplete(product) ? 'wd-badge-warning' : 'wd-badge-success'}">${isIncomplete(product) ? 'Incomplete' : 'Complete'}</span></td>
            <td>
                <div style="display:flex; gap:4px;">
                    <button class="wd-btn ${isIncomplete(product) ? 'wd-btn-warning' : 'wd-btn-outline'} wd-btn-sm" onclick="editProduct('${product.id}')">${isIncomplete(product) ? 'Fill in' : 'Edit'}</button>
                    <button class="wd-btn wd-btn-sm wd-btn-outline" onclick="deleteProduct('${product.id}')" title="Delete" style="color:#ef4444;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function addMOQ(productId) {
    editProduct(productId);
}

function addCert(productId) {
    editProduct(productId);
}

async function exportProducts() {
    showToast('Exporting products to CSV...', 'info');

    try {
        // 전체 상품 데이터 수집 (status, 페이지네이션 관계없이 모두)
        let products = await getAllProducts();

        if (!products || products.length === 0) {
            showToast('No products to export', 'warning');
            return;
        }

        // CSV 헤더 정의
        const headers = ['Product Name', 'Category', 'SKU', 'Min Price (FOB)', 'Max Price (FOB)', 'MOQ', 'Certifications', 'Status'];

        // CSV 데이터 생성
        const csvRows = [];
        csvRows.push(headers.join(','));

        products.forEach(product => {
            const { minPrice, maxPrice } = parsePriceRange(product.price);
            const row = [
                escapeCsvField(product.name || ''),
                escapeCsvField(product.category || ''),
                escapeCsvField(product.sku || ''),
                escapeCsvField(minPrice),
                escapeCsvField(maxPrice),
                escapeCsvField(product.moq || ''),
                escapeCsvField(Array.isArray(product.certifications) ? product.certifications.join('; ') : (product.certifications || '')),
                escapeCsvField(product.status || '')
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        // BOM 추가 (한글 등 유니코드 지원)
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        // 다운로드 실행
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().slice(0, 10);

        link.setAttribute('href', url);
        link.setAttribute('download', `products_export_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`Successfully exported ${products.length} products`, 'success');

    } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export products', 'error');
    }
}

// CSV 필드 이스케이프 (쉼표, 따옴표, 줄바꿈 처리)
function escapeCsvField(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// 가격 범위 파싱 (예: "$7.20 - $8.50" → { minPrice: "7.20", maxPrice: "8.50" })
function parsePriceRange(priceStr) {
    if (!priceStr) return { minPrice: '', maxPrice: '' };

    const str = String(priceStr).trim();

    // 범위 형식 확인 (예: "$7.20 - $8.50", "7.20-8.50", "$7.20~$8.50")
    const rangeMatch = str.match(/\$?\s*([\d,.]+)\s*[-~]\s*\$?\s*([\d,.]+)/);
    if (rangeMatch) {
        return {
            minPrice: rangeMatch[1].replace(/,/g, ''),
            maxPrice: rangeMatch[2].replace(/,/g, '')
        };
    }

    // 단일 가격 (예: "$18.00", "18.00")
    const singleMatch = str.match(/\$?\s*([\d,.]+)/);
    if (singleMatch) {
        const price = singleMatch[1].replace(/,/g, '');
        return { minPrice: price, maxPrice: price };
    }

    return { minPrice: '', maxPrice: '' };
}

// 전체 상품 목록 가져오기 (status, 페이지네이션 관계없이)
async function getAllProducts() {
    // 1. API에서 전체 상품 가져오기 시도
    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.products && data.products.length > 0) {
                return data.products;
            }
        }
    } catch (error) {
        console.log('API unavailable, using local data');
    }

    // 2. extractedProducts 배열 사용 (카탈로그 등록 후)
    if (extractedProducts && extractedProducts.length > 0) {
        return extractedProducts.map(p => ({
            name: p.name,
            category: p.category ? getCategoryLabel(p.category) : '',
            sku: p.sku || '',
            price: p.price || '',
            moq: p.moq || '',
            certifications: p.certifications || [],
            status: p.status || ''
        }));
    }

    // 3. 테이블에서 직접 데이터 추출 (DOM 파싱)
    const tableProducts = extractProductsFromTable();
    if (tableProducts.length > 0) {
        return tableProducts;
    }

    // 4. 데모 데이터 반환
    return getDemoProducts();
}

// 테이블에서 상품 데이터 추출
function extractProductsFromTable() {
    const products = [];
    const rows = document.querySelectorAll('#product-list-tbody tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            const nameEl = cells[0].querySelector('.product-name');
            const categoryEl = cells[1].querySelector('.category-badge');
            const certBadges = cells[5].querySelectorAll('.cert-badge');
            const statusEl = cells[6].querySelector('.status-dot');

            products.push({
                name: nameEl ? nameEl.textContent.trim() : '',
                category: categoryEl ? categoryEl.textContent.trim() : '',
                sku: cells[2] ? cells[2].textContent.trim() : '',
                price: cells[3] ? cells[3].textContent.trim() : '',
                moq: cells[4] ? cells[4].textContent.replace(/Missing|Add/gi, '').trim() : '',
                certifications: Array.from(certBadges).map(b => b.textContent.trim()),
                status: statusEl ? (statusEl.classList.contains('complete') ? 'Complete' : 'Incomplete') : ''
            });
        }
    });

    return products;
}

// 데모 상품 데이터
function getDemoProducts() {
    return [
        { name: 'Extra Virgin Olive Oil 500ml', category: 'Oils & Vinegars', sku: 'OIL-001', price: '$7.20 - $8.50', moq: '200 bottles', certifications: ['Organic', 'HACCP'], status: 'Complete' },
        { name: 'Aged Parmesan 24 months', category: 'Dairy & Cheese', sku: 'CHE-003', price: '$18.00 - $22.00', moq: '', certifications: ['DOP'], status: 'Incomplete' },
        { name: 'Raw Organic Honey 500g', category: 'Organic & Health', sku: 'HON-005', price: '$12.00', moq: '100 jars', certifications: ['Organic'], status: 'Complete' },
        { name: 'Balsamic Vinegar 250ml', category: 'Oils & Vinegars', sku: 'VIN-002', price: '$12.00 - $15.00', moq: '150 bottles', certifications: ['IGP'], status: 'Complete' },
        { name: 'Truffle Oil 100ml', category: 'Oils & Vinegars', sku: 'OIL-010', price: '$25.00', moq: '50 bottles', certifications: [], status: 'Incomplete' },
        { name: 'Artisan Pasta 500g', category: 'Pasta & Grains', sku: 'PAS-001', price: '$4.50', moq: '300 packs', certifications: ['Organic'], status: 'Complete' },
        { name: 'San Marzano Tomatoes 400g', category: 'Canned Goods', sku: 'CAN-001', price: '$3.20', moq: '500 cans', certifications: ['DOP'], status: 'Complete' },
        { name: 'Prosciutto di Parma 200g', category: 'Deli & Meats', sku: 'MEA-001', price: '$15.00 - $18.00', moq: '100 packs', certifications: ['DOP', 'HACCP'], status: 'Complete' },
        { name: 'Pecorino Romano 300g', category: 'Dairy & Cheese', sku: 'CHE-005', price: '$14.00', moq: '', certifications: ['DOP'], status: 'Incomplete' },
        { name: 'Limoncello 500ml', category: 'Beverages', sku: 'BEV-001', price: '$18.00', moq: '100 bottles', certifications: [], status: 'Incomplete' }
    ];
}

// ==================== Profile ====================

let cropper = null;
let currentLogoFile = null;

function saveProfile(e) {
    e.preventDefault();
    showToast('Profile saved successfully!');
}

// 로고 파일 선택 핸들러
function handleLogoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 파일 유효성 검사
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file.', 'error');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showToast('File size must be less than 2MB.', 'error');
        return;
    }

    currentLogoFile = file;

    // Crop 모달 열기
    const reader = new FileReader();
    reader.onload = function(e) {
        const cropImage = document.getElementById('crop-image');
        cropImage.src = e.target.result;
        document.getElementById('crop-modal').style.display = 'flex';

        // 기존 cropper 제거
        if (cropper) {
            cropper.destroy();
        }

        // Cropper 초기화
        cropper = new Cropper(cropImage, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false
        });
    };
    reader.readAsDataURL(file);
}

// Crop 모달 닫기
function closeCropModal() {
    document.getElementById('crop-modal').style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    // 파일 입력 초기화
    document.getElementById('logo-input').value = '';
}

// Crop 적용
function applyCrop() {
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({
        width: 200,
        height: 200,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });

    if (!canvas) {
        showToast('Failed to crop image.', 'error');
        return;
    }

    // 미리보기 업데이트
    const previewImg = document.getElementById('logo-preview-img');
    const placeholder = document.getElementById('logo-placeholder');
    const removeBtn = document.getElementById('remove-logo-btn');

    previewImg.src = canvas.toDataURL('image/png');
    previewImg.style.display = 'block';
    placeholder.style.display = 'none';
    removeBtn.style.display = 'inline-flex';

    // 모달 닫기
    closeCropModal();

    showToast('Logo updated successfully!');

    // TODO: 서버에 업로드
    // canvas.toBlob(function(blob) {
    //     const formData = new FormData();
    //     formData.append('logo', blob, 'logo.png');
    //     // API 호출
    // }, 'image/png');
}

// 로고 제거
function removeLogo() {
    if (!confirm('Are you sure you want to remove the logo?')) return;

    const previewImg = document.getElementById('logo-preview-img');
    const placeholder = document.getElementById('logo-placeholder');
    const removeBtn = document.getElementById('remove-logo-btn');

    previewImg.src = '';
    previewImg.style.display = 'none';
    placeholder.style.display = 'flex';
    removeBtn.style.display = 'none';

    // 파일 입력 초기화
    document.getElementById('logo-input').value = '';

    showToast('Logo removed.');

    // TODO: 서버에서 로고 삭제 API 호출
}

// ==================== Utilities ====================

function showToast(message, type = 'success') {
    // 기존 토스트 제거
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#2563eb'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.success}</span>
        <span class="toast-message">${message}</span>
    `;

    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.success};
        color: white;
        padding: 14px 24px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.95rem;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

// ==================== Catalog Step Navigation ====================

let currentCatalogStep = 1;
let extractedProducts = [];
let priceMatchedProducts = [];

// Step으로 이동
function goToCatalogStep(stepNum) {
    // 현재 스텝 숨기기
    document.getElementById(`catalog-step-${currentCatalogStep}`).style.display = 'none';

    // 스텝 인디케이터 업데이트
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`step-indicator-${i}`);
        indicator.classList.remove('active', 'completed');

        if (i < stepNum) {
            indicator.classList.add('completed');
        } else if (i === stepNum) {
            indicator.classList.add('active');
        }
    }

    // 커넥터 업데이트
    for (let i = 1; i <= 3; i++) {
        const connector = document.getElementById(`connector-${i}`);
        if (connector) {
            if (i < stepNum) {
                connector.classList.add('completed');
            } else {
                connector.classList.remove('completed');
            }
        }
    }

    // 새 스텝 표시
    currentCatalogStep = stepNum;
    document.getElementById(`catalog-step-${stepNum}`).style.display = 'block';

    // 스텝별 데이터 로드
    if (stepNum === 2) {
        loadExtractedProducts();
    } else if (stepNum === 3) {
        renderPriceMatchTable();
    } else if (stepNum === 4) {
        showCompleteSummary();
    }
}

// 카탈로그 추출 시작
async function extractCatalog() {
    if (!uploadedFiles.catalog) {
        showToast(t('catalog.uploadRequired') || 'Please upload a catalog file first', 'error');
        return;
    }

    const extractBtn = document.getElementById('extract-btn');
    extractBtn.disabled = true;
    extractBtn.innerHTML = `<span class="spinner"></span> ${t('catalog.extracting') || 'Extracting...'}`;

    try {
        // 파일 업로드 및 추출 API 호출
        const result = await uploadFile('/upload/catalog', uploadedFiles.catalog);
        currentJobId = result.job_id;

        // 처리 상태 폴링
        await pollCatalogExtraction();

        showToast(t('catalog.extractSuccess') || 'Products extracted successfully!', 'success');
        goToCatalogStep(2);

    } catch (error) {
        console.error('Extraction error:', error);

        // 데모 모드: 시뮬레이션 데이터 생성
        await simulateCatalogExtraction();
        showToast(t('catalog.extractSuccess') || 'Products extracted successfully!', 'success');
        goToCatalogStep(2);
    }

    extractBtn.disabled = false;
    extractBtn.innerHTML = `<span data-i18n="catalog.extractProducts">${t('catalog.extractProducts') || 'Extract Products'}</span> <span class="btn-arrow">→</span>`;
}

// 카탈로그 추출 시뮬레이션 (데모 모드)
async function simulateCatalogExtraction() {
    // 로딩 시뮬레이션
    await delay(2000);

    // 데모 추출 데이터 (originalPrice: 카탈로그에서 추출된 원본 가격)
    extractedProducts = [
        { id: 'e1', name: 'Extra Virgin Olive Oil 500ml', category: 'oils', originalPrice: '$7.20 - $8.50', price: '$7.20 - $8.50', status: 'complete', emoji: '🫒' },
        { id: 'e2', name: 'Aged Parmesan Cheese 12m', category: null, originalPrice: '$18.00', price: '$18.00', status: 'incomplete', emoji: '🧀' },
        { id: 'e3', name: 'Raw Organic Honey 500g', category: 'organic', originalPrice: null, price: null, status: 'incomplete', emoji: '🍯' },
        { id: 'e4', name: 'Balsamic Vinegar 250ml', category: 'oils', originalPrice: '$12.00 - $15.00', price: '$12.00 - $15.00', status: 'complete', emoji: '🍷' },
        { id: 'e5', name: 'Truffle Oil 100ml', category: 'oils', originalPrice: '$25.00', price: '$25.00', status: 'complete', emoji: '🫒' },
        { id: 'e6', name: 'Artisan Pasta 500g', category: null, originalPrice: '$4.50', price: '$4.50', status: 'incomplete', emoji: '🍝' }
    ];
}

// 추출된 상품 로드 및 표시
function loadExtractedProducts() {
    const tbody = document.getElementById('extracted-products-tbody');
    const totalEl = document.getElementById('extracted-total');
    const completeEl = document.getElementById('complete-count');
    const incompleteEl = document.getElementById('incomplete-count');

    if (!extractedProducts.length) {
        // 데모 데이터 사용
        simulateCatalogExtraction().then(() => loadExtractedProducts());
        return;
    }

    // 카운트 업데이트
    const completeCount = extractedProducts.filter(p => p.status === 'complete').length;
    const incompleteCount = extractedProducts.length - completeCount;

    totalEl.textContent = extractedProducts.length;
    completeEl.textContent = completeCount;
    incompleteEl.textContent = incompleteCount;

    // 테이블 렌더링
    tbody.innerHTML = extractedProducts.map(product => {
        const isIncomplete = product.status === 'incomplete';
        return `
            <tr class="${isIncomplete ? 'wd-row-warning' : ''}">
                <td class="col-checkbox"><input type="checkbox" class="extract-checkbox" data-id="${product.id}" onchange="updateSelectedCount()" checked></td>
                <td>
                    <div class="wd-product-cell">
                        <span class="wd-product-thumb">${product.emoji}</span>
                        <span class="wd-product-name">${product.name}</span>
                    </div>
                </td>
                <td>
                    ${product.category
                        ? `<span class="wd-badge wd-badge-outline">${getCategoryLabel(product.category)}</span>`
                        : `<span class="wd-badge wd-badge-warning">${t('products.missing') || 'Missing'}</span>`
                    }
                </td>
                <td>${product.price || '<span class="wd-text-muted">-</span>'}</td>
                <td><span class="wd-badge ${isIncomplete ? 'wd-badge-warning' : 'wd-badge-success'}">${t('products.' + product.status) || product.status}</span></td>
                <td>
                    <button class="wd-btn wd-btn-sm ${isIncomplete ? 'wd-btn-warning' : 'wd-btn-outline'}"
                            onclick="editExtractedProduct('${product.id}')">
                        ${isIncomplete ? t('products.fillIn') || 'Fill in' : t('products.edit') || 'Edit'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 카테고리 라벨 가져오기
function getCategoryLabel(category) {
    const labels = {
        oils: 'Oils & Vinegars',
        dairy: 'Dairy & Cheese',
        organic: 'Organic & Health',
        beverages: 'Beverages',
        snacks: 'Snacks',
        sauces: 'Sauces'
    };
    return labels[category] || category;
}

// 가격표 리셋 - 원래 카탈로그 가격으로 복원
function resetPriceList() {
    // 원본 가격으로 복원
    extractedProducts.forEach(product => {
        product.price = product.originalPrice;
    });

    // 매칭 데이터 초기화
    priceMatchedProducts = [];
    uploadedFiles.pricelist = null;

    // UI 초기화 - 업로드 영역 표시, 업로드 완료 정보 숨기기
    document.getElementById('pricelist-upload-area').style.display = 'flex';
    document.getElementById('pricelist-uploaded-area').style.display = 'none';

    // 파일 입력 초기화
    const pricelistFile = document.getElementById('pricelist-file');
    if (pricelistFile) pricelistFile.value = '';

    // 테이블 다시 렌더링
    renderPriceMatchTable();

    showToast(t('catalog.priceListReset') || 'Price list has been reset. Original prices restored.', 'success');
}

// 가격 매칭 스킵
function skipPriceMatching() {
    showToast(t('catalog.priceSkipped') || 'Price matching skipped. You can add prices later.', 'info');
    goToCatalogStep(4);
}

// 완료 서머리 표시
function showCompleteSummary() {
    const completeCount = extractedProducts.filter(p => p.status === 'complete').length;
    const incompleteCount = extractedProducts.length - completeCount;
    const priceCount = priceMatchedProducts.length || extractedProducts.filter(p => p.price).length;

    document.getElementById('registered-count').textContent = extractedProducts.length;
    document.getElementById('final-complete-count').textContent = completeCount;
    document.getElementById('final-incomplete-count').textContent = incompleteCount;
    document.getElementById('final-price-count').textContent = priceCount;
}

// 새 카탈로그 등록 시작
function startNewCatalog() {
    // 데이터 초기화
    extractedProducts = [];
    priceMatchedProducts = [];
    uploadedFiles.catalog = null;
    uploadedFiles.pricelist = null;

    // UI 초기화
    removeFile('catalog');

    // Price list UI 초기화
    const pricelistUploadArea = document.getElementById('pricelist-upload-area');
    const pricelistUploadedArea = document.getElementById('pricelist-uploaded-area');
    if (pricelistUploadArea) pricelistUploadArea.style.display = 'flex';
    if (pricelistUploadedArea) pricelistUploadedArea.style.display = 'none';

    // Step 1로 이동
    currentCatalogStep = 1;
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`catalog-step-${i}`).style.display = i === 1 ? 'block' : 'none';
        const indicator = document.getElementById(`step-indicator-${i}`);
        indicator.classList.remove('active', 'completed');
        if (i === 1) indicator.classList.add('active');
    }

    // 커넥터 초기화
    for (let i = 1; i <= 3; i++) {
        const connector = document.getElementById(`connector-${i}`);
        if (connector) connector.classList.remove('completed');
    }

    // 버튼 상태 초기화
    document.getElementById('extract-btn').disabled = true;
}

// 카탈로그 추출 상태 폴링
async function pollCatalogExtraction() {
    if (!currentJobId) return;

    let completed = false;
    while (!completed) {
        try {
            const status = await apiCall(`/upload/status/${currentJobId}`);

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

// 파일 업로드 시 Extract 버튼 활성화
function showUploadedFile(type, filename) {
    const dropzone = document.getElementById(`${type}-dropzone`);
    const uploaded = document.getElementById(`${type}-uploaded`);
    const filenameEl = document.getElementById(`${type}-filename`);
    const filesizeEl = document.getElementById(`${type}-filesize`);

    if (dropzone) dropzone.style.display = 'none';
    if (uploaded) uploaded.style.display = 'flex';
    if (filenameEl) filenameEl.textContent = filename;

    // 파일 사이즈 표시
    if (filesizeEl && uploadedFiles[type]) {
        const size = uploadedFiles[type].size;
        const sizeStr = size < 1024 * 1024
            ? `${(size / 1024).toFixed(1)} KB`
            : `${(size / (1024 * 1024)).toFixed(1)} MB`;
        filesizeEl.textContent = sizeStr;
    }

    // 카탈로그 업로드 시 Extract 버튼 활성화
    if (type === 'catalog') {
        document.getElementById('extract-btn').disabled = false;
    }

    // 가격표 업로드 시 매칭 처리
    if (type === 'pricelist') {
        processPriceListMatching();
    }
}

// 가격표 매칭 처리 - 가격 덮어쓰기
async function processPriceListMatching() {
    showToast(t('catalog.matchingPrices') || 'Matching prices...', 'info');

    try {
        // API 호출 시도
        const result = await uploadFile('/upload/pricelist', uploadedFiles.pricelist);
        priceMatchedProducts = result.matched || [];

        // API 결과로 가격 덮어쓰기
        priceMatchedProducts.forEach(matched => {
            const product = extractedProducts.find(p => p.id === matched.id);
            if (product && matched.price) {
                product.price = matched.price;
            }
        });
    } catch (error) {
        // 데모 모드: 시뮬레이션 - 일부 가격 변경
        await delay(1500);

        // 데모 가격표 데이터 (기존 가격 덮어쓰기)
        const demoPriceList = [
            { id: 'e1', price: '$7.50' },      // 변경됨
            { id: 'e2', price: '$19.00' },     // 변경됨
            { id: 'e3', price: '$12.00' },     // 새로 추가됨 (기존 null)
            { id: 'e4', price: '$14.00' },     // 변경됨
            // e5, e6는 가격표에 없음
        ];

        priceMatchedProducts = demoPriceList;

        // 가격 덮어쓰기
        demoPriceList.forEach(priceItem => {
            const product = extractedProducts.find(p => p.id === priceItem.id);
            if (product) {
                product.price = priceItem.price;
            }
        });
    }

    // UI 업데이트 - 업로드 영역 숨기고 업로드 완료 정보 표시
    document.getElementById('pricelist-upload-area').style.display = 'none';
    document.getElementById('pricelist-uploaded-area').style.display = 'flex';
    document.getElementById('pricelist-filename').textContent = uploadedFiles.pricelist?.name || 'price_list.xlsx';
    document.getElementById('price-matched-count').textContent = priceMatchedProducts.length;
    document.getElementById('price-total-count').textContent = extractedProducts.length;

    // 매칭 테이블 렌더링
    renderPriceMatchTable();

    showToast(t('catalog.pricesMatched') || 'Prices matched and updated!', 'success');
}

// 가격 매칭 테이블 렌더링
function renderPriceMatchTable() {
    const tbody = document.getElementById('price-match-tbody');
    if (!tbody) return;

    const hasPriceList = priceMatchedProducts.length > 0;

    tbody.innerHTML = extractedProducts.map(product => {
        const matched = priceMatchedProducts.find(m => m.id === product.id);
        const originalPrice = product.originalPrice;
        const newPrice = matched ? product.price : null;
        const priceChanged = matched && originalPrice !== newPrice;
        const needsFillIn = !product.category || (!originalPrice && !newPrice);

        return `
            <tr class="${needsFillIn ? 'wd-row-warning' : ''}">
                <td class="col-checkbox"></td>
                <td>
                    <div class="wd-product-cell">
                        <span class="wd-product-thumb">${product.emoji}</span>
                        <span class="wd-product-name">${product.name}</span>
                    </div>
                </td>
                <td>
                    ${product.category
                        ? `<span class="wd-badge wd-badge-outline">${getCategoryLabel(product.category)}</span>`
                        : `<span class="wd-badge wd-badge-warning">${t('products.missing') || 'Missing'}</span>`
                    }
                </td>
                <td>${originalPrice || '<span class="wd-text-muted">-</span>'}</td>
                <td class="${priceChanged ? 'wd-price-updated' : ''}">
                    ${hasPriceList
                        ? (newPrice || '<span class="wd-text-muted">-</span>')
                        : '<span class="wd-text-muted">-</span>'
                    }
                </td>
                <td>
                    <button class="wd-btn wd-btn-sm ${needsFillIn ? 'wd-btn-warning' : 'wd-btn-outline'}"
                            onclick="editProductPrice('${product.id}')">
                        ${needsFillIn ? t('products.fillIn') || 'Fill in' : t('products.edit') || 'Edit'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// 상품 가격 편집 모달
function editProductPrice(productId) {
    const product = extractedProducts.find(p => p.id === productId);
    if (!product) return;

    // 모달 표시 및 데이터 로드
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-price-min').value = product.price?.replace(/[^0-9.]/g, '') || '';

        // 현재 편집 중인 상품 ID 저장
        modal.dataset.editingProductId = productId;
        modal.dataset.editingContext = 'price'; // 가격 편집 컨텍스트
    }
}

// ==================== Language Switch ====================

document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // 언어 전환 로직 구현 필요
    });
});

// ==================== PO Management ====================

// PO 목록 필터링 및 검색 적용
function applyPOFilters() {
    const statusFilter = document.getElementById('po-status-filter').value;
    const searchTerm = document.getElementById('po-search').value.toLowerCase().trim();
    const rows = document.querySelectorAll('#po-list-tbody tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const status = row.dataset.status || '';
        const poNumber = (row.dataset.po || '').toLowerCase();
        const buyerName = (row.dataset.buyer || '').toLowerCase();

        // 상태 필터 조건
        const matchesStatus = statusFilter === 'all' || status === statusFilter;

        // 검색 조건
        const matchesSearch = !searchTerm ||
            poNumber.includes(searchTerm) ||
            buyerName.includes(searchTerm);

        // 둘 다 만족해야 표시
        if (matchesStatus && matchesSearch) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // 결과 없음 표시
    updatePOEmptyState(visibleCount === 0);
}

// 빈 상태 표시
function updatePOEmptyState(isEmpty) {
    let emptyRow = document.getElementById('po-empty-row');

    if (isEmpty) {
        if (!emptyRow) {
            const tbody = document.getElementById('po-list-tbody');
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

// PO 목록 필터링
function filterPOList() {
    applyPOFilters();
}

// PO 검색
function searchPO() {
    applyPOFilters();
}

// PO 상세 보기
function viewPODetail(poNumber) {
    // 패널 전환
    document.getElementById('panel-po-management').style.display = 'none';
    document.getElementById('panel-po-detail').style.display = 'block';

    // 샘플 데이터 (실제로는 API에서 가져옴)
    const poData = {
        'PO-2026-0042': {
            number: 'PO20260203048953',
            status: '운송요청완료',
            statusClass: 'shipping-requested',
            date: '2026.02.03 13:44',
            exporter: {
                name: 'DELIFRANCE',
                contact: 'Anne, CHU',
                email: 'anne.chu@delifrance.com',
                phone: '+33 (0)6 73 18 08 52'
            },
            importer: {
                name: 'SELLER-NOTE.CO.,LTD',
                contact: 'jay',
                email: 'jay@seller-note.com',
                phone: '821026387225'
            },
            trade: {
                incoterms: 'FCA (운송인 인도)',
                paymentTerms: 'T/T (전신환송금)',
                currency: 'EUR'
            },
            items: [
                { name: '냉동 버터 크로아상 생지(버터 24%)', qty: 40, unit: 'boxes', price: 20.16, total: 806.4 }
            ],
            totalQty: 40,
            totalAmount: 806.4,
            notes: '-'
        }
    };

    const data = poData[poNumber] || poData['PO-2026-0042'];

    // 데이터 바인딩
    document.getElementById('po-detail-number').textContent = data.number;
    document.getElementById('po-detail-status').textContent = data.status;
    const statusBadgeMap = {
        'shipping-requested': 'wd-badge wd-badge-info',
        'confirmed': 'wd-badge wd-badge-confirmed',
        'received': 'wd-badge wd-badge-received',
        'cancelled': 'wd-badge wd-badge-cancelled',
        'pending': 'wd-badge wd-badge-warning'
    };
    document.getElementById('po-detail-status').className = statusBadgeMap[data.statusClass] || 'wd-badge wd-badge-info';
    document.getElementById('po-detail-date').textContent = data.date;

    document.getElementById('po-exporter-name').textContent = data.exporter.name;
    document.getElementById('po-exporter-contact').textContent = data.exporter.contact;
    document.getElementById('po-exporter-email').textContent = data.exporter.email;
    document.getElementById('po-exporter-phone').textContent = data.exporter.phone;

    document.getElementById('po-importer-name').textContent = data.importer.name;
    document.getElementById('po-importer-contact').textContent = data.importer.contact;
    document.getElementById('po-importer-email').textContent = data.importer.email;
    document.getElementById('po-importer-phone').textContent = data.importer.phone;

    document.getElementById('po-incoterms').textContent = data.trade.incoterms;
    document.getElementById('po-payment-terms').textContent = data.trade.paymentTerms;
    document.getElementById('po-currency').textContent = data.trade.currency;

    document.getElementById('po-items-count').textContent = data.items.length;

    // 품목 테이블
    const tbody = document.getElementById('po-items-tbody');
    tbody.innerHTML = data.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td class="wd-text-right">${item.qty}</td>
            <td>${item.unit}</td>
            <td class="wd-text-right">${item.price}</td>
            <td class="wd-text-right">${item.total}</td>
        </tr>
    `).join('');

    document.getElementById('po-total-qty').textContent = data.totalQty;
    document.getElementById('po-total-currency').textContent = data.trade.currency;
    document.getElementById('po-total-amount').textContent = data.totalAmount;
    document.getElementById('po-notes').textContent = data.notes;
}

// PO 목록으로 돌아가기
function backToPOList() {
    document.getElementById('panel-po-detail').style.display = 'none';
    document.getElementById('panel-po-management').style.display = 'block';
}

// PO 다운로드
function downloadPO() {
    showToast('Downloading PO document...', 'info');
    // TODO: PDF 다운로드 구현
}

// PO 취소
function cancelPO() {
    if (confirm('Are you sure you want to cancel this order?')) {
        showToast('Order cancellation requested', 'warning');
        // TODO: API 호출
    }
}

// PO 확정
function confirmPO(poNumber) {
    if (confirm(`Confirm order ${poNumber}?`)) {
        showToast(`Order ${poNumber} confirmed!`, 'success');
        // TODO: API 호출 및 상태 업데이트
    }
}

// 배송 정보 업데이트
function updateShipping(poNumber) {
    showToast(`Update shipping for ${poNumber}`, 'info');
    // TODO: 배송 정보 입력 모달 표시
}

// 배송 추적
function trackShipment(poNumber) {
    showToast(`Tracking shipment for ${poNumber}`, 'info');
    // TODO: 배송 추적 정보 표시
}

// PO 목록 내보내기
async function exportPOList() {
    showToast('Exporting PO list to CSV...', 'info');

    try {
        const poData = getAllPOData();

        if (!poData || poData.length === 0) {
            showToast('No PO data to export', 'warning');
            return;
        }

        // CSV 헤더
        const headers = ['PO Number', 'Buyer', 'Country', 'Order Date', 'Items', 'Total Amount', 'Status'];

        // CSV 데이터 생성
        const csvRows = [];
        csvRows.push(headers.join(','));

        poData.forEach(po => {
            const row = [
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

        const csvContent = csvRows.join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().slice(0, 10);

        link.setAttribute('href', url);
        link.setAttribute('download', `po_export_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`Successfully exported ${poData.length} PO records`, 'success');

    } catch (error) {
        console.error('PO Export error:', error);
        showToast('Failed to export PO list', 'error');
    }
}

// 전체 PO 데이터 가져오기
function getAllPOData() {
    const poData = [];
    const rows = document.querySelectorAll('#po-list-tbody tr');

    rows.forEach(row => {
        const poNumber = row.querySelector('.po-number')?.textContent || '';
        const buyerName = row.querySelector('.buyer-name')?.textContent || '';
        const buyerCountry = row.querySelector('.buyer-country')?.textContent || '';
        const cells = row.querySelectorAll('td');
        const orderDate = cells[2]?.textContent || '';
        const items = cells[3]?.textContent || '';
        const totalAmount = row.querySelector('.amount')?.textContent || '';
        const statusBadge = row.querySelector('.status-badge');
        const status = statusBadge?.textContent || '';

        poData.push({
            poNumber,
            buyerName,
            country: buyerCountry.replace(/[^\w\s]/g, '').trim(),
            orderDate,
            items,
            totalAmount,
            status
        });
    });

    return poData;
}

// Status 컬럼 필터 드롭다운 토글
function toggleStatusFilter(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('status-filter-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }

    // 외부 클릭 시 드롭다운 닫기
    const closeDropdown = (e) => {
        if (!e.target.closest('.column-filter')) {
            dropdown?.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    };
    setTimeout(() => document.addEventListener('click', closeDropdown), 0);
}

// Status 필터 적용
function applyStatusFilter(status) {
    const filterInput = document.getElementById('po-status-filter');
    if (filterInput) {
        filterInput.value = status;
    }

    // 필터 적용
    applyPOFilters();

    // 필터 아이콘 활성화 상태 업데이트
    const filterBtn = document.querySelector('.wd-filter-btn');
    if (filterBtn) {
        if (status !== 'all') {
            filterBtn.classList.add('active');
        } else {
            filterBtn.classList.remove('active');
        }
    }

    // 드롭다운 닫기
    const dropdown = document.getElementById('status-filter-dropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// 탭으로 PO 필터
function filterPOByTab(tabType) {
    // 탭 활성화 상태 업데이트
    const tabs = document.querySelectorAll('.wd-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // 필터 적용
    const rows = document.querySelectorAll('#po-list-tbody tr');
    rows.forEach(row => {
        const status = row.dataset.status || '';
        if (tabType === 'active') {
            row.style.display = status !== 'cancelled' ? '' : 'none';
        } else if (tabType === 'cancelled') {
            row.style.display = status === 'cancelled' ? '' : 'none';
        }
    });
}

// PO 테이블 정렬
function sortPOTable(column) {
    console.log('Sorting by:', column);
    // TODO: 정렬 로직 구현
}

// 발주서 등록 모달
function openAddPOModal(poId) {
    const modalEl = document.getElementById('add-po-modal');
    const form = document.getElementById('add-po-form');
    const titleEl = document.getElementById('add-po-modal-title');

    if (!modalEl) return;

    if (form) form.reset();
    window._editingPOId = null;

    // Reset items table
    const tbody = document.getElementById('add-po-items-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr data-row="0">
                <td><input type="text" class="wd-input wd-input-sm po-item-name" required placeholder="Product name"></td>
                <td><input type="number" class="wd-input wd-input-sm po-item-qty" required min="1" value="1" onchange="calculatePOItemSubtotal(0)"></td>
                <td>
                    <select class="wd-select wd-select-sm po-item-unit">
                        <option value="pcs">pcs</option>
                        <option value="boxes">boxes</option>
                        <option value="cases">cases</option>
                        <option value="pallets">pallets</option>
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                        <option value="liters">liters</option>
                    </select>
                </td>
                <td><input type="number" class="wd-input wd-input-sm po-item-price" required min="0" step="0.01" value="0" onchange="calculatePOItemSubtotal(0)"></td>
                <td class="po-item-subtotal wd-text-right wd-text-bold">0.00</td>
                <td>
                    <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePOItemRow(0)" title="Remove">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </td>
            </tr>
        `;
    }

    // Set default date
    const orderDateInput = document.getElementById('add-po-date');
    if (orderDateInput) orderDateInput.value = new Date().toISOString().split('T')[0];

    if (poId) {
        window._editingPOId = poId;
        if (titleEl) titleEl.textContent = 'Edit Purchase Order';
        loadPODataForEdit(poId);
    } else {
        if (titleEl) titleEl.textContent = 'Add Purchase Order';
    }

    modalEl.style.display = 'flex';
}

function closeAddPOModal() {
    const modalEl = document.getElementById('add-po-modal');
    if (modalEl) modalEl.style.display = 'none';
}

function collectPOItems() {
    const items = [];
    const tbody = document.getElementById('add-po-items-tbody');
    if (!tbody) return items;

    tbody.querySelectorAll('tr').forEach(row => {
        const item = {
            productName: row.querySelector('.po-item-name')?.value || '',
            quantity: parseInt(row.querySelector('.po-item-qty')?.value) || 0,
            unit: row.querySelector('.po-item-unit')?.value || 'pcs',
            unitPrice: parseFloat(row.querySelector('.po-item-price')?.value) || 0
        };
        if (item.productName) items.push(item);
    });

    return items;
}

async function savePO() {
    const form = document.getElementById('add-po-form');
    if (form && !form.checkValidity()) { form.reportValidity(); return; }

    const buyerCompany = document.getElementById('add-po-buyer-company')?.value;
    if (!buyerCompany) { showToast('Buyer company is required', 'error'); return; }

    const items = collectPOItems();
    if (items.length === 0) { showToast('At least one product item is required', 'error'); return; }

    const poData = {
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
        items,
        notes: document.getElementById('add-po-notes')?.value || undefined,
        status: 'pending'
    };

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const url = window._editingPOId ? `${baseUrl}/po/${window._editingPOId}` : `${baseUrl}/po`;
        const method = window._editingPOId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(poData)
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed'); }

        showToast(window._editingPOId ? 'PO updated!' : 'PO registered!', 'success');
        closeAddPOModal();
        if (typeof loadPOListFromAPI === 'function') loadPOListFromAPI();
    } catch (e) {
        showToast(e.message || 'Failed to save PO', 'error');
    }
}

async function savePOAsDraft() {
    const items = collectPOItems();
    const poData = {
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
        items,
        notes: document.getElementById('add-po-notes')?.value || undefined,
        status: 'draft'
    };

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const url = window._editingPOId ? `${baseUrl}/po/${window._editingPOId}` : `${baseUrl}/po`;
        const method = window._editingPOId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(poData)
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed'); }

        showToast('PO saved as draft!', 'success');
        closeAddPOModal();
        if (typeof loadPOListFromAPI === 'function') loadPOListFromAPI();
    } catch (e) {
        showToast(e.message || 'Failed to save draft', 'error');
    }
}

// ---- PO Modal Helper Functions ----

function addPOItemRow() {
    const tbody = document.getElementById('add-po-items-tbody');
    if (!tbody) return;
    const idx = tbody.querySelectorAll('tr').length;
    const tr = document.createElement('tr');
    tr.setAttribute('data-row', idx);
    tr.innerHTML = `
        <td><input type="text" class="wd-input wd-input-sm po-item-name" required placeholder="Product name"></td>
        <td><input type="number" class="wd-input wd-input-sm po-item-qty" required min="1" value="1" onchange="calculatePOItemSubtotal(${idx})"></td>
        <td>
            <select class="wd-select wd-select-sm po-item-unit">
                <option value="pcs">pcs</option>
                <option value="boxes">boxes</option>
                <option value="cases">cases</option>
                <option value="pallets">pallets</option>
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
                <option value="liters">liters</option>
            </select>
        </td>
        <td><input type="number" class="wd-input wd-input-sm po-item-price" required min="0" step="0.01" value="0" onchange="calculatePOItemSubtotal(${idx})"></td>
        <td class="po-item-subtotal wd-text-right wd-text-bold">0.00</td>
        <td>
            <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePOItemRow(${idx})" title="Remove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
}

function removePOItemRow(idx) {
    const tbody = document.getElementById('add-po-items-tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    if (rows.length <= 1) { showToast('At least one item row is required', 'warning'); return; }
    const row = tbody.querySelector(`tr[data-row="${idx}"]`);
    if (row) row.remove();
    // Re-index remaining rows
    tbody.querySelectorAll('tr').forEach((tr, i) => {
        tr.setAttribute('data-row', i);
        const qtyInput = tr.querySelector('.po-item-qty');
        const priceInput = tr.querySelector('.po-item-price');
        const removeBtn = tr.querySelector('.wd-btn-icon-danger');
        if (qtyInput) qtyInput.setAttribute('onchange', `calculatePOItemSubtotal(${i})`);
        if (priceInput) priceInput.setAttribute('onchange', `calculatePOItemSubtotal(${i})`);
        if (removeBtn) removeBtn.setAttribute('onclick', `removePOItemRow(${i})`);
    });
    updatePOTotal();
}

function onPOProductSelect(idx) {
    // For text input mode this is a no-op; kept for compatibility
}

function calculatePOItemSubtotal(idx) {
    const tbody = document.getElementById('add-po-items-tbody');
    if (!tbody) return;
    const row = tbody.querySelector(`tr[data-row="${idx}"]`);
    if (!row) return;
    const qty = parseFloat(row.querySelector('.po-item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.po-item-price')?.value) || 0;
    const subtotal = qty * price;
    const subtotalTd = row.querySelector('.po-item-subtotal');
    if (subtotalTd) subtotalTd.textContent = subtotal.toFixed(2);
    updatePOTotal();
}

function updatePOTotal() {
    const tbody = document.getElementById('add-po-items-tbody');
    if (!tbody) return;
    let total = 0;
    tbody.querySelectorAll('.po-item-subtotal').forEach(td => {
        total += parseFloat(td.textContent) || 0;
    });
    const totalEl = document.getElementById('add-po-total-amount');
    if (totalEl) totalEl.textContent = total.toFixed(2);
    const currencyEl = document.getElementById('add-po-currency-symbol');
    const currencySelect = document.getElementById('add-po-currency');
    if (currencyEl && currencySelect) currencyEl.textContent = currencySelect.value;
}

function updatePOCurrency() {
    updatePOTotal();
}

function handlePOFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { showToast('File size exceeds 20MB limit', 'error'); event.target.value = ''; return; }
    const uploadArea = document.getElementById('po-upload-area');
    const uploadedFile = document.getElementById('po-uploaded-file');
    const filenameEl = document.getElementById('po-uploaded-filename');
    if (uploadArea) uploadArea.style.display = 'none';
    if (uploadedFile) uploadedFile.style.display = 'flex';
    if (filenameEl) filenameEl.textContent = file.name;
    window._poUploadedFile = file;
}

function removePOFile() {
    const uploadArea = document.getElementById('po-upload-area');
    const uploadedFile = document.getElementById('po-uploaded-file');
    const fileInput = document.getElementById('po-file-input');
    if (uploadArea) uploadArea.style.display = '';
    if (uploadedFile) uploadedFile.style.display = 'none';
    if (fileInput) fileInput.value = '';
    window._poUploadedFile = null;
}

async function loadPODataForEdit(poId) {
    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/po/${poId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load PO');
        const data = await res.json();

        const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
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

        const items = data.order_items || [];
        if (items.length > 0) {
            const tbody = document.getElementById('add-po-items-tbody');
            if (tbody) {
                tbody.innerHTML = items.map((item, idx) => `
                    <tr data-row="${idx}">
                        <td><input type="text" class="wd-input wd-input-sm po-item-name" required placeholder="Product name" value="${item.product_name || ''}"></td>
                        <td><input type="number" class="wd-input wd-input-sm po-item-qty" required min="1" value="${item.quantity || 1}" onchange="calculatePOItemSubtotal(${idx})"></td>
                        <td>
                            <select class="wd-select wd-select-sm po-item-unit">
                                ${['pcs','boxes','cases','pallets','kg','lbs','liters'].map(u =>
                                    `<option value="${u}" ${(item.unit||'pcs')===u?'selected':''}>${u}</option>`
                                ).join('')}
                            </select>
                        </td>
                        <td><input type="number" class="wd-input wd-input-sm po-item-price" required min="0" step="0.01" value="${item.unit_price || 0}" onchange="calculatePOItemSubtotal(${idx})"></td>
                        <td class="po-item-subtotal wd-text-right wd-text-bold">${((item.quantity||0)*(item.unit_price||0)).toFixed(2)}</td>
                        <td>
                            <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePOItemRow(${idx})" title="Remove">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </td>
                    </tr>
                `).join('');
                if (typeof updatePOTotal === 'function') updatePOTotal();
            }
        }
    } catch (e) {
        showToast('Failed to load PO data', 'error');
    }
}

async function loadPOListFromAPI() {
    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/po`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const orders = await res.json();
        renderPOListFromAPI(Array.isArray(orders) ? orders : []);
    } catch (e) {
        console.log('Failed to load PO list from API');
    }
}

function renderPOListFromAPI(orders) {
    const tbody = document.getElementById('po-list-tbody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;color:#888;">No purchase orders found</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const poNumber = order.po_number || '';
        const status = order.status || '';
        const totalAmount = order.total_amount ?? 0;
        const currency = order.currency || 'USD';
        const buyerName = order.buyer_name || '';
        const paymentTerms = order.payment_terms || '-';
        const incoterms = order.incoterms || '-';
        const items = order.order_items || [];
        const productName = items.length > 0 ? (items[0].product_name || '-') : '-';
        const itemExtra = items.length > 1 ? ` (+${items.length - 1})` : '';
        const formattedAmount = typeof totalAmount === 'number'
            ? `${currency} ${totalAmount.toLocaleString('en-US', {minimumFractionDigits:2})}`
            : totalAmount;
        const updatedAt = order.updated_at || order.created_at || '';
        const formattedDate = updatedAt ? new Date(updatedAt).toLocaleDateString() : '-';
        const orderId = order.id || '';

        const statusBadgeClass = {
            draft: 'wd-badge-secondary', pending: 'wd-badge-warning', confirmed: 'wd-badge-success',
            shipping: 'wd-badge-info', delivered: 'wd-badge-success', cancelled: 'wd-badge-danger'
        }[status] || 'wd-badge-secondary';
        const statusLabel = {draft:'Draft',pending:'Pending',confirmed:'Confirmed',shipping:'Shipping',delivered:'Delivered',cancelled:'Cancelled'}[status] || status;

        let actions = '';
        if (status === 'draft' || status === 'pending') {
            actions += `<button class="wd-btn wd-btn-sm wd-btn-outline" onclick="event.stopPropagation();openAddPOModal('${orderId}')">Edit</button> `;
            actions += `<button class="wd-btn wd-btn-sm wd-btn-danger-outline" onclick="event.stopPropagation();deletePO('${orderId}')">Delete</button>`;
        }

        return `
        <tr data-status="${status}" data-po="${poNumber}" onclick="viewPODetail('${orderId}')" class="wd-cursor-pointer">
            <td>${poNumber}</td>
            <td><span class="wd-badge ${statusBadgeClass}">${statusLabel}</span></td>
            <td>${productName}${itemExtra}</td>
            <td>${formattedAmount}</td>
            <td>${buyerName}</td>
            <td>${paymentTerms}</td>
            <td>${incoterms}</td>
            <td>${formattedDate}</td>
            <td>${actions || '-'}</td>
        </tr>`;
    }).join('');
}

async function deletePO(poId) {
    if (!confirm('Are you sure you want to delete this PO?')) return;
    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/po/${poId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed');
        showToast('PO deleted', 'success');
        loadPOListFromAPI();
    } catch (e) {
        showToast('Failed to delete PO', 'error');
    }
}

function editPO(poId) {
    openAddPOModal(poId);
}

// ==================== PI Management ====================

async function openPIModal(piId) {
    const modalEl = document.getElementById('pi-modal');
    const form = document.getElementById('pi-form');
    const titleEl = document.getElementById('pi-modal-title');

    if (!modalEl) return;

    if (form) form.reset();
    window._editingPIId = null;

    if (piId) {
        window._editingPIId = piId;
        if (titleEl) titleEl.textContent = 'Edit Proforma Invoice';
    } else {
        if (titleEl) titleEl.textContent = 'Create Proforma Invoice';
    }

    // Dynamically populate buyer dropdown from POs and Credits
    await populatePIBuyerDropdown();

    // Reset credit section
    const creditSection = document.getElementById('pi-credit-section');
    if (creditSection) creditSection.style.display = 'none';

    resetPIItems();
    modalEl.style.display = 'flex';
}

async function populatePIBuyerDropdown() {
    const buyerSelect = document.getElementById('pi-buyer-select');
    if (!buyerSelect) return;

    buyerSelect.innerHTML = '<option value="">Loading buyers...</option>';

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';

        const res = await fetch(`${baseUrl}/accounts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load accounts');
        const accounts = await res.json();

        buyerSelect.innerHTML = '<option value="">Select a buyer...</option>';
        (Array.isArray(accounts) ? accounts : []).forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.company_name;
            opt.setAttribute('data-name', acc.company_name);
            opt.setAttribute('data-email', acc.email || '');
            opt.setAttribute('data-country', acc.country || '');
            opt.textContent = acc.company_name + (acc.country ? ` (${acc.country})` : '');
            buyerSelect.appendChild(opt);
        });

        if (accounts.length === 0) {
            buyerSelect.innerHTML = '<option value="">No accounts found — add one in Account Management</option>';
        }
    } catch (e) {
        console.error('Failed to load buyers:', e);
        buyerSelect.innerHTML = '<option value="">Failed to load buyers</option>';
    }
}

function closePIModal() {
    const modalEl = document.getElementById('pi-modal');
    if (modalEl) modalEl.style.display = 'none';
}

async function createAndSendPI() {
    const piData = collectPIData();
    if (!piData) return;
    piData.status = 'sent';

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const url = window._editingPIId ? `${baseUrl}/pi/${window._editingPIId}` : `${baseUrl}/pi`;
        const method = window._editingPIId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(piData)
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed'); }

        showToast(window._editingPIId ? 'PI updated & sent!' : 'PI created & sent!', 'success');
        closePIModal();
        if (typeof loadPIListFromAPI === 'function') loadPIListFromAPI();
    } catch (e) {
        showToast(e.message || 'Failed to create PI', 'error');
    }
}

// ---- PI Modal Helper Functions ----

function togglePISource(source) {
    const poSelection = document.getElementById('pi-po-selection');
    const buyerSection = document.getElementById('pi-buyer-section');
    const buyerSelect = document.getElementById('pi-buyer-select');

    if (source === 'po') {
        if (poSelection) poSelection.style.display = '';
        if (buyerSelect) buyerSelect.disabled = false;
    } else {
        if (poSelection) poSelection.style.display = 'none';
        if (buyerSelect) buyerSelect.disabled = false;
    }
    // Reset items and buyer info
    resetPIItems();
    const infoCard = document.getElementById('pi-buyer-info-card');
    if (infoCard) infoCard.style.display = 'none';
    const creditSection = document.getElementById('pi-credit-section');
    if (creditSection) creditSection.style.display = 'none';
}

function loadPOForPI() {
    const poSelect = document.getElementById('pi-po-select');
    if (!poSelect || !poSelect.value) return;

    const selectedOption = poSelect.selectedOptions[0];
    const buyerCode = selectedOption?.getAttribute('data-buyer');

    // Auto-select the buyer associated with this PO
    if (buyerCode) {
        const buyerSelect = document.getElementById('pi-buyer-select');
        if (buyerSelect) {
            buyerSelect.value = buyerCode;
            loadBuyerForPI();
        }
    }

    showToast('PO data loaded. Add products below.', 'info');
}

async function loadBuyerForPI() {
    const buyerSelect = document.getElementById('pi-buyer-select');
    if (!buyerSelect) return;

    const selectedOption = buyerSelect.selectedOptions[0];
    const infoCard = document.getElementById('pi-buyer-info-card');
    const creditSection = document.getElementById('pi-credit-section');

    if (!buyerSelect.value) {
        if (infoCard) infoCard.style.display = 'none';
        if (creditSection) creditSection.style.display = 'none';
        return;
    }

    const name = selectedOption?.getAttribute('data-name') || '-';
    const country = selectedOption?.getAttribute('data-country') || '-';
    const currency = document.getElementById('pi-currency')?.value || 'USD';

    const companyEl = document.getElementById('pi-buyer-company-display');
    const countryEl = document.getElementById('pi-buyer-country-display');
    const creditEl = document.getElementById('pi-buyer-credit-display');

    if (companyEl) companyEl.textContent = name;
    if (countryEl) countryEl.textContent = country;
    if (infoCard) infoCard.style.display = '';

    // Fetch actual approved credits for this buyer from API
    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/credits/buyer/${encodeURIComponent(name)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load credits');
        const buyerCredits = await res.json();
        const totalCredit = buyerCredits.reduce((sum, c) => sum + parseFloat(c.amount), 0);

        if (creditEl) creditEl.textContent = `${currency} ${totalCredit.toFixed(2)}`;

        if (buyerCredits.length > 0) {
            if (creditSection) creditSection.style.display = '';
            const badge = document.getElementById('available-credit-badge');
            if (badge) badge.textContent = `${currency} ${totalCredit.toFixed(2)} available`;

            const creditList = document.getElementById('pi-available-credits');
            if (creditList) {
                creditList.innerHTML = buyerCredits.map(credit => `
                    <label class="wd-checkbox-card" style="display: flex; align-items: center; gap: 8px; padding: 12px;">
                        <input type="checkbox" class="pi-credit-checkbox"
                               value="${credit.id}"
                               data-amount="${credit.amount}"
                               onchange="calculatePITotals()">
                        <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
                            <span style="font-weight: 600;">${credit.credit_number}</span>
                            <span class="wd-text-muted" style="font-size: 12px;">from ${credit.invoice_number || 'N/A'} · ${credit.reason}</span>
                        </div>
                        <span style="font-weight: 600; color: var(--success);">-${currency} ${parseFloat(credit.amount).toFixed(2)}</span>
                    </label>
                `).join('');
            }
        } else {
            if (creditSection) creditSection.style.display = 'none';
            if (creditEl) creditEl.textContent = `${currency} 0.00`;
        }
    } catch (e) {
        console.error('Failed to load credits:', e);
        if (creditSection) creditSection.style.display = 'none';
        if (creditEl) creditEl.textContent = `${currency} 0.00`;
    }

    calculatePITotals();
}

function previewProductToAdd() {
    // Enable/disable the Add Product button based on selection
    const productSelect = document.getElementById('pi-product-select');
    const addBtn = productSelect?.parentElement?.querySelector('.wd-btn-primary');
    if (addBtn) {
        addBtn.disabled = !productSelect.value;
    }
}

function addProductToPI() {
    const productSelect = document.getElementById('pi-product-select');
    if (!productSelect || !productSelect.value) { showToast('Select a product first', 'warning'); return; }

    const selectedOption = productSelect.selectedOptions[0];
    const productId = productSelect.value;
    const name = selectedOption.getAttribute('data-name') || selectedOption.textContent;
    const price = parseFloat(selectedOption.getAttribute('data-price')) || 0;
    const unit = selectedOption.getAttribute('data-unit') || 'pcs';

    const tbody = document.getElementById('pi-items-tbody');
    if (!tbody) return;

    // Remove empty state row
    const emptyRow = tbody.querySelector('.wd-empty-row');
    if (emptyRow) emptyRow.remove();

    // Check for duplicates
    const existing = tbody.querySelector(`tr[data-product-id="${productId}"]`);
    if (existing) { showToast('Product already added', 'warning'); return; }

    const idx = tbody.querySelectorAll('tr').length;
    const tr = document.createElement('tr');
    tr.setAttribute('data-row', idx);
    tr.setAttribute('data-product-id', productId);
    tr.innerHTML = `
        <td class="wd-text-bold">${name}</td>
        <td><input type="number" class="wd-input wd-input-sm pi-item-qty" min="1" value="1" onchange="calculatePITotals()"></td>
        <td>${unit}</td>
        <td><input type="number" class="wd-input wd-input-sm pi-item-price" min="0" step="0.01" value="${price.toFixed(2)}" onchange="calculatePITotals()"></td>
        <td class="pi-item-amount wd-text-right wd-text-bold">${price.toFixed(2)}</td>
        <td>
            <button type="button" class="wd-btn-icon wd-btn-icon-danger" onclick="removePIItemRow(this)" title="Remove">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </td>
    `;
    tbody.appendChild(tr);

    // Reset selection
    productSelect.value = '';
    previewProductToAdd();
    calculatePITotals();
}

function removePIItemRow(btn) {
    const row = btn.closest('tr');
    if (row) row.remove();

    const tbody = document.getElementById('pi-items-tbody');
    if (tbody && tbody.querySelectorAll('tr').length === 0) {
        tbody.innerHTML = `
            <tr class="wd-empty-row">
                <td colspan="6" class="wd-text-center wd-text-muted" style="padding: 24px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                    <div data-i18n="pi.noItemsYet">No items added yet. Select a PO or add products above.</div>
                </td>
            </tr>
        `;
    }
    calculatePITotals();
}

function resetPIItems() {
    const tbody = document.getElementById('pi-items-tbody');
    if (tbody) {
        tbody.innerHTML = `
            <tr class="wd-empty-row">
                <td colspan="6" class="wd-text-center wd-text-muted" style="padding: 24px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; opacity: 0.5;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
                    <div data-i18n="pi.noItemsYet">No items added yet. Select a PO or add products above.</div>
                </td>
            </tr>
        `;
    }
    calculatePITotals();
}

function calculatePITotals() {
    const tbody = document.getElementById('pi-items-tbody');
    let subtotal = 0;

    if (tbody) {
        tbody.querySelectorAll('tr:not(.wd-empty-row)').forEach(row => {
            const qty = parseFloat(row.querySelector('.pi-item-qty')?.value) || 0;
            const price = parseFloat(row.querySelector('.pi-item-price')?.value) || 0;
            const amount = qty * price;
            const amountTd = row.querySelector('.pi-item-amount');
            if (amountTd) amountTd.textContent = amount.toFixed(2);
            subtotal += amount;
        });
    }

    // Calculate credit discount from individual credit checkboxes
    let creditDiscount = 0;
    document.querySelectorAll('.pi-credit-checkbox:checked').forEach(cb => {
        creditDiscount += parseFloat(cb.dataset.amount) || 0;
    });
    // Cap discount at subtotal
    creditDiscount = Math.min(creditDiscount, subtotal);

    const total = subtotal - creditDiscount;
    const currency = document.getElementById('pi-currency')?.value || 'USD';

    const subtotalEl = document.getElementById('pi-subtotal');
    const discountEl = document.getElementById('pi-credit-discount');
    const totalEl = document.getElementById('pi-total');

    if (subtotalEl) subtotalEl.textContent = `${currency} ${subtotal.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `-${currency} ${creditDiscount.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `${currency} ${total.toFixed(2)}`;
}

function updatePICurrency() {
    calculatePITotals();
    // Update buyer credit display
    loadBuyerForPI();
}

function collectPIData() {
    const buyerSelect = document.getElementById('pi-buyer-select');
    if (!buyerSelect?.value) { showToast('Select a buyer', 'error'); return null; }

    const tbody = document.getElementById('pi-items-tbody');
    const items = [];
    if (tbody) {
        tbody.querySelectorAll('tr:not(.wd-empty-row)').forEach(row => {
            items.push({
                productId: row.getAttribute('data-product-id') || '',
                productName: row.querySelector('td:first-child')?.textContent || '',
                quantity: parseInt(row.querySelector('.pi-item-qty')?.value) || 0,
                unitPrice: parseFloat(row.querySelector('.pi-item-price')?.value) || 0,
                unit: row.querySelectorAll('td')[2]?.textContent || 'pcs'
            });
        });
    }

    if (items.length === 0) { showToast('Add at least one product', 'error'); return null; }

    // Collect applied credits with creditId and amount
    const appliedCredits = [];
    document.querySelectorAll('.pi-credit-checkbox:checked').forEach(cb => {
        appliedCredits.push({
            creditId: cb.value,
            amount: parseFloat(cb.dataset.amount) || 0
        });
    });

    return {
        buyerName: buyerSelect.selectedOptions[0]?.getAttribute('data-name') || '',
        piDate: document.getElementById('pi-date')?.value || new Date().toISOString().split('T')[0],
        currency: document.getElementById('pi-currency')?.value || 'USD',
        incoterms: document.getElementById('pi-incoterms')?.value || 'FOB',
        paymentMethod: document.getElementById('pi-payment-method')?.value || 'tt30',
        validUntil: document.getElementById('pi-valid-until')?.value || undefined,
        remarks: document.getElementById('pi-remarks')?.value || undefined,
        items,
        appliedCredits: appliedCredits.length > 0 ? appliedCredits : undefined,
        poNumber: document.getElementById('pi-po-select')?.value || undefined
    };
}

async function saveAsDraft() {
    const piData = collectPIData();
    if (!piData) return;
    piData.status = 'draft';

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const url = window._editingPIId ? `${baseUrl}/pi/${window._editingPIId}` : `${baseUrl}/pi`;
        const method = window._editingPIId ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(piData)
        });
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed'); }

        showToast('PI saved as draft!', 'success');
        closePIModal();
        if (typeof loadPIListFromAPI === 'function') loadPIListFromAPI();
    } catch (e) {
        showToast(e.message || 'Failed to save draft', 'error');
    }
}

// PI 탭 필터 (Active/Cancelled)
function filterPIByTab(tabType) {
    // 탭 활성화 상태 업데이트
    const tabs = document.querySelectorAll('#panel-pi-management .wd-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Hidden filter 업데이트
    const tabFilter = document.getElementById('pi-tab-filter');
    if (tabFilter) tabFilter.value = tabType;

    // 테이블 필터링
    const rows = document.querySelectorAll('#pi-table-body tr');
    rows.forEach(row => {
        const rowTab = row.dataset.tab || 'active';
        if (tabType === 'active') {
            row.style.display = rowTab !== 'cancelled' ? '' : 'none';
        } else if (tabType === 'cancelled') {
            row.style.display = rowTab === 'cancelled' ? '' : 'none';
        }
    });
}

// PI Status 필터 토글
function togglePIStatusFilter(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('pi-status-filter-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
    // 다른 드롭다운 닫기
    const paymentDropdown = document.getElementById('pi-payment-filter-dropdown');
    if (paymentDropdown) paymentDropdown.classList.remove('show');
}

// PI Status 필터 적용
function applyPIStatusFilter(status) {
    const dropdown = document.getElementById('pi-status-filter-dropdown');
    const hiddenFilter = document.getElementById('pi-status-filter');

    if (dropdown) dropdown.classList.remove('show');
    if (hiddenFilter) hiddenFilter.value = status;

    applyPIFilters();
}

// PI Payment 필터 토글
function togglePIPaymentFilter(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('pi-payment-filter-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
    // 다른 드롭다운 닫기
    const statusDropdown = document.getElementById('pi-status-filter-dropdown');
    if (statusDropdown) statusDropdown.classList.remove('show');
}

// PI Payment 필터 적용
function applyPIPaymentFilter(payment) {
    const dropdown = document.getElementById('pi-payment-filter-dropdown');
    if (dropdown) dropdown.classList.remove('show');

    // Hidden filter에 저장
    window.piPaymentFilter = payment;

    applyPIFilters();
}

// PI 통합 필터 적용
function applyPIFilters() {
    const tabFilter = document.getElementById('pi-tab-filter')?.value || 'active';
    const statusFilter = document.getElementById('pi-status-filter')?.value || 'all';
    const paymentFilter = window.piPaymentFilter || 'all';

    const rows = document.querySelectorAll('#pi-table-body tr');
    rows.forEach(row => {
        const rowTab = row.dataset.tab || 'active';
        const rowStatus = row.dataset.status || '';
        const rowPayment = row.dataset.payment || '';

        let showByTab = tabFilter === 'active' ? rowTab !== 'cancelled' : rowTab === 'cancelled';
        let showByStatus = statusFilter === 'all' || rowStatus === statusFilter;
        let showByPayment = paymentFilter === 'all' || rowPayment === paymentFilter;

        row.style.display = (showByTab && showByStatus && showByPayment) ? '' : 'none';
    });
}

// PI 테이블 정렬
function sortPITable(column) {
    console.log('Sorting PI by:', column);
    // TODO: 정렬 로직 구현
}

// ==================== Credit Management ====================

// Credit 탭 전환 (Active / Cancelled)
function filterCreditByTab(tabType) {
    // 탭 활성화 상태 업데이트
    const tabs = document.querySelectorAll('#panel-credit-management .wd-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Hidden filter 업데이트
    const tabFilter = document.getElementById('credit-tab-filter');
    if (tabFilter) tabFilter.value = tabType;

    // 통합 필터 적용
    applyCreditFilters();
}

// Credit Status 필터 드롭다운 토글
function toggleCreditStatusFilter(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('credit-status-filter-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Credit Status 필터 적용
function applyCreditStatusFilter(status) {
    const dropdown = document.getElementById('credit-status-filter-dropdown');
    if (dropdown) dropdown.classList.remove('show');

    // Hidden filter에 저장
    const statusFilter = document.getElementById('credit-status-filter');
    if (statusFilter) statusFilter.value = status;

    applyCreditFilters();
}

// Credit 통합 필터 적용 (탭 + 상태 + 검색)
function applyCreditFilters() {
    const tabFilter = document.getElementById('credit-tab-filter')?.value || 'active';
    const statusFilter = document.getElementById('credit-status-filter')?.value || 'all';
    const searchValue = document.getElementById('credit-search')?.value?.toLowerCase() || '';

    const rows = document.querySelectorAll('#credit-table-body tr');
    rows.forEach(row => {
        const rowTab = row.dataset.tab || 'active';
        const rowStatus = row.dataset.status || '';

        let showByTab = tabFilter === 'active' ? rowTab !== 'cancelled' : rowTab === 'cancelled';
        let showByStatus = statusFilter === 'all' || rowStatus === statusFilter;

        // 검색 필터
        let showBySearch = true;
        if (searchValue) {
            const rowText = row.textContent.toLowerCase();
            showBySearch = rowText.includes(searchValue);
        }

        row.style.display = (showByTab && showByStatus && showBySearch) ? '' : 'none';
    });
}

// Credit 검색 필터
function filterCredits() {
    applyCreditFilters();
}

// Credit 모달 열기
function openCreditModal() {
    const modal = document.getElementById('credit-modal');
    if (modal) {
        modal.style.display = 'flex';
        // 폼 초기화
        const form = document.getElementById('credit-form');
        if (form) form.reset();
        const fileList = document.getElementById('credit-file-list');
        if (fileList) fileList.innerHTML = '';
        const productSelect = document.getElementById('credit-product-select');
        if (productSelect) {
            productSelect.innerHTML = '<option value="">Select Invoice first...</option>';
        }
    }
}

// Credit 모달 닫기
function closeCreditModal() {
    const modal = document.getElementById('credit-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Credit 저장
function saveCredit() {
    const form = document.getElementById('credit-form');
    if (!form) return;

    const invoice = document.getElementById('credit-invoice-select')?.value;
    const product = document.getElementById('credit-product-select')?.value;
    const reason = document.getElementById('credit-reason')?.value;
    const qty = document.getElementById('credit-qty')?.value;
    const amount = document.getElementById('credit-amount')?.value;

    if (!invoice || !product || !reason || !qty || !amount) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // 모달 닫기 및 성공 메시지
    closeCreditModal();
    showToast('Credit submitted successfully', 'success');
}

// 인보이스 선택 시 상품 목록 로드
function loadInvoiceProducts() {
    const invoiceSelect = document.getElementById('credit-invoice-select');
    const productSelect = document.getElementById('credit-product-select');
    if (!invoiceSelect || !productSelect) return;

    const invoice = invoiceSelect.value;
    if (!invoice) {
        productSelect.innerHTML = '<option value="">Select Invoice first...</option>';
        return;
    }

    // 샘플 상품 데이터 (인보이스별)
    const productsByInvoice = {
        'INV-2024-0089': [
            { value: 'olive-oil-500', label: 'Extra Virgin Olive Oil 500ml - $25.00/unit' },
            { value: 'balsamic-250', label: 'Balsamic Vinegar 250ml - $18.00/unit' }
        ],
        'INV-2024-0088': [
            { value: 'parmesan-24m', label: 'Aged Parmesan 24 months - $160.00/unit' },
            { value: 'mozzarella-500', label: 'Buffalo Mozzarella 500g - $22.00/unit' }
        ],
        'INV-2024-0087': [
            { value: 'honey-350', label: 'Organic Honey 350g - $18.00/unit' },
            { value: 'maple-500', label: 'Maple Syrup 500ml - $24.00/unit' }
        ]
    };

    const products = productsByInvoice[invoice] || [];
    productSelect.innerHTML = '<option value="">Select product...</option>';
    products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.value;
        option.textContent = p.label;
        productSelect.appendChild(option);
    });
}

// Credit 파일 첨부 핸들러
function handleCreditFiles(event) {
    const files = event.target.files;
    const fileList = document.getElementById('credit-file-list');
    if (!fileList || !files) return;

    fileList.innerHTML = '';
    Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'wd-file-item';
        fileItem.innerHTML = `
            <span class="wd-file-name">${file.name}</span>
            <span class="wd-file-size">(${(file.size / 1024).toFixed(1)} KB)</span>
        `;
        fileList.appendChild(fileItem);
    });
}

// Credit 테이블 정렬
function sortCreditTable(column) {
    console.log('Sorting Credit by:', column);
    // TODO: 정렬 로직 구현
}

// Credit 상세 보기
function viewCreditDetail(creditId) {
    console.log('Viewing credit detail:', creditId);
    showToast(`Viewing details for ${creditId}`, 'info');
    // TODO: Credit 상세 화면/드로어 구현
}

// ==================== Account Management ====================

// Account detail drawer 열기
async function viewAccountDetail(accountId) {
    const drawer = document.getElementById('account-detail-drawer');
    const overlay = document.getElementById('account-drawer-overlay');
    if (drawer) {
        drawer.classList.add('active');
        if (overlay) overlay.classList.add('active');
        window.currentAccountId = accountId;

        try {
            const token = localStorage.getItem('supplier_token');
            const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
            const res = await fetch(`${baseUrl}/accounts/${accountId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed');
            const acc = await res.json();

            const titleEl = document.getElementById('account-drawer-title');
            const subtitleEl = document.getElementById('account-drawer-subtitle');
            if (titleEl) titleEl.textContent = acc.company_name || '';
            if (subtitleEl) subtitleEl.textContent = acc.country || '';

            const infoEl = document.getElementById('account-drawer-info');
            if (infoEl) {
                infoEl.innerHTML = `
                    <div class="wd-info-item"><span class="wd-info-label">Contact</span><span class="wd-info-value">${escapeHtml(acc.contact_name || '-')}</span></div>
                    <div class="wd-info-item"><span class="wd-info-label">Position</span><span class="wd-info-value">${escapeHtml(acc.contact_position || '-')}</span></div>
                    <div class="wd-info-item"><span class="wd-info-label">Email</span><span class="wd-info-value">${escapeHtml(acc.email || '-')}</span></div>
                    <div class="wd-info-item"><span class="wd-info-label">Phone</span><span class="wd-info-value">${escapeHtml(acc.phone || '-')}</span></div>
                    <div class="wd-info-item"><span class="wd-info-label">Currency</span><span class="wd-info-value">${escapeHtml(acc.currency || 'USD')}</span></div>
                    <div class="wd-info-item"><span class="wd-info-label">Incoterms</span><span class="wd-info-value">${escapeHtml(acc.incoterms || '-')}</span></div>
                    <div class="wd-info-item"><span class="wd-info-label">Payment Terms</span><span class="wd-info-value">${escapeHtml(acc.payment_terms || '-')}</span></div>
                    <div class="wd-info-item"><span class="wd-info-label">Address</span><span class="wd-info-value">${escapeHtml(acc.address || '-')}</span></div>
                `;
            }
        } catch (e) {
            console.error('Failed to load account detail:', e);
        }
    }
}

// Account detail drawer 닫기
function closeAccountDrawer() {
    const drawer = document.getElementById('account-detail-drawer');
    const overlay = document.getElementById('account-drawer-overlay');
    if (drawer) {
        drawer.classList.remove('active');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Account products 보기
function viewAccountProducts(accountId) {
    showToast(`Viewing product breakdown for ${accountId}`, 'info');
    viewAccountDetail(accountId);
}

// Account PI status 필터 토글
function toggleAccountPIFilter(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('account-pi-filter-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Account PI status 필터 적용
function applyAccountPIFilter(status) {
    const dropdown = document.getElementById('account-pi-filter-dropdown');
    const filterBtn = document.getElementById('account-pi-filter-btn');

    if (dropdown) dropdown.classList.remove('show');

    // 필터 버튼 텍스트 업데이트
    if (filterBtn) {
        const statusText = status === 'all' ? 'All Status' :
                          status === 'completed' ? 'Completed' : 'In Progress';
        filterBtn.querySelector('.wd-filter-text').textContent = statusText;
    }

    // 테이블 필터링
    const rows = document.querySelectorAll('#accounts-table-body tr');
    rows.forEach(row => {
        const rowStatus = row.dataset.piStatus || '';
        if (status === 'all') {
            row.style.display = '';
        } else {
            row.style.display = rowStatus === status ? '' : 'none';
        }
    });
}

// Account 테이블 정렬
function sortAccountTable(column) {
    console.log('Sorting accounts by:', column);
    // TODO: 정렬 로직 구현
}

// Account sales year 변경
function changeAccountSalesYear() {
    const yearSelect = document.getElementById('account-sales-year');
    if (yearSelect) {
        console.log('Changed to year:', yearSelect.value);
        // TODO: Load sales data for selected year
    }
}

// ---- Account CRUD (API-connected) ----

window._editingAccountId = null;

function openAccountModal(accountId) {
    const modal = document.getElementById('account-modal');
    const titleEl = document.getElementById('account-modal-title');
    const form = document.getElementById('account-form');
    if (form) form.reset();
    window._editingAccountId = null;

    if (accountId) {
        window._editingAccountId = accountId;
        if (titleEl) titleEl.textContent = 'Edit Account';
        loadAccountIntoForm(accountId);
    } else {
        if (titleEl) titleEl.textContent = 'Add Account';
    }

    if (modal) modal.style.display = 'flex';
}

function closeAccountModal() {
    const modal = document.getElementById('account-modal');
    if (modal) modal.style.display = 'none';
    window._editingAccountId = null;
}

async function loadAccountIntoForm(accountId) {
    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/accounts/${accountId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load account');
        const acc = await res.json();

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('account-company-name', acc.company_name);
        setVal('account-country', acc.country);
        setVal('account-address', acc.address);
        setVal('account-contact-name', acc.contact_name);
        setVal('account-contact-position', acc.contact_position);
        setVal('account-email', acc.email);
        setVal('account-phone', acc.phone);
        setVal('account-currency', acc.currency);
        setVal('account-incoterms', acc.incoterms);
        setVal('account-payment-terms', acc.payment_terms);
        setVal('account-notes', acc.notes);
    } catch (e) {
        console.error('Failed to load account into form:', e);
        showToast('Failed to load account data', 'error');
    }
}

async function saveAccount() {
    const companyName = document.getElementById('account-company-name')?.value?.trim();
    if (!companyName) {
        showToast('Company name is required', 'error');
        return;
    }

    const payload = {
        companyName,
        country: document.getElementById('account-country')?.value || '',
        address: document.getElementById('account-address')?.value || '',
        contactName: document.getElementById('account-contact-name')?.value || '',
        contactPosition: document.getElementById('account-contact-position')?.value || '',
        email: document.getElementById('account-email')?.value || '',
        phone: document.getElementById('account-phone')?.value || '',
        currency: document.getElementById('account-currency')?.value || 'USD',
        incoterms: document.getElementById('account-incoterms')?.value || '',
        paymentTerms: document.getElementById('account-payment-terms')?.value || '',
        notes: document.getElementById('account-notes')?.value || '',
    };

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const isEdit = !!window._editingAccountId;
        const url = isEdit ? `${baseUrl}/accounts/${window._editingAccountId}` : `${baseUrl}/accounts`;
        const method = isEdit ? 'PATCH' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        if (res.status === 401) {
            handleSessionExpired();
            return;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to save account');
        }

        showToast(isEdit ? 'Account updated!' : 'Account created!', 'success');
        closeAccountModal();
        loadAccountListFromAPI();
    } catch (e) {
        console.error('Failed to save account:', e);
        showToast(e.message || 'Failed to save account', 'error');
    }
}

async function loadAccountListFromAPI() {
    const tbody = document.getElementById('accounts-table-body');
    if (!tbody) return;

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/accounts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
            handleSessionExpired();
            return;
        }

        if (!res.ok) throw new Error('Failed to load accounts');
        const accounts = await res.json();

        if (!accounts.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#999;">No accounts yet. Click "Add Account" to create one.</td></tr>`;
            return;
        }

        tbody.innerHTML = accounts.map(acc => `
            <tr data-account-id="${acc.id}" onclick="viewAccountDetail('${acc.id}')" class="wd-cursor-pointer">
                <td>
                    <div class="wd-company-cell">
                        <span class="wd-company-name">${escapeHtml(acc.company_name)}</span>
                        <span class="wd-company-code">${escapeHtml(acc.country || '')}</span>
                    </div>
                </td>
                <td>${escapeHtml(acc.contact_name || '-')}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>${escapeHtml(acc.email || '-')}</td>
                <td>
                    <div style="display:flex; gap:4px;">
                        <button class="wd-btn wd-btn-sm wd-btn-outline" onclick="event.stopPropagation(); openAccountModal('${acc.id}')" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="wd-btn wd-btn-sm wd-btn-outline" onclick="event.stopPropagation(); deleteAccountFromAPI('${acc.id}')" title="Delete" style="color:#ef4444;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Failed to load accounts:', e);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#999;">No accounts yet. Click "Add Account" to create one.</td></tr>`;
    }
}

async function deleteAccountFromAPI(accountId) {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
        const token = localStorage.getItem('supplier_token');
        const baseUrl = window.APP_CONFIG?.API_BASE_URL || 'https://supplier-api-blush.vercel.app/api/v1/supplier';
        const res = await fetch(`${baseUrl}/accounts/${accountId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            handleSessionExpired();
            return;
        }
        if (!res.ok) throw new Error('Failed to delete account');
        showToast('Account deleted', 'success');
        loadAccountListFromAPI();
    } catch (e) {
        console.error('Failed to delete account:', e);
        showToast('Failed to delete account', 'error');
    }
}

function filterAccounts() {
    const searchInput = document.getElementById('account-search');
    const searchTerm = (searchInput?.value || '').toLowerCase();
    const rows = document.querySelectorAll('#accounts-table-body tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Product tooltip 표시
function showProductTooltip(event, month) {
    const tooltip = document.getElementById('product-tooltip');
    if (!tooltip) return;

    // Demo data - in production, this would come from API
    const monthlyData = {
        '2026-01': {
            label: 'January 2026',
            total: '$9,700',
            products: [
                { name: 'Extra Virgin Olive Oil 500ml', qty: '140 pcs', amount: '$3,500' },
                { name: 'Aged Parmesan 24 months', qty: '50 pcs', amount: '$3,250' },
                { name: 'Organic Honey 350g', qty: '100 pcs', amount: '$1,800' },
                { name: 'Balsamic Vinegar 250ml', qty: '36 pcs', amount: '$1,150' }
            ]
        },
        '2026-02': {
            label: 'February 2026',
            total: '$5,420',
            products: [
                { name: 'Extra Virgin Olive Oil 500ml', qty: '80 pcs', amount: '$2,000' },
                { name: 'Truffle Oil 100ml', qty: '24 pcs', amount: '$1,920' },
                { name: 'Aged Parmesan 24 months', qty: '20 pcs', amount: '$1,500' }
            ]
        }
    };

    const data = monthlyData[month];
    if (!data) {
        tooltip.style.display = 'none';
        return;
    }

    // Update tooltip content
    const headerMonth = tooltip.querySelector('.wd-tooltip-month');
    const headerTotal = tooltip.querySelector('.wd-tooltip-total');
    const productsList = tooltip.querySelector('.wd-tooltip-products');

    if (headerMonth) headerMonth.textContent = data.label;
    if (headerTotal) headerTotal.textContent = data.total;
    if (productsList) {
        productsList.innerHTML = data.products.map(p => `
            <div class="wd-tooltip-product">
                <span class="wd-tooltip-product-name">${p.name}</span>
                <span class="wd-tooltip-product-qty">${p.qty}</span>
                <span class="wd-tooltip-product-amount">${p.amount}</span>
            </div>
        `).join('');
    }

    // Position tooltip
    const rect = event.target.getBoundingClientRect();
    tooltip.style.display = 'block';
    tooltip.style.top = (rect.bottom + 8) + 'px';
    tooltip.style.left = rect.left + 'px';

    // Adjust if going off screen
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
        tooltip.style.left = (window.innerWidth - tooltipRect.width - 16) + 'px';
    }
}

// ==================== Buyer Discovery ====================

function switchBuyerTab(tab) {
    // Update tab buttons
    document.getElementById('tab-inquired')?.classList.toggle('active', tab === 'inquired');
    document.getElementById('tab-potential')?.classList.toggle('active', tab === 'potential');

    // Show/hide panels
    const inquiredPanel = document.getElementById('buyer-tab-inquired');
    const potentialPanel = document.getElementById('buyer-tab-potential');
    if (inquiredPanel) inquiredPanel.style.display = tab === 'inquired' ? 'block' : 'none';
    if (potentialPanel) potentialPanel.style.display = tab === 'potential' ? 'block' : 'none';

    if (tab === 'inquired') {
        loadInquiredBuyers();
    }
}

async function loadInquiredBuyers() {
    const container = document.getElementById('inquired-buyers-list');
    if (!container) return;

    container.innerHTML = '<p style="color: var(--wd-gray-400); text-align: center; padding: 40px 0;">Loading...</p>';

    try {
        const data = await apiCall('/inquiries');
        renderInquiredBuyers(data.inquiries || []);
    } catch (error) {
        console.error('Failed to load inquiries:', error);
        container.innerHTML = '<p style="color: var(--wd-gray-400); text-align: center; padding: 40px 0;">Failed to load inquiries. Please try again.</p>';
    }
}

function renderInquiredBuyers(inquiries) {
    const container = document.getElementById('inquired-buyers-list');
    if (!container) return;

    if (!inquiries || inquiries.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--wd-gray-400);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.5;">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p style="font-size: 16px; margin-bottom: 8px;">No inquiries yet</p>
                <p style="font-size: 14px;">Buyer inquiries will appear here when buyers contact you.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = inquiries.map(inquiry => {
        const statusBadge = getInquiryStatusBadge(inquiry.status);
        const productNames = (inquiry.products || []).map(p => p.name).join(', ') || 'N/A';
        const timeAgo = getTimeAgo(inquiry.created_at);

        return `
            <div class="wd-discovery-card" data-inquiry-id="${inquiry.id}">
                <div class="wd-discovery-header">
                    <div class="wd-discovery-company">
                        <h4 class="wd-discovery-name">${escapeHtml(inquiry.buyer_company)}</h4>
                        ${inquiry.buyer_country ? `<span class="wd-discovery-country">${escapeHtml(inquiry.buyer_country)}</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${statusBadge}
                        <select class="wd-input" style="width: auto; padding: 4px 8px; font-size: 12px;" onchange="updateInquiryStatus('${inquiry.id}', this.value)">
                            <option value="active" ${inquiry.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="responded" ${inquiry.status === 'responded' ? 'selected' : ''}>Responded</option>
                            <option value="closed" ${inquiry.status === 'closed' ? 'selected' : ''}>Closed</option>
                        </select>
                    </div>
                </div>
                <div class="wd-discovery-body">
                    <div class="wd-discovery-info-grid">
                        <div class="wd-discovery-info">
                            <span class="wd-discovery-label">Contact</span>
                            <span class="wd-discovery-value">${escapeHtml(inquiry.buyer_contact || 'N/A')}</span>
                        </div>
                        <div class="wd-discovery-info">
                            <span class="wd-discovery-label">Email</span>
                            <span class="wd-discovery-value">${escapeHtml(inquiry.buyer_email || 'N/A')}</span>
                        </div>
                        <div class="wd-discovery-info">
                            <span class="wd-discovery-label">Interested In</span>
                            <span class="wd-discovery-value">${escapeHtml(productNames)}</span>
                        </div>
                        <div class="wd-discovery-info">
                            <span class="wd-discovery-label">Created</span>
                            <span class="wd-discovery-value">${timeAgo}</span>
                        </div>
                    </div>
                    ${inquiry.message ? `<p style="margin-top: 12px; font-size: 13px; color: var(--wd-gray-600); line-height: 1.5;">${escapeHtml(inquiry.message)}</p>` : ''}
                </div>
                <div class="wd-discovery-footer">
                    <button class="wd-btn wd-btn-outline wd-btn-sm" onclick="deleteInquiry('${inquiry.id}')">Delete</button>
                    <button class="wd-btn wd-btn-primary wd-btn-sm" onclick="viewInquiryDetail('${inquiry.id}')">View Details</button>
                </div>
            </div>
        `;
    }).join('');
}

function getInquiryStatusBadge(status) {
    const map = {
        active: '<span class="wd-badge wd-badge-success">Active</span>',
        responded: '<span class="wd-badge wd-badge-info">Responded</span>',
        closed: '<span class="wd-badge wd-badge-warning">Closed</span>',
    };
    return map[status] || '<span class="wd-badge">' + (status || 'Unknown') + '</span>';
}

function getTimeAgo(dateStr) {
    if (!dateStr) return 'N/A';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function updateInquiryStatus(inquiryId, status) {
    try {
        await apiCall(`/inquiries/${inquiryId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
        showToast(`Inquiry status updated to ${status}`, 'success');
        loadInquiredBuyers();
    } catch (error) {
        console.error('Failed to update inquiry status:', error);
        showToast('Failed to update status', 'error');
    }
}

async function deleteInquiry(inquiryId) {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;

    try {
        await apiCall(`/inquiries/${inquiryId}`, { method: 'DELETE' });
        showToast('Inquiry deleted', 'success');
        loadInquiredBuyers();
    } catch (error) {
        console.error('Failed to delete inquiry:', error);
        showToast('Failed to delete inquiry', 'error');
    }
}

function viewInquiryDetail(inquiryId) {
    showToast('Inquiry detail view coming soon', 'info');
}

function showSubscriptionModal() {
    showToast('Premium subscription coming soon!', 'info');
}

// Product tooltip 숨기기
function hideProductTooltip() {
    const tooltip = document.getElementById('product-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// PI history 상품 상세 토글
function togglePIProducts(element) {
    element.classList.toggle('expanded');
}

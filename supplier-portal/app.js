// WeDealize Supplier Portal JavaScript

// ==================== API Configuration ====================

// API_BASE_URL은 i18n.js에서 정의됨
const API_TIMEOUT = 3000; // 3초 타임아웃

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
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// 임시 저장용 (회원가입 시 이메일 인증 전까지)
let pendingRegistration = null;
let verificationTimer = null;

// Auth Tab 전환
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
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
    document.querySelector('.auth-tabs').style.display = 'none';
    document.getElementById('verify-form').style.display = 'block';
    document.getElementById('verify-email-display').textContent = email;

    // 인증 코드 입력 필드 초기화
    document.querySelectorAll('.code-input').forEach(input => {
        input.value = '';
        input.classList.remove('filled', 'error');
    });
    document.querySelector('.code-input').focus();

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
            const nextInput = document.querySelector(`.code-input[data-index="${index + 1}"]`);
            if (nextInput) nextInput.focus();
        }
    } else {
        input.classList.remove('filled');
    }

    // 모든 필드 입력 완료 시 자동 인증
    const allInputs = document.querySelectorAll('.code-input');
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
        const allInputs = document.querySelectorAll('.code-input');
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
        const prevInput = document.querySelector(`.code-input[data-index="${index - 1}"]`);
        if (prevInput) {
            prevInput.focus();
            prevInput.value = '';
            prevInput.classList.remove('filled');
        }
    }
}

// 이메일 인증 확인
async function verifyEmail() {
    const allInputs = document.querySelectorAll('.code-input');
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
    document.querySelector('.auth-tabs').style.display = 'flex';
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
    document.querySelector('.auth-tabs').style.display = 'flex';
    document.getElementById('register-form').classList.add('active');
    document.querySelector('.auth-tab[data-tab="register"]').click();
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
        const response = await apiCall('/auth/google', {
            method: 'POST',
            body: JSON.stringify({ credential })
        });

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
        showToast('Google login failed. Please try again.', 'error');
    }
}

// Google 사용자 정보로 로그인
async function processGoogleUserInfo(userInfo) {
    try {
        const response = await apiCall('/auth/google-userinfo', {
            method: 'POST',
            body: JSON.stringify({
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
                google_id: userInfo.id
            })
        });

        localStorage.setItem('supplier_logged_in', 'true');
        localStorage.setItem('supplier_token', response.access_token);
        localStorage.setItem('supplier_id', response.supplier_id);
        localStorage.setItem('supplier_email', userInfo.email);
        localStorage.setItem('supplier_name', response.company_name || userInfo.name);

        showDashboard();
        loadNotifications();
        showToast('Successfully logged in with Google!');

    } catch (error) {
        console.error('Google login error:', error);
        showToast('Google login failed. Please try again.', 'error');
    }
}

// 비밀번호 찾기 화면
function showForgotPassword(e) {
    e.preventDefault();
    hideAllAuthForms();
    document.querySelector('.auth-tabs').style.display = 'none';
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
    document.querySelector('.auth-tabs').style.display = 'flex';
    document.getElementById('login-form').classList.add('active');
    document.querySelector('.auth-tab[data-tab="login"]').classList.add('active');
    document.querySelector('.auth-tab[data-tab="register"]').classList.remove('active');
}

// 로그아웃
function logout() {
    localStorage.removeItem('supplier_logged_in');
    localStorage.removeItem('supplier_token');
    localStorage.removeItem('supplier_id');
    localStorage.removeItem('supplier_email');
    localStorage.removeItem('supplier_name');

    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('user-menu').style.display = 'none';
    document.querySelector('.auth-tabs').style.display = 'flex';
    document.body.classList.remove('dashboard-mode');
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
        showDashboard();
    }
});

// ==================== Dashboard Navigation ====================

document.querySelectorAll('.nav-btn:not(.nav-parent)').forEach(btn => {
    btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        if (section) {
            showSection(section);
        }
    });
});

function showSection(sectionName) {
    // 패널 전환
    document.querySelectorAll('.dashboard-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`panel-${sectionName}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }

    // 네비게이션 버튼 활성화 상태 업데이트
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionName) {
            btn.classList.add('active');

            // 서브메뉴 항목이면 부모 메뉴 열기
            const navGroup = btn.closest('.nav-group');
            if (navGroup) {
                navGroup.classList.add('expanded');
            }
        }
    });
}

// 서브메뉴 토글
function toggleSubmenu(btn) {
    const navGroup = btn.closest('.nav-group');
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
        const isIncomplete = row.classList.contains('incomplete-row');
        let show = true;

        switch (filter) {
            case 'complete':
                show = !isIncomplete;
                break;
            case 'incomplete':
                show = isIncomplete;
                break;
            case 'no-moq':
            case 'no-image':
            case 'no-cert':
                // TODO: 상세 필터링 구현
                show = isIncomplete;
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

function editProduct(productId) {
    // 모달 표시
    document.getElementById('product-modal').style.display = 'flex';

    // 데모 데이터 로드
    const demoProducts = {
        1: { name: 'Extra Virgin Olive Oil 500ml', sku: 'OIL-001', moq: 200, certs: ['organic', 'haccp'] },
        3: { name: 'Aged Parmesan 24 months', sku: 'CHE-003', moq: null, certs: ['dop'] },
        5: { name: 'Raw Honey 500g', sku: 'HON-005', moq: null, certs: [] }
    };

    const product = demoProducts[productId] || demoProducts[1];

    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-product-sku').value = product.sku;
    document.getElementById('edit-moq').value = product.moq || '';

    // 누락 데이터 강조
    if (!product.moq || product.certs.length === 0) {
        document.getElementById('modal-missing-alert').style.display = 'flex';
    } else {
        document.getElementById('modal-missing-alert').style.display = 'none';
    }
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

async function saveProduct() {
    const productId = document.getElementById('edit-product-id')?.value;
    const moq = document.getElementById('edit-moq').value;

    if (!moq) {
        showToast('Please fill in MOQ (required)', 'warning');
        return;
    }

    try {
        // API 호출
        await apiCall(`/products/${productId || 1}`, {
            method: 'PUT',
            body: JSON.stringify({
                product_id: parseInt(productId || 1),
                moq: parseInt(moq)
            })
        });

        closeProductModal();
        showToast('Product updated successfully!');

        // 완성도 재계산 요청
        const supplierId = localStorage.getItem('supplier_id') || '1';
        await apiCall(`/data-completeness/refresh/${supplierId}`, { method: 'POST' });

        // UI 업데이트
        await checkDataCompleteness();
        await loadProducts();

    } catch (error) {
        console.error('Save error:', error);
        // 오프라인/데모 모드
        closeProductModal();
        showToast('Product updated successfully!');
    }
}

// 상품 목록 로드
async function loadProducts(filter = null) {
    const supplierId = localStorage.getItem('supplier_id') || '1';

    try {
        let endpoint = `/products/${supplierId}`;
        if (filter) {
            endpoint += `?filter_missing=${filter}`;
        }

        const data = await apiCall(endpoint);
        renderProductList(data.products);

    } catch (error) {
        console.error('Failed to load products:', error);
        // 데모 데이터 사용
    }
}

function renderProductList(products) {
    const container = document.getElementById('product-list');
    if (!container) return;

    container.innerHTML = products.map(product => `
        <div class="product-row ${product.completeness < 70 ? 'incomplete' : ''}">
            <div class="product-info">
                <span class="product-name">${product.name}</span>
                <span class="product-sku">${product.sku}</span>
            </div>
            <div class="product-moq">
                ${product.moq ? product.moq : '<span class="missing">Missing</span>'}
            </div>
            <div class="product-price">
                ${product.unit_price ? `$${product.unit_price}` : '<span class="missing">—</span>'}
            </div>
            <div class="product-certs">
                ${product.certifications?.length > 0
                    ? product.certifications.map(c => `<span class="cert-badge">${c}</span>`).join('')
                    : '<span class="missing">None</span>'}
            </div>
            <div class="product-actions">
                <button class="btn-edit" onclick="editProduct(${product.id})">Edit</button>
            </div>
        </div>
    `).join('');
}

function addMOQ(productId) {
    editProduct(productId);
}

function addCert(productId) {
    editProduct(productId);
}

function openAddProductModal() {
    // 새 상품 추가 모달 (구현 필요)
    showToast('Add product feature coming soon');
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
    const supplierId = localStorage.getItem('supplier_id') || '1';

    // 1. API에서 전체 상품 가져오기 시도
    try {
        const data = await apiCall(`/products/${supplierId}?all=true`);
        if (data.products && data.products.length > 0) {
            return data.products;
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
            <tr class="${isIncomplete ? 'incomplete-row' : ''}">
                <td class="col-checkbox"><input type="checkbox" class="extract-checkbox" data-id="${product.id}" onchange="updateSelectedCount()" checked></td>
                <td>
                    <div class="product-cell">
                        <span class="product-thumb">${product.emoji}</span>
                        <span class="product-name">${product.name}</span>
                    </div>
                </td>
                <td>
                    ${product.category
                        ? `<span class="category-badge">${getCategoryLabel(product.category)}</span>`
                        : `<span class="category-badge missing">${t('products.missing') || 'Missing'}</span>`
                    }
                </td>
                <td>${product.price || '<span class="missing-data">-</span>'}</td>
                <td><span class="status-dot ${product.status}"></span> ${t('products.' + product.status) || product.status}</td>
                <td>
                    <button class="btn btn-sm ${isIncomplete ? 'btn-warning' : 'btn-outline'}"
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
            <tr class="${needsFillIn ? 'incomplete-row' : ''}">
                <td class="col-checkbox"></td>
                <td>
                    <div class="product-cell">
                        <span class="product-thumb">${product.emoji}</span>
                        <span class="product-name">${product.name}</span>
                    </div>
                </td>
                <td>
                    ${product.category
                        ? `<span class="category-badge">${getCategoryLabel(product.category)}</span>`
                        : `<span class="category-badge missing">${t('products.missing') || 'Missing'}</span>`
                    }
                </td>
                <td>${originalPrice || '<span class="missing-data">-</span>'}</td>
                <td class="${priceChanged ? 'price-updated' : ''}">
                    ${hasPriceList
                        ? (newPrice || '<span class="missing-data">-</span>')
                        : '<span class="missing-data">-</span>'
                    }
                </td>
                <td>
                    <button class="btn btn-sm ${needsFillIn ? 'btn-warning' : 'btn-outline'}"
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

// PO 목록 필터링
function filterPOList() {
    const filter = document.getElementById('po-status-filter').value;
    const rows = document.querySelectorAll('#po-list-tbody tr');

    rows.forEach(row => {
        const statusBadge = row.querySelector('.status-badge');
        const status = statusBadge ? statusBadge.classList[1] : '';

        if (filter === 'all' || status === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// PO 검색
function searchPO() {
    const searchTerm = document.getElementById('po-search').value.toLowerCase();
    const rows = document.querySelectorAll('#po-list-tbody tr');

    rows.forEach(row => {
        const poNumber = row.querySelector('.po-number')?.textContent.toLowerCase() || '';
        const buyerName = row.querySelector('.buyer-name')?.textContent.toLowerCase() || '';

        if (poNumber.includes(searchTerm) || buyerName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
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
    document.getElementById('po-detail-status').className = 'status-badge ' + data.statusClass;
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
            <td class="text-right">${item.qty}</td>
            <td>${item.unit}</td>
            <td class="text-right">${item.price}</td>
            <td class="text-right">${item.total}</td>
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

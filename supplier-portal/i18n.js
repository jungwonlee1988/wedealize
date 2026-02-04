// WeDealize Supplier Portal - Internationalization (i18n)
// 영어 기준 동적 AI 번역 시스템

// API 설정
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api/v1/supplier';

// 영어 원본 (Source of Truth)
const englishTranslations = {
    header: {
        supplierPortal: "Supplier Portal",
        logout: "Logout",
        selectLanguage: "Select Language"
    },
    auth: {
        login: "Login",
        register: "Register",
        welcomeBack: "Welcome Back",
        accessDashboard: "Access your supplier dashboard",
        joinWedealize: "Join WeDealize",
        registerSubtitle: "Register as a supplier partner",
        email: "Email",
        password: "Password",
        rememberMe: "Remember me",
        forgotPassword: "Forgot password?",
        companyName: "Company Name",
        country: "Country",
        selectCountry: "Select country",
        businessEmail: "Business Email",
        productCategory: "Product Category",
        selectCategory: "Select category",
        agreeTerms: "I agree to the",
        termsOfService: "Terms of Service",
        createAccount: "Create Account",
        continueWithGoogle: "Continue with Google",
        or: "or"
    },
    verification: {
        verifyEmail: "Verify Your Email",
        codeSentTo: "We sent a verification code to",
        enterCode: "Enter 6-digit code",
        verifyButton: "Verify Email",
        didntReceive: "Didn't receive the code?",
        resend: "Resend",
        resendIn: "Resend available in",
        backToRegister: "Back to Register"
    },
    passwordReset: {
        resetPassword: "Reset Password",
        enterEmail: "Enter your email to receive a reset link",
        sendResetLink: "Send Reset Link",
        backToLogin: "Back to Login",
        checkEmail: "Check Your Email",
        resetLinkSent: "We sent a password reset link to",
        linkExpires: "Click the link in the email to reset your password. The link will expire in 24 hours."
    },
    dashboard: {
        overview: "Overview",
        product: "Product",
        productManagement: "Product Management",
        catalogRegistration: "Catalog Registration",
        productList: "Product List",
        sales: "Sales",
        poManagement: "PO Management",
        inquiries: "Inquiries",
        companyProfile: "Company Profile",
        dashboardOverview: "Dashboard Overview",
        welcomeStatus: "Welcome back! Here's your supplier status.",
        completeProfile: "Complete Your Profile",
        dataIncomplete: "Your product data is {percent}% complete. Add missing information to increase visibility to buyers.",
        completeNow: "Complete Now",
        productsListed: "Products Listed",
        profileViews: "Profile Views (30d)",
        newInquiries: "New Inquiries",
        dataCompleteness: "Data Completeness",
        recentActivity: "Recent Activity"
    },
    sales: {
        poManagement: "PO Management",
        poSubtitle: "Manage purchase orders from buyers.",
        pendingPO: "Pending",
        confirmedPO: "Confirmed",
        inShipping: "In Shipping",
        completedPO: "Completed",
        cancelledPO: "Cancelled",
        allOrders: "All Orders",
        searchPO: "Search PO#, Buyer...",
        exportPO: "Export",
        poNumber: "PO #",
        buyer: "Buyer",
        orderDate: "Order Date",
        items: "Items",
        totalAmount: "Total Amount",
        status: "Status",
        actions: "Actions",
        view: "View",
        confirm: "Confirm",
        shipment: "Shipment",
        track: "Track"
    },
    catalog: {
        registrationTitle: "Catalog Registration",
        registrationSubtitle: "Upload your product catalog to automatically extract and register products.",
        productCatalog: "Product Catalog",
        catalogDescription: "Upload your product catalog file. We'll automatically extract product information including names, descriptions, and specifications.",
        priceList: "Price List",
        priceListDescription: "Add a price list to automatically match prices with extracted products.",
        optional: "Optional",
        dragDrop: "Drag & drop or",
        browse: "browse",
        maxSize: "Max",
        processExtract: "Process & Extract Products",
        processingFiles: "Processing Your Files",
        uploadHistory: "Upload History",
        fileName: "File Name",
        type: "Type",
        uploaded: "Uploaded",
        status: "Status",
        products: "Products",
        actions: "Actions",
        extractedProducts: "Extracted Products",
        extractedInfo: "Products extracted from catalog are shown below. Required fields: Category, Product Name. Missing information will be marked as incomplete.",
        selectAll: "Select All",
        moveToList: "Move to Product List",
        source: "Source",
        movedSuccess: "products moved to Product List successfully!",
        selectProducts: "Please select products to move.",
        // Step-based UI
        step1: "Upload Catalog",
        step2: "Review Products",
        step3: "Match Prices",
        step4: "Complete",
        uploadCatalogTitle: "Upload Product Catalog",
        extractProducts: "Extract Products",
        extracting: "Extracting...",
        uploadRequired: "Please upload a catalog file first",
        extractSuccess: "Products extracted successfully!",
        reviewExtracted: "Review Extracted Products",
        productsExtracted: "products extracted",
        matchPrices: "Match Prices",
        priceMatchDescription: "Upload a price list to automatically match prices with your extracted products. You can skip this step and add prices later.",
        price: "Price",
        originalPrice: "Original",
        newPrice: "New Price",
        pricesMatched: "prices matched",
        matchingPrices: "Matching prices...",
        resetPriceList: "Reset Price List",
        priceListReset: "Price list has been reset",
        skipStep: "Skip this step",
        priceSkipped: "Price matching skipped. You can add prices later.",
        backToReview: "Back to Review",
        uploadDifferent: "Upload Different File",
        nextMatchPrices: "Next: Match Prices",
        finishRegistration: "Finish Registration",
        registrationComplete: "Registration Complete!",
        productsRegistered: "products have been registered.",
        registerAnother: "Register Another Catalog",
        viewProductList: "View Product List",
        remove: "Remove"
    },
    products: {
        listTitle: "Product List",
        listSubtitle: "Manage your registered products. Required fields: Category, Product Name.",
        dataCompleteness: "Data Completeness",
        requiredFields: "Required fields",
        allProducts: "All Products",
        incompleteData: "Incomplete Data",
        missingMOQ: "Missing MOQ",
        missingImages: "Missing Images",
        missingCerts: "Missing Certifications",
        addMissing: "Add missing",
        exportCSV: "Export CSV",
        addProduct: "Add Product",
        product: "Product",
        sku: "SKU",
        priceFOB: "Price (FOB)",
        moq: "MOQ",
        complete: "Complete",
        incomplete: "Incomplete",
        edit: "Edit",
        fillIn: "Fill in",
        missing: "Missing",
        add: "Add",
        noCerts: "No certifications"
    },
    inquiry: {
        title: "Inquiries",
        subtitle: "Manage buyer inquiries and sample requests.",
        new: "New",
        sampleRequest: "Sample Request",
        quotationRequest: "Quotation Request",
        from: "From",
        quantity: "Quantity",
        incoterm: "Incoterm",
        samples: "Samples",
        viewDetails: "View Details",
        sendQuotation: "Send Quotation",
        approveSample: "Approve Sample"
    },
    profile: {
        title: "Company Profile",
        subtitle: "Manage your company information visible to buyers.",
        basicInfo: "Basic Information",
        phone: "Phone",
        website: "Website",
        companyDetails: "Company Details",
        yearEstablished: "Year Established",
        employees: "Number of Employees",
        description: "Company Description",
        descPlaceholder: "Describe your company and products...",
        companyCertifications: "Company Certifications",
        companyCertsDesc: "Certifications that apply to your entire company. Product-specific certifications can be added when editing each product.",
        uploadCertDocs: "Upload Certification Documents",
        valid: "Valid",
        expired: "Expired",
        tradeTerms: "Trade Terms",
        minOrderValue: "Minimum Order Value",
        leadTime: "Lead Time (days)",
        paymentTerms: "Payment Terms",
        saveChanges: "Save Changes"
    },
    modal: {
        editProduct: "Edit Product",
        productName: "Product Name",
        category: "Category",
        priceMin: "Min Price (FOB USD)",
        priceMax: "Max Price (FOB USD)",
        moqLabel: "MOQ (Minimum Order Quantity)",
        moqUnit: "MOQ Unit",
        specifications: "Specifications",
        specsPlaceholder: "Weight, packaging, ingredients...",
        certifications: "Certifications",
        productCertifications: "Product Certifications",
        productCertsDesc: "Certifications specific to this product",
        productImage: "Product Image",
        clickUpload: "Click to upload image",
        cancel: "Cancel",
        saveProduct: "Save Product",
        required: "Required",
        fillMissing: "Please fill in the missing information:"
    },
    categories: {
        oils: "Oils & Vinegars",
        dairy: "Dairy & Cheese",
        beverages: "Beverages & Tea",
        snacks: "Snacks & Confectionery",
        sauces: "Sauces & Condiments",
        organic: "Organic & Health",
        frozen: "Frozen Foods",
        other: "Other"
    },
    countries: {
        IT: "Italy",
        FR: "France",
        JP: "Japan",
        US: "United States",
        NZ: "New Zealand",
        ES: "Spain",
        DE: "Germany",
        CN: "China",
        KR: "South Korea",
        OTHER: "Other"
    },
    units: {
        pieces: "Pieces",
        bottles: "Bottles",
        cases: "Cases",
        kg: "Kg"
    },
    status: {
        processed: "Processed",
        matched: "Matched",
        notMatched: "Not matched",
        updated: "Updated",
        needsReview: "Needs Review",
        pending: "Pending"
    },
    toast: {
        loginSuccess: "Successfully logged in!",
        registerSuccess: "Account created! Welcome to WeDealize.",
        verificationSent: "Verification code sent.",
        verificationSuccess: "Email verified! Welcome to WeDealize.",
        invalidCode: "Invalid code. Please try again.",
        profileSaved: "Profile saved!",
        productUpdated: "Product updated!",
        uploadSuccess: "Catalog processed successfully!",
        googleLoginSuccess: "Successfully logged in with Google!",
        resetLinkSent: "Password reset link sent.",
        translationError: "Translation failed. Showing English."
    },
    time: {
        hoursAgo: "hours ago",
        dayAgo: "day ago",
        daysAgo: "days ago"
    }
};

// 지원 언어 목록
const supportedLanguages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
    { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
    { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' }
];

// 번역 캐시 (localStorage 기반)
const CACHE_KEY = 'wedealize_translations_cache';
const CACHE_VERSION = '1.4';  // 영어 원본 변경 시 버전 올리면 캐시 자동 초기화

// 캐시 로드
function loadTranslationCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const data = JSON.parse(cached);
            if (data.version === CACHE_VERSION) {
                return data.translations;
            }
        }
    } catch (e) {
        console.warn('Failed to load translation cache:', e);
    }
    return {};
}

// 캐시 저장
function saveTranslationCache(translations) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            version: CACHE_VERSION,
            translations: translations,
            updatedAt: new Date().toISOString()
        }));
    } catch (e) {
        console.warn('Failed to save translation cache:', e);
    }
}

// 번역 캐시
let translationCache = loadTranslationCache();

// 현재 언어
let currentLanguage = localStorage.getItem('supplier_language') || 'en';

// 백엔드 AI 번역 API 호출
async function translateWithBackend(translations, targetLang) {
    try {
        const response = await fetch(`${API_BASE_URL}/translate/batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                translations: translations,
                target_lang: targetLang
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`Translation completed via ${data.provider || 'cache'}`);
            return data.translations;
        } else {
            const error = await response.json();
            console.error('Translation API error:', error);
            throw new Error(error.detail || 'Translation failed');
        }
    } catch (e) {
        console.error('Translation request failed:', e);
        throw e;
    }
}

// 폴백: 무료 Google Translate (품질 낮음)
async function translateWithGoogleFree(text, targetLang) {
    if (!text || targetLang === 'en') return text;

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data[0]) {
            return data[0].map(item => item[0]).join('');
        }
    } catch (e) {
        console.warn('Google translate fallback failed:', e);
    }
    return text;
}

// 전체 번역 생성
async function generateTranslations(targetLang) {
    if (targetLang === 'en') {
        return englishTranslations;
    }

    // 캐시 확인
    if (translationCache[targetLang]) {
        console.log(`Using cached translations for: ${targetLang}`);
        return translationCache[targetLang];
    }

    console.log(`Generating AI translations for: ${targetLang}`);
    showTranslationProgress(true, 'Translating...');

    try {
        // 1차: 백엔드 AI 번역 API 시도
        const result = await translateWithBackend(englishTranslations, targetLang);

        // 캐시에 저장
        translationCache[targetLang] = result;
        saveTranslationCache(translationCache);

        console.log(`AI translations generated and cached for: ${targetLang}`);
        return result;

    } catch (backendError) {
        console.warn('Backend translation failed, trying fallback...', backendError);

        // 2차: Google 무료 API 폴백
        try {
            updateTranslationProgress(0, 'Fallback translating...');
            const result = await translateWithGoogleFallback(englishTranslations, targetLang);

            translationCache[targetLang] = result;
            saveTranslationCache(translationCache);

            return result;
        } catch (fallbackError) {
            console.error('All translation methods failed:', fallbackError);
            showToast(t('toast.translationError'), 'error');
            return englishTranslations;
        }
    } finally {
        showTranslationProgress(false);
    }
}

// Google 무료 API로 전체 번역 (폴백용)
async function translateWithGoogleFallback(obj, targetLang) {
    const texts = [];
    const paths = [];

    function collectTexts(obj, path = '') {
        if (typeof obj === 'string') {
            texts.push(obj);
            paths.push(path);
        } else if (typeof obj === 'object' && obj !== null) {
            for (const key of Object.keys(obj)) {
                collectTexts(obj[key], path ? `${path}.${key}` : key);
            }
        }
    }

    collectTexts(obj);

    const batchSize = 10;
    const translatedTexts = [];

    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(text => translateWithGoogleFree(text, targetLang))
        );
        translatedTexts.push(...batchResults);

        const progress = Math.round((translatedTexts.length / texts.length) * 100);
        updateTranslationProgress(progress);
    }

    // 결과를 객체로 재구성
    const result = {};
    for (let i = 0; i < paths.length; i++) {
        const pathParts = paths[i].split('.');
        let current = result;

        for (let j = 0; j < pathParts.length - 1; j++) {
            if (!current[pathParts[j]]) {
                current[pathParts[j]] = {};
            }
            current = current[pathParts[j]];
        }

        current[pathParts[pathParts.length - 1]] = translatedTexts[i];
    }

    return result;
}

// 번역 진행률 UI
function showTranslationProgress(show, message = 'Translating...') {
    let progressEl = document.getElementById('translation-progress');

    if (show) {
        if (!progressEl) {
            progressEl = document.createElement('div');
            progressEl.id = 'translation-progress';
            document.body.appendChild(progressEl);
        }
        progressEl.innerHTML = `
            <div class="translation-progress-overlay">
                <div class="translation-progress-box">
                    <div class="translation-progress-spinner"></div>
                    <div class="translation-progress-text">
                        <span id="translation-message">${message}</span>
                        <span id="translation-percent"></span>
                    </div>
                </div>
            </div>
        `;
        progressEl.style.display = 'block';
    } else if (progressEl) {
        progressEl.style.display = 'none';
    }
}

function updateTranslationProgress(percent, message) {
    const percentEl = document.getElementById('translation-percent');
    const messageEl = document.getElementById('translation-message');

    if (percentEl && percent !== undefined) {
        percentEl.textContent = ` ${percent}%`;
    }
    if (messageEl && message) {
        messageEl.textContent = message;
    }
}

// 번역 텍스트 가져오기
function t(key) {
    const keys = key.split('.');

    // 현재 언어의 번역 가져오기
    let value = currentLanguage === 'en'
        ? englishTranslations
        : (translationCache[currentLanguage] || englishTranslations);

    for (const k of keys) {
        if (value && value[k] !== undefined) {
            value = value[k];
        } else {
            // 번역이 없으면 영어 폴백
            let fallback = englishTranslations;
            for (const fk of keys) {
                if (fallback && fallback[fk] !== undefined) {
                    fallback = fallback[fk];
                } else {
                    return key;
                }
            }
            return fallback;
        }
    }

    return value;
}

// 언어 변경
async function setLanguage(langCode) {
    if (!supportedLanguages.find(l => l.code === langCode)) {
        console.warn('Unsupported language:', langCode);
        return;
    }

    currentLanguage = langCode;
    localStorage.setItem('supplier_language', langCode);

    // RTL 처리
    const langInfo = supportedLanguages.find(l => l.code === langCode);
    if (langInfo && langInfo.rtl) {
        document.documentElement.setAttribute('dir', 'rtl');
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
    }

    // 영어가 아니면 번역 생성
    if (langCode !== 'en' && !translationCache[langCode]) {
        await generateTranslations(langCode);
    }

    // UI 업데이트
    updateUILanguage();
    updateLanguageButton();
}

// 현재 언어 가져오기
function getCurrentLanguage() {
    return currentLanguage;
}

// 언어 버튼 업데이트
function updateLanguageButton() {
    const btn = document.getElementById('language-btn');
    if (btn) {
        const lang = supportedLanguages.find(l => l.code === currentLanguage);
        if (lang) {
            btn.innerHTML = `${lang.flag} ${lang.nativeName} <span class="dropdown-arrow">▼</span>`;
        }
    }
}

// UI 전체 언어 업데이트
function updateUILanguage() {
    // data-i18n 속성이 있는 모든 요소 업데이트
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);

        if (el.tagName === 'INPUT' && el.type === 'text') {
            el.placeholder = text;
        } else if (el.tagName === 'INPUT' && el.type === 'submit') {
            el.value = text;
        } else {
            el.textContent = text;
        }
    });

    // data-i18n-placeholder 속성
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });

    // data-i18n-title 속성
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });
}

// 브라우저 언어 감지
function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0];

    if (supportedLanguages.find(l => l.code === langCode)) {
        return langCode;
    }
    return 'en';
}

// 캐시 초기화 (영어 원본이 변경되었을 때 호출)
function clearTranslationCache() {
    translationCache = {};
    localStorage.removeItem(CACHE_KEY);
    console.log('Translation cache cleared');
}

// 특정 언어 캐시만 초기화
function clearLanguageCache(langCode) {
    if (translationCache[langCode]) {
        delete translationCache[langCode];
        saveTranslationCache(translationCache);
        console.log(`Cache cleared for: ${langCode}`);
    }
}

// 모든 언어 미리 번역 (백그라운드)
async function preloadAllTranslations() {
    console.log('Preloading all translations...');

    for (const lang of supportedLanguages) {
        if (lang.code !== 'en' && !translationCache[lang.code]) {
            try {
                await generateTranslations(lang.code);
                // API 부하 방지를 위한 딜레이
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (e) {
                console.error(`Failed to preload ${lang.code}:`, e);
            }
        }
    }

    console.log('All translations preloaded');
}

// Toast 메시지 (에러 표시용)
function showToast(message, type = 'info') {
    // app.js의 showToast 함수가 있으면 사용
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

// 초기화
async function initI18n() {
    // 저장된 언어가 없으면 영어 기본값 사용
    if (!localStorage.getItem('supplier_language')) {
        currentLanguage = 'en';
        localStorage.setItem('supplier_language', currentLanguage);
    }

    // 초기 UI 업데이트
    await setLanguage(currentLanguage);
}

// CSS 스타일 주입 (번역 진행률 표시용)
(function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .translation-progress-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        }
        .translation-progress-box {
            background: white;
            padding: 30px 50px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .translation-progress-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #2563eb;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        .translation-progress-text {
            font-size: 16px;
            color: #333;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
})();

// WeDealize - Authentication
(function() {
    'use strict';

    // === Private State ===
    var GOOGLE_CLIENT_ID = '922089603849-fgcilcaqoohkqs0dslblb6giq7v0r2nh.apps.googleusercontent.com';
    var pendingRegistration = null;
    var verificationTimer = null;

    // === Helpers ===
    function onLoginSuccess() {
        // Check for pending team invite — redirect back to accept-invite page
        var pendingToken = localStorage.getItem('pending_invite_token');
        if (pendingToken) {
            localStorage.removeItem('pending_invite_token');
            window.location.href = 'accept-invite.html?token=' + encodeURIComponent(pendingToken);
            return;
        }
        window.showDashboard();
    }

    // === Constants ===
    var CATEGORY_GROUPS = {
        'Oils & Fats': ['evoo', 'olive-oil', 'seed-oils', 'nut-oils', 'truffle-oil'],
        'Vinegars & Condiments': ['balsamic', 'wine-vinegar', 'sauces', 'mustard-dressings'],
        'Dairy & Cheese': ['hard-cheese', 'soft-cheese', 'aged-cheese', 'butter-cream'],
        'Meat & Charcuterie': ['cured-meats', 'sausages', 'smoked-meats'],
        'Pasta & Grains': ['dried-pasta', 'fresh-pasta', 'rice', 'flour-semolina'],
        'Bakery & Confectionery': ['bread', 'biscuits-cookies', 'chocolate', 'pastries'],
        'Canned & Preserved': ['tomato-products', 'pickles-olives', 'preserved-veg', 'jams-spreads'],
        'Beverages': ['wine', 'spirits', 'coffee', 'tea', 'juices-soft'],
        'Seafood': ['fresh-fish', 'canned-fish', 'shellfish', 'smoked-fish'],
        'Spices, Herbs & Sweeteners': ['spice-blends', 'herbs', 'honey'],
        'Snacks & Nuts': ['nuts-dried-fruit', 'chips-crackers', 'bars'],
        'Specialty & Health': ['organic', 'gluten-free', 'vegan-plant', 'frozen']
    };

    var CATEGORY_LABELS = {
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
        'gluten-free': 'Gluten-Free', 'vegan-plant': 'Vegan & Plant-Based', 'frozen': 'Frozen Foods'
    };

    // === Private Functions ===

    function hideAllAuthForms() {
        document.getElementById('login-form').classList.remove('active');
        document.getElementById('register-form').classList.remove('active');
        document.getElementById('verify-form').style.display = 'none';
        document.getElementById('forgot-form').style.display = 'none';
        document.getElementById('reset-sent-form').style.display = 'none';
    }

    function showVerificationForm(email) {
        hideAllAuthForms();
        document.querySelector('.wd-auth-tabs').style.display = 'none';
        document.getElementById('verify-form').style.display = 'block';
        document.getElementById('verify-email-display').textContent = email;

        document.querySelectorAll('.wd-code-input').forEach(function(input) {
            input.value = '';
            input.classList.remove('filled', 'error');
        });
        document.querySelector('.wd-code-input').focus();
        startResendTimer();
    }

    function startResendTimer() {
        var resendBtn = document.getElementById('resend-btn');
        var timerEl = document.getElementById('resend-timer');
        var countEl = document.getElementById('timer-count');

        resendBtn.disabled = true;
        resendBtn.style.display = 'none';
        timerEl.style.display = 'inline';

        var seconds = 60;
        countEl.textContent = seconds;

        if (verificationTimer) clearInterval(verificationTimer);

        verificationTimer = setInterval(function() {
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

    function completeRegistration(response) {
        localStorage.setItem('supplier_logged_in', 'true');
        localStorage.setItem('supplier_token', response.access_token);
        localStorage.setItem('supplier_id', response.supplier_id);
        localStorage.setItem('supplier_email', pendingRegistration.email);
        localStorage.setItem('supplier_name', pendingRegistration.company);

        if (verificationTimer) {
            clearInterval(verificationTimer);
            verificationTimer = null;
        }

        pendingRegistration = null;
        document.querySelector('.wd-auth-tabs').style.display = 'flex';
        window.showDashboard();
        showToast('Email verified! Welcome to WeDealize.');
    }

    function googlePopupLogin() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            var client = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: 'email profile',
                callback: function(response) {
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

    function handleGoogleCredential(response) {
        if (response.credential) {
            processGoogleAuth(response.credential);
        }
    }

    async function fetchGoogleUserInfo(accessToken) {
        try {
            var response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: 'Bearer ' + accessToken }
            });
            var userInfo = await response.json();
            processGoogleUserInfo(userInfo);
        } catch (error) {
            console.error('Failed to fetch Google user info:', error);
            showToast('Google login failed. Please try again.', 'error');
        }
    }

    async function processGoogleAuth(credential) {
        try {
            var response = await apiCall('/auth/google', {
                method: 'POST',
                body: JSON.stringify({ credential: credential })
            });

            localStorage.setItem('supplier_logged_in', 'true');
            localStorage.setItem('supplier_token', response.access_token);
            localStorage.setItem('supplier_id', response.supplier_id);
            localStorage.setItem('supplier_email', response.email);
            localStorage.setItem('supplier_name', response.company_name || response.email.split('@')[0]);

            window.showDashboard();
            loadNotifications();
            showToast('Successfully logged in with Google!');
        } catch (error) {
            console.error('Google auth error:', error);
            showToast(error.message || 'Google login failed. Please try again.', 'error');
        }
    }

    function processGoogleUserInfo(userInfo) {
        showToast('No account found for this email. Please register first.', 'error');
    }

    function filterCountries(searchTerm) {
        var countryList = document.getElementById('country-list');
        if (!countryList) return;
        var options = countryList.querySelectorAll('.wd-country-option');
        var groupLabels = countryList.querySelectorAll('.wd-country-group-label');
        var visibleGroups = new Set();

        options.forEach(function(option) {
            var name = (option.dataset.name || '').toLowerCase();
            var code = (option.dataset.value || '').toLowerCase();
            if (name.includes(searchTerm) || code.includes(searchTerm)) {
                option.style.display = '';
                var prevSibling = option.previousElementSibling;
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

        groupLabels.forEach(function(label) {
            label.style.display = visibleGroups.has(label) ? '' : 'none';
        });
    }

    // === Notification Functions ===

    async function loadNotifications() {
        var supplierId = localStorage.getItem('supplier_id') || '1';
        try {
            var data = await apiCall('/notifications/' + supplierId);
            updateNotificationBadge(data.unread_count);
            renderNotifications(data.notifications);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    function updateNotificationBadge(count) {
        var badge = document.getElementById('notification-badge');
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
        var container = document.getElementById('notification-list');
        if (!container) return;
        container.innerHTML = notifications.map(function(n) {
            return '<div class="notification-item ' + (n.is_read ? '' : 'unread') + '" onclick="handleNotificationClick(' + n.id + ', \'' + n.action_url + '\')">' +
                '<div class="notification-icon ' + n.type + '">' + getNotificationIcon(n.type) + '</div>' +
                '<div class="notification-content">' +
                '<div class="notification-title">' + n.title + '</div>' +
                '<div class="notification-message">' + n.message + '</div>' +
                '</div></div>';
        }).join('');
    }

    function getNotificationIcon(type) {
        var icons = { data_completion: '\uD83D\uDCCA', inquiry: '\uD83D\uDCE8', system: '\uD83D\uDD14' };
        return icons[type] || '\uD83D\uDD14';
    }

    // === Auth Tab Switching ===

    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.wd-auth-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                var tabName = tab.dataset.tab;
                document.querySelectorAll('.wd-auth-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');

                document.getElementById('login-form').classList.remove('active');
                document.getElementById('register-form').classList.remove('active');

                if (tabName === 'login') {
                    document.getElementById('login-form').classList.add('active');
                } else if (tabName === 'register') {
                    document.getElementById('register-form').classList.add('active');
                }
            });
        });

        // Handle #signup hash
        if (window.location.hash === '#signup') {
            var regTab = document.querySelector('.wd-auth-tab[data-tab="register"]');
            if (regTab) regTab.click();
        }
    });

    // === Public API ===

    window.handleLogin = async function(e) {
        if (e) e.preventDefault();
        var email = document.getElementById('login-email').value;
        var password = document.getElementById('login-password').value;

        if (!email || !password) {
            showToast('Please enter email and password', 'error');
            return;
        }

        try {
            var response = await apiCall('/login', {
                method: 'POST',
                body: JSON.stringify({ email: email, password: password })
            });

            localStorage.setItem('supplier_logged_in', 'true');
            localStorage.setItem('supplier_token', response.access_token);
            localStorage.setItem('supplier_id', response.supplier_id);
            localStorage.setItem('supplier_email', response.email);
            localStorage.setItem('supplier_name', response.company_name);

            showToast(t('toast.loginSuccess'), 'success');
            window.showDashboard();
        } catch (apiError) {
            console.error('Login failed:', apiError.message);

            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                localStorage.setItem('supplier_logged_in', 'true');
                localStorage.setItem('supplier_token', 'demo_token');
                localStorage.setItem('supplier_id', 'demo_supplier');
                localStorage.setItem('supplier_email', email);
                localStorage.setItem('supplier_name', email.split('@')[0] || 'Demo User');
                localStorage.setItem('wedealize_email', email);
                localStorage.setItem('wedealize_name', email.split('@')[0] || 'Demo User');

                showToast('Demo mode: Logged in successfully!', 'success');
                window.showDashboard();
                return;
            }

            showToast('Invalid email or password', 'error');
        }
    };

    window.handleRegister = async function(e) {
        e.preventDefault();
        var company = document.getElementById('reg-company').value;
        var email = document.getElementById('reg-email').value;
        var password = document.getElementById('reg-password').value;
        var country = document.getElementById('reg-country')?.value;
        var category = document.getElementById('reg-category')?.value;

        pendingRegistration = { company: company, email: email, password: password, country: country, category: category };

        try {
            await apiCall('/auth/send-verification', {
                method: 'POST',
                body: JSON.stringify({ email: email, companyName: company })
            });
            showVerificationForm(email);
            showToast('Verification code sent to your email.');
        } catch (error) {
            console.error('Send verification error:', error);
            var msg = error.message || '';
            if (msg.includes('already registered')) {
                showToast('This email is already registered. Please log in instead.', 'error');
            } else {
                showToast(msg || 'Failed to send verification code.', 'error');
            }
        }
    };

    window.handleCodeInput = function(e) {
        var input = e.target;
        var index = parseInt(input.dataset.index);
        input.value = input.value.replace(/[^0-9]/g, '');

        if (input.value) {
            input.classList.add('filled');
            if (index < 5) {
                var nextInput = document.querySelector('.wd-code-input[data-index="' + (index + 1) + '"]');
                if (nextInput) nextInput.focus();
            }
        } else {
            input.classList.remove('filled');
        }

        var allInputs = document.querySelectorAll('.wd-code-input');
        var code = Array.from(allInputs).map(function(i) { return i.value; }).join('');
        if (code.length === 6) {
            window.verifyEmail();
        }
    };

    window.handleCodePaste = function(e) {
        e.preventDefault();
        var pastedData = (e.clipboardData || window.clipboardData).getData('text');
        var digits = pastedData.replace(/[^0-9]/g, '').slice(0, 6);

        if (digits.length > 0) {
            var allInputs = document.querySelectorAll('.wd-code-input');
            digits.split('').forEach(function(digit, i) {
                if (allInputs[i]) {
                    allInputs[i].value = digit;
                    allInputs[i].classList.add('filled');
                }
            });
            var lastIndex = Math.min(digits.length - 1, 5);
            allInputs[lastIndex].focus();
            if (digits.length === 6) {
                window.verifyEmail();
            }
        }
    };

    window.handleCodeKeydown = function(e) {
        var input = e.target;
        var index = parseInt(input.dataset.index);
        if (e.key === 'Backspace' && !input.value && index > 0) {
            var prevInput = document.querySelector('.wd-code-input[data-index="' + (index - 1) + '"]');
            if (prevInput) {
                prevInput.focus();
                prevInput.value = '';
                prevInput.classList.remove('filled');
            }
        }
    };

    window.verifyEmail = async function() {
        var allInputs = document.querySelectorAll('.wd-code-input');
        var code = Array.from(allInputs).map(function(i) { return i.value; }).join('');

        if (code.length !== 6) {
            showToast('Please enter the 6-digit verification code.', 'error');
            return;
        }

        try {
            var response = await apiCall('/auth/verify-email', {
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
            allInputs.forEach(function(input) {
                input.classList.add('error');
                setTimeout(function() { input.classList.remove('error'); }, 500);
            });
            showToast('Invalid verification code. Please try again.', 'error');
        }
    };

    window.resendVerificationCode = async function() {
        if (!pendingRegistration) return;
        try {
            await apiCall('/auth/send-verification', {
                method: 'POST',
                body: JSON.stringify({ email: pendingRegistration.email, companyName: pendingRegistration.company })
            });
            showToast('Verification code resent.');
            startResendTimer();
        } catch (error) {
            console.error('Resend error:', error);
            showToast('Verification code resent.');
            startResendTimer();
        }
    };

    window.backToRegister = function() {
        if (verificationTimer) {
            clearInterval(verificationTimer);
            verificationTimer = null;
        }
        hideAllAuthForms();
        document.querySelector('.wd-auth-tabs').style.display = 'flex';
        document.getElementById('register-form').classList.add('active');
        document.querySelector('.wd-auth-tab[data-tab="register"]').click();
    };

    window.backToLogin = function() {
        hideAllAuthForms();
        document.querySelector('.wd-auth-tabs').style.display = 'flex';
        document.getElementById('login-form').classList.add('active');
        document.querySelector('.wd-auth-tab[data-tab="login"]').classList.add('active');
        document.querySelector('.wd-auth-tab[data-tab="register"]').classList.remove('active');
    };

    window.showForgotPassword = function(e) {
        e.preventDefault();
        hideAllAuthForms();
        document.querySelector('.wd-auth-tabs').style.display = 'none';
        document.getElementById('forgot-form').style.display = 'block';
    };

    window.sendResetLink = async function() {
        var email = document.getElementById('forgot-email').value;
        if (!email) {
            showToast('Please enter your email address.', 'error');
            return;
        }
        try {
            await apiCall('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email: email })
            });
            showResetSent(email);
        } catch (error) {
            console.error('Reset link error:', error);
            showResetSent(email);
        }
    };

    function showResetSent(email) {
        hideAllAuthForms();
        document.getElementById('reset-sent-form').style.display = 'block';
        document.getElementById('reset-email-display').textContent = email;
    }

    window.logout = function() {
        removeFlashGuard();
        localStorage.removeItem('supplier_logged_in');
        localStorage.removeItem('supplier_token');
        localStorage.removeItem('supplier_id');
        localStorage.removeItem('supplier_email');
        localStorage.removeItem('supplier_name');
        window.location.href = '../index.html';
    };

    window.handleGoogleLogin = function() {
        if (typeof google !== 'undefined' && google.accounts) {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredential,
                auto_select: false
            });
            google.accounts.id.prompt(function(notification) {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    googlePopupLogin();
                }
            });
        } else {
            console.error('Google SDK not loaded');
            showToast('Google login is not available. Please try again later.', 'error');
        }
    };

    window.handleNotificationClick = async function(notificationId, actionUrl) {
        try {
            await apiCall('/notifications/' + notificationId + '/read', { method: 'PUT' });
        } catch (e) {}
        if (actionUrl) {
            if (actionUrl.startsWith('/products')) {
                showSection('product-list');
            } else if (actionUrl.startsWith('/inquiries')) {
                showSection('inquiries');
            }
        }
    };

    window.initCountrySelect = function() {
        var countrySelect = document.getElementById('country-select');
        if (!countrySelect) return;

        var trigger = document.getElementById('country-trigger');
        var dropdown = document.getElementById('country-dropdown');
        var searchInput = document.getElementById('country-search');
        var countryList = document.getElementById('country-list');
        var hiddenInput = document.getElementById('reg-country');
        var selectedFlag = document.getElementById('selected-flag');
        var selectedCountry = document.getElementById('selected-country');

        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            countrySelect.classList.toggle('open');
            if (countrySelect.classList.contains('open')) {
                searchInput.focus();
                searchInput.value = '';
                filterCountries('');
            }
        });

        countryList.addEventListener('click', function(e) {
            var option = e.target.closest('.wd-country-option');
            if (!option) return;
            var value = option.dataset.value;
            var name = option.dataset.name;
            var flagImg = option.querySelector('.wd-country-option-flag');
            hiddenInput.value = value;
            if (flagImg) {
                selectedFlag.src = flagImg.src;
                selectedFlag.alt = value;
                selectedFlag.style.display = 'block';
            }
            selectedCountry.textContent = name;
            selectedCountry.classList.remove('placeholder');
            countryList.querySelectorAll('.wd-country-option').forEach(function(opt) { opt.classList.remove('selected'); });
            option.classList.add('selected');
            countrySelect.classList.remove('open');
        });

        searchInput.addEventListener('input', function(e) {
            filterCountries(e.target.value.toLowerCase());
        });

        searchInput.addEventListener('click', function(e) { e.stopPropagation(); });

        document.addEventListener('click', function(e) {
            if (!countrySelect.contains(e.target)) {
                countrySelect.classList.remove('open');
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && countrySelect.classList.contains('open')) {
                countrySelect.classList.remove('open');
            }
        });

        // Auto-select country from browser locale
        if (!hiddenInput.value) {
            var lang = navigator.language || navigator.languages?.[0] || '';
            var parts = lang.split('-');
            var code = (parts[1] || '').toUpperCase();
            if (code) {
                var match = countryList.querySelector('.wd-country-option[data-value="' + code + '"]');
                if (match) match.click();
            }
        }
    };

    // === Category Checkbox Grid ===

    window.CATEGORY_GROUPS = CATEGORY_GROUPS;
    window.CATEGORY_LABELS = CATEGORY_LABELS;

    window.renderCategoryCheckboxGrid = function(containerId, selectedSlugs) {
        var container = document.getElementById(containerId);
        if (!container) return;
        var selected = selectedSlugs || [];
        var html = '';
        for (var group in CATEGORY_GROUPS) {
            var slugs = CATEGORY_GROUPS[group];
            html += '<div class="wd-category-group" data-group="' + group + '">';
            html += '<h5 class="wd-category-group-title">' + group + '</h5>';
            html += '<div class="wd-checkbox-grid">';
            for (var i = 0; i < slugs.length; i++) {
                var slug = slugs[i];
                var checked = selected.includes(slug) ? 'checked' : '';
                html += '<label class="wd-checkbox-card" data-slug="' + slug + '" data-label="' + (CATEGORY_LABELS[slug] || slug).toLowerCase() + '">' +
                    '<input type="checkbox" value="' + slug + '" ' + checked + ' onchange="updateRegCategoryCount()">' +
                    '<span class="wd-checkbox-label">' + (CATEGORY_LABELS[slug] || slug) + '</span>' +
                    '</label>';
            }
            html += '</div></div>';
        }
        container.innerHTML = html;
        updateRegCategoryCount();
    };

    window.updateRegCategoryCount = function() {
        var count = document.querySelectorAll('#reg-categories-container input:checked').length;
        var badge = document.getElementById('reg-category-count');
        if (badge) badge.textContent = count + ' selected';
    };

    window.filterRegCategories = function(query) {
        var q = (query || '').toLowerCase();
        var container = document.getElementById('reg-categories-container');
        if (!container) return;
        container.querySelectorAll('.wd-category-group').forEach(function(group) {
            var anyVisible = false;
            group.querySelectorAll('.wd-checkbox-card').forEach(function(card) {
                var label = card.getAttribute('data-label') || '';
                var slug = card.getAttribute('data-slug') || '';
                var match = !q || label.includes(q) || slug.includes(q);
                card.style.display = match ? '' : 'none';
                if (match) anyVisible = true;
            });
            group.style.display = anyVisible ? '' : 'none';
        });
    };

})();

// 샘플 데이터
const products = [
    { id: 1, name: '무선 충전 패드', category: 'accessories', retailPrice: 50000, supplyPrice: 35000, icon: '📱' },
    { id: 2, name: '노이즈캔슬링 헤드폰', category: 'audio', retailPrice: 280000, supplyPrice: 189000, icon: '🎧' },
    { id: 3, name: '스마트 밴드', category: 'electronics', retailPrice: 120000, supplyPrice: 79000, icon: '⌚' },
    { id: 4, name: '블루투스 스피커', category: 'audio', retailPrice: 130000, supplyPrice: 89000, icon: '🔊' },
    { id: 5, name: '무선 이어버드', category: 'audio', retailPrice: 180000, supplyPrice: 125000, icon: '🎵' },
    { id: 6, name: '스마트워치', category: 'electronics', retailPrice: 350000, supplyPrice: 245000, icon: '⌚' },
    { id: 7, name: 'USB-C 허브', category: 'accessories', retailPrice: 80000, supplyPrice: 55000, icon: '🔌' },
    { id: 8, name: '태블릿 거치대', category: 'accessories', retailPrice: 45000, supplyPrice: 30000, icon: '📲' },
    { id: 9, name: '보조배터리 20000mAh', category: 'accessories', retailPrice: 60000, supplyPrice: 42000, icon: '🔋' },
    { id: 10, name: '게이밍 마우스', category: 'electronics', retailPrice: 90000, supplyPrice: 63000, icon: '🖱️' },
    { id: 11, name: '기계식 키보드', category: 'electronics', retailPrice: 150000, supplyPrice: 105000, icon: '⌨️' },
    { id: 12, name: '웹캠 HD', category: 'electronics', retailPrice: 100000, supplyPrice: 70000, icon: '📷' },
];

const orders = [
    { id: 'ORD-2025-0892', date: '2025.02.03', items: [{ name: '무선 이어버드', qty: 2, icon: '🎵' }, { name: '블루투스 스피커', qty: 1, icon: '🔊' }], amount: 285000, status: 'shipping' },
    { id: 'ORD-2025-0891', date: '2025.02.02', items: [{ name: '스마트워치', qty: 1, icon: '⌚' }, { name: '무선 충전 패드', qty: 2, icon: '📱' }], amount: 450000, status: 'preparing' },
    { id: 'ORD-2025-0890', date: '2025.02.01', items: [{ name: '블루투스 스피커', qty: 1, icon: '🔊' }], amount: 89000, status: 'completed' },
    { id: 'ORD-2025-0889', date: '2025.01.30', items: [{ name: '노이즈캔슬링 헤드폰', qty: 2, icon: '🎧' }], amount: 378000, status: 'completed' },
    { id: 'ORD-2025-0888', date: '2025.01.28', items: [{ name: '스마트 밴드', qty: 5, icon: '⌚' }], amount: 395000, status: 'completed' },
];

let cart = [];

// 페이지 초기화
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    renderCatalog();
    renderOrders();
    renderCart();
});

// 네비게이션 초기화
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            showPage(page);

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// 페이지 전환
function showPage(pageName) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // 네비게이션 활성화 업데이트
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageName);
    });
}

// 카탈로그 렌더링
function renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    if (!grid) return;

    grid.innerHTML = products.map(product => `
        <div class="catalog-card">
            <div class="catalog-card-image">${product.icon}</div>
            <div class="catalog-card-content">
                <div class="catalog-card-category">${getCategoryName(product.category)}</div>
                <div class="catalog-card-name">${product.name}</div>
                <div class="catalog-card-prices">
                    <span class="retail-price">₩${product.retailPrice.toLocaleString()}</span>
                    <span class="supply-price">₩${product.supplyPrice.toLocaleString()}</span>
                </div>
                <button onclick="addToCart(${product.id})">장바구니 담기</button>
            </div>
        </div>
    `).join('');
}

// 카테고리명 변환
function getCategoryName(category) {
    const names = {
        electronics: '전자기기',
        accessories: '액세서리',
        audio: '오디오'
    };
    return names[category] || category;
}

// 주문 목록 렌더링
function renderOrders(statusFilter = 'all') {
    const list = document.getElementById('orders-list');
    if (!list) return;

    const filteredOrders = statusFilter === 'all'
        ? orders
        : orders.filter(o => o.status === statusFilter);

    if (filteredOrders.length === 0) {
        list.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">📋</div>
                <p>해당 조건의 주문이 없습니다.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = filteredOrders.map(order => `
        <div class="order-card">
            <div class="order-card-header">
                <div>
                    <strong>${order.id}</strong>
                    <span style="color: #a0aec0; margin-left: 15px;">${order.date}</span>
                </div>
                <span class="status-badge ${order.status}">${getStatusName(order.status)}</span>
            </div>
            <div class="order-card-products">
                ${order.items.map(item => `
                    <div class="order-product">
                        <div class="order-product-image">${item.icon}</div>
                        <div>
                            <div style="font-weight: 500;">${item.name}</div>
                            <div style="color: #a0aec0; font-size: 0.85rem;">수량: ${item.qty}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="order-card-footer">
                <span style="color: #718096;">결제금액</span>
                <strong style="font-size: 1.1rem;">₩${order.amount.toLocaleString()}</strong>
            </div>
        </div>
    `).join('');
}

// 상태명 변환
function getStatusName(status) {
    const names = {
        preparing: '상품준비중',
        shipping: '배송중',
        completed: '배송완료'
    };
    return names[status] || status;
}

// 주문 필터 탭 이벤트
document.querySelectorAll('.orders-toolbar .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.orders-toolbar .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderOrders(btn.dataset.status);
    });
});

// 장바구니에 추가
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }

    updateCartCount();
    renderCart();

    // 피드백 표시
    showToast(`${product.name}이(가) 장바구니에 추가되었습니다.`);
}

// 장바구니 수량 변경
function updateCartQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== productId);
    }

    updateCartCount();
    renderCart();
}

// 장바구니에서 제거
function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    updateCartCount();
    renderCart();
}

// 장바구니 카운트 업데이트
function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    countEl.textContent = totalItems;
    countEl.style.display = totalItems > 0 ? 'block' : 'none';
}

// 장바구니 렌더링
function renderCart() {
    const cartItems = document.getElementById('cart-items');
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">🧺</div>
                <p>장바구니가 비어있습니다.</p>
            </div>
        `;
        updateCartSummary(0, 0, 0);
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">${item.icon}</div>
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₩${item.supplyPrice.toLocaleString()}</div>
            </div>
            <div class="cart-item-quantity">
                <button onclick="updateCartQuantity(${item.id}, -1)">-</button>
                <span>${item.qty}</span>
                <button onclick="updateCartQuantity(${item.id}, 1)">+</button>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${item.id})">✕</button>
        </div>
    `).join('');

    // 합계 계산
    const subtotal = cart.reduce((sum, item) => sum + (item.retailPrice * item.qty), 0);
    const supplyTotal = cart.reduce((sum, item) => sum + (item.supplyPrice * item.qty), 0);
    const discount = subtotal - supplyTotal;
    const shippingFee = supplyTotal >= 100000 ? 0 : 3000;

    updateCartSummary(subtotal, discount, shippingFee);
}

// 장바구니 요약 업데이트
function updateCartSummary(subtotal, discount, shippingFee) {
    document.getElementById('subtotal').textContent = `₩${subtotal.toLocaleString()}`;
    document.getElementById('discount').textContent = `-₩${discount.toLocaleString()}`;
    document.getElementById('shipping-fee').textContent = shippingFee === 0 ? '무료' : `₩${shippingFee.toLocaleString()}`;
    document.getElementById('total').textContent = `₩${(subtotal - discount + shippingFee).toLocaleString()}`;
}

// 주문하기
function placeOrder() {
    if (cart.length === 0) {
        showToast('장바구니가 비어있습니다.');
        return;
    }

    // 실제 구현 시 주문 API 호출
    showToast('주문이 완료되었습니다!');
    cart = [];
    updateCartCount();
    renderCart();
    showPage('orders');
}

// 토스트 메시지 표시
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a202c;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 0.95rem;
        z-index: 9999;
        animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// 로그아웃
function logout() {
    window.location.href = '../';
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

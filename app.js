// WeDealize 정책 관리 화면 JavaScript

// ==================== 탭 네비게이션 ====================

// 메인 탭 전환
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // 탭 버튼 활성화 상태 변경
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 서브탭 표시/숨김
        const tabName = btn.dataset.tab;
        document.getElementById('discount-subtabs').classList.toggle('hidden', tabName !== 'discount');
        document.getElementById('shipping-subtabs').classList.toggle('hidden', tabName !== 'shipping');

        // 서브탭 초기화 (첫 번째 버튼 활성화)
        const subtabNav = document.getElementById(tabName + '-subtabs');
        if (subtabNav) {
            subtabNav.querySelectorAll('.subtab-btn').forEach((b, i) => {
                b.classList.toggle('active', i === 0);
            });
        }

        // 해당 탭의 첫 번째 패널 표시
        if (tabName === 'discount') {
            showPanel('basic');
        } else if (tabName === 'shipping') {
            showPanel('fulfillment');
        }
    });
});

// 서브탭 전환
document.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const parentNav = btn.closest('.subtab-nav');
        parentNav.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showPanel(btn.dataset.subtab);
    });
});

function showPanel(panelName) {
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const targetPanel = document.getElementById(`panel-${panelName}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}

// ==================== 모달 관리 ====================

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    document.body.style.overflow = '';
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.body.style.overflow = '';
    }
});

// 모달 배경 클릭으로 닫기
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });
});

// ==================== 기본 할인율 설정 ====================

function openAddDiscountModal() {
    document.getElementById('add-trans-type').value = '';
    document.getElementById('add-category').value = '';
    document.getElementById('add-discount-rate').value = '35';
    openModal('add-discount-modal');
}

function addCategoryDiscount() {
    const transType = document.getElementById('add-trans-type').value;
    const category = document.getElementById('add-category').value;
    const discountRate = document.getElementById('add-discount-rate').value;

    if (!transType || !category || !discountRate) {
        showToast('모든 필드를 입력해주세요.', 'error');
        return;
    }

    const transTypeLabels = {
        'consignment': '위탁판매',
        'direct': '직매입',
        'sample': '샘플'
    };

    const categoryLabels = {
        'food': '식품',
        'cosmetic': '화장품',
        'fashion': '패션',
        'electronics': '전자제품'
    };

    const badgeClass = {
        'consignment': 'badge-blue',
        'direct': 'badge-green',
        'sample': 'badge-orange'
    };

    const tbody = document.getElementById('discount-table-body');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><span class="badge ${badgeClass[transType]}">${transTypeLabels[transType]}</span></td>
        <td>${categoryLabels[category]}</td>
        <td>
            <div class="inline-edit">
                <span class="value">${discountRate}%</span>
                <input type="number" class="edit-input hidden" value="${discountRate}" min="0" max="100">
            </div>
        </td>
        <td><span class="count-badge">0건</span></td>
        <td>
            <button class="btn btn-sm btn-outline" onclick="editRow(this)">수정</button>
            <button class="btn btn-sm btn-danger" onclick="deleteRow(this)">삭제</button>
        </td>
    `;
    tbody.appendChild(newRow);

    closeModal('add-discount-modal');
    showToast('카테고리별 할인율이 추가되었습니다.');
}

function editRow(btn) {
    const row = btn.closest('tr');
    const inlineEdit = row.querySelector('.inline-edit');
    const valueSpan = inlineEdit.querySelector('.value');
    const input = inlineEdit.querySelector('.edit-input');

    if (btn.textContent === '수정') {
        valueSpan.classList.add('hidden');
        input.classList.remove('hidden');
        input.focus();
        btn.textContent = '저장';
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
    } else {
        const newValue = input.value;
        valueSpan.textContent = newValue + '%';
        valueSpan.classList.remove('hidden');
        input.classList.add('hidden');
        btn.textContent = '수정';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
        showToast('할인율이 변경되었습니다.');
    }
}

function deleteRow(btn) {
    if (confirm('이 할인율 설정을 삭제하시겠습니까?')) {
        const row = btn.closest('tr');
        row.remove();
        showToast('삭제되었습니다.');
    }
}

// ==================== 가산 금액 설정 ====================

function editSurcharge(btn) {
    const row = btn.closest('tr');
    const inlineEdit = row.querySelector('.inline-edit');
    const valueSpan = inlineEdit.querySelector('.surcharge-value');
    const input = inlineEdit.querySelector('.surcharge-input');
    const calcPrice = row.querySelector('.calculated-price');

    if (btn.textContent === '수정') {
        valueSpan.classList.add('hidden');
        input.classList.remove('hidden');
        input.focus();
        btn.textContent = '저장';
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');

        // 실시간 출고가 계산
        input.addEventListener('input', () => {
            const basePrice = parseInt(row.cells[3].textContent.replace(/[^0-9]/g, ''));
            const surcharge = parseInt(input.value) || 0;
            const releasePrice = basePrice + surcharge;
            calcPrice.textContent = formatCurrency(releasePrice) + '원';
        });
    } else {
        const newValue = parseInt(input.value) || 0;
        valueSpan.textContent = formatCurrency(newValue) + '원';
        valueSpan.classList.remove('hidden');
        input.classList.add('hidden');
        btn.textContent = '수정';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
        showToast('가산 금액이 변경되었습니다.');
    }
}

// ==================== 커스터마이징 (개별 정책) ====================

function openNewPolicyModal() {
    // 폼 초기화
    document.getElementById('policy-reseller').value = '';
    document.getElementById('policy-item').value = '';
    document.getElementById('policy-type').value = '';
    document.querySelector('input[name="discount-method"][value="rate"]').checked = true;
    document.getElementById('discount-rate').value = '35';
    document.getElementById('discount-amount').value = '0';
    toggleDiscountInput();
    resetPreview();
    openModal('new-policy-modal');
}

function toggleDiscountInput() {
    const method = document.querySelector('input[name="discount-method"]:checked').value;
    document.getElementById('rate-input-group').classList.toggle('hidden', method !== 'rate');
    document.getElementById('amount-input-group').classList.toggle('hidden', method !== 'amount');
    updateSimulator();
}

function updateSimulator() {
    const reseller = document.getElementById('policy-reseller');
    const item = document.getElementById('policy-item');
    const type = document.getElementById('policy-type');

    if (!reseller.value || !item.value || !type.value) {
        resetPreview();
        return;
    }

    const selectedItem = item.options[item.selectedIndex];
    const basePrice = parseInt(selectedItem.dataset.price) || 0;
    const surcharge = parseInt(selectedItem.dataset.surcharge) || 3000;
    const releasePrice = basePrice + surcharge;

    const method = document.querySelector('input[name="discount-method"]:checked').value;
    let discountAmount = 0;
    let discountText = '';

    if (method === 'rate') {
        const rate = parseInt(document.getElementById('discount-rate').value) || 0;
        discountAmount = Math.round(releasePrice * rate / 100);
        discountText = `-${rate}% → ${formatCurrency(discountAmount)}원 차감`;
    } else {
        discountAmount = parseInt(document.getElementById('discount-amount').value) || 0;
        discountText = `-${formatCurrency(discountAmount)}원`;
    }

    const finalPrice = releasePrice - discountAmount;

    // 기본 할인율 힌트 업데이트
    const selectedType = type.options[type.selectedIndex];
    const defaultDiscount = selectedType.dataset.defaultDiscount || '35';
    document.getElementById('default-rate-hint').textContent = `기본 할인율: ${defaultDiscount}%`;

    // 미리보기 업데이트
    document.getElementById('preview-base').textContent = formatCurrency(basePrice) + '원';
    document.getElementById('preview-surcharge').textContent = '+ ' + formatCurrency(surcharge) + '원';
    document.getElementById('preview-release').textContent = formatCurrency(releasePrice) + '원';
    document.getElementById('preview-discount').textContent = discountText;
    document.getElementById('preview-final').textContent = formatCurrency(finalPrice) + '원';
}

function resetPreview() {
    document.getElementById('preview-base').textContent = '-';
    document.getElementById('preview-surcharge').textContent = '-';
    document.getElementById('preview-release').textContent = '-';
    document.getElementById('preview-discount').textContent = '-';
    document.getElementById('preview-final').textContent = '-';
}

function savePolicy() {
    const reseller = document.getElementById('policy-reseller').value;
    const item = document.getElementById('policy-item').value;
    const type = document.getElementById('policy-type').value;

    if (!reseller || !item || !type) {
        showToast('필수 항목을 모두 선택해주세요.', 'error');
        return;
    }

    // 중복 정책 체크 (시뮬레이션)
    const hasDuplicate = checkDuplicatePolicy(reseller, item, type);

    if (hasDuplicate) {
        closeModal('new-policy-modal');
        openModal('duplicate-modal');
    } else {
        closeModal('new-policy-modal');
        showToast('신규 정책이 등록되었습니다.');
    }
}

function checkDuplicatePolicy(reseller, item, type) {
    // 시뮬레이션: ABC마트 + 프리미엄 스킨케어 세트 + 위탁판매 조합이면 중복으로 처리
    return reseller === 'abc' && item === 'itm001' && type === 'consignment';
}

function confirmReplacePolicy() {
    closeModal('duplicate-modal');
    showToast('기존 정책을 비활성화하고 신규 정책을 등록했습니다.');
}

// 정책 선택 및 시뮬레이터 표시
function selectPolicy(row, policyId) {
    // 행 선택 상태 표시
    document.querySelectorAll('.clickable-row').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');

    // 정책 데이터 (실제로는 API에서 가져옴)
    const policies = {
        'policy1': {
            reseller: 'ABC마트',
            item: '프리미엄 스킨케어 세트',
            type: '위탁판매',
            basePrice: 50000,
            surcharge: 3000,
            discountRate: 38
        },
        'policy2': {
            reseller: 'XYZ스토어',
            item: '오가닉 그래놀라',
            type: '직매입',
            basePrice: 15000,
            surcharge: 2500,
            discountAmount: 2000
        },
        'policy3': {
            reseller: '패션플러스',
            item: '캐시미어 니트',
            type: '위탁판매',
            basePrice: 120000,
            surcharge: 5000,
            discountRate: 42
        }
    };

    const policy = policies[policyId];
    if (!policy) return;

    // 시뮬레이터 표시
    document.getElementById('simulator-content').classList.add('hidden');
    document.getElementById('simulator-result').classList.remove('hidden');

    // 데이터 채우기
    document.getElementById('sim-reseller').textContent = policy.reseller;
    document.getElementById('sim-item').textContent = policy.item;
    document.getElementById('sim-type').textContent = policy.type;
    document.getElementById('sim-base-price').textContent = formatCurrency(policy.basePrice) + '원';
    document.getElementById('sim-surcharge').textContent = '+ ' + formatCurrency(policy.surcharge) + '원';

    const releasePrice = policy.basePrice + policy.surcharge;
    document.getElementById('sim-release-price').textContent = formatCurrency(releasePrice) + '원';

    let discountAmount = 0;
    let discountText = '';

    if (policy.discountRate) {
        discountAmount = Math.round(releasePrice * policy.discountRate / 100);
        discountText = `-${policy.discountRate}% → ${formatCurrency(discountAmount)}원 차감`;
    } else if (policy.discountAmount) {
        discountAmount = policy.discountAmount;
        discountText = `-${formatCurrency(discountAmount)}원`;
    }

    document.getElementById('sim-discount').textContent = discountText;

    const finalPrice = releasePrice - discountAmount;
    document.getElementById('sim-final-price').textContent = formatCurrency(finalPrice) + '원';
}

function editPolicy(policyId) {
    // 정책 수정 모달 열기 (신규 등록 모달 재활용)
    openNewPolicyModal();
    // 실제로는 해당 정책 데이터를 불러와서 폼에 채움
}

function openHistoryModal() {
    openModal('history-modal');
}

// ==================== 유틸리티 ====================

function formatCurrency(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.querySelector('.toast-message').textContent = message;
    toast.className = 'toast ' + type;

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// ==================== 검색 기능 ====================

document.getElementById('surcharge-search')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#surcharge-table-body tr');

    rows.forEach(row => {
        const itemName = row.cells[1].textContent.toLowerCase();
        const itemCode = row.cells[0].textContent.toLowerCase();
        const visible = itemName.includes(searchTerm) || itemCode.includes(searchTerm);
        row.style.display = visible ? '' : 'none';
    });
});

document.getElementById('category-filter')?.addEventListener('change', function(e) {
    const category = e.target.value;
    const categoryMap = {
        'food': '식품',
        'cosmetic': '화장품',
        'fashion': '패션',
        'electronics': '전자제품'
    };

    const rows = document.querySelectorAll('#surcharge-table-body tr');

    rows.forEach(row => {
        if (!category) {
            row.style.display = '';
            return;
        }
        const rowCategory = row.cells[2].textContent;
        row.style.display = rowCategory === categoryMap[category] ? '' : 'none';
    });
});

// ==================== 배송 설정 (Phase 2) ====================

// 풀필먼트 토글
function toggleFulfillment() {
    const toggle = document.getElementById('fulfillment-toggle');
    const options = document.getElementById('fulfillment-options');
    const notice = document.getElementById('no-fulfillment-notice');

    if (toggle.checked) {
        options.classList.remove('hidden');
        notice.classList.add('hidden');
    } else {
        options.classList.add('hidden');
        notice.classList.remove('hidden');
    }
}

// 풀필먼트 선택
function selectFulfillment(card, fulfillmentId) {
    if (card.classList.contains('disabled')) {
        showToast('이 풀필먼트는 아직 준비중입니다.', 'error');
        return;
    }

    document.querySelectorAll('.fulfillment-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    showToast(`${fulfillmentId === 'shipda' ? '쉽다(ShipDa)' : '쿠팡 풀필먼트'}가 선택되었습니다.`);
}

// 배송정책 선택
function selectShippingPolicy(card, policyType) {
    document.querySelectorAll('.policy-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    const policyNames = {
        'fixed': '고정 배송비',
        'quantity': '수량별 배송비',
        'weight': '중량별 배송비',
        'actual': '실비 청구'
    };
    showToast(`${policyNames[policyType]} 정책이 선택되었습니다.`);
}

// 무료배송 옵션 토글
function toggleFreeShippingOptions() {
    const type = document.getElementById('free-shipping-type').value;
    document.getElementById('free-shipping-amount-row').classList.toggle('hidden', type !== 'amount');
    document.getElementById('free-shipping-quantity-row').classList.toggle('hidden', type !== 'quantity');
}

// 배송정책 저장
function saveShippingPolicy() {
    showToast('배송정책이 저장되었습니다.');
}

// 배송비 구간 추가 모달
function openAddShippingFeeModal() {
    document.getElementById('shipping-fee-name').value = '';
    document.getElementById('shipping-fee-condition-type').value = '';
    document.getElementById('condition-amount').value = '0';
    document.getElementById('condition-quantity').value = '1';
    document.getElementById('condition-weight').value = '1';
    document.getElementById('base-shipping-fee').value = '3000';
    document.getElementById('extra-shipping-fee').value = '3000';

    document.getElementById('condition-amount-group').classList.add('hidden');
    document.getElementById('condition-quantity-group').classList.add('hidden');
    document.getElementById('condition-weight-group').classList.add('hidden');

    openModal('add-shipping-fee-modal');
}

// 배송비 조건 토글
function toggleShippingCondition() {
    const type = document.getElementById('shipping-fee-condition-type').value;
    document.getElementById('condition-amount-group').classList.toggle('hidden', type !== 'amount');
    document.getElementById('condition-quantity-group').classList.toggle('hidden', type !== 'quantity');
    document.getElementById('condition-weight-group').classList.toggle('hidden', type !== 'weight');
}

// 배송비 구간 추가
function addShippingFee() {
    const name = document.getElementById('shipping-fee-name').value;
    const conditionType = document.getElementById('shipping-fee-condition-type').value;
    const baseFee = parseInt(document.getElementById('base-shipping-fee').value) || 0;
    const extraFee = parseInt(document.getElementById('extra-shipping-fee').value) || 0;

    if (!name || !conditionType) {
        showToast('필수 항목을 모두 입력해주세요.', 'error');
        return;
    }

    let conditionText = '';
    if (conditionType === 'amount') {
        const amount = document.getElementById('condition-amount').value;
        conditionText = formatCurrency(amount) + '원 이상';
    } else if (conditionType === 'quantity') {
        const quantity = document.getElementById('condition-quantity').value;
        conditionText = quantity + '개 이상';
    } else if (conditionType === 'weight') {
        const weight = document.getElementById('condition-weight').value;
        conditionText = weight + 'kg 이상';
    }

    const baseFeeText = baseFee === 0 ? '무료' : formatCurrency(baseFee) + '원';
    const extraFeeText = extraFee === 0 ? '무료' : '+' + formatCurrency(extraFee) + '원';

    const tbody = document.getElementById('shipping-fee-table-body');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${name}</td>
        <td>${conditionText}</td>
        <td>
            <div class="inline-edit">
                <span class="value">${baseFeeText}</span>
                <input type="number" class="edit-input hidden" value="${baseFee}" min="0" step="100">
            </div>
        </td>
        <td>
            <div class="inline-edit">
                <span class="value">${extraFeeText}</span>
                <input type="number" class="edit-input hidden" value="${extraFee}" min="0" step="100">
            </div>
        </td>
        <td><span class="status-badge status-active">활성</span></td>
        <td>
            <button class="btn btn-sm btn-outline" onclick="editShippingFeeRow(this)">수정</button>
            <button class="btn btn-sm btn-danger" onclick="deleteShippingFeeRow(this)">삭제</button>
        </td>
    `;
    tbody.appendChild(newRow);

    closeModal('add-shipping-fee-modal');
    showToast('배송비 구간이 추가되었습니다.');
}

// 배송비 행 수정
function editShippingFeeRow(btn) {
    const row = btn.closest('tr');
    const inlineEdits = row.querySelectorAll('.inline-edit');

    if (btn.textContent === '수정') {
        inlineEdits.forEach(edit => {
            const valueSpan = edit.querySelector('.value');
            const input = edit.querySelector('.edit-input');
            valueSpan.classList.add('hidden');
            input.classList.remove('hidden');
        });
        btn.textContent = '저장';
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary');
    } else {
        inlineEdits.forEach(edit => {
            const valueSpan = edit.querySelector('.value');
            const input = edit.querySelector('.edit-input');
            const newValue = parseInt(input.value) || 0;

            // 첫 번째 inline-edit는 기본 배송비
            if (edit === inlineEdits[0]) {
                valueSpan.textContent = newValue === 0 ? '무료' : formatCurrency(newValue) + '원';
            } else {
                valueSpan.textContent = newValue === 0 ? '무료' : '+' + formatCurrency(newValue) + '원';
            }

            valueSpan.classList.remove('hidden');
            input.classList.add('hidden');
        });
        btn.textContent = '수정';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
        showToast('배송비가 변경되었습니다.');
    }
}

// 배송비 행 삭제
function deleteShippingFeeRow(btn) {
    if (confirm('이 배송비 구간을 삭제하시겠습니까?')) {
        const row = btn.closest('tr');
        row.remove();
        showToast('삭제되었습니다.');
    }
}

// 배송비 계산 시뮬레이터
function calculateShippingFee() {
    const amount = parseInt(document.getElementById('sim-order-amount').value) || 0;
    const quantity = parseInt(document.getElementById('sim-order-quantity').value) || 1;
    const region = document.getElementById('sim-region').value;

    let baseFee = 3000;
    let extraFee = 0;
    let detail = '기본 배송비 적용';

    // 프리미엄 배송 (100,000원 이상)
    if (amount >= 100000) {
        baseFee = 0;
        detail = '프리미엄 배송 - 무료배송 적용';
    }
    // 대량 주문 (5개 이상)
    else if (quantity >= 5) {
        baseFee = 0;
        if (region !== 'normal') {
            extraFee = 2000;
        }
        detail = '대량 주문 할인 적용';
    }
    // 기본 배송
    else {
        if (region !== 'normal') {
            extraFee = 3000;
        }
    }

    // 지역별 추가 요금
    if (region === 'jeju') {
        detail += (detail ? ' / ' : '') + '제주도 추가요금';
    } else if (region === 'island') {
        detail += (detail ? ' / ' : '') + '도서산간 추가요금';
    }

    const totalFee = baseFee + extraFee;
    document.getElementById('sim-shipping-result').textContent = totalFee === 0 ? '무료' : formatCurrency(totalFee) + '원';
    document.getElementById('sim-shipping-detail').textContent = detail;
}

// ==================== 초기화 ====================

document.addEventListener('DOMContentLoaded', function() {
    // 초기 패널 표시
    showPanel('basic');

    // 배송비 시뮬레이터 초기 계산
    if (document.getElementById('sim-order-amount')) {
        calculateShippingFee();
    }
});

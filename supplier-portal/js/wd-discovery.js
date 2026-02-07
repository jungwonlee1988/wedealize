// WeDealize - Buyer Discovery
(function() {
    'use strict';

    // === Discovery Tabs ===

    window.switchDiscoveryTab = function(tab) {
        document.getElementById('tab-discovery-category')?.classList.toggle('active', tab === 'category');
        document.getElementById('tab-discovery-product')?.classList.toggle('active', tab === 'product');

        var categoryPanel = document.getElementById('discovery-tab-category');
        var productPanel = document.getElementById('discovery-tab-product');
        if (categoryPanel) categoryPanel.style.display = tab === 'category' ? 'block' : 'none';
        if (productPanel) productPanel.style.display = tab === 'product' ? 'block' : 'none';
    };

    // === Public API ===

    window.showSubscriptionModal = function() {
        showToast('Premium subscription coming soon!', 'info');
    };

})();

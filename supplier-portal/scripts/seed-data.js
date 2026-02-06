/**
 * WeDealize Supplier Portal - Test Data Seed Script
 *
 * This script creates realistic test data via API calls.
 * Run this in the browser console while logged in, or use Node.js with the token.
 *
 * Usage (Browser Console):
 *   1. Log in to the supplier portal
 *   2. Open browser console (F12)
 *   3. Copy and paste this entire script
 *   4. Call: await seedAllData()
 *
 * Usage (Node.js):
 *   1. Set SUPPLIER_TOKEN environment variable
 *   2. Run: node seed-data.js
 */

(async function() {
    'use strict';

    const API_BASE_URL = 'https://supplier-api-blush.vercel.app/api/v1/supplier';

    // Get token from localStorage (browser) or environment (Node.js)
    const getToken = () => {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('supplier_token');
        }
        return process.env.SUPPLIER_TOKEN;
    };

    // API helper
    async function apiCall(endpoint, method = 'GET', data = null) {
        const token = getToken();
        if (!token) {
            throw new Error('No authentication token found. Please log in first.');
        }

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (data && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${error.message || response.statusText}`);
        }

        return response.json().catch(() => ({}));
    }

    // ============================================
    // Test Data Definitions
    // ============================================

    const testProducts = [
        {
            name: 'Extra Virgin Olive Oil 500ml',
            category: 'Oils & Vinegars',
            sku: 'OIL-001',
            price_min: 7.20,
            price_max: 8.50,
            moq: 200,
            moq_unit: 'bottles',
            specifications: 'Cold-pressed, first harvest, acidity < 0.3%',
            certifications: ['Organic', 'HACCP', 'ISO 22000'],
            status: 'complete'
        },
        {
            name: 'Aged Parmesan 24 months',
            category: 'Dairy & Cheese',
            sku: 'CHE-001',
            price_min: 18.00,
            price_max: 22.00,
            moq: 50,
            moq_unit: 'kg',
            specifications: 'DOP certified, aged minimum 24 months',
            certifications: ['DOP', 'HACCP'],
            status: 'complete'
        },
        {
            name: 'Organic Honey 350g',
            category: 'Organic & Health',
            sku: 'HON-001',
            price_min: 12.00,
            price_max: 15.00,
            moq: 100,
            moq_unit: 'jars',
            specifications: 'Raw, unfiltered, wildflower honey',
            certifications: ['Organic', 'Non-GMO'],
            status: 'complete'
        },
        {
            name: 'Truffle Oil 250ml',
            category: 'Oils & Vinegars',
            sku: 'OIL-002',
            price_min: 25.00,
            price_max: 32.00,
            moq: 50,
            moq_unit: 'bottles',
            specifications: 'Black truffle infused, extra virgin olive oil base',
            certifications: ['HACCP'],
            status: 'complete'
        },
        {
            name: 'Balsamic Vinegar 250ml',
            category: 'Oils & Vinegars',
            sku: 'VIN-001',
            price_min: 8.50,
            price_max: 12.00,
            moq: 150,
            moq_unit: 'bottles',
            specifications: 'Aged 12 years, Modena IGP',
            certifications: ['IGP', 'HACCP'],
            status: 'complete'
        },
        {
            name: 'Dried Pasta Variety Pack',
            category: 'Other',
            sku: 'PAS-001',
            price_min: 3.50,
            price_max: 5.00,
            moq: 500,
            moq_unit: 'packs',
            specifications: 'Bronze die cut, slow dried, includes spaghetti, penne, fusilli',
            certifications: ['Organic'],
            status: 'incomplete'
        }
    ];

    const testAccounts = [
        {
            company_name: 'Pacific Foods Distribution',
            country: 'South Korea',
            address: '123 Gangnam-daero, Gangnam-gu, Seoul',
            contact_name: 'Kim Min-jun',
            contact_position: 'Purchasing Manager',
            contact_email: 'minjun.kim@pacificfoods.kr',
            contact_phone: '+82-2-1234-5678',
            currency: 'USD',
            incoterms: 'CIF',
            payment_terms: 'T/T 30%',
            notes: 'Premium food distributor in Korea, interested in Italian products'
        },
        {
            company_name: 'Tokyo Gourmet Trading',
            country: 'Japan',
            address: '1-2-3 Shibuya, Shibuya-ku, Tokyo',
            contact_name: 'Tanaka Yuki',
            contact_position: 'Import Director',
            contact_email: 'y.tanaka@tokyogourmet.jp',
            contact_phone: '+81-3-9876-5432',
            currency: 'USD',
            incoterms: 'FOB',
            payment_terms: 'L/C at sight',
            notes: 'High-end restaurant supplier, focus on quality'
        },
        {
            company_name: 'Euro Delicatessen GmbH',
            country: 'Germany',
            address: 'Hauptstraße 45, 10115 Berlin',
            contact_name: 'Hans Mueller',
            contact_position: 'CEO',
            contact_email: 'h.mueller@eurodelicatessen.de',
            contact_phone: '+49-30-12345678',
            currency: 'EUR',
            incoterms: 'EXW',
            payment_terms: 'T/T 50%',
            notes: 'Specialty food importer for German market'
        },
        {
            company_name: 'Fresh Market USA',
            country: 'United States',
            address: '456 Market Street, San Francisco, CA 94102',
            contact_name: 'John Smith',
            contact_position: 'Buyer',
            contact_email: 'jsmith@freshmarketusa.com',
            contact_phone: '+1-415-555-0123',
            currency: 'USD',
            incoterms: 'CIF',
            payment_terms: 'Net 30',
            notes: 'Organic and natural food distributor'
        }
    ];

    // Generate date strings
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const daysAgo = (days) => {
        const d = new Date(today);
        d.setDate(d.getDate() - days);
        return formatDate(d);
    };

    // ============================================
    // Seed Functions
    // ============================================

    async function seedProducts() {
        console.log('🌱 Seeding products...');
        const results = [];

        for (const product of testProducts) {
            try {
                const result = await apiCall('/products', 'POST', product);
                console.log(`  ✓ Created product: ${product.name}`);
                results.push(result);
            } catch (error) {
                console.error(`  ✗ Failed to create product ${product.name}:`, error.message);
            }
        }

        console.log(`📦 Products seeded: ${results.length}/${testProducts.length}`);
        return results;
    }

    async function seedAccounts() {
        console.log('🌱 Seeding accounts...');
        const results = [];

        for (const account of testAccounts) {
            try {
                const result = await apiCall('/accounts', 'POST', account);
                console.log(`  ✓ Created account: ${account.company_name}`);
                results.push(result);
            } catch (error) {
                console.error(`  ✗ Failed to create account ${account.company_name}:`, error.message);
            }
        }

        console.log(`👥 Accounts seeded: ${results.length}/${testAccounts.length}`);
        return results;
    }

    async function seedPurchaseOrders(products, accounts) {
        console.log('🌱 Seeding purchase orders...');
        const results = [];

        if (!products.length || !accounts.length) {
            console.warn('  ⚠ Need products and accounts first');
            return results;
        }

        const purchaseOrders = [
            {
                po_number: `PO-${today.getFullYear()}-0001`,
                order_date: daysAgo(3),
                buyer_name: accounts[0]?.company_name || 'Pacific Foods Distribution',
                buyer_contact: accounts[0]?.contact_name || 'Kim Min-jun',
                buyer_email: accounts[0]?.contact_email || 'minjun.kim@pacificfoods.kr',
                buyer_phone: accounts[0]?.contact_phone || '+82-2-1234-5678',
                buyer_address: accounts[0]?.address || 'Seoul, South Korea',
                currency: 'USD',
                incoterms: 'CIF',
                payment_terms: 'T/T 30%',
                status: 'received',
                items: [
                    { product_name: products[0]?.name || 'Extra Virgin Olive Oil 500ml', sku: 'OIL-001', quantity: 500, unit: 'bottles', unit_price: 7.50 },
                    { product_name: products[2]?.name || 'Organic Honey 350g', sku: 'HON-001', quantity: 200, unit: 'jars', unit_price: 13.00 }
                ],
                notes: 'First order - sample shipment'
            },
            {
                po_number: `PO-${today.getFullYear()}-0002`,
                order_date: daysAgo(7),
                buyer_name: accounts[1]?.company_name || 'Tokyo Gourmet Trading',
                buyer_contact: accounts[1]?.contact_name || 'Tanaka Yuki',
                buyer_email: accounts[1]?.contact_email || 'y.tanaka@tokyogourmet.jp',
                buyer_phone: accounts[1]?.contact_phone || '+81-3-9876-5432',
                buyer_address: accounts[1]?.address || 'Tokyo, Japan',
                currency: 'USD',
                incoterms: 'FOB',
                payment_terms: 'L/C at sight',
                status: 'confirmed',
                items: [
                    { product_name: products[1]?.name || 'Aged Parmesan 24 months', sku: 'CHE-001', quantity: 100, unit: 'kg', unit_price: 20.00 },
                    { product_name: products[3]?.name || 'Truffle Oil 250ml', sku: 'OIL-002', quantity: 50, unit: 'bottles', unit_price: 28.00 }
                ],
                notes: 'Regular monthly order'
            },
            {
                po_number: `PO-${today.getFullYear()}-0003`,
                order_date: daysAgo(14),
                buyer_name: accounts[2]?.company_name || 'Euro Delicatessen GmbH',
                buyer_contact: accounts[2]?.contact_name || 'Hans Mueller',
                buyer_email: accounts[2]?.contact_email || 'h.mueller@eurodelicatessen.de',
                buyer_phone: accounts[2]?.contact_phone || '+49-30-12345678',
                buyer_address: accounts[2]?.address || 'Berlin, Germany',
                currency: 'EUR',
                incoterms: 'EXW',
                payment_terms: 'T/T 50%',
                status: 'confirmed',
                items: [
                    { product_name: products[4]?.name || 'Balsamic Vinegar 250ml', sku: 'VIN-001', quantity: 300, unit: 'bottles', unit_price: 10.00 }
                ],
                notes: 'Reorder from last quarter'
            },
            {
                po_number: `PO-${today.getFullYear()}-0004`,
                order_date: formatDate(today),
                buyer_name: accounts[0]?.company_name || 'Pacific Foods Distribution',
                buyer_contact: accounts[0]?.contact_name || 'Kim Min-jun',
                buyer_email: accounts[0]?.contact_email || 'minjun.kim@pacificfoods.kr',
                buyer_phone: accounts[0]?.contact_phone || '+82-2-1234-5678',
                buyer_address: accounts[0]?.address || 'Seoul, South Korea',
                currency: 'USD',
                incoterms: 'CIF',
                payment_terms: 'T/T 30%',
                status: 'draft',
                items: [
                    { product_name: products[0]?.name || 'Extra Virgin Olive Oil 500ml', sku: 'OIL-001', quantity: 1000, unit: 'bottles', unit_price: 7.20 }
                ],
                notes: 'Draft - pending confirmation'
            }
        ];

        for (const po of purchaseOrders) {
            try {
                const result = await apiCall('/po', 'POST', po);
                console.log(`  ✓ Created PO: ${po.po_number} (${po.status})`);
                results.push({ ...result, ...po });
            } catch (error) {
                console.error(`  ✗ Failed to create PO ${po.po_number}:`, error.message);
            }
        }

        console.log(`📋 Purchase Orders seeded: ${results.length}/${purchaseOrders.length}`);
        return results;
    }

    async function seedInvoices(purchaseOrders, accounts) {
        console.log('🌱 Seeding invoices...');
        const results = [];

        if (!purchaseOrders.length) {
            console.warn('  ⚠ Need purchase orders first');
            return results;
        }

        // Create invoices for confirmed POs
        const confirmedPOs = purchaseOrders.filter(po => po.status === 'confirmed');

        const invoices = [
            {
                inv_number: `INV-${today.getFullYear()}-0001`,
                po_reference: confirmedPOs[0]?.po_number || `PO-${today.getFullYear()}-0002`,
                buyer_name: confirmedPOs[0]?.buyer_name || 'Tokyo Gourmet Trading',
                issue_date: daysAgo(5),
                currency: 'USD',
                incoterms: 'FOB',
                payment_terms: 'L/C at sight',
                status: 'sent',
                payment_status: 'paid',
                items: confirmedPOs[0]?.items || [
                    { product_name: 'Aged Parmesan 24 months', sku: 'CHE-001', quantity: 100, unit: 'kg', unit_price: 20.00 }
                ],
                subtotal: 3400.00,
                credit_applied: 0,
                total: 3400.00,
                remarks: 'Thank you for your business'
            },
            {
                inv_number: `INV-${today.getFullYear()}-0002`,
                po_reference: confirmedPOs[1]?.po_number || `PO-${today.getFullYear()}-0003`,
                buyer_name: confirmedPOs[1]?.buyer_name || 'Euro Delicatessen GmbH',
                issue_date: daysAgo(10),
                currency: 'EUR',
                incoterms: 'EXW',
                payment_terms: 'T/T 50%',
                status: 'sent',
                payment_status: 'unpaid',
                items: confirmedPOs[1]?.items || [
                    { product_name: 'Balsamic Vinegar 250ml', sku: 'VIN-001', quantity: 300, unit: 'bottles', unit_price: 10.00 }
                ],
                subtotal: 3000.00,
                credit_applied: 0,
                total: 3000.00,
                remarks: 'Payment due within 30 days'
            },
            {
                inv_number: `INV-${today.getFullYear()}-0003`,
                po_reference: `PO-${today.getFullYear()}-0001`,
                buyer_name: accounts[0]?.company_name || 'Pacific Foods Distribution',
                issue_date: formatDate(today),
                currency: 'USD',
                incoterms: 'CIF',
                payment_terms: 'T/T 30%',
                status: 'draft',
                payment_status: 'unpaid',
                items: [
                    { product_name: 'Extra Virgin Olive Oil 500ml', sku: 'OIL-001', quantity: 500, unit: 'bottles', unit_price: 7.50 },
                    { product_name: 'Organic Honey 350g', sku: 'HON-001', quantity: 200, unit: 'jars', unit_price: 13.00 }
                ],
                subtotal: 6350.00,
                credit_applied: 0,
                total: 6350.00,
                remarks: 'Draft invoice - pending review'
            }
        ];

        for (const inv of invoices) {
            try {
                const result = await apiCall('/invoices', 'POST', inv);
                console.log(`  ✓ Created Invoice: ${inv.inv_number} (${inv.status})`);
                results.push({ ...result, ...inv });
            } catch (error) {
                console.error(`  ✗ Failed to create Invoice ${inv.inv_number}:`, error.message);
            }
        }

        console.log(`🧾 Invoices seeded: ${results.length}/${invoices.length}`);
        return results;
    }

    async function seedCredits(invoices, accounts) {
        console.log('🌱 Seeding credits...');
        const results = [];

        const credits = [
            {
                credit_id: `CR-${today.getFullYear()}-0001`,
                invoice_number: invoices[0]?.inv_number || `INV-${today.getFullYear()}-0001`,
                buyer_name: invoices[0]?.buyer_name || 'Tokyo Gourmet Trading',
                product_name: 'Aged Parmesan 24 months',
                reason: 'damaged',
                reason_detail: 'Damaged packaging (3 units)',
                affected_qty: 3,
                amount: 60.00,
                status: 'approved',
                created_date: daysAgo(3)
            },
            {
                credit_id: `CR-${today.getFullYear()}-0002`,
                invoice_number: invoices[1]?.inv_number || `INV-${today.getFullYear()}-0002`,
                buyer_name: invoices[1]?.buyer_name || 'Euro Delicatessen GmbH',
                product_name: 'Balsamic Vinegar 250ml',
                reason: 'short',
                reason_detail: 'Short shipment (5 units)',
                affected_qty: 5,
                amount: 50.00,
                status: 'pending',
                created_date: daysAgo(1)
            }
        ];

        for (const credit of credits) {
            try {
                const result = await apiCall('/credits', 'POST', credit);
                console.log(`  ✓ Created Credit: ${credit.credit_id} (${credit.status})`);
                results.push(result);
            } catch (error) {
                console.error(`  ✗ Failed to create Credit ${credit.credit_id}:`, error.message);
            }
        }

        console.log(`💳 Credits seeded: ${results.length}/${credits.length}`);
        return results;
    }

    // ============================================
    // Main Seed Function
    // ============================================

    async function seedAllData() {
        console.log('🚀 Starting data seeding...\n');

        try {
            // Step 1: Seed Products
            const products = await seedProducts();
            console.log('');

            // Step 2: Seed Accounts
            const accounts = await seedAccounts();
            console.log('');

            // Step 3: Seed Purchase Orders (depends on products and accounts)
            const purchaseOrders = await seedPurchaseOrders(products, accounts);
            console.log('');

            // Step 4: Seed Invoices (depends on POs and accounts)
            const invoices = await seedInvoices(purchaseOrders, accounts);
            console.log('');

            // Step 5: Seed Credits (depends on invoices)
            const credits = await seedCredits(invoices, accounts);
            console.log('');

            console.log('✅ Data seeding completed!');
            console.log('📊 Summary:');
            console.log(`   - Products: ${products.length}`);
            console.log(`   - Accounts: ${accounts.length}`);
            console.log(`   - Purchase Orders: ${purchaseOrders.length}`);
            console.log(`   - Invoices: ${invoices.length}`);
            console.log(`   - Credits: ${credits.length}`);
            console.log('\n🔄 Refresh the page to see the new data!');

            return { products, accounts, purchaseOrders, invoices, credits };
        } catch (error) {
            console.error('❌ Seeding failed:', error);
            throw error;
        }
    }

    // ============================================
    // Clear Data Function (Optional)
    // ============================================

    async function clearAllData() {
        console.log('🗑️ Clearing all data...\n');

        // Get all data first
        try {
            const [products, accounts, pos, invoices] = await Promise.all([
                apiCall('/products').catch(() => []),
                apiCall('/accounts').catch(() => []),
                apiCall('/po').catch(() => []),
                apiCall('/invoices').catch(() => [])
            ]);

            // Delete in reverse order of dependencies
            console.log('Deleting invoices...');
            for (const inv of (Array.isArray(invoices) ? invoices : [])) {
                if (inv.id) {
                    await apiCall(`/invoices/${inv.id}`, 'DELETE').catch(() => {});
                }
            }

            console.log('Deleting purchase orders...');
            for (const po of (Array.isArray(pos) ? pos : [])) {
                if (po.id) {
                    await apiCall(`/po/${po.id}`, 'DELETE').catch(() => {});
                }
            }

            console.log('Deleting accounts...');
            for (const acc of (Array.isArray(accounts) ? accounts : [])) {
                if (acc.id) {
                    await apiCall(`/accounts/${acc.id}`, 'DELETE').catch(() => {});
                }
            }

            console.log('Deleting products...');
            const productList = products.products || products || [];
            for (const prod of (Array.isArray(productList) ? productList : [])) {
                if (prod.id) {
                    await apiCall(`/products/${prod.id}`, 'DELETE').catch(() => {});
                }
            }

            console.log('✅ All data cleared!');
        } catch (error) {
            console.error('❌ Clear failed:', error);
        }
    }

    // Export functions to global scope for browser console usage
    if (typeof window !== 'undefined') {
        window.seedAllData = seedAllData;
        window.clearAllData = clearAllData;
        window.seedProducts = seedProducts;
        window.seedAccounts = seedAccounts;
        window.seedPurchaseOrders = seedPurchaseOrders;
        window.seedInvoices = seedInvoices;
        window.seedCredits = seedCredits;

        console.log('📌 Seed script loaded! Available commands:');
        console.log('   await seedAllData()   - Create all test data');
        console.log('   await clearAllData()  - Delete all data');
        console.log('   await seedProducts()  - Create products only');
        console.log('   await seedAccounts()  - Create accounts only');
    }

    // If running in Node.js, auto-execute
    if (typeof module !== 'undefined' && require.main === module) {
        seedAllData();
    }

})();

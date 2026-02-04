// WeDealize Supplier Portal - Configuration
// Centralized configuration management

const Config = {
    // API Settings
    API_BASE_URL: typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:8000/api/v1',
    API_TIMEOUT: 3000,

    // OAuth
    GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

    // File Upload Limits
    FILE_SIZE_LIMITS: {
        catalog: 50 * 1024 * 1024,    // 50MB
        pricelist: 50 * 1024 * 1024,  // 50MB
        cert: 10 * 1024 * 1024        // 10MB
    },

    // Allowed File Types
    ALLOWED_FILE_TYPES: {
        catalog: ['.pdf', '.xlsx', '.xls', '.csv'],
        pricelist: ['.pdf', '.xlsx', '.xls', '.csv'],
        cert: ['.pdf', '.jpg', '.jpeg', '.png']
    },

    // Storage Keys
    STORAGE_KEYS: {
        LOGGED_IN: 'supplier_logged_in',
        TOKEN: 'supplier_token',
        SUPPLIER_ID: 'supplier_id',
        EMAIL: 'supplier_email',
        NAME: 'supplier_name'
    },

    // Categories
    CATEGORIES: {
        oils: 'Oils & Vinegars',
        dairy: 'Dairy & Cheese',
        organic: 'Organic & Health',
        beverages: 'Beverages',
        snacks: 'Snacks',
        sauces: 'Sauces',
        pasta: 'Pasta & Grains',
        canned: 'Canned Goods',
        deli: 'Deli & Meats'
    }
};

// Freeze config to prevent modifications
Object.freeze(Config);
Object.freeze(Config.FILE_SIZE_LIMITS);
Object.freeze(Config.ALLOWED_FILE_TYPES);
Object.freeze(Config.STORAGE_KEYS);
Object.freeze(Config.CATEGORIES);

export default Config;

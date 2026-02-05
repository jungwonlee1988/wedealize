// WeDealize Supplier Portal - Configuration
// Centralized configuration management

const Config = {
    // API Settings
    API_BASE_URL: typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://supplier-api-blush.vercel.app/api/v1/supplier',
    API_TIMEOUT: 3000,

    // OAuth
    GOOGLE_CLIENT_ID: '922089603849-fgcilcaqoohkqs0dslblb6giq7v0r2nh.apps.googleusercontent.com',

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

    // Categories (46 sub-categories)
    CATEGORIES: {
        'evoo': 'Extra Virgin Olive Oil',
        'olive-oil': 'Olive Oil',
        'seed-oils': 'Seed Oils',
        'nut-oils': 'Nut Oils',
        'truffle-oil': 'Truffle Oil',
        'balsamic': 'Balsamic Vinegar',
        'wine-vinegar': 'Wine Vinegar',
        'sauces': 'Sauces & Pesto',
        'mustard-dressings': 'Mustard & Dressings',
        'hard-cheese': 'Hard Cheese',
        'soft-cheese': 'Soft Cheese',
        'aged-cheese': 'Aged Cheese',
        'butter-cream': 'Butter & Cream',
        'cured-meats': 'Cured Meats',
        'sausages': 'Sausages',
        'smoked-meats': 'Smoked Meats',
        'dried-pasta': 'Dried Pasta',
        'fresh-pasta': 'Fresh Pasta',
        'rice': 'Rice',
        'flour-semolina': 'Flour & Semolina',
        'bread': 'Bread',
        'biscuits-cookies': 'Biscuits & Cookies',
        'chocolate': 'Chocolate',
        'pastries': 'Pastries',
        'tomato-products': 'Tomato Products',
        'pickles-olives': 'Pickles & Olives',
        'preserved-veg': 'Preserved Vegetables',
        'jams-spreads': 'Jams & Spreads',
        'wine': 'Wine',
        'spirits': 'Spirits',
        'coffee': 'Coffee',
        'tea': 'Tea',
        'juices-soft': 'Juices & Soft Drinks',
        'fresh-fish': 'Fresh Fish',
        'canned-fish': 'Canned Fish',
        'shellfish': 'Shellfish',
        'smoked-fish': 'Smoked Fish',
        'spice-blends': 'Spice Blends',
        'herbs': 'Herbs',
        'honey': 'Honey',
        'nuts-dried-fruit': 'Nuts & Dried Fruit',
        'chips-crackers': 'Chips & Crackers',
        'bars': 'Snack Bars',
        'organic': 'Organic',
        'gluten-free': 'Gluten-Free',
        'vegan-plant': 'Vegan & Plant-Based',
        'frozen': 'Frozen Foods'
    },

    // Category groups (12 groups)
    CATEGORY_GROUPS: {
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
    }
};

// Freeze config to prevent modifications
Object.freeze(Config);
Object.freeze(Config.FILE_SIZE_LIMITS);
Object.freeze(Config.ALLOWED_FILE_TYPES);
Object.freeze(Config.STORAGE_KEYS);
Object.freeze(Config.CATEGORIES);
Object.freeze(Config.CATEGORY_GROUPS);

export default Config;

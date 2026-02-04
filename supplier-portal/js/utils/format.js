// WeDealize Supplier Portal - Format Utilities
// Data formatting and parsing helpers

/**
 * Parse price range string
 * @param {string} priceStr - Price string (e.g., "$7.20 - $8.50")
 * @returns {Object} { minPrice, maxPrice }
 */
export function parsePriceRange(priceStr) {
    if (!priceStr) return { minPrice: '', maxPrice: '' };

    const str = String(priceStr).trim();

    // Range format (e.g., "$7.20 - $8.50", "7.20-8.50", "$7.20~$8.50")
    const rangeMatch = str.match(/\$?\s*([\d,.]+)\s*[-~]\s*\$?\s*([\d,.]+)/);
    if (rangeMatch) {
        return {
            minPrice: rangeMatch[1].replace(/,/g, ''),
            maxPrice: rangeMatch[2].replace(/,/g, '')
        };
    }

    // Single price (e.g., "$18.00", "18.00")
    const singleMatch = str.match(/\$?\s*([\d,.]+)/);
    if (singleMatch) {
        const price = singleMatch[1].replace(/,/g, '');
        return { minPrice: price, maxPrice: price };
    }

    return { minPrice: '', maxPrice: '' };
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 * @param {*} field - Field value
 * @returns {string} Escaped field
 */
export function escapeCsvField(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Format currency
 * @param {number} value - Numeric value
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
    }).format(value);
}

/**
 * Format date
 * @param {Date|string} date - Date object or string
 * @param {string} format - Format type ('short', 'long', 'iso')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'short') {
    const d = date instanceof Date ? date : new Date(date);

    if (format === 'iso') {
        return d.toISOString().slice(0, 10);
    }

    const options = format === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' };

    return d.toLocaleDateString('en-US', options);
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert to kebab-case
 * @param {string} str - String to convert
 * @returns {string} Kebab-cased string
 */
export function toKebabCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}

/**
 * Delay utility (promisified setTimeout)
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Resolves after delay
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(fn, wait = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), wait);
    };
}

/**
 * Throttle function
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Limit time in ms
 * @returns {Function} Throttled function
 */
export function throttle(fn, limit = 300) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

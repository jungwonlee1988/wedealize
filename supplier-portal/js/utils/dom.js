// WeDealize Supplier Portal - DOM Utilities
// DOM manipulation helpers

/**
 * Query selector shorthand
 * @param {string} selector - CSS selector
 * @param {Element} context - Parent element (default: document)
 * @returns {Element|null}
 */
export function $(selector, context = document) {
    return context.querySelector(selector);
}

/**
 * Query selector all shorthand
 * @param {string} selector - CSS selector
 * @param {Element} context - Parent element (default: document)
 * @returns {NodeList}
 */
export function $$(selector, context = document) {
    return context.querySelectorAll(selector);
}

/**
 * Create element with attributes and children
 * @param {string} tag - Tag name
 * @param {Object} attrs - Attributes object
 * @param {Array|string} children - Child elements or text
 * @returns {Element}
 */
export function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'dataset' && typeof value === 'object') {
            Object.assign(el.dataset, value);
        } else {
            el.setAttribute(key, value);
        }
    }

    if (typeof children === 'string') {
        el.textContent = children;
    } else if (Array.isArray(children)) {
        children.forEach(child => {
            if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            } else if (child instanceof Element) {
                el.appendChild(child);
            }
        });
    }

    return el;
}

/**
 * Add event listener to element(s)
 * @param {Element|NodeList|string} target - Element, NodeList, or selector
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 * @param {Object} options - Event listener options
 */
export function on(target, event, handler, options = {}) {
    const elements = typeof target === 'string' ? $$(target) : (target instanceof NodeList ? target : [target]);
    elements.forEach(el => el.addEventListener(event, handler, options));
}

/**
 * Remove event listener
 * @param {Element|string} target - Element or selector
 * @param {string} event - Event type
 * @param {Function} handler - Event handler
 */
export function off(target, event, handler) {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.removeEventListener(event, handler);
}

/**
 * Show element
 * @param {Element|string} target - Element or selector
 * @param {string} display - Display value (default: 'block')
 */
export function show(target, display = 'block') {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.style.display = display;
}

/**
 * Hide element
 * @param {Element|string} target - Element or selector
 */
export function hide(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.style.display = 'none';
}

/**
 * Toggle element visibility
 * @param {Element|string} target - Element or selector
 * @param {boolean} force - Force show/hide
 */
export function toggle(target, force) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;

    if (force !== undefined) {
        el.style.display = force ? 'block' : 'none';
    } else {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Add class to element
 * @param {Element|string} target - Element or selector
 * @param {...string} classes - Class names
 */
export function addClass(target, ...classes) {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.classList.add(...classes);
}

/**
 * Remove class from element
 * @param {Element|string} target - Element or selector
 * @param {...string} classes - Class names
 */
export function removeClass(target, ...classes) {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.classList.remove(...classes);
}

/**
 * Toggle class on element
 * @param {Element|string} target - Element or selector
 * @param {string} className - Class name
 * @param {boolean} force - Force add/remove
 */
export function toggleClass(target, className, force) {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.classList.toggle(className, force);
}

/**
 * Check if element has class
 * @param {Element|string} target - Element or selector
 * @param {string} className - Class name
 * @returns {boolean}
 */
export function hasClass(target, className) {
    const el = typeof target === 'string' ? $(target) : target;
    return el ? el.classList.contains(className) : false;
}

/**
 * Get/set element attribute
 * @param {Element|string} target - Element or selector
 * @param {string} name - Attribute name
 * @param {string} value - Attribute value (optional)
 * @returns {string|undefined}
 */
export function attr(target, name, value) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;

    if (value === undefined) {
        return el.getAttribute(name);
    }
    el.setAttribute(name, value);
}

/**
 * Set inner HTML safely
 * @param {Element|string} target - Element or selector
 * @param {string} html - HTML string
 */
export function html(target, htmlString) {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.innerHTML = htmlString;
}

/**
 * Set text content
 * @param {Element|string} target - Element or selector
 * @param {string} text - Text content
 */
export function text(target, textContent) {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.textContent = textContent;
}

/**
 * Get/set input value
 * @param {Element|string} target - Element or selector
 * @param {string} value - Value (optional)
 * @returns {string|undefined}
 */
export function val(target, value) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;

    if (value === undefined) {
        return el.value;
    }
    el.value = value;
}

/**
 * Empty element contents
 * @param {Element|string} target - Element or selector
 */
export function empty(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.innerHTML = '';
}

/**
 * Remove element from DOM
 * @param {Element|string} target - Element or selector
 */
export function remove(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (el) el.remove();
}

/**
 * Get closest ancestor matching selector
 * @param {Element} element - Start element
 * @param {string} selector - CSS selector
 * @returns {Element|null}
 */
export function closest(element, selector) {
    return element.closest(selector);
}

/**
 * Check if element matches selector
 * @param {Element} element - Element to check
 * @param {string} selector - CSS selector
 * @returns {boolean}
 */
export function matches(element, selector) {
    return element.matches(selector);
}

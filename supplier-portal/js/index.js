// WeDealize Supplier Portal - Module Index
// Central export point for all modules (for non-ES6 module bundlers)

// Core
export { default as store } from './core/store.js';
export { default as router } from './core/router.js';
export { default as eventBus, Events } from './core/eventBus.js';

// Config
export { default as Config } from './config.js';

// Services
export { default as api } from './services/api.js';
export { default as authService } from './services/auth.js';
export { default as productService } from './services/product.js';
export { default as poService } from './services/po.js';

// Components
export { default as toast } from './components/toast.js';
export { default as modal } from './components/modal.js';

// Modules
export { default as authModule } from './modules/auth.js';
export { default as catalogModule } from './modules/catalog.js';
export { default as productModule } from './modules/product.js';
export { default as salesModule } from './modules/sales.js';

// Utils
export * from './utils/format.js';
export * from './utils/dom.js';

// App
export { default as app } from './app.js';

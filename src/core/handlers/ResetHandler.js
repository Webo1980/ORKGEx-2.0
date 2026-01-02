// ================================
// src/core/handlers/ResetHandler.js - Centralized Reset Logic
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class ResetHandler {
    constructor() {
        this.isResetting = false;
        this.resetCallbacks = new Set();
        this.preservedKeys = ['orkg-annotator-theme']; // Keys to preserve during reset
    }

    /**
     * Register a callback to be called during reset
     */
    registerResetCallback(callback) {
        this.resetCallbacks.add(callback);
    }

    /**
     * Unregister a reset callback
     */
    unregisterResetCallback(callback) {
        this.resetCallbacks.delete(callback);
    }

    /**
     * Perform a complete system reset
     */
    async performCompleteReset(options = {}) {
        if (this.isResetting) {
            console.log('🔄 Reset already in progress');
            return false;
        }

        const config = {
            clearStorage: true,
            clearCache: true,
            resetServices: true,
            clearEvents: true,
            resetUI: true,
            reload: false,
            source: 'unknown',
            ...options
        };

        this.isResetting = true;

        try {
            console.log('🧹 Starting complete system reset...', config);

            // Step 1: Clear browser storage
            if (config.clearStorage) {
                await this.clearAllStorage();
            }

            // Step 2: Clear all caches
            if (config.clearCache) {
                await this.clearAllCaches();
            }

            // Step 3: Reset all services
            if (config.resetServices) {
                await this.resetAllServices();
            }

            // Step 4: Clear event listeners
            if (config.clearEvents) {
                this.clearEventListeners();
            }

            // Step 5: Reset UI
            if (config.resetUI) {
                await this.resetUI();
            }

            // Step 6: Execute registered callbacks
            await this.executeResetCallbacks();

            // Step 7: Emit reset complete event
            eventManager.emit('reset:complete', {
                source: config.source,
                timestamp: Date.now(),
                reload: config.reload
            });

            console.log('✅ Complete reset finished successfully');

            // Step 8: Reload if requested
            if (config.reload) {
                setTimeout(() => {
                    console.log('🔄 Reloading extension...');
                    window.location.reload();
                }, 1500);
            }

            return true;

        } catch (error) {
            console.error('❌ Reset failed:', error);
            eventManager.emit('reset:error', { error, config });
            throw error;

        } finally {
            // Reset flag after delay
            setTimeout(() => {
                this.isResetting = false;
            }, 3000);
        }
    }

    /**
     * Clear all browser storage
     */
    async clearAllStorage() {
        console.log('🗑️ Clearing all browser storage...');

        try {
            // Clear localStorage (preserve specified keys)
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(key => {
                if (!this.preservedKeys.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            console.log(`🗑️ LocalStorage cleared (preserved: ${this.preservedKeys.join(', ')})`);

            // Clear sessionStorage completely
            sessionStorage.clear();
            console.log('🗑️ SessionStorage cleared');

            // Clear IndexedDB databases
            await this.clearIndexedDB();

            // Clear Chrome extension storage
            await this.clearChromeStorage();

            // Clear cookies if needed
            await this.clearCookies();

            console.log('✅ All storage cleared');

        } catch (error) {
            console.error('Error clearing storage:', error);
            throw error;
        }
    }

    /**
     * Clear IndexedDB databases
     */
    async clearIndexedDB() {
        if (!window.indexedDB) return;

        try {
            const databases = await indexedDB.databases();
            
            for (const db of databases) {
                if (db.name && (db.name.includes('orkg') || db.name.includes('annotator'))) {
                    await indexedDB.deleteDatabase(db.name);
                    console.log(`🗑️ Deleted IndexedDB: ${db.name}`);
                }
            }
        } catch (error) {
            console.warn('Could not clear IndexedDB:', error);
        }
    }

    /**
     * Clear Chrome extension storage
     */
    async clearChromeStorage() {
        if (typeof chrome === 'undefined' || !chrome.storage) return;

        try {
            await new Promise((resolve, reject) => {
                chrome.storage.local.clear(() => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        console.log('🗑️ Chrome local storage cleared');
                        resolve();
                    }
                });
            });

            await new Promise((resolve, reject) => {
                chrome.storage.sync.clear(() => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        console.log('🗑️ Chrome sync storage cleared');
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.warn('Could not clear Chrome storage:', error);
        }
    }

    /**
     * Clear cookies related to the extension
     */
    async clearCookies() {
        if (typeof chrome === 'undefined' || !chrome.cookies) return;

        try {
            const cookies = await new Promise((resolve) => {
                chrome.cookies.getAll({}, resolve);
            });

            for (const cookie of cookies) {
                if (cookie.name.includes('orkg') || cookie.name.includes('annotator')) {
                    await new Promise((resolve) => {
                        chrome.cookies.remove({
                            url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                            name: cookie.name
                        }, resolve);
                    });
                    console.log(`🍪 Removed cookie: ${cookie.name}`);
                }
            }
        } catch (error) {
            console.warn('Could not clear cookies:', error);
        }
    }

    /**
     * Clear all caches
     */
    async clearAllCaches() {
        console.log('💾 Clearing all caches...');

        try {
            const serviceManager = window.serviceManager;
            
            if (serviceManager) {
                // Clear DataCache
                const dataCache = serviceManager.getService('dataCache');
                if (dataCache?.clear) {
                    dataCache.clear();
                    console.log('💾 DataCache cleared');
                }

                // Clear APIService cache
                const apiService = serviceManager.getService('apiService');
                if (apiService?.clearCache) {
                    await apiService.clearCache();
                    console.log('💾 API cache cleared');
                }

                // Clear all service-specific caches
                await this.clearServiceCaches(serviceManager);
            }

            // Clear browser caches
            await this.clearBrowserCaches();

            console.log('✅ All caches cleared');

        } catch (error) {
            console.error('Error clearing caches:', error);
            throw error;
        }
    }

    /**
     * Clear service-specific caches
     */
    async clearServiceCaches(serviceManager) {
        const services = serviceManager.getServicesStatus();
        
        if (!services?.services) return;

        for (const [name, service] of Object.entries(services.services)) {
            if (!service.instance) continue;

            try {
                // Generic cache clear methods
                if (service.instance.clearCache) {
                    await service.instance.clearCache();
                    console.log(`💾 ${name} cache cleared`);
                }

                if (service.instance.clear) {
                    await service.instance.clear();
                    console.log(`💾 ${name} cleared`);
                }

                // Specific cache properties
                const cacheProperties = [
                    'cache',
                    'fieldAnalysisCache',
                    'templateCache',
                    'problemCache',
                    'embeddingCache',
                    'resultCache'
                ];

                for (const prop of cacheProperties) {
                    if (service.instance[prop]) {
                        if (service.instance[prop].clear) {
                            service.instance[prop].clear();
                            console.log(`💾 ${name}.${prop} cleared`);
                        } else if (service.instance[prop] instanceof Map) {
                            service.instance[prop].clear();
                            console.log(`💾 ${name}.${prop} Map cleared`);
                        } else if (service.instance[prop] instanceof Set) {
                            service.instance[prop].clear();
                            console.log(`💾 ${name}.${prop} Set cleared`);
                        }
                    }
                }
            } catch (error) {
                console.warn(`Failed to clear cache for ${name}:`, error);
            }
        }
    }

    /**
     * Clear browser caches
     */
    async clearBrowserCaches() {
        if (!('caches' in window)) return;

        try {
            const cacheNames = await caches.keys();
            
            for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
                console.log(`💾 Browser cache cleared: ${cacheName}`);
            }
        } catch (error) {
            console.warn('Could not clear browser caches:', error);
        }
    }

    /**
     * Reset all services
     */
    async resetAllServices() {
        console.log('🔧 Resetting all services...');

        try {
            const serviceManager = window.serviceManager;
            
            if (!serviceManager) {
                console.warn('ServiceManager not available');
                return;
            }

            const services = serviceManager.getServicesStatus();
            
            if (!services?.services) return;

            // Sort services by priority (reverse order for reset)
            const serviceList = Object.entries(services.services)
                .sort((a, b) => (b[1].priority || 0) - (a[1].priority || 0));

            // Reset each service
            for (const [name, serviceInfo] of serviceList) {
                if (!serviceInfo.instance) continue;

                try {
                    // Call reset method
                    if (serviceInfo.instance.reset) {
                        console.log(`🔧 Resetting ${name}...`);
                        
                        // Determine reset type
                        const resetType = this.getResetType(name);
                        
                        if (serviceInfo.instance.reset.length > 0) {
                            // Method accepts parameters
                            serviceInfo.instance.reset(resetType);
                        } else {
                            // Method doesn't accept parameters
                            serviceInfo.instance.reset();
                        }
                    }

                    // Clear any state
                    if (serviceInfo.instance.state) {
                        serviceInfo.instance.state = {};
                    }

                } catch (error) {
                    console.error(`Failed to reset ${name}:`, error);
                }
            }

            // Special handling for critical services
            await this.resetCriticalServices(serviceManager);

            console.log('✅ All services reset');

        } catch (error) {
            console.error('Error resetting services:', error);
            throw error;
        }
    }

    /**
     * Get appropriate reset type for service
     */
    getResetType(serviceName) {
        const hardResetServices = ['stateManager', 'dataCache', 'apiService'];
        const completeResetServices = ['workflowState', 'navigationManager'];
        
        if (hardResetServices.includes(serviceName)) return 'hard';
        if (completeResetServices.includes(serviceName)) return 'complete';
        
        return 'soft';
    }

    /**
     * Reset critical services with special handling
     */
    async resetCriticalServices(serviceManager) {
        // StateManager - hard reset
        const stateManager = serviceManager.getService('stateManager');
        if (stateManager?.reset) {
            stateManager.reset('hard');
            console.log('🔧 StateManager hard reset completed');
        }

        // WorkflowState - complete reset
        const workflowState = serviceManager.getService('workflowState');
        if (workflowState?.reset) {
            workflowState.reset('complete');
            console.log('🔧 WorkflowState complete reset completed');
        }

        // ContentManager - full reset
        const contentManager = serviceManager.getService('contentManager');
        if (contentManager?.reset) {
            contentManager.reset();
            console.log('🔧 ContentManager reset completed');
        }
    }

    /**
     * Clear non-critical event listeners
     */
    clearEventListeners() {
        console.log('📡 Clearing non-critical event listeners...');

        try {
            if (!eventManager || !eventManager._events) return;

            // Events to preserve
            const criticalEvents = [
                'NAVIGATE_TO_STEP',
                'workflow:step_changed',
                'reset:complete',
                'reset:error',
                'error:global',
                'error:critical'
            ];

            // Get all event types
            const allEvents = Object.keys(eventManager._events);

            // Clear non-critical events
            allEvents.forEach(eventType => {
                if (!criticalEvents.includes(eventType)) {
                    eventManager.off(eventType);
                    console.log(`📡 Cleared event: ${eventType}`);
                }
            });

            console.log('✅ Non-critical event listeners cleared');

        } catch (error) {
            console.error('Error clearing event listeners:', error);
        }
    }

    /**
     * Reset UI to initial state
     */
    async resetUI() {
        console.log('🎨 Resetting UI to initial state...');

        try {
            // Clear toasts
            this.clearToasts();

            // Clear modals
            this.clearModals();

            // Clear error messages
            this.clearErrors();

            // Reset scroll position
            window.scrollTo(0, 0);

            // Clear any temporary UI elements
            this.clearTemporaryElements();

            // Reset form inputs
            this.resetFormInputs();

            console.log('✅ UI reset completed');

        } catch (error) {
            console.error('Error resetting UI:', error);
        }
    }

    /**
     * Clear all toast notifications
     */
    clearToasts() {
        const toastManager = window.serviceManager?.getService('toastManager');
        if (toastManager?.clearAll) {
            toastManager.clearAll();
        }

        // Also remove any toast containers directly
        const toastContainers = document.querySelectorAll('#toast-container, .toast-container');
        toastContainers.forEach(container => container.remove());
    }

    /**
     * Clear all modals
     */
    clearModals() {
        const modals = document.querySelectorAll('.modal, [role="dialog"]');
        modals.forEach(modal => {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        });

        // Remove modal backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop, .modal-overlay');
        backdrops.forEach(backdrop => backdrop.remove());
    }

    /**
     * Clear error messages
     */
    clearErrors() {
        const errorSelectors = [
            '.error-message',
            '.error-card',
            '.error-state',
            '.error-notification',
            '.alert-error',
            '[role="alert"]'
        ];

        errorSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove());
        });
    }

    /**
     * Clear temporary UI elements
     */
    clearTemporaryElements() {
        const temporarySelectors = [
            '.tooltip',
            '.popover',
            '.dropdown-menu.open',
            '.context-menu',
            '.autocomplete-results'
        ];

        temporarySelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => el.remove());
        });
    }

    /**
     * Reset form inputs
     */
    resetFormInputs() {
        // Reset all forms
        document.querySelectorAll('form').forEach(form => form.reset());

        // Clear specific inputs
        document.querySelectorAll('input[type="text"], input[type="search"], textarea').forEach(input => {
            input.value = '';
        });

        // Uncheck checkboxes and radios
        document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
            input.checked = false;
        });

        // Reset selects
        document.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
        });
    }

    /**
     * Execute registered reset callbacks
     */
    async executeResetCallbacks() {
        console.log(`📞 Executing ${this.resetCallbacks.size} reset callbacks...`);

        for (const callback of this.resetCallbacks) {
            try {
                await callback();
            } catch (error) {
                console.error('Reset callback failed:', error);
            }
        }
    }

    /**
     * Check if reset is needed based on system state
     */
    shouldReload() {
        const serviceManager = window.serviceManager;
        
        if (!serviceManager) return true;

        const services = serviceManager.getServicesStatus();

        // Check for failed services
        if (services?.services) {
            for (const service of Object.values(services.services)) {
                if (service.status === 'error' || service.status === 'failed') {
                    console.log(`🔄 Reload needed: ${service.name} in error state`);
                    return true;
                }
            }
        }

        // Check for critical errors
        const errorHandler = serviceManager.getService('errorHandler');
        if (errorHandler?.hasCriticalErrors?.()) {
            console.log('🔄 Reload needed: Critical errors detected');
            return true;
        }

        return false;
    }

    /**
     * Get reset status
     */
    getStatus() {
        return {
            isResetting: this.isResetting,
            callbackCount: this.resetCallbacks.size,
            preservedKeys: this.preservedKeys
        };
    }

    /**
     * Add key to preserve during reset
     */
    addPreservedKey(key) {
        this.preservedKeys.push(key);
    }

    /**
     * Remove key from preserved list
     */
    removePreservedKey(key) {
        const index = this.preservedKeys.indexOf(key);
        if (index > -1) {
            this.preservedKeys.splice(index, 1);
        }
    }
}

// Create singleton instance
export const resetHandler = new ResetHandler();

export default resetHandler;
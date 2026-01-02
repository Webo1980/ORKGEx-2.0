// ================================
// src/core/services/ServiceManager.js - MOVED: From /core to /services
// ================================

import { eventManager } from '../../utils/eventManager.js';

/**
 * Centralized service manager for the ORKG Annotator
 * Provides single point of access to all services/managers
 * Handles service lifecycle and dependencies
 */
class ServiceManager {
    constructor() {
        this.services = new Map();
        this.isInitialized = false;
        this.initializationOrder = [];
        this.dependencyGraph = new Map();
        this.initializationPromises = new Map();
        
        // Internal state
        this.isShuttingDown = false;
        this.criticalServices = new Set(['toastManager', 'eventManager', 'errorHandler']);
    }
    
    /**
     * Register a service with optional dependencies
     * @param {string} name - Service name
     * @param {Function} serviceClass - Service constructor
     * @param {Object} options - Configuration options
     */
    registerService(name, serviceClass, options = {}) {
        const serviceConfig = {
            name,
            serviceClass,
            dependencies: options.dependencies || [],
            priority: options.priority || 0,
            critical: options.critical || false,
            singleton: options.singleton !== false,
            autoInit: options.autoInit !== false,
            factory: options.factory || null,  // ← Make sure factory is stored
            instance: null,
            initialized: false,
            config: options.config || {}
        };
        
        console.log(`📦 Registering service ${name} with:`, {
            hasFactory: !!serviceConfig.factory,
            factoryType: typeof serviceConfig.factory,
            hasConfig: !!serviceConfig.config,
            configKeys: Object.keys(serviceConfig.config || {})
        });
        
        this.services.set(name, serviceConfig);
        
        if (serviceConfig.critical) {
            this.criticalServices.add(name);
        }
        
        // Store dependency relationships
        if (serviceConfig.dependencies.length > 0) {
            this.dependencyGraph.set(name, serviceConfig.dependencies);
        }
        
        console.log(`📦 Service registered: ${name}`);
        return this;
    }
    
    /**
     * Initialize all services in dependency order
     */
    async initializeAll() {
        if (this.isInitialized) {
            console.warn('ServiceManager already initialized');
            return;
        }
        
        try {
            console.log('🚀 Initializing ServiceManager...');
            
            // Calculate initialization order based on dependencies
            this.calculateInitializationOrder();
            
            // Initialize services in order
            for (const serviceName of this.initializationOrder) {
                await this.initializeService(serviceName);
            }
            
            this.isInitialized = true;
            
            // Emit ready event
            eventManager.emit('services:all_initialized', {
                services: Array.from(this.services.keys()),
                order: this.initializationOrder
            });
            
            console.log('✅ All services initialized');
            
        } catch (error) {
            console.error('❌ Service initialization failed:', error);
            throw new Error(`ServiceManager initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Initialize a specific service
     * @param {string} name - Service name
     */
    async initializeService(name) {
        const serviceConfig = this.services.get(name);
        if (!serviceConfig) {
            throw new Error(`Service not found: ${name}`);
        }
        
        if (serviceConfig.initialized) {
            return serviceConfig.instance;
        }
        
        // Check if already initializing
        if (this.initializationPromises.has(name)) {
            return await this.initializationPromises.get(name);
        }
        
        // Create initialization promise
        const initPromise = this.doInitializeService(serviceConfig);
        this.initializationPromises.set(name, initPromise);
        
        try {
            const instance = await initPromise;
            this.initializationPromises.delete(name);
            return instance;
        } catch (error) {
            this.initializationPromises.delete(name);
            throw error;
        }
    }

    /**
     * Get a service and ensure it's initialized
     * @param {string} name - Service name
     * @returns {Promise<Object|null>} Service instance or null
     */
    async getServiceSafe(name) {
        const service = this.getService(name);
        
        if (!service) {
            console.warn(`Service ${name} not found`);
            return null;
        }
        
        // If service has init method and isn't initialized, initialize it
        if (service.init && typeof service.init === 'function') {
            if (service.isInitialized === false) {
                console.log(`🔧 Auto-initializing service: ${name}`);
                try {
                    await service.init();
                } catch (error) {
                    console.error(`Failed to auto-initialize service ${name}:`, error);
                }
            }
        }
        
        return service;
    }
    
    /**
     * Internal service initialization
     */
    // In ServiceManager.js - Complete fixed doInitializeService method
    async doInitializeService(serviceConfig) {
        const { name, serviceClass, dependencies, config, factory } = serviceConfig;
        
        try {
            console.log(`📦 Initializing service: ${name}`);
            console.log(`📦 Service config for ${name}:`, {
                hasFactory: !!factory,
                hasConfig: !!config,
                configValue: config,
                dependencies: dependencies
            });
            
            // Initialize dependencies first
            const dependencyInstances = {};
            for (const depName of dependencies) {
                dependencyInstances[depName] = await this.initializeService(depName);
            }
            
            // Create service instance
            let instance;
            
            // FIXED: Prioritize factory over singleton
            if (factory && typeof factory === 'function') {
                console.log(`📦 Using factory for ${name}`);
                instance = factory(dependencyInstances);
            } else if (serviceConfig.singleton !== false) {
                console.log(`📦 Using singleton constructor for ${name}`);
                // When using constructor directly, pass config appropriately
                // Some services expect (config, dependencies), others just (config)
                if (dependencies.length > 0) {
                    // If service has dependencies, it might expect them as second parameter
                    instance = new serviceClass(config || {}, dependencyInstances);
                } else {
                    // If no dependencies, just pass config
                    instance = new serviceClass(config || {});
                }
            } else {
                console.log(`📦 Using class reference for ${name}`);
                instance = serviceClass;
            }
            
            // Initialize the service if it has an init method
            if (instance && typeof instance.init === 'function') {
                console.log(`📦 Calling init() for ${name}`);
                await instance.init();
            }
            
            // Store instance and mark as initialized
            serviceConfig.instance = instance;
            serviceConfig.initialized = true;
            
            // Make globally available if specified
            if (serviceConfig.global !== false) {
                this.exposeGlobally(name, instance);
            }
            
            console.log(`✅ Service initialized: ${name}`);
            
            // Emit service ready event
            eventManager.emit('service:initialized', { name, instance });
            
            return instance;
            
        } catch (error) {
            console.error(`❌ Failed to initialize service ${name}:`, error);
            
            // Mark critical service failures
            if (this.criticalServices.has(name)) {
                throw new Error(`Critical service initialization failed: ${name} - ${error.message}`);
            }
            
            // For non-critical services, create a fallback
            console.warn(`⚠️ Creating fallback for failed service: ${name}`);
            const fallback = this.createFallbackService(name, error);
            serviceConfig.instance = fallback;
            serviceConfig.initialized = true;
            
            return fallback;
        }
    }
        
    /**
     * Get a service instance
     * @param {string} name - Service name
     * @returns {Object|null} Service instance or null if not found
     */
    getService(name) {
        const serviceConfig = this.services.get(name);
        if (!serviceConfig) {
            console.warn(`Service not found: ${name}`);
            return null;
        }
        
        if (!serviceConfig.initialized) {
            console.warn(`Service not initialized: ${name}`);
            return null;
        }
        
        return serviceConfig.instance;
    }
    
    /**
     * Check if a service exists and is initialized
     * @param {string} name - Service name
     * @returns {boolean} True if service exists and is initialized
     */
    hasService(name) {
        const serviceConfig = this.services.get(name);
        return serviceConfig && serviceConfig.initialized;
    }
    
    /**
     * Wait for a service to be initialized
     * @param {string} name - Service name
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Object>} Promise that resolves to service instance
     */
    async waitForService(name, timeout = 5000) {
        const serviceConfig = this.services.get(name);
        if (!serviceConfig) {
            throw new Error(`Service not found: ${name}`);
        }
        
        if (serviceConfig.initialized) {
            return serviceConfig.instance;
        }
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                eventManager.off('service:initialized', checkService);
                reject(new Error(`Timeout waiting for service: ${name}`));
            }, timeout);
            
            const checkService = (data) => {
                if (data.name === name) {
                    clearTimeout(timeoutId);
                    eventManager.off('service:initialized', checkService);
                    resolve(data.instance);
                }
            };
            
            eventManager.on('service:initialized', checkService);
        });
    }
    
    /**
     * Calculate initialization order based on dependencies
     */
    calculateInitializationOrder() {
        const visited = new Set();
        const visiting = new Set();
        const order = [];
        
        const visit = (serviceName) => {
            if (visiting.has(serviceName)) {
                throw new Error(`Circular dependency detected involving: ${serviceName}`);
            }
            
            if (visited.has(serviceName)) {
                return;
            }
            
            visiting.add(serviceName);
            
            const dependencies = this.dependencyGraph.get(serviceName) || [];
            for (const dep of dependencies) {
                if (!this.services.has(dep)) {
                    throw new Error(`Dependency not found: ${dep} (required by ${serviceName})`);
                }
                visit(dep);
            }
            
            visiting.delete(serviceName);
            visited.add(serviceName);
            order.push(serviceName);
        };
        
        // Sort services by priority first
        const sortedServices = Array.from(this.services.entries())
            .sort((a, b) => b[1].priority - a[1].priority)
            .map(([name]) => name);
        
        // Visit all services in priority order
        for (const serviceName of sortedServices) {
            if (!visited.has(serviceName)) {
                visit(serviceName);
            }
        }
        
        this.initializationOrder = order;
        console.log('📋 Service initialization order:', order);
    }
    
    /**
     * Create fallback service for failed services
     */
    createFallbackService(name, error) {
        console.log(`Creating fallback service for: ${name}`);
        
        const fallback = {
            isReady: () => false,
            isFallback: true,
            originalError: error,
            name: name,
            
            // Common fallback methods
            init: async () => {},
            cleanup: () => {},
            getStatus: () => ({ 
                isFallback: true, 
                error: error.message,
                name: name 
            })
        };
        
        // Service-specific fallbacks
        switch (name) {
            case 'toastManager':
                Object.assign(fallback, {
                    show: (message, type = 'info', duration = 3000) => {
                        console.log(`Fallback Toast (${type}):`, message);
                        return null;
                    },
                    success: (msg, duration) => fallback.show(msg, 'success', duration),
                    error: (msg, duration) => fallback.show(msg, 'error', duration),
                    warning: (msg, duration) => fallback.show(msg, 'warning', duration),
                    info: (msg, duration) => fallback.show(msg, 'info', duration),
                    showConfirmation: (message, onConfirm, onCancel) => {
                        const result = confirm(message);
                        if (result && onConfirm) onConfirm();
                        if (!result && onCancel) onCancel();
                        return Promise.resolve(result);
                    },
                    hide: () => {},
                    clearAll: () => {}
                });
                break;
                
            case 'loadingManager':
                Object.assign(fallback, {
                    show: () => {},
                    hide: () => {},
                    setProgress: () => {},
                    setMessage: () => {}
                });
                break;
                
            case 'errorHandler':
                Object.assign(fallback, {
                    handleError: (error) => console.error('Fallback Error Handler:', error),
                    showError: (message) => console.error('Fallback Error:', message)
                });
                break;
        }
        
        return fallback;
    }
    
    /**
     * Expose service globally if needed
     */
    exposeGlobally(name, instance) {
        const globalMappings = {
            'toastManager': 'toastManager',
            'stateManager': 'stateManager',
            'workflowState': 'workflowState'
        };
        
        const globalName = globalMappings[name];
        if (globalName && !window[globalName]) {
            window[globalName] = instance;
            console.log(`🌐 Service exposed globally as: ${globalName}`);
        }
    }
    
    /**
     * Get all services status
     */
    getServicesStatus() {
        const status = {};
        
        for (const [name, config] of this.services) {
            status[name] = {
                initialized: config.initialized,
                critical: this.criticalServices.has(name),
                dependencies: config.dependencies,
                isFallback: config.instance?.isFallback || false,
                status: config.instance?.getStatus ? config.instance.getStatus() : null
            };
        }
        
        return {
            isInitialized: this.isInitialized,
            totalServices: this.services.size,
            initializedServices: Array.from(this.services.values()).filter(c => c.initialized).length,
            services: status,
            initializationOrder: this.initializationOrder
        };
    }
    
    /**
     * Emergency fallback - create basic services if initialization fails
     */
    createEmergencyServices() {
        console.warn('🚨 Creating emergency fallback services');
        
        // Basic toast manager fallback
        if (!this.hasService('toastManager')) {
            const emergencyToast = this.createFallbackService('toastManager', new Error('Emergency fallback'));
            this.services.set('toastManager', {
                name: 'toastManager',
                instance: emergencyToast,
                initialized: true,
                emergency: true
            });
            window.toastManager = emergencyToast;
        }
        
        // Basic error handler fallback
        if (!this.hasService('errorHandler')) {
            const emergencyError = this.createFallbackService('errorHandler', new Error('Emergency fallback'));
            this.services.set('errorHandler', {
                name: 'errorHandler',
                instance: emergencyError,
                initialized: true,
                emergency: true
            });
        }
    }
    
    /**
     * Shutdown all services
     */
    async shutdown() {
        if (this.isShuttingDown) {
            console.warn('ServiceManager already shutting down');
            return;
        }
        
        this.isShuttingDown = true;
        console.log('🛑 Shutting down ServiceManager...');
        
        // Shutdown services in reverse order
        const shutdownOrder = [...this.initializationOrder].reverse();
        
        for (const serviceName of shutdownOrder) {
            const serviceConfig = this.services.get(serviceName);
            if (serviceConfig?.instance && typeof serviceConfig.instance.cleanup === 'function') {
                try {
                    console.log(`🧹 Cleaning up service: ${serviceName}`);
                    await serviceConfig.instance.cleanup();
                } catch (error) {
                    console.error(`Failed to cleanup service ${serviceName}:`, error);
                }
            }
        }
        
        // Clear all services
        this.services.clear();
        this.dependencyGraph.clear();
        this.initializationPromises.clear();
        this.initializationOrder = [];
        this.isInitialized = false;
        this.isShuttingDown = false;
        
        console.log('✅ ServiceManager shutdown complete');
    }
}

// Create and export singleton instance
export const serviceManager = new ServiceManager();

// Make globally available for debugging
if (typeof window !== 'undefined') {
    window.serviceManager = serviceManager;
    
    // Debug helpers
    window.debugServices = () => {
        console.log('🔍 Services Debug Info:', serviceManager.getServicesStatus());
        return serviceManager.getServicesStatus();
    };
}

export default serviceManager;
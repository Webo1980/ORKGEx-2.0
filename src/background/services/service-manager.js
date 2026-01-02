// ================================
// src/background/services/service-manager.js
// Manages initialization of all background services
// ================================

var ServiceManager = (function() {
    'use strict';
    
    // Private variables
    var services = {};
    var initializationOrder = [];
    var isInitialized = false;
    
    // Service initialization functions
    var serviceInitializers = {
        // Core services
        'StateManager': function() {
            if (typeof StateManager !== 'undefined') {
                StateManager.init();
                return StateManager;
            }
            return null;
        },
        
        'StorageManager': function() {
            if (typeof StorageManager !== 'undefined') {
                StorageManager.init();
                return StorageManager;
            }
            return null;
        },
        
        // Handler services
        'PropertyHandler': function() {
            if (typeof PropertyHandler !== 'undefined') {
                return PropertyHandler.init().then(function() {
                    return PropertyHandler;
                });
            }
            return Promise.resolve(null);
        },
        
        'HighlightHandler': function() {
            if (typeof HighlightHandler !== 'undefined') {
                return HighlightHandler;
            }
            return null;
        },
        
        'MarkerHandler': function() {
            if (typeof MarkerHandler !== 'undefined') {
                return MarkerHandler;
            }
            return null;
        },
        
        'ContextMenuHandler': function() {
            if (typeof ContextMenuHandler !== 'undefined') {
                return ContextMenuHandler.init().then(function() {
                    return ContextMenuHandler;
                });
            }
            return Promise.resolve(null);
        },
        
        // External services
        'ExtractionOrchestrator': function() {
            if (typeof ExtractionOrchestrator !== 'undefined') {
                return ExtractionOrchestrator.init().then(function() {
                    return ExtractionOrchestrator;
                });
            }
            return Promise.resolve(null);
        },
        
        'ORKGService': function() {
            if (typeof ORKGBackgroundService !== 'undefined') {
                var service = new ORKGBackgroundService();
                return service.init().then(function() {
                    return service;
                });
            }
            return Promise.resolve(null);
        },
        
        'OpenAIService': function() {
            if (typeof OpenAIBackgroundService !== 'undefined') {
                var service = new OpenAIBackgroundService();
                return service.init().then(function(initialized) {
                    if (initialized) {
                        console.log('OpenAI service initialized with API key');
                        return service;
                    }
                    console.log('OpenAI service initialized without API key');
                    return service;
                });
            }
            return Promise.resolve(null);
        },
        
        // Message router (must be last)
        'MessageRouter': function() {
            if (typeof MessageRouter !== 'undefined') {
                MessageRouter.init();
                return MessageRouter;
            }
            return null;
        }
    };
    
    // Initialize a single service
    function initializeService(serviceName) {
        console.log('Initializing service:', serviceName);
        
        if (!serviceInitializers[serviceName]) {
            console.warn('No initializer for service:', serviceName);
            return Promise.resolve(null);
        }
        
        try {
            var result = serviceInitializers[serviceName]();
            
            // Handle both sync and async initialization
            if (result && typeof result.then === 'function') {
                return result.then(function(service) {
                    if (service) {
                        services[serviceName] = service;
                        console.log('Service initialized:', serviceName);
                    } else {
                        console.warn('Service not available:', serviceName);
                    }
                    return service;
                }).catch(function(error) {
                    console.error('Failed to initialize service:', serviceName, error);
                    return null;
                });
            } else {
                if (result) {
                    services[serviceName] = result;
                    console.log('Service initialized:', serviceName);
                } else {
                    console.warn('Service not available:', serviceName);
                }
                return Promise.resolve(result);
            }
        } catch (error) {
            console.error('Error initializing service:', serviceName, error);
            return Promise.resolve(null);
        }
    }
    
    // Initialize all services in order
    function initializeAllServices() {
        // Define initialization order (dependencies first)
        initializationOrder = [
            'StateManager',
            'StorageManager',
            'PropertyHandler',
            'HighlightHandler',
            'MarkerHandler',
            'ContextMenuHandler',
            'ExtractionOrchestrator',
            'ORKGService',
            'OpenAIService',
            'MessageRouter'  // Must be last
        ];
        
        // Initialize services sequentially
        var promise = Promise.resolve();
        
        initializationOrder.forEach(function(serviceName) {
            promise = promise.then(function() {
                return initializeService(serviceName);
            });
        });
        
        return promise.then(function() {
            isInitialized = true;
            console.log('All services initialized');
            return services;
        });
    }
    
    // Public API
    return {
        // Initialize all services
        init: function() {
            if (isInitialized) {
                return Promise.resolve(services);
            }
            
            console.log('Initializing ServiceManager...');
            return initializeAllServices();
        },
        
        // Get a service
        getService: function(serviceName) {
            return services[serviceName] || null;
        },
        
        // Check if service exists
        hasService: function(serviceName) {
            return !!services[serviceName];
        },
        
        // Get all services
        getAllServices: function() {
            return services;
        },
        
        // Get service names
        getServiceNames: function() {
            return Object.keys(services);
        },
        
        // Reinitialize a specific service
        reinitializeService: function(serviceName) {
            return initializeService(serviceName);
        },
        
        // Add a custom service
        addService: function(serviceName, service) {
            services[serviceName] = service;
            console.log('Added custom service:', serviceName);
        },
        
        // Remove a service
        removeService: function(serviceName) {
            delete services[serviceName];
            console.log('Removed service:', serviceName);
        },
        
        // Get initialization status
        isInitialized: function() {
            return isInitialized;
        },
        
        // Get service status
        getStatus: function() {
            var status = {
                isInitialized: isInitialized,
                services: {}
            };
            
            Object.keys(services).forEach(function(name) {
                var service = services[name];
                status.services[name] = {
                    available: true,
                    hasStatus: typeof service.getStatus === 'function',
                    status: typeof service.getStatus === 'function' ? service.getStatus() : null
                };
            });
            
            return status;
        },
        
        // Cleanup all services
        cleanup: function() {
            console.log('Cleaning up all services...');
            
            // Call cleanup on services that support it
            Object.keys(services).forEach(function(name) {
                var service = services[name];
                if (typeof service.cleanup === 'function') {
                    try {
                        service.cleanup();
                        console.log('Cleaned up service:', name);
                    } catch (error) {
                        console.error('Failed to cleanup service:', name, error);
                    }
                }
            });
            
            services = {};
            isInitialized = false;
            console.log('All services cleaned up');
        }
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.ServiceManager = ServiceManager;
}
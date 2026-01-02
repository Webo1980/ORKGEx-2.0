// src/content/modules/core/ServiceRegistry.js
// Service Registry with proper IIFE pattern and singleton
(function(global) {
  'use strict';
  
  // Check if already exists
  if (global.serviceRegistry) {
    console.log('📦 ServiceRegistry already exists, skipping creation');
    return;
  }
  
  /**
   * Service Registry for ORKG Content Script
   * 
   * Provides centralized service management with the following features:
   * - Service registration and discovery
   * - Lazy initialization
   * - Dependency tracking
   * - Status reporting
   */
  class ServiceRegistry {
    constructor() {
      this.services = new Map();
      this.initialized = new Set();
      this.dependencies = new Map();
      this.initializePromises = new Map();
      this._isInitializing = false;
      
      console.log('📦 ServiceRegistry created');
    }
    
    /**
     * Register a service with the registry
     * @param {string} name - Service identifier
     * @param {Object|Function} service - Service instance or constructor
     * @param {Array<string>} [dependencies=[]] - Service dependencies
     * @returns {ServiceRegistry} - For method chaining
     */
    register(name, service, dependencies = []) {
      if (!name || typeof name !== 'string') {
        console.error('Service name must be a non-empty string');
        return this;
      }
      
      if (!service) {
        console.error(`Cannot register null or undefined service for: ${name}`);
        return this;
      }
      
      // If it's a constructor, don't instantiate yet
      const isConstructor = typeof service === 'function' && service.prototype;
      
      this.services.set(name, {
        service: service,
        isConstructor: isConstructor,
        instance: isConstructor ? null : service
      });
      
      this.dependencies.set(name, dependencies);
      
      console.log(`📦 Service registered: ${name} (${isConstructor ? 'constructor' : 'instance'})`);
      return this;
    }
    
    /**
     * Get a service instance by name
     * @param {string} name - Service identifier
     * @returns {Object|null} - The service instance or null if not found
     */
    get(name) {
      const entry = this.services.get(name);
      if (!entry) return null;
      
      // Return the instance if available, otherwise return the constructor/service
      return entry.instance || entry.service;
    }
    
    /**
     * Get or create a service instance
     * @param {string} name - Service identifier
     * @returns {Object|null} - The service instance
     */
    getInstance(name) {
      const entry = this.services.get(name);
      if (!entry) return null;
      
      // If we have an instance, return it
      if (entry.instance) {
        return entry.instance;
      }
      
      // If it's a constructor and not initialized, create instance
      if (entry.isConstructor && !this.initialized.has(name)) {
        try {
          console.log(`📦 Creating instance for: ${name}`);
          entry.instance = new entry.service();
          return entry.instance;
        } catch (error) {
          console.error(`❌ Failed to create instance for: ${name}`, error);
          return null;
        }
      }
      
      return entry.service;
    }
    
    /**
     * Check if a service exists
     * @param {string} name - Service identifier
     * @returns {boolean} - True if service exists
     */
    has(name) {
      return this.services.has(name);
    }
    
    /**
     * Initialize a service and its dependencies
     * @param {string} name - Service identifier
     * @returns {Promise<Object>} - The initialized service
     */
    async initialize(name) {
      // Return existing promise if initialization is in progress
      if (this.initializePromises.has(name)) {
        return this.initializePromises.get(name);
      }
      
      // Service not found
      if (!this.has(name)) {
        console.error(`Cannot initialize missing service: ${name}`);
        throw new Error(`Service not found: ${name}`);
      }
      
      // Already initialized
      if (this.initialized.has(name)) {
        return this.getInstance(name);
      }
      
      // Create initialization promise
      const initPromise = (async () => {
        try {
          // Initialize dependencies first
          const deps = this.dependencies.get(name) || [];
          for (const dep of deps) {
            if (!this.has(dep)) {
              console.warn(`Missing dependency ${dep} for service ${name}`);
              continue;
            }
            await this.initialize(dep);
          }
          
          // Get or create the service instance
          const service = this.getInstance(name);
          
          // Initialize this service if it has an init method
          if (service && typeof service.init === 'function') {
            console.log(`🚀 Initializing service: ${name}`);
            await service.init();
          }
          
          this.initialized.add(name);
          console.log(`✅ Service initialized: ${name}`);
          return service;
          
        } catch (error) {
          console.error(`❌ Failed to initialize service: ${name}`, error);
          throw error;
        } finally {
          // Remove the promise when done
          this.initializePromises.delete(name);
        }
      })();
      
      // Store the promise
      this.initializePromises.set(name, initPromise);
      return initPromise;
    }
    
    /**
     * Initialize all registered services
     * @returns {Promise<void>}
     */
    async initializeAll() {
      if (this._isInitializing) {
        console.warn('⚠️ Already initializing all services');
        return;
      }
      
      this._isInitializing = true;
      
      try {
        const serviceNames = Array.from(this.services.keys());
        console.log(`🚀 Initializing all services: ${serviceNames.join(', ')}`);
        
        for (const name of serviceNames) {
          try {
            await this.initialize(name);
          } catch (error) {
            console.error(`Failed to initialize ${name}, continuing...`, error);
          }
        }
      } finally {
        this._isInitializing = false;
      }
    }
    
    /**
     * Check if a service is initialized
     * @param {string} name - Service identifier
     * @returns {boolean} - True if service is initialized
     */
    isInitialized(name) {
      return this.initialized.has(name);
    }
    
    /**
     * Get status report of all services
     * @returns {Object} - Status information
     */
    getStatus() {
      const status = {
        total: this.services.size,
        initialized: this.initialized.size,
        pending: this.initializePromises.size,
        isInitializing: this._isInitializing,
        services: {}
      };
      
      for (const [name, entry] of this.services.entries()) {
        const service = entry.instance || entry.service;
        status.services[name] = {
          initialized: this.initialized.has(name),
          initializing: this.initializePromises.has(name),
          hasInstance: !!entry.instance,
          isConstructor: entry.isConstructor,
          dependencies: this.dependencies.get(name) || [],
          hasInit: service && typeof service.init === 'function',
          hasCleanup: service && typeof service.cleanup === 'function'
        };
      }
      
      return status;
    }
    
    /**
     * Clean up all initialized services
     * @returns {Promise<void>}
     */
    async cleanup() {
      console.log('🧹 Cleaning up all services');
      
      // Clean up in reverse initialization order
      const initializedServices = Array.from(this.initialized).reverse();
      
      for (const name of initializedServices) {
        const service = this.getInstance(name);
        if (service && typeof service.cleanup === 'function') {
          try {
            console.log(`🧹 Cleaning up service: ${name}`);
            await service.cleanup();
          } catch (error) {
            console.error(`❌ Error cleaning up service: ${name}`, error);
          }
        }
      }
      
      this.initialized.clear();
      this.initializePromises.clear();
      this._isInitializing = false;
    }
    
    /**
     * Reset the registry (for testing)
     */
    reset() {
      this.cleanup();
      this.services.clear();
      this.dependencies.clear();
    }
  }
  
  // Create singleton instance
  const serviceRegistry = new ServiceRegistry();
  
  // Expose globally
  global.serviceRegistry = serviceRegistry;
  global.ServiceRegistry = ServiceRegistry;
  
  console.log('📢 ServiceRegistry exposed to global scope');
  
})(typeof window !== 'undefined' ? window : this);
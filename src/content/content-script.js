// ================================
// ORKG Content Script Bundle
// Generated: 2026-01-02T00:26:48.830Z
// Build: Production
// Version: 3.0.0
// ================================

;(function() {
  'use strict';
  
  // Check if already initialized
  if (window.orkgContentScript && window.orkgContentScript.initialized) {
    console.log('✅ ORKG content script already initialized');
    return;
  }
  
  console.log('📦 Loading ORKG Content Script modules...');
  
  // Create namespace
  window.ORKG = window.ORKG || {};
  
  // Provide global for modules that need it
  window.global = window;
  
  try {

  // ===== Module: core/ServiceRegistry.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
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
    } catch (error) {
      console.error('[core/ServiceRegistry.js] Error:', error);
    }
  })();

  // ===== Module: utils/IconRegistry.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/utils/IconRegistry.js

(function(global) {
    'use strict';
    
    /**
     * Centralized icon registry for the marker system
     */
    class IconRegistry {
        constructor() {
            // SVG icon definitions
            this.icons = {
                // Navigation
                chevronDown: '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>',
                chevronUp: '<svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>',
                chevronRight: '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>',
                
                // Actions
                close: '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
                delete: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
                edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
                send: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
                sendAll: '<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>',
                info: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
                
                // Content types
                clipboard: '<svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
                fileText: '<svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>',
                image: '<svg viewBox="0 0 24 24"><path d="M21,3H3C2,3 1,4 1,5V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V5C23,4 22,3 21,3M5,17L8.5,12.5L11,15.5L14.5,11L19,17H5Z"/></svg>',
                table: '<svg viewBox="0 0 24 24"><path d="M5,4H19A2,2 0 0,1 21,6V18A2,2 0 0,1 19,20H5A2,2 0 0,1 3,18V6A2,2 0 0,1 5,4M5,8V12H11V8H5M13,8V12H19V8H13M5,14V18H11V14H5M13,14V18H19V14H13Z"/></svg>',
                
                // UI elements
                minimize: '<svg viewBox="0 0 24 24"><path d="M6 19h12v2H6z"/></svg>',
                maximize: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
                dock: '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>',
                
                // Status indicators
                success: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
                warning: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
                error: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
                
                // ORKG specific
                orkg: '<svg viewBox="0 0 24 24"><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">ORKG</text></svg>'
            };
            
            // Icon aliases for backward compatibility
            this.aliases = {
                'file-text': 'fileText',
                'info-circle': 'info',
                'times': 'close',
                'trash': 'delete',
                'pencil': 'edit',
                'paper-plane': 'send',
                'check': 'success',
                'exclamation-triangle': 'warning',
                'times-circle': 'error'
            };
        }
        
        /**
         * Get icon SVG by name
         */
        getIcon(name, className = '', size = 16) {
            // Check for alias
            const iconName = this.aliases[name] || name;
            
            // Get icon definition
            let svg = this.icons[iconName];
            
            if (!svg) {
                console.warn(`Icon not found: ${name}`);
                return this.getPlaceholderIcon(name, className, size);
            }
            
            // Add class and size attributes
            svg = svg.replace('<svg', `<svg class="orkg-icon ${className}" width="${size}" height="${size}" fill="currentColor" stroke="none"`);
            
            return svg;
        }
        
        /**
         * Get placeholder icon for missing icons
         */
        getPlaceholderIcon(name, className, size) {
            return `<svg class="orkg-icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" font-size="8" fill="currentColor">?</text>
            </svg>`;
        }
        
        /**
         * Register custom icon
         */
        registerIcon(name, svg) {
            this.icons[name] = svg;
        }
        
        /**
         * Register icon alias
         */
        registerAlias(alias, iconName) {
            this.aliases[alias] = iconName;
        }
        
        /**
         * Get all icon names
         */
        getIconNames() {
            return Object.keys(this.icons);
        }
        
        /**
         * Check if icon exists
         */
        hasIcon(name) {
            return !!(this.icons[name] || this.icons[this.aliases[name]]);
        }
    }
    
    // Create singleton instance
    global.IconRegistry = new IconRegistry();
    
    console.log('📢 IconRegistry loaded with', Object.keys(global.IconRegistry.icons).length, 'icons');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[utils/IconRegistry.js] Error:', error);
    }
  })();

  // ===== Module: markers/core/MarkerConfig.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/core/MarkerConfig.js

(function(global) {
    'use strict';
    
    /**
     * Centralized configuration for the marker system
     * Provides default settings and theme management
     */
    class MarkerConfig {
        constructor() {
            // Core settings
            this.core = {
                markerSize: 44,
                markerOffset: 10,
                tooltipDelay: 200,
                menuHideDelay: 300,
                animationDuration: 300,
                defaultMinScore: 0.3,
                maxMarkersPerType: 100,
                enableAnimations: true,
                enableTooltips: true,
                enableMenus: true
            };
            
            // Theme settings
            this.theme = {
                colors: {
                    primary: '#e86161',
                    primaryLight: '#FF6B6B', 
                    primaryDark: '#E04848',
                    success: '#4CAF50',
                    info: '#2196F3',
                    warning: '#FFA726',
                    danger: '#f44336',
                    text: '#2196F3',
                    image: '#4CAF50',
                    table: '#9C27B0'
                },
                shadows: {
                    default: '0 3px 10px rgba(255, 82, 82, 0.3), 0 1px 3px rgba(0, 0, 0, 0.12)',
                    hover: '0 4px 14px rgba(255, 82, 82, 0.4), 0 2px 4px rgba(0, 0, 0, 0.15)',
                    active: '0 5px 15px rgba(255, 82, 82, 0.5)'
                },
                borderRadius: '50%',
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.95)'
            };
            
            // Type-specific configurations
            this.types = {
                text: {
                    color: '#2196F3',
                    icon: 'file-text',
                    minLength: 2,
                    maxLength: 500,
                    enableUpdate: true,
                    particleColor: '#2196F3'
                },
                image: {
                    color: '#4CAF50',
                    icon: 'image',
                    minWidth: 100,
                    minHeight: 100,
                    position: 'top-right',
                    includeBackground: false,
                    includeSVG: false,
                    includeCanvas: false,
                    particleColor: '#4CAF50'
                },
                table: {
                    color: '#9C27B0',
                    icon: 'table',
                    minRows: 2,
                    minColumns: 2,
                    enableUpdate: false,
                    particleColor: '#9C27B0'
                }
            };
            
            // Animation settings
            this.animations = {
                entrance: {
                    duration: 300,
                    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                    scale: { from: 0, to: 1 }
                },
                hover: {
                    duration: 200,
                    scale: 1.1
                },
                click: {
                    duration: 100,
                    scale: 0.95
                },
                removal: {
                    duration: 300,
                    easing: 'ease-out'
                }
            };
            
            // Icon definitions (SVG paths)
            this.icons = {
                delete: 'M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z',
                edit: 'M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231z',
                info: 'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z',
                send: 'M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 492.3 160 478.3V396.4c0-4 1.6-7.8 4.4-10.6L331.8 202.8c5.9-6.3 5.6-16.1-.6-22s-16.1-5.6-22 .6L127 368.1 19.6 307.3c-9.1-5.1-14.8-14.5-14.8-24.7s5.6-19.5 14.6-24.7L483.9 5.6c11.2-6.8 25.1-5.8 35.2 0z',
                sendAll: 'M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z M8 4a.5.5 0 0 1 .5.5V6H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4z'
            };
            
            // Message configuration
            this.messages = {
                deleteConfirm: {
                    title: 'Delete {type} Marker',
                    message: 'Are you sure you want to delete this {type} marker?',
                    confirmText: 'Delete',
                    cancelText: 'Cancel'
                },
                sendOptions: {
                    title: 'Send to ORKG',
                    message: 'Choose what to send to the extension',
                    sendThis: 'Send Only This',
                    sendAll: 'Send All Content',
                    cancel: 'Cancel'
                }
            };
        }
        
        /**
         * Get configuration for a specific marker type
         */
        getTypeConfig(type) {
            return {
                ...this.core,
                ...this.types[type],
                theme: this.theme,
                animations: this.animations,
                icons: this.icons
            };
        }
        
        /**
         * Update configuration
         */
        update(updates) {
            if (updates.core) {
                Object.assign(this.core, updates.core);
            }
            if (updates.theme) {
                this.theme = { ...this.theme, ...updates.theme };
            }
            if (updates.types) {
                Object.keys(updates.types).forEach(type => {
                    if (this.types[type]) {
                        Object.assign(this.types[type], updates.types[type]);
                    }
                });
            }
        }
        
        /**
         * Get color for confidence level
         */
        getConfidenceColor(confidence) {
            if (confidence >= 0.8) return '#10b981';
            if (confidence >= 0.5) return '#f59e0b';
            return '#ef4444';
        }
        
        /**
         * Get icon SVG
         */
        getIcon(name, size = 14) {
            const path = this.icons[name];
            if (!path) return '';
            
            return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="currentColor">
                <path d="${path}"/>
            </svg>`;
        }
    }
    
    // Create singleton instance
    global.MarkerConfig = new MarkerConfig();
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/core/MarkerConfig.js] Error:', error);
    }
  })();

  // ===== Module: markers/core/MarkerRegistry.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/core/MarkerRegistry.js

(function(global) {
    'use strict';
    
    /**
     * Registry for managing all active markers
     * Provides centralized marker tracking and management
     */
    class MarkerRegistry {
        constructor() {
            this.markers = new Map(); // markerId -> markerData
            this.typeIndex = new Map(); // type -> Set of markerIds
            this.elementIndex = new WeakMap(); // element -> Set of markerIds
            this.stats = {
                created: 0,
                deleted: 0,
                active: 0
            };
        }
        
        /**
         * Register a new marker
         */
        register(markerData) {
            const { id, type, element } = markerData;
            
            // Store marker data
            this.markers.set(id, markerData);
            
            // Update type index
            if (!this.typeIndex.has(type)) {
                this.typeIndex.set(type, new Set());
            }
            this.typeIndex.get(type).add(id);
            
            // Update element index
            if (element) {
                if (!this.elementIndex.has(element)) {
                    this.elementIndex.set(element, new Set());
                }
                this.elementIndex.get(element).add(id);
            }
            
            // Update stats
            this.stats.created++;
            this.stats.active++;
            
            console.log(`📌 Registered marker: ${id} (${type})`);
        }
        
        /**
         * Unregister a marker
         */
        unregister(markerId) {
            const markerData = this.markers.get(markerId);
            if (!markerData) return false;
            
            const { type, element } = markerData;
            
            // Remove from type index
            if (this.typeIndex.has(type)) {
                this.typeIndex.get(type).delete(markerId);
                if (this.typeIndex.get(type).size === 0) {
                    this.typeIndex.delete(type);
                }
            }
            
            // Remove from element index
            if (element && this.elementIndex.has(element)) {
                this.elementIndex.get(element).delete(markerId);
                if (this.elementIndex.get(element).size === 0) {
                    this.elementIndex.delete(element);
                }
            }
            
            // Remove marker data
            this.markers.delete(markerId);
            
            // Update stats
            this.stats.deleted++;
            this.stats.active--;
            
            console.log(`🗑️ Unregistered marker: ${markerId}`);
            return true;
        }
        
        /**
         * Get marker by ID
         */
        get(markerId) {
            return this.markers.get(markerId);
        }
        
        /**
         * Get all markers of a specific type
         */
        getByType(type) {
            const markerIds = this.typeIndex.get(type);
            if (!markerIds) return [];
            
            return Array.from(markerIds).map(id => this.markers.get(id)).filter(Boolean);
        }
        
        /**
         * Get markers for an element
         */
        getByElement(element) {
            const markerIds = this.elementIndex.get(element);
            if (!markerIds) return [];
            
            return Array.from(markerIds).map(id => this.markers.get(id)).filter(Boolean);
        }
        
        /**
         * Get all markers
         */
        getAll() {
            return Array.from(this.markers.values());
        }
        
        /**
         * Update marker data
         */
        update(markerId, updates) {
            const markerData = this.markers.get(markerId);
            if (!markerData) return false;
            
            Object.assign(markerData, updates);
            markerData.updatedAt = Date.now();
            
            return true;
        }
        
        /**
         * Clear all markers of a specific type
         */
        clearType(type) {
            const markerIds = this.typeIndex.get(type);
            if (!markerIds) return 0;
            
            let cleared = 0;
            for (const id of markerIds) {
                if (this.unregister(id)) {
                    cleared++;
                }
            }
            
            return cleared;
        }
        
        /**
         * Clear all markers
         */
        clearAll() {
            const count = this.markers.size;
            
            this.markers.clear();
            this.typeIndex.clear();
            this.elementIndex = new WeakMap();
            
            this.stats.deleted += count;
            this.stats.active = 0;
            
            console.log(`🗑️ Cleared all ${count} markers`);
            return count;
        }
        
        /**
         * Get statistics
         */
        getStats() {
            const typeStats = {};
            for (const [type, ids] of this.typeIndex) {
                typeStats[type] = ids.size;
            }
            
            return {
                ...this.stats,
                byType: typeStats,
                total: this.markers.size
            };
        }
        
        /**
         * Find markers matching criteria
         */
        find(predicate) {
            return this.getAll().filter(predicate);
        }
        
        /**
         * Check if marker exists
         */
        has(markerId) {
            return this.markers.has(markerId);
        }
    }
    
    // Create singleton instance
    global.MarkerRegistry = new MarkerRegistry();
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/core/MarkerRegistry.js] Error:', error);
    }
  })();

  // ===== Module: markers/core/MarkerEventBus.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/core/MarkerEventBus.js

(function(global) {
    'use strict';
    
    /**
     * Event bus for marker system communication
     * Implements observer pattern for decoupled communication
     */
    class MarkerEventBus {
        constructor() {
            this.events = new Map();
            this.wildcardListeners = new Set();
        }
        
        /**
         * Subscribe to an event
         */
        on(event, callback, context = null) {
            if (!this.events.has(event)) {
                this.events.set(event, new Set());
            }
            
            this.events.get(event).add({
                callback,
                context,
                once: false
            });
            
            return () => this.off(event, callback);
        }
        
        /**
         * Subscribe to an event once
         */
        once(event, callback, context = null) {
            if (!this.events.has(event)) {
                this.events.set(event, new Set());
            }
            
            this.events.get(event).add({
                callback,
                context,
                once: true
            });
            
            return () => this.off(event, callback);
        }
        
        /**
         * Unsubscribe from an event
         */
        off(event, callback) {
            const listeners = this.events.get(event);
            if (!listeners) return;
            
            for (const listener of listeners) {
                if (listener.callback === callback) {
                    listeners.delete(listener);
                    break;
                }
            }
            
            if (listeners.size === 0) {
                this.events.delete(event);
            }
        }
        
        /**
         * Emit an event
         */
        emit(event, data) {
            // Notify specific listeners
            const listeners = this.events.get(event);
            if (listeners) {
                const toRemove = [];
                
                for (const listener of listeners) {
                    try {
                        listener.callback.call(listener.context, data);
                        
                        if (listener.once) {
                            toRemove.push(listener);
                        }
                    } catch (error) {
                        console.error(`Error in event listener for ${event}:`, error);
                    }
                }
                
                // Remove one-time listeners
                for (const listener of toRemove) {
                    listeners.delete(listener);
                }
            }
            
            // Notify wildcard listeners
            for (const listener of this.wildcardListeners) {
                try {
                    listener.callback.call(listener.context, event, data);
                } catch (error) {
                    console.error(`Error in wildcard listener:`, error);
                }
            }
        }
        
        /**
         * Subscribe to all events
         */
        onAll(callback, context = null) {
            this.wildcardListeners.add({
                callback,
                context
            });
            
            return () => this.offAll(callback);
        }
        
        /**
         * Unsubscribe from all events
         */
        offAll(callback) {
            for (const listener of this.wildcardListeners) {
                if (listener.callback === callback) {
                    this.wildcardListeners.delete(listener);
                    break;
                }
            }
        }
        
        /**
         * Clear all listeners for an event
         */
        clear(event) {
            this.events.delete(event);
        }
        
        /**
         * Clear all listeners
         */
        clearAll() {
            this.events.clear();
            this.wildcardListeners.clear();
        }
        
        /**
         * Get listener count for an event
         */
        listenerCount(event) {
            const listeners = this.events.get(event);
            return listeners ? listeners.size : 0;
        }
        
        /**
         * Get all event names
         */
        eventNames() {
            return Array.from(this.events.keys());
        }
    }
    
    // Create singleton instance
    global.MarkerEventBus = new MarkerEventBus();
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/core/MarkerEventBus.js] Error:', error);
    }
  })();

  // ===== Module: core/MessageHandler.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/core/MessageHandler.js
// Centralized message handling system for communication between 
// content script and background/popup scripts.
/**
 * Message Handler for ORKG Content Script
 * 
 * Provides a centralized system for handling messages between content script
 * and background/popup with the following features:
 * - Action-based message routing
 * - Promise-based messaging
 * - Error handling and logging
 * - Extension context validation
 */

class MessageHandler {
  constructor() {
    this.handlers = new Map();
    this.listener = null;
    this.isInitialized = false;
  }
  
  /**
   * Initialize the message handler
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isInitialized) {
      console.warn('MessageHandler already initialized');
      return;
    }
    
    this.setupMessageListener();
    this.isInitialized = true;
    console.log('✅ MessageHandler initialized');
  }
  
  /**
   * Register a handler for a specific action
   * @param {string} action - Action identifier
   * @param {Function} handler - Handler function
   * @returns {MessageHandler} - For method chaining
   */
  registerHandler(action, handler) {
    if (!action || typeof action !== 'string') {
      console.error('Action must be a non-empty string');
      return this;
    }
    
    if (typeof handler !== 'function') {
      console.error(`Handler for ${action} must be a function`);
      return this;
    }
    
    this.handlers.set(action, handler);
    console.log(`📝 Registered message handler for: ${action}`);
    return this;
  }
  
  /**
   * Setup the message listener
   * @private
   */
  setupMessageListener() {
    // Remove existing listener if present
    if (this.listener && this.isExtensionContextValid()) {
      chrome.runtime.onMessage.removeListener(this.listener);
    }
    
    // Create new listener
    this.listener = (message, sender, sendResponse) => {
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalidated, cannot handle message');
        return false;
      }
      
      const { action } = message;
      
      if (!action) {
        console.warn('Received message without action', message);
        sendResponse({ success: false, error: 'No action specified' });
        return false;
      }
      
      console.log(`📨 Received message: ${action}`);
      
      // Get handler for this action
      const handler = this.handlers.get(action);
      
      if (!handler) {
        console.warn(`No handler registered for action: ${action}`);
        sendResponse({ success: false, error: `Unhandled action: ${action}` });
        return false;
      }
      
      try {
        // Call handler and check if it returns a promise
        const result = handler(message, sender);
        
        if (result instanceof Promise) {
          // Keep the message channel open for async response
          result
            .then(data => {
              if (this.isExtensionContextValid()) {
                sendResponse({ success: true, data });
              }
            })
            .catch(error => {
              console.error(`Error in async handler for ${action}:`, error);
              if (this.isExtensionContextValid()) {
                sendResponse({ 
                  success: false, 
                  error: error.message || 'Error handling message' 
                });
              }
            });
          
          return true; // Keep the message channel open
        } else {
          // Synchronous response
          sendResponse({ success: true, data: result });
          return false;
        }
      } catch (error) {
        console.error(`Error in handler for ${action}:`, error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Error handling message' 
        });
        return false;
      }
    };
    
    // Add listener if extension context is valid
    if (this.isExtensionContextValid()) {
      chrome.runtime.onMessage.addListener(this.listener);
      console.log('📡 Message listener attached');
    } else {
      console.warn('Cannot attach message listener - invalid extension context');
    }
  }
  
  /**
   * Send message to background script
   * @param {Object} message - Message to send
   * @returns {Promise<any>} - Response from background
   */
  sendToBackground(message) {
    return new Promise((resolve, reject) => {
      if (!this.isExtensionContextValid()) {
        reject(new Error('Extension context invalidated, cannot send message'));
        return;
      }
      
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  /**
   * Check if extension context is valid
   * @returns {boolean} - True if context is valid
   */
  isExtensionContextValid() {
    try {
      return chrome && chrome.runtime && chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Clean up the message handler
   */
  cleanup() {
    if (this.listener && this.isExtensionContextValid()) {
      chrome.runtime.onMessage.removeListener(this.listener);
    }
    
    this.handlers.clear();
    this.listener = null;
    this.isInitialized = false;
    
    console.log('🧹 MessageHandler cleaned up');
  }
}

// Create instance
const messageHandler = new MessageHandler();

// Register with service registry
serviceRegistry.register('messageHandler', messageHandler);

messageHandler;
    } catch (error) {
      console.error('[core/MessageHandler.js] Error:', error);
    }
  })();

  // ===== Module: core/SelectionManager.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/core/SelectionManager.js
// Handles text selection, highlighting, and property window management
// based on user interactions with page content.
/**
 * Selection Manager for ORKG Content Script
 * 
 * Handles text selection with the following features:
 * - Debounced selection handling
 * - Context extraction
 * - Position calculation
 * - Integration with property window
 */

class SelectionManager {
  constructor() {
    this.isInitialized = false;
    this.isEnabled = false;
    this.selectedText = '';
    this.selectionTimeout = null;
    this.lastSelectionTime = 0;
    
    // Configuration
    this.config = {
      minTextLength: 3,
      maxTextLength: 500,
      selectionDelay: 300,
      autoShowWindow: true,
      enableKeyboardShortcuts: true
    };
  }
  
  /**
   * Initialize the selection manager
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isInitialized) {
      console.warn('SelectionManager already initialized');
      return;
    }
    
    console.log('🔍 Initializing SelectionManager...');
    
    // Don't activate listeners yet - wait for enable() call
    this.isInitialized = true;
    console.log('✅ SelectionManager initialized');
  }
  
  /**
   * Enable text selection handling
   * @param {Object} [config] - Optional configuration override
   */
  enable(config = {}) {
    if (!this.isInitialized) {
      console.warn('Cannot enable SelectionManager - not initialized');
      return;
    }
    
    if (this.isEnabled) {
      console.log('SelectionManager already enabled');
      return;
    }
    
    // Merge config
    this.config = { ...this.config, ...config };
    
    // Set up event listeners
    this.setupEventListeners();
    
    this.isEnabled = true;
    console.log('🔍 Text selection handling enabled');
  }
  
  /**
   * Disable text selection handling
   */
  disable() {
    if (!this.isEnabled) {
      return;
    }
    
    this.removeEventListeners();
    this.isEnabled = false;
    
    console.log('🔍 Text selection handling disabled');
  }
  
  /**
   * Set up event listeners for text selection
   * @private
   */
  setupEventListeners() {
    // Handle mouseup for selection
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Handle selection changes
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    // Keyboard shortcuts
    if (this.config.enableKeyboardShortcuts) {
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    console.log('🔍 Selection event listeners attached');
  }
  
  /**
   * Remove event listeners
   * @private
   */
  removeEventListeners() {
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('selectionchange', this.handleSelectionChange.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * Handle mouse up event for selection
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  handleMouseUp(event) {
    // Clear previous timeout
    clearTimeout(this.selectionTimeout);
    
    // Don't process if clicking on the property window itself
    if (event.target.closest('.orkg-property-selection-window, .orkg-property-window')) {
      return;
    }
    
    // Debounce selection handling
    this.selectionTimeout = setTimeout(() => {
      this.processTextSelection(event);
    }, this.config.selectionDelay);
  }
  
  /**
   * Handle selection change event
   * @private
   */
  handleSelectionChange() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Only track selection changes, don't hide window
    if (selectedText && selectedText.length >= this.config.minTextLength) {
      this.selectedText = selectedText;
    }
  }
  
  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  handleKeyDown(event) {
    // Ctrl+Shift+H: Toggle property window for current selection
    if (event.ctrlKey && event.shiftKey && event.key === 'H') {
      event.preventDefault();
      this.togglePropertyWindow();
    }
  }
  
  /**
   * Process text selection
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  processTextSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Validate selection
    if (!this.isValidSelection(selectedText)) {
      return;
    }
    
    this.selectedText = selectedText;
    this.lastSelectionTime = Date.now();
    
    // Get selection position for popup positioning
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    const position = {
      x: rect.right + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
    
    // Extract context information
    const context = this.getSelectionContext();
    
    // Show property window if auto-show is enabled
    if (this.config.autoShowWindow) {
      this.showPropertyWindow(selectedText, position);
    }
    
    // Emit selection event
    this.emitSelectionEvent(selectedText, position, context);
  }
  
  /**
   * Check if selection is valid
   * @param {string} text - Selected text
   * @returns {boolean} - True if selection is valid
   * @private
   */
  isValidSelection(text) {
    return text && 
           text.length >= this.config.minTextLength && 
           text.length <= this.config.maxTextLength &&
           !this.isPartOfUIElement(text);
  }
  
  /**
   * Check if selection is part of UI element
   * @param {string} text - Selected text
   * @returns {boolean} - True if selection is part of UI element
   * @private
   */
  isPartOfUIElement() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return true;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    
    // Skip if in certain elements
    const skipSelectors = [
      '.orkg-property-window',
      '.orkg-property-selection-window',
      'nav', 'header', 'footer',
      '.navigation', '.menu', '.toolbar',
      'button', 'input', 'textarea', 'select'
    ];
    
    return skipSelectors.some(selector => element.closest(selector));
  }
  
  /**
   * Get context information for selection
   * @returns {Object} - Context information
   * @private
   */
  getSelectionContext() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return {};
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    
    // Try to determine the section/context
    const section = this.findSectionContext(element);
    
    return {
      section: section,
      pageTitle: document.title,
      pageUrl: window.location.href,
      elementTagName: element.tagName,
      elementClass: element.className,
      surroundingText: this.getSurroundingText(range, 100)
    };
  }
  
  /**
   * Find section context for element
   * @param {Element} element - Element to find section for
   * @returns {string} - Section name
   * @private
   */
  findSectionContext(element) {
    // Try to find which section of the paper this text is from
    const sectionSelectors = [
      { selector: '.abstract, #abstract, [class*="abstract"]', name: 'abstract' },
      { selector: '.introduction, #introduction, [class*="introduction"]', name: 'introduction' },
      { selector: '.methods, #methods, [class*="method"]', name: 'methods' },
      { selector: '.results, #results, [class*="result"]', name: 'results' },
      { selector: '.discussion, #discussion, [class*="discussion"]', name: 'discussion' },
      { selector: '.conclusion, #conclusion, [class*="conclusion"]', name: 'conclusion' },
      { selector: '.references, #references, [class*="reference"]', name: 'references' }
    ];
    
    for (const { selector, name } of sectionSelectors) {
      if (element.closest(selector)) {
        return name;
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Get surrounding text for context
   * @param {Range} range - Selection range
   * @param {number} maxLength - Maximum length of text
   * @returns {string} - Surrounding text
   * @private
   */
  getSurroundingText(range, maxLength) {
    const container = range.commonAncestorContainer;
    const fullText = container.textContent || '';
    const selectedText = range.toString();
    const startIndex = fullText.indexOf(selectedText);
    
    if (startIndex === -1) return '';
    
    const beforeStart = Math.max(0, startIndex - maxLength / 2);
    const afterEnd = Math.min(fullText.length, startIndex + selectedText.length + maxLength / 2);
    
    return fullText.substring(beforeStart, afterEnd);
  }
  
  /**
   * Show property window for selection
   * @param {string} selectedText - Selected text
   * @param {Object} position - Position information
   */
  showPropertyWindow(selectedText, position) {
      const propertyWindow = serviceRegistry.get('propertyWindow');
      
      if (propertyWindow) {
          // Initialize if needed
          if (!propertyWindow.isInitialized && propertyWindow.init) {
              propertyWindow.init();
          }
          propertyWindow.show(selectedText, position);
      } else {
          console.warn('PropertyWindow service not available');
      }
  }
  
  /**
   * Hide property window
   */
  hidePropertyWindow() {
    const propertyWindow = serviceRegistry.get('propertyWindow');
    
    if (propertyWindow && typeof propertyWindow.hide === 'function') {
      propertyWindow.hide();
    }
  }
  
  /**
   * Toggle property window visibility
   */
  togglePropertyWindow() {
    const propertyWindow = serviceRegistry.get('propertyWindow');
    
    if (!propertyWindow) {
      console.warn('PropertyWindow service not available');
      return;
    }
    
    if (typeof propertyWindow.isVisible === 'function' && propertyWindow.isVisible()) {
      this.hidePropertyWindow();
    } else if (this.selectedText) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const position = {
          x: rect.right + window.scrollX,
          y: rect.top + window.scrollY
        };
        this.showPropertyWindow(this.selectedText, position);
      }
    }
  }
  
  /**
   * Emit selection event
   * @param {string} selectedText - Selected text
   * @param {Object} position - Position information
   * @param {Object} context - Context information
   * @private
   */
  emitSelectionEvent(selectedText, position, context) {
    const messageHandler = serviceRegistry.get('messageHandler');
    
    if (messageHandler) {
      messageHandler.sendToBackground({
        action: 'TEXT_SELECTED',
        data: {
          text: selectedText,
          position: position,
          context: context
        }
      }).catch(error => {
        console.warn('Failed to send selection event to background:', error);
      });
    }
  }
  
  /**
   * Get current selection
   * @returns {Object} - Selection information
   */
  getCurrentSelection() {
    return {
      text: this.selectedText,
      lastSelectionTime: this.lastSelectionTime,
      context: this.getSelectionContext()
    };
  }
  
  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Clean up the selection manager
   */
  cleanup() {
    this.disable();
    clearTimeout(this.selectionTimeout);
    
    this.selectedText = '';
    this.lastSelectionTime = 0;
    this.isInitialized = false;
    
    console.log('🧹 SelectionManager cleaned up');
  }
}

// Create instance
const selectionManager = new SelectionManager();

// Register with service registry
serviceRegistry.register('selectionManager', selectionManager);

selectionManager;
    } catch (error) {
      console.error('[core/SelectionManager.js] Error:', error);
    }
  })();

  // ===== Module: utils/DOMUtils.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/utils/DOMUtils.js
// Utility functions for DOM manipulation and traversal
// to support content script operations.
/**
 * DOM Utilities for ORKG Content Script
 * 
 * Collection of DOM manipulation and traversal functions
 */

/**
 * Find elements by selector with optional context
 * @param {string} selector - CSS selector
 * @param {Element} [context=document] - Context element
 * @returns {Element[]} - Found elements
 */
function findElements(selector, context = document) {
  try {
    return Array.from(context.querySelectorAll(selector));
  } catch (error) {
    console.warn(`Failed to find elements with selector: ${selector}`, error);
    return [];
  }
}

/**
 * Find first element by selector with optional context
 * @param {string} selector - CSS selector
 * @param {Element} [context=document] - Context element
 * @returns {Element|null} - Found element or null
 */
function findElement(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.warn(`Failed to find element with selector: ${selector}`, error);
    return null;
  }
}

/**
 * Create element with attributes and content
 * @param {string} tag - Element tag name
 * @param {Object} [attributes={}] - Element attributes
 * @param {string|Element|Element[]} [content] - Element content
 * @returns {Element} - Created element
 */
function createElement(tag, attributes = {}, content) {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'style' && typeof value === 'object') {
      Object.entries(value).forEach(([prop, val]) => {
        element.style[prop] = val;
      });
    } else if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.entries(value).forEach(([prop, val]) => {
        element.dataset[prop] = val;
      });
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Add content
  if (content) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else if (content instanceof Element) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(child => {
        if (child instanceof Element) {
          element.appendChild(child);
        } else if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        }
      });
    }
  }
  
  return element;
}

/**
 * Add styles to page
 * @param {string} cssText - CSS text
 * @param {string} [id] - Style element ID
 * @returns {HTMLStyleElement} - Style element
 */
function addStyles(cssText, id) {
  // Remove existing style element if ID provided
  if (id) {
    const existingStyle = document.getElementById(id);
    if (existingStyle) {
      existingStyle.remove();
    }
  }
  
  const style = document.createElement('style');
  style.textContent = cssText;
  
  if (id) {
    style.id = id;
  }
  
  document.head.appendChild(style);
  return style;
}

/**
 * Find text in DOM
 * @param {string} text - Text to find
 * @param {Element} [context=document.body] - Context element
 * @param {Object} [options={}] - Options
 * @returns {Range[]} - Found ranges
 */
function findTextInDOM(text, context = document.body, options = {}) {
  const foundRanges = [];
  const exactMatch = options.exactMatch !== false;
  const maxResults = options.maxResults || 10;
  
  if (!text || text.length < 2) {
    return foundRanges;
  }
  
  // Create text walker
  const walker = document.createTreeWalker(
    context,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip if in UI elements
        const element = node.parentElement;
        if (element && (
          element.closest('.orkg-property-window, .orkg-property-selection-window, .orkg-highlight, .orkg-highlighted') ||
          element.tagName === 'SCRIPT' || 
          element.tagName === 'STYLE' ||
          element.tagName === 'NOSCRIPT'
        )) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Accept if text is contained in node
        const nodeText = node.textContent;
        if (exactMatch ? nodeText.includes(text) : nodeText.toLowerCase().includes(text.toLowerCase())) {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  // Find matching text nodes
  let node;
  while (foundRanges.length < maxResults && (node = walker.nextNode())) {
    const nodeText = node.textContent;
    let startIndex = 0;
    let currentIndex;
    
    // Find all occurrences in this node
    while (foundRanges.length < maxResults && 
           (currentIndex = exactMatch 
            ? nodeText.indexOf(text, startIndex)
            : nodeText.toLowerCase().indexOf(text.toLowerCase(), startIndex)) !== -1) {
      
      // Create range
      const range = document.createRange();
      range.setStart(node, currentIndex);
      range.setEnd(node, currentIndex + text.length);
      
      foundRanges.push(range);
      
      // Move to next potential match
      startIndex = currentIndex + 1;
    }
  }
  
  return foundRanges;
}

/**
 * Apply highlight to range
 * @param {Range} range - Range to highlight
 * @param {string} [color='#ffeb3b'] - Highlight color
 * @param {Object} [data={}] - Data to attach to highlight
 * @returns {Element} - Highlight element
 */
function highlightRange(range, color = '#ffeb3b', data = {}) {
  // Create highlight element
  const highlight = document.createElement('span');
  highlight.className = 'orkg-highlight orkg-highlighted';
  highlight.style.backgroundColor = color;
  highlight.dataset.highlightId = data.id || `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add data attributes
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object') {
      highlight.dataset[key] = JSON.stringify(value);
    } else {
      highlight.dataset[key] = value;
    }
  });
  
  // Apply highlight
  try {
    range.surroundContents(highlight);
    return highlight;
  } catch (error) {
    console.warn('Failed to highlight range:', error);
    return null;
  }
}

/**
 * Get element position and size
 * @param {Element} element - Element
 * @returns {Object} - Position and size
 */
function getElementRect(element) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom + window.scrollY,
    right: rect.right + window.scrollX
  };
}

/**
 * Check if element is visible
 * @param {Element} element - Element
 * @returns {boolean} - True if visible
 */
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  
  const rect = element.getBoundingClientRect();
  
  // Element has no size
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }
  
  // Element is outside viewport
  if (rect.right < 0 || rect.bottom < 0 || 
      rect.left > window.innerWidth || rect.top > window.innerHeight) {
    return false;
  }
  
  // Check if element is behind other elements
  const center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  const elementAtPoint = document.elementFromPoint(center.x, center.y);
  if (!elementAtPoint) {
    return false;
  }
  
  // Check if element or its parent is at point
  return element === elementAtPoint || element.contains(elementAtPoint) || elementAtPoint.contains(element);
}

{
  findElements,
  findElement,
  createElement,
  addStyles,
  findTextInDOM,
  highlightRange,
  getElementRect,
  isElementVisible
};
    } catch (error) {
      console.error('[utils/DOMUtils.js] Error:', error);
    }
  })();

  // ===== Module: utils/AnimationUtils.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/utils/AnimationUtils.js
// Utility functions for animations and visual effects
// used throughout the content script.
/**
 * Animation Utilities for ORKG Content Script
 * 
 * Collection of animation and visual effect functions
 */

/**
 * Generate bezier curve path points
 * @param {Object} start - Start point {x, y}
 * @param {Object} end - End point {x, y}
 * @param {number} [curvature=0.5] - Curvature factor
 * @param {number} [pointCount=20] - Number of points
 * @returns {Object[]} - Path points
 */
function generateBezierPath(start, end, curvature = 0.5, pointCount = 20) {
  // Calculate control points
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Adjust curvature based on distance
  const adjustedCurvature = Math.min(curvature, distance / 500);
  
  // Control point offset
  const cpx = Math.min(Math.abs(dx) * adjustedCurvature, 300);
  const cpy = Math.min(Math.abs(dy) * adjustedCurvature, 200);
  
  // Control points
  const cp1 = {
    x: start.x + cpx,
    y: start.y - cpy
  };
  
  const cp2 = {
    x: end.x - cpx,
    y: end.y - cpy
  };
  
  // Generate points along the curve
  const points = [];
  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount;
    const point = bezierPoint(start, cp1, cp2, end, t);
    points.push(point);
  }
  
  return points;
}

/**
 * Calculate point on cubic bezier curve
 * @param {Object} p0 - Start point
 * @param {Object} p1 - Control point 1
 * @param {Object} p2 - Control point 2
 * @param {Object} p3 - End point
 * @param {number} t - Parameter (0-1)
 * @returns {Object} - Point on curve
 * @private
 */
function bezierPoint(p0, p1, p2, p3, t) {
  const cX = 3 * (p1.x - p0.x);
  const bX = 3 * (p2.x - p1.x) - cX;
  const aX = p3.x - p0.x - cX - bX;
  
  const cY = 3 * (p1.y - p0.y);
  const bY = 3 * (p2.y - p1.y) - cY;
  const aY = p3.y - p0.y - cY - bY;
  
  const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
  const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;
  
  return { x, y };
}

/**
 * Create fly-to-extension animation
 * @param {Element} element - Source element
 * @param {Object} targetPos - Target position
 * @param {Object} [options={}] - Animation options
 * @returns {Promise<void>} - Resolves when animation completes
 */
function flyToExtension(element, targetPos, options = {}) {
  return new Promise((resolve) => {
    // Default options
    const opts = {
      duration: 800,
      curvature: 0.5,
      particleCount: 10,
      particleSize: 8,
      particleColor: '#2196F3',
      trail: true,
      explosion: true,
      ...options
    };
    
    // Get element position
    const rect = getElementRect(element);
    const startPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    // Ensure target position is valid
    const endPos = {
      x: targetPos.x || window.innerWidth - 50,
      y: targetPos.y || 100
    };
    
    // Generate path
    const path = generateBezierPath(startPos, endPos, opts.curvature);
    
    // Create particle container
    const container = document.createElement('div');
    container.className = 'orkg-animation-container';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';
    document.body.appendChild(container);
    
    // Create main particle
    const mainParticle = document.createElement('div');
    mainParticle.className = 'orkg-animation-particle main';
    mainParticle.style.cssText = `
      position:fixed;
      width:${opts.particleSize * 2}px;
      height:${opts.particleSize * 2}px;
      border-radius:50%;
      background-color:${opts.particleColor};
      box-shadow:0 0 10px 2px rgba(33,150,243,0.5);
      transform:translate(-50%, -50%);
      z-index:2147483647;
      pointer-events:none;
    `;
    container.appendChild(mainParticle);
    
    // Create trail particles if enabled
    const trailParticles = [];
    if (opts.trail) {
      for (let i = 0; i < opts.particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'orkg-animation-particle trail';
        particle.style.cssText = `
          position:fixed;
          width:${opts.particleSize}px;
          height:${opts.particleSize}px;
          border-radius:50%;
          background-color:${opts.particleColor};
          opacity:0.7;
          transform:translate(-50%, -50%) scale(0.5);
          z-index:2147483646;
          pointer-events:none;
        `;
        container.appendChild(particle);
        trailParticles.push(particle);
      }
    }
    
    // Animation variables
    let startTime = null;
    let animationFrame = null;
    
    // Animation function
    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / opts.duration, 1);
      
      // Get current position
      const pathIndex = Math.floor(progress * (path.length - 1));
      const currentPos = path[pathIndex];
      
      // Update main particle position
      mainParticle.style.left = `${currentPos.x}px`;
      mainParticle.style.top = `${currentPos.y}px`;
      
      // Update trail particles
      if (opts.trail) {
        trailParticles.forEach((particle, i) => {
          const trailIndex = Math.max(0, pathIndex - (i + 1) * 2);
          if (trailIndex >= 0 && trailIndex < path.length) {
            const trailPos = path[trailIndex];
            particle.style.left = `${trailPos.x}px`;
            particle.style.top = `${trailPos.y}px`;
            particle.style.opacity = 0.7 - (i / opts.particleCount) * 0.5;
          } else {
            particle.style.opacity = '0';
          }
        });
      }
      
      // Continue animation or end
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // End animation
        if (opts.explosion) {
          createExplosion(endPos, opts);
        }
        
        // Clean up
        setTimeout(() => {
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
          resolve();
        }, opts.explosion ? 500 : 0);
      }
    }
    
    // Start animation
    animationFrame = requestAnimationFrame(animate);
    
    // Cancel animation function (for cleanup)
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  });
}

/**
 * Create explosion effect
 * @param {Object} position - Position {x, y}
 * @param {Object} [options={}] - Effect options
 * @private
 */
function createExplosion(position, options = {}) {
  const opts = {
    particleCount: 10,
    particleSize: 6,
    particleColor: '#2196F3',
    duration: 500,
    ...options
  };
  
  // Create particles
  const particles = [];
  for (let i = 0; i < opts.particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'orkg-animation-particle explosion';
    particle.style.cssText = `
      position:fixed;
      left:${position.x}px;
      top:${position.y}px;
      width:${opts.particleSize}px;
      height:${opts.particleSize}px;
      border-radius:50%;
      background-color:${opts.particleColor};
      transform:translate(-50%, -50%);
      z-index:2147483646;
      pointer-events:none;
    `;
    document.body.appendChild(particle);
    particles.push(particle);
    
    // Set initial position
    const angle = (i / opts.particleCount) * Math.PI * 2;
    const distance = Math.random() * 50 + 20;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    
    // Animate
    particle.animate(
      [
        { 
          transform: 'translate(-50%, -50%) scale(1)',
          opacity: 1
        },
        { 
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`,
          opacity: 0
        }
      ],
      {
        duration: opts.duration,
        easing: 'ease-out',
        fill: 'forwards'
      }
    );
    
    // Clean up
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, opts.duration);
  }
}

{
  generateBezierPath,
  flyToExtension
};
    } catch (error) {
      console.error('[utils/AnimationUtils.js] Error:', error);
    }
  })();

  // ===== Module: utils/TextSearchUtility.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/utils/TextSearchUtility.js
// ================================

(function(global) {
    'use strict';
    
    /**
     * TextSearchUtility
     * 
     * A comprehensive utility for searching and finding text in the DOM.
     * Provides multiple search strategies from exact to fuzzy matching.
     * Follows SOLID principles with clear separation of concerns.
     */
    class TextSearchUtility {
        constructor(config = {}) {
            this.config = {
                minSearchLength: 10,
                maxSearchLength: 1000,
                fuzzySegmentLength: 40,
                fuzzySegmentOverlap: 20,
                normalizeWhitespace: true,
                caseSensitive: false,
                wholeWords: false,
                searchTimeout: 5000,
                ...config
            };
            
            // Cache for performance
            this.searchCache = new Map();
            this.textNodeCache = null;
            this.cacheTimeout = null;
            
            // Statistics
            this.stats = {
                searches: 0,
                hits: 0,
                misses: 0,
                cacheHits: 0
            };
        }
        
        // ================================
        // Main Search Methods
        // ================================
        
        /**
         * Find text in DOM with multiple strategies
         * @param {string} text - Text to search for
         * @param {Object} options - Search options
         * @returns {Range|null} DOM Range or null if not found
         */
        findText(text, options = {}) {
            if (!this.validateSearchText(text)) {
                return null;
            }
            
            this.stats.searches++;
            
            const searchOptions = { ...this.config, ...options };
            const cacheKey = this.getCacheKey(text, searchOptions);
            
            // Check cache first
            if (this.searchCache.has(cacheKey)) {
                this.stats.cacheHits++;
                this.stats.hits++;
                return this.searchCache.get(cacheKey);
            }
            
            // Try search strategies in order
            const strategies = [
                () => this.findExactText(text, searchOptions),
                () => options.section ? this.findTextInSection(text, options.section, options.sentenceIndex) : null,
                () => this.findWithNormalization(text, searchOptions),
                () => this.findWithFuzzyMatch(text, searchOptions),
                () => this.findPartialMatch(text, searchOptions)
            ];
            
            for (const strategy of strategies) {
                try {
                    const range = strategy();
                    if (range) {
                        this.stats.hits++;
                        this.cacheResult(cacheKey, range);
                        return range;
                    }
                } catch (error) {
                    console.debug('Search strategy failed:', error);
                }
            }
            
            this.stats.misses++;
            return null;
        }
        
        /**
         * Find exact text match in DOM
         * @param {string} text - Text to search for
         * @param {Object} options - Search options
         * @returns {Range|null} DOM Range or null
         */
        findExactText(text, options = {}) {
            const searchText = this.prepareSearchText(text, options);
            
            // Use browser's native find if available
            if (window.find && window.getSelection) {
                return this.findUsingWindowFind(searchText, options);
            }
            
            // Fallback to manual search
            return this.findUsingTreeWalker(searchText, options);
        }
        
        /**
         * Find text in a specific section
         * @param {string} text - Text to search for
         * @param {string} sectionName - Section name/identifier
         * @param {number} sentenceIndex - Optional sentence index within section
         * @returns {Range|null} DOM Range or null
         */
        findTextInSection(text, sectionName, sentenceIndex = null) {
            const sectionElements = this.findSectionElements(sectionName);
            
            for (const sectionEl of sectionElements) {
                const range = this.searchWithinElement(sectionEl, text, sentenceIndex);
                if (range) return range;
                
                // Also search in siblings until next section
                const range2 = this.searchUntilNextSection(sectionEl, text, sentenceIndex);
                if (range2) return range2;
            }
            
            return null;
        }
        
        /**
         * Find text with normalization (smart quotes, spaces, etc.)
         * @param {string} text - Text to search for
         * @param {Object} options - Search options
         * @returns {Range|null} DOM Range or null
         */
        findWithNormalization(text, options = {}) {
            const normalizedVariants = this.generateNormalizedVariants(text);
            
            for (const variant of normalizedVariants) {
                const range = this.findExactText(variant, options);
                if (range) return range;
            }
            
            return null;
        }
        
        /**
         * Find text with fuzzy matching
         * @param {string} text - Text to search for
         * @param {Object} options - Search options
         * @returns {Range|null} DOM Range or null
         */
        findWithFuzzyMatch(text, options = {}) {
            // For long text, try matching segments
            if (text.length > 60) {
                const segments = this.splitIntoSegments(
                    text, 
                    options.fuzzySegmentLength || this.config.fuzzySegmentLength,
                    options.fuzzySegmentOverlap || this.config.fuzzySegmentOverlap
                );
                
                for (const segment of segments) {
                    if (segment.length >= 15) {
                        const range = this.findExactText(segment, options);
                        if (range) {
                            // Try to expand to full text
                            return this.expandRangeToFullText(range, text) || range;
                        }
                    }
                }
            }
            
            return null;
        }
        
        /**
         * Find partial match (first part of text)
         * @param {string} text - Text to search for
         * @param {Object} options - Search options
         * @returns {Range|null} DOM Range or null
         */
        findPartialMatch(text, options = {}) {
            const minLength = 20;
            const maxLength = 60;
            
            if (text.length < minLength) {
                return null;
            }
            
            // Try progressively shorter prefixes
            for (let length = Math.min(maxLength, text.length); length >= minLength; length -= 10) {
                const prefix = text.substring(0, length).trim();
                const range = this.findExactText(prefix, options);
                if (range) {
                    return range;
                }
            }
            
            return null;
        }
        
        // ================================
        // Search Implementation Methods
        // ================================
        
        /**
         * Find using browser's window.find API
         * @private
         */
        findUsingWindowFind(text, options) {
            // Save current selection
            const selection = window.getSelection();
            const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
            
            // Clear selection
            selection.removeAllRanges();
            
            try {
                // Perform search
                const found = window.find(
                    text,
                    options.caseSensitive || false,
                    false, // backwards
                    options.wholeWords || false,
                    false, // wrap
                    true,  // search in frames
                    false  // show dialog
                );
                
                if (found) {
                    const range = selection.getRangeAt(0).cloneRange();
                    return range;
                }
            } finally {
                // Restore selection
                selection.removeAllRanges();
                if (savedRange) {
                    selection.addRange(savedRange);
                }
            }
            
            return null;
        }
        
        /**
         * Find using TreeWalker API
         * @private
         */
        findUsingTreeWalker(text, options) {
            const textNodes = this.getTextNodes();
            const searchText = options.caseSensitive ? text : text.toLowerCase();
            
            for (const node of textNodes) {
                const nodeText = options.caseSensitive ? node.textContent : node.textContent.toLowerCase();
                const index = nodeText.indexOf(searchText);
                
                if (index !== -1) {
                    const range = document.createRange();
                    range.setStart(node, index);
                    range.setEnd(node, index + text.length);
                    return range;
                }
            }
            
            return null;
        }
        
        /**
         * Search within a specific element
         * @private
         */
        searchWithinElement(element, text, sentenceIndex = null) {
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                    }
                }
            );
            
            let node;
            let sentenceCount = 0;
            
            while (node = walker.nextNode()) {
                // If looking for specific sentence index
                if (sentenceIndex !== null) {
                    const sentences = this.extractSentences(node.textContent);
                    for (const sentence of sentences) {
                        if (sentenceCount === sentenceIndex && sentence.includes(text)) {
                            return this.createRangeForText(node, text);
                        }
                        sentenceCount++;
                    }
                } else if (node.textContent.includes(text)) {
                    return this.createRangeForText(node, text);
                }
            }
            
            return null;
        }
        
        /**
         * Search from element until next section
         * @private
         */
        searchUntilNextSection(startElement, text, sentenceIndex = null) {
            let current = startElement.nextElementSibling;
            const sectionTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION', 'ARTICLE'];
            
            while (current && !sectionTags.includes(current.tagName)) {
                const range = this.searchWithinElement(current, text, sentenceIndex);
                if (range) return range;
                current = current.nextElementSibling;
            }
            
            return null;
        }
        
        // ================================
        // Helper Methods
        // ================================
        
        /**
         * Find section elements by name
         * @private
         */
        findSectionElements(sectionName) {
            const elements = [];
            const normalizedSection = sectionName.toLowerCase();
            
            // Try different strategies to find sections
            const strategies = [
                // Headers containing section name
                () => Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(
                    el => el.textContent.toLowerCase().includes(normalizedSection)
                ),
                // Elements with section-related classes
                () => Array.from(document.querySelectorAll('[class*="section"]')).filter(
                    el => el.textContent.toLowerCase().includes(normalizedSection)
                ),
                // Elements with IDs based on section name
                () => {
                    const id = normalizedSection.replace(/\s+/g, '-');
                    return Array.from(document.querySelectorAll(`[id*="${id}"]`));
                },
                // ARIA labels
                () => Array.from(document.querySelectorAll('[aria-label]')).filter(
                    el => el.getAttribute('aria-label').toLowerCase().includes(normalizedSection)
                )
            ];
            
            for (const strategy of strategies) {
                const found = strategy();
                if (found.length > 0) {
                    elements.push(...found);
                }
            }
            
            // Remove duplicates
            return [...new Set(elements)];
        }
        
        /**
         * Create a Range for text within a node
         * @private
         */
        createRangeForText(node, text) {
            const index = node.textContent.indexOf(text);
            if (index === -1) return null;
            
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + text.length);
            return range;
        }
        
        /**
         * Get all text nodes in document
         * @private
         */
        getTextNodes(root = document.body) {
            // Use cache if available and recent
            if (this.textNodeCache && this.cacheTimeout) {
                return this.textNodeCache;
            }
            
            const textNodes = [];
            const walker = document.createTreeWalker(
                root,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        // Skip empty nodes and script/style content
                        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                        if (node.parentElement.tagName === 'SCRIPT' || 
                            node.parentElement.tagName === 'STYLE') {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            
            // Cache for 5 seconds
            this.textNodeCache = textNodes;
            this.cacheTimeout = setTimeout(() => {
                this.textNodeCache = null;
                this.cacheTimeout = null;
            }, 5000);
            
            return textNodes;
        }
        
        /**
         * Split text into overlapping segments
         * @private
         */
        splitIntoSegments(text, segmentLength, overlap) {
            const segments = [];
            let start = 0;
            
            while (start < text.length) {
                const end = Math.min(start + segmentLength, text.length);
                const segment = text.substring(start, end).trim();
                if (segment) {
                    segments.push(segment);
                }
                start += segmentLength - overlap;
                
                // Prevent infinite loop
                if (start <= 0) break;
            }
            
            return segments;
        }
        
        /**
         * Generate normalized text variants
         * @private
         */
        generateNormalizedVariants(text) {
            const variants = new Set([text]);
            
            // Replace smart quotes
            variants.add(text
                .replace(/[\u2018\u2019]/g, "'")
                .replace(/[\u201C\u201D]/g, '"')
            );
            
            // Normalize whitespace
            variants.add(text.replace(/\s+/g, ' ').trim());
            
            // Remove punctuation
            variants.add(text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim());
            
            // Handle hyphenation
            variants.add(text.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2'));
            
            // Handle line breaks
            variants.add(text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
            
            return Array.from(variants);
        }
        
        /**
         * Expand a range to include full text
         * @private
         */
        expandRangeToFullText(range, fullText) {
            try {
                const container = range.commonAncestorContainer;
                const containerText = container.textContent;
                const rangeText = range.toString();
                
                // Find where the range text appears in the full text
                const indexInFull = fullText.indexOf(rangeText);
                if (indexInFull === -1) return null;
                
                // Calculate how much to expand
                const prefixLength = indexInFull;
                const suffixLength = fullText.length - (indexInFull + rangeText.length);
                
                // Try to expand the range
                const startOffset = Math.max(0, range.startOffset - prefixLength);
                const endOffset = Math.min(containerText.length, range.endOffset + suffixLength);
                
                const expandedRange = document.createRange();
                expandedRange.setStart(range.startContainer, startOffset);
                expandedRange.setEnd(range.endContainer, endOffset);
                
                // Verify the expanded range contains the full text
                if (expandedRange.toString().includes(fullText)) {
                    return expandedRange;
                }
            } catch (error) {
                console.debug('Could not expand range:', error);
            }
            
            return null;
        }
        
        /**
         * Extract sentences from text
         * @private
         */
        extractSentences(text) {
            // Simple sentence splitting - can be improved with NLP
            return text.match(/[^.!?]+[.!?]+/g) || [text];
        }
        
        /**
         * Prepare search text based on options
         * @private
         */
        prepareSearchText(text, options) {
            let prepared = text;
            
            if (options.normalizeWhitespace) {
                prepared = prepared.replace(/\s+/g, ' ').trim();
            }
            
            return prepared;
        }
        
        /**
         * Validate search text
         * @private
         */
        validateSearchText(text) {
            if (!text || typeof text !== 'string') {
                console.warn('Invalid search text: must be a non-empty string');
                return false;
            }
            
            if (text.length < this.config.minSearchLength) {
                console.warn(`Search text too short (min: ${this.config.minSearchLength})`);
                return false;
            }
            
            if (text.length > this.config.maxSearchLength) {
                console.warn(`Search text too long (max: ${this.config.maxSearchLength})`);
                return false;
            }
            
            return true;
        }
        
        /**
         * Generate cache key for search
         * @private
         */
        getCacheKey(text, options) {
            return `${text}_${JSON.stringify(options)}`;
        }
        
        /**
         * Cache search result
         * @private
         */
        cacheResult(key, range) {
            // Limit cache size
            if (this.searchCache.size > 100) {
                const firstKey = this.searchCache.keys().next().value;
                this.searchCache.delete(firstKey);
            }
            
            this.searchCache.set(key, range);
        }
        
        // ================================
        // Public API Methods
        // ================================
        
        /**
         * Clear all caches
         */
        clearCache() {
            this.searchCache.clear();
            this.textNodeCache = null;
            if (this.cacheTimeout) {
                clearTimeout(this.cacheTimeout);
                this.cacheTimeout = null;
            }
        }
        
        /**
         * Get search statistics
         */
        getStats() {
            return {
                ...this.stats,
                hitRate: this.stats.searches > 0 
                    ? (this.stats.hits / this.stats.searches * 100).toFixed(2) + '%'
                    : '0%',
                cacheHitRate: this.stats.hits > 0
                    ? (this.stats.cacheHits / this.stats.hits * 100).toFixed(2) + '%'
                    : '0%'
            };
        }
        
        /**
         * Reset statistics
         */
        resetStats() {
            this.stats = {
                searches: 0,
                hits: 0,
                misses: 0,
                cacheHits: 0
            };
        }
        
        /**
         * Update configuration
         */
        updateConfig(config) {
            this.config = { ...this.config, ...config };
            this.clearCache();
        }
    }
    
    // Create singleton instance
    const textSearchUtility = new TextSearchUtility();
    
    // Export to global scope
    global.TextSearchUtility = TextSearchUtility;
    global.textSearchUtility = textSearchUtility;
    
    console.log('📚 TextSearchUtility loaded and ready');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[utils/TextSearchUtility.js] Error:', error);
    }
  })();

  // ===== Module: validators/ImageValidator.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/core/content/validators/ImageValidator.js
// Smart validation module following SOLID principles
// ================================

class ImageValidator {
    constructor(config = {}) {
        this.config = {
            minWidth: 50,
            minHeight: 50,
            maxWidth: 10000,
            maxHeight: 10000,
            minAspectRatio: 0.1,
            maxAspectRatio: 10,
            minFileSize: 1024, // 1KB
            maxFileSize: 50 * 1024 * 1024, // 50MB
            allowedTypes: ['image', 'figure', 'chart', 'graph', 'diagram', 'svg', 'canvas'],
            excludePatterns: [
                'logo', 'icon', 'button', 'avatar', 'thumbnail', 
                'sprite', 'emoji', 'badge', 'banner', 'ad'
            ],
            scientificPatterns: [
                'figure', 'fig', 'chart', 'graph', 'plot', 'diagram',
                'table', 'scheme', 'illustration', 'data', 'result'
            ],
            ...config
        };
        
        this.validationRules = new Map();
        this.setupDefaultRules();
    }
    
    async init() {
        console.log('✅ ImageValidator initialized');
    }
    
    /**
     * Setup default validation rules
     */
    setupDefaultRules() {
        // Dimension rules
        this.addRule('dimensions', (image) => {
            const dims = image.dimensions;
            if (!dims) return { valid: false, reason: 'No dimensions available' };
            
            if (dims.width < this.config.minWidth || dims.height < this.config.minHeight) {
                return { 
                    valid: false, 
                    reason: `Image too small (${dims.width}x${dims.height})` 
                };
            }
            
            if (dims.width > this.config.maxWidth || dims.height > this.config.maxHeight) {
                return { 
                    valid: false, 
                    reason: `Image too large (${dims.width}x${dims.height})` 
                };
            }
            
            const aspectRatio = dims.width / dims.height;
            if (aspectRatio < this.config.minAspectRatio || aspectRatio > this.config.maxAspectRatio) {
                return { 
                    valid: false, 
                    reason: `Invalid aspect ratio (${aspectRatio.toFixed(2)})` 
                };
            }
            
            return { valid: true };
        });
        
        // Visibility rules
        this.addRule('visibility', (image) => {
            if (image.visibility && !image.visibility.isVisible) {
                return { valid: false, reason: 'Image is not visible' };
            }
            return { valid: true };
        });
        
        // Source validation
        this.addRule('source', (image) => {
            if (!image.src && image.type !== 'canvas') {
                return { valid: false, reason: 'No image source' };
            }
            
            // Check for data URLs if configured
            if (image.src && image.src.startsWith('data:')) {
                if (!this.config.includeDataUrls) {
                    return { valid: false, reason: 'Data URLs not allowed' };
                }
            }
            
            return { valid: true };
        });
        
        // Content type validation
        this.addRule('contentType', (image) => {
            // Check for excluded patterns
            const textToCheck = `${image.src || ''} ${image.alt || ''} ${image.context?.label || ''}`.toLowerCase();
            
            for (const pattern of this.config.excludePatterns) {
                if (textToCheck.includes(pattern)) {
                    return { 
                        valid: false, 
                        reason: `Excluded pattern detected: ${pattern}` 
                    };
                }
            }
            
            return { valid: true };
        });
        
        // Scientific relevance
        this.addRule('scientific', (image) => {
            // Check if it's in a scientific container
            if (image.context?.figureId || image.context?.inMainContent) {
                return { valid: true };
            }
            
            // Check for scientific patterns
            const textToCheck = `${image.alt || ''} ${image.title || ''} ${image.context?.label || ''} ${image.context?.caption || ''}`.toLowerCase();
            
            const hasScientificPattern = this.config.scientificPatterns.some(pattern => 
                textToCheck.includes(pattern)
            );
            
            if (!hasScientificPattern && image.dimensions) {
                // Small images without scientific context are likely UI elements
                if (image.dimensions.width < 100 && image.dimensions.height < 100) {
                    return { 
                        valid: false, 
                        reason: 'Small image without scientific context' 
                    };
                }
            }
            
            return { valid: true };
        });
        
        // Duplicate detection
        this.addRule('duplicate', (image, context) => {
            if (context && context.processedSources) {
                if (context.processedSources.has(image.src)) {
                    return { valid: false, reason: 'Duplicate image' };
                }
            }
            return { valid: true };
        });
    }
    
    /**
     * Add custom validation rule
     */
    addRule(name, validator) {
        this.validationRules.set(name, validator);
    }
    
    /**
     * Remove validation rule
     */
    removeRule(name) {
        this.validationRules.delete(name);
    }
    
    /**
     * Validate an image
     */
    validate(image, context = {}) {
        const results = {
            valid: true,
            errors: [],
            warnings: [],
            score: 1.0
        };
        
        // Run all validation rules
        for (const [ruleName, validator] of this.validationRules) {
            try {
                const result = validator(image, context);
                
                if (!result.valid) {
                    results.valid = false;
                    results.errors.push({
                        rule: ruleName,
                        reason: result.reason || 'Validation failed'
                    });
                    results.score *= 0.5; // Reduce score for each error
                } else if (result.warning) {
                    results.warnings.push({
                        rule: ruleName,
                        reason: result.warning
                    });
                    results.score *= 0.9; // Slightly reduce score for warnings
                }
            } catch (error) {
                console.warn(`Validation rule '${ruleName}' failed:`, error);
                results.warnings.push({
                    rule: ruleName,
                    reason: `Rule execution failed: ${error.message}`
                });
            }
        }
        
        return results;
    }
    
    /**
     * Batch validate multiple images
     */
    validateBatch(images) {
        const processedSources = new Set();
        const context = { processedSources };
        
        return images.map(image => {
            const result = this.validate(image, context);
            if (result.valid && image.src) {
                processedSources.add(image.src);
            }
            return {
                image,
                validation: result
            };
        });
    }
    
    /**
     * Check if image is scientific figure
     */
    isScientificFigure(image) {
        // Check for figure container
        if (image.context?.figureId) {
            return { isScientific: true, confidence: 0.9 };
        }
        
        // Check for scientific keywords in caption/label
        const text = `${image.context?.label || ''} ${image.context?.caption || ''}`.toLowerCase();
        
        const scientificKeywords = [
            'figure', 'fig.', 'table', 'chart', 'graph', 'plot',
            'diagram', 'scheme', 'illustration', 'panel',
            'supplementary', 'appendix'
        ];
        
        const keywordMatches = scientificKeywords.filter(kw => text.includes(kw)).length;
        
        if (keywordMatches > 0) {
            return { 
                isScientific: true, 
                confidence: Math.min(0.5 + (keywordMatches * 0.2), 1.0) 
            };
        }
        
        // Check dimensions (scientific figures are usually larger)
        if (image.dimensions && image.dimensions.width >= 300 && image.dimensions.height >= 200) {
            return { isScientific: true, confidence: 0.3 };
        }
        
        return { isScientific: false, confidence: 0 };
    }
    
    /**
     * Classify image type
     */
    classifyImageType(image) {
        const text = `${image.alt || ''} ${image.title || ''} ${image.context?.label || ''} ${image.context?.caption || ''}`.toLowerCase();
        
        const typePatterns = {
            'chart': ['chart', 'bar', 'pie', 'line chart', 'scatter'],
            'graph': ['graph', 'plot', 'curve', 'axis', 'trend'],
            'diagram': ['diagram', 'schematic', 'flowchart', 'workflow', 'architecture'],
            'photo': ['photo', 'photograph', 'image of', 'picture of', 'microscopy'],
            'illustration': ['illustration', 'drawing', 'sketch', 'artistic'],
            'table': ['table'],
            'equation': ['equation', 'formula', 'mathematical'],
            'map': ['map', 'geographic', 'location'],
            'screenshot': ['screenshot', 'screen capture', 'interface']
        };
        
        for (const [type, patterns] of Object.entries(typePatterns)) {
            if (patterns.some(pattern => text.includes(pattern))) {
                return type;
            }
        }
        
        // Check file extension if available
        if (image.src) {
            const extension = image.src.split('.').pop()?.toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
                return 'photo';
            }
            if (extension === 'svg') {
                return 'diagram';
            }
        }
        
        return 'figure'; // Default type
    }
    
    /**
     * Calculate quality score
     */
    calculateQualityScore(image) {
        let score = 0;
        const factors = [];
        
        // Dimension quality (25%)
        if (image.dimensions) {
            const area = image.dimensions.width * image.dimensions.height;
            if (area >= 160000) { // 400x400
                score += 0.25;
                factors.push('Good resolution');
            } else if (area >= 40000) { // 200x200
                score += 0.15;
                factors.push('Acceptable resolution');
            } else {
                score += 0.05;
                factors.push('Low resolution');
            }
        }
        
        // Caption quality (25%)
        if (image.context?.caption || image.context?.label) {
            const captionLength = (image.context.caption || image.context.label).length;
            if (captionLength > 50) {
                score += 0.25;
                factors.push('Detailed caption');
            } else if (captionLength > 10) {
                score += 0.15;
                factors.push('Basic caption');
            } else {
                score += 0.05;
                factors.push('Minimal caption');
            }
        }
        
        // Alt text quality (20%)
        if (image.alt && image.alt.length > 10) {
            score += 0.20;
            factors.push('Has alt text');
        }
        
        // Scientific relevance (30%)
        const scientific = this.isScientificFigure(image);
        if (scientific.isScientific) {
            score += 0.30 * scientific.confidence;
            factors.push(`Scientific figure (${Math.round(scientific.confidence * 100)}% confidence)`);
        }
        
        return {
            score: Math.min(score, 1.0),
            factors
        };
    }
    
    /**
     * Get validation statistics
     */
    getStatistics(validationResults) {
        const total = validationResults.length;
        const valid = validationResults.filter(r => r.validation.valid).length;
        const invalid = total - valid;
        
        const errorTypes = {};
        const warningTypes = {};
        
        validationResults.forEach(result => {
            result.validation.errors.forEach(error => {
                errorTypes[error.rule] = (errorTypes[error.rule] || 0) + 1;
            });
            
            result.validation.warnings.forEach(warning => {
                warningTypes[warning.rule] = (warningTypes[warning.rule] || 0) + 1;
            });
        });
        
        return {
            total,
            valid,
            invalid,
            validPercentage: total > 0 ? (valid / total * 100).toFixed(1) : 0,
            errorTypes,
            warningTypes,
            averageScore: validationResults.reduce((sum, r) => sum + r.validation.score, 0) / total
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.setupDefaultRules(); // Recreate rules with new config
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.validationRules.clear();
        console.log('🧹 ImageValidator cleanup completed');
    }
}
    } catch (error) {
      console.error('[validators/ImageValidator.js] Error:', error);
    }
  })();

  // ===== Module: animations/AnimationCore.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/animations/AnimationCore.js
// Core animation utilities and easing functions
// ================================

(function(global) {
    'use strict';
    
    const AnimationCore = {
        // ================================
        // Configuration
        // ================================
        
        config: {
            defaultDuration: 800,
            defaultEasing: 'easeInOutCubic',
            frameRate: 60,
            animationClass: 'orkg-animating'
        },
        
        // ================================
        // Easing Functions
        // ================================
        
        easings: {
            linear: function(t) {
                return t;
            },
            
            easeInQuad: function(t) {
                return t * t;
            },
            
            easeOutQuad: function(t) {
                return t * (2 - t);
            },
            
            easeInOutQuad: function(t) {
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            },
            
            easeInCubic: function(t) {
                return t * t * t;
            },
            
            easeOutCubic: function(t) {
                return (--t) * t * t + 1;
            },
            
            easeInOutCubic: function(t) {
                return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            },
            
            easeInQuart: function(t) {
                return t * t * t * t;
            },
            
            easeOutQuart: function(t) {
                return 1 - (--t) * t * t * t;
            },
            
            easeInOutQuart: function(t) {
                return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
            },
            
            easeInExpo: function(t) {
                return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
            },
            
            easeOutExpo: function(t) {
                return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            },
            
            easeInOutExpo: function(t) {
                if (t === 0) return 0;
                if (t === 1) return 1;
                if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
                return (2 - Math.pow(2, -20 * t + 10)) / 2;
            },
            
            easeInBack: function(t) {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return c3 * t * t * t - c1 * t * t;
            },
            
            easeOutBack: function(t) {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            },
            
            easeInOutBack: function(t) {
                const c1 = 1.70158;
                const c2 = c1 * 1.525;
                return t < 0.5
                    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
                    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
            },
            
            elasticOut: function(t) {
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 :
                    Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            },
            
            bounceOut: function(t) {
                const n1 = 7.5625;
                const d1 = 2.75;
                
                if (t < 1 / d1) {
                    return n1 * t * t;
                } else if (t < 2 / d1) {
                    return n1 * (t -= 1.5 / d1) * t + 0.75;
                } else if (t < 2.5 / d1) {
                    return n1 * (t -= 2.25 / d1) * t + 0.9375;
                } else {
                    return n1 * (t -= 2.625 / d1) * t + 0.984375;
                }
            }
        },
        
        // ================================
        // Position and Geometry
        // ================================
        
        getElementPosition: function(element) {
            const rect = element.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height
            };
        },
        
        getExtensionPosition: function() {
            // Try to find extension panel
            const panel = document.querySelector(
                '.orkg-extension-panel, #orkg-panel, .orkg-analyzer, .popup-container'
            );
            
            if (panel) {
                const rect = panel.getBoundingClientRect();
                return {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
            }
            
            // Default to top-right corner
            return {
                x: window.innerWidth - 50,
                y: 50
            };
        },
        
        calculateDistance: function(p1, p2) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        
        calculateAngle: function(p1, p2) {
            return Math.atan2(p2.y - p1.y, p2.x - p1.x);
        },
        
        // ================================
        // Path Calculations
        // ================================
        
        calculateBezierPath: function(start, end, curveHeight) {
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2 - (curveHeight || 100);
            
            return {
                start: start,
                control1: { x: midX, y: midY },
                control2: { x: midX, y: midY },
                end: end
            };
        },
        
        getPointOnBezier: function(t, p0, p1, p2, p3) {
            const u = 1 - t;
            const tt = t * t;
            const uu = u * u;
            const uuu = uu * u;
            const ttt = tt * t;
            
            const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
            const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
            
            return { x, y };
        },
        
        // ================================
        // Animation Engine
        // ================================
        
        animate: function(options) {
            const {
                duration = this.config.defaultDuration,
                easing = this.config.defaultEasing,
                onUpdate,
                onComplete,
                onStart
            } = options;
            
            const easingFunction = typeof easing === 'function' 
                ? easing 
                : this.easings[easing] || this.easings.linear;
            
            const startTime = performance.now();
            let animationId = null;
            
            if (onStart) onStart();
            
            const tick = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easingFunction(progress);
                
                if (onUpdate) onUpdate(easedProgress, progress);
                
                if (progress < 1) {
                    animationId = requestAnimationFrame(tick);
                } else {
                    if (onComplete) onComplete();
                }
            };
            
            animationId = requestAnimationFrame(tick);
            
            // Return cancel function
            return function cancel() {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
            };
        },
        
        // ================================
        // CSS Animation Helpers
        // ================================
        
        addCSSAnimation: function(element, animationName, duration, options = {}) {
            const {
                delay = 0,
                easing = 'ease',
                fillMode = 'forwards',
                iterationCount = 1
            } = options;
            
            element.style.animation = `${animationName} ${duration}ms ${easing} ${delay}ms ${iterationCount} ${fillMode}`;
            
            return new Promise((resolve) => {
                const handleEnd = () => {
                    element.removeEventListener('animationend', handleEnd);
                    resolve();
                };
                element.addEventListener('animationend', handleEnd);
            });
        },
        
        removeCSSAnimation: function(element) {
            element.style.animation = '';
        },
        
        // ================================
        // Transform Utilities
        // ================================
        
        setTransform: function(element, transforms) {
            const transformString = Object.entries(transforms)
                .map(([key, value]) => {
                    switch (key) {
                        case 'x':
                            return `translateX(${value}px)`;
                        case 'y':
                            return `translateY(${value}px)`;
                        case 'scale':
                            return `scale(${value})`;
                        case 'rotate':
                            return `rotate(${value}deg)`;
                        case 'scaleX':
                            return `scaleX(${value})`;
                        case 'scaleY':
                            return `scaleY(${value})`;
                        default:
                            return '';
                    }
                })
                .filter(t => t)
                .join(' ');
            
            element.style.transform = transformString;
        },
        
        // ================================
        // Visibility and Cloning
        // ================================
        
        createClone: function(element, options = {}) {
            const {
                preserveStyles = true,
                className = 'orkg-clone',
                position = 'fixed'
            } = options;
            
            const rect = element.getBoundingClientRect();
            const clone = element.cloneNode(true);
            
            clone.className = className;
            clone.style.position = position;
            clone.style.left = rect.left + 'px';
            clone.style.top = rect.top + 'px';
            clone.style.width = rect.width + 'px';
            clone.style.height = rect.height + 'px';
            clone.style.margin = '0';
            clone.style.zIndex = '999999';
            clone.style.pointerEvents = 'none';
            
            if (preserveStyles) {
                const computedStyles = window.getComputedStyle(element);
                clone.style.cssText += computedStyles.cssText;
            }
            
            return clone;
        },
        
        // ================================
        // Keyframe Management
        // ================================
        
        injectKeyframes: function(name, keyframes) {
            const styleId = `orkg-keyframes-${name}`;
            
            // Check if already exists
            if (document.getElementById(styleId)) {
                return;
            }
            
            const style = document.createElement('style');
            style.id = styleId;
            
            let keyframeString = `@keyframes ${name} {\n`;
            
            Object.entries(keyframes).forEach(([key, value]) => {
                keyframeString += `  ${key} {\n`;
                Object.entries(value).forEach(([prop, val]) => {
                    const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                    keyframeString += `    ${cssProp}: ${val};\n`;
                });
                keyframeString += '  }\n';
            });
            
            keyframeString += '}';
            
            style.textContent = keyframeString;
            document.head.appendChild(style);
        },
        
        removeKeyframes: function(name) {
            const styleId = `orkg-keyframes-${name}`;
            const style = document.getElementById(styleId);
            if (style) {
                style.remove();
            }
        },
        
        // ================================
        // Utility Functions
        // ================================
        
        lerp: function(start, end, progress) {
            return start + (end - start) * progress;
        },
        
        clamp: function(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },
        
        randomInRange: function(min, max) {
            return Math.random() * (max - min) + min;
        },
        
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        throttle: function(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    };
    
    // Export to global scope
    global.AnimationCore = AnimationCore;
    
    console.log('🎬 AnimationCore utilities loaded');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[animations/AnimationCore.js] Error:', error);
    }
  })();

  // ===== Module: animations/FlyAnimation.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/animations/FlyAnimation.js
// Fly-to-extension animation with particle effects
// ================================

(function(global) {
    'use strict';
    
    // Check for AnimationCore dependency
    const AnimationCore = global.AnimationCore || {};
    
    const FlyAnimation = {
        // ================================
        // Configuration
        // ================================
        
        config: {
            duration: 800,
            curveHeight: 100,
            particleCount: 15,
            trailCount: 5,
            particleColors: ['#e86161', '#FF6B6B', '#FF8A8A'],
            defaultColor: '#e86161',
            cloneOpacity: 0.9,
            endScale: 0.2,
            rotationAmount: 360
        },
        
        // ================================
        // Main Animation Method
        // ================================
        
        flyToExtension: function(element, data, options = {}) {
            return new Promise((resolve) => {
                // Merge options with defaults
                const config = Object.assign({}, this.config, options);
                
                // Get positions
                const startPos = this.getElementPosition(element);
                const endPos = this.getExtensionPosition();
                
                // Create visual elements
                const clone = this.createAnimationClone(element, data, config);
                const particles = this.createParticles(startPos, config);
                const trails = this.createTrails(clone, config);
                
                // Add elements to DOM
                document.body.appendChild(clone);
                particles.forEach(p => document.body.appendChild(p));
                trails.forEach(t => document.body.appendChild(t));
                
                // Start animations
                this.animateElement(clone, startPos, endPos, config);
                this.animateParticles(particles, startPos, endPos, config);
                this.animateTrails(trails, startPos, endPos, config);
                
                // Create arrival effect
                setTimeout(() => {
                    this.createArrivalEffect(endPos, config);
                }, config.duration - 100);
                
                // Cleanup
                setTimeout(() => {
                    clone.remove();
                    particles.forEach(p => p.remove());
                    trails.forEach(t => t.remove());
                    resolve();
                }, config.duration + 200);
            });
        },
        
        // ================================
        // Element Creation
        // ================================
        
        createAnimationClone: function(element, data, config) {
            const rect = element.getBoundingClientRect();
            const clone = document.createElement('div');
            
            clone.className = 'orkg-fly-clone';
            clone.style.cssText = `
                position: fixed !important;
                left: ${rect.left}px !important;
                top: ${rect.top}px !important;
                width: ${rect.width}px !important;
                height: ${rect.height}px !important;
                z-index: 100000 !important;
                pointer-events: none !important;
                opacity: ${config.cloneOpacity} !important;
                will-change: transform, opacity !important;
            `;
            
            // Handle different element types
            if (element.tagName === 'IMG') {
                const img = document.createElement('img');
                img.src = element.src;
                img.style.cssText = `
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 8px !important;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
                `;
                clone.appendChild(img);
            } else if (element.tagName === 'TABLE') {
                clone.style.background = 'white !important';
                clone.style.borderRadius = '8px !important';
                clone.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3) !important';
                clone.style.overflow = 'hidden !important';
                
                // Add table icon
                const icon = document.createElement('div');
                icon.innerHTML = '📊';
                icon.style.cssText = `
                    font-size: 32px !important;
                    text-align: center !important;
                    line-height: ${rect.height}px !important;
                `;
                clone.appendChild(icon);
            } else {
                // Text or generic element
                clone.style.background = `linear-gradient(135deg, ${config.defaultColor} 0%, ${config.particleColors[1]} 100%) !important`;
                clone.style.borderRadius = '8px !important';
                clone.style.boxShadow = '0 10px 30px rgba(232, 97, 97, 0.3) !important';
                clone.style.padding = '8px !important';
                clone.style.color = 'white !important';
                clone.style.fontSize = '14px !important;';
                clone.style.display = 'flex !important';
                clone.style.alignItems = 'center !important';
                clone.style.justifyContent = 'center !important';
                
                // Add text preview
                if (data && data.text) {
                    clone.textContent = data.text.substring(0, 50) + (data.text.length > 50 ? '...' : '');
                } else {
                    clone.innerHTML = '📄';
                }
            }
            
            return clone;
        },
        
        createParticles: function(position, config) {
            const particles = [];
            
            for (let i = 0; i < config.particleCount; i++) {
                const particle = document.createElement('div');
                const color = config.particleColors[i % config.particleColors.length];
                const size = 4 + Math.random() * 6;
                const offsetX = (Math.random() - 0.5) * 20;
                const offsetY = (Math.random() - 0.5) * 20;
                
                particle.className = 'orkg-particle';
                particle.style.cssText = `
                    position: fixed !important;
                    left: ${position.x + offsetX}px !important;
                    top: ${position.y + offsetY}px !important;
                    width: ${size}px !important;
                    height: ${size}px !important;
                    background: ${color} !important;
                    border-radius: 50% !important;
                    z-index: 99999 !important;
                    pointer-events: none !important;
                    opacity: 0.8 !important;
                    box-shadow: 0 0 ${size}px ${color} !important;
                    will-change: transform, opacity !important;
                `;
                
                particles.push(particle);
            }
            
            return particles;
        },
        
        createTrails: function(element, config) {
            const trails = [];
            const rect = element.getBoundingClientRect();
            
            for (let i = 0; i < config.trailCount; i++) {
                const trail = element.cloneNode(true);
                trail.className = 'orkg-trail';
                trail.style.cssText = element.style.cssText;
                trail.style.opacity = (0.3 - i * 0.05).toString();
                trail.style.zIndex = (99998 - i).toString();
                trail.style.filter = `blur(${i * 2}px)`;
                trails.push(trail);
            }
            
            return trails;
        },
        
        // ================================
        // Animation Methods
        // ================================
        
        animateElement: function(element, start, end, config) {
            const startX = start.x - parseFloat(element.style.width) / 2;
            const startY = start.y - parseFloat(element.style.height) / 2;
            const endX = end.x;
            const endY = end.y;
            
            if (AnimationCore.animate) {
                AnimationCore.animate({
                    duration: config.duration,
                    easing: 'easeInOutCubic',
                    onUpdate: (progress) => {
                        // Calculate position on curved path
                        const currentX = this.lerp(startX, endX, progress);
                        const currentY = this.lerp(startY, endY, progress) - 
                                       Math.sin(progress * Math.PI) * config.curveHeight;
                        
                        // Apply transformations
                        element.style.left = currentX + 'px';
                        element.style.top = currentY + 'px';
                        element.style.transform = `scale(${1 - progress * (1 - config.endScale)}) rotate(${progress * config.rotationAmount}deg)`;
                        element.style.opacity = (1 - progress * 0.3).toString();
                    }
                });
            } else {
                // Fallback animation
                this.fallbackAnimate(element, startX, startY, endX, endY, config);
            }
        },
        
        animateParticles: function(particles, start, end, config) {
            particles.forEach((particle, i) => {
                const delay = i * 30;
                const angle = (i / particles.length) * Math.PI * 2;
                const radius = 50 + Math.random() * 50;
                
                setTimeout(() => {
                    // Mid-point with spread
                    const midX = start.x + (end.x - start.x) * 0.5 + Math.cos(angle) * radius;
                    const midY = start.y + (end.y - start.y) * 0.5 + Math.sin(angle) * radius;
                    
                    // First move to mid-point
                    particle.style.transition = `all ${config.duration / 2}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                    particle.style.left = midX + 'px';
                    particle.style.top = midY + 'px';
                    particle.style.transform = 'scale(1.5)';
                    
                    // Then converge to end point
                    setTimeout(() => {
                        particle.style.transition = `all ${config.duration / 2}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                        particle.style.left = end.x + 'px';
                        particle.style.top = end.y + 'px';
                        particle.style.opacity = '0';
                        particle.style.transform = 'scale(0)';
                    }, config.duration / 2);
                }, delay);
            });
        },
        
        animateTrails: function(trails, start, end, config) {
            trails.forEach((trail, i) => {
                setTimeout(() => {
                    trail.style.transition = `all ${config.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                    trail.style.left = end.x - parseFloat(trail.style.width) / 2 + 'px';
                    trail.style.top = end.y - parseFloat(trail.style.height) / 2 + 'px';
                    trail.style.transform = `scale(${config.endScale}) rotate(${config.rotationAmount}deg)`;
                    trail.style.opacity = '0';
                }, i * 50);
            });
        },
        
        fallbackAnimate: function(element, startX, startY, endX, endY, config) {
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / config.duration, 1);
                const eased = this.easeInOutCubic(progress);
                
                // Calculate position
                const currentX = this.lerp(startX, endX, eased);
                const currentY = this.lerp(startY, endY, eased) - 
                               Math.sin(progress * Math.PI) * config.curveHeight;
                
                // Apply transformations
                element.style.left = currentX + 'px';
                element.style.top = currentY + 'px';
                element.style.transform = `scale(${1 - eased * (1 - config.endScale)}) rotate(${eased * config.rotationAmount}deg)`;
                element.style.opacity = (1 - eased * 0.3).toString();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        },
        
        // ================================
        // Effects
        // ================================
        
        createArrivalEffect: function(position, config) {
            // Create explosion effect
            const explosion = document.createElement('div');
            explosion.className = 'orkg-explosion';
            explosion.style.cssText = `
                position: fixed !important;
                left: ${position.x - 30}px !important;
                top: ${position.y - 30}px !important;
                width: 60px !important;
                height: 60px !important;
                background: radial-gradient(circle, ${config.defaultColor} 0%, transparent 70%) !important;
                border-radius: 50% !important;
                z-index: 100001 !important;
                pointer-events: none !important;
                opacity: 0 !important;
                transform: scale(0) !important;
            `;
            
            // Create ripple effect
            const ripple = document.createElement('div');
            ripple.className = 'orkg-ripple';
            ripple.style.cssText = `
                position: fixed !important;
                left: ${position.x - 50}px !important;
                top: ${position.y - 50}px !important;
                width: 100px !important;
                height: 100px !important;
                border: 2px solid ${config.defaultColor} !important;
                border-radius: 50% !important;
                z-index: 100000 !important;
                pointer-events: none !important;
                opacity: 0 !important;
                transform: scale(0) !important;
            `;
            
            document.body.appendChild(explosion);
            document.body.appendChild(ripple);
            
            // Animate with CSS transitions
            requestAnimationFrame(() => {
                explosion.style.transition = 'all 0.6s ease-out';
                explosion.style.opacity = '1';
                explosion.style.transform = 'scale(3)';
                
                ripple.style.transition = 'all 0.8s ease-out';
                ripple.style.opacity = '1';
                ripple.style.transform = 'scale(2)';
                
                setTimeout(() => {
                    explosion.style.opacity = '0';
                    ripple.style.opacity = '0';
                }, 300);
            });
            
            // Cleanup
            setTimeout(() => {
                explosion.remove();
                ripple.remove();
            }, 1000);
            
            // Create success flash
            this.createSuccessFlash(position, config);
        },
        
        createSuccessFlash: function(position, config) {
            const flash = document.createElement('div');
            flash.className = 'orkg-success-flash';
            flash.style.cssText = `
                position: fixed !important;
                left: ${position.x - 100}px !important;
                top: ${position.y - 100}px !important;
                width: 200px !important;
                height: 200px !important;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 60%) !important;
                border-radius: 50% !important;
                z-index: 100002 !important;
                pointer-events: none !important;
                opacity: 0 !important;
                mix-blend-mode: screen !important;
            `;
            
            document.body.appendChild(flash);
            
            // Animate
            requestAnimationFrame(() => {
                flash.style.transition = 'opacity 0.3s ease-out';
                flash.style.opacity = '1';
                
                setTimeout(() => {
                    flash.style.transition = 'opacity 0.5s ease-out';
                    flash.style.opacity = '0';
                }, 100);
            });
            
            // Cleanup
            setTimeout(() => {
                flash.remove();
            }, 800);
        },
        
        // ================================
        // Utility Methods
        // ================================
        
        getElementPosition: function(element) {
            if (AnimationCore.getElementPosition) {
                return AnimationCore.getElementPosition(element);
            }
            
            const rect = element.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        },
        
        getExtensionPosition: function() {
            if (AnimationCore.getExtensionPosition) {
                return AnimationCore.getExtensionPosition();
            }
            
            const panel = document.querySelector(
                '.orkg-extension-panel, #orkg-panel, .orkg-analyzer, .popup-container'
            );
            
            if (panel) {
                const rect = panel.getBoundingClientRect();
                return {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
            }
            
            return {
                x: window.innerWidth - 50,
                y: 50
            };
        },
        
        lerp: function(start, end, progress) {
            if (AnimationCore.lerp) {
                return AnimationCore.lerp(start, end, progress);
            }
            return start + (end - start) * progress;
        },
        
        easeInOutCubic: function(t) {
            if (AnimationCore.easings && AnimationCore.easings.easeInOutCubic) {
                return AnimationCore.easings.easeInOutCubic(t);
            }
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
    };
    
    // Export to global scope
    global.FlyAnimation = FlyAnimation;
    
    // Also expose as AnimationService for backward compatibility
    global.AnimationService = FlyAnimation;
    
    console.log('🚀 FlyAnimation module loaded');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[animations/FlyAnimation.js] Error:', error);
    }
  })();

  // ===== Module: animations/ParticleEffects.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/animations/ParticleEffects.js
// Advanced particle effects system
// ================================

(function(global) {
    'use strict';
    
    const ParticleEffects = {
        // ================================
        // Configuration
        // ================================
        
        config: {
            maxParticles: 100,
            defaultLifetime: 2000,
            defaultSize: 6,
            defaultSpeed: 2,
            defaultGravity: 0.1,
            defaultFriction: 0.98,
            colors: {
                orkg: ['#e86161', '#FF6B6B', '#FF8A8A'],
                success: ['#4CAF50', '#81C784', '#A5D6A7'],
                info: ['#2196F3', '#64B5F6', '#90CAF9'],
                warning: ['#FFA726', '#FFB74D', '#FFCC80']
            }
        },
        
        activeEmitters: new Map(),
        particles: [],
        animationId: null,
        canvas: null,
        ctx: null,
        
        // ================================
        // Particle Class
        // ================================
        
        Particle: class {
            constructor(x, y, options = {}) {
                this.x = x;
                this.y = y;
                this.vx = options.vx || (Math.random() - 0.5) * 4;
                this.vy = options.vy || (Math.random() - 0.5) * 4;
                this.size = options.size || ParticleEffects.config.defaultSize;
                this.color = options.color || '#e86161';
                this.lifetime = options.lifetime || ParticleEffects.config.defaultLifetime;
                this.age = 0;
                this.gravity = options.gravity || ParticleEffects.config.defaultGravity;
                this.friction = options.friction || ParticleEffects.config.defaultFriction;
                this.opacity = 1;
                this.rotation = 0;
                this.rotationSpeed = options.rotationSpeed || (Math.random() - 0.5) * 0.2;
                this.shape = options.shape || 'circle';
            }
            
            update(deltaTime) {
                this.age += deltaTime;
                
                if (this.age >= this.lifetime) {
                    return false; // Particle is dead
                }
                
                // Apply physics
                this.vy += this.gravity;
                this.vx *= this.friction;
                this.vy *= this.friction;
                
                // Update position
                this.x += this.vx;
                this.y += this.vy;
                
                // Update visual properties
                const lifeRatio = this.age / this.lifetime;
                this.opacity = 1 - lifeRatio;
                this.size *= 0.99; // Shrink over time
                this.rotation += this.rotationSpeed;
                
                return true; // Particle is alive
            }
            
            render(ctx) {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                switch (this.shape) {
                    case 'circle':
                        this.renderCircle(ctx);
                        break;
                    case 'square':
                        this.renderSquare(ctx);
                        break;
                    case 'star':
                        this.renderStar(ctx);
                        break;
                    case 'triangle':
                        this.renderTriangle(ctx);
                        break;
                    default:
                        this.renderCircle(ctx);
                }
                
                ctx.restore();
            }
            
            renderCircle(ctx) {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add glow effect
                ctx.shadowBlur = this.size * 2;
                ctx.shadowColor = this.color;
                ctx.fill();
            }
            
            renderSquare(ctx) {
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
            }
            
            renderStar(ctx) {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                    const x = Math.cos(angle) * this.size;
                    const y = Math.sin(angle) * this.size;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.fill();
            }
            
            renderTriangle(ctx) {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(-this.size, this.size);
                ctx.lineTo(this.size, this.size);
                ctx.closePath();
                ctx.fill();
            }
        },
        
        // ================================
        // Emitter Class
        // ================================
        
        Emitter: class {
            constructor(x, y, options = {}) {
                this.x = x;
                this.y = y;
                this.rate = options.rate || 5; // Particles per second
                this.spread = options.spread || Math.PI * 2; // Emission angle
                this.speed = options.speed || 2;
                this.colors = options.colors || ParticleEffects.config.colors.orkg;
                this.particleOptions = options.particleOptions || {};
                this.active = true;
                this.lastEmit = Date.now();
                this.duration = options.duration || Infinity;
                this.startTime = Date.now();
            }
            
            update() {
                if (!this.active) return [];
                
                const now = Date.now();
                const elapsed = now - this.startTime;
                
                if (this.duration !== Infinity && elapsed > this.duration) {
                    this.active = false;
                    return [];
                }
                
                const timeSinceLastEmit = now - this.lastEmit;
                const particlesToEmit = Math.floor((timeSinceLastEmit * this.rate) / 1000);
                
                const newParticles = [];
                
                if (particlesToEmit > 0) {
                    for (let i = 0; i < particlesToEmit; i++) {
                        const angle = (Math.random() - 0.5) * this.spread;
                        const speed = this.speed * (0.5 + Math.random() * 0.5);
                        
                        const particle = new ParticleEffects.Particle(this.x, this.y, {
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            color: this.colors[Math.floor(Math.random() * this.colors.length)],
                            ...this.particleOptions
                        });
                        
                        newParticles.push(particle);
                    }
                    
                    this.lastEmit = now;
                }
                
                return newParticles;
            }
            
            moveTo(x, y) {
                this.x = x;
                this.y = y;
            }
            
            stop() {
                this.active = false;
            }
        },
        
        // ================================
        // Canvas Management
        // ================================
        
        ensureCanvas: function() {
            if (this.canvas && document.body.contains(this.canvas)) {
                return;
            }
            
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'orkg-particle-canvas';
            this.canvas.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                pointer-events: none !important;
                z-index: 99998 !important;
            `;
            
            this.updateCanvasSize();
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            
            // Handle resize
            window.addEventListener('resize', () => this.updateCanvasSize());
        },
        
        updateCanvasSize: function() {
            if (!this.canvas) return;
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        },
        
        // ================================
        // Particle System
        // ================================
        
        createEmitter: function(x, y, options = {}) {
            this.ensureCanvas();
            
            const emitter = new this.Emitter(x, y, options);
            const emitterId = `emitter_${Date.now()}_${Math.random()}`;
            
            this.activeEmitters.set(emitterId, emitter);
            
            if (!this.animationId) {
                this.startAnimation();
            }
            
            return emitterId;
        },
        
        removeEmitter: function(emitterId) {
            this.activeEmitters.delete(emitterId);
            
            if (this.activeEmitters.size === 0 && this.particles.length === 0) {
                this.stopAnimation();
            }
        },
        
        burst: function(x, y, options = {}) {
            this.ensureCanvas();
            
            const {
                count = 30,
                colors = this.config.colors.orkg,
                speed = 5,
                lifetime = 1500,
                gravity = 0.2,
                shape = 'circle'
            } = options;
            
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                const velocity = speed * (0.5 + Math.random() * 0.5);
                
                const particle = new this.Particle(x, y, {
                    vx: Math.cos(angle) * velocity,
                    vy: Math.sin(angle) * velocity,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    lifetime: lifetime,
                    gravity: gravity,
                    shape: shape
                });
                
                this.particles.push(particle);
            }
            
            if (!this.animationId) {
                this.startAnimation();
            }
        },
        
        trail: function(startX, startY, endX, endY, options = {}) {
            this.ensureCanvas();
            
            const {
                count = 20,
                colors = this.config.colors.orkg,
                lifetime = 1000,
                delay = 50
            } = options;
            
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    const progress = i / count;
                    const x = startX + (endX - startX) * progress;
                    const y = startY + (endY - startY) * progress;
                    
                    const particle = new this.Particle(x, y, {
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        color: colors[i % colors.length],
                        lifetime: lifetime,
                        gravity: 0,
                        size: 4 + (1 - progress) * 4
                    });
                    
                    this.particles.push(particle);
                }, i * delay);
            }
            
            if (!this.animationId) {
                this.startAnimation();
            }
        },
        
        // ================================
        // Animation Loop
        // ================================
        
        startAnimation: function() {
            if (this.animationId) return;
            
            let lastTime = performance.now();
            
            const animate = (currentTime) => {
                const deltaTime = currentTime - lastTime;
                lastTime = currentTime;
                
                // Clear canvas
                if (this.ctx) {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    // Update and spawn particles from emitters
                    for (const emitter of this.activeEmitters.values()) {
                        const newParticles = emitter.update();
                        this.particles.push(...newParticles);
                    }
                    
                    // Update and render particles
                    this.particles = this.particles.filter(particle => {
                        const alive = particle.update(deltaTime);
                        if (alive) {
                            particle.render(this.ctx);
                        }
                        return alive;
                    });
                    
                    // Limit max particles
                    if (this.particles.length > this.config.maxParticles) {
                        this.particles = this.particles.slice(-this.config.maxParticles);
                    }
                }
                
                // Continue animation if needed
                if (this.particles.length > 0 || this.activeEmitters.size > 0) {
                    this.animationId = requestAnimationFrame(animate);
                } else {
                    this.stopAnimation();
                }
            };
            
            this.animationId = requestAnimationFrame(animate);
        },
        
        stopAnimation: function() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            // Clean up canvas if no particles
            if (this.particles.length === 0 && this.canvas) {
                if (this.canvas.parentNode) {
                    this.canvas.remove();
                }
                this.canvas = null;
                this.ctx = null;
            }
        },
        
        // ================================
        // Utility Methods
        // ================================
        
        clear: function() {
            this.particles = [];
            this.activeEmitters.clear();
            this.stopAnimation();
            
            if (this.canvas && this.canvas.parentNode) {
                this.canvas.remove();
            }
            this.canvas = null;
            this.ctx = null;
        },
        
        getStats: function() {
            return {
                particleCount: this.particles.length,
                emitterCount: this.activeEmitters.size,
                isAnimating: !!this.animationId,
                hasCanvas: !!this.canvas
            };
        }
    };
    
    // Export to global scope
    global.ParticleEffects = ParticleEffects;
    
    console.log('✨ ParticleEffects system loaded');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[animations/ParticleEffects.js] Error:', error);
    }
  })();

  // ===== Module: intelligence/ContentIntelligenceService.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/intelligence/ContentIntelligenceService.js - Converted to IIFE
// ================================

(function(global) {
    'use strict';
    
    /**
     * ContentIntelligenceService
     * Provides intelligent analysis of page content
     */
    function ContentIntelligenceService() {
        this.initialized = false;
        this.textIntelligence = null;
        this.imageIntelligence = null;
        this.tableIntelligence = null;
    }
    
    /**
     * Initialize the intelligence service
     */
    ContentIntelligenceService.prototype.init = async function() {
        if (this.initialized) return;
        
        console.log('🧠 Initializing ContentIntelligenceService...');
        
        try {
            // Initialize Text Intelligence
            if (typeof window.TextIntelligence !== 'undefined') {
                this.textIntelligence = new window.TextIntelligence();
                if (this.textIntelligence.init) {
                    await this.textIntelligence.init();
                }
            }
            
            // Initialize Image Intelligence
            if (typeof window.ImageIntelligence !== 'undefined') {
                this.imageIntelligence = new window.ImageIntelligence();
                if (this.imageIntelligence.init) {
                    await this.imageIntelligence.init();
                }
            }
            
            // Initialize Table Intelligence
            if (typeof window.TableIntelligence !== 'undefined') {
                this.tableIntelligence = new window.TableIntelligence();
                if (this.tableIntelligence.init) {
                    await this.tableIntelligence.init();
                }
            }
            
            this.initialized = true;
            console.log('✅ ContentIntelligenceService initialized');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize ContentIntelligenceService:', error);
            return false;
        }
    };
    
    /**
     * Enhance text data with intelligence
     */
    ContentIntelligenceService.prototype.enhanceTextData = async function(textData) {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.textIntelligence) {
            console.warn('⚠️ TextIntelligence not available');
            return textData;
        }
        
        try {
            console.log('🧠 Enhancing text data with intelligence...');
            
            // Process sections
            const sections = textData.sections || {};
            const enhancedSections = {};
            
            for (const [key, section] of Object.entries(sections)) {
                enhancedSections[key] = this.textIntelligence.analyze(section, key);
            }
            
            return {
                ...textData,
                sections: enhancedSections,
                metadata: {
                    ...textData.metadata,
                    intelligence: {
                        applied: true,
                        timestamp: Date.now()
                    }
                }
            };
            
        } catch (error) {
            console.error('❌ Failed to enhance text data:', error);
            return textData;
        }
    };
    
    /**
     * Enhance image data with intelligence
     */
    ContentIntelligenceService.prototype.enhanceImageData = async function(imageData) {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.imageIntelligence) {
            console.warn('⚠️ ImageIntelligence not available');
            return imageData;
        }
        
        try {
            console.log('🧠 Enhancing image data with intelligence...');
            
            // Process images
            const images = imageData.images || [];
            const analyzedImages = this.imageIntelligence.analyzeMultiple(images);
            
            return {
                ...imageData,
                images: analyzedImages,
                metadata: {
                    ...imageData.metadata,
                    intelligence: {
                        applied: true,
                        timestamp: Date.now()
                    }
                },
                statistics: this.imageIntelligence.getStatistics(analyzedImages)
            };
            
        } catch (error) {
            console.error('❌ Failed to enhance image data:', error);
            return imageData;
        }
    };
    
    /**
     * Enhance table data with intelligence
     */
    ContentIntelligenceService.prototype.enhanceTableData = async function(tableData) {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.tableIntelligence) {
            console.warn('⚠️ TableIntelligence not available');
            return tableData;
        }
        
        try {
            console.log('🧠 Enhancing table data with intelligence...');
            
            // Process tables
            const tables = tableData.tables || [];
            const analyzedTables = tables.map(table => this.tableIntelligence.analyze(table));
            
            return {
                ...tableData,
                tables: analyzedTables,
                metadata: {
                    ...tableData.metadata,
                    intelligence: {
                        applied: true,
                        timestamp: Date.now()
                    }
                }
            };
            
        } catch (error) {
            console.error('❌ Failed to enhance table data:', error);
            return tableData;
        }
    };
    
    /**
     * Get property suggestions for text
     */
    ContentIntelligenceService.prototype.getPropertySuggestions = async function(text) {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.textIntelligence) {
            console.warn('⚠️ TextIntelligence not available');
            return [];
        }
        
        try {
            return this.textIntelligence.suggestProperties(text);
        } catch (error) {
            console.error('❌ Failed to get property suggestions:', error);
            return [];
        }
    };
    
    /**
     * Clean up and reset
     */
    ContentIntelligenceService.prototype.cleanup = function() {
        // Clean up individual services
        if (this.textIntelligence && this.textIntelligence.cleanup) {
            this.textIntelligence.cleanup();
        }
        
        if (this.imageIntelligence && this.imageIntelligence.cleanup) {
            this.imageIntelligence.cleanup();
        }
        
        if (this.tableIntelligence && this.tableIntelligence.cleanup) {
            this.tableIntelligence.cleanup();
        }
        
        this.initialized = false;
        console.log('🧹 ContentIntelligenceService cleaned up');
    };
    
    // Export to global scope
    global.ContentIntelligenceService = ContentIntelligenceService;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[intelligence/ContentIntelligenceService.js] Error:', error);
    }
  })();

  // ===== Module: intelligence/ImageIntelligence.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/intelligence/ImageIntelligence.js - Converted to IIFE pattern
// ================================

(function(global) {
    'use strict';
    
    /**
     * Image Intelligence - analyzes and scores image importance
     */
    function ImageIntelligence(config = {}) {
        this.config = {
            weights: {
                size: 0.15,           // Image size importance
                position: 0.10,       // Position in document
                caption: 0.20,        // Caption quality
                references: 0.25,     // How often referenced
                context: 0.15,        // Surrounding context
                type: 0.15            // Image type importance
            },
            thresholds: {
                minimum: 0.3,         // Minimum score to consider
                recommended: 0.6,     // Recommended threshold
                high: 0.8            // High importance threshold
            },
            keywords: {
                important: ['result', 'finding', 'show', 'demonstrate', 'reveal', 
                           'significant', 'important', 'key', 'main', 'primary'],
                veryImportant: ['novel', 'new', 'first', 'discovery', 'breakthrough',
                               'unprecedented', 'unique', 'remarkable'],
                methodological: ['method', 'procedure', 'protocol', 'technique', 
                                'approach', 'workflow', 'pipeline'],
                supplementary: ['supplementary', 'additional', 'appendix', 'supporting',
                               'extra', 'auxiliary']
            }
        };
        
        // Merge provided config with defaults
        if (config) {
            for (const key in config) {
                if (typeof this.config[key] === 'object' && this.config[key] !== null) {
                    this.config[key] = { ...this.config[key], ...config[key] };
                } else {
                    this.config[key] = config[key];
                }
            }
        }
        
        this.scoringCache = new Map();
        this.isInitialized = false;
    }
    
    /**
     * Initialize the intelligence module
     */
    ImageIntelligence.prototype.init = async function() {
        if (this.isInitialized) return;
        
        console.log('🧠 Initializing ImageIntelligence...');
        
        // Any initialization logic can go here
        // For now, just mark as initialized
        this.isInitialized = true;
        
        console.log('✅ ImageIntelligence initialized');
    };
    
    /**
     * Analyze and score image importance
     */
    ImageIntelligence.prototype.analyze = function(imageData) {
        // Check cache
        if (this.scoringCache.has(imageData.id)) {
            return this.scoringCache.get(imageData.id);
        }
        
        // Calculate individual scores
        const scores = {
            size: this.scoreSizeImportance(imageData.dimensions),
            position: this.scorePositionImportance(imageData.position),
            caption: this.scoreCaptionImportance(imageData.context?.caption),
            references: this.scoreReferenceImportance(imageData.context?.references),
            context: this.scoreContextImportance(imageData.context),
            type: this.scoreTypeImportance(imageData.type)
        };
        
        // Calculate weighted total
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const [factor, score] of Object.entries(scores)) {
            const weight = this.config.weights[factor] || 0;
            totalScore += score * weight;
            totalWeight += weight;
        }
        
        // Normalize score
        const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        
        // Determine importance level
        const importanceLevel = this.determineImportanceLevel(normalizedScore);
        
        // Identify key factors
        const keyFactors = this.identifyKeyFactors(scores);
        
        // Get recommendations
        const recommendations = this.getRecommendations(imageData, scores);
        
        const result = {
            id: imageData.id,
            score: normalizedScore,
            scores,
            level: importanceLevel,
            keyFactors,
            recommendations,
            shouldExtract: normalizedScore >= this.config.thresholds.minimum,
            isHighPriority: normalizedScore >= this.config.thresholds.high,
            confidence: this.calculateConfidence(scores),
            timestamp: Date.now()
        };
        
        // Cache result
        this.scoringCache.set(imageData.id, result);
        
        return result;
    };
    
    /**
     * Score based on image size
     */
    ImageIntelligence.prototype.scoreSizeImportance = function(dimensions) {
        if (!dimensions) return 0;
        
        const { width, height } = dimensions;
        const area = width * height;
        
        // Define size thresholds
        const thresholds = {
            tiny: 10000,      // < 100x100
            small: 40000,     // < 200x200
            medium: 160000,   // < 400x400
            large: 640000,    // < 800x800
            veryLarge: 1440000 // < 1200x1200
        };
        
        // Score based on area
        if (area < thresholds.tiny) return 0.1;
        if (area < thresholds.small) return 0.3;
        if (area < thresholds.medium) return 0.5;
        if (area < thresholds.large) return 0.7;
        if (area < thresholds.veryLarge) return 0.9;
        return 1.0;
    };
    
    /**
     * Score based on position in document
     */
    ImageIntelligence.prototype.scorePositionImportance = function(position) {
        if (!position) return 0.5;
        
        // Get document dimensions
        const docHeight = document.documentElement.scrollHeight;
        const docWidth = document.documentElement.scrollWidth;
        
        // Calculate relative position
        const relativeY = position.top / docHeight;
        const relativeX = position.left / docWidth;
        
        // Score based on position (higher score for main content area)
        let score = 0.5;
        
        // Vertical position scoring
        if (relativeY < 0.2) {
            score += 0.1; // Near top
        } else if (relativeY < 0.8) {
            score += 0.3; // Main content area
        } else {
            score -= 0.1; // Near bottom (often supplementary)
        }
        
        // Horizontal position scoring
        if (relativeX > 0.1 && relativeX < 0.9) {
            score += 0.2; // Centered content
        }
        
        return Math.min(1, Math.max(0, score));
    };
    
    /**
     * Score based on caption quality and content
     */
    ImageIntelligence.prototype.scoreCaptionImportance = function(caption) {
        if (!caption) return 0.2; // Low score for no caption
        
        let score = 0.5; // Base score for having caption
        
        // Check caption length (good captions are descriptive)
        const wordCount = caption.split(/\s+/).length;
        if (wordCount > 10) score += 0.2;
        if (wordCount > 20) score += 0.1;
        
        // Check for important keywords
        const captionLower = caption.toLowerCase();
        
        // Very important keywords
        for (const keyword of this.config.keywords.veryImportant) {
            if (captionLower.includes(keyword)) {
                score += 0.3;
                break;
            }
        }
        
        // Important keywords
        for (const keyword of this.config.keywords.important) {
            if (captionLower.includes(keyword)) {
                score += 0.2;
                break;
            }
        }
        
        // Methodological keywords
        for (const keyword of this.config.keywords.methodological) {
            if (captionLower.includes(keyword)) {
                score += 0.15;
                break;
            }
        }
        
        // Supplementary keywords (reduce score)
        for (const keyword of this.config.keywords.supplementary) {
            if (captionLower.includes(keyword)) {
                score -= 0.3;
                break;
            }
        }
        
        // Check for specific patterns
        if (/^(figure|fig\.?)\s+\d+[a-z]?\s*[:.\s]/i.test(caption)) {
            score += 0.1; // Proper figure labeling
        }
        
        if (/\([a-z]\)|\([ivx]+\)/i.test(caption)) {
            score += 0.05; // Contains subfigure labels
        }
        
        return Math.min(1, Math.max(0, score));
    };
    
    /**
     * Score based on how often the image is referenced
     */
    ImageIntelligence.prototype.scoreReferenceImportance = function(references) {
        if (!references || references.length === 0) return 0.3;
        
        // Base score for being referenced
        let score = 0.5;
        
        // Add score based on number of references
        const refCount = references.length;
        if (refCount === 1) score += 0.2;
        else if (refCount === 2) score += 0.3;
        else if (refCount >= 3) score += 0.5;
        
        // Analyze reference contexts
        for (const ref of references) {
            const refText = ref.text.toLowerCase();
            
            // Check for emphasis in references
            if (refText.includes('as shown in') || 
                refText.includes('see figure') ||
                refText.includes('illustrated in')) {
                score += 0.1;
            }
            
            // Check for important context
            for (const keyword of this.config.keywords.important) {
                if (refText.includes(keyword)) {
                    score += 0.05;
                    break;
                }
            }
        }
        
        return Math.min(1, Math.max(0, score));
    };
    
    /**
     * Score based on surrounding context
     */
    ImageIntelligence.prototype.scoreContextImportance = function(context) {
        let score = 0.5;
        
        if (!context) return score;
        
        // Check surrounding text
        if (context.surroundingText) {
            const textLower = context.surroundingText.toLowerCase();
            
            // Check for discussion of results
            if (textLower.includes('result') || 
                textLower.includes('finding') ||
                textLower.includes('observation')) {
                score += 0.2;
            }
            
            // Check for methodology discussion
            if (textLower.includes('method') || 
                textLower.includes('procedure') ||
                textLower.includes('protocol')) {
                score += 0.15;
            }
            
            // Check for conclusions
            if (textLower.includes('conclude') || 
                textLower.includes('summary') ||
                textLower.includes('implication')) {
                score += 0.15;
            }
        }
        
        // Bonus for being in a figure environment
        if (context.figure) {
            score += 0.1;
        }
        
        // Check inline context
        if (context.inlineContext && context.inlineContext.isInline) {
            score -= 0.2; // Inline images are often less important
        }
        
        return Math.min(1, Math.max(0, score));
    };
    
    /**
     * Score based on image type
     */
    ImageIntelligence.prototype.scoreTypeImportance = function(type) {
        const typeScores = {
            'chart': 1.0,       // Highest score for charts
            'graph': 0.95,      // Very high for graphs
            'plot': 0.9,        // High for plots
            'diagram': 0.7,     // Diagrams are somewhat important
            'figure': 0.6,      // Regular figures
            'table': 0.5,       // Tables
            'photo': 0.4,       // Photos
            'illustration': 0.4,
            'screenshot': 0.3,
            'equation': 0.5,
            'logo': 0.1,
            'icon': 0.1,
            'svg': 0.6,
            'canvas': 0.8,      // Canvas often contains charts
            'image': 0.5,
            'background': 0.1,
            'Treemap': 0.8      // Treemaps are a type of chart
        };
        
        return typeScores[type] || 0.5;
    };
    
    /**
     * Determine importance level based on score
     */
    ImageIntelligence.prototype.determineImportanceLevel = function(score) {
        if (score >= this.config.thresholds.high) return 'high';
        if (score >= this.config.thresholds.recommended) return 'recommended';
        if (score >= this.config.thresholds.minimum) return 'low';
        return 'negligible';
    };
    
    /**
     * Identify key factors contributing to score
     */
    ImageIntelligence.prototype.identifyKeyFactors = function(scores) {
        const factors = [];
        const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        
        for (const [factor, score] of sortedScores) {
            if (score >= 0.7) {
                factors.push({
                    factor,
                    score,
                    description: this.getFactorDescription(factor, score)
                });
            }
        }
        
        return factors;
    };
    
    /**
     * Get human-readable factor description
     */
    ImageIntelligence.prototype.getFactorDescription = function(factor, score) {
        const descriptions = {
            size: score >= 0.8 ? 'Large, prominent image' : 'Good image size',
            position: score >= 0.8 ? 'Prime document position' : 'Good document position',
            caption: score >= 0.8 ? 'Highly informative caption' : 'Good caption',
            references: score >= 0.8 ? 'Frequently referenced' : 'Referenced in text',
            context: score >= 0.8 ? 'Important surrounding context' : 'Relevant context',
            type: score >= 0.8 ? 'Critical figure type' : 'Important figure type'
        };
        
        return descriptions[factor] || `High ${factor} score`;
    };
    
    /**
     * Get recommendations for the image
     */
    ImageIntelligence.prototype.getRecommendations = function(imageData, scores) {
        const recommendations = [];
        
        // Check if should be prioritized
        if (scores.references >= 0.8 && scores.caption >= 0.7) {
            recommendations.push({
                type: 'priority',
                message: 'High-priority figure: frequently referenced with detailed caption'
            });
        }
        
        // Check if it's a key result
        if (scores.type >= 0.8 && scores.context >= 0.7) {
            recommendations.push({
                type: 'key_result',
                message: 'Likely contains key research results'
            });
        }
        
        // Check if it's methodological
        if (imageData.context?.caption && 
            this.containsMethodKeywords(imageData.context.caption)) {
            recommendations.push({
                type: 'methodology',
                message: 'Important for understanding methodology'
            });
        }
        
        // Check if it needs manual review
        if (scores.caption < 0.3 && scores.references < 0.3) {
            recommendations.push({
                type: 'review',
                message: 'Manual review recommended: limited contextual information'
            });
        }
        
        return recommendations;
    };
    
    /**
     * Calculate confidence in the scoring
     */
    ImageIntelligence.prototype.calculateConfidence = function(scores) {
        // Higher confidence when multiple factors align
        const values = Object.values(scores);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Lower standard deviation = more consistent scores = higher confidence
        const consistency = 1 - Math.min(stdDev, 1);
        
        // Factor in how many high scores we have
        const highScores = values.filter(v => v >= 0.7).length;
        const highScoreFactor = highScores / values.length;
        
        return (consistency * 0.6 + highScoreFactor * 0.4);
    };
    
    /**
     * Check if text contains method keywords
     */
    ImageIntelligence.prototype.containsMethodKeywords = function(text) {
        const textLower = text.toLowerCase();
        return this.config.keywords.methodological.some(keyword => 
            textLower.includes(keyword)
        );
    };
    
    /**
     * Batch analyze multiple images
     */
    ImageIntelligence.prototype.analyzeMultiple = function(images) {
        return images.map(image => this.analyze(image));
    };
    
    /**
     * Get images above threshold
     */
    ImageIntelligence.prototype.filterByImportance = function(images, threshold) {
        const minScore = threshold || this.config.thresholds.recommended;
        const analyzed = this.analyzeMultiple(images);
        
        return analyzed.filter(result => result.score >= minScore)
                      .sort((a, b) => b.score - a.score);
    };
    
    /**
     * Get statistics for analyzed images
     */
    ImageIntelligence.prototype.getStatistics = function(analyzedImages) {
        if (!analyzedImages || analyzedImages.length === 0) {
            return null;
        }
        
        const scores = analyzedImages.map(img => img.score);
        const levels = analyzedImages.map(img => img.level);
        
        return {
            total: analyzedImages.length,
            averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            maxScore: Math.max(...scores),
            minScore: Math.min(...scores),
            distribution: {
                high: levels.filter(l => l === 'high').length,
                recommended: levels.filter(l => l === 'recommended').length,
                low: levels.filter(l => l === 'low').length,
                negligible: levels.filter(l => l === 'negligible').length
            },
            shouldExtract: analyzedImages.filter(img => img.shouldExtract).length,
            highPriority: analyzedImages.filter(img => img.isHighPriority).length
        };
    };
    
    /**
     * Clear scoring cache
     */
    ImageIntelligence.prototype.clearCache = function() {
        this.scoringCache.clear();
    };
    
    /**
     * Update configuration
     */
    ImageIntelligence.prototype.updateConfig = function(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.clearCache(); // Clear cache when config changes
    };
    
    /**
     * Cleanup
     */
    ImageIntelligence.prototype.cleanup = function() {
        this.clearCache();
        this.isInitialized = false;
        console.log('🧹 ImageIntelligence cleanup completed');
    };
    
    // Export to global scope
    global.ImageIntelligence = ImageIntelligence;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[intelligence/ImageIntelligence.js] Error:', error);
    }
  })();

  // ===== Module: intelligence/TableIntelligence.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/intelligence/TableIntelligence.js - Converted to IIFE
// ================================

(function(global) {
    'use strict';
    
    /**
     * TableIntelligence
     * Provides intelligent analysis of table content
     */
    function TableIntelligence(config = {}) {
        this.config = {
            thresholds: {
                important: 0.7,      // Threshold for important tables
                recommended: 0.5,    // Threshold for recommended tables
                low: 0.3             // Threshold for low importance tables
            },
            metrics: {
                rows: {
                    weight: 0.15,    // Weight for row count
                    ideal: 10        // Ideal number of rows
                },
                columns: {
                    weight: 0.1,     // Weight for column count
                    ideal: 5         // Ideal number of columns
                },
                caption: {
                    weight: 0.2      // Weight for caption quality
                },
                dataTypes: {
                    weight: 0.15     // Weight for data type variety
                },
                context: {
                    weight: 0.15     // Weight for surrounding context
                },
                references: {
                    weight: 0.2      // Weight for references to the table
                },
                headerQuality: {
                    weight: 0.15     // Weight for header quality
                }
            },
            tableTypes: [
                'data', 'results', 'statistics', 'comparison', 
                'reference', 'summary', 'parameters', 'metadata'
            ]
        };
        
        // Merge provided config with defaults
        if (config) {
            for (const key in config) {
                if (typeof this.config[key] === 'object' && this.config[key] !== null) {
                    this.config[key] = { ...this.config[key], ...config[key] };
                } else {
                    this.config[key] = config[key];
                }
            }
        }
        
        this.cache = new Map();
        this.isInitialized = false;
    }
    
    /**
     * Initialize the intelligence module
     */
    TableIntelligence.prototype.init = async function() {
        if (this.isInitialized) return;
        
        console.log('🧠 Initializing TableIntelligence...');
        
        // Any initialization logic can go here
        
        this.isInitialized = true;
        console.log('✅ TableIntelligence initialized');
    };
    
    /**
     * Analyze table content
     */
    TableIntelligence.prototype.analyze = function(tableData) {
        // Check if already in cache
        const cacheKey = this.generateCacheKey(tableData);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Basic validation
        if (!tableData || typeof tableData !== 'object') {
            return {
                id: 'invalid_table',
                score: 0,
                type: 'invalid',
                importance: 'negligible'
            };
        }
        
        // Process the table
        try {
            // Score different aspects of the table
            const scores = {
                rows: this.scoreRowCount(tableData),
                columns: this.scoreColumnCount(tableData),
                caption: this.scoreCaptionQuality(tableData),
                dataTypes: this.scoreDataTypeVariety(tableData),
                context: this.scoreContextRelevance(tableData),
                references: this.scoreReferences(tableData),
                headerQuality: this.scoreHeaderQuality(tableData)
            };
            
            // Calculate weighted score
            let totalScore = 0;
            let totalWeight = 0;
            
            for (const [metric, score] of Object.entries(scores)) {
                const weight = this.config.metrics[metric]?.weight || 0;
                totalScore += score * weight;
                totalWeight += weight;
            }
            
            // Normalize score
            const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
            
            // Determine table type and importance
            const tableType = this.determineTableType(tableData);
            const importance = this.determineImportance(normalizedScore);
            
            // Final result
            const result = {
                id: tableData.id || `table_${Date.now()}`,
                scores: scores,
                score: normalizedScore,
                type: tableType,
                importance: importance,
                shouldExtract: normalizedScore >= this.config.thresholds.low,
                isHighPriority: normalizedScore >= this.config.thresholds.important,
                insights: this.generateInsights(tableData, scores, normalizedScore),
                timestamp: Date.now()
            };
            
            // Cache the result
            this.cache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('Table analysis error:', error);
            return {
                id: tableData.id || `table_${Date.now()}`,
                error: error.message,
                score: 0,
                type: 'error',
                importance: 'negligible'
            };
        }
    };
    
    /**
     * Score row count
     */
    TableIntelligence.prototype.scoreRowCount = function(tableData) {
        const rows = tableData.rows || [];
        const rowCount = rows.length;
        
        if (rowCount === 0) return 0;
        
        // Score based on distance from ideal
        const ideal = this.config.metrics.rows.ideal;
        const ratio = Math.min(rowCount / ideal, 2); // Cap at 200% of ideal
        
        if (ratio < 0.3) return 0.3; // Too few rows
        if (ratio > 1.7) return 0.7; // Many rows, good but not perfect
        if (ratio >= 0.8 && ratio <= 1.3) return 1.0; // Close to ideal
        
        return 0.8; // Decent number of rows
    };
    
    /**
     * Score column count
     */
    TableIntelligence.prototype.scoreColumnCount = function(tableData) {
        const columnCount = tableData.columns?.length || 
                           (tableData.headers?.length || 0);
        
        if (columnCount === 0) return 0;
        
        // Score based on distance from ideal
        const ideal = this.config.metrics.columns.ideal;
        const ratio = Math.min(columnCount / ideal, 2); // Cap at 200% of ideal
        
        if (ratio < 0.4) return 0.3; // Too few columns
        if (ratio > 1.8) return 0.6; // Too many columns
        if (ratio >= 0.8 && ratio <= 1.3) return 1.0; // Close to ideal
        
        return 0.8; // Decent number of columns
    };
    
    /**
     * Score caption quality
     */
    TableIntelligence.prototype.scoreCaptionQuality = function(tableData) {
        const caption = tableData.caption || '';
        
        if (!caption) return 0.2; // No caption is bad
        
        let score = 0.5; // Base score for having a caption
        
        // Score based on caption length (longer is often more descriptive)
        const words = caption.split(/\s+/).length;
        if (words < 3) score -= 0.1; // Too short
        if (words >= 5 && words < 15) score += 0.2; // Good length
        if (words >= 15) score += 0.3; // Excellent length
        
        // Check for table number in caption
        if (/table\s+\d+/i.test(caption)) score += 0.1;
        
        // Check for descriptive keywords
        const descriptiveTerms = [
            'shows', 'presents', 'lists', 'summarizes', 'compares',
            'details', 'displays', 'illustrates', 'demonstrates', 'contains'
        ];
        
        for (const term of descriptiveTerms) {
            if (caption.toLowerCase().includes(term)) {
                score += 0.1;
                break;
            }
        }
        
        return Math.min(1, score);
    };
    
    /**
     * Score data type variety
     */
    TableIntelligence.prototype.scoreDataTypeVariety = function(tableData) {
        const rows = tableData.rows || [];
        if (rows.length === 0) return 0;
        
        const headers = tableData.headers || [];
        const dataTypes = new Set();
        
        // Try to determine data types
        for (const row of rows) {
            const cells = row.cells || row;
            
            if (Array.isArray(cells)) {
                for (const cell of cells) {
                    const value = typeof cell === 'object' ? cell.value : cell;
                    dataTypes.add(this.getDataType(value));
                }
            }
        }
        
        // Special column types from headers
        if (headers.length > 0) {
            for (const header of headers) {
                const headerText = typeof header === 'object' ? header.text : header;
                if (typeof headerText === 'string') {
                    const lowerHeader = headerText.toLowerCase();
                    
                    if (lowerHeader.includes('date') || lowerHeader.includes('time')) {
                        dataTypes.add('date');
                    } else if (lowerHeader.includes('percent') || lowerHeader.includes('%')) {
                        dataTypes.add('percentage');
                    } else if (lowerHeader.includes('p-value') || lowerHeader.includes('significance')) {
                        dataTypes.add('statistic');
                    }
                }
            }
        }
        
        // Score based on type variety
        switch (dataTypes.size) {
            case 0: return 0;
            case 1: return 0.4; // Only one type
            case 2: return 0.6; // Two types
            case 3: return 0.8; // Three types
            default: return 1.0; // Four or more types
        }
    };
    
    /**
     * Score context relevance
     */
    TableIntelligence.prototype.scoreContextRelevance = function(tableData) {
        const context = tableData.context || {};
        const surroundingText = context.surroundingText || '';
        
        if (!surroundingText) return 0.5; // Neutral without context
        
        let score = 0.5;
        
        // Check for references to the table in surrounding text
        const tableNumber = this.extractTableNumber(tableData);
        
        if (tableNumber && surroundingText.includes(`Table ${tableNumber}`)) {
            score += 0.2;
        }
        
        // Check for context keywords
        const contextKeywords = [
            'result', 'finding', 'show', 'demonstrate', 'indicate',
            'summarize', 'present', 'compare', 'detail', 'significant'
        ];
        
        for (const keyword of contextKeywords) {
            if (surroundingText.toLowerCase().includes(keyword)) {
                score += 0.1;
                break;
            }
        }
        
        // Check for data description
        if (surroundingText.includes('data') || 
            surroundingText.includes('statistic') ||
            surroundingText.includes('value')) {
            score += 0.1;
        }
        
        return Math.min(1, score);
    };
    
    /**
     * Score references to the table
     */
    TableIntelligence.prototype.scoreReferences = function(tableData) {
        const references = tableData.references || [];
        
        if (references.length === 0) return 0.3; // No references is bad
        
        // Score based on number of references
        switch (references.length) {
            case 1: return 0.5;  // One reference
            case 2: return 0.7;  // Two references
            case 3: return 0.9;  // Three references
            default: return 1.0; // Four or more references
        }
    };
    
    /**
     * Score header quality
     */
    TableIntelligence.prototype.scoreHeaderQuality = function(tableData) {
        const headers = tableData.headers || [];
        
        if (headers.length === 0) return 0.2; // No headers is bad
        
        let score = 0.5; // Base score for having headers
        
        // Check header completeness
        if (tableData.rows && tableData.rows.length > 0) {
            const firstRow = tableData.rows[0];
            const cells = firstRow.cells || firstRow;
            
            if (Array.isArray(cells) && headers.length >= cells.length) {
                score += 0.1; // Headers cover all columns
            }
        }
        
        // Check header lengths
        let headerLengthScore = 0;
        let descriptiveHeaders = 0;
        
        for (const header of headers) {
            const headerText = typeof header === 'object' ? header.text : header;
            
            if (typeof headerText === 'string') {
                const words = headerText.split(/\s+/).length;
                
                if (words >= 2) {
                    descriptiveHeaders++;
                }
                
                if (headerText.length > 3 && headerText.length < 30) {
                    headerLengthScore += 1;
                }
            }
        }
        
        // Score based on descriptive headers ratio
        const descriptiveRatio = descriptiveHeaders / Math.max(1, headers.length);
        if (descriptiveRatio >= 0.5) score += 0.2;
        
        // Score based on header length quality
        const headerLengthRatio = headerLengthScore / Math.max(1, headers.length);
        score += headerLengthRatio * 0.2;
        
        return Math.min(1, score);
    };
    
    /**
     * Determine table type
     */
    TableIntelligence.prototype.determineTableType = function(tableData) {
        const caption = tableData.caption || '';
        const headers = tableData.headers || [];
        
        // Check caption for type clues
        const captionLower = caption.toLowerCase();
        
        if (captionLower.includes('result')) return 'results';
        if (captionLower.includes('statistic')) return 'statistics';
        if (captionLower.includes('parameter')) return 'parameters';
        if (captionLower.includes('comparison') || captionLower.includes('compare')) return 'comparison';
        if (captionLower.includes('summary')) return 'summary';
        if (captionLower.includes('metadata')) return 'metadata';
        
        // Check headers for type clues
        const headerTexts = headers.map(h => typeof h === 'object' ? h.text : h)
                                 .filter(h => typeof h === 'string')
                                 .map(h => h.toLowerCase());
        
        const headerText = headerTexts.join(' ');
        
        if (headerText.includes('p-value') || 
            headerText.includes('significance') ||
            headerText.includes('statistics')) {
            return 'statistics';
        }
        
        if (headerText.includes('parameter') || 
            headerText.includes('setting') ||
            headerText.includes('configuration')) {
            return 'parameters';
        }
        
        if (headerTexts.some(h => h.includes('vs') || h.includes('versus') || h.includes('compared'))) {
            return 'comparison';
        }
        
        // Default to data
        return 'data';
    };
    
    /**
     * Determine importance level based on score
     */
    TableIntelligence.prototype.determineImportance = function(score) {
        if (score >= this.config.thresholds.important) return 'high';
        if (score >= this.config.thresholds.recommended) return 'recommended';
        if (score >= this.config.thresholds.low) return 'low';
        return 'negligible';
    };
    
    /**
     * Get data type of a value
     */
    TableIntelligence.prototype.getDataType = function(value) {
        if (value === null || value === undefined || value === '') {
            return 'empty';
        }
        
        const type = typeof value;
        
        if (type === 'number') {
            return 'number';
        }
        
        if (type !== 'string') {
            return type;
        }
        
        // Check string patterns
        const str = value.toString().trim();
        
        // Date pattern
        if (/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(str) || 
            /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(str)) {
            return 'date';
        }
        
        // Percentage
        if (/%$/.test(str) || /^\d+(\.\d+)?%$/.test(str)) {
            return 'percentage';
        }
        
        // P-value or small decimal
        if (/^0\.\d+$/.test(str) && parseFloat(str) < 0.1) {
            return 'statistic';
        }
        
        // Numeric string
        if (/^-?\d+(\.\d+)?$/.test(str)) {
            return 'number';
        }
        
        // Currency
        if (/^[$€£¥]/.test(str) || /[$€£¥]$/.test(str)) {
            return 'currency';
        }
        
        // Default to text
        return 'text';
    };
    
    /**
     * Extract table number from caption or context
     */
    TableIntelligence.prototype.extractTableNumber = function(tableData) {
        const caption = tableData.caption || '';
        const tableMatch = caption.match(/\btable\s+(\d+)/i);
        
        if (tableMatch) {
            return tableMatch[1];
        }
        
        return null;
    };
    
    /**
     * Generate insights about the table
     */
    TableIntelligence.prototype.generateInsights = function(tableData, scores, totalScore) {
        const insights = [];
        
        // Add insights based on scores
        if (scores.caption >= 0.8) {
            insights.push({
                type: 'positive',
                text: 'Well-described with detailed caption'
            });
        } else if (scores.caption <= 0.3) {
            insights.push({
                type: 'negative',
                text: 'Missing or poor caption - consider adding context'
            });
        }
        
        if (scores.headerQuality >= 0.8) {
            insights.push({
                type: 'positive',
                text: 'Clear and descriptive column headers'
            });
        } else if (scores.headerQuality <= 0.4) {
            insights.push({
                type: 'negative',
                text: 'Column headers could be improved'
            });
        }
        
        if (scores.dataTypes >= 0.8) {
            insights.push({
                type: 'positive',
                text: 'Rich data with varied content types'
            });
        }
        
        if (scores.references >= 0.8) {
            insights.push({
                type: 'positive',
                text: 'Frequently referenced in the text'
            });
        } else if (scores.references <= 0.3) {
            insights.push({
                type: 'negative',
                text: 'Not well-referenced in the text'
            });
        }
        
        // Add type-specific insights
        const tableType = this.determineTableType(tableData);
        
        switch (tableType) {
            case 'results':
                insights.push({
                    type: 'info',
                    text: 'Contains key results or findings'
                });
                break;
            case 'statistics':
                insights.push({
                    type: 'info',
                    text: 'Contains statistical data or measurements'
                });
                break;
            case 'comparison':
                insights.push({
                    type: 'info',
                    text: 'Compares different items or approaches'
                });
                break;
        }
        
        // Add overall recommendation
        if (totalScore >= this.config.thresholds.important) {
            insights.push({
                type: 'recommendation',
                text: 'High-priority table - should be extracted'
            });
        } else if (totalScore >= this.config.thresholds.recommended) {
            insights.push({
                type: 'recommendation',
                text: 'Recommended for extraction'
            });
        } else if (totalScore < this.config.thresholds.low) {
            insights.push({
                type: 'recommendation',
                text: 'Low importance - extraction optional'
            });
        }
        
        return insights;
    };
    
    /**
     * Generate cache key for table data
     */
    TableIntelligence.prototype.generateCacheKey = function(tableData) {
        // Use ID if available
        if (tableData.id) {
            return `table_${tableData.id}`;
        }
        
        // Generate from caption and first row
        const caption = tableData.caption || '';
        const firstRow = tableData.rows && tableData.rows.length > 0 
                      ? JSON.stringify(tableData.rows[0]).slice(0, 50)
                      : '';
        
        // Simple hash function
        const str = `${caption}:${firstRow}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return `table_${hash}`;
    };
    
    /**
     * Batch analyze multiple tables
     */
    TableIntelligence.prototype.analyzeMultiple = function(tables) {
        return tables.map(table => this.analyze(table));
    };
    
    /**
     * Get tables above threshold
     */
    TableIntelligence.prototype.filterByImportance = function(tables, threshold = null) {
        const minScore = threshold || this.config.thresholds.recommended;
        const analyzed = this.analyzeMultiple(tables);
        
        return analyzed.filter(result => result.score >= minScore)
                      .sort((a, b) => b.score - a.score);
    };
    
    /**
     * Clean up and reset
     */
    TableIntelligence.prototype.cleanup = function() {
        this.cache.clear();
        this.isInitialized = false;
        console.log('🧹 TableIntelligence cleaned up');
    };
    
    // Export to global scope
    global.TableIntelligence = TableIntelligence;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[intelligence/TableIntelligence.js] Error:', error);
    }
  })();

  // ===== Module: intelligence/TextIntelligence.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/intelligence/TextIntelligence.js - Converted to IIFE
// ================================

(function(global) {
    'use strict';
    
    /**
     * TextIntelligence
     * Provides intelligent analysis of text content
     */
    function TextIntelligence(config = {}) {
        this.config = {
            thresholds: {
                keySection: 0.7,       // Threshold for key section
                relevantSection: 0.5,  // Threshold for relevant section
                important: 0.7,        // Threshold for important text
                similarity: 0.8        // Threshold for text similarity
            },
            keywords: {
                method: ['method', 'procedure', 'technique', 'approach', 'algorithm', 
                        'protocol', 'process', 'methodology', 'implementation', 'framework'],
                result: ['result', 'finding', 'outcome', 'discovery', 'observation', 
                        'conclusion', 'reveal', 'demonstrate', 'show', 'confirm'],
                data: ['data', 'dataset', 'corpus', 'collection', 'sample', 
                      'measurement', 'statistic', 'record', 'value', 'parameter'],
                conclusion: ['conclude', 'summary', 'implication', 'suggest', 'indicate', 
                            'demonstrate', 'establish', 'confirm', 'validate', 'verify']
            },
            sectionLabels: {
                introduction: ['introduction', 'background', 'overview'],
                methods: ['method', 'methodology', 'materials', 'procedure', 'experimental'],
                results: ['result', 'finding', 'outcome', 'observation'],
                discussion: ['discussion', 'interpretation', 'implication'],
                conclusion: ['conclusion', 'summary', 'future work']
            },
            ...config
        };
        
        this.cache = new Map();
        this.isInitialized = false;
    }
    
    /**
     * Initialize the intelligence module
     */
    TextIntelligence.prototype.init = async function() {
        if (this.isInitialized) return;
        
        console.log('🧠 Initializing TextIntelligence...');
        
        // Any initialization logic can go here
        
        this.isInitialized = true;
        console.log('✅ TextIntelligence initialized');
    };
    
    /**
     * Analyze text content
     */
    TextIntelligence.prototype.analyze = function(text, sectionName = '') {
        // Check if already in cache
        const cacheKey = this.generateCacheKey(text, sectionName);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Basic validation
        if (!text || typeof text !== 'string') {
            return { 
                text: text || '',
                section: sectionName,
                score: 0,
                type: 'invalid',
                keyPhrases: [],
                sentences: []
            };
        }
        
        // Process the text
        let result;
        
        if (typeof text === 'object' && text.content) {
            // Handle structured text
            result = this.analyzeStructuredText(text, sectionName);
        } else {
            // Handle plain text
            result = this.analyzePlainText(text, sectionName);
        }
        
        // Cache the result
        this.cache.set(cacheKey, result);
        
        return result;
    };
    
    /**
     * Analyze plain text
     */
    TextIntelligence.prototype.analyzePlainText = function(text, sectionName) {
        // Get basic text metrics
        const wordCount = this.countWords(text);
        const sentenceCount = this.countSentences(text);
        const averageSentenceLength = wordCount / Math.max(1, sentenceCount);
        
        // Split into sentences for more detailed analysis
        const sentences = this.splitIntoSentences(text);
        const analyzedSentences = sentences.map((sentence, index) => 
            this.analyzeSentence(sentence, index, sectionName)
        );
        
        // Get section type based on section name
        const sectionType = this.determineSectionType(sectionName);
        
        // Calculate overall score
        const sentenceScores = analyzedSentences.map(s => s.score);
        const averageScore = sentenceScores.length > 0 
            ? sentenceScores.reduce((a, b) => a + b, 0) / sentenceScores.length 
            : 0;
        
        // Extract key phrases
        const keyPhrases = this.extractKeyPhrases(analyzedSentences);
        
        // Final result
        return {
            text: text,
            section: sectionName,
            type: sectionType,
            score: averageScore,
            metrics: {
                wordCount: wordCount,
                sentenceCount: sentenceCount,
                averageSentenceLength: averageSentenceLength
            },
            keyPhrases: keyPhrases,
            sentences: analyzedSentences,
            timestamp: Date.now()
        };
    };
    
    /**
     * Analyze structured text object
     */
    TextIntelligence.prototype.analyzeStructuredText = function(textObj, sectionName) {
        // Handle structured text with content property
        const content = textObj.content || '';
        const metadata = textObj.metadata || {};
        const id = textObj.id || '';
        
        // Get result from plain text analysis
        const result = this.analyzePlainText(content, sectionName);
        
        // Add structure information
        return {
            ...result,
            id: id,
            metadata: {
                ...metadata,
                intelligence: {
                    applied: true,
                    timestamp: Date.now()
                }
            }
        };
    };
    
    /**
     * Analyze individual sentence
     */
    TextIntelligence.prototype.analyzeSentence = function(sentence, index, sectionName) {
        // Get sentence characteristics
        const words = this.getWords(sentence);
        const wordCount = words.length;
        
        // Calculate sentence importance score
        const keywordScore = this.calculateKeywordScore(sentence);
        const structureScore = this.calculateStructureScore(sentence, index);
        const contextScore = this.calculateContextScore(sentence, sectionName);
        
        // Combined score (weighted)
        const score = (keywordScore * 0.5) + (structureScore * 0.3) + (contextScore * 0.2);
        
        // Categorize sentence
        const category = this.categorizeSentence(sentence, score, sectionName);
        
        // Entity extraction (simple approach)
        const entities = this.extractEntities(sentence);
        
        return {
            text: sentence,
            index: index,
            wordCount: wordCount,
            score: score,
            category: category,
            isImportant: score >= this.config.thresholds.important,
            entities: entities
        };
    };
    
    /**
     * Calculate keyword-based score
     */
    TextIntelligence.prototype.calculateKeywordScore = function(text) {
        const textLower = text.toLowerCase();
        let score = 0;
        
        // Check for important keywords across categories
        for (const category in this.config.keywords) {
            const keywords = this.config.keywords[category];
            for (const keyword of keywords) {
                if (textLower.includes(keyword)) {
                    score += 0.1; // Add score for each keyword
                    break; // Only count category once
                }
            }
        }
        
        // Adjust for sentence structure signals
        if (textLower.includes('significantly')) score += 0.15;
        if (textLower.includes('importantly')) score += 0.15;
        if (textLower.includes('notably')) score += 0.15;
        if (textLower.includes('we found') || textLower.includes('we observe')) score += 0.2;
        if (textLower.includes('in conclusion') || textLower.includes('to summarize')) score += 0.2;
        
        return Math.min(1, score);
    };
    
    /**
     * Calculate structure-based score
     */
    TextIntelligence.prototype.calculateStructureScore = function(sentence, index) {
        let score = 0.5; // Base score
        
        // First sentence bonus
        if (index === 0) score += 0.2;
        
        // Last sentence bonus (approximate)
        if (index > 5 && sentence.length > 20 && 
            (sentence.includes('.') && !sentence.includes('...'))) {
            score += 0.1;
        }
        
        // Length penalty/bonus
        const words = this.getWords(sentence);
        if (words.length < 5) score -= 0.2; // Too short
        if (words.length > 40) score -= 0.1; // Too long
        if (words.length >= 10 && words.length <= 25) score += 0.1; // Just right
        
        // Structure signals
        if (sentence.includes(':')) score += 0.1; // Likely defining something
        if (sentence.includes('(') && sentence.includes(')')) score += 0.05; // Contains clarification
        if (/\d/.test(sentence)) score += 0.1; // Contains numbers
        
        return Math.min(1, Math.max(0, score));
    };
    
    /**
     * Calculate context-based score
     */
    TextIntelligence.prototype.calculateContextScore = function(sentence, sectionName) {
        if (!sectionName) return 0.5; // Neutral without context
        
        const sectionLower = sectionName.toLowerCase();
        const sentenceLower = sentence.toLowerCase();
        let score = 0.5;
        
        // Score based on section type
        for (const [type, keywords] of Object.entries(this.config.sectionLabels)) {
            if (keywords.some(kw => sectionLower.includes(kw))) {
                // Check if sentence contains keywords relevant to this section
                if (type === 'methods' && 
                    this.config.keywords.method.some(kw => sentenceLower.includes(kw))) {
                    score += 0.2;
                }
                else if (type === 'results' && 
                         this.config.keywords.result.some(kw => sentenceLower.includes(kw))) {
                    score += 0.2;
                }
                else if (type === 'conclusion' && 
                         this.config.keywords.conclusion.some(kw => sentenceLower.includes(kw))) {
                    score += 0.2;
                }
                
                break;
            }
        }
        
        return Math.min(1, score);
    };
    
    /**
     * Categorize a sentence
     */
    TextIntelligence.prototype.categorizeSentence = function(sentence, score, sectionName) {
        // Basic categorization based on keywords
        const textLower = sentence.toLowerCase();
        
        if (score >= this.config.thresholds.important) {
            // High score categorization
            if (this.config.keywords.method.some(kw => textLower.includes(kw))) {
                return 'method';
            }
            if (this.config.keywords.result.some(kw => textLower.includes(kw))) {
                return 'result';
            }
            if (this.config.keywords.conclusion.some(kw => textLower.includes(kw))) {
                return 'conclusion';
            }
            if (this.config.keywords.data.some(kw => textLower.includes(kw))) {
                return 'data';
            }
            
            return 'important';
        }
        
        // Medium score categorization
        if (score >= 0.5) {
            if (/\d+\s*%/.test(textLower) || /\d+\.\d+/.test(textLower)) {
                return 'statistic';
            }
            if (textLower.includes('figure') || textLower.includes('table')) {
                return 'reference';
            }
            if (textLower.includes('e.g') || textLower.includes('i.e') || 
                textLower.includes('for example')) {
                return 'example';
            }
            
            return 'relevant';
        }
        
        // Low score categorization
        return 'standard';
    };
    
    /**
     * Extract entities from text (simple approach)
     */
    TextIntelligence.prototype.extractEntities = function(text) {
        const entities = [];
        
        // Extract citations
        const citationRegex = /\[(\d+(?:,\s*\d+)*)\]|\(([^)]+\s*\d{4}[^)]*)\)/g;
        let match;
        while ((match = citationRegex.exec(text)) !== null) {
            entities.push({
                type: 'citation',
                text: match[0],
                index: match.index
            });
        }
        
        // Extract references to figures and tables
        const figureRegex = /(figure|fig\.|table)\s+(\d+[a-z]?)/gi;
        while ((match = figureRegex.exec(text)) !== null) {
            entities.push({
                type: match[1].toLowerCase().includes('fig') ? 'figure' : 'table',
                text: match[0],
                id: match[2],
                index: match.index
            });
        }
        
        // Extract numbers with units
        const numberRegex = /(\d+\.?\d*)\s*(%|cm|mm|m|km|g|kg|ml|l|°C|°F|hz|khz|mhz|ghz)/gi;
        while ((match = numberRegex.exec(text)) !== null) {
            entities.push({
                type: 'measurement',
                text: match[0],
                value: parseFloat(match[1]),
                unit: match[2].toLowerCase(),
                index: match.index
            });
        }
        
        return entities;
    };
    
    /**
     * Extract key phrases from analyzed sentences
     */
    TextIntelligence.prototype.extractKeyPhrases = function(analyzedSentences) {
        // Filter for important sentences
        const importantSentences = analyzedSentences.filter(
            s => s.score >= this.config.thresholds.important
        );
        
        if (importantSentences.length === 0) {
            // If no important sentences, take the highest scoring ones (up to 2)
            const sortedSentences = [...analyzedSentences].sort((a, b) => b.score - a.score);
            importantSentences.push(...sortedSentences.slice(0, 2));
        }
        
        // Extract noun phrases (simplified)
        const keyPhrases = [];
        for (const sentence of importantSentences) {
            const phrases = this.extractNounPhrases(sentence.text);
            for (const phrase of phrases) {
                // Check if similar phrase already exists
                const isDuplicate = keyPhrases.some(existing => 
                    this.calculateSimilarity(existing.text, phrase) >= this.config.thresholds.similarity
                );
                
                if (!isDuplicate && phrase.length > 3) {
                    keyPhrases.push({
                        text: phrase,
                        score: sentence.score,
                        category: sentence.category
                    });
                }
            }
        }
        
        // Sort by score and limit
        return keyPhrases
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    };
    
    /**
     * Extract noun phrases (simplified)
     */
    TextIntelligence.prototype.extractNounPhrases = function(text) {
        const phrases = [];
        
        // Simple regex-based extraction
        // This is a very simplified approach - a real NLP pipeline would be better
        const regex = /(?:the|a|an)?\s*(?:[A-Z][a-z]+\s+)?(?:[a-z]+\s+){0,2}(?:[a-z]+)/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const phrase = match[0].trim();
            if (phrase.length > 3 && !this.isStopPhrase(phrase)) {
                phrases.push(phrase);
            }
        }
        
        return phrases;
    };
    
    /**
     * Check if a phrase is a stop phrase
     */
    TextIntelligence.prototype.isStopPhrase = function(phrase) {
        const stopPhrases = [
            'the', 'a', 'an', 'this', 'that', 'these', 'those',
            'is', 'are', 'was', 'were', 'has', 'have', 'had',
            'the following', 'as follows', 'as shown'
        ];
        
        return stopPhrases.includes(phrase.toLowerCase());
    };
    
    /**
     * Calculate similarity between two strings
     */
    TextIntelligence.prototype.calculateSimilarity = function(str1, str2) {
        // Convert to lowercase for comparison
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        // If one is a substring of the other, they're similar
        if (s1.includes(s2) || s2.includes(s1)) {
            return 0.9;
        }
        
        // Simple Jaccard similarity of words
        const words1 = new Set(this.getWords(s1));
        const words2 = new Set(this.getWords(s2));
        
        // Create union and intersection
        const union = new Set([...words1, ...words2]);
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        
        // Calculate Jaccard
        return intersection.size / union.size;
    };
    
    /**
     * Determine section type based on section name
     */
    TextIntelligence.prototype.determineSectionType = function(sectionName) {
        if (!sectionName) return 'unknown';
        
        const sectionLower = sectionName.toLowerCase();
        
        for (const [type, keywords] of Object.entries(this.config.sectionLabels)) {
            if (keywords.some(kw => sectionLower.includes(kw))) {
                return type;
            }
        }
        
        return 'unknown';
    };
    
    /**
     * Get word list from text
     */
    TextIntelligence.prototype.getWords = function(text) {
        return text.split(/\s+/).filter(w => w.length > 0);
    };
    
    /**
     * Count words in text
     */
    TextIntelligence.prototype.countWords = function(text) {
        return this.getWords(text).length;
    };
    
    /**
     * Count sentences in text
     */
    TextIntelligence.prototype.countSentences = function(text) {
        return this.splitIntoSentences(text).length;
    };
    
    /**
     * Split text into sentences
     */
    TextIntelligence.prototype.splitIntoSentences = function(text) {
        // Simplified sentence splitting
        // This won't handle all edge cases perfectly
        return text
            .replace(/([.!?])\s+([A-Z])/g, '$1\n$2')
            .split(/\n+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    };
    
    /**
     * Generate cache key
     */
    TextIntelligence.prototype.generateCacheKey = function(text, sectionName) {
        // Simple hash function
        const str = `${sectionName}:${text.substring(0, 100)}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return `text_${hash}`;
    };
    
    /**
     * Suggest properties based on text
     */
    TextIntelligence.prototype.suggestProperties = function(text) {
        // Analyze the text
        const analysis = this.analyzePlainText(text);
        
        // Extract categories from sentences
        const categories = analysis.sentences
            .filter(s => s.score >= 0.5)
            .map(s => s.category);
        
        // Count category frequencies
        const categoryCount = {};
        for (const category of categories) {
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        }
        
        // Get top categories
        const sortedCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .map(([category]) => category);
        
        // Map categories to property suggestions
        return this.mapCategoriesToProperties(sortedCategories, text);
    };
    
    /**
     * Map categories to property suggestions
     */
    TextIntelligence.prototype.mapCategoriesToProperties = function(categories, text) {
        const suggestions = [];
        const textLower = text.toLowerCase();
        
        // Add category-based suggestions
        for (const category of categories) {
            switch (category) {
                case 'method':
                    suggestions.push({
                        id: 'method',
                        label: 'Method',
                        description: 'The methodology or approach described',
                        confidence: 0.9
                    });
                    break;
                case 'result':
                    suggestions.push({
                        id: 'result',
                        label: 'Result',
                        description: 'The outcome or finding',
                        confidence: 0.9
                    });
                    break;
                case 'conclusion':
                    suggestions.push({
                        id: 'conclusion',
                        label: 'Conclusion',
                        description: 'The conclusion or summary',
                        confidence: 0.9
                    });
                    break;
                case 'data':
                    suggestions.push({
                        id: 'dataset',
                        label: 'Dataset',
                        description: 'The data used or produced',
                        confidence: 0.8
                    });
                    break;
                case 'statistic':
                    suggestions.push({
                        id: 'statistic',
                        label: 'Statistic',
                        description: 'Statistical measurement or value',
                        confidence: 0.8
                    });
                    break;
            }
        }
        
        // Add context-specific suggestions
        if (textLower.includes('accuracy') || 
            textLower.includes('precision') || 
            textLower.includes('f1') || 
            textLower.includes('recall')) {
            suggestions.push({
                id: 'evaluation_metric',
                label: 'Evaluation Metric',
                description: 'Metric used for evaluation',
                confidence: 0.8
            });
        }
        
        if (textLower.includes('architecture') || 
            textLower.includes('model') || 
            textLower.includes('algorithm')) {
            suggestions.push({
                id: 'model',
                label: 'Model',
                description: 'The model or algorithm described',
                confidence: 0.8
            });
        }
        
        if (textLower.includes('future') || 
            textLower.includes('limitation') || 
            textLower.includes('constraint')) {
            suggestions.push({
                id: 'limitation',
                label: 'Limitation',
                description: 'Limitation or constraint of the work',
                confidence: 0.8
            });
        }
        
        // Deduplicate suggestions
        const uniqueSuggestions = [];
        const addedIds = new Set();
        
        for (const suggestion of suggestions) {
            if (!addedIds.has(suggestion.id)) {
                uniqueSuggestions.push(suggestion);
                addedIds.add(suggestion.id);
            }
        }
        
        return uniqueSuggestions;
    };
    
    /**
     * Clean up and reset
     */
    TextIntelligence.prototype.cleanup = function() {
        this.cache.clear();
        this.isInitialized = false;
        console.log('🧹 TextIntelligence cleaned up');
    };
    
    // Export to global scope
    global.TextIntelligence = TextIntelligence;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[intelligence/TextIntelligence.js] Error:', error);
    }
  })();

  // ===== Module: extraction/TextExtractor.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/extraction/TextExtractor.js - ENHANCED
// ================================

(function(global) {
  'use strict';
  
  // Check if already exists
  if (global.textExtractor) {
    console.log('📝 TextExtractor already exists, skipping creation');
    return;
  }
  
  /**
   * Enhanced Text Extractor for ORKG Content Script
   * Comprehensive extraction preserving all document sections
   */
  class TextExtractor {
    constructor() {
      this.isInitialized = false;
      
      // Configuration
      this.config = {
        // Text processing
        minSectionLength: 50,
        maxSectionLength: 50000,
        minParagraphLength: 10,
        
        // Content inclusion
        includeHeaders: true,
        includeParagraphs: true,
        includeLists: true,
        includeBlockquotes: true,
        includeCodeBlocks: false,
        
        // Exclusions - we handle these separately
        includeTables: false,
        includeFigures: false,
        includeImages: false,
        
        // Section detection
        preserveDocumentOrder: true,
        mergeShortSections: false, // Changed to false to preserve all sections
        deduplicateContent: true,
        captureAllHeaders: true, // New flag to ensure we get all headers
        
        // LLM optimization
        maxBatchSize: 8000, // Characters per batch for LLM
        optimalBatchSize: 6000, // Target batch size
        minBatchSize: 2000, // Minimum batch size
        
        // Sections to exclude (ban list) - made more specific
        bannedSections: new Set([
          'references', 'bibliography', 'works cited', 'citations',
          'copyright', 'disclaimer', 'terms of use', 'privacy policy',
          'cookie policy', 'supplementary material', 'supplementary data',
          'supporting information', 'supplemental material'
        ]),
        
        // Keywords to identify banned content - more precise
        bannedKeywords: [
          'references', 'bibliography', 'works cited', 'copyright notice',
          '©', '®', 'all rights reserved', 'terms of use', 'privacy policy',
          'cookie policy', 'supplementary material', 'supporting information'
        ],
        
        // Tags to skip entirely
        skipTags: new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TABLE', 'FIGURE', 'IMG', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME']),
        
        // Elements to skip based on class/id patterns
        skipPatterns: [
          'cookie', 'banner', 'advertisement', 'ads', 'popup', 'modal', 
          'overlay', 'social-share', 'comments-section', 'related-articles'
        ]
      };
      
      // Track processed elements to avoid duplicates
      this.processedElements = new WeakSet();
      this.sectionCounter = 0;
    }
    
    async init() {
      if (this.isInitialized) {
        console.warn('TextExtractor already initialized');
        return;
      }
      
      console.log('📄 Initializing Enhanced TextExtractor...');
      this.isInitialized = true;
      console.log('✅ TextExtractor initialized');
    }
    
    /**
     * Main extraction method
     */
    async extractAll(config = {}) {
      if (!this.isInitialized) {
        await this.init();
      }
      
      const mergedConfig = { ...this.config, ...config };
      console.log('📄 Starting comprehensive text extraction');
      
      try {
        // Reset state for new extraction
        this.processedElements = new WeakSet();
        this.sectionCounter = 0;
        
        // Step 1: Extract all sections preserving hierarchy
        const orderedSections = this.extractComprehensiveSections(document.body, mergedConfig);
        
        // Step 2: Filter banned sections (but keep important ones like Declaration of Competing Interest)
        const filteredSections = this.intelligentFilterSections(orderedSections, mergedConfig);
        
        // Step 3: Process sections (merge if configured, otherwise keep as-is)
        const processedSections = mergedConfig.mergeShortSections ? 
          this.mergeShortSections(filteredSections, mergedConfig) : 
          filteredSections;
        
        // Step 4: Convert to object format for backward compatibility
        const sectionsObject = this.convertToSectionsObject(processedSections);
        
        // Step 5: Optimize for LLM batching
        const optimizedBatches = this.optimizeForLLM(processedSections, mergedConfig);
        
        // Step 6: Calculate statistics
        const stats = this.calculateStats(processedSections, optimizedBatches);
        
        const result = {
          sections: sectionsObject,
          orderedSections: processedSections,
          batches: optimizedBatches,
          stats: stats
        };
        
        console.log(`✅ Extraction complete: ${stats.totalSections} sections found`);
        console.log('📋 Section titles:', processedSections.map(s => s.title));
        
        return result;
        
      } catch (error) {
        console.error('❌ Text extraction failed:', error);
        return this.getFallbackContent(mergedConfig);
      }
    }
    
    /**
     * Comprehensive section extraction
     */
    extractComprehensiveSections(container, config) {
      const sections = [];
      let currentSection = null;
      let currentContent = [];
      let unnamedSectionCount = 1;
      
      // First, try to find main content area
      const mainContent = this.findMainContentArea(container);
      
      // Get ALL elements including headers and content
      const allElements = mainContent.querySelectorAll('*');
      
      console.log(`📄 Processing ${allElements.length} elements`);
      
      for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        
        // Skip if already processed or should be skipped
        if (this.processedElements.has(element) || this.shouldSkipElement(element, config)) {
          continue;
        }
        
        const tag = element.tagName;
        
        // Check if this is a header (h1-h6)
        if (/^H[1-6]$/i.test(tag)) {
          // Mark as processed
          this.processedElements.add(element);
          
          // Save previous section if exists
          if (currentSection !== null && currentContent.length > 0) {
            const content = this.joinContent(currentContent);
            if (content.length >= config.minParagraphLength) {
              sections.push(this.createSection(currentSection, content, sections.length));
            }
            currentContent = [];
          }
          
          // Get header text
          const headerText = this.cleanHeaderText(element);
          if (headerText) {
            currentSection = headerText;
            console.log(`📑 Found section: ${headerText}`);
          }
          
        } else if (this.isContentElement(element, config)) {
          // Skip if it's inside a table or figure
          if (element.closest('table, figure, .table-wrap, .fig')) {
            continue;
          }
          
          // Skip if it has child headers (it's a container)
          if (element.querySelector('h1, h2, h3, h4, h5, h6')) {
            continue;
          }
          
          // Extract text content
          const text = this.extractTextContent(element, config);
          
          if (text && text.length >= config.minParagraphLength) {
            // Mark as processed
            this.processedElements.add(element);
            
            // If no current section, check if this might be a special section
            if (currentSection === null) {
              // Check for special sections like Abstract, Keywords, Highlights
              const specialSection = this.detectSpecialSection(element, text);
              if (specialSection) {
                currentSection = specialSection;
                console.log(`📑 Detected special section: ${specialSection}`);
              } else {
                currentSection = `Section ${unnamedSectionCount++}`;
              }
            }
            
            currentContent.push(text);
          }
        }
      }
      
      // Save the last section
      if (currentSection !== null && currentContent.length > 0) {
        const content = this.joinContent(currentContent);
        if (content.length >= config.minParagraphLength) {
          sections.push(this.createSection(currentSection, content, sections.length));
        }
      }
      
      // Post-process to ensure we didn't miss any sections
      const enhancedSections = this.enhanceWithMissedSections(sections, mainContent, config);
      
      return enhancedSections;
    }
    
    /**
     * Find the main content area of the document
     */
    findMainContentArea(container) {
      // Try to find article or main content container
      const selectors = [
        'article', 
        'main',
        '[role="main"]',
        '.main-content',
        '#main-content',
        '.article-content',
        '.paper-content',
        '.content-main',
        '.els-article-content', // Elsevier specific
        '#body', // Some publishers
        '.body',
        '.fulltext',
        '#content'
      ];
      
      for (const selector of selectors) {
        const element = container.querySelector(selector);
        if (element) {
          console.log(`📍 Found main content area: ${selector}`);
          return element;
        }
      }
      
      // Fallback to body
      return container;
    }
    
    /**
     * Clean header text
     */
    cleanHeaderText(element) {
      // Get text content, removing any child elements that might interfere
      const clone = element.cloneNode(true);
      
      // Remove footnote references, badges, etc.
      clone.querySelectorAll('sup, .badge, .label, .ref').forEach(el => el.remove());
      
      let text = clone.textContent || '';
      
      // Clean up the text
      text = text
        .replace(/\s+/g, ' ')
        .replace(/^\s*[\d.]+\s*/, '') // Remove leading numbers (will be preserved in final text)
        .trim();
      
      // But preserve the original format with numbers if present
      const originalText = element.textContent.trim();
      if (/^\d+\./.test(originalText) || /^\d+\s+/.test(originalText)) {
        // Keep numbered sections as-is
        return originalText.replace(/\s+/g, ' ').trim();
      }
      
      return text || originalText;
    }
    
    /**
     * Check if element is a content element
     */
    isContentElement(element, config) {
      const tag = element.tagName.toLowerCase();
      
      // Direct content tags
      if (tag === 'p' && config.includeParagraphs) return true;
      if ((tag === 'li' || tag === 'dd' || tag === 'dt') && config.includeLists) return true;
      if (tag === 'blockquote' && config.includeBlockquotes) return true;
      if ((tag === 'pre' || tag === 'code') && config.includeCodeBlocks) return true;
      
      // Check for content containers that might have text
      if (['div', 'section', 'span'].includes(tag)) {
        // Check if it has direct text content (not just child elements)
        const hasDirectText = Array.from(element.childNodes).some(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 10
        );
        return hasDirectText;
      }
      
      return false;
    }
    
    /**
     * Extract text content from element
     */
    extractTextContent(element, config) {
      if (!element) return '';
      
      // Clone to avoid modifying original
      const clone = element.cloneNode(true);
      
      // Remove elements we want to skip
      clone.querySelectorAll('table, figure, img, svg, script, style').forEach(el => el.remove());
      
      // Get text
      let text = clone.textContent || '';
      
      // Clean the text
      text = text
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      return text;
    }
    
    /**
     * Detect special sections like Abstract, Keywords, Highlights
     */
    detectSpecialSection(element, text) {
      // Check parent elements for clues
      let current = element;
      for (let i = 0; i < 3; i++) {
        if (!current.parentElement) break;
        current = current.parentElement;
        
        // Check class and id
        const classAndId = `${current.className} ${current.id}`.toLowerCase();
        
        if (classAndId.includes('abstract')) return 'Abstract';
        if (classAndId.includes('keyword')) return 'Keywords';
        if (classAndId.includes('highlight')) return 'Highlights';
        if (classAndId.includes('summary')) return 'Summary';
      }
      
      // Check text content for clues
      const textLower = text.toLowerCase().substring(0, 100);
      if (textLower.includes('abstract')) return 'Abstract';
      if (textLower.includes('keywords:') || textLower.includes('key words:')) return 'Keywords';
      if (textLower.includes('highlights:')) return 'Highlights';
      
      return null;
    }
    
    /**
     * Enhance sections with any missed content
     */
    enhanceWithMissedSections(sections, container, config) {
      const sectionTitles = new Set(sections.map(s => s.title.toLowerCase()));
      const enhanced = [...sections];
      
      // Check for common sections that might have been missed
      const commonSections = [
        { selector: '.abstract, [class*="abstract"]', title: 'Abstract' },
        { selector: '.keywords, [class*="keyword"]', title: 'Keywords' },
        { selector: '.highlights, [class*="highlight"]', title: 'Highlights' },
        { selector: '.conclusion, [class*="conclusion"]', title: 'Conclusion' }
      ];
      
      commonSections.forEach(({ selector, title }) => {
        if (!sectionTitles.has(title.toLowerCase())) {
          const element = container.querySelector(selector);
          if (element && !this.processedElements.has(element)) {
            const text = this.extractTextContent(element, config);
            if (text && text.length >= config.minParagraphLength) {
              // Insert at appropriate position (Abstract/Keywords/Highlights at start)
              const section = this.createSection(title, text, enhanced.length);
              if (['Abstract', 'Keywords', 'Highlights'].includes(title)) {
                enhanced.unshift(section);
              } else {
                enhanced.push(section);
              }
              console.log(`📑 Added missed section: ${title}`);
            }
          }
        }
      });
      
      return enhanced;
    }
    
    /**
     * Create a section object
     */
    createSection(title, content, order) {
      return {
        id: this.generateSectionId(title),
        title: title,
        content: content,
        wordCount: this.countWords(content),
        charCount: content.length,
        order: order
      };
    }
    
    /**
     * Join content pieces
     */
    joinContent(contentPieces) {
      return contentPieces
        .filter(piece => piece && piece.trim())
        .join('\n\n');
    }
    
    /**
     * Intelligent section filtering
     */
    intelligentFilterSections(sections, config) {
      return sections.filter(section => {
        const titleLower = section.title.toLowerCase();
        const contentPreview = section.content.substring(0, 300).toLowerCase();
        
        // Keep important sections even if they have keywords
        const importantSections = [
          'declaration of competing interest',
          'credit authorship contribution statement',
          'data availability',
          'acknowledgments',
          'acknowledgements',
          'funding'
        ];
        
        // Check if it's an important section we want to keep
        if (importantSections.some(important => titleLower.includes(important))) {
          // Only filter if it's truly a banned section
          if (titleLower === 'references' || titleLower === 'bibliography') {
            console.log(`⚠️ Filtering banned section: ${section.title}`);
            return false;
          }
          // Keep it
          return true;
        }
        
        // Check against strict banned list
        if (config.bannedSections.has(titleLower)) {
          console.log(`⚠️ Filtering banned section: ${section.title}`);
          return false;
        }
        
        // Check for references/bibliography specifically
        if (titleLower.includes('reference') && !titleLower.includes('reference to')) {
          console.log(`⚠️ Filtering references section: ${section.title}`);
          return false;
        }
        
        // Check for supplementary material
        if (titleLower.includes('supplementary') || titleLower.includes('supplemental')) {
          console.log(`⚠️ Filtering supplementary section: ${section.title}`);
          return false;
        }
        
        return true;
      });
    }
    
    /**
     * Check if element should be skipped
     */
    shouldSkipElement(element, config) {
      if (!element) return true;
      
      const tag = element.tagName;
      
      // Skip banned tags
      if (config.skipTags.has(tag)) {
        return true;
      }
      
      // Skip if inside navigation, header, footer
      if (element.closest('nav, header > *, footer, aside')) {
        return true;
      }
      
      // Check visibility
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return true;
      }
      
      // Check for skip patterns in class or id
      const identifier = `${element.className || ''} ${element.id || ''}`.toLowerCase();
      
      // Skip certain UI elements
      return config.skipPatterns.some(pattern => identifier.includes(pattern));
    }
    
    /**
     * Merge short sections (optional)
     */
    mergeShortSections(sections, config) {
      const merged = [];
      let currentMerged = null;
      
      sections.forEach(section => {
        // Never merge these important sections
        const doNotMerge = [
          'abstract', 'keywords', 'highlights', 'introduction',
          'conclusion', 'methodology', 'results', 'discussion'
        ];
        
        const shouldNotMerge = doNotMerge.some(keyword => 
          section.title.toLowerCase().includes(keyword)
        );
        
        if (shouldNotMerge || section.charCount >= config.optimalBatchSize) {
          // Save current merged if exists
          if (currentMerged) {
            merged.push(currentMerged);
            currentMerged = null;
          }
          // Add important or large section as-is
          merged.push(section);
        } else if (section.charCount < config.minBatchSize) {
          // Try to merge small section
          if (!currentMerged) {
            currentMerged = { ...section };
          } else if (currentMerged.charCount + section.charCount <= config.optimalBatchSize) {
            // Merge sections
            currentMerged.title += ` / ${section.title}`;
            currentMerged.content += '\n\n' + section.content;
            currentMerged.charCount += section.charCount;
            currentMerged.wordCount += section.wordCount;
          } else {
            // Current merged is full, save it and start new
            merged.push(currentMerged);
            currentMerged = { ...section };
          }
        } else {
          // Medium-sized section, save current merged and add this
          if (currentMerged) {
            merged.push(currentMerged);
            currentMerged = null;
          }
          merged.push(section);
        }
      });
      
      // Save any remaining merged section
      if (currentMerged) {
        merged.push(currentMerged);
      }
      
      return merged;
    }
    
    /**
     * Convert ordered sections to object format
     */
    convertToSectionsObject(orderedSections) {
      const sectionsObject = {};
      
      orderedSections.forEach(section => {
        let key = section.id;
        
        // Handle duplicate keys
        let counter = 1;
        let finalKey = key;
        while (sectionsObject[finalKey]) {
          finalKey = `${key}_${counter}`;
          counter++;
        }
        
        sectionsObject[finalKey] = section.content;
      });
      
      return sectionsObject;
    }
    
    /**
     * Optimize sections for LLM batching
     */
    optimizeForLLM(sections, config) {
      const batches = [];
      let currentBatch = [];
      let currentBatchSize = 0;
      
      sections.forEach(section => {
        const sectionSize = section.charCount;
        
        // If section is too large, split it
        if (sectionSize > config.maxBatchSize) {
          // Flush current batch if not empty
          if (currentBatch.length > 0) {
            batches.push({
              sections: [...currentBatch],
              size: currentBatchSize,
              type: 'regular'
            });
            currentBatch = [];
            currentBatchSize = 0;
          }
          
          // Split large section
          const chunks = this.splitLargeSection(section, config);
          chunks.forEach(chunk => {
            batches.push({
              sections: [chunk],
              size: chunk.charCount,
              type: 'split'
            });
          });
        } else {
          // Check if adding this section exceeds batch size
          if (currentBatchSize + sectionSize > config.maxBatchSize) {
            // Flush current batch
            if (currentBatch.length > 0) {
              batches.push({
                sections: [...currentBatch],
                size: currentBatchSize,
                type: 'regular'
              });
            }
            // Start new batch
            currentBatch = [section];
            currentBatchSize = sectionSize;
          } else {
            // Add to current batch
            currentBatch.push(section);
            currentBatchSize += sectionSize;
          }
        }
      });
      
      // Flush remaining batch
      if (currentBatch.length > 0) {
        batches.push({
          sections: currentBatch,
          size: currentBatchSize,
          type: 'regular'
        });
      }
      
      console.log(`📦 Created ${batches.length} optimized batches for LLM`);
      return batches;
    }
    
    /**
     * Split large sections
     */
    splitLargeSection(section, config) {
      const chunks = [];
      const sentences = this.splitIntoSentences(section.content);
      
      let currentChunk = {
        id: section.id,
        title: section.title,
        content: '',
        wordCount: 0,
        charCount: 0,
        order: section.order
      };
      
      let partNumber = 1;
      
      sentences.forEach(sentence => {
        if (currentChunk.charCount + sentence.length > config.optimalBatchSize) {
          if (currentChunk.content) {
            currentChunk.id = `${section.id}_part_${partNumber}`;
            currentChunk.title = `${section.title} (Part ${partNumber})`;
            chunks.push(currentChunk);
            partNumber++;
            
            currentChunk = {
              id: section.id,
              title: section.title,
              content: '',
              wordCount: 0,
              charCount: 0,
              order: section.order
            };
          }
        }
        
        currentChunk.content += (currentChunk.content ? ' ' : '') + sentence;
        currentChunk.charCount += sentence.length;
        currentChunk.wordCount += this.countWords(sentence);
      });
      
      if (currentChunk.content) {
        currentChunk.id = `${section.id}_part_${partNumber}`;
        currentChunk.title = `${section.title} (Part ${partNumber})`;
        chunks.push(currentChunk);
      }
      
      return chunks;
    }
    
    /**
     * Split text into sentences
     */
    splitIntoSentences(text) {
      const sentences = [];
      const regex = /[^.!?]+[.!?]+/g;
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        sentences.push(match[0].trim());
      }
      
      const lastIndex = regex.lastIndex || 0;
      if (lastIndex < text.length) {
        const remainder = text.substring(lastIndex).trim();
        if (remainder) {
          sentences.push(remainder);
        }
      }
      
      return sentences.length > 0 ? sentences : [text];
    }
    
    /**
     * Generate section ID
     */
    generateSectionId(title) {
      // Preserve numbers in section titles
      return title
        .toLowerCase()
        .replace(/[^\w\s\d]/g, '') // Keep numbers
        .replace(/\s+/g, '_')
        .substring(0, 50);
    }
    
    /**
     * Count words
     */
    countWords(text) {
      return text.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    /**
     * Calculate statistics
     */
    calculateStats(sections, batches) {
      const totalSections = sections.length;
      const totalChars = sections.reduce((sum, section) => sum + section.charCount, 0);
      const totalWords = sections.reduce((sum, section) => sum + section.wordCount, 0);
      
      const batchCount = batches.length;
      const avgBatchSize = batches.length > 0 
        ? Math.round(batches.reduce((sum, batch) => sum + batch.size, 0) / batches.length)
        : 0;
      
      const estimatedTokens = Math.round(totalChars / 4);
      
      return {
        totalSections: totalSections,
        totalCharacters: totalChars,
        totalWords: totalWords,
        totalBatches: batchCount,
        averageBatchSize: avgBatchSize,
        estimatedTokens: estimatedTokens,
        estimatedLLMCalls: batchCount
      };
    }
    
    /**
     * Get fallback content
     */
    getFallbackContent(config) {
      console.log('⚠️ Using fallback content extraction');
      
      const bodyText = document.body.innerText || document.body.textContent || '';
      const cleanedText = bodyText.replace(/\s+/g, ' ').trim();
      
      const fallbackSection = {
        id: 'main_content',
        title: 'Main Content',
        content: cleanedText || 'Unable to extract content from this page.',
        wordCount: this.countWords(cleanedText),
        charCount: cleanedText.length,
        order: 0
      };
      
      return {
        sections: {
          main_content: fallbackSection.content
        },
        orderedSections: [fallbackSection],
        batches: [{
          sections: [fallbackSection],
          size: fallbackSection.charCount,
          type: 'fallback'
        }],
        stats: {
          totalSections: 1,
          totalCharacters: fallbackSection.charCount,
          totalWords: fallbackSection.wordCount,
          totalBatches: 1,
          averageBatchSize: fallbackSection.charCount,
          estimatedTokens: Math.round(fallbackSection.charCount / 4),
          estimatedLLMCalls: 1
        }
      };
    }
    
    /**
     * Alias for backward compatibility
     */
    async extractSections(config = {}) {
      const result = await this.extractAll(config);
      return {
        sections: result.sections,
        stats: result.stats
      };
    }
    
    /**
     * Clean up
     */
    cleanup() {
      this.processedElements = new WeakSet();
      this.sectionCounter = 0;
      this.isInitialized = false;
      console.log('🧹 TextExtractor cleaned up');
    }
  }
  
  // Create singleton instance
  const textExtractor = new TextExtractor();
  
  // Register with service registry if available
  if (global.serviceRegistry) {
    global.serviceRegistry.register('textExtractor', textExtractor);
    console.log('📝 TextExtractor registered with serviceRegistry');
  }
  
  // Expose globally
  global.textExtractor = textExtractor;
  global.TextExtractor = TextExtractor;
  
  console.log('📢 Enhanced TextExtractor exposed to global scope');
  
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[extraction/TextExtractor.js] Error:', error);
    }
  })();

  // ===== Module: extraction/TableExtractor.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/extraction/TableExtractor.js
/**
 * Table Extractor for ORKG Content Script
 * Integrates with the existing service registry system
 */

(function(global) {
  'use strict';
  
  console.log('📊 TableExtractor module loading...');
  
  // Table Extractor Class
  class TableExtractor {
    constructor() {
      this.isInitialized = false;
      this.extractedTables = [];
      this.debug = true;
    }
    
    /**
     * Initialize the table extractor
     */
    async init() {
      if (this.isInitialized) {
        console.warn('TableExtractor already initialized');
        return;
      }
      
      console.log('📊 Initializing TableExtractor...');
      this.isInitialized = true;
      console.log('✅ TableExtractor initialized');
    }
    
    /**
     * Main extraction method
     */
    async extractTables(config = {}) {
      console.log('📊 Starting table extraction...');
      this.extractedTables = [];
      
      try {
        // Strategy 1: Find all direct table elements
        const tables = document.querySelectorAll('table');
        console.log(`Found ${tables.length} <table> elements`);
        
        tables.forEach((table, index) => {
          this.extractedTables.push(this.processTableElement(table, index));
        });
        
        // Strategy 2: Find table containers by ID patterns
        const tableIdElements = document.querySelectorAll(
          '[id*="table" i], [id*="tbl" i], [id*="tab" i], ' +
          '[id^="table"], [id^="tbl"], [id^="tab"], ' +
          '[id^="Table"], [id^="Tab"]'
        );
        console.log(`Found ${tableIdElements.length} elements with table-like IDs`);
        
        tableIdElements.forEach((element, index) => {
          if (!this.isAlreadyProcessed(element)) {
            const data = this.processTableContainer(element, index);
            if (data) this.extractedTables.push(data);
          }
        });
        
        // Strategy 3: Find table containers by class
        const tableClassElements = document.querySelectorAll(
          '.table, .data-table, .c-article-table, ' +
          '[class*="table"], [class*="Table"]'
        );
        console.log(`Found ${tableClassElements.length} elements with table-like classes`);
        
        tableClassElements.forEach((element, index) => {
          if (!this.isAlreadyProcessed(element)) {
            const data = this.processTableContainer(element, index);
            if (data) this.extractedTables.push(data);
          }
        });
        
        // Strategy 4: Find figures that might contain tables
        const figures = document.querySelectorAll('figure, .figure');
        figures.forEach((figure, index) => {
          const hasTable = figure.querySelector('table');
          const hasTableCaption = (figure.textContent || '').match(/table\s+\d+/i);
          
          if ((hasTable || hasTableCaption) && !this.isAlreadyProcessed(figure)) {
            const data = this.processFigure(figure, index);
            if (data) this.extractedTables.push(data);
          }
        });
        
        // Strategy 5: Publisher-specific patterns
        this.extractPublisherSpecificTables();
        
        // Remove duplicates and sort
        this.deduplicateAndSort();
        
        // ✅ Filter only captioned tables
        this.extractedTables = this.extractedTables.filter(t => !!t.caption);

        console.log(`✅ Extracted ${this.extractedTables.length} tables with captions`);
        
        // Return in the format expected by the extension
        return {
          tables: this.extractedTables,
          count: this.extractedTables.length,
          stats: this.calculateStats()
        };
        
      } catch (error) {
        console.error('❌ Table extraction failed:', error);
        return {
          tables: [],
          count: 0,
          stats: {},
          error: error.message
        };
      }
    }
    
    /**
     * Process a table element
     */
    processTableElement(table, index) {
      const rect = table.getBoundingClientRect();
      
      return {
        id: table.id || `table_${index}`,
        type: 'table_element',
        tagName: 'TABLE',
        element: table,
        caption: this.extractCaption(table),
        headers: this.extractHeaders(table),
        rows: this.extractRows(table),
        position: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        },
        isVisible: this.isVisible(table),
        content: this.extractTableContent(table)
      };
    }
    
    /**
     * Process a table container element
     */
    processTableContainer(element, index) {
      const table = element.querySelector('table');
      const rect = element.getBoundingClientRect();
      
      const data = {
        id: element.id || `container_${index}`,
        type: 'container',
        tagName: element.tagName,
        element: element,
        caption: this.extractCaption(element),
        hasTable: !!table,
        position: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        },
        isVisible: this.isVisible(element)
      };
      
      if (table) {
        data.headers = this.extractHeaders(table);
        data.rows = this.extractRows(table);
        data.content = this.extractTableContent(table);
      }
      
      // Check for table links (common in academic papers)
      const tableLink = element.querySelector('a[href*="table"], a[href*="Table"]');
      if (tableLink) {
        data.link = tableLink.href;
      }
      
      return data;
    }
    
    /**
     * Process a figure element
     */
    processFigure(figure, index) {
      const table = figure.querySelector('table');
      const figcaption = figure.querySelector('figcaption');
      const rect = figure.getBoundingClientRect();
      
      const data = {
        id: figure.id || `figure_${index}`,
        type: 'figure',
        tagName: 'FIGURE',
        element: figure,
        caption: figcaption ? figcaption.textContent.trim() : this.extractCaption(figure),
        hasTable: !!table,
        position: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        },
        isVisible: this.isVisible(figure)
      };
      
      if (table) {
        data.headers = this.extractHeaders(table);
        data.rows = this.extractRows(table);
        data.content = this.extractTableContent(table);
      }
      
      return data;
    }
    
    /**
     * Extract publisher-specific tables
     */
    extractPublisherSpecificTables() {
      const hostname = window.location.hostname;
      
      // ScienceDirect/Elsevier
      if (hostname.includes('sciencedirect') || hostname.includes('elsevier')) {
        console.log('📚 Applying ScienceDirect/Elsevier extraction...');
        
        // Tables with IDs like tbl0010, tbl0020
        for (let i = 0; i <= 100; i += 10) {
          const id = `tbl${String(i).padStart(4, '0')}`;
          const element = document.getElementById(id);
          
          if (element && !this.isAlreadyProcessed(element)) {
            const data = this.processTableContainer(element, this.extractedTables.length);
            if (data) {
              data.publisher = 'elsevier';
              this.extractedTables.push(data);
            }
          }
        }
      }
      
      // BMC/Springer/Nature
      if (hostname.includes('biomedcentral') || hostname.includes('springer') || hostname.includes('nature')) {
        console.log('📚 Applying BMC/Springer/Nature extraction...');
        
        // Tables with IDs like Tab1, Tab2
        for (let i = 1; i <= 20; i++) {
          const id = `Tab${i}`;
          const element = document.getElementById(id);
          
          if (element && !this.isAlreadyProcessed(element)) {
            const data = this.processTableContainer(element, this.extractedTables.length);
            if (data) {
              data.publisher = 'springer';
              this.extractedTables.push(data);
            }
          }
        }
        
        // Also check for .c-article-table containers
        const containers = document.querySelectorAll('.c-article-table, [data-container-section="table"]');
        containers.forEach((container, index) => {
          if (!this.isAlreadyProcessed(container)) {
            const data = this.processTableContainer(container, this.extractedTables.length);
            if (data) {
              data.publisher = 'springer';
              this.extractedTables.push(data);
            }
          }
        });
      }
    }
    
    /**
     * Extract table headers
     */
    extractHeaders(table) {
      const headers = [];
      
      if (!table) return headers;
      
      // Try thead first
      const theadCells = table.querySelectorAll('thead th, thead td');
      if (theadCells.length > 0) {
        theadCells.forEach(cell => {
          headers.push(this.cleanText(cell.textContent));
        });
        return headers;
      }
      
      // Try first row
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const cells = firstRow.querySelectorAll('th, td');
        cells.forEach(cell => {
          headers.push(this.cleanText(cell.textContent));
        });
      }
      
      return headers;
    }
    
    /**
     * Extract table rows
     */
    extractRows(table) {
      const rows = [];
      
      if (!table) return rows;
      
      const allRows = table.querySelectorAll('tr');
      let startIndex = 0;
      
      // Skip header row if present
      const firstRow = allRows[0];
      if (firstRow && firstRow.querySelector('th')) {
        startIndex = 1;
      }
      
      for (let i = startIndex; i < allRows.length; i++) {
        const row = allRows[i];
        const rowData = [];
        
        const cells = row.querySelectorAll('td, th');
        cells.forEach(cell => {
          rowData.push(this.cleanText(cell.textContent));
        });
        
        if (rowData.length > 0) {
          rows.push(rowData);
        }
      }
      
      return rows;
    }
    
    /**
     * Extract full table content
     */
    extractTableContent(table) {
      if (!table) return null;
      
      return {
        headers: this.extractHeaders(table),
        rows: this.extractRows(table),
        html: table.outerHTML.substring(0, 500), // First 500 chars
        text: this.cleanText(table.textContent)
      };
    }
    
    /**
     * Extract caption from various sources
     */
    extractCaption(element) {
      if (!element) return null;
      
      // Direct caption element
      const caption = element.querySelector('caption');
      if (caption) return this.cleanText(caption.textContent);
      
      // Figcaption
      const figcaption = element.querySelector('figcaption');
      if (figcaption) return this.cleanText(figcaption.textContent);
      
      // Caption classes
      const captionClass = element.querySelector('.caption, .table-caption, [class*="caption"]');
      if (captionClass) return this.cleanText(captionClass.textContent);
      
      // Bold/strong with Table text
      const boldCaption = element.querySelector('b, strong');
      if (boldCaption) {
        const text = this.cleanText(boldCaption.textContent);
        if (text.match(/table\s+\d+/i)) return text;
      }
      
      // Check first line of text
      const text = this.cleanText(element.textContent);
      const firstLine = text.split('\n')[0];
      if (firstLine.match(/^table\s+\d+/i) && firstLine.length < 200) {
        return firstLine;
      }
      
      return null;
    }
    
    /**
     * Check if element is visible
     */
    isVisible(element) {
      if (!element) return false;
      
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      return style.display !== 'none' && 
             style.visibility !== 'hidden' &&
             rect.width > 0 && 
             rect.height > 0;
    }
    
    /**
     * Check if element was already processed
     */
    isAlreadyProcessed(element) {
      return this.extractedTables.some(table => 
        table.element === element || 
        (table.element && table.element.contains(element))
      );
    }
    
    /**
     * Remove duplicates and sort tables
     */
    deduplicateAndSort() {
      // Remove duplicates based on element reference
      const seen = new Set();
      const unique = [];
      
      this.extractedTables.forEach(table => {
        if (!seen.has(table.element)) {
          seen.add(table.element);
          unique.push(table);
        }
      });
      
      // Sort by position
      unique.sort((a, b) => {
        if (a.position && b.position) {
          return a.position.top - b.position.top;
        }
        return 0;
      });
      
      this.extractedTables = unique;
    }
    
    /**
     * Calculate statistics
     */
    calculateStats() {
      return {
        totalTables: this.extractedTables.length,
        visibleTables: this.extractedTables.filter(t => t.isVisible).length,
        hiddenTables: this.extractedTables.filter(t => !t.isVisible).length,
        tablesWithCaptions: this.extractedTables.filter(t => t.caption).length,
        actualTables: this.extractedTables.filter(t => t.type === 'table_element').length,
        containers: this.extractedTables.filter(t => t.type === 'container').length,
        figures: this.extractedTables.filter(t => t.type === 'figure').length
      };
    }
    
    /**
     * Clean text helper
     */
    cleanText(text) {
      if (!text) return '';
      return text.replace(/\s+/g, ' ').trim();
    }
    
    /**
     * Clean up
     */
    cleanup() {
      this.extractedTables = [];
      this.isInitialized = false;
      console.log('🧹 TableExtractor cleaned up');
    }
  }
  
  // Create instance
  const tableExtractor = new TableExtractor();
  
  // Register with service registry if available
  if (global.serviceRegistry && global.serviceRegistry.register) {
    console.log('📊 Registering TableExtractor with service registry...');
    global.serviceRegistry.register('tableExtractor', tableExtractor);
  } else {
    console.warn('⚠️ Service registry not found, exposing TableExtractor globally');
    global.tableExtractor = tableExtractor;
  }
  
  // Also expose class for direct use
  global.TableExtractor = TableExtractor;
  
  // Convenience function for testing
  global.testTableExtraction = async function() {
    console.log('🧪 Testing table extraction...');
    
    // Try to get from service registry first
    let extractor = null;
    
    if (global.serviceRegistry && global.serviceRegistry.get) {
      extractor = global.serviceRegistry.get('tableExtractor');
    }
    
    if (!extractor) {
      extractor = global.tableExtractor || new TableExtractor();
    }
    
    if (!extractor.isInitialized) {
      await extractor.init();
    }
    
    const result = await extractor.extractTables();
    console.log('Extraction result:', result);
    
    if (result.count > 0) {
      console.log('First table:', result.tables[0]);
    }
    
    return result;
  };
  
  console.log('✅ TableExtractor module loaded');
  console.log('Run testTableExtraction() to test');
  
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[extraction/TableExtractor.js] Error:', error);
    }
  })();

  // ===== Module: extraction/ImageExtractor.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/extraction/ImageExtractor.js
// Extracts images from the page, detecting types and calculating importance scores
// for use in content analysis and marker placement.
/**
 * Image Extractor for ORKG Content Script
 * 
 * Extracts and analyzes images on the page with the following features:
 * - Dimension-based filtering
 * - Type detection (charts, diagrams, figures)
 * - Caption extraction
 * - Importance scoring
 * - Position calculation
 */


class ImageExtractor {
  constructor() {
    this.isInitialized = false;
    this.config = {
      minWidth: 100,
      minHeight: 100,
      skipIcons: true,
      detectType: true,
      calculateImportance: true,
      extractCaption: true,
      includeBackgroundImages: false
    };
  }
  
  /**
   * Initialize the image extractor
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isInitialized) {
      console.warn('ImageExtractor already initialized');
      return;
    }
    
    console.log('🖼️ Initializing ImageExtractor...');
    
    // No need to initialize anything yet
    this.isInitialized = true;
    console.log('✅ ImageExtractor initialized');
  }
  
  /**
   * Extract all images from the page
   * @param {Object} [config] - Extraction configuration
   * @returns {Promise<Object>} - Extracted images with stats
   */
  async extractImages(config = {}) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    // Merge with default configuration
    const mergedConfig = { ...this.config, ...config };
    console.log('🖼️ Extracting images with config:', mergedConfig);
    
    try {
      // Extract images with different strategies
      const imgElements = this.extractImgElements(mergedConfig);
      const backgroundImages = mergedConfig.includeBackgroundImages ? 
        this.extractBackgroundImages(mergedConfig) : [];
      
      // Combine results
      const allImages = [...imgElements, ...backgroundImages];
      
      // Calculate statistics
      const stats = {
        totalImages: allImages.length,
        withCaptions: allImages.filter(img => img.context?.caption).length,
        byType: this.countByType(allImages),
        averageSize: this.calculateAverageSize(allImages)
      };
      
      console.log(`✅ Extracted ${allImages.length} images`);
      
      // Return standardized result
      return {
        images: allImages,
        count: allImages.length,
        stats: stats
      };
      
    } catch (error) {
      console.error('❌ Image extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * Extract all img elements from the page
   * @param {Object} config - Extraction configuration
   * @returns {Array<Object>} - Extracted image data
   * @private
   */
  extractImgElements(config) {
    const images = [];
    const imgElements = document.querySelectorAll('img');
    
    imgElements.forEach((img, index) => {
      try {
        // Skip if doesn't meet minimum size
        if (!this.meetsMinimumSize(img, config)) {
          return;
        }
        
        // Skip if not visible
        if (!isElementVisible(img)) {
          return;
        }
        
        // Extract image data
        const imageData = this.extractImageData(img, index, config);
        
        // Skip icons if configured
        if (config.skipIcons && this.isLikelyIcon(imageData)) {
          return;
        }
        
        // Add importance score if configured
        if (config.calculateImportance) {
          imageData.importance = this.calculateImportance(imageData);
        }
        
        images.push(imageData);
        
      } catch (error) {
        console.warn(`Error extracting image #${index}:`, error);
      }
    });
    
    return images;
  }
  
  /**
   * Extract background images from elements
   * @param {Object} config - Extraction configuration
   * @returns {Array<Object>} - Extracted background image data
   * @private
   */
  extractBackgroundImages(config) {
    const images = [];
    const elements = document.querySelectorAll('[style*="background-image"]');
    
    elements.forEach((element, index) => {
      try {
        // Get computed style
        const style = window.getComputedStyle(element);
        const backgroundImage = style.backgroundImage;
        
        // Skip if no background image or is none/gradient
        if (!backgroundImage || 
            backgroundImage === 'none' || 
            backgroundImage.startsWith('linear-gradient')) {
          return;
        }
        
        // Extract URL from background-image
        const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (!urlMatch) return;
        
        const url = urlMatch[1];
        
        // Skip if element is too small
        const rect = getElementRect(element);
        if (rect.width < config.minWidth || rect.height < config.minHeight) {
          return;
        }
        
        // Create image data
        const imageData = {
          id: `bg_${index}_${Date.now()}`,
          src: url,
          alt: element.getAttribute('aria-label') || '',
          title: element.title || '',
          type: 'background',
          dimensions: {
            width: rect.width,
            height: rect.height
          },
          position: {
            top: rect.top,
            left: rect.left
          },
          context: {
            element: element.tagName,
            classes: element.className,
            inFigure: false,
            caption: null
          }
        };
        
        // Add importance score if configured
        if (config.calculateImportance) {
          imageData.importance = this.calculateImportance(imageData);
        }
        
        images.push(imageData);
        
      } catch (error) {
        console.warn(`Error extracting background image #${index}:`, error);
      }
    });
    
    return images;
  }
  
  /**
   * Extract data for a single image
   * @param {HTMLImageElement} img - Image element
   * @param {number} index - Image index
   * @param {Object} config - Extraction configuration
   * @returns {Object} - Image data
   * @private
   */
  extractImageData(img, index, config) {
    // Get position and dimensions
    const rect = getElementRect(img);
    
    // Extract context
    const context = this.extractImageContext(img, config);
    
    // Determine image type
    const type = config.detectType ? 
      this.detectImageType(img, context) : 'image';
    
    return {
      id: `img_${index}_${Date.now()}`,
      src: img.src || img.currentSrc || img.getAttribute('src'),
      alt: img.alt || '',
      title: img.title || '',
      type: type,
      dimensions: {
        width: img.naturalWidth || rect.width,
        height: img.naturalHeight || rect.height
      },
      position: {
        top: rect.top,
        left: rect.left
      },
      context: context
    };
  }
  
  /**
   * Extract context information for an image
   * @param {HTMLImageElement} img - Image element
   * @param {Object} config - Extraction configuration
   * @returns {Object} - Context information
   * @private
   */
  extractImageContext(img, config) {
    // Check if image is inside a figure
    const figure = img.closest('figure, .figure');
    
    // Try to find caption
    let caption = null;
    if (config.extractCaption) {
      caption = this.extractCaption(img, figure);
    }
    
    // Look for other context clues
    const nearestHeading = this.findNearestHeading(img);
    
    return {
      caption: caption,
      label: figure ? (figure.id || 'Figure') : null,
      inFigure: !!figure,
      nearestHeading: nearestHeading,
      section: this.findSectionName(img)
    };
  }
  
  /**
   * Extract caption for an image
   * @param {HTMLImageElement} img - Image element
   * @param {Element} figure - Figure element (if any)
   * @returns {string|null} - Caption text
   * @private
   */
  extractCaption(img, figure) {
    // Try figcaption if in figure
    if (figure) {
      const figcaption = figure.querySelector('figcaption, .caption');
      if (figcaption) {
        return figcaption.textContent.trim();
      }
    }
    
    // Try aria-label
    if (img.getAttribute('aria-label')) {
      return img.getAttribute('aria-label');
    }
    
    // Try alt text if descriptive (more than a few words)
    if (img.alt && img.alt.split(/\s+/).length > 3) {
      return img.alt;
    }
    
    // Try adjacent elements that might be captions
    const nextElement = img.nextElementSibling;
    if (nextElement && 
        (nextElement.classList.contains('caption') || 
         nextElement.tagName === 'EM' || 
         nextElement.tagName === 'SMALL')) {
      return nextElement.textContent.trim();
    }
    
    return null;
  }
  
  /**
   * Find nearest heading for an image
   * @param {HTMLImageElement} img - Image element
   * @returns {string|null} - Heading text
   * @private
   */
  findNearestHeading(img) {
    // Look for preceding heading
    let currentElement = img;
    while (currentElement) {
      currentElement = currentElement.previousElementSibling;
      
      if (currentElement && /^H[1-6]$/.test(currentElement.tagName)) {
        return currentElement.textContent.trim();
      }
      
      // Stop if we reach another image or a significant boundary
      if (currentElement && 
          (currentElement.tagName === 'IMG' || 
           currentElement.tagName === 'HR' || 
           currentElement.tagName === 'SECTION')) {
        break;
      }
    }
    
    // Look for parent section's heading
    const section = img.closest('section');
    if (section) {
      const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) {
        return heading.textContent.trim();
      }
    }
    
    return null;
  }
  
  /**
   * Find section name for an image
   * @param {HTMLImageElement} img - Image element
   * @returns {string} - Section name
   * @private
   */
  findSectionName(img) {
    const sectionElements = [
      'section', 'article', '.section', '[role="region"]'
    ];
    
    for (const selector of sectionElements) {
      const section = img.closest(selector);
      if (section) {
        // Try to find id/class that suggests a section name
        if (section.id && section.id !== 'content' && section.id !== 'main') {
          return section.id.replace(/-/g, ' ');
        }
        
        // Look for a heading
        const heading = section.querySelector('h1, h2, h3, h4');
        if (heading) {
          return heading.textContent.trim();
        }
      }
    }
    
    return 'main';
  }
  
  /**
   * Detect image type
   * @param {HTMLImageElement} img - Image element
   * @param {Object} context - Image context
   * @returns {string} - Image type
   * @private
   */
  detectImageType(img, context) {
    // Combine all available text
    const text = [
      img.alt,
      img.title,
      context.caption,
      context.nearestHeading
    ].filter(Boolean).join(' ').toLowerCase();
    
    // Check for specific types
    if (text.includes('chart') || 
        text.includes('graph') || 
        text.includes('plot')) {
      return 'chart';
    }
    
    if (text.includes('diagram') || 
        text.includes('workflow') || 
        text.includes('architecture')) {
      return 'diagram';
    }
    
    if (text.includes('table') || 
        text.includes('tabular')) {
      return 'table';
    }
    
    if (text.includes('screenshot') || 
        text.includes('screen shot')) {
      return 'screenshot';
    }
    
    if (text.includes('equation') || 
        text.includes('formula') || 
        text.includes('math')) {
      return 'equation';
    }
    
    // Fall back to figure if in a figure element
    if (context.inFigure) {
      return 'figure';
    }
    
    // Default type
    return 'image';
  }
  
  /**
   * Check if image meets minimum size requirements
   * @param {HTMLImageElement} img - Image element
   * @param {Object} config - Extraction configuration
   * @returns {boolean} - True if meets minimum size
   * @private
   */
  meetsMinimumSize(img, config) {
    const rect = img.getBoundingClientRect();
    
    // Check displayed size
    if (rect.width < config.minWidth || rect.height < config.minHeight) {
      return false;
    }
    
    // Check natural size if available
    if (img.naturalWidth && img.naturalHeight) {
      if (img.naturalWidth < config.minWidth || img.naturalHeight < config.minHeight) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Check if image is likely an icon
   * @param {Object} imageData - Image data
   * @returns {boolean} - True if likely an icon
   * @private
   */
  isLikelyIcon(imageData) {
    // Check dimensions
    const { width, height } = imageData.dimensions;
    if (width < 50 && height < 50) {
      return true;
    }
    
    // Check square ratio (common for icons)
    if (Math.abs(width - height) < 5 && width < 64) {
      return true;
    }
    
    // Check filename for icon indicators
    const src = imageData.src.toLowerCase();
    const iconIndicators = ['icon', 'logo', 'favicon', 'bullet', 'avatar'];
    
    if (iconIndicators.some(indicator => src.includes(indicator))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate importance score for an image
   * @param {Object} imageData - Image data
   * @returns {Object} - Importance score and level
   * @private
   */
  calculateImportance(imageData) {
    let score = 0.5; // Base score
    
    // Context factors
    if (imageData.context.inFigure) score += 0.2;
    if (imageData.context.caption) score += 0.15;
    if (imageData.context.nearestHeading) score += 0.1;
    
    // Type factors
    if (imageData.type === 'chart') score += 0.15;
    if (imageData.type === 'diagram') score += 0.15;
    if (imageData.type === 'figure') score += 0.1;
    if (imageData.type === 'screenshot') score += 0.05;
    
    // Size factors
    const { width, height } = imageData.dimensions;
    const area = width * height;
    if (area > 250000) score += 0.1; // Very large image (500x500+)
    if (width > 800 || height > 600) score += 0.05; // High resolution
    
    // Cap at 1.0
    score = Math.min(score, 1.0);
    
    // Determine importance level
    const level = score >= 0.8 ? 'high' : 
                 score >= 0.6 ? 'medium' : 
                 score >= 0.4 ? 'low' : 'negligible';
    
    return { score, level };
  }
  
  /**
   * Count images by type
   * @param {Array<Object>} images - Image data array
   * @returns {Object} - Counts by type
   * @private
   */
  countByType(images) {
    const counts = {};
    
    images.forEach(img => {
      const type = img.type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    
    return counts;
  }
  
  /**
   * Calculate average image size
   * @param {Array<Object>} images - Image data array
   * @returns {Object} - Average width and height
   * @private
   */
  calculateAverageSize(images) {
    if (images.length === 0) {
      return { width: 0, height: 0 };
    }
    
    let totalWidth = 0;
    let totalHeight = 0;
    
    images.forEach(img => {
      totalWidth += img.dimensions.width || 0;
      totalHeight += img.dimensions.height || 0;
    });
    
    return {
      width: Math.round(totalWidth / images.length),
      height: Math.round(totalHeight / images.length)
    };
  }
  
  /**
   * Clean up image extractor
   */
  cleanup() {
    this.isInitialized = false;
    console.log('🧹 ImageExtractor cleaned up');
  }
}

// Create instance
const imageExtractor = new ImageExtractor();

// Register with service registry
serviceRegistry.register('imageExtractor', imageExtractor);

imageExtractor;
    } catch (error) {
      console.error('[extraction/ImageExtractor.js] Error:', error);
    }
  })();

  // ===== Module: handlers/ExtractionHandler.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/handlers/ExtractionHandler.js - CLEAN ORCHESTRATOR
// ================================

(function(global) {
  'use strict';
  
  /**
   * ExtractionHandler Service
   * 
   * Acts as an orchestrator for extraction operations.
   * Delegates actual extraction work to specialized extractors.
   * Handles message routing, state management, and coordination.
   */
  class ExtractionHandler {
    constructor() {
      this.isInitialized = false;
      
      // References to extractor instances
      this.extractors = {
        text: null,
        table: null,
        image: null
      };
      
      // Extraction state management
      this.state = {
        isExtracting: false,
        currentExtractionType: null,
        activeExtractions: new Map(),
        statistics: {
          text: { totalExtractions: 0, lastExtracted: null },
          table: { totalExtractions: 0, lastExtracted: null },
          image: { totalExtractions: 0, lastExtracted: null }
        }
      };
      
      // BIND ALL METHODS TO ENSURE THEY'RE AVAILABLE ON THE INSTANCE
      this.bindMethods();
      
      console.log('📤 ExtractionHandler orchestrator created');
    }

    /**
     * Bind all methods to ensure they're available on the instance
     * @private
     */
    bindMethods() {
      // Core methods
      this.init = this.init.bind(this);
      this.initializeExtractors = this.initializeExtractors.bind(this);
      this.getOrCreateExtractor = this.getOrCreateExtractor.bind(this);
      this.registerMessageHandlers = this.registerMessageHandlers.bind(this);
      
      // Orchestration methods
      this.orchestrateExtraction = this.orchestrateExtraction.bind(this);
      this.orchestrateAllExtractions = this.orchestrateAllExtractions.bind(this);
      this.getExtractionMethod = this.getExtractionMethod.bind(this);
      this.processExtractionResult = this.processExtractionResult.bind(this);
      this.ensureTextResultFormat = this.ensureTextResultFormat.bind(this);
      this.ensureTableResultFormat = this.ensureTableResultFormat.bind(this);
      this.ensureImageResultFormat = this.ensureImageResultFormat.bind(this);
      this.getEmptyResult = this.getEmptyResult.bind(this);
      this.getItemCount = this.getItemCount.bind(this);
      this.calculateTextStats = this.calculateTextStats.bind(this);
      this.calculateTableStats = this.calculateTableStats.bind(this);
      this.calculateImageStats = this.calculateImageStats.bind(this);
      this.generateStats = this.generateStats.bind(this);
      this.updateStatistics = this.updateStatistics.bind(this);
      this.cleanupOldExtractions = this.cleanupOldExtractions.bind(this);
      
      // Control methods
      this.cancelExtraction = this.cancelExtraction.bind(this);
      this.getStatus = this.getStatus.bind(this);
      
      // UI methods
      this.showOverlay = this.showOverlay.bind(this);
      this.updateOverlayMessage = this.updateOverlayMessage.bind(this);
      this.hideOverlay = this.hideOverlay.bind(this);
      
      // Public API methods
      this.extractText = this.extractText.bind(this);
      this.extractTables = this.extractTables.bind(this);
      this.extractImages = this.extractImages.bind(this);
      this.extractAll = this.extractAll.bind(this);
      this.isExtracting = this.isExtracting.bind(this);
      this.getCurrentExtractionType = this.getCurrentExtractionType.bind(this);
      this.getExtractionHistory = this.getExtractionHistory.bind(this);
      this.clearHistory = this.clearHistory.bind(this);
      this.cleanup = this.cleanup.bind(this);
    }
    
    /**
     * Initialize the extraction handler
     */
    async init() {
      if (this.isInitialized) {
        console.warn('ExtractionHandler already initialized');
        return;
      }
      
      console.log('📤 Initializing ExtractionHandler orchestrator...');
      
      try {
        // Initialize extractors
        await this.initializeExtractors();
        
        // Register message handlers
        this.registerMessageHandlers();
        
        this.isInitialized = true;
        console.log('✅ ExtractionHandler orchestrator initialized');
      } catch (error) {
        console.error('❌ Failed to initialize ExtractionHandler:', error);
        throw error;
      }
    }
    
    /**
     * Initialize individual extractors
     * @private
     */
    async initializeExtractors() {
      const registry = global.serviceRegistry;
      console.log('📤 Initializing extractors...');
      
      // Initialize TextExtractor
      this.extractors.text = await this.getOrCreateExtractor('text', 'TextExtractor', 'textExtractor');
      
      // Initialize TableExtractor
      this.extractors.table = await this.getOrCreateExtractor('table', 'TableExtractor', 'tableExtractor');
      
      // Initialize ImageExtractor
      this.extractors.image = await this.getOrCreateExtractor('image', 'ImageExtractor', 'imageExtractor');
      
      console.log('📤 Extractors initialized:', {
        text: !!this.extractors.text,
        table: !!this.extractors.table,
        image: !!this.extractors.image
      });
    }
    
    /**
     * Get or create an extractor instance
     * @private
     */
    async getOrCreateExtractor(type, className, instanceName) {
      try {
        let extractor = null;
        const registry = global.serviceRegistry;
        
        // Check global class
        if (global[className]) {
          extractor = new global[className]();
        }
        // Check global instance
        else if (global[instanceName]) {
          extractor = global[instanceName];
        }
        // Check service registry
        else if (registry?.has(instanceName)) {
          extractor = registry.get(instanceName);
        }
        
        // Initialize if needed
        if (extractor && typeof extractor.init === 'function') {
          await extractor.init();
          console.log(`✅ ${className} initialized`);
        }
        
        return extractor;
        
      } catch (error) {
        console.warn(`⚠️ Failed to initialize ${className}:`, error);
        return null;
      }
    }
    
    /**
     * Register message handlers
     * @private
     */
    registerMessageHandlers() {
      const messageHandler = global.serviceRegistry?.get('messageHandler') || global.messageHandler;
      
      if (!messageHandler) {
        console.warn('⚠️ MessageHandler not available');
        return;
      }
      
      // Register extraction message handlers
      messageHandler.registerHandler('EXTRACT_TEXT', (msg) => this.orchestrateExtraction('text', msg));
      messageHandler.registerHandler('EXTRACT_TABLES', (msg) => this.orchestrateExtraction('table', msg));
      messageHandler.registerHandler('EXTRACT_IMAGES', (msg) => this.orchestrateExtraction('image', msg));
      messageHandler.registerHandler('EXTRACT_ALL', (msg) => this.orchestrateAllExtractions(msg));
      messageHandler.registerHandler('GET_EXTRACTION_STATUS', () => this.getStatus());
      messageHandler.registerHandler('CANCEL_EXTRACTION', () => this.cancelExtraction());
      
      console.log('📤 Message handlers registered');
    }
    
    // ================================
    // Core Orchestration Method
    // ================================
    
    /**
     * Orchestrate extraction for a specific type
     * @param {string} type - Type of extraction (text/table/image)
     * @param {Object} message - Message containing options
     */
    async orchestrateExtraction(type, message = {}) {
      // Check if already extracting
      if (this.state.isExtracting) {
        return {
          success: false,
          error: 'Another extraction is already in progress',
          type: this.state.currentExtractionType
        };
      }
      
      // Check if extractor is available
      const extractor = this.extractors[type];
      if (!extractor) {
        return {
          success: false,
          error: `${type} extractor is not available`,
          type: type
        };
      }
      
      const extractionId = `${type}_${Date.now()}`;
      
      try {
        console.log(`📤 Orchestrating ${type} extraction: ${extractionId}`);
        
        // Update state
        this.state.isExtracting = true;
        this.state.currentExtractionType = type;
        
        // Track extraction
        const extractionRecord = {
          id: extractionId,
          type: type,
          startTime: Date.now(),
          status: 'running',
          options: message.options || {}
        };
        this.state.activeExtractions.set(extractionId, extractionRecord);
        
        // Show overlay if requested
        if (message.showOverlay) {
          this.showOverlay(type);
        }
        
        // Delegate to appropriate extractor
        let result = null;
        const extractionMethod = this.getExtractionMethod(extractor, type);
        
        if (extractionMethod) {
          result = await extractionMethod.call(extractor, message.options || {});
        } else {
          throw new Error(`No extraction method found for ${type}`);
        }
        
        // Process result
        const processedResult = this.processExtractionResult(type, result);
        
        // Update extraction record
        extractionRecord.endTime = Date.now();
        extractionRecord.duration = extractionRecord.endTime - extractionRecord.startTime;
        extractionRecord.status = 'completed';
        extractionRecord.itemCount = this.getItemCount(type, processedResult);
        
        // Update statistics
        this.updateStatistics(type, extractionRecord);
        
        console.log(`✅ ${type} extraction completed in ${extractionRecord.duration}ms`);
        
        return {
          success: true,
          type: type,
          extractionId: extractionId,
          duration: extractionRecord.duration,
          data: processedResult,
          stats: this.generateStats(type, processedResult)
        };
        
      } catch (error) {
        console.error(`❌ ${type} extraction failed:`, error);
        
        // Update extraction record
        const extractionRecord = this.state.activeExtractions.get(extractionId);
        if (extractionRecord) {
          extractionRecord.endTime = Date.now();
          extractionRecord.duration = extractionRecord.endTime - extractionRecord.startTime;
          extractionRecord.status = 'failed';
          extractionRecord.error = error.message;
        }
        
        return {
          success: false,
          type: type,
          extractionId: extractionId,
          error: error.message
        };
        
      } finally {
        // Reset state
        this.state.isExtracting = false;
        this.state.currentExtractionType = null;
        
        // Hide overlay
        if (message.showOverlay) {
          this.hideOverlay();
        }
        
        // Cleanup old extractions
        this.cleanupOldExtractions();
      }
    }
    
    /**
     * Orchestrate extraction for all types
     */
    async orchestrateAllExtractions(message = {}) {
      if (this.state.isExtracting) {
        return {
          success: false,
          error: 'Another extraction is already in progress'
        };
      }
      
      const extractionId = `all_${Date.now()}`;
      const results = {};
      const errors = {};
      
      try {
        console.log(`📤 Orchestrating ALL extractions: ${extractionId}`);
        
        // Show overlay if requested
        if (message.showOverlay) {
          this.showOverlay('all');
        }
        
        // Extract each type sequentially
        const types = message.types || ['text', 'table', 'image'];
        
        for (const type of types) {
          if (!this.extractors[type]) {
            console.warn(`⚠️ Skipping ${type} - extractor not available`);
            errors[type] = 'Extractor not available';
            continue;
          }
          
          try {
            // Update overlay message
            if (message.showOverlay) {
              this.updateOverlayMessage(`Extracting ${type} content...`);
            }
            
            // Extract without showing individual overlays
            const result = await this.orchestrateExtraction(type, {
              ...message,
              showOverlay: false
            });
            
            if (result.success) {
              results[type] = result.data;
            } else {
              errors[type] = result.error;
            }
            
          } catch (error) {
            console.error(`Failed to extract ${type}:`, error);
            errors[type] = error.message;
          }
        }
        
        return {
          success: Object.keys(results).length > 0,
          extractionId: extractionId,
          data: results,
          errors: Object.keys(errors).length > 0 ? errors : null,
          stats: {
            requested: types.length,
            successful: Object.keys(results).length,
            failed: Object.keys(errors).length
          }
        };
        
      } finally {
        if (message.showOverlay) {
          this.hideOverlay();
        }
      }
    }
    
    // ================================
    // Helper Methods
    // ================================
    
    /**
     * Get the appropriate extraction method for an extractor
     * @private
     */
    getExtractionMethod(extractor, type) {
      // Try different method names that extractors might use
      const methodNames = [
        `extract${type.charAt(0).toUpperCase() + type.slice(1)}s`, // extractTexts, extractTables, extractImages
        `extract${type.charAt(0).toUpperCase() + type.slice(1)}`,  // extractText, extractTable, extractImage
        'extractAll',                                                // Generic extractAll
        'extract'                                                    // Generic extract
      ];
      
      for (const methodName of methodNames) {
        if (typeof extractor[methodName] === 'function') {
          return extractor[methodName];
        }
      }
      
      return null;
    }
    
    /**
     * Process extraction result to ensure consistent format
     * @private
     */
    processExtractionResult(type, result) {
      if (!result) {
        return this.getEmptyResult(type);
      }
      
      // Ensure consistent structure based on type
      switch (type) {
        case 'text':
          return this.ensureTextResultFormat(result);
        case 'table':
          return this.ensureTableResultFormat(result);
        case 'image':
          return this.ensureImageResultFormat(result);
        default:
          return result;
      }
    }
    
    /**
     * Ensure text result has consistent format
     * @private
     */
    ensureTextResultFormat(result) {
      if (result.sections) {
        return result; // Already in correct format
      }
      
      // Convert array or other formats to sections object
      const sections = {};
      
      if (Array.isArray(result)) {
        result.forEach((item, index) => {
          const name = item.name || item.title || `section_${index}`;
          sections[name] = item.content || item.text || item;
        });
      } else if (typeof result === 'object') {
        // Assume it's already a sections object
        Object.assign(sections, result);
      } else {
        sections.content = String(result);
      }
      
      return { sections, stats: this.calculateTextStats(sections) };
    }
    
    /**
     * Ensure table result has consistent format
     * @private
     */
    ensureTableResultFormat(result) {
      if (result.tables) {
        return result; // Already in correct format
      }
      
      const tables = Array.isArray(result) ? result : [result];
      
      return {
        tables: tables.filter(t => t && typeof t === 'object'),
        stats: this.calculateTableStats(tables)
      };
    }
    
    /**
     * Ensure image result has consistent format
     * @private
     */
    ensureImageResultFormat(result) {
      if (result.images) {
        return result; // Already in correct format
      }
      
      const images = Array.isArray(result) ? result : [result];
      
      return {
        images: images.filter(i => i && typeof i === 'object'),
        stats: this.calculateImageStats(images)
      };
    }
    
    /**
     * Get empty result for a type
     * @private
     */
    getEmptyResult(type) {
      switch (type) {
        case 'text':
          return { sections: {}, stats: { totalSections: 0 } };
        case 'table':
          return { tables: [], stats: { totalTables: 0 } };
        case 'image':
          return { images: [], stats: { totalImages: 0 } };
        default:
          return { data: [], stats: { total: 0 } };
      }
    }
    
    /**
     * Get item count from result
     * @private
     */
    getItemCount(type, result) {
      switch (type) {
        case 'text':
          return Object.keys(result.sections || {}).length;
        case 'table':
          return (result.tables || []).length;
        case 'image':
          return (result.images || []).length;
        default:
          return 0;
      }
    }
    
    /**
     * Calculate text statistics
     * @private
     */
    calculateTextStats(sections) {
      const allText = Object.values(sections).join(' ');
      const words = allText.split(/\s+/).filter(w => w.length > 0);
      
      return {
        totalSections: Object.keys(sections).length,
        totalWords: words.length,
        totalCharacters: allText.length,
        averageWordsPerSection: Math.round(words.length / Math.max(1, Object.keys(sections).length))
      };
    }
    
    /**
     * Calculate table statistics
     * @private
     */
    calculateTableStats(tables) {
      let totalRows = 0;
      let totalCells = 0;
      
      tables.forEach(table => {
        const rows = table.rows || table.data || [];
        totalRows += rows.length;
        rows.forEach(row => {
          if (Array.isArray(row)) {
            totalCells += row.length;
          } else if (typeof row === 'object') {
            totalCells += Object.keys(row).length;
          }
        });
      });
      
      return {
        totalTables: tables.length,
        totalRows: totalRows,
        totalCells: totalCells,
        averageRowsPerTable: Math.round(totalRows / Math.max(1, tables.length))
      };
    }
    
    /**
     * Calculate image statistics
     * @private
     */
    calculateImageStats(images) {
      const types = {};
      let totalWidth = 0;
      let totalHeight = 0;
      
      images.forEach(image => {
        const type = image.type || 'unknown';
        types[type] = (types[type] || 0) + 1;
        
        if (image.dimensions) {
          totalWidth += image.dimensions.width || 0;
          totalHeight += image.dimensions.height || 0;
        }
      });
      
      return {
        totalImages: images.length,
        byType: types,
        averageDimensions: images.length > 0 ? {
          width: Math.round(totalWidth / images.length),
          height: Math.round(totalHeight / images.length)
        } : { width: 0, height: 0 }
      };
    }
    
    /**
     * Generate stats for extraction result
     * @private
     */
    generateStats(type, result) {
      switch (type) {
        case 'text':
          return result.stats || this.calculateTextStats(result.sections || {});
        case 'table':
          return result.stats || this.calculateTableStats(result.tables || []);
        case 'image':
          return result.stats || this.calculateImageStats(result.images || []);
        default:
          return { total: 0 };
      }
    }
    
    /**
     * Update statistics
     * @private
     */
    updateStatistics(type, extractionRecord) {
      const stats = this.state.statistics[type];
      if (stats) {
        stats.totalExtractions++;
        stats.lastExtracted = extractionRecord.endTime;
        stats.lastDuration = extractionRecord.duration;
        stats.lastItemCount = extractionRecord.itemCount;
      }
    }
    
    /**
     * Clean up old extractions (keep last 10)
     * @private
     */
    cleanupOldExtractions() {
      if (this.state.activeExtractions.size > 10) {
        const sorted = Array.from(this.state.activeExtractions.entries())
          .sort((a, b) => (b[1].startTime || 0) - (a[1].startTime || 0));
        
        // Keep only the 10 most recent
        this.state.activeExtractions.clear();
        sorted.slice(0, 10).forEach(([id, record]) => {
          this.state.activeExtractions.set(id, record);
        });
      }
    }
    
    /**
     * Cancel current extraction
     */
    cancelExtraction() {
      if (!this.state.isExtracting) {
        return {
          success: false,
          error: 'No extraction in progress'
        };
      }
      
      const type = this.state.currentExtractionType;
      
      // Reset state
      this.state.isExtracting = false;
      this.state.currentExtractionType = null;
      
      // Hide overlay
      this.hideOverlay();
      
      console.log(`⏹️ Cancelled ${type} extraction`);
      
      return {
        success: true,
        cancelledType: type
      };
    }
    
    /**
     * Get extraction status
     */
    getStatus() {
      return {
        isInitialized: this.isInitialized,
        isExtracting: this.state.isExtracting,
        currentExtractionType: this.state.currentExtractionType,
        availableExtractors: {
          text: !!this.extractors.text,
          table: !!this.extractors.table,
          image: !!this.extractors.image
        },
        statistics: this.state.statistics,
        recentExtractions: Array.from(this.state.activeExtractions.values())
          .slice(-5)
          .map(e => ({
            id: e.id,
            type: e.type,
            status: e.status,
            duration: e.duration,
            itemCount: e.itemCount
          }))
      };
    }
    
    // ================================
    // UI Helper Methods
    // ================================
    
    /**
     * Show extraction overlay
     * @private
     */
    showOverlay(type) {
        const overlayManager = global.serviceRegistry?.get('overlayManager') || global.overlayManager;
        
        if (overlayManager) {
            if (typeof overlayManager.show === 'function') {
                overlayManager.show();
            }
            
            // Use updateProgress instead of updateMessage
            if (typeof overlayManager.updateProgress === 'function') {
                overlayManager.updateProgress(0, `Extracting ${type} content...`);
            }
        }
    }
    
    /**
     * Update overlay message
     * @private
     */
    updateOverlayMessage(message) {
        const overlayManager = global.serviceRegistry?.get('overlayManager') || global.overlayManager;
        
        if (overlayManager) {
            // Check for different possible method names
            if (typeof overlayManager.updateMessage === 'function') {
                overlayManager.updateMessage(message);
            } else if (typeof overlayManager.update === 'function') {
                overlayManager.update(message);
            } else if (typeof overlayManager.updateProgress === 'function') {
                overlayManager.updateProgress(null, message);
            } else if (typeof overlayManager.setMessage === 'function') {
                overlayManager.setMessage(message);
            } else {
                console.warn('OverlayManager does not have a message update method');
            }
        }
    }
    
    /**
     * Hide extraction overlay
     * @private
     */
    hideOverlay() {
      const overlayManager = global.serviceRegistry?.get('overlayManager') || global.overlayManager;
      
      if (overlayManager && typeof overlayManager.hide === 'function') {
        overlayManager.hide();
      }
    }
    
    // ================================
    // Public API Methods
    // ================================
    
    /**
     * Extract text programmatically
     */
    async extractText(options = {}) {
      return this.orchestrateExtraction('text', { options });
    }
    
    /**
     * Extract tables programmatically
     */
    async extractTables(options = {}) {
      return this.orchestrateExtraction('table', { options });
    }
    
    /**
     * Extract images programmatically
     */
    async extractImages(options = {}) {
      return this.orchestrateExtraction('image', { options });
    }
    
    /**
     * Extract all content programmatically
     */
    async extractAll(options = {}) {
      return this.orchestrateAllExtractions({ options });
    }
    
    /**
     * Check if extraction is in progress
     */
    isExtracting() {
      return this.state.isExtracting;
    }
    
    /**
     * Get current extraction type
     */
    getCurrentExtractionType() {
      return this.state.currentExtractionType;
    }
    
    /**
     * Get extraction history
     */
    getExtractionHistory() {
      return Array.from(this.state.activeExtractions.values());
    }
    
    /**
     * Clear extraction history
     */
    clearHistory() {
      this.state.activeExtractions.clear();
      console.log('📤 Extraction history cleared');
    }
    
    /**
     * Clean up the handler
     */
    cleanup() {
      console.log('🧹 Cleaning up ExtractionHandler...');
      
      // Cancel any ongoing extraction
      if (this.state.isExtracting) {
        this.cancelExtraction();
      }
      
      // Clear state
      this.state.activeExtractions.clear();
      this.state.isExtracting = false;
      this.state.currentExtractionType = null;
      
      // Reset extractors
      this.extractors = {
        text: null,
        table: null,
        image: null
      };
      
      this.isInitialized = false;
      
      console.log('✅ ExtractionHandler cleanup completed');
    }
  }
  
  // Create singleton instance
  const extractionHandler = new ExtractionHandler();
  
  // Register with service registry if available
  if (global.serviceRegistry) {
    global.serviceRegistry.register('extractionHandler', extractionHandler);
  }
  
  // Expose globally
  global.extractionHandler = extractionHandler;
  global.ExtractionHandler = ExtractionHandler;
  
  console.log('📢 ExtractionHandler exposed to global scope');
  
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[handlers/ExtractionHandler.js] Error:', error);
    }
  })();

  // ===== Module: markers/modals/ModalManager.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/modals/ModalManager.js

(function(global) {
    'use strict';
    
    class ModalManager {
        constructor() {
            this.activeModals = new Map();
            this.instance = null;
        }
        
        static getInstance() {
            if (!ModalManager.instance) {
                ModalManager.instance = new ModalManager();
            }
            return ModalManager.instance;
        }
        
        // ================================
        // Delete Confirmation Modal
        // ================================
        
        showDeleteConfirm(markerData, onConfirm, onCancel) {
            const modalId = 'delete-' + markerData.id;
            this.closeModal(modalId);
            
            const modal = this.createModal({
                id: modalId,
                title: `Delete ${this.formatType(markerData.type)} Marker`,
                content: this.getDeleteContent(markerData),
                buttons: [
                    { 
                        text: 'Cancel', 
                        className: 'orkg-btn-secondary', 
                        action: () => {
                            this.closeModal(modalId);
                            if (onCancel) onCancel();
                        }
                    },
                    { 
                        text: 'Delete', 
                        className: 'orkg-btn-danger', 
                        action: () => {
                            this.closeModal(modalId);
                            if (onConfirm) onConfirm();
                        }
                    }
                ],
                style: 'property-window' // Use property window style
            });
            
            this.showModal(modal);
        }
        
        // ================================
        // Info Modal - Enhanced
        // ================================
        
        showInfo(markerData, type) {
            const modalId = 'info-' + markerData.id;
            this.closeModal(modalId);
            
            const modal = this.createModal({
                id: modalId,
                title: `${this.formatType(type)} Information`,
                content: this.getEnhancedInfoContent(markerData, type),
                buttons: [
                    { 
                        text: 'Close', 
                        className: 'orkg-btn-primary', 
                        action: () => {
                            this.closeModal(modalId);
                        }
                    }
                ],
                style: 'property-window' // Use property window style
            });
            
            this.showModal(modal);
        }
        
        // ================================
        // Send Options Modal
        // ================================
        
        showSendOptions(markerData, counts, callback) {
            const modalId = 'send-options-' + markerData.id;
            this.closeModal(modalId);
            
            const modal = this.createModal({
                id: modalId,
                title: 'Send to ORKG',
                content: this.getSendOptionsContent(markerData, counts),
                buttons: [
                    { 
                        text: 'Cancel', 
                        className: 'orkg-btn-secondary', 
                        action: () => {
                            this.closeModal(modalId);
                        }
                    },
                    { 
                        text: 'Send Only This', 
                        className: 'orkg-btn-primary', 
                        action: () => {
                            this.closeModal(modalId);
                            callback('send-this');
                        }
                    },
                    { 
                        text: `Send All (${counts.total})`, 
                        className: 'orkg-btn-gradient', 
                        action: () => {
                            this.closeModal(modalId);
                            callback('send-all');
                        }
                    }
                ],
                style: 'property-window'
            });
            
            this.showModal(modal);
        }
        
        // ================================
        // Send All Modal - Enhanced
        // ================================
        
        showSendAll(items, callback) {
            const modalId = 'send-all';
            this.closeModal(modalId);
            
            const modal = document.createElement('div');
            modal.className = 'orkg-modal-overlay';
            modal.dataset.modalId = modalId;
            
            const content = document.createElement('div');
            content.className = 'orkg-modal-content orkg-modal-large orkg-property-window-style';
            
            content.innerHTML = this.getEnhancedSendAllContent(items);
            modal.appendChild(content);
            
            this.setupEnhancedSendAllHandlers(modal, items, callback);
            this.activeModals.set(modalId, modal);
            document.body.appendChild(modal);
            
            requestAnimationFrame(() => {
                modal.classList.add('orkg-modal-visible');
            });
        }
        
        // ================================
        // Enhanced Content Generators
        // ================================
        
        getDeleteContent(markerData) {
            const text = markerData.metadata?.text || 
                        markerData.metadata?.alt || 
                        markerData.metadata?.caption || 
                        'This item';
            
            const property = markerData.metadata?.property;
            
            return `
                <div class="orkg-modal-message">
                    <p>Are you sure you want to delete this ${this.formatType(markerData.type)} marker?</p>
                </div>
                
                <div class="orkg-modal-preview">
                    ${property ? `
                        <div class="orkg-preview-property">
                            <strong>Property:</strong> ${this.escapeHtml(property.label || 'Unknown')}
                        </div>
                    ` : ''}
                    <div class="orkg-preview-text">
                        <strong>Content:</strong> ${this.escapeHtml(this.truncate(text, 100))}
                    </div>
                </div>
            `;
        }
        
        getEnhancedInfoContent(markerData, type) {
            const metadata = markerData.metadata || {};
            
            // Build info rows, excluding ID
            const infoRows = [];
            
            // Type
            infoRows.push({
                label: 'Type',
                value: this.formatType(type),
                icon: this.getTypeIcon(type)
            });
            
            // Property
            if (metadata.property) {
                infoRows.push({
                    label: 'Property',
                    value: metadata.property.label || 'Unknown',
                    className: 'orkg-info-property'
                });
            }
            
            // Content based on type
            if (type === 'text' && metadata.text) {
                infoRows.push({
                    label: 'Text',
                    value: this.truncate(metadata.text, 200),
                    className: 'orkg-info-text'
                });
            } else if (type === 'image') {
                if (metadata.src) {
                    infoRows.push({
                        label: 'Source',
                        value: this.truncate(metadata.src, 100),
                        className: 'orkg-info-url'
                    });
                }
                if (metadata.alt) {
                    infoRows.push({
                        label: 'Alt Text',
                        value: metadata.alt,
                        className: 'orkg-info-alt'
                    });
                }
            } else if (type === 'table') {
                if (metadata.caption) {
                    infoRows.push({
                        label: 'Caption',
                        value: metadata.caption,
                        className: 'orkg-info-caption'
                    });
                }
                if (metadata.rows) {
                    infoRows.push({
                        label: 'Size',
                        value: `${metadata.rows} rows × ${metadata.columns || '?'} columns`,
                        className: 'orkg-info-size'
                    });
                }
            }
            
            // Confidence
            if (metadata.confidence) {
                infoRows.push({
                    label: 'Confidence',
                    value: `${Math.round(metadata.confidence * 100)}%`,
                    className: 'orkg-info-confidence',
                    color: this.getConfidenceColor(metadata.confidence)
                });
            }
            
            // Source
            if (metadata.source) {
                infoRows.push({
                    label: 'Source',
                    value: metadata.source,
                    className: 'orkg-info-source'
                });
            }
            
            // Created
            if (markerData.createdAt) {
                infoRows.push({
                    label: 'Created',
                    value: new Date(markerData.createdAt).toLocaleString(),
                    className: 'orkg-info-date'
                });
            }
            
            // Build HTML
            let html = '<div class="orkg-info-section">';
            
            infoRows.forEach(row => {
                html += `
                    <div class="orkg-info-row ${row.className || ''}">
                        <span class="orkg-info-label">
                            ${row.icon || ''}
                            ${row.label}:
                        </span>
                        <span class="orkg-info-value" ${row.color ? `style="color: ${row.color};"` : ''}>
                            ${this.escapeHtml(row.value)}
                        </span>
                    </div>
                `;
            });
            
            html += '</div>';
            
            return html;
        }
        
        getSendOptionsContent(markerData, counts) {
            const preview = markerData.metadata?.text || 
                           markerData.metadata?.alt || 
                           markerData.metadata?.caption || 
                           'Selected item';
            
            const property = markerData.metadata?.property;
            
            return `
                <p>Choose what to send to the extension:</p>
                
                <div class="orkg-modal-preview">
                    ${property ? `
                        <div class="orkg-preview-property">
                            <strong>Property:</strong> ${this.escapeHtml(property.label || 'Unknown')}
                        </div>
                    ` : ''}
                    <div class="orkg-preview-text">
                        ${this.escapeHtml(this.truncate(preview, 100))}
                    </div>
                </div>
                
                <div class="orkg-send-counts">
                    <div class="orkg-count-item">
                        <span class="orkg-count-icon">${this.getTypeIcon('text')}</span>
                        <span>Text: ${counts.text}</span>
                    </div>
                    <div class="orkg-count-item">
                        <span class="orkg-count-icon">${this.getTypeIcon('image')}</span>
                        <span>Images: ${counts.image}</span>
                    </div>
                    <div class="orkg-count-item">
                        <span class="orkg-count-icon">${this.getTypeIcon('table')}</span>
                        <span>Tables: ${counts.table}</span>
                    </div>
                </div>
            `;
        }
        
        getEnhancedSendAllContent(items) {
            // Group text items by property
            const textByProperty = this.groupTextByProperty(items.text);
            
            return `
                <div class="orkg-modal-header">
                    <h3>Send All Content to ORKG</h3>
                    <span class="orkg-modal-subtitle">Select items to send (${items.totalCount} total)</span>
                </div>
                
                <div class="orkg-modal-body orkg-modal-scrollable">
                    <div class="orkg-select-all-section">
                        <label class="orkg-checkbox-label">
                            <input type="checkbox" id="select-all-items" class="orkg-checkbox" checked>
                            <span>Select All</span>
                        </label>
                    </div>
                    
                    <div class="orkg-categories-container">
                        ${this.renderEnhancedTextCategory(textByProperty)}
                        ${this.renderEnhancedImageCategory(items.images)}
                        ${this.renderEnhancedTableCategory(items.tables)}
                    </div>
                </div>
                
                <div class="orkg-modal-footer">
                    <button class="orkg-modal-btn orkg-btn-secondary" data-action="cancel">Cancel</button>
                    <button class="orkg-modal-btn orkg-btn-primary orkg-send-selected-btn" data-action="send">
                        Send Selected (<span class="selected-count">${items.totalCount}</span>)
                    </button>
                </div>
            `;
        }
        
        groupTextByProperty(textItems) {
            const grouped = {};
            
            textItems.forEach(item => {
                const propertyLabel = item.metadata?.property?.label || 
                                    item.property?.label || 
                                    'No Property';
                
                if (!grouped[propertyLabel]) {
                    grouped[propertyLabel] = {
                        property: item.metadata?.property || item.property,
                        items: []
                    };
                }
                
                grouped[propertyLabel].items.push(item);
            });
            
            return grouped;
        }
        
        renderEnhancedTextCategory(textByProperty) {
            const propertyCount = Object.keys(textByProperty).length;
            if (propertyCount === 0) return '';
            
            const totalItems = Object.values(textByProperty)
                .reduce((sum, group) => sum + group.items.length, 0);
            
            return `
                <div class="orkg-category-section">
                    <div class="orkg-category-header">
                        <label class="orkg-checkbox-label">
                            <input type="checkbox" class="orkg-category-checkbox" data-category="text" checked>
                            ${this.getTypeIcon('text')}
                            <span class="orkg-category-title">Text Highlights</span>
                            <span class="orkg-category-count">(${totalItems})</span>
                        </label>
                    </div>
                    <div class="orkg-category-items orkg-property-tree">
                        ${Object.entries(textByProperty).map(([propertyLabel, group]) => `
                            <div class="orkg-property-group">
                                <div class="orkg-property-group-header">
                                    <label class="orkg-checkbox-label">
                                        <input type="checkbox" class="orkg-property-checkbox" 
                                               data-property="${this.escapeHtml(propertyLabel)}" checked>
                                        <span class="orkg-property-label">
                                            ${this.escapeHtml(propertyLabel)}
                                        </span>
                                        <span class="orkg-property-count">(${group.items.length})</span>
                                    </label>
                                </div>
                                <div class="orkg-property-items">
                                    ${group.items.map(item => `
                                        <label class="orkg-checkbox-label orkg-item-label">
                                            <input type="checkbox" class="orkg-item-checkbox" 
                                                   data-category="text"
                                                   data-property="${this.escapeHtml(propertyLabel)}"
                                                   data-id="${item.id}" 
                                                   checked>
                                            <span class="orkg-item-text">
                                                "${this.escapeHtml(this.truncate(item.text || item.metadata?.text || '', 80))}"
                                            </span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        renderEnhancedImageCategory(images) {
            if (images.length === 0) return '';
            
            return `
                <div class="orkg-category-section">
                    <div class="orkg-category-header">
                        <label class="orkg-checkbox-label">
                            <input type="checkbox" class="orkg-category-checkbox" data-category="images" checked>
                            ${this.getTypeIcon('image')}
                            <span class="orkg-category-title">Images</span>
                            <span class="orkg-category-count">(${images.length})</span>
                        </label>
                    </div>
                    <div class="orkg-category-items orkg-image-grid">
                        ${images.map(item => {
                            const imgSrc = item.metadata?.src || item.element?.src || '';
                            const imgAlt = item.metadata?.alt || item.element?.alt || 'Image';
                            
                            return `
                                <div class="orkg-image-item">
                                    <label class="orkg-checkbox-label">
                                        <input type="checkbox" class="orkg-item-checkbox" 
                                               data-category="images"
                                               data-id="${item.id}" 
                                               checked>
                                        ${imgSrc ? `
                                            <div class="orkg-image-preview">
                                                <img src="${imgSrc}" alt="${this.escapeHtml(imgAlt)}" 
                                                     style="max-width: 100px; max-height: 100px; object-fit: cover;">
                                            </div>
                                        ` : ''}
                                        <span class="orkg-item-text">
                                            ${this.escapeHtml(this.truncate(imgAlt, 50))}
                                        </span>
                                    </label>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        renderEnhancedTableCategory(tables) {
            if (tables.length === 0) return '';
            
            return `
                <div class="orkg-category-section">
                    <div class="orkg-category-header">
                        <label class="orkg-checkbox-label">
                            <input type="checkbox" class="orkg-category-checkbox" data-category="tables" checked>
                            ${this.getTypeIcon('table')}
                            <span class="orkg-category-title">Tables</span>
                            <span class="orkg-category-count">(${tables.length})</span>
                        </label>
                    </div>
                    <div class="orkg-category-items">
                        ${tables.map(item => {
                            const caption = item.metadata?.caption || `Table ${item.id}`;
                            const size = item.metadata?.rows ? 
                                `${item.metadata.rows}×${item.metadata.columns || '?'}` : '';
                            
                            return `
                                <label class="orkg-checkbox-label orkg-item-label">
                                    <input type="checkbox" class="orkg-item-checkbox" 
                                           data-category="tables"
                                           data-id="${item.id}" 
                                           checked>
                                    <span class="orkg-item-text">
                                        ${this.escapeHtml(caption)}
                                        ${size ? `<span class="orkg-table-size">(${size})</span>` : ''}
                                    </span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        setupEnhancedSendAllHandlers(modal, items, callback) {
            const selectAll = modal.querySelector('#select-all-items');
            const categoryBoxes = modal.querySelectorAll('.orkg-category-checkbox');
            const propertyBoxes = modal.querySelectorAll('.orkg-property-checkbox');
            const itemBoxes = modal.querySelectorAll('.orkg-item-checkbox');
            const countSpan = modal.querySelector('.selected-count');
            const sendBtn = modal.querySelector('.orkg-send-selected-btn');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            
            const updateCount = () => {
                const checked = modal.querySelectorAll('.orkg-item-checkbox:checked').length;
                if (countSpan) countSpan.textContent = checked;
                if (sendBtn) {
                    sendBtn.disabled = checked === 0;
                    if (checked === 0) {
                        sendBtn.classList.add('orkg-btn-disabled');
                    } else {
                        sendBtn.classList.remove('orkg-btn-disabled');
                    }
                }
            };
            
            // Select all handler
            if (selectAll) {
                selectAll.addEventListener('change', (e) => {
                    itemBoxes.forEach(box => box.checked = e.target.checked);
                    categoryBoxes.forEach(box => box.checked = e.target.checked);
                    propertyBoxes.forEach(box => box.checked = e.target.checked);
                    updateCount();
                });
            }
            
            // Category checkbox handler
            categoryBoxes.forEach(catBox => {
                catBox.addEventListener('change', (e) => {
                    const category = catBox.dataset.category;
                    modal.querySelectorAll(`.orkg-item-checkbox[data-category="${category}"]`)
                         .forEach(box => box.checked = e.target.checked);
                    
                    if (category === 'text') {
                        modal.querySelectorAll('.orkg-property-checkbox')
                             .forEach(box => box.checked = e.target.checked);
                    }
                    
                    const allChecked = Array.from(itemBoxes).every(b => b.checked);
                    if (selectAll) {
                        selectAll.checked = allChecked;
                        selectAll.indeterminate = !allChecked && Array.from(itemBoxes).some(b => b.checked);
                    }
                    updateCount();
                });
            });
            
            // Property checkbox handler
            propertyBoxes.forEach(propBox => {
                propBox.addEventListener('change', (e) => {
                    const property = propBox.dataset.property;
                    modal.querySelectorAll(`.orkg-item-checkbox[data-property="${property}"]`)
                         .forEach(box => box.checked = e.target.checked);
                    updateCount();
                });
            });
            
            // Item checkbox handler
            itemBoxes.forEach(itemBox => {
                itemBox.addEventListener('change', () => {
                    updateCount();
                });
            });
            
            // Button handlers
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.closeModal('send-all');
                });
            }
            
            if (sendBtn) {
                sendBtn.addEventListener('click', () => {
                    const selected = this.getSelectedItems(modal, items);
                    if (selected.total > 0) {
                        this.closeModal('send-all');
                        callback(selected);
                    }
                });
            }
            
            // Initial count
            updateCount();
        }
        
        // ================================
        // Modal Creation
        // ================================
        
        createModal(options) {
            const modal = document.createElement('div');
            modal.className = 'orkg-modal-overlay';
            modal.dataset.modalId = options.id;
            
            const content = document.createElement('div');
            content.className = 'orkg-modal-content';
            
            if (options.style === 'property-window') {
                content.classList.add('orkg-property-window-style');
            }
            
            const header = document.createElement('div');
            header.className = 'orkg-modal-header';
            const title = document.createElement('h3');
            title.textContent = options.title;
            header.appendChild(title);
            
            const body = document.createElement('div');
            body.className = 'orkg-modal-body';
            body.innerHTML = options.content;
            
            const footer = document.createElement('div');
            footer.className = 'orkg-modal-footer';
            
            options.buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = `orkg-modal-btn ${btn.className}`;
                button.textContent = btn.text;
                button.onclick = btn.action;
                footer.appendChild(button);
            });
            
            content.appendChild(header);
            content.appendChild(body);
            content.appendChild(footer);
            modal.appendChild(content);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(options.id);
                }
            });
            
            return modal;
        }
        
        showModal(modal) {
            const id = modal.dataset.modalId;
            this.activeModals.set(id, modal);
            document.body.appendChild(modal);
            
            requestAnimationFrame(() => {
                modal.classList.add('orkg-modal-visible');
            });
        }
        
        closeModal(modalId) {
            const modal = this.activeModals.get(modalId);
            if (!modal) return;
            
            modal.classList.remove('orkg-modal-visible');
            
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
                this.activeModals.delete(modalId);
            }, 300);
        }
        
        closeAllModals() {
            this.activeModals.forEach((modal, id) => {
                this.closeModal(id);
            });
        }
        
        getSelectedItems(modal, items) {
            const selected = { text: [], images: [], tables: [], total: 0 };
            
            const checkedBoxes = modal.querySelectorAll('.orkg-item-checkbox:checked');
            checkedBoxes.forEach(box => {
                const category = box.dataset.category;
                const id = box.dataset.id;
                
                if (category === 'text') {
                    const item = items.text.find(t => t.id === id);
                    if (item) selected.text.push(item);
                } else if (category === 'images') {
                    const item = items.images.find(i => i.id === id);
                    if (item) selected.images.push(item);
                } else if (category === 'tables') {
                    const item = items.tables.find(t => t.id === id);
                    if (item) selected.tables.push(item);
                }
            });
            
            selected.total = selected.text.length + selected.images.length + selected.tables.length;
            return selected;
        }
        
        // ================================
        // Utility Methods
        // ================================
        
        formatType(type) {
            return type.charAt(0).toUpperCase() + type.slice(1);
        }
        
        getTypeIcon(type) {
            const icons = {
                text: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm5 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6zm0 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6z"/></svg>',
                image: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>',
                table: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/></svg>'
            };
            return icons[type] || '';
        }
        
        getConfidenceColor(confidence) {
            if (confidence >= 0.8) return '#10b981';
            if (confidence >= 0.5) return '#f59e0b';
            return '#ef4444';
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
        
        truncate(text, maxLength) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }
    }
    
    global.ModalManager = ModalManager;
    
    console.log('📢 Enhanced ModalManager exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/modals/ModalManager.js] Error:', error);
    }
  })();

  // ===== Module: markers/handlers/DeleteHandler.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/handlers/DeleteHandler.js
// Handles marker deletion with proper highlight removal

(function(global) {
    'use strict';
    
    class DeleteHandler {
        constructor(menuHandler) {
            this.menuHandler = menuHandler;
            this.modalManager = null;
            this.marker = null;
        }
        
        setup(modalManager, marker) {
            this.modalManager = modalManager;
            this.marker = marker;
        }
        
        handle(markerId, markerData) {
            console.log('Handling delete for:', markerId);
            
            if (this.modalManager) {
                this.modalManager.showDeleteConfirm(
                    markerData,
                    () => {
                        this.performDelete(markerId, markerData);
                    },
                    () => {
                        console.log('Delete cancelled');
                    }
                );
            } else {
                const typeLabel = markerData.type || 'this';
                if (confirm(`Are you sure you want to delete ${typeLabel} marker?`)) {
                    this.performDelete(markerId, markerData);
                }
            }
        }
        
        performDelete(markerId, markerData) {
            console.log('Performing delete for:', markerId);
            
            if (markerData.type === 'text') {
                this.deleteTextHighlight(markerId, markerData);
            } else {
                this.deleteNonTextMarker(markerData);
            }
            
            // Clean up registries
            this.cleanupRegistries(markerId, markerData);
            
            // Send notification
            this.menuHandler.sendToExtension('DELETE', markerId, markerData);
            this.menuHandler.showFeedback('Marker deleted successfully', 'success');
        }
        
        deleteTextHighlight(markerId, markerData) {
            // Find the marker element
            const markerElement = markerData.markerElement || 
                                document.querySelector(`[data-marker-id="${markerId}"]`);
            
            if (!markerElement) {
                console.warn('Marker element not found');
                return;
            }
            
            // Find the parent highlight span
            const highlightSpan = markerElement.closest('.orkg-highlighted');
            
            if (!highlightSpan) {
                console.warn('Highlight span not found');
                markerElement.remove(); // Remove orphaned marker
                return;
            }
            
            console.log('Found highlight span to remove:', highlightSpan);
            
            // Store parent for later operations
            const parent = highlightSpan.parentNode;
            
            // Extract pure text content (excluding marker elements)
            const pureText = this.extractPureText(highlightSpan);
            
            // Create a clean text node
            const textNode = document.createTextNode(pureText);
            
            // Replace the entire highlight span with the text node
            parent.insertBefore(textNode, highlightSpan);
            highlightSpan.remove();
            
            // Normalize the parent to merge adjacent text nodes
            parent.normalize();
            
            console.log('✅ Highlight completely removed, text restored');
        }
        
        extractPureText(element) {
            let text = '';
            
            // Walk through all child nodes
            const walkNodes = (node) => {
                for (const child of node.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        text += child.textContent;
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        // Skip marker-related elements
                        const isMarkerElement = 
                            child.classList.contains('orkg-marker') ||
                            child.classList.contains('orkg-marker-menu') ||
                            child.classList.contains('orkg-marker-tooltip') ||
                            child.classList.contains('orkg-marker-icon-container') ||
                            child.classList.contains('orkg-marker-type-indicator');
                        
                        if (!isMarkerElement) {
                            // Recursively extract from non-marker elements
                            walkNodes(child);
                        }
                    }
                }
            };
            
            walkNodes(element);
            return text;
        }
        
        deleteNonTextMarker(markerData) {
            if (!markerData.markerElement?.parentNode) return;
            
            // Animate exit
            markerData.markerElement.classList.add('orkg-marker-exit');
            
            setTimeout(() => {
                if (markerData.markerElement?.parentNode) {
                    markerData.markerElement.remove();
                }
            }, 300);
        }
        
        cleanupRegistries(markerId, markerData) {
            // Remove from marker instance
            if (this.marker && typeof this.marker.removeMarker === 'function') {
                this.marker.removeMarker(markerId);
            }
            
            // Remove from global registry
            if (global.MarkerRegistry) {
                global.MarkerRegistry.unregister(markerId);
            }
            
            // Try to remove from TextHighlighter if it has a highlight ID
            const highlightId = markerData.metadata?.highlightId;
            if (highlightId && global.TextHighlighter?.removeHighlight) {
                global.TextHighlighter.removeHighlight(highlightId);
            }
            
            console.log(`✅ Cleaned up registries for ${markerData.type} marker:`, markerId);
        }
        
        cleanup() {
            this.modalManager = null;
            this.marker = null;
        }
    }
    
    // Export to global scope
    global.DeleteHandler = DeleteHandler;
    console.log('📢 DeleteHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/handlers/DeleteHandler.js] Error:', error);
    }
  })();

  // ===== Module: markers/handlers/UpdateHandler.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/handlers/UpdateHandler.js
// Handles marker updates with resizable selection feature

(function(global) {
    'use strict';
    
    class UpdateHandler {
        constructor(menuHandler) {
            this.menuHandler = menuHandler;
            this.propertyWindow = null;
            this.marker = null;
        }
        
        setup(propertyWindow, marker) {
            this.propertyWindow = propertyWindow;
            this.marker = marker;
        }
        
        async handle(markerId, markerData) {
            console.log('Handling update for:', markerId);
            
            if (markerData.type !== 'text') {
                this.menuHandler.showFeedback('Update is only available for text markers', 'warning');
                return;
            }
            
            // Get property window instance
            let propertyWindow = this.propertyWindow || global.propertyWindow || global.PropertyWindow;
            
            if (typeof propertyWindow === 'function') {
                if (!global.propertyWindowInstance) {
                    global.propertyWindowInstance = new propertyWindow();
                }
                propertyWindow = global.propertyWindowInstance;
            }
            
            if (!propertyWindow || typeof propertyWindow.show !== 'function') {
                console.error('PropertyWindow not available');
                this.menuHandler.showFeedback('Property window not available', 'error');
                return;
            }
            
            // Find elements
            const markerElement = markerData.markerElement || 
                                document.querySelector(`[data-marker-id="${markerId}"]`);
            const highlightElement = markerElement?.closest('.orkg-highlighted');
            
            if (!highlightElement) {
                console.error('Could not find highlighted element');
                this.menuHandler.showFeedback('Could not find highlighted text', 'error');
                return;
            }
            
            // Store original highlight for restoration if needed
            this.originalHighlight = {
                element: highlightElement,
                color: highlightElement.style.backgroundColor,
                property: highlightElement.dataset.property
            };
            
            // Create resizable selection overlay
            const selectionOverlay = this.createResizableSelection(highlightElement, markerElement);
            
            // Get initial position for property window
            const rect = highlightElement.getBoundingClientRect();
            const position = {
                x: rect.right + window.scrollX + 10,
                y: rect.top + window.scrollY
            };
            
            // Store current property and color
            const currentProperty = markerData.metadata?.property || 
                                   JSON.parse(highlightElement.dataset.property || '{}');
            const currentColor = markerData.metadata?.color || 
                               highlightElement.style.backgroundColor;
            
            try {
                // Show property window
                await propertyWindow.show(selectionOverlay.getSelectedText(), position);
                
                // Set current values
                if (currentProperty) {
                    propertyWindow.selectedProperty = currentProperty;
                }
                if (currentColor) {
                    propertyWindow.selectedColor = currentColor;
                }
                
                // Setup update handler
                this.setupUpdateHandler(
                    propertyWindow, 
                    highlightElement, 
                    markerData, 
                    selectionOverlay,
                    markerElement,
                    markerId
                );
                
            } catch (error) {
                console.error('Error showing property window:', error);
                selectionOverlay.destroy();
                this.menuHandler.showFeedback('Error opening property window', 'error');
            }
        }
        
        createResizableSelection(highlightElement, markerElement) {
            // Get the full text content (excluding marker elements)
            const fullText = this.extractTextContent(highlightElement);
            const rect = highlightElement.getBoundingClientRect();
            
            // Create overlay container with better visibility
            const overlay = document.createElement('div');
            overlay.className = 'orkg-resizable-selection';
            overlay.style.cssText = `
                position: absolute;
                left: ${rect.left + window.scrollX}px;
                top: ${rect.top + window.scrollY}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                border: 3px dashed #2196F3;
                background: rgba(33, 150, 243, 0.15);
                pointer-events: none;
                z-index: 10000;
                box-sizing: border-box;
                transition: none;
            `;
            
            // Create more prominent resize handles
            const leftHandle = this.createResizeHandle('left');
            const rightHandle = this.createResizeHandle('right');
            
            // Create animated instruction
            const instruction = document.createElement('div');
            instruction.className = 'orkg-resize-instruction';
            instruction.style.cssText = `
                position: absolute;
                top: -40px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #2196F3, #1976D2);
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
                animation: bounceIn 0.5s ease, pulse 2s ease-in-out infinite;
                z-index: 10001;
            `;
            instruction.innerHTML = '↔️ Drag the blue handles to adjust selection';
            
            // Add CSS animation if not exists
            this.addResizeAnimations();
            
            overlay.appendChild(leftHandle);
            overlay.appendChild(rightHandle);
            overlay.appendChild(instruction);
            document.body.appendChild(overlay);
            
            // Selection state
            let startOffset = 0;
            let endOffset = fullText.length;
            let isDragging = false;
            let activeHandle = null;
            
            // Visual feedback element
            const selectionPreview = document.createElement('div');
            selectionPreview.style.cssText = `
                position: absolute;
                background: rgba(33, 150, 243, 0.2);
                border: 2px solid #2196F3;
                pointer-events: none;
                z-index: 9999;
                transition: all 0.1s ease;
                display: none;
            `;
            document.body.appendChild(selectionPreview);
            
            // Update visual selection
            const updateSelection = () => {
                const selection = window.getSelection();
                selection.removeAllRanges();
                
                if (startOffset < endOffset) {
                    const range = this.createRangeFromOffsets(
                        highlightElement, 
                        startOffset, 
                        endOffset, 
                        fullText
                    );
                    
                    if (range) {
                        selection.addRange(range);
                        
                        // Update overlay position based on selection
                        const selectionRects = range.getClientRects();
                        if (selectionRects.length > 0) {
                            const firstRect = selectionRects[0];
                            const lastRect = selectionRects[selectionRects.length - 1];
                            
                            // Update main overlay
                            overlay.style.left = `${firstRect.left + window.scrollX}px`;
                            overlay.style.width = `${lastRect.right - firstRect.left}px`;
                            overlay.style.top = `${firstRect.top + window.scrollY}px`;
                            overlay.style.height = `${Math.max(firstRect.height, lastRect.bottom - firstRect.top)}px`;
                            
                            // Update selection preview
                            if (isDragging) {
                                selectionPreview.style.display = 'block';
                                selectionPreview.style.left = `${firstRect.left + window.scrollX}px`;
                                selectionPreview.style.top = `${firstRect.top + window.scrollY}px`;
                                selectionPreview.style.width = `${lastRect.right - firstRect.left}px`;
                                selectionPreview.style.height = `${Math.max(firstRect.height, lastRect.bottom - firstRect.top)}px`;
                            }
                        }
                    }
                }
                
                // Update property window preview
                this.updatePreview(fullText.substring(startOffset, endOffset));
                
                // Update handle positions
                this.updateHandlePositions(leftHandle, rightHandle, overlay);
            };
            
            // Enhanced handle dragging
            const handleMouseDown = (e, handle, side) => {
                e.preventDefault();
                e.stopPropagation();
                isDragging = true;
                activeHandle = handle;
                document.body.style.cursor = 'ew-resize';
                handle.style.transform = side === 'left' ? 
                    'translateY(-50%) scale(1.3) translateX(-2px)' : 
                    'translateY(-50%) scale(1.3) translateX(2px)';
                instruction.style.display = 'none';
                selectionPreview.style.display = 'block';
            };
            
            const handleMouseMove = (e) => {
                if (!isDragging || !activeHandle) return;
                
                // Calculate position relative to the highlight
                const highlightRect = highlightElement.getBoundingClientRect();
                const relativeX = e.clientX - highlightRect.left;
                const percentage = Math.max(0, Math.min(1, relativeX / highlightRect.width));
                
                // Find the character position more accurately
                const charPosition = this.getCharacterPositionAtPoint(
                    highlightElement, 
                    e.clientX, 
                    fullText
                );
                
                if (activeHandle.dataset.side === 'left') {
                    startOffset = Math.min(charPosition, endOffset - 1);
                } else if (activeHandle.dataset.side === 'right') {
                    endOffset = Math.max(charPosition, startOffset + 1);
                }
                
                updateSelection();
            };
            
            const handleMouseUp = () => {
                if (isDragging && activeHandle) {
                    activeHandle.style.transform = 'translateY(-50%) scale(1)';
                }
                isDragging = false;
                activeHandle = null;
                document.body.style.cursor = '';
                selectionPreview.style.display = 'none';
            };
            
            // Add event listeners
            leftHandle.addEventListener('mousedown', (e) => handleMouseDown(e, leftHandle, 'left'));
            rightHandle.addEventListener('mousedown', (e) => handleMouseDown(e, rightHandle, 'right'));
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            // Initial selection
            updateSelection();
            
            // Return control interface
            return {
                getSelectedText: () => fullText.substring(startOffset, endOffset),
                getRange: () => window.getSelection().rangeCount > 0 ? 
                              window.getSelection().getRangeAt(0) : null,
                getOffsets: () => ({ start: startOffset, end: endOffset }),
                getFullText: () => fullText,
                destroy: () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    overlay.remove();
                    selectionPreview.remove();
                    window.getSelection().removeAllRanges();
                }
            };
        }
        
        createResizeHandle(side) {
            const handle = document.createElement('div');
            handle.className = `orkg-resize-handle orkg-resize-${side}`;
            handle.dataset.side = side;
            handle.style.cssText = `
                position: absolute;
                ${side}: -12px;
                top: 50%;
                transform: translateY(-50%);
                width: 24px;
                height: 40px;
                background: linear-gradient(135deg, #2196F3, #1976D2);
                border-radius: 12px;
                cursor: ew-resize;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
                box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                z-index: 10002;
                pointer-events: all;
            `;
            
            // Add hover effect
            handle.onmouseover = () => {
                if (!handle.dataset.dragging) {
                    handle.style.transform = 'translateY(-50%) scale(1.1)';
                    handle.style.boxShadow = '0 6px 12px rgba(33, 150, 243, 0.5)';
                }
            };
            
            handle.onmouseout = () => {
                if (!handle.dataset.dragging) {
                    handle.style.transform = 'translateY(-50%) scale(1)';
                    handle.style.boxShadow = '0 4px 8px rgba(33, 150, 243, 0.3)';
                }
            };
            
            // Add arrow icon
            const arrow = document.createElement('span');
            arrow.style.cssText = `
                color: white;
                font-size: 14px;
                font-weight: bold;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            `;
            arrow.textContent = side === 'left' ? '◀' : '▶';
            handle.appendChild(arrow);
            
            return handle;
        }
        
        addResizeAnimations() {
            if (!document.querySelector('#orkg-resize-animations')) {
                const style = document.createElement('style');
                style.id = 'orkg-resize-animations';
                style.textContent = `
                    @keyframes bounceIn {
                        0% { opacity: 0; transform: translateX(-50%) scale(0.3); }
                        50% { transform: translateX(-50%) scale(1.05); }
                        100% { opacity: 1; transform: translateX(-50%) scale(1); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
                        50% { opacity: 0.9; transform: translateX(-50%) scale(0.98); }
                    }
                    .orkg-resize-handle:active {
                        transform: translateY(-50%) scale(1.2) !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        updateHandlePositions(leftHandle, rightHandle, overlay) {
            // Keep handles at the edges of the overlay
            leftHandle.style.left = '-12px';
            rightHandle.style.right = '-12px';
        }
        
        getCharacterPositionAtPoint(element, clientX, fullText) {
            // More accurate character position detection
            const selection = window.getSelection();
            const range = document.caretRangeFromPoint(clientX, element.getBoundingClientRect().top + 5);
            
            if (range && element.contains(range.commonAncestorContainer)) {
                // Calculate offset within the full text
                let offset = 0;
                const textNodes = this.getTextNodes(element);
                
                for (const node of textNodes) {
                    if (node === range.startContainer) {
                        return offset + range.startOffset;
                    }
                    offset += node.textContent.length;
                }
            }
            
            // Fallback to percentage-based calculation
            const rect = element.getBoundingClientRect();
            const relativeX = clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
            return Math.round(percentage * fullText.length);
        }
        
        setupUpdateHandler(propertyWindow, highlightElement, markerData, selectionOverlay, markerElement, markerId) {
            setTimeout(() => {
                const confirmBtn = propertyWindow.windowElement?.querySelector('.orkg-btn-confirm');
                if (!confirmBtn) return;
                
                // Clone button to remove existing listeners
                const newBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
                
                // Add update handler
                newBtn.addEventListener('click', async () => {
                    const newProperty = propertyWindow.selectedProperty;
                    const newColor = propertyWindow.selectedColor;
                    const newText = selectionOverlay.getSelectedText();
                    const offsets = selectionOverlay.getOffsets();
                    const fullText = selectionOverlay.getFullText();
                    
                    if (!newProperty || !newColor || !newText) {
                        console.warn('Missing required data for update');
                        return;
                    }
                    
                    console.log('Updating highlight:', { newText, newProperty, newColor });
                    
                    // Get parent and position
                    const parent = highlightElement.parentNode;
                    const nextSibling = highlightElement.nextSibling;
                    
                    // Remove the old highlight completely (including all children)
                    const originalFullText = highlightElement.textContent;
                    highlightElement.remove();
                    
                    // Create text nodes for the three parts
                    const beforeText = originalFullText.substring(0, offsets.start);
                    const selectedText = originalFullText.substring(offsets.start, offsets.end);
                    const afterText = originalFullText.substring(offsets.end);
                    
                    // Insert the parts
                    const fragment = document.createDocumentFragment();
                    
                    if (beforeText) {
                        fragment.appendChild(document.createTextNode(beforeText));
                    }
                    
                    // Create new highlight for selected portion
                    const newHighlight = document.createElement('span');
                    const newHighlightId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    newHighlight.className = 'orkg-highlighted';
                    newHighlight.id = newHighlightId;
                    newHighlight.dataset.highlightId = newHighlightId;
                    newHighlight.dataset.property = JSON.stringify(newProperty);
                    newHighlight.dataset.propertyLabel = newProperty.label;
                    newHighlight.style.backgroundColor = newColor;
                    newHighlight.style.position = 'relative';
                    newHighlight.textContent = selectedText;
                    fragment.appendChild(newHighlight);
                    
                    if (afterText) {
                        fragment.appendChild(document.createTextNode(afterText));
                    }
                    
                    // Insert the fragment
                    parent.insertBefore(fragment, nextSibling);
                    
                    // Create new marker for the new highlight
                    if (global.TextMarker?.createMarkerForHighlight) {
                        global.TextMarker.createMarkerForHighlight(newHighlight, {
                            id: markerId, // Keep the same marker ID
                            property: newProperty,
                            color: newColor,
                            text: selectedText,
                            highlightId: newHighlightId,
                            source: 'update'
                        });
                    } else if (markerElement) {
                        // Reuse existing marker element
                        markerElement.dataset.metadata = JSON.stringify({
                            ...markerData.metadata,
                            property: newProperty,
                            color: newColor,
                            text: selectedText,
                            highlightId: newHighlightId
                        });
                        newHighlight.appendChild(markerElement);
                    }
                    
                    // Normalize parent
                    parent.normalize();
                    
                    // Clean up
                    selectionOverlay.destroy();
                    propertyWindow.hide();
                    window.getSelection().removeAllRanges();
                    
                    // Send update notification
                    this.menuHandler.showFeedback('Highlight updated successfully', 'success');
                    this.menuHandler.sendToExtension('UPDATE', markerId, {
                        ...markerData,
                        metadata: {
                            ...markerData.metadata,
                            property: newProperty,
                            color: newColor,
                            text: newText,
                            highlightId: newHighlightId
                        }
                    });
                });
            }, 100);
        }
        
        createRangeFromOffsets(element, startOffset, endOffset, fullText) {
            const range = document.createRange();
            const textNodes = this.getTextNodes(element);
            
            if (textNodes.length === 0) return null;
            
            let currentOffset = 0;
            let startNode = null, startNodeOffset = 0;
            let endNode = null, endNodeOffset = 0;
            
            for (const node of textNodes) {
                const nodeLength = node.textContent.length;
                
                if (!startNode && currentOffset + nodeLength > startOffset) {
                    startNode = node;
                    startNodeOffset = startOffset - currentOffset;
                }
                
                if (!endNode && currentOffset + nodeLength >= endOffset) {
                    endNode = node;
                    endNodeOffset = endOffset - currentOffset;
                    break;
                }
                
                currentOffset += nodeLength;
            }
            
            if (startNode && endNode) {
                try {
                    range.setStart(startNode, Math.min(startNodeOffset, startNode.textContent.length));
                    range.setEnd(endNode, Math.min(endNodeOffset, endNode.textContent.length));
                    return range;
                } catch (e) {
                    console.warn('Error setting range:', e);
                    return null;
                }
            }
            
            return null;
        }
        
        extractTextContent(element) {
            let text = '';
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        // Skip text inside marker elements
                        let parent = node.parentNode;
                        while (parent && parent !== element) {
                            if (parent.classList && (
                                parent.classList.contains('orkg-marker') ||
                                parent.classList.contains('orkg-marker-menu') ||
                                parent.classList.contains('orkg-marker-tooltip')
                            )) {
                                return NodeFilter.FILTER_REJECT;
                            }
                            parent = parent.parentNode;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                text += node.nodeValue;
            }
            
            return text;
        }
        
        getTextNodes(element) {
            const textNodes = [];
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        // Skip marker elements
                        let parent = node.parentNode;
                        while (parent && parent !== element) {
                            if (parent.classList && (
                                parent.classList.contains('orkg-marker') ||
                                parent.classList.contains('orkg-marker-menu') ||
                                parent.classList.contains('orkg-marker-tooltip')
                            )) {
                                return NodeFilter.FILTER_REJECT;
                            }
                            parent = parent.parentNode;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            return textNodes;
        }
        
        updatePreview(text) {
            if (global.propertyWindowInstance?.windowElement) {
                const preview = global.propertyWindowInstance.windowElement.querySelector('.orkg-text-preview');
                if (preview) {
                    preview.textContent = text.length > 60 ? 
                        text.substring(0, 60) + '...' : text;
                }
            }
        }
        
        cleanup() {
            this.propertyWindow = null;
            this.marker = null;
        }
    }
    
    // Export to global scope
    global.UpdateHandler = UpdateHandler;
    console.log('📢 UpdateHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/handlers/UpdateHandler.js] Error:', error);
    }
  })();

  // ===== Module: markers/handlers/InfoHandler.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/handlers/InfoHandler.js
// Handles marker information display

(function(global) {
    'use strict';
    
    class InfoHandler {
        constructor(menuHandler) {
            this.menuHandler = menuHandler;
            this.modalManager = null;
        }
        
        setup(modalManager) {
            this.modalManager = modalManager;
        }
        
        handle(markerId, markerData) {
            console.log('Showing info for:', markerId);
            
            if (this.modalManager) {
                this.modalManager.showInfo(markerData, markerData.type);
            } else {
                // Fallback to custom modal
                this.showORKGInfoModal(markerData);
            }
        }
        
        showORKGInfoModal(markerData) {
            // Remove existing modal
            const existing = document.querySelector('.orkg-info-modal-overlay');
            if (existing) existing.remove();
            
            // Create modal overlay
            const modal = document.createElement('div');
            modal.className = 'orkg-info-modal-overlay';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.5) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 2147483647 !important;
                opacity: 0 !important;
                transition: opacity 0.3s ease !important;
            `;
            
            // Create content container
            const content = this.createModalContent(markerData);
            modal.appendChild(content);
            
            // Handle closing
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeModal(modal, content);
                }
            };
            
            document.body.appendChild(modal);
            
            // Animate in
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                content.style.transform = 'scale(1)';
            });
        }
        
        createModalContent(markerData) {
            const content = document.createElement('div');
            content.className = 'orkg-info-modal-content';
            content.style.cssText = `
                background: white !important;
                border-radius: 8px !important;
                max-width: 450px !important;
                width: 90% !important;
                max-height: 80vh !important;
                overflow: hidden !important;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
                transform: scale(0.9) !important;
                transition: transform 0.3s ease !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                display: flex !important;
                flex-direction: column !important;
            `;
            
            // Create header
            const header = this.createHeader(markerData);
            
            // Create body
            const body = this.createBody(markerData);
            
            // Create footer
            const footer = this.createFooter(() => {
                const modal = content.closest('.orkg-info-modal-overlay');
                if (modal) {
                    this.closeModal(modal, content);
                }
            });
            
            content.appendChild(header);
            content.appendChild(body);
            content.appendChild(footer);
            
            return content;
        }
        
        createHeader(markerData) {
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding: 16px 20px !important;
                background: linear-gradient(135deg, #e86161 0%, #E04848 100%) !important;
                color: white !important;
                font-family: inherit !important;
            `;
            
            const title = document.createElement('h4');
            title.style.cssText = `
                margin: 0 !important;
                font-size: 16px !important;
                font-weight: 600 !important;
                color: white !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            `;
            
            const icon = this.getTypeIcon(markerData.type);
            title.innerHTML = `${icon} ${this.formatType(markerData.type)} Marker Information`;
            header.appendChild(title);
            
            return header;
        }
        
        createBody(markerData) {
            const body = document.createElement('div');
            body.style.cssText = `
                padding: 20px !important;
                font-family: inherit !important;
                overflow-y: auto !important;
                flex: 1 !important;
                max-height: 400px !important;
            `;
            
            body.innerHTML = this.getInfoBodyContent(markerData);
            return body;
        }
        
        createFooter(onClose) {
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 16px 20px !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                background: #f8f9fa !important;
                border-top: 1px solid #e9ecef !important;
            `;
            
            // Add copy button for marker ID
            const copyBtn = document.createElement('button');
            copyBtn.textContent = 'Copy ID';
            copyBtn.style.cssText = `
                padding: 6px 14px !important;
                background: #6c757d !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                font-size: 12px !important;
                cursor: pointer !important;
                transition: background 0.2s !important;
                font-family: inherit !important;
            `;
            
            copyBtn.onclick = () => {
                const markerId = footer.closest('.orkg-info-modal-content')
                                      .querySelector('[data-marker-id]')?.dataset.markerId;
                if (markerId && navigator.clipboard) {
                    navigator.clipboard.writeText(markerId);
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy ID';
                    }, 2000);
                }
            };
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = `
                padding: 8px 20px !important;
                background: #e86161 !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                font-size: 13px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                transition: background 0.2s !important;
                font-family: inherit !important;
            `;
            
            closeBtn.onmouseover = () => {
                closeBtn.style.background = '#E04848 !important';
            };
            
            closeBtn.onmouseout = () => {
                closeBtn.style.background = '#e86161 !important';
            };
            
            closeBtn.onclick = onClose;
            
            footer.appendChild(copyBtn);
            footer.appendChild(closeBtn);
            
            return footer;
        }
        
        getInfoBodyContent(markerData) {
            const sections = [];
            const metadata = markerData.metadata || {};
            
            // Marker ID (hidden, used for copy)
            sections.push(`<div data-marker-id="${markerData.id}" style="display: none;"></div>`);
            
            // Type badge
            sections.push(`
                <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                    <span style="
                        background: ${this.getTypeColor(markerData.type)};
                        color: white;
                        padding: 4px 10px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 600;
                        text-transform: uppercase;
                    ">${markerData.type}</span>
                    ${metadata.source ? `
                        <span style="
                            background: #e9ecef;
                            color: #495057;
                            padding: 4px 10px;
                            border-radius: 12px;
                            font-size: 11px;
                        ">${metadata.source}</span>
                    ` : ''}
                </div>
            `);
            
            // Content section based on type
            if (markerData.type === 'text' && metadata.text) {
                sections.push(this.createInfoRow('Selected Text', 
                    `"${this.truncate(metadata.text, 200)}"`,
                    'quote'));
            } else if (markerData.type === 'image') {
                if (metadata.src) {
                    sections.push(this.createInfoRow('Image Source', 
                        this.truncate(metadata.src, 150),
                        'link'));
                }
                if (metadata.alt) {
                    sections.push(this.createInfoRow('Alt Text', 
                        metadata.alt,
                        'text'));
                }
            } else if (markerData.type === 'table') {
                if (metadata.caption) {
                    sections.push(this.createInfoRow('Caption', 
                        metadata.caption,
                        'text'));
                }
                if (metadata.rows && metadata.columns) {
                    sections.push(this.createInfoRow('Dimensions', 
                        `${metadata.rows} rows × ${metadata.columns} columns`,
                        'grid'));
                }
            }
            
            // Property
            if (metadata.property?.label) {
                sections.push(this.createInfoRow('Property', 
                    metadata.property.label,
                    'property',
                    metadata.color || '#2196F3'));
            }
            
            // Confidence with visual bar
            if (metadata.confidence !== undefined) {
                const confidence = Math.round(metadata.confidence * 100);
                const color = this.getConfidenceColor(metadata.confidence);
                sections.push(`
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 11px; color: #6c757d; text-transform: uppercase; margin-bottom: 8px;">
                            Confidence Level
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="flex: 1; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden;">
                                <div style="width: ${confidence}%; height: 100%; background: ${color}; transition: width 0.5s;"></div>
                            </div>
                            <span style="font-size: 14px; font-weight: 600; color: ${color}; min-width: 40px;">${confidence}%</span>
                        </div>
                    </div>
                `);
            }
            
            // Timestamps
            if (markerData.createdAt) {
                sections.push(this.createInfoRow('Created', 
                    new Date(markerData.createdAt).toLocaleString(),
                    'time'));
            }
            
            // Status
            const isExtracted = markerData.extracted || 
                               markerData.markerElement?.classList.contains('orkg-extracted');
            sections.push(this.createInfoRow('Status', 
                isExtracted ? 'Sent to ORKG' : 'Not sent',
                'status',
                isExtracted ? '#10b981' : '#6c757d'));
            
            return sections.join('');
        }
        
        createInfoRow(label, value, type = 'text', color = null) {
            const icons = {
                quote: '💬',
                link: '🔗',
                text: '📝',
                property: '🏷️',
                grid: '⊞',
                time: '🕐',
                status: '📍'
            };
            
            const icon = icons[type] || '';
            
            return `
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; color: #6c757d; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                        ${icon} ${this.escapeHtml(label)}
                    </div>
                    <div style="
                        padding: 10px;
                        background: ${type === 'property' ? `${color}22` : '#f8f9fa'};
                        border-radius: 6px;
                        font-size: 13px;
                        color: ${color || '#333'};
                        ${type === 'quote' ? 'font-style: italic;' : ''}
                        ${type === 'property' ? 'font-weight: 500;' : ''}
                        word-break: break-word;
                        line-height: 1.4;
                    ">
                        ${this.escapeHtml(value)}
                    </div>
                </div>
            `;
        }
        
        closeModal(modal, content) {
            modal.style.opacity = '0';
            content.style.transform = 'scale(0.9)';
            setTimeout(() => modal.remove(), 300);
        }
        
        // Utility methods
        formatType(type) {
            return type.charAt(0).toUpperCase() + type.slice(1);
        }
        
        getTypeIcon(type) {
            const icons = {
                text: '<svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm5 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6zm0 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6z"/></svg>',
                image: '<svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12z"/></svg>',
                table: '<svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/></svg>'
            };
            return icons[type] || '';
        }
        
        getTypeColor(type) {
            const colors = {
                text: '#2196F3',
                image: '#4CAF50',
                table: '#9C27B0'
            };
            return colors[type] || '#6c757d';
        }
        
        getConfidenceColor(confidence) {
            if (confidence >= 0.8) return '#10b981';
            if (confidence >= 0.5) return '#f59e0b';
            return '#ef4444';
        }
        
        truncate(text, maxLength) {
            if (!text) return '';
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
        
        cleanup() {
            this.modalManager = null;
        }
    }
    
    // Export to global scope
    global.InfoHandler = InfoHandler;
    console.log('📢 InfoHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/handlers/InfoHandler.js] Error:', error);
    }
  })();

  // ===== Module: markers/handlers/SendHandler.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/handlers/SendHandler.js
// Handles sending markers to ORKG

(function(global) {
    'use strict';
    
    class SendHandler {
        constructor(menuHandler) {
            this.menuHandler = menuHandler;
            this.modalManager = null;
            this.marker = null;
        }
        
        setup(modalManager, marker) {
            this.modalManager = modalManager;
            this.marker = marker;
        }
        
        handle(markerId, markerData) {
            console.log('Handling send for:', markerId);
            
            const counts = this.getAllTypeCounts();
            
            if (this.modalManager) {
                this.modalManager.showSendOptions(
                    markerData,
                    counts,
                    (action) => {
                        if (action === 'send-this') {
                            this.sendSingleItem(markerId, markerData);
                        } else if (action === 'send-all') {
                            this.sendAllItems();
                        }
                    },
                    true // Use property window style
                );
            } else {
                // Direct send without modal
                this.sendSingleItem(markerId, markerData);
            }
        }
        
        sendSingleItem(markerId, markerData) {
            console.log('📤 Sending single item:', markerId);
            
            // Create send animation
            this.createSendAnimation(markerData.markerElement);
            
            // Mark as extracted
            if (markerData.markerElement) {
                setTimeout(() => {
                    markerData.markerElement.classList.add('orkg-extracted');
                }, 1000);
            }
            
            // Send to extension
            this.menuHandler.sendToExtension('SEND', markerId, markerData);
            this.menuHandler.showFeedback('Item sent to ORKG', 'success');
        }
        
        sendAllItems() {
            const items = this.getAllCategorizedItems();
            
            if (items.totalCount === 0) {
                this.menuHandler.showFeedback('No items to send', 'warning');
                return;
            }
            
            if (this.modalManager) {
                this.modalManager.showSendAll(items, (selectedItems) => {
                    this.sendSelectedItems(selectedItems);
                }, 'property-window');
            } else {
                // Send all without selection
                this.sendSelectedItems(items);
            }
        }
        
        sendSelectedItems(selectedItems) {
            console.log(`📤 Sending ${selectedItems.total || selectedItems.totalCount} items to ORKG`);
            
            // Get all items to send
            const allItems = [
                ...(selectedItems.text || []),
                ...(selectedItems.images || []),
                ...(selectedItems.tables || [])
            ];
            
            // Create wave animation
            this.createWaveAnimation();
            
            // Animate each item
            let delay = 0;
            allItems.forEach(item => {
                setTimeout(() => {
                    if (item.element || item.markerElement) {
                        const element = item.element || item.markerElement;
                        this.createSendAnimation(element);
                        
                        // Mark as extracted after animation
                        setTimeout(() => {
                            element.classList.add('orkg-extracted');
                        }, 600);
                    }
                }, delay);
                delay += 150; // Stagger animations
            });
            
            // Send to extension
            this.menuHandler.sendToExtension('SEND_MULTIPLE', null, selectedItems);
            
            // Show feedback after animations
            setTimeout(() => {
                const count = selectedItems.total || selectedItems.totalCount;
                this.menuHandler.showFeedback(`Sent ${count} items to ORKG`, 'success');
            }, delay + 500);
        }
        
        createSendAnimation(element) {
            if (!element) return;
            
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Create particle container
            const particleContainer = document.createElement('div');
            particleContainer.className = 'orkg-send-particles';
            particleContainer.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: 0;
                height: 0;
                pointer-events: none;
                z-index: 99999;
            `;
            document.body.appendChild(particleContainer);
            
            // Create particles
            for (let i = 0; i < 12; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    background: #e86161;
                    border-radius: 50%;
                    opacity: 1;
                    transform: scale(1);
                    box-shadow: 0 0 4px rgba(232, 97, 97, 0.6);
                `;
                particleContainer.appendChild(particle);
                
                const angle = (i / 12) * Math.PI * 2;
                const distance = 40 + Math.random() * 40;
                const duration = 600 + Math.random() * 400;
                
                particle.animate([
                    { 
                        transform: 'translate(0, 0) scale(1)',
                        opacity: 1
                    },
                    { 
                        transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
                        opacity: 0
                    }
                ], {
                    duration: duration,
                    easing: 'cubic-bezier(0, 0.5, 0.5, 1)',
                    fill: 'forwards'
                });
            }
            
            // Pulse effect on element
            if (element.animate) {
                element.animate([
                    { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(232, 97, 97, 0.4)' },
                    { transform: 'scale(1.08)', boxShadow: '0 0 25px 15px rgba(232, 97, 97, 0.3)' },
                    { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(232, 97, 97, 0)' }
                ], {
                    duration: 600,
                    easing: 'ease-out'
                });
            }
            
            // Clean up particles
            setTimeout(() => {
                particleContainer.remove();
            }, 1200);
        }
        
        createWaveAnimation() {
            const wave = document.createElement('div');
            wave.className = 'orkg-send-wave';
            wave.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                width: 100px;
                height: 100px;
                border-radius: 50%;
                border: 3px solid #e86161;
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 99998;
                opacity: 0.8;
            `;
            document.body.appendChild(wave);
            
            wave.animate([
                {
                    width: '100px',
                    height: '100px',
                    opacity: 0.8
                },
                {
                    width: '300px',
                    height: '300px',
                    opacity: 0
                }
            ], {
                duration: 1500,
                easing: 'ease-out',
                fill: 'forwards'
            });
            
            setTimeout(() => {
                wave.remove();
            }, 1500);
        }
        
        getAllTypeCounts() {
            const counts = {
                text: 0,
                image: 0,
                table: 0,
                total: 0
            };
            
            // Count from DOM
            counts.text = document.querySelectorAll('.orkg-highlighted').length;
            counts.image = document.querySelectorAll('.orkg-image-marker').length;
            counts.table = document.querySelectorAll('.orkg-table-marker').length;
            
            // Check TextHighlighter
            if (global.TextHighlighter?.getHighlightCount) {
                counts.text = Math.max(counts.text, global.TextHighlighter.getHighlightCount());
            }
            
            // Check MarkerRegistry
            if (global.MarkerRegistry) {
                const stats = global.MarkerRegistry.getStats();
                if (stats.byType) {
                    counts.text = Math.max(counts.text, stats.byType.text || 0);
                    counts.image = Math.max(counts.image, stats.byType.image || 0);
                    counts.table = Math.max(counts.table, stats.byType.table || 0);
                }
            }
            
            counts.total = counts.text + counts.image + counts.table;
            return counts;
        }
        
        getAllCategorizedItems() {
            const items = {
                text: [],
                images: [],
                tables: [],
                totalCount: 0
            };
            
            // Collect text highlights
            document.querySelectorAll('.orkg-highlighted').forEach(el => {
                const markerId = el.dataset.highlightId || 
                               el.dataset.markerId || 
                               el.id ||
                               this.generateId();
                
                items.text.push({
                    id: markerId,
                    element: el,
                    type: 'text',
                    text: this.extractTextContent(el),
                    metadata: this.getElementMetadata(el)
                });
            });
            
            // Collect image markers
            document.querySelectorAll('.orkg-image-marker').forEach(el => {
                const markerId = el.dataset.markerId || this.generateId();
                const imgElement = el.parentElement?.querySelector('img');
                
                items.images.push({
                    id: markerId,
                    element: el,
                    markerElement: el,
                    type: 'image',
                    metadata: {
                        ...this.getElementMetadata(el),
                        src: imgElement?.src,
                        alt: imgElement?.alt
                    }
                });
            });
            
            // Collect table markers
            document.querySelectorAll('.orkg-table-marker').forEach(el => {
                const markerId = el.dataset.markerId || this.generateId();
                const tableElement = el.parentElement?.querySelector('table');
                
                items.tables.push({
                    id: markerId,
                    element: el,
                    markerElement: el,
                    type: 'table',
                    metadata: {
                        ...this.getElementMetadata(el),
                        rows: tableElement?.rows?.length,
                        columns: tableElement?.rows[0]?.cells?.length
                    }
                });
            });
            
            // Get additional items from registry
            if (global.MarkerRegistry) {
                const allMarkers = global.MarkerRegistry.getAll();
                allMarkers.forEach(marker => {
                    // Add if not already collected
                    const list = marker.type === 'text' ? items.text :
                               marker.type === 'image' ? items.images :
                               marker.type === 'table' ? items.tables : null;
                    
                    if (list && !list.find(item => item.id === marker.id)) {
                        list.push(marker);
                    }
                });
            }
            
            items.totalCount = items.text.length + items.images.length + items.tables.length;
            return items;
        }
        
        extractTextContent(element) {
            let text = '';
            for (const node of element.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    text += node.textContent;
                } else if (node.nodeType === Node.ELEMENT_NODE && 
                          !node.classList.contains('orkg-marker') &&
                          !node.classList.contains('orkg-marker-menu') &&
                          !node.classList.contains('orkg-marker-tooltip')) {
                    text += this.extractTextContent(node);
                }
            }
            return text;
        }
        
        getElementMetadata(element) {
            try {
                const metadataStr = element.dataset.metadata;
                if (metadataStr) {
                    return JSON.parse(metadataStr);
                }
                
                // Try to extract from data attributes
                const metadata = {};
                if (element.dataset.property) {
                    try {
                        metadata.property = JSON.parse(element.dataset.property);
                    } catch (e) {
                        metadata.property = { label: element.dataset.propertyLabel || element.dataset.property };
                    }
                }
                
                if (element.style.backgroundColor) {
                    metadata.color = element.style.backgroundColor;
                }
                
                return metadata;
            } catch (e) {
                console.warn('Could not parse metadata:', e);
                return {};
            }
        }
        
        generateId() {
            return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        cleanup() {
            this.modalManager = null;
            this.marker = null;
        }
    }
    
    // Export to global scope
    global.SendHandler = SendHandler;
    console.log('📢 SendHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/handlers/SendHandler.js] Error:', error);
    }
  })();

  // ===== Module: markers/handlers/MenuActionHandler.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/handlers/MenuActionHandler.js
// Main file - coordinates all menu actions

(function(global) {
    'use strict';
    
    // Import action handlers (these will be loaded from separate files)
    const DeleteHandler = global.DeleteHandler || {};
    const UpdateHandler = global.UpdateHandler || {};
    const InfoHandler = global.InfoHandler || {};
    const SendHandler = global.SendHandler || {};
    
    class MenuActionHandler {
        constructor(baseMarker) {
            this.marker = baseMarker;
            this.isSetup = false;
            this.modalManager = null;
            this.propertyWindow = null;
            
            // Initialize action handlers
            this.deleteHandler = new DeleteHandler(this);
            this.updateHandler = new UpdateHandler(this);
            this.infoHandler = new InfoHandler(this);
            this.sendHandler = new SendHandler(this);
            
            // Bind methods
            this.handleMenuItemClick = this.handleMenuItemClick.bind(this);
        }
        
        setup() {
            if (this.isSetup) return;
            
            console.log('🔧 Setting up MenuActionHandler for', this.marker.getType());
            
            // Get modal manager instance
            this.modalManager = global.ModalManager?.getInstance();
            if (!this.modalManager && global.ModalManager) {
                this.modalManager = new global.ModalManager();
            }
            
            // Get property window instance
            this.propertyWindow = global.propertyWindow || global.PropertyWindow;
            if (typeof this.propertyWindow === 'function') {
                this.propertyWindow = new this.propertyWindow();
            }
            
            // Setup handlers
            this.deleteHandler.setup(this.modalManager, this.marker);
            this.updateHandler.setup(this.propertyWindow, this.marker);
            this.infoHandler.setup(this.modalManager);
            this.sendHandler.setup(this.modalManager, this.marker);
            
            this.isSetup = true;
            console.log('✅ MenuActionHandler setup complete');
        }
        
        handleMenuItemClick(e, menuItem) {
            e.preventDefault();
            e.stopPropagation();
            
            const action = menuItem.dataset.action;
            const marker = menuItem.closest('.orkg-marker');
            const markerId = marker?.dataset.markerId;
            
            if (!action || !markerId) {
                console.warn('Missing action or markerId');
                return;
            }
            
            console.log('Menu action triggered:', action, 'for marker:', markerId);
            
            // Get marker data
            const markerData = this.getMarkerData(markerId, marker);
            
            // Hide menu immediately
            const menu = menuItem.closest('.orkg-marker-menu');
            if (menu) {
                menu.classList.remove('orkg-menu-visible');
            }
            
            // Execute action
            this.executeAction(action, markerId, markerData);
        }
        
        getMarkerData(markerId, markerElement) {
            let markerData = null;
            
            // Try to get from marker instance
            if (this.marker && typeof this.marker.getMarker === 'function') {
                markerData = this.marker.getMarker(markerId);
            }
            
            // Try to get from registry
            if (!markerData && global.MarkerRegistry) {
                markerData = global.MarkerRegistry.get(markerId);
            }
            
            // Create from element if needed
            if (!markerData && markerElement) {
                markerData = {
                    id: markerId,
                    type: markerElement.dataset.markerType || this.marker?.getType() || 'text',
                    element: markerElement,
                    markerElement: markerElement,
                    metadata: {},
                    createdAt: Date.now()
                };
                
                try {
                    const metadataStr = markerElement.dataset.metadata;
                    if (metadataStr) {
                        markerData.metadata = JSON.parse(metadataStr);
                    }
                } catch (e) {
                    console.warn('Could not parse metadata:', e);
                }
            }
            
            return markerData;
        }
        
        executeAction(action, markerId, markerData) {
            console.log(`Executing ${action} for marker ${markerId}`);
            
            switch (action) {
                case 'delete':
                    this.deleteHandler.handle(markerId, markerData);
                    break;
                case 'update':
                    this.updateHandler.handle(markerId, markerData);
                    break;
                case 'info':
                    this.infoHandler.handle(markerId, markerData);
                    break;
                case 'send':
                    this.sendHandler.handle(markerId, markerData);
                    break;
                default:
                    console.warn('Unknown action:', action);
            }
        }
        
        // Utility methods shared by all handlers
        showFeedback(message, type = 'info') {
            const existing = document.querySelector('.orkg-feedback');
            if (existing) existing.remove();
            
            const feedback = document.createElement('div');
            feedback.className = `orkg-feedback orkg-feedback-${type}`;
            feedback.textContent = message;
            document.body.appendChild(feedback);
            
            requestAnimationFrame(() => {
                feedback.classList.add('orkg-feedback-visible');
            });
            
            setTimeout(() => {
                feedback.classList.remove('orkg-feedback-visible');
                setTimeout(() => feedback.remove(), 300);
            }, 2500);
        }
        
        sendToExtension(action, markerId, data) {
            if (!chrome?.runtime?.sendMessage) {
                console.warn('Chrome runtime not available');
                return;
            }
            
            chrome.runtime.sendMessage({
                action: `${action}_${data.type?.toUpperCase() || 'TEXT'}`,
                data: {
                    markerId,
                    metadata: data.metadata || data,
                    timestamp: Date.now()
                }
            }).catch(error => {
                console.warn('Failed to send message:', error);
            });
        }
        
        cleanup() {
            this.isSetup = false;
            this.modalManager = null;
            this.propertyWindow = null;
            
            // Cleanup handlers
            this.deleteHandler?.cleanup();
            this.updateHandler?.cleanup();
            this.infoHandler?.cleanup();
            this.sendHandler?.cleanup();
            
            console.log('✅ MenuActionHandler cleaned up');
        }
    }
    
    // Export to global scope
    global.MenuActionHandler = MenuActionHandler;
    console.log('📢 MenuActionHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/handlers/MenuActionHandler.js] Error:', error);
    }
  })();

  // ===== Module: markers/base/MarkerUI.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/base/MarkerUI.js
// Enhanced MarkerUI with proper menu click handling and tooltips

(function(global) {
    'use strict';
    
    class MarkerUI {
        constructor(config = {}) {
            this.config = {
                menuHideDelay: config.menuHideDelay || 500,
                enableAnimations: config.enableAnimations !== false,
                enableTooltips: config.enableTooltips !== false,
                tooltipDelay: config.tooltipDelay || 200,
                importance: config.importance || 'normal',
                ...config
            };
            
            this.activeMenus = new Map();
            this.tooltipTimeouts = new Map();
            this.menuActionCallback = null;
            this.menuHandler = null;
            
            // Get references to global services
            this.iconRegistry = global.IconRegistry;
            this.tooltipSystem = global.markerTooltip;
            
            this.ensureStyles();
        }
        
        ensureStyles() {
            if (!document.getElementById('orkg-marker-styles')) {
                const link = document.createElement('link');
                link.id = 'orkg-marker-styles';
                link.rel = 'stylesheet';
                link.href = chrome?.runtime?.getURL ? 
                    chrome.runtime.getURL('src/styles/content/markers.css') : 
                    '/src/styles/content/markers.css';
                document.head.appendChild(link);
            }
        }
        
        setMenuActionCallback(callback) {
            this.menuActionCallback = callback;
        }
        
        setMenuHandler(handler) {
            this.menuHandler = handler;
        }
        
        createMarkerElement(markerData) {
            const marker = document.createElement('div');
            marker.className = `orkg-marker orkg-${markerData.type}-marker`;
            marker.dataset.markerId = markerData.id;
            marker.dataset.markerType = markerData.type;
            marker.dataset.metadata = JSON.stringify(markerData.metadata || {});
            
            if (this.config.importance) {
                marker.classList.add(`orkg-importance-${this.config.importance}`);
            }
            
            // Add content
            const content = this.createMarkerContent(markerData);
            marker.appendChild(content);
            
            // Add menu
            const menu = this.createMarkerMenu(markerData);
            marker.appendChild(menu);
            
            // Add tooltip if enabled
            if (this.config.enableTooltips) {
                this.addTooltip(marker, markerData);
            }
            
            // Attach event handlers
            this.attachMarkerEventHandlers(marker, markerData);
            
            // Add entrance animation
            if (this.config.enableAnimations) {
                marker.classList.add('orkg-marker-entrance');
                setTimeout(() => {
                    marker.classList.remove('orkg-marker-entrance');
                }, 600);
            }
            
            return marker;
        }
        
        createMarkerContent(markerData) {
            const container = document.createElement('div');
            container.className = 'orkg-marker-content';
            
            const iconContainer = document.createElement('div');
            iconContainer.className = 'orkg-marker-icon-container';
            
            // ORKG logo
            if (chrome?.runtime?.getURL) {
                const img = document.createElement('img');
                img.src = chrome.runtime.getURL('assets/icons/icon128.png');
                img.className = 'orkg-marker-icon';
                img.alt = 'ORKG';
                iconContainer.appendChild(img);
            } else {
                const placeholder = document.createElement('span');
                placeholder.className = 'orkg-marker-icon-placeholder';
                placeholder.textContent = 'ORKG';
                iconContainer.appendChild(placeholder);
            }
            
            container.appendChild(iconContainer);
            
            // Type indicator
            const indicator = this.createTypeIndicator(markerData.type);
            if (indicator) {
                container.appendChild(indicator);
            }
            
            return container;
        }
        
        createTypeIndicator(type) {
            const indicator = document.createElement('div');
            indicator.className = 'orkg-marker-type-indicator';
            indicator.innerHTML = this.getTypeIconSVG(type);
            return indicator;
        }
        
        getTypeIconSVG(type) {
            const icons = {
                'text': '<svg width="10" height="10" viewBox="0 0 384 512" fill="currentColor"><path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm64 236c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8z"/></svg>',
                'image': '<svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor"><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h96 32H416c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"/></svg>',
                'table': '<svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor"><path d="M64 256V160H224v96H64zm0 64H224v96H64V320zm224 96V320H448v96H288zM448 256H288V160H448v96zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"/></svg>'
            };
            return icons[type] || '';
        }
        
        createMarkerMenu(markerData) {
            const menu = document.createElement('div');
            menu.className = 'orkg-marker-menu';
            menu.dataset.markerId = markerData.id;
            
            const menuItems = this.getMenuItemsForType(markerData.type);
            
            menuItems.forEach(item => {
                const button = this.createMenuButton(item, markerData);
                menu.appendChild(button);
            });
            
            // Prevent menu from closing when hovering
            menu.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                clearTimeout(this.menuHideTimeout);
            });
            
            menu.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                this.menuHideTimeout = setTimeout(() => {
                    this.hideMenu(markerData.id);
                }, this.config.menuHideDelay);
            });
            
            return menu;
        }
        
        getMenuItemsForType(type) {
            const baseItems = [
                { action: 'delete', icon: 'delete', title: 'Delete', color: '#f44336' },
                { action: 'info', icon: 'info', title: 'Info', color: '#4CAF50' },
                { action: 'send', icon: 'send', title: 'Send to ORKG', color: '#e86161' }
            ];
            
            if (type === 'text') {
                baseItems.splice(1, 0, {
                    action: 'update',
                    icon: 'edit',
                    title: 'Update Property',
                    color: '#2196F3'
                });
            }
            
            return baseItems;
        }
        
        createMenuButton(item, markerData) {
            const button = document.createElement('button');
            button.className = `orkg-menu-item orkg-menu-${item.action}`;
            button.dataset.action = item.action;
            button.dataset.markerId = markerData.id;
            button.title = item.title;
            button.type = 'button';
            
            // Add icon
            button.innerHTML = this.getMenuIconSVG(item.action);
            
            // Attach click handler directly to button
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleMenuItemClick(e, button, markerData);
            });
            
            return button;
        }
        
        getMenuIconSVG(action) {
            const icons = {
                'delete': '<svg width="14" height="14" viewBox="0 0 448 512" fill="#666"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>',
                'edit': '<svg width="14" height="14" viewBox="0 0 512 512" fill="#666"><path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/></svg>',
                'update': '<svg width="14" height="14" viewBox="0 0 512 512" fill="#666"><path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/></svg>',
                'info': '<svg width="14" height="14" viewBox="0 0 512 512" fill="#666"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg>',
                'send': '<svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor"><path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 492.3 160 478.3V396.4c0-4 1.6-7.8 4.4-10.6L331.8 202.8c5.9-6.3 5.6-16.1-.6-22s-16.1-5.6-22 .6L127 368.1 19.6 307.3c-9.1-5.1-14.8-14.5-14.8-24.7s5.6-19.5 14.6-24.7L483.9 5.6c11.2-6.8 25.1-5.8 35.2 0z"/></svg>'
            };
            return icons[action] || '<span>•</span>';
        }
        
        handleMenuItemClick(e, button, markerData) {
            console.log('Menu button clicked:', button.dataset.action);
            
            // Hide menu immediately
            this.hideMenu(markerData.id);
            
            // Use menu handler if available
            if (this.menuHandler) {
                this.menuHandler.handleMenuItemClick(e, button);
            } else if (this.menuActionCallback) {
                // Fallback to callback
                this.menuActionCallback(button.dataset.action, markerData);
            } else {
                console.warn('No menu handler or callback configured');
            }
        }
        
        attachMarkerEventHandlers(marker, markerData) {
            let tooltipTimeout;
            let menuTimeout;
            
            // Click handler for marker
            marker.addEventListener('click', (e) => {
                // Don't toggle menu if clicking on menu itself
                if (!e.target.closest('.orkg-marker-menu')) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMenu(markerData.id);
                }
            });
            
            // Hover handlers for tooltip and menu
            marker.addEventListener('mouseenter', () => {
                // Clear any hide timeouts
                clearTimeout(menuTimeout);
                
                // Show tooltip after delay if menu is not visible
                if (this.config.enableTooltips && !this.activeMenus.has(markerData.id)) {
                    tooltipTimeout = setTimeout(() => {
                        const tooltip = marker.querySelector('.orkg-marker-tooltip');
                        if (tooltip && !this.activeMenus.has(markerData.id)) {
                            tooltip.style.opacity = '1';
                            tooltip.style.visibility = 'visible';
                        }
                    }, this.config.tooltipDelay);
                    
                    this.tooltipTimeouts.set(markerData.id, tooltipTimeout);
                }
            });
            
            marker.addEventListener('mouseleave', () => {
                // Clear tooltip timeout
                if (tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                    this.tooltipTimeouts.delete(markerData.id);
                }
                
                // Hide tooltip immediately
                const tooltip = marker.querySelector('.orkg-marker-tooltip');
                if (tooltip) {
                    tooltip.style.opacity = '0';
                    tooltip.style.visibility = 'hidden';
                }
                
                // Hide menu after delay
                menuTimeout = setTimeout(() => {
                    if (!marker.matches(':hover')) {
                        this.hideMenu(markerData.id);
                    }
                }, this.config.menuHideDelay);
            });
        }
        
        addTooltip(marker, markerData) {
            const tooltip = document.createElement('div');
            tooltip.className = 'orkg-marker-tooltip';
            
            const content = this.getTooltipContent(markerData);
            tooltip.innerHTML = content;
            
            const arrow = document.createElement('div');
            arrow.className = 'orkg-tooltip-arrow';
            tooltip.appendChild(arrow);
            
            marker.appendChild(tooltip);
        }
        
        getTooltipContent(markerData) {
            const type = markerData.type;
            const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
            
            let html = `
                <div class="orkg-tooltip-type-badge">${typeLabel} Marker</div>
                <div style="margin-top: 4px; font-size: 11px; opacity: 0.9;">
                    Click to view options
                </div>
            `;
            
            // Add specific content based on type
            if (type === 'text' && markerData.metadata?.text) {
                const text = markerData.metadata.text;
                const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
                html += `
                    <div class="orkg-tooltip-text-preview">
                        "${this.escapeHtml(preview)}"
                    </div>
                `;
            } else if (type === 'image' && markerData.metadata?.alt) {
                html += `
                    <div class="orkg-tooltip-image-info">
                        ${this.escapeHtml(markerData.metadata.alt)}
                    </div>
                `;
            } else if (type === 'table' && markerData.metadata?.caption) {
                html += `
                    <div class="orkg-tooltip-table-info">
                        ${this.escapeHtml(markerData.metadata.caption)}
                    </div>
                `;
            }
            
            // Add property if exists
            if (markerData.metadata?.property?.label) {
                html += `
                    <div class="orkg-tooltip-property">
                        Property: <strong>${this.escapeHtml(markerData.metadata.property.label)}</strong>
                    </div>
                `;
            }
            
            // Add confidence if exists
            if (markerData.metadata?.confidence) {
                const confidence = Math.round(markerData.metadata.confidence * 100);
                html += `
                    <div class="orkg-tooltip-confidence">
                        Confidence: ${confidence}%
                    </div>
                `;
            }
            
            return html;
        }
        
        showMenu(markerId) {
            // Hide all other menus first
            this.hideAllMenus();
            
            // Find the menu
            const menu = document.querySelector(`.orkg-marker-menu[data-marker-id="${markerId}"]`);
            if (menu) {
                menu.classList.add('orkg-menu-visible');
                this.activeMenus.set(markerId, menu);
                
                // Hide tooltip when menu is shown
                const marker = document.querySelector(`.orkg-marker[data-marker-id="${markerId}"]`);
                if (marker) {
                    const tooltip = marker.querySelector('.orkg-marker-tooltip');
                    if (tooltip) {
                        tooltip.style.opacity = '0';
                        tooltip.style.visibility = 'hidden';
                    }
                }
            }
        }
        
        hideMenu(markerId) {
            const menu = this.activeMenus.get(markerId);
            if (menu) {
                menu.classList.remove('orkg-menu-visible');
                this.activeMenus.delete(markerId);
            } else {
                // Try to find and hide menu directly
                const menu = document.querySelector(`.orkg-marker-menu[data-marker-id="${markerId}"]`);
                if (menu) {
                    menu.classList.remove('orkg-menu-visible');
                }
            }
        }
        
        hideAllMenus() {
            // Hide tracked menus
            this.activeMenus.forEach(menu => {
                menu.classList.remove('orkg-menu-visible');
            });
            this.activeMenus.clear();
            
            // Also hide any untracked menus
            document.querySelectorAll('.orkg-marker-menu.orkg-menu-visible').forEach(menu => {
                menu.classList.remove('orkg-menu-visible');
            });
        }
        
        toggleMenu(markerId) {
            if (this.activeMenus.has(markerId)) {
                this.hideMenu(markerId);
            } else {
                this.showMenu(markerId);
            }
        }
        
        updateMarkerElement(markerElement, updates) {
            if (!markerElement) return;
            
            if (updates.metadata) {
                try {
                    const currentMetadata = JSON.parse(markerElement.dataset.metadata || '{}');
                    const newMetadata = { ...currentMetadata, ...updates.metadata };
                    markerElement.dataset.metadata = JSON.stringify(newMetadata);
                    
                    // Update tooltip if exists
                    const tooltip = markerElement.querySelector('.orkg-marker-tooltip');
                    if (tooltip) {
                        const markerData = {
                            type: markerElement.dataset.markerType,
                            metadata: newMetadata
                        };
                        const content = this.getTooltipContent(markerData);
                        
                        // Preserve arrow
                        const arrow = tooltip.querySelector('.orkg-tooltip-arrow');
                        tooltip.innerHTML = content;
                        if (arrow) {
                            tooltip.appendChild(arrow);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to update marker metadata:', e);
                }
            }
            
            if (updates.extracted !== undefined) {
                markerElement.classList.toggle('orkg-extracted', updates.extracted);
            }
            
            if (updates.extracting !== undefined) {
                markerElement.classList.toggle('orkg-extracting', updates.extracting);
            }
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
        
        cleanup() {
            this.hideAllMenus();
            this.tooltipTimeouts.forEach(timeout => clearTimeout(timeout));
            this.tooltipTimeouts.clear();
            clearTimeout(this.menuHideTimeout);
        }
    }
    
    global.MarkerUI = MarkerUI;
    console.log('📢 MarkerUI class exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/base/MarkerUI.js] Error:', error);
    }
  })();

  // ===== Module: markers/base/BaseMarker.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/base/BaseMarker.js

(function(global) {
    'use strict';
    
    /**
     * Enhanced BaseMarker with complete menu action integration
     */
    class BaseMarker {
        constructor(config = {}) {
            // Configuration
            this.config = Object.assign(
                {
                    markerSize: 44,
                    markerOffset: 10,
                    tooltipDelay: 200,
                    menuHideDelay: 300,
                    animationDuration: 300,
                    enableAnimations: true,
                    enableTooltips: true,
                    enableMenus: true,
                    colors: {
                        primary: '#e86161',
                        text: '#2196F3',
                        image: '#4CAF50',
                        table: '#9C27B0'
                    }
                },
                config
            );
            
            // Core state
            this.markers = new Map();
            this.isActive = false;
            this.isInitialized = false;
            this.extractedItems = new Set();
            this.lastMarkerCreated = null;
            
            // Services
            this.registry = null;
            this.eventBus = null;
            this.ui = null;
            this.animationService = null;
            this.menuHandler = null;
            this.modalManager = null;
            this.tooltipSystem = null;
            
            // Menu state
            this.activeMenuId = null;
            this.menuHideTimeout = null;
            
            console.log(`📍 ${this.getType()} marker instance created`);
        }
        
        // ================================
        // Abstract Methods (must override)
        // ================================
        
        getType() {
            throw new Error('getType() must be implemented by subclass');
        }
        
        getTypeIcon() {
            // Override in subclass for specific icon
            return '';
        }
        
        getParticleColor() {
            return this.config.colors[this.getType()] || this.config.colors.primary;
        }
        
        // ================================
        // Lifecycle Methods
        // ================================
        
        async init() {
            if (this.isInitialized) {
                console.warn(`${this.getType()} marker already initialized`);
                return;
            }
            
            try {
                // Initialize services
                this.registry = global.MarkerRegistry;
                this.eventBus = global.MarkerEventBus;
                this.animationService = global.AnimationService || global.FlyAnimation;
                this.tooltipSystem = global.markerTooltip;
                
                // Initialize Modal Manager
                this.modalManager = global.ModalManager?.getInstance();
                if (!this.modalManager && global.ModalManager) {
                    this.modalManager = new global.ModalManager();
                }
                
                // Initialize UI
                if (!this.ui) {
                    const MarkerUIClass = global.MarkerUI;
                    if (!MarkerUIClass) throw new Error('MarkerUI not available');
                    this.ui = new MarkerUIClass(this.config);
                    
                    // Set menu action callback
                    this.ui.setMenuActionCallback((action, markerData) => {
                        this.handleMenuAction(action, markerData);
                    });
                }
                
                // Initialize MenuActionHandler
                if (!this.menuHandler && global.MenuActionHandler) {
                    this.menuHandler = new global.MenuActionHandler(this);
                    this.menuHandler.setup();
                    console.log('✅ MenuActionHandler initialized');
                }
                
                // Type-specific initialization
                await this.onInit();
                
                this.isInitialized = true;
                this.eventBus?.emit('marker:initialized', { type: this.getType() });
                console.log(`✅ ${this.getType()} marker initialized`);
                
            } catch (error) {
                console.error(`❌ Failed to initialize ${this.getType()} marker:`, error);
                throw error;
            }
        }
        
        async activate(config = {}) {
            if (!this.isInitialized) {
                await this.init();
            }
            
            if (this.isActive) {
                console.warn(`${this.getType()} marker already active`);
                return { success: true, count: this.markers.size };
            }
            
            try {
                console.log(`🔍 Activating ${this.getType()} markers with config:`, config);
                
                // Clear existing markers
                this.cleanup();
                
                // Type-specific activation
                const result = await this.onActivate(config);
                
                this.isActive = true;
                this.eventBus?.emit('marker:activated', { type: this.getType(), result });
                
                console.log(`✅ ${this.getType()} markers activated:`, result);
                return result;
                
            } catch (error) {
                console.error(`❌ Failed to activate ${this.getType()} markers:`, error);
                return { success: false, error: error.message, count: 0 };
            }
        }
        
        deactivate() {
            if (!this.isActive) {
                console.warn(`${this.getType()} marker not active`);
                return;
            }
            
            console.log(`🔻 Deactivating ${this.getType()} markers`);
            
            // Type-specific deactivation
            this.onDeactivate();
            
            // Clear all markers
            this.cleanup();
            
            this.isActive = false;
            this.eventBus?.emit('marker:deactivated', { type: this.getType() });
            console.log(`✅ ${this.getType()} markers deactivated`);
        }
        
        // ================================
        // Core Marker Creation
        // ================================
        
        createMarker(element, metadata = {}) {
            if (!element) {
                console.error('Invalid element provided');
                return null;
            }
            
            const markerId = metadata.id || this.generateMarkerId();
            
            // Check if marker already exists
            if (this.markers.has(markerId)) {
                console.warn(`Marker ${markerId} already exists`);
                return this.markers.get(markerId);
            }
            
            // Ensure UI is initialized
            if (!this.ui) {
                console.error('UI not initialized');
                return null;
            }
            
            // Create marker data
            const markerData = {
                id: markerId,
                type: this.getType(),
                element: element,
                metadata: metadata,
                createdAt: Date.now(),
                visible: true,
                extracted: false
            };
            
            // Create marker element
            const markerElement = this.ui.createMarkerElement(markerData);
            if (!markerElement) {
                console.error('Failed to create marker element');
                return null;
            }
            
            // Position marker
            this.positionMarker(markerElement, element, metadata);
            
            // Store marker data
            markerData.markerElement = markerElement;
            
            // Store in local map
            this.markers.set(markerId, markerData);
            
            // Register with global registry
            this.registry?.register(markerData);
            this.lastMarkerCreated = markerId;
            
            // Emit event
            this.eventBus?.emit('marker:created', markerData);
            
            // Animate entrance
            if (this.config.enableAnimations) {
                this.animateMarkerEntrance(markerElement);
            }
            
            return markerData;
        }
        
        // ================================
        // Positioning System
        // ================================
        
        positionMarker(markerElement, targetElement, metadata) {
            const type = this.getType();
            
            // Ensure container for images/tables
            if (type === 'image' || type === 'table') {
                const container = this.ensureMarkerContainer(targetElement);
                container.appendChild(markerElement);
                markerElement.classList.add('orkg-marker-positioned');
            } else if (type === 'text') {
                // For text, position relative to the highlight
                targetElement.style.position = 'relative';
                targetElement.appendChild(markerElement);
                markerElement.style.position = 'absolute';
                markerElement.style.top = '-12px';
                markerElement.style.right = '-12px';
            } else {
                // Default positioning
                const container = this.ensureMarkerContainer(targetElement);
                container.appendChild(markerElement);
            }
        }
        
        ensureMarkerContainer(element) {
            const parent = element.parentElement;
            
            // Check if already has container
            if (parent?.classList.contains('orkg-marker-container')) {
                return parent;
            }
            
            // Create container
            const container = document.createElement('div');
            container.className = 'orkg-marker-container';
            container.dataset.orkgElement = 'true';
            container.style.cssText = 'position: relative; display: inline-block;';
            
            // Wrap element
            if (element.parentNode) {
                element.parentNode.insertBefore(container, element);
                container.appendChild(element);
            }
            
            return container;
        }
        
        // ================================
        // Menu System
        // ================================
        
        toggleMenu(markerId) {
            if (this.activeMenuId === markerId) {
                this.hideMenu(markerId);
            } else {
                this.showMenu(markerId);
            }
        }
        
        showMenu(markerId) {
            // Hide any other open menu
            if (this.activeMenuId && this.activeMenuId !== markerId) {
                this.hideMenu(this.activeMenuId);
            }
            
            // Clear hide timeout
            clearTimeout(this.menuHideTimeout);
            
            // Show menu using UI
            this.ui?.showMenu(markerId);
            this.activeMenuId = markerId;
            
            // Hide tooltip when menu is shown
            const markerData = this.markers.get(markerId) || this.registry?.get(markerId);
            if (markerData?.markerElement) {
                this.tooltipSystem?.hide(markerData.markerElement);
            }
        }
        
        hideMenu(markerId) {
            this.ui?.hideMenu(markerId);
            
            if (this.activeMenuId === markerId) {
                this.activeMenuId = null;
            }
        }
        
        hideAllMenus() {
            this.ui?.hideAllMenus();
            this.activeMenuId = null;
        }
        
        // ================================
        // Menu Action Handlers
        // ================================
        
        handleMenuAction(action, markerData) {
            console.log(`Handling ${action} for marker ${markerData.id}`);
            
            // If we have a menuHandler, delegate to it
            if (this.menuHandler) {
                this.menuHandler.executeAction(action, markerData.id, markerData);
                return;
            }
            
            // Otherwise handle here
            switch (action) {
                case 'delete':
                    this.handleDelete(markerData);
                    break;
                case 'update':
                    this.handleUpdate(markerData);
                    break;
                case 'info':
                    this.handleInfo(markerData);
                    break;
                case 'send':
                    this.handleSend(markerData);
                    break;
                default:
                    console.warn(`Unknown action: ${action}`);
            }
        }
        
        handleDelete(markerData) {
            if (this.modalManager) {
                this.modalManager.showDeleteConfirm(
                    markerData,
                    () => {
                        this.performDelete(markerData.id, markerData);
                    },
                    () => {
                        console.log('Delete cancelled');
                    }
                );
            } else {
                if (confirm(`Delete this ${markerData.type} marker?`)) {
                    this.performDelete(markerData.id, markerData);
                }
            }
        }
        
        performDelete(markerId, markerData) {
            console.log('Performing delete for:', markerId);
            
            // For text markers, remove highlight
            if (markerData.type === 'text') {
                const highlightId = markerData.metadata?.highlightId || markerId;
                if (global.TextHighlighter?.removeHighlight) {
                    global.TextHighlighter.removeHighlight(highlightId);
                }
            }
            
            // Remove marker
            this.removeMarker(markerId);
            
            // Send notification
            this.sendToExtension('DELETE', markerId, markerData);
            this.showFeedback('Marker deleted successfully', 'success');
        }
        
        handleUpdate(markerData) {
            if (markerData.type !== 'text') {
                this.showFeedback('Update is only available for text markers', 'warning');
                return;
            }
            
            const propertyWindow = global.PropertyWindow || global.propertyWindow;
            if (!propertyWindow) {
                this.showFeedback('Property window not available', 'error');
                return;
            }
            
            const element = markerData.element || markerData.markerElement;
            const rect = element?.getBoundingClientRect();
            
            if (!rect) {
                console.error('Could not get position for property window');
                return;
            }
            
            const position = {
                x: rect.right + window.scrollX + 10,
                y: rect.top + window.scrollY
            };
            
            const text = markerData.metadata?.text || 'Selected text';
            console.log('Opening property window for update:', text);
            
            propertyWindow.show(text, position);
        }
        
        handleInfo(markerData) {
            if (this.modalManager) {
                this.modalManager.showInfo(markerData, markerData.type);
            } else {
                const infoText = this.getInfoText(markerData);
                alert(infoText);
            }
        }
        
        handleSend(markerData) {
            const counts = this.getAllTypeCounts();
            
            if (this.modalManager) {
                this.modalManager.showSendOptions(
                    markerData,
                    counts,
                    (action) => {
                        if (action === 'send-this') {
                            this.sendSingleItem(markerData.id, markerData);
                        } else if (action === 'send-all') {
                            this.sendAllItems();
                        }
                    }
                );
            } else {
                this.sendSingleItem(markerData.id, markerData);
            }
        }
        
        getInfoText(markerData) {
            const lines = [
                `Type: ${markerData.type}`,
                `ID: ${markerData.id}`,
                `Created: ${new Date(markerData.createdAt).toLocaleString()}`
            ];
            
            if (markerData.metadata?.text) {
                lines.push(`Text: ${markerData.metadata.text.substring(0, 100)}...`);
            }
            
            if (markerData.metadata?.property?.label) {
                lines.push(`Property: ${markerData.metadata.property.label}`);
            }
            
            return lines.join('\n');
        }
        
        // ================================
        // Marker Operations
        // ================================
        
        removeMarker(markerId) {
            const markerData = this.markers.get(markerId) || this.registry?.get(markerId);
            if (!markerData) return false;
            
            // Remove marker element with animation
            if (markerData.markerElement?.parentNode) {
                if (this.config.enableAnimations) {
                    markerData.markerElement.classList.add('orkg-marker-exit');
                    setTimeout(() => {
                        markerData.markerElement.remove();
                    }, 300);
                } else {
                    markerData.markerElement.remove();
                }
            }
            
            // Clean up container if empty
            const container = markerData.markerElement?.parentNode;
            if (container?.classList.contains('orkg-marker-container')) {
                if (container.children.length <= 1) {
                    const child = container.firstElementChild;
                    if (container.parentNode && child) {
                        container.parentNode.insertBefore(child, container);
                        container.remove();
                    }
                }
            }
            
            // Remove from local map
            this.markers.delete(markerId);
            
            // Unregister from global registry
            this.registry?.unregister(markerId);
            this.extractedItems.delete(markerId);
            
            // Emit event
            this.eventBus?.emit('marker:removed', { 
                id: markerId, 
                type: this.getType() 
            });
            
            // Type-specific cleanup
            this.onMarkerRemoved(markerId, markerData);
            
            return true;
        }
        
        updateMarker(markerId, updates) {
            const markerData = this.markers.get(markerId) || this.registry?.get(markerId);
            if (!markerData) return false;
            
            // Update metadata
            Object.assign(markerData.metadata, updates);
            
            // Update UI
            if (markerData.markerElement) {
                this.ui?.updateMarkerElement(markerData.markerElement, updates);
            }
            
            // Emit event
            this.eventBus?.emit('marker:updated', {
                id: markerId,
                type: this.getType(),
                updates
            });
            
            return true;
        }
        
        getMarker(markerId) {
            return this.markers.get(markerId) || this.registry?.get(markerId);
        }
        
        getAllMarkers() {
            return Array.from(this.markers.values());
        }
        
        getMarkerCount() {
            return this.markers.size;
        }
        
        // ================================
        // Send Methods
        // ================================
        
        async sendSingleItem(markerId, markerData) {
            console.log(`📤 Sending single item:`, markerId);
            
            // Animate if available
            const element = markerData.element || markerData.markerElement;
            if (this.animationService && element) {
                await this.animationService.flyToExtension(element, markerData.metadata);
            }
            
            // Mark as extracted
            if (markerData.markerElement) {
                markerData.markerElement.classList.add('orkg-extracted');
            }
            this.extractedItems.add(markerId);
            
            // Send to extension
            this.sendToExtension('SEND', markerId, markerData);
            this.showFeedback('Item sent to ORKG', 'success');
        }
        
        async sendAllItems() {
            const items = this.getAllCategorizedItems();
            
            if (items.totalCount === 0) {
                this.showFeedback('No items to send', 'warning');
                return;
            }
            
            if (this.modalManager) {
                this.modalManager.showSendAll(items, async (selectedItems) => {
                    await this.sendSelectedItems(selectedItems);
                });
            }
        }
        
        async sendSelectedItems(selectedItems) {
            console.log(`📤 Sending ${selectedItems.total} items to ORKG`);
            
            // Mark items as sent
            [...selectedItems.text, ...selectedItems.images, ...selectedItems.tables].forEach(item => {
                this.extractedItems.add(item.id);
                const markerData = this.markers.get(item.id) || this.registry?.get(item.id);
                if (markerData?.markerElement) {
                    markerData.markerElement.classList.add('orkg-extracted');
                }
            });
            
            // Send to extension
            this.sendToExtension('SEND_MULTIPLE', null, selectedItems);
            this.showFeedback(`Sent ${selectedItems.total} items to ORKG`, 'success');
        }
        
        getAllTypeCounts() {
            const counts = {
                text: 0,
                image: 0,
                table: 0,
                total: 0
            };
            
            // Count from registry
            if (this.registry) {
                const stats = this.registry.getStats();
                counts.text = stats.byType?.text || 0;
                counts.image = stats.byType?.image || 0;
                counts.table = stats.byType?.table || 0;
            }
            
            // Check TextHighlighter
            if (global.TextHighlighter?.getHighlightCount) {
                counts.text = Math.max(counts.text, global.TextHighlighter.getHighlightCount());
            }
            
            counts.total = counts.text + counts.image + counts.table;
            return counts;
        }
        
        getAllCategorizedItems() {
            const items = {
                text: [],
                images: [],
                tables: [],
                totalCount: 0
            };
            
            // Get all markers from registry
            if (this.registry) {
                const allMarkers = this.registry.getAll();
                allMarkers.forEach(marker => {
                    if (marker.type === 'text') items.text.push(marker);
                    else if (marker.type === 'image') items.images.push(marker);
                    else if (marker.type === 'table') items.tables.push(marker);
                });
            }
            
            // Get text highlights
            if (global.TextHighlighter?.getAllHighlights) {
                const highlights = global.TextHighlighter.getAllHighlights();
                highlights.forEach(h => {
                    if (!items.text.find(t => t.id === h.id)) {
                        items.text.push(h);
                    }
                });
            }
            
            items.totalCount = items.text.length + items.images.length + items.tables.length;
            return items;
        }
        
        sendToExtension(action, markerId, data) {
            if (!chrome?.runtime?.sendMessage) {
                console.warn('Chrome runtime not available');
                return;
            }
            
            const message = {
                action: `${action}_${this.getType().toUpperCase()}`,
                data: {
                    markerId,
                    metadata: data,
                    timestamp: Date.now()
                }
            };
            
            chrome.runtime.sendMessage(message).catch(error => {
                console.warn('Failed to send message to extension:', error);
            });
        }
        
        showFeedback(message, type = 'info') {
            console.log(`Feedback (${type}): ${message}`);
            
            // Remove existing feedback
            const existing = document.querySelector('.orkg-feedback');
            if (existing) {
                existing.remove();
            }
            
            // Create feedback element
            const feedback = document.createElement('div');
            feedback.className = `orkg-feedback orkg-feedback-${type}`;
            feedback.textContent = message;
            document.body.appendChild(feedback);
            
            // Animate in
            requestAnimationFrame(() => {
                feedback.classList.add('orkg-feedback-visible');
            });
            
            // Remove after delay
            setTimeout(() => {
                feedback.classList.remove('orkg-feedback-visible');
                setTimeout(() => {
                    if (feedback.parentNode) {
                        feedback.remove();
                    }
                }, 300);
            }, 2500);
        }
        
        // ================================
        // Animation Methods
        // ================================
        
        animateMarkerEntrance(markerElement) {
            markerElement.classList.add('orkg-marker-entrance');
            
            // Remove class after animation
            setTimeout(() => {
                markerElement.classList.remove('orkg-marker-entrance');
            }, this.config.animationDuration);
        }
        
        // ================================
        // Sync Methods
        // ================================
        
        syncWithAnalyzer(items) {
            console.log(`🔄 Syncing ${this.getType()} markers with analyzer:`, items?.length || 0);
            
            // Clear extracted items
            this.extractedItems.clear();
            
            // Update markers based on analyzer items
            if (items && Array.isArray(items)) {
                items.forEach(item => {
                    if (item.id) {
                        this.extractedItems.add(item.id);
                        
                        // Update marker visual state
                        const markerData = this.markers.get(item.id) || this.registry?.get(item.id);
                        if (markerData?.markerElement) {
                            markerData.markerElement.classList.add('orkg-extracted');
                        }
                    }
                });
            }
            
            // Update non-extracted markers
            this.getAllMarkers().forEach(markerData => {
                if (!this.extractedItems.has(markerData.id) && markerData.markerElement) {
                    markerData.markerElement.classList.remove('orkg-extracted');
                }
            });
        }
        
        // ================================
        // Cleanup Methods
        // ================================
        
        cleanup() {
            console.log(`🧹 Cleaning up ${this.getType()} markers`);
            
            // Hide all menus
            this.hideAllMenus();
            
            // Remove all markers
            this.markers.forEach((markerData) => {
                if (markerData.markerElement?.parentNode) {
                    markerData.markerElement.remove();
                }
            });
            
            // Clear from registry
            if (this.registry) {
                const cleared = this.registry.clearType(this.getType());
                console.log(`Cleared ${cleared} ${this.getType()} markers from registry`);
            }
            
            // Clean up UI
            if (this.ui?.cleanup) {
                this.ui.cleanup();
            }
            
            // Clean up menu handler
            if (this.menuHandler?.cleanup) {
                this.menuHandler.cleanup();
            }
            
            // Clear state
            this.markers.clear();
            this.extractedItems.clear();
            this.lastMarkerCreated = null;
            this.activeMenuId = null;
            
            // Clear timeouts
            clearTimeout(this.menuHideTimeout);
        }
        
        // ================================
        // Utility Methods
        // ================================
        
        generateMarkerId() {
            return `${this.getType()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        isExtensionElement(element) {
            const selectors = [
                '.orkg-extension',
                '.orkg-analyzer',
                '#orkg-panel',
                '[data-orkg-extension]',
                '.orkg-marker',
                '.orkg-marker-container',
                '[data-orkg-element]'
            ];
            
            return selectors.some(selector => element.closest(selector) !== null);
        }
        
        getStatus() {
            return {
                type: this.getType(),
                isInitialized: this.isInitialized,
                isActive: this.isActive,
                markerCount: this.getMarkerCount(),
                extractedCount: this.extractedItems.size,
                hasActiveMenu: !!this.activeMenuId
            };
        }
        
        // ================================
        // Hook Methods (override in subclass)
        // ================================
        
        async onInit() {
            // Override for type-specific initialization
        }
        
        async onActivate(config) {
            // Override for type-specific activation
            return { success: true, count: 0 };
        }
        
        onDeactivate() {
            // Override for type-specific deactivation
        }
        
        onMarkerRemoved(markerId, markerData) {
            // Override for type-specific cleanup when marker is removed
        }
    }
    
    // Export to global scope
    global.BaseMarker = BaseMarker;
    
    console.log('📢 BaseMarker class exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/base/BaseMarker.js] Error:', error);
    }
  })();

  // ===== Module: markers/core/MarkerFactory.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/core/MarkerFactory.js

(function(global) {
    'use strict';
    
    /**
     * Factory for creating marker instances
     * Implements factory pattern for marker creation
     */
    class MarkerFactory {
        constructor() {
            this.markerTypes = new Map();
            this.instances = new Map();
            this.config = global.MarkerConfig || null;
        }
        
        /**
         * Register a marker type
         */
        registerType(type, MarkerClass) {
            if (!type || !MarkerClass) {
                throw new Error('Type and MarkerClass are required');
            }
            
            this.markerTypes.set(type, MarkerClass);
            console.log(`📝 Registered marker type: ${type}`);
        }
        
        /**
         * Create or get a marker instance
         */
        async createMarker(type, options = {}) {
            // Check if type is registered
            if (!this.markerTypes.has(type)) {
                throw new Error(`Unknown marker type: ${type}`);
            }
            
            // Return existing instance if singleton
            if (options.singleton !== false && this.instances.has(type)) {
                return this.instances.get(type);
            }
            
            // Create new instance
            const MarkerClass = this.markerTypes.get(type);
            const config = this.config ? this.config.getTypeConfig(type) : {};
            const marker = new MarkerClass({ ...config, ...options });
            
            // Initialize if needed
            if (typeof marker.init === 'function') {
                await marker.init();
            }
            
            // Store singleton instance
            if (options.singleton !== false) {
                this.instances.set(type, marker);
            }
            
            console.log(`✅ Created ${type} marker instance`);
            return marker;
        }
        
        /**
         * Get existing marker instance
         */
        getMarker(type) {
            return this.instances.get(type);
        }
        
        /**
         * Check if marker type exists
         */
        hasType(type) {
            return this.markerTypes.has(type);
        }
        
        /**
         * Get all registered types
         */
        getTypes() {
            return Array.from(this.markerTypes.keys());
        }
        
        /**
         * Destroy marker instance
         */
        async destroyMarker(type) {
            const marker = this.instances.get(type);
            if (marker) {
                if (typeof marker.cleanup === 'function') {
                    await marker.cleanup();
                }
                this.instances.delete(type);
                console.log(`🗑️ Destroyed ${type} marker instance`);
            }
        }
        
        /**
         * Destroy all marker instances
         */
        async destroyAll() {
            for (const [type, marker] of this.instances) {
                if (typeof marker.cleanup === 'function') {
                    await marker.cleanup();
                }
            }
            this.instances.clear();
            console.log('🗑️ All marker instances destroyed');
        }
    }
    
    // Create singleton instance
    global.MarkerFactory = new MarkerFactory();
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/core/MarkerFactory.js] Error:', error);
    }
  })();

  // ===== Module: markers/MarkerPositioner.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/markers/MarkerPositioner.js
// Smart positioning system for all marker types
// ================================

(function(global) {
    'use strict';
    
    class MarkerPositioner {
        constructor() {
            this.MARKER_SIZE = 44;
            this.OFFSET = 10;
            this.MIN_VIEWPORT_MARGIN = 20;
            this.occupiedPositions = new Map();
        }
        
        /**
         * Find the best position for a marker
         */
        position(marker, element, type, options = {}) {
            // Clear any existing position
            this.clearPosition(marker);
            
            // Get the anchor element (visible element or caption)
            const anchor = this.findVisibleAnchor(element, type);
            if (!anchor) {
                console.warn('No visible anchor found for marker');
                return false;
            }
            
            // Calculate position based on type
            const position = this.calculatePosition(anchor, type, options);
            
            // Apply position to marker
            this.applyPosition(marker, position, anchor);
            
            // Track occupied position
            this.trackPosition(marker, position);
            
            return true;
        }
        
        /**
         * Find a visible anchor element for the marker
         */
        findVisibleAnchor(element, type) {
            // First check if element itself is visible
            if (this.isElementVisible(element)) {
                return element;
            }
            
            // For images/tables, look for caption
            if (type === 'image' || type === 'table') {
                // Check for figure/figcaption
                const figure = element.closest('figure');
                if (figure) {
                    const figcaption = figure.querySelector('figcaption');
                    if (figcaption && this.isElementVisible(figcaption)) {
                        return figcaption;
                    }
                }
                
                // Check for table caption
                if (type === 'table') {
                    const caption = element.querySelector('caption') || 
                                  element.previousElementSibling?.tagName === 'CAPTION' ? 
                                  element.previousElementSibling : null;
                    if (caption && this.isElementVisible(caption)) {
                        return caption;
                    }
                }
                
                // Look for nearby heading or label
                const label = this.findNearbyLabel(element);
                if (label) {
                    return label;
                }
            }
            
            // For text, find the parent container
            if (type === 'text') {
                let parent = element.parentElement;
                while (parent && !this.isElementVisible(parent)) {
                    parent = parent.parentElement;
                }
                return parent || element;
            }
            
            return element;
        }
        
        /**
         * Check if element is visible
         */
        isElementVisible(element) {
            if (!element) return false;
            
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            
            return rect.width > 0 && 
                   rect.height > 0 && 
                   style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   parseFloat(style.opacity) > 0;
        }
        
        /**
         * Find nearby label or heading
         */
        findNearbyLabel(element) {
            // Check previous siblings for headings
            let sibling = element.previousElementSibling;
            let attempts = 0;
            
            while (sibling && attempts < 5) {
                if (sibling.matches('h1, h2, h3, h4, h5, h6, [class*="caption"], [class*="label"], [class*="title"]')) {
                    if (this.isElementVisible(sibling)) {
                        return sibling;
                    }
                }
                sibling = sibling.previousElementSibling;
                attempts++;
            }
            
            return null;
        }
        
        /**
         * Calculate optimal position for marker
         */
        calculatePosition(anchor, type, options) {
            const rect = anchor.getBoundingClientRect();
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            
            let position = {
                top: null,
                right: null,
                bottom: null,
                left: null,
                position: 'absolute'
            };
            
            switch (type) {
                case 'image':
                case 'table':
                    // Default to top-right
                    position.top = rect.top + scrollY + this.OFFSET;
                    position.right = document.documentElement.clientWidth - (rect.right + scrollX) + this.OFFSET;
                    
                    // Check if it fits in viewport
                    if (rect.right + this.MARKER_SIZE + this.OFFSET > window.innerWidth - this.MIN_VIEWPORT_MARGIN) {
                        // Move to top-left if doesn't fit on right
                        position.left = rect.left + scrollX + this.OFFSET;
                        position.right = null;
                    }
                    break;
                    
                case 'text':
                    // Float to the right margin
                    position.top = rect.top + scrollY;
                    position.left = rect.right + scrollX + this.OFFSET;
                    
                    // If text spans full width, position at right edge
                    if (rect.width > window.innerWidth * 0.8) {
                        position.position = 'fixed';
                        position.top = rect.top;
                        position.left = null;
                        position.right = this.MIN_VIEWPORT_MARGIN;
                    }
                    
                    // Avoid overlapping with existing markers
                    position = this.avoidOverlap(position, type);
                    break;
            }
            
            return position;
        }
        
        /**
         * Avoid overlapping with other markers
         */
        avoidOverlap(position, type) {
            const threshold = this.MARKER_SIZE + 10;
            let adjusted = {...position};
            let attempts = 0;
            
            while (this.hasOverlap(adjusted, threshold) && attempts < 5) {
                if (type === 'text') {
                    // Move down for text markers
                    adjusted.top = (adjusted.top || 0) + threshold;
                } else {
                    // Move left for other types
                    adjusted.right = (adjusted.right || 0) + threshold;
                }
                attempts++;
            }
            
            return adjusted;
        }
        
        /**
         * Check if position overlaps with existing markers
         */
        hasOverlap(position, threshold) {
            for (const [marker, pos] of this.occupiedPositions) {
                const distance = Math.sqrt(
                    Math.pow((position.top || 0) - (pos.top || 0), 2) +
                    Math.pow((position.left || 0) - (pos.left || 0), 2)
                );
                
                if (distance < threshold) {
                    return true;
                }
            }
            return false;
        }
        
        /**
         * Apply calculated position to marker
         */
        applyPosition(marker, position, anchor) {
            // Ensure marker container is properly positioned
            const container = marker.parentElement;
            if (container && container.classList.contains('orkg-marker-container')) {
                const anchorStyle = window.getComputedStyle(anchor);
                
                // Set container position relative to anchor
                if (anchorStyle.position === 'static') {
                    container.style.position = 'relative';
                }
            }
            
            // Apply position to marker
            marker.style.position = position.position || 'absolute';
            
            if (position.top !== null) {
                marker.style.top = `${position.top}px`;
                marker.style.bottom = 'auto';
            }
            if (position.right !== null) {
                marker.style.right = `${position.right}px`;
                marker.style.left = 'auto';
            }
            if (position.bottom !== null) {
                marker.style.bottom = `${position.bottom}px`;
                marker.style.top = 'auto';
            }
            if (position.left !== null) {
                marker.style.left = `${position.left}px`;
                marker.style.right = 'auto';
            }
        }
        
        /**
         * Track occupied position
         */
        trackPosition(marker, position) {
            this.occupiedPositions.set(marker, position);
        }
        
        /**
         * Clear position tracking
         */
        clearPosition(marker) {
            this.occupiedPositions.delete(marker);
        }
        
        /**
         * Clear all tracked positions
         */
        clearAll() {
            this.occupiedPositions.clear();
        }
    }
    
    // Create singleton instance
    const markerPositioner = new MarkerPositioner();
    
    // Export to global scope
    global.MarkerPositioner = MarkerPositioner;
    global.markerPositioner = markerPositioner;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/MarkerPositioner.js] Error:', error);
    }
  })();

  // ===== Module: markers/MarkerTooltip.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/markers/MarkerTooltip.js
// Enhanced tooltip system with proper z-index and positioning
// ================================

(function(global) {
    'use strict';
    
    class MarkerTooltip {
        constructor() {
            this.activeTooltips = new Map();
            this.tooltipContainer = null;
            this.TOOLTIP_OFFSET = 12;
            this.VIEWPORT_MARGIN = 10;
        }
        
        /**
         * Initialize tooltip system
         */
        init() {
            if (!this.tooltipContainer) {
                this.createTooltipContainer();
            }
        }
        
        /**
         * Create container for all tooltips
         */
        createTooltipContainer() {
            this.tooltipContainer = document.createElement('div');
            this.tooltipContainer.id = 'orkg-tooltip-container';
            this.tooltipContainer.className = 'orkg-tooltip-container';
            document.body.appendChild(this.tooltipContainer);
        }
        
        /**
         * Create and show tooltip
         */
        show(marker, content, options = {}) {
            this.init();
            
            // Remove any existing tooltip for this marker
            this.hide(marker);
            
            // Create tooltip element
            const tooltip = this.createTooltipElement(content, options);
            
            // Add to container
            this.tooltipContainer.appendChild(tooltip);
            
            // Position tooltip
            this.positionTooltip(tooltip, marker, options);
            
            // Store reference
            this.activeTooltips.set(marker, tooltip);
            
            // Show with animation
            requestAnimationFrame(() => {
                tooltip.classList.add('orkg-tooltip-visible');
            });
            
            return tooltip;
        }
        
        /**
         * Hide tooltip for marker
         */
        hide(marker) {
            const tooltip = this.activeTooltips.get(marker);
            if (tooltip) {
                tooltip.classList.remove('orkg-tooltip-visible');
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 200);
                this.activeTooltips.delete(marker);
            }
        }
        
        /**
         * Create tooltip element
         */
        createTooltipElement(content, options) {
            const tooltip = document.createElement('div');
            tooltip.className = 'orkg-tooltip-enhanced';
            
            // Add content
            if (typeof content === 'string') {
                tooltip.innerHTML = content;
            } else {
                tooltip.appendChild(content);
            }
            
            // Add arrow
            const arrow = document.createElement('div');
            arrow.className = 'orkg-tooltip-arrow';
            tooltip.appendChild(arrow);
            
            return tooltip;
        }
        
        /**
         * Position tooltip relative to marker
         */
        positionTooltip(tooltip, marker, options) {
            const markerRect = marker.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // Calculate initial position (above marker)
            let top = markerRect.top - tooltipRect.height - this.TOOLTIP_OFFSET;
            let left = markerRect.left + (markerRect.width / 2) - (tooltipRect.width / 2);
            
            // Check if tooltip fits above
            if (top < this.VIEWPORT_MARGIN) {
                // Position below instead
                top = markerRect.bottom + this.TOOLTIP_OFFSET;
                tooltip.classList.add('orkg-tooltip-below');
            }
            
            // Check horizontal boundaries
            if (left < this.VIEWPORT_MARGIN) {
                left = this.VIEWPORT_MARGIN;
                tooltip.classList.add('orkg-tooltip-left-aligned');
            } else if (left + tooltipRect.width > window.innerWidth - this.VIEWPORT_MARGIN) {
                left = window.innerWidth - tooltipRect.width - this.VIEWPORT_MARGIN;
                tooltip.classList.add('orkg-tooltip-right-aligned');
            }
            
            // Apply position
            tooltip.style.top = `${top + window.scrollY}px`;
            tooltip.style.left = `${left + window.scrollX}px`;
        }
        
        /**
         * Hide all tooltips
         */
        hideAll() {
            for (const [marker, tooltip] of this.activeTooltips) {
                this.hide(marker);
            }
        }
        
        /**
         * Cleanup tooltip system
         */
        cleanup() {
            this.hideAll();
            if (this.tooltipContainer && this.tooltipContainer.parentNode) {
                this.tooltipContainer.parentNode.removeChild(this.tooltipContainer);
            }
            this.tooltipContainer = null;
            this.activeTooltips.clear();
        }
    }
    
    // Create singleton instance
    const markerTooltip = new MarkerTooltip();
    
    // Export to global scope
    global.MarkerTooltip = MarkerTooltip;
    global.markerTooltip = markerTooltip;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/MarkerTooltip.js] Error:', error);
    }
  })();

  // ===== Module: markers/TextMarker.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/TextMarker.js

(function(global) {
    'use strict';
    
    class TextMarker extends BaseMarker {
        constructor(config = {}) {
            super(config);
            this.highlighter = null;
            this.markersByHighlightId = new Map(); // Track markers by highlight ID
            this.highlightToMarker = new Map(); // Map highlight IDs to marker IDs
        }
        
        getType() {
            return 'text';
        }
        
        getTypeIcon() {
            return `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm5 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6zm0 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6z"/>
            </svg>`;
        }
        
        async onInit() {
            // Initialize TextHighlighter
            this.highlighter = global.TextHighlighter;
            if (this.highlighter && typeof this.highlighter.init === 'function') {
                this.highlighter.init(this);
            }
            
            console.log('✅ TextMarker initialized with TextHighlighter');
        }
        
        async onActivate(config) {
            // Enable text highlighting
            if (this.highlighter && typeof this.highlighter.setMarkersActive === 'function') {
                this.highlighter.setMarkersActive(true);
            }
            
            // Get existing highlights and create markers for them
            const existingHighlights = this.highlighter?.getAllHighlights?.() || [];
            let createdCount = 0;
            
            for (const highlight of existingHighlights) {
                // Check if marker already exists for this highlight
                if (!this.highlightToMarker.has(highlight.id)) {
                    const markerData = this.createMarkerForHighlight(highlight);
                    if (markerData) {
                        createdCount++;
                    }
                }
            }
            
            const totalCount = this.highlighter?.getHighlightCount?.() || 0;
            
            return { 
                success: true, 
                count: totalCount,
                message: 'Text selection enabled. Select text to add markers.'
            };
        }
        
        onDeactivate() {
            // Disable text highlighting
            if (this.highlighter && typeof this.highlighter.setMarkersActive === 'function') {
                this.highlighter.setMarkersActive(false);
            }
            
            // Clear tracking maps
            this.markersByHighlightId.clear();
            this.highlightToMarker.clear();
        }
        
        createMarker(element, metadata = {}) {
            if (!element || !element.nodeType) {
                console.error('Invalid element provided to TextMarker');
                return null;
            }
            
            // Get highlight ID from metadata or element
            const highlightId = metadata.highlightId || 
                               element.dataset?.highlightId || 
                               metadata.id;
            
            // Check if marker already exists for this highlight
            if (highlightId && this.markersByHighlightId.has(highlightId)) {
                console.log('Marker already exists for highlight:', highlightId);
                return this.markersByHighlightId.get(highlightId);
            }
            
            // Check if element already has a marker as a child
            const existingMarker = element.querySelector('.orkg-marker');
            if (existingMarker) {
                console.log('Element already has a marker');
                const existingMarkerId = existingMarker.dataset.markerId;
                if (existingMarkerId) {
                    return this.markers.get(existingMarkerId) || this.registry?.get(existingMarkerId);
                }
            }
            
            // Ensure metadata has highlightId
            if (highlightId) {
                metadata.highlightId = highlightId;
            }
            
            // Create marker using base class
            const markerData = super.createMarker(element, metadata);
            
            if (markerData && highlightId) {
                // Track marker by highlight ID
                this.markersByHighlightId.set(highlightId, markerData);
                this.highlightToMarker.set(highlightId, markerData.id);
            }
            
            return markerData;
        }
        
        createMarkerForHighlight(highlight) {
            if (!highlight || !highlight.element) {
                return null;
            }
            
            // Check if marker already exists
            if (this.highlightToMarker.has(highlight.id)) {
                return this.markersByHighlightId.get(highlight.id);
            }
            
            const metadata = {
                highlightId: highlight.id,
                text: highlight.text,
                property: highlight.property,
                color: highlight.color,
                confidence: highlight.confidence,
                source: highlight.source || 'manual'
            };
            
            return this.createMarker(highlight.element, metadata);
        }
        
        removeMarker(markerId) {
            const markerData = this.markers.get(markerId) || this.registry?.get(markerId);
            
            if (markerData) {
                const highlightId = markerData.metadata?.highlightId;
                
                // Remove the highlight from TextHighlighter
                if (highlightId && this.highlighter && typeof this.highlighter.removeHighlight === 'function') {
                    console.log('Removing highlight:', highlightId);
                    const removed = this.highlighter.removeHighlight(highlightId);
                    if (removed) {
                        console.log('✅ Highlight removed successfully');
                    } else {
                        console.warn('Failed to remove highlight:', highlightId);
                    }
                }
                
                // Clean up tracking maps
                if (highlightId) {
                    this.markersByHighlightId.delete(highlightId);
                    this.highlightToMarker.delete(highlightId);
                }
                
                // Also try to remove any highlighted elements
                if (markerData.element) {
                    // If the element is a highlight span, remove it properly
                    if (markerData.element.classList.contains('orkg-highlighted')) {
                        const parent = markerData.element.parentNode;
                        if (parent) {
                            // Move text content back to parent
                            while (markerData.element.firstChild) {
                                parent.insertBefore(markerData.element.firstChild, markerData.element);
                            }
                            markerData.element.remove();
                        }
                    }
                }
            }
            
            // Call parent removeMarker
            return super.removeMarker(markerId);
        }
        
        onMarkerRemoved(markerId, markerData) {
            // Additional cleanup when marker is removed
            const highlightId = markerData.metadata?.highlightId;
            if (highlightId) {
                this.markersByHighlightId.delete(highlightId);
                this.highlightToMarker.delete(highlightId);
            }
        }
        
        syncWithHighlighter() {
            // Sync markers with TextHighlighter highlights
            if (!this.highlighter) return;
            
            const highlights = this.highlighter.getAllHighlights?.() || [];
            
            // Create markers for new highlights
            for (const highlight of highlights) {
                if (!this.highlightToMarker.has(highlight.id)) {
                    this.createMarkerForHighlight(highlight);
                }
            }
            
            // Remove markers for deleted highlights
            const highlightIds = new Set(highlights.map(h => h.id));
            for (const [highlightId, markerId] of this.highlightToMarker) {
                if (!highlightIds.has(highlightId)) {
                    this.removeMarker(markerId);
                }
            }
        }
        
        cleanup() {
            // Clear tracking maps
            this.markersByHighlightId.clear();
            this.highlightToMarker.clear();
            
            // Call parent cleanup
            super.cleanup();
        }
        
        getStatus() {
            const baseStatus = super.getStatus();
            return {
                ...baseStatus,
                highlightCount: this.highlighter?.getHighlightCount?.() || 0,
                trackedHighlights: this.markersByHighlightId.size
            };
        }
    }
    
    // Export to global scope
    global.TextMarker = TextMarker;
    
    console.log('📢 TextMarker class exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/TextMarker.js] Error:', error);
    }
  })();

  // ===== Module: markers/ImageMarker.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/ImageMarker.js - Refactored
(function(global) {
    'use strict';
    
    if (typeof BaseMarker === 'undefined') {
        console.error('ImageMarker requires BaseMarker to be loaded first');
        return;
    }
    
    class ImageMarker extends BaseMarker {
        constructor(config = {}) {
            super(config);
            this.processedImages = new Set();
        }
        
        getType() {
            return 'image';
        }
        
        async onActivate(config) {
            const activationConfig = {
                minWidth: config.minWidth || this.config.minImageWidth || 100,
                minHeight: config.minHeight || this.config.minImageHeight || 100,
                includeBackground: config.includeBackground !== false,
                includeSVG: config.includeSVG !== false,
                includeCanvas: config.includeCanvas !== false,
                autoMark: config.autoMark !== false
            };
            
            let markedCount = 0;
            
            if (activationConfig.autoMark) {
                markedCount += this.markImages(activationConfig);
                
                if (activationConfig.includeSVG) {
                    markedCount += this.markSVGElements(activationConfig);
                }
                
                if (activationConfig.includeCanvas) {
                    markedCount += this.markCanvasElements(activationConfig);
                }
            }
            
            return { success: true, count: markedCount };
        }
        
        onDeactivate() {
            this.processedImages.clear();
        }
        
        markImages(config) {
            const images = document.querySelectorAll('img');
            let count = 0;
            
            images.forEach((img, index) => {
                if (this.shouldSkipImage(img, config)) return;
                
                const metadata = this.extractImageMetadata(img, index);
                const marker = this.createMarker(img, metadata);
                
                if (marker) {
                    this.processedImages.add(img);
                    count++;
                }
            });
            
            return count;
        }
        
        markSVGElements(config) {
            const svgs = document.querySelectorAll('svg');
            let count = 0;
            
            svgs.forEach((svg, index) => {
                if (this.shouldSkipSVG(svg, config)) return;
                
                const metadata = {
                    id: `svg_${Date.now()}_${index}`,
                    type: 'diagram',
                    elementType: 'svg',
                    dimensions: this.getElementDimensions(svg)
                };
                
                const marker = this.createMarker(svg, metadata);
                if (marker) {
                    this.processedImages.add(svg);
                    count++;
                }
            });
            
            return count;
        }
        
        markCanvasElements(config) {
            const canvases = document.querySelectorAll('canvas');
            let count = 0;
            
            canvases.forEach((canvas, index) => {
                if (this.shouldSkipCanvas(canvas, config)) return;
                
                const metadata = {
                    id: `canvas_${Date.now()}_${index}`,
                    type: 'chart',
                    elementType: 'canvas',
                    dimensions: {
                        width: canvas.width,
                        height: canvas.height
                    }
                };
                
                const marker = this.createMarker(canvas, metadata);
                if (marker) {
                    this.processedImages.add(canvas);
                    count++;
                }
            });
            
            return count;
        }
        
        shouldSkipImage(img, config) {
            // Skip if already processed
            if (this.processedImages.has(img)) return true;
            
            // Skip extension elements
            if (this.isExtensionElement(img)) return true;
            
            // Check visibility
            if (!this.isVisible(img)) return true;
            
            // Check dimensions
            const rect = img.getBoundingClientRect();
            if (rect.width < config.minWidth || rect.height < config.minHeight) return true;
            
            // Check if likely icon
            if (this.isLikelyIcon(img)) return true;
            
            return false;
        }
        
        shouldSkipSVG(svg, config) {
            if (this.processedImages.has(svg) || this.isExtensionElement(svg)) return true;
            
            const rect = svg.getBoundingClientRect();
            return rect.width < config.minWidth || rect.height < config.minHeight;
        }
        
        shouldSkipCanvas(canvas, config) {
            if (this.processedImages.has(canvas) || this.isExtensionElement(canvas)) return true;
            
            return canvas.width < config.minWidth || canvas.height < config.minHeight;
        }
        
        extractImageMetadata(img, index) {
            const metadata = {
                id: `img_${Date.now()}_${index}`,
                src: img.src || img.currentSrc || img.getAttribute('data-src'),
                alt: img.alt,
                title: img.title,
                index: index + 1,
                dimensions: {
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height
                }
            };
            
            // Find caption if in figure
            const figure = img.closest('figure');
            if (figure) {
                const figcaption = figure.querySelector('figcaption');
                if (figcaption) {
                    metadata.caption = figcaption.textContent.trim();
                }
                metadata.inFigure = true;
            }
            
            return metadata;
        }
        
        isVisible(element) {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   parseFloat(style.opacity) > 0 &&
                   rect.width > 0 && 
                   rect.height > 0;
        }
        
        isLikelyIcon(img) {
            const src = img.src || '';
            const className = img.className || '';
            const id = img.id || '';
            
            const iconPatterns = [
                /icon/i, /logo/i, /avatar/i, /emoji/i,
                /button/i, /\.svg$/i, /data:image\/svg/i
            ];
            
            return iconPatterns.some(pattern => 
                pattern.test(src) || pattern.test(className) || pattern.test(id)
            );
        }
        
        getElementDimensions(element) {
            const rect = element.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height
            };
        }
        
        prepareDataForExtension(metadata) {
            return {
                id: metadata.id,
                type: 'image',
                src: metadata.src,
                alt: metadata.alt,
                title: metadata.title,
                caption: metadata.caption,
                dimensions: metadata.dimensions,
                inFigure: metadata.inFigure
            };
        }

        isExtensionElement(element) {
            const extensionSelectors = [
                '.orkg-extension',
                '.orkg-analyzer', 
                '#orkg-panel',
                '[data-orkg-extension]',
                '.orkg-marker',
                '.orkg-marker-container'
            ];
            
            return extensionSelectors.some(selector => 
                element.closest(selector) !== null
            );
        }
        
        // RAG-specific method
        createMarkersForRAGImages(images) {
            let createdCount = 0;
            
            images.forEach((imageData) => {
                const element = this.findImageElement(imageData);
                
                if (element && !this.processedImages.has(element)) {
                    const metadata = {
                        id: imageData.id || this.generateMarkerId(),
                        ...imageData,
                        fromRAG: true
                    };
                    
                    const marker = this.createMarker(element, metadata);
                    if (marker) {
                        this.processedImages.add(element);
                        createdCount++;
                    }
                }
            });
            
            return createdCount;
        }
        
        findImageElement(imageData) {
            if (imageData.selector) {
                return document.querySelector(imageData.selector);
            }
            
            if (imageData.src) {
                return document.querySelector(`img[src="${imageData.src}"]`) ||
                       document.querySelector(`img[src*="${imageData.src}"]`);
            }
            
            if (imageData.index !== undefined) {
                const images = document.querySelectorAll('img');
                return images[imageData.index];
            }
            
            return null;
        }
    }
    
    // Export to global scope
    global.ImageMarker = ImageMarker;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/ImageMarker.js] Error:', error);
    }
  })();

  // ===== Module: markers/TableMarker.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/markers/TableMarker.js - Refactored
(function(global) {
    'use strict';
    
    if (typeof BaseMarker === 'undefined') {
        console.error('TableMarker requires BaseMarker to be loaded first');
        return;
    }
    
    class TableMarker extends BaseMarker {
        constructor(config = {}) {
            super(config);
            this.processedTables = new Set();
        }
        
        getType() {
            return 'table';
        }
        
        async onActivate(config) {
            const activationConfig = {
                minRows: config.minRows || this.config.minTableRows || 2,
                minColumns: config.minColumns || this.config.minTableColumns || 2,
                autoMark: config.autoMark !== false
            };
            
            let markedCount = 0;
            
            if (activationConfig.autoMark) {
                markedCount = this.markTables(activationConfig);
            }
            
            return { success: true, count: markedCount };
        }
        
        onDeactivate() {
            this.processedTables.clear();
        }
        
        markTables(config) {
            const tables = document.querySelectorAll('table');
            let count = 0;
            
            tables.forEach((table, index) => {
                if (this.shouldSkipTable(table, config)) return;
                
                const metadata = this.extractTableMetadata(table, index);
                const marker = this.createMarker(table, metadata);
                
                if (marker) {
                    this.processedTables.add(table);
                    count++;
                }
            });
            
            return count;
        }
        
        shouldSkipTable(table, config) {
            // Skip if already processed
            if (this.processedTables.has(table)) return true;
            
            // Skip extension elements
            if (this.isExtensionElement(table)) return true;
            
            // Check visibility
            if (!this.isVisible(table)) return true;
            
            // Check table size
            const rows = table.querySelectorAll('tr').length;
            const columns = this.getColumnCount(table);
            
            if (rows < config.minRows || columns < config.minColumns) return true;
            
            return false;
        }
        
        extractTableMetadata(table, index) {
            const metadata = {
                id: `table_${Date.now()}_${index}`,
                index: index + 1,
                rows: table.querySelectorAll('tr').length,
                columns: this.getColumnCount(table),
                headers: this.extractHeaders(table),
                caption: this.extractCaption(table),
                summary: this.generateSummary(table)
            };
            
            return metadata;
        }
        
        getColumnCount(table) {
            const firstRow = table.querySelector('tr');
            if (!firstRow) return 0;
            
            let count = 0;
            firstRow.querySelectorAll('td, th').forEach(cell => {
                count += parseInt(cell.getAttribute('colspan') || 1);
            });
            
            return count;
        }
        
        extractHeaders(table) {
            const headers = [];
            const headerCells = table.querySelectorAll('thead th, tr:first-child th');
            
            headerCells.forEach(cell => {
                headers.push(cell.textContent.trim());
            });
            
            // If no thead headers, check first row
            if (headers.length === 0) {
                const firstRowCells = table.querySelectorAll('tr:first-child td');
                firstRowCells.forEach(cell => {
                    headers.push(cell.textContent.trim());
                });
            }
            
            return headers;
        }
        
        extractCaption(table) {
            const caption = table.querySelector('caption');
            if (caption) {
                return caption.textContent.trim();
            }
            
            // Check for caption in surrounding elements
            const prevElement = table.previousElementSibling;
            if (prevElement && (prevElement.tagName === 'H3' || prevElement.tagName === 'H4' || 
                              prevElement.tagName === 'P' || prevElement.tagName === 'FIGCAPTION')) {
                const text = prevElement.textContent.trim();
                if (text.toLowerCase().includes('table') || text.length < 100) {
                    return text;
                }
            }
            
            return null;
        }
        
        generateSummary(table) {
            const rows = table.querySelectorAll('tr').length;
            const columns = this.getColumnCount(table);
            const hasHeaders = table.querySelector('thead') !== null || 
                              table.querySelector('th') !== null;
            
            return {
                rows: rows,
                columns: columns,
                hasHeaders: hasHeaders,
                type: this.detectTableType(table)
            };
        }
        
        detectTableType(table) {
            const text = table.textContent.toLowerCase();
            
            if (text.includes('result') || text.includes('performance')) {
                return 'results';
            }
            if (text.includes('comparison') || text.includes('versus')) {
                return 'comparison';
            }
            if (text.includes('data') || text.includes('dataset')) {
                return 'data';
            }
            if (text.includes('statistic') || text.includes('analysis')) {
                return 'statistics';
            }
            
            return 'general';
        }
        
        isVisible(element) {
            const style = window.getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden';
        }
        
        prepareDataForExtension(metadata) {
            return {
                id: metadata.id,
                type: 'table',
                rows: metadata.rows,
                columns: metadata.columns,
                headers: metadata.headers,
                caption: metadata.caption,
                summary: metadata.summary
            };
        }
        
        // RAG-specific method
        createMarkersForRAGTables(tables) {
            let createdCount = 0;
            
            tables.forEach((tableData) => {
                const element = this.findTableElement(tableData);
                
                if (element && !this.processedTables.has(element)) {
                    const metadata = {
                        id: tableData.id || this.generateMarkerId(),
                        ...tableData,
                        fromRAG: true
                    };
                    
                    const marker = this.createMarker(element, metadata);
                    if (marker) {
                        this.processedTables.add(element);
                        createdCount++;
                    }
                }
            });
            
            return createdCount;
        }
        
        findTableElement(tableData) {
            if (tableData.selector) {
                return document.querySelector(tableData.selector);
            }
            
            if (tableData.index !== undefined) {
                const tables = document.querySelectorAll('table');
                return tables[tableData.index];
            }
            
            return null;
        }
    }
    
    // Export to global scope
    global.TableMarker = TableMarker;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[markers/TableMarker.js] Error:', error);
    }
  })();

  // ===== Module: highlighting/TextHighlighter.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/TextHighlighter.js - Complete Module with RAGHandler Integration
// ================================

(function(global) {
    'use strict';
    
    const TextHighlighter = (function() {
        // Private state
        let markersActive = false;
        let highlights = new Map();
        let selectedColor = null;
        let isHighlightMode = false;
        let currentProperty = null;
        let textMarker = null;
        let pendingHighlight = null;
        let lastSelectedRange = null;
        let ragHighlights = new Map();
        let isInitialized = false;
        
        // Dependencies
        let textSearchUtility = null;
        
        // Configuration
        const CONFIG = {
            MIN_SELECTION_LENGTH: 2,
            MAX_SELECTION_LENGTH: 500,
            DEFAULT_COLORS: [
                '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
                '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3',
                '#87CEEB', '#FFA07A', '#FFEFD5', '#F0FFF0'
            ],
            TOOLTIP_DELAY: 300,
            CONFIDENCE_THRESHOLDS: {
                HIGH: 0.8,
                MEDIUM: 0.5
            }
        };
        
        // ================================
        // Initialization
        // ================================
        
        function init(markerInstance) {
            if (isInitialized) {
                console.log('TextHighlighter already initialized');
                return true;
            }
            
            // Setup dependencies
            setupDependencies();
            
            // Setup text marker - try multiple ways
            if (markerInstance) {
                textMarker = markerInstance;
                console.log('✅ TextHighlighter initialized with provided TextMarker');
            } else if (typeof TextMarker !== 'undefined') {
                textMarker = new TextMarker();
                console.log('✅ TextHighlighter created new TextMarker instance');
            } else if (window.serviceRegistry && window.serviceRegistry.get('textMarker')) {
                textMarker = window.serviceRegistry.get('textMarker');
                console.log('✅ TextHighlighter got TextMarker from registry');
            } else {
                console.warn('⚠️ TextHighlighter initialized without TextMarker support');
            }
            
            setupSelectionHandler();
            isInitialized = true;
            console.log('✅ TextHighlighter initialized');
            return true;
        }
        
        function setupDependencies() {
            // Get TextSearchUtility if available
            textSearchUtility = global.textSearchUtility || 
                               (typeof TextSearchUtility !== 'undefined' ? new TextSearchUtility() : null) ||
                               global.serviceRegistry?.get('textSearchUtility');
            
            if (textSearchUtility) {
                console.log('✅ TextHighlighter: Using TextSearchUtility for advanced search');
            }
        }
        
        // ================================
        // Selection Handling
        // ================================
        
        function setupSelectionHandler() {
            document.addEventListener('mouseup', handleTextSelection);
            document.addEventListener('keyup', handleTextSelection);
            
            document.addEventListener('selectionchange', () => {
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed && selection.toString().trim().length > CONFIG.MIN_SELECTION_LENGTH) {
                    try {
                        lastSelectedRange = selection.getRangeAt(0).cloneRange();
                    } catch (e) {
                        console.warn('Could not store selection range:', e);
                    }
                }
            });
        }
        
        function handleTextSelection(e) {
            if (shouldSkipSelection(e.target)) return;
            
            // Only show property window if markers are active
            if (!markersActive) {
                console.log('Text selection ignored - markers not active');
                return;
            }
            
            // Store selection immediately, don't wait for setTimeout
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (isValidSelection(selectedText)) {
                try {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    
                    if (rect.width > 0 && rect.height > 0) {
                        // Store the range IMMEDIATELY
                        storePendingHighlight(range.cloneRange(), selectedText, selection);
                        
                        // Then show property window (which might clear the selection)
                        setTimeout(() => {
                            showPropertyWindow(selectedText, {
                                x: rect.right + window.scrollX,
                                y: rect.top + window.scrollY
                            });
                        }, 10);
                    }
                } catch (error) {
                    console.warn('Error handling text selection:', error);
                }
            }
        }
        
        function shouldSkipSelection(target) {
            return target.closest('.orkg-marker') || 
                   target.closest('.orkg-property-selection-window') ||
                   target.closest('.orkg-highlighted') ||
                   target.closest('.orkg-rag-highlight');
        }
        
        function isValidSelection(text) {
            return text.length > CONFIG.MIN_SELECTION_LENGTH && 
                   text.length < CONFIG.MAX_SELECTION_LENGTH;
        }
        
        function storePendingHighlight(range, text, selection) {
            const clonedRange = range.cloneRange();
            pendingHighlight = {
                range: clonedRange,
                text: text,
                selection: selection
            };
            lastSelectedRange = clonedRange;
            console.log('📌 Text selected, storing range:', text.substring(0, 50) + '...');
        }
        
        // ================================
        // Manual Highlighting
        // ================================
        
        function highlight(property, color, editMode = false, existingHighlightId = null) {
            console.log("📌 highlight called. pendingHighlight:", pendingHighlight, "lastSelectedRange:", lastSelectedRange);

            // Use saved range from PropertyWindow if available
            const range = window.propertyWindow?.savedRange || pendingHighlight?.range || lastSelectedRange;
            const text = pendingHighlight?.text || range?.toString();
            
            console.log("📌 Using range:", range, "text:", text);

            if (!range || !text) {
                console.warn('⚠️ Invalid range or text for highlighting');
                return null;
            }
            
            try {
                const highlightId = existingHighlightId || generateHighlightId();
                const finalColor = color || getRandomColor();
                
                let span;
                if (editMode && existingHighlightId) {
                    span = document.querySelector(`[data-highlight-id="${existingHighlightId}"]`);
                    if (span) {
                        updateHighlightElement(span, property, finalColor);
                    }
                } else {
                    span = createHighlightElement(range, highlightId, property, finalColor);
                }
                
                if (!span) {
                    console.error('Failed to create highlight element');
                    return null;
                }
                
                const highlightData = {
                    id: highlightId,
                    element: span,
                    text: text,
                    property: property,
                    color: finalColor,
                    timestamp: Date.now(),
                    source: 'manual',
                    editable: true
                };
                
                highlights.set(highlightId, highlightData);
                
                // ENSURE TEXT MARKER IS CREATED
                if (!textMarker) {
                    console.log('⚠️ TextMarker not initialized, attempting to create one');
                    if (typeof TextMarker !== 'undefined') {
                        textMarker = new TextMarker();
                        console.log('✅ TextMarker created on demand');
                    }
                }
                
                if (textMarker && typeof textMarker.createMarker === 'function') {
                    // Use requestAnimationFrame to ensure DOM is ready
                    requestAnimationFrame(() => {
                        createTextMarkerForHighlight(span, highlightData);
                    });
                } else {
                    console.warn('⚠️ TextMarker not available for creating marker');
                }
                
                clearPendingHighlight();
                sendHighlightToExtension(highlightData);
                
                console.log('✅ Manual highlight created:', highlightData);
                return highlightData;
                
            } catch (error) {
                console.error('Failed to create highlight:', error);
                return null;
            }
        }
        
        // ================================
        // RAG Highlighting
        // ================================
        
        function highlightFromRAG(ragData) {
            console.log('🤖 RAG highlight request received');
            
            const {
                range,
                text,
                property,
                confidence,
                section,
                sentenceIndex,
                color
            } = ragData;
            
            // Validate inputs
            if (!range) {
                console.error('No range provided for RAG highlight');
                return null;
            }
            
            const highlightId = generateHighlightId('rag');
            const finalColor = color || property?.color || getPropertyColorFromRAG(property);
            
            // Create the highlight element
            const span = createRAGHighlightElement(range, highlightId, property, finalColor, confidence);
            if (!span) {
                console.error('Failed to create RAG highlight element');
                return null;
            }
            
            // Create highlight data
            const highlightData = {
                id: highlightId,
                element: span,
                text: text || span.textContent,
                property: property || { id: 'unknown', label: 'Unknown Property' },
                color: finalColor,
                confidence: confidence || 0,
                section: section,
                sentenceIndex: sentenceIndex,
                timestamp: Date.now(),
                source: 'rag'
            };
            
            // Store in both maps
            highlights.set(highlightId, highlightData);
            ragHighlights.set(highlightId, highlightData);
            
            // Create marker if available
            if (textMarker && typeof textMarker.createMarker === 'function') {
                setTimeout(() => {
                    createRAGTextMarker(span, highlightData);
                }, 100);
            }
            
            // Setup interactions
            setupRAGHighlightHoverEffect(span, property, confidence);
            
            // Notify extension
            sendRAGHighlightToExtension(highlightData);
            
            console.log('✅ RAG highlight created:', highlightData);
            return highlightData;
        }
        
        /**
         * Create highlight from a Range object
         * Used by RAGHandler for creating highlights
         */
        async function highlightRange(range, metadata = {}) {
            if (!range || !range.toString()) {
                console.warn('⚠️ Invalid range for highlighting');
                return null;
            }
            
            const text = range.toString();
            const highlightId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            try {
                // Create highlight span
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'orkg-highlighted';
                highlightSpan.id = highlightId;
                highlightSpan.dataset.highlightId = highlightId;
                highlightSpan.dataset.property = JSON.stringify(metadata.property || {});
                highlightSpan.dataset.propertyLabel = metadata.property?.label || '';
                highlightSpan.style.backgroundColor = metadata.color || '#ffeb3b';
                highlightSpan.style.color = 'inherit';
                highlightSpan.style.position = 'relative';
                
                // Wrap the range content
                try {
                    range.surroundContents(highlightSpan);
                } catch (e) {
                    // If surroundContents fails, extract and insert manually
                    const contents = range.extractContents();
                    highlightSpan.appendChild(contents);
                    range.insertNode(highlightSpan);
                }
                
                // Store in registry
                if (this.highlights) {
                    this.highlights.set(highlightId, {
                        id: highlightId,
                        element: highlightSpan,
                        text: text,
                        metadata: metadata,
                        createdAt: Date.now()
                    });
                }
                
                // Create marker if TextMarker is available
                if (global.TextMarker?.createMarkerForHighlight) {
                    global.TextMarker.createMarkerForHighlight(highlightSpan, {
                        ...metadata,
                        highlightId: highlightId,
                        text: text
                    });
                }
                
                return {
                    id: highlightId,
                    element: highlightSpan,
                    text: text
                };
                
            } catch (error) {
                console.error('Failed to create highlight:', error);
                return null;
            }
        }
        
        // ================================
        // Element Creation
        // ================================
        
        function createHighlightElement(range, highlightId, property, color) {
            const span = document.createElement('span');
            span.className = 'orkg-highlighted';
            span.dataset.highlightId = highlightId;
            span.dataset.property = JSON.stringify(property);
            span.dataset.propertyLabel = property.label || property.property;
            
            span.style.cssText = `
                background-color: ${color} !important;
                padding: 2px 4px !important;
                border-radius: 3px !important;
                position: relative !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
            `;
            
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
            
            setupHighlightInteractions(span, property);
            return span;
        }
        
        function createRAGHighlightElement(range, highlightId, property, color, confidence) {
            try {
                const span = document.createElement('span');
                span.className = 'orkg-highlighted orkg-rag-highlight';
                span.dataset.highlightId = highlightId;
                span.dataset.property = JSON.stringify(property);
                span.dataset.propertyLabel = property?.label || property?.property || 'Unknown';
                span.dataset.confidence = confidence || 0;
                span.dataset.source = 'rag';
                
                span.style.cssText = `
                    background-color: ${color} !important;
                    padding: 2px 4px !important;
                    border-radius: 3px !important;
                    position: relative !important;
                    cursor: pointer !important;
                    border-bottom: 2px solid ${adjustColorBrightness(color, -20)} !important;
                    transition: all 0.2s ease !important;
                    ${confidence && confidence < 0.7 ? 'opacity: 0.85;' : ''}
                `;
                
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
                
                return span;
            } catch (error) {
                console.error('Error creating RAG highlight element:', error);
                return null;
            }
        }
        
        function updateHighlightElement(span, property, color) {
            span.dataset.property = JSON.stringify(property);
            span.dataset.propertyLabel = property.label || property.property;
            span.style.backgroundColor = `${color} !important`;
        }
        
        // ================================
        // Marker Creation
        // ================================
        
        function createTextMarkerForHighlight(span, highlightData) {
            try {
                // Ensure the span still exists in DOM
                if (!document.body.contains(span)) {
                    console.warn('Highlight span not in DOM, cannot create marker');
                    return;
                }
                
                const markerMetadata = {
                    highlightId: highlightData.id,
                    text: highlightData.text,
                    property: highlightData.property,
                    color: highlightData.color,
                    source: highlightData.source || 'manual'
                };
                
                console.log('📍 Creating text marker with metadata:', markerMetadata);
                
                const marker = textMarker.createMarker(span, markerMetadata);
                if (marker) {
                    // Ensure span is relatively positioned for absolute marker positioning
                    span.style.position = 'relative';
                    
                    // Style the marker
                    styleMarker(marker, highlightData.source);
                    
                    // Append marker to the highlight span
                    span.appendChild(marker);
                    
                    // Store marker reference
                    highlightData.marker = marker;
                    
                    console.log('✅ Text marker created and attached for highlight:', highlightData.id);
                } else {
                    console.error('❌ TextMarker.createMarker returned null');
                }
            } catch (error) {
                console.error('Failed to create text marker:', error);
            }
        }
        
        function createRAGTextMarker(span, highlightData) {
            try {
                const markerMetadata = {
                    highlightId: highlightData.id,
                    text: highlightData.text,
                    property: highlightData.property,
                    color: highlightData.color,
                    confidence: highlightData.confidence,
                    section: highlightData.section,
                    sentenceIndex: highlightData.sentenceIndex,
                    source: 'rag'
                };
                
                const marker = textMarker.createMarker(span, markerMetadata);
                if (marker) {
                    styleRAGMarker(marker, highlightData.confidence);
                    span.style.position = 'relative';
                    span.appendChild(marker);
                    highlightData.marker = marker;
                    console.log('✅ RAG text marker created for highlight:', highlightData.id);
                }
            } catch (error) {
                console.error('Failed to create RAG text marker:', error);
            }
        }
        
        function styleMarker(marker, source) {
            const baseStyles = `
                position: absolute !important;
                top: -12px !important;
                right: -12px !important;
                width: 28px !important;
                height: 28px !important;
                border-radius: 50% !important;
                border: 2px solid rgba(255, 255, 255, 0.95) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                transition: all 300ms ease !important;
                z-index: 10002 !important;
            `;
            
            const backgroundStyle = source === 'rag' 
                ? 'background: linear-gradient(135deg, #2196F3, #667eea) !important;'
                : 'background: linear-gradient(135deg, #4CAF50, #45a049) !important;';
            
            marker.style.cssText = baseStyles + backgroundStyle + 
                'box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;';
        }
        
        function styleRAGMarker(marker, confidence) {
            styleMarker(marker, 'rag');
            
            if (confidence) {
                const confidenceBadge = document.createElement('div');
                confidenceBadge.style.cssText = `
                    position: absolute !important;
                    bottom: -4px !important;
                    right: -4px !important;
                    background: ${getConfidenceColor(confidence)} !important;
                    color: white !important;
                    font-size: 9px !important;
                    font-weight: bold !important;
                    padding: 2px 4px !important;
                    border-radius: 10px !important;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
                `;
                confidenceBadge.textContent = `${Math.round(confidence * 100)}%`;
                marker.appendChild(confidenceBadge);
            }
        }
        
        // ================================
        // Interaction Handlers
        // ================================
        
        function setupHighlightInteractions(span, property) {
            let tooltipTimeout;
            
            span.addEventListener('mouseenter', function(e) {
                if (e.target.closest('.orkg-marker')) return;
                
                span.style.filter = 'brightness(0.95)';
                tooltipTimeout = setTimeout(() => {
                    showTooltip(span, property);
                }, CONFIG.TOOLTIP_DELAY);
            });
            
            span.addEventListener('mouseleave', function() {
                clearTimeout(tooltipTimeout);
                span.style.filter = '';
                removeTooltip(span);
            });
            
            span.addEventListener('click', function(e) {
                if (e.target.closest('.orkg-marker')) return;
                e.stopPropagation();
                handleHighlightClick(span);
            });
        }
        
        function setupRAGHighlightHoverEffect(span, property, confidence) {
            let tooltipTimeout;
            
            span.addEventListener('mouseenter', function(e) {
                if (e.target.closest('.orkg-marker')) return;
                
                span.style.filter = 'brightness(0.95)';
                span.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                span.style.transform = 'translateY(-1px)';
                
                tooltipTimeout = setTimeout(() => {
                    showRAGTooltip(span, property, confidence);
                }, CONFIG.TOOLTIP_DELAY);
            });
            
            span.addEventListener('mouseleave', function() {
                clearTimeout(tooltipTimeout);
                span.style.filter = '';
                span.style.boxShadow = '';
                span.style.transform = '';
                removeTooltip(span);
            });
            
            span.addEventListener('click', function(e) {
                if (e.target.closest('.orkg-marker')) return;
                e.stopPropagation();
                handleRAGHighlightClick(span);
            });
        }
        
        // ================================
        // Tooltips
        // ================================
        
        function showTooltip(element, property) {
            removeTooltip(element);
            
            const tooltip = createTooltipElement(property);
            element.appendChild(tooltip);
        }
        
        function showRAGTooltip(element, property, confidence) {
            removeTooltip(element);
            
            const tooltip = createRAGTooltipElement(property, confidence);
            element.appendChild(tooltip);
        }
        
        function createTooltipElement(property) {
            const tooltip = document.createElement('div');
            tooltip.className = 'orkg-tooltip';
            tooltip.style.cssText = `
                position: absolute !important;
                bottom: calc(100% + 10px) !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                background: rgba(33, 33, 33, 0.95) !important;
                color: white !important;
                padding: 8px 12px !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                white-space: nowrap !important;
                z-index: 10003 !important;
                pointer-events: none !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
            `;
            
            tooltip.innerHTML = `
                <div style="font-weight: 600;">
                    ${escapeHtml(property.label || property.property || 'Unknown Property')}
                </div>
                <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); 
                     width: 0; height: 0; border: 5px solid transparent; 
                     border-top-color: rgba(33, 33, 33, 0.95);"></div>
            `;
            
            return tooltip;
        }
        
        function createRAGTooltipElement(property, confidence) {
            const tooltip = document.createElement('div');
            tooltip.className = 'orkg-rag-tooltip';
            tooltip.style.cssText = `
                position: absolute !important;
                bottom: calc(100% + 10px) !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                background: linear-gradient(135deg, #1e3a8a, #312e81) !important;
                color: white !important;
                padding: 10px 14px !important;
                border-radius: 8px !important;
                font-size: 12px !important;
                z-index: 10003 !important;
                pointer-events: none !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
                min-width: 180px !important;
            `;
            
            const confidenceLevel = getConfidenceLevel(confidence);
            const confidenceColor = getConfidenceColor(confidence || 0);
            
            tooltip.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span style="background: rgba(255,255,255,0.2); padding: 2px 6px; 
                         border-radius: 4px; font-size: 10px; text-transform: uppercase; 
                         letter-spacing: 0.5px;">RAG</span>
                    <span style="font-weight: 600; flex: 1;">
                        ${escapeHtml(property?.label || property?.property || 'Unknown')}
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; opacity: 0.9;">
                    <span style="font-size: 11px;">Confidence:</span>
                    <span style="background: ${confidenceColor}; padding: 2px 6px; 
                         border-radius: 4px; font-weight: 600; font-size: 11px;">
                        ${confidence ? `${Math.round(confidence * 100)}%` : 'N/A'}
                    </span>
                    <span style="font-size: 11px; opacity: 0.8;">(${confidenceLevel})</span>
                </div>
                <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); 
                     width: 0; height: 0; border: 6px solid transparent; 
                     border-top-color: #1e3a8a;"></div>
            `;
            
            return tooltip;
        }
        
        function removeTooltip(element) {
            const tooltips = element.querySelectorAll('.orkg-tooltip, .orkg-rag-tooltip');
            tooltips.forEach(tooltip => tooltip.remove());
        }
        
        // ================================
        // Click Handlers
        // ================================
        
        function handleHighlightClick(span) {
            const highlightId = span.dataset.highlightId;
            const highlight = highlights.get(highlightId);
            if (highlight) {
                showHighlightInfo(highlight);
            }
        }
        
        function handleRAGHighlightClick(span) {
            const highlightId = span.dataset.highlightId;
            const highlight = ragHighlights.get(highlightId) || highlights.get(highlightId);
            if (highlight) {
                showRAGHighlightInfo(highlight);
            }
        }
        
        function showHighlightInfo(highlight) {
            console.log('Highlight info:', highlight);
            // Can be extended to show a modal or send to extension
        }
        
        function showRAGHighlightInfo(highlight) {
            const modal = createRAGInfoModal(highlight);
            document.body.appendChild(modal);
            
            setTimeout(() => {
                modal.style.opacity = '1';
                const content = modal.querySelector('.modal-content');
                if (content) {
                    content.style.transform = 'translate(-50%, -50%) scale(1)';
                }
            }, 10);
        }
        
        function createRAGInfoModal(highlight) {
            const modal = document.createElement('div');
            modal.className = 'orkg-rag-info-modal';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.5) !important;
                z-index: 100000 !important;
                opacity: 0 !important;
                transition: opacity 0.3s ease !important;
            `;
            
            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.cssText = `
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) scale(0.9) !important;
                background: white !important;
                border-radius: 12px !important;
                padding: 20px !important;
                max-width: 400px !important;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
                transition: transform 0.3s ease !important;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
            `;
            
            const confidenceBar = highlight.confidence ? `
                <div style="margin-top: 4px;">
                    <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: ${getConfidenceColor(highlight.confidence)}; 
                             width: ${highlight.confidence * 100}%; height: 100%; 
                             transition: width 0.3s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 4px; 
                         font-size: 11px; color: #6b7280;">
                        <span>${Math.round(highlight.confidence * 100)}% confidence</span>
                        <span>${getConfidenceLevel(highlight.confidence)}</span>
                    </div>
                </div>
            ` : '';
            
            content.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px; 
                         display: flex; align-items: center; gap: 8px;">
                        <span style="background: linear-gradient(135deg, #e86161, #FF6B6B); 
                             color: white; padding: 4px 8px; border-radius: 6px; 
                             font-size: 12px;">RAG</span>
                        Extracted Property
                    </h3>
                </div>
                
                <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">
                            Property:</strong>
                        <div style="color: #1e293b; font-size: 14px; margin-top: 4px;">
                            ${escapeHtml(highlight.property?.label || 'Unknown')}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">
                            Text:</strong>
                        <div style="color: #1e293b; font-size: 14px; margin-top: 4px; font-style: italic;">
                            "${escapeHtml(highlight.text)}"
                        </div>
                    </div>
                    
                    ${highlight.confidence ? `
                        <div>
                            <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">
                                Confidence:</strong>
                            ${confidenceBar}
                        </div>
                    ` : ''}
                    
                    ${highlight.section ? `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                            <span style="color: #64748b; font-size: 12px;">
                                Section: ${escapeHtml(highlight.section)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <button onclick="this.closest('.orkg-rag-info-modal').remove()" 
                    style="width: 100%; padding: 10px; background: #e86161; color: white; 
                         border: none; border-radius: 8px; font-size: 14px; font-weight: 600; 
                         cursor: pointer; transition: background 0.2s;">
                    Close
                </button>
            `;
            
            modal.appendChild(content);
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            return modal;
        }
        
        // ================================
        // Highlight Management
        // ================================
        
        function removeHighlight(highlightId) {
            const highlight = highlights.get(highlightId) || ragHighlights.get(highlightId);
            if (!highlight) return false;
            
            if (highlight.element && highlight.element.parentNode) {
                const textContent = highlight.element.textContent;
                const textNode = document.createTextNode(textContent);
                highlight.element.parentNode.replaceChild(textNode, highlight.element);
            }
            
            highlights.delete(highlightId);
            ragHighlights.delete(highlightId);
            
            sendHighlightRemovalToExtension(highlightId);
            console.log('✅ Highlight removed:', highlightId);
            return true;
        }
        
        function clearAllHighlights() {
            const allHighlights = [...highlights.values(), ...ragHighlights.values()];
            
            allHighlights.forEach(highlight => {
                if (highlight.element && highlight.element.parentNode) {
                    const textContent = highlight.element.textContent;
                    const textNode = document.createTextNode(textContent);
                    highlight.element.parentNode.replaceChild(textNode, highlight.element);
                }
            });
            
            highlights.clear();
            ragHighlights.clear();
            
            console.log('✅ All highlights cleared');
        }
        
        // ================================
        // Communication with Extension
        // ================================
        
        function sendHighlightToExtension(highlightData) {
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'TEXT_HIGHLIGHT_CREATED',
                    data: {
                        id: highlightData.id,
                        text: highlightData.text,
                        property: highlightData.property,
                        color: highlightData.color,
                        timestamp: highlightData.timestamp,
                        source: highlightData.source
                    }
                }, response => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending highlight to extension:', chrome.runtime.lastError);
                    }
                });
            }
        }
        
        function sendRAGHighlightToExtension(highlightData) {
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'RAG_HIGHLIGHT_CREATED',
                    data: {
                        id: highlightData.id,
                        text: highlightData.text,
                        property: highlightData.property,
                        color: highlightData.color,
                        confidence: highlightData.confidence,
                        section: highlightData.section,
                        sentenceIndex: highlightData.sentenceIndex,
                        timestamp: highlightData.timestamp,
                        source: 'rag'
                    }
                }, response => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending RAG highlight to extension:', chrome.runtime.lastError);
                    }
                });
            }
        }
        
        function sendHighlightRemovalToExtension(highlightId) {
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'TEXT_HIGHLIGHT_REMOVED',
                    data: { id: highlightId }
                });
            }
        }
        
        // ================================
        // Utility Functions
        // ================================
        
        function showPropertyWindow(selectedText, position) {
            if (global.propertyWindow) {
                global.propertyWindow.show(selectedText, position);  // CORRECT
            } else if (global.PropertyWindow) {
                // Create instance if class exists but instance doesn't
                global.propertyWindow = new global.PropertyWindow();
                global.propertyWindow.show(selectedText, position);
            }
        }
        
        function getRandomColor() {
            return CONFIG.DEFAULT_COLORS[Math.floor(Math.random() * CONFIG.DEFAULT_COLORS.length)];
        }
        
        function generateHighlightId(prefix = 'highlight') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        function getPropertyColorFromRAG(property) {
            if (property?.color) return property.color;
            
            const hash = (property?.id || property?.label || '').split('').reduce((acc, char) => {
                return ((acc << 5) - acc) + char.charCodeAt(0);
            }, 0);
            
            return CONFIG.DEFAULT_COLORS[Math.abs(hash) % CONFIG.DEFAULT_COLORS.length];
        }
        
        function adjustColorBrightness(color, percent) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;
            
            return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255))
                .toString(16).slice(1);
        }
        
        function getConfidenceLevel(confidence) {
            if (!confidence) return 'Unknown';
            if (confidence >= CONFIG.CONFIDENCE_THRESHOLDS.HIGH) return 'High';
            if (confidence >= CONFIG.CONFIDENCE_THRESHOLDS.MEDIUM) return 'Medium';
            return 'Low';
        }
        
        function getConfidenceColor(confidence) {
            if (confidence >= CONFIG.CONFIDENCE_THRESHOLDS.HIGH) return '#10b981';
            if (confidence >= CONFIG.CONFIDENCE_THRESHOLDS.MEDIUM) return '#f59e0b';
            return '#ef4444';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function clearPendingHighlight() {
            pendingHighlight = null;
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
        }
        
        // ================================
        // Public API
        // ================================
        
        return {
            // Initialization
            init: init,
            isInitialized: () => isInitialized,
            
            // Core highlighting methods
            highlight: highlight,
            highlightFromRAG: highlightFromRAG,
            highlightRange: highlightRange,
            
            // Highlight management
            removeHighlight: function(highlightId) {
                console.log('Removing highlight:', highlightId);
                
                // Get the highlight from internal maps
                const highlight = highlights.get(highlightId) || ragHighlights.get(highlightId);
                
                if (!highlight) {
                    console.warn('Highlight not found:', highlightId);
                    return false;
                }
                
                // Remove from DOM
                if (highlight.element && highlight.element.parentNode) {
                    const parent = highlight.element.parentNode;
                    
                    // Extract text content
                    while (highlight.element.firstChild) {
                        parent.insertBefore(highlight.element.firstChild, highlight.element);
                    }
                    
                    // Remove the empty highlight element
                    highlight.element.remove();
                }
                
                // Also remove any other elements with this highlight ID
                const additionalElements = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
                additionalElements.forEach(element => {
                    if (element !== highlight.element) {
                        const parent = element.parentNode;
                        while (element.firstChild) {
                            parent.insertBefore(element.firstChild, element);
                        }
                        element.remove();
                    }
                });
                
                // Remove from storage maps
                highlights.delete(highlightId);
                ragHighlights.delete(highlightId);
                
                // Normalize text nodes
                document.normalize();
                
                // Send notification to extension
                sendHighlightRemovalToExtension(highlightId);
                
                // Emit event if EventBus is available
                if (global.MarkerEventBus) {
                    global.MarkerEventBus.emit('highlight:removed', { id: highlightId });
                }
                
                console.log('✅ Highlight removed successfully:', highlightId);
                return true;
            },
            
            clearAllHighlights: clearAllHighlights,
            getHighlight: (id) => highlights.get(id) || ragHighlights.get(id),
            getAllHighlights: () => [...highlights.values(), ...ragHighlights.values()],
            getHighlightCount: () => highlights.size + ragHighlights.size,
            
            // Control marker activation
            setMarkersActive: (active) => { 
                markersActive = active;
                console.log(`📍 Text highlighting ${active ? 'enabled' : 'disabled'}`);
            },
            
            isMarkersActive: () => markersActive,

            // State management
            getPendingHighlight: () => pendingHighlight,
            getLastSelectedRange: () => lastSelectedRange,
            setHighlightMode: (mode) => { isHighlightMode = mode; },
            isHighlightMode: () => isHighlightMode,
            
            // Utilities
            getRandomColor: getRandomColor,
            
            // Statistics
            getStats: () => ({
                manualHighlights: highlights.size - ragHighlights.size,
                ragHighlights: ragHighlights.size,
                totalHighlights: highlights.size
            })
        };
    })();
    
    // Export to global scope
    global.TextHighlighter = TextHighlighter;
    
    console.log('📝 TextHighlighter module loaded');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[highlighting/TextHighlighter.js] Error:', error);
    }
  })();

  // ===== Module: ui/panels/RAGPanelTextRenderer.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/ui/panels/RAGPanelTextRenderer.js
(function(global) {
    'use strict';
    
    class RAGPanelTextRenderer {
        constructor(config = {}) {
            this.config = {
                showConfidence: true,
                showMetadata: true,
                showPropertyColors: true,
                enableSelection: true,
                enableExpandText: true,
                showTimeAgo: true,
                maxTextLength: 200,
                enableActions: true,
                ...config
            };
            
            this.expandedSections = new Set();
            this.selectedItems = new Set();
            this.expandedTexts = new Set();
            this.propertyColors = new Map();
            this.currentFilter = 'all';
            
            this.colorPalette = [
                '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
                '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3'
            ];
        }
        
        render(textData, panelElement) {
            if (!panelElement) return 0;
            
            const content = panelElement.querySelector('.panel-content');
            if (!content) return 0;
            
            content.innerHTML = '';
            let totalCount = 0;
            
            // Add filter controls (removed Recent button)
            const filterControls = this.createFilterControls();
            content.appendChild(filterControls);
            
            // Create container for property groups
            const container = document.createElement('div');
            container.className = 'text-groups-container';
            
            if (textData instanceof Map) {
                const sortedProperties = Array.from(textData.entries())
                    .sort((a, b) => b[1].length - a[1].length);
                
                sortedProperties.forEach(([property, items], index) => {
                    const propertyLabel = property || 'Unknown Property';
                    // All groups start collapsed
                    const propertyGroup = this.createPropertyGroup(propertyLabel, items, index, false);
                    container.appendChild(propertyGroup);
                    totalCount += items.length;
                });
            } else if (Array.isArray(textData)) {
                const propertyGroup = this.createPropertyGroup('All Highlights', textData, 0, false);
                container.appendChild(propertyGroup);
                totalCount = textData.length;
            }
            
            content.appendChild(container);
            
            // Add export footer
            if (totalCount > 0) {
                const footer = this.createFooter(totalCount, textData.size || 1);
                content.appendChild(footer);
            } else {
                content.innerHTML = '<div class="empty-state">No text highlights found</div>';
            }
            
            // Setup event handlers
            this.setupEventHandlers(content);
            
            return totalCount;
        }
        
        createFilterControls() {
            const controls = document.createElement('div');
            controls.className = 'filter-controls';
            
            controls.innerHTML = `
                <div class="filter-header">
                    <span class="filter-label">FILTER</span>
                </div>
                <div class="filter-options">
                    <button class="filter-btn active" data-filter="all" title="Show all text highlights">All</button>
                    <button class="filter-btn" data-filter="high-confidence" title="Show only highlights with 80% or higher confidence score from AI analysis">
                        High Confidence
                        <svg class="info-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                        </svg>
                    </button>
                </div>
            `;
            
            return controls;
        }
        
        createPropertyGroup(propertyLabel, items, index, shouldExpand = false) {
            const propertyId = this.sanitizeId(propertyLabel);
            const isExpanded = shouldExpand; // Always false by default
            
            const group = document.createElement('div');
            group.className = 'property-group';
            group.dataset.propertyId = propertyId;
            
            if (isExpanded) {
                group.classList.add('expanded');
                this.expandedSections.add(propertyId);
            }
            
            // Create collapsible header
            const header = this.createPropertyHeader(propertyLabel, items.length, propertyId);
            group.appendChild(header);
            
            // Create items container
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'property-items';
            itemsContainer.dataset.propertyId = propertyId;
            
            // Add items
            const propertyColor = this.getPropertyColor(propertyLabel);
            items.forEach((item, idx) => {
                const textItem = this.createTextItem(item, idx, propertyColor);
                itemsContainer.appendChild(textItem);
            });
            
            group.appendChild(itemsContainer);
            
            return group;
        }
        
        createPropertyHeader(label, count, propertyId) {
            const header = document.createElement('div');
            header.className = 'property-header';
            header.dataset.propertyId = propertyId;
            
            const propertyColor = this.getPropertyColor(label);
            
            header.innerHTML = `
                <button class="toggle-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
                <span class="property-color-dot" style="background: ${propertyColor};"></span>
                <span class="property-name">${this.escapeHtml(label)}</span>
                <span class="property-count">${count}</span>
                <button class="select-all-btn" data-property-id="${propertyId}" title="Select all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                    </svg>
                </button>
            `;
            
            return header;
        }
        
        createTextItem(item, index, propertyColor) {
            const itemId = item.id || `text_${Date.now()}_${index}`;
            const isSelected = this.selectedItems.has(itemId);
            const isExpanded = this.expandedTexts.has(itemId);
            
            const div = document.createElement('div');
            div.className = 'text-item';
            div.dataset.id = itemId;
            div.dataset.confidence = item.confidence || 0;
            div.dataset.timestamp = item.timestamp || Date.now();
            
            if (isSelected) {
                div.classList.add('selected');
            }
            
            // Prepare text
            let displayText = item.text || item.sentence || item.value || '';
            const fullText = displayText;
            let isTruncated = false;
            
            if (!isExpanded && displayText.length > this.config.maxTextLength) {
                displayText = displayText.substring(0, this.config.maxTextLength) + '...';
                isTruncated = true;
            }
            
            // Build item HTML
            let html = `
                <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''}>
                <div class="color-dot" style="background: ${propertyColor};"></div>
                <div class="text-content">
                    <div class="text-preview">
                        <span class="text-content-span">${this.escapeHtml(displayText)}</span>
                        ${isTruncated ? `<button class="expand-btn" data-id="${itemId}">Show more</button>` : ''}
                        ${isExpanded ? `<button class="expand-btn" data-id="${itemId}">Show less</button>` : ''}
                    </div>
            `;
            
            // Add metadata
            if (this.config.showMetadata) {
                const metaParts = [];
                if (item.section) metaParts.push(`Section: ${item.section}`);
                if (item.sentenceIndex !== undefined) metaParts.push(`Sentence ${item.sentenceIndex + 1}`);
                if (this.config.showTimeAgo && item.timestamp) {
                    metaParts.push(this.getTimeAgo(item.timestamp));
                }
                
                if (metaParts.length > 0) {
                    html += `<div class="text-meta">${this.escapeHtml(metaParts.join(' • '))}</div>`;
                }
            }
            
            html += '</div>';
            
            // Add actions
            if (this.config.enableActions) {
                html += `
                    <div class="item-actions">
                        <button class="action-jump" title="Jump to text">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </button>
                        <button class="action-copy" title="Copy text">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                `;
            }
            
            // Add confidence badge
            if (this.config.showConfidence && item.confidence !== undefined) {
                const percent = Math.round(item.confidence * 100);
                const color = item.confidence >= 0.8 ? '#28a745' : 
                             item.confidence >= 0.5 ? '#ffc107' : '#dc3545';
                html += `<span class="confidence-badge" style="background: ${color};">${percent}%</span>`;
            }
            
            div.innerHTML = html;
            div.dataset.fullText = fullText;
            
            return div;
        }
        
        createFooter(totalCount, groupCount) {
            const footer = document.createElement('div');
            footer.className = 'panel-footer';
            
            footer.innerHTML = `
                <div class="footer-stats">
                    <span>${totalCount} item${totalCount !== 1 ? 's' : ''}</span>
                    <span>${groupCount} group${groupCount !== 1 ? 's' : ''}</span>
                </div>
                <button class="export-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export
                </button>
            `;
            
            return footer;
        }
        
        setupEventHandlers(container) {
            container.addEventListener('click', (e) => {
                // Property header toggle
                const header = e.target.closest('.property-header');
                if (header && !e.target.closest('.select-all-btn')) {
                    this.toggleSection(header.dataset.propertyId);
                }
                
                // Select all button
                if (e.target.closest('.select-all-btn')) {
                    const btn = e.target.closest('.select-all-btn');
                    this.toggleSelectAll(btn.dataset.propertyId);
                }
                
                // Item checkbox
                const checkbox = e.target.closest('.item-checkbox');
                if (checkbox) {
                    const item = checkbox.closest('.text-item');
                    this.toggleItemSelection(item.dataset.id, checkbox.checked);
                }
                
                // Expand button
                const expandBtn = e.target.closest('.expand-btn');
                if (expandBtn) {
                    e.stopPropagation();
                    this.toggleTextExpansion(expandBtn.dataset.id);
                }
                
                // Filter buttons
                const filterBtn = e.target.closest('.filter-btn');
                if (filterBtn) {
                    this.applyFilter(filterBtn.dataset.filter, container);
                }
                
                // Export button
                const exportBtn = e.target.closest('.export-btn');
                if (exportBtn) {
                    this.handleExport(container);
                }
                
                // Jump action
                const jumpBtn = e.target.closest('.action-jump');
                if (jumpBtn) {
                    const item = jumpBtn.closest('.text-item');
                    this.handleJumpToText(item);
                }
                
                // Copy action
                const copyBtn = e.target.closest('.action-copy');
                if (copyBtn) {
                    const item = copyBtn.closest('.text-item');
                    this.handleCopyText(item);
                }
            });
        }
        
        toggleSection(propertyId) {
            const group = document.querySelector(`.property-group[data-property-id="${propertyId}"]`);
            if (!group) return;
            
            if (this.expandedSections.has(propertyId)) {
                this.expandedSections.delete(propertyId);
                group.classList.remove('expanded');
            } else {
                this.expandedSections.add(propertyId);
                group.classList.add('expanded');
            }
        }
        
        toggleSelectAll(propertyId) {
            const group = document.querySelector(`.property-group[data-property-id="${propertyId}"]`);
            if (!group) return;
            
            const items = group.querySelectorAll('.text-item');
            const checkboxes = group.querySelectorAll('.item-checkbox');
            
            // Check if all are selected
            const allSelected = Array.from(checkboxes).every(cb => cb.checked);
            
            items.forEach(item => {
                const checkbox = item.querySelector('.item-checkbox');
                const itemId = item.dataset.id;
                
                if (allSelected) {
                    // Deselect all
                    checkbox.checked = false;
                    this.selectedItems.delete(itemId);
                    item.classList.remove('selected');
                } else {
                    // Select all
                    checkbox.checked = true;
                    this.selectedItems.add(itemId);
                    item.classList.add('selected');
                }
            });
        }
        
        toggleItemSelection(itemId, selected) {
            const item = document.querySelector(`.text-item[data-id="${itemId}"]`);
            if (!item) return;
            
            if (selected) {
                this.selectedItems.add(itemId);
                item.classList.add('selected');
            } else {
                this.selectedItems.delete(itemId);
                item.classList.remove('selected');
            }
        }
        
        toggleTextExpansion(itemId) {
            const item = document.querySelector(`.text-item[data-id="${itemId}"]`);
            if (!item) return;
            
            const preview = item.querySelector('.text-preview');
            const contentSpan = preview.querySelector('.text-content-span');
            const expandBtn = preview.querySelector('.expand-btn');
            const fullText = item.dataset.fullText;
            
            if (this.expandedTexts.has(itemId)) {
                // Collapse
                this.expandedTexts.delete(itemId);
                const truncated = fullText.substring(0, this.config.maxTextLength) + '...';
                contentSpan.textContent = truncated;
                if (expandBtn) expandBtn.textContent = 'Show more';
            } else {
                // Expand
                this.expandedTexts.add(itemId);
                contentSpan.textContent = fullText;
                if (expandBtn) expandBtn.textContent = 'Show less';
            }
        }
        
        applyFilter(filterType, container) {
            this.currentFilter = filterType;
            const items = container.querySelectorAll('.text-item');
            let visibleCount = 0;
            
            items.forEach(item => {
                let show = true;
                
                if (filterType === 'high-confidence') {
                    // Show only items with confidence >= 0.8
                    const confidence = parseFloat(item.dataset.confidence || 0);
                    show = confidence >= 0.8;
                }
                // 'all' filter shows everything
                
                item.style.display = show ? 'flex' : 'none';
                if (show) visibleCount++;
            });
            
            // Update filter buttons with visual feedback
            container.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filterType);
            });
            
            // Update property counts to reflect visible items
            container.querySelectorAll('.property-group').forEach(group => {
                const visibleInGroup = group.querySelectorAll('.text-item:not([style*="none"])').length;
                const countBadge = group.querySelector('.property-count');
                if (countBadge) {
                    countBadge.textContent = visibleInGroup;
                }
            });
        }
        
        handleJumpToText(item) {
            const text = item.dataset.fullText;
            const id = item.dataset.id;
            
            if (!text) return;
            
            // Try using TextSearchUtility if available
            if (typeof window.textSearchUtility !== 'undefined') {
                const range = window.textSearchUtility.findText(text.substring(0, 100));
                if (range) {
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    // Scroll to selection
                    const rect = range.getBoundingClientRect();
                    window.scrollTo({
                        top: window.pageYOffset + rect.top - 200,
                        behavior: 'smooth'
                    });
                    
                    // Highlight temporarily
                    const span = document.createElement('span');
                    span.style.backgroundColor = '#ffeb3b';
                    span.className = 'orkg-jump-highlight';
                    try {
                        range.surroundContents(span);
                        setTimeout(() => {
                            const parent = span.parentNode;
                            while (span.firstChild) {
                                parent.insertBefore(span.firstChild, span);
                            }
                            parent.removeChild(span);
                        }, 3000);
                    } catch (e) {
                        console.debug('Could not highlight text');
                    }
                    
                    // Visual feedback
                    item.classList.add('orkg-jump-highlight');
                    setTimeout(() => item.classList.remove('orkg-jump-highlight'), 2000);
                    return;
                }
            }
            
            // Fallback: Try to find highlighted elements first
            const highlights = document.querySelectorAll('.orkg-highlight, mark[data-highlight-id]');
            let targetElement = null;
            
            // First try to find by ID
            highlights.forEach(highlight => {
                if (highlight.dataset.highlightId === id || highlight.dataset.id === id) {
                    targetElement = highlight;
                }
            });
            
            // If not found, try to find by text content
            if (!targetElement) {
                const searchText = text.substring(0, 50).toLowerCase();
                highlights.forEach(highlight => {
                    if (highlight.textContent.toLowerCase().includes(searchText)) {
                        targetElement = highlight;
                    }
                });
            }
            
            // If still not found, search in paragraphs
            if (!targetElement) {
                const searchText = text.substring(0, 50).toLowerCase();
                const elements = document.querySelectorAll('p, span, div');
                
                for (const el of elements) {
                    if (el.textContent.toLowerCase().includes(searchText)) {
                        targetElement = el;
                        break;
                    }
                }
            }
            
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetElement.classList.add('orkg-jump-highlight');
                setTimeout(() => targetElement.classList.remove('orkg-jump-highlight'), 3000);
            }
            
            // Visual feedback on the item
            item.classList.add('orkg-jump-highlight');
            setTimeout(() => item.classList.remove('orkg-jump-highlight'), 2000);
        }
        
        handleExport(container) {
            const data = [];
            
            // Get all text items (no Selected column)
            container.querySelectorAll('.text-item').forEach(item => {
                if (item.style.display !== 'none') {
                    const propertyGroup = item.closest('.property-group');
                    const propertyName = propertyGroup ? 
                        propertyGroup.querySelector('.property-name')?.textContent || 'Unknown' :
                        'Unknown';
                    
                    data.push({
                        property: propertyName,
                        text: item.dataset.fullText || item.querySelector('.text-content-span')?.textContent || '',
                        confidence: item.dataset.confidence || 'N/A',
                        method: 'AI'
                    });
                }
            });
            
            // Create CSV without Selected column
            const csv = 'Property Name,Text,Confidence,Generation Method\n' + 
                data.map(row => 
                    `"${row.property}","${row.text.replace(/"/g, '""')}","${row.confidence}","${row.method}"`
                ).join('\n');
            
            // Download CSV
            this.downloadCSV(csv, 'text-highlights');
        }
        
        handleCopyText(item) {
            const text = item.dataset.fullText;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showCopySuccess(item);
                });
            }
        }
        
        showCopySuccess(element) {
            const toast = document.createElement('div');
            toast.className = 'copy-toast';
            toast.textContent = 'Copied!';
            element.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        }
        
        downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
        
        getPropertyColor(property) {
            if (!this.propertyColors.has(property)) {
                const index = this.propertyColors.size % this.colorPalette.length;
                this.propertyColors.set(property, this.colorPalette[index]);
            }
            return this.propertyColors.get(property);
        }
        
        getTimeAgo(timestamp) {
            const seconds = Math.floor((Date.now() - timestamp) / 1000);
            if (seconds < 60) return 'just now';
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
            return `${Math.floor(seconds / 86400)}d ago`;
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
        
        sanitizeId(text) {
            return (text || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_');
        }
    }
    
    global.RAGPanelTextRenderer = RAGPanelTextRenderer;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[ui/panels/RAGPanelTextRenderer.js] Error:', error);
    }
  })();

  // ===== Module: ui/panels/RAGPanelImagesRenderer.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/ui/panels/RAGPanelImagesRenderer.js
(function(global) {
    'use strict';
    
    class RAGPanelImagesRenderer {
        constructor(config = {}) {
            this.config = {
                enableViewToggle: true,
                showScoreBadge: true,
                enableLightbox: true,
                enableExport: true,
                enableJumpTo: true,
                ...config
            };
            
            this.currentView = 'grid';
            this.selectedImages = new Set();
        }
        
        render(images, panelElement) {
            if (!panelElement) return 0;
            
            const content = panelElement.querySelector('.panel-content');
            if (!content) return 0;
            
            content.innerHTML = '';
            
            if (!images || images.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <svg class="orkg-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p>No images found</p>
                    </div>
                `;
                return 0;
            }
            
            // Add gallery controls
            if (this.config.enableViewToggle) {
                const controls = this.createGalleryControls(images.length);
                content.appendChild(controls);
            }
            
            // Create image grid
            const grid = this.createImageGrid(images);
            content.appendChild(grid);
            
            // Add summary
            const summary = this.createImagesSummary(images);
            content.appendChild(summary);
            
            // Setup event handlers
            this.setupEventHandlers(content);
            
            return images.length;
        }
        
        createGalleryControls(count) {
            const controls = document.createElement('div');
            controls.className = 'gallery-controls';
            
            controls.innerHTML = `
                <div class="view-options">
                    <button class="view-btn active" data-view="grid" title="Grid view">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                    </button>
                    <button class="view-btn" data-view="list" title="List view">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="gallery-info">${count} image${count !== 1 ? 's' : ''}</div>
            `;
            
            return controls;
        }
        
        createImageGrid(images) {
            const grid = document.createElement('div');
            grid.className = 'image-grid';
            grid.dataset.view = this.currentView;
            
            images.forEach((img, index) => {
                const item = this.createImageItem(img, index);
                grid.appendChild(item);
            });
            
            return grid;
        }
        
        createImageItem(img, index) {
            const itemId = img.id || `image_${Date.now()}_${index}`;
            const caption = img.caption || img.alt || img.title || `Image ${index + 1}`;
            const score = img.score || img.intelligence?.score;
            
            const item = document.createElement('div');
            item.className = 'image-item';
            item.dataset.id = itemId;
            
            let html = `<div class="image-thumb">`;
            
            if (img.src) {
                html += `
                    <img src="${img.src}" alt="${this.escapeHtml(caption)}" loading="lazy" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                `;
            }
            
            html += `
                <div class="image-placeholder" ${img.src ? 'style="display:none;"' : ''}>
                    <svg class="orkg-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
            `;
            
            if (img.type) {
                html += `<div class="image-type">${img.type}</div>`;
            }
            
            html += `</div>`;
            
            html += `<div class="image-caption">${this.escapeHtml(caption)}</div>`;
            
            // Add action buttons (Jump to and Zoom)
            html += `
                <div class="image-item-actions">
                    <button class="action-jump" title="Jump to image">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </button>
                    <button class="action-zoom" title="Zoom image">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                    </button>
                </div>
            `;
            
            if (score !== undefined && this.config.showScoreBadge) {
                html += `<div class="score-badge">${Math.round(score * 100)}%</div>`;
            }
            
            item.innerHTML = html;
            item.dataset.caption = caption;
            item.dataset.src = img.src || '';
            
            return item;
        }
        
        createImagesSummary(images) {
            const summary = document.createElement('div');
            summary.className = 'images-summary';
            
            // Calculate statistics
            let totalWithScore = 0;
            let totalScore = 0;
            let totalWithDimensions = 0;
            const types = new Map();
            
            images.forEach(img => {
                if (img.score !== undefined) {
                    totalWithScore++;
                    totalScore += img.score;
                }
                if (img.dimensions) {
                    totalWithDimensions++;
                }
                if (img.type) {
                    types.set(img.type, (types.get(img.type) || 0) + 1);
                }
            });
            
            const avgScore = totalWithScore > 0 ? Math.round((totalScore / totalWithScore) * 100) : null;
            
            summary.innerHTML = `
                <div class="summary-title">Summary</div>
                <div class="summary-stats">
                    <div class="summary-stat">
                        <span class="stat-label">Total Images</span>
                        <span class="stat-value">${images.length}</span>
                    </div>
                    ${avgScore !== null ? `
                        <div class="summary-stat">
                            <span class="stat-label">Avg Score</span>
                            <span class="stat-value">${avgScore}%</span>
                        </div>
                    ` : ''}
                    ${types.size > 0 ? `
                        <div class="summary-stat">
                            <span class="stat-label">Types</span>
                            <span class="stat-value">${types.size}</span>
                        </div>
                    ` : ''}
                    ${totalWithDimensions > 0 ? `
                        <div class="summary-stat">
                            <span class="stat-label">With Dimensions</span>
                            <span class="stat-value">${totalWithDimensions}</span>
                        </div>
                    ` : ''}
                </div>
                ${this.config.enableExport ? `
                    <button class="export-images-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export Image List
                    </button>
                ` : ''}
            `;
            
            return summary;
        }
        
        setupEventHandlers(container) {
            container.addEventListener('click', (e) => {
                // View toggle buttons
                const viewBtn = e.target.closest('.view-btn');
                if (viewBtn) {
                    this.toggleView(viewBtn.dataset.view, container);
                }
                
                // Jump to image action
                const jumpBtn = e.target.closest('.action-jump');
                if (jumpBtn) {
                    const item = jumpBtn.closest('.image-item');
                    this.handleJumpToImage(item);
                }
                
                // Zoom image action
                const zoomBtn = e.target.closest('.action-zoom');
                if (zoomBtn) {
                    const item = zoomBtn.closest('.image-item');
                    this.handleZoomImage(item);
                }
                
                // Export button
                const exportBtn = e.target.closest('.export-images-btn');
                if (exportBtn) {
                    this.handleExport(container);
                }
                
                // Image click (for selection)
                const imageItem = e.target.closest('.image-item');
                if (imageItem && !e.target.closest('button')) {
                    this.handleImageClick(imageItem);
                }
            });
        }
        
        toggleView(view, container) {
            this.currentView = view;
            const grid = container.querySelector('.image-grid');
            
            if (grid) {
                grid.dataset.view = view;
                
                // Update button states
                container.querySelectorAll('.view-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.view === view);
                });
            }
        }
        
        handleImageClick(item) {
            item.classList.toggle('selected');
            
            const id = item.dataset.id;
            if (item.classList.contains('selected')) {
                this.selectedImages.add(id);
            } else {
                this.selectedImages.delete(id);
            }
        }
        
        handleJumpToImage(item) {
            const id = item.dataset.id;
            const caption = item.dataset.caption;
            const src = item.dataset.src;
            
            // Find image in document
            const images = document.querySelectorAll('img');
            let targetImage = null;
            
            // Try to find by id first
            if (id) {
                targetImage = document.getElementById(id);
            }
            
            // If not found, try to find by src
            if (!targetImage && src) {
                images.forEach(img => {
                    if (img.src === src || img.src.includes(src) || src.includes(img.src)) {
                        targetImage = img;
                    }
                });
            }
            
            // If still not found, try to find by alt text
            if (!targetImage && caption) {
                images.forEach(img => {
                    if (img.alt && (img.alt.includes(caption) || caption.includes(img.alt))) {
                        targetImage = img;
                    }
                });
            }
            
            if (targetImage) {
                // Scroll to the image
                targetImage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Highlight the image temporarily
                targetImage.classList.add('orkg-jump-highlight');
                setTimeout(() => targetImage.classList.remove('orkg-jump-highlight'), 3000);
                
                // Trigger custom event
                const event = new CustomEvent('orkg-jump-to-image', {
                    detail: { id, caption, element: targetImage }
                });
                document.dispatchEvent(event);
            } else {
                console.warn('Image not found in document:', caption);
            }
            
            // Visual feedback on the item
            item.classList.add('orkg-jump-highlight');
            setTimeout(() => item.classList.remove('orkg-jump-highlight'), 2000);
        }
        
        handleZoomImage(item) {
            const src = item.dataset.src;
            const caption = item.dataset.caption;
            
            if (this.config.enableLightbox && src) {
                this.createLightbox(src, caption);
            }
        }
        
        createLightbox(src, caption) {
            const lightbox = document.createElement('div');
            lightbox.className = 'orkg-lightbox';
            
            lightbox.innerHTML = `
                <div class="lightbox-backdrop"></div>
                <div class="lightbox-content">
                    <img src="${src}" alt="${this.escapeHtml(caption)}">
                    <div class="lightbox-caption">${this.escapeHtml(caption)}</div>
                    <button class="lightbox-close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            
            document.body.appendChild(lightbox);
            
            // Add close handlers
            lightbox.addEventListener('click', (e) => {
                if (e.target.closest('.lightbox-close') || e.target.classList.contains('lightbox-backdrop')) {
                    lightbox.remove();
                }
            });
            
            // Close on escape key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    lightbox.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }
        
        handleExport(container) {
            const images = container.querySelectorAll('.image-item');
            const data = [];
            
            images.forEach((item, index) => {
                const score = item.querySelector('.score-badge');
                data.push({
                    id: item.dataset.id,
                    caption: item.dataset.caption,
                    src: item.dataset.src || 'N/A',
                    selected: item.classList.contains('selected'),
                    score: score ? score.textContent : 'N/A'
                });
            });
            
            // Create CSV
            const csv = 'ID,Caption,Source,Selected,Score\n' +
                data.map(row => 
                    `"${row.id}","${row.caption}","${row.src}","${row.selected}","${row.score}"`
                ).join('\n');
            
            this.downloadCSV(csv, 'images-export');
        }
        
        downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
    }
    
    global.RAGPanelImagesRenderer = RAGPanelImagesRenderer;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[ui/panels/RAGPanelImagesRenderer.js] Error:', error);
    }
  })();

  // ===== Module: ui/panels/RAGPanelTablesRenderer.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/ui/panels/RAGPanelTablesRenderer.js
(function(global) {
    'use strict';
    
    class RAGPanelTablesRenderer {
        constructor(config = {}) {
            this.config = {
                showSummary: true,
                enablePreview: true,
                enableExport: true,
                enableJumpTo: true,
                ...config
            };
            
            this.selectedTables = new Set();
        }
        
        render(tables, panelElement) {
            if (!panelElement) return 0;
            
            const content = panelElement.querySelector('.panel-content');
            if (!content) return 0;
            
            content.innerHTML = '';
            
            if (!tables || tables.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <svg class="orkg-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
                        </svg>
                        <p>No tables found</p>
                    </div>
                `;
                return 0;
            }
            
            // Create table list
            const list = this.createTableList(tables);
            content.appendChild(list);
            
            // Add summary
            if (this.config.showSummary) {
                const summary = this.createTablesSummary(tables);
                content.appendChild(summary);
            }
            
            // Setup event handlers
            this.setupEventHandlers(content);
            
            return tables.length;
        }
        
        createTableList(tables) {
            const list = document.createElement('div');
            list.className = 'table-list';
            
            tables.forEach((table, index) => {
                const item = this.createTableItem(table, index);
                list.appendChild(item);
            });
            
            return list;
        }
        
        createTableItem(table, index) {
            const itemId = table.id || `table_${Date.now()}_${index}`;
            const caption = table.caption || table.title || `Table ${index + 1}`;
            const rows = table.summary?.rows || table.rows || 0;
            const cols = table.summary?.columns || table.columns || 0;
            
            const item = document.createElement('div');
            item.className = 'table-item';
            item.dataset.id = itemId;
            
            // Build HTML - Only show dimensions, no table data
            let html = `
                <div class="table-header">
                    <svg class="orkg-icon table-icon" width="20" height="20" viewBox="0 0 24 24" 
                         fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
                    </svg>
                    <span class="table-number">${this.escapeHtml(caption)}</span>
                    <span class="table-size">${rows}×${cols}</span>
                </div>
            `;
            
            // Add description if available (but no data)
            if (table.summary?.description || (table.caption && table.caption !== caption)) {
                html += `
                    <div class="table-caption">
                        ${this.escapeHtml(table.summary?.description || table.caption)}
                    </div>
                `;
            }
            
            // Do NOT show headers or any data, just dimensions
            
            // Add actions
            html += `
                <div class="table-actions">
                    ${this.config.enablePreview ? `
                        <button class="preview-btn" data-id="${itemId}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Preview
                        </button>
                    ` : ''}
                    ${this.config.enableJumpTo ? `
                        <button class="jump-btn" data-id="${itemId}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            Jump to
                        </button>
                    ` : ''}
                    ${this.config.enableExport ? `
                        <button class="export-btn" data-id="${itemId}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Export
                        </button>
                    ` : ''}
                </div>
            `;
            
            item.innerHTML = html;
            
            // Store minimal data for operations
            item.dataset.caption = caption;
            item.dataset.rows = rows;
            item.dataset.cols = cols;
            
            // Store reference to actual table element if provided
            if (table.element) {
                item._tableElement = table.element;
            }
            
            return item;
        }
        
        createTablesSummary(tables) {
            const summary = document.createElement('div');
            summary.className = 'tables-summary';
            
            // Calculate statistics
            let totalRows = 0;
            let totalCols = 0;
            let totalCells = 0;
            const types = new Map();
            
            tables.forEach(table => {
                const rows = table.summary?.rows || table.rows || 0;
                const cols = table.summary?.columns || table.columns || 0;
                totalRows += rows;
                totalCols += cols;
                totalCells += rows * cols;
                
                if (table.type) {
                    types.set(table.type, (types.get(table.type) || 0) + 1);
                }
            });
            
            const avgRows = tables.length > 0 ? Math.round(totalRows / tables.length) : 0;
            const avgCols = tables.length > 0 ? Math.round(totalCols / tables.length) : 0;
            
            summary.innerHTML = `
                <div class="summary-title">Summary</div>
                <div class="summary-grid">
                    <div class="summary-stat">
                        <span class="stat-label">Total Tables</span>
                        <span class="stat-value stat-value-primary">${tables.length}</span>
                    </div>
                    <div class="summary-stat">
                        <span class="stat-label">Avg Size</span>
                        <span class="stat-value stat-value-secondary">${avgRows} × ${avgCols}</span>
                    </div>
                    <div class="summary-stat">
                        <span class="stat-label">Total Cells</span>
                        <span class="stat-value stat-value-info">${totalCells.toLocaleString()}</span>
                    </div>
                    ${types.size > 0 ? `
                        <div class="summary-stat">
                            <span class="stat-label">Types</span>
                            <span class="stat-value">${types.size}</span>
                        </div>
                    ` : ''}
                </div>
                ${this.config.enableExport ? `
                    <button class="export-all-tables-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export All Tables Info
                    </button>
                ` : ''}
            `;
            
            return summary;
        }
        
        setupEventHandlers(container) {
            container.addEventListener('click', (e) => {
                // Table item click for selection
                const tableItem = e.target.closest('.table-item');
                if (tableItem && !e.target.closest('button')) {
                    this.handleTableSelect(tableItem);
                }
                
                // Preview button
                const previewBtn = e.target.closest('.preview-btn');
                if (previewBtn) {
                    e.stopPropagation();
                    const item = previewBtn.closest('.table-item');
                    this.handlePreview(item);
                }
                
                // Jump button
                const jumpBtn = e.target.closest('.jump-btn');
                if (jumpBtn) {
                    e.stopPropagation();
                    const item = jumpBtn.closest('.table-item');
                    this.handleJumpTo(item);
                }
                
                // Export button
                const exportBtn = e.target.closest('.export-btn');
                if (exportBtn) {
                    e.stopPropagation();
                    const item = exportBtn.closest('.table-item');
                    this.handleExportTable(item);
                }
                
                // Export all button
                const exportAllBtn = e.target.closest('.export-all-tables-btn');
                if (exportAllBtn) {
                    this.handleExportAll(container);
                }
            });
        }
        
        handleTableSelect(item) {
            const id = item.dataset.id;
            
            item.classList.toggle('selected');
            
            if (item.classList.contains('selected')) {
                this.selectedTables.add(id);
            } else {
                this.selectedTables.delete(id);
            }
        }
        
        handlePreview(item) {
            const caption = item.dataset.caption;
            const rows = parseInt(item.dataset.rows) || 0;
            const cols = parseInt(item.dataset.cols) || 0;
            
            // Try to get the actual table HTML
            let tableHtml = '';
            
            // If table element was stored
            if (item._tableElement) {
                tableHtml = item._tableElement.outerHTML;
            } else {
                // Try to find the table in the document
                const tables = document.querySelectorAll('table');
                for (const table of tables) {
                    const tableCaption = table.querySelector('caption');
                    if (tableCaption && tableCaption.textContent.includes(caption)) {
                        tableHtml = table.outerHTML;
                        break;
                    }
                }
            }
            
            // Create preview modal
            const modal = this.createPreviewModal(caption, tableHtml, rows, cols);
            document.body.appendChild(modal);
        }
        
        createPreviewModal(caption, tableHtml, rows, cols) {
            const modal = document.createElement('div');
            modal.className = 'table-preview-modal';
            
            let tableContent = '';
            
            if (tableHtml) {
                // Show the actual table
                tableContent = `
                    <div class="preview-table-container" style="overflow: auto; max-height: 400px;">
                        ${tableHtml}
                    </div>
                `;
            } else {
                // Show dimensions only
                tableContent = `
                    <div class="preview-placeholder">
                        <p><strong>Table: ${this.escapeHtml(caption)}</strong></p>
                        <p>Dimensions: ${rows} rows × ${cols} columns</p>
                        <p>Total cells: ${rows * cols}</p>
                        <p class="preview-note">Table preview not available. The actual table might be dynamically generated or not directly accessible.</p>
                    </div>
                `;
            }
            
            modal.innerHTML = `
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${this.escapeHtml(caption)}</h3>
                        <button class="modal-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${tableContent}
                    </div>
                </div>
            `;
            
            // Close handlers
            modal.addEventListener('click', (e) => {
                if (e.target.closest('.modal-close') || e.target.classList.contains('modal-backdrop')) {
                    modal.remove();
                }
            });
            
            return modal;
        }
        
        handleJumpTo(item) {
            const id = item.dataset.id;
            const caption = item.dataset.caption;
            
            // Find the table in the document
            const tables = document.querySelectorAll('table');
            let targetTable = null;
            
            // Try to find by id first
            targetTable = document.getElementById(id);
            
            // If not found, try to find by caption text
            if (!targetTable) {
                tables.forEach(table => {
                    const tableCaption = table.querySelector('caption');
                    if (tableCaption && tableCaption.textContent.includes(caption)) {
                        targetTable = table;
                    }
                });
            }
            
            // If still not found, try to find by nearby text
            if (!targetTable && caption) {
                const searchText = caption.toLowerCase();
                tables.forEach(table => {
                    const nearbyText = table.parentElement.textContent.toLowerCase();
                    if (nearbyText.includes(searchText)) {
                        targetTable = table;
                    }
                });
            }
            
            if (targetTable) {
                // Scroll to table
                targetTable.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Highlight the table
                targetTable.classList.add('orkg-jump-highlight');
                setTimeout(() => targetTable.classList.remove('orkg-jump-highlight'), 3000);
                
                // Trigger custom event
                const event = new CustomEvent('orkg-jump-to-table', {
                    detail: { id, caption, element: targetTable }
                });
                document.dispatchEvent(event);
            } else {
                console.warn('Table not found:', caption);
            }
            
            // Visual feedback on the item
            item.classList.add('orkg-jump-highlight');
            setTimeout(() => item.classList.remove('orkg-jump-highlight'), 2000);
        }
        
        handleExportTable(item) {
            const id = item.dataset.id;
            const caption = item.dataset.caption;
            const rows = item.dataset.rows;
            const cols = item.dataset.cols;
            
            // Try to capture the table as an image using html2canvas if available
            if (typeof html2canvas !== 'undefined') {
                // Find the actual table
                const tables = document.querySelectorAll('table');
                let targetTable = null;
                
                // Try to find by id first
                targetTable = document.getElementById(id);
                
                // If not found, try to find by caption
                if (!targetTable) {
                    tables.forEach(table => {
                        const tableCaption = table.querySelector('caption');
                        if (tableCaption && tableCaption.textContent.includes(caption)) {
                            targetTable = table;
                        }
                    });
                }
                
                if (targetTable) {
                    // Export as image
                    html2canvas(targetTable).then(canvas => {
                        canvas.toBlob(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `table-${caption.replace(/\s+/g, '-')}.png`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                        });
                    });
                } else {
                    // Fallback to info export
                    this.exportTableInfo(caption, rows, cols);
                }
            } else {
                // Export table info as CSV
                this.exportTableInfo(caption, rows, cols);
            }
        }
        
        exportTableInfo(caption, rows, cols) {
            let csv = `Table Information\n`;
            csv += `Caption: ${caption}\n`;
            csv += `Dimensions: ${rows} rows × ${cols} columns\n`;
            csv += `Total Cells: ${rows * cols}\n\n`;
            csv += `Note: To export the actual table data as an image, please include the html2canvas library.\n`;
            csv += `Alternatively, use the browser's developer tools to extract the table data.\n`;
            
            this.downloadCSV(csv, `table-${caption.replace(/\s+/g, '-')}`);
        }
        
        handleExportAll(container) {
            const tables = container.querySelectorAll('.table-item');
            const data = [];
            
            tables.forEach(item => {
                data.push({
                    id: item.dataset.id,
                    caption: item.dataset.caption,
                    rows: item.dataset.rows,
                    cols: item.dataset.cols,
                    selected: item.classList.contains('selected')
                });
            });
            
            // Create CSV
            const csv = 'ID,Caption,Rows,Columns,Selected\n' +
                data.map(row => 
                    `"${row.id}","${row.caption}","${row.rows}","${row.cols}","${row.selected}"`
                ).join('\n');
            
            this.downloadCSV(csv, 'all-tables');
        }
        
        downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
    }
    
    global.RAGPanelTablesRenderer = RAGPanelTablesRenderer;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[ui/panels/RAGPanelTablesRenderer.js] Error:', error);
    }
  })();

  // ===== Module: ui/PropertyWindow.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/ui/PropertyWindow.js

class PropertyWindow {
    constructor() {
        this.windowElement = null;
        this.isVisible = false;
        this.isMinimized = false;
        this.currentSelectedText = '';
        this.currentPosition = { x: 0, y: 0 };
        this.selectedProperty = null;
        this.selectedColor = null;
        this.savedRange = null;
        
        // Control flags
        this.isUserInteracting = false;
        this.documentClickListener = null;
        this.escapeKeyListener = null;
        
        // Dragging state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.windowStartX = 0;
        this.windowStartY = 0;

        this.aiSuggestions = [];
        this.orkgProperties = [];
        this.searchTimeout = null;
        this.isLoadingAI = false;
        this.isLoadingORKG = false;
        
        this.WINDOW_WIDTH = 380;
        this.WINDOW_HEIGHT = 520;
        this.WINDOW_HEIGHT_MINIMIZED = 40;
        this.SEARCH_DEBOUNCE = 300;
        this.AI_SUGGESTION_CACHE = new Map();
        
        // Color palette for random selection
        this.colorPalette = [
            '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
            '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3',
            '#87CEEB', '#FFA07A', '#FFEFD5', '#F0FFF0'
        ];
    }
    
    createWindow() {
        if (this.windowElement) {
            return this.windowElement;
        }
        
        this.windowElement = document.createElement('div');
        this.windowElement.className = 'orkg-property-window';
        this.windowElement.setAttribute('data-orkg-element', 'property-window');
        
        this.windowElement.innerHTML = this.getWindowHTML();
        
        // Add CSS link to document if not already present
        if (!document.getElementById('orkg-property-window-styles')) {
            const link = document.createElement('link');
            link.id = 'orkg-property-window-styles';
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.runtime.getURL('src/styles/content/property-window.css');
            document.head.appendChild(link);
        }
        
        this.setupEventListeners();
        
        return this.windowElement;
    }
    
    getWindowHTML() {
        return `
            <div class="orkg-window-header">
                <h4 class="orkg-window-title">Select Property</h4>
                <div class="orkg-header-actions">
                    <button class="orkg-header-btn orkg-minimize-btn" data-action="minimize" title="Minimize">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/>
                        </svg>
                    </button>
                    <button class="orkg-header-btn orkg-close-btn" data-action="close" title="Close">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M12.854 4.854a.5.5 0 0 0-.708-.708L8 8.293 3.854 4.146a.5.5 0 1 0-.708.708L7.293 9l-4.147 4.146a.5.5 0 0 0 .708.708L8 9.707l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 9l4.147-4.146z"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="orkg-window-body">
                <div class="orkg-section orkg-text-preview-section">
                    <span class="orkg-preview-label">Selected text:</span>
                    <span class="orkg-text-preview"></span>
                </div>
                
                <div class="orkg-section orkg-search-section">
                    <div class="orkg-search-container">
                        <input type="text" 
                               class="orkg-search-input" 
                               placeholder="Search ORKG properties..."
                               autocomplete="off">
                        <div class="orkg-search-loading orkg-hidden">
                            <div class="orkg-spinner"></div>
                        </div>
                    </div>
                </div>
                
                <div class="orkg-section orkg-ai-section">
                    <h5 class="orkg-section-title orkg-ai-title">
                        <svg class="orkg-section-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M9.5 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 2.5v2A1.5 1.5 0 0 0 6.5 6h3A1.5 1.5 0 0 0 11 4.5v-2A1.5 1.5 0 0 0 9.5 1h-3z"/>
                        </svg>
                        AI Suggestions
                        <span class="orkg-badge orkg-ai-badge orkg-hidden">0</span>
                    </h5>
                    <div class="orkg-suggestions-loading orkg-hidden">
                        <div class="orkg-spinner"></div>
                        <span class="orkg-loading-text">Analyzing text...</span>
                    </div>
                    <div class="orkg-tags-container orkg-suggestion-list"></div>
                    <div class="orkg-no-suggestions orkg-hidden">
                        <span>No AI suggestions available</span>
                    </div>
                </div>
                
                <div class="orkg-section orkg-properties-section">
                    <h5 class="orkg-section-title orkg-properties-title">
                        <svg class="orkg-section-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M12.643 15C13.979 15 15 13.845 15 12.5V5H1v7.5C1 13.845 2.021 15 3.357 15h9.286zM5.5 7h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zM5.5 9h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zM5.5 11h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1z"/>
                        </svg>
                        ORKG Properties
                        <span class="orkg-badge orkg-property-badge orkg-hidden">0</span>
                    </h5>
                    <div class="orkg-update-indicator">Properties updated!</div>
                    <div class="orkg-properties-loading orkg-hidden">
                        <div class="orkg-spinner"></div>
                        <span class="orkg-loading-text">Searching properties...</span>
                    </div>
                    <div class="orkg-item-list orkg-property-list"></div>
                    <div class="orkg-no-properties orkg-hidden">
                        <span>No properties found</span>
                    </div>
                </div>
                
                <div class="orkg-section orkg-color-section">
                    <h5 class="orkg-section-title orkg-color-title">
                        <svg class="orkg-section-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M7.657 6.247c.11-.33.576-.33.686 0l1.316 3.942a.5.5 0 0 0 .474.342h4.146c.347 0 .491.459.212.67l-3.354 2.438a.5.5 0 0 0-.182.54l1.316 3.942c.11.33-.276.6-.54.41l-3.354-2.438a.5.5 0 0 0-.588 0l-3.354 2.438c-.264.19-.65-.08-.54-.41l1.316-3.942a.5.5 0 0 0-.182-.54L1.615 11.2c-.28-.211-.135-.67.212-.67h4.146a.5.5 0 0 0 .474-.342L7.657 6.247z"/>
                        </svg>
                        Highlight Color
                    </h5>
                    <div class="orkg-color-options">
                        <button class="orkg-btn orkg-random-color-btn" data-action="random-color">
                            <svg class="orkg-btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                                <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                            </svg>
                            <span>Random Color</span>
                        </button>
                        <input type="color" class="orkg-color-picker" value="#FFE4B5">
                    </div>
                    <div class="orkg-color-preview">
                        <span class="orkg-preview-label">Preview:</span>
                        <span class="orkg-preview-highlight"></span>
                    </div>
                </div>
            </div>
            
            <div class="orkg-action-buttons">
                <button class="orkg-btn orkg-btn-cancel" data-action="cancel">Cancel</button>
                <button class="orkg-btn orkg-btn-confirm" data-action="confirm" disabled>Select Property First</button>
            </div>
        `;
    }
    
    setupEventListeners() {
        if (!this.windowElement) return;
        
        // Prevent all events from bubbling up
        this.windowElement.addEventListener('mousedown', (e) => e.stopPropagation());
        this.windowElement.addEventListener('mouseup', (e) => e.stopPropagation());
        this.windowElement.addEventListener('click', (e) => e.stopPropagation());
        
        // Search input
        const searchInput = this.windowElement.querySelector('.orkg-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearchInput.bind(this));
            searchInput.addEventListener('focus', () => {
                this.isUserInteracting = true;
            });
        }
        
        // Window mouse tracking
        this.windowElement.addEventListener('mouseenter', () => {
            this.isUserInteracting = true;
        });
        
        this.windowElement.addEventListener('mouseleave', () => {
            this.isUserInteracting = false;
        });
        
        // Action buttons
        this.windowElement.addEventListener('click', this.handleButtonClick.bind(this));
        
        // Color picker
        const colorPicker = this.windowElement.querySelector('.orkg-color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('change', this.handleColorChange.bind(this));
        }
        
        // Make window draggable
        this.makeWindowDraggable();
    }
    
    makeWindowDraggable() {
        const header = this.windowElement.querySelector('.orkg-window-header');
        if (!header) return;
        
        header.addEventListener('mousedown', this.startDragging.bind(this));
    }
    
    startDragging(e) {
        // Don't start drag if clicking on buttons
        if (e.target.closest('button')) return;
        
        this.isDragging = true;
        
        const rect = this.windowElement.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Store window starting position
        this.windowStartX = rect.left;
        this.windowStartY = rect.top;
        
        // Bind drag handlers
        this.dragHandler = this.handleDrag.bind(this);
        this.stopHandler = this.stopDragging.bind(this);
        
        // Add document-level listeners
        document.addEventListener('mousemove', this.dragHandler);
        document.addEventListener('mouseup', this.stopHandler);
        
        // Prevent text selection during drag
        e.preventDefault();
        document.body.style.userSelect = 'none';
    }
    
    handleDrag(e) {
        if (!this.isDragging) return;
        
        let newX = e.clientX - this.dragOffset.x;
        let newY = e.clientY - this.dragOffset.y;
        
        // Keep window within viewport
        const maxX = window.innerWidth - this.windowElement.offsetWidth;
        const maxY = window.innerHeight - this.windowElement.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        this.windowElement.style.left = newX + 'px';
        this.windowElement.style.top = newY + 'px';
    }
    
    stopDragging() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.dragHandler);
        document.removeEventListener('mouseup', this.stopHandler);
        document.body.style.userSelect = '';
    }
    
    handleSearchInput(e) {
        const query = e.target.value.trim();
        
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchORKGPropertiesFromText(query || this.currentSelectedText);
        }, this.SEARCH_DEBOUNCE);
    }
    
    handleButtonClick(e) {
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        switch (action) {
            case 'close':
            case 'cancel':
                this.hide();
                break;
            case 'confirm':
                this.confirmSelection();
                break;
            case 'random-color':
                this.selectRandomColor();
                break;
            case 'minimize':
                this.toggleMinimize();
                break;
        }
    }
    
    handleColorChange(e) {
        this.selectedColor = e.target.value;
        this.updateColorPreview();
        this.updateConfirmButton();
    }
    
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            this.windowElement.classList.add('orkg-window-minimized');
        } else {
            this.windowElement.classList.remove('orkg-window-minimized');
        }
    }
    
    setupEscapeListener() {
        if (this.escapeKeyListener) return;
        
        this.escapeKeyListener = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                e.preventDefault();
                e.stopPropagation();
                this.hide();
            }
        };
        
        document.addEventListener('keydown', this.escapeKeyListener, true);
    }
    
    removeEscapeListener() {
        if (this.escapeKeyListener) {
            document.removeEventListener('keydown', this.escapeKeyListener, true);
            this.escapeKeyListener = null;
        }
    }
    
    async show(selectedText, position) {
        console.log('📌 Showing property window for:', selectedText);
    
        // Save the current selection range IMMEDIATELY
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
            try {
                this.savedRange = selection.getRangeAt(0).cloneRange();
                console.log('✅ Saved selection range:', this.savedRange.toString());
            } catch (e) {
                console.warn('Could not save selection range:', e);
            }
        }
        
        this.currentSelectedText = selectedText;
        this.currentPosition = position;
        this.selectedProperty = null;
        this.selectedColor = this.getRandomColor();
        this.isMinimized = false;
        
        // Reset flags
        this.isUserInteracting = true;
        this.isDragging = false;
        
        if (!this.windowElement) {
            this.createWindow();
        }
        
        // Reset state
        this.clearSelections();
        this.updateSelectedTextPreview();
        this.updateColorPreview();
        
        // Add to DOM if not already
        if (!document.body.contains(this.windowElement)) {
            document.body.appendChild(this.windowElement);
        }
        
        // Remove minimized state
        this.windowElement.classList.remove('orkg-window-minimized');
        
        // Position window
        this.positionWindow(position);
        
        // Setup escape key listener
        this.setupEscapeListener();
        
        // Make visible with a small delay
        setTimeout(() => {
            if (this.windowElement) {
                this.windowElement.classList.add('orkg-window-visible');
                this.isVisible = true;
                
                // Focus search input
                const searchInput = this.windowElement.querySelector('.orkg-search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
        }, 10);
        
        // Setup document click listener for clicking outside
        if (!this.documentClickListener) {
            this.documentClickListener = (e) => {
                // Only hide if clicking outside the window
                if (this.isVisible && this.windowElement && !this.windowElement.contains(e.target) && !this.isDragging) {
                    // Check if the click is on a text selection
                    const selection = window.getSelection();
                    if (selection && selection.toString().trim()) {
                        // Don't hide if there's a new text selection
                        return;
                    }
                    this.hide();
                }
            };
            
            // Add listener after a delay to avoid immediate closing
            setTimeout(() => {
                document.addEventListener('mousedown', this.documentClickListener, true);
            }, 100);
        }
        
        // Load data
        try {
            await Promise.all([
                this.loadAISuggestions(selectedText),
                this.searchORKGPropertiesFromText(selectedText)
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
        
        // Restore selection if needed
        if (this.savedRange && window.getSelection().isCollapsed) {
            try {
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(this.savedRange);
                console.log('✅ Selection restored');
            } catch (e) {
                console.warn('Could not restore selection:', e);
            }
        }
        
        console.log('✅ Property window shown successfully');
    }
    
    hide() {
        if (!this.isVisible) return;
        
        console.log('📌 Hiding property window');
        
        // Clear any timeouts
        clearTimeout(this.searchTimeout);
        
        // Remove visibility class
        if (this.windowElement) {
            this.windowElement.classList.remove('orkg-window-visible');
            this.windowElement.classList.remove('orkg-window-minimized');
        }
        
        this.isVisible = false;
        this.isMinimized = false;
        this.isDragging = false;
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.windowElement && this.windowElement.parentNode) {
                this.windowElement.parentNode.removeChild(this.windowElement);
            }
        }, 300);
        
        // Remove event listeners
        if (this.documentClickListener) {
            document.removeEventListener('mousedown', this.documentClickListener, true);
            this.documentClickListener = null;
        }
        
        this.removeEscapeListener();
        
        // Clear state
        this.currentSelectedText = '';
        this.selectedProperty = null;
        this.selectedColor = null;
        this.isUserInteracting = false;
        
        console.log('✅ Property window hidden');
    }
    
    positionWindow(position) {
        if (!this.windowElement) return;
        
        const rect = {
            x: position.x || 0,
            y: position.y || 0
        };
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let x = rect.x + 10;
        let y = rect.y + 10;
        
        // Ensure window stays within viewport
        if (x + this.WINDOW_WIDTH > viewportWidth) {
            x = viewportWidth - this.WINDOW_WIDTH - 10;
        }
        if (x < 10) {
            x = 10;
        }
        
        if (y + this.WINDOW_HEIGHT > viewportHeight) {
            y = Math.max(10, viewportHeight - this.WINDOW_HEIGHT - 10);
        }
        if (y < 10) {
            y = 10;
        }
        
        this.windowElement.style.left = x + 'px';
        this.windowElement.style.top = y + 'px';
    }
    
    updateSelectedTextPreview() {
        if (!this.windowElement) return;
        
        const previewText = this.windowElement.querySelector('.orkg-text-preview');
        if (previewText) {
            const truncatedText = this.currentSelectedText.length > 60 
                ? this.currentSelectedText.substring(0, 60) + '...'
                : this.currentSelectedText;
            previewText.textContent = truncatedText;
        }
    }
    
    async loadAISuggestions(selectedText) {
        this.isLoadingAI = true;
        const loadingElement = this.windowElement.querySelector('.orkg-suggestions-loading');
        const suggestionsList = this.windowElement.querySelector('.orkg-suggestion-list');
        const noSuggestionsElement = this.windowElement.querySelector('.orkg-no-suggestions');
        const aiBadge = this.windowElement.querySelector('.orkg-ai-badge');
        
        if (loadingElement) loadingElement.classList.remove('orkg-hidden');
        if (suggestionsList) suggestionsList.innerHTML = '';
        if (noSuggestionsElement) noSuggestionsElement.classList.add('orkg-hidden');
        if (aiBadge) aiBadge.classList.add('orkg-hidden');
        
        try {
            const cacheKey = this.generateCacheKey(selectedText);
            if (this.AI_SUGGESTION_CACHE.has(cacheKey)) {
                this.aiSuggestions = this.AI_SUGGESTION_CACHE.get(cacheKey).suggestions;
                this.renderAISuggestions(this.aiSuggestions);
                return;
            }
            
            const response = await this.sendMessageToBackground({
                action: 'GET_PROPERTY_SUGGESTIONS',
                text: selectedText,
                context: {
                    pageTitle: document.title,
                    pageUrl: window.location.href
                }
            });
            
            if (response.success && response.suggestions && response.suggestions.length > 0) {
                this.aiSuggestions = response.suggestions;
                this.AI_SUGGESTION_CACHE.set(cacheKey, {
                    suggestions: this.aiSuggestions,
                    timestamp: Date.now()
                });
                this.renderAISuggestions(this.aiSuggestions);
            } else {
                // Show no suggestions message
                if (noSuggestionsElement) noSuggestionsElement.classList.remove('orkg-hidden');
            }
        } catch (error) {
            console.error('Failed to load AI suggestions:', error);
            if (noSuggestionsElement) noSuggestionsElement.classList.remove('orkg-hidden');
        } finally {
            this.isLoadingAI = false;
            if (loadingElement) loadingElement.classList.add('orkg-hidden');
        }
    }
    
    renderAISuggestions(suggestions) {
        const suggestionsList = this.windowElement.querySelector('.orkg-suggestion-list');
        const noSuggestionsElement = this.windowElement.querySelector('.orkg-no-suggestions');
        const aiBadge = this.windowElement.querySelector('.orkg-ai-badge');
        
        if (!suggestions || suggestions.length === 0) {
            if (noSuggestionsElement) noSuggestionsElement.classList.remove('orkg-hidden');
            if (aiBadge) aiBadge.classList.add('orkg-hidden');
            return;
        }
        
        if (noSuggestionsElement) noSuggestionsElement.classList.add('orkg-hidden');
        
        // Update badge count
        if (aiBadge) {
            aiBadge.textContent = suggestions.length;
            aiBadge.classList.remove('orkg-hidden');
        }
        
        if (suggestionsList) {
            suggestionsList.innerHTML = suggestions.map(suggestion => `
                <div class="orkg-suggestion-tag" 
                     data-property-id="${suggestion.id}"
                     data-property-label="${this.escapeHtml(suggestion.label)}"
                     data-property-description="${this.escapeHtml(suggestion.description || '')}"
                     data-color="${suggestion.color || this.getRandomColor()}"
                     data-confidence="${suggestion.confidence || 0.7}">
                    <span class="orkg-tag-label">${this.escapeHtml(suggestion.label)}</span>
                    <span class="orkg-confidence-badge">
                        ${Math.round((suggestion.confidence || 0.7) * 100)}%
                    </span>
                    <div class="orkg-tag-tooltip">
                        <div class="orkg-tooltip-content">
                            <div class="orkg-tooltip-label">${this.escapeHtml(suggestion.label)}</div>
                            <div class="orkg-tooltip-description">${this.escapeHtml(suggestion.description || 'AI suggested property based on the selected text')}</div>
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Add click handlers to tags
            suggestionsList.querySelectorAll('.orkg-suggestion-tag').forEach(tag => {
                tag.addEventListener('click', () => this.selectSuggestionTag(tag));
            });
        }
    }
    
    selectSuggestionTag(tagElement) {
        // Clear other selections
        this.clearSelections();
        
        // Mark this tag as selected
        tagElement.classList.add('orkg-selected');
        
        // Set selected property
        this.selectedProperty = {
            id: tagElement.dataset.propertyId,
            label: tagElement.dataset.propertyLabel,
            description: tagElement.dataset.propertyDescription,
            source: 'ai_suggestion',
            confidence: parseFloat(tagElement.dataset.confidence || 0.7)
        };
        
        this.selectedColor = tagElement.dataset.color || this.getRandomColor();
        
        // Update color picker to match
        const colorPicker = this.windowElement.querySelector('.orkg-color-picker');
        if (colorPicker) colorPicker.value = this.selectedColor;
        
        this.updateColorPreview();
        this.updateConfirmButton();
    }
    
    async searchORKGPropertiesFromText(text) {
        if (!text || text.trim() === '') {
            return this.loadInitialORKGProperties();
        }
        
        this.isLoadingORKG = true;
        const propertyList = this.windowElement.querySelector('.orkg-property-list');
        const loadingElement = this.windowElement.querySelector('.orkg-properties-loading');
        const noPropertiesElement = this.windowElement.querySelector('.orkg-no-properties');
        const updateIndicator = this.windowElement.querySelector('.orkg-update-indicator');
        const badge = this.windowElement.querySelector('.orkg-property-badge');
        
        if (loadingElement) loadingElement.classList.remove('orkg-hidden');
        if (propertyList) propertyList.innerHTML = '';
        if (noPropertiesElement) noPropertiesElement.classList.add('orkg-hidden');
        if (badge) badge.classList.add('orkg-hidden');
        
        try {
            // Extract keywords from text
            const keywords = this.extractKeywords(text);
            console.log('Extracted keywords:', keywords);
            
            // Search for each keyword
            const allProperties = new Map();
            
            for (const keyword of keywords) {
                const response = await this.sendMessageToBackground({
                    action: 'SEARCH_ORKG_PROPERTIES',
                    query: keyword
                });
                
                if (response.success && response.properties) {
                    response.properties.forEach(prop => {
                        if (!allProperties.has(prop.id)) {
                            allProperties.set(prop.id, prop);
                        }
                    });
                }
            }
            
            this.orkgProperties = Array.from(allProperties.values());
            
            if (this.orkgProperties.length > 0) {
                // Show update indicator
                if (updateIndicator) {
                    updateIndicator.classList.add('orkg-show');
                    setTimeout(() => {
                        updateIndicator.classList.remove('orkg-show');
                    }, 2000);
                }
                
                // Animate list update
                if (propertyList) {
                    propertyList.classList.add('orkg-list-updating');
                    setTimeout(() => {
                        propertyList.classList.remove('orkg-list-updating');
                    }, 500);
                }
                
                this.renderORKGProperties(this.orkgProperties);
            } else {
                if (noPropertiesElement) noPropertiesElement.classList.remove('orkg-hidden');
            }
        } catch (error) {
            console.error('Failed to search ORKG properties:', error);
            if (noPropertiesElement) noPropertiesElement.classList.remove('orkg-hidden');
        } finally {
            this.isLoadingORKG = false;
            if (loadingElement) loadingElement.classList.add('orkg-hidden');
        }
    }
    
    async loadInitialORKGProperties() {
        // Load some default properties
        const response = await this.sendMessageToBackground({
            action: 'SEARCH_ORKG_PROPERTIES',
            query: ''
        });
        
        if (response.success && response.properties) {
            this.orkgProperties = response.properties;
            this.renderORKGProperties(this.orkgProperties);
        }
    }
    
    extractKeywords(text) {
        if (!text || typeof text !== 'string') return [];
        
        // Clean and split text
        const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');
        const words = cleaned.split(/\s+/).filter(word => word.length > 3);
        
        // Remove stop words
        const stopWords = new Set([
            'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
            'were', 'been', 'being', 'have', 'their', 'they', 'them', 'than',
            'when', 'where', 'which', 'while', 'will', 'with', 'would',
            'about', 'after', 'above', 'below', 'between', 'into', 'through'
        ]);
        
        const keywords = words.filter(word => !stopWords.has(word));
        
        // Get unique keywords
        const unique = [...new Set(keywords)];
        
        // Return top 5 keywords
        return unique.slice(0, 5);
    }
    
    renderORKGProperties(properties) {
        const propertyList = this.windowElement.querySelector('.orkg-property-list');
        const badge = this.windowElement.querySelector('.orkg-property-badge');
        const noPropertiesElement = this.windowElement.querySelector('.orkg-no-properties');
        
        if (!properties || properties.length === 0) {
            if (noPropertiesElement) noPropertiesElement.classList.remove('orkg-hidden');
            if (badge) badge.classList.add('orkg-hidden');
            return;
        }
        
        if (noPropertiesElement) noPropertiesElement.classList.add('orkg-hidden');
        
        // Update badge count
        if (badge) {
            badge.textContent = properties.length;
            badge.classList.remove('orkg-hidden');
        }
        
        if (propertyList) {
            propertyList.innerHTML = properties.slice(0, 10).map(property => `
                <button class="orkg-item-btn" 
                        data-action="select-property"
                        data-property-id="${property.id}"
                        data-property-label="${this.escapeHtml(property.label)}"
                        data-property-description="${this.escapeHtml(property.description || '')}">
                    <div class="orkg-item-header">
                        <span class="orkg-item-label">${this.escapeHtml(property.label)}</span>
                        <span class="orkg-item-id">${property.id}</span>
                    </div>
                    <div class="orkg-item-description">
                        ${this.escapeHtml(property.description || 'ORKG property')}
                    </div>
                </button>
            `).join('');
            
            // Add click handlers
            propertyList.querySelectorAll('[data-action="select-property"]').forEach(btn => {
                btn.addEventListener('click', () => this.selectProperty(btn));
            });
        }
    }
    
    selectProperty(element) {
        this.selectedProperty = {
            id: element.dataset.propertyId,
            label: element.dataset.propertyLabel,
            description: element.dataset.propertyDescription,
            source: 'orkg'
        };
        
        this.clearSelections();
        element.classList.add('orkg-selected');
        this.updateConfirmButton();
    }
    
    selectRandomColor() {
        this.selectedColor = this.getRandomColor();
        const colorPicker = this.windowElement.querySelector('.orkg-color-picker');
        if (colorPicker) {
            colorPicker.value = this.selectedColor;
        }
        this.updateColorPreview();
    }
    
    clearSelections() {
        this.windowElement.querySelectorAll('.orkg-selected').forEach(el => {
            el.classList.remove('orkg-selected');
        });
    }
    
    updateColorPreview() {
        const previewHighlight = this.windowElement.querySelector('.orkg-preview-highlight');
        if (!previewHighlight) return;
        
        const truncatedText = this.currentSelectedText.length > 25 
            ? this.currentSelectedText.substring(0, 25) + '...'
            : this.currentSelectedText;
        
        previewHighlight.textContent = truncatedText;
        previewHighlight.style.backgroundColor = this.selectedColor;
        previewHighlight.style.color = this.getContrastColor(this.selectedColor);
    }
    
    updateConfirmButton() {
        const confirmBtn = this.windowElement.querySelector('.orkg-btn-confirm');
        if (!confirmBtn) return;
        
        const canConfirm = this.selectedProperty && this.selectedColor;
        confirmBtn.disabled = !canConfirm;
        
        if (canConfirm) {
            confirmBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" class="orkg-btn-icon">
                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                </svg>
                <span>Highlight with "${this.escapeHtml(this.selectedProperty.label)}"</span>
            `;
        } else {
            confirmBtn.textContent = 'Select Property First';
        }
    }
    
    async confirmSelection() {
        if (!this.selectedProperty || !this.selectedColor) return;
        
        console.log('📌 Confirming selection with property:', this.selectedProperty);
        
        let highlightSuccess = false;
        
        // Check if we're updating an existing highlight
        const existingHighlight = document.querySelector('.orkg-selection-active');
        
        if (existingHighlight) {
            // This is an update operation
            console.log('Updating existing highlight');
            
            existingHighlight.style.backgroundColor = this.selectedColor;
            existingHighlight.dataset.property = JSON.stringify(this.selectedProperty);
            existingHighlight.dataset.propertyLabel = this.selectedProperty.label;
            
            // Update marker metadata
            const markerEl = existingHighlight.querySelector('.orkg-marker');
            if (markerEl && markerEl.dataset.metadata) {
                try {
                    const metadata = JSON.parse(markerEl.dataset.metadata);
                    metadata.property = this.selectedProperty;
                    metadata.color = this.selectedColor;
                    markerEl.dataset.metadata = JSON.stringify(metadata);
                } catch (e) {
                    console.warn('Could not update marker metadata:', e);
                }
            }
            
            highlightSuccess = true;
        } else if (typeof TextHighlighter !== 'undefined') {
            // This is a new highlight
            if (this.savedRange && this.selectedText) {
                // Use the saved range for highlighting
                const result = await TextHighlighter.highlightRange(this.savedRange, {
                    property: this.selectedProperty,
                    color: this.selectedColor,
                    text: this.selectedText,
                    source: 'manual'
                });
                highlightSuccess = !!result;
            } else {
                // Fallback to selection-based highlighting
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && !selection.isCollapsed) {
                    const range = selection.getRangeAt(0);
                    const text = selection.toString();
                    
                    const result = await TextHighlighter.highlightRange(range, {
                        property: this.selectedProperty,
                        color: this.selectedColor,
                        text: text,
                        source: 'manual'
                    });
                    highlightSuccess = !!result;
                }
            }
            
            if (highlightSuccess) {
                console.log('✅ Text highlighted successfully');
            }
        }
        
        // Hide the window if operation succeeded
        if (highlightSuccess) {
            this.hide();
            this.savedRange = null;
            this.selectedText = null;
        } else {
            console.error('❌ Failed to create/update highlight');
            // Keep the window open for retry
        }
    }
        
    getRandomColor() {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    }
    
    getContrastColor(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#333333' : '#ffffff';
    }
    
    generateCacheKey(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    sendMessageToBackground(message) {
        return new Promise((resolve) => {
            // Check if chrome runtime is available and valid
            if (!chrome?.runtime?.id) {
                console.warn('Chrome runtime not available or context invalidated');
                resolve({ success: false, error: 'Runtime not available' });
                return;
            }
            
            try {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError) {
                        const errorMessage = chrome.runtime.lastError.message;
                        
                        // Don't treat context invalidation as a critical error
                        if (errorMessage.includes('context invalidated')) {
                            console.log('Extension context was reset - this is normal during development');
                        } else {
                            console.error('Chrome runtime error:', errorMessage);
                        }
                        
                        resolve({ success: false, error: errorMessage });
                    } else {
                        resolve(response || { success: false });
                    }
                });
            } catch (error) {
                console.warn('Error sending message:', error);
                resolve({ success: false, error: error.message });
            }
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    isWindowVisible() {
        return this.isVisible;
    }
    
    getSelectedText() {
        return this.currentSelectedText;
    }
    
    getSelectedProperty() {
        return this.selectedProperty;
    }
    
    clearCache() {
        this.AI_SUGGESTION_CACHE.clear();
    }
}

const propertyWindow = new PropertyWindow();
if (typeof serviceRegistry !== 'undefined') {
    serviceRegistry.register('propertyWindow', propertyWindow);
}
if (typeof module !== 'undefined' && module.exports) {
    
}

(function() {
    'use strict';
    
    // Multiple export methods for compatibility
    if (typeof propertyWindow !== 'undefined') {
        // Export the instance
        window.propertyWindow = propertyWindow;
        window.PropertyWindow = propertyWindow.constructor || PropertyWindow;
        
        // Also expose on global
        if (typeof global !== 'undefined') {
            global.propertyWindow = propertyWindow;
            global.PropertyWindow = propertyWindow.constructor || PropertyWindow;
        }
        
        console.log('✅ PropertyWindow exported to window');
    } else if (typeof PropertyWindow !== 'undefined') {
        // Export the class
        window.PropertyWindow = PropertyWindow;
        
        // Create and export instance
        window.propertyWindow = new PropertyWindow();
        
        if (typeof global !== 'undefined') {
            global.PropertyWindow = PropertyWindow;
            global.propertyWindow = window.propertyWindow;
        }
        
        console.log('✅ PropertyWindow class and instance exported');
    }
    
    // Register with service registry if available
    if (window.serviceRegistry && window.propertyWindow) {
        window.serviceRegistry.register('propertyWindow', window.propertyWindow);
        window.serviceRegistry.register('PropertyWindow', window.PropertyWindow || window.propertyWindow.constructor);
    }
})();
    } catch (error) {
      console.error('[ui/PropertyWindow.js] Error:', error);
    }
  })();

  // ===== Module: ui/OverlayManager.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/ui/OverlayManager.js
// RAG analysis progress overlay with log display - FIXED
// ================================

(function(global) {
    'use strict';
    
    // Check if already exists
    if (global.OverlayManager) {
        console.log('📊 OverlayManager already exists, skipping creation');
        return;
    }
    
    /**
     * Manages loading overlay for RAG analysis progress
     * Displays phases, progress, logs, and animations
     */
    class OverlayManager {
        constructor() {
            // State
            this.overlay = null;
            this.logsContainer = null;
            this.logs = [];
            this.maxLogs = 100;
            this.maxDisplayLogs = 10;
            this.startTime = null;
            this.elapsedInterval = null;
            this.currentTheme = this.detectTheme();
            this.isShowing = false;
            this.isInitialized = false;
            
            // ORKG Brand colors
            this.ORKG_RED = '#FF6B6B';
            this.ORKG_RED_DARK = '#E85555';
            this.ORKG_RED_LIGHT = '#FF8585';
            
            // Progress elements
            this.progressBar = null;
            this.progressText = null;
            this.phaseText = null;
            this.elapsedDisplay = null;
            this.logCountDisplay = null;
            
            // Performance optimization
            this.renderQueue = [];
            this.renderTimeout = null;
            this.renderBatchSize = 5;
        }
        
        /**
         * Initialize the overlay manager
         */
        async init() {
            if (this.isInitialized) {
                return this;
            }
            
            console.log('🚀 Initializing OverlayManager...');
            this.isInitialized = true;
            return this;
        }
        
        /**
         * Detect color theme from system preference
         */
        detectTheme() {
            const docTheme = document.documentElement.getAttribute('data-theme');
            if (docTheme) return docTheme;
            
            try {
                const storedTheme = localStorage.getItem('orkg-annotator-theme');
                if (storedTheme) return storedTheme;
            } catch (e) {
                // Ignore localStorage errors
            }
            
            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            return isDark ? 'dark' : 'light';
        }
        
        /**
         * Show overlay with initial state
         * FIXED: Removed checks that prevented showing
         */
        async show() {
            // If already showing, just ensure it's visible
            if (this.isShowing && this.overlay) {
                this.overlay.style.display = 'flex';
                this.overlay.style.opacity = '1';
                console.log('📊 Overlay already showing, ensuring visibility');
                return true;
            }
            
            // Remove any existing overlay first
            this.cleanup();
            
            console.log('📊 Creating and showing RAG overlay...');
            
            this.overlay = this.createOverlay();
            document.body.appendChild(this.overlay);
            
            // Store and modify body overflow
            document.body.dataset.originalOverflow = document.body.style.overflow || '';
            document.body.style.overflow = 'hidden';
            
            // Start timers
            this.startTime = Date.now();
            this.startElapsedTimer();
            
            // Add initial log
            this.addLog('Initializing RAG analysis...', 'info');
            
            this.isShowing = true;
            
            console.log('✅ RAG overlay shown');
            return true;
        }
        
        /**
         * Hide and clean up overlay
         */
        async hide() {
            if (!this.overlay) return;
            
            console.log('📊 Hiding RAG overlay...');
            
            // Stop timers
            this.stopElapsedTimer();
            
            // Clear render queue
            if (this.renderTimeout) {
                cancelAnimationFrame(this.renderTimeout);
                this.renderTimeout = null;
            }
            
            // Fade out animation
            this.overlay.style.opacity = '0';
            
            setTimeout(() => {
                this.cleanup();
                console.log('✅ RAG overlay hidden');
            }, 300);
        }
        
        /**
         * Cleanup overlay resources
         */
        cleanup() {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            
            this.overlay = null;
            this.logsContainer = null;
            this.logs = [];
            this.renderQueue = [];
            this.isShowing = false;
            
            // Reset references
            this.progressBar = null;
            this.progressText = null;
            this.phaseText = null;
            this.elapsedDisplay = null;
            this.logCountDisplay = null;
            
            // Restore body overflow
            if (document.body.dataset.originalOverflow !== undefined) {
                document.body.style.overflow = document.body.dataset.originalOverflow;
                delete document.body.dataset.originalOverflow;
            }
            
            // Stop timers
            this.stopElapsedTimer();
            
            if (this.renderTimeout) {
                cancelAnimationFrame(this.renderTimeout);
                this.renderTimeout = null;
            }
        }
        
        /**
         * Update progress, phase, and add a log message
         */
        async update(progress, phase, message) {
            return this.updateProgress(progress, phase, message);
        }
        
        /**
         * Update progress, phase, and add a log message
         */
        updateProgress(progress, phase, message) {
            if (!this.overlay) {
                console.warn('⚠️ Overlay not showing, cannot update progress');
                return;
            }
            
            // Ensure progress is a number
            progress = Math.max(0, Math.min(100, parseInt(progress) || 0));
            
            // Update progress bar
            if (this.progressBar) {
                this.progressBar.style.width = `${progress}%`;
            }
            
            // Update progress text
            if (this.progressText) {
                this.progressText.textContent = `${progress}%`;
            }
            
            // Update phase text
            if (this.phaseText && phase) {
                this.phaseText.textContent = this.formatPhase(phase);
            }
            
            // Add log message if provided
            if (message) {
                const logType = this.determineLogType(message);
                this.addLog(message, logType);
            }
        }
        
        /**
         * Format phase name for display
         */
        formatPhase(phase) {
            const phaseMap = {
                'initializing': 'Initializing...',
                'injecting': 'Preparing extraction...',
                'extracting': 'Extracting sections...',
                'analyzing': 'Analyzing with AI...',
                'processing': 'Processing results...',
                'highlighting': 'Preparing highlights...',
                'applying': 'Applying to page...',
                'complete': 'Complete!'
            };
            
            return phaseMap[phase] || phase;
        }
        
        /**
         * Determine log type based on message content
         */
        determineLogType(message) {
            if (!message) return 'info';
            
            const msg = message.toLowerCase();
            
            if (msg.includes('error') || msg.includes('failed') || msg.includes('❌')) return 'error';
            if (msg.includes('warning') || msg.includes('⚠️')) return 'warning';
            if (msg.includes('success') || msg.includes('complete') || msg.includes('✅')) return 'success';
            if (msg.includes('found') || msg.includes('extracted')) return 'success';
            if (msg.includes('batch') || msg.includes('processing batch')) return 'batch';
            if (msg.includes('analyzing property')) return 'property';
            if (msg.includes('embedding') || msg.includes('🧠')) return 'embedding';
            if (msg.includes('openai') || msg.includes('gpt')) return 'ai';
            
            return 'info';
        }
        
        /**
         * Create main overlay container
         */
        createOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'rag-loading-overlay';
            
            overlay.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.85) !important;
                backdrop-filter: blur(4px) !important;
                z-index: 2147483647 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                animation: fadeIn 0.3s ease !important;
                transition: opacity 0.3s ease !important;
            `;
            
            const content = this.createOverlayContent();
            overlay.appendChild(content);
            
            // Add animation styles
            this.injectStyles();
            
            return overlay;
        }
        
        /**
         * Create overlay content
         */
        createOverlayContent() {
            const isDark = this.currentTheme === 'dark';
            
            const content = document.createElement('div');
            content.style.cssText = `
                background: ${isDark ? '#1f2937' : 'white'} !important;
                border-radius: 16px !important;
                padding: 0 !important;
                max-width: 600px !important;
                width: 90% !important;
                max-height: 80vh !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
            `;
            
            // Header section
            const header = this.createHeader();
            content.appendChild(header);
            
            // Stats section
            const stats = this.createStatsSection();
            content.appendChild(stats);
            
            // Progress section
            const progressSection = this.createProgressSection();
            content.appendChild(progressSection);
            
            // Logs section
            const logsSection = this.createLogsSection();
            content.appendChild(logsSection);
            
            // Close button
            const closeBtn = this.createCloseButton();
            content.appendChild(closeBtn);
            
            return content;
        }
        
        /**
         * Create close button
         */
        createCloseButton() {
            const isDark = this.currentTheme === 'dark';
            
            const button = document.createElement('button');
            button.style.cssText = `
                position: absolute !important;
                top: 16px !important;
                right: 16px !important;
                width: 32px !important;
                height: 32px !important;
                border-radius: 50% !important;
                background: ${isDark ? '#374151' : '#e5e7eb'} !important;
                border: none !important;
                color: ${isDark ? '#9ca3af' : '#6b7280'} !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 16px !important;
                transition: all 0.2s !important;
                z-index: 10 !important;
            `;
            
            button.innerHTML = '✕';
            button.title = 'Close overlay';
            
            button.addEventListener('click', () => {
                this.hide();
            });
            
            button.addEventListener('mouseenter', () => {
                button.style.background = this.ORKG_RED;
                button.style.color = 'white';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.background = isDark ? '#374151' : '#e5e7eb';
                button.style.color = isDark ? '#9ca3af' : '#6b7280';
            });
            
            return button;
        }
        
        /**
         * Create header section
         */
        createHeader() {
            const isDark = this.currentTheme === 'dark';
            
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 24px 24px 16px !important;
                background: ${isDark ? '#111827' : '#f9fafb'} !important;
                border-bottom: 1px solid ${isDark ? '#374151' : '#e5e7eb'} !important;
            `;
            
            header.innerHTML = `
            <div style="display: flex; align-items: start; gap: 16px;">
                <img 
                    src="${typeof chrome !== 'undefined' && chrome.runtime 
                        ? chrome.runtime.getURL('assets/icons/icon128.png') 
                        : ''}" 
                    alt="ORKG Annotator Logo" 
                    class="about-logo-img" 
                    style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;" 
                />
                <div style="flex: 1; padding-right: 32px;">
                    <h2 style="
                        margin: 0 0 4px 0;
                        font-size: 20px;
                        font-weight: 600;
                        color: ${isDark ? '#f3f4f6' : '#111827'};
                    ">
                        <span style="color: ${this.ORKG_RED};">ORKG</span> Paper Analysis
                    </h2>
                    <p style="
                        margin: 0;
                        font-size: 14px;
                        color: ${isDark ? '#9ca3af' : '#6b7280'};
                    ">
                        Extracting property values using AI
                    </p>
                </div>
            </div>
        `;
            
            return header;
        }
        
        /**
         * Create stats section
         */
        createStatsSection() {
            const isDark = this.currentTheme === 'dark';
            
            const stats = document.createElement('div');
            stats.style.cssText = `
                display: flex !important;
                gap: 24px !important;
                padding: 12px 24px !important;
                background: ${isDark ? '#1f2937' : 'white'} !important;
                border-bottom: 1px solid ${isDark ? '#374151' : '#e5e7eb'} !important;
                font-size: 13px !important;
                color: ${isDark ? '#9ca3af' : '#6b7280'} !important;
            `;
            
            stats.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="${this.ORKG_RED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span id="elapsed-time">00:00</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="${this.ORKG_RED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span><span id="log-count">0</span> logs</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="${this.ORKG_RED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span id="phase-text" style="color: ${this.ORKG_RED}; font-weight: 500;">Initializing...</span>
                </div>
            `;
            
            this.elapsedDisplay = stats.querySelector('#elapsed-time');
            this.logCountDisplay = stats.querySelector('#log-count');
            this.phaseText = stats.querySelector('#phase-text');
            
            return stats;
        }
        
        /**
         * Create progress section
         */
        createProgressSection() {
            const isDark = this.currentTheme === 'dark';
            
            const container = document.createElement('div');
            container.style.cssText = `
                padding: 16px 24px !important;
                background: ${isDark ? '#1f2937' : 'white'} !important;
                border-bottom: 1px solid ${isDark ? '#374151' : '#e5e7eb'} !important;
            `;
            
            container.innerHTML = `
                <div style="
                    background: ${isDark ? '#374151' : '#e5e7eb'};
                    border-radius: 6px;
                    height: 8px;
                    overflow: hidden;
                    position: relative;
                ">
                    <div id="progress-bar" style="
                        background: linear-gradient(90deg, ${this.ORKG_RED}, ${this.ORKG_RED_DARK});
                        height: 100%;
                        width: 0%;
                        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        border-radius: 6px;
                        position: relative;
                        overflow: hidden;
                    ">
                        <div style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                            animation: shimmer 2s infinite;
                        "></div>
                    </div>
                </div>
                <div style="
                    margin-top: 8px;
                    font-size: 12px;
                    color: ${isDark ? '#9ca3af' : '#6b7280'};
                    font-weight: 500;
                ">
                    <span id="progress-text" style="color: ${this.ORKG_RED}; font-weight: 600;">0%</span>
                    <span> complete</span>
                </div>
            `;
            
            this.progressBar = container.querySelector('#progress-bar');
            this.progressText = container.querySelector('#progress-text');
            
            return container;
        }
        
        /**
         * Create logs section
         */
        createLogsSection() {
            const isDark = this.currentTheme === 'dark';
            
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                flex: 1 !important;
                background: ${isDark ? '#111827' : '#f9fafb'} !important;
                padding: 16px !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                min-height: 200px !important;
            `;
            
            wrapper.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    color: ${isDark ? '#9ca3af' : '#6b7280'};
                    font-size: 12px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                ">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M8 9h8M8 13h6m-7 8h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="${this.ORKG_RED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>Analysis Logs</span>
                </div>
                <div id="logs-container" style="
                    flex: 1;
                    overflow-y: auto;
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.6;
                    color: ${isDark ? '#d1d5db' : '#4b5563'};
                    padding-right: 8px;
                "></div>
            `;
            
            this.logsContainer = wrapper.querySelector('#logs-container');
            
            return wrapper;
        }
        
        /**
         * Add a log message to the display
         */
        addLog(message, type = 'info') {
            const log = {
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                message: this.cleanMessage(message),
                type
            };
            
            this.logs.push(log);
            
            // Limit logs in memory
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(-this.maxLogs);
            }
            
            // Queue for rendering
            this.queueLogForRendering(log);
            
            // Update count
            this.updateLogCount();
        }
        
        /**
         * Clean message text for display
         */
        cleanMessage(message) {
            return message
                .replace(/[✅⚠️❌🔍📊🧠⏳🚀📨📋🤖🔬]/g, '')
                .trim();
        }
        
        /**
         * Queue log for rendering with performance optimization
         */
        queueLogForRendering(log) {
            this.renderQueue.push(log);
            
            if (!this.renderTimeout) {
                this.renderTimeout = requestAnimationFrame(() => {
                    this.renderQueuedLogs();
                });
            }
        }
        
        /**
         * Render queued logs with batching for performance
         */
        renderQueuedLogs() {
            if (!this.logsContainer || this.renderQueue.length === 0) {
                this.renderTimeout = null;
                return;
            }
            
            const isDark = this.currentTheme === 'dark';
            const fragment = document.createDocumentFragment();
            const logsToRender = this.renderQueue.splice(0, this.renderBatchSize);
            
            logsToRender.forEach(log => {
                const entry = document.createElement('div');
                entry.style.cssText = `
                    display: flex !important;
                    align-items: flex-start !important;
                    gap: 10px !important;
                    padding: 6px 0 !important;
                    border-bottom: 1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)'} !important;
                    animation: logFadeIn 0.3s ease !important;
                `;
                
                // Timestamp
                const timestamp = document.createElement('span');
                timestamp.style.cssText = `
                    color: ${isDark ? '#6b7280' : '#9ca3af'} !important;
                    font-size: 11px !important;
                    min-width: 65px !important;
                    opacity: 0.7 !important;
                `;
                timestamp.textContent = log.timestamp.toLocaleTimeString();
                
                // Icon
                const icon = document.createElement('span');
                icon.style.cssText = 'min-width: 16px !important; text-align: center !important;';
                icon.innerHTML = this.getLogIcon(log.type);
                
                // Message
                const message = document.createElement('span');
                message.style.cssText = `
                    flex: 1 !important;
                    color: ${this.getLogColor(log.type, isDark)} !important;
                    line-height: 1.4 !important;
                    word-break: break-word !important;
                `;
                message.textContent = log.message;
                
                entry.appendChild(timestamp);
                entry.appendChild(icon);
                entry.appendChild(message);
                
                fragment.appendChild(entry);
            });
            
            this.logsContainer.appendChild(fragment);
            
            // Remove old entries to maintain performance
            while (this.logsContainer.children.length > this.maxDisplayLogs) {
                this.logsContainer.removeChild(this.logsContainer.firstChild);
            }
            
            // Auto-scroll to bottom
            this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
            
            // Continue rendering if more in queue
            if (this.renderQueue.length > 0) {
                this.renderTimeout = requestAnimationFrame(() => {
                    this.renderQueuedLogs();
                });
            } else {
                this.renderTimeout = null;
            }
        }
        
        /**
         * Get icon HTML for log type
         */
        getLogIcon(type) {
            const icons = {
                'info': `<svg width="14" height="14" viewBox="0 0 24 24" fill="${this.ORKG_RED}"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 16v-4m0-4h.01" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
                'success': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="none" fill="currentColor"/></svg>',
                'warning': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="none" fill="currentColor"/></svg>',
                'error': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="none" fill="currentColor"/></svg>',
                'batch': `<svg width="14" height="14" viewBox="0 0 24 24" fill="${this.ORKG_RED}"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" stroke="none" fill="currentColor"/></svg>`,
                'property': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#8b5cf6"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" stroke="none" fill="currentColor"/></svg>',
                'embedding': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#8b5cf6"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="none" fill="currentColor"/></svg>',
                'ai': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z" stroke="none" fill="currentColor"/></svg>'
            };
            return icons[type] || icons.info;
        }
        
        /**
         * Get color for log type
         */
        getLogColor(type, isDark) {
            const colors = {
                'info': this.ORKG_RED,
                'success': isDark ? '#86efac' : '#16a34a',
                'warning': isDark ? '#fde047' : '#ca8a04',
                'error': isDark ? '#fca5a5' : '#dc2626',
                'batch': this.ORKG_RED_LIGHT,
                'property': isDark ? '#c4b5fd' : '#7c3aed',
                'embedding': isDark ? '#c4b5fd' : '#7c3aed',
                'ai': isDark ? '#93c5fd' : '#3b82f6'
            };
            return colors[type] || (isDark ? '#d1d5db' : '#4b5563');
        }
        
        /**
         * Update log count display
         */
        updateLogCount() {
            if (this.logCountDisplay) {
                this.logCountDisplay.textContent = this.logs.length;
            }
        }
        
        /**
         * Start elapsed time timer
         */
        startElapsedTimer() {
            this.elapsedInterval = setInterval(() => {
                if (!this.startTime || !this.elapsedDisplay) return;
                
                const elapsed = Date.now() - this.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                this.elapsedDisplay.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        }
        
        /**
         * Stop elapsed time timer
         */
        stopElapsedTimer() {
            if (this.elapsedInterval) {
                clearInterval(this.elapsedInterval);
                this.elapsedInterval = null;
            }
        }
        
        /**
         * Inject CSS styles for animations
         */
        injectStyles() {
            if (document.getElementById('rag-overlay-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'rag-overlay-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes logFadeIn {
                    from {
                        opacity: 0;
                        transform: translateX(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                #rag-loading-overlay * {
                    box-sizing: border-box !important;
                }
                
                #rag-loading-overlay *::-webkit-scrollbar {
                    width: 6px !important;
                }
                
                #rag-loading-overlay *::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1) !important;
                    border-radius: 3px !important;
                }
                
                #rag-loading-overlay *::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.2) !important;
                    border-radius: 3px !important;
                }
                
                #rag-loading-overlay *::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.3) !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        /**
         * Check if overlay is ready
         */
        isReady() {
            return this.isInitialized;
        }
        
        /**
         * Get status
         */
        getStatus() {
            return {
                isInitialized: this.isInitialized,
                isShowing: this.isShowing,
                hasOverlay: !!this.overlay,
                logCount: this.logs.length
            };
        }
    }
    
    // Create singleton instance
    const overlayManager = new OverlayManager();
    
    // Export to global scope
    global.OverlayManager = OverlayManager;
    global.overlayManager = overlayManager;
    
    console.log('📢 OverlayManager exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[ui/OverlayManager.js] Error:', error);
    }
  })();

  // ===== Module: ui/RAGLogger.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/RAGAnalysisLogger.js
// ORKG-styled Analysis Logger
// ================================

(function(global) {
    'use strict';
    
    /**
     * RAG Analysis Logger
     * 
     * Displays real-time logs for RAG analysis with ORKG styling
     * Matches the style of ProblemAnalysisLogger but specifically for RAG
     */
    class RAGAnalysisLogger {
        constructor() {
            this.container = null;
            this.logsContainer = null;
            this.logs = [];
            this.maxLogs = 200;
            this.maxDisplayLogs = 50;
            this.isPaused = false;
            this.autoScroll = true;
            this.isHidden = false;
            this.startTime = null;
            this.elapsedInterval = null;
            
            // Performance optimization
            this.renderQueue = [];
            this.renderTimeout = null;
            this.batchSize = 10;
            
            // ORKG Brand colors
            this.ORKG_RED = '#FF6B6B';
            this.ORKG_RED_DARK = '#E85555';
            this.ORKG_RED_LIGHT = '#FF8585';
            
            // Theme detection
            this.currentTheme = this.detectTheme();
        }
        
        /**
         * Detect theme from document or system preference
         */
        detectTheme() {
            // Try to get theme from document
            const docTheme = document.documentElement.getAttribute('data-theme');
            if (docTheme) return docTheme;
            
            // Try to get theme from localStorage
            try {
                const storedTheme = localStorage.getItem('orkg-annotator-theme');
                if (storedTheme) return storedTheme;
            } catch (e) {
                // Ignore localStorage errors
            }
            
            // Fall back to media query
            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            return isDark ? 'dark' : 'light';
        }
        
        /**
         * Render the logger UI
         */
        render() {
            const themeClass = `logger-theme-${this.currentTheme}`;
            const hiddenClass = this.isHidden ? 'logger-hidden' : '';
            
            const html = `
                <div class="rag-analysis-logger ${themeClass} ${hiddenClass}" data-theme="${this.currentTheme}">
                    <div class="logger-header">
                        <div class="logger-title">
                            <i class="fas fa-terminal" style="color: ${this.ORKG_RED};"></i>
                            <h4>RAG Analysis Progress</h4>
                        </div>
                        <div class="logger-controls">
                            <button class="logger-btn" id="clear-rag-logs-btn" title="Clear logs">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="logger-btn" id="pause-rag-logs-btn" title="Pause/Resume">
                                <i class="fas ${this.isPaused ? 'fa-play' : 'fa-pause'}"></i>
                            </button>
                            <button class="logger-btn ${this.autoScroll ? 'active' : ''}" id="auto-scroll-rag-btn" title="Auto-scroll">
                                <i class="fas fa-arrow-down"></i>
                            </button>
                            <button class="logger-btn" id="hide-rag-logs-btn" title="Hide/Show Logger">
                                <i class="fas ${this.isHidden ? 'fa-eye' : 'fa-eye-slash'}"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="logger-stats">
                        <div class="stat-item">
                            <i class="fas fa-clock" style="color: ${this.ORKG_RED};"></i>
                            <span id="rag-elapsed-time">00:00</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-list" style="color: ${this.ORKG_RED};"></i>
                            <span id="rag-log-count">${this.logs.length}</span> entries
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-memory" style="color: ${this.ORKG_RED};"></i>
                            <span id="rag-log-performance">Smooth</span>
                        </div>
                    </div>
                    
                    <div class="logs-container ${this.isHidden ? 'hidden' : ''}" id="rag-analysis-logs">
                        ${this.logs.length > 0 ? this.renderInitialLogs() : this.renderWaitingMessage()}
                    </div>
                    
                    ${this.isHidden ? `
                        <div class="logger-minimized-indicator">
                            <i class="fas fa-terminal" style="color: ${this.ORKG_RED};"></i>
                            <span>Logger minimized - ${this.logs.length} entries</span>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Inject necessary styles
            this.injectStyles();
            
            return html;
        }
        
        /**
         * Inject necessary styles for the logger
         */
        injectStyles() {
            if (document.getElementById('rag-logger-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'rag-logger-styles';
            
            // Match the styles from ProblemAnalysisLogger with ORKG red color
            style.textContent = `
                .rag-analysis-logger {
                    display: flex;
                    flex-direction: column;
                    background: ${this.currentTheme === 'dark' ? '#1f2937' : '#ffffff'};
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    margin-bottom: 16px;
                }
                
                .rag-analysis-logger .logger-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 15px;
                    background: ${this.currentTheme === 'dark' ? '#111827' : '#f9fafb'};
                    border-bottom: 1px solid ${this.currentTheme === 'dark' ? '#374151' : '#e5e7eb'};
                }
                
                .rag-analysis-logger .logger-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .rag-analysis-logger .logger-title h4 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: ${this.currentTheme === 'dark' ? '#f3f4f6' : '#111827'};
                }
                
                .rag-analysis-logger .logger-controls {
                    display: flex;
                    gap: 8px;
                }
                
                .rag-analysis-logger .logger-btn {
                    background: transparent;
                    border: none;
                    color: ${this.currentTheme === 'dark' ? '#9ca3af' : '#6b7280'};
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                }
                
                .rag-analysis-logger .logger-btn:hover {
                    background: ${this.currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
                }
                
                .rag-analysis-logger .logger-btn.active {
                    color: ${this.ORKG_RED};
                }
                
                .rag-analysis-logger .logger-stats {
                    display: flex;
                    gap: 16px;
                    padding: 8px 15px;
                    background: ${this.currentTheme === 'dark' ? '#1f2937' : 'white'};
                    border-bottom: 1px solid ${this.currentTheme === 'dark' ? '#374151' : '#e5e7eb'};
                    font-size: 12px;
                    color: ${this.currentTheme === 'dark' ? '#9ca3af' : '#6b7280'};
                }
                
                .rag-analysis-logger .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .rag-analysis-logger .logs-container {
                    max-height: 300px;
                    overflow-y: auto;
                    padding: 8px 0;
                    background: ${this.currentTheme === 'dark' ? '#111827' : '#f9fafb'};
                    font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.5;
                }
                
                .rag-analysis-logger .logs-container.scrolling::-webkit-scrollbar-thumb {
                    background: ${this.ORKG_RED} !important;
                }
                
                .rag-analysis-logger .logs-container::-webkit-scrollbar {
                    width: 6px;
                }
                
                .rag-analysis-logger .logs-container::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                }
                
                .rag-analysis-logger .logs-container::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 3px;
                }
                
                .rag-analysis-logger .log-entry {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 6px 15px;
                    border-bottom: 1px solid ${this.currentTheme === 'dark' ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)'};
                    animation: logFadeIn 0.3s ease;
                }
                
                .rag-analysis-logger .log-timestamp {
                    color: ${this.currentTheme === 'dark' ? '#6b7280' : '#9ca3af'};
                    font-size: 11px;
                    min-width: 65px;
                    opacity: 0.7;
                }
                
                .rag-analysis-logger .log-icon {
                    min-width: 16px;
                    text-align: center;
                }
                
                .rag-analysis-logger .log-message {
                    flex: 1;
                    line-height: 1.4;
                    word-break: break-word;
                }
                
                .rag-analysis-logger .log-info .log-message {
                    color: ${this.ORKG_RED};
                }
                
                .rag-analysis-logger .log-success .log-message {
                    color: ${this.currentTheme === 'dark' ? '#86efac' : '#16a34a'};
                }
                
                .rag-analysis-logger .log-warning .log-message {
                    color: ${this.currentTheme === 'dark' ? '#fde047' : '#ca8a04'};
                }
                
                .rag-analysis-logger .log-error .log-message {
                    color: ${this.currentTheme === 'dark' ? '#fca5a5' : '#dc2626'};
                }
                
                .rag-analysis-logger .log-batch .log-message {
                    color: ${this.ORKG_RED_LIGHT};
                }
                
                .rag-analysis-logger .log-property .log-message {
                    color: ${this.currentTheme === 'dark' ? '#c4b5fd' : '#7c3aed'};
                }
                
                .rag-analysis-logger .log-matching .log-message {
                    color: ${this.currentTheme === 'dark' ? '#93c5fd' : '#3b82f6'};
                }
                
                .rag-analysis-logger .log-progress {
                    padding: 1px 6px;
                    border-radius: 10px;
                    background: ${this.ORKG_RED};
                    color: white;
                    font-size: 10px;
                    margin-left: 8px;
                }
                
                .rag-analysis-logger .log-similarity {
                    padding: 1px 6px;
                    border-radius: 10px;
                    background: ${this.currentTheme === 'dark' ? '#8b5cf6' : '#a78bfa'};
                    color: white;
                    font-size: 10px;
                    margin-left: 8px;
                }
                
                .rag-analysis-logger .logger-minimized-indicator {
                    padding: 8px 15px;
                    background: ${this.currentTheme === 'dark' ? '#1f2937' : 'white'};
                    border-top: 1px solid ${this.currentTheme === 'dark' ? '#374151' : '#e5e7eb'};
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    color: ${this.currentTheme === 'dark' ? '#9ca3af' : '#6b7280'};
                }
                
                .rag-analysis-logger .log-phase {
                    padding: 2px 8px;
                    border-radius: 12px;
                    background: ${this.ORKG_RED};
                    color: white;
                    font-size: 10px;
                    font-weight: 600;
                    margin-left: 8px;
                }
                
                .rag-analysis-logger .log-entry-animated {
                    animation: logFadeIn 0.3s ease;
                }
                
                @keyframes logFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        /**
         * Attach logger to container element
         */
        attachToContainer(container) {
            if (!container) return;
            
            this.container = container;
            this.logsContainer = container.querySelector('#rag-analysis-logs');
            
            // Update theme if needed
            this.updateTheme();
            
            this.setupEventHandlers();
            this.startElapsedTimer();
            this.setupScrollOptimization();
            
            // Update logs display if we have logs
            if (this.logs.length > 0) {
                this.updateLogDisplay();
            }
        }
        
        /**
         * Update theme based on current document theme
         */
        updateTheme() {
            const newTheme = this.detectTheme();
            if (newTheme !== this.currentTheme) {
                this.currentTheme = newTheme;
                if (this.container) {
                    this.container.className = `rag-analysis-logger logger-theme-${newTheme} ${this.isHidden ? 'logger-hidden' : ''}`;
                    this.container.setAttribute('data-theme', newTheme);
                }
                // Re-inject styles with new theme
                this.injectStyles();
            }
        }
        
        /**
         * Setup scroll optimization with classes for better UX
         */
        setupScrollOptimization() {
            if (!this.logsContainer) return;
            
            let scrollTimeout;
            let isScrolling = false;
            
            this.logsContainer.addEventListener('scroll', () => {
                if (!isScrolling) {
                    isScrolling = true;
                    this.logsContainer.classList.add('scrolling');
                }
                
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    isScrolling = false;
                    this.logsContainer.classList.remove('scrolling');
                    
                    // Check if user scrolled away from bottom
                    const isAtBottom = this.logsContainer.scrollHeight - this.logsContainer.scrollTop 
                                      <= this.logsContainer.clientHeight + 50;
                    
                    if (!isAtBottom && this.autoScroll) {
                        this.autoScroll = false;
                        this.updateAutoScrollButton();
                    }
                }, 150);
            }, { passive: true });
        }
        
        /**
         * Render waiting message when no logs
         */
        renderWaitingMessage() {
            return `
                <div class="log-entry log-info log-entry-animated">
                    <span class="log-timestamp">${new Date().toLocaleTimeString()}</span>
                    <span class="log-icon"><i class="fas fa-hourglass-half fa-spin"></i></span>
                    <span class="log-message">Waiting for RAG analysis to start...</span>
                </div>
            `;
        }
        
        /**
         * Render initial logs (performance optimized)
         */
        renderInitialLogs() {
            // Only render last N logs initially for performance
            const recentLogs = this.logs.slice(-this.maxDisplayLogs);
            return recentLogs.map(log => this.renderLogEntry(log)).join('');
        }
        
        /**
         * Render a single log entry
         */
        renderLogEntry(log) {
            const icon = this.getLogIcon(log.type);
            const typeClass = `log-${log.type}`;
            
            return `
                <div class="log-entry ${typeClass} log-entry-animated" data-log-id="${log.id}">
                    <span class="log-timestamp">${log.timestamp.toLocaleTimeString()}</span>
                    <span class="log-icon">${icon}</span>
                    <span class="log-message">${this.escapeHtml(log.message)}</span>
                    ${log.data ? this.renderLogData(log.data) : ''}
                    ${log.phase ? `<span class="log-phase">${log.phase}</span>` : ''}
                </div>
            `;
        }
        
        /**
         * Render log data with proper formatting
         */
        renderLogData(data) {
            if (data.progress !== undefined) {
                return `<span class="log-progress">${Math.round(data.progress)}%</span>`;
            }
            if (data.similarity !== undefined) {
                return `<span class="log-similarity">${(data.similarity * 100).toFixed(1)}%</span>`;
            }
            if (data.matches !== undefined) {
                return `<span class="log-progress">${data.matches} matches</span>`;
            }
            if (data.properties !== undefined) {
                return `<span class="log-progress">${data.properties} properties</span>`;
            }
            return '';
        }
        
        /**
         * Get icon for log type
         */
        getLogIcon(type) {
            const icons = {
                'info': '<i class="fas fa-info-circle"></i>',
                'success': '<i class="fas fa-check-circle"></i>',
                'warning': '<i class="fas fa-exclamation-triangle"></i>',
                'error': '<i class="fas fa-times-circle"></i>',
                'batch': '<i class="fas fa-layer-group"></i>',
                'property': '<i class="fas fa-tag"></i>',
                'matching': '<i class="fas fa-equals"></i>',
                'rag': '<i class="fas fa-brain"></i>',
                'section': '<i class="fas fa-paragraph"></i>'
            };
            return icons[type] || icons.info;
        }
        
        /**
         * Add a log entry with optional data and phase
         */
        addLog(message, type = 'info', data = null, phase = null) {
            if (this.isPaused) return;
            
            const log = {
                id: `rag_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                message,
                type,
                data,
                phase
            };
            
            this.logs.push(log);
            
            // Limit logs in memory
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(-this.maxLogs);
            }
            
            // Queue for batch rendering (performance optimization)
            this.queueLogForRendering(log);
            
            // Update count
            this.updateLogCount();
            
            // Update performance indicator
            this.updatePerformanceIndicator();
        }
        
        /**
         * Add property matching log with color coding
         */
        addPropertyLog(property, value, confidence) {
            this.addLog(
                `Matched property "${property}": "${value}"`, 
                'property',
                { confidence: confidence },
                'Property Matching'
            );
        }
        
        /**
         * Add section analysis log
         */
        addSectionLog(section, matches) {
            this.addLog(
                `Analyzing section "${section}"`, 
                'section',
                { matches: matches },
                'Section Analysis'
            );
        }
        
        /**
         * Add phase change log
         */
        addPhaseLog(phase, message) {
            this.addLog(
                message, 
                'info',
                null,
                phase
            );
        }
        
        /**
         * Queue log for rendering (performance optimization)
         */
        queueLogForRendering(log) {
            this.renderQueue.push(log);
            
            // Batch render for better performance
            if (!this.renderTimeout) {
                this.renderTimeout = requestAnimationFrame(() => {
                    this.renderQueuedLogs();
                });
            }
        }
        
        /**
         * Render queued logs in batches for performance
         */
        renderQueuedLogs() {
            if (!this.logsContainer || this.renderQueue.length === 0) {
                this.renderTimeout = null;
                return;
            }
            
            // Don't render if hidden
            if (this.isHidden) {
                this.renderQueue = [];
                this.renderTimeout = null;
                return;
            }
            
            // Create document fragment for batch insertion (performance)
            const fragment = document.createDocumentFragment();
            const logsToRender = this.renderQueue.splice(0, this.batchSize);
            
            logsToRender.forEach(log => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.renderLogEntry(log);
                fragment.appendChild(tempDiv.firstElementChild);
            });
            
            this.logsContainer.appendChild(fragment);
            
            // Remove old entries to maintain performance
            while (this.logsContainer.children.length > this.maxDisplayLogs) {
                this.logsContainer.removeChild(this.logsContainer.firstChild);
            }
            
            // Auto-scroll if enabled
            if (this.autoScroll && !this.isHidden) {
                requestAnimationFrame(() => {
                    this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
                });
            }
            
            // Continue rendering if more in queue
            if (this.renderQueue.length > 0) {
                this.renderTimeout = requestAnimationFrame(() => {
                    this.renderQueuedLogs();
                });
            } else {
                this.renderTimeout = null;
            }
        }
        
        /**
         * Update performance indicator based on queue size
         */
        updatePerformanceIndicator() {
            const perfElement = this.container?.querySelector('#rag-log-performance');
            if (!perfElement) return;
            
            const queueSize = this.renderQueue.length;
            let status = 'Smooth';
            let color = this.currentTheme === 'dark' ? '#86efac' : '#16a34a';
            
            if (queueSize > 20) {
                status = 'Heavy';
                color = this.currentTheme === 'dark' ? '#fde047' : '#ca8a04';
            } else if (queueSize > 50) {
                status = 'Lagging';
                color = this.currentTheme === 'dark' ? '#fca5a5' : '#dc2626';
            }
            
            perfElement.textContent = status;
            perfElement.style.color = color;
        }
        
        /**
         * Update log display (full refresh)
         */
        updateLogDisplay() {
            if (!this.logsContainer || this.isHidden) return;
            
            // Clear and re-render for full update
            this.logsContainer.innerHTML = this.renderInitialLogs();
            
            if (this.autoScroll) {
                requestAnimationFrame(() => {
                    this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
                });
            }
        }
        
        /**
         * Update log count in UI
         */
        updateLogCount() {
            const countElement = this.container?.querySelector('#rag-log-count');
            if (countElement) {
                countElement.textContent = this.logs.length;
            }
            
            // Update minimized indicator if hidden
            if (this.isHidden) {
                const indicator = this.container?.querySelector('.logger-minimized-indicator span');
                if (indicator) {
                    indicator.textContent = `Logger minimized - ${this.logs.length} entries`;
                }
            }
        }
        
        /**
         * Update auto-scroll button state
         */
        updateAutoScrollButton() {
            const autoScrollBtn = this.container?.querySelector('#auto-scroll-rag-btn');
            if (autoScrollBtn) {
                autoScrollBtn.classList.toggle('active', this.autoScroll);
            }
        }
        
        /**
         * Setup event handlers for logger controls
         */
        setupEventHandlers() {
            if (!this.container) return;
            
            // Clear logs
            const clearBtn = this.container.querySelector('#clear-rag-logs-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clear());
            }
            
            // Pause/Resume
            const pauseBtn = this.container.querySelector('#pause-rag-logs-btn');
            if (pauseBtn) {
                pauseBtn.addEventListener('click', () => {
                    this.isPaused = !this.isPaused;
                    pauseBtn.innerHTML = this.isPaused 
                        ? '<i class="fas fa-play"></i>' 
                        : '<i class="fas fa-pause"></i>';
                    pauseBtn.classList.toggle('paused', this.isPaused);
                    
                    if (!this.isPaused) {
                        // Resume rendering queued logs
                        this.renderQueuedLogs();
                    }
                });
            }
            
            // Auto-scroll
            const autoScrollBtn = this.container.querySelector('#auto-scroll-rag-btn');
            if (autoScrollBtn) {
                autoScrollBtn.addEventListener('click', () => {
                    this.autoScroll = !this.autoScroll;
                    this.updateAutoScrollButton();
                    
                    if (this.autoScroll && this.logsContainer) {
                        requestAnimationFrame(() => {
                            this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
                        });
                    }
                });
            }
            
            // Hide/Show logger
            const hideBtn = this.container.querySelector('#hide-rag-logs-btn');
            if (hideBtn) {
                hideBtn.addEventListener('click', () => {
                    this.toggleHidden();
                });
            }
            
            // Listen for theme changes
            const observer = new MutationObserver(() => {
                this.updateTheme();
            });
            
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
        }
        
        /**
         * Toggle logger visibility
         */
        toggleHidden() {
            this.isHidden = !this.isHidden;
            
            if (this.container) {
                this.container.classList.toggle('logger-hidden', this.isHidden);
                
                const logsContainer = this.container.querySelector('.logs-container');
                if (logsContainer) {
                    logsContainer.classList.toggle('hidden', this.isHidden);
                }
                
                const hideBtn = this.container.querySelector('#hide-rag-logs-btn');
                if (hideBtn) {
                    hideBtn.innerHTML = this.isHidden 
                        ? '<i class="fas fa-eye"></i>' 
                        : '<i class="fas fa-eye-slash"></i>';
                }
                
                // Update or create minimized indicator
                if (this.isHidden) {
                    if (!this.container.querySelector('.logger-minimized-indicator')) {
                        const indicator = document.createElement('div');
                        indicator.className = 'logger-minimized-indicator';
                        indicator.innerHTML = `
                            <i class="fas fa-terminal" style="color: ${this.ORKG_RED};"></i>
                            <span>Logger minimized - ${this.logs.length} entries</span>
                        `;
                        this.container.appendChild(indicator);
                    }
                } else {
                    const indicator = this.container.querySelector('.logger-minimized-indicator');
                    if (indicator) {
                        indicator.remove();
                    }
                    
                    // Resume rendering if logs were queued while hidden
                    if (this.renderQueue.length > 0) {
                        this.renderQueuedLogs();
                    }
                }
            }
        }
        
        /**
         * Start elapsed timer for analysis
         */
        startElapsedTimer() {
            this.startTime = Date.now();
            
            this.elapsedInterval = setInterval(() => {
                const elapsed = Date.now() - this.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                const elapsedDisplay = this.container?.querySelector('#rag-elapsed-time');
                if (elapsedDisplay) {
                    elapsedDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }, 1000);
        }
        
        /**
         * Stop elapsed timer
         */
        stopElapsedTimer() {
            if (this.elapsedInterval) {
                clearInterval(this.elapsedInterval);
                this.elapsedInterval = null;
            }
        }
        
        /**
         * Clear all logs
         */
        clear() {
            this.logs = [];
            this.renderQueue = [];
            
            if (this.renderTimeout) {
                cancelAnimationFrame(this.renderTimeout);
                this.renderTimeout = null;
            }
            
            if (this.logsContainer) {
                this.logsContainer.innerHTML = this.renderWaitingMessage();
            }
            
            this.updateLogCount();
            this.updatePerformanceIndicator();
        }
        
        /**
         * Safely escape HTML to prevent XSS
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        /**
         * Get logs as JSON (useful for debugging)
         */
        getLogsAsJson() {
            return JSON.stringify(this.logs, null, 2);
        }
        
        /**
         * Add predefined log entries for common RAG phases
         */
        logRagPhaseStart() {
            this.addPhaseLog('RAG Start', 'Starting RAG analysis pipeline');
        }
        
        logRagSectionAnalysis(sectionName, length) {
            this.addLog(
                `Processing section "${sectionName}"`, 
                'section',
                { length: length },
                'Section Analysis'
            );
        }
        
        logRagPropertyMatching(propertyCount) {
            this.addLog(
                `Matching ${propertyCount} template properties against text`, 
                'property',
                { properties: propertyCount },
                'Property Matching'
            );
        }
        
        logRagCompletion(matchCount) {
            this.addLog(
                `RAG analysis completed with ${matchCount} property matches`, 
                'success',
                { matches: matchCount },
                'Analysis Complete'
            );
        }
        
        /**
         * Cleanup resources
         */
        destroy() {
            this.stopElapsedTimer();
            
            if (this.renderTimeout) {
                cancelAnimationFrame(this.renderTimeout);
                this.renderTimeout = null;
            }
            
            this.clear();
            this.container = null;
            this.logsContainer = null;
            
            // Remove injected styles
            const styleElement = document.getElementById('rag-logger-styles');
            if (styleElement) {
                styleElement.remove();
            }
        }
    }
    
    // Export to global scope
    global.RAGAnalysisLogger = RAGAnalysisLogger;
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[ui/RAGLogger.js] Error:', error);
    }
  })();

  // ===== Module: ui/RAGWindowFrame.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// modules/ui/RAGWindowFrame.js - Updated with Dock Feature
// ================================

(function(global) {
  'use strict';
  
  class RAGWindowFrame {
    constructor(container, config = {}) {
      this.container = container;
      
      this.config = {
        minWidth: 320,
        minHeight: 48,
        maxWidth: 600,
        defaultWidth: 380,
        defaultHeight: 500,
        minimizedHeight: 48,
        animationDuration: 300,
        dockOffset: 20,
        ...config
      };
      
      this.state = {
        position: { x: window.innerWidth - 400, y: 20 },
        dimensions: { 
          width: this.config.defaultWidth, 
          height: this.config.defaultHeight 
        },
        isMinimized: true,
        isDocked: false,
        isDragging: false,
        isResizing: false,
        savedPosition: null
      };
      
      this.dragState = {
        offsetX: 0,
        offsetY: 0
      };
      
      this.elements = {
        header: null,
        minimizeBtn: null,
        dockBtn: null,
        closeBtn: null,
        content: null,
        resizeHandle: null
      };
      
      this.handleDragStart = this.handleDragStart.bind(this);
      this.handleDragMove = this.handleDragMove.bind(this);
      this.handleDragEnd = this.handleDragEnd.bind(this);
    }
    
    init() {
      this.findElements();
      this.attachEventListeners();
      this.loadSavedState();
      this.applyState();
      
      // Start minimized and hidden by default
      this.container.style.display = 'none';
      if (!this.state.isMinimized) {
        this.minimize();
      }
      
      return this;
    }
    
    findElements() {
      if (!this.container) {
        throw new Error('RAGWindowFrame: Container not provided');
      }
      
      this.elements.header = this.container.querySelector('.orkg-rag-header');
      this.elements.minimizeBtn = this.container.querySelector('.minimize-btn');
      this.elements.dockBtn = this.container.querySelector('.dock-btn');
      this.elements.closeBtn = this.container.querySelector('.close-btn');
      this.elements.content = this.container.querySelector('.orkg-rag-content');
    }
    
    attachEventListeners() {
      if (this.elements.header) {
        this.elements.header.addEventListener('mousedown', this.handleDragStart);
      }
      
      if (this.elements.minimizeBtn) {
        this.elements.minimizeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleMinimize();
        });
      }
      
      if (this.elements.dockBtn) {
        this.elements.dockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.dock();
        });
      }
      
      if (this.elements.closeBtn) {
        this.elements.closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleClose();
        });
      }
      
      window.addEventListener('resize', () => this.constrainToViewport());
    }
    
    handleDragStart(e) {
      // Ignore if clicking on buttons
      if (e.target.closest('.orkg-rag-btn') || 
          e.target.closest('.orkg-rag-controls')) {
        return;
      }
      
      e.preventDefault();
      
      this.state.isDragging = true;
      this.state.isDocked = false;
      
      // Get current computed position
      const rect = this.container.getBoundingClientRect();
      
      // Store the offset from click point to window corner
      this.dragState.offsetX = e.clientX - rect.left;
      this.dragState.offsetY = e.clientY - rect.top;
      
      // IMPORTANT: Remove 'right' CSS property to allow 'left' to work
      this.container.style.setProperty('right', 'auto', 'important');
      this.container.style.setProperty('bottom', 'auto', 'important');
      
      // Set initial position using left/top
      this.container.style.setProperty('left', rect.left + 'px', 'important');
      this.container.style.setProperty('top', rect.top + 'px', 'important');
      
      this.container.classList.add('dragging');
      
      document.addEventListener('mousemove', this.handleDragMove);
      document.addEventListener('mouseup', this.handleDragEnd);
      
      document.body.style.userSelect = 'none';
    }
    
    handleDragMove(e) {
      if (!this.state.isDragging) return;
      
      e.preventDefault();
      
      // Calculate new position based on mouse position minus initial offset
      let newX = e.clientX - this.dragState.offsetX;
      let newY = e.clientY - this.dragState.offsetY;
      
      // Constrain to viewport
      const windowWidth = this.state.dimensions.width;
      const windowHeight = this.state.isMinimized ? this.config.minimizedHeight : this.state.dimensions.height;
      
      const maxX = window.innerWidth - windowWidth;
      const maxY = window.innerHeight - windowHeight;
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      // Update state and DOM
      this.state.position.x = newX;
      this.state.position.y = newY;
      
      this.container.style.setProperty('left', `${newX}px`, 'important');
      this.container.style.setProperty('top', `${newY}px`, 'important');
    }
    
    handleDragEnd(e) {
      if (!this.state.isDragging) return;
      
      this.state.isDragging = false;
      
      this.container.classList.remove('dragging');
      
      document.removeEventListener('mousemove', this.handleDragMove);
      document.removeEventListener('mouseup', this.handleDragEnd);
      
      document.body.style.userSelect = '';
      
      this.saveState();
    }
    
    toggleMinimize() {
      if (this.state.isMinimized) {
        this.expand();
      } else {
        this.minimize();
      }
    }
    
    minimize() {
      this.state.isMinimized = true;
      
      this.container.style.height = `${this.config.minimizedHeight}px`;
      
      if (this.elements.content) {
        this.elements.content.style.display = 'none';
      }
      
      if (this.elements.minimizeBtn) {
        const icon = this.elements.minimizeBtn.querySelector('svg');
        if (icon) {
          icon.style.transform = 'rotate(180deg)';
        }
      }
      
      this.container.classList.add('minimized');
      
      this.saveState();
    }
    
    expand() {
      this.state.isMinimized = false;
      
      this.container.style.height = `${this.state.dimensions.height}px`;
      
      if (this.elements.content) {
        this.elements.content.style.display = 'block';
      }
      
      if (this.elements.minimizeBtn) {
        const icon = this.elements.minimizeBtn.querySelector('svg');
        if (icon) {
          icon.style.transform = 'rotate(0deg)';
        }
      }
      
      this.container.classList.remove('minimized');
      
      this.constrainToViewport();
      
      this.saveState();
    }
    
    dock() {
        if (!this.state.isDocked) {
            this.state.savedPosition = { ...this.state.position };
        }

        this.state.isDocked = true;

        // Minimize when docking
        if (!this.state.isMinimized) {
            this.minimize();
        }

        const margin = 15; // 🔑 margin from edges
        this.state.position.x = window.innerWidth - this.state.dimensions.width - margin;
        this.state.position.y = margin;

        this.updatePosition();
        this.container.classList.add('docked');
        this.showDockNotification();
        this.saveState();
    }

    
    showDockNotification() {
      // Remove existing notification if any
      const existingNotif = document.querySelector('.orkg-dock-notification');
      if (existingNotif) {
        existingNotif.remove();
      }
      
      // Create notification
      const notification = document.createElement('div');
      notification.className = 'orkg-dock-notification';
      
      // Calculate position to be directly below the docked window
      const windowRect = this.container.getBoundingClientRect();
      notification.style.position = 'fixed';
      notification.style.left = `${windowRect.left}px`;
      notification.style.top = `${windowRect.bottom + 8}px`; // 8px below the window
      notification.style.width = `${windowRect.width}px`;
      notification.style.transform = 'none'; // 🔑 prevent unwanted shift
      
      notification.innerHTML = `
        <div class="orkg-dock-notification-content">
          <svg viewBox="0 0 24 24" class="orkg-icon">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14l-7-7 1.41-1.41L12 12.17l5.59-5.59L19 8l-7 7z"/>
          </svg>
          <span>Window docked to top-right corner</span>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);
      
      // Remove after 3 seconds
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }
    
    handleClose() {
      // Show confirmation dialog
      this.showCloseConfirmation();
    }
    
    showCloseConfirmation() {
      // Remove existing confirmation if any
      const existingConfirm = document.querySelector('.orkg-close-confirmation');
      if (existingConfirm) {
        existingConfirm.remove();
      }
      
      // Create confirmation dialog
      const confirmation = document.createElement('div');
      confirmation.className = 'orkg-close-confirmation';
      confirmation.innerHTML = `
        <div class="orkg-close-confirmation-backdrop"></div>
        <div class="orkg-close-confirmation-dialog">
          <div class="orkg-close-confirmation-header">
            <svg viewBox="0 0 24 24" class="orkg-icon orkg-icon-warning">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <h3>Close Window?</h3>
          </div>
          <div class="orkg-close-confirmation-body">
            <p>The window and all its data will be lost and cannot be recovered.</p>
            <p>Are you sure you want to close?</p>
          </div>
          <div class="orkg-close-confirmation-footer">
            <button class="orkg-btn-cancel">Cancel</button>
            <button class="orkg-btn-confirm">Close Window</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(confirmation);
      
      // Animate in
      setTimeout(() => {
        confirmation.classList.add('show');
      }, 10);
      
      // Handle button clicks
      const cancelBtn = confirmation.querySelector('.orkg-btn-cancel');
      const confirmBtn = confirmation.querySelector('.orkg-btn-confirm');
      const backdrop = confirmation.querySelector('.orkg-close-confirmation-backdrop');
      
      const closeDialog = () => {
        confirmation.classList.remove('show');
        setTimeout(() => {
          confirmation.remove();
        }, 300);
      };
      
      cancelBtn.addEventListener('click', closeDialog);
      backdrop.addEventListener('click', closeDialog);
      
      confirmBtn.addEventListener('click', () => {
        closeDialog();
        this.close();
      });
      
      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeDialog();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    }
    
    close() {
      // Emit close event
      if (this.container) {
        this.container.dispatchEvent(new CustomEvent('windowClosed'));
      }
      
      // Hide the window
      this.container.style.display = 'none';
      
      // Clear saved state
      try {
        localStorage.removeItem('orkg-rag-window-frame-state');
        localStorage.removeItem('orkg-rag-window-data');
      } catch (e) {
        console.warn('Failed to clear saved state:', e);
      }
      
      // Destroy the window
      this.destroy();
    }
    
    updatePosition() {
      if (this.container) {
        this.container.style.setProperty('left', `${this.state.position.x}px`, 'important');
        this.container.style.setProperty('top', `${this.state.position.y}px`, 'important');
      }
    }
    
    constrainToViewport() {
      const maxX = window.innerWidth - this.state.dimensions.width;
      const maxY = window.innerHeight - 
        (this.state.isMinimized ? this.config.minimizedHeight : this.state.dimensions.height);
      
      this.state.position.x = Math.max(0, Math.min(this.state.position.x, maxX));
      this.state.position.y = Math.max(0, Math.min(this.state.position.y, maxY));
      
      this.updatePosition();
    }
    
    applyState() {
      this.updatePosition();
      
      if (this.container) {
        this.container.style.width = `${this.state.dimensions.width}px`;
        this.container.style.height = this.state.isMinimized ? 
          `${this.config.minimizedHeight}px` : 
          `${this.state.dimensions.height}px`;
      }
      
      if (this.state.isMinimized) {
        if (this.elements.content) {
          this.elements.content.style.display = 'none';
        }
        this.container.classList.add('minimized');
      }
      
      if (this.state.isDocked) {
        this.container.classList.add('docked');
      }
    }
    
    saveState() {
      const stateToSave = {
        position: this.state.position,
        dimensions: this.state.dimensions,
        isMinimized: this.state.isMinimized,
        isDocked: this.state.isDocked
      };
      
      try {
        localStorage.setItem('orkg-rag-window-frame-state', JSON.stringify(stateToSave));
      } catch (e) {
        console.warn('Failed to save window frame state:', e);
      }
    }
    
    loadSavedState() {
      try {
        const saved = localStorage.getItem('orkg-rag-window-frame-state');
        if (saved) {
          const loadedState = JSON.parse(saved);
          
          if (loadedState.position) {
            this.state.position = loadedState.position;
          }
          
          if (loadedState.dimensions) {
            this.state.dimensions = loadedState.dimensions;
          }
          
          if (typeof loadedState.isMinimized === 'boolean') {
            this.state.isMinimized = loadedState.isMinimized;
          }
          
          if (typeof loadedState.isDocked === 'boolean') {
            this.state.isDocked = loadedState.isDocked;
          }
        }
      } catch (e) {
        console.warn('Failed to load window frame state:', e);
      }
    }
    
    getState() {
      return { ...this.state };
    }
    
    setVisible(visible) {
      if (this.container) {
        this.container.style.display = visible ? 'block' : 'none';
      }
    }
    
    destroy() {
      if (this.elements.header) {
        this.elements.header.removeEventListener('mousedown', this.handleDragStart);
      }
      
      this.container = null;
      this.elements = {};
    }
  }
  
  // Export to global scope
  global.RAGWindowFrame = RAGWindowFrame;
  
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[ui/RAGWindowFrame.js] Error:', error);
    }
  })();

  // ===== Module: ui/RAGTabManager.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// modules/ui/RAGTabManager.js
// Handles tab switching, counts, and active states
// ================================

(function(global) {
  'use strict';
  
  class RAGTabManager {
    constructor(container, config = {}) {
      // DOM reference
      this.container = container;
      
      // Configuration
      this.config = {
        defaultTab: 'text',
        tabs: ['text', 'images', 'tables'],
        animationDuration: 200,
        ...config
      };
      
      // State
      this.state = {
        activeTab: this.config.defaultTab,
        tabCounts: {
          text: 0,
          images: 0,
          tables: 0
        },
        tabVisibility: {
          text: true,
          images: true,
          tables: true
        }
      };
      
      // DOM elements
      this.elements = {
        tabContainer: null,
        tabs: new Map(),
        panels: new Map(),
        badges: new Map()
      };
      
      // Callbacks
      this.onTabChange = null;
    }
    
    /**
     * Initialize tab manager
     */
    init() {
      this.findElements();
      this.attachEventListeners();
      this.loadSavedState();
      this.applyInitialState();
      
      return this;
    }
    
    /**
     * Find DOM elements
     */
    findElements() {
      if (!this.container) {
        throw new Error('RAGTabManager: Container not provided');
      }
      
      // Find tab container
      this.elements.tabContainer = this.container.querySelector('.orkg-rag-tabs');
      
      if (!this.elements.tabContainer) {
        console.warn('RAGTabManager: Tab container not found');
        return;
      }
      
      // Find all tabs
      this.config.tabs.forEach(tabName => {
        const tabElement = this.container.querySelector(`[data-tab="${tabName}"]`);
        const panelElement = this.container.querySelector(`[data-panel="${tabName}"]`);
        const badgeElement = this.container.querySelector(`[data-tab-count="${tabName}"]`);
        
        if (tabElement) {
          this.elements.tabs.set(tabName, tabElement);
        }
        
        if (panelElement) {
          this.elements.panels.set(tabName, panelElement);
        }
        
        if (badgeElement) {
          this.elements.badges.set(tabName, badgeElement);
        }
      });
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
      // Tab click handlers
      this.elements.tabs.forEach((tabElement, tabName) => {
        tabElement.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.switchTab(tabName);
        });
        
        // Keyboard accessibility
        tabElement.addEventListener('keydown', (e) => {
          this.handleTabKeyboard(e, tabName);
        });
        
        // Set tabindex for accessibility
        tabElement.setAttribute('tabindex', '0');
        tabElement.setAttribute('role', 'tab');
      });
      
      // Panel accessibility
      this.elements.panels.forEach((panelElement, panelName) => {
        panelElement.setAttribute('role', 'tabpanel');
        panelElement.setAttribute('aria-labelledby', `tab-${panelName}`);
      });
    }
    
    /**
     * Handle keyboard navigation for tabs
     */
    handleTabKeyboard(e, currentTab) {
      const tabs = Array.from(this.elements.tabs.keys());
      const currentIndex = tabs.indexOf(currentTab);
      
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.switchTab(currentTab);
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          this.focusTab(tabs[prevIndex]);
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % tabs.length;
          this.focusTab(tabs[nextIndex]);
          break;
          
        case 'Home':
          e.preventDefault();
          this.focusTab(tabs[0]);
          break;
          
        case 'End':
          e.preventDefault();
          this.focusTab(tabs[tabs.length - 1]);
          break;
      }
    }
    
    /**
     * Focus a specific tab
     */
    focusTab(tabName) {
      const tabElement = this.elements.tabs.get(tabName);
      if (tabElement) {
        tabElement.focus();
      }
    }
    
    /**
     * Switch to a specific tab
     */
    switchTab(tabName) {
      // Validate tab name
      if (!this.config.tabs.includes(tabName)) {
        console.warn(`RAGTabManager: Invalid tab name: ${tabName}`);
        return false;
      }
      
      // Check if already active
      if (this.state.activeTab === tabName) {
        return true;
      }
      
      // Check visibility
      if (!this.state.tabVisibility[tabName]) {
        console.warn(`RAGTabManager: Tab ${tabName} is hidden`);
        return false;
      }
      
      // Get elements
      const newTab = this.elements.tabs.get(tabName);
      const newPanel = this.elements.panels.get(tabName);
      const oldTab = this.elements.tabs.get(this.state.activeTab);
      const oldPanel = this.elements.panels.get(this.state.activeTab);
      
      if (!newTab || !newPanel) {
        console.warn(`RAGTabManager: Tab or panel not found for ${tabName}`);
        return false;
      }
      
      // Emit before change event
      this.emitEvent('beforeTabChange', {
        from: this.state.activeTab,
        to: tabName
      });
      
      // Remove active states from old tab
      if (oldTab) {
        oldTab.classList.remove('active');
        oldTab.setAttribute('aria-selected', 'false');
      }
      
      if (oldPanel) {
        this.hidePanel(oldPanel);
      }
      
      // Add active states to new tab
      newTab.classList.add('active');
      newTab.setAttribute('aria-selected', 'true');
      
      // Show new panel with animation
      this.showPanel(newPanel);
      
      // Update state
      const previousTab = this.state.activeTab;
      this.state.activeTab = tabName;
      
      // Save state
      this.saveState();
      
      // Call callback
      if (this.onTabChange) {
        this.onTabChange(tabName, previousTab);
      }
      
      // Emit after change event
      this.emitEvent('tabChanged', {
        tab: tabName,
        previousTab: previousTab
      });
      
      return true;
    }
    
    /**
     * Show panel with animation
     */
    showPanel(panel) {
      // Remove hidden state
      panel.classList.remove('hidden');
      panel.style.display = 'block';
      
      // Force reflow
      panel.offsetHeight;
      
      // Add active class for animation
      panel.classList.add('active');
      
      // Fade in
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(10px)';
      
      requestAnimationFrame(() => {
        panel.style.transition = `opacity ${this.config.animationDuration}ms ease, 
                                  transform ${this.config.animationDuration}ms ease`;
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
      });
      
      // Clean up after animation
      setTimeout(() => {
        panel.style.transition = '';
        panel.style.opacity = '';
        panel.style.transform = '';
      }, this.config.animationDuration);
    }
    
    /**
     * Hide panel with animation
     */
    hidePanel(panel) {
      panel.style.transition = `opacity ${this.config.animationDuration / 2}ms ease`;
      panel.style.opacity = '0';
      
      setTimeout(() => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
        panel.style.display = 'none';
        panel.style.transition = '';
        panel.style.opacity = '';
      }, this.config.animationDuration / 2);
    }
    
    /**
     * Update tab count
     */
    updateTabCount(tabName, count) {
      // Validate
      if (!this.config.tabs.includes(tabName)) {
        console.warn(`RAGTabManager: Invalid tab name for count update: ${tabName}`);
        return;
      }
      
      // Update state
      this.state.tabCounts[tabName] = count;
      
      // Update badge
      const badge = this.elements.badges.get(tabName);
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
        
        // Add/remove has-content class
        const tab = this.elements.tabs.get(tabName);
        if (tab) {
          if (count > 0) {
            tab.classList.add('has-content');
          } else {
            tab.classList.remove('has-content');
          }
        }
      }
      
      // Emit event
      this.emitEvent('countUpdated', {
        tab: tabName,
        count: count
      });
    }
    
    /**
     * Update all tab counts
     */
    updateAllCounts(counts) {
      Object.entries(counts).forEach(([tabName, count]) => {
        if (this.config.tabs.includes(tabName)) {
          this.updateTabCount(tabName, count);
        }
      });
    }
    
    /**
     * Get total count across all tabs
     */
    getTotalCount() {
      return Object.values(this.state.tabCounts)
        .reduce((sum, count) => sum + count, 0);
    }
    
    /**
     * Show/hide a tab
     */
    setTabVisibility(tabName, visible) {
      if (!this.config.tabs.includes(tabName)) {
        console.warn(`RAGTabManager: Invalid tab name: ${tabName}`);
        return;
      }
      
      this.state.tabVisibility[tabName] = visible;
      
      const tabElement = this.elements.tabs.get(tabName);
      if (tabElement) {
        tabElement.style.display = visible ? 'flex' : 'none';
      }
      
      // If hiding active tab, switch to first visible tab
      if (!visible && this.state.activeTab === tabName) {
        const firstVisibleTab = this.config.tabs.find(tab => 
          this.state.tabVisibility[tab] && tab !== tabName
        );
        
        if (firstVisibleTab) {
          this.switchTab(firstVisibleTab);
        }
      }
    }
    
    /**
     * Enable/disable a tab
     */
    setTabEnabled(tabName, enabled) {
      const tabElement = this.elements.tabs.get(tabName);
      if (tabElement) {
        if (enabled) {
          tabElement.classList.remove('disabled');
          tabElement.removeAttribute('disabled');
          tabElement.setAttribute('tabindex', '0');
        } else {
          tabElement.classList.add('disabled');
          tabElement.setAttribute('disabled', 'true');
          tabElement.setAttribute('tabindex', '-1');
        }
      }
    }
    
    /**
     * Clear content of a tab panel
     */
    clearPanel(tabName) {
      const panel = this.elements.panels.get(tabName);
      if (panel) {
        const content = panel.querySelector('.panel-content');
        if (content) {
          content.innerHTML = this.getEmptyStateHTML(tabName);
        }
      }
      
      // Reset count
      this.updateTabCount(tabName, 0);
    }
    
    /**
     * Clear all panels
     */
    clearAllPanels() {
      this.config.tabs.forEach(tabName => {
        this.clearPanel(tabName);
      });
    }
    
    /**
     * Get empty state HTML for a tab
     */
    getEmptyStateHTML(tabName) {
      const messages = {
        text: 'No highlighted text found',
        images: 'No images found',
        tables: 'No tables found'
      };
      
      const icons = {
        text: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
        images: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
        tables: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path></svg>'
      };
      
      return `
        <div class="empty-state">
          ${icons[tabName] || ''}
          <p>${messages[tabName] || 'No content'}</p>
        </div>
      `;
    }
    
    /**
     * Apply initial state
     */
    applyInitialState() {
      // Set initial active tab
      const activeTab = this.elements.tabs.get(this.state.activeTab);
      const activePanel = this.elements.panels.get(this.state.activeTab);
      
      if (activeTab && activePanel) {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        activePanel.classList.add('active');
        activePanel.classList.remove('hidden');
      }
      
      // Hide other panels
      this.config.tabs.forEach(tabName => {
        if (tabName !== this.state.activeTab) {
          const panel = this.elements.panels.get(tabName);
          if (panel) {
            panel.classList.remove('active');
            panel.classList.add('hidden');
          }
        }
      });
      
      // Apply counts
      this.updateAllCounts(this.state.tabCounts);
    }
    
    /**
     * Save state to storage
     */
    saveState() {
      const stateToSave = {
        activeTab: this.state.activeTab,
        tabCounts: this.state.tabCounts
      };
      
      try {
        localStorage.setItem('orkg-rag-tab-state', JSON.stringify(stateToSave));
      } catch (e) {
        console.warn('Failed to save tab state:', e);
      }
    }
    
    /**
     * Load saved state
     */
    loadSavedState() {
      try {
        const saved = localStorage.getItem('orkg-rag-tab-state');
        if (saved) {
          const loadedState = JSON.parse(saved);
          
          if (loadedState.activeTab && this.config.tabs.includes(loadedState.activeTab)) {
            this.state.activeTab = loadedState.activeTab;
          }
          
          if (loadedState.tabCounts) {
            Object.entries(loadedState.tabCounts).forEach(([tab, count]) => {
              if (this.config.tabs.includes(tab)) {
                this.state.tabCounts[tab] = count;
              }
            });
          }
        }
      } catch (e) {
        console.warn('Failed to load tab state:', e);
      }
    }
    
    /**
     * Emit custom event
     */
    emitEvent(eventName, detail = {}) {
      if (global.eventBus) {
        global.eventBus.emit(`ragTabs:${eventName}`, detail);
      }
      
      // Also dispatch DOM event
      if (this.container) {
        this.container.dispatchEvent(new CustomEvent(`tab-${eventName}`, { detail }));
      }
    }
    
    /**
     * Get current state
     */
    getState() {
      return {
        activeTab: this.state.activeTab,
        tabCounts: { ...this.state.tabCounts },
        tabVisibility: { ...this.state.tabVisibility }
      };
    }
    
    /**
     * Get active tab name
     */
    getActiveTab() {
      return this.state.activeTab;
    }
    
    /**
     * Get tab count
     */
    getTabCount(tabName) {
      return this.state.tabCounts[tabName] || 0;
    }
    
    /**
     * Register tab change callback
     */
    onTabChanged(callback) {
      this.onTabChange = callback;
    }
    
    /**
     * Destroy tab manager
     */
    destroy() {
      // Remove event listeners
      this.elements.tabs.forEach(tabElement => {
        const newElement = tabElement.cloneNode(true);
        tabElement.parentNode.replaceChild(newElement, tabElement);
      });
      
      // Clear references
      this.elements.tabs.clear();
      this.elements.panels.clear();
      this.elements.badges.clear();
      this.container = null;
      this.onTabChange = null;
    }
  }
  
  // Export to global scope
  global.RAGTabManager = RAGTabManager;
  
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[ui/RAGTabManager.js] Error:', error);
    }
  })();

  // ===== Module: ui/RAGPanelRenderer.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/ui/RAGPanelRenderer.js - Main Controller
(function(global) {
    'use strict';
    
    class RAGPanelRenderer {
        constructor(container, config = {}) {
            this.container = container;
            this.config = {
                enableExport: true,
                enableSelection: true,
                enableActions: true,
                showConfidence: true,
                showMetadata: true,
                ...config
            };
            
            // Initialize sub-renderers
            this.textRenderer = null;
            this.imagesRenderer = null;
            this.tablesRenderer = null;
            
            // Callbacks
            this.onItemClickedCallback = null;
            this.onSectionToggledCallback = null;
            this.onItemHoveredCallback = null;
        }
        
        init() {
            // Initialize renderers
            this.initializeRenderers();
            console.log('RAGPanelRenderer initialized');
        }
        
        initializeRenderers() {
            // Initialize text renderer
            if (typeof RAGPanelTextRenderer !== 'undefined') {
                this.textRenderer = new RAGPanelTextRenderer({
                    showConfidence: this.config.showConfidence,
                    showMetadata: this.config.showMetadata,
                    enableSelection: this.config.enableSelection,
                    enableActions: this.config.enableActions
                });
            }
            
            // Initialize images renderer
            if (typeof RAGPanelImagesRenderer !== 'undefined') {
                this.imagesRenderer = new RAGPanelImagesRenderer({
                    enableExport: this.config.enableExport,
                    enableLightbox: true,
                    showScoreBadge: this.config.showConfidence
                });
            }
            
            // Initialize tables renderer
            if (typeof RAGPanelTablesRenderer !== 'undefined') {
                this.tablesRenderer = new RAGPanelTablesRenderer({
                    enableExport: this.config.enableExport,
                    enablePreview: true,
                    enableJumpTo: this.config.enableActions
                });
            }
            
            console.log('RAGPanelRenderer initialized with sub-renderers');
        }
        
        renderTextPanel(textData, panelElement) {
            if (!this.textRenderer) {
                console.warn('Text renderer not available');
                return 0;
            }
            
            const count = this.textRenderer.render(textData, panelElement);
            
            // Wire up event handlers for text items
            this.setupTextPanelEventHandlers(panelElement);
            
            return count;
        }
        
        renderImagesPanel(images, panelElement) {
            if (!this.imagesRenderer) {
                console.warn('Images renderer not available');
                return 0;
            }
            
            const count = this.imagesRenderer.render(images, panelElement);
            
            // Wire up event handlers for image items
            this.setupImagePanelEventHandlers(panelElement);
            
            return count;
        }
        
        renderTablesPanel(tables, panelElement) {
            if (!this.tablesRenderer) {
                console.warn('Tables renderer not available');
                return 0;
            }
            
            const count = this.tablesRenderer.render(tables, panelElement);
            
            // Wire up event handlers for table items
            this.setupTablePanelEventHandlers(panelElement);
            
            return count;
        }
        
        setupTextPanelEventHandlers(panelElement) {
            if (!panelElement) return;
            
            panelElement.addEventListener('click', (e) => {
                // Handle text item clicks
                const textItem = e.target.closest('.text-item');
                if (textItem && !e.target.closest('.item-checkbox') && !e.target.closest('button')) {
                    this.handleItemClick('text', textItem.dataset.id, textItem);
                }
                
                // Handle property header clicks for toggle
                const propertyHeader = e.target.closest('.property-header');
                if (propertyHeader && !e.target.closest('.select-all-btn')) {
                    const propertyGroup = propertyHeader.closest('.property-group');
                    if (propertyGroup) {
                        const isExpanded = propertyGroup.classList.contains('expanded');
                        this.handleSectionToggle(propertyGroup.dataset.propertyId, !isExpanded);
                    }
                }
            });
        }
        
        setupImagePanelEventHandlers(panelElement) {
            if (!panelElement) return;
            
            panelElement.addEventListener('click', (e) => {
                const imageItem = e.target.closest('.image-item');
                if (imageItem && !e.target.closest('button')) {
                    this.handleItemClick('image', imageItem.dataset.id, imageItem);
                }
            });
        }
        
        setupTablePanelEventHandlers(panelElement) {
            if (!panelElement) return;
            
            panelElement.addEventListener('click', (e) => {
                const tableItem = e.target.closest('.table-item');
                if (tableItem && !e.target.closest('button')) {
                    this.handleItemClick('table', tableItem.dataset.id, tableItem);
                }
            });
        }
        
        renderAll(data) {
            const results = {
                text: 0,
                images: 0,
                tables: 0
            };
            
            // Find panels by data-panel attribute
            const textPanel = this.container.querySelector('[data-panel="text"]');
            const imagesPanel = this.container.querySelector('[data-panel="images"]');
            const tablesPanel = this.container.querySelector('[data-panel="tables"]');
            
            // Render text panel
            if (textPanel && data.text) {
                results.text = this.renderTextPanel(data.text, textPanel);
                this.updateTabCount('text', results.text);
            }
            
            // Render images panel
            if (imagesPanel && data.images) {
                results.images = this.renderImagesPanel(data.images, imagesPanel);
                this.updateTabCount('images', results.images);
            }
            
            // Render tables panel
            if (tablesPanel && data.tables) {
                results.tables = this.renderTablesPanel(data.tables, tablesPanel);
                this.updateTabCount('tables', results.tables);
            }
            
            return results;
        }
        
        updateTabCount(tabType, count) {
            const tab = this.container.querySelector(`[data-tab="${tabType}"]`);
            if (tab) {
                const countBadge = tab.querySelector('.tab-count');
                if (countBadge) {
                    countBadge.textContent = count > 0 ? count : '';
                    countBadge.style.display = count > 0 ? 'inline-block' : 'none';
                }
            }
        }
        
        clearAllPanels() {
            const panels = this.container.querySelectorAll('.panel-content');
            panels.forEach(panel => {
                panel.innerHTML = '';
            });
            
            // Reset counts
            this.container.querySelectorAll('.tab-count').forEach(badge => {
                badge.textContent = '';
                badge.style.display = 'none';
            });
        }
        
        getSelectedItems() {
            const selected = {
                text: [],
                images: [],
                tables: []
            };
            
            // Get selected text items
            if (this.textRenderer) {
                selected.text = Array.from(this.textRenderer.selectedItems);
            }
            
            // Get selected images
            if (this.imagesRenderer) {
                selected.images = Array.from(this.imagesRenderer.selectedImages);
            }
            
            // Get selected tables
            if (this.tablesRenderer) {
                selected.tables = Array.from(this.tablesRenderer.selectedTables);
            }
            
            return selected;
        }
        
        exportAllData() {
            const data = {
                text: [],
                images: [],
                tables: []
            };
            
            // Collect text data
            const textItems = this.container.querySelectorAll('[data-panel="text"] .text-item');
            textItems.forEach(item => {
                data.text.push({
                    id: item.dataset.id,
                    text: item.dataset.fullText || item.querySelector('.text-content-span')?.textContent,
                    confidence: item.dataset.confidence,
                    selected: item.classList.contains('selected')
                });
            });
            
            // Collect image data
            const imageItems = this.container.querySelectorAll('[data-panel="images"] .image-item');
            imageItems.forEach(item => {
                data.images.push({
                    id: item.dataset.id,
                    caption: item.dataset.caption,
                    src: item.dataset.src,
                    selected: item.classList.contains('selected')
                });
            });
            
            // Collect table data
            const tableItems = this.container.querySelectorAll('[data-panel="tables"] .table-item');
            tableItems.forEach(item => {
                data.tables.push({
                    id: item.dataset.id,
                    caption: item.dataset.caption,
                    rows: item.dataset.rows,
                    columns: item.dataset.cols,
                    selected: item.classList.contains('selected')
                });
            });
            
            // Create comprehensive CSV
            let csv = 'Type,ID,Content/Caption,Selected,Additional Info\n';
            
            data.text.forEach(item => {
                csv += `"Text","${item.id}","${(item.text || '').replace(/"/g, '""')}","${item.selected}","Confidence: ${item.confidence || 'N/A'}"\n`;
            });
            
            data.images.forEach(item => {
                csv += `"Image","${item.id}","${(item.caption || '').replace(/"/g, '""')}","${item.selected}","Source: ${item.src || 'N/A'}"\n`;
            });
            
            data.tables.forEach(item => {
                csv += `"Table","${item.id}","${(item.caption || '').replace(/"/g, '""')}","${item.selected}","Size: ${item.rows}×${item.columns}"\n`;
            });
            
            // Download
            this.downloadCSV(csv, 'rag-results-export');
        }
        
        downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
        
        // ========================================
        // Event Callback Methods
        // ========================================
        
        onItemClicked(callback) {
            this.onItemClickedCallback = callback;
        }
        
        onSectionToggled(callback) {
            this.onSectionToggledCallback = callback;
        }
        
        onItemHovered(callback) {
            this.onItemHoveredCallback = callback;
        }
        
        // ========================================
        // Internal Event Handlers
        // ========================================
        
        handleItemClick(type, id, element) {
            if (this.onItemClickedCallback) {
                this.onItemClickedCallback(type, id, element);
            }
        }
        
        handleSectionToggle(sectionId, isExpanded) {
            if (this.onSectionToggledCallback) {
                this.onSectionToggledCallback(sectionId, isExpanded);
            }
        }
        
        handleItemHover(element, isHovering) {
            if (this.onItemHoveredCallback) {
                this.onItemHoveredCallback(element, isHovering);
            }
        }
        
        // ========================================
        // Cleanup
        // ========================================
        
        destroy() {
            // Clean up sub-renderers
            this.textRenderer = null;
            this.imagesRenderer = null;
            this.tablesRenderer = null;
            
            // Clear callbacks
            this.onItemClickedCallback = null;
            this.onSectionToggledCallback = null;
            this.onItemHoveredCallback = null;
            
            // Clear panels
            this.clearAllPanels();
            
            console.log('RAGPanelRenderer destroyed');
        }
    }
    
    // Export to global scope
    global.RAGPanelRenderer = RAGPanelRenderer;
    
    console.log('RAGPanelRenderer main controller loaded');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[ui/RAGPanelRenderer.js] Error:', error);
    }
  })();

  // ===== Module: ui/RAGElementFinder.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// modules/ui/RAGElementFinder.js - SIMPLE FIX
// ================================

(function(global) {
  'use strict';
  
  class RAGElementFinder {
    constructor(config = {}) {
      this.config = {
        highlightClasses: [
          'orkg-rag-highlight',
          'orkg-highlighted',
          'rag-highlight',
          'highlighted-text',
          'orkg-highlight' // Add this common class
        ],
        markerSelector: '[data-marker-id]',
        imageSelectors: ['img', 'svg', 'canvas', 'picture'],
        tableSelectors: ['table'],
        ...config
      };
      
      this.elementCache = new Map();
      this.highlightMap = new Map(); // Map highlight IDs to elements
      this.cacheTimeout = 30000;
    }
    
    init() {
      // Build initial highlight map
      this.buildHighlightMap();
      
      // Observe DOM changes to update highlight map
      this.observeHighlights();
      
      return this;
    }
    
    /**
     * Build a map of all highlighted elements
     */
    buildHighlightMap() {
      this.highlightMap.clear();
      
      // Find all elements with highlight IDs
      const highlightedElements = document.querySelectorAll('[data-highlight-id]');
      highlightedElements.forEach(el => {
        const id = el.getAttribute('data-highlight-id');
        if (id) {
          this.highlightMap.set(id, el);
        }
      });
      
      // Also find elements by ID that look like highlights
      const elementsWithIds = document.querySelectorAll('[id*="highlight_"]');
      elementsWithIds.forEach(el => {
        this.highlightMap.set(el.id, el);
      });
      
      console.log(`[RAGElementFinder] Found ${this.highlightMap.size} highlighted elements`);
    }
    
    /**
     * Observe DOM for new highlights
     */
    observeHighlights() {
      if (this.observer) return;
      
      this.observer = new MutationObserver((mutations) => {
        let shouldRebuild = false;
        
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            // Check if any added nodes have highlight attributes
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) { // Element node
                if (node.hasAttribute('data-highlight-id') || 
                    (node.id && node.id.includes('highlight_'))) {
                  shouldRebuild = true;
                  break;
                }
              }
            }
          }
        }
        
        if (shouldRebuild) {
          this.buildHighlightMap();
        }
      });
      
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-highlight-id', 'id']
      });
    }
    
    findElement(type, id, data = null) {
      console.log(`[RAGElementFinder] Looking for ${type} element with ID: ${id}`, data);
      
      // Check cache first
      const cacheKey = `${type}_${id}`;
      const cached = this.getCachedElement(cacheKey);
      if (cached) {
        console.log(`[RAGElementFinder] Found in cache: ${type} ${id}`);
        return cached;
      }
      
      let element = null;
      
      switch (type) {
        case 'text':
          element = this.findTextElement(id, data);
          break;
        case 'image':
          element = this.findImageElement(id, data);
          break;
        case 'table':
          element = this.findTableElement(id, data);
          break;
        default:
          console.warn(`RAGElementFinder: Unknown type: ${type}`);
      }
      
      if (element) {
        this.cacheElement(cacheKey, element);
        console.log(`[RAGElementFinder] Found and cached: ${type} ${id}`);
      } else {
        console.warn(`[RAGElementFinder] Could not find: ${type} ${id}`);
        // Try to rebuild highlight map and search again for text
        if (type === 'text') {
          this.buildHighlightMap();
          element = this.findTextElementFallback(id, data);
          if (element) {
            this.cacheElement(cacheKey, element);
            console.log(`[RAGElementFinder] Found after rebuild: ${type} ${id}`);
          }
        }
      }
      
      return element;
    }
    
    findTextElement(id, textData) {
      let element = null;
      
      // Strategy 1: Check highlight map first
      element = this.highlightMap.get(id);
      if (element && document.contains(element)) {
        console.log('[RAGElementFinder] Found text in highlight map');
        return element;
      }
      
      // Strategy 2: Find by data-highlight-id
      element = document.querySelector(`[data-highlight-id="${id}"]`);
      if (element) {
        console.log('[RAGElementFinder] Found text by data-highlight-id');
        return element;
      }
      
      // Strategy 3: Find by ID
      element = document.getElementById(id);
      if (element) {
        console.log('[RAGElementFinder] Found text by ID');
        return element;
      }
      
      // Strategy 4: Find spans with the ID in their class or data attributes
      const possibleSelectors = [
        `span[id="${id}"]`,
        `span[data-id="${id}"]`,
        `span[data-highlight="${id}"]`,
        `mark[id="${id}"]`,
        `mark[data-highlight-id="${id}"]`,
        `.orkg-highlight[data-id="${id}"]`
      ];
      
      for (const selector of possibleSelectors) {
        element = document.querySelector(selector);
        if (element) {
          console.log(`[RAGElementFinder] Found text by selector: ${selector}`);
          return element;
        }
      }
      
      // Strategy 5: Find by highlighted class and content
      if (textData) {
        const searchText = (textData.text || textData.sentence || textData.value || '').trim();
        if (searchText) {
          const highlights = this.getAllHighlightedElements();
          
          // First try exact match
          for (const el of highlights) {
            const elText = (el.textContent || el.innerText || '').trim();
            if (elText === searchText) {
              console.log('[RAGElementFinder] Found text by exact content match');
              // Assign the ID to this element for future lookups
              el.setAttribute('data-highlight-id', id);
              this.highlightMap.set(id, el);
              return el;
            }
          }
          
          // Then try partial match
          for (const el of highlights) {
            const elText = (el.textContent || el.innerText || '').trim();
            if (elText.includes(searchText) || searchText.includes(elText)) {
              console.log('[RAGElementFinder] Found text by partial content match');
              // Assign the ID to this element for future lookups
              el.setAttribute('data-highlight-id', id);
              this.highlightMap.set(id, el);
              return el;
            }
          }
        }
      }
      
      return null;
    }
    
    findTextElementFallback(id, textData) {
      // Last resort: search all spans and marks for any that might match
      const allSpans = document.querySelectorAll('span, mark');
      
      // Check if any span has styles that indicate highlighting
      for (const span of allSpans) {
        const style = window.getComputedStyle(span);
        const bgColor = style.backgroundColor;
        
        // Check if it has a background color (indicating highlight)
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          // Check if content matches
          if (textData) {
            const searchText = (textData.text || textData.sentence || textData.value || '').trim();
            const spanText = (span.textContent || '').trim();
            
            if (searchText && spanText && (spanText.includes(searchText) || searchText.includes(spanText))) {
              console.log('[RAGElementFinder] Found text by fallback style + content match');
              // Assign the ID for future lookups
              span.setAttribute('data-highlight-id', id);
              this.highlightMap.set(id, span);
              return span;
            }
          }
        }
      }
      
      return null;
    }
    
    // ... (keep all other methods from the original implementation)
    
    findImageElement(id, imageData) {
      console.log('[RAGElementFinder] Searching for image:', id, imageData);
      let element = null;
      
      // Strategy 1: Find by src (most reliable for actual images)
      if (imageData && imageData.src) {
        const normalizedSearchSrc = imageData.src.replace(/^https?:/, '').replace(/^\/\//, '');
        
        const images = document.querySelectorAll('img');
        for (const img of images) {
          const imgSrcAttr = img.getAttribute('src') || '';
          const imgSrcComputed = img.src || '';
          
          const normalizedAttr = imgSrcAttr.replace(/^https?:/, '').replace(/^\/\//, '');
          const normalizedComputed = imgSrcComputed.replace(/^https?:/, '').replace(/^\/\//, '');
          
          if (normalizedAttr === normalizedSearchSrc || 
              normalizedComputed === normalizedSearchSrc) {
            console.log('[RAGElementFinder] Found image by normalized src match');
            return img;
          }
          
          const imgFile = normalizedAttr.split('/').pop().split('?')[0];
          const searchFile = normalizedSearchSrc.split('/').pop().split('?')[0];
          if (imgFile && searchFile && imgFile === searchFile) {
            console.log('[RAGElementFinder] Found image by filename match');
            return img;
          }
        }
      }
      
      // Other strategies remain the same...
      if (imageData && imageData.alt) {
        element = document.querySelector(`img[alt="${imageData.alt}"]`);
        if (element) {
          console.log('[RAGElementFinder] Found image by alt text');
          return element;
        }
      }
      
      element = document.querySelector(`[data-image-id="${id}"]`);
      if (element) {
        console.log('[RAGElementFinder] Found image by data-image-id');
        return element;
      }
      
      element = document.getElementById(id);
      if (element && element.tagName === 'IMG') {
        console.log('[RAGElementFinder] Found image by ID');
        return element;
      }
      
      const match = id.match(/img_(\d+)/);
      if (match) {
        const index = parseInt(match[1]);
        const images = document.querySelectorAll('img');
        if (images[index]) {
          console.log('[RAGElementFinder] Found image by index');
          return images[index];
        }
      }
      
      return null;
    }
    
    findTableElement(id, tableData) {
      console.log('[RAGElementFinder] Searching for table:', id, tableData);
      let element = null;
      
      element = document.querySelector(`[data-table-id="${id}"]`);
      if (element) {
        console.log('[RAGElementFinder] Found table by data-table-id');
        return element;
      }
      
      element = document.getElementById(id);
      if (element) {
        console.log('[RAGElementFinder] Found table by ID');
        return element;
      }
      
      const tables = document.querySelectorAll('table');
      
      const match = id.match(/table[_-]?(\d+)/);
      if (match) {
        const index = parseInt(match[1]);
        if (tables[index]) {
          console.log('[RAGElementFinder] Found table by index');
          return tables[index];
        }
      }
      
      if (tableData && tableData.caption) {
        for (const table of tables) {
          const caption = table.querySelector('caption');
          if (caption && caption.textContent.includes(tableData.caption)) {
            console.log('[RAGElementFinder] Found table by caption');
            return table;
          }
        }
      }
      
      // Check if it's actually an SVG icon
      if (tableData && tableData.tagName === 'symbol') {
        element = this.findSVGElement(id, tableData);
        if (element) return element;
      }
      
      return null;
    }
    
    findSVGElement(id, data) {
      let element = null;
      
      element = document.getElementById(id);
      if (element) return element;
      
      const svgs = document.querySelectorAll('svg, symbol, use');
      for (const svg of svgs) {
        if (svg.id === id || svg.getAttribute('data-marker-id') === id) {
          return svg;
        }
      }
      
      if (data && data.element && data.element.href) {
        const href = data.element.href;
        element = document.querySelector(`use[href="${href}"], use[xlink:href="${href}"]`);
        if (element) return element;
      }
      
      return null;
    }
    
    getAllHighlightedElements() {
      const selectors = [
        ...this.config.highlightClasses.map(cls => `.${cls}`),
        'span[style*="background"]',
        'mark',
        '[data-highlight-id]'
      ];
      
      return document.querySelectorAll(selectors.join(', '));
    }
    
    getCachedElement(key) {
      const cached = this.elementCache.get(key);
      
      if (!cached) return null;
      
      if (Date.now() - cached.timestamp > this.cacheTimeout) {
        this.elementCache.delete(key);
        return null;
      }
      
      if (!document.contains(cached.element)) {
        this.elementCache.delete(key);
        return null;
      }
      
      return cached.element;
    }
    
    cacheElement(key, element) {
      this.elementCache.set(key, {
        element: element,
        timestamp: Date.now()
      });
    }
    
    highlightElement(element, duration = 2000) {
      if (!element) return;
      
      element.classList.add('orkg-jump-highlight');
      
      setTimeout(() => {
        element.classList.remove('orkg-jump-highlight');
      }, duration);
    }
    
    scrollToElement(element, options = {}) {
      if (!element) return;
      
      const defaultOptions = {
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      };
      
      element.scrollIntoView({ ...defaultOptions, ...options });
    }
    
    jumpToElement(element) {
      if (!element) return false;
      
      this.scrollToElement(element);
      this.highlightElement(element);
      
      return true;
    }
    
    findAndJump(type, id, data = null) {
      const element = this.findElement(type, id, data);
      
      if (element) {
        this.jumpToElement(element);
        return true;
      }
      
      console.warn(`RAGElementFinder: Could not find ${type} element with ID: ${id}`);
      return false;
    }
    
    clearCache() {
      this.elementCache.clear();
      this.highlightMap.clear();
    }
    
    destroy() {
      this.clearCache();
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
  }
  
  // Export to global scope
  global.RAGElementFinder = RAGElementFinder;
  
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[ui/RAGElementFinder.js] Error:', error);
    }
  })();

  // ===== Module: ui/RAGResultsWindow.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// modules/ui/RAGResultsWindow.js - Updated with Dock Feature
// ================================

(function(global) {
  'use strict';
  
  class RAGResultsWindow {
    constructor(config = {}) {
      // Configuration
      this.config = {
        defaultTab: 'text',
        groupTextByProperty: true,
        autoShow: false,
        autoMinimize: true,
        ...config
      };
      
      // Core state
      this.initialized = false;
      this.visible = false;
      this.container = null;
      
      // Data storage
      this.data = {
        text: new Map(),
        images: [],
        tables: []
      };
      
      // Components
      this.windowFrame = null;
      this.tabManager = null;
      this.panelRenderer = null;
      this.elementFinder = null;
      
      // Event callbacks
      this.onDataReceived = null;
      this.onElementJump = null;
      this.onWindowClosed = null;
    }
    
    async init() {
      if (this.initialized) {
        console.log('RAGResultsWindow already initialized');
        return this;
      }
      
      try {
        console.log('Initializing RAG Results Window...');
        
        this.injectStyles();
        this.createWindow();
        this.initializeComponents();
        this.setupEventCoordination();
        this.registerService();
        this.loadSavedData();
        
        this.initialized = true;
        console.log('RAG Results Window initialized successfully');
        
        return this;
        
      } catch (error) {
        console.error('Failed to initialize RAG Results Window:', error);
        throw error;
      }
    }
    
    createWindow() {
      // Remove existing window if present
      const existing = document.getElementById('orkg-rag-results-window');
      if (existing) {
        existing.remove();
      }
      
      // Create container
      this.container = document.createElement('div');
      this.container.id = 'orkg-rag-results-window';
      this.container.className = 'orkg-rag-window';
      
      // Build window HTML
      this.container.innerHTML = this.getWindowHTML();
      
      // Append to body
      document.body.appendChild(this.container);
      
      console.log('Window DOM created');
    }
    
    getWindowHTML() {
      const icons = global.IconRegistry || this.getDefaultIcons();
      
      return `
        <!-- Header -->
        <div class="orkg-rag-header" data-draggable="true">
          <div class="orkg-rag-title">
            ${icons.clipboard || this.getDefaultIcons().clipboard}
            <span>Paper Analysis Results</span>
            <span class="orkg-rag-badge" data-count="0">0</span>
          </div>
          <div class="orkg-rag-controls">
            <button class="orkg-rag-btn minimize-btn" title="Minimize">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <button class="orkg-rag-btn dock-btn" title="Dock to Top">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14"></path>
                <path d="M12 5l7 7-7 7"></path>
                <rect x="3" y="3" width="7" height="7"></rect>
              </svg>
            </button>
            <button class="orkg-rag-btn close-btn" title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="orkg-rag-content">
          <!-- Tabs -->
          <div class="orkg-rag-tabs">
            <button class="orkg-rag-tab active" data-tab="text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>Text</span>
              <span class="tab-count" data-tab-count="text">0</span>
            </button>
            <button class="orkg-rag-tab" data-tab="images">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>Images</span>
              <span class="tab-count" data-tab-count="images">0</span>
            </button>
            <button class="orkg-rag-tab" data-tab="tables">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
              </svg>
              <span>Tables</span>
              <span class="tab-count" data-tab-count="tables">0</span>
            </button>
          </div>
          
          <!-- Tab Panels -->
          <div class="orkg-rag-panels">
            <div class="orkg-rag-panel active" data-panel="text">
              <div class="panel-content"></div>
            </div>
            <div class="orkg-rag-panel" data-panel="images">
              <div class="panel-content"></div>
            </div>
            <div class="orkg-rag-panel" data-panel="tables">
              <div class="panel-content"></div>
            </div>
          </div>
        </div>
      `;
    }
    
    initializeComponents() {
      // Check if required modules exist
      const required = ['RAGWindowFrame', 'RAGTabManager', 'RAGPanelRenderer', 'RAGElementFinder'];
      const missing = required.filter(m => !global[m]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required modules: ${missing.join(', ')}`);
      }
      
      // Initialize WindowFrame
      this.windowFrame = new global.RAGWindowFrame(this.container, {
        defaultWidth: 380,
        defaultHeight: 500,
        minimizedHeight: 48
      });
      this.windowFrame.init();
      
      // Initialize TabManager
      this.tabManager = new global.RAGTabManager(this.container, {
        defaultTab: this.config.defaultTab,
        tabs: ['text', 'images', 'tables']
      });
      this.tabManager.init();
      
      // Initialize PanelRenderer
      this.panelRenderer = new global.RAGPanelRenderer(this.container, {
        groupByProperty: this.config.groupTextByProperty,
        showConfidence: true,
        showMetadata: true
      });
      this.panelRenderer.init();
      
      // Initialize ElementFinder
      this.elementFinder = new global.RAGElementFinder({
        fuzzyMatchThreshold: 0.8
      });
      this.elementFinder.init();
      
      console.log('All components initialized');
    }
    
    setupEventCoordination() {
      // Tab change events
      this.tabManager.onTabChanged((newTab, oldTab) => {
        console.log(`Tab changed: ${oldTab} → ${newTab}`);
        this.emitEvent('tabChanged', { newTab, oldTab });
      });
      
      // Panel item clicks
      this.panelRenderer.onItemClicked((type, id, element) => {
        this.handleItemClick(type, id);
      });
      
      // Section toggle events
      this.panelRenderer.onSectionToggled((sectionId, isExpanded) => {
        console.log(`Section ${sectionId} ${isExpanded ? 'expanded' : 'collapsed'}`);
      });
      
      // Window closed event
      this.container.addEventListener('windowClosed', () => {
        this.handleWindowClosed();
      });
      
      // Window frame events
      this.container.addEventListener('docked', () => {
        this.emitEvent('windowDocked');
      });
      
      this.container.addEventListener('restored', () => {
        this.emitEvent('windowRestored');
      });
      
      // Global event bus listeners
      if (global.eventBus) {
        global.eventBus.on('rag:resultsReady', (data) => this.handleRAGResults(data));
        global.eventBus.on('rag:highlightAdded', (data) => this.addHighlight(data));
        global.eventBus.on('rag:highlightRemoved', (data) => this.removeHighlight(data));
        global.eventBus.on('rag:clearResults', () => this.clearAllData());
      }
    }
    
    handleItemClick(type, id) {
      console.log(`Jumping to ${type} element: ${id}`);
      
      let itemData = null;
      
      if (type === 'text') {
        this.data.text.forEach(items => {
          const found = items.find(item => item.id === id);
          if (found) itemData = found;
        });
      } else if (type === 'image') {
        itemData = this.data.images.find(img => img.id === id);
      } else if (type === 'table') {
        itemData = this.data.tables.find(table => table.id === id);
      }
      
      const success = this.elementFinder.findAndJump(type, id, itemData);
      
      if (success) {
        this.emitEvent('elementJumped', { type, id });
        
        if (this.onElementJump) {
          this.onElementJump(type, id);
        }
      } else {
        console.warn(`Could not find ${type} element: ${id}`);
        this.showNotification(`Could not find ${type} element`, 'warning');
      }
    }
    
    handleWindowClosed() {
      // Clear all data
      this.clearAllData();
      
      // Remove container from DOM
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      
      // Reset state
      this.initialized = false;
      this.visible = false;
      this.container = null;
      
      // Clear saved data
      try {
        localStorage.removeItem('orkg-rag-window-data');
      } catch (e) {
        console.warn('Failed to clear saved data:', e);
      }
      
      // Callback
      if (this.onWindowClosed) {
        this.onWindowClosed();
      }
      
      this.emitEvent('windowClosed');
      
      console.log('Window closed and cleaned up');
    }
    
    handleRAGResults(data) {
      console.log('Handling RAG results:', data);
      
      this.clearAllData();
      
      if (data.highlights) {
        this.processTextHighlights(data.highlights);
      }
      
      if (data.images) {
        this.data.images = data.images;
      }
      
      if (data.tables) {
        this.data.tables = data.tables;
      }
      
      this.updateAllPanels();
      this.show();
      this.updateTotalBadge();
      
      if (this.onDataReceived) {
        this.onDataReceived(data);
      }
      
      this.emitEvent('dataReceived', data);
    }
    
    processTextHighlights(highlights) {
      if (this.config.groupTextByProperty) {
        highlights.forEach(highlight => {
          const property = highlight.propertyLabel || highlight.property || 'Unknown';
          
          if (!this.data.text.has(property)) {
            this.data.text.set(property, []);
          }
          
          this.data.text.get(property).push({
            id: highlight.id || `text_${Date.now()}_${Math.random()}`,
            text: highlight.text || highlight.sentence || highlight.value,
            sentence: highlight.sentence,
            section: highlight.section,
            confidence: highlight.confidence,
            color: highlight.color,
            propertyLabel: property
          });
        });
      } else {
        this.data.text.set('All Highlights', highlights);
      }
      
      console.log(`Processed ${highlights.length} text highlights into ${this.data.text.size} groups`);
    }
    
    updateAllPanels() {
      const textCount = this.panelRenderer.renderTextPanel(
        this.data.text,
        this.container.querySelector('[data-panel="text"]')
      );
      this.tabManager.updateTabCount('text', textCount);
      
      const imageCount = this.panelRenderer.renderImagesPanel(
        this.data.images,
        this.container.querySelector('[data-panel="images"]')
      );
      this.tabManager.updateTabCount('images', imageCount);
      
      const tableCount = this.panelRenderer.renderTablesPanel(
        this.data.tables,
        this.container.querySelector('[data-panel="tables"]')
      );
      this.tabManager.updateTabCount('tables', tableCount);
      
      console.log(`Updated panels - Text: ${textCount}, Images: ${imageCount}, Tables: ${tableCount}`);
    }
    
    updateTotalBadge() {
      const total = this.tabManager.getTotalCount();
      const badge = this.container.querySelector('.orkg-rag-badge');
      
      if (badge) {
        badge.textContent = total;
        badge.dataset.count = total;
        badge.style.display = total > 0 ? 'inline-block' : 'none';
      }
    }
    
    addHighlight(data) {
      if (data.type === 'text') {
        const property = data.propertyLabel || 'Unknown';
        
        if (!this.data.text.has(property)) {
          this.data.text.set(property, []);
        }
        
        this.data.text.get(property).push(data);
        
        const textCount = this.panelRenderer.renderTextPanel(
          this.data.text,
          this.container.querySelector('[data-panel="text"]')
        );
        this.tabManager.updateTabCount('text', textCount);
        
      } else if (data.type === 'image') {
        this.data.images.push(data);
        
        const imageCount = this.panelRenderer.renderImagesPanel(
          this.data.images,
          this.container.querySelector('[data-panel="images"]')
        );
        this.tabManager.updateTabCount('images', imageCount);
        
      } else if (data.type === 'table') {
        this.data.tables.push(data);
        
        const tableCount = this.panelRenderer.renderTablesPanel(
          this.data.tables,
          this.container.querySelector('[data-panel="tables"]')
        );
        this.tabManager.updateTabCount('tables', tableCount);
      }
      
      this.updateTotalBadge();
    }
    
    removeHighlight(data) {
      if (data.type === 'text' && data.id) {
        this.data.text.forEach((items, key) => {
          const index = items.findIndex(item => item.id === data.id);
          if (index >= 0) {
            items.splice(index, 1);
            if (items.length === 0) {
              this.data.text.delete(key);
            }
          }
        });
        
        const textCount = this.panelRenderer.renderTextPanel(
          this.data.text,
          this.container.querySelector('[data-panel="text"]')
        );
        this.tabManager.updateTabCount('text', textCount);
        
      } else if (data.type === 'image' && data.id) {
        this.data.images = this.data.images.filter(img => img.id !== data.id);
        
        const imageCount = this.panelRenderer.renderImagesPanel(
          this.data.images,
          this.container.querySelector('[data-panel="images"]')
        );
        this.tabManager.updateTabCount('images', imageCount);
        
      } else if (data.type === 'table' && data.id) {
        this.data.tables = this.data.tables.filter(table => table.id !== data.id);
        
        const tableCount = this.panelRenderer.renderTablesPanel(
          this.data.tables,
          this.container.querySelector('[data-panel="tables"]')
        );
        this.tabManager.updateTabCount('tables', tableCount);
      }
      
      this.updateTotalBadge();
    }
    
    clearAllData() {
      this.data.text.clear();
      this.data.images = [];
      this.data.tables = [];
      
      if (this.panelRenderer) {
        this.panelRenderer.clearAllPanels();
      }
      
      if (this.tabManager) {
        this.tabManager.updateAllCounts({ text: 0, images: 0, tables: 0 });
      }
      
      this.updateTotalBadge();
    }
    
    show() {
      console.log('[RAGResultsWindow] Showing window');
      
      if (this.container) {
        this.container.style.display = 'block';
      }
      
      if (this.windowFrame) {
        if (typeof this.windowFrame.setVisible === 'function') {
          this.windowFrame.setVisible(true);
        }
        
        if (typeof this.windowFrame.expand === 'function' && 
            this.windowFrame.state && 
            this.windowFrame.state.isMinimized) {
          this.windowFrame.expand();
        }
      }
      
      this.visible = true;
      return this;
    }
    
    hide() {
      this.visible = false;
      if (this.windowFrame && typeof this.windowFrame.setVisible === 'function') {
        this.windowFrame.setVisible(false);
      }
      this.emitEvent('windowHidden');
    }
    
    toggle() {
      if (this.visible) {
        this.hide();
      } else {
        this.show();
      }
    }
    
    showNotification(message, type = 'info') {
      if (global.toastManager) {
        global.toastManager[type](message);
      } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    }
    
    getDefaultIcons() {
      return {
        clipboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
        chevronRight: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>',
        chevronDown: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>'
      };
    }
    
    injectStyles() {
      const styleId = 'orkg-rag-window-styles';
      
      if (document.getElementById(styleId)) return;
      
      const link = document.createElement('link');
      link.id = styleId;
      link.rel = 'stylesheet';
      link.href = chrome?.runtime?.getURL ? 
        chrome.runtime.getURL('src/styles/content/rag-results-window.css') : 
        '/src/styles/content/rag-results-window.css';
      
      document.head.appendChild(link);
    }
    
    registerService() {
      if (global.serviceRegistry) {
        global.serviceRegistry.register('ragResultsWindow', this);
      }
    }
    
    loadSavedData() {
      try {
        const saved = localStorage.getItem('orkg-rag-window-data');
        if (saved) {
          const data = JSON.parse(saved);
          
          if (data.text) {
            this.data.text = new Map(data.text);
          }
          
          if (data.images) this.data.images = data.images;
          if (data.tables) this.data.tables = data.tables;
          
          if (this.data.text.size > 0 || this.data.images.length > 0 || this.data.tables.length > 0) {
            this.updateAllPanels();
          }
        }
      } catch (e) {
        console.warn('Failed to load saved data:', e);
      }
    }
    
    saveData() {
      try {
        const dataToSave = {
          text: Array.from(this.data.text.entries()),
          images: this.data.images,
          tables: this.data.tables
        };
        
        localStorage.setItem('orkg-rag-window-data', JSON.stringify(dataToSave));
      } catch (e) {
        console.warn('Failed to save data:', e);
      }
    }
    
    emitEvent(eventName, detail = {}) {
      if (global.eventBus) {
        global.eventBus.emit(`ragWindow:${eventName}`, detail);
      }
      
      if (this.container) {
        this.container.dispatchEvent(new CustomEvent(eventName, { detail }));
      }
    }
    
    // Public API Methods
    
    setData(textData, imageData, tableData) {
      this.clearAllData();
      
      if (textData) {
        if (textData instanceof Map) {
          this.data.text = textData;
        } else if (Array.isArray(textData)) {
          this.processTextHighlights(textData);
        }
      }
      
      if (imageData) this.data.images = imageData;
      if (tableData) this.data.tables = tableData;
      
      this.updateAllPanels();
      this.saveData();
    }
    
    getData() {
      return {
        text: this.data.text,
        images: [...this.data.images],
        tables: [...this.data.tables]
      };
    }
    
    getState() {
      return {
        initialized: this.initialized,
        visible: this.visible,
        windowFrame: this.windowFrame?.getState(),
        tabs: this.tabManager?.getState(),
        dataCount: {
          text: this.tabManager?.getTabCount('text') || 0,
          images: this.data.images.length,
          tables: this.data.tables.length
        }
      };
    }
    
    isReady() {
      return this.initialized && 
             this.windowFrame && 
             this.tabManager && 
             this.panelRenderer && 
             this.elementFinder;
    }
    
    onData(callback) {
      this.onDataReceived = callback;
    }
    
    onJump(callback) {
      this.onElementJump = callback;
    }
    
    onClose(callback) {
      this.onWindowClosed = callback;
    }
    
    destroy() {
      this.saveData();
      
      if (this.windowFrame) this.windowFrame.destroy();
      if (this.tabManager) this.tabManager.destroy();
      if (this.panelRenderer) this.panelRenderer.destroy();
      if (this.elementFinder) this.elementFinder.destroy();
      
      if (global.eventBus) {
        global.eventBus.off('rag:resultsReady');
        global.eventBus.off('rag:highlightAdded');
        global.eventBus.off('rag:highlightRemoved');
        global.eventBus.off('rag:clearResults');
      }
      
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      
      this.clearAllData();
      
      this.initialized = false;
      this.visible = false;
      this.container = null;
      
      console.log('RAG Results Window destroyed');
    }
  }
  
  // Create singleton instance
  const ragResultsWindow = new RAGResultsWindow({
    defaultTab: 'text',
    groupTextByProperty: true,
    autoShow: false,
    autoMinimize: true
  });
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ragResultsWindow.init().catch(console.error);
    });
  } else {
    ragResultsWindow.init().catch(console.error);
  }
  
  // Export to global scope
  global.ragResultsWindow = ragResultsWindow;
  global.RAGResultsWindow = RAGResultsWindow;
  
  console.log('RAGResultsWindow module loaded');
  
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[ui/RAGResultsWindow.js] Error:', error);
    }
  })();

  // ===== Module: handlers/RAGHandler.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/handlers/RAGHandler.js - Consolidated Version
// ================================

(function(global) {
    'use strict';
    
    /**
     * RAGHandler Service
     * 
     * Consolidated handler for all RAG (Retrieval-Augmented Generation) operations.
     * Manages overlay, highlighting coordination, and analysis state.
     * Follows SOLID principles with clear separation of concerns.
     */
    class RAGHandler {
        constructor() {
            this.isInitialized = false;
            
            // Dependencies
            this.dependencies = {
                overlayManager: null,
                textHighlighter: null,
                textSearchUtility: null,
                textMarker: null,
                imageMarker: null,
                ragLogger: null
            };
            
            // State management
            this.state = {
                ragAnalysisRunning: false,
                currentPhase: null,
                progress: 0,
                logs: [],
                appliedHighlights: new Set(),
                highlightQueue: [],
                isProcessing: false,
                processingStats: {
                    total: 0,
                    processed: 0,
                    successful: 0,
                    failed: 0
                }
            };
            
            // Configuration
            this.config = {
                batchSize: 5,
                batchDelay: 100,
                maxRetries: 3,
                showOverlay: true,
                autoHideOverlay: true,
                overlayHideDelay: 1000
            };
            
            console.log('🤖 RAGHandler instance created');
        }
        
        // ================================
        // Initialization
        // ================================
        
        /**
         * Initialize the RAG handler
         */
        async init() {
            if (this.isInitialized) {
                console.warn('RAGHandler already initialized');
                return true;
            }
            
            console.log('🤖 Initializing RAGHandler...');
            
            try {
                this.setupDependencies();
                this.registerMessageHandlers();
                this.setupEventListeners();
                
                this.isInitialized = true;
                console.log('✅ RAGHandler initialized');
                return true;
            } catch (error) {
                console.error('❌ Failed to initialize RAGHandler:', error);
                this.isInitialized = false;
                return false;
            }
        }
        
        /**
         * Setup dependencies from global scope or service registry
         * @private
         */
        setupDependencies() {
            const registry = global.serviceRegistry;
            
            // Get or create OverlayManager
            this.dependencies.overlayManager = 
                registry?.get('overlayManager') ||
                (typeof OverlayManager !== 'undefined' ? new OverlayManager() : null);
            
            // Get TextHighlighter
            this.dependencies.textHighlighter = 
                global.TextHighlighter ||
                registry?.get('textHighlighter');
            
            // Get or create TextSearchUtility
            this.dependencies.textSearchUtility = 
                global.textSearchUtility ||
                (typeof TextSearchUtility !== 'undefined' ? new TextSearchUtility() : null) ||
                registry?.get('textSearchUtility');
            
            // Get markers
            this.dependencies.textMarker = 
                registry?.get('textMarker') ||
                (typeof TextMarker !== 'undefined' ? new TextMarker() : null);
            
            this.dependencies.imageMarker = 
                registry?.get('imageMarker') ||
                (typeof ImageMarker !== 'undefined' ? new ImageMarker() : null);
            
            // Get logger
            this.dependencies.ragLogger = 
                registry?.get('ragLogger') ||
                (typeof RAGAnalysisLogger !== 'undefined' ? new RAGAnalysisLogger() : null);
            
            console.log('🤖 Dependencies setup:', {
                overlayManager: !!this.dependencies.overlayManager,
                textHighlighter: !!this.dependencies.textHighlighter,
                textSearchUtility: !!this.dependencies.textSearchUtility,
                textMarker: !!this.dependencies.textMarker,
                imageMarker: !!this.dependencies.imageMarker,
                ragLogger: !!this.dependencies.ragLogger
            });
        }
        
        /**
         * Register message handlers
         * @private
         */
        registerMessageHandlers() {
            // Try to register with MessageHandler if available
            const messageHandler = global.serviceRegistry?.get('messageHandler');
            if (messageHandler) {
                messageHandler.registerHandler('SHOW_RAG_OVERLAY', (msg) => this.handleShowOverlay(msg));
                messageHandler.registerHandler('HIDE_RAG_OVERLAY', (msg) => this.handleHideOverlay(msg));
                messageHandler.registerHandler('UPDATE_RAG_OVERLAY', (msg) => this.handleUpdateOverlay(msg));
                messageHandler.registerHandler('APPLY_RAG_HIGHLIGHTS', (msg) => this.handleApplyHighlights(msg));
                messageHandler.registerHandler('CLEAR_RAG_HIGHLIGHTS', (msg) => this.handleClearHighlights(msg));
                messageHandler.registerHandler('ADD_RAG_LOG', (msg) => this.handleAddLog(msg));
                messageHandler.registerHandler('GET_RAG_STATUS', () => this.handleGetStatus());
            }
            
            // Also setup direct Chrome runtime listeners
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
                chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                    if (message.action === 'APPLY_RAG_HIGHLIGHTS') {
                        this.handleApplyHighlights(message).then(sendResponse);
                        return true; // Async response
                    }
                    // Add other message handlers as needed
                });
            }
            
            console.log('🤖 Message handlers registered');
        }
        
        /**
         * Setup event listeners
         * @private
         */
        setupEventListeners() {
            // Listen for highlight events from TextHighlighter if available
            if (this.dependencies.textHighlighter) {
                // Custom events could be added here
            }
        }
        
        // ================================
        // Message Handlers
        // ================================
        
        /**
         * Handle show RAG overlay
         */
        async handleShowOverlay(message) {
            try {
                console.log('🤖 Showing RAG overlay');
                
                this.state.ragAnalysisRunning = true;
                this.state.currentPhase = message.phase || 'initializing';
                this.state.progress = 0;
                
                if (this.config.showOverlay && this.dependencies.overlayManager) {
                    this.dependencies.overlayManager.show();
                    
                    if (message.title) {
                        this.dependencies.overlayManager.setTitle?.(message.title);
                    }
                    
                    if (message.message) {
                        this.dependencies.overlayManager.updateMessage?.(message.message);
                    }
                }
                
                if (this.dependencies.ragLogger && message.showLogs) {
                    this.dependencies.ragLogger.show?.();
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error showing RAG overlay:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle hide RAG overlay
         */
        async handleHideOverlay(message) {
            try {
                console.log('🤖 Hiding RAG overlay');
                
                this.state.ragAnalysisRunning = false;
                this.state.currentPhase = null;
                
                if (this.dependencies.overlayManager) {
                    this.dependencies.overlayManager.hide();
                }
                
                if (this.dependencies.ragLogger && message.hideLogs) {
                    this.dependencies.ragLogger.hide?.();
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error hiding RAG overlay:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle update RAG overlay
         */
        async handleUpdateOverlay(message) {
            try {
                if (message.phase) {
                    this.state.currentPhase = message.phase;
                }
                
                if (typeof message.progress === 'number') {
                    this.state.progress = message.progress;
                }
                
                if (this.dependencies.overlayManager) {
                    if (typeof message.progress === 'number') {
                        this.dependencies.overlayManager.updateProgress?.(
                            message.progress, 
                            message.phase, 
                            message.message
                        );
                    } else if (message.message) {
                        this.dependencies.overlayManager.updateMessage?.(message.message);
                    }
                }
                
                if (message.log && this.dependencies.ragLogger) {
                    this.dependencies.ragLogger.addLog?.(message.log, message.logType || 'info');
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error updating RAG overlay:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle apply RAG highlights - Main entry point for highlighting
         */
        async handleApplyHighlights(message) {
            try {
                console.log('🤖 Applying RAG highlights');
                
                const highlights = message.highlights || [];
                
                if (!highlights.length) {
                    return { success: false, error: 'No highlights provided' };
                }
                
                // Reset processing stats
                this.state.processingStats = {
                    total: highlights.length,
                    processed: 0,
                    successful: 0,
                    failed: 0
                };
                
                // Show overlay if configured
                if (this.config.showOverlay) {
                    await this.showOverlay({ 
                        title: 'Applying RAG Highlights',
                        message: `Processing ${highlights.length} highlights...`
                    });
                }
                
                // Process highlights in batches
                const results = await this.processHighlightBatches(highlights);
                
                // Auto-hide overlay if configured
                if (this.config.autoHideOverlay) {
                    setTimeout(() => {
                        this.hideOverlay();
                    }, this.config.overlayHideDelay);
                }
                
                return { 
                    success: true, 
                    results,
                    stats: this.state.processingStats
                };
                
            } catch (error) {
                console.error('❌ Error applying RAG highlights:', error);
                this.hideOverlay();
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle clear RAG highlights
         */
        async handleClearHighlights(message) {
            try {
                console.log('🤖 Clearing RAG highlights');
                
                // Clear highlights via TextHighlighter
                if (this.dependencies.textHighlighter) {
                    this.dependencies.textHighlighter.clearAllHighlights?.();
                }
                
                // Clear internal state
                this.state.appliedHighlights.clear();
                this.state.highlightQueue = [];
                
                // Clear logs if requested
                if (message.clearLogs && this.dependencies.ragLogger) {
                    this.dependencies.ragLogger.clear?.();
                }
                
                this.state.logs = [];
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error clearing RAG highlights:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle add RAG log
         */
        handleAddLog(message) {
            try {
                const log = {
                    message: message.message || '',
                    type: message.type || 'info',
                    timestamp: Date.now()
                };
                
                this.state.logs.push(log);
                
                // Keep only last 100 logs
                if (this.state.logs.length > 100) {
                    this.state.logs = this.state.logs.slice(-100);
                }
                
                if (this.dependencies.ragLogger) {
                    this.dependencies.ragLogger.addLog?.(log.message, log.type);
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error adding RAG log:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle get RAG status
         */
        handleGetStatus() {
            return {
                isInitialized: this.isInitialized,
                ragAnalysisRunning: this.state.ragAnalysisRunning,
                currentPhase: this.state.currentPhase,
                progress: this.state.progress,
                logCount: this.state.logs.length,
                appliedHighlights: this.state.appliedHighlights.size,
                processingStats: this.state.processingStats,
                dependencies: {
                    hasOverlayManager: !!this.dependencies.overlayManager,
                    hasTextHighlighter: !!this.dependencies.textHighlighter,
                    hasTextSearchUtility: !!this.dependencies.textSearchUtility,
                    hasTextMarker: !!this.dependencies.textMarker,
                    hasLogger: !!this.dependencies.ragLogger
                }
            };
        }
        
        // ================================
        // Highlight Processing
        // ================================
        
        /**
         * Process highlights in batches for better performance
         * @private
         */
        async processHighlightBatches(highlights) {
            const results = [];
            this.state.isProcessing = true;
            
            try {
                for (let i = 0; i < highlights.length; i += this.config.batchSize) {
                    const batch = highlights.slice(i, i + this.config.batchSize);
                    
                    // Update progress
                    const progress = Math.round((i / highlights.length) * 100);
                    await this.updateProgress(
                        progress,
                        'highlighting',
                        `Processing batch ${Math.floor(i / this.config.batchSize) + 1}...`
                    );
                    
                    // Process batch in parallel
                    const batchResults = await Promise.all(
                        batch.map(highlight => this.applySingleHighlight(highlight))
                    );
                    
                    results.push(...batchResults);
                    this.state.processingStats.processed += batch.length;
                    
                    // Update successful/failed counts
                    batchResults.forEach(result => {
                        if (result.success) {
                            this.state.processingStats.successful++;
                        } else {
                            this.state.processingStats.failed++;
                        }
                    });
                    
                    // Add delay between batches to prevent UI blocking
                    if (i + this.config.batchSize < highlights.length) {
                        await this.delay(this.config.batchDelay);
                    }
                }
                
                // Final update
                await this.updateProgress(
                    100,
                    'complete',
                    `Completed: ${this.state.processingStats.successful}/${highlights.length} highlights applied`
                );
                
                console.log('✅ Highlight processing complete:', this.state.processingStats);
                
            } finally {
                this.state.isProcessing = false;
            }
            
            return results;
        }
        
        /**
         * Apply a single highlight
         * @private
         */
        async applySingleHighlight(highlight) {
            try {
                // Skip if already applied
                if (this.state.appliedHighlights.has(highlight.id)) {
                    return { 
                        success: true, 
                        highlightId: highlight.id,
                        skipped: true,
                        reason: 'Already applied'
                    };
                }
                
                // Validate highlight data
                if (!this.validateHighlight(highlight)) {
                    return {
                        success: false,
                        highlightId: highlight.id,
                        error: 'Invalid highlight data'
                    };
                }
                
                // Find text in DOM using TextSearchUtility
                const range = await this.findTextRange(highlight);
                
                if (!range) {
                    console.warn(`Text not found for highlight ${highlight.id}`);
                    return {
                        success: false,
                        highlightId: highlight.id,
                        error: 'Text not found in DOM'
                    };
                }
                
                // Apply highlight using TextHighlighter
                const result = await this.applyHighlightToRange(range, highlight);
                
                if (result) {
                    // Track as applied
                    this.state.appliedHighlights.add(highlight.id);
                    
                    // Create marker if configured
                    if (highlight.showMarker !== false) {
                        await this.createMarkerForHighlight(result.element, highlight);
                    }
                    
                    return {
                        success: true,
                        highlightId: highlight.id,
                        resultId: result.id
                    };
                }
                
                return {
                    success: false,
                    highlightId: highlight.id,
                    error: 'Failed to create highlight'
                };
                
            } catch (error) {
                console.error(`Error applying highlight ${highlight.id}:`, error);
                return {
                    success: false,
                    highlightId: highlight.id,
                    error: error.message
                };
            }
        }
        
        /**
         * Find text range in DOM
         * @private
         */
        async findTextRange(highlight) {
            if (!this.dependencies.textSearchUtility) {
                console.warn('TextSearchUtility not available, using fallback');
                return this.fallbackFindText(highlight.sentence || highlight.text);
            }
            
            return this.dependencies.textSearchUtility.findText(
                highlight.sentence || highlight.text,
                {
                    section: highlight.section,
                    sentenceIndex: highlight.sentenceIndex,
                    caseSensitive: false,
                    normalizeWhitespace: true
                }
            );
        }
        
        /**
         * Fallback text search when TextSearchUtility is not available
         * @private
         */
        fallbackFindText(text) {
            if (!text || !window.find) return null;
            
            const selection = window.getSelection();
            const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
            
            selection.removeAllRanges();
            
            try {
                if (window.find(text, false, false, true, false, true, false)) {
                    return selection.getRangeAt(0).cloneRange();
                }
            } finally {
                selection.removeAllRanges();
                if (savedRange) {
                    selection.addRange(savedRange);
                }
            }
            
            return null;
        }
        
        /**
         * Apply highlight to a DOM range
         * @private
         */
        async applyHighlightToRange(range, highlight) {
            if (!this.dependencies.textHighlighter) {
                console.warn('TextHighlighter not available, using basic highlighting');
                return this.applyBasicHighlight(range, highlight);
            }
            
            // Prepare highlight data for TextHighlighter
            const highlightData = {
                range,
                text: highlight.sentence || highlight.text || range.toString(),
                property: {
                    id: highlight.propertyId || highlight.property?.id || 'unknown',
                    label: highlight.propertyLabel || highlight.property?.label || 'Unknown Property',
                    color: highlight.color || this.getRandomColor()
                },
                confidence: highlight.confidence || 0.5,
                section: highlight.section,
                sentenceIndex: highlight.sentenceIndex
            };
            
            // Use TextHighlighter's RAG highlighting method
            return this.dependencies.textHighlighter.highlightFromRAG(highlightData);
        }
        
        /**
         * Apply basic highlight when TextHighlighter is not available
         * @private
         */
        applyBasicHighlight(range, highlight) {
            try {
                const span = document.createElement('span');
                span.className = 'orkg-rag-highlight';
                span.style.backgroundColor = highlight.color || this.getRandomColor();
                span.dataset.highlightId = highlight.id;
                span.dataset.propertyId = highlight.propertyId || '';
                span.dataset.propertyLabel = highlight.propertyLabel || '';
                
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
                
                return {
                    id: highlight.id,
                    element: span,
                    text: span.textContent
                };
                
            } catch (error) {
                console.error('Error applying basic highlight:', error);
                return null;
            }
        }
        
        /**
         * Create marker for highlighted element
         * @private
         */
        async createMarkerForHighlight(element, highlight) {
            if (!this.dependencies.textMarker || !element) return;
            
            try {
                const markerData = {
                    element,
                    id: `marker_${highlight.id}`,
                    property: highlight.property || {
                        id: highlight.propertyId,
                        label: highlight.propertyLabel
                    },
                    confidence: highlight.confidence,
                    color: highlight.color
                };
                
                return this.dependencies.textMarker.createMarker(markerData);
                
            } catch (error) {
                console.warn('Failed to create marker:', error);
                return null;
            }
        }
        
        // ================================
        // Utility Methods
        // ================================
        
        /**
         * Validate highlight data
         * @private
         */
        validateHighlight(highlight) {
            if (!highlight || typeof highlight !== 'object') {
                return false;
            }
            
            // Must have either sentence or text
            if (!highlight.sentence && !highlight.text) {
                console.warn('Highlight missing text content:', highlight);
                return false;
            }
            
            // Must have an ID
            if (!highlight.id) {
                highlight.id = `rag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            return true;
        }
        
        /**
         * Get random color for highlights
         * @private
         */
        getRandomColor() {
            const colors = [
                '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
                '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        /**
         * Delay helper for batch processing
         * @private
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        // ================================
        // Public API Methods
        // ================================
        
        /**
         * Show RAG overlay programmatically
         */
        showOverlay(options = {}) {
            return this.handleShowOverlay(options);
        }
        
        /**
         * Hide RAG overlay programmatically
         */
        hideOverlay(options = {}) {
            return this.handleHideOverlay(options);
        }
        
        /**
         * Update overlay progress
         */
        updateProgress(progress, phase, message) {
            return this.handleUpdateOverlay({ progress, phase, message });
        }
        
        /**
         * Add a log entry
         */
        addLog(message, type = 'info') {
            return this.handleAddLog({ message, type });
        }
        
        /**
         * Apply highlights programmatically
         */
        applyHighlights(highlights) {
            return this.handleApplyHighlights({ highlights });
        }
        
        /**
         * Clear all highlights
         */
        clearHighlights(options = {}) {
            return this.handleClearHighlights(options);
        }
        
        /**
         * Get current state
         */
        getState() {
            return { ...this.state };
        }
        
        /**
         * Get status
         */
        getStatus() {
            return this.handleGetStatus();
        }
        
        /**
         * Check if analysis is running
         */
        isAnalysisRunning() {
            return this.state.ragAnalysisRunning;
        }
        
        /**
         * Check if processing highlights
         */
        isProcessing() {
            return this.state.isProcessing;
        }
        
        /**
         * Update configuration
         */
        updateConfig(config) {
            this.config = { ...this.config, ...config };
        }
        
        /**
         * Clean up the handler
         */
        cleanup() {
            console.log('🧹 Cleaning up RAGHandler...');
            
            // Hide overlay
            if (this.dependencies.overlayManager) {
                this.dependencies.overlayManager.hide();
            }
            
            // Clear highlights
            this.clearHighlights({ clearLogs: true });
            
            // Reset state
            this.state = {
                ragAnalysisRunning: false,
                currentPhase: null,
                progress: 0,
                logs: [],
                appliedHighlights: new Set(),
                highlightQueue: [],
                isProcessing: false,
                processingStats: {
                    total: 0,
                    processed: 0,
                    successful: 0,
                    failed: 0
                }
            };
            
            // Clear dependencies
            this.dependencies = {
                overlayManager: null,
                textHighlighter: null,
                textSearchUtility: null,
                textMarker: null,
                imageMarker: null,
                ragLogger: null
            };
            
            this.isInitialized = false;
            
            console.log('✅ RAGHandler cleanup completed');
        }
    }
    
    // Create singleton instance
    const ragHandler = new RAGHandler();
    
    // Register with service registry if available
    if (global.serviceRegistry) {
        global.serviceRegistry.register('ragHandler', ragHandler);
    }
    
    // Expose globally
    global.ragHandler = ragHandler;
    global.RAGHandler = RAGHandler;
    
    console.log('📢 RAGHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[handlers/RAGHandler.js] Error:', error);
    }
  })();

  // ===== Module: handlers/MarkerHandler.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/handlers/MarkerHandler.js
// Lightweight coordinator for all marker types
// ================================

(function(global) {
    'use strict';
    
    /**
     * MarkerHandler - Lightweight Coordinator
     * 
     * Manages multiple marker types without duplicating their functionality.
     * Acts as a message broker and status aggregator.
     */
    class MarkerHandler {
        constructor() {
            this.markerInstances = new Map();
            this.markerTypes = new Map();
            this.isInitialized = false;
            
            console.log('📍 MarkerHandler coordinator created');
        }
        
        /**
         * Initialize the marker handler
         */
        async init() {
            if (this.isInitialized) {
                console.warn('MarkerHandler already initialized');
                return;
            }
            
            console.log('📍 Initializing MarkerHandler...');
            
            try {
                // Register available marker types
                this.registerAvailableMarkers();
                
                // Setup message handlers
                this.registerMessageHandlers();
                
                this.isInitialized = true;
                console.log('✅ MarkerHandler initialized');
                
            } catch (error) {
                console.error('❌ Failed to initialize MarkerHandler:', error);
                throw error;
            }
        }
        
        /**
         * Register available marker types
         * @private
         */
        registerAvailableMarkers() {
            // Register text marker if available
            if (typeof TextMarker !== 'undefined') {
                this.registerMarkerType('text', TextMarker);
            }
            
            // Register image marker if available
            if (typeof ImageMarker !== 'undefined') {
                this.registerMarkerType('image', ImageMarker);
            }
            
            // Register table marker if available
            if (typeof TableMarker !== 'undefined') {
                this.registerMarkerType('table', TableMarker);
            }
            
            console.log(`📍 Registered ${this.markerTypes.size} marker types:`, 
                Array.from(this.markerTypes.keys()));
        }
        
        /**
         * Register a marker type
         * @param {string} type - The marker type identifier
         * @param {Class} MarkerClass - The marker class constructor
         */
        registerMarkerType(type, MarkerClass) {
            if (this.markerTypes.has(type)) {
                console.warn(`Marker type '${type}' already registered`);
                return;
            }
            
            this.markerTypes.set(type, MarkerClass);
            console.log(`📍 Registered marker type: ${type}`);
        }
        
        /**
         * Get or create marker instance
         * @private
         */
        getMarkerInstance(type) {
            if (!this.markerTypes.has(type)) {
                console.warn(`Marker type '${type}' not registered`);
                return null;
            }
            
            if (!this.markerInstances.has(type)) {
                const MarkerClass = this.markerTypes.get(type);
                const instance = new MarkerClass();
                this.markerInstances.set(type, instance);
            }
            
            return this.markerInstances.get(type);
        }
        
        /**
         * Register message handlers
         * @private
         */
        registerMessageHandlers() {
            const messageHandler = global.serviceRegistry?.get('messageHandler');
            
            if (messageHandler) {
                // Register handlers with MessageHandler service
                messageHandler.registerHandler('ACTIVATE_MARKERS', (msg) => this.handleActivateMarkers(msg));
                messageHandler.registerHandler('DEACTIVATE_MARKERS', (msg) => this.handleDeactivateMarkers(msg));
                messageHandler.registerHandler('UPDATE_MARKERS', (msg) => this.handleUpdateMarkers(msg));
                messageHandler.registerHandler('SYNC_MARKERS', (msg) => this.handleSyncMarkers(msg));
                messageHandler.registerHandler('GET_MARKER_STATUS', () => this.handleGetStatus());
                messageHandler.registerHandler('CLEAR_MARKERS', (msg) => this.handleClearMarkers(msg));
                
                console.log('📍 Marker message handlers registered with MessageHandler service');
            } else {
                // Fallback: listen directly to chrome runtime messages
                if (chrome && chrome.runtime && chrome.runtime.onMessage) {
                    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                        this.handleMessage(message, sendResponse);
                        return true; // Keep message channel open for async response
                    });
                    console.log('📍 Marker message handlers registered with chrome.runtime');
                } else {
                    console.warn('⚠️ No message handler available for MarkerHandler');
                }
            }
        }
        
        /**
         * Handle direct chrome runtime messages
         * @private
         */
        async handleMessage(message, sendResponse) {
            const { action } = message;
            let response;
            
            switch (action) {
                case 'ACTIVATE_MARKERS':
                    response = await this.handleActivateMarkers(message);
                    break;
                case 'DEACTIVATE_MARKERS':
                    response = await this.handleDeactivateMarkers(message);
                    break;
                case 'UPDATE_MARKERS':
                    response = await this.handleUpdateMarkers(message);
                    break;
                case 'SYNC_MARKERS':
                    response = await this.handleSyncMarkers(message);
                    break;
                case 'GET_MARKER_STATUS':
                    response = this.handleGetStatus();
                    break;
                case 'CLEAR_MARKERS':
                    response = await this.handleClearMarkers(message);
                    break;
                default:
                    return; // Not a marker message
            }
            
            if (sendResponse) {
                sendResponse(response);
            }
        }
        
        // ================================
        // Message Handlers
        // ================================
        
        /**
         * Handle activate markers request
         */
        async handleActivateMarkers(message) {
            try {
                console.log('📍 Activating markers:', message);
                
                const config = message.config || {};
                const types = config.types || Array.from(this.markerTypes.keys());
                const results = {};
                let totalCount = 0;
                
                // Activate each requested marker type
                for (const type of types) {
                    const marker = this.getMarkerInstance(type);
                    
                    if (marker) {
                        try {
                            const result = await marker.activate(config);
                            results[type] = result;
                            totalCount += result.count || 0;
                        } catch (error) {
                            console.error(`❌ Failed to activate ${type} markers:`, error);
                            results[type] = { 
                                success: false, 
                                error: error.message,
                                count: 0 
                            };
                        }
                    } else {
                        results[type] = { 
                            success: false, 
                            error: 'Marker type not available',
                            count: 0 
                        };
                    }
                }
                
                console.log(`✅ Markers activated: ${totalCount} total markers created`);
                
                // Update ContentScriptManager if available
                const contentScriptManager = global.serviceRegistry?.get('contentScriptManager');
                if (contentScriptManager) {
                    contentScriptManager.updateState({ markersActivated: totalCount > 0 });
                }
                
                return {
                    success: true,
                    markersActivated: totalCount > 0,
                    results: results,
                    totalMarkers: totalCount
                };
                
            } catch (error) {
                console.error('❌ Error activating markers:', error);
                return { 
                    success: false, 
                    error: error.message,
                    markersActivated: false 
                };
            }
        }
        
        /**
         * Handle deactivate markers request
         */
        async handleDeactivateMarkers(message) {
            try {
                console.log('📍 Deactivating markers:', message);
                
                const types = message.types || Array.from(this.markerInstances.keys());
                const results = {};
                
                // Deactivate specified marker types
                for (const type of types) {
                    const marker = this.markerInstances.get(type);
                    
                    if (marker) {
                        try {
                            marker.deactivate();
                            results[type] = { success: true };
                        } catch (error) {
                            console.error(`❌ Failed to deactivate ${type} markers:`, error);
                            results[type] = { 
                                success: false, 
                                error: error.message 
                            };
                        }
                    }
                }
                
                // Check if any markers are still active
                const anyActive = Array.from(this.markerInstances.values())
                    .some(marker => marker.isActive);
                
                // Update ContentScriptManager if available
                const contentScriptManager = global.serviceRegistry?.get('contentScriptManager');
                if (contentScriptManager) {
                    contentScriptManager.updateState({ markersActivated: anyActive });
                }
                
                console.log('✅ Markers deactivated');
                
                return {
                    success: true,
                    markersActivated: anyActive,
                    results: results
                };
                
            } catch (error) {
                console.error('❌ Error deactivating markers:', error);
                return { 
                    success: false, 
                    error: error.message 
                };
            }
        }
        
        /**
         * Handle update markers request
         */
        async handleUpdateMarkers(message) {
            try {
                console.log('📍 Updating markers:', message);
                
                const { type, markerId, updates } = message;
                
                if (!type) {
                    return { 
                        success: false, 
                        error: 'Marker type required' 
                    };
                }
                
                const marker = this.markerInstances.get(type);
                
                if (!marker) {
                    return { 
                        success: false, 
                        error: `Marker type '${type}' not active` 
                    };
                }
                
                // Update specific marker
                if (markerId && marker.updateMarker) {
                    marker.updateMarker(markerId, updates);
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error updating markers:', error);
                return { 
                    success: false, 
                    error: error.message 
                };
            }
        }
        
        /**
         * Handle sync markers with analyzer
         */
        async handleSyncMarkers(message) {
            try {
                console.log('📍 Syncing markers with analyzer:', message);
                
                const { type, items } = message;
                
                if (!type) {
                    // Sync all marker types
                    for (const [markerType, marker] of this.markerInstances) {
                        if (marker.syncWithAnalyzer) {
                            marker.syncWithAnalyzer(items?.[markerType] || []);
                        }
                    }
                } else {
                    // Sync specific marker type
                    const marker = this.markerInstances.get(type);
                    if (marker && marker.syncWithAnalyzer) {
                        marker.syncWithAnalyzer(items || []);
                    }
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error syncing markers:', error);
                return { 
                    success: false, 
                    error: error.message 
                };
            }
        }
        
        /**
         * Handle clear markers request
         */
        async handleClearMarkers(message) {
            try {
                console.log('📍 Clearing markers:', message);
                
                const types = message.types || Array.from(this.markerInstances.keys());
                
                for (const type of types) {
                    const marker = this.markerInstances.get(type);
                    if (marker && marker.cleanup) {
                        marker.cleanup();
                    }
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error clearing markers:', error);
                return { 
                    success: false, 
                    error: error.message 
                };
            }
        }
        
        /**
         * Handle get marker status request
         */
        handleGetStatus() {
            const status = {
                isInitialized: this.isInitialized,
                availableTypes: Array.from(this.markerTypes.keys()),
                activeTypes: [],
                markers: {}
            };
            
            // Collect status from each marker instance
            for (const [type, marker] of this.markerInstances) {
                const markerStatus = marker.getStatus ? marker.getStatus() : {
                    isActive: marker.isActive || false,
                    markerCount: marker.markers?.size || 0
                };
                
                status.markers[type] = markerStatus;
                
                if (markerStatus.isActive) {
                    status.activeTypes.push(type);
                }
            }
            
            // Calculate totals
            status.totalMarkers = Object.values(status.markers)
                .reduce((sum, m) => sum + (m.markerCount || 0), 0);
            
            status.markersActivated = status.activeTypes.length > 0;
            
            return status;
        }
        
        // ================================
        // Public API Methods
        // ================================
        
        /**
         * Activate markers programmatically
         */
        async activateMarkers(config = {}) {
            return this.handleActivateMarkers({ config });
        }
        
        /**
         * Deactivate markers programmatically
         */
        async deactivateMarkers(types) {
            return this.handleDeactivateMarkers({ types });
        }
        
        /**
         * Clear all markers
         */
        async clearAll() {
            return this.handleClearMarkers({});
        }
        
        /**
         * Get specific marker instance
         */
        getMarker(type) {
            return this.markerInstances.get(type);
        }
        
        /**
         * Check if any markers are active
         */
        hasActiveMarkers() {
            return Array.from(this.markerInstances.values())
                .some(marker => marker.isActive);
        }
        
        /**
         * Get active marker types
         */
        getActiveTypes() {
            return Array.from(this.markerInstances.entries())
                .filter(([type, marker]) => marker.isActive)
                .map(([type]) => type);
        }
        
        /**
         * Get total marker count across all types
         */
        getTotalMarkerCount() {
            return Array.from(this.markerInstances.values())
                .reduce((sum, marker) => sum + (marker.markers?.size || 0), 0);
        }
        
        /**
         * Get marker count by type
         */
        getMarkerCount(type) {
            const marker = this.markerInstances.get(type);
            return marker?.markers?.size || 0;
        }
        
        /**
         * Clean up the handler
         */
        cleanup() {
            console.log('🧹 Cleaning up MarkerHandler...');
            
            // Deactivate and cleanup all markers
            for (const [type, marker] of this.markerInstances) {
                try {
                    if (marker.isActive) {
                        marker.deactivate();
                    }
                    if (marker.cleanup) {
                        marker.cleanup();
                    }
                } catch (error) {
                    console.error(`Error cleaning up ${type} marker:`, error);
                }
            }
            
            // Clear instances
            this.markerInstances.clear();
            
            this.isInitialized = false;
            
            console.log('✅ MarkerHandler cleanup completed');
        }
    }
    
    // Create singleton instance
    const markerHandler = new MarkerHandler();
    
    // Register with service registry if available
    if (global.serviceRegistry) {
        global.serviceRegistry.register('markerHandler', markerHandler);
    }
    
    // Expose globally for backward compatibility
    global.markerHandler = markerHandler;
    global.MarkerHandler = MarkerHandler;
    
    console.log('📢 MarkerHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[handlers/MarkerHandler.js] Error:', error);
    }
  })();

  // ===== Module: handlers/PropertyHandler.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/handlers/PropertyHandler.js
// ================================

(function(global) {
  'use strict';
  
  /**
   * PropertyHandler Service
   * 
   * Handles all property window related messages and operations
   * including showing, hiding, updating, and managing property selections
   */
  class PropertyHandler {
    constructor() {
      this.isInitialized = false;
      this.propertyWindow = null;
      this.selectionManager = null;
      
      // Property-specific state
      this.state = {
        windowVisible: false,
        selectedText: '',
        selectedProperty: null,
        properties: [],
        aiSuggestions: [],
        currentColor: null,
        position: { x: 0, y: 0 }
      };
      
      console.log('🏷️ PropertyHandler instance created');
    }
    
    /**
     * Initialize the property handler
     */
    async init() {
      if (this.isInitialized) {
        console.warn('PropertyHandler already initialized');
        return;
      }
      
      console.log('🏷️ Initializing PropertyHandler...');
      
      try {
        // Setup dependencies
        this.setupDependencies();
        
        // Register message handlers
        this.registerMessageHandlers();
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ PropertyHandler initialized');
      } catch (error) {
        console.error('❌ Failed to initialize PropertyHandler:', error);
        throw error;
      }
    }
    
    /**
     * Setup dependencies from service registry
     * @private
     */
    setupDependencies() {
      const registry = global.serviceRegistry;
      if (!registry) return;
      
      // Get SelectionManager
      this.selectionManager = registry.get('selectionManager');
      
      // Get or create PropertyWindow
      if (typeof PropertyWindow !== 'undefined') {
        this.propertyWindow = new PropertyWindow();
      } else if (typeof PropertyWindow !== 'undefined') {
        this.propertyWindow = new PropertyWindow();
      } else {
        this.propertyWindow = registry.get('propertyWindow');
      }
      
      // Register property window with service registry if not already registered
      if (this.propertyWindow && !registry.has('propertyWindow')) {
        registry.register('propertyWindow', this.propertyWindow);
      }
      
      console.log('🏷️ Dependencies setup:', {
        hasSelectionManager: !!this.selectionManager,
        hasPropertyWindow: !!this.propertyWindow
      });
    }
    
    /**
     * Register message handlers with MessageHandler
     * @private
     */
    registerMessageHandlers() {
      const messageHandler = global.serviceRegistry?.get('messageHandler');
      if (!messageHandler) {
        console.warn('⚠️ MessageHandler not available for PropertyHandler');
        return;
      }
      
      // Register property-specific message handlers
      messageHandler.registerHandler('SHOW_PROPERTY_WINDOW', (msg) => this.handleShowWindow(msg));
      messageHandler.registerHandler('HIDE_PROPERTY_WINDOW', (msg) => this.handleHideWindow(msg));
      messageHandler.registerHandler('UPDATE_PROPERTY_WINDOW', (msg) => this.handleUpdateWindow(msg));
      messageHandler.registerHandler('SET_SELECTED_PROPERTY', (msg) => this.handleSetSelectedProperty(msg));
      messageHandler.registerHandler('GET_PROPERTY_SUGGESTIONS', (msg) => this.handleGetSuggestions(msg));
      messageHandler.registerHandler('APPLY_HIGHLIGHT', (msg) => this.handleApplyHighlight(msg));
      messageHandler.registerHandler('GET_PROPERTY_STATUS', () => this.handleGetStatus());
      
      console.log('🏷️ Property message handlers registered');
    }
    
    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
      // Listen for text selection events from SelectionManager
      if (this.selectionManager) {
        // SelectionManager will call showPropertyWindow directly
        console.log('🏷️ Connected to SelectionManager');
      }
      
      // Listen for property window events
      if (this.propertyWindow) {
        // Property window will send messages through chrome.runtime.sendMessage
        console.log('🏷️ Connected to PropertyWindow');
      }
    }
    
    // ================================
    // Message Handlers
    // ================================
    
    /**
     * Handle show property window
     */
    async handleShowWindow(message) {
      try {
        console.log('🏷️ Showing property window');
        
        // Update state
        this.state.windowVisible = true;
        this.state.selectedText = message.text || '';
        this.state.position = message.position || { x: 0, y: 0 };
        
        // Create or show property window
        if (!this.propertyWindow) {
          this.createPropertyWindow();
        }
        
        if (this.propertyWindow) {
          // Initialize if needed
          if (typeof this.propertyWindow.init === 'function' && !this.propertyWindow.isInitialized) {
            await this.propertyWindow.init();
          }
          
          // Show window
          if (typeof this.propertyWindow.show === 'function') {
            this.propertyWindow.show(this.state.selectedText, this.state.position);
          }
          
          // Load properties if requested
          if (message.loadProperties) {
            await this.loadProperties(message.query);
          }
          
          // Get AI suggestions if requested
          if (message.getSuggestions) {
            await this.getAISuggestions(this.state.selectedText);
          }
        }
        
        return { success: true };
        
      } catch (error) {
        console.error('❌ Error showing property window:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle hide property window
     */
    async handleHideWindow(message) {
      try {
        console.log('🏷️ Hiding property window');
        
        // Update state
        this.state.windowVisible = false;
        
        // Hide window
        if (this.propertyWindow && typeof this.propertyWindow.hide === 'function') {
          this.propertyWindow.hide();
        }
        
        // Clear state if requested
        if (message.clearState) {
          this.clearState();
        }
        
        return { success: true };
        
      } catch (error) {
        console.error('❌ Error hiding property window:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle update property window
     */
    async handleUpdateWindow(message) {
      try {
        console.log('🏷️ Updating property window');
        
        // Update properties list
        if (message.properties) {
          this.state.properties = message.properties;
          
          if (this.propertyWindow && typeof this.propertyWindow.updateProperties === 'function') {
            this.propertyWindow.updateProperties(message.properties);
          }
        }
        
        // Update AI suggestions
        if (message.suggestions) {
          this.state.aiSuggestions = message.suggestions;
          
          if (this.propertyWindow && typeof this.propertyWindow.updateSuggestions === 'function') {
            this.propertyWindow.updateSuggestions(message.suggestions);
          }
        }
        
        // Update selected color
        if (message.color) {
          this.state.currentColor = message.color;
          
          if (this.propertyWindow && typeof this.propertyWindow.setColor === 'function') {
            this.propertyWindow.setColor(message.color);
          }
        }
        
        // Update position
        if (message.position) {
          this.state.position = message.position;
          
          if (this.propertyWindow && typeof this.propertyWindow.updatePosition === 'function') {
            this.propertyWindow.updatePosition(message.position);
          }
        }
        
        return { success: true };
        
      } catch (error) {
        console.error('❌ Error updating property window:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle set selected property
     */
    async handleSetSelectedProperty(message) {
      try {
        console.log('🏷️ Setting selected property:', message.property);
        
        this.state.selectedProperty = message.property;
        
        // Update window if visible
        if (this.state.windowVisible && this.propertyWindow) {
          if (typeof this.propertyWindow.setSelectedProperty === 'function') {
            this.propertyWindow.setSelectedProperty(message.property);
          }
        }
        
        // Apply highlight if requested
        if (message.applyHighlight) {
          await this.applyPropertyHighlight();
        }
        
        return { success: true, property: this.state.selectedProperty };
        
      } catch (error) {
        console.error('❌ Error setting selected property:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle get property suggestions
     */
    async handleGetSuggestions(message) {
      try {
        console.log('🏷️ Getting property suggestions for:', message.text);
        
        const suggestions = await this.getAISuggestions(message.text || this.state.selectedText);
        
        return { 
          success: true, 
          suggestions: suggestions 
        };
        
      } catch (error) {
        console.error('❌ Error getting suggestions:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle apply property highlight
     */
    async handleApplyHighlight(message) {
      try {
        console.log('🏷️ Applying property highlight');
        
        const property = message.property || this.state.selectedProperty;
        const color = message.color || this.state.currentColor || this.getRandomColor();
        const text = message.text || this.state.selectedText;
        
        if (!property || !text) {
          return { success: false, error: 'Missing property or text' };
        }
        
        // Get text highlighter
        const textHighlighter = global.TextHighlighter || 
                               global.serviceRegistry?.get('textHighlighter');
        
        if (textHighlighter) {
          // Apply highlight
          const result = textHighlighter.highlightSelection?.(property, color) || 
                        textHighlighter.highlight?.(text, property, color);
          
          if (result) {
            // Hide property window after successful highlight
            if (message.hideWindow !== false) {
              await this.handleHideWindow({ clearState: false });
            }
            
            return { success: true, highlightId: result.id };
          }
        }
        
        return { success: false, error: 'Could not apply highlight' };
        
      } catch (error) {
        console.error('❌ Error applying highlight:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle get property status
     */
    handleGetStatus() {
      return {
        isInitialized: this.isInitialized,
        windowVisible: this.state.windowVisible,
        hasSelectedText: !!this.state.selectedText,
        hasSelectedProperty: !!this.state.selectedProperty,
        propertyCount: this.state.properties.length,
        suggestionCount: this.state.aiSuggestions.length,
        hasPropertyWindow: !!this.propertyWindow,
        hasSelectionManager: !!this.selectionManager
      };
    }
    
    // ================================
    // Helper Methods
    // ================================
    
    /**
     * Create property window instance
     * @private
     */
    createPropertyWindow() {
      if (typeof PropertyWindow !== 'undefined') {
        this.propertyWindow = new PropertyWindow();
      } else if (typeof PropertyWindow !== 'undefined') {
        this.propertyWindow = new PropertyWindow();
      } else {
        console.warn('⚠️ Property window class not available');
      }
      
      if (this.propertyWindow) {
        // Register with service registry
        const registry = global.serviceRegistry;
        if (registry && !registry.has('propertyWindow')) {
          registry.register('propertyWindow', this.propertyWindow);
        }
      }
    }
    
    /**
     * Load properties from ORKG
     * @private
     */
    async loadProperties(query = '') {
      try {
        // Send message to background to fetch properties
        const response = await this.sendToBackground({
          action: 'FETCH_ORKG_PROPERTIES',
          query: query
        });
        
        if (response.success && response.properties) {
          this.state.properties = response.properties;
          
          // Update window
          if (this.propertyWindow && typeof this.propertyWindow.updateProperties === 'function') {
            this.propertyWindow.updateProperties(response.properties);
          }
        }
        
        return response.properties || [];
        
      } catch (error) {
        console.error('Error loading properties:', error);
        return [];
      }
    }
    
    /**
     * Get AI suggestions for text
     * @private
     */
    async getAISuggestions(text) {
      if (!text) return [];
      
      try {
        // Send message to background to get AI suggestions
        const response = await this.sendToBackground({
          action: 'GET_AI_PROPERTY_SUGGESTIONS',
          text: text
        });
        
        if (response.success && response.suggestions) {
          this.state.aiSuggestions = response.suggestions;
          
          // Update window
          if (this.propertyWindow && typeof this.propertyWindow.updateSuggestions === 'function') {
            this.propertyWindow.updateSuggestions(response.suggestions);
          }
        }
        
        return response.suggestions || [];
        
      } catch (error) {
        console.error('Error getting AI suggestions:', error);
        return [];
      }
    }
    
    /**
     * Apply property highlight to selected text
     * @private
     */
    async applyPropertyHighlight() {
      return this.handleApplyHighlight({
        property: this.state.selectedProperty,
        color: this.state.currentColor,
        text: this.state.selectedText,
        hideWindow: true
      });
    }
    
    /**
     * Get random color for highlights
     * @private
     */
    getRandomColor() {
      const colors = [
        '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
        '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3'
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Send message to background
     * @private
     */
    sendToBackground(message) {
      return new Promise((resolve, reject) => {
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage(message, response => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response || {});
            }
          });
        } else {
          reject(new Error('Chrome runtime not available'));
        }
      });
    }
    
    /**
     * Clear state
     * @private
     */
    clearState() {
      this.state = {
        windowVisible: false,
        selectedText: '',
        selectedProperty: null,
        properties: [],
        aiSuggestions: [],
        currentColor: null,
        position: { x: 0, y: 0 }
      };
    }
    
    // ================================
    // Public API Methods
    // ================================
    
    /**
     * Show property window programmatically
     */
    showWindow(text, position, options = {}) {
      return this.handleShowWindow({
        text,
        position,
        ...options
      });
    }
    
    /**
     * Hide property window programmatically
     */
    hideWindow(clearState = false) {
      return this.handleHideWindow({ clearState });
    }
    
    /**
     * Update property window
     */
    updateWindow(updates) {
      return this.handleUpdateWindow(updates);
    }
    
    /**
     * Set selected property
     */
    setSelectedProperty(property, applyHighlight = false) {
      return this.handleSetSelectedProperty({ property, applyHighlight });
    }
    
    /**
     * Check if window is visible
     */
    isWindowVisible() {
      return this.state.windowVisible;
    }
    
    /**
     * Get current state
     */
    getState() {
      return { ...this.state };
    }
    
    /**
     * Get selected text
     */
    getSelectedText() {
      return this.state.selectedText;
    }
    
    /**
     * Get selected property
     */
    getSelectedProperty() {
      return this.state.selectedProperty;
    }
    
    /**
     * Clean up the handler
     */
    cleanup() {
      console.log('🧹 Cleaning up PropertyHandler...');
      
      // Hide window
      if (this.propertyWindow) {
        this.hideWindow(true);
        
        // Clean up property window if it has cleanup method
        if (typeof this.propertyWindow.cleanup === 'function') {
          this.propertyWindow.cleanup();
        }
      }
      
      // Clear state
      this.clearState();
      
      this.isInitialized = false;
      
      console.log('✅ PropertyHandler cleanup completed');
    }
  }
  
  // Create instance
  const propertyHandler = new PropertyHandler();
  
  // Register with service registry
  if (global.serviceRegistry) {
    global.serviceRegistry.register('propertyHandler', propertyHandler);
  }
  
  // Expose globally for backward compatibility
  global.propertyHandler = propertyHandler;
  global.PropertyHandler = PropertyHandler;
  
  console.log('📢 PropertyHandler exposed to global scope');
  
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[handlers/PropertyHandler.js] Error:', error);
    }
  })();

  // ===== Module: init/MarkerSystemInit.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// src/content/modules/init/MarkerSystemInit.js
// Fixed version with proper PropertyWindow initialization

(function(global) {
    'use strict';
    
    class MarkerSystemInit {
        constructor() {
            this.initialized = false;
            this.markers = new Map();
            this.propertyWindow = null;
        }
        
        async initialize() {
            if (this.initialized) {
                console.log('✅ Marker system already initialized');
                return;
            }
            
            console.log('🚀 Initializing ORKG Marker System...');
            
            try {
                // Step 1: Verify core dependencies
                this.verifyDependencies();
                
                // Step 2: Initialize PropertyWindow
                this.initializePropertyWindow();
                
                // Step 3: Setup global click handler for menus
                this.setupGlobalMenuHandler();
                
                // Step 4: Initialize marker types
                await this.initializeMarkerTypes();
                
                // Step 5: Setup message handlers
                this.setupMessageHandlers();
                
                this.initialized = true;
                console.log('✅ ORKG Marker System initialized successfully!');
                
                // Notify that system is ready
                if (global.MarkerEventBus) {
                    global.MarkerEventBus.emit('system:ready');
                }
                
            } catch (error) {
                console.error('❌ Failed to initialize marker system:', error);
                throw error;
            }
        }
        
        verifyDependencies() {
            const required = [
                'BaseMarker',
                'MarkerUI',
                'MarkerRegistry',
                'MarkerEventBus',
                'IconRegistry',
                'ModalManager',
                'MenuActionHandler'
            ];
            
            const missing = required.filter(dep => !global[dep]);
            
            if (missing.length > 0) {
                throw new Error(`Missing dependencies: ${missing.join(', ')}`);
            }
            
            console.log('✅ All dependencies verified');
        }
        
        initializePropertyWindow() {
            // Check if PropertyWindow exists and create instance
            if (global.propertyWindow) {
                this.propertyWindow = global.propertyWindow;
                console.log('✅ Using existing propertyWindow instance');
            } else if (global.PropertyWindow) {
                // It's a class, create instance
                if (typeof global.PropertyWindow === 'function') {
                    this.propertyWindow = new global.PropertyWindow();
                    global.propertyWindow = this.propertyWindow; // Make it globally available
                    console.log('✅ Created new PropertyWindow instance');
                } else {
                    // It's already an instance
                    this.propertyWindow = global.PropertyWindow;
                    global.propertyWindow = this.propertyWindow;
                    console.log('✅ Using PropertyWindow object');
                }
            } else {
                console.warn('⚠️ PropertyWindow not available');
            }
        }
        
        setupGlobalMenuHandler() {
            // Remove any existing handler
            if (global.orkgMenuClickHandler) {
                document.removeEventListener('click', global.orkgMenuClickHandler, true);
            }
            
            // Create new handler
            global.orkgMenuClickHandler = (e) => {
                // Check if clicking on a marker (not menu)
                const marker = e.target.closest('.orkg-marker');
                if (marker && !e.target.closest('.orkg-marker-menu')) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const markerId = marker.dataset.markerId;
                    const menu = marker.querySelector('.orkg-marker-menu');
                    
                    if (menu) {
                        // Hide all other menus
                        document.querySelectorAll('.orkg-marker-menu.orkg-menu-visible').forEach(m => {
                            if (m !== menu) {
                                m.classList.remove('orkg-menu-visible');
                            }
                        });
                        
                        // Toggle this menu
                        menu.classList.toggle('orkg-menu-visible');
                        console.log('Menu toggled for marker:', markerId);
                    }
                }
                
                // Check if clicking on a menu item
                const menuItem = e.target.closest('.orkg-menu-item');
                if (menuItem) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const action = menuItem.dataset.action;
                    const marker = menuItem.closest('.orkg-marker');
                    const markerId = marker?.dataset.markerId;
                    const markerType = marker?.dataset.markerType;
                    
                    console.log('Menu action:', action, 'for', markerType, 'marker:', markerId);
                    
                    // Hide menu
                    const menu = menuItem.closest('.orkg-marker-menu');
                    if (menu) {
                        menu.classList.remove('orkg-menu-visible');
                    }
                    
                    // Handle action
                    this.handleMenuAction(action, markerId, markerType, marker);
                }
            };
            
            // Add listener with capture
            document.addEventListener('click', global.orkgMenuClickHandler, true);
            console.log('✅ Global menu handler installed');
        }
        
        handleMenuAction(action, markerId, markerType, markerElement) {
            // Get the marker instance
            const markerInstance = this.markers.get(markerType);
            
            if (markerInstance && markerInstance.menuHandler) {
                // Use the marker's menu handler
                const markerData = this.getMarkerData(markerId, markerElement);
                markerInstance.menuHandler.executeAction(action, markerId, markerData);
            } else {
                // Fallback handling
                this.handleActionDirectly(action, markerId, markerElement);
            }
        }
        
        handleActionDirectly(action, markerId, markerElement) {
            const markerData = this.getMarkerData(markerId, markerElement);
            const modalManager = global.ModalManager?.getInstance();
            
            switch (action) {
                case 'delete':
                    if (modalManager) {
                        modalManager.showDeleteConfirm(
                            markerData,
                            () => {
                                // For text markers, remove highlight first
                                if (markerData.type === 'text') {
                                    this.removeTextHighlight(markerId, markerElement);
                                }
                                
                                // Then remove marker
                                markerElement.classList.add('orkg-marker-exit');
                                setTimeout(() => {
                                    markerElement.remove();
                                }, 300);
                                
                                console.log('✅ Marker deleted:', markerId);
                                this.showFeedback('Marker deleted successfully', 'success');
                            },
                            () => {
                                console.log('Delete cancelled');
                            }
                        );
                    } else if (confirm(`Delete this ${markerData.type} marker?`)) {
                        if (markerData.type === 'text') {
                            this.removeTextHighlight(markerId, markerElement);
                        }
                        markerElement.remove();
                        console.log('✅ Marker deleted:', markerId);
                    }
                    break;
                    
                case 'info':
                    if (modalManager) {
                        modalManager.showInfo(markerData, markerData.type, 'property-window');
                    } else {
                        alert(`Marker Information:\nType: ${markerData.type}\nID: ${markerId}`);
                    }
                    break;
                    
                case 'update':
                    if (markerData.type === 'text') {
                        if (this.propertyWindow && typeof this.propertyWindow.show === 'function') {
                            // Find highlighted element
                            const highlightElement = this.findHighlightElement(markerId, markerElement);
                            
                            if (highlightElement) {
                                // Add selection wrapper
                                this.addSelectionWrapper(highlightElement);
                                
                                const rect = highlightElement.getBoundingClientRect();
                                this.propertyWindow.show(
                                    markerData.metadata?.text || highlightElement.textContent || 'Selected text',
                                    { x: rect.right + 10, y: rect.top }
                                );
                            } else {
                                const rect = markerElement.getBoundingClientRect();
                                this.propertyWindow.show(
                                    markerData.metadata?.text || 'Selected text',
                                    { x: rect.right + 10, y: rect.top }
                                );
                            }
                        } else {
                            this.showFeedback('Property window not available', 'error');
                        }
                    } else {
                        this.showFeedback('Update is only available for text markers', 'warning');
                    }
                    break;
                    
                case 'send':
                    const counts = this.getAllTypeCounts();
                    if (modalManager) {
                        modalManager.showSendOptions(
                            markerData,
                            counts,
                            (sendAction) => {
                                if (sendAction === 'send-this') {
                                    this.sendSingleItem(markerId, markerData);
                                } else if (sendAction === 'send-all') {
                                    this.sendAllItems();
                                }
                            },
                            'property-window'
                        );
                    } else {
                        this.sendSingleItem(markerId, markerData);
                    }
                    break;
                    
                default:
                    console.warn('Unknown action:', action);
            }
        }
        
        removeTextHighlight(markerId, markerElement) {
            // Find and remove all highlight elements
            const highlightElements = [
                ...document.querySelectorAll(`[data-highlight-id="${markerId}"]`),
                ...document.querySelectorAll(`[data-marker-id="${markerId}"]`),
                ...document.querySelectorAll(`.orkg-highlighted[data-marker-id="${markerId}"]`)
            ];
            
            // Check if marker is inside highlight
            const markerInHighlight = markerElement?.closest('.orkg-highlighted');
            if (markerInHighlight && !highlightElements.includes(markerInHighlight)) {
                highlightElements.push(markerInHighlight);
            }
            
            // Remove all highlights
            highlightElements.forEach(highlightElement => {
                if (highlightElement) {
                    const textContent = highlightElement.textContent;
                    const textNode = document.createTextNode(textContent);
                    
                    if (highlightElement.parentNode) {
                        highlightElement.parentNode.replaceChild(textNode, highlightElement);
                    }
                }
            });
            
            // Also try TextHighlighter API
            if (global.TextHighlighter?.removeHighlight) {
                global.TextHighlighter.removeHighlight(markerId);
            }
        }
        
        findHighlightElement(markerId, markerElement) {
            return document.querySelector(`[data-highlight-id="${markerId}"]`) ||
                   document.querySelector(`[data-marker-id="${markerId}"]`)?.closest('.orkg-highlighted') ||
                   markerElement?.closest('.orkg-highlighted');
        }
        
        addSelectionWrapper(element) {
            element.style.outline = '2px dashed #2196F3';
            element.style.outlineOffset = '3px';
            element.style.transition = 'outline 0.3s ease';
            element.style.boxShadow = '0 0 8px rgba(33, 150, 243, 0.5)';
            element.classList.add('orkg-selection-active');
            
            // Remove effects when property window closes
            const checkInterval = setInterval(() => {
                const propertyWindowVisible = document.querySelector('.orkg-property-window.orkg-window-visible');
                if (!propertyWindowVisible) {
                    element.style.outline = '';
                    element.style.outlineOffset = '';
                    element.style.boxShadow = '';
                    element.classList.remove('orkg-selection-active');
                    clearInterval(checkInterval);
                }
            }, 500);
        }
        
        getMarkerData(markerId, markerElement) {
            const markerData = {
                id: markerId,
                type: markerElement.dataset.markerType || 'unknown',
                element: markerElement,
                markerElement: markerElement,
                metadata: {},
                createdAt: Date.now()
            };
            
            // Try to parse metadata
            try {
                const metadataStr = markerElement.dataset.metadata;
                if (metadataStr) {
                    markerData.metadata = JSON.parse(metadataStr);
                }
            } catch (e) {
                console.warn('Could not parse metadata:', e);
            }
            
            // Get from registry if available
            if (global.MarkerRegistry) {
                const registryData = global.MarkerRegistry.get(markerId);
                if (registryData) {
                    Object.assign(markerData, registryData);
                }
            }
            
            return markerData;
        }
        
        async initializeMarkerTypes() {
            const factory = global.MarkerFactory;
            if (!factory) {
                console.warn('MarkerFactory not available, creating marker instances directly');
                
                // Create instances directly
                if (global.TextMarker) {
                    const textMarker = new global.TextMarker();
                    await textMarker.init();
                    this.markers.set('text', textMarker);
                }
                
                if (global.ImageMarker) {
                    const imageMarker = new global.ImageMarker();
                    await imageMarker.init();
                    this.markers.set('image', imageMarker);
                }
                
                if (global.TableMarker) {
                    const tableMarker = new global.TableMarker();
                    await tableMarker.init();
                    this.markers.set('table', tableMarker);
                }
            } else {
                // Register marker types with factory
                if (global.TextMarker) {
                    factory.registerType('text', global.TextMarker);
                }
                if (global.ImageMarker) {
                    factory.registerType('image', global.ImageMarker);
                }
                if (global.TableMarker) {
                    factory.registerType('table', global.TableMarker);
                }
                
                console.log('✅ Marker types registered with factory');
            }
        }
        
        setupMessageHandlers() {
            if (!chrome?.runtime?.onMessage) {
                console.warn('Chrome runtime not available');
                return;
            }
            
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.action === 'ACTIVATE_MARKERS') {
                    this.activateMarkers(message.config).then(sendResponse);
                    return true; // Keep channel open for async response
                } else if (message.action === 'DEACTIVATE_MARKERS') {
                    this.deactivateMarkers().then(sendResponse);
                    return true;
                }
            });
            
            console.log('✅ Message handlers setup');
        }
        
        async activateMarkers(config = {}) {
            const results = {};
            
            for (const [type, marker] of this.markers) {
                try {
                    const result = await marker.activate(config);
                    results[type] = result;
                } catch (error) {
                    console.error(`Failed to activate ${type} markers:`, error);
                    results[type] = { success: false, error: error.message };
                }
            }
            
            return { success: true, results };
        }
        
        async deactivateMarkers() {
            for (const [type, marker] of this.markers) {
                try {
                    marker.deactivate();
                } catch (error) {
                    console.error(`Failed to deactivate ${type} markers:`, error);
                }
            }
            
            return { success: true };
        }
        
        getAllTypeCounts() {
            const counts = {
                text: document.querySelectorAll('.orkg-highlighted').length,
                image: document.querySelectorAll('.orkg-image-marker').length,
                table: document.querySelectorAll('.orkg-table-marker').length,
                total: 0
            };
            
            // Check TextHighlighter
            if (global.TextHighlighter?.getHighlightCount) {
                counts.text = Math.max(counts.text, global.TextHighlighter.getHighlightCount());
            }
            
            // Check MarkerRegistry
            if (global.MarkerRegistry) {
                const stats = global.MarkerRegistry.getStats();
                if (stats.byType) {
                    counts.text = Math.max(counts.text, stats.byType.text || 0);
                    counts.image = Math.max(counts.image, stats.byType.image || 0);
                    counts.table = Math.max(counts.table, stats.byType.table || 0);
                }
            }
            
            counts.total = counts.text + counts.image + counts.table;
            return counts;
        }
        
        sendSingleItem(markerId, markerData) {
            console.log('📤 Sending item:', markerId);
            
            // Create send animation
            this.createSendAnimation(markerData.markerElement);
            
            if (markerData.markerElement) {
                setTimeout(() => {
                    markerData.markerElement.classList.add('orkg-extracted');
                }, 1000);
            }
            
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                    action: `SEND_${markerData.type.toUpperCase()}`,
                    data: {
                        markerId,
                        metadata: markerData.metadata,
                        timestamp: Date.now()
                    }
                });
            }
            
            this.showFeedback('Item sent to ORKG', 'success');
        }
        
        createSendAnimation(element) {
            if (!element) return;
            
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Create particle container
            const particleContainer = document.createElement('div');
            particleContainer.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: 0;
                height: 0;
                pointer-events: none;
                z-index: 99999;
            `;
            document.body.appendChild(particleContainer);
            
            // Create particles
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: #e86161;
                    border-radius: 50%;
                    opacity: 1;
                    transform: scale(1);
                `;
                particleContainer.appendChild(particle);
                
                const angle = (i / 8) * Math.PI * 2;
                const distance = 50 + Math.random() * 30;
                const duration = 800 + Math.random() * 400;
                
                particle.animate([
                    { 
                        transform: 'translate(0, 0) scale(1)',
                        opacity: 1
                    },
                    { 
                        transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
                        opacity: 0
                    }
                ], {
                    duration: duration,
                    easing: 'cubic-bezier(0, 0.5, 0.5, 1)'
                });
            }
            
            // Pulse effect on element
            if (element.animate) {
                element.animate([
                    { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(232, 97, 97, 0.4)' },
                    { transform: 'scale(1.05)', boxShadow: '0 0 20px 10px rgba(232, 97, 97, 0.2)' },
                    { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(232, 97, 97, 0)' }
                ], {
                    duration: 600,
                    easing: 'ease-out'
                });
            }
            
            setTimeout(() => {
                particleContainer.remove();
            }, 1500);
        }
        
        sendAllItems() {
            const modalManager = global.ModalManager?.getInstance();
            const items = this.getAllCategorizedItems();
            
            if (items.totalCount === 0) {
                this.showFeedback('No items to send', 'warning');
                return;
            }
            
            if (modalManager) {
                modalManager.showSendAll(items, (selectedItems) => {
                    this.sendSelectedItems(selectedItems);
                }, 'property-window');
            }
        }
        
        getAllCategorizedItems() {
            const items = {
                text: [],
                images: [],
                tables: [],
                totalCount: 0
            };
            
            // Get from DOM
            document.querySelectorAll('.orkg-highlighted').forEach(el => {
                items.text.push({
                    id: el.dataset.highlightId || el.dataset.markerId || Math.random().toString(36).substr(2, 9),
                    element: el,
                    type: 'text',
                    text: el.textContent,
                    metadata: this.getElementMetadata(el)
                });
            });
            
            document.querySelectorAll('.orkg-image-marker').forEach(el => {
                items.images.push({
                    id: el.dataset.markerId || Math.random().toString(36).substr(2, 9),
                    element: el,
                    type: 'image',
                    metadata: this.getElementMetadata(el)
                });
            });
            
            document.querySelectorAll('.orkg-table-marker').forEach(el => {
                items.tables.push({
                    id: el.dataset.markerId || Math.random().toString(36).substr(2, 9),
                    element: el,
                    type: 'table',
                    metadata: this.getElementMetadata(el)
                });
            });
            
            items.totalCount = items.text.length + items.images.length + items.tables.length;
            return items;
        }
        
        getElementMetadata(element) {
            try {
                const metadataStr = element.dataset.metadata;
                if (metadataStr) {
                    return JSON.parse(metadataStr);
                }
            } catch (e) {
                // Ignore parse errors
            }
            return {};
        }
        
        sendSelectedItems(selectedItems) {
            console.log(`📤 Sending ${selectedItems.total} items`);
            
            // Create wave animation
            const wave = document.createElement('div');
            wave.className = 'orkg-send-wave';
            document.body.appendChild(wave);
            
            setTimeout(() => {
                wave.remove();
            }, 1500);
            
            // Send items with animation
            let delay = 0;
            const allItems = [
                ...(selectedItems.text || []),
                ...(selectedItems.images || []),
                ...(selectedItems.tables || [])
            ];
            
            allItems.forEach(item => {
                setTimeout(() => {
                    if (item.element) {
                        this.createSendAnimation(item.element);
                        setTimeout(() => {
                            item.element.classList.add('orkg-extracted');
                        }, 600);
                    }
                }, delay);
                delay += 150;
            });
            
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'SEND_MULTIPLE_ITEMS',
                    data: {
                        items: selectedItems,
                        timestamp: Date.now()
                    }
                });
            }
            
            setTimeout(() => {
                this.showFeedback(`Sent ${selectedItems.total} items to ORKG`, 'success');
            }, delay + 500);
        }
        
        showFeedback(message, type = 'info') {
            const existing = document.querySelector('.orkg-feedback');
            if (existing) {
                existing.remove();
            }
            
            const feedback = document.createElement('div');
            feedback.className = `orkg-feedback orkg-feedback-${type}`;
            feedback.textContent = message;
            document.body.appendChild(feedback);
            
            requestAnimationFrame(() => {
                feedback.classList.add('orkg-feedback-visible');
            });
            
            setTimeout(() => {
                feedback.classList.remove('orkg-feedback-visible');
                setTimeout(() => feedback.remove(), 300);
            }, 2500);
        }
    }
    
    // Create and initialize the system
    const markerSystem = new MarkerSystemInit();
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            markerSystem.initialize().catch(console.error);
        });
    } else {
        markerSystem.initialize().catch(console.error);
    }
    
    // Export to global scope
    global.MarkerSystemInit = MarkerSystemInit;
    global.markerSystem = markerSystem;
    
    console.log('📢 MarkerSystemInit exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[init/MarkerSystemInit.js] Error:', error);
    }
  })();

  // ===== Module: core/ContentScriptManager.js =====
  ;(function() {
    'use strict';
    
    // Provide global for compatibility
    var global = window;
    
    try {
// ================================
// src/content/modules/core/ContentScriptManager.js - Enhanced with RAG Marker Support
// ================================

(function(global) {
  'use strict';
  
  // Check if already exists
  if (global.contentScriptManager) {
    console.log('📋 ContentScriptManager already exists, skipping creation');
    return;
  }
  
  /**
   * Content Script Manager for ORKG Content Script
   * Enhanced with proper RAG highlight marker creation
   */
  class ContentScriptManager {
    constructor() {
      // Core state
      this.initialized = false;
      this._initPromise = null;
      
      // Feature state
      this.state = {
        inAnalysisStep: false,
        lastSelectionTime: 0,
        ragHighlights: new Map(),
        manualHighlights: new Map()
      };
      
      // Configuration
      this.config = {
        enableTextSelection: true,
        enableMarkers: true,
        enableRAG: true,
        enableExtraction: true,
        autoActivateMarkers: false,
        createMarkersForRAG: true
      };
      
      console.log('📋 ContentScriptManager instance created');
    }
    
    /**
     * Initialize the content script manager (singleton pattern)
     * @returns {Promise<ContentScriptManager>}
     */
    async init() {
      // Return existing promise if already initializing
      if (this._initPromise) {
        console.log('📋 ContentScriptManager initialization already in progress');
        return this._initPromise;
      }
      
      // Already initialized
      if (this.initialized) {
        console.log('📋 ContentScriptManager already initialized');
        return this;
      }
      
      // Create initialization promise
      this._initPromise = this._doInit();
      return this._initPromise;
    }
    
    /**
     * Actual initialization logic
     * @private
     */
    async _doInit() {
      console.log('🚀 Initializing ORKG Content Script Manager...');
      
      try {
        // Check for service registry
        if (!global.serviceRegistry) {
          throw new Error('ServiceRegistry not available');
        }
        
        // Register self with service registry
        global.serviceRegistry.register('contentScriptManager', this);
        
        // Step 1: Initialize core services
        await this.initializeCoreServices();
        
        // Step 2: Initialize handler services
        await this.initializeHandlerServices();
        
        // Step 3: Setup message routing
        this.setupMessageRouting();
        
        // Step 4: Conditionally enable features
        await this.enableFeatures();
        
        // Mark as initialized
        this.initialized = true;
        
        // Expose status globally
        global.orkgContentScript = {
          initialized: true,
          timestamp: new Date().toISOString(),
          manager: this
        };
        
        console.log('✅ ORKG Content Script Manager fully initialized');
        
        return this;
        
      } catch (error) {
        console.error('❌ Failed to initialize ORKG Content Script Manager:', error);
        this._initPromise = null; // Reset to allow retry
        throw error;
      }
    }
    
    /**
     * Initialize core services
     * @private
     */
    async initializeCoreServices() {
      const registry = global.serviceRegistry;
      if (!registry) {
        throw new Error('ServiceRegistry not available');
      }
      
      console.log('📊 Initializing core services...');
      
      // Required core services
      const requiredServices = ['messageHandler', 'selectionManager',];
      
      for (const service of requiredServices) {
        if (registry.has(service)) {
          try {
            await registry.initialize(service);
            console.log(`✅ ${service} initialized`);
          } catch (error) {
            console.error(`❌ Failed to initialize required service ${service}:`, error);
            throw error;
          }
        } else {
          console.error(`❌ Required service not found: ${service}`);
          throw new Error(`Required service not found: ${service}`);
        }
      }
      
      console.log('✅ Core services initialized');
    }
    
    /**
     * Initialize handler services that will handle specific message types
     * @private
     */
    async initializeHandlerServices() {
      const registry = global.serviceRegistry;
      if (!registry) return;
      
      console.log('📊 Initializing handler services...');
      
      // Handler services (optional but important)
      const handlerServices = [
        'ragHandler',        // Handles RAG-related messages
        'markerHandler',     // Handles marker-related messages
        'extractionHandler', // Handles extraction-related messages
        'propertyHandler'    // Handles property window messages
      ];
      
      for (const service of handlerServices) {
        if (registry.has(service)) {
          try {
            await registry.initialize(service);
            console.log(`✅ ${service} initialized`);
          } catch (error) {
            console.warn(`⚠️ Failed to initialize handler ${service}:`, error);
          }
        } else {
          console.log(`ℹ️ Handler service not found: ${service} (will be created when needed)`);
        }
      }
      
      console.log('✅ Handler services initialized');
    }
    
    /**
     * Setup message routing to appropriate handlers
     * @private
     */
    setupMessageRouting() {
      const messageHandler = global.serviceRegistry?.get('messageHandler');
      if (!messageHandler) {
        console.warn('⚠️ MessageHandler not available, skipping message routing');
        return;
      }
      
      // Core state messages (handled by this manager)
      messageHandler.registerHandler('PING', () => this.handlePing());
      messageHandler.registerHandler('CHECK_ANALYSIS_STEP', () => this.handleCheckAnalysisStep());
      messageHandler.registerHandler('SET_ANALYSIS_STEP', (message) => this.handleSetAnalysisStep(message));
      messageHandler.registerHandler('UPDATE_CONFIG', (message) => this.handleUpdateConfig(message));
      messageHandler.registerHandler('GET_STATUS', () => this.handleGetStatus());
      
      // NEW: RAG-specific marker creation handlers
      messageHandler.registerHandler('CREATE_TEXT_MARKERS_FOR_RAG_HIGHLIGHTS', (message) => {
        return this.handleCreateTextMarkersForRAGHighlights(message.highlights);
      });

     messageHandler.registerHandler('CREATE_IMAGE_MARKERS_FOR_RAG', (message) => {
        return this.handleCreateImageMarkersForRAG(message.images);
     });

     messageHandler.registerHandler('CREATE_TABLE_MARKERS_FOR_RAG', (message) => {
        return this.handleCreateTableMarkersForRAG(message.tables);
     });

    messageHandler.registerHandler('SHOW_RAG_RESULTS_WINDOW', (message) => {
          console.log('[ContentScriptManager] SHOW_RAG_RESULTS_WINDOW received');
          
          // Get the singleton instance
          const ragWindow = global.ragResultsWindow || 
                          (global.RAGResultsWindow && global.RAGResultsWindow.instance);
          
          if (!ragWindow) {
              console.error('[ContentScriptManager] RAG window not available');
              return { success: false, error: 'Window not available' };
          }
          
          // Handle the results
          if (message.results && Object.keys(message.results).length > 0) {
              ragWindow.handleRAGResults(message.results);
              console.log('ragWindow:', ragWindow,ragWindow.container);
              // orkg-rag-results-window
              // Show the window
              if (ragWindow.container) {
                  ragWindow.container.style.display = 'block';
              }
              
              console.log('[ContentScriptManager] RAG window shown with results');
              return { success: true, windowShown: true };
          } else {
              console.warn('[ContentScriptManager] No results to display');
              return { success: false, error: 'No results' };
          }
      });
      // Handle overlay update messages from background
      messageHandler.registerHandler('UPDATE_OVERLAY', function(message) {
        const overlayManager = global.serviceRegistry?.get('overlayManager') || global.overlayManager;
        
        if (!overlayManager) {
            console.log('OverlayManager not available for update');
            return { success: true }; // Don't fail, just log
        }
        
        // OverlayManager in your codebase uses updateProgress method
        if (typeof overlayManager.updateProgress === 'function') {
            overlayManager.updateProgress(message.progress || 0, message.message || '');
        } else if (typeof overlayManager.update === 'function') {
            overlayManager.update(message.message || '');
        } else {
            console.log('OverlayManager update method not found');
        }
        
        return { success: true };
      });
      
      console.log('✅ Message routing setup complete');
    }
    
    /**
     * Enable features based on configuration
     * @private
     */
    async enableFeatures() {
      const registry = global.serviceRegistry;
      
      // Enable text selection if configured
      if (this.config.enableTextSelection) {
        const selectionManager = registry?.get('selectionManager');
        if (selectionManager && typeof selectionManager.enable === 'function') {
          selectionManager.enable();
          console.log('✅ Text selection enabled');
        }
      }
      
      // Auto-activate markers if configured
      if (this.config.autoActivateMarkers) {
        const markerHandler = registry?.get('markerHandler');
        if (markerHandler && typeof markerHandler.activateMarkers === 'function') {
          await markerHandler.activateMarkers();
          console.log('✅ Markers auto-activated');
        }
      }
    }
    
    // ================================
    // RAG Highlight Marker Handlers
    // ================================

    /**
     * Handle creation of text markers for RAG highlights
     * This is called after RAG highlights have been applied
     * @private
     */
    async handleCreateTextMarkersForRAGHighlights(highlights) {
        console.log('📍 Creating text markers for RAG highlights:', highlights?.length || 0);
        
        if (!highlights || highlights.length === 0) {
            return { success: false, error: 'No highlights provided', markersCreated: 0 };
        }
        
        try {
            // Step 1: Get or create TextMarker instance
            let textMarker = null;
            
            // Try to get from marker handler first
            const markerHandler = global.serviceRegistry?.get('markerHandler') || global.markerHandler;
            if (markerHandler) {
                // Ensure text marker type is activated
                if (!markerHandler.getMarker('text')) {
                    console.log('📍 Activating text marker type first...');
                    const activationResult = await markerHandler.activateMarkers({ types: ['text'] });
                    if (!activationResult.success) {
                        console.error('Failed to activate text markers:', activationResult.error);
                        return { success: false, error: 'Failed to activate text markers', markersCreated: 0 };
                    }
                }
                textMarker = markerHandler.getMarker('text');
            }
            
            // If not available through marker handler, try global instance
            if (!textMarker) {
                textMarker = global.textMarkerInstance || global.TextMarker?.instance;
            }
            
            // If still not available, create new instance
            if (!textMarker) {
                if (global.TextMarker) {
                    console.log('📍 Creating new TextMarker instance...');
                    textMarker = new global.TextMarker();
                    
                    // Initialize the marker
                    try {
                        await textMarker.init();
                        await textMarker.activate();
                    } catch (initError) {
                        console.error('Failed to initialize TextMarker:', initError);
                        return { success: false, error: 'Failed to initialize TextMarker', markersCreated: 0 };
                    }
                    
                    // Store as global instance
                    global.textMarkerInstance = textMarker;
                    
                    // Register with marker handler if available
                    if (markerHandler && typeof markerHandler.registerMarkerType === 'function') {
                        markerHandler.registerMarkerType('text', global.TextMarker);
                    }
                } else {
                    console.error('TextMarker class not available');
                    return { success: false, error: 'TextMarker not available', markersCreated: 0 };
                }
            }
            
            // Step 2: Ensure marker is activated and has UI
            if (!textMarker.isActive) {
                console.log('📍 Activating TextMarker...');
                const activationResult = await textMarker.activate();
                if (!activationResult.success) {
                    console.error('Failed to activate TextMarker:', activationResult.error);
                    return { success: false, error: 'Failed to activate TextMarker', markersCreated: 0 };
                }
            }
            
            // Step 3: Use the dedicated RAG method if available
            let result;
            if (typeof textMarker.createMarkersForRAGHighlights === 'function') {
                console.log('📍 Using createMarkersForRAGHighlights method...');
                result = textMarker.createMarkersForRAGHighlights(highlights);
                
                // Handle different return formats
                if (typeof result === 'object' && result !== null) {
                    const markersCreated = result.created || result.markersCreated || 0;
                    const errors = result.errors || [];
                    
                    console.log(`✅ Created ${markersCreated} text markers for RAG highlights`);
                    if (errors.length > 0) {
                        console.warn('Errors during marker creation:', errors);
                    }
                    
                    return {
                        success: true,
                        markersCreated: markersCreated,
                        totalHighlights: highlights.length,
                        errors: errors.length > 0 ? errors : undefined
                    };
                } else if (typeof result === 'number') {
                    // Legacy format - just returns count
                    return {
                        success: true,
                        markersCreated: result,
                        totalHighlights: highlights.length
                    };
                }
            } else {
                // Fallback: Create markers individually
                console.log('📍 Using fallback individual marker creation...');
                let markersCreated = 0;
                let errors = [];
                
                for (const highlight of highlights) {
                    try {
                        // Find the highlighted element
                        let element = null;
                        
                        // Try to find by data-highlight-id
                        if (highlight.id) {
                            element = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
                        }
                        
                        // Try to find by class and text content
                        if (!element) {
                            const ragHighlights = document.querySelectorAll('.orkg-rag-highlight, .orkg-highlighted');
                            for (const el of ragHighlights) {
                                const elText = el.textContent.trim();
                                const highlightText = (highlight.text || highlight.sentence || '').trim();
                                if (elText === highlightText) {
                                    element = el;
                                    // Set the highlight ID if not present
                                    if (!el.dataset.highlightId) {
                                        el.dataset.highlightId = highlight.id;
                                    }
                                    break;
                                }
                            }
                        }
                        
                        if (element) {
                            // Clean up any incorrect styles on the element
                            if (element.style.position === 'absolute') {
                                element.style.position = '';
                                element.style.top = '';
                                element.style.right = '';
                                element.style.zIndex = '';
                            }
                            
                            const metadata = {
                                id: `marker_rag_${highlight.id}`,
                                highlightId: highlight.id,
                                text: highlight.text || highlight.sentence,
                                property: {
                                    id: highlight.propertyId,
                                    label: highlight.propertyLabel,
                                    source: 'rag'
                                },
                                confidence: highlight.confidence || 0.5,
                                section: highlight.section,
                                sentenceIndex: highlight.sentenceIndex,
                                color: highlight.color,
                                source: 'rag',
                                fromRAG: true
                            };
                            
                            const markerCreated = textMarker.createMarker(element, metadata);
                            if (markerCreated) {
                                markersCreated++;
                                
                                // Store reference
                                this.state.ragHighlights.set(highlight.id, {
                                    highlight: highlight,
                                    element: element,
                                    marker: markerCreated
                                });
                            } else {
                                errors.push(`Failed to create marker for highlight ${highlight.id}`);
                            }
                        } else {
                            console.warn(`Could not find element for highlight: ${highlight.id}`);
                            errors.push(`Element not found for highlight ${highlight.id}`);
                        }
                    } catch (error) {
                        console.error(`Error creating marker for highlight ${highlight.id}:`, error);
                        errors.push({ highlightId: highlight.id, error: error.message });
                    }
                }
                
                console.log(`✅ Created ${markersCreated} text markers for RAG highlights`);
                
                return {
                    success: true,
                    markersCreated: markersCreated,
                    totalHighlights: highlights.length,
                    errors: errors.length > 0 ? errors : undefined
                };
            }
            
        } catch (error) {
            console.error('❌ Failed to create text markers for RAG highlights:', error);
            return {
                success: false,
                error: error.message,
                markersCreated: 0
            };
        }
    }
    
    /**
     * Find highlighted element in DOM
     * @private
     */
    findHighlightedElement(highlight) {
      // Try multiple strategies to find the element
      
      // Strategy 1: Find by highlight ID
      let element = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
      if (element) return element;
      
      // Strategy 2: Find by RAG highlight class and text content
      const ragHighlights = document.querySelectorAll('.orkg-rag-highlight, .orkg-highlighted');
      for (const el of ragHighlights) {
        // Check if text matches
        if (el.textContent === highlight.text || el.textContent === highlight.sentence) {
          // Also check if property matches if available
          if (!el.dataset.highlightId || el.dataset.propertyId === highlight.propertyId) {
            // Assign the highlight ID if not present
            if (!el.dataset.highlightId) {
              el.dataset.highlightId = highlight.id;
            }
            return el;
          }
        }
      }
      
      // Strategy 3: Find by property and text (fuzzy match)
      for (const el of ragHighlights) {
        const elText = el.textContent.trim();
        const highlightText = (highlight.text || highlight.sentence || '').trim();
        
        // Check for partial match (in case of slight differences)
        if (elText && highlightText && 
            (elText.includes(highlightText) || highlightText.includes(elText))) {
          if (el.dataset.propertyId === highlight.propertyId ||
              el.dataset.propertyLabel === highlight.propertyLabel) {
            // Assign the highlight ID
            if (!el.dataset.highlightId) {
              el.dataset.highlightId = highlight.id;
            }
            return el;
          }
        }
      }
      
      return null;
    }
    
    /**
     * Create marker for a RAG highlight
     * @private
     */
    createMarkerForRAGHighlight(textMarker, element, highlight) {
      try {
        // Prepare metadata for marker
        const markerMetadata = {
          id: `marker_rag_${highlight.id}`,
          highlightId: highlight.id,
          text: highlight.text || highlight.sentence,
          property: {
            id: highlight.propertyId,
            label: highlight.propertyLabel,
            source: 'rag'
          },
          confidence: highlight.confidence || 0.5,
          section: highlight.section,
          sentenceIndex: highlight.sentenceIndex,
          color: highlight.color,
          source: 'rag'
        };
        
        // Create the marker using TextMarker's method
        const markerData = textMarker.createMarker(element, markerMetadata);
        
        if (markerData && markerData.element) {
          // Position the marker appropriately
          const markerElement = markerData.element;
          
          // Make the parent element relative positioned if needed
          if (element.style.position !== 'relative') {
            element.style.position = 'relative';
          }
          
          // Style the marker for RAG highlights
          markerElement.style.cssText = `
            position: absolute !important;
            top: -8px !important;
            right: -8px !important;
            z-index: 10002 !important;
          `;
          
          // Add confidence indicator if available
          if (highlight.confidence) {
            const confidenceBadge = document.createElement('div');
            confidenceBadge.style.cssText = `
              position: absolute !important;
              bottom: -4px !important;
              right: -4px !important;
              background: ${this.getConfidenceColor(highlight.confidence)} !important;
              color: white !important;
              font-size: 9px !important;
              font-weight: bold !important;
              padding: 2px 4px !important;
              border-radius: 10px !important;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
            `;
            confidenceBadge.textContent = `${Math.round(highlight.confidence * 100)}%`;
            markerElement.appendChild(confidenceBadge);
          }
          
          console.log(`📍 Created RAG marker for highlight: ${highlight.id}`);
          return markerData;
        }
        
        return null;
        
      } catch (error) {
        console.error('Error creating RAG marker:', error);
        return null;
      }
    }

    /**
     * Handle creation of image markers for RAG-identified images
     */
    async handleCreateImageMarkersForRAG(images) {
        console.log('📷 Creating image markers for RAG:', images?.length || 0);
        
        if (!images || images.length === 0) {
            return { success: false, error: 'No images provided', markersCreated: 0 };
        }
        
        try {
            // Step 1: Get or create ImageMarker instance
            let imageMarker = null;
            
            // Try to get from marker handler first
            const markerHandler = global.serviceRegistry?.get('markerHandler') || global.markerHandler;
            if (markerHandler) {
                imageMarker = markerHandler.getMarker('image');
            }
            
            // If not available through marker handler, try global instance
            if (!imageMarker) {
                imageMarker = global.imageMarkerInstance || global.ImageMarker?.instance;
            }
            
            // If still not available, create new instance
            if (!imageMarker) {
                if (global.ImageMarker) {
                    imageMarker = new global.ImageMarker();
                    await imageMarker.init();
                    
                    // Store as global instance
                    global.imageMarkerInstance = imageMarker;
                    
                    // Register with marker handler if available
                    if (markerHandler && typeof markerHandler.registerMarker === 'function') {
                        markerHandler.registerMarker('image', imageMarker);
                    }
                } else {
                    console.error('ImageMarker class not available');
                    return { success: false, error: 'ImageMarker not available', markersCreated: 0 };
                }
            }
            
            // Step 2: Ensure marker is activated
            if (!imageMarker.isActive) {
                await imageMarker.activate({
                    autoMark: false // Don't auto-mark all images, just the ones from RAG
                });
            }
            
            // Step 3: Create markers for RAG images using the new method
            let markersCreated = 0;
            
            if (typeof imageMarker.createMarkersForRAGImages === 'function') {
                // Use the new dedicated method
                markersCreated = imageMarker.createMarkersForRAGImages(images);
            } else {
                // Fallback: Create markers individually
                for (const imageData of images) {
                    try {
                        // Find the image element
                        let element = null;
                        
                        if (imageData.selector) {
                            element = document.querySelector(imageData.selector);
                        } else if (imageData.src) {
                            element = document.querySelector(`img[src="${imageData.src}"]`) ||
                                    document.querySelector(`img[src*="${imageData.src}"]`);
                        } else if (imageData.id && imageData.id.startsWith('rag_img_')) {
                            // Try to find by index
                            const index = parseInt(imageData.id.split('_')[2]);
                            const allImages = document.querySelectorAll('img');
                            if (allImages[index]) {
                                element = allImages[index];
                            }
                        }
                        
                        if (element) {
                            const metadata = {
                                id: imageData.id || `rag_img_${Date.now()}_${markersCreated}`,
                                src: imageData.src || element.src,
                                alt: imageData.alt || element.alt,
                                title: imageData.title || element.title,
                                caption: imageData.caption || imageData.context?.caption,
                                dimensions: imageData.dimensions || {
                                    width: element.naturalWidth || element.width,
                                    height: element.naturalHeight || element.height
                                },
                                score: imageData.score || imageData.intelligence?.score || 0.5,
                                type: imageData.type || 'figure',
                                fromRAG: true
                            };
                            
                            const markerCreated = imageMarker.createMarker(element, metadata);
                            if (markerCreated) {
                                markersCreated++;
                                console.log(`✅ Created image marker for element:`, element);
                            }
                        } else {
                            console.warn(`Could not find image element for:`, imageData);
                        }
                    } catch (error) {
                        console.error(`Error creating image marker:`, error);
                    }
                }
            }
            
            console.log(`✅ Created ${markersCreated} image markers for RAG`);
            
            // Step 4: Store RAG image references
            images.forEach((imageData, index) => {
                if (imageData.id) {
                    this.state.ragHighlights.set(`image_${imageData.id}`, {
                        type: 'image',
                        data: imageData,
                        markerCreated: index < markersCreated
                    });
                }
            });
            
            return { 
                success: true, 
                markersCreated: markersCreated,
                totalImages: images.length
            };
            
        } catch (error) {
            console.error('❌ Failed to create image markers:', error);
            return { 
                success: false, 
                error: error.message, 
                markersCreated: 0 
            };
        }
    }

    /**
     * Handle creation of table markers for RAG-identified tables
     */
    async handleCreateTableMarkersForRAG(tables) {
        console.log('📊 Creating table markers for RAG:', tables?.length || 0);
        
        if (!tables || tables.length === 0) {
            return { success: false, error: 'No tables provided', markersCreated: 0 };
        }
        
        try {
            // Get marker handler
            const markerHandler = global.serviceRegistry?.get('markerHandler') || global.markerHandler;
            if (!markerHandler) {
                return { success: false, error: 'MarkerHandler not available', markersCreated: 0 };
            }
            
            // Ensure table marker is activated
            if (!markerHandler.getMarker('table')) {
                await markerHandler.activateMarkers({ types: ['table'] });
            }
            
            const tableMarker = markerHandler.getMarker('table');
            if (!tableMarker) {
                return { success: false, error: 'Table marker not available', markersCreated: 0 };
            }
            
            let markersCreated = 0;
            
            for (const tableData of tables) {
                try {
                    // Find the table element
                    const element = tableData.selector ? 
                        document.querySelector(tableData.selector) :
                        document.querySelectorAll('table')[tables.indexOf(tableData)];
                    
                    if (element) {
                        const metadata = {
                            id: tableData.id,
                            caption: tableData.caption,
                            summary: tableData.summary,
                            rows: tableData.summary?.rows,
                            columns: tableData.summary?.columns,
                            fromRAG: true,
                            ...tableData
                        };
                        
                        const markerCreated = tableMarker.createMarker(element, metadata);
                        if (markerCreated) {
                            markersCreated++;
                        }
                    }
                } catch (error) {
                    console.error(`Error creating table marker:`, error);
                }
            }
            
            console.log(`✅ Created ${markersCreated} table markers for RAG`);
            return { success: true, markersCreated };
            
        } catch (error) {
            console.error('❌ Failed to create table markers:', error);
            return { success: false, error: error.message, markersCreated: 0 };
        }
    }
    
    /**
     * Get confidence color based on score
     * @private
     */
    getConfidenceColor(confidence) {
      if (confidence >= 0.8) return '#10b981'; // Green
      if (confidence >= 0.5) return '#f59e0b'; // Orange
      return '#ef4444'; // Red
    }
    
    // ================================
    // Core State Handlers (kept in manager)
    // ================================
    
    /**
     * Handle ping message
     * @private
     */
    handlePing() {
      return {
        initialized: this.initialized,
        inAnalysisStep: this.state.inAnalysisStep,
        features: this.getEnabledFeatures(),
        ragHighlights: this.state.ragHighlights.size,
        manualHighlights: this.state.manualHighlights.size,
        timestamp: Date.now()
      };
    }
    
    /**
     * Handle check analysis step
     * @private
     */
    handleCheckAnalysisStep() {
      return {
        isInAnalysisStep: this.state.inAnalysisStep,
        success: true
      };
    }
    
    /**
     * Handle set analysis step
     * @private
     */
    handleSetAnalysisStep(message) {
      this.setAnalysisStep(message.isAnalysisStep === true);
      return { success: true };
    }
    
    /**
     * Handle update configuration
     * @private
     */
    handleUpdateConfig(message) {
      if (message.config) {
        this.updateConfig(message.config);
      }
      return { success: true, config: this.config };
    }
    
    /**
     * Handle get status
     * @private
     */
    handleGetStatus() {
      return this.getStatus();
    }
    
    // ================================
    // Public API Methods
    // ================================
    
    /**
     * Set whether the user is in the analysis step
     */
    setAnalysisStep(isAnalysisStep) {
      this.state.inAnalysisStep = isAnalysisStep;
      console.log(`📊 Analysis step ${isAnalysisStep ? 'activated' : 'deactivated'}`);
      
      // Notify relevant services
      const selectionManager = global.serviceRegistry?.get('selectionManager');
      if (selectionManager) {
        if (isAnalysisStep) {
          selectionManager.enable?.();
        } else {
          selectionManager.disable?.();
        }
      }
      
      // Notify property handler to hide window if leaving analysis step
      if (!isAnalysisStep) {
        const propertyHandler = global.serviceRegistry?.get('propertyHandler');
        if (propertyHandler && typeof propertyHandler.hideWindow === 'function') {
          propertyHandler.hideWindow();
        }
      }
      
      // Emit state change event
      if (global.eventBus) {
        global.eventBus.emit('state:analysisStepChanged', { isAnalysisStep });
      }
    }
    
    /**
     * Update state flags
     */
    updateState(updates) {
      Object.assign(this.state, updates);
      console.log('📊 State updated:', updates);
      
      // Emit state change event
      if (global.eventBus) {
        global.eventBus.emit('state:updated', this.state);
      }
    }
    
    /**
     * Get list of enabled features
     */
    getEnabledFeatures() {
      const features = [];
      
      if (this.config.enableTextSelection) features.push('text-selection');
      if (this.config.enableMarkers) features.push('markers');
      if (this.config.enableRAG) features.push('rag');
      if (this.config.enableExtraction) features.push('extraction');
      if (this.config.createMarkersForRAG) features.push('rag-markers');
      
      return features;
    }
    
    /**
     * Update configuration
     */
    updateConfig(config) {
      this.config = { ...this.config, ...config };
      console.log('✅ Configuration updated:', this.config);
      
      // Emit config change event
      if (global.eventBus) {
        global.eventBus.emit('config:updated', this.config);
      }
    }
    
    /**
     * Get content script status
     */
    getStatus() {
      return {
        initialized: this.initialized,
        state: this.state,
        config: this.config,
        services: global.serviceRegistry?.getStatus?.() || {},
        features: this.getEnabledFeatures(),
        highlights: {
          rag: this.state.ragHighlights.size,
          manual: this.state.manualHighlights.size,
          total: this.state.ragHighlights.size + this.state.manualHighlights.size
        }
      };
    }
    
    /**
     * Check if manager is ready
     */
    isReady() {
      return this.initialized;
    }
    
    /**
     * Get current state
     */
    getState() {
      return { ...this.state };
    }
    
    /**
     * Get current configuration
     */
    getConfig() {
      return { ...this.config };
    }
    
    /**
     * Clean up content script
     */
    async cleanup() {
      console.log('🧹 Cleaning up content script...');
      
      // Clear highlight references
      this.state.ragHighlights.clear();
      this.state.manualHighlights.clear();
      
      // Clean up all services through registry
      if (global.serviceRegistry) {
        await global.serviceRegistry.cleanup();
      }
      
      // Reset state
      this.initialized = false;
      this.state = {
        inAnalysisStep: false,
        lastSelectionTime: 0,
        ragHighlights: new Map(),
        manualHighlights: new Map()
      };
      this._initPromise = null;
      
      console.log('✅ Content script cleanup completed');
    }
  }
  
  // Create singleton instance
  const contentScriptManager = new ContentScriptManager();
  
  // Expose globally
  global.contentScriptManager = contentScriptManager;
  global.ContentScriptManager = ContentScriptManager;
  
  console.log('📢 ContentScriptManager exposed to global scope');
  
})(typeof window !== 'undefined' ? window : this);
    } catch (error) {
      console.error('[core/ContentScriptManager.js] Error:', error);
    }
  })();

    // ===== Main Initialization Script =====
    ;(function() {
// src/content/content-script-main.js
// Main initialization script for ORKG content script
(function() {
  'use strict';
  
  // Check if already initialized
  if (window.orkgContentScript && window.orkgContentScript.initialized) {
    console.log('✅ ORKG content script already initialized');
    return;
  }
  
  console.log('🚀 ORKG Content Script Main starting...');
  
  // Track initialization attempts
  let initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 3;
  
  /**
   * Main initialization function
   */
  async function initialize() {
    try {
      console.log(`📋 Initialization attempt ${initAttempts + 1}/${MAX_INIT_ATTEMPTS}`);
      
      // Check for required services
      if (!window.serviceRegistry) {
        throw new Error('ServiceRegistry not found');
      }
      
      if (!window.contentScriptManager) {
        throw new Error('ContentScriptManager not found');
      }
      
      // Initialize the content script manager
      // This will handle all service initialization
      const manager = await window.contentScriptManager.init();
      
      // Verify initialization
      if (!manager || !manager.initialized) {
        throw new Error('ContentScriptManager initialization failed');
      }
      
      // Mark as successfully initialized
      if (!window.orkgContentScript) {
        window.orkgContentScript = {};
      }
      
      window.orkgContentScript.initialized = true;
      window.orkgContentScript.timestamp = new Date().toISOString();
      window.orkgContentScript.version = '2.0.0';
      
      console.log('✅ ORKG Content Script successfully initialized');
      
      // Log status
      logStatus();
      
      return true;
      
    } catch (error) {
      console.error('❌ Initialization error:', error);
      
      initAttempts++;
      
      if (initAttempts < MAX_INIT_ATTEMPTS) {
        console.log(`🔄 Retrying initialization in ${initAttempts} second(s)...`);
        setTimeout(initialize, initAttempts * 1000);
      } else {
        console.error('❌ Failed to initialize after maximum attempts');
        
        // Mark as failed
        window.orkgContentScript = {
          initialized: false,
          failed: true,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
      
      return false;
    }
  }
  
  /**
   * Log current status
   */
  function logStatus() {
    console.group('📊 ORKG Content Script Status');
    
    // Check ContentScriptManager
    if (window.contentScriptManager) {
      const status = window.contentScriptManager.getStatus();
      console.log('ContentScriptManager:', status);
    }
    
    // Check ServiceRegistry
    if (window.serviceRegistry) {
      const registryStatus = window.serviceRegistry.getStatus();
      console.log('ServiceRegistry:', {
        total: registryStatus.total,
        initialized: registryStatus.initialized,
        services: Object.keys(registryStatus.services || {})
      });
    }
    
    console.groupEnd();
  }
  
  /**
   * Wait for DOM ready
   */
  function waitForDOM() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      // DOM is already ready, initialize immediately
      initialize();
    }
  }
  
  /**
   * Create debug interface
   */
  window.orkgDebug = {
    // Get current status
    status: function() {
      return {
        initialized: window.orkgContentScript?.initialized || false,
        failed: window.orkgContentScript?.failed || false,
        attempts: initAttempts,
        hasServiceRegistry: !!window.serviceRegistry,
        hasContentScriptManager: !!window.contentScriptManager,
        services: window.serviceRegistry ? 
          Object.keys(window.serviceRegistry.getStatus().services) : []
      };
    },
    
    // Retry initialization
    retry: function() {
      initAttempts = 0;
      initialize();
    },
    
    // Log detailed status
    logStatus: logStatus,
    
    // Get service
    getService: function(name) {
      return window.serviceRegistry?.get(name);
    },
    
    // Initialize specific service
    initService: async function(name) {
      if (!window.serviceRegistry) {
        console.error('ServiceRegistry not available');
        return false;
      }
      
      try {
        await window.serviceRegistry.initialize(name);
        console.log(`✅ Service ${name} initialized`);
        return true;
      } catch (error) {
        console.error(`❌ Failed to initialize ${name}:`, error);
        return false;
      }
    },
    
    // Clean up everything
    cleanup: async function() {
      if (window.contentScriptManager) {
        await window.contentScriptManager.cleanup();
      }
      
      window.orkgContentScript = {
        initialized: false,
        cleaned: true,
        timestamp: new Date().toISOString()
      };
    }
  };
  
  // Start initialization
  waitForDOM();
  
})();
    })();

    // ===== Verify Critical Exports =====
    console.log('🔍 Verifying critical exports...');
    const criticalExports = {
      BaseMarker: window.BaseMarker,
      MarkerUI: window.MarkerUI,
      IconRegistry: window.IconRegistry,
      ModalManager: window.ModalManager,
      MenuActionHandler: window.MenuActionHandler,
      MarkerRegistry: window.MarkerRegistry,
      MarkerEventBus: window.MarkerEventBus,
      MarkerConfig: window.MarkerConfig,
      TextMarker: window.TextMarker,
      ImageMarker: window.ImageMarker,
      TableMarker: window.TableMarker,
      TextHighlighter: window.TextHighlighter,
      PropertyWindow: window.PropertyWindow || window.propertyWindow,
      ContentScriptManager: window.ContentScriptManager
    };
    
    let missingExports = [];
    for (const [name, value] of Object.entries(criticalExports)) {
      if (typeof value === 'undefined') {
        missingExports.push(name);
        console.warn('❌ Missing export:', name);
      } else {
        console.log('✅', name, 'is available');
      }
    }
    
    if (missingExports.length > 0) {
      console.error('⚠️ Missing critical exports:', missingExports);
    } else {
      console.log('✅ All critical exports verified!');
    }
    
    // Mark as initialized
    window.orkgContentScript = {
      initialized: true,
      timestamp: new Date().toISOString(),
      version: '3.0.0',
      exports: criticalExports
    };
    
    console.log('✅ ORKG content script loaded successfully!');

  } catch (error) {
    console.error('❌ Critical error loading ORKG content script:', error);
    window.orkgContentScript = {
      initialized: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }
  
})();

// ================================
// End of ORKG Content Script Bundle
// ================================
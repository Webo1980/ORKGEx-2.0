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
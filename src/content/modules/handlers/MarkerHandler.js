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
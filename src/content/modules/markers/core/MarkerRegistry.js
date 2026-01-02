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
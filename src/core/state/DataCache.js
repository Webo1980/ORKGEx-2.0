// ================================
// src/core/state/DataCache.js - FIXED: Event listener issues
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class DataCache {
    constructor() {
        this.cache = new Map();
        this.ttlCache = new Map();
        this.defaultTTL = 300000; // 5 minutes
        this.maxCacheSize = 1000;
        this.isInitialized = false;
        this.cleanupInterval = null;
        
        // Cache hit/miss statistics
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            cleanups: 0
        };
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('💾 Initializing DataCache...');
            
            this.setupEventListeners();
            this.startCleanupTimer();
            
            this.isInitialized = true;
            console.log('✅ DataCache initialized');
            
        } catch (error) {
            console.error('❌ DataCache initialization failed:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        // Listen for cache management events with proper error handling
        eventManager.on('cache:clear', (data) => {
            try {
                if (data && typeof data === 'object' && data.key) {
                    this.delete(data.key);
                } else if (!data || typeof data !== 'object') {
                    // If data is not an object or is null/undefined, clear all
                    this.clear();
                }
            } catch (error) {
                console.error('Error handling cache:clear event:', error);
            }
        });
        
        eventManager.on('cache:stats', () => {
            console.log('📊 Cache Statistics:', this.getStats());
        });
        
        // Clear cache on workflow reset
        eventManager.on('workflow:user_reset_requested', () => {
            try {
                this.clearByPrefix('field_');
                this.clearByPrefix('problem_');
                this.clearByPrefix('template_');
                this.clearByPrefix('problems_');
                console.log('🧹 Cache cleared for workflow reset');
            } catch (error) {
                console.error('Error clearing cache on reset:', error);
            }
        });
    }
    
    startCleanupTimer() {
        // Run cleanup every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000);
    }
    
    /**
     * Set cache entry with optional TTL
     */
    set(key, value, ttl = null) {
        if (!key) {
            console.warn('DataCache.set: Key is required');
            return false;
        }
        
        try {
            // Use provided TTL or default
            const finalTTL = ttl !== null ? ttl : this.defaultTTL;
            const expiresAt = Date.now() + finalTTL;
            
            // Check cache size limit
            if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
                this.evictOldest();
            }
            
            // Store data with metadata
            const cacheEntry = {
                value: this.deepClone(value),
                createdAt: Date.now(),
                expiresAt: expiresAt,
                accessCount: 0,
                lastAccessed: Date.now(),
                size: this.estimateSize(value)
            };
            
            this.cache.set(key, cacheEntry);
            this.ttlCache.set(key, expiresAt);
            
            this.stats.sets++;
            
            console.log(`💾 Cache SET: ${key} (TTL: ${finalTTL}ms)`);
            
            // Emit cache event
            eventManager.emit('cache:set', { key, ttl: finalTTL });
            
            return true;
            
        } catch (error) {
            console.error('DataCache.set error:', error);
            return false;
        }
    }
    
    /**
     * Get cache entry
     */
    get(key) {
        if (!key) {
            console.warn('DataCache.get: Key is required');
            return null;
        }
        
        try {
            const entry = this.cache.get(key);
            
            if (!entry) {
                this.stats.misses++;
                return null;
            }
            
            // Check if expired
            if (this.isExpired(key)) {
                this.delete(key);
                this.stats.misses++;
                console.log(`💾 Cache EXPIRED: ${key}`);
                return null;
            }
            
            // Update access metadata
            entry.accessCount++;
            entry.lastAccessed = Date.now();
            
            this.stats.hits++;
            
            // Emit cache event
            eventManager.emit('cache:hit', { key, accessCount: entry.accessCount });
            
            return this.deepClone(entry.value);
            
        } catch (error) {
            console.error('DataCache.get error:', error);
            this.stats.misses++;
            return null;
        }
    }
    
    /**
     * Check if key exists and is not expired
     */
    has(key) {
        if (!key) return false;
        
        if (!this.cache.has(key)) {
            return false;
        }
        
        if (this.isExpired(key)) {
            this.delete(key);
            return false;
        }
        
        return true;
    }
    
    /**
     * Delete cache entry
     */
    delete(key) {
        if (!key) return false;
        
        const deleted = this.cache.delete(key);
        this.ttlCache.delete(key);
        
        if (deleted) {
            console.log(`💾 Cache DELETE: ${key}`);
            eventManager.emit('cache:delete', { key });
        }
        
        return deleted;
    }
    
    /**
     * Clear all cache entries
     */
    clear() {
        try {
            const size = this.cache.size;
            this.cache.clear();
            this.ttlCache.clear();
            
            console.log(`💾 Cache CLEAR: ${size} entries removed`);
            
            // Only emit event if we're not in a recursive call
            if (!this.clearing) {
                this.clearing = true;
                eventManager.emit('cache:cleared', { entriesRemoved: size });
                this.clearing = false;
            }
            
            return size;
        } catch (error) {
            console.error('Error clearing cache:', error);
            this.clearing = false;
            return 0;
        }
    }
    
    /**
     * Clear entries by key prefix
     */
    clearByPrefix(prefix) {
        let removed = 0;
        console.log(`💾 Cache CLEAR by prefix: ${prefix}`);
        console.log(`💾 Cache size before clear: ${this.cache}`);
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.delete(key);
                removed++;
            }
        }
        
        console.log(`💾 Cache CLEAR by prefix '${prefix}': ${removed} entries removed`);
        return removed;
    }
    
    /**
     * Get cache entry with metadata
     */
    getWithMetadata(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }
        
        if (this.isExpired(key)) {
            this.delete(key);
            return null;
        }
        
        // Update access metadata
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        
        return {
            value: this.deepClone(entry.value),
            metadata: {
                createdAt: entry.createdAt,
                expiresAt: entry.expiresAt,
                accessCount: entry.accessCount,
                lastAccessed: entry.lastAccessed,
                size: entry.size,
                ttl: entry.expiresAt - Date.now()
            }
        };
    }
    
    /**
     * Set with specific expiration time
     */
    setWithExpiration(key, value, expiresAt) {
        const ttl = expiresAt - Date.now();
        return this.set(key, value, Math.max(0, ttl));
    }
    
    /**
     * Extend TTL for existing entry
     */
    extend(key, additionalTTL) {
        const entry = this.cache.get(key);
        
        if (!entry || this.isExpired(key)) {
            return false;
        }
        
        entry.expiresAt += additionalTTL;
        this.ttlCache.set(key, entry.expiresAt);
        
        console.log(`💾 Cache EXTEND: ${key} (+${additionalTTL}ms)`);
        return true;
    }
    
    /**
     * Get all keys
     */
    keys() {
        return Array.from(this.cache.keys());
    }
    
    /**
     * Get all keys matching prefix
     */
    keysByPrefix(prefix) {
        return this.keys().filter(key => key.startsWith(prefix));
    }
    
    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }
    
    /**
     * Get memory usage estimate
     */
    getMemoryUsage() {
        let totalSize = 0;
        
        for (const entry of this.cache.values()) {
            totalSize += entry.size || 0;
        }
        
        return {
            entries: this.cache.size,
            estimatedBytes: totalSize,
            estimatedMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;
        
        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            entries: this.cache.size,
            memory: this.getMemoryUsage()
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0,
            cleanups: 0
        };
        
        console.log('📊 Cache statistics reset');
    }
    
    /**
     * Check if entry is expired
     */
    isExpired(key) {
        const expiresAt = this.ttlCache.get(key);
        return expiresAt && Date.now() > expiresAt;
    }
    
    /**
     * Clean up expired entries
     */
    cleanup() {
        let removed = 0;
        const now = Date.now();
        
        for (const [key, expiresAt] of this.ttlCache.entries()) {
            if (now > expiresAt) {
                this.delete(key);
                removed++;
            }
        }
        
        if (removed > 0) {
            this.stats.cleanups++;
            console.log(`💾 Cache CLEANUP: ${removed} expired entries removed`);
            eventManager.emit('cache:cleanup', { entriesRemoved: removed });
        }
        
        return removed;
    }
    
    /**
     * Evict oldest entry
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
            this.stats.evictions++;
            console.log(`💾 Cache EVICT: ${oldestKey} (oldest entry)`);
        }
    }
    
    /**
     * Deep clone object to prevent mutations
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (typeof obj === 'object') {
            const cloned = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    cloned[key] = this.deepClone(obj[key]);
                }
            }
            return cloned;
        }
        
        return obj;
    }
    
    /**
     * Estimate object size in bytes
     */
    estimateSize(obj) {
        try {
            const jsonString = JSON.stringify(obj);
            return new Blob([jsonString]).size;
        } catch (error) {
            // Fallback estimation
            return JSON.stringify(obj || {}).length * 2; // Rough estimate
        }
    }
    
    /**
     * Cache research field data with specific TTL
     */
    setResearchFieldData(abstract, fieldData) {
        const key = `field_${this.hashString(abstract)}`;
        const ttl = 1800000; // 30 minutes for research field data
        
        const cacheData = {
            abstract: abstract,
            fields: fieldData,
            timestamp: Date.now()
        };
        
        return this.set(key, cacheData, ttl);
    }
    
    /**
     * Get cached research field data
     */
    getResearchFieldData(abstract) {
        const key = `field_${this.hashString(abstract)}`;
        return this.get(key);
    }
    
    /**
     * Cache ORKG field info
     */
    setORKGFieldInfo(fieldLabel, fieldInfo) {
        const key = `orkg_field_${this.hashString(fieldLabel)}`;
        const ttl = 3600000; // 1 hour for ORKG field info
        
        return this.set(key, fieldInfo, ttl);
    }
    
    /**
     * Get cached ORKG field info
     */
    getORKGFieldInfo(fieldLabel) {
        const key = `orkg_field_${this.hashString(fieldLabel)}`;
        return this.get(key);
    }
    
    /**
     * Cache problem analysis results
     */
    setProblemResults(fieldId, threshold, results) {
        const key = `problems_${fieldId}_${threshold}`;
        const ttl = 1800000; // 30 minutes for problem results
        
        return this.set(key, results, ttl);
    }
    
    /**
     * Get cached problem analysis results
     */
    getProblemResults(fieldId, threshold) {
        const key = `problems_${fieldId}_${threshold}`;
        return this.get(key);
    }
    
    /**
     * Simple hash function for cache keys
     */
    hashString(str) {
        if (!str) return '0';
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(36);
    }
    
    /**
     * Export cache data for persistence
     */
    export() {
        const data = {};
        
        for (const [key, entry] of this.cache.entries()) {
            if (!this.isExpired(key)) {
                data[key] = {
                    value: entry.value,
                    expiresAt: entry.expiresAt,
                    createdAt: entry.createdAt
                };
            }
        }
        
        return data;
    }
    
    /**
     * Import cache data from persistence
     */
    import(data) {
        if (!data || typeof data !== 'object') {
            return 0;
        }
        
        let imported = 0;
        const now = Date.now();
        
        for (const [key, entry] of Object.entries(data)) {
            if (entry.expiresAt && entry.expiresAt > now) {
                const ttl = entry.expiresAt - now;
                this.set(key, entry.value, ttl);
                imported++;
            }
        }
        
        console.log(`💾 Cache IMPORT: ${imported} entries imported`);
        return imported;
    }
    
    /**
     * Get cache status for debugging
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            defaultTTL: this.defaultTTL,
            stats: this.getStats(),
            memory: this.getMemoryUsage(),
            hasCleanupTimer: !!this.cleanupInterval
        };
    }
    
    /**
     * Cleanup and shutdown
     */
    cleanup() {
        console.log('🧹 DataCache cleanup...');
        
        // Stop cleanup timer
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        // Clear all cache data
        this.clear();
        
        // Remove event listeners
        eventManager.off('cache:clear');
        eventManager.off('cache:stats');
        eventManager.off('workflow:user_reset_requested');
        
        // Reset state
        this.isInitialized = false;
        this.resetStats();
        
        console.log('✅ DataCache cleanup completed');
    }
}
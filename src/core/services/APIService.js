// ================================
// src/core/services/APIService.js - FIXED: DataCache integration
// ================================

import { eventManager } from '../../utils/eventManager.js';
import { HttpClient } from '../../utils/httpClient.js';

export class APIService {
    constructor(dataCache, config = {}) {
        this.dataCache = dataCache;
        this.config = {
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000,
            cacheEnabled: true,
            cacheTTL: 300000, // 5 minutes
            ...config
        };
        
        this.activeRequests = new Map();
        this.requestQueue = [];
        this.isInitialized = false;
        
        // Request/Response interceptors
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        
        // Statistics
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            retries: 0
        };
    }
    
    async init() {
        if (this.isInitialized) return;
        
        console.log('📡 Initializing APIService...');
        
        // Get DataCache from ServiceManager if not provided
        if (!this.dataCache) {
            this.dataCache = window.serviceManager?.getService('dataCache');
            if (this.dataCache) {
                console.log('📡 APIService: DataCache connected');
            } else {
                console.warn('⚠️ APIService: No DataCache available, caching disabled');
            }
        } else {
            console.log('📡 APIService: DataCache connected');
        }
        
        // Add default interceptors
        this.addRequestInterceptor(this.addTimestampInterceptor);
        this.addRequestInterceptor(this.addCacheKeyInterceptor);
        this.addResponseInterceptor(this.logResponseInterceptor);
        this.addResponseInterceptor(this.cacheResponseInterceptor);
        
        this.isInitialized = true;
        console.log('✅ APIService initialized');
    }
    
    /**
     * Make HTTP request with caching, retry, and error handling
     */
    async request(options) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        let requestConfig = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: this.config.timeout,
            cache: this.config.cacheEnabled,
            retry: true,
            ...options
        };
        
        // Apply request interceptors
        for (const interceptor of this.requestInterceptors) {
            const result = await interceptor(requestConfig);
            if (result) {
                requestConfig = result;
            }
        }
        
        const cacheKey = requestConfig.cacheKey || this.generateCacheKey(requestConfig);
        
        // Check cache first
        if (requestConfig.cache && this.dataCache && typeof this.dataCache.get === 'function') {
            const cached = this.dataCache.get(cacheKey);
            if (cached) {
                this.stats.cacheHits++;
                console.log(`💾 Cache hit for: ${requestConfig.url}`);
                return { data: cached, cached: true, status: 200 };
            }
            this.stats.cacheMisses++;
        }
        
        // Check for duplicate in-flight requests
        if (this.activeRequests.has(cacheKey)) {
            console.log(`⏳ Awaiting existing request: ${requestConfig.url}`);
            return await this.activeRequests.get(cacheKey);
        }
        
        // Create request promise
        const requestPromise = this.executeRequest(requestConfig);
        this.activeRequests.set(cacheKey, requestPromise);
        
        try {
            const response = await requestPromise;
            
            // Apply response interceptors
            let finalResponse = response;
            for (const interceptor of this.responseInterceptors) {
                finalResponse = await interceptor(finalResponse, requestConfig) || finalResponse;
            }
            
            return finalResponse;
            
        } finally {
            this.activeRequests.delete(cacheKey);
        }
    }
    
    /**
     * Execute HTTP request with retry logic
     */
    async executeRequest(config) {
        let lastError;
        let attempt = 0;
        const maxRetries = config.retry ? this.config.maxRetries : 0;
        
        while (attempt <= maxRetries) {
            try {
                this.stats.totalRequests++;
                if (attempt > 0) {
                    this.stats.retries++;
                    console.log(`🔄 Retry attempt ${attempt} for: ${config.url}`);
                    await this.delay(this.config.retryDelay * attempt);
                }
                
                // Use HttpClient for the actual request
                const response = await HttpClient.makeRequest(config.url, {
                    method: config.method,
                    headers: config.headers,
                    body: config.body,
                    timeout: config.timeout,
                    retries: 0 // We handle retries ourselves
                });
                
                return {
                    data: response,
                    status: 200,
                    cached: false,
                    config
                };
                
            } catch (error) {
                lastError = error;
                this.stats.errors++;
                
                // Don't retry on certain errors
                if (error.code === 'TIMEOUT' && attempt === 0) {
                    throw new Error(`Request timeout after ${config.timeout}ms`);
                }
                
                if (error.status && error.status >= 400 && error.status < 500) {
                    // Client errors shouldn't be retried
                    break;
                }
                
                attempt++;
            }
        }
        
        throw lastError || new Error('Request failed after all retries');
    }
    
    /**
     * Convenient HTTP method shortcuts
     */
    async get(url, options = {}) {
        return this.request({ ...options, method: 'GET', url });
    }
    
    async post(url, data, options = {}) {
        return this.request({ ...options, method: 'POST', url, body: data });
    }
    
    async put(url, data, options = {}) {
        return this.request({ ...options, method: 'PUT', url, body: data });
    }
    
    async delete(url, options = {}) {
        return this.request({ ...options, method: 'DELETE', url });
    }
    
    /**
     * Request interceptors
     */
    addRequestInterceptor(interceptor) {
        this.requestInterceptors.push(interceptor);
    }
    
    addTimestampInterceptor = (config) => {
        config.timestamp = Date.now();
        return config;
    }
    
    addCacheKeyInterceptor = (config) => {
        if (!config.cacheKey) {
            config.cacheKey = this.generateCacheKey(config);
        }
        return config;
    }
    
    /**
     * Response interceptors
     */
    addResponseInterceptor(interceptor) {
        this.responseInterceptors.push(interceptor);
    }
    
    logResponseInterceptor = (response, config) => {
        const duration = Date.now() - (config.timestamp || Date.now());
        console.log(`📡 ${config.method} ${config.url} - ${response.status || 200} (${duration}ms)`);
        return response;
    }
    
    cacheResponseInterceptor = async (response, config) => {
        if (config.cache && this.dataCache && typeof this.dataCache.set === 'function' && response.status === 200) {
            this.dataCache.set(
                config.cacheKey, 
                response.data, 
                this.config.cacheTTL
            );
        }
        return response;
    }
    
    /**
     * Cache key generation
     */
    generateCacheKey(config) {
        const keyParts = [
            config.method,
            config.url,
            JSON.stringify(config.body || ''),
            JSON.stringify(Object.keys(config.headers || {}).sort())
        ];
        
        // Simple hash
        let hash = 0;
        const keyString = keyParts.join('|');
        for (let i = 0; i < keyString.length; i++) {
            const char = keyString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return `api_${Math.abs(hash).toString(36)}`;
    }
    
    /**
     * Utility methods
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Cancel all active requests
     */
    cancelAllRequests() {
        console.log(`❌ Cancelling ${this.activeRequests.size} active requests`);
        this.activeRequests.clear();
    }
    
    /**
     * Clear API cache
     */
    async clearCache() {
        if (this.dataCache && typeof this.dataCache.clearByPrefix === 'function') {
            this.dataCache.clearByPrefix('api_');
            console.log('🗑️ API cache cleared');
        }
    }
    
    /**
     * Get service statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeRequests: this.activeRequests.size,
            cacheHitRate: this.stats.totalRequests > 0 
                ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%',
            errorRate: this.stats.totalRequests > 0
                ? (this.stats.errors / this.stats.totalRequests * 100).toFixed(2) + '%' 
                : '0%'
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            retries: 0
        };
    }
    
    /**
     * Health check
     */
    async healthCheck(url) {
        try {
            const response = await this.get(url, { 
                cache: false, 
                retry: false,
                timeout: 5000 
            });
            return {
                healthy: true,
                status: response.status,
                responseTime: Date.now() - response.config.timestamp
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }
    
    /**
     * Service status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            activeRequests: this.activeRequests.size,
            hasCacheManager: !!this.dataCache,
            cacheEnabled: this.config.cacheEnabled && !!this.dataCache,
            stats: this.getStats(),
            interceptors: {
                request: this.requestInterceptors.length,
                response: this.responseInterceptors.length
            }
        };
    }
    
    /**
     * Check if service is ready
     */
    isReady() {
        return this.isInitialized;
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        console.log('🧹 APIService cleanup...');
        
        this.cancelAllRequests();
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.requestQueue = [];
        this.resetStats();
        
        this.isInitialized = false;
        
        console.log('✅ APIService cleanup completed');
    }
}

export default APIService;
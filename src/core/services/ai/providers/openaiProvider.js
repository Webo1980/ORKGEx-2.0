// ================================
// src/core/services/ai/providers/OpenAIProvider.js - CLEAN Version with Caching
// ================================

import { HttpClient } from '../../../../utils/httpClient.js';

export class OpenAIProvider {
    constructor(openaiConfig) {
        console.log("🔧 Initializing OpenAIProvider with config:", openaiConfig);
        if (!openaiConfig) {
            throw new Error('OpenAIProvider requires openaiConfig parameter');
        }
        
        // Use provided config (passed from popup.js)
        this.apiKey = openaiConfig.apiKey || null;
        this.baseURL = openaiConfig.baseURL || 'https://api.openai.com/v1';
        this.model = openaiConfig.model || 'gpt-3.5-turbo';
        this.temperature = openaiConfig.temperature || 0.7;
        this.maxTokens = openaiConfig.maxTokens || 1000;
        this.timeout = openaiConfig.timeout || 30000;
        
        // Cache manager will be set by factory
        this.cacheManager = null;
        
        // Cache configuration
        this.cacheTTL = {
            problem: 3600000,
            template: 3600000,
            content: 1800000,
            summary: 1800000,
            default: 900000
        };
        
        // Statistics
        this.stats = {
            totalRequests: 0,
            totalTokens: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0
        };
        
        console.log('🤖 OpenAI Provider initialized with:', {
            hasApiKey: !!this.apiKey,
            model: this.model,
            baseURL: this.baseURL
        });
    }
    
    async init() {
        if (this.isInitialized) return;
        
        // Validate configuration
        if (!this.apiKey) {
            console.warn('⚠️ OpenAI API key not configured');
            throw new Error('OpenAI API key is required');
        }
        
        console.log('🤖 OpenAI Provider initialized with model:', this.model);
        this.isInitialized = true;
    }
    
    /**
     * Make request to OpenAI API - this is what GenerationAdapter calls
     */
    async makeRequest(options = {}) {
        // Initialize if needed
        if (!this.cacheManager && window.serviceManager) {
            await this.init();
        }
        
        const {
            messages,
            model = this.model,
            temperature = this.temperature,
            max_tokens = this.maxTokens,
            stream = false,
            useCache = true,
            cacheKey = null,
            cacheTTL = null
        } = options;
        
        if (!messages || !Array.isArray(messages)) {
            throw new Error('Messages array is required');
        }
        
        if (!this.apiKey) {
            throw new Error('OpenAI API key is not configured');
        }
        
        // Generate cache key if caching is enabled
        let finalCacheKey = cacheKey;
        if (useCache && this.cacheManager && !finalCacheKey) {
            finalCacheKey = this.generateCacheKey(messages, model, temperature);
        }
        
        // Check cache first
        if (useCache && this.cacheManager && finalCacheKey) {
            const cached = this.cacheManager.get(finalCacheKey);
            if (cached) {
                this.stats.cacheHits++;
                console.log(`💾 OpenAI cache hit for request type: ${this.getRequestType(messages)}`);
                return cached;
            }
            this.stats.cacheMisses++;
        }
        
        try {
            this.stats.totalRequests++;
            
            // Make actual API request using HttpClient
            const response = await HttpClient.post(
                `${this.baseURL}/chat/completions`,
                {
                    model,
                    messages,
                    temperature,
                    max_tokens,
                    stream
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: this.timeout,
                    retries: 2,
                    retryDelay: 1000
                }
            );
            
            // Track token usage
            if (response.usage) {
                this.stats.totalTokens += response.usage.total_tokens || 0;
            }
            
            // Cache the response
            if (useCache && this.cacheManager && finalCacheKey) {
                const ttl = cacheTTL || this.getCacheTTL(messages);
                this.cacheManager.set(finalCacheKey, response, ttl);
                console.log(`💾 Cached OpenAI response for: ${this.getRequestType(messages)}`);
            }
            
            return response;
            
        } catch (error) {
            this.stats.errors++;
            console.error('OpenAI API request failed:', error);
            
            // Check for specific error types and provide helpful messages
            if (error.status === 401) {
                throw new Error('Invalid OpenAI API key. Please check your configuration.');
            } else if (error.status === 429) {
                throw new Error('OpenAI rate limit exceeded. Please try again later.');
            } else if (error.code === 'TIMEOUT') {
                throw new Error('OpenAI request timed out. Please try again.');
            }
            
            throw error;
        }
    }
    
    /**
     * Test the API connection
     */
    async testConnection() {
        if (!this.apiKey) {
            return {
                success: false,
                error: 'No API key configured'
            };
        }
        
        try {
            const response = await this.makeRequest({
                messages: [
                    { role: 'user', content: 'Test' }
                ],
                max_tokens: 5,
                useCache: false
            });
            
            return {
                success: true,
                model: response.model || this.model
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Clear OpenAI cache
     */
    clearCache() {
        if (this.cacheManager) {
            this.cacheManager.clearByPrefix('openai_');
            console.log('🗑️ OpenAI cache cleared');
        }
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cacheHits: this.stats.cacheHits,
            cacheMisses: this.stats.cacheMisses,
            hitRate: this.stats.totalRequests > 0 
                ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%'
                : '0%'
        };
    }
    
    /**
     * Helper methods for caching
     */
    generateCacheKey(messages, model, temperature) {
        const content = messages.map(m => m.content).join('|');
        const key = `${model}|${temperature}|${content}`;
        return `openai_${this.hashString(key)}`;
    }
    
    getCacheTTL(messages) {
        const content = messages[messages.length - 1]?.content || '';
        
        if (content.includes('problem')) return this.cacheTTL.problem;
        if (content.includes('template')) return this.cacheTTL.template;
        if (content.includes('extract') || content.includes('analyze')) return this.cacheTTL.content;
        if (content.includes('summar')) return this.cacheTTL.summary;
        
        return this.cacheTTL.default;
    }
    
    getRequestType(messages) {
        const content = messages[messages.length - 1]?.content || '';
        
        if (content.includes('problem')) return 'problem generation';
        if (content.includes('template')) return 'template generation';
        if (content.includes('extract') || content.includes('analyze')) return 'content analysis';
        if (content.includes('summar')) return 'summary';
        
        return 'general';
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * Update configuration
     */
    updateConfig(config) {
        if (config.apiKey) {
            this.apiKey = config.apiKey;
            console.log('✅ OpenAI API key updated');
        }
        
        if (config.model) {
            this.model = config.model;
        }
        
        if (config.temperature !== undefined) {
            this.temperature = config.temperature;
        }
        
        if (config.maxTokens !== undefined) {
            this.maxTokens = config.maxTokens;
        }
        
        if (config.timeout !== undefined) {
            this.timeout = config.timeout;
        }
    }
    
    /**
     * Get provider statistics
     */
    getStats() {
        return {
            ...this.stats,
            ...this.getCacheStats(),
            averageTokensPerRequest: this.stats.totalRequests > 0 
                ? Math.round(this.stats.totalTokens / this.stats.totalRequests)
                : 0,
            errorRate: this.stats.totalRequests > 0
                ? ((this.stats.errors / this.stats.totalRequests) * 100).toFixed(2) + '%'
                : '0%'
        };
    }
    
    /**
     * Check if provider is ready
     */
    isReady() {
        return !!this.apiKey;
    }
    
    /**
     * Get provider status
     */
    getStatus() {
        return {
            ready: this.isReady(),
            hasApiKey: !!this.apiKey,
            hasCacheManager: !!this.cacheManager,
            model: this.model,
            temperature: this.temperature,
            maxTokens: this.maxTokens,
            stats: this.getStats()
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalRequests: 0,
            totalTokens: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.clearCache();
        this.resetStats();
        console.log('🧹 OpenAI Provider cleaned up');
    }
}

export default OpenAIProvider;
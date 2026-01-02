// ================================
// src/core/services/EmbeddingService.js - Complete Optimized Implementation
// ================================

import { eventManager } from '../../utils/eventManager.js';
import { sanitizeText } from '../../utils/textUtils.js';

export class EmbeddingService {
    constructor(config = {}) {
        // Try to get API key from multiple sources
        const apiKey = config.openaiApiKey || 
                      config.apiKey || 
                      window.orkgConfig?.defaults?.openai?.apiKey ||
                      window.orkgConfig?.getOpenAIKey?.() ||
                      '';
        
        this.config = {
            apiKey: apiKey,
            model: config.model || config.openaiModel || 'text-embedding-3-small',
            baseUrl: config.baseUrl || config.openaiBaseUrl || 'https://api.openai.com/v1',
            maxBatchSize: config.maxBatchSize || 100,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            dimension: config.dimension || 1536,
            timeout: config.timeout || 30000,
            useMockIfNoKey: config.useMockIfNoKey !== false,
            useTextSimilarityFallback: config.useTextSimilarityFallback !== false,
            boostKeywordMatches: config.boostKeywordMatches !== false,
            keywordBoostFactor: config.keywordBoostFactor || 0.02,
            maxKeywordBoost: config.maxKeywordBoost || 0.2,
            ...config
        };
        
        // Adjust dimension based on model
        if (this.config.model === 'text-embedding-3-large') {
            this.config.dimension = 3072;
        } else if (this.config.model === 'text-embedding-ada-002') {
            this.config.dimension = 1536;
        }
        
        this.initialized = false;
        this.cache = new Map();
        this.maxCacheSize = 1000;
        this.useFallback = false;
        this.useTextSimilarity = false;
        
        // Rate limiting for OpenAI
        this.lastRequestTime = 0;
        this.requestsPerMinute = 0;
        this.requestWindowStart = Date.now();
        
        // Statistics
        this.stats = {
            totalEmbeddings: 0,
            cacheHits: 0,
            cacheMisses: 0,
            apiCalls: 0,
            errors: 0,
            totalLatency: 0,
            totalTokens: 0,
            fallbackUsed: 0,
            keywordBoosts: 0
        };
        
        console.log('🚀 OpenAIEmbeddingService created with config:', {
            hasApiKey: !!this.config.apiKey && this.config.apiKey.startsWith('sk-'),
            model: this.config.model,
            dimension: this.config.dimension,
            baseUrl: this.config.baseUrl,
            boostKeywordMatches: this.config.boostKeywordMatches
        });
    }
    
    /**
     * Initialize the service
     */
    async init() {
        if (this.initialized) return true;
        
        try {
            console.log('🌟 Initializing OpenAI Embedding Service...');
            
            // Check if we have an API key
            if (!this.config.apiKey || this.config.apiKey.includes('your-') || !this.config.apiKey.startsWith('sk-')) {
                if (this.config.useMockIfNoKey) {
                    console.log('⚠️ No valid OpenAI API key found (should start with sk-)');
                    console.log('📝 Using text similarity as fallback');
                    this.useTextSimilarity = true;
                    this.useFallback = true;
                } else {
                    throw new Error('OpenAI API key required but not provided');
                }
            } else {
                console.log('🔑 OpenAI API key found');
                
                // Test the API
                try {
                    await this.testApi();
                    this.useFallback = false;
                    this.useTextSimilarity = false;
                    console.log('✅ OpenAI API test successful');
                } catch (error) {
                    console.error('❌ OpenAI API test failed:', error);
                    
                    if (this.config.useTextSimilarityFallback) {
                        console.log('📝 Falling back to text similarity');
                        this.handleFallback();
                    } else {
                        throw error;
                    }
                }
            }
            
            this.initialized = true;
            console.log('✅ OpenAIEmbeddingService initialized', {
                usingFallback: this.useFallback,
                usingTextSimilarity: this.useTextSimilarity,
                model: this.config.model
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ OpenAIEmbeddingService initialization failed:', error);
            
            // Last resort fallback
            if (this.config.useMockIfNoKey) {
                this.handleFallback();
                this.initialized = true;
                return true;
            }
            
            throw error;
        }
    }
    
    /**
     * Handle fallback to text similarity
     */
    handleFallback() {
        console.log('📝 Using text similarity as fallback');
        this.useTextSimilarity = true;
        this.useFallback = true;
    }
    
    /**
     * Test the API connection
     */
    async testApi() {
        console.log('🧪 Testing OpenAI API...');
        
        const testText = 'Test embedding';
        const url = `${this.config.baseUrl}/embeddings`;
        
        console.log('🔍 Testing at URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                input: testText,
                model: this.config.model,
                encoding_format: 'float'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
            
            if (response.status === 401) {
                throw new Error(`Invalid API key: ${errorMessage}`);
            } else if (response.status === 429) {
                throw new Error(`Rate limit exceeded: ${errorMessage}`);
            } else if (response.status === 404) {
                throw new Error(`Model not found: ${this.config.model}`);
            }
            
            throw new Error(`OpenAI API error: ${errorMessage}`);
        }
        
        const result = await response.json();
        
        // Validate response structure
        if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
            throw new Error('Unexpected response format from OpenAI API');
        }
        
        const embedding = result.data[0].embedding;
        console.log('✅ API test successful - embedding dimensions:', embedding.length);
        
        // Update dimension based on actual response
        this.config.dimension = embedding.length;
        
        return true;
    }
    
    /**
     * Call OpenAI API with rate limiting
     */
    async _callApi(texts, retryCount = 0) {
        // Rate limiting check
        await this.enforceRateLimit();
        
        const url = `${this.config.baseUrl}/embeddings`;
        
        try {
            const startTime = Date.now();
            
            // OpenAI expects 'input' field (can be string or array)
            const input = Array.isArray(texts) && texts.length === 1 ? texts[0] : texts;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    input: input,
                    model: this.config.model,
                    encoding_format: 'float'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
                const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
                
                // Handle rate limiting
                if (response.status === 429 && retryCount < this.config.maxRetries) {
                    const retryAfter = response.headers.get('Retry-After');
                    const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelay * (retryCount + 1);
                    console.log(`⏳ Rate limited, retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this._callApi(texts, retryCount + 1);
                }
                
                throw new Error(`OpenAI API error: ${errorMessage}`);
            }
            
            const result = await response.json();
            
            // Extract embeddings from response
            const embeddings = result.data.map(item => item.embedding);
            
            // Update statistics
            this.stats.apiCalls++;
            this.stats.totalLatency += (Date.now() - startTime);
            this.stats.totalTokens += result.usage?.total_tokens || 0;
            
            return embeddings;
            
        } catch (error) {
            this.stats.errors++;
            
            if (retryCount < this.config.maxRetries && !error.message.includes('401')) {
                console.log(`🔄 Retrying... (${retryCount + 1}/${this.config.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (retryCount + 1)));
                return this._callApi(texts, retryCount + 1);
            }
            
            throw error;
        }
    }
    
    /**
     * Enforce rate limiting
     */
    async enforceRateLimit() {
        const now = Date.now();
        const windowElapsed = now - this.requestWindowStart;
        
        // Reset window if more than a minute has passed
        if (windowElapsed > 60000) {
            this.requestsPerMinute = 0;
            this.requestWindowStart = now;
        }
        
        // OpenAI tier limits (adjust based on your tier)
        const maxRequestsPerMinute = 3000; // Tier 1 limit for text-embedding-3-small
        
        if (this.requestsPerMinute >= maxRequestsPerMinute) {
            const waitTime = 60000 - windowElapsed;
            console.log(`⏳ Rate limit approaching, waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requestsPerMinute = 0;
            this.requestWindowStart = Date.now();
        }
        
        this.requestsPerMinute++;
        
        // Also enforce minimum time between requests
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < 50) {
            await new Promise(resolve => setTimeout(resolve, 50 - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
    }
    
    /**
     * Generate embeddings - main interface
     */
    async embed(texts, options = {}) {
        if (!this.initialized) {
            await this.init();
        }
        
        const startTime = Date.now();
        const { normalize = true } = options;
        
        // Handle single text or array
        const isArray = Array.isArray(texts);
        const textArray = isArray ? texts : [texts];
        
        // Validate and preprocess inputs
        const validTexts = textArray
            .filter(text => text && typeof text === 'string' && text.trim().length > 0)
            .map(text => this._preprocessText(text));
        
        if (validTexts.length === 0) {
            throw new Error('No valid text inputs provided');
        }
        
        // If using fallback, use mock embeddings
        if (this.useFallback) {
            const embeddings = validTexts.map(text => this._generateMockEmbedding(text));
            return isArray ? embeddings : embeddings[0];
        }
        
        const embeddings = [];
        
        // Process in batches
        for (let i = 0; i < validTexts.length; i += this.config.maxBatchSize) {
            const batch = validTexts.slice(i, i + this.config.maxBatchSize);
            
            // Check cache first
            const batchResults = [];
            const uncachedTexts = [];
            const uncachedIndices = [];
            
            batch.forEach((text, index) => {
                const cacheKey = this._getCacheKey(text);
                if (this.cache.has(cacheKey)) {
                    batchResults[index] = this.cache.get(cacheKey);
                    this.stats.cacheHits++;
                } else {
                    uncachedTexts.push(text);
                    uncachedIndices.push(index);
                    this.stats.cacheMisses++;
                }
            });
            
            // Call API for uncached texts
            if (uncachedTexts.length > 0) {
                try {
                    const apiEmbeddings = await this._callApi(uncachedTexts);
                    
                    // Add to results and cache
                    uncachedIndices.forEach((index, i) => {
                        const embedding = apiEmbeddings[i];
                        batchResults[index] = embedding;
                        this._addToCache(uncachedTexts[i], embedding);
                    });
                } catch (error) {
                    console.error('API call failed, using fallback:', error.message);
                    
                    // Fallback to mock for failed texts
                    uncachedIndices.forEach((index, i) => {
                        const mockEmbedding = this._generateMockEmbedding(uncachedTexts[i]);
                        batchResults[index] = mockEmbedding;
                        this._addToCache(uncachedTexts[i], mockEmbedding);
                    });
                }
            }
            
            embeddings.push(...batchResults);
            
            // Emit progress for large batches
            if (validTexts.length > this.config.maxBatchSize) {
                const progress = Math.round(((i + batch.length) / validTexts.length) * 100);
                eventManager.emit('embedding:progress', {
                    message: `Processing embeddings: ${progress}%`,
                    progress: progress
                });
            }
        }
        
        // Normalize if requested
        const finalEmbeddings = normalize ? 
            embeddings.map(e => this._normalizeVector(e)) : embeddings;
        
        // Update stats
        this.stats.totalEmbeddings += finalEmbeddings.length;
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ Generated ${finalEmbeddings.length} embeddings in ${processingTime}ms`);
        
        return isArray ? finalEmbeddings : finalEmbeddings[0];
    }
    
    /**
     * Find similar problems - OPTIMIZED for ORKG
     */
    async findSimilarProblems(queryText, problems, threshold = 0.3, maxResults = 50) {
        if (!this.initialized) {
            await this.init();
        }
        
        const startTime = Date.now();
        
        // If using text similarity fallback
        if (this.useTextSimilarity) {
            return this.findSimilarProblemsWithTextSimilarity(queryText, problems, threshold, maxResults);
        }
        
        console.log(`🔍 Finding similar problems (OpenAI embeddings)...`);
        console.log(`📊 Problems: ${problems.length}, Threshold: ${threshold}`);
        console.log(`🎯 Query text preview: "${queryText.substring(0, 150)}..."`);
        
        // Prepare problem texts with strategic weighting
        const problemTexts = problems.map(p => {
            // Extract title and description
            const title = (p.label || p.title || '').trim();
            const description = (p.description || '').trim();
            
            // Create weighted combination (title appears twice for emphasis)
            // This gives more importance to title matches
            let combined = '';
            if (title && description) {
                combined = `${title} ${title} ${description}`;
            } else if (title) {
                combined = `${title} ${title} ${title}`; // Triple weight if no description
            } else if (description) {
                combined = description;
            } else {
                combined = 'unknown research problem';
            }
            
            return combined.substring(0, 8000); // Limit length for API
        });
        
        if (problemTexts.length === 0) {
            return this.createEmptyResult(threshold);
        }
        
        // Log sample for debugging
        console.log(`📝 Sample ORKG problem text: "${problemTexts[0].substring(0, 200)}..."`);
        
        // Prepare query text with similar weighting
        const queryParts = queryText.split(/\.\s+/);
        const queryTitle = queryParts[0] || queryText;
        const enhancedQuery = `${queryTitle} ${queryTitle} ${queryText}`.substring(0, 8000);
        
        console.log(`🎯 Enhanced query: "${enhancedQuery.substring(0, 200)}..."`);
        
        // Generate embeddings for query and all problems
        const allTexts = [enhancedQuery, ...problemTexts];
        console.log(`🧠 Generating embeddings for ${allTexts.length} texts...`);
        
        const embeddings = await this.embed(allTexts, { normalize: true });
        
        // Calculate similarities
        const queryEmbedding = embeddings[0];
        const problemEmbeddings = embeddings.slice(1);
        
        console.log(`📐 Calculating cosine similarities...`);
        const similarities = this.computeCosineSimilarities(queryEmbedding, problemEmbeddings);
        
        // Create results with enhanced scoring
        const allResults = [];
        let maxSimilarity = 0;
        let similarityDistribution = { 
            veryHigh: 0,  // > 0.8
            high: 0,      // 0.6 - 0.8
            medium: 0,    // 0.4 - 0.6
            low: 0,       // 0.2 - 0.4
            veryLow: 0    // < 0.2
        };
        
        for (let i = 0; i < similarities.length && i < problems.length; i++) {
            let similarity = similarities[i];
            
            // Apply keyword boost if enabled
            if (this.config.boostKeywordMatches) {
                const originalSimilarity = similarity;
                similarity = this.boostSimilarityForKeywordMatches(
                    similarity, 
                    queryText, 
                    problemTexts[i]
                );
                
                if (similarity > originalSimilarity) {
                    this.stats.keywordBoosts++;
                }
            }
            
            maxSimilarity = Math.max(maxSimilarity, similarity);
            
            // Track distribution
            if (similarity > 0.8) similarityDistribution.veryHigh++;
            else if (similarity > 0.6) similarityDistribution.high++;
            else if (similarity > 0.4) similarityDistribution.medium++;
            else if (similarity > 0.2) similarityDistribution.low++;
            else similarityDistribution.veryLow++;
            
            allResults.push({
                ...problems[i],
                similarity: similarity,
                confidence_score: similarity,
                embedding_type: 'openai',
                model: this.config.model
            });
        }
        
        // Sort by similarity (highest first)
        allResults.sort((a, b) => b.similarity - a.similarity);
        
        // Log analysis for debugging
        console.log(`📊 Similarity distribution:`, similarityDistribution);
        console.log(`🔝 Top 10 similarities:`, allResults.slice(0, 10).map(r => ({
            title: (r.label || r.title || 'Untitled').substring(0, 60),
            similarity: r.similarity.toFixed(4)
        })));
        
        // Analyze why similarities might be low
        if (maxSimilarity < 0.5) {
            console.log(`⚠️ Low max similarity detected (${maxSimilarity.toFixed(4)})`);
            console.log(`💡 Consider: 
                1. Lowering threshold to ${Math.max(0.2, maxSimilarity - 0.1).toFixed(2)}
                2. Checking if AI problem and ORKG problems use different terminology
                3. Enabling keyword boost in config`);
        }
        
        // Filter by threshold
        const filteredResults = allResults
            .filter(r => r.similarity >= threshold)
            .slice(0, maxResults);
        
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Found ${filteredResults.length}/${allResults.length} problems above threshold (${threshold})`);
        console.log(`📈 Max similarity: ${maxSimilarity.toFixed(4)}`);
        console.log(`⏱️ Processing time: ${processingTime}ms`);
        
        // Add recommendation if no results
        if (filteredResults.length === 0 && allResults.length > 0) {
            const recommendedThreshold = Math.max(0.1, maxSimilarity - 0.05);
            console.log(`💡 No results above threshold. Try lowering to ${recommendedThreshold.toFixed(2)}`);
        }
        
        return {
            allResults: allResults,
            filteredResults: filteredResults,
            results: filteredResults,
            maxSimilarity: maxSimilarity,
            threshold: threshold,
            totalFound: allResults.length,
            embeddingType: this.useFallback ? 'text_similarity' : 'openai',
            model: this.config.model,
            processingTime: processingTime,
            recommendedThreshold: maxSimilarity > 0 ? Math.max(0.1, maxSimilarity - 0.1) : 0.2,
            statistics: {
                distribution: similarityDistribution,
                avgSimilarity: allResults.reduce((sum, r) => sum + r.similarity, 0) / allResults.length,
                medianSimilarity: allResults[Math.floor(allResults.length / 2)]?.similarity || 0,
                keywordBoostsApplied: this.stats.keywordBoosts
            }
        };
    }
    
    /**
     * Boost similarity based on keyword matches
     */
    boostSimilarityForKeywordMatches(similarity, queryText, problemText) {
        // Extract meaningful keywords (ignore stop words)
        const stopWords = new Set([
            'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
            'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
            'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
            'for', 'with', 'by', 'from', 'about', 'into', 'through', 'to', 'of', 'in'
        ]);
        
        const extractKeywords = (text) => {
            return text.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3 && !stopWords.has(word));
        };
        
        const queryKeywords = new Set(extractKeywords(queryText));
        const problemKeywords = new Set(extractKeywords(problemText));
        
        // Count matching keywords
        let matches = 0;
        let importantMatches = 0;
        
        for (const keyword of queryKeywords) {
            if (problemKeywords.has(keyword)) {
                matches++;
                
                // Give extra weight to longer, more specific keywords
                if (keyword.length > 6) {
                    importantMatches++;
                }
            }
        }
        
        // Calculate boost
        const regularBoost = matches * this.config.keywordBoostFactor;
        const importantBoost = importantMatches * this.config.keywordBoostFactor * 2;
        const totalBoost = Math.min(this.config.maxKeywordBoost, regularBoost + importantBoost);
        
        // Apply boost
        const boostedSimilarity = Math.min(1.0, similarity + totalBoost);
        
        // Log significant boosts
        if (totalBoost > 0.05) {
            console.log(`🔍 Keyword boost: +${totalBoost.toFixed(3)} (${matches} matches, ${importantMatches} important)`);
        }
        
        return boostedSimilarity;
    }
    
    /**
     * Text similarity fallback (when no API key)
     */
    async findSimilarProblemsWithTextSimilarity(queryText, problems, threshold = 0.3, maxResults = 50) {
        const startTime = Date.now();
        
        console.log('📝 Using text similarity for problem matching (no API key)...');
        console.log(`📊 Problems: ${problems.length}, Threshold: ${threshold}`);
        
        if (problems.length === 0) {
            return this.createEmptyResult(threshold);
        }
        
        // Clean and prepare query
        const cleanQuery = sanitizeText(queryText).toLowerCase();
        const queryKeywords = this.extractKeywords(cleanQuery);
        
        // Calculate similarities
        const allResults = [];
        let maxSimilarity = 0;
        
        for (const problem of problems) {
            const problemText = `${problem.label || ''} ${problem.label || ''} ${problem.description || ''}`.trim();
            const cleanProblemText = sanitizeText(problemText).toLowerCase();
            const problemKeywords = this.extractKeywords(cleanProblemText);
            
            // Calculate keyword-based similarity
            let similarity = this.calculateKeywordSimilarity(queryKeywords, problemKeywords);
            
            // Apply boost for exact phrase matches
            if (problem.label && queryText.toLowerCase().includes(problem.label.toLowerCase())) {
                similarity = Math.min(1.0, similarity + 0.3);
            }
            
            maxSimilarity = Math.max(maxSimilarity, similarity);
            
            allResults.push({
                ...problem,
                similarity: similarity,
                confidence_score: similarity,
                embedding_type: 'text_similarity'
            });
        }
        
        // Sort by similarity
        allResults.sort((a, b) => b.similarity - a.similarity);
        
        // Filter by threshold
        const filteredResults = allResults
            .filter(r => r.similarity >= threshold)
            .slice(0, maxResults);
        
        const processingTime = Date.now() - startTime;
        
        console.log(`✅ Found ${filteredResults.length}/${allResults.length} problems above threshold`);
        console.log(`📈 Max similarity: ${maxSimilarity.toFixed(4)}`);
        console.log(`⏱️ Processing time: ${processingTime}ms`);
        
        this.stats.fallbackUsed++;
        
        return {
            allResults: allResults,
            filteredResults: filteredResults,
            results: filteredResults,
            maxSimilarity: maxSimilarity,
            threshold: threshold,
            totalFound: allResults.length,
            embeddingType: 'text_similarity',
            processingTime: processingTime,
            recommendedThreshold: Math.max(0.1, maxSimilarity - 0.1)
        };
    }
    
    // Helper methods
    
    _preprocessText(text) {
        // OpenAI has a limit of ~8000 tokens per text
        // Roughly 1 token = 4 characters
        const maxLength = 30000; // Conservative limit
        
        let processed = text
            .replace(/\s+/g, ' ')
            .trim();
        
        if (processed.length > maxLength) {
            processed = processed.substring(0, maxLength);
        }
        
        return processed;
    }
    
    _getCacheKey(text) {
        // Create a more specific cache key
        const preview = text.substring(0, 100).replace(/\s+/g, '_');
        return `openai_${this.config.model}_${preview}_${text.length}`;
    }
    
    _addToCache(text, embedding) {
        const key = this._getCacheKey(text);
        
        if (this.cache.size >= this.maxCacheSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, embedding);
    }
    
    _normalizeVector(vector) {
        const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (norm === 0) return vector;
        return vector.map(val => val / norm);
    }
    
    _generateMockEmbedding(text) {
        const dimension = this.config.dimension;
        const embedding = new Float32Array(dimension);
        
        // Generate deterministic pseudo-random values based on text
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash = hash & hash;
        }
        
        // Create more varied embeddings
        for (let i = 0; i < dimension; i++) {
            const seed = hash + i * 31;
            const x = Math.sin(seed) * 10000;
            const y = Math.cos(seed * 1.1) * 10000;
            embedding[i] = ((x - Math.floor(x)) + (y - Math.floor(y))) / 2 - 0.5;
        }
        
        // Normalize
        return Array.from(this._normalizeVector(embedding));
    }
    
    /**
     * Compute cosine similarity between two vectors
     */
    cosineSimilarity(vec1, vec2) {
        if (!vec1 || !vec2 || vec1.length !== vec2.length) {
            return 0;
        }
        
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        
        const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
        if (denominator === 0) return 0;
        
        return Math.max(0, Math.min(1, dotProduct / denominator));
    }
    
    /**
     * Compute cosine similarities between a query vector and multiple vectors
     */
    computeCosineSimilarities(queryVector, vectors) {
        return vectors.map(vec => this.cosineSimilarity(queryVector, vec));
    }
    
    /**
     * Extract keywords for text similarity fallback
     */
    extractKeywords(text) {
        // Comprehensive stop words list
        const stopWords = new Set([
            'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
            'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
            'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
            'shall', 'to', 'of', 'in', 'for', 'with', 'by', 'from', 'about',
            'into', 'through', 'during', 'before', 'after', 'above', 'below',
            'between', 'under', 'again', 'further', 'then', 'once', 'all',
            'it', 'its', 'itself', 'they', 'them', 'their', 'what', 'which',
            'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'i', 'you',
            'he', 'she', 'we', 'me', 'him', 'her', 'us', 'my', 'your', 'his',
            'our', 'any', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
            'than', 'too', 'very', 'just', 'where', 'when', 'how', 'why',
            'such', 'both', 'each', 'few', 'more', 'most', 'other', 'some'
        ]);
        
        // Extract words and filter
        const words = text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));
        
        // Count word frequency with boost for longer words
        const wordFreq = {};
        words.forEach(word => {
            const weight = word.length > 6 ? 2 : 1; // Boost longer words
            wordFreq[word] = (wordFreq[word] || 0) + weight;
        });
        
        return wordFreq;
    }
    
    /**
     * Calculate keyword-based similarity
     */
    calculateKeywordSimilarity(keywords1, keywords2) {
        const allKeys = new Set([...Object.keys(keywords1), ...Object.keys(keywords2)]);
        
        if (allKeys.size === 0) return 0;
        
        let intersection = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;
        
        for (const key of allKeys) {
            const freq1 = keywords1[key] || 0;
            const freq2 = keywords2[key] || 0;
            
            intersection += freq1 * freq2;
            magnitude1 += freq1 * freq1;
            magnitude2 += freq2 * freq2;
        }
        
        if (magnitude1 === 0 || magnitude2 === 0) return 0;
        
        // Cosine similarity for keyword vectors
        const similarity = intersection / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
        
        // Scale to be more generous (text similarity tends to be lower)
        return Math.min(1.0, similarity * 1.5);
    }
    
    /**
     * Create empty result structure
     */
    createEmptyResult(threshold) {
        return {
            allResults: [],
            filteredResults: [],
            results: [],
            maxSimilarity: 0,
            threshold: threshold,
            totalFound: 0,
            embeddingType: this.useFallback ? 'text_similarity' : 'openai',
            model: this.config.model || 'none',
            processingTime: 0,
            recommendedThreshold: 0.2
        };
    }
    
    /**
     * Get statistics
     */
    getStats() {
        const avgLatency = this.stats.apiCalls > 0 
            ? Math.round(this.stats.totalLatency / this.stats.apiCalls) 
            : 0;
        
        const cacheHitRate = (this.stats.cacheHits + this.stats.cacheMisses) > 0
            ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2)
            : 0;
        
        return {
            ...this.stats,
            avgLatency: avgLatency,
            cacheHitRate: `${cacheHitRate}%`,
            cacheSize: this.cache.size,
            usingFallback: this.useFallback,
            usingTextSimilarity: this.useTextSimilarity,
            model: this.config.model
        };
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Embedding cache cleared');
    }
    
    /**
     * Get service status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            hasApiKey: !!this.config.apiKey && !this.config.apiKey.includes('your-') && this.config.apiKey.startsWith('sk-'),
            model: this.config.model,
            dimension: this.config.dimension,
            usingFallback: this.useFallback,
            usingTextSimilarity: this.useTextSimilarity,
            cacheSize: this.cache.size,
            boostKeywordMatches: this.config.boostKeywordMatches,
            stats: this.getStats()
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        console.log('🧹 OpenAIEmbeddingService cleanup...');
        
        this.clearCache();
        this.stats = {
            totalEmbeddings: 0,
            cacheHits: 0,
            cacheMisses: 0,
            apiCalls: 0,
            errors: 0,
            totalLatency: 0,
            totalTokens: 0,
            fallbackUsed: 0,
            keywordBoosts: 0
        };
        
        this.initialized = false;
        this.useFallback = false;
        this.useTextSimilarity = false;
        
        console.log('✅ OpenAIEmbeddingService cleanup completed');
    }
}

export default EmbeddingService;
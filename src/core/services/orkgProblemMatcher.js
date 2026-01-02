// ================================
// src/core/services/ORKGProblemMatcher.js - FIXED: Proper problem data extraction and embedding
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class ORKGProblemMatcher {
    constructor(dataCache, embeddingService, orkgService, config = {}) {
        this.dataCache = dataCache;
        this.embeddingService = embeddingService;
        this.orkgService = orkgService;
        
        this.config = {
            chunkSize: 20,  
            maxProblems: 500,
            defaultThreshold: 0.5,  
            cacheTTL: 1800000, // 30 minutes
            ...config
        };
        
        this.isInitialized = false;
        
        // Statistics
        this.stats = {
            totalMatches: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageProcessingTime: 0
        };
    }
    
    async init() {
        if (this.isInitialized) return;
        
        console.log('🔍 Initializing ORKGProblemMatcher...');
        
        // Get services from ServiceManager if not provided
        if (!this.embeddingService) {
            this.embeddingService = window.serviceManager?.getService('embeddingService');
        }
        if (!this.orkgService) {
            this.orkgService = window.serviceManager?.getService('orkgService');
        }
        if (!this.dataCache) {
            this.dataCache = window.serviceManager?.getService('dataCache');
        }
        
        // Initialize services that need it
        if (this.embeddingService) {
            // Check if service has isReady method before calling it
            if (typeof this.embeddingService.isReady === 'function' && !this.embeddingService.isReady()) {
                if (typeof this.embeddingService.init === 'function') {
                    await this.embeddingService.init();
                }
            } else if (!this.embeddingService.initialized && typeof this.embeddingService.init === 'function') {
                await this.embeddingService.init();
            }
        }
        
        if (this.orkgService) {
            // Check if service has isReady method before calling it
            if (typeof this.orkgService.isReady === 'function' && !this.orkgService.isReady()) {
                if (typeof this.orkgService.init === 'function') {
                    await this.orkgService.init();
                }
            } else if (!this.orkgService.isInitialized && typeof this.orkgService.init === 'function') {
                await this.orkgService.init();
            }
        }
        
        this.isInitialized = true;
        console.log('✅ ORKGProblemMatcher initialized');
    }
    
    /**
     * Find similar problems for a given query
     * @param {string} queryText - Combined AI problem text (title + description)
     * @param {string} fieldId - Research field ID
     * @param {Object} options - Matching options
     * @returns {Promise<Object>} Matching results
     */
    async findSimilarProblems(queryText, fieldId, options = {}) {
        if (!this.isInitialized) await this.init();
        
        const {
            threshold = this.config.defaultThreshold,
            maxResults = 15, 
            useCache = true,
            onProgress = null
        } = options;
        
        console.log('🔍 Finding similar problems:', {
            field: fieldId,
            threshold,
            maxResults,
            queryPreview: queryText.substring(0, 100) + '...'
        });
        
        const startTime = Date.now();
        
        try {
            // Step 1: Check cache for existing results
            if (useCache && this.dataCache) {
                const cachedResults = this.getCachedResults(queryText, fieldId, threshold);
                if (cachedResults) {
                    console.log('💾 Using cached similarity results');
                    this.stats.cacheHits++;
                    return cachedResults;
                }
                this.stats.cacheMisses++;
            }
            
            // Step 2: Fetch all problems for the field
            const orkgProblems = await this.fetchAndProcessProblems(fieldId, {
                maxResults: this.config.maxProblems,
                onProgress
            });
            
            if (!orkgProblems || orkgProblems.length === 0) {
                console.log('⚠️ No problems found for field:', fieldId);
                return this.createEmptyResult(fieldId, threshold);
            }
            
            console.log(`📦 Total problems fetched: ${orkgProblems.length}`);
            
            // Step 3: Process ORKG problems to extract text
            const processedProblems = this.processORKGProblems(orkgProblems);
            
            // Step 4: Compute similarities using embedding service 
            const similarityResults = await this.computeSimilarities(
                queryText,
                processedProblems,
                threshold,
                maxResults,
                onProgress
            );
            
            const processingTime = Date.now() - startTime;
            console.log(`✅ Problem matching complete in ${processingTime}ms`);
            
            // Step 5: Cache results
            if (useCache && this.dataCache) {
                this.cacheResults(queryText, fieldId, threshold, similarityResults);
            }
            
            // Update statistics
            this.updateStats(processingTime);
            
            return similarityResults;
            
        } catch (error) {
            console.error('❌ Problem matching failed:', error);
            
            // Return empty result on error
            return this.createEmptyResult(fieldId, threshold, error.message);
        }
    }
    
    /**
     * Fetch and process problems from ORKG 
     */
    async fetchAndProcessProblems(fieldId, options = {}) {
        const { maxResults, onProgress } = options;
        
        try {
            // Check cache first
            const cacheKey = `problems_${fieldId}_all`;
            const cached = this.dataCache?.get ? this.dataCache.get(cacheKey) : null;
            
            if (cached) {
                console.log('💾 Using cached problems for field:', fieldId);
                return cached;
            }
            
            console.log('🔄 Fetching problems for field:', fieldId);
            
            // Ensure ORKG service is available
            if (!this.orkgService) {
                console.warn('⚠️ ORKG service not available');
                return [];
            }
            
            // Use ORKG service to fetch problems with proper pagination
            const problems = await this.orkgService.getAllProblemsInField(fieldId, {
                maxProblems: maxResults || this.config.maxProblems,
                onProgress: (progress) => {
                    console.log(`📄 Page ${progress.currentPage}: Loaded ${progress.problemsFound} problems`);
                    
                    if (onProgress) {
                        onProgress({
                            phase: 'fetching',
                            progress: Math.min(50, (progress.problemsFound / maxResults) * 50),
                            message: `Fetching problems: ${progress.problemsFound} loaded`
                        });
                    }
                    
                    // Emit progress event
                    eventManager.emit('orkg:problems_progress', {
                        loaded: progress.problemsFound,
                        page: progress.currentPage
                    });
                }
            });
            
            console.log(`✅ Fetched ${problems.length} total problems`);
            
            // Process each problem to fetch descriptions 
            const processedProblems = await this.processProblemsInChunks(problems, onProgress);
            
            // Cache the results
            if (this.dataCache && typeof this.dataCache.set === 'function' && processedProblems.length > 0) {
                this.dataCache.set(cacheKey, processedProblems, this.config.cacheTTL);
            }
            
            return processedProblems;
            
        } catch (error) {
            console.error('Failed to fetch problems:', error);
            return [];
        }
    }
    
    /**
     * Process problems in chunks 
     */
    async processProblemsInChunks(problems, onProgress) {
        const processedProblems = [];
        const chunks = [];
        
        // Create chunks
        for (let i = 0; i < problems.length; i += this.config.chunkSize) {
            chunks.push(problems.slice(i, i + this.config.chunkSize));
        }
        
        console.log(`📦 Processing ${problems.length} problems in ${chunks.length} chunks`);
        
        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkResults = await this.processChunk(chunk);
            processedProblems.push(...chunkResults);
            
            if (onProgress) {
                const progress = ((i + 1) / chunks.length) * 50 + 50; // 50-100% range
                onProgress({
                    phase: 'processing',
                    progress,
                    message: `Processing chunk ${i + 1}/${chunks.length}`
                });
            }
        }
        
        return processedProblems;
    }
    
    /**
     * Process a single chunk of problems
     */
    async processChunk(problems) {
        const processed = [];
        
        for (const problem of problems) {
            try {
                // Extract problem data 
                const processedProblem = await this.processSingleProblem(problem);
                if (processedProblem) {
                    processed.push(processedProblem);
                }
            } catch (error) {
                console.warn(`Failed to process problem ${problem.id}:`, error);
            }
        }
        
        return processed;
    }
    
    /**
     * Process a single problem 
     */
    async processSingleProblem(problemData) {
        try {
            // Handle different problem data structures
            const problem = problemData.problem || problemData;
            
            if (!problem.id) {
                console.warn('Problem missing ID:', problem);
                return null;
            }
            
            // Extract label (title)
            const label = problem.label || problem.title || '';
            
            // Try to get description from statements if ORKG service is available
            let description = problem.description || '';
            
            if (!description && this.orkgService && typeof this.orkgService.getStatements === 'function') {
                try {
                    const statements = await this.orkgService.getStatements(problem.id, 'description');
                    if (statements && statements.length > 0) {
                        description = statements[0]?.object?.label || '';
                    }
                } catch (error) {
                    // Silently fail, description remains empty
                }
            }
            
            // Get same_as data if available
            let sameAs = '';
            if (this.orkgService && typeof this.orkgService.getStatements === 'function') {
                try {
                    const statements = await this.orkgService.getStatements(problem.id, 'SAME_AS');
                    if (statements && statements.length > 0) {
                        sameAs = statements[0]?.object?.label || '';
                    }
                } catch (error) {
                    // Silently fail, sameAs remains empty
                }
            }
            
            return {
                id: problem.id,
                label: label,
                title: label,  // Add title field for compatibility
                description: description,
                same_as: sameAs,
                papers_count: problemData.papers || problem.papers_count || 0
            };
            
        } catch (error) {
            console.error(`Error processing problem:`, error);
            return null;
        }
    }
    
    /**
     * Process ORKG problems to extract text
     */
    processORKGProblems(problems) {
        return problems.map(problem => {
            // Extract text parts
            const label = (problem.label || problem.title || '').trim();
            const description = (problem.description || '').trim();
            const sameAs = (problem.same_as || '').trim();
            
            // Combine parts (' '.join(problem_parts))
            const parts = [label, description, sameAs].filter(part => part);
            const combinedText = parts.join(' ');
            
            return {
                ...problem,
                _combinedText: combinedText || 'unknown problem',
                _textLength: combinedText.length
            };
        });
    }
    
    /**
     * Compute similarities using embedding service
     */
    async computeSimilarities(queryText, problems, threshold, maxResults, onProgress) {
        console.log('🧠 Computing similarities using embedding service');
        console.log(`📊 Query: "${queryText.substring(0, 100)}..."`);
        console.log(`📊 Problems to compare: ${problems.length}`);
        
        try {
            // Check if embedding service is available
            if (!this.embeddingService) {
                console.warn('⚠️ Embedding service not available, using fallback');
                return this.fallbackTextMatching(queryText, problems, threshold, maxResults);
            }
            
            // Check if the embedding service has the findSimilarProblems method
            if (typeof this.embeddingService.findSimilarProblems !== 'function') {
                console.warn('⚠️ Embedding service lacks findSimilarProblems method, using fallback');
                return this.fallbackTextMatching(queryText, problems, threshold, maxResults);
            }
            
            // Call embedding service with the query text and problems
            // The embedding service will handle the text extraction from problems
            const result = await this.embeddingService.findSimilarProblems(
                queryText,
                problems,
                threshold,
                maxResults
            );
            
            // Log similarity distribution 
            if (result.allResults && result.allResults.length > 0) {
                const highSimilarity = result.allResults.filter(r => r.similarity > 0.4).length;
                console.log(`📊 High similarity (>0.4): ${highSimilarity} problems`);
                console.log(`📊 Above threshold (>=${threshold}): ${result.filteredResults?.length || 0} problems`);
                console.log(`📊 Max similarity: ${result.maxSimilarity?.toFixed(4) || 0}`);
                
                // Log top matches 
                if (result.filteredResults && result.filteredResults.length > 0) {
                    const topMatch = result.filteredResults[0];
                    console.log(`🎯 Top match: ${topMatch.label || topMatch.title} (${topMatch.similarity.toFixed(4)})`);
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('Embedding similarity calculation failed:', error);
            
            // Fallback to basic text matching
            return this.fallbackTextMatching(queryText, problems, threshold, maxResults);
        }
    }
    
    /**
     * Fallback text matching when embedding service fails
     */
    fallbackTextMatching(queryText, problems, threshold, maxResults) {
        console.log('⚠️ Using fallback text matching');
        
        const queryLower = queryText.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
        
        const results = problems.map(problem => {
            // Use the combined text if available, otherwise create it
            const problemText = problem._combinedText || 
                `${problem.label || ''} ${problem.description || ''} ${problem.same_as || ''}`.toLowerCase();
            
            // Simple word matching with scoring
            let matchCount = 0;
            let exactMatches = 0;
            
            queryWords.forEach(word => {
                if (problemText.includes(word)) {
                    matchCount++;
                    // Check for exact word match
                    const regex = new RegExp(`\\b${word}\\b`, 'i');
                    if (regex.test(problemText)) {
                        exactMatches++;
                    }
                }
            });
            
            // Calculate similarity score (weighted towards exact matches)
            const similarity = queryWords.length > 0 
                ? (matchCount * 0.5 + exactMatches * 0.5) / queryWords.length
                : 0;
            
            return {
                ...problem,
                similarity: Math.min(1, similarity),
                confidence_score: Math.min(1, similarity),
                matchDetails: {
                    matchCount,
                    exactMatches,
                    totalWords: queryWords.length
                }
            };
        });
        
        // Sort by similarity
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Filter and limit
        const filteredResults = results.filter(r => r.similarity >= threshold).slice(0, maxResults);
        const maxSimilarity = results[0]?.similarity || 0;
        
        return {
            allResults: results,
            filteredResults: filteredResults,
            results: filteredResults,
            maxSimilarity: maxSimilarity,
            threshold,
            totalFound: results.length,
            embeddingType: 'fallback',
            processingTime: 0
        };
    }
    
    /**
     * Create empty result object
     */
    createEmptyResult(fieldId, threshold, error = null) {
        return {
            results: [],
            filteredResults: [],
            allResults: [],
            totalFound: 0,
            aboveThreshold: 0,
            threshold,
            maxSimilarity: 0,
            fieldId,
            embeddingType: 'none',
            processingTime: 0,
            error
        };
    }
    
    /**
     * Get cached results
     */
    getCachedResults(queryText, fieldId, threshold) {
        if (!this.dataCache || typeof this.dataCache.get !== 'function') return null;
        
        const cacheKey = this.getCacheKey(queryText, fieldId, threshold);
        return this.dataCache.get(cacheKey);
    }
    
    /**
     * Cache results
     */
    cacheResults(queryText, fieldId, threshold, results) {
        if (!this.dataCache || typeof this.dataCache.set !== 'function') return;
        
        const cacheKey = this.getCacheKey(queryText, fieldId, threshold);
        this.dataCache.set(cacheKey, results, this.config.cacheTTL);
    }
    
    /**
     * Generate cache key
     */
    getCacheKey(queryText, fieldId, threshold) {
        const hash = this.hashString(queryText);
        return `problem_match_${fieldId}_${hash}_${threshold}`;
    }
    
    /**
     * Simple hash function
     */
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
     * Update statistics
     */
    updateStats(processingTime) {
        this.stats.totalMatches++;
        
        // Update average processing time
        const prevAvg = this.stats.averageProcessingTime;
        const count = this.stats.totalMatches;
        this.stats.averageProcessingTime = (prevAvg * (count - 1) + processingTime) / count;
    }
    
    /**
     * Get service statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheHitRate: this.stats.totalMatches > 0
                ? (this.stats.cacheHits / this.stats.totalMatches * 100).toFixed(2) + '%'
                : '0%'
        };
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        if (this.dataCache && typeof this.dataCache.clearByPrefix === 'function') {
            this.dataCache.clearByPrefix('problem_match_');
            this.dataCache.clearByPrefix('problems_');
            console.log('🗑️ Problem matcher cache cleared');
        }
    }
    
    /**
     * Check if service is ready
     */
    isReady() {
        return this.isInitialized;
    }
    
    /**
     * Get service status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasEmbeddingService: !!this.embeddingService,
            hasORKGService: !!this.orkgService,
            hasDataCache: !!this.dataCache,
            embeddingServiceReady: this.embeddingService?.initialized || false,
            orkgServiceReady: this.orkgService?.isInitialized || false,
            config: this.config,
            stats: this.getStats()
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        console.log('🧹 ORKGProblemMatcher cleanup...');
        
        this.clearCache();
        this.isInitialized = false;
        
        console.log('✅ ORKGProblemMatcher cleanup completed');
    }
}

export default ORKGProblemMatcher;
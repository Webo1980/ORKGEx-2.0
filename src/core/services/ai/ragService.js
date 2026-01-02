/**
 * Enhanced RAG Service for Chrome Extension
 * Based on modern RAG patterns with improved error handling and batch processing
 */

import { generateId, createErrorHandler } from '../../../utils/utils.js';
import { getLLMService } from './llmService.js';

export class RAGService {
    static instance = null;
    
    constructor(options = {}) {
        if (RAGService.instance) {
            throw new Error('Use RAGService.getInstance()');
        }
        
        this.options = {
            timeout: 120000, // 2 minutes default timeout
            maxRetries: 3,
            retryDelay: 2000,
            batchSize: 3, // Smaller batches for better reliability
            maxConcurrentRequests: 2, // Reduced concurrency
            cacheTimeout: 300000, // 5 minutes cache
            ...options
        };
        
        this.cache = new Map();
        this.processingQueue = [];
        this.activeRequests = new Set();
        this.isInitialized = false;
        this.cachedSections = null;
        
        this.handleError = createErrorHandler('RAG Service');
        RAGService.instance = this;
    }

    static getInstance() {
        if (!RAGService.instance) {
            RAGService.instance = new RAGService();
        }
        return RAGService.instance;
    }

    /**
     * Initialize RAG service
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            console.log('🤖 Initializing RAG Service...');
            
            // Get LLM service
            this.llmService = getLLMService();
            
            // Initialize LLM service if needed
            if (this.llmService && this.llmService.initialize) {
                try {
                    await this.llmService.initialize();
                } catch (error) {
                    console.warn('⚠️ LLM service initialization failed, continuing with mock mode');
                }
            }
            
            // Clear expired cache entries
            this.cleanupCache();
            
            this.isInitialized = true;
            console.log('✅ RAG Service initialized successfully');
            
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Main function to analyze sections from a scientific paper based on a given template
     */
    async analyzePaperSections(sections, template, forceUpdate = false) {
        try {
            await this.initialize();
            
            const properties = template.template?.properties || template.properties || [];
            if (!properties || properties.length === 0) {
                throw new Error('Invalid template structure - no properties found');
            }

            console.log(`🔍 Starting RAG analysis for ${properties.length} properties across ${Object.keys(sections).length} sections`);
            
            return await this.processBatch(properties, sections, forceUpdate, this.options.batchSize, 2000);
            
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Process properties in batches to optimize API calls
     */
    async processBatch(properties, sections, forceUpdate = false, batchSize = 3, delayBetweenBatches = 1000) {
        const results = {};
        
        // Cache sections for this analysis session
        if (!this.cachedSections || forceUpdate) {
            this.cachedSections = this.prepareSectionsForAnalysis(sections);
        }
        
        // Process properties in batches
        for (let i = 0; i < properties.length; i += batchSize) {
            // Slice the current batch of properties
            const currentBatch = properties.slice(i, i + batchSize);
            
            console.log(`📊 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(properties.length/batchSize)} (${currentBatch.length} properties)`);
            
            // Create promises for the current batch
            const batchPromises = currentBatch.map(async (property) => {
                console.log(`Processing property: ${property.label}`);
                try {
                    const response = await this.processProperty(property, this.cachedSections, forceUpdate);
                    return {
                        [property.id]: {
                            ...response,
                            label: property.label,
                            type: property.type,
                            processing_time: Date.now()
                        }
                    };
                } catch (error) {
                    console.error(`Error processing property ${property.label}:`, error);
                    return {
                        [property.id]: {
                            property: property.label,
                            values: [],
                            error: error.message,
                            processing_failed: true
                        }
                    };
                }
            });
            
            // Wait for this batch to complete
            const batchResults = await Promise.all(batchPromises);
            
            // Merge batch results
            batchResults.forEach(result => Object.assign(results, result));
            
            // Add delay between batches if it's not the last batch
            if (i + batchSize < properties.length) {
                console.log(`⏳ Waiting ${delayBetweenBatches}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }
        
        console.log(`✅ RAG analysis completed: ${Object.keys(results).length} properties processed`);
        return results;
    }

    /**
     * Process a single property with the LLM service
     */
    async processProperty(property, sections, forceUpdate = false) {
        const requestId = generateId('rag_request');
        this.activeRequests.add(requestId);
        
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(property, sections);
            
            if (!forceUpdate && this.cache.has(cacheKey)) {
                const cachedResult = this.cache.get(cacheKey);
                if (Date.now() - cachedResult.timestamp < this.options.cacheTimeout) {
                    console.log(`📋 Using cached result for property: ${property.label}`);
                    return cachedResult.result;
                }
            }
            
            // Use LLM service to analyze the property
            const result = await this.retryWithBackoff(
                () => this.performPropertyExtraction(property, sections),
                this.options.maxRetries
            );
            
            // Cache the result
            this.cache.set(cacheKey, {
                result: result,
                timestamp: Date.now()
            });
            
            return result;
            
        } catch (error) {
            console.warn(`⚠️ Property processing failed for ${property.label}:`, error.message);
            return {
                property: property.label,
                values: [],
                error: error.message,
                processing_failed: true
            };
            
        } finally {
            this.activeRequests.delete(requestId);
        }
    }

    /**
     * Perform property extraction using LLM service
     */
    async performPropertyExtraction(property, sections) {
        if (!this.llmService) {
            throw new Error('LLM service not available');
        }
        
        // Use the LLM service analyze method
        const response = await this.llmService.analyze(property, sections, false);
        
        // Process the response to match expected format
        return {
            property: property.label,
            values: this.processExtractionResult(response, property),
            extraction_method: 'rag',
            confidence: response.confidence || 0.8,
            processing_time: Date.now()
        };
    }

    /**
     * Process extraction result from LLM service
     */
    processExtractionResult(result, property) {
        if (!result || !result.values) {
            return [];
        }
        
        return result.values.map(value => ({
            id: generateId('extracted_value'),
            value: value.value,
            confidence: value.confidence || 0.8,
            evidence: value.evidence || {},
            location: value.location || null,
            property_type: property.type,
            extraction_method: 'rag',
            timestamp: new Date().toISOString()
        }));
    }

    /**
     * Prepare sections for analysis
     */
    prepareSectionsForAnalysis(sections) {
        // Handle both simple sections and structured sections with metadata
        const sectionsToProcess = sections.sections ? sections.sections : sections;
        const processedSections = {};
        
        for (const [sectionKey, sectionData] of Object.entries(sectionsToProcess)) {
            // Handle structured sections (with title/content) and simple sections
            const sectionContent = typeof sectionData === 'object' && sectionData.content 
                ? sectionData.content 
                : sectionData;
            
            if (typeof sectionContent === 'string' && sectionContent.trim().length > 50) {
                processedSections[sectionKey] = sectionContent.trim();
            }
        }
        
        console.log(`📄 Prepared ${Object.keys(processedSections).length} sections for analysis`);
        return processedSections;
    }

    /**
     * Retry with exponential backoff
     */
    async retryWithBackoff(operation, maxRetries) {
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries - 1) {
                    const delay = this.options.retryDelay * Math.pow(2, attempt);
                    console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms...`);
                    await this.delay(delay);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate cache key for property and sections
     */
    generateCacheKey(property, sections) {
        const propertyStr = `${property.id}_${property.label}_${property.type}`;
        const sectionsStr = Object.keys(sections).sort().join('_');
        return `rag_${propertyStr}_${sectionsStr}`.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.options.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        return {
            cacheSize: this.cache.size,
            activeRequests: this.activeRequests.size,
            queueSize: this.processingQueue.length,
            isInitialized: this.isInitialized,
            llmServiceAvailable: !!this.llmService
        };
    }

    /**
     * Clear cache
     */
    async clearCache() {
        this.cache.clear();
        this.cachedSections = null;
        console.log('🗑️ RAG service cache cleared');
    }

    /**
     * Cancel all active requests
     */
    cancelActiveRequests() {
        this.activeRequests.clear();
        this.processingQueue.length = 0;
        console.log('❌ All RAG requests cancelled');
    }

    /**
     * Reset service state
     */
    async reset() {
        this.cancelActiveRequests();
        await this.clearCache();
        this.isInitialized = false;
        console.log('🔄 RAG service reset');
    }
}

// Export singleton instance
export function getRagService(options = {}) {
    return RAGService.getInstance();
}

export default RAGService;
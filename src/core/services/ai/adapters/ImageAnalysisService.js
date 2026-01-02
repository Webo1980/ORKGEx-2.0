// ================================
// src/core/services/ai/adapters/ImageAnalysisService.js
// ================================

import { eventManager } from '../../../../utils/eventManager.js';

export class ImageAnalysisService {
    constructor() {
        this.provider = null;
        this.cacheManager = null;
        this.config = null;
        this.isInitialized = false;
        
        // Analysis queue for batch processing
        this.analysisQueue = [];
        this.isProcessingQueue = false;
        
        // Statistics
        this.stats = {
            totalAnalyzed: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            averageProcessingTime: 0
        };
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Get services from ServiceManager
            const serviceManager = window.serviceManager;
            
            if (serviceManager) {
                this.cacheManager = serviceManager.getService('dataCache');
                
                // Try to get config from various sources
                this.config = window.orkgConfig || 
                            serviceManager.getService('config') || 
                            { 
                                getAll: () => ({}),
                                get: (key) => null,
                                getOpenAIKey: () => null
                            };
                
                // Try to get provider from LLM service
                /*const llmService = serviceManager.getService('llmService');
                if (llmService && llmService.provider) {
                    this.provider = llmService.provider;
                    console.log('✅ Using provider from llmService');
                }*/
            }
            
            // If no provider yet, create one directly
            if (!this.provider) {
                console.log('🔧 Creating OpenAI provider directly');
                
                // Get API key from various sources
                let apiKey = null;
                
                // Try window.orkgConfig first
                if (window.orkgConfig) {
                    apiKey = window.orkgConfig.getOpenAIKey?.() || 
                            window.orkgConfig.get?.('openai.apiKey');
                }
                
                // Try environment variable
                if (!apiKey && window.OPENAI_API_KEY) {
                    apiKey = window.OPENAI_API_KEY;
                }
                
                // Try localStorage
                if (!apiKey) {
                    const stored = localStorage.getItem('orkg-openai-api-key');
                    if (stored) apiKey = stored;
                }
                
                if (!apiKey) {
                    console.warn('⚠️ No OpenAI API key found');
                    this.provider = null;
                    this.isInitialized = false;
                    return;
                }
                
                // Create provider with API key
                const { OpenAIProvider } = await import('../providers/openaiProvider.js');
                const openaiConfig = {
                    apiKey: apiKey,
                    model: 'gpt-4o-mini',
                    visionModel: 'gpt-4-vision-preview' // Use correct vision model name
                };
                
                this.provider = new OpenAIProvider(openaiConfig);
                await this.provider.init();
                console.log('✅ OpenAI provider created with API key');
            }
            
            this.isInitialized = true;
            console.log('🖼️ ImageAnalysisService initialized');
            
        } catch (error) {
            console.error('Failed to initialize ImageAnalysisService:', error);
            this.isInitialized = false;
            // Don't throw, just log the error
        }
    }
    
    /**
     * Analyze image and extract triples
     */
    async analyzeImage(imageData, options = {}) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        const {
            useCache = true,
            context = {},
            extractTriples = true,
            generateDescription = true,
            analyzeTrends = true
        } = options;
        
        try {
            // Generate cache key
            const cacheKey = this.generateCacheKey(imageData, options);
            
            // Check cache if enabled
            if (useCache && this.cacheManager) {
                const cached = this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    console.log('💾 Image analysis cache hit');
                    return cached;
                }
                this.stats.cacheMisses++;
            }
            
            const startTime = Date.now();
            
            // Prepare the analysis request
            const analysis = await this.performAnalysis(imageData, {
                context,
                extractTriples,
                generateDescription,
                analyzeTrends
            });
            
            // Update statistics
            const processingTime = Date.now() - startTime;
            this.updateStats(processingTime);
            
            // Cache the result
            if (useCache && this.cacheManager) {
                const ttl = 3600000; // 1 hour
                this.cacheManager.set(cacheKey, analysis, ttl);
            }
            
            this.stats.totalAnalyzed++;
            
            return analysis;
            
        } catch (error) {
            this.stats.errors++;
            console.error('Image analysis failed:', error);
            throw error;
        }
    }
    
    /**
     * Perform the actual analysis
     */
    async performAnalysis(imageData, options) {
        const { context, extractTriples, generateDescription, analyzeTrends } = options;
        
        // Get vision model from config
        const visionModel = this.config?.getAll()?.openai?.visionModel || 'gpt-4o';
        
        // Build the analysis prompt
        const systemPrompt = this.buildSystemPrompt(options);
        const userPrompt = this.buildUserPrompt(context);
        
        // Make the API request
        const response = await this.provider.makeRequest({
            model: visionModel,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userPrompt
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageData.src || imageData
                            }
                        }
                    ]
                }
            ],
            temperature: 0.4,
            max_tokens: 1500
        });
        
        // Parse the response
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No analysis response received');
        }
        
        return this.parseAnalysisResponse(content, imageData);
    }
    
    /**
     * Build system prompt for analysis
     */
    buildSystemPrompt(options) {
        const { extractTriples, generateDescription, analyzeTrends } = options;
        
        let prompt = `You are an expert at analyzing scientific charts, figures, and diagrams. 
Your task is to extract structured information from academic images.

Focus on extracting:`;

        if (extractTriples) {
            prompt += `
- Knowledge graph triples (subject-predicate-object relationships)
- Quantitative relationships and comparisons
- Methodological information visible in the image`;
        }

        if (generateDescription) {
            prompt += `
- A clear, concise description of what the image shows
- The type of visualization (pie chart, bar chart, line graph, diagram, etc.)
- Key findings or insights visible in the image`;
        }

        if (analyzeTrends) {
            prompt += `
- Trends, patterns, or correlations visible in the data
- Statistical significance if indicated
- Comparative analysis if multiple datasets are shown`;
        }

        prompt += `

Return your analysis as a JSON object with the following structure:
{
    "type": "chart_type",
    "description": "detailed description",
    "triples": [
        {
            "subject": "subject_entity",
            "predicate": "relationship",
            "object": "object_entity",
            "confidence": 0.0-1.0
        }
    ],
    "insights": {
        "mainFinding": "primary insight",
        "trends": ["trend1", "trend2"],
        "dataPoints": [
            {
                "label": "data_label",
                "value": "data_value",
                "unit": "unit_if_applicable"
            }
        ]
    },
    "quality": {
        "readability": 0.0-1.0,
        "complexity": "low|medium|high",
        "confidence": 0.0-1.0
    }
}`;

        return prompt;
    }
    
    /**
     * Build user prompt with context
     */
    buildUserPrompt(context) {
        let prompt = 'Analyze this image';
        
        if (context.paperTitle) {
            prompt += `\nPaper Title: ${context.paperTitle}`;
        }
        
        if (context.section) {
            prompt += `\nSection: ${context.section}`;
        }
        
        if (context.caption) {
            prompt += `\nCaption: ${context.caption}`;
        }
        
        if (context.surroundingText) {
            prompt += `\nContext: ${context.surroundingText}`;
        }
        
        prompt += '\n\nProvide a comprehensive analysis:';
        
        return prompt;
    }
    
    /**
     * Parse analysis response
     */
    parseAnalysisResponse(content, imageData) {
        try {
            // Clean the response
            let cleanedContent = content.trim();
            cleanedContent = cleanedContent.replace(/```json|```/g, '').trim();
            
            // Try to extract JSON
            const jsonMatch = cleanedContent.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\})*)*\}))*\}/);
            if (jsonMatch) {
                cleanedContent = jsonMatch[0];
            }
            
            const parsed = JSON.parse(cleanedContent);
            
            // Add metadata
            return {
                ...parsed,
                metadata: {
                    imageId: imageData.id || `img_${Date.now()}`,
                    imageSrc: imageData.src,
                    imageAlt: imageData.alt,
                    analyzedAt: new Date().toISOString(),
                    provider: 'openai',
                    model: this.config?.getAll()?.openai?.visionModel || 'gpt-4o'
                }
            };
            
        } catch (error) {
            console.error('Failed to parse analysis response:', error);
            
            // Return a fallback structure
            return {
                type: 'unknown',
                description: content,
                triples: [],
                insights: {
                    mainFinding: 'Analysis could not be parsed',
                    trends: [],
                    dataPoints: []
                },
                quality: {
                    readability: 0,
                    complexity: 'unknown',
                    confidence: 0
                },
                metadata: {
                    imageId: imageData.id || `img_${Date.now()}`,
                    error: error.message
                }
            };
        }
    }
    
    /**
     * Batch analyze multiple images
     */
    async batchAnalyze(images, options = {}) {
        const results = [];
        const { parallel = false, maxConcurrent = 3 } = options;
        
        if (parallel) {
            // Process in parallel with concurrency limit
            const chunks = this.chunkArray(images, maxConcurrent);
            
            for (const chunk of chunks) {
                const chunkResults = await Promise.all(
                    chunk.map(image => this.analyzeImage(image, options))
                );
                results.push(...chunkResults);
                
                // Emit progress
                eventManager.emit('image-analysis:batch-progress', {
                    processed: results.length,
                    total: images.length,
                    percentage: (results.length / images.length) * 100
                });
            }
        } else {
            // Process sequentially
            for (let i = 0; i < images.length; i++) {
                const result = await this.analyzeImage(images[i], options);
                results.push(result);
                
                // Emit progress
                eventManager.emit('image-analysis:batch-progress', {
                    processed: i + 1,
                    total: images.length,
                    percentage: ((i + 1) / images.length) * 100
                });
            }
        }
        
        return results;
    }
    
    /**
     * Add image to analysis queue
     */
    addToQueue(imageData, options = {}) {
        return new Promise((resolve, reject) => {
            this.analysisQueue.push({
                imageData,
                options,
                resolve,
                reject
            });
            
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }
    
    /**
     * Process analysis queue
     */
    async processQueue() {
        if (this.isProcessingQueue || this.analysisQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.analysisQueue.length > 0) {
            const item = this.analysisQueue.shift();
            
            try {
                const result = await this.analyzeImage(item.imageData, item.options);
                item.resolve(result);
            } catch (error) {
                item.reject(error);
            }
            
            // Small delay between requests to avoid rate limiting
            if (this.analysisQueue.length > 0) {
                await this.delay(500);
            }
        }
        
        this.isProcessingQueue = false;
    }
    
    /**
     * Generate cache key for image analysis
     */
    generateCacheKey(imageData, options) {
        const imageId = imageData.id || imageData.src || JSON.stringify(imageData).substring(0, 100);
        const optionsStr = JSON.stringify(options);
        return `image_analysis_${this.hashString(imageId + optionsStr)}`;
    }
    
    /**
     * Hash string for cache key
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
     * Chunk array for batch processing
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    
    /**
     * Update statistics
     */
    updateStats(processingTime) {
        const currentAvg = this.stats.averageProcessingTime;
        const totalAnalyzed = this.stats.totalAnalyzed;
        
        this.stats.averageProcessingTime = 
            (currentAvg * totalAnalyzed + processingTime) / (totalAnalyzed + 1);
    }
    
    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get service statistics
     */
    getStats() {
        return {
            ...this.stats,
            cacheHitRate: this.stats.totalAnalyzed > 0
                ? (this.stats.cacheHits / this.stats.totalAnalyzed * 100).toFixed(2) + '%'
                : '0%',
            errorRate: this.stats.totalAnalyzed > 0
                ? (this.stats.errors / this.stats.totalAnalyzed * 100).toFixed(2) + '%'
                : '0%',
            queueLength: this.analysisQueue.length
        };
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        if (this.cacheManager) {
            this.cacheManager.clearByPrefix('image_analysis_');
            console.log('🗑️ Image analysis cache cleared');
        }
    }
    
    /**
     * Reset service
     */
    reset() {
        this.analysisQueue = [];
        this.isProcessingQueue = false;
        this.stats = {
            totalAnalyzed: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            averageProcessingTime: 0
        };
        this.clearCache();
    }
    
    /**
     * Get service status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasProvider: !!this.provider,
            hasCacheManager: !!this.cacheManager,
            stats: this.getStats(),
            queueStatus: {
                length: this.analysisQueue.length,
                isProcessing: this.isProcessingQueue
            }
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.reset();
        this.isInitialized = false;
        console.log('🧹 ImageAnalysisService cleaned up');
    }
}

export default ImageAnalysisService;
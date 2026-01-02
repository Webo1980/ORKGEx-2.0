// ================================
// src/core/services/ai/adapters/suggestionAdapter.js - Enhanced Version
// Handles property suggestions with improved caching and LLM integration
// ================================

import { generateId } from '../../../../utils/utils.js';
import { sanitizeText } from '../../../../utils/textUtils.js';

export class SuggestionAdapter {
    constructor(provider, cacheManager) {
        console.log('🤖 Initializing SuggestionAdapter...');
        
        this.provider = provider;
        this.cacheManager = cacheManager;
        this.promptTemplates = new SuggestionPromptTemplates();
        this.isInitialized = false;
        
        // Cache configuration
        this.cacheTTL = {
            propertyShort: 300000,    // 5 minutes for short text
            propertyMedium: 600000,   // 10 minutes for medium text
            propertyLong: 1800000,    // 30 minutes for long text
            fieldSuggestion: 3600000, // 1 hour for field suggestions
            annotation: 900000        // 15 minutes for annotations
        };
        
        // Statistics
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            avgResponseTime: 0
        };
    }
    
    async init() {
        if (this.isInitialized) return;
        
        // Get services from ServiceManager if not provided
        if (!this.provider && window.serviceManager) {
            this.provider = window.serviceManager.getService('openAIProvider');
        }
        
        if (!this.cacheManager && window.serviceManager) {
            this.cacheManager = window.serviceManager.getService('dataCache');
        }
        
        // Initialize the provider if needed
        if (this.provider && typeof this.provider.init === 'function' && !this.provider.isInitialized) {
            console.log('🤖 Initializing OpenAI provider from SuggestionAdapter...');
            await this.provider.init();
        }
        
        this.isInitialized = true;
        console.log('✅ SuggestionAdapter initialized');
    }

    /**
     * Get property suggestions for selected text with enhanced caching
     */
    async getPropertySuggestions(selectedText, context = {}) {
        const startTime = Date.now();
        
        try {
            // Ensure initialization
            if (!this.isInitialized) {
                await this.init();
            }
            
            // Validate input
            if (!selectedText || selectedText.trim().length < 3) {
                return { 
                    success: false, 
                    suggestions: [], 
                    total: 0, 
                    error: 'Text too short for meaningful suggestions' 
                };
            }

            const sanitizedText = sanitizeText(selectedText).trim();
            
            // Generate cache key based on text and context
            const cacheKey = this.generatePropertyCacheKey(sanitizedText, context);
            
            // Check cache first
            if (this.cacheManager) {
                const cached = this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    console.log('💾 Using cached property suggestions');
                    return {
                        success: true,
                        suggestions: cached.suggestions,
                        total: cached.suggestions.length,
                        cached: true,
                        cacheAge: Date.now() - cached.timestamp
                    };
                }
                this.stats.cacheMisses++;
            }
            
            // Check if provider is available
            if (!this.provider || typeof this.provider.makeRequest !== 'function') {
                console.warn('⚠️ OpenAI provider not available, using contextual fallback');
                return this.generateContextualFallbackSuggestions(sanitizedText);
            }
            
            // Generate prompt with enhanced context
            const prompt = this.promptTemplates.createPropertySuggestionPrompt(sanitizedText, context);
            
            this.stats.totalRequests++;
            console.log('🤖 Generating AI property suggestions...');
            
            // Make request to LLM
            const response = await this.provider.makeRequest({
                messages: [
                    {
                        role: 'system',
                        content: this.promptTemplates.propertyGenerationSystem
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.6,
                max_tokens: 400,
                useCache: false // We handle our own caching
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from LLM provider');
            }

            // Parse and validate suggestions
            const parsedResult = this.parsePropertySuggestions(content, sanitizedText);
            
            if (!parsedResult.success) {
                console.warn('LLM parsing failed, using fallback');
                return this.generateContextualFallbackSuggestions(sanitizedText);
            }
            
            // Cache the results
            if (this.cacheManager && parsedResult.suggestions.length > 0) {
                const ttl = this.determineCacheTTL(sanitizedText);
                const cacheData = {
                    suggestions: parsedResult.suggestions,
                    timestamp: Date.now(),
                    context: context
                };
                
                this.cacheManager.set(cacheKey, cacheData, ttl);
                console.log(`💾 Cached ${parsedResult.suggestions.length} property suggestions`);
            }
            
            // Update statistics
            const responseTime = Date.now() - startTime;
            this.updateResponseTimeStats(responseTime);
            
            console.log(`✅ Generated ${parsedResult.suggestions.length} AI property suggestions in ${responseTime}ms`);
            
            return {
                success: true,
                suggestions: parsedResult.suggestions,
                total: parsedResult.suggestions.length,
                cached: false,
                responseTime: responseTime
            };

        } catch (error) {
            this.stats.errors++;
            console.error('🚨 Property suggestions failed:', error);
            
            // Return contextual fallback on error
            return this.generateContextualFallbackSuggestions(selectedText);
        }
    }

    /**
     * Suggest research fields based on paper content with caching
     */
    async suggestResearchField(title, abstract) {
        try {
            // Ensure initialization
            if (!this.isInitialized) {
                await this.init();
            }
            
            const sanitizedTitle = sanitizeText(title || '').trim();
            const sanitizedAbstract = sanitizeText(abstract || '').substring(0, 1000).trim();

            if (!sanitizedTitle && !sanitizedAbstract) {
                return { success: false, suggestions: [], error: 'No content provided' };
            }
            
            // Check cache
            const cacheKey = this.generateFieldCacheKey(sanitizedTitle, sanitizedAbstract);
            if (this.cacheManager) {
                const cached = this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    return { success: true, suggestions: cached.suggestions, cached: true };
                }
                this.stats.cacheMisses++;
            }
            
            if (!this.provider) {
                return { success: false, suggestions: [], error: 'Provider not available' };
            }

            const response = await this.provider.makeRequest({
                messages: [
                    {
                        role: 'system',
                        content: this.promptTemplates.fieldSuggestionSystem
                    },
                    {
                        role: 'user',
                        content: `Title: ${sanitizedTitle}\n\nAbstract: ${sanitizedAbstract}\n\nSuggest relevant research fields:`
                    }
                ],
                temperature: 0.3,
                max_tokens: 400
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                return { success: false, suggestions: [], error: 'No response from provider' };
            }

            let suggestions;
            try {
                suggestions = JSON.parse(content);
                if (!Array.isArray(suggestions)) {
                    suggestions = [suggestions].filter(Boolean);
                }
            } catch (e) {
                console.error('Failed to parse field suggestions:', e);
                return { success: false, suggestions: [], error: 'Failed to parse response' };
            }
            
            // Cache successful results
            if (this.cacheManager && suggestions.length > 0) {
                const cacheData = {
                    suggestions: suggestions,
                    timestamp: Date.now()
                };
                this.cacheManager.set(cacheKey, cacheData, this.cacheTTL.fieldSuggestion);
            }

            return { success: true, suggestions: suggestions, cached: false };

        } catch (error) {
            console.error('Field suggestion failed:', error);
            return { success: false, suggestions: [], error: error.message };
        }
    }

    /**
     * Get intelligent recommendations based on current context
     */
    async getIntelligentRecommendations(analysisContext) {
        try {
            // Ensure initialization
            if (!this.isInitialized) {
                await this.init();
            }
            
            const { 
                currentStep, 
                metadata, 
                selectedField, 
                selectedProblem, 
                templateProperties 
            } = analysisContext;

            // Check cache
            const cacheKey = this.generateRecommendationCacheKey(analysisContext);
            if (this.cacheManager) {
                const cached = this.cacheManager.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    return { ...cached, cached: true };
                }
                this.stats.cacheMisses++;
            }

            if (!this.provider) {
                return { 
                    success: false, 
                    recommendations: [], 
                    context: currentStep,
                    error: 'Provider not available' 
                };
            }

            const prompt = this.promptTemplates.createRecommendationPrompt(analysisContext);

            const response = await this.provider.makeRequest({
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert research assistant providing intelligent recommendations for academic paper analysis. Provide actionable, context-aware suggestions.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.6,
                max_tokens: 500
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                return { 
                    success: false,
                    recommendations: [], 
                    context: currentStep,
                    error: 'No response from provider'
                };
            }

            const result = this.parseRecommendations(content, currentStep);
            
            // Cache successful results
            if (this.cacheManager && result.success) {
                this.cacheManager.set(cacheKey, result, 600000); // 10 minutes for recommendations
            }
            
            return { ...result, cached: false };

        } catch (error) {
            console.error('🚨 Intelligent recommendations failed:', error);
            return { 
                success: false,
                recommendations: [], 
                context: analysisContext.currentStep, 
                error: error.message 
            };
        }
    }

    /**
     * Parse property suggestions response with enhanced error handling
     */
    parsePropertySuggestions(content, originalText) {
        try {
            let suggestions;
            
            // Try to parse as JSON array
            try {
                suggestions = JSON.parse(content);
            } catch (jsonError) {
                // Try to extract JSON array from the response
                const arrayMatch = content.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    suggestions = JSON.parse(arrayMatch[0]);
                } else {
                    // Try to parse as individual suggestions
                    return this.parseTextPropertySuggestions(content, originalText);
                }
            }
            
            if (!Array.isArray(suggestions)) {
                suggestions = [suggestions].filter(Boolean);
            }
            
            // Validate and enhance suggestions
            const validSuggestions = suggestions
                .filter(suggestion => suggestion && suggestion.label)
                .map((suggestion, index) => ({
                    id: suggestion.id || generateId('ai_property'),
                    label: suggestion.label,
                    description: suggestion.description || 'AI-generated property suggestion',
                    confidence: Math.min(Math.max(suggestion.confidence || 0.8, 0.1), 1.0),
                    type: this.validatePropertyType(suggestion.type) || 'text',
                    source: 'ai_generated',
                    category: suggestion.category || 'general',
                    color: this.generatePropertyColor(suggestion.label),
                    metadata: {
                        originalText: originalText.substring(0, 100),
                        generatedAt: Date.now(),
                        rank: index + 1
                    }
                }))
                .slice(0, 6); // Limit to 6 suggestions
            
            return {
                success: true,
                suggestions: validSuggestions,
                total: validSuggestions.length
            };
            
        } catch (error) {
            console.error('🚨 Error parsing property suggestions:', error);
            return {
                success: false,
                suggestions: [],
                total: 0,
                error: error.message
            };
        }
    }

    /**
     * Parse text-based property suggestions when JSON parsing fails
     */
    parseTextPropertySuggestions(content, originalText) {
        const lines = content.split('\n').filter(line => line.trim());
        const suggestions = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip headers, numbers, or very short lines
            if (trimmed.length < 5 || /^\d+\.?$/.test(trimmed) || trimmed.startsWith('#')) {
                continue;
            }
            
            // Extract property name (remove bullets, numbers, etc.)
            let propertyName = trimmed.replace(/^[-*•\d\.\)]\s*/, '');
            
            // Split on colon if present (label: description format)
            const colonIndex = propertyName.indexOf(':');
            let description = 'AI-generated property suggestion';
            
            if (colonIndex > 0) {
                description = propertyName.substring(colonIndex + 1).trim();
                propertyName = propertyName.substring(0, colonIndex).trim();
            }
            
            if (propertyName.length > 2 && propertyName.length < 50) {
                suggestions.push({
                    id: generateId('ai_property'),
                    label: propertyName,
                    description: description,
                    confidence: 0.7,
                    type: 'text',
                    source: 'ai_generated',
                    category: 'general',
                    color: this.generatePropertyColor(propertyName),
                    metadata: {
                        originalText: originalText.substring(0, 100),
                        generatedAt: Date.now(),
                        parsedFromText: true
                    }
                });
            }
        }
        
        return {
            success: suggestions.length > 0,
            suggestions: suggestions.slice(0, 4),
            total: suggestions.length
        };
    }

    /**
     * Generate contextual fallback suggestions when AI is not available
     */
    generateContextualFallbackSuggestions(text) {
        const textLower = text.toLowerCase();
        const suggestions = [];
        
        // Enhanced contextual mapping
        const contextualMappings = [
            {
                keywords: ['method', 'approach', 'technique', 'algorithm', 'procedure'],
                properties: [
                    { label: 'Methodology', description: 'Research method or approach used', category: 'methodology' },
                    { label: 'Algorithm', description: 'Algorithmic approach or technique', category: 'methodology' }
                ]
            },
            {
                keywords: ['result', 'finding', 'outcome', 'conclusion', 'discovery'],
                properties: [
                    { label: 'Research Finding', description: 'Key research result or finding', category: 'results' },
                    { label: 'Outcome', description: 'Research outcome or conclusion', category: 'results' }
                ]
            },
            {
                keywords: ['data', 'dataset', 'corpus', 'collection', 'sample'],
                properties: [
                    { label: 'Dataset', description: 'Data collection or dataset used', category: 'data' },
                    { label: 'Data Source', description: 'Source of research data', category: 'data' }
                ]
            },
            {
                keywords: ['model', 'system', 'framework', 'architecture'],
                properties: [
                    { label: 'Model', description: 'Computational model or system', category: 'model' },
                    { label: 'Framework', description: 'Theoretical or technical framework', category: 'model' }
                ]
            },
            {
                keywords: ['performance', 'accuracy', 'evaluation', 'metric', 'measure'],
                properties: [
                    { label: 'Performance Metric', description: 'Evaluation or performance measure', category: 'evaluation' },
                    { label: 'Evaluation Criteria', description: 'Criteria used for evaluation', category: 'evaluation' }
                ]
            },
            {
                keywords: ['experiment', 'trial', 'test', 'validation'],
                properties: [
                    { label: 'Experimental Design', description: 'Design of the experiment', category: 'methodology' },
                    { label: 'Validation Method', description: 'Method used for validation', category: 'evaluation' }
                ]
            }
        ];
        
        // Find matching suggestions
        for (const mapping of contextualMappings) {
            if (mapping.keywords.some(keyword => textLower.includes(keyword))) {
                for (const property of mapping.properties) {
                    suggestions.push({
                        id: generateId('fallback_property'),
                        label: property.label,
                        description: property.description,
                        confidence: 0.6,
                        type: 'text',
                        source: 'contextual_fallback',
                        category: property.category,
                        color: this.generatePropertyColor(property.label),
                        metadata: {
                            originalText: text.substring(0, 100),
                            generatedAt: Date.now(),
                            fallbackReason: 'AI_SERVICE_UNAVAILABLE'
                        }
                    });
                }
            }
        }
        
        // Add generic suggestions if no specific matches
        if (suggestions.length === 0) {
            const genericSuggestions = [
                { label: 'Research Concept', description: 'Key concept or idea from the text', category: 'general' },
                { label: 'Technical Term', description: 'Important technical term or terminology', category: 'general' },
                { label: 'Research Claim', description: 'Important claim or assertion', category: 'general' }
            ];
            
            for (const property of genericSuggestions) {
                suggestions.push({
                    id: generateId('fallback_property'),
                    label: property.label,
                    description: property.description,
                    confidence: 0.5,
                    type: 'text',
                    source: 'generic_fallback',
                    category: property.category,
                    color: this.generatePropertyColor(property.label),
                    metadata: {
                        originalText: text.substring(0, 100),
                        generatedAt: Date.now(),
                        fallbackReason: 'NO_CONTEXTUAL_MATCH'
                    }
                });
            }
        }
        
        console.log(`💡 Generated ${suggestions.length} contextual fallback suggestions`);
        
        return {
            success: true,
            suggestions: suggestions.slice(0, 4),
            total: suggestions.length,
            fallback: true,
            reason: 'AI service unavailable'
        };
    }

    /**
     * Cache key generators
     */
    generatePropertyCacheKey(text, context) {
        const contextStr = JSON.stringify({
            title: context.paperTitle || '',
            field: context.researchField || '',
            url: context.pageUrl || ''
        });
        return `prop_suggest_${this.hashString(text + contextStr)}`;
    }
    
    generateFieldCacheKey(title, abstract) {
        return `field_suggest_${this.hashString(title + abstract)}`;
    }
    
    generateRecommendationCacheKey(context) {
        const contextStr = JSON.stringify({
            step: context.currentStep,
            field: context.selectedField,
            problem: context.selectedProblem?.id
        });
        return `recommend_${this.hashString(contextStr)}`;
    }

    /**
     * Utility methods
     */
    determineCacheTTL(text) {
        const length = text.length;
        if (length < 50) return this.cacheTTL.propertyShort;
        if (length < 200) return this.cacheTTL.propertyMedium;
        return this.cacheTTL.propertyLong;
    }
    
    validatePropertyType(type) {
        const validTypes = ['text', 'number', 'resource', 'boolean', 'date'];
        return validTypes.includes(type) ? type : 'text';
    }
    
    generatePropertyColor(label) {
        const colorMap = {
            'method': '#9C27B0', 'methodology': '#9C27B0', 'algorithm': '#9C27B0',
            'result': '#4CAF50', 'finding': '#4CAF50', 'outcome': '#4CAF50',
            'dataset': '#2196F3', 'data': '#2196F3', 'corpus': '#2196F3',
            'model': '#FF9800', 'system': '#FF9800', 'framework': '#FF9800',
            'evaluation': '#00BCD4', 'performance': '#00BCD4', 'metric': '#00BCD4',
            'experiment': '#E91E63', 'trial': '#E91E63', 'test': '#E91E63',
            'concept': '#9E9E9E', 'term': '#9E9E9E', 'claim': '#795548'
        };
        
        const labelLower = label.toLowerCase();
        
        // Check for keyword matches
        for (const [keyword, color] of Object.entries(colorMap)) {
            if (labelLower.includes(keyword)) {
                return color;
            }
        }
        
        // Generate color based on hash
        const hash = this.hashString(label);
        const hue = hash % 360;
        return `hsl(${hue}, 65%, 55%)`;
    }
    
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }
    
    updateResponseTimeStats(responseTime) {
        if (this.stats.totalRequests === 1) {
            this.stats.avgResponseTime = responseTime;
        } else {
            this.stats.avgResponseTime = (this.stats.avgResponseTime + responseTime) / 2;
        }
    }

    /**
     * Parse recommendations response
     */
    parseRecommendations(content, currentStep) {
        try {
            let recommendations;
            try {
                recommendations = JSON.parse(content);
            } catch (e) {
                // Fallback to text parsing
                recommendations = this.parseRecommendationsFromText(content);
            }

            if (!Array.isArray(recommendations)) {
                recommendations = [recommendations].filter(Boolean);
            }

            const validRecommendations = recommendations.map((rec, index) => ({
                id: generateId('recommendation'),
                title: rec.title || `Recommendation ${index + 1}`,
                description: rec.description || 'No description available',
                action: rec.action || 'consider',
                priority: rec.priority || 'medium',
                category: rec.category || 'general',
                confidence: rec.confidence || 0.7
            }));

            return {
                success: true,
                recommendations: validRecommendations,
                context: currentStep,
                total: validRecommendations.length
            };

        } catch (error) {
            console.error('🚨 Error parsing recommendations:', error);
            return {
                success: false,
                recommendations: [],
                context: currentStep,
                error: error.message
            };
        }
    }

    /**
     * Parse recommendations from plain text
     */
    parseRecommendationsFromText(content) {
        const lines = content.split('\n').filter(line => line.trim());
        const recommendations = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 10 && !trimmed.startsWith('#')) {
                recommendations.push({
                    title: trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : ''),
                    description: trimmed,
                    action: 'consider',
                    priority: 'medium'
                });
            }
        }

        return recommendations.slice(0, 5);
    }

    /**
     * Get service statistics
     */
    getStats() {
        const hitRate = this.stats.totalRequests > 0 
            ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2)
            : 0;
            
        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            avgResponseTime: Math.round(this.stats.avgResponseTime),
            errorRate: this.stats.totalRequests > 0
                ? ((this.stats.errors / this.stats.totalRequests) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        if (this.cacheManager) {
            this.cacheManager.clearByPrefix('prop_suggest_');
            this.cacheManager.clearByPrefix('field_suggest_');
            this.cacheManager.clearByPrefix('recommend_');
            console.log('🗑️ SuggestionAdapter cache cleared');
        }
    }

    /**
     * Check if service is ready
     */
    isReady() {
        return this.isInitialized && (this.provider || true); // Allow fallback mode
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasProvider: !!this.provider,
            hasCacheManager: !!this.cacheManager,
            stats: this.getStats()
        };
    }
}

/**
 * Enhanced Suggestion Prompt Templates
 */
class SuggestionPromptTemplates {
    constructor() {
        this.propertyGenerationSystem = `You are an expert at identifying semantic properties for academic text annotation. Your task is to suggest relevant, specific properties that researchers would use to annotate and categorize text in a knowledge graph.

Guidelines:
- Suggest 3-5 specific, actionable properties
- Focus on research concepts, not general categories
- Use standard academic terminology
- Properties should be granular enough to be useful for knowledge extraction
- Consider the research domain and methodology

Return ONLY a JSON array with this exact format:
[
  {
    "label": "Property Name",
    "description": "Clear description of what this property captures",
    "confidence": 0.9,
    "type": "text",
    "category": "methodology"
  }
]

Valid types: text, number, resource, boolean
Valid categories: methodology, data, results, model, evaluation, general`;

        this.fieldSuggestionSystem = `You are an expert in academic research classification. Analyze the given paper title and abstract to suggest the most relevant research fields. Focus on computer science, engineering, and related technical domains.

Return your response as JSON array with this format:
[
  {
    "field_name": "Machine Learning",
    "confidence": 0.95,
    "reasoning": "The paper discusses neural networks and deep learning algorithms"
  }
]

Only suggest fields you are confident about (confidence > 0.6).`;
    }

    /**
     * Create enhanced property suggestion prompt
     */
    createPropertySuggestionPrompt(selectedText, context = {}) {
        let prompt = `Analyze this text from a research paper and suggest 3-5 semantic properties for annotation:

Text: "${selectedText}"

`;

        // Add context if available
        if (context.paperTitle) {
            prompt += `Paper Title: ${context.paperTitle}\n`;
        }
        if (context.researchField) {
            prompt += `Research Field: ${context.researchField}\n`;
        }
        if (context.pageUrl && context.pageUrl.includes('arxiv')) {
            prompt += `Source: arXiv paper\n`;
        }

        prompt += `
Consider:
- What specific research concept does this text describe?
- What methodological aspect is being discussed?
- What type of data or result is mentioned?
- What evaluation metric or criterion is described?

Focus on properties that would help researchers:
1. Understand the research methodology
2. Identify key technical components
3. Extract quantitative results
4. Categorize research contributions

Suggest properties that are:
- Specific to the research domain
- Useful for knowledge extraction
- Standard in academic literature
- Granular enough to be actionable

Return the JSON array now:`;

        return prompt;
    }

    /**
     * Create recommendation prompt
     */
    createRecommendationPrompt(analysisContext) {
        const { currentStep, metadata, selectedField, selectedProblem, templateProperties } = analysisContext;

        let prompt = `Provide intelligent recommendations for the current research paper analysis step:

Current Step: ${currentStep}
Paper Title: ${metadata?.title || 'Unknown'}
Research Field: ${selectedField || 'Not selected'}
Research Problem: ${selectedProblem?.title || 'Not selected'}

Context:`;

        if (currentStep <= 2 && metadata) {
            prompt += `\n- Metadata extraction completed`;
        }
        if (currentStep <= 3 && selectedField) {
            prompt += `\n- Research field selected: ${selectedField}`;
        }
        if (currentStep <= 4 && selectedProblem) {
            prompt += `\n- Research problem identified: ${selectedProblem.title}`;
        }
        if (templateProperties && templateProperties.length > 0) {
            prompt += `\n- Template properties available: ${templateProperties.length}`;
        }

        prompt += `

Return recommendations as JSON array:
[
  {
    "title": "Recommendation Title",
    "description": "Detailed recommendation",
    "action": "review|edit|consider|verify",
    "priority": "high|medium|low",
    "category": "metadata|field|problem|template|analysis",
    "confidence": 0.8
  }
]

Focus on actionable recommendations that help improve the analysis quality.`;

        return prompt;
    }

    /**
     * Create annotation prompt
     */
    createAnnotationPrompt(selectedText, documentContext) {
        return `Analyze this text excerpt and provide semantic annotations:

Text: "${selectedText}"

Document Context:
- Paper Title: ${documentContext.title || 'Unknown'}
- Section: ${documentContext.section || 'Unknown'}
- Research Field: ${documentContext.field || 'Unknown'}

Return as JSON:
{
  "annotations": [
    {
      "type": "entity|concept|relation|metric",
      "category": "methodology|dataset|model|result",
      "value": "extracted value",
      "confidence": 0.9,
      "description": "explanation of annotation",
      "metadata": {
        "section": "source section",
        "relevance": "high|medium|low"
      }
    }
  ],
  "confidence": 0.85
}

Focus on:
- Research entities (datasets, models, methods)
- Quantitative results and metrics
- Technical concepts and terminology
- Relationships between concepts`;
    }
}

export default SuggestionAdapter;
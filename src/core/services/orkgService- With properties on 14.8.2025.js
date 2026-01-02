// ================================
// src/core/services/ORKGService.js - Enhanced with Complete API Integration
// ================================

import { eventManager } from '../../utils/eventManager.js';
import { HttpClient } from '../../utils/httpClient.js';
import configInstance from '../../config/config.js';

export class ORKGService {
    constructor(apiService, dataCache, orkgConfig) {
        this.apiService = apiService;
        this.dataCache = dataCache;
        
        // Use provided config (passed from popup.js)
        if (!orkgConfig) {
            // Fallback to global config
            orkgConfig = window.orkgConfigData?.orkg || {
                serverUrl: 'https://orkg.org',
                apiUrl: 'https://orkg.org/api',
                nlpServiceUrl: 'https://orkg.org/nlp/api'
            };
        }
        
        this.config = orkgConfig;
        this.serverUrl = orkgConfig.serverUrl;
        this.baseURL = orkgConfig.apiUrl;
        this.apiURL = `${this.baseURL}/`;
        this.nlpUrl = orkgConfig.nlpServiceUrl;
        
        console.log("🔬 ORKGService initialized with config:", {
            serverUrl: this.serverUrl,
            baseURL: this.baseURL,
            nlpUrl: this.nlpUrl
        });

        // Setup endpoints
        this.endpoints = {
            researchFields: orkgConfig.endpoints?.researchFields || '/research-fields',
            problems: orkgConfig.endpoints?.problems || '/problems',
            templates: orkgConfig.endpoints?.templates || '/templates',
            papers: orkgConfig.endpoints?.papers || '/papers',
            statements: orkgConfig.endpoints?.statements || '/statements',
            resources: orkgConfig.endpoints?.resources || '/resources',
            contributions: orkgConfig.endpoints?.contributions || '/contributions',
            predicates: orkgConfig.endpoints?.predicates || '/predicates',
            fieldProblems: (fieldId) => {
                if (fieldId && fieldId.startsWith('R')) {
                    return `/research-fields/${fieldId}/problems`;
                }
                return `/problems?research_field=${encodeURIComponent(fieldId)}`;
            }
        };
        
        this.defaultPageSize = orkgConfig.defaultPageSize || 100;
        this.maxPageSize = orkgConfig.maxPageSize || 500;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.cacheTTL = orkgConfig.cacheTTL || {
            researchFields: 3600000,
            fieldProblems: 1800000,
            problems: 1800000,
            papers: 1800000,
            templates: 1800000,
            predicates: 300000
        };
        
        // Common predicates cache
        this.commonPredicates = null;
        this.predicatesLastFetch = null;
        
        this.isInitialized = false;
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0
        };
        
        // IMPORTANT: Bind all methods to ensure they're available on the instance
        this.bindMethods();
    }
    
    bindMethods() {
        // Bind all methods to ensure they're available on the instance
        this.init = this.init.bind(this);
        this.makeRequest = this.makeRequest.bind(this);
        this.getHeaders = this.getHeaders.bind(this);
        this.getAuthHeaders = this.getAuthHeaders.bind(this);
        this.findRelatedResearchField = this.findRelatedResearchField.bind(this);
        this.enrichFieldsWithORKGInfo = this.enrichFieldsWithORKGInfo.bind(this);
        this.fetchResearchFieldInfo = this.fetchResearchFieldInfo.bind(this);
        this.getProblemsInField = this.getProblemsInField.bind(this);
        this.searchProblemsForField = this.searchProblemsForField.bind(this);
        this.getStatements = this.getStatements.bind(this);
        this.fetchProblemDescription = this.fetchProblemDescription.bind(this);
        this.fetchSameAsData = this.fetchSameAsData.bind(this);
        this.processProblemComplete = this.processProblemComplete.bind(this);
        this.getAllProblemsInField = this.getAllProblemsInField.bind(this);
        this.searchProblems = this.searchProblems.bind(this);
        
        // Predicate methods
        this.prefetchCommonPredicates = this.prefetchCommonPredicates.bind(this);
        this.fetchPredicates = this.fetchPredicates.bind(this);
        this.transformPredicates = this.transformPredicates.bind(this);
        this.getPredicateById = this.getPredicateById.bind(this);
        this.getSuggestedPredicates = this.getSuggestedPredicates.bind(this);
        this.getCommonPredicates = this.getCommonPredicates.bind(this);
        this.getPredicatesForField = this.getPredicatesForField.bind(this);
        this.createPredicate = this.createPredicate.bind(this);
        this.getFallbackPredicates = this.getFallbackPredicates.bind(this);
        
        // Template methods
        this.searchTemplates = this.searchTemplates.bind(this);
        this.getTemplateById = this.getTemplateById.bind(this);
        this.getResearchFields = this.getResearchFields.bind(this);
        
        // Paper and Template methods
        this.findPapersForProblem = this.findPapersForProblem.bind(this);
        this.getPaperFromContribution = this.getPaperFromContribution.bind(this);
        this.getPaperDetails = this.getPaperDetails.bind(this);
        this.scanPapersForTemplates = this.scanPapersForTemplates.bind(this);
        this.extractTemplatesFromPapers = this.extractTemplatesFromPapers.bind(this);
        this.getTemplateFromContribution = this.getTemplateFromContribution.bind(this);
        this.getTemplateForClass = this.getTemplateForClass.bind(this);
        this.getTemplateProperties = this.getTemplateProperties.bind(this);
        this.analyzeTemplatesForProblem = this.analyzeTemplatesForProblem.bind(this);
        
        // Utility methods
        this.extractProblemsFromResponse = this.extractProblemsFromResponse.bind(this);
        this.normalizeProblem = this.normalizeProblem.bind(this);
        this.extractKeywords = this.extractKeywords.bind(this);
        this.generatePropertyColor = this.generatePropertyColor.bind(this);
        this.delay = this.delay.bind(this);
        this.hashString = this.hashString.bind(this);
        this.getStats = this.getStats.bind(this);
        this.healthCheck = this.healthCheck.bind(this);
        this.getFromCache = this.getFromCache.bind(this);
        this.setInCache = this.setInCache.bind(this);
        this.setCache = this.setCache.bind(this);
        this.clearCache = this.clearCache.bind(this);
        this.clearPredicatesCache = this.clearPredicatesCache.bind(this);
        this.isReady = this.isReady.bind(this);
        this.getStatus = this.getStatus.bind(this);
        this.cleanup = this.cleanup.bind(this);
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🔬 Initializing ORKGService...');
        
        // Get services from ServiceManager if not provided
        if (!this.apiService) {
            this.apiService = window.serviceManager?.getService('apiService');
        }
        if (!this.dataCache) {
            this.dataCache = window.serviceManager?.getService('dataCache');
        }
        
        // Initialize DataCache if it has an init method and isn't initialized
        if (this.dataCache && typeof this.dataCache.init === 'function' && !this.dataCache.isInitialized) {
            console.log('🔬 Initializing DataCache from ORKGService...');
            await this.dataCache.init();
        }
        
        // Check if APIService needs initialization
        if (this.apiService && typeof this.apiService.init === 'function' && !this.apiService.isInitialized) {
            console.log('🔬 Initializing APIService from ORKGService...');
            await this.apiService.init();
        }
        
        // Verify that dataCache has required methods
        if (this.dataCache && typeof this.dataCache.get !== 'function') {
            console.error('❌ DataCache does not have required methods. DataCache type:', typeof this.dataCache, this.dataCache);
            this.dataCache = null; // Set to null to avoid errors
        }
        
        // Prefetch common predicates
        await this.prefetchCommonPredicates();
        
        this.isInitialized = true;
        console.log('✅ ORKGService initialized with:', {
            hasAPIService: !!this.apiService,
            hasDataCache: !!this.dataCache,
            dataCacheHasGet: this.dataCache ? typeof this.dataCache.get === 'function' : false
        });
    }

    /**
     * Prefetch common predicates for quick access
     */
    async prefetchCommonPredicates() {
        try {
            const predicates = await this.fetchPredicates('', 10);
            this.commonPredicates = predicates;
            this.predicatesLastFetch = Date.now();
        } catch (error) {
            console.warn('Failed to prefetch predicates:', error);
        }
    }

    /**
     * Get headers for requests
     */
    getHeaders() {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'ORKG-Annotator/2.0'
        };
    }

    /**
     * Get auth headers (placeholder for future auth implementation)
     */
    getAuthHeaders() {
        return this.getHeaders();
    }

    /**
     * Make HTTP request - fallback to HttpClient if APIService not available
     */
    async makeRequest(method, url, data = null, options = {}) {
        // Check if APIService has the required methods
        const hasApiServiceMethods = this.apiService && 
            typeof this.apiService.get === 'function' &&
            typeof this.apiService.post === 'function';
        
        // If we have a properly initialized APIService with methods, use it
        if (hasApiServiceMethods) {
            try {
                switch (method.toUpperCase()) {
                    case 'GET':
                        return await this.apiService.get(url, options);
                    case 'POST':
                        return await this.apiService.post(url, data, options);
                    case 'PUT':
                        return await this.apiService.put(url, data, options);
                    case 'DELETE':
                        return await this.apiService.delete(url, options);
                    default:
                        return await this.apiService.request({ ...options, method, url, body: data });
                }
            } catch (error) {
                console.error('APIService request failed, falling back to HttpClient:', error);
                // Fall through to HttpClient
            }
        } else if (this.apiService) {
            console.warn('⚠️ APIService exists but lacks required methods, using HttpClient directly');
        }
        
        // Fallback to direct HttpClient usage
        console.log('🔬 Using HttpClient directly for:', url);
        const response = await HttpClient.makeRequest(url, {
            method,
            body: data,
            timeout: options.timeout || 30000,
            headers: options.headers || this.getHeaders(),
            ...options
        });
        
        // Wrap response to match APIService format if needed
        return {
            data: response,
            status: 200,
            cached: false
        };
    }

    /**
     * Fetch predicates/properties from ORKG
     */
    async fetchPredicates(query = '', size = 20, exact = false) {
        const cacheKey = `predicates_${query}_${size}_${exact}`;
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        try {
            let url;
            if (query.trim() === '') {
                // Get most common predicates
                url = `${this.apiURL}predicates/?size=${size}&sort=created,desc`;
            } else if (exact) {
                // Exact match
                url = `${this.apiURL}predicates/?exact=${encodeURIComponent(query)}&size=${size}`;
            } else {
                // Fuzzy search
                url = `${this.apiURL}predicates/?q=${encodeURIComponent(query)}&size=${size}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Transform response
            const predicates = this.transformPredicates(data);
            
            // Cache the result
            this.setCache(cacheKey, predicates);
            
            return predicates;
            
        } catch (error) {
            console.error('Error fetching predicates:', error);
            return this.getFallbackPredicates();
        }
    }

    /**
     * Transform ORKG API response to our format
     */
    transformPredicates(data) {
        if (!data || !data.content) {
            return [];
        }
        
        return data.content.map(predicate => ({
            id: predicate.id,
            label: predicate.label,
            description: predicate.description || null,
            created_at: predicate.created_at,
            created_by: predicate.created_by,
            // Add additional metadata if available
            _class: predicate._class,
            extraction_method: predicate.extraction_method,
            shared: predicate.shared !== undefined ? predicate.shared : 1
        }));
    }

    /**
     * Get predicate by ID
     */
    async getPredicateById(predicateId) {
        const cacheKey = `predicate_${predicateId}`;
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        try {
            const response = await fetch(`${this.apiURL}predicates/${predicateId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const predicate = await response.json();
            
            // Transform to our format
            const transformed = {
                id: predicate.id,
                label: predicate.label,
                description: predicate.description || null,
                created_at: predicate.created_at,
                created_by: predicate.created_by,
                _class: predicate._class,
                extraction_method: predicate.extraction_method,
                shared: predicate.shared !== undefined ? predicate.shared : 1
            };
            
            // Cache the result
            this.setCache(cacheKey, transformed);
            
            return transformed;
            
        } catch (error) {
            console.error(`Error fetching predicate ${predicateId}:`, error);
            return null;
        }
    }

    /**
     * Get suggested predicates based on context
     */
    async getSuggestedPredicates(context) {
        // Build search query from context
        const keywords = this.extractKeywords(context);
        
        if (keywords.length === 0) {
            return this.getCommonPredicates();
        }
        
        // Search for each keyword and combine results
        const allResults = [];
        const seenIds = new Set();
        
        for (const keyword of keywords) {
            const results = await this.fetchPredicates(keyword, 5);
            
            for (const result of results) {
                if (!seenIds.has(result.id)) {
                    seenIds.add(result.id);
                    allResults.push(result);
                }
            }
        }
        
        // Sort by relevance (could be improved with scoring)
        return allResults.slice(0, 10);
    }

    /**
     * Get common predicates
     */
    async getCommonPredicates() {
        // Check if we have cached common predicates
        if (this.commonPredicates && 
            this.predicatesLastFetch && 
            (Date.now() - this.predicatesLastFetch < this.cacheTimeout)) {
            return this.commonPredicates;
        }
        
        // Fetch fresh common predicates
        await this.prefetchCommonPredicates();
        return this.commonPredicates || this.getFallbackPredicates();
    }

    /**
     * Get predicates for specific research field
     */
    async getPredicatesForField(fieldId) {
        const cacheKey = `field_predicates_${fieldId}`;
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        try {
            // Get papers in this field
            const url = `${this.apiURL}papers/?research_field=${fieldId}&size=50`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Extract unique predicates from papers
            const predicateIds = new Set();
            const predicates = [];
            
            if (data.content) {
                for (const paper of data.content) {
                    if (paper.statements) {
                        for (const statement of paper.statements) {
                            if (statement.predicate && !predicateIds.has(statement.predicate.id)) {
                                predicateIds.add(statement.predicate.id);
                                predicates.push({
                                    id: statement.predicate.id,
                                    label: statement.predicate.label,
                                    description: null
                                });
                            }
                        }
                    }
                }
            }
            
            // Cache the result
            this.setCache(cacheKey, predicates);
            
            return predicates;
            
        } catch (error) {
            console.error(`Error fetching predicates for field ${fieldId}:`, error);
            return this.getFallbackPredicates();
        }
    }

    /**
     * Create a new predicate
     */
    async createPredicate(label, description = null) {
        try {
            const response = await fetch(`${this.apiURL}predicates/`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    label: label,
                    description: description
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const predicate = await response.json();
            
            // Clear predicates cache
            this.clearPredicatesCache();
            
            return {
                id: predicate.id,
                label: predicate.label,
                description: predicate.description || null
            };
            
        } catch (error) {
            console.error('Error creating predicate:', error);
            throw error;
        }
    }

    /**
     * Search templates
     */
    async searchTemplates(query = '', size = 20) {
        const cacheKey = `templates_${query}_${size}`;
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        try {
            const url = query.trim() === ''
                ? `${this.apiURL}templates/?size=${size}`
                : `${this.apiURL}templates/?q=${encodeURIComponent(query)}&size=${size}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Transform templates
            const templates = data.content ? data.content.map(template => ({
                id: template.id,
                label: template.label,
                description: template.description || null,
                properties: template.properties || [],
                formatted_label: template.formatted_label || template.label,
                target_class: template.target_class,
                relations: template.relations || []
            })) : [];
            
            // Cache the result
            this.setCache(cacheKey, templates);
            
            return templates;
            
        } catch (error) {
            console.error('Error searching templates:', error);
            return [];
        }
    }

    /**
     * Get template by ID
     */
    async getTemplateById(templateId) {
        const cacheKey = `template_${templateId}`;
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        try {
            const response = await fetch(`${this.apiURL}templates/${templateId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const template = await response.json();
            
            // Transform to our format
            const transformed = {
                id: template.id,
                label: template.label,
                description: template.description || null,
                properties: template.properties || [],
                formatted_label: template.formatted_label || template.label,
                target_class: template.target_class,
                relations: template.relations || [],
                components: template.components || []
            };
            
            // Cache the result
            this.setCache(cacheKey, transformed);
            
            return transformed;
            
        } catch (error) {
            console.error(`Error fetching template ${templateId}:`, error);
            return null;
        }
    }

    /**
     * Get research fields
     */
    async getResearchFields(query = '', size = 20) {
        const cacheKey = `fields_${query}_${size}`;
        
        // Check cache
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        try {
            const url = query.trim() === ''
                ? `${this.apiURL}research-fields/?size=${size}`
                : `${this.apiURL}research-fields/?q=${encodeURIComponent(query)}&size=${size}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Transform fields
            const fields = data.content ? data.content.map(field => ({
                id: field.id,
                label: field.label,
                description: field.description || null,
                parent_id: field.parent_id,
                child_count: field.child_count || 0
            })) : [];
            
            // Cache the result
            this.setCache(cacheKey, fields);
            
            return fields;
            
        } catch (error) {
            console.error('Error fetching research fields:', error);
            return [];
        }
    }

    /**
     * Extract keywords from text for searching
     */
    extractKeywords(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }
        
        // Convert to lowercase and remove punctuation
        const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');
        
        // Split into words
        const words = cleaned.split(/\s+/).filter(word => word.length > 3);
        
        // Remove common stop words
        const stopWords = new Set([
            'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
            'were', 'been', 'being', 'have', 'their', 'they', 'them', 'than',
            'when', 'where', 'which', 'while', 'will', 'with', 'would'
        ]);
        
        const keywords = words.filter(word => !stopWords.has(word));
        
        // Get unique keywords
        const unique = [...new Set(keywords)];
        
        // Return top 5 keywords
        return unique.slice(0, 5);
    }

    /**
     * Get fallback predicates when API fails
     */
    getFallbackPredicates() {
        return [
            { 
                id: 'P2001', 
                label: 'Method', 
                description: 'The methodology or approach used in the research'
            },
            { 
                id: 'P2002', 
                label: 'Result', 
                description: 'The findings or outcomes of the research'
            },
            { 
                id: 'P2003', 
                label: 'Conclusion', 
                description: 'The conclusions drawn from the research'
            },
            { 
                id: 'P2004', 
                label: 'Dataset', 
                description: 'The dataset used or produced in the research'
            },
            { 
                id: 'P2005', 
                label: 'Evaluation', 
                description: 'Evaluation metrics or performance measures'
            },
            { 
                id: 'P2006', 
                label: 'Problem', 
                description: 'The research problem or question addressed'
            },
            { 
                id: 'P2007', 
                label: 'Contribution', 
                description: 'The main contribution of the research'
            },
            { 
                id: 'P2008', 
                label: 'Background', 
                description: 'Background information or related work'
            },
            { 
                id: 'P2009', 
                label: 'Future Work', 
                description: 'Suggested future research directions'
            },
            { 
                id: 'P2010', 
                label: 'Limitation', 
                description: 'Limitations of the research or approach'
            }
        ];
    }

    /**
     * Generate a color for a property
     */
    generatePropertyColor(propertyLabel) {
        // Generate consistent colors based on property label
        const colors = {
            'method': '#9C27B0',
            'result': '#4CAF50',
            'conclusion': '#FF9800',
            'dataset': '#2196F3',
            'evaluation': '#00BCD4',
            'problem': '#F44336',
            'contribution': '#8BC34A',
            'background': '#795548',
            'future work': '#607D8B',
            'limitation': '#FFC107'
        };
        
        const labelLower = propertyLabel.toLowerCase();
        
        // Check for exact match
        if (colors[labelLower]) {
            return colors[labelLower];
        }
        
        // Check for partial match
        for (const [key, color] of Object.entries(colors)) {
            if (labelLower.includes(key) || key.includes(labelLower)) {
                return color;
            }
        }
        
        // Generate random color for unknown properties
        const baseColors = Object.values(colors);
        const hash = this.hashString(propertyLabel);
        return baseColors[hash % baseColors.length];
    }

    /**
     * Cache management methods
     */
    getFromCache(key) {
        if (!this.cache.has(key)) {
            return null;
        }
        
        const cached = this.cache.get(key);
        
        // Check if expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
    
    clearCache() {
        this.cache.clear();
        if (this.dataCache) {
            this.dataCache.clearByPrefix('orkg_');
            this.dataCache.clearByPrefix('field_info_');
            this.dataCache.clearByPrefix('papers_');
            this.dataCache.clearByPrefix('templates_');
        }
    }
    
    clearPredicatesCache() {
        // Clear only predicate-related cache entries
        for (const key of this.cache.keys()) {
            if (key.startsWith('predicate')) {
                this.cache.delete(key);
            }
        }
        
        // Reset common predicates
        this.commonPredicates = null;
        this.predicatesLastFetch = null;
    }

    /**
     * Find related research field using NLP service
     */
    async findRelatedResearchField(abstract, topN = 5) {
        const url = `${this.nlpUrl}annotation/rfclf`;
        
        console.log('🌐 ORKG Service: Calling NLP service for field classification');
        this.stats.totalRequests++;
        
        const requestBody = {
            raw_input: abstract.substring(0, 5000),
            top_n: Math.min(topN, 10)
        };

        try {
            // Use the unified makeRequest method
            const response = await this.makeRequest('POST', url, requestBody, {
                timeout: 30000,
                headers: this.getHeaders(),
                cache: false // Don't cache NLP results as they're input-specific
            });
            
            const data = response.data || response;
            
            console.log('✅ ORKG Service: NLP service response received');
            console.log(`📊 ORKG Service: Found ${data.payload?.annotations?.length || 0} field annotations`);
            
            return data;

        } catch (error) {
            if (error.message && error.message.includes('timeout')) {
                console.error('⏰ ORKG Service: NLP service request timed out');
                throw new Error('Research field detection timed out - please try again');
            }
            
            console.error('❌ ORKG Service: NLP service error:', error);
            throw error;
        }
    }

    async enrichFieldsWithORKGInfo(fields) {
        const enrichedFields = [];
        
        console.log("NLP fields to enrich:", fields);
        
        for (const field of fields) {
            try {
                let fieldInfo = null;
                
                // Check cache for ORKG field info
                const cacheKey = `field_info_${this.hashString(field.research_field)}`;
                if (this.dataCache) {
                    fieldInfo = this.dataCache.get(cacheKey);
                }
                
                // Fetch from ORKG if not cached
                if (!fieldInfo) {
                    fieldInfo = await this.fetchResearchFieldInfo(field.research_field);
                }
                
                // Create enriched field object
                const enrichedField = {
                    label: field.research_field,
                    score: field.score,
                    id: fieldInfo?.id || null,
                    url: fieldInfo?.url || null,
                    hasORKGInfo: !!fieldInfo?.id,
                    orkgInfo: fieldInfo,
                    // Additional metadata from ORKG
                    shared: fieldInfo?.shared || 0,
                    verified: fieldInfo?.verified || false,
                    hasResearchFieldClass: fieldInfo?.hasResearchFieldClass || false
                };
                
                enrichedFields.push(enrichedField);
                
                console.log(`✅ Enriched field "${field.research_field}" with ID: ${enrichedField.id || 'none'}`);
                
            } catch (error) {
                console.warn(`Failed to enrich field "${field.research_field}":`, error);
                
                // Add field without ORKG info
                enrichedFields.push({
                    label: field.research_field,
                    score: field.score,
                    id: null,
                    url: null,
                    hasORKGInfo: false,
                    orkgInfo: null,
                    shared: 0,
                    verified: false,
                    hasResearchFieldClass: false
                });
            }
        }
        
        return enrichedFields;
    }

    /**
     * Fetch detailed research field information
     */
    async fetchResearchFieldInfo(fieldLabel) {
        try {
            console.log('📋 ORKG Service: Fetching research field info for:', fieldLabel);
            
            // Check cache first
            const cacheKey = `field_info_${this.hashString(fieldLabel)}`;
            if (this.dataCache && typeof this.dataCache.get === 'function') {
                const cachedInfo = this.dataCache.get(cacheKey);
                if (cachedInfo) {
                    console.log('📋 ORKG Service: Using cached field info');
                    this.stats.cacheHits++;
                    return cachedInfo;
                }
                this.stats.cacheMisses++;
            }
            
            // Build search URL
            const searchUrl = HttpClient.buildUrl(`${this.baseURL}/resources`, {
                q: fieldLabel,
                classes: 'ResearchField',
                size: 10
            });
            
            // Use the unified makeRequest method
            const response = await this.makeRequest('GET', searchUrl, null, {
                timeout: 30000,
                cache: false // We'll cache the processed result ourselves
            });
            
            const data = response.data || response;

            if (!data || !data.content) {
                console.warn('No content in ORKG field search response');
                return null;
            }

            // Process the response to find the correct ResearchField
            let fieldId = null;
            let fieldResource = null;
            
            // Find exact match with ResearchField class
            for (const resource of data.content) {
                if (resource.classes && resource.classes.includes('ResearchField')) {
                    if (resource.label.toLowerCase() === fieldLabel.toLowerCase()) {
                        fieldId = resource.id;
                        fieldResource = resource;
                        break;
                    }
                    if (!fieldId) {
                        fieldId = resource.id;
                        fieldResource = resource;
                    }
                }
            }
            
            // If no ResearchField found, use best match
            if (!fieldId && data.content.length > 0) {
                let bestMatch = data.content[0];
                for (const resource of data.content) {
                    if (resource.shared > bestMatch.shared) {
                        bestMatch = resource;
                    }
                }
                
                if (bestMatch.shared > 0) {
                    fieldId = bestMatch.id;
                    fieldResource = bestMatch;
                    console.warn(`⚠️ No ResearchField class found for "${fieldLabel}", using best match: ${fieldId}`);
                }
            }
            
            if (!fieldId) {
                console.warn(`❌ No suitable field found for: ${fieldLabel}`);
                return null;
            }
            
            // Construct the result object
            const fieldInfo = {
                id: fieldId,
                url: `${this.serverUrl}/fields/${fieldId}`,
                resource: fieldResource,
                searchResponse: data,
                label: fieldResource.label,
                shared: fieldResource.shared || 0,
                verified: fieldResource.verified || false,
                created_at: fieldResource.created_at,
                hasResearchFieldClass: fieldResource.classes?.includes('ResearchField') || false
            };
            
            // Cache the result
            if (this.dataCache) {
                this.dataCache.set(cacheKey, fieldInfo, this.cacheTTL.researchFields || 3600000);
            }
            
            console.log(`✅ ORKG Service: Found field ID ${fieldId} for "${fieldLabel}"`);
            return fieldInfo;

        } catch (error) {
            console.error('❌ ORKG Service: Error fetching research field info:', error);
            this.stats.errors++;
            return null;
        }
    }
    
    /**
     * Get problems in a specific research field
     */
    async getProblemsInField(fieldId, options = {}) {
        if (!fieldId) {
            throw new Error('Field ID is required');
        }
        
        if (!this.isInitialized) await this.init();
        
        const {
            page = 0,
            size = this.defaultPageSize,
            useCache = true
        } = options;
        
        try {
            // Check cache first
            if (useCache && this.dataCache) {
                const cacheKey = `orkg_field_problems_${fieldId}_${page}_${size}`;
                const cached = this.dataCache.get(cacheKey);
                if (cached) {
                    console.log('💾 Using cached ORKG problems');
                    this.stats.cacheHits++;
                    return cached;
                }
                this.stats.cacheMisses++;
            }
            
            // Build URL based on field ID format
            let url;
            if (fieldId.startsWith('R')) {
                url = HttpClient.buildUrl(`${this.baseURL}/research-fields/${fieldId}/problems`, {
                    page: page.toString(),
                    size: Math.min(size, this.maxPageSize).toString()
                });
            } else {
                console.warn(`⚠️ Field ID doesn't look like an ORKG ID: ${fieldId}, trying search endpoint`);
                url = HttpClient.buildUrl(`${this.baseURL}/problems`, {
                    research_field: fieldId,
                    page: page.toString(),
                    size: Math.min(size, this.maxPageSize).toString()
                });
            }
            
            console.log(`🔬 Fetching problems from ORKG: ${url}`);
            this.stats.totalRequests++;
            
            // Use the unified makeRequest method
            const response = await this.makeRequest('GET', url);
            const data = response.data || response;
            
            // Extract and normalize problems
            const problems = this.extractProblemsFromResponse(data);
            
            console.log(`🔬 Retrieved ${problems.length} problems for field ${fieldId} (page ${page})`);
            
            // Cache the results
            if (useCache && this.dataCache && problems.length > 0) {
                const cacheKey = `orkg_field_problems_${fieldId}_${page}_${size}`;
                this.dataCache.set(cacheKey, problems, this.cacheTTL.fieldProblems || 1800000);
            }
            
            return problems;
            
        } catch (error) {
            console.error(`Failed to get problems for field ${fieldId}:`, error);
            this.stats.errors++;
            
            // Try alternative endpoint on 404
            if (error.message && error.message.includes('404') && fieldId.startsWith('R')) {
                return this.searchProblemsForField(fieldId, options);
            }
            
            return [];
        }
    }

    /**
     * Search problems for a field using the search endpoint
     */
    async searchProblemsForField(fieldId, options = {}) {
        const { page = 0, size = this.defaultPageSize } = options;
        
        try {
            const url = HttpClient.buildUrl(`${this.baseURL}/problems`, {
                q: fieldId,
                page: page.toString(),
                size: size.toString()
            });
            
            console.log(`🔬 Searching problems with query: ${url}`);
            this.stats.totalRequests++;
            
            const response = await this.makeRequest('GET', url);
            const data = response.data || response;
            const problems = this.extractProblemsFromResponse(data);
            
            console.log(`🔬 Found ${problems.length} problems via search`);
            return problems;
            
        } catch (error) {
            console.error('Alternative problem search also failed:', error);
            this.stats.errors++;
            return [];
        }
    }

    /**
     * Get statements for a resource with a specific predicate
     */
    async getStatements(subjectId, predicateLabel) {
        try {
            const url = `${this.baseURL}/statements/?predicate_id=${predicateLabel}&subject_id=${subjectId}`;
            
            const response = await this.makeRequest('GET', url, null, {
                headers: this.getAuthHeaders()
            });
            
            const data = response.data || response;
            return data || [];
            
        } catch (error) {
            if (error.status === 404) {
                return []; // No statements found
            }
            console.warn(`Failed to get statements for ${subjectId}/${predicateLabel}:`, error);
            return [];
        }
    }

    /**
     * Get all problems in a research field with pagination
     */
    async getAllProblemsInField(fieldId, options = {}) {
        const {
            maxProblems = 1000,
            pageSize = 100,
            onProgress = null
        } = options;

        const allProblems = [];
        let currentPage = 0;
        let hasMore = true;

        console.log(`🔬 Fetching all problems for field ${fieldId}`);

        while (hasMore && allProblems.length < maxProblems) {
            try {
                const pageNumber = currentPage;
                const url = `${this.baseURL}/research-fields/${fieldId}/problems?page=${pageNumber}&size=${pageSize}`;

                const response = await this.makeRequest('GET', url, null, {
                    headers: this.getHeaders()
                });

                const data = response.data || response;
                const problems = data.content || [];
                const totalElements = data.totalElements || 0;

                if (problems.length === 0) {
                    hasMore = false;
                    break;
                }

                // Process problems to extract the nested structure
                const processedProblems = problems.map(item => {
                    const problem = item.problem || item;
                    return {
                        id: problem.id,
                        label: problem.label || '',
                        title: problem.label || '',
                        papers: item.papers || 0,
                        description: ''
                    };
                });

                allProblems.push(...processedProblems);

                console.log(`🔬 Page ${currentPage}: ${problems.length} problems (total: ${allProblems.length})`);

                if (onProgress) {
                    onProgress({
                        currentPage,
                        problemsFound: allProblems.length,
                        totalElements,
                        progress: (allProblems.length / Math.min(totalElements, maxProblems)) * 100
                    });
                }

                if (problems.length < pageSize || allProblems.length >= maxProblems) {
                    hasMore = false;
                } else {
                    currentPage++;
                    await this.delay(100);
                }

            } catch (error) {
                console.error(`Error fetching page ${currentPage}:`, error);
                break;
            }
        }

        console.log(`🔬 Completed problem discovery: ${allProblems.length} total problems found`);
        return allProblems;
    }

    /**
     * Fetch problem description (helper method)
     */
    async fetchProblemDescription(problemId) {
        const statements = await this.getStatements(problemId, 'description');
        if (statements && statements.length > 0) {
            return statements[0]?.object?.label || '';
        }
        return '';
    }

    /**
     * Fetch same_as data (helper method)
     */
    async fetchSameAsData(problemId) {
        const statements = await this.getStatements(problemId, 'SAME_AS');
        if (statements && statements.length > 0) {
            return statements[0]?.object?.label || '';
        }
        return '';
    }

    /**
     * Process a single problem to fetch all its data
     */
    async processProblemComplete(problemData) {
        try {
            const problem = problemData.problem || problemData;
            
            if (!problem.id) {
                return null;
            }
            
            // Fetch description and same_as in parallel
            const [description, sameAs] = await Promise.all([
                this.fetchProblemDescription(problem.id),
                this.fetchSameAsData(problem.id)
            ]);
            
            return {
                id: problem.id,
                label: problem.label || '',
                title: problem.label || '',
                description: description,
                same_as: sameAs,
                papers_count: problemData.papers || problem.papers_count || 0
            };
            
        } catch (error) {
            console.error(`Error processing problem ${problemData.id}:`, error);
            return null;
        }
    }
    
    /**
     * Search problems by query
     */
    async searchProblems(query, options = {}) {
        if (!query || query.trim().length === 0) {
            throw new Error('Search query is required');
        }
        
        if (!this.isInitialized) await this.init();
        
        const { page = 0, size = 50, exact = false } = options;
        
        try {
            const url = HttpClient.buildUrl(`${this.baseURL}${this.endpoints.problems}/search`, {
                q: query.trim(),
                page: page.toString(),
                size: size.toString(),
                ...(exact && { exact: 'true' })
            });
            
            const cacheKey = `orkg_problem_search_${this.hashString(query)}_${page}_${size}`;
            
            // Check cache
            if (this.dataCache) {
                const cached = this.dataCache.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    return cached;
                }
                this.stats.cacheMisses++;
            }
            
            this.stats.totalRequests++;
            const response = await this.makeRequest('GET', url);
            const data = response.data || response;
            const problems = this.extractProblemsFromResponse(data);
            
            const result = {
                problems,
                query,
                pagination: data.page || {
                    size: problems.length,
                    number: page,
                    total_elements: problems.length,
                    total_pages: 1
                },
                timestamp: Date.now()
            };
            
            // Cache result
            if (this.dataCache && problems.length > 0) {
                this.dataCache.set(cacheKey, result, this.cacheTTL.problems);
            }
            
            console.log(`🔍 Search found ${problems.length} problems for query: "${query}"`);
            
            return result;
            
        } catch (error) {
            console.error('Problem search failed:', error);
            this.stats.errors++;
            return {
                problems: [],
                query,
                pagination: { size: 0, number: 0, total_elements: 0, total_pages: 0 },
                timestamp: Date.now(),
                error: error.message
            };
        }
    }

    /**
     * Find papers that reference a specific problem
     * @param {string} problemId - The problem ID to search for
     * @param {Object} options - Options for the search
     * @returns {Promise<Array>} Array of papers
     */
    async findPapersForProblem(problemId, options = {}) {
        const { 
            maxPapers = 500,
            onProgress = null 
        } = options;
        
        try {
            const papers = new Set();
            const cacheKey = `papers_for_problem_${problemId}`;
            
            // Check cache first
            if (this.dataCache) {
                const cached = this.dataCache.get(cacheKey);
                if (cached) {
                    console.log('💾 Using cached papers for problem');
                    this.stats.cacheHits++;
                    return cached;
                }
                this.stats.cacheMisses++;
            }
            
            // Get statements where the problem is referenced
            const url = `${this.baseURL}/statements?object=${problemId}&size=${maxPapers}`;
            
            console.log(`📋 Fetching statements for problem: ${url}`);
            
            const response = await this.makeRequest('GET', url);
            const statements = response.content || response.data?.content || response || [];
            
            console.log(`📋 Found ${statements.length} statements for problem`);
            
            // Process statements to find papers
            for (const statement of statements) {
                // Check if the subject is a paper or contribution
                if (statement.subject) {
                    if (statement.subject.classes?.includes('Paper')) {
                        papers.add({
                            id: statement.subject.id,
                            label: statement.subject.label || 'Untitled Paper'
                        });
                    } else if (statement.subject.classes?.includes('Contribution')) {
                        // Get the paper for this contribution
                        const paper = await this.getPaperFromContribution(statement.subject.id);
                        if (paper) {
                            papers.add(paper);
                        }
                    }
                }
                
                if (onProgress && papers.size % 10 === 0) {
                    onProgress({
                        found: papers.size,
                        processed: statements.indexOf(statement) + 1,
                        total: statements.length
                    });
                }
            }
            
            const papersArray = Array.from(papers);
            
            // Cache the results
            if (this.dataCache && papersArray.length > 0) {
                this.dataCache.set(cacheKey, papersArray, this.cacheTTL.papers);
            }
            
            console.log(`📋 Extracted ${papersArray.length} unique papers`);
            return papersArray;
            
        } catch (error) {
            console.error('Error finding papers for problem:', error);
            this.stats.errors++;
            return [];
        }
    }

    /**
     * Get paper from a contribution ID
     * @param {string} contributionId - The contribution ID
     * @returns {Promise<Object|null>} Paper object or null
     */
    async getPaperFromContribution(contributionId) {
        try {
            const url = `${this.baseURL}/statements?object=${contributionId}&predicate=P31`;
            
            const response = await this.makeRequest('GET', url);
            const statements = response.content || response || [];
            
            for (const statement of statements) {
                if (statement.subject?.classes?.includes('Paper')) {
                    return {
                        id: statement.subject.id,
                        label: statement.subject.label || 'Untitled Paper'
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error(`Error getting paper from contribution ${contributionId}:`, error);
            return null;
        }
    }

    /**
     * Get detailed paper information
     * @param {string} paperId - The paper ID
     * @returns {Promise<Object>} Paper details
     */
    async getPaperDetails(paperId) {
        try {
            const cacheKey = `paper_details_${paperId}`;
            
            // Check cache first
            if (this.dataCache) {
                const cached = this.dataCache.get(cacheKey);
                if (cached) {
                    this.stats.cacheHits++;
                    return cached;
                }
                this.stats.cacheMisses++;
            }
            
            const paperUrl = `${this.baseURL}/papers/${paperId}`;
            const response = await this.makeRequest('GET', paperUrl);
            const paperData = response.data || response;
            
            // Cache the result
            if (this.dataCache && paperData) {
                this.dataCache.set(cacheKey, paperData, this.cacheTTL.papers);
            }
            
            return paperData;
            
        } catch (error) {
            console.error(`Error fetching paper details for ${paperId}:`, error);
            return { contributions: [] };
        }
    }

    /**
     * Scan papers for templates - main method for template discovery
     * @param {string} problemId - The problem ID
     * @param {Object} options - Options for scanning
     * @returns {Promise<Object>} Template analysis results
     */
    async scanPapersForTemplates(problemId, options = {}) {
        const {
            maxPapers = 100,
            onProgress = null
        } = options;
        
        try {
            const cacheKey = `templates_for_problem_${problemId}`;
            
            // Check cache first
            if (this.dataCache) {
                const cached = this.dataCache.get(cacheKey);
                if (cached) {
                    console.log('💾 Using cached template analysis');
                    return cached;
                }
            }
            
            // Step 1: Find papers
            const papers = await this.findPapersForProblem(problemId, {
                maxPapers,
                onProgress: onProgress ? (data) => onProgress({ phase: 'finding_papers', ...data }) : null
            });
            
            if (!papers || papers.length === 0) {
                return {
                    templates: [],
                    papersWithTemplates: [],
                    totalPapers: 0,
                    templatesFound: 0
                };
            }
            
            // Step 2: Extract templates
            const templateAnalysis = await this.extractTemplatesFromPapers(papers, {
                onProgress: onProgress ? (data) => onProgress({ phase: 'extracting_templates', ...data }) : null
            });
            
            // Cache the results
            if (this.dataCache && templateAnalysis.templatesFound > 0) {
                this.dataCache.set(cacheKey, templateAnalysis, this.cacheTTL.templates);
            }
            
            return templateAnalysis;
            
        } catch (error) {
            console.error('Error scanning papers for templates:', error);
            return {
                templates: [],
                papersWithTemplates: [],
                totalPapers: 0,
                templatesFound: 0,
                error: error.message
            };
        }
    }

    /**
     * Extract templates from a list of papers
     * @param {Array} papers - Array of paper objects
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Analysis results
     */
    async extractTemplatesFromPapers(papers, options = {}) {
        const { onProgress = null } = options;
        const templateMap = new Map();
        const papersWithTemplates = [];
        let processedCount = 0;
        
        for (const paper of papers) {
            try {
                processedCount++;
                
                // Update progress
                if (onProgress) {
                    onProgress({
                        processed: processedCount,
                        total: papers.length,
                        templatesFound: templateMap.size
                    });
                }
                
                // Get paper details including contributions
                const paperData = await this.getPaperDetails(paper.id);
                
                if (!paperData.contributions || paperData.contributions.length === 0) {
                    continue;
                }
                
                // Check each contribution for templates
                for (const contribution of paperData.contributions) {
                    const template = await this.getTemplateFromContribution(contribution.id);
                    
                    if (template) {
                        papersWithTemplates.push({
                            paperId: paper.id,
                            paperTitle: paper.label,
                            templateId: template.id,
                            templateName: template.name
                        });
                        
                        if (!templateMap.has(template.id)) {
                            templateMap.set(template.id, {
                                template: template,
                                papers: [],
                                count: 0
                            });
                        }
                        
                        const entry = templateMap.get(template.id);
                        entry.papers.push({
                            id: paper.id,
                            title: paper.label
                        });
                        entry.count++;
                    }
                }
                
                // Add small delay to avoid overwhelming the API
                if (processedCount % 5 === 0) {
                    await this.delay(100);
                }
                
            } catch (error) {
                console.warn(`Failed to process paper ${paper.id}:`, error);
            }
        }
        
        // Convert to sorted array
        const templates = Array.from(templateMap.values())
            .sort((a, b) => b.count - a.count)
            .map(item => ({
                ...item.template,
                paperCount: item.count,
                papers: item.papers
            }));
        
        return {
            templates,
            papersWithTemplates,
            totalPapers: papers.length,
            templatesFound: templates.length,
            timestamp: Date.now()
        };
    }

    /**
     * Get template from a contribution
     */
    async getTemplateFromContribution(contributionId) {
        try {
            const resourceUrl = `${this.baseURL}/resources/${contributionId}`;
            const response = await this.makeRequest('GET', resourceUrl, null, {
                headers: this.getAuthHeaders()
            });
            
            const data = response.data || response;
            if (!data || !data.classes) {
                return null;
            }
            
            const classes = data.classes;
            
            // Check each class for associated templates
            for (const classId of classes) {
                const template = await this.getTemplateForClass(classId);
                if (template) {
                    return template;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error(`Error fetching template from contribution ${contributionId}:`, error);
            return null;
        }
    }

    /**
     * Get template for a specific class
     */
    async getTemplateForClass(classId) {
        try {
            const templateUrl = `${this.baseURL}/templates?target_class=${classId}&size=1`;
            const response = await this.makeRequest('GET', templateUrl, null, {
                headers: this.getAuthHeaders()
            });
            
            const data = response.data || response;
            if (!data || !data.content || data.content.length === 0) {
                return null;
            }
            
            const template = data.content[0];
            
            // Fetch template properties
            const properties = await this.getTemplateProperties(template.id);
            
            return {
                id: template.id,
                name: template.label || 'Unnamed Template',
                description: template.description || '',
                properties
            };
            
        } catch (error) {
            console.error(`Error fetching template for class ${classId}:`, error);
            return null;
        }
    }

    /**
     * Get properties for a template
     */
    async getTemplateProperties(templateId) {
        try {
            const url = `${this.baseURL}/templates/${templateId}`;
            const response = await this.makeRequest('GET', url, null, {
                headers: this.getAuthHeaders()
            });
            
            const data = response.data || response;
            if (!data || !data.properties) {
                return [];
            }
            
            return data.properties.map(prop => ({
                id: prop.path?.id || `prop-${Date.now()}-${Math.random()}`,
                label: prop.path?.label || '',
                description: prop.description || '',
                type: prop.datatype || 'text',
                required: prop.min_count > 0,
                maxCount: prop.max_count,
                minCount: prop.min_count
            }));
            
        } catch (error) {
            console.error(`Error fetching template properties for ${templateId}:`, error);
            return [];
        }
    }

    /**
     * Analyze templates for a problem to find the most common ones
     */
    async analyzeTemplatesForProblem(problemId, options = {}) {
        try {
            const analysis = await this.scanPapersForTemplates(problemId, options);
            
            // Add additional analysis
            const stats = {
                ...analysis,
                averagePropertiesPerTemplate: 0,
                mostCommonTemplate: null,
                templateUsageDistribution: []
            };
            
            if (analysis.templates.length > 0) {
                // Calculate average properties
                const totalProps = analysis.templates.reduce((sum, t) => sum + (t.properties?.length || 0), 0);
                stats.averagePropertiesPerTemplate = Math.round(totalProps / analysis.templates.length);
                
                // Get most common template
                stats.mostCommonTemplate = analysis.templates[0];
                
                // Calculate usage distribution
                stats.templateUsageDistribution = analysis.templates.map(t => ({
                    templateId: t.id,
                    templateName: t.name,
                    paperCount: t.paperCount,
                    percentage: (t.paperCount / analysis.totalPapers * 100).toFixed(1)
                }));
            }
            
            return stats;
            
        } catch (error) {
            console.error('Error analyzing templates for problem:', error);
            return {
                templates: [],
                totalPapers: 0,
                templatesFound: 0,
                timestamp: Date.now(),
                error: error.message
            };
        }
    }
    
    /**
     * Extract problems from ORKG API response
     */
    extractProblemsFromResponse(data) {
        if (!data) return [];
        
        let problems = [];
        
        // Handle different response formats
        if (Array.isArray(data)) {
            problems = data;
        } else if (data.content && Array.isArray(data.content)) {
            problems = data.content;
        } else if (data.data && Array.isArray(data.data)) {
            problems = data.data;
        } else if (data._embedded && data._embedded.resources) {
            problems = data._embedded.resources;
        } else if (data.problems && Array.isArray(data.problems)) {
            problems = data.problems;
        } else if (data.id && data.label) {
            problems = [data];
        } else {
            console.warn('⚠️ Unexpected ORKG response structure:', data);
            return [];
        }
        
        // Normalize all problems
        return problems
            .map(item => this.normalizeProblem(item))
            .filter(p => p !== null);
    }
   
   /**
    * Normalize problem object from ORKG API
    */
   normalizeProblem(item) {
       if (!item) return null;
       
       const problem = item.problem || item;
       
       if (!problem.id && !problem.label) {
           console.warn('Invalid problem object:', item);
           return null;
       }
       
       return {
           id: problem.id || `problem-${Date.now()}-${Math.random()}`,
           label: problem.label || problem.title || 'Untitled Problem',
           description: problem.description || problem.label || '',
           classes: problem.classes || ['Problem'],
           shared: problem.shared || 0,
           papers: item.papers || problem.papers || 0,
           created_at: problem.created_at || problem.created || null,
           created_by: problem.created_by || null,
           featured: problem.featured || false,
           verified: problem.verified || false,
           unlisted: problem.unlisted || false,
           visibility: problem.visibility || 'DEFAULT',
           extraction_method: problem.extraction_method || 'UNKNOWN',
           formatted_label: problem.formatted_label || null,
           observatory_id: problem.observatory_id || null,
           organization_id: problem.organization_id || null,
           metadata: {
               shared: problem.shared || 0,
               featured: problem.featured || false,
               unlisted: problem.unlisted || false,
               verified: problem.verified || false,
               extraction_method: problem.extraction_method || null,
               created_by: problem.created_by || null,
               observatory_id: problem.observatory_id || null,
               organization_id: problem.organization_id || null,
               ...problem.metadata
           }
       };
   }
   
   /**
    * Utility methods
    */
   delay(ms) {
       return new Promise(resolve => setTimeout(resolve, ms));
   }
   
   hashString(str) {
       if (!str) return '0';
       
       let hash = 0;
       for (let i = 0; i < str.length; i++) {
           const char = str.charCodeAt(i);
           hash = ((hash << 5) - hash) + char;
           hash = hash & hash;
       }
       
       return Math.abs(hash).toString(36);
   }
   
   /**
    * Get service statistics
    */
   getStats() {
       return {
           ...this.stats,
           cacheHitRate: this.stats.totalRequests > 0 
               ? (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) + '%'
               : '0%',
           errorRate: this.stats.totalRequests > 0
               ? (this.stats.errors / this.stats.totalRequests * 100).toFixed(2) + '%' 
               : '0%'
       };
   }
   
   /**
    * Health check for ORKG API
    */
   async healthCheck() {
       try {
           const response = await this.makeRequest('GET', `${this.baseURL}/health`, null, {
               timeout: 5000,
               cache: false
           });
           
           return {
               healthy: true,
               response: response.data || response
           };
       } catch (error) {
           return {
               healthy: false,
               error: error.message
           };
       }
   }
   
   /**
    * Get from cache helper method  
    */
   setInCache(key, value, ttl = null) {
       if (!this.dataCache || typeof this.dataCache.set !== 'function') return false;
       const finalTTL = ttl || this.cacheTTL.researchFields || 3600000;
       return this.dataCache.set(key, value, finalTTL);
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
           baseURL: this.baseURL,
           hasAPIService: !!this.apiService,
           hasDataCache: !!this.dataCache,
           endpoints: Object.keys(this.endpoints).length,
           cacheTTL: this.cacheTTL,
           stats: this.getStats()
       };
   }
   
   /**
    * Cleanup
    */
   cleanup() {
       console.log('🧹 ORKGService cleanup...');
       
       this.clearCache();
       this.stats = {
           totalRequests: 0,
           cacheHits: 0,
           cacheMisses: 0,
           errors: 0
       };
       this.isInitialized = false;
       this.apiService = null;
       this.dataCache = null;
       
       console.log('✅ ORKGService cleanup completed');
   }
}

// Export singleton instance for browser extension
if (typeof window !== 'undefined') {
   window.ORKGService = ORKGService;
}

export default ORKGService;
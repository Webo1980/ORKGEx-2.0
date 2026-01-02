// ================================
// src/core/services/ORKGService.js - Enhanced with Paper/Template Methods
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
            orkgConfig = window.orkgConfigData?.orkg || {
                serverUrl: 'https://orkg.org',
                apiUrl: 'https://orkg.org/api',
                nlpServiceUrl: 'https://orkg.org/nlp/api',
                credentials: {
                    clientId: 'orkg-client',
                    clientSecret: 'secret',
                    username: null,
                    password: null
                }
            };
        }
        
        this.config = orkgConfig;
        this.serverUrl = orkgConfig.serverUrl;
        this.baseURL = orkgConfig.apiUrl;
        this.nlpUrl = orkgConfig.nlpServiceUrl;
        
        // Store credentials
        this.credentials = orkgConfig.credentials || {};
        
        console.log("🔬 ORKGService initialized with config:", {
            serverUrl: this.serverUrl,
            baseURL: this.baseURL,
            nlpUrl: this.nlpUrl,
            hasCredentials: !!(this.credentials.username && this.credentials.password)
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
            fieldProblems: (fieldId) => {
                if (fieldId && fieldId.startsWith('R')) {
                    return `/research-fields/${fieldId}/problems`;
                }
                return `/problems?research_field=${encodeURIComponent(fieldId)}`;
            }
        };
        
        this.defaultPageSize = orkgConfig.defaultPageSize || 100;
        this.maxPageSize = orkgConfig.maxPageSize || 500;
        this.cacheTTL = orkgConfig.cacheTTL || {
            researchFields: 3600000,
            fieldProblems: 1800000,
            problems: 1800000,
            papers: 1800000,
            templates: 1800000
        };
        
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
        this.findRelatedResearchField = this.findRelatedResearchField.bind(this); // ADD THIS LINE
        this.enrichFieldsWithORKGInfo = this.enrichFieldsWithORKGInfo.bind(this);
        this.fetchResearchFieldInfo = this.fetchResearchFieldInfo.bind(this);
        this.getFallbackResearchFields = this.getFallbackResearchFields.bind(this); 
        this.getProblemsInField = this.getProblemsInField.bind(this);
        this.searchProblemsForField = this.searchProblemsForField.bind(this);
        this.getStatements = this.getStatements.bind(this);
        this.fetchProblemDescription = this.fetchProblemDescription.bind(this);
        this.fetchSameAsData = this.fetchSameAsData.bind(this);
        this.processProblemComplete = this.processProblemComplete.bind(this);
        this.getAllProblemsInField = this.getAllProblemsInField.bind(this);
        this.searchProblems = this.searchProblems.bind(this);
        
        // Paper and Template methods
        this.findPapersForProblem = this.findPapersForProblem.bind(this);
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
        this.delay = this.delay.bind(this);
        this.hashString = this.hashString.bind(this);
        this.getStats = this.getStats.bind(this);
        this.healthCheck = this.healthCheck.bind(this);
        this.getFromCache = this.getFromCache.bind(this);
        this.setInCache = this.setInCache.bind(this);
        this.isReady = this.isReady.bind(this);
        this.getStatus = this.getStatus.bind(this);
        this.clearCache = this.clearCache.bind(this);
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

        // Initialize authentication
        await this.initAuth();
        
        this.isInitialized = true;
        console.log('✅ ORKGService initialized with:', {
            hasAPIService: !!this.apiService,
            hasDataCache: !!this.dataCache,
            hasAuth: !!this.config.credentials?.username,
            dataCacheHasGet: this.dataCache ? typeof this.dataCache.get === 'function' : false
        });
    }

    /**
     * Initialize authentication
     */
    async initAuth() {
        // Check if we have credentials in config
        if (this.credentials.username && this.credentials.password) {
            console.log('🔐 Initializing ORKG authentication...');
            
            try {
                // Try to get a token to verify credentials
                const token = await this.getAuthToken();
                if (token) {
                    console.log('✅ ORKG authentication initialized successfully');
                }
            } catch (error) {
                console.warn('⚠️ ORKG authentication initialization failed:', error);
                console.warn('Some endpoints may require authentication and will fail');
            }
        } else {
            console.warn('⚠️ No ORKG credentials found in config. Some endpoints may require authentication.');
            console.warn('Please set ORKG_USERNAME and ORKG_PASSWORD environment variables');
        }
    }

    /**
     * Get OAuth2 token using password grant
     */
    async obtainToken() {
        try {
            const tokenUrl = `${this.serverUrl}/oauth/token`;
            
            // Get credentials from config
            const clientId = this.credentials.clientId || 'orkg-client';
            const clientSecret = this.credentials.clientSecret || 'secret';
            const username = this.credentials.username;
            const password = this.credentials.password;
            
            if (!username || !password) {
                console.warn('⚠️ ORKG credentials not found in config');
                return null;
            }
            
            const authString = btoa(`${clientId}:${clientSecret}`);
            const tokenRequestBody = new URLSearchParams({
                'grant_type': 'password',
                'username': username,
                'password': password
            });

            console.log('🔐 Obtaining OAuth2 token...');
            
            // Use fetch directly for token acquisition
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: tokenRequestBody
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to obtain token: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('✅ OAuth2 token obtained successfully');
            
            // Store the token
            this.storeAuthToken(data.access_token, data.expires_in);
            
            return data.access_token;
            
        } catch (error) {
            console.error('❌ Error obtaining OAuth2 token:', error);
            
            // Don't throw for missing credentials, just log warning
            if (error.message.includes('credentials')) {
                console.warn('⚠️ Proceeding without authentication - some endpoints may fail');
                return null;
            }
            
            throw error;
        }
    }

    /**
     * Store authentication token with expiration
     */
    storeAuthToken(token, expiresIn = 3600) {
        // Store in memory
        this.authToken = token;
        this.tokenExpiry = Date.now() + (expiresIn * 1000);
        
        // Also store in localStorage for persistence
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('orkg_api_token', token);
            localStorage.setItem('orkg_token_expiry', this.tokenExpiry.toString());
        }
        
        console.log('🔐 Authentication token stored');
    }

    /**
     * Get current auth token, refreshing if needed
     */
    async getAuthToken() {
        // Check if we have a valid token in memory
        if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
            return this.authToken; // Token is still valid (with 1 minute buffer)
        }
        
        // Check localStorage for persisted token
        if (typeof localStorage !== 'undefined') {
            const storedToken = localStorage.getItem('orkg_api_token');
            const storedExpiry = localStorage.getItem('orkg_token_expiry');
            
            if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry) - 60000) {
                this.authToken = storedToken;
                this.tokenExpiry = parseInt(storedExpiry);
                return storedToken;
            }
        }
        
        // No valid token, obtain a new one
        return await this.obtainToken();
    }


    /**
     * Get headers for requests - specialized for different ORKG endpoints
     */
    getHeaders(endpointType = 'default') {
        const baseHeaders = {
            'User-Agent': 'ORKG-Annotator/2.0'
        };
        
        // Different endpoints might require different Accept headers
        switch (endpointType) {
            case 'papers':
            case 'templates':
                return {
                    ...baseHeaders,
                    'Accept': '*/*' // 👈 force like browser
                };
            
            case 'resources':
                // These endpoints might prefer specific content types
                return {
                    ...baseHeaders,
                    'Accept': 'application/ld+json, application/json'
                };
            
            case 'auth':
                // Auth endpoints have different requirements
                return {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                };
            
            default:
                // Default for most endpoints
                return {
                    ...baseHeaders,
                    'Accept': 'application/ld+json, application/json'
                };
        }
    }

    /**
     * Get auth headers for ORKG API requests
     */
    async getAuthHeaders(endpointType = 'default') {
        const baseHeaders = this.getHeaders(endpointType);
        
        try {
            const token = await this.getAuthToken();
            if (token) {
                return {
                    ...baseHeaders,
                    'Authorization': `Bearer ${token}`
                };
            }
        } catch (error) {
            console.warn('⚠️ Failed to get auth token, proceeding without authentication');
        }
        
        return baseHeaders;
    }

    /**
     * Make HTTP request - fallback to HttpClient if APIService not available
     */
    async makeRequest(method, url, data = null, options = {}) {
        try {
            // Determine endpoint type based on URL
            let endpointType = 'default';
            if (url.includes('/papers/')) {
                endpointType = 'papers';
            } else if (url.includes('/resources/')) {
                endpointType = 'resources';
            } else if (url.includes('/templates/')) {
                endpointType = 'templates';
            } else if (url.includes('/oauth/')) {
                endpointType = 'auth';
            }
            
            // Get appropriate headers
            let headers;
            if (endpointType === 'auth') {
                headers = this.getHeaders('auth');
            } else {
                headers = await this.getAuthHeaders(endpointType);
            }
            
            const finalOptions = {
                ...options,
                headers: {
                    ...headers,
                    ...options.headers
                }
            };
            
            console.log('🔬 Making ORKG request:', method, url, 'endpoint type:', endpointType);
            
            // Check if APIService has the required methods
            const hasApiServiceMethods = this.apiService && 
                typeof this.apiService.get === 'function' &&
                typeof this.apiService.post === 'function';
            
            let response;
            
            if (hasApiServiceMethods) {
                switch (method.toUpperCase()) {
                    case 'GET':
                        response = await this.apiService.get(url, finalOptions);
                        break;
                    case 'POST':
                        response = await this.apiService.post(url, data, finalOptions);
                        break;
                    case 'PUT':
                        response = await this.apiService.put(url, data, finalOptions);
                        break;
                    case 'DELETE':
                        response = await this.apiService.delete(url, finalOptions);
                        break;
                    default:
                        response = await this.apiService.request({ ...finalOptions, method, url, body: data });
                }
            } else {
                // Fallback to direct HttpClient usage
                console.log('🔬 Using HttpClient directly for:', url);
                const httpResponse = await HttpClient.makeRequest(url, {
                    method,
                    body: data,
                    timeout: finalOptions.timeout || 30000,
                    headers: finalOptions.headers,
                    ...finalOptions
                });
                
                response = {
                    data: httpResponse,
                    status: 200,
                    cached: false
                };
            }
            
            return response;
            
        } catch (error) {
            console.error('❌ ORKG request failed:', error);
            
            // Handle authentication errors (401, 403)
            if (error.status === 401 || error.status === 403) {
                console.log('🔄 Authentication failed, trying to refresh token...');
                
                // Clear invalid token
                this.authToken = null;
                this.tokenExpiry = null;
                if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('orkg_api_token');
                    localStorage.removeItem('orkg_token_expiry');
                }
                
                // Retry the request with a fresh token
                try {
                    const retryHeaders = await this.getAuthHeaders();
                    const retryOptions = {
                        ...options,
                        headers: {
                            ...retryHeaders,
                            ...options.headers
                        }
                    };
                    
                    return await this.makeRequest(method, url, data, retryOptions);
                } catch (retryError) {
                    console.error('❌ Retry with fresh token also failed:', retryError);
                }
            }
            
            throw error;
        }
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
            console.error('❌ ORKG Service: NLP service error:', error);
            console.log('⚠️ Using fallback research fields due to NLP service failure');
            
            // Return fallback data in the same format as NLP service would
            //const fallbackFields = this.getFallbackResearchFields();
            
            // Format the fallback data to match NLP service response structure
            return {
                payload: {
                    annotations: fallbackFields.map((field, index) => ({
                        research_field: field.label,
                        score: 1.0 - (index * 0.1), // Simulate decreasing confidence scores
                        id: field.id,
                        description: field.description
                    }))
                },
                status: 'fallback',
                message: 'Using fallback fields due to NLP service unavailability'
            };
        }
    }

    getFallbackResearchFields() {
        return [
            { 
                id: 'R112118', 
                label: 'Computer Vision and Pattern Recognition', 
                description: 'The field focused on enabling computers to gain high-level understanding from digital images or videos, and to identify and recognize patterns.',
                score: 0.9
            },
            { 
                id: 'R136139', 
                label: 'Radiology, Nuclear Medicine, Radiotherapy, Radiobiology', 
                description: 'The medical specialty that uses medical imaging to diagnose and treat diseases within the bodies of humans and animals.',
                score: 0.85
            },
            { 
                id: 'R112125', 
                label: 'Machine Learning', 
                description: 'The study of algorithms and statistical models that computer systems use to perform tasks without explicit instructions, often by recognizing patterns in data.',
                score: 0.8
            },
            { 
                id: 'R136131', 
                label: 'Medical Microbiology and Mycology, Hygiene, Molecular Infection Biology', 
                description: 'The study of microorganisms and their role in human health and disease, including virology and infectious disease diagnosis.',
                score: 0.75
            },
            { 
                id: 'R208', 
                label: 'Bioimaging and biomedical optics', 
                description: 'The development and application of imaging technologies for the acquisition of structural and functional information in biological and medical systems.',
                score: 0.7
            }
        ];
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
            
            // Fetch statements for the problem
            const url = `${this.baseURL}/statements?object=${problemId}`;
            console.log(`📋 Fetching statements for problem: ${url}`);
            
            const response = await this.makeRequest('GET', url);
            const statements = response.content || response.data?.content || response || [];
            console.log(`📋 Found ${statements.length} statements for problem`);
            
            // Extract unique paper IDs from subjects that have Paper class
            const papers = new Set();
            const seenIds = new Set();
            
            for (const statement of statements) {
                const subject = statement.subject || {};
                const subjectId = subject.id;
                const subjectClasses = subject.classes || [];
                
                // Check if this subject is a Paper and we haven't seen it yet
                if (subjectId && subjectClasses.includes('Paper') && !seenIds.has(subjectId)) {
                    papers.add({
                        id: subjectId,
                        label: subject.label || '',
                        created_at: subject.created_at || ''
                    });
                    seenIds.add(subjectId);
                }
                
                // Also check objects that might be Papers
                const obj = statement.object || {};
                if (obj._class === 'resource') {
                    const objId = obj.id;
                    const objClasses = obj.classes || [];
                    
                    if (objId && objClasses.includes('Paper') && !seenIds.has(objId)) {
                        papers.add({
                            id: objId,
                            label: obj.label || '',
                            created_at: obj.created_at || ''
                        });
                        seenIds.add(objId);
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
            
            // Convert to array and sort by created_at
            let papersArray = Array.from(papers);
            papersArray = papersArray.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at);
            }).slice(0, maxPapers);
            
            // Process papers to get templates
            const batchSize = 3;
            const formattedPapers = [];
            
            for (let i = 0; i < papersArray.length; i += batchSize) {
                const batch = papersArray.slice(i, i + batchSize);
                const tasks = [];
                
                for (const paper of batch) {
                    if (paper.id) {
                        tasks.push(this.processPaper(paper.id, paper.label));
                    }
                }
                
                if (tasks.length > 0) {
                    const batchResults = await Promise.allSettled(tasks);
                    for (const result of batchResults) {
                        if (result.status === 'fulfilled' && result.value) {
                            formattedPapers.push(result.value);
                        }
                    }
                }
            }
            
            // Cache the results
            if (this.dataCache && formattedPapers.length > 0) {
                this.dataCache.set(cacheKey, formattedPapers, this.cacheTTL.papers);
            }
            
            console.log(`📋 Extracted ${formattedPapers.length} unique papers with templates`);
            return formattedPapers;
            
        } catch (error) {
            console.error('Error finding papers for problem:', error);
            this.stats.errors++;
            return [];
        }
    }

    /**
     * Process a single paper to get template information
     */
    async processPaper(paperId, title) {
        try {
            const template = await this.getTemplateFromPaper(paperId);
            return template ? {
                id: paperId,
                title: title,
                template: template
            } : null;
        } catch (error) {
            console.error(`Error processing paper ${paperId}:`, error);
            return null;
        }
    }

    /**
     * Get template from a paper
     */
    async getTemplateFromPaper(paperId) {
        try {
            const paperUrl = `${this.baseURL}/papers/${paperId}`;
            const response = await this.makeRequest('GET', paperUrl, null, {
                headers: await this.getAuthHeaders('papers') // 👈 await + endpoint type
            });
            console.log(`📋 Fetching template for paper ${paperId} from ${paperUrl}`);
            const paperData = response.data || response;
            
            if (!paperData.contributions || paperData.contributions.length === 0) {
                return null;
            }
            
            // Process contributions sequentially
            for (const contribution of paperData.contributions) {
                const template = await this.getTemplateFromContribution(contribution.id);
                if (template) {
                    return template;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error(`Error fetching template for paper ${paperId}:`, error);
            return null;
        }
    }

    /**
     * Get paper from a contribution ID
     * @param {string} contributionId - The contribution ID
     * @returns {Promise<Object|null>} Paper object or null
     
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
    }*/

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
            
            // Get papers with templates
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
            
            // Extract templates from papers
            const templateMap = new Map();
            const papersWithTemplates = [];
            
            for (const paper of papers) {
                if (paper.template) {
                    papersWithTemplates.push({
                        paperId: paper.id,
                        paperTitle: paper.title,
                        templateId: paper.template.id,
                        templateName: paper.template.name
                    });
                    
                    if (!templateMap.has(paper.template.id)) {
                        templateMap.set(paper.template.id, {
                            template: paper.template,
                            papers: [],
                            count: 0
                        });
                    }
                    
                    const entry = templateMap.get(paper.template.id);
                    entry.papers.push({
                        id: paper.id,
                        title: paper.title
                    });
                    entry.count++;
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
            
            const result = {
                templates,
                papersWithTemplates,
                totalPapers: papers.length,
                templatesFound: templates.length,
                timestamp: Date.now()
            };
            
            // Cache the results
            if (this.dataCache && result.templatesFound > 0) {
                this.dataCache.set(cacheKey, result, this.cacheTTL.templates);
            }
            
            return result;
            
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
                headers: await this.getAuthHeaders("templates")
            });
            
            const data = response.data || response;
            if (!data || !data.content || data.content.length === 0) {
                return null;
            }
            
            const template = data.content[0];
            const properties = await this.getTemplateProperties(template.id);
            
            return {
                id: template.id,
                name: template.label || 'Unnamed Template',
                description: template.description || '',
                properties: properties
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
                headers: this.getAuthHeaders("templates")
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
    getFromCache(key) {
        if (!this.dataCache || typeof this.dataCache.get !== 'function') return null;
        return this.dataCache.get(key);
    }

    /**
     * Set in cache helper method  
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
     * Clear cache
     */
    clearCache() {
        if (this.dataCache) {
            this.dataCache.clearByPrefix('orkg_');
            this.dataCache.clearByPrefix('field_info_');
            this.dataCache.clearByPrefix('papers_');
            this.dataCache.clearByPrefix('templates_');
            console.log('🗑️ ORKG cache cleared');
        }
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

export default ORKGService;
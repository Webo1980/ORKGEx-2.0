// ================================
// src/config/config.js - Complete Configuration with All Methods
// ================================

class Config {
    constructor() {
        // Initialize with environment variables or defaults
        this.defaults = this.initializeDefaults();
        
        this.storage = typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.local : null;
        this.cache = new Map();
        
        // Load saved configuration immediately (synchronously where possible)
        this.loadSavedConfigSync();
    }
    
    initializeDefaults() {
        return {
            // OpenAI Configuration
            openai: {
                apiKey: this.getEnvVariable('OPENAI_API_KEY', ''),
                model: this.getEnvVariable('OPENAI_MODEL', 'gpt-4o-mini'),
                visionModel: this.getEnvVariable('OPENAI_VISION_MODEL', 'gpt-4o'), // NEW
                embeddingModel: this.getEnvVariable('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'), // NEW
                temperature: parseFloat(this.getEnvVariable('OPENAI_TEMPERATURE', '0.7')),
                maxTokens: parseInt(this.getEnvVariable('OPENAI_MAX_TOKENS', '2000')),
                timeout: parseInt(this.getEnvVariable('OPENAI_TIMEOUT', '30000')),
                baseURL: this.getEnvVariable('OPENAI_BASE_URL', 'https://api.openai.com/v1')
            },
            
            // ORKG Configuration
            orkg: {
                serverUrl: this.getEnvVariable('ORKG_SERVER_URL', 'https://orkg.org'),
                apiUrl: this.getEnvVariable('ORKG_API_URL', 'https://orkg.org/api'),
                nlpServiceUrl: this.getEnvVariable('ORKG_NLP_SERVICE_URL', 'https://orkg.org/nlp/api'),
                credentials: {
                    clientId: this.getEnvVariable('ORKG_CLIENT_ID', 'orkg-client'),
                    clientSecret: this.getEnvVariable('ORKG_CLIENT_SECRET', 'secret'),
                    username: this.getEnvVariable('ORKG_USERNAME', ''),
                    password: this.getEnvVariable('ORKG_PASSWORD', '')
                },
                timeout: parseInt(this.getEnvVariable('ORKG_TIMEOUT', '10000')),
                similarityThreshold: parseFloat(this.getEnvVariable('ORKG_SIMILARITY_THRESHOLD', '0.5')),
                chunkSize: parseInt(this.getEnvVariable('ORKG_CHUNK_SIZE', '20')),
                endpoints: {
                    researchFields: '/research-fields',
                    problems: '/problems',
                    fieldProblems: (fieldId) => `/research-fields/${fieldId}/problems`,
                    templates: '/templates',
                    contributions: '/contributions',
                    papers: '/papers',
                    resources: '/resources',
                    predicates: '/predicates',
                    classes: '/classes',
                    statements: '/statements'
                },
                defaultPageSize: 100,
                maxPageSize: 500,
                cacheTTL: {
                    researchFields: 3600000,    // 1 hour
                    problems: 1800000,          // 30 minutes
                    fieldProblems: 900000,      // 15 minutes
                    templates: 1800000,         // 30 minutes
                    staticData: 7200000,        // 2 hours
                    papers: 3600000,            // 1 hour
                    resources: 1800000          // 30 minutes
                }
            },
            
            // External API Configuration
            externalApis: {
                semanticScholar: {
                    baseUrl: this.getEnvVariable('SEMANTIC_SCHOLAR_BASE_URL', 'https://api.semanticscholar.org/graph/v1'),
                    apiKey: this.getEnvVariable('SEMANTIC_SCHOLAR_API_KEY', ''),
                    timeout: parseInt(this.getEnvVariable('SEMANTIC_SCHOLAR_TIMEOUT', '10000')),
                    rateLimit: 1,
                    rateLimitWindow: 1000,
                    retryAttempts: 2,
                    retryDelay: 1000,
                    endpoints: {
                        search: { rateLimit: 1, rateLimitWindow: 1000 },
                        batch: { rateLimit: 1, rateLimitWindow: 1000 },
                        recommendations: { rateLimit: 1, rateLimitWindow: 1000 },
                        other: { rateLimit: 10, rateLimitWindow: 1000 }
                    }
                },
                crossRef: {
                    baseUrl: this.getEnvVariable('CROSSREF_BASE_URL', 'https://api.crossref.org/works'),
                    timeout: parseInt(this.getEnvVariable('CROSSREF_TIMEOUT', '10000')),
                    rateLimit: 50,
                    retryAttempts: 3,
                    retryDelay: 1000,
                    userAgent: 'ORKG-Annotator/2.0 (mailto:orkg@tib.eu)'
                },
                arxiv: {
                    baseUrl: this.getEnvVariable('ARXIV_BASE_URL', 'http://export.arxiv.org/api/query'),
                    timeout: parseInt(this.getEnvVariable('ARXIV_TIMEOUT', '15000')),
                    maxResults: 5
                }
            },
            
            // Paper Validation Configuration
            paperValidation: {
                minTitleLength: 10,
                minAbstractLength: 100,
                minContentLength: 500,
                minSectionCount: 3,
                requiredSections: {
                    introduction: ['introduction', 'intro', 'background'],
                    conclusion: ['conclusion', 'conclusions', 'summary', 'discussion'],
                    methodology: ['method', 'methodology', 'approach', 'methods'],
                    results: ['results', 'findings', 'experiments']
                },
                contentSelectors: [
                    'article', 'main', '.content', '.paper-content', 
                    '.article-content', '.main-content', '#main',
                    '.paper', '.document', '.manuscript'
                ],
                sectionSelectors: [
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    '.section-title', '.section-heading',
                    '[role="heading"]', '.heading'
                ],
                abstractSelectors: [
                    '.abstract', '#abstract', '.summary',
                    '[class*="abstract"]', '[id*="abstract"]',
                    '.c-article-section[data-title="Abstract"]',
                    '.abstract-content', '.abstract-text'
                ],
                doiPatterns: [
                    /(?:doi:?\s*)?10\.\d{4,}(?:\.\d+)*\/[^\s<>"'\)]+/gi,
                    /https?:\/\/(?:dx\.)?doi\.org\/10\.\d{4,}(?:\.\d+)*\/[^\s<>"'\)]+/gi
                ],
                pdfIndicators: [
                    'application/pdf', '.pdf', 'pdf',
                    'content-type: application/pdf'
                ],
                loginIndicators: [
                    'login', 'sign in', 'access denied', 'subscription required',
                    'purchase', 'paywall', 'register', 'create account',
                    'institutional access', 'member access'
                ],
                academicIndicators: [
                    'abstract', 'introduction', 'methodology', 'results',
                    'conclusion', 'references', 'bibliography', 'citation',
                    'doi', 'arxiv', 'journal', 'conference', 'proceedings'
                ],
                qualityThresholds: {
                    excellent: { score: 90, color: '#22c55e' },
                    good: { score: 70, color: '#3b82f6' },
                    fair: { score: 50, color: '#f59e0b' },
                    poor: { score: 30, color: '#ef4444' },
                    failed: { score: 0, color: '#6b7280' }
                }
            },
            
            // Metadata Extraction Configuration
            metadataExtraction: {
                sourcePriority: ['doi_api', 'semantic_scholar', 'crossref', 'arxiv', 'dom_extraction'],
                searchStrategies: {
                    title: {
                        enabled: true,
                        minLength: 15,
                        maxLength: 80,
                        cleaningRules: [
                            /\s*\|\s*.*$/g,
                            /\s*-\s*.*Journal.*$/i,
                            /\s*:\s*Full\s*Text\s*$/i,
                            /\s*\[\s*.*\]\s*$/g,
                            /\s*\(\s*PDF\s*\)\s*$/i
                        ]
                    },
                    doi: {
                        enabled: true,
                        validation: true,
                        apiLookup: true
                    },
                    authors: {
                        enabled: true,
                        minCount: 1,
                        maxDisplay: 5
                    }
                },
                domExtraction: {
                    metaSelectors: {
                        title: ['citation_title', 'dc.title', 'og:title', 'twitter:title'],
                        authors: ['citation_author', 'dc.creator', 'author'],
                        abstract: ['citation_abstract', 'dc.description', 'description', 'og:description'],
                        doi: ['citation_doi', 'dc.identifier.doi', 'doi', 'DC.identifier'],
                        journal: ['citation_journal_title', 'dc.source', 'citation_conference_title'],
                        year: ['citation_publication_date', 'dc.date', 'citation_date'],
                        publisher: ['citation_publisher', 'dc.publisher']
                    },
                    contentSelectors: {
                        title: [
                            'h1.article-title', 'h1.paper-title', 'h1.title',
                            '.article-title h1', '.paper-title h1',
                            'h1', '[role="heading"][aria-level="1"]'
                        ],
                        authors: [
                            '.author-list .author', '.authors .author',
                            '.author-name', '.contributor',
                            '.byline .author', '.paper-authors .author'
                        ],
                        abstract: [
                            '.abstract .content', '.abstract-text',
                            '.summary .content', '.description'
                        ]
                    }
                }
            },
            
            // Research Problem Processing Configuration
            problemProcessing: {
                huggingfaceApiKey: this.getEnvVariable('HUGGINGFACE_API_KEY', ''),
                embeddingModel: this.getEnvVariable('HUGGINGFACE_MODEL_NAME', ''),
                maxBatchSize: 10,
                useMockIfNoKey: true, // Falls back to mock if no key
                enableParallelProcessing: true,
                maxWorkers: Math.min(navigator?.hardwareConcurrency || 4, 8),
                batchSize: 100,
                processingTimeout: 60000,
                embeddingMethod: 'advanced_similarity',
                similarityThreshold: 0.5,
                dynamicThresholdAdjustment: true,
                enableResultCaching: true,
                cacheTimeout: 3600000,
                maxCachedFields: 10,
                enableProgressReporting: true,
                enableDetailedLogging: false,
                progressUpdateInterval: 100,
                enableFieldComparison: true,
                showComparisonStatistics: true,
                autoSelectBetterField: false
            },
            
            // Template Configuration
            templates: {
                maxTemplatesPerBatch: 10,
                maxPapersToAnalyze: 50,
                templateConfidenceThreshold: 0.3,
                llmFallbackEnabled: true,
                enableTemplateEditing: true,
                enableTemplateImport: true,
                enableTemplateExport: true,
                defaultTemplateType: 'text',
                maxPropertiesPerTemplate: 20,
                minPropertiesPerTemplate: 5
            },
            
            // Extension Settings
            extension: {
                debugMode: this.getEnvVariable('DEBUG_MODE', 'false') === 'true',
                maxCacheSize: 100,
                cacheTTL: 300000,
                theme: 'auto',
                language: 'en',
                features: {
                    aiGeneration: true,
                    embeddingAnalysis: true,
                    offlineMode: true,
                    autoSave: true
                }
            },
            
            // UI Configuration
            ui: {
                theme: 'auto',
                animationDuration: 300,
                autoTransitionDelay: 20000,
                showTooltips: true,
                enableKeyboardNavigation: true,
                compactMode: false,
                showWorkerStatus: true,
                showRealTimeUpdates: true,
                enableFieldComparison: true,
                maxRealTimeUpdates: 10,
                validationDisplay: {
                    showDetailedResults: true,
                    showQualityScore: true,
                    showRecommendations: true,
                    animateProgress: true,
                    collapsePassedChecks: false
                }
            },
            
            // Cache Settings
            cache: {
                ttl: 3600000,
                maxSize: 100,
                enabled: true,
                clearOnStartup: false,
                validationCache: {
                    enabled: true,
                    ttl: 1800000,
                    maxEntries: 50
                }
            },
            
            // Performance Settings
            performance: {
                enableLazyLoading: true,
                enableVirtualization: false,
                batchSize: 100,
                requestTimeout: 30000,
                maxConcurrentRequests: 5,
                enableParallelWorkers: true,
                workerPoolSize: Math.min(navigator?.hardwareConcurrency || 4, 8),
                workerTimeout: 60000,
                enableWorkerReuse: true,
                memoryThreshold: 100,
                cpuThreshold: 80
            },
            
            // Debug Settings
            debug: {
                enabled: this.getEnvVariable('DEBUG_MODE', 'false') === 'true',
                logLevel: this.getEnvVariable('LOG_LEVEL', 'info'),
                showPerformanceMetrics: false,
                enableConsoleLogging: true,
                logWorkerActivity: false,
                logProcessingStats: false,
                exportProcessingData: false,
                validationDebug: {
                    logDOMScanning: false,
                    logAPIRequests: true,
                    logValidationResults: true,
                    exportValidationData: false
                }
            }
        };
    }
    
    /**
     * Get environment variable with fallback
     */
    getEnvVariable(key, defaultValue = '') {
        // 1. Check window.__ENV__ (auto-generated from build script)
        if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
            return window.__ENV__[key];
        }
        
        // 2. Check localStorage for user-set values (overrides)
        try {
            const stored = localStorage.getItem(`env_${key}`);
            if (stored !== null) {
                return stored;
            }
        } catch (error) {
            // localStorage might not be available
        }
        
        // 3. Return default value
        return defaultValue;
    }
    
    /**
     * Load saved configuration synchronously from localStorage
     */
    loadSavedConfigSync() {
        try {
            // Load API keys
            const openaiKey = localStorage.getItem('orkg_openai_api_key');
            if (openaiKey) {
                this.defaults.openai.apiKey = openaiKey;
            }
            
            const semanticScholarKey = localStorage.getItem('orkg_semantic_scholar_api_key');
            if (semanticScholarKey) {
                this.defaults.externalApis.semanticScholar.apiKey = semanticScholarKey;
            }
            
            // Load ORKG credentials if stored separately
            const orkgUsername = localStorage.getItem('orkg_username');
            const orkgPassword = localStorage.getItem('orkg_password');
            if (orkgUsername) {
                this.defaults.orkg.credentials.username = orkgUsername;
            }
            if (orkgPassword) {
                this.defaults.orkg.credentials.password = orkgPassword;
            }
            
            // Load other config
            const savedConfig = localStorage.getItem('orkg_config');
            if (savedConfig) {
                const parsed = JSON.parse(savedConfig);
                this.mergeConfig(parsed);
            }
        } catch (error) {
            console.warn('Could not load from localStorage:', error);
        }
    }
    
    /**
     * Async load method for compatibility
     */
    async load() {
        try {
            let result = {};
            
            if (this.storage) {
                result = await this.storage.get(null);
            } else {
                // Fallback to localStorage
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('orkg_config_')) {
                        const configKey = key.replace('orkg_config_', '');
                        try {
                            result[configKey] = JSON.parse(localStorage.getItem(key));
                        } catch (e) {
                            result[configKey] = localStorage.getItem(key);
                        }
                    }
                }
            }
            
            const config = this.mergeWithDefaults(result);
            
            Object.entries(config).forEach(([key, value]) => {
                this.cache.set(key, value);
            });
            
            return config;
        } catch (error) {
            console.error('Config load error:', error);
            return this.defaults;
        }
    }
    
    /**
     * Merge with defaults
     */
    mergeWithDefaults(userConfig) {
        const config = { ...this.defaults };
        
        Object.keys(userConfig).forEach(key => {
            if (userConfig[key] && typeof userConfig[key] === 'object' && !Array.isArray(userConfig[key])) {
                config[key] = { ...config[key], ...userConfig[key] };
            } else {
                config[key] = userConfig[key];
            }
        });
        
        return config;
    }
    
    /**
     * Merge configuration objects
     */
    mergeConfig(source) {
        this.defaults = this.deepMerge(this.defaults, source);
    }
    
    /**
     * Deep merge helper
     */
    deepMerge(target, source) {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }
        
        return output;
    }
    
    /**
     * Check if value is object
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
    
    /**
     * Get default value
     */
    getDefault(key) {
        const keys = key.split('.');
        let value = this.defaults;
        
        for (const k of keys) {
            value = value[k];
            if (value === undefined) break;
        }
        
        return value;
    }
    
    /**
     * Get configuration value by path (async for compatibility)
     */
    async get(key) {
        try {
            if (this.cache.has(key)) {
                return this.cache.get(key);
            }
            
            if (this.storage) {
                const result = await this.storage.get(key);
                const value = result[key] !== undefined ? result[key] : this.getDefault(key);
                this.cache.set(key, value);
                return value;
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem(`orkg_config_${key}`);
                const value = stored ? JSON.parse(stored) : this.getDefault(key);
                this.cache.set(key, value);
                return value;
            }
        } catch (error) {
            console.error('Config get error:', error);
            return this.getDefault(key);
        }
    }
    
    /**
     * Set configuration value (async)
     */
    async set(key, value) {
        try {
            const validatedValue = this.validateValue(key, value);
            
            if (this.storage) {
                await this.storage.set({ [key]: validatedValue });
            } else {
                // Fallback to localStorage
                localStorage.setItem(`orkg_config_${key}`, JSON.stringify(validatedValue));
            }
            
            this.cache.set(key, validatedValue);
            this.emitChangeEvent(key, validatedValue);
            
            return true;
        } catch (error) {
            console.error('Config set error:', error);
            return false;
        }
    }
    
    /**
     * Get nested value (async)
     */
    async getNestedValue(path) {
        const keys = path.split('.');
        let value = await this.load();
        
        for (const key of keys) {
            value = value[key];
            if (value === undefined) {
                return this.getDefault(path);
            }
        }
        
        return value;
    }
    
    /**
     * Set nested value (async)
     */
    async setNestedValue(path, value) {
        const keys = path.split('.');
        const config = await this.load();
        
        let current = config;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
        
        if (this.storage) {
            await this.storage.set(config);
        } else {
            // Save each top-level key to localStorage
            Object.keys(config).forEach(key => {
                localStorage.setItem(`orkg_config_${key}`, JSON.stringify(config[key]));
            });
        }
        
        this.cache.clear();
        
        return true;
    }
    
    /**
     * Validate configuration value
     */
    validateValue(key, value) {
        // Add validation logic for specific keys
        if (key === 'paperValidation') {
            return this.validatePaperValidationConfig(value);
        }
        
        if (key === 'metadataExtraction') {
            return this.validateMetadataExtractionConfig(value);
        }
        
        if (key === 'externalApis') {
            return this.validateExternalApisConfig(value);
        }
        
        if (key === 'orkg' && value.credentials) {
            return this.validateORKGCredentials(value);
        }
        
        return value;
    }
    
    /**
     * Validate ORKG credentials
     */
    validateORKGCredentials(config) {
        const validated = { ...config };
        
        if (validated.credentials) {
            // Basic validation for credentials
            if (validated.credentials.username && typeof validated.credentials.username !== 'string') {
                validated.credentials.username = '';
            }
            
            if (validated.credentials.password && typeof validated.credentials.password !== 'string') {
                validated.credentials.password = '';
            }
            
            // Ensure clientId and clientSecret have defaults
            if (!validated.credentials.clientId) {
                validated.credentials.clientId = 'orkg-client';
            }
            
            if (!validated.credentials.clientSecret) {
                validated.credentials.clientSecret = 'secret';
            }
        }
        
        return validated;
    }
    
    /**
     * Validate paper validation config
     */
    validatePaperValidationConfig(config) {
        const validated = { ...config };
        
        if (validated.minTitleLength !== undefined) {
            validated.minTitleLength = Math.max(5, Math.min(100, validated.minTitleLength));
        }
        
        if (validated.minAbstractLength !== undefined) {
            validated.minAbstractLength = Math.max(50, Math.min(1000, validated.minAbstractLength));
        }
        
        if (validated.minContentLength !== undefined) {
            validated.minContentLength = Math.max(100, Math.min(10000, validated.minContentLength));
        }
        
        if (validated.minSectionCount !== undefined) {
            validated.minSectionCount = Math.max(2, Math.min(20, validated.minSectionCount));
        }
        
        return validated;
    }
    
    /**
     * Validate metadata extraction config
     */
    validateMetadataExtractionConfig(config) {
        const validated = { ...config };
        
        if (validated.sourcePriority && Array.isArray(validated.sourcePriority)) {
            const validSources = ['doi_api', 'semantic_scholar', 'crossref', 'arxiv', 'dom_extraction'];
            validated.sourcePriority = validated.sourcePriority.filter(source => validSources.includes(source));
        }
        
        return validated;
    }
    
    /**
     * Validate external APIs config
     */
    validateExternalApisConfig(config) {
        const validated = { ...config };
        
        Object.keys(validated).forEach(apiKey => {
            if (validated[apiKey].timeout !== undefined) {
                validated[apiKey].timeout = Math.max(5000, Math.min(60000, validated[apiKey].timeout));
            }
            
            if (validated[apiKey].rateLimit !== undefined) {
                validated[apiKey].rateLimit = Math.max(1, Math.min(1000, validated[apiKey].rateLimit));
            }
            
            if (apiKey === 'semanticScholar' && validated[apiKey].apiKey) {
                if (typeof validated[apiKey].apiKey !== 'string' || validated[apiKey].apiKey.trim().length === 0) {
                    console.warn('⚠️ Invalid Semantic Scholar API key format');
                    validated[apiKey].apiKey = '';
                }
            }
        });
        
        return validated;
    }
    
    /**
     * Emit change event
     */
    emitChangeEvent(key, value) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('configChange', {
                detail: { key, value }
            });
            window.dispatchEvent(event);
        }
    }
    
    /**
     * Configuration getter methods (async)
     */
    async getPaperValidationConfig() {
        return await this.get('paperValidation') || this.defaults.paperValidation;
    }
    
    async getMetadataExtractionConfig() {
        return await this.get('metadataExtraction') || this.defaults.metadataExtraction;
    }
    
    async getExternalApisConfig() {
        return await this.get('externalApis') || this.defaults.externalApis;
    }
    
    async getORKGConfig() {
        return await this.get('orkg') || this.defaults.orkg;
    }
    
    /**
     * Save configuration
     */
    async saveConfig() {
        try {
            // Don't save sensitive data in the main config
            const configToSave = { ...this.defaults };
            delete configToSave.openai.apiKey;
            delete configToSave.externalApis.semanticScholar.apiKey;
            delete configToSave.orkg.credentials.password; // Don't save password in main config
            
            if (this.storage) {
                await this.storage.set({ orkg_config: configToSave });
            } else {
                localStorage.setItem('orkg_config', JSON.stringify(configToSave));
            }
        } catch (error) {
            console.warn('Could not save config:', error);
        }
    }
    
    /**
     * Set OpenAI API key
     */
    async setOpenAIKey(apiKey) {
        if (apiKey) {
            this.defaults.openai.apiKey = apiKey;
            try {
                if (this.storage) {
                    await this.storage.set({ orkg_openai_api_key: apiKey });
                } else {
                    localStorage.setItem('orkg_openai_api_key', apiKey);
                }
                console.log('✅ OpenAI API key saved');
            } catch (error) {
                console.warn('Could not save API key:', error);
            }
        }
    }
    
    /**
     * Get OpenAI API key
     */
    getOpenAIKey() {
        return this.defaults.openai.apiKey;
    }
    
    /**
     * Set Semantic Scholar API key
     */
    async setSemanticScholarApiKey(apiKey) {
        if (apiKey) {
            this.defaults.externalApis.semanticScholar.apiKey = apiKey;
            try {
                if (this.storage) {
                    await this.storage.set({ orkg_semantic_scholar_api_key: apiKey });
                } else {
                    localStorage.setItem('orkg_semantic_scholar_api_key', apiKey);
                }
                console.log('✅ Semantic Scholar API key saved');
                return true;
            } catch (error) {
                console.warn('Could not save API key:', error);
                return false;
            }
        }
        return false;
    }
    
    /**
     * Get Semantic Scholar API key
     */
    async getSemanticScholarApiKey() {
        return this.defaults.externalApis.semanticScholar.apiKey;
    }
    
    /**
     * Set ORKG credentials
     */
    async setORKGCredentials(username, password) {
        if (username && password) {
            this.defaults.orkg.credentials.username = username;
            this.defaults.orkg.credentials.password = password;
            
            try {
                if (this.storage) {
                    await this.storage.set({ 
                        orkg_username: username,
                        orkg_password: password 
                    });
                } else {
                    localStorage.setItem('orkg_username', username);
                    localStorage.setItem('orkg_password', password);
                }
                console.log('✅ ORKG credentials saved');
                return true;
            } catch (error) {
                console.warn('Could not save ORKG credentials:', error);
                return false;
            }
        }
        return false;
    }
    
    /**
     * Get ORKG credentials
     */
    getORKGCredentials() {
        return { ...this.defaults.orkg.credentials };
    }
    
    /**
     * Check if ORKG credentials are configured
     */
    isORKGConfigured() {
        return !!(this.defaults.orkg.credentials.username && 
                 this.defaults.orkg.credentials.password);
    }
    
    /**
     * Check if Semantic Scholar API key is configured
     */
    async hasSemanticScholarApiKey() {
        const apiKey = await this.getSemanticScholarApiKey();
        return !!(apiKey && apiKey.trim().length > 0);
    }
    
    /**
     * Get all configuration
     */
    getAll() {
        return { ...this.defaults };
    }
    
    /**
     * Check if OpenAI is configured
     */
    isOpenAIConfigured() {
        return !!(this.defaults.openai.apiKey && this.defaults.openai.apiKey.length > 0);
    }
    
    /**
     * Check if Semantic Scholar is configured
     */
    isSemanticScholarConfigured() {
        return !!(this.defaults.externalApis.semanticScholar.apiKey && 
                 this.defaults.externalApis.semanticScholar.apiKey.length > 0);
    }
    
    /**
     * Reset configuration to defaults
     */
    async reset() {
        try {
            if (this.storage) {
                await this.storage.clear();
            } else {
                // Clear localStorage items
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('orkg_') || key.startsWith('env_'))) {
                        localStorage.removeItem(key);
                    }
                }
            }
            
            this.cache.clear();
            this.defaults = this.initializeDefaults();
            
            console.log('✅ Configuration reset to defaults');
            return true;
        } catch (error) {
            console.warn('Could not reset config:', error);
            return false;
        }
    }
}

// Create singleton instance
const configInstance = new Config();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = configInstance;
}

// Make available globally
window.orkgConfig = configInstance;
window.orkgConfigData = configInstance.defaults;

export { Config };
export default configInstance;
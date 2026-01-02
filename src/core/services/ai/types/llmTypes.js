/**
 * LLM Types and Interfaces
 * TypeScript-style type definitions for the LLM Service
 */

/**
 * @typedef {Object} LLMConfig
 * @property {string} apiKey - API key for the LLM provider
 * @property {string} [model] - Model name to use
 * @property {string} [baseUrl] - Base URL for API requests
 * @property {number} [timeout] - Request timeout in milliseconds
 * @property {number} [maxRetries] - Maximum number of retries
 * @property {number} [retryDelay] - Delay between retries in milliseconds
 * @property {number} [maxTokens] - Maximum tokens per request
 * @property {number} [temperature] - Sampling temperature
 * @property {CacheConfig} [cache] - Cache configuration
 */

/**
 * @typedef {Object} CacheConfig
 * @property {boolean} enabled - Whether caching is enabled
 * @property {number} [ttl] - Time to live in milliseconds
 * @property {number} [maxSize] - Maximum cache size
 */

/**
 * @typedef {Object} TestResult
 * @property {boolean} success - Whether the test was successful
 * @property {string} [model] - Model used for the test
 * @property {string} message - Test result message
 * @property {string} [error] - Error message if test failed
 */

/**
 * @typedef {Object} AnalysisResult
 * @property {string} property - Property name
 * @property {PropertyValue[]} values - Extracted values
 * @property {Object} evidence - Evidence from the text
 * @property {Object} metadata - Analysis metadata
 * @property {Object} [extraction_metadata] - Extraction process metadata
 */

/**
 * @typedef {Object} PropertyValue
 * @property {string|number|boolean} value - The extracted value
 * @property {number} confidence - Confidence score (0-1)
 * @property {Object} evidence - Evidence supporting this value
 * @property {string} id - Unique identifier for this value
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} ExtractionResult
 * @property {PropertyExtraction[]} properties - Extracted properties
 * @property {string} summary - Summary of extraction results
 * @property {number} confidence - Overall confidence score
 */

/**
 * @typedef {Object} PropertyExtraction
 * @property {string} property - Property name
 * @property {string|number|boolean} value - Extracted value
 * @property {number} confidence - Confidence score
 */

/**
 * @typedef {Object} Problem
 * @property {string} title - Problem title
 * @property {string} description - Problem description
 */

/**
 * @typedef {Object} Template
 * @property {string} id - Template identifier
 * @property {string} name - Template name
 * @property {string} label - Template label
 * @property {string} description - Template description
 * @property {TemplateProperty[]} properties - Template properties
 * @property {TemplateMetadata} metadata - Template metadata
 */

/**
 * @typedef {Object} TemplateProperty
 * @property {string} id - Property identifier
 * @property {string} label - Property label
 * @property {string} description - Property description
 * @property {string} type - Property type (text|number|resource|boolean)
 * @property {boolean} required - Whether property is required
 */

/**
 * @typedef {Object} TemplateMetadata
 * @property {string} research_field - Research field
 * @property {string} research_category - Research category
 * @property {number} total_properties - Total number of properties
 * @property {number} adaptability_score - Adaptability score (0-1)
 * @property {string[]} suggested_sections - Suggested document sections
 * @property {string} [creation_timestamp] - Creation timestamp
 * @property {string} [template_version] - Template version
 */

/**
 * @typedef {Object} FieldSuggestion
 * @property {string} field_name - Name of the research field
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} reasoning - Reasoning for the suggestion
 */

/**
 * @typedef {Object} PropertySuggestion
 * @property {string} id - Suggestion identifier
 * @property {string} label - Property label
 * @property {string} description - Property description
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} type - Property type
 * @property {string} source - Source of suggestion
 * @property {string} [category] - Property category
 */

/**
 * @typedef {Object} ImageAnalysis
 * @property {Triple[]} triples - Extracted triples
 * @property {string} description - Description of the image
 */

/**
 * @typedef {Object} Triple
 * @property {string} subject - Subject of the triple
 * @property {string} predicate - Predicate of the triple
 * @property {string} object - Object of the triple
 * @property {number} confidence - Confidence score (0-1)
 */

/**
 * @typedef {Object} Context
 * @property {string} [paperTitle] - Title of the paper
 * @property {string} [researchField] - Research field
 * @property {string} [section] - Document section
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} UsageStats
 * @property {string} provider - Provider name
 * @property {string} model - Model name
 * @property {number} totalRequests - Total number of requests
 * @property {number} successfulRequests - Number of successful requests
 * @property {number} failedRequests - Number of failed requests
 * @property {number} successRate - Success rate (0-1)
 * @property {number} totalTokens - Total tokens consumed
 * @property {Object} rateLimitInfo - Rate limit information
 * @property {Object} [cacheStats] - Cache statistics
 */

/**
 * @typedef {Object} Recommendation
 * @property {string} id - Recommendation identifier
 * @property {string} title - Recommendation title
 * @property {string} description - Recommendation description
 * @property {string} action - Recommended action
 * @property {string} priority - Priority level
 * @property {string} category - Recommendation category
 * @property {number} confidence - Confidence score
 */

/**
 * @typedef {Object} Annotation
 * @property {string} id - Annotation identifier
 * @property {string} type - Annotation type
 * @property {string} category - Annotation category
 * @property {string} value - Annotation value
 * @property {number} confidence - Confidence score
 * @property {string} description - Annotation description
 * @property {Object} metadata - Additional metadata
 */

/**
 * @typedef {Object} AnalysisContext
 * @property {number} currentStep - Current analysis step
 * @property {Object} metadata - Paper metadata
 * @property {string} [selectedField] - Selected research field
 * @property {Object} [selectedProblem] - Selected research problem
 * @property {TemplateProperty[]} [templateProperties] - Template properties
 */

/**
 * Provider interface that all LLM providers must implement
 * @interface LLMProvider
 */

/**
 * Check if provider is available
 * @function
 * @name LLMProvider#isAvailable
 * @returns {boolean} Whether the provider is available
 */

/**
 * Test API connection
 * @function
 * @name LLMProvider#testConnection
 * @returns {Promise<TestResult>} Test result
 */

/**
 * Make API request
 * @function
 * @name LLMProvider#makeRequest
 * @param {Object} options - Request options
 * @returns {Promise<Object>} API response
 */

/**
 * Get usage statistics
 * @function
 * @name LLMProvider#getUsageStats
 * @returns {Promise<UsageStats>} Usage statistics
 */

/**
 * Clear cache and reset state
 * @function
 * @name LLMProvider#clearCache
 * @returns {Promise<void>}
 */

/**
 * Adapter interface for specialized LLM functionality
 * @interface LLMAdapter
 */

/**
 * Analysis adapter interface
 * @interface AnalysisAdapter
 * @extends LLMAdapter
 */

/**
 * Analyze property based on sections
 * @function
 * @name AnalysisAdapter#analyzeProperty
 * @param {Object} property - Property to analyze
 * @param {Object|string} sections - Document sections
 * @returns {Promise<AnalysisResult>} Analysis result
 */

/**
 * Extract structured content
 * @function
 * @name AnalysisAdapter#extractStructuredContent
 * @param {string} pageText - Text content
 * @param {TemplateProperty[]} templateProperties - Template properties
 * @param {Object} [metadata] - Additional metadata
 * @returns {Promise<ExtractionResult>} Extraction result
 */

/**
 * Extract information from images
 * @function
 * @name AnalysisAdapter#extractImageTriples
 * @param {string} imageData - Image data (base64 or URL)
 * @param {Context} [context] - Additional context
 * @returns {Promise<ImageAnalysis>} Image analysis result
 */

/**
 * Generation adapter interface
 * @interface GenerationAdapter
 * @extends LLMAdapter
 */

/**
 * Generate research problem
 * @function
 * @name GenerationAdapter#generateResearchProblem
 * @param {string} title - Paper title
 * @param {string} abstract - Paper abstract
 * @returns {Promise<Problem>} Generated problem
 */

/**
 * Generate research template
 * @function
 * @name GenerationAdapter#generateResearchTemplate
 * @param {string} researchField - Research field
 * @param {string} problemDescription - Problem description
 * @param {string} [abstract] - Paper abstract
 * @returns {Promise<Template>} Generated template
 */

/**
 * Generate text summary
 * @function
 * @name GenerationAdapter#generateSummary
 * @param {string} text - Text to summarize
 * @param {number} [maxLength] - Maximum summary length
 * @returns {Promise<string>} Generated summary
 */

/**
 * Suggestion adapter interface
 * @interface SuggestionAdapter
 * @extends LLMAdapter
 */

/**
 * Get property suggestions
 * @function
 * @name SuggestionAdapter#getPropertySuggestions
 * @param {string} selectedText - Selected text
 * @param {Context} [context] - Additional context
 * @returns {Promise<Object>} Property suggestions
 */

/**
 * Suggest research fields
 * @function
 * @name SuggestionAdapter#suggestResearchField
 * @param {string} title - Paper title
 * @param {string} abstract - Paper abstract
 * @returns {Promise<FieldSuggestion[]>} Field suggestions
 */

/**
 * Get intelligent recommendations
 * @function
 * @name SuggestionAdapter#getIntelligentRecommendations
 * @param {AnalysisContext} analysisContext - Analysis context
 * @returns {Promise<Object>} Recommendations
 */

/**
 * Get smart text annotations
 * @function
 * @name SuggestionAdapter#getSmartAnnotations
 * @param {string} selectedText - Selected text
 * @param {Object} documentContext - Document context
 * @returns {Promise<Object>} Annotations
 */

/**
 * Unified LLM Service interface
 * @interface UnifiedLLMService
 */

/**
 * Initialize LLM service
 * @function
 * @name UnifiedLLMService#initialize
 * @param {LLMConfig} config - Configuration
 * @returns {Promise<void>}
 */

/**
 * Test connection
 * @function
 * @name UnifiedLLMService#testConnection
 * @returns {Promise<TestResult>} Test result
 */

/**
 * Check if service is available
 * @function
 * @name UnifiedLLMService#isAvailable
 * @returns {boolean} Whether service is available
 */

/**
 * Content analysis methods
 */

/**
 * Analyze property
 * @function
 * @name UnifiedLLMService#analyzeProperty
 * @param {Object} property - Property to analyze
 * @param {Object|string} sections - Document sections
 * @returns {Promise<AnalysisResult>} Analysis result
 */

/**
 * Extract structured content
 * @function
 * @name UnifiedLLMService#extractStructuredContent
 * @param {string} text - Text content
 * @param {TemplateProperty[]} templateProperties - Template properties
 * @param {Object} [metadata] - Additional metadata
 * @returns {Promise<ExtractionResult>} Extraction result
 */

/**
 * Content generation methods
 */

/**
 * Generate research problem
 * @function
 * @name UnifiedLLMService#generateResearchProblem
 * @param {string} title - Paper title
 * @param {string} abstract - Paper abstract
 * @returns {Promise<Problem>} Generated problem
 */

/**
 * Generate research template
 * @function
 * @name UnifiedLLMService#generateResearchTemplate
 * @param {string} field - Research field
 * @param {string} problem - Problem description
 * @param {string} [abstract] - Paper abstract
 * @returns {Promise<Template>} Generated template
 */

/**
 * Generate summary
 * @function
 * @name UnifiedLLMService#generateSummary
 * @param {string} text - Text to summarize
 * @param {number} [maxLength] - Maximum length
 * @returns {Promise<string>} Generated summary
 */

/**
 * Suggestions and recommendations
 */

/**
 * Get property suggestions
 * @function
 * @name UnifiedLLMService#getPropertySuggestions
 * @param {string} text - Selected text
 * @param {Context} [context] - Additional context
 * @returns {Promise<PropertySuggestion[]>} Property suggestions
 */

/**
 * Suggest research field
 * @function
 * @name UnifiedLLMService#suggestResearchField
 * @param {string} title - Paper title
 * @param {string} abstract - Paper abstract
 * @returns {Promise<FieldSuggestion[]>} Field suggestions
 */

/**
 * Image analysis (GPT-4 Vision)
 */

/**
 * Extract image triples
 * @function
 * @name UnifiedLLMService#extractImageTriples
 * @param {string} imageData - Image data
 * @param {Context} [context] - Additional context
 * @returns {Promise<ImageAnalysis>} Image analysis result
 */

/**
 * Utility methods
 */

/**
 * Clear cache
 * @function
 * @name UnifiedLLMService#clearCache
 * @returns {Promise<void>}
 */

/**
 * Get usage statistics
 * @function
 * @name UnifiedLLMService#getUsageStats
 * @returns {Promise<UsageStats>} Usage statistics
 */

/**
 * Cancel active requests
 * @function
 * @name UnifiedLLMService#cancelActiveRequests
 * @returns {void}
 */

/**
 * Error types
 */

/**
 * @typedef {Error} LLMError
 * @property {string} name - Error name
 * @property {string} message - Error message
 * @property {string} [code] - Error code
 * @property {number} [status] - HTTP status code
 * @property {Object} [details] - Additional error details
 */

/**
 * @typedef {LLMError} ValidationError
 * @property {string} field - Field that failed validation
 * @property {*} value - Invalid value
 * @property {string[]} constraints - Validation constraints
 */

/**
 * @typedef {LLMError} NetworkError
 * @property {string} url - Request URL
 * @property {number} timeout - Request timeout
 * @property {number} attempts - Number of attempts made
 */

/**
 * @typedef {LLMError} RateLimitError
 * @property {number} retryAfter - Seconds to wait before retry
 * @property {number} limit - Rate limit
 * @property {number} remaining - Remaining requests
 */

/**
 * Constants
 */

export const LLM_CONSTANTS = {
    // Provider types
    PROVIDERS: {
        OPENAI: 'openai',
        ANTHROPIC: 'anthropic',
        LOCAL: 'local'
    },
    
    // Model types
    MODELS: {
        GPT_4O_MINI: 'gpt-4o-mini',
        GPT_4O: 'gpt-4o',
        GPT_4_TURBO: 'gpt-4-turbo',
        GPT_3_5_TURBO: 'gpt-3.5-turbo'
    },
    
    // Property types
    PROPERTY_TYPES: {
        TEXT: 'text',
        NUMBER: 'number',
        RESOURCE: 'resource',
        BOOLEAN: 'boolean'
    },
    
    // Confidence levels
    CONFIDENCE: {
        HIGH: 0.8,
        MEDIUM: 0.6,
        LOW: 0.4
    },
    
    // Default configurations
    DEFAULTS: {
        TIMEOUT: 60000,
        MAX_RETRIES: 3,
        RETRY_DELAY: 2000,
        MAX_TOKENS: 2000,
        TEMPERATURE: 0.7,
        CACHE_TTL: 1800000, // 30 minutes
        CACHE_MAX_SIZE: 100
    },
    
    // Error codes
    ERROR_CODES: {
        INVALID_API_KEY: 'INVALID_API_KEY',
        RATE_LIMIT: 'RATE_LIMIT',
        NETWORK_ERROR: 'NETWORK_ERROR',
        TIMEOUT: 'TIMEOUT',
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        PROVIDER_ERROR: 'PROVIDER_ERROR'
    }
};

/**
 * Utility functions for type validation
 */

/**
 * Validate LLM configuration
 * @param {Object} config - Configuration to validate
 * @returns {ValidationError[]} Array of validation errors
 */
export function validateLLMConfig(config) {
    const errors = [];
    
    if (!config) {
        errors.push(new Error('Configuration is required'));
        return errors;
    }
    
    if (!config.apiKey || typeof config.apiKey !== 'string') {
        errors.push(new Error('API key is required and must be a string'));
    }
    
    if (config.model && typeof config.model !== 'string') {
        errors.push(new Error('Model must be a string'));
    }
    
    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
        errors.push(new Error('Timeout must be a positive number'));
    }
    
    if (config.maxRetries && (typeof config.maxRetries !== 'number' || config.maxRetries < 0)) {
        errors.push(new Error('Max retries must be a non-negative number'));
    }
    
    return errors;
}

/**
 * Validate property type
 * @param {string} type - Property type to validate
 * @returns {boolean} Whether the type is valid
 */
export function isValidPropertyType(type) {
    return Object.values(LLM_CONSTANTS.PROPERTY_TYPES).includes(type);
}

/**
 * Validate confidence score
 * @param {number} confidence - Confidence score to validate
 * @returns {boolean} Whether the confidence score is valid
 */
export function isValidConfidence(confidence) {
    return typeof confidence === 'number' && confidence >= 0 && confidence <= 1;
}

/**
 * Create typed error
 * @param {string} type - Error type
 * @param {string} message - Error message
 * @param {Object} [details] - Additional details
 * @returns {LLMError} Typed error
 */
export function createLLMError(type, message, details = {}) {
    const error = new Error(message);
    error.name = type;
    error.code = details.code || type;
    error.details = details;
    return error;
}

export default {
    LLM_CONSTANTS,
    validateLLMConfig,
    isValidPropertyType,
    isValidConfidence,
    createLLMError
};

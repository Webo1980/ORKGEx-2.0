/**
   * Unified LLM Service for Chrome Extension
   * Consolidated OpenAI functionality with provider pattern and adapters
*/
  
import { generateId, createErrorHandler } from '../../../utils/utils.js';
  //import { CacheManager } from '../../utils/cacheManager.js';
  import OpenAIProvider from './providers/openaiProvider.js';
  import AnalysisAdapter from './adapters/analysisAdapter.js';
  import GenerationAdapter from './adapters/generationAdapter.js';
  import SuggestionAdapter from './adapters/suggestionAdapter.js';
  import { LLM_CONSTANTS, validateLLMConfig, createLLMError } from './types/llmTypes.js';
  
  export class LLMService {
      static instance = null;
  
      constructor(options = {}) {
          this.options = {
              provider: 'openai',
              apiKey: null,
              model: 'gpt-4o-mini',
              baseUrl: 'https://api.openai.com/v1',
              timeout: 60000,
              maxRetries: 3,
              retryDelay: 2000,
              maxTokens: 2000,
              temperature: 0.7,
              cache: {
                  enabled: true,
                  ttl: 1800000,
                  maxSize: 100
              },
              ...options
          };
          
          // Initialize provider
          this.provider = this.createProvider(this.options.provider || 'openai');
          
          // Initialize adapters
          this.analysisAdapter = new AnalysisAdapter(this.provider);
          this.generationAdapter = new GenerationAdapter(this.provider);
          this.suggestionAdapter = new SuggestionAdapter(this.provider);
          
          // Service state
          this.isInitialized = false;
          this.activeRequests = new Map();
          this.cachedSections = null;
          
          this.handleError = createErrorHandler('LLM Service');
          
          console.log('🤖 LLM Service created with provider:', this.options.provider);
      }
  
      /**
       * Get singleton instance
       */
      static getInstance(options = {}) {
          if (!LLMService.instance) {
              LLMService.instance = new LLMService(options);
          }
          return LLMService.instance;
      }
  
      /**
       * Create provider instance
       */
      createProvider(providerType) {
          switch (providerType) {
              case 'openai':
                  return new OpenAIProvider({
                      apiKey: this.options.apiKey,
                      model: this.options.model,
                      baseUrl: this.options.baseUrl,
                      timeout: this.options.timeout,
                      maxRetries: this.options.maxRetries,
                      retryDelay: this.options.retryDelay,
                      cache: this.options.cache
                  });
              
              case 'anthropic':
                  throw new Error('Anthropic provider not yet implemented');
              
              case 'local':
                  throw new Error('Local provider not yet implemented');
              
              default:
                  throw new Error(`Unknown provider: ${providerType}`);
          }
      }
  
      /**
       * Initialize LLM service
       */
      async initialize(apiKey) {
          try {
              if (this.isInitialized) {
                  return;
              }
  
              if (apiKey) {
                  this.options.apiKey = apiKey;
                  this.provider.updateConfig({ apiKey });
              }
              
              if (!this.options.apiKey) {
                  console.warn('⚠️ LLM API key not provided - using mock responses');
                  this.isInitialized = true;
                  return;
              }
              
              // Test the provider connection
              const testResult = await this.provider.testConnection();
              if (!testResult.success) {
                  throw new Error(testResult.message || 'Provider connection failed');
              }
              
              this.isInitialized = true;
              console.log('✅ LLM Service initialized successfully');
              
          } catch (error) {
              console.warn('⚠️ LLM Service initialization failed, using mock mode:', error.message);
              this.isInitialized = true; // Allow fallback mode
          }
      }
  
      /**
       * Test API connection
       */
      async testConnection() {
          try {
              return await this.provider.testConnection();
          } catch (error) {
              return {
                  success: false,
                  error: error.message,
                  message: 'Connection test failed'
              };
          }
      }
  
      /**
       * Check if service is available
       */
      isAvailable() {
          return this.provider.isAvailable();
      }
  
      /**
       * Analyze property based on sections (main analysis method)
       */
      async analyze(property, sections, forceUpdate = false) {
          try {
              // Update cache if needed
              if (!this.cachedSections || forceUpdate) {
                  this.cachedSections = typeof sections === 'string' 
                      ? sections 
                      : Object.entries(sections)
                          .map(([name, text]) => `### ${name} ###\
  ${text}`)
                          .join('\
  \
  ');
              }
  
              console.log('🔍 Analyzing property:', {
                  label: property.label,
                  description: property.description,
                  type: property.type
              });
  
              const response = await this.analysisAdapter.analyzeProperty(property, this.cachedSections);
              return response;
  
          } catch (error) {
              console.error('🚨 Analysis error:', error);
              
              // Return mock response for development/testing
              return this.generateMockResponse(property);
          }
      }
  
      /**
       * Extract structured content based on template properties
       */
      async extractStructuredContent(pageText, templateProperties, metadata = {}) {
          return await this.analysisAdapter.extractStructuredContent(pageText, templateProperties, metadata);
      }
  
      /**
       * Extract information from images using GPT-4 Vision
       */
      async extractImageTriples(imageData, context = {}) {
          return await this.analysisAdapter.extractImageTriples(imageData, context);
      }
  
      /**
       * Generate research problem from paper title and abstract
       */
      async generateResearchProblem(title, abstract) {
          return await this.generationAdapter.generateResearchProblem(title, abstract);
      }
  
      /**
       * Generate research template from field, problem, and abstract
       */
      async generateResearchTemplate(researchField, problemDescription, abstract) {
          return await this.generationAdapter.generateResearchTemplate(researchField, problemDescription, abstract);
      }
  
      /**
       * Generate text summary
       */
      async generateSummary(text, maxLength = 200) {
          return await this.generationAdapter.generateSummary(text, maxLength);
      }
  
      /**
       * Get property suggestions for selected text
       */
      async getPropertySuggestions(selectedText, context = {}) {
          return await this.suggestionAdapter.getPropertySuggestions(selectedText, context);
      }
  
      /**
       * Suggest research fields based on paper content
       */
      async suggestResearchField(title, abstract) {
          return await this.suggestionAdapter.suggestResearchField(title, abstract);
      }
  
      /**
       * Get intelligent recommendations based on current context
       */
      async getIntelligentRecommendations(analysisContext) {
          return await this.suggestionAdapter.getIntelligentRecommendations(analysisContext);
      }
  
      /**
       * Get smart text annotations for selected content
       */
      async getSmartAnnotations(selectedText, documentContext) {
          return await this.suggestionAdapter.getSmartAnnotations(selectedText, documentContext);
      }
  
      /**
       * Generate mock response for testing/development
       */
      generateMockResponse(property) {
          const mockValues = [];
          
          // Generate appropriate mock values based on property type
          switch (property.type) {
              case 'number':
                  mockValues.push({
                      value: Math.floor(Math.random() * 100),
                      confidence: 0.8,
                      evidence: {
                          'Methods Section': {
                              text: 'Sample size was determined based on power analysis',
                              relevance: 'Contains numerical information relevant to the property'
                          }
                      },
                      metadata: {
                          property_type: 'number',
                          source_section: 'Methods Section'
                      },
                      id: generateId('mock_value')
                  });
                  break;
                  
              case 'resource':
                  mockValues.push({
                      value: 'ResearchDataset_001',
                      confidence: 0.7,
                      evidence: {
                          'Data Section': {
                              text: 'The dataset used in this study was obtained from...',
                              relevance: 'References a specific resource used in the research'
                          }
                      },
                      metadata: {
                          property_type: 'resource',
                          source_section: 'Data Section'
                      },
                      id: generateId('mock_value')
                  });
                  break;
                  
              default: // text
                  mockValues.push({
                      value: 'Machine Learning',
                      confidence: 0.9,
                      evidence: {
                          'Abstract': {
                              text: 'This paper presents a machine learning approach to...',
                              relevance: 'Contains textual information directly related to the property'
                          }
                      },
                      metadata: {
                          property_type: 'text',
                          source_section: 'Abstract'
                      },
                      id: generateId('mock_value')
                  });
                  break;
          }
  
          return {
              property: property.label,
              values: mockValues,
              extraction_metadata: {
                  total_values_found: mockValues.length,
                  extraction_strategy: 'Mock data generation for development/testing'
              }
          };
      }
  
      /**
       * Update configuration
       */
      updateConfig(newConfig) {
          Object.assign(this.options, newConfig);
          
          if (this.provider && this.provider.updateConfig) {
              this.provider.updateConfig(newConfig);
          }
          
          console.log('🔧 LLM Service configuration updated');
      }
  
      /**
       * Switch provider
       */
      async switchProvider(providerType, config = {}) {
          try {
              this.provider = this.createProvider(providerType);
              this.options.provider = providerType;
              
              // Update adapters with new provider
              this.analysisAdapter = new AnalysisAdapter(this.provider);
              this.generationAdapter = new GenerationAdapter(this.provider);
              this.suggestionAdapter = new SuggestionAdapter(this.provider);
              
              // Re-initialize if needed
              if (config.apiKey) {
                  await this.initialize(config.apiKey);
              }
              
              console.log('🔄 LLM Service provider switched to:', providerType);
              
          } catch (error) {
              console.error('🚨 Failed to switch provider:', error);
              throw error;
          }
      }
  
      /**
       * Get service statistics
       */
      async getUsageStats() {
          try {
              const providerStats = this.provider.getUsageStats();
              
              return {
                  service: 'unified_llm',
                  provider: this.options.provider,
                  model: this.options.model,
                  isInitialized: this.isInitialized,
                  isAvailable: this.isAvailable(),
                  activeRequests: this.activeRequests.size,
                  ...providerStats
              };
          } catch (error) {
              console.error('Failed to get usage stats:', error);
              return {
                  service: 'unified_llm',
                  provider: this.options.provider,
                  error: error.message
              };
          }
      }
  
      /**
       * Cancel active requests
       */
      cancelActiveRequests() {
          for (const [requestId, requestInfo] of this.activeRequests.entries()) {
              if (requestInfo.abortController) {
                  requestInfo.abortController.abort();
              }
              this.activeRequests.delete(requestId);
          }
          console.log('❌ All LLM requests cancelled');
      }
  
      /**
       * Clear cache and reset state
       */
      async clearCache() {
          try {
              this.cachedSections = null;
              
              if (this.provider && this.provider.clearCache) {
                  await this.provider.clearCache();
              }
              
              // Clear active requests
              this.cancelActiveRequests();
              
              console.log('🗑️ LLM service cache cleared');
              
          } catch (error) {
              console.error('Failed to clear cache:', error);
          }
      }
  
      /**
       * Reset service state
       */
      async reset() {
          this.cancelActiveRequests();
          await this.clearCache();
          this.isInitialized = false;
          console.log('🔄 LLM service reset');
      }
  
      /**
       * Get adapter by type
       */
      getAdapter(type) {
          switch (type) {
              case 'analysis':
                  return this.analysisAdapter;
              case 'generation':
                  return this.generationAdapter;
              case 'suggestion':
                  return this.suggestionAdapter;
              default:
                  throw new Error(`Unknown adapter type: ${type}`);
          }
      }
  
      /**
       * Health check
       */
      async healthCheck() {
          try {
              const testResult = await this.testConnection();
              const stats = await this.getUsageStats();
              
              return {
                  healthy: testResult.success,
                  service: 'unified_llm',
                  provider: this.options.provider,
                  model: this.options.model,
                  isInitialized: this.isInitialized,
                  isAvailable: this.isAvailable(),
                  connection: testResult,
                  stats: stats,
                  timestamp: new Date().toISOString()
              };
              
          } catch (error) {
              return {
                  healthy: false,
                  service: 'unified_llm',
                  error: error.message,
                  timestamp: new Date().toISOString()
              };
          }
      }
  }
  
  /**
   * Get LLM service singleton instance
   */
  export function getLLMService(options = {}) {
      return LLMService.getInstance(options);
  }
  
  /**
   * Create new LLM service instance (for testing)
   */
  export function createLLMService(options = {}) {
      return new LLMService(options);
  }
  
  /**
   * Initialize LLM service with configuration
   */
  export async function initializeLLMService(config) {
      const service = getLLMService(config);
      await service.initialize(config.apiKey);
      return service;
  }
  
  // Export main class as default
  export default LLMService;
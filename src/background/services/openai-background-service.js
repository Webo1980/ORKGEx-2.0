// ================================
// src/background/openai-background-service.js
// Standalone OpenAI service for background script (no ES6 imports)
// ================================

(function() {
    'use strict';
    
    class OpenAIBackgroundService {
        constructor(config) {
            // Check for __ENV__ first, then use provided config, then defaults
            const env = (typeof self !== 'undefined' && self.__ENV__) || 
                       (typeof globalThis !== 'undefined' && globalThis.__ENV__) || 
                       {};
            
            this.apiKey = config?.apiKey || env.OPENAI_API_KEY || null;
            this.model = config?.model || env.OPENAI_MODEL || 'gpt-3.5-turbo';
            this.baseURL = config?.baseURL || env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
            this.temperature = parseFloat(config?.temperature || env.OPENAI_TEMPERATURE || '0.7');
            this.maxTokens = parseInt(config?.maxTokens || env.OPENAI_MAX_TOKENS || '500');
            this.timeout = parseInt(config?.timeout || env.OPENAI_TIMEOUT || '30000');
            
            // Simple in-memory cache
            this.cache = new Map();
            this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
            
            // Stats
            this.stats = {
                totalRequests: 0,
                cacheHits: 0,
                cacheMisses: 0,
                errors: 0
            };
            
            this.isInitialized = false;
        }
        
        async init() {
            if (this.isInitialized) return true;
            
            console.log('🤖 Initializing OpenAI Background Service...');
            
            // Check for __ENV__ again in case it wasn't available during construction
            if (!this.apiKey) {
                const env = (typeof self !== 'undefined' && self.__ENV__) || 
                           (typeof globalThis !== 'undefined' && globalThis.__ENV__) || 
                           {};
                
                if (env.OPENAI_API_KEY) {
                    this.apiKey = env.OPENAI_API_KEY;
                    console.log('✅ OpenAI API key loaded from build config');
                    
                    // Also update other config from env
                    if (env.OPENAI_MODEL) this.model = env.OPENAI_MODEL;
                    if (env.OPENAI_TEMPERATURE) this.temperature = parseFloat(env.OPENAI_TEMPERATURE);
                    if (env.OPENAI_MAX_TOKENS) this.maxTokens = parseInt(env.OPENAI_MAX_TOKENS);
                    if (env.OPENAI_BASE_URL) this.baseURL = env.OPENAI_BASE_URL;
                    if (env.OPENAI_TIMEOUT) this.timeout = parseInt(env.OPENAI_TIMEOUT);
                }
            }
            
            // Fallback: try to get from storage (for user-provided keys)
            if (!this.apiKey) {
                try {
                    const result = await chrome.storage.local.get(['openai_api_key']);
                    if (result.openai_api_key) {
                        this.apiKey = result.openai_api_key;
                        console.log('✅ OpenAI API key loaded from storage');
                    }
                } catch (error) {
                    console.error('Failed to load API key from storage:', error);
                }
            }
            
            if (!this.apiKey) {
                console.warn('⚠️ No OpenAI API key found - AI suggestions will use fallbacks');
                console.log('   To add an API key, either:');
                console.log('   1. Set OPENAI_API_KEY in your .env file and rebuild');
                console.log('   2. Save it to chrome.storage.local with key "openai_api_key"');
                this.isInitialized = true;
                return false;
            }
            
            // Log configuration (without exposing the full API key)
            console.log('✅ OpenAI Background Service initialized with:');
            console.log(`   - Model: ${this.model}`);
            console.log(`   - Temperature: ${this.temperature}`);
            console.log(`   - Max Tokens: ${this.maxTokens}`);
            console.log(`   - API Key: ${this.apiKey.substring(0, 7)}...`);
            
            this.isInitialized = true;
            return true;
        }
        
        /**
         * Get AI-powered property suggestions for selected text
         */
        async getSuggestedProperties(text, context = {}) {
            // Initialize if needed
            if (!this.isInitialized) {
                await this.init();
            }
            
            // Check cache first
            const cacheKey = this.generateCacheKey(text, context);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                this.stats.cacheHits++;
                console.log('💾 OpenAI cache hit for property suggestions');
                return cached;
            }
            
            this.stats.cacheMisses++;
            
            try {
                this.stats.totalRequests++;
                
                const prompt = this.buildPropertySuggestionPrompt(text, context);
                
                const response = await this.makeRequest({
                    messages: [
                        {
                            role: 'system',
                            content: this.getSystemPrompt()
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 300
                });
                
                if (!response || !response.choices || !response.choices[0]) {
                    throw new Error('Invalid response from OpenAI');
                }
                
                const content = response.choices[0].message?.content || response.choices[0].text;
                const suggestions = this.parseAIResponse(content, text, context);
                
                // Cache the result
                this.setCache(cacheKey, suggestions);
                
                return suggestions;
                
            } catch (error) {
                this.stats.errors++;
                console.error('OpenAI property suggestion failed:', error);
            }
        }
        
        /**
         * Make a request to OpenAI API
         */
        async makeRequest(options) {
            const { messages, temperature = 0.7, max_tokens = 300 } = options;
            
            try {
                const response = await fetch(`${this.baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: this.model,
                        messages: messages,
                        temperature: temperature,
                        max_tokens: max_tokens
                    })
                });
                
                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
                }
                
                const data = await response.json();
                return data;
                
            } catch (error) {
                console.error('OpenAI API request failed:', error);
                throw error;
            }
        }
        
        /**
         * Build the prompt for property suggestions
         */
        buildPropertySuggestionPrompt(text, context) {
            let prompt = `Given the following text from a research paper:\n\n"${text}"\n\n`;
            
            if (context.section) {
                prompt += `Context: This text is from the ${context.section} section.\n\n`;
            }
            
            if (context.pageTitle) {
                prompt += `Paper title: "${context.pageTitle}"\n\n`;
            }
            
            prompt += `Suggest 3-4 ORKG properties that best describe this text. Focus on:
        1. The type of information being presented (method, result, dataset, etc.)
        2. The research aspect it represents
        3. Properties commonly used in academic papers
        Your outputs should ONLY be a valid JSON. Do not include code fences, explanations, or any extra text
        Return ONLY a JSON array (no markdown, no code blocks) with this exact format:
        [
        {
            "label": "Property Name",
            "description": "Brief description of what this property represents",
            "confidence": 0.8
        }
        ]

        JSON Response:`;
            
            return prompt;
        }
        
        /**
         * Get the system prompt for OpenAI
         */
        getSystemPrompt() {
            return `You are an expert in academic research and the Open Research Knowledge Graph (ORKG). 
        Your task is to suggest relevant ORKG properties for text selections from research papers. 
        Focus on standard academic properties like: methodology, dataset, result, evaluation metric, 
        baseline, contribution, limitation, future work, hypothesis, research question, etc.

        IMPORTANT: Return ONLY a valid JSON array without any markdown formatting or code blocks.
        Your outputs should ONLY be a valid JSON. Do not include code fences, explanations, or any extra text
        Do not include \`\`\`json or \`\`\` markers.
        Return the raw JSON array directly.`;
        }
        
         /**
         * Parse AI response into property suggestions
         */
        parseAIResponse(content, originalText, context) {
            try {
                // Log the raw response for debugging
                console.log('Raw AI response:', content.substring(0, 200));
                
                // Clean up the response
                let cleanedContent = content;
                
                // Remove markdown code blocks
                cleanedContent = cleanedContent.replace(/```json\s*/gi, '');
                cleanedContent = cleanedContent.replace(/```\s*/gi, '');
                
                // Remove any leading/trailing whitespace
                cleanedContent = cleanedContent.trim();
                
                // Remove any text before the first [
                const arrayStart = cleanedContent.indexOf('[');
                if (arrayStart > 0) {
                    cleanedContent = cleanedContent.substring(arrayStart);
                }
                
                // Remove any text after the last ]
                const arrayEnd = cleanedContent.lastIndexOf(']');
                if (arrayEnd > -1 && arrayEnd < cleanedContent.length - 1) {
                    cleanedContent = cleanedContent.substring(0, arrayEnd + 1);
                }
                
                // Try to parse the cleaned JSON
                let suggestions;
                try {
                    suggestions = JSON.parse(cleanedContent);
                } catch (parseError) {
                    // If parsing fails, try to extract JSON using regex
                    const jsonMatch = cleanedContent.match(/\[[\s\S]*?\]/);
                    if (jsonMatch) {
                        suggestions = JSON.parse(jsonMatch[0]);
                    } else {
                        throw parseError;
                    }
                }
                
                if (!Array.isArray(suggestions)) {
                    console.warn('Parsed content is not an array:', suggestions);
                    throw new Error('Response is not an array');
                }
                
                // Enhance and validate suggestions
                const validSuggestions = suggestions
                    .filter(s => s && typeof s === 'object' && s.label)
                    .slice(0, 4)
                    .map((s, index) => ({
                        id: `ai_${Date.now()}_${index}`,
                        label: s.label || `Property ${index + 1}`,
                        description: s.description || 'AI-suggested property',
                        confidence: typeof s.confidence === 'number' ? s.confidence : 0.7,
                        color: this.generatePropertyColor(s.label || ''),
                        source: 'ai'
                    }));
                
                if (validSuggestions.length === 0) {
                    throw new Error('No valid suggestions found in response');
                }
                
                console.log(`✅ Parsed ${validSuggestions.length} AI suggestions`);
                return validSuggestions;
                
            } catch (error) {
                console.warn('Failed to parse AI response:', error.message);
                console.log('Content that failed to parse:', content.substring(0, 500));
                
                // Try to extract suggestions from text
                return this.extractSuggestionsFromText(content, originalText, context);
            }
        }
        
        /**
         * Extract suggestions from text when JSON parsing fails
         */
        extractSuggestionsFromText(content, originalText, context) {
            const suggestions = [];
            const lines = content.split('\n').filter(line => line.trim());
            
            // Look for patterns like "- Property Name:" or "1. Property Name"
            const patterns = [
                /[-•]\s*([^:]+):\s*(.+)/,
                /\d+\.\s*([^:]+):\s*(.+)/,
                /^([A-Z][^:]+):\s*(.+)/
            ];
            
            for (const line of lines) {
                for (const pattern of patterns) {
                    const match = line.match(pattern);
                    if (match && suggestions.length < 4) {
                        suggestions.push({
                            id: `ai_${Date.now()}_${suggestions.length}`,
                            label: match[1].trim(),
                            description: match[2]?.trim() || 'AI-suggested property',
                            confidence: 0.6,
                            color: this.generatePropertyColor(match[1]),
                            source: 'ai'
                        });
                        break;
                    }
                }
            }
            
            // If no suggestions found, return intelligent fallbacks
            if (suggestions.length === 0) {
                return 'Service unavailable, using intelligent fallbacks';
            }
            
            return suggestions.slice(0, 4);
        }
        
        
        /**
         * Generate a color for a property based on its label
         */
        generatePropertyColor(propertyLabel) {
            const colorMap = {
                'method': '#9C27B0',
                'methodology': '#9C27B0',
                'algorithm': '#673AB7',
                'technique': '#673AB7',
                'result': '#4CAF50',
                'finding': '#4CAF50',
                'performance': '#8BC34A',
                'accuracy': '#8BC34A',
                'dataset': '#2196F3',
                'data': '#2196F3',
                'model': '#FF9800',
                'evaluation': '#00BCD4',
                'metric': '#00BCD4',
                'baseline': '#795548',
                'comparison': '#795548',
                'contribution': '#FFC107',
                'novelty': '#FFC107',
                'limitation': '#F44336',
                'challenge': '#F44336',
                'future': '#607D8B',
                'hypothesis': '#E91E63',
                'question': '#E91E63',
                'problem': '#FF5722',
                'solution': '#009688',
                'improvement': '#009688'
            };
            
            const labelLower = propertyLabel.toLowerCase();
            
            // Check for exact or partial matches
            for (const [key, color] of Object.entries(colorMap)) {
                if (labelLower.includes(key)) {
                    return color;
                }
            }
            
            // Generate color based on hash if no match
            let hash = 0;
            for (let i = 0; i < propertyLabel.length; i++) {
                hash = propertyLabel.charCodeAt(i) + ((hash << 5) - hash);
            }
            
            const colors = ['#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1', '#B0E0E6', 
                           '#98FB98', '#DDA0DD', '#F5DEB3', '#87CEEB', '#FFA07A'];
            return colors[Math.abs(hash) % colors.length];
        }
        
        /**
         * Cache management
         */
        generateCacheKey(text, context) {
            const contextStr = JSON.stringify(context || {});
            const key = `${text.substring(0, 100)}_${contextStr}`;
            return `ai_props_${this.hashString(key)}`;
        }
        
        getFromCache(key) {
            if (!this.cache.has(key)) {
                return null;
            }
            
            const cached = this.cache.get(key);
            
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
            
            // Limit cache size
            if (this.cache.size > 100) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
        }
        
        clearCache() {
            this.cache.clear();
            console.log('🗑️ OpenAI cache cleared');
        }
        
        /**
         * Utility functions
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
         * Update API key
         */
        async updateApiKey(newApiKey) {
            this.apiKey = newApiKey;
            
            // Save to storage
            try {
                await chrome.storage.local.set({ 'openai_api_key': newApiKey });
                console.log('✅ OpenAI API key updated and saved');
                
                // Clear cache since we have a new key
                this.clearCache();
                
                return true;
            } catch (error) {
                console.error('Failed to save API key:', error);
                return false;
            }
        }
        
        /**
         * Test the API connection
         */
        async testConnection() {
            if (!this.apiKey) {
                return {
                    success: false,
                    error: 'No API key configured'
                };
            }
            
            try {
                const response = await this.makeRequest({
                    messages: [
                        { role: 'user', content: 'Test' }
                    ],
                    max_tokens: 5
                });
                
                return {
                    success: true,
                    model: this.model
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
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
                cacheSize: this.cache.size,
                hitRate: `${hitRate}%`,
                hasApiKey: !!this.apiKey,
                isInitialized: this.isInitialized
            };
        }
    }
    
    // Make available globally for service worker
    if (typeof globalThis !== 'undefined') {
        globalThis.OpenAIBackgroundService = OpenAIBackgroundService;
    } else if (typeof self !== 'undefined') {
        self.OpenAIBackgroundService = OpenAIBackgroundService;
    }
})();
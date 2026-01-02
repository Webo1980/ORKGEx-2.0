// ================================
// src/content/intelligence/TextIntelligence.js - Converted to IIFE
// ================================

(function(global) {
    'use strict';
    
    /**
     * TextIntelligence
     * Provides intelligent analysis of text content
     */
    function TextIntelligence(config = {}) {
        this.config = {
            thresholds: {
                keySection: 0.7,       // Threshold for key section
                relevantSection: 0.5,  // Threshold for relevant section
                important: 0.7,        // Threshold for important text
                similarity: 0.8        // Threshold for text similarity
            },
            keywords: {
                method: ['method', 'procedure', 'technique', 'approach', 'algorithm', 
                        'protocol', 'process', 'methodology', 'implementation', 'framework'],
                result: ['result', 'finding', 'outcome', 'discovery', 'observation', 
                        'conclusion', 'reveal', 'demonstrate', 'show', 'confirm'],
                data: ['data', 'dataset', 'corpus', 'collection', 'sample', 
                      'measurement', 'statistic', 'record', 'value', 'parameter'],
                conclusion: ['conclude', 'summary', 'implication', 'suggest', 'indicate', 
                            'demonstrate', 'establish', 'confirm', 'validate', 'verify']
            },
            sectionLabels: {
                introduction: ['introduction', 'background', 'overview'],
                methods: ['method', 'methodology', 'materials', 'procedure', 'experimental'],
                results: ['result', 'finding', 'outcome', 'observation'],
                discussion: ['discussion', 'interpretation', 'implication'],
                conclusion: ['conclusion', 'summary', 'future work']
            },
            ...config
        };
        
        this.cache = new Map();
        this.isInitialized = false;
    }
    
    /**
     * Initialize the intelligence module
     */
    TextIntelligence.prototype.init = async function() {
        if (this.isInitialized) return;
        
        console.log('🧠 Initializing TextIntelligence...');
        
        // Any initialization logic can go here
        
        this.isInitialized = true;
        console.log('✅ TextIntelligence initialized');
    };
    
    /**
     * Analyze text content
     */
    TextIntelligence.prototype.analyze = function(text, sectionName = '') {
        // Check if already in cache
        const cacheKey = this.generateCacheKey(text, sectionName);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Basic validation
        if (!text || typeof text !== 'string') {
            return { 
                text: text || '',
                section: sectionName,
                score: 0,
                type: 'invalid',
                keyPhrases: [],
                sentences: []
            };
        }
        
        // Process the text
        let result;
        
        if (typeof text === 'object' && text.content) {
            // Handle structured text
            result = this.analyzeStructuredText(text, sectionName);
        } else {
            // Handle plain text
            result = this.analyzePlainText(text, sectionName);
        }
        
        // Cache the result
        this.cache.set(cacheKey, result);
        
        return result;
    };
    
    /**
     * Analyze plain text
     */
    TextIntelligence.prototype.analyzePlainText = function(text, sectionName) {
        // Get basic text metrics
        const wordCount = this.countWords(text);
        const sentenceCount = this.countSentences(text);
        const averageSentenceLength = wordCount / Math.max(1, sentenceCount);
        
        // Split into sentences for more detailed analysis
        const sentences = this.splitIntoSentences(text);
        const analyzedSentences = sentences.map((sentence, index) => 
            this.analyzeSentence(sentence, index, sectionName)
        );
        
        // Get section type based on section name
        const sectionType = this.determineSectionType(sectionName);
        
        // Calculate overall score
        const sentenceScores = analyzedSentences.map(s => s.score);
        const averageScore = sentenceScores.length > 0 
            ? sentenceScores.reduce((a, b) => a + b, 0) / sentenceScores.length 
            : 0;
        
        // Extract key phrases
        const keyPhrases = this.extractKeyPhrases(analyzedSentences);
        
        // Final result
        return {
            text: text,
            section: sectionName,
            type: sectionType,
            score: averageScore,
            metrics: {
                wordCount: wordCount,
                sentenceCount: sentenceCount,
                averageSentenceLength: averageSentenceLength
            },
            keyPhrases: keyPhrases,
            sentences: analyzedSentences,
            timestamp: Date.now()
        };
    };
    
    /**
     * Analyze structured text object
     */
    TextIntelligence.prototype.analyzeStructuredText = function(textObj, sectionName) {
        // Handle structured text with content property
        const content = textObj.content || '';
        const metadata = textObj.metadata || {};
        const id = textObj.id || '';
        
        // Get result from plain text analysis
        const result = this.analyzePlainText(content, sectionName);
        
        // Add structure information
        return {
            ...result,
            id: id,
            metadata: {
                ...metadata,
                intelligence: {
                    applied: true,
                    timestamp: Date.now()
                }
            }
        };
    };
    
    /**
     * Analyze individual sentence
     */
    TextIntelligence.prototype.analyzeSentence = function(sentence, index, sectionName) {
        // Get sentence characteristics
        const words = this.getWords(sentence);
        const wordCount = words.length;
        
        // Calculate sentence importance score
        const keywordScore = this.calculateKeywordScore(sentence);
        const structureScore = this.calculateStructureScore(sentence, index);
        const contextScore = this.calculateContextScore(sentence, sectionName);
        
        // Combined score (weighted)
        const score = (keywordScore * 0.5) + (structureScore * 0.3) + (contextScore * 0.2);
        
        // Categorize sentence
        const category = this.categorizeSentence(sentence, score, sectionName);
        
        // Entity extraction (simple approach)
        const entities = this.extractEntities(sentence);
        
        return {
            text: sentence,
            index: index,
            wordCount: wordCount,
            score: score,
            category: category,
            isImportant: score >= this.config.thresholds.important,
            entities: entities
        };
    };
    
    /**
     * Calculate keyword-based score
     */
    TextIntelligence.prototype.calculateKeywordScore = function(text) {
        const textLower = text.toLowerCase();
        let score = 0;
        
        // Check for important keywords across categories
        for (const category in this.config.keywords) {
            const keywords = this.config.keywords[category];
            for (const keyword of keywords) {
                if (textLower.includes(keyword)) {
                    score += 0.1; // Add score for each keyword
                    break; // Only count category once
                }
            }
        }
        
        // Adjust for sentence structure signals
        if (textLower.includes('significantly')) score += 0.15;
        if (textLower.includes('importantly')) score += 0.15;
        if (textLower.includes('notably')) score += 0.15;
        if (textLower.includes('we found') || textLower.includes('we observe')) score += 0.2;
        if (textLower.includes('in conclusion') || textLower.includes('to summarize')) score += 0.2;
        
        return Math.min(1, score);
    };
    
    /**
     * Calculate structure-based score
     */
    TextIntelligence.prototype.calculateStructureScore = function(sentence, index) {
        let score = 0.5; // Base score
        
        // First sentence bonus
        if (index === 0) score += 0.2;
        
        // Last sentence bonus (approximate)
        if (index > 5 && sentence.length > 20 && 
            (sentence.includes('.') && !sentence.includes('...'))) {
            score += 0.1;
        }
        
        // Length penalty/bonus
        const words = this.getWords(sentence);
        if (words.length < 5) score -= 0.2; // Too short
        if (words.length > 40) score -= 0.1; // Too long
        if (words.length >= 10 && words.length <= 25) score += 0.1; // Just right
        
        // Structure signals
        if (sentence.includes(':')) score += 0.1; // Likely defining something
        if (sentence.includes('(') && sentence.includes(')')) score += 0.05; // Contains clarification
        if (/\d/.test(sentence)) score += 0.1; // Contains numbers
        
        return Math.min(1, Math.max(0, score));
    };
    
    /**
     * Calculate context-based score
     */
    TextIntelligence.prototype.calculateContextScore = function(sentence, sectionName) {
        if (!sectionName) return 0.5; // Neutral without context
        
        const sectionLower = sectionName.toLowerCase();
        const sentenceLower = sentence.toLowerCase();
        let score = 0.5;
        
        // Score based on section type
        for (const [type, keywords] of Object.entries(this.config.sectionLabels)) {
            if (keywords.some(kw => sectionLower.includes(kw))) {
                // Check if sentence contains keywords relevant to this section
                if (type === 'methods' && 
                    this.config.keywords.method.some(kw => sentenceLower.includes(kw))) {
                    score += 0.2;
                }
                else if (type === 'results' && 
                         this.config.keywords.result.some(kw => sentenceLower.includes(kw))) {
                    score += 0.2;
                }
                else if (type === 'conclusion' && 
                         this.config.keywords.conclusion.some(kw => sentenceLower.includes(kw))) {
                    score += 0.2;
                }
                
                break;
            }
        }
        
        return Math.min(1, score);
    };
    
    /**
     * Categorize a sentence
     */
    TextIntelligence.prototype.categorizeSentence = function(sentence, score, sectionName) {
        // Basic categorization based on keywords
        const textLower = sentence.toLowerCase();
        
        if (score >= this.config.thresholds.important) {
            // High score categorization
            if (this.config.keywords.method.some(kw => textLower.includes(kw))) {
                return 'method';
            }
            if (this.config.keywords.result.some(kw => textLower.includes(kw))) {
                return 'result';
            }
            if (this.config.keywords.conclusion.some(kw => textLower.includes(kw))) {
                return 'conclusion';
            }
            if (this.config.keywords.data.some(kw => textLower.includes(kw))) {
                return 'data';
            }
            
            return 'important';
        }
        
        // Medium score categorization
        if (score >= 0.5) {
            if (/\d+\s*%/.test(textLower) || /\d+\.\d+/.test(textLower)) {
                return 'statistic';
            }
            if (textLower.includes('figure') || textLower.includes('table')) {
                return 'reference';
            }
            if (textLower.includes('e.g') || textLower.includes('i.e') || 
                textLower.includes('for example')) {
                return 'example';
            }
            
            return 'relevant';
        }
        
        // Low score categorization
        return 'standard';
    };
    
    /**
     * Extract entities from text (simple approach)
     */
    TextIntelligence.prototype.extractEntities = function(text) {
        const entities = [];
        
        // Extract citations
        const citationRegex = /\[(\d+(?:,\s*\d+)*)\]|\(([^)]+\s*\d{4}[^)]*)\)/g;
        let match;
        while ((match = citationRegex.exec(text)) !== null) {
            entities.push({
                type: 'citation',
                text: match[0],
                index: match.index
            });
        }
        
        // Extract references to figures and tables
        const figureRegex = /(figure|fig\.|table)\s+(\d+[a-z]?)/gi;
        while ((match = figureRegex.exec(text)) !== null) {
            entities.push({
                type: match[1].toLowerCase().includes('fig') ? 'figure' : 'table',
                text: match[0],
                id: match[2],
                index: match.index
            });
        }
        
        // Extract numbers with units
        const numberRegex = /(\d+\.?\d*)\s*(%|cm|mm|m|km|g|kg|ml|l|°C|°F|hz|khz|mhz|ghz)/gi;
        while ((match = numberRegex.exec(text)) !== null) {
            entities.push({
                type: 'measurement',
                text: match[0],
                value: parseFloat(match[1]),
                unit: match[2].toLowerCase(),
                index: match.index
            });
        }
        
        return entities;
    };
    
    /**
     * Extract key phrases from analyzed sentences
     */
    TextIntelligence.prototype.extractKeyPhrases = function(analyzedSentences) {
        // Filter for important sentences
        const importantSentences = analyzedSentences.filter(
            s => s.score >= this.config.thresholds.important
        );
        
        if (importantSentences.length === 0) {
            // If no important sentences, take the highest scoring ones (up to 2)
            const sortedSentences = [...analyzedSentences].sort((a, b) => b.score - a.score);
            importantSentences.push(...sortedSentences.slice(0, 2));
        }
        
        // Extract noun phrases (simplified)
        const keyPhrases = [];
        for (const sentence of importantSentences) {
            const phrases = this.extractNounPhrases(sentence.text);
            for (const phrase of phrases) {
                // Check if similar phrase already exists
                const isDuplicate = keyPhrases.some(existing => 
                    this.calculateSimilarity(existing.text, phrase) >= this.config.thresholds.similarity
                );
                
                if (!isDuplicate && phrase.length > 3) {
                    keyPhrases.push({
                        text: phrase,
                        score: sentence.score,
                        category: sentence.category
                    });
                }
            }
        }
        
        // Sort by score and limit
        return keyPhrases
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    };
    
    /**
     * Extract noun phrases (simplified)
     */
    TextIntelligence.prototype.extractNounPhrases = function(text) {
        const phrases = [];
        
        // Simple regex-based extraction
        // This is a very simplified approach - a real NLP pipeline would be better
        const regex = /(?:the|a|an)?\s*(?:[A-Z][a-z]+\s+)?(?:[a-z]+\s+){0,2}(?:[a-z]+)/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            const phrase = match[0].trim();
            if (phrase.length > 3 && !this.isStopPhrase(phrase)) {
                phrases.push(phrase);
            }
        }
        
        return phrases;
    };
    
    /**
     * Check if a phrase is a stop phrase
     */
    TextIntelligence.prototype.isStopPhrase = function(phrase) {
        const stopPhrases = [
            'the', 'a', 'an', 'this', 'that', 'these', 'those',
            'is', 'are', 'was', 'were', 'has', 'have', 'had',
            'the following', 'as follows', 'as shown'
        ];
        
        return stopPhrases.includes(phrase.toLowerCase());
    };
    
    /**
     * Calculate similarity between two strings
     */
    TextIntelligence.prototype.calculateSimilarity = function(str1, str2) {
        // Convert to lowercase for comparison
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        // If one is a substring of the other, they're similar
        if (s1.includes(s2) || s2.includes(s1)) {
            return 0.9;
        }
        
        // Simple Jaccard similarity of words
        const words1 = new Set(this.getWords(s1));
        const words2 = new Set(this.getWords(s2));
        
        // Create union and intersection
        const union = new Set([...words1, ...words2]);
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        
        // Calculate Jaccard
        return intersection.size / union.size;
    };
    
    /**
     * Determine section type based on section name
     */
    TextIntelligence.prototype.determineSectionType = function(sectionName) {
        if (!sectionName) return 'unknown';
        
        const sectionLower = sectionName.toLowerCase();
        
        for (const [type, keywords] of Object.entries(this.config.sectionLabels)) {
            if (keywords.some(kw => sectionLower.includes(kw))) {
                return type;
            }
        }
        
        return 'unknown';
    };
    
    /**
     * Get word list from text
     */
    TextIntelligence.prototype.getWords = function(text) {
        return text.split(/\s+/).filter(w => w.length > 0);
    };
    
    /**
     * Count words in text
     */
    TextIntelligence.prototype.countWords = function(text) {
        return this.getWords(text).length;
    };
    
    /**
     * Count sentences in text
     */
    TextIntelligence.prototype.countSentences = function(text) {
        return this.splitIntoSentences(text).length;
    };
    
    /**
     * Split text into sentences
     */
    TextIntelligence.prototype.splitIntoSentences = function(text) {
        // Simplified sentence splitting
        // This won't handle all edge cases perfectly
        return text
            .replace(/([.!?])\s+([A-Z])/g, '$1\n$2')
            .split(/\n+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    };
    
    /**
     * Generate cache key
     */
    TextIntelligence.prototype.generateCacheKey = function(text, sectionName) {
        // Simple hash function
        const str = `${sectionName}:${text.substring(0, 100)}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return `text_${hash}`;
    };
    
    /**
     * Suggest properties based on text
     */
    TextIntelligence.prototype.suggestProperties = function(text) {
        // Analyze the text
        const analysis = this.analyzePlainText(text);
        
        // Extract categories from sentences
        const categories = analysis.sentences
            .filter(s => s.score >= 0.5)
            .map(s => s.category);
        
        // Count category frequencies
        const categoryCount = {};
        for (const category of categories) {
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        }
        
        // Get top categories
        const sortedCategories = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])
            .map(([category]) => category);
        
        // Map categories to property suggestions
        return this.mapCategoriesToProperties(sortedCategories, text);
    };
    
    /**
     * Map categories to property suggestions
     */
    TextIntelligence.prototype.mapCategoriesToProperties = function(categories, text) {
        const suggestions = [];
        const textLower = text.toLowerCase();
        
        // Add category-based suggestions
        for (const category of categories) {
            switch (category) {
                case 'method':
                    suggestions.push({
                        id: 'method',
                        label: 'Method',
                        description: 'The methodology or approach described',
                        confidence: 0.9
                    });
                    break;
                case 'result':
                    suggestions.push({
                        id: 'result',
                        label: 'Result',
                        description: 'The outcome or finding',
                        confidence: 0.9
                    });
                    break;
                case 'conclusion':
                    suggestions.push({
                        id: 'conclusion',
                        label: 'Conclusion',
                        description: 'The conclusion or summary',
                        confidence: 0.9
                    });
                    break;
                case 'data':
                    suggestions.push({
                        id: 'dataset',
                        label: 'Dataset',
                        description: 'The data used or produced',
                        confidence: 0.8
                    });
                    break;
                case 'statistic':
                    suggestions.push({
                        id: 'statistic',
                        label: 'Statistic',
                        description: 'Statistical measurement or value',
                        confidence: 0.8
                    });
                    break;
            }
        }
        
        // Add context-specific suggestions
        if (textLower.includes('accuracy') || 
            textLower.includes('precision') || 
            textLower.includes('f1') || 
            textLower.includes('recall')) {
            suggestions.push({
                id: 'evaluation_metric',
                label: 'Evaluation Metric',
                description: 'Metric used for evaluation',
                confidence: 0.8
            });
        }
        
        if (textLower.includes('architecture') || 
            textLower.includes('model') || 
            textLower.includes('algorithm')) {
            suggestions.push({
                id: 'model',
                label: 'Model',
                description: 'The model or algorithm described',
                confidence: 0.8
            });
        }
        
        if (textLower.includes('future') || 
            textLower.includes('limitation') || 
            textLower.includes('constraint')) {
            suggestions.push({
                id: 'limitation',
                label: 'Limitation',
                description: 'Limitation or constraint of the work',
                confidence: 0.8
            });
        }
        
        // Deduplicate suggestions
        const uniqueSuggestions = [];
        const addedIds = new Set();
        
        for (const suggestion of suggestions) {
            if (!addedIds.has(suggestion.id)) {
                uniqueSuggestions.push(suggestion);
                addedIds.add(suggestion.id);
            }
        }
        
        return uniqueSuggestions;
    };
    
    /**
     * Clean up and reset
     */
    TextIntelligence.prototype.cleanup = function() {
        this.cache.clear();
        this.isInitialized = false;
        console.log('🧹 TextIntelligence cleaned up');
    };
    
    // Export to global scope
    global.TextIntelligence = TextIntelligence;
    
})(typeof window !== 'undefined' ? window : this);
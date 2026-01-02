// ================================
// src/background/services/openai-rag-extension.js
// Modular, DRY, SOLID RAG helpers for robust multi-property extraction
// - Smarter type hints for arbitrary property names
// - Enforced full-section scanning with verification
// - Cross-property sentence de-duplication
// - Safer JSON parsing/repair and deterministic fallback
// - Enhanced RAG Helper - Clean, Modular, SOLID Implementation
// ================================

/**
 * Configuration management for RAG extraction
 */
// ================================
// Enhanced RAG Helper - Clean, Modular, SOLID Implementation
// ================================

/**
 * Configuration management for RAG extraction
 */
class RAGConfig {
    constructor(options = {}) {
        this.maxSectionSize = options.maxSectionSize || 3000;
        this.maxSentencesPerSection = options.maxSentencesPerSection || 50;
        this.maxValuesPerProperty = options.maxValuesPerProperty || 10;
        this.minSentenceLength = options.minSentenceLength || 10;
        this.maxSentenceLength = options.maxSentenceLength || 500;
        this.enableMultiPropertyAnalysis = options.enableMultiPropertyAnalysis !== false;
        this.enableDeterministicFallback = options.enableDeterministicFallback !== false;
        this.enableSentenceDeduplication = options.enableSentenceDeduplication !== false;
        this.confidenceThreshold = options.confidenceThreshold || 0.3;
        this.debugMode = options.debugMode || false;
    }
}

/**
 * Manages a pool of sentences to prevent reuse across properties
 */
class SentencePool {
    constructor() {
        this.usedSentences = new Map(); // sentence -> propertyId
        this.sentenceHashes = new Map(); // hash -> sentence
    }

    /**
     * Generate hash for sentence comparison
     */
    hashSentence(sentence) {
        const normalized = sentence.toLowerCase().replace(/\s+/g, ' ').trim();
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `s_${Math.abs(hash).toString(36)}`;
    }

    /**
     * Check if sentence is available for use
     */
    isAvailable(sentence) {
        const hash = this.hashSentence(sentence);
        return !this.usedSentences.has(hash);
    }

    /**
     * Mark sentence as used by a property
     */
    markUsed(sentence, propertyId) {
        const hash = this.hashSentence(sentence);
        this.usedSentences.set(hash, propertyId);
        this.sentenceHashes.set(hash, sentence);
        return hash;
    }

    /**
     * Get usage statistics
     */
    getStats() {
        return {
            totalUsed: this.usedSentences.size,
            byProperty: Array.from(this.usedSentences.entries()).reduce((acc, [hash, propId]) => {
                acc[propId] = (acc[propId] || 0) + 1;
                return acc;
            }, {})
        };
    }

    /**
     * Clear the pool
     */
    clear() {
        this.usedSentences.clear();
        this.sentenceHashes.clear();
    }
}

/**
 * Handles text processing and sentence extraction
 */
class TextProcessor {
    constructor(config) {
        this.config = config;
    }

    /**
     * Clean and normalize text
     */
    cleanText(text) {
        if (!text) return '';
        
        return text
            .replace(/<[^>]*>/g, ' ')
            .replace(/&[a-z]+;/gi, ' ')
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, '')
            .trim();
    }

    /**
     * Extract sentences from text with improved tokenization
     */
    extractSentences(text) {
        if (!text) return [];
        
        const cleaned = this.cleanText(text);
        
        // Improved sentence tokenization
        const sentences = cleaned
            .split(/(?<=[.!?])\s+(?=[A-Z])/)
            .map(s => s.trim())
            .filter(s => {
                const length = s.length;
                return length >= this.config.minSentenceLength && 
                       length <= this.config.maxSentenceLength &&
                       /[a-zA-Z]/.test(s);
            });
        
        return sentences;
    }

    /**
     * Process sections for analysis
     */
    processSections(sections) {
        const processed = {};
        
        for (const [sectionName, content] of Object.entries(sections)) {
            if (!content || typeof content !== 'string') continue;
            
            let processedContent = this.cleanText(content);
            
            // Limit section size
            if (processedContent.length > this.config.maxSectionSize) {
                processedContent = processedContent.substring(0, this.config.maxSectionSize) + '...';
            }
            
            const sentences = this.extractSentences(processedContent);
            
            // Limit sentences per section
            const limitedSentences = sentences.slice(0, this.config.maxSentencesPerSection);
            
            processed[sectionName] = {
                content: processedContent,
                sentences: limitedSentences,
                hash: this.hashText(processedContent),
                stats: {
                    originalLength: content.length,
                    processedLength: processedContent.length,
                    sentenceCount: limitedSentences.length
                }
            };
        }
        
        return processed;
    }

    /**
     * Generate hash for text
     */
    hashText(text) {
        let hash = 0;
        for (let i = 0; i < Math.min(text.length, 100); i++) {
            hash = ((hash << 5) - hash) + text.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
}

/**
 * Manages data type inference and validation
 */
class TypeInferencer {
    constructor() {
        this.typePatterns = {
            number: /^-?\d+\.?\d*$/,
            date: /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/,
            url: /^https?:\/\/.+/i,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            boolean: /^(true|false|yes|no|0|1)$/i
        };
    }

    /**
     * Infer data type from template property
     */
    inferFromTemplate(templateProperty) {
        if (!templateProperty) return 'text';
        
        const dataType = templateProperty.dataType || templateProperty.type || 'text';
        
        // Map template types to extraction types
        const typeMap = {
            'resource': 'text',
            'number': 'number',
            'integer': 'number',
            'float': 'number',
            'date': 'date',
            'boolean': 'boolean',
            'url': 'url',
            'text': 'text',
            'string': 'text'
        };
        
        return typeMap[dataType.toLowerCase()] || 'text';
    }

    /**
     * Validate value against expected type
     */
    validateValue(value, expectedType) {
        if (!value) return false;
        
        const strValue = String(value).trim();
        
        switch (expectedType) {
            case 'number':
                return this.typePatterns.number.test(strValue);
            case 'date':
                return this.typePatterns.date.test(strValue);
            case 'url':
                return this.typePatterns.url.test(strValue);
            case 'email':
                return this.typePatterns.email.test(strValue);
            case 'boolean':
                return this.typePatterns.boolean.test(strValue);
            default:
                return strValue.length > 0;
        }
    }

    /**
     * Convert value to expected type
     */
    convertValue(value, expectedType) {
        if (!value) return null;
        
        const strValue = String(value).trim();
        
        switch (expectedType) {
            case 'number':
                const num = parseFloat(strValue);
                return isNaN(num) ? null : num;
            case 'boolean':
                return /^(true|yes|1)$/i.test(strValue);
            default:
                return strValue;
        }
    }
}

/**
 * Handles JSON parsing and repair
 */
class JSONParser {
    constructor() {
        this.repairStrategies = [
            this.parseDirectly,
            this.extractJSONBlock,
            this.repairCommonIssues,
            this.extractWithRegex,
            this.buildFromPatterns
        ];
    }

    /**
     * Parse JSON with multiple fallback strategies
     */
    parse(text) {
        if (!text) return null;
        
        for (const strategy of this.repairStrategies) {
            try {
                const result = strategy.call(this, text);
                if (result && typeof result === 'object') {
                    return result;
                }
            } catch (e) {
                continue;
            }
        }
        
        return null;
    }

    /**
     * Direct JSON parsing
     */
    parseDirectly(text) {
        return JSON.parse(text);
    }

    /**
     * Extract JSON block from text
     */
    extractJSONBlock(text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('No JSON block found');
    }

    /**
     * Repair common JSON issues
     */
    repairCommonIssues(text) {
        let repaired = text
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/'/g, '"')
            .replace(/(\w+):/g, '"$1":')
            .replace(/:\s*'([^']*)'/g, ': "$1"')
            .replace(/"\s*:\s*([^",}\]]+)([,}\]])/g, '": "$1"$2')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ');
        
        return JSON.parse(repaired);
    }

    /**
     * Extract data using regex patterns
     */
    extractWithRegex(text) {
        const result = {};
        
        // Look for property-value patterns
        const propertyPattern = /"?(\w+)"?\s*:\s*"([^"]+)"/g;
        let match;
        
        while ((match = propertyPattern.exec(text)) !== null) {
            const [_, property, value] = match;
            if (!result[property]) {
                result[property] = [];
            }
            result[property].push({
                value: value,
                section: 'unknown',
                sentence: value,
                confidence: 0.5
            });
        }
        
        if (Object.keys(result).length > 0) {
            return result;
        }
        
        throw new Error('No patterns found');
    }

    /**
     * Build JSON from common patterns
     */
    buildFromPatterns(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const result = {};
        
        for (const line of lines) {
            // Pattern: property: value
            const match = line.match(/^([^:]+):\s*(.+)$/);
            if (match) {
                const [_, property, value] = match;
                const propName = property.trim().replace(/[^a-zA-Z0-9_]/g, '_');
                
                if (!result[propName]) {
                    result[propName] = [];
                }
                
                result[propName].push({
                    value: value.trim(),
                    section: 'extracted',
                    sentence: line,
                    confidence: 0.4
                });
            }
        }
        
        if (Object.keys(result).length > 0) {
            return result;
        }
        
        throw new Error('No valid patterns found');
    }
}

/**
 * Generates optimized prompts for LLM
 */
class PromptGenerator {
    constructor(config) {
        this.config = config;
    }

    /**
     * Generate multi-property analysis prompt
     */
    generateMultiPropertyPrompt(sections, properties) {
        const sectionsList = Object.entries(sections)
            .map(([name, data]) => `- ${name}: ${data.sentences.length} sentences`)
            .join('\n');
        
        const propertiesList = properties
            .map(p => `- ${p.label} (${p.dataType || 'text'}): ${p.description || 'No description'}`)
            .join('\n');
        
        return `You are analyzing a scientific paper to extract specific property values.

IMPORTANT RULES:
1. Each sentence can only be used ONCE across all properties
2. Scan ALL sections thoroughly, not just the first match
3. Return actual values found in the text, not descriptions
4. Each property can have multiple values from different sections
5. Include confidence scores (0-1) for each extraction

SECTIONS TO ANALYZE:
${sectionsList}

PROPERTIES TO EXTRACT:
${propertiesList}

PAPER CONTENT:
${this.formatSectionsForPrompt(sections)}

Return a JSON object where each property maps to an array of found values:
{
  "propertyLabel": [
    {
      "value": "extracted value",
      "section": "section name",
      "sentence": "exact sentence containing the value",
      "confidence": 0.85
    }
  ]
}

Remember: Each sentence may only be used once. If a sentence could match multiple properties, assign it to the most relevant one.`;
    }

    /**
     * Generate single property prompt
     */
    generateSinglePropertyPrompt(sections, property) {
        const dataTypeHint = this.getDataTypeHint(property.dataType);
        
        return `Extract values for the property "${property.label}" from this scientific paper.

Property Description: ${property.description || 'No description provided'}
Expected Data Type: ${property.dataType || 'text'}
${dataTypeHint}

IMPORTANT: 
- Scan ALL sections thoroughly
- Return actual values, not descriptions
- Each value must come from a unique sentence
- Include confidence scores

PAPER CONTENT:
${this.formatSectionsForPrompt(sections)}

Return a JSON array of found values:
[
  {
    "value": "extracted value",
    "section": "section name", 
    "sentence": "exact sentence",
    "confidence": 0.85
  }
]`;
    }

    /**
     * Format sections for prompt
     */
    formatSectionsForPrompt(sections) {
        return Object.entries(sections)
            .map(([name, data]) => {
                const sentences = data.sentences.slice(0, 30).join(' ');
                return `\n[${name}]\n${sentences}`;
            })
            .join('\n\n');
    }

    /**
     * Get data type specific hints
     */
    getDataTypeHint(dataType) {
        const hints = {
            number: 'Look for numerical values, measurements, statistics, counts.',
            date: 'Look for dates, years, time periods, temporal references.',
            url: 'Look for web addresses, links, DOIs.',
            boolean: 'Look for yes/no statements, presence/absence, true/false.',
            resource: 'Look for names, identifiers, references to entities.',
            text: 'Look for descriptive text, explanations, definitions.'
        };
        
        return hints[dataType] ? `Hint: ${hints[dataType]}` : '';
    }
}

/**
 * Deterministic fallback extractor
 */
class DeterministicExtractor {
    constructor(config, typeInferencer) {
        this.config = config;
        this.typeInferencer = typeInferencer;
    }

    /**
     * Extract values using deterministic patterns
     */
    extract(sections, property) {
        const results = [];
        const expectedType = this.typeInferencer.inferFromTemplate(property);
        const patterns = this.getPatternsForProperty(property, expectedType);
        
        for (const [sectionName, sectionData] of Object.entries(sections)) {
            const matches = this.findMatches(
                sectionData.sentences,
                patterns,
                expectedType
            );
            
            for (const match of matches) {
                results.push({
                    value: match.value,
                    section: sectionName,
                    sentence: match.sentence,
                    confidence: match.confidence * 0.7, // Lower confidence for fallback
                    source: 'deterministic'
                });
                
                if (results.length >= this.config.maxValuesPerProperty) {
                    break;
                }
            }
            
            if (results.length >= this.config.maxValuesPerProperty) {
                break;
            }
        }
        
        return results;
    }

    /**
     * Get patterns for property extraction
     */
    getPatternsForProperty(property, expectedType) {
        const label = property.label.toLowerCase();
        const patterns = [];
        
        // Type-specific patterns
        switch (expectedType) {
            case 'number':
                patterns.push(
                    new RegExp(`${label}[^0-9]*([0-9]+\\.?[0-9]*)`, 'i'),
                    new RegExp(`([0-9]+\\.?[0-9]*)\\s*${label}`, 'i'),
                    /\b\d+\.?\d*\b/g
                );
                break;
                
            case 'date':
                patterns.push(
                    /\b\d{4}\b/g,
                    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
                    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi
                );
                break;
                
            case 'url':
                patterns.push(
                    /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
                    /doi:\s*[^\s]+/gi
                );
                break;
                
            default:
                // Generic text patterns
                patterns.push(
                    new RegExp(`${label}[^.]*?[:=]\\s*([^.]+)`, 'i'),
                    new RegExp(`([^.]*${label}[^.]*)`, 'i')
                );
        }
        
        return patterns;
    }

    /**
     * Find matches in sentences
     */
    findMatches(sentences, patterns, expectedType) {
        const matches = [];
        const seenValues = new Set();
        
        for (const sentence of sentences) {
            for (const pattern of patterns) {
                const regex = new RegExp(pattern);
                let match;
                
                while ((match = regex.exec(sentence)) !== null) {
                    const value = match[1] || match[0];
                    
                    if (this.typeInferencer.validateValue(value, expectedType)) {
                        const normalizedValue = value.trim();
                        
                        if (!seenValues.has(normalizedValue)) {
                            seenValues.add(normalizedValue);
                            matches.push({
                                value: normalizedValue,
                                sentence: sentence,
                                confidence: this.calculatePatternConfidence(pattern, expectedType)
                            });
                        }
                    }
                    
                    if (matches.length >= this.config.maxValuesPerProperty) {
                        return matches;
                    }
                }
            }
        }
        
        return matches;
    }

    /**
     * Calculate confidence based on pattern type
     */
    calculatePatternConfidence(pattern, expectedType) {
        if (expectedType === 'number' && /\d+/.test(pattern.source)) {
            return 0.7;
        }
        if (expectedType === 'date') {
            return 0.8;
        }
        if (expectedType === 'url') {
            return 0.9;
        }
        return 0.5;
    }
}

/**
 * Validates and post-processes extraction results
 */
class ResultValidator {
    constructor(config, typeInferencer, sentencePool) {
        this.config = config;
        this.typeInferencer = typeInferencer;
        this.sentencePool = sentencePool;
    }

    /**
     * Validate and clean extraction results
     */
    validateResults(results, property) {
        if (!results || !Array.isArray(results)) {
            return [];
        }
        
        const expectedType = this.typeInferencer.inferFromTemplate(property);
        const validated = [];
        const seenValues = new Set();
        
        for (const result of results) {
            if (!this.isValidResult(result)) continue;
            
            // Check sentence availability
            if (this.config.enableSentenceDeduplication && 
                !this.sentencePool.isAvailable(result.sentence)) {
                result.conflict = true;
                result.confidence *= 0.5;
                continue;
            }
            
            // Validate value type
            if (!this.typeInferencer.validateValue(result.value, expectedType)) {
                continue;
            }
            
            // Convert value to expected type
            const convertedValue = this.typeInferencer.convertValue(result.value, expectedType);
            if (convertedValue === null) continue;
            
            // Check for duplicates
            const valueKey = String(convertedValue).toLowerCase();
            if (seenValues.has(valueKey)) continue;
            
            seenValues.add(valueKey);
            
            // Mark sentence as used
            if (this.config.enableSentenceDeduplication) {
                this.sentencePool.markUsed(result.sentence, property.id || property.label);
            }
            
            validated.push({
                ...result,
                value: convertedValue,
                expectedType: expectedType,
                validated: true
            });
            
            if (validated.length >= this.config.maxValuesPerProperty) {
                break;
            }
        }
        
        return validated;
    }

    /**
     * Check if result object is valid
     */
    isValidResult(result) {
        return result &&
               typeof result === 'object' &&
               result.value !== undefined &&
               result.value !== null &&
               result.value !== '' &&
               result.sentence &&
               result.section &&
               typeof result.confidence === 'number';
    }

    /**
     * Merge and deduplicate results from multiple sources
     */
    mergeResults(llmResults, deterministicResults) {
        const merged = [];
        const seenValues = new Set();
        
        // Add LLM results first (higher priority)
        for (const result of llmResults) {
            const key = `${result.value}_${result.sentence}`;
            if (!seenValues.has(key)) {
                seenValues.add(key);
                merged.push(result);
            }
        }
        
        // Add deterministic results if needed
        for (const result of deterministicResults) {
            const key = `${result.value}_${result.sentence}`;
            if (!seenValues.has(key) && merged.length < this.config.maxValuesPerProperty) {
                seenValues.add(key);
                merged.push(result);
            }
        }
        
        // Sort by confidence
        return merged.sort((a, b) => b.confidence - a.confidence);
    }
}

/**
 * Main RAG Helper class - Orchestrates the extraction process
 */
class EnhancedRAGHelper {
    constructor(options = {}) {
        this.config = new RAGConfig(options);
        this.textProcessor = new TextProcessor(this.config);
        this.typeInferencer = new TypeInferencer();
        this.jsonParser = new JSONParser();
        this.promptGenerator = new PromptGenerator(this.config);
        this.sentencePool = new SentencePool();
        this.deterministicExtractor = new DeterministicExtractor(this.config, this.typeInferencer);
        this.resultValidator = new ResultValidator(this.config, this.typeInferencer, this.sentencePool);
        
        this.stats = {
            totalExtractions: 0,
            llmCalls: 0,
            fallbacksUsed: 0,
            parseErrors: 0,
            validationErrors: 0
        };
    }

    /**
     * Main extraction method - handles single or multiple properties
     */
    async extract(sections, properties, llmProvider) {
        this.stats.totalExtractions++;
        
        // Process sections
        const processedSections = this.textProcessor.processSections(sections);
        
        // Log section coverage
        if (this.config.debugMode) {
            this.logSectionCoverage(processedSections);
        }
        
        // Clear sentence pool for new extraction
        this.sentencePool.clear();
        
        // Ensure properties is an array
        const propertyList = Array.isArray(properties) ? properties : [properties];
        
        // Decide extraction strategy
        if (this.config.enableMultiPropertyAnalysis && propertyList.length > 1) {
            return await this.extractMultipleProperties(processedSections, propertyList, llmProvider);
        } else {
            return await this.extractSingleProperties(processedSections, propertyList, llmProvider);
        }
    }

    /**
     * Extract multiple properties in a single LLM call
     */
    async extractMultipleProperties(sections, properties, llmProvider) {
        const results = {};
        
        try {
            // Generate multi-property prompt
            const prompt = this.promptGenerator.generateMultiPropertyPrompt(sections, properties);
            
            // Call LLM
            this.stats.llmCalls++;
            const llmResponse = await this.callLLM(llmProvider, prompt);
            
            // Parse response
            const parsed = this.jsonParser.parse(llmResponse);
            
            if (parsed && typeof parsed === 'object') {
                // Process each property's results
                for (const property of properties) {
                    const propertyKey = property.label || property.id;
                    const rawResults = parsed[propertyKey] || [];
                    
                    // Validate and process results
                    const validated = this.resultValidator.validateResults(rawResults, property);
                    
                    // If no LLM results, try deterministic fallback
                    if (validated.length === 0 && this.config.enableDeterministicFallback) {
                        this.stats.fallbacksUsed++;
                        const fallbackResults = this.deterministicExtractor.extract(sections, property);
                        results[propertyKey] = this.resultValidator.validateResults(fallbackResults, property);
                    } else {
                        results[propertyKey] = validated;
                    }
                }
            } else {
                // If parsing failed, fall back to individual extraction
                return await this.extractSingleProperties(sections, properties, llmProvider);
            }
            
        } catch (error) {
            console.error('Multi-property extraction failed:', error);
            this.stats.parseErrors++;
            
            // Fall back to individual extraction
            return await this.extractSingleProperties(sections, properties, llmProvider);
        }
        
        return results;
    }

    /**
     * Extract properties one by one
     */
    async extractSingleProperties(sections, properties, llmProvider) {
        const results = {};
        
        for (const property of properties) {
            const propertyKey = property.label || property.id;
            
            try {
                // Try LLM extraction first
                const llmResults = await this.extractWithLLM(sections, property, llmProvider);
                
                // Try deterministic extraction
                let deterministicResults = [];
                if (this.config.enableDeterministicFallback) {
                    deterministicResults = this.deterministicExtractor.extract(sections, property);
                }
                
                // Merge and validate results
                const merged = this.resultValidator.mergeResults(
                    llmResults,
                    deterministicResults
                );
                
                results[propertyKey] = merged;
                
            } catch (error) {
                console.error(`Extraction failed for property ${propertyKey}:`, error);
                this.stats.validationErrors++;
                
                // Use only deterministic fallback on error
                if (this.config.enableDeterministicFallback) {
                    this.stats.fallbacksUsed++;
                    const fallbackResults = this.deterministicExtractor.extract(sections, property);
                    results[propertyKey] = this.resultValidator.validateResults(fallbackResults, property);
                } else {
                    results[propertyKey] = [];
                }
            }
        }
        
        return results;
    }

    /**
     * Extract single property with LLM
     */
    async extractWithLLM(sections, property, llmProvider) {
        try {
            // Generate prompt
            const prompt = this.promptGenerator.generateSinglePropertyPrompt(sections, property);
            
            // Call LLM
            this.stats.llmCalls++;
            const llmResponse = await this.callLLM(llmProvider, prompt);
            
            // Parse response
            const parsed = this.jsonParser.parse(llmResponse);
            
            if (Array.isArray(parsed)) {
                return this.resultValidator.validateResults(parsed, property);
            } else if (parsed && typeof parsed === 'object') {
                // Handle object response with property key
                const propertyKey = property.label || property.id;
                const results = parsed[propertyKey] || [];
                return this.resultValidator.validateResults(results, property);
            }
            
            return [];
            
        } catch (error) {
            console.error('LLM extraction error:', error);
            this.stats.parseErrors++;
            return [];
        }
    }

    /**
     * Call LLM with retry logic
     */
    async callLLM(llmProvider, prompt, retries = 2) {
        for (let i = 0; i <= retries; i++) {
            try {
                if (llmProvider && typeof llmProvider.complete === 'function') {
                    const response = await llmProvider.complete(prompt);
                    if (response) return response;
                } else {
                    throw new Error('Invalid LLM provider');
                }
            } catch (error) {
                if (i === retries) throw error;
                await this.delay(1000 * (i + 1)); // Exponential backoff
            }
        }
    }

    /**
     * Log section coverage for debugging
     */
    logSectionCoverage(sections) {
        console.log('=== Section Coverage ===');
        for (const [name, data] of Object.entries(sections)) {
            console.log(`${name}:`);
            console.log(`  - Hash: ${data.hash}`);
            console.log(`  - Sentences: ${data.stats.sentenceCount}`);
            console.log(`  - Original: ${data.stats.originalLength} chars`);
            console.log(`  - Processed: ${data.stats.processedLength} chars`);
        }
        console.log('=== Sentence Pool Stats ===');
        console.log(this.sentencePool.getStats());
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get extraction statistics
     */
    getStats() {
        return {
            ...this.stats,
            sentencePoolStats: this.sentencePool.getStats(),
            config: {
                maxSectionSize: this.config.maxSectionSize,
                maxValuesPerProperty: this.config.maxValuesPerProperty,
                enableMultiProperty: this.config.enableMultiPropertyAnalysis
            }
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalExtractions: 0,
            llmCalls: 0,
            fallbacksUsed: 0,
            parseErrors: 0,
            validationErrors: 0
        };
        this.sentencePool.clear();
    }
}

// Export for use in browser extension environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedRAGHelper;
} else if (typeof window !== 'undefined') {
    window.EnhancedRAGHelper = EnhancedRAGHelper;
}
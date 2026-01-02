// ================================
// src/background/services/rag-background-service.js
// Enhanced RAG service with smart property-value matching
// ================================

var RAGBackgroundService = (function() {
    'use strict';
    
    // Private variables
    var isInitialized = false;
    var cache = new Map();
    var cacheTimeout = 5 * 60 * 1000;
    var openAIService = null;
    
    // Configuration
    var config = {
        timeout: 120000,
        maxRetries: 3,
        retryDelay: 2000,
        batchSize: 3,
        maxConcurrentRequests: 2,
        confidenceThreshold: 0.3,
        delayBetweenBatches: 1500
    };
    
    // Statistics
    var stats = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        errors: 0,
        processedProperties: 0,
        totalMatches: 0,
        openAIRequests: 0,
        fallbackUsed: 0
    };
    
    /**
     * Initialize the RAG service
     */
    function init() {
        if (isInitialized) return Promise.resolve();
        
        console.log('🤖 Initializing Enhanced RAG Background Service...');
        
        // Initialize OpenAI service if available
        if (typeof OpenAIBackgroundService !== 'undefined') {
            openAIService = new OpenAIBackgroundService();
            return openAIService.init().then(function(success) {
                if (success) {
                    console.log('✅ OpenAI service ready for RAG analysis');
                } else {
                    console.warn('⚠️ OpenAI service not configured - RAG will use fallbacks');
                    openAIService = null;
                }
                
                // Clean up old cache entries periodically
                setInterval(cleanupCache, 60000);
                
                isInitialized = true;
                console.log('✅ Enhanced RAG Background Service initialized');
                return true;
            });
        } else {
            console.warn('⚠️ OpenAI service not available - using fallbacks only');
            isInitialized = true;
            return Promise.resolve();
        }
    }
    
    /**
     * Main function to analyze paper sections for property values
     */
    function analyzePaperSections(extractedData, template, options) {
        return new Promise(function(resolve, reject) {
            init().then(function() {
                var sections = extractedData.sections || extractedData;
                var properties = extractTemplateProperties(template);
                
                if (!properties || properties.length === 0) {
                    reject(new Error('No properties found in template'));
                    return;
                }
                
                console.log('🔍 Starting smart property-value extraction');
                console.log('📋 Properties to analyze:', properties.length);
                console.log('📄 Available sections:', Object.keys(sections).length);
                
                // Reset stats for this analysis
                stats.processedProperties = 0;
                stats.totalMatches = 0;
                stats.openAIRequests = 0;
                stats.fallbackUsed = 0;
                
                // Process properties in batches
                processPropertiesInBatches(properties, sections, options || {})
                    .then(function(results) {
                        var summary = {
                            totalProperties: properties.length,
                            processedProperties: stats.processedProperties,
                            totalMatches: stats.totalMatches,
                            openAIRequests: stats.openAIRequests,
                            fallbackUsed: stats.fallbackUsed,
                            results: results
                        };
                        
                        console.log('✅ RAG Analysis Complete:', summary);
                        resolve(summary);
                    })
                    .catch(reject);
            }).catch(reject);
        });
    }
    
    /**
     * Extract properties from template
     */
    function extractTemplateProperties(template) {
        if (template.properties && Array.isArray(template.properties)) {
            return template.properties.map(function(prop, index) {
                return {
                    id: prop.id || 'prop_' + index,
                    label: prop.label || prop.name,
                    description: prop.description || '',
                    type: prop.type || 'text',
                    required: prop.required || false,
                    index: index
                };
            });
        } else if (template.template && template.template.properties) {
            return extractTemplateProperties(template.template);
        }
        return [];
    }
    
    /**
     * Process properties in batches for better performance
     */
    function processPropertiesInBatches(properties, sections, options) {
        return new Promise(function(resolve, reject) {
            var results = {};
            var batchSize = options.batchSize || config.batchSize;
            var currentBatch = 0;
            var totalBatches = Math.ceil(properties.length / batchSize);
            var progressCallback = options.progressCallback;
            var delayBetweenBatches = options.delayBetweenBatches || config.delayBetweenBatches;
            
            function processNextBatch() {
                var startIdx = currentBatch * batchSize;
                var endIdx = Math.min(startIdx + batchSize, properties.length);
                var batchProperties = properties.slice(startIdx, endIdx);
                
                if (batchProperties.length === 0) {
                    resolve(results);
                    return;
                }
                
                var batchNumber = currentBatch + 1;
                var progress = Math.round((startIdx / properties.length) * 100);
                
                console.log('📦 Processing batch ' + batchNumber + '/' + totalBatches);
                
                // Send progress update
                sendProgressUpdate('analyzing', progress, 
                    'Processing batch ' + batchNumber + '/' + totalBatches + 
                    ' (' + batchProperties.length + ' properties)');
                
                // Process current batch
                var batchPromises = batchProperties.map(function(property, index) {
                    var propertyIndex = startIdx + index;
                    var propertyProgress = Math.round(((propertyIndex + 1) / properties.length) * 100);
                    
                    // Send property-specific progress
                    sendProgressUpdate('analyzing', propertyProgress,
                        'Analyzing property: "' + property.label + '" (' + 
                        (propertyIndex + 1) + '/' + properties.length + ')');
                    
                    return analyzePropertyAcrossSections(property, sections, propertyIndex, properties.length)
                        .then(function(result) {
                            stats.processedProperties++;
                            
                            // Count matches
                            if (result.values && result.values.length > 0) {
                                stats.totalMatches += result.values.length;
                                
                                // Log successful extraction
                                console.log('✅ Found ' + result.values.length + 
                                          ' value(s) for "' + property.label + '"');
                                
                                // Send success log to overlay
                                sendProgressUpdate('analyzing', propertyProgress,
                                    '✅ Found values for "' + property.label + '" in ' +
                                    result.values.map(function(v) { return v.section; }).join(', '));
                            } else {
                                console.log('⚫ No values found for "' + property.label + '"');
                            }
                            
                            results[property.id] = result;
                            return result;
                        })
                        .catch(function(error) {
                            console.error('❌ Error processing property "' + property.label + '":', error);
                            stats.errors++;
                            
                            results[property.id] = {
                                property: property.label,
                                property_id: property.id,
                                values: [],
                                error: error.message,
                                processing_failed: true
                            };
                            
                            return null;
                        });
                });
                
                Promise.all(batchPromises).then(function() {
                    currentBatch++;
                    
                    if (currentBatch < totalBatches) {
                        // Add delay between batches to avoid rate limiting
                        console.log('⏳ Waiting ' + delayBetweenBatches + 'ms before next batch...');
                        
                        sendProgressUpdate('analyzing', progress,
                            'Preparing next batch... (' + currentBatch + '/' + totalBatches + ' completed)');
                        
                        setTimeout(processNextBatch, delayBetweenBatches);
                    } else {
                        // All batches complete
                        sendProgressUpdate('complete', 100,
                            '✅ Analysis complete! Found ' + stats.totalMatches + ' total values');
                        processNextBatch();
                    }
                }).catch(reject);
            }
            
            processNextBatch();
        });
    }
    
    /**
     * Analyze a property across all sections to find values
     */
    function analyzePropertyAcrossSections(property, sections, propertyIndex, totalProperties) {
        return new Promise(function(resolve, reject) {
            stats.totalRequests++;
            
            // Check cache first
            var cacheKey = generateCacheKey(property, sections);
            var cached = getFromCache(cacheKey);
            
            if (cached) {
                stats.cacheHits++;
                console.log('💾 Using cached result for: ' + property.label);
                resolve(cached);
                return;
            }
            
            stats.cacheMisses++;
            
            // Use OpenAI service if available
            if (openAIService && typeof openAIService.analyzePropertyWithRAG === 'function') {
                stats.openAIRequests++;
                
                openAIService.analyzePropertyWithRAG(property, sections)
                    .then(function(result) {
                        // Ensure result has proper structure
                        result = normalizeRAGResult(result, property);
                        
                        // Cache the result
                        setCache(cacheKey, result);
                        resolve(result);
                    })
                    .catch(function(error) {
                        console.warn('⚠️ OpenAI analysis failed for "' + property.label + '", using fallback');
                        stats.fallbackUsed++;
                        
                        var fallbackResult = performEnhancedFallbackAnalysis(property, sections);
                        setCache(cacheKey, fallbackResult);
                        resolve(fallbackResult);
                    });
            } else {
                // Use fallback analysis
                stats.fallbackUsed++;
                var fallbackResult = performEnhancedFallbackAnalysis(property, sections);
                setCache(cacheKey, fallbackResult);
                resolve(fallbackResult);
            }
        });
    }
    
    /**
     * Normalize RAG result to ensure consistent structure
     */
    function normalizeRAGResult(result, property) {
        // Ensure base structure
        if (!result || typeof result !== 'object') {
            result = {};
        }
        
        result.property = property.label;
        result.property_id = property.id;
        result.property_type = property.type || 'text';
        result.extraction_method = result.extraction_method || 'openai';
        
        // Ensure values array exists
        if (!Array.isArray(result.values)) {
            result.values = [];
        }
        
        // Process each value
        result.values = result.values.map(function(value, index) {
            return normalizeValue(value, property, index);
        });
        
        // Calculate overall confidence
        if (result.values.length > 0) {
            var totalConfidence = result.values.reduce(function(sum, val) {
                return sum + (val.confidence || 0);
            }, 0);
            result.overall_confidence = totalConfidence / result.values.length;
            result.primary_value = result.values[0];
        } else {
            result.overall_confidence = 0;
        }
        
        // Add metadata
        result.metadata = result.metadata || {
            extraction_method: result.extraction_method,
            property_type: property.type || 'text',
            timestamp: new Date().toISOString()
        };
        
        return result;
    }
    
    /**
     * Normalize individual value structure
     */
    function normalizeValue(value, property, index) {
        // Ensure all required fields
        var normalized = {
            id: value.id || 'value_' + Date.now() + '_' + index,
            value: value.value || '',
            sentence: value.sentence || value.value || '',
            section: value.section || 'unknown',
            sentenceIndex: typeof value.sentenceIndex === 'number' ? value.sentenceIndex : 0,
            confidence: typeof value.confidence === 'number' ? value.confidence : 0.5,
            evidence: value.evidence || {},
            location: value.location || {},
            highlight: value.highlight || {},
            metadata: value.metadata || {}
        };
        
        // Ensure evidence structure
        normalized.evidence = {
            reasoning: normalized.evidence.reasoning || 'Extracted from text',
            context: normalized.evidence.context || '',
            implicit: normalized.evidence.implicit || false,
            explanation: normalized.evidence.explanation || normalized.evidence.reasoning
        };
        
        // Ensure highlight structure
        normalized.highlight = {
            text: normalized.sentence,
            color: normalized.highlight.color || generatePropertyColor(property.label),
            propertyId: property.id,
            propertyLabel: property.label
        };
        
        // Ensure location structure
        if (!normalized.location.found) {
            normalized.location = {
                section: normalized.section,
                sentenceIndex: normalized.sentenceIndex,
                found: true
            };
        }
        
        // Ensure metadata
        normalized.metadata = {
            property_type: property.type || 'text',
            extraction_method: normalized.metadata.extraction_method || 'rag',
            timestamp: normalized.metadata.timestamp || new Date().toISOString(),
            index: index
        };
        
        return normalized;
    }
    
    /**
     * Enhanced fallback analysis with better pattern matching
     */
    function performEnhancedFallbackAnalysis(property, sections) {
        console.log('🔄 Using enhanced fallback analysis for: ' + property.label);
        
        var result = {
            property: property.label,
            property_id: property.id,
            property_type: property.type || 'text',
            values: [],
            extraction_method: 'fallback',
            overall_confidence: 0,
            metadata: {
                extraction_method: 'fallback',
                property_type: property.type || 'text',
                sections_analyzed: Object.keys(sections),
                timestamp: new Date().toISOString()
            }
        };
        
        // Create comprehensive search patterns
        var patterns = createComprehensivePatterns(property);
        var foundValues = [];
        
        // Search each section
        for (var sectionName in sections) {
            var sectionText = sections[sectionName];
            
            if (typeof sectionText === 'string' && sectionText.length > 50) {
                var matches = findPatternMatches(sectionText, patterns, property, sectionName);
                foundValues = foundValues.concat(matches);
            }
        }
        
        // Deduplicate and sort by confidence
        foundValues = deduplicateValues(foundValues);
        foundValues.sort(function(a, b) {
            return b.confidence - a.confidence;
        });
        
        // Take top results above threshold
        result.values = foundValues
            .filter(function(v) { return v.confidence >= config.confidenceThreshold; })
            .slice(0, 5);
        
        // Normalize values
        result.values = result.values.map(function(value, index) {
            return normalizeValue(value, property, index);
        });
        
        // Calculate overall confidence
        if (result.values.length > 0) {
            var totalConfidence = result.values.reduce(function(sum, val) {
                return sum + val.confidence;
            }, 0);
            result.overall_confidence = totalConfidence / result.values.length;
            result.primary_value = result.values[0];
        }
        
        return result;
    }
    
    /**
     * Create comprehensive patterns for property matching
     */
    function createComprehensivePatterns(property) {
        var patterns = [];
        var label = property.label.toLowerCase();
        var words = label.split(/[\s\-_]+/);
        
        // Base patterns
        patterns.push({
            regex: new RegExp('\\b' + label.replace(/[\s\-_]+/g, '\\s*') + '\\s*[:=]\\s*([^.;,\\n]+)', 'i'),
            type: 'direct',
            confidence: 0.8
        });
        
        // Property-specific patterns
        if (label.includes('method') || label.includes('approach') || label.includes('technique')) {
            patterns = patterns.concat(createMethodPatterns());
        }
        
        if (label.includes('result') || label.includes('finding') || label.includes('outcome')) {
            patterns = patterns.concat(createResultPatterns());
        }
        
        if (label.includes('dataset') || label.includes('data') || label.includes('corpus')) {
            patterns = patterns.concat(createDatasetPatterns());
        }
        
        if (label.includes('model') || label.includes('algorithm') || label.includes('architecture')) {
            patterns = patterns.concat(createModelPatterns());
        }
        
        if (label.includes('accuracy') || label.includes('performance') || 
            label.includes('score') || label.includes('metric')) {
            patterns = patterns.concat(createMetricPatterns());
        }
        
        if (label.includes('limitation') || label.includes('challenge') || label.includes('issue')) {
            patterns = patterns.concat(createLimitationPatterns());
        }
        
        if (label.includes('contribution') || label.includes('novelty')) {
            patterns = patterns.concat(createContributionPatterns());
        }
        
        return patterns;
    }
    
    /**
     * Pattern creators for different property types
     */
    function createMethodPatterns() {
        return [
            { regex: /(?:we|this study|our)\s+(?:used?|employ(?:ed)?|apply|applied|utilize[d]?)\s+([^.;,]+)/i, type: 'method_used', confidence: 0.6 },
            { regex: /(?:the|our)\s+(?:method|approach|technique)\s+(?:is|was|involves?)\s+([^.;,]+)/i, type: 'method_description', confidence: 0.6 },
            { regex: /(?:using|through|via|by)\s+([^.;,]+)\s+(?:method|approach|technique)/i, type: 'method_reference', confidence: 0.5 },
            { regex: /(?:based on|following)\s+([^.;,]+)\s+(?:method|approach)/i, type: 'method_basis', confidence: 0.5 }
        ];
    }
    
    function createResultPatterns() {
        return [
            { regex: /(?:we|our study)\s+(?:found|discovered|observed)\s+(?:that\s+)?([^.;]+)/i, type: 'result_found', confidence: 0.6 },
            { regex: /(?:results?|findings?)\s+(?:show(?:ed)?|indicate[d]?|demonstrate[d]?)\s+(?:that\s+)?([^.;]+)/i, type: 'result_show', confidence: 0.7 },
            { regex: /(?:main|key|primary)\s+(?:result|finding)\s+(?:is|was)\s+([^.;]+)/i, type: 'result_main', confidence: 0.7 },
            { regex: /(?:achieved|obtained|reached)\s+([^.;]+)\s+(?:performance|accuracy|score)/i, type: 'result_achievement', confidence: 0.6 }
        ];
    }
    
    function createDatasetPatterns() {
        return [
            { regex: /\b([A-Z][A-Za-z0-9\-]+(?:\s+[A-Z][A-Za-z0-9\-]+)*)\s+(?:dataset|corpus|collection)/i, type: 'dataset_name', confidence: 0.7 },
            { regex: /(?:dataset|data|corpus)\s+(?:of|containing|with)\s+([^.;,]+)/i, type: 'dataset_description', confidence: 0.5 },
            { regex: /(?:trained on|tested on|evaluated on)\s+([^.;,]+)\s+(?:dataset|data)/i, type: 'dataset_usage', confidence: 0.6 },
            { regex: /(?:collected|gathered|compiled)\s+([^.;,]+)\s+(?:data|samples|examples)/i, type: 'dataset_collection', confidence: 0.5 }
        ];
    }
    
    function createModelPatterns() {
        return [
            { regex: /(?:model|algorithm|network|architecture)\s+(?:is|was|called)\s+([A-Za-z0-9\-_]+)/i, type: 'model_name', confidence: 0.6 },
            { regex: /(?:using|with|based on)\s+([A-Za-z0-9\-_]+)\s+(?:model|algorithm|network)/i, type: 'model_used', confidence: 0.6 },
            { regex: /(?:proposed|developed|designed)\s+(?:a|an)?\s*([^.;,]+)\s+(?:model|algorithm)/i, type: 'model_proposed', confidence: 0.6 },
            { regex: /\b([A-Z][A-Za-z0-9\-]+(?:\s+[A-Z][A-Za-z0-9\-]+)*)\s+(?:model|network|architecture)/i, type: 'model_reference', confidence: 0.5 }
        ];
    }
    
    function createMetricPatterns() {
        return [
            { regex: /(?:accuracy|performance|score|f1|precision|recall)\s+(?:of|is|was|reached|achieved)?\s*([0-9.]+%?)/i, type: 'metric_value', confidence: 0.7 },
            { regex: /(?:achieved|reached|obtained)\s+([0-9.]+%?)\s+(?:accuracy|performance|score)/i, type: 'metric_achievement', confidence: 0.7 },
            { regex: /(?:improved|increased|enhanced)\s+(?:by|to)\s+([0-9.]+%?)/i, type: 'metric_improvement', confidence: 0.6 },
            { regex: /(?:baseline|sota|state-of-the-art)\s+(?:is|was|achieved)?\s*([0-9.]+%?)/i, type: 'metric_baseline', confidence: 0.6 }
        ];
    }
    
    function createLimitationPatterns() {
        return [
            { regex: /(?:limitation|challenge|issue)\s+(?:is|was)\s+([^.;]+)/i, type: 'limitation_direct', confidence: 0.6 },
            { regex: /(?:however|although|despite)\s+([^.;,]+)/i, type: 'limitation_contrast', confidence: 0.4 },
            { regex: /(?:failed to|unable to|could not)\s+([^.;]+)/i, type: 'limitation_failure', confidence: 0.5 },
            { regex: /(?:future work|improvement)\s+(?:should|could|would)\s+([^.;]+)/i, type: 'limitation_future', confidence: 0.5 }
        ];
    }
    
    function createContributionPatterns() {
        return [
            { regex: /(?:contribution|novelty)\s+(?:is|was)\s+([^.;]+)/i, type: 'contribution_direct', confidence: 0.7 },
            { regex: /(?:we|this paper)\s+(?:propose[d]?|present[ed]?|introduce[d]?)\s+([^.;]+)/i, type: 'contribution_proposal', confidence: 0.6 },
            { regex: /(?:first|novel|new)\s+([^.;,]+)\s+(?:method|approach|technique)/i, type: 'contribution_novelty', confidence: 0.6 },
            { regex: /(?:main|key|primary)\s+contribution\s+(?:is|was)\s+([^.;]+)/i, type: 'contribution_main', confidence: 0.7 }
        ];
    }
    
    /**
     * Find pattern matches in text
     */
    function findPatternMatches(text, patterns, property, sectionName) {
        var matches = [];
        var sentences = extractSentences(text);
        
        sentences.forEach(function(sentence, sentenceIndex) {
            if (sentence.length < 20 || sentence.length > 500) return;
            
            patterns.forEach(function(pattern) {
                var match = sentence.match(pattern.regex);
                if (match && match[1]) {
                    var value = cleanExtractedValue(match[1]);
                    
                    if (value.length > 10 && value.length < 300) {
                        matches.push({
                            value: value,
                            sentence: sentence,
                            section: sectionName,
                            sentenceIndex: sentenceIndex,
                            confidence: pattern.confidence || 0.5,
                            evidence: {
                                reasoning: 'Pattern match: ' + pattern.type,
                                context: getContextAroundSentence(sentences, sentenceIndex),
                                implicit: pattern.type.includes('implicit'),
                                explanation: 'Found using ' + pattern.type + ' pattern in ' + sectionName
                            },
                            location: {
                                section: sectionName,
                                sentenceIndex: sentenceIndex,
                                start: sentence.indexOf(value),
                                end: sentence.indexOf(value) + value.length,
                                found: true
                            },
                            highlight: {
                                text: sentence,
                                color: generatePropertyColor(property.label),
                                propertyId: property.id,
                                propertyLabel: property.label
                            }
                        });
                    }
                }
            });
        });
        
        return matches;
    }
    
    /**
     * Extract sentences from text
     */
    function extractSentences(text) {
        // Improved sentence extraction
        var sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        
        return sentences
            .map(function(s) { return s.trim(); })
            .filter(function(s) { return s.length > 10; });
    }
    
    /**
     * Get context around a sentence
     */
    function getContextAroundSentence(sentences, index) {
        var context = [];
        
        if (index > 0) {
            context.push(sentences[index - 1]);
        }
        
        if (index < sentences.length - 1) {
            context.push(sentences[index + 1]);
        }
        
        return context.join(' ');
    }
    
    /**
     * Clean extracted value
     */
    function cleanExtractedValue(value) {
        return value
            .replace(/^\s*(?:the|a|an)\s+/i, '')
            .replace(/[.,;:]+$/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    /**
     * Deduplicate values based on similarity
     */
    function deduplicateValues(values) {
        var unique = [];
        var seen = new Set();
        
        values.forEach(function(value) {
            var key = value.value.toLowerCase().replace(/\s+/g, ' ').substring(0, 100);
            
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(value);
            } else {
                // If duplicate, keep the one with higher confidence
                var existingIndex = unique.findIndex(function(v) {
                    return v.value.toLowerCase().replace(/\s+/g, ' ').substring(0, 100) === key;
                });
                
                if (existingIndex !== -1 && value.confidence > unique[existingIndex].confidence) {
                    unique[existingIndex] = value;
                }
            }
        });
        
        return unique;
    }
    
    /**
     * Send progress update to content script overlay
     */
    function sendProgressUpdate(phase, progress, message) {
        // Get the tab ID from current RAG analysis context
        var tabId = null;
        
        // Try to get tab ID from StateManager
        if (typeof StateManager !== 'undefined' && StateManager.getCurrentTab) {
            var currentTab = StateManager.getCurrentTab();
            if (currentTab && currentTab.id) {
                tabId = currentTab.id;
            }
        }
        
        // Send to specific tab if we have the ID
        if (tabId && typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.sendMessage(tabId, {
                action: 'UPDATE_OVERLAY',
                phase: phase,
                progress: progress,
                message: message,
                timestamp: Date.now()
            }).catch(function() {
                // Content script might not be ready, that's ok
            });
        }
    }
    
    /**
     * Generate property color based on label
     */
    function generatePropertyColor(propertyLabel) {
        var colorMap = {
            'method': '#9C27B0',
            'result': '#4CAF50',
            'dataset': '#2196F3',
            'model': '#FF9800',
            'evaluation': '#00BCD4',
            'baseline': '#795548',
            'contribution': '#FFC107',
            'limitation': '#F44336',
            'future': '#607D8B',
            'hypothesis': '#E91E63',
            'objective': '#3F51B5',
            'problem': '#FF5722',
            'solution': '#009688'
        };
        
        var labelLower = propertyLabel.toLowerCase();
        
        for (var key in colorMap) {
            if (labelLower.includes(key)) {
                return colorMap[key];
            }
        }
        
        // Generate color from hash for unknown properties
        return generateColorFromHash(propertyLabel);
    }
    
    /**
     * Generate color from string hash
     */
    function generateColorFromHash(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        var palette = [
            '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
            '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3',
            '#87CEEB', '#FFA07A', '#20B2AA', '#87CEFA'
        ];
        
        return palette[Math.abs(hash) % palette.length];
    }
    
    /**
     * Cache management functions
     */
    function generateCacheKey(property, sections) {
        var propertyStr = (property.id || property.label || '').replace(/[^a-zA-Z0-9]/g, '_');
        var sectionsStr = Object.keys(sections).sort().join('_').substring(0, 50);
        return 'rag_' + propertyStr + '_' + hashString(sectionsStr);
    }
    
    function getFromCache(key) {
        if (!cache.has(key)) return null;
        
        var cached = cache.get(key);
        if (Date.now() - cached.timestamp > cacheTimeout) {
            cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    function setCache(key, data) {
        cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Limit cache size
        if (cache.size > 100) {
            var firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
    }
    
    function cleanupCache() {
        var now = Date.now();
        var keysToDelete = [];
        
        cache.forEach(function(value, key) {
            if (now - value.timestamp > cacheTimeout) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(function(key) {
            cache.delete(key);
        });
        
        if (keysToDelete.length > 0) {
            console.log('🗑️ Cleaned up ' + keysToDelete.length + ' expired cache entries');
        }
    }
    
    function clearCache() {
        cache.clear();
        console.log('🗑️ RAG cache cleared');
    }
    
    /**
     * Utility functions
     */
    function hashString(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * Get service statistics
     */
    function getStats() {
        var hitRate = stats.totalRequests > 0 
            ? (stats.cacheHits / stats.totalRequests * 100).toFixed(2)
            : 0;
        
        var openAIRate = stats.processedProperties > 0
            ? (stats.openAIRequests / stats.processedProperties * 100).toFixed(2)
            : 0;
        
        return {
            totalRequests: stats.totalRequests,
            cacheHits: stats.cacheHits,
            cacheMisses: stats.cacheMisses,
            errors: stats.errors,
            processedProperties: stats.processedProperties,
            totalMatches: stats.totalMatches,
            openAIRequests: stats.openAIRequests,
            fallbackUsed: stats.fallbackUsed,
            cacheSize: cache.size,
            hitRate: hitRate + '%',
            openAIRate: openAIRate + '%',
            isInitialized: isInitialized,
            hasOpenAI: !!openAIService
        };
    }
    
    /**
     * Reset service
     */
    function reset() {
        clearCache();
        stats = {
            totalRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
            errors: 0,
            processedProperties: 0,
            totalMatches: 0,
            openAIRequests: 0,
            fallbackUsed: 0
        };
        console.log('🔄 RAG service reset');
    }
    
    // Public API
    return {
        init: init,
        analyzePaperSections: analyzePaperSections,
        getStats: getStats,
        clearCache: clearCache,
        reset: reset,
        config: config // Expose config for runtime adjustments
    };
})();

// Expose to global scope for service worker
if (typeof self !== 'undefined') {
    self.RAGBackgroundService = RAGBackgroundService;
} else if (typeof window !== 'undefined') {
    window.RAGBackgroundService = RAGBackgroundService;
}
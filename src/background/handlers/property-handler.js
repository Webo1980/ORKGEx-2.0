// ================================
// src/background/handlers/property-handler.js
// Handles ORKG properties and AI suggestions
// ================================

var PropertyHandler = (function() {
    'use strict';
    
    // Private variables
    var orkgService = null;
    var openAIService = null;
    var isInitialized = false;
    
    // Initialize services
    function initServices() {
        if (isInitialized) return Promise.resolve();
        
        return new Promise(function(resolve) {
            // Initialize ORKG service
            if (typeof ORKGBackgroundService !== 'undefined') {
                orkgService = new ORKGBackgroundService();
                orkgService.init().then(function() {
                    console.log('ORKG service initialized in PropertyHandler');
                }).catch(function(error) {
                    console.warn('ORKG service initialization failed:', error);
                });
            }
            
            // Initialize OpenAI service
            if (typeof OpenAIBackgroundService !== 'undefined') {
                openAIService = new OpenAIBackgroundService();
                openAIService.init().then(function(initialized) {
                    if (initialized) {
                        console.log('OpenAI service initialized in PropertyHandler');
                    }
                }).catch(function(error) {
                    console.warn('OpenAI service initialization failed:', error);
                });
            }
            
            isInitialized = true;
            resolve();
        });
    }
    
    // Generate color for property
    function generatePropertyColor(propertyLabel) {
        // Check predefined colors
        var labelLower = propertyLabel.toLowerCase();
        for (var key in BackgroundTypes.PROPERTY_COLORS) {
            if (labelLower.includes(key) || key.includes(labelLower)) {
                return BackgroundTypes.PROPERTY_COLORS[key];
            }
        }
        
        // Generate color based on hash
        var hash = 0;
        for (var i = 0; i < propertyLabel.length; i++) {
            hash = propertyLabel.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash;
        }
        
        var hue = Math.abs(hash % 360);
        return 'hsl(' + hue + ', 65%, 60%)';
    }
    
    // Get fallback properties
    function getFallbackProperties(query) {
        var allProperties = BackgroundTypes.FALLBACK_PREDICATES;
        
        if (!query || query.trim() === '') {
            return allProperties.map(function(prop) {
                return Object.assign({}, prop, {
                    color: generatePropertyColor(prop.label)
                });
            });
        }
        
        var queryLower = query.toLowerCase();
        var filtered = allProperties.filter(function(prop) {
            return prop.label.toLowerCase().includes(queryLower) ||
                   (prop.description && prop.description.toLowerCase().includes(queryLower));
        });
        
        return filtered.map(function(prop) {
            return Object.assign({}, prop, {
                color: generatePropertyColor(prop.label)
            });
        });
    }
    
    // Get AI suggestions for text
    function getAISuggestions(text, context) {
        if (!text) {
            return Promise.resolve([]);
        }
        
        // If OpenAI service is available, use it
        if (openAIService && openAIService.getSuggestedProperties) {
            return openAIService.getSuggestedProperties(text, context)
                .then(function(suggestions) {
                    return suggestions.map(function(prop) {
                        return Object.assign({}, prop, {
                            color: generatePropertyColor(prop.label),
                            isAISuggestion: true
                        });
                    });
                })
                .catch(function(error) {
                    console.error('AI suggestion failed:', error);
                    return getContextualFallback(text);
                });
        }
        
        // Fallback to contextual suggestions
        return Promise.resolve(getContextualFallback(text));
    }
    
    // Get contextual fallback suggestions
    function getContextualFallback(text) {
        var textLower = text.toLowerCase();
        var suggestions = [];
        
        // Contextual matching
        if (textLower.includes('method') || textLower.includes('approach')) {
            suggestions.push({
                id: 'ai_method',
                label: 'Methodology',
                isAISuggestion: true
            });
        }
        
        if (textLower.includes('result') || textLower.includes('finding')) {
            suggestions.push({
                id: 'ai_result',
                label: 'Result',
                isAISuggestion: true
            });
        }
        
        if (textLower.includes('data') || textLower.includes('dataset')) {
            suggestions.push({
                id: 'ai_dataset',
                label: 'Dataset',
                isAISuggestion: true
            });
        }
        
        if (textLower.includes('evaluat') || textLower.includes('metric')) {
            suggestions.push({
                id: 'ai_evaluation',
                label: 'Evaluation',
                isAISuggestion: true
            });
        }
        
        if (textLower.includes('conclus') || textLower.includes('summar')) {
            suggestions.push({
                id: 'ai_conclusion',
                label: 'Conclusion',
                isAISuggestion: true
            });
        }
        
        // Add default suggestions if none found
        if (suggestions.length === 0) {
            suggestions.push(
                { id: 'ai_claim', label: 'Research Claim', isAISuggestion: true },
                { id: 'ai_contribution', label: 'Contribution', isAISuggestion: true }
            );
        }
        
        // Add colors and limit to 4
        return suggestions.slice(0, 4).map(function(prop) {
            return Object.assign({}, prop, {
                color: generatePropertyColor(prop.label)
            });
        });
    }
    
    // Public API
    return {
        // Initialize handler
        init: function() {
            return initServices();
        },
        
        // Fetch ORKG properties
        fetchProperties: function(query) {
            if (!orkgService) {
                return Promise.resolve({
                    success: true,
                    properties: getFallbackProperties(query)
                });
            }
            
            return orkgService.fetchPredicates(query, 20)
                .then(function(properties) {
                    return {
                        success: true,
                        properties: properties.map(function(prop) {
                            return Object.assign({}, prop, {
                                color: generatePropertyColor(prop.label)
                            });
                        })
                    };
                })
                .catch(function(error) {
                    console.error('Failed to fetch properties:', error);
                    return {
                        success: true,
                        properties: getFallbackProperties(query)
                    };
                });
        },
        
        // Get common properties
        getCommonProperties: function() {
            if (!orkgService) {
                return Promise.resolve(getFallbackProperties(''));
            }
            
            return orkgService.getCommonPredicates()
                .then(function(properties) {
                    return properties.map(function(prop) {
                        return Object.assign({}, prop, {
                            color: generatePropertyColor(prop.label)
                        });
                    });
                })
                .catch(function(error) {
                    console.error('Failed to get common properties:', error);
                    return getFallbackProperties('');
                });
        },
        
        // Get field-specific properties
        getFieldProperties: function(fieldId) {
            if (!orkgService || !fieldId) {
                return Promise.resolve([]);
            }
            
            return orkgService.getPredicatesForField(fieldId)
                .then(function(properties) {
                    return properties.map(function(prop) {
                        return Object.assign({}, prop, {
                            color: generatePropertyColor(prop.label)
                        });
                    });
                })
                .catch(function(error) {
                    console.error('Failed to get field properties:', error);
                    return [];
                });
        },
        
        // Create new property
        createProperty: function(label, description) {
            if (!orkgService) {
                return Promise.reject(new Error('ORKG service not available'));
            }
            
            return orkgService.createPredicate(label, description)
                .then(function(property) {
                    return Object.assign({}, property, {
                        color: generatePropertyColor(property.label)
                    });
                });
        },
        
        // Get property by ID
        getPropertyById: function(propertyId) {
            if (!orkgService) {
                // Try to find in fallback properties
                var fallback = BackgroundTypes.FALLBACK_PREDICATES.find(function(p) {
                    return p.id === propertyId;
                });
                
                if (fallback) {
                    return Promise.resolve(Object.assign({}, fallback, {
                        color: generatePropertyColor(fallback.label)
                    }));
                }
                
                return Promise.resolve(null);
            }
            
            return orkgService.getPredicateById(propertyId)
                .then(function(property) {
                    if (property) {
                        return Object.assign({}, property, {
                            color: generatePropertyColor(property.label)
                        });
                    }
                    return null;
                });
        },
        
        // Get AI property suggestions
        getAISuggestions: function(text, context) {
            return getAISuggestions(text, context);
        },
        
        // Get suggested properties (combines AI and ORKG)
        getSuggestedProperties: function(text) {
            var self = this;
            
            return Promise.all([
                getAISuggestions(text, {}),
                orkgService ? orkgService.getSuggestedPredicates(text) : Promise.resolve([])
            ]).then(function(results) {
                var aiSuggestions = results[0];
                var orkgSuggestions = results[1];
                
                // Combine and deduplicate
                var combined = aiSuggestions;
                var seenLabels = new Set(aiSuggestions.map(function(s) {
                    return s.label.toLowerCase();
                }));
                
                orkgSuggestions.forEach(function(prop) {
                    if (!seenLabels.has(prop.label.toLowerCase())) {
                        combined.push(Object.assign({}, prop, {
                            color: generatePropertyColor(prop.label)
                        }));
                    }
                });
                
                return {
                    success: true,
                    suggestions: combined.slice(0, 10)
                };
            }).catch(function(error) {
                console.error('Failed to get suggested properties:', error);
                return {
                    success: true,
                    suggestions: getContextualFallback(text)
                };
            });
        },
        
        // Search ORKG properties
        searchORKGProperties: function(query) {
            if (!orkgService) {
                return Promise.resolve({
                    success: true,
                    properties: getFallbackProperties(query),
                    query: query,
                    total: getFallbackProperties(query).length
                });
            }
            
            return orkgService.fetchPredicates(query, 20)
                .then(function(properties) {
                    var enhanced = properties.map(function(prop) {
                        return Object.assign({}, prop, {
                            color: generatePropertyColor(prop.label)
                        });
                    });
                    
                    return {
                        success: true,
                        properties: enhanced,
                        query: query,
                        total: enhanced.length
                    };
                })
                .catch(function(error) {
                    console.error('ORKG property search failed:', error);
                    return {
                        success: false,
                        error: error.message,
                        properties: getFallbackProperties(query),
                        query: query,
                        total: 0
                    };
                });
        },
        
        // Utility methods
        generatePropertyColor: generatePropertyColor,
        
        // Quick action properties for context menu
        getQuickActionProperties: function() {
            if (!orkgService) {
                return Promise.resolve(BackgroundTypes.FALLBACK_PREDICATES.slice(0, 5));
            }
            
            return orkgService.getCommonPredicates()
                .then(function(properties) {
                    return properties.slice(0, 5);
                })
                .catch(function(error) {
                    return BackgroundTypes.FALLBACK_PREDICATES.slice(0, 5);
                });
        },
        
        // Check if service is ready
        isReady: function() {
            return isInitialized;
        },
        
        // Get service status
        getStatus: function() {
            return {
                isInitialized: isInitialized,
                hasORKGService: !!orkgService,
                hasOpenAIService: !!openAIService
            };
        }
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.PropertyHandler = PropertyHandler;
}
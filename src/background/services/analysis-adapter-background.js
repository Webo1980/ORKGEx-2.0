// ================================
// src/background/analysis-adapter-background.js
// Analysis adapter for background script - IIFE pattern
// ================================

var AnalysisAdapter = (function() {
    'use strict';
    
    // Private prompt templates
    var promptTemplates = {
        propertyAnalysis: `Return ONLY JSON:
{
  "property": "{propertyLabel}",
  "values": [
    {
      "value": "<extracted content>",
      "sentence": "<exact sentence from the paper>",
      "section": "<section name>",
      "confidence": 0.0-1.0,
      "evidence": {
        "<section_name>": {
          "text": "<direct quote>",
          "relevance": "<precise justification>"
        }
      },
      "location": {
        "section": "<section_name>",
        "sentenceIndex": <number>
      },
      "metadata": {
        "property_type": "{propertyType}",
        "validation_rules": {
          "type_constraint": "<specific type requirements>",
          "domain_specificity": "<domain validation criteria>"
        },
        "source_section": "<exact section name>"
      }
    }
  ],
  "extraction_metadata": {
    "total_values_found": "<number of values>",
    "extraction_strategy": "<summary of extraction approach>"
  }
}

Property: {propertyLabel}
Description: {propertyDescription} 
Type: {propertyType}

Sections:
{sections}

Rules:
1. **Strict Type Matching**: Extracted value **must strictly match** the defined property type ({propertyType}).
2. **Exact Sentences**: The "sentence" field must contain the EXACT sentence from the paper.
3. **For "number" type**: Extracted value must be a numeric value only.
4. **For "text" type**: Extracted value must be a concise, meaningful textual term.
5. **For "resource" type**: Extracted value must be an entity that can be linked to external data sources.
6. **Ensure Type Uniformity**: All values must conform to the property type.
7. Return null for value if no valid match is found.
8. Include only the most relevant evidence section.
9. Ensure proper JSON escaping.
10. Return ONLY the JSON object.`,

        structuredExtraction: `Extract structured information from this academic paper.

Paper metadata:
Title: {title}
Authors: {authors}

Template properties to extract:
{propertyList}

Text content:
{truncatedText}

Return JSON:
{
  "properties": [
    {
      "property": "property_name",
      "value": "extracted_value",
      "sentence": "exact sentence containing the value",
      "section": "section_name",
      "confidence": 0.0-1.0
    }
  ],
  "summary": "Brief summary of extraction results",
  "confidence": 0.0-1.0
}

Only include properties where you found relevant information.`,

        imageAnalysis: `Analyze this academic figure and extract structured knowledge.

Context: {context}

Focus on:
- Research findings and results
- Methodological information
- Data relationships
- Performance metrics
- Architectural components

Return JSON:
{
  "triples": [
    {
      "subject": "subject",
      "predicate": "relationship",
      "object": "object",
      "confidence": 0.0-1.0
    }
  ],
  "description": "Brief description of what the image shows"
}`
    };
    
    /**
     * Analyze a property against paper sections
     */
    function analyzeProperty(property, sections) {
        return new Promise(function(resolve, reject) {
            // Check if OpenAI service is available
            if (typeof OpenAIBackgroundService === 'undefined') {
                reject(new Error('OpenAI service not available'));
                return;
            }
            
            var openAI = new OpenAIBackgroundService();
            
            // Initialize OpenAI service
            openAI.init().then(function() {
                var prompt = buildPropertyAnalysisPrompt(property, sections);
                
                return openAI.makeRequest({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert at extracting structured information from scientific papers. Extract only the specified property with high precision and provide proper evidence. Always include the exact sentence from the paper.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 1500
                });
            })
            .then(function(response) {
                var content = response.choices[0]?.message?.content;
                if (!content) {
                    throw new Error('No response from LLM provider');
                }
                
                var result = parseAnalysisResponse(content);
                resolve(result);
            })
            .catch(function(error) {
                console.error('Property analysis failed:', error);
                reject(error);
            });
        });
    }
    
    /**
     * Extract structured content based on template properties
     */
    function extractStructuredContent(pageText, templateProperties, metadata) {
        return new Promise(function(resolve, reject) {
            if (!pageText || !templateProperties || templateProperties.length === 0) {
                reject(new Error('Missing required parameters for content extraction'));
                return;
            }
            
            // Check if OpenAI service is available
            if (typeof OpenAIBackgroundService === 'undefined') {
                resolve({
                    properties: [],
                    summary: 'OpenAI service not available',
                    confidence: 0.0
                });
                return;
            }
            
            var openAI = new OpenAIBackgroundService();
            
            openAI.init().then(function() {
                var truncatedText = pageText.substring(0, 4000);
                var propertyList = templateProperties.map(function(p) {
                    return '- ' + p.label + ': ' + (p.description || 'No description');
                }).join('\n');
                
                var prompt = promptTemplates.structuredExtraction
                    .replace('{title}', metadata.title || 'Unknown')
                    .replace('{authors}', formatAuthors(metadata.authors))
                    .replace('{propertyList}', propertyList)
                    .replace('{truncatedText}', truncatedText);
                
                return openAI.makeRequest({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an expert at extracting structured information from academic papers. Extract relevant information for each property and include the exact sentence where you found it.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 800
                });
            })
            .then(function(response) {
                var content = response.choices[0]?.message?.content;
                if (!content) {
                    throw new Error('No response from LLM provider');
                }
                
                try {
                    var parsed = JSON.parse(content);
                    resolve(parsed);
                } catch (e) {
                    console.error('Failed to parse extraction results:', e);
                    resolve({
                        properties: [],
                        summary: 'Failed to parse LLM response',
                        confidence: 0.0
                    });
                }
            })
            .catch(function(error) {
                console.error('Structured content extraction failed:', error);
                resolve({
                    properties: [],
                    summary: 'Extraction failed: ' + error.message,
                    confidence: 0.0
                });
            });
        });
    }
    
    /**
     * Build property analysis prompt
     */
    function buildPropertyAnalysisPrompt(property, sections) {
        var sectionsText = '';
        
        if (typeof sections === 'string') {
            sectionsText = sections;
        } else {
            for (var name in sections) {
                var text = sections[name];
                if (typeof text === 'string') {
                    sectionsText += '### ' + name + ' ###\n' + text + '\n\n';
                }
            }
        }
        
        return promptTemplates.propertyAnalysis
            .replace(/{propertyLabel}/g, property.label || 'Unknown Property')
            .replace(/{propertyDescription}/g, property.description || 'No description provided')
            .replace(/{propertyType}/g, property.type || 'text')
            .replace(/{sections}/g, sectionsText);
    }
    
    /**
     * Parse analysis response from LLM
     */
    function parseAnalysisResponse(content) {
        try {
            // Clean response content
            var cleanedContent = content.trim();
            
            // Remove markdown formatting
            cleanedContent = cleanedContent.replace(/```json|```/g, '').trim();
            
            // Try to extract JSON from response
            var jsonMatches = cleanedContent.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\})*)*\}))*\}/g);
            
            if (jsonMatches && jsonMatches.length > 0) {
                cleanedContent = jsonMatches[0];
            }
            
            var response = JSON.parse(cleanedContent);
            
            // Validate and normalize response structure
            if (!response || typeof response !== 'object') {
                throw new Error('Invalid response format');
            }
            
            // Ensure values array includes sentence field
            if (response.values && Array.isArray(response.values)) {
                response.values = response.values.map(function(value) {
                    return {
                        value: value.value || '',
                        sentence: value.sentence || value.value || '', // Ensure sentence field exists
                        section: value.section || 'unknown',
                        confidence: value.confidence || 0.7,
                        evidence: value.evidence || {},
                        location: value.location || null,
                        metadata: value.metadata || {}
                    };
                });
            }
            
            // Ensure required fields with defaults
            return {
                property: response.property || 'unknown',
                values: response.values || [],
                evidence: response.evidence || {},
                metadata: response.metadata || {},
                extraction_metadata: response.extraction_metadata || {}
            };
            
        } catch (error) {
            console.error('Failed to parse analysis response:', error);
            throw new Error('Invalid JSON response: ' + error.message);
        }
    }
    
    /**
     * Format authors for prompt
     */
    function formatAuthors(authors) {
        if (!authors) return 'Unknown';
        
        if (Array.isArray(authors)) {
            return authors.slice(0, 3).map(function(a) {
                return (typeof a === 'string') ? a : (a.name || 'Unknown');
            }).join(', ');
        }
        
        return 'Unknown';
    }
    
    /**
     * Create a simple extraction without LLM
     */
    function simpleExtraction(text, property) {
        // Basic keyword extraction fallback
        var keywords = property.label.toLowerCase().split(/\s+/);
        var sentences = text.split(/[.!?]+/);
        var matches = [];
        
        for (var i = 0; i < sentences.length; i++) {
            var sentence = sentences[i].trim();
            var sentenceLower = sentence.toLowerCase();
            
            var matchCount = 0;
            keywords.forEach(function(keyword) {
                if (keyword.length > 3 && sentenceLower.indexOf(keyword) !== -1) {
                    matchCount++;
                }
            });
            
            if (matchCount > 0 && sentence.length > 20) {
                matches.push({
                    value: sentence.substring(0, 200),
                    sentence: sentence,
                    section: 'unknown',
                    confidence: Math.min(matchCount * 0.3, 0.9),
                    evidence: {
                        method: 'keyword_matching'
                    }
                });
                
                if (matches.length >= 3) break;
            }
        }
        
        return {
            property: property.label,
            values: matches,
            extraction_metadata: {
                method: 'simple_extraction',
                total_values_found: matches.length
            }
        };
    }
    
    // Public API
    return {
        analyzeProperty: analyzeProperty,
        extractStructuredContent: extractStructuredContent,
        buildPropertyAnalysisPrompt: buildPropertyAnalysisPrompt,
        parseAnalysisResponse: parseAnalysisResponse,
        simpleExtraction: simpleExtraction
    };
})();

// Expose to global scope for service worker
if (typeof self !== 'undefined') {
    self.AnalysisAdapter = AnalysisAdapter;
} else if (typeof window !== 'undefined') {
    window.AnalysisAdapter = AnalysisAdapter;
}
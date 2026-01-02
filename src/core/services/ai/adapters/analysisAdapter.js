/**
 * Analysis Adapter for LLM Service
 * Handles content analysis specific functionality
 */

export class AnalysisAdapter {
    constructor(provider) {
        this.provider = provider;
        this.promptTemplates = new AnalysisPromptTemplates();
    }

    /**
     * Analyze property based on sections
     */
    async analyzeProperty(property, sections) {
        try {
            const prompt = this.promptTemplates.buildPropertyAnalysisPrompt(property, sections);
            
            const response = await this.provider.makeRequest({
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at extracting structured information from scientific papers. Extract only the specified property with high precision and provide proper evidence.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3, // Lower temperature for more consistent extraction
                max_tokens: 1500
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from LLM provider');
            }

            return this.parseAnalysisResponse(content);

        } catch (error) {
            console.error('🚨 Property analysis failed:', error);
            throw error;
        }
    }

    /**
     * Extract structured content based on template properties
     */
    async extractStructuredContent(pageText, templateProperties, metadata = {}) {
        try {
            if (!pageText || !templateProperties || templateProperties.length === 0) {
                throw new Error('Missing required parameters for content extraction');
            }

            const truncatedText = pageText.substring(0, 4000); // Limit text length
            const propertyList = templateProperties.map(p => `- ${p.label}: ${p.description || 'No description'}`).join('\n');

            const response = await this.provider.makeRequest({
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at extracting structured information from academic papers. Given a text and a list of properties, extract relevant information for each property.

Return your response as JSON:
{
  "properties": [
    {
      "property": "methodology",
      "value": "Deep learning using convolutional neural networks",
      "confidence": 0.9
    }
  ],
  "summary": "Brief summary of extraction results",
  "confidence": 0.85
}

Only include properties where you found relevant information. Set confidence based on how certain you are about the extraction.`
                    },
                    {
                        role: 'user',
                        content: `Paper metadata:
Title: ${metadata.title || 'Unknown'}
Authors: ${metadata.authors ? metadata.authors.slice(0, 3).map(a => a.name || a).join(', ') : 'Unknown'}

Template properties to extract:
${propertyList}

Text content:
${truncatedText}

Extract structured information:`
                    }
                ],
                temperature: 0.3,
                max_tokens: 800
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from LLM provider');
            }

            try {
                return JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse extraction results:', e);
                return {
                    properties: [],
                    summary: 'Failed to parse LLM response',
                    confidence: 0.0
                };
            }

        } catch (error) {
            console.error('Structured content extraction failed:', error);
            throw error;
        }
    }

    /**
     * Extract information from images using vision models
     */
    async extractImageTriples(imageData, context = {}) {
        try {
            if (!imageData) {
                throw new Error('No image data provided');
            }

            // Check if vision model is available
            const visionModel = 'gpt-4o';
            
            const response = await this.provider.makeRequest({
                model: visionModel,
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at analyzing academic figures and extracting structured knowledge. Analyze the image and extract relevant triples (subject-predicate-object relationships) that could be useful for a knowledge graph.

Focus on:
- Research findings and results
- Methodological information
- Data relationships
- Performance metrics
- Architectural components

Return as JSON:
{
  "triples": [
    {
      "subject": "CNN Model",
      "predicate": "achieves_accuracy",
      "object": "95.2%",
      "confidence": 0.9
    }
  ],
  "description": "Brief description of what the image shows"
}`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Context: ${JSON.stringify(context)}\n\nExtract structured information from this image:`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageData
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.4,
                max_tokens: 600
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from vision model');
            }

            try {
                return JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse image analysis results:', e);
                return {
                    triples: [],
                    description: 'Failed to parse LLM response'
                };
            }

        } catch (error) {
            console.error('Image analysis failed:', error);
            
            // Return empty result for non-vision models
            return {
                triples: [],
                description: 'Image analysis not available - requires vision model'
            };
        }
    }

    /**
     * Parse analysis response from LLM
     */
    parseAnalysisResponse(content) {
        try {
            // Clean response content
            let cleanedContent = content.trim();
            
            // Remove markdown formatting
            cleanedContent = cleanedContent.replace(/```json|```/g, '').trim();

            // Try to extract JSON from response
            const jsonMatches = cleanedContent.match(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\})*)*\}))*\}/g);
            
            if (jsonMatches && jsonMatches.length > 0) {
                // Take the first valid-looking JSON match
                cleanedContent = jsonMatches[0];
            }

            const response = JSON.parse(cleanedContent);

            // Validate and normalize response structure
            if (!response || typeof response !== 'object') {
                throw new Error('Invalid response format');
            }

            // Ensure required fields with defaults
            return {
                property: response.property || 'unknown',
                values: Array.isArray(response.values) ? response.values : [],
                evidence: response.evidence && typeof response.evidence === 'object' 
                    ? response.evidence 
                    : {},
                metadata: response.metadata && typeof response.metadata === 'object'
                    ? response.metadata 
                    : {},
                extraction_metadata: response.extraction_metadata || {}
            };

        } catch (error) {
            console.error('Failed to parse analysis response:', error);
            throw new SyntaxError(`Invalid JSON response: ${error.message}`);
        }
    }
}

/**
 * Analysis Prompt Templates
 * Contains templates for different analysis tasks
 */
class AnalysisPromptTemplates {
    constructor() {
        this.propertyAnalysisTemplate = `
Return ONLY JSON:
{
  "property": "{propertyLabel}",
  "values": [
    {
      "value": "<extracted content>",
      "confidence": 0.0-1.0,
      "evidence": {
        "<section_name>": {
          "text": "<direct quote>",
          "relevance": "<precise justification>"
        }
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
1. **Strict Type Matching**: Extracted value **must strictly match** the defined property type ({propertyType}). No exceptions.
2. **For "number" type**: Extracted value must be a numeric value only.
3. **For "text" type**: Extracted value must be a concise, meaningful textual term.  
   - Do not return values that resemble resource identifiers (e.g., dataset names, ontology names, database IDs).  
   - If an extracted value **could** be a resource but the property type is "text," treat it **only as text**.
4. **For "resource" type**: Extracted value must be an entity that can be linked to external data sources.  
   - Do not return generic text terms or descriptive phrases as resources.  
5. **Ensure Type Uniformity**: If multiple values are extracted, they must **all** conform to the property type.  
   - If any extracted value does not fit, return \`null\`.  
6. Return \`null\` for \`value\` if no valid match is found.  
7. Include only the most relevant evidence section.  
8. Follow the template's required field specifications.  
9. Ensure proper JSON escaping.  
10. Return ONLY the JSON object.
`;
    }

    /**
     * Build property analysis prompt
     */
    buildPropertyAnalysisPrompt(property, sections) {
        const sectionsText = typeof sections === 'string' 
            ? sections 
            : Object.entries(sections)
                .map(([name, text]) => `### ${name} ###\n${text}`)
                .join('\n\n');

        return this.propertyAnalysisTemplate
            .replace(/{propertyLabel}/g, property.label || 'Unknown Property')
            .replace(/{propertyDescription}/g, property.description || 'No description provided')
            .replace(/{propertyType}/g, property.type || 'text')
            .replace(/{sections}/g, sectionsText);
    }
}

export default AnalysisAdapter;

/**
 * Generation Adapter for LLM Service
 * Handles content generation specific functionality
 */

import { sanitizeText } from '../../../../utils/textUtils.js';

export class GenerationAdapter {
    constructor(provider) {
        // Accept provider as parameter from factory
        this.provider = provider;
        this.promptTemplates = new GenerationPromptTemplates();
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        // Get provider from ServiceManager if not provided
        if (!this.provider) {
            this.provider = window.serviceManager?.getService('openAIProvider');
        }
        
        // Initialize the provider if it has an init method and isn't initialized
        if (this.provider && typeof this.provider.init === 'function' && !this.provider.isInitialized) {
            console.log('🤖 Initializing OpenAI provider from GenerationAdapter...');
            try {
                await this.provider.init();
            } catch (error) {
                console.error('Failed to initialize OpenAI provider:', error);
                this.provider = null;
            }
        }
        
        if (!this.provider) {
            console.warn('⚠️ GenerationAdapter: No OpenAI provider available');
        } else {
            console.log('✅ GenerationAdapter initialized with provider');
        }
        
        this.isInitialized = true;
    }

    /**
     * Generate research problem from paper title and abstract
     */
    async generateResearchProblem(title, abstract) {
        try {
            // Ensure we're initialized
            if (!this.isInitialized) {
                await this.init();
            }
            
            // Check if provider is available and has the required method
            if (!this.provider || typeof this.provider.makeRequest !== 'function') {
                console.warn('⚠️ OpenAI provider not available or invalid, using fallback');
                return this.createFallbackProblem(title);
            }
            
            const sanitizedTitle = sanitizeText(title || '').trim();
            const sanitizedAbstract = sanitizeText(abstract || '').substring(0, 1000).trim();
            
            if (!sanitizedTitle && !sanitizedAbstract) {
                throw new Error('No title or abstract provided for problem generation');
            }

            const prompt = this.promptTemplates.buildProblemGenerationPrompt(sanitizedTitle, sanitizedAbstract);
            
            console.log('🤖 Making request to OpenAI provider...');
            
            const response = await this.provider.makeRequest({
                messages: [
                    {
                        role: 'system',
                        content: this.promptTemplates.problemGenerationSystem
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500,
                useCache: true,
                cacheKey: `problem_${this.hashString(sanitizedTitle + sanitizedAbstract)}`
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from LLM provider');
            }

            // Parse JSON response
            let problemData;
            try {
                problemData = JSON.parse(content);
            } catch (e) {
                // Fallback to text parsing if JSON parsing fails
                problemData = this.parseTextResponse(content, sanitizedTitle);
            }

            // Validate and enhance the response
            return this.validateProblemResponse(problemData, sanitizedTitle);

        } catch (error) {
            console.error('Research problem generation failed:', error);
            return this.createFallbackProblem(title);
        }
    }


    /**
     * Generate research template from field, problem, and abstract
     */
    async generateResearchTemplate(researchField, problemDescription, abstract) {
        try {
            const sanitizedField = sanitizeText(researchField || '').trim();
            const sanitizedProblem = sanitizeText(problemDescription || '').trim();
            const sanitizedAbstract = sanitizeText(abstract || '').substring(0, 2000).trim();
            
            if (!sanitizedField || !sanitizedProblem) {
                throw new Error('Research field and problem description are required');
            }

            const prompt = this.promptTemplates.buildTemplateGenerationPrompt(sanitizedField, sanitizedProblem, sanitizedAbstract);
            
            const response = await this.provider.makeRequest({
                messages: [
                    {
                        role: 'system',
                        content: this.promptTemplates.templateGenerationSystem
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.5,
                max_tokens: 1500
            });

            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No response from LLM provider');
            }

            // Parse JSON response
            let templateData;
            try {
                templateData = JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse template JSON:', e);
                templateData = this.createFallbackTemplate(sanitizedField, sanitizedProblem);
            }

            // Validate and enhance the template
            return this.validateTemplateResponse(templateData, sanitizedField);

        } catch (error) {
            console.error('Template generation failed:', error);
            
            // Return fallback template
            return this.createFallbackTemplate(researchField, problemDescription);
        }
    }

    /**
     * Generate text summary
     */
    async generateSummary(text, maxLength = 200) {
        try {
            if (!text || text.trim().length < 50) {
                return 'Text too short for summarization';
            }

            const truncatedText = text.substring(0, 2000);

            const response = await this.provider.makeRequest({
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert at creating concise, informative summaries of academic content. Create a clear summary that captures the main points and key findings.`
                    },
                    {
                        role: 'user',
                        content: `Summarize this academic text in ${maxLength} characters or less:\n\n${truncatedText}`
                    }
                ],
                temperature: 0.3,
                max_tokens: Math.floor(maxLength / 2)
            });

            const content = response.choices[0]?.message?.content;
            return content || 'Summary generation failed';

        } catch (error) {
            console.error('Summary generation failed:', error);
            return 'Summary generation failed';
        }
    }

    /**
     * Parse text response when JSON parsing fails
     */
    parseTextResponse(content, fallbackTitle) {
        const lines = content.split('\n').filter(line => line.trim());
        
        let title = '';
        let description = '';
        
        // Try to extract title and description from text
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.toLowerCase().includes('title:') || line.toLowerCase().includes('problem:')) {
                title = line.replace(/^[^:]*:/, '').trim();
            } else if (line.toLowerCase().includes('description:') || line.toLowerCase().includes('desc:')) {
                description = line.replace(/^[^:]*:/, '').trim();
            } else if (!title && i === 0) {
                title = line;
            } else if (!description && title && line.length > 20) {
                description = line;
            }
        }
        
        return {
            title: title || `Research Problem: ${fallbackTitle}`,
            description: description || 'AI-generated research problem description. Please edit to better reflect the specific challenge.'
        };
    }

    /**
     * Validate and enhance problem response
     */
    validateProblemResponse(problemData, fallbackTitle) {
        const result = {
            title: problemData.title || `Research Problem: ${fallbackTitle}`,
            description: problemData.description || 'Please edit this AI-generated problem description.'
        };

        // Ensure title is not too long
        if (result.title.length > 100) {
            result.title = result.title.substring(0, 97) + '...';
        }

        // Ensure description has reasonable length
        if (result.description.length < 20) {
            result.description += ' This research addresses important challenges in the field that require further investigation.';
        }

        if (result.description.length > 500) {
            result.description = result.description.substring(0, 497) + '...';
        }

        return result;
    }

    /**
     * Create fallback template when generation fails
     */
    createFallbackTemplate(researchField, problemDescription) {
        return {
            id: `fallback-${Date.now()}`,
            name: `${researchField} Research Template`,
            label: `${researchField} Research Template`,
            description: `Template for ${problemDescription}`,
            properties: [
                {
                    id: 'methodology',
                    label: 'Methodology',
                    description: 'Research methodology and approach used',
                    type: 'text',
                    required: true
                },
                {
                    id: 'dataset',
                    label: 'Dataset',
                    description: 'Dataset(s) used in the research',
                    type: 'resource',
                    required: true
                },
                {
                    id: 'evaluation_metric',
                    label: 'Evaluation Metric',
                    description: 'Primary metric used for evaluation',
                    type: 'text',
                    required: true
                },
                {
                    id: 'baseline',
                    label: 'Baseline',
                    description: 'Baseline method or system compared against',
                    type: 'text',
                    required: false
                },
                {
                    id: 'performance_result',
                    label: 'Performance Result',
                    description: 'Key performance metric result',
                    type: 'number',
                    required: true
                },
                {
                    id: 'contribution',
                    label: 'Main Contribution',
                    description: 'Primary contribution of the research',
                    type: 'text',
                    required: true
                },
                {
                    id: 'limitation',
                    label: 'Limitation',
                    description: 'Key limitation or constraint identified',
                    type: 'text',
                    required: false
                },
                {
                    id: 'future_work',
                    label: 'Future Work',
                    description: 'Suggested future research directions',
                    type: 'text',
                    required: false
                }
            ],
            metadata: {
                research_field: researchField,
                research_category: 'General',
                total_properties: 8,
                adaptability_score: 0.7,
                suggested_sections: ['methodology', 'experiments', 'results', 'discussion']
            }
        };
    }

    /**
     * Validate template response
     */
    validateTemplateResponse(templateData, researchField) {
        // Ensure required fields exist
        const template = {
            id: templateData.id || `template-${Date.now()}`,
            name: templateData.name || `${researchField} Template`,
            label: templateData.label || templateData.name || `${researchField} Template`,
            description: templateData.description || 'AI-generated research template',
            properties: this.validateProperties(templateData.properties || []),
            metadata: {
                research_field: researchField,
                research_category: templateData.metadata?.research_category || 'General',
                total_properties: (templateData.properties || []).length,
                adaptability_score: templateData.metadata?.adaptability_score || 0.8,
                suggested_sections: templateData.metadata?.suggested_sections || [],
                creation_timestamp: new Date().toISOString(),
                template_version: '1.0'
            }
        };

        // Ensure minimum number of properties
        if (template.properties.length < 5) {
            template.properties = template.properties.concat(this.getDefaultProperties());
        }

        // Update metadata
        template.metadata.total_properties = template.properties.length;

        return template;
    }

    /**
     * Validate and enhance properties
     */
    validateProperties(properties) {
        return properties.map((prop, index) => ({
            id: prop.id || `prop-${index}`,
            label: prop.label || `Property ${index + 1}`,
            description: prop.description || 'Property description',
            type: this.validatePropertyType(prop.type),
            required: prop.required === true,
            value: null,
            confidence: null,
            evidence: null,
            source_section: null
        })).filter(prop => prop.label && prop.label.trim().length > 0);
    }

    /**
     * Validate property type
     */
    validatePropertyType(type) {
        const validTypes = ['text', 'number', 'resource', 'boolean'];
        return validTypes.includes(type) ? type : 'text';
    }

    /**
     * Get default properties for fallback
     */
    getDefaultProperties() {
        return [
            {
                id: 'methodology',
                label: 'Methodology',
                description: 'Research methodology used',
                type: 'text',
                required: true
            },
            {
                id: 'dataset',
                label: 'Dataset',
                description: 'Dataset used in the research',
                type: 'resource',
                required: true
            },
            {
                id: 'evaluation_metric',
                label: 'Evaluation Metric',
                description: 'Primary evaluation metric',
                type: 'text',
                required: true
            }
        ];
    }

    /**
     * Create fallback problem when generation fails
     */
    createFallbackProblem(title) {
        return {
            title: `Investigating ${title || 'Research Domain'}`,
            description: 'This research addresses fundamental challenges in the domain. The AI service is currently unavailable - please edit this placeholder to reflect the specific research problem.',
            isFallback: true
        };
    }
    
    /**
     * Simple hash function for cache keys
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
}

/**
 * Generation Prompt Templates
 * Contains templates for different generation tasks
 */
class GenerationPromptTemplates {
    constructor() {
        this.problemGenerationSystem = `You are an expert research analyst specializing in identifying and articulating research problems from academic papers. Your task is to generate clear, specific research problems based on paper titles and abstracts.

Guidelines:
1. Generate a research problem that is DIFFERENT from the paper title
2. Focus on the underlying challenge or gap the paper addresses
3. Make it general enough to apply to related research
4. Keep the problem statement concise but comprehensive
5. Ensure the problem is actionable and researchable

Format your response as JSON:
{
  "title": "Brief problem title (different from paper title)",
  "description": "Detailed problem description (2-3 sentences)"
}
Your outputs should ONLY be a valid JSON. Do not include code fences, explanations, or any extra text`;

        this.templateGenerationSystem = `You are an expert in research methodology and knowledge extraction. Your task is to generate structured templates for academic research based on the research field, problem, and abstract.

Generate a research template that focuses on technical aspects and methodological choices. The template should be reusable across similar research problems in the same domain.

Format your response as JSON:
{
  "id": "unique-template-id",
  "name": "Template Name",
  "label": "Template Label",
  "description": "Template description",
  "properties": [
    {
      "id": "property-id",
      "label": "Property Label",
      "description": "Property description",
      "type": "text|number|resource|boolean",
      "required": true|false
    }
  ],
  "metadata": {
    "research_field": "Research Field",
    "research_category": "Category",
    "total_properties": 0,
    "adaptability_score": 0.0,
    "suggested_sections": []
  }
}
Your outputs should ONLY be a valid JSON. Do not include code fences, explanations, or any extra text`;
    }

    /**
     * Build prompt for research problem generation
     */
    buildProblemGenerationPrompt(title, abstract) {
        let prompt = '';
        
        if (title) {
            prompt += `Paper Title: "${title}"\n\n`;
        }
        
        if (abstract) {
            prompt += `Abstract: "${abstract}"\n\n`;
        }

        prompt += `Based on the ${title && abstract ? 'title and abstract' : title ? 'title' : 'abstract'} above, generate a research problem that this paper likely addresses. The problem should be:

1. DIFFERENT from the paper title (not just a rephrasing)
2. Focus on the underlying challenge or research gap
3. Be general enough for other researchers to work on
4. Clearly articulated and specific

Examples of good research problems:
- "How to improve accuracy of sentiment analysis in multilingual social media content"
- "Developing efficient algorithms for real-time object detection in resource-constrained environments"
- "Understanding the impact of climate change on biodiversity in urban ecosystems"

Generate the research problem now:`;

        return prompt;
    }

    /**
     * Build prompt for template generation
     */
    buildTemplateGenerationPrompt(researchField, problemDescription, abstract) {
        let prompt = `Generate a research template for the following:

Research Field: ${researchField}
Problem Description: ${problemDescription}`;

        if (abstract) {
            prompt += `\nAbstract: ${abstract}`;
        }

        prompt += `

Guidelines:
1. Focus on technical implementation details and methodological choices
2. Include quantitative metrics and evaluation criteria
3. Capture domain-specific technical components while keeping template reusable
4. Properties should reflect both technical depth and cross-domain applicability
5. Include specific parameters and configurations that impact results

Create a template with 8-15 properties that would be commonly used for similar research problems in this field.

Property categories to include:
1. Technical Implementation (methods, algorithms, architectures)
2. Data Processing (datasets, preprocessing, features)
3. Evaluation Framework (metrics, validation methods)
4. Results and Performance (quantitative results, comparisons)
5. Technical Limitations (constraints, trade-offs)

Each property should have:
- Unique ID
- Clear, descriptive label
- Detailed description explaining what information to capture
- Appropriate type (text, number, resource, boolean)
- Required flag based on importance

Template metadata should include:
- Research field and category
- Total properties count
- Adaptability score (0-1) indicating how well it applies to similar problems
- Suggested document sections where these properties might be found`;

        return prompt;
    }
}

export default GenerationAdapter;

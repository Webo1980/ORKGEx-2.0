// ================================
// src/core/services/TextExtractionService.js - Enhanced Version
// ================================

import BaseExtractorService from './BaseExtractorService.js';
import { eventManager } from '../../utils/eventManager.js';

export class TextExtractionService extends BaseExtractorService {
    constructor(config = {}) {
        super(config);
        
        this.config = {
            ...this.config,
            minSectionLength: 50,
            maxSectionLength: 10000,
            includeHeaders: true,
            includeParagraphs: true,
            includeLists: true,
            includeTables: false,
            includeCodeBlocks: false,
            sectionPatterns: {
                abstract: /abstract|summary/i,
                introduction: /introduction|background/i,
                methodology: /method|approach|procedure|materials/i,
                results: /result|finding|observation/i,
                discussion: /discussion|interpretation/i,
                conclusion: /conclusion|summary|future/i,
                references: /reference|bibliography|citation/i
            },
            ...config
        };
        
        this.sections = {};
        this.rawText = '';
        this.documentStructure = null;
    }
    
    getType() {
        return 'text';
    }
    
    async extractAll(context = document) {
        try {
            console.log('📝 Starting text extraction...');
            
            // Reset previous data
            this.sections = {};
            this.rawText = '';
            
            // Step 1: Analyze document structure
            this.documentStructure = this.analyzeDocumentStructure(context);
            
            // Step 2: Extract sections based on structure
            const extractedSections = await this.extractSections(context);
            
            // Step 3: Clean and normalize sections
            this.sections = this.normalizeSections(extractedSections);
            
            // Step 4: Format for RAG analysis
            const formattedSections = this.formatForRAG(this.sections);
            
            console.log(`📝 Extracted ${Object.keys(formattedSections).length} sections`);
            
            // Emit extraction complete event
            eventManager.emit('text:extraction_complete', {
                sections: formattedSections,
                structure: this.documentStructure,
                stats: this.getExtractionStats()
            });
            
            return formattedSections;
            
        } catch (error) {
            console.error('Text extraction failed:', error);
            throw error;
        }
    }
    
    analyzeDocumentStructure(context) {
        const structure = {
            hasAbstract: false,
            hasIntroduction: false,
            hasMethodology: false,
            hasResults: false,
            hasDiscussion: false,
            hasConclusion: false,
            hasReferences: false,
            headings: [],
            totalWords: 0,
            totalParagraphs: 0
        };
        
        // Find all headings
        const headings = context.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            const text = heading.textContent.trim();
            structure.headings.push({
                level: parseInt(heading.tagName.charAt(1)),
                text: text,
                element: heading
            });
            
            // Check for standard sections
            Object.keys(this.config.sectionPatterns).forEach(section => {
                if (this.config.sectionPatterns[section].test(text)) {
                    structure[`has${section.charAt(0).toUpperCase() + section.slice(1)}`] = true;
                }
            });
        });
        
        // Count paragraphs and words
        const paragraphs = context.querySelectorAll('p');
        structure.totalParagraphs = paragraphs.length;
        
        paragraphs.forEach(p => {
            const words = p.textContent.trim().split(/\s+/).length;
            structure.totalWords += words;
        });
        
        console.log('📊 Document structure:', structure);
        return structure;
    }
    
    async extractSections(context) {
        const sections = {};
        
        // Strategy 1: Extract by identified headings
        if (this.documentStructure.headings.length > 0) {
            sections.byHeadings = this.extractByHeadings(context);
        }
        
        // Strategy 2: Extract by semantic patterns
        sections.bySemantic = this.extractBySemanticPatterns(context);
        
        // Strategy 3: Extract by DOM structure
        sections.byDOM = this.extractByDOMStructure(context);
        
        // Merge strategies intelligently
        return this.mergeExtractionStrategies(sections);
    }
    
    extractByHeadings(context) {
        const sections = {};
        const headings = this.documentStructure.headings;
        
        for (let i = 0; i < headings.length; i++) {
            const currentHeading = headings[i];
            const nextHeading = headings[i + 1];
            
            // Determine section name
            let sectionName = this.identifySectionType(currentHeading.text);
            if (!sectionName) {
                sectionName = this.sanitizeSectionName(currentHeading.text);
            }
            
            // Extract content between headings
            const content = this.extractContentBetweenElements(
                currentHeading.element,
                nextHeading ? nextHeading.element : null,
                context
            );
            
            if (content.trim().length >= this.config.minSectionLength) {
                sections[sectionName] = content;
            }
        }
        
        return sections;
    }
    
    extractBySemanticPatterns(context) {
        const sections = {};
        
        // Look for abstract
        const abstractElement = this.findAbstract(context);
        if (abstractElement) {
            sections.abstract = this.cleanText(abstractElement.textContent);
        }
        
        // Look for introduction
        const introElement = this.findIntroduction(context);
        if (introElement) {
            sections.introduction = this.cleanText(introElement.textContent);
        }
        
        // Look for conclusions
        const conclusionElement = this.findConclusion(context);
        if (conclusionElement) {
            sections.conclusion = this.cleanText(conclusionElement.textContent);
        }
        
        return sections;
    }
    
    extractByDOMStructure(context) {
        const sections = {};
        
        // Look for article sections
        const articleSections = context.querySelectorAll('section, article > div');
        
        articleSections.forEach((section, index) => {
            const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
            const sectionName = heading 
                ? this.sanitizeSectionName(heading.textContent)
                : `section_${index + 1}`;
            
            const content = this.extractSectionContent(section);
            
            if (content.length >= this.config.minSectionLength) {
                sections[sectionName] = content;
            }
        });
        
        // If no sections found, extract main content
        if (Object.keys(sections).length === 0) {
            const mainContent = this.extractMainContent(context);
            if (mainContent) {
                sections.main_content = mainContent;
            }
        }
        
        return sections;
    }
    
    extractContentBetweenElements(startElement, endElement, context) {
        const content = [];
        let currentElement = startElement.nextElementSibling;
        
        while (currentElement && currentElement !== endElement) {
            if (this.isContentElement(currentElement)) {
                const text = this.extractElementContent(currentElement);
                if (text) {
                    content.push(text);
                }
            }
            currentElement = currentElement.nextElementSibling;
        }
        
        return content.join('\n\n');
    }
    
    extractSectionContent(section) {
        const content = [];
        
        // Extract paragraphs
        if (this.config.includeParagraphs) {
            const paragraphs = section.querySelectorAll('p');
            paragraphs.forEach(p => {
                const text = this.cleanText(p.textContent);
                if (text.length > 20) {
                    content.push(text);
                }
            });
        }
        
        // Extract lists
        if (this.config.includeLists) {
            const lists = section.querySelectorAll('ul, ol');
            lists.forEach(list => {
                const items = Array.from(list.querySelectorAll('li'))
                    .map(li => `• ${this.cleanText(li.textContent)}`)
                    .join('\n');
                if (items) {
                    content.push(items);
                }
            });
        }
        
        return content.join('\n\n');
    }
    
    extractMainContent(context) {
        // Try to find main content area
        const mainSelectors = [
            'main',
            '[role="main"]',
            'article',
            '.content',
            '#content',
            '.article-content',
            '.paper-content'
        ];
        
        for (const selector of mainSelectors) {
            const mainElement = context.querySelector(selector);
            if (mainElement) {
                return this.extractSectionContent(mainElement);
            }
        }
        
        // Fallback: extract all paragraphs
        const allParagraphs = context.querySelectorAll('p');
        const content = Array.from(allParagraphs)
            .map(p => this.cleanText(p.textContent))
            .filter(text => text.length > 50)
            .join('\n\n');
        
        return content;
    }
    
    mergeExtractionStrategies(strategies) {
        const merged = {};
        
        // Priority: byHeadings > bySemantic > byDOM
        const sources = [
            strategies.byHeadings || {},
            strategies.bySemantic || {},
            strategies.byDOM || {}
        ];
        
        // Merge all sources
        sources.forEach(source => {
            Object.entries(source).forEach(([key, value]) => {
                if (!merged[key] || value.length > merged[key].length) {
                    merged[key] = value;
                }
            });
        });
        
        return merged;
    }
    
    normalizeSections(sections) {
        const normalized = {};
        
        Object.entries(sections).forEach(([name, content]) => {
            // Clean content
            let cleanContent = this.cleanText(content);
            
            // Ensure within size limits
            if (cleanContent.length > this.config.maxSectionLength) {
                cleanContent = cleanContent.substring(0, this.config.maxSectionLength) + '...';
            }
            
            // Only include non-empty sections
            if (cleanContent.length >= this.config.minSectionLength) {
                normalized[name] = cleanContent;
            }
        });
        
        return normalized;
    }
    
    formatForRAG(sections) {
        const formatted = {};
        
        // Standard section order for papers
        const sectionOrder = [
            'abstract',
            'introduction',
            'methodology',
            'methods',
            'results',
            'discussion',
            'conclusion',
            'references'
        ];
        
        // Add sections in order
        sectionOrder.forEach(sectionName => {
            if (sections[sectionName]) {
                formatted[sectionName] = sections[sectionName];
            }
        });
        
        // Add any remaining sections
        Object.entries(sections).forEach(([name, content]) => {
            if (!formatted[name]) {
                formatted[name] = content;
            }
        });
        
        return formatted;
    }
    
    // Helper methods
    findAbstract(context) {
        const selectors = [
            '.abstract',
            '#abstract',
            '[class*="abstract"]',
            'section:has(h2:contains("Abstract"))',
            'div:has(h2:contains("Abstract"))'
        ];
        
        for (const selector of selectors) {
            try {
                const element = context.querySelector(selector);
                if (element) return element;
            } catch (e) {
                // Some selectors might not be supported
                continue;
            }
        }
        
        // Text-based search
        const allElements = context.querySelectorAll('p, div');
        for (const element of allElements) {
            const prevElement = element.previousElementSibling;
            if (prevElement && /abstract/i.test(prevElement.textContent)) {
                return element;
            }
        }
        
        return null;
    }
    
    findIntroduction(context) {
        const selectors = [
            '.introduction',
            '#introduction',
            'section:has(h2:contains("Introduction"))',
            'section:has(h2:contains("Background"))'
        ];
        
        for (const selector of selectors) {
            try {
                const element = context.querySelector(selector);
                if (element) return element;
            } catch (e) {
                continue;
            }
        }
        
        return null;
    }
    
    findConclusion(context) {
        const selectors = [
            '.conclusion',
            '#conclusion',
            '.conclusions',
            '#conclusions',
            'section:has(h2:contains("Conclusion"))'
        ];
        
        for (const selector of selectors) {
            try {
                const element = context.querySelector(selector);
                if (element) return element;
            } catch (e) {
                continue;
            }
        }
        
        return null;
    }
    
    identifySectionType(headingText) {
        const normalized = headingText.toLowerCase().trim();
        
        for (const [section, pattern] of Object.entries(this.config.sectionPatterns)) {
            if (pattern.test(normalized)) {
                return section;
            }
        }
        
        return null;
    }
    
    sanitizeSectionName(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);
    }
    
    isContentElement(element) {
        const contentTags = ['P', 'UL', 'OL', 'DL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'FIGURE'];
        return contentTags.includes(element.tagName);
    }
    
    extractElementContent(element) {
        switch (element.tagName) {
            case 'P':
                return this.cleanText(element.textContent);
            
            case 'UL':
            case 'OL':
                if (this.config.includeLists) {
                    return Array.from(element.querySelectorAll('li'))
                        .map(li => `• ${this.cleanText(li.textContent)}`)
                        .join('\n');
                }
                break;
            
            case 'TABLE':
                if (this.config.includeTables) {
                    return this.extractTableAsText(element);
                }
                break;
            
            case 'PRE':
            case 'CODE':
                if (this.config.includeCodeBlocks) {
                    return element.textContent;
                }
                break;
            
            default:
                return this.cleanText(element.textContent);
        }
        
        return '';
    }
    
    extractTableAsText(table) {
        const rows = Array.from(table.querySelectorAll('tr'));
        return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            return cells.map(cell => this.cleanText(cell.textContent)).join(' | ');
        }).join('\n');
    }
    
    cleanText(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    
    getExtractionStats() {
        const stats = {
            totalSections: Object.keys(this.sections).length,
            totalWords: 0,
            totalCharacters: 0,
            sectionBreakdown: {}
        };
        
        Object.entries(this.sections).forEach(([name, content]) => {
            const words = content.split(/\s+/).length;
            const chars = content.length;
            
            stats.totalWords += words;
            stats.totalCharacters += chars;
            stats.sectionBreakdown[name] = {
                words: words,
                characters: chars
            };
        });
        
        return stats;
    }
    
    // Public API
    getSections() {
        return this.sections;
    }
    
    getSection(name) {
        return this.sections[name] || null;
    }
    
    getRawText() {
        return Object.values(this.sections).join('\n\n');
    }
    
    async extractSpecificSection(sectionName, context = document) {
        const allSections = await this.extractAll(context);
        return allSections[sectionName] || null;
    }
    
    reset() {
        this.sections = {};
        this.rawText = '';
        this.documentStructure = null;
    }
}

export default TextExtractionService;
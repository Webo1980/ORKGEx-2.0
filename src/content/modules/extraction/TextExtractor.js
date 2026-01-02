// ================================
// src/content/modules/extraction/TextExtractor.js - ENHANCED
// ================================

(function(global) {
  'use strict';
  
  // Check if already exists
  if (global.textExtractor) {
    console.log('📝 TextExtractor already exists, skipping creation');
    return;
  }
  
  /**
   * Enhanced Text Extractor for ORKG Content Script
   * Comprehensive extraction preserving all document sections
   */
  class TextExtractor {
    constructor() {
      this.isInitialized = false;
      
      // Configuration
      this.config = {
        // Text processing
        minSectionLength: 50,
        maxSectionLength: 50000,
        minParagraphLength: 10,
        
        // Content inclusion
        includeHeaders: true,
        includeParagraphs: true,
        includeLists: true,
        includeBlockquotes: true,
        includeCodeBlocks: false,
        
        // Exclusions - we handle these separately
        includeTables: false,
        includeFigures: false,
        includeImages: false,
        
        // Section detection
        preserveDocumentOrder: true,
        mergeShortSections: false, // Changed to false to preserve all sections
        deduplicateContent: true,
        captureAllHeaders: true, // New flag to ensure we get all headers
        
        // LLM optimization
        maxBatchSize: 8000, // Characters per batch for LLM
        optimalBatchSize: 6000, // Target batch size
        minBatchSize: 2000, // Minimum batch size
        
        // Sections to exclude (ban list) - made more specific
        bannedSections: new Set([
          'references', 'bibliography', 'works cited', 'citations',
          'copyright', 'disclaimer', 'terms of use', 'privacy policy',
          'cookie policy', 'supplementary material', 'supplementary data',
          'supporting information', 'supplemental material'
        ]),
        
        // Keywords to identify banned content - more precise
        bannedKeywords: [
          'references', 'bibliography', 'works cited', 'copyright notice',
          '©', '®', 'all rights reserved', 'terms of use', 'privacy policy',
          'cookie policy', 'supplementary material', 'supporting information'
        ],
        
        // Tags to skip entirely
        skipTags: new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TABLE', 'FIGURE', 'IMG', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME']),
        
        // Elements to skip based on class/id patterns
        skipPatterns: [
          'cookie', 'banner', 'advertisement', 'ads', 'popup', 'modal', 
          'overlay', 'social-share', 'comments-section', 'related-articles'
        ]
      };
      
      // Track processed elements to avoid duplicates
      this.processedElements = new WeakSet();
      this.sectionCounter = 0;
    }
    
    async init() {
      if (this.isInitialized) {
        console.warn('TextExtractor already initialized');
        return;
      }
      
      console.log('📄 Initializing Enhanced TextExtractor...');
      this.isInitialized = true;
      console.log('✅ TextExtractor initialized');
    }
    
    /**
     * Main extraction method
     */
    async extractAll(config = {}) {
      if (!this.isInitialized) {
        await this.init();
      }
      
      const mergedConfig = { ...this.config, ...config };
      console.log('📄 Starting comprehensive text extraction');
      
      try {
        // Reset state for new extraction
        this.processedElements = new WeakSet();
        this.sectionCounter = 0;
        
        // Step 1: Extract all sections preserving hierarchy
        const orderedSections = this.extractComprehensiveSections(document.body, mergedConfig);
        
        // Step 2: Filter banned sections (but keep important ones like Declaration of Competing Interest)
        const filteredSections = this.intelligentFilterSections(orderedSections, mergedConfig);
        
        // Step 3: Process sections (merge if configured, otherwise keep as-is)
        const processedSections = mergedConfig.mergeShortSections ? 
          this.mergeShortSections(filteredSections, mergedConfig) : 
          filteredSections;
        
        // Step 4: Convert to object format for backward compatibility
        const sectionsObject = this.convertToSectionsObject(processedSections);
        
        // Step 5: Optimize for LLM batching
        const optimizedBatches = this.optimizeForLLM(processedSections, mergedConfig);
        
        // Step 6: Calculate statistics
        const stats = this.calculateStats(processedSections, optimizedBatches);
        
        const result = {
          sections: sectionsObject,
          orderedSections: processedSections,
          batches: optimizedBatches,
          stats: stats
        };
        
        console.log(`✅ Extraction complete: ${stats.totalSections} sections found`);
        console.log('📋 Section titles:', processedSections.map(s => s.title));
        
        return result;
        
      } catch (error) {
        console.error('❌ Text extraction failed:', error);
        return this.getFallbackContent(mergedConfig);
      }
    }
    
    /**
     * Comprehensive section extraction
     */
    extractComprehensiveSections(container, config) {
      const sections = [];
      let currentSection = null;
      let currentContent = [];
      let unnamedSectionCount = 1;
      
      // First, try to find main content area
      const mainContent = this.findMainContentArea(container);
      
      // Get ALL elements including headers and content
      const allElements = mainContent.querySelectorAll('*');
      
      console.log(`📄 Processing ${allElements.length} elements`);
      
      for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        
        // Skip if already processed or should be skipped
        if (this.processedElements.has(element) || this.shouldSkipElement(element, config)) {
          continue;
        }
        
        const tag = element.tagName;
        
        // Check if this is a header (h1-h6)
        if (/^H[1-6]$/i.test(tag)) {
          // Mark as processed
          this.processedElements.add(element);
          
          // Save previous section if exists
          if (currentSection !== null && currentContent.length > 0) {
            const content = this.joinContent(currentContent);
            if (content.length >= config.minParagraphLength) {
              sections.push(this.createSection(currentSection, content, sections.length));
            }
            currentContent = [];
          }
          
          // Get header text
          const headerText = this.cleanHeaderText(element);
          if (headerText) {
            currentSection = headerText;
            console.log(`📑 Found section: ${headerText}`);
          }
          
        } else if (this.isContentElement(element, config)) {
          // Skip if it's inside a table or figure
          if (element.closest('table, figure, .table-wrap, .fig')) {
            continue;
          }
          
          // Skip if it has child headers (it's a container)
          if (element.querySelector('h1, h2, h3, h4, h5, h6')) {
            continue;
          }
          
          // Extract text content
          const text = this.extractTextContent(element, config);
          
          if (text && text.length >= config.minParagraphLength) {
            // Mark as processed
            this.processedElements.add(element);
            
            // If no current section, check if this might be a special section
            if (currentSection === null) {
              // Check for special sections like Abstract, Keywords, Highlights
              const specialSection = this.detectSpecialSection(element, text);
              if (specialSection) {
                currentSection = specialSection;
                console.log(`📑 Detected special section: ${specialSection}`);
              } else {
                currentSection = `Section ${unnamedSectionCount++}`;
              }
            }
            
            currentContent.push(text);
          }
        }
      }
      
      // Save the last section
      if (currentSection !== null && currentContent.length > 0) {
        const content = this.joinContent(currentContent);
        if (content.length >= config.minParagraphLength) {
          sections.push(this.createSection(currentSection, content, sections.length));
        }
      }
      
      // Post-process to ensure we didn't miss any sections
      const enhancedSections = this.enhanceWithMissedSections(sections, mainContent, config);
      
      return enhancedSections;
    }
    
    /**
     * Find the main content area of the document
     */
    findMainContentArea(container) {
      // Try to find article or main content container
      const selectors = [
        'article', 
        'main',
        '[role="main"]',
        '.main-content',
        '#main-content',
        '.article-content',
        '.paper-content',
        '.content-main',
        '.els-article-content', // Elsevier specific
        '#body', // Some publishers
        '.body',
        '.fulltext',
        '#content'
      ];
      
      for (const selector of selectors) {
        const element = container.querySelector(selector);
        if (element) {
          console.log(`📍 Found main content area: ${selector}`);
          return element;
        }
      }
      
      // Fallback to body
      return container;
    }
    
    /**
     * Clean header text
     */
    cleanHeaderText(element) {
      // Get text content, removing any child elements that might interfere
      const clone = element.cloneNode(true);
      
      // Remove footnote references, badges, etc.
      clone.querySelectorAll('sup, .badge, .label, .ref').forEach(el => el.remove());
      
      let text = clone.textContent || '';
      
      // Clean up the text
      text = text
        .replace(/\s+/g, ' ')
        .replace(/^\s*[\d.]+\s*/, '') // Remove leading numbers (will be preserved in final text)
        .trim();
      
      // But preserve the original format with numbers if present
      const originalText = element.textContent.trim();
      if (/^\d+\./.test(originalText) || /^\d+\s+/.test(originalText)) {
        // Keep numbered sections as-is
        return originalText.replace(/\s+/g, ' ').trim();
      }
      
      return text || originalText;
    }
    
    /**
     * Check if element is a content element
     */
    isContentElement(element, config) {
      const tag = element.tagName.toLowerCase();
      
      // Direct content tags
      if (tag === 'p' && config.includeParagraphs) return true;
      if ((tag === 'li' || tag === 'dd' || tag === 'dt') && config.includeLists) return true;
      if (tag === 'blockquote' && config.includeBlockquotes) return true;
      if ((tag === 'pre' || tag === 'code') && config.includeCodeBlocks) return true;
      
      // Check for content containers that might have text
      if (['div', 'section', 'span'].includes(tag)) {
        // Check if it has direct text content (not just child elements)
        const hasDirectText = Array.from(element.childNodes).some(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 10
        );
        return hasDirectText;
      }
      
      return false;
    }
    
    /**
     * Extract text content from element
     */
    extractTextContent(element, config) {
      if (!element) return '';
      
      // Clone to avoid modifying original
      const clone = element.cloneNode(true);
      
      // Remove elements we want to skip
      clone.querySelectorAll('table, figure, img, svg, script, style').forEach(el => el.remove());
      
      // Get text
      let text = clone.textContent || '';
      
      // Clean the text
      text = text
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      return text;
    }
    
    /**
     * Detect special sections like Abstract, Keywords, Highlights
     */
    detectSpecialSection(element, text) {
      // Check parent elements for clues
      let current = element;
      for (let i = 0; i < 3; i++) {
        if (!current.parentElement) break;
        current = current.parentElement;
        
        // Check class and id
        const classAndId = `${current.className} ${current.id}`.toLowerCase();
        
        if (classAndId.includes('abstract')) return 'Abstract';
        if (classAndId.includes('keyword')) return 'Keywords';
        if (classAndId.includes('highlight')) return 'Highlights';
        if (classAndId.includes('summary')) return 'Summary';
      }
      
      // Check text content for clues
      const textLower = text.toLowerCase().substring(0, 100);
      if (textLower.includes('abstract')) return 'Abstract';
      if (textLower.includes('keywords:') || textLower.includes('key words:')) return 'Keywords';
      if (textLower.includes('highlights:')) return 'Highlights';
      
      return null;
    }
    
    /**
     * Enhance sections with any missed content
     */
    enhanceWithMissedSections(sections, container, config) {
      const sectionTitles = new Set(sections.map(s => s.title.toLowerCase()));
      const enhanced = [...sections];
      
      // Check for common sections that might have been missed
      const commonSections = [
        { selector: '.abstract, [class*="abstract"]', title: 'Abstract' },
        { selector: '.keywords, [class*="keyword"]', title: 'Keywords' },
        { selector: '.highlights, [class*="highlight"]', title: 'Highlights' },
        { selector: '.conclusion, [class*="conclusion"]', title: 'Conclusion' }
      ];
      
      commonSections.forEach(({ selector, title }) => {
        if (!sectionTitles.has(title.toLowerCase())) {
          const element = container.querySelector(selector);
          if (element && !this.processedElements.has(element)) {
            const text = this.extractTextContent(element, config);
            if (text && text.length >= config.minParagraphLength) {
              // Insert at appropriate position (Abstract/Keywords/Highlights at start)
              const section = this.createSection(title, text, enhanced.length);
              if (['Abstract', 'Keywords', 'Highlights'].includes(title)) {
                enhanced.unshift(section);
              } else {
                enhanced.push(section);
              }
              console.log(`📑 Added missed section: ${title}`);
            }
          }
        }
      });
      
      return enhanced;
    }
    
    /**
     * Create a section object
     */
    createSection(title, content, order) {
      return {
        id: this.generateSectionId(title),
        title: title,
        content: content,
        wordCount: this.countWords(content),
        charCount: content.length,
        order: order
      };
    }
    
    /**
     * Join content pieces
     */
    joinContent(contentPieces) {
      return contentPieces
        .filter(piece => piece && piece.trim())
        .join('\n\n');
    }
    
    /**
     * Intelligent section filtering
     */
    intelligentFilterSections(sections, config) {
      return sections.filter(section => {
        const titleLower = section.title.toLowerCase();
        const contentPreview = section.content.substring(0, 300).toLowerCase();
        
        // Keep important sections even if they have keywords
        const importantSections = [
          'declaration of competing interest',
          'credit authorship contribution statement',
          'data availability',
          'acknowledgments',
          'acknowledgements',
          'funding'
        ];
        
        // Check if it's an important section we want to keep
        if (importantSections.some(important => titleLower.includes(important))) {
          // Only filter if it's truly a banned section
          if (titleLower === 'references' || titleLower === 'bibliography') {
            console.log(`⚠️ Filtering banned section: ${section.title}`);
            return false;
          }
          // Keep it
          return true;
        }
        
        // Check against strict banned list
        if (config.bannedSections.has(titleLower)) {
          console.log(`⚠️ Filtering banned section: ${section.title}`);
          return false;
        }
        
        // Check for references/bibliography specifically
        if (titleLower.includes('reference') && !titleLower.includes('reference to')) {
          console.log(`⚠️ Filtering references section: ${section.title}`);
          return false;
        }
        
        // Check for supplementary material
        if (titleLower.includes('supplementary') || titleLower.includes('supplemental')) {
          console.log(`⚠️ Filtering supplementary section: ${section.title}`);
          return false;
        }
        
        return true;
      });
    }
    
    /**
     * Check if element should be skipped
     */
    shouldSkipElement(element, config) {
      if (!element) return true;
      
      const tag = element.tagName;
      
      // Skip banned tags
      if (config.skipTags.has(tag)) {
        return true;
      }
      
      // Skip if inside navigation, header, footer
      if (element.closest('nav, header > *, footer, aside')) {
        return true;
      }
      
      // Check visibility
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return true;
      }
      
      // Check for skip patterns in class or id
      const identifier = `${element.className || ''} ${element.id || ''}`.toLowerCase();
      
      // Skip certain UI elements
      return config.skipPatterns.some(pattern => identifier.includes(pattern));
    }
    
    /**
     * Merge short sections (optional)
     */
    mergeShortSections(sections, config) {
      const merged = [];
      let currentMerged = null;
      
      sections.forEach(section => {
        // Never merge these important sections
        const doNotMerge = [
          'abstract', 'keywords', 'highlights', 'introduction',
          'conclusion', 'methodology', 'results', 'discussion'
        ];
        
        const shouldNotMerge = doNotMerge.some(keyword => 
          section.title.toLowerCase().includes(keyword)
        );
        
        if (shouldNotMerge || section.charCount >= config.optimalBatchSize) {
          // Save current merged if exists
          if (currentMerged) {
            merged.push(currentMerged);
            currentMerged = null;
          }
          // Add important or large section as-is
          merged.push(section);
        } else if (section.charCount < config.minBatchSize) {
          // Try to merge small section
          if (!currentMerged) {
            currentMerged = { ...section };
          } else if (currentMerged.charCount + section.charCount <= config.optimalBatchSize) {
            // Merge sections
            currentMerged.title += ` / ${section.title}`;
            currentMerged.content += '\n\n' + section.content;
            currentMerged.charCount += section.charCount;
            currentMerged.wordCount += section.wordCount;
          } else {
            // Current merged is full, save it and start new
            merged.push(currentMerged);
            currentMerged = { ...section };
          }
        } else {
          // Medium-sized section, save current merged and add this
          if (currentMerged) {
            merged.push(currentMerged);
            currentMerged = null;
          }
          merged.push(section);
        }
      });
      
      // Save any remaining merged section
      if (currentMerged) {
        merged.push(currentMerged);
      }
      
      return merged;
    }
    
    /**
     * Convert ordered sections to object format
     */
    convertToSectionsObject(orderedSections) {
      const sectionsObject = {};
      
      orderedSections.forEach(section => {
        let key = section.id;
        
        // Handle duplicate keys
        let counter = 1;
        let finalKey = key;
        while (sectionsObject[finalKey]) {
          finalKey = `${key}_${counter}`;
          counter++;
        }
        
        sectionsObject[finalKey] = section.content;
      });
      
      return sectionsObject;
    }
    
    /**
     * Optimize sections for LLM batching
     */
    optimizeForLLM(sections, config) {
      const batches = [];
      let currentBatch = [];
      let currentBatchSize = 0;
      
      sections.forEach(section => {
        const sectionSize = section.charCount;
        
        // If section is too large, split it
        if (sectionSize > config.maxBatchSize) {
          // Flush current batch if not empty
          if (currentBatch.length > 0) {
            batches.push({
              sections: [...currentBatch],
              size: currentBatchSize,
              type: 'regular'
            });
            currentBatch = [];
            currentBatchSize = 0;
          }
          
          // Split large section
          const chunks = this.splitLargeSection(section, config);
          chunks.forEach(chunk => {
            batches.push({
              sections: [chunk],
              size: chunk.charCount,
              type: 'split'
            });
          });
        } else {
          // Check if adding this section exceeds batch size
          if (currentBatchSize + sectionSize > config.maxBatchSize) {
            // Flush current batch
            if (currentBatch.length > 0) {
              batches.push({
                sections: [...currentBatch],
                size: currentBatchSize,
                type: 'regular'
              });
            }
            // Start new batch
            currentBatch = [section];
            currentBatchSize = sectionSize;
          } else {
            // Add to current batch
            currentBatch.push(section);
            currentBatchSize += sectionSize;
          }
        }
      });
      
      // Flush remaining batch
      if (currentBatch.length > 0) {
        batches.push({
          sections: currentBatch,
          size: currentBatchSize,
          type: 'regular'
        });
      }
      
      console.log(`📦 Created ${batches.length} optimized batches for LLM`);
      return batches;
    }
    
    /**
     * Split large sections
     */
    splitLargeSection(section, config) {
      const chunks = [];
      const sentences = this.splitIntoSentences(section.content);
      
      let currentChunk = {
        id: section.id,
        title: section.title,
        content: '',
        wordCount: 0,
        charCount: 0,
        order: section.order
      };
      
      let partNumber = 1;
      
      sentences.forEach(sentence => {
        if (currentChunk.charCount + sentence.length > config.optimalBatchSize) {
          if (currentChunk.content) {
            currentChunk.id = `${section.id}_part_${partNumber}`;
            currentChunk.title = `${section.title} (Part ${partNumber})`;
            chunks.push(currentChunk);
            partNumber++;
            
            currentChunk = {
              id: section.id,
              title: section.title,
              content: '',
              wordCount: 0,
              charCount: 0,
              order: section.order
            };
          }
        }
        
        currentChunk.content += (currentChunk.content ? ' ' : '') + sentence;
        currentChunk.charCount += sentence.length;
        currentChunk.wordCount += this.countWords(sentence);
      });
      
      if (currentChunk.content) {
        currentChunk.id = `${section.id}_part_${partNumber}`;
        currentChunk.title = `${section.title} (Part ${partNumber})`;
        chunks.push(currentChunk);
      }
      
      return chunks;
    }
    
    /**
     * Split text into sentences
     */
    splitIntoSentences(text) {
      const sentences = [];
      const regex = /[^.!?]+[.!?]+/g;
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        sentences.push(match[0].trim());
      }
      
      const lastIndex = regex.lastIndex || 0;
      if (lastIndex < text.length) {
        const remainder = text.substring(lastIndex).trim();
        if (remainder) {
          sentences.push(remainder);
        }
      }
      
      return sentences.length > 0 ? sentences : [text];
    }
    
    /**
     * Generate section ID
     */
    generateSectionId(title) {
      // Preserve numbers in section titles
      return title
        .toLowerCase()
        .replace(/[^\w\s\d]/g, '') // Keep numbers
        .replace(/\s+/g, '_')
        .substring(0, 50);
    }
    
    /**
     * Count words
     */
    countWords(text) {
      return text.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    /**
     * Calculate statistics
     */
    calculateStats(sections, batches) {
      const totalSections = sections.length;
      const totalChars = sections.reduce((sum, section) => sum + section.charCount, 0);
      const totalWords = sections.reduce((sum, section) => sum + section.wordCount, 0);
      
      const batchCount = batches.length;
      const avgBatchSize = batches.length > 0 
        ? Math.round(batches.reduce((sum, batch) => sum + batch.size, 0) / batches.length)
        : 0;
      
      const estimatedTokens = Math.round(totalChars / 4);
      
      return {
        totalSections: totalSections,
        totalCharacters: totalChars,
        totalWords: totalWords,
        totalBatches: batchCount,
        averageBatchSize: avgBatchSize,
        estimatedTokens: estimatedTokens,
        estimatedLLMCalls: batchCount
      };
    }
    
    /**
     * Get fallback content
     */
    getFallbackContent(config) {
      console.log('⚠️ Using fallback content extraction');
      
      const bodyText = document.body.innerText || document.body.textContent || '';
      const cleanedText = bodyText.replace(/\s+/g, ' ').trim();
      
      const fallbackSection = {
        id: 'main_content',
        title: 'Main Content',
        content: cleanedText || 'Unable to extract content from this page.',
        wordCount: this.countWords(cleanedText),
        charCount: cleanedText.length,
        order: 0
      };
      
      return {
        sections: {
          main_content: fallbackSection.content
        },
        orderedSections: [fallbackSection],
        batches: [{
          sections: [fallbackSection],
          size: fallbackSection.charCount,
          type: 'fallback'
        }],
        stats: {
          totalSections: 1,
          totalCharacters: fallbackSection.charCount,
          totalWords: fallbackSection.wordCount,
          totalBatches: 1,
          averageBatchSize: fallbackSection.charCount,
          estimatedTokens: Math.round(fallbackSection.charCount / 4),
          estimatedLLMCalls: 1
        }
      };
    }
    
    /**
     * Alias for backward compatibility
     */
    async extractSections(config = {}) {
      const result = await this.extractAll(config);
      return {
        sections: result.sections,
        stats: result.stats
      };
    }
    
    /**
     * Clean up
     */
    cleanup() {
      this.processedElements = new WeakSet();
      this.sectionCounter = 0;
      this.isInitialized = false;
      console.log('🧹 TextExtractor cleaned up');
    }
  }
  
  // Create singleton instance
  const textExtractor = new TextExtractor();
  
  // Register with service registry if available
  if (global.serviceRegistry) {
    global.serviceRegistry.register('textExtractor', textExtractor);
    console.log('📝 TextExtractor registered with serviceRegistry');
  }
  
  // Expose globally
  global.textExtractor = textExtractor;
  global.TextExtractor = TextExtractor;
  
  console.log('📢 Enhanced TextExtractor exposed to global scope');
  
})(typeof window !== 'undefined' ? window : this);
// ================================
// src/content/modules/utils/TextSearchUtility.js
// ================================

(function(global) {
    'use strict';
    
    /**
     * TextSearchUtility
     * 
     * A comprehensive utility for searching and finding text in the DOM.
     * Provides multiple search strategies from exact to fuzzy matching.
     * Follows SOLID principles with clear separation of concerns.
     */
    class TextSearchUtility {
        constructor(config = {}) {
            this.config = {
                minSearchLength: 10,
                maxSearchLength: 1000,
                fuzzySegmentLength: 40,
                fuzzySegmentOverlap: 20,
                normalizeWhitespace: true,
                caseSensitive: false,
                wholeWords: false,
                searchTimeout: 5000,
                ...config
            };
            
            // Cache for performance
            this.searchCache = new Map();
            this.textNodeCache = null;
            this.cacheTimeout = null;
            
            // Statistics
            this.stats = {
                searches: 0,
                hits: 0,
                misses: 0,
                cacheHits: 0
            };
        }
        
        // ================================
        // Main Search Methods
        // ================================
        
        /**
         * Find text in DOM with multiple strategies
         * @param {string} text - Text to search for
         * @param {Object} options - Search options
         * @returns {Range|null} DOM Range or null if not found
         */
        findText(text, options = {}) {
            if (!this.validateSearchText(text)) {
                return null;
            }
            
            this.stats.searches++;
            
            const searchOptions = { ...this.config, ...options };
            const cacheKey = this.getCacheKey(text, searchOptions);
            
            // Check cache first
            if (this.searchCache.has(cacheKey)) {
                this.stats.cacheHits++;
                this.stats.hits++;
                return this.searchCache.get(cacheKey);
            }
            
            // Try search strategies in order
            const strategies = [
                () => this.findExactText(text, searchOptions),
                () => options.section ? this.findTextInSection(text, options.section, options.sentenceIndex) : null,
                () => this.findWithNormalization(text, searchOptions),
                () => this.findWithFuzzyMatch(text, searchOptions),
                () => this.findPartialMatch(text, searchOptions)
            ];
            
            for (const strategy of strategies) {
                try {
                    const range = strategy();
                    if (range) {
                        this.stats.hits++;
                        this.cacheResult(cacheKey, range);
                        return range;
                    }
                } catch (error) {
                    console.debug('Search strategy failed:', error);
                }
            }
            
            this.stats.misses++;
            return null;
        }
        
        /**
         * Find exact text match in DOM
         * @param {string} text - Text to search for
         * @param {Object} options - Search options
         * @returns {Range|null} DOM Range or null
         */
        findExactText(text, options = {}) {
            const searchText = this.prepareSearchText(text, options);
            
            // Use browser's native find if available
            if (window.find && window.getSelection) {
                return this.findUsingWindowFind(searchText, options);
            }
            
            // Fallback to manual search
            return this.findUsingTreeWalker(searchText, options);
        }
        
        /**
         * Find text in a specific section
         * @param {string} text - Text to search for
         * @param {string} sectionName - Section name/identifier
         * @param {number} sentenceIndex - Optional sentence index within section
         * @returns {Range|null} DOM Range or null
         */
        findTextInSection(text, sectionName, sentenceIndex = null) {
            const sectionElements = this.findSectionElements(sectionName);
            
            for (const sectionEl of sectionElements) {
                const range = this.searchWithinElement(sectionEl, text, sentenceIndex);
                if (range) return range;
                
                // Also search in siblings until next section
                const range2 = this.searchUntilNextSection(sectionEl, text, sentenceIndex);
                if (range2) return range2;
            }
            
            return null;
        }
        
        /**
         * Find text with normalization (smart quotes, spaces, etc.)
         * @param {string} text - Text to search for
         * @param {Object} options - Search options
         * @returns {Range|null} DOM Range or null
         */
        findWithNormalization(text, options = {}) {
            const normalizedVariants = this.generateNormalizedVariants(text);
            
            for (const variant of normalizedVariants) {
                const range = this.findExactText(variant, options);
                if (range) return range;
            }
            
            return null;
        }
        
        /**
         * Find text with fuzzy matching
         * @param {string} text - Text to search for
         * @param {Object} options - Search options
         * @returns {Range|null} DOM Range or null
         */
        findWithFuzzyMatch(text, options = {}) {
            // For long text, try matching segments
            if (text.length > 60) {
                const segments = this.splitIntoSegments(
                    text, 
                    options.fuzzySegmentLength || this.config.fuzzySegmentLength,
                    options.fuzzySegmentOverlap || this.config.fuzzySegmentOverlap
                );
                
                for (const segment of segments) {
                    if (segment.length >= 15) {
                        const range = this.findExactText(segment, options);
                        if (range) {
                            // Try to expand to full text
                            return this.expandRangeToFullText(range, text) || range;
                        }
                    }
                }
            }
            
            return null;
        }
        
        /**
         * Find partial match (first part of text)
         * @param {string} text - Text to search for
         * @param {Object} options - Search options
         * @returns {Range|null} DOM Range or null
         */
        findPartialMatch(text, options = {}) {
            const minLength = 20;
            const maxLength = 60;
            
            if (text.length < minLength) {
                return null;
            }
            
            // Try progressively shorter prefixes
            for (let length = Math.min(maxLength, text.length); length >= minLength; length -= 10) {
                const prefix = text.substring(0, length).trim();
                const range = this.findExactText(prefix, options);
                if (range) {
                    return range;
                }
            }
            
            return null;
        }
        
        // ================================
        // Search Implementation Methods
        // ================================
        
        /**
         * Find using browser's window.find API
         * @private
         */
        findUsingWindowFind(text, options) {
            // Save current selection
            const selection = window.getSelection();
            const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
            
            // Clear selection
            selection.removeAllRanges();
            
            try {
                // Perform search
                const found = window.find(
                    text,
                    options.caseSensitive || false,
                    false, // backwards
                    options.wholeWords || false,
                    false, // wrap
                    true,  // search in frames
                    false  // show dialog
                );
                
                if (found) {
                    const range = selection.getRangeAt(0).cloneRange();
                    return range;
                }
            } finally {
                // Restore selection
                selection.removeAllRanges();
                if (savedRange) {
                    selection.addRange(savedRange);
                }
            }
            
            return null;
        }
        
        /**
         * Find using TreeWalker API
         * @private
         */
        findUsingTreeWalker(text, options) {
            const textNodes = this.getTextNodes();
            const searchText = options.caseSensitive ? text : text.toLowerCase();
            
            for (const node of textNodes) {
                const nodeText = options.caseSensitive ? node.textContent : node.textContent.toLowerCase();
                const index = nodeText.indexOf(searchText);
                
                if (index !== -1) {
                    const range = document.createRange();
                    range.setStart(node, index);
                    range.setEnd(node, index + text.length);
                    return range;
                }
            }
            
            return null;
        }
        
        /**
         * Search within a specific element
         * @private
         */
        searchWithinElement(element, text, sentenceIndex = null) {
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                    }
                }
            );
            
            let node;
            let sentenceCount = 0;
            
            while (node = walker.nextNode()) {
                // If looking for specific sentence index
                if (sentenceIndex !== null) {
                    const sentences = this.extractSentences(node.textContent);
                    for (const sentence of sentences) {
                        if (sentenceCount === sentenceIndex && sentence.includes(text)) {
                            return this.createRangeForText(node, text);
                        }
                        sentenceCount++;
                    }
                } else if (node.textContent.includes(text)) {
                    return this.createRangeForText(node, text);
                }
            }
            
            return null;
        }
        
        /**
         * Search from element until next section
         * @private
         */
        searchUntilNextSection(startElement, text, sentenceIndex = null) {
            let current = startElement.nextElementSibling;
            const sectionTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION', 'ARTICLE'];
            
            while (current && !sectionTags.includes(current.tagName)) {
                const range = this.searchWithinElement(current, text, sentenceIndex);
                if (range) return range;
                current = current.nextElementSibling;
            }
            
            return null;
        }
        
        // ================================
        // Helper Methods
        // ================================
        
        /**
         * Find section elements by name
         * @private
         */
        findSectionElements(sectionName) {
            const elements = [];
            const normalizedSection = sectionName.toLowerCase();
            
            // Try different strategies to find sections
            const strategies = [
                // Headers containing section name
                () => Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).filter(
                    el => el.textContent.toLowerCase().includes(normalizedSection)
                ),
                // Elements with section-related classes
                () => Array.from(document.querySelectorAll('[class*="section"]')).filter(
                    el => el.textContent.toLowerCase().includes(normalizedSection)
                ),
                // Elements with IDs based on section name
                () => {
                    const id = normalizedSection.replace(/\s+/g, '-');
                    return Array.from(document.querySelectorAll(`[id*="${id}"]`));
                },
                // ARIA labels
                () => Array.from(document.querySelectorAll('[aria-label]')).filter(
                    el => el.getAttribute('aria-label').toLowerCase().includes(normalizedSection)
                )
            ];
            
            for (const strategy of strategies) {
                const found = strategy();
                if (found.length > 0) {
                    elements.push(...found);
                }
            }
            
            // Remove duplicates
            return [...new Set(elements)];
        }
        
        /**
         * Create a Range for text within a node
         * @private
         */
        createRangeForText(node, text) {
            const index = node.textContent.indexOf(text);
            if (index === -1) return null;
            
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + text.length);
            return range;
        }
        
        /**
         * Get all text nodes in document
         * @private
         */
        getTextNodes(root = document.body) {
            // Use cache if available and recent
            if (this.textNodeCache && this.cacheTimeout) {
                return this.textNodeCache;
            }
            
            const textNodes = [];
            const walker = document.createTreeWalker(
                root,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: (node) => {
                        // Skip empty nodes and script/style content
                        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                        if (node.parentElement.tagName === 'SCRIPT' || 
                            node.parentElement.tagName === 'STYLE') {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            
            // Cache for 5 seconds
            this.textNodeCache = textNodes;
            this.cacheTimeout = setTimeout(() => {
                this.textNodeCache = null;
                this.cacheTimeout = null;
            }, 5000);
            
            return textNodes;
        }
        
        /**
         * Split text into overlapping segments
         * @private
         */
        splitIntoSegments(text, segmentLength, overlap) {
            const segments = [];
            let start = 0;
            
            while (start < text.length) {
                const end = Math.min(start + segmentLength, text.length);
                const segment = text.substring(start, end).trim();
                if (segment) {
                    segments.push(segment);
                }
                start += segmentLength - overlap;
                
                // Prevent infinite loop
                if (start <= 0) break;
            }
            
            return segments;
        }
        
        /**
         * Generate normalized text variants
         * @private
         */
        generateNormalizedVariants(text) {
            const variants = new Set([text]);
            
            // Replace smart quotes
            variants.add(text
                .replace(/[\u2018\u2019]/g, "'")
                .replace(/[\u201C\u201D]/g, '"')
            );
            
            // Normalize whitespace
            variants.add(text.replace(/\s+/g, ' ').trim());
            
            // Remove punctuation
            variants.add(text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim());
            
            // Handle hyphenation
            variants.add(text.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2'));
            
            // Handle line breaks
            variants.add(text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
            
            return Array.from(variants);
        }
        
        /**
         * Expand a range to include full text
         * @private
         */
        expandRangeToFullText(range, fullText) {
            try {
                const container = range.commonAncestorContainer;
                const containerText = container.textContent;
                const rangeText = range.toString();
                
                // Find where the range text appears in the full text
                const indexInFull = fullText.indexOf(rangeText);
                if (indexInFull === -1) return null;
                
                // Calculate how much to expand
                const prefixLength = indexInFull;
                const suffixLength = fullText.length - (indexInFull + rangeText.length);
                
                // Try to expand the range
                const startOffset = Math.max(0, range.startOffset - prefixLength);
                const endOffset = Math.min(containerText.length, range.endOffset + suffixLength);
                
                const expandedRange = document.createRange();
                expandedRange.setStart(range.startContainer, startOffset);
                expandedRange.setEnd(range.endContainer, endOffset);
                
                // Verify the expanded range contains the full text
                if (expandedRange.toString().includes(fullText)) {
                    return expandedRange;
                }
            } catch (error) {
                console.debug('Could not expand range:', error);
            }
            
            return null;
        }
        
        /**
         * Extract sentences from text
         * @private
         */
        extractSentences(text) {
            // Simple sentence splitting - can be improved with NLP
            return text.match(/[^.!?]+[.!?]+/g) || [text];
        }
        
        /**
         * Prepare search text based on options
         * @private
         */
        prepareSearchText(text, options) {
            let prepared = text;
            
            if (options.normalizeWhitespace) {
                prepared = prepared.replace(/\s+/g, ' ').trim();
            }
            
            return prepared;
        }
        
        /**
         * Validate search text
         * @private
         */
        validateSearchText(text) {
            if (!text || typeof text !== 'string') {
                console.warn('Invalid search text: must be a non-empty string');
                return false;
            }
            
            if (text.length < this.config.minSearchLength) {
                console.warn(`Search text too short (min: ${this.config.minSearchLength})`);
                return false;
            }
            
            if (text.length > this.config.maxSearchLength) {
                console.warn(`Search text too long (max: ${this.config.maxSearchLength})`);
                return false;
            }
            
            return true;
        }
        
        /**
         * Generate cache key for search
         * @private
         */
        getCacheKey(text, options) {
            return `${text}_${JSON.stringify(options)}`;
        }
        
        /**
         * Cache search result
         * @private
         */
        cacheResult(key, range) {
            // Limit cache size
            if (this.searchCache.size > 100) {
                const firstKey = this.searchCache.keys().next().value;
                this.searchCache.delete(firstKey);
            }
            
            this.searchCache.set(key, range);
        }
        
        // ================================
        // Public API Methods
        // ================================
        
        /**
         * Clear all caches
         */
        clearCache() {
            this.searchCache.clear();
            this.textNodeCache = null;
            if (this.cacheTimeout) {
                clearTimeout(this.cacheTimeout);
                this.cacheTimeout = null;
            }
        }
        
        /**
         * Get search statistics
         */
        getStats() {
            return {
                ...this.stats,
                hitRate: this.stats.searches > 0 
                    ? (this.stats.hits / this.stats.searches * 100).toFixed(2) + '%'
                    : '0%',
                cacheHitRate: this.stats.hits > 0
                    ? (this.stats.cacheHits / this.stats.hits * 100).toFixed(2) + '%'
                    : '0%'
            };
        }
        
        /**
         * Reset statistics
         */
        resetStats() {
            this.stats = {
                searches: 0,
                hits: 0,
                misses: 0,
                cacheHits: 0
            };
        }
        
        /**
         * Update configuration
         */
        updateConfig(config) {
            this.config = { ...this.config, ...config };
            this.clearCache();
        }
    }
    
    // Create singleton instance
    const textSearchUtility = new TextSearchUtility();
    
    // Export to global scope
    global.TextSearchUtility = TextSearchUtility;
    global.textSearchUtility = textSearchUtility;
    
    console.log('📚 TextSearchUtility loaded and ready');
    
})(typeof window !== 'undefined' ? window : this);
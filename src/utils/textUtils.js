// ================================
// src/utils/textUtils.js - Text Utilities with Sanitization
// ================================

import { generateId } from './utils.js';


/**
     * Calculate text similarity between problems
     */
    export function calculateTextSimilarity(aiText, problem) {
        const problemText = problem.label || problem.title || problem.description || '';
        
        if (!aiText || !problemText) {
            return { score: 0, explanation: 'Missing text for comparison' };
        }

        // Extract keywords
        const aiWords = this.extractKeywords(aiText.toLowerCase());
        const problemWords = this.extractKeywords(problemText.toLowerCase());
        
        // Calculate intersection and union
        const intersection = aiWords.filter(word => problemWords.includes(word));
        const union = [...new Set([...aiWords, ...problemWords])];
        
        const score = union.length > 0 ? intersection.length / union.length : 0;
        
        return {
            score: Math.min(score, 1.0),
            explanation: `${intersection.length}/${union.length} keywords match`
        };
    }

    // Simple text sanitization
    export function sanitizeText(text) {
        // Always return a string, even for null/undefined input
        if (text === null || text === undefined) return '';
        
        // Convert to string if not already
        if (typeof text !== 'string') {
            text = String(text);
        }
        
        // Create a temporary div to use browser's built-in HTML decoding
        const div = document.createElement('div');
        div.textContent = text;
        const decoded = div.innerHTML;
        
        // Remove HTML tags
        const withoutTags = decoded.replace(/<[^>]*>/g, '');
        
        // Decode HTML entities
        div.innerHTML = withoutTags;
        const final = div.textContent || div.innerText || '';
        
        // Clean up extra whitespace and return trimmed string
        return final.replace(/\s+/g, ' ').trim();
    }

/**
 * Truncate text with ellipsis - USE THIS FUNCTION for abstracts
 */
export function truncateText(text, maxLength = 200, options = {}) {
    const defaults = {
        suffix: '...',
        preserveWords: true,
        stripHtml: true,
        minLength: 50
    };
    
    const config = { ...defaults, ...options };
    
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    let processedText = text;
    
    // Strip HTML if requested
    if (config.stripHtml) {
        processedText = sanitizeText(processedText);
    }
    
    // Clean up whitespace
    processedText = processedText.replace(/\s+/g, ' ').trim();
    
    // Return if already short enough
    if (processedText.length <= maxLength) {
        return processedText;
    }
    
    // Don't truncate if result would be too short
    if (maxLength < config.minLength) {
        return processedText;
    }
    
    if (config.preserveWords) {
        // Find the last space before maxLength
        const truncated = processedText.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > config.minLength) {
            return truncated.substring(0, lastSpace) + config.suffix;
        }
    }
    
    // Fallback to character truncation
    return processedText.substring(0, maxLength - config.suffix.length) + config.suffix;
}

// Text Selection and Location Utils
export class TextLocationUtils {
    /**
     * Get the current text selection and its location
     */
    static getCurrentSelection() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        if (!selectedText) return null;

        return {
            text: selectedText,
            range: range,
            rect: range.getBoundingClientRect(),
            container: range.commonAncestorContainer,
            startOffset: range.startOffset,
            endOffset: range.endOffset,
            location: this.getTextLocation(range)
        };
    }

    /**
     * Get detailed location information for a text range
     */
    static getTextLocation(range) {
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.TEXT_NODE ? 
            container.parentElement : container;

        return {
            section: this.findSectionName(element),
            paragraph: this.findParagraphIndex(element),
            sentence: this.findSentenceIndex(range),
            xpath: this.getXPath(element),
            context: this.getTextContext(range, 100)
        };
    }

    /**
     * Find the section name for an element
     */
    static findSectionName(element) {
        let current = element;
        
        while (current && current !== document.body) {
            // Check for section headers
            if (current.matches('h1, h2, h3, h4, h5, h6')) {
                return current.textContent.trim();
            }
            
            // Check for section containers
            if (current.id || current.classList.contains('section')) {
                return current.id || 'section';
            }
            
            // Check for semantic sections
            if (current.tagName === 'SECTION' || current.tagName === 'ARTICLE') {
                const header = current.querySelector('h1, h2, h3, h4, h5, h6');
                if (header) return header.textContent.trim();
            }
            
            current = current.parentElement;
        }
        
        return 'unknown_section';
    }

    /**
     * Find paragraph index within section
     */
    static findParagraphIndex(element) {
        const paragraph = element.closest('p') || element;
        const section = paragraph.closest('section, article, div[class*="section"]') || document.body;
        const paragraphs = Array.from(section.querySelectorAll('p'));
        return paragraphs.indexOf(paragraph);
    }

    /**
     * Find sentence index within paragraph
     */
    static findSentenceIndex(range) {
        const text = range.startContainer.textContent;
        const sentences = text.split(/[.!?]+/);
        let charCount = 0;
        
        for (let i = 0; i < sentences.length; i++) {
            charCount += sentences[i].length + 1;
            if (charCount > range.startOffset) {
                return i;
            }
        }
        
        return 0;
    }

    /**
     * Get XPath for an element
     */
    static getXPath(element) {
        if (element.id) {
            return `//*[@id="${element.id}"]`;
        }
        
        if (element === document.body) {
            return '/html/body';
        }
        
        let ix = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                return this.getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
            }
        }
    }

    /**
     * Get text context around a range
     */
    static getTextContext(range, contextLength = 100) {
        const container = range.commonAncestorContainer;
        const fullText = container.textContent || '';
        const start = Math.max(0, range.startOffset - contextLength);
        const end = Math.min(fullText.length, range.endOffset + contextLength);
        
        return {
            before: fullText.substring(start, range.startOffset),
            selected: fullText.substring(range.startOffset, range.endOffset),
            after: fullText.substring(range.endOffset, end),
            full: fullText.substring(start, end)
        };
    }

    /**
     * Find element by text location data
     */
    static findElementByLocation(location) {
        try {
            // Try XPath first
            if (location.xpath) {
                const result = document.evaluate(
                    location.xpath,
                    document,
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null
                );
                if (result.singleNodeValue) {
                    return result.singleNodeValue;
                }
            }

            // Fallback to text search
            if (location.context && location.context.full) {
                return this.findElementByText(location.context.full);
            }

            return null;
        } catch (error) {
            console.error('Error finding element by location:', error);
            return null;
        }
    }

    /**
     * Find element containing specific text
     */
    static findElementByText(searchText) {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.includes(searchText)) {
                return node.parentElement;
            }
        }

        return null;
    }
}

// Text Highlighting Utils
export class TextHighlighter {
    constructor(options = {}) {
        this.options = {
            highlightClass: 'orkg-highlight',
            deleteIconClass: 'orkg-delete-icon',
            colors: [
                '#FFE066', '#A8E6CF', '#FFB3BA', '#B3D9FF', 
                '#FFCCB3', '#E6B3FF', '#B3FFB3', '#FFB3E6'
            ],
            ...options
        };
        
        this.highlights = new Map();
        this.colorIndex = 0;
        this.setupStyles();
    }

    /**
     * Inject required CSS styles
     */
    setupStyles() {
        const styleId = 'orkg-highlighter-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .${this.options.highlightClass} {
                padding: 2px 0;
                border-radius: 3px;
                position: relative;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .${this.options.highlightClass}:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                transform: translateY(-1px);
            }
            
            .${this.options.deleteIconClass} {
                position: absolute;
                top: -8px;
                right: -8px;
                width: 16px;
                height: 16px;
                background: #ff4757;
                border-radius: 50%;
                color: white;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s ease;
                z-index: 1000;
            }
            
            .${this.options.highlightClass}:hover .${this.options.deleteIconClass} {
                opacity: 1;
            }
            
            .orkg-highlight-temp {
                background: #ffeb3b !important;
                animation: pulse 2s ease-in-out infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Create a highlight for the given selection
     */
    createHighlight(selection, property, options = {}) {
        if (!selection || !selection.range) {
            throw new Error('Invalid selection provided');
        }

        const highlightId = generateId('highlight');
        const color = options.color || this.getNextColor();
        
        try {
            const range = selection.range;
            
            // Create highlight container
            const container = document.createElement('span');
            container.classList.add(this.options.highlightClass);
            container.style.backgroundColor = color;
            container.setAttribute('data-highlight-id', highlightId);
            container.setAttribute('data-property-id', property.id);
            container.setAttribute('data-property-label', property.label);
            
            // Create delete icon
            const deleteIcon = this.createDeleteIcon(highlightId);
            container.appendChild(deleteIcon);
            
            // Wrap the selected content
            range.surroundContents(container);
            
            // Store highlight data
            const highlightData = {
                id: highlightId,
                text: selection.text,
                property: property,
                color: color,
                location: selection.location,
                element: container,
                timestamp: new Date().toISOString()
            };
            
            this.highlights.set(highlightId, highlightData);
            
            // Clear selection
            window.getSelection().removeAllRanges();
            
            return highlightData;
            
        } catch (error) {
            console.error('Error creating highlight:', error);
            throw new Error('Failed to create highlight: ' + error.message);
        }
    }

    /**
     * Create delete icon for highlight
     */
    createDeleteIcon(highlightId) {
        const icon = document.createElement('span');
        icon.classList.add(this.options.deleteIconClass);
        icon.innerHTML = '×';
        icon.title = 'Delete highlight';
        
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeHighlight(highlightId);
        });
        
        return icon;
    }

    /**
     * Remove highlight by ID
     */
    removeHighlight(highlightId) {
        const highlight = this.highlights.get(highlightId);
        if (!highlight) return false;

        try {
            const element = highlight.element;
            const parent = element.parentNode;
            
            // Replace highlighted element with its text content
            const textNode = document.createTextNode(element.textContent);
            parent.replaceChild(textNode, element);
            
            // Normalize parent to merge adjacent text nodes
            parent.normalize();
            
            this.highlights.delete(highlightId);
            return true;
            
        } catch (error) {
            console.error('Error removing highlight:', error);
            return false;
        }
    }

    /**
     * Get next color in rotation
     */
    getNextColor() {
        const color = this.options.colors[this.colorIndex];
        this.colorIndex = (this.colorIndex + 1) % this.options.colors.length;
        return color;
    }

    /**
     * Create temporary highlight for preview
     */
    createTemporaryHighlight(element, duration = 3000) {
        if (!element) return;

        element.classList.add('orkg-highlight-temp');
        
        setTimeout(() => {
            element.classList.remove('orkg-highlight-temp');
        }, duration);
    }

    /**
     * Get all highlights
     */
    getAllHighlights() {
        return Array.from(this.highlights.values());
    }

    /**
     * Clear all highlights
     */
    clearAllHighlights() {
        const highlightIds = Array.from(this.highlights.keys());
        highlightIds.forEach(id => this.removeHighlight(id));
    }

    /**
     * Export highlights data
     */
    exportHighlights() {
        const data = this.getAllHighlights().map(highlight => ({
            id: highlight.id,
            text: highlight.text,
            property: highlight.property,
            location: highlight.location,
            timestamp: highlight.timestamp
        }));
        
        return {
            highlights: data,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
    }
}

// Animation Utils
export class AnimationUtils {
    /**
     * Create flying animation from source to target
     */
    static createFlyingAnimation(sourceElement, targetSelector, options = {}) {
        const defaults = {
            duration: 800,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            particle: '✨',
            color: '#4CAF50',
            size: '16px'
        };
        
        const config = { ...defaults, ...options };
        
        return new Promise((resolve) => {
            const sourceRect = sourceElement.getBoundingClientRect();
            const targetElement = document.querySelector(targetSelector);
            
            if (!targetElement) {
                resolve();
                return;
            }
            
            const targetRect = targetElement.getBoundingClientRect();
            
            // Create animated particle
            const particle = document.createElement('div');
            particle.textContent = config.particle;
            particle.style.cssText = `
                position: fixed;
                left: ${sourceRect.left + sourceRect.width / 2}px;
                top: ${sourceRect.top + sourceRect.height / 2}px;
                font-size: ${config.size};
                color: ${config.color};
                z-index: 10000;
                pointer-events: none;
                transform: translate(-50%, -50%);
                transition: all ${config.duration}ms ${config.easing};
            `;
            
            document.body.appendChild(particle);
            
            // Trigger animation
            requestAnimationFrame(() => {
                particle.style.left = `${targetRect.left + targetRect.width / 2}px`;
                particle.style.top = `${targetRect.top + targetRect.height / 2}px`;
                particle.style.transform = 'translate(-50%, -50%) scale(0.5)';
                particle.style.opacity = '0.3';
            });
            
            // Clean up after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.remove();
                }
                resolve();
            }, config.duration);
        });
    }

    /**
     * Create pulse animation on element
     */
    static createPulseAnimation(element, options = {}) {
        const defaults = {
            duration: 1000,
            pulses: 3,
            color: '#2196F3'
        };
        
        const config = { ...defaults, ...options };
        
        const originalBoxShadow = element.style.boxShadow;
        let pulseCount = 0;
        
        const pulse = () => {
            if (pulseCount >= config.pulses) {
                element.style.boxShadow = originalBoxShadow;
                return;
            }
            
            element.style.boxShadow = `0 0 20px ${config.color}`;
            
            setTimeout(() => {
                element.style.boxShadow = originalBoxShadow;
                pulseCount++;
                setTimeout(pulse, 200);
            }, config.duration / (config.pulses * 2));
        };
        
        pulse();
    }
}

// Text Analysis Utils
export class TextAnalysisUtils {
    /**
     * Extract meaningful phrases from text
     */
    static extractPhrases(text, minLength = 3, maxLength = 50) {
        if (!text) return [];
        
        // Split by sentences first
        const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
        const phrases = [];
        
        sentences.forEach(sentence => {
            // Extract noun phrases (simplified)
            const words = sentence.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2);
            
            // Create phrases of different lengths
            for (let i = 0; i < words.length; i++) {
                for (let j = minLength; j <= Math.min(maxLength, words.length - i); j++) {
                    const phrase = words.slice(i, i + j).join(' ');
                    if (phrase.length >= minLength) {
                        phrases.push(phrase);
                    }
                }
            }
        });
        
        // Remove duplicates and sort by length
        return [...new Set(phrases)].sort((a, b) => b.length - a.length);
    }

    /**
     * Calculate text similarity using simple metrics
     */
    static calculateSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        
        const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
        const a = normalize(text1);
        const b = normalize(text2);
        
        if (a === b) return 1;
        
        // Jaccard similarity
        const setA = new Set(a.split(/\s+/));
        const setB = new Set(b.split(/\s+/));
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        
        return intersection.size / union.size;
    }

    /**
     * Extract potential property names from text
     */
    static extractPropertyCandidates(text) {
        const candidates = [];
        
        // Look for patterns like "The X of Y" or "X value"
        const patterns = [
            /the\s+(\w+(?:\s+\w+)*)\s+of\s+/gi,
            /(\w+(?:\s+\w+)*)\s+value/gi,
            /(\w+(?:\s+\w+)*)\s+measure/gi,
            /(\w+(?:\s+\w+)*)\s+metric/gi,
            /(\w+(?:\s+\w+)*)\s+score/gi,
            /(\w+(?:\s+\w+)*)\s+rate/gi,
            /(\w+(?:\s+\w+)*)\s+level/gi
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const candidate = match[1].trim();
                if (candidate.length > 2 && candidate.length < 30) {
                    candidates.push({
                        text: candidate,
                        confidence: 0.8,
                        context: match[0]
                    });
                }
            }
        });
        
        return candidates;
    }
}

export default {
    calculateTextSimilarity,
    sanitizeText,
    truncateText,
    TextLocationUtils,
    TextHighlighter,
    AnimationUtils,
    TextAnalysisUtils
};
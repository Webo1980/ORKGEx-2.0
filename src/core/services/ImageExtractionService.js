// ================================
// src/core/services/ImageExtractionService.js
// Complete Image extraction with Intelligence scoring and blob URL handling
// ================================

import { BaseExtractorService } from './BaseExtractorService.js';
import { ImageIntelligence } from '../../content/intelligence/ImageIntelligence.js';

export class ImageExtractionService extends BaseExtractorService {
    constructor(config = {}) {
        super(config);
        
        this.config = {
            ...this.config,
            minWidth: 100,
            minHeight: 100,
            maxImages: 500,
            minScore: 0.3, // Minimum intelligence score to include
            includeDataUrls: true,
            includeSvg: true,
            includeCanvas: true,
            includeBackground: false,
            includeBlobUrls: true, // Include blob URLs as-is
            ...config
        };
        
        this.extractedImages = [];
        this.allExtractedImages = []; // Store all images before filtering
        this.imageIntelligence = null;
    }
    
    async init() {
        await super.init(); // Initialize base class (gets tab info)
        
        // Initialize ImageIntelligence
        this.imageIntelligence = new ImageIntelligence({
            thresholds: {
                minimum: this.config.minScore,
                recommended: 0.6,
                high: 0.8
            }
        });
        await this.imageIntelligence.init();
        
        console.log('🖼️ ImageExtractionService initialized for tab:', this.config.tabId);
    }
    
    /**
     * Main extraction method - executes in the research article tab
     */
    async extract(options = {}) {
        console.log('🔍 Starting image extraction from tab:', this.config.tabId);
        
        // Merge options with config
        const extractConfig = { ...this.config, ...options };
        
        try {
            // Validate we're on a research article
            const isValid = await this.validateExtractionContext();
            if (!isValid) {
                console.warn('⚠️ Page may not be a research article, continuing anyway...');
            }
            
            let images = [];
            
            // Try Chrome extension API first
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                try {
                    // Request extraction through background script
                    const response = await new Promise((resolve) => {
                        chrome.runtime.sendMessage(
                            { 
                                action: 'EXTRACT_IMAGES',
                                tabId: this.config.tabId 
                            },
                            (response) => {
                                resolve(response);
                            }
                        );
                    });
                    
                    if (response && response.success && response.images) {
                        images = response.images;
                        console.log(`✅ Extracted ${images.length} images via background script`);
                    }
                } catch (bgError) {
                    console.warn('Background script extraction failed:', bgError);
                }
            }
            
            // If background script failed or not available, try direct execution
            if (!images || images.length === 0) {
                images = await this.extractDirectly();
            }
            
            // If still no images, try content script
            if (!images || images.length === 0) {
                images = await this.extractViaContentScript();
            }
            
            if (!images || !Array.isArray(images)) {
                console.warn('No images returned from extraction');
                return [];
            }
            
            // Store all extracted images before filtering
            this.allExtractedImages = images;
            
            // Apply intelligence scoring to all images
            const scoredImages = await this.scoreImages(images);
            
            // Filter by minimum score threshold
            const filteredImages = scoredImages.filter(img => 
                img.intelligence && img.intelligence.score >= extractConfig.minScore
            );
            
            // Sort by importance score
            const sortedImages = this.sortImagesByImportance(filteredImages);
            
            // Limit to max images
            const finalImages = sortedImages.slice(0, extractConfig.maxImages);
            
            console.log(`✅ Extracted ${finalImages.length} images (${images.length} total, ${images.length - filteredImages.length} below threshold)`);
            
            // Mark low-score images on the page if marker service is available
            this.markLowScoreImages(scoredImages, extractConfig.minScore);
            
            this.extractedImages = finalImages;
            
            return finalImages;
            
        } catch (error) {
            console.error('❌ Image extraction failed:', error);
            return [];
        }
    }
    
    /**
     * Score images using ImageIntelligence
     */
    async scoreImages(images) {
        if (!this.imageIntelligence) {
            console.warn('ImageIntelligence not initialized, using basic scoring');
            return images.map(img => ({
                ...img,
                intelligence: {
                    score: img.score || 0.5,
                    level: 'low'
                }
            }));
        }
        
        console.log('🧠 Scoring images with ImageIntelligence...');
        
        return images.map(image => {
            const intelligenceResult = this.imageIntelligence.analyze(image);
            
            return {
                ...image,
                intelligence: intelligenceResult,
                score: intelligenceResult.score // Keep compatibility
            };
        });
    }
    
    /**
     * Mark low-score images on the page using marker service
     */
    async markLowScoreImages(scoredImages, threshold) {
        try {
            // Send message to content script to mark low-score images
            if (typeof chrome !== 'undefined' && chrome.tabs && this.config.tabId) {
                const lowScoreImages = scoredImages.filter(img => 
                    img.intelligence && img.intelligence.score < threshold
                );
                
                if (lowScoreImages.length > 0) {
                    chrome.tabs.sendMessage(this.config.tabId, {
                        action: 'MARK_LOW_SCORE_IMAGES',
                        images: lowScoreImages.map(img => ({
                            id: img.id,
                            score: img.intelligence.score,
                            level: img.intelligence.level,
                            position: img.position
                        }))
                    }).catch(err => {
                        console.log('Could not mark low-score images:', err.message);
                    });
                    
                    console.log(`🎯 Marked ${lowScoreImages.length} low-score images on the page`);
                }
            }
        } catch (error) {
            console.log('Marker service not available:', error.message);
        }
    }
    
    /**
     * Extract directly using Chrome scripting API
     */
    async extractDirectly() {
        try {
            if (typeof chrome === 'undefined' || !chrome.scripting) {
                throw new Error('Chrome scripting API not available');
            }
            
            // Pass config to extraction function
            const config = this.config;
            
            // Execute the extraction function from background.js
            const results = await chrome.scripting.executeScript({
                target: { tabId: this.config.tabId },
                args: [config], // Pass config as argument
                func: function(extractConfig) {
                    // This is the extraction function that runs in the page
                    const images = [];
                    const processedSources = new Set();
                    
                    // Helper function to get image source
                    function getImageSource(img) {
                        return img.currentSrc || img.src || 
                               img.getAttribute('src') || 
                               img.getAttribute('data-src') || 
                               img.getAttribute('data-lazy-src') ||
                               img.getAttribute('data-original');
                    }
                    
                    // Helper function to get element position
                    function getElementPosition(element) {
                        const rect = element.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                        
                        return {
                            top: rect.top + scrollTop,
                            left: rect.left + scrollLeft,
                            width: rect.width,
                            height: rect.height
                        };
                    }
                    
                    // Helper function to check visibility
                    function isVisible(element) {
                        const style = window.getComputedStyle(element);
                        const rect = element.getBoundingClientRect();
                        
                        return style.display !== 'none' && 
                               style.visibility !== 'hidden' && 
                               style.opacity !== '0' &&
                               rect.width > 0 && 
                               rect.height > 0;
                    }
                    
                    // Helper function to extract context
                    function extractContext(img) {
                        const context = {};
                        
                        // Find parent figure
                        const figure = img.closest('figure, .figure, [role="figure"]');
                        
                        if (figure) {
                            // Extract caption
                            const caption = figure.querySelector('figcaption, .caption, .figure-caption');
                            if (caption) {
                                context.caption = caption.textContent.trim();
                            }
                            
                            // Extract label
                            const label = figure.querySelector('.figure-label, .fig-label, [data-figure-label]');
                            if (label) {
                                context.label = label.textContent.trim();
                            }
                            
                            // Get figure ID
                            context.figureId = figure.id || figure.getAttribute('data-id');
                            context.inFigure = true;
                            context.figure = true;
                        }
                        
                        // Check aria-describedby
                        const describedBy = img.getAttribute('aria-describedby');
                        if (describedBy) {
                            const descElement = document.getElementById(describedBy);
                            if (descElement && !context.caption) {
                                context.caption = descElement.textContent.trim();
                            }
                        }
                        
                        // Check if in main content
                        const article = img.closest('article, main, [role="main"], .content, .article-content');
                        context.inMainContent = !!article;
                        
                        // Get surrounding text for context
                        const parent = img.parentElement;
                        if (parent) {
                            const prevSibling = img.previousElementSibling;
                            const nextSibling = img.nextElementSibling;
                            const surroundingText = [];
                            
                            if (prevSibling && prevSibling.textContent.length < 200) {
                                surroundingText.push(prevSibling.textContent.trim());
                            }
                            if (nextSibling && nextSibling.textContent.length < 200) {
                                surroundingText.push(nextSibling.textContent.trim());
                            }
                            
                            if (surroundingText.length > 0) {
                                context.surroundingText = surroundingText.join(' ');
                            }
                        }
                        
                        // Check for references to this figure in the text
                        const figId = context.figureId || context.label;
                        if (figId) {
                            const references = [];
                            const textElements = document.querySelectorAll('p, div, span');
                            textElements.forEach(el => {
                                if (el.textContent.includes(figId) || 
                                    el.textContent.match(new RegExp(`figure\\s*${figId}`, 'i'))) {
                                    references.push({
                                        text: el.textContent.substring(0, 200)
                                    });
                                }
                            });
                            
                            if (references.length > 0) {
                                context.references = references.slice(0, 5); // Limit to 5 references
                            }
                        }
                        
                        return context;
                    }
                    
                    // Helper function to classify image type
                    function classifyImageType(img, context) {
                        const text = `${img.alt || ''} ${img.title || ''} ${context.label || ''} ${context.caption || ''}`.toLowerCase();
                        
                        // First check for explicit chart indicators
                        if (text.includes('chart') || text.includes('graph') || text.includes('plot')) {
                            if (text.includes('bar')) return 'chart';
                            if (text.includes('line')) return 'chart';
                            if (text.includes('pie')) return 'chart';
                            if (text.includes('scatter')) return 'chart';
                            return 'graph';
                        }
                        
                        // Check for specific chart types
                        if (text.includes('histogram') || text.includes('boxplot') || 
                            text.includes('heatmap') || text.includes('treemap')) {
                            return 'chart';
                        }
                        
                        // Check for data visualization terms
                        if (text.includes('visualization') || text.includes('data') || 
                            text.includes('results') || text.includes('analysis')) {
                            return 'chart';
                        }
                        
                        // Check for axis labels (common in charts)
                        if (text.includes('x-axis') || text.includes('y-axis') || 
                            text.includes('x axis') || text.includes('y axis')) {
                            return 'chart';
                        }
                        
                        // Default types
                        if (text.includes('diagram') || text.includes('schematic')) return 'diagram';
                        if (text.includes('table')) return 'table';
                        if (text.includes('equation') || text.includes('formula')) return 'equation';
                        if (text.includes('photo') || text.includes('photograph')) return 'photo';
                        if (text.includes('illustration') || text.includes('drawing')) return 'illustration';
                        if (text.includes('microscop') || text.includes('sem') || text.includes('tem')) return 'micrograph';
                        
                        // For canvas elements, assume they're charts unless proven otherwise
                        if (img.tagName === 'CANVAS') return 'chart';
                        
                        return 'figure';
                    }
                    
                    // Strategy 1: Find all IMG elements
                    const imgElements = document.querySelectorAll('img');
                    console.log(`🖼️ Found ${imgElements.length} IMG elements`);
                    
                    imgElements.forEach((img, index) => {
                        // Skip if not visible
                        if (!isVisible(img)) return;
                        
                        const src = getImageSource(img);
                        
                        // Skip if already processed or no source
                        if (!src || processedSources.has(src)) return;
                        
                        // Skip small images (likely icons) unless they're in figures
                        const rect = img.getBoundingClientRect();
                        const inFigure = !!img.closest('figure, .figure');
                        if (!inFigure && (rect.width < 50 || rect.height < 50)) return;
                        
                        // Skip logos and icons based on URL patterns (unless includeBlobUrls is true for blobs)
                        const isBlob = src.startsWith('blob:');
                        if (!isBlob && (src.includes('logo') || src.includes('icon') || src.includes('badge'))) return;
                        
                        // Keep blob URLs as-is if configured
                        let finalSrc = src;
                        if (isBlob && !extractConfig.includeBlobUrls) {
                            console.log('Skipping blob URL:', src);
                            return;
                        }
                        
                        const context = extractContext(img);
                        const type = classifyImageType(img, context);
                        
                        const imageData = {
                            id: `img_${index}_${Date.now()}`,
                            src: finalSrc,
                            originalSrc: img.getAttribute('src') || finalSrc,
                            alt: img.alt || img.getAttribute('aria-label') || '',
                            title: img.title || '',
                            type: type,
                            dimensions: {
                                width: img.naturalWidth || rect.width,
                                height: img.naturalHeight || rect.height,
                                displayWidth: rect.width,
                                displayHeight: rect.height
                            },
                            position: getElementPosition(img),
                            context: context,
                            isBlob: isBlob
                        };
                        
                        images.push(imageData);
                        processedSources.add(src);
                    });
                    
                    // Strategy 2: Find SVG elements (diagrams)
                    if (extractConfig.includeSvg) {
                        const svgElements = document.querySelectorAll('svg');
                        console.log(`🖼️ Found ${svgElements.length} SVG elements`);
                        
                        svgElements.forEach((svg, index) => {
                            // Skip if not visible or too small
                            if (!isVisible(svg)) return;
                            
                            const rect = svg.getBoundingClientRect();
                            if (rect.width < extractConfig.minWidth || rect.height < extractConfig.minHeight) return;
                            
                            const context = extractContext(svg);
                            
                            // Create a unique identifier for SVG
                            const svgId = `svg_${index}_${Date.now()}`;
                            
                            // Try to create data URL for SVG
                            let svgSrc = 'inline-svg';
                            try {
                                const svgData = new XMLSerializer().serializeToString(svg);
                                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                                svgSrc = URL.createObjectURL(svgBlob);
                            } catch (e) {
                                // Keep as inline-svg if serialization fails
                            }
                            
                            const imageData = {
                                id: svgId,
                                src: svgSrc,
                                originalSrc: 'inline-svg',
                                alt: svg.getAttribute('aria-label') || '',
                                title: svg.getAttribute('title') || '',
                                type: 'diagram',
                                dimensions: {
                                    width: rect.width,
                                    height: rect.height,
                                    displayWidth: rect.width,
                                    displayHeight: rect.height
                                },
                                position: getElementPosition(svg),
                                context: context,
                                isSvg: true
                            };
                            
                            images.push(imageData);
                        });
                    }
                    
                    // Strategy 3: Find CANVAS elements (charts)
                    if (extractConfig.includeCanvas) {
                        const canvasElements = document.querySelectorAll('canvas');
                        console.log(`🖼️ Found ${canvasElements.length} CANVAS elements`);
                        
                        canvasElements.forEach((canvas, index) => {
                            // Skip if not visible or too small
                            if (!isVisible(canvas)) return;
                            
                            if (canvas.width < extractConfig.minWidth || canvas.height < extractConfig.minHeight) return;
                            
                            const context = extractContext(canvas);
                            
                            let canvasSrc = 'canvas-element';
                            // Try to get canvas as data URL if possible and configured
                            if (extractConfig.includeDataUrls) {
                                try {
                                    canvasSrc = canvas.toDataURL('image/png');
                                } catch (e) {
                                    // Canvas might be tainted, keep as placeholder
                                }
                            }
                            
                            const imageData = {
                                id: `canvas_${index}_${Date.now()}`,
                                src: canvasSrc,
                                originalSrc: 'canvas-element',
                                alt: canvas.getAttribute('aria-label') || '',
                                title: canvas.getAttribute('title') || '',
                                type: 'chart',
                                dimensions: {
                                    width: canvas.width,
                                    height: canvas.height,
                                    displayWidth: canvas.offsetWidth,
                                    displayHeight: canvas.offsetHeight
                                },
                                position: getElementPosition(canvas),
                                context: context,
                                isCanvas: true
                            };
                            
                            images.push(imageData);
                        });
                    }
                    
                    // Strategy 4: Find images with lazy loading
                    const lazyImages = document.querySelectorAll('[data-src], [data-lazy-src], [data-original]');
                    console.log(`🖼️ Found ${lazyImages.length} lazy-loaded elements`);
                    
                    lazyImages.forEach((element, index) => {
                        if (element.tagName !== 'IMG') return;
                        if (!isVisible(element)) return;
                        
                        const src = element.getAttribute('data-src') || 
                                   element.getAttribute('data-lazy-src') || 
                                   element.getAttribute('data-original');
                        
                        if (!src || processedSources.has(src)) return;
                        
                        const rect = element.getBoundingClientRect();
                        if (rect.width < extractConfig.minWidth || rect.height < extractConfig.minHeight) return;
                        
                        const context = extractContext(element);
                        const type = classifyImageType(element, context);
                        
                        const imageData = {
                            id: `lazy_${index}_${Date.now()}`,
                            src: src,
                            originalSrc: src,
                            alt: element.alt || '',
                            title: element.title || '',
                            type: type,
                            dimensions: {
                                width: parseInt(element.getAttribute('width')) || rect.width || 0,
                                height: parseInt(element.getAttribute('height')) || rect.height || 0,
                                displayWidth: rect.width,
                                displayHeight: rect.height
                            },
                            position: getElementPosition(element),
                            context: context,
                            isLazy: true
                        };
                        
                        images.push(imageData);
                        processedSources.add(src);
                    });
                    
                    console.log(`🖼️ Extracted ${images.length} images from the page`);
                    
                    return images;
                }
            });
            
            if (chrome.runtime.lastError) {
                throw new Error(chrome.runtime.lastError.message);
            }
            
            if (results && results[0] && results[0].result) {
                console.log(`✅ Direct extraction successful: ${results[0].result.length} images`);
                return results[0].result;
            }
            
            return [];
            
        } catch (error) {
            console.warn('Direct extraction failed:', error);
            return [];
        }
    }
    
    /**
     * Fallback: Extract via content script messaging
     */
    async extractViaContentScript() {
        console.log('🔄 Attempting extraction via content script...');
        
        try {
            // First, inject the content script if needed
            await this.injectContentScript('src/content/content-script.js');
            
            // Wait a bit for script to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Send extraction request
            const response = await this.sendToTab('EXTRACT_IMAGES', {
                config: this.config
            });
            
            if (response && response.success && response.images) {
                console.log(`✅ Extracted ${response.images.length} images via content script`);
                return response.images;
            }
            
            throw new Error('Content script extraction failed');
            
        } catch (error) {
            console.error('Content script extraction failed:', error);
            return [];
        }
    }
    
    /**
     * Sort images by importance (runs in extension context)
     */
    sortImagesByImportance(images) {
        return images.sort((a, b) => {
            // First by intelligence score if available
            const aScore = a.intelligence?.score || a.score || 0;
            const bScore = b.intelligence?.score || b.score || 0;
            
            if (aScore !== bScore) {
                return bScore - aScore;
            }
            
            // Then by other factors
            const aInFigure = a.context?.inFigure || false;
            const bInFigure = b.context?.inFigure || false;
            if (aInFigure !== bInFigure) {
                return aInFigure ? -1 : 1;
            }
            
            const aHasCaption = !!(a.context?.caption || a.context?.label);
            const bHasCaption = !!(b.context?.caption || b.context?.label);
            if (aHasCaption !== bHasCaption) {
                return aHasCaption ? -1 : 1;
            }
            
            const aArea = (a.dimensions?.width || 0) * (a.dimensions?.height || 0);
            const bArea = (b.dimensions?.width || 0) * (b.dimensions?.height || 0);
            if (aArea !== bArea) {
                return bArea - aArea;
            }
            
            return (a.position?.top || 0) - (b.position?.top || 0);
        });
    }
    
    /**
     * Get all extracted images (including low-score ones)
     */
    getAllExtractedImages() {
        return this.allExtractedImages;
    }
    
    /**
     * Get filtered extracted images (above threshold)
     */
    getExtractedImages() {
        return this.extractedImages;
    }
    
    /**
     * Get extraction statistics
     */
    getExtractionStats() {
        const stats = {
            total: this.allExtractedImages.length,
            aboveThreshold: this.extractedImages.length,
            belowThreshold: this.allExtractedImages.length - this.extractedImages.length,
            threshold: this.config.minScore
        };
        
        if (this.imageIntelligence && this.extractedImages.length > 0) {
            const intelligenceStats = this.imageIntelligence.getStatistics(
                this.extractedImages.map(img => img.intelligence).filter(Boolean)
            );
            stats.intelligence = intelligenceStats;
        }
        
        return stats;
    }
    
    /**
     * Clear extracted data
     */
    clearData() {
        this.extractedImages = [];
        this.allExtractedImages = [];
        if (this.imageIntelligence) {
            this.imageIntelligence.clearCache();
        }
    }
    
    /**
     * Get extraction summary
     */
    getSummary() {
        const types = {};
        this.extractedImages.forEach(img => {
            types[img.type] = (types[img.type] || 0) + 1;
        });
        
        return {
            total: this.extractedImages.length,
            allTotal: this.allExtractedImages.length,
            types: types,
            withCaptions: this.extractedImages.filter(img => img.context?.caption).length,
            inFigures: this.extractedImages.filter(img => img.context?.inFigure).length,
            highPriority: this.extractedImages.filter(img => img.intelligence?.level === 'high').length,
            recommended: this.extractedImages.filter(img => img.intelligence?.level === 'recommended').length,
            stats: this.getExtractionStats(),
            tabInfo: this.getTabInfo()
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.clearData();
        if (this.imageIntelligence) {
            this.imageIntelligence.cleanup();
        }
        super.cleanup();
        console.log('🧹 ImageExtractionService cleanup completed');
    }
}
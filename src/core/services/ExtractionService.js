// ================================
// src/core/services/ExtractionService.js
// Centralized extraction service following SOLID principles
// ================================

export class ExtractionService {
    constructor(config = {}) {
        this.config = {
            minWidth: 100,
            minHeight: 100,
            maxImages: 500,
            includeDataUrls: true,
            includeSvg: true,
            includeCanvas: true,
            includeBackground: false,
            timeout: 10000,
            ...config
        };
        
        this.extractedData = {
            images: [],
            text: {},
            tables: []
        };
    }
    
    /**
     * Extract all images from the current page
     */
    async extractImages() {
        console.log('🔍 Starting image extraction...');
        const images = [];
        const processedSources = new Set();
        
        try {
            // Strategy 1: Regular IMG elements
            const imgElements = this.extractImgElements(processedSources);
            images.push(...imgElements);
            
            // Strategy 2: SVG elements
            if (this.config.includeSvg) {
                const svgElements = this.extractSvgElements(processedSources);
                images.push(...svgElements);
            }
            
            // Strategy 3: Canvas elements
            if (this.config.includeCanvas) {
                const canvasElements = this.extractCanvasElements(processedSources);
                images.push(...canvasElements);
            }
            
            // Strategy 4: Lazy-loaded images
            const lazyImages = this.extractLazyLoadedImages(processedSources);
            images.push(...lazyImages);
            
            // Strategy 5: Background images (optional)
            if (this.config.includeBackground) {
                const bgImages = this.extractBackgroundImages(processedSources);
                images.push(...bgImages);
            }
            
            // Sort by importance (size and position)
            const sortedImages = this.sortImagesByImportance(images);
            
            // Limit to max images
            const finalImages = sortedImages.slice(0, this.config.maxImages);
            
            console.log(`✅ Extracted ${finalImages.length} images`);
            this.extractedData.images = finalImages;
            
            return finalImages;
            
        } catch (error) {
            console.error('❌ Image extraction failed:', error);
            throw error;
        }
    }
    
    /**
     * Extract regular IMG elements
     */
    extractImgElements(processedSources) {
        const images = [];
        const imgElements = document.querySelectorAll('img');
        
        imgElements.forEach((img, index) => {
            if (!this.isElementVisible(img)) return;
            
            const src = this.getImageSource(img);
            if (!src || processedSources.has(src)) return;
            
            const rect = img.getBoundingClientRect();
            if (rect.width < this.config.minWidth || rect.height < this.config.minHeight) return;
            
            const imageData = {
                id: `img_${index}_${Date.now()}`,
                src: src,
                originalSrc: img.getAttribute('src'),
                alt: img.alt || img.getAttribute('aria-label') || '',
                title: img.title || '',
                type: 'image',
                element: img,
                dimensions: {
                    width: img.naturalWidth || rect.width,
                    height: img.naturalHeight || rect.height,
                    displayWidth: rect.width,
                    displayHeight: rect.height
                },
                position: this.getElementPosition(img),
                context: this.extractImageContext(img),
                visibility: {
                    inViewport: this.isInViewport(img),
                    isVisible: true
                }
            };
            
            images.push(imageData);
            processedSources.add(src);
        });
        
        return images;
    }
    
    /**
     * Extract SVG elements
     */
    extractSvgElements(processedSources) {
        const images = [];
        const svgElements = document.querySelectorAll('svg');
        
        svgElements.forEach((svg, index) => {
            if (!this.isElementVisible(svg)) return;
            
            const rect = svg.getBoundingClientRect();
            if (rect.width < this.config.minWidth || rect.height < this.config.minHeight) return;
            
            const svgId = `svg_${index}_${Date.now()}`;
            if (processedSources.has(svgId)) return;
            
            const imageData = {
                id: svgId,
                src: 'inline-svg',
                originalSrc: 'inline-svg',
                alt: svg.getAttribute('aria-label') || '',
                title: svg.getAttribute('title') || '',
                type: 'diagram',
                element: svg,
                dimensions: {
                    width: rect.width,
                    height: rect.height,
                    displayWidth: rect.width,
                    displayHeight: rect.height
                },
                position: this.getElementPosition(svg),
                context: this.extractImageContext(svg),
                visibility: {
                    inViewport: this.isInViewport(svg),
                    isVisible: true
                },
                isSvg: true
            };
            
            images.push(imageData);
            processedSources.add(svgId);
        });
        
        return images;
    }
    
    /**
     * Extract Canvas elements
     */
    extractCanvasElements(processedSources) {
        const images = [];
        const canvasElements = document.querySelectorAll('canvas');
        
        canvasElements.forEach((canvas, index) => {
            if (!this.isElementVisible(canvas)) return;
            
            if (canvas.width < this.config.minWidth || canvas.height < this.config.minHeight) return;
            
            const canvasId = `canvas_${index}_${Date.now()}`;
            if (processedSources.has(canvasId)) return;
            
            let canvasSrc = 'canvas-element';
            if (this.config.includeDataUrls) {
                try {
                    canvasSrc = canvas.toDataURL('image/png');
                } catch (e) {
                    // Canvas might be tainted
                    console.warn('Cannot extract canvas data:', e);
                }
            }
            
            const imageData = {
                id: canvasId,
                src: canvasSrc,
                originalSrc: 'canvas-element',
                alt: canvas.getAttribute('aria-label') || '',
                title: canvas.getAttribute('title') || '',
                type: 'chart',
                element: canvas,
                dimensions: {
                    width: canvas.width,
                    height: canvas.height,
                    displayWidth: canvas.offsetWidth,
                    displayHeight: canvas.offsetHeight
                },
                position: this.getElementPosition(canvas),
                context: this.extractImageContext(canvas),
                visibility: {
                    inViewport: this.isInViewport(canvas),
                    isVisible: true
                },
                isCanvas: true
            };
            
            images.push(imageData);
            processedSources.add(canvasId);
        });
        
        return images;
    }
    
    /**
     * Extract lazy-loaded images
     */
    extractLazyLoadedImages(processedSources) {
        const images = [];
        const lazySelectors = '[data-src], [data-lazy-src], [data-original], [loading="lazy"]';
        const lazyElements = document.querySelectorAll(lazySelectors);
        
        lazyElements.forEach((element, index) => {
            if (element.tagName !== 'IMG') return;
            if (!this.isElementVisible(element)) return;
            
            const src = element.getAttribute('data-src') || 
                       element.getAttribute('data-lazy-src') || 
                       element.getAttribute('data-original') ||
                       element.src;
            
            if (!src || processedSources.has(src)) return;
            
            const rect = element.getBoundingClientRect();
            if (rect.width < this.config.minWidth || rect.height < this.config.minHeight) return;
            
            const imageData = {
                id: `lazy_${index}_${Date.now()}`,
                src: src,
                originalSrc: src,
                alt: element.alt || '',
                title: element.title || '',
                type: 'image',
                element: element,
                dimensions: {
                    width: parseInt(element.getAttribute('width')) || rect.width,
                    height: parseInt(element.getAttribute('height')) || rect.height,
                    displayWidth: rect.width,
                    displayHeight: rect.height
                },
                position: this.getElementPosition(element),
                context: this.extractImageContext(element),
                visibility: {
                    inViewport: this.isInViewport(element),
                    isVisible: true
                },
                isLazy: true
            };
            
            images.push(imageData);
            processedSources.add(src);
        });
        
        return images;
    }
    
    /**
     * Extract background images
     */
    extractBackgroundImages(processedSources) {
        const images = [];
        const elementsWithBg = document.querySelectorAll('[style*="background-image"]');
        
        elementsWithBg.forEach((element, index) => {
            const style = window.getComputedStyle(element);
            const bgImage = style.backgroundImage;
            
            if (!bgImage || bgImage === 'none') return;
            
            const urlMatch = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (!urlMatch || !urlMatch[1]) return;
            
            const src = urlMatch[1];
            if (processedSources.has(src)) return;
            
            const rect = element.getBoundingClientRect();
            if (rect.width < this.config.minWidth || rect.height < this.config.minHeight) return;
            
            const imageData = {
                id: `bg_${index}_${Date.now()}`,
                src: src,
                originalSrc: src,
                alt: element.getAttribute('aria-label') || '',
                title: element.getAttribute('title') || '',
                type: 'background',
                element: element,
                dimensions: {
                    width: rect.width,
                    height: rect.height,
                    displayWidth: rect.width,
                    displayHeight: rect.height
                },
                position: this.getElementPosition(element),
                context: this.extractImageContext(element),
                visibility: {
                    inViewport: this.isInViewport(element),
                    isVisible: true
                },
                isBackground: true
            };
            
            images.push(imageData);
            processedSources.add(src);
        });
        
        return images;
    }
    
    /**
     * Extract text sections from the page
     */
    async extractTextSections() {
        console.log('📄 Starting text extraction...');
        const sections = {};
        const processedElements = new Set();
        
        try {
            // Find section headers and their content
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            let currentSection = null;
            let currentContent = [];
            
            headings.forEach(heading => {
                if (processedElements.has(heading)) return;
                
                // Save previous section
                if (currentSection && currentContent.length > 0) {
                    const content = currentContent.join('\n').trim();
                    if (content && !this.isReferenceSection(currentSection)) {
                        sections[currentSection] = content;
                    }
                }
                
                // Start new section
                currentSection = this.cleanSectionName(heading.textContent);
                currentContent = [];
                processedElements.add(heading);
                
                // Collect content after this heading
                let nextElement = heading.nextElementSibling;
                while (nextElement && !this.isHeading(nextElement)) {
                    if (this.isContentElement(nextElement)) {
                        const text = this.cleanText(nextElement.textContent);
                        if (text && text.length > 20) {
                            currentContent.push(text);
                            processedElements.add(nextElement);
                        }
                    }
                    nextElement = nextElement.nextElementSibling;
                }
            });
            
            // Save last section
            if (currentSection && currentContent.length > 0) {
                const content = currentContent.join('\n').trim();
                if (content && !this.isReferenceSection(currentSection)) {
                    sections[currentSection] = content;
                }
            }
            
            // If no sections found, try alternative extraction
            if (Object.keys(sections).length === 0) {
                const alternativeSections = this.extractSectionsByPatterns();
                Object.assign(sections, alternativeSections);
            }
            
            console.log(`✅ Extracted ${Object.keys(sections).length} text sections`);
            this.extractedData.text = sections;
            
            return sections;
            
        } catch (error) {
            console.error('❌ Text extraction failed:', error);
            throw error;
        }
    }
    
    /**
     * Helper: Get image source
     */
    getImageSource(img) {
        return img.currentSrc || 
               img.src || 
               img.getAttribute('src') || 
               img.getAttribute('data-src') || 
               img.getAttribute('data-lazy-src') ||
               img.getAttribute('data-original');
    }
    
    /**
     * Helper: Check element visibility
     */
    isElementVisible(element) {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               parseFloat(style.opacity) > 0 &&
               rect.width > 0 && 
               rect.height > 0;
    }
    
    /**
     * Helper: Check if element is in viewport
     */
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && 
               rect.bottom > 0 &&
               rect.left < window.innerWidth && 
               rect.right > 0;
    }
    
    /**
     * Helper: Get element position
     */
    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        return {
            top: rect.top + scrollTop,
            left: rect.left + scrollLeft,
            bottom: rect.bottom + scrollTop,
            right: rect.right + scrollLeft,
            width: rect.width,
            height: rect.height,
            viewport: {
                top: rect.top,
                left: rect.left,
                bottom: rect.bottom,
                right: rect.right
            }
        };
    }
    
    /**
     * Helper: Extract image context
     */
    extractImageContext(element) {
        const context = {};
        
        // Find parent figure
        const figure = element.closest('figure, .figure, [role="figure"]');
        
        if (figure) {
            // Extract caption
            const captionSelectors = [
                'figcaption',
                '.figure-caption',
                '.caption',
                '[data-test="figure-caption-text"]'
            ];
            
            for (const selector of captionSelectors) {
                const caption = figure.querySelector(selector);
                if (caption) {
                    context.caption = caption.textContent.trim();
                    break;
                }
            }
            
            // Extract label
            const labelSelectors = [
                '.figure-label',
                '.fig-label',
                '[data-figure-label]'
            ];
            
            for (const selector of labelSelectors) {
                const label = figure.querySelector(selector);
                if (label) {
                    context.label = label.textContent.trim();
                    break;
                }
            }
            
            context.figureId = figure.id || figure.getAttribute('data-id');
            context.figure = true;
        }
        
        // Check aria-describedby
        const describedBy = element.getAttribute('aria-describedby');
        if (describedBy) {
            const descElement = document.getElementById(describedBy);
            if (descElement && !context.caption) {
                context.caption = descElement.textContent.trim();
            }
        }
        
        // Check if in main content
        const article = element.closest('article, main, [role="main"], .content');
        context.inMainContent = !!article;
        
        // Get surrounding text
        const parent = element.parentElement;
        if (parent) {
            const siblingText = [];
            const prevSibling = element.previousElementSibling;
            const nextSibling = element.nextElementSibling;
            
            if (prevSibling && prevSibling.textContent.length < 200) {
                siblingText.push(prevSibling.textContent.trim());
            }
            if (nextSibling && nextSibling.textContent.length < 200) {
                siblingText.push(nextSibling.textContent.trim());
            }
            
            if (siblingText.length > 0) {
                context.surroundingText = siblingText.join(' ');
            }
        }
        
        return context;
    }
    
    /**
     * Helper: Sort images by importance
     */
    sortImagesByImportance(images) {
        return images.sort((a, b) => {
            // Priority 1: Images in figures
            if (a.context.figure !== b.context.figure) {
                return a.context.figure ? -1 : 1;
            }
            
            // Priority 2: Images with captions
            const aHasCaption = !!(a.context.caption || a.context.label);
            const bHasCaption = !!(b.context.caption || b.context.label);
            if (aHasCaption !== bHasCaption) {
                return aHasCaption ? -1 : 1;
            }
            
            // Priority 3: Larger images
            const aArea = (a.dimensions.width || 0) * (a.dimensions.height || 0);
            const bArea = (b.dimensions.width || 0) * (b.dimensions.height || 0);
            if (aArea !== bArea) {
                return bArea - aArea;
            }
            
            // Priority 4: Higher position on page
            return a.position.top - b.position.top;
        });
    }
    
    /**
     * Text extraction helpers
     */
    isHeading(element) {
        return /^H[1-6]$/.test(element.tagName);
    }
    
    isContentElement(element) {
        const contentTags = ['P', 'DIV', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'LI'];
        return contentTags.includes(element.tagName);
    }
    
    isReferenceSection(name) {
        const lower = (name || '').toLowerCase();
        const skipKeywords = [
            'references', 'bibliography', 'works cited', 
            'citations', 'acknowledgments', 'acknowledgements'
        ];
        return skipKeywords.some(keyword => lower.includes(keyword));
    }
    
    cleanSectionName(name) {
        return (name || '')
            .replace(/^[\d\.\s]+/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    cleanText(text) {
        return (text || '')
            .replace(/\s+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    
    extractSectionsByPatterns() {
        const sections = {};
        const mainContent = document.querySelector('main, article, .content, [role="main"]');
        
        if (!mainContent) return sections;
        
        const text = this.cleanText(mainContent.textContent);
        
        const patterns = [
            { name: 'Abstract', regex: /abstract[:\s]*(.{100,1500})/i },
            { name: 'Introduction', regex: /introduction[:\s]*(.{100,3000})/i },
            { name: 'Methods', regex: /(?:methods|methodology)[:\s]*(.{100,3000})/i },
            { name: 'Results', regex: /results[:\s]*(.{100,3000})/i },
            { name: 'Discussion', regex: /discussion[:\s]*(.{100,3000})/i },
            { name: 'Conclusion', regex: /conclusion[s]?[:\s]*(.{100,2000})/i }
        ];
        
        patterns.forEach(({ name, regex }) => {
            const match = text.match(regex);
            if (match && match[1]) {
                sections[name] = this.cleanText(match[1]);
            }
        });
        
        return sections;
    }
}
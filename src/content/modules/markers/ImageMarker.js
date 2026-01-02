// src/content/modules/markers/ImageMarker.js - Refactored
(function(global) {
    'use strict';
    
    if (typeof BaseMarker === 'undefined') {
        console.error('ImageMarker requires BaseMarker to be loaded first');
        return;
    }
    
    class ImageMarker extends BaseMarker {
        constructor(config = {}) {
            super(config);
            this.processedImages = new Set();
        }
        
        getType() {
            return 'image';
        }
        
        async onActivate(config) {
            const activationConfig = {
                minWidth: config.minWidth || this.config.minImageWidth || 100,
                minHeight: config.minHeight || this.config.minImageHeight || 100,
                includeBackground: config.includeBackground !== false,
                includeSVG: config.includeSVG !== false,
                includeCanvas: config.includeCanvas !== false,
                autoMark: config.autoMark !== false
            };
            
            let markedCount = 0;
            
            if (activationConfig.autoMark) {
                markedCount += this.markImages(activationConfig);
                
                if (activationConfig.includeSVG) {
                    markedCount += this.markSVGElements(activationConfig);
                }
                
                if (activationConfig.includeCanvas) {
                    markedCount += this.markCanvasElements(activationConfig);
                }
            }
            
            return { success: true, count: markedCount };
        }
        
        onDeactivate() {
            this.processedImages.clear();
        }
        
        markImages(config) {
            const images = document.querySelectorAll('img');
            let count = 0;
            
            images.forEach((img, index) => {
                if (this.shouldSkipImage(img, config)) return;
                
                const metadata = this.extractImageMetadata(img, index);
                const marker = this.createMarker(img, metadata);
                
                if (marker) {
                    this.processedImages.add(img);
                    count++;
                }
            });
            
            return count;
        }
        
        markSVGElements(config) {
            const svgs = document.querySelectorAll('svg');
            let count = 0;
            
            svgs.forEach((svg, index) => {
                if (this.shouldSkipSVG(svg, config)) return;
                
                const metadata = {
                    id: `svg_${Date.now()}_${index}`,
                    type: 'diagram',
                    elementType: 'svg',
                    dimensions: this.getElementDimensions(svg)
                };
                
                const marker = this.createMarker(svg, metadata);
                if (marker) {
                    this.processedImages.add(svg);
                    count++;
                }
            });
            
            return count;
        }
        
        markCanvasElements(config) {
            const canvases = document.querySelectorAll('canvas');
            let count = 0;
            
            canvases.forEach((canvas, index) => {
                if (this.shouldSkipCanvas(canvas, config)) return;
                
                const metadata = {
                    id: `canvas_${Date.now()}_${index}`,
                    type: 'chart',
                    elementType: 'canvas',
                    dimensions: {
                        width: canvas.width,
                        height: canvas.height
                    }
                };
                
                const marker = this.createMarker(canvas, metadata);
                if (marker) {
                    this.processedImages.add(canvas);
                    count++;
                }
            });
            
            return count;
        }
        
        shouldSkipImage(img, config) {
            // Skip if already processed
            if (this.processedImages.has(img)) return true;
            
            // Skip extension elements
            if (this.isExtensionElement(img)) return true;
            
            // Check visibility
            if (!this.isVisible(img)) return true;
            
            // Check dimensions
            const rect = img.getBoundingClientRect();
            if (rect.width < config.minWidth || rect.height < config.minHeight) return true;
            
            // Check if likely icon
            if (this.isLikelyIcon(img)) return true;
            
            return false;
        }
        
        shouldSkipSVG(svg, config) {
            if (this.processedImages.has(svg) || this.isExtensionElement(svg)) return true;
            
            const rect = svg.getBoundingClientRect();
            return rect.width < config.minWidth || rect.height < config.minHeight;
        }
        
        shouldSkipCanvas(canvas, config) {
            if (this.processedImages.has(canvas) || this.isExtensionElement(canvas)) return true;
            
            return canvas.width < config.minWidth || canvas.height < config.minHeight;
        }
        
        extractImageMetadata(img, index) {
            const metadata = {
                id: `img_${Date.now()}_${index}`,
                src: img.src || img.currentSrc || img.getAttribute('data-src'),
                alt: img.alt,
                title: img.title,
                index: index + 1,
                dimensions: {
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height
                }
            };
            
            // Find caption if in figure
            const figure = img.closest('figure');
            if (figure) {
                const figcaption = figure.querySelector('figcaption');
                if (figcaption) {
                    metadata.caption = figcaption.textContent.trim();
                }
                metadata.inFigure = true;
            }
            
            return metadata;
        }
        
        isVisible(element) {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   parseFloat(style.opacity) > 0 &&
                   rect.width > 0 && 
                   rect.height > 0;
        }
        
        isLikelyIcon(img) {
            const src = img.src || '';
            const className = img.className || '';
            const id = img.id || '';
            
            const iconPatterns = [
                /icon/i, /logo/i, /avatar/i, /emoji/i,
                /button/i, /\.svg$/i, /data:image\/svg/i
            ];
            
            return iconPatterns.some(pattern => 
                pattern.test(src) || pattern.test(className) || pattern.test(id)
            );
        }
        
        getElementDimensions(element) {
            const rect = element.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height
            };
        }
        
        prepareDataForExtension(metadata) {
            return {
                id: metadata.id,
                type: 'image',
                src: metadata.src,
                alt: metadata.alt,
                title: metadata.title,
                caption: metadata.caption,
                dimensions: metadata.dimensions,
                inFigure: metadata.inFigure
            };
        }

        isExtensionElement(element) {
            const extensionSelectors = [
                '.orkg-extension',
                '.orkg-analyzer', 
                '#orkg-panel',
                '[data-orkg-extension]',
                '.orkg-marker',
                '.orkg-marker-container'
            ];
            
            return extensionSelectors.some(selector => 
                element.closest(selector) !== null
            );
        }
        
        // RAG-specific method
        createMarkersForRAGImages(images) {
            let createdCount = 0;
            
            images.forEach((imageData) => {
                const element = this.findImageElement(imageData);
                
                if (element && !this.processedImages.has(element)) {
                    const metadata = {
                        id: imageData.id || this.generateMarkerId(),
                        ...imageData,
                        fromRAG: true
                    };
                    
                    const marker = this.createMarker(element, metadata);
                    if (marker) {
                        this.processedImages.add(element);
                        createdCount++;
                    }
                }
            });
            
            return createdCount;
        }
        
        findImageElement(imageData) {
            if (imageData.selector) {
                return document.querySelector(imageData.selector);
            }
            
            if (imageData.src) {
                return document.querySelector(`img[src="${imageData.src}"]`) ||
                       document.querySelector(`img[src*="${imageData.src}"]`);
            }
            
            if (imageData.index !== undefined) {
                const images = document.querySelectorAll('img');
                return images[imageData.index];
            }
            
            return null;
        }
    }
    
    // Export to global scope
    global.ImageMarker = ImageMarker;
    
})(typeof window !== 'undefined' ? window : this);
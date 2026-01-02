// ================================
// src/background/extraction-orchestrator-service.js
// Orchestrates all extraction services for background script - IIFE pattern
// ================================

var ExtractionOrchestrator = (function() {
    'use strict';
    
    // Private state
    var isExtracting = false;
    var extractedData = {
        images: [],
        text: {},
        tables: []
    };
    var currentTab = null;
    var isInitialized = false;
    
    // Private methods
    function sendExtractionProgress(percentage, message) {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                action: 'EXTRACTION_PROGRESS',
                data: {
                    percentage: percentage,
                    message: message,
                    timestamp: Date.now()
                }
            }).catch(function(error) {
                // Message might fail if popup is closed
                console.log('Could not send progress:', error.message);
            });
        }
    }
    
    function validateTab(tab) {
        if (!tab) {
            return Promise.reject(new Error('No tab available for extraction'));
        }
        
        // Check if it's a valid URL
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            return Promise.reject(new Error('Cannot extract from browser internal pages'));
        }
        
        return Promise.resolve(tab);
    }
    
    // Image extraction functions to be executed in page context
    function extractImagesFromPage(config) {
        // This function runs in the page context
        var images = [];
        var processedSources = {};
        
        function isElementVisible(element) {
            var style = window.getComputedStyle(element);
            var rect = element.getBoundingClientRect();
            
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   parseFloat(style.opacity) > 0 &&
                   rect.width > 0 && 
                   rect.height > 0;
        }
        
        function getImageSource(img) {
            return img.currentSrc || 
                   img.src || 
                   img.getAttribute('src') || 
                   img.getAttribute('data-src') || 
                   img.getAttribute('data-lazy-src') ||
                   img.getAttribute('data-original');
        }
        
        function extractImageContext(element) {
            var context = {};
            
            // Find parent figure
            var figure = element.closest('figure, .figure, [role="figure"]');
            if (figure) {
                var caption = figure.querySelector('figcaption, .caption, .figure-caption');
                if (caption) {
                    context.caption = caption.textContent.trim();
                }
                context.inFigure = true;
            }
            
            // Check alt text
            context.alt = element.alt || element.getAttribute('aria-label') || '';
            context.title = element.title || '';
            
            return context;
        }
        
        // Extract regular images
        var imgElements = document.querySelectorAll('img');
        for (var i = 0; i < imgElements.length; i++) {
            var img = imgElements[i];
            
            if (!isElementVisible(img)) continue;
            
            var src = getImageSource(img);
            if (!src || processedSources[src]) continue;
            
            var rect = img.getBoundingClientRect();
            if (rect.width < config.minWidth || rect.height < config.minHeight) continue;
            
            images.push({
                id: 'img_' + i + '_' + Date.now(),
                src: src,
                type: 'image',
                alt: img.alt || '',
                title: img.title || '',
                dimensions: {
                    width: img.naturalWidth || rect.width,
                    height: img.naturalHeight || rect.height
                },
                context: extractImageContext(img)
            });
            
            processedSources[src] = true;
        }
        
        // Extract SVG elements
        if (config.includeSvg) {
            var svgElements = document.querySelectorAll('svg');
            for (var s = 0; s < svgElements.length; s++) {
                var svg = svgElements[s];
                
                if (!isElementVisible(svg)) continue;
                
                var svgRect = svg.getBoundingClientRect();
                if (svgRect.width < config.minWidth || svgRect.height < config.minHeight) continue;
                
                images.push({
                    id: 'svg_' + s + '_' + Date.now(),
                    src: 'inline-svg',
                    type: 'diagram',
                    alt: svg.getAttribute('aria-label') || '',
                    title: svg.getAttribute('title') || '',
                    dimensions: {
                        width: svgRect.width,
                        height: svgRect.height
                    },
                    context: extractImageContext(svg),
                    isSvg: true
                });
            }
        }
        
        // Extract canvas elements
        if (config.includeCanvas) {
            var canvasElements = document.querySelectorAll('canvas');
            for (var c = 0; c < canvasElements.length; c++) {
                var canvas = canvasElements[c];
                
                if (!isElementVisible(canvas)) continue;
                if (canvas.width < config.minWidth || canvas.height < config.minHeight) continue;
                
                var canvasSrc = 'canvas-element';
                if (config.includeDataUrls) {
                    try {
                        canvasSrc = canvas.toDataURL('image/png');
                    } catch (e) {
                        // Canvas might be tainted
                    }
                }
                
                images.push({
                    id: 'canvas_' + c + '_' + Date.now(),
                    src: canvasSrc,
                    type: 'chart',
                    alt: canvas.getAttribute('aria-label') || '',
                    title: canvas.getAttribute('title') || '',
                    dimensions: {
                        width: canvas.width,
                        height: canvas.height
                    },
                    context: extractImageContext(canvas),
                    isCanvas: true
                });
            }
        }
        
        // Sort by importance
        images.sort(function(a, b) {
            // Prioritize images in figures
            if (a.context.inFigure !== b.context.inFigure) {
                return a.context.inFigure ? -1 : 1;
            }
            
            // Prioritize images with captions
            var aHasCaption = !!a.context.caption;
            var bHasCaption = !!b.context.caption;
            if (aHasCaption !== bHasCaption) {
                return aHasCaption ? -1 : 1;
            }
            
            // Prioritize larger images
            var aArea = a.dimensions.width * a.dimensions.height;
            var bArea = b.dimensions.width * b.dimensions.height;
            return bArea - aArea;
        });
        
        // Limit to max images
        return images.slice(0, config.maxImages);
    }
    
    // Public API
    return {
        init: function() {
            return new Promise(function(resolve, reject) {
                console.log('Initializing ExtractionOrchestrator...');
                
                // Initialize base service
                if (!BaseExtractionService) {
                    reject(new Error('BaseExtractionService not found'));
                    return;
                }
                
                BaseExtractionService.init().then(function() {
                    // Initialize individual services
                    var initPromises = [];
                    
                    if (TextExtractionService) {
                        initPromises.push(TextExtractionService.init());
                    }
                    
                    if (TableExtractionService) {
                        initPromises.push(TableExtractionService.init());
                    }
                    
                    return Promise.all(initPromises);
                }).then(function() {
                    // Get current tab
                    return BaseExtractionService.getCurrentTab();
                }).then(function(tab) {
                    currentTab = tab;
                    isInitialized = true;
                    console.log('ExtractionOrchestrator initialized');
                    resolve();
                }).catch(reject);
            });
        },
        
        extractAll: function(options) {
            return new Promise(function(resolve, reject) {
                if (isExtracting) {
                    reject(new Error('Extraction already in progress'));
                    return;
                }
                
                isExtracting = true;
                extractedData = {
                    images: [],
                    text: {},
                    tables: []
                };
                
                // Default options
                var config = {
                    images: true,
                    text: true,
                    tables: true,
                    tabId: null
                };
                
                // Merge options
                if (options) {
                    Object.keys(options).forEach(function(key) {
                        config[key] = options[key];
                    });
                }
                
                console.log('Starting complete extraction with config:', config);
                sendExtractionProgress(0, 'Starting extraction...');
                
                // Get target tab
                var getTabPromise;
                if (config.tabId) {
                    getTabPromise = new Promise(function(resolve) {
                        chrome.tabs.get(config.tabId, resolve);
                    });
                } else {
                    getTabPromise = BaseExtractionService.getCurrentTab();
                }
                
                getTabPromise
                    .then(validateTab)
                    .then(function(tab) {
                        currentTab = tab;
                        var tabId = tab.id;
                        var extractionPromises = [];
                        var progressWeight = 0;
                        var completedWeight = 0;
                        
                        // Setup extraction tasks
                        if (config.images) {
                            progressWeight += 0.4;
                            extractionPromises.push(
                                ExtractionOrchestrator.extractImages(tabId)
                                    .then(function(images) {
                                        extractedData.images = images;
                                        completedWeight += 0.4;
                                        sendExtractionProgress(
                                            completedWeight * 100,
                                            'Images extracted: ' + images.length
                                        );
                                        return images;
                                    })
                            );
                        }
                        
                        if (config.text && TextExtractionService) {
                            progressWeight += 0.4;
                            extractionPromises.push(
                                TextExtractionService.extractAll(tabId)
                                    .then(function(result) {
                                        extractedData.text = result.sections;
                                        completedWeight += 0.4;
                                        sendExtractionProgress(
                                            completedWeight * 100,
                                            'Text sections extracted: ' + Object.keys(result.sections).length
                                        );
                                        return result;
                                    })
                            );
                        }
                        
                        if (config.tables && TableExtractionService) {
                            progressWeight += 0.2;
                            extractionPromises.push(
                                TableExtractionService.extractAll(tabId)
                                    .then(function(result) {
                                        extractedData.tables = result.tables;
                                        completedWeight += 0.2;
                                        sendExtractionProgress(
                                            completedWeight * 100,
                                            'Tables extracted: ' + result.tables.length
                                        );
                                        return result;
                                    })
                            );
                        }
                        
                        return Promise.all(extractionPromises);
                    })
                    .then(function() {
                        sendExtractionProgress(100, 'Extraction complete');
                        isExtracting = false;
                        
                        var result = {
                            data: extractedData,
                            metadata: {
                                extractedFrom: currentTab.url,
                                extractedAt: new Date().toISOString(),
                                tabTitle: currentTab.title,
                                tabId: currentTab.id
                            },
                            summary: ExtractionOrchestrator.getExtractionSummary()
                        };
                        
                        console.log('Extraction complete:', result.summary);
                        resolve(result);
                    })
                    .catch(function(error) {
                        isExtracting = false;
                        console.error('Extraction failed:', error);
                        sendExtractionProgress(-1, 'Extraction failed: ' + error.message);
                        reject(error);
                    });
            });
        },
        
        extractImages: function(tabId) {
            return new Promise(function(resolve, reject) {
                console.log('Extracting images...');
                
                var config = {
                    minWidth: 100,
                    minHeight: 100,
                    maxImages: 500,
                    includeDataUrls: true,
                    includeSvg: true,
                    includeCanvas: true
                };
                
                BaseExtractionService.executeInTab(
                    tabId,
                    extractImagesFromPage,
                    [config]
                ).then(function(images) {
                    console.log('Images extracted:', images.length);
                    resolve(images || []);
                }).catch(function(error) {
                    console.error('Image extraction failed:', error);
                    reject(error);
                });
            });
        },
        
        extractText: function(tabId) {
            if (!TextExtractionService) {
                return Promise.reject(new Error('TextExtractionService not available'));
            }
            return TextExtractionService.extractAll(tabId);
        },
        
        extractTables: function(tabId) {
            if (!TableExtractionService) {
                return Promise.reject(new Error('TableExtractionService not available'));
            }
            return TableExtractionService.extractAll(tabId);
        },
        
        getExtractedData: function() {
            return extractedData;
        },
        
        getImages: function() {
            return extractedData.images;
        },
        
        getText: function() {
            return extractedData.text;
        },
        
        getTables: function() {
            return extractedData.tables;
        },
        
        getExtractionSummary: function() {
            return {
                images: {
                    count: extractedData.images.length,
                    withCaptions: extractedData.images.filter(function(img) {
                        return img.context && img.context.caption;
                    }).length
                },
                text: {
                    sections: Object.keys(extractedData.text).length,
                    totalWords: Object.values(extractedData.text).join(' ').split(/\s+/).length
                },
                tables: {
                    count: extractedData.tables.length,
                    totalRows: extractedData.tables.reduce(function(total, table) {
                        return total + (table.rows ? table.rows.length : 0);
                    }, 0)
                }
            };
        },
        
        isExtracting: function() {
            return isExtracting;
        },
        
        isReady: function() {
            return isInitialized;
        },
        
        getCurrentTab: function() {
            return currentTab;
        },
        
        reset: function() {
            extractedData = {
                images: [],
                text: {},
                tables: []
            };
            isExtracting = false;
            
            if (TextExtractionService) {
                TextExtractionService.reset();
            }
            
            if (TableExtractionService) {
                TableExtractionService.reset();
            }
        }
    };
})();

// Expose to global scope for service worker
if (typeof self !== 'undefined') {
    self.ExtractionOrchestrator = ExtractionOrchestrator;
} else if (typeof window !== 'undefined') {
    window.ExtractionOrchestrator = ExtractionOrchestrator;
}
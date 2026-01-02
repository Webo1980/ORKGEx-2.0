// ================================
// src/background/handlers/extraction-handler.js
// Coordinates extraction requests
// ================================

var ExtractionHandler = (function() {
    'use strict';
    
    // Private variables
    var activeExtractions = new Map();
    var extractionQueue = [];
    var isProcessingQueue = false;
    
    // Process extraction queue
    function processQueue() {
        if (isProcessingQueue || extractionQueue.length === 0) {
            return;
        }
        
        isProcessingQueue = true;
        
        var task = extractionQueue.shift();
        
        performExtraction(task).finally(function() {
            isProcessingQueue = false;
            if (extractionQueue.length > 0) {
                setTimeout(processQueue, 100);
            }
        });
    }
    
    // Perform extraction
    function performExtraction(task) {
        var extractionId = BackgroundTypes.generateId('extraction');
        activeExtractions.set(extractionId, task);
        
        console.log('Starting extraction:', extractionId, 'type:', task.type);
        
        return task.executor().then(function(result) {
            activeExtractions.delete(extractionId);
            task.resolve(result);
            
            console.log('Extraction completed:', extractionId);
            return result;
        }).catch(function(error) {
            activeExtractions.delete(extractionId);
            task.reject(error);
            
            console.error('Extraction failed:', extractionId, error);
            throw error;
        });
    }
    
    // Queue extraction task
    function queueExtraction(type, executor) {
        return new Promise(function(resolve, reject) {
            extractionQueue.push({
                type: type,
                executor: executor,
                resolve: resolve,
                reject: reject,
                queuedAt: Date.now()
            });
            
            processQueue();
        });
    }
    
    // Validate tab for extraction
    function validateTab(tabId) {
        return TabHandler.getTabInfo(tabId).then(function(result) {
            if (!result.success) {
                throw new Error(result.error || 'Failed to get tab info');
            }
            
            if (!BackgroundTypes.isValidTab(result.tab)) {
                throw new Error(BackgroundTypes.ERROR_MESSAGES.INVALID_URL);
            }
            
            return result.tab;
        });
    }
    
    // Public API
    return {
        // Extract text from tab
        extractText: function(tabId, options) {
            if (!tabId) {
                return Promise.reject(new Error(BackgroundTypes.ERROR_MESSAGES.NO_TAB_ID));
            }
            
            return validateTab(tabId).then(function(tab) {
                return queueExtraction('text', function() {
                    // Send message to content script to extract text
                    return TabHandler.sendMessageToTab(tabId, {
                        action: 'EXTRACT_TEXT',
                        options: options || {},
                        showOverlay: true
                    }).then(function(response) {
                        
                        if (!response || !response.success) {
                            throw new Error(response?.error || 'Text extraction failed');
                        }
                        
                        // Handle nested response structure
                        var sections = {};
                        
                        // Check different possible paths for sections
                        if (response.data) {
                            console.log('Text extraction response:', response);
                            // Fallback: assume response.data.data is sections object
                            sections = response.data.data.sections || response.data.sections || {};
                            
                        }
                        
                        console.log('Extracted text sections:', Object.keys(sections), response);
                        
                        // Store results
                        StateManager.updateTabState(tabId, {
                            extractedText: sections
                        });
                        
                        return StorageManager.updateAnalysisResults({
                            texts: sections
                        }).then(function() {
                            return {
                                success: true,
                                data: { sections: sections },
                                metadata: {
                                    tabId: tabId,
                                    url: tab.url,
                                    title: tab.title,
                                    extractedAt: new Date().toISOString()
                                }
                            };
                        });
                    }).catch(function(error) {
                        console.error('Text extraction via content script failed:', error);
                        
                        // Fallback extraction if content script fails
                        return TabHandler.executeScript(tabId, function() {
                            var sections = {};
                            
                            // Extract title
                            var title = document.querySelector('h1');
                            if (title) {
                                sections.title = title.textContent.trim();
                            }
                            
                            // Extract abstract
                            var abstract = document.querySelector('[class*="abstract"], [id*="abstract"]');
                            if (abstract) {
                                sections.abstract = abstract.textContent.trim();
                            }
                            
                            // Extract main content
                            var main = document.querySelector('main, article, [role="main"]');
                            if (main) {
                                sections.mainContent = main.textContent.trim();
                            }
                            
                            // Extract introduction
                            var intro = document.querySelector('[class*="intro"], [id*="intro"], section:first-of-type');
                            if (intro) {
                                sections.introduction = intro.textContent.trim();
                            }
                            
                            // Extract methods
                            var methods = document.querySelector('[class*="method"], [id*="method"]');
                            if (methods) {
                                sections.methods = methods.textContent.trim();
                            }
                            
                            // Extract results
                            var results = document.querySelector('[class*="result"], [id*="result"]');
                            if (results) {
                                sections.results = results.textContent.trim();
                            }
                            
                            // Extract conclusion
                            var conclusion = document.querySelector('[class*="conclu"], [id*="conclu"]');
                            if (conclusion) {
                                sections.conclusion = conclusion.textContent.trim();
                            }
                            
                            return sections;
                        }).then(function(result) {
                            if (result.success && result.result) {
                                return {
                                    success: true,
                                    data: { sections: result.result },
                                    metadata: {
                                        tabId: tabId,
                                        url: tab.url,
                                        title: tab.title,
                                        extractedAt: new Date().toISOString()
                                    }
                                };
                            }
                            throw new Error('Text extraction failed');
                        });
                    });
                });
            });
        },
                
        // Extract tables from tab
        extractTables: function(tabId, config) {
            return new Promise(function(resolve, reject) {
                console.log('📊 Extracting tables from tab:', tabId);
                
                chrome.tabs.sendMessage(tabId, {
                    action: 'EXTRACT_TABLES',
                    config: config || {}
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        console.error('Table extraction failed:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else if (response && response.success) {
                        // Fix: Handle the nested data structure properly
                        var tables = [];
                        
                        // Check different possible response structures
                        if (response.data) {
                            if (response.data.tables) {
                                tables = response.data.tables;
                            } else if (response.data.data && response.data.data.tables) {
                                tables = response.data.data.tables;
                            } else if (Array.isArray(response.data)) {
                                tables = response.data;
                            } else if (typeof response.data === 'object' && !Array.isArray(response.data)) {
                                // Response.data might be an object with table data
                                // Convert to array format
                                tables = Object.values(response.data);
                            }
                        } else if (response.tables) {
                            tables = response.tables;
                        }
                        
                        console.log('✅ Tables extracted:', tables);
                        console.log('📊 Number of tables found:', Array.isArray(tables) ? tables.length : 0);
                        
                        resolve({
                            success: true,
                            data: {
                                tables: Array.isArray(tables) ? tables : []
                            }
                        });
                    } else {
                        reject(new Error(response?.error || 'Table extraction failed'));
                    }
                });
            });
        },
        
        // Extract images from tab
        extractImages: function(tabId, options) {
            if (!tabId) {
                return Promise.reject(new Error(BackgroundTypes.ERROR_MESSAGES.NO_TAB_ID));
            }
            
            return validateTab(tabId).then(function(tab) {
                return queueExtraction('images', function() {
                    if (ExtractionOrchestrator && ExtractionOrchestrator.extractImages) {
                        return ExtractionOrchestrator.extractImages(tabId).then(function(images) {
                            // Store results
                            return StorageManager.updateAnalysisResults({
                                images: images
                            }).then(function() {
                                return {
                                    success: true,
                                    data: { images: images },
                                    metadata: {
                                        tabId: tabId,
                                        url: tab.url,
                                        title: tab.title,
                                        extractedAt: new Date().toISOString()
                                    }
                                };
                            });
                        });
                    }
                    
                    // Fallback extraction
                    return TabHandler.executeScript(tabId, function() {
                        var images = [];
                        var imgElements = document.querySelectorAll('img');
                        
                        imgElements.forEach(function(img, index) {
                            var rect = img.getBoundingClientRect();
                            if (rect.width > 100 && rect.height > 100) {
                                images.push({
                                    id: 'img_' + index,
                                    src: img.src,
                                    alt: img.alt,
                                    title: img.title,
                                    dimensions: {
                                        width: img.naturalWidth || rect.width,
                                        height: img.naturalHeight || rect.height
                                    }
                                });
                            }
                        });
                        
                        return images;
                    }).then(function(result) {
                        if (result.success) {
                            return {
                                success: true,
                                data: { images: result.result },
                                metadata: {
                                    tabId: tabId,
                                    url: tab.url,
                                    title: tab.title,
                                    extractedAt: new Date().toISOString()
                                }
                            };
                        }
                        throw new Error('Image extraction failed');
                    });
                });
            });
        },
        
        // Extract all content
        extractAll: function(tabId, options) {
            if (!tabId) {
                return Promise.reject(new Error(BackgroundTypes.ERROR_MESSAGES.NO_TAB_ID));
            }
            
            options = options || {
                images: true,
                text: true,
                tables: true
            };
            
            return validateTab(tabId).then(function(tab) {
                if (ExtractionOrchestrator && ExtractionOrchestrator.extractAll) {
                    return ExtractionOrchestrator.extractAll({
                        tabId: tabId,
                        images: options.images,
                        text: options.text,
                        tables: options.tables
                    }).then(function(result) {
                        // Store all results
                        return StorageManager.updateAnalysisResults({
                            images: result.data.images || [],
                            texts: result.data.text || {},
                            tables: result.data.tables || []
                        }).then(function() {
                            return {
                                success: true,
                                data: result.data,
                                metadata: result.metadata,
                                summary: result.summary
                            };
                        });
                    });
                }
                
                // Fallback: extract individually
                var promises = [];
                var results = {};
                
                if (options.text) {
                    promises.push(
                        ExtractionHandler.extractText(tabId).then(function(result) {
                            results.text = result.data;
                        })
                    );
                }
                
                if (options.tables) {
                    promises.push(
                        ExtractionHandler.extractTables(tabId).then(function(result) {
                            results.tables = result.data;
                        })
                    );
                }
                
                if (options.images) {
                    promises.push(
                        ExtractionHandler.extractImages(tabId).then(function(result) {
                            results.images = result.data;
                        })
                    );
                }
                
                return Promise.all(promises).then(function() {
                    return {
                        success: true,
                        data: results,
                        metadata: {
                            tabId: tabId,
                            url: tab.url,
                            title: tab.title,
                            extractedAt: new Date().toISOString()
                        }
                    };
                });
            });
        },
        
        // Cancel extraction
        cancelExtraction: function(extractionId) {
            if (activeExtractions.has(extractionId)) {
                activeExtractions.delete(extractionId);
                console.log('Extraction cancelled:', extractionId);
                return { success: true };
            }
            
            return { success: false, error: 'Extraction not found' };
        },
        
        // Get active extractions
        getActiveExtractions: function() {
            var active = [];
            activeExtractions.forEach(function(task, id) {
                active.push({
                    id: id,
                    type: task.type,
                    startedAt: task.queuedAt
                });
            });
            return active;
        },
        
        // Get queue status
        getQueueStatus: function() {
            return {
                queueLength: extractionQueue.length,
                isProcessing: isProcessingQueue,
                activeExtractions: activeExtractions.size,
                queue: extractionQueue.map(function(task) {
                    return {
                        type: task.type,
                        queuedAt: task.queuedAt
                    };
                })
            };
        },
        
        // Clear queue
        clearQueue: function() {
            var cleared = extractionQueue.length;
            extractionQueue = [];
            console.log('Extraction queue cleared:', cleared, 'tasks');
            return { success: true, cleared: cleared };
        },
        
        // Get extraction results from storage
        getExtractionResults: function(tabId) {
            return StorageManager.loadAnalysisResults().then(function(results) {
                if (tabId) {
                    // Filter by tab if needed
                    var tabState = StateManager.getTabState(tabId);
                    if (tabState) {
                        return {
                            success: true,
                            data: {
                                text: tabState.extractedText || {},
                                tables: tabState.extractedTables || [],
                                images: results.images || []
                            }
                        };
                    }
                }
                
                return {
                    success: true,
                    data: {
                        text: results.texts || {},
                        tables: results.tables || [],
                        images: results.images || []
                    }
                };
            });
        },
        
        // Export extraction results
        exportResults: function(tabId, format) {
            format = format || 'json';
            
            return this.getExtractionResults(tabId).then(function(result) {
                if (!result.success) {
                    throw new Error('Failed to get extraction results');
                }
                
                var exportData = {
                    version: '2.0',
                    exportedAt: new Date().toISOString(),
                    tabId: tabId,
                    data: result.data
                };
                
                if (format === 'json') {
                    return {
                        success: true,
                        data: JSON.stringify(exportData, null, 2),
                        mimeType: 'application/json',
                        filename: 'extraction_' + Date.now() + '.json'
                    };
                }
                
                // Add other formats as needed
                throw new Error('Unsupported export format: ' + format);
            });
        }
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.ExtractionHandler = ExtractionHandler;
}
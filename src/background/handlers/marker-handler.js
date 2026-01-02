// ================================
// src/background/handlers/marker-handler.js
// Handles image marker operations
// ================================

var MarkerHandler = (function() {
    'use strict';
    
    // Private methods
    function getImportanceLevel(score) {
        if (score >= 0.7) return 'high';
        if (score >= 0.4) return 'recommended';
        return 'low';
    }
    
    function createImageData(imageData, tabId) {
        return {
            id: imageData.id || BackgroundTypes.generateId('img'),
            src: imageData.src,
            type: imageData.type || 'image',
            alt: imageData.alt || '',
            title: imageData.title || '',
            dimensions: imageData.dimensions || { width: 0, height: 0 },
            context: imageData.context || {},
            intelligence: imageData.intelligence || {
                score: imageData.score || 0.5,
                level: getImportanceLevel(imageData.score || 0.5)
            },
            addedFrom: 'marker',
            addedAt: Date.now(),
            tabId: tabId
        };
    }
    
    function notifyContentScript(tabId, action, data) {
        if (!tabId) return Promise.resolve();
        
        return new Promise(function(resolve) {
            chrome.tabs.sendMessage(tabId, {
                action: action,
                data: data
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.log('Content script not available:', chrome.runtime.lastError.message);
                    resolve({ success: false });
                } else {
                    resolve(response || { success: true });
                }
            });
        });
    }
    
    function notifyPopup(action, data) {
        chrome.runtime.sendMessage({
            action: action,
            data: data
        }).catch(function() {
            // Popup not open, ignore
        });
    }
    
    // Public API
    return {
        // Add image from marker
        addMarkerImage: function(imageData, tabId) {
            console.log('Adding marker image from tab:', tabId);
            
            if (!imageData) {
                return Promise.resolve({
                    success: false,
                    error: 'No image data provided'
                });
            }
            
            // Create properly formatted image data
            var imageToStore = createImageData(imageData, tabId);
            
            // Store the image
            return StorageManager.addMarkerImage(imageToStore).then(function(result) {
                console.log('Marker image stored:', result);
                
                // Notify popup if open
                notifyPopup('MARKER_IMAGE_ADDED', {
                    data: imageToStore,
                    tabId: tabId,
                    totalImages: result.imageCount
                });
                
                return {
                    success: true,
                    imageCount: result.imageCount,
                    imageId: imageToStore.id
                };
            }).catch(function(error) {
                console.error('Failed to add marker image:', error);
                return {
                    success: false,
                    error: error.message
                };
            });
        },
        
        // Remove image from analyzer
        removeMarkerImage: function(imageId, tabId) {
            console.log('Removing marker image:', imageId);
            
            if (!imageId) {
                return Promise.resolve({
                    success: false,
                    error: 'No image ID provided'
                });
            }
            
            return StorageManager.removeMarkerImage(imageId).then(function(removed) {
                if (removed) {
                    // Notify content script to show marker again
                    if (tabId) {
                        notifyContentScript(tabId, 'IMAGE_REMOVED_FROM_ANALYZER', {
                            imageId: imageId
                        });
                    }
                    
                    // Notify popup
                    notifyPopup('IMAGE_REMOVED_FROM_ANALYZER', {
                        imageId: imageId,
                        tabId: tabId
                    });
                    
                    console.log('Image removed successfully');
                    return { success: true };
                }
                
                return { success: false, error: 'Image not found' };
            }).catch(function(error) {
                console.error('Failed to remove image:', error);
                return { success: false, error: error.message };
            });
        },
        
        // Activate markers on page
        activateMarkers: function(tabId) {
            console.log('Activating markers for tab:', tabId);
            
            if (!tabId) {
                return Promise.resolve({
                    success: false,
                    error: BackgroundTypes.ERROR_MESSAGES.NO_TAB_ID
                });
            }
            
            // Verify tab exists
            return new Promise(function(resolve) {
                chrome.tabs.get(tabId, function(tab) {
                    if (chrome.runtime.lastError) {
                        resolve({
                            success: false,
                            error: BackgroundTypes.ERROR_MESSAGES.TAB_NOT_FOUND
                        });
                        return;
                    }
                    
                    if (!BackgroundTypes.isValidTab(tab)) {
                        resolve({
                            success: false,
                            error: BackgroundTypes.ERROR_MESSAGES.INVALID_URL
                        });
                        return;
                    }
                    
                    // Inject content script
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: ['src/content/content-script.js']
                    }, function() {
                        var injectionError = chrome.runtime.lastError;
                        
                        // Wait for initialization
                        setTimeout(function() {
                            // Send activation message
                            chrome.tabs.sendMessage(tabId, {
                                action: 'ACTIVATE_MARKERS',
                                config: BackgroundTypes.DEFAULT_CONFIGS.MARKER_CONFIG
                            }, function(response) {
                                if (chrome.runtime.lastError) {
                                    // Try fallback execution
                                    tryFallbackActivation(tabId, resolve);
                                } else if (response && response.success) {
                                    console.log('Markers activated:', response.markerCount);
                                    resolve(response);
                                } else {
                                    resolve({
                                        success: false,
                                        error: response ? response.error : 'Activation failed'
                                    });
                                }
                            });
                        }, injectionError ? 200 : 100);
                    });
                });
            });
            
            function tryFallbackActivation(tabId, resolve) {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: function() {
                        if (typeof window.orkgContentScript !== 'undefined') {
                            return window.orkgContentScript.activateMarkers({
                                types: ['image'],
                                minScore: 0.3,
                                autoActivate: true
                            });
                        } else {
                            return {
                                success: false,
                                error: 'Content script not initialized'
                            };
                        }
                    }
                }, function(results) {
                    if (chrome.runtime.lastError) {
                        resolve({
                            success: false,
                            error: BackgroundTypes.ERROR_MESSAGES.CONTENT_SCRIPT_FAILED
                        });
                    } else if (results && results[0] && results[0].result) {
                        resolve(results[0].result);
                    } else {
                        resolve({
                            success: false,
                            error: 'Could not activate markers'
                        });
                    }
                });
            }
        },
        
        // Get analyzer state (images, tables, texts)
        getAnalyzerState: function(tabId) {
            return StorageManager.loadAnalysisResults().then(function(results) {
                var markerImages = results.markerImages || [];
                var tables = results.tables || [];
                var texts = results.texts || [];
                var highlights = results.textHighlights || [];
                
                // Filter by tab if specified
                if (tabId) {
                    markerImages = markerImages.filter(function(img) {
                        return img.tabId === tabId;
                    });
                    
                    highlights = highlights.filter(function(h) {
                        return h.tabId === tabId;
                    });
                }
                
                return {
                    success: true,
                    state: {
                        images: markerImages,
                        tables: tables,
                        texts: texts,
                        highlights: highlights
                    }
                };
            }).catch(function(error) {
                console.error('Failed to get analyzer state:', error);
                return {
                    success: false,
                    error: error.message,
                    state: {
                        images: [],
                        tables: [],
                        texts: [],
                        highlights: []
                    }
                };
            });
        },
        
        // Update marker state
        updateMarkerState: function(tabId, markerId, updates) {
            return StorageManager.loadAnalysisResults().then(function(results) {
                if (!results.markerImages) {
                    return { success: false, error: 'No marker images found' };
                }
                
                var marker = results.markerImages.find(function(img) {
                    return img.id === markerId && img.tabId === tabId;
                });
                
                if (!marker) {
                    return { success: false, error: 'Marker not found' };
                }
                
                // Update marker properties
                Object.keys(updates).forEach(function(key) {
                    marker[key] = updates[key];
                });
                
                marker.updatedAt = Date.now();
                
                return StorageManager.saveAnalysisResults(results).then(function() {
                    // Notify content script
                    notifyContentScript(tabId, 'MARKER_UPDATED', {
                        markerId: markerId,
                        updates: updates
                    });
                    
                    return { success: true, marker: marker };
                });
            });
        },
        
        // Get marker statistics
        getStatistics: function(tabId) {
            return StorageManager.loadAnalysisResults().then(function(results) {
                var markerImages = results.markerImages || [];
                
                if (tabId) {
                    markerImages = markerImages.filter(function(img) {
                        return img.tabId === tabId;
                    });
                }
                
                var stats = {
                    total: markerImages.length,
                    byType: {},
                    byImportance: {
                        high: 0,
                        recommended: 0,
                        low: 0
                    },
                    withCaptions: 0,
                    averageScore: 0
                };
                
                var totalScore = 0;
                
                markerImages.forEach(function(img) {
                    // By type
                    stats.byType[img.type] = (stats.byType[img.type] || 0) + 1;
                    
                    // By importance
                    if (img.intelligence && img.intelligence.level) {
                        stats.byImportance[img.intelligence.level]++;
                    }
                    
                    // With captions
                    if (img.context && img.context.caption) {
                        stats.withCaptions++;
                    }
                    
                    // Score
                    if (img.intelligence && img.intelligence.score) {
                        totalScore += img.intelligence.score;
                    }
                });
                
                if (markerImages.length > 0) {
                    stats.averageScore = totalScore / markerImages.length;
                }
                
                return stats;
            });
        },
        
        // Clear all markers for a tab
        clearTabMarkers: function(tabId) {
            return StorageManager.loadAnalysisResults().then(function(results) {
                if (!results.markerImages) {
                    return { success: true, removed: 0 };
                }
                
                var originalLength = results.markerImages.length;
                results.markerImages = results.markerImages.filter(function(img) {
                    return img.tabId !== tabId;
                });
                
                var removed = originalLength - results.markerImages.length;
                
                if (removed > 0) {
                    return StorageManager.saveAnalysisResults(results).then(function() {
                        // Notify content script
                        notifyContentScript(tabId, 'CLEAR_MARKERS', {});
                        
                        return { success: true, removed: removed };
                    });
                }
                
                return { success: true, removed: 0 };
            });
        },
        
        // Export marker images
        exportMarkerImages: function(tabId) {
            return this.getAnalyzerState(tabId).then(function(result) {
                if (!result.success) {
                    return { success: false, error: result.error };
                }
                
                var exportData = {
                    version: '2.0',
                    exportedAt: new Date().toISOString(),
                    tabId: tabId,
                    images: result.state.images,
                    statistics: {
                        total: result.state.images.length,
                        types: {}
                    }
                };
                
                // Calculate statistics
                result.state.images.forEach(function(img) {
                    exportData.statistics.types[img.type] = 
                        (exportData.statistics.types[img.type] || 0) + 1;
                });
                
                return {
                    success: true,
                    data: exportData
                };
            });
        }
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.MarkerHandler = MarkerHandler;
}
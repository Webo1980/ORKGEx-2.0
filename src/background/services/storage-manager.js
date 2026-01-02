// ================================
// src/background/services/storage-manager.js
// Centralized storage operations for the extension
// ================================

var StorageManager = (function() {
    'use strict';
    
    // Private variables
    var cache = new Map();
    var cacheTimeout = 5 * 60 * 1000; // 5 minutes
    var pendingOperations = new Map();
    
    // Helper function to handle async chrome storage operations
    function chromeStorageOperation(operation, data) {
        return new Promise(function(resolve, reject) {
            try {
                var callback = function() {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve.apply(null, arguments);
                    }
                };
                
                if (data !== undefined) {
                    operation(data, callback);
                } else {
                    operation(callback);
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Get from cache if valid
    function getFromCache(key) {
        if (!cache.has(key)) {
            return null;
        }
        
        var cached = cache.get(key);
        if (Date.now() - cached.timestamp > cacheTimeout) {
            cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    // Set cache with timestamp
    function setCache(key, data) {
        cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
    
    // Clear expired cache entries
    function clearExpiredCache() {
        var now = Date.now();
        var expired = [];
        
        cache.forEach(function(value, key) {
            if (now - value.timestamp > cacheTimeout) {
                expired.push(key);
            }
        });
        
        expired.forEach(function(key) {
            cache.delete(key);
        });
        
        return expired.length;
    }
    
    // Batch storage operations for efficiency
    function batchOperation(key, operation) {
        if (pendingOperations.has(key)) {
            return pendingOperations.get(key);
        }
        
        var promise = operation().finally(function() {
            pendingOperations.delete(key);
        });
        
        pendingOperations.set(key, promise);
        return promise;
    }
    
    // Public API
    return {
        // Initialize storage manager
        init: function() {
            // Set up periodic cache cleanup
            setInterval(clearExpiredCache, 60 * 1000); // Every minute
            console.log('StorageManager initialized');
        },
        
        // Workflow state operations
        saveWorkflowState: function(tabId, data) {
            if (!tabId) {
                return Promise.reject(new Error('No tab ID provided'));
            }
            
            var key = BackgroundTypes.STORAGE_KEYS.WORKFLOW_STATE_PREFIX + tabId;
            var storageData = {};
            storageData[key] = data;
            
            // Update cache
            setCache(key, data);
            
            return chromeStorageOperation(
                chrome.storage.local.set.bind(chrome.storage.local),
                storageData
            );
        },
        
        loadWorkflowState: function(tabId) {
            if (!tabId) {
                return Promise.reject(new Error('No tab ID provided'));
            }
            
            var key = BackgroundTypes.STORAGE_KEYS.WORKFLOW_STATE_PREFIX + tabId;
            
            // Check cache first
            var cached = getFromCache(key);
            if (cached) {
                return Promise.resolve(cached);
            }
            
            return batchOperation(key, function() {
                return chromeStorageOperation(
                    chrome.storage.local.get.bind(chrome.storage.local),
                    key
                ).then(function(result) {
                    var data = result[key] || null;
                    if (data) {
                        setCache(key, data);
                    }
                    return data;
                });
            });
        },
        
        clearWorkflowState: function(tabId) {
            if (!tabId) {
                return Promise.reject(new Error('No tab ID provided'));
            }
            
            var key = BackgroundTypes.STORAGE_KEYS.WORKFLOW_STATE_PREFIX + tabId;
            cache.delete(key);
            
            return chromeStorageOperation(
                chrome.storage.local.remove.bind(chrome.storage.local),
                key
            );
        },
        
        // Analysis results operations
        saveAnalysisResults: function(results) {
            var data = {};
            data[BackgroundTypes.STORAGE_KEYS.ANALYSIS_RESULTS] = results;
            data[BackgroundTypes.STORAGE_KEYS.ANALYSIS_TIMESTAMP] = Date.now();
            
            // Update cache
            setCache(BackgroundTypes.STORAGE_KEYS.ANALYSIS_RESULTS, results);
            
            return chromeStorageOperation(
                chrome.storage.local.set.bind(chrome.storage.local),
                data
            );
        },
        
        loadAnalysisResults: function() {
            // Check cache first
            var cached = getFromCache(BackgroundTypes.STORAGE_KEYS.ANALYSIS_RESULTS);
            if (cached) {
                return Promise.resolve(cached);
            }
            
            return chromeStorageOperation(
                chrome.storage.local.get.bind(chrome.storage.local),
                BackgroundTypes.STORAGE_KEYS.ANALYSIS_RESULTS
            ).then(function(result) {
                var data = result[BackgroundTypes.STORAGE_KEYS.ANALYSIS_RESULTS] || 
                          BackgroundTypes.createAnalysisResults();
                setCache(BackgroundTypes.STORAGE_KEYS.ANALYSIS_RESULTS, data);
                return data;
            });
        },
        
        updateAnalysisResults: function(updates) {
            var self = this;
            return this.loadAnalysisResults().then(function(results) {
                Object.keys(updates).forEach(function(key) {
                    if (results.hasOwnProperty(key)) {
                        results[key] = updates[key];
                    }
                });
                return self.saveAnalysisResults(results);
            });
        },
        
        // Marker images operations
        addMarkerImage: function(imageData) {
            var self = this;
            return this.loadAnalysisResults().then(function(results) {
                if (!results.markerImages) {
                    results.markerImages = [];
                }
                
                // Check for duplicate
                var existingIndex = results.markerImages.findIndex(function(img) {
                    return img.id === imageData.id;
                });
                
                if (existingIndex === -1) {
                    results.markerImages.push(imageData);
                } else {
                    results.markerImages[existingIndex] = imageData;
                }
                
                return self.saveAnalysisResults(results).then(function() {
                    return {
                        imageCount: results.markerImages.length,
                        imageId: imageData.id
                    };
                });
            });
        },
        
        removeMarkerImage: function(imageId) {
            var self = this;
            return this.loadAnalysisResults().then(function(results) {
                if (!results.markerImages) {
                    return false;
                }
                
                var originalLength = results.markerImages.length;
                results.markerImages = results.markerImages.filter(function(img) {
                    return img.id !== imageId;
                });
                
                if (results.markerImages.length < originalLength) {
                    return self.saveAnalysisResults(results).then(function() {
                        return true;
                    });
                }
                
                return false;
            });
        },
        
        // Text highlights operations
        saveHighlight: function(highlightData) {
            var self = this;
            
            return Promise.all([
                chromeStorageOperation(
                    chrome.storage.local.get.bind(chrome.storage.local),
                    BackgroundTypes.STORAGE_KEYS.TEXT_HIGHLIGHTS
                ),
                this.loadAnalysisResults()
            ]).then(function(results) {
                var textHighlights = results[0][BackgroundTypes.STORAGE_KEYS.TEXT_HIGHLIGHTS] || [];
                var analysisResults = results[1];
                
                // Add to text highlights
                textHighlights.push(highlightData);
                
                // Keep only last 1000 highlights
                if (textHighlights.length > 1000) {
                    textHighlights = textHighlights.slice(-1000);
                }
                
                // Also add to analysis results
                if (!analysisResults.textHighlights) {
                    analysisResults.textHighlights = [];
                }
                analysisResults.textHighlights.push(highlightData);
                
                // Save both
                var data = {};
                data[BackgroundTypes.STORAGE_KEYS.TEXT_HIGHLIGHTS] = textHighlights;
                
                return Promise.all([
                    chromeStorageOperation(
                        chrome.storage.local.set.bind(chrome.storage.local),
                        data
                    ),
                    self.saveAnalysisResults(analysisResults)
                ]).then(function() {
                    return highlightData;
                });
            });
        },
        
        loadHighlights: function(tabId) {
            return Promise.all([
                chromeStorageOperation(
                    chrome.storage.local.get.bind(chrome.storage.local),
                    BackgroundTypes.STORAGE_KEYS.TEXT_HIGHLIGHTS
                ),
                this.loadAnalysisResults()
            ]).then(function(results) {
                var textHighlights = results[0][BackgroundTypes.STORAGE_KEYS.TEXT_HIGHLIGHTS] || [];
                var analysisHighlights = results[1].textHighlights || [];
                
                // Combine and deduplicate
                var allHighlights = textHighlights.concat(analysisHighlights);
                var uniqueHighlights = [];
                var seenIds = new Set();
                
                allHighlights.forEach(function(highlight) {
                    if (highlight.id && !seenIds.has(highlight.id)) {
                        seenIds.add(highlight.id);
                        uniqueHighlights.push(highlight);
                    }
                });
                
                // Filter by tab if specified
                if (tabId) {
                    uniqueHighlights = uniqueHighlights.filter(function(h) {
                        return h.tabId === tabId;
                    });
                }
                
                return uniqueHighlights;
            });
        },
        
        // Settings operations
        saveSettings: function(settings) {
            var data = {};
            data[BackgroundTypes.STORAGE_KEYS.ORKG_SETTINGS] = settings;
            
            setCache(BackgroundTypes.STORAGE_KEYS.ORKG_SETTINGS, settings);
            
            return chromeStorageOperation(
                chrome.storage.local.set.bind(chrome.storage.local),
                data
            );
        },
        
        loadSettings: function() {
            // Check cache first
            var cached = getFromCache(BackgroundTypes.STORAGE_KEYS.ORKG_SETTINGS);
            if (cached) {
                return Promise.resolve(cached);
            }
            
            return chromeStorageOperation(
                chrome.storage.local.get.bind(chrome.storage.local),
                BackgroundTypes.STORAGE_KEYS.ORKG_SETTINGS
            ).then(function(result) {
                var settings = result[BackgroundTypes.STORAGE_KEYS.ORKG_SETTINGS] || {
                    theme: 'light',
                    autoSave: true,
                    persistWindow: true
                };
                setCache(BackgroundTypes.STORAGE_KEYS.ORKG_SETTINGS, settings);
                return settings;
            });
        },
        
        // General storage operations
        get: function(keys) {
            return chromeStorageOperation(
                chrome.storage.local.get.bind(chrome.storage.local),
                keys
            );
        },
        
        set: function(data) {
            // Update cache for known keys
            Object.keys(data).forEach(function(key) {
                setCache(key, data[key]);
            });
            
            return chromeStorageOperation(
                chrome.storage.local.set.bind(chrome.storage.local),
                data
            );
        },
        
        remove: function(keys) {
            // Clear from cache
            if (Array.isArray(keys)) {
                keys.forEach(function(key) {
                    cache.delete(key);
                });
            } else {
                cache.delete(keys);
            }
            
            return chromeStorageOperation(
                chrome.storage.local.remove.bind(chrome.storage.local),
                keys
            );
        },
        
        clear: function() {
            cache.clear();
            return chromeStorageOperation(
                chrome.storage.local.clear.bind(chrome.storage.local)
            );
        },
        
        // Cleanup operations
        cleanupTabData: function(tabId) {
            var self = this;
            var promises = [];
            
            // Clear workflow state
            promises.push(this.clearWorkflowState(tabId));
            
            // Remove tab-specific data from analysis results
            promises.push(
                this.loadAnalysisResults().then(function(results) {
                    var modified = false;
                    
                    // Filter marker images
                    if (results.markerImages) {
                        var originalLength = results.markerImages.length;
                        results.markerImages = results.markerImages.filter(function(img) {
                            return img.tabId !== tabId;
                        });
                        modified = results.markerImages.length < originalLength;
                    }
                    
                    // Filter text highlights
                    if (results.textHighlights) {
                        var originalHighlights = results.textHighlights.length;
                        results.textHighlights = results.textHighlights.filter(function(h) {
                            return h.tabId !== tabId;
                        });
                        modified = modified || results.textHighlights.length < originalHighlights;
                    }
                    
                    if (modified) {
                        return self.saveAnalysisResults(results);
                    }
                })
            );
            
            return Promise.all(promises);
        },
        
        // Cache management
        clearCache: function() {
            cache.clear();
            console.log('Storage cache cleared');
        },
        
        getCacheSize: function() {
            return cache.size;
        },
        
        clearExpiredCache: clearExpiredCache,
        
        // Debug methods
        getDebugInfo: function() {
            return {
                cacheSize: cache.size,
                pendingOperations: pendingOperations.size,
                cacheKeys: Array.from(cache.keys())
            };
        }
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.StorageManager = StorageManager;
}
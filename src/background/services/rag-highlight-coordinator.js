// ================================
// src/background/services/rag-highlight-coordinator.js
// ================================

/**
 * RAG Highlight Coordinator Service
 * 
 * This service coordinates the highlighting process between the RAG Handler
 * and the content script. It processes RAG results and prepares them for
 * highlighting in the DOM.
 * Complete implementation with smart color management
 *  
 * Note: Uses IIFE pattern without ES6 module syntax for compatibility
 */

var RAGHighlightCoordinatorService = (function() {
    'use strict';
    
    // ================================
    // Private State
    // ================================
    
    var activeTabId = null;
    var highlightedItems = new Map();
    var pendingHighlights = new Map();
    var completedHighlights = new Set();
    var isProcessing = false;
    
    // Color management for current session
    var colorManager = {
        usedColors: new Set(),
        propertyColorMap: new Map(),
        availableColors: [
            '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
            '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3',
            '#87CEEB', '#FFA07A', '#FFEFD5', '#F0FFF0',
            '#FFDEAD', '#E0FFFF', '#F0F8FF', '#FAF0E6',
            '#FFF0F5', '#F5FFFA', '#FFF5EE', '#F0FFFF',
            '#FFFACD', '#FFE4E1', '#FFEBCD', '#FAEBD7',
            '#F5F5DC', '#FDF5E6', '#FFFAF0', '#FFF8DC',
            '#FAFAD2', '#EEE8AA', '#F0E68C', '#BDB76B'
        ],
        colorIndex: 0
    };
    
    // Configuration
    var config = {
        minConfidence: 0.0,
        maxBatchSize: 20,
        highlightDelay: 300,
        enableLogging: true,
        autoAssignColors: true
    };
    
    // ================================
    // Color Management Functions
    // ================================
    
    /**
     * Get or assign a unique color for a property
     * @param {string} propertyId - Property identifier
     * @param {string} propertyLabel - Property label
     * @returns {string} Hex color code
     */
    function getOrAssignPropertyColor(propertyId, propertyLabel) {
        var key = propertyId || propertyLabel || 'unknown';
        
        // Check if color already assigned for this property
        if (colorManager.propertyColorMap.has(key)) {
            return colorManager.propertyColorMap.get(key);
        }
        
        // Get next available color
        var color = getNextAvailableColor();
        
        // Store the assignment
        colorManager.propertyColorMap.set(key, color);
        colorManager.usedColors.add(color);
        
        logDebug('Assigned color ' + color + ' to property: ' + key);
        
        return color;
    }
    
    /**
     * Get next available color from the palette
     * @returns {string} Hex color code
     */
    function getNextAvailableColor() {
        // Try to find unused color from palette
        for (var i = 0; i < colorManager.availableColors.length; i++) {
            var color = colorManager.availableColors[i];
            if (!colorManager.usedColors.has(color)) {
                return color;
            }
        }
        
        // If all colors used, cycle through with modifications
        var baseColor = colorManager.availableColors[colorManager.colorIndex % colorManager.availableColors.length];
        colorManager.colorIndex++;
        
        // Modify the color slightly to create variation
        return modifyColor(baseColor, colorManager.colorIndex);
    }
    
    /**
     * Modify a color to create variation
     * @param {string} baseColor - Base hex color
     * @param {number} variation - Variation factor
     * @returns {string} Modified hex color
     */
    function modifyColor(baseColor, variation) {
        // Parse hex color
        var r = parseInt(baseColor.slice(1, 3), 16);
        var g = parseInt(baseColor.slice(3, 5), 16);
        var b = parseInt(baseColor.slice(5, 7), 16);
        
        // Apply slight modification based on variation
        var modifier = ((variation % 3) - 1) * 10;
        
        r = Math.max(200, Math.min(255, r + modifier));
        g = Math.max(200, Math.min(255, g + modifier));
        b = Math.max(200, Math.min(255, b + modifier));
        
        return '#' + [r, g, b].map(function(x) {
            return x.toString(16).padStart(2, '0');
        }).join('');
    }
    
    /**
     * Reset color assignments for a new session
     */
    function resetColorAssignments() {
        colorManager.usedColors.clear();
        colorManager.propertyColorMap.clear();
        colorManager.colorIndex = 0;
        logDebug('Color assignments reset for new session');
    }
    
    // ================================
    // Main Processing Functions
    // ================================
    
    /**
     * Process RAG results for highlighting
     * @param {number} tabId - Tab identifier
     * @param {Object} ragResults - RAG analysis results
     * @param {Object} sections - Document sections (optional)
     * @returns {Promise} Processing result
     */
    function processResults(tabId, ragResults, sections) {
        return new Promise(function(resolve, reject) {
            if (!ragResults) {
                reject(new Error('Invalid RAG results'));
                return;
            }
            
            logInfo('Processing RAG results for highlighting in tab: ' + tabId);
            
            // Reset colors for new analysis session
            resetColorAssignments();
            
            activeTabId = tabId;
            
            try {
                var highlights = prepareHighlightsFromResults(ragResults, sections);
                
                pendingHighlights.set(tabId, highlights);
                
                logInfo('Prepared ' + highlights.length + ' highlights for tab ' + tabId);
                
                if (highlights.length > 0) {
                    sendHighlightsToContentScript(tabId, highlights)
                        .then(function(result) {
                            resolve({
                                success: true,
                                highlights: highlights,
                                sent: result.sent,
                                total: result.total,
                                tabId: tabId
                            });
                        })
                        .catch(function(error) {
                            logError('Error sending highlights to content script', error);
                            reject(error);
                        });
                } else {
                    logWarn('No highlights prepared from RAG results');
                    resolve({
                        success: true,
                        highlights: [],
                        sent: 0,
                        message: 'No valid highlights found in RAG results'
                    });
                }
                
            } catch (error) {
                logError('Error processing RAG results', error);
                reject(error);
            }
        });
    }
    
    /**
     * Prepare highlights from RAG results
     * @param {Object} ragResults - RAG analysis results
     * @param {Object} sections - Document sections (optional)
     * @returns {Array} Array of highlight objects
     */
    function prepareHighlightsFromResults(ragResults, sections) {
        var highlights = [];
        var statistics = {
            totalProperties: 0,
            totalValues: 0,
            skippedNoText: 0,
            skippedConfidence: 0,
            created: 0
        };
        
        logDebug('Processing properties from RAG results...');
        
        // Handle nested structure (results.results or direct results)
        var resultsToProcess = ragResults.results || ragResults;
        
        // Process each property
        for (var propertyId in resultsToProcess) {
            if (!resultsToProcess.hasOwnProperty(propertyId)) continue;
            
            var propertyResult = resultsToProcess[propertyId];
            
            // Validate property result
            if (!isValidPropertyResult(propertyResult)) {
                logDebug('Skipping invalid property: ' + propertyId);
                continue;
            }
            
            statistics.totalProperties++;
            
            // Get property metadata
            var propertyLabel = extractPropertyLabel(propertyResult);
            var propertyColor = getOrAssignPropertyColor(propertyId, propertyLabel);
            
            logDebug('Processing property "' + propertyLabel + '" with ' + propertyResult.values.length + ' values');
            
            // Process each value
            var propertyHighlights = processPropertyValues(
                propertyResult.values,
                propertyId,
                propertyLabel,
                propertyColor,
                statistics
            );
            
            highlights = highlights.concat(propertyHighlights);
        }
        
        // Log statistics
        logInfo('Highlight preparation complete:', statistics);
        
        return highlights;
    }
    
    /**
     * Process values for a single property
     * @param {Array} values - Property values
     * @param {string} propertyId - Property identifier
     * @param {string} propertyLabel - Property label
     * @param {string} propertyColor - Assigned color
     * @param {Object} statistics - Statistics object to update
     * @returns {Array} Array of highlight objects
     */
    function processPropertyValues(values, propertyId, propertyLabel, propertyColor, statistics) {
        var propertyHighlights = [];
        
        values.forEach(function(value, index) {
            statistics.totalValues++;
            
            // Extract text content
            var textContent = extractTextContent(value);
            if (!textContent) {
                statistics.skippedNoText++;
                logDebug('Skipping value ' + index + ': no text content');
                return;
            }
            
            // Check confidence if threshold is set
            var confidence = extractConfidence(value);
            if (config.minConfidence > 0 && confidence < config.minConfidence) {
                statistics.skippedConfidence++;
                logDebug('Skipping value ' + index + ': confidence too low');
                return;
            }
            
            // Create highlight object
            var highlight = createHighlightObject(
                value,
                textContent,
                propertyId,
                propertyLabel,
                propertyColor,
                confidence,
                index
            );
            
            propertyHighlights.push(highlight);
            highlightedItems.set(highlight.id, highlight);
            statistics.created++;
            
            logDebug('Created highlight for: "' + textContent.substring(0, 50) + '..."');
        });
        
        return propertyHighlights;
    }
    
    /**
     * Create a highlight object from value data
     * @param {Object} value - Value data
     * @param {string} textContent - Extracted text
     * @param {string} propertyId - Property identifier
     * @param {string} propertyLabel - Property label
     * @param {string} propertyColor - Assigned color
     * @param {number} confidence - Confidence score
     * @param {number} index - Value index
     * @returns {Object} Highlight object
     */
    function createHighlightObject(value, textContent, propertyId, propertyLabel, propertyColor, confidence, index) {
        return {
            id: value.id || generateHighlightId(propertyId, index),
            propertyId: propertyId,
            propertyLabel: propertyLabel,
            sentence: textContent,
            text: textContent,
            section: extractSection(value),
            sentenceIndex: extractSentenceIndex(value),
            confidence: confidence,
            color: value.highlight?.color || propertyColor,
            timestamp: Date.now(),
            source: 'rag',
            evidence: value.evidence || null,
            metadata: value.metadata || {},
            location: value.location || null
        };
    }
    
    // ================================
    // Data Extraction Utilities
    // ================================
    
    /**
     * Validate property result object
     */
    function isValidPropertyResult(propertyResult) {
        return propertyResult && 
               typeof propertyResult === 'object' && 
               Array.isArray(propertyResult.values) &&
               propertyResult.values.length > 0;
    }
    
    /**
     * Extract property label from result
     */
    function extractPropertyLabel(propertyResult) {
        return propertyResult.property || 
               propertyResult.property_label || 
               propertyResult.label ||
               'Unknown Property';
    }
    
    /**
     * Extract text content from value
     */
    function extractTextContent(value) {
        return value.sentence || 
               value.text || 
               value.value || 
               value.content || 
               '';
    }
    
    /**
     * Extract confidence score from value
     */
    function extractConfidence(value) {
        if (value.confidence !== undefined) return value.confidence;
        if (value.score !== undefined) return value.score;
        return 1.0; // Default confidence if not specified
    }
    
    /**
     * Extract section from value
     */
    function extractSection(value) {
        return value.section || 
               value.location?.section || 
               value.context?.section || 
               null;
    }
    
    /**
     * Extract sentence index from value
     */
    function extractSentenceIndex(value) {
        if (value.sentenceIndex !== undefined) return value.sentenceIndex;
        if (value.location?.sentenceIndex !== undefined) return value.location.sentenceIndex;
        if (value.index !== undefined) return value.index;
        return null;
    }
    
    /**
     * Generate unique highlight ID
     */
    function generateHighlightId(propertyId, index) {
        return 'highlight_' + propertyId + '_' + Date.now() + '_' + index;
    }
    
    // ================================
    // Highlight Sending Functions
    // ================================
    
    /**
     * Send highlights to content script in batches
     * @param {number} tabId - Tab identifier
     * @param {Array} highlights - Highlights to send
     * @returns {Promise} Send result
     */
    function sendHighlightsToContentScript(tabId, highlights) {
        return new Promise(function(resolve, reject) {
            if (!highlights || highlights.length === 0) {
                resolve({ success: true, sent: 0, total: 0, message: 'No highlights to send' });
                return;
            }
            
            if (isProcessing) {
                logDebug('Another highlighting process in progress, queuing...');
                setTimeout(function() {
                    sendHighlightsToContentScript(tabId, highlights)
                        .then(resolve)
                        .catch(reject);
                }, 1000);
                return;
            }
            
            isProcessing = true;
            
            var batchProcessor = new BatchProcessor(tabId, highlights);
            batchProcessor.process()
                .then(function(result) {
                    isProcessing = false;
                    resolve(result);
                })
                .catch(function(error) {
                    isProcessing = false;
                    reject(error);
                });
        });
    }
    
    /**
     * Batch processor for sending highlights
     */
    function BatchProcessor(tabId, highlights) {
        this.tabId = tabId;
        this.highlights = highlights;
        this.batchSize = config.maxBatchSize;
        this.totalCount = highlights.length;
        this.sentCount = 0;
        this.failedCount = 0;
        this.currentIndex = 0;
    }
    
    BatchProcessor.prototype.process = function() {
        var self = this;
        
        return new Promise(function(resolve, reject) {
            logInfo('Starting batch processing of ' + self.totalCount + ' highlights');
            
            self.sendNextBatch(resolve, reject);
        });
    };
    
    BatchProcessor.prototype.sendNextBatch = function(resolve, reject) {
        var self = this;
        
        // Check if all highlights processed
        if (self.currentIndex >= self.totalCount) {
            logInfo('Batch processing complete: ' + self.sentCount + '/' + self.totalCount + ' sent');
            resolve({
                success: true,
                sent: self.sentCount,
                total: self.totalCount,
                failed: self.failedCount
            });
            return;
        }
        
        // Prepare batch
        var batchEnd = Math.min(self.currentIndex + self.batchSize, self.totalCount);
        var batch = self.highlights.slice(self.currentIndex, batchEnd);
        var batchNumber = Math.floor(self.currentIndex / self.batchSize) + 1;
        var totalBatches = Math.ceil(self.totalCount / self.batchSize);
        
        logDebug('Sending batch ' + batchNumber + '/' + totalBatches + ' (' + batch.length + ' items)');
        
        // Send batch to content script
        chrome.tabs.sendMessage(self.tabId, {
            action: 'APPLY_RAG_HIGHLIGHTS',
            highlights: batch,
            batchInfo: {
                batchNumber: batchNumber,
                totalBatches: totalBatches,
                isLastBatch: batchEnd >= self.totalCount
            }
        }, function(response) {
            if (chrome.runtime.lastError) {
                logError('Error sending batch ' + batchNumber, chrome.runtime.lastError);
                self.failedCount += batch.length;
                
                // Continue with next batch despite error
                self.currentIndex = batchEnd;
                setTimeout(function() {
                    self.sendNextBatch(resolve, reject);
                }, config.highlightDelay);
                return;
            }
            
            if (response && response.success) {
                self.sentCount += batch.length;
                
                // Mark highlights as completed
                batch.forEach(function(highlight) {
                    completedHighlights.add(highlight.id);
                });
                
                logDebug('Batch ' + batchNumber + ' sent successfully');
            } else {
                self.failedCount += batch.length;
                logWarn('Batch ' + batchNumber + ' failed: ' + (response?.error || 'Unknown error'));
            }
            
            // Process next batch
            self.currentIndex = batchEnd;
            setTimeout(function() {
                self.sendNextBatch(resolve, reject);
            }, config.highlightDelay);
        });
    };
    
    // ================================
    // Image Marker Functions
    // ================================
    
    /**
     * Activate image markers in content script
     * @param {number} tabId - Tab identifier
     * @param {Object} markerConfig - Marker configuration
     * @returns {Promise} Activation result
     */
    function activateImageMarkers(tabId, markerConfig) {
        return new Promise(function(resolve, reject) {
            logInfo('Activating image markers in tab: ' + tabId);
            
            chrome.tabs.sendMessage(tabId, {
                action: 'ACTIVATE_IMAGE_MARKERS',
                config: markerConfig || {}
            }, function(response) {
                if (chrome.runtime.lastError) {
                    logError('Error activating image markers', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                if (response && response.success) {
                    logInfo('Image markers activated: ' + response.count + ' markers created');
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Image marker activation failed'));
                }
            });
        });
    }
    
    // ================================
    // State Management Functions
    // ================================
    
    /**
     * Sync state with content script
     * @param {number} tabId - Tab identifier
     * @param {Object} state - State to sync
     * @returns {Promise} Sync result
     */
    function syncState(tabId, state) {
        return new Promise(function(resolve, reject) {
            logDebug('Syncing state with content script in tab: ' + tabId);
            
            chrome.tabs.sendMessage(tabId, {
                action: 'SYNC_EXTENSION_STATE',
                state: state || {
                    textHighlights: Array.from(highlightedItems.values()),
                    imageMarkers: [],
                    colorAssignments: Array.from(colorManager.propertyColorMap.entries())
                }
            }, function(response) {
                if (chrome.runtime.lastError) {
                    logError('Error syncing state', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                if (response && response.success) {
                    logDebug('State synced successfully');
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'State sync failed'));
                }
            });
        });
    }
    
    /**
     * Clear highlights for a tab
     * @param {number} tabId - Tab identifier
     * @returns {Promise} Clear result
     */
    function clearHighlights(tabId) {
        return new Promise(function(resolve, reject) {
            logInfo('Clearing highlights for tab: ' + tabId);
            
            // Clear stored highlights
            pendingHighlights.delete(tabId);
            
            // Filter out highlights for this tab
            var clearedCount = 0;
            var newHighlightedItems = new Map();
            
            highlightedItems.forEach(function(highlight, id) {
                if (highlight.tabId !== tabId) {
                    newHighlightedItems.set(id, highlight);
                } else {
                    clearedCount++;
                }
            });
            
            highlightedItems = newHighlightedItems;
            
            // Reset color assignments
            resetColorAssignments();
            
            // Send clear message to content script
            chrome.tabs.sendMessage(tabId, {
                action: 'CLEAR_RAG_HIGHLIGHTS'
            }, function(response) {
                if (chrome.runtime.lastError) {
                    // Tab might be closed
                    logWarn('Could not clear highlights in tab (tab might be closed)');
                    resolve({ success: true, cleared: clearedCount });
                    return;
                }
                
                logInfo('Cleared ' + clearedCount + ' highlights');
                resolve(response || { success: true, cleared: clearedCount });
            });
        });
    }
    
    // ================================
    // Configuration Functions
    // ================================
    
    /**
     * Update configuration
     * @param {Object} newConfig - New configuration values
     * @returns {Object} Updated configuration
     */
    function updateConfig(newConfig) {
        Object.keys(newConfig).forEach(function(key) {
            if (config.hasOwnProperty(key)) {
                config[key] = newConfig[key];
            }
        });
        
        logDebug('Configuration updated:', config);
        return config;
    }
    
    /**
     * Get current status
     * @returns {Object} Current service status
     */
    function getStatus() {
        return {
            activeTabId: activeTabId,
            highlightCount: highlightedItems.size,
            pendingHighlightCount: Array.from(pendingHighlights.values()).reduce(function(total, highlights) {
                return total + highlights.length;
            }, 0),
            completedHighlightCount: completedHighlights.size,
            isProcessing: isProcessing,
            colorAssignments: colorManager.propertyColorMap.size,
            usedColors: colorManager.usedColors.size,
            config: config
        };
    }
    
    // ================================
    // Logging Utilities
    // ================================
    
    function logInfo(message, data) {
        if (config.enableLogging) {
            console.log('📍 [RAG Coordinator] ' + message, data || '');
        }
    }
    
    function logDebug(message, data) {
        if (config.enableLogging) {
            console.log('🔍 [RAG Coordinator] ' + message, data || '');
        }
    }
    
    function logWarn(message, data) {
        console.warn('⚠️ [RAG Coordinator] ' + message, data || '');
    }
    
    function logError(message, error) {
        console.error('❌ [RAG Coordinator] ' + message, error || '');
    }
    
    // ================================
    // Message Handler
    // ================================
    
    /**
     * Handle messages from content script
     */
    function handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'RAG_HIGHLIGHTING_COMPLETE':
                logInfo('Highlighting complete in content script:', message.data);
                
                if (message.data && message.data.highlightIds) {
                    message.data.highlightIds.forEach(function(id) {
                        completedHighlights.add(id);
                    });
                }
                
                sendResponse({ success: true });
                return true;
                
            case 'GET_COLOR_FOR_PROPERTY':
                var color = getOrAssignPropertyColor(
                    message.propertyId,
                    message.propertyLabel
                );
                sendResponse({ success: true, color: color });
                return true;
                
            case 'RESET_COLOR_ASSIGNMENTS':
                resetColorAssignments();
                sendResponse({ success: true });
                return true;
                
            default:
                return false;
        }
    }
    
    // ================================
    // Initialization
    // ================================
    
    // Setup message listeners
    if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
            return handleMessage(message, sender, sendResponse);
        });
    }
    
    // ================================
    // Public API
    // ================================
    
    return {
        // Main functions
        processResults: processResults,
        activateImageMarkers: activateImageMarkers,
        syncState: syncState,
        clearHighlights: clearHighlights,
        updateConfig: updateConfig,
        getStatus: getStatus,
        
        // Color management
        resetColorAssignments: resetColorAssignments,
        getColorAssignments: function() { 
            return Array.from(colorManager.propertyColorMap.entries()); 
        },
        
        // Data access
        getHighlights: function() { 
            return Array.from(highlightedItems.values()); 
        },
        getCompletedHighlights: function() { 
            return Array.from(completedHighlights); 
        },
        getPendingHighlights: function(tabId) { 
            return pendingHighlights.get(tabId) || []; 
        }
    };
})();

// Export to global scope
if (typeof self !== 'undefined') {
    self.RAGHighlightCoordinatorService = RAGHighlightCoordinatorService;
}
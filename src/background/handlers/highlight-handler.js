// ================================
// src/background/handlers/highlight-handler.js
// Handles text highlighting operations
// ================================

var HighlightHandler = (function() {
    'use strict';
    
    // Private methods
    function getRandomColor() {
        var colors = BackgroundTypes.DEFAULT_CONFIGS.HIGHLIGHT_CONFIG.colors;
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    function createHighlightData(text, property, additionalData) {
        var highlight = BackgroundTypes.createHighlightData({
            id: BackgroundTypes.generateId('highlight'),
            text: text,
            property: property,
            color: property.color || getRandomColor(),
            timestamp: Date.now(),
            createdAt: new Date().toISOString()
        });
        
        // Merge additional data
        if (additionalData) {
            Object.keys(additionalData).forEach(function(key) {
                if (highlight.hasOwnProperty(key)) {
                    highlight[key] = additionalData[key];
                }
            });
        }
        
        return highlight;
    }
    
    function cleanProperty(property) {
        // Clean property for structured cloning (remove functions, etc.)
        try {
            return JSON.parse(JSON.stringify(property));
        } catch (error) {
            console.error('Failed to clean property:', error);
            return {
                id: property.id || 'unknown',
                label: property.label || 'Property',
                color: property.color || getRandomColor()
            };
        }
    }
    
    function sendHighlightToContentScript(tabId, highlight) {
        if (!tabId || !Number.isInteger(tabId)) {
            return Promise.reject(new Error('Invalid tab ID'));
        }
        
        return new Promise(function(resolve) {
            chrome.tabs.sendMessage(tabId, {
                action: 'APPLY_HIGHLIGHT',
                highlight: highlight
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.warn('Content script not ready:', chrome.runtime.lastError.message);
                    // Try to inject content script
                    injectContentScriptAndRetry(tabId, highlight).then(resolve).catch(function(error) {
                        console.error('Failed to apply highlight:', error);
                        resolve({ success: false, error: error.message });
                    });
                } else {
                    resolve(response || { success: true });
                }
            });
        });
    }
    
    function injectContentScriptAndRetry(tabId, highlight) {
        return new Promise(function(resolve, reject) {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['src/content/content-script.js']
            }, function() {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                
                // Wait a bit for initialization
                setTimeout(function() {
                    chrome.tabs.sendMessage(tabId, {
                        action: 'APPLY_HIGHLIGHT',
                        highlight: highlight
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response || { success: true });
                        }
                    });
                }, 100);
            });
        });
    }
    
    function notifyPopup(eventType, data) {
        chrome.runtime.sendMessage({
            action: eventType,
            data: data
        }).catch(function() {
            // Popup not open, ignore
        });
    }
    
    // Public API
    return {
        // Create highlight from selection
        createHighlight: function(request, senderTab) {
            var selectedText = request.selectedText || request.text;
            var property = request.property;
            
            if (!selectedText || !property) {
                return Promise.resolve({
                    success: false,
                    error: 'Missing text or property data'
                });
            }
            
            // Determine tab info
            var tabInfo = senderTab;
            if (!tabInfo || !tabInfo.id) {
                return new Promise(function(resolve) {
                    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                        if (tabs && tabs[0]) {
                            tabInfo = tabs[0];
                            continueHighlightCreation();
                        } else {
                            resolve({
                                success: false,
                                error: 'No active tab found'
                            });
                        }
                    });
                });
            } else {
                return continueHighlightCreation();
            }
            
            function continueHighlightCreation() {
                // Clean property for storage
                var cleanedProperty = cleanProperty(property);
                
                // Create highlight data
                var highlightData = createHighlightData(selectedText, cleanedProperty, {
                    url: tabInfo.url || '',
                    title: tabInfo.title || '',
                    tabId: tabInfo.id || null
                });
                
                // Store highlight
                return StorageManager.saveHighlight(highlightData).then(function() {
                    // Send to content script
                    if (tabInfo.id) {
                        sendHighlightToContentScript(tabInfo.id, highlightData).catch(function(error) {
                            console.warn('Failed to send highlight to content script:', error);
                        });
                    }
                    
                    // Notify popup
                    notifyPopup('HIGHLIGHT_ADDED', {
                        highlight: highlightData
                    });
                    
                    return {
                        success: true,
                        highlight: highlightData
                    };
                }).catch(function(error) {
                    console.error('Failed to save highlight:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                });
            }
        },
        
        // Handle property selection from context menu
        handlePropertySelection: function(data, tab) {
            var highlightData = createHighlightData(data.text, cleanProperty(data.property), {
                url: tab ? tab.url : '',
                title: tab ? tab.title : '',
                tabId: tab ? tab.id : null,
                timestamp: data.timestamp || Date.now()
            });
            
            return StorageManager.saveHighlight(highlightData).then(function() {
                notifyPopup('HIGHLIGHT_ADDED', {
                    highlight: highlightData
                });
                
                return { success: true };
            }).catch(function(error) {
                console.error('Failed to handle property selection:', error);
                return { success: false, error: error.message };
            });
        },
        
        // Handle quick action from context menu
        handleQuickAction: function(menuItemId, selectedText, tab) {
            var self = this;
            
            // Extract property ID from menu item ID
            var propertyId = menuItemId.replace(BackgroundTypes.CONTEXT_MENU_IDS.QUICK_PREFIX, '')
                                      .replace(BackgroundTypes.CONTEXT_MENU_IDS.QUICK_FALLBACK_PREFIX, 'P200');
            
            // Get property details
            return PropertyHandler.getPropertyById(propertyId).then(function(property) {
                if (!property) {
                    // Create fallback property
                    var fallbackLabels = ['Method', 'Result', 'Conclusion'];
                    var index = parseInt(propertyId.replace('P200', '')) || 0;
                    property = {
                        id: 'P200' + (index + 1),
                        label: fallbackLabels[index] || 'Property',
                        description: null,
                        color: PropertyHandler.generatePropertyColor(fallbackLabels[index] || 'Property')
                    };
                }
                
                // Create and store highlight
                var highlightData = createHighlightData(selectedText, property, {
                    url: tab.url,
                    title: tab.title,
                    tabId: tab.id
                });
                
                return StorageManager.saveHighlight(highlightData).then(function() {
                    // Send to content script
                    if (tab.id) {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'HIGHLIGHT_SELECTION',
                            selectedText: selectedText,
                            property: property,
                            timestamp: Date.now()
                        }).catch(function(error) {
                            console.warn('Failed to send highlight to content:', error);
                        });
                    }
                    
                    return { success: true };
                });
            }).catch(function(error) {
                console.error('Failed to handle quick action:', error);
                return { success: false, error: error.message };
            });
        },
        
        // Get highlights for a tab
        getHighlights: function(tabId) {
            return StorageManager.loadHighlights(tabId);
        },
        
        // Remove highlight
        removeHighlight: function(highlightId, tabId) {
            // This would need to be implemented in StorageManager
            // For now, we'll filter and re-save
            return StorageManager.loadHighlights().then(function(highlights) {
                var filtered = highlights.filter(function(h) {
                    return h.id !== highlightId;
                });
                
                // Re-save filtered highlights
                var data = {};
                data[BackgroundTypes.STORAGE_KEYS.TEXT_HIGHLIGHTS] = filtered;
                
                return StorageManager.set(data).then(function() {
                    // Notify content script
                    if (tabId) {
                        chrome.tabs.sendMessage(tabId, {
                            action: 'REMOVE_HIGHLIGHT',
                            highlightId: highlightId
                        }).catch(function() {
                            // Content script not available
                        });
                    }
                    
                    return { success: true };
                });
            });
        },
        
        // Clear all highlights for a tab
        clearTabHighlights: function(tabId) {
            return StorageManager.loadHighlights().then(function(highlights) {
                var filtered = highlights.filter(function(h) {
                    return h.tabId !== tabId;
                });
                
                var data = {};
                data[BackgroundTypes.STORAGE_KEYS.TEXT_HIGHLIGHTS] = filtered;
                
                return StorageManager.set(data).then(function() {
                    // Notify content script
                    if (tabId) {
                        chrome.tabs.sendMessage(tabId, {
                            action: 'CLEAR_HIGHLIGHTS'
                        }).catch(function() {
                            // Content script not available
                        });
                    }
                    
                    return { success: true, removed: highlights.length - filtered.length };
                });
            });
        },
        
        // Show property modal in content script
        showPropertyModal: function(tabId, selectedText, selectionContext) {
            return new Promise(function(resolve) {
                // Ensure content script is injected
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['src/content/content-script.js']
                }, function() {
                    if (chrome.runtime.lastError) {
                        resolve({
                            success: false,
                            error: chrome.runtime.lastError.message
                        });
                        return;
                    }
                    
                    // Wait for initialization
                    setTimeout(function() {
                        chrome.tabs.sendMessage(tabId, {
                            action: 'SHOW_PROPERTY_MODAL',
                            selectedText: selectedText,
                            selectionContext: selectionContext
                        }, function(response) {
                            if (chrome.runtime.lastError) {
                                resolve({
                                    success: false,
                                    error: chrome.runtime.lastError.message
                                });
                            } else {
                                resolve(response || { success: true });
                            }
                        });
                    }, 100);
                });
            });
        },
        
        // Utility methods
        getRandomColor: getRandomColor,
        
        // Get highlight statistics
        getStatistics: function(tabId) {
            return StorageManager.loadHighlights(tabId).then(function(highlights) {
                var stats = {
                    total: highlights.length,
                    byProperty: {},
                    byTab: {}
                };
                
                highlights.forEach(function(highlight) {
                    // By property
                    var propertyLabel = highlight.property ? highlight.property.label : 'Unknown';
                    stats.byProperty[propertyLabel] = (stats.byProperty[propertyLabel] || 0) + 1;
                    
                    // By tab
                    var tabKey = highlight.tabId || 'unknown';
                    stats.byTab[tabKey] = (stats.byTab[tabKey] || 0) + 1;
                });
                
                return stats;
            });
        }
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.HighlightHandler = HighlightHandler;
}
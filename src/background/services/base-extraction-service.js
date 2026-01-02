// ================================
// src/background/base-extraction-service.js
// Base extraction service for background script - IIFE pattern
// ================================

var BaseExtractionService = (function() {
    'use strict';
    
    // Private variables
    var currentTab = null;
    var isInitialized = false;
    var config = {
        timeout: 10000,
        useActiveTab: true,
        tabId: null
    };
    
    // Private methods
    function getCurrentTab() {
        return new Promise(function(resolve) {
            try {
                if (typeof chrome !== 'undefined' && chrome.tabs) {
                    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                        resolve(tabs[0] || null);  // ✅ Fixed: 'tabs' not 'tab'
                    });
                } else {
                    resolve({
                        id: 'current',
                        url: 'unknown',
                        title: 'Current Page'
                    });
                }
            } catch (error) {
                console.warn('Could not get current tab:', error);
                resolve(null);
            }
        });
    }
    
    function executeInTab(tabId, func, args) {
        return new Promise(function(resolve, reject) {
            if (!tabId) {
                reject(new Error('No tab ID available for extraction'));
                return;
            }
            
            try {
                if (typeof chrome !== 'undefined' && chrome.scripting) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: func,
                        args: args || []
                    }, function(results) {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(results && results[0] ? results[0].result : null);
                        }
                    });
                } else {
                    // Fallback for non-extension context
                    resolve(func.apply(null, args || []));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    function sendMessageToTab(tabId, message) {
        return new Promise(function(resolve, reject) {
            if (!tabId) {
                reject(new Error('No tab ID available for messaging'));
                return;
            }
            
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.sendMessage(tabId, message, function(response) {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            } else {
                reject(new Error('Chrome tabs API not available'));
            }
        });
    }
    
    function injectContentScript(tabId, scriptPath) {
        return new Promise(function(resolve, reject) {
            if (!tabId) {
                reject(new Error('No tab ID available for script injection'));
                return;
            }
            
            try {
                if (typeof chrome !== 'undefined' && chrome.scripting) {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: [scriptPath]
                    }, function() {
                        if (chrome.runtime.lastError) {
                            console.warn('Could not inject script:', chrome.runtime.lastError.message);
                            reject(chrome.runtime.lastError);
                        } else {
                            console.log('Injected script:', scriptPath);
                            resolve();
                        }
                    });
                } else {
                    reject(new Error('Chrome scripting API not available'));
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    function validateExtractionContext(tabId) {
        return executeInTab(tabId, function() {
            // Look for common research article indicators
            var indicators = [
                document.querySelector('meta[name="citation_title"]'),
                document.querySelector('meta[name="dc.title"]'),
                document.querySelector('[itemtype*="ScholarlyArticle"]'),
                document.querySelector('.article-content'),
                document.querySelector('#article'),
                document.querySelector('article'),
                document.title.toLowerCase().includes('article') ||
                document.title.toLowerCase().includes('paper')
            ];
            
            return indicators.some(function(indicator) {
                return !!indicator;
            });
        });
    }
    
    // Shared DOM utility functions to be executed in tab context
    var domUtilities = {
        isElementVisible: function(element) {
            var style = window.getComputedStyle(element);
            var rect = element.getBoundingClientRect();
            
            return style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   parseFloat(style.opacity) > 0 &&
                   rect.width > 0 && 
                   rect.height > 0;
        },
        
        isInViewport: function(element) {
            var rect = element.getBoundingClientRect();
            return rect.top < window.innerHeight && 
                   rect.bottom > 0 &&
                   rect.left < window.innerWidth && 
                   rect.right > 0;
        },
        
        getElementPosition: function(element) {
            var rect = element.getBoundingClientRect();
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
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
        },
        
        cleanText: function(text) {
            if (!text) return '';
            return text
                .replace(/\s+/g, ' ')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }
    };
    
    // Public API
    return {
        init: function(customConfig) {
            return new Promise(function(resolve, reject) {
                console.log('Initializing BaseExtractionService...');
                
                // Merge custom config
                if (customConfig) {
                    Object.keys(customConfig).forEach(function(key) {
                        config[key] = customConfig[key];
                    });
                }
                
                // Get current tab if using active tab
                if (config.useActiveTab) {
                    getCurrentTab().then(function(tab) {
                        currentTab = tab;
                        if (currentTab) {
                            config.tabId = currentTab.id;
                            console.log('Using tab:', currentTab.title, '(ID:', currentTab.id, ')');
                        }
                        isInitialized = true;
                        resolve();
                    }).catch(reject);
                } else {
                    isInitialized = true;
                    resolve();
                }
            });
        },
        
        getCurrentTab: getCurrentTab,
        executeInTab: executeInTab,
        sendMessageToTab: sendMessageToTab,
        injectContentScript: injectContentScript,
        validateExtractionContext: validateExtractionContext,
        
        // Expose DOM utilities for use in executeInTab
        getDOMUtilities: function() {
            return domUtilities;
        },
        
        // Get configuration
        getConfig: function() {
            return config;
        },
        
        // Get tab info
        getTabInfo: function() {
            return {
                id: config.tabId,
                url: currentTab ? currentTab.url : null,
                title: currentTab ? currentTab.title : null,
                isInitialized: isInitialized
            };
        },
        
        // Check if initialized
        isInitialized: function() {
            return isInitialized;
        },
        
        // Update tab ID
        setTabId: function(tabId) {
            config.tabId = tabId;
        },
        
        // Reset service
        reset: function() {
            currentTab = null;
            config.tabId = null;
            isInitialized = false;
        }
    };
})();

// Expose to global scope for service worker
if (typeof self !== 'undefined') {
    self.BaseExtractionService = BaseExtractionService;
} else if (typeof window !== 'undefined') {
    window.BaseExtractionService = BaseExtractionService;
}
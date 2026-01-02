// ================================
// src/background/services/text-extraction-service.js
// Text extraction service for background script - Fixed for CSP
// ================================

var TextExtractionService = (function() {
    'use strict';
    
    // Private configuration
    var config = {
        minSectionLength: 50,
        maxSectionLength: 10000,
        includeHeaders: true,
        includeParagraphs: true,
        includeLists: true,
        includeTables: false,
        includeCodeBlocks: false,
        sectionPatterns: {
            abstract: /abstract|summary/i,
            introduction: /introduction|background/i,
            methodology: /method|approach|procedure|materials/i,
            results: /result|finding|observation/i,
            discussion: /discussion|interpretation/i,
            conclusion: /conclusion|summary|future/i,
            references: /reference|bibliography|citation/i
        }
    };
    
    // Private state
    var sections = {};
    var rawText = '';
    var documentStructure = null;
    var contentScriptInjected = new Map(); // Track which tabs have content script
    
    // Inject content script if not already injected
    function ensureContentScript(tabId) {
        return new Promise(function(resolve, reject) {
            // Check if already injected
            if (contentScriptInjected.get(tabId)) {
                console.log('Content script already injected in tab:', tabId);
                resolve();
                return;
            }
            
            // Inject the content script
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['src/content/content-script.js'] // Changed from text-extraction-content.js
            }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Failed to inject content script:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('Content script injected successfully in tab:', tabId);
                    contentScriptInjected.set(tabId, true);
                    resolve();
                }
            });
        });
    }
    
    // Send message to content script and get response
    function sendExtractionMessage(tabId, config) {
        return new Promise(function(resolve, reject) {
            chrome.tabs.sendMessage(
                tabId,
                { 
                    action: 'EXTRACT_TEXT',
                    config: config
                },
                function(response) {
                    if (chrome.runtime.lastError) {
                        console.error('Message sending failed:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    
                    if (response && response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response ? response.error : 'No response from content script'));
                    }
                }
            );
        });
    }
    
    // Clean up when tab is closed
    function setupTabListener() {
        chrome.tabs.onRemoved.addListener(function(tabId) {
            contentScriptInjected.delete(tabId);
        });
    }
    
    // Public API
    return {
        init: function(customConfig) {
            // Merge custom config
            if (customConfig) {
                Object.keys(customConfig).forEach(function(key) {
                    if (customConfig[key] !== undefined) {
                        config[key] = customConfig[key];
                    }
                });
            }
            
            // Setup tab listener for cleanup
            setupTabListener();
            
            // Initialize base extraction service if needed
            if (typeof BaseExtractionService !== 'undefined' && BaseExtractionService && !BaseExtractionService.isInitialized()) {
                return BaseExtractionService.init(customConfig);
            }
            
            return Promise.resolve();
        },
        
        extractAll: function(tabId) {
            return new Promise(function(resolve, reject) {
                console.log('Starting text extraction...');
                
                // Reset state
                sections = {};
                rawText = '';
                documentStructure = null;
                
                // Use provided tabId or get from BaseExtractionService
                var targetTabId = tabId;
                if (!targetTabId && typeof BaseExtractionService !== 'undefined' && BaseExtractionService) {
                    var tabInfo = BaseExtractionService.getTabInfo();
                    if (tabInfo) {
                        targetTabId = tabInfo.id;
                    }
                }
                
                if (!targetTabId) {
                    // Try to get current active tab
                    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                        if (tabs && tabs[0]) {
                            targetTabId = tabs[0].id;
                            performExtraction(targetTabId);
                        } else {
                            reject(new Error('No tab available for text extraction'));
                        }
                    });
                    return;
                }
                
                performExtraction(targetTabId);
                
                function performExtraction(tabId) {
                    // First ensure content script is injected
                    ensureContentScript(tabId)
                        .then(function() {
                            // Send extraction message
                            return sendExtractionMessage(tabId, config);
                        })
                        .then(function(result) {
                            if (result) {
                                sections = result.sections || {};
                                documentStructure = result.structure;
                                
                                console.log('Text extraction complete:', 
                                    Object.keys(sections).length, 'sections extracted');
                                
                                resolve(result);
                            } else {
                                reject(new Error('No text data extracted'));
                            }
                        })
                        .catch(function(error) {
                            console.error('Text extraction failed:', error);
                            
                            // Clear the injection flag so we can retry
                            contentScriptInjected.delete(tabId);
                            
                            reject(error);
                        });
                }
            });
        },
        
        extractSpecificSection: function(sectionName, tabId) {
            return this.extractAll(tabId).then(function(result) {
                return result.sections[sectionName] || null;
            });
        },
        
        getSections: function() {
            return sections;
        },
        
        getSection: function(name) {
            return sections[name] || null;
        },
        
        getRawText: function() {
            if (!rawText && sections) {
                var sectionTexts = [];
                for (var section in sections) {
                    sectionTexts.push(sections[section]);
                }
                rawText = sectionTexts.join('\n\n');
            }
            return rawText;
        },
        
        getDocumentStructure: function() {
            return documentStructure;
        },
        
        getConfig: function() {
            return config;
        },
        
        updateConfig: function(newConfig) {
            Object.keys(newConfig).forEach(function(key) {
                if (newConfig[key] !== undefined) {
                    config[key] = newConfig[key];
                }
            });
        },
        
        reset: function() {
            sections = {};
            rawText = '';
            documentStructure = null;
            contentScriptInjected.clear();
        },
        
        // Method to manually clear content script cache for a tab
        clearTabCache: function(tabId) {
            contentScriptInjected.delete(tabId);
        }
    };
})();

// Expose to global scope for service worker
if (typeof self !== 'undefined') {
    self.TextExtractionService = TextExtractionService;
} else if (typeof window !== 'undefined') {
    window.TextExtractionService = TextExtractionService;
}
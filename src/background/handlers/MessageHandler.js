// ================================
// src/background/MessageHandler.js
// ================================

/**
 * Message Handler
 * 
 * Handles all message routing in the background script,
 * dispatching to appropriate handlers.
 */
var MessageHandler = (function() {
    'use strict';
    
    // Map of action handlers
    const actionHandlers = new Map();
    
    // Route a message to the appropriate handler
    function routeMessage(message, sender, sendResponse) {
        try {
            const action = message.action;
            
            console.log('📨 Routing message:', action, 'from tab:', sender.tab?.id);
            
            // Check if there's a handler for this action
            if (actionHandlers.has(action)) {
                const handler = actionHandlers.get(action);
                return handler(message, sender, sendResponse);
            }
            
            // Add this to the routeMessage function switch cases
            if (action === 'APPLY_RAG_HIGHLIGHTS' && RAGHandler) {
                const tabId = sender.tab ? sender.tab.id : message.tabId;
                if (!tabId) {
                    sendResponse({ success: false, error: 'No tab ID provided' });
                    return false;
                }
                
                // Only allow in analysis step or with force flag
                WorkflowHandler.isInAnalysisStep(tabId)
                    .then(function(isInAnalysis) {
                        if (isInAnalysis || message.force) {
                            chrome.tabs.sendMessage(tabId, {
                                action: 'APPLY_RAG_HIGHLIGHTS',
                                highlights: message.highlights,
                                force: true // Force application
                            }, sendResponse);
                        } else {
                            sendResponse({ 
                                success: false, 
                                error: 'Tab not in analysis step'
                            });
                        }
                    })
                    .catch(function(error) {
                        sendResponse({ success: false, error: error.message });
                    });
                return true;
            }

            if (action === 'SHOW_PROPERTY_WINDOW' && sender.tab) {
                // Check if tab is in analysis step
                WorkflowHandler.isInAnalysisStep(sender.tab.id)
                    .then(function(isInAnalysis) {
                        if (isInAnalysis || message.force) {
                            chrome.tabs.sendMessage(sender.tab.id, {
                                action: 'SHOW_PROPERTY_WINDOW',
                                data: message.data,
                                force: true
                            }, sendResponse);
                        } else {
                            sendResponse({ 
                                success: false, 
                                error: 'Tab not in analysis step'
                            });
                        }
                    })
                    .catch(function(error) {
                        sendResponse({ success: false, error: error.message });
                    });
                return true;
            }

            // Special cases for RAG messages
            if (action === 'RAG_HIGHLIGHTING_COMPLETE') {
                handleRAGHighlightingComplete(message, sender);
                sendResponse({ success: true });
                return false;
            }
            
            if (action === 'RAG_HIGHLIGHT_CREATED') {
                handleRAGHighlightCreated(message, sender);
                sendResponse({ success: true });
                return false;
            }
            
            // Log unknown actions but don't block them
            console.warn('Unknown message action:', action);
            sendResponse({ success: false, error: 'Unknown action: ' + action });
            return false;
            
        } catch (error) {
            console.error('Error routing message:', error);
            sendResponse({ success: false, error: error.message });
            return false;
        }
    }
    
    // Register a handler for an action
    function registerHandler(action, handler) {
        actionHandlers.set(action, handler);
    }
    
    // Register multiple handlers at once
    function registerHandlers(handlers) {
        for (const [action, handler] of Object.entries(handlers)) {
            registerHandler(action, handler);
        }
    }
    
    // Handle RAG highlighting complete message
    function handleRAGHighlightingComplete(message, sender) {
        try {
            console.log('🎉 RAG highlighting complete:', message.data);
            
            // Notify UI if available
            if (UIManager && UIManager.updateRAGStatus) {
                UIManager.updateRAGStatus({
                    status: 'complete',
                    highlightCount: message.data.successful,
                    message: `Created ${message.data.successful} highlights`
                });
            }
            
            // Hide overlay in content script
            if (sender.tab?.id) {
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: 'HIDE_RAG_OVERLAY'
                }).catch(error => {
                    // Might fail if content script already removed overlay
                    console.debug('Could not send hide overlay message:', error);
                });
            }
            
        } catch (error) {
            console.error('Error handling RAG highlighting complete:', error);
        }
    }
    
    // Handle RAG highlight created message
    function handleRAGHighlightCreated(message, sender) {
        try {
            const { highlight, result } = message;
            
            console.log('✨ RAG highlight created:', highlight.propertyLabel);
            
            // Notify UI if available
            if (UIManager && UIManager.addHighlightToUI) {
                UIManager.addHighlightToUI(highlight, result);
            }
            
        } catch (error) {
            console.error('Error handling RAG highlight created:', error);
        }
    }
    
    // Setup message listeners
    function setupListeners() {
        chrome.runtime.onMessage.addListener(routeMessage);
        console.log('✅ Message handler listeners setup');
    }
    
    // Remove message listeners
    function removeListeners() {
        chrome.runtime.onMessage.removeListener(routeMessage);
    }
    
    // Initialize with default handlers
    function init() {
        setupListeners();
        
        // Register built-in handlers
        registerHandler('CONTENT_SCRIPT_READY', handleContentScriptReady);

        // Add to the MessageHandler's init function or registerHandlers call
        registerHandler('CHECK_ANALYSIS_STEP', function(message, sender, sendResponse) {
            try {
                const tabId = sender.tab ? sender.tab.id : message.tabId;
                if (!tabId) {
                    sendResponse({ success: false, error: 'No tab ID provided' });
                    return false;
                }
                
                if (WorkflowHandler && WorkflowHandler.isInAnalysisStep) {
                    WorkflowHandler.isInAnalysisStep(tabId)
                        .then(function(isInAnalysis) {
                            sendResponse({ 
                                success: true, 
                                isInAnalysisStep: isInAnalysis 
                            });
                        })
                        .catch(function(error) {
                            sendResponse({ 
                                success: false, 
                                error: error.message,
                                isInAnalysisStep: false
                            });
                        });
                    return true;
                }
                
                sendResponse({ success: false, isInAnalysisStep: false });
                return false;
            } catch (error) {
                console.error('Error checking analysis step:', error);
                sendResponse({ success: false, error: error.message, isInAnalysisStep: false });
                return false;
            }
        });
        
        console.log('✅ Message handler initialized');
    }
    
    // Handle content script ready message
    function handleContentScriptReady(message, sender, sendResponse) {
        try {
            console.log('🔌 Content script ready in tab:', sender.tab?.id);
            
            // Store content script capabilities
            if (sender.tab?.id && TabManager) {
                TabManager.updateTabCapabilities(sender.tab.id, {
                    contentScriptReady: true,
                    ragReady: message.ragReady || false,
                    modules: message.modules || [],
                    url: message.url,
                    title: message.title
                });
            }
            
            sendResponse({ success: true });
            return false;
            
        } catch (error) {
            console.error('Error handling content script ready:', error);
            sendResponse({ success: false, error: error.message });
            return false;
        }
    }
    
    // Public API
    return {
        init,
        routeMessage,
        registerHandler,
        registerHandlers,
        removeListeners
    };
})();

// Initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
    MessageHandler.init();
}
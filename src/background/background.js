// ================================
// src/background/background.js - Main Background Service Worker
// Updated with RAG Handler integration
// ================================

(function() {
    'use strict';
    
    // ================================
    // Script Loading Order (Important!)
    // ================================
    // These scripts should be loaded in manifest.json in this order:
    // 1. utils/background-types.js
    // 2. services/state-manager.js
    // 3. services/storage-manager.js
    // 4. services/text-extraction-service.js
    // 5. services/rag-background-service-enhanced.js
    // 6. handlers/rag-handler.js
    // 7. handlers/property-handler.js
    // 8. handlers/highlight-handler.js
    // 9. handlers/marker-handler.js
    // 10. handlers/context-menu-handler.js
    // 11. services/message-router.js
    // 12. services/service-manager.js
    // 13. External services (orkg-background-service.js, openai-background-service.js, etc.)
    // 14. background.js (this file)
    
    // ================================
    // Installation and Setup
    // ================================
    
    chrome.runtime.onInstalled.addListener(function(details) {
        console.log('🚀 ORKG Annotator Extension installed/updated:', details.reason);
        
        // Initialize all services including RAG Handler
        ServiceManager.init().then(function(services) {
            console.log('✅ All background services initialized');
            
            // Initialize RAG Handler if available
            if (typeof RAGHandler !== 'undefined') {
                console.log('🤖 RAG Handler available and ready');
            }
            
            // Set default settings
            var storageManager = services.StorageManager;
            if (storageManager) {
                storageManager.saveSettings({
                    theme: 'light',
                    autoSave: true,
                    persistWindow: true,
                    ragEnabled: true,
                    version: chrome.runtime.getManifest().version
                });
            }
        }).catch(function(error) {
            console.error('❌ Failed to initialize services:', error);
        });
    });
    
    chrome.runtime.onStartup.addListener(function() {
        console.log('🚀 Extension startup');
        ServiceManager.init();
    });
    
    // ================================
    // Message Handling for RAG Analysis
    // ================================
    
    // Listen for RAG analysis completion to send results back to popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        
        if (request.action === 'CONTENT_EXTRACTION') {
            if (typeof RAGHandler !== 'undefined') {
                RAGHandler.handleContentExtraction(request)
                    .then(sendResponse)
                    .catch(function(error) {
                        sendResponse({ success: false, error: error.message });
                    });
                return true; // Async response
            } else {
                sendResponse({ success: false, error: 'RAG Handler not available' });
            }
        }

        // Handle image marker click
        if (request.action === 'IMAGE_MARKER_CLICKED') {
            console.log('🖼️ Image marker clicked, forwarding to popup');
            
            // Forward to popup
            chrome.runtime.sendMessage({
                action: 'IMAGE_ADDED_TO_ANALYZER',
                data: request.data
            }).catch(function() {
                // Popup might be closed, store in storage
                chrome.storage.local.get(['analysisResults'], function(result) {
                    const analysisResults = result.analysisResults || { markerImages: [] };
                    analysisResults.markerImages.push(request.data);
                    chrome.storage.local.set({ analysisResults: analysisResults });
                });
            });
            
            sendResponse({ success: true });
            return false;
        }

        // Handle RAG analysis complete from background processing
        if (request.action === 'RAG_ANALYSIS_COMPLETE' && sender.id === chrome.runtime.id) {
            console.log('📤 Forwarding RAG analysis results to popup');
            
            // Forward to all popup instances
            chrome.runtime.sendMessage({
                action: 'RAG_ANALYSIS_COMPLETE',
                data: request.data
            });
        }
        
        // Handle RAG progress updates
        if (request.action === 'RAG_PROGRESS') {
            // Don't process if it's from the extension itself
            if (sender.id === chrome.runtime.id && !sender.tab) {
                // This is from the background script itself, ignore to prevent loop
                return false;
            }
            
            // Forward progress to popup
            chrome.runtime.sendMessage({
                action: 'RAG_PROGRESS',
                phase: request.phase,
                progress: request.progress,
                message: request.message,
                type: request.type,
                target: 'popup'
            }).catch(function() {
                // Popup might be closed
            });
            
            sendResponse({ success: true });
            return false;
        }
        
        // Handle RAG errors
        if (request.action === 'RAG_ANALYSIS_ERROR' && sender.id === chrome.runtime.id) {
            // Forward error to popup
            chrome.runtime.sendMessage({
                action: 'RAG_ANALYSIS_ERROR',
                error: request.error
            });
        }
        
        return false; // Synchronous response
    });
    
    // ================================
    // Action Handler (Extension Icon Click)
    // ================================
    
    chrome.action.onClicked.addListener(function(tab) {
        console.log('🔄 Extension action clicked for tab:', tab.id);
        
        var stateManager = ServiceManager.getService('StateManager');
        if (stateManager) {
            stateManager.setCurrentTab(tab);
        }
        
        // Try to open popup
        chrome.action.openPopup().catch(function(error) {
            console.log('⚠️ Popup failed, trying detached window:', error.message);
            
            // Fallback: create detached popup window
            chrome.windows.create({
                url: chrome.runtime.getURL('src/popup/popup.html'),
                type: 'popup',
                width: 600,
                height: 700,
                focused: true
            }, function(window) {
                if (!chrome.runtime.lastError && stateManager) {
                    stateManager.setWindowId(window.id);
                    stateManager.setPopupOpen(true);
                }
            });
        });
    });
    
    // ================================
    // Tab Management
    // ================================
    
    chrome.tabs.onActivated.addListener(function(activeInfo) {
        console.log('🔄 Tab activated:', activeInfo.tabId);
        
        var stateManager = ServiceManager.getService('StateManager');
        if (stateManager) {
            chrome.tabs.get(activeInfo.tabId, function(tab) {
                if (!chrome.runtime.lastError) {
                    stateManager.setCurrentTab(tab);
                }
            });
        }
    });
    
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            console.log('🔄 Tab updated:', tabId, tab.url);
            
            var stateManager = ServiceManager.getService('StateManager');
            if (stateManager) {
                stateManager.updateTabState(tabId, {
                    lastActivity: Date.now()
                });
            }
        }
    });
    
    chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
        console.log('🗋 Tab removed, cleaning up state:', tabId);
        
        var stateManager = ServiceManager.getService('StateManager');
        var storageManager = ServiceManager.getService('StorageManager');
        
        if (stateManager) {
            stateManager.deleteTabState(tabId);
        }
        
        if (storageManager) {
            storageManager.cleanupTabData(tabId).catch(function(error) {
                console.warn('Failed to cleanup tab data:', error);
            });
        }
        
        // Clean up any active RAG analysis for this tab
        if (typeof RAGHandler !== 'undefined') {
            var ragStatus = RAGHandler.getStatus();
            if (ragStatus.isActive && ragStatus.currentAnalysis && 
                ragStatus.currentAnalysis.tabId === tabId) {
                console.log('🧹 Cleaning up RAG analysis for closed tab:', tabId);
                // RAG Handler will auto-cleanup on tab close
            }
        }
    });
    
    // ================================
    // Window Management
    // ================================
    
    chrome.windows.onRemoved.addListener(function(windowId) {
        var stateManager = ServiceManager.getService('StateManager');
        if (stateManager && stateManager.getWindowId() === windowId) {
            console.log('📝 Popup window closed:', windowId);
            stateManager.setPopupOpen(false);
            stateManager.setWindowId(null);
        }
    });
    
    chrome.windows.onFocusChanged.addListener(function(windowId) {
        var stateManager = ServiceManager.getService('StateManager');
        if (stateManager && stateManager.isWindowPersistenceEnabled()) {
            if (windowId === chrome.windows.WINDOW_ID_NONE) {
                console.log('📌 Window focus lost but maintaining popup persistence');
            }
        }
    });
    
    // ================================
    // Keyboard Shortcuts
    // ================================
    
    chrome.commands.onCommand.addListener(function(command) {
        console.log('⌨️ Keyboard shortcut triggered:', command);
        
        if (command === '_execute_action' || command === 'toggle_annotator') {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs && tabs[0]) {
                    chrome.action.onClicked.dispatch(tabs[0]);
                }
            });
        }
        
        // Add RAG analysis shortcut
        if (command === 'start_rag_analysis') {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs && tabs[0] && typeof RAGHandler !== 'undefined') {
                    console.log('⌨️ Starting RAG analysis via keyboard shortcut');
                    // This would need the template from popup state
                }
            });
        }
    });
    
    // ================================
    // Service Worker Keep-Alive (Manifest V3)
    // ================================
    
    var keepAlive = function() {
        return setInterval(chrome.runtime.getPlatformInfo, 20000);
    };
    
    chrome.runtime.onStartup.addListener(keepAlive);
    keepAlive();
    
    // ================================
    // Periodic Maintenance
    // ================================
    
    setInterval(function() {
        var stateManager = ServiceManager.getService('StateManager');
        if (stateManager) {
            var cleaned = stateManager.cleanupOldStates();
            if (cleaned.length > 0) {
                console.log('🧽 Periodic cleanup completed:', cleaned.length, 'states');
            }
        }
        
        // Clean up RAG cache periodically
        if (typeof RAGBackgroundService !== 'undefined' && RAGBackgroundService.getStats) {
            var ragStats = RAGBackgroundService.getStats();
            if (ragStats.cacheSize > 50) {
                console.log('🧹 Cleaning RAG cache, current size:', ragStats.cacheSize);
                RAGBackgroundService.clearCache();
            }
        }
    }, 60 * 60 * 1000); // Every hour
    
    // ================================
    // Debug Functions
    // ================================
    
    if (typeof globalThis !== 'undefined') {
        // Debug: View extension state
        globalThis.debugExtensionState = function() {
            var stateManager = ServiceManager.getService('StateManager');
            if (stateManager) {
                console.log('🔍 Extension State:', stateManager.getDebugInfo());
            } else {
                console.error('StateManager not initialized');
            }
        };
        
        // Debug: Get RAG analysis status
        globalThis.getRAGStatus = function() {
            if (typeof RAGHandler !== 'undefined') {
                console.log('🤖 RAG Handler Status:', RAGHandler.getStatus());
            } else {
                console.error('RAG Handler not available');
            }
            
            if (typeof RAGBackgroundService !== 'undefined') {
                console.log('📊 RAG Service Stats:', RAGBackgroundService.getStats());
            }
        };
        
        // Debug: Clear RAG cache
        globalThis.clearRAGCache = function() {
            if (typeof RAGBackgroundService !== 'undefined') {
                RAGBackgroundService.clearCache();
                console.log('✅ RAG cache cleared');
            } else {
                console.error('RAG service not available');
            }
        };
        
        // Debug: Test RAG analysis with mock data
        globalThis.testRAGAnalysis = function() {
            if (typeof RAGHandler === 'undefined') {
                console.error('RAG Handler not available');
                return;
            }
            
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs && tabs[0]) {
                    var mockTemplate = {
                        properties: [
                            { id: 'method', label: 'Research Method', type: 'text' },
                            { id: 'dataset', label: 'Dataset Used', type: 'text' },
                            { id: 'results', label: 'Main Results', type: 'text' }
                        ]
                    };
                    
                    RAGHandler.startAnalysis({
                        template: mockTemplate,
                        tabId: tabs[0].id
                    }, { tab: tabs[0] }).then(function(result) {
                        console.log('✅ Test RAG analysis result:', result);
                    }).catch(function(error) {
                        console.error('❌ Test RAG analysis failed:', error);
                    });
                }
            });
        };
        
        // Debug: Clear all tab states
        globalThis.clearAllTabStates = function() {
            var stateManager = ServiceManager.getService('StateManager');
            var storageManager = ServiceManager.getService('StorageManager');
            
            if (stateManager) {
                var count = stateManager.clearAllTabStates();
                console.log('✅ Cleared', count, 'tab states from memory');
            }
            
            if (storageManager) {
                chrome.storage.local.get(null, function(items) {
                    var keysToRemove = Object.keys(items).filter(function(key) {
                        return key.startsWith(BackgroundTypes.STORAGE_KEYS.WORKFLOW_STATE_PREFIX);
                    });
                    
                    if (keysToRemove.length > 0) {
                        storageManager.remove(keysToRemove).then(function() {
                            console.log('✅ Cleared', keysToRemove.length, 'workflow states from storage');
                        });
                    }
                });
            }
        };
        
        // Debug: Get marker images
        globalThis.getMarkerImages = function() {
            var storageManager = ServiceManager.getService('StorageManager');
            if (storageManager) {
                storageManager.loadAnalysisResults().then(function(results) {
                    console.log('🖼️ Marker Images:', results.markerImages || []);
                });
            }
        };
        
        // Debug: Get text highlights
        globalThis.getTextHighlights = function() {
            var storageManager = ServiceManager.getService('StorageManager');
            if (storageManager) {
                storageManager.loadHighlights().then(function(highlights) {
                    console.log('🔍 Text Highlights:', highlights);
                });
            }
        };
        
        // Debug: Get service status
        globalThis.getServiceStatus = function() {
            console.log('📊 Service Status:', ServiceManager.getStatus());
        };
        
        // Debug: Reinitialize services
        globalThis.reinitializeServices = function() {
            ServiceManager.cleanup();
            ServiceManager.init().then(function() {
                console.log('✅ Services reinitialized');
            });
        };
    }
    
    // ================================
    // Initialization
    // ================================
    
    console.log('✅ ORKG Annotator Background Service Worker starting...');
    
    // Initialize all services on load
    ServiceManager.init().then(function(services) {
        console.log('✅ ORKG Annotator Background Service Worker initialized');
        console.log('🤖 RAG Analysis:', typeof RAGHandler !== 'undefined' ? 'Available' : 'Not Available');
        console.log('📌 Window persistence enabled:', 
                   services.StateManager ? services.StateManager.isWindowPersistenceEnabled() : false);
        console.log('🔍 Debug functions available:',
                   'debugExtensionState(), clearAllTabStates(), getMarkerImages(),',
                   'getTextHighlights(), getServiceStatus(), reinitializeServices(),',
                   'getRAGStatus(), clearRAGCache(), testRAGAnalysis()');
    }).catch(function(error) {
        console.error('❌ Failed to initialize background services:', error);
    });
    
})();
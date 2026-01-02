// ================================
// src/background/services/message-router.js
// Routes messages to appropriate handlers - Updated with RAG support
// ================================

var MessageRouter = (function() {
    'use strict';
    
    // Private variables
    var routingTable = {};
    var isInitialized = false;
    
    // Initialize routing table
    function initializeRoutes() {
        var actions = BackgroundTypes.MESSAGE_ACTIONS;
        
        // Tab management routes
        routingTable[actions.GET_TAB_INFO] = handleGetTabInfo;
        
        // Workflow state routes
        routingTable[actions.SAVE_WORKFLOW_STATE] = handleSaveWorkflowState;
        routingTable[actions.LOAD_WORKFLOW_STATE] = handleLoadWorkflowState;
        routingTable[actions.CLEAR_WORKFLOW_STATE] = handleClearWorkflowState;
        
        // Window persistence routes
        routingTable[actions.SET_WINDOW_PERSISTENCE] = handleSetWindowPersistence;
        
        // Image/Marker routes
        routingTable[actions.ADD_IMAGE_TO_ORKG] = handleAddImage;
        routingTable[actions.REMOVE_IMAGE_FROM_ORKG] = handleRemoveImage;
        routingTable[actions.ACTIVATE_MARKERS] = handleActivateMarkers;
        routingTable[actions.GET_ANALYZER_STATE] = handleGetAnalyzerState;
        
        // Extraction routes
        routingTable[actions.EXTRACT_TEXT] = handleExtractText;
        routingTable[actions.EXTRACT_TABLES] = handleExtractTables;
        routingTable[actions.EXTRACT_ALL] = handleExtractAll;
        
        // RAG Analysis routes - NEW
        routingTable['START_RAG_ANALYSIS'] = handleStartRAGAnalysis;
        routingTable['GET_RAG_STATUS'] = handleGetRAGStatus;
        routingTable['CANCEL_RAG_ANALYSIS'] = handleCancelRAGAnalysis;
        
        // Property routes
        routingTable[actions.FETCH_ORKG_PROPERTIES] = handleFetchProperties;
        routingTable[actions.GET_AI_PROPERTY_SUGGESTIONS] = handleGetAISuggestions;
        routingTable[actions.GET_COMMON_PROPERTIES] = handleGetCommonProperties;
        routingTable[actions.GET_FIELD_PROPERTIES] = handleGetFieldProperties;
        routingTable[actions.CREATE_PROPERTY] = handleCreateProperty;
        routingTable[actions.PROPERTY_SELECTED] = handlePropertySelected;
        routingTable[actions.GET_PROPERTY_SUGGESTIONS] = handleGetPropertySuggestions;
        routingTable[actions.SEARCH_ORKG_PROPERTIES] = handleSearchProperties;
        
        // Highlighting routes
        routingTable[actions.HIGHLIGHT_SELECTION] = handleHighlightSelection;
        routingTable[actions.SHOW_PROPERTY_MODAL] = handleShowPropertyModal;
        
        // System routes
        routingTable[actions.CONTENT_SCRIPT_READY] = handleContentScriptReady;
        routingTable[actions.PING] = handlePing;
    }
    
    // Get tab ID from request or sender
    function getTabId(request, sender) {
        return request.tabId || (sender && sender.tab && sender.tab.id) || null;
    }
    
    // ================================
    // RAG Analysis Handlers - NEW
    // ================================
    
    function handleStartRAGAnalysis(request, sender) {
        console.log('📨 MessageRouter: Handling START_RAG_ANALYSIS');
        
        // Validate RAGHandler is available
        if (typeof RAGHandler === 'undefined') {
            console.error('❌ RAGHandler not available');
            return Promise.resolve({
                success: false,
                error: 'RAG Handler service not available'
            });
        }
        
        // Get tab ID
        var tabId = request.tabId || getTabId(request, sender);
        if (!tabId) {
            return Promise.resolve({
                success: false,
                error: 'No tab ID provided for RAG analysis'
            });
        }
        
        // Validate template
        if (!request.template) {
            return Promise.resolve({
                success: false,
                error: 'No template provided for RAG analysis'
            });
        }
        
        // Update request with resolved tab ID
        request.tabId = tabId;
        
        // Start RAG analysis
        return RAGHandler.startAnalysis(request, sender)
            .then(function(result) {
                console.log('✅ RAG analysis started successfully');
                return result;
            })
            .catch(function(error) {
                console.error('❌ Failed to start RAG analysis:', error);
                return {
                    success: false,
                    error: error.message || 'Failed to start RAG analysis'
                };
            });
    }
    
    function handleGetRAGStatus(request, sender) {
        if (typeof RAGHandler === 'undefined') {
            return Promise.resolve({
                success: false,
                error: 'RAG Handler not available'
            });
        }
        
        var status = RAGHandler.getStatus();
        return Promise.resolve({
            success: true,
            status: status
        });
    }
    
    function handleCancelRAGAnalysis(request, sender) {
        if (typeof RAGHandler === 'undefined') {
            return Promise.resolve({
                success: false,
                error: 'RAG Handler not available'
            });
        }
        
        // Implementation for cancelling analysis if needed
        return Promise.resolve({
            success: true,
            message: 'Analysis cancellation requested'
        });
    }
    
    // ================================
    // Existing Handlers
    // ================================
    
    // Tab management handlers
    function handleGetTabInfo() {
        return new Promise(function(resolve) {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs && tabs[0]) {
                    var tab = tabs[0];
                    StateManager.setCurrentTab(tab);
                    
                    resolve({
                        success: true,
                        tab: {
                            id: tab.id,
                            url: tab.url,
                            title: tab.title,
                            favIconUrl: tab.favIconUrl,
                            status: tab.status
                        }
                    });
                } else {
                    resolve({
                        success: false,
                        error: BackgroundTypes.ERROR_MESSAGES.NO_TAB
                    });
                }
            });
        });
    }
    
    // Workflow state handlers
    function handleSaveWorkflowState(request, sender) {
        var tabId = getTabId(request, sender);
        if (!tabId) {
            return Promise.resolve({
                success: false,
                error: BackgroundTypes.ERROR_MESSAGES.NO_TAB_ID
            });
        }
        
        StateManager.updateTabState(tabId, {
            workflowStep: request.data.currentStep || 'welcome',
            analysisData: request.data
        });
        
        return StorageManager.saveWorkflowState(tabId, request.data).then(function() {
            return { success: true };
        });
    }
    
    function handleLoadWorkflowState(request, sender) {
        var tabId = getTabId(request, sender);
        if (!tabId) {
            return Promise.resolve({
                success: false,
                error: BackgroundTypes.ERROR_MESSAGES.NO_TAB_ID
            });
        }
        
        var tabState = StateManager.getTabState(tabId);
        if (tabState && tabState.analysisData) {
            return Promise.resolve({
                success: true,
                data: tabState.analysisData
            });
        }
        
        return StorageManager.loadWorkflowState(tabId).then(function(data) {
            if (data) {
                return { success: true, data: data };
            } else {
                return { success: false, error: 'No saved state found' };
            }
        });
    }
    
    function handleClearWorkflowState(request, sender) {
        var tabId = getTabId(request, sender);
        if (tabId) {
            StateManager.deleteTabState(tabId);
            return StorageManager.clearWorkflowState(tabId).then(function() {
                return { success: true };
            });
        }
        return Promise.resolve({ success: true });
    }
    
    // Window persistence handler
    function handleSetWindowPersistence(request) {
        StateManager.setWindowPersistence(request.enabled);
        return Promise.resolve({ success: true });
    }
    
    // Image/Marker handlers
    function handleAddImage(request, sender) {
        var tabId = getTabId(request, sender);
        return MarkerHandler.addMarkerImage(request.data, tabId);
    }
    
    function handleRemoveImage(request, sender) {
        var tabId = getTabId(request, sender);
        return MarkerHandler.removeMarkerImage(request.imageId, tabId);
    }
    
    function handleActivateMarkers(request, sender) {
        var tabId = getTabId(request, sender);
        return MarkerHandler.activateMarkers(tabId);
    }
    
    function handleGetAnalyzerState(request, sender) {
        var tabId = getTabId(request, sender);
        return MarkerHandler.getAnalyzerState(tabId);
    }
    
    // Extraction handlers
    function handleExtractText(request, sender) {
        var tabId = getTabId(request, sender);
        if (!tabId) {
            return Promise.resolve({
                success: false,
                error: BackgroundTypes.ERROR_MESSAGES.NO_TAB_ID
            });
        }
        
        if (ExtractionOrchestrator && ExtractionOrchestrator.extractText) {
            return ExtractionOrchestrator.extractText(tabId).then(function(result) {
                StateManager.updateTabState(tabId, {
                    extractedText: result.sections || result
                });
                
                return { success: true, data: result };
            });
        }
        
        return Promise.resolve({
            success: false,
            error: 'Text extraction service not available'
        });
    }
    
    function handleExtractTables(request, sender) {
        var tabId = getTabId(request, sender);
        if (!tabId) {
            return Promise.resolve({
                success: false,
                error: BackgroundTypes.ERROR_MESSAGES.NO_TAB_ID
            });
        }
        
        if (ExtractionOrchestrator && ExtractionOrchestrator.extractTables) {
            return ExtractionOrchestrator.extractTables(tabId).then(function(result) {
                StateManager.updateTabState(tabId, {
                    extractedTables: result.tables || result
                });
                
                return { success: true, data: result };
            });
        }
        
        return Promise.resolve({
            success: false,
            error: 'Table extraction service not available'
        });
    }
    
    function handleExtractAll(request, sender) {
        var tabId = getTabId(request, sender);
        if (!tabId) {
            return Promise.resolve({
                success: false,
                error: BackgroundTypes.ERROR_MESSAGES.NO_TAB_ID
            });
        }
        
        if (ExtractionOrchestrator && ExtractionOrchestrator.extractAll) {
            return ExtractionOrchestrator.extractAll({
                tabId: tabId,
                images: request.options ? request.options.images : true,
                text: request.options ? request.options.text : true,
                tables: request.options ? request.options.tables : true
            }).then(function(result) {
                return { success: true, data: result };
            });
        }
        
        return Promise.resolve({
            success: false,
            error: 'Extraction orchestrator not available'
        });
    }
    
    // Property handlers
    function handleFetchProperties(request) {
        return PropertyHandler.fetchProperties(request.query);
    }
    
    function handleGetAISuggestions(request) {
        return PropertyHandler.getAISuggestions(request.text, request.context || {});
    }
    
    function handleGetCommonProperties() {
        return PropertyHandler.getCommonProperties().then(function(properties) {
            return { success: true, properties: properties };
        });
    }
    
    function handleGetFieldProperties(request) {
        return PropertyHandler.getFieldProperties(request.fieldId).then(function(properties) {
            return { success: true, properties: properties };
        });
    }
    
    function handleCreateProperty(request) {
        return PropertyHandler.createProperty(request.label, request.description)
            .then(function(property) {
                return { success: true, property: property };
            });
    }
    
    function handlePropertySelected(request, sender) {
        return HighlightHandler.handlePropertySelection(request, sender.tab);
    }
    
    function handleGetPropertySuggestions(request) {
        return PropertyHandler.getSuggestedProperties(request.text);
    }
    
    function handleSearchProperties(request) {
        return PropertyHandler.searchORKGProperties(request.query);
    }
    
    // Highlighting handlers
    function handleHighlightSelection(request, sender) {
        return HighlightHandler.createHighlight(request, sender.tab);
    }
    
    function handleShowPropertyModal(request, sender) {
        var tabId = getTabId(request, sender);
        if (!tabId) {
            return Promise.resolve({
                success: false,
                error: BackgroundTypes.ERROR_MESSAGES.NO_TAB_ID
            });
        }
        
        return HighlightHandler.showPropertyModal(
            tabId,
            request.selectedText,
            request.selectionContext
        );
    }
    
    // System handlers
    function handleContentScriptReady(request, sender) {
        console.log('Content script ready in tab:', sender.tab ? sender.tab.id : 'unknown');
        return Promise.resolve({
            success: true,
            message: 'Background acknowledged'
        });
    }
    
    function handlePing() {
        return Promise.resolve({
            success: true,
            timestamp: Date.now()
        });
    }
    
    // Public API
    return {
        // Initialize router
        init: function() {
            if (isInitialized) return;
            
            initializeRoutes();
            
            // Set up message listener
            chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                // Log RAG-related messages
                if (request.action && request.action.includes('RAG')) {
                    console.log('🔄 RAG Message:', request.action, 'from:', 
                               sender.tab ? 'tab ' + sender.tab.id : 'extension');
                }
                
                // Route the message
                MessageRouter.route(request, sender).then(sendResponse);
                
                // Return true to keep channel open for async response
                return true;
            });
            
            isInitialized = true;
            console.log('MessageRouter initialized with', Object.keys(routingTable).length, 'routes');
        },
        
        // Route a message
        route: function(request, sender) {
            // Log routing
            if (request.action !== 'PING') {
                console.log('Routing message:', request.action, 'from tab:', 
                           sender.tab ? sender.tab.id : 'extension');
            }
            
            // Check if route exists
            if (!routingTable[request.action]) {
                console.warn('Unknown message action:', request.action);
                return Promise.resolve({
                    success: false,
                    error: 'Unknown action: ' + request.action
                });
            }
            
            // Execute handler
            try {
                return routingTable[request.action](request, sender);
            } catch (error) {
                console.error('Message handler error:', error);
                return Promise.resolve({
                    success: false,
                    error: error.message
                });
            }
        },
        
        // Add custom route
        addRoute: function(action, handler) {
            if (typeof handler !== 'function') {
                throw new Error('Handler must be a function');
            }
            
            routingTable[action] = handler;
            console.log('Added route:', action);
        },
        
        // Remove route
        removeRoute: function(action) {
            delete routingTable[action];
            console.log('Removed route:', action);
        },
        
        // Check if route exists
        hasRoute: function(action) {
            return !!routingTable[action];
        },
        
        // Get all routes
        getRoutes: function() {
            return Object.keys(routingTable);
        },
        
        // Get router status
        getStatus: function() {
            return {
                isInitialized: isInitialized,
                routeCount: Object.keys(routingTable).length,
                routes: Object.keys(routingTable),
                hasRAGSupport: routingTable['START_RAG_ANALYSIS'] !== undefined
            };
        }
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.MessageRouter = MessageRouter;
}
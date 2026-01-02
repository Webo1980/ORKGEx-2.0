// ================================
// src/background/handlers/context-menu-handler.js
// Handles context menu creation and management
// ================================

var ContextMenuHandler = (function() {
    'use strict';
    
    // Private variables
    var isInitialized = false;
    var quickActionProperties = [];
    
    // Create context menus
    function createContextMenus() {
        return new Promise(function(resolve) {
            // Remove existing menus first
            chrome.contextMenus.removeAll(function() {
                var menuIds = BackgroundTypes.CONTEXT_MENU_IDS;
                
                // Create main ORKG annotation menu
                chrome.contextMenus.create({
                    id: menuIds.ANNOTATE_PAGE,
                    title: 'Annotate with ORKG V2.0',
                    contexts: ['page'],
                    documentUrlPatterns: ['http://*/*', 'https://*/*']
                });
                
                // Create text highlighting menu
                chrome.contextMenus.create({
                    id: menuIds.HIGHLIGHT,
                    title: 'Highlight with ORKG',
                    contexts: ['selection']
                });
                
                // Create separator
                chrome.contextMenus.create({
                    id: menuIds.HIGHLIGHT_SEPARATOR_TOP,
                    parentId: menuIds.HIGHLIGHT,
                    type: 'separator',
                    contexts: ['selection']
                });
                
                // Create custom property selection option
                chrome.contextMenus.create({
                    id: menuIds.HIGHLIGHT_CUSTOM,
                    parentId: menuIds.HIGHLIGHT,
                    title: '🔍 Select Property...',
                    contexts: ['selection']
                });
                
                chrome.contextMenus.create({
                    id: menuIds.HIGHLIGHT_SEPARATOR_MIDDLE,
                    parentId: menuIds.HIGHLIGHT,
                    type: 'separator',
                    contexts: ['selection']
                });
                
                // Add quick actions menu
                chrome.contextMenus.create({
                    id: menuIds.HIGHLIGHT_QUICK,
                    parentId: menuIds.HIGHLIGHT,
                    title: 'Quick Actions',
                    contexts: ['selection']
                });
                
                console.log('Context menus created');
                resolve();
            });
        });
    }
    
    // Load quick action properties
    function loadQuickActionProperties() {
        PropertyHandler.getQuickActionProperties().then(function(properties) {
            quickActionProperties = properties;
            updateQuickActionMenuItems(properties);
        }).catch(function(error) {
            console.error('Failed to load quick action properties:', error);
            // Use fallback properties
            quickActionProperties = BackgroundTypes.FALLBACK_PREDICATES.slice(0, 5);
            updateQuickActionMenuItems(quickActionProperties);
        });
    }
    
    // Update quick action menu items
    function updateQuickActionMenuItems(properties) {
        var menuIds = BackgroundTypes.CONTEXT_MENU_IDS;
        
        properties.forEach(function(property, index) {
            chrome.contextMenus.create({
                id: menuIds.QUICK_PREFIX + property.id,
                parentId: menuIds.HIGHLIGHT_QUICK,
                title: property.label,
                contexts: ['selection']
            });
        });
        
        console.log('Quick action menu items updated:', properties.length);
    }
    
    // Handle menu click
    function handleMenuClick(info, tab) {
        var menuIds = BackgroundTypes.CONTEXT_MENU_IDS;
        
        // Handle page annotation
        if (info.menuItemId === menuIds.ANNOTATE_PAGE) {
            return handleAnnotatePage(tab);
        }
        
        // Handle text selection menus
        if (!info.selectionText) {
            return Promise.resolve({ success: false, error: 'No text selected' });
        }
        
        // Handle custom property selection
        if (info.menuItemId === menuIds.HIGHLIGHT_CUSTOM || 
            info.menuItemId === menuIds.HIGHLIGHT) {
            return handleCustomPropertySelection(info, tab);
        }
        
        // Handle quick actions
        if (info.menuItemId.startsWith(menuIds.QUICK_PREFIX)) {
            return HighlightHandler.handleQuickAction(
                info.menuItemId,
                info.selectionText,
                tab
            );
        }
        
        return Promise.resolve({ success: false, error: 'Unknown menu action' });
    }
    
    // Handle annotate page action
    function handleAnnotatePage(tab) {
        if (!tab) {
            return Promise.resolve({ success: false, error: 'No tab available' });
        }
        
        console.log('Context menu: Annotate page clicked for tab:', tab.id);
        
        return new Promise(function(resolve) {
            // Open popup
            chrome.action.openPopup().then(function() {
                console.log('Popup opened from context menu');
                
                // Update state
                StateManager.setCurrentTab(tab);
                StateManager.setPopupOpen(true);
                
                resolve({ success: true });
            }).catch(function(error) {
                console.log('Failed to open popup, trying detached window');
                
                // Fallback to detached window
                chrome.windows.create({
                    url: chrome.runtime.getURL('src/popup/popup.html'),
                    type: 'popup',
                    width: 600,
                    height: 700,
                    focused: true
                }, function(window) {
                    if (chrome.runtime.lastError) {
                        resolve({
                            success: false,
                            error: chrome.runtime.lastError.message
                        });
                    } else {
                        StateManager.setWindowId(window.id);
                        StateManager.setPopupOpen(true);
                        resolve({ success: true });
                    }
                });
            });
        });
    }
    
    // Handle custom property selection
    function handleCustomPropertySelection(info, tab) {
        if (!tab || !tab.id) {
            return Promise.resolve({ success: false, error: 'No tab available' });
        }
        
        // Show property modal in content script
        return HighlightHandler.showPropertyModal(tab.id, info.selectionText, {
            pageUrl: info.pageUrl,
            frameUrl: info.frameUrl
        });
    }
    
    // Public API
    return {
        // Initialize context menu handler
        init: function() {
            if (isInitialized) return Promise.resolve();
            
            return createContextMenus().then(function() {
                // Load quick action properties
                loadQuickActionProperties();
                
                // Set up click handler
                chrome.contextMenus.onClicked.addListener(function(info, tab) {
                    handleMenuClick(info, tab).catch(function(error) {
                        console.error('Context menu action failed:', error);
                    });
                });
                
                isInitialized = true;
                console.log('ContextMenuHandler initialized');
            });
        },
        
        // Update context menus
        update: function() {
            return createContextMenus().then(function() {
                loadQuickActionProperties();
            });
        },
        
        // Update quick actions with new properties
        updateQuickActions: function(properties) {
            if (!properties || properties.length === 0) {
                return;
            }
            
            quickActionProperties = properties;
            
            // Remove existing quick action items
            var menuIds = BackgroundTypes.CONTEXT_MENU_IDS;
            quickActionProperties.forEach(function(prop) {
                chrome.contextMenus.remove(menuIds.QUICK_PREFIX + prop.id, function() {
                    // Ignore errors for non-existent items
                });
            });
            
            // Add new items
            updateQuickActionMenuItems(properties);
        },
        
        // Enable/disable menus
        setEnabled: function(enabled) {
            var menuIds = BackgroundTypes.CONTEXT_MENU_IDS;
            
            Object.values(menuIds).forEach(function(menuId) {
                chrome.contextMenus.update(menuId, {
                    enabled: enabled
                }, function() {
                    // Ignore errors for non-existent items
                });
            });
        },
        
        // Check if initialized
        isReady: function() {
            return isInitialized;
        },
        
        // Get current quick action properties
        getQuickActionProperties: function() {
            return quickActionProperties;
        },
        
        // Remove all context menus
        removeAll: function() {
            return new Promise(function(resolve) {
                chrome.contextMenus.removeAll(function() {
                    console.log('All context menus removed');
                    resolve();
                });
            });
        }
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.ContextMenuHandler = ContextMenuHandler;
}
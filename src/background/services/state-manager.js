// ================================
// src/background/services/state-manager.js
// Manages extension and tab states
// ================================

var StateManager = (function() {
    'use strict';
    
    // Private state
    var extensionState = null;
    var tabStates = new Map();
    var stateChangeListeners = [];
    var isInitialized = false;
    
    // Initialize extension state
    function initializeState() {
        if (!BackgroundTypes) {
            throw new Error('BackgroundTypes not found');
        }
        
        extensionState = BackgroundTypes.createExtensionState();
        console.log('StateManager initialized');
        isInitialized = true;
    }
    
    // Get or create tab state
    function getTabState(tabId) {
        if (!tabId) return null;
        
        if (!tabStates.has(tabId)) {
            tabStates.set(tabId, BackgroundTypes.createTabState());
        }
        
        return tabStates.get(tabId);
    }
    
    // Update tab state
    function updateTabState(tabId, updates) {
        var state = getTabState(tabId);
        if (!state) return false;
        
        Object.keys(updates).forEach(function(key) {
            if (state.hasOwnProperty(key)) {
                state[key] = updates[key];
            }
        });
        
        state.lastActivity = Date.now();
        tabStates.set(tabId, state);
        
        notifyListeners('tabStateChanged', { tabId: tabId, state: state });
        return true;
    }
    
    // Update extension state
    function updateExtensionState(updates) {
        if (!extensionState) {
            initializeState();
        }
        
        Object.keys(updates).forEach(function(key) {
            if (extensionState.hasOwnProperty(key)) {
                extensionState[key] = updates[key];
            }
        });
        
        notifyListeners('extensionStateChanged', extensionState);
        return true;
    }
    
    // Notify state change listeners
    function notifyListeners(eventType, data) {
        stateChangeListeners.forEach(function(listener) {
            try {
                listener(eventType, data);
            } catch (error) {
                console.error('State listener error:', error);
            }
        });
    }
    
    // Clean up old tab states
    function cleanupOldStates() {
        var now = Date.now();
        var maxAge = 24 * 60 * 60 * 1000; // 24 hours
        var cleaned = [];
        
        tabStates.forEach(function(state, tabId) {
            if (now - state.lastActivity > maxAge) {
                tabStates.delete(tabId);
                cleaned.push(tabId);
            }
        });
        
        if (cleaned.length > 0) {
            console.log('Cleaned up old tab states:', cleaned.length);
            notifyListeners('statesCleanedUp', cleaned);
        }
        
        return cleaned;
    }
    
    // Public API
    return {
        // Initialization
        init: function() {
            if (isInitialized) return;
            initializeState();
            
            // Set up periodic cleanup
            setInterval(cleanupOldStates, 60 * 60 * 1000); // Every hour
        },
        
        // Tab state management
        getTabState: function(tabId) {
            return getTabState(tabId);
        },
        
        updateTabState: function(tabId, updates) {
            return updateTabState(tabId, updates);
        },
        
        deleteTabState: function(tabId) {
            var deleted = tabStates.delete(tabId);
            if (deleted) {
                notifyListeners('tabStateDeleted', tabId);
            }
            return deleted;
        },
        
        getAllTabStates: function() {
            var states = {};
            tabStates.forEach(function(state, tabId) {
                states[tabId] = state;
            });
            return states;
        },
        
        clearAllTabStates: function() {
            var count = tabStates.size;
            tabStates.clear();
            notifyListeners('allTabStatesCleared', count);
            return count;
        },
        
        // Extension state management
        getExtensionState: function() {
            if (!extensionState) {
                initializeState();
            }
            return extensionState;
        },
        
        updateExtensionState: function(updates) {
            return updateExtensionState(updates);
        },
        
        // Current tab tracking
        setCurrentTab: function(tab) {
            if (!tab) return false;
            
            updateExtensionState({
                currentTab: tab,
                lastActiveTab: tab.id
            });
            
            // Ensure tab state exists
            getTabState(tab.id);
            
            return true;
        },
        
        getCurrentTab: function() {
            return extensionState ? extensionState.currentTab : null;
        },
        
        getLastActiveTabId: function() {
            return extensionState ? extensionState.lastActiveTab : null;
        },
        
        // Window management
        setWindowId: function(windowId) {
            return updateExtensionState({ windowId: windowId });
        },
        
        getWindowId: function() {
            return extensionState ? extensionState.windowId : null;
        },
        
        setPopupOpen: function(isOpen) {
            return updateExtensionState({ isPopupOpen: isOpen });
        },
        
        isPopupOpen: function() {
            return extensionState ? extensionState.isPopupOpen : false;
        },
        
        setWindowPersistence: function(enabled) {
            return updateExtensionState({ isWindowPersistenceEnabled: enabled });
        },
        
        isWindowPersistenceEnabled: function() {
            return extensionState ? extensionState.isWindowPersistenceEnabled : true;
        },
        
        // Event listeners
        addStateChangeListener: function(listener) {
            if (typeof listener === 'function') {
                stateChangeListeners.push(listener);
            }
        },
        
        removeStateChangeListener: function(listener) {
            var index = stateChangeListeners.indexOf(listener);
            if (index > -1) {
                stateChangeListeners.splice(index, 1);
            }
        },
        
        // Utility methods
        getTabCount: function() {
            return tabStates.size;
        },
        
        hasTabState: function(tabId) {
            return tabStates.has(tabId);
        },
        
        cleanupOldStates: cleanupOldStates,
        
        // Debug methods
        getDebugInfo: function() {
            return {
                isInitialized: isInitialized,
                extensionState: extensionState,
                tabCount: tabStates.size,
                tabIds: Array.from(tabStates.keys()),
                listenerCount: stateChangeListeners.length
            };
        },
        
        reset: function() {
            tabStates.clear();
            extensionState = BackgroundTypes.createExtensionState();
            notifyListeners('stateReset', null);
            console.log('StateManager reset');
        }
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.StateManager = StateManager;
}
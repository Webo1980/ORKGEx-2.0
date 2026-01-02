// ================================
// src/background/handlers/tab-handler.js
// Handles tab lifecycle management
// ================================

var TabHandler = (function() {
    'use strict';
    
    // Private variables
    var tabMonitors = new Map();
    var tabActivityTimestamps = new Map();
    
    // Monitor tab for changes
    function startMonitoringTab(tabId) {
        if (tabMonitors.has(tabId)) {
            return;
        }
        
        tabMonitors.set(tabId, {
            startTime: Date.now(),
            lastActivity: Date.now(),
            updateCount: 0
        });
        
        console.log('Started monitoring tab:', tabId);
    }
    
    // Stop monitoring tab
    function stopMonitoringTab(tabId) {
        if (tabMonitors.has(tabId)) {
            tabMonitors.delete(tabId);
            console.log('Stopped monitoring tab:', tabId);
        }
    }
    
    // Update tab activity
    function updateTabActivity(tabId) {
        tabActivityTimestamps.set(tabId, Date.now());
        
        if (tabMonitors.has(tabId)) {
            var monitor = tabMonitors.get(tabId);
            monitor.lastActivity = Date.now();
            monitor.updateCount++;
        }
    }
    
    // Check if tab is active
    function isTabActive(tabId) {
        var lastActivity = tabActivityTimestamps.get(tabId);
        if (!lastActivity) return false;
        
        var inactiveThreshold = 30 * 60 * 1000; // 30 minutes
        return Date.now() - lastActivity < inactiveThreshold;
    }
    
    // Public API
    return {
        // Handle tab activation
        handleTabActivated: function(tabId) {
            console.log('Tab activated:', tabId);
            
            return new Promise(function(resolve) {
                chrome.tabs.get(tabId, function(tab) {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to get tab:', chrome.runtime.lastError.message);
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                        return;
                    }
                    
                    // Update state
                    StateManager.setCurrentTab(tab);
                    updateTabActivity(tabId);
                    
                    // Start monitoring if needed
                    if (BackgroundTypes.isValidTab(tab)) {
                        startMonitoringTab(tabId);
                    }
                    
                    resolve({
                        success: true,
                        tab: {
                            id: tab.id,
                            url: tab.url,
                            title: tab.title,
                            status: tab.status
                        }
                    });
                });
            });
        },
        
        // Handle tab update
        handleTabUpdated: function(tabId, changeInfo, tab) {
            // Only care about complete status
            if (changeInfo.status !== 'complete') {
                return Promise.resolve({ success: true });
            }
            
            console.log('Tab updated:', tabId, tab.url);
            
            updateTabActivity(tabId);
            
            // Update state
            StateManager.updateTabState(tabId, {
                lastActivity: Date.now(),
                url: tab.url,
                title: tab.title
            });
            
            // Check if we need to clear old data
            if (changeInfo.url) {
                // URL changed, might need to clear markers/highlights
                console.log('Tab URL changed, considering cleanup');
                
                // Notify content script if available
                chrome.tabs.sendMessage(tabId, {
                    action: 'URL_CHANGED',
                    newUrl: tab.url
                }, function() {
                    // Ignore errors if content script not available
                });
            }
            
            return Promise.resolve({
                success: true,
                tabId: tabId,
                url: tab.url
            });
        },
        
        // Handle tab removal
        handleTabRemoved: function(tabId) {
            console.log('Tab removed:', tabId);
            
            // Stop monitoring
            stopMonitoringTab(tabId);
            tabActivityTimestamps.delete(tabId);
            
            // Clean up state
            StateManager.deleteTabState(tabId);
            
            // Clean up storage
            return StorageManager.cleanupTabData(tabId).then(function() {
                console.log('Tab data cleaned up:', tabId);
                return { success: true };
            }).catch(function(error) {
                console.error('Failed to cleanup tab data:', error);
                return { success: false, error: error.message };
            });
        },
        
        // Handle tab replacement
        handleTabReplaced: function(addedTabId, removedTabId) {
            console.log('Tab replaced:', removedTabId, '->', addedTabId);
            
            // Transfer state if possible
            var oldState = StateManager.getTabState(removedTabId);
            if (oldState) {
                StateManager.updateTabState(addedTabId, oldState);
                StateManager.deleteTabState(removedTabId);
            }
            
            // Transfer monitoring
            if (tabMonitors.has(removedTabId)) {
                var monitor = tabMonitors.get(removedTabId);
                tabMonitors.set(addedTabId, monitor);
                tabMonitors.delete(removedTabId);
            }
            
            // Transfer activity
            if (tabActivityTimestamps.has(removedTabId)) {
                tabActivityTimestamps.set(addedTabId, tabActivityTimestamps.get(removedTabId));
                tabActivityTimestamps.delete(removedTabId);
            }
            
            return Promise.resolve({ success: true });
        },
        
        // Get tab info
        getTabInfo: function(tabId) {
            if (!tabId) {
                // Get active tab
                return new Promise(function(resolve) {
                    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                        if (tabs && tabs[0]) {
                            resolve({
                                success: true,
                                tab: {
                                    id: tabs[0].id,
                                    url: tabs[0].url,
                                    title: tabs[0].title,
                                    status: tabs[0].status,
                                    active: true
                                }
                            });
                        } else {
                            resolve({
                                success: false,
                                error: 'No active tab found'
                            });
                        }
                    });
                });
            }
            
            return new Promise(function(resolve) {
                chrome.tabs.get(tabId, function(tab) {
                    if (chrome.runtime.lastError) {
                        resolve({
                            success: false,
                            error: chrome.runtime.lastError.message
                        });
                    } else {
                        resolve({
                            success: true,
                            tab: {
                                id: tab.id,
                                url: tab.url,
                                title: tab.title,
                                status: tab.status,
                                active: tab.active
                            }
                        });
                    }
                });
            });
        },
        
        // Get all tabs
        getAllTabs: function(windowId) {
            return new Promise(function(resolve) {
                var queryOptions = {};
                if (windowId) {
                    queryOptions.windowId = windowId;
                }
                
                chrome.tabs.query(queryOptions, function(tabs) {
                    var tabInfos = tabs.map(function(tab) {
                        return {
                            id: tab.id,
                            url: tab.url,
                            title: tab.title,
                            status: tab.status,
                            active: tab.active,
                            index: tab.index
                        };
                    });
                    
                    resolve({
                        success: true,
                        tabs: tabInfos
                    });
                });
            });
        },
        
        // Check if tab exists
        tabExists: function(tabId) {
            return new Promise(function(resolve) {
                chrome.tabs.get(tabId, function(tab) {
                    resolve(!chrome.runtime.lastError && !!tab);
                });
            });
        },
        
        // Focus tab
        focusTab: function(tabId) {
            return new Promise(function(resolve) {
                chrome.tabs.update(tabId, { active: true }, function(tab) {
                    if (chrome.runtime.lastError) {
                        resolve({
                            success: false,
                            error: chrome.runtime.lastError.message
                        });
                    } else {
                        // Also focus the window
                        chrome.windows.update(tab.windowId, { focused: true }, function() {
                            resolve({ success: true });
                        });
                    }
                });
            });
        },
        
        // Reload tab
        reloadTab: function(tabId) {
            return new Promise(function(resolve) {
                chrome.tabs.reload(tabId, function() {
                    if (chrome.runtime.lastError) {
                        resolve({
                            success: false,
                            error: chrome.runtime.lastError.message
                        });
                    } else {
                        resolve({ success: true });
                    }
                });
            });
        },
        
        // Execute script in tab
        executeScript: function(tabId, script) {
            return new Promise(function(resolve) {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: script
                }, function(results) {
                    if (chrome.runtime.lastError) {
                        resolve({
                            success: false,
                            error: chrome.runtime.lastError.message
                        });
                    } else {
                        resolve({
                            success: true,
                            result: results && results[0] ? results[0].result : null
                        });
                    }
                });
            });
        },
        
        // Inject content script
        injectContentScript: function(tabId) {
            return new Promise(function(resolve) {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['src/content/content-script.js']
                }, function() {
                    if (chrome.runtime.lastError) {
                        resolve({
                            success: false,
                            error: chrome.runtime.lastError.message
                        });
                    } else {
                        resolve({ success: true });
                    }
                });
            });
        },
        
        // Send message to tab
        sendMessageToTab: function(tabId, message) {
            return new Promise(function(resolve) {
                chrome.tabs.sendMessage(tabId, message, function(response) {
                    if (chrome.runtime.lastError) {
                        resolve({
                            success: false,
                            error: chrome.runtime.lastError.message
                        });
                    } else {
                        resolve(response || { success: true });
                    }
                });
            });
        },
        
        // Monitor tab
        startMonitoring: function(tabId) {
            startMonitoringTab(tabId);
            return { success: true };
        },
        
        // Stop monitoring tab
        stopMonitoring: function(tabId) {
            stopMonitoringTab(tabId);
            return { success: true };
        },
        
        // Get tab monitoring info
        getMonitoringInfo: function(tabId) {
            var monitor = tabMonitors.get(tabId);
            if (!monitor) {
                return {
                    isMonitored: false,
                    isActive: false
                };
            }
            
            return {
                isMonitored: true,
                isActive: isTabActive(tabId),
                startTime: monitor.startTime,
                lastActivity: monitor.lastActivity,
                updateCount: monitor.updateCount,
                duration: Date.now() - monitor.startTime
            };
        },
        
        // Get all monitored tabs
        getMonitoredTabs: function() {
            var monitored = [];
            tabMonitors.forEach(function(monitor, tabId) {
                monitored.push({
                    tabId: tabId,
                    isActive: isTabActive(tabId),
                    startTime: monitor.startTime,
                    lastActivity: monitor.lastActivity,
                    updateCount: monitor.updateCount
                });
            });
            return monitored;
        },
        
        // Clean up inactive tabs
        cleanupInactiveTabs: function() {
            var cleaned = [];
            var now = Date.now();
            var maxInactivity = 60 * 60 * 1000; // 1 hour
            
            tabActivityTimestamps.forEach(function(timestamp, tabId) {
                if (now - timestamp > maxInactivity) {
                    TabHandler.handleTabRemoved(tabId);
                    cleaned.push(tabId);
                }
            });
            
            console.log('Cleaned up inactive tabs:', cleaned.length);
            return cleaned;
        },
        
        // Get tab statistics
        getStatistics: function() {
            return {
                totalMonitored: tabMonitors.size,
                totalTracked: tabActivityTimestamps.size,
                activeTabs: Array.from(tabActivityTimestamps.keys()).filter(isTabActive).length,
                monitoredTabs: this.getMonitoredTabs()
            };
        }
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.TabHandler = TabHandler;
}
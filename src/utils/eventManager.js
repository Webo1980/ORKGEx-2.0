// ================================
// src/utils/eventManager.js - Simple Event System
// ================================

/**
 * Simple Event Manager for ORKG Annotator
 */
class EventManager {
    constructor() {
        this.events = new Map();
        this.debugMode = false;
    }
    
    /**
     * Add event listener
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        
        this.events.get(eventName).add(callback);
        
        if (this.debugMode) {
            console.log(`📡 Event listener added for: ${eventName}`);
        }
        
        // Return unsubscribe function
        return () => {
            this.off(eventName, callback);
        };
    }
    
    /**
     * Remove event listener
     */
    off(eventName, callback) {
        if (this.events.has(eventName)) {
            this.events.get(eventName).delete(callback);
            
            // Clean up empty event sets
            if (this.events.get(eventName).size === 0) {
                this.events.delete(eventName);
            }
            
            if (this.debugMode) {
                console.log(`📡 Event listener removed for: ${eventName}`);
            }
        }
    }
    
    /**
     * Emit event
     */
    emit(eventName, data = null) {
        if (this.debugMode) {
            console.log(`📡 Emitting event: ${eventName}`, data);
        }
        
        if (this.events.has(eventName)) {
            this.events.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in event listener for ${eventName}:`, error);
                }
            });
        }
        
        // Also emit as DOM event for global listening
        if (typeof document !== 'undefined') {
            try {
                document.dispatchEvent(new CustomEvent(eventName, { detail: data }));
            } catch (error) {
                console.warn(`Failed to emit DOM event for ${eventName}:`, error);
            }
        }
    }
    
    /**
     * Add one-time event listener
     */
    once(eventName, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };
        
        return this.on(eventName, onceCallback);
    }
    
    /**
     * Get all event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }
    
    /**
     * Get listener count for event
     */
    listenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).size : 0;
    }
    
    /**
     * Remove all listeners
     */
    removeAllListeners(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
            if (this.debugMode) {
                console.log(`📡 All listeners removed for: ${eventName}`);
            }
        } else {
            this.events.clear();
            if (this.debugMode) {
                console.log(`📡 All event listeners cleared`);
            }
        }
    }
    
    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`📡 EventManager debug mode: ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get debug info
     */
    getDebugInfo() {
        const info = {};
        for (const [eventName, listeners] of this.events) {
            info[eventName] = listeners.size;
        }
        return {
            totalEvents: this.events.size,
            events: info,
            debugMode: this.debugMode
        };
    }
    
    /**
     * Wait for event (returns a promise)
     */
    waitFor(eventName, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.off(eventName, handler);
                reject(new Error(`Timeout waiting for event: ${eventName}`));
            }, timeout);
            
            const handler = (data) => {
                clearTimeout(timer);
                resolve(data);
            };
            
            this.once(eventName, handler);
        });
    }
}

/**
 * Predefined event constants
 */
export const EVENTS = {
    // Application lifecycle
    APP_INITIALIZING: 'app:initializing',
    APP_READY: 'app:ready',
    APP_ERROR: 'app:error',
    SERVICES_INITIALIZED: 'services:initialized',
    APPLICATION_READY: 'application:ready',
    
    // Navigation events
    NAVIGATE_TO_STEP: 'NAVIGATE_TO_STEP',
    STEP_CHANGED: 'workflow:step_changed',
    
    // Data events
    DATA_SAVED: 'data:saved',
    DATA_LOADED: 'data:loaded',
    DATA_CLEARED: 'data:cleared',
    DATA_UPDATED: 'data:updated',
    
    // UI events
    UI_THEME_CHANGED: 'ui:theme_changed',
    TAB_ACTIVATED: 'tab:activated',
    TAB_UPDATED: 'tab:updated',
    LOADING_SHOW: 'loading:show',
    LOADING_HIDE: 'loading:hide',
    
    // Toast events
    TOAST_SHOW: 'toast:show',
    TOAST_HIDE: 'toast:hide',
    TOAST_CLEAR: 'toast:clear',
    TOAST_SUCCESS: 'toast:success',
    TOAST_ERROR: 'toast:error',
    TOAST_WARNING: 'toast:warning',
    TOAST_INFO: 'toast:info',
    
    // Error events
    ERROR_OCCURRED: 'error:occurred',
    ERROR_GLOBAL: 'error:global',
    
    // Workflow events
    WORKFLOW_RESET: 'workflow:reset',
    WORKFLOW_USER_RESET_REQUESTED: 'workflow:user_reset_requested',
    
    // Content events
    CONTENT_LOADED: 'content:loaded',
    CONTENT_SHOW: 'content:show',
    CONTENT_HIDE: 'content:hide',
    COMPONENT_REGISTERED: 'content:component_registered',
    
    // Button events
    BUTTON_CLICKED: 'button:clicked',
    
    // Metadata events
    METADATA_EXTRACTED: 'metadata:extracted',
    METADATA_UPDATED: 'metadata:updated',
    
    // Help events
    HELP_REQUESTED: 'help:requested',
    DEMO_STARTED: 'demo:started',
    
    // Configuration events
    CONFIG_UPDATED: 'config:updated',
    THEME_CHANGED: 'theme:changed',
    
    // Validation events
    VALIDATION_STARTED: 'validation:started',
    VALIDATION_COMPLETED: 'validation:completed',
    VALIDATION_FAILED: 'validation:failed'
};

// Create and export singleton instance
export const eventManager = new EventManager();

// Make available globally for debugging
if (typeof window !== 'undefined') {
    window.eventManager = eventManager;
    
    // Add debug helper
    window.debugEvents = () => {
        console.log('📡 EventManager Debug Info:', eventManager.getDebugInfo());
        return eventManager.getDebugInfo();
    };
    
    window.enableEventDebug = () => {
        eventManager.setDebugMode(true);
    };
    
    window.disableEventDebug = () => {
        eventManager.setDebugMode(false);
    };
}

export default eventManager;
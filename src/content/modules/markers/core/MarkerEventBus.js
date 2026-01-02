// src/content/modules/markers/core/MarkerEventBus.js

(function(global) {
    'use strict';
    
    /**
     * Event bus for marker system communication
     * Implements observer pattern for decoupled communication
     */
    class MarkerEventBus {
        constructor() {
            this.events = new Map();
            this.wildcardListeners = new Set();
        }
        
        /**
         * Subscribe to an event
         */
        on(event, callback, context = null) {
            if (!this.events.has(event)) {
                this.events.set(event, new Set());
            }
            
            this.events.get(event).add({
                callback,
                context,
                once: false
            });
            
            return () => this.off(event, callback);
        }
        
        /**
         * Subscribe to an event once
         */
        once(event, callback, context = null) {
            if (!this.events.has(event)) {
                this.events.set(event, new Set());
            }
            
            this.events.get(event).add({
                callback,
                context,
                once: true
            });
            
            return () => this.off(event, callback);
        }
        
        /**
         * Unsubscribe from an event
         */
        off(event, callback) {
            const listeners = this.events.get(event);
            if (!listeners) return;
            
            for (const listener of listeners) {
                if (listener.callback === callback) {
                    listeners.delete(listener);
                    break;
                }
            }
            
            if (listeners.size === 0) {
                this.events.delete(event);
            }
        }
        
        /**
         * Emit an event
         */
        emit(event, data) {
            // Notify specific listeners
            const listeners = this.events.get(event);
            if (listeners) {
                const toRemove = [];
                
                for (const listener of listeners) {
                    try {
                        listener.callback.call(listener.context, data);
                        
                        if (listener.once) {
                            toRemove.push(listener);
                        }
                    } catch (error) {
                        console.error(`Error in event listener for ${event}:`, error);
                    }
                }
                
                // Remove one-time listeners
                for (const listener of toRemove) {
                    listeners.delete(listener);
                }
            }
            
            // Notify wildcard listeners
            for (const listener of this.wildcardListeners) {
                try {
                    listener.callback.call(listener.context, event, data);
                } catch (error) {
                    console.error(`Error in wildcard listener:`, error);
                }
            }
        }
        
        /**
         * Subscribe to all events
         */
        onAll(callback, context = null) {
            this.wildcardListeners.add({
                callback,
                context
            });
            
            return () => this.offAll(callback);
        }
        
        /**
         * Unsubscribe from all events
         */
        offAll(callback) {
            for (const listener of this.wildcardListeners) {
                if (listener.callback === callback) {
                    this.wildcardListeners.delete(listener);
                    break;
                }
            }
        }
        
        /**
         * Clear all listeners for an event
         */
        clear(event) {
            this.events.delete(event);
        }
        
        /**
         * Clear all listeners
         */
        clearAll() {
            this.events.clear();
            this.wildcardListeners.clear();
        }
        
        /**
         * Get listener count for an event
         */
        listenerCount(event) {
            const listeners = this.events.get(event);
            return listeners ? listeners.size : 0;
        }
        
        /**
         * Get all event names
         */
        eventNames() {
            return Array.from(this.events.keys());
        }
    }
    
    // Create singleton instance
    global.MarkerEventBus = new MarkerEventBus();
    
})(typeof window !== 'undefined' ? window : this);
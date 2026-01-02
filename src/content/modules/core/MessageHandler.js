// src/content/modules/core/MessageHandler.js
// Centralized message handling system for communication between 
// content script and background/popup scripts.
/**
 * Message Handler for ORKG Content Script
 * 
 * Provides a centralized system for handling messages between content script
 * and background/popup with the following features:
 * - Action-based message routing
 * - Promise-based messaging
 * - Error handling and logging
 * - Extension context validation
 */
import serviceRegistry from './ServiceRegistry.js';

class MessageHandler {
  constructor() {
    this.handlers = new Map();
    this.listener = null;
    this.isInitialized = false;
  }
  
  /**
   * Initialize the message handler
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isInitialized) {
      console.warn('MessageHandler already initialized');
      return;
    }
    
    this.setupMessageListener();
    this.isInitialized = true;
    console.log('✅ MessageHandler initialized');
  }
  
  /**
   * Register a handler for a specific action
   * @param {string} action - Action identifier
   * @param {Function} handler - Handler function
   * @returns {MessageHandler} - For method chaining
   */
  registerHandler(action, handler) {
    if (!action || typeof action !== 'string') {
      console.error('Action must be a non-empty string');
      return this;
    }
    
    if (typeof handler !== 'function') {
      console.error(`Handler for ${action} must be a function`);
      return this;
    }
    
    this.handlers.set(action, handler);
    console.log(`📝 Registered message handler for: ${action}`);
    return this;
  }
  
  /**
   * Setup the message listener
   * @private
   */
  setupMessageListener() {
    // Remove existing listener if present
    if (this.listener && this.isExtensionContextValid()) {
      chrome.runtime.onMessage.removeListener(this.listener);
    }
    
    // Create new listener
    this.listener = (message, sender, sendResponse) => {
      if (!this.isExtensionContextValid()) {
        console.warn('Extension context invalidated, cannot handle message');
        return false;
      }
      
      const { action } = message;
      
      if (!action) {
        console.warn('Received message without action', message);
        sendResponse({ success: false, error: 'No action specified' });
        return false;
      }
      
      console.log(`📨 Received message: ${action}`);
      
      // Get handler for this action
      const handler = this.handlers.get(action);
      
      if (!handler) {
        console.warn(`No handler registered for action: ${action}`);
        sendResponse({ success: false, error: `Unhandled action: ${action}` });
        return false;
      }
      
      try {
        // Call handler and check if it returns a promise
        const result = handler(message, sender);
        
        if (result instanceof Promise) {
          // Keep the message channel open for async response
          result
            .then(data => {
              if (this.isExtensionContextValid()) {
                sendResponse({ success: true, data });
              }
            })
            .catch(error => {
              console.error(`Error in async handler for ${action}:`, error);
              if (this.isExtensionContextValid()) {
                sendResponse({ 
                  success: false, 
                  error: error.message || 'Error handling message' 
                });
              }
            });
          
          return true; // Keep the message channel open
        } else {
          // Synchronous response
          sendResponse({ success: true, data: result });
          return false;
        }
      } catch (error) {
        console.error(`Error in handler for ${action}:`, error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Error handling message' 
        });
        return false;
      }
    };
    
    // Add listener if extension context is valid
    if (this.isExtensionContextValid()) {
      chrome.runtime.onMessage.addListener(this.listener);
      console.log('📡 Message listener attached');
    } else {
      console.warn('Cannot attach message listener - invalid extension context');
    }
  }
  
  /**
   * Send message to background script
   * @param {Object} message - Message to send
   * @returns {Promise<any>} - Response from background
   */
  sendToBackground(message) {
    return new Promise((resolve, reject) => {
      if (!this.isExtensionContextValid()) {
        reject(new Error('Extension context invalidated, cannot send message'));
        return;
      }
      
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  /**
   * Check if extension context is valid
   * @returns {boolean} - True if context is valid
   */
  isExtensionContextValid() {
    try {
      return chrome && chrome.runtime && chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Clean up the message handler
   */
  cleanup() {
    if (this.listener && this.isExtensionContextValid()) {
      chrome.runtime.onMessage.removeListener(this.listener);
    }
    
    this.handlers.clear();
    this.listener = null;
    this.isInitialized = false;
    
    console.log('🧹 MessageHandler cleaned up');
  }
}

// Create instance
const messageHandler = new MessageHandler();

// Register with service registry
serviceRegistry.register('messageHandler', messageHandler);

export default messageHandler;
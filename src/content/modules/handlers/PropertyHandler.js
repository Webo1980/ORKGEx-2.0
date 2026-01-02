// ================================
// src/content/modules/handlers/PropertyHandler.js
// ================================

(function(global) {
  'use strict';
  
  /**
   * PropertyHandler Service
   * 
   * Handles all property window related messages and operations
   * including showing, hiding, updating, and managing property selections
   */
  class PropertyHandler {
    constructor() {
      this.isInitialized = false;
      this.propertyWindow = null;
      this.selectionManager = null;
      
      // Property-specific state
      this.state = {
        windowVisible: false,
        selectedText: '',
        selectedProperty: null,
        properties: [],
        aiSuggestions: [],
        currentColor: null,
        position: { x: 0, y: 0 }
      };
      
      console.log('🏷️ PropertyHandler instance created');
    }
    
    /**
     * Initialize the property handler
     */
    async init() {
      if (this.isInitialized) {
        console.warn('PropertyHandler already initialized');
        return;
      }
      
      console.log('🏷️ Initializing PropertyHandler...');
      
      try {
        // Setup dependencies
        this.setupDependencies();
        
        // Register message handlers
        this.registerMessageHandlers();
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ PropertyHandler initialized');
      } catch (error) {
        console.error('❌ Failed to initialize PropertyHandler:', error);
        throw error;
      }
    }
    
    /**
     * Setup dependencies from service registry
     * @private
     */
    setupDependencies() {
      const registry = global.serviceRegistry;
      if (!registry) return;
      
      // Get SelectionManager
      this.selectionManager = registry.get('selectionManager');
      
      // Get or create PropertyWindow
      if (typeof PropertyWindow !== 'undefined') {
        this.propertyWindow = new PropertyWindow();
      } else if (typeof PropertyWindow !== 'undefined') {
        this.propertyWindow = new PropertyWindow();
      } else {
        this.propertyWindow = registry.get('propertyWindow');
      }
      
      // Register property window with service registry if not already registered
      if (this.propertyWindow && !registry.has('propertyWindow')) {
        registry.register('propertyWindow', this.propertyWindow);
      }
      
      console.log('🏷️ Dependencies setup:', {
        hasSelectionManager: !!this.selectionManager,
        hasPropertyWindow: !!this.propertyWindow
      });
    }
    
    /**
     * Register message handlers with MessageHandler
     * @private
     */
    registerMessageHandlers() {
      const messageHandler = global.serviceRegistry?.get('messageHandler');
      if (!messageHandler) {
        console.warn('⚠️ MessageHandler not available for PropertyHandler');
        return;
      }
      
      // Register property-specific message handlers
      messageHandler.registerHandler('SHOW_PROPERTY_WINDOW', (msg) => this.handleShowWindow(msg));
      messageHandler.registerHandler('HIDE_PROPERTY_WINDOW', (msg) => this.handleHideWindow(msg));
      messageHandler.registerHandler('UPDATE_PROPERTY_WINDOW', (msg) => this.handleUpdateWindow(msg));
      messageHandler.registerHandler('SET_SELECTED_PROPERTY', (msg) => this.handleSetSelectedProperty(msg));
      messageHandler.registerHandler('GET_PROPERTY_SUGGESTIONS', (msg) => this.handleGetSuggestions(msg));
      messageHandler.registerHandler('APPLY_HIGHLIGHT', (msg) => this.handleApplyHighlight(msg));
      messageHandler.registerHandler('GET_PROPERTY_STATUS', () => this.handleGetStatus());
      
      console.log('🏷️ Property message handlers registered');
    }
    
    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
      // Listen for text selection events from SelectionManager
      if (this.selectionManager) {
        // SelectionManager will call showPropertyWindow directly
        console.log('🏷️ Connected to SelectionManager');
      }
      
      // Listen for property window events
      if (this.propertyWindow) {
        // Property window will send messages through chrome.runtime.sendMessage
        console.log('🏷️ Connected to PropertyWindow');
      }
    }
    
    // ================================
    // Message Handlers
    // ================================
    
    /**
     * Handle show property window
     */
    async handleShowWindow(message) {
      try {
        console.log('🏷️ Showing property window');
        
        // Update state
        this.state.windowVisible = true;
        this.state.selectedText = message.text || '';
        this.state.position = message.position || { x: 0, y: 0 };
        
        // Create or show property window
        if (!this.propertyWindow) {
          this.createPropertyWindow();
        }
        
        if (this.propertyWindow) {
          // Initialize if needed
          if (typeof this.propertyWindow.init === 'function' && !this.propertyWindow.isInitialized) {
            await this.propertyWindow.init();
          }
          
          // Show window
          if (typeof this.propertyWindow.show === 'function') {
            this.propertyWindow.show(this.state.selectedText, this.state.position);
          }
          
          // Load properties if requested
          if (message.loadProperties) {
            await this.loadProperties(message.query);
          }
          
          // Get AI suggestions if requested
          if (message.getSuggestions) {
            await this.getAISuggestions(this.state.selectedText);
          }
        }
        
        return { success: true };
        
      } catch (error) {
        console.error('❌ Error showing property window:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle hide property window
     */
    async handleHideWindow(message) {
      try {
        console.log('🏷️ Hiding property window');
        
        // Update state
        this.state.windowVisible = false;
        
        // Hide window
        if (this.propertyWindow && typeof this.propertyWindow.hide === 'function') {
          this.propertyWindow.hide();
        }
        
        // Clear state if requested
        if (message.clearState) {
          this.clearState();
        }
        
        return { success: true };
        
      } catch (error) {
        console.error('❌ Error hiding property window:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle update property window
     */
    async handleUpdateWindow(message) {
      try {
        console.log('🏷️ Updating property window');
        
        // Update properties list
        if (message.properties) {
          this.state.properties = message.properties;
          
          if (this.propertyWindow && typeof this.propertyWindow.updateProperties === 'function') {
            this.propertyWindow.updateProperties(message.properties);
          }
        }
        
        // Update AI suggestions
        if (message.suggestions) {
          this.state.aiSuggestions = message.suggestions;
          
          if (this.propertyWindow && typeof this.propertyWindow.updateSuggestions === 'function') {
            this.propertyWindow.updateSuggestions(message.suggestions);
          }
        }
        
        // Update selected color
        if (message.color) {
          this.state.currentColor = message.color;
          
          if (this.propertyWindow && typeof this.propertyWindow.setColor === 'function') {
            this.propertyWindow.setColor(message.color);
          }
        }
        
        // Update position
        if (message.position) {
          this.state.position = message.position;
          
          if (this.propertyWindow && typeof this.propertyWindow.updatePosition === 'function') {
            this.propertyWindow.updatePosition(message.position);
          }
        }
        
        return { success: true };
        
      } catch (error) {
        console.error('❌ Error updating property window:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle set selected property
     */
    async handleSetSelectedProperty(message) {
      try {
        console.log('🏷️ Setting selected property:', message.property);
        
        this.state.selectedProperty = message.property;
        
        // Update window if visible
        if (this.state.windowVisible && this.propertyWindow) {
          if (typeof this.propertyWindow.setSelectedProperty === 'function') {
            this.propertyWindow.setSelectedProperty(message.property);
          }
        }
        
        // Apply highlight if requested
        if (message.applyHighlight) {
          await this.applyPropertyHighlight();
        }
        
        return { success: true, property: this.state.selectedProperty };
        
      } catch (error) {
        console.error('❌ Error setting selected property:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle get property suggestions
     */
    async handleGetSuggestions(message) {
      try {
        console.log('🏷️ Getting property suggestions for:', message.text);
        
        const suggestions = await this.getAISuggestions(message.text || this.state.selectedText);
        
        return { 
          success: true, 
          suggestions: suggestions 
        };
        
      } catch (error) {
        console.error('❌ Error getting suggestions:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle apply property highlight
     */
    async handleApplyHighlight(message) {
      try {
        console.log('🏷️ Applying property highlight');
        
        const property = message.property || this.state.selectedProperty;
        const color = message.color || this.state.currentColor || this.getRandomColor();
        const text = message.text || this.state.selectedText;
        
        if (!property || !text) {
          return { success: false, error: 'Missing property or text' };
        }
        
        // Get text highlighter
        const textHighlighter = global.TextHighlighter || 
                               global.serviceRegistry?.get('textHighlighter');
        
        if (textHighlighter) {
          // Apply highlight
          const result = textHighlighter.highlightSelection?.(property, color) || 
                        textHighlighter.highlight?.(text, property, color);
          
          if (result) {
            // Hide property window after successful highlight
            if (message.hideWindow !== false) {
              await this.handleHideWindow({ clearState: false });
            }
            
            return { success: true, highlightId: result.id };
          }
        }
        
        return { success: false, error: 'Could not apply highlight' };
        
      } catch (error) {
        console.error('❌ Error applying highlight:', error);
        return { success: false, error: error.message };
      }
    }
    
    /**
     * Handle get property status
     */
    handleGetStatus() {
      return {
        isInitialized: this.isInitialized,
        windowVisible: this.state.windowVisible,
        hasSelectedText: !!this.state.selectedText,
        hasSelectedProperty: !!this.state.selectedProperty,
        propertyCount: this.state.properties.length,
        suggestionCount: this.state.aiSuggestions.length,
        hasPropertyWindow: !!this.propertyWindow,
        hasSelectionManager: !!this.selectionManager
      };
    }
    
    // ================================
    // Helper Methods
    // ================================
    
    /**
     * Create property window instance
     * @private
     */
    createPropertyWindow() {
      if (typeof PropertyWindow !== 'undefined') {
        this.propertyWindow = new PropertyWindow();
      } else if (typeof PropertyWindow !== 'undefined') {
        this.propertyWindow = new PropertyWindow();
      } else {
        console.warn('⚠️ Property window class not available');
      }
      
      if (this.propertyWindow) {
        // Register with service registry
        const registry = global.serviceRegistry;
        if (registry && !registry.has('propertyWindow')) {
          registry.register('propertyWindow', this.propertyWindow);
        }
      }
    }
    
    /**
     * Load properties from ORKG
     * @private
     */
    async loadProperties(query = '') {
      try {
        // Send message to background to fetch properties
        const response = await this.sendToBackground({
          action: 'FETCH_ORKG_PROPERTIES',
          query: query
        });
        
        if (response.success && response.properties) {
          this.state.properties = response.properties;
          
          // Update window
          if (this.propertyWindow && typeof this.propertyWindow.updateProperties === 'function') {
            this.propertyWindow.updateProperties(response.properties);
          }
        }
        
        return response.properties || [];
        
      } catch (error) {
        console.error('Error loading properties:', error);
        return [];
      }
    }
    
    /**
     * Get AI suggestions for text
     * @private
     */
    async getAISuggestions(text) {
      if (!text) return [];
      
      try {
        // Send message to background to get AI suggestions
        const response = await this.sendToBackground({
          action: 'GET_AI_PROPERTY_SUGGESTIONS',
          text: text
        });
        
        if (response.success && response.suggestions) {
          this.state.aiSuggestions = response.suggestions;
          
          // Update window
          if (this.propertyWindow && typeof this.propertyWindow.updateSuggestions === 'function') {
            this.propertyWindow.updateSuggestions(response.suggestions);
          }
        }
        
        return response.suggestions || [];
        
      } catch (error) {
        console.error('Error getting AI suggestions:', error);
        return [];
      }
    }
    
    /**
     * Apply property highlight to selected text
     * @private
     */
    async applyPropertyHighlight() {
      return this.handleApplyHighlight({
        property: this.state.selectedProperty,
        color: this.state.currentColor,
        text: this.state.selectedText,
        hideWindow: true
      });
    }
    
    /**
     * Get random color for highlights
     * @private
     */
    getRandomColor() {
      const colors = [
        '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
        '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3'
      ];
      return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Send message to background
     * @private
     */
    sendToBackground(message) {
      return new Promise((resolve, reject) => {
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage(message, response => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response || {});
            }
          });
        } else {
          reject(new Error('Chrome runtime not available'));
        }
      });
    }
    
    /**
     * Clear state
     * @private
     */
    clearState() {
      this.state = {
        windowVisible: false,
        selectedText: '',
        selectedProperty: null,
        properties: [],
        aiSuggestions: [],
        currentColor: null,
        position: { x: 0, y: 0 }
      };
    }
    
    // ================================
    // Public API Methods
    // ================================
    
    /**
     * Show property window programmatically
     */
    showWindow(text, position, options = {}) {
      return this.handleShowWindow({
        text,
        position,
        ...options
      });
    }
    
    /**
     * Hide property window programmatically
     */
    hideWindow(clearState = false) {
      return this.handleHideWindow({ clearState });
    }
    
    /**
     * Update property window
     */
    updateWindow(updates) {
      return this.handleUpdateWindow(updates);
    }
    
    /**
     * Set selected property
     */
    setSelectedProperty(property, applyHighlight = false) {
      return this.handleSetSelectedProperty({ property, applyHighlight });
    }
    
    /**
     * Check if window is visible
     */
    isWindowVisible() {
      return this.state.windowVisible;
    }
    
    /**
     * Get current state
     */
    getState() {
      return { ...this.state };
    }
    
    /**
     * Get selected text
     */
    getSelectedText() {
      return this.state.selectedText;
    }
    
    /**
     * Get selected property
     */
    getSelectedProperty() {
      return this.state.selectedProperty;
    }
    
    /**
     * Clean up the handler
     */
    cleanup() {
      console.log('🧹 Cleaning up PropertyHandler...');
      
      // Hide window
      if (this.propertyWindow) {
        this.hideWindow(true);
        
        // Clean up property window if it has cleanup method
        if (typeof this.propertyWindow.cleanup === 'function') {
          this.propertyWindow.cleanup();
        }
      }
      
      // Clear state
      this.clearState();
      
      this.isInitialized = false;
      
      console.log('✅ PropertyHandler cleanup completed');
    }
  }
  
  // Create instance
  const propertyHandler = new PropertyHandler();
  
  // Register with service registry
  if (global.serviceRegistry) {
    global.serviceRegistry.register('propertyHandler', propertyHandler);
  }
  
  // Expose globally for backward compatibility
  global.propertyHandler = propertyHandler;
  global.PropertyHandler = PropertyHandler;
  
  console.log('📢 PropertyHandler exposed to global scope');
  
})(typeof window !== 'undefined' ? window : this);
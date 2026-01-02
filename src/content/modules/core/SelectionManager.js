// src/content/modules/core/SelectionManager.js
// Handles text selection, highlighting, and property window management
// based on user interactions with page content.
/**
 * Selection Manager for ORKG Content Script
 * 
 * Handles text selection with the following features:
 * - Debounced selection handling
 * - Context extraction
 * - Position calculation
 * - Integration with property window
 */
import serviceRegistry from './ServiceRegistry.js';

class SelectionManager {
  constructor() {
    this.isInitialized = false;
    this.isEnabled = false;
    this.selectedText = '';
    this.selectionTimeout = null;
    this.lastSelectionTime = 0;
    
    // Configuration
    this.config = {
      minTextLength: 3,
      maxTextLength: 500,
      selectionDelay: 300,
      autoShowWindow: true,
      enableKeyboardShortcuts: true
    };
  }
  
  /**
   * Initialize the selection manager
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isInitialized) {
      console.warn('SelectionManager already initialized');
      return;
    }
    
    console.log('🔍 Initializing SelectionManager...');
    
    // Don't activate listeners yet - wait for enable() call
    this.isInitialized = true;
    console.log('✅ SelectionManager initialized');
  }
  
  /**
   * Enable text selection handling
   * @param {Object} [config] - Optional configuration override
   */
  enable(config = {}) {
    if (!this.isInitialized) {
      console.warn('Cannot enable SelectionManager - not initialized');
      return;
    }
    
    if (this.isEnabled) {
      console.log('SelectionManager already enabled');
      return;
    }
    
    // Merge config
    this.config = { ...this.config, ...config };
    
    // Set up event listeners
    this.setupEventListeners();
    
    this.isEnabled = true;
    console.log('🔍 Text selection handling enabled');
  }
  
  /**
   * Disable text selection handling
   */
  disable() {
    if (!this.isEnabled) {
      return;
    }
    
    this.removeEventListeners();
    this.isEnabled = false;
    
    console.log('🔍 Text selection handling disabled');
  }
  
  /**
   * Set up event listeners for text selection
   * @private
   */
  setupEventListeners() {
    // Handle mouseup for selection
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Handle selection changes
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    // Keyboard shortcuts
    if (this.config.enableKeyboardShortcuts) {
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    console.log('🔍 Selection event listeners attached');
  }
  
  /**
   * Remove event listeners
   * @private
   */
  removeEventListeners() {
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('selectionchange', this.handleSelectionChange.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
  
  /**
   * Handle mouse up event for selection
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  handleMouseUp(event) {
    // Clear previous timeout
    clearTimeout(this.selectionTimeout);
    
    // Don't process if clicking on the property window itself
    if (event.target.closest('.orkg-property-selection-window, .orkg-property-window')) {
      return;
    }
    
    // Debounce selection handling
    this.selectionTimeout = setTimeout(() => {
      this.processTextSelection(event);
    }, this.config.selectionDelay);
  }
  
  /**
   * Handle selection change event
   * @private
   */
  handleSelectionChange() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Only track selection changes, don't hide window
    if (selectedText && selectedText.length >= this.config.minTextLength) {
      this.selectedText = selectedText;
    }
  }
  
  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  handleKeyDown(event) {
    // Ctrl+Shift+H: Toggle property window for current selection
    if (event.ctrlKey && event.shiftKey && event.key === 'H') {
      event.preventDefault();
      this.togglePropertyWindow();
    }
  }
  
  /**
   * Process text selection
   * @param {MouseEvent} event - Mouse event
   * @private
   */
  processTextSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // Validate selection
    if (!this.isValidSelection(selectedText)) {
      return;
    }
    
    this.selectedText = selectedText;
    this.lastSelectionTime = Date.now();
    
    // Get selection position for popup positioning
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    const position = {
      x: rect.right + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
    
    // Extract context information
    const context = this.getSelectionContext();
    
    // Show property window if auto-show is enabled
    if (this.config.autoShowWindow) {
      this.showPropertyWindow(selectedText, position);
    }
    
    // Emit selection event
    this.emitSelectionEvent(selectedText, position, context);
  }
  
  /**
   * Check if selection is valid
   * @param {string} text - Selected text
   * @returns {boolean} - True if selection is valid
   * @private
   */
  isValidSelection(text) {
    return text && 
           text.length >= this.config.minTextLength && 
           text.length <= this.config.maxTextLength &&
           !this.isPartOfUIElement(text);
  }
  
  /**
   * Check if selection is part of UI element
   * @param {string} text - Selected text
   * @returns {boolean} - True if selection is part of UI element
   * @private
   */
  isPartOfUIElement() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return true;
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    
    // Skip if in certain elements
    const skipSelectors = [
      '.orkg-property-window',
      '.orkg-property-selection-window',
      'nav', 'header', 'footer',
      '.navigation', '.menu', '.toolbar',
      'button', 'input', 'textarea', 'select'
    ];
    
    return skipSelectors.some(selector => element.closest(selector));
  }
  
  /**
   * Get context information for selection
   * @returns {Object} - Context information
   * @private
   */
  getSelectionContext() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return {};
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    
    // Try to determine the section/context
    const section = this.findSectionContext(element);
    
    return {
      section: section,
      pageTitle: document.title,
      pageUrl: window.location.href,
      elementTagName: element.tagName,
      elementClass: element.className,
      surroundingText: this.getSurroundingText(range, 100)
    };
  }
  
  /**
   * Find section context for element
   * @param {Element} element - Element to find section for
   * @returns {string} - Section name
   * @private
   */
  findSectionContext(element) {
    // Try to find which section of the paper this text is from
    const sectionSelectors = [
      { selector: '.abstract, #abstract, [class*="abstract"]', name: 'abstract' },
      { selector: '.introduction, #introduction, [class*="introduction"]', name: 'introduction' },
      { selector: '.methods, #methods, [class*="method"]', name: 'methods' },
      { selector: '.results, #results, [class*="result"]', name: 'results' },
      { selector: '.discussion, #discussion, [class*="discussion"]', name: 'discussion' },
      { selector: '.conclusion, #conclusion, [class*="conclusion"]', name: 'conclusion' },
      { selector: '.references, #references, [class*="reference"]', name: 'references' }
    ];
    
    for (const { selector, name } of sectionSelectors) {
      if (element.closest(selector)) {
        return name;
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Get surrounding text for context
   * @param {Range} range - Selection range
   * @param {number} maxLength - Maximum length of text
   * @returns {string} - Surrounding text
   * @private
   */
  getSurroundingText(range, maxLength) {
    const container = range.commonAncestorContainer;
    const fullText = container.textContent || '';
    const selectedText = range.toString();
    const startIndex = fullText.indexOf(selectedText);
    
    if (startIndex === -1) return '';
    
    const beforeStart = Math.max(0, startIndex - maxLength / 2);
    const afterEnd = Math.min(fullText.length, startIndex + selectedText.length + maxLength / 2);
    
    return fullText.substring(beforeStart, afterEnd);
  }
  
  /**
   * Show property window for selection
   * @param {string} selectedText - Selected text
   * @param {Object} position - Position information
   */
  showPropertyWindow(selectedText, position) {
      const propertyWindow = serviceRegistry.get('propertyWindow');
      
      if (propertyWindow) {
          // Initialize if needed
          if (!propertyWindow.isInitialized && propertyWindow.init) {
              propertyWindow.init();
          }
          propertyWindow.show(selectedText, position);
      } else {
          console.warn('PropertyWindow service not available');
      }
  }
  
  /**
   * Hide property window
   */
  hidePropertyWindow() {
    const propertyWindow = serviceRegistry.get('propertyWindow');
    
    if (propertyWindow && typeof propertyWindow.hide === 'function') {
      propertyWindow.hide();
    }
  }
  
  /**
   * Toggle property window visibility
   */
  togglePropertyWindow() {
    const propertyWindow = serviceRegistry.get('propertyWindow');
    
    if (!propertyWindow) {
      console.warn('PropertyWindow service not available');
      return;
    }
    
    if (typeof propertyWindow.isVisible === 'function' && propertyWindow.isVisible()) {
      this.hidePropertyWindow();
    } else if (this.selectedText) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const position = {
          x: rect.right + window.scrollX,
          y: rect.top + window.scrollY
        };
        this.showPropertyWindow(this.selectedText, position);
      }
    }
  }
  
  /**
   * Emit selection event
   * @param {string} selectedText - Selected text
   * @param {Object} position - Position information
   * @param {Object} context - Context information
   * @private
   */
  emitSelectionEvent(selectedText, position, context) {
    const messageHandler = serviceRegistry.get('messageHandler');
    
    if (messageHandler) {
      messageHandler.sendToBackground({
        action: 'TEXT_SELECTED',
        data: {
          text: selectedText,
          position: position,
          context: context
        }
      }).catch(error => {
        console.warn('Failed to send selection event to background:', error);
      });
    }
  }
  
  /**
   * Get current selection
   * @returns {Object} - Selection information
   */
  getCurrentSelection() {
    return {
      text: this.selectedText,
      lastSelectionTime: this.lastSelectionTime,
      context: this.getSelectionContext()
    };
  }
  
  /**
   * Update configuration
   * @param {Object} config - New configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Clean up the selection manager
   */
  cleanup() {
    this.disable();
    clearTimeout(this.selectionTimeout);
    
    this.selectedText = '';
    this.lastSelectionTime = 0;
    this.isInitialized = false;
    
    console.log('🧹 SelectionManager cleaned up');
  }
}

// Create instance
const selectionManager = new SelectionManager();

// Register with service registry
serviceRegistry.register('selectionManager', selectionManager);

export default selectionManager;
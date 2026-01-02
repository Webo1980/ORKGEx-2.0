// ================================
// modules/ui/RAGResultsWindow.js - Updated with Dock Feature
// ================================

(function(global) {
  'use strict';
  
  class RAGResultsWindow {
    constructor(config = {}) {
      // Configuration
      this.config = {
        defaultTab: 'text',
        groupTextByProperty: true,
        autoShow: false,
        autoMinimize: true,
        ...config
      };
      
      // Core state
      this.initialized = false;
      this.visible = false;
      this.container = null;
      
      // Data storage
      this.data = {
        text: new Map(),
        images: [],
        tables: []
      };
      
      // Components
      this.windowFrame = null;
      this.tabManager = null;
      this.panelRenderer = null;
      this.elementFinder = null;
      
      // Event callbacks
      this.onDataReceived = null;
      this.onElementJump = null;
      this.onWindowClosed = null;
    }
    
    async init() {
      if (this.initialized) {
        console.log('RAGResultsWindow already initialized');
        return this;
      }
      
      try {
        console.log('Initializing RAG Results Window...');
        
        this.injectStyles();
        this.createWindow();
        this.initializeComponents();
        this.setupEventCoordination();
        this.registerService();
        this.loadSavedData();
        
        this.initialized = true;
        console.log('RAG Results Window initialized successfully');
        
        return this;
        
      } catch (error) {
        console.error('Failed to initialize RAG Results Window:', error);
        throw error;
      }
    }
    
    createWindow() {
      // Remove existing window if present
      const existing = document.getElementById('orkg-rag-results-window');
      if (existing) {
        existing.remove();
      }
      
      // Create container
      this.container = document.createElement('div');
      this.container.id = 'orkg-rag-results-window';
      this.container.className = 'orkg-rag-window';
      
      // Build window HTML
      this.container.innerHTML = this.getWindowHTML();
      
      // Append to body
      document.body.appendChild(this.container);
      
      console.log('Window DOM created');
    }
    
    getWindowHTML() {
      const icons = global.IconRegistry || this.getDefaultIcons();
      
      return `
        <!-- Header -->
        <div class="orkg-rag-header" data-draggable="true">
          <div class="orkg-rag-title">
            ${icons.clipboard || this.getDefaultIcons().clipboard}
            <span>Paper Analysis Results</span>
            <span class="orkg-rag-badge" data-count="0">0</span>
          </div>
          <div class="orkg-rag-controls">
            <button class="orkg-rag-btn minimize-btn" title="Minimize">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <button class="orkg-rag-btn dock-btn" title="Dock to Top">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14"></path>
                <path d="M12 5l7 7-7 7"></path>
                <rect x="3" y="3" width="7" height="7"></rect>
              </svg>
            </button>
            <button class="orkg-rag-btn close-btn" title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="orkg-rag-content">
          <!-- Tabs -->
          <div class="orkg-rag-tabs">
            <button class="orkg-rag-tab active" data-tab="text">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>Text</span>
              <span class="tab-count" data-tab-count="text">0</span>
            </button>
            <button class="orkg-rag-tab" data-tab="images">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>Images</span>
              <span class="tab-count" data-tab-count="images">0</span>
            </button>
            <button class="orkg-rag-tab" data-tab="tables">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
              </svg>
              <span>Tables</span>
              <span class="tab-count" data-tab-count="tables">0</span>
            </button>
          </div>
          
          <!-- Tab Panels -->
          <div class="orkg-rag-panels">
            <div class="orkg-rag-panel active" data-panel="text">
              <div class="panel-content"></div>
            </div>
            <div class="orkg-rag-panel" data-panel="images">
              <div class="panel-content"></div>
            </div>
            <div class="orkg-rag-panel" data-panel="tables">
              <div class="panel-content"></div>
            </div>
          </div>
        </div>
      `;
    }
    
    initializeComponents() {
      // Check if required modules exist
      const required = ['RAGWindowFrame', 'RAGTabManager', 'RAGPanelRenderer', 'RAGElementFinder'];
      const missing = required.filter(m => !global[m]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required modules: ${missing.join(', ')}`);
      }
      
      // Initialize WindowFrame
      this.windowFrame = new global.RAGWindowFrame(this.container, {
        defaultWidth: 380,
        defaultHeight: 500,
        minimizedHeight: 48
      });
      this.windowFrame.init();
      
      // Initialize TabManager
      this.tabManager = new global.RAGTabManager(this.container, {
        defaultTab: this.config.defaultTab,
        tabs: ['text', 'images', 'tables']
      });
      this.tabManager.init();
      
      // Initialize PanelRenderer
      this.panelRenderer = new global.RAGPanelRenderer(this.container, {
        groupByProperty: this.config.groupTextByProperty,
        showConfidence: true,
        showMetadata: true
      });
      this.panelRenderer.init();
      
      // Initialize ElementFinder
      this.elementFinder = new global.RAGElementFinder({
        fuzzyMatchThreshold: 0.8
      });
      this.elementFinder.init();
      
      console.log('All components initialized');
    }
    
    setupEventCoordination() {
      // Tab change events
      this.tabManager.onTabChanged((newTab, oldTab) => {
        console.log(`Tab changed: ${oldTab} → ${newTab}`);
        this.emitEvent('tabChanged', { newTab, oldTab });
      });
      
      // Panel item clicks
      this.panelRenderer.onItemClicked((type, id, element) => {
        this.handleItemClick(type, id);
      });
      
      // Section toggle events
      this.panelRenderer.onSectionToggled((sectionId, isExpanded) => {
        console.log(`Section ${sectionId} ${isExpanded ? 'expanded' : 'collapsed'}`);
      });
      
      // Window closed event
      this.container.addEventListener('windowClosed', () => {
        this.handleWindowClosed();
      });
      
      // Window frame events
      this.container.addEventListener('docked', () => {
        this.emitEvent('windowDocked');
      });
      
      this.container.addEventListener('restored', () => {
        this.emitEvent('windowRestored');
      });
      
      // Global event bus listeners
      if (global.eventBus) {
        global.eventBus.on('rag:resultsReady', (data) => this.handleRAGResults(data));
        global.eventBus.on('rag:highlightAdded', (data) => this.addHighlight(data));
        global.eventBus.on('rag:highlightRemoved', (data) => this.removeHighlight(data));
        global.eventBus.on('rag:clearResults', () => this.clearAllData());
      }
    }
    
    handleItemClick(type, id) {
      console.log(`Jumping to ${type} element: ${id}`);
      
      let itemData = null;
      
      if (type === 'text') {
        this.data.text.forEach(items => {
          const found = items.find(item => item.id === id);
          if (found) itemData = found;
        });
      } else if (type === 'image') {
        itemData = this.data.images.find(img => img.id === id);
      } else if (type === 'table') {
        itemData = this.data.tables.find(table => table.id === id);
      }
      
      const success = this.elementFinder.findAndJump(type, id, itemData);
      
      if (success) {
        this.emitEvent('elementJumped', { type, id });
        
        if (this.onElementJump) {
          this.onElementJump(type, id);
        }
      } else {
        console.warn(`Could not find ${type} element: ${id}`);
        this.showNotification(`Could not find ${type} element`, 'warning');
      }
    }
    
    handleWindowClosed() {
      // Clear all data
      this.clearAllData();
      
      // Remove container from DOM
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      
      // Reset state
      this.initialized = false;
      this.visible = false;
      this.container = null;
      
      // Clear saved data
      try {
        localStorage.removeItem('orkg-rag-window-data');
      } catch (e) {
        console.warn('Failed to clear saved data:', e);
      }
      
      // Callback
      if (this.onWindowClosed) {
        this.onWindowClosed();
      }
      
      this.emitEvent('windowClosed');
      
      console.log('Window closed and cleaned up');
    }
    
    handleRAGResults(data) {
      console.log('Handling RAG results:', data);
      
      this.clearAllData();
      
      if (data.highlights) {
        this.processTextHighlights(data.highlights);
      }
      
      if (data.images) {
        this.data.images = data.images;
      }
      
      if (data.tables) {
        this.data.tables = data.tables;
      }
      
      this.updateAllPanels();
      this.show();
      this.updateTotalBadge();
      
      if (this.onDataReceived) {
        this.onDataReceived(data);
      }
      
      this.emitEvent('dataReceived', data);
    }
    
    processTextHighlights(highlights) {
      if (this.config.groupTextByProperty) {
        highlights.forEach(highlight => {
          const property = highlight.propertyLabel || highlight.property || 'Unknown';
          
          if (!this.data.text.has(property)) {
            this.data.text.set(property, []);
          }
          
          this.data.text.get(property).push({
            id: highlight.id || `text_${Date.now()}_${Math.random()}`,
            text: highlight.text || highlight.sentence || highlight.value,
            sentence: highlight.sentence,
            section: highlight.section,
            confidence: highlight.confidence,
            color: highlight.color,
            propertyLabel: property
          });
        });
      } else {
        this.data.text.set('All Highlights', highlights);
      }
      
      console.log(`Processed ${highlights.length} text highlights into ${this.data.text.size} groups`);
    }
    
    updateAllPanels() {
      const textCount = this.panelRenderer.renderTextPanel(
        this.data.text,
        this.container.querySelector('[data-panel="text"]')
      );
      this.tabManager.updateTabCount('text', textCount);
      
      const imageCount = this.panelRenderer.renderImagesPanel(
        this.data.images,
        this.container.querySelector('[data-panel="images"]')
      );
      this.tabManager.updateTabCount('images', imageCount);
      
      const tableCount = this.panelRenderer.renderTablesPanel(
        this.data.tables,
        this.container.querySelector('[data-panel="tables"]')
      );
      this.tabManager.updateTabCount('tables', tableCount);
      
      console.log(`Updated panels - Text: ${textCount}, Images: ${imageCount}, Tables: ${tableCount}`);
    }
    
    updateTotalBadge() {
      const total = this.tabManager.getTotalCount();
      const badge = this.container.querySelector('.orkg-rag-badge');
      
      if (badge) {
        badge.textContent = total;
        badge.dataset.count = total;
        badge.style.display = total > 0 ? 'inline-block' : 'none';
      }
    }
    
    addHighlight(data) {
      if (data.type === 'text') {
        const property = data.propertyLabel || 'Unknown';
        
        if (!this.data.text.has(property)) {
          this.data.text.set(property, []);
        }
        
        this.data.text.get(property).push(data);
        
        const textCount = this.panelRenderer.renderTextPanel(
          this.data.text,
          this.container.querySelector('[data-panel="text"]')
        );
        this.tabManager.updateTabCount('text', textCount);
        
      } else if (data.type === 'image') {
        this.data.images.push(data);
        
        const imageCount = this.panelRenderer.renderImagesPanel(
          this.data.images,
          this.container.querySelector('[data-panel="images"]')
        );
        this.tabManager.updateTabCount('images', imageCount);
        
      } else if (data.type === 'table') {
        this.data.tables.push(data);
        
        const tableCount = this.panelRenderer.renderTablesPanel(
          this.data.tables,
          this.container.querySelector('[data-panel="tables"]')
        );
        this.tabManager.updateTabCount('tables', tableCount);
      }
      
      this.updateTotalBadge();
    }
    
    removeHighlight(data) {
      if (data.type === 'text' && data.id) {
        this.data.text.forEach((items, key) => {
          const index = items.findIndex(item => item.id === data.id);
          if (index >= 0) {
            items.splice(index, 1);
            if (items.length === 0) {
              this.data.text.delete(key);
            }
          }
        });
        
        const textCount = this.panelRenderer.renderTextPanel(
          this.data.text,
          this.container.querySelector('[data-panel="text"]')
        );
        this.tabManager.updateTabCount('text', textCount);
        
      } else if (data.type === 'image' && data.id) {
        this.data.images = this.data.images.filter(img => img.id !== data.id);
        
        const imageCount = this.panelRenderer.renderImagesPanel(
          this.data.images,
          this.container.querySelector('[data-panel="images"]')
        );
        this.tabManager.updateTabCount('images', imageCount);
        
      } else if (data.type === 'table' && data.id) {
        this.data.tables = this.data.tables.filter(table => table.id !== data.id);
        
        const tableCount = this.panelRenderer.renderTablesPanel(
          this.data.tables,
          this.container.querySelector('[data-panel="tables"]')
        );
        this.tabManager.updateTabCount('tables', tableCount);
      }
      
      this.updateTotalBadge();
    }
    
    clearAllData() {
      this.data.text.clear();
      this.data.images = [];
      this.data.tables = [];
      
      if (this.panelRenderer) {
        this.panelRenderer.clearAllPanels();
      }
      
      if (this.tabManager) {
        this.tabManager.updateAllCounts({ text: 0, images: 0, tables: 0 });
      }
      
      this.updateTotalBadge();
    }
    
    show() {
      console.log('[RAGResultsWindow] Showing window');
      
      if (this.container) {
        this.container.style.display = 'block';
      }
      
      if (this.windowFrame) {
        if (typeof this.windowFrame.setVisible === 'function') {
          this.windowFrame.setVisible(true);
        }
        
        if (typeof this.windowFrame.expand === 'function' && 
            this.windowFrame.state && 
            this.windowFrame.state.isMinimized) {
          this.windowFrame.expand();
        }
      }
      
      this.visible = true;
      return this;
    }
    
    hide() {
      this.visible = false;
      if (this.windowFrame && typeof this.windowFrame.setVisible === 'function') {
        this.windowFrame.setVisible(false);
      }
      this.emitEvent('windowHidden');
    }
    
    toggle() {
      if (this.visible) {
        this.hide();
      } else {
        this.show();
      }
    }
    
    showNotification(message, type = 'info') {
      if (global.toastManager) {
        global.toastManager[type](message);
      } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    }
    
    getDefaultIcons() {
      return {
        clipboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
        chevronRight: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>',
        chevronDown: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>'
      };
    }
    
    injectStyles() {
      const styleId = 'orkg-rag-window-styles';
      
      if (document.getElementById(styleId)) return;
      
      const link = document.createElement('link');
      link.id = styleId;
      link.rel = 'stylesheet';
      link.href = chrome?.runtime?.getURL ? 
        chrome.runtime.getURL('src/styles/content/rag-results-window.css') : 
        '/src/styles/content/rag-results-window.css';
      
      document.head.appendChild(link);
    }
    
    registerService() {
      if (global.serviceRegistry) {
        global.serviceRegistry.register('ragResultsWindow', this);
      }
    }
    
    loadSavedData() {
      try {
        const saved = localStorage.getItem('orkg-rag-window-data');
        if (saved) {
          const data = JSON.parse(saved);
          
          if (data.text) {
            this.data.text = new Map(data.text);
          }
          
          if (data.images) this.data.images = data.images;
          if (data.tables) this.data.tables = data.tables;
          
          if (this.data.text.size > 0 || this.data.images.length > 0 || this.data.tables.length > 0) {
            this.updateAllPanels();
          }
        }
      } catch (e) {
        console.warn('Failed to load saved data:', e);
      }
    }
    
    saveData() {
      try {
        const dataToSave = {
          text: Array.from(this.data.text.entries()),
          images: this.data.images,
          tables: this.data.tables
        };
        
        localStorage.setItem('orkg-rag-window-data', JSON.stringify(dataToSave));
      } catch (e) {
        console.warn('Failed to save data:', e);
      }
    }
    
    emitEvent(eventName, detail = {}) {
      if (global.eventBus) {
        global.eventBus.emit(`ragWindow:${eventName}`, detail);
      }
      
      if (this.container) {
        this.container.dispatchEvent(new CustomEvent(eventName, { detail }));
      }
    }
    
    // Public API Methods
    
    setData(textData, imageData, tableData) {
      this.clearAllData();
      
      if (textData) {
        if (textData instanceof Map) {
          this.data.text = textData;
        } else if (Array.isArray(textData)) {
          this.processTextHighlights(textData);
        }
      }
      
      if (imageData) this.data.images = imageData;
      if (tableData) this.data.tables = tableData;
      
      this.updateAllPanels();
      this.saveData();
    }
    
    getData() {
      return {
        text: this.data.text,
        images: [...this.data.images],
        tables: [...this.data.tables]
      };
    }
    
    getState() {
      return {
        initialized: this.initialized,
        visible: this.visible,
        windowFrame: this.windowFrame?.getState(),
        tabs: this.tabManager?.getState(),
        dataCount: {
          text: this.tabManager?.getTabCount('text') || 0,
          images: this.data.images.length,
          tables: this.data.tables.length
        }
      };
    }
    
    isReady() {
      return this.initialized && 
             this.windowFrame && 
             this.tabManager && 
             this.panelRenderer && 
             this.elementFinder;
    }
    
    onData(callback) {
      this.onDataReceived = callback;
    }
    
    onJump(callback) {
      this.onElementJump = callback;
    }
    
    onClose(callback) {
      this.onWindowClosed = callback;
    }
    
    destroy() {
      this.saveData();
      
      if (this.windowFrame) this.windowFrame.destroy();
      if (this.tabManager) this.tabManager.destroy();
      if (this.panelRenderer) this.panelRenderer.destroy();
      if (this.elementFinder) this.elementFinder.destroy();
      
      if (global.eventBus) {
        global.eventBus.off('rag:resultsReady');
        global.eventBus.off('rag:highlightAdded');
        global.eventBus.off('rag:highlightRemoved');
        global.eventBus.off('rag:clearResults');
      }
      
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      
      this.clearAllData();
      
      this.initialized = false;
      this.visible = false;
      this.container = null;
      
      console.log('RAG Results Window destroyed');
    }
  }
  
  // Create singleton instance
  const ragResultsWindow = new RAGResultsWindow({
    defaultTab: 'text',
    groupTextByProperty: true,
    autoShow: false,
    autoMinimize: true
  });
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ragResultsWindow.init().catch(console.error);
    });
  } else {
    ragResultsWindow.init().catch(console.error);
  }
  
  // Export to global scope
  global.ragResultsWindow = ragResultsWindow;
  global.RAGResultsWindow = RAGResultsWindow;
  
  console.log('RAGResultsWindow module loaded');
  
})(typeof window !== 'undefined' ? window : this);
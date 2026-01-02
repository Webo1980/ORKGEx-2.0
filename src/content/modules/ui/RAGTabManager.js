// ================================
// modules/ui/RAGTabManager.js
// Handles tab switching, counts, and active states
// ================================

(function(global) {
  'use strict';
  
  class RAGTabManager {
    constructor(container, config = {}) {
      // DOM reference
      this.container = container;
      
      // Configuration
      this.config = {
        defaultTab: 'text',
        tabs: ['text', 'images', 'tables'],
        animationDuration: 200,
        ...config
      };
      
      // State
      this.state = {
        activeTab: this.config.defaultTab,
        tabCounts: {
          text: 0,
          images: 0,
          tables: 0
        },
        tabVisibility: {
          text: true,
          images: true,
          tables: true
        }
      };
      
      // DOM elements
      this.elements = {
        tabContainer: null,
        tabs: new Map(),
        panels: new Map(),
        badges: new Map()
      };
      
      // Callbacks
      this.onTabChange = null;
    }
    
    /**
     * Initialize tab manager
     */
    init() {
      this.findElements();
      this.attachEventListeners();
      this.loadSavedState();
      this.applyInitialState();
      
      return this;
    }
    
    /**
     * Find DOM elements
     */
    findElements() {
      if (!this.container) {
        throw new Error('RAGTabManager: Container not provided');
      }
      
      // Find tab container
      this.elements.tabContainer = this.container.querySelector('.orkg-rag-tabs');
      
      if (!this.elements.tabContainer) {
        console.warn('RAGTabManager: Tab container not found');
        return;
      }
      
      // Find all tabs
      this.config.tabs.forEach(tabName => {
        const tabElement = this.container.querySelector(`[data-tab="${tabName}"]`);
        const panelElement = this.container.querySelector(`[data-panel="${tabName}"]`);
        const badgeElement = this.container.querySelector(`[data-tab-count="${tabName}"]`);
        
        if (tabElement) {
          this.elements.tabs.set(tabName, tabElement);
        }
        
        if (panelElement) {
          this.elements.panels.set(tabName, panelElement);
        }
        
        if (badgeElement) {
          this.elements.badges.set(tabName, badgeElement);
        }
      });
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
      // Tab click handlers
      this.elements.tabs.forEach((tabElement, tabName) => {
        tabElement.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.switchTab(tabName);
        });
        
        // Keyboard accessibility
        tabElement.addEventListener('keydown', (e) => {
          this.handleTabKeyboard(e, tabName);
        });
        
        // Set tabindex for accessibility
        tabElement.setAttribute('tabindex', '0');
        tabElement.setAttribute('role', 'tab');
      });
      
      // Panel accessibility
      this.elements.panels.forEach((panelElement, panelName) => {
        panelElement.setAttribute('role', 'tabpanel');
        panelElement.setAttribute('aria-labelledby', `tab-${panelName}`);
      });
    }
    
    /**
     * Handle keyboard navigation for tabs
     */
    handleTabKeyboard(e, currentTab) {
      const tabs = Array.from(this.elements.tabs.keys());
      const currentIndex = tabs.indexOf(currentTab);
      
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          this.switchTab(currentTab);
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          this.focusTab(tabs[prevIndex]);
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % tabs.length;
          this.focusTab(tabs[nextIndex]);
          break;
          
        case 'Home':
          e.preventDefault();
          this.focusTab(tabs[0]);
          break;
          
        case 'End':
          e.preventDefault();
          this.focusTab(tabs[tabs.length - 1]);
          break;
      }
    }
    
    /**
     * Focus a specific tab
     */
    focusTab(tabName) {
      const tabElement = this.elements.tabs.get(tabName);
      if (tabElement) {
        tabElement.focus();
      }
    }
    
    /**
     * Switch to a specific tab
     */
    switchTab(tabName) {
      // Validate tab name
      if (!this.config.tabs.includes(tabName)) {
        console.warn(`RAGTabManager: Invalid tab name: ${tabName}`);
        return false;
      }
      
      // Check if already active
      if (this.state.activeTab === tabName) {
        return true;
      }
      
      // Check visibility
      if (!this.state.tabVisibility[tabName]) {
        console.warn(`RAGTabManager: Tab ${tabName} is hidden`);
        return false;
      }
      
      // Get elements
      const newTab = this.elements.tabs.get(tabName);
      const newPanel = this.elements.panels.get(tabName);
      const oldTab = this.elements.tabs.get(this.state.activeTab);
      const oldPanel = this.elements.panels.get(this.state.activeTab);
      
      if (!newTab || !newPanel) {
        console.warn(`RAGTabManager: Tab or panel not found for ${tabName}`);
        return false;
      }
      
      // Emit before change event
      this.emitEvent('beforeTabChange', {
        from: this.state.activeTab,
        to: tabName
      });
      
      // Remove active states from old tab
      if (oldTab) {
        oldTab.classList.remove('active');
        oldTab.setAttribute('aria-selected', 'false');
      }
      
      if (oldPanel) {
        this.hidePanel(oldPanel);
      }
      
      // Add active states to new tab
      newTab.classList.add('active');
      newTab.setAttribute('aria-selected', 'true');
      
      // Show new panel with animation
      this.showPanel(newPanel);
      
      // Update state
      const previousTab = this.state.activeTab;
      this.state.activeTab = tabName;
      
      // Save state
      this.saveState();
      
      // Call callback
      if (this.onTabChange) {
        this.onTabChange(tabName, previousTab);
      }
      
      // Emit after change event
      this.emitEvent('tabChanged', {
        tab: tabName,
        previousTab: previousTab
      });
      
      return true;
    }
    
    /**
     * Show panel with animation
     */
    showPanel(panel) {
      // Remove hidden state
      panel.classList.remove('hidden');
      panel.style.display = 'block';
      
      // Force reflow
      panel.offsetHeight;
      
      // Add active class for animation
      panel.classList.add('active');
      
      // Fade in
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(10px)';
      
      requestAnimationFrame(() => {
        panel.style.transition = `opacity ${this.config.animationDuration}ms ease, 
                                  transform ${this.config.animationDuration}ms ease`;
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
      });
      
      // Clean up after animation
      setTimeout(() => {
        panel.style.transition = '';
        panel.style.opacity = '';
        panel.style.transform = '';
      }, this.config.animationDuration);
    }
    
    /**
     * Hide panel with animation
     */
    hidePanel(panel) {
      panel.style.transition = `opacity ${this.config.animationDuration / 2}ms ease`;
      panel.style.opacity = '0';
      
      setTimeout(() => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
        panel.style.display = 'none';
        panel.style.transition = '';
        panel.style.opacity = '';
      }, this.config.animationDuration / 2);
    }
    
    /**
     * Update tab count
     */
    updateTabCount(tabName, count) {
      // Validate
      if (!this.config.tabs.includes(tabName)) {
        console.warn(`RAGTabManager: Invalid tab name for count update: ${tabName}`);
        return;
      }
      
      // Update state
      this.state.tabCounts[tabName] = count;
      
      // Update badge
      const badge = this.elements.badges.get(tabName);
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
        
        // Add/remove has-content class
        const tab = this.elements.tabs.get(tabName);
        if (tab) {
          if (count > 0) {
            tab.classList.add('has-content');
          } else {
            tab.classList.remove('has-content');
          }
        }
      }
      
      // Emit event
      this.emitEvent('countUpdated', {
        tab: tabName,
        count: count
      });
    }
    
    /**
     * Update all tab counts
     */
    updateAllCounts(counts) {
      Object.entries(counts).forEach(([tabName, count]) => {
        if (this.config.tabs.includes(tabName)) {
          this.updateTabCount(tabName, count);
        }
      });
    }
    
    /**
     * Get total count across all tabs
     */
    getTotalCount() {
      return Object.values(this.state.tabCounts)
        .reduce((sum, count) => sum + count, 0);
    }
    
    /**
     * Show/hide a tab
     */
    setTabVisibility(tabName, visible) {
      if (!this.config.tabs.includes(tabName)) {
        console.warn(`RAGTabManager: Invalid tab name: ${tabName}`);
        return;
      }
      
      this.state.tabVisibility[tabName] = visible;
      
      const tabElement = this.elements.tabs.get(tabName);
      if (tabElement) {
        tabElement.style.display = visible ? 'flex' : 'none';
      }
      
      // If hiding active tab, switch to first visible tab
      if (!visible && this.state.activeTab === tabName) {
        const firstVisibleTab = this.config.tabs.find(tab => 
          this.state.tabVisibility[tab] && tab !== tabName
        );
        
        if (firstVisibleTab) {
          this.switchTab(firstVisibleTab);
        }
      }
    }
    
    /**
     * Enable/disable a tab
     */
    setTabEnabled(tabName, enabled) {
      const tabElement = this.elements.tabs.get(tabName);
      if (tabElement) {
        if (enabled) {
          tabElement.classList.remove('disabled');
          tabElement.removeAttribute('disabled');
          tabElement.setAttribute('tabindex', '0');
        } else {
          tabElement.classList.add('disabled');
          tabElement.setAttribute('disabled', 'true');
          tabElement.setAttribute('tabindex', '-1');
        }
      }
    }
    
    /**
     * Clear content of a tab panel
     */
    clearPanel(tabName) {
      const panel = this.elements.panels.get(tabName);
      if (panel) {
        const content = panel.querySelector('.panel-content');
        if (content) {
          content.innerHTML = this.getEmptyStateHTML(tabName);
        }
      }
      
      // Reset count
      this.updateTabCount(tabName, 0);
    }
    
    /**
     * Clear all panels
     */
    clearAllPanels() {
      this.config.tabs.forEach(tabName => {
        this.clearPanel(tabName);
      });
    }
    
    /**
     * Get empty state HTML for a tab
     */
    getEmptyStateHTML(tabName) {
      const messages = {
        text: 'No highlighted text found',
        images: 'No images found',
        tables: 'No tables found'
      };
      
      const icons = {
        text: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
        images: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
        tables: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path></svg>'
      };
      
      return `
        <div class="empty-state">
          ${icons[tabName] || ''}
          <p>${messages[tabName] || 'No content'}</p>
        </div>
      `;
    }
    
    /**
     * Apply initial state
     */
    applyInitialState() {
      // Set initial active tab
      const activeTab = this.elements.tabs.get(this.state.activeTab);
      const activePanel = this.elements.panels.get(this.state.activeTab);
      
      if (activeTab && activePanel) {
        activeTab.classList.add('active');
        activeTab.setAttribute('aria-selected', 'true');
        activePanel.classList.add('active');
        activePanel.classList.remove('hidden');
      }
      
      // Hide other panels
      this.config.tabs.forEach(tabName => {
        if (tabName !== this.state.activeTab) {
          const panel = this.elements.panels.get(tabName);
          if (panel) {
            panel.classList.remove('active');
            panel.classList.add('hidden');
          }
        }
      });
      
      // Apply counts
      this.updateAllCounts(this.state.tabCounts);
    }
    
    /**
     * Save state to storage
     */
    saveState() {
      const stateToSave = {
        activeTab: this.state.activeTab,
        tabCounts: this.state.tabCounts
      };
      
      try {
        localStorage.setItem('orkg-rag-tab-state', JSON.stringify(stateToSave));
      } catch (e) {
        console.warn('Failed to save tab state:', e);
      }
    }
    
    /**
     * Load saved state
     */
    loadSavedState() {
      try {
        const saved = localStorage.getItem('orkg-rag-tab-state');
        if (saved) {
          const loadedState = JSON.parse(saved);
          
          if (loadedState.activeTab && this.config.tabs.includes(loadedState.activeTab)) {
            this.state.activeTab = loadedState.activeTab;
          }
          
          if (loadedState.tabCounts) {
            Object.entries(loadedState.tabCounts).forEach(([tab, count]) => {
              if (this.config.tabs.includes(tab)) {
                this.state.tabCounts[tab] = count;
              }
            });
          }
        }
      } catch (e) {
        console.warn('Failed to load tab state:', e);
      }
    }
    
    /**
     * Emit custom event
     */
    emitEvent(eventName, detail = {}) {
      if (global.eventBus) {
        global.eventBus.emit(`ragTabs:${eventName}`, detail);
      }
      
      // Also dispatch DOM event
      if (this.container) {
        this.container.dispatchEvent(new CustomEvent(`tab-${eventName}`, { detail }));
      }
    }
    
    /**
     * Get current state
     */
    getState() {
      return {
        activeTab: this.state.activeTab,
        tabCounts: { ...this.state.tabCounts },
        tabVisibility: { ...this.state.tabVisibility }
      };
    }
    
    /**
     * Get active tab name
     */
    getActiveTab() {
      return this.state.activeTab;
    }
    
    /**
     * Get tab count
     */
    getTabCount(tabName) {
      return this.state.tabCounts[tabName] || 0;
    }
    
    /**
     * Register tab change callback
     */
    onTabChanged(callback) {
      this.onTabChange = callback;
    }
    
    /**
     * Destroy tab manager
     */
    destroy() {
      // Remove event listeners
      this.elements.tabs.forEach(tabElement => {
        const newElement = tabElement.cloneNode(true);
        tabElement.parentNode.replaceChild(newElement, tabElement);
      });
      
      // Clear references
      this.elements.tabs.clear();
      this.elements.panels.clear();
      this.elements.badges.clear();
      this.container = null;
      this.onTabChange = null;
    }
  }
  
  // Export to global scope
  global.RAGTabManager = RAGTabManager;
  
})(typeof window !== 'undefined' ? window : this);
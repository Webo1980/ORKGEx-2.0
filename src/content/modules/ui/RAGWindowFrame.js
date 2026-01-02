// ================================
// modules/ui/RAGWindowFrame.js - Updated with Dock Feature
// ================================

(function(global) {
  'use strict';
  
  class RAGWindowFrame {
    constructor(container, config = {}) {
      this.container = container;
      
      this.config = {
        minWidth: 320,
        minHeight: 48,
        maxWidth: 600,
        defaultWidth: 380,
        defaultHeight: 500,
        minimizedHeight: 48,
        animationDuration: 300,
        dockOffset: 20,
        ...config
      };
      
      this.state = {
        position: { x: window.innerWidth - 400, y: 20 },
        dimensions: { 
          width: this.config.defaultWidth, 
          height: this.config.defaultHeight 
        },
        isMinimized: true,
        isDocked: false,
        isDragging: false,
        isResizing: false,
        savedPosition: null
      };
      
      this.dragState = {
        offsetX: 0,
        offsetY: 0
      };
      
      this.elements = {
        header: null,
        minimizeBtn: null,
        dockBtn: null,
        closeBtn: null,
        content: null,
        resizeHandle: null
      };
      
      this.handleDragStart = this.handleDragStart.bind(this);
      this.handleDragMove = this.handleDragMove.bind(this);
      this.handleDragEnd = this.handleDragEnd.bind(this);
    }
    
    init() {
      this.findElements();
      this.attachEventListeners();
      this.loadSavedState();
      this.applyState();
      
      // Start minimized and hidden by default
      this.container.style.display = 'none';
      if (!this.state.isMinimized) {
        this.minimize();
      }
      
      return this;
    }
    
    findElements() {
      if (!this.container) {
        throw new Error('RAGWindowFrame: Container not provided');
      }
      
      this.elements.header = this.container.querySelector('.orkg-rag-header');
      this.elements.minimizeBtn = this.container.querySelector('.minimize-btn');
      this.elements.dockBtn = this.container.querySelector('.dock-btn');
      this.elements.closeBtn = this.container.querySelector('.close-btn');
      this.elements.content = this.container.querySelector('.orkg-rag-content');
    }
    
    attachEventListeners() {
      if (this.elements.header) {
        this.elements.header.addEventListener('mousedown', this.handleDragStart);
      }
      
      if (this.elements.minimizeBtn) {
        this.elements.minimizeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleMinimize();
        });
      }
      
      if (this.elements.dockBtn) {
        this.elements.dockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.dock();
        });
      }
      
      if (this.elements.closeBtn) {
        this.elements.closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleClose();
        });
      }
      
      window.addEventListener('resize', () => this.constrainToViewport());
    }
    
    handleDragStart(e) {
      // Ignore if clicking on buttons
      if (e.target.closest('.orkg-rag-btn') || 
          e.target.closest('.orkg-rag-controls')) {
        return;
      }
      
      e.preventDefault();
      
      this.state.isDragging = true;
      this.state.isDocked = false;
      
      // Get current computed position
      const rect = this.container.getBoundingClientRect();
      
      // Store the offset from click point to window corner
      this.dragState.offsetX = e.clientX - rect.left;
      this.dragState.offsetY = e.clientY - rect.top;
      
      // IMPORTANT: Remove 'right' CSS property to allow 'left' to work
      this.container.style.setProperty('right', 'auto', 'important');
      this.container.style.setProperty('bottom', 'auto', 'important');
      
      // Set initial position using left/top
      this.container.style.setProperty('left', rect.left + 'px', 'important');
      this.container.style.setProperty('top', rect.top + 'px', 'important');
      
      this.container.classList.add('dragging');
      
      document.addEventListener('mousemove', this.handleDragMove);
      document.addEventListener('mouseup', this.handleDragEnd);
      
      document.body.style.userSelect = 'none';
    }
    
    handleDragMove(e) {
      if (!this.state.isDragging) return;
      
      e.preventDefault();
      
      // Calculate new position based on mouse position minus initial offset
      let newX = e.clientX - this.dragState.offsetX;
      let newY = e.clientY - this.dragState.offsetY;
      
      // Constrain to viewport
      const windowWidth = this.state.dimensions.width;
      const windowHeight = this.state.isMinimized ? this.config.minimizedHeight : this.state.dimensions.height;
      
      const maxX = window.innerWidth - windowWidth;
      const maxY = window.innerHeight - windowHeight;
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));
      
      // Update state and DOM
      this.state.position.x = newX;
      this.state.position.y = newY;
      
      this.container.style.setProperty('left', `${newX}px`, 'important');
      this.container.style.setProperty('top', `${newY}px`, 'important');
    }
    
    handleDragEnd(e) {
      if (!this.state.isDragging) return;
      
      this.state.isDragging = false;
      
      this.container.classList.remove('dragging');
      
      document.removeEventListener('mousemove', this.handleDragMove);
      document.removeEventListener('mouseup', this.handleDragEnd);
      
      document.body.style.userSelect = '';
      
      this.saveState();
    }
    
    toggleMinimize() {
      if (this.state.isMinimized) {
        this.expand();
      } else {
        this.minimize();
      }
    }
    
    minimize() {
      this.state.isMinimized = true;
      
      this.container.style.height = `${this.config.minimizedHeight}px`;
      
      if (this.elements.content) {
        this.elements.content.style.display = 'none';
      }
      
      if (this.elements.minimizeBtn) {
        const icon = this.elements.minimizeBtn.querySelector('svg');
        if (icon) {
          icon.style.transform = 'rotate(180deg)';
        }
      }
      
      this.container.classList.add('minimized');
      
      this.saveState();
    }
    
    expand() {
      this.state.isMinimized = false;
      
      this.container.style.height = `${this.state.dimensions.height}px`;
      
      if (this.elements.content) {
        this.elements.content.style.display = 'block';
      }
      
      if (this.elements.minimizeBtn) {
        const icon = this.elements.minimizeBtn.querySelector('svg');
        if (icon) {
          icon.style.transform = 'rotate(0deg)';
        }
      }
      
      this.container.classList.remove('minimized');
      
      this.constrainToViewport();
      
      this.saveState();
    }
    
    dock() {
        if (!this.state.isDocked) {
            this.state.savedPosition = { ...this.state.position };
        }

        this.state.isDocked = true;

        // Minimize when docking
        if (!this.state.isMinimized) {
            this.minimize();
        }

        const margin = 15; // 🔑 margin from edges
        this.state.position.x = window.innerWidth - this.state.dimensions.width - margin;
        this.state.position.y = margin;

        this.updatePosition();
        this.container.classList.add('docked');
        this.showDockNotification();
        this.saveState();
    }

    
    showDockNotification() {
      // Remove existing notification if any
      const existingNotif = document.querySelector('.orkg-dock-notification');
      if (existingNotif) {
        existingNotif.remove();
      }
      
      // Create notification
      const notification = document.createElement('div');
      notification.className = 'orkg-dock-notification';
      
      // Calculate position to be directly below the docked window
      const windowRect = this.container.getBoundingClientRect();
      notification.style.position = 'fixed';
      notification.style.left = `${windowRect.left}px`;
      notification.style.top = `${windowRect.bottom + 8}px`; // 8px below the window
      notification.style.width = `${windowRect.width}px`;
      notification.style.transform = 'none'; // 🔑 prevent unwanted shift
      
      notification.innerHTML = `
        <div class="orkg-dock-notification-content">
          <svg viewBox="0 0 24 24" class="orkg-icon">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14l-7-7 1.41-1.41L12 12.17l5.59-5.59L19 8l-7 7z"/>
          </svg>
          <span>Window docked to top-right corner</span>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);
      
      // Remove after 3 seconds
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          notification.remove();
        }, 300);
      }, 3000);
    }
    
    handleClose() {
      // Show confirmation dialog
      this.showCloseConfirmation();
    }
    
    showCloseConfirmation() {
      // Remove existing confirmation if any
      const existingConfirm = document.querySelector('.orkg-close-confirmation');
      if (existingConfirm) {
        existingConfirm.remove();
      }
      
      // Create confirmation dialog
      const confirmation = document.createElement('div');
      confirmation.className = 'orkg-close-confirmation';
      confirmation.innerHTML = `
        <div class="orkg-close-confirmation-backdrop"></div>
        <div class="orkg-close-confirmation-dialog">
          <div class="orkg-close-confirmation-header">
            <svg viewBox="0 0 24 24" class="orkg-icon orkg-icon-warning">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <h3>Close Window?</h3>
          </div>
          <div class="orkg-close-confirmation-body">
            <p>The window and all its data will be lost and cannot be recovered.</p>
            <p>Are you sure you want to close?</p>
          </div>
          <div class="orkg-close-confirmation-footer">
            <button class="orkg-btn-cancel">Cancel</button>
            <button class="orkg-btn-confirm">Close Window</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(confirmation);
      
      // Animate in
      setTimeout(() => {
        confirmation.classList.add('show');
      }, 10);
      
      // Handle button clicks
      const cancelBtn = confirmation.querySelector('.orkg-btn-cancel');
      const confirmBtn = confirmation.querySelector('.orkg-btn-confirm');
      const backdrop = confirmation.querySelector('.orkg-close-confirmation-backdrop');
      
      const closeDialog = () => {
        confirmation.classList.remove('show');
        setTimeout(() => {
          confirmation.remove();
        }, 300);
      };
      
      cancelBtn.addEventListener('click', closeDialog);
      backdrop.addEventListener('click', closeDialog);
      
      confirmBtn.addEventListener('click', () => {
        closeDialog();
        this.close();
      });
      
      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          closeDialog();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    }
    
    close() {
      // Emit close event
      if (this.container) {
        this.container.dispatchEvent(new CustomEvent('windowClosed'));
      }
      
      // Hide the window
      this.container.style.display = 'none';
      
      // Clear saved state
      try {
        localStorage.removeItem('orkg-rag-window-frame-state');
        localStorage.removeItem('orkg-rag-window-data');
      } catch (e) {
        console.warn('Failed to clear saved state:', e);
      }
      
      // Destroy the window
      this.destroy();
    }
    
    updatePosition() {
      if (this.container) {
        this.container.style.setProperty('left', `${this.state.position.x}px`, 'important');
        this.container.style.setProperty('top', `${this.state.position.y}px`, 'important');
      }
    }
    
    constrainToViewport() {
      const maxX = window.innerWidth - this.state.dimensions.width;
      const maxY = window.innerHeight - 
        (this.state.isMinimized ? this.config.minimizedHeight : this.state.dimensions.height);
      
      this.state.position.x = Math.max(0, Math.min(this.state.position.x, maxX));
      this.state.position.y = Math.max(0, Math.min(this.state.position.y, maxY));
      
      this.updatePosition();
    }
    
    applyState() {
      this.updatePosition();
      
      if (this.container) {
        this.container.style.width = `${this.state.dimensions.width}px`;
        this.container.style.height = this.state.isMinimized ? 
          `${this.config.minimizedHeight}px` : 
          `${this.state.dimensions.height}px`;
      }
      
      if (this.state.isMinimized) {
        if (this.elements.content) {
          this.elements.content.style.display = 'none';
        }
        this.container.classList.add('minimized');
      }
      
      if (this.state.isDocked) {
        this.container.classList.add('docked');
      }
    }
    
    saveState() {
      const stateToSave = {
        position: this.state.position,
        dimensions: this.state.dimensions,
        isMinimized: this.state.isMinimized,
        isDocked: this.state.isDocked
      };
      
      try {
        localStorage.setItem('orkg-rag-window-frame-state', JSON.stringify(stateToSave));
      } catch (e) {
        console.warn('Failed to save window frame state:', e);
      }
    }
    
    loadSavedState() {
      try {
        const saved = localStorage.getItem('orkg-rag-window-frame-state');
        if (saved) {
          const loadedState = JSON.parse(saved);
          
          if (loadedState.position) {
            this.state.position = loadedState.position;
          }
          
          if (loadedState.dimensions) {
            this.state.dimensions = loadedState.dimensions;
          }
          
          if (typeof loadedState.isMinimized === 'boolean') {
            this.state.isMinimized = loadedState.isMinimized;
          }
          
          if (typeof loadedState.isDocked === 'boolean') {
            this.state.isDocked = loadedState.isDocked;
          }
        }
      } catch (e) {
        console.warn('Failed to load window frame state:', e);
      }
    }
    
    getState() {
      return { ...this.state };
    }
    
    setVisible(visible) {
      if (this.container) {
        this.container.style.display = visible ? 'block' : 'none';
      }
    }
    
    destroy() {
      if (this.elements.header) {
        this.elements.header.removeEventListener('mousedown', this.handleDragStart);
      }
      
      this.container = null;
      this.elements = {};
    }
  }
  
  // Export to global scope
  global.RAGWindowFrame = RAGWindowFrame;
  
})(typeof window !== 'undefined' ? window : this);
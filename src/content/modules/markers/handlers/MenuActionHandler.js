// src/content/modules/markers/handlers/MenuActionHandler.js
// Main file - coordinates all menu actions

(function(global) {
    'use strict';
    
    // Import action handlers (these will be loaded from separate files)
    const DeleteHandler = global.DeleteHandler || {};
    const UpdateHandler = global.UpdateHandler || {};
    const InfoHandler = global.InfoHandler || {};
    const SendHandler = global.SendHandler || {};
    
    class MenuActionHandler {
        constructor(baseMarker) {
            this.marker = baseMarker;
            this.isSetup = false;
            this.modalManager = null;
            this.propertyWindow = null;
            
            // Initialize action handlers
            this.deleteHandler = new DeleteHandler(this);
            this.updateHandler = new UpdateHandler(this);
            this.infoHandler = new InfoHandler(this);
            this.sendHandler = new SendHandler(this);
            
            // Bind methods
            this.handleMenuItemClick = this.handleMenuItemClick.bind(this);
        }
        
        setup() {
            if (this.isSetup) return;
            
            console.log('🔧 Setting up MenuActionHandler for', this.marker.getType());
            
            // Get modal manager instance
            this.modalManager = global.ModalManager?.getInstance();
            if (!this.modalManager && global.ModalManager) {
                this.modalManager = new global.ModalManager();
            }
            
            // Get property window instance
            this.propertyWindow = global.propertyWindow || global.PropertyWindow;
            if (typeof this.propertyWindow === 'function') {
                this.propertyWindow = new this.propertyWindow();
            }
            
            // Setup handlers
            this.deleteHandler.setup(this.modalManager, this.marker);
            this.updateHandler.setup(this.propertyWindow, this.marker);
            this.infoHandler.setup(this.modalManager);
            this.sendHandler.setup(this.modalManager, this.marker);
            
            this.isSetup = true;
            console.log('✅ MenuActionHandler setup complete');
        }
        
        handleMenuItemClick(e, menuItem) {
            e.preventDefault();
            e.stopPropagation();
            
            const action = menuItem.dataset.action;
            const marker = menuItem.closest('.orkg-marker');
            const markerId = marker?.dataset.markerId;
            
            if (!action || !markerId) {
                console.warn('Missing action or markerId');
                return;
            }
            
            console.log('Menu action triggered:', action, 'for marker:', markerId);
            
            // Get marker data
            const markerData = this.getMarkerData(markerId, marker);
            
            // Hide menu immediately
            const menu = menuItem.closest('.orkg-marker-menu');
            if (menu) {
                menu.classList.remove('orkg-menu-visible');
            }
            
            // Execute action
            this.executeAction(action, markerId, markerData);
        }
        
        getMarkerData(markerId, markerElement) {
            let markerData = null;
            
            // Try to get from marker instance
            if (this.marker && typeof this.marker.getMarker === 'function') {
                markerData = this.marker.getMarker(markerId);
            }
            
            // Try to get from registry
            if (!markerData && global.MarkerRegistry) {
                markerData = global.MarkerRegistry.get(markerId);
            }
            
            // Create from element if needed
            if (!markerData && markerElement) {
                markerData = {
                    id: markerId,
                    type: markerElement.dataset.markerType || this.marker?.getType() || 'text',
                    element: markerElement,
                    markerElement: markerElement,
                    metadata: {},
                    createdAt: Date.now()
                };
                
                try {
                    const metadataStr = markerElement.dataset.metadata;
                    if (metadataStr) {
                        markerData.metadata = JSON.parse(metadataStr);
                    }
                } catch (e) {
                    console.warn('Could not parse metadata:', e);
                }
            }
            
            return markerData;
        }
        
        executeAction(action, markerId, markerData) {
            console.log(`Executing ${action} for marker ${markerId}`);
            
            switch (action) {
                case 'delete':
                    this.deleteHandler.handle(markerId, markerData);
                    break;
                case 'update':
                    this.updateHandler.handle(markerId, markerData);
                    break;
                case 'info':
                    this.infoHandler.handle(markerId, markerData);
                    break;
                case 'send':
                    this.sendHandler.handle(markerId, markerData);
                    break;
                default:
                    console.warn('Unknown action:', action);
            }
        }
        
        // Utility methods shared by all handlers
        showFeedback(message, type = 'info') {
            const existing = document.querySelector('.orkg-feedback');
            if (existing) existing.remove();
            
            const feedback = document.createElement('div');
            feedback.className = `orkg-feedback orkg-feedback-${type}`;
            feedback.textContent = message;
            document.body.appendChild(feedback);
            
            requestAnimationFrame(() => {
                feedback.classList.add('orkg-feedback-visible');
            });
            
            setTimeout(() => {
                feedback.classList.remove('orkg-feedback-visible');
                setTimeout(() => feedback.remove(), 300);
            }, 2500);
        }
        
        sendToExtension(action, markerId, data) {
            if (!chrome?.runtime?.sendMessage) {
                console.warn('Chrome runtime not available');
                return;
            }
            
            chrome.runtime.sendMessage({
                action: `${action}_${data.type?.toUpperCase() || 'TEXT'}`,
                data: {
                    markerId,
                    metadata: data.metadata || data,
                    timestamp: Date.now()
                }
            }).catch(error => {
                console.warn('Failed to send message:', error);
            });
        }
        
        cleanup() {
            this.isSetup = false;
            this.modalManager = null;
            this.propertyWindow = null;
            
            // Cleanup handlers
            this.deleteHandler?.cleanup();
            this.updateHandler?.cleanup();
            this.infoHandler?.cleanup();
            this.sendHandler?.cleanup();
            
            console.log('✅ MenuActionHandler cleaned up');
        }
    }
    
    // Export to global scope
    global.MenuActionHandler = MenuActionHandler;
    console.log('📢 MenuActionHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
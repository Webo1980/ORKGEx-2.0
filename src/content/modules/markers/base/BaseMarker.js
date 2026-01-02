// src/content/modules/markers/base/BaseMarker.js

(function(global) {
    'use strict';
    
    /**
     * Enhanced BaseMarker with complete menu action integration
     */
    class BaseMarker {
        constructor(config = {}) {
            // Configuration
            this.config = Object.assign(
                {
                    markerSize: 44,
                    markerOffset: 10,
                    tooltipDelay: 200,
                    menuHideDelay: 300,
                    animationDuration: 300,
                    enableAnimations: true,
                    enableTooltips: true,
                    enableMenus: true,
                    colors: {
                        primary: '#e86161',
                        text: '#2196F3',
                        image: '#4CAF50',
                        table: '#9C27B0'
                    }
                },
                config
            );
            
            // Core state
            this.markers = new Map();
            this.isActive = false;
            this.isInitialized = false;
            this.extractedItems = new Set();
            this.lastMarkerCreated = null;
            
            // Services
            this.registry = null;
            this.eventBus = null;
            this.ui = null;
            this.animationService = null;
            this.menuHandler = null;
            this.modalManager = null;
            this.tooltipSystem = null;
            
            // Menu state
            this.activeMenuId = null;
            this.menuHideTimeout = null;
            
            console.log(`📍 ${this.getType()} marker instance created`);
        }
        
        // ================================
        // Abstract Methods (must override)
        // ================================
        
        getType() {
            throw new Error('getType() must be implemented by subclass');
        }
        
        getTypeIcon() {
            // Override in subclass for specific icon
            return '';
        }
        
        getParticleColor() {
            return this.config.colors[this.getType()] || this.config.colors.primary;
        }
        
        // ================================
        // Lifecycle Methods
        // ================================
        
        async init() {
            if (this.isInitialized) {
                console.warn(`${this.getType()} marker already initialized`);
                return;
            }
            
            try {
                // Initialize services
                this.registry = global.MarkerRegistry;
                this.eventBus = global.MarkerEventBus;
                this.animationService = global.AnimationService || global.FlyAnimation;
                this.tooltipSystem = global.markerTooltip;
                
                // Initialize Modal Manager
                this.modalManager = global.ModalManager?.getInstance();
                if (!this.modalManager && global.ModalManager) {
                    this.modalManager = new global.ModalManager();
                }
                
                // Initialize UI
                if (!this.ui) {
                    const MarkerUIClass = global.MarkerUI;
                    if (!MarkerUIClass) throw new Error('MarkerUI not available');
                    this.ui = new MarkerUIClass(this.config);
                    
                    // Set menu action callback
                    this.ui.setMenuActionCallback((action, markerData) => {
                        this.handleMenuAction(action, markerData);
                    });
                }
                
                // Initialize MenuActionHandler
                if (!this.menuHandler && global.MenuActionHandler) {
                    this.menuHandler = new global.MenuActionHandler(this);
                    this.menuHandler.setup();
                    console.log('✅ MenuActionHandler initialized');
                }
                
                // Type-specific initialization
                await this.onInit();
                
                this.isInitialized = true;
                this.eventBus?.emit('marker:initialized', { type: this.getType() });
                console.log(`✅ ${this.getType()} marker initialized`);
                
            } catch (error) {
                console.error(`❌ Failed to initialize ${this.getType()} marker:`, error);
                throw error;
            }
        }
        
        async activate(config = {}) {
            if (!this.isInitialized) {
                await this.init();
            }
            
            if (this.isActive) {
                console.warn(`${this.getType()} marker already active`);
                return { success: true, count: this.markers.size };
            }
            
            try {
                console.log(`🔍 Activating ${this.getType()} markers with config:`, config);
                
                // Clear existing markers
                this.cleanup();
                
                // Type-specific activation
                const result = await this.onActivate(config);
                
                this.isActive = true;
                this.eventBus?.emit('marker:activated', { type: this.getType(), result });
                
                console.log(`✅ ${this.getType()} markers activated:`, result);
                return result;
                
            } catch (error) {
                console.error(`❌ Failed to activate ${this.getType()} markers:`, error);
                return { success: false, error: error.message, count: 0 };
            }
        }
        
        deactivate() {
            if (!this.isActive) {
                console.warn(`${this.getType()} marker not active`);
                return;
            }
            
            console.log(`🔻 Deactivating ${this.getType()} markers`);
            
            // Type-specific deactivation
            this.onDeactivate();
            
            // Clear all markers
            this.cleanup();
            
            this.isActive = false;
            this.eventBus?.emit('marker:deactivated', { type: this.getType() });
            console.log(`✅ ${this.getType()} markers deactivated`);
        }
        
        // ================================
        // Core Marker Creation
        // ================================
        
        createMarker(element, metadata = {}) {
            if (!element) {
                console.error('Invalid element provided');
                return null;
            }
            
            const markerId = metadata.id || this.generateMarkerId();
            
            // Check if marker already exists
            if (this.markers.has(markerId)) {
                console.warn(`Marker ${markerId} already exists`);
                return this.markers.get(markerId);
            }
            
            // Ensure UI is initialized
            if (!this.ui) {
                console.error('UI not initialized');
                return null;
            }
            
            // Create marker data
            const markerData = {
                id: markerId,
                type: this.getType(),
                element: element,
                metadata: metadata,
                createdAt: Date.now(),
                visible: true,
                extracted: false
            };
            
            // Create marker element
            const markerElement = this.ui.createMarkerElement(markerData);
            if (!markerElement) {
                console.error('Failed to create marker element');
                return null;
            }
            
            // Position marker
            this.positionMarker(markerElement, element, metadata);
            
            // Store marker data
            markerData.markerElement = markerElement;
            
            // Store in local map
            this.markers.set(markerId, markerData);
            
            // Register with global registry
            this.registry?.register(markerData);
            this.lastMarkerCreated = markerId;
            
            // Emit event
            this.eventBus?.emit('marker:created', markerData);
            
            // Animate entrance
            if (this.config.enableAnimations) {
                this.animateMarkerEntrance(markerElement);
            }
            
            return markerData;
        }
        
        // ================================
        // Positioning System
        // ================================
        
        positionMarker(markerElement, targetElement, metadata) {
            const type = this.getType();
            
            // Ensure container for images/tables
            if (type === 'image' || type === 'table') {
                const container = this.ensureMarkerContainer(targetElement);
                container.appendChild(markerElement);
                markerElement.classList.add('orkg-marker-positioned');
            } else if (type === 'text') {
                // For text, position relative to the highlight
                targetElement.style.position = 'relative';
                targetElement.appendChild(markerElement);
                markerElement.style.position = 'absolute';
                markerElement.style.top = '-12px';
                markerElement.style.right = '-12px';
            } else {
                // Default positioning
                const container = this.ensureMarkerContainer(targetElement);
                container.appendChild(markerElement);
            }
        }
        
        ensureMarkerContainer(element) {
            const parent = element.parentElement;
            
            // Check if already has container
            if (parent?.classList.contains('orkg-marker-container')) {
                return parent;
            }
            
            // Create container
            const container = document.createElement('div');
            container.className = 'orkg-marker-container';
            container.dataset.orkgElement = 'true';
            container.style.cssText = 'position: relative; display: inline-block;';
            
            // Wrap element
            if (element.parentNode) {
                element.parentNode.insertBefore(container, element);
                container.appendChild(element);
            }
            
            return container;
        }
        
        // ================================
        // Menu System
        // ================================
        
        toggleMenu(markerId) {
            if (this.activeMenuId === markerId) {
                this.hideMenu(markerId);
            } else {
                this.showMenu(markerId);
            }
        }
        
        showMenu(markerId) {
            // Hide any other open menu
            if (this.activeMenuId && this.activeMenuId !== markerId) {
                this.hideMenu(this.activeMenuId);
            }
            
            // Clear hide timeout
            clearTimeout(this.menuHideTimeout);
            
            // Show menu using UI
            this.ui?.showMenu(markerId);
            this.activeMenuId = markerId;
            
            // Hide tooltip when menu is shown
            const markerData = this.markers.get(markerId) || this.registry?.get(markerId);
            if (markerData?.markerElement) {
                this.tooltipSystem?.hide(markerData.markerElement);
            }
        }
        
        hideMenu(markerId) {
            this.ui?.hideMenu(markerId);
            
            if (this.activeMenuId === markerId) {
                this.activeMenuId = null;
            }
        }
        
        hideAllMenus() {
            this.ui?.hideAllMenus();
            this.activeMenuId = null;
        }
        
        // ================================
        // Menu Action Handlers
        // ================================
        
        handleMenuAction(action, markerData) {
            console.log(`Handling ${action} for marker ${markerData.id}`);
            
            // If we have a menuHandler, delegate to it
            if (this.menuHandler) {
                this.menuHandler.executeAction(action, markerData.id, markerData);
                return;
            }
            
            // Otherwise handle here
            switch (action) {
                case 'delete':
                    this.handleDelete(markerData);
                    break;
                case 'update':
                    this.handleUpdate(markerData);
                    break;
                case 'info':
                    this.handleInfo(markerData);
                    break;
                case 'send':
                    this.handleSend(markerData);
                    break;
                default:
                    console.warn(`Unknown action: ${action}`);
            }
        }
        
        handleDelete(markerData) {
            if (this.modalManager) {
                this.modalManager.showDeleteConfirm(
                    markerData,
                    () => {
                        this.performDelete(markerData.id, markerData);
                    },
                    () => {
                        console.log('Delete cancelled');
                    }
                );
            } else {
                if (confirm(`Delete this ${markerData.type} marker?`)) {
                    this.performDelete(markerData.id, markerData);
                }
            }
        }
        
        performDelete(markerId, markerData) {
            console.log('Performing delete for:', markerId);
            
            // For text markers, remove highlight
            if (markerData.type === 'text') {
                const highlightId = markerData.metadata?.highlightId || markerId;
                if (global.TextHighlighter?.removeHighlight) {
                    global.TextHighlighter.removeHighlight(highlightId);
                }
            }
            
            // Remove marker
            this.removeMarker(markerId);
            
            // Send notification
            this.sendToExtension('DELETE', markerId, markerData);
            this.showFeedback('Marker deleted successfully', 'success');
        }
        
        handleUpdate(markerData) {
            if (markerData.type !== 'text') {
                this.showFeedback('Update is only available for text markers', 'warning');
                return;
            }
            
            const propertyWindow = global.PropertyWindow || global.propertyWindow;
            if (!propertyWindow) {
                this.showFeedback('Property window not available', 'error');
                return;
            }
            
            const element = markerData.element || markerData.markerElement;
            const rect = element?.getBoundingClientRect();
            
            if (!rect) {
                console.error('Could not get position for property window');
                return;
            }
            
            const position = {
                x: rect.right + window.scrollX + 10,
                y: rect.top + window.scrollY
            };
            
            const text = markerData.metadata?.text || 'Selected text';
            console.log('Opening property window for update:', text);
            
            propertyWindow.show(text, position);
        }
        
        handleInfo(markerData) {
            if (this.modalManager) {
                this.modalManager.showInfo(markerData, markerData.type);
            } else {
                const infoText = this.getInfoText(markerData);
                alert(infoText);
            }
        }
        
        handleSend(markerData) {
            const counts = this.getAllTypeCounts();
            
            if (this.modalManager) {
                this.modalManager.showSendOptions(
                    markerData,
                    counts,
                    (action) => {
                        if (action === 'send-this') {
                            this.sendSingleItem(markerData.id, markerData);
                        } else if (action === 'send-all') {
                            this.sendAllItems();
                        }
                    }
                );
            } else {
                this.sendSingleItem(markerData.id, markerData);
            }
        }
        
        getInfoText(markerData) {
            const lines = [
                `Type: ${markerData.type}`,
                `ID: ${markerData.id}`,
                `Created: ${new Date(markerData.createdAt).toLocaleString()}`
            ];
            
            if (markerData.metadata?.text) {
                lines.push(`Text: ${markerData.metadata.text.substring(0, 100)}...`);
            }
            
            if (markerData.metadata?.property?.label) {
                lines.push(`Property: ${markerData.metadata.property.label}`);
            }
            
            return lines.join('\n');
        }
        
        // ================================
        // Marker Operations
        // ================================
        
        removeMarker(markerId) {
            const markerData = this.markers.get(markerId) || this.registry?.get(markerId);
            if (!markerData) return false;
            
            // Remove marker element with animation
            if (markerData.markerElement?.parentNode) {
                if (this.config.enableAnimations) {
                    markerData.markerElement.classList.add('orkg-marker-exit');
                    setTimeout(() => {
                        markerData.markerElement.remove();
                    }, 300);
                } else {
                    markerData.markerElement.remove();
                }
            }
            
            // Clean up container if empty
            const container = markerData.markerElement?.parentNode;
            if (container?.classList.contains('orkg-marker-container')) {
                if (container.children.length <= 1) {
                    const child = container.firstElementChild;
                    if (container.parentNode && child) {
                        container.parentNode.insertBefore(child, container);
                        container.remove();
                    }
                }
            }
            
            // Remove from local map
            this.markers.delete(markerId);
            
            // Unregister from global registry
            this.registry?.unregister(markerId);
            this.extractedItems.delete(markerId);
            
            // Emit event
            this.eventBus?.emit('marker:removed', { 
                id: markerId, 
                type: this.getType() 
            });
            
            // Type-specific cleanup
            this.onMarkerRemoved(markerId, markerData);
            
            return true;
        }
        
        updateMarker(markerId, updates) {
            const markerData = this.markers.get(markerId) || this.registry?.get(markerId);
            if (!markerData) return false;
            
            // Update metadata
            Object.assign(markerData.metadata, updates);
            
            // Update UI
            if (markerData.markerElement) {
                this.ui?.updateMarkerElement(markerData.markerElement, updates);
            }
            
            // Emit event
            this.eventBus?.emit('marker:updated', {
                id: markerId,
                type: this.getType(),
                updates
            });
            
            return true;
        }
        
        getMarker(markerId) {
            return this.markers.get(markerId) || this.registry?.get(markerId);
        }
        
        getAllMarkers() {
            return Array.from(this.markers.values());
        }
        
        getMarkerCount() {
            return this.markers.size;
        }
        
        // ================================
        // Send Methods
        // ================================
        
        async sendSingleItem(markerId, markerData) {
            console.log(`📤 Sending single item:`, markerId);
            
            // Animate if available
            const element = markerData.element || markerData.markerElement;
            if (this.animationService && element) {
                await this.animationService.flyToExtension(element, markerData.metadata);
            }
            
            // Mark as extracted
            if (markerData.markerElement) {
                markerData.markerElement.classList.add('orkg-extracted');
            }
            this.extractedItems.add(markerId);
            
            // Send to extension
            this.sendToExtension('SEND', markerId, markerData);
            this.showFeedback('Item sent to ORKG', 'success');
        }
        
        async sendAllItems() {
            const items = this.getAllCategorizedItems();
            
            if (items.totalCount === 0) {
                this.showFeedback('No items to send', 'warning');
                return;
            }
            
            if (this.modalManager) {
                this.modalManager.showSendAll(items, async (selectedItems) => {
                    await this.sendSelectedItems(selectedItems);
                });
            }
        }
        
        async sendSelectedItems(selectedItems) {
            console.log(`📤 Sending ${selectedItems.total} items to ORKG`);
            
            // Mark items as sent
            [...selectedItems.text, ...selectedItems.images, ...selectedItems.tables].forEach(item => {
                this.extractedItems.add(item.id);
                const markerData = this.markers.get(item.id) || this.registry?.get(item.id);
                if (markerData?.markerElement) {
                    markerData.markerElement.classList.add('orkg-extracted');
                }
            });
            
            // Send to extension
            this.sendToExtension('SEND_MULTIPLE', null, selectedItems);
            this.showFeedback(`Sent ${selectedItems.total} items to ORKG`, 'success');
        }
        
        getAllTypeCounts() {
            const counts = {
                text: 0,
                image: 0,
                table: 0,
                total: 0
            };
            
            // Count from registry
            if (this.registry) {
                const stats = this.registry.getStats();
                counts.text = stats.byType?.text || 0;
                counts.image = stats.byType?.image || 0;
                counts.table = stats.byType?.table || 0;
            }
            
            // Check TextHighlighter
            if (global.TextHighlighter?.getHighlightCount) {
                counts.text = Math.max(counts.text, global.TextHighlighter.getHighlightCount());
            }
            
            counts.total = counts.text + counts.image + counts.table;
            return counts;
        }
        
        getAllCategorizedItems() {
            const items = {
                text: [],
                images: [],
                tables: [],
                totalCount: 0
            };
            
            // Get all markers from registry
            if (this.registry) {
                const allMarkers = this.registry.getAll();
                allMarkers.forEach(marker => {
                    if (marker.type === 'text') items.text.push(marker);
                    else if (marker.type === 'image') items.images.push(marker);
                    else if (marker.type === 'table') items.tables.push(marker);
                });
            }
            
            // Get text highlights
            if (global.TextHighlighter?.getAllHighlights) {
                const highlights = global.TextHighlighter.getAllHighlights();
                highlights.forEach(h => {
                    if (!items.text.find(t => t.id === h.id)) {
                        items.text.push(h);
                    }
                });
            }
            
            items.totalCount = items.text.length + items.images.length + items.tables.length;
            return items;
        }
        
        sendToExtension(action, markerId, data) {
            if (!chrome?.runtime?.sendMessage) {
                console.warn('Chrome runtime not available');
                return;
            }
            
            const message = {
                action: `${action}_${this.getType().toUpperCase()}`,
                data: {
                    markerId,
                    metadata: data,
                    timestamp: Date.now()
                }
            };
            
            chrome.runtime.sendMessage(message).catch(error => {
                console.warn('Failed to send message to extension:', error);
            });
        }
        
        showFeedback(message, type = 'info') {
            console.log(`Feedback (${type}): ${message}`);
            
            // Remove existing feedback
            const existing = document.querySelector('.orkg-feedback');
            if (existing) {
                existing.remove();
            }
            
            // Create feedback element
            const feedback = document.createElement('div');
            feedback.className = `orkg-feedback orkg-feedback-${type}`;
            feedback.textContent = message;
            document.body.appendChild(feedback);
            
            // Animate in
            requestAnimationFrame(() => {
                feedback.classList.add('orkg-feedback-visible');
            });
            
            // Remove after delay
            setTimeout(() => {
                feedback.classList.remove('orkg-feedback-visible');
                setTimeout(() => {
                    if (feedback.parentNode) {
                        feedback.remove();
                    }
                }, 300);
            }, 2500);
        }
        
        // ================================
        // Animation Methods
        // ================================
        
        animateMarkerEntrance(markerElement) {
            markerElement.classList.add('orkg-marker-entrance');
            
            // Remove class after animation
            setTimeout(() => {
                markerElement.classList.remove('orkg-marker-entrance');
            }, this.config.animationDuration);
        }
        
        // ================================
        // Sync Methods
        // ================================
        
        syncWithAnalyzer(items) {
            console.log(`🔄 Syncing ${this.getType()} markers with analyzer:`, items?.length || 0);
            
            // Clear extracted items
            this.extractedItems.clear();
            
            // Update markers based on analyzer items
            if (items && Array.isArray(items)) {
                items.forEach(item => {
                    if (item.id) {
                        this.extractedItems.add(item.id);
                        
                        // Update marker visual state
                        const markerData = this.markers.get(item.id) || this.registry?.get(item.id);
                        if (markerData?.markerElement) {
                            markerData.markerElement.classList.add('orkg-extracted');
                        }
                    }
                });
            }
            
            // Update non-extracted markers
            this.getAllMarkers().forEach(markerData => {
                if (!this.extractedItems.has(markerData.id) && markerData.markerElement) {
                    markerData.markerElement.classList.remove('orkg-extracted');
                }
            });
        }
        
        // ================================
        // Cleanup Methods
        // ================================
        
        cleanup() {
            console.log(`🧹 Cleaning up ${this.getType()} markers`);
            
            // Hide all menus
            this.hideAllMenus();
            
            // Remove all markers
            this.markers.forEach((markerData) => {
                if (markerData.markerElement?.parentNode) {
                    markerData.markerElement.remove();
                }
            });
            
            // Clear from registry
            if (this.registry) {
                const cleared = this.registry.clearType(this.getType());
                console.log(`Cleared ${cleared} ${this.getType()} markers from registry`);
            }
            
            // Clean up UI
            if (this.ui?.cleanup) {
                this.ui.cleanup();
            }
            
            // Clean up menu handler
            if (this.menuHandler?.cleanup) {
                this.menuHandler.cleanup();
            }
            
            // Clear state
            this.markers.clear();
            this.extractedItems.clear();
            this.lastMarkerCreated = null;
            this.activeMenuId = null;
            
            // Clear timeouts
            clearTimeout(this.menuHideTimeout);
        }
        
        // ================================
        // Utility Methods
        // ================================
        
        generateMarkerId() {
            return `${this.getType()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        isExtensionElement(element) {
            const selectors = [
                '.orkg-extension',
                '.orkg-analyzer',
                '#orkg-panel',
                '[data-orkg-extension]',
                '.orkg-marker',
                '.orkg-marker-container',
                '[data-orkg-element]'
            ];
            
            return selectors.some(selector => element.closest(selector) !== null);
        }
        
        getStatus() {
            return {
                type: this.getType(),
                isInitialized: this.isInitialized,
                isActive: this.isActive,
                markerCount: this.getMarkerCount(),
                extractedCount: this.extractedItems.size,
                hasActiveMenu: !!this.activeMenuId
            };
        }
        
        // ================================
        // Hook Methods (override in subclass)
        // ================================
        
        async onInit() {
            // Override for type-specific initialization
        }
        
        async onActivate(config) {
            // Override for type-specific activation
            return { success: true, count: 0 };
        }
        
        onDeactivate() {
            // Override for type-specific deactivation
        }
        
        onMarkerRemoved(markerId, markerData) {
            // Override for type-specific cleanup when marker is removed
        }
    }
    
    // Export to global scope
    global.BaseMarker = BaseMarker;
    
    console.log('📢 BaseMarker class exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
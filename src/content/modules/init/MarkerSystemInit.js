// src/content/modules/init/MarkerSystemInit.js
// Fixed version with proper PropertyWindow initialization

(function(global) {
    'use strict';
    
    class MarkerSystemInit {
        constructor() {
            this.initialized = false;
            this.markers = new Map();
            this.propertyWindow = null;
        }
        
        async initialize() {
            if (this.initialized) {
                console.log('✅ Marker system already initialized');
                return;
            }
            
            console.log('🚀 Initializing ORKG Marker System...');
            
            try {
                // Step 1: Verify core dependencies
                this.verifyDependencies();
                
                // Step 2: Initialize PropertyWindow
                this.initializePropertyWindow();
                
                // Step 3: Setup global click handler for menus
                this.setupGlobalMenuHandler();
                
                // Step 4: Initialize marker types
                await this.initializeMarkerTypes();
                
                // Step 5: Setup message handlers
                this.setupMessageHandlers();
                
                this.initialized = true;
                console.log('✅ ORKG Marker System initialized successfully!');
                
                // Notify that system is ready
                if (global.MarkerEventBus) {
                    global.MarkerEventBus.emit('system:ready');
                }
                
            } catch (error) {
                console.error('❌ Failed to initialize marker system:', error);
                throw error;
            }
        }
        
        verifyDependencies() {
            const required = [
                'BaseMarker',
                'MarkerUI',
                'MarkerRegistry',
                'MarkerEventBus',
                'IconRegistry',
                'ModalManager',
                'MenuActionHandler'
            ];
            
            const missing = required.filter(dep => !global[dep]);
            
            if (missing.length > 0) {
                throw new Error(`Missing dependencies: ${missing.join(', ')}`);
            }
            
            console.log('✅ All dependencies verified');
        }
        
        initializePropertyWindow() {
            // Check if PropertyWindow exists and create instance
            if (global.propertyWindow) {
                this.propertyWindow = global.propertyWindow;
                console.log('✅ Using existing propertyWindow instance');
            } else if (global.PropertyWindow) {
                // It's a class, create instance
                if (typeof global.PropertyWindow === 'function') {
                    this.propertyWindow = new global.PropertyWindow();
                    global.propertyWindow = this.propertyWindow; // Make it globally available
                    console.log('✅ Created new PropertyWindow instance');
                } else {
                    // It's already an instance
                    this.propertyWindow = global.PropertyWindow;
                    global.propertyWindow = this.propertyWindow;
                    console.log('✅ Using PropertyWindow object');
                }
            } else {
                console.warn('⚠️ PropertyWindow not available');
            }
        }
        
        setupGlobalMenuHandler() {
            // Remove any existing handler
            if (global.orkgMenuClickHandler) {
                document.removeEventListener('click', global.orkgMenuClickHandler, true);
            }
            
            // Create new handler
            global.orkgMenuClickHandler = (e) => {
                // Check if clicking on a marker (not menu)
                const marker = e.target.closest('.orkg-marker');
                if (marker && !e.target.closest('.orkg-marker-menu')) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const markerId = marker.dataset.markerId;
                    const menu = marker.querySelector('.orkg-marker-menu');
                    
                    if (menu) {
                        // Hide all other menus
                        document.querySelectorAll('.orkg-marker-menu.orkg-menu-visible').forEach(m => {
                            if (m !== menu) {
                                m.classList.remove('orkg-menu-visible');
                            }
                        });
                        
                        // Toggle this menu
                        menu.classList.toggle('orkg-menu-visible');
                        console.log('Menu toggled for marker:', markerId);
                    }
                }
                
                // Check if clicking on a menu item
                const menuItem = e.target.closest('.orkg-menu-item');
                if (menuItem) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const action = menuItem.dataset.action;
                    const marker = menuItem.closest('.orkg-marker');
                    const markerId = marker?.dataset.markerId;
                    const markerType = marker?.dataset.markerType;
                    
                    console.log('Menu action:', action, 'for', markerType, 'marker:', markerId);
                    
                    // Hide menu
                    const menu = menuItem.closest('.orkg-marker-menu');
                    if (menu) {
                        menu.classList.remove('orkg-menu-visible');
                    }
                    
                    // Handle action
                    this.handleMenuAction(action, markerId, markerType, marker);
                }
            };
            
            // Add listener with capture
            document.addEventListener('click', global.orkgMenuClickHandler, true);
            console.log('✅ Global menu handler installed');
        }
        
        handleMenuAction(action, markerId, markerType, markerElement) {
            // Get the marker instance
            const markerInstance = this.markers.get(markerType);
            
            if (markerInstance && markerInstance.menuHandler) {
                // Use the marker's menu handler
                const markerData = this.getMarkerData(markerId, markerElement);
                markerInstance.menuHandler.executeAction(action, markerId, markerData);
            } else {
                // Fallback handling
                this.handleActionDirectly(action, markerId, markerElement);
            }
        }
        
        handleActionDirectly(action, markerId, markerElement) {
            const markerData = this.getMarkerData(markerId, markerElement);
            const modalManager = global.ModalManager?.getInstance();
            
            switch (action) {
                case 'delete':
                    if (modalManager) {
                        modalManager.showDeleteConfirm(
                            markerData,
                            () => {
                                // For text markers, remove highlight first
                                if (markerData.type === 'text') {
                                    this.removeTextHighlight(markerId, markerElement);
                                }
                                
                                // Then remove marker
                                markerElement.classList.add('orkg-marker-exit');
                                setTimeout(() => {
                                    markerElement.remove();
                                }, 300);
                                
                                console.log('✅ Marker deleted:', markerId);
                                this.showFeedback('Marker deleted successfully', 'success');
                            },
                            () => {
                                console.log('Delete cancelled');
                            }
                        );
                    } else if (confirm(`Delete this ${markerData.type} marker?`)) {
                        if (markerData.type === 'text') {
                            this.removeTextHighlight(markerId, markerElement);
                        }
                        markerElement.remove();
                        console.log('✅ Marker deleted:', markerId);
                    }
                    break;
                    
                case 'info':
                    if (modalManager) {
                        modalManager.showInfo(markerData, markerData.type, 'property-window');
                    } else {
                        alert(`Marker Information:\nType: ${markerData.type}\nID: ${markerId}`);
                    }
                    break;
                    
                case 'update':
                    if (markerData.type === 'text') {
                        if (this.propertyWindow && typeof this.propertyWindow.show === 'function') {
                            // Find highlighted element
                            const highlightElement = this.findHighlightElement(markerId, markerElement);
                            
                            if (highlightElement) {
                                // Add selection wrapper
                                this.addSelectionWrapper(highlightElement);
                                
                                const rect = highlightElement.getBoundingClientRect();
                                this.propertyWindow.show(
                                    markerData.metadata?.text || highlightElement.textContent || 'Selected text',
                                    { x: rect.right + 10, y: rect.top }
                                );
                            } else {
                                const rect = markerElement.getBoundingClientRect();
                                this.propertyWindow.show(
                                    markerData.metadata?.text || 'Selected text',
                                    { x: rect.right + 10, y: rect.top }
                                );
                            }
                        } else {
                            this.showFeedback('Property window not available', 'error');
                        }
                    } else {
                        this.showFeedback('Update is only available for text markers', 'warning');
                    }
                    break;
                    
                case 'send':
                    const counts = this.getAllTypeCounts();
                    if (modalManager) {
                        modalManager.showSendOptions(
                            markerData,
                            counts,
                            (sendAction) => {
                                if (sendAction === 'send-this') {
                                    this.sendSingleItem(markerId, markerData);
                                } else if (sendAction === 'send-all') {
                                    this.sendAllItems();
                                }
                            },
                            'property-window'
                        );
                    } else {
                        this.sendSingleItem(markerId, markerData);
                    }
                    break;
                    
                default:
                    console.warn('Unknown action:', action);
            }
        }
        
        removeTextHighlight(markerId, markerElement) {
            // Find and remove all highlight elements
            const highlightElements = [
                ...document.querySelectorAll(`[data-highlight-id="${markerId}"]`),
                ...document.querySelectorAll(`[data-marker-id="${markerId}"]`),
                ...document.querySelectorAll(`.orkg-highlighted[data-marker-id="${markerId}"]`)
            ];
            
            // Check if marker is inside highlight
            const markerInHighlight = markerElement?.closest('.orkg-highlighted');
            if (markerInHighlight && !highlightElements.includes(markerInHighlight)) {
                highlightElements.push(markerInHighlight);
            }
            
            // Remove all highlights
            highlightElements.forEach(highlightElement => {
                if (highlightElement) {
                    const textContent = highlightElement.textContent;
                    const textNode = document.createTextNode(textContent);
                    
                    if (highlightElement.parentNode) {
                        highlightElement.parentNode.replaceChild(textNode, highlightElement);
                    }
                }
            });
            
            // Also try TextHighlighter API
            if (global.TextHighlighter?.removeHighlight) {
                global.TextHighlighter.removeHighlight(markerId);
            }
        }
        
        findHighlightElement(markerId, markerElement) {
            return document.querySelector(`[data-highlight-id="${markerId}"]`) ||
                   document.querySelector(`[data-marker-id="${markerId}"]`)?.closest('.orkg-highlighted') ||
                   markerElement?.closest('.orkg-highlighted');
        }
        
        addSelectionWrapper(element) {
            element.style.outline = '2px dashed #2196F3';
            element.style.outlineOffset = '3px';
            element.style.transition = 'outline 0.3s ease';
            element.style.boxShadow = '0 0 8px rgba(33, 150, 243, 0.5)';
            element.classList.add('orkg-selection-active');
            
            // Remove effects when property window closes
            const checkInterval = setInterval(() => {
                const propertyWindowVisible = document.querySelector('.orkg-property-window.orkg-window-visible');
                if (!propertyWindowVisible) {
                    element.style.outline = '';
                    element.style.outlineOffset = '';
                    element.style.boxShadow = '';
                    element.classList.remove('orkg-selection-active');
                    clearInterval(checkInterval);
                }
            }, 500);
        }
        
        getMarkerData(markerId, markerElement) {
            const markerData = {
                id: markerId,
                type: markerElement.dataset.markerType || 'unknown',
                element: markerElement,
                markerElement: markerElement,
                metadata: {},
                createdAt: Date.now()
            };
            
            // Try to parse metadata
            try {
                const metadataStr = markerElement.dataset.metadata;
                if (metadataStr) {
                    markerData.metadata = JSON.parse(metadataStr);
                }
            } catch (e) {
                console.warn('Could not parse metadata:', e);
            }
            
            // Get from registry if available
            if (global.MarkerRegistry) {
                const registryData = global.MarkerRegistry.get(markerId);
                if (registryData) {
                    Object.assign(markerData, registryData);
                }
            }
            
            return markerData;
        }
        
        async initializeMarkerTypes() {
            const factory = global.MarkerFactory;
            if (!factory) {
                console.warn('MarkerFactory not available, creating marker instances directly');
                
                // Create instances directly
                if (global.TextMarker) {
                    const textMarker = new global.TextMarker();
                    await textMarker.init();
                    this.markers.set('text', textMarker);
                }
                
                if (global.ImageMarker) {
                    const imageMarker = new global.ImageMarker();
                    await imageMarker.init();
                    this.markers.set('image', imageMarker);
                }
                
                if (global.TableMarker) {
                    const tableMarker = new global.TableMarker();
                    await tableMarker.init();
                    this.markers.set('table', tableMarker);
                }
            } else {
                // Register marker types with factory
                if (global.TextMarker) {
                    factory.registerType('text', global.TextMarker);
                }
                if (global.ImageMarker) {
                    factory.registerType('image', global.ImageMarker);
                }
                if (global.TableMarker) {
                    factory.registerType('table', global.TableMarker);
                }
                
                console.log('✅ Marker types registered with factory');
            }
        }
        
        setupMessageHandlers() {
            if (!chrome?.runtime?.onMessage) {
                console.warn('Chrome runtime not available');
                return;
            }
            
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                if (message.action === 'ACTIVATE_MARKERS') {
                    this.activateMarkers(message.config).then(sendResponse);
                    return true; // Keep channel open for async response
                } else if (message.action === 'DEACTIVATE_MARKERS') {
                    this.deactivateMarkers().then(sendResponse);
                    return true;
                }
            });
            
            console.log('✅ Message handlers setup');
        }
        
        async activateMarkers(config = {}) {
            const results = {};
            
            for (const [type, marker] of this.markers) {
                try {
                    const result = await marker.activate(config);
                    results[type] = result;
                } catch (error) {
                    console.error(`Failed to activate ${type} markers:`, error);
                    results[type] = { success: false, error: error.message };
                }
            }
            
            return { success: true, results };
        }
        
        async deactivateMarkers() {
            for (const [type, marker] of this.markers) {
                try {
                    marker.deactivate();
                } catch (error) {
                    console.error(`Failed to deactivate ${type} markers:`, error);
                }
            }
            
            return { success: true };
        }
        
        getAllTypeCounts() {
            const counts = {
                text: document.querySelectorAll('.orkg-highlighted').length,
                image: document.querySelectorAll('.orkg-image-marker').length,
                table: document.querySelectorAll('.orkg-table-marker').length,
                total: 0
            };
            
            // Check TextHighlighter
            if (global.TextHighlighter?.getHighlightCount) {
                counts.text = Math.max(counts.text, global.TextHighlighter.getHighlightCount());
            }
            
            // Check MarkerRegistry
            if (global.MarkerRegistry) {
                const stats = global.MarkerRegistry.getStats();
                if (stats.byType) {
                    counts.text = Math.max(counts.text, stats.byType.text || 0);
                    counts.image = Math.max(counts.image, stats.byType.image || 0);
                    counts.table = Math.max(counts.table, stats.byType.table || 0);
                }
            }
            
            counts.total = counts.text + counts.image + counts.table;
            return counts;
        }
        
        sendSingleItem(markerId, markerData) {
            console.log('📤 Sending item:', markerId);
            
            // Create send animation
            this.createSendAnimation(markerData.markerElement);
            
            if (markerData.markerElement) {
                setTimeout(() => {
                    markerData.markerElement.classList.add('orkg-extracted');
                }, 1000);
            }
            
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                    action: `SEND_${markerData.type.toUpperCase()}`,
                    data: {
                        markerId,
                        metadata: markerData.metadata,
                        timestamp: Date.now()
                    }
                });
            }
            
            this.showFeedback('Item sent to ORKG', 'success');
        }
        
        createSendAnimation(element) {
            if (!element) return;
            
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Create particle container
            const particleContainer = document.createElement('div');
            particleContainer.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                width: 0;
                height: 0;
                pointer-events: none;
                z-index: 99999;
            `;
            document.body.appendChild(particleContainer);
            
            // Create particles
            for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    background: #e86161;
                    border-radius: 50%;
                    opacity: 1;
                    transform: scale(1);
                `;
                particleContainer.appendChild(particle);
                
                const angle = (i / 8) * Math.PI * 2;
                const distance = 50 + Math.random() * 30;
                const duration = 800 + Math.random() * 400;
                
                particle.animate([
                    { 
                        transform: 'translate(0, 0) scale(1)',
                        opacity: 1
                    },
                    { 
                        transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`,
                        opacity: 0
                    }
                ], {
                    duration: duration,
                    easing: 'cubic-bezier(0, 0.5, 0.5, 1)'
                });
            }
            
            // Pulse effect on element
            if (element.animate) {
                element.animate([
                    { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(232, 97, 97, 0.4)' },
                    { transform: 'scale(1.05)', boxShadow: '0 0 20px 10px rgba(232, 97, 97, 0.2)' },
                    { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(232, 97, 97, 0)' }
                ], {
                    duration: 600,
                    easing: 'ease-out'
                });
            }
            
            setTimeout(() => {
                particleContainer.remove();
            }, 1500);
        }
        
        sendAllItems() {
            const modalManager = global.ModalManager?.getInstance();
            const items = this.getAllCategorizedItems();
            
            if (items.totalCount === 0) {
                this.showFeedback('No items to send', 'warning');
                return;
            }
            
            if (modalManager) {
                modalManager.showSendAll(items, (selectedItems) => {
                    this.sendSelectedItems(selectedItems);
                }, 'property-window');
            }
        }
        
        getAllCategorizedItems() {
            const items = {
                text: [],
                images: [],
                tables: [],
                totalCount: 0
            };
            
            // Get from DOM
            document.querySelectorAll('.orkg-highlighted').forEach(el => {
                items.text.push({
                    id: el.dataset.highlightId || el.dataset.markerId || Math.random().toString(36).substr(2, 9),
                    element: el,
                    type: 'text',
                    text: el.textContent,
                    metadata: this.getElementMetadata(el)
                });
            });
            
            document.querySelectorAll('.orkg-image-marker').forEach(el => {
                items.images.push({
                    id: el.dataset.markerId || Math.random().toString(36).substr(2, 9),
                    element: el,
                    type: 'image',
                    metadata: this.getElementMetadata(el)
                });
            });
            
            document.querySelectorAll('.orkg-table-marker').forEach(el => {
                items.tables.push({
                    id: el.dataset.markerId || Math.random().toString(36).substr(2, 9),
                    element: el,
                    type: 'table',
                    metadata: this.getElementMetadata(el)
                });
            });
            
            items.totalCount = items.text.length + items.images.length + items.tables.length;
            return items;
        }
        
        getElementMetadata(element) {
            try {
                const metadataStr = element.dataset.metadata;
                if (metadataStr) {
                    return JSON.parse(metadataStr);
                }
            } catch (e) {
                // Ignore parse errors
            }
            return {};
        }
        
        sendSelectedItems(selectedItems) {
            console.log(`📤 Sending ${selectedItems.total} items`);
            
            // Create wave animation
            const wave = document.createElement('div');
            wave.className = 'orkg-send-wave';
            document.body.appendChild(wave);
            
            setTimeout(() => {
                wave.remove();
            }, 1500);
            
            // Send items with animation
            let delay = 0;
            const allItems = [
                ...(selectedItems.text || []),
                ...(selectedItems.images || []),
                ...(selectedItems.tables || [])
            ];
            
            allItems.forEach(item => {
                setTimeout(() => {
                    if (item.element) {
                        this.createSendAnimation(item.element);
                        setTimeout(() => {
                            item.element.classList.add('orkg-extracted');
                        }, 600);
                    }
                }, delay);
                delay += 150;
            });
            
            if (chrome?.runtime?.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'SEND_MULTIPLE_ITEMS',
                    data: {
                        items: selectedItems,
                        timestamp: Date.now()
                    }
                });
            }
            
            setTimeout(() => {
                this.showFeedback(`Sent ${selectedItems.total} items to ORKG`, 'success');
            }, delay + 500);
        }
        
        showFeedback(message, type = 'info') {
            const existing = document.querySelector('.orkg-feedback');
            if (existing) {
                existing.remove();
            }
            
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
    }
    
    // Create and initialize the system
    const markerSystem = new MarkerSystemInit();
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            markerSystem.initialize().catch(console.error);
        });
    } else {
        markerSystem.initialize().catch(console.error);
    }
    
    // Export to global scope
    global.MarkerSystemInit = MarkerSystemInit;
    global.markerSystem = markerSystem;
    
    console.log('📢 MarkerSystemInit exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
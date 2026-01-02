// src/content/modules/markers/handlers/SendHandler.js
// Handles sending markers to ORKG

(function(global) {
    'use strict';
    
    class SendHandler {
        constructor(menuHandler) {
            this.menuHandler = menuHandler;
            this.modalManager = null;
            this.marker = null;
        }
        
        setup(modalManager, marker) {
            this.modalManager = modalManager;
            this.marker = marker;
        }
        
        handle(markerId, markerData) {
            console.log('Handling send for:', markerId);
            
            const counts = this.getAllTypeCounts();
            
            if (this.modalManager) {
                this.modalManager.showSendOptions(
                    markerData,
                    counts,
                    (action) => {
                        if (action === 'send-this') {
                            this.sendSingleItem(markerId, markerData);
                        } else if (action === 'send-all') {
                            this.sendAllItems();
                        }
                    },
                    true // Use property window style
                );
            } else {
                // Direct send without modal
                this.sendSingleItem(markerId, markerData);
            }
        }
        
        sendSingleItem(markerId, markerData) {
            console.log('📤 Sending single item:', markerId);
            
            // Create send animation
            this.createSendAnimation(markerData.markerElement);
            
            // Mark as extracted
            if (markerData.markerElement) {
                setTimeout(() => {
                    markerData.markerElement.classList.add('orkg-extracted');
                }, 1000);
            }
            
            // Send to extension
            this.menuHandler.sendToExtension('SEND', markerId, markerData);
            this.menuHandler.showFeedback('Item sent to ORKG', 'success');
        }
        
        sendAllItems() {
            const items = this.getAllCategorizedItems();
            
            if (items.totalCount === 0) {
                this.menuHandler.showFeedback('No items to send', 'warning');
                return;
            }
            
            if (this.modalManager) {
                this.modalManager.showSendAll(items, (selectedItems) => {
                    this.sendSelectedItems(selectedItems);
                }, 'property-window');
            } else {
                // Send all without selection
                this.sendSelectedItems(items);
            }
        }
        
        sendSelectedItems(selectedItems) {
            console.log(`📤 Sending ${selectedItems.total || selectedItems.totalCount} items to ORKG`);
            
            // Get all items to send
            const allItems = [
                ...(selectedItems.text || []),
                ...(selectedItems.images || []),
                ...(selectedItems.tables || [])
            ];
            
            // Create wave animation
            this.createWaveAnimation();
            
            // Animate each item
            let delay = 0;
            allItems.forEach(item => {
                setTimeout(() => {
                    if (item.element || item.markerElement) {
                        const element = item.element || item.markerElement;
                        this.createSendAnimation(element);
                        
                        // Mark as extracted after animation
                        setTimeout(() => {
                            element.classList.add('orkg-extracted');
                        }, 600);
                    }
                }, delay);
                delay += 150; // Stagger animations
            });
            
            // Send to extension
            this.menuHandler.sendToExtension('SEND_MULTIPLE', null, selectedItems);
            
            // Show feedback after animations
            setTimeout(() => {
                const count = selectedItems.total || selectedItems.totalCount;
                this.menuHandler.showFeedback(`Sent ${count} items to ORKG`, 'success');
            }, delay + 500);
        }
        
        createSendAnimation(element) {
            if (!element) return;
            
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Create particle container
            const particleContainer = document.createElement('div');
            particleContainer.className = 'orkg-send-particles';
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
            for (let i = 0; i < 12; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    background: #e86161;
                    border-radius: 50%;
                    opacity: 1;
                    transform: scale(1);
                    box-shadow: 0 0 4px rgba(232, 97, 97, 0.6);
                `;
                particleContainer.appendChild(particle);
                
                const angle = (i / 12) * Math.PI * 2;
                const distance = 40 + Math.random() * 40;
                const duration = 600 + Math.random() * 400;
                
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
                    easing: 'cubic-bezier(0, 0.5, 0.5, 1)',
                    fill: 'forwards'
                });
            }
            
            // Pulse effect on element
            if (element.animate) {
                element.animate([
                    { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(232, 97, 97, 0.4)' },
                    { transform: 'scale(1.08)', boxShadow: '0 0 25px 15px rgba(232, 97, 97, 0.3)' },
                    { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(232, 97, 97, 0)' }
                ], {
                    duration: 600,
                    easing: 'ease-out'
                });
            }
            
            // Clean up particles
            setTimeout(() => {
                particleContainer.remove();
            }, 1200);
        }
        
        createWaveAnimation() {
            const wave = document.createElement('div');
            wave.className = 'orkg-send-wave';
            wave.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                width: 100px;
                height: 100px;
                border-radius: 50%;
                border: 3px solid #e86161;
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 99998;
                opacity: 0.8;
            `;
            document.body.appendChild(wave);
            
            wave.animate([
                {
                    width: '100px',
                    height: '100px',
                    opacity: 0.8
                },
                {
                    width: '300px',
                    height: '300px',
                    opacity: 0
                }
            ], {
                duration: 1500,
                easing: 'ease-out',
                fill: 'forwards'
            });
            
            setTimeout(() => {
                wave.remove();
            }, 1500);
        }
        
        getAllTypeCounts() {
            const counts = {
                text: 0,
                image: 0,
                table: 0,
                total: 0
            };
            
            // Count from DOM
            counts.text = document.querySelectorAll('.orkg-highlighted').length;
            counts.image = document.querySelectorAll('.orkg-image-marker').length;
            counts.table = document.querySelectorAll('.orkg-table-marker').length;
            
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
        
        getAllCategorizedItems() {
            const items = {
                text: [],
                images: [],
                tables: [],
                totalCount: 0
            };
            
            // Collect text highlights
            document.querySelectorAll('.orkg-highlighted').forEach(el => {
                const markerId = el.dataset.highlightId || 
                               el.dataset.markerId || 
                               el.id ||
                               this.generateId();
                
                items.text.push({
                    id: markerId,
                    element: el,
                    type: 'text',
                    text: this.extractTextContent(el),
                    metadata: this.getElementMetadata(el)
                });
            });
            
            // Collect image markers
            document.querySelectorAll('.orkg-image-marker').forEach(el => {
                const markerId = el.dataset.markerId || this.generateId();
                const imgElement = el.parentElement?.querySelector('img');
                
                items.images.push({
                    id: markerId,
                    element: el,
                    markerElement: el,
                    type: 'image',
                    metadata: {
                        ...this.getElementMetadata(el),
                        src: imgElement?.src,
                        alt: imgElement?.alt
                    }
                });
            });
            
            // Collect table markers
            document.querySelectorAll('.orkg-table-marker').forEach(el => {
                const markerId = el.dataset.markerId || this.generateId();
                const tableElement = el.parentElement?.querySelector('table');
                
                items.tables.push({
                    id: markerId,
                    element: el,
                    markerElement: el,
                    type: 'table',
                    metadata: {
                        ...this.getElementMetadata(el),
                        rows: tableElement?.rows?.length,
                        columns: tableElement?.rows[0]?.cells?.length
                    }
                });
            });
            
            // Get additional items from registry
            if (global.MarkerRegistry) {
                const allMarkers = global.MarkerRegistry.getAll();
                allMarkers.forEach(marker => {
                    // Add if not already collected
                    const list = marker.type === 'text' ? items.text :
                               marker.type === 'image' ? items.images :
                               marker.type === 'table' ? items.tables : null;
                    
                    if (list && !list.find(item => item.id === marker.id)) {
                        list.push(marker);
                    }
                });
            }
            
            items.totalCount = items.text.length + items.images.length + items.tables.length;
            return items;
        }
        
        extractTextContent(element) {
            let text = '';
            for (const node of element.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    text += node.textContent;
                } else if (node.nodeType === Node.ELEMENT_NODE && 
                          !node.classList.contains('orkg-marker') &&
                          !node.classList.contains('orkg-marker-menu') &&
                          !node.classList.contains('orkg-marker-tooltip')) {
                    text += this.extractTextContent(node);
                }
            }
            return text;
        }
        
        getElementMetadata(element) {
            try {
                const metadataStr = element.dataset.metadata;
                if (metadataStr) {
                    return JSON.parse(metadataStr);
                }
                
                // Try to extract from data attributes
                const metadata = {};
                if (element.dataset.property) {
                    try {
                        metadata.property = JSON.parse(element.dataset.property);
                    } catch (e) {
                        metadata.property = { label: element.dataset.propertyLabel || element.dataset.property };
                    }
                }
                
                if (element.style.backgroundColor) {
                    metadata.color = element.style.backgroundColor;
                }
                
                return metadata;
            } catch (e) {
                console.warn('Could not parse metadata:', e);
                return {};
            }
        }
        
        generateId() {
            return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        cleanup() {
            this.modalManager = null;
            this.marker = null;
        }
    }
    
    // Export to global scope
    global.SendHandler = SendHandler;
    console.log('📢 SendHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
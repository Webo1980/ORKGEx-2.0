// src/content/modules/markers/handlers/MenuActionHandler.js
// Final complete fix with proper highlight removal

(function(global) {
    'use strict';
    
    class MenuActionHandler {
        constructor(baseMarker) {
            this.marker = baseMarker;
            this.isSetup = false;
            this.modalManager = null;
            this.propertyWindow = null;
            
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
            
            if (this.marker && typeof this.marker.getMarker === 'function') {
                markerData = this.marker.getMarker(markerId);
            }
            
            if (!markerData && global.MarkerRegistry) {
                markerData = global.MarkerRegistry.get(markerId);
            }
            
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
                    this.handleDelete(markerId, markerData);
                    break;
                case 'update':
                    this.handleUpdate(markerId, markerData);
                    break;
                case 'info':
                    this.handleInfo(markerId, markerData);
                    break;
                case 'send':
                    this.handleSend(markerId, markerData);
                    break;
                default:
                    console.warn('Unknown action:', action);
            }
        }
        
        // ================================
        // Delete Action - FINAL FIX
        // ================================
        
        handleDelete(markerId, markerData) {
            console.log('Handling delete for:', markerId);
            
            if (this.modalManager) {
                this.modalManager.showDeleteConfirm(
                    markerData,
                    () => {
                        this.performDelete(markerId, markerData);
                    },
                    () => {
                        console.log('Delete cancelled');
                    }
                );
            } else {
                const typeLabel = markerData.type || 'this';
                if (confirm(`Are you sure you want to delete ${typeLabel} marker?`)) {
                    this.performDelete(markerId, markerData);
                }
            }
        }
        
        performDelete(markerId, markerData) {
            console.log('Performing delete for:', markerId);
            
            if (markerData.type === 'text') {
                // Find the marker element
                const markerElement = markerData.markerElement || 
                                    document.querySelector(`[data-marker-id="${markerId}"]`);
                
                if (markerElement) {
                    // Find the parent highlight span
                    const highlightSpan = markerElement.closest('.orkg-highlighted');
                    
                    if (highlightSpan) {
                        console.log('Found highlight span to remove:', highlightSpan);
                        
                        // Store parent and next sibling for positioning
                        const parent = highlightSpan.parentNode;
                        const nextSibling = highlightSpan.nextSibling;
                        
                        // Extract ALL text nodes from highlight (not including marker element)
                        const textNodes = [];
                        const collectTextNodes = (node) => {
                            for (const child of node.childNodes) {
                                if (child.nodeType === Node.TEXT_NODE) {
                                    textNodes.push(child);
                                } else if (child.nodeType === Node.ELEMENT_NODE && 
                                        !child.classList.contains('orkg-marker') &&
                                        !child.classList.contains('orkg-marker-menu') &&
                                        !child.classList.contains('orkg-marker-tooltip')) {
                                    collectTextNodes(child);
                                }
                            }
                        };
                        collectTextNodes(highlightSpan);
                        
                        // Create a document fragment with all text nodes
                        const fragment = document.createDocumentFragment();
                        textNodes.forEach(node => {
                            fragment.appendChild(node.cloneNode(true));
                        });
                        
                        // Merge adjacent text nodes
                        const mergedText = fragment.textContent;
                        const newTextNode = document.createTextNode(mergedText);
                        
                        // Replace the entire highlight span with the text node
                        parent.insertBefore(newTextNode, highlightSpan);
                        highlightSpan.remove();
                        
                        // Normalize the parent to merge adjacent text nodes
                        parent.normalize();
                        
                        console.log('✅ Highlight completely removed');
                    }
                }
            } else {
                // For non-text markers
                if (markerData.markerElement?.parentNode) {
                    markerData.markerElement.classList.add('orkg-marker-exit');
                    setTimeout(() => {
                        if (markerData.markerElement?.parentNode) {
                            markerData.markerElement.remove();
                        }
                    }, 300);
                }
            }
            
            // Clean up registries
            if (this.marker && typeof this.marker.removeMarker === 'function') {
                this.marker.removeMarker(markerId);
            }
            
            if (global.MarkerRegistry) {
                global.MarkerRegistry.unregister(markerId);
            }
            
            console.log(`✅ Deleted ${markerData.type} marker:`, markerId);
            this.sendToExtension('DELETE', markerId, markerData);
            this.showFeedback('Marker deleted successfully', 'success');
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
                    // Recursively extract text from non-marker elements
                    text += this.extractTextContent(node);
                }
            }
            return text;
        }
        
        // ================================
        // Update Action - ENHANCED FIX
        // ================================
        
        async handleUpdate(markerId, markerData) {
            console.log('Handling update for:', markerId);
            
            if (markerData.type !== 'text') {
                this.showFeedback('Update is only available for text markers', 'warning');
                return;
            }
            
            // Get property window instance
            let propertyWindow = this.propertyWindow || global.propertyWindow || global.PropertyWindow;
            
            if (typeof propertyWindow === 'function') {
                if (!global.propertyWindowInstance) {
                    global.propertyWindowInstance = new propertyWindow();
                }
                propertyWindow = global.propertyWindowInstance;
            }
            
            if (!propertyWindow || typeof propertyWindow.show !== 'function') {
                console.error('PropertyWindow not available');
                this.showFeedback('Property window not available', 'error');
                return;
            }
            
            // Find elements
            const markerElement = markerData.markerElement || 
                                document.querySelector(`[data-marker-id="${markerId}"]`);
            const highlightElement = markerElement?.closest('.orkg-highlighted');
            
            if (!highlightElement) {
                console.error('Could not find highlighted element');
                this.showFeedback('Could not find highlighted text', 'error');
                return;
            }
            
            // Create resizable selection overlay
            const selectionOverlay = this.createResizableSelection(highlightElement);
            
            // Get initial position for property window
            const rect = highlightElement.getBoundingClientRect();
            const position = {
                x: rect.right + window.scrollX + 10,
                y: rect.top + window.scrollY
            };
            
            // Store current property and color
            const currentProperty = markerData.metadata?.property || 
                                JSON.parse(highlightElement.dataset.property || '{}');
            const currentColor = markerData.metadata?.color || 
                            highlightElement.style.backgroundColor;
            
            try {
                // Show property window
                await propertyWindow.show(selectionOverlay.getSelectedText(), position);
                
                // Set current values
                if (currentProperty) {
                    propertyWindow.selectedProperty = currentProperty;
                }
                if (currentColor) {
                    propertyWindow.selectedColor = currentColor;
                }
                
                // Setup update handler with selection overlay
                this.setupUpdateHandlerWithSelection(
                    propertyWindow, 
                    highlightElement, 
                    markerData, 
                    selectionOverlay,
                    markerElement
                );
                
            } catch (error) {
                console.error('Error showing property window:', error);
                selectionOverlay.destroy();
                this.showFeedback('Error opening property window', 'error');
            }
        }

        // Create resizable selection overlay
        createResizableSelection(highlightElement) {
            // Get the full text content and position
            const fullText = highlightElement.textContent;
            const rect = highlightElement.getBoundingClientRect();
            
            // Create overlay container
            const overlay = document.createElement('div');
            overlay.className = 'orkg-resizable-selection';
            overlay.style.cssText = `
                position: absolute;
                left: ${rect.left + window.scrollX}px;
                top: ${rect.top + window.scrollY}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                border: 2px dashed #2196F3;
                background: rgba(33, 150, 243, 0.1);
                pointer-events: all;
                z-index: 10000;
                box-sizing: border-box;
            `;
            
            // Create resize handles
            const leftHandle = document.createElement('div');
            leftHandle.className = 'orkg-resize-handle orkg-resize-left';
            leftHandle.style.cssText = `
                position: absolute;
                left: -8px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 30px;
                background: #2196F3;
                border-radius: 4px;
                cursor: ew-resize;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            leftHandle.innerHTML = '<span style="color: white; font-size: 12px;">◀</span>';
            
            const rightHandle = document.createElement('div');
            rightHandle.className = 'orkg-resize-handle orkg-resize-right';
            rightHandle.style.cssText = `
                position: absolute;
                right: -8px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 30px;
                background: #2196F3;
                border-radius: 4px;
                cursor: ew-resize;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            rightHandle.innerHTML = '<span style="color: white; font-size: 12px;">▶</span>';
            
            // Add instruction tooltip
            const instruction = document.createElement('div');
            instruction.style.cssText = `
                position: absolute;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                white-space: nowrap;
                pointer-events: none;
            `;
            instruction.textContent = 'Drag handles to adjust selection';
            
            overlay.appendChild(leftHandle);
            overlay.appendChild(rightHandle);
            overlay.appendChild(instruction);
            document.body.appendChild(overlay);
            
            // Selection state
            let startOffset = 0;
            let endOffset = fullText.length;
            let isDragging = false;
            let activeHandle = null;
            
            // Create visual selection in the text
            const updateSelection = () => {
                const selection = window.getSelection();
                selection.removeAllRanges();
                
                if (startOffset < endOffset) {
                    const range = document.createRange();
                    const textNodes = this.getTextNodes(highlightElement);
                    
                    if (textNodes.length > 0) {
                        // Find the text nodes and offsets
                        let currentOffset = 0;
                        let startNode = null, startNodeOffset = 0;
                        let endNode = null, endNodeOffset = 0;
                        
                        for (const node of textNodes) {
                            const nodeLength = node.textContent.length;
                            
                            if (!startNode && currentOffset + nodeLength > startOffset) {
                                startNode = node;
                                startNodeOffset = startOffset - currentOffset;
                            }
                            
                            if (!endNode && currentOffset + nodeLength >= endOffset) {
                                endNode = node;
                                endNodeOffset = endOffset - currentOffset;
                                break;
                            }
                            
                            currentOffset += nodeLength;
                        }
                        
                        if (startNode && endNode) {
                            range.setStart(startNode, startNodeOffset);
                            range.setEnd(endNode, endNodeOffset);
                            selection.addRange(range);
                            
                            // Update overlay position
                            const selectionRects = range.getClientRects();
                            if (selectionRects.length > 0) {
                                const firstRect = selectionRects[0];
                                const lastRect = selectionRects[selectionRects.length - 1];
                                
                                overlay.style.left = `${firstRect.left + window.scrollX}px`;
                                overlay.style.width = `${lastRect.right - firstRect.left}px`;
                            }
                        }
                    }
                }
                
                // Update property window preview
                if (global.propertyWindowInstance?.windowElement) {
                    const preview = global.propertyWindowInstance.windowElement.querySelector('.orkg-text-preview');
                    if (preview) {
                        const selectedText = fullText.substring(startOffset, endOffset);
                        preview.textContent = selectedText.length > 60 ? 
                            selectedText.substring(0, 60) + '...' : selectedText;
                    }
                }
            };
        // Handle dragging
        const handleMouseDown = (e, handle) => {
            e.preventDefault();
            isDragging = true;
            activeHandle = handle;
            document.body.style.cursor = 'ew-resize';
            
            // Hide instruction after first interaction
            instruction.style.display = 'none';
        };
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const highlightRect = highlightElement.getBoundingClientRect();
            const relativeX = e.clientX - highlightRect.left;
            const percentage = Math.max(0, Math.min(1, relativeX / highlightRect.width));
            const charPosition = Math.round(percentage * fullText.length);
            
            if (activeHandle === leftHandle) {
                startOffset = Math.min(charPosition, endOffset - 1);
            } else if (activeHandle === rightHandle) {
                endOffset = Math.max(charPosition, startOffset + 1);
            }
            
            updateSelection();
        };
        
        const handleMouseUp = () => {
            isDragging = false;
            activeHandle = null;
            document.body.style.cursor = '';
        };
        
        // Add event listeners
        leftHandle.addEventListener('mousedown', (e) => handleMouseDown(e, leftHandle));
        rightHandle.addEventListener('mousedown', (e) => handleMouseDown(e, rightHandle));
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Initial selection
        updateSelection();
        
        // Return control interface
        return {
            getSelectedText: () => fullText.substring(startOffset, endOffset),
            getRange: () => window.getSelection().getRangeAt(0),
            destroy: () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                overlay.remove();
                window.getSelection().removeAllRanges();
            }
        };
    }
    
    // Setup update handler with selection
setupUpdateHandlerWithSelection(propertyWindow, highlightElement, markerData, selectionOverlay, markerElement) {
    setTimeout(() => {
        const confirmBtn = propertyWindow.windowElement?.querySelector('.orkg-btn-confirm');
        if (!confirmBtn) return;
        
        // Clone button to remove existing listeners
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        
        // Add update handler
        newBtn.addEventListener('click', async () => {
            const newProperty = propertyWindow.selectedProperty;
            const newColor = propertyWindow.selectedColor;
            const newText = selectionOverlay.getSelectedText();
            
            if (newProperty && newColor && newText) {
                // Get the selected range
                const selection = window.getSelection();
                let range = null;
                
                if (selection.rangeCount > 0) {
                    range = selection.getRangeAt(0);
                }
                
                // Remove old highlight completely
                const parent = highlightElement.parentNode;
                const textNode = document.createTextNode(highlightElement.textContent);
                parent.insertBefore(textNode, highlightElement);
                highlightElement.remove();
                parent.normalize();
                
                // Create new selection on the text node
                if (range && newText) {
                    // Create new range for the selected portion
                    const newRange = document.createRange();
                    const textContent = textNode.textContent;
                    const startIndex = textContent.indexOf(newText);
                    
                    if (startIndex !== -1) {
                        newRange.setStart(textNode, startIndex);
                        newRange.setEnd(textNode, startIndex + newText.length);
                        
                        // Create new highlight
                        if (global.TextHighlighter?.highlightRange) {
                            const result = await global.TextHighlighter.highlightRange(newRange, {
                                property: newProperty,
                                color: newColor,
                                text: newText,
                                source: 'update'
                            });
                            
                            if (result) {
                                console.log('✅ Highlight updated successfully');
                            }
                        } else {
                            // Fallback: create highlight manually
                            const newHighlight = document.createElement('span');
                            newHighlight.className = 'orkg-highlighted';
                            newHighlight.dataset.highlightId = markerData.id;
                            newHighlight.dataset.property = JSON.stringify(newProperty);
                            newHighlight.style.backgroundColor = newColor;
                            newHighlight.style.position = 'relative';
                            
                            try {
                                newRange.surroundContents(newHighlight);
                                
                                // Re-add marker
                                if (markerElement) {
                                    markerElement.dataset.metadata = JSON.stringify({
                                        ...markerData.metadata,
                                        property: newProperty,
                                        color: newColor,
                                        text: newText
                                    });
                                    newHighlight.appendChild(markerElement);
                                }
                            } catch (e) {
                                console.error('Error creating new highlight:', e);
                            }
                        }
                    }
                }
                
                // Clean up
                selectionOverlay.destroy();
                propertyWindow.hide();
                window.getSelection().removeAllRanges();
                
                this.showFeedback('Highlight updated successfully', 'success');
                this.sendToExtension('UPDATE', markerData.id, {
                    ...markerData,
                    metadata: {
                        ...markerData.metadata,
                        property: newProperty,
                        color: newColor,
                        text: newText
                    }
                });
            }
        });
    }, 100);
}

// Helper method to get text nodes
getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip text nodes inside marker elements
                if (node.parentElement.closest('.orkg-marker')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );
    
    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }
    return textNodes;
}
                
        createTextSelection(highlightElement) {
            const range = document.createRange();
            const textNodes = this.getTextNodes(highlightElement);
            
            if (textNodes.length > 0) {
                range.setStart(textNodes[0], 0);
                range.setEnd(textNodes[textNodes.length - 1], textNodes[textNodes.length - 1].length);
                
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
        
        getTextNodes(element) {
            const textNodes = [];
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        // Skip text nodes inside marker elements
                        if (node.parentElement.closest('.orkg-marker')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            while (walker.nextNode()) {
                textNodes.push(walker.currentNode);
            }
            return textNodes;
        }
        
        addUpdateVisualFeedback(element) {
            // Add visual feedback
            element.style.outline = '2px dashed #2196F3';
            element.style.outlineOffset = '3px';
            element.style.transition = 'all 0.3s ease';
            element.style.boxShadow = '0 0 12px rgba(33, 150, 243, 0.6)';
            element.classList.add('orkg-selection-active');
            
            // Add handles for resizing visualization
            element.style.position = 'relative';
            
            // Allow text selection changes
            let selectionHandler = () => {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const newText = selection.toString();
                    if (newText && global.propertyWindowInstance?.windowElement) {
                        const preview = global.propertyWindowInstance.windowElement.querySelector('.orkg-text-preview');
                        if (preview) {
                            preview.textContent = newText.length > 60 ? 
                                newText.substring(0, 60) + '...' : newText;
                        }
                    }
                }
            };
            
            document.addEventListener('selectionchange', selectionHandler);
            
            // Clean up when window closes
            const cleanup = setInterval(() => {
                if (!document.querySelector('.orkg-property-window.orkg-window-visible')) {
                    element.style.outline = '';
                    element.style.outlineOffset = '';
                    element.style.boxShadow = '';
                    element.classList.remove('orkg-selection-active');
                    document.removeEventListener('selectionchange', selectionHandler);
                    clearInterval(cleanup);
                }
            }, 500);
        }
        
        setupUpdateHandler(propertyWindow, highlightElement, markerData, originalText, range) {
            // Wait for DOM to be ready
            setTimeout(() => {
                const confirmBtn = propertyWindow.windowElement?.querySelector('.orkg-btn-confirm');
                if (!confirmBtn) return;
                
                // Clone button to remove existing listeners
                const newBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
                
                // Add update handler
                newBtn.addEventListener('click', async () => {
                    const newProperty = propertyWindow.selectedProperty;
                    const newColor = propertyWindow.selectedColor;
                    
                    if (newProperty && newColor) {
                        // Update the existing highlight
                        highlightElement.style.backgroundColor = newColor;
                        highlightElement.style.color = 'inherit';
                        highlightElement.dataset.property = JSON.stringify(newProperty);
                        highlightElement.dataset.propertyLabel = newProperty.label;
                        
                        // Update the marker element metadata if it exists
                        const markerEl = highlightElement.querySelector('.orkg-marker');
                        if (markerEl) {
                            const newMetadata = {
                                ...markerData.metadata,
                                property: newProperty,
                                color: newColor,
                                text: originalText,
                                highlightId: highlightElement.dataset.highlightId || highlightElement.id
                            };
                            markerEl.dataset.metadata = JSON.stringify(newMetadata);
                        }
                        
                        // Update in TextHighlighter registry if it exists
                        const highlightId = highlightElement.dataset.highlightId || highlightElement.id;
                        if (highlightId && global.TextHighlighter?.updateHighlight) {
                            global.TextHighlighter.updateHighlight(highlightId, {
                                property: newProperty,
                                color: newColor,
                                text: originalText
                            });
                        }
                        
                        // Close window
                        propertyWindow.hide();
                        
                        // Remove visual feedback
                        highlightElement.style.outline = '';
                        highlightElement.style.outlineOffset = '';
                        highlightElement.style.boxShadow = '';
                        highlightElement.classList.remove('orkg-selection-active');
                        
                        this.showFeedback('Highlight updated successfully', 'success');
                        this.sendToExtension('UPDATE', markerData.id, {
                            ...markerData,
                            metadata: {
                                ...markerData.metadata,
                                property: newProperty,
                                color: newColor,
                                text: originalText
                            }
                        });
                    }
                });
            }, 100);
        }
        
        // ================================
        // Info Action - ORKG STYLED MODAL
        // ================================
        
        handleInfo(markerId, markerData) {
            console.log('Showing info for:', markerId);
            this.showORKGInfoModal(markerData);
        }
        
        showORKGInfoModal(markerData) {
            // Remove existing modal
            const existing = document.querySelector('.orkg-info-modal-overlay');
            if (existing) existing.remove();
            
            // Create modal overlay
            const modal = document.createElement('div');
            modal.className = 'orkg-info-modal-overlay';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.5) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 2147483647 !important;
                opacity: 0 !important;
                transition: opacity 0.3s ease !important;
            `;
            
            // Create content container
            const content = document.createElement('div');
            content.className = 'orkg-info-modal-content';
            content.style.cssText = `
                background: white !important;
                border-radius: 8px !important;
                max-width: 400px !important;
                width: 90% !important;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
                overflow: hidden !important;
                transform: scale(0.9) !important;
                transition: transform 0.3s ease !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            `;
            
            // Create header with ORKG red gradient (like property window)
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding: 10px 14px !important;
                background: linear-gradient(135deg, #e86161 0%, #E04848 100%) !important;
                color: white !important;
                font-family: inherit !important;
            `;
            
            const title = document.createElement('h4');
            title.style.cssText = `
                margin: 0 !important;
                font-size: 14px !important;
                font-weight: 600 !important;
                color: white !important;
            `;
            title.textContent = `${this.formatType(markerData.type)} Marker Information`;
            header.appendChild(title);
            
            // Create body
            const body = document.createElement('div');
            body.style.cssText = `
                padding: 20px !important;
                font-family: inherit !important;
            `;
            body.innerHTML = this.getInfoBodyContent(markerData);
            
            // Create footer with ORKG-styled close button
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 14px !important;
                display: flex !important;
                justify-content: flex-end !important;
                background: #f8f9fa !important;
                border-top: 1px solid #e9ecef !important;
            `;
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = `
                padding: 8px 20px !important;
                background: #e86161 !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                font-size: 13px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                transition: background 0.2s !important;
                font-family: inherit !important;
            `;
            
            closeBtn.onmouseover = () => {
                closeBtn.style.background = '#E04848 !important';
            };
            
            closeBtn.onmouseout = () => {
                closeBtn.style.background = '#e86161 !important';
            };
            
            closeBtn.onclick = () => {
                modal.style.opacity = '0';
                content.style.transform = 'scale(0.9)';
                setTimeout(() => modal.remove(), 300);
            };
            
            footer.appendChild(closeBtn);
            
            // Assemble modal
            content.appendChild(header);
            content.appendChild(body);
            content.appendChild(footer);
            modal.appendChild(content);
            
            // Close on background click
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.style.opacity = '0';
                    content.style.transform = 'scale(0.9)';
                    setTimeout(() => modal.remove(), 300);
                }
            };
            
            document.body.appendChild(modal);
            
            // Animate in
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                content.style.transform = 'scale(1)';
            });
        }
        
        getInfoBodyContent(markerData) {
            const sections = [];
            
            // Text content
            if (markerData.metadata?.text) {
                sections.push(`
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 11px; color: #6c757d; text-transform: uppercase; margin-bottom: 4px;">
                            Selected Text
                        </div>
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 13px; color: #333; font-style: italic;">
                            "${this.escapeHtml(this.truncate(markerData.metadata.text, 150))}"
                        </div>
                    </div>
                `);
            }
            
            // Property
            if (markerData.metadata?.property?.label) {
                sections.push(`
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 11px; color: #6c757d; text-transform: uppercase; margin-bottom: 4px;">
                            Property
                        </div>
                        <div style="padding: 10px; background: #e8f5e9; border-radius: 4px; font-size: 14px; color: #2e7d32; font-weight: 500;">
                            ${this.escapeHtml(markerData.metadata.property.label)}
                        </div>
                    </div>
                `);
            }
            
            // Confidence
            if (markerData.metadata?.confidence) {
                const confidence = Math.round(markerData.metadata.confidence * 100);
                const color = this.getConfidenceColor(markerData.metadata.confidence);
                sections.push(`
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 11px; color: #6c757d; text-transform: uppercase; margin-bottom: 4px;">
                            Confidence Level
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="flex: 1; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
                                <div style="width: ${confidence}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
                            </div>
                            <span style="font-size: 13px; font-weight: 600; color: ${color};">${confidence}%</span>
                        </div>
                    </div>
                `);
            }
            
            // Created time
            if (markerData.createdAt) {
                sections.push(`
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 11px; color: #6c757d; text-transform: uppercase; margin-bottom: 4px;">
                            Created
                        </div>
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 13px; color: #666;">
                            ${new Date(markerData.createdAt).toLocaleString()}
                        </div>
                    </div>
                `);
            }
            
            return sections.join('');
        }
        
        // ================================
        // Send Action (keep as before)
        // ================================
        
        handleSend(markerId, markerData) {
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
                this.sendSingleItem(markerId, markerData);
            }
        }
        
        // Keep all other methods as before...
        
        formatType(type) {
            return type.charAt(0).toUpperCase() + type.slice(1);
        }
        
        truncate(text, maxLength) {
            if (!text) return '';
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
        
        getConfidenceColor(confidence) {
            if (confidence >= 0.8) return '#10b981';
            if (confidence >= 0.5) return '#f59e0b';
            return '#ef4444';
        }
        
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
        
        getAllTypeCounts() {
            const counts = {
                text: document.querySelectorAll('.orkg-highlighted').length,
                image: document.querySelectorAll('.orkg-image-marker').length,
                table: document.querySelectorAll('.orkg-table-marker').length,
                total: 0
            };
            
            if (global.TextHighlighter?.getHighlightCount) {
                counts.text = Math.max(counts.text, global.TextHighlighter.getHighlightCount());
            }
            
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
        
        cleanup() {
            this.isSetup = false;
            this.modalManager = null;
            this.propertyWindow = null;
            console.log('✅ MenuActionHandler cleaned up');
        }
    }
    
    // Export to global scope
    global.MenuActionHandler = MenuActionHandler;
    console.log('📢 MenuActionHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
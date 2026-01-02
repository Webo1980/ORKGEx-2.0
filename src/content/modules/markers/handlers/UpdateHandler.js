// src/content/modules/markers/handlers/UpdateHandler.js
// Handles marker updates with resizable selection feature

(function(global) {
    'use strict';
    
    class UpdateHandler {
        constructor(menuHandler) {
            this.menuHandler = menuHandler;
            this.propertyWindow = null;
            this.marker = null;
        }
        
        setup(propertyWindow, marker) {
            this.propertyWindow = propertyWindow;
            this.marker = marker;
        }
        
        async handle(markerId, markerData) {
            console.log('Handling update for:', markerId);
            
            if (markerData.type !== 'text') {
                this.menuHandler.showFeedback('Update is only available for text markers', 'warning');
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
                this.menuHandler.showFeedback('Property window not available', 'error');
                return;
            }
            
            // Find elements
            const markerElement = markerData.markerElement || 
                                document.querySelector(`[data-marker-id="${markerId}"]`);
            const highlightElement = markerElement?.closest('.orkg-highlighted');
            
            if (!highlightElement) {
                console.error('Could not find highlighted element');
                this.menuHandler.showFeedback('Could not find highlighted text', 'error');
                return;
            }
            
            // Store original highlight for restoration if needed
            this.originalHighlight = {
                element: highlightElement,
                color: highlightElement.style.backgroundColor,
                property: highlightElement.dataset.property
            };
            
            // Create resizable selection overlay
            const selectionOverlay = this.createResizableSelection(highlightElement, markerElement);
            
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
                
                // Setup update handler
                this.setupUpdateHandler(
                    propertyWindow, 
                    highlightElement, 
                    markerData, 
                    selectionOverlay,
                    markerElement,
                    markerId
                );
                
            } catch (error) {
                console.error('Error showing property window:', error);
                selectionOverlay.destroy();
                this.menuHandler.showFeedback('Error opening property window', 'error');
            }
        }
        
        createResizableSelection(highlightElement, markerElement) {
            // Get the full text content (excluding marker elements)
            const fullText = this.extractTextContent(highlightElement);
            const rect = highlightElement.getBoundingClientRect();
            
            // Create overlay container with better visibility
            const overlay = document.createElement('div');
            overlay.className = 'orkg-resizable-selection';
            overlay.style.cssText = `
                position: absolute;
                left: ${rect.left + window.scrollX}px;
                top: ${rect.top + window.scrollY}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                border: 3px dashed #2196F3;
                background: rgba(33, 150, 243, 0.15);
                pointer-events: none;
                z-index: 10000;
                box-sizing: border-box;
                transition: none;
            `;
            
            // Create more prominent resize handles
            const leftHandle = this.createResizeHandle('left');
            const rightHandle = this.createResizeHandle('right');
            
            // Create animated instruction
            const instruction = document.createElement('div');
            instruction.className = 'orkg-resize-instruction';
            instruction.style.cssText = `
                position: absolute;
                top: -40px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #2196F3, #1976D2);
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
                animation: bounceIn 0.5s ease, pulse 2s ease-in-out infinite;
                z-index: 10001;
            `;
            instruction.innerHTML = '↔️ Drag the blue handles to adjust selection';
            
            // Add CSS animation if not exists
            this.addResizeAnimations();
            
            overlay.appendChild(leftHandle);
            overlay.appendChild(rightHandle);
            overlay.appendChild(instruction);
            document.body.appendChild(overlay);
            
            // Selection state
            let startOffset = 0;
            let endOffset = fullText.length;
            let isDragging = false;
            let activeHandle = null;
            
            // Visual feedback element
            const selectionPreview = document.createElement('div');
            selectionPreview.style.cssText = `
                position: absolute;
                background: rgba(33, 150, 243, 0.2);
                border: 2px solid #2196F3;
                pointer-events: none;
                z-index: 9999;
                transition: all 0.1s ease;
                display: none;
            `;
            document.body.appendChild(selectionPreview);
            
            // Update visual selection
            const updateSelection = () => {
                const selection = window.getSelection();
                selection.removeAllRanges();
                
                if (startOffset < endOffset) {
                    const range = this.createRangeFromOffsets(
                        highlightElement, 
                        startOffset, 
                        endOffset, 
                        fullText
                    );
                    
                    if (range) {
                        selection.addRange(range);
                        
                        // Update overlay position based on selection
                        const selectionRects = range.getClientRects();
                        if (selectionRects.length > 0) {
                            const firstRect = selectionRects[0];
                            const lastRect = selectionRects[selectionRects.length - 1];
                            
                            // Update main overlay
                            overlay.style.left = `${firstRect.left + window.scrollX}px`;
                            overlay.style.width = `${lastRect.right - firstRect.left}px`;
                            overlay.style.top = `${firstRect.top + window.scrollY}px`;
                            overlay.style.height = `${Math.max(firstRect.height, lastRect.bottom - firstRect.top)}px`;
                            
                            // Update selection preview
                            if (isDragging) {
                                selectionPreview.style.display = 'block';
                                selectionPreview.style.left = `${firstRect.left + window.scrollX}px`;
                                selectionPreview.style.top = `${firstRect.top + window.scrollY}px`;
                                selectionPreview.style.width = `${lastRect.right - firstRect.left}px`;
                                selectionPreview.style.height = `${Math.max(firstRect.height, lastRect.bottom - firstRect.top)}px`;
                            }
                        }
                    }
                }
                
                // Update property window preview
                this.updatePreview(fullText.substring(startOffset, endOffset));
                
                // Update handle positions
                this.updateHandlePositions(leftHandle, rightHandle, overlay);
            };
            
            // Enhanced handle dragging
            const handleMouseDown = (e, handle, side) => {
                e.preventDefault();
                e.stopPropagation();
                isDragging = true;
                activeHandle = handle;
                document.body.style.cursor = 'ew-resize';
                handle.style.transform = side === 'left' ? 
                    'translateY(-50%) scale(1.3) translateX(-2px)' : 
                    'translateY(-50%) scale(1.3) translateX(2px)';
                instruction.style.display = 'none';
                selectionPreview.style.display = 'block';
            };
            
            const handleMouseMove = (e) => {
                if (!isDragging || !activeHandle) return;
                
                // Calculate position relative to the highlight
                const highlightRect = highlightElement.getBoundingClientRect();
                const relativeX = e.clientX - highlightRect.left;
                const percentage = Math.max(0, Math.min(1, relativeX / highlightRect.width));
                
                // Find the character position more accurately
                const charPosition = this.getCharacterPositionAtPoint(
                    highlightElement, 
                    e.clientX, 
                    fullText
                );
                
                if (activeHandle.dataset.side === 'left') {
                    startOffset = Math.min(charPosition, endOffset - 1);
                } else if (activeHandle.dataset.side === 'right') {
                    endOffset = Math.max(charPosition, startOffset + 1);
                }
                
                updateSelection();
            };
            
            const handleMouseUp = () => {
                if (isDragging && activeHandle) {
                    activeHandle.style.transform = 'translateY(-50%) scale(1)';
                }
                isDragging = false;
                activeHandle = null;
                document.body.style.cursor = '';
                selectionPreview.style.display = 'none';
            };
            
            // Add event listeners
            leftHandle.addEventListener('mousedown', (e) => handleMouseDown(e, leftHandle, 'left'));
            rightHandle.addEventListener('mousedown', (e) => handleMouseDown(e, rightHandle, 'right'));
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            // Initial selection
            updateSelection();
            
            // Return control interface
            return {
                getSelectedText: () => fullText.substring(startOffset, endOffset),
                getRange: () => window.getSelection().rangeCount > 0 ? 
                              window.getSelection().getRangeAt(0) : null,
                getOffsets: () => ({ start: startOffset, end: endOffset }),
                getFullText: () => fullText,
                destroy: () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    overlay.remove();
                    selectionPreview.remove();
                    window.getSelection().removeAllRanges();
                }
            };
        }
        
        createResizeHandle(side) {
            const handle = document.createElement('div');
            handle.className = `orkg-resize-handle orkg-resize-${side}`;
            handle.dataset.side = side;
            handle.style.cssText = `
                position: absolute;
                ${side}: -12px;
                top: 50%;
                transform: translateY(-50%);
                width: 24px;
                height: 40px;
                background: linear-gradient(135deg, #2196F3, #1976D2);
                border-radius: 12px;
                cursor: ew-resize;
                display: flex;
                align-items: center;
                justify-content: center;
                user-select: none;
                box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                z-index: 10002;
                pointer-events: all;
            `;
            
            // Add hover effect
            handle.onmouseover = () => {
                if (!handle.dataset.dragging) {
                    handle.style.transform = 'translateY(-50%) scale(1.1)';
                    handle.style.boxShadow = '0 6px 12px rgba(33, 150, 243, 0.5)';
                }
            };
            
            handle.onmouseout = () => {
                if (!handle.dataset.dragging) {
                    handle.style.transform = 'translateY(-50%) scale(1)';
                    handle.style.boxShadow = '0 4px 8px rgba(33, 150, 243, 0.3)';
                }
            };
            
            // Add arrow icon
            const arrow = document.createElement('span');
            arrow.style.cssText = `
                color: white;
                font-size: 14px;
                font-weight: bold;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            `;
            arrow.textContent = side === 'left' ? '◀' : '▶';
            handle.appendChild(arrow);
            
            return handle;
        }
        
        addResizeAnimations() {
            if (!document.querySelector('#orkg-resize-animations')) {
                const style = document.createElement('style');
                style.id = 'orkg-resize-animations';
                style.textContent = `
                    @keyframes bounceIn {
                        0% { opacity: 0; transform: translateX(-50%) scale(0.3); }
                        50% { transform: translateX(-50%) scale(1.05); }
                        100% { opacity: 1; transform: translateX(-50%) scale(1); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
                        50% { opacity: 0.9; transform: translateX(-50%) scale(0.98); }
                    }
                    .orkg-resize-handle:active {
                        transform: translateY(-50%) scale(1.2) !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        updateHandlePositions(leftHandle, rightHandle, overlay) {
            // Keep handles at the edges of the overlay
            leftHandle.style.left = '-12px';
            rightHandle.style.right = '-12px';
        }
        
        getCharacterPositionAtPoint(element, clientX, fullText) {
            // More accurate character position detection
            const selection = window.getSelection();
            const range = document.caretRangeFromPoint(clientX, element.getBoundingClientRect().top + 5);
            
            if (range && element.contains(range.commonAncestorContainer)) {
                // Calculate offset within the full text
                let offset = 0;
                const textNodes = this.getTextNodes(element);
                
                for (const node of textNodes) {
                    if (node === range.startContainer) {
                        return offset + range.startOffset;
                    }
                    offset += node.textContent.length;
                }
            }
            
            // Fallback to percentage-based calculation
            const rect = element.getBoundingClientRect();
            const relativeX = clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
            return Math.round(percentage * fullText.length);
        }
        
        setupUpdateHandler(propertyWindow, highlightElement, markerData, selectionOverlay, markerElement, markerId) {
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
                    const offsets = selectionOverlay.getOffsets();
                    const fullText = selectionOverlay.getFullText();
                    
                    if (!newProperty || !newColor || !newText) {
                        console.warn('Missing required data for update');
                        return;
                    }
                    
                    console.log('Updating highlight:', { newText, newProperty, newColor });
                    
                    // Get parent and position
                    const parent = highlightElement.parentNode;
                    const nextSibling = highlightElement.nextSibling;
                    
                    // Remove the old highlight completely (including all children)
                    const originalFullText = highlightElement.textContent;
                    highlightElement.remove();
                    
                    // Create text nodes for the three parts
                    const beforeText = originalFullText.substring(0, offsets.start);
                    const selectedText = originalFullText.substring(offsets.start, offsets.end);
                    const afterText = originalFullText.substring(offsets.end);
                    
                    // Insert the parts
                    const fragment = document.createDocumentFragment();
                    
                    if (beforeText) {
                        fragment.appendChild(document.createTextNode(beforeText));
                    }
                    
                    // Create new highlight for selected portion
                    const newHighlight = document.createElement('span');
                    const newHighlightId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    newHighlight.className = 'orkg-highlighted';
                    newHighlight.id = newHighlightId;
                    newHighlight.dataset.highlightId = newHighlightId;
                    newHighlight.dataset.property = JSON.stringify(newProperty);
                    newHighlight.dataset.propertyLabel = newProperty.label;
                    newHighlight.style.backgroundColor = newColor;
                    newHighlight.style.position = 'relative';
                    newHighlight.textContent = selectedText;
                    fragment.appendChild(newHighlight);
                    
                    if (afterText) {
                        fragment.appendChild(document.createTextNode(afterText));
                    }
                    
                    // Insert the fragment
                    parent.insertBefore(fragment, nextSibling);
                    
                    // Create new marker for the new highlight
                    if (global.TextMarker?.createMarkerForHighlight) {
                        global.TextMarker.createMarkerForHighlight(newHighlight, {
                            id: markerId, // Keep the same marker ID
                            property: newProperty,
                            color: newColor,
                            text: selectedText,
                            highlightId: newHighlightId,
                            source: 'update'
                        });
                    } else if (markerElement) {
                        // Reuse existing marker element
                        markerElement.dataset.metadata = JSON.stringify({
                            ...markerData.metadata,
                            property: newProperty,
                            color: newColor,
                            text: selectedText,
                            highlightId: newHighlightId
                        });
                        newHighlight.appendChild(markerElement);
                    }
                    
                    // Normalize parent
                    parent.normalize();
                    
                    // Clean up
                    selectionOverlay.destroy();
                    propertyWindow.hide();
                    window.getSelection().removeAllRanges();
                    
                    // Send update notification
                    this.menuHandler.showFeedback('Highlight updated successfully', 'success');
                    this.menuHandler.sendToExtension('UPDATE', markerId, {
                        ...markerData,
                        metadata: {
                            ...markerData.metadata,
                            property: newProperty,
                            color: newColor,
                            text: newText,
                            highlightId: newHighlightId
                        }
                    });
                });
            }, 100);
        }
        
        createRangeFromOffsets(element, startOffset, endOffset, fullText) {
            const range = document.createRange();
            const textNodes = this.getTextNodes(element);
            
            if (textNodes.length === 0) return null;
            
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
                try {
                    range.setStart(startNode, Math.min(startNodeOffset, startNode.textContent.length));
                    range.setEnd(endNode, Math.min(endNodeOffset, endNode.textContent.length));
                    return range;
                } catch (e) {
                    console.warn('Error setting range:', e);
                    return null;
                }
            }
            
            return null;
        }
        
        extractTextContent(element) {
            let text = '';
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        // Skip text inside marker elements
                        let parent = node.parentNode;
                        while (parent && parent !== element) {
                            if (parent.classList && (
                                parent.classList.contains('orkg-marker') ||
                                parent.classList.contains('orkg-marker-menu') ||
                                parent.classList.contains('orkg-marker-tooltip')
                            )) {
                                return NodeFilter.FILTER_REJECT;
                            }
                            parent = parent.parentNode;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                text += node.nodeValue;
            }
            
            return text;
        }
        
        getTextNodes(element) {
            const textNodes = [];
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        // Skip marker elements
                        let parent = node.parentNode;
                        while (parent && parent !== element) {
                            if (parent.classList && (
                                parent.classList.contains('orkg-marker') ||
                                parent.classList.contains('orkg-marker-menu') ||
                                parent.classList.contains('orkg-marker-tooltip')
                            )) {
                                return NodeFilter.FILTER_REJECT;
                            }
                            parent = parent.parentNode;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            return textNodes;
        }
        
        updatePreview(text) {
            if (global.propertyWindowInstance?.windowElement) {
                const preview = global.propertyWindowInstance.windowElement.querySelector('.orkg-text-preview');
                if (preview) {
                    preview.textContent = text.length > 60 ? 
                        text.substring(0, 60) + '...' : text;
                }
            }
        }
        
        cleanup() {
            this.propertyWindow = null;
            this.marker = null;
        }
    }
    
    // Export to global scope
    global.UpdateHandler = UpdateHandler;
    console.log('📢 UpdateHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
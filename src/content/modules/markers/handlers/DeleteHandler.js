// src/content/modules/markers/handlers/DeleteHandler.js
// Handles marker deletion with proper highlight removal

(function(global) {
    'use strict';
    
    class DeleteHandler {
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
                this.deleteTextHighlight(markerId, markerData);
            } else {
                this.deleteNonTextMarker(markerData);
            }
            
            // Clean up registries
            this.cleanupRegistries(markerId, markerData);
            
            // Send notification
            this.menuHandler.sendToExtension('DELETE', markerId, markerData);
            this.menuHandler.showFeedback('Marker deleted successfully', 'success');
        }
        
        deleteTextHighlight(markerId, markerData) {
            // Find the marker element
            const markerElement = markerData.markerElement || 
                                document.querySelector(`[data-marker-id="${markerId}"]`);
            
            if (!markerElement) {
                console.warn('Marker element not found');
                return;
            }
            
            // Find the parent highlight span
            const highlightSpan = markerElement.closest('.orkg-highlighted');
            
            if (!highlightSpan) {
                console.warn('Highlight span not found');
                markerElement.remove(); // Remove orphaned marker
                return;
            }
            
            console.log('Found highlight span to remove:', highlightSpan);
            
            // Store parent for later operations
            const parent = highlightSpan.parentNode;
            
            // Extract pure text content (excluding marker elements)
            const pureText = this.extractPureText(highlightSpan);
            
            // Create a clean text node
            const textNode = document.createTextNode(pureText);
            
            // Replace the entire highlight span with the text node
            parent.insertBefore(textNode, highlightSpan);
            highlightSpan.remove();
            
            // Normalize the parent to merge adjacent text nodes
            parent.normalize();
            
            console.log('✅ Highlight completely removed, text restored');
        }
        
        extractPureText(element) {
            let text = '';
            
            // Walk through all child nodes
            const walkNodes = (node) => {
                for (const child of node.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE) {
                        text += child.textContent;
                    } else if (child.nodeType === Node.ELEMENT_NODE) {
                        // Skip marker-related elements
                        const isMarkerElement = 
                            child.classList.contains('orkg-marker') ||
                            child.classList.contains('orkg-marker-menu') ||
                            child.classList.contains('orkg-marker-tooltip') ||
                            child.classList.contains('orkg-marker-icon-container') ||
                            child.classList.contains('orkg-marker-type-indicator');
                        
                        if (!isMarkerElement) {
                            // Recursively extract from non-marker elements
                            walkNodes(child);
                        }
                    }
                }
            };
            
            walkNodes(element);
            return text;
        }
        
        deleteNonTextMarker(markerData) {
            if (!markerData.markerElement?.parentNode) return;
            
            // Animate exit
            markerData.markerElement.classList.add('orkg-marker-exit');
            
            setTimeout(() => {
                if (markerData.markerElement?.parentNode) {
                    markerData.markerElement.remove();
                }
            }, 300);
        }
        
        cleanupRegistries(markerId, markerData) {
            // Remove from marker instance
            if (this.marker && typeof this.marker.removeMarker === 'function') {
                this.marker.removeMarker(markerId);
            }
            
            // Remove from global registry
            if (global.MarkerRegistry) {
                global.MarkerRegistry.unregister(markerId);
            }
            
            // Try to remove from TextHighlighter if it has a highlight ID
            const highlightId = markerData.metadata?.highlightId;
            if (highlightId && global.TextHighlighter?.removeHighlight) {
                global.TextHighlighter.removeHighlight(highlightId);
            }
            
            console.log(`✅ Cleaned up registries for ${markerData.type} marker:`, markerId);
        }
        
        cleanup() {
            this.modalManager = null;
            this.marker = null;
        }
    }
    
    // Export to global scope
    global.DeleteHandler = DeleteHandler;
    console.log('📢 DeleteHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
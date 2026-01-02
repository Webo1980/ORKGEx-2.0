// ================================
// src/content/modules/markers/MarkerPositioner.js
// Smart positioning system for all marker types
// ================================

(function(global) {
    'use strict';
    
    class MarkerPositioner {
        constructor() {
            this.MARKER_SIZE = 44;
            this.OFFSET = 10;
            this.MIN_VIEWPORT_MARGIN = 20;
            this.occupiedPositions = new Map();
        }
        
        /**
         * Find the best position for a marker
         */
        position(marker, element, type, options = {}) {
            // Clear any existing position
            this.clearPosition(marker);
            
            // Get the anchor element (visible element or caption)
            const anchor = this.findVisibleAnchor(element, type);
            if (!anchor) {
                console.warn('No visible anchor found for marker');
                return false;
            }
            
            // Calculate position based on type
            const position = this.calculatePosition(anchor, type, options);
            
            // Apply position to marker
            this.applyPosition(marker, position, anchor);
            
            // Track occupied position
            this.trackPosition(marker, position);
            
            return true;
        }
        
        /**
         * Find a visible anchor element for the marker
         */
        findVisibleAnchor(element, type) {
            // First check if element itself is visible
            if (this.isElementVisible(element)) {
                return element;
            }
            
            // For images/tables, look for caption
            if (type === 'image' || type === 'table') {
                // Check for figure/figcaption
                const figure = element.closest('figure');
                if (figure) {
                    const figcaption = figure.querySelector('figcaption');
                    if (figcaption && this.isElementVisible(figcaption)) {
                        return figcaption;
                    }
                }
                
                // Check for table caption
                if (type === 'table') {
                    const caption = element.querySelector('caption') || 
                                  element.previousElementSibling?.tagName === 'CAPTION' ? 
                                  element.previousElementSibling : null;
                    if (caption && this.isElementVisible(caption)) {
                        return caption;
                    }
                }
                
                // Look for nearby heading or label
                const label = this.findNearbyLabel(element);
                if (label) {
                    return label;
                }
            }
            
            // For text, find the parent container
            if (type === 'text') {
                let parent = element.parentElement;
                while (parent && !this.isElementVisible(parent)) {
                    parent = parent.parentElement;
                }
                return parent || element;
            }
            
            return element;
        }
        
        /**
         * Check if element is visible
         */
        isElementVisible(element) {
            if (!element) return false;
            
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            
            return rect.width > 0 && 
                   rect.height > 0 && 
                   style.display !== 'none' && 
                   style.visibility !== 'hidden' && 
                   parseFloat(style.opacity) > 0;
        }
        
        /**
         * Find nearby label or heading
         */
        findNearbyLabel(element) {
            // Check previous siblings for headings
            let sibling = element.previousElementSibling;
            let attempts = 0;
            
            while (sibling && attempts < 5) {
                if (sibling.matches('h1, h2, h3, h4, h5, h6, [class*="caption"], [class*="label"], [class*="title"]')) {
                    if (this.isElementVisible(sibling)) {
                        return sibling;
                    }
                }
                sibling = sibling.previousElementSibling;
                attempts++;
            }
            
            return null;
        }
        
        /**
         * Calculate optimal position for marker
         */
        calculatePosition(anchor, type, options) {
            const rect = anchor.getBoundingClientRect();
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            
            let position = {
                top: null,
                right: null,
                bottom: null,
                left: null,
                position: 'absolute'
            };
            
            switch (type) {
                case 'image':
                case 'table':
                    // Default to top-right
                    position.top = rect.top + scrollY + this.OFFSET;
                    position.right = document.documentElement.clientWidth - (rect.right + scrollX) + this.OFFSET;
                    
                    // Check if it fits in viewport
                    if (rect.right + this.MARKER_SIZE + this.OFFSET > window.innerWidth - this.MIN_VIEWPORT_MARGIN) {
                        // Move to top-left if doesn't fit on right
                        position.left = rect.left + scrollX + this.OFFSET;
                        position.right = null;
                    }
                    break;
                    
                case 'text':
                    // Float to the right margin
                    position.top = rect.top + scrollY;
                    position.left = rect.right + scrollX + this.OFFSET;
                    
                    // If text spans full width, position at right edge
                    if (rect.width > window.innerWidth * 0.8) {
                        position.position = 'fixed';
                        position.top = rect.top;
                        position.left = null;
                        position.right = this.MIN_VIEWPORT_MARGIN;
                    }
                    
                    // Avoid overlapping with existing markers
                    position = this.avoidOverlap(position, type);
                    break;
            }
            
            return position;
        }
        
        /**
         * Avoid overlapping with other markers
         */
        avoidOverlap(position, type) {
            const threshold = this.MARKER_SIZE + 10;
            let adjusted = {...position};
            let attempts = 0;
            
            while (this.hasOverlap(adjusted, threshold) && attempts < 5) {
                if (type === 'text') {
                    // Move down for text markers
                    adjusted.top = (adjusted.top || 0) + threshold;
                } else {
                    // Move left for other types
                    adjusted.right = (adjusted.right || 0) + threshold;
                }
                attempts++;
            }
            
            return adjusted;
        }
        
        /**
         * Check if position overlaps with existing markers
         */
        hasOverlap(position, threshold) {
            for (const [marker, pos] of this.occupiedPositions) {
                const distance = Math.sqrt(
                    Math.pow((position.top || 0) - (pos.top || 0), 2) +
                    Math.pow((position.left || 0) - (pos.left || 0), 2)
                );
                
                if (distance < threshold) {
                    return true;
                }
            }
            return false;
        }
        
        /**
         * Apply calculated position to marker
         */
        applyPosition(marker, position, anchor) {
            // Ensure marker container is properly positioned
            const container = marker.parentElement;
            if (container && container.classList.contains('orkg-marker-container')) {
                const anchorStyle = window.getComputedStyle(anchor);
                
                // Set container position relative to anchor
                if (anchorStyle.position === 'static') {
                    container.style.position = 'relative';
                }
            }
            
            // Apply position to marker
            marker.style.position = position.position || 'absolute';
            
            if (position.top !== null) {
                marker.style.top = `${position.top}px`;
                marker.style.bottom = 'auto';
            }
            if (position.right !== null) {
                marker.style.right = `${position.right}px`;
                marker.style.left = 'auto';
            }
            if (position.bottom !== null) {
                marker.style.bottom = `${position.bottom}px`;
                marker.style.top = 'auto';
            }
            if (position.left !== null) {
                marker.style.left = `${position.left}px`;
                marker.style.right = 'auto';
            }
        }
        
        /**
         * Track occupied position
         */
        trackPosition(marker, position) {
            this.occupiedPositions.set(marker, position);
        }
        
        /**
         * Clear position tracking
         */
        clearPosition(marker) {
            this.occupiedPositions.delete(marker);
        }
        
        /**
         * Clear all tracked positions
         */
        clearAll() {
            this.occupiedPositions.clear();
        }
    }
    
    // Create singleton instance
    const markerPositioner = new MarkerPositioner();
    
    // Export to global scope
    global.MarkerPositioner = MarkerPositioner;
    global.markerPositioner = markerPositioner;
    
})(typeof window !== 'undefined' ? window : this);
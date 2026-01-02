// ================================
// src/content/modules/markers/MarkerTooltip.js
// Enhanced tooltip system with proper z-index and positioning
// ================================

(function(global) {
    'use strict';
    
    class MarkerTooltip {
        constructor() {
            this.activeTooltips = new Map();
            this.tooltipContainer = null;
            this.TOOLTIP_OFFSET = 12;
            this.VIEWPORT_MARGIN = 10;
        }
        
        /**
         * Initialize tooltip system
         */
        init() {
            if (!this.tooltipContainer) {
                this.createTooltipContainer();
            }
        }
        
        /**
         * Create container for all tooltips
         */
        createTooltipContainer() {
            this.tooltipContainer = document.createElement('div');
            this.tooltipContainer.id = 'orkg-tooltip-container';
            this.tooltipContainer.className = 'orkg-tooltip-container';
            document.body.appendChild(this.tooltipContainer);
        }
        
        /**
         * Create and show tooltip
         */
        show(marker, content, options = {}) {
            this.init();
            
            // Remove any existing tooltip for this marker
            this.hide(marker);
            
            // Create tooltip element
            const tooltip = this.createTooltipElement(content, options);
            
            // Add to container
            this.tooltipContainer.appendChild(tooltip);
            
            // Position tooltip
            this.positionTooltip(tooltip, marker, options);
            
            // Store reference
            this.activeTooltips.set(marker, tooltip);
            
            // Show with animation
            requestAnimationFrame(() => {
                tooltip.classList.add('orkg-tooltip-visible');
            });
            
            return tooltip;
        }
        
        /**
         * Hide tooltip for marker
         */
        hide(marker) {
            const tooltip = this.activeTooltips.get(marker);
            if (tooltip) {
                tooltip.classList.remove('orkg-tooltip-visible');
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 200);
                this.activeTooltips.delete(marker);
            }
        }
        
        /**
         * Create tooltip element
         */
        createTooltipElement(content, options) {
            const tooltip = document.createElement('div');
            tooltip.className = 'orkg-tooltip-enhanced';
            
            // Add content
            if (typeof content === 'string') {
                tooltip.innerHTML = content;
            } else {
                tooltip.appendChild(content);
            }
            
            // Add arrow
            const arrow = document.createElement('div');
            arrow.className = 'orkg-tooltip-arrow';
            tooltip.appendChild(arrow);
            
            return tooltip;
        }
        
        /**
         * Position tooltip relative to marker
         */
        positionTooltip(tooltip, marker, options) {
            const markerRect = marker.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // Calculate initial position (above marker)
            let top = markerRect.top - tooltipRect.height - this.TOOLTIP_OFFSET;
            let left = markerRect.left + (markerRect.width / 2) - (tooltipRect.width / 2);
            
            // Check if tooltip fits above
            if (top < this.VIEWPORT_MARGIN) {
                // Position below instead
                top = markerRect.bottom + this.TOOLTIP_OFFSET;
                tooltip.classList.add('orkg-tooltip-below');
            }
            
            // Check horizontal boundaries
            if (left < this.VIEWPORT_MARGIN) {
                left = this.VIEWPORT_MARGIN;
                tooltip.classList.add('orkg-tooltip-left-aligned');
            } else if (left + tooltipRect.width > window.innerWidth - this.VIEWPORT_MARGIN) {
                left = window.innerWidth - tooltipRect.width - this.VIEWPORT_MARGIN;
                tooltip.classList.add('orkg-tooltip-right-aligned');
            }
            
            // Apply position
            tooltip.style.top = `${top + window.scrollY}px`;
            tooltip.style.left = `${left + window.scrollX}px`;
        }
        
        /**
         * Hide all tooltips
         */
        hideAll() {
            for (const [marker, tooltip] of this.activeTooltips) {
                this.hide(marker);
            }
        }
        
        /**
         * Cleanup tooltip system
         */
        cleanup() {
            this.hideAll();
            if (this.tooltipContainer && this.tooltipContainer.parentNode) {
                this.tooltipContainer.parentNode.removeChild(this.tooltipContainer);
            }
            this.tooltipContainer = null;
            this.activeTooltips.clear();
        }
    }
    
    // Create singleton instance
    const markerTooltip = new MarkerTooltip();
    
    // Export to global scope
    global.MarkerTooltip = MarkerTooltip;
    global.markerTooltip = markerTooltip;
    
})(typeof window !== 'undefined' ? window : this);
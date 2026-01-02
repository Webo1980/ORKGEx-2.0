// src/content/modules/markers/TextMarker.js

(function(global) {
    'use strict';
    
    class TextMarker extends BaseMarker {
        constructor(config = {}) {
            super(config);
            this.highlighter = null;
            this.markersByHighlightId = new Map(); // Track markers by highlight ID
            this.highlightToMarker = new Map(); // Map highlight IDs to marker IDs
        }
        
        getType() {
            return 'text';
        }
        
        getTypeIcon() {
            return `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm5 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6zm0 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6z"/>
            </svg>`;
        }
        
        async onInit() {
            // Initialize TextHighlighter
            this.highlighter = global.TextHighlighter;
            if (this.highlighter && typeof this.highlighter.init === 'function') {
                this.highlighter.init(this);
            }
            
            console.log('✅ TextMarker initialized with TextHighlighter');
        }
        
        async onActivate(config) {
            // Enable text highlighting
            if (this.highlighter && typeof this.highlighter.setMarkersActive === 'function') {
                this.highlighter.setMarkersActive(true);
            }
            
            // Get existing highlights and create markers for them
            const existingHighlights = this.highlighter?.getAllHighlights?.() || [];
            let createdCount = 0;
            
            for (const highlight of existingHighlights) {
                // Check if marker already exists for this highlight
                if (!this.highlightToMarker.has(highlight.id)) {
                    const markerData = this.createMarkerForHighlight(highlight);
                    if (markerData) {
                        createdCount++;
                    }
                }
            }
            
            const totalCount = this.highlighter?.getHighlightCount?.() || 0;
            
            return { 
                success: true, 
                count: totalCount,
                message: 'Text selection enabled. Select text to add markers.'
            };
        }
        
        onDeactivate() {
            // Disable text highlighting
            if (this.highlighter && typeof this.highlighter.setMarkersActive === 'function') {
                this.highlighter.setMarkersActive(false);
            }
            
            // Clear tracking maps
            this.markersByHighlightId.clear();
            this.highlightToMarker.clear();
        }
        
        createMarker(element, metadata = {}) {
            if (!element || !element.nodeType) {
                console.error('Invalid element provided to TextMarker');
                return null;
            }
            
            // Get highlight ID from metadata or element
            const highlightId = metadata.highlightId || 
                               element.dataset?.highlightId || 
                               metadata.id;
            
            // Check if marker already exists for this highlight
            if (highlightId && this.markersByHighlightId.has(highlightId)) {
                console.log('Marker already exists for highlight:', highlightId);
                return this.markersByHighlightId.get(highlightId);
            }
            
            // Check if element already has a marker as a child
            const existingMarker = element.querySelector('.orkg-marker');
            if (existingMarker) {
                console.log('Element already has a marker');
                const existingMarkerId = existingMarker.dataset.markerId;
                if (existingMarkerId) {
                    return this.markers.get(existingMarkerId) || this.registry?.get(existingMarkerId);
                }
            }
            
            // Ensure metadata has highlightId
            if (highlightId) {
                metadata.highlightId = highlightId;
            }
            
            // Create marker using base class
            const markerData = super.createMarker(element, metadata);
            
            if (markerData && highlightId) {
                // Track marker by highlight ID
                this.markersByHighlightId.set(highlightId, markerData);
                this.highlightToMarker.set(highlightId, markerData.id);
            }
            
            return markerData;
        }
        
        createMarkerForHighlight(highlight) {
            if (!highlight || !highlight.element) {
                return null;
            }
            
            // Check if marker already exists
            if (this.highlightToMarker.has(highlight.id)) {
                return this.markersByHighlightId.get(highlight.id);
            }
            
            const metadata = {
                highlightId: highlight.id,
                text: highlight.text,
                property: highlight.property,
                color: highlight.color,
                confidence: highlight.confidence,
                source: highlight.source || 'manual'
            };
            
            return this.createMarker(highlight.element, metadata);
        }
        
        removeMarker(markerId) {
            const markerData = this.markers.get(markerId) || this.registry?.get(markerId);
            
            if (markerData) {
                const highlightId = markerData.metadata?.highlightId;
                
                // Remove the highlight from TextHighlighter
                if (highlightId && this.highlighter && typeof this.highlighter.removeHighlight === 'function') {
                    console.log('Removing highlight:', highlightId);
                    const removed = this.highlighter.removeHighlight(highlightId);
                    if (removed) {
                        console.log('✅ Highlight removed successfully');
                    } else {
                        console.warn('Failed to remove highlight:', highlightId);
                    }
                }
                
                // Clean up tracking maps
                if (highlightId) {
                    this.markersByHighlightId.delete(highlightId);
                    this.highlightToMarker.delete(highlightId);
                }
                
                // Also try to remove any highlighted elements
                if (markerData.element) {
                    // If the element is a highlight span, remove it properly
                    if (markerData.element.classList.contains('orkg-highlighted')) {
                        const parent = markerData.element.parentNode;
                        if (parent) {
                            // Move text content back to parent
                            while (markerData.element.firstChild) {
                                parent.insertBefore(markerData.element.firstChild, markerData.element);
                            }
                            markerData.element.remove();
                        }
                    }
                }
            }
            
            // Call parent removeMarker
            return super.removeMarker(markerId);
        }
        
        onMarkerRemoved(markerId, markerData) {
            // Additional cleanup when marker is removed
            const highlightId = markerData.metadata?.highlightId;
            if (highlightId) {
                this.markersByHighlightId.delete(highlightId);
                this.highlightToMarker.delete(highlightId);
            }
        }
        
        syncWithHighlighter() {
            // Sync markers with TextHighlighter highlights
            if (!this.highlighter) return;
            
            const highlights = this.highlighter.getAllHighlights?.() || [];
            
            // Create markers for new highlights
            for (const highlight of highlights) {
                if (!this.highlightToMarker.has(highlight.id)) {
                    this.createMarkerForHighlight(highlight);
                }
            }
            
            // Remove markers for deleted highlights
            const highlightIds = new Set(highlights.map(h => h.id));
            for (const [highlightId, markerId] of this.highlightToMarker) {
                if (!highlightIds.has(highlightId)) {
                    this.removeMarker(markerId);
                }
            }
        }
        
        cleanup() {
            // Clear tracking maps
            this.markersByHighlightId.clear();
            this.highlightToMarker.clear();
            
            // Call parent cleanup
            super.cleanup();
        }
        
        getStatus() {
            const baseStatus = super.getStatus();
            return {
                ...baseStatus,
                highlightCount: this.highlighter?.getHighlightCount?.() || 0,
                trackedHighlights: this.markersByHighlightId.size
            };
        }
    }
    
    // Export to global scope
    global.TextMarker = TextMarker;
    
    console.log('📢 TextMarker class exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
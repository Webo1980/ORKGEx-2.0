// ================================
// src/content/modules/TextHighlighter.js - Complete Module with RAGHandler Integration
// ================================

(function(global) {
    'use strict';
    
    const TextHighlighter = (function() {
        // Private state
        let markersActive = false;
        let highlights = new Map();
        let selectedColor = null;
        let isHighlightMode = false;
        let currentProperty = null;
        let textMarker = null;
        let pendingHighlight = null;
        let lastSelectedRange = null;
        let ragHighlights = new Map();
        let isInitialized = false;
        
        // Dependencies
        let textSearchUtility = null;
        
        // Configuration
        const CONFIG = {
            MIN_SELECTION_LENGTH: 2,
            MAX_SELECTION_LENGTH: 500,
            DEFAULT_COLORS: [
                '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
                '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3',
                '#87CEEB', '#FFA07A', '#FFEFD5', '#F0FFF0'
            ],
            TOOLTIP_DELAY: 300,
            CONFIDENCE_THRESHOLDS: {
                HIGH: 0.8,
                MEDIUM: 0.5
            }
        };
        
        // ================================
        // Initialization
        // ================================
        
        function init(markerInstance) {
            if (isInitialized) {
                console.log('TextHighlighter already initialized');
                return true;
            }
            
            // Setup dependencies
            setupDependencies();
            
            // Setup text marker - try multiple ways
            if (markerInstance) {
                textMarker = markerInstance;
                console.log('✅ TextHighlighter initialized with provided TextMarker');
            } else if (typeof TextMarker !== 'undefined') {
                textMarker = new TextMarker();
                console.log('✅ TextHighlighter created new TextMarker instance');
            } else if (window.serviceRegistry && window.serviceRegistry.get('textMarker')) {
                textMarker = window.serviceRegistry.get('textMarker');
                console.log('✅ TextHighlighter got TextMarker from registry');
            } else {
                console.warn('⚠️ TextHighlighter initialized without TextMarker support');
            }
            
            setupSelectionHandler();
            isInitialized = true;
            console.log('✅ TextHighlighter initialized');
            return true;
        }
        
        function setupDependencies() {
            // Get TextSearchUtility if available
            textSearchUtility = global.textSearchUtility || 
                               (typeof TextSearchUtility !== 'undefined' ? new TextSearchUtility() : null) ||
                               global.serviceRegistry?.get('textSearchUtility');
            
            if (textSearchUtility) {
                console.log('✅ TextHighlighter: Using TextSearchUtility for advanced search');
            }
        }
        
        // ================================
        // Selection Handling
        // ================================
        
        function setupSelectionHandler() {
            document.addEventListener('mouseup', handleTextSelection);
            document.addEventListener('keyup', handleTextSelection);
            
            document.addEventListener('selectionchange', () => {
                const selection = window.getSelection();
                if (selection && !selection.isCollapsed && selection.toString().trim().length > CONFIG.MIN_SELECTION_LENGTH) {
                    try {
                        lastSelectedRange = selection.getRangeAt(0).cloneRange();
                    } catch (e) {
                        console.warn('Could not store selection range:', e);
                    }
                }
            });
        }
        
        function handleTextSelection(e) {
            if (shouldSkipSelection(e.target)) return;
            
            // Only show property window if markers are active
            if (!markersActive) {
                console.log('Text selection ignored - markers not active');
                return;
            }
            
            // Store selection immediately, don't wait for setTimeout
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (isValidSelection(selectedText)) {
                try {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    
                    if (rect.width > 0 && rect.height > 0) {
                        // Store the range IMMEDIATELY
                        storePendingHighlight(range.cloneRange(), selectedText, selection);
                        
                        // Then show property window (which might clear the selection)
                        setTimeout(() => {
                            showPropertyWindow(selectedText, {
                                x: rect.right + window.scrollX,
                                y: rect.top + window.scrollY
                            });
                        }, 10);
                    }
                } catch (error) {
                    console.warn('Error handling text selection:', error);
                }
            }
        }
        
        function shouldSkipSelection(target) {
            return target.closest('.orkg-marker') || 
                   target.closest('.orkg-property-selection-window') ||
                   target.closest('.orkg-highlighted') ||
                   target.closest('.orkg-rag-highlight');
        }
        
        function isValidSelection(text) {
            return text.length > CONFIG.MIN_SELECTION_LENGTH && 
                   text.length < CONFIG.MAX_SELECTION_LENGTH;
        }
        
        function storePendingHighlight(range, text, selection) {
            const clonedRange = range.cloneRange();
            pendingHighlight = {
                range: clonedRange,
                text: text,
                selection: selection
            };
            lastSelectedRange = clonedRange;
            console.log('📌 Text selected, storing range:', text.substring(0, 50) + '...');
        }
        
        // ================================
        // Manual Highlighting
        // ================================
        
        function highlight(property, color, editMode = false, existingHighlightId = null) {
            console.log("📌 highlight called. pendingHighlight:", pendingHighlight, "lastSelectedRange:", lastSelectedRange);

            // Use saved range from PropertyWindow if available
            const range = window.propertyWindow?.savedRange || pendingHighlight?.range || lastSelectedRange;
            const text = pendingHighlight?.text || range?.toString();
            
            console.log("📌 Using range:", range, "text:", text);

            if (!range || !text) {
                console.warn('⚠️ Invalid range or text for highlighting');
                return null;
            }
            
            try {
                const highlightId = existingHighlightId || generateHighlightId();
                const finalColor = color || getRandomColor();
                
                let span;
                if (editMode && existingHighlightId) {
                    span = document.querySelector(`[data-highlight-id="${existingHighlightId}"]`);
                    if (span) {
                        updateHighlightElement(span, property, finalColor);
                    }
                } else {
                    span = createHighlightElement(range, highlightId, property, finalColor);
                }
                
                if (!span) {
                    console.error('Failed to create highlight element');
                    return null;
                }
                
                const highlightData = {
                    id: highlightId,
                    element: span,
                    text: text,
                    property: property,
                    color: finalColor,
                    timestamp: Date.now(),
                    source: 'manual',
                    editable: true
                };
                
                highlights.set(highlightId, highlightData);
                
                // ENSURE TEXT MARKER IS CREATED
                if (!textMarker) {
                    console.log('⚠️ TextMarker not initialized, attempting to create one');
                    if (typeof TextMarker !== 'undefined') {
                        textMarker = new TextMarker();
                        console.log('✅ TextMarker created on demand');
                    }
                }
                
                if (textMarker && typeof textMarker.createMarker === 'function') {
                    // Use requestAnimationFrame to ensure DOM is ready
                    requestAnimationFrame(() => {
                        createTextMarkerForHighlight(span, highlightData);
                    });
                } else {
                    console.warn('⚠️ TextMarker not available for creating marker');
                }
                
                clearPendingHighlight();
                sendHighlightToExtension(highlightData);
                
                console.log('✅ Manual highlight created:', highlightData);
                return highlightData;
                
            } catch (error) {
                console.error('Failed to create highlight:', error);
                return null;
            }
        }
        
        // ================================
        // RAG Highlighting
        // ================================
        
        function highlightFromRAG(ragData) {
            console.log('🤖 RAG highlight request received');
            
            const {
                range,
                text,
                property,
                confidence,
                section,
                sentenceIndex,
                color
            } = ragData;
            
            // Validate inputs
            if (!range) {
                console.error('No range provided for RAG highlight');
                return null;
            }
            
            const highlightId = generateHighlightId('rag');
            const finalColor = color || property?.color || getPropertyColorFromRAG(property);
            
            // Create the highlight element
            const span = createRAGHighlightElement(range, highlightId, property, finalColor, confidence);
            if (!span) {
                console.error('Failed to create RAG highlight element');
                return null;
            }
            
            // Create highlight data
            const highlightData = {
                id: highlightId,
                element: span,
                text: text || span.textContent,
                property: property || { id: 'unknown', label: 'Unknown Property' },
                color: finalColor,
                confidence: confidence || 0,
                section: section,
                sentenceIndex: sentenceIndex,
                timestamp: Date.now(),
                source: 'rag'
            };
            
            // Store in both maps
            highlights.set(highlightId, highlightData);
            ragHighlights.set(highlightId, highlightData);
            
            // Create marker if available
            if (textMarker && typeof textMarker.createMarker === 'function') {
                setTimeout(() => {
                    createRAGTextMarker(span, highlightData);
                }, 100);
            }
            
            // Setup interactions
            setupRAGHighlightHoverEffect(span, property, confidence);
            
            // Notify extension
            sendRAGHighlightToExtension(highlightData);
            
            console.log('✅ RAG highlight created:', highlightData);
            return highlightData;
        }
        
        /**
         * Create highlight from a Range object
         * Used by RAGHandler for creating highlights
         */
        async function highlightRange(range, metadata = {}) {
            if (!range || !range.toString()) {
                console.warn('⚠️ Invalid range for highlighting');
                return null;
            }
            
            const text = range.toString();
            const highlightId = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            try {
                // Create highlight span
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'orkg-highlighted';
                highlightSpan.id = highlightId;
                highlightSpan.dataset.highlightId = highlightId;
                highlightSpan.dataset.property = JSON.stringify(metadata.property || {});
                highlightSpan.dataset.propertyLabel = metadata.property?.label || '';
                highlightSpan.style.backgroundColor = metadata.color || '#ffeb3b';
                highlightSpan.style.color = 'inherit';
                highlightSpan.style.position = 'relative';
                
                // Wrap the range content
                try {
                    range.surroundContents(highlightSpan);
                } catch (e) {
                    // If surroundContents fails, extract and insert manually
                    const contents = range.extractContents();
                    highlightSpan.appendChild(contents);
                    range.insertNode(highlightSpan);
                }
                
                // Store in registry
                if (this.highlights) {
                    this.highlights.set(highlightId, {
                        id: highlightId,
                        element: highlightSpan,
                        text: text,
                        metadata: metadata,
                        createdAt: Date.now()
                    });
                }
                
                // Create marker if TextMarker is available
                if (global.TextMarker?.createMarkerForHighlight) {
                    global.TextMarker.createMarkerForHighlight(highlightSpan, {
                        ...metadata,
                        highlightId: highlightId,
                        text: text
                    });
                }
                
                return {
                    id: highlightId,
                    element: highlightSpan,
                    text: text
                };
                
            } catch (error) {
                console.error('Failed to create highlight:', error);
                return null;
            }
        }
        
        // ================================
        // Element Creation
        // ================================
        
        function createHighlightElement(range, highlightId, property, color) {
            const span = document.createElement('span');
            span.className = 'orkg-highlighted';
            span.dataset.highlightId = highlightId;
            span.dataset.property = JSON.stringify(property);
            span.dataset.propertyLabel = property.label || property.property;
            
            span.style.cssText = `
                background-color: ${color} !important;
                padding: 2px 4px !important;
                border-radius: 3px !important;
                position: relative !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
            `;
            
            const contents = range.extractContents();
            span.appendChild(contents);
            range.insertNode(span);
            
            setupHighlightInteractions(span, property);
            return span;
        }
        
        function createRAGHighlightElement(range, highlightId, property, color, confidence) {
            try {
                const span = document.createElement('span');
                span.className = 'orkg-highlighted orkg-rag-highlight';
                span.dataset.highlightId = highlightId;
                span.dataset.property = JSON.stringify(property);
                span.dataset.propertyLabel = property?.label || property?.property || 'Unknown';
                span.dataset.confidence = confidence || 0;
                span.dataset.source = 'rag';
                
                span.style.cssText = `
                    background-color: ${color} !important;
                    padding: 2px 4px !important;
                    border-radius: 3px !important;
                    position: relative !important;
                    cursor: pointer !important;
                    border-bottom: 2px solid ${adjustColorBrightness(color, -20)} !important;
                    transition: all 0.2s ease !important;
                    ${confidence && confidence < 0.7 ? 'opacity: 0.85;' : ''}
                `;
                
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
                
                return span;
            } catch (error) {
                console.error('Error creating RAG highlight element:', error);
                return null;
            }
        }
        
        function updateHighlightElement(span, property, color) {
            span.dataset.property = JSON.stringify(property);
            span.dataset.propertyLabel = property.label || property.property;
            span.style.backgroundColor = `${color} !important`;
        }
        
        // ================================
        // Marker Creation
        // ================================
        
        function createTextMarkerForHighlight(span, highlightData) {
            try {
                // Ensure the span still exists in DOM
                if (!document.body.contains(span)) {
                    console.warn('Highlight span not in DOM, cannot create marker');
                    return;
                }
                
                const markerMetadata = {
                    highlightId: highlightData.id,
                    text: highlightData.text,
                    property: highlightData.property,
                    color: highlightData.color,
                    source: highlightData.source || 'manual'
                };
                
                console.log('📍 Creating text marker with metadata:', markerMetadata);
                
                const marker = textMarker.createMarker(span, markerMetadata);
                if (marker) {
                    // Ensure span is relatively positioned for absolute marker positioning
                    span.style.position = 'relative';
                    
                    // Style the marker
                    styleMarker(marker, highlightData.source);
                    
                    // Append marker to the highlight span
                    span.appendChild(marker);
                    
                    // Store marker reference
                    highlightData.marker = marker;
                    
                    console.log('✅ Text marker created and attached for highlight:', highlightData.id);
                } else {
                    console.error('❌ TextMarker.createMarker returned null');
                }
            } catch (error) {
                console.error('Failed to create text marker:', error);
            }
        }
        
        function createRAGTextMarker(span, highlightData) {
            try {
                const markerMetadata = {
                    highlightId: highlightData.id,
                    text: highlightData.text,
                    property: highlightData.property,
                    color: highlightData.color,
                    confidence: highlightData.confidence,
                    section: highlightData.section,
                    sentenceIndex: highlightData.sentenceIndex,
                    source: 'rag'
                };
                
                const marker = textMarker.createMarker(span, markerMetadata);
                if (marker) {
                    styleRAGMarker(marker, highlightData.confidence);
                    span.style.position = 'relative';
                    span.appendChild(marker);
                    highlightData.marker = marker;
                    console.log('✅ RAG text marker created for highlight:', highlightData.id);
                }
            } catch (error) {
                console.error('Failed to create RAG text marker:', error);
            }
        }
        
        function styleMarker(marker, source) {
            const baseStyles = `
                position: absolute !important;
                top: -12px !important;
                right: -12px !important;
                width: 28px !important;
                height: 28px !important;
                border-radius: 50% !important;
                border: 2px solid rgba(255, 255, 255, 0.95) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
                transition: all 300ms ease !important;
                z-index: 10002 !important;
            `;
            
            const backgroundStyle = source === 'rag' 
                ? 'background: linear-gradient(135deg, #2196F3, #667eea) !important;'
                : 'background: linear-gradient(135deg, #4CAF50, #45a049) !important;';
            
            marker.style.cssText = baseStyles + backgroundStyle + 
                'box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2) !important;';
        }
        
        function styleRAGMarker(marker, confidence) {
            styleMarker(marker, 'rag');
            
            if (confidence) {
                const confidenceBadge = document.createElement('div');
                confidenceBadge.style.cssText = `
                    position: absolute !important;
                    bottom: -4px !important;
                    right: -4px !important;
                    background: ${getConfidenceColor(confidence)} !important;
                    color: white !important;
                    font-size: 9px !important;
                    font-weight: bold !important;
                    padding: 2px 4px !important;
                    border-radius: 10px !important;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
                `;
                confidenceBadge.textContent = `${Math.round(confidence * 100)}%`;
                marker.appendChild(confidenceBadge);
            }
        }
        
        // ================================
        // Interaction Handlers
        // ================================
        
        function setupHighlightInteractions(span, property) {
            let tooltipTimeout;
            
            span.addEventListener('mouseenter', function(e) {
                if (e.target.closest('.orkg-marker')) return;
                
                span.style.filter = 'brightness(0.95)';
                tooltipTimeout = setTimeout(() => {
                    showTooltip(span, property);
                }, CONFIG.TOOLTIP_DELAY);
            });
            
            span.addEventListener('mouseleave', function() {
                clearTimeout(tooltipTimeout);
                span.style.filter = '';
                removeTooltip(span);
            });
            
            span.addEventListener('click', function(e) {
                if (e.target.closest('.orkg-marker')) return;
                e.stopPropagation();
                handleHighlightClick(span);
            });
        }
        
        function setupRAGHighlightHoverEffect(span, property, confidence) {
            let tooltipTimeout;
            
            span.addEventListener('mouseenter', function(e) {
                if (e.target.closest('.orkg-marker')) return;
                
                span.style.filter = 'brightness(0.95)';
                span.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                span.style.transform = 'translateY(-1px)';
                
                tooltipTimeout = setTimeout(() => {
                    showRAGTooltip(span, property, confidence);
                }, CONFIG.TOOLTIP_DELAY);
            });
            
            span.addEventListener('mouseleave', function() {
                clearTimeout(tooltipTimeout);
                span.style.filter = '';
                span.style.boxShadow = '';
                span.style.transform = '';
                removeTooltip(span);
            });
            
            span.addEventListener('click', function(e) {
                if (e.target.closest('.orkg-marker')) return;
                e.stopPropagation();
                handleRAGHighlightClick(span);
            });
        }
        
        // ================================
        // Tooltips
        // ================================
        
        function showTooltip(element, property) {
            removeTooltip(element);
            
            const tooltip = createTooltipElement(property);
            element.appendChild(tooltip);
        }
        
        function showRAGTooltip(element, property, confidence) {
            removeTooltip(element);
            
            const tooltip = createRAGTooltipElement(property, confidence);
            element.appendChild(tooltip);
        }
        
        function createTooltipElement(property) {
            const tooltip = document.createElement('div');
            tooltip.className = 'orkg-tooltip';
            tooltip.style.cssText = `
                position: absolute !important;
                bottom: calc(100% + 10px) !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                background: rgba(33, 33, 33, 0.95) !important;
                color: white !important;
                padding: 8px 12px !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                white-space: nowrap !important;
                z-index: 10003 !important;
                pointer-events: none !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
            `;
            
            tooltip.innerHTML = `
                <div style="font-weight: 600;">
                    ${escapeHtml(property.label || property.property || 'Unknown Property')}
                </div>
                <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); 
                     width: 0; height: 0; border: 5px solid transparent; 
                     border-top-color: rgba(33, 33, 33, 0.95);"></div>
            `;
            
            return tooltip;
        }
        
        function createRAGTooltipElement(property, confidence) {
            const tooltip = document.createElement('div');
            tooltip.className = 'orkg-rag-tooltip';
            tooltip.style.cssText = `
                position: absolute !important;
                bottom: calc(100% + 10px) !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                background: linear-gradient(135deg, #1e3a8a, #312e81) !important;
                color: white !important;
                padding: 10px 14px !important;
                border-radius: 8px !important;
                font-size: 12px !important;
                z-index: 10003 !important;
                pointer-events: none !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
                min-width: 180px !important;
            `;
            
            const confidenceLevel = getConfidenceLevel(confidence);
            const confidenceColor = getConfidenceColor(confidence || 0);
            
            tooltip.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span style="background: rgba(255,255,255,0.2); padding: 2px 6px; 
                         border-radius: 4px; font-size: 10px; text-transform: uppercase; 
                         letter-spacing: 0.5px;">RAG</span>
                    <span style="font-weight: 600; flex: 1;">
                        ${escapeHtml(property?.label || property?.property || 'Unknown')}
                    </span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; opacity: 0.9;">
                    <span style="font-size: 11px;">Confidence:</span>
                    <span style="background: ${confidenceColor}; padding: 2px 6px; 
                         border-radius: 4px; font-weight: 600; font-size: 11px;">
                        ${confidence ? `${Math.round(confidence * 100)}%` : 'N/A'}
                    </span>
                    <span style="font-size: 11px; opacity: 0.8;">(${confidenceLevel})</span>
                </div>
                <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); 
                     width: 0; height: 0; border: 6px solid transparent; 
                     border-top-color: #1e3a8a;"></div>
            `;
            
            return tooltip;
        }
        
        function removeTooltip(element) {
            const tooltips = element.querySelectorAll('.orkg-tooltip, .orkg-rag-tooltip');
            tooltips.forEach(tooltip => tooltip.remove());
        }
        
        // ================================
        // Click Handlers
        // ================================
        
        function handleHighlightClick(span) {
            const highlightId = span.dataset.highlightId;
            const highlight = highlights.get(highlightId);
            if (highlight) {
                showHighlightInfo(highlight);
            }
        }
        
        function handleRAGHighlightClick(span) {
            const highlightId = span.dataset.highlightId;
            const highlight = ragHighlights.get(highlightId) || highlights.get(highlightId);
            if (highlight) {
                showRAGHighlightInfo(highlight);
            }
        }
        
        function showHighlightInfo(highlight) {
            console.log('Highlight info:', highlight);
            // Can be extended to show a modal or send to extension
        }
        
        function showRAGHighlightInfo(highlight) {
            const modal = createRAGInfoModal(highlight);
            document.body.appendChild(modal);
            
            setTimeout(() => {
                modal.style.opacity = '1';
                const content = modal.querySelector('.modal-content');
                if (content) {
                    content.style.transform = 'translate(-50%, -50%) scale(1)';
                }
            }, 10);
        }
        
        function createRAGInfoModal(highlight) {
            const modal = document.createElement('div');
            modal.className = 'orkg-rag-info-modal';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.5) !important;
                z-index: 100000 !important;
                opacity: 0 !important;
                transition: opacity 0.3s ease !important;
            `;
            
            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.cssText = `
                position: absolute !important;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%) scale(0.9) !important;
                background: white !important;
                border-radius: 12px !important;
                padding: 20px !important;
                max-width: 400px !important;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
                transition: transform 0.3s ease !important;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
            `;
            
            const confidenceBar = highlight.confidence ? `
                <div style="margin-top: 4px;">
                    <div style="background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: ${getConfidenceColor(highlight.confidence)}; 
                             width: ${highlight.confidence * 100}%; height: 100%; 
                             transition: width 0.3s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 4px; 
                         font-size: 11px; color: #6b7280;">
                        <span>${Math.round(highlight.confidence * 100)}% confidence</span>
                        <span>${getConfidenceLevel(highlight.confidence)}</span>
                    </div>
                </div>
            ` : '';
            
            content.innerHTML = `
                <div style="margin-bottom: 16px;">
                    <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px; 
                         display: flex; align-items: center; gap: 8px;">
                        <span style="background: linear-gradient(135deg, #e86161, #FF6B6B); 
                             color: white; padding: 4px 8px; border-radius: 6px; 
                             font-size: 12px;">RAG</span>
                        Extracted Property
                    </h3>
                </div>
                
                <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">
                            Property:</strong>
                        <div style="color: #1e293b; font-size: 14px; margin-top: 4px;">
                            ${escapeHtml(highlight.property?.label || 'Unknown')}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 8px;">
                        <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">
                            Text:</strong>
                        <div style="color: #1e293b; font-size: 14px; margin-top: 4px; font-style: italic;">
                            "${escapeHtml(highlight.text)}"
                        </div>
                    </div>
                    
                    ${highlight.confidence ? `
                        <div>
                            <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">
                                Confidence:</strong>
                            ${confidenceBar}
                        </div>
                    ` : ''}
                    
                    ${highlight.section ? `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                            <span style="color: #64748b; font-size: 12px;">
                                Section: ${escapeHtml(highlight.section)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <button onclick="this.closest('.orkg-rag-info-modal').remove()" 
                    style="width: 100%; padding: 10px; background: #e86161; color: white; 
                         border: none; border-radius: 8px; font-size: 14px; font-weight: 600; 
                         cursor: pointer; transition: background 0.2s;">
                    Close
                </button>
            `;
            
            modal.appendChild(content);
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            return modal;
        }
        
        // ================================
        // Highlight Management
        // ================================
        
        function removeHighlight(highlightId) {
            const highlight = highlights.get(highlightId) || ragHighlights.get(highlightId);
            if (!highlight) return false;
            
            if (highlight.element && highlight.element.parentNode) {
                const textContent = highlight.element.textContent;
                const textNode = document.createTextNode(textContent);
                highlight.element.parentNode.replaceChild(textNode, highlight.element);
            }
            
            highlights.delete(highlightId);
            ragHighlights.delete(highlightId);
            
            sendHighlightRemovalToExtension(highlightId);
            console.log('✅ Highlight removed:', highlightId);
            return true;
        }
        
        function clearAllHighlights() {
            const allHighlights = [...highlights.values(), ...ragHighlights.values()];
            
            allHighlights.forEach(highlight => {
                if (highlight.element && highlight.element.parentNode) {
                    const textContent = highlight.element.textContent;
                    const textNode = document.createTextNode(textContent);
                    highlight.element.parentNode.replaceChild(textNode, highlight.element);
                }
            });
            
            highlights.clear();
            ragHighlights.clear();
            
            console.log('✅ All highlights cleared');
        }
        
        // ================================
        // Communication with Extension
        // ================================
        
        function sendHighlightToExtension(highlightData) {
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'TEXT_HIGHLIGHT_CREATED',
                    data: {
                        id: highlightData.id,
                        text: highlightData.text,
                        property: highlightData.property,
                        color: highlightData.color,
                        timestamp: highlightData.timestamp,
                        source: highlightData.source
                    }
                }, response => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending highlight to extension:', chrome.runtime.lastError);
                    }
                });
            }
        }
        
        function sendRAGHighlightToExtension(highlightData) {
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'RAG_HIGHLIGHT_CREATED',
                    data: {
                        id: highlightData.id,
                        text: highlightData.text,
                        property: highlightData.property,
                        color: highlightData.color,
                        confidence: highlightData.confidence,
                        section: highlightData.section,
                        sentenceIndex: highlightData.sentenceIndex,
                        timestamp: highlightData.timestamp,
                        source: 'rag'
                    }
                }, response => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending RAG highlight to extension:', chrome.runtime.lastError);
                    }
                });
            }
        }
        
        function sendHighlightRemovalToExtension(highlightId) {
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'TEXT_HIGHLIGHT_REMOVED',
                    data: { id: highlightId }
                });
            }
        }
        
        // ================================
        // Utility Functions
        // ================================
        
        function showPropertyWindow(selectedText, position) {
            if (global.propertyWindow) {
                global.propertyWindow.show(selectedText, position);  // CORRECT
            } else if (global.PropertyWindow) {
                // Create instance if class exists but instance doesn't
                global.propertyWindow = new global.PropertyWindow();
                global.propertyWindow.show(selectedText, position);
            }
        }
        
        function getRandomColor() {
            return CONFIG.DEFAULT_COLORS[Math.floor(Math.random() * CONFIG.DEFAULT_COLORS.length)];
        }
        
        function generateHighlightId(prefix = 'highlight') {
            return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        function getPropertyColorFromRAG(property) {
            if (property?.color) return property.color;
            
            const hash = (property?.id || property?.label || '').split('').reduce((acc, char) => {
                return ((acc << 5) - acc) + char.charCodeAt(0);
            }, 0);
            
            return CONFIG.DEFAULT_COLORS[Math.abs(hash) % CONFIG.DEFAULT_COLORS.length];
        }
        
        function adjustColorBrightness(color, percent) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;
            
            return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
                (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
                (B < 255 ? B < 1 ? 0 : B : 255))
                .toString(16).slice(1);
        }
        
        function getConfidenceLevel(confidence) {
            if (!confidence) return 'Unknown';
            if (confidence >= CONFIG.CONFIDENCE_THRESHOLDS.HIGH) return 'High';
            if (confidence >= CONFIG.CONFIDENCE_THRESHOLDS.MEDIUM) return 'Medium';
            return 'Low';
        }
        
        function getConfidenceColor(confidence) {
            if (confidence >= CONFIG.CONFIDENCE_THRESHOLDS.HIGH) return '#10b981';
            if (confidence >= CONFIG.CONFIDENCE_THRESHOLDS.MEDIUM) return '#f59e0b';
            return '#ef4444';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function clearPendingHighlight() {
            pendingHighlight = null;
            if (window.getSelection) {
                window.getSelection().removeAllRanges();
            }
        }
        
        // ================================
        // Public API
        // ================================
        
        return {
            // Initialization
            init: init,
            isInitialized: () => isInitialized,
            
            // Core highlighting methods
            highlight: highlight,
            highlightFromRAG: highlightFromRAG,
            highlightRange: highlightRange,
            
            // Highlight management
            removeHighlight: function(highlightId) {
                console.log('Removing highlight:', highlightId);
                
                // Get the highlight from internal maps
                const highlight = highlights.get(highlightId) || ragHighlights.get(highlightId);
                
                if (!highlight) {
                    console.warn('Highlight not found:', highlightId);
                    return false;
                }
                
                // Remove from DOM
                if (highlight.element && highlight.element.parentNode) {
                    const parent = highlight.element.parentNode;
                    
                    // Extract text content
                    while (highlight.element.firstChild) {
                        parent.insertBefore(highlight.element.firstChild, highlight.element);
                    }
                    
                    // Remove the empty highlight element
                    highlight.element.remove();
                }
                
                // Also remove any other elements with this highlight ID
                const additionalElements = document.querySelectorAll(`[data-highlight-id="${highlightId}"]`);
                additionalElements.forEach(element => {
                    if (element !== highlight.element) {
                        const parent = element.parentNode;
                        while (element.firstChild) {
                            parent.insertBefore(element.firstChild, element);
                        }
                        element.remove();
                    }
                });
                
                // Remove from storage maps
                highlights.delete(highlightId);
                ragHighlights.delete(highlightId);
                
                // Normalize text nodes
                document.normalize();
                
                // Send notification to extension
                sendHighlightRemovalToExtension(highlightId);
                
                // Emit event if EventBus is available
                if (global.MarkerEventBus) {
                    global.MarkerEventBus.emit('highlight:removed', { id: highlightId });
                }
                
                console.log('✅ Highlight removed successfully:', highlightId);
                return true;
            },
            
            clearAllHighlights: clearAllHighlights,
            getHighlight: (id) => highlights.get(id) || ragHighlights.get(id),
            getAllHighlights: () => [...highlights.values(), ...ragHighlights.values()],
            getHighlightCount: () => highlights.size + ragHighlights.size,
            
            // Control marker activation
            setMarkersActive: (active) => { 
                markersActive = active;
                console.log(`📍 Text highlighting ${active ? 'enabled' : 'disabled'}`);
            },
            
            isMarkersActive: () => markersActive,

            // State management
            getPendingHighlight: () => pendingHighlight,
            getLastSelectedRange: () => lastSelectedRange,
            setHighlightMode: (mode) => { isHighlightMode = mode; },
            isHighlightMode: () => isHighlightMode,
            
            // Utilities
            getRandomColor: getRandomColor,
            
            // Statistics
            getStats: () => ({
                manualHighlights: highlights.size - ragHighlights.size,
                ragHighlights: ragHighlights.size,
                totalHighlights: highlights.size
            })
        };
    })();
    
    // Export to global scope
    global.TextHighlighter = TextHighlighter;
    
    console.log('📝 TextHighlighter module loaded');
    
})(typeof window !== 'undefined' ? window : this);
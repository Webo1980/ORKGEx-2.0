// ================================
// src/content/modules/RAGHighlightCoordinator.js
// ================================

(function(global) {
    'use strict';
    
    /**
     * RAGHighlightCoordinator
     * 
     * Coordinates the highlighting of text and placement of markers
     * based on RAG (Retrieval-Augmented Generation) results from the LLM.
     */
    const RAGHighlightCoordinator = (function() {
        // Private members
        let textHighlighter = null;
        let textMarker = null;
        let imageMarker = null;
        let processingQueue = [];
        let isProcessing = false;
        let highlightedItems = new Map();
        let appliedHighlights = new Set();
        let initialized = false;
        
        // Configuration
        const CONFIG = {
            BATCH_SIZE: 5,         // Number of highlights to process in each batch
            BATCH_DELAY: 100,      // Delay between batches (ms)
            TEXT_ICON: 'fa-file-alt',
            MAX_SENTENCE_LENGTH: 500,
            HIGHLIGHT_DEBOUNCE: 50,
            DEFAULT_COLORS: [
                '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
                '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3',
                '#87CEEB', '#FFA07A', '#FFEFD5', '#F0FFF0'
            ]
        };
        
        /**
         * Initialize the coordinator with required dependencies
         */
        function init (highlighterInstance, textMarkerInstance, imageMarkerInstance) {
            if (initialized) {
                console.log('RAGHighlightCoordinator already initialized');
                return true;
            }
            
            console.log('🚀 Initializing RAGHighlightCoordinator...');
            
            // Set all dependencies with fallbacks
            textHighlighter = highlighterInstance || 
                            (typeof TextHighlighter !== 'undefined' ? TextHighlighter : null);
            
            textMarker = textMarkerInstance || 
                        (typeof TextMarker !== 'undefined' ? 
                        (typeof TextMarker === 'function' ? new TextMarker() : TextMarker) : 
                        null);
            
            imageMarker = imageMarkerInstance || 
                        (typeof ImageMarker !== 'undefined' ? 
                        (typeof ImageMarker === 'function' ? new ImageMarker() : ImageMarker) : 
                        null);
            
            // Check required dependencies
            if (!textHighlighter) {
                console.warn('⚠️ RAGHighlightCoordinator: TextHighlighter not available');
            }
            
            if (!textMarker) {
                console.warn('⚠️ RAGHighlightCoordinator: TextMarker not available');
            }
            
            // Initialize TextHighlighter if needed
            if (textHighlighter && typeof textHighlighter.init === 'function' && 
                textMarker && !textHighlighter.isInitialized) {
                try {
                    textHighlighter.init(textMarker);
                } catch (error) {
                    console.warn('Error initializing TextHighlighter:', error);
                }
            }
            
            // Setup message listeners
            setupMessageListeners();
            
            initialized = true;
            console.log('✅ RAGHighlightCoordinator initialized');
            return true;
        }
        
        /**
         * Set up message listeners for background script communication
         */
        function setupMessageListeners() {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
                chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                    if (message.action === 'APPLY_RAG_HIGHLIGHTS') {
                        processRAGHighlights(message.highlights).then(result => {
                            sendResponse({ success: true, count: result.count });
                        }).catch(error => {
                            console.error('Error processing RAG highlights:', error);
                            sendResponse({ success: false, error: error.message });
                        });
                        return true; // Indicates async response
                    } else if (message.action === 'ACTIVATE_IMAGE_MARKERS') {
                        activateImageMarkers(message.config).then(result => {
                            sendResponse(result);
                        }).catch(error => {
                            sendResponse({ success: false, error: error.message });
                        });
                        return true; // Indicates async response
                    } else if (message.action === 'SYNC_HIGHLIGHTS_STATE') {
                        syncHighlightsState(message.state).then(result => {
                            sendResponse(result);
                        }).catch(error => {
                            sendResponse({ success: false, error: error.message });
                        });
                        return true; // Indicates async response
                    } else if (message.action === 'CLEAR_ALL_HIGHLIGHTS') {
                        clearAllHighlights();
                        sendResponse({ success: true });
                        return false;
                    }
                });
            }
        }
        
        /**
         * Process RAG highlights received from the background script
         */
        async function processRAGHighlights(highlights) {
            if (!initialized) {
                const initResult = init();
                if (!initResult) {
                    return { success: false, count: 0, error: 'Could not initialize coordinator' };
                }
            }
            
            if (!highlights || !Array.isArray(highlights)) {
                return { success: false, count: 0, error: 'Invalid highlights data' };
            }
            
            console.log(`🔍 Processing ${highlights.length} RAG highlights`);
            
            // Show overlay during processing
            showOverlay();
            
            // Add to processing queue
            processingQueue = processingQueue.concat(highlights);
            
            // Start processing if not already in progress
            if (!isProcessing) {
                isProcessing = true;
                await processHighlightQueue();
            }
            
            return { 
                success: true, 
                count: highlights.length, 
                message: `Queued ${highlights.length} highlights for processing` 
            };
        }
        
        /**
         * Process the highlight queue in batches
         */
        async function processHighlightQueue() {
            const totalQueued = processingQueue.length;
            let processed = 0;
            let successful = 0;
            
            try {
                while (processingQueue.length > 0) {
                    // Get next batch
                    const batch = processingQueue.splice(0, CONFIG.BATCH_SIZE);
                    
                    // Update overlay progress
                    updateOverlay(
                        Math.round((processed / totalQueued) * 100), 
                        'highlighting', 
                        `Processing batch of highlights (${processed}/${totalQueued})`
                    );
                    
                    // Process batch
                    const results = await Promise.all(batch.map(async highlight => {
                        try {
                            const result = await processHighlight(highlight);
                            if (result.success) successful++;
                            return result;
                        } catch (error) {
                            console.error('Error processing highlight:', error, highlight);
                            return { success: false, error: error.message, highlight };
                        }
                    }));
                    
                    processed += batch.length;
                    
                    // Report progress
                    const progress = Math.round((processed / totalQueued) * 100);
                    console.log(`📊 Processed ${processed}/${totalQueued} highlights (${progress}%)`);
                    
                    // Pause between batches
                    if (processingQueue.length > 0) {
                        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
                    }
                }
                
                // Final update
                updateOverlay(100, 'complete', `✅ Completed: ${successful}/${totalQueued} highlights processed successfully`);
                
                console.log(`✅ Highlight processing complete: ${successful}/${totalQueued} successful`);
                
                // Notify extension that highlighting is complete
                sendHighlightingComplete({ 
                    total: totalQueued, 
                    successful, 
                    highlightIds: Array.from(appliedHighlights) 
                });
                
                // Very important - after processing is complete, hide the overlay
                setTimeout(() => {
                    hideOverlay();
                }, 1000);
                
                return { success: true, count: successful };
                
            } catch (error) {
                console.error('Error in highlight queue processing:', error);
                
                // Show error in overlay
                updateOverlay(100, 'error', `❌ Error: ${error.message}`);
                
                // Even if there's an error, make sure to hide the overlay
                setTimeout(() => {
                    hideOverlay();
                }, 2000);
                
                return { success: false, error: error.message };
            } finally {
                isProcessing = false;
            }
        }
        
        /**
         * Process a single highlight
         */
        async function processHighlight(highlight) {
            // Skip if already processed
            if (appliedHighlights.has(highlight.id)) {
                return { success: true, highlight, skipped: true };
            }
            
            try {
                // Find the DOM range for the text
                const range = findTextInDOM(highlight.sentence, highlight.section, highlight.sentenceIndex);
                if (!range) {
                    console.warn(`Text not found in DOM: "${highlight.sentence.substring(0, 50)}..."`);
                    return { 
                        success: false, 
                        error: 'Text not found in DOM', 
                        highlight 
                    };
                }
                
                // Create highlight data
                const highlightData = {
                    range,
                    text: highlight.sentence || "",  // Ensure text is not undefined
                    property: {
                        id: highlight.propertyId || "unknown_id",
                        label: highlight.propertyLabel || "Unknown Property",
                        color: highlight.color || getRandomColor()
                    },
                    confidence: highlight.confidence || 0.5,
                    section: highlight.section || "unknown",
                    sentenceIndex: highlight.sentenceIndex || 0
                };
                
                // Before applying, check if this exact text is already highlighted
                const existingHighlights = document.querySelectorAll('.orkg-highlight');
                let isDuplicate = false;
                
                existingHighlights.forEach(el => {
                    if (el.textContent === highlightData.text) {
                        console.log(`Skipping duplicate highlight: "${highlightData.text.substring(0, 30)}..."`);
                        isDuplicate = true;
                        
                        // Still mark as applied so we don't try again
                        appliedHighlights.add(highlight.id);
                    }
                });
                
                if (isDuplicate) {
                    return { success: true, highlight, skipped: true, reason: 'duplicate' };
                }
                
                // Apply highlight
                let highlightResult;
                if (textHighlighter && typeof textHighlighter.highlightFromRAG === 'function') {
                    highlightResult = textHighlighter.highlightFromRAG(highlightData);
                } else {
                    highlightResult = applyBasicHighlight(highlightData);
                }
                
                if (highlightResult) {
                    // Track applied highlight
                    highlightedItems.set(highlight.id, highlightResult);
                    appliedHighlights.add(highlight.id);
                    
                    // Add marker for the highlighted text
                    createMarkerForHighlight(highlightResult, highlightData);
                    
                    // Notify extension about highlight creation
                    notifyHighlightCreated(highlight, highlightResult);
                    
                    return { success: true, highlight, highlightId: highlightResult.id };
                } else {
                    return { 
                        success: false, 
                        error: 'Highlight creation failed', 
                        highlight 
                    };
                }
                
            } catch (error) {
                console.error('Error highlighting text:', error, highlight);
                return { success: false, error: error.message, highlight };
            }
        }
        
        /**
         * Create a marker for a highlighted text element
         */

        function createMarkerForHighlight(highlightResult, highlightData) {
            if (!textMarker) return null;
            
            try {
                // Validate inputs
                if (!highlightResult || !highlightData) {
                    console.warn('Invalid highlight result or data');
                    return null;
                }
                
                // Ensure text is available
                const highlightText = highlightResult.text || 
                                    highlightData.text || 
                                    (highlightResult.element ? highlightResult.element.textContent : "");
                
                if (!highlightText) {
                    console.warn('No text found for highlight marker');
                    return null;
                }
                
                // Find the highlighted element
                const highlightElement = document.querySelector(`[data-highlight-id="${highlightResult.id}"]`) || 
                                        highlightResult.element;
                
                if (!highlightElement) {
                    console.warn(`Could not find element for highlight ${highlightResult.id}`);
                    return null;
                }
                
                // Create marker data with fallbacks for all properties
                const markerData = {
                    element: highlightElement,
                    property: highlightData.property || {
                        id: "unknown",
                        label: "Unknown Property",
                        color: getRandomColor()
                    },
                    id: `marker_${highlightResult.id}`,
                    type: 'text',
                    color: highlightData.property?.color || getRandomColor(),
                    text: highlightText,
                    position: 'top-right',
                    tooltip: true
                };
                
                // Create and place the marker
                const marker = textMarker.createMarker(markerData);
                console.log(`✅ Created marker for highlight ${highlightResult.id}`);
                
                return marker;
            } catch (error) {
                console.warn('Error creating marker for highlight:', error);
                return null;
            }
        }
        
        /**
         * Find text in the DOM by searching through the document
         */
        function findTextInDOM(sentence, sectionName, sentenceIndex) {
            if (!sentence || typeof sentence !== 'string' || sentence.length < 10) {
                return null;
            }
            
            // Clean up the sentence for searching
            const cleanSentence = sentence.trim().replace(/\s+/g, ' ');
            
            // First try: direct text search
            try {
                const range = findExactTextInDOM(cleanSentence);
                if (range) return range;
            } catch (error) {
                console.warn('Direct text search failed:', error);
            }
            
            // Second try: find in specific section
            try {
                if (sectionName) {
                    const sectionRange = findTextInSection(cleanSentence, sectionName, sentenceIndex);
                    if (sectionRange) return sectionRange;
                }
            } catch (error) {
                console.warn('Section text search failed:', error);
            }
            
            // Third try: fuzzy search for partial matches
            try {
                return findTextWithFuzzyMatch(cleanSentence);
            } catch (error) {
                console.warn('Fuzzy text search failed:', error);
                return null;
            }
        }
        
        /**
         * Find exact text match in DOM
         */
        function findExactTextInDOM(text) {
            if (window.find && window.getSelection) {
                // Save current selection
                const savedSel = window.getSelection();
                const savedRange = savedSel.rangeCount > 0 ? savedSel.getRangeAt(0).cloneRange() : null;
                
                // Remove all selections
                window.getSelection().removeAllRanges();
                
                // Find the text
                const found = window.find(text, false, false, true, false, true, false);
                
                if (found) {
                    const range = window.getSelection().getRangeAt(0).cloneRange();
                    
                    // Restore original selection
                    window.getSelection().removeAllRanges();
                    if (savedRange) {
                        window.getSelection().addRange(savedRange);
                    }
                    
                    return range;
                } else {
                    // Restore original selection
                    window.getSelection().removeAllRanges();
                    if (savedRange) {
                        window.getSelection().addRange(savedRange);
                    }
                }
            }
            
            return null;
        }
        
        /**
         * Find text in a specific section by name
         */
        function findTextInSection(text, sectionName, sentenceIndex) {
            // Look for section headers or divs with matching section name
            const sectionSelectors = [
                `h1:contains("${sectionName}")`,
                `h2:contains("${sectionName}")`,
                `h3:contains("${sectionName}")`,
                `h4:contains("${sectionName}")`,
                `h5:contains("${sectionName}")`,
                `h6:contains("${sectionName}")`,
                `[class*="section"]:contains("${sectionName}")`,
                `[class*="title"]:contains("${sectionName}")`,
                `[id*="${sectionName.toLowerCase().replace(/\s+/g, '-')}"]`
            ];
            
            // Helper function to check if element contains text
            const containsText = (element, searchText) => {
                return element.textContent.toLowerCase().includes(searchText.toLowerCase());
            };
            
            // Find potential section elements
            const sectionElements = [];
            
            // Try to find section elements
            for (const selector of sectionSelectors) {
                try {
                    document.querySelectorAll(selector.replace(':contains', '')).forEach(el => {
                        if (containsText(el, sectionName)) {
                            sectionElements.push(el);
                        }
                    });
                } catch (e) {
                    // Invalid selector, skip
                }
            }
            
            // If we found section elements, search within and after them
            for (const sectionEl of sectionElements) {
                // Get the next section element
                let nextSection = getNextSection(sectionEl);
                
                // Get all text nodes between this section and the next
                const textNodes = getTextNodesBetween(sectionEl, nextSection);
                
                // Check each text node for the target text
                for (const textNode of textNodes) {
                    if (textNode.textContent.includes(text)) {
                        const range = document.createRange();
                        const startIndex = textNode.textContent.indexOf(text);
                        
                        range.setStart(textNode, startIndex);
                        range.setEnd(textNode, startIndex + text.length);
                        
                        return range;
                    }
                }
            }
            
            return null;
        }
        
        /**
         * Find text with fuzzy matching for partial matches
         */
        function findTextWithFuzzyMatch(text) {
            // For long sentences, try to match a substring
            if (text.length > 60) {
                // Try shorter segments from the sentence
                const segments = splitIntoSegments(text, 40, 20);
                
                for (const segment of segments) {
                    if (segment.length >= 15) {
                        const range = findExactTextInDOM(segment);
                        if (range) return range;
                    }
                }
            }
            
            // Try normalized text (removing extra spaces, quotes, etc.)
            const normalizedText = text
                .replace(/[\u2018\u2019]/g, "'")  // Smart quotes
                .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes
                .replace(/\s+/g, ' ')             // Multiple spaces
                .replace(/[^\w\s.,;?!]/g, '')     // Remove special chars
                .trim();
            
            if (normalizedText !== text) {
                const range = findExactTextInDOM(normalizedText);
                if (range) return range;
            }
            
            // Last resort: try to find the first 40 chars as a fallback
            if (text.length > 40) {
                const firstSegment = text.substring(0, 40).trim();
                return findExactTextInDOM(firstSegment);
            }
            
            return null;
        }
        
        /**
         * Split text into overlapping segments for better fuzzy matching
         */
        function splitIntoSegments(text, segmentLength, overlap) {
            const segments = [];
            let start = 0;
            
            while (start < text.length) {
                const end = Math.min(start + segmentLength, text.length);
                segments.push(text.substring(start, end));
                start += segmentLength - overlap;
            }
            
            return segments;
        }
        
        /**
         * Get the next section element after the current one
         */
        function getNextSection(sectionEl) {
            const sectionTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION'];
            let nextEl = sectionEl.nextElementSibling;
            
            while (nextEl) {
                if (sectionTags.includes(nextEl.tagName)) {
                    return nextEl;
                }
                nextEl = nextEl.nextElementSibling;
            }
            
            return null;
        }
        
        /**
         * Get all text nodes between two elements
         */
        function getTextNodesBetween(startEl, endEl) {
            const textNodes = [];
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                { acceptNode: node => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT },
                false
            );
            
            let currentNode;
            let inRange = false;
            
            while (currentNode = walker.nextNode()) {
                // If we haven't started yet, check if we've reached the start element
                if (!inRange) {
                    if (startEl.contains(currentNode) || isAfterNode(currentNode, startEl)) {
                        inRange = true;
                    } else {
                        continue;
                    }
                }
                
                // If we're in range but hit the end element, stop
                if (inRange && endEl && (endEl.contains(currentNode) || isSameNode(currentNode, endEl))) {
                    break;
                }
                
                textNodes.push(currentNode);
            }
            
            return textNodes;
        }
        
        /**
         * Check if nodeA is after nodeB in document order
         */
        function isAfterNode(nodeA, nodeB) {
            return (nodeB.compareDocumentPosition(nodeA) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        }
        
        /**
         * Check if two nodes are the same
         */
        function isSameNode(nodeA, nodeB) {
            return nodeA === nodeB;
        }
        
        /**
         * Apply a basic highlight when TextHighlighter is not available
         */
        function applyBasicHighlight(highlightData) {
            try {
                const { range, text, property } = highlightData;
                
                // Create highlight element
                const highlightElement = document.createElement('span');
                highlightElement.className = 'orkg-highlight';
                highlightElement.style.backgroundColor = property.color || getRandomColor();
                highlightElement.style.color = getContrastColor(property.color);
                highlightElement.title = `Property: ${property.label}`;
                highlightElement.dataset.propertyId = property.id;
                highlightElement.dataset.propertyLabel = property.label;
                
                // Generate a unique ID
                const highlightId = 'hl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                highlightElement.dataset.highlightId = highlightId;
                
                // Surround the range with the highlight element
                try {
                    range.surroundContents(highlightElement);
                } catch (e) {
                    console.warn('Could not surround range directly, extracting contents');
                    
                    // Alternative approach
                    highlightElement.appendChild(range.extractContents());
                    range.insertNode(highlightElement);
                }
                
                return {
                    id: highlightId,
                    element: highlightElement,
                    text: text,
                    property: property
                };
                
            } catch (error) {
                console.error('Error applying basic highlight:', error);
                return null;
            }
        }
        
        /**
         * Get contrast color for background
         */
        function getContrastColor(backgroundColor) {
            if (!backgroundColor) return '#000000';
            
            // Handle various color formats
            let r, g, b;
            
            if (backgroundColor.startsWith('#')) {
                // Hex color
                const hex = backgroundColor.replace('#', '');
                r = parseInt(hex.substr(0, 2), 16);
                g = parseInt(hex.substr(2, 2), 16);
                b = parseInt(hex.substr(4, 2), 16);
            } else if (backgroundColor.startsWith('rgb')) {
                // RGB color
                const matches = backgroundColor.match(/\d+/g);
                if (matches && matches.length >= 3) {
                    r = parseInt(matches[0]);
                    g = parseInt(matches[1]);
                    b = parseInt(matches[2]);
                } else {
                    return '#000000';
                }
            } else {
                return '#000000';
            }
            
            // Calculate luminance
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            
            return luminance > 0.5 ? '#000000' : '#ffffff';
        }
        
        /**
         * Get a random color for highlights
         */
        function getRandomColor() {
            return CONFIG.DEFAULT_COLORS[Math.floor(Math.random() * CONFIG.DEFAULT_COLORS.length)];
        }
        
        /**
         * Activate image markers on the page
         */
        async function activateImageMarkers(config = {}) {
            if (!imageMarker) {
                console.warn('⚠️ ImageMarker not available');
                return { success: false, error: 'ImageMarker not available' };
            }
            
            try {
                console.log('🖼️ Activating image markers');
                
                // Set default configuration if not provided
                const markerConfig = {
                    minScore: 0.3,
                    markerType: 'image',
                    showLabels: true,
                    ...config
                };
                
                // Activate the image marker
                const result = imageMarker.activate(markerConfig);
                
                console.log(`✅ Image markers activated: ${result.count} markers created`);
                return { 
                    success: true, 
                    count: result.count,
                    message: `Created ${result.count} image markers`
                };
                
            } catch (error) {
                console.error('❌ Error activating image markers:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Sync highlights state with extension
         */
        async function syncHighlightsState(state) {
            try {
                console.log('🔄 Syncing highlights state with extension');
                
                if (state.textHighlights && textHighlighter) {
                    // Handle text highlights
                    syncTextHighlights(state.textHighlights);
                }
                
                if (state.imageMarkers && imageMarker) {
                    // Handle image markers
                    syncImageMarkers(state.imageMarkers);
                }
                
                return { success: true, message: 'State synced successfully' };
                
            } catch (error) {
                console.error('❌ Error syncing highlights state:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Sync text highlights with extension state
         */
        function syncTextHighlights(highlights) {
            if (!Array.isArray(highlights)) return;
            
            // Create a set of highlight IDs from the state
            const stateHighlightIds = new Set(highlights.map(h => h.id));
            
            // Get all current highlights
            const currentHighlights = textHighlighter ? 
                textHighlighter.getAllHighlights() : 
                Array.from(document.querySelectorAll('.orkg-highlight'));
            
            // Remove highlights that aren't in the state
            for (const highlight of currentHighlights) {
                const highlightId = highlight.id || highlight.dataset?.highlightId;
                
                if (highlightId && !stateHighlightIds.has(highlightId)) {
                    if (textHighlighter && textHighlighter.removeHighlight) {
                        textHighlighter.removeHighlight(highlightId);
                    } else if (highlight.parentNode) {
                        // Basic removal
                        const parent = highlight.parentNode;
                        const textNode = document.createTextNode(highlight.textContent);
                        parent.replaceChild(textNode, highlight);
                        parent.normalize();
                    }
                }
            }
            
            // Add new highlights from the state
            for (const stateHighlight of highlights) {
                if (!appliedHighlights.has(stateHighlight.id)) {
                    processingQueue.push(stateHighlight);
                }
            }
            
            // Start processing if not already in progress
            if (processingQueue.length > 0 && !isProcessing) {
                isProcessing = true;
                processHighlightQueue().catch(error => {
                    console.error('Error processing highlight queue:', error);
                    isProcessing = false;
                });
            }
        }
        
        /**
         * Sync image markers with extension state
         */
        function syncImageMarkers(markers) {
            if (!Array.isArray(markers) || !imageMarker) return;
            
            // Sync with image marker
            imageMarker.syncWithAnalyzer(markers);
        }
        
        /**
         * Send message to extension that highlighting is complete
         */
        function sendHighlightingComplete(data) {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'RAG_HIGHLIGHTING_COMPLETE',
                    data
                }).catch(error => {
                    console.warn('Could not send highlighting complete message:', error);
                });
            }
        }
        
        /**
         * Notify extension about highlight creation
         */
        function notifyHighlightCreated(highlight, result) {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({
                    action: 'RAG_HIGHLIGHT_CREATED',
                    highlight: highlight,
                    result: {
                        id: result.id,
                        text: result.text,
                        property: result.property
                    }
                }).catch(error => {
                    // Ignore errors, might be due to extension not listening for this
                    console.debug('Could not send highlight created message:', error);
                });
            }
        }
        
        /**
         * Clear all highlights
         */
        function clearAllHighlights() {
            // Use TextHighlighter if available
            if (textHighlighter && textHighlighter.clearAllHighlights) {
                textHighlighter.clearAllHighlights();
            } else {
                // Fallback: remove all highlight elements
                document.querySelectorAll('.orkg-highlight').forEach(el => {
                    if (el.parentNode) {
                        const parent = el.parentNode;
                        const textNode = document.createTextNode(el.textContent);
                        parent.replaceChild(textNode, el);
                        parent.normalize();
                    }
                });
            }
            
            highlightedItems.clear();
            appliedHighlights.clear();
            
            console.log('🧹 All highlights cleared');
            return true;
        }
        
        /**
         * Show overlay - ensures overlay is only shown when needed
         */
        function showOverlay() {
            try {
                // Check if we should show the overlay
                if (window.contentScript && typeof window.contentScript.shouldActivateMarkers === 'function') {
                    const shouldActivate = window.contentScript.shouldActivateMarkers();
                    // Only show overlay if markers should be active
                    if (!shouldActivate && !window.contentScript.markersActivated) {
                        console.log('⚠️ Not showing overlay - will be shown when RAG analysis is actually running');
                        return null;
                    }
                }
                
                if (typeof OverlayManager !== 'undefined') {
                    const overlayManager = new OverlayManager();
                    overlayManager.show();
                    return overlayManager;
                } else if (window.__orkgOverlayManager) {
                    window.__orkgOverlayManager.show();
                    return window.__orkgOverlayManager;
                } else if (window.contentScript && window.contentScript.modules.overlayManager) {
                    window.contentScript.modules.overlayManager.show();
                    return window.contentScript.modules.overlayManager;
                }
                
                // Create a new one if none available
                if (typeof OverlayManager !== 'undefined') {
                    const newOverlay = new OverlayManager();
                    window.__orkgOverlayManager = newOverlay;
                    newOverlay.show();
                    return newOverlay;
                }
            } catch (error) {
                console.warn('Could not show overlay:', error);
            }
            return null;
        }
        
        /**
         * Hide overlay after highlighting is complete
         */
        function hideOverlay() {
            try {
                // Try multiple ways to hide the overlay to ensure it's hidden
                if (typeof OverlayManager !== 'undefined') {
                    const overlayManager = new OverlayManager();
                    overlayManager.hide();
                }
                
                if (window.__orkgOverlayManager) {
                    window.__orkgOverlayManager.hide();
                }
                
                if (window.contentScript && window.contentScript.modules.overlayManager) {
                    window.contentScript.modules.overlayManager.hide();
                }
                
                // Last resort: try to find and hide overlay directly
                const overlay = document.getElementById('rag-loading-overlay');
                if (overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        if (overlay.parentNode) {
                            overlay.parentNode.removeChild(overlay);
                        }
                    }, 300);
                    
                    // Restore body overflow
                    document.body.style.overflow = '';
                }
            } catch (error) {
                console.warn('Could not hide overlay:', error);
                
                // Final attempt: try direct DOM manipulation
                try {
                    const overlay = document.getElementById('rag-loading-overlay');
                    if (overlay && overlay.parentNode) {
                        overlay.parentNode.removeChild(overlay);
                    }
                    
                    // Also restore body overflow
                    document.body.style.overflow = '';
                } catch (e) {
                    // Give up
                }
            }
        }
        
        /**
         * Update overlay progress
         */
        function updateOverlay(progress, phase, message) {
            try {
                if (window.__orkgOverlayManager) {
                    if (typeof window.__orkgOverlayManager.updateProgress === 'function') {
                        window.__orkgOverlayManager.updateProgress(progress, phase, message);
                    } else if (typeof window.__orkgOverlayManager.updateOverlayProgress === 'function') {
                        window.__orkgOverlayManager.updateOverlayProgress(progress, message, phase);
                    }
                    return;
                }
                
                if (window.contentScript && window.contentScript.modules.overlayManager) {
                    const overlayManager = window.contentScript.modules.overlayManager;
                    if (typeof overlayManager.updateProgress === 'function') {
                        overlayManager.updateProgress(progress, phase, message);
                    } else if (typeof overlayManager.updateOverlayProgress === 'function') {
                        overlayManager.updateOverlayProgress(progress, message, phase);
                    }
                    return;
                }
                
                if (typeof OverlayManager !== 'undefined') {
                    const overlayManager = new OverlayManager();
                    if (typeof overlayManager.updateProgress === 'function') {
                        overlayManager.updateProgress(progress, phase, message);
                    } else if (typeof overlayManager.updateOverlayProgress === 'function') {
                        overlayManager.updateOverlayProgress(progress, message, phase);
                    }
                }
            } catch (error) {
                console.warn('Could not update overlay:', error);
            }
        }
        
        /**
         * Get all highlighted items
         */
        function getAllHighlightedItems() {
            return Array.from(highlightedItems.values());
        }
        
        /**
         * Check if coordinator is initialized
         */
        function isInitialized() {
            return initialized;
        }
        
        // Public API
        return {
            init,
            processRAGHighlights,
            activateImageMarkers,
            syncHighlightsState,
            clearAllHighlights,
            getAllHighlightedItems,
            isInitialized,
            hideOverlay // Make hideOverlay public so it can be called from outside
        };
    })();
    
    // Export to global scope
    global.RAGHighlightCoordinator = RAGHighlightCoordinator;
    
})(typeof window !== 'undefined' ? window : this);
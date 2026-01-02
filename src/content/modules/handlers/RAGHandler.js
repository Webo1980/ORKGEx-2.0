// ================================
// src/content/modules/handlers/RAGHandler.js - Consolidated Version
// ================================

(function(global) {
    'use strict';
    
    /**
     * RAGHandler Service
     * 
     * Consolidated handler for all RAG (Retrieval-Augmented Generation) operations.
     * Manages overlay, highlighting coordination, and analysis state.
     * Follows SOLID principles with clear separation of concerns.
     */
    class RAGHandler {
        constructor() {
            this.isInitialized = false;
            
            // Dependencies
            this.dependencies = {
                overlayManager: null,
                textHighlighter: null,
                textSearchUtility: null,
                textMarker: null,
                imageMarker: null,
                ragLogger: null
            };
            
            // State management
            this.state = {
                ragAnalysisRunning: false,
                currentPhase: null,
                progress: 0,
                logs: [],
                appliedHighlights: new Set(),
                highlightQueue: [],
                isProcessing: false,
                processingStats: {
                    total: 0,
                    processed: 0,
                    successful: 0,
                    failed: 0
                }
            };
            
            // Configuration
            this.config = {
                batchSize: 5,
                batchDelay: 100,
                maxRetries: 3,
                showOverlay: true,
                autoHideOverlay: true,
                overlayHideDelay: 1000
            };
            
            console.log('🤖 RAGHandler instance created');
        }
        
        // ================================
        // Initialization
        // ================================
        
        /**
         * Initialize the RAG handler
         */
        async init() {
            if (this.isInitialized) {
                console.warn('RAGHandler already initialized');
                return true;
            }
            
            console.log('🤖 Initializing RAGHandler...');
            
            try {
                this.setupDependencies();
                this.registerMessageHandlers();
                this.setupEventListeners();
                
                this.isInitialized = true;
                console.log('✅ RAGHandler initialized');
                return true;
            } catch (error) {
                console.error('❌ Failed to initialize RAGHandler:', error);
                this.isInitialized = false;
                return false;
            }
        }
        
        /**
         * Setup dependencies from global scope or service registry
         * @private
         */
        setupDependencies() {
            const registry = global.serviceRegistry;
            
            // Get or create OverlayManager
            this.dependencies.overlayManager = 
                registry?.get('overlayManager') ||
                (typeof OverlayManager !== 'undefined' ? new OverlayManager() : null);
            
            // Get TextHighlighter
            this.dependencies.textHighlighter = 
                global.TextHighlighter ||
                registry?.get('textHighlighter');
            
            // Get or create TextSearchUtility
            this.dependencies.textSearchUtility = 
                global.textSearchUtility ||
                (typeof TextSearchUtility !== 'undefined' ? new TextSearchUtility() : null) ||
                registry?.get('textSearchUtility');
            
            // Get markers
            this.dependencies.textMarker = 
                registry?.get('textMarker') ||
                (typeof TextMarker !== 'undefined' ? new TextMarker() : null);
            
            this.dependencies.imageMarker = 
                registry?.get('imageMarker') ||
                (typeof ImageMarker !== 'undefined' ? new ImageMarker() : null);
            
            // Get logger
            this.dependencies.ragLogger = 
                registry?.get('ragLogger') ||
                (typeof RAGAnalysisLogger !== 'undefined' ? new RAGAnalysisLogger() : null);
            
            console.log('🤖 Dependencies setup:', {
                overlayManager: !!this.dependencies.overlayManager,
                textHighlighter: !!this.dependencies.textHighlighter,
                textSearchUtility: !!this.dependencies.textSearchUtility,
                textMarker: !!this.dependencies.textMarker,
                imageMarker: !!this.dependencies.imageMarker,
                ragLogger: !!this.dependencies.ragLogger
            });
        }
        
        /**
         * Register message handlers
         * @private
         */
        registerMessageHandlers() {
            // Try to register with MessageHandler if available
            const messageHandler = global.serviceRegistry?.get('messageHandler');
            if (messageHandler) {
                messageHandler.registerHandler('SHOW_RAG_OVERLAY', (msg) => this.handleShowOverlay(msg));
                messageHandler.registerHandler('HIDE_RAG_OVERLAY', (msg) => this.handleHideOverlay(msg));
                messageHandler.registerHandler('UPDATE_RAG_OVERLAY', (msg) => this.handleUpdateOverlay(msg));
                messageHandler.registerHandler('APPLY_RAG_HIGHLIGHTS', (msg) => this.handleApplyHighlights(msg));
                messageHandler.registerHandler('CLEAR_RAG_HIGHLIGHTS', (msg) => this.handleClearHighlights(msg));
                messageHandler.registerHandler('ADD_RAG_LOG', (msg) => this.handleAddLog(msg));
                messageHandler.registerHandler('GET_RAG_STATUS', () => this.handleGetStatus());
            }
            
            // Also setup direct Chrome runtime listeners
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
                chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                    if (message.action === 'APPLY_RAG_HIGHLIGHTS') {
                        this.handleApplyHighlights(message).then(sendResponse);
                        return true; // Async response
                    }
                    // Add other message handlers as needed
                });
            }
            
            console.log('🤖 Message handlers registered');
        }
        
        /**
         * Setup event listeners
         * @private
         */
        setupEventListeners() {
            // Listen for highlight events from TextHighlighter if available
            if (this.dependencies.textHighlighter) {
                // Custom events could be added here
            }
        }
        
        // ================================
        // Message Handlers
        // ================================
        
        /**
         * Handle show RAG overlay
         */
        async handleShowOverlay(message) {
            try {
                console.log('🤖 Showing RAG overlay');
                
                this.state.ragAnalysisRunning = true;
                this.state.currentPhase = message.phase || 'initializing';
                this.state.progress = 0;
                
                if (this.config.showOverlay && this.dependencies.overlayManager) {
                    this.dependencies.overlayManager.show();
                    
                    if (message.title) {
                        this.dependencies.overlayManager.setTitle?.(message.title);
                    }
                    
                    if (message.message) {
                        this.dependencies.overlayManager.updateMessage?.(message.message);
                    }
                }
                
                if (this.dependencies.ragLogger && message.showLogs) {
                    this.dependencies.ragLogger.show?.();
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error showing RAG overlay:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle hide RAG overlay
         */
        async handleHideOverlay(message) {
            try {
                console.log('🤖 Hiding RAG overlay');
                
                this.state.ragAnalysisRunning = false;
                this.state.currentPhase = null;
                
                if (this.dependencies.overlayManager) {
                    this.dependencies.overlayManager.hide();
                }
                
                if (this.dependencies.ragLogger && message.hideLogs) {
                    this.dependencies.ragLogger.hide?.();
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error hiding RAG overlay:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle update RAG overlay
         */
        async handleUpdateOverlay(message) {
            try {
                if (message.phase) {
                    this.state.currentPhase = message.phase;
                }
                
                if (typeof message.progress === 'number') {
                    this.state.progress = message.progress;
                }
                
                if (this.dependencies.overlayManager) {
                    if (typeof message.progress === 'number') {
                        this.dependencies.overlayManager.updateProgress?.(
                            message.progress, 
                            message.phase, 
                            message.message
                        );
                    } else if (message.message) {
                        this.dependencies.overlayManager.updateMessage?.(message.message);
                    }
                }
                
                if (message.log && this.dependencies.ragLogger) {
                    this.dependencies.ragLogger.addLog?.(message.log, message.logType || 'info');
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error updating RAG overlay:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle apply RAG highlights - Main entry point for highlighting
         */
        async handleApplyHighlights(message) {
            try {
                console.log('🤖 Applying RAG highlights');
                
                const highlights = message.highlights || [];
                
                if (!highlights.length) {
                    return { success: false, error: 'No highlights provided' };
                }
                
                // Reset processing stats
                this.state.processingStats = {
                    total: highlights.length,
                    processed: 0,
                    successful: 0,
                    failed: 0
                };
                
                // Show overlay if configured
                if (this.config.showOverlay) {
                    await this.showOverlay({ 
                        title: 'Applying RAG Highlights',
                        message: `Processing ${highlights.length} highlights...`
                    });
                }
                
                // Process highlights in batches
                const results = await this.processHighlightBatches(highlights);
                
                // Auto-hide overlay if configured
                if (this.config.autoHideOverlay) {
                    setTimeout(() => {
                        this.hideOverlay();
                    }, this.config.overlayHideDelay);
                }
                
                return { 
                    success: true, 
                    results,
                    stats: this.state.processingStats
                };
                
            } catch (error) {
                console.error('❌ Error applying RAG highlights:', error);
                this.hideOverlay();
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle clear RAG highlights
         */
        async handleClearHighlights(message) {
            try {
                console.log('🤖 Clearing RAG highlights');
                
                // Clear highlights via TextHighlighter
                if (this.dependencies.textHighlighter) {
                    this.dependencies.textHighlighter.clearAllHighlights?.();
                }
                
                // Clear internal state
                this.state.appliedHighlights.clear();
                this.state.highlightQueue = [];
                
                // Clear logs if requested
                if (message.clearLogs && this.dependencies.ragLogger) {
                    this.dependencies.ragLogger.clear?.();
                }
                
                this.state.logs = [];
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error clearing RAG highlights:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle add RAG log
         */
        handleAddLog(message) {
            try {
                const log = {
                    message: message.message || '',
                    type: message.type || 'info',
                    timestamp: Date.now()
                };
                
                this.state.logs.push(log);
                
                // Keep only last 100 logs
                if (this.state.logs.length > 100) {
                    this.state.logs = this.state.logs.slice(-100);
                }
                
                if (this.dependencies.ragLogger) {
                    this.dependencies.ragLogger.addLog?.(log.message, log.type);
                }
                
                return { success: true };
                
            } catch (error) {
                console.error('❌ Error adding RAG log:', error);
                return { success: false, error: error.message };
            }
        }
        
        /**
         * Handle get RAG status
         */
        handleGetStatus() {
            return {
                isInitialized: this.isInitialized,
                ragAnalysisRunning: this.state.ragAnalysisRunning,
                currentPhase: this.state.currentPhase,
                progress: this.state.progress,
                logCount: this.state.logs.length,
                appliedHighlights: this.state.appliedHighlights.size,
                processingStats: this.state.processingStats,
                dependencies: {
                    hasOverlayManager: !!this.dependencies.overlayManager,
                    hasTextHighlighter: !!this.dependencies.textHighlighter,
                    hasTextSearchUtility: !!this.dependencies.textSearchUtility,
                    hasTextMarker: !!this.dependencies.textMarker,
                    hasLogger: !!this.dependencies.ragLogger
                }
            };
        }
        
        // ================================
        // Highlight Processing
        // ================================
        
        /**
         * Process highlights in batches for better performance
         * @private
         */
        async processHighlightBatches(highlights) {
            const results = [];
            this.state.isProcessing = true;
            
            try {
                for (let i = 0; i < highlights.length; i += this.config.batchSize) {
                    const batch = highlights.slice(i, i + this.config.batchSize);
                    
                    // Update progress
                    const progress = Math.round((i / highlights.length) * 100);
                    await this.updateProgress(
                        progress,
                        'highlighting',
                        `Processing batch ${Math.floor(i / this.config.batchSize) + 1}...`
                    );
                    
                    // Process batch in parallel
                    const batchResults = await Promise.all(
                        batch.map(highlight => this.applySingleHighlight(highlight))
                    );
                    
                    results.push(...batchResults);
                    this.state.processingStats.processed += batch.length;
                    
                    // Update successful/failed counts
                    batchResults.forEach(result => {
                        if (result.success) {
                            this.state.processingStats.successful++;
                        } else {
                            this.state.processingStats.failed++;
                        }
                    });
                    
                    // Add delay between batches to prevent UI blocking
                    if (i + this.config.batchSize < highlights.length) {
                        await this.delay(this.config.batchDelay);
                    }
                }
                
                // Final update
                await this.updateProgress(
                    100,
                    'complete',
                    `Completed: ${this.state.processingStats.successful}/${highlights.length} highlights applied`
                );
                
                console.log('✅ Highlight processing complete:', this.state.processingStats);
                
            } finally {
                this.state.isProcessing = false;
            }
            
            return results;
        }
        
        /**
         * Apply a single highlight
         * @private
         */
        async applySingleHighlight(highlight) {
            try {
                // Skip if already applied
                if (this.state.appliedHighlights.has(highlight.id)) {
                    return { 
                        success: true, 
                        highlightId: highlight.id,
                        skipped: true,
                        reason: 'Already applied'
                    };
                }
                
                // Validate highlight data
                if (!this.validateHighlight(highlight)) {
                    return {
                        success: false,
                        highlightId: highlight.id,
                        error: 'Invalid highlight data'
                    };
                }
                
                // Find text in DOM using TextSearchUtility
                const range = await this.findTextRange(highlight);
                
                if (!range) {
                    console.warn(`Text not found for highlight ${highlight.id}`);
                    return {
                        success: false,
                        highlightId: highlight.id,
                        error: 'Text not found in DOM'
                    };
                }
                
                // Apply highlight using TextHighlighter
                const result = await this.applyHighlightToRange(range, highlight);
                
                if (result) {
                    // Track as applied
                    this.state.appliedHighlights.add(highlight.id);
                    
                    // Create marker if configured
                    if (highlight.showMarker !== false) {
                        await this.createMarkerForHighlight(result.element, highlight);
                    }
                    
                    return {
                        success: true,
                        highlightId: highlight.id,
                        resultId: result.id
                    };
                }
                
                return {
                    success: false,
                    highlightId: highlight.id,
                    error: 'Failed to create highlight'
                };
                
            } catch (error) {
                console.error(`Error applying highlight ${highlight.id}:`, error);
                return {
                    success: false,
                    highlightId: highlight.id,
                    error: error.message
                };
            }
        }
        
        /**
         * Find text range in DOM
         * @private
         */
        async findTextRange(highlight) {
            if (!this.dependencies.textSearchUtility) {
                console.warn('TextSearchUtility not available, using fallback');
                return this.fallbackFindText(highlight.sentence || highlight.text);
            }
            
            return this.dependencies.textSearchUtility.findText(
                highlight.sentence || highlight.text,
                {
                    section: highlight.section,
                    sentenceIndex: highlight.sentenceIndex,
                    caseSensitive: false,
                    normalizeWhitespace: true
                }
            );
        }
        
        /**
         * Fallback text search when TextSearchUtility is not available
         * @private
         */
        fallbackFindText(text) {
            if (!text || !window.find) return null;
            
            const selection = window.getSelection();
            const savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
            
            selection.removeAllRanges();
            
            try {
                if (window.find(text, false, false, true, false, true, false)) {
                    return selection.getRangeAt(0).cloneRange();
                }
            } finally {
                selection.removeAllRanges();
                if (savedRange) {
                    selection.addRange(savedRange);
                }
            }
            
            return null;
        }
        
        /**
         * Apply highlight to a DOM range
         * @private
         */
        async applyHighlightToRange(range, highlight) {
            if (!this.dependencies.textHighlighter) {
                console.warn('TextHighlighter not available, using basic highlighting');
                return this.applyBasicHighlight(range, highlight);
            }
            
            // Prepare highlight data for TextHighlighter
            const highlightData = {
                range,
                text: highlight.sentence || highlight.text || range.toString(),
                property: {
                    id: highlight.propertyId || highlight.property?.id || 'unknown',
                    label: highlight.propertyLabel || highlight.property?.label || 'Unknown Property',
                    color: highlight.color || this.getRandomColor()
                },
                confidence: highlight.confidence || 0.5,
                section: highlight.section,
                sentenceIndex: highlight.sentenceIndex
            };
            
            // Use TextHighlighter's RAG highlighting method
            return this.dependencies.textHighlighter.highlightFromRAG(highlightData);
        }
        
        /**
         * Apply basic highlight when TextHighlighter is not available
         * @private
         */
        applyBasicHighlight(range, highlight) {
            try {
                const span = document.createElement('span');
                span.className = 'orkg-rag-highlight';
                span.style.backgroundColor = highlight.color || this.getRandomColor();
                span.dataset.highlightId = highlight.id;
                span.dataset.propertyId = highlight.propertyId || '';
                span.dataset.propertyLabel = highlight.propertyLabel || '';
                
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
                
                return {
                    id: highlight.id,
                    element: span,
                    text: span.textContent
                };
                
            } catch (error) {
                console.error('Error applying basic highlight:', error);
                return null;
            }
        }
        
        /**
         * Create marker for highlighted element
         * @private
         */
        async createMarkerForHighlight(element, highlight) {
            if (!this.dependencies.textMarker || !element) return;
            
            try {
                const markerData = {
                    element,
                    id: `marker_${highlight.id}`,
                    property: highlight.property || {
                        id: highlight.propertyId,
                        label: highlight.propertyLabel
                    },
                    confidence: highlight.confidence,
                    color: highlight.color
                };
                
                return this.dependencies.textMarker.createMarker(markerData);
                
            } catch (error) {
                console.warn('Failed to create marker:', error);
                return null;
            }
        }
        
        // ================================
        // Utility Methods
        // ================================
        
        /**
         * Validate highlight data
         * @private
         */
        validateHighlight(highlight) {
            if (!highlight || typeof highlight !== 'object') {
                return false;
            }
            
            // Must have either sentence or text
            if (!highlight.sentence && !highlight.text) {
                console.warn('Highlight missing text content:', highlight);
                return false;
            }
            
            // Must have an ID
            if (!highlight.id) {
                highlight.id = `rag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            return true;
        }
        
        /**
         * Get random color for highlights
         * @private
         */
        getRandomColor() {
            const colors = [
                '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
                '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3'
            ];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        /**
         * Delay helper for batch processing
         * @private
         */
        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        // ================================
        // Public API Methods
        // ================================
        
        /**
         * Show RAG overlay programmatically
         */
        showOverlay(options = {}) {
            return this.handleShowOverlay(options);
        }
        
        /**
         * Hide RAG overlay programmatically
         */
        hideOverlay(options = {}) {
            return this.handleHideOverlay(options);
        }
        
        /**
         * Update overlay progress
         */
        updateProgress(progress, phase, message) {
            return this.handleUpdateOverlay({ progress, phase, message });
        }
        
        /**
         * Add a log entry
         */
        addLog(message, type = 'info') {
            return this.handleAddLog({ message, type });
        }
        
        /**
         * Apply highlights programmatically
         */
        applyHighlights(highlights) {
            return this.handleApplyHighlights({ highlights });
        }
        
        /**
         * Clear all highlights
         */
        clearHighlights(options = {}) {
            return this.handleClearHighlights(options);
        }
        
        /**
         * Get current state
         */
        getState() {
            return { ...this.state };
        }
        
        /**
         * Get status
         */
        getStatus() {
            return this.handleGetStatus();
        }
        
        /**
         * Check if analysis is running
         */
        isAnalysisRunning() {
            return this.state.ragAnalysisRunning;
        }
        
        /**
         * Check if processing highlights
         */
        isProcessing() {
            return this.state.isProcessing;
        }
        
        /**
         * Update configuration
         */
        updateConfig(config) {
            this.config = { ...this.config, ...config };
        }
        
        /**
         * Clean up the handler
         */
        cleanup() {
            console.log('🧹 Cleaning up RAGHandler...');
            
            // Hide overlay
            if (this.dependencies.overlayManager) {
                this.dependencies.overlayManager.hide();
            }
            
            // Clear highlights
            this.clearHighlights({ clearLogs: true });
            
            // Reset state
            this.state = {
                ragAnalysisRunning: false,
                currentPhase: null,
                progress: 0,
                logs: [],
                appliedHighlights: new Set(),
                highlightQueue: [],
                isProcessing: false,
                processingStats: {
                    total: 0,
                    processed: 0,
                    successful: 0,
                    failed: 0
                }
            };
            
            // Clear dependencies
            this.dependencies = {
                overlayManager: null,
                textHighlighter: null,
                textSearchUtility: null,
                textMarker: null,
                imageMarker: null,
                ragLogger: null
            };
            
            this.isInitialized = false;
            
            console.log('✅ RAGHandler cleanup completed');
        }
    }
    
    // Create singleton instance
    const ragHandler = new RAGHandler();
    
    // Register with service registry if available
    if (global.serviceRegistry) {
        global.serviceRegistry.register('ragHandler', ragHandler);
    }
    
    // Expose globally
    global.ragHandler = ragHandler;
    global.RAGHandler = RAGHandler;
    
    console.log('📢 RAGHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
// ================================
// src/content/modules/core/ContentScriptManager.js - Enhanced with RAG Marker Support
// ================================

(function(global) {
  'use strict';
  
  // Check if already exists
  if (global.contentScriptManager) {
    console.log('📋 ContentScriptManager already exists, skipping creation');
    return;
  }
  
  /**
   * Content Script Manager for ORKG Content Script
   * Enhanced with proper RAG highlight marker creation
   */
  class ContentScriptManager {
    constructor() {
      // Core state
      this.initialized = false;
      this._initPromise = null;
      
      // Feature state
      this.state = {
        inAnalysisStep: false,
        lastSelectionTime: 0,
        ragHighlights: new Map(),
        manualHighlights: new Map()
      };
      
      // Configuration
      this.config = {
        enableTextSelection: true,
        enableMarkers: true,
        enableRAG: true,
        enableExtraction: true,
        autoActivateMarkers: false,
        createMarkersForRAG: true
      };
      
      console.log('📋 ContentScriptManager instance created');
    }
    
    /**
     * Initialize the content script manager (singleton pattern)
     * @returns {Promise<ContentScriptManager>}
     */
    async init() {
      // Return existing promise if already initializing
      if (this._initPromise) {
        console.log('📋 ContentScriptManager initialization already in progress');
        return this._initPromise;
      }
      
      // Already initialized
      if (this.initialized) {
        console.log('📋 ContentScriptManager already initialized');
        return this;
      }
      
      // Create initialization promise
      this._initPromise = this._doInit();
      return this._initPromise;
    }
    
    /**
     * Actual initialization logic
     * @private
     */
    async _doInit() {
      console.log('🚀 Initializing ORKG Content Script Manager...');
      
      try {
        // Check for service registry
        if (!global.serviceRegistry) {
          throw new Error('ServiceRegistry not available');
        }
        
        // Register self with service registry
        global.serviceRegistry.register('contentScriptManager', this);
        
        // Step 1: Initialize core services
        await this.initializeCoreServices();
        
        // Step 2: Initialize handler services
        await this.initializeHandlerServices();
        
        // Step 3: Setup message routing
        this.setupMessageRouting();
        
        // Step 4: Conditionally enable features
        await this.enableFeatures();
        
        // Mark as initialized
        this.initialized = true;
        
        // Expose status globally
        global.orkgContentScript = {
          initialized: true,
          timestamp: new Date().toISOString(),
          manager: this
        };
        
        console.log('✅ ORKG Content Script Manager fully initialized');
        
        return this;
        
      } catch (error) {
        console.error('❌ Failed to initialize ORKG Content Script Manager:', error);
        this._initPromise = null; // Reset to allow retry
        throw error;
      }
    }
    
    /**
     * Initialize core services
     * @private
     */
    async initializeCoreServices() {
      const registry = global.serviceRegistry;
      if (!registry) {
        throw new Error('ServiceRegistry not available');
      }
      
      console.log('📊 Initializing core services...');
      
      // Required core services
      const requiredServices = ['messageHandler', 'selectionManager',];
      
      for (const service of requiredServices) {
        if (registry.has(service)) {
          try {
            await registry.initialize(service);
            console.log(`✅ ${service} initialized`);
          } catch (error) {
            console.error(`❌ Failed to initialize required service ${service}:`, error);
            throw error;
          }
        } else {
          console.error(`❌ Required service not found: ${service}`);
          throw new Error(`Required service not found: ${service}`);
        }
      }
      
      console.log('✅ Core services initialized');
    }
    
    /**
     * Initialize handler services that will handle specific message types
     * @private
     */
    async initializeHandlerServices() {
      const registry = global.serviceRegistry;
      if (!registry) return;
      
      console.log('📊 Initializing handler services...');
      
      // Handler services (optional but important)
      const handlerServices = [
        'ragHandler',        // Handles RAG-related messages
        'markerHandler',     // Handles marker-related messages
        'extractionHandler', // Handles extraction-related messages
        'propertyHandler'    // Handles property window messages
      ];
      
      for (const service of handlerServices) {
        if (registry.has(service)) {
          try {
            await registry.initialize(service);
            console.log(`✅ ${service} initialized`);
          } catch (error) {
            console.warn(`⚠️ Failed to initialize handler ${service}:`, error);
          }
        } else {
          console.log(`ℹ️ Handler service not found: ${service} (will be created when needed)`);
        }
      }
      
      console.log('✅ Handler services initialized');
    }
    
    /**
     * Setup message routing to appropriate handlers
     * @private
     */
    setupMessageRouting() {
      const messageHandler = global.serviceRegistry?.get('messageHandler');
      if (!messageHandler) {
        console.warn('⚠️ MessageHandler not available, skipping message routing');
        return;
      }
      
      // Core state messages (handled by this manager)
      messageHandler.registerHandler('PING', () => this.handlePing());
      messageHandler.registerHandler('CHECK_ANALYSIS_STEP', () => this.handleCheckAnalysisStep());
      messageHandler.registerHandler('SET_ANALYSIS_STEP', (message) => this.handleSetAnalysisStep(message));
      messageHandler.registerHandler('UPDATE_CONFIG', (message) => this.handleUpdateConfig(message));
      messageHandler.registerHandler('GET_STATUS', () => this.handleGetStatus());
      
      // NEW: RAG-specific marker creation handlers
      messageHandler.registerHandler('CREATE_TEXT_MARKERS_FOR_RAG_HIGHLIGHTS', (message) => {
        return this.handleCreateTextMarkersForRAGHighlights(message.highlights);
      });

     messageHandler.registerHandler('CREATE_IMAGE_MARKERS_FOR_RAG', (message) => {
        return this.handleCreateImageMarkersForRAG(message.images);
     });

     messageHandler.registerHandler('CREATE_TABLE_MARKERS_FOR_RAG', (message) => {
        return this.handleCreateTableMarkersForRAG(message.tables);
     });

    messageHandler.registerHandler('SHOW_RAG_RESULTS_WINDOW', (message) => {
          console.log('[ContentScriptManager] SHOW_RAG_RESULTS_WINDOW received');
          
          // Get the singleton instance
          const ragWindow = global.ragResultsWindow || 
                          (global.RAGResultsWindow && global.RAGResultsWindow.instance);
          
          if (!ragWindow) {
              console.error('[ContentScriptManager] RAG window not available');
              return { success: false, error: 'Window not available' };
          }
          
          // Handle the results
          if (message.results && Object.keys(message.results).length > 0) {
              ragWindow.handleRAGResults(message.results);
              console.log('ragWindow:', ragWindow,ragWindow.container);
              // orkg-rag-results-window
              // Show the window
              if (ragWindow.container) {
                  ragWindow.container.style.display = 'block';
              }
              
              console.log('[ContentScriptManager] RAG window shown with results');
              return { success: true, windowShown: true };
          } else {
              console.warn('[ContentScriptManager] No results to display');
              return { success: false, error: 'No results' };
          }
      });
      // Handle overlay update messages from background
      messageHandler.registerHandler('UPDATE_OVERLAY', function(message) {
        const overlayManager = global.serviceRegistry?.get('overlayManager') || global.overlayManager;
        
        if (!overlayManager) {
            console.log('OverlayManager not available for update');
            return { success: true }; // Don't fail, just log
        }
        
        // OverlayManager in your codebase uses updateProgress method
        if (typeof overlayManager.updateProgress === 'function') {
            overlayManager.updateProgress(message.progress || 0, message.message || '');
        } else if (typeof overlayManager.update === 'function') {
            overlayManager.update(message.message || '');
        } else {
            console.log('OverlayManager update method not found');
        }
        
        return { success: true };
      });
      
      console.log('✅ Message routing setup complete');
    }
    
    /**
     * Enable features based on configuration
     * @private
     */
    async enableFeatures() {
      const registry = global.serviceRegistry;
      
      // Enable text selection if configured
      if (this.config.enableTextSelection) {
        const selectionManager = registry?.get('selectionManager');
        if (selectionManager && typeof selectionManager.enable === 'function') {
          selectionManager.enable();
          console.log('✅ Text selection enabled');
        }
      }
      
      // Auto-activate markers if configured
      if (this.config.autoActivateMarkers) {
        const markerHandler = registry?.get('markerHandler');
        if (markerHandler && typeof markerHandler.activateMarkers === 'function') {
          await markerHandler.activateMarkers();
          console.log('✅ Markers auto-activated');
        }
      }
    }
    
    // ================================
    // RAG Highlight Marker Handlers
    // ================================

    /**
     * Handle creation of text markers for RAG highlights
     * This is called after RAG highlights have been applied
     * @private
     */
    async handleCreateTextMarkersForRAGHighlights(highlights) {
        console.log('📍 Creating text markers for RAG highlights:', highlights?.length || 0);
        
        if (!highlights || highlights.length === 0) {
            return { success: false, error: 'No highlights provided', markersCreated: 0 };
        }
        
        try {
            // Step 1: Get or create TextMarker instance
            let textMarker = null;
            
            // Try to get from marker handler first
            const markerHandler = global.serviceRegistry?.get('markerHandler') || global.markerHandler;
            if (markerHandler) {
                // Ensure text marker type is activated
                if (!markerHandler.getMarker('text')) {
                    console.log('📍 Activating text marker type first...');
                    const activationResult = await markerHandler.activateMarkers({ types: ['text'] });
                    if (!activationResult.success) {
                        console.error('Failed to activate text markers:', activationResult.error);
                        return { success: false, error: 'Failed to activate text markers', markersCreated: 0 };
                    }
                }
                textMarker = markerHandler.getMarker('text');
            }
            
            // If not available through marker handler, try global instance
            if (!textMarker) {
                textMarker = global.textMarkerInstance || global.TextMarker?.instance;
            }
            
            // If still not available, create new instance
            if (!textMarker) {
                if (global.TextMarker) {
                    console.log('📍 Creating new TextMarker instance...');
                    textMarker = new global.TextMarker();
                    
                    // Initialize the marker
                    try {
                        await textMarker.init();
                        await textMarker.activate();
                    } catch (initError) {
                        console.error('Failed to initialize TextMarker:', initError);
                        return { success: false, error: 'Failed to initialize TextMarker', markersCreated: 0 };
                    }
                    
                    // Store as global instance
                    global.textMarkerInstance = textMarker;
                    
                    // Register with marker handler if available
                    if (markerHandler && typeof markerHandler.registerMarkerType === 'function') {
                        markerHandler.registerMarkerType('text', global.TextMarker);
                    }
                } else {
                    console.error('TextMarker class not available');
                    return { success: false, error: 'TextMarker not available', markersCreated: 0 };
                }
            }
            
            // Step 2: Ensure marker is activated and has UI
            if (!textMarker.isActive) {
                console.log('📍 Activating TextMarker...');
                const activationResult = await textMarker.activate();
                if (!activationResult.success) {
                    console.error('Failed to activate TextMarker:', activationResult.error);
                    return { success: false, error: 'Failed to activate TextMarker', markersCreated: 0 };
                }
            }
            
            // Step 3: Use the dedicated RAG method if available
            let result;
            if (typeof textMarker.createMarkersForRAGHighlights === 'function') {
                console.log('📍 Using createMarkersForRAGHighlights method...');
                result = textMarker.createMarkersForRAGHighlights(highlights);
                
                // Handle different return formats
                if (typeof result === 'object' && result !== null) {
                    const markersCreated = result.created || result.markersCreated || 0;
                    const errors = result.errors || [];
                    
                    console.log(`✅ Created ${markersCreated} text markers for RAG highlights`);
                    if (errors.length > 0) {
                        console.warn('Errors during marker creation:', errors);
                    }
                    
                    return {
                        success: true,
                        markersCreated: markersCreated,
                        totalHighlights: highlights.length,
                        errors: errors.length > 0 ? errors : undefined
                    };
                } else if (typeof result === 'number') {
                    // Legacy format - just returns count
                    return {
                        success: true,
                        markersCreated: result,
                        totalHighlights: highlights.length
                    };
                }
            } else {
                // Fallback: Create markers individually
                console.log('📍 Using fallback individual marker creation...');
                let markersCreated = 0;
                let errors = [];
                
                for (const highlight of highlights) {
                    try {
                        // Find the highlighted element
                        let element = null;
                        
                        // Try to find by data-highlight-id
                        if (highlight.id) {
                            element = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
                        }
                        
                        // Try to find by class and text content
                        if (!element) {
                            const ragHighlights = document.querySelectorAll('.orkg-rag-highlight, .orkg-highlighted');
                            for (const el of ragHighlights) {
                                const elText = el.textContent.trim();
                                const highlightText = (highlight.text || highlight.sentence || '').trim();
                                if (elText === highlightText) {
                                    element = el;
                                    // Set the highlight ID if not present
                                    if (!el.dataset.highlightId) {
                                        el.dataset.highlightId = highlight.id;
                                    }
                                    break;
                                }
                            }
                        }
                        
                        if (element) {
                            // Clean up any incorrect styles on the element
                            if (element.style.position === 'absolute') {
                                element.style.position = '';
                                element.style.top = '';
                                element.style.right = '';
                                element.style.zIndex = '';
                            }
                            
                            const metadata = {
                                id: `marker_rag_${highlight.id}`,
                                highlightId: highlight.id,
                                text: highlight.text || highlight.sentence,
                                property: {
                                    id: highlight.propertyId,
                                    label: highlight.propertyLabel,
                                    source: 'rag'
                                },
                                confidence: highlight.confidence || 0.5,
                                section: highlight.section,
                                sentenceIndex: highlight.sentenceIndex,
                                color: highlight.color,
                                source: 'rag',
                                fromRAG: true
                            };
                            
                            const markerCreated = textMarker.createMarker(element, metadata);
                            if (markerCreated) {
                                markersCreated++;
                                
                                // Store reference
                                this.state.ragHighlights.set(highlight.id, {
                                    highlight: highlight,
                                    element: element,
                                    marker: markerCreated
                                });
                            } else {
                                errors.push(`Failed to create marker for highlight ${highlight.id}`);
                            }
                        } else {
                            console.warn(`Could not find element for highlight: ${highlight.id}`);
                            errors.push(`Element not found for highlight ${highlight.id}`);
                        }
                    } catch (error) {
                        console.error(`Error creating marker for highlight ${highlight.id}:`, error);
                        errors.push({ highlightId: highlight.id, error: error.message });
                    }
                }
                
                console.log(`✅ Created ${markersCreated} text markers for RAG highlights`);
                
                return {
                    success: true,
                    markersCreated: markersCreated,
                    totalHighlights: highlights.length,
                    errors: errors.length > 0 ? errors : undefined
                };
            }
            
        } catch (error) {
            console.error('❌ Failed to create text markers for RAG highlights:', error);
            return {
                success: false,
                error: error.message,
                markersCreated: 0
            };
        }
    }
    
    /**
     * Find highlighted element in DOM
     * @private
     */
    findHighlightedElement(highlight) {
      // Try multiple strategies to find the element
      
      // Strategy 1: Find by highlight ID
      let element = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
      if (element) return element;
      
      // Strategy 2: Find by RAG highlight class and text content
      const ragHighlights = document.querySelectorAll('.orkg-rag-highlight, .orkg-highlighted');
      for (const el of ragHighlights) {
        // Check if text matches
        if (el.textContent === highlight.text || el.textContent === highlight.sentence) {
          // Also check if property matches if available
          if (!el.dataset.highlightId || el.dataset.propertyId === highlight.propertyId) {
            // Assign the highlight ID if not present
            if (!el.dataset.highlightId) {
              el.dataset.highlightId = highlight.id;
            }
            return el;
          }
        }
      }
      
      // Strategy 3: Find by property and text (fuzzy match)
      for (const el of ragHighlights) {
        const elText = el.textContent.trim();
        const highlightText = (highlight.text || highlight.sentence || '').trim();
        
        // Check for partial match (in case of slight differences)
        if (elText && highlightText && 
            (elText.includes(highlightText) || highlightText.includes(elText))) {
          if (el.dataset.propertyId === highlight.propertyId ||
              el.dataset.propertyLabel === highlight.propertyLabel) {
            // Assign the highlight ID
            if (!el.dataset.highlightId) {
              el.dataset.highlightId = highlight.id;
            }
            return el;
          }
        }
      }
      
      return null;
    }
    
    /**
     * Create marker for a RAG highlight
     * @private
     */
    createMarkerForRAGHighlight(textMarker, element, highlight) {
      try {
        // Prepare metadata for marker
        const markerMetadata = {
          id: `marker_rag_${highlight.id}`,
          highlightId: highlight.id,
          text: highlight.text || highlight.sentence,
          property: {
            id: highlight.propertyId,
            label: highlight.propertyLabel,
            source: 'rag'
          },
          confidence: highlight.confidence || 0.5,
          section: highlight.section,
          sentenceIndex: highlight.sentenceIndex,
          color: highlight.color,
          source: 'rag'
        };
        
        // Create the marker using TextMarker's method
        const markerData = textMarker.createMarker(element, markerMetadata);
        
        if (markerData && markerData.element) {
          // Position the marker appropriately
          const markerElement = markerData.element;
          
          // Make the parent element relative positioned if needed
          if (element.style.position !== 'relative') {
            element.style.position = 'relative';
          }
          
          // Style the marker for RAG highlights
          markerElement.style.cssText = `
            position: absolute !important;
            top: -8px !important;
            right: -8px !important;
            z-index: 10002 !important;
          `;
          
          // Add confidence indicator if available
          if (highlight.confidence) {
            const confidenceBadge = document.createElement('div');
            confidenceBadge.style.cssText = `
              position: absolute !important;
              bottom: -4px !important;
              right: -4px !important;
              background: ${this.getConfidenceColor(highlight.confidence)} !important;
              color: white !important;
              font-size: 9px !important;
              font-weight: bold !important;
              padding: 2px 4px !important;
              border-radius: 10px !important;
              font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
            `;
            confidenceBadge.textContent = `${Math.round(highlight.confidence * 100)}%`;
            markerElement.appendChild(confidenceBadge);
          }
          
          console.log(`📍 Created RAG marker for highlight: ${highlight.id}`);
          return markerData;
        }
        
        return null;
        
      } catch (error) {
        console.error('Error creating RAG marker:', error);
        return null;
      }
    }

    /**
     * Handle creation of image markers for RAG-identified images
     */
    async handleCreateImageMarkersForRAG(images) {
        console.log('📷 Creating image markers for RAG:', images?.length || 0);
        
        if (!images || images.length === 0) {
            return { success: false, error: 'No images provided', markersCreated: 0 };
        }
        
        try {
            // Step 1: Get or create ImageMarker instance
            let imageMarker = null;
            
            // Try to get from marker handler first
            const markerHandler = global.serviceRegistry?.get('markerHandler') || global.markerHandler;
            if (markerHandler) {
                imageMarker = markerHandler.getMarker('image');
            }
            
            // If not available through marker handler, try global instance
            if (!imageMarker) {
                imageMarker = global.imageMarkerInstance || global.ImageMarker?.instance;
            }
            
            // If still not available, create new instance
            if (!imageMarker) {
                if (global.ImageMarker) {
                    imageMarker = new global.ImageMarker();
                    await imageMarker.init();
                    
                    // Store as global instance
                    global.imageMarkerInstance = imageMarker;
                    
                    // Register with marker handler if available
                    if (markerHandler && typeof markerHandler.registerMarker === 'function') {
                        markerHandler.registerMarker('image', imageMarker);
                    }
                } else {
                    console.error('ImageMarker class not available');
                    return { success: false, error: 'ImageMarker not available', markersCreated: 0 };
                }
            }
            
            // Step 2: Ensure marker is activated
            if (!imageMarker.isActive) {
                await imageMarker.activate({
                    autoMark: false // Don't auto-mark all images, just the ones from RAG
                });
            }
            
            // Step 3: Create markers for RAG images using the new method
            let markersCreated = 0;
            
            if (typeof imageMarker.createMarkersForRAGImages === 'function') {
                // Use the new dedicated method
                markersCreated = imageMarker.createMarkersForRAGImages(images);
            } else {
                // Fallback: Create markers individually
                for (const imageData of images) {
                    try {
                        // Find the image element
                        let element = null;
                        
                        if (imageData.selector) {
                            element = document.querySelector(imageData.selector);
                        } else if (imageData.src) {
                            element = document.querySelector(`img[src="${imageData.src}"]`) ||
                                    document.querySelector(`img[src*="${imageData.src}"]`);
                        } else if (imageData.id && imageData.id.startsWith('rag_img_')) {
                            // Try to find by index
                            const index = parseInt(imageData.id.split('_')[2]);
                            const allImages = document.querySelectorAll('img');
                            if (allImages[index]) {
                                element = allImages[index];
                            }
                        }
                        
                        if (element) {
                            const metadata = {
                                id: imageData.id || `rag_img_${Date.now()}_${markersCreated}`,
                                src: imageData.src || element.src,
                                alt: imageData.alt || element.alt,
                                title: imageData.title || element.title,
                                caption: imageData.caption || imageData.context?.caption,
                                dimensions: imageData.dimensions || {
                                    width: element.naturalWidth || element.width,
                                    height: element.naturalHeight || element.height
                                },
                                score: imageData.score || imageData.intelligence?.score || 0.5,
                                type: imageData.type || 'figure',
                                fromRAG: true
                            };
                            
                            const markerCreated = imageMarker.createMarker(element, metadata);
                            if (markerCreated) {
                                markersCreated++;
                                console.log(`✅ Created image marker for element:`, element);
                            }
                        } else {
                            console.warn(`Could not find image element for:`, imageData);
                        }
                    } catch (error) {
                        console.error(`Error creating image marker:`, error);
                    }
                }
            }
            
            console.log(`✅ Created ${markersCreated} image markers for RAG`);
            
            // Step 4: Store RAG image references
            images.forEach((imageData, index) => {
                if (imageData.id) {
                    this.state.ragHighlights.set(`image_${imageData.id}`, {
                        type: 'image',
                        data: imageData,
                        markerCreated: index < markersCreated
                    });
                }
            });
            
            return { 
                success: true, 
                markersCreated: markersCreated,
                totalImages: images.length
            };
            
        } catch (error) {
            console.error('❌ Failed to create image markers:', error);
            return { 
                success: false, 
                error: error.message, 
                markersCreated: 0 
            };
        }
    }

    /**
     * Handle creation of table markers for RAG-identified tables
     */
    async handleCreateTableMarkersForRAG(tables) {
        console.log('📊 Creating table markers for RAG:', tables?.length || 0);
        
        if (!tables || tables.length === 0) {
            return { success: false, error: 'No tables provided', markersCreated: 0 };
        }
        
        try {
            // Get marker handler
            const markerHandler = global.serviceRegistry?.get('markerHandler') || global.markerHandler;
            if (!markerHandler) {
                return { success: false, error: 'MarkerHandler not available', markersCreated: 0 };
            }
            
            // Ensure table marker is activated
            if (!markerHandler.getMarker('table')) {
                await markerHandler.activateMarkers({ types: ['table'] });
            }
            
            const tableMarker = markerHandler.getMarker('table');
            if (!tableMarker) {
                return { success: false, error: 'Table marker not available', markersCreated: 0 };
            }
            
            let markersCreated = 0;
            
            for (const tableData of tables) {
                try {
                    // Find the table element
                    const element = tableData.selector ? 
                        document.querySelector(tableData.selector) :
                        document.querySelectorAll('table')[tables.indexOf(tableData)];
                    
                    if (element) {
                        const metadata = {
                            id: tableData.id,
                            caption: tableData.caption,
                            summary: tableData.summary,
                            rows: tableData.summary?.rows,
                            columns: tableData.summary?.columns,
                            fromRAG: true,
                            ...tableData
                        };
                        
                        const markerCreated = tableMarker.createMarker(element, metadata);
                        if (markerCreated) {
                            markersCreated++;
                        }
                    }
                } catch (error) {
                    console.error(`Error creating table marker:`, error);
                }
            }
            
            console.log(`✅ Created ${markersCreated} table markers for RAG`);
            return { success: true, markersCreated };
            
        } catch (error) {
            console.error('❌ Failed to create table markers:', error);
            return { success: false, error: error.message, markersCreated: 0 };
        }
    }
    
    /**
     * Get confidence color based on score
     * @private
     */
    getConfidenceColor(confidence) {
      if (confidence >= 0.8) return '#10b981'; // Green
      if (confidence >= 0.5) return '#f59e0b'; // Orange
      return '#ef4444'; // Red
    }
    
    // ================================
    // Core State Handlers (kept in manager)
    // ================================
    
    /**
     * Handle ping message
     * @private
     */
    handlePing() {
      return {
        initialized: this.initialized,
        inAnalysisStep: this.state.inAnalysisStep,
        features: this.getEnabledFeatures(),
        ragHighlights: this.state.ragHighlights.size,
        manualHighlights: this.state.manualHighlights.size,
        timestamp: Date.now()
      };
    }
    
    /**
     * Handle check analysis step
     * @private
     */
    handleCheckAnalysisStep() {
      return {
        isInAnalysisStep: this.state.inAnalysisStep,
        success: true
      };
    }
    
    /**
     * Handle set analysis step
     * @private
     */
    handleSetAnalysisStep(message) {
      this.setAnalysisStep(message.isAnalysisStep === true);
      return { success: true };
    }
    
    /**
     * Handle update configuration
     * @private
     */
    handleUpdateConfig(message) {
      if (message.config) {
        this.updateConfig(message.config);
      }
      return { success: true, config: this.config };
    }
    
    /**
     * Handle get status
     * @private
     */
    handleGetStatus() {
      return this.getStatus();
    }
    
    // ================================
    // Public API Methods
    // ================================
    
    /**
     * Set whether the user is in the analysis step
     */
    setAnalysisStep(isAnalysisStep) {
      this.state.inAnalysisStep = isAnalysisStep;
      console.log(`📊 Analysis step ${isAnalysisStep ? 'activated' : 'deactivated'}`);
      
      // Notify relevant services
      const selectionManager = global.serviceRegistry?.get('selectionManager');
      if (selectionManager) {
        if (isAnalysisStep) {
          selectionManager.enable?.();
        } else {
          selectionManager.disable?.();
        }
      }
      
      // Notify property handler to hide window if leaving analysis step
      if (!isAnalysisStep) {
        const propertyHandler = global.serviceRegistry?.get('propertyHandler');
        if (propertyHandler && typeof propertyHandler.hideWindow === 'function') {
          propertyHandler.hideWindow();
        }
      }
      
      // Emit state change event
      if (global.eventBus) {
        global.eventBus.emit('state:analysisStepChanged', { isAnalysisStep });
      }
    }
    
    /**
     * Update state flags
     */
    updateState(updates) {
      Object.assign(this.state, updates);
      console.log('📊 State updated:', updates);
      
      // Emit state change event
      if (global.eventBus) {
        global.eventBus.emit('state:updated', this.state);
      }
    }
    
    /**
     * Get list of enabled features
     */
    getEnabledFeatures() {
      const features = [];
      
      if (this.config.enableTextSelection) features.push('text-selection');
      if (this.config.enableMarkers) features.push('markers');
      if (this.config.enableRAG) features.push('rag');
      if (this.config.enableExtraction) features.push('extraction');
      if (this.config.createMarkersForRAG) features.push('rag-markers');
      
      return features;
    }
    
    /**
     * Update configuration
     */
    updateConfig(config) {
      this.config = { ...this.config, ...config };
      console.log('✅ Configuration updated:', this.config);
      
      // Emit config change event
      if (global.eventBus) {
        global.eventBus.emit('config:updated', this.config);
      }
    }
    
    /**
     * Get content script status
     */
    getStatus() {
      return {
        initialized: this.initialized,
        state: this.state,
        config: this.config,
        services: global.serviceRegistry?.getStatus?.() || {},
        features: this.getEnabledFeatures(),
        highlights: {
          rag: this.state.ragHighlights.size,
          manual: this.state.manualHighlights.size,
          total: this.state.ragHighlights.size + this.state.manualHighlights.size
        }
      };
    }
    
    /**
     * Check if manager is ready
     */
    isReady() {
      return this.initialized;
    }
    
    /**
     * Get current state
     */
    getState() {
      return { ...this.state };
    }
    
    /**
     * Get current configuration
     */
    getConfig() {
      return { ...this.config };
    }
    
    /**
     * Clean up content script
     */
    async cleanup() {
      console.log('🧹 Cleaning up content script...');
      
      // Clear highlight references
      this.state.ragHighlights.clear();
      this.state.manualHighlights.clear();
      
      // Clean up all services through registry
      if (global.serviceRegistry) {
        await global.serviceRegistry.cleanup();
      }
      
      // Reset state
      this.initialized = false;
      this.state = {
        inAnalysisStep: false,
        lastSelectionTime: 0,
        ragHighlights: new Map(),
        manualHighlights: new Map()
      };
      this._initPromise = null;
      
      console.log('✅ Content script cleanup completed');
    }
  }
  
  // Create singleton instance
  const contentScriptManager = new ContentScriptManager();
  
  // Expose globally
  global.contentScriptManager = contentScriptManager;
  global.ContentScriptManager = ContentScriptManager;
  
  console.log('📢 ContentScriptManager exposed to global scope');
  
})(typeof window !== 'undefined' ? window : this);
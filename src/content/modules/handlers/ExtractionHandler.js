// ================================
// src/content/modules/handlers/ExtractionHandler.js - CLEAN ORCHESTRATOR
// ================================

(function(global) {
  'use strict';
  
  /**
   * ExtractionHandler Service
   * 
   * Acts as an orchestrator for extraction operations.
   * Delegates actual extraction work to specialized extractors.
   * Handles message routing, state management, and coordination.
   */
  class ExtractionHandler {
    constructor() {
      this.isInitialized = false;
      
      // References to extractor instances
      this.extractors = {
        text: null,
        table: null,
        image: null
      };
      
      // Extraction state management
      this.state = {
        isExtracting: false,
        currentExtractionType: null,
        activeExtractions: new Map(),
        statistics: {
          text: { totalExtractions: 0, lastExtracted: null },
          table: { totalExtractions: 0, lastExtracted: null },
          image: { totalExtractions: 0, lastExtracted: null }
        }
      };
      
      // BIND ALL METHODS TO ENSURE THEY'RE AVAILABLE ON THE INSTANCE
      this.bindMethods();
      
      console.log('📤 ExtractionHandler orchestrator created');
    }

    /**
     * Bind all methods to ensure they're available on the instance
     * @private
     */
    bindMethods() {
      // Core methods
      this.init = this.init.bind(this);
      this.initializeExtractors = this.initializeExtractors.bind(this);
      this.getOrCreateExtractor = this.getOrCreateExtractor.bind(this);
      this.registerMessageHandlers = this.registerMessageHandlers.bind(this);
      
      // Orchestration methods
      this.orchestrateExtraction = this.orchestrateExtraction.bind(this);
      this.orchestrateAllExtractions = this.orchestrateAllExtractions.bind(this);
      this.getExtractionMethod = this.getExtractionMethod.bind(this);
      this.processExtractionResult = this.processExtractionResult.bind(this);
      this.ensureTextResultFormat = this.ensureTextResultFormat.bind(this);
      this.ensureTableResultFormat = this.ensureTableResultFormat.bind(this);
      this.ensureImageResultFormat = this.ensureImageResultFormat.bind(this);
      this.getEmptyResult = this.getEmptyResult.bind(this);
      this.getItemCount = this.getItemCount.bind(this);
      this.calculateTextStats = this.calculateTextStats.bind(this);
      this.calculateTableStats = this.calculateTableStats.bind(this);
      this.calculateImageStats = this.calculateImageStats.bind(this);
      this.generateStats = this.generateStats.bind(this);
      this.updateStatistics = this.updateStatistics.bind(this);
      this.cleanupOldExtractions = this.cleanupOldExtractions.bind(this);
      
      // Control methods
      this.cancelExtraction = this.cancelExtraction.bind(this);
      this.getStatus = this.getStatus.bind(this);
      
      // UI methods
      this.showOverlay = this.showOverlay.bind(this);
      this.updateOverlayMessage = this.updateOverlayMessage.bind(this);
      this.hideOverlay = this.hideOverlay.bind(this);
      
      // Public API methods
      this.extractText = this.extractText.bind(this);
      this.extractTables = this.extractTables.bind(this);
      this.extractImages = this.extractImages.bind(this);
      this.extractAll = this.extractAll.bind(this);
      this.isExtracting = this.isExtracting.bind(this);
      this.getCurrentExtractionType = this.getCurrentExtractionType.bind(this);
      this.getExtractionHistory = this.getExtractionHistory.bind(this);
      this.clearHistory = this.clearHistory.bind(this);
      this.cleanup = this.cleanup.bind(this);
    }
    
    /**
     * Initialize the extraction handler
     */
    async init() {
      if (this.isInitialized) {
        console.warn('ExtractionHandler already initialized');
        return;
      }
      
      console.log('📤 Initializing ExtractionHandler orchestrator...');
      
      try {
        // Initialize extractors
        await this.initializeExtractors();
        
        // Register message handlers
        this.registerMessageHandlers();
        
        this.isInitialized = true;
        console.log('✅ ExtractionHandler orchestrator initialized');
      } catch (error) {
        console.error('❌ Failed to initialize ExtractionHandler:', error);
        throw error;
      }
    }
    
    /**
     * Initialize individual extractors
     * @private
     */
    async initializeExtractors() {
      const registry = global.serviceRegistry;
      console.log('📤 Initializing extractors...');
      
      // Initialize TextExtractor
      this.extractors.text = await this.getOrCreateExtractor('text', 'TextExtractor', 'textExtractor');
      
      // Initialize TableExtractor
      this.extractors.table = await this.getOrCreateExtractor('table', 'TableExtractor', 'tableExtractor');
      
      // Initialize ImageExtractor
      this.extractors.image = await this.getOrCreateExtractor('image', 'ImageExtractor', 'imageExtractor');
      
      console.log('📤 Extractors initialized:', {
        text: !!this.extractors.text,
        table: !!this.extractors.table,
        image: !!this.extractors.image
      });
    }
    
    /**
     * Get or create an extractor instance
     * @private
     */
    async getOrCreateExtractor(type, className, instanceName) {
      try {
        let extractor = null;
        const registry = global.serviceRegistry;
        
        // Check global class
        if (global[className]) {
          extractor = new global[className]();
        }
        // Check global instance
        else if (global[instanceName]) {
          extractor = global[instanceName];
        }
        // Check service registry
        else if (registry?.has(instanceName)) {
          extractor = registry.get(instanceName);
        }
        
        // Initialize if needed
        if (extractor && typeof extractor.init === 'function') {
          await extractor.init();
          console.log(`✅ ${className} initialized`);
        }
        
        return extractor;
        
      } catch (error) {
        console.warn(`⚠️ Failed to initialize ${className}:`, error);
        return null;
      }
    }
    
    /**
     * Register message handlers
     * @private
     */
    registerMessageHandlers() {
      const messageHandler = global.serviceRegistry?.get('messageHandler') || global.messageHandler;
      
      if (!messageHandler) {
        console.warn('⚠️ MessageHandler not available');
        return;
      }
      
      // Register extraction message handlers
      messageHandler.registerHandler('EXTRACT_TEXT', (msg) => this.orchestrateExtraction('text', msg));
      messageHandler.registerHandler('EXTRACT_TABLES', (msg) => this.orchestrateExtraction('table', msg));
      messageHandler.registerHandler('EXTRACT_IMAGES', (msg) => this.orchestrateExtraction('image', msg));
      messageHandler.registerHandler('EXTRACT_ALL', (msg) => this.orchestrateAllExtractions(msg));
      messageHandler.registerHandler('GET_EXTRACTION_STATUS', () => this.getStatus());
      messageHandler.registerHandler('CANCEL_EXTRACTION', () => this.cancelExtraction());
      
      console.log('📤 Message handlers registered');
    }
    
    // ================================
    // Core Orchestration Method
    // ================================
    
    /**
     * Orchestrate extraction for a specific type
     * @param {string} type - Type of extraction (text/table/image)
     * @param {Object} message - Message containing options
     */
    async orchestrateExtraction(type, message = {}) {
      // Check if already extracting
      if (this.state.isExtracting) {
        return {
          success: false,
          error: 'Another extraction is already in progress',
          type: this.state.currentExtractionType
        };
      }
      
      // Check if extractor is available
      const extractor = this.extractors[type];
      if (!extractor) {
        return {
          success: false,
          error: `${type} extractor is not available`,
          type: type
        };
      }
      
      const extractionId = `${type}_${Date.now()}`;
      
      try {
        console.log(`📤 Orchestrating ${type} extraction: ${extractionId}`);
        
        // Update state
        this.state.isExtracting = true;
        this.state.currentExtractionType = type;
        
        // Track extraction
        const extractionRecord = {
          id: extractionId,
          type: type,
          startTime: Date.now(),
          status: 'running',
          options: message.options || {}
        };
        this.state.activeExtractions.set(extractionId, extractionRecord);
        
        // Show overlay if requested
        if (message.showOverlay) {
          this.showOverlay(type);
        }
        
        // Delegate to appropriate extractor
        let result = null;
        const extractionMethod = this.getExtractionMethod(extractor, type);
        
        if (extractionMethod) {
          result = await extractionMethod.call(extractor, message.options || {});
        } else {
          throw new Error(`No extraction method found for ${type}`);
        }
        
        // Process result
        const processedResult = this.processExtractionResult(type, result);
        
        // Update extraction record
        extractionRecord.endTime = Date.now();
        extractionRecord.duration = extractionRecord.endTime - extractionRecord.startTime;
        extractionRecord.status = 'completed';
        extractionRecord.itemCount = this.getItemCount(type, processedResult);
        
        // Update statistics
        this.updateStatistics(type, extractionRecord);
        
        console.log(`✅ ${type} extraction completed in ${extractionRecord.duration}ms`);
        
        return {
          success: true,
          type: type,
          extractionId: extractionId,
          duration: extractionRecord.duration,
          data: processedResult,
          stats: this.generateStats(type, processedResult)
        };
        
      } catch (error) {
        console.error(`❌ ${type} extraction failed:`, error);
        
        // Update extraction record
        const extractionRecord = this.state.activeExtractions.get(extractionId);
        if (extractionRecord) {
          extractionRecord.endTime = Date.now();
          extractionRecord.duration = extractionRecord.endTime - extractionRecord.startTime;
          extractionRecord.status = 'failed';
          extractionRecord.error = error.message;
        }
        
        return {
          success: false,
          type: type,
          extractionId: extractionId,
          error: error.message
        };
        
      } finally {
        // Reset state
        this.state.isExtracting = false;
        this.state.currentExtractionType = null;
        
        // Hide overlay
        if (message.showOverlay) {
          this.hideOverlay();
        }
        
        // Cleanup old extractions
        this.cleanupOldExtractions();
      }
    }
    
    /**
     * Orchestrate extraction for all types
     */
    async orchestrateAllExtractions(message = {}) {
      if (this.state.isExtracting) {
        return {
          success: false,
          error: 'Another extraction is already in progress'
        };
      }
      
      const extractionId = `all_${Date.now()}`;
      const results = {};
      const errors = {};
      
      try {
        console.log(`📤 Orchestrating ALL extractions: ${extractionId}`);
        
        // Show overlay if requested
        if (message.showOverlay) {
          this.showOverlay('all');
        }
        
        // Extract each type sequentially
        const types = message.types || ['text', 'table', 'image'];
        
        for (const type of types) {
          if (!this.extractors[type]) {
            console.warn(`⚠️ Skipping ${type} - extractor not available`);
            errors[type] = 'Extractor not available';
            continue;
          }
          
          try {
            // Update overlay message
            if (message.showOverlay) {
              this.updateOverlayMessage(`Extracting ${type} content...`);
            }
            
            // Extract without showing individual overlays
            const result = await this.orchestrateExtraction(type, {
              ...message,
              showOverlay: false
            });
            
            if (result.success) {
              results[type] = result.data;
            } else {
              errors[type] = result.error;
            }
            
          } catch (error) {
            console.error(`Failed to extract ${type}:`, error);
            errors[type] = error.message;
          }
        }
        
        return {
          success: Object.keys(results).length > 0,
          extractionId: extractionId,
          data: results,
          errors: Object.keys(errors).length > 0 ? errors : null,
          stats: {
            requested: types.length,
            successful: Object.keys(results).length,
            failed: Object.keys(errors).length
          }
        };
        
      } finally {
        if (message.showOverlay) {
          this.hideOverlay();
        }
      }
    }
    
    // ================================
    // Helper Methods
    // ================================
    
    /**
     * Get the appropriate extraction method for an extractor
     * @private
     */
    getExtractionMethod(extractor, type) {
      // Try different method names that extractors might use
      const methodNames = [
        `extract${type.charAt(0).toUpperCase() + type.slice(1)}s`, // extractTexts, extractTables, extractImages
        `extract${type.charAt(0).toUpperCase() + type.slice(1)}`,  // extractText, extractTable, extractImage
        'extractAll',                                                // Generic extractAll
        'extract'                                                    // Generic extract
      ];
      
      for (const methodName of methodNames) {
        if (typeof extractor[methodName] === 'function') {
          return extractor[methodName];
        }
      }
      
      return null;
    }
    
    /**
     * Process extraction result to ensure consistent format
     * @private
     */
    processExtractionResult(type, result) {
      if (!result) {
        return this.getEmptyResult(type);
      }
      
      // Ensure consistent structure based on type
      switch (type) {
        case 'text':
          return this.ensureTextResultFormat(result);
        case 'table':
          return this.ensureTableResultFormat(result);
        case 'image':
          return this.ensureImageResultFormat(result);
        default:
          return result;
      }
    }
    
    /**
     * Ensure text result has consistent format
     * @private
     */
    ensureTextResultFormat(result) {
      if (result.sections) {
        return result; // Already in correct format
      }
      
      // Convert array or other formats to sections object
      const sections = {};
      
      if (Array.isArray(result)) {
        result.forEach((item, index) => {
          const name = item.name || item.title || `section_${index}`;
          sections[name] = item.content || item.text || item;
        });
      } else if (typeof result === 'object') {
        // Assume it's already a sections object
        Object.assign(sections, result);
      } else {
        sections.content = String(result);
      }
      
      return { sections, stats: this.calculateTextStats(sections) };
    }
    
    /**
     * Ensure table result has consistent format
     * @private
     */
    ensureTableResultFormat(result) {
      if (result.tables) {
        return result; // Already in correct format
      }
      
      const tables = Array.isArray(result) ? result : [result];
      
      return {
        tables: tables.filter(t => t && typeof t === 'object'),
        stats: this.calculateTableStats(tables)
      };
    }
    
    /**
     * Ensure image result has consistent format
     * @private
     */
    ensureImageResultFormat(result) {
      if (result.images) {
        return result; // Already in correct format
      }
      
      const images = Array.isArray(result) ? result : [result];
      
      return {
        images: images.filter(i => i && typeof i === 'object'),
        stats: this.calculateImageStats(images)
      };
    }
    
    /**
     * Get empty result for a type
     * @private
     */
    getEmptyResult(type) {
      switch (type) {
        case 'text':
          return { sections: {}, stats: { totalSections: 0 } };
        case 'table':
          return { tables: [], stats: { totalTables: 0 } };
        case 'image':
          return { images: [], stats: { totalImages: 0 } };
        default:
          return { data: [], stats: { total: 0 } };
      }
    }
    
    /**
     * Get item count from result
     * @private
     */
    getItemCount(type, result) {
      switch (type) {
        case 'text':
          return Object.keys(result.sections || {}).length;
        case 'table':
          return (result.tables || []).length;
        case 'image':
          return (result.images || []).length;
        default:
          return 0;
      }
    }
    
    /**
     * Calculate text statistics
     * @private
     */
    calculateTextStats(sections) {
      const allText = Object.values(sections).join(' ');
      const words = allText.split(/\s+/).filter(w => w.length > 0);
      
      return {
        totalSections: Object.keys(sections).length,
        totalWords: words.length,
        totalCharacters: allText.length,
        averageWordsPerSection: Math.round(words.length / Math.max(1, Object.keys(sections).length))
      };
    }
    
    /**
     * Calculate table statistics
     * @private
     */
    calculateTableStats(tables) {
      let totalRows = 0;
      let totalCells = 0;
      
      tables.forEach(table => {
        const rows = table.rows || table.data || [];
        totalRows += rows.length;
        rows.forEach(row => {
          if (Array.isArray(row)) {
            totalCells += row.length;
          } else if (typeof row === 'object') {
            totalCells += Object.keys(row).length;
          }
        });
      });
      
      return {
        totalTables: tables.length,
        totalRows: totalRows,
        totalCells: totalCells,
        averageRowsPerTable: Math.round(totalRows / Math.max(1, tables.length))
      };
    }
    
    /**
     * Calculate image statistics
     * @private
     */
    calculateImageStats(images) {
      const types = {};
      let totalWidth = 0;
      let totalHeight = 0;
      
      images.forEach(image => {
        const type = image.type || 'unknown';
        types[type] = (types[type] || 0) + 1;
        
        if (image.dimensions) {
          totalWidth += image.dimensions.width || 0;
          totalHeight += image.dimensions.height || 0;
        }
      });
      
      return {
        totalImages: images.length,
        byType: types,
        averageDimensions: images.length > 0 ? {
          width: Math.round(totalWidth / images.length),
          height: Math.round(totalHeight / images.length)
        } : { width: 0, height: 0 }
      };
    }
    
    /**
     * Generate stats for extraction result
     * @private
     */
    generateStats(type, result) {
      switch (type) {
        case 'text':
          return result.stats || this.calculateTextStats(result.sections || {});
        case 'table':
          return result.stats || this.calculateTableStats(result.tables || []);
        case 'image':
          return result.stats || this.calculateImageStats(result.images || []);
        default:
          return { total: 0 };
      }
    }
    
    /**
     * Update statistics
     * @private
     */
    updateStatistics(type, extractionRecord) {
      const stats = this.state.statistics[type];
      if (stats) {
        stats.totalExtractions++;
        stats.lastExtracted = extractionRecord.endTime;
        stats.lastDuration = extractionRecord.duration;
        stats.lastItemCount = extractionRecord.itemCount;
      }
    }
    
    /**
     * Clean up old extractions (keep last 10)
     * @private
     */
    cleanupOldExtractions() {
      if (this.state.activeExtractions.size > 10) {
        const sorted = Array.from(this.state.activeExtractions.entries())
          .sort((a, b) => (b[1].startTime || 0) - (a[1].startTime || 0));
        
        // Keep only the 10 most recent
        this.state.activeExtractions.clear();
        sorted.slice(0, 10).forEach(([id, record]) => {
          this.state.activeExtractions.set(id, record);
        });
      }
    }
    
    /**
     * Cancel current extraction
     */
    cancelExtraction() {
      if (!this.state.isExtracting) {
        return {
          success: false,
          error: 'No extraction in progress'
        };
      }
      
      const type = this.state.currentExtractionType;
      
      // Reset state
      this.state.isExtracting = false;
      this.state.currentExtractionType = null;
      
      // Hide overlay
      this.hideOverlay();
      
      console.log(`⏹️ Cancelled ${type} extraction`);
      
      return {
        success: true,
        cancelledType: type
      };
    }
    
    /**
     * Get extraction status
     */
    getStatus() {
      return {
        isInitialized: this.isInitialized,
        isExtracting: this.state.isExtracting,
        currentExtractionType: this.state.currentExtractionType,
        availableExtractors: {
          text: !!this.extractors.text,
          table: !!this.extractors.table,
          image: !!this.extractors.image
        },
        statistics: this.state.statistics,
        recentExtractions: Array.from(this.state.activeExtractions.values())
          .slice(-5)
          .map(e => ({
            id: e.id,
            type: e.type,
            status: e.status,
            duration: e.duration,
            itemCount: e.itemCount
          }))
      };
    }
    
    // ================================
    // UI Helper Methods
    // ================================
    
    /**
     * Show extraction overlay
     * @private
     */
    showOverlay(type) {
        const overlayManager = global.serviceRegistry?.get('overlayManager') || global.overlayManager;
        
        if (overlayManager) {
            if (typeof overlayManager.show === 'function') {
                overlayManager.show();
            }
            
            // Use updateProgress instead of updateMessage
            if (typeof overlayManager.updateProgress === 'function') {
                overlayManager.updateProgress(0, `Extracting ${type} content...`);
            }
        }
    }
    
    /**
     * Update overlay message
     * @private
     */
    updateOverlayMessage(message) {
        const overlayManager = global.serviceRegistry?.get('overlayManager') || global.overlayManager;
        
        if (overlayManager) {
            // Check for different possible method names
            if (typeof overlayManager.updateMessage === 'function') {
                overlayManager.updateMessage(message);
            } else if (typeof overlayManager.update === 'function') {
                overlayManager.update(message);
            } else if (typeof overlayManager.updateProgress === 'function') {
                overlayManager.updateProgress(null, message);
            } else if (typeof overlayManager.setMessage === 'function') {
                overlayManager.setMessage(message);
            } else {
                console.warn('OverlayManager does not have a message update method');
            }
        }
    }
    
    /**
     * Hide extraction overlay
     * @private
     */
    hideOverlay() {
      const overlayManager = global.serviceRegistry?.get('overlayManager') || global.overlayManager;
      
      if (overlayManager && typeof overlayManager.hide === 'function') {
        overlayManager.hide();
      }
    }
    
    // ================================
    // Public API Methods
    // ================================
    
    /**
     * Extract text programmatically
     */
    async extractText(options = {}) {
      return this.orchestrateExtraction('text', { options });
    }
    
    /**
     * Extract tables programmatically
     */
    async extractTables(options = {}) {
      return this.orchestrateExtraction('table', { options });
    }
    
    /**
     * Extract images programmatically
     */
    async extractImages(options = {}) {
      return this.orchestrateExtraction('image', { options });
    }
    
    /**
     * Extract all content programmatically
     */
    async extractAll(options = {}) {
      return this.orchestrateAllExtractions({ options });
    }
    
    /**
     * Check if extraction is in progress
     */
    isExtracting() {
      return this.state.isExtracting;
    }
    
    /**
     * Get current extraction type
     */
    getCurrentExtractionType() {
      return this.state.currentExtractionType;
    }
    
    /**
     * Get extraction history
     */
    getExtractionHistory() {
      return Array.from(this.state.activeExtractions.values());
    }
    
    /**
     * Clear extraction history
     */
    clearHistory() {
      this.state.activeExtractions.clear();
      console.log('📤 Extraction history cleared');
    }
    
    /**
     * Clean up the handler
     */
    cleanup() {
      console.log('🧹 Cleaning up ExtractionHandler...');
      
      // Cancel any ongoing extraction
      if (this.state.isExtracting) {
        this.cancelExtraction();
      }
      
      // Clear state
      this.state.activeExtractions.clear();
      this.state.isExtracting = false;
      this.state.currentExtractionType = null;
      
      // Reset extractors
      this.extractors = {
        text: null,
        table: null,
        image: null
      };
      
      this.isInitialized = false;
      
      console.log('✅ ExtractionHandler cleanup completed');
    }
  }
  
  // Create singleton instance
  const extractionHandler = new ExtractionHandler();
  
  // Register with service registry if available
  if (global.serviceRegistry) {
    global.serviceRegistry.register('extractionHandler', extractionHandler);
  }
  
  // Expose globally
  global.extractionHandler = extractionHandler;
  global.ExtractionHandler = ExtractionHandler;
  
  console.log('📢 ExtractionHandler exposed to global scope');
  
})(typeof window !== 'undefined' ? window : this);
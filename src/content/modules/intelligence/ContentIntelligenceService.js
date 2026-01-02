// ================================
// src/content/intelligence/ContentIntelligenceService.js - Converted to IIFE
// ================================

(function(global) {
    'use strict';
    
    /**
     * ContentIntelligenceService
     * Provides intelligent analysis of page content
     */
    function ContentIntelligenceService() {
        this.initialized = false;
        this.textIntelligence = null;
        this.imageIntelligence = null;
        this.tableIntelligence = null;
    }
    
    /**
     * Initialize the intelligence service
     */
    ContentIntelligenceService.prototype.init = async function() {
        if (this.initialized) return;
        
        console.log('🧠 Initializing ContentIntelligenceService...');
        
        try {
            // Initialize Text Intelligence
            if (typeof window.TextIntelligence !== 'undefined') {
                this.textIntelligence = new window.TextIntelligence();
                if (this.textIntelligence.init) {
                    await this.textIntelligence.init();
                }
            }
            
            // Initialize Image Intelligence
            if (typeof window.ImageIntelligence !== 'undefined') {
                this.imageIntelligence = new window.ImageIntelligence();
                if (this.imageIntelligence.init) {
                    await this.imageIntelligence.init();
                }
            }
            
            // Initialize Table Intelligence
            if (typeof window.TableIntelligence !== 'undefined') {
                this.tableIntelligence = new window.TableIntelligence();
                if (this.tableIntelligence.init) {
                    await this.tableIntelligence.init();
                }
            }
            
            this.initialized = true;
            console.log('✅ ContentIntelligenceService initialized');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize ContentIntelligenceService:', error);
            return false;
        }
    };
    
    /**
     * Enhance text data with intelligence
     */
    ContentIntelligenceService.prototype.enhanceTextData = async function(textData) {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.textIntelligence) {
            console.warn('⚠️ TextIntelligence not available');
            return textData;
        }
        
        try {
            console.log('🧠 Enhancing text data with intelligence...');
            
            // Process sections
            const sections = textData.sections || {};
            const enhancedSections = {};
            
            for (const [key, section] of Object.entries(sections)) {
                enhancedSections[key] = this.textIntelligence.analyze(section, key);
            }
            
            return {
                ...textData,
                sections: enhancedSections,
                metadata: {
                    ...textData.metadata,
                    intelligence: {
                        applied: true,
                        timestamp: Date.now()
                    }
                }
            };
            
        } catch (error) {
            console.error('❌ Failed to enhance text data:', error);
            return textData;
        }
    };
    
    /**
     * Enhance image data with intelligence
     */
    ContentIntelligenceService.prototype.enhanceImageData = async function(imageData) {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.imageIntelligence) {
            console.warn('⚠️ ImageIntelligence not available');
            return imageData;
        }
        
        try {
            console.log('🧠 Enhancing image data with intelligence...');
            
            // Process images
            const images = imageData.images || [];
            const analyzedImages = this.imageIntelligence.analyzeMultiple(images);
            
            return {
                ...imageData,
                images: analyzedImages,
                metadata: {
                    ...imageData.metadata,
                    intelligence: {
                        applied: true,
                        timestamp: Date.now()
                    }
                },
                statistics: this.imageIntelligence.getStatistics(analyzedImages)
            };
            
        } catch (error) {
            console.error('❌ Failed to enhance image data:', error);
            return imageData;
        }
    };
    
    /**
     * Enhance table data with intelligence
     */
    ContentIntelligenceService.prototype.enhanceTableData = async function(tableData) {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.tableIntelligence) {
            console.warn('⚠️ TableIntelligence not available');
            return tableData;
        }
        
        try {
            console.log('🧠 Enhancing table data with intelligence...');
            
            // Process tables
            const tables = tableData.tables || [];
            const analyzedTables = tables.map(table => this.tableIntelligence.analyze(table));
            
            return {
                ...tableData,
                tables: analyzedTables,
                metadata: {
                    ...tableData.metadata,
                    intelligence: {
                        applied: true,
                        timestamp: Date.now()
                    }
                }
            };
            
        } catch (error) {
            console.error('❌ Failed to enhance table data:', error);
            return tableData;
        }
    };
    
    /**
     * Get property suggestions for text
     */
    ContentIntelligenceService.prototype.getPropertySuggestions = async function(text) {
        if (!this.initialized) {
            await this.init();
        }
        
        if (!this.textIntelligence) {
            console.warn('⚠️ TextIntelligence not available');
            return [];
        }
        
        try {
            return this.textIntelligence.suggestProperties(text);
        } catch (error) {
            console.error('❌ Failed to get property suggestions:', error);
            return [];
        }
    };
    
    /**
     * Clean up and reset
     */
    ContentIntelligenceService.prototype.cleanup = function() {
        // Clean up individual services
        if (this.textIntelligence && this.textIntelligence.cleanup) {
            this.textIntelligence.cleanup();
        }
        
        if (this.imageIntelligence && this.imageIntelligence.cleanup) {
            this.imageIntelligence.cleanup();
        }
        
        if (this.tableIntelligence && this.tableIntelligence.cleanup) {
            this.tableIntelligence.cleanup();
        }
        
        this.initialized = false;
        console.log('🧹 ContentIntelligenceService cleaned up');
    };
    
    // Export to global scope
    global.ContentIntelligenceService = ContentIntelligenceService;
    
})(typeof window !== 'undefined' ? window : this);
// ================================
// src/core/services/ExtractionOrchestrator.js
// Coordinates all extraction services with proper tab handling
// ================================

export class ExtractionOrchestrator {
    constructor(dependencies = {}) {
        this.imageExtractor = dependencies.imageExtractor;
        this.textExtractor = dependencies.textExtractor;
        this.tableExtractor = dependencies.tableExtractor;
        
        this.extractedData = {
            images: [],
            text: {},
            tables: []
        };
        
        this.isExtracting = false;
        this.onProgress = dependencies.onProgress;
        this.currentTab = null;
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        console.log('🔧 Initializing ExtractionOrchestrator...');
        
        try {
            // Get the current tab first
            this.currentTab = await this.getCurrentTab();
            
            if (!this.currentTab) {
                throw new Error('Could not identify target tab for extraction');
            }
            
            console.log(`📍 Target tab for extraction: ${this.currentTab.title} (ID: ${this.currentTab.id})`);
            
            // Create extractors if they don't exist
            if (!this.imageExtractor) {
                const { ImageExtractionService } = await import('./ImageExtractionService.js');
                this.imageExtractor = new ImageExtractionService({
                    tabId: this.currentTab.id
                });
            }
            
            if (!this.textExtractor) {
                const { TextExtractionService } = await import('./TextExtractionService.js');
                this.textExtractor = new TextExtractionService({
                    tabId: this.currentTab.id
                });
            }
            
            if (!this.tableExtractor) {
                const { TableExtractionService } = await import('./TableExtractionService.js');
                this.tableExtractor = new TableExtractionService({
                    tabId: this.currentTab.id
                });
            }
            
            // Initialize all extractors with the correct tab context
            await Promise.all([
                this.imageExtractor?.init?.(),
                this.textExtractor?.init?.(),
                this.tableExtractor?.init?.()
            ]);
            
            this.isInitialized = true;
            console.log('✅ ExtractionOrchestrator initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize ExtractionOrchestrator:', error);
            throw error;
        }
    }
    
    /**
     * Get the current active tab (research article tab)
     */
    async getCurrentTab() {
        try {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                return tab;
            }
            
            // Fallback
            return {
                id: 'current',
                url: window.location.href,
                title: document.title
            };
        } catch (error) {
            console.warn('Could not get current tab:', error);
            return null;
        }
    }
    
    /**
     * Extract all content types
     */
    async extractAll(options = {}) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (this.isExtracting) {
            console.warn('Extraction already in progress');
            return this.extractedData;
        }
        
        this.isExtracting = true;
        
        try {
            console.log('🔍 Starting complete extraction from research article...');
            
            const { images = true, text = true, tables = true } = options;
            const tasks = [];
            
            // Prepare extraction tasks
            if (images && this.imageExtractor) {
                tasks.push({
                    name: 'images',
                    extractor: this.imageExtractor,
                    weight: 0.4
                });
            }
            
            if (text && this.textExtractor) {
                tasks.push({
                    name: 'text',
                    extractor: this.textExtractor,
                    weight: 0.4
                });
            }
            
            if (tables && this.tableExtractor) {
                tasks.push({
                    name: 'tables',
                    extractor: this.tableExtractor,
                    weight: 0.2
                });
            }
            
            // Execute extractions
            let completedWeight = 0;
            
            for (const task of tasks) {
                this.updateProgress(completedWeight, `Extracting ${task.name}...`);
                
                try {
                    const result = await task.extractor.extract();
                    this.extractedData[task.name] = result;
                    
                    console.log(`✅ ${task.name} extraction completed:`, 
                        Array.isArray(result) ? `${result.length} items` : `${Object.keys(result).length} sections`);
                        
                } catch (error) {
                    console.error(`❌ ${task.name} extraction failed:`, error);
                    this.extractedData[task.name] = task.name === 'text' ? {} : [];
                }
                
                completedWeight += task.weight;
                this.updateProgress(completedWeight, `${task.name} completed`);
            }
            
            this.updateProgress(1, 'Extraction complete');
            
            console.log('✅ All extractions completed:', {
                images: this.extractedData.images.length,
                textSections: Object.keys(this.extractedData.text).length,
                tables: this.extractedData.tables.length,
                fromTab: this.currentTab?.title
            });
            
            return this.extractedData;
            
        } finally {
            this.isExtracting = false;
        }
    }
    
    /**
     * Extract only images
     */
    async extractImages() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (!this.imageExtractor) {
            // Try to create image extractor on demand
            try {
                const { ImageExtractionService } = await import('./ImageExtractionService.js');
                this.imageExtractor = new ImageExtractionService({
                    tabId: this.currentTab?.id
                });
                await this.imageExtractor.init();
            } catch (error) {
                console.error('Failed to create image extractor:', error);
                throw new Error('Image extractor not available');
            }
        }
        
        console.log('🖼️ Extracting images from tab:', this.currentTab?.id);
        const images = await this.imageExtractor.extract();
        this.extractedData.images = images;
        
        return images;
    }
    
    /**
     * Extract only text
     */
    async extractText() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (!this.textExtractor) {
            throw new Error('Text extractor not available');
        }
        
        console.log('📄 Extracting text from tab:', this.currentTab?.id);
        const text = await this.textExtractor.extract();
        this.extractedData.text = text;
        
        return text;
    }
    
    /**
     * Extract only tables
     */
    async extractTables() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (!this.tableExtractor) {
            throw new Error('Table extractor not available');
        }
        
        console.log('📊 Extracting tables from tab:', this.currentTab?.id);
        const tables = await this.tableExtractor.extract();
        this.extractedData.tables = tables;
        
        return tables;
    }
    
    /**
     * Update progress
     */
    updateProgress(percentage, message) {
        if (this.onProgress) {
            this.onProgress({
                percentage: percentage * 100,
                message,
                tab: this.currentTab?.title
            });
        }
    }
    
    // Getters for extracted data
    getImages() {
        return this.extractedData.images;
    }
    
    getText() {
        return this.extractedData.text;
    }
    
    getTables() {
        return this.extractedData.tables;
    }
    
    getAllData() {
        return { 
            ...this.extractedData,
            metadata: {
                extractedFrom: this.currentTab?.url,
                extractedAt: new Date().toISOString(),
                tabTitle: this.currentTab?.title
            }
        };
    }
    
    hasImages() {
        return this.extractedData.images.length > 0;
    }
    
    hasText() {
        return Object.keys(this.extractedData.text).length > 0;
    }
    
    hasTables() {
        return this.extractedData.tables.length > 0;
    }
    
    /**
     * Get extraction summary
     */
    getExtractionSummary() {
        return {
            images: {
                count: this.extractedData.images.length,
                types: this.getImageTypes(),
                withCaptions: this.extractedData.images.filter(img => img.context?.caption).length
            },
            text: {
                sections: Object.keys(this.extractedData.text).length,
                totalWords: this.getTotalWords()
            },
            tables: {
                count: this.extractedData.tables.length,
                totalRows: this.getTotalTableRows()
            },
            source: {
                url: this.currentTab?.url,
                title: this.currentTab?.title,
                tabId: this.currentTab?.id
            }
        };
    }
    
    getImageTypes() {
        const types = {};
        this.extractedData.images.forEach(image => {
            types[image.type] = (types[image.type] || 0) + 1;
        });
        return types;
    }
    
    getTotalWords() {
        return Object.values(this.extractedData.text)
            .join(' ')
            .split(/\s+/)
            .length;
    }
    
    getTotalTableRows() {
        return this.extractedData.tables.reduce((total, table) => 
            total + (table.rows?.length || 0), 0);
    }
    
    /**
     * Clear all extracted data
     */
    clearData() {
        this.extractedData = {
            images: [],
            text: {},
            tables: []
        };
    }
    
    /**
     * Get service status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isExtracting: this.isExtracting,
            hasImageExtractor: !!this.imageExtractor,
            hasTextExtractor: !!this.textExtractor,
            hasTableExtractor: !!this.tableExtractor,
            currentTab: this.currentTab ? {
                id: this.currentTab.id,
                title: this.currentTab.title,
                url: this.currentTab.url
            } : null,
            extractedCounts: {
                images: this.extractedData.images.length,
                textSections: Object.keys(this.extractedData.text).length,
                tables: this.extractedData.tables.length
            }
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.clearData();
        this.isExtracting = false;
        this.isInitialized = false;
        this.currentTab = null;
        
        // Cleanup extractors
        this.imageExtractor?.cleanup?.();
        this.textExtractor?.cleanup?.();
        this.tableExtractor?.cleanup?.();
        
        console.log('🧹 ExtractionOrchestrator cleanup completed');
    }
}
// src/content/modules/extraction/TableExtractor.js
/**
 * Table Extractor for ORKG Content Script
 * Integrates with the existing service registry system
 */

(function(global) {
  'use strict';
  
  console.log('📊 TableExtractor module loading...');
  
  // Table Extractor Class
  class TableExtractor {
    constructor() {
      this.isInitialized = false;
      this.extractedTables = [];
      this.debug = true;
    }
    
    /**
     * Initialize the table extractor
     */
    async init() {
      if (this.isInitialized) {
        console.warn('TableExtractor already initialized');
        return;
      }
      
      console.log('📊 Initializing TableExtractor...');
      this.isInitialized = true;
      console.log('✅ TableExtractor initialized');
    }
    
    /**
     * Main extraction method
     */
    async extractTables(config = {}) {
      console.log('📊 Starting table extraction...');
      this.extractedTables = [];
      
      try {
        // Strategy 1: Find all direct table elements
        const tables = document.querySelectorAll('table');
        console.log(`Found ${tables.length} <table> elements`);
        
        tables.forEach((table, index) => {
          this.extractedTables.push(this.processTableElement(table, index));
        });
        
        // Strategy 2: Find table containers by ID patterns
        const tableIdElements = document.querySelectorAll(
          '[id*="table" i], [id*="tbl" i], [id*="tab" i], ' +
          '[id^="table"], [id^="tbl"], [id^="tab"], ' +
          '[id^="Table"], [id^="Tab"]'
        );
        console.log(`Found ${tableIdElements.length} elements with table-like IDs`);
        
        tableIdElements.forEach((element, index) => {
          if (!this.isAlreadyProcessed(element)) {
            const data = this.processTableContainer(element, index);
            if (data) this.extractedTables.push(data);
          }
        });
        
        // Strategy 3: Find table containers by class
        const tableClassElements = document.querySelectorAll(
          '.table, .data-table, .c-article-table, ' +
          '[class*="table"], [class*="Table"]'
        );
        console.log(`Found ${tableClassElements.length} elements with table-like classes`);
        
        tableClassElements.forEach((element, index) => {
          if (!this.isAlreadyProcessed(element)) {
            const data = this.processTableContainer(element, index);
            if (data) this.extractedTables.push(data);
          }
        });
        
        // Strategy 4: Find figures that might contain tables
        const figures = document.querySelectorAll('figure, .figure');
        figures.forEach((figure, index) => {
          const hasTable = figure.querySelector('table');
          const hasTableCaption = (figure.textContent || '').match(/table\s+\d+/i);
          
          if ((hasTable || hasTableCaption) && !this.isAlreadyProcessed(figure)) {
            const data = this.processFigure(figure, index);
            if (data) this.extractedTables.push(data);
          }
        });
        
        // Strategy 5: Publisher-specific patterns
        this.extractPublisherSpecificTables();
        
        // Remove duplicates and sort
        this.deduplicateAndSort();
        
        // ✅ Filter only captioned tables
        this.extractedTables = this.extractedTables.filter(t => !!t.caption);

        console.log(`✅ Extracted ${this.extractedTables.length} tables with captions`);
        
        // Return in the format expected by the extension
        return {
          tables: this.extractedTables,
          count: this.extractedTables.length,
          stats: this.calculateStats()
        };
        
      } catch (error) {
        console.error('❌ Table extraction failed:', error);
        return {
          tables: [],
          count: 0,
          stats: {},
          error: error.message
        };
      }
    }
    
    /**
     * Process a table element
     */
    processTableElement(table, index) {
      const rect = table.getBoundingClientRect();
      
      return {
        id: table.id || `table_${index}`,
        type: 'table_element',
        tagName: 'TABLE',
        element: table,
        caption: this.extractCaption(table),
        headers: this.extractHeaders(table),
        rows: this.extractRows(table),
        position: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        },
        isVisible: this.isVisible(table),
        content: this.extractTableContent(table)
      };
    }
    
    /**
     * Process a table container element
     */
    processTableContainer(element, index) {
      const table = element.querySelector('table');
      const rect = element.getBoundingClientRect();
      
      const data = {
        id: element.id || `container_${index}`,
        type: 'container',
        tagName: element.tagName,
        element: element,
        caption: this.extractCaption(element),
        hasTable: !!table,
        position: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        },
        isVisible: this.isVisible(element)
      };
      
      if (table) {
        data.headers = this.extractHeaders(table);
        data.rows = this.extractRows(table);
        data.content = this.extractTableContent(table);
      }
      
      // Check for table links (common in academic papers)
      const tableLink = element.querySelector('a[href*="table"], a[href*="Table"]');
      if (tableLink) {
        data.link = tableLink.href;
      }
      
      return data;
    }
    
    /**
     * Process a figure element
     */
    processFigure(figure, index) {
      const table = figure.querySelector('table');
      const figcaption = figure.querySelector('figcaption');
      const rect = figure.getBoundingClientRect();
      
      const data = {
        id: figure.id || `figure_${index}`,
        type: 'figure',
        tagName: 'FIGURE',
        element: figure,
        caption: figcaption ? figcaption.textContent.trim() : this.extractCaption(figure),
        hasTable: !!table,
        position: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        },
        isVisible: this.isVisible(figure)
      };
      
      if (table) {
        data.headers = this.extractHeaders(table);
        data.rows = this.extractRows(table);
        data.content = this.extractTableContent(table);
      }
      
      return data;
    }
    
    /**
     * Extract publisher-specific tables
     */
    extractPublisherSpecificTables() {
      const hostname = window.location.hostname;
      
      // ScienceDirect/Elsevier
      if (hostname.includes('sciencedirect') || hostname.includes('elsevier')) {
        console.log('📚 Applying ScienceDirect/Elsevier extraction...');
        
        // Tables with IDs like tbl0010, tbl0020
        for (let i = 0; i <= 100; i += 10) {
          const id = `tbl${String(i).padStart(4, '0')}`;
          const element = document.getElementById(id);
          
          if (element && !this.isAlreadyProcessed(element)) {
            const data = this.processTableContainer(element, this.extractedTables.length);
            if (data) {
              data.publisher = 'elsevier';
              this.extractedTables.push(data);
            }
          }
        }
      }
      
      // BMC/Springer/Nature
      if (hostname.includes('biomedcentral') || hostname.includes('springer') || hostname.includes('nature')) {
        console.log('📚 Applying BMC/Springer/Nature extraction...');
        
        // Tables with IDs like Tab1, Tab2
        for (let i = 1; i <= 20; i++) {
          const id = `Tab${i}`;
          const element = document.getElementById(id);
          
          if (element && !this.isAlreadyProcessed(element)) {
            const data = this.processTableContainer(element, this.extractedTables.length);
            if (data) {
              data.publisher = 'springer';
              this.extractedTables.push(data);
            }
          }
        }
        
        // Also check for .c-article-table containers
        const containers = document.querySelectorAll('.c-article-table, [data-container-section="table"]');
        containers.forEach((container, index) => {
          if (!this.isAlreadyProcessed(container)) {
            const data = this.processTableContainer(container, this.extractedTables.length);
            if (data) {
              data.publisher = 'springer';
              this.extractedTables.push(data);
            }
          }
        });
      }
    }
    
    /**
     * Extract table headers
     */
    extractHeaders(table) {
      const headers = [];
      
      if (!table) return headers;
      
      // Try thead first
      const theadCells = table.querySelectorAll('thead th, thead td');
      if (theadCells.length > 0) {
        theadCells.forEach(cell => {
          headers.push(this.cleanText(cell.textContent));
        });
        return headers;
      }
      
      // Try first row
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const cells = firstRow.querySelectorAll('th, td');
        cells.forEach(cell => {
          headers.push(this.cleanText(cell.textContent));
        });
      }
      
      return headers;
    }
    
    /**
     * Extract table rows
     */
    extractRows(table) {
      const rows = [];
      
      if (!table) return rows;
      
      const allRows = table.querySelectorAll('tr');
      let startIndex = 0;
      
      // Skip header row if present
      const firstRow = allRows[0];
      if (firstRow && firstRow.querySelector('th')) {
        startIndex = 1;
      }
      
      for (let i = startIndex; i < allRows.length; i++) {
        const row = allRows[i];
        const rowData = [];
        
        const cells = row.querySelectorAll('td, th');
        cells.forEach(cell => {
          rowData.push(this.cleanText(cell.textContent));
        });
        
        if (rowData.length > 0) {
          rows.push(rowData);
        }
      }
      
      return rows;
    }
    
    /**
     * Extract full table content
     */
    extractTableContent(table) {
      if (!table) return null;
      
      return {
        headers: this.extractHeaders(table),
        rows: this.extractRows(table),
        html: table.outerHTML.substring(0, 500), // First 500 chars
        text: this.cleanText(table.textContent)
      };
    }
    
    /**
     * Extract caption from various sources
     */
    extractCaption(element) {
      if (!element) return null;
      
      // Direct caption element
      const caption = element.querySelector('caption');
      if (caption) return this.cleanText(caption.textContent);
      
      // Figcaption
      const figcaption = element.querySelector('figcaption');
      if (figcaption) return this.cleanText(figcaption.textContent);
      
      // Caption classes
      const captionClass = element.querySelector('.caption, .table-caption, [class*="caption"]');
      if (captionClass) return this.cleanText(captionClass.textContent);
      
      // Bold/strong with Table text
      const boldCaption = element.querySelector('b, strong');
      if (boldCaption) {
        const text = this.cleanText(boldCaption.textContent);
        if (text.match(/table\s+\d+/i)) return text;
      }
      
      // Check first line of text
      const text = this.cleanText(element.textContent);
      const firstLine = text.split('\n')[0];
      if (firstLine.match(/^table\s+\d+/i) && firstLine.length < 200) {
        return firstLine;
      }
      
      return null;
    }
    
    /**
     * Check if element is visible
     */
    isVisible(element) {
      if (!element) return false;
      
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      
      return style.display !== 'none' && 
             style.visibility !== 'hidden' &&
             rect.width > 0 && 
             rect.height > 0;
    }
    
    /**
     * Check if element was already processed
     */
    isAlreadyProcessed(element) {
      return this.extractedTables.some(table => 
        table.element === element || 
        (table.element && table.element.contains(element))
      );
    }
    
    /**
     * Remove duplicates and sort tables
     */
    deduplicateAndSort() {
      // Remove duplicates based on element reference
      const seen = new Set();
      const unique = [];
      
      this.extractedTables.forEach(table => {
        if (!seen.has(table.element)) {
          seen.add(table.element);
          unique.push(table);
        }
      });
      
      // Sort by position
      unique.sort((a, b) => {
        if (a.position && b.position) {
          return a.position.top - b.position.top;
        }
        return 0;
      });
      
      this.extractedTables = unique;
    }
    
    /**
     * Calculate statistics
     */
    calculateStats() {
      return {
        totalTables: this.extractedTables.length,
        visibleTables: this.extractedTables.filter(t => t.isVisible).length,
        hiddenTables: this.extractedTables.filter(t => !t.isVisible).length,
        tablesWithCaptions: this.extractedTables.filter(t => t.caption).length,
        actualTables: this.extractedTables.filter(t => t.type === 'table_element').length,
        containers: this.extractedTables.filter(t => t.type === 'container').length,
        figures: this.extractedTables.filter(t => t.type === 'figure').length
      };
    }
    
    /**
     * Clean text helper
     */
    cleanText(text) {
      if (!text) return '';
      return text.replace(/\s+/g, ' ').trim();
    }
    
    /**
     * Clean up
     */
    cleanup() {
      this.extractedTables = [];
      this.isInitialized = false;
      console.log('🧹 TableExtractor cleaned up');
    }
  }
  
  // Create instance
  const tableExtractor = new TableExtractor();
  
  // Register with service registry if available
  if (global.serviceRegistry && global.serviceRegistry.register) {
    console.log('📊 Registering TableExtractor with service registry...');
    global.serviceRegistry.register('tableExtractor', tableExtractor);
  } else {
    console.warn('⚠️ Service registry not found, exposing TableExtractor globally');
    global.tableExtractor = tableExtractor;
  }
  
  // Also expose class for direct use
  global.TableExtractor = TableExtractor;
  
  // Convenience function for testing
  global.testTableExtraction = async function() {
    console.log('🧪 Testing table extraction...');
    
    // Try to get from service registry first
    let extractor = null;
    
    if (global.serviceRegistry && global.serviceRegistry.get) {
      extractor = global.serviceRegistry.get('tableExtractor');
    }
    
    if (!extractor) {
      extractor = global.tableExtractor || new TableExtractor();
    }
    
    if (!extractor.isInitialized) {
      await extractor.init();
    }
    
    const result = await extractor.extractTables();
    console.log('Extraction result:', result);
    
    if (result.count > 0) {
      console.log('First table:', result.tables[0]);
    }
    
    return result;
  };
  
  console.log('✅ TableExtractor module loaded');
  console.log('Run testTableExtraction() to test');
  
})(typeof window !== 'undefined' ? window : this);
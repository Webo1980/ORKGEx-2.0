// src/content/modules/markers/TableMarker.js - Refactored
(function(global) {
    'use strict';
    
    if (typeof BaseMarker === 'undefined') {
        console.error('TableMarker requires BaseMarker to be loaded first');
        return;
    }
    
    class TableMarker extends BaseMarker {
        constructor(config = {}) {
            super(config);
            this.processedTables = new Set();
        }
        
        getType() {
            return 'table';
        }
        
        async onActivate(config) {
            const activationConfig = {
                minRows: config.minRows || this.config.minTableRows || 2,
                minColumns: config.minColumns || this.config.minTableColumns || 2,
                autoMark: config.autoMark !== false
            };
            
            let markedCount = 0;
            
            if (activationConfig.autoMark) {
                markedCount = this.markTables(activationConfig);
            }
            
            return { success: true, count: markedCount };
        }
        
        onDeactivate() {
            this.processedTables.clear();
        }
        
        markTables(config) {
            const tables = document.querySelectorAll('table');
            let count = 0;
            
            tables.forEach((table, index) => {
                if (this.shouldSkipTable(table, config)) return;
                
                const metadata = this.extractTableMetadata(table, index);
                const marker = this.createMarker(table, metadata);
                
                if (marker) {
                    this.processedTables.add(table);
                    count++;
                }
            });
            
            return count;
        }
        
        shouldSkipTable(table, config) {
            // Skip if already processed
            if (this.processedTables.has(table)) return true;
            
            // Skip extension elements
            if (this.isExtensionElement(table)) return true;
            
            // Check visibility
            if (!this.isVisible(table)) return true;
            
            // Check table size
            const rows = table.querySelectorAll('tr').length;
            const columns = this.getColumnCount(table);
            
            if (rows < config.minRows || columns < config.minColumns) return true;
            
            return false;
        }
        
        extractTableMetadata(table, index) {
            const metadata = {
                id: `table_${Date.now()}_${index}`,
                index: index + 1,
                rows: table.querySelectorAll('tr').length,
                columns: this.getColumnCount(table),
                headers: this.extractHeaders(table),
                caption: this.extractCaption(table),
                summary: this.generateSummary(table)
            };
            
            return metadata;
        }
        
        getColumnCount(table) {
            const firstRow = table.querySelector('tr');
            if (!firstRow) return 0;
            
            let count = 0;
            firstRow.querySelectorAll('td, th').forEach(cell => {
                count += parseInt(cell.getAttribute('colspan') || 1);
            });
            
            return count;
        }
        
        extractHeaders(table) {
            const headers = [];
            const headerCells = table.querySelectorAll('thead th, tr:first-child th');
            
            headerCells.forEach(cell => {
                headers.push(cell.textContent.trim());
            });
            
            // If no thead headers, check first row
            if (headers.length === 0) {
                const firstRowCells = table.querySelectorAll('tr:first-child td');
                firstRowCells.forEach(cell => {
                    headers.push(cell.textContent.trim());
                });
            }
            
            return headers;
        }
        
        extractCaption(table) {
            const caption = table.querySelector('caption');
            if (caption) {
                return caption.textContent.trim();
            }
            
            // Check for caption in surrounding elements
            const prevElement = table.previousElementSibling;
            if (prevElement && (prevElement.tagName === 'H3' || prevElement.tagName === 'H4' || 
                              prevElement.tagName === 'P' || prevElement.tagName === 'FIGCAPTION')) {
                const text = prevElement.textContent.trim();
                if (text.toLowerCase().includes('table') || text.length < 100) {
                    return text;
                }
            }
            
            return null;
        }
        
        generateSummary(table) {
            const rows = table.querySelectorAll('tr').length;
            const columns = this.getColumnCount(table);
            const hasHeaders = table.querySelector('thead') !== null || 
                              table.querySelector('th') !== null;
            
            return {
                rows: rows,
                columns: columns,
                hasHeaders: hasHeaders,
                type: this.detectTableType(table)
            };
        }
        
        detectTableType(table) {
            const text = table.textContent.toLowerCase();
            
            if (text.includes('result') || text.includes('performance')) {
                return 'results';
            }
            if (text.includes('comparison') || text.includes('versus')) {
                return 'comparison';
            }
            if (text.includes('data') || text.includes('dataset')) {
                return 'data';
            }
            if (text.includes('statistic') || text.includes('analysis')) {
                return 'statistics';
            }
            
            return 'general';
        }
        
        isVisible(element) {
            const style = window.getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden';
        }
        
        prepareDataForExtension(metadata) {
            return {
                id: metadata.id,
                type: 'table',
                rows: metadata.rows,
                columns: metadata.columns,
                headers: metadata.headers,
                caption: metadata.caption,
                summary: metadata.summary
            };
        }
        
        // RAG-specific method
        createMarkersForRAGTables(tables) {
            let createdCount = 0;
            
            tables.forEach((tableData) => {
                const element = this.findTableElement(tableData);
                
                if (element && !this.processedTables.has(element)) {
                    const metadata = {
                        id: tableData.id || this.generateMarkerId(),
                        ...tableData,
                        fromRAG: true
                    };
                    
                    const marker = this.createMarker(element, metadata);
                    if (marker) {
                        this.processedTables.add(element);
                        createdCount++;
                    }
                }
            });
            
            return createdCount;
        }
        
        findTableElement(tableData) {
            if (tableData.selector) {
                return document.querySelector(tableData.selector);
            }
            
            if (tableData.index !== undefined) {
                const tables = document.querySelectorAll('table');
                return tables[tableData.index];
            }
            
            return null;
        }
    }
    
    // Export to global scope
    global.TableMarker = TableMarker;
    
})(typeof window !== 'undefined' ? window : this);
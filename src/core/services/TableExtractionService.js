// ================================
// src/core/services/TableExtractionService.js
// Pure table extraction logic - NO UI concerns
// ================================

export class TableExtractionService {
    constructor(config = {}) {
        this.config = {
            minRows: 2,
            minColumns: 2,
            maxRows: 100,
            maxColumns: 20,
            includeHeaders: true,
            parseNumbers: true,
            ...config
        };
    }
    
    async init() {
        console.log('📊 TableExtractionService initialized');
    }
    
    async extractAll(context = document) {
        const tables = [];
        
        try {
            const tableElements = context.querySelectorAll('table');
            
            for (const table of tableElements) {
                const extracted = await this.extractTable(table);
                if (extracted && this.isValidTable(extracted)) {
                    tables.push(extracted);
                }
            }
            
            return tables;
            
        } catch (error) {
            console.error('Table extraction failed:', error);
            return [];
        }
    }
    
    async extractTable(table) {
        try {
            const data = {
                element: table,
                headers: [],
                rows: [],
                metadata: this.extractTableMetadata(table),
                summary: null
            };
            
            // Extract headers
            if (this.config.includeHeaders) {
                data.headers = this.extractHeaders(table);
            }
            
            // Extract rows
            data.rows = this.extractRows(table);
            
            // Generate summary
            data.summary = this.generateTableSummary(data);
            
            // Parse data types if configured
            if (this.config.parseNumbers) {
                data.rows = this.parseDataTypes(data.rows);
            }
            
            return data;
            
        } catch (error) {
            console.error('Failed to extract table:', error);
            return null;
        }
    }
    
    extractHeaders(table) {
        const headers = [];
        
        // Try thead first
        const thead = table.querySelector('thead');
        if (thead) {
            const headerRow = thead.querySelector('tr');
            if (headerRow) {
                const cells = headerRow.querySelectorAll('th, td');
                cells.forEach(cell => {
                    headers.push(this.extractCellText(cell));
                });
            }
        }
        
        // Fallback to first row
        if (headers.length === 0) {
            const firstRow = table.querySelector('tr');
            if (firstRow) {
                const cells = firstRow.querySelectorAll('th, td');
                cells.forEach(cell => {
                    headers.push(this.extractCellText(cell));
                });
            }
        }
        
        return headers;
    }
    
    extractRows(table) {
        const rows = [];
        const tbody = table.querySelector('tbody') || table;
        const rowElements = tbody.querySelectorAll('tr');
        
        rowElements.forEach((row, index) => {
            // Skip header row if in tbody
            if (index === 0 && this.isHeaderRow(row)) {
                return;
            }
            
            const cells = [];
            row.querySelectorAll('td, th').forEach(cell => {
                cells.push(this.extractCellText(cell));
            });
            
            if (cells.length > 0) {
                rows.push(cells);
            }
        });
        
        return rows;
    }
    
    extractCellText(cell) {
        // Clone to avoid modifying original
        const clone = cell.cloneNode(true);
        
        // Remove scripts and styles
        clone.querySelectorAll('script, style').forEach(el => el.remove());
        
        // Get text content
        let text = clone.textContent || '';
        
        // Clean whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }
    
    isHeaderRow(row) {
        const cells = row.querySelectorAll('th');
        const totalCells = row.querySelectorAll('th, td').length;
        return cells.length === totalCells && totalCells > 0;
    }
    
    extractTableMetadata(table) {
        const caption = table.querySelector('caption');
        const summary = table.getAttribute('summary');
        const title = this.findTableTitle(table);
        
        return {
            caption: caption ? caption.textContent.trim() : null,
            summary: summary,
            title: title,
            rowCount: table.querySelectorAll('tr').length,
            columnCount: this.getColumnCount(table),
            hasHeaders: !!table.querySelector('thead'),
            position: this.getTablePosition(table),
            className: table.className,
            id: table.id
        };
    }
    
    findTableTitle(table) {
        // Look for heading before table
        let prev = table.previousElementSibling;
        while (prev && prev.nodeType === 1) {
            if (/^h[1-6]$/i.test(prev.tagName)) {
                return prev.textContent.trim();
            }
            if (prev.querySelector('h1, h2, h3, h4, h5, h6')) {
                const heading = prev.querySelector('h1, h2, h3, h4, h5, h6');
                return heading.textContent.trim();
            }
            prev = prev.previousElementSibling;
        }
        return null;
    }
    
    getColumnCount(table) {
        const firstRow = table.querySelector('tr');
        if (!firstRow) return 0;
        
        let count = 0;
        firstRow.querySelectorAll('td, th').forEach(cell => {
            const colspan = parseInt(cell.getAttribute('colspan') || 1);
            count += colspan;
        });
        
        return count;
    }
    
    getTablePosition(table) {
        const rect = table.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height
        };
    }
    
    isValidTable(tableData) {
        if (!tableData) return false;
        
        const rowCount = tableData.rows.length;
        const columnCount = tableData.metadata.columnCount;
        
        // Check size constraints
        if (rowCount < this.config.minRows || rowCount > this.config.maxRows) {
            return false;
        }
        
        if (columnCount < this.config.minColumns || columnCount > this.config.maxColumns) {
            return false;
        }
        
        // Check if table has actual content
        const hasContent = tableData.rows.some(row => 
            row.some(cell => cell && cell.length > 0)
        );
        
        return hasContent;
    }
    
    parseDataTypes(rows) {
        return rows.map(row => 
            row.map(cell => {
                // Try to parse as number
                if (this.config.parseNumbers && /^-?\d+\.?\d*$/.test(cell)) {
                    return parseFloat(cell);
                }
                
                // Try to parse as date
                const date = Date.parse(cell);
                if (!isNaN(date) && cell.includes('/') || cell.includes('-')) {
                    return new Date(date);
                }
                
                // Return as string
                return cell;
            })
        );
    }
    
    generateTableSummary(tableData) {
        const { headers, rows, metadata } = tableData;
        
        const summary = {
            title: metadata.title || metadata.caption,
            dimensions: `${rows.length} rows × ${metadata.columnCount} columns`,
            headers: headers.length > 0 ? headers : null,
            dataTypes: this.inferDataTypes(rows),
            statistics: null
        };
        
        // Calculate basic statistics for numeric columns
        if (this.config.parseNumbers) {
            summary.statistics = this.calculateStatistics(rows, headers);
        }
        
        return summary;
    }
    
    inferDataTypes(rows) {
        if (rows.length === 0) return [];
        
        const columnCount = rows[0].length;
        const types = [];
        
        for (let col = 0; col < columnCount; col++) {
            const values = rows.map(row => row[col]).filter(v => v !== null && v !== '');
            
            if (values.every(v => typeof v === 'number')) {
                types.push('number');
            } else if (values.every(v => v instanceof Date)) {
                types.push('date');
            } else {
                types.push('string');
            }
        }
        
        return types;
    }
    
    calculateStatistics(rows, headers) {
        const stats = {};
        const columnCount = rows[0]?.length || 0;
        
        for (let col = 0; col < columnCount; col++) {
            const values = rows.map(row => row[col]).filter(v => typeof v === 'number');
            
            if (values.length > 0) {
                const columnName = headers[col] || `Column ${col + 1}`;
                stats[columnName] = {
                    min: Math.min(...values),
                    max: Math.max(...values),
                    avg: values.reduce((a, b) => a + b, 0) / values.length,
                    count: values.length
                };
            }
        }
        
        return Object.keys(stats).length > 0 ? stats : null;
    }
}
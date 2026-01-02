// ================================
// src/core/content/analyzers/TableAnalyzer.js
// ================================

export class TableAnalyzer {
    constructor(config) {
        this.services = config.services;
        this.onComplete = config.onComplete;
        this.onError = config.onError;
        this.onProgress = config.onProgress;
        
        this.isInitialized = false;
        this.isAnalyzing = false;
        
        // Analysis results
        this.results = [];
        
        // Table extraction options
        this.extractionOptions = [
            { id: 'headers', label: 'Extract column headers', default: true },
            { id: 'captions', label: 'Extract table captions', default: true },
            { id: 'formatting', label: 'Preserve cell formatting', default: true },
            { id: 'units', label: 'Detect measurement units', default: false },
            { id: 'footnotes', label: 'Extract table footnotes', default: true },
            { id: 'merge-cells', label: 'Handle merged cells', default: true }
        ];
        
        // Progress tracking
        this.progress = {
            current: 0,
            total: 0,
            message: ''
        };
        
        // Table processing state
        this.processedTables = new Map();
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('📊 Initializing TableAnalyzer...');
            this.isInitialized = true;
            console.log('✅ TableAnalyzer initialized');
        } catch (error) {
            console.error('❌ TableAnalyzer initialization failed:', error);
            throw error;
        }
    }
    
    render() {
        const hasResults = this.results.length > 0;
        
        return `
            <div class="tab-content table-analysis-tab">
                <div class="tab-header">
                    <h3>
                        <i class="fas fa-table"></i>
                        Table Analysis
                    </h3>
                    <p>Extract and analyze data tables from the paper</p>
                </div>
                
                ${!hasResults ? this.renderControls() : this.renderResults()}
                ${this.renderProgress()}
            </div>
        `;
    }
    
    renderControls() {
        return `
            <div class="analysis-controls">
                <div class="table-options">
                    <h4>Table Extraction Options</h4>
                    <div class="options-list">
                        ${this.extractionOptions.map(option => `
                            <label class="option-item">
                                <input type="checkbox" 
                                       id="extract-${option.id}" 
                                       data-option="${option.id}"
                                       ${option.default ? 'checked' : ''}>
                                <span>${option.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div class="table-detection-info">
                    <div class="info-card">
                        <i class="fas fa-info-circle"></i>
                        <div class="info-content">
                            <p><strong>Supported table formats:</strong></p>
                            <ul>
                                <li>HTML tables (&lt;table&gt; elements)</li>
                                <li>CSS-based tables (display: table)</li>
                                <li>Grid layouts that represent tabular data</li>
                                <li>Tables within figures (when possible)</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <div class="analysis-buttons">
                    <button class="btn btn-primary" id="start-table-analysis">
                        <i class="fas fa-play"></i>
                        <span>Start Table Analysis</span>
                    </button>
                    <button class="btn btn-secondary" id="manual-table-entry">
                        <i class="fas fa-plus"></i>
                        <span>Add Table Manually</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderResults() {
        return `
            <div class="analysis-results table-results">
                <div class="results-header">
                    <h4>Found ${this.results.length} Tables</h4>
                    <div class="results-actions">
                        <button class="btn btn-sm btn-outline" id="export-all-tables">
                            <i class="fas fa-file-csv"></i>
                            Export All
                        </button>
                        <button class="btn btn-sm btn-outline" id="reanalyze-tables">
                            <i class="fas fa-redo"></i>
                            Re-extract
                        </button>
                    </div>
                </div>
                
                ${this.renderTableStats()}
                
                <div class="tables-list">
                    ${this.results.map((table, index) => this.renderTableCard(table, index)).join('')}
                </div>
            </div>
        `;
    }
    
    renderTableStats() {
        const totalRows = this.results.reduce((sum, table) => sum + (table.data?.length || 0), 0);
        const totalColumns = this.results.reduce((max, table) => 
            Math.max(max, table.headers?.length || 0), 0);
        
        return `
            <div class="table-stats">
                <span class="stat-item">
                    <i class="fas fa-table"></i>
                    ${this.results.length} tables
                </span>
                <span class="stat-item">
                    <i class="fas fa-bars"></i>
                    ${totalRows} total rows
                </span>
                <span class="stat-item">
                    <i class="fas fa-columns"></i>
                    Max ${totalColumns} columns
                </span>
            </div>
        `;
    }
    
    renderTableCard(table, index) {
        return `
            <div class="table-card" data-table-id="${table.id || index}">
                <div class="table-header">
                    <h6>${table.label || `Table ${index + 1}`}</h6>
                    ${table.caption ? `<p class="table-caption">${this.escapeHtml(table.caption)}</p>` : ''}
                    <div class="table-meta">
                        <span class="meta-item">
                            <i class="fas fa-bars"></i>
                            ${table.data?.length || 0} rows
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-columns"></i>
                            ${table.headers?.length || table.data?.[0]?.length || 0} columns
                        </span>
                    </div>
                </div>
                
                <div class="table-preview">
                    ${this.renderTablePreview(table)}
                </div>
                
                <div class="table-actions">
                    <button class="btn btn-sm" title="View full table" data-action="view" data-table-id="${table.id}">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="btn btn-sm" title="Edit table" data-action="edit" data-table-id="${table.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm" title="Export as CSV" data-action="export" data-table-id="${table.id}">
                        <i class="fas fa-file-csv"></i>
                    </button>
                    <button class="btn btn-sm" title="Copy to clipboard" data-action="copy" data-table-id="${table.id}">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn btn-sm" title="Remove" data-action="remove" data-table-id="${table.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderTablePreview(table) {
        if (!table.data || table.data.length === 0) {
            return '<div class="table-empty">No data available</div>';
        }
        
        const maxRows = 5;
        const hasMore = table.data.length > maxRows;
        const previewData = table.data.slice(0, maxRows);
        
        return `
            <div class="table-wrapper">
                <table class="table-preview-content">
                    ${table.headers && table.headers.length > 0 ? `
                        <thead>
                            <tr>
                                ${table.headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('')}
                            </tr>
                        </thead>
                    ` : ''}
                    <tbody>
                        ${previewData.map(row => `
                            <tr>
                                ${Array.isArray(row) ? 
                                    row.map(cell => `<td>${this.escapeHtml(this.formatCell(cell))}</td>`).join('') :
                                    `<td colspan="${table.headers?.length || 1}">${this.escapeHtml(row)}</td>`
                                }
                            </tr>
                        `).join('')}
                        ${hasMore ? `
                            <tr class="more-rows">
                                <td colspan="${table.headers?.length || table.data[0]?.length || 1}">
                                    <i class="fas fa-ellipsis-h"></i>
                                    ${table.data.length - maxRows} more rows
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderProgress() {
        if (!this.isAnalyzing) return '';
        
        const percentage = this.progress.total > 0 
            ? (this.progress.current / this.progress.total) * 100 
            : 0;
        
        return `
            <div class="analysis-progress" id="table-progress">
                <div class="progress-header">
                    <span class="progress-label">${this.progress.message}</span>
                    <span class="progress-percentage">${Math.round(percentage)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="progress-status">
                    Processing table ${this.progress.current} of ${this.progress.total}
                </div>
            </div>
        `;
    }
    
    attachEventHandlers(container) {
        // Start analysis button
        const startBtn = container.querySelector('#start-table-analysis');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startAnalysis());
        }
        
        // Manual entry button
        const manualBtn = container.querySelector('#manual-table-entry');
        if (manualBtn) {
            manualBtn.addEventListener('click', () => this.startManualEntry());
        }
        
        // Re-analyze button
        const reanalyzeBtn = container.querySelector('#reanalyze-tables');
        if (reanalyzeBtn) {
            reanalyzeBtn.addEventListener('click', () => this.reanalyze());
        }
        
        // Export all button
        const exportAllBtn = container.querySelector('#export-all-tables');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => this.exportAllTables());
        }
        
        // Table card actions
        container.querySelectorAll('.table-actions button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                const tableId = e.currentTarget.dataset.tableId;
                this.handleTableAction(action, tableId);
            });
        });
    }
    
    async startAnalysis() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        const options = this.getSelectedOptions();
        
        try {
            this.updateProgress(0, 1, 'Scanning for tables...');
            
            const tables = await this.findAllTables();
            this.updateProgress(0, tables.length, 'Processing tables...');
            
            const results = await this.processTables(tables, options);
            
            this.results = results;
            this.isAnalyzing = false;
            
            // Notify parent
            if (this.onComplete) {
                this.onComplete('tables', results);
            }
            
        } catch (error) {
            this.isAnalyzing = false;
            console.error('Table analysis failed:', error);
            
            if (this.onError) {
                this.onError('tables', error);
            }
        }
    }
    
    async findAllTables() {
        const tables = [];
        
        // Find HTML tables
        const htmlTables = document.querySelectorAll('table');
        htmlTables.forEach(table => {
            if (this.isValidTable(table)) {
                tables.push({ element: table, type: 'html' });
            }
        });
        
        // Find CSS tables (display: table)
        const cssTables = document.querySelectorAll('[style*="display: table"], [style*="display:table"]');
        cssTables.forEach(element => {
            if (!element.tagName === 'TABLE') {
                tables.push({ element, type: 'css' });
            }
        });
        
        // Find grid-based tables (common in modern layouts)
        const gridTables = this.findGridTables();
        tables.push(...gridTables);
        
        return tables;
    }
    
    findGridTables() {
        const gridTables = [];
        
        // Look for common grid table patterns
        const gridSelectors = [
            '.data-table',
            '.grid-table',
            '[role="table"]',
            '.table-container table',
            '.results-table'
        ];
        
        gridSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element.tagName !== 'TABLE' && this.looksLikeTable(element)) {
                    gridTables.push({ element, type: 'grid' });
                }
            });
        });
        
        return gridTables;
    }
    
    isValidTable(table) {
        // Check if table has meaningful content
        const rows = table.querySelectorAll('tr');
        const cells = table.querySelectorAll('td, th');
        
        // Skip if too small or empty
        if (rows.length === 0 || cells.length === 0) {
            return false;
        }
        
        // Skip if it's likely a layout table
        if (this.isLayoutTable(table)) {
            return false;
        }
        
        return true;
    }
    
    isLayoutTable(table) {
        // Heuristics to detect layout tables
        const hasHeaders = table.querySelector('thead, th');
        const hasBorder = window.getComputedStyle(table).border !== 'none';
        const hasCaption = table.querySelector('caption');
        
        // If no headers, borders, or caption, likely a layout table
        if (!hasHeaders && !hasBorder && !hasCaption) {
            // Check if it contains non-tabular content
            const hasNonTabularContent = table.querySelector('nav, header, footer, aside');
            if (hasNonTabularContent) {
                return true;
            }
        }
        
        return false;
    }
    
    looksLikeTable(element) {
        // Check if element structure resembles a table
        const rows = element.querySelectorAll('[role="row"], .row, .table-row');
        const cells = element.querySelectorAll('[role="cell"], .cell, .table-cell');
        
        return rows.length > 1 || cells.length > 4;
    }
    
    async processTables(tables, options) {
        const results = [];
        
        for (let i = 0; i < tables.length; i++) {
            const { element, type } = tables[i];
            this.updateProgress(i + 1, tables.length, `Processing table ${i + 1}...`);
            
            const tableData = await this.extractTableData(element, type, options, i);
            if (tableData) {
                results.push(tableData);
                this.processedTables.set(tableData.id, tableData);
            }
            
            // Small delay for UI updates
            await this.delay(50);
        }
        
        return results;
    }
    
    async extractTableData(element, type, options, index) {
        const id = `table_${index}_${Date.now()}`;
        
        let data = {
            id: id,
            type: type,
            label: '',
            caption: '',
            headers: [],
            data: [],
            footnotes: [],
            metadata: {}
        };
        
        // Extract based on table type
        switch (type) {
            case 'html':
                data = this.extractHTMLTable(element, data, options);
                break;
            case 'css':
                data = this.extractCSSTable(element, data, options);
                break;
            case 'grid':
                data = this.extractGridTable(element, data, options);
                break;
        }
        
        // Extract caption and label
        if (options.captions) {
            data.caption = this.extractTableCaption(element);
            data.label = this.extractTableLabel(element, index);
        }
        
        // Extract footnotes
        if (options.footnotes) {
            data.footnotes = this.extractTableFootnotes(element);
        }
        
        // Detect units if requested
        if (options.units) {
            data.units = this.detectUnits(data);
        }
        
        return data;
    }
    
    extractHTMLTable(table, data, options) {
        // Extract headers
        if (options.headers) {
            const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th');
            data.headers = Array.from(headerCells).map(cell => this.extractCellContent(cell));
        }
        
        // Extract data rows
        const rows = table.querySelectorAll('tbody tr, tr');
        data.data = [];
        
        rows.forEach(row => {
            // Skip header rows
            if (row.querySelector('th') && !row.querySelector('td')) {
                return;
            }
            
            const cells = row.querySelectorAll('td, th');
            const rowData = Array.from(cells).map(cell => {
                if (options.formatting) {
                    return this.extractFormattedCell(cell);
                } else {
                    return this.extractCellContent(cell);
                }
            });
            
            if (rowData.length > 0 && rowData.some(cell => cell.trim() !== '')) {
                data.data.push(rowData);
            }
        });
        
        return data;
    }
    
    extractCSSTable(element, data, options) {
        // Handle CSS-based table layouts
        const rows = element.querySelectorAll('[style*="display: table-row"]');
        
        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('[style*="display: table-cell"]');
            const rowData = Array.from(cells).map(cell => this.extractCellContent(cell));
            
            if (index === 0 && options.headers) {
                data.headers = rowData;
            } else {
                data.data.push(rowData);
            }
        });
        
        return data;
    }
    
    extractGridTable(element, data, options) {
        // Handle grid-based layouts
        const rows = element.querySelectorAll('[role="row"], .row, .table-row');
        
        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('[role="cell"], .cell, .table-cell, td, th');
            const rowData = Array.from(cells).map(cell => this.extractCellContent(cell));
            
            if (index === 0 && options.headers) {
                data.headers = rowData;
            } else if (rowData.length > 0) {
                data.data.push(rowData);
            }
        });
        
        return data;
    }
    
    extractCellContent(cell) {
        // Get text content, handling various formats
        let content = cell.textContent || cell.innerText || '';
        
        // Clean up whitespace
        content = content.replace(/\s+/g, ' ').trim();
        
        // Handle special cases
        if (cell.querySelector('input')) {
            const input = cell.querySelector('input');
            content = input.value || input.placeholder || content;
        }
        
        if (cell.querySelector('select')) {
            const select = cell.querySelector('select');
            content = select.options[select.selectedIndex]?.text || content;
        }
        
        return content;
    }
    
    extractFormattedCell(cell) {
        const formatted = {
            text: this.extractCellContent(cell),
            bold: !!cell.querySelector('strong, b'),
            italic: !!cell.querySelector('em, i'),
            colspan: cell.colSpan || 1,
            rowspan: cell.rowSpan || 1,
            align: window.getComputedStyle(cell).textAlign
        };
        
        return formatted;
    }
    
    extractTableCaption(element) {
        // Try multiple strategies to find caption
        const strategies = [
            () => element.querySelector('caption')?.textContent,
            () => element.previousElementSibling?.textContent,
            () => {
                const parent = element.parentElement;
                const caption = parent?.querySelector('.table-caption, .caption');
                return caption?.textContent;
            },
            () => element.getAttribute('aria-label'),
            () => element.title
        ];
        
        for (const strategy of strategies) {
            const caption = strategy();
            if (caption && caption.trim()) {
                return caption.trim();
            }
        }
        
        return '';
    }
    
    extractTableLabel(element, index) {
        const caption = this.extractTableCaption(element);
        
        // Look for table numbering in caption
        const labelPattern = /^(Table|Tbl\.?)\s+(\d+[a-z]?)/i;
        const match = caption.match(labelPattern);
        
        if (match) {
            return match[0];
        }
        
        return `Table ${index + 1}`;
    }
    
    extractTableFootnotes(element) {
        const footnotes = [];
        
        // Look for footnotes in various locations
        const footnotesElements = element.querySelectorAll(
            'tfoot, .table-footnotes, .footnotes, sup, .note'
        );
        
        footnotesElements.forEach(el => {
            const text = el.textContent.trim();
            if (text && text.length < 500) {
                footnotes.push(text);
            }
        });
        
        return footnotes;
    }
    
    detectUnits(tableData) {
        const units = {};
        const unitPatterns = [
            /\b(mg|g|kg|ml|l|mm|cm|m|km|°C|°F|K|%|ppm|mol|M)\b/gi,
            /\b(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/gi,
            /\b(USD|EUR|GBP|JPY|\$|€|£|¥)\b/gi
        ];
        
        // Check headers for units
        tableData.headers.forEach((header, index) => {
            unitPatterns.forEach(pattern => {
                const match = header.match(pattern);
                if (match) {
                    units[`column_${index}`] = match[0];
                }
            });
        });
        
        return units;
    }
    
    handleTableAction(action, tableId) {
        const table = this.results.find(t => t.id === tableId);
        if (!table) return;
        
        switch (action) {
            case 'view':
                this.viewFullTable(table);
                break;
            case 'edit':
                this.editTable(table);
                break;
            case 'export':
                this.exportTableAsCSV(table);
                break;
            case 'copy':
                this.copyTableToClipboard(table);
                break;
            case 'remove':
                this.removeTable(tableId);
                break;
        }
    }
    
    viewFullTable(table) {
        // Implementation for viewing full table in modal
        console.log('View full table:', table);
        // Would open a modal with the full table
    }
    
    editTable(table) {
        // Implementation for editing table
        console.log('Edit table:', table);
        // Would open an editor interface
    }
    
    exportTableAsCSV(table) {
        const csv = this.convertTableToCSV(table);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${table.label.replace(/\s+/g, '_')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        if (this.services?.toastManager) {
            this.services.toastManager.success('Table exported as CSV');
        }
    }
    
    convertTableToCSV(table) {
        const rows = [];
        
        // Add headers
        if (table.headers && table.headers.length > 0) {
            rows.push(table.headers.map(h => this.escapeCSV(h)).join(','));
        }
        
        // Add data rows
        table.data.forEach(row => {
            if (Array.isArray(row)) {
                rows.push(row.map(cell => {
                    // Handle formatted cells
                    if (typeof cell === 'object' && cell.text) {
                        return this.escapeCSV(cell.text);
                    }
                    return this.escapeCSV(cell);
                }).join(','));
            }
        });
        
        return rows.join('\n');
    }
    
    escapeCSV(value) {
        if (value == null) return '';
        
        value = String(value);
        
        // Escape quotes
        if (value.includes('"')) {
            value = value.replace(/"/g, '""');
        }
        
        // Quote if contains comma, newline, or quotes
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value}"`;
        }
        
        return value;
    }
    
    async copyTableToClipboard(table) {
        const csv = this.convertTableToCSV(table);
        
        try {
            await navigator.clipboard.writeText(csv);
            
            if (this.services?.toastManager) {
                this.services.toastManager.success('Table copied to clipboard');
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            
            if (this.services?.toastManager) {
                this.services.toastManager.error('Failed to copy table');
            }
        }
    }
    
    removeTable(tableId) {
        this.results = this.results.filter(t => t.id !== tableId);
        this.processedTables.delete(tableId);
        
        // Notify parent to re-render
        if (this.onComplete) {
            this.onComplete('tables', this.results);
        }
    }
    
    exportAllTables() {
        if (this.results.length === 0) {
            if (this.services?.toastManager) {
                this.services.toastManager.warning('No tables to export');
            }
            return;
        }
        
        // Create a zip file or combined CSV
        const allCSV = this.results.map((table, index) => {
            const csv = this.convertTableToCSV(table);
            return `\n=== ${table.label} ===\n${table.caption || ''}\n\n${csv}`;
        }).join('\n\n');
        
        const blob = new Blob([allCSV], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `all_tables_${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        if (this.services?.toastManager) {
            this.services.toastManager.success(`Exported ${this.results.length} tables`);
        }
    }
    
    startManualEntry() {
        // Implementation for manual table entry
        console.log('Manual table entry interface would open here');
        // Would open a table editor interface
    }
    
    reanalyze() {
        this.clearResults();
        // Start new analysis
        this.startAnalysis();
    }
    
    getSelectedOptions() {
        const options = {};
        
        this.extractionOptions.forEach(option => {
            const checkbox = document.querySelector(`#extract-${option.id}`);
            options[option.id] = checkbox ? checkbox.checked : option.default;
        });
        
        return options;
    }
    
    updateProgress(current, total, message) {
        this.progress = { current, total, message };
        
        if (this.onProgress) {
            this.onProgress('tables', {
                percentage: total > 0 ? (current / total) * 100 : 0,
                message: message
            });
        }
    }
    
    formatCell(value) {
        if (value == null) return '-';
        if (typeof value === 'object' && value.text) {
            return value.text;
        }
        return String(value);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Public API
    setResults(results) {
        this.results = results || [];
        results.forEach(table => {
            if (table.id) {
                this.processedTables.set(table.id, table);
            }
        });
    }
    
    clearResults() {
        this.results = [];
        this.processedTables.clear();
    }
    
    getResults() {
        return this.results;
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isAnalyzing: this.isAnalyzing,
            hasResults: this.results.length > 0,
            resultCount: this.results.length,
            totalRows: this.results.reduce((sum, t) => sum + (t.data?.length || 0), 0)
        };
    }
    
    reset() {
        this.clearResults();
        this.isAnalyzing = false;
        this.progress = { current: 0, total: 0, message: '' };
    }
    
    cleanup() {
        this.reset();
        this.isInitialized = false;
        console.log('🧹 TableAnalyzer cleanup completed');
    }
}
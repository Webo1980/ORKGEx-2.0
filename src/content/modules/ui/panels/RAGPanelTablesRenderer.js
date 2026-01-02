// src/content/modules/ui/panels/RAGPanelTablesRenderer.js
(function(global) {
    'use strict';
    
    class RAGPanelTablesRenderer {
        constructor(config = {}) {
            this.config = {
                showSummary: true,
                enablePreview: true,
                enableExport: true,
                enableJumpTo: true,
                ...config
            };
            
            this.selectedTables = new Set();
        }
        
        render(tables, panelElement) {
            if (!panelElement) return 0;
            
            const content = panelElement.querySelector('.panel-content');
            if (!content) return 0;
            
            content.innerHTML = '';
            
            if (!tables || tables.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <svg class="orkg-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
                        </svg>
                        <p>No tables found</p>
                    </div>
                `;
                return 0;
            }
            
            // Create table list
            const list = this.createTableList(tables);
            content.appendChild(list);
            
            // Add summary
            if (this.config.showSummary) {
                const summary = this.createTablesSummary(tables);
                content.appendChild(summary);
            }
            
            // Setup event handlers
            this.setupEventHandlers(content);
            
            return tables.length;
        }
        
        createTableList(tables) {
            const list = document.createElement('div');
            list.className = 'table-list';
            
            tables.forEach((table, index) => {
                const item = this.createTableItem(table, index);
                list.appendChild(item);
            });
            
            return list;
        }
        
        createTableItem(table, index) {
            const itemId = table.id || `table_${Date.now()}_${index}`;
            const caption = table.caption || table.title || `Table ${index + 1}`;
            const rows = table.summary?.rows || table.rows || 0;
            const cols = table.summary?.columns || table.columns || 0;
            
            const item = document.createElement('div');
            item.className = 'table-item';
            item.dataset.id = itemId;
            
            // Build HTML - Only show dimensions, no table data
            let html = `
                <div class="table-header">
                    <svg class="orkg-icon table-icon" width="20" height="20" viewBox="0 0 24 24" 
                         fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"></path>
                    </svg>
                    <span class="table-number">${this.escapeHtml(caption)}</span>
                    <span class="table-size">${rows}×${cols}</span>
                </div>
            `;
            
            // Add description if available (but no data)
            if (table.summary?.description || (table.caption && table.caption !== caption)) {
                html += `
                    <div class="table-caption">
                        ${this.escapeHtml(table.summary?.description || table.caption)}
                    </div>
                `;
            }
            
            // Do NOT show headers or any data, just dimensions
            
            // Add actions
            html += `
                <div class="table-actions">
                    ${this.config.enablePreview ? `
                        <button class="preview-btn" data-id="${itemId}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Preview
                        </button>
                    ` : ''}
                    ${this.config.enableJumpTo ? `
                        <button class="jump-btn" data-id="${itemId}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            Jump to
                        </button>
                    ` : ''}
                    ${this.config.enableExport ? `
                        <button class="export-btn" data-id="${itemId}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Export
                        </button>
                    ` : ''}
                </div>
            `;
            
            item.innerHTML = html;
            
            // Store minimal data for operations
            item.dataset.caption = caption;
            item.dataset.rows = rows;
            item.dataset.cols = cols;
            
            // Store reference to actual table element if provided
            if (table.element) {
                item._tableElement = table.element;
            }
            
            return item;
        }
        
        createTablesSummary(tables) {
            const summary = document.createElement('div');
            summary.className = 'tables-summary';
            
            // Calculate statistics
            let totalRows = 0;
            let totalCols = 0;
            let totalCells = 0;
            const types = new Map();
            
            tables.forEach(table => {
                const rows = table.summary?.rows || table.rows || 0;
                const cols = table.summary?.columns || table.columns || 0;
                totalRows += rows;
                totalCols += cols;
                totalCells += rows * cols;
                
                if (table.type) {
                    types.set(table.type, (types.get(table.type) || 0) + 1);
                }
            });
            
            const avgRows = tables.length > 0 ? Math.round(totalRows / tables.length) : 0;
            const avgCols = tables.length > 0 ? Math.round(totalCols / tables.length) : 0;
            
            summary.innerHTML = `
                <div class="summary-title">Summary</div>
                <div class="summary-grid">
                    <div class="summary-stat">
                        <span class="stat-label">Total Tables</span>
                        <span class="stat-value stat-value-primary">${tables.length}</span>
                    </div>
                    <div class="summary-stat">
                        <span class="stat-label">Avg Size</span>
                        <span class="stat-value stat-value-secondary">${avgRows} × ${avgCols}</span>
                    </div>
                    <div class="summary-stat">
                        <span class="stat-label">Total Cells</span>
                        <span class="stat-value stat-value-info">${totalCells.toLocaleString()}</span>
                    </div>
                    ${types.size > 0 ? `
                        <div class="summary-stat">
                            <span class="stat-label">Types</span>
                            <span class="stat-value">${types.size}</span>
                        </div>
                    ` : ''}
                </div>
                ${this.config.enableExport ? `
                    <button class="export-all-tables-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export All Tables Info
                    </button>
                ` : ''}
            `;
            
            return summary;
        }
        
        setupEventHandlers(container) {
            container.addEventListener('click', (e) => {
                // Table item click for selection
                const tableItem = e.target.closest('.table-item');
                if (tableItem && !e.target.closest('button')) {
                    this.handleTableSelect(tableItem);
                }
                
                // Preview button
                const previewBtn = e.target.closest('.preview-btn');
                if (previewBtn) {
                    e.stopPropagation();
                    const item = previewBtn.closest('.table-item');
                    this.handlePreview(item);
                }
                
                // Jump button
                const jumpBtn = e.target.closest('.jump-btn');
                if (jumpBtn) {
                    e.stopPropagation();
                    const item = jumpBtn.closest('.table-item');
                    this.handleJumpTo(item);
                }
                
                // Export button
                const exportBtn = e.target.closest('.export-btn');
                if (exportBtn) {
                    e.stopPropagation();
                    const item = exportBtn.closest('.table-item');
                    this.handleExportTable(item);
                }
                
                // Export all button
                const exportAllBtn = e.target.closest('.export-all-tables-btn');
                if (exportAllBtn) {
                    this.handleExportAll(container);
                }
            });
        }
        
        handleTableSelect(item) {
            const id = item.dataset.id;
            
            item.classList.toggle('selected');
            
            if (item.classList.contains('selected')) {
                this.selectedTables.add(id);
            } else {
                this.selectedTables.delete(id);
            }
        }
        
        handlePreview(item) {
            const caption = item.dataset.caption;
            const rows = parseInt(item.dataset.rows) || 0;
            const cols = parseInt(item.dataset.cols) || 0;
            
            // Try to get the actual table HTML
            let tableHtml = '';
            
            // If table element was stored
            if (item._tableElement) {
                tableHtml = item._tableElement.outerHTML;
            } else {
                // Try to find the table in the document
                const tables = document.querySelectorAll('table');
                for (const table of tables) {
                    const tableCaption = table.querySelector('caption');
                    if (tableCaption && tableCaption.textContent.includes(caption)) {
                        tableHtml = table.outerHTML;
                        break;
                    }
                }
            }
            
            // Create preview modal
            const modal = this.createPreviewModal(caption, tableHtml, rows, cols);
            document.body.appendChild(modal);
        }
        
        createPreviewModal(caption, tableHtml, rows, cols) {
            const modal = document.createElement('div');
            modal.className = 'table-preview-modal';
            
            let tableContent = '';
            
            if (tableHtml) {
                // Show the actual table
                tableContent = `
                    <div class="preview-table-container" style="overflow: auto; max-height: 400px;">
                        ${tableHtml}
                    </div>
                `;
            } else {
                // Show dimensions only
                tableContent = `
                    <div class="preview-placeholder">
                        <p><strong>Table: ${this.escapeHtml(caption)}</strong></p>
                        <p>Dimensions: ${rows} rows × ${cols} columns</p>
                        <p>Total cells: ${rows * cols}</p>
                        <p class="preview-note">Table preview not available. The actual table might be dynamically generated or not directly accessible.</p>
                    </div>
                `;
            }
            
            modal.innerHTML = `
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${this.escapeHtml(caption)}</h3>
                        <button class="modal-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${tableContent}
                    </div>
                </div>
            `;
            
            // Close handlers
            modal.addEventListener('click', (e) => {
                if (e.target.closest('.modal-close') || e.target.classList.contains('modal-backdrop')) {
                    modal.remove();
                }
            });
            
            return modal;
        }
        
        handleJumpTo(item) {
            const id = item.dataset.id;
            const caption = item.dataset.caption;
            
            // Find the table in the document
            const tables = document.querySelectorAll('table');
            let targetTable = null;
            
            // Try to find by id first
            targetTable = document.getElementById(id);
            
            // If not found, try to find by caption text
            if (!targetTable) {
                tables.forEach(table => {
                    const tableCaption = table.querySelector('caption');
                    if (tableCaption && tableCaption.textContent.includes(caption)) {
                        targetTable = table;
                    }
                });
            }
            
            // If still not found, try to find by nearby text
            if (!targetTable && caption) {
                const searchText = caption.toLowerCase();
                tables.forEach(table => {
                    const nearbyText = table.parentElement.textContent.toLowerCase();
                    if (nearbyText.includes(searchText)) {
                        targetTable = table;
                    }
                });
            }
            
            if (targetTable) {
                // Scroll to table
                targetTable.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Highlight the table
                targetTable.classList.add('orkg-jump-highlight');
                setTimeout(() => targetTable.classList.remove('orkg-jump-highlight'), 3000);
                
                // Trigger custom event
                const event = new CustomEvent('orkg-jump-to-table', {
                    detail: { id, caption, element: targetTable }
                });
                document.dispatchEvent(event);
            } else {
                console.warn('Table not found:', caption);
            }
            
            // Visual feedback on the item
            item.classList.add('orkg-jump-highlight');
            setTimeout(() => item.classList.remove('orkg-jump-highlight'), 2000);
        }
        
        handleExportTable(item) {
            const id = item.dataset.id;
            const caption = item.dataset.caption;
            const rows = item.dataset.rows;
            const cols = item.dataset.cols;
            
            // Try to capture the table as an image using html2canvas if available
            if (typeof html2canvas !== 'undefined') {
                // Find the actual table
                const tables = document.querySelectorAll('table');
                let targetTable = null;
                
                // Try to find by id first
                targetTable = document.getElementById(id);
                
                // If not found, try to find by caption
                if (!targetTable) {
                    tables.forEach(table => {
                        const tableCaption = table.querySelector('caption');
                        if (tableCaption && tableCaption.textContent.includes(caption)) {
                            targetTable = table;
                        }
                    });
                }
                
                if (targetTable) {
                    // Export as image
                    html2canvas(targetTable).then(canvas => {
                        canvas.toBlob(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `table-${caption.replace(/\s+/g, '-')}.png`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                        });
                    });
                } else {
                    // Fallback to info export
                    this.exportTableInfo(caption, rows, cols);
                }
            } else {
                // Export table info as CSV
                this.exportTableInfo(caption, rows, cols);
            }
        }
        
        exportTableInfo(caption, rows, cols) {
            let csv = `Table Information\n`;
            csv += `Caption: ${caption}\n`;
            csv += `Dimensions: ${rows} rows × ${cols} columns\n`;
            csv += `Total Cells: ${rows * cols}\n\n`;
            csv += `Note: To export the actual table data as an image, please include the html2canvas library.\n`;
            csv += `Alternatively, use the browser's developer tools to extract the table data.\n`;
            
            this.downloadCSV(csv, `table-${caption.replace(/\s+/g, '-')}`);
        }
        
        handleExportAll(container) {
            const tables = container.querySelectorAll('.table-item');
            const data = [];
            
            tables.forEach(item => {
                data.push({
                    id: item.dataset.id,
                    caption: item.dataset.caption,
                    rows: item.dataset.rows,
                    cols: item.dataset.cols,
                    selected: item.classList.contains('selected')
                });
            });
            
            // Create CSV
            const csv = 'ID,Caption,Rows,Columns,Selected\n' +
                data.map(row => 
                    `"${row.id}","${row.caption}","${row.rows}","${row.cols}","${row.selected}"`
                ).join('\n');
            
            this.downloadCSV(csv, 'all-tables');
        }
        
        downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
    }
    
    global.RAGPanelTablesRenderer = RAGPanelTablesRenderer;
    
})(typeof window !== 'undefined' ? window : this);
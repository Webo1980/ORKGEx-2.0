// ================================
// src/background/table-extraction-service.js
// Table extraction service for background script - IIFE pattern
// ================================

var TableExtractionService = (function() {
    'use strict';
    
    // Private configuration
    var config = {
        minRows: 2,
        minColumns: 2,
        maxRows: 1000,
        includeHeaders: true,
        parseNumbers: true,
        parseDates: true,
        includeCaption: true,
        includeFootnotes: true
    };
    
    // Private state
    var extractedTables = [];
    var tableMetadata = {};
    
    // Table extraction function to be executed in page context
    function extractTablesFromPage(extractionConfig) {
        // This function runs in the page context
        var config = extractionConfig;
        var tables = [];
        
        // Helper functions
        function cleanText(text) {
            if (!text) return '';
            return text
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, ' ')
                .trim();
        }
        
        function parseValue(value) {
            if (!value || !config.parseNumbers) return value;
            
            // Try to parse as number
            var cleanValue = value.replace(/[,$%]/g, '');
            var numValue = parseFloat(cleanValue);
            if (!isNaN(numValue) && cleanValue.match(/^-?\d+\.?\d*$/)) {
                return numValue;
            }
            
            // Try to parse as date if enabled
            if (config.parseDates) {
                var dateValue = Date.parse(value);
                if (!isNaN(dateValue) && value.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) {
                    return new Date(dateValue).toISOString();
                }
            }
            
            return value;
        }
        
        function extractTableCaption(tableElement) {
            // Look for caption element
            var caption = tableElement.querySelector('caption');
            if (caption) {
                return cleanText(caption.textContent);
            }
            
            // Look for caption in parent figure
            var figure = tableElement.closest('figure');
            if (figure) {
                var figcaption = figure.querySelector('figcaption');
                if (figcaption) {
                    return cleanText(figcaption.textContent);
                }
            }
            
            // Look for caption in previous sibling
            var prevElement = tableElement.previousElementSibling;
            if (prevElement && (prevElement.tagName === 'P' || prevElement.tagName === 'DIV')) {
                var text = prevElement.textContent.toLowerCase();
                if (text.includes('table') && text.length < 200) {
                    return cleanText(prevElement.textContent);
                }
            }
            
            return '';
        }
        
        function extractTableFootnotes(tableElement) {
            var footnotes = [];
            
            // Look for footnotes in table footer
            var tfoot = tableElement.querySelector('tfoot');
            if (tfoot) {
                var footerCells = tfoot.querySelectorAll('td, th');
                for (var i = 0; i < footerCells.length; i++) {
                    var footnoteText = cleanText(footerCells[i].textContent);
                    if (footnoteText) {
                        footnotes.push(footnoteText);
                    }
                }
            }
            
            // Look for footnotes after table
            var nextElement = tableElement.nextElementSibling;
            if (nextElement && nextElement.tagName === 'P') {
                var text = nextElement.textContent;
                if (text.match(/^[\*\†\‡\§\|\¶\#\^]+/) || text.toLowerCase().includes('note:')) {
                    footnotes.push(cleanText(text));
                }
            }
            
            return footnotes;
        }
        
        function inferColumnTypes(rows, headerCount) {
            if (rows.length <= headerCount) return [];
            
            var columnTypes = [];
            var dataRows = rows.slice(headerCount);
            var columnCount = dataRows[0] ? dataRows[0].length : 0;
            
            for (var col = 0; col < columnCount; col++) {
                var types = { number: 0, date: 0, string: 0, empty: 0 };
                
                for (var row = 0; row < dataRows.length; row++) {
                    var value = dataRows[row][col];
                    
                    if (!value || value === '') {
                        types.empty++;
                    } else if (typeof value === 'number') {
                        types.number++;
                    } else if (typeof value === 'string') {
                        // Check if it looks like a number
                        if (value.match(/^-?\d+\.?\d*[%$€£¥]?$/)) {
                            types.number++;
                        // Check if it looks like a date
                        } else if (value.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/)) {
                            types.date++;
                        } else {
                            types.string++;
                        }
                    } else {
                        types.string++;
                    }
                }
                
                // Determine predominant type
                var maxType = 'string';
                var maxCount = types.string;
                
                if (types.number > maxCount) {
                    maxType = 'number';
                    maxCount = types.number;
                }
                if (types.date > maxCount) {
                    maxType = 'date';
                }
                
                columnTypes.push(maxType);
            }
            
            return columnTypes;
        }
        
        function calculateStatistics(rows, columnTypes, headerCount) {
            var stats = {
                rowCount: rows.length - headerCount,
                columnCount: columnTypes.length,
                columns: []
            };
            
            var dataRows = rows.slice(headerCount);
            
            for (var col = 0; col < columnTypes.length; col++) {
                var columnStats = {
                    type: columnTypes[col],
                    nullCount: 0
                };
                
                if (columnTypes[col] === 'number') {
                    var values = [];
                    for (var row = 0; row < dataRows.length; row++) {
                        var value = dataRows[row][col];
                        if (value === null || value === '' || value === undefined) {
                            columnStats.nullCount++;
                        } else if (typeof value === 'number') {
                            values.push(value);
                        }
                    }
                    
                    if (values.length > 0) {
                        columnStats.min = Math.min.apply(null, values);
                        columnStats.max = Math.max.apply(null, values);
                        columnStats.mean = values.reduce(function(a, b) { 
                            return a + b; 
                        }, 0) / values.length;
                        columnStats.uniqueCount = new Set(values).size;
                    }
                } else {
                    // For non-numeric columns, count unique values
                    var uniqueValues = new Set();
                    for (var r = 0; r < dataRows.length; r++) {
                        var val = dataRows[r][col];
                        if (val === null || val === '' || val === undefined) {
                            columnStats.nullCount++;
                        } else {
                            uniqueValues.add(val);
                        }
                    }
                    columnStats.uniqueCount = uniqueValues.size;
                }
                
                stats.columns.push(columnStats);
            }
            
            return stats;
        }
        
        // Find all tables
        var tableElements = document.querySelectorAll('table');
        
        for (var t = 0; t < tableElements.length; t++) {
            var table = tableElements[t];
            
            // Skip hidden tables
            var style = window.getComputedStyle(table);
            if (style.display === 'none' || style.visibility === 'hidden') {
                continue;
            }
            
            var tableData = {
                id: 'table_' + t + '_' + Date.now(),
                headers: [],
                rows: [],
                caption: '',
                footnotes: [],
                metadata: {},
                statistics: {}
            };
            
            // Extract headers
            var headerRows = [];
            var thead = table.querySelector('thead');
            if (thead) {
                var theadRows = thead.querySelectorAll('tr');
                for (var hr = 0; hr < theadRows.length; hr++) {
                    var headerCells = theadRows[hr].querySelectorAll('th, td');
                    var headerRow = [];
                    for (var hc = 0; hc < headerCells.length; hc++) {
                        headerRow.push(cleanText(headerCells[hc].textContent));
                    }
                    if (headerRow.length > 0) {
                        headerRows.push(headerRow);
                    }
                }
            }
            
            // If no thead, check for th elements in first rows
            if (headerRows.length === 0) {
                var firstRows = table.querySelectorAll('tr');
                for (var fr = 0; fr < Math.min(3, firstRows.length); fr++) {
                    var thElements = firstRows[fr].querySelectorAll('th');
                    if (thElements.length > 0) {
                        var thRow = [];
                        for (var th = 0; th < thElements.length; th++) {
                            thRow.push(cleanText(thElements[th].textContent));
                        }
                        headerRows.push(thRow);
                    } else {
                        break; // Stop when we hit non-header rows
                    }
                }
            }
            
            // Use the last header row as the main headers
            if (headerRows.length > 0 && config.includeHeaders) {
                tableData.headers = headerRows[headerRows.length - 1];
            }
            
            // Extract data rows
            var tbody = table.querySelector('tbody');
            var rowElements = tbody ? tbody.querySelectorAll('tr') : table.querySelectorAll('tr');
            
            for (var r = 0; r < rowElements.length; r++) {
                var row = rowElements[r];
                
                // Skip if this is a header row we already processed
                if (row.querySelector('th') && headerRows.length > 0) {
                    continue;
                }
                
                var cells = row.querySelectorAll('td');
                if (cells.length === 0) {
                    cells = row.querySelectorAll('th'); // Some tables use th in body
                }
                
                var rowData = [];
                for (var c = 0; c < cells.length; c++) {
                    var cellText = cleanText(cells[c].textContent);
                    rowData.push(parseValue(cellText));
                }
                
                if (rowData.length > 0) {
                    tableData.rows.push(rowData);
                }
            }
            
            // Check table validity
            if (tableData.rows.length < config.minRows) {
                continue;
            }
            
            var columnCount = tableData.headers.length || 
                            (tableData.rows[0] ? tableData.rows[0].length : 0);
            
            if (columnCount < config.minColumns) {
                continue;
            }
            
            // Extract caption
            if (config.includeCaption) {
                tableData.caption = extractTableCaption(table);
            }
            
            // Extract footnotes
            if (config.includeFootnotes) {
                tableData.footnotes = extractTableFootnotes(table);
            }
            
            // Infer column types
            var allRows = headerRows.concat(tableData.rows);
            tableData.metadata.columnTypes = inferColumnTypes(allRows, headerRows.length);
            
            // Calculate statistics
            tableData.statistics = calculateStatistics(
                allRows, 
                tableData.metadata.columnTypes, 
                headerRows.length
            );
            
            // Add position metadata
            var rect = table.getBoundingClientRect();
            tableData.metadata.position = {
                top: rect.top + window.pageYOffset,
                left: rect.left + window.pageXOffset,
                width: rect.width,
                height: rect.height
            };
            
            // Add context metadata
            var figure = table.closest('figure');
            tableData.metadata.inFigure = !!figure;
            
            var article = table.closest('article, main, [role="main"]');
            tableData.metadata.inMainContent = !!article;
            
            tables.push(tableData);
        }
        
        return tables;
    }
    
    // Public API
    return {
        init: function(customConfig) {
            // Merge custom config
            if (customConfig) {
                Object.keys(customConfig).forEach(function(key) {
                    if (customConfig[key] !== undefined) {
                        config[key] = customConfig[key];
                    }
                });
            }
            
            // Initialize base extraction service if needed
            if (BaseExtractionService && !BaseExtractionService.isInitialized()) {
                return BaseExtractionService.init(customConfig);
            }
            
            return Promise.resolve();
        },
        
        extractAll: function(tabId) {
            return new Promise(function(resolve, reject) {
                console.log('Starting table extraction via message...');
                
                // Reset state
                extractedTables = [];
                tableMetadata = {};
                
                // Send message to content script
                chrome.tabs.sendMessage(
                    tabId,
                    { 
                        action: 'EXTRACT_TABLES',
                        options: config
                    },
                    function(response) {
                        if (chrome.runtime.lastError) {
                            console.error('Table extraction failed:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        
                        if (response && response.success) {
                            // Process the response from content script
                            const tables = response.data?.tables || [];
                            extractedTables = tables;
                            
                            // Build metadata
                            tableMetadata = {
                                totalTables: tables.length,
                                totalRows: 0,
                                totalCells: 0,
                                tablesWithHeaders: 0,
                                tablesWithCaptions: 0
                            };
                            
                            tables.forEach(function(table) {
                                if (table.rows) {
                                    tableMetadata.totalRows += table.rows.length;
                                }
                                if (table.headers && table.headers.length > 0) {
                                    tableMetadata.tablesWithHeaders++;
                                }
                                if (table.caption) {
                                    tableMetadata.tablesWithCaptions++;
                                }
                            });
                            
                            console.log('Table extraction complete:', tables.length, 'tables extracted');
                            
                            resolve({
                                tables: tables,
                                metadata: tableMetadata
                            });
                        } else {
                            const error = response?.error || 'Unknown error';
                            console.error('Table extraction failed:', error);
                            reject(new Error(error));
                        }
                    }
                );
            });
        },
        
        getTables: function() {
            return extractedTables;
        },
        
        getTable: function(index) {
            return extractedTables[index] || null;
        },
        
        getTableById: function(id) {
            for (var i = 0; i < extractedTables.length; i++) {
                if (extractedTables[i].id === id) {
                    return extractedTables[i];
                }
            }
            return null;
        },
        
        getMetadata: function() {
            return tableMetadata;
        },
        
        exportAsCSV: function(tableIndex) {
            var table = extractedTables[tableIndex];
            if (!table) return '';
            
            var csv = [];
            
            // Add headers
            if (table.headers && table.headers.length > 0) {
                csv.push(table.headers.map(function(h) {
                    return '"' + (h || '').replace(/"/g, '""') + '"';
                }).join(','));
            }
            
            // Add rows
            table.rows.forEach(function(row) {
                csv.push(row.map(function(cell) {
                    if (cell === null || cell === undefined) return '""';
                    if (typeof cell === 'number') return cell.toString();
                    return '"' + cell.toString().replace(/"/g, '""') + '"';
                }).join(','));
            });
            
            return csv.join('\n');
        },
        
        exportAsJSON: function(tableIndex) {
            var table = extractedTables[tableIndex];
            if (!table) return null;
            
            if (table.headers && table.headers.length > 0) {
                // Convert to array of objects with headers as keys
                return table.rows.map(function(row) {
                    var obj = {};
                    table.headers.forEach(function(header, index) {
                        obj[header] = row[index];
                    });
                    return obj;
                });
            }
            
            return table.rows;
        },
        
        getConfig: function() {
            return config;
        },
        
        updateConfig: function(newConfig) {
            Object.keys(newConfig).forEach(function(key) {
                if (newConfig[key] !== undefined) {
                    config[key] = newConfig[key];
                }
            });
        },
        
        reset: function() {
            extractedTables = [];
            tableMetadata = {};
        }
    };
})();

// Expose to global scope for service worker
if (typeof self !== 'undefined') {
    self.TableExtractionService = TableExtractionService;
} else if (typeof window !== 'undefined') {
    window.TableExtractionService = TableExtractionService;
}
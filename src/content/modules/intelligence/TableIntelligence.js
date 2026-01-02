// ================================
// src/content/intelligence/TableIntelligence.js - Converted to IIFE
// ================================

(function(global) {
    'use strict';
    
    /**
     * TableIntelligence
     * Provides intelligent analysis of table content
     */
    function TableIntelligence(config = {}) {
        this.config = {
            thresholds: {
                important: 0.7,      // Threshold for important tables
                recommended: 0.5,    // Threshold for recommended tables
                low: 0.3             // Threshold for low importance tables
            },
            metrics: {
                rows: {
                    weight: 0.15,    // Weight for row count
                    ideal: 10        // Ideal number of rows
                },
                columns: {
                    weight: 0.1,     // Weight for column count
                    ideal: 5         // Ideal number of columns
                },
                caption: {
                    weight: 0.2      // Weight for caption quality
                },
                dataTypes: {
                    weight: 0.15     // Weight for data type variety
                },
                context: {
                    weight: 0.15     // Weight for surrounding context
                },
                references: {
                    weight: 0.2      // Weight for references to the table
                },
                headerQuality: {
                    weight: 0.15     // Weight for header quality
                }
            },
            tableTypes: [
                'data', 'results', 'statistics', 'comparison', 
                'reference', 'summary', 'parameters', 'metadata'
            ]
        };
        
        // Merge provided config with defaults
        if (config) {
            for (const key in config) {
                if (typeof this.config[key] === 'object' && this.config[key] !== null) {
                    this.config[key] = { ...this.config[key], ...config[key] };
                } else {
                    this.config[key] = config[key];
                }
            }
        }
        
        this.cache = new Map();
        this.isInitialized = false;
    }
    
    /**
     * Initialize the intelligence module
     */
    TableIntelligence.prototype.init = async function() {
        if (this.isInitialized) return;
        
        console.log('🧠 Initializing TableIntelligence...');
        
        // Any initialization logic can go here
        
        this.isInitialized = true;
        console.log('✅ TableIntelligence initialized');
    };
    
    /**
     * Analyze table content
     */
    TableIntelligence.prototype.analyze = function(tableData) {
        // Check if already in cache
        const cacheKey = this.generateCacheKey(tableData);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Basic validation
        if (!tableData || typeof tableData !== 'object') {
            return {
                id: 'invalid_table',
                score: 0,
                type: 'invalid',
                importance: 'negligible'
            };
        }
        
        // Process the table
        try {
            // Score different aspects of the table
            const scores = {
                rows: this.scoreRowCount(tableData),
                columns: this.scoreColumnCount(tableData),
                caption: this.scoreCaptionQuality(tableData),
                dataTypes: this.scoreDataTypeVariety(tableData),
                context: this.scoreContextRelevance(tableData),
                references: this.scoreReferences(tableData),
                headerQuality: this.scoreHeaderQuality(tableData)
            };
            
            // Calculate weighted score
            let totalScore = 0;
            let totalWeight = 0;
            
            for (const [metric, score] of Object.entries(scores)) {
                const weight = this.config.metrics[metric]?.weight || 0;
                totalScore += score * weight;
                totalWeight += weight;
            }
            
            // Normalize score
            const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
            
            // Determine table type and importance
            const tableType = this.determineTableType(tableData);
            const importance = this.determineImportance(normalizedScore);
            
            // Final result
            const result = {
                id: tableData.id || `table_${Date.now()}`,
                scores: scores,
                score: normalizedScore,
                type: tableType,
                importance: importance,
                shouldExtract: normalizedScore >= this.config.thresholds.low,
                isHighPriority: normalizedScore >= this.config.thresholds.important,
                insights: this.generateInsights(tableData, scores, normalizedScore),
                timestamp: Date.now()
            };
            
            // Cache the result
            this.cache.set(cacheKey, result);
            
            return result;
        } catch (error) {
            console.error('Table analysis error:', error);
            return {
                id: tableData.id || `table_${Date.now()}`,
                error: error.message,
                score: 0,
                type: 'error',
                importance: 'negligible'
            };
        }
    };
    
    /**
     * Score row count
     */
    TableIntelligence.prototype.scoreRowCount = function(tableData) {
        const rows = tableData.rows || [];
        const rowCount = rows.length;
        
        if (rowCount === 0) return 0;
        
        // Score based on distance from ideal
        const ideal = this.config.metrics.rows.ideal;
        const ratio = Math.min(rowCount / ideal, 2); // Cap at 200% of ideal
        
        if (ratio < 0.3) return 0.3; // Too few rows
        if (ratio > 1.7) return 0.7; // Many rows, good but not perfect
        if (ratio >= 0.8 && ratio <= 1.3) return 1.0; // Close to ideal
        
        return 0.8; // Decent number of rows
    };
    
    /**
     * Score column count
     */
    TableIntelligence.prototype.scoreColumnCount = function(tableData) {
        const columnCount = tableData.columns?.length || 
                           (tableData.headers?.length || 0);
        
        if (columnCount === 0) return 0;
        
        // Score based on distance from ideal
        const ideal = this.config.metrics.columns.ideal;
        const ratio = Math.min(columnCount / ideal, 2); // Cap at 200% of ideal
        
        if (ratio < 0.4) return 0.3; // Too few columns
        if (ratio > 1.8) return 0.6; // Too many columns
        if (ratio >= 0.8 && ratio <= 1.3) return 1.0; // Close to ideal
        
        return 0.8; // Decent number of columns
    };
    
    /**
     * Score caption quality
     */
    TableIntelligence.prototype.scoreCaptionQuality = function(tableData) {
        const caption = tableData.caption || '';
        
        if (!caption) return 0.2; // No caption is bad
        
        let score = 0.5; // Base score for having a caption
        
        // Score based on caption length (longer is often more descriptive)
        const words = caption.split(/\s+/).length;
        if (words < 3) score -= 0.1; // Too short
        if (words >= 5 && words < 15) score += 0.2; // Good length
        if (words >= 15) score += 0.3; // Excellent length
        
        // Check for table number in caption
        if (/table\s+\d+/i.test(caption)) score += 0.1;
        
        // Check for descriptive keywords
        const descriptiveTerms = [
            'shows', 'presents', 'lists', 'summarizes', 'compares',
            'details', 'displays', 'illustrates', 'demonstrates', 'contains'
        ];
        
        for (const term of descriptiveTerms) {
            if (caption.toLowerCase().includes(term)) {
                score += 0.1;
                break;
            }
        }
        
        return Math.min(1, score);
    };
    
    /**
     * Score data type variety
     */
    TableIntelligence.prototype.scoreDataTypeVariety = function(tableData) {
        const rows = tableData.rows || [];
        if (rows.length === 0) return 0;
        
        const headers = tableData.headers || [];
        const dataTypes = new Set();
        
        // Try to determine data types
        for (const row of rows) {
            const cells = row.cells || row;
            
            if (Array.isArray(cells)) {
                for (const cell of cells) {
                    const value = typeof cell === 'object' ? cell.value : cell;
                    dataTypes.add(this.getDataType(value));
                }
            }
        }
        
        // Special column types from headers
        if (headers.length > 0) {
            for (const header of headers) {
                const headerText = typeof header === 'object' ? header.text : header;
                if (typeof headerText === 'string') {
                    const lowerHeader = headerText.toLowerCase();
                    
                    if (lowerHeader.includes('date') || lowerHeader.includes('time')) {
                        dataTypes.add('date');
                    } else if (lowerHeader.includes('percent') || lowerHeader.includes('%')) {
                        dataTypes.add('percentage');
                    } else if (lowerHeader.includes('p-value') || lowerHeader.includes('significance')) {
                        dataTypes.add('statistic');
                    }
                }
            }
        }
        
        // Score based on type variety
        switch (dataTypes.size) {
            case 0: return 0;
            case 1: return 0.4; // Only one type
            case 2: return 0.6; // Two types
            case 3: return 0.8; // Three types
            default: return 1.0; // Four or more types
        }
    };
    
    /**
     * Score context relevance
     */
    TableIntelligence.prototype.scoreContextRelevance = function(tableData) {
        const context = tableData.context || {};
        const surroundingText = context.surroundingText || '';
        
        if (!surroundingText) return 0.5; // Neutral without context
        
        let score = 0.5;
        
        // Check for references to the table in surrounding text
        const tableNumber = this.extractTableNumber(tableData);
        
        if (tableNumber && surroundingText.includes(`Table ${tableNumber}`)) {
            score += 0.2;
        }
        
        // Check for context keywords
        const contextKeywords = [
            'result', 'finding', 'show', 'demonstrate', 'indicate',
            'summarize', 'present', 'compare', 'detail', 'significant'
        ];
        
        for (const keyword of contextKeywords) {
            if (surroundingText.toLowerCase().includes(keyword)) {
                score += 0.1;
                break;
            }
        }
        
        // Check for data description
        if (surroundingText.includes('data') || 
            surroundingText.includes('statistic') ||
            surroundingText.includes('value')) {
            score += 0.1;
        }
        
        return Math.min(1, score);
    };
    
    /**
     * Score references to the table
     */
    TableIntelligence.prototype.scoreReferences = function(tableData) {
        const references = tableData.references || [];
        
        if (references.length === 0) return 0.3; // No references is bad
        
        // Score based on number of references
        switch (references.length) {
            case 1: return 0.5;  // One reference
            case 2: return 0.7;  // Two references
            case 3: return 0.9;  // Three references
            default: return 1.0; // Four or more references
        }
    };
    
    /**
     * Score header quality
     */
    TableIntelligence.prototype.scoreHeaderQuality = function(tableData) {
        const headers = tableData.headers || [];
        
        if (headers.length === 0) return 0.2; // No headers is bad
        
        let score = 0.5; // Base score for having headers
        
        // Check header completeness
        if (tableData.rows && tableData.rows.length > 0) {
            const firstRow = tableData.rows[0];
            const cells = firstRow.cells || firstRow;
            
            if (Array.isArray(cells) && headers.length >= cells.length) {
                score += 0.1; // Headers cover all columns
            }
        }
        
        // Check header lengths
        let headerLengthScore = 0;
        let descriptiveHeaders = 0;
        
        for (const header of headers) {
            const headerText = typeof header === 'object' ? header.text : header;
            
            if (typeof headerText === 'string') {
                const words = headerText.split(/\s+/).length;
                
                if (words >= 2) {
                    descriptiveHeaders++;
                }
                
                if (headerText.length > 3 && headerText.length < 30) {
                    headerLengthScore += 1;
                }
            }
        }
        
        // Score based on descriptive headers ratio
        const descriptiveRatio = descriptiveHeaders / Math.max(1, headers.length);
        if (descriptiveRatio >= 0.5) score += 0.2;
        
        // Score based on header length quality
        const headerLengthRatio = headerLengthScore / Math.max(1, headers.length);
        score += headerLengthRatio * 0.2;
        
        return Math.min(1, score);
    };
    
    /**
     * Determine table type
     */
    TableIntelligence.prototype.determineTableType = function(tableData) {
        const caption = tableData.caption || '';
        const headers = tableData.headers || [];
        
        // Check caption for type clues
        const captionLower = caption.toLowerCase();
        
        if (captionLower.includes('result')) return 'results';
        if (captionLower.includes('statistic')) return 'statistics';
        if (captionLower.includes('parameter')) return 'parameters';
        if (captionLower.includes('comparison') || captionLower.includes('compare')) return 'comparison';
        if (captionLower.includes('summary')) return 'summary';
        if (captionLower.includes('metadata')) return 'metadata';
        
        // Check headers for type clues
        const headerTexts = headers.map(h => typeof h === 'object' ? h.text : h)
                                 .filter(h => typeof h === 'string')
                                 .map(h => h.toLowerCase());
        
        const headerText = headerTexts.join(' ');
        
        if (headerText.includes('p-value') || 
            headerText.includes('significance') ||
            headerText.includes('statistics')) {
            return 'statistics';
        }
        
        if (headerText.includes('parameter') || 
            headerText.includes('setting') ||
            headerText.includes('configuration')) {
            return 'parameters';
        }
        
        if (headerTexts.some(h => h.includes('vs') || h.includes('versus') || h.includes('compared'))) {
            return 'comparison';
        }
        
        // Default to data
        return 'data';
    };
    
    /**
     * Determine importance level based on score
     */
    TableIntelligence.prototype.determineImportance = function(score) {
        if (score >= this.config.thresholds.important) return 'high';
        if (score >= this.config.thresholds.recommended) return 'recommended';
        if (score >= this.config.thresholds.low) return 'low';
        return 'negligible';
    };
    
    /**
     * Get data type of a value
     */
    TableIntelligence.prototype.getDataType = function(value) {
        if (value === null || value === undefined || value === '') {
            return 'empty';
        }
        
        const type = typeof value;
        
        if (type === 'number') {
            return 'number';
        }
        
        if (type !== 'string') {
            return type;
        }
        
        // Check string patterns
        const str = value.toString().trim();
        
        // Date pattern
        if (/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(str) || 
            /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(str)) {
            return 'date';
        }
        
        // Percentage
        if (/%$/.test(str) || /^\d+(\.\d+)?%$/.test(str)) {
            return 'percentage';
        }
        
        // P-value or small decimal
        if (/^0\.\d+$/.test(str) && parseFloat(str) < 0.1) {
            return 'statistic';
        }
        
        // Numeric string
        if (/^-?\d+(\.\d+)?$/.test(str)) {
            return 'number';
        }
        
        // Currency
        if (/^[$€£¥]/.test(str) || /[$€£¥]$/.test(str)) {
            return 'currency';
        }
        
        // Default to text
        return 'text';
    };
    
    /**
     * Extract table number from caption or context
     */
    TableIntelligence.prototype.extractTableNumber = function(tableData) {
        const caption = tableData.caption || '';
        const tableMatch = caption.match(/\btable\s+(\d+)/i);
        
        if (tableMatch) {
            return tableMatch[1];
        }
        
        return null;
    };
    
    /**
     * Generate insights about the table
     */
    TableIntelligence.prototype.generateInsights = function(tableData, scores, totalScore) {
        const insights = [];
        
        // Add insights based on scores
        if (scores.caption >= 0.8) {
            insights.push({
                type: 'positive',
                text: 'Well-described with detailed caption'
            });
        } else if (scores.caption <= 0.3) {
            insights.push({
                type: 'negative',
                text: 'Missing or poor caption - consider adding context'
            });
        }
        
        if (scores.headerQuality >= 0.8) {
            insights.push({
                type: 'positive',
                text: 'Clear and descriptive column headers'
            });
        } else if (scores.headerQuality <= 0.4) {
            insights.push({
                type: 'negative',
                text: 'Column headers could be improved'
            });
        }
        
        if (scores.dataTypes >= 0.8) {
            insights.push({
                type: 'positive',
                text: 'Rich data with varied content types'
            });
        }
        
        if (scores.references >= 0.8) {
            insights.push({
                type: 'positive',
                text: 'Frequently referenced in the text'
            });
        } else if (scores.references <= 0.3) {
            insights.push({
                type: 'negative',
                text: 'Not well-referenced in the text'
            });
        }
        
        // Add type-specific insights
        const tableType = this.determineTableType(tableData);
        
        switch (tableType) {
            case 'results':
                insights.push({
                    type: 'info',
                    text: 'Contains key results or findings'
                });
                break;
            case 'statistics':
                insights.push({
                    type: 'info',
                    text: 'Contains statistical data or measurements'
                });
                break;
            case 'comparison':
                insights.push({
                    type: 'info',
                    text: 'Compares different items or approaches'
                });
                break;
        }
        
        // Add overall recommendation
        if (totalScore >= this.config.thresholds.important) {
            insights.push({
                type: 'recommendation',
                text: 'High-priority table - should be extracted'
            });
        } else if (totalScore >= this.config.thresholds.recommended) {
            insights.push({
                type: 'recommendation',
                text: 'Recommended for extraction'
            });
        } else if (totalScore < this.config.thresholds.low) {
            insights.push({
                type: 'recommendation',
                text: 'Low importance - extraction optional'
            });
        }
        
        return insights;
    };
    
    /**
     * Generate cache key for table data
     */
    TableIntelligence.prototype.generateCacheKey = function(tableData) {
        // Use ID if available
        if (tableData.id) {
            return `table_${tableData.id}`;
        }
        
        // Generate from caption and first row
        const caption = tableData.caption || '';
        const firstRow = tableData.rows && tableData.rows.length > 0 
                      ? JSON.stringify(tableData.rows[0]).slice(0, 50)
                      : '';
        
        // Simple hash function
        const str = `${caption}:${firstRow}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return `table_${hash}`;
    };
    
    /**
     * Batch analyze multiple tables
     */
    TableIntelligence.prototype.analyzeMultiple = function(tables) {
        return tables.map(table => this.analyze(table));
    };
    
    /**
     * Get tables above threshold
     */
    TableIntelligence.prototype.filterByImportance = function(tables, threshold = null) {
        const minScore = threshold || this.config.thresholds.recommended;
        const analyzed = this.analyzeMultiple(tables);
        
        return analyzed.filter(result => result.score >= minScore)
                      .sort((a, b) => b.score - a.score);
    };
    
    /**
     * Clean up and reset
     */
    TableIntelligence.prototype.cleanup = function() {
        this.cache.clear();
        this.isInitialized = false;
        console.log('🧹 TableIntelligence cleaned up');
    };
    
    // Export to global scope
    global.TableIntelligence = TableIntelligence;
    
})(typeof window !== 'undefined' ? window : this);
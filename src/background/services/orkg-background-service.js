// ================================
// src/background/orkg-background-service.js
// Standalone ORKG service for background script (no ES6 imports)
// ================================

(function() {
    'use strict';
    
    // ORKG Background Service - Lightweight version for background script
    class ORKGBackgroundService {
        constructor() {
            this.serverUrl = 'https://orkg.org';
            this.apiURL = 'https://orkg.org/api/';
            this.cache = new Map();
            this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
            this.commonPredicates = null;
            this.predicatesLastFetch = null;
            this.isInitialized = false;
        }
        
        async init() {
            if (this.isInitialized) return;
            
            console.log('🔬 Initializing ORKG Background Service...');
            
            // Prefetch common predicates
            try {
                await this.prefetchCommonPredicates();
            } catch (error) {
                console.warn('Failed to prefetch predicates:', error);
            }
            
            this.isInitialized = true;
            console.log('✅ ORKG Background Service initialized');
        }
        
        async prefetchCommonPredicates() {
            try {
                const predicates = await this.fetchPredicates('', 10);
                this.commonPredicates = predicates;
                this.predicatesLastFetch = Date.now();
            } catch (error) {
                console.warn('Failed to prefetch predicates:', error);
                // Use fallback predicates
                this.commonPredicates = this.getFallbackPredicates();
            }
        }
        
        async fetchPredicates(query = '', size = 20, exact = false) {
            const cacheKey = `predicates_${query}_${size}_${exact}`;
            
            // Check cache
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
            
            try {
                let url;
                if (query.trim() === '') {
                    url = `${this.apiURL}predicates/?size=${size}&sort=desc`;
                } else if (exact) {
                    url = `${this.apiURL}predicates/?exact=${encodeURIComponent(query)}&size=${size}`;
                } else {
                    url = `${this.apiURL}predicates/?q=${encodeURIComponent(query)}&size=${size}`;
                }
                console.log("URL:", url);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                const predicates = this.transformPredicates(data);
                
                this.setCache(cacheKey, predicates);
                return predicates;
                
            } catch (error) {
                console.error('Error fetching predicates:', error);
                return this.getFallbackPredicates();
            }
        }
        
        transformPredicates(data) {
            if (!data || !data.content) {
                return [];
            }
            
            return data.content.map(predicate => ({
                id: predicate.id,
                label: predicate.label,
                description: predicate.description || null,
                created_at: predicate.created_at,
                created_by: predicate.created_by,
                _class: predicate._class,
                extraction_method: predicate.extraction_method,
                shared: predicate.shared !== undefined ? predicate.shared : 1
            }));
        }
        
        async getPredicateById(predicateId) {
            const cacheKey = `predicate_${predicateId}`;
            
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
            
            try {
                const response = await fetch(`${this.apiURL}predicates/${predicateId}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const predicate = await response.json();
                
                const transformed = {
                    id: predicate.id,
                    label: predicate.label,
                    description: predicate.description || null,
                    created_at: predicate.created_at,
                    created_by: predicate.created_by,
                    _class: predicate._class,
                    extraction_method: predicate.extraction_method,
                    shared: predicate.shared !== undefined ? predicate.shared : 1
                };
                
                this.setCache(cacheKey, transformed);
                return transformed;
                
            } catch (error) {
                console.error(`Error fetching predicate ${predicateId}:`, error);
                return null;
            }
        }
        
        async getSuggestedPredicates(text) {
            const keywords = this.extractKeywords(text);
            
            if (keywords.length === 0) {
                return this.getCommonPredicates();
            }
            
            const allResults = [];
            const seenIds = new Set();
            
            for (const keyword of keywords) {
                const results = await this.fetchPredicates(keyword, 5);
                
                for (const result of results) {
                    if (!seenIds.has(result.id)) {
                        seenIds.add(result.id);
                        allResults.push(result);
                    }
                }
            }
            
            return allResults.slice(0, 10);
        }
        
        async getCommonPredicates() {
            if (this.commonPredicates && 
                this.predicatesLastFetch && 
                (Date.now() - this.predicatesLastFetch < this.cacheTimeout)) {
                return this.commonPredicates;
            }
            
            await this.prefetchCommonPredicates();
            return this.commonPredicates || this.getFallbackPredicates();
        }
        
        async getPredicatesForField(fieldId) {
            const cacheKey = `field_predicates_${fieldId}`;
            
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }
            
            try {
                const url = `${this.apiURL}papers/?research_field=${fieldId}&size=50`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                const predicateIds = new Set();
                const predicates = [];
                
                if (data.content) {
                    for (const paper of data.content) {
                        if (paper.statements) {
                            for (const statement of paper.statements) {
                                if (statement.predicate && !predicateIds.has(statement.predicate.id)) {
                                    predicateIds.add(statement.predicate.id);
                                    predicates.push({
                                        id: statement.predicate.id,
                                        label: statement.predicate.label,
                                        description: null
                                    });
                                }
                            }
                        }
                    }
                }
                
                this.setCache(cacheKey, predicates);
                return predicates;
                
            } catch (error) {
                console.error(`Error fetching predicates for field ${fieldId}:`, error);
                return this.getFallbackPredicates();
            }
        }
        
        async createPredicate(label, description = null) {
            try {
                const response = await fetch(`${this.apiURL}predicates/`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        label: label,
                        description: description
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const predicate = await response.json();
                
                this.clearPredicatesCache();
                
                return {
                    id: predicate.id,
                    label: predicate.label,
                    description: predicate.description || null
                };
                
            } catch (error) {
                console.error('Error creating predicate:', error);
                throw error;
            }
        }
        
        getFallbackPredicates() {
            return [
                { id: 'P2001', label: 'Method', description: 'The methodology or approach used' },
                { id: 'P2002', label: 'Result', description: 'The findings or outcomes' },
                { id: 'P2003', label: 'Conclusion', description: 'The conclusions drawn' },
                { id: 'P2004', label: 'Dataset', description: 'The dataset used or produced' },
                { id: 'P2005', label: 'Evaluation', description: 'Evaluation metrics' },
                { id: 'P2006', label: 'Problem', description: 'The research problem' },
                { id: 'P2007', label: 'Contribution', description: 'The main contribution' },
                { id: 'P2008', label: 'Background', description: 'Background information' },
                { id: 'P2009', label: 'Future Work', description: 'Future research directions' },
                { id: 'P2010', label: 'Limitation', description: 'Limitations of the research' }
            ];
        }
        
        generatePropertyColor(propertyLabel) {
            const colors = {
                'method': '#9C27B0',
                'result': '#4CAF50',
                'conclusion': '#FF9800',
                'dataset': '#2196F3',
                'evaluation': '#00BCD4',
                'problem': '#F44336',
                'contribution': '#8BC34A',
                'background': '#795548',
                'future work': '#607D8B',
                'limitation': '#FFC107'
            };
            
            const labelLower = propertyLabel.toLowerCase();
            
            if (colors[labelLower]) {
                return colors[labelLower];
            }
            
            for (const [key, color] of Object.entries(colors)) {
                if (labelLower.includes(key) || key.includes(labelLower)) {
                    return color;
                }
            }
            
            const baseColors = Object.values(colors);
            const hash = this.hashString(propertyLabel);
            return baseColors[hash % baseColors.length];
        }
        
        extractKeywords(text) {
            if (!text || typeof text !== 'string') {
                return [];
            }
            
            const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');
            const words = cleaned.split(/\s+/).filter(word => word.length > 3);
            
            const stopWords = new Set([
                'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
                'were', 'been', 'being', 'have', 'their', 'they', 'them', 'than',
                'when', 'where', 'which', 'while', 'will', 'with', 'would'
            ]);
            
            const keywords = words.filter(word => !stopWords.has(word));
            const unique = [...new Set(keywords)];
            
            return unique.slice(0, 5);
        }
        
        hashString(str) {
            if (!str) return '0';
            
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            
            return Math.abs(hash).toString(36);
        }
        
        getFromCache(key) {
            if (!this.cache.has(key)) {
                return null;
            }
            
            const cached = this.cache.get(key);
            
            if (Date.now() - cached.timestamp > this.cacheTimeout) {
                this.cache.delete(key);
                return null;
            }
            
            return cached.data;
        }
        
        setCache(key, data) {
            this.cache.set(key, {
                data: data,
                timestamp: Date.now()
            });
        }
        
        clearPredicatesCache() {
            for (const key of this.cache.keys()) {
                if (key.startsWith('predicate')) {
                    this.cache.delete(key);
                }
            }
            
            this.commonPredicates = null;
            this.predicatesLastFetch = null;
        }
    }
    
    // Create global instance
    if (typeof globalThis !== 'undefined') {
        globalThis.ORKGBackgroundService = ORKGBackgroundService;
    } else if (typeof self !== 'undefined') {
        self.ORKGBackgroundService = ORKGBackgroundService;
    }
})();
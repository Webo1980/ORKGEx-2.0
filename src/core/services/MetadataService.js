// ================================
// src/core/services/MetadataService.js - Enhanced with CrossRef Primary, Semantic Scholar Fallback
// ================================

import { DOI_PATTERNS, METADATA_SELECTORS } from '../../utils/constants.js';
import config from '../../config/config.js';

export class MetadataService {
    constructor(dataCache, metadataConfig, externalApisConfig) {
        this.dataCache = dataCache;
        this.metadataConfig = metadataConfig;
        this.externalApisConfig = externalApisConfig;
        
        // Use provided configs
        this.sourcePriority = metadataConfig?.sourcePriority || [
            'doi_api',
            'semantic_scholar',
            'crossref',
            'arxiv',
            'dom_extraction'
        ];
        
        this.searchStrategies = metadataConfig?.searchStrategies || {};
        this.domExtraction = metadataConfig?.domExtraction || {};
        
        this.isInitialized = false;
        
        console.log('📚 MetadataService created with config:', {
            sources: this.sourcePriority,
            hasSemanticScholarKey: !!externalApisConfig?.semanticScholar?.apiKey
        });
    }
    
    async init() {
        if (this.isInitialized) return;
        
        // No need to reload config - we have it from constructor
        
        this.isInitialized = true;
        console.log('✅ MetadataService initialized');
    }

    /**
     * Main metadata extraction method - CrossRef primary, Semantic Scholar fallback
     */
    async extractPageMetadata(options = {}) {
        try {
            const tabInfo = await this.getCurrentTabInfo();
            if (!tabInfo.success) {
                throw new Error('Cannot access current tab');
            }

            const currentTab = tabInfo.tab;
            const url = currentTab.url;
            const cacheKey = `metadata_${this.createUrlHash(url)}`;

            // Check cache first
            if (this.cacheManager && !options.forceRefresh) {
                const cached = await this.cacheManager.get(cacheKey);
                if (cached && this.isValidMetadata(cached)) {
                    console.log('📋 Using cached metadata');
                    return cached;
                }
            }

            console.log('🔍 Starting metadata extraction for:', url);

            // Strategy 1: Try DOM extraction first for speed
            const domMetadata = await this.extractFromDOM(currentTab.id);
            
            // Strategy 2: API-based extraction (CrossRef primary, Semantic Scholar fallback)
            let apiMetadata = null;
            
            if (!options.skipAPILookup) {
                // Try DOI-based lookup first
                const doi = await this.extractDOIFromPage(currentTab.id);
                if (doi && this.isValidDOI(doi)) {
                    console.log('🔗 Valid DOI found, trying API lookup:', doi);
                    apiMetadata = await this.fetchMetadataByDOI(doi);
                }
                
                // If DOI lookup failed, try title-based search
                if (!apiMetadata && domMetadata?.title) {
                    console.log('📄 Trying title-based API search');
                    apiMetadata = await this.fetchMetadataByTitle(domMetadata.title);
                }
            }
            
            // Merge DOM and API metadata (API takes priority)
            const finalMetadata = this.mergeMetadata(domMetadata, apiMetadata);
            
            // Cache the result
            if (this.cacheManager && finalMetadata) {
                await this.cacheManager.set(cacheKey, finalMetadata, 1800000); // 30 minutes
            }
            
            return finalMetadata;

        } catch (error) {
            console.error('🚨 Metadata extraction failed:', error);
            throw error;
        }
    }

    /**
     * Fetch metadata by DOI - CrossRef first, then Semantic Scholar
     */
    async fetchMetadataByDOI(doi) {
        let metadata = null;
        
        // Try CrossRef first
        try {
            console.log('🎯 Trying CrossRef for DOI:', doi);
            metadata = await this.fetchFromCrossRef(doi);
            if (metadata && this.isRichMetadata(metadata)) {
                console.log('✅ Rich metadata from CrossRef');
                console.log('📄 Metadata from CrossRef:', metadata);
                return metadata;
            }
        } catch (error) {
            console.warn('⚠️ CrossRef lookup failed:', error.message);
        }
        
        // Fallback to Semantic Scholar
        try {
            console.log('🎯 Trying Semantic Scholar for DOI:', doi);
            metadata = await this.fetchFromSemanticScholar(doi, 'doi');
            if (metadata && this.isRichMetadata(metadata)) {
                console.log('✅ Rich metadata from Semantic Scholar');
                return metadata;
            }
        } catch (error) {
            console.warn('⚠️ Semantic Scholar lookup failed:', error.message);
        }
        
        return metadata;
    }

    /**
     * Fetch metadata by title - CrossRef first, then Semantic Scholar
     */
    async fetchMetadataByTitle(title) {
        let metadata = null;
        const cleanTitle = this.cleanTitle(title);
        
        if (!cleanTitle || cleanTitle.length < 15) {
            console.log('⚠️ Title too short for API search');
            return null;
        }
        
        // Try CrossRef first
        try {
            console.log('🎯 Trying CrossRef for title:', cleanTitle);
            metadata = await this.searchCrossRefByTitle(cleanTitle);
            if (metadata && this.isRichMetadata(metadata)) {
                console.log('✅ Rich metadata from CrossRef title search');
                return metadata;
            }
        } catch (error) {
            console.warn('⚠️ CrossRef title search failed:', error.message);
        }
        
        // Fallback to Semantic Scholar
        try {
            console.log('🎯 Trying Semantic Scholar for title:', cleanTitle);
            metadata = await this.fetchFromSemanticScholar(cleanTitle, 'title');
            if (metadata && this.isRichMetadata(metadata)) {
                console.log('✅ Rich metadata from Semantic Scholar title search');
                return metadata;
            }
        } catch (error) {
            console.warn('⚠️ Semantic Scholar title search failed:', error.message);
        }
        
        return metadata;
    }

    /**
     * Fetch from CrossRef API by DOI
     */
    async fetchFromCrossRef(doi) {
        const config = this.retryConfig.crossref;
        let lastError = null;
        
        for (let attempt = 1; attempt <= config.attempts; attempt++) {
            try {
                const cleanDOI = doi.replace(/^(doi:|DOI:)/i, '').trim();
                const url = `https://api.crossref.org/works/${encodeURIComponent(cleanDOI)}`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'ORKG-Annotator/2.0 (mailto:orkg@tib.eu)'
                    },
                    signal: AbortSignal.timeout(15000)
                });
                
                if (!response.ok) {
                    throw new Error(`CrossRef API error: ${response.status}`);
                }
                
                const data = await response.json();
                return this.parseCrossRefData(data.message);
                
            } catch (error) {
                lastError = error;
                if (attempt < config.attempts) {
                    await new Promise(resolve => setTimeout(resolve, config.delay));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Search CrossRef by title
     */
    async searchCrossRefByTitle(title) {
        const config = this.retryConfig.crossref;
        let lastError = null;
        
        for (let attempt = 1; attempt <= config.attempts; attempt++) {
            try {
                const encodedTitle = encodeURIComponent(title);
                const url = `https://api.crossref.org/works?query.title=${encodedTitle}&rows=1&sort=relevance`;
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'ORKG-Annotator/2.0 (mailto:orkg@tib.eu)'
                    },
                    signal: AbortSignal.timeout(15000)
                });
                
                if (!response.ok) {
                    throw new Error(`CrossRef search error: ${response.status}`);
                }
                
                const data = await response.json();
                if (data.message?.items && data.message.items.length > 0) {
                    const work = data.message.items[0];
                    const workTitle = work.title?.[0] || '';
                    
                    // Check title similarity
                    const similarity = this.calculateSimilarity(title.toLowerCase(), workTitle.toLowerCase());
                    if (similarity >= 0.6) {
                        return this.parseCrossRefData(work);
                    }
                }
                
                return null;
                
            } catch (error) {
                lastError = error;
                if (attempt < config.attempts) {
                    await new Promise(resolve => setTimeout(resolve, config.delay));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Fetch from Semantic Scholar API
     */
    async fetchFromSemanticScholar(query, type) {
        const config = this.retryConfig.semanticScholar;
        let lastError = null;
        
        for (let attempt = 1; attempt <= config.attempts; attempt++) {
            try {
                let url;
                const fields = 'title,authors,abstract,year,venue,externalIds,url,citationCount';
                
                if (type === 'doi') {
                    const cleanQuery = query.replace(/^(doi:|DOI:)/i, '').trim();
                    url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(cleanQuery)}?fields=${fields}`;
                } else {
                    const cleanQuery = this.cleanTitle(query);
                    url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(cleanQuery)}&limit=1&fields=${fields}`;
                }
                
                const headers = {
                    'Accept': 'application/json',
                    'User-Agent': 'ORKG-Annotator/2.0'
                };
                
                // Add API key if available
                if (this.apiConfig?.semanticScholar?.apiKey) {
                    headers['x-api-key'] = this.apiConfig.semanticScholar.apiKey;
                }
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers,
                    signal: AbortSignal.timeout(15000)
                });
                
                if (!response.ok) {
                    throw new Error(`Semantic Scholar API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                let paper = null;
                if (type === 'doi') {
                    paper = data;
                } else if (data.data && data.data.length > 0) {
                    paper = data.data[0];
                }
                
                if (paper && paper.title) {
                    return this.parseSemanticScholarData(paper);
                }
                
                return null;
                
            } catch (error) {
                lastError = error;
                if (attempt < config.attempts) {
                    await new Promise(resolve => setTimeout(resolve, config.delay));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Parse CrossRef API response
     */
    parseCrossRefData(work) {
        try {
            const authors = work.author ? work.author.map(author => ({
                name: `${author.given || ''} ${author.family || ''}`.trim()
            })).filter(author => author.name) : [];
            
            const publicationDate = this.extractPublicationDate(work);
            
            return {
                source: 'crossref',
                title: work.title?.[0] || '',
                authors: authors,
                abstract: work.abstract || '',
                doi: work.DOI ? work.DOI.toLowerCase() : '',
                url: work.URL || (work.DOI ? `https://doi.org/${work.DOI}` : ''),
                publicationDate: publicationDate,
                venue: work['container-title']?.[0] || '',
                journal: work['container-title']?.[0] || '',
                year: work.published?.['date-parts']?.[0]?.[0]?.toString() || '',
                publisher: work.publisher || '',
                volume: work.volume || '',
                issue: work.issue || '',
                pages: work.page || '',
                type: work.type || 'article',
                citationCount: 0 // CrossRef doesn't provide citation counts
            };
        } catch (error) {
            console.error('❌ Error parsing CrossRef data:', error);
            return null;
        }
    }

    /**
     * Parse Semantic Scholar API response
     */
    parseSemanticScholarData(paper) {
        try {
            const authors = paper.authors ? paper.authors.map(author => ({
                name: author.name || ''
            })).filter(author => author.name) : [];
            
            // Extract DOI from external IDs
            const doi = paper.externalIds?.DOI || '';
            
            return {
                source: 'semantic_scholar',
                title: paper.title || '',
                authors: authors,
                abstract: paper.abstract || '',
                doi: doi.toLowerCase(),
                url: paper.url || (doi ? `https://doi.org/${doi}` : ''),
                publicationDate: paper.year ? new Date(paper.year, 0).toISOString() : '',
                venue: paper.venue || '',
                journal: paper.venue || '',
                year: paper.year?.toString() || '',
                publisher: '',
                volume: '',
                issue: '',
                pages: '',
                type: 'article',
                citationCount: paper.citationCount || 0
            };
        } catch (error) {
            console.error('❌ Error parsing Semantic Scholar data:', error);
            return null;
        }
    }

    /**
     * Extract metadata from DOM
     */
    async extractFromDOM(tabId) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: (metaSelectors) => {
                    const metadata = {
                        source: 'dom',
                        title: '',
                        authors: [],
                        abstract: '',
                        doi: '',
                        url: window.location.href,
                        venue: '',
                        journal: '',
                        year: '',
                        publisher: ''
                    };

                    // Helper to get meta content
                    const getMeta = (selectors) => {
                        for (const selector of selectors) {
                            const element = document.querySelector(selector);
                            if (element) {
                                const content = element.getAttribute('content') || element.textContent;
                                if (content && content.trim()) {
                                    return content.trim();
                                }
                            }
                        }
                        return '';
                    };

                    // Extract title
                    metadata.title = getMeta(metaSelectors.TITLE) || document.title || '';

                    // Extract authors
                    const authorElements = document.querySelectorAll(metaSelectors.AUTHORS.join(', '));
                    authorElements.forEach(element => {
                        const authorName = element.getAttribute('content') || element.textContent;
                        if (authorName && authorName.trim()) {
                            metadata.authors.push({ name: authorName.trim() });
                        }
                    });

                    // Extract abstract
                    metadata.abstract = getMeta(metaSelectors.ABSTRACT);

                    // Extract DOI
                    metadata.doi = getMeta(metaSelectors.DOI);

                    // Extract journal/venue
                    metadata.journal = getMeta(metaSelectors.JOURNAL);
                    metadata.venue = metadata.journal;

                    // Extract year
                    const dateString = getMeta(metaSelectors.DATE);
                    if (dateString) {
                        const yearMatch = dateString.match(/\d{4}/);
                        if (yearMatch) {
                            metadata.year = yearMatch[0];
                        }
                    }

                    // Extract publisher
                    metadata.publisher = getMeta(metaSelectors.PUBLISHER);

                    return metadata;
                },
                args: [METADATA_SELECTORS]
            });

            return results[0]?.result || null;
        } catch (error) {
            console.error('❌ DOM extraction failed:', error);
            return null;
        }
    }

    /**
     * Extract DOI from page
     */
    async extractDOIFromPage(tabId) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: (doiPatterns, metaSelectors) => {
                    // Try meta tags first
                    for (const selector of metaSelectors.DOI) {
                        const element = document.querySelector(selector);
                        if (element) {
                            const content = element.getAttribute('content');
                            if (content) {
                                return content.replace(/^(doi:|DOI:)/i, '').trim();
                            }
                        }
                    }

                    // Search page content
                    const pageText = document.body.textContent;
                    for (const pattern of doiPatterns) {
                        const matches = pageText.match(new RegExp(pattern.source, pattern.flags));
                        if (matches && matches.length > 0) {
                            return matches[0].replace(/^(doi:?\s*|https?:\/\/(?:dx\.)?doi\.org\/)/i, '').trim();
                        }
                    }

                    return null;
                },
                args: [DOI_PATTERNS, METADATA_SELECTORS]
            });

            return results[0]?.result || null;
        } catch (error) {
            console.error('❌ DOI extraction failed:', error);
            return null;
        }
    }

    /**
     * Merge DOM and API metadata (API takes priority)
     */
    mergeMetadata(domMetadata, apiMetadata) {
        if (!domMetadata && !apiMetadata) return null;
        if (!domMetadata) return apiMetadata;
        if (!apiMetadata) return domMetadata;

        return {
            source: `${apiMetadata.source}+dom`,
            title: apiMetadata.title || domMetadata.title || '',
            authors: apiMetadata.authors?.length > 0 ? apiMetadata.authors : domMetadata.authors || [],
            abstract: apiMetadata.abstract || domMetadata.abstract || '',
            doi: apiMetadata.doi || domMetadata.doi || '',
            url: apiMetadata.url || domMetadata.url || '',
            venue: apiMetadata.venue || domMetadata.venue || '',
            journal: apiMetadata.journal || domMetadata.journal || '',
            year: apiMetadata.year || domMetadata.year || '',
            publisher: apiMetadata.publisher || domMetadata.publisher || '',
            publicationDate: apiMetadata.publicationDate || '',
            volume: apiMetadata.volume || '',
            issue: apiMetadata.issue || '',
            pages: apiMetadata.pages || '',
            type: apiMetadata.type || 'article',
            citationCount: apiMetadata.citationCount || 0
        };
    }

    /**
     * Check if metadata is valid
     */
    isValidMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') return false;
        
        const hasTitle = !!(metadata.title && metadata.title.trim().length > 5);
        const hasValidSource = !!(metadata.source && metadata.source !== 'error');
        
        return hasTitle && hasValidSource;
    }

    /**
     * Check if metadata is rich (has multiple useful fields)
     */
    isRichMetadata(metadata) {
        if (!this.isValidMetadata(metadata)) return false;
        
        const hasTitle = !!(metadata.title?.trim() && metadata.title.trim().length > 5);
        const hasAuthors = !!(metadata.authors && Array.isArray(metadata.authors) && metadata.authors.length > 0);
        const hasAbstract = !!(metadata.abstract?.trim() && metadata.abstract.trim().length > 50);
        const hasDOI = !!(metadata.doi?.trim());
        
        const usefulFields = [hasAuthors, hasAbstract, hasDOI].filter(Boolean).length;
        return hasTitle && usefulFields >= 2; // Require title + at least 2 other fields
    }

    /**
     * Utility methods
     */
    cleanTitle(title) {
        if (!title) return '';
        
        return title
            .replace(/\s*\|\s*.*$/g, '')           // Remove "| Journal Name"
            .replace(/\s*-\s*.*Journal.*$/i, '')  // Remove "- Journal Name" 
            .replace(/\s*:\s*Full\s*Text\s*$/i, '') // Remove ": Full Text"
            .replace(/\s*\[\s*.*\]\s*$/g, '')     // Remove "[additional info]"
            .replace(/\s*\(\s*PDF\s*\)\s*$/i, '') // Remove "(PDF)"
            .trim();
    }

    isValidDOI(doi) {
        if (!doi || typeof doi !== 'string') return false;
        const cleanDOI = doi.replace(/^(doi:|DOI:)/i, '').trim();
        return /^10\.\d{4,}(?:\.\d+)*\/[^\s<>"]+$/.test(cleanDOI);
    }

    calculateSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
        
        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + cost // substitution
                );
            }
        }
        
        const maxLen = Math.max(len1, len2);
        return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
    }

    extractPublicationDate(work) {
        try {
            if (work.published?.['date-parts']?.[0]) {
                const dateParts = work.published['date-parts'][0];
                const year = dateParts[0];
                const month = dateParts[1] || 1;
                const day = dateParts[2] || 1;
                return new Date(year, month - 1, day).toISOString();
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    createUrlHash(url) {
        try {
            const urlObj = new URL(url);
            return btoa(`${urlObj.hostname}${urlObj.pathname}`).replace(/[^a-zA-Z0-9]/g, '');
        } catch (error) {
            return btoa(url).replace(/[^a-zA-Z0-9]/g, '');
        }
    }

    async getCurrentTabInfo() {
        try {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'GET_TAB_INFO' }, (response) => {
                    if (chrome.runtime.lastError) {
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        resolve(response || { success: false, error: 'No response' });
                    }
                });
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getDefaultConfig() {
        return {
            searchStrategies: {
                title: {
                    minLength: 15,
                    cleaningRules: [
                        /\s*\|\s*.*$/,
                        /\s*-\s*.*Journal.*$/i,
                        /\s*:\s*Full\s*Text\s*$/i
                    ]
                }
            }
        };
    }

    getDefaultApiConfig() {
        return {
            crossRef: {
                baseUrl: 'https://api.crossref.org/works',
                userAgent: 'ORKG-Annotator/2.0 (mailto:orkg@tib.eu)',
                timeout: 15000
            },
            semanticScholar: {
                baseUrl: 'https://api.semanticscholar.org/graph/v1',
                timeout: 15000,
                apiKey: ''
            }
        };
    }

    cleanup() {
        this.currentOperation = null;
        this.rateLimits.clear();
        console.log('🧹 MetadataService cleanup completed');
    }
}
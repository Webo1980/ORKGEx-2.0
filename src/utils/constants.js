// ================================
// Enhanced Constants - ORKG Annotator v2.0 - Updated with Publisher Management
// src/utils/constants.js
// ================================

/**
 * Application Constants
 */
export const APP_CONFIG = {
    NAME: 'ORKG Annotator',
    VERSION: '2.0',
    BUILD: 'enhanced-ui',
    NAMESPACE: 'orkg-annotator',
    DEBUG: true
};

/**
 * Academic Publishers and Domains - Centralized Management
 */
export const ACADEMIC_PUBLISHERS = {
    IEEE: {
        domains: ['ieee.org', 'ieeexplore.ieee.org'],
        name: 'IEEE',
        fullName: 'Institute of Electrical and Electronics Engineers',
        confidence: 'very-high',
        type: 'publisher'
    },
    ACM: {
        domains: ['acm.org', 'dl.acm.org'],
        name: 'ACM',
        fullName: 'Association for Computing Machinery',
        confidence: 'very-high',
        type: 'publisher'
    },
    SPRINGER: {
        domains: ['springer.com', 'link.springer.com'],
        name: 'Springer',
        fullName: 'Springer Nature',
        confidence: 'very-high',
        type: 'publisher'
    },
    ELSEVIER: {
        domains: ['sciencedirect.com', 'elsevier.com'],
        name: 'Elsevier',
        fullName: 'Elsevier B.V.',
        confidence: 'very-high',
        type: 'publisher'
    },
    NATURE: {
        domains: ['nature.com'],
        name: 'Nature',
        fullName: 'Nature Publishing Group',
        confidence: 'very-high',
        type: 'publisher'
    },
    SCIENCE: {
        domains: ['science.org'],
        name: 'Science',
        fullName: 'American Association for the Advancement of Science',
        confidence: 'very-high',
        type: 'publisher'
    },
    WILEY: {
        domains: ['wiley.com'],
        name: 'Wiley',
        fullName: 'John Wiley & Sons',
        confidence: 'very-high',
        type: 'publisher'
    },
    ARXIV: {
        domains: ['arxiv.org'],
        name: 'arXiv',
        fullName: 'arXiv Preprint Server',
        confidence: 'high',
        type: 'repository'
    },
    PUBMED: {
        domains: ['pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov'],
        name: 'PubMed',
        fullName: 'PubMed Central',
        confidence: 'very-high',
        type: 'database'
    },
    JSTOR: {
        domains: ['jstor.org'],
        name: 'JSTOR',
        fullName: 'JSTOR Digital Library',
        confidence: 'high',
        type: 'database'
    },
    PLOS: {
        domains: ['plos.org'],
        name: 'PLOS',
        fullName: 'Public Library of Science',
        confidence: 'very-high',
        type: 'publisher'
    },
    MDPI: {
        domains: ['mdpi.com'],
        name: 'MDPI',
        fullName: 'Multidisciplinary Digital Publishing Institute',
        confidence: 'high',
        type: 'publisher'
    },
    FRONTIERS: {
        domains: ['frontiersin.org'],
        name: 'Frontiers',
        fullName: 'Frontiers Media',
        confidence: 'high',
        type: 'publisher'
    },
    BIOMEDCENTRAL: {
        domains: ['biomedcentral.com', 'jbiomedsem.biomedcentral.com'],
        name: 'BioMed Central',
        fullName: 'BioMed Central Ltd.',
        confidence: 'high',
        type: 'publisher'
    },
    TAYLOR_FRANCIS: {
        domains: ['tandfonline.com'],
        name: 'Taylor & Francis',
        fullName: 'Taylor & Francis Group',
        confidence: 'high',
        type: 'publisher'
    },
    SAGE: {
        domains: ['sagepub.com'],
        name: 'SAGE',
        fullName: 'SAGE Publications',
        confidence: 'high',
        type: 'publisher'
    },
    OXFORD: {
        domains: ['oxford.com', 'oup.com'],
        name: 'Oxford',
        fullName: 'Oxford University Press',
        confidence: 'very-high',
        type: 'publisher'
    },
    CAMBRIDGE: {
        domains: ['cambridge.org'],
        name: 'Cambridge',
        fullName: 'Cambridge University Press',
        confidence: 'very-high',
        type: 'publisher'
    },
    MIT_PRESS: {
        domains: ['mitpress.mit.edu'],
        name: 'MIT Press',
        fullName: 'MIT Press',
        confidence: 'high',
        type: 'publisher'
    },
    RESEARCHGATE: {
        domains: ['researchgate.net'],
        name: 'ResearchGate',
        fullName: 'ResearchGate GmbH',
        confidence: 'medium',
        type: 'platform'
    },
    GOOGLE_SCHOLAR: {
        domains: ['scholar.google.com'],
        name: 'Google Scholar',
        fullName: 'Google Scholar',
        confidence: 'medium',
        type: 'search_engine'
    },
    SEMANTIC_SCHOLAR: {
        domains: ['semanticscholar.org'],
        name: 'Semantic Scholar',
        fullName: 'Semantic Scholar',
        confidence: 'medium',
        type: 'search_engine'
    }
};

/**
 * Comprehensive Academic Keywords for Content Detection
 */
export const ACADEMIC_KEYWORDS = {
    PAPER_TYPES: [
        'paper', 'article', 'research', 'study', 'journal', 'conference',
        'proceedings', 'publication', 'manuscript', 'thesis', 'dissertation',
        'report', 'working paper', 'technical report', 'white paper'
    ],
    
    RESEARCH_TERMS: [
        'abstract', 'introduction', 'methodology', 'methods', 'results', 'conclusion',
        'discussion', 'analysis', 'evaluation', 'experiment', 'survey',
        'review', 'systematic', 'meta-analysis', 'case study', 'empirical',
        'theoretical', 'experimental', 'qualitative', 'quantitative', 'mixed methods'
    ],
    
    TECHNICAL_TERMS: [
        'algorithm', 'model', 'framework', 'approach', 'method', 'technique',
        'implementation', 'application', 'optimization', 'simulation',
        'computational', 'mathematical', 'statistical', 'novel', 'improved',
        'enhanced', 'efficient', 'robust', 'scalable', 'prototype'
    ],
    
    AI_ML_TERMS: [
        'machine learning', 'deep learning', 'artificial intelligence',
        'neural network', 'classification', 'prediction', 'detection',
        'recognition', 'mining', 'learning', 'training', 'inference',
        'supervised', 'unsupervised', 'reinforcement', 'convolutional',
        'recurrent', 'transformer', 'attention', 'feature extraction'
    ],
    
    DATA_TERMS: [
        'data', 'dataset', 'database', 'big data', 'analytics', 'processing',
        'analysis', 'mining', 'extraction', 'transformation', 'visualization',
        'preprocessing', 'feature selection', 'dimensionality reduction',
        'clustering', 'regression', 'correlation', 'statistics'
    ],
    
    RESEARCH_QUALITY_INDICATORS: [
        'hypothesis', 'objective', 'research question', 'literature review',
        'related work', 'state of the art', 'contribution', 'novelty',
        'significance', 'validation', 'evaluation', 'baseline', 'comparison',
        'performance', 'accuracy', 'precision', 'recall', 'f1-score',
        'cross-validation', 'statistical significance', 'p-value'
    ],
    
    ACADEMIC_SECTIONS: [
        'abstract', 'introduction', 'related work', 'background', 'methodology',
        'methods', 'approach', 'design', 'implementation', 'experiments',
        'results', 'findings', 'evaluation', 'discussion', 'analysis',
        'conclusion', 'future work', 'limitations', 'acknowledgments',
        'references', 'bibliography', 'appendix'
    ],
    
    CITATION_INDICATORS: [
        'et al', 'ibid', 'op cit', 'cited', 'reference', 'bibliography',
        'according to', 'as shown by', 'previous work', 'prior research',
        'recent studies', 'literature shows', 'research indicates'
    ]
};

/**
 * Validation Quality Levels with Enhanced Descriptions
 */
export const VALIDATION_QUALITY = {
    EXCELLENT: {
        min: 85,
        label: 'Excellent',
        color: '#22c55e',
        bgColor: '#d4edda',
        borderColor: '#c3e6cb',
        icon: '✅',
        description: 'Perfect for automatic annotation - all requirements met'
    },
    GOOD: {
        min: 70,
        label: 'Good',
        color: '#3b82f6',
        bgColor: '#cce7ff',
        borderColor: '#99d3ff',
        icon: '👍',
        description: 'Suitable for automatic annotation - minor manual review may be needed'
    },
    FAIR: {
        min: 50,
        label: 'Fair',
        color: '#f59e0b',
        bgColor: '#fff3cd',
        borderColor: '#ffeaa7',
        icon: '⚠️',
        description: 'Can proceed with analysis - manual verification recommended'
    },
    POOR: {
        min: 30,
        label: 'Poor',
        color: '#ef4444',
        bgColor: '#f8d7da',
        borderColor: '#f5c6cb',
        icon: '❌',
        description: 'Quality issues detected - may require significant manual input'
    },
    FAILED: {
        min: 0,
        label: 'Failed',
        color: '#6b7280',
        bgColor: '#f3f4f6',
        borderColor: '#d1d5db',
        icon: '💥',
        description: 'Cannot be processed automatically - critical issues detected'
    }
};

/**
 * Enhanced Page Type Classifications
 */
export const PAGE_TYPES = {
    ACADEMIC_PAPER: {
        id: 'academic_paper',
        label: 'Academic Paper',
        description: 'Recognized academic paper from established publisher',
        icon: '📄',
        confidence: 'very-high',
        recommendation: 'automatic',
        processingDifficulty: 'easy'
    },
    ACADEMIC_CONTENT: {
        id: 'academic_content',
        label: 'Academic Content',
        description: 'Academic content with good structure and metadata',
        icon: '📚',
        confidence: 'high',
        recommendation: 'automatic',
        processingDifficulty: 'easy'
    },
    RESEARCH_ARTICLE: {
        id: 'research_article',
        label: 'Research Article',
        description: 'Research article with DOI and academic structure',
        icon: '📖',
        confidence: 'medium-high',
        recommendation: 'automatic',
        processingDifficulty: 'medium'
    },
    PDF_DOCUMENT: {
        id: 'pdf_document',
        label: 'PDF Document',
        description: 'PDF format - requires alternative HTML source',
        icon: '📄',
        confidence: 'not-applicable',
        recommendation: 'find-alternative',
        processingDifficulty: 'impossible'
    },
    GENERAL_WEB_PAGE: {
        id: 'general_web_page',
        label: 'Web Page',
        description: 'General web page with limited academic indicators',
        icon: '🌐',
        confidence: 'low',
        recommendation: 'manual',
        processingDifficulty: 'hard'
    },
    VALIDATION_FAILED: {
        id: 'validation_failed',
        label: 'Validation Failed',
        description: 'Could not complete validation process',
        icon: '❌',
        confidence: 'none',
        recommendation: 'retry',
        processingDifficulty: 'unknown'
    }
};

/**
 * Enhanced DOI Patterns for Recognition
 */
export const DOI_PATTERNS = [
    /(?:doi:?\s*)?10\.\d{4,}(?:\.\d+)*\/[^\s<>"'\)]+/gi,
    /https?:\/\/(?:dx\.)?doi\.org\/10\.\d{4,}(?:\.\d+)*\/[^\s<>"'\)]+/gi,
    /(?:DOI:?\s*)?10\.\d{4,}(?:\.\d+)*\/[^\s<>"'\)]+/gi
];

/**
 * Comprehensive Metadata Selectors for Extraction
 */
export const METADATA_SELECTORS = {
    TITLE: [
        'meta[name="citation_title"]',
        'meta[property="og:title"]',
        'meta[name="dc.title"]',
        'meta[name="title"]',
        'meta[property="article:title"]',
        'h1.article-title',
        'h1.paper-title',
        '.title h1',
        'h1'
    ],
    AUTHORS: [
        'meta[name="citation_author"]',
        'meta[name="dc.creator"]',
        'meta[name="author"]',
        'meta[property="article:author"]',
        '.authors .author',
        '.author-list .author',
        '.byline .author',
        '.citation-author'
    ],
    ABSTRACT: [
        'meta[name="citation_abstract"]',
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="dc.description"]',
        '.abstract .content',
        '.abstract-text',
        '#abstract',
        '.summary'
    ],
    DOI: [
        'meta[name="citation_doi"]',
        'meta[name="dc.identifier.doi"]',
        'meta[name="doi"]',
        'meta[property="article:doi"]'
    ],
    JOURNAL: [
        'meta[name="citation_journal_title"]',
        'meta[name="citation_conference_title"]',
        'meta[name="dc.source"]',
        'meta[property="article:journal"]'
    ],
    DATE: [
        'meta[name="citation_publication_date"]',
        'meta[name="citation_date"]',
        'meta[name="dc.date"]',
        'meta[name="date"]',
        'meta[property="article:published_time"]'
    ],
    PUBLISHER: [
        'meta[name="citation_publisher"]',
        'meta[name="dc.publisher"]',
        'meta[property="article:publisher"]'
    ],
    KEYWORDS: [
        'meta[name="keywords"]',
        'meta[name="citation_keywords"]',
        'meta[property="article:tag"]'
    ]
};

/**
 * Enhanced Validation Check Categories with Proper Weights
 */
export const VALIDATION_CATEGORIES = {
    DOCUMENT_TYPE: {
        id: 'document_type',
        name: 'Document Format',
        icon: 'fas fa-file-alt',
        description: 'Document format compatibility check',
        weight: 25,
        critical: true,
        checks: ['document_type']
    },
    METADATA: {
        id: 'metadata',
        name: 'Metadata Availability',
        icon: 'fas fa-tags',
        description: 'Essential paper metadata extraction',
        weight: 30,
        critical: true,
        checks: ['doi_available', 'title_available', 'abstract_available', 'authors_available', 'venue_available']
    },
    ACADEMIC_CONTENT: {
        id: 'academic',
        name: 'Academic Content',
        icon: 'fas fa-graduation-cap',
        description: 'Academic paper structure and content analysis',
        weight: 30,
        critical: true,
        checks: ['academic_sections', 'content_quality', 'media_content']
    },
    ACCESSIBILITY: {
        id: 'accessibility',
        name: 'Accessibility & Format',
        icon: 'fas fa-universal-access',
        description: 'Page accessibility and extraction barriers',
        weight: 15,
        critical: false,
        checks: ['page_accessible', 'extraction_barriers', 'academic_domain']
    }
};

/**
 * Content Analysis Patterns
 */
export const CONTENT_PATTERNS = {
    PDF: /\.pdf(\?|#|$)/i,
    DOI: /10\.\d{4,}\/[^\s]+/g,
    ARXIV_ID: /\d{4}\.\d{4,5}(v\d+)?/g,
    PMID: /PMID:\s*(\d+)/i,
    ISBN: /ISBN[-\s]*([\d-]+)/i,
    ISSN: /ISSN[-\s]*([\d-]+)/i,
    CITATION_PATTERN: /\[\d+\]|\(\d{4}\)|et\s+al\.?/gi,
    SECTION_PATTERN: /^\d+\.?\s*[A-Z][a-z\s]+$/,
    FIGURE_PATTERN: /figure\s*\d+/gi,
    TABLE_PATTERN: /table\s*\d+/gi
};

/**
 * Academic Section Patterns for Content Analysis
 */
export const ACADEMIC_SECTION_PATTERNS = {
    ABSTRACT: {
        patterns: [/^(abstract|summary)$/i],
        required: true,
        weight: 20,
        minWords: 100
    },
    INTRODUCTION: {
        patterns: [/^(introduction|intro)$/i, /^1\.?\s*(introduction|intro)/i],
        required: true,
        weight: 15,
        minWords: 200
    },
    METHODOLOGY: {
        patterns: [/^(method|methodology|methods|approach)$/i, /^\d+\.?\s*(method|methodology|methods|approach)/i],
        required: true,
        weight: 20,
        minWords: 300
    },
    RESULTS: {
        patterns: [/^(result|results|findings|experiment)$/i, /^\d+\.?\s*(result|results|findings|experiment)/i],
        required: true,
        weight: 20,
        minWords: 200
    },
    DISCUSSION: {
        patterns: [/^(discussion|analysis)$/i, /^\d+\.?\s*(discussion|analysis)/i],
        required: false,
        weight: 10,
        minWords: 150
    },
    CONCLUSION: {
        patterns: [/^(conclusion|conclusions|summary)$/i, /^\d+\.?\s*(conclusion|conclusions|summary)/i],
        required: true,
        weight: 15,
        minWords: 100
    },
    RELATED_WORK: {
        patterns: [/^(related work|literature review|background)$/i, /^\d+\.?\s*(related work|literature review|background)/i],
        required: false,
        weight: 10,
        minWords: 200
    },
    EVALUATION: {
        patterns: [/^(evaluation|experiments)$/i, /^\d+\.?\s*(evaluation|experiments)/i],
        required: false,
        weight: 10,
        minWords: 150
    }
};

/**
 * Media Content Analysis Configuration
 */
export const MEDIA_ANALYSIS_CONFIG = {
    IMAGE_SELECTORS: [
        'img',
        'figure img',
        '.figure img',
        '.image img'
    ],
    TABLE_SELECTORS: [
        'table',
        '.table',
        'figure table'
    ],
    CAPTION_SELECTORS: [
        'figcaption',
        'caption',
        '.caption',
        '.figure-caption',
        '.table-caption'
    ],
    SECTION_SELECTORS: [
        'section',
        '.section',
        'article',
        '.article-section'
    ]
};

/**
 * Extraction Barrier Detection Patterns
 */
export const EXTRACTION_BARRIERS = {
    LOGIN_INDICATORS: [
        'sign in', 'log in', 'login', 'sign up', 'register',
        'subscription required', 'access denied', 'unauthorized',
        'please login', 'member access', 'institutional access',
        'create account', 'free trial', 'premium access'
    ],
    PAYWALL_INDICATORS: [
        'paywall', 'subscribe', 'purchase', 'buy access',
        'premium content', 'paid content', 'subscription',
        'upgrade', 'unlock', 'full access', 'complete article'
    ],
    RATE_LIMIT_INDICATORS: [
        'rate limit', 'too many requests', '429', 'throttled',
        'request limit', 'quota exceeded', 'api limit'
    ],
    CONTENT_BLOCKING_INDICATORS: [
        'javascript required', 'enable javascript', 'cookies required',
        'browser not supported', 'outdated browser'
    ]
};

/**
 * Content Quality Thresholds
 */
export const CONTENT_QUALITY_THRESHOLDS = {
    MIN_WORD_COUNT: 1500,
    OPTIMAL_WORD_COUNT: 3000,
    MIN_SECTIONS: 3,
    OPTIMAL_SECTIONS: 5,
    MIN_ACADEMIC_KEYWORDS: 5,
    OPTIMAL_ACADEMIC_KEYWORDS: 15,
    MIN_CITATIONS: 1,
    OPTIMAL_CITATIONS: 10
};

/**
 * Error Types for Validation
 */
export const VALIDATION_ERROR_TYPES = {
    PDF_DOCUMENT: 'PDF_DOCUMENT',
    MISSING_METADATA: 'MISSING_METADATA',
    NO_ACADEMIC_STRUCTURE: 'NO_ACADEMIC_STRUCTURE',
    EXTRACTION_BARRIERS: 'EXTRACTION_BARRIERS',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PERMISSION_ERROR: 'PERMISSION_ERROR',
    CONTENT_BLOCKED: 'CONTENT_BLOCKED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Button Configurations for Different Validation States
 */
export const VALIDATION_BUTTON_CONFIGS = {
    CAN_PROCEED: {
        id: 'start-analysis-btn',
        text: 'Start Analysis',
        icon: 'fas fa-play',
        class: 'btn-primary',
        description: 'Begin automatic annotation workflow'
    },
    QUALITY_ISSUES: {
        id: 'retry-validation-btn',
        text: 'Retry Analysis',
        icon: 'fas fa-redo',
        class: 'btn-primary',
        description: 'Retry page validation'
    },
    CANNOT_PROCEED: {
        id: 'find-alternative-btn',
        text: 'Find Alternative Source',
        icon: 'fas fa-search',
        class: 'btn-secondary',
        description: 'Search for alternative HTML sources'
    },
    REFRESH_PAGE: {
        id: 'refresh-page-btn',
        text: 'Refresh Page',
        icon: 'fas fa-refresh',
        class: 'btn-secondary',
        description: 'Refresh the current page'
    }
};

/**
 * Progress Steps for Validation Process
 */
export const VALIDATION_PROGRESS_STEPS = {
    DOCUMENT_TYPE_CHECK: {
        step: 'document_type_check',
        label: 'Checking Document Format',
        progress: 20,
        description: 'Verifying document is in HTML format'
    },
    METADATA_CHECK: {
        step: 'metadata_check',
        label: 'Extracting Metadata',
        progress: 40,
        description: 'Fetching paper metadata from APIs and DOM'
    },
    ACADEMIC_CONTENT_CHECK: {
        step: 'academic_content_check',
        label: 'Analyzing Academic Content',
        progress: 60,
        description: 'Scanning paper structure and content quality'
    },
    ACCESSIBILITY_CHECKS: {
        step: 'accessibility_checks',
        label: 'Checking Accessibility',
        progress: 80,
        description: 'Verifying page accessibility and extraction barriers'
    },
    FINALIZING: {
        step: 'finalizing',
        label: 'Finalizing Analysis',
        progress: 100,
        description: 'Completing validation and generating report'
    }
};

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
    VALIDATION_TTL: 5 * 60 * 1000, // 5 minutes
    METADATA_TTL: 30 * 60 * 1000, // 30 minutes
    CONTENT_TTL: 10 * 60 * 1000, // 10 minutes
    MAX_CACHE_SIZE: 100
};

/**
 * API Configuration
 */
export const API_CONFIG = {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    MAX_CONCURRENT_REQUESTS: 5
};

/**
 * Events for Validation Process
 */
export const VALIDATION_EVENTS = {
    VALIDATION_STARTED: 'validation:started',
    VALIDATION_PROGRESS: 'validation:progress',
    VALIDATION_COMPLETED: 'validation:completed',
    VALIDATION_FAILED: 'validation:failed',
    METADATA_EXTRACTED: 'metadata:extracted',
    PAPER_CONTENT_EXTRACTED: 'paper_content:extracted',
    DOCUMENT_TYPE_CHECKED: 'document_type:checked',
    ACADEMIC_STRUCTURE_ANALYZED: 'academic_structure:analyzed'
};

/**
 * Validation Weights for Scoring
 */
export const VALIDATION_WEIGHTS = {
    DOCUMENT_TYPE: 25,
    METADATA_AVAILABILITY: 30,
    ACADEMIC_CONTENT: 30,
    ACCESSIBILITY: 15
};

/**
 * Time Constants
 */
export const TIME_CONSTANTS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000
};

/**
 * Export all constants as named exports
 */
export {
    APP_CONFIG as default,
    // VALIDATION_QUALITY,
    // PAGE_TYPES,
    // ACADEMIC_KEYWORDS,
    // DOI_PATTERNS,
    // METADATA_SELECTORS,
    // VALIDATION_CATEGORIES,
    // CONTENT_PATTERNS,
    // ACADEMIC_SECTION_PATTERNS,
    // MEDIA_ANALYSIS_CONFIG,
    // EXTRACTION_BARRIERS,
    // CONTENT_QUALITY_THRESHOLDS,
    // VALIDATION_ERROR_TYPES,
    // VALIDATION_BUTTON_CONFIGS,
    // CACHE_CONFIG,
    // API_CONFIG,
    // VALIDATION_EVENTS,
    // VALIDATION_WEIGHTS,
    // TIME_CONSTANTS
};
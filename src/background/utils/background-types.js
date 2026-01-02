// ================================
// src/background/utils/background-types.js
// Type definitions and constants for background scripts
// ================================

var BackgroundTypes = (function() {
    'use strict';
    
    // Message action types
    const MESSAGE_ACTIONS = {
        // Tab management
        GET_TAB_INFO: 'GET_TAB_INFO',
        
        // Workflow state
        SAVE_WORKFLOW_STATE: 'SAVE_WORKFLOW_STATE',
        LOAD_WORKFLOW_STATE: 'LOAD_WORKFLOW_STATE',
        CLEAR_WORKFLOW_STATE: 'CLEAR_WORKFLOW_STATE',
        
        // Window persistence
        SET_WINDOW_PERSISTENCE: 'SET_WINDOW_PERSISTENCE',
        
        // Image/Marker operations
        ADD_IMAGE_TO_ORKG: 'ADD_IMAGE_TO_ORKG',
        REMOVE_IMAGE_FROM_ORKG: 'REMOVE_IMAGE_FROM_ORKG',
        ACTIVATE_MARKERS: 'ACTIVATE_MARKERS',
        GET_ANALYZER_STATE: 'GET_ANALYZER_STATE',
        
        // Extraction operations
        EXTRACT_TEXT: 'EXTRACT_TEXT',
        EXTRACT_TABLES: 'EXTRACT_TABLES',
        EXTRACT_ALL: 'EXTRACT_ALL',
        
        // Property operations
        FETCH_ORKG_PROPERTIES: 'FETCH_ORKG_PROPERTIES',
        GET_AI_PROPERTY_SUGGESTIONS: 'GET_AI_PROPERTY_SUGGESTIONS',
        GET_COMMON_PROPERTIES: 'GET_COMMON_PROPERTIES',
        GET_FIELD_PROPERTIES: 'GET_FIELD_PROPERTIES',
        CREATE_PROPERTY: 'CREATE_PROPERTY',
        PROPERTY_SELECTED: 'PROPERTY_SELECTED',
        GET_PROPERTY_SUGGESTIONS: 'GET_PROPERTY_SUGGESTIONS',
        SEARCH_ORKG_PROPERTIES: 'SEARCH_ORKG_PROPERTIES',
        
        // Highlighting
        HIGHLIGHT_SELECTION: 'HIGHLIGHT_SELECTION',
        SHOW_PROPERTY_MODAL: 'SHOW_PROPERTY_MODAL',
        APPLY_HIGHLIGHT: 'APPLY_HIGHLIGHT',
        
        // System
        CONTENT_SCRIPT_READY: 'CONTENT_SCRIPT_READY',
        PING: 'PING'
    };
    
    // Storage keys
    const STORAGE_KEYS = {
        WORKFLOW_STATE_PREFIX: 'workflowState_',
        ANALYSIS_RESULTS: 'analysisResults',
        ANALYSIS_TIMESTAMP: 'analysisResultsTimestamp',
        TEXT_HIGHLIGHTS: 'textHighlights',
        ORKG_SETTINGS: 'orkg-settings',
        TAB_STATES: 'tabStates'
    };
    
    // Default configurations
    const DEFAULT_CONFIGS = {
        IMAGE_EXTRACTION: {
            minWidth: 100,
            minHeight: 100,
            maxImages: 500,
            includeDataUrls: true,
            includeSvg: true,
            includeCanvas: true
        },
        
        TEXT_EXTRACTION: {
            includeHeaders: true,
            includeParagraphs: true,
            minLength: 50,
            maxSections: 100
        },
        
        TABLE_EXTRACTION: {
            minRows: 2,
            minColumns: 2,
            includeHeaders: true,
            maxTables: 50
        },
        
        MARKER_CONFIG: {
            types: ['image'],
            minScore: 0.3,
            autoActivate: true
        },
        
        PROPERTY_SEARCH: {
            maxResults: 20,
            cacheTimeout: 300000, // 5 minutes
            fallbackEnabled: true
        },
        
        HIGHLIGHT_CONFIG: {
            maxHighlights: 1000,
            colors: [
                '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
                '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3',
                '#87CEEB', '#FFA07A'
            ]
        }
    };
    
    // Error messages
    const ERROR_MESSAGES = {
        NO_TAB: 'No tab available',
        NO_TAB_ID: 'No tab ID provided',
        INVALID_TAB: 'Invalid tab ID',
        TAB_NOT_FOUND: 'Tab not found',
        EXTRACTION_IN_PROGRESS: 'Extraction already in progress',
        INVALID_URL: 'Cannot extract from browser internal pages',
        SERVICE_NOT_INITIALIZED: 'Service not initialized',
        CONTENT_SCRIPT_FAILED: 'Failed to inject content script',
        STORAGE_ERROR: 'Storage operation failed',
        NETWORK_ERROR: 'Network request failed'
    };
    
    // State structure templates
    const STATE_TEMPLATES = {
        TAB_STATE: {
            workflowStep: 'welcome',
            analysisData: null,
            metadata: null,
            lastActivity: null,
            isAnalysisComplete: false,
            markerImages: [],
            extractedTables: [],
            extractedText: [],
            textHighlights: []
        },
        
        EXTENSION_STATE: {
            isPopupOpen: false,
            currentTab: null,
            windowId: null,
            lastActiveTab: null,
            isWindowPersistenceEnabled: true
        },
        
        ANALYSIS_RESULTS: {
            text: {},
            images: [],
            markerImages: [],
            tables: [],
            texts: [],
            textHighlights: []
        },
        
        HIGHLIGHT_DATA: {
            id: null,
            text: '',
            property: null,
            color: '',
            timestamp: null,
            url: '',
            title: '',
            tabId: null,
            createdAt: null
        },
        
        EXTRACTION_RESULT: {
            data: {
                images: [],
                text: {},
                tables: []
            },
            metadata: {
                extractedFrom: '',
                extractedAt: '',
                tabTitle: '',
                tabId: null
            },
            summary: {
                images: { count: 0, withCaptions: 0 },
                text: { sections: 0, totalWords: 0 },
                tables: { count: 0, totalRows: 0 }
            }
        }
    };
    
    // Color mappings for properties
    const PROPERTY_COLORS = {
        'method': '#9C27B0',
        'methodology': '#9C27B0',
        'result': '#4CAF50',
        'finding': '#4CAF50',
        'dataset': '#2196F3',
        'data': '#2196F3',
        'model': '#FF9800',
        'algorithm': '#FF5722',
        'evaluation': '#00BCD4',
        'performance': '#009688',
        'baseline': '#795548',
        'contribution': '#8BC34A',
        'limitation': '#FFC107',
        'future': '#607D8B',
        'related': '#E91E63',
        'conclusion': '#FF9800',
        'problem': '#F44336',
        'background': '#795548'
    };
    
    // Fallback predicates
    const FALLBACK_PREDICATES = [
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
    
    // Context menu IDs
    const CONTEXT_MENU_IDS = {
        ANNOTATE_PAGE: 'orkg-annotate-page',
        HIGHLIGHT: 'orkg-highlight',
        HIGHLIGHT_SEPARATOR_TOP: 'orkg-highlight-separator-top',
        HIGHLIGHT_CUSTOM: 'orkg-highlight-custom',
        HIGHLIGHT_SEPARATOR_MIDDLE: 'orkg-highlight-separator-middle',
        HIGHLIGHT_QUICK: 'orkg-highlight-quick',
        QUICK_PREFIX: 'orkg-quick-',
        QUICK_FALLBACK_PREFIX: 'orkg-quick-fallback-'
    };
    
    // Utility functions
    function createTabState() {
        return JSON.parse(JSON.stringify(STATE_TEMPLATES.TAB_STATE));
    }
    
    function createExtensionState() {
        return JSON.parse(JSON.stringify(STATE_TEMPLATES.EXTENSION_STATE));
    }
    
    function createAnalysisResults() {
        return JSON.parse(JSON.stringify(STATE_TEMPLATES.ANALYSIS_RESULTS));
    }
    
    function createHighlightData(data) {
        var highlight = JSON.parse(JSON.stringify(STATE_TEMPLATES.HIGHLIGHT_DATA));
        if (data) {
            Object.keys(data).forEach(function(key) {
                if (highlight.hasOwnProperty(key)) {
                    highlight[key] = data[key];
                }
            });
        }
        return highlight;
    }
    
    function createExtractionResult() {
        return JSON.parse(JSON.stringify(STATE_TEMPLATES.EXTRACTION_RESULT));
    }
    
    function generateId(prefix) {
        return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    function isValidTab(tab) {
        if (!tab || !tab.url) return false;
        if (tab.url.startsWith('chrome://')) return false;
        if (tab.url.startsWith('chrome-extension://')) return false;
        if (tab.url.startsWith('edge://')) return false;
        if (tab.url.startsWith('about:')) return false;
        return true;
    }
    
    function getStorageKey(type, id) {
        return STORAGE_KEYS[type + '_PREFIX'] ? STORAGE_KEYS[type + '_PREFIX'] + id : type;
    }
    
    // Public API
    return {
        MESSAGE_ACTIONS: MESSAGE_ACTIONS,
        STORAGE_KEYS: STORAGE_KEYS,
        DEFAULT_CONFIGS: DEFAULT_CONFIGS,
        ERROR_MESSAGES: ERROR_MESSAGES,
        STATE_TEMPLATES: STATE_TEMPLATES,
        PROPERTY_COLORS: PROPERTY_COLORS,
        FALLBACK_PREDICATES: FALLBACK_PREDICATES,
        CONTEXT_MENU_IDS: CONTEXT_MENU_IDS,
        
        // Factory functions
        createTabState: createTabState,
        createExtensionState: createExtensionState,
        createAnalysisResults: createAnalysisResults,
        createHighlightData: createHighlightData,
        createExtractionResult: createExtractionResult,
        
        // Utility functions
        generateId: generateId,
        isValidTab: isValidTab,
        getStorageKey: getStorageKey
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.BackgroundTypes = BackgroundTypes;
}
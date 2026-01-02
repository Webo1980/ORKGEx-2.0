// ================================
// src/core/content/AnalysisStep.js - Updated with generic extraction
// ================================

import { eventManager } from '../../utils/eventManager.js';
import ImageAnalyzer from './analyzers/ImageAnalyzer.js';
import { TableAnalyzer } from './analyzers/TableAnalyzer.js';

export class AnalysisStep {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.currentTab = 'text';
        this.markersActivated = false;
        
        // Extraction state for all types
        this.extractionState = {
            isExtracting: false,
            extractionType: null, // 'text', 'images', 'tables', 'all'
            progress: 0,
            currentPhase: null,
            logs: []
        };
        
        // Results storage
        this.analysisResults = {
            text: {},
            images: [],
            tables: [],
            markerImages: []
        };
        
        // Tab configurations
        this.tabs = [
            {
                id: 'text',
                label: 'Text Content',
                icon: 'fa-file-alt',
                description: 'Extracted text sections'
            },
            {
                id: 'images',
                label: 'Images',
                icon: 'fa-images',
                description: 'Collect figures using markers'
            },
            {
                id: 'tables',
                label: 'Tables',
                icon: 'fa-table',
                description: 'Extract data tables'
            }
        ];
        
        this.services = {};
        this.analyzers = {
            images: null,
            tables: null
        };
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🔬 Initializing AnalysisStep...');
            
            this.initializeServices();
            this.initializeAnalyzers();
            this.setupEventListeners();
            
            await this.loadExistingResults();
            
            this.isInitialized = true;
            console.log('✅ AnalysisStep initialized');
        } catch (error) {
            console.error('❌ AnalysisStep initialization failed:', error);
            throw error;
        }
    }
    
    initializeServices() {
        const serviceManager = window.serviceManager;
        if (serviceManager) {
            this.services = {
                stateManager: serviceManager.getService('stateManager'),
                workflowState: serviceManager.getService('workflowState'),
                toastManager: serviceManager.getService('toastManager')
            };
        }
    }
    
    initializeAnalyzers() {
        // Initialize image and table analyzers for display only
        this.analyzers.images = new ImageAnalyzer({ 
            services: this.services,
            onExtract: () => this.startExtraction('images')
        });
        
        this.analyzers.tables = new TableAnalyzer({ 
            services: this.services,
            onExtract: () => this.startExtraction('tables')
        });
    }
    
    setupEventListeners() {
        // Listen for extraction messages from background
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch(request.action) {
                case 'EXTRACTION_PROGRESS':
                    this.handleExtractionProgress(request);
                    break;
                    
                case 'EXTRACTION_COMPLETE':
                    this.handleExtractionComplete(request);
                    break;
                    
                case 'EXTRACTION_ERROR':
                    this.handleExtractionError(request.error);
                    break;
                    
                case 'MARKERS_ACTIVATED':
                    this.handleMarkersActivated(request);
                    break;
                    
                case 'IMAGE_ADDED_TO_ANALYZER':
                    this.handleMarkerImageAdded(request.data);
                    break;
            }
            sendResponse({ received: true });
            return false;
        });
        
        // Listen for workflow step changes
        eventManager.on('workflow:step_changed', (data) => {
            if (data.currentStep === 'analysis' || data.step === 'analysis') {
                this.load();
            }
        });
    }
    
    async load() {
        if (!this.isInitialized) await this.init();
        
        try {
            console.log('🔬 Loading AnalysisStep...');
            
            // First, activate image markers on the page
            await this.activateImageMarkers();
            
            // Check if we should auto-start text extraction
            if (await this.shouldAutoStartExtraction()) {
                await this.startExtraction('text');
                return; // Will render loading state
            }
            
            // Normal load
            this.render();
            
        } catch (error) {
            console.error('Failed to load analysis step:', error);
            this.renderError(error);
        }
    }
    
    async shouldAutoStartExtraction() {
        // Auto-start if we have a template and no text results
        const template = this.getSelectedTemplate();
        const hasTemplate = template?.properties?.length > 0;
        const hasTextResults = Object.keys(this.analysisResults.text).length > 0;
        
        return hasTemplate && !hasTextResults && !this.extractionState.isExtracting;
    }
    
    async activateImageMarkers() {
        if (this.markersActivated) {
            console.log('📍 Markers already activated');
            return;
        }
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) return;
            
            console.log('🎯 Activating image markers on page...');
            
            // Send message to background to activate markers
            chrome.runtime.sendMessage({
                action: 'CONTENT_EXTRACTION',
                extractionType: 'activate_markers',
                tabId: tab.id
            }, (response) => {
                if (response?.success) {
                    console.log('✅ Image markers activation requested');
                }
            });
            
        } catch (error) {
            console.error('Failed to activate markers:', error);
        }
    }
    
    async startExtraction(extractionType = 'text') {
        if (this.extractionState.isExtracting) {
            console.log('⏳ Extraction already in progress');
            return;
        }
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error('No active tab found');
            
            // For text extraction, require template
            if (extractionType === 'text') {
                const template = this.getSelectedTemplate();
                if (!template?.properties?.length) {
                    this.services.toastManager?.warning('Please select a template first');
                    this.render();
                    return;
                }
            }
            
            console.log(`🚀 Starting ${extractionType} extraction`);
            
            // Update state
            this.extractionState = {
                isExtracting: true,
                extractionType: extractionType,
                progress: 0,
                currentPhase: 'initializing',
                logs: []
            };
            
            // Show loading state
            this.renderExtractionLoading();
            
            // Prepare extraction config
            const config = {
                action: 'CONTENT_EXTRACTION',
                extractionType: extractionType,
                tabId: tab.id
            };
            
            // Add template for text extraction
            if (extractionType === 'text') {
                config.template = this.getSelectedTemplate();
            }
            
            // Send message to background
            chrome.runtime.sendMessage(config, (response) => {
                if (chrome.runtime.lastError) {
                    this.handleExtractionError(chrome.runtime.lastError);
                } else if (!response?.success) {
                    this.handleExtractionError(response?.error || 'Failed to start extraction');
                }
            });
            
        } catch (error) {
            this.handleExtractionError(error);
        }
    }
    
    handleExtractionProgress(data) {
        console.log('📊 Extraction Progress:', data);
        
        this.extractionState.progress = data.progress || 0;
        this.extractionState.currentPhase = data.phase || 'processing';
        
        if (data.message) {
            this.extractionState.logs.push({
                timestamp: Date.now(),
                message: data.message,
                type: data.type || 'info'
            });
        }
        
        // Update UI
        this.updateExtractionProgress();
    }
    
    handleExtractionComplete(data) {
        console.log('✅ Extraction complete:', data);
        
        const extractionType = data.extractionType || this.extractionState.extractionType;
        
        // Store results based on type
        switch(extractionType) {
            case 'text':
                this.analysisResults.text = data.sections || {};
                const sectionCount = Object.keys(data.sections || {}).length;
                this.services.toastManager?.success(`Extracted ${sectionCount} text sections`);
                break;
                
            case 'images':
                this.analysisResults.images = data.images || [];
                this.services.toastManager?.success(`Found ${data.images?.length || 0} images`);
                break;
                
            case 'tables':
                this.analysisResults.tables = data.tables || [];
                this.services.toastManager?.success(`Extracted ${data.tables?.length || 0} tables`);
                break;
                
            case 'all':
                this.analysisResults.text = data.text?.sections || {};
                this.analysisResults.images = data.images || [];
                this.analysisResults.tables = data.tables || [];
                this.services.toastManager?.success('All content extracted successfully');
                break;
        }
        
        // Update state
        this.extractionState = {
            isExtracting: false,
            extractionType: null,
            progress: 100,
            currentPhase: 'complete',
            logs: []
        };
        
        // Save to storage
        this.saveResults();
        
        // Render results
        this.render();
    }
    
    handleExtractionError(error) {
        console.error('❌ Extraction error:', error);
        
        this.extractionState.isExtracting = false;
        
        const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
        this.services.toastManager?.error(`Extraction failed: ${errorMessage}`);
        
        this.render();
    }
    
    handleMarkersActivated(data) {
        console.log('✅ Markers activated on page');
        this.markersActivated = true;
        
        if (this.services.toastManager) {
            this.services.toastManager.info('Click on images to add them to your collection', 3000);
        }
    }
    
    handleMarkerImageAdded(imageData) {
        console.log('🖼️ Image added from marker:', imageData);
        
        // Add to marker images collection
        const existingIndex = this.analysisResults.markerImages.findIndex(
            img => img.id === imageData.id
        );
        
        if (existingIndex === -1) {
            this.analysisResults.markerImages.push(imageData);
        } else {
            this.analysisResults.markerImages[existingIndex] = imageData;
        }
        
        // Update image analyzer if available
        if (this.analyzers.images?.setMarkerImages) {
            this.analyzers.images.setMarkerImages(this.analysisResults.markerImages);
        }
        
        // Save and update UI
        this.saveResults();
        if (this.currentTab === 'images') {
            this.render();
        }
    }
    
    renderExtractionLoading() {
        if (!this.container) return;
        
        const typeLabels = {
            'text': 'Text Content',
            'images': 'Images',
            'tables': 'Tables',
            'all': 'All Content'
        };
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2><i class="fas fa-microscope"></i> Content Analysis</h2>
                    <p>Extracting ${typeLabels[this.extractionState.extractionType]} from the research paper</p>
                </div>
                
                <div class="extraction-loading">
                    <div class="loading-card">
                        <div class="spinner-container">
                            <i class="fas fa-spinner fa-spin"></i>
                        </div>
                        
                        <h3>Extracting ${typeLabels[this.extractionState.extractionType]}</h3>
                        
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${this.extractionState.progress}%"></div>
                            </div>
                            <div class="progress-info">
                                <span>${this.extractionState.progress}%</span>
                                <span>${this.getPhaseText(this.extractionState.currentPhase)}</span>
                            </div>
                        </div>
                        
                        <div class="logs-container">
                            <div class="logs-header">
                                <i class="fas fa-list"></i>
                                <span>Processing Details</span>
                            </div>
                            <div class="logs-content">
                                ${this.renderLogs()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    updateExtractionProgress() {
        const progressFill = this.container?.querySelector('.progress-fill');
        if (progressFill) {
            progressFill.style.width = `${this.extractionState.progress}%`;
        }
        
        const progressInfo = this.container?.querySelector('.progress-info');
        if (progressInfo) {
            progressInfo.innerHTML = `
                <span>${this.extractionState.progress}%</span>
                <span>${this.getPhaseText(this.extractionState.currentPhase)}</span>
            `;
        }
        
        const logsContent = this.container?.querySelector('.logs-content');
        if (logsContent) {
            logsContent.innerHTML = this.renderLogs();
            logsContent.scrollTop = logsContent.scrollHeight;
        }
    }
    
    render() {
        if (!this.container) return;
        
        if (this.extractionState.isExtracting) {
            this.renderExtractionLoading();
            return;
        }
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2><i class="fas fa-microscope"></i> Content Analysis</h2>
                    <p>Extract and analyze content from the research paper</p>
                    ${this.markersActivated ? `
                        <div class="marker-status">
                            <i class="fas fa-check-circle"></i>
                            <span>Image markers active on page</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="analysis-tabs">
                    <div class="tabs-header">
                        ${this.renderTabButtons()}
                    </div>
                    <div class="tabs-content">
                        ${this.renderTabContent()}
                    </div>
                </div>
                
                ${this.renderActions()}
            </div>
        `;
        
        this.attachEventHandlers();
    }
    
    renderTabButtons() {
        return this.tabs.map(tab => `
            <button class="tab-button ${tab.id === this.currentTab ? 'active' : ''}" 
                    data-tab="${tab.id}">
                <i class="fas ${tab.icon}"></i>
                <span>${tab.label}</span>
                ${this.getTabBadge(tab.id)}
            </button>
        `).join('');
    }
    
    renderTabContent() {
        switch(this.currentTab) {
            case 'text':
                return this.renderTextTab();
            case 'images':
                return this.renderImagesTab();
            case 'tables':
                return this.renderTablesTab();
            default:
                return '<div>Unknown tab</div>';
        }
    }
    
    renderTextTab() {
        const sections = this.analysisResults.text;
        const sectionCount = Object.keys(sections).length;
        
        if (sectionCount === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No Text Extracted</h3>
                    <p>Click the button below to extract text content from the page</p>
                    <button class="btn btn-primary" id="extract-text-btn">
                        <i class="fas fa-play"></i> Extract Text
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="text-results">
                <div class="results-header">
                    <h3>Extracted Sections (${sectionCount})</h3>
                    <button class="btn btn-sm" id="re-extract-text-btn">
                        <i class="fas fa-refresh"></i> Re-extract
                    </button>
                </div>
                
                <div class="sections-list">
                    ${Object.entries(sections).map(([name, content]) => `
                        <div class="section-item">
                            <div class="section-header">
                                <h4>${this.formatSectionName(name)}</h4>
                                <span class="word-count">${content.split(/\\s+/).length} words</span>
                            </div>
                            <div class="section-content">
                                ${this.truncateText(content, 200)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    renderImagesTab() {
        // Use the image analyzer if available, otherwise render simple list
        if (this.analyzers.images) {
            return this.analyzers.images.render();
        }
        
        const imageCount = this.analysisResults.images.length + this.analysisResults.markerImages.length;
        
        if (imageCount === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h3>No Images Collected</h3>
                    <p>Click on images in the page to add them, or extract all images</p>
                    <button class="btn btn-primary" id="extract-images-btn">
                        <i class="fas fa-download"></i> Extract All Images
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="images-results">
                <h3>Collected Images (${imageCount})</h3>
                <div class="images-grid">
                    ${[...this.analysisResults.markerImages, ...this.analysisResults.images]
                        .map(img => `
                            <div class="image-item">
                                <img src="${img.src || img.url}" alt="${img.alt || ''}" />
                            </div>
                        `).join('')}
                </div>
            </div>
        `;
    }
    
    renderTablesTab() {
        // Use the table analyzer if available
        if (this.analyzers.tables) {
            return this.analyzers.tables.render();
        }
        
        const tableCount = this.analysisResults.tables.length;
        
        if (tableCount === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-table"></i>
                    <h3>No Tables Extracted</h3>
                    <p>Click the button below to extract tables from the page</p>
                    <button class="btn btn-primary" id="extract-tables-btn">
                        <i class="fas fa-download"></i> Extract Tables
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="tables-results">
                <h3>Extracted Tables (${tableCount})</h3>
                <div class="tables-list">
                    ${this.analysisResults.tables.map((table, i) => `
                        <div class="table-item">
                            <h4>Table ${i + 1}</h4>
                            <p>${table.caption || 'No caption'}</p>
                            <p>${table.rows?.length || 0} rows × ${table.headers?.length || 0} columns</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    attachEventHandlers() {
        // Tab navigation
        this.container?.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.currentTab = e.currentTarget.dataset.tab;
                this.render();
            });
        });
        
        // Extraction buttons
        const extractTextBtn = this.container?.querySelector('#extract-text-btn');
        if (extractTextBtn) {
            extractTextBtn.addEventListener('click', () => this.startExtraction('text'));
        }
        
        const reExtractTextBtn = this.container?.querySelector('#re-extract-text-btn');
        if (reExtractTextBtn) {
            reExtractTextBtn.addEventListener('click', () => {
                this.analysisResults.text = {};
                this.startExtraction('text');
            });
        }
        
        const extractImagesBtn = this.container?.querySelector('#extract-images-btn');
        if (extractImagesBtn) {
            extractImagesBtn.addEventListener('click', () => this.startExtraction('images'));
        }
        
        const extractTablesBtn = this.container?.querySelector('#extract-tables-btn');
        if (extractTablesBtn) {
            extractTablesBtn.addEventListener('click', () => this.startExtraction('tables'));
        }
        
        // Extract all button
        const extractAllBtn = this.container?.querySelector('#extract-all-btn');
        if (extractAllBtn) {
            extractAllBtn.addEventListener('click', () => this.startExtraction('all'));
        }
    }
    
    // Helper methods
    getSelectedTemplate() {
        const state = this.services?.stateManager?.getState();
        return state?.data?.templateAnalysis?.selectedTemplate || 
               state?.data?.template?.selectedTemplate;
    }
    
    getPhaseText(phase) {
        const phases = {
            'initializing': 'Initializing...',
            'injecting': 'Preparing content script...',
            'extracting': 'Extracting content...',
            'processing': 'Processing with template...',
            'analyzing': 'Analyzing sections...',
            'complete': 'Complete!'
        };
        return phases[phase] || phase || 'Processing...';
    }
    
    renderLogs() {
        if (this.extractionState.logs.length === 0) {
            return '<div class="log-entry">Starting extraction...</div>';
        }
        
        return this.extractionState.logs
            .slice(-10) // Show last 10 logs
            .map(log => `
                <div class="log-entry log-${log.type}">
                    <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span class="log-message">${log.message}</span>
                </div>
            `).join('');
    }
    
    formatSectionName(name) {
        return name.replace(/_/g, ' ')
                  .replace(/\\b\\w/g, l => l.toUpperCase());
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    getTabBadge(tabId) {
        let count = 0;
        if (tabId === 'text') {
            count = Object.keys(this.analysisResults.text).length;
        } else if (tabId === 'images') {
            count = this.analysisResults.images.length + this.analysisResults.markerImages.length;
        } else if (tabId === 'tables') {
            count = this.analysisResults.tables.length;
        }
        return count > 0 ? `<span class="badge">${count}</span>` : '';
    }
    
    renderActions() {
        const hasResults = Object.keys(this.analysisResults.text).length > 0 ||
                          this.analysisResults.images.length > 0 ||
                          this.analysisResults.markerImages.length > 0 ||
                          this.analysisResults.tables.length > 0;
        
        return `
            <div class="analysis-actions">
                <button class="btn btn-secondary" id="extract-all-btn">
                    <i class="fas fa-download"></i> Extract All Content
                </button>
                <button class="btn btn-primary" ${!hasResults ? 'disabled' : ''} id="export-results-btn">
                    <i class="fas fa-file-export"></i> Export Results
                </button>
            </div>
        `;
    }
    
    async loadExistingResults() {
        try {
            const result = await chrome.storage.local.get(['analysisResults']);
            if (result.analysisResults) {
                this.analysisResults = result.analysisResults;
            }
        } catch (error) {
            console.error('Failed to load existing results:', error);
        }
    }
    
    async saveResults() {
        try {
            await chrome.storage.local.set({
                analysisResults: this.analysisResults,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to save results:', error);
        }
    }
    
    renderError(error) {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="error-card">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${error.message || 'An unexpected error occurred'}</p>
            </div>
        `;
    }
}

export default AnalysisStep;
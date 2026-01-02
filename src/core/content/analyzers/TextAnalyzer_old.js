// ================================
// src/core/content/analyzers/TextAnalyzer.js - Fixed Version with RAG Integration
// ================================

import { eventManager } from '../../../utils/eventManager.js';

export class TextAnalyzer {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.isAnalyzing = false;
        this.sections = {};
        this.ragResults = {};
        this.highlights = [];
        this.userSelections = [];
        this.hasExtracted = false;
        this.ragAnalysisStarted = false;
        
        // Services
        this.textExtractionService = null;
        this.ragService = null;
        this.stateManager = null;
        this.toastManager = null;
        this.loadingManager = null;
        this.orkgService = null;
        
        // Bind methods
        this.handleExtractionComplete = this.handleExtractionComplete.bind(this);
        this.handleRAGComplete = this.handleRAGComplete.bind(this);
        this.handleRAGProgress = this.handleRAGProgress.bind(this);
        this.handleRAGError = this.handleRAGError.bind(this);
        this.handlePropertyUpdate = this.handlePropertyUpdate.bind(this);
        this.handleHighlightAdded = this.handleHighlightAdded.bind(this);
        this.startAutomaticAnalysis = this.startAutomaticAnalysis.bind(this);
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('📝 Initializing TextAnalyzer...');
            
            this.initializeServices();
            this.setupEventListeners();
            this.loadCachedData();
            
            this.isInitialized = true;
            console.log('✅ TextAnalyzer initialized');
            
        } catch (error) {
            console.error('❌ TextAnalyzer initialization failed:', error);
            throw error;
        }
    }
    
    initializeServices() {
        const serviceManager = window.serviceManager;
        
        if (serviceManager) {
            this.textExtractionService = serviceManager.getService('textExtractionService');
            this.ragService = serviceManager.getService('ragService');
            this.stateManager = serviceManager.getService('stateManager');
            this.toastManager = serviceManager.getService('toastManager');
            this.loadingManager = serviceManager.getService('loadingManager');
            this.orkgService = serviceManager.getService('orkgService');
        }
    }
    
    setupEventListeners() {
        // Listen for RAG analysis events
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'RAG_PROGRESS') {
                this.handleRAGProgress(request);
            } else if (request.action === 'RAG_ANALYSIS_ERROR') {
                this.handleRAGError(request.error);
            } else if (request.action === 'RAG_ANALYSIS_COMPLETE') {
                this.handleRAGComplete(request.data);
            }
        });
        
        // Listen for internal events
        eventManager.on('text:extracted', this.handleExtractionComplete);
        eventManager.on('text:rag_complete', this.handleRAGComplete);
        eventManager.on('text:property_updated', this.handlePropertyUpdate);
        eventManager.on('text:highlight_added', this.handleHighlightAdded);
    }
    
    loadCachedData() {
        if (!this.stateManager) return;
        
        const state = this.stateManager.getState();
        const textAnalysis = state?.data?.textAnalysis;
        
        if (textAnalysis) {
            this.sections = textAnalysis.sections || {};
            this.ragResults = textAnalysis.ragResults || {};
            this.highlights = textAnalysis.highlights || [];
            this.userSelections = textAnalysis.userSelections || [];
            this.hasExtracted = Object.keys(this.sections).length > 0;
            
            console.log('📝 Loaded cached text analysis data');
        }
    }
    
    render() {
        if (!this.container) {
            console.log('📝 TextAnalyzer render called but container not set yet');
            return '<div class="text-analyzer-pending">Initializing text analyzer...</div>';
        }
        
        // Auto-start analysis on first render if not already done
        if (!this.hasExtracted && !this.isAnalyzing && !this.ragAnalysisStarted) {
            console.log('📝 Auto-starting text analysis...');
            setTimeout(() => this.startAutomaticAnalysis(), 500);
        }
        
        if (this.isAnalyzing) {
            return this.renderAnalyzing();
        }
        
        if (Object.keys(this.ragResults).length > 0) {
            return this.renderResults();
        }
        
        if (Object.keys(this.sections).length > 0) {
            return this.renderSections();
        }
        
        return this.renderEmpty();
    }
    
    renderEmpty() {
        return `
            <div class="text-analyzer-empty">
                <div class="empty-state-card">
                    <div class="empty-icon">
                        <i class="fas fa-file-alt"></i>
                    </div>
                    <h3>Text Analysis</h3>
                    <p>${this.ragAnalysisStarted ? 'Analysis in progress...' : 'Extract text content and analyze with template properties'}</p>
                    <div class="empty-actions">
                        <button class="btn btn-primary" id="start-text-analysis" ${this.ragAnalysisStarted ? 'disabled' : ''}>
                            <i class="fas fa-play"></i>
                            <span>${this.ragAnalysisStarted ? 'Analyzing...' : 'Start Analysis'}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderAnalyzing() {
        return `
            <div class="text-analyzer-loading">
                <div class="analysis-card">
                    <div class="loading-spinner-container">
                        <div class="spinner-large"></div>
                    </div>
                    <h3>Analyzing Paper Content</h3>
                    <p class="loading-message" id="text-loading-message">
                        Processing text sections...
                    </p>
                    <div class="progress-bar">
                        <div class="progress-fill" id="text-analysis-progress" style="width: 0%"></div>
                    </div>
                    <div class="progress-info">
                        <span id="text-progress-phase">Initializing</span>
                        <span id="text-progress-percent">0%</span>
                    </div>
                    <div class="analysis-log" id="text-analysis-log">
                        <div class="log-entry">Starting text analysis...</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderSections() {
        const sectionCount = Object.keys(this.sections).length;
        const wordCount = Object.values(this.sections).reduce((sum, text) => {
            return sum + (text ? text.split(/\s+/).length : 0);
        }, 0);
        
        return `
            <div class="text-sections-view">
                <div class="sections-header">
                    <h3>
                        <i class="fas fa-file-alt"></i>
                        Extracted Sections
                    </h3>
                    <div class="sections-stats">
                        <span>${sectionCount} sections</span>
                        <span>${wordCount} words</span>
                    </div>
                </div>
                
                <div class="sections-actions">
                    <button class="btn btn-primary" id="analyze-with-rag">
                        <i class="fas fa-brain"></i>
                        Analyze with Template
                    </button>
                    <button class="btn btn-outline" id="re-extract-text">
                        <i class="fas fa-redo"></i>
                        Re-extract
                    </button>
                </div>
                
                <div class="sections-list">
                    ${this.renderSectionsList()}
                </div>
            </div>
        `;
    }
    
    renderSectionsList() {
        return Object.entries(this.sections).map(([sectionName, content]) => {
            const wordCount = content ? content.split(/\s+/).length : 0;
            const charCount = content ? content.length : 0;
            
            return `
                <div class="section-item" data-section="${sectionName}">
                    <div class="section-header">
                        <h4>${this.formatSectionName(sectionName)}</h4>
                        <div class="section-stats">
                            <span>${wordCount} words</span>
                            <span>${charCount} chars</span>
                        </div>
                    </div>
                    <div class="section-content">
                        <p>${this.truncateText(content || '', 300)}</p>
                    </div>
                    <div class="section-actions">
                        <button class="btn btn-sm btn-outline" onclick="textAnalyzer.copySection('${sectionName}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderResults() {
        const propertyCount = Object.keys(this.ragResults).length;
        const valueCount = Object.values(this.ragResults).reduce((sum, prop) => {
            return sum + (prop.values ? prop.values.length : 0);
        }, 0);
        
        return `
            <div class="text-results-view">
                <div class="results-header">
                    <h3>
                        <i class="fas fa-check-circle"></i>
                        Property Extraction Results
                    </h3>
                    <div class="results-stats">
                        <span>${propertyCount} properties</span>
                        <span>${valueCount} values</span>
                    </div>
                </div>
                
                <div class="results-actions">
                    <button class="btn btn-outline btn-sm" id="highlight-all-text">
                        <i class="fas fa-highlighter"></i>
                        Highlight All
                    </button>
                    <button class="btn btn-outline btn-sm" id="export-text-results">
                        <i class="fas fa-download"></i>
                        Export
                    </button>
                    <button class="btn btn-outline btn-sm" id="re-analyze-text">
                        <i class="fas fa-redo"></i>
                        Re-analyze
                    </button>
                </div>
                
                <div class="property-table-container">
                    ${this.renderPropertyTable()}
                </div>
            </div>
        `;
    }
    
    renderPropertyTable() {
        const properties = Object.entries(this.ragResults);
        
        if (properties.length === 0) {
            return `
                <div class="no-properties">
                    <i class="fas fa-info-circle"></i>
                    <p>No properties extracted. Try selecting a different template.</p>
                </div>
            `;
        }
        
        return `
            <table class="property-table">
                <thead>
                    <tr>
                        <th>Property</th>
                        <th>Value</th>
                        <th>Evidence</th>
                        <th>Confidence</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${properties.map(([propId, data]) => this.renderPropertyRow(propId, data)).join('')}
                </tbody>
            </table>
        `;
    }
    
    renderPropertyRow(propId, data) {
        const values = Array.isArray(data.values) ? data.values : 
                      data.value ? [{ value: data.value, evidence: data.evidence, confidence: data.confidence }] : [];
        
        if (values.length === 0) {
            return `
                <tr data-property-id="${propId}">
                    <td class="property-name">
                        <div class="property-label">
                            ${data.property || data.label || propId}
                        </div>
                    </td>
                    <td colspan="4" class="no-value">No value found</td>
                </tr>
            `;
        }
        
        return values.map((value, index) => `
            <tr data-property-id="${propId}" data-value-index="${index}">
                <td class="property-name">
                    ${index === 0 ? `
                        <div class="property-label">
                            ${data.property || data.label || propId}
                        </div>
                    ` : ''}
                </td>
                <td class="property-value">
                    <div class="value-content">
                        ${value.value || 'N/A'}
                    </div>
                </td>
                <td class="property-evidence">
                    ${value.evidence ? `
                        <div class="evidence-text">
                            <span class="section-label">${value.section || value.evidence.section || 'Unknown'}</span>
                            <span class="sentence-preview">${this.truncateText(value.sentence || value.evidence || '', 100)}</span>
                        </div>
                    ` : '<span class="no-evidence">No evidence</span>'}
                </td>
                <td class="property-confidence">
                    <div class="confidence-badge confidence-${this.getConfidenceLevel(value.confidence || 0)}">
                        ${Math.round((value.confidence || 0) * 100)}%
                    </div>
                </td>
                <td class="property-actions">
                    <button class="btn-icon" title="Highlight in paper" 
                            onclick="textAnalyzer.highlightValue('${propId}', ${index})">
                        <i class="fas fa-highlighter"></i>
                    </button>
                    <button class="btn-icon" title="Copy value" 
                            onclick="textAnalyzer.copyValue('${propId}', ${index})">
                        <i class="fas fa-copy"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    async startAutomaticAnalysis() {
        if (this.isAnalyzing || this.ragAnalysisStarted) {
            console.log('📝 Analysis already in progress, skipping...');
            return;
        }
        
        console.log('🚀 Starting automatic text analysis with RAG...');
        this.isAnalyzing = true;
        this.ragAnalysisStarted = true;
        this.updateUI();
        
        try {
            // Get template from state
            const template = this.getSelectedTemplate();
            
            if (!template || !template.properties || template.properties.length === 0) {
                console.warn('No template selected, cannot run RAG analysis');
                if (this.toastManager) {
                    this.toastManager.warning('Please select a template with properties first');
                }
                this.isAnalyzing = false;
                this.ragAnalysisStarted = false;
                this.updateUI();
                return;
            }
            
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Start RAG analysis through background script
            console.log('📝 Sending START_RAG_ANALYSIS message to background...');
            
            chrome.runtime.sendMessage({
                action: 'START_RAG_ANALYSIS',
                tabId: tab.id,
                template: template
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Failed to start RAG analysis:', chrome.runtime.lastError);
                    this.handleError(new Error(chrome.runtime.lastError.message));
                } else if (response && !response.success) {
                    console.error('RAG analysis failed:', response.error);
                    this.handleError(new Error(response.error));
                } else {
                    console.log('✅ RAG analysis started successfully');
                    this.addLogEntry('RAG analysis started');
                }
            });
            
        } catch (error) {
            console.error('Failed to start text analysis:', error);
            this.handleError(error);
        }
    }
    
    handleRAGProgress(data) {
        console.log('📊 RAG Progress:', data);
        
        // Update progress UI
        const progressBar = document.getElementById('text-analysis-progress');
        const progressPercent = document.getElementById('text-progress-percent');
        const progressPhase = document.getElementById('text-progress-phase');
        const loadingMessage = document.getElementById('text-loading-message');
        
        if (progressBar) {
            progressBar.style.width = `${data.progress || 0}%`;
        }
        
        if (progressPercent) {
            progressPercent.textContent = `${data.progress || 0}%`;
        }
        
        if (progressPhase) {
            progressPhase.textContent = data.phase || 'Processing';
        }
        
        if (loadingMessage) {
            loadingMessage.textContent = data.message || 'Processing...';
        }
        
        // Add to log
        if (data.message) {
            this.addLogEntry(data.message, data.type || 'info');
        }
    }
    
    handleRAGComplete(data) {
        console.log('✅ RAG Analysis complete:', data);
        
        this.isAnalyzing = false;
        this.ragAnalysisStarted = false;
        
        if (data && data.sections) {
            // Extract sections from results
            this.sections = {};
            Object.entries(data.sections).forEach(([sectionName, sectionData]) => {
                if (sectionData.text) {
                    this.sections[sectionName] = sectionData.text;
                }
                
                // Extract properties from this section
                if (sectionData.properties) {
                    sectionData.properties.forEach(prop => {
                        if (!this.ragResults[prop.propertyId]) {
                            this.ragResults[prop.propertyId] = {
                                property: prop.propertyLabel,
                                label: prop.propertyLabel,
                                values: []
                            };
                        }
                        
                        this.ragResults[prop.propertyId].values.push({
                            value: prop.value,
                            section: sectionName,
                            sentence: prop.sentence,
                            evidence: prop.evidence,
                            confidence: prop.confidence || 0.7,
                            location: prop.location
                        });
                    });
                }
            });
            
            this.hasExtracted = true;
            
            // Store in state
            if (this.stateManager) {
                this.stateManager.updateState('data.textAnalysis', {
                    sections: this.sections,
                    ragResults: this.ragResults,
                    highlights: this.highlights,
                    userSelections: this.userSelections,
                    timestamp: Date.now()
                });
            }
            
            // Show success message
            if (this.toastManager) {
                const propertyCount = Object.keys(this.ragResults).length;
                const valueCount = Object.values(this.ragResults).reduce((sum, prop) => 
                    sum + (prop.values ? prop.values.length : 0), 0);
                
                this.toastManager.success(
                    `Analysis complete! Found ${propertyCount} properties with ${valueCount} values`
                );
            }
        }
        
        this.updateUI();
    }
    
    handleRAGError(error) {
        console.error('❌ RAG Analysis error:', error);
        
        this.isAnalyzing = false;
        this.ragAnalysisStarted = false;
        
        if (this.toastManager) {
            this.toastManager.error(`Analysis failed: ${error.message || 'Unknown error'}`);
        }
        
        this.addLogEntry(`Error: ${error.message || 'Analysis failed'}`, 'error');
        this.updateUI();
    }
    
    getSelectedTemplate() {
        if (!this.stateManager) return null;
        
        const state = this.stateManager.getState();
        return state?.data?.template?.selectedTemplate || 
               state?.data?.templates?.selectedTemplate ||
               state?.data?.selectedTemplate ||
               null;
    }
    
    copySection(sectionName) {
        const content = this.sections[sectionName];
        if (content) {
            navigator.clipboard.writeText(content).then(() => {
                if (this.toastManager) {
                    this.toastManager.success('Section copied to clipboard');
                }
            });
        }
    }
    
    copyValue(propertyId, valueIndex) {
        const property = this.ragResults[propertyId];
        if (property && property.values && property.values[valueIndex]) {
            const value = property.values[valueIndex].value;
            navigator.clipboard.writeText(value).then(() => {
                if (this.toastManager) {
                    this.toastManager.success('Value copied to clipboard');
                }
            });
        }
    }
    
    highlightValue(propertyId, valueIndex) {
        const property = this.ragResults[propertyId];
        if (!property || !property.values || !property.values[valueIndex]) return;
        
        const value = property.values[valueIndex];
        
        // Send highlight instruction to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'APPLY_HIGHLIGHT',
                highlight: {
                    id: `${propertyId}_${valueIndex}_${Date.now()}`,
                    text: value.sentence || value.value,
                    property: {
                        id: propertyId,
                        label: property.label || property.property
                    },
                    color: this.getRandomColor()
                }
            });
        });
        
        if (this.toastManager) {
            this.toastManager.success('Text highlighted in paper');
        }
    }
    
    async exportResults() {
        const exportData = {
            metadata: {
                timestamp: new Date().toISOString(),
                url: window.location.href,
                title: document.title
            },
            sections: this.sections,
            properties: this.ragResults,
            template: this.getSelectedTemplate()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `text-analysis-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        if (this.toastManager) {
            this.toastManager.success('Results exported successfully');
        }
    }
    
    // Utility methods
    formatSectionName(name) {
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
    }
    
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    getConfidenceLevel(confidence) {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.5) return 'medium';
        return 'low';
    }
    
    getRandomColor() {
        const colors = ['#FFE082', '#FFAB91', '#CE93D8', '#90CAF9', '#A5D6A7', '#F48FB1'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    addLogEntry(message, type = 'info') {
        const logElement = document.getElementById('text-analysis-log');
        if (logElement) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logElement.appendChild(entry);
            logElement.scrollTop = logElement.scrollHeight;
            
            // Keep only last 10 entries
            while (logElement.children.length > 10) {
                logElement.removeChild(logElement.firstChild);
            }
        }
    }
    
    updateUI() {
        if (this.container) {
            this.container.innerHTML = this.render();
            this.attachEventHandlers();
        }
    }
    
    attachEventHandlers() {
        // Start analysis button
        const startBtn = document.getElementById('start-text-analysis');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startAutomaticAnalysis());
        }
        
        // Analyze with RAG button
        const analyzeBtn = document.getElementById('analyze-with-rag');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.startAutomaticAnalysis());
        }
        
        // Re-extract button
        const reExtractBtn = document.getElementById('re-extract-text');
        if (reExtractBtn) {
            reExtractBtn.addEventListener('click', () => {
                this.reset();
                this.startAutomaticAnalysis();
            });
        }
        
        // Re-analyze button
        const reAnalyzeBtn = document.getElementById('re-analyze-text');
        if (reAnalyzeBtn) {
            reAnalyzeBtn.addEventListener('click', () => {
                this.ragResults = {};
                this.startAutomaticAnalysis();
            });
        }
        
        // Export button
        const exportBtn = document.getElementById('export-text-results');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportResults());
        }
        
        // Highlight all button
        const highlightAllBtn = document.getElementById('highlight-all-text');
        if (highlightAllBtn) {
            highlightAllBtn.addEventListener('click', () => {
                Object.entries(this.ragResults).forEach(([propId, data]) => {
                    if (data.values) {
                        data.values.forEach((value, index) => {
                            this.highlightValue(propId, index);
                        });
                    }
                });
            });
        }
    }
    
    handleError(error) {
        console.error('Text analysis error:', error);
        this.isAnalyzing = false;
        this.ragAnalysisStarted = false;
        
        if (this.toastManager) {
            this.toastManager.error(`Analysis failed: ${error.message}`);
        }
        
        this.addLogEntry(`Error: ${error.message}`, 'error');
        this.updateUI();
    }
    
    handleExtractionComplete(data) {
        this.sections = data.sections || {};
        this.hasExtracted = true;
        this.updateUI();
    }
    
    handlePropertyUpdate(data) {
        if (this.ragResults[data.propertyId]) {
            this.ragResults[data.propertyId] = data.newValue;
            this.updateUI();
        }
    }
    
    handleHighlightAdded(data) {
        this.userSelections.push(data.highlight);
        this.updateUI();
    }
    
    // Public API
    setContainer(container) {
        console.log('📝 TextAnalyzer container set');
        this.container = container;
        this.updateUI();
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isAnalyzing: this.isAnalyzing,
            hasExtracted: this.hasExtracted,
            ragAnalysisStarted: this.ragAnalysisStarted,
            sectionsCount: Object.keys(this.sections).length,
            propertiesCount: Object.keys(this.ragResults).length,
            highlightsCount: this.highlights.length,
            userSelectionsCount: this.userSelections.length
        };
    }
    
    reset() {
        this.sections = {};
        this.ragResults = {};
        this.highlights = [];
        this.userSelections = [];
        this.hasExtracted = false;
        this.isAnalyzing = false;
        this.ragAnalysisStarted = false;
        
        if (this.stateManager) {
            this.stateManager.updateState('data.textAnalysis', null);
        }
        
        this.updateUI();
    }
    
    cleanup() {
        eventManager.off('text:extracted', this.handleExtractionComplete);
        eventManager.off('text:rag_complete', this.handleRAGComplete);
        eventManager.off('text:property_updated', this.handlePropertyUpdate);
        eventManager.off('text:highlight_added', this.handleHighlightAdded);
        
        this.reset();
        this.isInitialized = false;
    }
}

// Make available globally for onclick handlers
window.textAnalyzer = null;

export default TextAnalyzer;
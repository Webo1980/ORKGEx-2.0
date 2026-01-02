// ================================
// src/core/content/TemplateStep.js - Final Fixed Version
// ================================

import { eventManager } from '../../utils/eventManager.js';
import { TemplateEditor } from './templates/TemplateEditor.js';
import { TemplateList } from './templates/TemplateList.js';
import { TemplateTableView } from '../../components/editors/TemplateTableView.js';
import { InlineEditor } from '../../components/editors/InlineEditor.js';

/**
 * TemplateStep - Manages template selection and generation for research papers
 */
export class TemplateStep {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.isLoading = false;
        this.isAnalyzing = false;
        this.eventUnsubscribers = [];
        
        // Service references
        this.services = {};
        
        // Component instances
        this.components = {
            templateEditor: null,
            templateList: null,
            templateTableView: null,
            inlineEditors: new Map()
        };
        
        // Current state
        this.state = {
            selectedProblem: null,
            templates: [],
            selectedTemplate: null,
            aiGeneratedTemplate: null,
            templateAnalysis: null,
            editMode: false,
            currentView: 'list', // 'list', 'table', 'edit'
            scanProgress: {
                phase: '',
                processed: 0,
                total: 0,
                templatesFound: 0
            }
        };
    }
    
    /**
     * Initialize the template step
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('📋 Initializing TemplateStep...');
            
            this.initializeServices();
            this.initializeComponents();
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ TemplateStep initialized');
            
        } catch (error) {
            console.error('❌ TemplateStep initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Get service references from ServiceManager
     */
    initializeServices() {
        const serviceManager = window.serviceManager;
        
        if (serviceManager) {
            this.services = {
                stateManager: serviceManager.getService('stateManager'),
                workflowState: serviceManager.getService('workflowState'),
                orkgService: serviceManager.getService('orkgService'),
                generationAdapter: serviceManager.getService('generationAdapter'),
                toastManager: serviceManager.getService('toastManager'),
                dataCache: serviceManager.getService('dataCache'),
                errorHandler: serviceManager.getService('errorHandler')
            };
        }
    }
    
    /**
     * Initialize component instances
     */
    initializeComponents() {
        // Initialize template editor
        this.components.templateEditor = new TemplateEditor();
        
        // Initialize template list
        this.components.templateList = new TemplateList();
        
        // Initialize template table view
        this.components.templateTableView = new TemplateTableView({
            editable: false,
            onPropertyChange: (property, value) => this.handlePropertyChange(property, value)
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.cleanupEventListeners();
        
        // Template events
        eventManager.on('template:saved', (data) => {
            this.handleTemplateSave(data.template);
        });
        
        // State subscription
        const stateManager = this.services.stateManager;
        if (stateManager && stateManager.subscribe) {
            const unsubscribe = stateManager.subscribe('data.templateAnalysis', (templateData) => {
                if (templateData && this.container && !this.isLoading) {
                    this.handleStateUpdate(templateData);
                }
            });
            this.eventUnsubscribers.push(unsubscribe);
        }
    }
    
    /**
     * Clean up event listeners
     */
    cleanupEventListeners() {
        this.eventUnsubscribers.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.eventUnsubscribers = [];
        
        // Clean up inline editors
        this.components.inlineEditors.forEach(editor => {
            if (editor && editor.destroy) {
                editor.destroy();
            }
        });
        this.components.inlineEditors.clear();
    }
    
    /**
     * Load the template step content
     */
    async load() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            console.log('📋 Loading TemplateStep...');
            
            // Load current state
            this.loadCurrentState();
            
            // Check prerequisites
            if (!this.state.selectedProblem) {
                this.render('no-problem');
                return;
            }
            
            // Check cache
            const cachedData = this.getCachedData();
            if (cachedData) {
                console.log('📋 Using cached template data');
                this.applyTemplateData(cachedData);
                this.renderTemplates();
                return;
            }
            
            // Start fresh analysis
            await this.analyzeTemplates();
            
        } catch (error) {
            console.error('Failed to load template step:', error);
            this.handleError(error);
        } finally {
            this.isLoading = false;
        }
    }
    
    /**
     * Load current state from StateManager
     */
    loadCurrentState() {
        if (!this.services.stateManager) return;
        
        const state = this.services.stateManager.getState();
        
        // Get selected problem
        const problemData = state?.data?.problemAnalysis;
        if (problemData) {
            this.state.selectedProblem = problemData.selectedProblem;
        }
        
        // Get existing template data
        const templateData = state?.data?.templateAnalysis;
        if (templateData) {
            this.state.templates = templateData.templates || [];
            this.state.selectedTemplate = templateData.selectedTemplate;
            this.state.aiGeneratedTemplate = templateData.aiGeneratedTemplate;
            this.state.templateAnalysis = templateData.templateAnalysis;
        }
    }
    
    /**
     * Get cached template data
     */
    getCachedData() {
        if (!this.services.dataCache || !this.state.selectedProblem) return null;
        
        const cacheKey = `templates_${this.state.selectedProblem.id}`;
        return this.services.dataCache.get(cacheKey);
    }
    
    /**
     * Cache template data
     */
    cacheData(data) {
        if (!this.services.dataCache || !this.state.selectedProblem) return;
        
        const cacheKey = `templates_${this.state.selectedProblem.id}`;
        this.services.dataCache.set(cacheKey, data, 1800000); // 30 minutes
    }
    
    /**
     * Apply template data to state
     */
    applyTemplateData(data) {
        this.state.templates = data.templates || [];
        this.state.aiGeneratedTemplate = data.aiGeneratedTemplate;
        this.state.templateAnalysis = data.templateAnalysis;
        this.updateStateManager();
    }
    
    /**
     * Main template analysis logic
     */
    async analyzeTemplates() {
        this.isAnalyzing = true;
        this.render('loading', 'Starting template analysis...');
        
        const isORKGProblem = this.state.selectedProblem.id !== 'ai-generated';
        
        if (isORKGProblem) {
            // Try to find ORKG templates
            const orkgTemplates = await this.findORKGTemplates();
            
            if (orkgTemplates && orkgTemplates.templates?.length > 0) {
                const data = {
                    templates: orkgTemplates.templates,
                    templateAnalysis: orkgTemplates,
                    aiGeneratedTemplate: null
                };
                
                this.applyTemplateData(data);
                this.cacheData(data);
                this.renderTemplates();
                this.isAnalyzing = false;
                return;
            }
        }
        
        // Generate AI template
        const aiTemplate = await this.generateAITemplate();
        
        const data = {
            templates: [],
            aiGeneratedTemplate: aiTemplate,
            templateAnalysis: null
        };
        
        this.applyTemplateData(data);
        this.cacheData(data);
        this.renderTemplates();
        this.isAnalyzing = false;
    }
    
    /**
     * Find ORKG templates
     */
    async findORKGTemplates() {
        if (!this.services.orkgService || !this.state.selectedProblem) {
            return null;
        }
        
        try {
            this.render('scanning', 'Searching for ORKG templates...');
            
            // Initialize ORKG service if needed
            if (!this.services.orkgService.isInitialized) {
                await this.services.orkgService.init();
            }
            
            // Scan papers for templates
            const result = await this.services.orkgService.scanPapersForTemplates(
                this.state.selectedProblem.id,
                {
                    maxPapers: 100,
                    onProgress: (progress) => this.updateScanProgress(progress)
                }
            );
            
            return result;
            
        } catch (error) {
            console.warn('Failed to find ORKG templates:', error);
            return null;
        }
    }
    
    /**
     * Generate AI template
     */
    async generateAITemplate() {
        if (!this.services.generationAdapter) {
            throw new Error('AI generation service not available');
        }
        
        try {
            this.render('loading', 'Generating AI template...');
            
            // Initialize if needed
            if (!this.services.generationAdapter.isInitialized) {
                await this.services.generationAdapter.init();
            }
            
            // Get context
            const state = this.services.stateManager?.getState();
            const metadata = state?.data?.metadata || {};
            const fieldData = state?.data?.researchField || {};
            
            // Generate template
            const template = await this.services.generationAdapter.generateResearchTemplate(
                fieldData.selectedField?.label || 'General Research',
                this.state.selectedProblem?.title || 'Research Problem',
                metadata.abstract || ''
            );
            
            // Normalize template
            return this.normalizeTemplate(template);
            
        } catch (error) {
            console.error('Failed to generate AI template:', error);
            throw error;
        }
    }
    
    /**
     * Normalize template structure
     */
    normalizeTemplate(template) {
        // Handle string responses
        if (typeof template === 'string') {
            try {
                template = JSON.parse(template);
            } catch (e) {
                throw new Error('Invalid template format received');
            }
        }
        
        // Ensure required fields
        return {
            id: template.id || `template-${Date.now()}`,
            name: template.name || 'Research Analysis Template',
            description: template.description || 'Template for research analysis',
            properties: Array.isArray(template.properties) ? template.properties.map((prop, index) => ({
                id: prop.id || `prop-${index}`,
                label: prop.label || prop.name || `Property ${index + 1}`,
                description: prop.description || '',
                type: prop.type || 'text',
                required: prop.required !== undefined ? prop.required : true,
                editable: true
            })) : [],
            metadata: {
                source: 'ai',
                timestamp: Date.now(),
                ...template.metadata
            },
            editable: true,
            isAIGenerated: true
        };
    }
    
    /**
     * Update scan progress
     */
    updateScanProgress(progress) {
        this.state.scanProgress = {
            phase: progress.phase || '',
            processed: progress.processed || 0,
            total: progress.total || 0,
            templatesFound: progress.templatesFound || progress.found || 0
        };
        
        const progressElement = this.container?.querySelector('.scan-progress');
        if (!progressElement) return;
        
        const { phase, processed, total, templatesFound } = this.state.scanProgress;
        const percentage = total > 0 ? (processed / total) * 100 : 0;
        
        let message = '';
        if (phase === 'finding_papers') {
            message = `Searching papers: ${processed}/${total}`;
        } else if (phase === 'extracting_templates') {
            message = `Extracting templates: ${processed}/${total} - Found ${templatesFound} templates`;
        } else {
            message = `Processing: ${processed}/${total}`;
        }
        
        progressElement.innerHTML = `
            <div class="progress-info">${message}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
        `;
    }
    
    /**
     * Update state in StateManager
     */
    updateStateManager() {
        if (!this.services.stateManager) return;
        
        this.services.stateManager.updateState('data.templateAnalysis', {
            templates: this.state.templates,
            selectedTemplate: this.state.selectedTemplate,
            aiGeneratedTemplate: this.state.aiGeneratedTemplate,
            templateAnalysis: this.state.templateAnalysis,
            timestamp: Date.now()
        });
        
        this.updateValidation();
    }
    
    /**
     * Update workflow validation
     */
    updateValidation() {
        if (!this.services.workflowState) return;
        
        const isValid = !!(this.state.selectedTemplate || this.state.aiGeneratedTemplate);
        this.services.workflowState.setStepValidation(
            'template',
            isValid,
            isValid ? [] : ['Please select or generate a template']
        );
    }
    
    /**
     * Handle errors
     */
    handleError(error) {
        console.error('Template step error:', error);
        
        if (this.services.errorHandler) {
            this.services.errorHandler.handleError({
                type: 'template_error',
                message: error.message || 'Template step error',
                error: error,
                severity: 'medium'
            });
        }
        
        this.render('error', error);
    }
    
    /**
     * Handle state updates
     */
    handleStateUpdate(templateData) {
        this.state.templates = templateData.templates || this.state.templates;
        this.state.selectedTemplate = templateData.selectedTemplate || this.state.selectedTemplate;
        this.state.aiGeneratedTemplate = templateData.aiGeneratedTemplate || this.state.aiGeneratedTemplate;
    }
    
    /**
     * Handle template selection
     */
    handleTemplateSelect(template) {
        this.state.selectedTemplate = template;
        this.updateStateManager();
        
        if (this.services.toastManager) {
            this.services.toastManager.success(`Template selected: ${template.name}. Click "Next" to continue.`);
        }
        
        // Re-render to show selection state
        this.renderTemplates();
    }
    
    /**
     * Handle template editing
     */
    handleTemplateEdit(template) {
        this.state.editMode = true;
        this.state.currentView = 'edit';
        
        // Initialize editor in container
        const editorContainer = document.createElement('div');
        editorContainer.id = 'template-editor-container';
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2><i class="fas fa-edit"></i> Edit Template</h2>
                    <p>Customize the template properties</p>
                </div>
                <div id="template-editor-container"></div>
            </div>
        `;
        
        const container = this.container.querySelector('#template-editor-container');
        if (container && this.components.templateEditor) {
            this.components.templateEditor.init(container, template, template.isAIGenerated);
        }
    }
    
    /**
     * Handle template save
     */
    handleTemplateSave(template) {
        // Update template in state
        if (template.isAIGenerated || template.id === this.state.aiGeneratedTemplate?.id) {
            this.state.aiGeneratedTemplate = template;
        } else {
            const index = this.state.templates.findIndex(t => t.id === template.id);
            if (index >= 0) {
                this.state.templates[index] = template;
            }
        }
        
        this.state.editMode = false;
        this.state.currentView = 'list';
        this.updateStateManager();
        this.cacheData({
            templates: this.state.templates,
            aiGeneratedTemplate: this.state.aiGeneratedTemplate,
            templateAnalysis: this.state.templateAnalysis
        });
        
        if (this.services.toastManager) {
            this.services.toastManager.success('Template saved');
        }
        
        this.renderTemplates();
    }
    
    /**
     * Handle property change
     */
    handlePropertyChange(property, value) {
        const template = this.state.selectedTemplate || this.state.aiGeneratedTemplate;
        if (template && template.properties) {
            const prop = template.properties.find(p => p.id === property.id);
            if (prop) {
                prop.value = value;
                this.updateStateManager();
            }
        }
    }
    
    /**
     * Render templates based on state
     */
    renderTemplates() {
        if (this.state.templates.length > 0) {
            this.render('orkg-templates');
        } else if (this.state.aiGeneratedTemplate) {
            this.render('ai-template');
        } else {
            this.render('no-templates');
        }
    }
    
    /**
     * Main render method
     */
    render(view, data = null) {
        if (!this.container) return;
        
        switch (view) {
            case 'loading':
                this.renderLoading(data);
                break;
            case 'scanning':
                this.renderScanning(data);
                break;
            case 'no-problem':
                this.renderNoProblem();
                break;
            case 'no-templates':
                this.renderNoTemplates();
                break;
            case 'ai-template':
                this.renderAITemplate();
                break;
            case 'orkg-templates':
                this.renderORKGTemplates();
                break;
            case 'error':
                this.renderError(data);
                break;
        }
        
        this.updateValidation();
    }
    
    renderLoading(message = 'Loading...') {
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2><i class="fas fa-clipboard-list"></i> Template Selection</h2>
                    <p>Preparing template analysis...</p>
                </div>
                
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>${this.escapeHtml(message)}</p>
                </div>
            </div>
        `;
    }
    
    renderScanning(message = 'Scanning...') {
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2><i class="fas fa-clipboard-list"></i> Template Discovery</h2>
                    <p>Scanning ORKG for existing templates</p>
                </div>
                
                <div class="scanning-state">
                    <div class="scan-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <p class="scan-message">${this.escapeHtml(message)}</p>
                    <div class="scan-progress"></div>
                </div>
            </div>
        `;
    }
    
    renderNoProblem() {
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2><i class="fas fa-clipboard-list"></i> Template Selection</h2>
                </div>
                
                <div class="empty-state-card">
                    <div class="empty-icon">
                        <i class="fas fa-puzzle-piece"></i>
                    </div>
                    <h3>No Research Problem Selected</h3>
                    <p>Please select a research problem first.</p>
                    <button class="btn btn-primary" id="go-to-problem">
                        <i class="fas fa-arrow-left"></i>
                        <span>Go to Problem Selection</span>
                    </button>
                </div>
            </div>
        `;
        
        this.attachHandler('#go-to-problem', () => {
            eventManager.emit('NAVIGATE_TO_STEP', { step: 'problem' });
        });
    }
    
    renderNoTemplates() {
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2><i class="fas fa-clipboard-list"></i> Template Selection</h2>
                </div>
                
                <div class="empty-state-card">
                    <div class="empty-icon">
                        <i class="fas fa-clipboard"></i>
                    </div>
                    <h3>No Templates Found</h3>
                    <p>Would you like to generate an AI template?</p>
                    <button class="btn btn-primary" id="generate-template">
                        <i class="fas fa-magic"></i>
                        <span>Generate AI Template</span>
                    </button>
                </div>
            </div>
        `;
        
        this.attachHandler('#generate-template', async () => {
            const template = await this.generateAITemplate();
            this.state.aiGeneratedTemplate = template;
            this.updateStateManager();
            this.render('ai-template');
        });
    }
    
    renderAITemplate() {
        const template = this.state.aiGeneratedTemplate;
        if (!template) return;
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2><i class="fas fa-clipboard-list"></i> AI-Generated Template</h2>
                    <p>Custom template generated for your research</p>
                </div>
                
                <div class="template-card ai-template">
                    <div class="template-card-header">
                        <h3>${this.escapeHtml(template.name)}</h3>
                        <div class="template-badges">
                            <span class="badge badge-ai">
                                <i class="fas fa-robot"></i> AI Generated
                            </span>
                            <button class="btn btn-sm btn-outline" id="edit-template">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </div>
                    
                    <p class="template-description">
                        ${this.escapeHtml(template.description)}
                    </p>
                    
                    <div class="template-properties-section">
                        <div class="properties-header">
                            <h4>Properties (${template.properties?.length || 0})</h4>
                        </div>
                        <div class="properties-list">
                            ${this.renderProperties(template.properties)}
                        </div>
                    </div>
                    
                    <div class="template-card-footer">
                        <button class="btn btn-primary" id="use-template">
                            <i class="fas fa-check"></i>
                            Use This Template
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Attach handlers
        this.attachHandler('#use-template', () => this.handleTemplateSelect(template));
        this.attachHandler('#edit-template', () => this.handleTemplateEdit(template));
    }
    
    renderORKGTemplates() {
        const templates = this.state.templates;
        const analysis = this.state.templateAnalysis;
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2><i class="fas fa-clipboard-list"></i> ORKG Templates</h2>
                    <p>Found ${analysis?.templatesFound || templates.length} templates from ${analysis?.totalPapers || 0} papers</p>
                </div>
                
                <div class="template-stats">
                    <div class="stat-card">
                        <div class="stat-value">${analysis?.templatesFound || templates.length}</div>
                        <div class="stat-label">Templates Found</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${analysis?.totalPapers || 0}</div>
                        <div class="stat-label">Papers Analyzed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.calculateAvgProperties()}</div>
                        <div class="stat-label">Avg Properties</div>
                    </div>
                </div>
                
                <div class="template-cards">
                    ${templates.slice(0, 5).map((template, index) => this.renderTemplateCard(template, index)).join('')}
                </div>
                
                <div class="template-alternative">
                    <p>Not finding what you need?</p>
                    <button class="btn btn-secondary" id="generate-ai">
                        <i class="fas fa-robot"></i>
                        Generate AI Template Instead
                    </button>
                </div>
            </div>
        `;
        
        // Attach handlers
        this.container.querySelectorAll('.select-template').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.handleTemplateSelect(templates[index]);
            });
        });
        
        this.attachHandler('#generate-ai', async () => {
            const template = await this.generateAITemplate();
            this.state.aiGeneratedTemplate = template;
            this.updateStateManager();
            this.render('ai-template');
        });
    }
    
    renderTemplateCard(template, index) {
        return `
            <div class="template-card" data-index="${index}">
                <div class="template-card-header">
                    <div class="template-rank">#${index + 1}</div>
                    <div class="template-usage">
                        <span class="usage-count">${template.paperCount || 0}</span>
                        <span class="usage-label">Papers</span>
                    </div>
                </div>
                
                <div class="template-card-body">
                    <h3 class="template-name">${this.escapeHtml(template.name)}</h3>
                    <p class="template-description">
                        ${this.escapeHtml(template.description || 'No description available')}
                    </p>
                    
                    <div class="template-properties">
                        <div class="properties-header">
                            <i class="fas fa-list"></i>
                            <span>${template.properties?.length || 0} Properties</span>
                        </div>
                    </div>
                </div>
                
                <div class="template-card-footer">
                    <button class="btn btn-primary select-template">
                        <i class="fas fa-check"></i>
                        Select Template
                    </button>
                    ${template.id ? `
                        <a href="https://orkg.org/template/${template.id}" 
                           target="_blank" 
                           class="btn btn-outline">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderProperties(properties) {
        if (!properties || properties.length === 0) {
            return '<p class="no-properties">No properties defined</p>';
        }
        
        return properties.slice(0, 20).map(prop => `
            <div class="property-item">
                <span class="property-name">${this.escapeHtml(prop.label)}</span>
                <span class="property-type">${prop.type}</span>
                ${prop.required ? '<span class="required-badge">Required</span>' : ''}
            </div>
        `).join('') + (properties.length > 20 ? `
            <div class="property-more">
                +${properties.length - 5} more properties
            </div>
        ` : '');
    }
    
    renderError(error) {
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2><i class="fas fa-clipboard-list"></i> Template Selection</h2>
                </div>
                
                <div class="error-card">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Error Loading Templates</h3>
                    <p>${this.escapeHtml(error?.message || 'An unexpected error occurred')}</p>
                    <div class="error-actions">
                        <button class="btn btn-primary" id="retry">
                            <i class="fas fa-redo"></i>
                            Try Again
                        </button>
                        <button class="btn btn-secondary" id="skip-templates">
                            <i class="fas fa-forward"></i>
                            Skip to AI Generation
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.attachHandler('#retry', () => {
            this.isAnalyzing = false;
            this.load();
        });
        
        this.attachHandler('#skip-templates', async () => {
            try {
                const template = await this.generateAITemplate();
                this.state.aiGeneratedTemplate = template;
                this.updateStateManager();
                this.render('ai-template');
            } catch (err) {
                this.handleError(err);
            }
        });
    }
    
    /**
     * Calculate average properties
     */
    calculateAvgProperties() {
        if (!this.state.templates || this.state.templates.length === 0) {
            return 0;
        }
        
        const total = this.state.templates.reduce((sum, t) => 
            sum + (t.properties?.length || 0), 0);
        
        return Math.round(total / this.state.templates.length);
    }
    
    /**
     * Attach event handler helper
     */
    attachHandler(selector, handler) {
        const element = this.container?.querySelector(selector);
        if (element) {
            element.addEventListener('click', handler);
        }
    }
    
    /**
     * Escape HTML for security
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public API
    
    isComplete() {
        return !!(this.state.selectedTemplate || this.state.aiGeneratedTemplate);
    }
    
    getSelectedTemplate() {
        return this.state.selectedTemplate || this.state.aiGeneratedTemplate;
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            isAnalyzing: this.isAnalyzing,
            hasSelectedProblem: !!this.state.selectedProblem,
            hasTemplates: this.state.templates.length > 0,
            hasSelectedTemplate: !!this.state.selectedTemplate,
            hasAITemplate: !!this.state.aiGeneratedTemplate,
            currentView: this.state.currentView
        };
    }
    
    reset() {
        this.state = {
            selectedProblem: null,
            templates: [],
            selectedTemplate: null,
            aiGeneratedTemplate: null,
            templateAnalysis: null,
            editMode: false,
            currentView: 'list',
            scanProgress: {
                phase: '',
                processed: 0,
                total: 0,
                templatesFound: 0
            }
        };
        
        this.cleanupEventListeners();
        
        if (this.container) {
            this.render('no-problem');
        }
    }
    
    cleanup() {
        console.log('🧹 TemplateStep cleanup...');
        
        this.cleanupEventListeners();
        
        // Cleanup components
        if (this.components.templateEditor?.destroy) {
            this.components.templateEditor.destroy();
        }
        
        if (this.components.templateList?.destroy) {
            this.components.templateList.destroy();
        }
        
        if (this.components.templateTableView?.cleanup) {
            this.components.templateTableView.cleanup();
        }
        
        this.reset();
        this.isInitialized = false;
        
        console.log('✅ TemplateStep cleanup completed');
    }
}

export default TemplateStep;
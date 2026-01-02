// ================================
// src/core/content/ProblemStep.js - Complete Fixed Implementation
// ================================

import { eventManager } from '../../utils/eventManager.js';
import { ProblemAnalysisLogger } from './problems/ProblemAnalysisLogger.js';
import { SimilaritySlider } from './problems/SimilaritySlider.js';
import { FieldComparisonModal } from '../../components/modals/FieldComparisonModal.js';
import { InlineEditor } from '../../components/editors/InlineEditor.js';
import { FieldSelectionModal } from '../../components/modals/FieldSelectionModal.js';

export class ProblemStep {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.isAnalyzing = false;
        this.isLoading = false;
        
        // Services
        this.services = {};
        
        // Components
        this.components = {
            logger: null,
            similaritySlider: null,
            fieldComparisonModal: null,
            fieldSelectionModal: null,
            aiProblemEditors: {
                title: null,
                description: null
            }
        };
        
        // State management
        this.state = {
            currentField: null,
            previousFields: [],
            aiProblem: null,
            orkgProblems: [],
            allProblems: [],
            selectedProblem: null,
            currentThreshold: 0.5,
            maxSimilarity: 0,
            analysisPhase: 'idle',
            analysisComplete: false,
            userChangedSlider: false
        };
        
        // Field analysis cache
        this.fieldAnalysisCache = new Map();
        this.maxCachedFields = 5;
        
        // Log interceptor
        this.originalConsoleLog = null;
        this.logInterceptor = null;
        this.listenersSetup = false;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🧩 Initializing ProblemStep...');
            
            this.initializeServices();
            this.setupEventListeners();
            
            // Initialize components
            this.components.logger = new ProblemAnalysisLogger();
            this.components.fieldComparisonModal = new FieldComparisonModal();
            this.components.fieldSelectionModal = new FieldSelectionModal();
            
            // Initialize similarity slider with callback
            this.components.similaritySlider = new SimilaritySlider({
                min: 0.1,
                max: 0.95,
                default: 0.3,
                step: 0.01,
                debounceDelay: 150,
                onChange: (value) => {
                    this.state.currentThreshold = value;
                    this.state.userChangedSlider = true;
                    this.updateProblemsList();
                    this.updateStateManager();
                }
            });

            this.isInitialized = true;
            console.log('✅ ProblemStep initialized');
            
        } catch (error) {
            console.error('❌ ProblemStep initialization failed:', error);
            throw error;
        }
    }
    
    initializeServices() {
        const serviceManager = window.serviceManager;
        
        if (serviceManager) {
            this.services = {
                stateManager: serviceManager.getService('stateManager'),
                workflowState: serviceManager.getService('workflowState'),
                dataCache: serviceManager.getService('dataCache'),
                toastManager: serviceManager.getService('toastManager'),
                orkgProblemMatcher: serviceManager.getService('orkgProblemMatcher'),
                orkgService: serviceManager.getService('orkgService'),
                generationAdapter: serviceManager.getService('generationAdapter'),
                embeddingService: serviceManager.getService('embeddingService')
            };
        }
    }
    
    setupEventListeners() {
        if (this.listenersSetup) return;
        this.listenersSetup = true;
        
        // Listen for field changes
        if (this.services.stateManager) {
            this.unsubscribeField = this.services.stateManager.subscribe('data.researchField', (fieldData) => {
                if (fieldData && fieldData.selectedField && !this.isAnalyzing) {
                    this.handleFieldChange(fieldData.selectedField);
                }
            });
        }
        
        // Auto-analyze when coming from field step
        eventManager.on('workflow:step_changed', (data) => {
            if (data.currentStep === 'problem' && data.previousStep === 'field') {
                if (!this.state.analysisComplete && this.state.currentField) {
                    setTimeout(() => this.performAnalysis(), 500);
                }
            }
        });
        
        // Listen for quick field change
        eventManager.on('field:quick_change', (data) => {
            if (data.newField) {
                this.handleFieldChange(data.newField);
                setTimeout(() => this.performAnalysis(), 500);
            }
        });

        // Listen for embedding progress
        eventManager.on('embedding:progress', (progress) => {
            this.updateAnalysisPhase('embedding');
            this.logProgress(`Embedding: ${progress.message}`, 'embedding', progress);
        });
        
        eventManager.on('embedding:batch_progress', (progress) => {
            this.logProgress(`Processing embeddings: ${progress.processed}/${progress.total}`, 'embedding', {
                progress: progress.progress
            });
        });
        
        // Listen for ORKG progress
        eventManager.on('orkg:problems_progress', (data) => {
            this.updateAnalysisPhase('orkg_fetch');
            this.logProgress(`ORKG: Loaded ${data.loaded} problems (page ${data.page})`, 'batch', data);
        });
        
        // Listen for field comparison modal events
        eventManager.on('field-comparison:use-new', () => {
            this.useNewFieldAnalysis();
        });
        
        eventManager.on('field-comparison:keep-old', () => {
            this.keepOldFieldAnalysis();
        });
        
        eventManager.on('field-comparison:compare', () => {
            this.showFieldComparison();
        });
    }
    
    async load() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (this.isLoading) {
            console.log('🧩 Already loading, skipping duplicate load');
            return;
        }
        
        this.isLoading = true;
        
        try {
            console.log('🧩 Loading ProblemStep...');
            
            // Show logger immediately during analysis
            if (this.isAnalyzing && this.components.logger) {
                this.render('analyzing');
                return;
            }
            
            this.loadCurrentState();
            
            // Check if we have cached results for current field
            const cachedResults = this.getCachedFieldAnalysis(this.state.currentField);
            
            if (cachedResults) {
                console.log('🧩 Using cached results for field:', this.state.currentField?.label);
                this.applyCachedResults(cachedResults);
                this.render('results');
            } else if (this.state.currentField) {
                // Check if we have results in state but not in cache
                if (this.state.analysisComplete && this.state.allProblems.length > 0) {
                    console.log('🧩 Using existing results from state');
                    this.render('results');
                } else {
                    // Auto-analyze for new field
                    console.log('🧩 Starting analysis for field:', this.state.currentField?.label);
                    setTimeout(() => this.performAnalysis(), 500);
                }
            } else {
                this.render('no-field');
            }
            
        } catch (error) {
            console.error('Failed to load problem step:', error);
            this.render('error', error);
        } finally {
            this.isLoading = false;
        }
    }
    
    loadCurrentState() {
        if (!this.services.stateManager) return;
        
        const state = this.services.stateManager.getState();
        const researchFieldData = state?.data?.researchField;
        
        if (researchFieldData?.selectedField) {
            this.state.currentField = {
                ...researchFieldData.selectedField,
                id: researchFieldData.selectedField.id || researchFieldData.selectedFieldId
            };
        }
        
        // Load all fields for field selection modal
        if (researchFieldData?.allFields) {
            this.allFields = researchFieldData.allFields;
        }
        
        const problemData = state?.data?.problemAnalysis;
        if (problemData) {
            this.state.aiProblem = problemData.aiGeneratedProblem;
            
            // Use the correct path for results
            if (problemData.similarityResults) {
                this.state.orkgProblems = problemData.similarityResults.results || [];
                this.state.allProblems = problemData.similarityResults.allResults || [];
                this.state.maxSimilarity = problemData.similarityResults.maxSimilarity || 0;
            }
            
            this.state.selectedProblem = problemData.selectedProblem;
            this.state.currentThreshold = problemData.threshold || 0.3;
            this.state.analysisComplete = problemData.analysisComplete || false;
            
            console.log('🧩 Loaded state - AI Problem:', this.state.aiProblem?.title);
            console.log('🧩 Loaded state - ORKG Problems:', this.state.allProblems.length);
            console.log('🧩 Loaded state - Max Similarity:', this.state.maxSimilarity);
        }
    }
    
    cleanJSONFormatting(text) {
        if (!text) return '';
        
        // Remove all markdown code block markers
        text = text.replace(/\*\*```json\*\*/g, '');
        text = text.replace(/```json/g, '');
        text = text.replace(/```/g, '');
        
        // Remove field prefixes
        text = text.replace(/^["']?(title|description|problem)["']?\s*:\s*/i, '');
        
        // Remove quotes
        text = text.replace(/^["'"`'"']/g, '');
        text = text.replace(/["'"`'"']$/g, '');
        
        // Remove escaped characters
        text = text.replace(/\\"/g, '"');
        text = text.replace(/\\'/g, "'");
        text = text.replace(/\\\\/g, '\\');
        text = text.replace(/\\n/g, ' ');
        text = text.replace(/\\t/g, ' ');
        text = text.replace(/\\r/g, ' ');
        
        // Try to parse if it looks like JSON
        if (text.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(text);
                if (typeof parsed === 'string') {
                    text = parsed;
                } else if (typeof parsed === 'object') {
                    if (parsed.title) {
                        return { title: parsed.title, description: parsed.description || '' };
                    } else if (parsed.description) {
                        text = parsed.description;
                    } else {
                        const firstValue = Object.values(parsed).find(v => typeof v === 'string');
                        if (firstValue) text = firstValue;
                    }
                }
            } catch (e) {
                // Not valid JSON, continue
            }
        }
        
        // Clean up any remaining JSON-like syntax
        text = text.replace(/^\{|\}$/g, '');
        text = text.replace(/^"(.+)"$/, '$1');
        
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }
    
    cleanAIProblem(problem) {
        let title = problem.title || '';
        let description = problem.description || '';
        
        // Check if title or description contains JSON
        const cleanedTitle = this.cleanJSONFormatting(title);
        const cleanedDescription = this.cleanJSONFormatting(description);
        
        // If cleanJSONFormatting returned an object, extract the values
        if (typeof cleanedTitle === 'object') {
            title = cleanedTitle.title || title;
            description = cleanedTitle.description || description;
        } else {
            title = cleanedTitle;
        }
        
        if (typeof cleanedDescription === 'object') {
            description = cleanedDescription.description || cleanedDescription.title || description;
        } else {
            description = cleanedDescription;
        }
        
        // Ensure we have valid content
        if (!title) {
            title = 'Research Problem';
        }
        if (!description) {
            description = 'Click to edit problem description...';
        }
        
        return {
            ...problem,
            title: title,
            description: description
        };
    }
    
    async performAnalysis() {
        if (this.isAnalyzing) {
            console.log('🧩 Analysis already in progress');
            return;
        }
        
        this.isAnalyzing = true;
        this.state.analysisPhase = 'ai_generation';
        this.state.userChangedSlider = false;
        
        this.setupLogInterceptor();
        
        if (this.components.logger) {
            this.components.logger.clear();
        }
        
        const fieldId = this.state.currentField.id || this.state.currentField.label;
        console.log('🧩 Starting analysis for field:', fieldId);
        
        this.render('analyzing');
        
        try {
            const startTime = Date.now();
            
            // Phase 1: Generate AI Problem
            this.updateAnalysisPhase('ai_generation');
            this.logProgress('Starting AI problem generation...', 'info');
            const aiProblem = await this.generateAIProblem();
            this.state.aiProblem = aiProblem;
            this.logProgress(`✅ AI problem generated: ${aiProblem.title}`, 'success');
            
            // Phase 2: Fetch ORKG Problems
            this.updateAnalysisPhase('orkg_fetch');
            this.logProgress('Fetching ORKG problems...', 'info');
            const orkgResults = await this.fetchORKGProblems();
            
            // Phase 3: Embedding Analysis
            this.updateAnalysisPhase('embedding');
            
            // Store results correctly
            this.state.allProblems = orkgResults.allResults || [];
            this.state.orkgProblems = orkgResults.filteredResults || orkgResults.results || [];
            this.state.maxSimilarity = orkgResults.maxSimilarity || 0;
            
            console.log('🧩 Analysis results:', {
                allProblems: this.state.allProblems.length,
                filteredProblems: this.state.orkgProblems.length,
                maxSimilarity: this.state.maxSimilarity
            });
            
            // Cache the analysis results
            this.cacheFieldAnalysis(fieldId);
            
            // Update state manager
            this.state.analysisComplete = true;
            this.state.analysisPhase = 'complete';
            this.updateAnalysisPhase('complete');
            this.updateStateManager();
            
            // Complete
            const processingTime = Date.now() - startTime;
            this.logProgress(`✅ Analysis complete in ${(processingTime / 1000).toFixed(1)}s`, 'success');
            
            // Show results
            setTimeout(() => {
                this.render('results');
                
                if (this.services.toastManager) {
                    const problemCount = this.state.orkgProblems.length;
                    this.services.toastManager.success(
                        problemCount > 0 
                            ? `Found ${problemCount} similar ORKG problems`
                            : 'AI problem generated successfully'
                    );
                }
            }, 500);
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.logProgress(`❌ Analysis failed: ${error.message}`, 'error');
            this.render('error', error);
            
            if (this.services.toastManager) {
                this.services.toastManager.error('Problem analysis failed');
            }
            
        } finally {
            this.isAnalyzing = false;
            this.restoreConsoleLog();
        }
    }
    
    async generateAIProblem() {
        const fieldId = this.state.currentField?.id || this.state.currentField?.label;
        
        // Check cache first
        const cachedAnalysis = this.getCachedFieldAnalysis(this.state.currentField);
        if (cachedAnalysis?.aiProblem) {
            console.log('🧩 Using cached AI problem for field:', fieldId);
            return cachedAnalysis.aiProblem;
        }
        
        // Generate new AI problem
        const metadata = this.services.stateManager?.getState()?.data?.metadata || {};
        
        try {
            if (this.services.generationAdapter) {
                const response = await this.services.generationAdapter.generateResearchProblem(
                    metadata.title || '',
                    metadata.abstract || ''
                );
                
                let problem = response;
                
                // If response is the raw OpenAI response, extract the content
                if (response.choices && response.choices[0]) {
                    const content = response.choices[0].message.content;
                    problem = this.cleanJSONFormatting(content);
                }
                
                // Clean up the problem
                const cleanedProblem = this.cleanAIProblem(problem);
                
                return {
                    id: 'ai-generated',
                    ...cleanedProblem,
                    source: 'ai',
                    confidence: 0.85,
                    editable: true
                };
            }
        } catch (error) {
            console.warn('AI generation failed:', error);
            this.logProgress('⚠️ AI generation failed, using fallback', 'warning');
        }
        
        // Fallback
        return {
            id: 'ai-generated',
            title: `Research challenges in ${this.state.currentField?.label || 'this domain'}`,
            description: metadata.abstract?.substring(0, 200) || 'Click to edit this problem description.',
            source: 'fallback',
            confidence: 0.5,
            editable: true
        };
    }
    
    async fetchORKGProblems() {
        if (!this.services.orkgProblemMatcher) {
            console.warn('ORKG Problem Matcher not available');
            return { allResults: [], filteredResults: [], results: [] };
        }
        
        const fieldId = this.state.currentField.id || this.state.currentField.label;
        
        this.logProgress(`Fetching problems for field: ${fieldId}`, 'info');
        
        const threshold = this.state.currentThreshold || 0.3;
        
        // Use both title and description for embedding comparison
        const queryText = `${this.state.aiProblem.title} ${this.state.aiProblem.description}`;
        
        const results = await this.services.orkgProblemMatcher.findSimilarProblems(
            queryText,
            fieldId,
            {
                threshold: threshold,
                maxResults: 500,
                onProgress: (progress) => {
                    if (progress.message) {
                        this.logProgress(progress.message, 'batch', progress);
                    }
                }
            }
        );
        
        this.logProgress(
            `✅ Found ${results.filteredResults?.length || results.results?.length || 0} similar problems out of ${results.totalFound || 0} total`,
            'success'
        );
        
        return results;
    }
    
    updateAnalysisPhase(phase) {
        this.state.analysisPhase = phase;
        
        const phaseElements = this.container?.querySelectorAll('.phase-item');
        if (phaseElements) {
            phaseElements.forEach(el => {
                const elPhase = el.dataset.phase;
                el.classList.remove('active', 'completed', 'error');
                
                if (elPhase === phase) {
                    el.classList.add('active');
                } else if (this.getPhaseOrder(elPhase) < this.getPhaseOrder(phase)) {
                    el.classList.add('completed');
                }
            });
        }
    }
    
    getPhaseOrder(phase) {
        const order = {
            'ai_generation': 1,
            'orkg_fetch': 2,
            'embedding': 3,
            'complete': 4
        };
        return order[phase] || 0;
    }
    
    setupLogInterceptor() {
        if (this.logInterceptor) return;
        
        this.originalConsoleLog = console.log;
        
        this.logInterceptor = (...args) => {
            const message = args.join(' ');
            
            if (message.includes('🔬') || message.includes('ORKG')) {
                this.logProgress(message, 'info');
            } else if (message.includes('✅')) {
                this.logProgress(message, 'success');
            } else if (message.includes('📊') || message.includes('similarity')) {
                this.logProgress(message, 'similarity');
            } else if (message.includes('🧠') || message.includes('embedding')) {
                this.logProgress(message, 'embedding');
            } else if (message.includes('⚠️')) {
                this.logProgress(message, 'warning');
            } else if (message.includes('❌') || message.includes('Error')) {
                this.logProgress(message, 'error');
            } else if (message.includes('Page') || message.includes('batch') || message.includes('chunk')) {
                this.logProgress(message, 'batch');
            }
            
            this.originalConsoleLog.apply(console, args);
        };
        
        console.log = this.logInterceptor;
    }
    
    restoreConsoleLog() {
        if (this.originalConsoleLog) {
            console.log = this.originalConsoleLog;
            this.logInterceptor = null;
        }
    }
    
    logProgress(message, type = 'info', data = null) {
        if (this.components.logger) {
            this.components.logger.addLog(message, type, data);
        }
    }
    
    render(view = 'analyzing', data = null) {
        if (!this.container) return;
        
        switch (view) {
            case 'no-field':
                this.renderNoField();
                break;
            case 'analyzing':
                this.renderAnalyzing();
                break;
            case 'results':
                this.renderResults();
                break;
            case 'error':
                this.renderError(data);
                break;
        }
        
        this.updateStepValidation();
    }
    
    renderAnalyzing() {
        const loggerHtml = this.components.logger ? this.components.logger.render() : '';
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2 class="step-title">
                        <i class="fas fa-puzzle-piece"></i>
                        Research Problem Analysis
                    </h2>
                    <p class="step-subtitle">
                        Analyzing problems for field: <strong class="field-label">${this.state.currentField?.label}</strong>
                    </p>
                </div>
                
                <div class="analysis-container">
                    <div class="analysis-phases">
                        <div class="phase-item" data-phase="ai_generation">
                            <div class="phase-icon">
                                <i class="fas fa-brain"></i>
                            </div>
                            <div class="phase-label">AI Generation</div>
                        </div>
                        
                        <div class="phase-connector"></div>
                        
                        <div class="phase-item" data-phase="orkg_fetch">
                            <div class="phase-icon">
                                <i class="fas fa-database"></i>
                            </div>
                            <div class="phase-label">ORKG Fetch</div>
                        </div>
                        
                        <div class="phase-connector"></div>
                        
                        <div class="phase-item" data-phase="embedding">
                            <div class="phase-icon">
                                <i class="fas fa-project-diagram"></i>
                            </div>
                            <div class="phase-label">Embedding</div>
                        </div>
                        
                        <div class="phase-connector"></div>
                        
                        <div class="phase-item" data-phase="complete">
                            <div class="phase-icon">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="phase-label">Complete</div>
                        </div>
                    </div>
                    
                    ${loggerHtml}
                </div>
            </div>
        `;
        
        if (this.components.logger) {
            this.components.logger.attachToContainer(
                this.container.querySelector('.analysis-logger')
            );
        }
        
        this.updateAnalysisPhase(this.state.analysisPhase);
    }
    
    renderResults() {
        const hasORKGProblems = this.state.allProblems && this.state.allProblems.length > 0;
        const cachedFieldsCount = this.fieldAnalysisCache.size;
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2 class="step-title">
                        <i class="fas fa-puzzle-piece"></i>
                        Research Problem Selection
                    </h2>
                    <div class="step-subtitle">
                        <span>Select a research problem for field: 
                        <strong class="field-label">${this.state.currentField?.label}</strong></span>
                        <div class="step-actions">
                            <button class="btn btn-outline btn-sm change-field-btn" id="quick-field-change">
                                <i class="fas fa-tags"></i>
                                Change Field
                            </button>
                            ${cachedFieldsCount > 1 ? `
                                <button class="btn btn-outline btn-sm compare-fields-btn" id="compare-fields-btn">
                                    <i class="fas fa-exchange-alt"></i>
                                    Compare (${cachedFieldsCount})
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="step-content">
                    ${this.renderAIProblemSection()}
                    ${hasORKGProblems ? this.renderORKGResults() : this.renderNoORKGNotice()}
                </div>
            </div>
        `;
        
        this.setupResultHandlers();
        this.initializeInlineEditors();
    }
    
    renderAIProblemSection() {
        const aiProblem = this.state.aiProblem;
        const isSelected = this.state.selectedProblem?.id === 'ai-generated';
        
        const title = aiProblem?.title || 'Research Problem';
        const description = aiProblem?.description || 'No description available.';
        
        return `
            <div class="ai-problem-section">
                <div class="section-header">
                    <h3>
                        <i class="fas fa-brain"></i>
                        AI-Generated Research Problem
                    </h3>
                </div>
                
                <div class="ai-problem-card ${isSelected ? 'selected' : ''}" 
                     data-problem-id="ai-generated">
                    <div class="problem-badge">
                        <i class="fas fa-robot"></i>
                        AI Generated
                    </div>
                    
                    <h4 class="problem-title editable-title" id="ai-problem-title" data-field="title">
                        ${this.escapeHtml(title)}
                    </h4>
                    
                    <div class="problem-description-container">
                        <p class="problem-description editable-description" id="ai-problem-description" data-field="description">
                            ${this.escapeHtml(description)}
                        </p>
                    </div>
                    
                    <div class="problem-actions">
                        <button class="btn ${isSelected ? 'btn-success' : 'btn-primary'} select-problem-btn" 
                                data-problem-id="ai-generated">
                            <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-check'}"></i>
                            ${isSelected ? 'Selected' : 'Select This Problem'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderNoORKGNotice() {
        return `
            <div class="no-orkg-notice">
                <i class="fas fa-info-circle"></i>
                <div>
                    <p>No similar problems found in ORKG. Your research appears to address a novel problem!</p>
                    <small>Max similarity found: ${(this.state.maxSimilarity * 100).toFixed(1)}%</small>
                </div>
            </div>
        `;
    }
    
    renderORKGResults() {
        const filteredProblems = this.filterProblemsByThreshold();
        const showLowSimilarityNotice = this.state.maxSimilarity < this.state.currentThreshold;
        
        return `
            <div class="orkg-problems-section">
                <div id="similarity-slider-container"></div>
                
                ${showLowSimilarityNotice && !this.state.userChangedSlider ? `
                    <div class="low-similarity-notice">
                        <i class="fas fa-info-circle"></i>
                        <div>
                            <p><strong>Low similarity detected</strong></p>
                            <p>The highest similarity found is ${(this.state.maxSimilarity * 100).toFixed(1)}%, which is below your current threshold of ${(this.state.currentThreshold * 100).toFixed(0)}%.</p>
                            <p>Try lowering the threshold to see available problems, or use the AI-generated problem above.</p>
                        </div>
                    </div>
                ` : ''}
                
                ${this.renderProblemsList(filteredProblems)}
            </div>
        `;
    }
    
    renderProblemsList(problems) {
        const limitedProblems = problems.slice(0, 50);
        
        return `
            <div class="orkg-problems-list-section">
                <div class="section-header">
                    <h3>
                        <i class="fas fa-list"></i>
                        ORKG Problems
                    </h3>
                    <div class="results-info">
                        Showing ${limitedProblems.length} of ${problems.length} matched / ${this.state.allProblems.length} total scanned
                    </div>
                </div>
                
                <div class="problems-list">
                    ${limitedProblems.map((problem, index) => this.renderProblemCard(problem, index)).join('')}
                </div>
                
                ${problems.length === 0 ? `
                    <div class="no-matches-info">
                        <i class="fas fa-info-circle"></i>
                        <p>No problems match the current threshold. Try lowering the similarity threshold.</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderProblemCard(problem, index) {
        const similarity = problem.similarity || problem.confidence_score || 0;
        const isSelected = this.state.selectedProblem?.id === problem.id;
        
        return `
            <div class="problem-card ${isSelected ? 'selected' : ''}" 
                 data-problem-id="${problem.id}"
                 data-problem-index="${index}">
                <div class="problem-header">
                    <div class="problem-rank">${index + 1}</div>
                    <div class="problem-content">
                        <h4 class="problem-title">${problem.label || problem.title || 'Untitled'}</h4>
                        ${problem.description ? `
                            <p class="problem-description">${problem.description}</p>
                        ` : ''}
                    </div>
                    <div class="similarity-badge ${this.getSimilarityClass(similarity)}">
                        <div class="similarity-value">${(similarity * 100).toFixed(1)}%</div>
                        <div class="similarity-bar">
                            <div class="similarity-fill" style="width: ${similarity * 100}%"></div>
                        </div>
                    </div>
                </div>
                ${isSelected ? `
                    <div class="selection-indicator">
                        <i class="fas fa-check-circle"></i>
                        Selected
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    getSimilarityClass(similarity) {
        if (similarity >= 0.7) return 'similarity-high';
        if (similarity >= 0.4) return 'similarity-medium';
        return 'similarity-low';
    }
    
    renderNoField() {
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2 class="step-title">
                        <i class="fas fa-puzzle-piece"></i>
                        Research Problem Analysis
                    </h2>
                </div>
                
                <div class="empty-state-card">
                    <div class="empty-icon">
                        <i class="fas fa-tag"></i>
                    </div>
                    <h3>No Research Field Selected</h3>
                    <p>Please go back and select a research field first.</p>
                    <div class="empty-actions">
                        <button class="btn btn-primary" id="go-to-field-btn">
                            <i class="fas fa-arrow-left"></i>
                            <span>Go to Field Selection</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const goToFieldBtn = this.container.querySelector('#go-to-field-btn');
        if (goToFieldBtn) {
            goToFieldBtn.addEventListener('click', () => {
                eventManager.emit('NAVIGATE_TO_STEP', { step: 'field' });
            });
        }
    }
    
    renderError(error) {
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2 class="step-title">
                        <i class="fas fa-puzzle-piece"></i>
                        Research Problem Analysis
                    </h2>
                </div>
                
                <div class="error-card">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Analysis Error</h3>
                    <p>${error?.message || 'An unknown error occurred'}</p>
                    
                    <div class="error-actions">
                        <button class="btn btn-primary" id="retry-analysis">
                            <i class="fas fa-refresh"></i>
                            <span>Retry Analysis</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const retryBtn = this.container.querySelector('#retry-analysis');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => this.performAnalysis());
        }
    }
    
    setupResultHandlers() {
        // Render similarity slider
        const sliderContainer = this.container?.querySelector('#similarity-slider-container');
        if (sliderContainer && this.components.similaritySlider) {
            const filteredProblems = this.filterProblemsByThreshold();
            const stats = {
                matchesCount: filteredProblems.length,
                totalCount: this.state.allProblems.length,
                maxSimilarity: this.state.maxSimilarity
            };
            
            const sliderElement = this.components.similaritySlider.render(
                this.state.currentThreshold,
                stats
            );
            
            sliderContainer.appendChild(sliderElement);
        }
        
        // Quick field change button
        const quickChangeBtn = this.container.querySelector('#quick-field-change');
        if (quickChangeBtn && this.components.fieldSelectionModal) {
            quickChangeBtn.addEventListener('click', () => {
                // Get all fields from state
                const stateManager = this.services.stateManager;
                const allFields = stateManager?.getState()?.data?.researchField?.allFields || [];
                
                this.components.fieldSelectionModal.show(
                    allFields,
                    this.state.currentField,
                    (newField) => {
                        // This callback is called when user selects a new field
                        console.log('🧩 Field selected from modal:', newField);
                        eventManager.emit('field:quick_change', { newField });
                    }
                );
            });
        }
        
        // Problem selection handlers
        const problemCards = this.container.querySelectorAll('.problem-card');
        problemCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't select if clicking on inline editor
                if (e.target.classList.contains('inline-editor') || 
                    e.target.closest('.inline-editor')) {
                    return;
                }
                
                const problemId = card.dataset.problemId;
                const problemIndex = parseInt(card.dataset.problemIndex);
                
                let problem;
                if (problemId === 'ai-generated') {
                    problem = this.state.aiProblem;
                } else {
                    const filtered = this.filterProblemsByThreshold();
                    problem = filtered[problemIndex];
                }
                
                if (problem) {
                    this.selectProblem(problem);
                }
            });
        });
        
        // AI problem select button
        const aiSelectBtn = this.container.querySelector('.ai-problem-card .select-problem-btn');
        if (aiSelectBtn) {
            aiSelectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectProblem(this.state.aiProblem);
            });
        }
        
        // Compare fields button
        const compareBtn = this.container.querySelector('#compare-fields-btn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                this.showFieldComparison();
            });
        }
    }
    
    updateProblemsList() {
        const problemsListSection = this.container?.querySelector('.orkg-problems-section');
        if (!problemsListSection) return;
        
        const filteredProblems = this.filterProblemsByThreshold();
        
        // Update slider stats
        if (this.components.similaritySlider) {
            this.components.similaritySlider.updateStats({
                matchesCount: filteredProblems.length,
                totalCount: this.state.allProblems.length,
                maxSimilarity: this.state.maxSimilarity
            });
        }
        
        // Update problems list
        const problemsList = problemsListSection.querySelector('.problems-list');
        if (problemsList) {
            const limitedProblems = filteredProblems.slice(0, 50);
            
            problemsList.style.opacity = '0.5';
            problemsList.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                problemsList.innerHTML = limitedProblems.map((problem, index) => 
                    this.renderProblemCard(problem, index)
                ).join('');
                
                if (filteredProblems.length === 0) {
                    problemsList.innerHTML = `
                        <div class="no-matches-info">
                            <i class="fas fa-info-circle"></i>
                            <p>No problems match the current threshold. Try lowering the similarity threshold.</p>
                        </div>
                    `;
                }
                
                problemsList.style.opacity = '1';
                
                // Re-attach event handlers
                this.attachProblemCardHandlers();
            }, 150);
        }
        
        // Update results info
        const resultsInfo = problemsListSection.querySelector('.results-info');
        if (resultsInfo) {
            resultsInfo.textContent = `Showing ${Math.min(50, filteredProblems.length)} of ${filteredProblems.length} matched / ${this.state.allProblems.length} total scanned`;
        }
    }
    
    attachProblemCardHandlers() {
        const problemCards = this.container.querySelectorAll('.problems-list .problem-card');
        problemCards.forEach(card => {
            card.addEventListener('click', () => {
                const problemIndex = parseInt(card.dataset.problemIndex);
                const filtered = this.filterProblemsByThreshold();
                const problem = filtered[problemIndex];
                
                if (problem) {
                    this.selectProblem(problem);
                }
            });
        });
    }
    
    filterProblemsByThreshold() {
        return this.state.allProblems.filter(p => 
            (p.similarity || p.confidence_score || 0) >= this.state.currentThreshold
        );
    }
    
    selectProblem(problem) {
        this.state.selectedProblem = problem;
        this.updateStateManager();
        this.updateStepValidation();
        
        // Re-render to show selection
        this.renderResults();
        
        if (this.services.toastManager) {
            const title = problem.title || problem.label || 'Problem';
            this.services.toastManager.success(`Selected: ${title.substring(0, 50)}${title.length > 50 ? '...' : ''}`);
        }
    }
    
    handleFieldChange(newField) {
        if (!newField) return;
        
        const newFieldId = newField.id || newField.label;
        const currentFieldId = this.state.currentField?.id || this.state.currentField?.label;
        
        if (newFieldId === currentFieldId) return;
        
        console.log('🧩 Field changed:', {
            from: currentFieldId,
            to: newFieldId
        });
        
        // Store current field in history if it has analysis
        if (this.state.currentField && this.state.analysisComplete) {
            this.state.previousFields.unshift(this.state.currentField);
            if (this.state.previousFields.length > 5) {
                this.state.previousFields = this.state.previousFields.slice(0, 5);
            }
        }
        
        // Update current field
        this.state.currentField = newField;
        
        // Check if we have cached analysis for this field
        const cachedAnalysis = this.getCachedFieldAnalysis(newField);
        
        if (cachedAnalysis) {
            this.showFieldChangeOptions(cachedAnalysis);
        } else {
            this.resetAnalysisState();
        }
    }
    
    showFieldComparison() {
        if (!this.components.fieldComparisonModal) return;
        
        const comparisons = [];
        this.fieldAnalysisCache.forEach((data, fieldId) => {
            comparisons.push({
                field: data.field,
                problemCount: data.orkgProblems.length,
                totalProblems: data.allProblems.length,
                maxSimilarity: data.maxSimilarity,
                selectedProblem: data.selectedProblem,
                aiProblem: data.aiProblem,
                threshold: data.threshold,
                timestamp: data.timestamp
            });
        });
        
        this.components.fieldComparisonModal.show(comparisons, this.state.currentField);
    }
    
    initializeInlineEditors() {
        if (!this.state.aiProblem || !this.state.aiProblem.editable) return;
        
        // Clean up existing editors
        if (this.components.aiProblemEditors.title) {
            this.components.aiProblemEditors.title.destroy();
            this.components.aiProblemEditors.title = null;
        }
        
        if (this.components.aiProblemEditors.description) {
            this.components.aiProblemEditors.description.destroy();
            this.components.aiProblemEditors.description = null;
        }
        
        // Initialize title editor
        const titleElement = this.container.querySelector('#ai-problem-title');
        if (titleElement && InlineEditor) {
            this.components.aiProblemEditors.title = new InlineEditor(titleElement, {
                multiline: false,
                placeholder: 'Enter problem title...',
                maxLength: 200,
                onChange: (value) => {
                    this.state.aiProblem.title = value;
                    this.saveAIProblemChanges();
                }
            });
        }
        
        // Initialize description editor
        const descElement = this.container.querySelector('#ai-problem-description');
        if (descElement && InlineEditor) {
            this.components.aiProblemEditors.description = new InlineEditor(descElement, {
                multiline: true,
                placeholder: 'Enter problem description...',
                maxLength: 1000,
                onChange: (value) => {
                    this.state.aiProblem.description = value;
                    this.saveAIProblemChanges();
                }
            });
        }
    }
    
    saveAIProblemChanges() {
        // Cache the edited problem
        this.cacheFieldAnalysis(this.state.currentField.id || this.state.currentField.label);
        
        // Update state manager
        this.updateStateManager();
        
        // Show feedback
        if (this.services.toastManager) {
            this.services.toastManager.success('Problem saved', 2000);
        }
    }
    
    // Cache and state management methods
    getCachedFieldAnalysis(field) {
        if (!field) return null;
        const fieldId = field.id || field.label;
        return this.fieldAnalysisCache.get(fieldId);
    }
    
    cacheFieldAnalysis(fieldId) {
        const analysisData = {
            field: this.state.currentField,
            aiProblem: this.state.aiProblem,
            allProblems: this.state.allProblems,
            orkgProblems: this.state.orkgProblems,
            maxSimilarity: this.state.maxSimilarity,
            threshold: this.state.currentThreshold,
            selectedProblem: this.state.selectedProblem,
            timestamp: Date.now()
        };
        
        this.fieldAnalysisCache.set(fieldId, analysisData);
        
        if (this.fieldAnalysisCache.size > this.maxCachedFields) {
            const firstKey = this.fieldAnalysisCache.keys().next().value;
            this.fieldAnalysisCache.delete(firstKey);
        }
    }
    
    applyCachedResults(cachedData) {
        this.state.aiProblem = cachedData.aiProblem;
        this.state.allProblems = cachedData.allProblems;
        this.state.orkgProblems = cachedData.orkgProblems;
        this.state.maxSimilarity = cachedData.maxSimilarity;
        this.state.currentThreshold = cachedData.threshold;
        this.state.selectedProblem = cachedData.selectedProblem;
        this.state.analysisComplete = true;
        this.state.analysisPhase = 'complete';
    }
    
    resetAnalysisState() {
        this.state.analysisComplete = false;
        this.state.aiProblem = null;
        this.state.orkgProblems = [];
        this.state.allProblems = [];
        this.state.selectedProblem = null;
        this.state.analysisPhase = 'idle';
        this.state.userChangedSlider = false;
    }
    
    showFieldChangeOptions(cachedAnalysis) {
        if (this.services.toastManager) {
            this.services.toastManager.showConfirmation(
                `Found previous analysis for ${this.state.currentField.label}. Use previous results?`,
                () => {
                    this.applyCachedResults(cachedAnalysis);
                    this.render('results');
                },
                () => {
                    this.resetAnalysisState();
                    this.performAnalysis();
                },
                'info'
            );
        }
    }
    
    useNewFieldAnalysis() {
        if (this.services.toastManager) {
            this.services.toastManager.info('Using new field analysis');
        }
    }
    
    keepOldFieldAnalysis() {
        if (this.state.previousFields.length > 0) {
            const previousField = this.state.previousFields[0];
            const cachedAnalysis = this.getCachedFieldAnalysis(previousField);
            
            if (cachedAnalysis) {
                this.state.currentField = previousField;
                this.applyCachedResults(cachedAnalysis);
                this.render('results');
            }
        }
    }
    
    updateStateManager() {
        if (!this.services.stateManager) return;
        
        this.services.stateManager.updateState('data.problemAnalysis', {
            aiGeneratedProblem: this.state.aiProblem,
            similarityResults: {
                results: this.state.orkgProblems,
                allResults: this.state.allProblems,
                threshold: this.state.currentThreshold,
                maxSimilarity: this.state.maxSimilarity
            },
            selectedProblem: this.state.selectedProblem,
            currentField: this.state.currentField,
            previousFields: this.state.previousFields,
            threshold: this.state.currentThreshold,
            analysisComplete: this.state.analysisComplete,
            timestamp: Date.now()
        });
    }
    
    updateStepValidation() {
        if (!this.services.workflowState) return;
        
        const isValid = !!this.state.selectedProblem;
        this.services.workflowState.setStepValidation(
            'problem',
            isValid,
            isValid ? [] : ['Please select a research problem']
        );
        
        const nextBtn = document.querySelector('#step-next-btn');
        if (nextBtn) {
            nextBtn.disabled = !isValid;
            nextBtn.classList.toggle('disabled', !isValid);
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public API
    isComplete() {
        return !!this.state.selectedProblem;
    }
    
    getSelectedProblem() {
        return this.state.selectedProblem;
    }
    
    getCurrentField() {
        return this.state.currentField;
    }
    
    getAIProblem() {
        return this.state.aiProblem;
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isAnalyzing: this.isAnalyzing,
            analysisPhase: this.state.analysisPhase,
            analysisComplete: this.state.analysisComplete,
            hasResults: this.state.allProblems.length > 0,
            hasSelection: !!this.state.selectedProblem,
            currentField: this.state.currentField?.label,
            cachedFields: this.fieldAnalysisCache.size,
            maxSimilarity: this.state.maxSimilarity,
            aiProblem: this.state.aiProblem
        };
    }
    
    reset() {
        this.state = {
            currentField: null,
            previousFields: [],
            aiProblem: null,
            orkgProblems: [],
            allProblems: [],
            selectedProblem: null,
            currentThreshold: 0.5,
            maxSimilarity: 0,
            analysisPhase: 'idle',
            analysisComplete: false,
            userChangedSlider: false
        };
        
        this.fieldAnalysisCache.clear();
        this.isAnalyzing = false;
        
        if (this.components.logger) {
            this.components.logger.clear();
        }
        
        if (this.components.aiProblemEditors.title) {
            this.components.aiProblemEditors.title.destroy();
            this.components.aiProblemEditors.title = null;
        }
        
        if (this.components.aiProblemEditors.description) {
            this.components.aiProblemEditors.description.destroy();
            this.components.aiProblemEditors.description = null;
        }
        
        if (this.container) {
            this.render('no-field');
        }
    }
    
    cleanup() {
        if (this.unsubscribeField) {
            this.unsubscribeField();
            this.unsubscribeField = null;
        }
        
        this.restoreConsoleLog();
        
        if (this.components.logger) {
            this.components.logger.destroy();
        }
        
        if (this.components.fieldComparisonModal) {
            this.components.fieldComparisonModal.destroy();
        }
        
        if (this.components.fieldSelectionModal) {
            this.components.fieldSelectionModal.destroy();
        }
        
        if (this.components.aiProblemEditors.title) {
            this.components.aiProblemEditors.title.destroy();
        }
        
        if (this.components.aiProblemEditors.description) {
            this.components.aiProblemEditors.description.destroy();
        }
        
        this.fieldAnalysisCache.clear();
        this.services = {};
        this.reset();
        this.isInitialized = false;
        
        console.log('🧹 ProblemStep cleaned up');
    }
}

export default ProblemStep;
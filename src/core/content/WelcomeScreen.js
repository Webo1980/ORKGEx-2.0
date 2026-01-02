// ================================
// src/core/content/WelcomeScreen.js - FIXED: Prevent Duplicate Events
// ================================

import { eventManager } from '../../utils/eventManager.js';
import { ValidationService } from '../services/ValidationService.js';

export class WelcomeScreen {
    constructor() {
        this.container = null;
        this.validationService = new ValidationService();
        this.isInitialized = false;
        this.currentValidation = null;
        this.accordionStates = new Map();
        this.validationInProgress = false;
        this.mainContentArea = null;
        this.eventHandlers = [];
        this.eventUnsubscribers = []; // FIXED: Track event unsubscribers
        this.hasShownValidationToast = false; // FIXED: Prevent duplicate toasts
    }
    
    async init() {
        try {
            console.log('🎬 Initializing WelcomeScreen...');
            
            this.findMainContentArea();
            this.removeExistingContainers();
            this.createWelcomeContainer();
            this.setupEventListeners();
            
            await this.validationService.init();
            
            this.isInitialized = true;
            console.log('✅ WelcomeScreen initialized');
            
            await this.loadCurrentPageInfo();
            
        } catch (error) {
            console.error('❌ WelcomeScreen initialization failed:', error);
            this.getToastManager()?.error('Failed to initialize welcome screen');
        }
    }

    getToastManager() {
        return window.serviceManager?.getService('toastManager') || window.toastManager;
    }
    
    getStateManager() {
        return window.serviceManager?.getService('stateManager') || window.stateManager;
    }
    
    getWorkflowState() {
        return window.serviceManager?.getService('workflowState') || window.workflowState;
    }
    
    findMainContentArea() {
        this.mainContentArea = document.querySelector('.main-content');
        if (!this.mainContentArea) {
            throw new Error('Main content area not found');
        }
    }
    
    removeExistingContainers() {
        const existingContainers = document.querySelectorAll('#welcome-container, .welcome-container');
        existingContainers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
                console.log('🧹 Removed existing welcome container');
            }
        });
    }
    
    createWelcomeContainer() {
        this.container = document.createElement('div');
        this.container.id = 'welcome-container';
        this.container.className = 'welcome-container';
        
        this.container.innerHTML = this.getWelcomeHTML();
        this.mainContentArea.appendChild(this.container);
        
        console.log('📄 Welcome container created and added to DOM');
    }
    
    getWelcomeHTML() {
        return `
            <!-- Welcome Header -->
            <div class="welcome-header">
                <div class="brand-container">
                    <div class="brand-icon-wrapper">
                        <div class="brand-icon">🧠⚙️🏷️</div>
                    </div>
                    <h1 class="brand-title">ORKG Annotator</h1>
                    <p class="brand-subtitle">AI-Powered Research Analysis</p>
                    <p class="brand-description">
                        Automatically extract metadata, classify research fields, identify problems,
                        and create structured annotations using advanced AI and the Open Research
                        Knowledge Graph.
                    </p>
                </div>
            </div>

            <!-- Features Section -->
            <div class="features-section">
                <div class="features-grid">
                    <div class="feature-card">
                        <div class="feature-icon-wrapper">
                            <i class="fas fa-file-text feature-icon"></i>
                        </div>
                        <div class="feature-content">
                            <h3 class="feature-title">Smart Extraction</h3>
                            <p class="feature-description">Automatically extract paper metadata and bibliographic information</p>
                        </div>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon-wrapper">
                            <i class="fas fa-puzzle-piece feature-icon"></i>
                        </div>
                        <div class="feature-content">
                            <h3 class="feature-title">Problem Discovery</h3>
                            <p class="feature-description">Find similar research problems and generate new ones</p>
                        </div>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon-wrapper">
                            <i class="fas fa-clipboard-list feature-icon"></i>
                        </div>
                        <div class="feature-content">
                            <h3 class="feature-title">Template Matching</h3>
                            <p class="feature-description">Automatically select appropriate annotation templates</p>
                        </div>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon-wrapper">
                            <i class="fas fa-microscope feature-icon"></i>
                        </div>
                        <div class="feature-content">
                            <h3 class="feature-title">Content Analysis</h3>
                            <p class="feature-description">Perform detailed extraction of structured information</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Current Page Section -->
            <div class="current-page-section">
                <div class="section-header">
                    <div class="section-icon">
                        <i class="fas fa-globe"></i>
                    </div>
                    <h3 class="section-title">Current Page Analysis</h3>
                </div>
                <div class="current-page-content">
                    <div id="current-page-info" class="page-info-display">
                        <div class="page-title-display loading" id="current-page-title">
                            <i class="fas fa-spinner animate-spin"></i>
                            Loading page information...
                        </div>
                        <div class="page-url-display loading" id="current-page-url">Please wait...</div>
                    </div>
                </div>
            </div>

            <!-- Validation Results Section -->
            <div class="validation-section">
                <div class="section-header">
                    <div class="section-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3 class="section-title">Page Quality Assessment</h3>
                </div>
                
                <div id="validation-results" class="validation-results">
                    <div id="validation-loading" class="validation-loading">
                        <div class="loading-spinner"></div>
                        <p>Analyzing page quality...</p>
                    </div>
                    
                    <div id="validation-display" class="validation-display hidden">
                        <div class="validation-summary">
                            <div class="score-circle">
                                <div class="score-progress" id="score-progress">
                                    <svg class="progress-ring" width="80" height="80">
                                        <circle class="progress-ring-background" cx="40" cy="40" r="35"></circle>
                                        <circle class="progress-ring-progress" cx="40" cy="40" r="35" id="progress-circle"></circle>
                                    </svg>
                                    <div class="score-content">
                                        <span class="score-percentage" id="score-percentage">0%</span>
                                        <span class="score-label">Quality</span>
                                    </div>
                                </div>
                            </div>
                            <div class="validation-summary-content">
                                <h4 id="validation-status-title" class="status-title">Analyzing...</h4>
                                <p id="validation-status-description" class="status-description">Please wait while we assess the page quality</p>
                                <div class="status-badges">
                                    <span id="accessibility-badge" class="status-badge hidden">
                                        <i class="fas fa-universal-access"></i>
                                        Accessible
                                    </span>
                                    <span id="content-badge" class="status-badge hidden">
                                        <i class="fas fa-file-alt"></i>
                                        Rich Content
                                    </span>
                                    <span id="academic-badge" class="status-badge hidden">
                                        <i class="fas fa-graduation-cap"></i>
                                        Academic
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="validation-details">
                            <div class="accordion-item">
                                <button class="accordion-header" type="button" data-accordion="accessibility" aria-expanded="false">
                                    <div class="accordion-title">
                                        <i class="fas fa-universal-access accordion-icon"></i>
                                        <span>Accessibility & Format</span>
                                    </div>
                                    <div class="accordion-status">
                                        <span id="accessibility-count" class="check-count">0/0</span>
                                        <i class="fas fa-chevron-down accordion-chevron"></i>
                                    </div>
                                </button>
                                <div class="accordion-content" id="accessibility-content">
                                    <div class="check-list" id="accessibility-checks"></div>
                                </div>
                            </div>

                            <div class="accordion-item">
                                <button class="accordion-header" type="button" data-accordion="structure" aria-expanded="false">
                                    <div class="accordion-title">
                                        <i class="fas fa-sitemap accordion-icon"></i>
                                        <span>Content Structure</span>
                                    </div>
                                    <div class="accordion-status">
                                        <span id="structure-count" class="check-count">0/0</span>
                                        <i class="fas fa-chevron-down accordion-chevron"></i>
                                    </div>
                                </button>
                                <div class="accordion-content" id="structure-content">
                                    <div class="check-list" id="structure-checks"></div>
                                </div>
                            </div>

                            <div class="accordion-item">
                                <button class="accordion-header" type="button" data-accordion="metadata" aria-expanded="false">
                                    <div class="accordion-title">
                                        <i class="fas fa-tags accordion-icon"></i>
                                        <span>Metadata Availability</span>
                                    </div>
                                    <div class="accordion-status">
                                        <span id="metadata-count" class="check-count">0/0</span>
                                        <i class="fas fa-chevron-down accordion-chevron"></i>
                                    </div>
                                </button>
                                <div class="accordion-content" id="metadata-content">
                                    <div class="check-list" id="metadata-checks"></div>
                                </div>
                            </div>

                            <div class="accordion-item">
                                <button class="accordion-header" type="button" data-accordion="academic" aria-expanded="false">
                                    <div class="accordion-title">
                                        <i class="fas fa-graduation-cap accordion-icon"></i>
                                        <span>Academic Content</span>
                                    </div>
                                    <div class="accordion-status">
                                        <span id="academic-count" class="check-count">0/0</span>
                                        <i class="fas fa-chevron-down accordion-chevron"></i>
                                    </div>
                                </button>
                                <div class="accordion-content" id="academic-content">
                                    <div class="check-list" id="academic-checks"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="validation-error" class="validation-error hidden">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h4>Validation Failed</h4>
                        <p id="validation-error-message">Unable to analyze the current page. Please try again.</p>
                        <button id="retry-validation-btn" class="btn btn-secondary">
                            <i class="fas fa-redo"></i>
                            Retry Analysis
                        </button>
                    </div>
                </div>
            </div>

            <!-- Actions Section -->
            <div class="actions-section">
                <div id="welcome-actions" class="action-buttons">
                    <!-- Action buttons will be populated dynamically -->
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // FIXED: Clean up existing event listeners first
        this.cleanupEventHandlers();
        
        // Event delegation for DOM events
        const accordionHandler = (event) => {
            const accordionHeader = event.target.closest('.accordion-header');
            if (accordionHeader && this.container && this.container.contains(accordionHeader)) {
                event.preventDefault();
                this.toggleAccordion(accordionHeader);
            }
        };
        
        const retryHandler = (event) => {
            if (event.target.closest('#retry-validation-btn') && 
                this.container && this.container.contains(event.target)) {
                event.preventDefault();
                this.runValidation();
            }
        };

        const startAnalysisHandler = (event) => {
            const startButton = event.target.closest('#start-analysis-btn');
            if (startButton && this.container && this.container.contains(startButton)) {
                event.preventDefault();
                console.log('🚀 Start Analysis button clicked');
                this.startAnalysis();
            }
        };

        document.addEventListener('click', accordionHandler);
        document.addEventListener('click', retryHandler);
        document.addEventListener('click', startAnalysisHandler);
        
        this.eventHandlers = [
            { type: 'click', handler: accordionHandler },
            { type: 'click', handler: retryHandler },
            { type: 'click', handler: startAnalysisHandler }
        ];

        // FIXED: EventManager listeners with proper cleanup tracking
        this.eventUnsubscribers = [
            eventManager.on('validation:progress', (data) => {
                this.updateValidationProgress(data);
            }),

            eventManager.on('validation:started', () => {
                this.validationInProgress = true;
                this.showValidationLoading();
            }),

            eventManager.on('validation:completed', (results) => {
                this.validationInProgress = false;
                this.currentValidation = results;
                this.displayValidationResults(results);
            }),

            eventManager.on('validation:failed', (error) => {
                this.validationInProgress = false;
                this.showValidationError(error);
            }),

            eventManager.on('metadata:extracted', (metadata) => {
                console.log('📊 Metadata extracted event received in WelcomeScreen:', metadata);
            })
        ];
    }
    
    // FIXED: Proper cleanup of all event listeners
    cleanupEventHandlers() {
        // Remove DOM event listeners
        this.eventHandlers.forEach(({ type, handler }) => {
            document.removeEventListener(type, handler);
        });
        this.eventHandlers = [];
        
        // Remove EventManager listeners
        if (this.eventUnsubscribers) {
            this.eventUnsubscribers.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            this.eventUnsubscribers = [];
        }
    }
    
    async loadCurrentPageInfo() {
        try {
            console.log('📄 Loading current page info...');
            
            const tabInfo = await this.getCurrentTabInfo();
            if (tabInfo) {
                this.updateCurrentPageInfo(tabInfo);
                
                setTimeout(() => {
                    this.runValidation();
                }, 500);
            }
        } catch (error) {
            console.error('Failed to load current page info:', error);
            this.showCurrentPageError();
            this.getToastManager()?.error('Failed to load page information');
        }
    }
    
    async getCurrentTabInfo() {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                return new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: 'GET_TAB_INFO' }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.warn('Chrome runtime error:', chrome.runtime.lastError);
                            resolve(this.getFallbackTabInfo());
                        } else if (response?.success && response.tab) {
                            resolve(response.tab);
                        } else {
                            resolve(this.getFallbackTabInfo());
                        }
                    });
                });
            }
            
            return this.getFallbackTabInfo();
            
        } catch (error) {
            console.error('Failed to get tab info:', error);
            return this.getFallbackTabInfo();
        }
    }

    getFallbackTabInfo() {
        return {
            id: 'demo',
            url: 'https://jbiomedsem.biomedcentral.com/articles/10.1186/s13326-024-00314-1',
            title: 'Chemical entity normalization for successful translational development of Alzheimer\'s disease and dementia therapeutics | Journal of Biomedical Semantics | Full Text',
            status: 'complete'
        };
    }
    
    updateCurrentPageInfo(tabInfo) {
        console.log('📄 Updating page info:', tabInfo.title);
        
        const titleEl = this.container.querySelector('#current-page-title');
        const urlEl = this.container.querySelector('#current-page-url');
        
        if (titleEl) {
            let title = tabInfo.title || 'Unknown Page';
            if (title.length > 100) {
                title = title.substring(0, 100) + '...';
            }
            titleEl.textContent = title;
            titleEl.classList.remove('loading');
        }
        
        if (urlEl) {
            try {
                const url = new URL(tabInfo.url);
                urlEl.textContent = url.hostname;
                urlEl.classList.remove('loading');
            } catch (error) {
                urlEl.textContent = 'Unknown URL';
                urlEl.classList.remove('loading');
            }
        }
        
        const headerTitle = document.getElementById('header-page-title');
        if (headerTitle) {
            headerTitle.textContent = this.truncateText(tabInfo.title || 'Unknown Page', 30);
        }
        
        const headerStatus = document.getElementById('header-page-status');
        if (headerStatus) {
            headerStatus.textContent = 'Analyzing current page';
        }
    }
    
    showCurrentPageError() {
        const titleEl = this.container.querySelector('#current-page-title');
        const urlEl = this.container.querySelector('#current-page-url');
        
        if (titleEl) {
            titleEl.textContent = 'Unable to access page information';
            titleEl.classList.remove('loading');
        }
        if (urlEl) {
            urlEl.textContent = 'Unknown';
            urlEl.classList.remove('loading');
        }
    }
    
    async runValidation() {
        if (this.validationInProgress) {
            console.log('⏳ Validation already in progress');
            return;
        }

        try {
            console.log('🔍 Starting page validation...');
            
            // FIXED: Reset toast flag for new validation
            this.hasShownValidationToast = false;
            
            this.initializeValidationCategories();
            this.showValidationLoading();
            
            const results = await this.validationService.validateCurrentPage();
            
            console.log('✅ Validation completed:', results);
            
            this.currentValidation = results;
            this.displayValidationResults(results);

            // FIXED: Only show toast once per validation
            if (!this.hasShownValidationToast) {
                this.getToastManager()?.success('Validation completed successfully');
                this.hasShownValidationToast = true;
            }
            
        } catch (error) {
            console.error('❌ Validation failed:', error);
            this.getToastManager()?.error(`Validation failed: ${error.message}`);
        }
    }

    initializeValidationCategories() {
        const categories = ['accessibility', 'structure', 'metadata', 'academic'];
        
        categories.forEach(categoryId => {
            const countElement = this.container.querySelector(`#${categoryId}-count`);
            const checksContainer = this.container.querySelector(`#${categoryId}-checks`);
            
            if (countElement) {
                countElement.textContent = '0/0';
                countElement.style.background = '#f59e0b';
                countElement.style.color = 'white';
            }
            
            if (checksContainer) {
                checksContainer.innerHTML = '<div class="validation-running">🔄 Running checks...</div>';
            }
        });
    }

    updateValidationProgress(data) {
        const { step, progress } = data;
        
        const categorySteps = {
            'accessibility_checks': 'accessibility',
            'structure_checks': 'structure', 
            'metadata_checks': 'metadata',
            'academic_checks': 'academic'
        };

        const categoryId = categorySteps[step];
        if (categoryId) {
            const countElement = this.container.querySelector(`#${categoryId}-count`);
            if (countElement) {
                countElement.style.background = '#22c55e';
                countElement.style.color = 'white';
                countElement.textContent = 'Done';
            }
        }
    }
    
    showValidationLoading() {
        const validationLoading = this.container.querySelector('#validation-loading');
        const validationDisplay = this.container.querySelector('#validation-display');
        const validationError = this.container.querySelector('#validation-error');
        
        if (validationDisplay) validationDisplay.classList.add('hidden');
        if (validationError) validationError.classList.add('hidden');
        
        if (validationLoading) {
            validationLoading.classList.remove('hidden');
        }
    }
    
    displayValidationResults(results) {
        const validationLoading = this.container.querySelector('#validation-loading');
        const validationDisplay = this.container.querySelector('#validation-display');
        const validationError = this.container.querySelector('#validation-error');
        
        if (validationLoading) validationLoading.classList.add('hidden');
        if (validationError) validationError.classList.add('hidden');
        
        if (validationDisplay) {
            validationDisplay.classList.remove('hidden');
            
            this.updateScoreDisplay(results.score);
            this.updateStatusContent(results);
            this.updateDetailedChecks(results);
            this.updateActionButtons(results);
        }

        const headerStatus = document.getElementById('header-page-status');
        if (headerStatus) {
            headerStatus.textContent = `Quality: ${results.score}% - ${this.getQualityLabel(results.score)}`;
        }
        
        const stateManager = this.getStateManager();
        if (stateManager) {
            stateManager.updateState('data.validationResults', results);
            
            if (results.extractedMetadata) {
                console.log('📊 Storing extracted metadata from validation:', results.extractedMetadata);
                stateManager.updateState('data.metadata', results.extractedMetadata);
            }
        }

        // FIXED: Only show completion toast once and with proper message variety
        if (!this.hasShownValidationToast) {
            const message = `Page analysis complete: ${results.score}% quality score`;
            const toastManager = this.getToastManager();

            if (results.score >= 70) {
                toastManager?.success(message);
            } else if (results.score >= 50) {
                toastManager?.warning(message);
            } else {
                toastManager?.error(message);
            }
            
            this.hasShownValidationToast = true;
        }
    }

    updateScoreDisplay(score) {
        const scorePercentage = this.container.querySelector('#score-percentage');
        if (scorePercentage) {
            scorePercentage.textContent = `${score}%`;
        }
        
        const progressCircle = this.container.querySelector('#progress-circle');
        if (progressCircle) {
            const circumference = 2 * Math.PI * 35;
            const offset = circumference - (score / 100) * circumference;
            
            progressCircle.style.strokeDasharray = circumference;
            progressCircle.style.strokeDashoffset = offset;
            progressCircle.style.stroke = this.getScoreColor(score);
        }
    }

    getScoreColor(score) {
        if (score >= 85) return '#22c55e';
        if (score >= 70) return '#3b82f6';
        if (score >= 50) return '#f59e0b';
        if (score >= 30) return '#ef4444';
        return '#6b7280';
    }

    getQualityLabel(score) {
        if (score >= 85) return 'Excellent';
        if (score >= 70) return 'Good';
        if (score >= 50) return 'Fair';
        if (score >= 30) return 'Poor';
        return 'Failed';
    }

    updateStatusContent(results) {
        const quality = this.getQualityLabel(results.score);
        
        const statusTitle = this.container.querySelector('#validation-status-title');
        if (statusTitle) {
            statusTitle.textContent = quality;
        }
        
        const statusDescription = this.container.querySelector('#validation-status-description');
        if (statusDescription) {
            if (results.score >= 70) {
                statusDescription.textContent = 'This page is excellent for automatic analysis.';
            } else if (results.score >= 50) {
                statusDescription.textContent = 'This page meets minimum requirements for analysis.';
            } else if (results.score >= 30) {
                statusDescription.textContent = 'This page has quality issues that prevent automatic analysis.';
            } else {
                statusDescription.textContent = 'This page does not meet the requirements for analysis.';
            }
        }
        
        this.updateStatusBadges(results);
    }

    updateStatusBadges(results) {
        const badges = {
            accessibility: this.container.querySelector('#accessibility-badge'),
            content: this.container.querySelector('#content-badge'),
            academic: this.container.querySelector('#academic-badge')
        };
        
        Object.values(badges).forEach(badge => {
            if (badge) badge.classList.add('hidden');
        });
        
        if (results.score >= 70) {
            if (badges.accessibility) badges.accessibility.classList.remove('hidden');
        }
        
        if (results.score >= 60) {
            if (badges.content) badges.content.classList.remove('hidden');
        }
        
        if (results.pageType === 'academic_paper' || results.pageType === 'academic_content') {
            if (badges.academic) badges.academic.classList.remove('hidden');
        }
    }

    updateDetailedChecks(results) {
        console.log('🔍 Updating detailed checks with results:', results);
        
        const categories = {
            accessibility: {
                checks: this.filterChecksByCategory(results.checks, ['page_accessible', 'academic_domain', 'extraction_barriers']),
                name: 'Accessibility & Format'
            },
            structure: {
                checks: this.filterChecksByCategory(results.checks, ['html_content', 'pdf_content', 'academic_keywords', 'dom_structure']),
                name: 'Content Structure'
            },
            metadata: {
                checks: this.filterChecksByCategory(results.checks, ['doi_present', 'title_quality', 'abstract_quality', 'author_info', 'publication_venue', 'metadata_extraction_failed', 'metadata_extraction_error']),
                name: 'Metadata Availability'
            },
            academic: {
                checks: this.filterChecksByCategory(results.checks, ['academic_publisher', 'research_indicators']),
                name: 'Academic Content'
            }
        };
        
        Object.entries(categories).forEach(([categoryId, categoryData]) => {
            console.log(`📊 Updating category ${categoryId} with ${categoryData.checks.length} checks:`, 
                categoryData.checks.map(c => `${c.id}: ${c.status}`));
            this.updateCheckCategory(categoryId, categoryData.checks);
        });
    }

    filterChecksByCategory(allChecks, categoryIds) {
        return allChecks.filter(check => categoryIds.includes(check.id));
    }

    updateCheckCategory(categoryId, checks) {
        const countElement = this.container.querySelector(`#${categoryId}-count`);
        if (countElement) {
            const passedCount = checks.filter(check => check.status === 'passed').length;
            const totalCount = checks.length;
            
            countElement.textContent = `${passedCount}/${totalCount}`;
            
            if (totalCount === 0) {
                countElement.style.background = '#6b7280';
                countElement.textContent = 'N/A';
            } else {
                const percentage = (passedCount / totalCount) * 100;
                if (percentage >= 80) {
                    countElement.style.background = '#22c55e';
                } else if (percentage >= 50) {
                    countElement.style.background = '#f59e0b';
                } else {
                    countElement.style.background = '#ef4444';
                }
            }
            countElement.style.color = 'white';
        }
        
        const checksContainer = this.container.querySelector(`#${categoryId}-checks`);
        if (checksContainer) {
            checksContainer.innerHTML = '';
            
            if (checks.length === 0) {
                console.log(`ℹ️ No checks available for category: ${categoryId}`);
                checksContainer.innerHTML = '<p class="no-checks">No checks available for this category</p>';
                return;
            }
            
            checks.forEach(check => {
                const checkElement = this.createCheckElement(check);
                checksContainer.appendChild(checkElement);
            });
        }
    }

    createCheckElement(check) {
        const element = document.createElement('div');
        element.className = 'check-item';
        
        const icon = this.getCheckIcon(check.status);
        
        element.innerHTML = `
            <div class="check-icon ${check.status}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="check-content">
                <div class="check-title">${check.title}</div>
                <p class="check-message">${check.details || check.description}</p>
            </div>
        `;
        
        return element;
    }

    getCheckIcon(status) {
        const icons = {
            'passed': 'fa-check',
            'warning': 'fa-exclamation-triangle',
            'failed': 'fa-times',
            'error': 'fa-exclamation-circle'
        };
        return icons[status] || 'fa-question';
    }
    
    updateActionButtons(results) {
        const actionsContainer = this.container.querySelector('#welcome-actions');
        if (!actionsContainer) return;

        actionsContainer.innerHTML = '';
        
        const { score } = results;
        
        if (results.canProceed && score >= 50) {
            const startButton = this.createStartAnalysisButton();
            actionsContainer.appendChild(startButton);
            
            if (score < 70) {
                const noteElement = document.createElement('p');
                noteElement.className = 'action-note';
                noteElement.textContent = 'Some manual verification may be required during analysis.';
                noteElement.style.cssText = 'font-size: 14px; color: #6b7280; margin-top: 8px; text-align: center;';
                actionsContainer.appendChild(noteElement);
            }
            
        } else if (score < 30) {
            const warningWrapper = this.createWarningWrapper();
            actionsContainer.appendChild(warningWrapper);
            
        } else {
            const retryWrapper = this.createRetryWrapper();
            actionsContainer.appendChild(retryWrapper);
        }
    }

    createStartAnalysisButton() {
        const button = document.createElement('button');
        button.id = 'start-analysis-btn';
        button.className = 'btn btn-primary action-btn';
        button.innerHTML = `
            <i class="fas fa-play"></i>
            <span>Start Analysis</span>
        `;
        return button;
    }
    
    createWarningWrapper() {
        const warningWrapper = document.createElement('div');
        warningWrapper.className = 'cannot-proceed-wrapper';
        warningWrapper.style.cssText = 'text-align: center; padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;';
        
        warningWrapper.innerHTML = `
            <div style="font-size: 2rem; color: #dc2626; margin-bottom: 12px;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h4 style="color: #dc2626; margin: 0 0 8px 0;">Not a Research Paper</h4>
            <p style="color: #7f1d1d; margin: 0 0 16px 0;">
                This page does not appear to contain academic research content suitable for annotation.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="btn btn-secondary" data-action="find-alternative">
                    <i class="fas fa-search"></i>
                    <span>Find Research Paper</span>
                </button>
            </div>
        `;
        
        const findButton = warningWrapper.querySelector('[data-action="find-alternative"]');
        if (findButton) {
            findButton.addEventListener('click', () => this.findAlternative());
        }
        
        return warningWrapper;
    }
    
    createRetryWrapper() {
        const retryWrapper = document.createElement('div');
        retryWrapper.className = 'retry-actions-wrapper';
        retryWrapper.style.cssText = 'text-align: center; padding: 16px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px;';
        
        retryWrapper.innerHTML = `
            <p style="font-size: 14px; color: #92400e; margin-bottom: 16px; line-height: 1.5;">
                This page has quality issues that prevent reliable analysis. Please try refreshing or finding an alternative source.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-primary" data-action="retry-validation">
                    <i class="fas fa-redo"></i>
                    <span>Retry Analysis</span>
                </button>
                <button class="btn btn-secondary" data-action="refresh-page">
                    <i class="fas fa-refresh"></i>
                    <span>Refresh Page</span>
                </button>
            </div>
        `;
        
        const retryButton = retryWrapper.querySelector('[data-action="retry-validation"]');
        const refreshButton = retryWrapper.querySelector('[data-action="refresh-page"]');
        
        if (retryButton) {
            retryButton.addEventListener('click', () => this.runValidation());
        }
        
        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshPage());
        }
        
        return retryWrapper;
    }
    
    startAnalysis() {
        try {
            console.log('🚀 Starting analysis workflow...');
            
            const stateManager = this.getStateManager();
            
            if (this.currentValidation && stateManager) {
                stateManager.updateState('data.validationResults', this.currentValidation);
                
                if (this.currentValidation.extractedMetadata) {
                    console.log('📊 Storing metadata for navigation:', this.currentValidation.extractedMetadata);
                    stateManager.updateState('data.metadata', this.currentValidation.extractedMetadata);
                    
                    const workflowState = this.getWorkflowState();
                    if (workflowState) {
                        workflowState.setStepValidation('welcome', true);
                        console.log('✅ Welcome step marked as valid');
                    }
                }
            }

            this.getToastManager()?.info('Starting analysis workflow...');
            this.showAnalysisStarting();
            
            console.log('🧭 Emitting navigation event to metadata step');
            eventManager.emit('NAVIGATE_TO_STEP', { 
                step: 'metadata', 
                previousStep: 'welcome',
                force: true 
            });
            
            console.log('✅ Analysis workflow started, navigating to metadata step');
            
        } catch (error) {
            console.error('❌ Failed to start analysis:', error);
            this.getToastManager()?.error('Failed to start analysis workflow');
        }
    }

    refreshPage() {
        console.log('🔄 Refreshing page...');
        
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({ action: 'REFRESH_TAB' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to refresh page:', chrome.runtime.lastError);
                        this.getToastManager()?.error('Failed to refresh page');
                    } else {
                        this.getToastManager()?.success('Page refreshed successfully');
                    }
                });
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error('Refresh failed:', error);
            this.getToastManager()?.error('Failed to refresh page');
            window.location.reload();
        }
    }

    findAlternative() {
        console.log('🔍 Finding alternative sources...');
        
        const pageTitle = this.container.querySelector('#current-page-title')?.textContent || 'research paper';
        const searchQuery = this.createSearchQuery(pageTitle);
        
        const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(searchQuery)}`;
        window.open(searchUrl, '_blank');
        
        this.getToastManager()?.info('Opening Google Scholar search in new tab');
    }

    createSearchQuery(title) {
        const cleanTitle = title
            .replace(/[^\w\s-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        return `${cleanTitle} research paper academic`;
    }

    showAnalysisStarting() {
        const loadingOverlay = document.getElementById('global-loading-overlay');
        if (loadingOverlay) {
            const title = document.getElementById('global-loading-title');
            const message = document.getElementById('global-loading-message');
            
            if (title) title.textContent = 'Starting Analysis';
            if (message) message.textContent = 'Preparing metadata extraction workflow...';
            
            loadingOverlay.classList.remove('hidden');
        }
    }
    
    showValidationError(error) {
        const validationLoading = this.container.querySelector('#validation-loading');
        const validationDisplay = this.container.querySelector('#validation-display');
        const validationError = this.container.querySelector('#validation-error');
        
        if (validationLoading) validationLoading.classList.add('hidden');
        if (validationDisplay) validationDisplay.classList.add('hidden');
        
        if (validationError) {
            validationError.classList.remove('hidden');
            
            const errorMessage = validationError.querySelector('#validation-error-message');
            if (errorMessage) {
                errorMessage.textContent = error.message || 'An unknown error occurred during validation.';
            }
        }

        const headerStatus = document.getElementById('header-page-status');
        if (headerStatus) {
            headerStatus.textContent = 'Validation failed';
        }
        
        this.updateActionsForError();
        this.getToastManager()?.error('Page validation failed');
    }
    
    updateActionsForError() {
        const actionsContainer = this.container.querySelector('#welcome-actions');
        if (!actionsContainer) return;
        
        actionsContainer.innerHTML = '';
        
        const errorWrapper = document.createElement('div');
        errorWrapper.className = 'error-actions-wrapper';
        errorWrapper.style.cssText = 'text-align: center; padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;';
        
        errorWrapper.innerHTML = `
            <p style="font-size: 14px; color: #dc2626; margin-bottom: 16px;">
                Unable to analyze this page. Please try again or check your connection.
            </p>
            <button class="btn btn-primary" data-action="retry-validation-error">
                <i class="fas fa-redo"></i>
                <span>Retry Analysis</span>
            </button>
        `;
        
        const retryButton = errorWrapper.querySelector('[data-action="retry-validation-error"]');
        if (retryButton) {
            retryButton.addEventListener('click', () => this.runValidation());
        }
        
        actionsContainer.appendChild(errorWrapper);
    }

    toggleAccordion(headerElement) {
        const accordionId = headerElement.dataset.accordion;
        if (!accordionId) return;
        
        const contentElement = this.container.querySelector(`#${accordionId}-content`);
        if (!contentElement) return;
        
        const isExpanded = headerElement.getAttribute('aria-expanded') === 'true';
        const newState = !isExpanded;
        
        headerElement.setAttribute('aria-expanded', newState.toString());
        
        if (newState) {
            contentElement.classList.add('expanded');
            contentElement.style.maxHeight = contentElement.scrollHeight + 'px';
        } else {
            contentElement.classList.remove('expanded');
            contentElement.style.maxHeight = '0px';
        }
        
        this.accordionStates.set(accordionId, newState);
        
        const chevron = headerElement.querySelector('.accordion-chevron');
        if (chevron) {
            chevron.style.transform = newState ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    // Public API Methods
    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
        }
    }
    
    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
        }
    }
    
    async refreshValidation() {
        console.log('🔄 Refreshing validation...');
        this.hasShownValidationToast = false; // Reset toast flag
        await this.runValidation();
    }
    
    getValidationResults() {
        const stateManager = this.getStateManager();
        return this.currentValidation || (stateManager?.getState ? stateManager.getState('data.validationResults') : null);
    }
    
    reset() {
        console.log('🔄 Resetting welcome screen...');
        
        this.currentValidation = null;
        this.hasShownValidationToast = false;
        
        const validationLoading = this.container?.querySelector('#validation-loading');
        const validationDisplay = this.container?.querySelector('#validation-display');
        const validationError = this.container?.querySelector('#validation-error');
        
        if (validationLoading) validationLoading.classList.add('hidden');
        if (validationDisplay) validationDisplay.classList.add('hidden');
        if (validationError) validationError.classList.add('hidden');
        
        const actionsContainer = this.container?.querySelector('#welcome-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = '';
        }
        
        this.loadCurrentPageInfo();
    }
    
    async updateForNewTab(tabInfo) {
        console.log('🔄 Updating for new tab:', tabInfo.title);
        this.hasShownValidationToast = false; // Reset for new tab
        this.updateCurrentPageInfo(tabInfo);
        await this.runValidation();
    }
    
    getStatus() {
        const validationResults = this.getValidationResults();
        return {
            isInitialized: this.isInitialized,
            hasValidationResults: !!validationResults,
            validationScore: validationResults?.score || 0,
            canProceed: validationResults?.canProceed || false,
            pageType: validationResults?.pageType || 'unknown',
            hasContainer: !!this.container,
            containerInDOM: this.container ? document.contains(this.container) : false,
            hasShownValidationToast: this.hasShownValidationToast
        };
    }
    
    async reloadPageInfo() {
        console.log('🔄 Reloading page info...');
        await this.loadCurrentPageInfo();
    }
    
    isValidationSupported() {
        return this.validationService && this.validationService.isInitialized;
    }
    
    getValidationService() {
        return this.validationService;
    }
    
    getContainer() {
        return this.container;
    }
    
    isReady() {
        return this.isInitialized && this.container && document.contains(this.container);
    }
    
    remove() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
    
    attach(parentElement) {
        if (this.container && parentElement && !parentElement.contains(this.container)) {
            parentElement.appendChild(this.container);
        }
    }
    
    getMainContentArea() {
        return this.mainContentArea;
    }
    
    cleanup() {
        console.log('🧹 WelcomeScreen cleanup...');
        
        this.cleanupEventHandlers();
        this.remove();
        
        this.isInitialized = false;
        this.currentValidation = null;
        this.accordionStates.clear();
        this.container = null;
        this.mainContentArea = null;
        this.validationInProgress = false;
        this.hasShownValidationToast = false;
        
        if (this.validationService && this.validationService.cleanup) {
            this.validationService.cleanup();
        }
        
        console.log('✅ WelcomeScreen cleanup completed');
    }
}
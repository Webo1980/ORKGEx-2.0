// ================================
// src/core/content/ContentManager.js - COMPLETE FILE FROM SCRATCH
// ================================
import { eventManager } from '../../utils/eventManager.js';
import { ButtonManager } from '../navigation/ButtonManager.js';

export class ContentManager {
    constructor() {
        this.mainContentArea = null;
        this.welcomeContainer = null;
        this.analysisInterface = null;
        this.navigationFooter = null; // Add global navigation footer
        this.buttonManager = new ButtonManager();
        
        this.contentComponents = new Map();
        this.currentContent = 'welcome';
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) {
            console.warn('ContentManager already initialized');
            return;
        }

        try {
            console.log('📄 Initializing ContentManager...');
            
            this.findMainElements();
            this.createGlobalNavigationFooter(); // Create persistent navigation
            this.setupEventListeners();
            await this.buttonManager.init();
            
            this.isInitialized = true;
            console.log('✅ ContentManager initialized');
            
        } catch (error) {
            console.error('❌ ContentManager initialization failed:', error);
            throw error;
        }
    }
    
    getStateManager() {
        return window.serviceManager?.getService('stateManager') || window.stateManager;
    }
    
    getToastManager() {
        return window.serviceManager?.getService('toastManager') || window.toastManager;
    }
    
    getWorkflowState() {
        return window.serviceManager?.getService('workflowState') || window.workflowState;
    }
    
    async initializeWelcomeScreen() {
        try {
            console.log('🎬 Initializing WelcomeScreen component...');
            
            const { WelcomeScreen } = await import('./WelcomeScreen.js');
            const welcomeScreen = new WelcomeScreen();
            await welcomeScreen.init();
            
            this.registerComponent('welcomeScreen', welcomeScreen);
            
            console.log('✅ WelcomeScreen component initialized and registered');
            
        } catch (error) {
            console.error('❌ Failed to initialize WelcomeScreen:', error);
            throw error;
        }
    }
    
    findMainElements() {
        this.mainContentArea = document.querySelector('.main-content');
        if (!this.mainContentArea) {
            throw new Error('Main content area not found');
        }
        console.log('📄 Main content area found');
    }

    createGlobalNavigationFooter() {
        // Check if navigation footer already exists
        let existingFooter = document.querySelector('.global-navigation-footer');
        if (existingFooter) {
            existingFooter.remove();
        }
        
        // Create persistent navigation footer
        this.navigationFooter = document.createElement('div');
        this.navigationFooter.className = 'global-navigation-footer';
        this.navigationFooter.innerHTML = `
            <div class="navigation-buttons">
                <button class="btn btn-secondary" id="global-back-btn" data-nav="back">
                    <i class="fas fa-arrow-left"></i>
                    <span>Back</span>
                </button>
                <div class="navigation-spacer"></div>
                <button class="btn btn-primary" id="global-next-btn" data-nav="next">
                    <span>Next</span>
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
        
        // Append to popup container (not main content area)
        const popupContainer = document.querySelector('.popup-container');
        if (popupContainer) {
            popupContainer.appendChild(this.navigationFooter);
        }
        
        // Setup navigation button handlers
        this.setupGlobalNavigationHandlers();
        
        console.log('📄 Global navigation footer created');
    }

    setupGlobalNavigationHandlers() {
        const backBtn = this.navigationFooter?.querySelector('#global-back-btn');
        const nextBtn = this.navigationFooter?.querySelector('#global-next-btn');
        
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGlobalBack();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGlobalNext();
            });
        }
    }
    
    handleGlobalBack() {
        const workflowState = this.getWorkflowState();
        if (workflowState && workflowState.canGoBack()) {
            workflowState.goBack();
        }
    }

    handleGlobalNext() {
        const workflowState = this.getWorkflowState();
        if (workflowState && workflowState.canGoForward()) {
            workflowState.goNext();
        } else if (workflowState && workflowState.currentStep === 'analysis') {
            // Handle completion
            workflowState.markComplete();
        }
    }
    
    updateGlobalNavigationState() {
        const workflowState = this.getWorkflowState();
        if (!workflowState || !this.navigationFooter) return;
        
        const backBtn = this.navigationFooter.querySelector('#global-back-btn');
        const nextBtn = this.navigationFooter.querySelector('#global-next-btn');
        const currentStep = workflowState.currentStep;
        
        // Update back button
        if (backBtn) {
            const canGoBack = workflowState.canGoBack();
            backBtn.disabled = !canGoBack || currentStep === 'welcome';
            backBtn.classList.toggle('disabled', !canGoBack || currentStep === 'welcome');
        }
        
        // Update next button
        if (nextBtn) {
            const canGoForward = workflowState.canGoForward();
            const isLastStep = currentStep === 'analysis';
            
            nextBtn.disabled = !canGoForward && !isLastStep;
            nextBtn.classList.toggle('disabled', !canGoForward && !isLastStep);
            
            const buttonText = nextBtn.querySelector('span');
            if (buttonText) {
                if (isLastStep && workflowState.isCurrentStepValid()) {
                    buttonText.textContent = 'Complete';
                } else {
                    buttonText.textContent = 'Next';
                }
            }
        }
        
        // Hide/show navigation based on step
        if (this.navigationFooter) {
            if (currentStep === 'welcome') {
                this.navigationFooter.style.display = 'none';
            } else {
                this.navigationFooter.style.display = 'block';
            }
        }
    }

    setupEventListeners() {
        // Listen for navigation events
        eventManager.on('NAVIGATE_TO_STEP', (data) => {
            this.handleStepNavigation(data.step, data.previousStep);
        });
        
        // Listen for workflow step changes
        eventManager.on('workflow:step_changed', (data) => {
            this.handleWorkflowStepChange(data);
            this.updateGlobalNavigationState();
        });
        
        // Listen for validation changes
        eventManager.on('workflow:step_validation_updated', (data) => {
            this.updateGlobalNavigationState();
        });
        
        // Listen for content requests from components
        eventManager.on('content:show', (data) => {
            this.showContent(data.contentId, data.options);
        });
        
        eventManager.on('content:hide', (data) => {
            this.hideContent(data.contentId);
        });
    }
    
    cleanupEventListeners() {
        this.eventUnsubscribers.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.eventUnsubscribers = [];
    }
    
    handleUserResetRequest(data) {
        console.log('🔄 Handling user reset request:', data);
        
        try {
            this.currentContent = 'welcome';
            
            this.contentComponents.forEach((component, name) => {
                if (component.reset) {
                    try {
                        component.reset();
                    } catch (error) {
                        console.error(`Failed to reset component ${name}:`, error);
                    }
                }
            });
            
            const stateManager = this.getStateManager();
            if (stateManager && stateManager.reset) {
                stateManager.reset();
            }
            
            const workflowState = this.getWorkflowState();
            if (workflowState) {
                workflowState.reset('complete');
            }
            
            this.showWelcomeContent();
            
            console.log('✅ User reset completed successfully');
            
        } catch (error) {
            console.error('❌ Failed to handle user reset:', error);
        }
    }
    
    handleComponentRegistered(name, component) {
        console.log(`📄 Component registered with ContentManager: ${name}`);
        
        if (name === 'welcomeScreen' && component.getContainer) {
            this.welcomeContainer = component.getContainer();
            console.log('📄 Welcome container reference updated');
        }
    }
    
    async handleStepNavigation(newStep, previousStep) {
        try {
            console.log(`📄 Content navigation: ${previousStep || 'none'} → ${newStep}`);
            
            // Handle step-specific content changes
            await this.showStepContent(newStep);
            
            // Update current content reference
            this.currentContent = newStep;
            
            // Update global navigation state
            this.updateGlobalNavigationState();
            
        } catch (error) {
            console.error('Error handling step navigation:', error);
            eventManager.emit('error:global', {
                type: 'content_navigation_error',
                error: error.message,
                step: newStep
            });
        }
    }
    
    async handleWorkflowStepChange(data) {
        const { currentStep, previousStep, step } = data;
        
        const targetStep = currentStep || step;
        
        if (!targetStep) {
            console.error('❌ No target step provided in workflow step change event:', data);
            return;
        }
        
        console.log(`📄 Workflow step change: ${previousStep} → ${targetStep}`);
        
        // Update content visibility based on workflow step
        await this.showStepContent(targetStep);
        
        // Update global navigation state
        this.updateGlobalNavigationState();
        
        // Update step navigation visibility
        this.updateStepNavigationVisibility(targetStep);
    }
    
    async showStepContent(step) {
        if (!step) {
            console.error('❌ No step provided to showStepContent');
            return;
        }
        
        console.log(`📄 Showing content for step: ${step}`);
        
        // Clear any step-specific navigation buttons first
        this.clearStepSpecificNavigation();
        
        switch (step) {
            case 'welcome':
                await this.showWelcomeContent();
                break;
            case 'metadata':
                await this.showMetadataContent();
                break;
            case 'field':
                await this.showFieldContent();
                break;
            case 'problem':
                await this.showProblemContent();
                break;
            case 'template':
                await this.showTemplateContent();
                break;
            case 'analysis':
                await this.showAnalysisContent();
                break;
            default:
                console.warn(`Unknown step: ${step}`);
                await this.showWelcomeContent();
        }
    }
    
    clearStepSpecificNavigation() {
        // Remove any step-specific navigation that might conflict
        const stepSpecificButtons = document.querySelectorAll('.step-actions, .step-navigation-footer:not(.global-navigation-footer)');
        stepSpecificButtons.forEach(el => {
            if (el.parentNode && !el.classList.contains('global-navigation-footer')) {
                el.style.display = 'none';
            }
        });
    }

    async showWelcomeContent() {
        // Hide analysis interface
        if (this.analysisInterface) {
            this.analysisInterface.classList.add('hidden');
        }
        
        // Show welcome container
        const welcomeScreen = this.contentComponents.get('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.show();
            this.welcomeContainer = welcomeScreen.getContainer();
        } else {
            console.warn('WelcomeScreen component not found');
        }
        
        // Hide global navigation for welcome
        if (this.navigationFooter) {
            this.navigationFooter.style.display = 'none';
        }
    }
    
    showWelcomeError() {
        console.error('❌ Showing welcome error fallback');
        
        if (this.mainContentArea) {
            this.mainContentArea.innerHTML = `
                <div class="welcome-error">
                    <div class="error-content">
                        <h2>⚠️ Welcome Screen Error</h2>
                        <p>Failed to load the welcome screen component.</p>
                        <button onclick="location.reload()" class="btn btn-primary">
                            🔄 Reload Extension
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    async showMetadataContent() {
        console.log('📄 Switching to metadata step...');
        
        await this.ensureAnalysisInterface();
        
        const welcomeScreen = this.contentComponents.get('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.hide();
        }
        
        if (this.analysisInterface) {
            this.analysisInterface.classList.remove('hidden');
            await this.loadMetadataStep();
        }
        
        // Show global navigation
        if (this.navigationFooter) {
            this.navigationFooter.style.display = 'block';
        }
        
        this.showStepNavigationUI();
        
        const headerManager = window.moduleLoader?.getModule('headerManager');
        if (headerManager) {
            headerManager.setPageInfo('Step 1: Paper Information', 'Extracting metadata...');
        }
    }
    
    async showFieldContent() {
        await this.ensureAnalysisInterface();
        
        const welcomeScreen = this.contentComponents.get('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.hide();
        }
        
        if (this.analysisInterface) {
            this.analysisInterface.classList.remove('hidden');
            await this.loadFieldStep();
        }
        
        // Show global navigation
        if (this.navigationFooter) {
            this.navigationFooter.style.display = 'block';
        }
    }
    
    async showProblemContent() {
        await this.ensureAnalysisInterface();
        
        const welcomeScreen = this.contentComponents.get('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.hide();
        }
        
        if (this.analysisInterface) {
            this.analysisInterface.classList.remove('hidden');
            await this.loadProblemStep();
        }
        
        // Show global navigation
        if (this.navigationFooter) {
            this.navigationFooter.style.display = 'block';
        }
    }
    
    async showTemplateContent() {
        await this.ensureAnalysisInterface();
        
        const welcomeScreen = this.contentComponents.get('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.hide();
        }
        
        if (this.analysisInterface) {
            this.analysisInterface.classList.remove('hidden');
            await this.loadTemplateStep();
        }
        
        // Show global navigation
        if (this.navigationFooter) {
            this.navigationFooter.style.display = 'block';
        }
    }
    
    async showAnalysisContent() {
        await this.ensureAnalysisInterface();
        
        const welcomeScreen = this.contentComponents.get('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.hide();
        }
        
        if (this.analysisInterface) {
            this.analysisInterface.classList.remove('hidden');
            await this.loadAnalysisStep();
        }
        
        // Show global navigation
        if (this.navigationFooter) {
            this.navigationFooter.style.display = 'block';
        }
    }
    
    async ensureAnalysisInterface() {
        if (!this.analysisInterface) {
            await this.createAnalysisInterface();
        }
    }
    
    async createAnalysisInterface() {
        // Remove existing if present
        const existing = document.getElementById('analysis-interface');
        if (existing) {
            existing.remove();
        }
        
        // Create analysis interface
        this.analysisInterface = document.createElement('div');
        this.analysisInterface.id = 'analysis-interface';
        this.analysisInterface.className = 'analysis-interface hidden';
        
        this.analysisInterface.innerHTML = `
            <!-- Step Navigation Header -->
            <div class="step-navigation-header">
                <div class="step-progress-container">
                    <div class="step-indicators">
                        <div class="step-item" data-step="metadata">
                            <div class="step-number">1</div>
                            <div class="step-label">Metadata</div>
                        </div>
                        <div class="step-item" data-step="field">
                            <div class="step-number">2</div>
                            <div class="step-label">Field</div>
                        </div>
                        <div class="step-item" data-step="problem">
                            <div class="step-number">3</div>
                            <div class="step-label">Problem</div>
                        </div>
                        <div class="step-item" data-step="template">
                            <div class="step-number">4</div>
                            <div class="step-label">Template</div>
                        </div>
                        <div class="step-item" data-step="analysis">
                            <div class="step-number">5</div>
                            <div class="step-label">Analysis</div>
                        </div>
                    </div>
                    <div class="step-progress-bar">
                        <div class="step-progress-fill" id="step-progress-fill"></div>
                    </div>
                </div>
            </div>
            
            <!-- Main Analysis Content -->
            <div class="analysis-content">
                <div id="analysis-step-content" class="step-content">
                    <!-- Step content will be loaded here -->
                </div>
            </div>
        `;
        
        // Append to main content area
        this.mainContentArea.appendChild(this.analysisInterface);
        
        // Setup step navigation handlers
        this.setupStepNavigationHandlers();
        
        console.log('📄 Analysis interface created');
    }
    
    setupStepNavigationHandlers() {
        // Setup step item click handlers for direct navigation
        const stepItems = this.analysisInterface.querySelectorAll('.step-item[data-step]');
        stepItems.forEach(stepItem => {
            const step = stepItem.getAttribute('data-step');
            stepItem.addEventListener('click', () => {
                const workflowState = this.getWorkflowState();
                if (workflowState && workflowState.canNavigateToStep(step)) {
                    this.navigateToStep(step);
                }
            });
            
            // Add keyboard support
            stepItem.setAttribute('tabindex', '0');
            stepItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const workflowState = this.getWorkflowState();
                    if (workflowState && workflowState.canNavigateToStep(step)) {
                        this.navigateToStep(step);
                    }
                }
            });
        });
    }
    
    navigateToStep(step) {
        console.log(`🧭 Navigating to step: ${step}`);
        eventManager.emit('NAVIGATE_TO_STEP', { step, force: false });
    }
    
    showStepNavigationUI() {
        const stepNavHeader = this.analysisInterface?.querySelector('.step-navigation-header');
        
        if (stepNavHeader) {
            stepNavHeader.style.display = 'block';
        }
    }
    
    updateNavigationButtons(navigationData) {
        const { canGoBack, canGoForward } = navigationData;
        
        const backButtons = document.querySelectorAll('[data-nav="back"]');
        const nextButtons = document.querySelectorAll('[data-nav="next"]');
        
        backButtons.forEach(btn => {
            btn.disabled = !canGoBack;
            btn.classList.toggle('disabled', !canGoBack);
        });
        
        nextButtons.forEach(btn => {
            btn.disabled = !canGoForward;
            btn.classList.toggle('disabled', !canGoForward);
        });
    }
    
    handleButtonAction(data) {
        const { buttonId, result } = data;
        console.log(`📄 Button action handled: ${buttonId}`, result);
        
        switch (buttonId) {
            case 'start-analysis-btn':
                this.handleStartAnalysis();
                break;
            default:
                break;
        }
    }
    
    handleStartAnalysis() {
        console.log('🚀 Start analysis button clicked in ContentManager');
        eventManager.emit('NAVIGATE_TO_STEP', { step: 'metadata' });
    }
    
    // Public API Methods
    showContent(contentId, options = {}) {
        console.log(`📄 Showing content: ${contentId}`);
        
        switch (contentId) {
            case 'welcome':
                this.showWelcomeContent();
                break;
            case 'analysis':
                this.showAnalysisContent();
                break;
            default:
                console.warn(`Unknown content ID: ${contentId}`);
        }
    }
    
    hideContent(contentId) {
        console.log(`📄 Hiding content: ${contentId}`);
        
        switch (contentId) {
            case 'welcome':
                const welcomeScreen = this.contentComponents.get('welcomeScreen');
                if (welcomeScreen) {
                    welcomeScreen.hide();
                }
                break;
            case 'analysis':
                if (this.analysisInterface) {
                    this.analysisInterface.classList.add('hidden');
                }
                break;
            default:
                console.warn(`Unknown content ID: ${contentId}`);
        }
    }
    
    getCurrentContent() {
        return this.currentContent;
    }
    
    registerComponent(name, component) {
        this.contentComponents.set(name, component);
        console.log(`📄 Content component registered: ${name}`);
        
        eventManager.emit('content:component_registered', { name, component });
        this.handleComponentRegistered(name, component);
    }
    
    getComponent(name) {
        return this.contentComponents.get(name);
    }
    
    hasComponent(name) {
        return this.contentComponents.has(name);
    }
    
    getButtonManager() {
        return this.buttonManager;
    }
    
    getMainContentArea() {
        return this.mainContentArea;
    }
    
    getWelcomeContainer() {
        const welcomeScreen = this.contentComponents.get('welcomeScreen');
        if (welcomeScreen && welcomeScreen.getContainer) {
            this.welcomeContainer = welcomeScreen.getContainer();
        }
        return this.welcomeContainer;
    }
    
    getAnalysisInterface() {
        return this.analysisInterface;
    }
    
    isReady() {
        return this.isInitialized && this.mainContentArea !== null;
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            currentContent: this.currentContent,
            hasMainContentArea: !!this.mainContentArea,
            hasWelcomeContainer: !!this.getWelcomeContainer(),
            hasAnalysisInterface: !!this.analysisInterface,
            registeredComponents: Array.from(this.contentComponents.keys()),
            buttonManagerStatus: this.buttonManager ? this.buttonManager.getStatus() : 'not available'
        };
    }
    
    refresh() {
        if (!this.isInitialized) return;
        
        try {
            this.findMainElements();
        } catch (error) {
            console.warn('Some elements not found during refresh:', error.message);
        }
        
        this.contentComponents.forEach((component, name) => {
            this.handleComponentRegistered(name, component);
        });
        
        if (this.currentContent) {
            this.showStepContent(this.currentContent);
        }
    }
    
    reset() {
        console.log('🔄 Resetting ContentManager...');
        
        this.currentContent = 'welcome';
        this.showWelcomeContent();
        
        this.contentComponents.forEach((component, name) => {
            if (component.reset) {
                component.reset();
            }
        });
    }
    
    cleanup() {
        console.log('🧹 ContentManager cleanup...');
        
        // Remove global navigation footer
        if (this.navigationFooter && this.navigationFooter.parentNode) {
            this.navigationFooter.parentNode.removeChild(this.navigationFooter);
        }

        this.cleanupEventListeners();
        
        this.contentComponents.forEach((component, name) => {
            if (component.cleanup) {
                try {
                    component.cleanup();
                } catch (error) {
                    console.error(`Failed to cleanup component ${name}:`, error);
                }
            }
        });
        
        this.contentComponents.clear();
        
        if (this.buttonManager && this.buttonManager.cleanup) {
            this.buttonManager.cleanup();
        }
        
        if (this.analysisInterface && this.analysisInterface.parentNode) {
            this.analysisInterface.parentNode.removeChild(this.analysisInterface);
        }
        
        this.mainContentArea = null;
        this.welcomeContainer = null;
        this.analysisInterface = null;
        
        this.isInitialized = false;
        this.currentContent = 'welcome';
        
        console.log('✅ ContentManager cleanup completed');
    }
    
    
    navigateToPreviousStep() {
        const workflowState = this.getWorkflowState();
        if (workflowState && workflowState.canGoBack()) {
            workflowState.goBack();
        } else {
            eventManager.emit('NAVIGATE_TO_STEP', { step: 'welcome' });
        }
    }
    
    navigateToNextStep() {
        const workflowState = this.getWorkflowState();
        if (workflowState && workflowState.canGoForward()) {
            workflowState.goNext();
        } else {
            const toastManager = this.getToastManager();
            if (toastManager?.warning) {
                toastManager.warning('Please complete the current step before proceeding');
            }
        }
    }
    
    updateStepNavigationVisibility(currentStep) {
        const stepNavHeader = this.analysisInterface?.querySelector('.step-navigation-header');
        
        if (stepNavHeader) {
            stepNavHeader.style.display = currentStep === 'welcome' ? 'none' : 'block';
        }
        
        // Update step indicators
        this.updateStepIndicators(currentStep);
    }
    
    updateStepIndicators(currentStep) {
        const stepItems = this.analysisInterface?.querySelectorAll('.step-item[data-step]');
        if (!stepItems) return;
        
        const workflowState = this.getWorkflowState();
        const visitedSteps = workflowState ? Array.from(workflowState.visitedSteps) : [];
        
        stepItems.forEach(stepItem => {
            const step = stepItem.getAttribute('data-step');
            
            // Remove all state classes
            stepItem.classList.remove('active', 'completed', 'pending', 'disabled');
            
            // Add appropriate class
            if (step === currentStep) {
                stepItem.classList.add('active');
            } else if (visitedSteps.includes(step)) {
                stepItem.classList.add('completed');
            } else {
                stepItem.classList.add('pending');
            }
            
            // Check if can navigate
            if (workflowState && !workflowState.canNavigateToStep(step)) {
                stepItem.classList.add('disabled');
            }
        });
        
        // Update progress bar
        this.updateStepProgressBar(currentStep);
    }
    
    updateStepProgressBar(currentStep) {
        const progressFill = this.analysisInterface?.querySelector('#step-progress-fill');
        if (!progressFill) return;
        
        const steps = ['metadata', 'field', 'problem', 'template', 'analysis'];
        const currentIndex = steps.indexOf(currentStep);
        
        if (currentIndex >= 0) {
            const progress = ((currentIndex + 1) / steps.length) * 100;
            progressFill.style.width = `${progress}%`;
        }
    }
    
    async loadMetadataStep() {
        const stepContent = this.analysisInterface?.querySelector('#analysis-step-content');
        if (!stepContent) return;
        
        try {
            // Load metadata step component
            if (!this.contentComponents.has('metadataStep')) {
                const metadataStep = window.serviceManager?.getService('metadataStep');
                if (metadataStep) {
                    this.contentComponents.set('metadataStep', metadataStep);
                }
            }
            
            const metadataStep = this.contentComponents.get('metadataStep');
            
            if (metadataStep) {
                metadataStep.container = stepContent;
                await metadataStep.load();
            }
            
        } catch (error) {
            console.error('Failed to load metadata step:', error);
            this.showStepError('metadata', error);
        }
    }
    
    async loadFieldStep() {
        const stepContent = this.analysisInterface?.querySelector('#analysis-step-content');
        if (!stepContent) return;
        
        try {
            // Load field step component
            if (!this.contentComponents.has('fieldStep')) {
                const fieldStep = window.serviceManager?.getService('fieldStep');
                if (fieldStep) {
                    this.contentComponents.set('fieldStep', fieldStep);
                }
            }
            
            const fieldStep = this.contentComponents.get('fieldStep');
            
            if (fieldStep) {
                fieldStep.container = stepContent;
                await fieldStep.load();
            }
            
        } catch (error) {
            console.error('Failed to load field step:', error);
            this.showStepError('field', error);
        }
    }
    
    async loadProblemStep() {
        const stepContent = this.analysisInterface?.querySelector('#analysis-step-content');
        if (!stepContent) return;
        
        try {
            // Load problem step component
            if (!this.contentComponents.has('problemStep')) {
                const problemStep = window.serviceManager?.getService('problemStep');
                if (problemStep) {
                    this.contentComponents.set('problemStep', problemStep);
                }
            }
            
            const problemStep = this.contentComponents.get('problemStep');
            
            if (problemStep) {
                problemStep.container = stepContent;
                await problemStep.load();
            }
            
        } catch (error) {
            console.error('Failed to load problem step:', error);
            this.showStepError('problem', error);
        }
    }
    
    async loadTemplateStep() {
        const stepContent = this.analysisInterface?.querySelector('#analysis-step-content');
        if (!stepContent) return;
        
        try {
            // Load template step component
            if (!this.contentComponents.has('templateStep')) {
                // Try to get from ServiceManager first
                let templateStep = window.serviceManager?.getService('templateStep');
                
                // If not in ServiceManager, create new instance
                if (!templateStep) {
                    const { TemplateStep } = await import('../content/TemplateStep.js');
                    templateStep = new TemplateStep();
                    
                    // Register with ServiceManager if available
                    if (window.serviceManager) {
                        window.serviceManager.registerService('templateStep', templateStep);
                    }
                }
                
                // Store in content components
                if (templateStep) {
                    this.contentComponents.set('templateStep', templateStep);
                }
            }
            
            const templateStep = this.contentComponents.get('templateStep');
            
            if (templateStep) {
                // Initialize if needed
                if (!templateStep.isInitialized) {
                    await templateStep.init();
                }
                
                // Set the container and load
                templateStep.container = stepContent;
                await templateStep.load();
                
                // Update header information
                const headerManager = window.serviceManager?.getService('headerManager');
                if (headerManager) {
                    headerManager.setPageInfo(
                        'Step 4: Template Selection',
                        'Choose or generate a template for structuring the paper\'s information'
                    );
                }
            } else {
                throw new Error('Failed to load TemplateStep component');
            }
            
        } catch (error) {
            console.error('Failed to load template step:', error);
            this.showStepError('template', error);
        }
    }
    
    async loadAnalysisStep() {
        const stepContent = this.analysisInterface?.querySelector('#analysis-step-content');
        if (!stepContent) return;
        
        try {
            // Load analysis step component if not already loaded
            if (!this.contentComponents.has('analysisStep')) {
                const { AnalysisStep } = await import('./AnalysisStep.js');
                const analysisStep = new AnalysisStep();
                await analysisStep.init();
                this.contentComponents.set('analysisStep', analysisStep);
            }
            
            const analysisStep = this.contentComponents.get('analysisStep');
            
            // Set the container for the analysis step
            analysisStep.container = stepContent;
            
            // Load the step
            await analysisStep.load();
            
        } catch (error) {
            console.error('Failed to load analysis step:', error);
            this.showStepError('analysis', error);
        }
    }
    
    showStepError(step, error) {
        const stepContent = this.analysisInterface?.querySelector('#analysis-step-content');
        if (!stepContent) return;
        
        stepContent.innerHTML = `
            <div class="step-container">
                <div class="step-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Failed to Load ${step.charAt(0).toUpperCase() + step.slice(1)} Step</h3>
                    <p>An error occurred while loading this step: ${error.message}</p>
                    
                    <div class="error-actions">
                        <button class="btn btn-primary" onclick="location.reload()">
                            <i class="fas fa-refresh"></i>
                            <span>Reload Extension</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    async retryStep(step) {
        try {
            await this.showStepContent(step);
        } catch (error) {
            console.error(`Failed to retry step ${step}:`, error);
        }
    }
    
    goBackFromError() {
        eventManager.emit('NAVIGATE_TO_STEP', { step: 'welcome' });
    }
    
    proceedToNextStep(nextStep) {
        const currentStep = this.currentContent;
        
        const stateManager = this.getStateManager();
        if (stateManager) {
            stateManager.updateState(`data.${currentStep}`, {
                completed: true,
                timestamp: Date.now(),
                placeholder: true
            });
        }
        
        eventManager.emit('NAVIGATE_TO_STEP', { step: nextStep });
    }

    /**
     * Get the current step in the workflow
     */
    getCurrentStep() {
        return this.currentContent;
    }

    /**
     * Update the content manager state
     */
    updateState(newState) {
        if (newState.currentContent) {
            this.currentContent = newState.currentContent;
        }
    }

    /**
     * Show a loading state for the content area
     */
    showLoadingState(message = 'Loading...') {
        if (!this.mainContentArea) return;

        this.mainContentArea.innerHTML = `
            <div class="content-loading">
                <div class="loading-spinner"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;
    }

    /**
     * Hide the loading state
     */
    hideLoadingState() {
        if (!this.mainContentArea) return;
        
        const loadingElement = this.mainContentArea.querySelector('.content-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    /**
     * Show an error message in the content area
     */
    showErrorMessage(title, message, retryCallback = null) {
        if (!this.mainContentArea) return;

        this.mainContentArea.innerHTML = `
            <div class="content-error">
                <div class="error-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3 class="error-title">${title}</h3>
                <p class="error-message">${message}</p>
                ${retryCallback ? 
                    `<button class="btn btn-primary error-retry-btn">
                        <i class="fas fa-sync-alt"></i>
                        Try Again
                    </button>` : ''
                }
            </div>
        `;

        if (retryCallback) {
            const retryBtn = this.mainContentArea.querySelector('.error-retry-btn');
            retryBtn.addEventListener('click', retryCallback);
        }
    }

    /**
     * Toggle visibility of a content section
     */
    toggleContentVisibility(contentId, visible) {
        const contentElement = document.getElementById(contentId);
        if (!contentElement) return;

        if (visible) {
            contentElement.classList.remove('hidden');
            contentElement.style.display = 'block';
        } else {
            contentElement.classList.add('hidden');
            contentElement.style.display = 'none';
        }
    }

    /**
     * Scroll to a specific content section
     */
    scrollToContent(contentId, behavior = 'smooth') {
        const contentElement = document.getElementById(contentId);
        if (!contentElement) return;

        contentElement.scrollIntoView({ 
            behavior: behavior,
            block: 'start'
        });
    }
}
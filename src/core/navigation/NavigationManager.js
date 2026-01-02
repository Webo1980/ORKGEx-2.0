// ================================
// src/core/navigation/NavigationManager.js - FIXED: Proper StateManager Integration
// ================================

import { eventManager, EVENTS } from '../../utils/eventManager.js';

export class NavigationManager {
    constructor() {
        this.steps = ['welcome', 'metadata', 'field', 'problem', 'template', 'analysis'];
        this.navigationContainer = null;
        this.prevButton = null;
        this.nextButton = null;
        this.progressBar = null;
        this.progressText = null;
        this.stepElements = new Map();
        
        this.isInitialized = false;
        this.navigationHistory = [];
        this.currentStepIndex = 0;
        this.hasNavigationUI = false;
    }
    
    async init() {
        try {
            this.findElements();
            this.setupEventListeners();
            this.updateNavigationState();
            this.isInitialized = true;
            console.log(`✅ NavigationManager initialized (UI available: ${this.hasNavigationUI})`);
        } catch (error) {
            console.error('❌ NavigationManager initialization failed:', error);
            throw error;
        }
    }
    
    // FIXED: Helper methods to get services
    getStateManager() {
        return window.serviceManager?.getService('stateManager') || window.stateManager;
    }
    
    getWorkflowState() {
        return window.serviceManager?.getService('workflowState') || window.workflowState;
    }
    
    findElements() {
        this.navigationContainer = document.querySelector('.workflow-nav') || 
                                  document.querySelector('.navigation-container') ||
                                  document.querySelector('[data-nav="workflow"]');
        
        this.prevButton = document.getElementById('prev-btn') || 
                         document.querySelector('[data-nav="prev"]');
        
        this.nextButton = document.getElementById('next-btn') || 
                         document.querySelector('[data-nav="next"]');
        
        this.progressBar = document.querySelector('.progress-fill') || 
                          document.querySelector('[data-progress="fill"]');
        
        this.progressText = document.querySelector('.progress-text') || 
                           document.querySelector('[data-progress="text"]');
        
        const stepItems = document.querySelectorAll('.step-item[data-step]') || 
                         document.querySelectorAll('[data-step]');
        
        stepItems.forEach(element => {
            const step = element.getAttribute('data-step');
            if (step && this.steps.includes(step)) {
                this.stepElements.set(step, element);
            }
        });
        
        this.hasNavigationUI = !!(this.navigationContainer || this.prevButton || this.nextButton || this.stepElements.size > 0);
        
        if (!this.hasNavigationUI) {
            console.log('🧭 No navigation UI found - this is normal for welcome screen');
        } else {
            console.log(`🧭 Found navigation UI - ${this.stepElements.size} step elements`);
        }
    }
    
    setupEventListeners() {
        if (this.prevButton) {
            this.prevButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigatePrevious();
            });
        }
        
        if (this.nextButton) {
            this.nextButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateNext();
            });
        }
        
        this.stepElements.forEach((element, step) => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToStep(step);
            });
            
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.navigateToStep(step);
                }
            });
            
            if (!element.hasAttribute('tabindex')) {
                element.setAttribute('tabindex', '0');
            }
        });
        
        document.addEventListener('keydown', (event) => {
            if (document.querySelector('.modal:not(.hidden)')) {
                return;
            }
            
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'ArrowLeft':
                        event.preventDefault();
                        this.navigatePrevious();
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        this.navigateNext();
                        break;
                }
            }
            
            if (event.key >= '1' && event.key <= '6' && !event.ctrlKey && !event.metaKey && !event.altKey) {
                const stepIndex = parseInt(event.key) - 1;
                if (stepIndex < this.steps.length) {
                    const targetStep = this.steps[stepIndex];
                    if (this.canNavigateToStep(targetStep)) {
                        event.preventDefault();
                        this.navigateToStep(targetStep);
                    }
                }
            }
        });
        
        // FIXED: Subscribe to state changes properly
        const stateManager = this.getStateManager();
        if (stateManager && stateManager.subscribe) {
            stateManager.subscribe('workflow', (workflow) => {
                this.updateNavigationState();
                this.updateProgressDisplay();
            });
            
            stateManager.subscribe('validation', (validation) => {
                this.updateStepValidation(validation);
            });
            
            stateManager.subscribe('ui.isLoading', (isLoading) => {
                this.updateLoadingState(isLoading);
            });
        }
    }
    
    navigateToStep(targetStep) {
        try {
            if (!this.canNavigateToStep(targetStep)) {
                console.warn(`❌ Cannot navigate to step: ${targetStep}`);
                this.showNavigationError(`Cannot navigate to ${targetStep}. Complete the current step first.`);
                return false;
            }
            
            const currentStep = this.getCurrentStep();
            if (currentStep !== targetStep) {
                this.addToHistory(currentStep, targetStep);
            }
            
            // FIXED: Use WorkflowState to update current step
            const workflowState = this.getWorkflowState();
            if (workflowState && workflowState.setCurrentStep) {
                workflowState.setCurrentStep(targetStep);
            }
            
            this.updateStepDisplay(targetStep);
            this.updateProgress();
            this.updateNavigationButtons();
            
            eventManager.emit('navigation:step_changed', {
                step: targetStep,
                from: currentStep,
                to: targetStep
            });
            
            console.log(`🧭 Navigated: ${currentStep} → ${targetStep}`);
            return true;
            
        } catch (error) {
            console.error('Navigation failed:', error);
            eventManager.emit(EVENTS.ERROR_OCCURRED, error);
            return false;
        }
    }
    
    navigateNext() {
        const currentStep = this.getCurrentStep();
        const currentIndex = this.steps.indexOf(currentStep);
        
        if (currentIndex < this.steps.length - 1) {
            const nextStep = this.steps[currentIndex + 1];
            
            if (currentIndex === this.steps.length - 2) {
                return this.navigateToStep(nextStep);
            }
            
            return this.navigateToStep(nextStep);
        } else {
            this.completeWorkflow();
            return false;
        }
    }
    
    navigatePrevious() {
        if (this.navigationHistory.length > 0) {
            const lastNavigation = this.navigationHistory.pop();
            return this.navigateToStep(lastNavigation.from);
        }
        
        const currentStep = this.getCurrentStep();
        const currentIndex = this.steps.indexOf(currentStep);
        if (currentIndex > 0) {
            const previousStep = this.steps[currentIndex - 1];
            return this.navigateToStep(previousStep);
        }
        
        return false;
    }
    
    canNavigateToStep(targetStep) {
        const currentStep = this.getCurrentStep();
        
        if (targetStep === 'welcome') {
            return true;
        }
        
        if (targetStep === currentStep) {
            return true;
        }
        
        const visitedSteps = this.getVisitedSteps();
        if (visitedSteps.includes(targetStep)) {
            return true;
        }
        
        const currentIndex = this.steps.indexOf(currentStep);
        const targetIndex = this.steps.indexOf(targetStep);
        
        if (targetIndex === currentIndex + 1) {
            return this.isStepValid(currentStep);
        }
        
        return false;
    }
    
    isStepValid(step) {
        if (step === 'welcome') {
            return true;
        }
        
        try {
            // FIXED: Use WorkflowState to check validation
            const workflowState = this.getWorkflowState();
            if (workflowState && workflowState.isStepValid) {
                return workflowState.isStepValid(step);
            }
            
            // Fallback to StateManager
            const stateManager = this.getStateManager();
            if (stateManager) {
                const state = stateManager.getState();
                if (state && state.validation && state.validation.stepValidation) {
                    const validation = state.validation.stepValidation;
                    
                    if (validation.get && typeof validation.get === 'function') {
                        const stepValidation = validation.get(step);
                        return stepValidation ? stepValidation.isValid : true;
                    }
                    
                    if (validation[step]) {
                        return validation[step].isValid;
                    }
                }
            }
        } catch (error) {
            console.warn('Error checking step validation:', error);
        }
        
        return true;
    }
    
    getCurrentStep() {
        try {
            // FIXED: Use WorkflowState first, then fallback to StateManager
            const workflowState = this.getWorkflowState();
            if (workflowState && workflowState.currentStep) {
                return workflowState.currentStep;
            }
            
            const stateManager = this.getStateManager();
            if (stateManager) {
                const state = stateManager.getState();
                return state?.workflow?.currentStep || 'welcome';
            }
            
            return 'welcome';
        } catch (error) {
            console.warn('Error getting current step:', error);
            return 'welcome';
        }
    }
    
    getVisitedSteps() {
        try {
            // FIXED: Use WorkflowState first
            const workflowState = this.getWorkflowState();
            if (workflowState && workflowState.visitedSteps) {
                if (workflowState.visitedSteps instanceof Set) {
                    return Array.from(workflowState.visitedSteps);
                } else if (Array.isArray(workflowState.visitedSteps)) {
                    return workflowState.visitedSteps;
                }
            }
            
            // Fallback to StateManager
            const stateManager = this.getStateManager();
            if (stateManager) {
                const state = stateManager.getState();
                const visitedSteps = state?.workflow?.visitedSteps;
                
                if (visitedSteps) {
                    if (visitedSteps.has && typeof visitedSteps.has === 'function') {
                        return this.steps.filter(step => visitedSteps.has(step));
                    } else if (Array.isArray(visitedSteps)) {
                        return visitedSteps;
                    }
                }
            }
        } catch (error) {
            console.warn('Error getting visited steps:', error);
        }
        
        return [];
    }
    
    updateNavigationState() {
        if (!this.hasNavigationUI) return;
        
        this.updateNavigationButtons();
        this.updateStepStates();
        this.updateProgress();
        
        this.currentStepIndex = this.steps.indexOf(this.getCurrentStep());
    }
    
    updateNavigationButtons() {
        const currentStep = this.getCurrentStep();
        const visitedSteps = this.getVisitedSteps();
        
        if (this.prevButton) {
            const canGoBack = visitedSteps.length > 0 || this.navigationHistory.length > 0;
            this.prevButton.disabled = !canGoBack;
            this.prevButton.classList.toggle('disabled', !canGoBack);
        }
        
        if (this.nextButton) {
            const currentIndex = this.steps.indexOf(currentStep);
            const canGoForward = this.isStepValid(currentStep) && currentIndex < this.steps.length - 1;
            const isLastStep = currentStep === 'analysis';
            
            this.nextButton.disabled = !canGoForward && !isLastStep;
            this.nextButton.classList.toggle('disabled', !canGoForward && !isLastStep);
            
            const buttonText = this.nextButton.querySelector('span');
            if (buttonText) {
                buttonText.textContent = isLastStep ? 'Complete' : 'Next';
            }
        }
    }
    
    updateStepStates() {
        if (!this.hasNavigationUI) return;
        
        const currentStep = this.getCurrentStep();
        const visitedSteps = this.getVisitedSteps();
        
        this.stepElements.forEach((element, step) => {
            element.classList.remove('active', 'completed', 'pending', 'invalid', 'current');
            
            if (step === currentStep) {
                element.classList.add('active', 'current');
                element.setAttribute('aria-current', 'step');
            } else {
                element.removeAttribute('aria-current');
                
                if (visitedSteps.includes(step)) {
                    element.classList.add('completed');
                } else {
                    element.classList.add('pending');
                }
            }
            
            if (!this.isStepValid(step)) {
                element.classList.add('invalid');
            }
            
            const isClickable = this.canNavigateToStep(step);
            element.setAttribute('aria-disabled', !isClickable);
            if (isClickable) {
                element.setAttribute('role', 'button');
            } else {
                element.removeAttribute('role');
            }
        });
    }
    
    updateStepDisplay(currentStep) {
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        const stepContent = document.getElementById(`${currentStep}-step`) ||
                           document.getElementById(`${currentStep}-content`) ||
                           document.querySelector(`[data-step-content="${currentStep}"]`);
                           
        if (stepContent) {
            stepContent.classList.remove('hidden');
        }
        
        document.body.className = document.body.className.replace(/step-\w+/g, '');
        document.body.classList.add(`step-${currentStep}`);
        
        if (this.navigationContainer) {
            if (currentStep === 'welcome') {
                this.navigationContainer.style.display = 'none';
            } else {
                this.navigationContainer.style.display = 'block';
            }
        }
        
        const navButtons = document.querySelector('.navigation-buttons');
        if (navButtons) {
            if (currentStep === 'welcome') {
                navButtons.style.display = 'none';
            } else {
                navButtons.style.display = 'flex';
            }
        }
    }
    
    updateProgress() {
        if (!this.progressBar) return;
        
        const currentStep = this.getCurrentStep();
        const currentIndex = this.steps.indexOf(currentStep);
        
        const progressSteps = this.steps.slice(1);
        const progressIndex = progressSteps.indexOf(currentStep);
        const progress = progressIndex >= 0 ? ((progressIndex + 1) / progressSteps.length) * 100 : 0;
        
        this.progressBar.style.width = `${progress}%`;
        
        this.updateProgressText(currentStep, currentIndex, progress);
    }
    
    updateProgressText(currentStep, currentIndex, progress) {
        if (!this.progressText) return;
        
        const progressSpans = this.progressText.querySelectorAll('span');
        
        if (progressSpans.length >= 2) {
            if (currentStep === 'welcome') {
                progressSpans[0].textContent = 'Welcome';
            } else {
                const stepNumber = currentIndex;
                progressSpans[0].textContent = `Step ${stepNumber} of ${this.steps.length - 1}`;
            }
            
            progressSpans[1].textContent = `${Math.round(progress)}%`;
        }
    }
    
    updateProgressDisplay() {
        const currentStep = this.getCurrentStep();
        
        this.updateProgress();
        
        const headerTitle = document.getElementById('header-page-title');
        if (headerTitle) {
            const stepTitles = {
                welcome: 'Welcome to ORKG Annotator',
                metadata: 'Step 1: Paper Information',
                field: 'Step 2: Research Field',
                problem: 'Step 3: Research Problem',
                template: 'Step 4: Annotation Template',
                analysis: 'Step 5: Content Analysis'
            };
            
            headerTitle.textContent = stepTitles[currentStep] || 'ORKG Annotator';
        }
    }
    
    updateStepValidation(validation) {
        if (!this.hasNavigationUI) return;
        
        this.stepElements.forEach((element, step) => {
            element.classList.remove('invalid', 'valid');
            
            let stepValidation = null;
            if (validation.stepValidation) {
                if (validation.stepValidation.get && typeof validation.stepValidation.get === 'function') {
                    stepValidation = validation.stepValidation.get(step);
                } else if (validation.stepValidation[step]) {
                    stepValidation = validation.stepValidation[step];
                }
            }
            
            if (stepValidation) {
                if (stepValidation.isValid) {
                    element.classList.add('valid');
                } else {
                    element.classList.add('invalid');
                }
            }
        });
    }
    
    updateLoadingState(isLoading) {
        if (!this.hasNavigationUI) return;
        
        if (this.prevButton) {
            this.prevButton.disabled = isLoading;
        }
        
        if (this.nextButton) {
            this.nextButton.disabled = isLoading;
        }
        
        this.stepElements.forEach(element => {
            if (isLoading) {
                element.classList.add('disabled');
                element.setAttribute('aria-disabled', 'true');
            } else {
                element.classList.remove('disabled');
            }
        });
        
        if (this.navigationContainer) {
            this.navigationContainer.classList.toggle('loading', isLoading);
        }
    }
    
    addToHistory(from, to) {
        this.navigationHistory.push({
            from,
            to,
            timestamp: Date.now()
        });
        
        if (this.navigationHistory.length > 10) {
            this.navigationHistory.shift();
        }
    }
    
    showNavigationError(message) {
        if (window.toastManager) {
            window.toastManager.warning(message);
            return;
        }
        
        const errorEl = document.createElement('div');
        errorEl.className = 'navigation-error';
        errorEl.textContent = message;
        errorEl.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: var(--error-color);
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 1000;
            animation: fadeInOut 3s ease-in-out;
        `;
        
        document.body.appendChild(errorEl);
        
        setTimeout(() => {
            if (errorEl.parentNode) {
                errorEl.parentNode.removeChild(errorEl);
            }
        }, 3000);
    }
    
    completeWorkflow() {
        try {
            const workflowState = this.getWorkflowState();
            
            if (workflowState && !workflowState.isComplete) {
                workflowState.markComplete();
                
                eventManager.emit('workflow:completed', {
                    completedAt: new Date().toISOString(),
                    totalSteps: this.steps.length,
                    navigationHistory: this.navigationHistory
                });
                
                console.log('🎉 Workflow completed successfully');
            }
            
            this.showCompletionActions();
        } catch (error) {
            console.error('Error completing workflow:', error);
        }
    }
    
    showCompletionActions() {
        if (this.nextButton) {
            const buttonText = this.nextButton.querySelector('span');
            if (buttonText) {
                buttonText.textContent = 'Export Results';
            }
        }
        
        if (window.toastManager) {
            window.toastManager.success('Workflow completed! You can now export your results.');
        }
    }
    
    getStepTitle(step) {
        const titles = {
            welcome: 'Welcome',
            metadata: 'Paper Information',
            field: 'Research Field',
            problem: 'Research Problem',
            template: 'Annotation Template',
            analysis: 'Content Analysis'
        };
        return titles[step] || 'Unknown Step';
    }
    
    reset() {
        this.navigateToStep('welcome');
        this.navigationHistory = [];
        
        this.stepElements.forEach(element => {
            element.classList.remove('active', 'completed', 'invalid', 'current');
            element.classList.add('pending');
            element.removeAttribute('aria-current');
        });
        
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
        }
        
        console.log('🔄 Navigation reset to welcome');
    }
    
    // Public API methods
    getNavigationState() {
        return {
            currentStep: this.getCurrentStep(),
            currentStepIndex: this.currentStepIndex,
            totalSteps: this.steps.length,
            canGoNext: this.canGoNext(),
            canGoPrevious: this.canGoPrevious(),
            navigationHistory: this.navigationHistory,
            isComplete: this.isWorkflowComplete(),
            hasNavigationUI: this.hasNavigationUI
        };
    }
    
    canGoNext() {
        const currentStep = this.getCurrentStep();
        const currentIndex = this.steps.indexOf(currentStep);
        return this.isStepValid(currentStep) && currentIndex < this.steps.length - 1;
    }
    
    canGoPrevious() {
        const visitedSteps = this.getVisitedSteps();
        return visitedSteps.length > 0 || this.navigationHistory.length > 0;
    }
    
    isWorkflowComplete() {
        try {
            const workflowState = this.getWorkflowState();
            return workflowState?.isComplete || false;
        } catch (error) {
            return false;
        }
    }
    
    forceUpdate() {
        this.updateNavigationState();
        this.updateProgressDisplay();
    }
    
    getStepInfo(step) {
        return {
            name: step,
            title: this.getStepTitle(step),
            index: this.steps.indexOf(step),
            isValid: this.isStepValid(step),
            canNavigate: this.canNavigateToStep(step),
            element: this.stepElements.get(step)
        };
    }
    
    isReady() {
        return this.isInitialized;
    }
    
    getAllSteps() {
        return [...this.steps];
    }
    
    getStepByIndex(index) {
        return this.steps[index] || null;
    }
    
    getCurrentStepIndex() {
        return this.steps.indexOf(this.getCurrentStep());
    }
    
    hasStep(step) {
        return this.steps.includes(step);
    }
    
    getNextStep() {
        const currentIndex = this.getCurrentStepIndex();
        return currentIndex < this.steps.length - 1 ? this.steps[currentIndex + 1] : null;
    }
    
    getPreviousStep() {
        const currentIndex = this.getCurrentStepIndex();
        return currentIndex > 0 ? this.steps[currentIndex - 1] : null;
    }
    
    getNavigationHistory() {
        return [...this.navigationHistory];
    }
    
    clearNavigationHistory() {
        this.navigationHistory = [];
    }
    
    hasNavigationElements() {
        return this.hasNavigationUI;
    }
    
    refreshUI() {
        if (this.hasNavigationUI) {
            this.updateNavigationState();
            this.updateProgressDisplay();
        }
    }
    
    setNavigationEnabled(enabled) {
        if (this.prevButton) {
            this.prevButton.disabled = !enabled;
        }
        
        if (this.nextButton) {
            this.nextButton.disabled = !enabled;
        }
        
        this.stepElements.forEach(element => {
            element.setAttribute('aria-disabled', !enabled);
            if (enabled) {
                element.classList.remove('disabled');
            } else {
                element.classList.add('disabled');
            }
        });
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasNavigationUI: this.hasNavigationUI,
            currentStep: this.getCurrentStep(),
            currentStepIndex: this.getCurrentStepIndex(),
            totalSteps: this.steps.length,
            visitedSteps: this.getVisitedSteps(),
            navigationHistory: this.navigationHistory.length,
            elements: {
                navigationContainer: !!this.navigationContainer,
                prevButton: !!this.prevButton,
                nextButton: !!this.nextButton,
                progressBar: !!this.progressBar,
                progressText: !!this.progressText,
                stepElements: this.stepElements.size
            }
        };
    }
    
    cleanup() {
        this.navigationHistory = [];
        this.isInitialized = false;
        this.currentStepIndex = 0;
        this.hasNavigationUI = false;
        
        this.navigationContainer = null;
        this.prevButton = null;
        this.nextButton = null;
        this.progressBar = null;
        this.progressText = null;
        this.stepElements.clear();
        
        console.log('🧹 NavigationManager cleanup completed');
    }
}
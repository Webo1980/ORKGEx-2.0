// ================================
// src/core/navigation/TabManager.js - Complete Tab Management System
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class TabManager {
    constructor() {
        this.steps = ['welcome', 'metadata', 'field', 'problem', 'template', 'analysis'];
        this.currentStep = 'welcome';
        this.visitedSteps = new Set(['welcome']);
        this.stepElements = new Map();
        this.progressFill = null;
        this.isInitialized = false;
    }
    
    async init() {
        try {
            console.log('🎯 Initializing TabManager...');
            
            this.findElements();
            this.setupEventListeners();
            this.updateTabStates();
            
            this.isInitialized = true;
            console.log('✅ TabManager initialized');
            
        } catch (error) {
            console.error('❌ TabManager initialization failed:', error);
            throw error;
        }
    }
    
    findElements() {
        // Find step indicator elements
        const stepItems = document.querySelectorAll('.step-item[data-step]');
        stepItems.forEach(element => {
            const step = element.getAttribute('data-step');
            if (step && this.steps.includes(step)) {
                this.stepElements.set(step, element);
                console.log(`🎯 Found step element: ${step}`);
            }
        });
        
        // Find progress bar
        this.progressFill = document.getElementById('step-progress-fill') || 
                           document.querySelector('.step-progress-fill');
        
        console.log(`🎯 Found ${this.stepElements.size} step elements`);
        if (this.progressFill) {
            console.log('🎯 Found progress bar');
        }
    }
    
    setupEventListeners() {
        // Listen for workflow step changes
        eventManager.on('workflow:step_changed', (data) => {
            this.handleStepChange(data);
        });
        
        // Listen for navigation events
        eventManager.on('NAVIGATE_TO_STEP', (data) => {
            this.handleNavigationRequest(data);
        });
        
        // Setup click handlers for step items
        this.stepElements.forEach((element, step) => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleStepClick(step);
            });
            
            // Add keyboard support
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleStepClick(step);
                }
            });
            
            // Make focusable
            element.setAttribute('tabindex', '0');
            element.setAttribute('role', 'button');
            element.setAttribute('aria-label', `Go to ${this.getStepTitle(step)} step`);
        });
        
        console.log('🎯 Event listeners setup completed');
    }
    
    handleStepChange(data) {
        const { currentStep, previousStep } = data;
        
        if (!currentStep) {
            console.warn('🎯 No current step provided in step change event');
            return;
        }
        
        console.log(`🎯 Tab step change: ${previousStep} → ${currentStep}`);
        
        // Update internal state
        this.currentStep = currentStep;
        if (previousStep) {
            this.visitedSteps.add(previousStep);
        }
        this.visitedSteps.add(currentStep);
        
        // Update visual states
        this.updateTabStates();
        this.updateProgressBar();
        this.updateNavigationCapabilities();
    }
    
    handleNavigationRequest(data) {
        const { step } = data;
        
        if (!step || !this.steps.includes(step)) {
            console.warn(`🎯 Invalid step in navigation request: ${step}`);
            return;
        }
        
        // Check if navigation is allowed
        if (!this.canNavigateToStep(step)) {
            console.warn(`🎯 Navigation to ${step} not allowed`);
            this.showNavigationBlockedFeedback(step);
            return;
        }
        
        console.log(`🎯 Navigation request approved: ${step}`);
    }
    
    handleStepClick(step) {
        console.log(`🎯 Step clicked: ${step}`);
        
        // Check if navigation is allowed
        if (!this.canNavigateToStep(step)) {
            this.showNavigationBlockedFeedback(step);
            return;
        }
        
        // Emit navigation event
        eventManager.emit('NAVIGATE_TO_STEP', { 
            step, 
            previousStep: this.currentStep,
            source: 'tab_click'
        });
    }
    
    canNavigateToStep(targetStep) {
        // Always allow navigation to welcome
        if (targetStep === 'welcome') {
            return true;
        }
        
        // Always allow navigation to current step
        if (targetStep === this.currentStep) {
            return true;
        }
        
        // Allow backward navigation to any visited step
        if (this.visitedSteps.has(targetStep)) {
            const currentIndex = this.steps.indexOf(this.currentStep);
            const targetIndex = this.steps.indexOf(targetStep);
            
            // Only allow going back
            return targetIndex < currentIndex;
        }
        
        // Allow forward navigation only to the immediate next step
        const currentIndex = this.steps.indexOf(this.currentStep);
        const targetIndex = this.steps.indexOf(targetStep);
        
        if (targetIndex === currentIndex + 1) {
            // Check if current step is completed
            return this.isStepCompleted(this.currentStep);
        }
        
        return false;
    }
    
    isStepCompleted(step) {
        // Welcome is always completed
        if (step === 'welcome') {
            return true;
        }
        
        // Check if step has required data
        try {
            const stateManager = window.moduleLoader?.getModule('stateManager');
            if (stateManager) {
                const state = stateManager.getState();
                
                switch (step) {
                    case 'metadata':
                        return !!(state.data?.metadata?.title);
                    case 'field':
                        return !!(state.data?.selectedField);
                    case 'problem':
                        return !!(state.data?.selectedProblem);
                    case 'template':
                        return !!(state.data?.selectedTemplate);
                    case 'analysis':
                        return !!(state.data?.analysisResults);
                    default:
                        return true; // Default to completed for unknown steps
                }
            }
        } catch (error) {
            console.warn('Error checking step completion:', error);
        }
        
        // Default to completed if we can't check state
        return true;
    }
    
    updateTabStates() {
        console.log(`🎯 Updating tab states for current step: ${this.currentStep}`);
        
        this.stepElements.forEach((element, step) => {
            // Remove all state classes
            element.classList.remove('active', 'completed', 'pending', 'disabled');
            
            // Remove aria attributes
            element.removeAttribute('aria-current');
            element.removeAttribute('aria-disabled');
            
            // Determine step state
            if (step === this.currentStep) {
                // Current active step
                element.classList.add('active');
                element.setAttribute('aria-current', 'step');
                element.setAttribute('aria-label', `${this.getStepTitle(step)} (current step)`);
                
            } else if (this.visitedSteps.has(step)) {
                // Previously visited step
                element.classList.add('completed');
                
                // Check if navigation is allowed
                if (this.canNavigateToStep(step)) {
                    element.setAttribute('aria-label', `Go to ${this.getStepTitle(step)} step (completed)`);
                } else {
                    element.classList.add('disabled');
                    element.setAttribute('aria-disabled', 'true');
                    element.setAttribute('aria-label', `${this.getStepTitle(step)} step (completed, navigation disabled)`);
                }
                
            } else {
                // Future step
                element.classList.add('pending');
                
                // Check if this is the next available step
                const currentIndex = this.steps.indexOf(this.currentStep);
                const stepIndex = this.steps.indexOf(step);
                
                if (stepIndex === currentIndex + 1 && this.isStepCompleted(this.currentStep)) {
                    // Next step is available
                    element.setAttribute('aria-label', `Go to ${this.getStepTitle(step)} step (available)`);
                } else {
                    // Future step not yet available
                    element.classList.add('disabled');
                    element.setAttribute('aria-disabled', 'true');
                    element.setAttribute('aria-label', `${this.getStepTitle(step)} step (not yet available)`);
                }
            }
            
            // Update step number visibility for completed steps
            this.updateStepNumber(element, step);
        });
        
        console.log(`🎯 Tab states updated - Current: ${this.currentStep}, Visited: ${Array.from(this.visitedSteps).join(', ')}`);
    }
    
    updateStepNumber(element, step) {
        const stepNumber = element.querySelector('.step-number');
        if (!stepNumber) return;
        
        // Clear existing content
        stepNumber.innerHTML = '';
        
        if (this.visitedSteps.has(step) && step !== this.currentStep) {
            // Show checkmark for completed steps
            stepNumber.innerHTML = '<i class="fas fa-check"></i>';
        } else {
            // Show step number
            const stepIndex = this.steps.indexOf(step);
            stepNumber.textContent = stepIndex + 1;
        }
    }
    
    updateProgressBar() {
        if (!this.progressFill) return;
        
        const currentIndex = this.steps.indexOf(this.currentStep);
        
        // Calculate progress (welcome = 0%, metadata = 20%, field = 40%, etc.)
        let progress = 0;
        if (currentIndex > 0) {
            progress = (currentIndex / (this.steps.length - 1)) * 100;
        }
        
        // Animate progress bar
        this.progressFill.style.width = `${progress}%`;
        
        console.log(`🎯 Progress updated: ${progress}% (step ${currentIndex + 1}/${this.steps.length})`);
    }
    
    updateNavigationCapabilities() {
        // Update which steps are clickable based on current state
        this.stepElements.forEach((element, step) => {
            const canNavigate = this.canNavigateToStep(step);
            
            if (canNavigate) {
                element.style.cursor = 'pointer';
                element.classList.remove('disabled');
                element.removeAttribute('aria-disabled');
            } else {
                element.style.cursor = 'not-allowed';
                element.classList.add('disabled');
                element.setAttribute('aria-disabled', 'true');
            }
        });
    }
    
    showNavigationBlockedFeedback(step) {
        const element = this.stepElements.get(step);
        if (!element) return;

        // Add visual feedback for blocked navigation
        element.classList.add('blocked-feedback');
        
        // Remove feedback after animation
        setTimeout(() => {
            element.classList.remove('blocked-feedback');
        }, 600);
        
        // Show appropriate toast message
        const currentIndex = this.steps.indexOf(this.currentStep);
        const targetIndex = this.steps.indexOf(step);
        
        if (window.toastManager?.isReady()) {
            if (targetIndex > currentIndex) {
                window.toastManager.showWarning(
                    'Complete the current step before proceeding',
                    3000
                );
            } else {
                window.toastManager.showInfo(
                    'Forward navigation only - use the navigation buttons to go back',
                    3000
                );
            }
        } else {
            console.log('Navigation blocked:', 
                targetIndex > currentIndex 
                    ? 'Complete current step first' 
                    : 'Forward navigation only'
            );
        }
        
        console.log(`🎯 Navigation blocked to step: ${step}`);
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
    
    getStepDescription(step) {
        const descriptions = {
            welcome: 'Start your analysis journey',
            metadata: 'Extract paper metadata',
            field: 'Select research field',
            problem: 'Identify research problems',
            template: 'Choose annotation template',
            analysis: 'Perform content analysis'
        };
        return descriptions[step] || 'Step description';
    }
    
    // Public API methods
    
    /**
     * Get current step
     */
    getCurrentStep() {
        return this.currentStep;
    }
    
    /**
     * Get visited steps
     */
    getVisitedSteps() {
        return Array.from(this.visitedSteps);
    }
    
    /**
     * Check if step is visited
     */
    isStepVisited(step) {
        return this.visitedSteps.has(step);
    }
    
    /**
     * Get step index
     */
    getStepIndex(step) {
        return this.steps.indexOf(step);
    }
    
    /**
     * Get current step index
     */
    getCurrentStepIndex() {
        return this.getStepIndex(this.currentStep);
    }
    
    /**
     * Get progress percentage
     */
    getProgress() {
        const currentIndex = this.getCurrentStepIndex();
        if (currentIndex <= 0) return 0;
        return Math.round((currentIndex / (this.steps.length - 1)) * 100);
    }
    
    /**
     * Get navigation state for current step
     */
    getNavigationState() {
        const currentIndex = this.getCurrentStepIndex();
        
        return {
            currentStep: this.currentStep,
            currentIndex,
            totalSteps: this.steps.length,
            canGoBack: this.canGoBack(),
            canGoForward: this.canGoForward(),
            nextStep: this.getNextStep(),
            previousStep: this.getPreviousStep(),
            visitedSteps: this.getVisitedSteps(),
            progress: this.getProgress()
        };
    }
    
    /**
     * Check if can go back
     */
    canGoBack() {
        // Special rule: cannot go back from metadata to welcome
        if (this.currentStep === 'metadata') {
            return false;
        }
        
        const currentIndex = this.getCurrentStepIndex();
        return currentIndex > 0 && this.visitedSteps.size > 1;
    }
    
    /**
     * Check if can go forward
     */
    canGoForward() {
        const currentIndex = this.getCurrentStepIndex();
        const isLastStep = currentIndex >= this.steps.length - 1;
        
        if (isLastStep) return false;
        
        // Can go forward if current step is completed
        return this.isStepCompleted(this.currentStep);
    }
    
    /**
     * Get next step
     */
    getNextStep() {
        const currentIndex = this.getCurrentStepIndex();
        if (currentIndex < this.steps.length - 1) {
            return this.steps[currentIndex + 1];
        }
        return null;
    }
    
    /**
     * Get previous step
     */
    getPreviousStep() {
        // Special rule: metadata step cannot go back to welcome
        if (this.currentStep === 'metadata') {
            return null;
        }
        
        const currentIndex = this.getCurrentStepIndex();
        if (currentIndex > 0) {
            return this.steps[currentIndex - 1];
        }
        return null;
    }
    
    /**
     * Get all steps with their states
     */
    getAllStepsInfo() {
        return this.steps.map(step => ({
            name: step,
            title: this.getStepTitle(step),
            description: this.getStepDescription(step),
            index: this.getStepIndex(step),
            isCurrent: step === this.currentStep,
            isVisited: this.visitedSteps.has(step),
            isCompleted: this.isStepCompleted(step),
            canNavigate: this.canNavigateToStep(step),
            element: this.stepElements.get(step)
        }));
    }
    
    /**
     * Force refresh of tab states
     */
    refresh() {
        if (!this.isInitialized) return;
        
        console.log('🎯 Refreshing tab states...');
        
        // Re-find elements in case DOM has changed
        this.findElements();
        
        // Update states
        this.updateTabStates();
        this.updateProgressBar();
        this.updateNavigationCapabilities();
    }
    
    /**
     * Set step as visited
     */
    markStepVisited(step) {
        if (!this.steps.includes(step)) return false;
        
        this.visitedSteps.add(step);
        this.updateTabStates();
        
        console.log(`🎯 Step marked as visited: ${step}`);
        return true;
    }
    
    /**
     * Set step as completed
     */
    markStepCompleted(step) {
        if (!this.steps.includes(step)) return false;
        
        this.visitedSteps.add(step);
        
        // Add visual completion indicator
        const element = this.stepElements.get(step);
        if (element) {
            element.classList.add('completed');
            this.updateStepNumber(element, step);
        }
        
        // Update navigation capabilities
        this.updateNavigationCapabilities();
        
        console.log(`🎯 Step marked as completed: ${step}`);
        return true;
    }
    
    /**
     * Reset tab manager to initial state
     */
    reset() {
        console.log('🔄 Resetting TabManager...');
        
        this.currentStep = 'welcome';
        this.visitedSteps = new Set(['welcome']);
        
        this.updateTabStates();
        this.updateProgressBar();
        this.updateNavigationCapabilities();
        
        console.log('✅ TabManager reset completed');
    }
    
    /**
     * Enable/disable all tab navigation
     */
    setNavigationEnabled(enabled) {
        this.stepElements.forEach((element, step) => {
            if (enabled) {
                element.classList.remove('disabled');
                element.removeAttribute('aria-disabled');
                element.style.pointerEvents = 'auto';
            } else {
                element.classList.add('disabled');
                element.setAttribute('aria-disabled', 'true');
                element.style.pointerEvents = 'none';
            }
        });
        
        console.log(`🎯 Tab navigation ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Highlight step with animation
     */
    highlightStep(step, duration = 2000) {
        const element = this.stepElements.get(step);
        if (!element) return;
        
        element.classList.add('highlight');
        
        setTimeout(() => {
            element.classList.remove('highlight');
        }, duration);
    }
    
    /**
     * Get step element
     */
    getStepElement(step) {
        return this.stepElements.get(step);
    }
    
    /**
     * Check if tab manager has UI elements
     */
    hasTabElements() {
        return this.stepElements.size > 0;
    }
    
    /**
     * Get tab manager status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            currentStep: this.currentStep,
            currentIndex: this.getCurrentStepIndex(),
            visitedSteps: Array.from(this.visitedSteps),
            totalSteps: this.steps.length,
            hasTabElements: this.hasTabElements(),
            stepElementsCount: this.stepElements.size,
            progress: this.getProgress(),
            navigationState: this.getNavigationState()
        };
    }
    
    /**
     * Update step with new state from external source
     */
    updateStepFromState(step, state) {
        if (!this.steps.includes(step)) return false;
        
        const element = this.stepElements.get(step);
        if (!element) return false;
        
        // Update element based on state
        if (state.isCurrent) {
            this.currentStep = step;
        }
        
        if (state.isVisited) {
            this.visitedSteps.add(step);
        }
        
        // Refresh visual states
        this.updateTabStates();
        
        return true;
    }
    
    /**
     * Get next available step for navigation
     */
    getNextAvailableStep() {
        const currentIndex = this.getCurrentStepIndex();
        
        for (let i = currentIndex + 1; i < this.steps.length; i++) {
            const step = this.steps[i];
            if (this.canNavigateToStep(step)) {
                return step;
            }
        }
        
        return null;
    }
    
    /**
     * Get previous available step for navigation
     */
    getPreviousAvailableStep() {
        // Special rule: cannot go back from metadata
        if (this.currentStep === 'metadata') {
            return null;
        }
        
        const currentIndex = this.getCurrentStepIndex();
        
        for (let i = currentIndex - 1; i >= 0; i--) {
            const step = this.steps[i];
            if (this.canNavigateToStep(step)) {
                return step;
            }
        }
        
        return null;
    }
    
    /**
     * Cleanup tab manager
     */
    cleanup() {
        console.log('🧹 TabManager cleanup...');
        
        // Remove event listeners from step elements
        this.stepElements.forEach((element, step) => {
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
        });
        
        // Clear references
        this.stepElements.clear();
        this.progressFill = null;
        
        // Reset state
        this.currentStep = 'welcome';
        this.visitedSteps = new Set(['welcome']);
        this.isInitialized = false;
        
        console.log('✅ TabManager cleanup completed');
    }
}
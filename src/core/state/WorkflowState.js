// ================================
// src/core/state/WorkflowState.js - FIXED: Proper StateManager Integration
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class WorkflowState {
    constructor() {
        this.steps = ['welcome', 'metadata', 'field', 'problem', 'template', 'analysis'];
        this.currentStep = 'welcome';
        this.visitedSteps = new Set(['welcome']);
        this.stepHistory = [];
        this.stepData = new Map();
        this.stepValidation = new Map();
        this.isComplete = false;
        this.startTime = Date.now();
        this.completionTime = null;
        this.errors = [];
        this.isResetting = false;
        
        // Initialize welcome step as valid by default
        this.stepValidation.set('welcome', {
            isValid: true,
            errors: [],
            timestamp: Date.now()
        });
    }
    
    setCurrentStep(step) {
        if (!this.isValidStep(step)) {
            throw new Error(`Invalid step: ${step}`);
        }
        
        const previousStep = this.currentStep;
        const canNavigate = this.canNavigateToStep(step);
        
        if (!canNavigate) {
            console.warn(`Cannot navigate from ${previousStep} to ${step}`);
            return false;
        }
        
        // Update step history
        this.stepHistory.push({
            from: previousStep,
            to: step,
            timestamp: Date.now()
        });
        
        // Update current step
        this.currentStep = step;
        
        // Add to visited steps
        this.visitedSteps.add(step);
        
        // IMPORTANT: Update StateManager to persist the state
        const stateManager = this.getStateManager();
        if (stateManager) {
            // Update workflow state in StateManager
            stateManager.updateState('workflow', {
                currentStep: step,
                visitedSteps: Array.from(this.visitedSteps),
                completedSteps: this.getCompletedSteps(),
                canGoForward: this.canGoForward(),
                canGoBack: this.canGoBack(),
                stepCompletion: this.getStepCompletionStatus()
            });
        }
        
        // Emit event
        eventManager.emit('workflow:step_changed', {
            previousStep,
            currentStep: step,
            step: step,
            stepIndex: this.getStepIndex(step),
            canGoBack: this.canGoBack(),
            canGoForward: this.canGoForward(),
            progress: this.getProgress(),
            visitedSteps: Array.from(this.visitedSteps)
        });
        
        console.log(`🧭 Workflow step changed: ${previousStep} → ${step}`, {
            visitedSteps: Array.from(this.visitedSteps),
            isStoredInState: !!stateManager
        });
        
        return true;
    }

    getCompletedSteps() {
        const completed = [];
        for (const step of this.steps) {
            if (this.isStepValid(step) && this.visitedSteps.has(step)) {
                completed.push(step);
            }
        }
        return completed;
    }

    getStepCompletionStatus() {
        const status = {};
        for (const step of this.steps) {
            if (step !== 'welcome') {
                status[step] = this.isStepValid(step) && this.visitedSteps.has(step);
            }
        }
        return status;
    }
    
    isValidStep(step) {
        return this.steps.includes(step);
    }
    
    canNavigateToStep(step) {
        if (!this.isValidStep(step)) return false;
        
        const currentIndex = this.getStepIndex(this.currentStep);
        const targetIndex = this.getStepIndex(step);
        
        if (step === 'welcome') return true;
        if (step === this.currentStep) return true;
        
        if (targetIndex < currentIndex && this.visitedSteps.has(step)) {
            return true;
        }
        
        if (targetIndex === currentIndex + 1) {
            return this.isCurrentStepValid();
        }
        
        if (this.visitedSteps.has(step)) {
            return true;
        }
        
        return false;
    }
    
    goNext() {
        const currentIndex = this.getStepIndex(this.currentStep);
        
        if (currentIndex < this.steps.length - 1) {
            const nextStep = this.steps[currentIndex + 1];
            
            if (!this.isCurrentStepValid()) {
                console.warn(`❌ Cannot proceed: current step '${this.currentStep}' is not valid`);
                return false;
            }
            
            return this.setCurrentStep(nextStep);
        }
        
        return false;
    }
    
    goBack() {
        if (this.stepHistory.length > 0) {
            const lastNav = this.stepHistory[this.stepHistory.length - 1];
            return this.setCurrentStep(lastNav.from);
        }
        
        const currentIndex = this.getStepIndex(this.currentStep);
        if (currentIndex > 0) {
            const previousStep = this.steps[currentIndex - 1];
            return this.setCurrentStep(previousStep);
        }
        
        return false;
    }
    
    canGoBack() {
        return this.getStepIndex(this.currentStep) > 0 || this.stepHistory.length > 0;
    }
    
    canGoForward() {
        const currentIndex = this.getStepIndex(this.currentStep);
        const isLastStep = currentIndex >= this.steps.length - 1;
        
        if (isLastStep) return false;
        
        return this.isCurrentStepValid();
    }
    
    getStepIndex(step) {
        return this.steps.indexOf(step);
    }
    
    getCurrentStepIndex() {
        return this.getStepIndex(this.currentStep);
    }
    
    getProgress() {
        const currentIndex = this.getCurrentStepIndex();
        const totalSteps = this.steps.length - 1;
        
        if (currentIndex <= 0) return 0;
        if (currentIndex >= this.steps.length - 1) return 100;
        
        return Math.round(((currentIndex) / totalSteps) * 100);
    }
    
    setStepData(step, data) {
        if (!this.isValidStep(step)) {
            throw new Error(`Invalid step: ${step}`);
        }
        
        this.stepData.set(step, {
            ...data,
            timestamp: Date.now(),
            step
        });
        
        eventManager.emit('workflow:step_data_updated', {
            step,
            data,
            allData: this.getAllStepData()
        });
        
        console.log(`📊 Step data updated for: ${step}`);
    }
    
    getStepData(step) {
        return this.stepData.get(step);
    }
    
    getAllStepData() {
        return Object.fromEntries(this.stepData);
    }
    
    setStepValidation(step, isValid, errors = []) {
        if (!this.isValidStep(step)) {
            throw new Error(`Invalid step: ${step}`);
        }
        
        console.log(`🔍 Setting validation for step '${step}': ${isValid ? 'VALID' : 'INVALID'}`, errors);
        
        this.stepValidation.set(step, {
            isValid,
            errors,
            timestamp: Date.now()
        });
        
        if (!this.isResetting) {
            eventManager.emit('workflow:step_validation_updated', {
                step,
                isValid,
                errors,
                canGoForward: this.canGoForward()
            });
        }
        
        console.log(`✅ Step validation updated for ${step}: ${isValid ? 'valid' : 'invalid'}`);
    }
    
    // FIXED: Proper metadata validation using StateManager
    hasValidMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            return false;
        }
        
        const hasTitle = metadata.title && metadata.title.trim().length > 0;
        const hasAuthors = metadata.authors && Array.isArray(metadata.authors) && metadata.authors.length > 0;
        const hasAnyContent = hasTitle || hasAuthors || metadata.abstract || metadata.doi || metadata.journal;
        
        return hasAnyContent;
    }
    
    getStepValidation(step) {
        return this.stepValidation.get(step);
    }
    
    isCurrentStepValid() {
        const validation = this.stepValidation.get(this.currentStep);
        
        if (this.currentStep === 'metadata') {
            if (!validation || !validation.isValid) {
                return false;
            }
            
            // FIXED: Get StateManager instance properly
            const stateManager = this.getStateManager();
            if (stateManager) {
                const metadata = stateManager.getState('data.metadata');
                const hasValidMetadata = this.hasValidMetadata(metadata);
                
                return hasValidMetadata;
            }
        }
        
        return validation ? validation.isValid : true;
    }
    
    // FIXED: Add method to get StateManager
    getStateManager() {
        return window.serviceManager?.getService('stateManager') || window.stateManager;
    }
    
    isStepValid(step) {
        const validation = this.stepValidation.get(step);
        
        if (step === 'metadata') {
            if (!validation || !validation.isValid) {
                return false;
            }
            
            const stateManager = this.getStateManager();
            if (stateManager) {
                const metadata = stateManager.getState('data.metadata');
                return this.hasValidMetadata(metadata);
            }
        }
        
        return validation ? validation.isValid : true;
    }
    
    markComplete() {
        if (this.isComplete) return;
        
        this.isComplete = true;
        this.completionTime = Date.now();
        
        if (!this.isResetting) {
            eventManager.emit('workflow:completed', {
                startTime: this.startTime,
                completionTime: this.completionTime,
                duration: this.completionTime - this.startTime,
                stepsCompleted: this.visitedSteps.size,
                totalSteps: this.steps.length,
                stepData: this.getAllStepData()
            });
        }
        
        console.log('🎉 Workflow marked as complete');
    }
    
    reset(resetType = 'soft') {
        if (this.isResetting) {
            console.warn('🔄 Reset already in progress, ignoring duplicate reset call');
            return;
        }
        
        this.isResetting = true;
        console.log(`🔄 Resetting workflow (${resetType} reset)...`);
        
        try {
            if (resetType === 'complete') {
                this.currentStep = 'welcome';
                this.visitedSteps = new Set(['welcome']);
                this.stepHistory = [];
                this.stepData.clear();
                this.stepValidation.clear();
                this.errors = [];
                
                this.stepValidation.set('welcome', {
                    isValid: true,
                    errors: [],
                    timestamp: Date.now()
                });
            } else {
                this.currentStep = 'welcome';
                this.visitedSteps = new Set(['welcome']);
                this.stepHistory = [];
            }
            
            this.isComplete = false;
            this.startTime = Date.now();
            this.completionTime = null;
            
            setTimeout(() => {
                this.isResetting = false;
                eventManager.emit('workflow:reset_completed', {
                    resetType,
                    timestamp: Date.now()
                });
            }, 0);
            
            console.log('✅ Workflow reset completed');
            
        } catch (error) {
            console.error('❌ Error during workflow reset:', error);
            this.isResetting = false;
        }
    }
    
    addError(error, step = null) {
        const errorObj = {
            id: Date.now(),
            message: error.message || error.toString(),
            step: step || this.currentStep,
            timestamp: Date.now(),
            stack: error.stack
        };
        
        this.errors.push(errorObj);
        
        if (!this.isResetting) {
            eventManager.emit('workflow:error', errorObj);
        }
        
        console.error(`❌ Workflow error in step ${errorObj.step}:`, errorObj.message);
    }
    
    clearErrors() {
        this.errors = [];
        if (!this.isResetting) {
            eventManager.emit('workflow:errors_cleared', { timestamp: Date.now() });
        }
    }
    
    getSummary() {
        const duration = this.isComplete 
            ? this.completionTime - this.startTime 
            : Date.now() - this.startTime;
            
        return {
            currentStep: this.currentStep,
            currentStepIndex: this.getCurrentStepIndex(),
            totalSteps: this.steps.length,
            visitedSteps: Array.from(this.visitedSteps),
            progress: this.getProgress(),
            isComplete: this.isComplete,
            canGoBack: this.canGoBack(),
            canGoForward: this.canGoForward(),
            duration,
            startTime: this.startTime,
            completionTime: this.completionTime,
            errorsCount: this.errors.length,
            stepDataCount: this.stepData.size,
            validationCount: this.stepValidation.size,
            isResetting: this.isResetting
        };
    }
    
    getStepInfo(step) {
        if (!this.isValidStep(step)) return null;
        
        return {
            name: step,
            index: this.getStepIndex(step),
            isVisited: this.visitedSteps.has(step),
            isCurrent: step === this.currentStep,
            isValid: this.isStepValid(step),
            hasData: this.stepData.has(step),
            canNavigate: this.canNavigateToStep(step),
            data: this.getStepData(step),
            validation: this.getStepValidation(step)
        };
    }
    
    getAllStepsInfo() {
        return this.steps.map(step => this.getStepInfo(step));
    }
    
    validateMetadataStep() {
        const stateManager = this.getStateManager();
        if (!stateManager) {
            console.warn('⚠️ StateManager not available for metadata validation');
            return false;
        }
        
        const metadata = stateManager.getState('data.metadata');
        const isValid = this.hasValidMetadata(metadata);
        
        console.log('🔍 Force validating metadata step:', {
            hasMetadata: !!metadata,
            isValid,
            title: metadata?.title?.substring(0, 50)
        });
        
        this.setStepValidation('metadata', isValid, isValid ? [] : ['No valid metadata in state']);
        
        return isValid;
    }
    
    getDebugInfo() {
        const stateManager = this.getStateManager();
        const metadata = stateManager ? stateManager.getState('data.metadata') : null;
        
        return {
            currentStep: this.currentStep,
            canGoForward: this.canGoForward(),
            currentStepValid: this.isCurrentStepValid(),
            metadataStepValid: this.isStepValid('metadata'),
            hasMetadataInState: !!metadata,
            metadataValid: this.hasValidMetadata(metadata),
            stepValidations: Object.fromEntries(this.stepValidation),
            visitedSteps: Array.from(this.visitedSteps),
            isResetting: this.isResetting
        };
    }
    
    navigateToStep(step) {
        if (this.isResetting) {
            console.warn('🔄 Cannot navigate during reset');
            return false;
        }
        
        return this.setCurrentStep(step);
    }
}
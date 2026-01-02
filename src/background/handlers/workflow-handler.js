// ================================
// src/background/handlers/workflow-handler.js
// Handles workflow state management
// ================================

var WorkflowHandler = (function() {
    'use strict';
    
    // Private variables
    var workflowSteps = ['welcome', 'metadata', 'field', 'problem', 'template', 'analysis'];
    var stepValidation = new Map();
    
    // Validate workflow step
    function isValidStep(step) {
        return workflowSteps.includes(step);
    }
    
    // Check if can transition to step
    function canTransitionTo(currentStep, targetStep) {
        var currentIndex = workflowSteps.indexOf(currentStep);
        var targetIndex = workflowSteps.indexOf(targetStep);
        
        if (currentIndex === -1 || targetIndex === -1) {
            return false;
        }
        
        // Can always go back
        if (targetIndex < currentIndex) {
            return true;
        }
        
        // Can only go forward one step if current step is valid
        if (targetIndex === currentIndex + 1) {
            return isStepValid(currentStep);
        }
        
        // Can jump to any previously visited step
        var tabState = StateManager.getTabState(StateManager.getLastActiveTabId());
        if (tabState && tabState.visitedSteps && tabState.visitedSteps.includes(targetStep)) {
            return true;
        }
        
        return false;
    }
    
    // Check if step is valid
    function isStepValid(step) {
        return stepValidation.get(step) || false;
    }
    
    // Update visited steps
    function updateVisitedSteps(tabId, step) {
        var tabState = StateManager.getTabState(tabId);
        if (!tabState) return;
        
        if (!tabState.visitedSteps) {
            tabState.visitedSteps = [];
        }
        
        if (!tabState.visitedSteps.includes(step)) {
            tabState.visitedSteps.push(step);
        }
        
        StateManager.updateTabState(tabId, {
            visitedSteps: tabState.visitedSteps
        });
    }
    
    // Public API
    return {
        // Save workflow state
        saveWorkflowState: function(tabId, data) {
            if (!tabId) {
                return Promise.reject(new Error('No tab ID provided'));
            }
            
            // Validate workflow step
            if (data.currentStep && !isValidStep(data.currentStep)) {
                return Promise.reject(new Error('Invalid workflow step: ' + data.currentStep));
            }
            
            // Update state manager
            StateManager.updateTabState(tabId, {
                workflowStep: data.currentStep || 'welcome',
                analysisData: data,
                lastActivity: Date.now()
            });
            
            // Update visited steps
            if (data.currentStep) {
                updateVisitedSteps(tabId, data.currentStep);
            }
            
            // Save to storage
            return StorageManager.saveWorkflowState(tabId, data).then(function() {
                console.log('Workflow state saved for tab:', tabId, 'step:', data.currentStep);
                return { success: true };
            }).catch(function(error) {
                console.error('Failed to save workflow state:', error);
                return { success: false, error: error.message };
            });
        },
        
        // Load workflow state
        loadWorkflowState: function(tabId) {
            if (!tabId) {
                return Promise.reject(new Error('No tab ID provided'));
            }
            
            // Try state manager first
            var tabState = StateManager.getTabState(tabId);
            if (tabState && tabState.analysisData) {
                console.log('Loaded workflow state from memory for tab:', tabId);
                return Promise.resolve({
                    success: true,
                    data: tabState.analysisData,
                    currentStep: tabState.workflowStep,
                    visitedSteps: tabState.visitedSteps || []
                });
            }
            
            // Try storage
            return StorageManager.loadWorkflowState(tabId).then(function(data) {
                if (data) {
                    console.log('Loaded workflow state from storage for tab:', tabId);
                    
                    // Update state manager
                    StateManager.updateTabState(tabId, {
                        workflowStep: data.currentStep || 'welcome',
                        analysisData: data
                    });
                    
                    return {
                        success: true,
                        data: data,
                        currentStep: data.currentStep || 'welcome',
                        visitedSteps: data.visitedSteps || []
                    };
                } else {
                    console.log('No workflow state found for tab:', tabId);
                    return {
                        success: false,
                        error: 'No saved state found',
                        data: null,
                        currentStep: 'welcome',
                        visitedSteps: []
                    };
                }
            });
        },
        
        // Clear workflow state
        clearWorkflowState: function(tabId) {
            if (!tabId) {
                return Promise.resolve({ success: true });
            }
            
            // Clear from state manager
            var tabState = StateManager.getTabState(tabId);
            if (tabState) {
                StateManager.updateTabState(tabId, {
                    workflowStep: 'welcome',
                    analysisData: null,
                    visitedSteps: []
                });
            }
            
            // Clear from storage
            return StorageManager.clearWorkflowState(tabId).then(function() {
                console.log('Workflow state cleared for tab:', tabId);
                return { success: true };
            }).catch(function(error) {
                console.error('Failed to clear workflow state:', error);
                return { success: false, error: error.message };
            });
        },

        /**
         * Check if a tab is in the analysis step
         */
        isInAnalysisStep: function(tabId) {
            var tabState = StateManager.getTabState(tabId);
            if (!tabState) return false;
            
            var currentStep = tabState.workflowStep || 'welcome';
            var visitedSteps = tabState.visitedSteps || [];
            
            return currentStep === 'analysis' || visitedSteps.includes('analysis');
        },
        
        // Update workflow step
        updateWorkflowStep: function(tabId, step) {
            if (!tabId || !step) {
                return Promise.reject(new Error('Tab ID and step are required'));
            }
            
            if (!isValidStep(step)) {
                return Promise.reject(new Error('Invalid workflow step: ' + step));
            }
            
            var tabState = StateManager.getTabState(tabId);
            var currentStep = tabState ? tabState.workflowStep : 'welcome';
            
            // Check if transition is allowed
            if (!canTransitionTo(currentStep, step)) {
                return Promise.reject(new Error('Cannot transition from ' + currentStep + ' to ' + step));
            }
            
            // Update state
            StateManager.updateTabState(tabId, {
                workflowStep: step,
                lastActivity: Date.now()
            });
            
            // Update visited steps
            updateVisitedSteps(tabId, step);
            
            // Save to storage
            if (tabState && tabState.analysisData) {
                tabState.analysisData.currentStep = step;
                return StorageManager.saveWorkflowState(tabId, tabState.analysisData).then(function() {
                    console.log('Workflow step updated:', currentStep, '->', step);
                    return {
                        success: true,
                        previousStep: currentStep,
                        currentStep: step
                    };
                });
            }
            
            return Promise.resolve({
                success: true,
                previousStep: currentStep,
                currentStep: step
            });
        },
        
        // Set step validation
        setStepValidation: function(step, isValid) {
            if (!isValidStep(step)) {
                console.warn('Invalid step for validation:', step);
                return false;
            }
            
            stepValidation.set(step, isValid);
            console.log('Step validation set:', step, '=', isValid);
            return true;
        },
        
        // Get step validation
        getStepValidation: function(step) {
            if (!isValidStep(step)) {
                return false;
            }
            
            return stepValidation.get(step) || false;
        },
        
        // Check if can proceed to next step
        canProceedToNext: function(tabId) {
            var tabState = StateManager.getTabState(tabId);
            if (!tabState) return false;
            
            var currentStep = tabState.workflowStep || 'welcome';
            var currentIndex = workflowSteps.indexOf(currentStep);
            
            if (currentIndex === -1 || currentIndex === workflowSteps.length - 1) {
                return false;
            }
            
            return isStepValid(currentStep);
        },
        
        // Check if can go back
        canGoBack: function(tabId) {
            var tabState = StateManager.getTabState(tabId);
            if (!tabState) return false;
            
            var currentStep = tabState.workflowStep || 'welcome';
            var currentIndex = workflowSteps.indexOf(currentStep);
            
            return currentIndex > 0;
        },
        
        // Get next step
        getNextStep: function(tabId) {
            var tabState = StateManager.getTabState(tabId);
            if (!tabState) return null;
            
            var currentStep = tabState.workflowStep || 'welcome';
            var currentIndex = workflowSteps.indexOf(currentStep);
            
            if (currentIndex === -1 || currentIndex === workflowSteps.length - 1) {
                return null;
            }
            
            return workflowSteps[currentIndex + 1];
        },
        
        // Get previous step
        getPreviousStep: function(tabId) {
            var tabState = StateManager.getTabState(tabId);
            if (!tabState) return null;
            
            var currentStep = tabState.workflowStep || 'welcome';
            var currentIndex = workflowSteps.indexOf(currentStep);
            
            if (currentIndex <= 0) {
                return null;
            }
            
            return workflowSteps[currentIndex - 1];
        },
        
        // Get workflow progress
        getWorkflowProgress: function(tabId) {
            var tabState = StateManager.getTabState(tabId);
            if (!tabState) {
                return {
                    currentStep: 'welcome',
                    currentIndex: 0,
                    totalSteps: workflowSteps.length,
                    percentage: 0,
                    visitedSteps: [],
                    canProceed: false,
                    canGoBack: false
                };
            }
            
            var currentStep = tabState.workflowStep || 'welcome';
            var currentIndex = workflowSteps.indexOf(currentStep);
            
            return {
                currentStep: currentStep,
                currentIndex: currentIndex,
                totalSteps: workflowSteps.length,
                percentage: Math.round((currentIndex / (workflowSteps.length - 1)) * 100),
                visitedSteps: tabState.visitedSteps || [],
                canProceed: this.canProceedToNext(tabId),
                canGoBack: this.canGoBack(tabId)
            };
        },
        
        // Reset workflow
        resetWorkflow: function(tabId) {
            stepValidation.clear();
            return this.clearWorkflowState(tabId);
        },
        
        // Get all workflow steps
        getWorkflowSteps: function() {
            return workflowSteps.slice();
        },
        
        // Check if step is valid
        isValidStep: isValidStep,
        
        // Check if can transition
        canTransitionTo: canTransitionTo
    };
})();

// Expose to global scope
if (typeof self !== 'undefined') {
    self.WorkflowHandler = WorkflowHandler;
}
// ================================
// src/core/state/StateManager.js - FIXED: Complete State Persistence
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class StateManager {
    constructor() {
        this.state = {
            initialized: false,
            page: {},
            workflow: {
                currentStep: 'welcome',
                visitedSteps: ['welcome'], // Store as array for persistence
                completedSteps: [],
                canGoForward: false,
                canGoBack: false,
                lastActiveStep: 'welcome',
                stepCompletion: {}
            },
            data: {
                metadata: null,
                researchField: null, // Fixed: proper field name
                problemAnalysis: null, // Fixed: proper field name
                template: null,
                analysis: null
            },
            ui: {
                theme: 'dark',
                loading: false,
                errors: [],
                lastActivity: null
            },
            app: {
                version: '2.0',
                lastSaved: null,
                sessionId: this.generateSessionId(),
                lastOpenedStep: 'welcome'
            }
        };
        
        this.subscribers = new Map();
        this.history = [];
        this.maxHistorySize = 50;
        this.storageKey = 'orkg-annotator-state';
        this.isInitialized = false;
        this.saveTimeout = null;
        this.isUpdating = false;
        
        // Bind methods
        this.updateState = this.updateState.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }
    
    async init() {
        if (this.isInitialized) {
            console.warn('StateManager already initialized');
            return;
        }
        
        try {
            console.log('🏛️ Initializing StateManager...');
            
            // Load state BEFORE setting up listeners
            const restoredState = await this.loadFromStorage();
            
            this.setupEventListeners();
            this.setupAutoSave();
            
            this.state.initialized = true;
            this.isInitialized = true;
            
            console.log('✅ StateManager initialized with restored state');
            
            // Emit state ready with restored data
            eventManager.emit('state:ready', {
                sessionId: this.state.app.sessionId,
                currentStep: this.state.workflow.currentStep,
                restored: restoredState
            });
            
            // Return restored state info for popup.js to handle
            return {
                restored: restoredState,
                currentStep: this.state.workflow.currentStep,
                hasData: this.hasStoredData()
            };
            
        } catch (error) {
            console.error('❌ StateManager initialization failed:', error);
            this.state.initialized = true;
            this.isInitialized = true;
            return { restored: false, currentStep: 'welcome', hasData: false };
        }
    }
    
    async loadFromStorage() {
        try {
            const savedState = localStorage.getItem(this.storageKey);
            if (!savedState) {
                console.log('🏛️ No saved state found');
                return false;
            }
            
            const parsedState = JSON.parse(savedState);
            
            // Validate saved state
            if (!this.isValidSavedState(parsedState)) {
                console.warn('🏛️ Invalid saved state, using defaults');
                return false;
            }
            
            // Merge with defaults to ensure all properties exist
            this.state = this.mergeStates(this.state, parsedState);
            
            // Convert arrays back to Sets where needed
            if (Array.isArray(this.state.workflow.visitedSteps)) {
                this.state.workflow.visitedSteps = this.state.workflow.visitedSteps;
            }
            
            if (Array.isArray(this.state.workflow.completedSteps)) {
                this.state.workflow.completedSteps = this.state.workflow.completedSteps;
            }
            
            // Update last activity
            this.state.ui.lastActivity = new Date().toISOString();
            
            console.log('🏛️ State restored from storage:', {
                currentStep: this.state.workflow.currentStep,
                visitedSteps: this.state.workflow.visitedSteps,
                hasMetadata: !!this.state.data.metadata,
                hasField: !!this.state.data.researchField,
                hasProblem: !!this.state.data.problemAnalysis
            });
            
            return true;
            
        } catch (error) {
            console.warn('Failed to load state from storage:', error);
            this.addErrorLocally(error, 'load_from_storage_failed');
            return false;
        }
    }
    
    isValidSavedState(state) {
        // Check if essential properties exist
        return state && 
               state.workflow && 
               state.data &&
               state.workflow.currentStep &&
               this.isValidStep(state.workflow.currentStep);
    }
    
    isValidStep(step) {
        const validSteps = ['welcome', 'metadata', 'field', 'problem', 'template', 'analysis'];
        return validSteps.includes(step);
    }
    
    hasStoredData() {
        return !!(
            this.state.data.metadata ||
            this.state.data.researchField ||
            this.state.data.problemAnalysis ||
            this.state.data.template ||
            this.state.data.analysis
        );
    }
    
    saveToStorage() {
        try {
            const stateToSave = this.deepClone(this.state);
            
            // Store current step as last opened
            stateToSave.app.lastOpenedStep = stateToSave.workflow.currentStep;
            stateToSave.app.lastSaved = new Date().toISOString();
            
            // Ensure arrays for persistence
            if (stateToSave.workflow.visitedSteps instanceof Set) {
                stateToSave.workflow.visitedSteps = Array.from(stateToSave.workflow.visitedSteps);
            }
            
            if (stateToSave.workflow.completedSteps instanceof Set) {
                stateToSave.workflow.completedSteps = Array.from(stateToSave.workflow.completedSteps);
            }
            
            localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
            console.log('🏛️ State saved to storage');
            
            eventManager.emit('state:saved', {
                timestamp: new Date().toISOString(),
                sessionId: this.state.app.sessionId,
                currentStep: this.state.workflow.currentStep
            });
            
        } catch (error) {
            console.error('Failed to save state to storage:', error);
            this.addErrorLocally(error, 'save_to_storage_failed');
        }
    }
    
    setupEventListeners() {
        this.cleanupEventListeners();
        
        this.eventUnsubscribers = [
            eventManager.on('workflow:step_changed', (data) => {
                if (!this.isUpdating) {
                    this.updateWorkflowState(data);
                }
            }),
            
            eventManager.on('data:updated', (data) => {
                if (!this.isUpdating) {
                    this.updateState(`data.${data.type}`, data.value);
                }
            }),
            
            eventManager.on('ui:state_changed', (data) => {
                if (!this.isUpdating) {
                    this.updateState(`ui.${data.type}`, data.value);
                }
            })
        ];
        
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('beforeunload', () => this.saveToStorage());
    }
    
    cleanupEventListeners() {
        if (this.eventUnsubscribers) {
            this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
            this.eventUnsubscribers = [];
        }
    }
    
    setupAutoSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            if (this.isInitialized && this.hasStoredData()) {
                this.saveToStorage();
            }
        }, 30000);
    }
    
    updateState(path, value, options = {}) {
        if (this.isUpdating && !options.force) {
            return;
        }
        
        try {
            this.isUpdating = true;
            
            const pathArray = path.split('.');
            let current = this.state;
            
            for (let i = 0; i < pathArray.length - 1; i++) {
                const key = pathArray[i];
                if (!(key in current)) {
                    current[key] = {};
                }
                current = current[key];
            }
            
            const finalKey = pathArray[pathArray.length - 1];
            const oldValue = current[finalKey];
            current[finalKey] = value;
            
            this.addToHistory({
                timestamp: Date.now(),
                path,
                oldValue,
                newValue: value,
                options
            });
            
            this.state.app.lastSaved = new Date().toISOString();
            this.state.ui.lastActivity = new Date().toISOString();
            
            if (!options.skipNotify) {
                this.notifySubscribers(path, value, oldValue);
            }
            
            if (!options.skipEvent) {
                eventManager.emit('state:changed', {
                    path,
                    value,
                    oldValue,
                    state: this.deepClone(this.state)
                });
            }
            
            if (!options.skipSave) {
                this.scheduleSave();
            }
            
            console.log(`🏛️ State updated: ${path}`, value);
            
        } catch (error) {
            console.error('Failed to update state:', error);
            this.addErrorLocally(error, 'state_update_failed');
        } finally {
            this.isUpdating = false;
        }
    }
    
    getState(path) {
        try {
            if (!path) {
                return this.deepClone(this.state);
            }
            
            const pathArray = path.split('.');
            let current = this.state;
            
            for (const key of pathArray) {
                if (current === null || current === undefined) {
                    return undefined;
                }
                current = current[key];
            }
            
            return this.deepClone(current);
            
        } catch (error) {
            console.error(`Failed to get state at path ${path}:`, error);
            return undefined;
        }
    }
    
    // Method to restore workflow to saved state
    restoreWorkflowState() {
        const workflow = this.getState('workflow');
        if (!workflow) return;
        
        // Emit events to restore UI state
        eventManager.emit('workflow:restored', {
            currentStep: workflow.currentStep,
            visitedSteps: workflow.visitedSteps,
            completedSteps: workflow.completedSteps
        });
        
        console.log('🏛️ Workflow state restored:', workflow);
    }
    
    // Get last active step for restoration
    getLastActiveStep() {
        return this.state.workflow.lastActiveStep || this.state.workflow.currentStep || 'welcome';
    }
    
    // Check if should restore to last step
    shouldRestoreLastStep() {
        const lastActivity = this.state.ui.lastActivity;
        if (!lastActivity) return false;
        
        // Only restore if last activity was within 30 minutes
        const thirtyMinutes = 30 * 60 * 1000;
        const timeSinceActivity = Date.now() - new Date(lastActivity).getTime();
        
        return timeSinceActivity < thirtyMinutes && this.hasStoredData();
    }
    
    updateWorkflowState(data) {
        try {
            if (data.currentStep || data.step) {
                const newStep = data.currentStep || data.step;
                this.updateState('workflow.currentStep', newStep, { skipSave: true });
                this.updateState('workflow.lastActiveStep', newStep, { skipSave: true });
            }
            
            if (data.visitedSteps) {
                // Keep as array for persistence
                const visitedArray = Array.isArray(data.visitedSteps) 
                    ? data.visitedSteps 
                    : Array.from(data.visitedSteps);
                this.updateState('workflow.visitedSteps', visitedArray, { skipSave: true });
            }
            
            if (data.completedSteps) {
                // Keep as array for persistence
                const completedArray = Array.isArray(data.completedSteps)
                    ? data.completedSteps
                    : Array.from(data.completedSteps);
                this.updateState('workflow.completedSteps', completedArray, { skipSave: true });
            }
            
            if (typeof data.canGoForward === 'boolean') {
                this.updateState('workflow.canGoForward', data.canGoForward, { skipSave: true });
            }
            
            if (typeof data.canGoBack === 'boolean') {
                this.updateState('workflow.canGoBack', data.canGoBack, { skipSave: true });
            }
            
            this.scheduleSave();
            
        } catch (error) {
            console.error('Failed to update workflow state:', error);
            this.addErrorLocally(error, 'workflow_state_update_failed');
        }
    }
    
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        
        this.subscribers.get(path).add(callback);
        console.log(`🏛️ Subscriber added for path: ${path}`);
        
        // Return unsubscribe function
        return () => {
            const pathSubscribers = this.subscribers.get(path);
            if (pathSubscribers) {
                pathSubscribers.delete(callback);
                if (pathSubscribers.size === 0) {
                    this.subscribers.delete(path);
                }
            }
        };
    }
    
    notifySubscribers(path, newValue, oldValue) {
        try {
            // Exact path subscribers
            const exactSubscribers = this.subscribers.get(path);
            if (exactSubscribers) {
                exactSubscribers.forEach(callback => {
                    try {
                        callback(newValue, oldValue, path);
                    } catch (error) {
                        console.error('Subscriber callback error:', error);
                    }
                });
            }
            
            // Parent path subscribers
            const pathParts = path.split('.');
            for (let i = pathParts.length - 1; i > 0; i--) {
                const parentPath = pathParts.slice(0, i).join('.');
                const parentSubscribers = this.subscribers.get(parentPath);
                
                if (parentSubscribers) {
                    const parentValue = this.getState(parentPath);
                    parentSubscribers.forEach(callback => {
                        try {
                            callback(parentValue, null, parentPath);
                        } catch (error) {
                            console.error('Parent subscriber callback error:', error);
                        }
                    });
                }
            }
            
        } catch (error) {
            console.error('Failed to notify subscribers:', error);
        }
    }
    
    addErrorLocally(error, context = '') {
        try {
            const errorEntry = {
                id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                message: error.message || String(error),
                type: error.constructor?.name || 'Unknown',
                context,
                stack: error.stack || 'No stack trace'
            };
            
            if (!this.state.ui.errors) {
                this.state.ui.errors = [];
            }
            
            this.state.ui.errors.push(errorEntry);
            
            // Keep only last 20 errors
            if (this.state.ui.errors.length > 20) {
                this.state.ui.errors = this.state.ui.errors.slice(-20);
            }
            
            console.log('🏛️ Error logged locally:', errorEntry);
            
        } catch (loggingError) {
            console.error('Failed to log error locally:', loggingError);
        }
    }
    
    addToHistory(change) {
        this.history.push(change);
        
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }
    
    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveToStorage();
            this.saveTimeout = null;
        }, 1000);
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            this.saveToStorage();
        } else {
            // When becoming visible, update last activity
            this.state.ui.lastActivity = new Date().toISOString();
        }
    }
    
    reset(resetType = 'soft') {
        try {
            console.log(`🔄 Resetting state (${resetType})...`);
            
            if (resetType === 'complete') {
                // Complete reset - clear everything
                this.state = {
                    initialized: true,
                    page: {},
                    workflow: {
                        currentStep: 'welcome',
                        visitedSteps: ['welcome'],
                        completedSteps: [],
                        canGoForward: false,
                        canGoBack: false,
                        lastActiveStep: 'welcome',
                        stepCompletion: {}
                    },
                    data: {
                        metadata: null,
                        researchField: null,
                        problemAnalysis: null,
                        template: null,
                        analysis: null
                    },
                    ui: {
                        theme: this.state.ui.theme,
                        loading: false,
                        errors: [],
                        lastActivity: new Date().toISOString()
                    },
                    app: {
                        version: '2.0',
                        lastSaved: new Date().toISOString(),
                        sessionId: this.generateSessionId(),
                        lastOpenedStep: 'welcome'
                    }
                };
                
                localStorage.removeItem(this.storageKey);
                
            } else {
                // Soft reset - keep theme and session
                this.updateState('workflow', {
                    currentStep: 'welcome',
                    visitedSteps: ['welcome'],
                    completedSteps: [],
                    canGoForward: false,
                    canGoBack: false,
                    lastActiveStep: 'welcome',
                    stepCompletion: {}
                });
                
                this.updateState('data', {
                    metadata: null,
                    researchField: null,
                    problemAnalysis: null,
                    template: null,
                    analysis: null
                });
            }
            
            this.history = [];
            this.saveToStorage();
            
            eventManager.emit('state:reset', {
                resetType,
                sessionId: this.state.app.sessionId
            });
            
            console.log('✅ State reset completed');
            
        } catch (error) {
            console.error('Failed to reset state:', error);
            this.addErrorLocally(error, 'state_reset_failed');
        }
    }
    
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Set) {
            return new Set(Array.from(obj));
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    }
    
    mergeStates(defaultState, savedState) {
        const merged = this.deepClone(defaultState);
        
        const merge = (target, source) => {
            for (const key in source) {
                if (source.hasOwnProperty(key)) {
                    if (source[key] === null || source[key] === undefined) {
                        target[key] = source[key];
                    } else if (typeof source[key] === 'object' && !Array.isArray(source[key]) && !(source[key] instanceof Date)) {
                        if (!target[key] || typeof target[key] !== 'object') {
                            target[key] = {};
                        }
                        merge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            }
        };
        
        merge(merged, savedState);
        return merged;
    }
    
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Public API Methods
    setCurrentStep(step) {
        this.updateState('workflow.currentStep', step);
        this.updateState('workflow.lastActiveStep', step);
    }
    
    getCurrentStep() {
        return this.getState('workflow.currentStep');
    }
    
    markStepVisited(step) {
        const visitedSteps = this.getState('workflow.visitedSteps') || [];
        if (!visitedSteps.includes(step)) {
            visitedSteps.push(step);
            this.updateState('workflow.visitedSteps', visitedSteps);
        }
    }
    
    markStepCompleted(step) {
        const completedSteps = this.getState('workflow.completedSteps') || [];
        if (!completedSteps.includes(step)) {
            completedSteps.push(step);
            this.updateState('workflow.completedSteps', completedSteps);
        }
        
        // Also update step completion status
        const stepCompletion = this.getState('workflow.stepCompletion') || {};
        stepCompletion[step] = true;
        this.updateState('workflow.stepCompletion', stepCompletion);
    }
    
    isStepVisited(step) {
        const visitedSteps = this.getState('workflow.visitedSteps') || [];
        return visitedSteps.includes(step);
    }
    
    isStepCompleted(step) {
        const completedSteps = this.getState('workflow.completedSteps') || [];
        return completedSteps.includes(step);
    }
    
    setPageInfo(pageInfo) {
        this.updateState('page', pageInfo);
    }
    
    getPageInfo() {
        return this.getState('page');
    }
    
    setTheme(theme) {
        this.updateState('ui.theme', theme);
    }
    
    getTheme() {
        return this.getState('ui.theme');
    }
    
    setLoading(loading) {
        this.updateState('ui.loading', loading);
    }
    
    isLoading() {
        return this.getState('ui.loading');
    }
    
    setStepData(step, data) {
        this.updateState(`data.${step}`, data);
    }
    
    getStepData(step) {
        return this.getState(`data.${step}`);
    }
    
    getAllStepData() {
        return this.getState('data');
    }
    
    getWorkflowSummary() {
        const workflow = this.getState('workflow');
        return {
            currentStep: workflow.currentStep,
            visitedSteps: workflow.visitedSteps || [],
            completedSteps: workflow.completedSteps || [],
            canGoForward: workflow.canGoForward,
            canGoBack: workflow.canGoBack,
            lastActiveStep: workflow.lastActiveStep,
            stepCompletion: workflow.stepCompletion || {}
        };
    }
    
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }
    
    getLocalErrors() {
        return this.getState('ui.errors') || [];
    }
    
    clearLocalErrors() {
        this.updateState('ui.errors', []);
    }
    
    isReady() {
        return this.isInitialized && this.state.initialized;
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isUpdating: this.isUpdating,
            stateInitialized: this.state.initialized,
            currentStep: this.getCurrentStep(),
            lastActiveStep: this.getLastActiveStep(),
            subscriberCount: Array.from(this.subscribers.values()).reduce((total, set) => total + set.size, 0),
            historySize: this.history.length,
            lastSaved: this.state.app.lastSaved,
            sessionId: this.state.app.sessionId,
            hasStoredData: this.hasStoredData()
        };
    }
    
    cleanup() {
        console.log('🧹 StateManager cleanup...');
        
        this.saveToStorage();
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        
        this.cleanupEventListeners();
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('beforeunload', this.saveToStorage);
        
        this.subscribers.clear();
        this.history = [];
        
        this.isInitialized = false;
        this.isUpdating = false;
        
        console.log('✅ StateManager cleanup completed');
    }
}

export default StateManager;
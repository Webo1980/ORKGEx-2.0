// ================================
// src/core/ui/LoadingManager.js - FIXED: Proper StateManager usage
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class LoadingManager {
    constructor() {
        this.globalOverlay = null;
        this.loadingSpinner = null;
        this.loadingText = null;
        this.loadingSubtext = null;
        this.progressFill = null;
        
        this.activeOperations = new Set();
        this.isInitialized = false;
        this.stateUnsubscriber = null;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('⏳ Initializing LoadingManager...');
            
            this.findElements();
            this.setupStateListeners();
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ LoadingManager initialized');
            
        } catch (error) {
            console.error('❌ LoadingManager initialization failed:', error);
            throw error;
        }
    }
    
    findElements() {
        this.globalOverlay = document.getElementById('global-loading-overlay');
        
        if (this.globalOverlay) {
            this.loadingSpinner = this.globalOverlay.querySelector('.loading-spinner');
            this.loadingText = this.globalOverlay.querySelector('.loading-text');
            this.loadingSubtext = this.globalOverlay.querySelector('.loading-subtext');
            this.progressFill = this.globalOverlay.querySelector('.loading-progress-fill');
        }
        
        if (!this.globalOverlay) {
            console.warn('Global loading overlay not found, creating one');
            this.createLoadingOverlay();
        }
    }
    
    createLoadingOverlay() {
        this.globalOverlay = document.createElement('div');
        this.globalOverlay.id = 'global-loading-overlay';
        this.globalOverlay.className = 'global-loading-overlay hidden';
        this.globalOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div class="loading-text">Loading...</div>
                <div class="loading-subtext">Please wait</div>
                <div class="loading-progress">
                    <div class="loading-progress-bar">
                        <div class="loading-progress-fill"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.globalOverlay);
        
        // Re-find elements
        this.loadingSpinner = this.globalOverlay.querySelector('.loading-spinner');
        this.loadingText = this.globalOverlay.querySelector('.loading-text');
        this.loadingSubtext = this.globalOverlay.querySelector('.loading-subtext');
        this.progressFill = this.globalOverlay.querySelector('.loading-progress-fill');
    }
    
    setupStateListeners() {
        // Get StateManager
        const stateManager = this.getStateManager();
        
        if (stateManager && stateManager.subscribe) {
            // Subscribe to loading state changes
            this.stateUnsubscriber = stateManager.subscribe('ui.isLoading', (isLoading) => {
                if (isLoading) {
                    const state = stateManager.getState();
                    const message = state?.ui?.loadingMessage || 'Processing...';
                    const subtext = state?.ui?.loadingSubtext || 'Please wait';
                    this.show(message, subtext);
                } else {
                    this.hide();
                }
            });
        }
    }
    
    setupEventListeners() {
        // Listen for loading events
        eventManager.on('loading:show', (data) => {
            this.show(data.message, data.subtext);
        });
        
        eventManager.on('loading:hide', () => {
            this.hide();
        });
        
        eventManager.on('loading:progress', (data) => {
            this.updateProgress(data.percentage);
        });
        
        eventManager.on('loading:step', (data) => {
            this.showStepLoading(data.step, data.message);
        });
    }
    
    getStateManager() {
        // Try multiple sources
        if (window.serviceManager && window.serviceManager.getService) {
            return window.serviceManager.getService('stateManager');
        }
        return window.stateManager;
    }
    
    show(message = 'Processing...', subtext = 'Please wait while we prepare your analysis') {
        if (!this.globalOverlay) {
            this.createLoadingOverlay();
        }
        
        // Update text content
        if (this.loadingText) {
            this.loadingText.textContent = message;
        }
        
        if (this.loadingSubtext) {
            this.loadingSubtext.textContent = subtext;
        }
        
        // Show overlay
        this.globalOverlay.classList.remove('hidden');
        this.globalOverlay.classList.add('show');
        
        // Update state
        const stateManager = this.getStateManager();
        if (stateManager && stateManager.updateState) {
            stateManager.updateState('ui.isLoading', true, { skipNotify: true });
            stateManager.updateState('ui.loadingMessage', message, { skipNotify: true });
            stateManager.updateState('ui.loadingSubtext', subtext, { skipNotify: true });
        }
        
        console.log(`🔄 Loading started: ${message}`);
    }
    
    hide() {
        if (!this.globalOverlay) return;
        
        // Hide overlay with animation
        this.globalOverlay.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.globalOverlay) {
                this.globalOverlay.classList.add('hidden');
            }
        }, 300);
        
        // Update state
        const stateManager = this.getStateManager();
        if (stateManager && stateManager.updateState) {
            stateManager.updateState('ui.isLoading', false, { skipNotify: true });
        }
        
        console.log('✅ Loading completed');
    }
    
    updateProgress(percentage) {
        if (this.progressFill) {
            this.progressFill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }
    }
    
    showStepLoading(step, message) {
        const stepContent = document.getElementById(`${step}-step`) || 
                          document.querySelector(`[data-step="${step}"]`);
        
        if (!stepContent) return;
        
        // Create or update step loading indicator
        let stepLoading = stepContent.querySelector('.step-loading');
        if (!stepLoading) {
            stepLoading = document.createElement('div');
            stepLoading.className = 'step-loading';
            stepLoading.innerHTML = `
                <div class="step-loading-content">
                    <div class="step-loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <div class="step-loading-text">${message}</div>
                </div>
            `;
            stepContent.appendChild(stepLoading);
        } else {
            const textElement = stepLoading.querySelector('.step-loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
        }
        
        stepLoading.style.display = 'flex';
        this.activeOperations.add(`step_${step}`);
    }
    
    hideStepLoading(step) {
        const stepContent = document.getElementById(`${step}-step`) || 
                          document.querySelector(`[data-step="${step}"]`);
        
        if (!stepContent) return;
        
        const stepLoading = stepContent.querySelector('.step-loading');
        if (stepLoading) {
            stepLoading.style.display = 'none';
        }
        
        this.activeOperations.delete(`step_${step}`);
    }
    
    showWithProgress(message, subtext) {
        this.show(message, subtext);
        this.updateProgress(0);
        
        // Animate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) {
                progress = 90;
                clearInterval(interval);
            }
            this.updateProgress(progress);
        }, 500);
        
        return () => {
            clearInterval(interval);
            this.updateProgress(100);
            setTimeout(() => this.hide(), 500);
        };
    }
    
    isLoading() {
        const stateManager = this.getStateManager();
        const stateLoading = stateManager?.getState ? stateManager.getState('ui.isLoading') : false;
        return stateLoading || this.activeOperations.size > 0;
    }
    
    getActiveOperations() {
        return Array.from(this.activeOperations);
    }
    
    clearAllOperations() {
        this.activeOperations.clear();
        this.hide();
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading(),
            activeOperations: this.getActiveOperations(),
            hasOverlay: !!this.globalOverlay,
            overlayVisible: this.globalOverlay ? !this.globalOverlay.classList.contains('hidden') : false
        };
    }
    
    cleanup() {
        console.log('🧹 LoadingManager cleanup...');
        
        // Unsubscribe from state
        if (this.stateUnsubscriber && typeof this.stateUnsubscriber === 'function') {
            this.stateUnsubscriber();
        }
        
        // Remove event listeners
        eventManager.off('loading:show');
        eventManager.off('loading:hide');
        eventManager.off('loading:progress');
        eventManager.off('loading:step');
        
        // Clear operations
        this.activeOperations.clear();
        
        // Remove overlay from DOM
        if (this.globalOverlay && this.globalOverlay.parentNode) {
            this.globalOverlay.parentNode.removeChild(this.globalOverlay);
        }
        
        // Clear references
        this.globalOverlay = null;
        this.loadingSpinner = null;
        this.loadingText = null;
        this.loadingSubtext = null;
        this.progressFill = null;
        
        this.isInitialized = false;
        
        console.log('✅ LoadingManager cleanup completed');
    }
}
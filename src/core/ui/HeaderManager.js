// ================================
// src/core/ui/HeaderManager.js - Using ResetHandler
// ================================

import { eventManager, EVENTS } from '../../utils/eventManager.js';
import { resetHandler } from '../handlers/ResetHandler.js';

export class HeaderManager {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.currentPageInfo = null;
        this.currentTheme = 'dark';
        
        // Bind methods
        this.handleStartOver = this.handleStartOver.bind(this);
        this.handleThemeToggle = this.handleThemeToggle.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleResetComplete = this.handleResetComplete.bind(this);
    }
    
    async init() {
        try {
            console.log('🎯 Initializing HeaderManager...');
            
            this.container = document.getElementById('header-container');
            if (!this.container) {
                throw new Error('Header container not found');
            }
            
            this.injectHeaderHTML();
            this.setupEventListeners();
            this.loadCurrentTheme();
            
            this.isInitialized = true;
            console.log('✅ HeaderManager initialized');
            
        } catch (error) {
            console.error('❌ HeaderManager initialization failed:', error);
            throw error;
        }
    }
    
    // Get ToastManager safely through ServiceManager
    getToastManager() {
        // Use ServiceManager as the primary source of truth
        if (window.serviceManager && window.serviceManager.getService) {
            const toastManager = window.serviceManager.getService('toastManager');
            if (toastManager && toastManager.isReady && toastManager.isReady()) {
                return toastManager;
            }
        }
        
        // Fallback to global reference
        if (window.toastManager && window.toastManager.isReady && window.toastManager.isReady()) {
            return window.toastManager;
        }
        
        // Fallback to moduleLoader (for backward compatibility)
        if (window.moduleLoader && window.moduleLoader.getModule) {
            const toastManager = window.moduleLoader.getModule('toastManager');
            if (toastManager && toastManager.isReady && toastManager.isReady()) {
                return toastManager;
            }
        }
        
        return null;
    }
   
    createHeaderHTML() {
        return `
            <header class="header" role="banner">
                <div class="header-content">
                    <div class="header-left">
                        <div class="logo">
                            <div class="logo-icon">
                                <img src="../../../assets/icons/icon128.png" alt="ORKG Annotator Logo" class="logo-icon">
                            </div>
                            <div class="logo-text">
                                <span class="logo-title">ORKG Annotator</span>
                                <span class="logo-version">v2.0</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="header-center">
                        <div class="page-info">
                            <div class="page-title" id="header-page-title">Loading...</div>
                            <div class="page-status" id="header-page-status">Analyzing page...</div>
                        </div>
                    </div>
                    
                    <div class="header-right">
                        <div class="header-actions">
                            <button id="theme-toggle" class="btn-icon theme-toggle" title="Toggle Theme" aria-label="Toggle between light and dark themes">
                                <i class="fas fa-moon" aria-hidden="true"></i>
                            </button>
                            <button id="start-over-btn" class="btn-icon start-over" title="Start Over" aria-label="Start annotation process over">
                                <i class="fas fa-redo" aria-hidden="true"></i>
                            </button>
                            <button id="close-btn" class="btn-icon close" title="Close Extension" aria-label="Close the annotation extension">
                                <i class="fas fa-times" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        `;
    }
    
    injectHeaderHTML() {
        if (!this.container) return;
        
        this.container.innerHTML = this.createHeaderHTML();
        console.log('🎯 Header HTML injected');
    }
    
    setupEventListeners() {
        // Button event listeners
        const startOverBtn = document.getElementById('start-over-btn');
        const themeToggle = document.getElementById('theme-toggle');
        const closeBtn = document.getElementById('close-btn');
        
        if (startOverBtn) {
            startOverBtn.addEventListener('click', this.handleStartOver);
        }
        
        // Also handle the footer start-over button
        const footerStartOverBtn = document.querySelector('.footer-actions #start-over-btn, .footer-actions .start-over-btn');
        if (footerStartOverBtn) {
            footerStartOverBtn.addEventListener('click', this.handleStartOver);
        }
        
        if (themeToggle) {
            themeToggle.addEventListener('click', this.handleThemeToggle);
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', this.handleClose);
        }
        
        // State change listeners
        eventManager.on('page:info_updated', (pageInfo) => {
            this.updatePageInfo(pageInfo);
        });
        
        eventManager.on('theme:changed', (theme) => {
            this.updateThemeIcon(theme);
        });
        
        eventManager.on('workflow:step_changed', (data) => {
            this.updateForStep(data.currentStep || data.step);
        });
        
        // Listen for reset events
        eventManager.on('reset:complete', this.handleResetComplete);
        
        eventManager.on('reset:error', (data) => {
            this.handleResetError(data);
        });
        
        console.log('🎯 Header event listeners setup');
    }
    
    loadCurrentTheme() {
        const savedTheme = localStorage.getItem('orkg-annotator-theme') || 'dark';
        this.currentTheme = savedTheme;
        this.updateThemeIcon(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    updatePageInfo(pageInfo) {
        this.currentPageInfo = pageInfo;
        
        const titleElement = document.getElementById('header-page-title');
        const statusElement = document.getElementById('header-page-status');
        
        if (titleElement && pageInfo.title) {
            titleElement.textContent = this.truncateText(pageInfo.title, 40);
            titleElement.title = pageInfo.title;
        }
        
        if (statusElement && pageInfo.status) {
            statusElement.textContent = pageInfo.status;
        }
        
        console.log('🎯 Header page info updated:', pageInfo);
    }
    
    setPageInfo(title, status = null) {
        const pageInfo = {
            title: title,
            status: status || 'Ready'
        };
        
        this.updatePageInfo(pageInfo);
        eventManager.emit('page:info_updated', pageInfo);
    }
    
    updateForStep(step) {
        const statusElement = document.getElementById('header-page-status');
        if (!statusElement) return;
        
        const stepMessages = {
            'welcome': 'Ready to analyze',
            'metadata': 'Extracting metadata',
            'field': 'Identifying research field',
            'problem': 'Analyzing research problems',
            'template': 'Selecting template',
            'analysis': 'Performing content analysis'
        };
        
        const message = stepMessages[step] || 'Processing...';
        statusElement.textContent = message;
        
        console.log(`🎯 Header updated for step: ${step}`);
    }
    
    updateThemeIcon(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;
        
        const icon = themeToggle.querySelector('i');
        if (!icon) return;
        
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        themeToggle.title = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
        themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
        
        this.currentTheme = theme;
    }
    
    handleStartOver(event) {
        event.preventDefault();
        
        // Check if reset is already in progress
        if (resetHandler.isResetting) {
            console.log('🔄 Reset already in progress');
            return;
        }
        
        console.log('🔄 Start over requested');
        
        const toastManager = this.getToastManager();
        
        if (toastManager && toastManager.showConfirmation) {
            // Use toast confirmation
            toastManager.showConfirmation(
                'Are you sure you want to start over? This will clear all data, cache, and reset everything to the initial state.',
                () => {
                    console.log('✅ Reset confirmed by user via toast');
                    this.performReset();
                },
                () => {
                    console.log('❌ Reset cancelled by user via toast');
                    if (toastManager.info) {
                        toastManager.info('Reset cancelled');
                    }
                },
                'warning'
            );
        } else {
            // Fallback to native confirm
            console.log('⚠️ ToastManager not available, using fallback confirm');
            this.fallbackStartOver();
        }
    }
    
    fallbackStartOver() {
        const confirmed = confirm(
            'Are you sure you want to start over?\n\n' +
            'This will:\n' +
            '• Clear all progress and data\n' +
            '• Clear all cached information\n' +
            '• Reset to the welcome screen\n\n' +
            'This action cannot be undone.'
        );
        
        if (confirmed) {
            console.log('✅ Reset confirmed by user via fallback');
            this.performReset();
        } else {
            console.log('❌ Reset cancelled by user via fallback');
        }
    }
    
    async performReset() {
        try {
            // Show immediate feedback
            this.showResetInProgress();
            
            // Perform complete reset using ResetHandler
            const success = await resetHandler.performCompleteReset({
                source: 'header',
                reload: resetHandler.shouldReload(),
                clearStorage: true,
                clearCache: true,
                resetServices: true,
                clearEvents: true,
                resetUI: true
            });
            
            if (success && !resetHandler.shouldReload()) {
                // Navigate to welcome if not reloading
                setTimeout(() => {
                    eventManager.emit('NAVIGATE_TO_STEP', { step: 'welcome', force: true });
                }, 500);
            }
            
        } catch (error) {
            console.error('❌ Failed to perform reset:', error);
            this.handleResetError({ error });
        }
    }
    
    showResetInProgress() {
        this.setPageInfo('Resetting Everything', 'Clearing all data and cache...');
        
        // Disable all buttons during reset
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
        
        // Add visual feedback to start-over buttons
        const startOverBtns = document.querySelectorAll('#start-over-btn, .start-over-btn');
        startOverBtns.forEach(btn => {
            btn.classList.add('reset-in-progress');
            
            // Add spinner icon
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-spinner fa-spin';
            }
        });
    }
    
    handleResetComplete(data) {
        console.log('✅ Reset complete, updating UI...', data);
        
        // Re-enable buttons
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });
        
        // Reset start-over button icons
        const startOverBtns = document.querySelectorAll('#start-over-btn, .start-over-btn');
        startOverBtns.forEach(btn => {
            btn.classList.remove('reset-in-progress');
            
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-redo';
            }
        });
        
        // Update page info
        this.setPageInfo('ORKG Annotator', 'Ready to analyze');
        
        // Show success message if not reloading
        if (!data?.reload) {
            const toastManager = this.getToastManager();
            if (toastManager && toastManager.success) {
                toastManager.success('Reset complete! Ready to start fresh.', 3000);
            }
        }
    }
    
    handleResetError(data) {
        console.error('❌ Reset error:', data);
        
        // Re-enable buttons
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });
        
        // Reset start-over button icons
        const startOverBtns = document.querySelectorAll('#start-over-btn, .start-over-btn');
        startOverBtns.forEach(btn => {
            btn.classList.remove('reset-in-progress');
            
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-redo';
            }
        });
        
        // Show error message
        const toastManager = this.getToastManager();
        if (toastManager && toastManager.error) {
            toastManager.error('Failed to reset. Please reload the extension.');
        } else {
            alert('Failed to reset. Please reload the extension.');
        }
    }
    
    handleThemeToggle(event) {
        event.preventDefault();
        
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        
        console.log(`🎯 Theme toggle: ${this.currentTheme} → ${newTheme}`);
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('orkg-annotator-theme', newTheme);
        this.updateThemeIcon(newTheme);
        eventManager.emit('theme:changed', newTheme);
        
        // Add visual feedback
        const button = event.target.closest('button');
        if (button) {
            button.classList.add('theme-switching');
            setTimeout(() => {
                button.classList.remove('theme-switching');
            }, 300);
        }
    }
    
    handleClose(event) {
        event.preventDefault();
        
        console.log('❌ Close extension requested');
        
        try {
            // Save any pending data before closing
            const stateManager = window.serviceManager?.getService('stateManager');
            if (stateManager && stateManager.saveToStorage) {
                stateManager.saveToStorage();
            }
            
            // Close the window
            if (window.close) {
                window.close();
            }
            
            // Send message to background script
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'CLOSE_EXTENSION'
                });
            }
            
        } catch (error) {
            console.error('Failed to close extension:', error);
            
            // Hide the popup as a fallback
            const popupContainer = document.querySelector('.popup-container');
            if (popupContainer) {
                popupContainer.style.display = 'none';
            }
        }
    }
    
    // Public Methods
    setStatus(status) {
        const statusElement = document.getElementById('header-page-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
        
        if (this.currentPageInfo) {
            this.currentPageInfo.status = status;
        }
    }
    
    showLoading(message = 'Loading...') {
        this.setStatus(message);
        
        const statusElement = document.getElementById('header-page-status');
        if (statusElement) {
            statusElement.classList.add('loading');
        }
    }
    
    hideLoading() {
        const statusElement = document.getElementById('header-page-status');
        if (statusElement) {
            statusElement.classList.remove('loading');
        }
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            console.warn('Invalid theme:', theme);
            return;
        }
        
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('orkg-annotator-theme', theme);
        this.updateThemeIcon(theme);
        eventManager.emit('theme:changed', theme);
    }
    
    toggleStartOverButton(show = true) {
        const startOverBtns = document.querySelectorAll('#start-over-btn, .start-over-btn');
        startOverBtns.forEach(btn => {
            btn.style.display = show ? 'flex' : 'none';
        });
    }
    
    setButtonsEnabled(enabled = true) {
        const buttons = this.container?.querySelectorAll('button');
        if (buttons) {
            buttons.forEach(button => {
                button.disabled = !enabled;
                if (enabled) {
                    button.classList.remove('disabled');
                } else {
                    button.classList.add('disabled');
                }
            });
        }
    }
    
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    getContainer() {
        return this.container;
    }
    
    isReady() {
        return this.isInitialized && this.container !== null;
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasContainer: !!this.container,
            currentTheme: this.currentTheme,
            currentPageInfo: this.currentPageInfo,
            isResetting: resetHandler.isResetting,
            toastManagerAvailable: !!this.getToastManager()
        };
    }
    
    refresh() {
        if (!this.isInitialized) return;
        
        if (this.container && !this.container.innerHTML.trim()) {
            this.injectHeaderHTML();
            this.setupEventListeners();
        }
        
        this.loadCurrentTheme();
        
        if (this.currentPageInfo) {
            this.updatePageInfo(this.currentPageInfo);
        }
    }
    
    cleanup() {
        console.log('🧹 HeaderManager cleanup...');
        
        // Remove event listeners
        eventManager.off('page:info_updated');
        eventManager.off('theme:changed');
        eventManager.off('workflow:step_changed');
        eventManager.off('reset:complete');
        eventManager.off('reset:error');
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Reset state
        this.isInitialized = false;
        this.currentPageInfo = null;
        this.container = null;
        
        console.log('✅ HeaderManager cleanup completed');
    }
}

export default HeaderManager;
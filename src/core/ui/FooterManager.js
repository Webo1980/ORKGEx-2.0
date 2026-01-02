// ================================
// src/core/ui/FooterManager.js - Complete Footer Component
// ================================

import { eventManager, EVENTS } from '../../utils/eventManager.js';
import { AboutModal } from '../../components/modals/AboutModal.js';
import { HelpModal } from '../../components/modals/HelpModal.js';

export class FooterManager {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.modals = new Map();
        
        // Bind methods
        this.handleAbout = this.handleAbout.bind(this);
        this.handleHelp = this.handleHelp.bind(this);
    }
    
    async init() {
        try {
            console.log('👣 Initializing FooterManager...');
            
            this.container = document.getElementById('footer-container');
            if (!this.container) {
                throw new Error('Footer container not found');
            }
            
            this.injectFooterHTML();
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ FooterManager initialized');
            
        } catch (error) {
            console.error('❌ FooterManager initialization failed:', error);
            throw error;
        }
    }
    
    createFooterHTML() {
        return `
            <footer class="footer" role="contentinfo">
                <div class="footer-content">
                    <div class="footer-left">
                        <div class="orkg-info">
                            <a href="https://orkg.org" target="_blank" rel="noopener noreferrer" class="orkg-logo">
                                <img src="../../assets/icons/icon16.png" alt="ORKG Logo" width="16" height="16" />
                                <span class="logo-text">ORKG</span>
                            </a>
                            <div class="open-knowledge">Open Research Knowledge Graph</div>
                        </div>
                    </div>
                    
                    <div class="footer-right">
                        <div class="footer-links">
                            <button id="about-btn" class="btn-text" aria-label="About ORKG Annotator">
                                About
                            </button>
                            <button id="help-btn" class="btn-text" aria-label="Get help using the annotator">
                                Help
                            </button>
                            <a href="https://orkg.org/page/data-protection" target="_blank" rel="noopener noreferrer" class="btn-text" aria-label="View privacy policy (opens in new tab)">
                                Privacy
                            </a>
                            <a href="https://orkg.org/page/terms-of-use" target="_blank" rel="noopener noreferrer" class="btn-text" aria-label="View terms of use (opens in new tab)">
                                Terms
                            </a>
                        </div>
                    </div>
                </div>
                
                <div class="footer-bottom">
                    <div class="powered-by">
                        <span>Powered by</span>
                        <a href="https://www.tib.eu" target="_blank" rel="noopener noreferrer" aria-label="Visit TIB Hannover website (opens in new tab)">
                            TIB Hannover
                        </a>
                    </div>
                </div>
            </footer>
        `;
    }
    
    injectFooterHTML() {
        if (!this.container) return;
        
        this.container.innerHTML = this.createFooterHTML();
        console.log('👣 Footer HTML injected');
    }
    
    setupEventListeners() {
        // Button event listeners
        const aboutBtn = document.getElementById('about-btn');
        const helpBtn = document.getElementById('help-btn');
        
        if (aboutBtn) {
            aboutBtn.addEventListener('click', this.handleAbout);
        }
        
        if (helpBtn) {
            helpBtn.addEventListener('click', this.handleHelp);
        }
        
        console.log('👣 Footer event listeners setup');
    }
    
    // Event Handlers
    
    handleAbout(event) {
        event.preventDefault();
        console.log('ℹ️ About dialog requested');
        this.showAboutModal();
    }
    
    handleHelp(event) {
        event.preventDefault();
        console.log('❓ Help dialog requested');
        this.showHelpModal();
    }
    
    // Modal Methods
    
    showAboutModal() {
        const modalId = 'about-modal';
        
        if (this.modals.has(modalId)) {
            this.modals.get(modalId).open();
            return;
        }
        
        const aboutModal = new AboutModal({
            onClose: () => {
                this.modals.delete(modalId);
            }
        });
        
        this.modals.set(modalId, aboutModal);
        aboutModal.open();
    }
    
    showHelpModal() {
        const modalId = 'help-modal';
        
        if (this.modals.has(modalId)) {
            this.modals.get(modalId).open();
            return;
        }
        
        const helpModal = new HelpModal({
            onClose: () => {
                this.modals.delete(modalId);
            }
        });
        
        this.modals.set(modalId, helpModal);
        helpModal.open();
    }
    
    createModal(id, html) {
        const modalElement = document.createElement('div');
        modalElement.innerHTML = html;
        document.body.appendChild(modalElement.firstElementChild);
        
        const modal = {
            element: document.getElementById(id),
            show: () => {
                modal.element.classList.add('show');
                document.body.classList.add('modal-open');
                
                // Focus management
                const firstFocusable = modal.element.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    firstFocusable.focus();
                }
            },
            hide: () => {
                modal.element.classList.remove('show');
                document.body.classList.remove('modal-open');
                
                // Clean up after animation
                setTimeout(() => {
                    if (modal.element.parentNode) {
                        modal.element.parentNode.removeChild(modal.element);
                    }
                }, 300);
            }
        };
        
        // Setup close handlers
        const closeButtons = modal.element.querySelectorAll('.modal-close-btn, .modal-close-trigger');
        closeButtons.forEach(button => {
            button.addEventListener('click', modal.hide);
        });
        
        // Close on overlay click
        modal.element.addEventListener('click', (e) => {
            if (e.target === modal.element) {
                modal.hide();
            }
        });
        
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.hide();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        
        modal.element.addEventListener('show', () => {
            document.addEventListener('keydown', handleEscape);
        });
        
        return modal;
    }
    
    // Public Methods
    
    showCustomModal(id, title, content, options = {}) {
        if (this.modals.has(id)) {
            this.modals.get(id).open();
            return this.modals.get(id);
        }
        
        const customModal = new BaseModal({
            title,
            ...options,
            onClose: () => {
                this.modals.delete(id);
            }
        });
        
        // Override renderContent to use the provided content
        customModal.renderContent = () => content;
        
        this.modals.set(id, customModal);
        customModal.open();
        
        return customModal;
    }
    
    hideModal(id) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.close();
            this.modals.delete(id);
        }
    }
    
    hideAllModals() {
        this.modals.forEach((modal, id) => {
            modal.close();
        });
        this.modals.clear();
    }
    
    getContainer() {
        return this.container;
    }
    
    isReady() {
        return this.isInitialized && this.container !== null;
    }
    
    refresh() {
        if (!this.isInitialized) return;
        
        // Re-inject HTML if container is empty
        if (this.container && !this.container.innerHTML.trim()) {
            this.injectFooterHTML();
            this.setupEventListeners();
        }
    }
    
    cleanup() {
        console.log('🧹 FooterManager cleanup...');
        
        // Hide all modals
        this.hideAllModals();
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Reset state
        this.isInitialized = false;
        this.container = null;
        
        console.log('✅ FooterManager cleanup completed');
    }
}
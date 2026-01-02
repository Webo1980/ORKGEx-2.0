// ================================
// src/core/content/MetadataStep.js - FIXED: Proper Method Calls
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class MetadataStep {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.isLoading = false;
        this.currentMetadata = null;
        this.eventUnsubscribers = []; // FIXED: Track event unsubscribers
    }
    
    async init() {
        try {
            console.log('📄 Initializing MetadataStep...');
            
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ MetadataStep initialized');
        } catch (error) {
            console.error('❌ MetadataStep initialization failed:', error);
            throw error;
        }
    }
    
    getStateManager() {
        return window.serviceManager?.getService('stateManager') || window.stateManager;
    }
    
    getWorkflowState() {
        return window.serviceManager?.getService('workflowState') || window.workflowState;
    }
    
    setupEventListeners() {
        // FIXED: Clean up existing listeners first
        this.cleanupEventListeners();
        
        const stateManager = this.getStateManager();
        if (stateManager && stateManager.subscribe) {
            const unsubscribe = stateManager.subscribe('data.metadata', (metadata) => {
                if (metadata && this.container && !this.isLoading) {
                    this.currentMetadata = metadata;
                    this.renderMetadata(metadata);
                }
            });
            
            this.eventUnsubscribers.push(unsubscribe);
        }
    }
    
    cleanupEventListeners() {
        this.eventUnsubscribers.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.eventUnsubscribers = [];
    }
    
    async load() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            console.log('📄 Loading MetadataStep...');
            
            const stateManager = this.getStateManager();
            
            // FIXED: Use correct method name
            const metadata = stateManager?.getState ? stateManager.getState('data.metadata') : null;
    
            console.log('📊 Retrieved metadata from state:', metadata);
            
            if (metadata && this.hasValidMetadata(metadata)) {
                this.currentMetadata = metadata;
                this.renderMetadata(metadata);
                this.markStepAsValid(true);
            } else {
                console.warn('⚠️ No valid metadata found in state');
                this.showNoMetadataState();
                this.markStepAsValid(false);
            }
            
        } catch (error) {
            console.error('Failed to load metadata step:', error);
            this.showErrorState(error);
            this.markStepAsValid(false);
        } finally {
            this.isLoading = false;
        }
    }
    
    hasValidMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            console.log('❌ Invalid metadata: not an object');
            return false;
        }
        
        const hasTitle = metadata.title && metadata.title.trim().length > 0;
        const hasAuthors = metadata.authors && Array.isArray(metadata.authors) && metadata.authors.length > 0;
        const hasAnyContent = hasTitle || hasAuthors || metadata.abstract || metadata.doi || metadata.journal;
        
        console.log('🔍 Metadata validation:', {
            hasTitle,
            hasAuthors,
            hasAnyContent,
            title: metadata.title?.substring(0, 50) + '...',
            authorsCount: metadata.authors?.length || 0
        });
        
        return hasAnyContent;
    }
    
    markStepAsValid(isValid) {
        const workflowState = this.getWorkflowState();
        if (workflowState) {
            workflowState.setStepValidation('metadata', isValid, isValid ? [] : ['No valid metadata available']);
            console.log(`📊 Metadata step marked as ${isValid ? 'valid' : 'invalid'}`);
        }
    }
    
    renderMetadata(metadata) {
        if (!metadata || !this.container) {
            this.showNoMetadataState();
            return;
        }
        
        console.log('🎨 Rendering metadata for:', metadata.title?.substring(0, 50));
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2>
                        <i class="fas fa-file-alt"></i>
                        Paper Metadata
                    </h2>
                    <p>Review the extracted paper information. Use the navigation buttons below to proceed.</p>
                </div>
                
                <div class="metadata-content">
                    <!-- Title Section -->
                    <div class="metadata-section title-section">
                        <div class="section-header">
                            <h3><i class="fas fa-heading"></i> Paper Title</h3>
                            <span class="badge ${metadata.title ? 'badge-success' : 'badge-warning'}">
                                ${metadata.title ? 'Extracted' : 'Missing'}
                            </span>
                        </div>
                        <div class="section-content">
                            <div class="paper-title">${this.escapeHtml(metadata.title || 'No title available')}</div>
                            <div class="title-meta">
                                <span><i class="fas fa-text-width"></i> ${(metadata.title || '').length} characters</span>
                                <span class="${metadata.title && metadata.title.length > 10 ? 'quality-good' : 'quality-warning'}">
                                    <i class="fas ${metadata.title && metadata.title.length > 10 ? 'fa-check' : 'fa-exclamation-triangle'}"></i>
                                    ${metadata.title && metadata.title.length > 10 ? 'Good quality' : 'Needs review'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Two Column Layout -->
                    <div class="metadata-grid">
                        <!-- Authors Section -->
                        <div class="metadata-section authors-section">
                            <div class="section-header">
                                <h3><i class="fas fa-users"></i> Authors</h3>
                                <span class="badge ${metadata.authors && metadata.authors.length > 0 ? 'badge-success' : 'badge-warning'}">
                                    ${(metadata.authors || []).length} ${(metadata.authors || []).length === 1 ? 'Author' : 'Authors'}
                                </span>
                            </div>
                            <div class="section-content">
                                ${this.renderAuthors(metadata.authors || [])}
                            </div>
                        </div>
                        
                        <!-- Publication Details -->
                        <div class="metadata-section publication-section">
                            <div class="section-header">
                                <h3><i class="fas fa-journal-whills"></i> Publication</h3>
                                <span class="badge ${(metadata.journal || metadata.year) ? 'badge-success' : 'badge-info'}">
                                    ${(metadata.journal || metadata.year) ? 'Available' : 'Partial'}
                                </span>
                            </div>
                            <div class="section-content">
                                ${this.renderPublication(metadata)}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Abstract Section (if available) -->
                    ${metadata.abstract ? `
                        <div class="metadata-section abstract-section">
                            <div class="section-header">
                                <h3><i class="fas fa-align-left"></i> Abstract</h3>
                                <span class="badge badge-success">${this.cleanText(metadata.abstract).length} chars</span>
                            </div>
                            <div class="section-content">
                                <div class="abstract-text ${metadata.abstract.length > 400 ? 'expandable' : ''}" id="abstract-text-${Date.now()}">
                                    ${this.escapeHtml(this.cleanText(metadata.abstract))}
                                </div>
                                ${metadata.abstract.length > 400 ? `
                                    <button class="expand-btn" data-target="abstract-text-${Date.now()}">Show more</button>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- DOI Section (if available) -->
                    ${metadata.doi ? `
                        <div class="metadata-section doi-section">
                            <div class="section-header">
                                <h3><i class="fas fa-link"></i> DOI</h3>
                                <span class="badge badge-success">Verified</span>
                            </div>
                            <div class="section-content">
                                <div class="doi-content">
                                    <code>${this.escapeHtml(metadata.doi)}</code>
                                    <a href="https://doi.org/${encodeURIComponent(metadata.doi)}" 
                                       target="_blank" 
                                       rel="noopener noreferrer" 
                                       class="doi-link">
                                        <i class="fas fa-external-link-alt"></i>
                                        Open DOI
                                    </a>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    
                </div>
            </div>
        `;
        
        this.setupExpandFunctionality();
    }
    
    setupExpandFunctionality() {
        const expandButtons = this.container?.querySelectorAll('.expand-btn');
        
        expandButtons?.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = button.getAttribute('data-target');
                const abstractText = document.getElementById(targetId);
                
                if (abstractText) {
                    const isExpanded = abstractText.classList.contains('expanded');
                    
                    if (isExpanded) {
                        abstractText.classList.remove('expanded');
                        button.textContent = 'Show more';
                    } else {
                        abstractText.classList.add('expanded');
                        button.textContent = 'Show less';
                    }
                    
                    console.log(`📄 Abstract ${isExpanded ? 'collapsed' : 'expanded'}`);
                }
            });
        });
    }
    
    renderAuthors(authors) {
        if (!authors || authors.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No author information available</p>
                </div>
            `;
        }
        
        let html = '<div class="authors-list">';
        
        authors.slice(0, 8).forEach((author, index) => {
            html += `
                <div class="author-item">
                    <span class="author-number">${index + 1}</span>
                    <span class="author-name">${this.escapeHtml(author.name)}</span>
                </div>
            `;
        });
        
        if (authors.length > 8) {
            html += `
                <div class="author-more">
                    <i class="fas fa-ellipsis-h"></i>
                    and ${authors.length - 8} more authors
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    renderPublication(metadata) {
        const { journal, year, citations, publisher } = metadata;
        
        if (!journal && !year && !citations && !publisher) {
            return `
                <div class="empty-state">
                    <i class="fas fa-journal-whills"></i>
                    <p>Limited publication information</p>
                </div>
            `;
        }
        
        let html = '<div class="publication-details">';
        
        if (journal) {
            html += `
                <div class="pub-item">
                    <i class="fas fa-book"></i>
                    <div class="pub-content">
                        <label>Journal:</label>
                        <span>${this.escapeHtml(journal)}</span>
                    </div>
                </div>
            `;
        }
        
        if (year) {
            html += `
                <div class="pub-item">
                    <i class="fas fa-calendar-alt"></i>
                    <div class="pub-content">
                        <label>Year:</label>
                        <span>${year}</span>
                    </div>
                </div>
            `;
        }
        
        if (publisher) {
            html += `
                <div class="pub-item">
                    <i class="fas fa-building"></i>
                    <div class="pub-content">
                        <label>Publisher:</label>
                        <span>${this.escapeHtml(publisher)}</span>
                    </div>
                </div>
            `;
        }
        
        if (citations) {
            html += `
                <div class="pub-item">
                    <i class="fas fa-quote-right"></i>
                    <div class="pub-content">
                        <label>Citations:</label>
                        <span>${citations}</span>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    showNoMetadataState() {
        if (!this.container) return;
        
        console.log('⚠️ Showing no metadata state');
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2>
                        <i class="fas fa-exclamation-triangle"></i>
                        No Metadata Available
                    </h2>
                    <p>No paper metadata has been extracted yet. Please return to the welcome screen to analyze the page first.</p>
                </div>
                
                <div class="no-data-state">
                    <div class="empty-state-card">
                        <div class="empty-icon">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <h3>No Paper Information</h3>
                        <p>Please return to the welcome screen and run the page analysis to extract paper metadata.</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    showErrorState(error) {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2>
                        <i class="fas fa-exclamation-triangle"></i>
                        Error Loading Metadata
                    </h2>
                    <p>An error occurred while loading the metadata step.</p>
                </div>
                
                <div class="error-state">
                    <div class="error-card">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3>Loading Error</h3>
                        <p>${error.message || 'An unknown error occurred while loading the metadata step.'}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Utility methods
    cleanText(text) {
        if (!text) return '';
        
        return text
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getSourceDisplayName(source) {
        const sourceNames = {
            'crossref': 'Crossref Database',
            'openalex': 'OpenAlex',
            'semantic_scholar': 'Semantic Scholar',
            'google_scholar': 'Google Scholar',
            'page_extraction': 'Page Content',
            'validation_service_mock': 'Demo Data',
            'manual': 'Manual Entry',
            'manual_edit': 'User Edited'
        };
        return sourceNames[source] || 'Unknown Source';
    }
    
    validateCurrentMetadata() {
        const stateManager = this.getStateManager();
        const metadata = this.currentMetadata || (stateManager?.getState ? stateManager.getState('data.metadata') : null);
        
        console.log('🔍 Validating current metadata:', metadata);
        
        if (!metadata) {
            console.warn('❌ No metadata available for validation');
            return false;
        }
        
        const hasValidData = this.hasValidMetadata(metadata);
        
        if (!hasValidData) {
            console.warn('❌ Insufficient metadata quality');
            return false;
        }
        
        return true;
    }
    
    // Public API methods
    getMetadata() {
        const stateManager = this.getStateManager();
        return this.currentMetadata || (stateManager?.getState ? stateManager.getState('data.metadata') : null);
    }
    
    isComplete() {
        return this.validateCurrentMetadata();
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            hasMetadata: !!this.currentMetadata,
            isComplete: this.isComplete()
        };
    }
    
    reset() {
        console.log('🔄 Resetting MetadataStep...');
        
        this.currentMetadata = null;
        this.isLoading = false;
        
        const stateManager = this.getStateManager();
        if (stateManager && stateManager.updateState) {
            stateManager.updateState('workflow.stepCompletion.metadata', false);
        }
        
        this.markStepAsValid(false);
        
        if (this.container) {
            this.load();
        }
    }
    
    cleanup() {
        console.log('🧹 MetadataStep cleanup...');
        
        this.cleanupEventListeners();
        
        this.isInitialized = false;
        this.isLoading = false;
        this.currentMetadata = null;
        this.container = null;
        
        console.log('✅ MetadataStep cleanup completed');
    }
}
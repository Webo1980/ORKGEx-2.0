// ================================
// src/core/content/FieldStep.js - Complete Research Field Selection Implementation
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class FieldStep {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.isLoading = false;
        this.currentFields = null;
        this.selectedField = null;
        this.previouslySelectedField = null;
        this.userAbstract = '';
        this.eventUnsubscribers = [];
        
        // UI element references
        this.fieldCardsContainer = null;
        this.abstractInput = null;
        this.retryButton = null;
        this.loadingState = null;
    }
    
    async init() {
        try {
            console.log('🏷️ Initializing FieldStep...');
            
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ FieldStep initialized');
        } catch (error) {
            console.error('❌ FieldStep initialization failed:', error);
            throw error;
        }
    }
    
    // Get services through ServiceManager
    getStateManager() {
        return window.serviceManager?.getService('stateManager') || window.stateManager;
    }
    
    getWorkflowState() {
        return window.serviceManager?.getService('workflowState') || window.workflowState;
    }
    
    getORKGService() {
        return window.serviceManager?.getService('orkgService');
    }
    
    getDataCache() {
        return window.serviceManager?.getService('dataCache');
    }
    
    getToastManager() {
        return window.serviceManager?.getService('toastManager') || window.toastManager;
    }
    
    getErrorHandler() {
        return window.serviceManager?.getService('errorHandler') || window.errorHandler;
    }
    
    getLoadingManager() {
        return window.serviceManager?.getService('loadingManager');
    }
    
    setupEventListeners() {
        this.cleanupEventListeners();
        
        const stateManager = this.getStateManager();
        if (stateManager && stateManager.subscribe) {
            // Listen for research field changes
            const unsubscribe1 = stateManager.subscribe('data.researchField', (fieldData) => {
                if (fieldData && this.container && !this.isLoading) {
                    this.handleFieldDataUpdate(fieldData);
                }
            });
            
            // Listen for metadata changes (for abstract)
            const unsubscribe2 = stateManager.subscribe('data.metadata', (metadata) => {
                if (metadata && metadata.abstract && this.container) {
                    this.handleAbstractUpdate(metadata.abstract);
                }
            });
            
            this.eventUnsubscribers.push(unsubscribe1, unsubscribe2);
        }
        
        // Listen for field change impact notifications
        eventManager.on('field:change_impact_review', (data) => {
            this.showFieldChangeImpactDialog(data);
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
    
    async load() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            console.log('🏷️ Loading FieldStep...');
            
            // Show loading state
            this.showLoadingState('Analyzing research field...');
            
            const stateManager = this.getStateManager();
            const metadata = stateManager?.getState ? stateManager.getState('data.metadata') : null;
            const existingFieldData = stateManager?.getState ? stateManager.getState('data.researchField') : null;
            
            // Store previously selected field for comparison
            this.previouslySelectedField = existingFieldData?.selectedField || null;
            
            // Check if we have existing field data that's still valid
            if (existingFieldData && existingFieldData.allFields && existingFieldData.allFields.length > 0) {
                console.log('🏷️ Using existing field data');
                this.currentFields = existingFieldData.allFields;
                this.selectedField = existingFieldData.selectedField;
                this.renderFieldSelection();
                this.markStepAsValid(!!this.selectedField);
                return;
            }
            
            // Get abstract from metadata or show input field
            let abstract = metadata?.abstract;
            if (!abstract || abstract.trim().length === 0) {
                console.log('🏷️ No abstract found, showing input field');
                this.showAbstractInputState();
                return;
            }
            
            // Detect research fields
            await this.detectResearchFields(abstract);
            
        } catch (error) {
            console.error('Failed to load field step:', error);
            this.handleError(error, 'Failed to load research field detection');
        } finally {
            this.isLoading = false;
        }
    }
    
    async detectResearchFields(abstract) {
        try {
            const orkgService = this.getORKGService();
            const dataCache = this.getDataCache();
            
            if (!orkgService) {
                throw new Error('ORKG Service not available');
            }
            
            console.log('🏷️ Detecting research fields for abstract...');
            
            // Check cache first
            let fieldsData = null;
            if (dataCache) {
                fieldsData = dataCache.getResearchFieldData(abstract);
                if (fieldsData) {
                    console.log('🏷️ Using cached field detection results');
                    this.currentFields = fieldsData.fields;
                    this.renderFieldSelection();
                    return;
                }
            }
            
            // Show progress
            this.updateLoadingState('Calling ORKG NLP service...');
            
            // Call ORKG NLP service
            const response = await orkgService.findRelatedResearchField(abstract, 5);
            
            if (!response || !response.payload || !response.payload.annotations) {
                throw new Error('Invalid response from ORKG NLP service');
            }
            
            const fields = response.payload.annotations;
            console.log(`🏷️ Found ${fields.length} research fields`);
            
            // Enrich fields with ORKG IDs and URLs
            this.updateLoadingState('Enriching field information...');
            const enrichedFields = await this.enrichFieldsWithORKGInfo(fields);
            
            // Cache the results
            if (dataCache) {
                dataCache.setResearchFieldData(abstract, enrichedFields);
            }
            
            // Store in state
            const fieldData = {
                allFields: enrichedFields,
                selectedField: this.selectedField,
                abstract: abstract,
                timestamp: Date.now(),
                source: 'orkg_nlp'
            };
            
            const stateManager = this.getStateManager();
            if (stateManager) {
                stateManager.updateState('data.researchField', fieldData);
            }
            
            this.currentFields = enrichedFields;
            this.renderFieldSelection();
            
        } catch (error) {
            console.error('Field detection failed:', error);
            this.showErrorState(error);
            throw error;
        }
    }
    
    async enrichFieldsWithORKGInfo(fields) {
        const orkgService = this.getORKGService();
        const dataCache = this.getDataCache();
        const enrichedFields = [];
        
        console.log("NLP fields to enrich:", fields);
        
        for (const field of fields) {
            try {
                let fieldInfo = null;
                
                // Check cache for ORKG field info
                const cacheKey = `field_info_${orkgService?.hashString ? orkgService.hashString(field.research_field) : field.research_field}`;
                if (dataCache) {
                    fieldInfo = dataCache.get(cacheKey);
                }
                
                // Fetch from ORKG if not cached
                if (!fieldInfo && orkgService) {
                    fieldInfo = await orkgService.fetchResearchFieldInfo(field.research_field);
                }
                
                // Create enriched field object
                const enrichedField = {
                    label: field.research_field,
                    score: field.score,
                    id: fieldInfo?.id || null,
                    url: fieldInfo?.url || null,
                    hasORKGInfo: !!fieldInfo?.id,
                    orkgInfo: fieldInfo,
                    // Additional metadata from ORKG
                    shared: fieldInfo?.shared || 0,
                    verified: fieldInfo?.verified || false,
                    hasResearchFieldClass: fieldInfo?.hasResearchFieldClass || false
                };
                
                enrichedFields.push(enrichedField);
                
                console.log(`✅ Enriched field "${field.research_field}" with ID: ${enrichedField.id || 'none'}`);
                
            } catch (error) {
                console.warn(`Failed to enrich field "${field.research_field}":`, error);
                
                // Add field without ORKG info
                enrichedFields.push({
                    label: field.research_field,
                    score: field.score,
                    id: null,
                    url: null,
                    hasORKGInfo: false,
                    orkgInfo: null,
                    shared: 0,
                    verified: false,
                    hasResearchFieldClass: false
                });
            }
        }
        
        return enrichedFields;
    }
    
    renderFieldSelection() {
        if (!this.container || !this.currentFields) return;
        
        console.log('🎨 Rendering research field selection UI');
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2>
                        <i class="fas fa-tags"></i>
                        Research Field Selection
                    </h2>
                    <p>Select the research field that best matches your paper. This will help us find relevant research problems and templates.</p>
                </div>
                
                <div class="field-selection-content">
                    <!-- Field Comparison Notice (if changing from previous selection) -->
                    ${this.renderFieldComparisonNotice()}
                    
                    <!-- Research Fields Grid -->
                    <div class="card-grid" id="field-cards-container">
                        ${this.renderFieldCards()}
                    </div>
                </div>
            </div>
        `;
        
        this.setupFieldSelectionHandlers();
        this.setupTooltips();
        this.highlightSelectedField();
        
        // Hide loading state
        this.hideLoadingState();
    }
    
    renderFieldComparisonNotice() {
        if (!this.previouslySelectedField || !this.selectedField) {
            return '';
        }
        
        if (this.previouslySelectedField.label === this.selectedField.label) {
            return '';
        }
        
        return `
            <div class="field-comparison-notice">
                <div class="notice-card">
                    <div class="notice-header">
                        <i class="fas fa-exchange-alt"></i>
                        <h4>Field Change Impact</h4>
                    </div>
                    <div class="notice-content">
                        <div class="field-change-comparison">
                            <div class="field-change-item previous">
                                <span class="field-change-label">Previous:</span>
                                <span class="field-change-value">${this.escapeHtml(this.previouslySelectedField.label)}</span>
                            </div>
                            <div class="field-change-arrow">
                                <i class="fas fa-arrow-right"></i>
                            </div>
                            <div class="field-change-item current">
                                <span class="field-change-label">New:</span>
                                <span class="field-change-value">${this.escapeHtml(this.selectedField.label)}</span>
                            </div>
                        </div>
                        <div class="field-change-impact">
                            <p><strong>Impact:</strong> Changing the research field will reset your research problem analysis. The system will find new problems relevant to the selected field.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderFieldCards() {
        if (!this.currentFields || this.currentFields.length === 0) {
            return `
                <div class="empty-state-card">
                    <div class="empty-icon">
                        <i class="fas fa-tags"></i>
                    </div>
                    <h3>No Research Fields Found</h3>
                    <p>Unable to detect research fields for this paper. Please check the abstract or try again.</p>
                </div>
            `;
        }
        
        console.log(`🏷️ Rendering ${this.currentFields.length} research field cards`);
        
        return this.currentFields.map((field, index) => {
            const isSelected = this.selectedField && this.selectedField.label === field.label;
            const confidencePercentage = Math.round(field.score) * 10;  // Assuming score is between 0 and 1, convert to percentage
            const confidenceLevel = confidencePercentage >= 80 ? 'high' : confidencePercentage >= 60 ? 'medium' : 'low';
            
            // Debug log for field data
            console.log(`Field ${index}:`, {
                label: field.label,
                id: field.id,
                url: field.url,
                hasORKGInfo: field.hasORKGInfo
            });
            
            return `
                <div class="card field-card ${isSelected ? 'selected' : ''}" 
                    data-field-index="${index}"
                    data-field-label="${this.escapeHtml(field.label)}"
                    role="button"
                    tabindex="0"
                    aria-pressed="${isSelected}">
                    
                    <div class="card-header">
                        <h3>
                            <i class="fas fa-tag"></i>
                            ${this.escapeHtml(field.label)}
                        </h3>
                        <div class="field-badges">
                            <span class="badge confidence-${confidenceLevel}">
                                ${confidencePercentage}% Confidence
                            </span>
                            ${isSelected ? '<span class="badge badge-success">Selected</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="card-content">
                        <div class="field-details">
                            <div class="confidence-display">
                                <div class="confidence-bar">
                                    <div class="confidence-fill confidence-${confidenceLevel}" 
                                        style="width: ${confidencePercentage}%"></div>
                                </div>
                                <span class="confidence-text">
                                    Confidence: ${confidencePercentage}%
                                </span>
                            </div>
                            
                            <div class="field-actions">
                                ${field.id && field.url ? `
                                    <a href="${field.url}" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    class="orkg-link"
                                    onclick="event.stopPropagation()">
                                        <i class="fas fa-external-link-alt"></i>
                                        <span>View in ORKG</span>
                                    </a>
                                ` : `
                                    <button class="btn btn-sm btn-secondary retry-orkg-btn" 
                                            data-field-label="${this.escapeHtml(field.label)}"
                                            data-field-index="${index}"
                                            onclick="event.stopPropagation()">
                                        <i class="fas fa-refresh"></i>
                                        <span>Find ORKG Link</span>
                                    </button>
                                `}
                            </div>
                            
                            ${field.id ? `
                                <div class="field-metadata">
                                    <small class="text-secondary">
                                        <i class="fas fa-database"></i>
                                        ORKG ID: ${field.id}
                                    </small>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="selection-indicator">
                            <i class="fas fa-check-circle"></i>
                            <span>Selected</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    setupFieldSelectionHandlers() {
        // Field card selection
        const fieldCards = this.container.querySelectorAll('.field-card');
        fieldCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on links or buttons
                if (e.target.closest('a, button')) return;
                
                const fieldIndex = parseInt(card.getAttribute('data-field-index'));
                this.selectField(fieldIndex);
            });
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const fieldIndex = parseInt(card.getAttribute('data-field-index'));
                    this.selectField(fieldIndex);
                }
            });
        });
        
        // Retry ORKG buttons
        const retryButtons = this.container.querySelectorAll('.retry-orkg-btn');
        retryButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const fieldLabel = button.getAttribute('data-field-label');
                await this.retryORKGInfo(fieldLabel, button);
            });
        });
        
        // Register buttons with ButtonManager
        this.registerActionButtons();
    }
    
    registerActionButtons() {
        // No abstract-related buttons needed since abstract section is removed
        // Only field-card specific buttons (retry ORKG) are handled inline
    }
    
    selectField(fieldIndex) {
        if (!this.currentFields || fieldIndex < 0 || fieldIndex >= this.currentFields.length) {
            console.warn('Invalid field index:', fieldIndex);
            return;
        }
        
        const field = this.currentFields[fieldIndex];
        const previousField = this.selectedField;
        
        console.log(`🏷️ Selecting research field: ${field.label} (ID: ${field.id || 'none'})`);
        
        // Check if this is a change from a previously selected field
        const isFieldChange = previousField && previousField.label !== field.label;
        
        if (isFieldChange) {
            // Show field change impact and ask for confirmation
            this.showFieldChangeConfirmation(field, previousField);
            return;
        }
        
        // Select the field
        this.selectedField = field;
        
        // Update UI
        this.highlightSelectedField();
        
        // Update state with ID
        this.updateFieldDataInState();
        
        // Mark step as valid
        this.markStepAsValid(true);
        
        // Show success feedback with ID info
        const toastManager = this.getToastManager();
        if (toastManager) {
            const idInfo = field.id ? ` (ID: ${field.id})` : ' (No ORKG ID found)';
            toastManager.success(`Research field "${field.label}" selected${idInfo}`, 2000);
        }
        
        // Emit selection event with ID
        eventManager.emit('field:selected', {
            field: field,
            fieldId: field.id,
            previousField: previousField,
            previousFieldId: previousField?.id,
            timestamp: Date.now()
        });
    }
    
    async showFieldChangeConfirmation(newField, previousField) {
        const toastManager = this.getToastManager();
        
        if (!toastManager) {
            // Fallback to direct selection if no toast manager
            this.applyFieldChange(newField, previousField);
            return;
        }
        
        const message = `Changing from "${previousField.label}" to "${newField.label}" will reset your research problem analysis. Continue?`;
        
        const confirmed = await toastManager.showConfirmation(
            message,
            () => {
                this.applyFieldChange(newField, previousField);
            },
            () => {
                console.log('Field change cancelled by user');
            },
            'warning'
        );
    }
    
    applyFieldChange(newField, previousField) {
        console.log(`🏷️ Applying field change: ${previousField.label} → ${newField.label}`);
        
        // Update selected field
        this.selectedField = newField;
        
        // Update UI
        this.highlightSelectedField();
        
        // Update state
        this.updateFieldDataInState();
        
        // Invalidate subsequent steps
        const workflowState = this.getWorkflowState();
        if (workflowState && workflowState.invalidateStepsAfter) {
            workflowState.invalidateStepsAfter('field');
        }
        
        // Clear cached data for subsequent steps
        const dataCache = this.getDataCache();
        if (dataCache) {
            dataCache.clearByPrefix('problem_');
            dataCache.clearByPrefix('template_');
        }
        
        // Mark step as valid
        this.markStepAsValid(true);
        
        // Show success feedback
        const toastManager = this.getToastManager();
        if (toastManager) {
            toastManager.success(`Research field changed to "${newField.label}". Research problem analysis will be updated.`, 3000);
        }
        
        // Emit field change event
        eventManager.emit('field:changed', {
            newField: newField,
            previousField: previousField,
            timestamp: Date.now()
        });
    }
    
    highlightSelectedField() {
        const fieldCards = this.container.querySelectorAll('.field-card');
        
        fieldCards.forEach(card => {
            const fieldIndex = parseInt(card.getAttribute('data-field-index'));
            const field = this.currentFields[fieldIndex];
            const isSelected = this.selectedField && this.selectedField.label === field.label;
            
            // Update visual state
            card.classList.toggle('selected', isSelected);
            card.setAttribute('aria-pressed', isSelected);
            
            // Update selection indicator
            const indicator = card.querySelector('.selection-indicator');
            if (indicator) {
                indicator.style.display = isSelected ? 'flex' : 'none';
            }
            
            // Update badge
            const selectedBadge = card.querySelector('.badge-success');
            if (isSelected && !selectedBadge) {
                const badgesContainer = card.querySelector('.field-badges');
                if (badgesContainer) {
                    badgesContainer.insertAdjacentHTML('beforeend', '<span class="badge badge-success">Selected</span>');
                }
            } else if (!isSelected && selectedBadge) {
                selectedBadge.remove();
            }
        });
    }
    
    updateFieldDataInState() {
        const stateManager = this.getStateManager();
        if (!stateManager) return;
        
        const fieldData = {
            allFields: this.currentFields, // This now includes all IDs
            selectedField: this.selectedField, // This includes the selected field's ID
            selectedFieldId: this.selectedField?.id || null, // Explicitly store selected ID
            allFieldIds: this.currentFields?.map(f => ({
                label: f.label,
                id: f.id,
                hasORKGInfo: f.hasORKGInfo
            })) || [], // Store all field IDs for reference
            abstract: this.getAbstractText(),
            timestamp: Date.now(),
            source: 'orkg_nlp'
        };
        
        stateManager.updateState('data.researchField', fieldData);
        
        // Also update cache with the enriched field data
        const dataCache = this.getDataCache();
        if (dataCache && this.selectedField?.id) {
            // Cache the selected field ID mapping
            dataCache.set(`selected_field_${this.selectedField.label}`, {
                id: this.selectedField.id,
                url: this.selectedField.url,
                fullData: this.selectedField
            }, 3600000); // 1 hour cache
        }
        
        console.log(`🏷️ Field data updated in state with IDs:`, {
            selectedId: fieldData.selectedFieldId,
            allIds: fieldData.allFieldIds.map(f => f.id).filter(id => id !== null)
        });
    }
    
    async retryORKGInfo(fieldLabel, buttonElement) {
        const orkgService = this.getORKGService();
        const dataCache = this.getDataCache();
        
        if (!orkgService) {
            this.showError('ORKG Service not available');
            return;
        }
        
        // Store original HTML before modifying
        const originalHTML = buttonElement.innerHTML; // FIXED: Define originalHTML here
        
        try {
            // Show loading on button
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Retrying...</span>';
            buttonElement.disabled = true;
            
            console.log(`🏷️ Retrying ORKG info for field: ${fieldLabel}`);
            
            // Clear cache for this field
            if (dataCache) {
                const cacheKey = `field_info_${orkgService.hashString ? orkgService.hashString(fieldLabel) : fieldLabel}`;
                dataCache.delete(cacheKey);
            }
            
            // Fetch fresh ORKG info
            const fieldInfo = await orkgService.fetchResearchFieldInfo(fieldLabel);
            
            if (fieldInfo && fieldInfo.id) {
                // Update field data
                const field = this.currentFields.find(f => f.label === fieldLabel);
                if (field) {
                    field.id = fieldInfo.id;
                    field.url = fieldInfo.url;
                    field.hasORKGInfo = true;
                    field.orkgInfo = fieldInfo;
                    
                    // Update state
                    this.updateFieldDataInState();
                    
                    // Re-render to show the link
                    this.renderFieldSelection();
                    
                    const toastManager = this.getToastManager();
                    if (toastManager) {
                        toastManager.success(`ORKG link found for "${fieldLabel}"`, 2000);
                    }
                    
                    return;
                }
            }
            
            // If we get here, no ResearchField resource was found
            throw new Error('No ResearchField resource found in ORKG');
            
        } catch (error) {
            console.error('Failed to retry ORKG info:', error);
            
            // Restore button
            buttonElement.innerHTML = originalHTML; // Now originalHTML is defined
            buttonElement.disabled = false;
            
            const toastManager = this.getToastManager();
            if (toastManager) {
                toastManager.warning(`Could not find ORKG link for "${fieldLabel}"`, 3000);
            }
        }
    }
    
    setupTooltips() {
        // Setup tooltips for confidence info icons
        const tooltipElements = this.container.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            // Native browser tooltip via title attribute is already working
            // But we can enhance with custom tooltip behavior if needed
            element.addEventListener('mouseenter', (e) => {
                // Custom tooltip behavior can be added here if needed
                console.log('Tooltip shown for confidence info');
            });
        });
    }
    
    showAbstractEditor() {
        const currentAbstract = this.getAbstractText();
        
        // Create modal for abstract editing
        const modalHTML = `
            <div class="modal-overlay" id="abstract-editor-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-edit"></i> Edit Paper Abstract</h3>
                        <button class="modal-close" id="close-abstract-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="abstract-textarea">Paper Abstract:</label>
                            <textarea id="abstract-textarea" 
                                      class="form-control" 
                                      rows="10" 
                                      placeholder="Enter or paste the paper abstract here...">${this.escapeHtml(currentAbstract)}</textarea>
                            <div class="form-help">
                                <small class="text-secondary">
                                    The abstract is used to detect relevant research fields. 
                                    A good abstract will improve field detection accuracy.
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancel-abstract-edit">Cancel</button>
                        <button class="btn btn-primary" id="save-abstract-edit">
                            <i class="fas fa-save"></i>
                            <span>Save & Re-analyze</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup modal handlers
        this.setupAbstractEditorHandlers();
    }
    
    setupAbstractEditorHandlers() {
        const modal = document.getElementById('abstract-editor-modal');
        const closeBtn = document.getElementById('close-abstract-modal');
        const cancelBtn = document.getElementById('cancel-abstract-edit');
        const saveBtn = document.getElementById('save-abstract-edit');
        const textarea = document.getElementById('abstract-textarea');
        
        const closeModal = () => {
            if (modal) {
                modal.remove();
            }
        };
        
        // Close handlers
        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        
        // Click outside to close
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
        
        // Save handler
        saveBtn?.addEventListener('click', async () => {
            const newAbstract = textarea.value.trim();
            
            if (!newAbstract) {
                const toastManager = this.getToastManager();
                if (toastManager) {
                    toastManager.warning('Abstract cannot be empty');
                }
                return;
            }
            
            try {
                // Save abstract to user input
                this.userAbstract = newAbstract;
                
                // Update metadata in state
                const stateManager = this.getStateManager();
                if (stateManager) {
                    const metadata = stateManager.getState('data.metadata') || {};
                    metadata.abstract = newAbstract;
                    metadata.abstractSource = 'user_edited';
                    stateManager.updateState('data.metadata', metadata);
                }
                
                closeModal();
                
                // Re-analyze fields with new abstract
                await this.reanalyzeFields();
                
            } catch (error) {
                console.error('Failed to save abstract:', error);
                this.handleError(error, 'Failed to save abstract');
            }
        });
    }
    
    async reanalyzeFields() {
        try {
            const abstract = this.getAbstractText();
            
            if (!abstract || abstract.trim().length === 0) {
                const toastManager = this.getToastManager();
                if (toastManager) {
                    toastManager.warning('Abstract is required for field analysis');
                }
                return;
            }
            
            // Clear current selection
            this.selectedField = null;
            this.currentFields = null;
            
            // Show loading
            this.showLoadingState('Re-analyzing research fields...');
            
            // Clear cache for current abstract
            const dataCache = this.getDataCache();
            if (dataCache) {
                const cacheKey = `field_${dataCache.hashString(abstract)}`;
                dataCache.delete(cacheKey);
            }
            
            // Re-detect fields
            await this.detectResearchFields(abstract);
            
            // Mark step as invalid until user selects again
            this.markStepAsValid(false);
            
            const toastManager = this.getToastManager();
            if (toastManager) {
                toastManager.success('Research fields updated. Please select your preferred field.', 3000);
            }
            
        } catch (error) {
            console.error('Failed to re-analyze fields:', error);
            this.handleError(error, 'Failed to re-analyze research fields');
        }
    }
    
    getAbstractText() {
        // Priority: user input > metadata > empty
        if (this.userAbstract && this.userAbstract.trim().length > 0) {
            return this.userAbstract.trim();
        }
        
        const stateManager = this.getStateManager();
        const metadata = stateManager?.getState ? stateManager.getState('data.metadata') : null;
        
        if (metadata && metadata.abstract) {
            return metadata.abstract.trim();
        }
        
        return '';
    }
    
    showAbstractInputState() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2>
                        <i class="fas fa-tags"></i>
                        Research Field Detection
                    </h2>
                    <p>To detect relevant research fields, we need the paper's abstract. Please provide it below.</p>
                </div>
                
                <div class="abstract-input-section">
                    <div class="empty-state-card">
                        <div class="empty-icon">
                            <i class="fas fa-align-left"></i>
                        </div>
                        <h3>Abstract Required</h3>
                        <p>We couldn't find an abstract for this paper. Please paste the abstract below to detect relevant research fields.</p>
                        
                        <div class="abstract-input-form">
                            <div class="form-group">
                                <label for="user-abstract-input">Paper Abstract:</label>
                                <textarea id="user-abstract-input" 
                                          class="form-control" 
                                          rows="8" 
                                          placeholder="Paste the paper abstract here...">${this.escapeHtml(this.userAbstract)}</textarea>
                                <div class="form-help">
                                    <small class="text-secondary">
                                        <i class="fas fa-info-circle"></i>
                                        The abstract helps us identify the most relevant research fields for your paper.
                                    </small>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button class="btn btn-primary" id="analyze-abstract-btn" data-button-id="analyze-abstract-btn">
                                    <i class="fas fa-search"></i>
                                    <span>Analyze Research Fields</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupAbstractInputHandlers();
        this.markStepAsValid(false);
    }
    
    setupAbstractInputHandlers() {
        const textarea = this.container.querySelector('#user-abstract-input');
        const analyzeBtn = this.container.querySelector('#analyze-abstract-btn');
        
        // Real-time validation
        textarea?.addEventListener('input', (e) => {
            const hasText = e.target.value.trim().length > 0;
            if (analyzeBtn) {
                analyzeBtn.disabled = !hasText;
                analyzeBtn.classList.toggle('disabled', !hasText);
            }
        });
        
        // Register analyze button
        const contentManager = window.serviceManager?.getService('contentManager');
        const buttonManager = contentManager?.getButtonManager();
        
        if (buttonManager) {
            buttonManager.registerButton({
                id: 'analyze-abstract-btn',
                label: 'Analyze Research Fields',
                icon: 'fa-search',
                type: 'primary',
                handler: async () => {
                    const abstract = textarea.value.trim();
                    
                    if (!abstract) {
                        const toastManager = this.getToastManager();
                        if (toastManager) {
                            toastManager.warning('Please enter an abstract');
                        }
                        return;
                    }
                    
                    this.userAbstract = abstract;
                    await this.detectResearchFields(abstract);
                },
                validation: () => {
                    return textarea.value.trim().length > 0;
                },
                tooltip: 'Analyze the abstract to detect research fields'
            });
        }
        
        // Initial validation
        const hasText = textarea.value.trim().length > 0;
        if (analyzeBtn) {
            analyzeBtn.disabled = !hasText;
            analyzeBtn.classList.toggle('disabled', !hasText);
        }
    }
    
    showLoadingState(message = 'Loading...') {
        if (!this.container) return;
        
        this.loadingState = `
            <div class="step-container">
                <div class="step-header">
                    <h2>
                        <i class="fas fa-tags"></i>
                        Research Field Detection
                    </h2>
                    <p>Analyzing your paper to identify relevant research fields...</p>
                </div>
                
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <div class="loading-message">${this.escapeHtml(message)}</div>
                    <div class="loading-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="field-progress-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = this.loadingState;
        
        // Start progress animation
        this.animateProgress();
    }
    
    updateLoadingState(message) {
        const loadingMessage = this.container?.querySelector('.loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
    }
    
    hideLoadingState() {
        // Loading state is replaced by content in renderFieldSelection
        this.loadingState = null;
    }
    
    animateProgress() {
        const progressFill = this.container?.querySelector('#field-progress-fill');
        if (!progressFill) return;
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 90) progress = 90;
            
            progressFill.style.width = `${progress}%`;
            
            if (!this.isLoading || !this.container?.contains(progressFill)) {
                clearInterval(interval);
            }
        }, 500);
    }
    
    showErrorState(error) {
        if (!this.container) return;
        
        const errorMessage = error?.message || 'An error occurred while detecting research fields';
        
        this.container.innerHTML = `
            <div class="step-container">
                <div class="step-header">
                    <h2>
                        <i class="fas fa-exclamation-triangle"></i>
                        Research Field Detection Error
                    </h2>
                    <p>We encountered an issue while analyzing your paper's research field.</p>
                </div>
                
                <div class="error-state">
                    <div class="error-card">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3>Detection Failed</h3>
                        <p>${this.escapeHtml(errorMessage)}</p>
                        
                        <div class="error-actions">
                            <button class="btn btn-primary" id="retry-field-detection-btn" data-button-id="retry-field-detection-btn">
                                <i class="fas fa-refresh"></i>
                                <span>Retry Detection</span>
                            </button>
                            <button class="btn btn-secondary" id="edit-abstract-error-btn" data-button-id="edit-abstract-error-btn">
                                <i class="fas fa-edit"></i>
                                <span>Edit Abstract</span>
                            </button>
                        </div>
                        
                        <div class="error-details">
                            <details>
                                <summary>Technical Details</summary>
                                <pre>${this.escapeHtml(error?.stack || error?.toString() || 'No additional details available')}</pre>
                            </details>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupErrorHandlers();
        this.markStepAsValid(false);
    }
    
    setupErrorHandlers() {
        const contentManager = window.serviceManager?.getService('contentManager');
        const buttonManager = contentManager?.getButtonManager();
        
        if (buttonManager) {
            // Retry detection button
            buttonManager.registerButton({
                id: 'retry-field-detection-btn',
                label: 'Retry Detection',
                icon: 'fa-refresh',
                type: 'primary',
                handler: async () => {
                    const abstract = this.getAbstractText();
                    if (abstract) {
                        await this.detectResearchFields(abstract);
                    } else {
                        this.showAbstractInputState();
                    }
                },
                tooltip: 'Retry research field detection'
            });
            
            // Edit abstract button
            buttonManager.registerButton({
                id: 'edit-abstract-error-btn',
                label: 'Edit Abstract',
                icon: 'fa-edit',
                type: 'secondary',
                handler: () => this.showAbstractEditor(),
                tooltip: 'Edit the paper abstract'
            });
        }
    }
    
    handleError(error, context = 'Field detection') {
        console.error(`${context} error:`, error);
        
        // Use centralized error handler first
        const errorHandler = this.getErrorHandler();
        if (errorHandler) {
            errorHandler.handleError({
                type: 'field_detection_error',
                error: error,
                message: `${context}: ${error.message}`,
                context: context,
                timestamp: Date.now()
            });
        }
        
        // Show toast notification
        const toastManager = this.getToastManager();
        if (toastManager) {
            toastManager.error(`${context} failed: ${error.message}`, 5000);
        }
        
        // Show error state in UI
        this.showErrorState(error);
    }
    
    handleFieldDataUpdate(fieldData) {
        if (!fieldData) return;
        
        console.log('🏷️ Field data updated externally');
        
        this.currentFields = fieldData.allFields;
        this.selectedField = fieldData.selectedField;
        
        if (this.container && this.currentFields) {
            this.renderFieldSelection();
            this.markStepAsValid(!!this.selectedField);
        }
    }
    
    handleAbstractUpdate(abstract) {
        if (!abstract || this.userAbstract) return; // Don't override user input
        
        console.log('🏷️ Abstract updated externally');
        
        // If we don't have fields yet, try to detect them
        if (!this.currentFields) {
            this.detectResearchFields(abstract);
        }
    }
    
    markStepAsValid(isValid) {
        const workflowState = this.getWorkflowState();
        if (workflowState) {
            const errors = isValid ? [] : ['No research field selected'];
            workflowState.setStepValidation('field', isValid, errors);
            console.log(`🏷️ Field step marked as ${isValid ? 'valid' : 'invalid'}`);
        }
        
        // Emit validation event
        eventManager.emit('field:validation_changed', {
            isValid: isValid,
            selectedField: this.selectedField,
            timestamp: Date.now()
        });
    }
    
    // Utility methods
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    cleanText(text) {
        if (!text) return '';
        return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
    
    // Public API methods
    getSelectedField() {
        return this.selectedField;
    }
    
    getAllFields() {
        return this.currentFields;
    }
    
    hasSelection() {
        return !!this.selectedField;
    }
    
    isComplete() {
        return this.hasSelection();
    }
    
    getFieldData() {
        return {
            allFields: this.currentFields,
            selectedField: this.selectedField,
            abstract: this.getAbstractText(),
            timestamp: Date.now(),
            source: 'orkg_nlp'
        };
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            hasFields: !!this.currentFields,
            hasSelection: this.hasSelection(),
            isComplete: this.isComplete(),
            fieldsCount: this.currentFields?.length || 0,
            selectedFieldLabel: this.selectedField?.label || null,
            abstractLength: this.getAbstractText().length
        };
    }
    
    reset() {
        console.log('🔄 Resetting FieldStep...');
        
        // Clear selections and data
        this.selectedField = null;
        this.previouslySelectedField = null;
        this.currentFields = null;
        this.userAbstract = '';
        this.isLoading = false;
        
        // Clear from state
        const stateManager = this.getStateManager();
        if (stateManager) {
            stateManager.updateState('data.researchField', null);
            stateManager.updateState('workflow.stepCompletion.field', false);
        }
        
        // Mark as invalid
        this.markStepAsValid(false);
        
        // Clear cache
        const dataCache = this.getDataCache();
        if (dataCache) {
            dataCache.clearByPrefix('field_');
            dataCache.clearByPrefix('orkg_field_');
        }
        
        // Reload if container exists
        if (this.container) {
            this.load();
        }
    }
    
    refresh() {
        if (!this.isInitialized) return;
        
        // Re-render current state
        if (this.currentFields && this.container) {
            this.renderFieldSelection();
        } else if (this.container) {
            this.load();
        }
    }
    
    cleanup() {
        console.log('🧹 FieldStep cleanup...');
        
        // Cleanup event listeners
        this.cleanupEventListeners();
        
        // Remove any modals
        const modal = document.getElementById('abstract-editor-modal');
        if (modal) {
            modal.remove();
        }
        
        // Clear data
        this.selectedField = null;
        this.previouslySelectedField = null;
        this.currentFields = null;
        this.userAbstract = '';
        this.isLoading = false;
        this.loadingState = null;
        
        // Clear references
        this.container = null;
        this.fieldCardsContainer = null;
        this.abstractInput = null;
        this.retryButton = null;
        
        // Reset state
        this.isInitialized = false;
        
        console.log('✅ FieldStep cleanup completed');
    }
}
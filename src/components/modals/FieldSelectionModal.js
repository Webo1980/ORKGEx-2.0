// ================================
// src/components/modals/FieldSelectionModal.js - Complete Implementation
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class FieldSelectionModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.fields = [];
        this.currentField = null;
        this.callback = null;
        this.searchTerm = '';
        this.selectedFieldId = null;
    }
    
    show(fields, currentField, callback) {
        this.fields = fields || [];
        this.currentField = currentField;
        this.callback = callback;
        this.selectedFieldId = currentField?.id || currentField?.label;
        
        this.createModal();
        this.render();
        this.setupEventHandlers();
        this.open();
    }
    
    createModal() {
        // Remove existing modal if any
        if (this.modal) {
            this.modal.remove();
        }
        
        this.modal = document.createElement('div');
        this.modal.className = 'modal field-selection-modal';
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-labelledby', 'field-modal-title');
        this.modal.setAttribute('aria-modal', 'true');
    }
    
    render() {
        const filteredFields = this.filterFields();
        
        this.modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title" id="field-modal-title">
                        <i class="fas fa-tags"></i>
                        Change Research Field
                    </h2>
                    <button class="modal-close" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="field-search-container">
                        <div class="search-input-wrapper">
                            <i class="fas fa-search"></i>
                            <input 
                                type="text" 
                                class="field-search-input" 
                                placeholder="Search fields..." 
                                value="${this.searchTerm}"
                                aria-label="Search research fields"
                            >
                            ${this.searchTerm ? `
                                <button class="clear-search" aria-label="Clear search">
                                    <i class="fas fa-times-circle"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="search-results-count">
                            ${filteredFields.length} field${filteredFields.length !== 1 ? 's' : ''} found
                        </div>
                    </div>
                    
                    <div class="current-field-info">
                        <strong>Current Field:</strong> 
                        <span class="current-field-label">
                            ${this.currentField?.label || 'None selected'}
                        </span>
                    </div>
                    
                    <div class="fields-list">
                        ${filteredFields.length > 0 ? filteredFields.map(field => this.renderFieldCard(field)).join('') : `
                            <div class="no-fields-message">
                                <i class="fas fa-info-circle"></i>
                                <p>No fields found matching your search.</p>
                            </div>
                        `}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                    <button class="btn btn-primary modal-confirm" ${!this.selectedFieldId || this.selectedFieldId === (this.currentField?.id || this.currentField?.label) ? 'disabled' : ''}>
                        <i class="fas fa-check"></i>
                        Change Field
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }
    
    renderFieldCard(field) {
        const fieldId = field.id || field.label;
        const isSelected = fieldId === this.selectedFieldId;
        const isCurrent = fieldId === (this.currentField?.id || this.currentField?.label);
        
        return `
            <div class="field-card ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}" 
                 data-field-id="${fieldId}"
                 data-field-label="${field.label}"
                 role="button"
                 tabindex="0"
                 aria-selected="${isSelected}">
                <div class="field-card-content">
                    <div class="field-icon">
                        <i class="fas fa-tag"></i>
                    </div>
                    <div class="field-info">
                        <h4 class="field-name">${field.label}</h4>
                        ${field.description ? `
                            <p class="field-description">${field.description}</p>
                        ` : ''}
                        ${field.count !== undefined ? `
                            <span class="field-count">${field.count} papers</span>
                        ` : ''}
                    </div>
                    <div class="field-selection-indicator">
                        ${isCurrent ? `
                            <span class="current-badge">Current</span>
                        ` : isSelected ? `
                            <i class="fas fa-check-circle"></i>
                        ` : `
                            <i class="far fa-circle"></i>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
    
    filterFields() {
        if (!this.searchTerm) {
            return this.fields;
        }
        
        const term = this.searchTerm.toLowerCase();
        return this.fields.filter(field => {
            const label = (field.label || '').toLowerCase();
            const description = (field.description || '').toLowerCase();
            return label.includes(term) || description.includes(term);
        });
    }
    
    setupEventHandlers() {
        if (!this.modal) return;
        
        // Close button
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Overlay click
        const overlay = this.modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }
        
        // Search input
        const searchInput = this.modal.querySelector('.field-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.render();
                this.setupEventHandlers();
            });
            
            // Focus search input
            setTimeout(() => searchInput.focus(), 100);
        }
        
        // Clear search button
        const clearBtn = this.modal.querySelector('.clear-search');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.searchTerm = '';
                this.render();
                this.setupEventHandlers();
            });
        }
        
        // Field cards
        const fieldCards = this.modal.querySelectorAll('.field-card');
        fieldCards.forEach(card => {
            card.addEventListener('click', () => {
                const fieldId = card.dataset.fieldId;
                this.selectField(fieldId);
            });
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const fieldId = card.dataset.fieldId;
                    this.selectField(fieldId);
                }
            });
        });
        
        // Cancel button
        const cancelBtn = this.modal.querySelector('.modal-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }
        
        // Confirm button
        const confirmBtn = this.modal.querySelector('.modal-confirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirm());
        }
        
        // Keyboard navigation
        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }
    
    selectField(fieldId) {
        this.selectedFieldId = fieldId;
        
        // Update UI
        const fieldCards = this.modal.querySelectorAll('.field-card');
        fieldCards.forEach(card => {
            const isSelected = card.dataset.fieldId === fieldId;
            card.classList.toggle('selected', isSelected);
            card.setAttribute('aria-selected', isSelected);
        });
        
        // Update confirm button
        const confirmBtn = this.modal.querySelector('.modal-confirm');
        if (confirmBtn) {
            const isSameAsCurrent = fieldId === (this.currentField?.id || this.currentField?.label);
            confirmBtn.disabled = isSameAsCurrent;
        }
    }
    
    confirm() {
        if (!this.selectedFieldId || this.selectedFieldId === (this.currentField?.id || this.currentField?.label)) {
            return;
        }
        
        const selectedField = this.fields.find(f => 
            (f.id || f.label) === this.selectedFieldId
        );
        
        if (selectedField && this.callback) {
            this.callback(selectedField);
        }
        
        this.close();
    }
    
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        document.body.classList.add('modal-open');
        
        // Animate in
        requestAnimationFrame(() => {
            if (this.modal) {
                this.modal.classList.add('modal-show');
            }
        });
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        document.body.classList.remove('modal-open');
        
        if (this.modal) {
            this.modal.classList.remove('modal-show');
            
            // Remove after animation
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.parentNode.removeChild(this.modal);
                }
                this.modal = null;
            }, 300);
        }
        
        // Clear state
        this.fields = [];
        this.currentField = null;
        this.callback = null;
        this.searchTerm = '';
        this.selectedFieldId = null;
    }
    
    destroy() {
        this.close();
    }
}

export default FieldSelectionModal;
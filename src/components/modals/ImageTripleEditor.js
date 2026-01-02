// ================================
// src/components/modals/ImageTripleEditor.js - Complete Implementation
// ================================

import { BaseModal } from './BaseModal.js';

export class ImageTripleEditor extends BaseModal {
    constructor(imageData, analysisData, options = {}) {
        super({
            title: 'Image Analysis - Triple Editor',
            size: 'extra-large',
            className: 'image-triple-editor-modal',
            resizable: true,
            maximizable: true,
            closeOnEscape: false, // Prevent accidental closing
            closeOnOverlay: false,
            ...options
        });
        
        this.imageData = imageData;
        this.originalAnalysis = JSON.parse(JSON.stringify(analysisData)); // Deep clone
        this.modifiedAnalysis = JSON.parse(JSON.stringify(analysisData)); // Working copy
        this.modifiedTriples = [...(analysisData?.triples || [])];
        
        this.onSave = options.onSave;
        this.onCancel = options.onCancel;
        
        this.hasChanges = false;
        this.draggedItem = null;
        this.nextTripleId = this.modifiedTriples.length + 1;
        
        // Track editing state
        this.editingFields = new Map();
    }
    
    renderContent() {
        return `
            <div class="triple-editor-layout">
                <div class="editor-left-panel">
                    ${this.renderImageSection()}
                </div>
                <div class="editor-right-panel">
                    ${this.renderTriplesSection()}
                </div>
            </div>
        `;
    }
    
    renderFooter() {
        return `
            <div class="modal-footer">
                <div class="footer-left">
                    ${this.hasChanges ? `
                        <span class="unsaved-changes">
                            <i class="fas fa-exclamation-circle"></i>
                            Unsaved changes
                        </span>
                    ` : ''}
                </div>
                <div class="footer-right">
                    <button class="btn btn-secondary" id="cancel-triple-editor">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                    <button class="btn btn-primary" id="save-triple-editor" ${!this.hasChanges ? 'disabled' : ''}>
                        <i class="fas fa-save"></i>
                        Save Changes
                    </button>
                </div>
            </div>
        `;
    }
    
    renderImageSection() {
        return `
            <div class="image-section">
                <div class="editor-image-container">
                    <img src="${this.imageData.src}" 
                         alt="${this.escapeHtml(this.imageData.alt || 'Image')}"
                         class="editor-image"
                         id="editor-image">
                    <button class="fullscreen-image-btn" title="View fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
                ${this.renderImageInfo()}
            </div>
        `;
    }
    
    renderImageInfo() {
        const analysis = this.modifiedAnalysis;
        
        return `
            <div class="editor-image-info">
                <div class="info-card">
                    <div class="info-header">
                        <i class="fas fa-info-circle"></i>
                        <h4>Image Information</h4>
                    </div>
                    <div class="info-content">
                        <div class="info-item">
                            <strong>Type:</strong> 
                            <span class="badge badge-${analysis?.type || 'unknown'}">${analysis?.type || 'Unknown'}</span>
                        </div>
                        
                        ${analysis?.description ? `
                            <div class="info-item">
                                <strong>Description:</strong>
                                <p>${this.escapeHtml(analysis.description)}</p>
                            </div>
                        ` : ''}
                        
                        ${analysis?.insights?.mainFinding ? `
                            <div class="info-item">
                                <strong>Main Finding:</strong>
                                <p>${this.escapeHtml(analysis.insights.mainFinding)}</p>
                            </div>
                        ` : ''}
                        
                        ${analysis?.quality ? `
                            <div class="info-item">
                                <strong>Analysis Quality:</strong>
                                <div class="quality-indicator">
                                    <div class="quality-bar">
                                        <div class="quality-fill" style="width: ${(analysis.quality.confidence || 0) * 100}%"></div>
                                    </div>
                                    <span>${Math.round((analysis.quality.confidence || 0) * 100)}% confidence</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="info-item">
                            <strong>Statistics:</strong>
                            <div class="stats-grid">
                                <div class="stat-item">
                                    <span class="stat-value">${this.modifiedTriples.length}</span>
                                    <span class="stat-label">Total Triples</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">${this.modifiedTriples.filter(t => !t.isManual).length}</span>
                                    <span class="stat-label">AI Generated</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value">${this.modifiedTriples.filter(t => t.isManual).length}</span>
                                    <span class="stat-label">Manual</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderTriplesSection() {
        return `
            <div class="triples-section">
                <div class="triples-header">
                    <h4>
                        <i class="fas fa-project-diagram"></i>
                        Knowledge Triples
                    </h4>
                    <div class="triple-actions">
                        <button class="btn btn-sm btn-secondary" id="revert-all-triples" 
                                ${!this.hasChanges ? 'disabled' : ''}>
                            <i class="fas fa-undo"></i>
                            Revert All
                        </button>
                        <button class="btn btn-sm btn-primary" id="add-new-triple">
                            <i class="fas fa-plus"></i>
                            Add Triple
                        </button>
                    </div>
                </div>
                
                <div class="triples-container">
                    <div class="triples-list" id="triples-list">
                        ${this.renderTriples()}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderTriples() {
        if (this.modifiedTriples.length === 0) {
            return `
                <div class="no-triples">
                    <i class="fas fa-info-circle"></i>
                    <h4>No Triples Found</h4>
                    <p>No knowledge triples have been extracted yet.</p>
                    <p>Click "Add Triple" to create triples manually.</p>
                </div>
            `;
        }
        
        return this.modifiedTriples.map((triple, index) => `
            <div class="triple-item ${triple.isManual ? 'manual' : 'ai-generated'} ${triple.isNew ? 'new-triple' : ''}" 
                 data-triple-index="${index}" 
                 draggable="true">
                
                <div class="triple-drag-handle" title="Drag to reorder">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                
                <div class="triple-number">${index + 1}</div>
                
                <div class="triple-content">
                    <div class="triple-field subject-field">
                        <label>Subject</label>
                        <div class="editable-field" 
                             contenteditable="true"
                             data-field="subject"
                             data-index="${index}"
                             data-original="${this.escapeHtml(triple.subject)}"
                             spellcheck="false">
                            ${this.escapeHtml(triple.subject)}
                        </div>
                    </div>
                    
                    <div class="triple-arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    
                    <div class="triple-field predicate-field">
                        <label>Predicate</label>
                        <div class="editable-field predicate-highlight" 
                             contenteditable="true"
                             data-field="predicate"
                             data-index="${index}"
                             data-original="${this.escapeHtml(triple.predicate)}"
                             spellcheck="false">
                            ${this.escapeHtml(triple.predicate)}
                        </div>
                    </div>
                    
                    <div class="triple-arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    
                    <div class="triple-field object-field">
                        <label>Object</label>
                        <div class="editable-field" 
                             contenteditable="true"
                             data-field="object"
                             data-index="${index}"
                             data-original="${this.escapeHtml(triple.object)}"
                             spellcheck="false">
                            ${this.escapeHtml(triple.object)}
                        </div>
                    </div>
                </div>
                
                <div class="triple-meta">
                    ${triple.isManual ? 
                        `<span class="badge badge-manual">
                            <i class="fas fa-user"></i> Manual
                        </span>` : 
                        `<span class="confidence-badge" title="AI Confidence">
                            <i class="fas fa-robot"></i>
                            ${Math.round((triple.confidence || 0) * 100)}%
                        </span>`
                    }
                    ${triple.isNew ? 
                        `<span class="badge badge-new">New</span>` : ''
                    }
                    ${triple.isModified ? 
                        `<span class="badge badge-modified">Modified</span>` : ''
                    }
                </div>
                
                <button class="btn-icon delete-triple-btn" 
                        data-index="${index}"
                        title="Delete Triple">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
    
    open() {
        super.open();
        this.attachEditorHandlers();
        this.checkForChanges();
    }
    
    attachEditorHandlers() {
        // Cancel button
        const cancelBtn = this.modal?.querySelector('#cancel-triple-editor');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.handleCancel());
        }
        
        // Save button
        const saveBtn = this.modal?.querySelector('#save-triple-editor');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSave());
        }
        
        // Add new triple
        const addBtn = this.modal?.querySelector('#add-new-triple');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addNewTriple();
                this.updateTriplesList();
                this.markAsChanged();
            });
        }
        
        // Revert all button
        const revertBtn = this.modal?.querySelector('#revert-all-triples');
        if (revertBtn) {
            revertBtn.addEventListener('click', () => this.revertAllChanges());
        }
        
        // Fullscreen image
        const fullscreenBtn = this.modal?.querySelector('.fullscreen-image-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.showFullscreenImage());
        }
        
        // Close button override to check for changes
        const closeBtn = this.modal?.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.removeEventListener('click', this.close);
            closeBtn.addEventListener('click', () => this.handleCancel());
        }
        
        // Setup triple interactions
        this.setupTripleInteractions();
    }
    
    setupTripleInteractions() {
        // Editable fields
        this.modal?.querySelectorAll('.editable-field').forEach(field => {
            field.addEventListener('focus', () => {
                field.classList.add('editing');
                this.editingFields.set(field, field.textContent);
            });
            
            field.addEventListener('blur', () => {
                field.classList.remove('editing');
                const originalValue = this.editingFields.get(field);
                if (originalValue !== field.textContent) {
                    this.updateTripleField(field);
                    this.markAsChanged();
                }
                this.editingFields.delete(field);
            });
            
            field.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    field.blur();
                }
                if (e.key === 'Escape') {
                    const originalValue = this.editingFields.get(field);
                    if (originalValue !== undefined) {
                        field.textContent = originalValue;
                    }
                    field.blur();
                }
            });
        });
        
        // Delete buttons
        this.modal?.querySelectorAll('.delete-triple-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.deleteTriple(index);
                this.updateTriplesList();
                this.markAsChanged();
            });
        });
        
        // Drag and drop
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        const tripleItems = this.modal?.querySelectorAll('.triple-item');
        
        tripleItems?.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            item.addEventListener('dragend', () => {
                if (this.draggedItem) {
                    this.draggedItem.classList.remove('dragging');
                    this.draggedItem = null;
                }
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (this.draggedItem && this.draggedItem !== item) {
                    const rect = item.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    
                    item.classList.remove('drag-over-top', 'drag-over-bottom');
                    
                    if (e.clientY < midpoint) {
                        item.classList.add('drag-over-top');
                    } else {
                        item.classList.add('drag-over-bottom');
                    }
                }
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over-top', 'drag-over-bottom');
                
                if (this.draggedItem && this.draggedItem !== item) {
                    this.reorderTriples(this.draggedItem, item, e);
                    this.updateTriplesList();
                    this.markAsChanged();
                }
            });
        });
    }
    
    showFullscreenImage() {
        const fullscreenModal = document.createElement('div');
        fullscreenModal.className = 'fullscreen-image-modal';
        fullscreenModal.innerHTML = `
            <div class="fullscreen-image-container">
                <img src="${this.imageData.src}" alt="${this.escapeHtml(this.imageData.alt || 'Image')}">
                <button class="fullscreen-close">
                    <i class="fas fa-times"></i>
                </button>
                <div class="fullscreen-info">
                    <span>${this.escapeHtml(this.imageData.alt || 'Full resolution image')}</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(fullscreenModal);
        
        // Add fade-in animation
        requestAnimationFrame(() => {
            fullscreenModal.classList.add('show');
        });
        
        const closeFullscreen = () => {
            fullscreenModal.classList.remove('show');
            setTimeout(() => {
                fullscreenModal.remove();
            }, 300);
        };
        
        fullscreenModal.querySelector('.fullscreen-close').addEventListener('click', closeFullscreen);
        fullscreenModal.addEventListener('click', (e) => {
            if (e.target === fullscreenModal) {
                closeFullscreen();
            }
        });
        
        // Close on escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeFullscreen();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    updateTripleField(field) {
        const index = parseInt(field.dataset.index);
        const fieldName = field.dataset.field;
        const value = field.textContent.trim();
        
        if (this.modifiedTriples[index]) {
            this.modifiedTriples[index][fieldName] = value;
            this.modifiedTriples[index].isModified = true;
        }
    }
    
    addNewTriple() {
        const newTriple = {
            subject: 'New Subject',
            predicate: 'has_property',
            object: 'New Object',
            confidence: 1.0,
            isManual: true,
            isNew: true,
            id: `new_${this.nextTripleId++}`
        };
        
        this.modifiedTriples.push(newTriple);
    }
    
    deleteTriple(index) {
        if (index >= 0 && index < this.modifiedTriples.length) {
            this.modifiedTriples.splice(index, 1);
        }
    }
    
    reorderTriples(draggedItem, targetItem, event) {
        const draggedIndex = parseInt(draggedItem.dataset.tripleIndex);
        const targetIndex = parseInt(targetItem.dataset.tripleIndex);
        
        if (draggedIndex !== targetIndex) {
            const [removed] = this.modifiedTriples.splice(draggedIndex, 1);
            
            // Determine if we should insert before or after
            const rect = targetItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const insertBefore = event.clientY < midpoint;
            
            const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
            const adjustedIndex = draggedIndex < targetIndex ? insertIndex - 1 : insertIndex;
            
            this.modifiedTriples.splice(adjustedIndex, 0, removed);
        }
    }
    
    updateTriplesList() {
        const triplesList = this.modal?.querySelector('#triples-list');
        if (triplesList) {
            triplesList.innerHTML = this.renderTriples();
            this.setupTripleInteractions();
        }
        
        // Update statistics
        this.updateStatistics();
    }
    
    updateStatistics() {
        const statsContainer = this.modal?.querySelector('.stats-grid');
        if (statsContainer) {
            const totalTriples = this.modifiedTriples.length;
            const aiTriples = this.modifiedTriples.filter(t => !t.isManual).length;
            const manualTriples = this.modifiedTriples.filter(t => t.isManual).length;
            
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <span class="stat-value">${totalTriples}</span>
                    <span class="stat-label">Total Triples</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${aiTriples}</span>
                    <span class="stat-label">AI Generated</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${manualTriples}</span>
                    <span class="stat-label">Manual</span>
                </div>
            `;
        }
    }
    
    markAsChanged() {
        this.hasChanges = true;
        this.updateFooter();
    }
    
    checkForChanges() {
        // Compare current triples with original
        const currentJSON = JSON.stringify(this.modifiedTriples);
        const originalJSON = JSON.stringify(this.originalAnalysis.triples || []);
        
        this.hasChanges = currentJSON !== originalJSON;
        this.updateFooter();
    }
    
    updateFooter() {
        const footer = this.modal?.querySelector('.modal-footer');
        if (footer) {
            footer.innerHTML = this.renderFooter();
            
            // Re-attach footer handlers
            const cancelBtn = footer.querySelector('#cancel-triple-editor');
            const saveBtn = footer.querySelector('#save-triple-editor');
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.handleCancel());
            }
            
            if (saveBtn) {
                saveBtn.addEventListener('click', () => this.handleSave());
            }
        }
    }
    
    revertAllChanges() {
        if (confirm('Are you sure you want to revert all changes? This cannot be undone.')) {
            this.modifiedTriples = JSON.parse(JSON.stringify(this.originalAnalysis.triples || []));
            this.modifiedAnalysis = JSON.parse(JSON.stringify(this.originalAnalysis));
            this.hasChanges = false;
            this.updateTriplesList();
            this.updateFooter();
        }
    }
    
    handleCancel() {
        if (this.hasChanges) {
            if (confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
                if (this.onCancel) {
                    this.onCancel();
                }
                this.close();
            }
        } else {
            if (this.onCancel) {
                this.onCancel();
            }
            this.close();
        }
    }
    
    handleSave() {
        // Update the analysis with modified triples
        this.modifiedAnalysis.triples = this.modifiedTriples;
        this.modifiedAnalysis.modified = true;
        this.modifiedAnalysis.modifiedAt = new Date().toISOString();
        
        // Remove temporary flags
        this.modifiedTriples.forEach(triple => {
            delete triple.isNew;
            delete triple.isModified;
        });
        
        if (this.onSave) {
            this.onSave(this.imageData.id, this.modifiedAnalysis);
        }
        
        this.hasChanges = false;
        this.close();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

export default ImageTripleEditor;
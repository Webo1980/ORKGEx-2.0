// ================================
// src/core/content/editors/ImageTripleEditor.js
// ================================

import { eventManager } from '../../../utils/eventManager.js';

export class ImageTripleEditor {
    constructor(imageData, analysisData, options = {}) {
        this.imageData = imageData;
        this.analysisData = analysisData;
        this.modifiedTriples = [...(analysisData?.triples || [])];
        
        this.onSave = options.onSave;
        this.onClose = options.onClose;
        
        this.isEditing = false;
        this.draggedItem = null;
        this.nextTripleId = this.modifiedTriples.length + 1;
    }
    
    render() {
        return `
            <div class="triple-editor-modal">
                <div class="triple-editor-container">
                    <div class="triple-editor-header">
                        <h3>Image Analysis - Triple Editor</h3>
                        <button class="close-btn" id="close-triple-editor">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="triple-editor-body">
                        <div class="image-section">
                            ${this.renderImagePreview()}
                            ${this.renderImageInfo()}
                        </div>
                        
                        <div class="triples-section">
                            <div class="triples-header">
                                <h4>Extracted Triples</h4>
                                <button class="btn btn-sm btn-primary" id="add-new-triple">
                                    <i class="fas fa-plus"></i>
                                    Add Triple
                                </button>
                            </div>
                            
                            <div class="triples-list" id="triples-list">
                                ${this.renderTriples()}
                            </div>
                        </div>
                    </div>
                    
                    <div class="triple-editor-footer">
                        <button class="btn btn-secondary" id="cancel-triple-editor">
                            Cancel
                        </button>
                        <button class="btn btn-primary" id="save-triple-editor">
                            <i class="fas fa-save"></i>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderImagePreview() {
        return `
            <div class="editor-image-preview">
                <img src="${this.imageData.src}" 
                     alt="${this.imageData.alt || 'Image'}"
                     class="editor-image">
            </div>
        `;
    }
    
    renderImageInfo() {
        const analysis = this.analysisData;
        
        return `
            <div class="editor-image-info">
                <div class="info-item">
                    <strong>Type:</strong> ${analysis?.type || 'Unknown'}
                </div>
                <div class="info-item">
                    <strong>Description:</strong>
                    <p>${analysis?.description || 'No description available'}</p>
                </div>
                ${analysis?.insights?.mainFinding ? `
                    <div class="info-item">
                        <strong>Main Finding:</strong>
                        <p>${analysis.insights.mainFinding}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    renderTriples() {
        if (this.modifiedTriples.length === 0) {
            return `
                <div class="no-triples">
                    <i class="fas fa-info-circle"></i>
                    <p>No triples extracted. Add triples manually using the button above.</p>
                </div>
            `;
        }
        
        return this.modifiedTriples.map((triple, index) => `
            <div class="triple-item" data-triple-index="${index}" draggable="true">
                <div class="triple-drag-handle">
                    <i class="fas fa-grip-vertical"></i>
                </div>
                
                <div class="triple-content">
                    <div class="triple-field subject-field">
                        <label>Subject</label>
                        <div class="editable-field" 
                             contenteditable="true"
                             data-field="subject"
                             data-index="${index}">
                            ${this.escapeHtml(triple.subject)}
                        </div>
                    </div>
                    
                    <div class="triple-arrow">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    
                    <div class="triple-field predicate-field">
                        <label>Predicate</label>
                        <div class="editable-field predicate-circle" 
                             contenteditable="true"
                             data-field="predicate"
                             data-index="${index}">
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
                             data-index="${index}">
                            ${this.escapeHtml(triple.object)}
                        </div>
                    </div>
                </div>
                
                <div class="triple-actions">
                    <span class="confidence-badge">
                        ${((triple.confidence || 0) * 100).toFixed(0)}%
                    </span>
                    <button class="btn-icon delete-triple-btn" 
                            data-index="${index}"
                            title="Delete Triple">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    attachEventHandlers(container) {
        // Close button
        const closeBtn = container.querySelector('#close-triple-editor');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (this.onClose) this.onClose();
            });
        }
        
        // Cancel button
        const cancelBtn = container.querySelector('#cancel-triple-editor');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (this.onClose) this.onClose();
            });
        }
        
        // Save button
        const saveBtn = container.querySelector('#save-triple-editor');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveChanges();
            });
        }
        
        // Add new triple button
        const addBtn = container.querySelector('#add-new-triple');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addNewTriple();
                this.updateTriplesList(container);
            });
        }
        
        // Editable fields
        container.querySelectorAll('.editable-field').forEach(field => {
            field.addEventListener('blur', () => {
                this.updateTripleField(field);
            });
            
            field.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    field.blur();
                }
            });
        });
        
        // Delete buttons
        container.querySelectorAll('.delete-triple-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.deleteTriple(index);
                this.updateTriplesList(container);
            });
        });
        
        // Drag and drop
        this.setupDragAndDrop(container);
    }
    
    setupDragAndDrop(container) {
        const tripleItems = container.querySelectorAll('.triple-item');
        
        tripleItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedItem = item;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.innerHTML);
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
                    
                    if (e.clientY < midpoint) {
                        item.classList.add('drag-over-top');
                        item.classList.remove('drag-over-bottom');
                    } else {
                        item.classList.add('drag-over-bottom');
                        item.classList.remove('drag-over-top');
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
                    this.reorderTriples(this.draggedItem, item);
                    this.updateTriplesList(container);
                }
            });
        });
    }
    
    updateTripleField(field) {
        const index = parseInt(field.dataset.index);
        const fieldName = field.dataset.field;
        const value = field.textContent.trim();
        
        if (this.modifiedTriples[index]) {
            this.modifiedTriples[index][fieldName] = value;
        }
    }
    
    addNewTriple() {
        const newTriple = {
            subject: 'New Subject',
            predicate: 'has_property',
            object: 'New Object',
            confidence: 0.5,
            isManual: true
        };
        
        this.modifiedTriples.push(newTriple);
        this.nextTripleId++;
    }
    
    deleteTriple(index) {
        this.modifiedTriples.splice(index, 1);
    }
    
    reorderTriples(draggedItem, targetItem) {
        const draggedIndex = parseInt(draggedItem.dataset.tripleIndex);
        const targetIndex = parseInt(targetItem.dataset.tripleIndex);
        
        if (draggedIndex !== targetIndex) {
            const [removed] = this.modifiedTriples.splice(draggedIndex, 1);
            this.modifiedTriples.splice(targetIndex, 0, removed);
        }
    }
    
    updateTriplesList(container) {
        const triplesList = container.querySelector('#triples-list');
        if (triplesList) {
            triplesList.innerHTML = this.renderTriples();
            this.attachEventHandlers(container);
        }
    }
    
    saveChanges() {
        const updatedAnalysis = {
            ...this.analysisData,
            triples: this.modifiedTriples,
            modified: true,
            modifiedAt: new Date().toISOString()
        };
        
        if (this.onSave) {
            this.onSave(this.imageData.id, updatedAnalysis);
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

export default ImageTripleEditor;
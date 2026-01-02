import { eventManager } from '../../../utils/eventManager.js';

export class TemplateEditor {
    constructor() {
        this.container = null;
        this.template = null;
        this.isEditing = false;
        this.originalTemplate = null;
        this.validationErrors = {};
        
        // Bind methods
        this.handlePropertyChange = this.handlePropertyChange.bind(this);
        this.handleTemplateFieldChange = this.handleTemplateFieldChange.bind(this);
        this.addProperty = this.addProperty.bind(this);
        this.deleteProperty = this.deleteProperty.bind(this);
    }
    
    init(container, template, isAIGenerated = false) {
        this.container = container;
        this.template = JSON.parse(JSON.stringify(template)); // Deep clone
        this.originalTemplate = JSON.parse(JSON.stringify(template));
        this.isAIGenerated = isAIGenerated;
        this.render();
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="template-editor">
                <div class="template-header">
                    <div class="template-title-section">
                        <input 
                            type="text" 
                            class="template-title-input" 
                            id="template-title"
                            value="${this.escapeHtml(this.template.name || '')}"
                            placeholder="Template Title"
                        />
                        ${this.isAIGenerated ? '<span class="ai-badge">AI Generated</span>' : ''}
                    </div>
                    <div class="template-actions">
                        ${!this.isAIGenerated ? `
                            <a href="${this.getORKGEditUrl()}" 
                               target="_blank" 
                               class="orkg-edit-link">
                                <i class="fas fa-external-link-alt"></i>
                                Edit in ORKG
                            </a>
                        ` : ''}
                    </div>
                </div>
                
                <div class="template-description-section">
                    <label for="template-description">Description</label>
                    <textarea 
                        id="template-description"
                        class="template-description-input"
                        rows="3"
                        placeholder="Template description..."
                    >${this.escapeHtml(this.template.description || '')}</textarea>
                </div>
                
                <div class="template-properties-section">
                    <div class="properties-header">
                        <h4>Properties</h4>
                        <button class="btn btn-sm btn-primary" id="add-property-btn">
                            <i class="fas fa-plus"></i> Add Property
                        </button>
                    </div>
                    
                    <div class="properties-table-container">
                        ${this.renderPropertiesTable()}
                    </div>
                </div>
                
                <div class="template-footer">
                    <div class="template-stats">
                        <span class="stat-item">
                            <i class="fas fa-list"></i>
                            ${this.template.properties?.length || 0} Properties
                        </span>
                        ${!this.isAIGenerated && this.template.usageCount ? `
                            <span class="stat-item">
                                <i class="fas fa-file-alt"></i>
                                Used in ${this.template.usageCount} papers
                            </span>
                        ` : ''}
                    </div>
                    <button class="btn btn-success" id="save-template-btn">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    renderPropertiesTable() {
        if (!this.template.properties || this.template.properties.length === 0) {
            return `
                <div class="empty-properties">
                    <i class="fas fa-inbox"></i>
                    <p>No properties defined</p>
                    <small>Click "Add Property" to create a new property</small>
                </div>
            `;
        }
        
        return `
            <table class="properties-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Required</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.template.properties.map(prop => this.renderPropertyRow(prop)).join('')}
                </tbody>
            </table>
        `;
    }
    
    renderPropertyRow(property) {
        const hasError = this.validationErrors[property.id];
        
        return `
            <tr data-property-id="${property.id}" class="${hasError ? 'has-error' : ''}">
                <td>
                    <input 
                        type="text" 
                        class="property-field property-name"
                        data-field="label"
                        value="${this.escapeHtml(property.label || '')}"
                        placeholder="Property name"
                    />
                    ${hasError?.label ? `<span class="error-text">${hasError.label}</span>` : ''}
                </td>
                <td>
                    <input 
                        type="text" 
                        class="property-field property-description"
                        data-field="description"
                        value="${this.escapeHtml(property.description || '')}"
                        placeholder="Description"
                    />
                </td>
                <td>
                    <select class="property-field property-type" data-field="type">
                        <option value="text" ${property.type === 'text' ? 'selected' : ''}>Text</option>
                        <option value="number" ${property.type === 'number' ? 'selected' : ''}>Number</option>
                        <option value="date" ${property.type === 'date' ? 'selected' : ''}>Date</option>
                        <option value="boolean" ${property.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                        <option value="url" ${property.type === 'url' ? 'selected' : ''}>URL</option>
                        <option value="resource" ${property.type === 'resource' ? 'selected' : ''}>Resource</option>
                    </select>
                </td>
                <td>
                    <input 
                        type="checkbox" 
                        class="property-field property-required"
                        data-field="required"
                        ${property.required ? 'checked' : ''}
                    />
                </td>
                <td>
                    <button class="btn-icon delete-property-btn" data-property-id="${property.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    
    attachEventListeners() {
        // Template field changes
        const titleInput = this.container.querySelector('#template-title');
        if (titleInput) {
            titleInput.addEventListener('input', (e) => {
                this.handleTemplateFieldChange('name', e.target.value);
            });
        }
        
        const descInput = this.container.querySelector('#template-description');
        if (descInput) {
            descInput.addEventListener('input', (e) => {
                this.handleTemplateFieldChange('description', e.target.value);
            });
        }
        
        // Property field changes
        const propertyFields = this.container.querySelectorAll('.property-field');
        propertyFields.forEach(field => {
            const row = field.closest('tr');
            const propertyId = row?.dataset.propertyId;
            const fieldName = field.dataset.field;
            
            if (propertyId && fieldName) {
                if (field.type === 'checkbox') {
                    field.addEventListener('change', (e) => {
                        this.handlePropertyChange(propertyId, fieldName, e.target.checked);
                    });
                } else {
                    field.addEventListener('input', (e) => {
                        this.handlePropertyChange(propertyId, fieldName, e.target.value);
                    });
                }
            }
        });
        
        // Add property button
        const addBtn = this.container.querySelector('#add-property-btn');
        if (addBtn) {
            addBtn.addEventListener('click', this.addProperty);
        }
        
        // Delete property buttons
        const deleteButtons = this.container.querySelectorAll('.delete-property-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const propertyId = btn.dataset.propertyId;
                if (propertyId) {
                    this.deleteProperty(propertyId);
                }
            });
        });
        
        // Save button
        const saveBtn = this.container.querySelector('#save-template-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveTemplate());
        }
    }
    
    handleTemplateFieldChange(field, value) {
        this.template[field] = value;
        this.markAsModified();
    }
    
    handlePropertyChange(propertyId, field, value) {
        const property = this.template.properties.find(p => p.id === propertyId);
        if (property) {
            property[field] = value;
            this.validateProperty(property);
            this.markAsModified();
        }
    }
    
    addProperty() {
        const newProperty = {
            id: `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            label: '',
            description: '',
            type: 'text',
            required: false
        };
        
        if (!this.template.properties) {
            this.template.properties = [];
        }
        
        this.template.properties.push(newProperty);
        this.render();
        
        // Focus on the new property's name field
        setTimeout(() => {
            const newRow = this.container.querySelector(`tr[data-property-id="${newProperty.id}"]`);
            if (newRow) {
                const nameInput = newRow.querySelector('.property-name');
                if (nameInput) {
                    nameInput.focus();
                }
            }
        }, 100);
    }
    
    deleteProperty(propertyId) {
        const index = this.template.properties.findIndex(p => p.id === propertyId);
        if (index !== -1) {
            this.template.properties.splice(index, 1);
            delete this.validationErrors[propertyId];
            this.render();
        }
    }
    
    validateProperty(property) {
        const errors = {};
        
        if (!property.label || property.label.trim() === '') {
            errors.label = 'Property name is required';
        }
        
        if (errors.label) {
            this.validationErrors[property.id] = errors;
        } else {
            delete this.validationErrors[property.id];
        }
        
        return Object.keys(errors).length === 0;
    }
    
    validateTemplate() {
        let isValid = true;
        
        // Validate template fields
        if (!this.template.name || this.template.name.trim() === '') {
            isValid = false;
            this.showError('Template name is required');
        }
        
        // Validate all properties
        if (this.template.properties) {
            this.template.properties.forEach(prop => {
                if (!this.validateProperty(prop)) {
                    isValid = false;
                }
            });
        }
        
        return isValid;
    }
    
    saveTemplate() {
        if (!this.validateTemplate()) {
            this.render(); // Re-render to show validation errors
            return;
        }
        
        // Emit save event
        eventManager.emit('template:saved', {
            template: this.template,
            isAIGenerated: this.isAIGenerated,
            changes: this.getChanges()
        });
        
        // Update original template
        this.originalTemplate = JSON.parse(JSON.stringify(this.template));
        
        this.showSuccess('Template saved successfully');
    }
    
    getChanges() {
        const changes = {
            modified: false,
            fields: [],
            propertiesAdded: [],
            propertiesRemoved: [],
            propertiesModified: []
        };
        
        // Check template fields
        if (this.originalTemplate.name !== this.template.name) {
            changes.fields.push('name');
            changes.modified = true;
        }
        
        if (this.originalTemplate.description !== this.template.description) {
            changes.fields.push('description');
            changes.modified = true;
        }
        
        // Check properties
        const originalProps = this.originalTemplate.properties || [];
        const currentProps = this.template.properties || [];
        
        // Find added properties
        currentProps.forEach(prop => {
            if (!originalProps.find(p => p.id === prop.id)) {
                changes.propertiesAdded.push(prop);
                changes.modified = true;
            }
        });
        
        // Find removed properties
        originalProps.forEach(prop => {
            if (!currentProps.find(p => p.id === prop.id)) {
                changes.propertiesRemoved.push(prop);
                changes.modified = true;
            }
        });
        
        // Find modified properties
        currentProps.forEach(prop => {
            const originalProp = originalProps.find(p => p.id === prop.id);
            if (originalProp) {
                const isModified = 
                    originalProp.label !== prop.label ||
                    originalProp.description !== prop.description ||
                    originalProp.type !== prop.type ||
                    originalProp.required !== prop.required;
                
                if (isModified) {
                    changes.propertiesModified.push(prop);
                    changes.modified = true;
                }
            }
        });
        
        return changes;
    }
    
    markAsModified() {
        const saveBtn = this.container.querySelector('#save-template-btn');
        if (saveBtn) {
            const changes = this.getChanges();
            if (changes.modified) {
                saveBtn.classList.add('has-changes');
            } else {
                saveBtn.classList.remove('has-changes');
            }
        }
    }
    
    getORKGEditUrl() {
        if (this.template.id) {
            return `https://orkg.org/template/${this.template.id}`;
        }
        return '#';
    }
    
    showError(message) {
        eventManager.emit('toast:show', {
            message,
            type: 'error',
            duration: 3000
        });
    }
    
    showSuccess(message) {
        eventManager.emit('toast:show', {
            message,
            type: 'success',
            duration: 2000
        });
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getTemplate() {
        return this.template;
    }
    
    setTemplate(template) {
        this.template = JSON.parse(JSON.stringify(template));
        this.originalTemplate = JSON.parse(JSON.stringify(template));
        this.render();
    }
    
    destroy() {
        this.container = null;
        this.template = null;
        this.originalTemplate = null;
        this.validationErrors = {};
    }
}
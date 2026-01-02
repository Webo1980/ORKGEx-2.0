// ================================
// src/components/editors/TemplateTableView.js - Enhanced with InlineEditor and Better Layout
// ================================

import { eventManager } from '../../utils/eventManager.js';
import { InlineEditor } from './InlineEditor.js';

export class TemplateTableView {
    constructor() {
        this.container = null;
        this.templates = [];
        this.selectedTemplateId = null;
        this.options = {};
        this.sortColumn = 'paperCount';
        this.sortDirection = 'desc';
        this.filterText = '';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.isInitialized = false;
        this.inlineEditors = new Map();
    }
    
    init(container, templates = [], options = {}) {
        this.container = container;
        this.templates = templates;
        this.options = {
            onSelect: options.onSelect || null,
            onEdit: options.onEdit || null,
            onDelete: options.onDelete || null,
            onViewDetails: options.onViewDetails || null,
            onPropertyUpdate: options.onPropertyUpdate || null,
            showPaperCount: options.showPaperCount !== false,
            showActions: options.showActions !== false,
            showPagination: options.showPagination !== false,
            showSearch: options.showSearch !== false,
            selectable: options.selectable !== false,
            editable: options.editable !== false,
            columns: options.columns || this.getDefaultColumns(),
            emptyMessage: options.emptyMessage || 'No templates available'
        };
        
        this.isInitialized = true;
        this.render();
    }
    
    getDefaultColumns() {
        const columns = [
            {
                id: 'select',
                label: '',
                width: '40px',
                sortable: false,
                visible: this.options.selectable
            },
            {
                id: 'name',
                label: 'Template Name',
                width: '250px',
                sortable: true,
                visible: true
            },
            {
                id: 'description',
                label: 'Description',
                width: '350px',
                sortable: false,
                visible: true
            },
            {
                id: 'properties',
                label: 'Properties',
                width: '120px',
                sortable: true,
                visible: true,
                render: (template) => {
                    const count = template.properties?.length || 0;
                    return `<span class="badge badge-info">${count} props</span>`;
                }
            }
        ];
        
        if (this.options.showPaperCount) {
            columns.push({
                id: 'paperCount',
                label: 'Papers',
                width: '80px',
                sortable: true,
                visible: true,
                render: (template) => {
                    const count = template.paperCount || 0;
                    return `<span class="badge badge-secondary">${count}</span>`;
                }
            });
        }
        
        if (this.options.showActions) {
            columns.push({
                id: 'actions',
                label: 'Actions',
                sortable: false,
                visible: true,
                width: '100px'
            });
        }
        
        return columns;
    }
    
    render() {
        if (!this.container) return;
        
        const filteredTemplates = this.getFilteredTemplates();
        const paginatedTemplates = this.getPaginatedTemplates(filteredTemplates);
        const totalPages = Math.ceil(filteredTemplates.length / this.itemsPerPage);
        
        this.container.innerHTML = `
            <div class="template-table-container">
                ${this.options.showSearch ? this.renderSearchBar() : ''}
                
                <div class="table-scroll-wrapper">
                    ${paginatedTemplates.length > 0 ? 
                        this.renderTable(paginatedTemplates) : 
                        this.renderEmptyState()
                    }
                </div>
                
                ${this.options.showPagination && totalPages > 1 ? 
                    this.renderPagination(totalPages, filteredTemplates.length) : 
                    ''
                }
            </div>
        `;
        
        this.attachEventHandlers();
        this.initializeInlineEditors();
    }
    
    renderSearchBar() {
        return `
            <div class="table-search-bar">
                <div class="search-input-wrapper">
                    <i class="fas fa-search search-icon"></i>
                    <input 
                        type="text" 
                        class="form-control search-input" 
                        placeholder="Search templates..."
                        value="${this.escapeHtml(this.filterText)}"
                        id="template-search-input"
                    >
                    ${this.filterText ? `
                        <button class="btn btn-sm btn-link clear-search-btn" id="clear-search-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="search-results-info">
                    ${this.filterText ? `
                        <span class="text-muted">
                            Found ${this.getFilteredTemplates().length} of ${this.templates.length} templates
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderTable(templates) {
        const visibleColumns = this.options.columns.filter(col => col.visible);
        
        return `
            <div class="table-responsive">
                <table class="template-table">
                    <thead>
                        <tr>
                            ${visibleColumns.map(col => this.renderTableHeader(col)).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${templates.map(template => this.renderTableRow(template, visibleColumns)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderTableHeader(column) {
        const isSorted = this.sortColumn === column.id;
        const sortIcon = isSorted ? 
            (this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 
            'fa-sort';
        
        return `
            <th 
                class="${column.sortable ? 'sortable' : ''} ${isSorted ? 'sorted' : ''}"
                data-column="${column.id}"
                ${column.width ? `style="width: ${column.width}; min-width: ${column.width}"` : ''}
            >
                <div class="th-content">
                    <span>${column.label}</span>
                    ${column.sortable ? `<i class="fas ${sortIcon} sort-icon"></i>` : ''}
                </div>
            </th>
        `;
    }
    
    renderTableRow(template, columns) {
        const isSelected = template.id === this.selectedTemplateId;
        
        return `
            <tr 
                class="template-row ${isSelected ? 'selected' : ''}" 
                data-template-id="${template.id}"
            >
                ${columns.map(col => this.renderTableCell(template, col)).join('')}
            </tr>
        `;
    }
    
    renderTableCell(template, column) {
        let content = '';
        
        switch (column.id) {
            case 'select':
                content = `
                    <input 
                        type="radio" 
                        name="template-selection" 
                        value="${template.id}"
                        ${template.id === this.selectedTemplateId ? 'checked' : ''}
                        class="template-radio"
                    >
                `;
                break;
                
            case 'name':
                content = `
                    <div class="template-name-cell">
                        <div class="editable-content" 
                             data-template-id="${template.id}" 
                             data-field="name"
                             id="template-name-${template.id}">
                            ${this.escapeHtml(template.name || 'Unnamed Template')}
                        </div>
                        ${template.id ? `
                            <a href="https://orkg.org/template/${template.id}" 
                               target="_blank" 
                               class="template-link" 
                               title="View in ORKG">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                    </div>
                `;
                break;
                
            case 'description':
                const description = template.description || 'No description available';
                content = `
                    <div class="template-description-cell">
                        <div class="editable-content" 
                             data-template-id="${template.id}" 
                             data-field="description"
                             id="template-desc-${template.id}">
                            ${this.escapeHtml(description)}
                        </div>
                    </div>
                `;
                break;
                
            case 'actions':
                content = this.renderActions(template);
                break;
                
            default:
                if (column.render) {
                    content = column.render(template);
                } else {
                    content = this.escapeHtml(template[column.id] || '');
                }
        }
        
        return `<td class="cell-${column.id}">${content}</td>`;
    }
    
    renderActions(template) {
        const actions = [];
        
        if (this.options.onViewDetails) {
            actions.push(`
                <button 
                    class="btn btn-sm btn-icon action-view" 
                    data-template-id="${template.id}"
                    title="View Properties"
                >
                    <i class="fas fa-eye"></i>
                </button>
            `);
        }
        
        if (this.options.onEdit) {
            actions.push(`
                <button 
                    class="btn btn-sm btn-icon action-edit" 
                    data-template-id="${template.id}"
                    title="Edit Template"
                >
                    <i class="fas fa-edit"></i>
                </button>
            `);
        }
        
        return `<div class="template-actions">${actions.join('')}</div>`;
    }
    
    initializeInlineEditors() {
        if (!this.options.editable) return;
        
        // Clear existing editors
        this.inlineEditors.forEach(editor => {
            if (editor.destroy) editor.destroy();
        });
        this.inlineEditors.clear();
        
        // Initialize editors for each editable field
        this.templates.forEach(template => {
            // Name editor
            const nameElement = this.container.querySelector(`#template-name-${template.id}`);
            if (nameElement) {
                const nameEditor = new InlineEditor();
                nameEditor.init(nameElement, {
                    value: template.name || 'Unnamed Template',
                    placeholder: 'Enter template name',
                    type: 'text',
                    maxLength: 200,
                    onSave: (value) => this.handleInlineEdit(template.id, 'name', value)
                });
                this.inlineEditors.set(`${template.id}-name`, nameEditor);
            }
            
            // Description editor
            const descElement = this.container.querySelector(`#template-desc-${template.id}`);
            if (descElement) {
                const descEditor = new InlineEditor();
                descEditor.init(descElement, {
                    value: template.description || '',
                    placeholder: 'Enter template description',
                    type: 'textarea',
                    maxLength: 500,
                    onSave: (value) => this.handleInlineEdit(template.id, 'description', value)
                });
                this.inlineEditors.set(`${template.id}-description`, descEditor);
            }
        });
    }
    
    handleInlineEdit(templateId, field, value) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;
        
        // Update template
        template[field] = value;
        
        // Emit update event
        eventManager.emit('template:field_updated', {
            templateId,
            field,
            value,
            template
        });
        
        // Call callback if provided
        if (this.options.onPropertyUpdate) {
            this.options.onPropertyUpdate(template, field, value);
        }
        
        console.log(`📝 Updated template ${templateId} ${field}: ${value}`);
    }
    
    renderEmptyState() {
        return `
            <div class="table-empty-state">
                <div class="empty-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <h4>No Templates Found</h4>
                <p class="text-muted">${this.options.emptyMessage}</p>
            </div>
        `;
    }
    
    renderPagination(totalPages, totalItems) {
        const pages = this.generatePageNumbers(totalPages);
        
        return `
            <div class="table-pagination">
                <div class="pagination-info">
                    Showing ${((this.currentPage - 1) * this.itemsPerPage) + 1} - 
                    ${Math.min(this.currentPage * this.itemsPerPage, totalItems)} 
                    of ${totalItems} templates
                </div>
                <div class="pagination-controls">
                    <button 
                        class="btn btn-sm btn-outline-secondary pagination-btn" 
                        data-page="prev"
                        ${this.currentPage === 1 ? 'disabled' : ''}
                    >
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    
                    ${pages.map(page => {
                        if (page === '...') {
                            return '<span class="pagination-ellipsis">...</span>';
                        }
                        return `
                            <button 
                                class="btn btn-sm ${page === this.currentPage ? 'btn-primary' : 'btn-outline-secondary'} pagination-btn" 
                                data-page="${page}"
                            >
                                ${page}
                            </button>
                        `;
                    }).join('')}
                    
                    <button 
                        class="btn btn-sm btn-outline-secondary pagination-btn" 
                        data-page="next"
                        ${this.currentPage === totalPages ? 'disabled' : ''}
                    >
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    generatePageNumbers(totalPages) {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (this.currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (this.currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(this.currentPage - 1);
                pages.push(this.currentPage);
                pages.push(this.currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        
        return pages;
    }
    
    attachEventHandlers() {
        // Search handlers
        const searchInput = this.container.querySelector('#template-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterText = e.target.value;
                this.currentPage = 1;
                this.render();
            });
        }
        
        const clearSearchBtn = this.container.querySelector('#clear-search-btn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.filterText = '';
                this.currentPage = 1;
                this.render();
            });
        }
        
        // Sort handlers
        const sortableHeaders = this.container.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                if (this.sortColumn === column) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = column;
                    this.sortDirection = 'asc';
                }
                this.render();
            });
        });
        
        // Selection handlers
        const radioButtons = this.container.querySelectorAll('.template-radio');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const templateId = e.target.value;
                    this.selectTemplate(templateId);
                }
            });
        });
        
        // Row click handlers
        const rows = this.container.querySelectorAll('.template-row');
        rows.forEach(row => {
            row.addEventListener('click', (e) => {
                // Don't select if clicking on action buttons, links, or editable content
                if (e.target.closest('.template-actions') || 
                    e.target.closest('.template-link') ||
                    e.target.closest('.editable-content')) {
                    return;
                }
                
                const templateId = row.dataset.templateId;
                if (this.options.selectable) {
                    this.selectTemplate(templateId);
                }
            });
        });
        
        // Action handlers
        this.attachActionHandlers();
        
        // Pagination handlers
        this.attachPaginationHandlers();
    }
    
    attachActionHandlers() {
        // View details
        const viewButtons = this.container.querySelectorAll('.action-view');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const templateId = btn.dataset.templateId;
                const template = this.templates.find(t => t.id === templateId);
                if (template && this.options.onViewDetails) {
                    this.options.onViewDetails(template);
                }
            });
        });
        
        // Edit
        const editButtons = this.container.querySelectorAll('.action-edit');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const templateId = btn.dataset.templateId;
                const template = this.templates.find(t => t.id === templateId);
                if (template && this.options.onEdit) {
                    this.options.onEdit(template);
                }
            });
        });
    }
    
    attachPaginationHandlers() {
        const paginationButtons = this.container.querySelectorAll('.pagination-btn');
        paginationButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                
                if (page === 'prev' && this.currentPage > 1) {
                    this.currentPage--;
                } else if (page === 'next') {
                    const totalPages = Math.ceil(this.getFilteredTemplates().length / this.itemsPerPage);
                    if (this.currentPage < totalPages) {
                        this.currentPage++;
                    }
                } else if (page !== 'prev' && page !== 'next') {
                    this.currentPage = parseInt(page);
                }
                
                this.render();
            });
        });
    }
    
    selectTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;
        
        this.selectedTemplateId = templateId;
        
        // Update visual state
        const rows = this.container.querySelectorAll('.template-row');
        rows.forEach(row => {
            row.classList.toggle('selected', row.dataset.templateId === templateId);
        });
        
        // Update radio buttons
        const radios = this.container.querySelectorAll('.template-radio');
        radios.forEach(radio => {
            radio.checked = radio.value === templateId;
        });
        
        // Call callback
        if (this.options.onSelect) {
            this.options.onSelect(template);
        }
        
        // Emit event
        eventManager.emit('template:selected', { template });
    }
    
    getFilteredTemplates() {
        if (!this.filterText) {
            return this.getSortedTemplates();
        }
        
        const searchTerm = this.filterText.toLowerCase();
        const filtered = this.templates.filter(template => {
            const name = (template.name || '').toLowerCase();
            const description = (template.description || '').toLowerCase();
            return name.includes(searchTerm) || description.includes(searchTerm);
        });
        
        return this.sortTemplates(filtered);
    }
    
    getSortedTemplates() {
        return this.sortTemplates([...this.templates]);
    }
    
    sortTemplates(templates) {
        return templates.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortColumn) {
                case 'name':
                    aValue = a.name || '';
                    bValue = b.name || '';
                    break;
                case 'properties':
                    aValue = a.properties?.length || 0;
                    bValue = b.properties?.length || 0;
                    break;
                case 'paperCount':
                    aValue = a.paperCount || 0;
                    bValue = b.paperCount || 0;
                    break;
                default:
                    aValue = a[this.sortColumn] || '';
                    bValue = b[this.sortColumn] || '';
            }
            
            if (typeof aValue === 'string') {
                return this.sortDirection === 'asc' ? 
                    aValue.localeCompare(bValue) : 
                    bValue.localeCompare(aValue);
            } else {
                return this.sortDirection === 'asc' ? 
                    aValue - bValue : 
                    bValue - aValue;
            }
        });
    }
    
    getPaginatedTemplates(templates) {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return templates.slice(start, end);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public API
    
    setTemplates(templates) {
        this.templates = templates;
        this.render();
    }
    
    addTemplate(template) {
        this.templates.push(template);
        this.render();
    }
    
    removeTemplate(templateId) {
        this.templates = this.templates.filter(t => t.id !== templateId);
        if (this.selectedTemplateId === templateId) {
            this.selectedTemplateId = null;
        }
        this.render();
    }
    
    updateTemplate(templateId, updates) {
        const template = this.templates.find(t => t.id === templateId);
        if (template) {
            Object.assign(template, updates);
            this.render();
        }
    }
    
    setSelected(templateId) {
        this.selectedTemplateId = templateId;
        this.render();
    }
    
    getSelected() {
        return this.templates.find(t => t.id === this.selectedTemplateId);
    }
    
    refresh() {
        this.render();
    }
    
    destroy() {
        // Destroy all inline editors
        this.inlineEditors.forEach(editor => {
            if (editor.destroy) editor.destroy();
        });
        this.inlineEditors.clear();
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.templates = [];
        this.selectedTemplateId = null;
        this.isInitialized = false;
    }
}

export default TemplateTableView;
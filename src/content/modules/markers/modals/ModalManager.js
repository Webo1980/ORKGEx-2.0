// src/content/modules/markers/modals/ModalManager.js

(function(global) {
    'use strict';
    
    class ModalManager {
        constructor() {
            this.activeModals = new Map();
            this.instance = null;
        }
        
        static getInstance() {
            if (!ModalManager.instance) {
                ModalManager.instance = new ModalManager();
            }
            return ModalManager.instance;
        }
        
        // ================================
        // Delete Confirmation Modal
        // ================================
        
        showDeleteConfirm(markerData, onConfirm, onCancel) {
            const modalId = 'delete-' + markerData.id;
            this.closeModal(modalId);
            
            const modal = this.createModal({
                id: modalId,
                title: `Delete ${this.formatType(markerData.type)} Marker`,
                content: this.getDeleteContent(markerData),
                buttons: [
                    { 
                        text: 'Cancel', 
                        className: 'orkg-btn-secondary', 
                        action: () => {
                            this.closeModal(modalId);
                            if (onCancel) onCancel();
                        }
                    },
                    { 
                        text: 'Delete', 
                        className: 'orkg-btn-danger', 
                        action: () => {
                            this.closeModal(modalId);
                            if (onConfirm) onConfirm();
                        }
                    }
                ],
                style: 'property-window' // Use property window style
            });
            
            this.showModal(modal);
        }
        
        // ================================
        // Info Modal - Enhanced
        // ================================
        
        showInfo(markerData, type) {
            const modalId = 'info-' + markerData.id;
            this.closeModal(modalId);
            
            const modal = this.createModal({
                id: modalId,
                title: `${this.formatType(type)} Information`,
                content: this.getEnhancedInfoContent(markerData, type),
                buttons: [
                    { 
                        text: 'Close', 
                        className: 'orkg-btn-primary', 
                        action: () => {
                            this.closeModal(modalId);
                        }
                    }
                ],
                style: 'property-window' // Use property window style
            });
            
            this.showModal(modal);
        }
        
        // ================================
        // Send Options Modal
        // ================================
        
        showSendOptions(markerData, counts, callback) {
            const modalId = 'send-options-' + markerData.id;
            this.closeModal(modalId);
            
            const modal = this.createModal({
                id: modalId,
                title: 'Send to ORKG',
                content: this.getSendOptionsContent(markerData, counts),
                buttons: [
                    { 
                        text: 'Cancel', 
                        className: 'orkg-btn-secondary', 
                        action: () => {
                            this.closeModal(modalId);
                        }
                    },
                    { 
                        text: 'Send Only This', 
                        className: 'orkg-btn-primary', 
                        action: () => {
                            this.closeModal(modalId);
                            callback('send-this');
                        }
                    },
                    { 
                        text: `Send All (${counts.total})`, 
                        className: 'orkg-btn-gradient', 
                        action: () => {
                            this.closeModal(modalId);
                            callback('send-all');
                        }
                    }
                ],
                style: 'property-window'
            });
            
            this.showModal(modal);
        }
        
        // ================================
        // Send All Modal - Enhanced
        // ================================
        
        showSendAll(items, callback) {
            const modalId = 'send-all';
            this.closeModal(modalId);
            
            const modal = document.createElement('div');
            modal.className = 'orkg-modal-overlay';
            modal.dataset.modalId = modalId;
            
            const content = document.createElement('div');
            content.className = 'orkg-modal-content orkg-modal-large orkg-property-window-style';
            
            content.innerHTML = this.getEnhancedSendAllContent(items);
            modal.appendChild(content);
            
            this.setupEnhancedSendAllHandlers(modal, items, callback);
            this.activeModals.set(modalId, modal);
            document.body.appendChild(modal);
            
            requestAnimationFrame(() => {
                modal.classList.add('orkg-modal-visible');
            });
        }
        
        // ================================
        // Enhanced Content Generators
        // ================================
        
        getDeleteContent(markerData) {
            const text = markerData.metadata?.text || 
                        markerData.metadata?.alt || 
                        markerData.metadata?.caption || 
                        'This item';
            
            const property = markerData.metadata?.property;
            
            return `
                <div class="orkg-modal-message">
                    <p>Are you sure you want to delete this ${this.formatType(markerData.type)} marker?</p>
                </div>
                
                <div class="orkg-modal-preview">
                    ${property ? `
                        <div class="orkg-preview-property">
                            <strong>Property:</strong> ${this.escapeHtml(property.label || 'Unknown')}
                        </div>
                    ` : ''}
                    <div class="orkg-preview-text">
                        <strong>Content:</strong> ${this.escapeHtml(this.truncate(text, 100))}
                    </div>
                </div>
            `;
        }
        
        getEnhancedInfoContent(markerData, type) {
            const metadata = markerData.metadata || {};
            
            // Build info rows, excluding ID
            const infoRows = [];
            
            // Type
            infoRows.push({
                label: 'Type',
                value: this.formatType(type),
                icon: this.getTypeIcon(type)
            });
            
            // Property
            if (metadata.property) {
                infoRows.push({
                    label: 'Property',
                    value: metadata.property.label || 'Unknown',
                    className: 'orkg-info-property'
                });
            }
            
            // Content based on type
            if (type === 'text' && metadata.text) {
                infoRows.push({
                    label: 'Text',
                    value: this.truncate(metadata.text, 200),
                    className: 'orkg-info-text'
                });
            } else if (type === 'image') {
                if (metadata.src) {
                    infoRows.push({
                        label: 'Source',
                        value: this.truncate(metadata.src, 100),
                        className: 'orkg-info-url'
                    });
                }
                if (metadata.alt) {
                    infoRows.push({
                        label: 'Alt Text',
                        value: metadata.alt,
                        className: 'orkg-info-alt'
                    });
                }
            } else if (type === 'table') {
                if (metadata.caption) {
                    infoRows.push({
                        label: 'Caption',
                        value: metadata.caption,
                        className: 'orkg-info-caption'
                    });
                }
                if (metadata.rows) {
                    infoRows.push({
                        label: 'Size',
                        value: `${metadata.rows} rows × ${metadata.columns || '?'} columns`,
                        className: 'orkg-info-size'
                    });
                }
            }
            
            // Confidence
            if (metadata.confidence) {
                infoRows.push({
                    label: 'Confidence',
                    value: `${Math.round(metadata.confidence * 100)}%`,
                    className: 'orkg-info-confidence',
                    color: this.getConfidenceColor(metadata.confidence)
                });
            }
            
            // Source
            if (metadata.source) {
                infoRows.push({
                    label: 'Source',
                    value: metadata.source,
                    className: 'orkg-info-source'
                });
            }
            
            // Created
            if (markerData.createdAt) {
                infoRows.push({
                    label: 'Created',
                    value: new Date(markerData.createdAt).toLocaleString(),
                    className: 'orkg-info-date'
                });
            }
            
            // Build HTML
            let html = '<div class="orkg-info-section">';
            
            infoRows.forEach(row => {
                html += `
                    <div class="orkg-info-row ${row.className || ''}">
                        <span class="orkg-info-label">
                            ${row.icon || ''}
                            ${row.label}:
                        </span>
                        <span class="orkg-info-value" ${row.color ? `style="color: ${row.color};"` : ''}>
                            ${this.escapeHtml(row.value)}
                        </span>
                    </div>
                `;
            });
            
            html += '</div>';
            
            return html;
        }
        
        getSendOptionsContent(markerData, counts) {
            const preview = markerData.metadata?.text || 
                           markerData.metadata?.alt || 
                           markerData.metadata?.caption || 
                           'Selected item';
            
            const property = markerData.metadata?.property;
            
            return `
                <p>Choose what to send to the extension:</p>
                
                <div class="orkg-modal-preview">
                    ${property ? `
                        <div class="orkg-preview-property">
                            <strong>Property:</strong> ${this.escapeHtml(property.label || 'Unknown')}
                        </div>
                    ` : ''}
                    <div class="orkg-preview-text">
                        ${this.escapeHtml(this.truncate(preview, 100))}
                    </div>
                </div>
                
                <div class="orkg-send-counts">
                    <div class="orkg-count-item">
                        <span class="orkg-count-icon">${this.getTypeIcon('text')}</span>
                        <span>Text: ${counts.text}</span>
                    </div>
                    <div class="orkg-count-item">
                        <span class="orkg-count-icon">${this.getTypeIcon('image')}</span>
                        <span>Images: ${counts.image}</span>
                    </div>
                    <div class="orkg-count-item">
                        <span class="orkg-count-icon">${this.getTypeIcon('table')}</span>
                        <span>Tables: ${counts.table}</span>
                    </div>
                </div>
            `;
        }
        
        getEnhancedSendAllContent(items) {
            // Group text items by property
            const textByProperty = this.groupTextByProperty(items.text);
            
            return `
                <div class="orkg-modal-header">
                    <h3>Send All Content to ORKG</h3>
                    <span class="orkg-modal-subtitle">Select items to send (${items.totalCount} total)</span>
                </div>
                
                <div class="orkg-modal-body orkg-modal-scrollable">
                    <div class="orkg-select-all-section">
                        <label class="orkg-checkbox-label">
                            <input type="checkbox" id="select-all-items" class="orkg-checkbox" checked>
                            <span>Select All</span>
                        </label>
                    </div>
                    
                    <div class="orkg-categories-container">
                        ${this.renderEnhancedTextCategory(textByProperty)}
                        ${this.renderEnhancedImageCategory(items.images)}
                        ${this.renderEnhancedTableCategory(items.tables)}
                    </div>
                </div>
                
                <div class="orkg-modal-footer">
                    <button class="orkg-modal-btn orkg-btn-secondary" data-action="cancel">Cancel</button>
                    <button class="orkg-modal-btn orkg-btn-primary orkg-send-selected-btn" data-action="send">
                        Send Selected (<span class="selected-count">${items.totalCount}</span>)
                    </button>
                </div>
            `;
        }
        
        groupTextByProperty(textItems) {
            const grouped = {};
            
            textItems.forEach(item => {
                const propertyLabel = item.metadata?.property?.label || 
                                    item.property?.label || 
                                    'No Property';
                
                if (!grouped[propertyLabel]) {
                    grouped[propertyLabel] = {
                        property: item.metadata?.property || item.property,
                        items: []
                    };
                }
                
                grouped[propertyLabel].items.push(item);
            });
            
            return grouped;
        }
        
        renderEnhancedTextCategory(textByProperty) {
            const propertyCount = Object.keys(textByProperty).length;
            if (propertyCount === 0) return '';
            
            const totalItems = Object.values(textByProperty)
                .reduce((sum, group) => sum + group.items.length, 0);
            
            return `
                <div class="orkg-category-section">
                    <div class="orkg-category-header">
                        <label class="orkg-checkbox-label">
                            <input type="checkbox" class="orkg-category-checkbox" data-category="text" checked>
                            ${this.getTypeIcon('text')}
                            <span class="orkg-category-title">Text Highlights</span>
                            <span class="orkg-category-count">(${totalItems})</span>
                        </label>
                    </div>
                    <div class="orkg-category-items orkg-property-tree">
                        ${Object.entries(textByProperty).map(([propertyLabel, group]) => `
                            <div class="orkg-property-group">
                                <div class="orkg-property-group-header">
                                    <label class="orkg-checkbox-label">
                                        <input type="checkbox" class="orkg-property-checkbox" 
                                               data-property="${this.escapeHtml(propertyLabel)}" checked>
                                        <span class="orkg-property-label">
                                            ${this.escapeHtml(propertyLabel)}
                                        </span>
                                        <span class="orkg-property-count">(${group.items.length})</span>
                                    </label>
                                </div>
                                <div class="orkg-property-items">
                                    ${group.items.map(item => `
                                        <label class="orkg-checkbox-label orkg-item-label">
                                            <input type="checkbox" class="orkg-item-checkbox" 
                                                   data-category="text"
                                                   data-property="${this.escapeHtml(propertyLabel)}"
                                                   data-id="${item.id}" 
                                                   checked>
                                            <span class="orkg-item-text">
                                                "${this.escapeHtml(this.truncate(item.text || item.metadata?.text || '', 80))}"
                                            </span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        renderEnhancedImageCategory(images) {
            if (images.length === 0) return '';
            
            return `
                <div class="orkg-category-section">
                    <div class="orkg-category-header">
                        <label class="orkg-checkbox-label">
                            <input type="checkbox" class="orkg-category-checkbox" data-category="images" checked>
                            ${this.getTypeIcon('image')}
                            <span class="orkg-category-title">Images</span>
                            <span class="orkg-category-count">(${images.length})</span>
                        </label>
                    </div>
                    <div class="orkg-category-items orkg-image-grid">
                        ${images.map(item => {
                            const imgSrc = item.metadata?.src || item.element?.src || '';
                            const imgAlt = item.metadata?.alt || item.element?.alt || 'Image';
                            
                            return `
                                <div class="orkg-image-item">
                                    <label class="orkg-checkbox-label">
                                        <input type="checkbox" class="orkg-item-checkbox" 
                                               data-category="images"
                                               data-id="${item.id}" 
                                               checked>
                                        ${imgSrc ? `
                                            <div class="orkg-image-preview">
                                                <img src="${imgSrc}" alt="${this.escapeHtml(imgAlt)}" 
                                                     style="max-width: 100px; max-height: 100px; object-fit: cover;">
                                            </div>
                                        ` : ''}
                                        <span class="orkg-item-text">
                                            ${this.escapeHtml(this.truncate(imgAlt, 50))}
                                        </span>
                                    </label>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        renderEnhancedTableCategory(tables) {
            if (tables.length === 0) return '';
            
            return `
                <div class="orkg-category-section">
                    <div class="orkg-category-header">
                        <label class="orkg-checkbox-label">
                            <input type="checkbox" class="orkg-category-checkbox" data-category="tables" checked>
                            ${this.getTypeIcon('table')}
                            <span class="orkg-category-title">Tables</span>
                            <span class="orkg-category-count">(${tables.length})</span>
                        </label>
                    </div>
                    <div class="orkg-category-items">
                        ${tables.map(item => {
                            const caption = item.metadata?.caption || `Table ${item.id}`;
                            const size = item.metadata?.rows ? 
                                `${item.metadata.rows}×${item.metadata.columns || '?'}` : '';
                            
                            return `
                                <label class="orkg-checkbox-label orkg-item-label">
                                    <input type="checkbox" class="orkg-item-checkbox" 
                                           data-category="tables"
                                           data-id="${item.id}" 
                                           checked>
                                    <span class="orkg-item-text">
                                        ${this.escapeHtml(caption)}
                                        ${size ? `<span class="orkg-table-size">(${size})</span>` : ''}
                                    </span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        setupEnhancedSendAllHandlers(modal, items, callback) {
            const selectAll = modal.querySelector('#select-all-items');
            const categoryBoxes = modal.querySelectorAll('.orkg-category-checkbox');
            const propertyBoxes = modal.querySelectorAll('.orkg-property-checkbox');
            const itemBoxes = modal.querySelectorAll('.orkg-item-checkbox');
            const countSpan = modal.querySelector('.selected-count');
            const sendBtn = modal.querySelector('.orkg-send-selected-btn');
            const cancelBtn = modal.querySelector('[data-action="cancel"]');
            
            const updateCount = () => {
                const checked = modal.querySelectorAll('.orkg-item-checkbox:checked').length;
                if (countSpan) countSpan.textContent = checked;
                if (sendBtn) {
                    sendBtn.disabled = checked === 0;
                    if (checked === 0) {
                        sendBtn.classList.add('orkg-btn-disabled');
                    } else {
                        sendBtn.classList.remove('orkg-btn-disabled');
                    }
                }
            };
            
            // Select all handler
            if (selectAll) {
                selectAll.addEventListener('change', (e) => {
                    itemBoxes.forEach(box => box.checked = e.target.checked);
                    categoryBoxes.forEach(box => box.checked = e.target.checked);
                    propertyBoxes.forEach(box => box.checked = e.target.checked);
                    updateCount();
                });
            }
            
            // Category checkbox handler
            categoryBoxes.forEach(catBox => {
                catBox.addEventListener('change', (e) => {
                    const category = catBox.dataset.category;
                    modal.querySelectorAll(`.orkg-item-checkbox[data-category="${category}"]`)
                         .forEach(box => box.checked = e.target.checked);
                    
                    if (category === 'text') {
                        modal.querySelectorAll('.orkg-property-checkbox')
                             .forEach(box => box.checked = e.target.checked);
                    }
                    
                    const allChecked = Array.from(itemBoxes).every(b => b.checked);
                    if (selectAll) {
                        selectAll.checked = allChecked;
                        selectAll.indeterminate = !allChecked && Array.from(itemBoxes).some(b => b.checked);
                    }
                    updateCount();
                });
            });
            
            // Property checkbox handler
            propertyBoxes.forEach(propBox => {
                propBox.addEventListener('change', (e) => {
                    const property = propBox.dataset.property;
                    modal.querySelectorAll(`.orkg-item-checkbox[data-property="${property}"]`)
                         .forEach(box => box.checked = e.target.checked);
                    updateCount();
                });
            });
            
            // Item checkbox handler
            itemBoxes.forEach(itemBox => {
                itemBox.addEventListener('change', () => {
                    updateCount();
                });
            });
            
            // Button handlers
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.closeModal('send-all');
                });
            }
            
            if (sendBtn) {
                sendBtn.addEventListener('click', () => {
                    const selected = this.getSelectedItems(modal, items);
                    if (selected.total > 0) {
                        this.closeModal('send-all');
                        callback(selected);
                    }
                });
            }
            
            // Initial count
            updateCount();
        }
        
        // ================================
        // Modal Creation
        // ================================
        
        createModal(options) {
            const modal = document.createElement('div');
            modal.className = 'orkg-modal-overlay';
            modal.dataset.modalId = options.id;
            
            const content = document.createElement('div');
            content.className = 'orkg-modal-content';
            
            if (options.style === 'property-window') {
                content.classList.add('orkg-property-window-style');
            }
            
            const header = document.createElement('div');
            header.className = 'orkg-modal-header';
            const title = document.createElement('h3');
            title.textContent = options.title;
            header.appendChild(title);
            
            const body = document.createElement('div');
            body.className = 'orkg-modal-body';
            body.innerHTML = options.content;
            
            const footer = document.createElement('div');
            footer.className = 'orkg-modal-footer';
            
            options.buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = `orkg-modal-btn ${btn.className}`;
                button.textContent = btn.text;
                button.onclick = btn.action;
                footer.appendChild(button);
            });
            
            content.appendChild(header);
            content.appendChild(body);
            content.appendChild(footer);
            modal.appendChild(content);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(options.id);
                }
            });
            
            return modal;
        }
        
        showModal(modal) {
            const id = modal.dataset.modalId;
            this.activeModals.set(id, modal);
            document.body.appendChild(modal);
            
            requestAnimationFrame(() => {
                modal.classList.add('orkg-modal-visible');
            });
        }
        
        closeModal(modalId) {
            const modal = this.activeModals.get(modalId);
            if (!modal) return;
            
            modal.classList.remove('orkg-modal-visible');
            
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
                this.activeModals.delete(modalId);
            }, 300);
        }
        
        closeAllModals() {
            this.activeModals.forEach((modal, id) => {
                this.closeModal(id);
            });
        }
        
        getSelectedItems(modal, items) {
            const selected = { text: [], images: [], tables: [], total: 0 };
            
            const checkedBoxes = modal.querySelectorAll('.orkg-item-checkbox:checked');
            checkedBoxes.forEach(box => {
                const category = box.dataset.category;
                const id = box.dataset.id;
                
                if (category === 'text') {
                    const item = items.text.find(t => t.id === id);
                    if (item) selected.text.push(item);
                } else if (category === 'images') {
                    const item = items.images.find(i => i.id === id);
                    if (item) selected.images.push(item);
                } else if (category === 'tables') {
                    const item = items.tables.find(t => t.id === id);
                    if (item) selected.tables.push(item);
                }
            });
            
            selected.total = selected.text.length + selected.images.length + selected.tables.length;
            return selected;
        }
        
        // ================================
        // Utility Methods
        // ================================
        
        formatType(type) {
            return type.charAt(0).toUpperCase() + type.slice(1);
        }
        
        getTypeIcon(type) {
            const icons = {
                text: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm5 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6zm0 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6z"/></svg>',
                image: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>',
                table: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/></svg>'
            };
            return icons[type] || '';
        }
        
        getConfidenceColor(confidence) {
            if (confidence >= 0.8) return '#10b981';
            if (confidence >= 0.5) return '#f59e0b';
            return '#ef4444';
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
        
        truncate(text, maxLength) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }
    }
    
    global.ModalManager = ModalManager;
    
    console.log('📢 Enhanced ModalManager exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
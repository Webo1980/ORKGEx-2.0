// ================================
// src/core/content/analyzers/ImageTableView.js - Complete Implementation
// ================================

export class ImageTableView {
    constructor(callbacks = {}) {
        this.onSelect = callbacks.onSelect || (() => {});
        this.onAnalyze = callbacks.onAnalyze || (() => {});
        this.onDelete = callbacks.onDelete || (() => {});
        this.onViewTriples = callbacks.onViewTriples || (() => {});
        this.onSelectAll = callbacks.onSelectAll || (() => {});
        this.onDeselectAll = callbacks.onDeselectAll || (() => {});
        this.onBatchAnalyze = callbacks.onBatchAnalyze || (() => {});
        this.onBatchDelete = callbacks.onBatchDelete || (() => {});
        
        this.listenersAttached = new WeakSet();
    }
    
    render(images = [], analyses = {}, selectedImages = new Set()) {
        const hasImages = images.length > 0;
        
        if (!hasImages) {
            return ''; // Return empty - the empty state is handled by ImageAnalyzer
        }
        
        const selectedCount = selectedImages.size;
        const allSelected = selectedCount === images.length && hasImages;
        
        return `
            <div class="image-table-wrapper">
                <div class="image-table-container">
                    ${this.renderBatchOperations(images.length, selectedCount, allSelected)}
                    <div class="table-scroll-container">
                        ${this.renderTable(images, analyses, selectedImages)}
                    </div>
                </div>
            </div>
        `;
    }
    
    renderBatchOperations(totalCount, selectedCount, allSelected) {
        return `
            <div class="batch-operations">
                <div class="batch-actions">
                    <button class="btn btn-sm ${allSelected ? 'btn-active' : ''}" 
                            id="btn-select-all"
                            ${totalCount === 0 ? 'disabled' : ''}>
                        <i class="fas ${allSelected ? 'fa-check-square' : 'fa-square'}"></i>
                        ${allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                    
                    <button class="btn btn-sm btn-primary" 
                            id="btn-batch-analyze"
                            ${selectedCount === 0 ? 'disabled' : ''}>
                        <i class="fas fa-brain"></i>
                        Analyze Selected (${selectedCount})
                    </button>
                    
                    <button class="btn btn-sm btn-danger" 
                            id="btn-batch-delete"
                            ${selectedCount === 0 ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                        Delete Selected
                    </button>
                </div>
                
                <div class="batch-info">
                    <span class="selection-status">
                        ${selectedCount} of ${totalCount} selected
                    </span>
                </div>
            </div>
        `;
    }
    
    renderTable(images, analyses, selectedImages) {
        return `
            <div class="table-wrapper">
                <table class="images-table">
                    <thead>
                        <tr>
                            <th class="checkbox-column sticky-column">
                                <input type="checkbox" 
                                       id="checkbox-header"
                                       ${selectedImages.size === images.length ? 'checked' : ''}>
                            </th>
                            <th class="order-column sticky-column">#</th>
                            <th class="preview-column">Preview</th>
                            <th class="details-column">Details</th>
                            <th class="analysis-column">Analysis</th>
                            <th class="triples-column">Triples</th>
                            <th class="actions-column">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${images.map((img, idx) => this.renderRow(
                            img, 
                            idx + 1, 
                            analyses[img.id], 
                            selectedImages.has(img.id)
                        )).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    renderRow(image, order, analysis, isSelected) {
        const hasAnalysis = !!analysis && !analysis.error;
        const tripleCount = analysis?.triples?.length || 0;
        
        return `
            <tr class="image-row ${isSelected ? 'selected' : ''}" data-image-id="${image.id}">
                <td class="checkbox-column sticky-column">
                    <input type="checkbox" 
                           class="checkbox-row" 
                           data-image-id="${image.id}"
                           ${isSelected ? 'checked' : ''}>
                </td>
                
                <td class="order-column sticky-column">
                    <span class="order-number">${order}</span>
                </td>
                
                <td class="preview-column">
                    <div class="image-preview-cell">
                        ${image.src ? 
                            `<img src="${image.src}" 
                                  alt="${this.escapeHtml(image.alt || 'Image')}" 
                                  class="table-image-preview" />` :
                            `<div class="table-image-placeholder">
                                <i class="fas fa-image"></i>
                            </div>`}
                    </div>
                </td>
                
                <td class="details-column">
                    <div class="image-details">
                        <div class="image-alt">
                            ${this.escapeHtml(image.alt || 'No description')}
                        </div>
                        <div class="image-meta">
                            <span class="badge badge-${image.type || 'figure'}">
                                ${image.type || 'figure'}
                            </span>
                            <span class="image-score">
                                Score: ${Math.round((image.score || 0.5) * 100)}%
                            </span>
                        </div>
                    </div>
                </td>
                
                <td class="analysis-column">
                    ${this.renderAnalysisStatus(analysis)}
                </td>
                
                <td class="triples-column">
                    ${this.renderTriplesStatus(tripleCount, hasAnalysis)}
                </td>
                
                <td class="actions-column">
                    <div class="action-buttons">
                        ${!hasAnalysis ? `
                            <button class="btn-icon btn-analyze" 
                                    data-image-id="${image.id}"
                                    title="Analyze">
                                <i class="fas fa-brain"></i>
                            </button>
                        ` : `
                            <button class="btn-icon btn-view-triples" 
                                    data-image-id="${image.id}"
                                    title="View/Edit Triples">
                                <i class="fas fa-project-diagram"></i>
                            </button>
                        `}
                        
                        <button class="btn-icon btn-delete" 
                                data-image-id="${image.id}"
                                title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
    
    renderAnalysisStatus(analysis) {
        if (!analysis) {
            return `
                <div class="analysis-status not-analyzed">
                    <i class="fas fa-circle"></i>
                    <span>Not Analyzed</span>
                </div>
            `;
        }
        
        if (analysis.error) {
            return `
                <div class="analysis-status error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Failed</span>
                </div>
            `;
        }
        
        const confidence = Math.round((analysis.quality?.confidence || 0) * 100);
        
        return `
            <div class="analysis-status analyzed">
                <i class="fas fa-check-circle"></i>
                <div class="analysis-info">
                    <span class="status-text">Analyzed</span>
                    <span class="confidence">${confidence}% confidence</span>
                </div>
            </div>
        `;
    }
    
    renderTriplesStatus(tripleCount, hasAnalysis) {
        if (!hasAnalysis) {
            return `
                <div class="triples-status not-available">
                    <span>-</span>
                </div>
            `;
        }
        
        const statusClass = tripleCount > 0 ? 'has-triples' : 'no-triples';
        const statusIcon = tripleCount > 0 ? 'fa-check' : 'fa-times';
        const statusColor = tripleCount > 0 ? 'success' : 'warning';
        
        return `
            <div class="triples-status ${statusClass}">
                <span class="triple-count badge badge-${statusColor}">
                    <i class="fas ${statusIcon}"></i>
                    ${tripleCount} triple${tripleCount !== 1 ? 's' : ''}
                </span>
            </div>
        `;
    }
    
    attachEventHandlers(container) {
        if (!container) return;
        
        if (this.listenersAttached.has(container)) {
            console.log('⚠️ Handlers already attached to this container');
            return;
        }
        
        this.listenersAttached.add(container);
        
        // Setup horizontal scrolling with shift key
        this.setupHorizontalScroll(container);
        
        // Select/Deselect All button
        this.attachHandler(container, '#btn-select-all', 'click', (e) => {
            const isSelectAll = e.currentTarget.textContent.includes('Select All');
            if (isSelectAll) {
                this.onSelectAll();
            } else {
                this.onDeselectAll();
            }
        });
        
        // Header checkbox
        this.attachHandler(container, '#checkbox-header', 'change', (e) => {
            if (e.target.checked) {
                this.onSelectAll();
            } else {
                this.onDeselectAll();
            }
        });
        
        // Row checkboxes
        this.attachHandler(container, '.checkbox-row', 'change', () => {
            const selectedIds = Array.from(
                container.querySelectorAll('.checkbox-row:checked')
            ).map(cb => cb.dataset.imageId);
            
            this.onSelect(selectedIds);
            this.updateHeaderCheckbox(container);
        }, true);
        
        // Batch operations
        this.attachHandler(container, '#btn-batch-analyze', 'click', () => {
            this.onBatchAnalyze();
        });
        
        this.attachHandler(container, '#btn-batch-delete', 'click', () => {
            this.onBatchDelete();
        });
        
        // Individual actions
        this.attachHandler(container, '.btn-analyze', 'click', (e) => {
            const imageId = e.currentTarget.dataset.imageId;
            this.onAnalyze(imageId);
        }, true);
        
        this.attachHandler(container, '.btn-view-triples', 'click', (e) => {
            const imageId = e.currentTarget.dataset.imageId;
            this.onViewTriples(imageId);
        }, true);
        
        this.attachHandler(container, '.btn-delete', 'click', (e) => {
            const imageId = e.currentTarget.dataset.imageId;
            this.onDelete(imageId);
        }, true);
        
        console.log('✅ Event handlers attached successfully');
    }
    
    setupHorizontalScroll(container) {
        const scrollContainer = container.querySelector('.table-scroll-container');
        if (!scrollContainer) return;
        
        // Add scroll hint
        const scrollHint = document.createElement('div');
        scrollHint.className = 'scroll-hint';
        scrollHint.textContent = 'Hold Shift + Scroll to scroll horizontally';
        scrollContainer.appendChild(scrollHint);
        
        let hintTimeout;
        
        scrollContainer.addEventListener('wheel', (e) => {
            if (e.shiftKey) {
                e.preventDefault();
                scrollContainer.scrollLeft += e.deltaY;
                
                // Show hint
                scrollHint.classList.add('visible');
                clearTimeout(hintTimeout);
                hintTimeout = setTimeout(() => {
                    scrollHint.classList.remove('visible');
                }, 1000);
            }
        });
        
        // Add scroll shadow effect
        scrollContainer.addEventListener('scroll', () => {
            if (scrollContainer.scrollLeft > 0) {
                scrollContainer.classList.add('scrolled');
            } else {
                scrollContainer.classList.remove('scrolled');
            }
        });
    }
    
    attachHandler(container, selector, event, handler, useAll = false) {
        if (useAll) {
            const elements = container.querySelectorAll(selector);
            elements.forEach(element => {
                element.addEventListener(event, handler);
            });
        } else {
            const element = container.querySelector(selector);
            if (element) {
                element.addEventListener(event, handler);
            }
        }
    }
    
    updateHeaderCheckbox(container) {
        const headerCheckbox = container.querySelector('#checkbox-header');
        if (!headerCheckbox) return;
        
        const rowCheckboxes = container.querySelectorAll('.checkbox-row');
        const checkedCount = container.querySelectorAll('.checkbox-row:checked').length;
        
        if (checkedCount === 0) {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = false;
        } else if (checkedCount === rowCheckboxes.length) {
            headerCheckbox.checked = true;
            headerCheckbox.indeterminate = false;
        } else {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = true;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

export default ImageTableView;
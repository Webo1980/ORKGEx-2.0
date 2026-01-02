// src/content/modules/ui/RAGPanelRenderer.js - Main Controller
(function(global) {
    'use strict';
    
    class RAGPanelRenderer {
        constructor(container, config = {}) {
            this.container = container;
            this.config = {
                enableExport: true,
                enableSelection: true,
                enableActions: true,
                showConfidence: true,
                showMetadata: true,
                ...config
            };
            
            // Initialize sub-renderers
            this.textRenderer = null;
            this.imagesRenderer = null;
            this.tablesRenderer = null;
            
            // Callbacks
            this.onItemClickedCallback = null;
            this.onSectionToggledCallback = null;
            this.onItemHoveredCallback = null;
        }
        
        init() {
            // Initialize renderers
            this.initializeRenderers();
            console.log('RAGPanelRenderer initialized');
        }
        
        initializeRenderers() {
            // Initialize text renderer
            if (typeof RAGPanelTextRenderer !== 'undefined') {
                this.textRenderer = new RAGPanelTextRenderer({
                    showConfidence: this.config.showConfidence,
                    showMetadata: this.config.showMetadata,
                    enableSelection: this.config.enableSelection,
                    enableActions: this.config.enableActions
                });
            }
            
            // Initialize images renderer
            if (typeof RAGPanelImagesRenderer !== 'undefined') {
                this.imagesRenderer = new RAGPanelImagesRenderer({
                    enableExport: this.config.enableExport,
                    enableLightbox: true,
                    showScoreBadge: this.config.showConfidence
                });
            }
            
            // Initialize tables renderer
            if (typeof RAGPanelTablesRenderer !== 'undefined') {
                this.tablesRenderer = new RAGPanelTablesRenderer({
                    enableExport: this.config.enableExport,
                    enablePreview: true,
                    enableJumpTo: this.config.enableActions
                });
            }
            
            console.log('RAGPanelRenderer initialized with sub-renderers');
        }
        
        renderTextPanel(textData, panelElement) {
            if (!this.textRenderer) {
                console.warn('Text renderer not available');
                return 0;
            }
            
            const count = this.textRenderer.render(textData, panelElement);
            
            // Wire up event handlers for text items
            this.setupTextPanelEventHandlers(panelElement);
            
            return count;
        }
        
        renderImagesPanel(images, panelElement) {
            if (!this.imagesRenderer) {
                console.warn('Images renderer not available');
                return 0;
            }
            
            const count = this.imagesRenderer.render(images, panelElement);
            
            // Wire up event handlers for image items
            this.setupImagePanelEventHandlers(panelElement);
            
            return count;
        }
        
        renderTablesPanel(tables, panelElement) {
            if (!this.tablesRenderer) {
                console.warn('Tables renderer not available');
                return 0;
            }
            
            const count = this.tablesRenderer.render(tables, panelElement);
            
            // Wire up event handlers for table items
            this.setupTablePanelEventHandlers(panelElement);
            
            return count;
        }
        
        setupTextPanelEventHandlers(panelElement) {
            if (!panelElement) return;
            
            panelElement.addEventListener('click', (e) => {
                // Handle text item clicks
                const textItem = e.target.closest('.text-item');
                if (textItem && !e.target.closest('.item-checkbox') && !e.target.closest('button')) {
                    this.handleItemClick('text', textItem.dataset.id, textItem);
                }
                
                // Handle property header clicks for toggle
                const propertyHeader = e.target.closest('.property-header');
                if (propertyHeader && !e.target.closest('.select-all-btn')) {
                    const propertyGroup = propertyHeader.closest('.property-group');
                    if (propertyGroup) {
                        const isExpanded = propertyGroup.classList.contains('expanded');
                        this.handleSectionToggle(propertyGroup.dataset.propertyId, !isExpanded);
                    }
                }
            });
        }
        
        setupImagePanelEventHandlers(panelElement) {
            if (!panelElement) return;
            
            panelElement.addEventListener('click', (e) => {
                const imageItem = e.target.closest('.image-item');
                if (imageItem && !e.target.closest('button')) {
                    this.handleItemClick('image', imageItem.dataset.id, imageItem);
                }
            });
        }
        
        setupTablePanelEventHandlers(panelElement) {
            if (!panelElement) return;
            
            panelElement.addEventListener('click', (e) => {
                const tableItem = e.target.closest('.table-item');
                if (tableItem && !e.target.closest('button')) {
                    this.handleItemClick('table', tableItem.dataset.id, tableItem);
                }
            });
        }
        
        renderAll(data) {
            const results = {
                text: 0,
                images: 0,
                tables: 0
            };
            
            // Find panels by data-panel attribute
            const textPanel = this.container.querySelector('[data-panel="text"]');
            const imagesPanel = this.container.querySelector('[data-panel="images"]');
            const tablesPanel = this.container.querySelector('[data-panel="tables"]');
            
            // Render text panel
            if (textPanel && data.text) {
                results.text = this.renderTextPanel(data.text, textPanel);
                this.updateTabCount('text', results.text);
            }
            
            // Render images panel
            if (imagesPanel && data.images) {
                results.images = this.renderImagesPanel(data.images, imagesPanel);
                this.updateTabCount('images', results.images);
            }
            
            // Render tables panel
            if (tablesPanel && data.tables) {
                results.tables = this.renderTablesPanel(data.tables, tablesPanel);
                this.updateTabCount('tables', results.tables);
            }
            
            return results;
        }
        
        updateTabCount(tabType, count) {
            const tab = this.container.querySelector(`[data-tab="${tabType}"]`);
            if (tab) {
                const countBadge = tab.querySelector('.tab-count');
                if (countBadge) {
                    countBadge.textContent = count > 0 ? count : '';
                    countBadge.style.display = count > 0 ? 'inline-block' : 'none';
                }
            }
        }
        
        clearAllPanels() {
            const panels = this.container.querySelectorAll('.panel-content');
            panels.forEach(panel => {
                panel.innerHTML = '';
            });
            
            // Reset counts
            this.container.querySelectorAll('.tab-count').forEach(badge => {
                badge.textContent = '';
                badge.style.display = 'none';
            });
        }
        
        getSelectedItems() {
            const selected = {
                text: [],
                images: [],
                tables: []
            };
            
            // Get selected text items
            if (this.textRenderer) {
                selected.text = Array.from(this.textRenderer.selectedItems);
            }
            
            // Get selected images
            if (this.imagesRenderer) {
                selected.images = Array.from(this.imagesRenderer.selectedImages);
            }
            
            // Get selected tables
            if (this.tablesRenderer) {
                selected.tables = Array.from(this.tablesRenderer.selectedTables);
            }
            
            return selected;
        }
        
        exportAllData() {
            const data = {
                text: [],
                images: [],
                tables: []
            };
            
            // Collect text data
            const textItems = this.container.querySelectorAll('[data-panel="text"] .text-item');
            textItems.forEach(item => {
                data.text.push({
                    id: item.dataset.id,
                    text: item.dataset.fullText || item.querySelector('.text-content-span')?.textContent,
                    confidence: item.dataset.confidence,
                    selected: item.classList.contains('selected')
                });
            });
            
            // Collect image data
            const imageItems = this.container.querySelectorAll('[data-panel="images"] .image-item');
            imageItems.forEach(item => {
                data.images.push({
                    id: item.dataset.id,
                    caption: item.dataset.caption,
                    src: item.dataset.src,
                    selected: item.classList.contains('selected')
                });
            });
            
            // Collect table data
            const tableItems = this.container.querySelectorAll('[data-panel="tables"] .table-item');
            tableItems.forEach(item => {
                data.tables.push({
                    id: item.dataset.id,
                    caption: item.dataset.caption,
                    rows: item.dataset.rows,
                    columns: item.dataset.cols,
                    selected: item.classList.contains('selected')
                });
            });
            
            // Create comprehensive CSV
            let csv = 'Type,ID,Content/Caption,Selected,Additional Info\n';
            
            data.text.forEach(item => {
                csv += `"Text","${item.id}","${(item.text || '').replace(/"/g, '""')}","${item.selected}","Confidence: ${item.confidence || 'N/A'}"\n`;
            });
            
            data.images.forEach(item => {
                csv += `"Image","${item.id}","${(item.caption || '').replace(/"/g, '""')}","${item.selected}","Source: ${item.src || 'N/A'}"\n`;
            });
            
            data.tables.forEach(item => {
                csv += `"Table","${item.id}","${(item.caption || '').replace(/"/g, '""')}","${item.selected}","Size: ${item.rows}×${item.columns}"\n`;
            });
            
            // Download
            this.downloadCSV(csv, 'rag-results-export');
        }
        
        downloadCSV(csv, filename) {
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}-${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
        
        // ========================================
        // Event Callback Methods
        // ========================================
        
        onItemClicked(callback) {
            this.onItemClickedCallback = callback;
        }
        
        onSectionToggled(callback) {
            this.onSectionToggledCallback = callback;
        }
        
        onItemHovered(callback) {
            this.onItemHoveredCallback = callback;
        }
        
        // ========================================
        // Internal Event Handlers
        // ========================================
        
        handleItemClick(type, id, element) {
            if (this.onItemClickedCallback) {
                this.onItemClickedCallback(type, id, element);
            }
        }
        
        handleSectionToggle(sectionId, isExpanded) {
            if (this.onSectionToggledCallback) {
                this.onSectionToggledCallback(sectionId, isExpanded);
            }
        }
        
        handleItemHover(element, isHovering) {
            if (this.onItemHoveredCallback) {
                this.onItemHoveredCallback(element, isHovering);
            }
        }
        
        // ========================================
        // Cleanup
        // ========================================
        
        destroy() {
            // Clean up sub-renderers
            this.textRenderer = null;
            this.imagesRenderer = null;
            this.tablesRenderer = null;
            
            // Clear callbacks
            this.onItemClickedCallback = null;
            this.onSectionToggledCallback = null;
            this.onItemHoveredCallback = null;
            
            // Clear panels
            this.clearAllPanels();
            
            console.log('RAGPanelRenderer destroyed');
        }
    }
    
    // Export to global scope
    global.RAGPanelRenderer = RAGPanelRenderer;
    
    console.log('RAGPanelRenderer main controller loaded');
    
})(typeof window !== 'undefined' ? window : this);
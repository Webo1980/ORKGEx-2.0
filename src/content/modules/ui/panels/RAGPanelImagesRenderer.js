// src/content/modules/ui/panels/RAGPanelImagesRenderer.js
(function(global) {
    'use strict';
    
    class RAGPanelImagesRenderer {
        constructor(config = {}) {
            this.config = {
                enableViewToggle: true,
                showScoreBadge: true,
                enableLightbox: true,
                enableExport: true,
                enableJumpTo: true,
                ...config
            };
            
            this.currentView = 'grid';
            this.selectedImages = new Set();
        }
        
        render(images, panelElement) {
            if (!panelElement) return 0;
            
            const content = panelElement.querySelector('.panel-content');
            if (!content) return 0;
            
            content.innerHTML = '';
            
            if (!images || images.length === 0) {
                content.innerHTML = `
                    <div class="empty-state">
                        <svg class="orkg-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p>No images found</p>
                    </div>
                `;
                return 0;
            }
            
            // Add gallery controls
            if (this.config.enableViewToggle) {
                const controls = this.createGalleryControls(images.length);
                content.appendChild(controls);
            }
            
            // Create image grid
            const grid = this.createImageGrid(images);
            content.appendChild(grid);
            
            // Add summary
            const summary = this.createImagesSummary(images);
            content.appendChild(summary);
            
            // Setup event handlers
            this.setupEventHandlers(content);
            
            return images.length;
        }
        
        createGalleryControls(count) {
            const controls = document.createElement('div');
            controls.className = 'gallery-controls';
            
            controls.innerHTML = `
                <div class="view-options">
                    <button class="view-btn active" data-view="grid" title="Grid view">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                    </button>
                    <button class="view-btn" data-view="list" title="List view">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="gallery-info">${count} image${count !== 1 ? 's' : ''}</div>
            `;
            
            return controls;
        }
        
        createImageGrid(images) {
            const grid = document.createElement('div');
            grid.className = 'image-grid';
            grid.dataset.view = this.currentView;
            
            images.forEach((img, index) => {
                const item = this.createImageItem(img, index);
                grid.appendChild(item);
            });
            
            return grid;
        }
        
        createImageItem(img, index) {
            const itemId = img.id || `image_${Date.now()}_${index}`;
            const caption = img.caption || img.alt || img.title || `Image ${index + 1}`;
            const score = img.score || img.intelligence?.score;
            
            const item = document.createElement('div');
            item.className = 'image-item';
            item.dataset.id = itemId;
            
            let html = `<div class="image-thumb">`;
            
            if (img.src) {
                html += `
                    <img src="${img.src}" alt="${this.escapeHtml(caption)}" loading="lazy" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                `;
            }
            
            html += `
                <div class="image-placeholder" ${img.src ? 'style="display:none;"' : ''}>
                    <svg class="orkg-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
            `;
            
            if (img.type) {
                html += `<div class="image-type">${img.type}</div>`;
            }
            
            html += `</div>`;
            
            html += `<div class="image-caption">${this.escapeHtml(caption)}</div>`;
            
            // Add action buttons (Jump to and Zoom)
            html += `
                <div class="image-item-actions">
                    <button class="action-jump" title="Jump to image">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </button>
                    <button class="action-zoom" title="Zoom image">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                    </button>
                </div>
            `;
            
            if (score !== undefined && this.config.showScoreBadge) {
                html += `<div class="score-badge">${Math.round(score * 100)}%</div>`;
            }
            
            item.innerHTML = html;
            item.dataset.caption = caption;
            item.dataset.src = img.src || '';
            
            return item;
        }
        
        createImagesSummary(images) {
            const summary = document.createElement('div');
            summary.className = 'images-summary';
            
            // Calculate statistics
            let totalWithScore = 0;
            let totalScore = 0;
            let totalWithDimensions = 0;
            const types = new Map();
            
            images.forEach(img => {
                if (img.score !== undefined) {
                    totalWithScore++;
                    totalScore += img.score;
                }
                if (img.dimensions) {
                    totalWithDimensions++;
                }
                if (img.type) {
                    types.set(img.type, (types.get(img.type) || 0) + 1);
                }
            });
            
            const avgScore = totalWithScore > 0 ? Math.round((totalScore / totalWithScore) * 100) : null;
            
            summary.innerHTML = `
                <div class="summary-title">Summary</div>
                <div class="summary-stats">
                    <div class="summary-stat">
                        <span class="stat-label">Total Images</span>
                        <span class="stat-value">${images.length}</span>
                    </div>
                    ${avgScore !== null ? `
                        <div class="summary-stat">
                            <span class="stat-label">Avg Score</span>
                            <span class="stat-value">${avgScore}%</span>
                        </div>
                    ` : ''}
                    ${types.size > 0 ? `
                        <div class="summary-stat">
                            <span class="stat-label">Types</span>
                            <span class="stat-value">${types.size}</span>
                        </div>
                    ` : ''}
                    ${totalWithDimensions > 0 ? `
                        <div class="summary-stat">
                            <span class="stat-label">With Dimensions</span>
                            <span class="stat-value">${totalWithDimensions}</span>
                        </div>
                    ` : ''}
                </div>
                ${this.config.enableExport ? `
                    <button class="export-images-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export Image List
                    </button>
                ` : ''}
            `;
            
            return summary;
        }
        
        setupEventHandlers(container) {
            container.addEventListener('click', (e) => {
                // View toggle buttons
                const viewBtn = e.target.closest('.view-btn');
                if (viewBtn) {
                    this.toggleView(viewBtn.dataset.view, container);
                }
                
                // Jump to image action
                const jumpBtn = e.target.closest('.action-jump');
                if (jumpBtn) {
                    const item = jumpBtn.closest('.image-item');
                    this.handleJumpToImage(item);
                }
                
                // Zoom image action
                const zoomBtn = e.target.closest('.action-zoom');
                if (zoomBtn) {
                    const item = zoomBtn.closest('.image-item');
                    this.handleZoomImage(item);
                }
                
                // Export button
                const exportBtn = e.target.closest('.export-images-btn');
                if (exportBtn) {
                    this.handleExport(container);
                }
                
                // Image click (for selection)
                const imageItem = e.target.closest('.image-item');
                if (imageItem && !e.target.closest('button')) {
                    this.handleImageClick(imageItem);
                }
            });
        }
        
        toggleView(view, container) {
            this.currentView = view;
            const grid = container.querySelector('.image-grid');
            
            if (grid) {
                grid.dataset.view = view;
                
                // Update button states
                container.querySelectorAll('.view-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.view === view);
                });
            }
        }
        
        handleImageClick(item) {
            item.classList.toggle('selected');
            
            const id = item.dataset.id;
            if (item.classList.contains('selected')) {
                this.selectedImages.add(id);
            } else {
                this.selectedImages.delete(id);
            }
        }
        
        handleJumpToImage(item) {
            const id = item.dataset.id;
            const caption = item.dataset.caption;
            const src = item.dataset.src;
            
            // Find image in document
            const images = document.querySelectorAll('img');
            let targetImage = null;
            
            // Try to find by id first
            if (id) {
                targetImage = document.getElementById(id);
            }
            
            // If not found, try to find by src
            if (!targetImage && src) {
                images.forEach(img => {
                    if (img.src === src || img.src.includes(src) || src.includes(img.src)) {
                        targetImage = img;
                    }
                });
            }
            
            // If still not found, try to find by alt text
            if (!targetImage && caption) {
                images.forEach(img => {
                    if (img.alt && (img.alt.includes(caption) || caption.includes(img.alt))) {
                        targetImage = img;
                    }
                });
            }
            
            if (targetImage) {
                // Scroll to the image
                targetImage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Highlight the image temporarily
                targetImage.classList.add('orkg-jump-highlight');
                setTimeout(() => targetImage.classList.remove('orkg-jump-highlight'), 3000);
                
                // Trigger custom event
                const event = new CustomEvent('orkg-jump-to-image', {
                    detail: { id, caption, element: targetImage }
                });
                document.dispatchEvent(event);
            } else {
                console.warn('Image not found in document:', caption);
            }
            
            // Visual feedback on the item
            item.classList.add('orkg-jump-highlight');
            setTimeout(() => item.classList.remove('orkg-jump-highlight'), 2000);
        }
        
        handleZoomImage(item) {
            const src = item.dataset.src;
            const caption = item.dataset.caption;
            
            if (this.config.enableLightbox && src) {
                this.createLightbox(src, caption);
            }
        }
        
        createLightbox(src, caption) {
            const lightbox = document.createElement('div');
            lightbox.className = 'orkg-lightbox';
            
            lightbox.innerHTML = `
                <div class="lightbox-backdrop"></div>
                <div class="lightbox-content">
                    <img src="${src}" alt="${this.escapeHtml(caption)}">
                    <div class="lightbox-caption">${this.escapeHtml(caption)}</div>
                    <button class="lightbox-close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
            
            document.body.appendChild(lightbox);
            
            // Add close handlers
            lightbox.addEventListener('click', (e) => {
                if (e.target.closest('.lightbox-close') || e.target.classList.contains('lightbox-backdrop')) {
                    lightbox.remove();
                }
            });
            
            // Close on escape key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    lightbox.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }
        
        handleExport(container) {
            const images = container.querySelectorAll('.image-item');
            const data = [];
            
            images.forEach((item, index) => {
                const score = item.querySelector('.score-badge');
                data.push({
                    id: item.dataset.id,
                    caption: item.dataset.caption,
                    src: item.dataset.src || 'N/A',
                    selected: item.classList.contains('selected'),
                    score: score ? score.textContent : 'N/A'
                });
            });
            
            // Create CSV
            const csv = 'ID,Caption,Source,Selected,Score\n' +
                data.map(row => 
                    `"${row.id}","${row.caption}","${row.src}","${row.selected}","${row.score}"`
                ).join('\n');
            
            this.downloadCSV(csv, 'images-export');
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
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
    }
    
    global.RAGPanelImagesRenderer = RAGPanelImagesRenderer;
    
})(typeof window !== 'undefined' ? window : this);
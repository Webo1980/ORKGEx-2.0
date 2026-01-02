// src/content/modules/ui/panels/RAGPanelTextRenderer.js
(function(global) {
    'use strict';
    
    class RAGPanelTextRenderer {
        constructor(config = {}) {
            this.config = {
                showConfidence: true,
                showMetadata: true,
                showPropertyColors: true,
                enableSelection: true,
                enableExpandText: true,
                showTimeAgo: true,
                maxTextLength: 200,
                enableActions: true,
                ...config
            };
            
            this.expandedSections = new Set();
            this.selectedItems = new Set();
            this.expandedTexts = new Set();
            this.propertyColors = new Map();
            this.currentFilter = 'all';
            
            this.colorPalette = [
                '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
                '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3'
            ];
        }
        
        render(textData, panelElement) {
            if (!panelElement) return 0;
            
            const content = panelElement.querySelector('.panel-content');
            if (!content) return 0;
            
            content.innerHTML = '';
            let totalCount = 0;
            
            // Add filter controls (removed Recent button)
            const filterControls = this.createFilterControls();
            content.appendChild(filterControls);
            
            // Create container for property groups
            const container = document.createElement('div');
            container.className = 'text-groups-container';
            
            if (textData instanceof Map) {
                const sortedProperties = Array.from(textData.entries())
                    .sort((a, b) => b[1].length - a[1].length);
                
                sortedProperties.forEach(([property, items], index) => {
                    const propertyLabel = property || 'Unknown Property';
                    // All groups start collapsed
                    const propertyGroup = this.createPropertyGroup(propertyLabel, items, index, false);
                    container.appendChild(propertyGroup);
                    totalCount += items.length;
                });
            } else if (Array.isArray(textData)) {
                const propertyGroup = this.createPropertyGroup('All Highlights', textData, 0, false);
                container.appendChild(propertyGroup);
                totalCount = textData.length;
            }
            
            content.appendChild(container);
            
            // Add export footer
            if (totalCount > 0) {
                const footer = this.createFooter(totalCount, textData.size || 1);
                content.appendChild(footer);
            } else {
                content.innerHTML = '<div class="empty-state">No text highlights found</div>';
            }
            
            // Setup event handlers
            this.setupEventHandlers(content);
            
            return totalCount;
        }
        
        createFilterControls() {
            const controls = document.createElement('div');
            controls.className = 'filter-controls';
            
            controls.innerHTML = `
                <div class="filter-header">
                    <span class="filter-label">FILTER</span>
                </div>
                <div class="filter-options">
                    <button class="filter-btn active" data-filter="all" title="Show all text highlights">All</button>
                    <button class="filter-btn" data-filter="high-confidence" title="Show only highlights with 80% or higher confidence score from AI analysis">
                        High Confidence
                        <svg class="info-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                        </svg>
                    </button>
                </div>
            `;
            
            return controls;
        }
        
        createPropertyGroup(propertyLabel, items, index, shouldExpand = false) {
            const propertyId = this.sanitizeId(propertyLabel);
            const isExpanded = shouldExpand; // Always false by default
            
            const group = document.createElement('div');
            group.className = 'property-group';
            group.dataset.propertyId = propertyId;
            
            if (isExpanded) {
                group.classList.add('expanded');
                this.expandedSections.add(propertyId);
            }
            
            // Create collapsible header
            const header = this.createPropertyHeader(propertyLabel, items.length, propertyId);
            group.appendChild(header);
            
            // Create items container
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'property-items';
            itemsContainer.dataset.propertyId = propertyId;
            
            // Add items
            const propertyColor = this.getPropertyColor(propertyLabel);
            items.forEach((item, idx) => {
                const textItem = this.createTextItem(item, idx, propertyColor);
                itemsContainer.appendChild(textItem);
            });
            
            group.appendChild(itemsContainer);
            
            return group;
        }
        
        createPropertyHeader(label, count, propertyId) {
            const header = document.createElement('div');
            header.className = 'property-header';
            header.dataset.propertyId = propertyId;
            
            const propertyColor = this.getPropertyColor(label);
            
            header.innerHTML = `
                <button class="toggle-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
                <span class="property-color-dot" style="background: ${propertyColor};"></span>
                <span class="property-name">${this.escapeHtml(label)}</span>
                <span class="property-count">${count}</span>
                <button class="select-all-btn" data-property-id="${propertyId}" title="Select all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                    </svg>
                </button>
            `;
            
            return header;
        }
        
        createTextItem(item, index, propertyColor) {
            const itemId = item.id || `text_${Date.now()}_${index}`;
            const isSelected = this.selectedItems.has(itemId);
            const isExpanded = this.expandedTexts.has(itemId);
            
            const div = document.createElement('div');
            div.className = 'text-item';
            div.dataset.id = itemId;
            div.dataset.confidence = item.confidence || 0;
            div.dataset.timestamp = item.timestamp || Date.now();
            
            if (isSelected) {
                div.classList.add('selected');
            }
            
            // Prepare text
            let displayText = item.text || item.sentence || item.value || '';
            const fullText = displayText;
            let isTruncated = false;
            
            if (!isExpanded && displayText.length > this.config.maxTextLength) {
                displayText = displayText.substring(0, this.config.maxTextLength) + '...';
                isTruncated = true;
            }
            
            // Build item HTML
            let html = `
                <input type="checkbox" class="item-checkbox" ${isSelected ? 'checked' : ''}>
                <div class="color-dot" style="background: ${propertyColor};"></div>
                <div class="text-content">
                    <div class="text-preview">
                        <span class="text-content-span">${this.escapeHtml(displayText)}</span>
                        ${isTruncated ? `<button class="expand-btn" data-id="${itemId}">Show more</button>` : ''}
                        ${isExpanded ? `<button class="expand-btn" data-id="${itemId}">Show less</button>` : ''}
                    </div>
            `;
            
            // Add metadata
            if (this.config.showMetadata) {
                const metaParts = [];
                if (item.section) metaParts.push(`Section: ${item.section}`);
                if (item.sentenceIndex !== undefined) metaParts.push(`Sentence ${item.sentenceIndex + 1}`);
                if (this.config.showTimeAgo && item.timestamp) {
                    metaParts.push(this.getTimeAgo(item.timestamp));
                }
                
                if (metaParts.length > 0) {
                    html += `<div class="text-meta">${this.escapeHtml(metaParts.join(' • '))}</div>`;
                }
            }
            
            html += '</div>';
            
            // Add actions
            if (this.config.enableActions) {
                html += `
                    <div class="item-actions">
                        <button class="action-jump" title="Jump to text">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </button>
                        <button class="action-copy" title="Copy text">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                        </button>
                    </div>
                `;
            }
            
            // Add confidence badge
            if (this.config.showConfidence && item.confidence !== undefined) {
                const percent = Math.round(item.confidence * 100);
                const color = item.confidence >= 0.8 ? '#28a745' : 
                             item.confidence >= 0.5 ? '#ffc107' : '#dc3545';
                html += `<span class="confidence-badge" style="background: ${color};">${percent}%</span>`;
            }
            
            div.innerHTML = html;
            div.dataset.fullText = fullText;
            
            return div;
        }
        
        createFooter(totalCount, groupCount) {
            const footer = document.createElement('div');
            footer.className = 'panel-footer';
            
            footer.innerHTML = `
                <div class="footer-stats">
                    <span>${totalCount} item${totalCount !== 1 ? 's' : ''}</span>
                    <span>${groupCount} group${groupCount !== 1 ? 's' : ''}</span>
                </div>
                <button class="export-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export
                </button>
            `;
            
            return footer;
        }
        
        setupEventHandlers(container) {
            container.addEventListener('click', (e) => {
                // Property header toggle
                const header = e.target.closest('.property-header');
                if (header && !e.target.closest('.select-all-btn')) {
                    this.toggleSection(header.dataset.propertyId);
                }
                
                // Select all button
                if (e.target.closest('.select-all-btn')) {
                    const btn = e.target.closest('.select-all-btn');
                    this.toggleSelectAll(btn.dataset.propertyId);
                }
                
                // Item checkbox
                const checkbox = e.target.closest('.item-checkbox');
                if (checkbox) {
                    const item = checkbox.closest('.text-item');
                    this.toggleItemSelection(item.dataset.id, checkbox.checked);
                }
                
                // Expand button
                const expandBtn = e.target.closest('.expand-btn');
                if (expandBtn) {
                    e.stopPropagation();
                    this.toggleTextExpansion(expandBtn.dataset.id);
                }
                
                // Filter buttons
                const filterBtn = e.target.closest('.filter-btn');
                if (filterBtn) {
                    this.applyFilter(filterBtn.dataset.filter, container);
                }
                
                // Export button
                const exportBtn = e.target.closest('.export-btn');
                if (exportBtn) {
                    this.handleExport(container);
                }
                
                // Jump action
                const jumpBtn = e.target.closest('.action-jump');
                if (jumpBtn) {
                    const item = jumpBtn.closest('.text-item');
                    this.handleJumpToText(item);
                }
                
                // Copy action
                const copyBtn = e.target.closest('.action-copy');
                if (copyBtn) {
                    const item = copyBtn.closest('.text-item');
                    this.handleCopyText(item);
                }
            });
        }
        
        toggleSection(propertyId) {
            const group = document.querySelector(`.property-group[data-property-id="${propertyId}"]`);
            if (!group) return;
            
            if (this.expandedSections.has(propertyId)) {
                this.expandedSections.delete(propertyId);
                group.classList.remove('expanded');
            } else {
                this.expandedSections.add(propertyId);
                group.classList.add('expanded');
            }
        }
        
        toggleSelectAll(propertyId) {
            const group = document.querySelector(`.property-group[data-property-id="${propertyId}"]`);
            if (!group) return;
            
            const items = group.querySelectorAll('.text-item');
            const checkboxes = group.querySelectorAll('.item-checkbox');
            
            // Check if all are selected
            const allSelected = Array.from(checkboxes).every(cb => cb.checked);
            
            items.forEach(item => {
                const checkbox = item.querySelector('.item-checkbox');
                const itemId = item.dataset.id;
                
                if (allSelected) {
                    // Deselect all
                    checkbox.checked = false;
                    this.selectedItems.delete(itemId);
                    item.classList.remove('selected');
                } else {
                    // Select all
                    checkbox.checked = true;
                    this.selectedItems.add(itemId);
                    item.classList.add('selected');
                }
            });
        }
        
        toggleItemSelection(itemId, selected) {
            const item = document.querySelector(`.text-item[data-id="${itemId}"]`);
            if (!item) return;
            
            if (selected) {
                this.selectedItems.add(itemId);
                item.classList.add('selected');
            } else {
                this.selectedItems.delete(itemId);
                item.classList.remove('selected');
            }
        }
        
        toggleTextExpansion(itemId) {
            const item = document.querySelector(`.text-item[data-id="${itemId}"]`);
            if (!item) return;
            
            const preview = item.querySelector('.text-preview');
            const contentSpan = preview.querySelector('.text-content-span');
            const expandBtn = preview.querySelector('.expand-btn');
            const fullText = item.dataset.fullText;
            
            if (this.expandedTexts.has(itemId)) {
                // Collapse
                this.expandedTexts.delete(itemId);
                const truncated = fullText.substring(0, this.config.maxTextLength) + '...';
                contentSpan.textContent = truncated;
                if (expandBtn) expandBtn.textContent = 'Show more';
            } else {
                // Expand
                this.expandedTexts.add(itemId);
                contentSpan.textContent = fullText;
                if (expandBtn) expandBtn.textContent = 'Show less';
            }
        }
        
        applyFilter(filterType, container) {
            this.currentFilter = filterType;
            const items = container.querySelectorAll('.text-item');
            let visibleCount = 0;
            
            items.forEach(item => {
                let show = true;
                
                if (filterType === 'high-confidence') {
                    // Show only items with confidence >= 0.8
                    const confidence = parseFloat(item.dataset.confidence || 0);
                    show = confidence >= 0.8;
                }
                // 'all' filter shows everything
                
                item.style.display = show ? 'flex' : 'none';
                if (show) visibleCount++;
            });
            
            // Update filter buttons with visual feedback
            container.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filterType);
            });
            
            // Update property counts to reflect visible items
            container.querySelectorAll('.property-group').forEach(group => {
                const visibleInGroup = group.querySelectorAll('.text-item:not([style*="none"])').length;
                const countBadge = group.querySelector('.property-count');
                if (countBadge) {
                    countBadge.textContent = visibleInGroup;
                }
            });
        }
        
        handleJumpToText(item) {
            const text = item.dataset.fullText;
            const id = item.dataset.id;
            
            if (!text) return;
            
            // Try using TextSearchUtility if available
            if (typeof window.textSearchUtility !== 'undefined') {
                const range = window.textSearchUtility.findText(text.substring(0, 100));
                if (range) {
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    
                    // Scroll to selection
                    const rect = range.getBoundingClientRect();
                    window.scrollTo({
                        top: window.pageYOffset + rect.top - 200,
                        behavior: 'smooth'
                    });
                    
                    // Highlight temporarily
                    const span = document.createElement('span');
                    span.style.backgroundColor = '#ffeb3b';
                    span.className = 'orkg-jump-highlight';
                    try {
                        range.surroundContents(span);
                        setTimeout(() => {
                            const parent = span.parentNode;
                            while (span.firstChild) {
                                parent.insertBefore(span.firstChild, span);
                            }
                            parent.removeChild(span);
                        }, 3000);
                    } catch (e) {
                        console.debug('Could not highlight text');
                    }
                    
                    // Visual feedback
                    item.classList.add('orkg-jump-highlight');
                    setTimeout(() => item.classList.remove('orkg-jump-highlight'), 2000);
                    return;
                }
            }
            
            // Fallback: Try to find highlighted elements first
            const highlights = document.querySelectorAll('.orkg-highlight, mark[data-highlight-id]');
            let targetElement = null;
            
            // First try to find by ID
            highlights.forEach(highlight => {
                if (highlight.dataset.highlightId === id || highlight.dataset.id === id) {
                    targetElement = highlight;
                }
            });
            
            // If not found, try to find by text content
            if (!targetElement) {
                const searchText = text.substring(0, 50).toLowerCase();
                highlights.forEach(highlight => {
                    if (highlight.textContent.toLowerCase().includes(searchText)) {
                        targetElement = highlight;
                    }
                });
            }
            
            // If still not found, search in paragraphs
            if (!targetElement) {
                const searchText = text.substring(0, 50).toLowerCase();
                const elements = document.querySelectorAll('p, span, div');
                
                for (const el of elements) {
                    if (el.textContent.toLowerCase().includes(searchText)) {
                        targetElement = el;
                        break;
                    }
                }
            }
            
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetElement.classList.add('orkg-jump-highlight');
                setTimeout(() => targetElement.classList.remove('orkg-jump-highlight'), 3000);
            }
            
            // Visual feedback on the item
            item.classList.add('orkg-jump-highlight');
            setTimeout(() => item.classList.remove('orkg-jump-highlight'), 2000);
        }
        
        handleExport(container) {
            const data = [];
            
            // Get all text items (no Selected column)
            container.querySelectorAll('.text-item').forEach(item => {
                if (item.style.display !== 'none') {
                    const propertyGroup = item.closest('.property-group');
                    const propertyName = propertyGroup ? 
                        propertyGroup.querySelector('.property-name')?.textContent || 'Unknown' :
                        'Unknown';
                    
                    data.push({
                        property: propertyName,
                        text: item.dataset.fullText || item.querySelector('.text-content-span')?.textContent || '',
                        confidence: item.dataset.confidence || 'N/A',
                        method: 'AI'
                    });
                }
            });
            
            // Create CSV without Selected column
            const csv = 'Property Name,Text,Confidence,Generation Method\n' + 
                data.map(row => 
                    `"${row.property}","${row.text.replace(/"/g, '""')}","${row.confidence}","${row.method}"`
                ).join('\n');
            
            // Download CSV
            this.downloadCSV(csv, 'text-highlights');
        }
        
        handleCopyText(item) {
            const text = item.dataset.fullText;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    this.showCopySuccess(item);
                });
            }
        }
        
        showCopySuccess(element) {
            const toast = document.createElement('div');
            toast.className = 'copy-toast';
            toast.textContent = 'Copied!';
            element.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
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
        
        getPropertyColor(property) {
            if (!this.propertyColors.has(property)) {
                const index = this.propertyColors.size % this.colorPalette.length;
                this.propertyColors.set(property, this.colorPalette[index]);
            }
            return this.propertyColors.get(property);
        }
        
        getTimeAgo(timestamp) {
            const seconds = Math.floor((Date.now() - timestamp) / 1000);
            if (seconds < 60) return 'just now';
            if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
            if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
            return `${Math.floor(seconds / 86400)}d ago`;
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
        
        sanitizeId(text) {
            return (text || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_');
        }
    }
    
    global.RAGPanelTextRenderer = RAGPanelTextRenderer;
    
})(typeof window !== 'undefined' ? window : this);
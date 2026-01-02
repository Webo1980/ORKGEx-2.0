// src/content/modules/markers/base/MarkerUI.js
// Enhanced MarkerUI with proper menu click handling and tooltips

(function(global) {
    'use strict';
    
    class MarkerUI {
        constructor(config = {}) {
            this.config = {
                menuHideDelay: config.menuHideDelay || 500,
                enableAnimations: config.enableAnimations !== false,
                enableTooltips: config.enableTooltips !== false,
                tooltipDelay: config.tooltipDelay || 200,
                importance: config.importance || 'normal',
                ...config
            };
            
            this.activeMenus = new Map();
            this.tooltipTimeouts = new Map();
            this.menuActionCallback = null;
            this.menuHandler = null;
            
            // Get references to global services
            this.iconRegistry = global.IconRegistry;
            this.tooltipSystem = global.markerTooltip;
            
            this.ensureStyles();
        }
        
        ensureStyles() {
            if (!document.getElementById('orkg-marker-styles')) {
                const link = document.createElement('link');
                link.id = 'orkg-marker-styles';
                link.rel = 'stylesheet';
                link.href = chrome?.runtime?.getURL ? 
                    chrome.runtime.getURL('src/styles/content/markers.css') : 
                    '/src/styles/content/markers.css';
                document.head.appendChild(link);
            }
        }
        
        setMenuActionCallback(callback) {
            this.menuActionCallback = callback;
        }
        
        setMenuHandler(handler) {
            this.menuHandler = handler;
        }
        
        createMarkerElement(markerData) {
            const marker = document.createElement('div');
            marker.className = `orkg-marker orkg-${markerData.type}-marker`;
            marker.dataset.markerId = markerData.id;
            marker.dataset.markerType = markerData.type;
            marker.dataset.metadata = JSON.stringify(markerData.metadata || {});
            
            if (this.config.importance) {
                marker.classList.add(`orkg-importance-${this.config.importance}`);
            }
            
            // Add content
            const content = this.createMarkerContent(markerData);
            marker.appendChild(content);
            
            // Add menu
            const menu = this.createMarkerMenu(markerData);
            marker.appendChild(menu);
            
            // Add tooltip if enabled
            if (this.config.enableTooltips) {
                this.addTooltip(marker, markerData);
            }
            
            // Attach event handlers
            this.attachMarkerEventHandlers(marker, markerData);
            
            // Add entrance animation
            if (this.config.enableAnimations) {
                marker.classList.add('orkg-marker-entrance');
                setTimeout(() => {
                    marker.classList.remove('orkg-marker-entrance');
                }, 600);
            }
            
            return marker;
        }
        
        createMarkerContent(markerData) {
            const container = document.createElement('div');
            container.className = 'orkg-marker-content';
            
            const iconContainer = document.createElement('div');
            iconContainer.className = 'orkg-marker-icon-container';
            
            // ORKG logo
            if (chrome?.runtime?.getURL) {
                const img = document.createElement('img');
                img.src = chrome.runtime.getURL('assets/icons/icon128.png');
                img.className = 'orkg-marker-icon';
                img.alt = 'ORKG';
                iconContainer.appendChild(img);
            } else {
                const placeholder = document.createElement('span');
                placeholder.className = 'orkg-marker-icon-placeholder';
                placeholder.textContent = 'ORKG';
                iconContainer.appendChild(placeholder);
            }
            
            container.appendChild(iconContainer);
            
            // Type indicator
            const indicator = this.createTypeIndicator(markerData.type);
            if (indicator) {
                container.appendChild(indicator);
            }
            
            return container;
        }
        
        createTypeIndicator(type) {
            const indicator = document.createElement('div');
            indicator.className = 'orkg-marker-type-indicator';
            indicator.innerHTML = this.getTypeIconSVG(type);
            return indicator;
        }
        
        getTypeIconSVG(type) {
            const icons = {
                'text': '<svg width="10" height="10" viewBox="0 0 384 512" fill="currentColor"><path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm64 236c0 6.6-5.4 12-12 12H108c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12v8z"/></svg>',
                'image': '<svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor"><path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM323.8 202.5c-4.5-6.6-11.9-10.5-19.8-10.5s-15.4 3.9-19.8 10.5l-87 127.6L170.7 297c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h96 32H416c8.9 0 17.1-4.9 21.2-12.8s3.6-17.4-1.4-24.7l-120-176zM112 192a48 48 0 1 0 0-96 48 48 0 1 0 0 96z"/></svg>',
                'table': '<svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor"><path d="M64 256V160H224v96H64zm0 64H224v96H64V320zm224 96V320H448v96H288zM448 256H288V160H448v96zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"/></svg>'
            };
            return icons[type] || '';
        }
        
        createMarkerMenu(markerData) {
            const menu = document.createElement('div');
            menu.className = 'orkg-marker-menu';
            menu.dataset.markerId = markerData.id;
            
            const menuItems = this.getMenuItemsForType(markerData.type);
            
            menuItems.forEach(item => {
                const button = this.createMenuButton(item, markerData);
                menu.appendChild(button);
            });
            
            // Prevent menu from closing when hovering
            menu.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                clearTimeout(this.menuHideTimeout);
            });
            
            menu.addEventListener('mouseleave', (e) => {
                e.stopPropagation();
                this.menuHideTimeout = setTimeout(() => {
                    this.hideMenu(markerData.id);
                }, this.config.menuHideDelay);
            });
            
            return menu;
        }
        
        getMenuItemsForType(type) {
            const baseItems = [
                { action: 'delete', icon: 'delete', title: 'Delete', color: '#f44336' },
                { action: 'info', icon: 'info', title: 'Info', color: '#4CAF50' },
                { action: 'send', icon: 'send', title: 'Send to ORKG', color: '#e86161' }
            ];
            
            if (type === 'text') {
                baseItems.splice(1, 0, {
                    action: 'update',
                    icon: 'edit',
                    title: 'Update Property',
                    color: '#2196F3'
                });
            }
            
            return baseItems;
        }
        
        createMenuButton(item, markerData) {
            const button = document.createElement('button');
            button.className = `orkg-menu-item orkg-menu-${item.action}`;
            button.dataset.action = item.action;
            button.dataset.markerId = markerData.id;
            button.title = item.title;
            button.type = 'button';
            
            // Add icon
            button.innerHTML = this.getMenuIconSVG(item.action);
            
            // Attach click handler directly to button
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleMenuItemClick(e, button, markerData);
            });
            
            return button;
        }
        
        getMenuIconSVG(action) {
            const icons = {
                'delete': '<svg width="14" height="14" viewBox="0 0 448 512" fill="#666"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/></svg>',
                'edit': '<svg width="14" height="14" viewBox="0 0 512 512" fill="#666"><path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/></svg>',
                'update': '<svg width="14" height="14" viewBox="0 0 512 512" fill="#666"><path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/></svg>',
                'info': '<svg width="14" height="14" viewBox="0 0 512 512" fill="#666"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg>',
                'send': '<svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor"><path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 492.3 160 478.3V396.4c0-4 1.6-7.8 4.4-10.6L331.8 202.8c5.9-6.3 5.6-16.1-.6-22s-16.1-5.6-22 .6L127 368.1 19.6 307.3c-9.1-5.1-14.8-14.5-14.8-24.7s5.6-19.5 14.6-24.7L483.9 5.6c11.2-6.8 25.1-5.8 35.2 0z"/></svg>'
            };
            return icons[action] || '<span>•</span>';
        }
        
        handleMenuItemClick(e, button, markerData) {
            console.log('Menu button clicked:', button.dataset.action);
            
            // Hide menu immediately
            this.hideMenu(markerData.id);
            
            // Use menu handler if available
            if (this.menuHandler) {
                this.menuHandler.handleMenuItemClick(e, button);
            } else if (this.menuActionCallback) {
                // Fallback to callback
                this.menuActionCallback(button.dataset.action, markerData);
            } else {
                console.warn('No menu handler or callback configured');
            }
        }
        
        attachMarkerEventHandlers(marker, markerData) {
            let tooltipTimeout;
            let menuTimeout;
            
            // Click handler for marker
            marker.addEventListener('click', (e) => {
                // Don't toggle menu if clicking on menu itself
                if (!e.target.closest('.orkg-marker-menu')) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleMenu(markerData.id);
                }
            });
            
            // Hover handlers for tooltip and menu
            marker.addEventListener('mouseenter', () => {
                // Clear any hide timeouts
                clearTimeout(menuTimeout);
                
                // Show tooltip after delay if menu is not visible
                if (this.config.enableTooltips && !this.activeMenus.has(markerData.id)) {
                    tooltipTimeout = setTimeout(() => {
                        const tooltip = marker.querySelector('.orkg-marker-tooltip');
                        if (tooltip && !this.activeMenus.has(markerData.id)) {
                            tooltip.style.opacity = '1';
                            tooltip.style.visibility = 'visible';
                        }
                    }, this.config.tooltipDelay);
                    
                    this.tooltipTimeouts.set(markerData.id, tooltipTimeout);
                }
            });
            
            marker.addEventListener('mouseleave', () => {
                // Clear tooltip timeout
                if (tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                    this.tooltipTimeouts.delete(markerData.id);
                }
                
                // Hide tooltip immediately
                const tooltip = marker.querySelector('.orkg-marker-tooltip');
                if (tooltip) {
                    tooltip.style.opacity = '0';
                    tooltip.style.visibility = 'hidden';
                }
                
                // Hide menu after delay
                menuTimeout = setTimeout(() => {
                    if (!marker.matches(':hover')) {
                        this.hideMenu(markerData.id);
                    }
                }, this.config.menuHideDelay);
            });
        }
        
        addTooltip(marker, markerData) {
            const tooltip = document.createElement('div');
            tooltip.className = 'orkg-marker-tooltip';
            
            const content = this.getTooltipContent(markerData);
            tooltip.innerHTML = content;
            
            const arrow = document.createElement('div');
            arrow.className = 'orkg-tooltip-arrow';
            tooltip.appendChild(arrow);
            
            marker.appendChild(tooltip);
        }
        
        getTooltipContent(markerData) {
            const type = markerData.type;
            const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
            
            let html = `
                <div class="orkg-tooltip-type-badge">${typeLabel} Marker</div>
                <div style="margin-top: 4px; font-size: 11px; opacity: 0.9;">
                    Click to view options
                </div>
            `;
            
            // Add specific content based on type
            if (type === 'text' && markerData.metadata?.text) {
                const text = markerData.metadata.text;
                const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
                html += `
                    <div class="orkg-tooltip-text-preview">
                        "${this.escapeHtml(preview)}"
                    </div>
                `;
            } else if (type === 'image' && markerData.metadata?.alt) {
                html += `
                    <div class="orkg-tooltip-image-info">
                        ${this.escapeHtml(markerData.metadata.alt)}
                    </div>
                `;
            } else if (type === 'table' && markerData.metadata?.caption) {
                html += `
                    <div class="orkg-tooltip-table-info">
                        ${this.escapeHtml(markerData.metadata.caption)}
                    </div>
                `;
            }
            
            // Add property if exists
            if (markerData.metadata?.property?.label) {
                html += `
                    <div class="orkg-tooltip-property">
                        Property: <strong>${this.escapeHtml(markerData.metadata.property.label)}</strong>
                    </div>
                `;
            }
            
            // Add confidence if exists
            if (markerData.metadata?.confidence) {
                const confidence = Math.round(markerData.metadata.confidence * 100);
                html += `
                    <div class="orkg-tooltip-confidence">
                        Confidence: ${confidence}%
                    </div>
                `;
            }
            
            return html;
        }
        
        showMenu(markerId) {
            // Hide all other menus first
            this.hideAllMenus();
            
            // Find the menu
            const menu = document.querySelector(`.orkg-marker-menu[data-marker-id="${markerId}"]`);
            if (menu) {
                menu.classList.add('orkg-menu-visible');
                this.activeMenus.set(markerId, menu);
                
                // Hide tooltip when menu is shown
                const marker = document.querySelector(`.orkg-marker[data-marker-id="${markerId}"]`);
                if (marker) {
                    const tooltip = marker.querySelector('.orkg-marker-tooltip');
                    if (tooltip) {
                        tooltip.style.opacity = '0';
                        tooltip.style.visibility = 'hidden';
                    }
                }
            }
        }
        
        hideMenu(markerId) {
            const menu = this.activeMenus.get(markerId);
            if (menu) {
                menu.classList.remove('orkg-menu-visible');
                this.activeMenus.delete(markerId);
            } else {
                // Try to find and hide menu directly
                const menu = document.querySelector(`.orkg-marker-menu[data-marker-id="${markerId}"]`);
                if (menu) {
                    menu.classList.remove('orkg-menu-visible');
                }
            }
        }
        
        hideAllMenus() {
            // Hide tracked menus
            this.activeMenus.forEach(menu => {
                menu.classList.remove('orkg-menu-visible');
            });
            this.activeMenus.clear();
            
            // Also hide any untracked menus
            document.querySelectorAll('.orkg-marker-menu.orkg-menu-visible').forEach(menu => {
                menu.classList.remove('orkg-menu-visible');
            });
        }
        
        toggleMenu(markerId) {
            if (this.activeMenus.has(markerId)) {
                this.hideMenu(markerId);
            } else {
                this.showMenu(markerId);
            }
        }
        
        updateMarkerElement(markerElement, updates) {
            if (!markerElement) return;
            
            if (updates.metadata) {
                try {
                    const currentMetadata = JSON.parse(markerElement.dataset.metadata || '{}');
                    const newMetadata = { ...currentMetadata, ...updates.metadata };
                    markerElement.dataset.metadata = JSON.stringify(newMetadata);
                    
                    // Update tooltip if exists
                    const tooltip = markerElement.querySelector('.orkg-marker-tooltip');
                    if (tooltip) {
                        const markerData = {
                            type: markerElement.dataset.markerType,
                            metadata: newMetadata
                        };
                        const content = this.getTooltipContent(markerData);
                        
                        // Preserve arrow
                        const arrow = tooltip.querySelector('.orkg-tooltip-arrow');
                        tooltip.innerHTML = content;
                        if (arrow) {
                            tooltip.appendChild(arrow);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to update marker metadata:', e);
                }
            }
            
            if (updates.extracted !== undefined) {
                markerElement.classList.toggle('orkg-extracted', updates.extracted);
            }
            
            if (updates.extracting !== undefined) {
                markerElement.classList.toggle('orkg-extracting', updates.extracting);
            }
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
        
        cleanup() {
            this.hideAllMenus();
            this.tooltipTimeouts.forEach(timeout => clearTimeout(timeout));
            this.tooltipTimeouts.clear();
            clearTimeout(this.menuHideTimeout);
        }
    }
    
    global.MarkerUI = MarkerUI;
    console.log('📢 MarkerUI class exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
// src/content/modules/markers/handlers/InfoHandler.js
// Handles marker information display

(function(global) {
    'use strict';
    
    class InfoHandler {
        constructor(menuHandler) {
            this.menuHandler = menuHandler;
            this.modalManager = null;
        }
        
        setup(modalManager) {
            this.modalManager = modalManager;
        }
        
        handle(markerId, markerData) {
            console.log('Showing info for:', markerId);
            
            if (this.modalManager) {
                this.modalManager.showInfo(markerData, markerData.type);
            } else {
                // Fallback to custom modal
                this.showORKGInfoModal(markerData);
            }
        }
        
        showORKGInfoModal(markerData) {
            // Remove existing modal
            const existing = document.querySelector('.orkg-info-modal-overlay');
            if (existing) existing.remove();
            
            // Create modal overlay
            const modal = document.createElement('div');
            modal.className = 'orkg-info-modal-overlay';
            modal.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.5) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 2147483647 !important;
                opacity: 0 !important;
                transition: opacity 0.3s ease !important;
            `;
            
            // Create content container
            const content = this.createModalContent(markerData);
            modal.appendChild(content);
            
            // Handle closing
            modal.onclick = (e) => {
                if (e.target === modal) {
                    this.closeModal(modal, content);
                }
            };
            
            document.body.appendChild(modal);
            
            // Animate in
            requestAnimationFrame(() => {
                modal.style.opacity = '1';
                content.style.transform = 'scale(1)';
            });
        }
        
        createModalContent(markerData) {
            const content = document.createElement('div');
            content.className = 'orkg-info-modal-content';
            content.style.cssText = `
                background: white !important;
                border-radius: 8px !important;
                max-width: 450px !important;
                width: 90% !important;
                max-height: 80vh !important;
                overflow: hidden !important;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
                transform: scale(0.9) !important;
                transition: transform 0.3s ease !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                display: flex !important;
                flex-direction: column !important;
            `;
            
            // Create header
            const header = this.createHeader(markerData);
            
            // Create body
            const body = this.createBody(markerData);
            
            // Create footer
            const footer = this.createFooter(() => {
                const modal = content.closest('.orkg-info-modal-overlay');
                if (modal) {
                    this.closeModal(modal, content);
                }
            });
            
            content.appendChild(header);
            content.appendChild(body);
            content.appendChild(footer);
            
            return content;
        }
        
        createHeader(markerData) {
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding: 16px 20px !important;
                background: linear-gradient(135deg, #e86161 0%, #E04848 100%) !important;
                color: white !important;
                font-family: inherit !important;
            `;
            
            const title = document.createElement('h4');
            title.style.cssText = `
                margin: 0 !important;
                font-size: 16px !important;
                font-weight: 600 !important;
                color: white !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            `;
            
            const icon = this.getTypeIcon(markerData.type);
            title.innerHTML = `${icon} ${this.formatType(markerData.type)} Marker Information`;
            header.appendChild(title);
            
            return header;
        }
        
        createBody(markerData) {
            const body = document.createElement('div');
            body.style.cssText = `
                padding: 20px !important;
                font-family: inherit !important;
                overflow-y: auto !important;
                flex: 1 !important;
                max-height: 400px !important;
            `;
            
            body.innerHTML = this.getInfoBodyContent(markerData);
            return body;
        }
        
        createFooter(onClose) {
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: 16px 20px !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                background: #f8f9fa !important;
                border-top: 1px solid #e9ecef !important;
            `;
            
            // Add copy button for marker ID
            const copyBtn = document.createElement('button');
            copyBtn.textContent = 'Copy ID';
            copyBtn.style.cssText = `
                padding: 6px 14px !important;
                background: #6c757d !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                font-size: 12px !important;
                cursor: pointer !important;
                transition: background 0.2s !important;
                font-family: inherit !important;
            `;
            
            copyBtn.onclick = () => {
                const markerId = footer.closest('.orkg-info-modal-content')
                                      .querySelector('[data-marker-id]')?.dataset.markerId;
                if (markerId && navigator.clipboard) {
                    navigator.clipboard.writeText(markerId);
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy ID';
                    }, 2000);
                }
            };
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = `
                padding: 8px 20px !important;
                background: #e86161 !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                font-size: 13px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                transition: background 0.2s !important;
                font-family: inherit !important;
            `;
            
            closeBtn.onmouseover = () => {
                closeBtn.style.background = '#E04848 !important';
            };
            
            closeBtn.onmouseout = () => {
                closeBtn.style.background = '#e86161 !important';
            };
            
            closeBtn.onclick = onClose;
            
            footer.appendChild(copyBtn);
            footer.appendChild(closeBtn);
            
            return footer;
        }
        
        getInfoBodyContent(markerData) {
            const sections = [];
            const metadata = markerData.metadata || {};
            
            // Marker ID (hidden, used for copy)
            sections.push(`<div data-marker-id="${markerData.id}" style="display: none;"></div>`);
            
            // Type badge
            sections.push(`
                <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                    <span style="
                        background: ${this.getTypeColor(markerData.type)};
                        color: white;
                        padding: 4px 10px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: 600;
                        text-transform: uppercase;
                    ">${markerData.type}</span>
                    ${metadata.source ? `
                        <span style="
                            background: #e9ecef;
                            color: #495057;
                            padding: 4px 10px;
                            border-radius: 12px;
                            font-size: 11px;
                        ">${metadata.source}</span>
                    ` : ''}
                </div>
            `);
            
            // Content section based on type
            if (markerData.type === 'text' && metadata.text) {
                sections.push(this.createInfoRow('Selected Text', 
                    `"${this.truncate(metadata.text, 200)}"`,
                    'quote'));
            } else if (markerData.type === 'image') {
                if (metadata.src) {
                    sections.push(this.createInfoRow('Image Source', 
                        this.truncate(metadata.src, 150),
                        'link'));
                }
                if (metadata.alt) {
                    sections.push(this.createInfoRow('Alt Text', 
                        metadata.alt,
                        'text'));
                }
            } else if (markerData.type === 'table') {
                if (metadata.caption) {
                    sections.push(this.createInfoRow('Caption', 
                        metadata.caption,
                        'text'));
                }
                if (metadata.rows && metadata.columns) {
                    sections.push(this.createInfoRow('Dimensions', 
                        `${metadata.rows} rows × ${metadata.columns} columns`,
                        'grid'));
                }
            }
            
            // Property
            if (metadata.property?.label) {
                sections.push(this.createInfoRow('Property', 
                    metadata.property.label,
                    'property',
                    metadata.color || '#2196F3'));
            }
            
            // Confidence with visual bar
            if (metadata.confidence !== undefined) {
                const confidence = Math.round(metadata.confidence * 100);
                const color = this.getConfidenceColor(metadata.confidence);
                sections.push(`
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 11px; color: #6c757d; text-transform: uppercase; margin-bottom: 8px;">
                            Confidence Level
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="flex: 1; height: 10px; background: #e9ecef; border-radius: 5px; overflow: hidden;">
                                <div style="width: ${confidence}%; height: 100%; background: ${color}; transition: width 0.5s;"></div>
                            </div>
                            <span style="font-size: 14px; font-weight: 600; color: ${color}; min-width: 40px;">${confidence}%</span>
                        </div>
                    </div>
                `);
            }
            
            // Timestamps
            if (markerData.createdAt) {
                sections.push(this.createInfoRow('Created', 
                    new Date(markerData.createdAt).toLocaleString(),
                    'time'));
            }
            
            // Status
            const isExtracted = markerData.extracted || 
                               markerData.markerElement?.classList.contains('orkg-extracted');
            sections.push(this.createInfoRow('Status', 
                isExtracted ? 'Sent to ORKG' : 'Not sent',
                'status',
                isExtracted ? '#10b981' : '#6c757d'));
            
            return sections.join('');
        }
        
        createInfoRow(label, value, type = 'text', color = null) {
            const icons = {
                quote: '💬',
                link: '🔗',
                text: '📝',
                property: '🏷️',
                grid: '⊞',
                time: '🕐',
                status: '📍'
            };
            
            const icon = icons[type] || '';
            
            return `
                <div style="margin-bottom: 16px;">
                    <div style="font-size: 11px; color: #6c757d; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
                        ${icon} ${this.escapeHtml(label)}
                    </div>
                    <div style="
                        padding: 10px;
                        background: ${type === 'property' ? `${color}22` : '#f8f9fa'};
                        border-radius: 6px;
                        font-size: 13px;
                        color: ${color || '#333'};
                        ${type === 'quote' ? 'font-style: italic;' : ''}
                        ${type === 'property' ? 'font-weight: 500;' : ''}
                        word-break: break-word;
                        line-height: 1.4;
                    ">
                        ${this.escapeHtml(value)}
                    </div>
                </div>
            `;
        }
        
        closeModal(modal, content) {
            modal.style.opacity = '0';
            content.style.transform = 'scale(0.9)';
            setTimeout(() => modal.remove(), 300);
        }
        
        // Utility methods
        formatType(type) {
            return type.charAt(0).toUpperCase() + type.slice(1);
        }
        
        getTypeIcon(type) {
            const icons = {
                text: '<svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm5 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6zm0 3a.5.5 0 0 1 0-1h6a.5.5 0 0 1 0 1h-6z"/></svg>',
                image: '<svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12z"/></svg>',
                table: '<svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/></svg>'
            };
            return icons[type] || '';
        }
        
        getTypeColor(type) {
            const colors = {
                text: '#2196F3',
                image: '#4CAF50',
                table: '#9C27B0'
            };
            return colors[type] || '#6c757d';
        }
        
        getConfidenceColor(confidence) {
            if (confidence >= 0.8) return '#10b981';
            if (confidence >= 0.5) return '#f59e0b';
            return '#ef4444';
        }
        
        truncate(text, maxLength) {
            if (!text) return '';
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text || '';
            return div.innerHTML;
        }
        
        cleanup() {
            this.modalManager = null;
        }
    }
    
    // Export to global scope
    global.InfoHandler = InfoHandler;
    console.log('📢 InfoHandler exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
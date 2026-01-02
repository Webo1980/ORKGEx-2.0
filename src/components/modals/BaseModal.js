// ================================
// src/components/modals/BaseModal.js - Fixed Overlay Rendering
// ================================

export class BaseModal {
    constructor(options = {}) {
        this.options = {
            title: options.title || 'Modal',
            size: options.size || 'medium',
            className: options.className || '',
            resizable: options.resizable || false,
            maximizable: options.maximizable || false,
            closable: options.closable !== false,
            closeOnEscape: options.closeOnEscape !== false,
            closeOnOverlay: options.closeOnOverlay !== false,
            onClose: options.onClose || null,
            onOpen: options.onOpen || null,
            ...options
        };
        
        this.modal = null;
        this.isOpen = false;
        this.isMaximized = false;
        this.originalPosition = null;
        this.originalSize = null;
        
        // Bind methods
        this.handleEscape = this.handleEscape.bind(this);
        this.handleOverlayClick = this.handleOverlayClick.bind(this);
    }
    
    create() {
        // Create modal structure
        this.modal = document.createElement('div');
        this.modal.className = `base-modal ${this.options.className}`;
        
        // IMPORTANT: Set proper positioning styles directly
        this.modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 999999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: transparent !important;
            pointer-events: auto !important;
        `;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.7) !important;
            backdrop-filter: blur(4px) !important;
            z-index: 1 !important;
        `;
        
        // Create container
        const container = document.createElement('div');
        container.className = `modal-container modal-${this.options.size}`;
        
        // Set container styles based on size
        const sizeStyles = this.getSizeStyles();
        container.style.cssText = `
            position: relative !important;
            background: var(--bg-primary, #1a1a1a) !important;
            border-radius: 12px !important;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
            display: flex !important;
            flex-direction: column !important;
            z-index: 2 !important;
            ${sizeStyles}
            max-width: 95vw !important;
            max-height: 90vh !important;
            overflow: hidden !important;
        `;
        
        // Build modal content
        container.innerHTML = `
            ${this.renderHeader()}
            <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 24px;">
                ${this.renderContent()}
            </div>
            ${this.renderFooter()}
            ${this.options.resizable ? this.renderResizeHandles() : ''}
        `;
        
        // Append elements
        this.modal.appendChild(overlay);
        this.modal.appendChild(container);
        
        // Find the best parent element
        const popupBody = document.body;
        const extensionRoot = document.querySelector('.popup-container') || 
                            document.querySelector('#root') || 
                            popupBody;
        
        // If we're in an extension popup, try to break out
        if (extensionRoot && extensionRoot !== popupBody) {
            // Apply overflow visible to allow modal to escape
            extensionRoot.style.overflow = 'visible';
            
            // Find all parent containers and set overflow visible
            let parent = extensionRoot.parentElement;
            while (parent && parent !== popupBody) {
                parent.style.overflow = 'visible';
                parent = parent.parentElement;
            }
        }
        
        // Append to body
        popupBody.appendChild(this.modal);
        
        // Setup interactions
        this.setupEventListeners(overlay, container);
        
        // Setup resize if enabled
        if (this.options.resizable) {
            this.setupResize(container);
        }
    }
    
    getSizeStyles() {
        const sizes = {
            'small': 'width: 500px; height: auto;',
            'medium': 'width: 700px; height: auto;',
            'large': 'width: 900px; height: 600px;',
            'extra-large': 'width: 1200px; height: 800px;',
            'fullscreen': 'width: 100vw; height: 100vh; border-radius: 0;'
        };
        
        return sizes[this.options.size] || sizes.medium;
    }
    
    renderHeader() {
        return `
            <div class="modal-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-bottom: 1px solid var(--border-color, #333);
                flex-shrink: 0;
            ">
                <h3 class="modal-title" style="
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-primary, #fff);
                ">${this.options.title}</h3>
                <div class="modal-controls" style="display: flex; gap: 8px;">
                    ${this.options.maximizable ? `
                        <button class="modal-control maximize-btn" title="Maximize" style="
                            width: 32px;
                            height: 32px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: transparent;
                            border: none;
                            border-radius: 6px;
                            color: var(--text-secondary, #999);
                            cursor: pointer;
                            transition: all 0.2s;
                        ">
                            <i class="fas fa-expand"></i>
                        </button>
                    ` : ''}
                    ${this.options.closable ? `
                        <button class="modal-control close-btn" title="Close" style="
                            width: 32px;
                            height: 32px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: transparent;
                            border: none;
                            border-radius: 6px;
                            color: var(--text-secondary, #999);
                            cursor: pointer;
                            transition: all 0.2s;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderContent() {
        // Override in subclasses
        return '<p>Modal content goes here</p>';
    }
    
    renderFooter() {
        // Override in subclasses if needed
        return '';
    }
    
    renderResizeHandles() {
        return `
            <div class="resize-handle resize-n" style="position: absolute; top: 0; left: 10px; right: 10px; height: 10px; cursor: n-resize;"></div>
            <div class="resize-handle resize-e" style="position: absolute; top: 10px; right: 0; bottom: 10px; width: 10px; cursor: e-resize;"></div>
            <div class="resize-handle resize-s" style="position: absolute; bottom: 0; left: 10px; right: 10px; height: 10px; cursor: s-resize;"></div>
            <div class="resize-handle resize-w" style="position: absolute; top: 10px; left: 0; bottom: 10px; width: 10px; cursor: w-resize;"></div>
            <div class="resize-handle resize-ne" style="position: absolute; top: 0; right: 0; width: 20px; height: 20px; cursor: ne-resize;"></div>
            <div class="resize-handle resize-se" style="position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; cursor: se-resize;"></div>
            <div class="resize-handle resize-sw" style="position: absolute; bottom: 0; left: 0; width: 20px; height: 20px; cursor: sw-resize;"></div>
            <div class="resize-handle resize-nw" style="position: absolute; top: 0; left: 0; width: 20px; height: 20px; cursor: nw-resize;"></div>
        `;
    }
    
    setupEventListeners(overlay, container) {
        // Close button
        const closeBtn = container.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Maximize button
        const maximizeBtn = container.querySelector('.maximize-btn');
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => this.toggleMaximize(container));
        }
        
        // Overlay click
        if (this.options.closeOnOverlay && overlay) {
            overlay.addEventListener('click', this.handleOverlayClick);
        }
        
        // Escape key
        if (this.options.closeOnEscape) {
            document.addEventListener('keydown', this.handleEscape);
        }
        
        // Hover effects for controls
        const controls = container.querySelectorAll('.modal-control');
        controls.forEach(control => {
            control.addEventListener('mouseenter', () => {
                control.style.background = 'var(--bg-hover, rgba(255, 255, 255, 0.1))';
                control.style.color = 'var(--text-primary, #fff)';
            });
            control.addEventListener('mouseleave', () => {
                control.style.background = 'transparent';
                control.style.color = 'var(--text-secondary, #999)';
            });
        });
    }
    
    setupResize(container) {
        const handles = container.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            let isResizing = false;
            let startX = 0;
            let startY = 0;
            let startWidth = 0;
            let startHeight = 0;
            let startLeft = 0;
            let startTop = 0;
            
            handle.addEventListener('mousedown', (e) => {
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                
                const rect = container.getBoundingClientRect();
                startWidth = rect.width;
                startHeight = rect.height;
                startLeft = rect.left;
                startTop = rect.top;
                
                // Store current position
                container.style.position = 'fixed';
                container.style.left = `${startLeft}px`;
                container.style.top = `${startTop}px`;
                container.style.transform = 'none';
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
                
                e.preventDefault();
            });
            
            const handleMouseMove = (e) => {
                if (!isResizing) return;
                
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                if (handle.classList.contains('resize-e')) {
                    container.style.width = `${startWidth + dx}px`;
                } else if (handle.classList.contains('resize-w')) {
                    container.style.width = `${startWidth - dx}px`;
                    container.style.left = `${startLeft + dx}px`;
                } else if (handle.classList.contains('resize-s')) {
                    container.style.height = `${startHeight + dy}px`;
                } else if (handle.classList.contains('resize-n')) {
                    container.style.height = `${startHeight - dy}px`;
                    container.style.top = `${startTop + dy}px`;
                } else if (handle.classList.contains('resize-se')) {
                    container.style.width = `${startWidth + dx}px`;
                    container.style.height = `${startHeight + dy}px`;
                } else if (handle.classList.contains('resize-sw')) {
                    container.style.width = `${startWidth - dx}px`;
                    container.style.height = `${startHeight + dy}px`;
                    container.style.left = `${startLeft + dx}px`;
                } else if (handle.classList.contains('resize-ne')) {
                    container.style.width = `${startWidth + dx}px`;
                    container.style.height = `${startHeight - dy}px`;
                    container.style.top = `${startTop + dy}px`;
                } else if (handle.classList.contains('resize-nw')) {
                    container.style.width = `${startWidth - dx}px`;
                    container.style.height = `${startHeight - dy}px`;
                    container.style.left = `${startLeft + dx}px`;
                    container.style.top = `${startTop + dy}px`;
                }
            };
            
            const handleMouseUp = () => {
                isResizing = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        });
    }
    
    handleEscape(e) {
        if (e.key === 'Escape' && this.isOpen) {
            this.close();
        }
    }
    
    handleOverlayClick(e) {
        if (e.target.classList.contains('modal-overlay')) {
            this.close();
        }
    }
    
    toggleMaximize(container) {
        if (this.isMaximized) {
            // Restore original size
            if (this.originalSize) {
                container.style.width = this.originalSize.width;
                container.style.height = this.originalSize.height;
                container.style.left = this.originalPosition.left;
                container.style.top = this.originalPosition.top;
                container.style.transform = 'none';
            }
            container.style.borderRadius = '12px';
            this.isMaximized = false;
            
            // Update icon
            const maximizeBtn = container.querySelector('.maximize-btn i');
            if (maximizeBtn) {
                maximizeBtn.className = 'fas fa-expand';
            }
        } else {
            // Store original size
            const rect = container.getBoundingClientRect();
            this.originalSize = {
                width: container.style.width || `${rect.width}px`,
                height: container.style.height || `${rect.height}px`
            };
            this.originalPosition = {
                left: container.style.left || '50%',
                top: container.style.top || '50%'
            };
            
            // Maximize
            container.style.position = 'fixed';
            container.style.width = '100vw';
            container.style.height = '100vh';
            container.style.left = '0';
            container.style.top = '0';
            container.style.transform = 'none';
            container.style.borderRadius = '0';
            this.isMaximized = true;
            
            // Update icon
            const maximizeBtn = container.querySelector('.maximize-btn i');
            if (maximizeBtn) {
                maximizeBtn.className = 'fas fa-compress';
            }
        }
    }
    
    open() {
        if (!this.modal) {
            this.create();
        }
        
        // Ensure modal is visible
        this.modal.style.display = 'flex';
        
        // Show modal with animation
        requestAnimationFrame(() => {
            this.modal.classList.add('modal-show');
            this.modal.style.opacity = '1';
        });
        
        this.isOpen = true;
        
        // Call open callback
        if (this.options.onOpen) {
            this.options.onOpen();
        }
    }
    
    close() {
        if (!this.isOpen) return;
        
        // Hide modal with animation
        if (this.modal) {
            this.modal.style.opacity = '0';
            this.modal.classList.remove('modal-show');
        }
        
        // Remove after animation
        setTimeout(() => {
            if (this.modal && this.modal.parentNode) {
                this.modal.parentNode.removeChild(this.modal);
            }
            this.modal = null;
        }, 300);
        
        this.isOpen = false;
        
        // Clean up event listeners
        if (this.options.closeOnEscape) {
            document.removeEventListener('keydown', this.handleEscape);
        }
        
        // Call close callback
        if (this.options.onClose) {
            this.options.onClose();
        }
    }
    
    destroy() {
        this.close();
    }
}
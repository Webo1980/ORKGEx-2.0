// ================================
// src/core/ui/ToastManager.js - FIXED: Duration Issue and Cancel Button
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.isInitialized = false;
        this.defaultDuration = 5000;
        this.maxToasts = 5;
        this.toastCounter = 0;
        this.hideTimeouts = new Map();
    }
    
    async init() {
        if (this.isInitialized) {
            console.warn('ToastManager already initialized');
            return;
        }
        
        try {
            console.log('🍞 Initializing ToastManager...');
            
            this.createToastContainer();
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ ToastManager initialized');
            
        } catch (error) {
            console.error('❌ ToastManager initialization failed:', error);
            throw error;
        }
    }
    
    createToastContainer() {
        // Remove existing container if it exists
        const existingContainer = document.getElementById('toast-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-atomic', 'false');
        
        // Apply critical styles directly to ensure visibility
        this.container.style.cssText = `
            position: fixed !important;
            top: 80px !important;
            right: 24px !important;
            z-index: 999999 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            pointer-events: none !important;
            max-width: 420px !important;
            width: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        document.body.appendChild(this.container);
        console.log('📢 Toast container created');
    }
    
    setupEventListeners() {
        // Listen for centralized toast events
        eventManager.on('toast:show', (data) => {
            this.show(data.message, data.type, data.duration, data.options);
        });
        
        eventManager.on('toast:hide', (data) => {
            this.hide(data.id || data);
        });
        
        eventManager.on('toast:clear', () => {
            this.clearAll();
        });
        
        // Handle clicks on toast container
        if (this.container) {
            this.container.addEventListener('click', (event) => {
                const toastElement = event.target.closest('.toast');
                if (toastElement) {
                    const toastId = toastElement.getAttribute('data-toast-id') || toastElement.id;
                    const toast = this.toasts.get(toastId);
                    
                    if (toast && toast.clickable) {
                        this.handleToastClick(toast, event);
                    }
                }
            });
            
            // Handle keyboard events for accessibility
            this.container.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    this.clearAll();
                }
            });
        }
    }
    
    /**
     * Show a toast notification
     */
    show(message, type = 'info', duration = null, options = {}) {
        if (!this.isInitialized) {
            console.warn('ToastManager not initialized, cannot show toast');
            return null;
        }
        
        // Generate unique ID
        const id = `toast_${++this.toastCounter}_${Date.now()}`;
        
        // Validate type
        const validTypes = ['success', 'error', 'warning', 'info'];
        if (!validTypes.includes(type)) {
            type = 'info';
        }
        
        // FIXED: Ensure duration is always a number
        const finalDuration = duration !== null ? duration : this.getDefaultDuration(type);
        
        console.log(`📢 Creating toast: ${type} - ${message}`);
        
        // Ensure container exists
        if (!this.container || !document.body.contains(this.container)) {
            this.createToastContainer();
        }
        
        // Create toast element - FIXED: Pass finalDuration instead of duration
        const toast = this.createToastElement(id, message, type, finalDuration, options);
        
        // Add to container
        this.container.appendChild(toast);
        
        // Store toast reference
        this.toasts.set(id, {
            element: toast,
            type,
            message,
            duration: finalDuration,
            timestamp: Date.now(),
            ...options
        });
        
        // Trigger entrance animation
        requestAnimationFrame(() => {
            toast.offsetHeight; // Force reflow
            
            requestAnimationFrame(() => {
                toast.classList.add('show');
                console.log(`📢 Toast shown: ${type} - ${message} (ID: ${id})`);
            });
        });
        
        // Set auto-hide timer if duration is specified
        if (finalDuration > 0) {
            const timeoutId = setTimeout(() => {
                this.hide(id);
            }, finalDuration);
            
            // Store timeout ID for potential cancellation
            this.hideTimeouts.set(id, timeoutId);
        }
        
        // Limit number of toasts
        this.enforceMaxToasts();
        
        return id;
    }
    
    /**
     * Create toast element - FIXED: Added duration parameter
     */
    createToastElement(id, message, type, duration, options = {}) {
        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast ${type}`;
        toast.setAttribute('data-toast-id', id);
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        
        const canClose = options.closable !== false;
        
        // Create icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'toast-icon';
        iconDiv.innerHTML = `<i class="fas ${this.getTypeIcon(type)}"></i>`;
        
        // Create content container
        const contentDiv = document.createElement('div');
        contentDiv.className = 'toast-content';
        
        // Create message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'toast-message';
        messageDiv.textContent = message;
        
        contentDiv.appendChild(messageDiv);
        
        // Assemble basic structure
        toast.appendChild(iconDiv);
        toast.appendChild(contentDiv);
        
        // Add close button if closable
        if (canClose) {
            const closeButton = document.createElement('button');
            closeButton.className = 'toast-close';
            closeButton.innerHTML = '<i class="fas fa-times" aria-hidden="true"></i>';
            closeButton.setAttribute('aria-label', 'Close notification');
            
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hide(id);
            });
            
            toast.appendChild(closeButton);
        }
        
        // Add actions if provided
        if (options.actions && options.actions.length > 0) {
            const actionsDiv = this.renderToastActions(options.actions, id);
            contentDiv.appendChild(actionsDiv);
        }
        
        // Add progress bar for timed toasts - FIXED: Use duration parameter
        if (duration > 0 && !options.persistent) {
            const progressDiv = document.createElement('div');
            progressDiv.className = 'toast-progress';
            
            const progressBar = document.createElement('div');
            progressBar.className = 'toast-progress-bar';
            progressBar.style.setProperty('--duration', `${duration}ms`);
            
            progressDiv.appendChild(progressBar);
            toast.appendChild(progressDiv);
        }
        
        return toast;
    }
    
    getTypeIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
    
    getDefaultDuration(type) {
        const durations = {
            'success': 4000,
            'error': 6000,
            'warning': 5000,
            'info': 4000
        };
        return durations[type] || this.defaultDuration;
    }
    
    renderToastActions(actions, toastId) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'toast-actions';
        
        actions.forEach((action, index) => {
            const actionButton = document.createElement('button');
            actionButton.className = `toast-action-btn ${action.type || 'secondary'}`;
            actionButton.setAttribute('data-action-index', index);
            
            if (action.icon) {
                actionButton.innerHTML = `<i class="fas ${action.icon}" aria-hidden="true"></i><span>${this.escapeHtml(action.label)}</span>`;
            } else {
                actionButton.innerHTML = `<span>${this.escapeHtml(action.label)}</span>`;
            }
            
            if (action.handler) {
                actionButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    action.handler(toastId, this.toasts.get(toastId));
                });
            }
            
            actionsDiv.appendChild(actionButton);
        });
        
        return actionsDiv;
    }
    
    /**
     * Hide toast with proper animation
     */
    hide(toastId) {
        const toast = this.toasts.get(toastId);
        if (!toast) {
            return;
        }
        
        const element = toast.element;
        
        // Cancel auto-hide timeout if it exists
        const timeoutId = this.hideTimeouts.get(toastId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.hideTimeouts.delete(toastId);
        }
        
        // Trigger exit animation
        element.classList.remove('show');
        element.classList.add('hide');
        
        // Remove after animation completes
        setTimeout(() => {
            if (element.parentNode === this.container) {
                this.container.removeChild(element);
            }
            this.toasts.delete(toastId);
        }, 300); // Match CSS transition duration
        
        console.log(`📢 Toast hidden: ${toastId}`);
    }
    
    enforceMaxToasts() {
        if (this.toasts.size <= this.maxToasts) {
            return;
        }
        
        // Remove oldest toasts
        const sortedToasts = Array.from(this.toasts.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toastsToRemove = sortedToasts.slice(0, this.toasts.size - this.maxToasts);
        
        toastsToRemove.forEach(([id]) => {
            this.hide(id);
        });
    }
    
    handleToastClick(toast, event) {
        if (toast.onClick) {
            toast.onClick(toast.id, toast, event);
        }
        
        if (toast.clickToClose !== false) {
            this.hide(toast.id);
        }
    }
    
    /**
     * Show confirmation dialog - FIXED: Proper cancel handling
     */
    showConfirmation(message, onConfirm, onCancel = null, type = 'warning') {
        return new Promise((resolve) => {
            const id = `confirm_${++this.toastCounter}_${Date.now()}`;
            
            const toast = document.createElement('div');
            toast.id = id;
            toast.className = `toast ${type} confirmation-toast`;
            toast.setAttribute('data-toast-id', id);
            toast.setAttribute('role', 'alertdialog');
            toast.setAttribute('aria-labelledby', `confirm-message-${id}`);
            
            const confirmHandler = () => {
                console.log('✅ Confirmation dialog: User confirmed');
                if (onConfirm) onConfirm();
                resolve(true);
                this.hide(id);
            };
            
            const cancelHandler = () => {
                console.log('❌ Confirmation dialog: User cancelled');
                if (onCancel) onCancel();
                resolve(false);
                this.hide(id);
            };
            
            // Create header with icon and message
            const header = document.createElement('div');
            header.className = 'toast-header';
            
            const icon = document.createElement('div');
            icon.className = 'toast-icon';
            icon.innerHTML = `<i class="fas ${this.getTypeIcon(type)}"></i>`;
            
            const messageEl = document.createElement('div');
            messageEl.className = 'toast-message';
            messageEl.id = `confirm-message-${id}`;
            messageEl.textContent = message;
            
            // FIXED: Close button properly calls cancelHandler
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.setAttribute('aria-label', 'Cancel');
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                cancelHandler();
            });
            
            header.appendChild(icon);
            header.appendChild(messageEl);
            header.appendChild(closeBtn);
            
            // Create actions container
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'toast-actions';
            
            // Cancel button
            const cancelButton = document.createElement('button');
            cancelButton.className = 'toast-cancel-btn';
            cancelButton.innerHTML = `<i class="fas fa-times" aria-hidden="true"></i><span>Cancel</span>`;
            cancelButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                cancelHandler();
            });
            
            // Confirm button
            const confirmButton = document.createElement('button');
            confirmButton.className = 'toast-confirm-btn';
            confirmButton.innerHTML = `<i class="fas fa-check" aria-hidden="true"></i><span>Confirm</span>`;
            confirmButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmHandler();
            });
            
            actionsContainer.appendChild(cancelButton);
            actionsContainer.appendChild(confirmButton);
            
            toast.appendChild(header);
            toast.appendChild(actionsContainer);
            
            // Ensure container exists
            if (!this.container || !document.body.contains(this.container)) {
                this.createToastContainer();
            }
            
            // Add to container
            this.container.appendChild(toast);
            
            // Store reference
            this.toasts.set(id, {
                element: toast,
                type: `confirmation-${type}`,
                message,
                timestamp: Date.now(),
                isConfirmation: true
            });
            
            // Trigger entrance animation
            requestAnimationFrame(() => {
                toast.offsetHeight; // Force reflow
                requestAnimationFrame(() => {
                    toast.classList.add('show');
                    
                    // Focus the confirm button for accessibility
                    setTimeout(() => {
                        confirmButton.focus();
                    }, 100);
                });
            });
            
            // Handle keyboard events
            const keyHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelHandler();
                    document.removeEventListener('keydown', keyHandler);
                } else if (e.key === 'Enter' && e.target === confirmButton) {
                    e.preventDefault();
                    confirmHandler();
                    document.removeEventListener('keydown', keyHandler);
                }
            };
            
            document.addEventListener('keydown', keyHandler);
            
            console.log(`📢 Confirmation dialog: ${message}`);
        });
    }
    
    // Convenience methods
    success(message, duration, options) {
        return this.show(message, 'success', duration, options);
    }
    
    error(message, duration, options) {
        return this.show(message, 'error', duration, options);
    }
    
    warning(message, duration, options) {
        return this.show(message, 'warning', duration, options);
    }
    
    info(message, duration, options) {
        return this.show(message, 'info', duration, options);
    }
    
    clearAll() {
        this.toasts.forEach((toast, id) => {
            this.hide(id);
        });
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Public API methods
    getToast(toastId) {
        return this.toasts.get(toastId);
    }
    
    getAllToasts() {
        return Array.from(this.toasts.values());
    }
    
    getToastCount() {
        return this.toasts.size;
    }
    
    setMaxToasts(max) {
        this.maxToasts = max;
        this.enforceMaxToasts();
    }
    
    setDefaultDuration(duration) {
        this.defaultDuration = duration;
    }
    
    isReady() {
        return this.isInitialized && this.container !== null;
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            toastCount: this.toasts.size,
            maxToasts: this.maxToasts,
            defaultDuration: this.defaultDuration,
            hasContainer: !!this.container
        };
    }
    
    cleanup() {
        console.log('🧹 ToastManager cleanup...');
        
        // Clear all toasts
        this.clearAll();
        
        // Clear all timeouts
        this.hideTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.hideTimeouts.clear();
        
        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // Remove event listeners
        eventManager.off('toast:show');
        eventManager.off('toast:hide');
        eventManager.off('toast:clear');
        
        // Reset state
        this.container = null;
        this.toasts.clear();
        this.isInitialized = false;
        
        console.log('✅ ToastManager cleanup completed');
    }
}
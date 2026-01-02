// ================================
// src/core/navigation/ButtonManager.js
// ================================

import { eventManager } from '../../utils/eventManager.js';
import { generateId } from '../../utils/utils.js';

export class ButtonManager {
    constructor() {
        this.buttons = new Map();
        this.buttonGroups = new Map();
        this.isInitialized = false;
        this.globalClickHandler = null;
        this.keyboardHandlers = new Map();
        this.containerHandlers = new Map();
    }
    
    async init() {
        try {
            this.setupGlobalClickHandler();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('✅ ButtonManager initialized');
        } catch (error) {
            console.error('❌ ButtonManager initialization failed:', error);
            throw error;
        }
    }
    
    setupGlobalClickHandler() {
        this.globalClickHandler = (event) => {
            const button = event.target.closest('button[data-button-id]');
            if (!button) return;
            
            const buttonId = button.getAttribute('data-button-id');
            const buttonConfig = this.buttons.get(buttonId);
            
            if (!buttonConfig) return;
            
            // Prevent default and stop propagation
            event.preventDefault();
            event.stopPropagation();
            
            // Check if button is disabled
            if (button.disabled || button.classList.contains('disabled') || buttonConfig.disabled) {
                return;
            }
            
            // Execute handler
            this.executeButtonHandler(buttonId, event, button);
        };
        
        document.addEventListener('click', this.globalClickHandler, true);
    }
    
    setupEventListeners() {
        // Listen for button state changes
        eventManager.on('button:enable', (data) => {
            this.enableButton(data.id);
        });
        
        eventManager.on('button:disable', (data) => {
            this.disableButton(data.id);
        });
        
        eventManager.on('button:update', (data) => {
            this.updateButton(data.id, data.updates);
        });
        
        eventManager.on('button:remove', (data) => {
            this.removeButton(data.id);
        });
        
        eventManager.on('button:group:enable', (data) => {
            this.enableButtonGroup(data.groupId);
        });
        
        eventManager.on('button:group:disable', (data) => {
            this.disableButtonGroup(data.groupId);
        });
    }
    
    /**
     * FIXED: Added setupEventHandlers method for container-specific event handling
     */
    setupEventHandlers(container) {
        if (!container) {
            console.warn('ButtonManager.setupEventHandlers called with no container');
            return;
        }
        
        console.log('🔘 Setting up event handlers for container:', container);
        
        // Find all buttons with data-button-id in this container
        const buttons = container.querySelectorAll('button[data-button-id]');
        
        buttons.forEach(button => {
            const buttonId = button.getAttribute('data-button-id');
            
            // Check if this button is registered
            if (!this.buttons.has(buttonId)) {
                console.warn(`Button ${buttonId} not registered with ButtonManager`);
                return;
            }
            
            // Remove existing event listeners if any
            const existingHandler = this.containerHandlers.get(buttonId);
            if (existingHandler) {
                button.removeEventListener('click', existingHandler);
            }
            
            // Create new event handler
            const clickHandler = (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                // Check if button is disabled
                if (button.disabled || button.classList.contains('disabled')) {
                    return;
                }
                
                // Execute handler
                this.executeButtonHandler(buttonId, event, button);
            };
            
            // Add event listener
            button.addEventListener('click', clickHandler);
            
            // Store handler reference for cleanup
            this.containerHandlers.set(buttonId, clickHandler);
            
            console.log(`🔘 Event handler setup for button: ${buttonId}`);
        });
        
        console.log(`🔘 Setup complete for ${buttons.length} buttons in container`);
    }
    
    /**
     * Register a button with the manager
     */
    registerButton(config) {
        const {
            id = generateId('btn'),
            label = 'Button',
            icon = null,
            type = 'secondary',
            size = 'medium',
            handler = null,
            group = null,
            disabled = false,
            loading = false,
            tooltip = null,
            keyboard = null,
            validation = null,
            confirmation = null,
            metadata = {}
        } = config;
        
        const buttonConfig = {
            id,
            label,
            icon,
            type,
            size,
            handler,
            group,
            disabled,
            loading,
            tooltip,
            keyboard,
            validation,
            confirmation,
            metadata,
            created: Date.now()
        };
        
        this.buttons.set(id, buttonConfig);
        
        // Add to group if specified
        if (group) {
            this.addToGroup(group, id);
        }
        
        // Setup keyboard shortcut if specified
        if (keyboard) {
            this.setupKeyboardShortcut(id, keyboard);
        }
        
        console.log(`🔘 Button registered: ${id}`);
        
        return id;
    }
    
    /**
     * Create button HTML
     */
    createButton(config) {
        const buttonId = this.registerButton(config);
        const buttonConfig = this.buttons.get(buttonId);
        
        const classes = [
            'btn',
            `btn-${buttonConfig.type}`,
            `btn-${buttonConfig.size}`,
            buttonConfig.loading ? 'btn-loading' : '',
            buttonConfig.disabled ? 'disabled' : ''
        ].filter(Boolean).join(' ');
        
        let buttonHTML = `<button class="${classes}" data-button-id="${buttonId}"`;
        
        if (buttonConfig.disabled) {
            buttonHTML += ' disabled';
        }
        
        if (buttonConfig.tooltip) {
            buttonHTML += ` title="${this.escapeHtml(buttonConfig.tooltip)}"`;
        }
        
        buttonHTML += '>';
        
        // Loading state
        if (buttonConfig.loading) {
            buttonHTML += '<i class="fas fa-spinner fa-spin btn-spinner"></i>';
        }
        
        // Icon
        if (buttonConfig.icon && !buttonConfig.loading) {
            buttonHTML += `<i class="fas ${buttonConfig.icon} btn-icon"></i>`;
        }
        
        // Label
        if (buttonConfig.label) {
            buttonHTML += `<span class="btn-label">${this.escapeHtml(buttonConfig.label)}</span>`;
        }
        
        buttonHTML += '</button>';
        
        return buttonHTML;
    }
    
    /**
     * Create a group of buttons
     */
    createButtonGroup(groupConfig) {
        const {
            id = generateId('btn-group'),
            buttons = [],
            layout = 'horizontal',
            spacing = 'normal',
            alignment = 'left',
            className = ''
        } = groupConfig;
        
        const groupClasses = [
            'btn-group',
            `btn-group-${layout}`,
            `btn-group-spacing-${spacing}`,
            `btn-group-align-${alignment}`,
            className
        ].filter(Boolean).join(' ');
        
        let groupHTML = `<div class="${groupClasses}" data-group-id="${id}">`;
        
        buttons.forEach(buttonConfig => {
            buttonConfig.group = id;
            groupHTML += this.createButton(buttonConfig);
        });
        
        groupHTML += '</div>';
        
        // Register the group
        this.buttonGroups.set(id, {
            id,
            buttons: buttons.map(b => b.id || generateId('btn')),
            layout,
            spacing,
            alignment,
            created: Date.now()
        });
        
        return groupHTML;
    }
    
    /**
     * Execute button handler with validation and confirmation
     */
    async executeButtonHandler(buttonId, event, buttonElement) {
        const buttonConfig = this.buttons.get(buttonId);
        if (!buttonConfig || !buttonConfig.handler) {
            console.warn(`No handler found for button: ${buttonId}`);
            return;
        }

        try {
            console.log(`🔘 Executing handler for button: ${buttonId}`);
            
            // Show loading state
            this.setButtonLoading(buttonId, true);
            
            // Run validation if specified
            if (buttonConfig.validation) {
                const isValid = await this.runValidation(buttonConfig.validation, buttonId);
                if (!isValid) {
                    this.setButtonLoading(buttonId, false);
                    return;
                }
            }
            
            // Handle confirmation if specified
            if (buttonConfig.confirmation) {
                const confirmed = await this.handleButtonConfirmation(buttonConfig.confirmation);
                if (!confirmed) {
                    this.setButtonLoading(buttonId, false);
                    return;
                }
            }
            
            // Execute the handler
            const result = await buttonConfig.handler(event, buttonElement, buttonConfig);
            
            // Emit button clicked event
            eventManager.emit('button:clicked', {
                buttonId,
                result,
                timestamp: Date.now()
            });
            
            console.log(`✅ Button handler executed successfully: ${buttonId}`);
            
        } catch (error) {
            console.error(`❌ Button handler failed for ${buttonId}:`, error);
            eventManager.emit('button:error', {
                buttonId,
                error: error.message,
                timestamp: Date.now()
            });
            
            if (window.toastManager?.isReady()) {
                window.toastManager.showError(`Action failed: ${error.message}`);
            }
        } finally {
            this.setButtonLoading(buttonId, false);
        }
    }
    
    /**
     * Handle button confirmation using ToastManager
     */
    async handleButtonConfirmation(confirmationConfig) {
        if (!window.toastManager?.isReady()) {
            console.warn('ToastManager not available for confirmation');
            return true; // Proceed without confirmation if ToastManager isn't ready
        }

        const message = typeof confirmationConfig === 'string' 
            ? confirmationConfig 
            : confirmationConfig.message || 'Are you sure?';
        
        const type = typeof confirmationConfig === 'object' 
            ? confirmationConfig.type || 'warning' 
            : 'warning';

        return window.toastManager.showConfirmation(
            message,
            type
        );
    }

    /**
     * Run validation for button action
     */
    async runValidation(validation, buttonId) {
        if (typeof validation === 'function') {
            try {
                return await validation(buttonId);
            } catch (error) {
                console.error('Button validation failed:', error);
                return false;
            }
        }
        
        if (typeof validation === 'object' && validation.handler) {
            try {
                return await validation.handler(buttonId);
            } catch (error) {
                console.error('Button validation failed:', error);
                return false;
            }
        }
        
        return true;
    }
    
    
    
    /**
     * Add button to group
     */
    addToGroup(groupId, buttonId) {
        if (!this.buttonGroups.has(groupId)) {
            this.buttonGroups.set(groupId, {
                id: groupId,
                buttons: [],
                created: Date.now()
            });
        }
        
        const group = this.buttonGroups.get(groupId);
        if (!group.buttons.includes(buttonId)) {
            group.buttons.push(buttonId);
        }
    }
    
    /**
     * Setup keyboard shortcut
     */
    setupKeyboardShortcut(buttonId, keyboard) {
        const handler = (event) => {
            const { key, ctrl, alt, shift } = keyboard;
            
            if (event.key === key || event.code === key) {
                const modifiersMatch = 
                    (!ctrl || event.ctrlKey) &&
                    (!alt || event.altKey) &&
                    (!shift || event.shiftKey);
                
                if (modifiersMatch) {
                    event.preventDefault();
                    const button = document.querySelector(`[data-button-id="${buttonId}"]`);
                    if (button && !button.disabled) {
                        this.executeButtonHandler(buttonId, event, button);
                    }
                }
            }
        };
        
        document.addEventListener('keydown', handler);
        
        // Store handler for cleanup
        this.keyboardHandlers.set(buttonId, handler);
    }
    
    /**
     * Update button configuration
     */
    updateButton(buttonId, updates) {
        const buttonConfig = this.buttons.get(buttonId);
        if (!buttonConfig) {
            console.warn(`Button ${buttonId} not found`);
            return false;
        }
        
        // Update configuration
        Object.assign(buttonConfig, updates);
        
        // Update DOM element
        const buttonElement = document.querySelector(`[data-button-id="${buttonId}"]`);
        if (buttonElement) {
            this.updateButtonDOM(buttonElement, buttonConfig);
        }
        
        return true;
    }
    
    /**
     * Update button DOM element
     */
    updateButtonDOM(buttonElement, config) {
        // Update classes
        buttonElement.className = [
            'btn',
            `btn-${config.type}`,
            `btn-${config.size}`,
            config.loading ? 'btn-loading' : '',
            config.disabled ? 'disabled' : ''
        ].filter(Boolean).join(' ');
        
        // Update disabled state
        buttonElement.disabled = config.disabled;
        
        // Update tooltip
        if (config.tooltip) {
            buttonElement.title = this.escapeHtml(config.tooltip);
        }
        
        // Update content
        let innerHTML = '';
        
        if (config.loading) {
            innerHTML += '<i class="fas fa-spinner fa-spin btn-spinner"></i>';
        } else if (config.icon) {
            innerHTML += `<i class="fas ${config.icon} btn-icon"></i>`;
        }
        
        if (config.label) {
            innerHTML += `<span class="btn-label">${this.escapeHtml(config.label)}</span>`;
        }
        
        buttonElement.innerHTML = innerHTML;
    }
    
    /**
     * Enable button
     */
    enableButton(buttonId) {
        const buttonConfig = this.buttons.get(buttonId);
        if (buttonConfig) {
            buttonConfig.disabled = false;
            
            const buttonElement = document.querySelector(`[data-button-id="${buttonId}"]`);
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.classList.remove('disabled');
            }
            
            console.log(`🔘 Button enabled: ${buttonId}`);
        }
    }
    
    /**
     * Disable button
     */
    disableButton(buttonId) {
        const buttonConfig = this.buttons.get(buttonId);
        if (buttonConfig) {
            buttonConfig.disabled = true;
            
            const buttonElement = document.querySelector(`[data-button-id="${buttonId}"]`);
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.classList.add('disabled');
            }
            
            console.log(`🔘 Button disabled: ${buttonId}`);
        }
    }
    
    /**
     * Set button loading state
     */
    setButtonLoading(buttonId, loading = true) {
        const buttonConfig = this.buttons.get(buttonId);
        if (buttonConfig) {
            buttonConfig.loading = loading;
            
            const buttonElement = document.querySelector(`[data-button-id="${buttonId}"]`);
            if (buttonElement) {
                this.updateButtonDOM(buttonElement, buttonConfig);
            }
        }
    }
    
    /**
     * Remove button
     */
    removeButton(buttonId) {
        // Remove from configuration
        this.buttons.delete(buttonId);
        
        // Remove from groups
        this.buttonGroups.forEach((group, groupId) => {
            const index = group.buttons.indexOf(buttonId);
            if (index > -1) {
                group.buttons.splice(index, 1);
            }
        });
        
        // Remove keyboard handler
        if (this.keyboardHandlers.has(buttonId)) {
            const handler = this.keyboardHandlers.get(buttonId);
            document.removeEventListener('keydown', handler);
            this.keyboardHandlers.delete(buttonId);
        }
        
        // Remove container handler
        this.containerHandlers.delete(buttonId);
        
        // Remove DOM element
        const buttonElement = document.querySelector(`[data-button-id="${buttonId}"]`);
        if (buttonElement) {
            buttonElement.remove();
        }
        
        console.log(`🔘 Button removed: ${buttonId}`);
    }
    
    /**
     * Enable button group
     */
    enableButtonGroup(groupId) {
        const group = this.buttonGroups.get(groupId);
        if (group) {
            group.buttons.forEach(buttonId => {
                this.enableButton(buttonId);
            });
        }
    }
    
    /**
     * Disable button group
     */
    disableButtonGroup(groupId) {
        const group = this.buttonGroups.get(groupId);
        if (group) {
            group.buttons.forEach(buttonId => {
                this.disableButton(buttonId);
            });
        }
    }
    
    /**
     * Get button configuration
     */
    getButton(buttonId) {
        return this.buttons.get(buttonId);
    }
    
    /**
     * Get button group
     */
    getButtonGroup(groupId) {
        return this.buttonGroups.get(groupId);
    }
    
    /**
     * Check if button exists
     */
    hasButton(buttonId) {
        return this.buttons.has(buttonId);
    }
    
    /**
     * Get all button IDs
     */
    getAllButtonIds() {
        return Array.from(this.buttons.keys());
    }
    
    /**
     * Get all group IDs
     */
    getAllGroupIds() {
        return Array.from(this.buttonGroups.keys());
    }
    
    /**
     * Get buttons by group
     */
    getButtonsByGroup(groupId) {
        const group = this.buttonGroups.get(groupId);
        return group ? group.buttons : [];
    }
    
    /**
     * Get buttons by type
     */
    getButtonsByType(type) {
        return Array.from(this.buttons.entries())
            .filter(([id, config]) => config.type === type)
            .map(([id, config]) => id);
    }
    
    /**
     * Count buttons
     */
    getButtonCount() {
        return this.buttons.size;
    }
    
    /**
     * Count groups
     */
    getGroupCount() {
        return this.buttonGroups.size;
    }
    
    /**
     * Utility method to escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Get status for debugging
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            buttonsCount: this.buttons.size,
            groupsCount: this.buttonGroups.size,
            keyboardHandlersCount: this.keyboardHandlers.size,
            containerHandlersCount: this.containerHandlers.size,
            buttons: Object.fromEntries(
                Array.from(this.buttons.entries()).map(([id, config]) => [
                    id,
                    {
                        type: config.type,
                        disabled: config.disabled,
                        loading: config.loading,
                        group: config.group
                    }
                ])
            )
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        console.log('🧹 ButtonManager cleanup...');
        
        // Remove global click handler
        if (this.globalClickHandler) {
            document.removeEventListener('click', this.globalClickHandler, true);
            this.globalClickHandler = null;
        }
        
        // Remove keyboard handlers
        this.keyboardHandlers.forEach((handler, buttonId) => {
            document.removeEventListener('keydown', handler);
        });
        this.keyboardHandlers.clear();
        
        // Clear container handlers
        this.containerHandlers.clear();
        
        // Clear configurations
        this.buttons.clear();
        this.buttonGroups.clear();
        
        // Reset state
        this.isInitialized = false;
        
        console.log('✅ ButtonManager cleanup completed');
    }
}
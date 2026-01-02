// ================================
// src/core/ui/CardManager.js - Generic Reusable Card Component System
// ================================

import { generateId } from '../../utils/utils.js';

export class CardManager {
    constructor(options = {}) {
        this.options = {
            className: 'card',
            allowExpansion: true,
            expandThreshold: 300,
            ...options
        };
        
        this.expandHandlers = new Map();
        this.clickHandlers = new Map();
    }
    
    /**
     * Create a grid container with specified layout
     */
    createGrid(layout = 'single', additionalClasses = '') {
        const layoutClasses = {
            'single': 'card-grid-single',
            'two-column': 'card-grid-two-col',
            'three-column': 'card-grid-three-col',
            'auto-fit': 'card-grid-auto-fit',
            'masonry': 'card-grid-masonry'
        };
        
        const gridClass = layoutClasses[layout] || 'card-grid-single';
        
        return `<div class="card-grid ${gridClass} ${additionalClasses}"></div>`;
    }
    
    /**
     * Create a basic card structure
     */
    createCard(config) {
        const {
            id = generateId('card'),
            className = '',
            header = null,
            content = '',
            footer = null,
            expandable = false,
            clickable = false,
            data = {}
        } = config;
        
        const cardClasses = [
            'card',
            className,
            expandable ? 'expandable' : '',
            clickable ? 'clickable' : ''
        ].filter(Boolean).join(' ');
        
        let cardHTML = `<div id="${id}" class="${cardClasses}"`;
        
        // Add data attributes
        if (Object.keys(data).length > 0) {
            Object.entries(data).forEach(([key, value]) => {
                cardHTML += ` data-${key}="${value}"`;
            });
        }
        
        cardHTML += '>';
        
        // Add header if provided
        if (header) {
            cardHTML += this.createCardHeader(header);
        }
        
        // Add content
        cardHTML += `<div class="card-content">${content}</div>`;
        
        // Add footer if provided
        if (footer) {
            cardHTML += this.createCardFooter(footer);
        }
        
        cardHTML += '</div>';
        
        return cardHTML;
    }
    
    /**
     * Create card header
     */
    createCardHeader(headerConfig) {
        const {
            title = '',
            icon = null,
            badge = null,
            actions = []
        } = headerConfig;
        
        let headerHTML = '<div class="card-header">';
        
        // Title section
        headerHTML += '<div class="card-header-title">';
        
        if (icon) {
            headerHTML += `<i class="fas ${icon} card-header-icon"></i>`;
        }
        
        headerHTML += `<h3>${title}</h3>`;
        headerHTML += '</div>';
        
        // Header right section
        if (badge || actions.length > 0) {
            headerHTML += '<div class="card-header-right">';
            
            if (badge) {
                headerHTML += this.createBadge(badge);
            }
            
            if (actions.length > 0) {
                headerHTML += '<div class="card-header-actions">';
                actions.forEach(action => {
                    headerHTML += this.createHeaderAction(action);
                });
                headerHTML += '</div>';
            }
            
            headerHTML += '</div>';
        }
        
        headerHTML += '</div>';
        
        return headerHTML;
    }
    
    /**
     * Create card footer
     */
    createCardFooter(footerConfig) {
        const {
            content = '',
            actions = [],
            alignment = 'right'
        } = footerConfig;
        
        let footerHTML = `<div class="card-footer card-footer-${alignment}">`;
        
        if (content) {
            footerHTML += `<div class="card-footer-content">${content}</div>`;
        }
        
        if (actions.length > 0) {
            footerHTML += '<div class="card-footer-actions">';
            actions.forEach(action => {
                footerHTML += this.createFooterAction(action);
            });
            footerHTML += '</div>';
        }
        
        footerHTML += '</div>';
        
        return footerHTML;
    }
    
    /**
     * Create badge element
     */
    createBadge(badgeConfig) {
        const {
            type = 'info',
            text = '',
            icon = null
        } = badgeConfig;
        
        let badgeHTML = `<div class="card-badge ${type}">`;
        
        if (icon) {
            badgeHTML += `<i class="fas ${icon}"></i>`;
        }
        
        badgeHTML += text;
        badgeHTML += '</div>';
        
        return badgeHTML;
    }
    
    /**
     * Create header action button
     */
    createHeaderAction(actionConfig) {
        const {
            id = generateId('action'),
            icon = 'fa-cog',
            tooltip = '',
            handler = null
        } = actionConfig;
        
        let actionHTML = `<button class="card-header-action" id="${id}"`;
        
        if (tooltip) {
            actionHTML += ` title="${tooltip}"`;
        }
        
        actionHTML += `><i class="fas ${icon}"></i></button>`;
        
        // Store handler for later binding
        if (handler) {
            this.clickHandlers.set(id, handler);
        }
        
        return actionHTML;
    }
    
    /**
     * Create footer action button
     */
    createFooterAction(actionConfig) {
        const {
            id = generateId('action'),
            label = 'Action',
            icon = null,
            type = 'secondary',
            handler = null,
            disabled = false
        } = actionConfig;
        
        let actionHTML = `<button class="btn btn-${type}" id="${id}"`;
        
        if (disabled) {
            actionHTML += ' disabled';
        }
        
        actionHTML += '>';
        
        if (icon) {
            actionHTML += `<i class="fas ${icon}"></i>`;
        }
        
        actionHTML += `<span>${label}</span></button>`;
        
        // Store handler for later binding
        if (handler) {
            this.clickHandlers.set(id, handler);
        }
        
        return actionHTML;
    }
    
    /**
     * Create expandable content
     */
    createExpandableContent(config) {
        const {
            content = '',
            threshold = this.options.expandThreshold,
            expandText = 'Show more',
            collapseText = 'Show less'
        } = config;
        
        const needsExpansion = content.length > threshold;
        const expandId = generateId('expand');
        
        if (!needsExpansion) {
            return `<div class="expandable-content">${content}</div>`;
        }
        
        const previewContent = content.substring(0, threshold) + '...';
        
        let expandableHTML = `
            <div class="expandable-content" id="content-${expandId}">
                <div class="content-preview">${previewContent}</div>
                <div class="content-full hidden">${content}</div>
            </div>
            <button class="expand-btn" type="button" data-target="content-${expandId}">
                <span class="expand-text">${expandText}</span>
                <i class="fas fa-chevron-down expand-icon"></i>
            </button>
        `;
        
        // Store expand handler
        this.expandHandlers.set(`content-${expandId}`, {
            expandText,
            collapseText
        });
        
        return expandableHTML;
    }
    
    /**
     * Create a list inside card content
     */
    createList(items, listConfig = {}) {
        const {
            type = 'unordered',
            className = '',
            itemRenderer = null
        } = listConfig;
        
        const listTag = type === 'ordered' ? 'ol' : 'ul';
        let listHTML = `<${listTag} class="card-list ${className}">`;
        
        items.forEach(item => {
            if (itemRenderer && typeof itemRenderer === 'function') {
                listHTML += `<li class="card-list-item">${itemRenderer(item)}</li>`;
            } else {
                listHTML += `<li class="card-list-item">${item}</li>`;
            }
        });
        
        listHTML += `</${listTag}>`;
        
        return listHTML;
    }
    
    /**
     * Create a table inside card content
     */
    createTable(data, tableConfig = {}) {
        const {
            headers = [],
            className = '',
            striped = true,
            bordered = false
        } = tableConfig;
        
        const tableClasses = [
            'card-table',
            className,
            striped ? 'striped' : '',
            bordered ? 'bordered' : ''
        ].filter(Boolean).join(' ');
        
        let tableHTML = `<table class="${tableClasses}">`;
        
        // Add headers if provided
        if (headers.length > 0) {
            tableHTML += '<thead><tr>';
            headers.forEach(header => {
                tableHTML += `<th>${header}</th>`;
            });
            tableHTML += '</tr></thead>';
        }
        
        // Add data rows
        tableHTML += '<tbody>';
        data.forEach(row => {
            tableHTML += '<tr>';
            if (Array.isArray(row)) {
                row.forEach(cell => {
                    tableHTML += `<td>${cell}</td>`;
                });
            } else {
                Object.values(row).forEach(cell => {
                    tableHTML += `<td>${cell}</td>`;
                });
            }
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody>';
        
        tableHTML += '</table>';
        
        return tableHTML;
    }
    
    /**
     * Create form elements inside card
     */
    createForm(fields, formConfig = {}) {
        const {
            id = generateId('form'),
            className = '',
            layout = 'vertical'
        } = formConfig;
        
        let formHTML = `<form id="${id}" class="card-form card-form-${layout} ${className}">`;
        
        fields.forEach(field => {
            formHTML += this.createFormField(field);
        });
        
        formHTML += '</form>';
        
        return formHTML;
    }
    
    /**
     * Create individual form field
     */
    createFormField(fieldConfig) {
        const {
            type = 'text',
            id = generateId('field'),
            label = '',
            placeholder = '',
            value = '',
            required = false,
            disabled = false,
            className = ''
        } = fieldConfig;
        
        let fieldHTML = `<div class="form-field ${className}">`;
        
        if (label) {
            fieldHTML += `<label for="${id}" class="form-label">${label}</label>`;
        }
        
        switch (type) {
            case 'textarea':
                fieldHTML += `<textarea id="${id}" class="form-input" placeholder="${placeholder}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>${value}</textarea>`;
                break;
            case 'select':
                fieldHTML += `<select id="${id}" class="form-input" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>`;
                if (fieldConfig.options) {
                    fieldConfig.options.forEach(option => {
                        const selected = option.value === value ? 'selected' : '';
                        fieldHTML += `<option value="${option.value}" ${selected}>${option.label}</option>`;
                    });
                }
                fieldHTML += '</select>';
                break;
            default:
                fieldHTML += `<input type="${type}" id="${id}" class="form-input" placeholder="${placeholder}" value="${value}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>`;
        }
        
        fieldHTML += '</div>';
        
        return fieldHTML;
    }
    
    /**
     * Create empty state
     */
    createEmptyState(config) {
        const {
            icon = 'fa-inbox',
            title = 'No data available',
            message = '',
            actions = []
        } = config;
        
        let emptyHTML = '<div class="empty-state">';
        
        emptyHTML += `<div class="empty-state-icon">`;
        emptyHTML += `<i class="fas ${icon}"></i>`;
        emptyHTML += '</div>';
        
        emptyHTML += `<h4 class="empty-state-title">${title}</h4>`;
        
        if (message) {
            emptyHTML += `<p class="empty-state-message">${message}</p>`;
        }
        
        if (actions.length > 0) {
            emptyHTML += '<div class="empty-state-actions">';
            actions.forEach(action => {
                emptyHTML += this.createFooterAction(action);
            });
            emptyHTML += '</div>';
        }
        
        emptyHTML += '</div>';
        
        return emptyHTML;
    }
    
    /**
     * Create loading state
     */
    createLoadingState(config = {}) {
        const {
            message = 'Loading...',
            showSpinner = true,
            showProgress = false,
            progress = 0
        } = config;
        
        let loadingHTML = '<div class="loading-state">';
        
        if (showSpinner) {
            loadingHTML += '<div class="loading-spinner"></div>';
        }
        
        loadingHTML += `<p class="loading-message">${message}</p>`;
        
        if (showProgress) {
            loadingHTML += '<div class="loading-progress">';
            loadingHTML += '<div class="progress-bar">';
            loadingHTML += `<div class="progress-fill" style="width: ${progress}%"></div>`;
            loadingHTML += '</div>';
            loadingHTML += '</div>';
        }
        
        loadingHTML += '</div>';
        
        return loadingHTML;
    }
    
    /**
     * Create error state
     */
    createErrorState(config) {
        const {
            title = 'Error',
            message = 'Something went wrong',
            actions = []
        } = config;
        
        let errorHTML = '<div class="error-state">';
        
        errorHTML += '<div class="error-state-icon">';
        errorHTML += '<i class="fas fa-exclamation-triangle"></i>';
        errorHTML += '</div>';
        
        errorHTML += `<h4 class="error-state-title">${title}</h4>`;
        errorHTML += `<p class="error-state-message">${message}</p>`;
        
        if (actions.length > 0) {
            errorHTML += '<div class="error-state-actions">';
            actions.forEach(action => {
                errorHTML += this.createFooterAction(action);
            });
            errorHTML += '</div>';
        }
        
        errorHTML += '</div>';
        
        return errorHTML;
    }
    
    /**
     * Setup event handlers for cards in a container
     */
    setupEventHandlers(container) {
        if (!container) return;
        
        // Setup expansion handlers
        this.setupExpansionHandlers(container);
        
        // Setup click handlers
        this.setupClickHandlers(container);
    }
    
    /**
     * Setup expansion handlers for expandable content
     */
    setupExpansionHandlers(container) {
        const expandButtons = container.querySelectorAll('.expand-btn');
        
        expandButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const targetId = button.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);
                
                if (!targetElement) return;
                
                const preview = targetElement.querySelector('.content-preview');
                const full = targetElement.querySelector('.content-full');
                const expandText = button.querySelector('.expand-text');
                const expandIcon = button.querySelector('.expand-icon');
                
                if (!preview || !full || !expandText || !expandIcon) return;
                
                const isExpanded = !full.classList.contains('hidden');
                const handlers = this.expandHandlers.get(targetId);
                
                if (isExpanded) {
                    // Collapse
                    preview.classList.remove('hidden');
                    full.classList.add('hidden');
                    expandText.textContent = handlers?.expandText || 'Show more';
                    expandIcon.className = 'fas fa-chevron-down expand-icon';
                } else {
                    // Expand
                    preview.classList.add('hidden');
                    full.classList.remove('hidden');
                    expandText.textContent = handlers?.collapseText || 'Show less';
                    expandIcon.className = 'fas fa-chevron-up expand-icon';
                }
            });
        });
    }
    
    /**
     * Setup click handlers for action buttons
     */
    setupClickHandlers(container) {
        this.clickHandlers.forEach((handler, id) => {
            const element = container.querySelector(`#${id}`);
            if (element && handler) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handler(e, element);
                });
            }
        });
    }
    
    /**
     * Update card content
     */
    updateCardContent(cardId, newContent) {
        const card = document.getElementById(cardId);
        if (!card) return false;
        
        const contentElement = card.querySelector('.card-content');
        if (!contentElement) return false;
        
        contentElement.innerHTML = newContent;
        
        // Re-setup event handlers for the updated content
        this.setupEventHandlers(card);
        
        return true;
    }
    
    /**
     * Update card header
     */
    updateCardHeader(cardId, headerConfig) {
        const card = document.getElementById(cardId);
        if (!card) return false;
        
        const headerElement = card.querySelector('.card-header');
        if (!headerElement) return false;
        
        headerElement.innerHTML = this.createCardHeader(headerConfig).replace('<div class="card-header">', '').replace('</div>', '');
        
        // Re-setup event handlers for the updated header
        this.setupEventHandlers(card);
        
        return true;
    }
    
    /**
     * Update badge
     */
    updateBadge(cardId, badgeConfig) {
        const card = document.getElementById(cardId);
        if (!card) return false;
        
        const badgeElement = card.querySelector('.card-badge');
        if (!badgeElement) return false;
        
        const newBadge = this.createBadge(badgeConfig);
        badgeElement.outerHTML = newBadge;
        
        return true;
    }
    
    /**
     * Show/hide card
     */
    toggleCard(cardId, show = null) {
        const card = document.getElementById(cardId);
        if (!card) return false;
        
        if (show === null) {
            card.classList.toggle('hidden');
        } else if (show) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
        
        return true;
    }
    
    /**
     * Add loading state to card
     */
    setCardLoading(cardId, loading = true, message = 'Loading...') {
        const card = document.getElementById(cardId);
        if (!card) return false;
        
        if (loading) {
            card.classList.add('loading');
            const contentElement = card.querySelector('.card-content');
            if (contentElement) {
                contentElement.dataset.originalContent = contentElement.innerHTML;
                contentElement.innerHTML = this.createLoadingState({ message });
            }
        } else {
            card.classList.remove('loading');
            const contentElement = card.querySelector('.card-content');
            if (contentElement && contentElement.dataset.originalContent) {
                contentElement.innerHTML = contentElement.dataset.originalContent;
                delete contentElement.dataset.originalContent;
            }
        }
        
        return true;
    }
    
    /**
     * Set card error state
     */
    setCardError(cardId, errorConfig) {
        const card = document.getElementById(cardId);
        if (!card) return false;
        
        card.classList.add('error');
        const contentElement = card.querySelector('.card-content');
        if (contentElement) {
            contentElement.innerHTML = this.createErrorState(errorConfig);
            this.setupEventHandlers(card);
        }
        
        return true;
    }
    
    /**
     * Remove card
     */
    removeCard(cardId) {
        const card = document.getElementById(cardId);
        if (!card) return false;
        
        // Clean up handlers
        this.clickHandlers.forEach((handler, id) => {
            if (card.querySelector(`#${id}`)) {
                this.clickHandlers.delete(id);
            }
        });
        
        this.expandHandlers.forEach((handler, id) => {
            if (card.querySelector(`#${id}`)) {
                this.expandHandlers.delete(id);
            }
        });
        
        card.remove();
        return true;
    }
    
    /**
     * Clean up all handlers
     */
    cleanup() {
        this.clickHandlers.clear();
        this.expandHandlers.clear();
    }
    
    /**
     * Get card element
     */
    getCard(cardId) {
        return document.getElementById(cardId);
    }
    
    /**
     * Check if card exists
     */
    hasCard(cardId) {
        return !!document.getElementById(cardId);
    }
}
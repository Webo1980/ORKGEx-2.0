// ================================
// src/components/editors/InlineEditor.js - Complete Implementation
// ================================

export class InlineEditor {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            multiline: false,
            placeholder: 'Click to edit...',
            maxLength: null,
            minLength: 0,
            onChange: null,
            onFocus: null,
            onBlur: null,
            validateInput: null,
            saveOnBlur: true,
            saveOnEnter: !options.multiline,
            enabled: true,
            ...options
        };
        
        this.originalValue = '';
        this.currentValue = '';
        this.isEditing = false;
        this.isEnabled = this.options.enabled;
        
        // Bind methods
        this.handleFocus = this.handleFocus.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handlePaste = this.handlePaste.bind(this);
        
        this.init();
    }
    
    init() {
        if (!this.element) {
            console.error('InlineEditor: Element not provided');
            return;
        }
        
        // Store original value
        this.originalValue = this.element.textContent || '';
        this.currentValue = this.originalValue;
        
        // Setup element
        this.setupElement();
        
        // Attach event listeners if enabled
        if (this.isEnabled) {
            this.attachEventListeners();
        }
    }
    
    setupElement() {
        // Make element editable
        this.element.contentEditable = this.isEnabled ? 'true' : 'false';
        this.element.classList.add('inline-editor');
        
        if (this.isEnabled) {
            this.element.classList.add('inline-editor-enabled');
        }
        
        // Add placeholder if empty
        if (!this.element.textContent && this.options.placeholder) {
            this.element.dataset.placeholder = this.options.placeholder;
            this.element.classList.add('empty');
        }
        
        // Set attributes
        if (this.options.maxLength) {
            this.element.dataset.maxLength = this.options.maxLength;
        }
        
        // Prevent line breaks in single-line mode
        if (!this.options.multiline) {
            this.element.style.whiteSpace = 'nowrap';
            this.element.style.overflow = 'hidden';
            this.element.style.textOverflow = 'ellipsis';
        }
        
        // Add edit icon
        this.addEditIcon();
    }
    
    addEditIcon() {
        // Check if icon already exists
        if (this.element.querySelector('.inline-edit-icon')) {
            return;
        }
        
        const icon = document.createElement('span');
        icon.className = 'inline-edit-icon';
        icon.innerHTML = '<i class="fas fa-pencil-alt"></i>';
        icon.style.cssText = `
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
            font-size: 12px;
            color: var(--text-secondary);
        `;
        
        // Make parent relative if not already
        const computedStyle = window.getComputedStyle(this.element);
        if (computedStyle.position === 'static') {
            this.element.style.position = 'relative';
        }
        
        this.element.appendChild(icon);
        
        // Show icon on hover
        this.element.addEventListener('mouseenter', () => {
            if (this.isEnabled && !this.isEditing) {
                icon.style.opacity = '1';
            }
        });
        
        this.element.addEventListener('mouseleave', () => {
            icon.style.opacity = '0';
        });
    }
    
    attachEventListeners() {
        this.element.addEventListener('focus', this.handleFocus);
        this.element.addEventListener('blur', this.handleBlur);
        this.element.addEventListener('input', this.handleInput);
        this.element.addEventListener('keydown', this.handleKeydown);
        this.element.addEventListener('paste', this.handlePaste);
    }
    
    removeEventListeners() {
        this.element.removeEventListener('focus', this.handleFocus);
        this.element.removeEventListener('blur', this.handleBlur);
        this.element.removeEventListener('input', this.handleInput);
        this.element.removeEventListener('keydown', this.handleKeydown);
        this.element.removeEventListener('paste', this.handlePaste);
    }
    
    handleFocus(e) {
        this.isEditing = true;
        this.element.classList.add('editing');
        this.element.classList.remove('empty');
        
        // Hide edit icon
        const icon = this.element.querySelector('.inline-edit-icon');
        if (icon) {
            icon.style.opacity = '0';
        }
        
        // Select all text for easy replacement
        if (this.element.textContent === this.options.placeholder) {
            this.element.textContent = '';
        } else {
            this.selectAll();
        }
        
        // Store original value for potential revert
        this.originalValue = this.currentValue;
        
        if (this.options.onFocus) {
            this.options.onFocus(this.currentValue);
        }
    }
    
    handleBlur(e) {
        this.isEditing = false;
        this.element.classList.remove('editing');
        
        // Restore placeholder if empty
        if (!this.element.textContent) {
            this.element.classList.add('empty');
            if (this.options.placeholder) {
                this.element.textContent = this.options.placeholder;
            }
        }
        
        // Save on blur if enabled
        if (this.options.saveOnBlur) {
            this.save();
        }
        
        if (this.options.onBlur) {
            this.options.onBlur(this.currentValue);
        }
    }
    
    handleInput(e) {
        // Check max length
        if (this.options.maxLength) {
            const text = this.element.textContent;
            if (text.length > this.options.maxLength) {
                this.element.textContent = text.substring(0, this.options.maxLength);
                this.placeCaretAtEnd();
            }
        }
        
        // Prevent line breaks in single-line mode
        if (!this.options.multiline) {
            const text = this.element.textContent;
            const cleaned = text.replace(/\n/g, ' ');
            if (text !== cleaned) {
                this.element.textContent = cleaned;
                this.placeCaretAtEnd();
            }
        }
        
        this.currentValue = this.element.textContent;
    }
    
    handleKeydown(e) {
        // Enter key handling
        if (e.key === 'Enter') {
            if (!this.options.multiline) {
                e.preventDefault();
                if (this.options.saveOnEnter) {
                    this.save();
                    this.element.blur();
                }
            }
        }
        
        // Escape key to cancel
        if (e.key === 'Escape') {
            e.preventDefault();
            this.cancel();
            this.element.blur();
        }
        
        // Tab key to save and move to next
        if (e.key === 'Tab') {
            if (this.options.saveOnBlur) {
                this.save();
            }
        }
    }
    
    handlePaste(e) {
        e.preventDefault();
        
        // Get plain text from clipboard
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        
        // Clean text based on mode
        let cleaned = text;
        if (!this.options.multiline) {
            cleaned = text.replace(/\n/g, ' ');
        }
        
        // Check max length
        if (this.options.maxLength) {
            const currentLength = this.element.textContent.length;
            const selection = window.getSelection();
            const selectedLength = selection.toString().length;
            const availableLength = this.options.maxLength - currentLength + selectedLength;
            
            if (availableLength > 0) {
                cleaned = cleaned.substring(0, availableLength);
            } else {
                return;
            }
        }
        
        // Insert text at cursor position
        document.execCommand('insertText', false, cleaned);
    }
    
    save() {
        const newValue = this.element.textContent;
        
        // Validate if validator provided
        if (this.options.validateInput) {
            const isValid = this.options.validateInput(newValue);
            if (!isValid) {
                this.cancel();
                return false;
            }
        }
        
        // Check min length
        if (this.options.minLength && newValue.length < this.options.minLength) {
            this.cancel();
            return false;
        }
        
        // Only trigger onChange if value actually changed
        if (newValue !== this.originalValue) {
            this.currentValue = newValue;
            if (this.options.onChange) {
                this.options.onChange(newValue, this.originalValue);
            }
        }
        
        return true;
    }
    
    cancel() {
        this.element.textContent = this.originalValue;
        this.currentValue = this.originalValue;
    }
    
    // Public methods
    
    enable() {
        if (this.isEnabled) return;
        
        this.isEnabled = true;
        this.element.contentEditable = 'true';
        this.element.classList.add('inline-editor-enabled');
        this.attachEventListeners();
    }
    
    disable() {
        if (!this.isEnabled) return;
        
        this.isEnabled = false;
        this.element.contentEditable = 'false';
        this.element.classList.remove('inline-editor-enabled');
        this.removeEventListeners();
        
        if (this.isEditing) {
            this.element.blur();
        }
    }
    
    getValue() {
        return this.currentValue;
    }
    
    setValue(value) {
        this.element.textContent = value;
        this.currentValue = value;
        this.originalValue = value;
        
        if (!value && this.options.placeholder) {
            this.element.classList.add('empty');
        } else {
            this.element.classList.remove('empty');
        }
    }
    
    focus() {
        if (this.isEnabled) {
            this.element.focus();
        }
    }
    
    blur() {
        this.element.blur();
    }
    
    destroy() {
        this.removeEventListeners();
        this.element.contentEditable = 'false';
        this.element.classList.remove('inline-editor', 'inline-editor-enabled', 'editing', 'empty');
        
        // Remove edit icon
        const icon = this.element.querySelector('.inline-edit-icon');
        if (icon) {
            icon.remove();
        }
        
        // Clear references
        this.element = null;
        this.options = null;
    }
    
    // Utility methods
    
    selectAll() {
        const range = document.createRange();
        range.selectNodeContents(this.element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    placeCaretAtEnd() {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(this.element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    getCaretPosition() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return 0;
        
        const range = selection.getRangeAt(0);
        const clonedRange = range.cloneRange();
        clonedRange.selectNodeContents(this.element);
        clonedRange.setEnd(range.endContainer, range.endOffset);
        
        return clonedRange.toString().length;
    }
    
    setCaretPosition(position) {
        const textNode = this.element.firstChild;
        if (!textNode) return;
        
        const range = document.createRange();
        const selection = window.getSelection();
        
        range.setStart(textNode, Math.min(position, textNode.length));
        range.collapse(true);
        
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

export default InlineEditor;
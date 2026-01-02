// ================================
// src/components/ui/TagDisplay.js - Animated Tag Display Component
// ================================

export class TagDisplay {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            maxVisible: 3,
            animationDuration: 300,
            expandOnHover: true,
            className: 'tag-display',
            ...options
        };
        
        this.tags = [];
        this.isExpanded = false;
        this.tagElements = new Map();
    }
    
    /**
     * Set tags to display
     * @param {Array} tags - Array of tag objects or strings
     */
    setTags(tags) {
        this.tags = tags.map(tag => {
            if (typeof tag === 'string') {
                return { label: tag, value: tag };
            }
            return tag;
        });
        
        this.render();
    }
    
    /**
     * Render the tag display
     */
    render() {
        if (!this.container) return;
        
        // Clear existing content
        this.container.innerHTML = '';
        this.tagElements.clear();
        
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = `${this.options.className}-wrapper`;
        
        // Create tags container
        const tagsContainer = document.createElement('div');
        tagsContainer.className = `${this.options.className}-container`;
        
        // Render tags
        this.tags.forEach((tag, index) => {
            const tagElement = this.createTagElement(tag, index);
            tagsContainer.appendChild(tagElement);
            this.tagElements.set(tag.value, tagElement);
        });
        
        wrapper.appendChild(tagsContainer);
        
        // Add expand button if needed
        if (this.tags.length > this.options.maxVisible) {
            const expandButton = this.createExpandButton();
            wrapper.appendChild(expandButton);
        }
        
        this.container.appendChild(wrapper);
        
        // Setup animations
        this.setupAnimations();
        
        // Setup hover behavior
        if (this.options.expandOnHover) {
            this.setupHoverBehavior();
        }
    }
    
    /**
     * Create a tag element
     */
    createTagElement(tag, index) {
        const element = document.createElement('div');
        element.className = `${this.options.className}-item`;
        element.dataset.index = index;
        element.dataset.value = tag.value;
        
        // Create label
        const label = document.createElement('span');
        label.className = `${this.options.className}-label`;
        label.textContent = tag.label;
        
        // Add tooltip for long labels
        if (tag.label.length > 20) {
            element.title = tag.label;
        }
        
        // Add value indicator if different from label
        if (tag.value && tag.value !== tag.label) {
            const value = document.createElement('span');
            value.className = `${this.options.className}-value`;
            value.textContent = tag.value;
            element.appendChild(value);
        }
        
        element.appendChild(label);
        
        // Add color or icon if provided
        if (tag.color) {
            element.style.setProperty('--tag-color', tag.color);
        }
        
        if (tag.icon) {
            const icon = document.createElement('i');
            icon.className = `${tag.icon} ${this.options.className}-icon`;
            element.insertBefore(icon, label);
        }
        
        // Initially hide tags beyond maxVisible
        if (!this.isExpanded && index >= this.options.maxVisible) {
            element.classList.add('hidden');
            element.style.display = 'none';
        }
        
        return element;
    }
    
    /**
     * Create expand/collapse button
     */
    createExpandButton() {
        const button = document.createElement('button');
        button.className = `${this.options.className}-expand-btn`;
        
        const hiddenCount = this.tags.length - this.options.maxVisible;
        button.innerHTML = `
            <span class="expand-text">+${hiddenCount} more</span>
            <span class="collapse-text">Show less</span>
            <i class="fas fa-chevron-down expand-icon"></i>
        `;
        
        button.addEventListener('click', () => this.toggleExpand());
        
        return button;
    }
    
    /**
     * Setup animations for tags
     */
    setupAnimations() {
        const items = this.container.querySelectorAll(`.${this.options.className}-item`);
        
        items.forEach((item, index) => {
            // Stagger animation on initial render
            item.style.animationDelay = `${index * 50}ms`;
            item.classList.add('animate-in');
            
            // Remove animation class after completion
            setTimeout(() => {
                item.classList.remove('animate-in');
            }, this.options.animationDuration + (index * 50));
        });
    }
    
    /**
     * Setup hover behavior for expansion
     */
    setupHoverBehavior() {
        const wrapper = this.container.querySelector(`.${this.options.className}-wrapper`);
        if (!wrapper) return;
        
        let hoverTimeout;
        
        wrapper.addEventListener('mouseenter', () => {
            if (this.tags.length > this.options.maxVisible) {
                hoverTimeout = setTimeout(() => {
                    this.expand();
                }, 200);
            }
        });
        
        wrapper.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            if (this.isExpanded) {
                setTimeout(() => {
                    this.collapse();
                }, 300);
            }
        });
    }
    
    /**
     * Toggle expand/collapse state
     */
    toggleExpand() {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }
    
    /**
     * Expand to show all tags
     */
    expand() {
        if (this.isExpanded) return;
        
        this.isExpanded = true;
        const wrapper = this.container.querySelector(`.${this.options.className}-wrapper`);
        const button = this.container.querySelector(`.${this.options.className}-expand-btn`);
        
        if (wrapper) {
            wrapper.classList.add('expanded');
        }
        
        if (button) {
            button.classList.add('expanded');
        }
        
        // Show hidden tags with animation
        const hiddenTags = this.container.querySelectorAll(`.${this.options.className}-item.hidden`);
        hiddenTags.forEach((tag, index) => {
            tag.style.display = '';
            setTimeout(() => {
                tag.classList.remove('hidden');
                tag.classList.add('expanding');
                
                setTimeout(() => {
                    tag.classList.remove('expanding');
                }, this.options.animationDuration);
            }, index * 30);
        });
    }
    
    /**
     * Collapse to show limited tags
     */
    collapse() {
        if (!this.isExpanded) return;
        
        this.isExpanded = false;
        const wrapper = this.container.querySelector(`.${this.options.className}-wrapper`);
        const button = this.container.querySelector(`.${this.options.className}-expand-btn`);
        
        if (wrapper) {
            wrapper.classList.remove('expanded');
        }
        
        if (button) {
            button.classList.remove('expanded');
        }
        
        // Hide extra tags with animation
        const extraTags = this.container.querySelectorAll(`.${this.options.className}-item`);
        extraTags.forEach((tag, index) => {
            if (index >= this.options.maxVisible) {
                tag.classList.add('collapsing');
                
                setTimeout(() => {
                    tag.classList.add('hidden');
                    tag.classList.remove('collapsing');
                    tag.style.display = 'none';
                }, this.options.animationDuration);
            }
        });
    }
    
    /**
     * Update a specific tag
     */
    updateTag(value, updates) {
        const tagElement = this.tagElements.get(value);
        if (!tagElement) return;
        
        const tagIndex = this.tags.findIndex(t => t.value === value);
        if (tagIndex === -1) return;
        
        // Update tag data
        this.tags[tagIndex] = { ...this.tags[tagIndex], ...updates };
        
        // Re-render the specific tag
        const newElement = this.createTagElement(this.tags[tagIndex], tagIndex);
        tagElement.replaceWith(newElement);
        this.tagElements.set(value, newElement);
    }
    
    /**
     * Remove a tag
     */
    removeTag(value) {
        const tagElement = this.tagElements.get(value);
        if (!tagElement) return;
        
        // Animate removal
        tagElement.classList.add('removing');
        
        setTimeout(() => {
            tagElement.remove();
            this.tagElements.delete(value);
            
            // Update tags array
            this.tags = this.tags.filter(t => t.value !== value);
            
            // Re-render if needed
            if (this.tags.length <= this.options.maxVisible) {
                this.render();
            }
        }, this.options.animationDuration);
    }
    
    /**
     * Clear all tags
     */
    clear() {
        const wrapper = this.container.querySelector(`.${this.options.className}-wrapper`);
        if (wrapper) {
            wrapper.classList.add('clearing');
            
            setTimeout(() => {
                this.tags = [];
                this.tagElements.clear();
                this.container.innerHTML = '';
            }, this.options.animationDuration);
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.clear();
        this.container = null;
        this.tagElements.clear();
    }
}
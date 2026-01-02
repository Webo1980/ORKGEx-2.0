// src/content/modules/ui/PropertyWindow.js

class PropertyWindow {
    constructor() {
        this.windowElement = null;
        this.isVisible = false;
        this.isMinimized = false;
        this.currentSelectedText = '';
        this.currentPosition = { x: 0, y: 0 };
        this.selectedProperty = null;
        this.selectedColor = null;
        this.savedRange = null;
        
        // Control flags
        this.isUserInteracting = false;
        this.documentClickListener = null;
        this.escapeKeyListener = null;
        
        // Dragging state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.windowStartX = 0;
        this.windowStartY = 0;

        this.aiSuggestions = [];
        this.orkgProperties = [];
        this.searchTimeout = null;
        this.isLoadingAI = false;
        this.isLoadingORKG = false;
        
        this.WINDOW_WIDTH = 380;
        this.WINDOW_HEIGHT = 520;
        this.WINDOW_HEIGHT_MINIMIZED = 40;
        this.SEARCH_DEBOUNCE = 300;
        this.AI_SUGGESTION_CACHE = new Map();
        
        // Color palette for random selection
        this.colorPalette = [
            '#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1',
            '#B0E0E6', '#98FB98', '#DDA0DD', '#F5DEB3',
            '#87CEEB', '#FFA07A', '#FFEFD5', '#F0FFF0'
        ];
    }
    
    createWindow() {
        if (this.windowElement) {
            return this.windowElement;
        }
        
        this.windowElement = document.createElement('div');
        this.windowElement.className = 'orkg-property-window';
        this.windowElement.setAttribute('data-orkg-element', 'property-window');
        
        this.windowElement.innerHTML = this.getWindowHTML();
        
        // Add CSS link to document if not already present
        if (!document.getElementById('orkg-property-window-styles')) {
            const link = document.createElement('link');
            link.id = 'orkg-property-window-styles';
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.runtime.getURL('src/styles/content/property-window.css');
            document.head.appendChild(link);
        }
        
        this.setupEventListeners();
        
        return this.windowElement;
    }
    
    getWindowHTML() {
        return `
            <div class="orkg-window-header">
                <h4 class="orkg-window-title">Select Property</h4>
                <div class="orkg-header-actions">
                    <button class="orkg-header-btn orkg-minimize-btn" data-action="minimize" title="Minimize">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/>
                        </svg>
                    </button>
                    <button class="orkg-header-btn orkg-close-btn" data-action="close" title="Close">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M12.854 4.854a.5.5 0 0 0-.708-.708L8 8.293 3.854 4.146a.5.5 0 1 0-.708.708L7.293 9l-4.147 4.146a.5.5 0 0 0 .708.708L8 9.707l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 9l4.147-4.146z"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="orkg-window-body">
                <div class="orkg-section orkg-text-preview-section">
                    <span class="orkg-preview-label">Selected text:</span>
                    <span class="orkg-text-preview"></span>
                </div>
                
                <div class="orkg-section orkg-search-section">
                    <div class="orkg-search-container">
                        <input type="text" 
                               class="orkg-search-input" 
                               placeholder="Search ORKG properties..."
                               autocomplete="off">
                        <div class="orkg-search-loading orkg-hidden">
                            <div class="orkg-spinner"></div>
                        </div>
                    </div>
                </div>
                
                <div class="orkg-section orkg-ai-section">
                    <h5 class="orkg-section-title orkg-ai-title">
                        <svg class="orkg-section-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M9.5 2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 2.5v2A1.5 1.5 0 0 0 6.5 6h3A1.5 1.5 0 0 0 11 4.5v-2A1.5 1.5 0 0 0 9.5 1h-3z"/>
                        </svg>
                        AI Suggestions
                        <span class="orkg-badge orkg-ai-badge orkg-hidden">0</span>
                    </h5>
                    <div class="orkg-suggestions-loading orkg-hidden">
                        <div class="orkg-spinner"></div>
                        <span class="orkg-loading-text">Analyzing text...</span>
                    </div>
                    <div class="orkg-tags-container orkg-suggestion-list"></div>
                    <div class="orkg-no-suggestions orkg-hidden">
                        <span>No AI suggestions available</span>
                    </div>
                </div>
                
                <div class="orkg-section orkg-properties-section">
                    <h5 class="orkg-section-title orkg-properties-title">
                        <svg class="orkg-section-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M12.643 15C13.979 15 15 13.845 15 12.5V5H1v7.5C1 13.845 2.021 15 3.357 15h9.286zM5.5 7h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zM5.5 9h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zM5.5 11h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1z"/>
                        </svg>
                        ORKG Properties
                        <span class="orkg-badge orkg-property-badge orkg-hidden">0</span>
                    </h5>
                    <div class="orkg-update-indicator">Properties updated!</div>
                    <div class="orkg-properties-loading orkg-hidden">
                        <div class="orkg-spinner"></div>
                        <span class="orkg-loading-text">Searching properties...</span>
                    </div>
                    <div class="orkg-item-list orkg-property-list"></div>
                    <div class="orkg-no-properties orkg-hidden">
                        <span>No properties found</span>
                    </div>
                </div>
                
                <div class="orkg-section orkg-color-section">
                    <h5 class="orkg-section-title orkg-color-title">
                        <svg class="orkg-section-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M7.657 6.247c.11-.33.576-.33.686 0l1.316 3.942a.5.5 0 0 0 .474.342h4.146c.347 0 .491.459.212.67l-3.354 2.438a.5.5 0 0 0-.182.54l1.316 3.942c.11.33-.276.6-.54.41l-3.354-2.438a.5.5 0 0 0-.588 0l-3.354 2.438c-.264.19-.65-.08-.54-.41l1.316-3.942a.5.5 0 0 0-.182-.54L1.615 11.2c-.28-.211-.135-.67.212-.67h4.146a.5.5 0 0 0 .474-.342L7.657 6.247z"/>
                        </svg>
                        Highlight Color
                    </h5>
                    <div class="orkg-color-options">
                        <button class="orkg-btn orkg-random-color-btn" data-action="random-color">
                            <svg class="orkg-btn-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                                <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                            </svg>
                            <span>Random Color</span>
                        </button>
                        <input type="color" class="orkg-color-picker" value="#FFE4B5">
                    </div>
                    <div class="orkg-color-preview">
                        <span class="orkg-preview-label">Preview:</span>
                        <span class="orkg-preview-highlight"></span>
                    </div>
                </div>
            </div>
            
            <div class="orkg-action-buttons">
                <button class="orkg-btn orkg-btn-cancel" data-action="cancel">Cancel</button>
                <button class="orkg-btn orkg-btn-confirm" data-action="confirm" disabled>Select Property First</button>
            </div>
        `;
    }
    
    setupEventListeners() {
        if (!this.windowElement) return;
        
        // Prevent all events from bubbling up
        this.windowElement.addEventListener('mousedown', (e) => e.stopPropagation());
        this.windowElement.addEventListener('mouseup', (e) => e.stopPropagation());
        this.windowElement.addEventListener('click', (e) => e.stopPropagation());
        
        // Search input
        const searchInput = this.windowElement.querySelector('.orkg-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.handleSearchInput.bind(this));
            searchInput.addEventListener('focus', () => {
                this.isUserInteracting = true;
            });
        }
        
        // Window mouse tracking
        this.windowElement.addEventListener('mouseenter', () => {
            this.isUserInteracting = true;
        });
        
        this.windowElement.addEventListener('mouseleave', () => {
            this.isUserInteracting = false;
        });
        
        // Action buttons
        this.windowElement.addEventListener('click', this.handleButtonClick.bind(this));
        
        // Color picker
        const colorPicker = this.windowElement.querySelector('.orkg-color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('change', this.handleColorChange.bind(this));
        }
        
        // Make window draggable
        this.makeWindowDraggable();
    }
    
    makeWindowDraggable() {
        const header = this.windowElement.querySelector('.orkg-window-header');
        if (!header) return;
        
        header.addEventListener('mousedown', this.startDragging.bind(this));
    }
    
    startDragging(e) {
        // Don't start drag if clicking on buttons
        if (e.target.closest('button')) return;
        
        this.isDragging = true;
        
        const rect = this.windowElement.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Store window starting position
        this.windowStartX = rect.left;
        this.windowStartY = rect.top;
        
        // Bind drag handlers
        this.dragHandler = this.handleDrag.bind(this);
        this.stopHandler = this.stopDragging.bind(this);
        
        // Add document-level listeners
        document.addEventListener('mousemove', this.dragHandler);
        document.addEventListener('mouseup', this.stopHandler);
        
        // Prevent text selection during drag
        e.preventDefault();
        document.body.style.userSelect = 'none';
    }
    
    handleDrag(e) {
        if (!this.isDragging) return;
        
        let newX = e.clientX - this.dragOffset.x;
        let newY = e.clientY - this.dragOffset.y;
        
        // Keep window within viewport
        const maxX = window.innerWidth - this.windowElement.offsetWidth;
        const maxY = window.innerHeight - this.windowElement.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        this.windowElement.style.left = newX + 'px';
        this.windowElement.style.top = newY + 'px';
    }
    
    stopDragging() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.dragHandler);
        document.removeEventListener('mouseup', this.stopHandler);
        document.body.style.userSelect = '';
    }
    
    handleSearchInput(e) {
        const query = e.target.value.trim();
        
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchORKGPropertiesFromText(query || this.currentSelectedText);
        }, this.SEARCH_DEBOUNCE);
    }
    
    handleButtonClick(e) {
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        switch (action) {
            case 'close':
            case 'cancel':
                this.hide();
                break;
            case 'confirm':
                this.confirmSelection();
                break;
            case 'random-color':
                this.selectRandomColor();
                break;
            case 'minimize':
                this.toggleMinimize();
                break;
        }
    }
    
    handleColorChange(e) {
        this.selectedColor = e.target.value;
        this.updateColorPreview();
        this.updateConfirmButton();
    }
    
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            this.windowElement.classList.add('orkg-window-minimized');
        } else {
            this.windowElement.classList.remove('orkg-window-minimized');
        }
    }
    
    setupEscapeListener() {
        if (this.escapeKeyListener) return;
        
        this.escapeKeyListener = (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                e.preventDefault();
                e.stopPropagation();
                this.hide();
            }
        };
        
        document.addEventListener('keydown', this.escapeKeyListener, true);
    }
    
    removeEscapeListener() {
        if (this.escapeKeyListener) {
            document.removeEventListener('keydown', this.escapeKeyListener, true);
            this.escapeKeyListener = null;
        }
    }
    
    async show(selectedText, position) {
        console.log('📌 Showing property window for:', selectedText);
    
        // Save the current selection range IMMEDIATELY
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
            try {
                this.savedRange = selection.getRangeAt(0).cloneRange();
                console.log('✅ Saved selection range:', this.savedRange.toString());
            } catch (e) {
                console.warn('Could not save selection range:', e);
            }
        }
        
        this.currentSelectedText = selectedText;
        this.currentPosition = position;
        this.selectedProperty = null;
        this.selectedColor = this.getRandomColor();
        this.isMinimized = false;
        
        // Reset flags
        this.isUserInteracting = true;
        this.isDragging = false;
        
        if (!this.windowElement) {
            this.createWindow();
        }
        
        // Reset state
        this.clearSelections();
        this.updateSelectedTextPreview();
        this.updateColorPreview();
        
        // Add to DOM if not already
        if (!document.body.contains(this.windowElement)) {
            document.body.appendChild(this.windowElement);
        }
        
        // Remove minimized state
        this.windowElement.classList.remove('orkg-window-minimized');
        
        // Position window
        this.positionWindow(position);
        
        // Setup escape key listener
        this.setupEscapeListener();
        
        // Make visible with a small delay
        setTimeout(() => {
            if (this.windowElement) {
                this.windowElement.classList.add('orkg-window-visible');
                this.isVisible = true;
                
                // Focus search input
                const searchInput = this.windowElement.querySelector('.orkg-search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
        }, 10);
        
        // Setup document click listener for clicking outside
        if (!this.documentClickListener) {
            this.documentClickListener = (e) => {
                // Only hide if clicking outside the window
                if (this.isVisible && this.windowElement && !this.windowElement.contains(e.target) && !this.isDragging) {
                    // Check if the click is on a text selection
                    const selection = window.getSelection();
                    if (selection && selection.toString().trim()) {
                        // Don't hide if there's a new text selection
                        return;
                    }
                    this.hide();
                }
            };
            
            // Add listener after a delay to avoid immediate closing
            setTimeout(() => {
                document.addEventListener('mousedown', this.documentClickListener, true);
            }, 100);
        }
        
        // Load data
        try {
            await Promise.all([
                this.loadAISuggestions(selectedText),
                this.searchORKGPropertiesFromText(selectedText)
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
        
        // Restore selection if needed
        if (this.savedRange && window.getSelection().isCollapsed) {
            try {
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(this.savedRange);
                console.log('✅ Selection restored');
            } catch (e) {
                console.warn('Could not restore selection:', e);
            }
        }
        
        console.log('✅ Property window shown successfully');
    }
    
    hide() {
        if (!this.isVisible) return;
        
        console.log('📌 Hiding property window');
        
        // Clear any timeouts
        clearTimeout(this.searchTimeout);
        
        // Remove visibility class
        if (this.windowElement) {
            this.windowElement.classList.remove('orkg-window-visible');
            this.windowElement.classList.remove('orkg-window-minimized');
        }
        
        this.isVisible = false;
        this.isMinimized = false;
        this.isDragging = false;
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.windowElement && this.windowElement.parentNode) {
                this.windowElement.parentNode.removeChild(this.windowElement);
            }
        }, 300);
        
        // Remove event listeners
        if (this.documentClickListener) {
            document.removeEventListener('mousedown', this.documentClickListener, true);
            this.documentClickListener = null;
        }
        
        this.removeEscapeListener();
        
        // Clear state
        this.currentSelectedText = '';
        this.selectedProperty = null;
        this.selectedColor = null;
        this.isUserInteracting = false;
        
        console.log('✅ Property window hidden');
    }
    
    positionWindow(position) {
        if (!this.windowElement) return;
        
        const rect = {
            x: position.x || 0,
            y: position.y || 0
        };
        
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let x = rect.x + 10;
        let y = rect.y + 10;
        
        // Ensure window stays within viewport
        if (x + this.WINDOW_WIDTH > viewportWidth) {
            x = viewportWidth - this.WINDOW_WIDTH - 10;
        }
        if (x < 10) {
            x = 10;
        }
        
        if (y + this.WINDOW_HEIGHT > viewportHeight) {
            y = Math.max(10, viewportHeight - this.WINDOW_HEIGHT - 10);
        }
        if (y < 10) {
            y = 10;
        }
        
        this.windowElement.style.left = x + 'px';
        this.windowElement.style.top = y + 'px';
    }
    
    updateSelectedTextPreview() {
        if (!this.windowElement) return;
        
        const previewText = this.windowElement.querySelector('.orkg-text-preview');
        if (previewText) {
            const truncatedText = this.currentSelectedText.length > 60 
                ? this.currentSelectedText.substring(0, 60) + '...'
                : this.currentSelectedText;
            previewText.textContent = truncatedText;
        }
    }
    
    async loadAISuggestions(selectedText) {
        this.isLoadingAI = true;
        const loadingElement = this.windowElement.querySelector('.orkg-suggestions-loading');
        const suggestionsList = this.windowElement.querySelector('.orkg-suggestion-list');
        const noSuggestionsElement = this.windowElement.querySelector('.orkg-no-suggestions');
        const aiBadge = this.windowElement.querySelector('.orkg-ai-badge');
        
        if (loadingElement) loadingElement.classList.remove('orkg-hidden');
        if (suggestionsList) suggestionsList.innerHTML = '';
        if (noSuggestionsElement) noSuggestionsElement.classList.add('orkg-hidden');
        if (aiBadge) aiBadge.classList.add('orkg-hidden');
        
        try {
            const cacheKey = this.generateCacheKey(selectedText);
            if (this.AI_SUGGESTION_CACHE.has(cacheKey)) {
                this.aiSuggestions = this.AI_SUGGESTION_CACHE.get(cacheKey).suggestions;
                this.renderAISuggestions(this.aiSuggestions);
                return;
            }
            
            const response = await this.sendMessageToBackground({
                action: 'GET_PROPERTY_SUGGESTIONS',
                text: selectedText,
                context: {
                    pageTitle: document.title,
                    pageUrl: window.location.href
                }
            });
            
            if (response.success && response.suggestions && response.suggestions.length > 0) {
                this.aiSuggestions = response.suggestions;
                this.AI_SUGGESTION_CACHE.set(cacheKey, {
                    suggestions: this.aiSuggestions,
                    timestamp: Date.now()
                });
                this.renderAISuggestions(this.aiSuggestions);
            } else {
                // Show no suggestions message
                if (noSuggestionsElement) noSuggestionsElement.classList.remove('orkg-hidden');
            }
        } catch (error) {
            console.error('Failed to load AI suggestions:', error);
            if (noSuggestionsElement) noSuggestionsElement.classList.remove('orkg-hidden');
        } finally {
            this.isLoadingAI = false;
            if (loadingElement) loadingElement.classList.add('orkg-hidden');
        }
    }
    
    renderAISuggestions(suggestions) {
        const suggestionsList = this.windowElement.querySelector('.orkg-suggestion-list');
        const noSuggestionsElement = this.windowElement.querySelector('.orkg-no-suggestions');
        const aiBadge = this.windowElement.querySelector('.orkg-ai-badge');
        
        if (!suggestions || suggestions.length === 0) {
            if (noSuggestionsElement) noSuggestionsElement.classList.remove('orkg-hidden');
            if (aiBadge) aiBadge.classList.add('orkg-hidden');
            return;
        }
        
        if (noSuggestionsElement) noSuggestionsElement.classList.add('orkg-hidden');
        
        // Update badge count
        if (aiBadge) {
            aiBadge.textContent = suggestions.length;
            aiBadge.classList.remove('orkg-hidden');
        }
        
        if (suggestionsList) {
            suggestionsList.innerHTML = suggestions.map(suggestion => `
                <div class="orkg-suggestion-tag" 
                     data-property-id="${suggestion.id}"
                     data-property-label="${this.escapeHtml(suggestion.label)}"
                     data-property-description="${this.escapeHtml(suggestion.description || '')}"
                     data-color="${suggestion.color || this.getRandomColor()}"
                     data-confidence="${suggestion.confidence || 0.7}">
                    <span class="orkg-tag-label">${this.escapeHtml(suggestion.label)}</span>
                    <span class="orkg-confidence-badge">
                        ${Math.round((suggestion.confidence || 0.7) * 100)}%
                    </span>
                    <div class="orkg-tag-tooltip">
                        <div class="orkg-tooltip-content">
                            <div class="orkg-tooltip-label">${this.escapeHtml(suggestion.label)}</div>
                            <div class="orkg-tooltip-description">${this.escapeHtml(suggestion.description || 'AI suggested property based on the selected text')}</div>
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Add click handlers to tags
            suggestionsList.querySelectorAll('.orkg-suggestion-tag').forEach(tag => {
                tag.addEventListener('click', () => this.selectSuggestionTag(tag));
            });
        }
    }
    
    selectSuggestionTag(tagElement) {
        // Clear other selections
        this.clearSelections();
        
        // Mark this tag as selected
        tagElement.classList.add('orkg-selected');
        
        // Set selected property
        this.selectedProperty = {
            id: tagElement.dataset.propertyId,
            label: tagElement.dataset.propertyLabel,
            description: tagElement.dataset.propertyDescription,
            source: 'ai_suggestion',
            confidence: parseFloat(tagElement.dataset.confidence || 0.7)
        };
        
        this.selectedColor = tagElement.dataset.color || this.getRandomColor();
        
        // Update color picker to match
        const colorPicker = this.windowElement.querySelector('.orkg-color-picker');
        if (colorPicker) colorPicker.value = this.selectedColor;
        
        this.updateColorPreview();
        this.updateConfirmButton();
    }
    
    async searchORKGPropertiesFromText(text) {
        if (!text || text.trim() === '') {
            return this.loadInitialORKGProperties();
        }
        
        this.isLoadingORKG = true;
        const propertyList = this.windowElement.querySelector('.orkg-property-list');
        const loadingElement = this.windowElement.querySelector('.orkg-properties-loading');
        const noPropertiesElement = this.windowElement.querySelector('.orkg-no-properties');
        const updateIndicator = this.windowElement.querySelector('.orkg-update-indicator');
        const badge = this.windowElement.querySelector('.orkg-property-badge');
        
        if (loadingElement) loadingElement.classList.remove('orkg-hidden');
        if (propertyList) propertyList.innerHTML = '';
        if (noPropertiesElement) noPropertiesElement.classList.add('orkg-hidden');
        if (badge) badge.classList.add('orkg-hidden');
        
        try {
            // Extract keywords from text
            const keywords = this.extractKeywords(text);
            console.log('Extracted keywords:', keywords);
            
            // Search for each keyword
            const allProperties = new Map();
            
            for (const keyword of keywords) {
                const response = await this.sendMessageToBackground({
                    action: 'SEARCH_ORKG_PROPERTIES',
                    query: keyword
                });
                
                if (response.success && response.properties) {
                    response.properties.forEach(prop => {
                        if (!allProperties.has(prop.id)) {
                            allProperties.set(prop.id, prop);
                        }
                    });
                }
            }
            
            this.orkgProperties = Array.from(allProperties.values());
            
            if (this.orkgProperties.length > 0) {
                // Show update indicator
                if (updateIndicator) {
                    updateIndicator.classList.add('orkg-show');
                    setTimeout(() => {
                        updateIndicator.classList.remove('orkg-show');
                    }, 2000);
                }
                
                // Animate list update
                if (propertyList) {
                    propertyList.classList.add('orkg-list-updating');
                    setTimeout(() => {
                        propertyList.classList.remove('orkg-list-updating');
                    }, 500);
                }
                
                this.renderORKGProperties(this.orkgProperties);
            } else {
                if (noPropertiesElement) noPropertiesElement.classList.remove('orkg-hidden');
            }
        } catch (error) {
            console.error('Failed to search ORKG properties:', error);
            if (noPropertiesElement) noPropertiesElement.classList.remove('orkg-hidden');
        } finally {
            this.isLoadingORKG = false;
            if (loadingElement) loadingElement.classList.add('orkg-hidden');
        }
    }
    
    async loadInitialORKGProperties() {
        // Load some default properties
        const response = await this.sendMessageToBackground({
            action: 'SEARCH_ORKG_PROPERTIES',
            query: ''
        });
        
        if (response.success && response.properties) {
            this.orkgProperties = response.properties;
            this.renderORKGProperties(this.orkgProperties);
        }
    }
    
    extractKeywords(text) {
        if (!text || typeof text !== 'string') return [];
        
        // Clean and split text
        const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');
        const words = cleaned.split(/\s+/).filter(word => word.length > 3);
        
        // Remove stop words
        const stopWords = new Set([
            'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
            'were', 'been', 'being', 'have', 'their', 'they', 'them', 'than',
            'when', 'where', 'which', 'while', 'will', 'with', 'would',
            'about', 'after', 'above', 'below', 'between', 'into', 'through'
        ]);
        
        const keywords = words.filter(word => !stopWords.has(word));
        
        // Get unique keywords
        const unique = [...new Set(keywords)];
        
        // Return top 5 keywords
        return unique.slice(0, 5);
    }
    
    renderORKGProperties(properties) {
        const propertyList = this.windowElement.querySelector('.orkg-property-list');
        const badge = this.windowElement.querySelector('.orkg-property-badge');
        const noPropertiesElement = this.windowElement.querySelector('.orkg-no-properties');
        
        if (!properties || properties.length === 0) {
            if (noPropertiesElement) noPropertiesElement.classList.remove('orkg-hidden');
            if (badge) badge.classList.add('orkg-hidden');
            return;
        }
        
        if (noPropertiesElement) noPropertiesElement.classList.add('orkg-hidden');
        
        // Update badge count
        if (badge) {
            badge.textContent = properties.length;
            badge.classList.remove('orkg-hidden');
        }
        
        if (propertyList) {
            propertyList.innerHTML = properties.slice(0, 10).map(property => `
                <button class="orkg-item-btn" 
                        data-action="select-property"
                        data-property-id="${property.id}"
                        data-property-label="${this.escapeHtml(property.label)}"
                        data-property-description="${this.escapeHtml(property.description || '')}">
                    <div class="orkg-item-header">
                        <span class="orkg-item-label">${this.escapeHtml(property.label)}</span>
                        <span class="orkg-item-id">${property.id}</span>
                    </div>
                    <div class="orkg-item-description">
                        ${this.escapeHtml(property.description || 'ORKG property')}
                    </div>
                </button>
            `).join('');
            
            // Add click handlers
            propertyList.querySelectorAll('[data-action="select-property"]').forEach(btn => {
                btn.addEventListener('click', () => this.selectProperty(btn));
            });
        }
    }
    
    selectProperty(element) {
        this.selectedProperty = {
            id: element.dataset.propertyId,
            label: element.dataset.propertyLabel,
            description: element.dataset.propertyDescription,
            source: 'orkg'
        };
        
        this.clearSelections();
        element.classList.add('orkg-selected');
        this.updateConfirmButton();
    }
    
    selectRandomColor() {
        this.selectedColor = this.getRandomColor();
        const colorPicker = this.windowElement.querySelector('.orkg-color-picker');
        if (colorPicker) {
            colorPicker.value = this.selectedColor;
        }
        this.updateColorPreview();
    }
    
    clearSelections() {
        this.windowElement.querySelectorAll('.orkg-selected').forEach(el => {
            el.classList.remove('orkg-selected');
        });
    }
    
    updateColorPreview() {
        const previewHighlight = this.windowElement.querySelector('.orkg-preview-highlight');
        if (!previewHighlight) return;
        
        const truncatedText = this.currentSelectedText.length > 25 
            ? this.currentSelectedText.substring(0, 25) + '...'
            : this.currentSelectedText;
        
        previewHighlight.textContent = truncatedText;
        previewHighlight.style.backgroundColor = this.selectedColor;
        previewHighlight.style.color = this.getContrastColor(this.selectedColor);
    }
    
    updateConfirmButton() {
        const confirmBtn = this.windowElement.querySelector('.orkg-btn-confirm');
        if (!confirmBtn) return;
        
        const canConfirm = this.selectedProperty && this.selectedColor;
        confirmBtn.disabled = !canConfirm;
        
        if (canConfirm) {
            confirmBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" class="orkg-btn-icon">
                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                </svg>
                <span>Highlight with "${this.escapeHtml(this.selectedProperty.label)}"</span>
            `;
        } else {
            confirmBtn.textContent = 'Select Property First';
        }
    }
    
    async confirmSelection() {
        if (!this.selectedProperty || !this.selectedColor) return;
        
        console.log('📌 Confirming selection with property:', this.selectedProperty);
        
        let highlightSuccess = false;
        
        // Check if we're updating an existing highlight
        const existingHighlight = document.querySelector('.orkg-selection-active');
        
        if (existingHighlight) {
            // This is an update operation
            console.log('Updating existing highlight');
            
            existingHighlight.style.backgroundColor = this.selectedColor;
            existingHighlight.dataset.property = JSON.stringify(this.selectedProperty);
            existingHighlight.dataset.propertyLabel = this.selectedProperty.label;
            
            // Update marker metadata
            const markerEl = existingHighlight.querySelector('.orkg-marker');
            if (markerEl && markerEl.dataset.metadata) {
                try {
                    const metadata = JSON.parse(markerEl.dataset.metadata);
                    metadata.property = this.selectedProperty;
                    metadata.color = this.selectedColor;
                    markerEl.dataset.metadata = JSON.stringify(metadata);
                } catch (e) {
                    console.warn('Could not update marker metadata:', e);
                }
            }
            
            highlightSuccess = true;
        } else if (typeof TextHighlighter !== 'undefined') {
            // This is a new highlight
            if (this.savedRange && this.selectedText) {
                // Use the saved range for highlighting
                const result = await TextHighlighter.highlightRange(this.savedRange, {
                    property: this.selectedProperty,
                    color: this.selectedColor,
                    text: this.selectedText,
                    source: 'manual'
                });
                highlightSuccess = !!result;
            } else {
                // Fallback to selection-based highlighting
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && !selection.isCollapsed) {
                    const range = selection.getRangeAt(0);
                    const text = selection.toString();
                    
                    const result = await TextHighlighter.highlightRange(range, {
                        property: this.selectedProperty,
                        color: this.selectedColor,
                        text: text,
                        source: 'manual'
                    });
                    highlightSuccess = !!result;
                }
            }
            
            if (highlightSuccess) {
                console.log('✅ Text highlighted successfully');
            }
        }
        
        // Hide the window if operation succeeded
        if (highlightSuccess) {
            this.hide();
            this.savedRange = null;
            this.selectedText = null;
        } else {
            console.error('❌ Failed to create/update highlight');
            // Keep the window open for retry
        }
    }
        
    getRandomColor() {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    }
    
    getContrastColor(hexColor) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#333333' : '#ffffff';
    }
    
    generateCacheKey(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    sendMessageToBackground(message) {
        return new Promise((resolve) => {
            // Check if chrome runtime is available and valid
            if (!chrome?.runtime?.id) {
                console.warn('Chrome runtime not available or context invalidated');
                resolve({ success: false, error: 'Runtime not available' });
                return;
            }
            
            try {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError) {
                        const errorMessage = chrome.runtime.lastError.message;
                        
                        // Don't treat context invalidation as a critical error
                        if (errorMessage.includes('context invalidated')) {
                            console.log('Extension context was reset - this is normal during development');
                        } else {
                            console.error('Chrome runtime error:', errorMessage);
                        }
                        
                        resolve({ success: false, error: errorMessage });
                    } else {
                        resolve(response || { success: false });
                    }
                });
            } catch (error) {
                console.warn('Error sending message:', error);
                resolve({ success: false, error: error.message });
            }
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    isWindowVisible() {
        return this.isVisible;
    }
    
    getSelectedText() {
        return this.currentSelectedText;
    }
    
    getSelectedProperty() {
        return this.selectedProperty;
    }
    
    clearCache() {
        this.AI_SUGGESTION_CACHE.clear();
    }
}

const propertyWindow = new PropertyWindow();
if (typeof serviceRegistry !== 'undefined') {
    serviceRegistry.register('propertyWindow', propertyWindow);
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = propertyWindow;
}

(function() {
    'use strict';
    
    // Multiple export methods for compatibility
    if (typeof propertyWindow !== 'undefined') {
        // Export the instance
        window.propertyWindow = propertyWindow;
        window.PropertyWindow = propertyWindow.constructor || PropertyWindow;
        
        // Also expose on global
        if (typeof global !== 'undefined') {
            global.propertyWindow = propertyWindow;
            global.PropertyWindow = propertyWindow.constructor || PropertyWindow;
        }
        
        console.log('✅ PropertyWindow exported to window');
    } else if (typeof PropertyWindow !== 'undefined') {
        // Export the class
        window.PropertyWindow = PropertyWindow;
        
        // Create and export instance
        window.propertyWindow = new PropertyWindow();
        
        if (typeof global !== 'undefined') {
            global.PropertyWindow = PropertyWindow;
            global.propertyWindow = window.propertyWindow;
        }
        
        console.log('✅ PropertyWindow class and instance exported');
    }
    
    // Register with service registry if available
    if (window.serviceRegistry && window.propertyWindow) {
        window.serviceRegistry.register('propertyWindow', window.propertyWindow);
        window.serviceRegistry.register('PropertyWindow', window.PropertyWindow || window.propertyWindow.constructor);
    }
})();
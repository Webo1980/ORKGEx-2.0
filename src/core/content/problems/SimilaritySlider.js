// ================================
// src/core/content/problems/SimilaritySlider.js - Complete Fixed Implementation
// ================================

export class SimilaritySlider {
    constructor(options = {}) {
        this.options = {
            min: 0,
            max: 1,
            default: 0.5,
            step: 0.05,
            debounceDelay: 150,
            onChange: null,
            ...options
        };
        
        this.container = null;
        this.slider = null;
        this.currentValue = this.options.default;
        this.throttleTimeout = null;
        
        // Element references
        this.elements = {
            slider: null,
            sliderFill: null,
            thresholdValue: null,
            matchesCount: null,
            maxSimilarity: null
        };
    }
    
    render(currentValue = null, stats = {}) {
        this.currentValue = currentValue || this.options.default;
        
        const container = document.createElement('div');
        container.innerHTML = `
            <div class="similarity-control-section">
                <div class="control-header">
                    <h3>
                        <i class="fas fa-sliders-h"></i>
                        Similarity Threshold
                    </h3>
                    <div class="threshold-stats">
                        <span>Matches: <strong id="matches-count">${stats.matchesCount || 0}</strong></span>
                        <span>Max Similarity: <strong id="max-similarity">${Math.round((stats.maxSimilarity || 0) * 100)}%</strong></span>
                    </div>
                </div>
                
                <div class="slider-container">
                    <div class="slider-wrapper">
                        <div class="slider-track">
                            <div class="slider-fill ${this.getSliderClass(this.currentValue)}" id="slider-fill" style="width: ${this.currentValue * 100}%;"></div>
                            <div class="slider-thumb" style="left: ${this.currentValue * 100}%;"></div>
                        </div>
                        <input type="range" 
                               class="similarity-slider" 
                               id="similarity-slider"
                               min="0" 
                               max="100" 
                               value="${this.currentValue * 100}"
                               step="1">
                    </div>
                    <div class="slider-labels">
                        <span class="slider-label-min">0%</span>
                        <span class="slider-label-current">
                            <strong id="threshold-value">${Math.round(this.currentValue * 100)}%</strong>
                        </span>
                        <span class="slider-label-max">100%</span>
                    </div>
                </div>
                
                <div class="threshold-presets">
                    <button class="preset-btn ${Math.abs(this.currentValue - 0.3) < 0.01 ? 'active' : ''}" data-threshold="0.3">
                        <i class="fas fa-lock"></i>
                        Strict (30%)
                    </button>
                    <button class="preset-btn ${Math.abs(this.currentValue - 0.5) < 0.01 ? 'active' : ''}" data-threshold="0.5">
                        <i class="fas fa-balance-scale"></i>
                        Balanced (50%)
                    </button>
                    <button class="preset-btn ${Math.abs(this.currentValue - 0.7) < 0.01 ? 'active' : ''}" data-threshold="0.7">
                        <i class="fas fa-unlock"></i>
                        Loose (70%)
                    </button>
                </div>
            </div>
        `;
        
        this.container = container.firstElementChild;
        this.setupElements();
        this.setupEventHandlers();
        
        return this.container;
    }
    
    getSliderClass(value) {
        if (value >= 0.7) return 'similarity-high';
        if (value >= 0.4) return 'similarity-medium';
        return 'similarity-low';
    }
    
    setupElements() {
        if (!this.container) return;
        
        this.elements.slider = this.container.querySelector('#similarity-slider');
        this.elements.sliderFill = this.container.querySelector('#slider-fill');
        this.elements.thresholdValue = this.container.querySelector('#threshold-value');
        this.elements.matchesCount = this.container.querySelector('#matches-count');
        this.elements.maxSimilarity = this.container.querySelector('#max-similarity');
    }
    
    setupEventHandlers() {
        // Slider input
        if (this.elements.slider) {
            this.elements.slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value) / 100;
                this.updateDisplay(value);
                this.handleChange(value);
            });
        }
        
        // Preset buttons
        const presetButtons = this.container.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const threshold = parseFloat(btn.dataset.threshold);
                this.setValue(threshold);
                
                // Update active state
                presetButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Trigger change handler immediately for presets
                if (this.options.onChange) {
                    this.options.onChange(threshold);
                }
            });
        });
    }
    
    handleChange(value) {
        // Clear previous timeout
        if (this.throttleTimeout) {
            clearTimeout(this.throttleTimeout);
        }
        
        // Update current value immediately
        this.currentValue = value;
        
        // Debounce the callback
        this.throttleTimeout = setTimeout(() => {
            if (this.options.onChange) {
                this.options.onChange(value);
            }
        }, this.options.debounceDelay);
    }
    
    updateDisplay(value) {
        // Update slider fill with appropriate class
        if (this.elements.sliderFill) {
            this.elements.sliderFill.style.width = `${value * 100}%`;
            // Update slider fill class based on value
            this.elements.sliderFill.className = `slider-fill ${this.getSliderClass(value)}`;
        }
        
        // Update slider thumb position
        const thumb = this.container?.querySelector('.slider-thumb');
        if (thumb) {
            thumb.style.left = `${value * 100}%`;
        }
        
        // Update threshold value display
        if (this.elements.thresholdValue) {
            this.elements.thresholdValue.textContent = `${Math.round(value * 100)}%`;
        }
        
        // Update preset button active states
        const presetButtons = this.container.querySelectorAll('.preset-btn');
        presetButtons.forEach(btn => {
            const presetValue = parseFloat(btn.dataset.threshold);
            if (Math.abs(value - presetValue) < 0.01) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    setValue(value) {
        this.currentValue = value;
        
        if (this.elements.slider) {
            this.elements.slider.value = value * 100;
        }
        
        this.updateDisplay(value);
    }
    
    getValue() {
        return this.currentValue;
    }
    
    updateStats(stats) {
        if (this.elements.matchesCount && stats.matchesCount !== undefined) {
            this.elements.matchesCount.textContent = stats.matchesCount;
        }
        
        if (this.elements.maxSimilarity && stats.maxSimilarity !== undefined) {
            this.elements.maxSimilarity.textContent = `${Math.round((stats.maxSimilarity || 0) * 100)}%`;
        }
    }
    
    disable() {
        if (this.elements.slider) {
            this.elements.slider.disabled = true;
        }
        
        const buttons = this.container?.querySelectorAll('.preset-btn');
        buttons?.forEach(btn => {
            btn.disabled = true;
        });
        
        this.container?.classList.add('disabled');
    }
    
    enable() {
        if (this.elements.slider) {
            this.elements.slider.disabled = false;
        }
        
        const buttons = this.container?.querySelectorAll('.preset-btn');
        buttons?.forEach(btn => {
            btn.disabled = false;
        });
        
        this.container?.classList.remove('disabled');
    }
    
    reset() {
        this.setValue(this.options.default);
        this.updateStats({ matchesCount: 0, maxSimilarity: 0 });
    }
    
    destroy() {
        if (this.throttleTimeout) {
            clearTimeout(this.throttleTimeout);
        }
        
        this.container = null;
        this.elements = {
            slider: null,
            sliderFill: null,
            thresholdValue: null,
            matchesCount: null,
            maxSimilarity: null
        };
    }
}

export default SimilaritySlider;
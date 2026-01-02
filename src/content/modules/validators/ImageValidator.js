// ================================
// src/core/content/validators/ImageValidator.js
// Smart validation module following SOLID principles
// ================================

export class ImageValidator {
    constructor(config = {}) {
        this.config = {
            minWidth: 50,
            minHeight: 50,
            maxWidth: 10000,
            maxHeight: 10000,
            minAspectRatio: 0.1,
            maxAspectRatio: 10,
            minFileSize: 1024, // 1KB
            maxFileSize: 50 * 1024 * 1024, // 50MB
            allowedTypes: ['image', 'figure', 'chart', 'graph', 'diagram', 'svg', 'canvas'],
            excludePatterns: [
                'logo', 'icon', 'button', 'avatar', 'thumbnail', 
                'sprite', 'emoji', 'badge', 'banner', 'ad'
            ],
            scientificPatterns: [
                'figure', 'fig', 'chart', 'graph', 'plot', 'diagram',
                'table', 'scheme', 'illustration', 'data', 'result'
            ],
            ...config
        };
        
        this.validationRules = new Map();
        this.setupDefaultRules();
    }
    
    async init() {
        console.log('✅ ImageValidator initialized');
    }
    
    /**
     * Setup default validation rules
     */
    setupDefaultRules() {
        // Dimension rules
        this.addRule('dimensions', (image) => {
            const dims = image.dimensions;
            if (!dims) return { valid: false, reason: 'No dimensions available' };
            
            if (dims.width < this.config.minWidth || dims.height < this.config.minHeight) {
                return { 
                    valid: false, 
                    reason: `Image too small (${dims.width}x${dims.height})` 
                };
            }
            
            if (dims.width > this.config.maxWidth || dims.height > this.config.maxHeight) {
                return { 
                    valid: false, 
                    reason: `Image too large (${dims.width}x${dims.height})` 
                };
            }
            
            const aspectRatio = dims.width / dims.height;
            if (aspectRatio < this.config.minAspectRatio || aspectRatio > this.config.maxAspectRatio) {
                return { 
                    valid: false, 
                    reason: `Invalid aspect ratio (${aspectRatio.toFixed(2)})` 
                };
            }
            
            return { valid: true };
        });
        
        // Visibility rules
        this.addRule('visibility', (image) => {
            if (image.visibility && !image.visibility.isVisible) {
                return { valid: false, reason: 'Image is not visible' };
            }
            return { valid: true };
        });
        
        // Source validation
        this.addRule('source', (image) => {
            if (!image.src && image.type !== 'canvas') {
                return { valid: false, reason: 'No image source' };
            }
            
            // Check for data URLs if configured
            if (image.src && image.src.startsWith('data:')) {
                if (!this.config.includeDataUrls) {
                    return { valid: false, reason: 'Data URLs not allowed' };
                }
            }
            
            return { valid: true };
        });
        
        // Content type validation
        this.addRule('contentType', (image) => {
            // Check for excluded patterns
            const textToCheck = `${image.src || ''} ${image.alt || ''} ${image.context?.label || ''}`.toLowerCase();
            
            for (const pattern of this.config.excludePatterns) {
                if (textToCheck.includes(pattern)) {
                    return { 
                        valid: false, 
                        reason: `Excluded pattern detected: ${pattern}` 
                    };
                }
            }
            
            return { valid: true };
        });
        
        // Scientific relevance
        this.addRule('scientific', (image) => {
            // Check if it's in a scientific container
            if (image.context?.figureId || image.context?.inMainContent) {
                return { valid: true };
            }
            
            // Check for scientific patterns
            const textToCheck = `${image.alt || ''} ${image.title || ''} ${image.context?.label || ''} ${image.context?.caption || ''}`.toLowerCase();
            
            const hasScientificPattern = this.config.scientificPatterns.some(pattern => 
                textToCheck.includes(pattern)
            );
            
            if (!hasScientificPattern && image.dimensions) {
                // Small images without scientific context are likely UI elements
                if (image.dimensions.width < 100 && image.dimensions.height < 100) {
                    return { 
                        valid: false, 
                        reason: 'Small image without scientific context' 
                    };
                }
            }
            
            return { valid: true };
        });
        
        // Duplicate detection
        this.addRule('duplicate', (image, context) => {
            if (context && context.processedSources) {
                if (context.processedSources.has(image.src)) {
                    return { valid: false, reason: 'Duplicate image' };
                }
            }
            return { valid: true };
        });
    }
    
    /**
     * Add custom validation rule
     */
    addRule(name, validator) {
        this.validationRules.set(name, validator);
    }
    
    /**
     * Remove validation rule
     */
    removeRule(name) {
        this.validationRules.delete(name);
    }
    
    /**
     * Validate an image
     */
    validate(image, context = {}) {
        const results = {
            valid: true,
            errors: [],
            warnings: [],
            score: 1.0
        };
        
        // Run all validation rules
        for (const [ruleName, validator] of this.validationRules) {
            try {
                const result = validator(image, context);
                
                if (!result.valid) {
                    results.valid = false;
                    results.errors.push({
                        rule: ruleName,
                        reason: result.reason || 'Validation failed'
                    });
                    results.score *= 0.5; // Reduce score for each error
                } else if (result.warning) {
                    results.warnings.push({
                        rule: ruleName,
                        reason: result.warning
                    });
                    results.score *= 0.9; // Slightly reduce score for warnings
                }
            } catch (error) {
                console.warn(`Validation rule '${ruleName}' failed:`, error);
                results.warnings.push({
                    rule: ruleName,
                    reason: `Rule execution failed: ${error.message}`
                });
            }
        }
        
        return results;
    }
    
    /**
     * Batch validate multiple images
     */
    validateBatch(images) {
        const processedSources = new Set();
        const context = { processedSources };
        
        return images.map(image => {
            const result = this.validate(image, context);
            if (result.valid && image.src) {
                processedSources.add(image.src);
            }
            return {
                image,
                validation: result
            };
        });
    }
    
    /**
     * Check if image is scientific figure
     */
    isScientificFigure(image) {
        // Check for figure container
        if (image.context?.figureId) {
            return { isScientific: true, confidence: 0.9 };
        }
        
        // Check for scientific keywords in caption/label
        const text = `${image.context?.label || ''} ${image.context?.caption || ''}`.toLowerCase();
        
        const scientificKeywords = [
            'figure', 'fig.', 'table', 'chart', 'graph', 'plot',
            'diagram', 'scheme', 'illustration', 'panel',
            'supplementary', 'appendix'
        ];
        
        const keywordMatches = scientificKeywords.filter(kw => text.includes(kw)).length;
        
        if (keywordMatches > 0) {
            return { 
                isScientific: true, 
                confidence: Math.min(0.5 + (keywordMatches * 0.2), 1.0) 
            };
        }
        
        // Check dimensions (scientific figures are usually larger)
        if (image.dimensions && image.dimensions.width >= 300 && image.dimensions.height >= 200) {
            return { isScientific: true, confidence: 0.3 };
        }
        
        return { isScientific: false, confidence: 0 };
    }
    
    /**
     * Classify image type
     */
    classifyImageType(image) {
        const text = `${image.alt || ''} ${image.title || ''} ${image.context?.label || ''} ${image.context?.caption || ''}`.toLowerCase();
        
        const typePatterns = {
            'chart': ['chart', 'bar', 'pie', 'line chart', 'scatter'],
            'graph': ['graph', 'plot', 'curve', 'axis', 'trend'],
            'diagram': ['diagram', 'schematic', 'flowchart', 'workflow', 'architecture'],
            'photo': ['photo', 'photograph', 'image of', 'picture of', 'microscopy'],
            'illustration': ['illustration', 'drawing', 'sketch', 'artistic'],
            'table': ['table'],
            'equation': ['equation', 'formula', 'mathematical'],
            'map': ['map', 'geographic', 'location'],
            'screenshot': ['screenshot', 'screen capture', 'interface']
        };
        
        for (const [type, patterns] of Object.entries(typePatterns)) {
            if (patterns.some(pattern => text.includes(pattern))) {
                return type;
            }
        }
        
        // Check file extension if available
        if (image.src) {
            const extension = image.src.split('.').pop()?.toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
                return 'photo';
            }
            if (extension === 'svg') {
                return 'diagram';
            }
        }
        
        return 'figure'; // Default type
    }
    
    /**
     * Calculate quality score
     */
    calculateQualityScore(image) {
        let score = 0;
        const factors = [];
        
        // Dimension quality (25%)
        if (image.dimensions) {
            const area = image.dimensions.width * image.dimensions.height;
            if (area >= 160000) { // 400x400
                score += 0.25;
                factors.push('Good resolution');
            } else if (area >= 40000) { // 200x200
                score += 0.15;
                factors.push('Acceptable resolution');
            } else {
                score += 0.05;
                factors.push('Low resolution');
            }
        }
        
        // Caption quality (25%)
        if (image.context?.caption || image.context?.label) {
            const captionLength = (image.context.caption || image.context.label).length;
            if (captionLength > 50) {
                score += 0.25;
                factors.push('Detailed caption');
            } else if (captionLength > 10) {
                score += 0.15;
                factors.push('Basic caption');
            } else {
                score += 0.05;
                factors.push('Minimal caption');
            }
        }
        
        // Alt text quality (20%)
        if (image.alt && image.alt.length > 10) {
            score += 0.20;
            factors.push('Has alt text');
        }
        
        // Scientific relevance (30%)
        const scientific = this.isScientificFigure(image);
        if (scientific.isScientific) {
            score += 0.30 * scientific.confidence;
            factors.push(`Scientific figure (${Math.round(scientific.confidence * 100)}% confidence)`);
        }
        
        return {
            score: Math.min(score, 1.0),
            factors
        };
    }
    
    /**
     * Get validation statistics
     */
    getStatistics(validationResults) {
        const total = validationResults.length;
        const valid = validationResults.filter(r => r.validation.valid).length;
        const invalid = total - valid;
        
        const errorTypes = {};
        const warningTypes = {};
        
        validationResults.forEach(result => {
            result.validation.errors.forEach(error => {
                errorTypes[error.rule] = (errorTypes[error.rule] || 0) + 1;
            });
            
            result.validation.warnings.forEach(warning => {
                warningTypes[warning.rule] = (warningTypes[warning.rule] || 0) + 1;
            });
        });
        
        return {
            total,
            valid,
            invalid,
            validPercentage: total > 0 ? (valid / total * 100).toFixed(1) : 0,
            errorTypes,
            warningTypes,
            averageScore: validationResults.reduce((sum, r) => sum + r.validation.score, 0) / total
        };
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.setupDefaultRules(); // Recreate rules with new config
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.validationRules.clear();
        console.log('🧹 ImageValidator cleanup completed');
    }
}
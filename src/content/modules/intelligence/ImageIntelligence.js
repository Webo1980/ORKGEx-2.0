// ================================
// src/content/intelligence/ImageIntelligence.js - Converted to IIFE pattern
// ================================

(function(global) {
    'use strict';
    
    /**
     * Image Intelligence - analyzes and scores image importance
     */
    function ImageIntelligence(config = {}) {
        this.config = {
            weights: {
                size: 0.15,           // Image size importance
                position: 0.10,       // Position in document
                caption: 0.20,        // Caption quality
                references: 0.25,     // How often referenced
                context: 0.15,        // Surrounding context
                type: 0.15            // Image type importance
            },
            thresholds: {
                minimum: 0.3,         // Minimum score to consider
                recommended: 0.6,     // Recommended threshold
                high: 0.8            // High importance threshold
            },
            keywords: {
                important: ['result', 'finding', 'show', 'demonstrate', 'reveal', 
                           'significant', 'important', 'key', 'main', 'primary'],
                veryImportant: ['novel', 'new', 'first', 'discovery', 'breakthrough',
                               'unprecedented', 'unique', 'remarkable'],
                methodological: ['method', 'procedure', 'protocol', 'technique', 
                                'approach', 'workflow', 'pipeline'],
                supplementary: ['supplementary', 'additional', 'appendix', 'supporting',
                               'extra', 'auxiliary']
            }
        };
        
        // Merge provided config with defaults
        if (config) {
            for (const key in config) {
                if (typeof this.config[key] === 'object' && this.config[key] !== null) {
                    this.config[key] = { ...this.config[key], ...config[key] };
                } else {
                    this.config[key] = config[key];
                }
            }
        }
        
        this.scoringCache = new Map();
        this.isInitialized = false;
    }
    
    /**
     * Initialize the intelligence module
     */
    ImageIntelligence.prototype.init = async function() {
        if (this.isInitialized) return;
        
        console.log('🧠 Initializing ImageIntelligence...');
        
        // Any initialization logic can go here
        // For now, just mark as initialized
        this.isInitialized = true;
        
        console.log('✅ ImageIntelligence initialized');
    };
    
    /**
     * Analyze and score image importance
     */
    ImageIntelligence.prototype.analyze = function(imageData) {
        // Check cache
        if (this.scoringCache.has(imageData.id)) {
            return this.scoringCache.get(imageData.id);
        }
        
        // Calculate individual scores
        const scores = {
            size: this.scoreSizeImportance(imageData.dimensions),
            position: this.scorePositionImportance(imageData.position),
            caption: this.scoreCaptionImportance(imageData.context?.caption),
            references: this.scoreReferenceImportance(imageData.context?.references),
            context: this.scoreContextImportance(imageData.context),
            type: this.scoreTypeImportance(imageData.type)
        };
        
        // Calculate weighted total
        let totalScore = 0;
        let totalWeight = 0;
        
        for (const [factor, score] of Object.entries(scores)) {
            const weight = this.config.weights[factor] || 0;
            totalScore += score * weight;
            totalWeight += weight;
        }
        
        // Normalize score
        const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        
        // Determine importance level
        const importanceLevel = this.determineImportanceLevel(normalizedScore);
        
        // Identify key factors
        const keyFactors = this.identifyKeyFactors(scores);
        
        // Get recommendations
        const recommendations = this.getRecommendations(imageData, scores);
        
        const result = {
            id: imageData.id,
            score: normalizedScore,
            scores,
            level: importanceLevel,
            keyFactors,
            recommendations,
            shouldExtract: normalizedScore >= this.config.thresholds.minimum,
            isHighPriority: normalizedScore >= this.config.thresholds.high,
            confidence: this.calculateConfidence(scores),
            timestamp: Date.now()
        };
        
        // Cache result
        this.scoringCache.set(imageData.id, result);
        
        return result;
    };
    
    /**
     * Score based on image size
     */
    ImageIntelligence.prototype.scoreSizeImportance = function(dimensions) {
        if (!dimensions) return 0;
        
        const { width, height } = dimensions;
        const area = width * height;
        
        // Define size thresholds
        const thresholds = {
            tiny: 10000,      // < 100x100
            small: 40000,     // < 200x200
            medium: 160000,   // < 400x400
            large: 640000,    // < 800x800
            veryLarge: 1440000 // < 1200x1200
        };
        
        // Score based on area
        if (area < thresholds.tiny) return 0.1;
        if (area < thresholds.small) return 0.3;
        if (area < thresholds.medium) return 0.5;
        if (area < thresholds.large) return 0.7;
        if (area < thresholds.veryLarge) return 0.9;
        return 1.0;
    };
    
    /**
     * Score based on position in document
     */
    ImageIntelligence.prototype.scorePositionImportance = function(position) {
        if (!position) return 0.5;
        
        // Get document dimensions
        const docHeight = document.documentElement.scrollHeight;
        const docWidth = document.documentElement.scrollWidth;
        
        // Calculate relative position
        const relativeY = position.top / docHeight;
        const relativeX = position.left / docWidth;
        
        // Score based on position (higher score for main content area)
        let score = 0.5;
        
        // Vertical position scoring
        if (relativeY < 0.2) {
            score += 0.1; // Near top
        } else if (relativeY < 0.8) {
            score += 0.3; // Main content area
        } else {
            score -= 0.1; // Near bottom (often supplementary)
        }
        
        // Horizontal position scoring
        if (relativeX > 0.1 && relativeX < 0.9) {
            score += 0.2; // Centered content
        }
        
        return Math.min(1, Math.max(0, score));
    };
    
    /**
     * Score based on caption quality and content
     */
    ImageIntelligence.prototype.scoreCaptionImportance = function(caption) {
        if (!caption) return 0.2; // Low score for no caption
        
        let score = 0.5; // Base score for having caption
        
        // Check caption length (good captions are descriptive)
        const wordCount = caption.split(/\s+/).length;
        if (wordCount > 10) score += 0.2;
        if (wordCount > 20) score += 0.1;
        
        // Check for important keywords
        const captionLower = caption.toLowerCase();
        
        // Very important keywords
        for (const keyword of this.config.keywords.veryImportant) {
            if (captionLower.includes(keyword)) {
                score += 0.3;
                break;
            }
        }
        
        // Important keywords
        for (const keyword of this.config.keywords.important) {
            if (captionLower.includes(keyword)) {
                score += 0.2;
                break;
            }
        }
        
        // Methodological keywords
        for (const keyword of this.config.keywords.methodological) {
            if (captionLower.includes(keyword)) {
                score += 0.15;
                break;
            }
        }
        
        // Supplementary keywords (reduce score)
        for (const keyword of this.config.keywords.supplementary) {
            if (captionLower.includes(keyword)) {
                score -= 0.3;
                break;
            }
        }
        
        // Check for specific patterns
        if (/^(figure|fig\.?)\s+\d+[a-z]?\s*[:.\s]/i.test(caption)) {
            score += 0.1; // Proper figure labeling
        }
        
        if (/\([a-z]\)|\([ivx]+\)/i.test(caption)) {
            score += 0.05; // Contains subfigure labels
        }
        
        return Math.min(1, Math.max(0, score));
    };
    
    /**
     * Score based on how often the image is referenced
     */
    ImageIntelligence.prototype.scoreReferenceImportance = function(references) {
        if (!references || references.length === 0) return 0.3;
        
        // Base score for being referenced
        let score = 0.5;
        
        // Add score based on number of references
        const refCount = references.length;
        if (refCount === 1) score += 0.2;
        else if (refCount === 2) score += 0.3;
        else if (refCount >= 3) score += 0.5;
        
        // Analyze reference contexts
        for (const ref of references) {
            const refText = ref.text.toLowerCase();
            
            // Check for emphasis in references
            if (refText.includes('as shown in') || 
                refText.includes('see figure') ||
                refText.includes('illustrated in')) {
                score += 0.1;
            }
            
            // Check for important context
            for (const keyword of this.config.keywords.important) {
                if (refText.includes(keyword)) {
                    score += 0.05;
                    break;
                }
            }
        }
        
        return Math.min(1, Math.max(0, score));
    };
    
    /**
     * Score based on surrounding context
     */
    ImageIntelligence.prototype.scoreContextImportance = function(context) {
        let score = 0.5;
        
        if (!context) return score;
        
        // Check surrounding text
        if (context.surroundingText) {
            const textLower = context.surroundingText.toLowerCase();
            
            // Check for discussion of results
            if (textLower.includes('result') || 
                textLower.includes('finding') ||
                textLower.includes('observation')) {
                score += 0.2;
            }
            
            // Check for methodology discussion
            if (textLower.includes('method') || 
                textLower.includes('procedure') ||
                textLower.includes('protocol')) {
                score += 0.15;
            }
            
            // Check for conclusions
            if (textLower.includes('conclude') || 
                textLower.includes('summary') ||
                textLower.includes('implication')) {
                score += 0.15;
            }
        }
        
        // Bonus for being in a figure environment
        if (context.figure) {
            score += 0.1;
        }
        
        // Check inline context
        if (context.inlineContext && context.inlineContext.isInline) {
            score -= 0.2; // Inline images are often less important
        }
        
        return Math.min(1, Math.max(0, score));
    };
    
    /**
     * Score based on image type
     */
    ImageIntelligence.prototype.scoreTypeImportance = function(type) {
        const typeScores = {
            'chart': 1.0,       // Highest score for charts
            'graph': 0.95,      // Very high for graphs
            'plot': 0.9,        // High for plots
            'diagram': 0.7,     // Diagrams are somewhat important
            'figure': 0.6,      // Regular figures
            'table': 0.5,       // Tables
            'photo': 0.4,       // Photos
            'illustration': 0.4,
            'screenshot': 0.3,
            'equation': 0.5,
            'logo': 0.1,
            'icon': 0.1,
            'svg': 0.6,
            'canvas': 0.8,      // Canvas often contains charts
            'image': 0.5,
            'background': 0.1,
            'Treemap': 0.8      // Treemaps are a type of chart
        };
        
        return typeScores[type] || 0.5;
    };
    
    /**
     * Determine importance level based on score
     */
    ImageIntelligence.prototype.determineImportanceLevel = function(score) {
        if (score >= this.config.thresholds.high) return 'high';
        if (score >= this.config.thresholds.recommended) return 'recommended';
        if (score >= this.config.thresholds.minimum) return 'low';
        return 'negligible';
    };
    
    /**
     * Identify key factors contributing to score
     */
    ImageIntelligence.prototype.identifyKeyFactors = function(scores) {
        const factors = [];
        const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        
        for (const [factor, score] of sortedScores) {
            if (score >= 0.7) {
                factors.push({
                    factor,
                    score,
                    description: this.getFactorDescription(factor, score)
                });
            }
        }
        
        return factors;
    };
    
    /**
     * Get human-readable factor description
     */
    ImageIntelligence.prototype.getFactorDescription = function(factor, score) {
        const descriptions = {
            size: score >= 0.8 ? 'Large, prominent image' : 'Good image size',
            position: score >= 0.8 ? 'Prime document position' : 'Good document position',
            caption: score >= 0.8 ? 'Highly informative caption' : 'Good caption',
            references: score >= 0.8 ? 'Frequently referenced' : 'Referenced in text',
            context: score >= 0.8 ? 'Important surrounding context' : 'Relevant context',
            type: score >= 0.8 ? 'Critical figure type' : 'Important figure type'
        };
        
        return descriptions[factor] || `High ${factor} score`;
    };
    
    /**
     * Get recommendations for the image
     */
    ImageIntelligence.prototype.getRecommendations = function(imageData, scores) {
        const recommendations = [];
        
        // Check if should be prioritized
        if (scores.references >= 0.8 && scores.caption >= 0.7) {
            recommendations.push({
                type: 'priority',
                message: 'High-priority figure: frequently referenced with detailed caption'
            });
        }
        
        // Check if it's a key result
        if (scores.type >= 0.8 && scores.context >= 0.7) {
            recommendations.push({
                type: 'key_result',
                message: 'Likely contains key research results'
            });
        }
        
        // Check if it's methodological
        if (imageData.context?.caption && 
            this.containsMethodKeywords(imageData.context.caption)) {
            recommendations.push({
                type: 'methodology',
                message: 'Important for understanding methodology'
            });
        }
        
        // Check if it needs manual review
        if (scores.caption < 0.3 && scores.references < 0.3) {
            recommendations.push({
                type: 'review',
                message: 'Manual review recommended: limited contextual information'
            });
        }
        
        return recommendations;
    };
    
    /**
     * Calculate confidence in the scoring
     */
    ImageIntelligence.prototype.calculateConfidence = function(scores) {
        // Higher confidence when multiple factors align
        const values = Object.values(scores);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        // Lower standard deviation = more consistent scores = higher confidence
        const consistency = 1 - Math.min(stdDev, 1);
        
        // Factor in how many high scores we have
        const highScores = values.filter(v => v >= 0.7).length;
        const highScoreFactor = highScores / values.length;
        
        return (consistency * 0.6 + highScoreFactor * 0.4);
    };
    
    /**
     * Check if text contains method keywords
     */
    ImageIntelligence.prototype.containsMethodKeywords = function(text) {
        const textLower = text.toLowerCase();
        return this.config.keywords.methodological.some(keyword => 
            textLower.includes(keyword)
        );
    };
    
    /**
     * Batch analyze multiple images
     */
    ImageIntelligence.prototype.analyzeMultiple = function(images) {
        return images.map(image => this.analyze(image));
    };
    
    /**
     * Get images above threshold
     */
    ImageIntelligence.prototype.filterByImportance = function(images, threshold) {
        const minScore = threshold || this.config.thresholds.recommended;
        const analyzed = this.analyzeMultiple(images);
        
        return analyzed.filter(result => result.score >= minScore)
                      .sort((a, b) => b.score - a.score);
    };
    
    /**
     * Get statistics for analyzed images
     */
    ImageIntelligence.prototype.getStatistics = function(analyzedImages) {
        if (!analyzedImages || analyzedImages.length === 0) {
            return null;
        }
        
        const scores = analyzedImages.map(img => img.score);
        const levels = analyzedImages.map(img => img.level);
        
        return {
            total: analyzedImages.length,
            averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            maxScore: Math.max(...scores),
            minScore: Math.min(...scores),
            distribution: {
                high: levels.filter(l => l === 'high').length,
                recommended: levels.filter(l => l === 'recommended').length,
                low: levels.filter(l => l === 'low').length,
                negligible: levels.filter(l => l === 'negligible').length
            },
            shouldExtract: analyzedImages.filter(img => img.shouldExtract).length,
            highPriority: analyzedImages.filter(img => img.isHighPriority).length
        };
    };
    
    /**
     * Clear scoring cache
     */
    ImageIntelligence.prototype.clearCache = function() {
        this.scoringCache.clear();
    };
    
    /**
     * Update configuration
     */
    ImageIntelligence.prototype.updateConfig = function(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.clearCache(); // Clear cache when config changes
    };
    
    /**
     * Cleanup
     */
    ImageIntelligence.prototype.cleanup = function() {
        this.clearCache();
        this.isInitialized = false;
        console.log('🧹 ImageIntelligence cleanup completed');
    };
    
    // Export to global scope
    global.ImageIntelligence = ImageIntelligence;
    
})(typeof window !== 'undefined' ? window : this);
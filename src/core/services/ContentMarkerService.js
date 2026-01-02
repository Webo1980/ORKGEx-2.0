// ================================
// src/core/services/ContentMarkerService.js
// MOVED FROM content/markers/ - Pure service logic
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class ContentMarkerService {
    constructor(dependencies = {}) {
        this.config = {
            minImageScore: 0.3,
            autoActivate: true,
            ...dependencies.config
        };
        
        // Injected dependencies - NO UI LOGIC
        this.validator = dependencies.validator;
        this.intelligence = dependencies.intelligence;
        this.extractionService = dependencies.extractionService;
        this.animationService = dependencies.animationService;
        
        // Pure state management
        this.markers = new Map();
        this.activeMarkers = new Set();
        this.processedElements = new WeakSet();
        this.isActive = false;
        this.markerIdCounter = 0;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        console.log('🎯 Initializing ContentMarkerService...');
        
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('✅ ContentMarkerService initialized');
    }
    
    setupEventListeners() {
        eventManager.on('marker:activate', () => this.activate());
        eventManager.on('marker:deactivate', () => this.deactivate());
        eventManager.on('marker:extract', (data) => this.handleExtraction(data));
    }
    
    async activate() {
        if (this.isActive) return this.markers.size;
        
        console.log('🎯 Activating content markers...');
        this.isActive = true;
        
        try {
            // Use extraction service to find eligible content
            const images = await this.extractionService.extractImages();
            const eligibleImages = await this.filterEligibleImages(images);
            
            // Create markers for eligible content
            const markerData = [];
            for (const image of eligibleImages) {
                const marker = await this.createMarkerData(image);
                if (marker) {
                    markerData.push(marker);
                }
            }
            
            // Emit event for UI to render markers
            eventManager.emit('markers:render', { markers: markerData });
            
            this.notifyActivation(markerData.length);
            return markerData.length;
            
        } catch (error) {
            console.error('Failed to activate markers:', error);
            eventManager.emit('markers:error', { error });
            return 0;
        }
    }
    
    async filterEligibleImages(images) {
        const eligible = [];
        
        for (const image of images) {
            if (this.processedElements.has(image.element)) continue;
            
            // Use validator if available
            if (this.validator) {
                const validation = this.validator.validate(image);
                if (!validation.valid) {
                    console.log(`Image failed validation: ${validation.errors[0]?.reason}`);
                    continue;
                }
            }
            
            // Use intelligence for scoring
            if (this.intelligence) {
                const analysis = this.intelligence.analyze(image);
                if (analysis.score < this.config.minImageScore) {
                    console.log(`Image score too low: ${analysis.score}`);
                    continue;
                }
                image.analysis = analysis;
            }
            
            eligible.push(image);
            this.processedElements.add(image.element);
        }
        
        return eligible;
    }
    
    async createMarkerData(image) {
        const markerId = `marker_${++this.markerIdCounter}`;
        
        const markerData = {
            id: markerId,
            imageData: image,
            analysis: image.analysis,
            position: this.calculateMarkerPosition(image),
            config: this.getMarkerConfig(image)
        };
        
        this.markers.set(markerId, markerData);
        return markerData;
    }
    
    calculateMarkerPosition(image) {
        const rect = image.element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        return {
            top: rect.top + scrollTop + 10,
            left: rect.left + scrollLeft + rect.width - 35,
            elementRect: rect
        };
    }
    
    getMarkerConfig(image) {
        const analysis = image.analysis || { level: 'low', score: 0.5 };
        
        return {
            level: analysis.level,
            score: analysis.score,
            color: this.getColorForLevel(analysis.level),
            icon: this.getIconForType(image.type)
        };
    }
    
    getColorForLevel(level) {
        const colors = {
            high: '#4CAF50',
            recommended: '#2196F3',
            low: '#FFC107',
            negligible: '#9E9E9E'
        };
        return colors[level] || colors.low;
    }
    
    getIconForType(type) {
        const icons = {
            figure: 'fa-image',
            chart: 'fa-chart-bar',
            diagram: 'fa-project-diagram',
            photo: 'fa-camera'
        };
        return icons[type] || icons.figure;
    }
    
    handleExtraction(data) {
        const { markerId } = data;
        const markerData = this.markers.get(markerId);
        
        if (!markerData) return;
        
        console.log('🎯 Extracting image:', markerId);
        
        // Mark as active
        this.activeMarkers.add(markerId);
        
        // Trigger animation if available
        if (this.animationService) {
            this.animationService.flyToExtension(markerData.imageData);
        }
        
        // Send to background/extension
        this.sendToExtension(markerData.imageData);
        
        // Emit success event
        eventManager.emit('marker:extracted', { 
            markerId, 
            imageData: markerData.imageData 
        });
    }
    
    sendToExtension(imageData) {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                action: 'ADD_IMAGE_TO_ORKG',
                data: imageData
            }).catch(error => {
                console.error('Failed to send to extension:', error);
            });
        }
        
        // Also emit custom event
        window.dispatchEvent(new CustomEvent('orkg:image-added', {
            detail: imageData
        }));
    }
    
    deactivate() {
        console.log('🎯 Deactivating markers...');
        this.isActive = false;
        
        // Emit deactivation event for UI cleanup
        eventManager.emit('markers:deactivate');
        
        // Clear state
        this.markers.clear();
        this.activeMarkers.clear();
    }
    
    notifyActivation(count) {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
                action: 'MARKERS_ACTIVATED',
                data: { count }
            }).catch(() => {
                // Extension might not be listening
            });
        }
        
        eventManager.emit('markers:activated', { count });
    }
    
    // Public API
    getMarkerData(markerId) {
        return this.markers.get(markerId);
    }
    
    getAllMarkers() {
        return Array.from(this.markers.values());
    }
    
    getActiveMarkers() {
        return Array.from(this.activeMarkers);
    }
    
    isMarkerActive(markerId) {
        return this.activeMarkers.has(markerId);
    }
    
    getStats() {
        return {
            totalMarkers: this.markers.size,
            activeMarkers: this.activeMarkers.size,
            isActive: this.isActive
        };
    }
    
    cleanup() {
        this.deactivate();
        this.processedElements = new WeakSet();
        this.markerIdCounter = 0;
        this.isInitialized = false;
        
        console.log('🧹 ContentMarkerService cleanup completed');
    }
}
// ================================
// src/core/content/analyzers/ImageAnalyzer.js - Complete Implementation
// ================================

import { eventManager } from '../../../utils/eventManager.js';
import { ImageTableView } from './ImageTableView.js';
import { ImageTripleEditor } from '../../../components/modals/ImageTripleEditor.js';

export class ImageAnalyzer {
    constructor(config) {
        this.services = config?.services || {};
        this.container = null;
        
        // State
        this.images = [];
        this.analyses = {};
        this.selectedImages = new Set();
        this.isAnalyzing = false;
        this.isInitialized = false;
        
        // Analysis state
        this.batchAnalysisTotal = null;
        this.batchAnalysisCurrent = null;
        this.currentAnalyzingId = null;
        
        // Components
        this.tableView = null;
        this.tripleEditor = null;
        this.imageAnalysisService = null;
        
        // Storage sync
        this.syncInterval = null;
        
        // Track modal state
        this.openModals = new Map();
        
        console.log('🖼️ ImageAnalyzer initialized');
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🖼️ Initializing ImageAnalyzer...');
            
            await this.initializeAnalysisService();
            
            this.tableView = new ImageTableView({
                onSelect: (imageIds) => this.handleImageSelection(imageIds),
                onAnalyze: (imageId) => this.handleSingleAnalysis(imageId),
                onDelete: (imageId) => this.handleSingleDelete(imageId),
                onViewTriples: (imageId) => this.handleViewTriples(imageId),
                onSelectAll: () => this.handleSelectAll(),
                onDeselectAll: () => this.handleDeselectAll(),
                onBatchAnalyze: () => this.handleBatchAnalysis(),
                onBatchDelete: () => this.handleBatchDelete()
            });
            
            await this.loadPersistedData();
            this.setupEventListeners();
            this.startStorageSync();
            
            this.isInitialized = true;
            console.log('✅ ImageAnalyzer initialized successfully');
            
        } catch (error) {
            console.error('❌ ImageAnalyzer initialization failed:', error);
            throw error;
        }
    }
    
    async initializeAnalysisService() {
        try {
            const apiKey = this.getApiKey();
            if (!apiKey) {
                console.log('⚠️ No API key found, analysis features disabled');
                return;
            }
            
            const [{ ImageAnalysisService }, { OpenAIProvider }] = await Promise.all([
                import('../../services/ai/adapters/ImageAnalysisService.js'),
                import('../../services/ai/providers/openaiProvider.js')
            ]);
            
            const provider = new OpenAIProvider({
                apiKey: apiKey,
                model: 'gpt-4o-mini',
                visionModel: 'gpt-4o'
            });
            
            await provider.init();
            
            this.imageAnalysisService = new ImageAnalysisService();
            this.imageAnalysisService.provider = provider;
            this.imageAnalysisService.isInitialized = true;
            
            console.log('✅ Analysis service initialized');
            
        } catch (error) {
            console.warn('⚠️ Analysis service unavailable:', error.message);
            this.imageAnalysisService = null;
        }
    }
    
    getApiKey() {
        if (window.orkgConfig?.getOpenAIKey) {
            return window.orkgConfig.getOpenAIKey();
        }
        return localStorage.getItem('orkg-openai-api-key') || 
               localStorage.getItem('openai_api_key');
    }
    
    async loadPersistedData() {
        try {
            console.log('📥 Loading persisted data...');
            
            // Load from chrome.storage.local
            const chromeResult = await chrome.storage.local.get(['analysisResults', 'imageAnalyses']);
            const chromeImages = chromeResult.analysisResults?.markerImages || [];
            
            // Load from StateManager
            let stateManagerImages = [];
            if (this.services.stateManager) {
                const state = this.services.stateManager.getState();
                stateManagerImages = state?.data?.analysisResults?.markerImages || [];
            }
            
            // Merge and deduplicate
            const imageMap = new Map();
            
            chromeImages.forEach(img => {
                imageMap.set(img.id, img);
            });
            
            stateManagerImages.forEach(img => {
                if (!imageMap.has(img.id)) {
                    imageMap.set(img.id, img);
                }
            });
            
            this.images = Array.from(imageMap.values());
            
            // Load analyses with triple data
            if (chromeResult.imageAnalyses) {
                this.analyses = chromeResult.imageAnalyses;
                
                // Ensure each analysis has a triples array
                Object.keys(this.analyses).forEach(imageId => {
                    if (this.analyses[imageId] && !this.analyses[imageId].triples) {
                        this.analyses[imageId].triples = [];
                    }
                });
            }
            
            console.log(`📸 Loaded ${this.images.length} images with analyses`);
            
            if (this.images.length > 0) {
                await this.saveImages();
            }
            
        } catch (error) {
            console.error('Failed to load persisted data:', error);
        }
    }
    
    setupEventListeners() {
        console.log('🎧 Setting up event listeners...');
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('📨 Received message:', request.action);
            
            if (request.action === 'IMAGE_ADDED_TO_ANALYZER' || 
                request.action === 'MARKER_IMAGE_ADDED') {
                this.handleMarkerImageAdded(request.data);
                sendResponse({ success: true });
                return false;
            }
            
            if (request.action === 'IMAGE_REMOVED_FROM_ANALYZER') {
                this.handleMarkerImageRemoved(request.imageId);
                sendResponse({ success: true });
                return false;
            }
        });
        
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.analysisResults) {
                const newValue = changes.analysisResults.newValue;
                const oldValue = changes.analysisResults.oldValue;
                
                if (newValue?.markerImages) {
                    const newImages = newValue.markerImages || [];
                    const oldImages = oldValue?.markerImages || [];
                    
                    if (newImages.length !== this.images.length) {
                        console.log('📦 Storage changed, syncing images...');
                        this.images = newImages;
                        this.syncWithStateManager();
                        
                        if (this.findContainer()) {
                            this.updateUI();
                        }
                        
                        const diff = newImages.length - oldImages.length;
                        if (diff > 0 && this.services.toastManager) {
                            this.services.toastManager.info(
                                `${diff} new image${diff > 1 ? 's' : ''} added while away`, 
                                3000
                            );
                        }
                    }
                }
            }
        });
        
        this.checkForNewImages();
    }
    
    startStorageSync() {
        this.syncInterval = setInterval(() => {
            this.checkForNewImages();
        }, 2000);
    }
    
    async checkForNewImages() {
        try {
            const result = await chrome.storage.local.get(['analysisResults']);
            if (result.analysisResults?.markerImages) {
                const storedImages = result.analysisResults.markerImages;
                if (storedImages.length !== this.images.length) {
                    console.log('📦 Found image count mismatch, syncing...');
                    this.images = storedImages;
                    await this.syncWithStateManager();
                    
                    if (this.findContainer()) {
                        this.updateUI();
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to check for new images:', error);
        }
    }
    
    async syncWithStateManager() {
        if (!this.services.stateManager) return;
        
        try {
            const state = this.services.stateManager.getState();
            const analysisResults = state?.data?.analysisResults || {
                text: {},
                markerImages: [],
                tables: []
            };
            
            analysisResults.markerImages = this.images;
            
            this.services.stateManager.updateState('data.analysisResults', analysisResults);
            
            if (this.services.stateManager.saveToStorage) {
                this.services.stateManager.saveToStorage();
            }
            
            console.log('✅ Synced with StateManager:', this.images.length, 'images');
        } catch (error) {
            console.error('Failed to sync with StateManager:', error);
        }
    }
    
    // ================================
    // Image Management
    // ================================
    
    handleMarkerImageAdded(imageData) {
        console.log('📸 Marker image added:', imageData?.id);
        
        if (!imageData) return;
        
        const exists = this.images.some(img => img.id === imageData.id);
        if (!exists) {
            this.images.push({
                ...imageData,
                addedFrom: 'marker',
                addedAt: imageData.addedAt || Date.now()
            });
            
            this.saveImages();
            this.updateUI();
            
            this.sendToContentScript('HIDE_MARKER', imageData.id);
            this.showToast(`Image added (${this.images.length} total)`, 'success');
        }
    }
    
    handleMarkerImageRemoved(imageId) {
        const index = this.images.findIndex(img => img.id === imageId);
        if (index !== -1) {
            this.images.splice(index, 1);
            this.selectedImages.delete(imageId);
            delete this.analyses[imageId];
            
            this.saveImages();
            this.saveAnalyses();
            this.updateUI();
            
            console.log('🗑️ Image removed:', imageId);
        }
    }
    
    // ================================
    // Storage Methods with Triple Support
    // ================================
    
    async saveImages() {
        try {
            const analysisResults = {
                text: {},
                markerImages: this.images,
                tables: []
            };
            
            await chrome.storage.local.set({ 
                analysisResults: analysisResults,
                analysisResultsTimestamp: Date.now()
            });
            
            console.log(`💾 Saved to chrome.storage: ${this.images.length} images`);
            
            if (this.services.stateManager) {
                this.services.stateManager.updateState('data.analysisResults', analysisResults);
                this.services.stateManager.saveToStorage();
                console.log(`💾 Saved to StateManager/localStorage: ${this.images.length} images`);
            }
            
        } catch (error) {
            console.error('Failed to save images:', error);
        }
    }
    
    async saveAnalyses() {
        try {
            // Ensure all analyses have their triples preserved
            Object.keys(this.analyses).forEach(imageId => {
                if (this.analyses[imageId] && !this.analyses[imageId].triples) {
                    this.analyses[imageId].triples = [];
                }
            });
            
            await chrome.storage.local.set({ 
                imageAnalyses: this.analyses 
            });
            
            console.log(`💾 Saved ${Object.keys(this.analyses).length} analyses with triples`);
        } catch (error) {
            console.error('Failed to save analyses:', error);
        }
    }
    
    // ================================
    // Analysis Handlers with Triple Generation
    // ================================
    
    async handleSingleAnalysis(imageId) {
        console.log('🔬 Analyzing single image:', imageId);
        
        if (!this.imageAnalysisService) {
            this.showToast('Please configure OpenAI API key for analysis', 'error');
            return;
        }
        
        const image = this.images.find(img => img.id === imageId);
        if (!image) {
            this.showToast('Image not found', 'error');
            return;
        }
        
        this.isAnalyzing = true;
        this.currentAnalyzingId = imageId;
        this.updateUI();
        
        this.showToast('Analyzing image...', 'info');
        
        try {
            const analysis = await this.imageAnalysisService.analyzeImage({
                src: image.src,
                alt: image.alt || '',
                caption: image.caption || '',
                type: image.type || 'figure'
            });
            
            // Ensure triples are included in the analysis
            if (!analysis.triples || analysis.triples.length === 0) {
                analysis.triples = this.generateDefaultTriples(image, analysis);
            }
            
            this.analyses[imageId] = analysis;
            await this.saveAnalyses();
            
            this.showToast(`Analysis complete: ${analysis.triples.length} triples extracted`, 'success');
            
        } catch (error) {
            console.error('Analysis failed:', error);
            this.showToast('Analysis failed: ' + error.message, 'error');
        } finally {
            this.isAnalyzing = false;
            this.currentAnalyzingId = null;
            this.updateUI();
        }
    }
    
    async handleBatchAnalysis() {
        console.log('🔬 Batch analysis for:', Array.from(this.selectedImages));
        
        if (this.selectedImages.size === 0) {
            this.showToast('Please select images to analyze', 'warning');
            return;
        }
        
        if (!this.imageAnalysisService) {
            this.showToast('Please configure OpenAI API key for analysis', 'error');
            return;
        }
        
        const count = this.selectedImages.size;
        const confirmed = await this.showConfirmation(
            `Analyze ${count} selected image${count > 1 ? 's' : ''}?`,
            'This may take some time.'
        );
        
        if (!confirmed) return;
        
        this.isAnalyzing = true;
        this.batchAnalysisTotal = count;
        this.batchAnalysisCurrent = 0;
        this.updateUI();
        
        let completed = 0;
        let totalTriples = 0;
        const imageIds = Array.from(this.selectedImages);
        
        for (const imageId of imageIds) {
            const image = this.images.find(img => img.id === imageId);
            if (!image) continue;
            
            try {
                this.batchAnalysisCurrent = completed + 1;
                this.currentAnalyzingId = imageId;
                this.updateUI();
                
                this.showToast(`Analyzing ${++completed}/${count}...`, 'info', 2000);
                
                const analysis = await this.imageAnalysisService.analyzeImage({
                    src: image.src,
                    alt: image.alt || '',
                    caption: image.caption || '',
                    type: image.type || 'figure'
                });
                
                // Ensure triples are included
                if (!analysis.triples || analysis.triples.length === 0) {
                    analysis.triples = this.generateDefaultTriples(image, analysis);
                }
                
                totalTriples += analysis.triples.length;
                this.analyses[imageId] = analysis;
                await this.saveAnalyses();
                
            } catch (error) {
                console.error(`Failed to analyze ${imageId}:`, error);
            }
        }
        
        this.isAnalyzing = false;
        this.batchAnalysisTotal = null;
        this.batchAnalysisCurrent = null;
        this.currentAnalyzingId = null;
        this.updateUI();
        
        this.showToast(`Analysis complete: ${completed} images, ${totalTriples} total triples`, 'success');
    }
    
    generateDefaultTriples(image, analysis) {
        const triples = [];
        
        // Generate triples based on analysis data
        if (analysis.type) {
            triples.push({
                subject: 'Image',
                predicate: 'has_type',
                object: analysis.type,
                confidence: 0.9,
                isManual: false
            });
        }
        
        if (analysis.description) {
            triples.push({
                subject: 'Image',
                predicate: 'depicts',
                object: analysis.description.substring(0, 100),
                confidence: 0.8,
                isManual: false
            });
        }
        
        if (analysis.insights?.mainFinding) {
            triples.push({
                subject: 'Figure',
                predicate: 'shows',
                object: analysis.insights.mainFinding,
                confidence: 0.85,
                isManual: false
            });
        }
        
        // Add at least one default triple if none were generated
        if (triples.length === 0) {
            triples.push({
                subject: 'Figure',
                predicate: 'represents',
                object: image.alt || 'Visual content',
                confidence: 0.5,
                isManual: false
            });
        }
        
        return triples;
    }
    
    // ================================
    // Triple View Handler - Fixed
    // ================================
    
    handleViewTriples(imageId) {
        console.log('📊 View triples for:', imageId);
        
        const image = this.images.find(img => img.id === imageId);
        const analysis = this.analyses[imageId];
        
        if (!image) {
            this.showToast('Image not found', 'error');
            return;
        }
        
        if (!analysis) {
            this.showToast('Please analyze the image first', 'warning');
            return;
        }
        
        // Close existing editor if open
        if (this.tripleEditor) {
            this.tripleEditor.close();
            this.tripleEditor = null;
        }
        
        // Store original analysis for revert capability
        const originalAnalysis = JSON.parse(JSON.stringify(analysis));
        
        // Create new triple editor modal
        this.tripleEditor = new ImageTripleEditor(image, analysis, {
            size: 'extra-large',
            resizable: true,
            maximizable: true,
            onSave: async (id, updatedAnalysis) => {
                // Save the updated analysis with triples
                this.analyses[id] = updatedAnalysis;
                await this.saveAnalyses();
                this.updateUI();
                this.showToast(`Saved ${updatedAnalysis.triples.length} triples`, 'success');
            },
            onCancel: () => {
                // Revert to original analysis
                this.analyses[imageId] = originalAnalysis;
                this.showToast('Changes discarded', 'info');
            },
            onClose: () => {
                this.tripleEditor = null;
            }
        });
        
        this.tripleEditor.open();
    }
    
    // ================================
    // Selection Handlers
    // ================================
    
    handleImageSelection(imageIds) {
        console.log('📝 Images selected:', imageIds);
        this.selectedImages = new Set(imageIds);
        this.updateSelectionUI();
    }
    
    handleSelectAll() {
        console.log('✅ Selecting all images');
        this.selectedImages = new Set(this.images.map(img => img.id));
        this.updateUI();
    }
    
    handleDeselectAll() {
        console.log('⬜ Deselecting all images');
        this.selectedImages.clear();
        this.updateUI();
    }
    
    // ================================
    // Delete Handlers
    // ================================
    
    async handleSingleDelete(imageId) {
        console.log('🗑️ Delete requested for:', imageId);
        
        const confirmed = await this.showConfirmation(
            'Delete this image?',
            'The marker will reappear on the page.'
        );
        
        if (!confirmed) return;
        
        this.images = this.images.filter(img => img.id !== imageId);
        delete this.analyses[imageId];
        this.selectedImages.delete(imageId);
        
        await this.saveImages();
        await this.saveAnalyses();
        
        this.sendToContentScript('SHOW_MARKER', imageId);
        
        this.updateUI();
        this.showToast('Image deleted', 'success');
    }
    
    async handleBatchDelete() {
        console.log('🗑️ Batch delete for:', Array.from(this.selectedImages));
        
        if (this.selectedImages.size === 0) {
            this.showToast('Please select images to delete', 'warning');
            return;
        }
        
        const count = this.selectedImages.size;
        const confirmed = await this.showConfirmation(
            `Delete ${count} selected image${count > 1 ? 's' : ''}?`,
            'The markers will reappear on the page.'
        );
        
        if (!confirmed) return;
        
        const deletedIds = Array.from(this.selectedImages);
        
        this.images = this.images.filter(img => !this.selectedImages.has(img.id));
        deletedIds.forEach(id => {
            delete this.analyses[id];
            this.sendToContentScript('SHOW_MARKER', id);
        });
        this.selectedImages.clear();
        
        await this.saveImages();
        await this.saveAnalyses();
        
        this.updateUI();
        this.showToast(`${count} image${count > 1 ? 's' : ''} deleted`, 'success');
    }
    
    // ================================
    // Communication Methods
    // ================================
    
    sendToContentScript(action, imageId) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                const message = action === 'HIDE_MARKER' ? {
                    action: 'ANALYZER_STATE_UPDATE',
                    type: 'image-extracted',
                    data: { itemId: imageId }
                } : {
                    action: 'IMAGE_REMOVED_FROM_ANALYZER',
                    imageId: imageId
                };
                
                chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {
                    console.warn('Content script not available');
                });
            }
        });
    }
    
    // ================================
    // UI Update Methods
    // ================================
    
    updateUI() {
        const container = this.findContainer();
        if (!container) {
            console.log('Container not found, skipping UI update');
            return;
        }
        
        container.innerHTML = this.render();
        this.attachEventHandlers();
    }
    
    updateSelectionUI() {
        const container = this.findContainer();
        if (!container || !this.tableView) return;
        
        const checkboxes = container.querySelectorAll('.checkbox-row');
        checkboxes.forEach(cb => {
            cb.checked = this.selectedImages.has(cb.dataset.imageId);
        });
        
        this.tableView.updateHeaderCheckbox(container);
        
        const selectedCount = this.selectedImages.size;
        const batchAnalyze = container.querySelector('#btn-batch-analyze');
        const batchDelete = container.querySelector('#btn-batch-delete');
        
        if (batchAnalyze) {
            batchAnalyze.disabled = selectedCount === 0;
            batchAnalyze.innerHTML = `<i class="fas fa-brain"></i> Analyze Selected (${selectedCount})`;
        }
        
        if (batchDelete) {
            batchDelete.disabled = selectedCount === 0;
        }
        
        const batchInfo = container.querySelector('.batch-info span');
        if (batchInfo) {
            batchInfo.textContent = `${selectedCount} of ${this.images.length} selected`;
        }
    }
    
    findContainer() {
        return document.querySelector('.image-analyzer-wrapper') ||
               document.querySelector('[data-tab-content="images"]') ||
               document.querySelector('#analysis-tab-content');
    }
    
    attachEventHandlers() {
        const container = this.findContainer();
        if (!container || !this.tableView) return;
        
        const tableContainer = container.querySelector('.image-table-container');
        if (tableContainer) {
            this.tableView.attachEventHandlers(tableContainer);
            console.log('✅ Event handlers attached');
        }
    }
    
    // ================================
    // Rendering
    // ================================
    
    render() {
        if (this.isAnalyzing) {
            return this.renderAnalyzing();
        }
        
        if (this.images.length === 0) {
            return this.renderEmptyState();
        }
        
        return `
            <div class="analyzer-header">
                <div class="header-info">
                    <i class="fas fa-images"></i>
                    <span>${this.images.length} image(s) collected from markers</span>
                </div>
            </div>
            
            ${this.tableView ? this.tableView.render(this.images, this.analyses, this.selectedImages) : ''}
        `;
    }
    
    renderEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-image"></i>
                <h3>No Images Added</h3>
                <p>Click on the ORKG markers on images in the page to add them here.</p>
                <p class="empty-hint">Images with markers will appear here for analysis and triple extraction.</p>
            </div>
        `;
    }
    
    renderAnalyzing() {
        if (this.batchAnalysisTotal) {
            const percentage = (this.batchAnalysisCurrent / this.batchAnalysisTotal) * 100;
            
            return `
                <div class="analyzing-overlay">
                    <div class="analyzing-content">
                        <div class="spinner"></div>
                        <h3>Batch Analysis in Progress</h3>
                        <div class="analysis-progress">
                            <p>Analyzing image ${this.batchAnalysisCurrent} of ${this.batchAnalysisTotal}</p>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${percentage}%"></div>
                            </div>
                            <small>${Math.round(percentage)}% complete</small>
                        </div>
                        ${this.currentAnalyzingId ? `
                            <div class="current-image-preview">
                                ${this.renderAnalyzingImagePreview(this.currentAnalyzingId)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else if (this.currentAnalyzingId) {
            return `
                <div class="analyzing-overlay">
                    <div class="analyzing-content">
                        <div class="spinner"></div>
                        <h3>Analyzing Image</h3>
                        <p>Extracting triples and insights...</p>
                        <div class="current-image-preview">
                            ${this.renderAnalyzingImagePreview(this.currentAnalyzingId)}
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="analyzing-overlay">
                    <div class="analyzing-content">
                        <div class="spinner"></div>
                        <h3>Processing...</h3>
                        <p>Please wait...</p>
                    </div>
                </div>
            `;
        }
    }
    
    renderAnalyzingImagePreview(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return '';
        
        return `
            <div class="analyzing-image-wrapper">
                <img src="${image.src}" alt="${this.escapeHtml(image.alt || 'Analyzing')}" />
                <div class="analyzing-image-info">
                    <small>${this.escapeHtml(image.alt || 'Extracting knowledge triples...')}</small>
                </div>
            </div>
        `;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    // ================================
    // Utility Methods
    // ================================
    
    showToast(message, type = 'info', duration = 3000) {
        if (this.services.toastManager) {
            this.services.toastManager[type](message, duration);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    async showConfirmation(title, message) {
        if (this.services.toastManager?.showConfirmation) {
            return new Promise(resolve => {
                this.services.toastManager.showConfirmation(
                    `${title}\n${message}`,
                    () => resolve(true),
                    () => resolve(false),
                    'warning'
                );
            });
        }
        
        return confirm(`${title}\n${message}`);
    }
    
    // ================================
    // Public API Methods
    // ================================
    
    setMarkerImages(images) {
        console.log('📸 Setting marker images:', images?.length || 0);
        this.images = images || [];
        
        this.syncWithStateManager();
        
        if (this.findContainer()) {
            this.updateUI();
        }
    }
    
    attachHandlers() {
        console.log('🎯 Attaching handlers from AnalysisStep');
        
        const container = this.findContainer();
        if (container && this.tableView) {
            const tableContainer = container.querySelector('.image-table-container');
            if (tableContainer) {
                this.tableView.attachEventHandlers(tableContainer);
                console.log('✅ Handlers attached successfully');
            }
        }
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isAnalyzing: this.isAnalyzing,
            imageCount: this.images.length,
            analyzedCount: Object.keys(this.analyses).length,
            selectedCount: this.selectedImages.size,
            triplesCount: Object.values(this.analyses).reduce((sum, a) => sum + (a.triples?.length || 0), 0),
            available: true
        };
    }
    
    async reset() {
        this.images = [];
        this.analyses = {};
        this.selectedImages.clear();
        
        await this.saveImages();
        await this.saveAnalyses();
        
        if (this.findContainer()) {
            this.updateUI();
        }
    }
    
    cleanup() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        if (this.tripleEditor) {
            this.tripleEditor.close();
            this.tripleEditor = null;
        }
        
        // Close all open modals
        this.openModals.forEach(modal => modal.close());
        this.openModals.clear();
        
        this.isInitialized = false;
    }
}

export default ImageAnalyzer;
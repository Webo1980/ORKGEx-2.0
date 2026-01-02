// src/core/content/problems/FieldComparison.js - Field Change Comparison UI
import { escapeHtml } from '../../../utils/utils.js';
import { eventManager } from '../../../utils/eventManager.js';

export class FieldComparison {
    constructor(options = {}) {
        this.options = {
            onUseNew: null,
            onKeepOld: null,
            onStartNew: null,
            ...options
        };
        
        this.container = null;
    }
    
    /**
     * Render field comparison interface
     */
    render(previousField, currentField, comparisonData) {
        const html = `
            <div class="field-comparison-card card">
                <div class="card-header">
                    <h3>
                        <i class="fas fa-exchange-alt"></i>
                        Research Field Changed
                    </h3>
                </div>
                
                <div class="card-content">
                    <div class="comparison-fields">
                        <div class="field-item previous">
                            <span class="field-label">Previous Field:</span>
                            <strong>${escapeHtml(previousField.label)}</strong>
                            ${comparisonData?.previousResults ? `
                                <small>${comparisonData.previousResults.length} problems analyzed</small>
                            ` : ''}
                        </div>
                        
                        <div class="field-arrow">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                        
                        <div class="field-item current">
                            <span class="field-label">New Field:</span>
                            <strong>${escapeHtml(currentField.label)}</strong>
                            ${comparisonData?.currentResults ? `
                                <small>${comparisonData.currentResults.length} problems found</small>
                            ` : ''}
                        </div>
                    </div>
                    
                    ${comparisonData ? `
                        <div class="comparison-stats">
                            <div class="stat-item">
                                <span class="stat-value">${comparisonData.commonProblems || 0}</span>
                                <span class="stat-label">Common Problems</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${comparisonData.uniqueToPrevious || 0}</span>
                                <span class="stat-label">Only in Previous</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${comparisonData.uniqueToCurrent || 0}</span>
                                <span class="stat-label">Only in New</span>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="comparison-message">
                        <i class="fas fa-info-circle"></i>
                        <p>You've changed the research field. Would you like to use the new field's problems or keep the previous selection?</p>
                    </div>
                    
                    <div class="comparison-actions">
                        <button class="btn btn-primary" id="use-new-field">
                            <i class="fas fa-check"></i>
                            <span>Use New Field</span>
                        </button>
                        <button class="btn btn-secondary" id="keep-old-field">
                            <i class="fas fa-undo"></i>
                            <span>Keep Previous Field</span>
                        </button>
                        <button class="btn btn-secondary" id="start-new-analysis">
                            <i class="fas fa-play"></i>
                            <span>Start Fresh Analysis</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const container = document.createElement('div');
        container.innerHTML = html;
        this.container = container.firstElementChild;
        
        this.setupEventHandlers();
        
        return this.container;
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        if (!this.container) return;
        
        const useNewBtn = this.container.querySelector('#use-new-field');
        const keepOldBtn = this.container.querySelector('#keep-old-field');
        const startNewBtn = this.container.querySelector('#start-new-analysis');
        
        if (useNewBtn) {
            useNewBtn.addEventListener('click', () => {
                if (this.options.onUseNew) {
                    this.options.onUseNew();
                }
                eventManager.emit('field-comparison:use-new');
            });
        }
        
        if (keepOldBtn) {
            keepOldBtn.addEventListener('click', () => {
                if (this.options.onKeepOld) {
                    this.options.onKeepOld();
                }
                eventManager.emit('field-comparison:keep-old');
            });
        }
        
        if (startNewBtn) {
            startNewBtn.addEventListener('click', () => {
                if (this.options.onStartNew) {
                    this.options.onStartNew();
                }
                eventManager.emit('field-comparison:start-new');
            });
        }
    }
}
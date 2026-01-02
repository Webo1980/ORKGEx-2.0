// ================================
// src/components/modals/FieldComparisonModal.js - Complete Implementation
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class FieldComparisonModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.comparisons = [];
        this.currentField = null;
    }
    
    show(comparisons, currentField) {
        this.comparisons = comparisons || [];
        this.currentField = currentField;
        
        this.createModal();
        this.render();
        this.setupEventHandlers();
        this.open();
    }
    
    createModal() {
        // Remove existing modal if any
        if (this.modal) {
            this.modal.remove();
        }
        
        this.modal = document.createElement('div');
        this.modal.className = 'modal field-comparison-modal';
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-labelledby', 'comparison-modal-title');
        this.modal.setAttribute('aria-modal', 'true');
    }
    
    render() {
        // Sort comparisons by timestamp (most recent first)
        const sortedComparisons = [...this.comparisons].sort((a, b) => b.timestamp - a.timestamp);
        
        this.modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2 class="modal-title" id="comparison-modal-title">
                        <i class="fas fa-exchange-alt"></i>
                        Field Analysis Comparison
                    </h2>
                    <button class="modal-close" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="comparison-intro">
                        <p>Compare problem analyses across different research fields. You have analyzed ${this.comparisons.length} field${this.comparisons.length !== 1 ? 's' : ''}.</p>
                    </div>
                    
                    <div class="comparison-grid">
                        ${sortedComparisons.map(comp => this.renderComparisonCard(comp)).join('')}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close-btn">
                        <i class="fas fa-times"></i>
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
    }
    
    renderComparisonCard(comparison) {
        const isCurrent = comparison.field?.id === this.currentField?.id || 
                         comparison.field?.label === this.currentField?.label;
        
        const timeAgo = this.getTimeAgo(comparison.timestamp);
        const similarityPercent = (comparison.maxSimilarity * 100).toFixed(1);
        
        return `
            <div class="comparison-card ${isCurrent ? 'current-field' : ''}">
                <div class="comparison-card-header">
                    <h3 class="field-title">
                        <i class="fas fa-tag"></i>
                        ${comparison.field?.label || 'Unknown Field'}
                    </h3>
                    ${isCurrent ? '<span class="current-badge">Current</span>' : ''}
                </div>
                
                <div class="comparison-stats">
                    <div class="stat-item">
                        <div class="stat-label">AI Problem</div>
                        <div class="stat-value">
                            ${comparison.aiProblem ? `
                                <div class="ai-problem-preview">
                                    ${this.truncateText(comparison.aiProblem.title, 100)}
                                </div>
                            ` : '<span class="no-data">Not generated</span>'}
                        </div>
                    </div>
                    
                    <div class="stat-row">
                        <div class="stat-item">
                            <div class="stat-label">ORKG Problems</div>
                            <div class="stat-value">
                                <strong>${comparison.problemCount || 0}</strong> 
                                <span class="stat-detail">matched</span>
                            </div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-label">Total Scanned</div>
                            <div class="stat-value">
                                <strong>${comparison.totalProblems || 0}</strong>
                                <span class="stat-detail">problems</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-row">
                        <div class="stat-item">
                            <div class="stat-label">Max Similarity</div>
                            <div class="stat-value">
                                <strong>${similarityPercent}%</strong>
                                <div class="similarity-bar-mini">
                                    <div class="similarity-fill-mini" style="width: ${similarityPercent}%"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="stat-item">
                            <div class="stat-label">Threshold Used</div>
                            <div class="stat-value">
                                <strong>${Math.round((comparison.threshold || 0.5) * 100)}%</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stat-item">
                        <div class="stat-label">Selected Problem</div>
                        <div class="stat-value">
                            ${comparison.selectedProblem ? `
                                <div class="selected-problem-preview">
                                    <i class="fas fa-check-circle"></i>
                                    ${this.truncateText(comparison.selectedProblem.title || comparison.selectedProblem.label, 80)}
                                </div>
                            ` : '<span class="no-data">None selected</span>'}
                        </div>
                    </div>
                    
                    <div class="comparison-footer">
                        <span class="timestamp">
                            <i class="fas fa-clock"></i>
                            ${timeAgo}
                        </span>
                        ${!isCurrent ? `
                            <button class="btn btn-sm btn-outline switch-field-btn" 
                                    data-field-id="${comparison.field?.id || comparison.field?.label}">
                                <i class="fas fa-arrow-right"></i>
                                Use This Analysis
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    getTimeAgo(timestamp) {
        if (!timestamp) return 'Unknown time';
        
        const now = Date.now();
        const diff = now - timestamp;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        return 'Just now';
    }
    
    setupEventHandlers() {
        if (!this.modal) return;
        
        // Close buttons
        const closeButtons = this.modal.querySelectorAll('.modal-close, .modal-close-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });
        
        // Overlay click
        const overlay = this.modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }
        
        // Switch field buttons
        const switchButtons = this.modal.querySelectorAll('.switch-field-btn');
        switchButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const fieldId = btn.dataset.fieldId;
                this.switchToField(fieldId);
            });
        });
        
        // Keyboard navigation
        this.modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }
    
    switchToField(fieldId) {
        const comparison = this.comparisons.find(comp => 
            (comp.field?.id || comp.field?.label) === fieldId
        );
        
        if (comparison) {
            // Emit event to switch to this field's analysis
            eventManager.emit('field-comparison:switch', {
                field: comparison.field,
                comparison: comparison
            });
            
            this.close();
        }
    }
    
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        document.body.classList.add('modal-open');
        
        // Animate in
        requestAnimationFrame(() => {
            if (this.modal) {
                this.modal.classList.add('modal-show');
            }
        });
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        document.body.classList.remove('modal-open');
        
        if (this.modal) {
            this.modal.classList.remove('modal-show');
            
            // Remove after animation
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.parentNode.removeChild(this.modal);
                }
                this.modal = null;
            }, 300);
        }
        
        // Clear state
        this.comparisons = [];
        this.currentField = null;
    }
    
    destroy() {
        this.close();
    }
}

export default FieldComparisonModal;
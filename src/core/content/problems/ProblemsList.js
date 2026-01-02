// src/core/content/problems/ProblemsList.js - ORKG Problems Display
import { escapeHtml } from '../../../utils/utils.js';
import { eventManager } from '../../../utils/eventManager.js';

export class ProblemsList {
    constructor(options = {}) {
        this.options = {
            maxDisplay: 50,
            onSelect: null,
            onViewInORKG: null,
            ...options
        };
        
        this.container = null;
        this.problems = [];
        this.selectedId = null;
        this.threshold = 0.7;
    }
    
    /**
     * Render problems list
     */
    render(problems, threshold = 0.7, selectedId = null) {
        this.problems = problems || [];
        this.threshold = threshold;
        this.selectedId = selectedId;
        
        const filteredProblems = this.filterByThreshold(problems, threshold);
        
        const html = `
            <div class="problems-section">
                <div class="section-header">
                    <h3>
                        <i class="fas fa-database"></i>
                        ORKG Research Problems
                    </h3>
                    <span class="results-count">
                        ${filteredProblems.length} of ${problems.length} problems shown
                    </span>
                </div>
                
                ${filteredProblems.length > 0 ? 
                    this.renderProblemCards(filteredProblems) :
                    this.renderNoProblems()
                }
            </div>
        `;
        
        const container = document.createElement('div');
        container.innerHTML = html;
        this.container = container.firstElementChild;
        
        this.setupEventHandlers();
        
        return this.container;
    }
    
    /**
     * Render problem cards using cards.css styles
     */
    renderProblemCards(problems) {
        return `
            <div class="card-grid">
                ${problems.slice(0, this.options.maxDisplay).map((result, index) => {
                    const problem = result.problem || result;
                    const similarity = result.similarity || result.confidence || 0;
                    const isSelected = problem.id === this.selectedId;
                    
                    return `
                        <div class="card problem-card ${isSelected ? 'selected' : ''} ${this.getSimilarityClass(similarity)}"
                             data-problem-id="${problem.id}">
                            <div class="card-header">
                                <h3>
                                    <span class="problem-rank">#${index + 1}</span>
                                    ${escapeHtml(problem.label || problem.title || 'Unknown Problem')}
                                </h3>
                                <div class="similarity-badge badge ${this.getSimilarityBadgeClass(similarity)}">
                                    ${Math.round(similarity * 100)}% match
                                </div>
                            </div>
                            
                            <div class="card-content">
                                ${problem.description ? `
                                    <p class="problem-description">
                                        ${escapeHtml(problem.description.substring(0, 200))}${problem.description.length > 200 ? '...' : ''}
                                    </p>
                                ` : ''}
                                
                                <div class="problem-actions">
                                    <button class="btn ${isSelected ? 'btn-success' : 'btn-primary'} btn-sm select-problem-btn"
                                            data-problem-id="${problem.id}">
                                        <i class="fas ${isSelected ? 'fa-check-circle' : 'fa-check'}"></i>
                                        <span>${isSelected ? 'Selected' : 'Select'}</span>
                                    </button>
                                    
                                    ${problem.id ? `
                                        <a href="https://orkg.org/problem/${problem.id}"
                                           target="_blank"
                                           class="btn btn-secondary btn-sm">
                                            <i class="fas fa-external-link-alt"></i>
                                            <span>View in ORKG</span>
                                        </a>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    /**
     * Render no problems message
     */
    renderNoProblems() {
        return `
            <div class="empty-state-card">
                <div class="empty-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>No matching problems found</h3>
                <p>No ORKG problems match the current similarity threshold. Try lowering the threshold to see more results.</p>
            </div>
        `;
    }
    
    /**
     * Filter problems by threshold
     */
    filterByThreshold(problems, threshold) {
        if (!problems) return [];
        
        return problems.filter(result => {
            const similarity = result.similarity || result.confidence || 0;
            return similarity >= threshold;
        });
    }
    
    /**
     * Get similarity class for styling
     */
    getSimilarityClass(similarity) {
        if (similarity >= 0.8) return 'similarity-high';
        if (similarity >= 0.6) return 'similarity-medium';
        return 'similarity-low';
    }
    
    /**
     * Get similarity badge class
     */
    getSimilarityBadgeClass(similarity) {
        if (similarity >= 0.8) return 'badge-success';
        if (similarity >= 0.6) return 'badge-warning';
        return 'badge-info';
    }
    
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        if (!this.container) return;
        
        // Select buttons
        const selectButtons = this.container.querySelectorAll('.select-problem-btn');
        selectButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const problemId = btn.dataset.problemId;
                this.handleSelection(problemId);
            });
        });
        
        // Card clicks
        const cards = this.container.querySelectorAll('.problem-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('a') || e.target.closest('button')) return;
                const problemId = card.dataset.problemId;
                this.handleSelection(problemId);
            });
        });
    }
    
    /**
     * Handle problem selection
     */
    handleSelection(problemId) {
        const wasSelected = this.selectedId === problemId;
        this.selectedId = wasSelected ? null : problemId;
        
        // Update UI
        this.updateSelectionUI();
        
        // Find selected problem
        const selectedProblem = this.problems.find(r => 
            (r.problem?.id || r.id) === problemId
        );
        
        // Call callback
        if (this.options.onSelect) {
            this.options.onSelect(wasSelected ? null : selectedProblem);
        }
        
        eventManager.emit('problem-list:selection-changed', {
            problemId: this.selectedId,
            problem: wasSelected ? null : selectedProblem
        });
    }
    
    /**
     * Update selection UI
     */
    updateSelectionUI() {
        const cards = this.container.querySelectorAll('.problem-card');
        cards.forEach(card => {
            const problemId = card.dataset.problemId;
            const isSelected = problemId === this.selectedId;
            
            card.classList.toggle('selected', isSelected);
            
            const btn = card.querySelector('.select-problem-btn');
            if (btn) {
                if (isSelected) {
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-success');
                    btn.innerHTML = '<i class="fas fa-check-circle"></i><span>Selected</span>';
                } else {
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-primary');
                    btn.innerHTML = '<i class="fas fa-check"></i><span>Select</span>';
                }
            }
        });
    }
    
    /**
     * Update threshold and re-filter
     */
    updateThreshold(newThreshold) {
        this.threshold = newThreshold;
        if (this.container) {
            const newContainer = this.render(this.problems, newThreshold, this.selectedId);
            this.container.replaceWith(newContainer);
        }
    }
    
    /**
     * Get selected problem
     */
    getSelected() {
        if (!this.selectedId) return null;
        
        return this.problems.find(r => 
            (r.problem?.id || r.id) === this.selectedId
        );
    }
}
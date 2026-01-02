export class TemplateList {
    constructor() {
        this.container = null;
        this.templates = [];
        this.selectedTemplateId = null;
    }
    
    init(container, templates) {
        this.container = container;
        this.templates = templates;
        this.render();
    }
    
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="template-list">
                <div class="template-list-header">
                    <h3>Available Templates</h3>
                    <span class="template-count">${this.templates.length} templates found</span>
                </div>
                
                <div class="template-cards">
                    ${this.templates.map((item, index) => this.renderTemplateCard(item, index)).join('')}
                </div>
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    renderTemplateCard(templateData, index) {
        const template = templateData.template;
        const isSelected = template.id === this.selectedTemplateId;
        
        return `
            <div class="template-card ${isSelected ? 'selected' : ''}" 
                 data-template-id="${template.id}"
                 data-template-index="${index}">
                <div class="template-card-header">
                    <div class="template-rank">#${index + 1}</div>
                    <div class="template-usage">
                        <span class="usage-count">${templateData.count}</span>
                        <span class="usage-label">papers</span>
                    </div>
                </div>
                
                <div class="template-card-body">
                    <h4 class="template-name">${this.escapeHtml(template.name)}</h4>
                    <p class="template-description">${this.escapeHtml(template.description || 'No description')}</p>
                    
                    <div class="template-properties">
                        <div class="properties-header">
                            <i class="fas fa-list"></i>
                            <span>${template.properties?.length || 0} Properties</span>
                        </div>
                        <ul class="properties-list">
                            ${(template.properties || []).slice(0, 3).map(prop => `
                                <li class="property-item">
                                    <span class="property-name">${this.escapeHtml(prop.label)}</span>
                                    <span class="property-type">${prop.type}</span>
                                </li>
                            `).join('')}
                            ${template.properties?.length > 3 ? `
                                <li class="property-more">+${template.properties.length - 3} more</li>
                            ` : ''}
                        </ul>
                    </div>
                    
                    <div class="template-papers">
                        <details class="papers-details">
                            <summary>Used in papers</summary>
                            <ul class="papers-list">
                                ${templateData.papers.slice(0, 5).map(paper => `
                                    <li class="paper-item">
                                        <a href="https://orkg.org/paper/${paper.id}" 
                                           target="_blank"
                                           class="paper-link">
                                            ${this.escapeHtml(paper.title)}
                                        </a>
                                    </li>
                                `).join('')}
                            </ul>
                        </details>
                    </div>
                </div>
                
                <div class="template-card-footer">
                    <button class="btn btn-sm btn-primary select-template-btn" 
                            data-template-index="${index}">
                        <i class="fas fa-check"></i>
                        ${isSelected ? 'Selected' : 'Select'}
                    </button>
                    <a href="https://orkg.org/template/${template.id}" 
                       target="_blank"
                       class="btn btn-sm btn-outline">
                        <i class="fas fa-external-link-alt"></i>
                        View in ORKG
                    </a>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const selectButtons = this.container.querySelectorAll('.select-template-btn');
        selectButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(btn.dataset.templateIndex);
                this.selectTemplate(index);
            });
        });
        
        const cards = this.container.querySelectorAll('.template-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button') && !e.target.closest('a')) {
                    const index = parseInt(card.dataset.templateIndex);
                    this.toggleCardExpansion(card);
                }
            });
        });
    }
    
    selectTemplate(index) {
        const templateData = this.templates[index];
        if (templateData) {
            this.selectedTemplateId = templateData.template.id;
            this.render();
            
            // Emit selection event
            eventManager.emit('template:selected', {
                template: templateData.template,
                usageCount: templateData.count,
                papers: templateData.papers
            });
        }
    }
    
    toggleCardExpansion(card) {
        card.classList.toggle('expanded');
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getSelectedTemplate() {
        return this.templates.find(t => t.template.id === this.selectedTemplateId);
    }
    
    destroy() {
        this.container = null;
        this.templates = [];
        this.selectedTemplateId = null;
    }
}
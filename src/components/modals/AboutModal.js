// ================================
// src/components/modals/AboutModal.js - Enhanced Version
// ================================

import { BaseModal } from './BaseModal.js';

export class AboutModal extends BaseModal {
    constructor(options = {}) {
        super({
            title: '', // Custom header
            size: 'medium',
            className: 'about-modal interactive-modal',
            ...options
        });
        
        this.animationTimer = null;
    }
    
    renderHeader() {
        // Custom header with logo
        return `
            <div class="modal-header-custom">
                <div class="modal-header-left">
                    <img src="../../assets/icons/icon128.png" alt="ORKG Logo" class="modal-logo" />
                    <div class="modal-title-group">
                        <h3 class="modal-title">About ORKG Annotator</h3>
                        <p class="modal-subtitle">Version 2.0.0</p>
                    </div>
                </div>
                <div class="modal-controls">
                    ${this.options.closable ? `
                        <button class="modal-control close-btn" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    renderContent() {
        return `
            <div class="about-content">
                <!-- Main Description -->
                <div class="about-intro">
                    <p class="intro-text">
                        The <strong>ORKG Annotator</strong> is a powerful Chrome extension that helps researchers 
                        contribute to the <strong>Open Research Knowledge Graph</strong> by extracting and structuring 
                        information from research papers using cutting-edge AI technology.
                    </p>
                    <p class="intro-subtitle">
                        Transform unstructured research papers into structured, reusable knowledge with just a few clicks.
                    </p>
                </div>

                <!-- Features Section -->
                <div class="features-section">
                    <h4 class="section-title">
                        <i class="fas fa-star"></i>
                        Key Features
                    </h4>
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <div class="feature-content">
                                <h5 class="feature-title">Smart Extraction</h5>
                                <p class="feature-description">Automatically extract paper metadata and bibliographic information</p>
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-brain"></i>
                            </div>
                            <div class="feature-content">
                                <h5 class="feature-title">AI-Powered</h5>
                                <p class="feature-description">Advanced machine learning for intelligent content analysis</p>
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-puzzle-piece"></i>
                            </div>
                            <div class="feature-content">
                                <h5 class="feature-title">Problem Discovery</h5>
                                <p class="feature-description">Find similar research problems and generate new insights</p>
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-clipboard-list"></i>
                            </div>
                            <div class="feature-content">
                                <h5 class="feature-title">Template Matching</h5>
                                <p class="feature-description">Select the most appropriate annotation template</p>
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-database"></i>
                            </div>
                            <div class="feature-content">
                                <h5 class="feature-title">ORKG Integration</h5>
                                <p class="feature-description">Direct connection to the Open Research Knowledge Graph</p>
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-microscope"></i>
                            </div>
                            <div class="feature-content">
                                <h5 class="feature-title">Content Analysis</h5>
                                <p class="feature-description">Extract structured information and research contributions</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Credits Section -->
                <div class="credits-section">
                    <h4 class="section-title">
                        <i class="fas fa-award"></i>
                        Developed By
                    </h4>
                    <div class="organization-card">
                        <div class="org-logo">
                            <img src="../../assets/icons/TIB.png" alt="TIB Logo" />
                        </div>
                        <div class="org-info">
                            <h5>TIB Leibniz Information Centre</h5>
                            <p>for Science and Technology</p>
                        </div>
                    </div>
                    <p class="credits-text">
                        Part of the Open Research Knowledge Graph initiative to transform scholarly 
                        communication through semantic technologies and make research more accessible, 
                        reproducible, and reusable.
                    </p>
                </div>

                <!-- Links Section -->
                <div class="links-section">
                    <a href="https://orkg.org" target="_blank" rel="noopener noreferrer" class="link-card">
                        <i class="fas fa-globe"></i>
                        <span>Visit ORKG</span>
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <a href="https://www.tib.eu" target="_blank" rel="noopener noreferrer" class="link-card">
                        <i class="fas fa-university"></i>
                        <span>Visit TIB</span>
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <a href="https://gitlab.com/TIBHannover/orkg/orkg-frontend" target="_blank" rel="noopener noreferrer" class="link-card">
                        <i class="fab fa-gitlab"></i>
                        <span>Source Code</span>
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                    <a href="https://orkg.org/help" target="_blank" rel="noopener noreferrer" class="link-card">
                        <i class="fas fa-question-circle"></i>
                        <span>Get Help</span>
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>

                <!-- Footer -->
                <div class="about-footer">
                    <div class="footer-stats">
                        <div class="stat">
                            <span class="stat-value">5</span>
                            <span class="stat-label">Analysis Steps</span>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="stat">
                            <span class="stat-value">10+</span>
                            <span class="stat-label">Data Sources</span>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="stat">
                            <span class="stat-value">AI</span>
                            <span class="stat-label">Enhanced</span>
                        </div>
                    </div>
                    <p class="footer-info">
                        Version 2.0.0 • Build ${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')} • MIT License
                    </p>
                </div>
            </div>
        `;
    }
    
    open() {
        super.open();
        
        // Add entrance animations
        setTimeout(() => {
            this.animateEntrance();
        }, 100);
    }
    
    animateEntrance() {
        // Animate feature cards
        const cards = this.modal?.querySelectorAll('.feature-card');
        cards?.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animated-in');
            }, index * 100);
        });
        
        // Animate link cards
        const links = this.modal?.querySelectorAll('.link-card');
        links?.forEach((link, index) => {
            setTimeout(() => {
                link.classList.add('animated-in');
            }, 600 + index * 50);
        });
        
        // Animate stats
        const stats = this.modal?.querySelectorAll('.stat');
        stats?.forEach((stat, index) => {
            setTimeout(() => {
                stat.classList.add('animated-in');
            }, 800 + index * 100);
        });
    }
}
// src/components/modals/ModalTemplates.js

export const AboutModalTemplate = `
<div id="about-modal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="about-modal-title">
    <div class="modal-content">
        <div class="modal-header">
            <h2 id="about-modal-title">
                <i class="fas fa-brain" aria-hidden="true"></i>
                ORKG Annotator v2.0
            </h2>
            <button id="about-modal-close" class="modal-close-btn" aria-label="Close about dialog">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        </div>
        <div class="modal-body">
            <div class="about-content">
                <div class="about-section">
                    <h3>🚀 AI-Powered Research Analysis</h3>
                    <p>The ORKG Annotator is a powerful Chrome extension that leverages artificial intelligence and the Open Research Knowledge Graph to help researchers analyze, annotate, and structure academic papers automatically.</p>
                </div>
                
                <div class="about-section">
                    <h3>✨ Key Features</h3>
                    <ul class="feature-list">
                        <li><i class="fas fa-magic" aria-hidden="true"></i> <strong>Smart Metadata Extraction:</strong> Automatically extracts paper information from trusted sources</li>
                        <li><i class="fas fa-tags" aria-hidden="true"></i> <strong>AI Field Classification:</strong> Intelligent research field identification using NLP</li>
                        <li><i class="fas fa-search-plus" aria-hidden="true"></i> <strong>Problem Discovery:</strong> Finds similar research problems with parallel processing</li>
                        <li><i class="fas fa-clipboard-list" aria-hidden="true"></i> <strong>Template Matching:</strong> Selects the most appropriate annotation template</li>
                        <li><i class="fas fa-chart-line" aria-hidden="true"></i> <strong>Content Analysis:</strong> Extracts structured information from paper content</li>
                    </ul>
                </div>
                
                <div class="about-section">
                    <h3>🏛️ Open Research Knowledge Graph</h3>
                    <p>The ORKG is a collaborative platform for organizing research knowledge in a structured, machine-readable format. It aims to make scientific knowledge more discoverable, comparable, and reusable.</p>
                </div>
                
                <div class="about-section">
                    <h3>🏢 Developed by TIB Hannover</h3>
                    <p>This extension is developed and maintained by the <strong>TIB – Leibniz Information Centre for Science and Technology</strong>, one of the world's largest specialized libraries for science and technology.</p>
                    <div class="contact-info">
                        <p><strong>Contact:</strong> orkg@tib.eu</p>
                        <p><strong>Website:</strong> <a href="https://orkg.org" target="_blank" rel="noopener noreferrer">orkg.org</a></p>
                        <p><strong>GitHub:</strong> <a href="https://github.com/TIBHannover/orkg-annotator-v2" target="_blank" rel="noopener noreferrer">View Source Code</a></p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

export const HelpModalTemplate = `
<div id="help-modal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="help-modal-title">
    <div class="modal-content help-modal">
        <div class="modal-header">
            <h2 id="help-modal-title">
                <i class="fas fa-question-circle" aria-hidden="true"></i>
                How to Use ORKG Annotator
            </h2>
            <button id="help-modal-close" class="modal-close-btn" aria-label="Close help dialog">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        </div>
        <div class="modal-body">
            <div class="help-content">
                <div class="help-intro">
                    <p>Follow these 5 simple steps to analyze and annotate research papers:</p>
                </div>
                
                <div class="help-steps">
                    <div class="help-step-item" data-step="2">
                        <div class="step-icon">
                            <i class="fas fa-tags" aria-hidden="true"></i>
                            <span class="step-number">2</span>
                        </div>
                        <div class="help-step-content">
                            <h3>Research Field</h3>
                            <p>AI analyzes the paper content to automatically classify it into the most appropriate research field from the ORKG taxonomy.</p>
                            <div class="help-step-tips">
                                <strong>Tips:</strong>
                                <ul>
                                    <li>Multiple fields may be suggested if the paper is interdisciplinary</li>
                                    <li>You can manually select a different field if needed</li>
                                    <li>The classification affects template recommendations</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="help-step-item" data-step="3">
                        <div class="step-icon">
                            <i class="fas fa-lightbulb" aria-hidden="true"></i>
                            <span class="step-number">3</span>
                        </div>
                        <div class="help-step-content">
                            <h3>Research Problem</h3>
                            <p>The system identifies the main research problem and finds similar problems from the ORKG database using advanced similarity matching.</p>
                            <div class="help-step-tips">
                                <strong>Tips:</strong>
                                <ul>
                                    <li>Similar problems help contextualize your research</li>
                                    <li>You can edit the AI-generated problem description</li>
                                    <li>Similarity scores indicate how closely related problems are</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="help-step-item" data-step="4">
                        <div class="step-icon">
                            <i class="fas fa-clipboard-list" aria-hidden="true"></i>
                            <span class="step-number">4</span>
                        </div>
                        <div class="help-step-content">
                            <h3>Annotation Template</h3>
                            <p>Based on the research field and problem, the system recommends the most appropriate annotation template for structured data extraction.</p>
                            <div class="help-step-tips">
                                <strong>Tips:</strong>
                                <ul>
                                    <li>Templates define what properties to extract</li>
                                    <li>You can create custom templates if needed</li>
                                    <li>Templates are reusable across similar papers</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="help-step-item" data-step="5">
                        <div class="step-icon">
                            <i class="fas fa-chart-line" aria-hidden="true"></i>
                            <span class="step-number">5</span>
                        </div>
                        <div class="help-step-content">
                            <h3>Content Analysis</h3>
                            <p>The final step extracts structured information from the paper content based on the selected template, creating a comprehensive annotation.</p>
                            <div class="help-step-tips">
                                <strong>Tips:</strong>
                                <ul>
                                    <li>Results can be exported to ORKG</li>
                                    <li>You can edit extracted properties before saving</li>
                                    <li>Annotations help make papers more discoverable</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="help-navigation">
                    <button id="help-demo-btn" class="demo-btn" aria-label="Start interactive demonstration">
                        <i class="fas fa-play" aria-hidden="true"></i>
                        Try Interactive Demo
                    </button>
                    <p class="help-note">Click "Try Interactive Demo" to see a guided walkthrough of the annotation process.</p>
                </div>
            </div>
        </div>
    </div>
</div>
`;

export const LoadingOverlayTemplate = `
<div class="loading-backdrop"></div>
<div class="loading-content">
    <div class="loading-spinner" aria-hidden="true"></div>
    <div class="loading-text" id="loading-title">Processing...</div>
    <div class="loading-subtext">Please wait while we prepare your analysis</div>
    <div class="loading-progress" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
        <div class="loading-progress-fill"></div>
    </div>
</div>
`;

export default {
    AboutModalTemplate,
    HelpModalTemplate,
    LoadingOverlayTemplate
};
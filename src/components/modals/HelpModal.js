// ================================
// src/components/modals/HelpModal.js - Enhanced Interactive Version
// ================================

import { BaseModal } from './BaseModal.js';

export class HelpModal extends BaseModal {
    constructor(options = {}) {
        super({
            title: '',  // Custom header
            size: 'large',
            className: 'help-modal interactive-modal',
            ...options
        });
        
        // Interactive journey state
        this.journeyState = {
            currentStep: 0,
            isPlaying: false,
            isPaused: false,
            interval: null,
            stepDuration: 5000, // 5 seconds per step
            totalSteps: 5
        };
        
        // Tab state
        this.currentTab = 'getting-started';
        this.ragSteps = 0;
    }
    
    renderHeader() {
        // Custom header with logo
        return `
            <div class="modal-header-custom">
                <div class="modal-header-left">
                    <img src="../../assets/icons/icon128.png" alt="ORKG Logo" class="modal-logo" />
                    <div class="modal-title-group">
                        <h3 class="modal-title">Help & Documentation</h3>
                        <p class="modal-subtitle">Interactive Guide to ORKG Annotator</p>
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
            <div class="help-content">
                <!-- Tab Navigation -->
                <div class="help-tabs">
                    <button class="help-tab active" data-tab="getting-started">
                        <i class="fas fa-rocket"></i>
                        <span>Getting Started</span>
                    </button>
                    <button class="help-tab" data-tab="workflow">
                        <i class="fas fa-stream"></i>
                        <span>Workflow Journey</span>
                    </button>
                    <button class="help-tab" data-tab="rag-analysis">
                        <i class="fas fa-brain"></i>
                        <span>RAG Analysis</span>
                    </button>
                    <button class="help-tab" data-tab="troubleshooting">
                        <i class="fas fa-tools"></i>
                        <span>Troubleshooting</span>
                    </button>
                </div>

                <!-- Tab Contents -->
                <div class="help-tab-contents">
                    
                    <!-- Getting Started Tab -->
                    <div class="tab-content active" id="getting-started">
                        <div class="interactive-section">
                            <!-- Controls -->
                            <div class="journey-controls">
                                <button class="control-btn" id="gs-play">
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="control-btn" id="gs-pause" style="display:none;">
                                    <i class="fas fa-pause"></i>
                                </button>
                                <button class="control-btn" id="gs-stop">
                                    <i class="fas fa-stop"></i>
                                </button>
                                <button class="control-btn" id="gs-replay">
                                    <i class="fas fa-redo"></i>
                                </button>
                                <div class="journey-progress">
                                    <div class="progress-track">
                                        <div class="progress-fill" id="gs-progress" style="width: 0%"></div>
                                    </div>
                                    <span class="progress-label">Step <span id="gs-current">1</span> of 4</span>
                                </div>
                            </div>
                            
                            <!-- Steps Display -->
                            <div class="getting-started-display">
                                <div class="gs-step active" data-step="1">
                                    <div class="step-animation">
                                        <div class="animated-browser">
                                            <div class="browser-bar">
                                                <div class="browser-dots">
                                                    <span></span><span></span><span></span>
                                                </div>
                                                <div class="browser-url">https://arxiv.org/paper/...</div>
                                            </div>
                                            <div class="browser-content">
                                                <div class="paper-preview">
                                                    <div class="paper-title-preview"></div>
                                                    <div class="paper-text-preview"></div>
                                                    <div class="paper-text-preview"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="step-info">
                                        <h3><span class="step-number">1</span> Navigate to Paper</h3>
                                        <p>Open any academic paper in HTML format in your browser. The extension works best with papers from publishers like arXiv, PubMed, IEEE, ACM, and Springer.</p>
                                        <div class="step-tip">
                                            <i class="fas fa-lightbulb"></i>
                                            <span>Tip: Make sure the paper is in HTML format, not PDF</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="gs-step" data-step="2">
                                    <div class="step-animation">
                                        <div class="animated-toolbar">
                                            <div class="extension-icon-animated pulse">
                                                <img src="../../assets/icons/icon128.png" alt="ORKG" />
                                            </div>
                                            <div class="click-indicator">
                                                <i class="fas fa-mouse-pointer"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="step-info">
                                        <h3><span class="step-number">2</span> Open Extension</h3>
                                        <p>Click the ORKG Annotator icon in your browser toolbar. The extension will automatically start analyzing the page.</p>
                                        <div class="step-tip">
                                            <i class="fas fa-lightbulb"></i>
                                            <span>Tip: Pin the extension for easy access</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="gs-step" data-step="3">
                                    <div class="step-animation">
                                        <div class="quality-check-animation">
                                            <div class="check-item" data-delay="0">
                                                <div class="check-icon"><i class="fas fa-check"></i></div>
                                                <span>Page Format</span>
                                            </div>
                                            <div class="check-item" data-delay="500">
                                                <div class="check-icon"><i class="fas fa-check"></i></div>
                                                <span>Content Structure</span>
                                            </div>
                                            <div class="check-item" data-delay="1000">
                                                <div class="check-icon"><i class="fas fa-check"></i></div>
                                                <span>Metadata</span>
                                            </div>
                                            <div class="check-item" data-delay="1500">
                                                <div class="check-icon"><i class="fas fa-check"></i></div>
                                                <span>Academic Content</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="step-info">
                                        <h3><span class="step-number">3</span> Quality Check</h3>
                                        <p>The extension automatically assesses the page quality across multiple criteria to ensure successful extraction.</p>
                                        <div class="quality-criteria-card">
                                            <div class="criteria-item">
                                                <i class="fas fa-check-circle success"></i>
                                                <span><strong>Format:</strong> HTML accessibility</span>
                                            </div>
                                            <div class="criteria-item">
                                                <i class="fas fa-check-circle success"></i>
                                                <span><strong>Structure:</strong> DOI & keywords</span>
                                            </div>
                                            <div class="criteria-item">
                                                <i class="fas fa-exclamation-circle warning"></i>
                                                <span><strong>Metadata:</strong> Title & authors</span>
                                            </div>
                                            <div class="criteria-item">
                                                <i class="fas fa-info-circle info"></i>
                                                <span><strong>Content:</strong> Publisher recognition</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="gs-step" data-step="4">
                                    <div class="step-animation">
                                        <div class="start-button-animation">
                                            <button class="animated-start-btn">
                                                <i class="fas fa-play"></i>
                                                <span>Start Analysis</span>
                                            </button>
                                            <div class="success-checkmark" style="display:none;">
                                                <i class="fas fa-check-circle"></i>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="step-info">
                                        <h3><span class="step-number">4</span> Start Analysis</h3>
                                        <p>Click the "Start Analysis" button to begin the annotation process. The extension will guide you through each step.</p>
                                        <div class="step-tip">
                                            <i class="fas fa-lightbulb"></i>
                                            <span>Tip: You can save your progress and continue later</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Workflow Journey Tab -->
                    <div class="tab-content" id="workflow">
                        <div class="workflow-journey">
                            <!-- Journey Controls -->
                            <div class="journey-controls">
                                <button class="control-btn" id="wf-play">
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="control-btn" id="wf-pause" style="display:none;">
                                    <i class="fas fa-pause"></i>
                                </button>
                                <button class="control-btn" id="wf-stop">
                                    <i class="fas fa-stop"></i>
                                </button>
                                <button class="control-btn" id="wf-replay">
                                    <i class="fas fa-redo"></i>
                                </button>
                                <div class="journey-timeline">
                                    <div class="timeline-step active" data-step="1">
                                        <span class="timeline-dot"></span>
                                        <span class="timeline-label">Metadata</span>
                                    </div>
                                    <div class="timeline-connector"></div>
                                    <div class="timeline-step" data-step="2">
                                        <span class="timeline-dot"></span>
                                        <span class="timeline-label">Field</span>
                                    </div>
                                    <div class="timeline-connector"></div>
                                    <div class="timeline-step" data-step="3">
                                        <span class="timeline-dot"></span>
                                        <span class="timeline-label">Problem</span>
                                    </div>
                                    <div class="timeline-connector"></div>
                                    <div class="timeline-step" data-step="4">
                                        <span class="timeline-dot"></span>
                                        <span class="timeline-label">Template</span>
                                    </div>
                                    <div class="timeline-connector"></div>
                                    <div class="timeline-step" data-step="5">
                                        <span class="timeline-dot"></span>
                                        <span class="timeline-label">Analysis</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Steps Content -->
                            <div class="workflow-steps-container">
                                <div class="workflow-step active" data-step="1">
                                    <div class="step-card">
                                        <div class="step-icon-container">
                                            <i class="fas fa-file-alt"></i>
                                        </div>
                                        <div class="step-content">
                                            <h3>Step 1: Metadata Extraction</h3>
                                            <p>Automatically extracts paper metadata from multiple trusted sources.</p>
                                            <ul class="step-features">
                                                <li><i class="fas fa-check"></i> Title and authors extraction</li>
                                                <li><i class="fas fa-check"></i> DOI and publication details</li>
                                                <li><i class="fas fa-check"></i> Abstract and keywords</li>
                                                <li><i class="fas fa-check"></i> CrossRef & OpenAlex integration</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="workflow-step" data-step="2">
                                    <div class="step-card">
                                        <div class="step-icon-container">
                                            <i class="fas fa-tags"></i>
                                        </div>
                                        <div class="step-content">
                                            <h3>Step 2: Research Field Classification</h3>
                                            <p>AI-powered classification to identify the paper's research domain.</p>
                                            <ul class="step-features">
                                                <li><i class="fas fa-check"></i> Automatic field detection</li>
                                                <li><i class="fas fa-check"></i> ORKG taxonomy matching</li>
                                                <li><i class="fas fa-check"></i> Manual selection option</li>
                                                <li><i class="fas fa-check"></i> Confidence scoring</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="workflow-step" data-step="3">
                                    <div class="step-card">
                                        <div class="step-icon-container">
                                            <i class="fas fa-puzzle-piece"></i>
                                        </div>
                                        <div class="step-content">
                                            <h3>Step 3: Problem Analysis</h3>
                                            <p>Identifies research problems using advanced embedding analysis.</p>
                                            <ul class="step-features">
                                                <li><i class="fas fa-check"></i> AI-generated problem statement</li>
                                                <li><i class="fas fa-check"></i> Similar problems discovery</li>
                                                <li><i class="fas fa-check"></i> ORKG database matching</li>
                                                <li><i class="fas fa-check"></i> Similarity threshold filtering</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="workflow-step" data-step="4">
                                    <div class="step-card">
                                        <div class="step-icon-container">
                                            <i class="fas fa-clipboard-list"></i>
                                        </div>
                                        <div class="step-content">
                                            <h3>Step 4: Template Selection</h3>
                                            <p>Choose or create the appropriate template for annotation.</p>
                                            <ul class="step-features">
                                                <li><i class="fas fa-check"></i> Template recommendations</li>
                                                <li><i class="fas fa-check"></i> Custom template creation</li>
                                                <li><i class="fas fa-check"></i> Property management</li>
                                                <li><i class="fas fa-check"></i> Template reusability</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="workflow-step" data-step="5">
                                    <div class="step-card">
                                        <div class="step-icon-container">
                                            <i class="fas fa-microscope"></i>
                                        </div>
                                        <div class="step-content">
                                            <h3>Step 5: Content Analysis</h3>
                                            <p>Extract and structure paper content using AI and templates.</p>
                                            <ul class="step-features">
                                                <li><i class="fas fa-check"></i> Multi-modal extraction</li>
                                                <li><i class="fas fa-check"></i> Property-value mapping</li>
                                                <li><i class="fas fa-check"></i> Triple generation</li>
                                                <li><i class="fas fa-check"></i> ORKG contribution creation</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- RAG Analysis Tab -->
                    <div class="tab-content" id="rag-analysis">
                        <div class="rag-section">
                            <!-- Controls -->
                            <div class="journey-controls">
                                <button class="control-btn" id="rag-play">
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="control-btn" id="rag-pause" style="display:none;">
                                    <i class="fas fa-pause"></i>
                                </button>
                                <button class="control-btn" id="rag-stop">
                                    <i class="fas fa-stop"></i>
                                </button>
                                <button class="control-btn" id="rag-replay">
                                    <i class="fas fa-redo"></i>
                                </button>
                                <div class="journey-progress">
                                    <div class="progress-track">
                                        <div class="progress-fill" id="rag-progress" style="width: 0%"></div>
                                    </div>
                                    <span class="progress-label">Step <span id="rag-current">1</span> of 8</span>
                                </div>
                            </div>
                            
                            <!-- RAG Process Display -->
                            <div class="rag-process-display">
                                <div class="rag-intro">
                                    <h3>RAG (Retrieval-Augmented Generation) Analysis</h3>
                                    <p>Advanced AI-powered content extraction using template properties to automatically identify and extract relevant information from research papers.</p>
                                </div>
                                
                                <div class="rag-steps-container">
                                    <div class="rag-step active" data-step="1">
                                        <div class="rag-visual">
                                            <div class="document-sections">
                                                <div class="section-block abstract">Abstract</div>
                                                <div class="section-block intro">Introduction</div>
                                                <div class="section-block methods">Methods</div>
                                                <div class="section-block results">Results</div>
                                            </div>
                                        </div>
                                        <div class="rag-info">
                                            <h4><span class="step-badge">1</span> Section Extraction</h4>
                                            <p>The paper is intelligently divided into logical sections for targeted analysis.</p>
                                            <div class="code-example">
                                                <code>sections = extractSections(paperContent)</code>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="rag-step" data-step="2">
                                        <div class="rag-visual">
                                            <div class="template-matching">
                                                <div class="template-icon"><i class="fas fa-clipboard-list"></i></div>
                                                <div class="arrow-flow"><i class="fas fa-arrow-right"></i></div>
                                                <div class="properties-list">
                                                    <div class="property-item">Research Method</div>
                                                    <div class="property-item">Dataset</div>
                                                    <div class="property-item">Results</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="rag-info">
                                            <h4><span class="step-badge">2</span> Template Matching</h4>
                                            <p>Template properties are matched against paper sections to identify extraction targets.</p>
                                            <div class="code-example">
                                                <code>properties = template.getProperties()</code>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="rag-step" data-step="3">
                                        <div class="rag-visual">
                                            <div class="llm-processing">
                                                <div class="brain-icon animated"><i class="fas fa-brain"></i></div>
                                                <div class="processing-waves">
                                                    <span></span>
                                                    <span></span>
                                                    <span></span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="rag-info">
                                            <h4><span class="step-badge">3</span> LLM Processing</h4>
                                            <p>Large Language Model analyzes sections to extract specific property values with high accuracy.</p>
                                            <div class="code-example">
                                                <code>values = LLM.extract(sections, properties)</code>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="rag-step" data-step="4">
                                        <div class="rag-visual">
                                            <div class="result-structure">
                                                <div class="result-item">
                                                    <span class="prop">Method:</span>
                                                    <span class="val">Deep Learning</span>
                                                </div>
                                                <div class="result-item">
                                                    <span class="prop">Dataset:</span>
                                                    <span class="val">ImageNet</span>
                                                </div>
                                                <div class="result-item">
                                                    <span class="prop">Accuracy:</span>
                                                    <span class="val">94.5%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="rag-info">
                                            <h4><span class="step-badge">4</span> Result Structuring</h4>
                                            <p>Extracted values are structured, validated, and prepared for ORKG integration.</p>
                                            <div class="code-example">
                                                <code>results = structure(values, confidence)</code>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="rag-step" data-step="5">
                                        <div class="rag-visual">
                                            <div class="media-extraction">
                                                <div class="extraction-grid">
                                                    <div class="media-item">
                                                        <i class="fas fa-table"></i>
                                                        <span>Tables</span>
                                                    </div>
                                                    <div class="media-item">
                                                        <i class="fas fa-image"></i>
                                                        <span>Figures</span>
                                                    </div>
                                                    <div class="media-item">
                                                        <i class="fas fa-chart-bar"></i>
                                                        <span>Charts</span>
                                                    </div>
                                                    <div class="media-item">
                                                        <i class="fas fa-project-diagram"></i>
                                                        <span>Diagrams</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="rag-info">
                                            <h4><span class="step-badge">5</span> Extract Tables & Images</h4>
                                            <p>Automatically identifies and extracts all tables, figures, charts, and diagrams from the paper with their captions and context.</p>
                                            <div class="code-example">
                                                <code>media = extractMediaContent(document)</code>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="rag-step" data-step="6">
                                        <div class="rag-visual">
                                            <div class="navigator-window">
                                                <div class="nav-header">
                                                    <i class="fas fa-clipboard"></i>
                                                    <span style="font-size: 10px;">Paper Analysis Results</span>
                                                </div>
                                                <div class="nav-tabs">
                                                    <span class="nav-tab active"><i class="fas fa-file-alt"></i></span>
                                                    <span class="nav-tab"><i class="fas fa-image"></i></span>
                                                    <span class="nav-tab"><i class="fas fa-table"></i></span>
                                                </div>
                                                <div class="nav-content">
                                                    <div class="highlight-marker" style="background: #FFE4B5;"></div>
                                                    <div class="highlight-marker" style="background: #E6E6FA;"></div>
                                                    <div class="highlight-marker" style="background: #F0E68C;"></div>
                                                    <div class="marker-icon"><i class="fas fa-map-marker-alt"></i></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="rag-info">
                                            <h4><span class="step-badge">6</span> Data Navigator Interface</h4>
                                            <p>A floating window displays all extracted content with interactive navigation. Click any item to jump to its location in the document with visual highlights and markers.</p>
                                            <div class="code-example">
                                                <code>navigator.show(highlights, markers)</code>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="rag-step" data-step="7">
                                        <div class="rag-visual">
                                            <div class="manual-highlight-demo">
                                                <div class="text-selection">
                                                    <span class="selected-text">Selected text...</span>
                                                    <div class="context-menu">
                                                        <div class="menu-item">
                                                            <i class="fas fa-highlighter"></i>
                                                            <span>Highlight with ORKG</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="property-popup">
                                                    <div class="popup-header" style="background: linear-gradient(135deg, #e86161, #ca7c7c);">
                                                        <span>Select Property</span>
                                                    </div>
                                                    <div class="popup-content">
                                                        <div class="ai-suggestion" style="background: #d4edda;">
                                                            <i class="fas fa-robot"></i> Research Method
                                                        </div>
                                                        <div class="orkg-property">
                                                            <i class="fas fa-tag"></i> has dataset
                                                        </div>
                                                        <div class="color-picker">
                                                            <span class="color-dot" style="background: #FFE4B5;"></span>
                                                            <span class="color-dot" style="background: #E6E6FA;"></span>
                                                            <span class="color-dot" style="background: #F0E68C;"></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="rag-info">
                                            <h4><span class="step-badge">7</span> Manual Text Highlighting</h4>
                                            <p>Select any text and right-click to manually highlight with ORKG properties. AI suggests relevant properties, or choose from ORKG database with custom color coding.</p>
                                            <div class="code-example">
                                                <code>highlighter.addManualHighlight(selection)</code>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="rag-step" data-step="8">
                                        <div class="rag-visual">
                                            <div class="data-transfer">
                                                <div class="marked-content">
                                                    <div class="content-item text-item">
                                                        <i class="fas fa-file-alt"></i>
                                                        <span class="marker-indicator"></span>
                                                    </div>
                                                    <div class="content-item image-item">
                                                        <i class="fas fa-image"></i>
                                                        <span class="marker-indicator"></span>
                                                    </div>
                                                    <div class="content-item table-item">
                                                        <i class="fas fa-table"></i>
                                                        <span class="marker-indicator"></span>
                                                    </div>
                                                </div>
                                                <div class="transfer-arrow animated">
                                                    <i class="fas fa-arrow-right"></i>
                                                </div>
                                                <div class="extension-panel">
                                                    <div class="panel-header">
                                                        <i class="fas fa-check-circle"></i>
                                                        <span>Review & Validate</span>
                                                    </div>
                                                    <div class="panel-content">
                                                        <div class="validation-item">✓ Text Properties</div>
                                                        <div class="validation-item">✓ Images</div>
                                                        <div class="validation-item">✓ Tables</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="rag-info">
                                            <h4><span class="step-badge">8</span> Send to Extension</h4>
                                            <p>All marked content (text highlights, images, tables) is sent to the extension for final review and validation before creating the ORKG contribution.</p>
                                            <div class="code-example">
                                                <code>extension.submitMarkedData(allContent)</code>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Troubleshooting Tab -->
                    <div class="tab-content" id="troubleshooting">
                        <div class="troubleshooting-section">
                            <div class="trouble-header">
                                <h3>Common Issues & Solutions</h3>
                                <p>Click on any issue below to see the solution</p>
                            </div>
                            
                            <div class="trouble-accordion">
                                <div class="trouble-item">
                                    <div class="trouble-question">
                                        <i class="fas fa-exclamation-triangle warning"></i>
                                        <span>Page quality too low</span>
                                        <i class="fas fa-chevron-down arrow"></i>
                                    </div>
                                    <div class="trouble-answer">
                                        <p>This usually occurs when the page doesn't meet the minimum requirements. Try:</p>
                                        <ul>
                                            <li>Refreshing the page and waiting for complete load</li>
                                            <li>Finding the HTML version instead of PDF</li>
                                            <li>Checking if authentication is required</li>
                                            <li>Disabling ad blockers temporarily</li>
                                            <li>Using a different browser (Chrome recommended)</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="trouble-item">
                                    <div class="trouble-question">
                                        <i class="fas fa-times-circle error"></i>
                                        <span>Validation failed</span>
                                        <i class="fas fa-chevron-down arrow"></i>
                                    </div>
                                    <div class="trouble-answer">
                                        <p>Validation errors can have multiple causes:</p>
                                        <ul>
                                            <li>Check your internet connection stability</li>
                                            <li>Verify the page is actually a research paper</li>
                                            <li>Ensure cookies are enabled for the website</li>
                                            <li>Clear browser cache and cookies</li>
                                            <li>Check if the paper requires institutional access</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="trouble-item">
                                    <div class="trouble-question">
                                        <i class="fas fa-spinner info"></i>
                                        <span>Extension not responding</span>
                                        <i class="fas fa-chevron-down arrow"></i>
                                    </div>
                                    <div class="trouble-answer">
                                        <p>If the extension becomes unresponsive:</p>
                                        <ul>
                                            <li>Close and reopen the extension popup</li>
                                            <li>Refresh the current page</li>
                                            <li>Restart your browser completely</li>
                                            <li>Check for extension updates in browser settings</li>
                                            <li>Reinstall the extension if issues persist</li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="trouble-item">
                                    <div class="trouble-question">
                                        <i class="fas fa-ban error"></i>
                                        <span>API errors or rate limiting</span>
                                        <i class="fas fa-chevron-down arrow"></i>
                                    </div>
                                    <div class="trouble-answer">
                                        <p>API-related issues and solutions:</p>
                                        <ul>
                                            <li>Check ORKG service status at status.orkg.org</li>
                                            <li>Verify your API key configuration in settings</li>
                                            <li>Wait 5-10 minutes if rate limited</li>
                                            <li>Reduce request frequency</li>
                                            <li>Contact support for persistent issues</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="support-card">
                                <h4><i class="fas fa-life-ring"></i> Need More Help?</h4>
                                <p>If you're still experiencing issues, we're here to help!</p>
                                <div class="support-actions">
                                    <a href="https://orkg.org/help" target="_blank" class="support-btn">
                                        <i class="fas fa-book"></i>
                                        Documentation
                                    </a>
                                    <a href="mailto:support@orkg.org" class="support-btn">
                                        <i class="fas fa-envelope"></i>
                                        Email Support
                                    </a>
                                    <a href="https://gitlab.com/TIBHannover/orkg" target="_blank" class="support-btn">
                                        <i class="fas fa-bug"></i>
                                        Report Issue
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    open() {
        super.open();
        setTimeout(() => {
            this.setupInteractions();
        }, 100);
    }
    
    setupInteractions() {
        // Tab switching
        this.setupTabs();
        
        // Interactive journeys
        this.setupGettingStartedJourney();
        this.setupWorkflowJourney();
        this.setupRAGJourney();
        
        // Troubleshooting accordion
        this.setupAccordion();
    }
    
    setupTabs() {
        const tabs = this.modal?.querySelectorAll('.help-tab');
        const contents = this.modal?.querySelectorAll('.tab-content');
        
        tabs?.forEach(tab => {
            tab.addEventListener('click', () => {
                // Stop any running animations
                this.stopAllJourneys();
                
                // Update active states
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const tabId = tab.dataset.tab;
                const content = this.modal?.querySelector(`#${tabId}`);
                content?.classList.add('active');
            });
        });
    }
    
    setupGettingStartedJourney() {
        const playBtn = this.modal?.querySelector('#gs-play');
        const pauseBtn = this.modal?.querySelector('#gs-pause');
        const stopBtn = this.modal?.querySelector('#gs-stop');
        const replayBtn = this.modal?.querySelector('#gs-replay');
        const steps = this.modal?.querySelectorAll('.gs-step');
        const progressBar = this.modal?.querySelector('#gs-progress');
        const currentText = this.modal?.querySelector('#gs-current');
        
        let currentStep = 0;
        let interval = null;
        
        const showStep = (index) => {
            steps?.forEach(s => s.classList.remove('active'));
            steps[index]?.classList.add('active');
            if (currentText) currentText.textContent = index + 1;
            if (progressBar) progressBar.style.width = `${((index + 1) / 4) * 100}%`;
            
            // Trigger step animations
            const checkItems = steps[index]?.querySelectorAll('.check-item');
            checkItems?.forEach((item, i) => {
                setTimeout(() => {
                    item.classList.add('checked');
                }, parseInt(item.dataset.delay) || (i * 500));
            });
        };
        
        playBtn?.addEventListener('click', () => {
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
            
            interval = setInterval(() => {
                currentStep = (currentStep + 1) % 4;
                showStep(currentStep);
            }, 5000);
        });
        
        pauseBtn?.addEventListener('click', () => {
            pauseBtn.style.display = 'none';
            playBtn.style.display = 'block';
            clearInterval(interval);
        });
        
        stopBtn?.addEventListener('click', () => {
            clearInterval(interval);
            currentStep = 0;
            showStep(0);
            pauseBtn.style.display = 'none';
            playBtn.style.display = 'block';
        });
        
        replayBtn?.addEventListener('click', () => {
            stopBtn.click();
            setTimeout(() => playBtn.click(), 100);
        });
    }
    
    setupWorkflowJourney() {
        const playBtn = this.modal?.querySelector('#wf-play');
        const pauseBtn = this.modal?.querySelector('#wf-pause');
        const stopBtn = this.modal?.querySelector('#wf-stop');
        const replayBtn = this.modal?.querySelector('#wf-replay');
        const steps = this.modal?.querySelectorAll('.workflow-step');
        const timelineSteps = this.modal?.querySelectorAll('.timeline-step');
        
        let currentStep = 0;
        let interval = null;
        
        const showStep = (index) => {
            steps?.forEach(s => s.classList.remove('active'));
            timelineSteps?.forEach(t => t.classList.remove('active', 'completed'));
            
            steps[index]?.classList.add('active');
            
            // Update timeline
            for (let i = 0; i <= index; i++) {
                if (i < index) {
                    timelineSteps[i]?.classList.add('completed');
                } else {
                    timelineSteps[i]?.classList.add('active');
                }
            }
        };
        
        playBtn?.addEventListener('click', () => {
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
            
            interval = setInterval(() => {
                currentStep = (currentStep + 1) % 5;
                showStep(currentStep);
            }, 5000);
        });
        
        pauseBtn?.addEventListener('click', () => {
            pauseBtn.style.display = 'none';
            playBtn.style.display = 'block';
            clearInterval(interval);
        });
        
        stopBtn?.addEventListener('click', () => {
            clearInterval(interval);
            currentStep = 0;
            showStep(0);
            pauseBtn.style.display = 'none';
            playBtn.style.display = 'block';
        });
        
        replayBtn?.addEventListener('click', () => {
            stopBtn.click();
            setTimeout(() => playBtn.click(), 100);
        });
    }
    
    setupRAGJourney() {
        const playBtn = this.modal?.querySelector('#rag-play');
        const pauseBtn = this.modal?.querySelector('#rag-pause');
        const stopBtn = this.modal?.querySelector('#rag-stop');
        const replayBtn = this.modal?.querySelector('#rag-replay');
        const steps = this.modal?.querySelectorAll('.rag-step');
        const progressBar = this.modal?.querySelector('#rag-progress');
        const currentText = this.modal?.querySelector('#rag-current');
        
        let currentStep = 0;
        let interval = null;
        
        const showStep = (index) => {
            steps?.forEach(s => s.classList.remove('active'));
            steps[index]?.classList.add('active');
            if (currentText) currentText.textContent = index + 1;
            if (progressBar) progressBar.style.width = `${((index + 1) / 8) * 100}%`;
        };
        
        playBtn?.addEventListener('click', () => {
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
            
            interval = setInterval(() => {
                currentStep = (currentStep + 1) % 8;
                showStep(currentStep);
            }, 5000);
        });
        
        pauseBtn?.addEventListener('click', () => {
            pauseBtn.style.display = 'none';
            playBtn.style.display = 'block';
            clearInterval(interval);
        });
        
        stopBtn?.addEventListener('click', () => {
            clearInterval(interval);
            currentStep = 0;
            showStep(0);
            pauseBtn.style.display = 'none';
            playBtn.style.display = 'block';
        });
        
        replayBtn?.addEventListener('click', () => {
            stopBtn.click();
            setTimeout(() => playBtn.click(), 100);
        });
    }
    
    setupAccordion() {
        const items = this.modal?.querySelectorAll('.trouble-item');
        
        items?.forEach(item => {
            const question = item.querySelector('.trouble-question');
            const answer = item.querySelector('.trouble-answer');
            const arrow = item.querySelector('.arrow');
            
            question?.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                
                // Close all items
                items.forEach(i => {
                    i.classList.remove('open');
                    i.querySelector('.trouble-answer').style.maxHeight = '0';
                    i.querySelector('.arrow').style.transform = 'rotate(0deg)';
                });
                
                // Open clicked item if it was closed
                if (!isOpen) {
                    item.classList.add('open');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    arrow.style.transform = 'rotate(180deg)';
                }
            });
        });
    }
    
    stopAllJourneys() {
        // Stop all running intervals
        ['#gs-pause', '#wf-pause', '#rag-pause'].forEach(selector => {
            const btn = this.modal?.querySelector(selector);
            if (btn && btn.style.display !== 'none') {
                btn.click();
            }
        });
    }
    
    close() {
        this.stopAllJourneys();
        super.close();
    }
}
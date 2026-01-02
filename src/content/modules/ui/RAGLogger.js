// ================================
// src/content/modules/RAGAnalysisLogger.js
// ORKG-styled Analysis Logger
// ================================

(function(global) {
    'use strict';
    
    /**
     * RAG Analysis Logger
     * 
     * Displays real-time logs for RAG analysis with ORKG styling
     * Matches the style of ProblemAnalysisLogger but specifically for RAG
     */
    class RAGAnalysisLogger {
        constructor() {
            this.container = null;
            this.logsContainer = null;
            this.logs = [];
            this.maxLogs = 200;
            this.maxDisplayLogs = 50;
            this.isPaused = false;
            this.autoScroll = true;
            this.isHidden = false;
            this.startTime = null;
            this.elapsedInterval = null;
            
            // Performance optimization
            this.renderQueue = [];
            this.renderTimeout = null;
            this.batchSize = 10;
            
            // ORKG Brand colors
            this.ORKG_RED = '#FF6B6B';
            this.ORKG_RED_DARK = '#E85555';
            this.ORKG_RED_LIGHT = '#FF8585';
            
            // Theme detection
            this.currentTheme = this.detectTheme();
        }
        
        /**
         * Detect theme from document or system preference
         */
        detectTheme() {
            // Try to get theme from document
            const docTheme = document.documentElement.getAttribute('data-theme');
            if (docTheme) return docTheme;
            
            // Try to get theme from localStorage
            try {
                const storedTheme = localStorage.getItem('orkg-annotator-theme');
                if (storedTheme) return storedTheme;
            } catch (e) {
                // Ignore localStorage errors
            }
            
            // Fall back to media query
            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            return isDark ? 'dark' : 'light';
        }
        
        /**
         * Render the logger UI
         */
        render() {
            const themeClass = `logger-theme-${this.currentTheme}`;
            const hiddenClass = this.isHidden ? 'logger-hidden' : '';
            
            const html = `
                <div class="rag-analysis-logger ${themeClass} ${hiddenClass}" data-theme="${this.currentTheme}">
                    <div class="logger-header">
                        <div class="logger-title">
                            <i class="fas fa-terminal" style="color: ${this.ORKG_RED};"></i>
                            <h4>RAG Analysis Progress</h4>
                        </div>
                        <div class="logger-controls">
                            <button class="logger-btn" id="clear-rag-logs-btn" title="Clear logs">
                                <i class="fas fa-trash"></i>
                            </button>
                            <button class="logger-btn" id="pause-rag-logs-btn" title="Pause/Resume">
                                <i class="fas ${this.isPaused ? 'fa-play' : 'fa-pause'}"></i>
                            </button>
                            <button class="logger-btn ${this.autoScroll ? 'active' : ''}" id="auto-scroll-rag-btn" title="Auto-scroll">
                                <i class="fas fa-arrow-down"></i>
                            </button>
                            <button class="logger-btn" id="hide-rag-logs-btn" title="Hide/Show Logger">
                                <i class="fas ${this.isHidden ? 'fa-eye' : 'fa-eye-slash'}"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="logger-stats">
                        <div class="stat-item">
                            <i class="fas fa-clock" style="color: ${this.ORKG_RED};"></i>
                            <span id="rag-elapsed-time">00:00</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-list" style="color: ${this.ORKG_RED};"></i>
                            <span id="rag-log-count">${this.logs.length}</span> entries
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-memory" style="color: ${this.ORKG_RED};"></i>
                            <span id="rag-log-performance">Smooth</span>
                        </div>
                    </div>
                    
                    <div class="logs-container ${this.isHidden ? 'hidden' : ''}" id="rag-analysis-logs">
                        ${this.logs.length > 0 ? this.renderInitialLogs() : this.renderWaitingMessage()}
                    </div>
                    
                    ${this.isHidden ? `
                        <div class="logger-minimized-indicator">
                            <i class="fas fa-terminal" style="color: ${this.ORKG_RED};"></i>
                            <span>Logger minimized - ${this.logs.length} entries</span>
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Inject necessary styles
            this.injectStyles();
            
            return html;
        }
        
        /**
         * Inject necessary styles for the logger
         */
        injectStyles() {
            if (document.getElementById('rag-logger-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'rag-logger-styles';
            
            // Match the styles from ProblemAnalysisLogger with ORKG red color
            style.textContent = `
                .rag-analysis-logger {
                    display: flex;
                    flex-direction: column;
                    background: ${this.currentTheme === 'dark' ? '#1f2937' : '#ffffff'};
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    overflow: hidden;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    margin-bottom: 16px;
                }
                
                .rag-analysis-logger .logger-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 15px;
                    background: ${this.currentTheme === 'dark' ? '#111827' : '#f9fafb'};
                    border-bottom: 1px solid ${this.currentTheme === 'dark' ? '#374151' : '#e5e7eb'};
                }
                
                .rag-analysis-logger .logger-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .rag-analysis-logger .logger-title h4 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: ${this.currentTheme === 'dark' ? '#f3f4f6' : '#111827'};
                }
                
                .rag-analysis-logger .logger-controls {
                    display: flex;
                    gap: 8px;
                }
                
                .rag-analysis-logger .logger-btn {
                    background: transparent;
                    border: none;
                    color: ${this.currentTheme === 'dark' ? '#9ca3af' : '#6b7280'};
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                }
                
                .rag-analysis-logger .logger-btn:hover {
                    background: ${this.currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
                }
                
                .rag-analysis-logger .logger-btn.active {
                    color: ${this.ORKG_RED};
                }
                
                .rag-analysis-logger .logger-stats {
                    display: flex;
                    gap: 16px;
                    padding: 8px 15px;
                    background: ${this.currentTheme === 'dark' ? '#1f2937' : 'white'};
                    border-bottom: 1px solid ${this.currentTheme === 'dark' ? '#374151' : '#e5e7eb'};
                    font-size: 12px;
                    color: ${this.currentTheme === 'dark' ? '#9ca3af' : '#6b7280'};
                }
                
                .rag-analysis-logger .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .rag-analysis-logger .logs-container {
                    max-height: 300px;
                    overflow-y: auto;
                    padding: 8px 0;
                    background: ${this.currentTheme === 'dark' ? '#111827' : '#f9fafb'};
                    font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.5;
                }
                
                .rag-analysis-logger .logs-container.scrolling::-webkit-scrollbar-thumb {
                    background: ${this.ORKG_RED} !important;
                }
                
                .rag-analysis-logger .logs-container::-webkit-scrollbar {
                    width: 6px;
                }
                
                .rag-analysis-logger .logs-container::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 3px;
                }
                
                .rag-analysis-logger .logs-container::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 3px;
                }
                
                .rag-analysis-logger .log-entry {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 6px 15px;
                    border-bottom: 1px solid ${this.currentTheme === 'dark' ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)'};
                    animation: logFadeIn 0.3s ease;
                }
                
                .rag-analysis-logger .log-timestamp {
                    color: ${this.currentTheme === 'dark' ? '#6b7280' : '#9ca3af'};
                    font-size: 11px;
                    min-width: 65px;
                    opacity: 0.7;
                }
                
                .rag-analysis-logger .log-icon {
                    min-width: 16px;
                    text-align: center;
                }
                
                .rag-analysis-logger .log-message {
                    flex: 1;
                    line-height: 1.4;
                    word-break: break-word;
                }
                
                .rag-analysis-logger .log-info .log-message {
                    color: ${this.ORKG_RED};
                }
                
                .rag-analysis-logger .log-success .log-message {
                    color: ${this.currentTheme === 'dark' ? '#86efac' : '#16a34a'};
                }
                
                .rag-analysis-logger .log-warning .log-message {
                    color: ${this.currentTheme === 'dark' ? '#fde047' : '#ca8a04'};
                }
                
                .rag-analysis-logger .log-error .log-message {
                    color: ${this.currentTheme === 'dark' ? '#fca5a5' : '#dc2626'};
                }
                
                .rag-analysis-logger .log-batch .log-message {
                    color: ${this.ORKG_RED_LIGHT};
                }
                
                .rag-analysis-logger .log-property .log-message {
                    color: ${this.currentTheme === 'dark' ? '#c4b5fd' : '#7c3aed'};
                }
                
                .rag-analysis-logger .log-matching .log-message {
                    color: ${this.currentTheme === 'dark' ? '#93c5fd' : '#3b82f6'};
                }
                
                .rag-analysis-logger .log-progress {
                    padding: 1px 6px;
                    border-radius: 10px;
                    background: ${this.ORKG_RED};
                    color: white;
                    font-size: 10px;
                    margin-left: 8px;
                }
                
                .rag-analysis-logger .log-similarity {
                    padding: 1px 6px;
                    border-radius: 10px;
                    background: ${this.currentTheme === 'dark' ? '#8b5cf6' : '#a78bfa'};
                    color: white;
                    font-size: 10px;
                    margin-left: 8px;
                }
                
                .rag-analysis-logger .logger-minimized-indicator {
                    padding: 8px 15px;
                    background: ${this.currentTheme === 'dark' ? '#1f2937' : 'white'};
                    border-top: 1px solid ${this.currentTheme === 'dark' ? '#374151' : '#e5e7eb'};
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 12px;
                    color: ${this.currentTheme === 'dark' ? '#9ca3af' : '#6b7280'};
                }
                
                .rag-analysis-logger .log-phase {
                    padding: 2px 8px;
                    border-radius: 12px;
                    background: ${this.ORKG_RED};
                    color: white;
                    font-size: 10px;
                    font-weight: 600;
                    margin-left: 8px;
                }
                
                .rag-analysis-logger .log-entry-animated {
                    animation: logFadeIn 0.3s ease;
                }
                
                @keyframes logFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            
            document.head.appendChild(style);
        }
        
        /**
         * Attach logger to container element
         */
        attachToContainer(container) {
            if (!container) return;
            
            this.container = container;
            this.logsContainer = container.querySelector('#rag-analysis-logs');
            
            // Update theme if needed
            this.updateTheme();
            
            this.setupEventHandlers();
            this.startElapsedTimer();
            this.setupScrollOptimization();
            
            // Update logs display if we have logs
            if (this.logs.length > 0) {
                this.updateLogDisplay();
            }
        }
        
        /**
         * Update theme based on current document theme
         */
        updateTheme() {
            const newTheme = this.detectTheme();
            if (newTheme !== this.currentTheme) {
                this.currentTheme = newTheme;
                if (this.container) {
                    this.container.className = `rag-analysis-logger logger-theme-${newTheme} ${this.isHidden ? 'logger-hidden' : ''}`;
                    this.container.setAttribute('data-theme', newTheme);
                }
                // Re-inject styles with new theme
                this.injectStyles();
            }
        }
        
        /**
         * Setup scroll optimization with classes for better UX
         */
        setupScrollOptimization() {
            if (!this.logsContainer) return;
            
            let scrollTimeout;
            let isScrolling = false;
            
            this.logsContainer.addEventListener('scroll', () => {
                if (!isScrolling) {
                    isScrolling = true;
                    this.logsContainer.classList.add('scrolling');
                }
                
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    isScrolling = false;
                    this.logsContainer.classList.remove('scrolling');
                    
                    // Check if user scrolled away from bottom
                    const isAtBottom = this.logsContainer.scrollHeight - this.logsContainer.scrollTop 
                                      <= this.logsContainer.clientHeight + 50;
                    
                    if (!isAtBottom && this.autoScroll) {
                        this.autoScroll = false;
                        this.updateAutoScrollButton();
                    }
                }, 150);
            }, { passive: true });
        }
        
        /**
         * Render waiting message when no logs
         */
        renderWaitingMessage() {
            return `
                <div class="log-entry log-info log-entry-animated">
                    <span class="log-timestamp">${new Date().toLocaleTimeString()}</span>
                    <span class="log-icon"><i class="fas fa-hourglass-half fa-spin"></i></span>
                    <span class="log-message">Waiting for RAG analysis to start...</span>
                </div>
            `;
        }
        
        /**
         * Render initial logs (performance optimized)
         */
        renderInitialLogs() {
            // Only render last N logs initially for performance
            const recentLogs = this.logs.slice(-this.maxDisplayLogs);
            return recentLogs.map(log => this.renderLogEntry(log)).join('');
        }
        
        /**
         * Render a single log entry
         */
        renderLogEntry(log) {
            const icon = this.getLogIcon(log.type);
            const typeClass = `log-${log.type}`;
            
            return `
                <div class="log-entry ${typeClass} log-entry-animated" data-log-id="${log.id}">
                    <span class="log-timestamp">${log.timestamp.toLocaleTimeString()}</span>
                    <span class="log-icon">${icon}</span>
                    <span class="log-message">${this.escapeHtml(log.message)}</span>
                    ${log.data ? this.renderLogData(log.data) : ''}
                    ${log.phase ? `<span class="log-phase">${log.phase}</span>` : ''}
                </div>
            `;
        }
        
        /**
         * Render log data with proper formatting
         */
        renderLogData(data) {
            if (data.progress !== undefined) {
                return `<span class="log-progress">${Math.round(data.progress)}%</span>`;
            }
            if (data.similarity !== undefined) {
                return `<span class="log-similarity">${(data.similarity * 100).toFixed(1)}%</span>`;
            }
            if (data.matches !== undefined) {
                return `<span class="log-progress">${data.matches} matches</span>`;
            }
            if (data.properties !== undefined) {
                return `<span class="log-progress">${data.properties} properties</span>`;
            }
            return '';
        }
        
        /**
         * Get icon for log type
         */
        getLogIcon(type) {
            const icons = {
                'info': '<i class="fas fa-info-circle"></i>',
                'success': '<i class="fas fa-check-circle"></i>',
                'warning': '<i class="fas fa-exclamation-triangle"></i>',
                'error': '<i class="fas fa-times-circle"></i>',
                'batch': '<i class="fas fa-layer-group"></i>',
                'property': '<i class="fas fa-tag"></i>',
                'matching': '<i class="fas fa-equals"></i>',
                'rag': '<i class="fas fa-brain"></i>',
                'section': '<i class="fas fa-paragraph"></i>'
            };
            return icons[type] || icons.info;
        }
        
        /**
         * Add a log entry with optional data and phase
         */
        addLog(message, type = 'info', data = null, phase = null) {
            if (this.isPaused) return;
            
            const log = {
                id: `rag_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                message,
                type,
                data,
                phase
            };
            
            this.logs.push(log);
            
            // Limit logs in memory
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(-this.maxLogs);
            }
            
            // Queue for batch rendering (performance optimization)
            this.queueLogForRendering(log);
            
            // Update count
            this.updateLogCount();
            
            // Update performance indicator
            this.updatePerformanceIndicator();
        }
        
        /**
         * Add property matching log with color coding
         */
        addPropertyLog(property, value, confidence) {
            this.addLog(
                `Matched property "${property}": "${value}"`, 
                'property',
                { confidence: confidence },
                'Property Matching'
            );
        }
        
        /**
         * Add section analysis log
         */
        addSectionLog(section, matches) {
            this.addLog(
                `Analyzing section "${section}"`, 
                'section',
                { matches: matches },
                'Section Analysis'
            );
        }
        
        /**
         * Add phase change log
         */
        addPhaseLog(phase, message) {
            this.addLog(
                message, 
                'info',
                null,
                phase
            );
        }
        
        /**
         * Queue log for rendering (performance optimization)
         */
        queueLogForRendering(log) {
            this.renderQueue.push(log);
            
            // Batch render for better performance
            if (!this.renderTimeout) {
                this.renderTimeout = requestAnimationFrame(() => {
                    this.renderQueuedLogs();
                });
            }
        }
        
        /**
         * Render queued logs in batches for performance
         */
        renderQueuedLogs() {
            if (!this.logsContainer || this.renderQueue.length === 0) {
                this.renderTimeout = null;
                return;
            }
            
            // Don't render if hidden
            if (this.isHidden) {
                this.renderQueue = [];
                this.renderTimeout = null;
                return;
            }
            
            // Create document fragment for batch insertion (performance)
            const fragment = document.createDocumentFragment();
            const logsToRender = this.renderQueue.splice(0, this.batchSize);
            
            logsToRender.forEach(log => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = this.renderLogEntry(log);
                fragment.appendChild(tempDiv.firstElementChild);
            });
            
            this.logsContainer.appendChild(fragment);
            
            // Remove old entries to maintain performance
            while (this.logsContainer.children.length > this.maxDisplayLogs) {
                this.logsContainer.removeChild(this.logsContainer.firstChild);
            }
            
            // Auto-scroll if enabled
            if (this.autoScroll && !this.isHidden) {
                requestAnimationFrame(() => {
                    this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
                });
            }
            
            // Continue rendering if more in queue
            if (this.renderQueue.length > 0) {
                this.renderTimeout = requestAnimationFrame(() => {
                    this.renderQueuedLogs();
                });
            } else {
                this.renderTimeout = null;
            }
        }
        
        /**
         * Update performance indicator based on queue size
         */
        updatePerformanceIndicator() {
            const perfElement = this.container?.querySelector('#rag-log-performance');
            if (!perfElement) return;
            
            const queueSize = this.renderQueue.length;
            let status = 'Smooth';
            let color = this.currentTheme === 'dark' ? '#86efac' : '#16a34a';
            
            if (queueSize > 20) {
                status = 'Heavy';
                color = this.currentTheme === 'dark' ? '#fde047' : '#ca8a04';
            } else if (queueSize > 50) {
                status = 'Lagging';
                color = this.currentTheme === 'dark' ? '#fca5a5' : '#dc2626';
            }
            
            perfElement.textContent = status;
            perfElement.style.color = color;
        }
        
        /**
         * Update log display (full refresh)
         */
        updateLogDisplay() {
            if (!this.logsContainer || this.isHidden) return;
            
            // Clear and re-render for full update
            this.logsContainer.innerHTML = this.renderInitialLogs();
            
            if (this.autoScroll) {
                requestAnimationFrame(() => {
                    this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
                });
            }
        }
        
        /**
         * Update log count in UI
         */
        updateLogCount() {
            const countElement = this.container?.querySelector('#rag-log-count');
            if (countElement) {
                countElement.textContent = this.logs.length;
            }
            
            // Update minimized indicator if hidden
            if (this.isHidden) {
                const indicator = this.container?.querySelector('.logger-minimized-indicator span');
                if (indicator) {
                    indicator.textContent = `Logger minimized - ${this.logs.length} entries`;
                }
            }
        }
        
        /**
         * Update auto-scroll button state
         */
        updateAutoScrollButton() {
            const autoScrollBtn = this.container?.querySelector('#auto-scroll-rag-btn');
            if (autoScrollBtn) {
                autoScrollBtn.classList.toggle('active', this.autoScroll);
            }
        }
        
        /**
         * Setup event handlers for logger controls
         */
        setupEventHandlers() {
            if (!this.container) return;
            
            // Clear logs
            const clearBtn = this.container.querySelector('#clear-rag-logs-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clear());
            }
            
            // Pause/Resume
            const pauseBtn = this.container.querySelector('#pause-rag-logs-btn');
            if (pauseBtn) {
                pauseBtn.addEventListener('click', () => {
                    this.isPaused = !this.isPaused;
                    pauseBtn.innerHTML = this.isPaused 
                        ? '<i class="fas fa-play"></i>' 
                        : '<i class="fas fa-pause"></i>';
                    pauseBtn.classList.toggle('paused', this.isPaused);
                    
                    if (!this.isPaused) {
                        // Resume rendering queued logs
                        this.renderQueuedLogs();
                    }
                });
            }
            
            // Auto-scroll
            const autoScrollBtn = this.container.querySelector('#auto-scroll-rag-btn');
            if (autoScrollBtn) {
                autoScrollBtn.addEventListener('click', () => {
                    this.autoScroll = !this.autoScroll;
                    this.updateAutoScrollButton();
                    
                    if (this.autoScroll && this.logsContainer) {
                        requestAnimationFrame(() => {
                            this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
                        });
                    }
                });
            }
            
            // Hide/Show logger
            const hideBtn = this.container.querySelector('#hide-rag-logs-btn');
            if (hideBtn) {
                hideBtn.addEventListener('click', () => {
                    this.toggleHidden();
                });
            }
            
            // Listen for theme changes
            const observer = new MutationObserver(() => {
                this.updateTheme();
            });
            
            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
        }
        
        /**
         * Toggle logger visibility
         */
        toggleHidden() {
            this.isHidden = !this.isHidden;
            
            if (this.container) {
                this.container.classList.toggle('logger-hidden', this.isHidden);
                
                const logsContainer = this.container.querySelector('.logs-container');
                if (logsContainer) {
                    logsContainer.classList.toggle('hidden', this.isHidden);
                }
                
                const hideBtn = this.container.querySelector('#hide-rag-logs-btn');
                if (hideBtn) {
                    hideBtn.innerHTML = this.isHidden 
                        ? '<i class="fas fa-eye"></i>' 
                        : '<i class="fas fa-eye-slash"></i>';
                }
                
                // Update or create minimized indicator
                if (this.isHidden) {
                    if (!this.container.querySelector('.logger-minimized-indicator')) {
                        const indicator = document.createElement('div');
                        indicator.className = 'logger-minimized-indicator';
                        indicator.innerHTML = `
                            <i class="fas fa-terminal" style="color: ${this.ORKG_RED};"></i>
                            <span>Logger minimized - ${this.logs.length} entries</span>
                        `;
                        this.container.appendChild(indicator);
                    }
                } else {
                    const indicator = this.container.querySelector('.logger-minimized-indicator');
                    if (indicator) {
                        indicator.remove();
                    }
                    
                    // Resume rendering if logs were queued while hidden
                    if (this.renderQueue.length > 0) {
                        this.renderQueuedLogs();
                    }
                }
            }
        }
        
        /**
         * Start elapsed timer for analysis
         */
        startElapsedTimer() {
            this.startTime = Date.now();
            
            this.elapsedInterval = setInterval(() => {
                const elapsed = Date.now() - this.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                const elapsedDisplay = this.container?.querySelector('#rag-elapsed-time');
                if (elapsedDisplay) {
                    elapsedDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            }, 1000);
        }
        
        /**
         * Stop elapsed timer
         */
        stopElapsedTimer() {
            if (this.elapsedInterval) {
                clearInterval(this.elapsedInterval);
                this.elapsedInterval = null;
            }
        }
        
        /**
         * Clear all logs
         */
        clear() {
            this.logs = [];
            this.renderQueue = [];
            
            if (this.renderTimeout) {
                cancelAnimationFrame(this.renderTimeout);
                this.renderTimeout = null;
            }
            
            if (this.logsContainer) {
                this.logsContainer.innerHTML = this.renderWaitingMessage();
            }
            
            this.updateLogCount();
            this.updatePerformanceIndicator();
        }
        
        /**
         * Safely escape HTML to prevent XSS
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        /**
         * Get logs as JSON (useful for debugging)
         */
        getLogsAsJson() {
            return JSON.stringify(this.logs, null, 2);
        }
        
        /**
         * Add predefined log entries for common RAG phases
         */
        logRagPhaseStart() {
            this.addPhaseLog('RAG Start', 'Starting RAG analysis pipeline');
        }
        
        logRagSectionAnalysis(sectionName, length) {
            this.addLog(
                `Processing section "${sectionName}"`, 
                'section',
                { length: length },
                'Section Analysis'
            );
        }
        
        logRagPropertyMatching(propertyCount) {
            this.addLog(
                `Matching ${propertyCount} template properties against text`, 
                'property',
                { properties: propertyCount },
                'Property Matching'
            );
        }
        
        logRagCompletion(matchCount) {
            this.addLog(
                `RAG analysis completed with ${matchCount} property matches`, 
                'success',
                { matches: matchCount },
                'Analysis Complete'
            );
        }
        
        /**
         * Cleanup resources
         */
        destroy() {
            this.stopElapsedTimer();
            
            if (this.renderTimeout) {
                cancelAnimationFrame(this.renderTimeout);
                this.renderTimeout = null;
            }
            
            this.clear();
            this.container = null;
            this.logsContainer = null;
            
            // Remove injected styles
            const styleElement = document.getElementById('rag-logger-styles');
            if (styleElement) {
                styleElement.remove();
            }
        }
    }
    
    // Export to global scope
    global.RAGAnalysisLogger = RAGAnalysisLogger;
    
})(typeof window !== 'undefined' ? window : this);
// ================================
// src/core/content/problems/ProblemAnalysisLogger.js - Enhanced Version
// ================================

export class ProblemAnalysisLogger {
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
        
        // Theme detection
        this.currentTheme = this.detectTheme();
    }
    
    detectTheme() {
        const theme = document.documentElement.getAttribute('data-theme') || 
                     localStorage.getItem('orkg-annotator-theme') || 
                     'dark';
        return theme;
    }
    
    render() {
        const themeClass = `logger-theme-${this.currentTheme}`;
        const hiddenClass = this.isHidden ? 'logger-hidden' : '';
        
        const html = `
            <div class="analysis-logger ${themeClass} ${hiddenClass}" data-theme="${this.currentTheme}">
                <div class="logger-header">
                    <div class="logger-title">
                        <i class="fas fa-terminal"></i>
                        <h4>Analysis Progress</h4>
                    </div>
                    <div class="logger-controls">
                        <button class="logger-btn" id="clear-logs-btn" title="Clear logs">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="logger-btn" id="pause-logs-btn" title="Pause/Resume">
                            <i class="fas ${this.isPaused ? 'fa-play' : 'fa-pause'}"></i>
                        </button>
                        <button class="logger-btn ${this.autoScroll ? 'active' : ''}" id="auto-scroll-btn" title="Auto-scroll">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                        <button class="logger-btn" id="hide-logs-btn" title="Hide/Show Logger">
                            <i class="fas ${this.isHidden ? 'fa-eye' : 'fa-eye-slash'}"></i>
                        </button>
                    </div>
                </div>
                
                <div class="logger-stats">
                    <div class="stat-item">
                        <i class="fas fa-clock"></i>
                        <span id="elapsed-time">00:00</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-list"></i>
                        <span id="log-count">${this.logs.length}</span> entries
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-memory"></i>
                        <span id="log-performance">Smooth</span>
                    </div>
                </div>
                
                <div class="logs-container ${this.isHidden ? 'hidden' : ''}" id="analysis-logs">
                    ${this.logs.length > 0 ? this.renderInitialLogs() : this.renderWaitingMessage()}
                </div>
                
                ${this.isHidden ? `
                    <div class="logger-minimized-indicator">
                        <i class="fas fa-terminal"></i>
                        <span>Logger minimized - ${this.logs.length} entries</span>
                    </div>
                ` : ''}
            </div>
        `;
        
        return html;
    }
    
    attachToContainer(container) {
        if (!container) return;
        
        this.container = container;
        this.logsContainer = container.querySelector('#analysis-logs');
        
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
    
    updateTheme() {
        const newTheme = this.detectTheme();
        if (newTheme !== this.currentTheme) {
            this.currentTheme = newTheme;
            if (this.container) {
                this.container.className = `analysis-logger logger-theme-${newTheme} ${this.isHidden ? 'logger-hidden' : ''}`;
                this.container.setAttribute('data-theme', newTheme);
            }
        }
    }
    
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
    
    renderWaitingMessage() {
        return `
            <div class="log-entry log-info log-entry-animated">
                <span class="log-timestamp">${new Date().toLocaleTimeString()}</span>
                <span class="log-icon"><i class="fas fa-hourglass-half fa-spin"></i></span>
                <span class="log-message">Waiting for analysis to start...</span>
            </div>
        `;
    }
    
    renderInitialLogs() {
        // Only render last N logs initially for performance
        const recentLogs = this.logs.slice(-this.maxDisplayLogs);
        return recentLogs.map(log => this.renderLogEntry(log)).join('');
    }
    
    renderLogEntry(log) {
        const icon = this.getLogIcon(log.type);
        const typeClass = `log-${log.type}`;
        
        return `
            <div class="log-entry ${typeClass} log-entry-animated" data-log-id="${log.id}">
                <span class="log-timestamp">${log.timestamp.toLocaleTimeString()}</span>
                <span class="log-icon">${icon}</span>
                <span class="log-message">${this.escapeHtml(log.message)}</span>
                ${log.data ? this.renderLogData(log.data) : ''}
            </div>
        `;
    }
    
    renderLogData(data) {
        if (data.progress !== undefined) {
            return `<span class="log-progress">${Math.round(data.progress)}%</span>`;
        }
        if (data.similarity !== undefined) {
            return `<span class="log-similarity">${(data.similarity * 100).toFixed(1)}%</span>`;
        }
        return '';
    }
    
    getLogIcon(type) {
        const icons = {
            'info': '<i class="fas fa-info-circle"></i>',
            'success': '<i class="fas fa-check-circle"></i>',
            'warning': '<i class="fas fa-exclamation-triangle"></i>',
            'error': '<i class="fas fa-times-circle"></i>',
            'batch': '<i class="fas fa-layer-group"></i>',
            'embedding': '<i class="fas fa-brain"></i>',
            'similarity': '<i class="fas fa-chart-line"></i>'
        };
        return icons[type] || icons.info;
    }
    
    addLog(message, type = 'info', data = null) {
        if (this.isPaused) return;
        
        const log = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            message,
            type,
            data
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
    
    queueLogForRendering(log) {
        this.renderQueue.push(log);
        
        // Batch render for better performance
        if (!this.renderTimeout) {
            this.renderTimeout = requestAnimationFrame(() => {
                this.renderQueuedLogs();
            });
        }
    }
    
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
    
    updatePerformanceIndicator() {
        const perfElement = this.container?.querySelector('#log-performance');
        if (!perfElement) return;
        
        const queueSize = this.renderQueue.length;
        let status = 'Smooth';
        let color = 'var(--success-color)';
        
        if (queueSize > 20) {
            status = 'Heavy';
            color = 'var(--warning-color)';
        } else if (queueSize > 50) {
            status = 'Lagging';
            color = 'var(--error-color)';
        }
        
        perfElement.textContent = status;
        perfElement.style.color = color;
    }
    
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
    
    updateLogCount() {
        const countElement = this.container?.querySelector('#log-count');
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
    
    updateAutoScrollButton() {
        const autoScrollBtn = this.container?.querySelector('#auto-scroll-btn');
        if (autoScrollBtn) {
            autoScrollBtn.classList.toggle('active', this.autoScroll);
        }
    }
    
    setupEventHandlers() {
        if (!this.container) return;
        
        // Clear logs
        const clearBtn = this.container.querySelector('#clear-logs-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clear());
        }
        
        // Pause/Resume
        const pauseBtn = this.container.querySelector('#pause-logs-btn');
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
        const autoScrollBtn = this.container.querySelector('#auto-scroll-btn');
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
        const hideBtn = this.container.querySelector('#hide-logs-btn');
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
    
    toggleHidden() {
        this.isHidden = !this.isHidden;
        
        if (this.container) {
            this.container.classList.toggle('logger-hidden', this.isHidden);
            
            const logsContainer = this.container.querySelector('.logs-container');
            if (logsContainer) {
                logsContainer.classList.toggle('hidden', this.isHidden);
            }
            
            const hideBtn = this.container.querySelector('#hide-logs-btn');
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
                        <i class="fas fa-terminal"></i>
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
    
    startElapsedTimer() {
        this.startTime = Date.now();
        
        this.elapsedInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            const elapsedDisplay = this.container?.querySelector('#elapsed-time');
            if (elapsedDisplay) {
                elapsedDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    stopElapsedTimer() {
        if (this.elapsedInterval) {
            clearInterval(this.elapsedInterval);
            this.elapsedInterval = null;
        }
    }
    
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
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    destroy() {
        this.stopElapsedTimer();
        
        if (this.renderTimeout) {
            cancelAnimationFrame(this.renderTimeout);
            this.renderTimeout = null;
        }
        
        this.clear();
        this.container = null;
        this.logsContainer = null;
    }
}
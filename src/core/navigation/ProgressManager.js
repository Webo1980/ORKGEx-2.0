// ================================
// src/core/navigation/ProgressManager.js - Real-time Processing Display
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class ProgressManager {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.isVisible = false;
        
        // Progress state
        this.currentPhase = null;
        this.progress = 0;
        this.message = '';
        this.logs = [];
        this.startTime = null;
        
        // Configuration
        this.config = {
            maxLogs: 100,
            autoScroll: true,
            showTimestamps: true,
            animationDuration: 300,
            phases: {
                'ai_embedding': {
                    label: 'AI Problem Analysis',
                    icon: 'fa-brain',
                    color: '#3b82f6'
                },
                'orkg_discovery': {
                    label: 'ORKG Problem Discovery',
                    icon: 'fa-search',
                    color: '#10b981'
                },
                'similarity_calculation': {
                    label: 'Similarity Analysis',
                    icon: 'fa-calculator',
                    color: '#f59e0b'
                },
                'results_processing': {
                    label: 'Results Processing',
                    icon: 'fa-cogs',
                    color: '#8b5cf6'
                }
            }
        };
        
        // Performance tracking
        this.performance = {
            phaseStartTimes: new Map(),
            phaseDurations: new Map(),
            totalStartTime: null
        };
    }
    
    async init() {
        if (this.isInitialized) return;
        
        console.log('📊 Initializing ProgressManager...');
        
        this.createProgressContainer();
        this.setupEventListeners();
        
        this.isInitialized = true;
        console.log('✅ ProgressManager initialized');
    }
    
    /**
     * Create progress display container
     */
    createProgressContainer() {
        // Remove existing container
        const existing = document.getElementById('progress-manager-container');
        if (existing) {
            existing.remove();
        }
        
        this.container = document.createElement('div');
        this.container.id = 'progress-manager-container';
        this.container.className = 'progress-manager hidden';
        
        this.container.innerHTML = this.createProgressHTML();
        
        // Append to body
        document.body.appendChild(this.container);
        
        // Setup event handlers
        this.setupContainerEvents();
        
        console.log('📊 Progress container created');
    }
    
    /**
     * Create progress HTML structure
     */
    createProgressHTML() {
        return `
            <div class="progress-overlay">
                <div class="progress-modal">
                    <div class="progress-header">
                        <div class="progress-title">
                            <i class="fas fa-cogs"></i>
                            <span>Processing Research Problems</span>
                        </div>
                        <button class="progress-close" id="progress-close-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="progress-content">
                        <!-- Phase Indicators -->
                        <div class="phase-indicators">
                            ${Object.entries(this.config.phases).map(([key, phase]) => `
                                <div class="phase-indicator" data-phase="${key}">
                                    <div class="phase-icon">
                                        <i class="fas ${phase.icon}"></i>
                                    </div>
                                    <div class="phase-label">${phase.label}</div>
                                    <div class="phase-status">
                                        <i class="fas fa-clock pending-icon"></i>
                                        <i class="fas fa-spinner fa-spin active-icon"></i>
                                        <i class="fas fa-check completed-icon"></i>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <!-- Progress Bar -->
                        <div class="progress-bar-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progress-fill"></div>
                            </div>
                            <div class="progress-text">
                                <span id="progress-percentage">0%</span>
                                <span id="progress-message">Initializing...</span>
                            </div>
                        </div>
                        
                        <!-- Performance Metrics -->
                        <div class="progress-metrics">
                            <div class="metric">
                                <i class="fas fa-clock"></i>
                                <span id="elapsed-time">00:00</span>
                            </div>
                            <div class="metric">
                                <i class="fas fa-tachometer-alt"></i>
                                <span id="processing-rate">-- items/sec</span>
                            </div>
                            <div class="metric">
                                <i class="fas fa-hourglass-half"></i>
                                <span id="estimated-time">Calculating...</span>
                            </div>
                        </div>
                        
                        <!-- Log Display -->
                        <div class="progress-logs">
                            <div class="logs-header">
                                <span>Processing Log</span>
                                <div class="log-controls">
                                    <button class="log-clear" id="clear-logs-btn">
                                        <i class="fas fa-trash"></i>
                                        Clear
                                    </button>
                                    <button class="log-scroll-toggle" id="auto-scroll-toggle">
                                        <i class="fas fa-arrow-down"></i>
                                        Auto-scroll
                                    </button>
                                </div>
                            </div>
                            <div class="logs-content" id="logs-content">
                                <!-- Logs will be added here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup container event handlers
     */
    setupContainerEvents() {
        // Close button
        const closeBtn = this.container.querySelector('#progress-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Clear logs button
        const clearBtn = this.container.querySelector('#clear-logs-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearLogs());
        }
        
        // Auto-scroll toggle
        const scrollToggle = this.container.querySelector('#auto-scroll-toggle');
        if (scrollToggle) {
            scrollToggle.addEventListener('click', () => this.toggleAutoScroll());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isVisible && e.key === 'Escape') {
                this.hide();
            }
        });
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Problem matching progress events
        eventManager.on('problem_matching:started', (data) => {
            this.start(data);
        });
        
        eventManager.on('problem_matching:progress', (data) => {
            this.updateProgress(data);
        });
        
        eventManager.on('problem_matching:completed', (data) => {
            this.complete(data);
        });
        
        eventManager.on('problem_matching:error', (data) => {
            this.error(data);
        });
        
        // Generic progress events
        eventManager.on('progress:show', (data) => {
            this.show(data);
        });
        
        eventManager.on('progress:update', (data) => {
            this.updateProgress(data);
        });
        
        eventManager.on('progress:hide', () => {
            this.hide();
        });
    }
    
    /**
     * Start progress tracking
     */
    start(data = {}) {
        if (!this.isInitialized) return;
        
        this.startTime = Date.now();
        this.performance.totalStartTime = this.startTime;
        this.logs = [];
        this.progress = 0;
        this.currentPhase = null;
        
        this.addLog('Starting problem analysis...', 'info');
        this.show();
        
        console.log('📊 Progress tracking started');
    }
    
    /**
     * Show progress manager
     */
    show(data = {}) {
        if (!this.isInitialized) return;
        
        this.container.classList.remove('hidden');
        this.isVisible = true;
        
        // Add show animation
        requestAnimationFrame(() => {
            this.container.classList.add('show');
        });
        
        this.updateMetrics();
        this.startMetricsTimer();
        
        console.log('📊 Progress manager shown');
    }
    
    /**
     * Hide progress manager
     */
    hide() {
        if (!this.isVisible) return;
        
        this.container.classList.remove('show');
        this.isVisible = false;
        
        setTimeout(() => {
            this.container.classList.add('hidden');
        }, this.config.animationDuration);
        
        this.stopMetricsTimer();
        
        console.log('📊 Progress manager hidden');
    }
    
    /**
     * Update progress
     */
    updateProgress(data) {
        if (!this.isVisible) return;
        
        const {
            phase,
            progress = this.progress,
            message = this.message,
            details,
            logMessage,
            logLevel = 'info'
        } = data;
        
        // Update phase if changed
        if (phase && phase !== this.currentPhase) {
            this.setPhase(phase);
        }
        
        // Update progress bar
        this.setProgress(progress);
        
        // Update message
        this.setMessage(message);
        
        // Add log entry if provided
        if (logMessage) {
            this.addLog(logMessage, logLevel);
        } else if (message !== this.message) {
            this.addLog(message, 'info');
        }
        
        // Update details
        if (details) {
            this.updateDetails(details);
        }
        
        // Update metrics
        this.updateMetrics();
    }
    
    /**
     * Set current phase
     */
    setPhase(phase) {
        if (this.currentPhase) {
            // Mark previous phase as completed
            this.markPhaseCompleted(this.currentPhase);
        }
        
        this.currentPhase = phase;
        this.performance.phaseStartTimes.set(phase, Date.now());
        
        // Update phase indicators
        this.updatePhaseIndicators();
        
        const phaseConfig = this.config.phases[phase];
        if (phaseConfig) {
            this.addLog(`Starting ${phaseConfig.label}...`, 'phase');
        }
        
        console.log(`📊 Phase changed to: ${phase}`);
    }
    
    /**
     * Set progress percentage
     */
    setProgress(progress) {
        this.progress = Math.max(0, Math.min(100, progress));
        
        const progressFill = this.container.querySelector('#progress-fill');
        const progressPercentage = this.container.querySelector('#progress-percentage');
        
        if (progressFill) {
            progressFill.style.width = `${this.progress}%`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(this.progress)}%`;
        }
    }
    
    /**
     * Set progress message
     */
    setMessage(message) {
        this.message = message;
        
        const messageElement = this.container.querySelector('#progress-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }
    
    /**
     * Update phase indicators
     */
    updatePhaseIndicators() {
        const indicators = this.container.querySelectorAll('.phase-indicator');
        
        indicators.forEach(indicator => {
            const phase = indicator.getAttribute('data-phase');
            
            // Remove all status classes
            indicator.classList.remove('pending', 'active', 'completed');
            
            if (phase === this.currentPhase) {
                indicator.classList.add('active');
            } else if (this.performance.phaseDurations.has(phase)) {
                indicator.classList.add('completed');
            } else {
                indicator.classList.add('pending');
            }
        });
    }
    
    /**
     * Mark phase as completed
     */
    markPhaseCompleted(phase) {
        const startTime = this.performance.phaseStartTimes.get(phase);
        if (startTime) {
            const duration = Date.now() - startTime;
            this.performance.phaseDurations.set(phase, duration);
            
            const phaseConfig = this.config.phases[phase];
            if (phaseConfig) {
                this.addLog(`${phaseConfig.label} completed in ${this.formatDuration(duration)}`, 'success');
            }
        }
    }
    
    /**
     * Add log entry
     */
    addLog(message, level = 'info') {
        const timestamp = new Date();
        const logEntry = {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp,
            message,
            level,
            phase: this.currentPhase
        };
        
        this.logs.push(logEntry);
        
        // Limit log size
        if (this.logs.length > this.config.maxLogs) {
            this.logs = this.logs.slice(-this.config.maxLogs);
        }
        
        // Add to DOM
        this.renderLogEntry(logEntry);
        
        // Auto-scroll if enabled
        if (this.config.autoScroll) {
            this.scrollToBottom();
        }
    }
    
    /**
     * Render log entry in DOM
     */
    renderLogEntry(logEntry) {
        const logsContent = this.container.querySelector('#logs-content');
        if (!logsContent) return;
        
        const logElement = document.createElement('div');
        logElement.className = `log-entry log-${logEntry.level}`;
        logElement.setAttribute('data-log-id', logEntry.id);
        
        const timeString = this.config.showTimestamps 
            ? logEntry.timestamp.toLocaleTimeString()
            : '';
        
        const levelIcon = this.getLogLevelIcon(logEntry.level);
        
        logElement.innerHTML = `
            <div class="log-icon">
                <i class="fas ${levelIcon}"></i>
            </div>
            <div class="log-content">
                <div class="log-message">${this.escapeHtml(logEntry.message)}</div>
                ${timeString ? `<div class="log-timestamp">${timeString}</div>` : ''}
            </div>
        `;
        
        logsContent.appendChild(logElement);
        
        // Remove old entries if too many
        const logEntries = logsContent.querySelectorAll('.log-entry');
        if (logEntries.length > this.config.maxLogs) {
            const toRemove = logEntries.length - this.config.maxLogs;
            for (let i = 0; i < toRemove; i++) {
                logEntries[i].remove();
            }
        }
    }
    
    /**
     * Get icon for log level
     */
    getLogLevelIcon(level) {
        const icons = {
            'info': 'fa-info-circle',
            'success': 'fa-check-circle',
            'warning': 'fa-exclamation-triangle',
            'error': 'fa-times-circle',
            'phase': 'fa-arrow-right',
            'debug': 'fa-bug'
        };
        
        return icons[level] || icons.info;
    }
    
    /**
     * Update processing details
     */
    updateDetails(details) {
        // Update processing rate if available
        if (details.processed && details.total && details.timeElapsed) {
            const rate = details.processed / (details.timeElapsed / 1000);
            const rateElement = this.container.querySelector('#processing-rate');
            if (rateElement) {
                rateElement.textContent = `${rate.toFixed(1)} items/sec`;
            }
        }
        
        // Update any other detail-specific elements
        if (details.found !== undefined) {
            this.addLog(`Found ${details.found} items so far...`, 'info');
        }
    }
    
    /**
     * Update performance metrics
     */
    updateMetrics() {
        if (!this.startTime) return;
        
        const elapsed = Date.now() - this.startTime;
        
        // Update elapsed time
        const elapsedElement = this.container.querySelector('#elapsed-time');
        if (elapsedElement) {
            elapsedElement.textContent = this.formatDuration(elapsed);
        }
        
        // Update estimated time
        if (this.progress > 0 && this.progress < 100) {
            const estimatedTotal = (elapsed / this.progress) * 100;
            const remaining = estimatedTotal - elapsed;
            
            const estimatedElement = this.container.querySelector('#estimated-time');
            if (estimatedElement) {
                estimatedElement.textContent = `~${this.formatDuration(remaining)} remaining`;
            }
        }
    }
    
    /**
     * Start metrics update timer
     */
    startMetricsTimer() {
        this.metricsTimer = setInterval(() => {
            this.updateMetrics();
        }, 1000);
    }
    
    /**
     * Stop metrics update timer
     */
    stopMetricsTimer() {
        if (this.metricsTimer) {
            clearInterval(this.metricsTimer);
            this.metricsTimer = null;
        }
    }
    
    /**
     * Complete progress tracking
     */
    complete(data = {}) {
        if (this.currentPhase) {
            this.markPhaseCompleted(this.currentPhase);
        }
        
        this.setProgress(100);
        this.setMessage('Processing completed successfully!');
        this.addLog('Problem analysis completed', 'success');
        
        // Show completion for a moment, then hide
        setTimeout(() => {
            this.hide();
        }, 3000);
        
        console.log('📊 Progress tracking completed');
    }
    
    /**
     * Handle error
     */
    error(data = {}) {
        const message = data.error || 'An error occurred during processing';
        
        this.setMessage('Processing failed');
        this.addLog(`Error: ${message}`, 'error');
        
        // Keep visible for user to see error
        console.error('📊 Progress tracking error:', message);
    }
    
    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
        
        const logsContent = this.container.querySelector('#logs-content');
        if (logsContent) {
            logsContent.innerHTML = '';
        }
        
        console.log('📊 Logs cleared');
    }
    
    /**
     * Toggle auto-scroll
     */
    toggleAutoScroll() {
        this.config.autoScroll = !this.config.autoScroll;
        
        const toggleBtn = this.container.querySelector('#auto-scroll-toggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = this.config.autoScroll 
                    ? 'fas fa-arrow-down' 
                    : 'fas fa-pause';
            }
        }
        
        if (this.config.autoScroll) {
            this.scrollToBottom();
        }
        
        console.log(`📊 Auto-scroll ${this.config.autoScroll ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Scroll logs to bottom
     */
    scrollToBottom() {
        const logsContent = this.container.querySelector('#logs-content');
        if (logsContent) {
            logsContent.scrollTop = logsContent.scrollHeight;
        }
    }
    
    /**
     * Utility methods
     */
    formatDuration(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Public API
     */
    isRunning() {
        return this.isVisible;
    }
    
    getCurrentPhase() {
        return this.currentPhase;
    }
    
    getProgress() {
        return this.progress;
    }
    
    getLogs() {
        return [...this.logs];
    }
    
    getPerformanceStats() {
        return {
            totalDuration: this.startTime ? Date.now() - this.startTime : 0,
            phaseDurations: Object.fromEntries(this.performance.phaseDurations),
            currentPhase: this.currentPhase,
            progress: this.progress
        };
    }
    
    /**
     * Get status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isVisible: this.isVisible,
            currentPhase: this.currentPhase,
            progress: this.progress,
            message: this.message,
            logCount: this.logs.length,
            performance: this.getPerformanceStats()
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        console.log('🧹 ProgressManager cleanup...');
        
        this.stopMetricsTimer();
        
        if (this.container) {
            this.container.remove();
        }
        
        // Remove event listeners
        eventManager.off('problem_matching:started');
        eventManager.off('problem_matching:progress');
        eventManager.off('problem_matching:completed');
        eventManager.off('problem_matching:error');
        eventManager.off('progress:show');
        eventManager.off('progress:update');
        eventManager.off('progress:hide');
        
        this.isInitialized = false;
        this.isVisible = false;
        this.logs = [];
        
        console.log('✅ ProgressManager cleanup completed');
    }
}
export const progressManager = new ProgressManager();
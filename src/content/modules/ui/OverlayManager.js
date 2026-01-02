// ================================
// src/content/modules/ui/OverlayManager.js
// RAG analysis progress overlay with log display - FIXED
// ================================

(function(global) {
    'use strict';
    
    // Check if already exists
    if (global.OverlayManager) {
        console.log('📊 OverlayManager already exists, skipping creation');
        return;
    }
    
    /**
     * Manages loading overlay for RAG analysis progress
     * Displays phases, progress, logs, and animations
     */
    class OverlayManager {
        constructor() {
            // State
            this.overlay = null;
            this.logsContainer = null;
            this.logs = [];
            this.maxLogs = 100;
            this.maxDisplayLogs = 10;
            this.startTime = null;
            this.elapsedInterval = null;
            this.currentTheme = this.detectTheme();
            this.isShowing = false;
            this.isInitialized = false;
            
            // ORKG Brand colors
            this.ORKG_RED = '#FF6B6B';
            this.ORKG_RED_DARK = '#E85555';
            this.ORKG_RED_LIGHT = '#FF8585';
            
            // Progress elements
            this.progressBar = null;
            this.progressText = null;
            this.phaseText = null;
            this.elapsedDisplay = null;
            this.logCountDisplay = null;
            
            // Performance optimization
            this.renderQueue = [];
            this.renderTimeout = null;
            this.renderBatchSize = 5;
        }
        
        /**
         * Initialize the overlay manager
         */
        async init() {
            if (this.isInitialized) {
                return this;
            }
            
            console.log('🚀 Initializing OverlayManager...');
            this.isInitialized = true;
            return this;
        }
        
        /**
         * Detect color theme from system preference
         */
        detectTheme() {
            const docTheme = document.documentElement.getAttribute('data-theme');
            if (docTheme) return docTheme;
            
            try {
                const storedTheme = localStorage.getItem('orkg-annotator-theme');
                if (storedTheme) return storedTheme;
            } catch (e) {
                // Ignore localStorage errors
            }
            
            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            return isDark ? 'dark' : 'light';
        }
        
        /**
         * Show overlay with initial state
         * FIXED: Removed checks that prevented showing
         */
        async show() {
            // If already showing, just ensure it's visible
            if (this.isShowing && this.overlay) {
                this.overlay.style.display = 'flex';
                this.overlay.style.opacity = '1';
                console.log('📊 Overlay already showing, ensuring visibility');
                return true;
            }
            
            // Remove any existing overlay first
            this.cleanup();
            
            console.log('📊 Creating and showing RAG overlay...');
            
            this.overlay = this.createOverlay();
            document.body.appendChild(this.overlay);
            
            // Store and modify body overflow
            document.body.dataset.originalOverflow = document.body.style.overflow || '';
            document.body.style.overflow = 'hidden';
            
            // Start timers
            this.startTime = Date.now();
            this.startElapsedTimer();
            
            // Add initial log
            this.addLog('Initializing RAG analysis...', 'info');
            
            this.isShowing = true;
            
            console.log('✅ RAG overlay shown');
            return true;
        }
        
        /**
         * Hide and clean up overlay
         */
        async hide() {
            if (!this.overlay) return;
            
            console.log('📊 Hiding RAG overlay...');
            
            // Stop timers
            this.stopElapsedTimer();
            
            // Clear render queue
            if (this.renderTimeout) {
                cancelAnimationFrame(this.renderTimeout);
                this.renderTimeout = null;
            }
            
            // Fade out animation
            this.overlay.style.opacity = '0';
            
            setTimeout(() => {
                this.cleanup();
                console.log('✅ RAG overlay hidden');
            }, 300);
        }
        
        /**
         * Cleanup overlay resources
         */
        cleanup() {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            
            this.overlay = null;
            this.logsContainer = null;
            this.logs = [];
            this.renderQueue = [];
            this.isShowing = false;
            
            // Reset references
            this.progressBar = null;
            this.progressText = null;
            this.phaseText = null;
            this.elapsedDisplay = null;
            this.logCountDisplay = null;
            
            // Restore body overflow
            if (document.body.dataset.originalOverflow !== undefined) {
                document.body.style.overflow = document.body.dataset.originalOverflow;
                delete document.body.dataset.originalOverflow;
            }
            
            // Stop timers
            this.stopElapsedTimer();
            
            if (this.renderTimeout) {
                cancelAnimationFrame(this.renderTimeout);
                this.renderTimeout = null;
            }
        }
        
        /**
         * Update progress, phase, and add a log message
         */
        async update(progress, phase, message) {
            return this.updateProgress(progress, phase, message);
        }
        
        /**
         * Update progress, phase, and add a log message
         */
        updateProgress(progress, phase, message) {
            if (!this.overlay) {
                console.warn('⚠️ Overlay not showing, cannot update progress');
                return;
            }
            
            // Ensure progress is a number
            progress = Math.max(0, Math.min(100, parseInt(progress) || 0));
            
            // Update progress bar
            if (this.progressBar) {
                this.progressBar.style.width = `${progress}%`;
            }
            
            // Update progress text
            if (this.progressText) {
                this.progressText.textContent = `${progress}%`;
            }
            
            // Update phase text
            if (this.phaseText && phase) {
                this.phaseText.textContent = this.formatPhase(phase);
            }
            
            // Add log message if provided
            if (message) {
                const logType = this.determineLogType(message);
                this.addLog(message, logType);
            }
        }
        
        /**
         * Format phase name for display
         */
        formatPhase(phase) {
            const phaseMap = {
                'initializing': 'Initializing...',
                'injecting': 'Preparing extraction...',
                'extracting': 'Extracting sections...',
                'analyzing': 'Analyzing with AI...',
                'processing': 'Processing results...',
                'highlighting': 'Preparing highlights...',
                'applying': 'Applying to page...',
                'complete': 'Complete!'
            };
            
            return phaseMap[phase] || phase;
        }
        
        /**
         * Determine log type based on message content
         */
        determineLogType(message) {
            if (!message) return 'info';
            
            const msg = message.toLowerCase();
            
            if (msg.includes('error') || msg.includes('failed') || msg.includes('❌')) return 'error';
            if (msg.includes('warning') || msg.includes('⚠️')) return 'warning';
            if (msg.includes('success') || msg.includes('complete') || msg.includes('✅')) return 'success';
            if (msg.includes('found') || msg.includes('extracted')) return 'success';
            if (msg.includes('batch') || msg.includes('processing batch')) return 'batch';
            if (msg.includes('analyzing property')) return 'property';
            if (msg.includes('embedding') || msg.includes('🧠')) return 'embedding';
            if (msg.includes('openai') || msg.includes('gpt')) return 'ai';
            
            return 'info';
        }
        
        /**
         * Create main overlay container
         */
        createOverlay() {
            const overlay = document.createElement('div');
            overlay.id = 'rag-loading-overlay';
            
            overlay.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.85) !important;
                backdrop-filter: blur(4px) !important;
                z-index: 2147483647 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                animation: fadeIn 0.3s ease !important;
                transition: opacity 0.3s ease !important;
            `;
            
            const content = this.createOverlayContent();
            overlay.appendChild(content);
            
            // Add animation styles
            this.injectStyles();
            
            return overlay;
        }
        
        /**
         * Create overlay content
         */
        createOverlayContent() {
            const isDark = this.currentTheme === 'dark';
            
            const content = document.createElement('div');
            content.style.cssText = `
                background: ${isDark ? '#1f2937' : 'white'} !important;
                border-radius: 16px !important;
                padding: 0 !important;
                max-width: 600px !important;
                width: 90% !important;
                max-height: 80vh !important;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
            `;
            
            // Header section
            const header = this.createHeader();
            content.appendChild(header);
            
            // Stats section
            const stats = this.createStatsSection();
            content.appendChild(stats);
            
            // Progress section
            const progressSection = this.createProgressSection();
            content.appendChild(progressSection);
            
            // Logs section
            const logsSection = this.createLogsSection();
            content.appendChild(logsSection);
            
            // Close button
            const closeBtn = this.createCloseButton();
            content.appendChild(closeBtn);
            
            return content;
        }
        
        /**
         * Create close button
         */
        createCloseButton() {
            const isDark = this.currentTheme === 'dark';
            
            const button = document.createElement('button');
            button.style.cssText = `
                position: absolute !important;
                top: 16px !important;
                right: 16px !important;
                width: 32px !important;
                height: 32px !important;
                border-radius: 50% !important;
                background: ${isDark ? '#374151' : '#e5e7eb'} !important;
                border: none !important;
                color: ${isDark ? '#9ca3af' : '#6b7280'} !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 16px !important;
                transition: all 0.2s !important;
                z-index: 10 !important;
            `;
            
            button.innerHTML = '✕';
            button.title = 'Close overlay';
            
            button.addEventListener('click', () => {
                this.hide();
            });
            
            button.addEventListener('mouseenter', () => {
                button.style.background = this.ORKG_RED;
                button.style.color = 'white';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.background = isDark ? '#374151' : '#e5e7eb';
                button.style.color = isDark ? '#9ca3af' : '#6b7280';
            });
            
            return button;
        }
        
        /**
         * Create header section
         */
        createHeader() {
            const isDark = this.currentTheme === 'dark';
            
            const header = document.createElement('div');
            header.style.cssText = `
                padding: 24px 24px 16px !important;
                background: ${isDark ? '#111827' : '#f9fafb'} !important;
                border-bottom: 1px solid ${isDark ? '#374151' : '#e5e7eb'} !important;
            `;
            
            header.innerHTML = `
            <div style="display: flex; align-items: start; gap: 16px;">
                <img 
                    src="${typeof chrome !== 'undefined' && chrome.runtime 
                        ? chrome.runtime.getURL('assets/icons/icon128.png') 
                        : ''}" 
                    alt="ORKG Annotator Logo" 
                    class="about-logo-img" 
                    style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;" 
                />
                <div style="flex: 1; padding-right: 32px;">
                    <h2 style="
                        margin: 0 0 4px 0;
                        font-size: 20px;
                        font-weight: 600;
                        color: ${isDark ? '#f3f4f6' : '#111827'};
                    ">
                        <span style="color: ${this.ORKG_RED};">ORKG</span> Paper Analysis
                    </h2>
                    <p style="
                        margin: 0;
                        font-size: 14px;
                        color: ${isDark ? '#9ca3af' : '#6b7280'};
                    ">
                        Extracting property values using AI
                    </p>
                </div>
            </div>
        `;
            
            return header;
        }
        
        /**
         * Create stats section
         */
        createStatsSection() {
            const isDark = this.currentTheme === 'dark';
            
            const stats = document.createElement('div');
            stats.style.cssText = `
                display: flex !important;
                gap: 24px !important;
                padding: 12px 24px !important;
                background: ${isDark ? '#1f2937' : 'white'} !important;
                border-bottom: 1px solid ${isDark ? '#374151' : '#e5e7eb'} !important;
                font-size: 13px !important;
                color: ${isDark ? '#9ca3af' : '#6b7280'} !important;
            `;
            
            stats.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="${this.ORKG_RED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span id="elapsed-time">00:00</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="${this.ORKG_RED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span><span id="log-count">0</span> logs</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="${this.ORKG_RED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span id="phase-text" style="color: ${this.ORKG_RED}; font-weight: 500;">Initializing...</span>
                </div>
            `;
            
            this.elapsedDisplay = stats.querySelector('#elapsed-time');
            this.logCountDisplay = stats.querySelector('#log-count');
            this.phaseText = stats.querySelector('#phase-text');
            
            return stats;
        }
        
        /**
         * Create progress section
         */
        createProgressSection() {
            const isDark = this.currentTheme === 'dark';
            
            const container = document.createElement('div');
            container.style.cssText = `
                padding: 16px 24px !important;
                background: ${isDark ? '#1f2937' : 'white'} !important;
                border-bottom: 1px solid ${isDark ? '#374151' : '#e5e7eb'} !important;
            `;
            
            container.innerHTML = `
                <div style="
                    background: ${isDark ? '#374151' : '#e5e7eb'};
                    border-radius: 6px;
                    height: 8px;
                    overflow: hidden;
                    position: relative;
                ">
                    <div id="progress-bar" style="
                        background: linear-gradient(90deg, ${this.ORKG_RED}, ${this.ORKG_RED_DARK});
                        height: 100%;
                        width: 0%;
                        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        border-radius: 6px;
                        position: relative;
                        overflow: hidden;
                    ">
                        <div style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                            animation: shimmer 2s infinite;
                        "></div>
                    </div>
                </div>
                <div style="
                    margin-top: 8px;
                    font-size: 12px;
                    color: ${isDark ? '#9ca3af' : '#6b7280'};
                    font-weight: 500;
                ">
                    <span id="progress-text" style="color: ${this.ORKG_RED}; font-weight: 600;">0%</span>
                    <span> complete</span>
                </div>
            `;
            
            this.progressBar = container.querySelector('#progress-bar');
            this.progressText = container.querySelector('#progress-text');
            
            return container;
        }
        
        /**
         * Create logs section
         */
        createLogsSection() {
            const isDark = this.currentTheme === 'dark';
            
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                flex: 1 !important;
                background: ${isDark ? '#111827' : '#f9fafb'} !important;
                padding: 16px !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                min-height: 200px !important;
            `;
            
            wrapper.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    color: ${isDark ? '#9ca3af' : '#6b7280'};
                    font-size: 12px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                ">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M8 9h8M8 13h6m-7 8h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="${this.ORKG_RED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>Analysis Logs</span>
                </div>
                <div id="logs-container" style="
                    flex: 1;
                    overflow-y: auto;
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.6;
                    color: ${isDark ? '#d1d5db' : '#4b5563'};
                    padding-right: 8px;
                "></div>
            `;
            
            this.logsContainer = wrapper.querySelector('#logs-container');
            
            return wrapper;
        }
        
        /**
         * Add a log message to the display
         */
        addLog(message, type = 'info') {
            const log = {
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                message: this.cleanMessage(message),
                type
            };
            
            this.logs.push(log);
            
            // Limit logs in memory
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(-this.maxLogs);
            }
            
            // Queue for rendering
            this.queueLogForRendering(log);
            
            // Update count
            this.updateLogCount();
        }
        
        /**
         * Clean message text for display
         */
        cleanMessage(message) {
            return message
                .replace(/[✅⚠️❌🔍📊🧠⏳🚀📨📋🤖🔬]/g, '')
                .trim();
        }
        
        /**
         * Queue log for rendering with performance optimization
         */
        queueLogForRendering(log) {
            this.renderQueue.push(log);
            
            if (!this.renderTimeout) {
                this.renderTimeout = requestAnimationFrame(() => {
                    this.renderQueuedLogs();
                });
            }
        }
        
        /**
         * Render queued logs with batching for performance
         */
        renderQueuedLogs() {
            if (!this.logsContainer || this.renderQueue.length === 0) {
                this.renderTimeout = null;
                return;
            }
            
            const isDark = this.currentTheme === 'dark';
            const fragment = document.createDocumentFragment();
            const logsToRender = this.renderQueue.splice(0, this.renderBatchSize);
            
            logsToRender.forEach(log => {
                const entry = document.createElement('div');
                entry.style.cssText = `
                    display: flex !important;
                    align-items: flex-start !important;
                    gap: 10px !important;
                    padding: 6px 0 !important;
                    border-bottom: 1px solid ${isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)'} !important;
                    animation: logFadeIn 0.3s ease !important;
                `;
                
                // Timestamp
                const timestamp = document.createElement('span');
                timestamp.style.cssText = `
                    color: ${isDark ? '#6b7280' : '#9ca3af'} !important;
                    font-size: 11px !important;
                    min-width: 65px !important;
                    opacity: 0.7 !important;
                `;
                timestamp.textContent = log.timestamp.toLocaleTimeString();
                
                // Icon
                const icon = document.createElement('span');
                icon.style.cssText = 'min-width: 16px !important; text-align: center !important;';
                icon.innerHTML = this.getLogIcon(log.type);
                
                // Message
                const message = document.createElement('span');
                message.style.cssText = `
                    flex: 1 !important;
                    color: ${this.getLogColor(log.type, isDark)} !important;
                    line-height: 1.4 !important;
                    word-break: break-word !important;
                `;
                message.textContent = log.message;
                
                entry.appendChild(timestamp);
                entry.appendChild(icon);
                entry.appendChild(message);
                
                fragment.appendChild(entry);
            });
            
            this.logsContainer.appendChild(fragment);
            
            // Remove old entries to maintain performance
            while (this.logsContainer.children.length > this.maxDisplayLogs) {
                this.logsContainer.removeChild(this.logsContainer.firstChild);
            }
            
            // Auto-scroll to bottom
            this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
            
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
         * Get icon HTML for log type
         */
        getLogIcon(type) {
            const icons = {
                'info': `<svg width="14" height="14" viewBox="0 0 24 24" fill="${this.ORKG_RED}"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 16v-4m0-4h.01" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`,
                'success': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="none" fill="currentColor"/></svg>',
                'warning': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="none" fill="currentColor"/></svg>',
                'error': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="none" fill="currentColor"/></svg>',
                'batch': `<svg width="14" height="14" viewBox="0 0 24 24" fill="${this.ORKG_RED}"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" stroke="none" fill="currentColor"/></svg>`,
                'property': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#8b5cf6"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" stroke="none" fill="currentColor"/></svg>',
                'embedding': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#8b5cf6"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="none" fill="currentColor"/></svg>',
                'ai': '<svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z" stroke="none" fill="currentColor"/></svg>'
            };
            return icons[type] || icons.info;
        }
        
        /**
         * Get color for log type
         */
        getLogColor(type, isDark) {
            const colors = {
                'info': this.ORKG_RED,
                'success': isDark ? '#86efac' : '#16a34a',
                'warning': isDark ? '#fde047' : '#ca8a04',
                'error': isDark ? '#fca5a5' : '#dc2626',
                'batch': this.ORKG_RED_LIGHT,
                'property': isDark ? '#c4b5fd' : '#7c3aed',
                'embedding': isDark ? '#c4b5fd' : '#7c3aed',
                'ai': isDark ? '#93c5fd' : '#3b82f6'
            };
            return colors[type] || (isDark ? '#d1d5db' : '#4b5563');
        }
        
        /**
         * Update log count display
         */
        updateLogCount() {
            if (this.logCountDisplay) {
                this.logCountDisplay.textContent = this.logs.length;
            }
        }
        
        /**
         * Start elapsed time timer
         */
        startElapsedTimer() {
            this.elapsedInterval = setInterval(() => {
                if (!this.startTime || !this.elapsedDisplay) return;
                
                const elapsed = Date.now() - this.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                
                this.elapsedDisplay.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }, 1000);
        }
        
        /**
         * Stop elapsed time timer
         */
        stopElapsedTimer() {
            if (this.elapsedInterval) {
                clearInterval(this.elapsedInterval);
                this.elapsedInterval = null;
            }
        }
        
        /**
         * Inject CSS styles for animations
         */
        injectStyles() {
            if (document.getElementById('rag-overlay-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'rag-overlay-styles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes logFadeIn {
                    from {
                        opacity: 0;
                        transform: translateX(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                
                #rag-loading-overlay * {
                    box-sizing: border-box !important;
                }
                
                #rag-loading-overlay *::-webkit-scrollbar {
                    width: 6px !important;
                }
                
                #rag-loading-overlay *::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1) !important;
                    border-radius: 3px !important;
                }
                
                #rag-loading-overlay *::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.2) !important;
                    border-radius: 3px !important;
                }
                
                #rag-loading-overlay *::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 0, 0, 0.3) !important;
                }
            `;
            document.head.appendChild(style);
        }
        
        /**
         * Check if overlay is ready
         */
        isReady() {
            return this.isInitialized;
        }
        
        /**
         * Get status
         */
        getStatus() {
            return {
                isInitialized: this.isInitialized,
                isShowing: this.isShowing,
                hasOverlay: !!this.overlay,
                logCount: this.logs.length
            };
        }
    }
    
    // Create singleton instance
    const overlayManager = new OverlayManager();
    
    // Export to global scope
    global.OverlayManager = OverlayManager;
    global.overlayManager = overlayManager;
    
    console.log('📢 OverlayManager exposed to global scope');
    
})(typeof window !== 'undefined' ? window : this);
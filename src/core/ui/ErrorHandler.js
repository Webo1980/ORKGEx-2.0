// ================================
// src/core/ui/ErrorHandler.js - FIXED: No Circular Dependencies
// ================================

import { eventManager } from '../../utils/eventManager.js';

export class ErrorHandler {
    constructor() {
        this.container = null;
        this.isInitialized = false;
        this.errors = [];
        this.maxErrors = 50;
        this.isHandlingError = false; // Prevent circular error handling
        
        // Error severity levels
        this.severityLevels = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'critical': 4
        };
        
        // Error type mappings
        this.errorTypeMap = {
            'TypeError': 'medium',
            'ReferenceError': 'high',
            'SyntaxError': 'critical',
            'NetworkError': 'medium',
            'ValidationError': 'low',
            'InitializationError': 'critical',
            'StateError': 'medium'
        };
        
        // User-friendly error messages
        this.userMessages = {
            'network': 'Network connection issue. Please check your internet connection.',
            'validation': 'Invalid input provided. Please check your data.',
            'initialization': 'Application failed to start properly. Please refresh the page.',
            'state': 'Application state error. Try refreshing the page.',
            'generic': 'An unexpected error occurred. Please try again.'
        };
        
        // Bind methods
        this.handleError = this.handleError.bind(this);
        this.handleGlobalError = this.handleGlobalError.bind(this);
    }
    
    async init() {
        if (this.isInitialized) {
            console.warn('ErrorHandler already initialized');
            return;
        }
        
        try {
            console.log('❌ Initializing ErrorHandler...');
            
            this.setupErrorContainer();
            this.setupEventListeners();
            this.setupGlobalErrorHandlers();
            
            this.isInitialized = true;
            console.log('✅ ErrorHandler initialized');
            
        } catch (error) {
            console.error('❌ ErrorHandler initialization failed:', error);
            // Don't throw here to prevent circular errors
            this.isInitialized = false;
        }
    }
    
    setupErrorContainer() {
        // Create error display container if it doesn't exist
        this.container = document.getElementById('error-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'error-container';
            this.container.className = 'error-container';
            this.container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 999999;
                background: rgba(0, 0, 0, 0.8);
                display: none;
                align-items: center;
                justify-content: center;
                padding: 20px;
            `;
            document.body.appendChild(this.container);
        }
    }
    
    setupEventListeners() {
        // Listen for error events
        eventManager.on('error:global', (errorData) => {
            // Prevent circular error handling
            if (!this.isHandlingError) {
                this.handleError(errorData);
            }
        });
        
        eventManager.on('error:show', (errorData) => {
            this.showErrorModal(errorData);
        });
        
        eventManager.on('error:clear', () => {
            this.clearErrors();
        });
    }
    
    setupGlobalErrorHandlers() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', this.handleGlobalError);
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError({
                error: event.reason,
                message: 'Unhandled Promise Rejection',
                filename: 'unknown',
                lineno: 0,
                colno: 0
            });
        });
    }
    
    handleGlobalError(event) {
        const errorData = {
            type: 'uncaught_error',
            error: event.error || event.reason,
            message: event.message || 'Uncaught error',
            filename: event.filename || 'unknown',
            line: event.lineno || 0,
            column: event.colno || 0,
            timestamp: new Date().toISOString(),
            stack: (event.error && event.error.stack) || 'No stack trace available'
        };
        
        this.handleError(errorData);
    }
    
    /**
     * Main error handling method
     * @param {Object|Error|string} error - Error to handle
     */
    handleError(error) {
        // Prevent circular error handling
        if (this.isHandlingError) {
            console.warn('Circular error handling prevented');
            return;
        }
        
        this.isHandlingError = true;
        
        try {
            // Normalize error object
            const normalizedError = this.normalizeError(error);
            
            // Log error safely (no external dependencies)
            this.logErrorSafely(normalizedError);
            
            // Store error in memory (not in StateManager to avoid circular dependency)
            this.storeError(normalizedError);
            
            // Determine error severity
            const severity = this.determineSeverity(normalizedError);
            
            // Show appropriate notification
            this.showErrorNotification(normalizedError, severity);
            
            // Handle critical errors
            if (severity === 'critical') {
                this.handleCriticalError(normalizedError);
            }
            
        } catch (handlingError) {
            // Fallback error handling - just log to console
            console.error('Error handler failed:', handlingError);
            console.error('Original error:', error);
        } finally {
            this.isHandlingError = false;
        }
    }
    
    /**
     * Normalize error to consistent format
     */
    normalizeError(error) {
        let normalized = {
            id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            severity: 'medium',
            handled: false
        };
        
        if (error instanceof Error) {
            normalized.name = error.name;
            normalized.message = error.message;
            normalized.stack = error.stack;
            normalized.type = error.constructor.name;
        } else if (typeof error === 'object' && error !== null) {
            normalized = { ...normalized, ...error };
        } else if (typeof error === 'string') {
            normalized.message = error;
            normalized.type = 'StringError';
        } else {
            normalized.message = 'Unknown error occurred';
            normalized.type = 'UnknownError';
        }
        
        // Ensure required fields exist
        normalized.name = normalized.name || normalized.type || 'Error';
        normalized.message = normalized.message || 'No message available';
        normalized.stack = normalized.stack || 'No stack trace available';
        
        return normalized;
    }
    
    /**
     * Log error safely without external dependencies
     */
    logErrorSafely(error) {
        const logEntry = {
            timestamp: error.timestamp,
            type: error.type || error.name,
            message: error.message,
            severity: error.severity,
            stack: error.stack
        };
        
        // Always log to console
        console.error('🚨 Application Error:', logEntry);
        
        // Store in browser console if available
        if (console.group) {
            console.group(`🚨 Error Details: ${error.type}`);
            console.error('Message:', error.message);
            console.error('Severity:', error.severity);
            console.error('Stack:', error.stack);
            console.error('Full Error:', JSON.stringify(error, null, 2));
            console.groupEnd();
        }
    }
    
    /**
     * Store error in memory (not StateManager)
     */
    storeError(error) {
        this.errors.push(error);
        
        // Limit stored errors
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }
    }
    
    /**
     * Determine error severity
     */
    determineSeverity(error) {
        try {
            // Check by error type
            if (error.type && this.errorTypeMap[error.type]) {
                return this.errorTypeMap[error.type];
            }
            
            // Check by error name
            if (error.name && this.errorTypeMap[error.name]) {
                return this.errorTypeMap[error.name];
            }
            
            // Check by message content
            const message = (error.message || '').toLowerCase();
            if (message.includes('network') || message.includes('fetch')) {
                return 'medium';
            }
            if (message.includes('critical') || message.includes('fatal')) {
                return 'critical';
            }
            if (message.includes('validation') || message.includes('invalid')) {
                return 'low';
            }
            
            // Default severity
            return 'medium';
            
        } catch (severityError) {
            console.warn('Failed to determine error severity:', severityError);
            return 'medium';
        }
    }
    
    /**
     * Show error notification to user
     */
    showErrorNotification(error, severity) {
        try {
            const userMessage = this.getUserFriendlyMessage(error);
            const duration = this.getNotificationDuration(severity);
            
            // Try to get toast manager safely
            const toastManager = this.getToastManagerSafely();
            
            if (toastManager && toastManager.isReady && toastManager.isReady()) {
                // Use toast notification
                const toastType = severity === 'critical' ? 'error' : 
                                 severity === 'high' ? 'error' :
                                 severity === 'medium' ? 'warning' : 'info';
                
                toastManager.show(userMessage, toastType, duration, {
                    actions: severity === 'critical' ? [
                        {
                            label: 'Reload Page',
                            handler: () => window.location.reload(),
                            type: 'primary'
                        }
                    ] : []
                });
            } else {
                // Fallback to browser alert for critical errors
                if (severity === 'critical') {
                    alert(`Critical Error: ${userMessage}\n\nPlease reload the page.`);
                } else {
                    console.error(`Error Notification: ${userMessage}`);
                }
            }
            
        } catch (notificationError) {
            console.error('Failed to show error notification:', notificationError);
            // Ultimate fallback
            console.error(`Error: ${error.message || 'Unknown error occurred'}`);
        }
    }
    
    /**
     * Get toast manager safely without circular dependencies
     */
    getToastManagerSafely() {
        try {
            // Try window.toastManager first
            if (window.toastManager && typeof window.toastManager.show === 'function') {
                return window.toastManager;
            }
            
            // Try serviceManager
            if (window.serviceManager && typeof window.serviceManager.getService === 'function') {
                return window.serviceManager.getService('toastManager');
            }
            
            // Try moduleLoader
            if (window.moduleLoader && typeof window.moduleLoader.getModule === 'function') {
                return window.moduleLoader.getModule('toastManager');
            }
            
            // Try orkgApp
            if (window.orkgApp && typeof window.orkgApp.getManager === 'function') {
                return window.orkgApp.getManager('toastManager');
            }
            
            return null;
        } catch (error) {
            console.warn('Failed to get toast manager safely:', error);
            return null;
        }
    }
    
    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(error) {
        try {
            const message = error.message || '';
            const type = (error.type || '').toLowerCase();
            
            // Check for specific error patterns
            if (message.includes('network') || message.includes('fetch') || type.includes('network')) {
                return this.userMessages.network;
            }
            
            if (message.includes('validation') || message.includes('invalid') || type.includes('validation')) {
                return this.userMessages.validation;
            }
            
            if (message.includes('initialization') || message.includes('init') || type.includes('initialization')) {
                return this.userMessages.initialization;
            }
            
            if (message.includes('state') || type.includes('state')) {
                return this.userMessages.state;
            }
            
            // For specific known errors, return the original message if it's user-friendly
            if (message.length < 100 && !message.includes('undefined') && !message.includes('null')) {
                return message;
            }
            
            // Generic fallback
            return this.userMessages.generic;
            
        } catch (messageError) {
            console.warn('Failed to get user friendly message:', messageError);
            return this.userMessages.generic;
        }
    }
    
    /**
     * Get notification duration based on severity
     */
    getNotificationDuration(severity) {
        const durations = {
            'low': 3000,
            'medium': 5000,
            'high': 7000,
            'critical': 10000
        };
        
        return durations[severity] || 5000;
    }
    
    /**
     * Handle critical errors
     */
    handleCriticalError(error) {
        console.error('🚨 CRITICAL ERROR:', error);
        
        // Show modal for critical errors
        this.showErrorModal(error);
        
        // Emit critical error event (but don't use StateManager)
        eventManager.emit('error:critical', error);
        
        // For truly critical errors, consider app restart
        if (error.message && error.message.includes('initialization')) {
            setTimeout(() => {
                if (confirm('The application encountered a critical error. Would you like to reload the page?')) {
                    window.location.reload();
                }
            }, 1000);
        }
    }
    
    /**
     * Show error modal
     */
    showErrorModal(error) {
        if (!this.container) {
            this.setupErrorContainer();
        }
        
        const errorId = error.id || `error_${Date.now()}`;
        
        this.container.innerHTML = `
            <div class="error-modal">
                <div class="error-modal-content">
                    <div class="error-modal-header">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h2 class="error-title">Application Error</h2>
                        <button class="error-close" onclick="this.closest('.error-container').style.display = 'none'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="error-modal-body">
                        <div class="error-message">
                            <strong>Error:</strong> ${this.escapeHtml(error.message || 'Unknown error')}
                        </div>
                        
                        <div class="error-severity">
                            <strong>Severity:</strong> ${error.severity || 'medium'}
                        </div>
                        
                        <details class="error-details">
                            <summary>Technical Details</summary>
                            <div class="error-technical">
                                <div><strong>Type:</strong> ${this.escapeHtml(error.type || error.name || 'Unknown')}</div>
                                <div><strong>Time:</strong> ${error.timestamp || new Date().toISOString()}</div>
                                <div><strong>ID:</strong> ${errorId}</div>
                                ${error.stack ? `<div><strong>Stack Trace:</strong><pre>${this.escapeHtml(error.stack)}</pre></div>` : ''}
                            </div>
                        </details>
                    </div>
                    
                    <div class="error-modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.error-container').style.display = 'none'">
                            <i class="fas fa-times"></i>
                            <span>Close</span>
                        </button>
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            <i class="fas fa-refresh"></i>
                            <span>Reload Page</span>
                        </button>
                        <button class="btn btn-secondary" onclick="window.errorHandler.copyErrorToClipboard('${errorId}')">
                            <i class="fas fa-copy"></i>
                            <span>Copy Error</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Show modal
        this.container.style.display = 'flex';
        
        // Make error handler available for button clicks
        window.errorHandler = this;
        
        // Auto-hide after 30 seconds for non-critical errors
        if (error.severity !== 'critical') {
            setTimeout(() => {
                if (this.container.style.display === 'flex') {
                    this.container.style.display = 'none';
                }
            }, 30000);
        }
    }
    
    /**
     * Copy error details to clipboard
     */
    async copyErrorToClipboard(errorId) {
        try {
            const error = this.errors.find(e => e.id === errorId);
            if (!error) {
                console.warn('Error not found for copying:', errorId);
                return;
            }
            
            const errorText = `
ORKG Annotator Error Report
===========================
ID: ${error.id}
Time: ${error.timestamp}
Type: ${error.type || error.name}
Severity: ${error.severity}
Message: ${error.message}

Stack Trace:
${error.stack}

Browser: ${navigator.userAgent}
URL: ${window.location.href}
            `.trim();
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(errorText);
                console.log('Error details copied to clipboard');
                
                // Show feedback
                const toastManager = this.getToastManagerSafely();
                if (toastManager) {
                    toastManager.success('Error details copied to clipboard', 2000);
                }
            } else {
                // Fallback: create temporary textarea
                const textarea = document.createElement('textarea');
                textarea.value = errorText;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                console.log('Error details copied to clipboard (fallback)');
            }
            
        } catch (copyError) {
            console.error('Failed to copy error to clipboard:', copyError);
        }
    }
    
    /**
     * Show error summary
     */
    showErrorSummary() {
        const recentErrors = this.errors.slice(-10);
        
        if (recentErrors.length === 0) {
            console.log('No recent errors to display');
            return;
        }
        
        console.group('🚨 Recent Errors Summary');
        recentErrors.forEach((error, index) => {
            console.log(`${index + 1}. [${error.severity}] ${error.type}: ${error.message}`);
        });
        console.groupEnd();
        
        return recentErrors;
    }
    
    /**
     * Clear stored errors
     */
    clearErrors() {
        this.errors = [];
        console.log('🧹 Error history cleared');
        
        // Hide error modal if showing
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
    
    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errors.length,
            bySeverity: {},
            byType: {},
            recent: this.errors.slice(-5)
        };
        
        this.errors.forEach(error => {
            // Count by severity
            const severity = error.severity || 'unknown';
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
            
            // Count by type
            const type = error.type || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        });
        
        return stats;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Add error programmatically
     */
    addError(error, severity = 'medium') {
        const normalizedError = this.normalizeError(error);
        normalizedError.severity = severity;
        normalizedError.programmatic = true;
        
        this.handleError(normalizedError);
        return normalizedError.id;
    }
    
    /**
     * Create error report
     */
    createErrorReport() {
        const stats = this.getErrorStats();
        
        const report = {
            timestamp: new Date().toISOString(),
            browser: navigator.userAgent,
            url: window.location.href,
            statistics: stats,
            recentErrors: this.errors.slice(-10).map(error => ({
                id: error.id,
                timestamp: error.timestamp,
                type: error.type,
                message: error.message,
                severity: error.severity
            }))
        };
        
        return report;
    }
    
    /**
     * Export errors for debugging
     */
    exportErrors() {
        const report = this.createErrorReport();
        
        try {
            const dataStr = JSON.stringify(report, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `orkg-errors-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            console.log('Error report exported');
            
        } catch (exportError) {
            console.error('Failed to export errors:', exportError);
            console.log('Error Report:', report);
        }
    }
    
    // Public API Methods
    
    /**
     * Check if error handler is ready
     */
    isReady() {
        return this.isInitialized && !this.isHandlingError;
    }
    
    /**
     * Get error handler status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isHandlingError: this.isHandlingError,
            errorCount: this.errors.length,
            maxErrors: this.maxErrors,
            hasContainer: !!this.container,
            stats: this.getErrorStats()
        };
    }
    
    /**
     * Get all errors
     */
    getAllErrors() {
        return [...this.errors];
    }
    
    /**
     * Get errors by severity
     */
    getErrorsBySeverity(severity) {
        return this.errors.filter(error => error.severity === severity);
    }
    
    /**
     * Get recent errors
     */
    getRecentErrors(count = 10) {
        return this.errors.slice(-count);
    }
    
    /**
     * Check if there are critical errors
     */
    hasCriticalErrors() {
        return this.errors.some(error => error.severity === 'critical');
    }
    
    /**
     * Cleanup error handler
     */
    cleanup() {
        console.log('🧹 ErrorHandler cleanup...');
        
        // Remove event listeners
        window.removeEventListener('error', this.handleGlobalError);
        window.removeEventListener('unhandledrejection', this.handleGlobalError);
        
        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // Clear errors
        this.errors = [];
        
        // Remove global reference
        if (window.errorHandler === this) {
            delete window.errorHandler;
        }
        
        // Reset state
        this.container = null;
        this.isInitialized = false;
        this.isHandlingError = false;
        
        console.log('✅ ErrorHandler cleanup completed');
    }
}
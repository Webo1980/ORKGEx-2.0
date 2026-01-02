// src/utils/errorHandling.js

/**
 * Error handling utilities for initialization errors
 */

/**
 * Show initialization error to user
 */
export function showInitializationError(error) {
    const container = document.querySelector('.popup-container');
    if (container) {
        container.innerHTML = `
            <div class="initialization-error">
                <div class="error-content">
                    <div class="error-icon">⚠️</div>
                    <h2>Initialization Failed</h2>
                    <p>The ORKG Annotator failed to start properly. This might be due to a temporary issue or browser restrictions.</p>
                    <div class="error-actions">
                        <button class="retry-btn" data-action="retry">
                            <i class="fas fa-refresh"></i>
                            Retry
                        </button>
                        <button class="details-btn" data-action="details">
                            <i class="fas fa-info-circle"></i>
                            Details
                        </button>
                        <button class="report-btn" data-action="report">
                            <i class="fas fa-bug"></i>
                            Report
                        </button>
                    </div>
                    <div class="error-details hidden">
                        <h3>Error Information:</h3>
                        <pre>${error.message || 'Unknown error occurred'}</pre>
                        <h3>Troubleshooting Steps:</h3>
                        <ul>
                            <li>Refresh the page and try again</li>
                            <li>Check if you're on a supported academic website</li>
                            <li>Ensure your internet connection is stable</li>
                            <li>Try disabling other extensions temporarily</li>
                            <li>Clear browser cache and cookies</li>
                            <li>Update your Chrome browser to the latest version</li>
                            <li>Contact support if the problem persists</li>
                        </ul>
                        <h3>System Information:</h3>
                        <ul>
                            <li>Browser: ${navigator.userAgent}</li>
                            <li>URL: ${window.location.href}</li>
                            <li>Time: ${new Date().toISOString()}</li>
                            <li>Error: ${error.stack || error.message || 'No details available'}</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        // Bind event handlers
        bindErrorHandlers();
    }
}

/**
 * Bind event handlers for error UI
 */
function bindErrorHandlers() {
    // Retry button
    const retryBtn = document.querySelector('[data-action="retry"]');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }
    
    // Details button
    const detailsBtn = document.querySelector('[data-action="details"]');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', toggleErrorDetails);
    }
    
    // Report button
    const reportBtn = document.querySelector('[data-action="report"]');
    if (reportBtn) {
        reportBtn.addEventListener('click', reportError);
    }
}

/**
 * Toggle error details visibility
 */
function toggleErrorDetails() {
    const details = document.querySelector('.error-details');
    const button = document.querySelector('[data-action="details"]');
    
    if (details && button) {
        const isHidden = details.classList.contains('hidden');
        
        if (isHidden) {
            details.classList.remove('hidden');
            button.innerHTML = '<i class="fas fa-times"></i> Hide';
        } else {
            details.classList.add('hidden');
            button.innerHTML = '<i class="fas fa-info-circle"></i> Details';
        }
    }
}

/**
 * Report error to support
 */
function reportError() {
    const errorInfo = {
        message: 'Initialization failed',
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
    };
    
    const subject = encodeURIComponent('ORKG Annotator Error Report');
    const body = encodeURIComponent(`Error Report:
    
Error: Initialization failed
Browser: ${errorInfo.userAgent}
URL: ${errorInfo.url}
Time: ${errorInfo.timestamp}

Additional details:
Please describe what you were doing when this error occurred.
`);
    
    window.open(`mailto:orkg@tib.eu?subject=${subject}&body=${body}`);
}
// ================================
// src/core/content/problems/ThresholdMessage.js - Smart Message Management
// ================================

export class ThresholdMessage {
    constructor(options = {}) {
        this.options = {
            hideDelay: 3000,
            animationDuration: 300,
            ...options
        };
        
        this.container = null;
        this.messageElement = null;
        this.isShowing = false;
        this.hideTimeout = null;
        this.lastMatchCount = -1;
        this.hasUserInteracted = false;
        this.consecutiveEmptyCount = 0;
    }
    
    mount(container) {
        this.container = container;
        this.render();
    }
    
    render() {
        if (!this.container) return;
        
        this.messageElement = document.createElement('div');
        this.messageElement.className = 'threshold-message';
        this.messageElement.style.display = 'none';
        
        this.container.appendChild(this.messageElement);
    }
    
    /**
     * Smart message management - only show when needed
     * Fix #3: Better handling to avoid repetitive messages
     */
    update(matchCount, threshold) {
        // If user found matches, hide message and mark as interacted
        if (matchCount > 0) {
            this.hide();
            this.lastMatchCount = matchCount;
            this.hasUserInteracted = true;
            this.consecutiveEmptyCount = 0;
            return;
        }
        
        // Don't show message repeatedly for same state
        if (matchCount === this.lastMatchCount && this.hasUserInteracted) {
            return;
        }
        
        // Only show message on first empty result or after user interaction
        if (matchCount === 0) {
            this.consecutiveEmptyCount++;
            
            // Only show message on first empty or after significant interaction
            if (this.consecutiveEmptyCount === 1 || (!this.hasUserInteracted && this.lastMatchCount > 0)) {
                this.show(threshold);
            }
        }
        
        this.lastMatchCount = matchCount;
    }
    
    show(threshold) {
        if (!this.messageElement || this.isShowing) return;
        
        const message = this.createMessage(threshold);
        this.messageElement.innerHTML = message;
        
        // Show with animation
        this.messageElement.style.display = 'block';
        this.messageElement.classList.remove('fade-out');
        this.messageElement.classList.add('fade-in');
        
        this.isShowing = true;
        
        // Clear existing timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        
        // Auto-hide after delay if configured
        if (this.options.hideDelay > 0) {
            this.hideTimeout = setTimeout(() => {
                this.hide();
            }, this.options.hideDelay);
        }
    }
    
    hide() {
        if (!this.messageElement || !this.isShowing) return;
        
        // Clear timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        // Hide with animation
        this.messageElement.classList.remove('fade-in');
        this.messageElement.classList.add('fade-out');
        
        setTimeout(() => {
            if (this.messageElement) {
                this.messageElement.style.display = 'none';
            }
            this.isShowing = false;
        }, this.options.animationDuration);
    }
    
    createMessage(threshold) {
        const percentage = Math.round(threshold * 100);
        
        let suggestion = '';
        let icon = 'fa-info-circle';
        let messageClass = 'info';
        
        if (threshold > 0.7) {
            suggestion = 'Try lowering the threshold to find more matches.';
            icon = 'fa-arrow-down';
            messageClass = 'warning';
        } else if (threshold > 0.3) {
            suggestion = 'Try adjusting the threshold or the similarity might be too low.';
            icon = 'fa-adjust';
            messageClass = 'info';
        } else {
            suggestion = 'The problems might be very different. Consider using the AI-generated problem.';
            icon = 'fa-lightbulb';
            messageClass = 'suggestion';
        }
        
        return `
            <div class="threshold-message-content ${messageClass}">
                <div class="message-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="message-text">
                    <p>No problems match the current threshold (${percentage}%).</p>
                    <small>${suggestion}</small>
                </div>
                <button class="message-close" aria-label="Dismiss message">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    reset() {
        this.hide();
        this.lastMatchCount = -1;
        this.hasUserInteracted = false;
        this.consecutiveEmptyCount = 0;
    }
    
    destroy() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        
        if (this.messageElement && this.messageElement.parentNode) {
            this.messageElement.parentNode.removeChild(this.messageElement);
        }
        
        this.container = null;
        this.messageElement = null;
    }
}

export default ThresholdMessage;
// ================================
// src/core/services/BaseExtractorService.js
// Base class for all extractors with shared tab handling logic
// ================================

export class BaseExtractorService {
    constructor(config = {}) {
        this.config = {
            timeout: 10000,
            useActiveTab: true,
            tabId: null, // Can be set explicitly
            ...config
        };
        
        this.currentTab = null;
        this.isInitialized = false;
    }
    
    async init() {
        console.log('🔧 Initializing BaseExtractorService...');
        
        // Get current tab info
        if (this.config.useActiveTab) {
            this.currentTab = await this.getCurrentTab();
            if (this.currentTab) {
                this.config.tabId = this.currentTab.id;
                console.log(`📍 Using tab: ${this.currentTab.title} (ID: ${this.currentTab.id})`);
            }
        }
        
        this.isInitialized = true;
    }
    
    /**
     * Get the current active tab
     */
    async getCurrentTab() {
        try {
            // Check if we're in Chrome extension context
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                return tab;
            }
            
            // Fallback for non-extension context
            return {
                id: 'current',
                url: window.location.href,
                title: document.title
            };
        } catch (error) {
            console.warn('Could not get current tab:', error);
            return null;
        }
    }
    
    /**
     * Execute a function in the target tab and return results
     */
    async executeInTab(func, args = []) {
        if (!this.config.tabId) {
            throw new Error('No tab ID available for extraction');
        }
        
        try {
            // For Chrome extension context
            if (typeof chrome !== 'undefined' && chrome.scripting) {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: this.config.tabId },
                    func: func,
                    args: args
                });
                
                if (chrome.runtime.lastError) {
                    throw new Error(chrome.runtime.lastError.message);
                }
                
                return results?.[0]?.result;
            }
            
            // Fallback: execute directly
            return func(...args);
            
        } catch (error) {
            console.error('Failed to execute in tab:', error);
            throw error;
        }
    }
    
    /**
     * Send a message to the content script in the target tab
     */
    async sendToTab(action, data = {}) {
        if (!this.config.tabId) {
            throw new Error('No tab ID available for messaging');
        }
        
        return new Promise((resolve, reject) => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.sendMessage(
                    this.config.tabId,
                    { action, ...data },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            } else {
                reject(new Error('Chrome tabs API not available'));
            }
        });
    }
    
    /**
     * Inject a content script if needed
     */
    async injectContentScript(scriptPath) {
        if (!this.config.tabId) {
            throw new Error('No tab ID available for script injection');
        }
        
        try {
            if (typeof chrome !== 'undefined' && chrome.scripting) {
                await chrome.scripting.executeScript({
                    target: { tabId: this.config.tabId },
                    files: [scriptPath]
                });
                console.log(`✅ Injected script: ${scriptPath}`);
            }
        } catch (error) {
            console.warn('Could not inject script:', error);
        }
    }
    
    /**
     * Check if element is visible (shared utility)
     */
    isElementVisible(element) {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               parseFloat(style.opacity) > 0 &&
               rect.width > 0 && 
               rect.height > 0;
    }
    
    /**
     * Check if element is in viewport (shared utility)
     */
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && 
               rect.bottom > 0 &&
               rect.left < window.innerWidth && 
               rect.right > 0;
    }
    
    /**
     * Get element position (shared utility)
     */
    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        return {
            top: rect.top + scrollTop,
            left: rect.left + scrollLeft,
            bottom: rect.bottom + scrollTop,
            right: rect.right + scrollLeft,
            width: rect.width,
            height: rect.height,
            viewport: {
                top: rect.top,
                left: rect.left,
                bottom: rect.bottom,
                right: rect.right
            }
        };
    }
    
    /**
     * Wait for condition with timeout
     */
    async waitFor(condition, timeout = this.config.timeout) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (await condition()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error('Timeout waiting for condition');
    }
    
    /**
     * Validate that we're extracting from the right context
     */
    async validateExtractionContext() {
        if (!this.currentTab) {
            this.currentTab = await this.getCurrentTab();
        }
        
        // Check if we're on a research article page
        const isResearchPage = await this.executeInTab(() => {
            // Look for common research article indicators
            const indicators = [
                document.querySelector('meta[name="citation_title"]'),
                document.querySelector('meta[name="dc.title"]'),
                document.querySelector('[itemtype*="ScholarlyArticle"]'),
                document.querySelector('.article-content'),
                document.querySelector('#article'),
                document.title.toLowerCase().includes('article')
            ];
            
            return indicators.some(indicator => !!indicator);
        });
        
        if (!isResearchPage) {
            console.warn('⚠️ Current tab may not be a research article');
        }
        
        return isResearchPage;
    }
    
    /**
     * Get tab information
     */
    getTabInfo() {
        return {
            id: this.config.tabId,
            url: this.currentTab?.url,
            title: this.currentTab?.title,
            isInitialized: this.isInitialized
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.currentTab = null;
        this.config.tabId = null;
        this.isInitialized = false;
    }
}
export default BaseExtractorService;
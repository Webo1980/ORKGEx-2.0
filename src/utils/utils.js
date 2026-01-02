// ================================
// src/utils/utils.js - Enhanced with UI Utilities
// ================================

/**
 * Utility functions for ORKG Annotator
 */



/**
 * Generic toggle expansion functionality
 * @param {Element} button - The expand/collapse button
 * @param {Element} content - The content to expand/collapse
 * @param {Object} options - Configuration options
 */
export function toggleExpansion(button, content, options = {}) {
    const defaults = {
        expandedClass: 'expanded',
        expandText: 'Show more',
        collapseText: 'Show less',
        expandIcon: 'fa-chevron-down',
        collapseIcon: 'fa-chevron-up',
        animationDuration: 300
    };
    
    const config = { ...defaults, ...options };
    
    const expandText = button.querySelector('.expand-text');
    const expandIcon = button.querySelector('i');
    
    if (!expandText || !expandIcon || !content) return;
    
    const isExpanded = content.classList.contains(config.expandedClass);
    
    if (isExpanded) {
        content.classList.remove(config.expandedClass);
        expandText.textContent = config.expandText;
        expandIcon.className = `fas ${config.expandIcon}`;
    } else {
        content.classList.add(config.expandedClass);
        expandText.textContent = config.collapseText;
        expandIcon.className = `fas ${config.collapseIcon}`;
    }
    
    return !isExpanded;
}

/**
 * Generic input validation
 * @param {Element} input - The input element to validate
 * @param {Object} rules - Validation rules
 * @returns {boolean} - Whether the input is valid
 */
export function validateInput(input, rules = {}) {
    const value = input.value.trim();
    
    // Clear previous validation state
    clearFieldError(input);
    
    // Required validation
    if (rules.required && !value) {
        showFieldError(input, rules.requiredMessage || 'This field is required');
        return false;
    }
    
    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
        showFieldError(input, rules.minLengthMessage || `Must be at least ${rules.minLength} characters long`);
        return false;
    }
    
    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
        showFieldError(input, rules.maxLengthMessage || `Must be no more than ${rules.maxLength} characters long`);
        return false;
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
        showFieldError(input, rules.patternMessage || 'Invalid format');
        return false;
    }
    
    // Custom validation function
    if (rules.customValidator && typeof rules.customValidator === 'function') {
        const customResult = rules.customValidator(value);
        if (customResult !== true) {
            showFieldError(input, customResult || 'Invalid value');
            return false;
        }
    }
    
    // If we get here, validation passed
    input.classList.add('valid');
    return true;
}

/**
 * Show field error message
 * @param {Element} input - The input element
 * @param {string} message - Error message to display
 */
export function showFieldError(input, message) {
    input.classList.add('invalid');
    clearFieldError(input);
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    
    // Insert after the input
    input.parentNode.appendChild(errorElement);
}

/**
 * Clear field error message
 * @param {Element} input - The input element
 */
export function clearFieldError(input) {
    input.classList.remove('invalid', 'valid');
    
    const existingError = input.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
}

/**
 * Handle input change with real-time validation
 * @param {Event} event - The input event
 * @param {Object} validationRules - Validation rules
 */
export function handleInputChange(event, validationRules = {}) {
    const input = event.target;
    
    // Remove validation classes for real-time feedback
    input.classList.remove('invalid', 'valid');
    
    // Only validate if input has content or is required
    if (input.value.trim() || validationRules.required) {
        const isValid = validateInput(input, validationRules);
        
        // Add appropriate class
        if (isValid) {
            input.classList.add('valid');
        }
    }
    
    // Emit custom event for components to listen to
    input.dispatchEvent(new CustomEvent('input:validated', {
        detail: {
            isValid: !input.classList.contains('invalid'),
            value: input.value.trim()
        }
    }));
}


/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately
 */
export function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 */
export function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return dateObj.toLocaleDateString('en-US', formatOptions);
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 */
export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Escape HTML characters
 * @param {string} text - Text to escape
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Generate unique ID
 * @param {string} prefix - Optional prefix
 */
export function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = deepClone(obj[key]);
        });
        return cloned;
    }
}


// Error handling
export function createErrorHandler(context = 'Unknown') {
    return function(error) {
        console.error(`[${context}] Error:`, error);
        showToast(`${context} failed: ${error.message || 'Unknown error'}`, 'error');
    };
}

/**
 * Get nested object property safely
 * @param {Object} obj - Object to search
 * @param {string} path - Dot notation path
 * @param {any} defaultValue - Default value if not found
 */
export function getNestedProperty(obj, path, defaultValue = undefined) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
}

/**
 * Set nested object property
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {any} value - Value to set
 */
export function setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return obj;
}

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (i === maxRetries) {
                throw lastError;
            }
            
            const delay = baseDelay * Math.pow(2, i);
            await sleep(delay);
        }
    }
}

/**
 * Format file size to human readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 */
export function formatFileSize(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Check if element is in viewport
 * @param {Element} element - Element to check
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Smooth scroll to element
 * @param {Element|string} target - Element or selector to scroll to
 * @param {number} offset - Offset from top in pixels
 */
export function scrollToElement(target, offset = 0) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    
    if (element) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'success');
        return true;
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showToast('Copied to clipboard', 'success');
            return true;
        } catch (err) {
            showToast('Failed to copy to clipboard', 'error');
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

/**
 * Download data as file
 * @param {string} data - Data to download
 * @param {string} filename - Name of the file
 * @param {string} type - MIME type
 */
export function downloadAsFile(data, filename, type = 'application/json') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

/**
 * Parse query string parameters
 * @param {string} queryString - Query string to parse
 */
export function parseQueryString(queryString = window.location.search) {
    const params = new URLSearchParams(queryString);
    const result = {};
    
    for (const [key, value] of params.entries()) {
        result[key] = value;
    }
    
    return result;
}

/**
 * Create query string from object
 * @param {Object} params - Parameters object
 */
export function createQueryString(params) {
    const searchParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
            searchParams.append(key, params[key]);
        }
    });
    
    return searchParams.toString();
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 */
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to kebab case
 * @param {string} str - String to convert
 */
export function kebabCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}

/**
 * Convert string to camel case
 * @param {string} str - String to convert
 */
export function camelCase(str) {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '');
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add
 */
export function truncate(str, length = 100, suffix = '...') {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Remove HTML tags from string
 * @param {string} html - HTML string
 */
export function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 */
export function isEmpty(obj) {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    return Object.keys(obj).length === 0;
}

/**
 * Get random element from array
 * @param {Array} arr - Array to pick from
 */
export function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle array
 * @param {Array} arr - Array to shuffle
 */
export function shuffle(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Group array by key
 * @param {Array} arr - Array to group
 * @param {string|Function} key - Key to group by
 */
export function groupBy(arr, key) {
    const keyFn = typeof key === 'function' ? key : item => item[key];
    
    return arr.reduce((groups, item) => {
        const group = keyFn(item);
        if (!groups[group]) groups[group] = [];
        groups[group].push(item);
        return groups;
    }, {});
}

/**
 * Check if code is running in development mode
 */
export function isDevelopment() {
    return typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development';
}

/**
 * Log message only in development
 * @param {...any} args - Arguments to log
 */
export function devLog(...args) {
    if (isDevelopment()) {
        console.log(...args);
    }
}

export default {
    toggleExpansion,
    validateInput,
    showFieldError,
    clearFieldError,
    handleInputChange,
    debounce,
    throttle,
    formatDate,
    isValidEmail,
    isValidUrl,
    escapeHtml,
    generateId,
    deepClone,
    getNestedProperty,
    setNestedProperty,
    sleep,
    retryWithBackoff,
    formatFileSize,
    isInViewport,
    scrollToElement,
    copyToClipboard,
    downloadAsFile,
    parseQueryString,
    createQueryString,
    capitalize,
    kebabCase,
    camelCase,
    truncate,
    stripHtml,
    isEmpty,
    randomElement,
    shuffle,
    groupBy,
    isDevelopment,
    devLog
};
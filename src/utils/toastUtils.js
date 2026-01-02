// ================================
// src/utils/toastUtils.js - Centralized Toast Access Utilities
// ================================

/**
 * Centralized toast utilities for consistent toast management across the app
 * This ensures all components use the same ToastManager instance
 */

/**
 * Get the global toast manager instance
 * @returns {ToastManager|null} The toast manager instance or null if not available
 */
function getToastManager() {
    // Try multiple ways to get the toast manager
    if (window.toastManager) {
        return window.toastManager;
    }
    
    if (window.orkgApp && window.orkgApp.getManager) {
        return window.orkgApp.getManager('toastManager');
    }
    
    if (window.moduleLoader && window.moduleLoader.getModule) {
        return window.moduleLoader.getModule('toastManager');
    }
    
    return null;
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds (null for default)
 * @param {Object} options - Additional options for the toast
 * @returns {string|null} Toast ID or null if failed
 */
export function showToast(message, type = 'info', duration = null, options = {}) {
    const toastManager = getToastManager();
    
    if (toastManager && toastManager.isReady()) {
        return toastManager.show(message, type, duration, options);
    } else {
        // Fallback to console if toast manager not available
        console.log(`Toast (${type}):`, message);
        return null;
    }
}

/**
 * Show a success toast
 * @param {string} message - The success message
 * @param {number} duration - Duration in milliseconds
 * @param {Object} options - Additional options
 * @returns {string|null} Toast ID or null if failed
 */
export function showSuccess(message, duration = 3000, options = {}) {
    return showToast(message, 'success', duration, options);
}

/**
 * Show an error toast
 * @param {string} message - The error message
 * @param {number} duration - Duration in milliseconds
 * @param {Object} options - Additional options
 * @returns {string|null} Toast ID or null if failed
 */
export function showError(message, duration = 5000, options = {}) {
    return showToast(message, 'error', duration, options);
}

/**
 * Show a warning toast
 * @param {string} message - The warning message
 * @param {number} duration - Duration in milliseconds
 * @param {Object} options - Additional options
 * @returns {string|null} Toast ID or null if failed
 */
export function showWarning(message, duration = 4000, options = {}) {
    return showToast(message, 'warning', duration, options);
}

/**
 * Show an info toast
 * @param {string} message - The info message
 * @param {number} duration - Duration in milliseconds
 * @param {Object} options - Additional options
 * @returns {string|null} Toast ID or null if failed
 */
export function showInfo(message, duration = 3000, options = {}) {
    return showToast(message, 'info', duration, options);
}

/**
 * Show a confirmation dialog
 * @param {string} message - The confirmation message
 * @param {Function} onConfirm - Callback when user confirms
 * @param {Function} onCancel - Callback when user cancels
 * @param {string} type - The type of confirmation (warning, danger, info, success)
 * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
 */
export function showConfirmation(message, onConfirm, onCancel = null, type = 'warning') {
    const toastManager = getToastManager();
    
    if (toastManager && toastManager.isReady()) {
        return toastManager.showConfirmation(message, onConfirm, onCancel, type);
    } else {
        // Fallback to native confirm dialog
        console.log(`Confirmation (${type}):`, message);
        const result = confirm(message);
        
        if (result && onConfirm) {
            onConfirm();
        } else if (!result && onCancel) {
            onCancel();
        }
        
        return Promise.resolve(result);
    }
}

/**
 * Hide a specific toast
 * @param {string} toastId - The ID of the toast to hide
 */
export function hideToast(toastId) {
    const toastManager = getToastManager();
    
    if (toastManager && toastManager.isReady()) {
        toastManager.hide(toastId);
    }
}

/**
 * Clear all toasts
 */
export function clearAllToasts() {
    const toastManager = getToastManager();
    
    if (toastManager && toastManager.isReady()) {
        toastManager.clearAll();
    }
}

/**
 * Get toast manager status
 * @returns {Object|null} Status object or null if not available
 */
export function getToastStatus() {
    const toastManager = getToastManager();
    
    if (toastManager && toastManager.getStatus) {
        return toastManager.getStatus();
    }
    
    return null;
}

/**
 * Check if toast manager is ready
 * @returns {boolean} True if toast manager is ready
 */
export function isToastManagerReady() {
    const toastManager = getToastManager();
    return toastManager && toastManager.isReady();
}

/**
 * Show a loading toast that can be updated
 * @param {string} message - Initial loading message
 * @param {Object} options - Additional options
 * @returns {Object} Object with methods to update and hide the loading toast
 */
export function showLoadingToast(message = 'Loading...', options = {}) {
    const loadingOptions = {
        persistent: true,
        closable: false,
        ...options
    };
    
    const toastId = showToast(message, 'info', null, loadingOptions);
    
    return {
        id: toastId,
        update: (newMessage, type = 'info') => {
            if (toastId) {
                hideToast(toastId);
                return showToast(newMessage, type, null, loadingOptions);
            }
            return null;
        },
        complete: (message = 'Complete!', type = 'success') => {
            if (toastId) {
                hideToast(toastId);
            }
            return showToast(message, type, 3000);
        },
        error: (message = 'Failed!') => {
            if (toastId) {
                hideToast(toastId);
            }
            return showToast(message, 'error', 5000);
        },
        hide: () => {
            if (toastId) {
                hideToast(toastId);
            }
        }
    };
}

/**
 * Show a progress toast with progress bar
 * @param {string} message - The progress message
 * @param {number} progress - Progress percentage (0-100)
 * @param {Object} options - Additional options
 * @returns {string|null} Toast ID or null if failed
 */
export function showProgressToast(message, progress = 0, options = {}) {
    const progressOptions = {
        persistent: true,
        closable: false,
        progress: Math.max(0, Math.min(100, progress)),
        ...options
    };
    
    return showToast(message, 'info', null, progressOptions);
}

/**
 * Show a toast with custom actions
 * @param {string} message - The message to display
 * @param {Array} actions - Array of action objects with {label, handler, type, icon}
 * @param {string} type - The type of toast
 * @param {Object} options - Additional options
 * @returns {string|null} Toast ID or null if failed
 */
export function showActionToast(message, actions = [], type = 'info', options = {}) {
    const actionOptions = {
        actions,
        persistent: true,
        ...options
    };
    
    return showToast(message, type, null, actionOptions);
}

/**
 * Show a quick notification (short duration, minimal styling)
 * @param {string} message - The notification message
 * @param {string} type - The type of notification
 * @returns {string|null} Toast ID or null if failed
 */
export function showQuickNotification(message, type = 'info') {
    return showToast(message, type, 2000, {
        closable: false,
        minimal: true
    });
}

/**
 * Batch show multiple toasts with delay between them
 * @param {Array} toasts - Array of toast objects with {message, type, duration, options}
 * @param {number} delay - Delay between toasts in milliseconds
 * @returns {Promise<Array>} Promise that resolves to array of toast IDs
 */
export async function showBatchToasts(toasts, delay = 500) {
    const toastIds = [];
    
    for (let i = 0; i < toasts.length; i++) {
        const toast = toasts[i];
        const toastId = showToast(
            toast.message,
            toast.type || 'info',
            toast.duration || null,
            toast.options || {}
        );
        
        toastIds.push(toastId);
        
        // Add delay before next toast (except for the last one)
        if (i < toasts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    return toastIds;
}

/**
 * Show a persistent notification that stays until manually dismissed
 * @param {string} message - The notification message
 * @param {string} type - The type of notification
 * @param {Object} options - Additional options
 * @returns {string|null} Toast ID or null if failed
 */
export function showPersistentNotification(message, type = 'info', options = {}) {
    const persistentOptions = {
        persistent: true,
        duration: null,
        closable: true,
        ...options
    };
    
    return showToast(message, type, null, persistentOptions);
}

/**
 * Show system notification (if permissions available) and fallback to toast
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} options - Notification options
 * @returns {Promise<string|null>} Promise that resolves to toast ID or null
 */
export async function showSystemNotification(title, message, options = {}) {
    // Try to show system notification first
    if ('Notification' in window) {
        try {
            // Request permission if not granted
            if (Notification.permission === 'default') {
                await Notification.requestPermission();
            }
            
            // Show system notification if permission granted
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body: message,
                    icon: options.icon || '/icons/icon-48.png',
                    ...options
                });
                
                // Also show toast for consistency
                return showInfo(`${title}: ${message}`, 3000);
            }
        } catch (error) {
            console.warn('Failed to show system notification:', error);
        }
    }
    
    // Fallback to toast notification
    return showInfo(`${title}: ${message}`, 4000);
}

// Export a default object with all methods for convenience
export default {
    show: showToast,
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
    confirmation: showConfirmation,
    hide: hideToast,
    clear: clearAllToasts,
    status: getToastStatus,
    isReady: isToastManagerReady,
    loading: showLoadingToast,
    progress: showProgressToast,
    action: showActionToast,
    quick: showQuickNotification,
    batch: showBatchToasts,
    persistent: showPersistentNotification,
    system: showSystemNotification
};
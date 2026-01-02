// ================================
// src/utils/httpClient.js - Generic HTTP Client Utility
// ================================

/**
 * Generic HTTP client utility for making API requests
 * Used by services throughout the application
 */

export class HttpClient {
    /**
     * Make an HTTP request with automatic error handling and timeout
     * @param {string} url - The URL to make the request to
     * @param {Object} options - Request options
     * @returns {Promise<any>} Response data
     */
    static async makeRequest(url, options = {}) {
        const {
            method = 'GET',
            headers = {},
            body = null,
            timeout = 30000,
            responseType = 'json',
            retries = 0,
            retryDelay = 1000,
            signal = null
        } = options;

        // Default headers
        const defaultHeaders = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };

        // Merge headers
        const finalHeaders = {
            ...defaultHeaders,
            ...headers
        };

        // Remove Content-Type for FormData
        if (body instanceof FormData) {
            delete finalHeaders['Content-Type'];
        }

        // Create abort controller for timeout
        const abortController = new AbortController();
        const timeoutId = timeout ? setTimeout(() => abortController.abort(), timeout) : null;

        // Use provided signal or our timeout signal
        const finalSignal = signal || abortController.signal;

        try {
            const fetchOptions = {
                method,
                headers: finalHeaders,
                signal: finalSignal
            };

            // Add body if present and not GET/HEAD request
            if (body && !['GET', 'HEAD'].includes(method.toUpperCase())) {
                if (typeof body === 'object' && !(body instanceof FormData)) {
                    fetchOptions.body = JSON.stringify(body);
                } else {
                    fetchOptions.body = body;
                }
            }

            // Make the request
            const response = await fetch(url, fetchOptions);

            // Clear timeout
            if (timeoutId) clearTimeout(timeoutId);

            // Check if response is ok
            if (!response.ok) {
                const errorBody = await this.parseErrorResponse(response);
                const error = new Error(errorBody.message || `HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.statusText = response.statusText;
                error.response = errorBody;
                throw error;
            }

            // Parse response based on type
            return await this.parseResponse(response, responseType);

        } catch (error) {
            // Clear timeout
            if (timeoutId) clearTimeout(timeoutId);

            // Handle abort/timeout
            if (error.name === 'AbortError') {
                const timeoutError = new Error(`Request timeout after ${timeout}ms`);
                timeoutError.code = 'TIMEOUT';
                throw timeoutError;
            }

            // Retry logic
            if (retries > 0 && this.shouldRetry(error)) {
                console.log(`🔄 Retrying request (${retries} attempts remaining)...`);
                await this.delay(retryDelay);
                return this.makeRequest(url, {
                    ...options,
                    retries: retries - 1,
                    retryDelay: retryDelay * 2 // Exponential backoff
                });
            }

            // Re-throw the error
            throw error;
        }
    }

    /**
     * Parse response based on content type
     */
    static async parseResponse(response, responseType) {
        const contentType = response.headers.get('Content-Type') || '';

        // If specific response type is requested
        if (responseType === 'blob') {
            return await response.blob();
        }
        if (responseType === 'text') {
            return await response.text();
        }
        if (responseType === 'arrayBuffer') {
            return await response.arrayBuffer();
        }

        // Auto-detect based on Content-Type
        if (contentType.includes('application/json')) {
            return await response.json();
        }
        if (contentType.includes('text/')) {
            return await response.text();
        }
        if (contentType.includes('image/') || contentType.includes('application/pdf')) {
            return await response.blob();
        }

        // Default to JSON
        try {
            return await response.json();
        } catch {
            return await response.text();
        }
    }

    /**
     * Parse error response
     */
    static async parseErrorResponse(response) {
        try {
            const contentType = response.headers.get('Content-Type') || '';
            if (contentType.includes('application/json')) {
                return await response.json();
            }
            const text = await response.text();
            return { message: text };
        } catch {
            return { message: response.statusText };
        }
    }

    /**
     * Check if error should trigger retry
     */
    static shouldRetry(error) {
        // Retry on network errors
        if (error.code === 'TIMEOUT') return true;
        if (error.message && error.message.includes('NetworkError')) return true;
        
        // Retry on specific status codes
        if (error.status) {
            const retryableStatuses = [408, 429, 500, 502, 503, 504];
            return retryableStatuses.includes(error.status);
        }

        return false;
    }

    /**
     * Delay helper for retries
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Convenience methods for common HTTP verbs
     */
    static async get(url, options = {}) {
        return this.makeRequest(url, { ...options, method: 'GET' });
    }

    static async post(url, body, options = {}) {
        return this.makeRequest(url, { ...options, method: 'POST', body });
    }

    static async put(url, body, options = {}) {
        return this.makeRequest(url, { ...options, method: 'PUT', body });
    }

    static async patch(url, body, options = {}) {
        return this.makeRequest(url, { ...options, method: 'PATCH', body });
    }

    static async delete(url, options = {}) {
        return this.makeRequest(url, { ...options, method: 'DELETE' });
    }

    /**
     * Build URL with query parameters
     */
    static buildUrl(baseUrl, params = {}) {
        const url = new URL(baseUrl);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });
        return url.toString();
    }

    /**
     * Create headers object with authentication
     */
    static createAuthHeaders(token, type = 'Bearer') {
        return {
            'Authorization': `${type} ${token}`
        };
    }
}

/**
 * Create a configured HTTP client instance
 */
export function createHttpClient(defaultOptions = {}) {
    return {
        makeRequest: (url, options = {}) => {
            return HttpClient.makeRequest(url, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });
        },
        get: (url, options = {}) => {
            return HttpClient.get(url, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });
        },
        post: (url, body, options = {}) => {
            return HttpClient.post(url, body, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });
        },
        put: (url, body, options = {}) => {
            return HttpClient.put(url, body, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });
        },
        delete: (url, options = {}) => {
            return HttpClient.delete(url, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });
        }
    };
}

// Export as default for backward compatibility
export default HttpClient;
// src/utils/cacheUtils.js - Cache utility functions
export function getCacheKey(field, threshold) {
    const fieldId = field?.id || field?.label || 'unknown';
    return `problems_${fieldId}_${threshold}`;
}

export function getCachedResults(dataCache, field, threshold) {
    if (!dataCache || !field) return null;
    
    const key = getCacheKey(field, threshold);
    return dataCache.get(key);
}

export function cacheResults(dataCache, field, results, threshold, ttl = 1800000) {
    if (!dataCache || !field || !results) return false;
    
    const key = getCacheKey(field, threshold);
    const cacheData = {
        fieldId: field.id || field.label,
        fieldLabel: field.label,
        aiProblem: results.aiProblem,
        similarityResults: {
            results: results.orkgProblems,
            threshold: threshold
        },
        timestamp: Date.now()
    };
    
    return dataCache.set(key, cacheData, ttl);
}

export function clearFieldCache(dataCache, field) {
    if (!dataCache || !field) return;
    
    const fieldId = field.id || field.label;
    const keys = dataCache.keysByPrefix(`problems_${fieldId}_`);
    keys.forEach(key => dataCache.delete(key));
}
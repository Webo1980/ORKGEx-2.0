// src/utils/analysisUtils.js - Analysis utility functions
export function calculateProgress(current, total) {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
}

export function formatAnalysisDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

export function extractKeywords(text) {
    if (!text) return [];
    
    // Simple keyword extraction
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3);
    
    // Remove common words
    const stopWords = ['this', 'that', 'these', 'those', 'with', 'from', 'have', 'been', 'were', 'what', 'when', 'where', 'which', 'while'];
    
    return [...new Set(words.filter(word => !stopWords.includes(word)))];
}

export function compareProblems(problem1, problem2) {
    const keywords1 = extractKeywords(problem1.title + ' ' + problem1.description);
    const keywords2 = extractKeywords(problem2.title + ' ' + problem2.description);
    
    const common = keywords1.filter(k => keywords2.includes(k));
    const union = [...new Set([...keywords1, ...keywords2])];
    
    return {
        similarity: union.length > 0 ? common.length / union.length : 0,
        commonKeywords: common,
        uniqueToFirst: keywords1.filter(k => !keywords2.includes(k)),
        uniqueToSecond: keywords2.filter(k => !keywords1.includes(k))
    };
}

export function rankProblems(problems, threshold = 0) {
    return problems
        .filter(p => (p.similarity || p.confidence || 0) >= threshold)
        .sort((a, b) => {
            const simA = a.similarity || a.confidence || 0;
            const simB = b.similarity || b.confidence || 0;
            return simB - simA;
        })
        .map((problem, index) => ({
            ...problem,
            rank: index + 1
        }));
}

export function getProblemsStatistics(problems) {
    if (!problems || problems.length === 0) {
        return {
            total: 0,
            maxSimilarity: 0,
            minSimilarity: 0,
            avgSimilarity: 0,
            distribution: {}
        };
    }
    
    const similarities = problems.map(p => p.similarity || p.confidence || 0);
    
    const distribution = {
        high: problems.filter(p => (p.similarity || p.confidence || 0) >= 0.8).length,
        medium: problems.filter(p => {
            const sim = p.similarity || p.confidence || 0;
            return sim >= 0.6 && sim < 0.8;
        }).length,
        low: problems.filter(p => (p.similarity || p.confidence || 0) < 0.6).length
    };
    
    return {
        total: problems.length,
        maxSimilarity: Math.max(...similarities),
        minSimilarity: Math.min(...similarities),
        avgSimilarity: similarities.reduce((a, b) => a + b, 0) / similarities.length,
        distribution
    };
}
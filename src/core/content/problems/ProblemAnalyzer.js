// src/core/content/problems/ProblemAnalyzer.js - FIXED to pass field ID correctly
import { eventManager } from '../../../utils/eventManager.js';
import { generateId } from '../../../utils/utils.js';

export class ProblemAnalyzer {
    constructor(services) {
        this.services = services;
        this.isAnalyzing = false;
        this.analysisId = null;
        this.startTime = null;
        this.progress = {
            phase: 'idle',
            percentage: 0,
            message: '',
            details: {}
        };
    }
    
    /**
     * Start complete problem analysis
     */
    async analyze(field, metadata) {
        if (this.isAnalyzing) {
            console.warn('Analysis already in progress');
            return null;
        }
        
        this.isAnalyzing = true;
        this.analysisId = generateId('analysis');
        this.startTime = Date.now();
        
        const results = {
            id: this.analysisId,
            field: field,
            aiProblem: null,
            orkgProblems: [],
            timestamp: this.startTime,
            duration: 0,
            error: null
        };
        
        try {
            // Phase 1: Generate AI Problem
            this.updateProgress('ai_generation', 10, 'Generating AI problem analysis...');
            results.aiProblem = await this.generateAIProblem(metadata, field);
            
            // Phase 2: Fetch ORKG Problems - FIXED to use field ID
            this.updateProgress('orkg_fetch', 30, 'Fetching ORKG problems...');
            const orkgProblems = await this.fetchORKGProblems(field);
            
            // Phase 3: Calculate Similarities
            if (orkgProblems && orkgProblems.length > 0) {
                this.updateProgress('similarity_calculation', 60, 'Calculating similarities...');
                results.orkgProblems = await this.calculateSimilarities(
                    results.aiProblem,
                    orkgProblems
                );
            }
            
            // Complete
            this.updateProgress('complete', 100, 'Analysis complete');
            results.duration = Date.now() - this.startTime;
            
            return results;
            
        } catch (error) {
            console.error('Problem analysis failed:', error);
            results.error = error.message;
            throw error;
            
        } finally {
            this.isAnalyzing = false;
        }
    }
    
    /**
     * Generate AI problem using generation adapter - FIXED
     */
    async generateAIProblem(metadata, field) {
        // Check if generationAdapter exists
        if (!this.services.generationAdapter) {
            console.warn('GenerationAdapter not available, using fallback');
            return this.createFallbackProblem(metadata, field);
        }
        
        try {
            // Check if it's a proper GenerationAdapter with generateResearchProblem method
            if (typeof this.services.generationAdapter.generateResearchProblem === 'function') {
                // Use the GenerationAdapter
                const problem = await this.services.orkgService.generateResearchProblem(
                    metadata?.title || '',
                    metadata?.abstract || ''
                );
                
                return {
                    id: 'ai-generated',
                    ...problem,
                    source: 'ai',
                    confidence: 0.85
                };
            } else {
                // If not a proper GenerationAdapter, use fallback
                console.warn('GenerationAdapter does not have generateResearchProblem method, using fallback');
                return this.createFallbackProblem(metadata, field);
            }
            
        } catch (error) {
            console.warn('AI generation failed, using fallback:', error);
            return this.createFallbackProblem(metadata, field);
        }
    }
    
    /**
     * Create fallback problem when AI fails
     */
    createFallbackProblem(metadata, field) {
        return {
            id: 'ai-generated',
            title: `Research challenges in ${field?.label || 'this domain'}`,
            description: metadata?.abstract ? 
                metadata.abstract.substring(0, 200) + '...' :
                `This research addresses fundamental challenges in ${field?.label || 'the field'}.`,
            source: 'fallback',
            confidence: 0.5
        };
    }
    
    /**
     * Fetch ORKG problems for field - FIXED to use field ID
     */
    async fetchORKGProblems(field) {
        if (!this.services.orkgProblemMatcher) {
            console.warn('ORKG Problem Matcher not available');
            return [];
        }
        
        try {
            // FIXED: Use field.id if available, otherwise use field.label
            const fieldIdentifier = field.id || field.label;
            
            console.log(`🔬 Fetching problems for field: ${fieldIdentifier} (${field.label})`);
            
            const results = await this.services.orkgProblemMatcher.findSimilarProblems(
                { title: field.label, description: '' },
                fieldIdentifier, // Pass the field ID here
                {
                    threshold: 0.3,
                    maxResults: 100,
                    onProgress: (progress) => {
                        this.updateProgress(
                            'orkg_fetch',
                            30 + (progress.progress * 0.3),
                            progress.message
                        );
                    }
                }
            );
            
            return results?.results || [];
            
        } catch (error) {
            console.error('Failed to fetch ORKG problems:', error);
            return [];
        }
    }
    
    /**
     * Calculate similarities between AI problem and ORKG problems
     */
    async calculateSimilarities(aiProblem, orkgProblems) {
        if (!orkgProblems || orkgProblems.length === 0) {
            return [];
        }
        
        // Problems already have similarity scores from orkgProblemMatcher
        return orkgProblems.map((result, index) => {
            this.updateProgress(
                'similarity_calculation',
                60 + (index / orkgProblems.length * 30),
                `Processing problem ${index + 1}/${orkgProblems.length}`
            );
            
            return {
                ...result,
                rank: index + 1
            };
        });
    }
    
    /**
     * Update progress
     */
    updateProgress(phase, percentage, message, details = {}) {
        this.progress = {
            phase,
            percentage: Math.min(100, Math.max(0, percentage)),
            message,
            details
        };
        
        eventManager.emit('problem-analysis:progress', this.progress);
    }
    
    /**
     * Cancel current analysis
     */
    cancel() {
        if (this.isAnalyzing) {
            this.isAnalyzing = false;
            eventManager.emit('problem-analysis:cancelled', {
                id: this.analysisId
            });
        }
    }
    
    /**
     * Get current progress
     */
    getProgress() {
        return { ...this.progress };
    }
}
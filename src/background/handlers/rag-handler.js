// ================================
// src/background/handlers/rag-handler.js - Enhanced with Image/Table Markers
// ================================

var RAGHandler = (function() {
    'use strict';
    
    var activeExtraction = null;
    var injectedTabs = new Set();
    var extractionResults = new Map();
    
    /**
     * Start RAG analysis - Main entry point
     */
    function startAnalysis(request, sender) {
        return new Promise(function(resolve, reject) {
            console.log('🚀 Starting RAG analysis for tab:', request.tabId);
            
            // Validate request
            if (!request.tabId) {
                reject(new Error('No tab ID provided'));
                return;
            }
            
            if (!request.template) {
                reject(new Error('No template provided'));
                return;
            }
            
            if (activeExtraction && activeExtraction.tabId === request.tabId) {
                reject(new Error('Analysis already in progress for this tab'));
                return;
            }
            
            // Initialize extraction
            activeExtraction = {
                tabId: request.tabId,
                template: request.template,
                type: 'rag_analysis',
                startTime: Date.now(),
                currentPhase: 'initializing',
                progress: 0,
                sections: null,
                ragResults: null,
                highlights: [],
                images: [],
                tables: []
            };
            
            // Start the pipeline
            runRAGPipeline()
                .then(function(results) {
                    console.log('✅ RAG analysis completed successfully');
                    sendCompletionMessage(results);
                    resolve({ success: true, results: results });
                })
                .catch(function(error) {
                    console.error('❌ RAG analysis failed:', error);
                    sendErrorMessage(error);
                    
                    // Ensure overlay is hidden on error
                    hideOverlay(request.tabId);
                    
                    reject(error);
                })
                .finally(function() {
                    cleanupExtraction();
                });
            
            // Return immediate response
            resolve({ success: true, message: 'RAG analysis started' });
        });
    }
    
    /**
     * Main RAG pipeline - Enhanced with image and table extraction
     */
    function runRAGPipeline() {
        return new Promise(function(resolve, reject) {
            console.log('📋 Running RAG analysis pipeline');
            
            var sections = null;
            var ragResults = null;
            var template = activeExtraction.template;
            var tabId = activeExtraction.tabId;
            var extractedImages = [];
            var extractedTables = [];
            var markerStats = {
                text: 0,
                image: 0,
                table: 0
            };
            
            // Phase 1: Inject content script and show overlay
            updatePhase('injecting', 5, 'Preparing content extraction...');
            
            injectContentScript(tabId)
                .then(function() {
                    return showOverlay(tabId);
                })
                .then(function() {
                    // Phase 2: Extract text sections
                    updatePhase('extracting', 10, 'Extracting text sections from page...');
                    return extractTextSections(tabId);
                })
                .then(function(extractionResult) {
                    // Fix: Properly extract sections from the result
                    if (extractionResult.data && extractionResult.data.sections) {
                        sections = extractionResult.data.sections;
                    } else if (extractionResult.sections) {
                        sections = extractionResult.sections;
                    } else {
                        sections = extractionResult;
                    }
                    
                    activeExtraction.sections = sections;
                    
                    var sectionCount = Object.keys(sections).length;
                    updatePhase('extracting', 20, 
                        'Extracted ' + sectionCount + ' sections from the document');
                    
                    console.log('📄 Extracted sections:', Object.keys(sections));
                    
                    // Phase 2.5: Extract images and tables in parallel using ExtractionHandler
                    updatePhase('extracting', 25, 'Extracting images and tables...');
                    
                    var promises = [];
                    
                    // Use ExtractionHandler for images
                    if (typeof ExtractionHandler !== 'undefined' && ExtractionHandler.extractImages) {
                        promises.push(
                            ExtractionHandler.extractImages(tabId)
                                .then(function(result) {
                                    if (result.success && result.data && result.data.images) {
                                        return result.data.images;
                                    }
                                    return [];
                                })
                                .catch(function(error) {
                                    console.warn('Image extraction failed:', error);
                                    return [];
                                })
                        );
                    } else {
                        promises.push(Promise.resolve([]));
                    }
                    
                    // Use ExtractionHandler for tables
                    if (typeof ExtractionHandler !== 'undefined' && ExtractionHandler.extractTables) {
                        promises.push(
                            ExtractionHandler.extractTables(tabId)
                                .then(function(result) {
                                    if (result.success && result.data && result.data.tables) {
                                        return result.data.tables;
                                    }
                                    return [];
                                })
                                .catch(function(error) {
                                    console.warn('Table extraction failed:', error);
                                    return [];
                                })
                        );
                    } else {
                        promises.push(Promise.resolve([]));
                    }
                    
                    return Promise.all(promises);
                })
                .then(function(extractionResults) {
                    // Store extracted images and tables
                    extractedImages = extractionResults[0] || [];
                    extractedTables = extractionResults[1] || [];
                    
                    activeExtraction.images = extractedImages;
                    activeExtraction.tables = extractedTables;
                    console.log('📷 Extracted Data:', extractionResults);
                    console.log('📷 Extracted ' + extractedImages.length + ' images');
                    console.log('📊 Extracted ' + extractedTables.length + ' tables');
                    
                    updatePhase('extracting', 30, 
                        'Found ' + extractedImages.length + ' images and ' + extractedTables.length + ' tables');
                    
                    // Phase 3: Run RAG analysis with just the sections object
                    updatePhase('analyzing', 35, 'Starting property-value extraction...');
                    return runRAGAnalysis(sections, template);
                })
                .then(function(analysisResults) {
                    ragResults = analysisResults;
                    activeExtraction.ragResults = ragResults;
                    
                    // Phase 4: Process results for highlighting
                    updatePhase('highlighting', 85, 'Preparing text highlights...');
                    return processResultsForHighlighting(ragResults, sections);
                })
                .then(function(highlightData) {
                    activeExtraction.highlights = highlightData;
                    
                    // Phase 5: Apply highlights to page
                    updatePhase('applying', 90, 'Applying highlights to page...');
                    return applyHighlightsToPage(tabId, highlightData);
                })
                .then(function(highlightResult) {
                    // Phase 6: Activate all marker types and create markers
                    updatePhase('markers', 93, 'Creating markers for all content...');
                    
                    // Activate markers using MarkerHandler if available
                    if (typeof MarkerHandler !== 'undefined' && MarkerHandler.activateMarkers) {
                        return MarkerHandler.activateMarkers(tabId).then(function(activationResult) {
                            console.log('✅ Markers activated:', activationResult);
                            
                            // Wait for activation to complete
                            return new Promise(function(resolveMarkers) {
                                setTimeout(function() {
                                    // Create markers for different content types in parallel
                                    var markerPromises = [];
                                    
                                    // Text markers for highlights
                                    markerPromises.push(
                                        createTextMarkersViaContentScript(tabId, activeExtraction.highlights)
                                            .then(function(result) {
                                                markerStats.text = result.markersCreated || 0;
                                                return result;
                                            })
                                    );
                                    
                                    // Image markers
                                    if (extractedImages.length > 0) {
                                        markerPromises.push(
                                            processImagesForMarkers(tabId, extractedImages)
                                                .then(function(result) {
                                                    markerStats.image = result.markersCreated || 0;
                                                    return result;
                                                })
                                        );
                                    }
                                    
                                    // Table markers
                                    if (extractedTables.length > 0) {
                                        markerPromises.push(
                                            processTablesForMarkers(tabId, extractedTables)
                                                .then(function(result) {
                                                    markerStats.table = result.markersCreated || 0;
                                                    return result;
                                                })
                                        );
                                    }
                                    
                                    Promise.all(markerPromises).then(function() {
                                        resolveMarkers(markerStats);
                                    });
                                }, 500);
                            });
                        });
                    } else {
                        // Fallback: just activate via content script
                        return activateMarkersViaContentScript(tabId, markerStats);
                    }
                })
                .then(function(markerResult) {
                    // Phase 6.5: Show RAG Results Window with all collected data
                    updatePhase('displaying', 95, 'Displaying results window...');
                    
                    // Send message to content script to show the RAG results window
                    return new Promise(function(resolve) {
                        chrome.tabs.sendMessage(tabId, {
                            action: 'SHOW_RAG_RESULTS_WINDOW',
                            results: {
                                highlights: activeExtraction.highlights,
                                images: extractedImages,
                                tables: extractedTables,
                                stats: markerResult
                            }
                        }, function(response) {
                            // Don't fail if window can't be shown
                            if (chrome.runtime.lastError) {
                                console.warn('Could not show RAG results window:', chrome.runtime.lastError);
                            }
                            resolve(markerResult);
                        });
                    });
                })
                .then(function(markerResult) {
                    // Phase 7: Complete
                    updatePhase('complete', 100, 'Analysis complete!');
                    
                    // Hide overlay after a delay
                    setTimeout(function() {
                        hideOverlay(tabId);
                    }, 1500);
                    
                    // Return final results
                    resolve({
                        sections: sections,
                        ragResults: ragResults,
                        highlights: activeExtraction.highlights,
                        images: extractedImages,
                        tables: extractedTables,
                        markersCreated: markerResult,
                        stats: getExtractionStats()
                    });
                })
                .catch(function(error) {
                    console.error('Pipeline error:', error);
                    
                    // Make sure to hide overlay on error
                    hideOverlay(tabId);
                    
                    reject(error);
                });
        });
    }
    
    /**
     * Process images and add them via MarkerHandler
     */
    function processImagesForMarkers(tabId, images) {
        return new Promise(function(resolve) {
            if (!images || images.length === 0) {
                resolve({ success: true, markersCreated: 0 });
                return;
            }
            
            var addedCount = 0;
            var promises = [];
            
            // Use MarkerHandler to add images if available
            if (typeof MarkerHandler !== 'undefined' && MarkerHandler.addMarkerImage) {
                images.forEach(function(img, index) {
                    var imageData = {
                        id: img.id || 'rag_img_' + Date.now() + '_' + index,
                        src: img.src,
                        alt: img.alt || '',
                        title: img.title || '',
                        caption: img.caption || img.context?.caption || '',
                        dimensions: img.dimensions || { width: 0, height: 0 },
                        score: img.score || img.intelligence?.score || 0.5,
                        type: img.type || 'figure',
                        context: img.context || {},
                        fromRAG: true
                    };
                    
                    promises.push(
                        MarkerHandler.addMarkerImage(imageData, tabId)
                            .then(function(result) {
                                if (result.success) {
                                    addedCount++;
                                }
                                return result;
                            })
                    );
                });
                
                Promise.all(promises).then(function() {
                    console.log('✅ Added ' + addedCount + ' images via MarkerHandler');
                    
                    // Also notify content script to create visual markers
                    chrome.tabs.sendMessage(tabId, {
                        action: 'CREATE_IMAGE_MARKERS_FOR_RAG',
                        images: images.map(function(img, index) {
                            return {
                                id: img.id || 'rag_img_' + index,
                                selector: img.selector,
                                fromRAG: true
                            };
                        })
                    }, function() {
                        // Ignore errors
                    });
                    
                    resolve({ success: true, markersCreated: addedCount });
                });
            } else {
                // Fallback: just notify content script
                chrome.tabs.sendMessage(tabId, {
                    action: 'CREATE_IMAGE_MARKERS_FOR_RAG',
                    images: images
                }, function(response) {
                    resolve({
                        success: !chrome.runtime.lastError,
                        markersCreated: response?.markersCreated || 0
                    });
                });
            }
        });
    }
    
    /**
     * Process tables for markers
     */
    function processTablesForMarkers(tabId, tables) {
        return new Promise(function(resolve) {
            if (!tables || tables.length === 0) {
                resolve({ success: true, markersCreated: 0 });
                return;
            }
            
            // Send to content script to create visual markers
            chrome.tabs.sendMessage(tabId, {
                action: 'CREATE_TABLE_MARKERS_FOR_RAG',
                tables: tables.map(function(table, index) {
                    return {
                        id: table.id || 'rag_table_' + index,
                        selector: table.selector,
                        caption: table.caption,
                        summary: table.summary || {
                            rows: table.rows ? table.rows.length : 0,
                            columns: table.headers ? table.headers.length : 0
                        },
                        fromRAG: true
                    };
                })
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.warn('Could not create table markers:', chrome.runtime.lastError);
                    resolve({ success: false, markersCreated: 0 });
                } else {
                    resolve({
                        success: true,
                        markersCreated: response?.markersCreated || tables.length
                    });
                }
            });
        });
    }
    
    /**
     * Create text markers via content script
     */
    function createTextMarkersViaContentScript(tabId, highlights) {
        return new Promise(function(resolve) {
            if (!highlights || highlights.length === 0) {
                resolve({ success: true, markersCreated: 0 });
                return;
            }
            
            chrome.tabs.sendMessage(tabId, {
                action: 'CREATE_TEXT_MARKERS_FOR_RAG_HIGHLIGHTS',
                highlights: highlights
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.warn('Could not create text markers:', chrome.runtime.lastError);
                    resolve({ success: false, markersCreated: 0 });
                } else {
                    resolve({
                        success: true,
                        markersCreated: response?.markersCreated || 0
                    });
                }
            });
        });
    }
    
    /**
     * Fallback: Activate markers via content script
     */
    function activateMarkersViaContentScript(tabId, markerStats) {
        return new Promise(function(resolve) {
            chrome.tabs.sendMessage(tabId, {
                action: 'ACTIVATE_MARKERS',
                config: {
                    types: ['text', 'image', 'table'],
                    forRAG: true,
                    autoActivate: true
                }
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.warn('Could not activate markers:', chrome.runtime.lastError);
                    resolve(markerStats);
                } else {
                    // Process all content types after activation
                    setTimeout(function() {
                        var promises = [];
                        
                        if (activeExtraction.highlights.length > 0) {
                            promises.push(
                                createTextMarkersViaContentScript(tabId, activeExtraction.highlights)
                                    .then(function(r) { markerStats.text = r.markersCreated || 0; })
                            );
                        }
                        
                        if (activeExtraction.images.length > 0) {
                            promises.push(
                                processImagesForMarkers(tabId, activeExtraction.images)
                                    .then(function(r) { markerStats.image = r.markersCreated || 0; })
                            );
                        }
                        
                        if (activeExtraction.tables.length > 0) {
                            promises.push(
                                processTablesForMarkers(tabId, activeExtraction.tables)
                                    .then(function(r) { markerStats.table = r.markersCreated || 0; })
                            );
                        }
                        
                        Promise.all(promises).then(function() {
                            resolve(markerStats);
                        });
                    }, 500);
                }
            });
        });
    }
    
    /**
     * Create text markers for RAG highlights (kept for compatibility)
     */
    function createTextMarkersForHighlights(tabId, highlights) {
        return createTextMarkersViaContentScript(tabId, highlights);
    }
    
    /**
     * Run RAG analysis on extracted sections
     */
    function runRAGAnalysis(sections, template) {
        return new Promise(function(resolve, reject) {
            console.log('🧠 Starting RAG analysis...');
            console.log('📊 Sections to analyze:', Object.keys(sections));
            console.log('📋 Template properties:', template.properties ? template.properties.length : 0);
            
            // Ensure sections is just the sections object, not wrapped
            var sectionsToAnalyze = sections;
            
            // Check if sections is wrapped in data property
            if (sections.data && sections.data.sections) {
                sectionsToAnalyze = sections.data.sections;
            } else if (sections.sections) {
                sectionsToAnalyze = sections.sections;
            }
            
            if (!RAGBackgroundService) {
                console.warn('⚠️ RAG service not available, using fallback');
                reject(new Error('RAG service not available'));
                return;
            }
            
            // Call the RAG service with properly formatted sections
            RAGBackgroundService.analyzePaperSections(sectionsToAnalyze, template, {
                batchSize: 3,
                delayBetweenBatches: 1000,
                progressCallback: function(progress) {
                    updatePhase('analyzing', 35 + (progress * 0.5), 
                        'Analyzing properties... (' + Math.round(progress) + '%)');
                }
            }).then(function(results) {
                console.log('✅ RAG analysis completed');
                console.log('📊 Total matches found:', results.totalMatches || 0);
                resolve(results);
            }).catch(function(error) {
                console.error('❌ RAG analysis failed:', error);
                reject(error);
            });
        });
    }
    
    /**
     * Process RAG results to prepare highlighting data
     */
    function processResultsForHighlighting(ragResults, sections) {
        console.log('🔍 Processing RAG results for highlighting...', ragResults);
        return new Promise(function(resolve) {
            console.log('🎨 Processing results for highlighting');
            
            var highlights = [];
            var processedCount = 0;
            
            // Check if ragResults has the expected structure
            if (!ragResults || typeof ragResults !== 'object') {
                console.warn('Invalid RAG results structure');
                resolve(highlights);
                return;
            }
            
            // Handle both possible structures:
            // 1. Direct results object with properties as keys
            // 2. Wrapped results with a 'results' field containing the properties
            var propertyResults = ragResults.results || ragResults;
            
            // Count total properties
            var totalProperties = 0;
            for (var key in propertyResults) {
                if (propertyResults.hasOwnProperty(key) && 
                    typeof propertyResults[key] === 'object' &&
                    !Array.isArray(propertyResults[key])) {
                    totalProperties++;
                }
            }
            
            if (totalProperties === 0) {
                console.log('No properties found in RAG results');
                resolve(highlights);
                return;
            }
            
            // Process each property result
            for (var propertyId in propertyResults) {
                if (!propertyResults.hasOwnProperty(propertyId)) continue;
                
                var propertyResult = propertyResults[propertyId];
                
                // Skip non-property fields
                if (typeof propertyResult !== 'object' || Array.isArray(propertyResult)) {
                    continue;
                }
                
                // Check for values array in the property result
                if (propertyResult.values && Array.isArray(propertyResult.values) && propertyResult.values.length > 0) {
                    // Process each value for this property
                    propertyResult.values.forEach(function(value, valueIndex) {
                        // Ensure we have the minimum required fields
                        if (value.value && (value.sentence || value.text)) {
                            var highlightData = {
                                id: 'highlight_' + Date.now() + '_' + propertyId + '_' + valueIndex,
                                propertyId: propertyId,
                                propertyLabel: propertyResult.property || propertyId,
                                value: value.value,
                                sentence: value.sentence || value.text,
                                text: value.sentence || value.text, // Ensure text field exists
                                section: value.section || 'unknown',
                                sentenceIndex: value.sentenceIndex || 0,
                                confidence: value.confidence || 0.5,
                                evidence: value.evidence || {},
                                location: value.location || {},
                                metadata: value.metadata || {},
                                source: 'rag' // Mark as RAG source
                            };
                            
                            // Handle color - check multiple possible locations
                            if (value.highlight && value.highlight.color) {
                                highlightData.color = value.highlight.color;
                            } else if (value.color) {
                                highlightData.color = value.color;
                            } else {
                                highlightData.color = generatePropertyColor(propertyResult.property || propertyId);
                            }
                            
                            highlights.push(highlightData);
                            
                            console.log('Added highlight for property:', propertyId, 'value:', valueIndex);
                        }
                    });
                }
                
                processedCount++;
                
                // Update progress
                var progress = 85 + Math.round((processedCount / totalProperties) * 5);
                updatePhase('highlighting', progress, 
                    'Processed ' + processedCount + '/' + totalProperties + ' properties');
            }
            
            console.log('📍 Prepared ' + highlights.length + ' highlights from ' + totalProperties + ' properties');
            resolve(highlights);
        });
    }
    
    /**
     * Handle content extraction (backward compatibility)
     */
    function handleContentExtraction(request, sender) {
        // Redirect to startAnalysis for RAG requests
        if (request.extractionType === 'rag' || request.template) {
            return startAnalysis(request, sender);
        }
        
        // Handle other extraction types (images, tables, etc.)
        return Promise.resolve({
            success: false,
            error: 'Non-RAG extraction not implemented in this handler'
        });
    }

    /**
     * Apply highlights to the page
     */
    function applyHighlightsToPage(tabId, highlights) {
        return new Promise(function(resolve, reject) {
            if (!highlights || highlights.length === 0) {
                console.log('No highlights to apply');
                resolve({ success: true, appliedCount: 0 });
                return;
            }
            
            console.log('🖊️ Applying ' + highlights.length + ' highlights to page');
            
            // Send highlights to content script
            chrome.tabs.sendMessage(tabId, {
                action: 'APPLY_RAG_HIGHLIGHTS',
                highlights: highlights,
                ragAnalysisRunning: true
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Failed to apply highlights:', chrome.runtime.lastError);
                    // Don't reject, just log the error and continue
                    resolve({ success: false, appliedCount: 0 });
                } else if (response && response.success) {
                    console.log('✅ Highlights applied successfully');
                    resolve({ success: true, appliedCount: highlights.length });
                } else {
                    console.warn('Highlights application returned:', response);
                    resolve({ success: false, appliedCount: 0 });
                }
            });
        });
    }
    
    /**
     * Extract text sections from page
     */
    function extractTextSections(tabId) {
        return new Promise(function(resolve, reject) {
            console.log('📄 Extracting text sections from tab:', tabId);
            
            ExtractionHandler.extractText(tabId, {
                includeHeaders: true,
                includeParagraphs: true,
                includeSections: true
            }).then(function(result) {
                console.log('✅ Text extraction completed');
                
                // Return the result as-is, let runRAGPipeline handle the unwrapping
                resolve(result);
            }).catch(function(error) {
                console.error('❌ Text extraction failed:', error);
                reject(error);
            });
        });
    }
    
    /**
     * Update analysis phase and progress
     */
    function updatePhase(phase, progress, message) {
        if (!activeExtraction) return;
        
        activeExtraction.currentPhase = phase;
        activeExtraction.progress = progress;
        
        // Send to overlay
        if (activeExtraction.tabId) {
            updateOverlay(activeExtraction.tabId, progress, phase, message);
        }
        
        // Send to extension
        sendProgressUpdate(phase, progress, message);
        
        console.log('📊 [' + phase + '] ' + progress + '%: ' + message);
    }
    
    /**
     * Helper functions for content script interaction
     */
    function injectContentScript(tabId) {
        return new Promise(function(resolve, reject) {
            if (injectedTabs.has(tabId)) {
                console.log('✅ Content script already injected');
                resolve();
                return;
            }
            
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['src/content/content-script.js']
            }, function() {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    injectedTabs.add(tabId);
                    console.log('✅ Content script injected');
                    setTimeout(resolve, 500); // Longer delay for script initialization
                }
            });
        });
    }
    
    /**
     * Show overlay during RAG analysis
     */
    function showOverlay(tabId) {
        return new Promise(function(resolve) {
            chrome.tabs.sendMessage(tabId, {
                action: 'SHOW_RAG_OVERLAY',
                ragAnalysisRunning: true
            }, function(response) {
                // Don't check for errors - overlay might already be shown
                setTimeout(resolve, 300);
            });
        });
    }
    
    /**
     * Hide overlay after RAG analysis
     */
    function hideOverlay(tabId) {
        return new Promise(function(resolve) {
            chrome.tabs.sendMessage(tabId, {
                action: 'HIDE_RAG_OVERLAY',
                ragAnalysisRunning: false
            }, function() {
                // Don't check for errors - overlay might already be hidden
                resolve();
            });
        });
    }
    
    function updateOverlay(tabId, progress, phase, message) {
        chrome.tabs.sendMessage(tabId, {
            action: 'UPDATE_RAG_OVERLAY',
            progress: progress,
            phase: phase,
            logMessage: message
        }, function() {
            // Ignore errors - overlay might be closed
        });
    }
    
    /**
     * Send progress updates to extension
     */
    function sendProgressUpdate(phase, progress, message) {
        if (!activeExtraction) return;
        
        chrome.runtime.sendMessage({
            action: 'RAG_PROGRESS',
            tabId: activeExtraction.tabId,
            phase: phase,
            progress: progress,
            message: message,
            type: determineMessageType(message),
            timestamp: Date.now()
        }).catch(function() {
            // Extension might be closed
        });
    }
    
    function sendCompletionMessage(results) {
        if (!activeExtraction) return;
        
        chrome.runtime.sendMessage({
            action: 'RAG_COMPLETE',
            tabId: activeExtraction.tabId,
            results: results,
            stats: getExtractionStats(),
            timestamp: Date.now()
        }).catch(function() {
            // Extension might be closed
        });
    }
    
    function sendErrorMessage(error) {
        if (!activeExtraction) return;
        
        chrome.runtime.sendMessage({
            action: 'RAG_ERROR',
            tabId: activeExtraction.tabId,
            error: {
                message: error.message || 'Unknown error',
                stack: error.stack
            },
            timestamp: Date.now()
        }).catch(function() {
            // Extension might be closed
        });
    }
    
    /**
     * Determine message type for logging
     */
    function determineMessageType(message) {
        if (!message) return 'info';
        
        var msg = message.toLowerCase();
        
        if (msg.includes('error') || msg.includes('failed')) return 'error';
        if (msg.includes('warning')) return 'warning';
        if (msg.includes('success') || msg.includes('complete') || msg.includes('✅')) return 'success';
        if (msg.includes('found') || msg.includes('extracted')) return 'success';
        if (msg.includes('analyzing') || msg.includes('processing')) return 'batch';
        if (msg.includes('embedding')) return 'embedding';
        if (msg.includes('marker')) return 'info';
        
        return 'info';
    }
    
    /**
     * Get extraction statistics
     */
    function getExtractionStats() {
        if (!activeExtraction) return null;
        
        var duration = Date.now() - activeExtraction.startTime;
        var sectionCount = activeExtraction.sections ? 
            Object.keys(activeExtraction.sections.sections || activeExtraction.sections).length : 0;
        
        var totalValues = 0;
        var propertiesWithValues = 0;
        
        if (activeExtraction.ragResults) {
            var results = activeExtraction.ragResults.results || activeExtraction.ragResults;
            for (var propertyId in results) {
                var result = results[propertyId];
                if (result.values && result.values.length > 0) {
                    propertiesWithValues++;
                    totalValues += result.values.length;
                }
            }
        }
        
        return {
            duration: duration,
            durationFormatted: formatDuration(duration),
            sectionsExtracted: sectionCount,
            imagesFound: activeExtraction.images ? activeExtraction.images.length : 0,
            tablesFound: activeExtraction.tables ? activeExtraction.tables.length : 0,
            propertiesAnalyzed: activeExtraction.template ? 
                (activeExtraction.template.properties ? activeExtraction.template.properties.length : 0) : 0,
            propertiesWithValues: propertiesWithValues,
            totalValuesFound: totalValues,
            highlightsCreated: activeExtraction.highlights ? activeExtraction.highlights.length : 0
        };
    }
    
    /**
     * Format duration in mm:ss format
     */
    function formatDuration(ms) {
        var seconds = Math.floor(ms / 1000);
        var minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        
        return minutes.toString().padStart(2, '0') + ':' + 
               seconds.toString().padStart(2, '0');
    }
    
    /**
     * Generate property color
     */
    function generatePropertyColor(propertyLabel) {
        var colorMap = {
            'method': '#9C27B0',
            'result': '#4CAF50',
            'dataset': '#2196F3',
            'model': '#FF9800',
            'evaluation': '#00BCD4',
            'baseline': '#795548',
            'contribution': '#FFC107',
            'limitation': '#F44336'
        };
        
        var labelLower = propertyLabel.toLowerCase();
        
        for (var key in colorMap) {
            if (labelLower.includes(key)) {
                return colorMap[key];
            }
        }
        
        // Generate from hash
        var hash = 0;
        for (var i = 0; i < propertyLabel.length; i++) {
            hash = propertyLabel.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        var colors = ['#FFE4B5', '#E6E6FA', '#F0E68C', '#FFB6C1', '#B0E0E6'];
        return colors[Math.abs(hash) % colors.length];
    }
    
    /**
     * Cleanup extraction state
     */
    function cleanupExtraction() {
        activeExtraction = null;
    }
    
    /**
     * Handle tab removal
     */
    chrome.tabs.onRemoved.addListener(function(tabId) {
        injectedTabs.delete(tabId);
        extractionResults.delete(tabId);
        
        if (activeExtraction && activeExtraction.tabId === tabId) {
            cleanupExtraction();
        }
    });
    
    /**
     * Get current status
     */
    function getStatus() {
        return {
            isActive: !!activeExtraction,
            currentExtraction: activeExtraction ? {
                tabId: activeExtraction.tabId,
                phase: activeExtraction.currentPhase,
                progress: activeExtraction.progress,
                duration: Date.now() - activeExtraction.startTime
            } : null,
            injectedTabs: injectedTabs.size,
            cachedResults: extractionResults.size
        };
    }
    
    // Public API
    return {
        startAnalysis: startAnalysis,
        getStatus: getStatus,
        handleContentExtraction: handleContentExtraction
    };
})();

// Expose globally
if (typeof self !== 'undefined') {
    self.RAGHandler = RAGHandler;
}
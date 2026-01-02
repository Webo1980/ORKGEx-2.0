// ================================
// src/popup/popup.js - UPDATED: Config Loaded First and Available to All Services
// ================================

// Check environment
if (typeof document === 'undefined') {
    console.error('❌ popup.js should only run in a browser environment');
    throw new Error('Invalid environment for popup.js');
}


// Use envConfig.OPENAI_API_KEY etc.
import { serviceManager } from '../core/services/ServiceManager.js';
import { eventManager } from '../utils/eventManager.js';
import configInstance from '../config/config.js';

// Import all service classes
import { ToastManager } from '../core/ui/ToastManager.js';
import { StateManager } from '../core/state/StateManager.js';
import { WorkflowState } from '../core/state/WorkflowState.js';
import { DataCache } from '../core/state/DataCache.js';
import { NavigationManager } from '../core/navigation/NavigationManager.js';
import { ContentManager } from '../core/content/ContentManager.js';
import { HeaderManager } from '../core/ui/HeaderManager.js';
import { FooterManager } from '../core/ui/FooterManager.js';
import { LoadingManager } from '../core/ui/LoadingManager.js';
import { ErrorHandler } from '../core/ui/ErrorHandler.js';
import { ProgressManager } from '../core/navigation/ProgressManager.js';

// Import content step components
import { WelcomeScreen } from '../core/content/WelcomeScreen.js';
import { MetadataStep } from '../core/content/MetadataStep.js';
import { FieldStep } from '../core/content/FieldStep.js';
import { ProblemStep } from '../core/content/ProblemStep.js';
import { TemplateStep } from '../core/content/TemplateStep.js';
import { AnalysisStep } from '../core/content/AnalysisStep.js';

// Import API and ORKG services
import { APIService } from '../core/services/APIService.js';
import { ORKGService } from '../core/services/ORKGService.js';
import { ORKGProblemMatcher } from '../core/services/ORKGProblemMatcher.js';
import { MetadataService } from '../core/services/MetadataService.js';

import { EmbeddingService } from '../core/services/embeddingService.js';

import { LLMService } from '../core/services/ai/llmService.js';
import { RAGService } from '../core/services/ai/ragService.js';
import { GenerationAdapter } from '../core/services/ai/adapters/GenerationAdapter.js';
import { OpenAIProvider } from '../core/services/ai/providers/OpenAIProvider.js';
import { ImageAnalysisService } from '../core/services/ai/adapters/ImageAnalysisService.js';


// Import extraction services
// import { ImageExtractionService } from '../core/services/ImageExtractionService.js';
import { ImageAnalyzer } from '../core/content/analyzers/ImageAnalyzer.js';
import { TextExtractionService } from '../core/services/TextExtractionService.js';
import { TableExtractionService } from '../core/services/TableExtractionService.js';
import { AnimationService } from '../core/services/AnimationService.js';
import { ContentMarkerService } from '../core/services/ContentMarkerService.js';
// import { ExtractionOrchestrator } from '../core/services/ExtractionOrchestrator.js';

class PopupMain {
    constructor() {
        this.isInitialized = false;
        this.currentTheme = 'dark';
        this.isResetting = false;
        this.config = null;
        this.openaiConfig = null;
        
        // Bind methods
        this.handleError = this.handleError.bind(this);
        this.handleThemeChange = this.handleThemeChange.bind(this);
        this.handleUserResetRequest = this.handleUserResetRequest.bind(this);
        
        console.log('🏗️ PopupMain constructor completed');
    }
    
    async init() {
        try {
            console.log('🚀 Initializing ORKG Annotator v2.0...');
            
            this.showLoadingOverlay();
            this.updateLoadingProgress(5, 'Loading configuration...');
            
            // Step 0: Load configuration FIRST
            await this.loadConfiguration();
            this.updateLoadingProgress(10, 'Configuration loaded...');
            
            // Step 1: Register all services with dependencies
            this.registerServices();
            this.updateLoadingProgress(15, 'Initializing services...');
            
            // Step 2: Initialize all services through ServiceManager
            await serviceManager.initializeAll();
            this.updateLoadingProgress(70, 'Restoring state...');
            
            // Step 3: Check for restored state and navigate accordingly
            await this.handleStateRestoration();
            this.updateLoadingProgress(85, 'Setting up application...');
            
            // Step 4: Setup application-level configuration
            await this.setupApplication();
            this.updateLoadingProgress(90, 'Finalizing...');
            
            // Step 5: Final setup
            this.setupGlobalEventListeners();
            this.exposeGlobalReferences();
            await this.performInitialSetup();
            
            this.updateLoadingProgress(100, 'Ready!');
            this.isInitialized = true;
            
            console.log('✅ ORKG Annotator initialized successfully');
            
            // Hide loading and show success
            setTimeout(() => {
                this.hideLoadingOverlay();
                const message = this.wasStateRestored 
                    ? 'ORKG Annotator restored successfully!' 
                    : 'ORKG Annotator loaded successfully!';
                this.showToast(message, 'success', 3000);
            }, 500);
            
        } catch (error) {
            console.error('❌ Failed to initialize ORKG Annotator:', error);
            this.handleCriticalError(error);
        }
    }
    
    async handleStateRestoration() {
        try {
            const stateManager = serviceManager.getService('stateManager');
            const workflowState = serviceManager.getService('workflowState');
            const contentManager = serviceManager.getService('contentManager');
            
            if (!stateManager) {
                console.warn('StateManager not available for restoration');
                return;
            }
            
            // Check if we have restored state
            const stateStatus = stateManager.getStatus();
            const hasStoredData = stateStatus.hasStoredData;
            const lastActiveStep = stateManager.getLastActiveStep();
            const shouldRestore = stateManager.shouldRestoreLastStep();
            
            console.log('🔄 State restoration check:', {
                hasStoredData,
                lastActiveStep,
                shouldRestore
            });
            
            if (hasStoredData && shouldRestore && lastActiveStep !== 'welcome') {
                console.log(`🔄 Restoring to last active step: ${lastActiveStep}`);
                
                // Restore workflow state
                if (workflowState) {
                    const workflowSummary = stateManager.getWorkflowSummary();
                    
                    // Restore visited steps
                    if (workflowSummary.visitedSteps) {
                        workflowSummary.visitedSteps.forEach(step => {
                            workflowState.visitedSteps.add(step);
                        });
                    }
                    
                    // Set current step
                    workflowState.currentStep = lastActiveStep;
                }
                
                // Navigate to the last active step
                setTimeout(() => {
                    eventManager.emit('NAVIGATE_TO_STEP', { 
                        step: lastActiveStep, 
                        force: false,
                        restored: true 
                    });
                    
                    // Show restoration message
                    if (this.toastManager) {
                        this.toastManager.info(`Restored to ${this.getStepTitle(lastActiveStep)}`, 3000);
                    }
                }, 100);
                
                this.wasStateRestored = true;
            } else {
                console.log('🔄 Starting fresh from welcome');
                this.wasStateRestored = false;
            }
            
        } catch (error) {
            console.error('Failed to restore state:', error);
            this.wasStateRestored = false;
        }
    }

    getStepTitle(step) {
        const titles = {
            welcome: 'Welcome',
            metadata: 'Paper Information',
            field: 'Research Field',
            problem: 'Research Problem',
            template: 'Annotation Template',
            analysis: 'Content Analysis'
        };
        return titles[step] || step;
    }

    /**
     * Load configuration before registering services
     */
    async loadConfiguration() {
        try {
            console.log('⚙️ Loading configuration...');
            
            // Ensure env.js is loaded (auto-generated file)
            if (!window.__ENV__) {
                console.warn('⚠️ Environment variables not loaded, loading env.js...');
                await import('../config/env.js');
            }
            
            // Load configuration using existing config instance
            this.config = await configInstance.load();
            
            // Override OpenAI key from localStorage if user has set it
            const userApiKey = localStorage.getItem('openai_api_key');
            if (userApiKey && userApiKey !== this.config.openai.apiKey) {
                console.log('📝 Using user-provided OpenAI API key from localStorage');
                this.config.openai.apiKey = userApiKey;
                await configInstance.setOpenAIKey(userApiKey);
            }
            
            // Make config globally available
            window.orkgConfig = configInstance;
            window.orkgConfigData = this.config;
            
            console.log('✅ Configuration loaded:', {
                hasOpenAIKey: !!this.config.openai?.apiKey,
                openAIModel: this.config.openai?.model,
                orkgUrl: this.config.orkg?.serverUrl,
                envLoaded: !!window.__ENV__
            });
            
        } catch (error) {
            console.error('❌ Failed to load configuration:', error);
            this.config = configInstance.defaults;
            window.orkgConfigData = this.config;
        }
    }
    
    /**
     * Register all services with ServiceManager
     */
    registerServices() {
        console.log('📦 Registering services with configuration...');
        
        // Store config reference for factories to use
        const appConfig = this.config;
        
        // Critical services (must succeed)
        serviceManager
            .registerService('toastManager', ToastManager, {
                critical: true,
                priority: 100
            })
            .registerService('errorHandler', ErrorHandler, {
                critical: true,
                priority: 90,
                dependencies: []
            })
            .registerService('stateManager', StateManager, {
                critical: true,
                priority: 80
            });
        
        // Data and State services
        serviceManager
            .registerService('dataCache', DataCache, {
                priority: 85
            })
            .registerService('workflowState', WorkflowState, {  // ← THIS WAS MISSING!
                priority: 70,
                dependencies: ['stateManager']
            })
            .registerService('apiService', APIService, {
                priority: 73,
                dependencies: ['dataCache'],
                factory: (deps) => new APIService(deps.dataCache, {
                    timeout: appConfig.orkg?.timeout || 30000,
                    maxRetries: 3,
                    cacheEnabled: true,
                    cacheTTL: appConfig.cache?.ttl || 300000
                })
            });
        
        // Navigation services
        serviceManager
            .registerService('navigationManager', NavigationManager, {
                priority: 60,
                dependencies: ['workflowState', 'stateManager']
            })
            .registerService('progressManager', ProgressManager, {
                priority: 35
            });
        
        // UI services
        serviceManager
            .registerService('loadingManager', LoadingManager, {
                priority: 50
            })
            .registerService('headerManager', HeaderManager, {
                priority: 40,
                dependencies: ['toastManager']
            })
            .registerService('footerManager', FooterManager, {
                priority: 30
            });
        
        // Metadata service with config
        serviceManager
            .registerService('metadataService', MetadataService, {
                priority: 72,
                dependencies: ['dataCache'],
                factory: (deps) => new MetadataService(
                    deps.dataCache,
                    appConfig.metadataExtraction,
                    appConfig.externalApis
                )
            });
        
        // ORKG services with config passed directly
        serviceManager
            .registerService('orkgService', ORKGService, {
                priority: 25,
                dependencies: ['apiService', 'dataCache'],
                factory: (deps) => new ORKGService(
                    deps.apiService,
                    deps.dataCache,
                    appConfig.orkg
                )
            })
            .registerService('embeddingService', EmbeddingService, {
                priority: 24,
                dependencies: [],
                factory: () => {
                    // Get the config instance
                    const config = window.orkgConfig || window.orkgConfigData;
                    
                    // Create config object for OpenAI service
                    const embeddingConfig = {
                        // Add the OpenAI API key from the correct location
                        openaiApiKey: config.openai?.apiKey || config.defaults?.openai?.apiKey,
                        apiKey: config.openai?.apiKey || config.defaults?.openai?.apiKey,
                        
                        // Add other OpenAI embedding settings
                        model: 'text-embedding-3-small',
                        baseUrl: config.openai?.baseURL || 'https://api.openai.com/v1',
                        timeout: config.openai?.timeout || 30000,
                        
                        // Include problem processing settings
                        ...config.problemProcessing,
                        
                        // Fallback settings
                        useMockIfNoKey: true,
                        useTextSimilarityFallback: true
                    };
                    
                    return new EmbeddingService(embeddingConfig);
                }
            })
            .registerService('orkgProblemMatcher', ORKGProblemMatcher, {
                priority: 23,
                dependencies: ['dataCache', 'embeddingService', 'orkgService'],
                factory: (deps) => new ORKGProblemMatcher(
                    deps.dataCache,
                    deps.embeddingService,
                    deps.orkgService,
                    appConfig.problemProcessing
                )
            });
       
        if (this.config.openai && this.config.openai.apiKey) {
            console.log(`🔑 Registering OpenAI Provider with config:`, this.config.openai);
            
            // Pass config directly to ServiceManager
            serviceManager.registerService('openAIProvider', OpenAIProvider, {
                priority: 22,
                dependencies: ['dataCache'],
                config: this.config.openai  // ← Pass config here, no factory
            });
            
            serviceManager.registerService('generationAdapter', GenerationAdapter, {
                priority: 21,
                dependencies: ['openAIProvider'],
                factory: (deps) => new GenerationAdapter(deps.openAIProvider)
            });

            serviceManager.registerService('ragService', RAGService, {
                priority: 21,
                dependencies: ['openAIProvider', 'generationAdapter'],
                factory: (deps) => new RAGService(deps.openAIProvider)
            });
        }
        // LLM imageAnalysisService service
        serviceManager
        .registerService('imageAnalysisService', ImageAnalysisService, {
            priority: 25,
            lazyInit: true,
            dependencies: ['openAIProvider', 'dataCache']
        });
        // Content services - contentManager depends on workflowState
        serviceManager
            .registerService('contentManager', ContentManager, {
                priority: 20,
                dependencies: ['stateManager', 'workflowState']  // Both dependencies are now registered
            })
            .registerService('welcomeScreen', WelcomeScreen, {
                priority: 10,
                dependencies: ['contentManager', 'toastManager', 'metadataService']
            })
            .registerService('metadataStep', MetadataStep, {
                priority: 5,
                dependencies: ['contentManager', 'stateManager']
            })
            .registerService('fieldStep', FieldStep, {
                priority: 4,
                dependencies: ['contentManager', 'stateManager', 'orkgService']
            })
            .registerService('problemStep', ProblemStep, {
                priority: 3,
                dependencies: ['contentManager', 'stateManager', 'orkgProblemMatcher', 'generationAdapter']
            }).
            registerService('templateStep', TemplateStep, {
                priority: 2,
                dependencies: [ 'contentManager', 'stateManager', 'workflowState', 'orkgService', 'dataCache', 'generationAdapter' ]
            }).
            registerService('analysisStep', AnalysisStep, {
                priority: 2,
                dependencies: [ 'contentManager', 'stateManager', 'workflowState', 'orkgService', 'dataCache', 'generationAdapter' ]
            });
        
   
        // Extraction services (registered but not activated immediately)
        serviceManager
            /*.registerService('imageExtractionService', ImageExtractionService, {
                priority: 20,
                lazyInit: true  // Don't initialize until needed
            })*/
            .registerService('textExtractionService', TextExtractionService, {
                priority: 19,
                lazyInit: true
            })
            .registerService('tableExtractionService', TableExtractionService, {
                priority: 18,
                lazyInit: true
            })
            .registerService('animationService', AnimationService, {
                priority: 17,
                lazyInit: true
            })
            .registerService('contentMarkerService', ContentMarkerService, {
                priority: 16,
                lazyInit: true,
                dependencies: ['animationService']
            })
            .registerService('imageAnalyzer', ImageAnalyzer, {
                priority: 15,
                dependencies: ['stateManager', 'toastManager', 'contentMarkerService']
            })
            /*.registerService('extractionOrchestrator', ExtractionOrchestrator, {
                priority: 15,
                lazyInit: true,
                dependencies: ['textExtractionService', 'tableExtractionService', 'contentMarkerService', 'animationService']
            });*/
        
        console.log('✅ All services registered with configuration');
    }
    
    /**
     * Setup application-level configuration
     */
    async setupApplication() {
        console.log('⚙️ Setting up application configuration...');
        
        try {
            // Initialize theme
            this.initializeTheme();
            
            // Register content components with ContentManager
            await this.registerContentComponents();
            
            // Setup error handling integration
            this.setupErrorHandling();
            
            // Setup ORKG service integration
            this.setupORKGIntegration();
            
            console.log('✅ Application setup completed');
            
        } catch (error) {
            console.error('❌ Application setup failed:', error);
            throw error;
        }
    }
    
    /**
     * Setup ORKG service integration
     */
    setupORKGIntegration() {
        const orkgService = serviceManager.getService('orkgService');
        const embeddingServiceInstance = serviceManager.getService('embeddingService');
        const orkgProblemMatcher = serviceManager.getService('orkgProblemMatcher');
        
        console.log('🔗 Setting up ORKG service integration...');
        
        // The embedding service and ORKG service are already connected through
        // the ORKGProblemMatcher which receives both as dependencies.
        // No need to call setORKGService as it doesn't exist.
        
        if (embeddingServiceInstance && orkgService && orkgProblemMatcher) {
            console.log('✅ ORKG services integrated successfully:', {
                hasEmbeddingService: !!embeddingServiceInstance,
                hasORKGService: !!orkgService,
                hasORKGProblemMatcher: !!orkgProblemMatcher
            });
        } else {
            console.warn('⚠️ Some ORKG services are not available:', {
                hasEmbeddingService: !!embeddingServiceInstance,
                hasORKGService: !!orkgService,
                hasORKGProblemMatcher: !!orkgProblemMatcher
            });
        }
        
        // Initialize embedding service if needed
        if (embeddingServiceInstance && !embeddingServiceInstance.initialized) {
            embeddingServiceInstance.init().then(() => {
                console.log('✅ Embedding service initialized');
            }).catch(error => {
                console.warn('⚠️ Embedding service initialization failed, will use fallback:', error);
            });
        }
    }
    
    /**
     * Initialize theme system
     */
    initializeTheme() {
        try {
            const savedTheme = this.config.ui?.theme || localStorage.getItem('orkg-annotator-theme') || 'dark';
            this.currentTheme = savedTheme;
            document.documentElement.setAttribute('data-theme', savedTheme);
            console.log(`🎨 Theme initialized: ${savedTheme}`);
        } catch (error) {
            console.warn('Failed to initialize theme:', error);
            this.currentTheme = 'dark';
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
    
    /**
     * Register content components with ContentManager
     */
    async registerContentComponents() {
        const contentManager = serviceManager.getService('contentManager');
        const welcomeScreen = serviceManager.getService('welcomeScreen');
        const metadataStep = serviceManager.getService('metadataStep');
        const fieldStep = serviceManager.getService('fieldStep');
        const problemStep = serviceManager.getService('problemStep');
        const templateStep = serviceManager.getService('templateStep');
        const analysisStep = serviceManager.getService('analysisStep');
        
        if (contentManager) {
            if (welcomeScreen) {
                contentManager.registerComponent('welcomeScreen', welcomeScreen);
                console.log('📄 WelcomeScreen registered with ContentManager');
            }
            
            if (metadataStep) {
                contentManager.registerComponent('metadataStep', metadataStep);
                console.log('📄 MetadataStep registered with ContentManager');
            }

            if (fieldStep) {
                contentManager.registerComponent('fieldStep', fieldStep);
                console.log('📄 FieldStep registered with ContentManager');
            }

            if (problemStep) {
                contentManager.registerComponent('problemStep', problemStep);
                console.log('📄 ProblemStep registered with ContentManager');
            }
            
            if (templateStep) {
                contentManager.registerComponent('templateStep', templateStep);
                console.log('📄 TemplateStep registered with ContentManager');
            }
            
            if (analysisStep) {
                contentManager.registerComponent('analysisStep', analysisStep);
                console.log('📄 AnalysisStep registered with ContentManager');
            }
        }
    }
    
    /**
     * Setup error handling integration
     */
    setupErrorHandling() {
        const errorHandler = serviceManager.getService('errorHandler');
        
        if (errorHandler) {
            // Make error handler globally available for components
            window.errorHandler = errorHandler;
            
            // Setup global error catching
            window.addEventListener('error', (event) => {
                errorHandler.handleError({
                    type: 'uncaught_error',
                    error: event.error,
                    message: event.message,
                    filename: event.filename,
                    line: event.lineno,
                    column: event.colno
                });
            });
            
            window.addEventListener('unhandledrejection', (event) => {
                errorHandler.handleError({
                    type: 'unhandled_rejection',
                    error: event.reason,
                    message: 'Unhandled Promise Rejection'
                });
            });
            
            console.log('✅ Error handling integration setup');
        }
    }
    
    setupGlobalEventListeners() {
        try {
            // Navigation events
            eventManager.on('NAVIGATE_TO_STEP', (data) => {
                try {
                    console.log('🧭 Navigation event received:', data);
                    
                    const workflowState = serviceManager.getService('workflowState');
                    const navigationManager = serviceManager.getService('navigationManager');
                    
                    if (workflowState?.setCurrentStep) {
                        workflowState.setCurrentStep(data.step);
                    }
                    
                    if (navigationManager?.navigateToStep) {
                        navigationManager.navigateToStep(data.step, data.force);
                    }
                    
                    // Auto-start problem analysis when navigating to problem step
                    if (data.step === 'problem' && data.autoStart !== false) {
                        setTimeout(() => {
                            const problemStep = serviceManager.getService('problemStep');
                            if (problemStep && !problemStep.isProcessing && !problemStep.aiProblem) {
                                console.log('🚀 Auto-starting problem analysis');
                                problemStep.init();
                            }
                        }, 500);
                    }
                } catch (error) {
                    console.error('Navigation failed:', error);
                    this.showError('Navigation failed: ' + error.message);
                }
            });
            
            // Workflow state changes
            eventManager.on('workflow:step_changed', (data) => {
                console.log(`🧭 Navigation: ${data.previousStep} → ${data.currentStep}`);
                
                const headerManager = serviceManager.getService('headerManager');
                const stateManager = serviceManager.getService('stateManager');
                
                if (headerManager?.updateForStep) {
                    headerManager.updateForStep(data.currentStep);
                }
                
                if (stateManager?.setCurrentStep) {
                    stateManager.setCurrentStep(data.currentStep);
                }
            });
            
            // Reset events
            eventManager.on('workflow:user_reset_requested', this.handleUserResetRequest);
            
            // Error events
            eventManager.on('error:global', this.handleError);
            
            // Theme events
            eventManager.on('theme:changed', this.handleThemeChange);
            
            // Config change events
            window.addEventListener('configChange', (event) => {
                console.log('⚙️ Config changed:', event.detail);
                // Handle config changes if needed
                if (event.detail.key === 'openai') {
                    this.openaiConfig = event.detail.value;
                }
            });
            
            console.log('✅ Global event listeners setup');
        } catch (error) {
            console.error('Failed to setup event listeners:', error);
        }
        
        // Browser events
        window.addEventListener('beforeunload', () => this.cleanup());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleVisibilityHidden();
            } else {
                this.handleVisibilityVisible();
            }
        });
    }
    
    exposeGlobalReferences() {
        // Expose ServiceManager globally
        if (!window.serviceManager) {
            window.serviceManager = serviceManager;
        }
        
        // Expose config globally
        if (!window.orkgConfig) {
            window.orkgConfig = configInstance;
        }
        
        if (!window.orkgConfigData) {
            window.orkgConfigData = this.config;
        }
        
        // Expose key services globally for backward compatibility
        const stateManager = serviceManager.getService('stateManager');
        const workflowState = serviceManager.getService('workflowState');
        const toastManager = serviceManager.getService('toastManager');
        const progressManagerInstance = serviceManager.getService('progressManager');
        
        if (!window.stateManager && stateManager) {
            window.stateManager = stateManager;
        }
        
        if (!window.workflowState && workflowState) {
            window.workflowState = workflowState;
        }
        
        if (!window.toastManager && toastManager) {
            window.toastManager = toastManager;
        }
        
        if (!window.progressManager && progressManagerInstance) {
            window.progressManager = progressManagerInstance;
        }
        
        // Expose main app interface
        if (!window.orkgApp) {
            window.orkgApp = this;
        }
        
        // Module loader compatibility interface (for existing code)
        if (!window.moduleLoader) {
            window.moduleLoader = {
                getModule: (name) => serviceManager.getService(name),
                hasModule: (name) => serviceManager.hasService(name),
                getModuleNames: () => Object.keys(serviceManager.getServicesStatus().services),
                isReady: () => this.isInitialized,
                registerModule: (name, module) => {
                    console.warn('Use serviceManager.registerService instead of moduleLoader.registerModule');
                    return false;
                }
            };
        }
        
        console.log('🌐 Global references exposed');
    }
    
    async performInitialSetup() {
        try {
            const currentTab = await this.getCurrentTab();
            
            const headerManager = serviceManager.getService('headerManager');
            const stateManager = serviceManager.getService('stateManager');
            const workflowState = serviceManager.getService('workflowState');
            
            if (currentTab) {
                if (headerManager?.setPageInfo) {
                    headerManager.setPageInfo(
                        currentTab.title || 'Unknown Page',
                        'Page loaded'
                    );
                }
                
                if (stateManager?.setPageInfo) {
                    stateManager.setPageInfo({
                        url: currentTab.url,
                        title: currentTab.title,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            
            // Only set to welcome if not restored
            if (!this.wasStateRestored && workflowState?.setCurrentStep) {
                workflowState.setCurrentStep('welcome');
            }
            
            console.log('✅ Initial setup completed');
            
        } catch (error) {
            console.error('Failed initial setup:', error);
            this.showError('Failed to initialize. Please refresh and try again.');
        }
    }
    
    async getCurrentTab() {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                return tab;
            } catch (error) {
                console.warn('Could not get current tab:', error);
                return null;
            }
        }
        
        return {
            url: window.location.href,
            title: document.title || 'Current Page'
        };
    }
    
    // Loading and error display methods
    showLoadingOverlay() {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }
    
    hideLoadingOverlay() {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }
    
    updateLoadingProgress(percentage, message) {
        const progressFill = document.getElementById('loading-progress-fill');
        const loadingMessage = document.getElementById('global-loading-message');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
        
        console.log(`📦 Loading progress: ${percentage}% - ${message}`);
    }
    
    handleCriticalError(error) {
        console.error('💥 Critical initialization error:', error);
        
        this.hideLoadingOverlay();
        
        // Try to use ServiceManager's emergency services
        serviceManager.createEmergencyServices();
        
        // Show error using template or fallback
        const errorTemplate = document.getElementById('error-screen-template');
        if (errorTemplate) {
            const errorScreen = errorTemplate.cloneNode(true);
            errorScreen.id = 'active-error-screen';
            errorScreen.classList.remove('hidden');
            
            // Update error content
            const errorMessage = errorScreen.querySelector('.error-message');
            const errorStack = errorScreen.querySelector('.error-stack');
            const reloadBtn = errorScreen.querySelector('.reload-btn');
            
            if (errorMessage) {
                errorMessage.textContent = 'Failed to initialize ORKG Annotator. This might be due to missing files or network issues.';
            }
            
            if (errorStack) {
                errorStack.textContent = `${error.message || error}\n\nStack: ${error.stack || 'No stack trace available'}`;
            }
            
            if (reloadBtn) {
                reloadBtn.addEventListener('click', () => {
                    location.reload();
                });
            }
            
            // Replace body content with error screen
            document.body.innerHTML = '';
            document.body.appendChild(errorScreen);
        } else {
            // Fallback error display
            document.body.innerHTML = `
                <div class="error-screen">
                    <div class="error-content">
                        <div class="error-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h2 class="error-title">Initialization Error</h2>
                        <p class="error-message">Failed to initialize ORKG Annotator</p>
                        <details class="error-details">
                            <summary>Error Details</summary>
                            <pre class="error-stack">${error.message || error}\n\nStack: ${error.stack || 'No stack trace available'}</pre>
                        </details>
                        <div class="error-actions">
                            <button class="btn btn-primary reload-btn" onclick="location.reload()">
                                <i class="fas fa-refresh"></i>
                                <span>Reload Extension</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    // Toast utility methods
    showToast(message, type = 'info', duration = null) {
        const toastManager = serviceManager.getService('toastManager');
        if (toastManager?.show) {
            return toastManager.show(message, type, duration);
        } else {
            console.log(`Toast (${type}):`, message);
            return null;
        }
    }
    
    showSuccess(message, duration = 3000) {
        return this.showToast(message, 'success', duration);
    }
    
    showError(message, duration = 5000) {
        return this.showToast(message, 'error', duration);
    }
    
    showWarning(message, duration = 4000) {
        return this.showToast(message, 'warning', duration);
    }
    
    showInfo(message, duration = 3000) {
        return this.showToast(message, 'info', duration);
    }
    
    // Event Handlers
    handleError(error) {
        console.error('Application error:', error);
        const errorHandler = serviceManager.getService('errorHandler');
        if (errorHandler?.handleError) {
            errorHandler.handleError(error);
        } else {
            this.showError('An error occurred: ' + (error.message || error));
        }
    }
    
    handleThemeChange(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('orkg-annotator-theme', theme);
            configInstance.setNestedValue('ui.theme', theme);
        } catch (error) {
            console.warn('Failed to save theme preference:', error);
        }
    }
    
    handleUserResetRequest(data) {
        if (this.isResetting) {
            console.warn('🔄 Reset already in progress, ignoring duplicate request');
            return;
        }
        
        this.isResetting = true;
        
        try {
            console.log('🔄 Handling user reset request:', data);
            
            this.showInfo('Resetting workflow...', 2000);
            
            // Show loading briefly
            this.showLoadingOverlay();
            this.updateLoadingProgress(0, 'Resetting workflow...');
            
            setTimeout(() => {
                try {
                    this.updateLoadingProgress(50, 'Clearing data...');
                    
                    // Reset all services that support it
                    const stateManager = serviceManager.getService('stateManager');
                    const workflowState = serviceManager.getService('workflowState');
                    const contentManager = serviceManager.getService('contentManager');
                    
                    if (stateManager?.reset) {
                        stateManager.reset(data.resetType || 'soft');
                    }
                    
                    if (workflowState?.reset) {
                        workflowState.reset();
                    }
                    
                    if (contentManager?.reset) {
                        contentManager.reset();
                    }
                    
                    this.updateLoadingProgress(80, 'Returning to start...');
                    
                    // Navigate back to welcome
                    eventManager.emit('NAVIGATE_TO_STEP', { step: 'welcome', force: true });
                    
                    this.updateLoadingProgress(100, 'Reset complete!');
                    
                    setTimeout(() => {
                        this.hideLoadingOverlay();
                        this.showSuccess('Workflow reset complete', 3000);
                    }, 500);
                    
                } catch (error) {
                    console.error('❌ Failed during reset process:', error);
                    this.hideLoadingOverlay();
                    this.showError('Failed to reset workflow');
                } finally {
                    this.isResetting = false;
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Failed to handle user reset request:', error);
            this.isResetting = false;
            this.hideLoadingOverlay();
            this.showError('Failed to reset workflow');
        }
    }
    
    handleVisibilityHidden() {
        const stateManager = serviceManager.getService('stateManager');
        if (stateManager?.saveToStorage) {
            stateManager.saveToStorage();
        }
    }
    
    handleVisibilityVisible() {
        console.log('👁️ Application became visible');
    }
    
    // Public Methods
    getManager(name) {
        return serviceManager.getService(name);
    }
    
    isReady() {
        return this.isInitialized;
    }
    
    getConfig() {
        return this.config;
    }
    
    getOpenAIConfig() {
        return this.openaiConfig;
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isResetting: this.isResetting,
            services: serviceManager.getServicesStatus(),
            currentStep: this.getManager('workflowState')?.currentStep || 'unknown',
            theme: this.currentTheme,
            config: {
                hasOpenAIKey: !!this.openaiConfig?.apiKey,
                openAIModel: this.openaiConfig?.model,
                hasSemanticScholarKey: !!this.config?.externalApis?.semanticScholar?.apiKey
            },
            timestamp: new Date().toISOString()
        };
    }
    
    cleanup() {
        console.log('🧹 Cleaning up application...');
        
        const stateManager = serviceManager.getService('stateManager');
        if (stateManager?.saveToStorage) {
            stateManager.saveToStorage();
        }
        
        // Shutdown all services through ServiceManager
        serviceManager.shutdown();
        
        this.isInitialized = false;
        this.isResetting = false;
        
        console.log('✅ Application cleanup completed');
    }
}

/**
 * Initialize the application when DOM is ready
 */
async function initializeApp() {
    try {
        console.log('📱 Starting ORKG Annotator initialization...');
        
        const app = new PopupMain();
        await app.init();
        
        if (!window.orkgApp) {
            window.orkgApp = app;
        }
        
        // Handle system theme changes
        try {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                const currentTheme = localStorage.getItem('orkg-annotator-theme');
                if (currentTheme === 'auto') {
                    const newTheme = e.matches ? 'dark' : 'light';
                    document.documentElement.setAttribute('data-theme', newTheme);
                }
            });
        } catch (error) {
            console.warn('Failed to setup theme change listener:', error);
        }
        
        console.log('🚀 Application startup completed successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize ORKG Annotator:', error);
        
        // Show fallback error screen
        const errorScreen = document.getElementById('error-screen-template');
        if (errorScreen) {
            const activeError = errorScreen.cloneNode(true);
            activeError.id = 'startup-error-screen';
            activeError.classList.remove('hidden');
            
            const errorMessage = activeError.querySelector('.error-message');
            const errorStack = activeError.querySelector('.error-stack');
            const reloadBtn = activeError.querySelector('.reload-btn');
            
            if (errorMessage) {
                errorMessage.textContent = 'Failed to load ORKG Annotator. Please check that all files are present and try again.';
            }
            
            if (errorStack) {
                errorStack.textContent = error.message || error;
            }
            
            if (reloadBtn) {
                reloadBtn.addEventListener('click', () => {
                    location.reload();
                });
            }
            
            document.body.innerHTML = '';
            document.body.appendChild(activeError);
        } else {
            // Ultimate fallback
            document.body.innerHTML = `
                <div class="error-screen">
                    <div class="error-icon">❌</div>
                    <h2>Loading Error</h2>
                    <p>Failed to load ORKG Annotator. Please check that all files are present and try again.</p>
                    <button onclick="location.reload()" class="reload-btn">🔄 Reload Extension</button>
                </div>
            `;
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Global error handlers
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    const errorHandler = window.serviceManager?.getService('errorHandler') || window.errorHandler;
    if (errorHandler?.handleError) {
        errorHandler.handleError({
            type: 'uncaught_error',
            error: event.error,
            message: event.message,
            filename: event.filename,
            line: event.lineno,
            column: event.colno
        });
    }
});

// Add refresh helper
window.refreshImages = async () => {
    console.log('🔄 Refreshing images from storage...');
    const analyzer = window.serviceManager?.getService('imageAnalyzer');
    if (analyzer) {
        await analyzer.loadPersistedImages();
        console.log('✅ Images refreshed');
    }
};

window.checkStorages = async () => {
    // Check chrome.storage.local
    const chromeStorage = await chrome.storage.local.get(['analysisResults']);
    console.log('📦 chrome.storage.local images:', chromeStorage.analysisResults?.markerImages?.length || 0);
    
    // Check localStorage via StateManager
    const stateManager = window.serviceManager?.getService('stateManager');
    if (stateManager) {
        const state = stateManager.getState();
        console.log('📦 StateManager images:', state?.data?.analysisResults?.markerImages?.length || 0);
    }
    
    // Check raw localStorage
    const rawState = localStorage.getItem('orkg-annotator-state');
    if (rawState) {
        const parsed = JSON.parse(rawState);
        console.log('📦 Raw localStorage images:', parsed?.data?.analysisResults?.markerImages?.length || 0);
    }
    
    return {
        chromeStorage: chromeStorage.analysisResults?.markerImages || [],
        stateManager: stateManager?.getState()?.data?.analysisResults?.markerImages || [],
        localStorage: JSON.parse(localStorage.getItem('orkg-annotator-state') || '{}')?.data?.analysisResults?.markerImages || []
    };
};


window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    const errorHandler = window.serviceManager?.getService('errorHandler') || window.errorHandler;
    if (errorHandler?.handleError) {
        errorHandler.handleError({
            type: 'unhandled_rejection',
            error: event.reason,
            message: 'Unhandled Promise Rejection'
        });
    }
});

export default PopupMain;
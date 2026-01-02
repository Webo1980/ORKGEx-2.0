// src/content/content-script-main.js
// Main initialization script for ORKG content script
(function() {
  'use strict';
  
  // Check if already initialized
  if (window.orkgContentScript && window.orkgContentScript.initialized) {
    console.log('✅ ORKG content script already initialized');
    return;
  }
  
  console.log('🚀 ORKG Content Script Main starting...');
  
  // Track initialization attempts
  let initAttempts = 0;
  const MAX_INIT_ATTEMPTS = 3;
  
  /**
   * Main initialization function
   */
  async function initialize() {
    try {
      console.log(`📋 Initialization attempt ${initAttempts + 1}/${MAX_INIT_ATTEMPTS}`);
      
      // Check for required services
      if (!window.serviceRegistry) {
        throw new Error('ServiceRegistry not found');
      }
      
      if (!window.contentScriptManager) {
        throw new Error('ContentScriptManager not found');
      }
      
      // Initialize the content script manager
      // This will handle all service initialization
      const manager = await window.contentScriptManager.init();
      
      // Verify initialization
      if (!manager || !manager.initialized) {
        throw new Error('ContentScriptManager initialization failed');
      }
      
      // Mark as successfully initialized
      if (!window.orkgContentScript) {
        window.orkgContentScript = {};
      }
      
      window.orkgContentScript.initialized = true;
      window.orkgContentScript.timestamp = new Date().toISOString();
      window.orkgContentScript.version = '2.0.0';
      
      console.log('✅ ORKG Content Script successfully initialized');
      
      // Log status
      logStatus();
      
      return true;
      
    } catch (error) {
      console.error('❌ Initialization error:', error);
      
      initAttempts++;
      
      if (initAttempts < MAX_INIT_ATTEMPTS) {
        console.log(`🔄 Retrying initialization in ${initAttempts} second(s)...`);
        setTimeout(initialize, initAttempts * 1000);
      } else {
        console.error('❌ Failed to initialize after maximum attempts');
        
        // Mark as failed
        window.orkgContentScript = {
          initialized: false,
          failed: true,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
      
      return false;
    }
  }
  
  /**
   * Log current status
   */
  function logStatus() {
    console.group('📊 ORKG Content Script Status');
    
    // Check ContentScriptManager
    if (window.contentScriptManager) {
      const status = window.contentScriptManager.getStatus();
      console.log('ContentScriptManager:', status);
    }
    
    // Check ServiceRegistry
    if (window.serviceRegistry) {
      const registryStatus = window.serviceRegistry.getStatus();
      console.log('ServiceRegistry:', {
        total: registryStatus.total,
        initialized: registryStatus.initialized,
        services: Object.keys(registryStatus.services || {})
      });
    }
    
    console.groupEnd();
  }
  
  /**
   * Wait for DOM ready
   */
  function waitForDOM() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      // DOM is already ready, initialize immediately
      initialize();
    }
  }
  
  /**
   * Create debug interface
   */
  window.orkgDebug = {
    // Get current status
    status: function() {
      return {
        initialized: window.orkgContentScript?.initialized || false,
        failed: window.orkgContentScript?.failed || false,
        attempts: initAttempts,
        hasServiceRegistry: !!window.serviceRegistry,
        hasContentScriptManager: !!window.contentScriptManager,
        services: window.serviceRegistry ? 
          Object.keys(window.serviceRegistry.getStatus().services) : []
      };
    },
    
    // Retry initialization
    retry: function() {
      initAttempts = 0;
      initialize();
    },
    
    // Log detailed status
    logStatus: logStatus,
    
    // Get service
    getService: function(name) {
      return window.serviceRegistry?.get(name);
    },
    
    // Initialize specific service
    initService: async function(name) {
      if (!window.serviceRegistry) {
        console.error('ServiceRegistry not available');
        return false;
      }
      
      try {
        await window.serviceRegistry.initialize(name);
        console.log(`✅ Service ${name} initialized`);
        return true;
      } catch (error) {
        console.error(`❌ Failed to initialize ${name}:`, error);
        return false;
      }
    },
    
    // Clean up everything
    cleanup: async function() {
      if (window.contentScriptManager) {
        await window.contentScriptManager.cleanup();
      }
      
      window.orkgContentScript = {
        initialized: false,
        cleaned: true,
        timestamp: new Date().toISOString()
      };
    }
  };
  
  // Start initialization
  waitForDOM();
  
})();
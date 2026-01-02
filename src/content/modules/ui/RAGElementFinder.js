// ================================
// modules/ui/RAGElementFinder.js - SIMPLE FIX
// ================================

(function(global) {
  'use strict';
  
  class RAGElementFinder {
    constructor(config = {}) {
      this.config = {
        highlightClasses: [
          'orkg-rag-highlight',
          'orkg-highlighted',
          'rag-highlight',
          'highlighted-text',
          'orkg-highlight' // Add this common class
        ],
        markerSelector: '[data-marker-id]',
        imageSelectors: ['img', 'svg', 'canvas', 'picture'],
        tableSelectors: ['table'],
        ...config
      };
      
      this.elementCache = new Map();
      this.highlightMap = new Map(); // Map highlight IDs to elements
      this.cacheTimeout = 30000;
    }
    
    init() {
      // Build initial highlight map
      this.buildHighlightMap();
      
      // Observe DOM changes to update highlight map
      this.observeHighlights();
      
      return this;
    }
    
    /**
     * Build a map of all highlighted elements
     */
    buildHighlightMap() {
      this.highlightMap.clear();
      
      // Find all elements with highlight IDs
      const highlightedElements = document.querySelectorAll('[data-highlight-id]');
      highlightedElements.forEach(el => {
        const id = el.getAttribute('data-highlight-id');
        if (id) {
          this.highlightMap.set(id, el);
        }
      });
      
      // Also find elements by ID that look like highlights
      const elementsWithIds = document.querySelectorAll('[id*="highlight_"]');
      elementsWithIds.forEach(el => {
        this.highlightMap.set(el.id, el);
      });
      
      console.log(`[RAGElementFinder] Found ${this.highlightMap.size} highlighted elements`);
    }
    
    /**
     * Observe DOM for new highlights
     */
    observeHighlights() {
      if (this.observer) return;
      
      this.observer = new MutationObserver((mutations) => {
        let shouldRebuild = false;
        
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            // Check if any added nodes have highlight attributes
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) { // Element node
                if (node.hasAttribute('data-highlight-id') || 
                    (node.id && node.id.includes('highlight_'))) {
                  shouldRebuild = true;
                  break;
                }
              }
            }
          }
        }
        
        if (shouldRebuild) {
          this.buildHighlightMap();
        }
      });
      
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-highlight-id', 'id']
      });
    }
    
    findElement(type, id, data = null) {
      console.log(`[RAGElementFinder] Looking for ${type} element with ID: ${id}`, data);
      
      // Check cache first
      const cacheKey = `${type}_${id}`;
      const cached = this.getCachedElement(cacheKey);
      if (cached) {
        console.log(`[RAGElementFinder] Found in cache: ${type} ${id}`);
        return cached;
      }
      
      let element = null;
      
      switch (type) {
        case 'text':
          element = this.findTextElement(id, data);
          break;
        case 'image':
          element = this.findImageElement(id, data);
          break;
        case 'table':
          element = this.findTableElement(id, data);
          break;
        default:
          console.warn(`RAGElementFinder: Unknown type: ${type}`);
      }
      
      if (element) {
        this.cacheElement(cacheKey, element);
        console.log(`[RAGElementFinder] Found and cached: ${type} ${id}`);
      } else {
        console.warn(`[RAGElementFinder] Could not find: ${type} ${id}`);
        // Try to rebuild highlight map and search again for text
        if (type === 'text') {
          this.buildHighlightMap();
          element = this.findTextElementFallback(id, data);
          if (element) {
            this.cacheElement(cacheKey, element);
            console.log(`[RAGElementFinder] Found after rebuild: ${type} ${id}`);
          }
        }
      }
      
      return element;
    }
    
    findTextElement(id, textData) {
      let element = null;
      
      // Strategy 1: Check highlight map first
      element = this.highlightMap.get(id);
      if (element && document.contains(element)) {
        console.log('[RAGElementFinder] Found text in highlight map');
        return element;
      }
      
      // Strategy 2: Find by data-highlight-id
      element = document.querySelector(`[data-highlight-id="${id}"]`);
      if (element) {
        console.log('[RAGElementFinder] Found text by data-highlight-id');
        return element;
      }
      
      // Strategy 3: Find by ID
      element = document.getElementById(id);
      if (element) {
        console.log('[RAGElementFinder] Found text by ID');
        return element;
      }
      
      // Strategy 4: Find spans with the ID in their class or data attributes
      const possibleSelectors = [
        `span[id="${id}"]`,
        `span[data-id="${id}"]`,
        `span[data-highlight="${id}"]`,
        `mark[id="${id}"]`,
        `mark[data-highlight-id="${id}"]`,
        `.orkg-highlight[data-id="${id}"]`
      ];
      
      for (const selector of possibleSelectors) {
        element = document.querySelector(selector);
        if (element) {
          console.log(`[RAGElementFinder] Found text by selector: ${selector}`);
          return element;
        }
      }
      
      // Strategy 5: Find by highlighted class and content
      if (textData) {
        const searchText = (textData.text || textData.sentence || textData.value || '').trim();
        if (searchText) {
          const highlights = this.getAllHighlightedElements();
          
          // First try exact match
          for (const el of highlights) {
            const elText = (el.textContent || el.innerText || '').trim();
            if (elText === searchText) {
              console.log('[RAGElementFinder] Found text by exact content match');
              // Assign the ID to this element for future lookups
              el.setAttribute('data-highlight-id', id);
              this.highlightMap.set(id, el);
              return el;
            }
          }
          
          // Then try partial match
          for (const el of highlights) {
            const elText = (el.textContent || el.innerText || '').trim();
            if (elText.includes(searchText) || searchText.includes(elText)) {
              console.log('[RAGElementFinder] Found text by partial content match');
              // Assign the ID to this element for future lookups
              el.setAttribute('data-highlight-id', id);
              this.highlightMap.set(id, el);
              return el;
            }
          }
        }
      }
      
      return null;
    }
    
    findTextElementFallback(id, textData) {
      // Last resort: search all spans and marks for any that might match
      const allSpans = document.querySelectorAll('span, mark');
      
      // Check if any span has styles that indicate highlighting
      for (const span of allSpans) {
        const style = window.getComputedStyle(span);
        const bgColor = style.backgroundColor;
        
        // Check if it has a background color (indicating highlight)
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
          // Check if content matches
          if (textData) {
            const searchText = (textData.text || textData.sentence || textData.value || '').trim();
            const spanText = (span.textContent || '').trim();
            
            if (searchText && spanText && (spanText.includes(searchText) || searchText.includes(spanText))) {
              console.log('[RAGElementFinder] Found text by fallback style + content match');
              // Assign the ID for future lookups
              span.setAttribute('data-highlight-id', id);
              this.highlightMap.set(id, span);
              return span;
            }
          }
        }
      }
      
      return null;
    }
    
    // ... (keep all other methods from the original implementation)
    
    findImageElement(id, imageData) {
      console.log('[RAGElementFinder] Searching for image:', id, imageData);
      let element = null;
      
      // Strategy 1: Find by src (most reliable for actual images)
      if (imageData && imageData.src) {
        const normalizedSearchSrc = imageData.src.replace(/^https?:/, '').replace(/^\/\//, '');
        
        const images = document.querySelectorAll('img');
        for (const img of images) {
          const imgSrcAttr = img.getAttribute('src') || '';
          const imgSrcComputed = img.src || '';
          
          const normalizedAttr = imgSrcAttr.replace(/^https?:/, '').replace(/^\/\//, '');
          const normalizedComputed = imgSrcComputed.replace(/^https?:/, '').replace(/^\/\//, '');
          
          if (normalizedAttr === normalizedSearchSrc || 
              normalizedComputed === normalizedSearchSrc) {
            console.log('[RAGElementFinder] Found image by normalized src match');
            return img;
          }
          
          const imgFile = normalizedAttr.split('/').pop().split('?')[0];
          const searchFile = normalizedSearchSrc.split('/').pop().split('?')[0];
          if (imgFile && searchFile && imgFile === searchFile) {
            console.log('[RAGElementFinder] Found image by filename match');
            return img;
          }
        }
      }
      
      // Other strategies remain the same...
      if (imageData && imageData.alt) {
        element = document.querySelector(`img[alt="${imageData.alt}"]`);
        if (element) {
          console.log('[RAGElementFinder] Found image by alt text');
          return element;
        }
      }
      
      element = document.querySelector(`[data-image-id="${id}"]`);
      if (element) {
        console.log('[RAGElementFinder] Found image by data-image-id');
        return element;
      }
      
      element = document.getElementById(id);
      if (element && element.tagName === 'IMG') {
        console.log('[RAGElementFinder] Found image by ID');
        return element;
      }
      
      const match = id.match(/img_(\d+)/);
      if (match) {
        const index = parseInt(match[1]);
        const images = document.querySelectorAll('img');
        if (images[index]) {
          console.log('[RAGElementFinder] Found image by index');
          return images[index];
        }
      }
      
      return null;
    }
    
    findTableElement(id, tableData) {
      console.log('[RAGElementFinder] Searching for table:', id, tableData);
      let element = null;
      
      element = document.querySelector(`[data-table-id="${id}"]`);
      if (element) {
        console.log('[RAGElementFinder] Found table by data-table-id');
        return element;
      }
      
      element = document.getElementById(id);
      if (element) {
        console.log('[RAGElementFinder] Found table by ID');
        return element;
      }
      
      const tables = document.querySelectorAll('table');
      
      const match = id.match(/table[_-]?(\d+)/);
      if (match) {
        const index = parseInt(match[1]);
        if (tables[index]) {
          console.log('[RAGElementFinder] Found table by index');
          return tables[index];
        }
      }
      
      if (tableData && tableData.caption) {
        for (const table of tables) {
          const caption = table.querySelector('caption');
          if (caption && caption.textContent.includes(tableData.caption)) {
            console.log('[RAGElementFinder] Found table by caption');
            return table;
          }
        }
      }
      
      // Check if it's actually an SVG icon
      if (tableData && tableData.tagName === 'symbol') {
        element = this.findSVGElement(id, tableData);
        if (element) return element;
      }
      
      return null;
    }
    
    findSVGElement(id, data) {
      let element = null;
      
      element = document.getElementById(id);
      if (element) return element;
      
      const svgs = document.querySelectorAll('svg, symbol, use');
      for (const svg of svgs) {
        if (svg.id === id || svg.getAttribute('data-marker-id') === id) {
          return svg;
        }
      }
      
      if (data && data.element && data.element.href) {
        const href = data.element.href;
        element = document.querySelector(`use[href="${href}"], use[xlink:href="${href}"]`);
        if (element) return element;
      }
      
      return null;
    }
    
    getAllHighlightedElements() {
      const selectors = [
        ...this.config.highlightClasses.map(cls => `.${cls}`),
        'span[style*="background"]',
        'mark',
        '[data-highlight-id]'
      ];
      
      return document.querySelectorAll(selectors.join(', '));
    }
    
    getCachedElement(key) {
      const cached = this.elementCache.get(key);
      
      if (!cached) return null;
      
      if (Date.now() - cached.timestamp > this.cacheTimeout) {
        this.elementCache.delete(key);
        return null;
      }
      
      if (!document.contains(cached.element)) {
        this.elementCache.delete(key);
        return null;
      }
      
      return cached.element;
    }
    
    cacheElement(key, element) {
      this.elementCache.set(key, {
        element: element,
        timestamp: Date.now()
      });
    }
    
    highlightElement(element, duration = 2000) {
      if (!element) return;
      
      element.classList.add('orkg-jump-highlight');
      
      setTimeout(() => {
        element.classList.remove('orkg-jump-highlight');
      }, duration);
    }
    
    scrollToElement(element, options = {}) {
      if (!element) return;
      
      const defaultOptions = {
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      };
      
      element.scrollIntoView({ ...defaultOptions, ...options });
    }
    
    jumpToElement(element) {
      if (!element) return false;
      
      this.scrollToElement(element);
      this.highlightElement(element);
      
      return true;
    }
    
    findAndJump(type, id, data = null) {
      const element = this.findElement(type, id, data);
      
      if (element) {
        this.jumpToElement(element);
        return true;
      }
      
      console.warn(`RAGElementFinder: Could not find ${type} element with ID: ${id}`);
      return false;
    }
    
    clearCache() {
      this.elementCache.clear();
      this.highlightMap.clear();
    }
    
    destroy() {
      this.clearCache();
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }
  }
  
  // Export to global scope
  global.RAGElementFinder = RAGElementFinder;
  
})(typeof window !== 'undefined' ? window : this);
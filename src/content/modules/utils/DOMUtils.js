// src/content/modules/utils/DOMUtils.js
// Utility functions for DOM manipulation and traversal
// to support content script operations.
/**
 * DOM Utilities for ORKG Content Script
 * 
 * Collection of DOM manipulation and traversal functions
 */

/**
 * Find elements by selector with optional context
 * @param {string} selector - CSS selector
 * @param {Element} [context=document] - Context element
 * @returns {Element[]} - Found elements
 */
export function findElements(selector, context = document) {
  try {
    return Array.from(context.querySelectorAll(selector));
  } catch (error) {
    console.warn(`Failed to find elements with selector: ${selector}`, error);
    return [];
  }
}

/**
 * Find first element by selector with optional context
 * @param {string} selector - CSS selector
 * @param {Element} [context=document] - Context element
 * @returns {Element|null} - Found element or null
 */
export function findElement(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.warn(`Failed to find element with selector: ${selector}`, error);
    return null;
  }
}

/**
 * Create element with attributes and content
 * @param {string} tag - Element tag name
 * @param {Object} [attributes={}] - Element attributes
 * @param {string|Element|Element[]} [content] - Element content
 * @returns {Element} - Created element
 */
export function createElement(tag, attributes = {}, content) {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'style' && typeof value === 'object') {
      Object.entries(value).forEach(([prop, val]) => {
        element.style[prop] = val;
      });
    } else if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.entries(value).forEach(([prop, val]) => {
        element.dataset[prop] = val;
      });
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Add content
  if (content) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else if (content instanceof Element) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(child => {
        if (child instanceof Element) {
          element.appendChild(child);
        } else if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        }
      });
    }
  }
  
  return element;
}

/**
 * Add styles to page
 * @param {string} cssText - CSS text
 * @param {string} [id] - Style element ID
 * @returns {HTMLStyleElement} - Style element
 */
export function addStyles(cssText, id) {
  // Remove existing style element if ID provided
  if (id) {
    const existingStyle = document.getElementById(id);
    if (existingStyle) {
      existingStyle.remove();
    }
  }
  
  const style = document.createElement('style');
  style.textContent = cssText;
  
  if (id) {
    style.id = id;
  }
  
  document.head.appendChild(style);
  return style;
}

/**
 * Find text in DOM
 * @param {string} text - Text to find
 * @param {Element} [context=document.body] - Context element
 * @param {Object} [options={}] - Options
 * @returns {Range[]} - Found ranges
 */
export function findTextInDOM(text, context = document.body, options = {}) {
  const foundRanges = [];
  const exactMatch = options.exactMatch !== false;
  const maxResults = options.maxResults || 10;
  
  if (!text || text.length < 2) {
    return foundRanges;
  }
  
  // Create text walker
  const walker = document.createTreeWalker(
    context,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip if in UI elements
        const element = node.parentElement;
        if (element && (
          element.closest('.orkg-property-window, .orkg-property-selection-window, .orkg-highlight, .orkg-highlighted') ||
          element.tagName === 'SCRIPT' || 
          element.tagName === 'STYLE' ||
          element.tagName === 'NOSCRIPT'
        )) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Accept if text is contained in node
        const nodeText = node.textContent;
        if (exactMatch ? nodeText.includes(text) : nodeText.toLowerCase().includes(text.toLowerCase())) {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        return NodeFilter.FILTER_SKIP;
      }
    }
  );
  
  // Find matching text nodes
  let node;
  while (foundRanges.length < maxResults && (node = walker.nextNode())) {
    const nodeText = node.textContent;
    let startIndex = 0;
    let currentIndex;
    
    // Find all occurrences in this node
    while (foundRanges.length < maxResults && 
           (currentIndex = exactMatch 
            ? nodeText.indexOf(text, startIndex)
            : nodeText.toLowerCase().indexOf(text.toLowerCase(), startIndex)) !== -1) {
      
      // Create range
      const range = document.createRange();
      range.setStart(node, currentIndex);
      range.setEnd(node, currentIndex + text.length);
      
      foundRanges.push(range);
      
      // Move to next potential match
      startIndex = currentIndex + 1;
    }
  }
  
  return foundRanges;
}

/**
 * Apply highlight to range
 * @param {Range} range - Range to highlight
 * @param {string} [color='#ffeb3b'] - Highlight color
 * @param {Object} [data={}] - Data to attach to highlight
 * @returns {Element} - Highlight element
 */
export function highlightRange(range, color = '#ffeb3b', data = {}) {
  // Create highlight element
  const highlight = document.createElement('span');
  highlight.className = 'orkg-highlight orkg-highlighted';
  highlight.style.backgroundColor = color;
  highlight.dataset.highlightId = data.id || `highlight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add data attributes
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object') {
      highlight.dataset[key] = JSON.stringify(value);
    } else {
      highlight.dataset[key] = value;
    }
  });
  
  // Apply highlight
  try {
    range.surroundContents(highlight);
    return highlight;
  } catch (error) {
    console.warn('Failed to highlight range:', error);
    return null;
  }
}

/**
 * Get element position and size
 * @param {Element} element - Element
 * @returns {Object} - Position and size
 */
export function getElementRect(element) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom + window.scrollY,
    right: rect.right + window.scrollX
  };
}

/**
 * Check if element is visible
 * @param {Element} element - Element
 * @returns {boolean} - True if visible
 */
export function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  
  const rect = element.getBoundingClientRect();
  
  // Element has no size
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }
  
  // Element is outside viewport
  if (rect.right < 0 || rect.bottom < 0 || 
      rect.left > window.innerWidth || rect.top > window.innerHeight) {
    return false;
  }
  
  // Check if element is behind other elements
  const center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
  
  const elementAtPoint = document.elementFromPoint(center.x, center.y);
  if (!elementAtPoint) {
    return false;
  }
  
  // Check if element or its parent is at point
  return element === elementAtPoint || element.contains(elementAtPoint) || elementAtPoint.contains(element);
}

export default {
  findElements,
  findElement,
  createElement,
  addStyles,
  findTextInDOM,
  highlightRange,
  getElementRect,
  isElementVisible
};
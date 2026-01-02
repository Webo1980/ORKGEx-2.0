// src/content/modules/extraction/ImageExtractor.js
// Extracts images from the page, detecting types and calculating importance scores
// for use in content analysis and marker placement.
/**
 * Image Extractor for ORKG Content Script
 * 
 * Extracts and analyzes images on the page with the following features:
 * - Dimension-based filtering
 * - Type detection (charts, diagrams, figures)
 * - Caption extraction
 * - Importance scoring
 * - Position calculation
 */
import serviceRegistry from '../core/ServiceRegistry.js';
import { getElementRect, isElementVisible } from '../utils/DOMUtils.js';

class ImageExtractor {
  constructor() {
    this.isInitialized = false;
    this.config = {
      minWidth: 100,
      minHeight: 100,
      skipIcons: true,
      detectType: true,
      calculateImportance: true,
      extractCaption: true,
      includeBackgroundImages: false
    };
  }
  
  /**
   * Initialize the image extractor
   * @returns {Promise<void>}
   */
  async init() {
    if (this.isInitialized) {
      console.warn('ImageExtractor already initialized');
      return;
    }
    
    console.log('🖼️ Initializing ImageExtractor...');
    
    // No need to initialize anything yet
    this.isInitialized = true;
    console.log('✅ ImageExtractor initialized');
  }
  
  /**
   * Extract all images from the page
   * @param {Object} [config] - Extraction configuration
   * @returns {Promise<Object>} - Extracted images with stats
   */
  async extractImages(config = {}) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    // Merge with default configuration
    const mergedConfig = { ...this.config, ...config };
    console.log('🖼️ Extracting images with config:', mergedConfig);
    
    try {
      // Extract images with different strategies
      const imgElements = this.extractImgElements(mergedConfig);
      const backgroundImages = mergedConfig.includeBackgroundImages ? 
        this.extractBackgroundImages(mergedConfig) : [];
      
      // Combine results
      const allImages = [...imgElements, ...backgroundImages];
      
      // Calculate statistics
      const stats = {
        totalImages: allImages.length,
        withCaptions: allImages.filter(img => img.context?.caption).length,
        byType: this.countByType(allImages),
        averageSize: this.calculateAverageSize(allImages)
      };
      
      console.log(`✅ Extracted ${allImages.length} images`);
      
      // Return standardized result
      return {
        images: allImages,
        count: allImages.length,
        stats: stats
      };
      
    } catch (error) {
      console.error('❌ Image extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * Extract all img elements from the page
   * @param {Object} config - Extraction configuration
   * @returns {Array<Object>} - Extracted image data
   * @private
   */
  extractImgElements(config) {
    const images = [];
    const imgElements = document.querySelectorAll('img');
    
    imgElements.forEach((img, index) => {
      try {
        // Skip if doesn't meet minimum size
        if (!this.meetsMinimumSize(img, config)) {
          return;
        }
        
        // Skip if not visible
        if (!isElementVisible(img)) {
          return;
        }
        
        // Extract image data
        const imageData = this.extractImageData(img, index, config);
        
        // Skip icons if configured
        if (config.skipIcons && this.isLikelyIcon(imageData)) {
          return;
        }
        
        // Add importance score if configured
        if (config.calculateImportance) {
          imageData.importance = this.calculateImportance(imageData);
        }
        
        images.push(imageData);
        
      } catch (error) {
        console.warn(`Error extracting image #${index}:`, error);
      }
    });
    
    return images;
  }
  
  /**
   * Extract background images from elements
   * @param {Object} config - Extraction configuration
   * @returns {Array<Object>} - Extracted background image data
   * @private
   */
  extractBackgroundImages(config) {
    const images = [];
    const elements = document.querySelectorAll('[style*="background-image"]');
    
    elements.forEach((element, index) => {
      try {
        // Get computed style
        const style = window.getComputedStyle(element);
        const backgroundImage = style.backgroundImage;
        
        // Skip if no background image or is none/gradient
        if (!backgroundImage || 
            backgroundImage === 'none' || 
            backgroundImage.startsWith('linear-gradient')) {
          return;
        }
        
        // Extract URL from background-image
        const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (!urlMatch) return;
        
        const url = urlMatch[1];
        
        // Skip if element is too small
        const rect = getElementRect(element);
        if (rect.width < config.minWidth || rect.height < config.minHeight) {
          return;
        }
        
        // Create image data
        const imageData = {
          id: `bg_${index}_${Date.now()}`,
          src: url,
          alt: element.getAttribute('aria-label') || '',
          title: element.title || '',
          type: 'background',
          dimensions: {
            width: rect.width,
            height: rect.height
          },
          position: {
            top: rect.top,
            left: rect.left
          },
          context: {
            element: element.tagName,
            classes: element.className,
            inFigure: false,
            caption: null
          }
        };
        
        // Add importance score if configured
        if (config.calculateImportance) {
          imageData.importance = this.calculateImportance(imageData);
        }
        
        images.push(imageData);
        
      } catch (error) {
        console.warn(`Error extracting background image #${index}:`, error);
      }
    });
    
    return images;
  }
  
  /**
   * Extract data for a single image
   * @param {HTMLImageElement} img - Image element
   * @param {number} index - Image index
   * @param {Object} config - Extraction configuration
   * @returns {Object} - Image data
   * @private
   */
  extractImageData(img, index, config) {
    // Get position and dimensions
    const rect = getElementRect(img);
    
    // Extract context
    const context = this.extractImageContext(img, config);
    
    // Determine image type
    const type = config.detectType ? 
      this.detectImageType(img, context) : 'image';
    
    return {
      id: `img_${index}_${Date.now()}`,
      src: img.src || img.currentSrc || img.getAttribute('src'),
      alt: img.alt || '',
      title: img.title || '',
      type: type,
      dimensions: {
        width: img.naturalWidth || rect.width,
        height: img.naturalHeight || rect.height
      },
      position: {
        top: rect.top,
        left: rect.left
      },
      context: context
    };
  }
  
  /**
   * Extract context information for an image
   * @param {HTMLImageElement} img - Image element
   * @param {Object} config - Extraction configuration
   * @returns {Object} - Context information
   * @private
   */
  extractImageContext(img, config) {
    // Check if image is inside a figure
    const figure = img.closest('figure, .figure');
    
    // Try to find caption
    let caption = null;
    if (config.extractCaption) {
      caption = this.extractCaption(img, figure);
    }
    
    // Look for other context clues
    const nearestHeading = this.findNearestHeading(img);
    
    return {
      caption: caption,
      label: figure ? (figure.id || 'Figure') : null,
      inFigure: !!figure,
      nearestHeading: nearestHeading,
      section: this.findSectionName(img)
    };
  }
  
  /**
   * Extract caption for an image
   * @param {HTMLImageElement} img - Image element
   * @param {Element} figure - Figure element (if any)
   * @returns {string|null} - Caption text
   * @private
   */
  extractCaption(img, figure) {
    // Try figcaption if in figure
    if (figure) {
      const figcaption = figure.querySelector('figcaption, .caption');
      if (figcaption) {
        return figcaption.textContent.trim();
      }
    }
    
    // Try aria-label
    if (img.getAttribute('aria-label')) {
      return img.getAttribute('aria-label');
    }
    
    // Try alt text if descriptive (more than a few words)
    if (img.alt && img.alt.split(/\s+/).length > 3) {
      return img.alt;
    }
    
    // Try adjacent elements that might be captions
    const nextElement = img.nextElementSibling;
    if (nextElement && 
        (nextElement.classList.contains('caption') || 
         nextElement.tagName === 'EM' || 
         nextElement.tagName === 'SMALL')) {
      return nextElement.textContent.trim();
    }
    
    return null;
  }
  
  /**
   * Find nearest heading for an image
   * @param {HTMLImageElement} img - Image element
   * @returns {string|null} - Heading text
   * @private
   */
  findNearestHeading(img) {
    // Look for preceding heading
    let currentElement = img;
    while (currentElement) {
      currentElement = currentElement.previousElementSibling;
      
      if (currentElement && /^H[1-6]$/.test(currentElement.tagName)) {
        return currentElement.textContent.trim();
      }
      
      // Stop if we reach another image or a significant boundary
      if (currentElement && 
          (currentElement.tagName === 'IMG' || 
           currentElement.tagName === 'HR' || 
           currentElement.tagName === 'SECTION')) {
        break;
      }
    }
    
    // Look for parent section's heading
    const section = img.closest('section');
    if (section) {
      const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) {
        return heading.textContent.trim();
      }
    }
    
    return null;
  }
  
  /**
   * Find section name for an image
   * @param {HTMLImageElement} img - Image element
   * @returns {string} - Section name
   * @private
   */
  findSectionName(img) {
    const sectionElements = [
      'section', 'article', '.section', '[role="region"]'
    ];
    
    for (const selector of sectionElements) {
      const section = img.closest(selector);
      if (section) {
        // Try to find id/class that suggests a section name
        if (section.id && section.id !== 'content' && section.id !== 'main') {
          return section.id.replace(/-/g, ' ');
        }
        
        // Look for a heading
        const heading = section.querySelector('h1, h2, h3, h4');
        if (heading) {
          return heading.textContent.trim();
        }
      }
    }
    
    return 'main';
  }
  
  /**
   * Detect image type
   * @param {HTMLImageElement} img - Image element
   * @param {Object} context - Image context
   * @returns {string} - Image type
   * @private
   */
  detectImageType(img, context) {
    // Combine all available text
    const text = [
      img.alt,
      img.title,
      context.caption,
      context.nearestHeading
    ].filter(Boolean).join(' ').toLowerCase();
    
    // Check for specific types
    if (text.includes('chart') || 
        text.includes('graph') || 
        text.includes('plot')) {
      return 'chart';
    }
    
    if (text.includes('diagram') || 
        text.includes('workflow') || 
        text.includes('architecture')) {
      return 'diagram';
    }
    
    if (text.includes('table') || 
        text.includes('tabular')) {
      return 'table';
    }
    
    if (text.includes('screenshot') || 
        text.includes('screen shot')) {
      return 'screenshot';
    }
    
    if (text.includes('equation') || 
        text.includes('formula') || 
        text.includes('math')) {
      return 'equation';
    }
    
    // Fall back to figure if in a figure element
    if (context.inFigure) {
      return 'figure';
    }
    
    // Default type
    return 'image';
  }
  
  /**
   * Check if image meets minimum size requirements
   * @param {HTMLImageElement} img - Image element
   * @param {Object} config - Extraction configuration
   * @returns {boolean} - True if meets minimum size
   * @private
   */
  meetsMinimumSize(img, config) {
    const rect = img.getBoundingClientRect();
    
    // Check displayed size
    if (rect.width < config.minWidth || rect.height < config.minHeight) {
      return false;
    }
    
    // Check natural size if available
    if (img.naturalWidth && img.naturalHeight) {
      if (img.naturalWidth < config.minWidth || img.naturalHeight < config.minHeight) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Check if image is likely an icon
   * @param {Object} imageData - Image data
   * @returns {boolean} - True if likely an icon
   * @private
   */
  isLikelyIcon(imageData) {
    // Check dimensions
    const { width, height } = imageData.dimensions;
    if (width < 50 && height < 50) {
      return true;
    }
    
    // Check square ratio (common for icons)
    if (Math.abs(width - height) < 5 && width < 64) {
      return true;
    }
    
    // Check filename for icon indicators
    const src = imageData.src.toLowerCase();
    const iconIndicators = ['icon', 'logo', 'favicon', 'bullet', 'avatar'];
    
    if (iconIndicators.some(indicator => src.includes(indicator))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Calculate importance score for an image
   * @param {Object} imageData - Image data
   * @returns {Object} - Importance score and level
   * @private
   */
  calculateImportance(imageData) {
    let score = 0.5; // Base score
    
    // Context factors
    if (imageData.context.inFigure) score += 0.2;
    if (imageData.context.caption) score += 0.15;
    if (imageData.context.nearestHeading) score += 0.1;
    
    // Type factors
    if (imageData.type === 'chart') score += 0.15;
    if (imageData.type === 'diagram') score += 0.15;
    if (imageData.type === 'figure') score += 0.1;
    if (imageData.type === 'screenshot') score += 0.05;
    
    // Size factors
    const { width, height } = imageData.dimensions;
    const area = width * height;
    if (area > 250000) score += 0.1; // Very large image (500x500+)
    if (width > 800 || height > 600) score += 0.05; // High resolution
    
    // Cap at 1.0
    score = Math.min(score, 1.0);
    
    // Determine importance level
    const level = score >= 0.8 ? 'high' : 
                 score >= 0.6 ? 'medium' : 
                 score >= 0.4 ? 'low' : 'negligible';
    
    return { score, level };
  }
  
  /**
   * Count images by type
   * @param {Array<Object>} images - Image data array
   * @returns {Object} - Counts by type
   * @private
   */
  countByType(images) {
    const counts = {};
    
    images.forEach(img => {
      const type = img.type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    
    return counts;
  }
  
  /**
   * Calculate average image size
   * @param {Array<Object>} images - Image data array
   * @returns {Object} - Average width and height
   * @private
   */
  calculateAverageSize(images) {
    if (images.length === 0) {
      return { width: 0, height: 0 };
    }
    
    let totalWidth = 0;
    let totalHeight = 0;
    
    images.forEach(img => {
      totalWidth += img.dimensions.width || 0;
      totalHeight += img.dimensions.height || 0;
    });
    
    return {
      width: Math.round(totalWidth / images.length),
      height: Math.round(totalHeight / images.length)
    };
  }
  
  /**
   * Clean up image extractor
   */
  cleanup() {
    this.isInitialized = false;
    console.log('🧹 ImageExtractor cleaned up');
  }
}

// Create instance
const imageExtractor = new ImageExtractor();

// Register with service registry
serviceRegistry.register('imageExtractor', imageExtractor);

export default imageExtractor;
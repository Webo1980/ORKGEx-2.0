// src/content/modules/utils/AnimationUtils.js
// Utility functions for animations and visual effects
// used throughout the content script.
/**
 * Animation Utilities for ORKG Content Script
 * 
 * Collection of animation and visual effect functions
 */
import { getElementRect } from './DOMUtils.js';

/**
 * Generate bezier curve path points
 * @param {Object} start - Start point {x, y}
 * @param {Object} end - End point {x, y}
 * @param {number} [curvature=0.5] - Curvature factor
 * @param {number} [pointCount=20] - Number of points
 * @returns {Object[]} - Path points
 */
export function generateBezierPath(start, end, curvature = 0.5, pointCount = 20) {
  // Calculate control points
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Adjust curvature based on distance
  const adjustedCurvature = Math.min(curvature, distance / 500);
  
  // Control point offset
  const cpx = Math.min(Math.abs(dx) * adjustedCurvature, 300);
  const cpy = Math.min(Math.abs(dy) * adjustedCurvature, 200);
  
  // Control points
  const cp1 = {
    x: start.x + cpx,
    y: start.y - cpy
  };
  
  const cp2 = {
    x: end.x - cpx,
    y: end.y - cpy
  };
  
  // Generate points along the curve
  const points = [];
  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount;
    const point = bezierPoint(start, cp1, cp2, end, t);
    points.push(point);
  }
  
  return points;
}

/**
 * Calculate point on cubic bezier curve
 * @param {Object} p0 - Start point
 * @param {Object} p1 - Control point 1
 * @param {Object} p2 - Control point 2
 * @param {Object} p3 - End point
 * @param {number} t - Parameter (0-1)
 * @returns {Object} - Point on curve
 * @private
 */
function bezierPoint(p0, p1, p2, p3, t) {
  const cX = 3 * (p1.x - p0.x);
  const bX = 3 * (p2.x - p1.x) - cX;
  const aX = p3.x - p0.x - cX - bX;
  
  const cY = 3 * (p1.y - p0.y);
  const bY = 3 * (p2.y - p1.y) - cY;
  const aY = p3.y - p0.y - cY - bY;
  
  const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
  const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;
  
  return { x, y };
}

/**
 * Create fly-to-extension animation
 * @param {Element} element - Source element
 * @param {Object} targetPos - Target position
 * @param {Object} [options={}] - Animation options
 * @returns {Promise<void>} - Resolves when animation completes
 */
export function flyToExtension(element, targetPos, options = {}) {
  return new Promise((resolve) => {
    // Default options
    const opts = {
      duration: 800,
      curvature: 0.5,
      particleCount: 10,
      particleSize: 8,
      particleColor: '#2196F3',
      trail: true,
      explosion: true,
      ...options
    };
    
    // Get element position
    const rect = getElementRect(element);
    const startPos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    
    // Ensure target position is valid
    const endPos = {
      x: targetPos.x || window.innerWidth - 50,
      y: targetPos.y || 100
    };
    
    // Generate path
    const path = generateBezierPath(startPos, endPos, opts.curvature);
    
    // Create particle container
    const container = document.createElement('div');
    container.className = 'orkg-animation-container';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';
    document.body.appendChild(container);
    
    // Create main particle
    const mainParticle = document.createElement('div');
    mainParticle.className = 'orkg-animation-particle main';
    mainParticle.style.cssText = `
      position:fixed;
      width:${opts.particleSize * 2}px;
      height:${opts.particleSize * 2}px;
      border-radius:50%;
      background-color:${opts.particleColor};
      box-shadow:0 0 10px 2px rgba(33,150,243,0.5);
      transform:translate(-50%, -50%);
      z-index:2147483647;
      pointer-events:none;
    `;
    container.appendChild(mainParticle);
    
    // Create trail particles if enabled
    const trailParticles = [];
    if (opts.trail) {
      for (let i = 0; i < opts.particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'orkg-animation-particle trail';
        particle.style.cssText = `
          position:fixed;
          width:${opts.particleSize}px;
          height:${opts.particleSize}px;
          border-radius:50%;
          background-color:${opts.particleColor};
          opacity:0.7;
          transform:translate(-50%, -50%) scale(0.5);
          z-index:2147483646;
          pointer-events:none;
        `;
        container.appendChild(particle);
        trailParticles.push(particle);
      }
    }
    
    // Animation variables
    let startTime = null;
    let animationFrame = null;
    
    // Animation function
    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / opts.duration, 1);
      
      // Get current position
      const pathIndex = Math.floor(progress * (path.length - 1));
      const currentPos = path[pathIndex];
      
      // Update main particle position
      mainParticle.style.left = `${currentPos.x}px`;
      mainParticle.style.top = `${currentPos.y}px`;
      
      // Update trail particles
      if (opts.trail) {
        trailParticles.forEach((particle, i) => {
          const trailIndex = Math.max(0, pathIndex - (i + 1) * 2);
          if (trailIndex >= 0 && trailIndex < path.length) {
            const trailPos = path[trailIndex];
            particle.style.left = `${trailPos.x}px`;
            particle.style.top = `${trailPos.y}px`;
            particle.style.opacity = 0.7 - (i / opts.particleCount) * 0.5;
          } else {
            particle.style.opacity = '0';
          }
        });
      }
      
      // Continue animation or end
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // End animation
        if (opts.explosion) {
          createExplosion(endPos, opts);
        }
        
        // Clean up
        setTimeout(() => {
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
          resolve();
        }, opts.explosion ? 500 : 0);
      }
    }
    
    // Start animation
    animationFrame = requestAnimationFrame(animate);
    
    // Cancel animation function (for cleanup)
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  });
}

/**
 * Create explosion effect
 * @param {Object} position - Position {x, y}
 * @param {Object} [options={}] - Effect options
 * @private
 */
function createExplosion(position, options = {}) {
  const opts = {
    particleCount: 10,
    particleSize: 6,
    particleColor: '#2196F3',
    duration: 500,
    ...options
  };
  
  // Create particles
  const particles = [];
  for (let i = 0; i < opts.particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'orkg-animation-particle explosion';
    particle.style.cssText = `
      position:fixed;
      left:${position.x}px;
      top:${position.y}px;
      width:${opts.particleSize}px;
      height:${opts.particleSize}px;
      border-radius:50%;
      background-color:${opts.particleColor};
      transform:translate(-50%, -50%);
      z-index:2147483646;
      pointer-events:none;
    `;
    document.body.appendChild(particle);
    particles.push(particle);
    
    // Set initial position
    const angle = (i / opts.particleCount) * Math.PI * 2;
    const distance = Math.random() * 50 + 20;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    
    // Animate
    particle.animate(
      [
        { 
          transform: 'translate(-50%, -50%) scale(1)',
          opacity: 1
        },
        { 
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`,
          opacity: 0
        }
      ],
      {
        duration: opts.duration,
        easing: 'ease-out',
        fill: 'forwards'
      }
    );
    
    // Clean up
    setTimeout(() => {
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }
    }, opts.duration);
  }
}

export default {
  generateBezierPath,
  flyToExtension
};
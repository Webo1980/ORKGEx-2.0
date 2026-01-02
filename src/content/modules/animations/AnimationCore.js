// ================================
// src/content/modules/animations/AnimationCore.js
// Core animation utilities and easing functions
// ================================

(function(global) {
    'use strict';
    
    const AnimationCore = {
        // ================================
        // Configuration
        // ================================
        
        config: {
            defaultDuration: 800,
            defaultEasing: 'easeInOutCubic',
            frameRate: 60,
            animationClass: 'orkg-animating'
        },
        
        // ================================
        // Easing Functions
        // ================================
        
        easings: {
            linear: function(t) {
                return t;
            },
            
            easeInQuad: function(t) {
                return t * t;
            },
            
            easeOutQuad: function(t) {
                return t * (2 - t);
            },
            
            easeInOutQuad: function(t) {
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            },
            
            easeInCubic: function(t) {
                return t * t * t;
            },
            
            easeOutCubic: function(t) {
                return (--t) * t * t + 1;
            },
            
            easeInOutCubic: function(t) {
                return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            },
            
            easeInQuart: function(t) {
                return t * t * t * t;
            },
            
            easeOutQuart: function(t) {
                return 1 - (--t) * t * t * t;
            },
            
            easeInOutQuart: function(t) {
                return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
            },
            
            easeInExpo: function(t) {
                return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
            },
            
            easeOutExpo: function(t) {
                return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            },
            
            easeInOutExpo: function(t) {
                if (t === 0) return 0;
                if (t === 1) return 1;
                if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
                return (2 - Math.pow(2, -20 * t + 10)) / 2;
            },
            
            easeInBack: function(t) {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return c3 * t * t * t - c1 * t * t;
            },
            
            easeOutBack: function(t) {
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            },
            
            easeInOutBack: function(t) {
                const c1 = 1.70158;
                const c2 = c1 * 1.525;
                return t < 0.5
                    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
                    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
            },
            
            elasticOut: function(t) {
                const c4 = (2 * Math.PI) / 3;
                return t === 0 ? 0 : t === 1 ? 1 :
                    Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
            },
            
            bounceOut: function(t) {
                const n1 = 7.5625;
                const d1 = 2.75;
                
                if (t < 1 / d1) {
                    return n1 * t * t;
                } else if (t < 2 / d1) {
                    return n1 * (t -= 1.5 / d1) * t + 0.75;
                } else if (t < 2.5 / d1) {
                    return n1 * (t -= 2.25 / d1) * t + 0.9375;
                } else {
                    return n1 * (t -= 2.625 / d1) * t + 0.984375;
                }
            }
        },
        
        // ================================
        // Position and Geometry
        // ================================
        
        getElementPosition: function(element) {
            const rect = element.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: rect.width,
                height: rect.height
            };
        },
        
        getExtensionPosition: function() {
            // Try to find extension panel
            const panel = document.querySelector(
                '.orkg-extension-panel, #orkg-panel, .orkg-analyzer, .popup-container'
            );
            
            if (panel) {
                const rect = panel.getBoundingClientRect();
                return {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
            }
            
            // Default to top-right corner
            return {
                x: window.innerWidth - 50,
                y: 50
            };
        },
        
        calculateDistance: function(p1, p2) {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            return Math.sqrt(dx * dx + dy * dy);
        },
        
        calculateAngle: function(p1, p2) {
            return Math.atan2(p2.y - p1.y, p2.x - p1.x);
        },
        
        // ================================
        // Path Calculations
        // ================================
        
        calculateBezierPath: function(start, end, curveHeight) {
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2 - (curveHeight || 100);
            
            return {
                start: start,
                control1: { x: midX, y: midY },
                control2: { x: midX, y: midY },
                end: end
            };
        },
        
        getPointOnBezier: function(t, p0, p1, p2, p3) {
            const u = 1 - t;
            const tt = t * t;
            const uu = u * u;
            const uuu = uu * u;
            const ttt = tt * t;
            
            const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
            const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
            
            return { x, y };
        },
        
        // ================================
        // Animation Engine
        // ================================
        
        animate: function(options) {
            const {
                duration = this.config.defaultDuration,
                easing = this.config.defaultEasing,
                onUpdate,
                onComplete,
                onStart
            } = options;
            
            const easingFunction = typeof easing === 'function' 
                ? easing 
                : this.easings[easing] || this.easings.linear;
            
            const startTime = performance.now();
            let animationId = null;
            
            if (onStart) onStart();
            
            const tick = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easingFunction(progress);
                
                if (onUpdate) onUpdate(easedProgress, progress);
                
                if (progress < 1) {
                    animationId = requestAnimationFrame(tick);
                } else {
                    if (onComplete) onComplete();
                }
            };
            
            animationId = requestAnimationFrame(tick);
            
            // Return cancel function
            return function cancel() {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
            };
        },
        
        // ================================
        // CSS Animation Helpers
        // ================================
        
        addCSSAnimation: function(element, animationName, duration, options = {}) {
            const {
                delay = 0,
                easing = 'ease',
                fillMode = 'forwards',
                iterationCount = 1
            } = options;
            
            element.style.animation = `${animationName} ${duration}ms ${easing} ${delay}ms ${iterationCount} ${fillMode}`;
            
            return new Promise((resolve) => {
                const handleEnd = () => {
                    element.removeEventListener('animationend', handleEnd);
                    resolve();
                };
                element.addEventListener('animationend', handleEnd);
            });
        },
        
        removeCSSAnimation: function(element) {
            element.style.animation = '';
        },
        
        // ================================
        // Transform Utilities
        // ================================
        
        setTransform: function(element, transforms) {
            const transformString = Object.entries(transforms)
                .map(([key, value]) => {
                    switch (key) {
                        case 'x':
                            return `translateX(${value}px)`;
                        case 'y':
                            return `translateY(${value}px)`;
                        case 'scale':
                            return `scale(${value})`;
                        case 'rotate':
                            return `rotate(${value}deg)`;
                        case 'scaleX':
                            return `scaleX(${value})`;
                        case 'scaleY':
                            return `scaleY(${value})`;
                        default:
                            return '';
                    }
                })
                .filter(t => t)
                .join(' ');
            
            element.style.transform = transformString;
        },
        
        // ================================
        // Visibility and Cloning
        // ================================
        
        createClone: function(element, options = {}) {
            const {
                preserveStyles = true,
                className = 'orkg-clone',
                position = 'fixed'
            } = options;
            
            const rect = element.getBoundingClientRect();
            const clone = element.cloneNode(true);
            
            clone.className = className;
            clone.style.position = position;
            clone.style.left = rect.left + 'px';
            clone.style.top = rect.top + 'px';
            clone.style.width = rect.width + 'px';
            clone.style.height = rect.height + 'px';
            clone.style.margin = '0';
            clone.style.zIndex = '999999';
            clone.style.pointerEvents = 'none';
            
            if (preserveStyles) {
                const computedStyles = window.getComputedStyle(element);
                clone.style.cssText += computedStyles.cssText;
            }
            
            return clone;
        },
        
        // ================================
        // Keyframe Management
        // ================================
        
        injectKeyframes: function(name, keyframes) {
            const styleId = `orkg-keyframes-${name}`;
            
            // Check if already exists
            if (document.getElementById(styleId)) {
                return;
            }
            
            const style = document.createElement('style');
            style.id = styleId;
            
            let keyframeString = `@keyframes ${name} {\n`;
            
            Object.entries(keyframes).forEach(([key, value]) => {
                keyframeString += `  ${key} {\n`;
                Object.entries(value).forEach(([prop, val]) => {
                    const cssProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                    keyframeString += `    ${cssProp}: ${val};\n`;
                });
                keyframeString += '  }\n';
            });
            
            keyframeString += '}';
            
            style.textContent = keyframeString;
            document.head.appendChild(style);
        },
        
        removeKeyframes: function(name) {
            const styleId = `orkg-keyframes-${name}`;
            const style = document.getElementById(styleId);
            if (style) {
                style.remove();
            }
        },
        
        // ================================
        // Utility Functions
        // ================================
        
        lerp: function(start, end, progress) {
            return start + (end - start) * progress;
        },
        
        clamp: function(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },
        
        randomInRange: function(min, max) {
            return Math.random() * (max - min) + min;
        },
        
        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        throttle: function(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    };
    
    // Export to global scope
    global.AnimationCore = AnimationCore;
    
    console.log('🎬 AnimationCore utilities loaded');
    
})(typeof window !== 'undefined' ? window : this);
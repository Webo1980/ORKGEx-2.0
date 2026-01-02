// ================================
// src/content/modules/animations/FlyAnimation.js
// Fly-to-extension animation with particle effects
// ================================

(function(global) {
    'use strict';
    
    // Check for AnimationCore dependency
    const AnimationCore = global.AnimationCore || {};
    
    const FlyAnimation = {
        // ================================
        // Configuration
        // ================================
        
        config: {
            duration: 800,
            curveHeight: 100,
            particleCount: 15,
            trailCount: 5,
            particleColors: ['#e86161', '#FF6B6B', '#FF8A8A'],
            defaultColor: '#e86161',
            cloneOpacity: 0.9,
            endScale: 0.2,
            rotationAmount: 360
        },
        
        // ================================
        // Main Animation Method
        // ================================
        
        flyToExtension: function(element, data, options = {}) {
            return new Promise((resolve) => {
                // Merge options with defaults
                const config = Object.assign({}, this.config, options);
                
                // Get positions
                const startPos = this.getElementPosition(element);
                const endPos = this.getExtensionPosition();
                
                // Create visual elements
                const clone = this.createAnimationClone(element, data, config);
                const particles = this.createParticles(startPos, config);
                const trails = this.createTrails(clone, config);
                
                // Add elements to DOM
                document.body.appendChild(clone);
                particles.forEach(p => document.body.appendChild(p));
                trails.forEach(t => document.body.appendChild(t));
                
                // Start animations
                this.animateElement(clone, startPos, endPos, config);
                this.animateParticles(particles, startPos, endPos, config);
                this.animateTrails(trails, startPos, endPos, config);
                
                // Create arrival effect
                setTimeout(() => {
                    this.createArrivalEffect(endPos, config);
                }, config.duration - 100);
                
                // Cleanup
                setTimeout(() => {
                    clone.remove();
                    particles.forEach(p => p.remove());
                    trails.forEach(t => t.remove());
                    resolve();
                }, config.duration + 200);
            });
        },
        
        // ================================
        // Element Creation
        // ================================
        
        createAnimationClone: function(element, data, config) {
            const rect = element.getBoundingClientRect();
            const clone = document.createElement('div');
            
            clone.className = 'orkg-fly-clone';
            clone.style.cssText = `
                position: fixed !important;
                left: ${rect.left}px !important;
                top: ${rect.top}px !important;
                width: ${rect.width}px !important;
                height: ${rect.height}px !important;
                z-index: 100000 !important;
                pointer-events: none !important;
                opacity: ${config.cloneOpacity} !important;
                will-change: transform, opacity !important;
            `;
            
            // Handle different element types
            if (element.tagName === 'IMG') {
                const img = document.createElement('img');
                img.src = element.src;
                img.style.cssText = `
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 8px !important;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
                `;
                clone.appendChild(img);
            } else if (element.tagName === 'TABLE') {
                clone.style.background = 'white !important';
                clone.style.borderRadius = '8px !important';
                clone.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3) !important';
                clone.style.overflow = 'hidden !important';
                
                // Add table icon
                const icon = document.createElement('div');
                icon.innerHTML = '📊';
                icon.style.cssText = `
                    font-size: 32px !important;
                    text-align: center !important;
                    line-height: ${rect.height}px !important;
                `;
                clone.appendChild(icon);
            } else {
                // Text or generic element
                clone.style.background = `linear-gradient(135deg, ${config.defaultColor} 0%, ${config.particleColors[1]} 100%) !important`;
                clone.style.borderRadius = '8px !important';
                clone.style.boxShadow = '0 10px 30px rgba(232, 97, 97, 0.3) !important';
                clone.style.padding = '8px !important';
                clone.style.color = 'white !important';
                clone.style.fontSize = '14px !important;';
                clone.style.display = 'flex !important';
                clone.style.alignItems = 'center !important';
                clone.style.justifyContent = 'center !important';
                
                // Add text preview
                if (data && data.text) {
                    clone.textContent = data.text.substring(0, 50) + (data.text.length > 50 ? '...' : '');
                } else {
                    clone.innerHTML = '📄';
                }
            }
            
            return clone;
        },
        
        createParticles: function(position, config) {
            const particles = [];
            
            for (let i = 0; i < config.particleCount; i++) {
                const particle = document.createElement('div');
                const color = config.particleColors[i % config.particleColors.length];
                const size = 4 + Math.random() * 6;
                const offsetX = (Math.random() - 0.5) * 20;
                const offsetY = (Math.random() - 0.5) * 20;
                
                particle.className = 'orkg-particle';
                particle.style.cssText = `
                    position: fixed !important;
                    left: ${position.x + offsetX}px !important;
                    top: ${position.y + offsetY}px !important;
                    width: ${size}px !important;
                    height: ${size}px !important;
                    background: ${color} !important;
                    border-radius: 50% !important;
                    z-index: 99999 !important;
                    pointer-events: none !important;
                    opacity: 0.8 !important;
                    box-shadow: 0 0 ${size}px ${color} !important;
                    will-change: transform, opacity !important;
                `;
                
                particles.push(particle);
            }
            
            return particles;
        },
        
        createTrails: function(element, config) {
            const trails = [];
            const rect = element.getBoundingClientRect();
            
            for (let i = 0; i < config.trailCount; i++) {
                const trail = element.cloneNode(true);
                trail.className = 'orkg-trail';
                trail.style.cssText = element.style.cssText;
                trail.style.opacity = (0.3 - i * 0.05).toString();
                trail.style.zIndex = (99998 - i).toString();
                trail.style.filter = `blur(${i * 2}px)`;
                trails.push(trail);
            }
            
            return trails;
        },
        
        // ================================
        // Animation Methods
        // ================================
        
        animateElement: function(element, start, end, config) {
            const startX = start.x - parseFloat(element.style.width) / 2;
            const startY = start.y - parseFloat(element.style.height) / 2;
            const endX = end.x;
            const endY = end.y;
            
            if (AnimationCore.animate) {
                AnimationCore.animate({
                    duration: config.duration,
                    easing: 'easeInOutCubic',
                    onUpdate: (progress) => {
                        // Calculate position on curved path
                        const currentX = this.lerp(startX, endX, progress);
                        const currentY = this.lerp(startY, endY, progress) - 
                                       Math.sin(progress * Math.PI) * config.curveHeight;
                        
                        // Apply transformations
                        element.style.left = currentX + 'px';
                        element.style.top = currentY + 'px';
                        element.style.transform = `scale(${1 - progress * (1 - config.endScale)}) rotate(${progress * config.rotationAmount}deg)`;
                        element.style.opacity = (1 - progress * 0.3).toString();
                    }
                });
            } else {
                // Fallback animation
                this.fallbackAnimate(element, startX, startY, endX, endY, config);
            }
        },
        
        animateParticles: function(particles, start, end, config) {
            particles.forEach((particle, i) => {
                const delay = i * 30;
                const angle = (i / particles.length) * Math.PI * 2;
                const radius = 50 + Math.random() * 50;
                
                setTimeout(() => {
                    // Mid-point with spread
                    const midX = start.x + (end.x - start.x) * 0.5 + Math.cos(angle) * radius;
                    const midY = start.y + (end.y - start.y) * 0.5 + Math.sin(angle) * radius;
                    
                    // First move to mid-point
                    particle.style.transition = `all ${config.duration / 2}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                    particle.style.left = midX + 'px';
                    particle.style.top = midY + 'px';
                    particle.style.transform = 'scale(1.5)';
                    
                    // Then converge to end point
                    setTimeout(() => {
                        particle.style.transition = `all ${config.duration / 2}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                        particle.style.left = end.x + 'px';
                        particle.style.top = end.y + 'px';
                        particle.style.opacity = '0';
                        particle.style.transform = 'scale(0)';
                    }, config.duration / 2);
                }, delay);
            });
        },
        
        animateTrails: function(trails, start, end, config) {
            trails.forEach((trail, i) => {
                setTimeout(() => {
                    trail.style.transition = `all ${config.duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
                    trail.style.left = end.x - parseFloat(trail.style.width) / 2 + 'px';
                    trail.style.top = end.y - parseFloat(trail.style.height) / 2 + 'px';
                    trail.style.transform = `scale(${config.endScale}) rotate(${config.rotationAmount}deg)`;
                    trail.style.opacity = '0';
                }, i * 50);
            });
        },
        
        fallbackAnimate: function(element, startX, startY, endX, endY, config) {
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / config.duration, 1);
                const eased = this.easeInOutCubic(progress);
                
                // Calculate position
                const currentX = this.lerp(startX, endX, eased);
                const currentY = this.lerp(startY, endY, eased) - 
                               Math.sin(progress * Math.PI) * config.curveHeight;
                
                // Apply transformations
                element.style.left = currentX + 'px';
                element.style.top = currentY + 'px';
                element.style.transform = `scale(${1 - eased * (1 - config.endScale)}) rotate(${eased * config.rotationAmount}deg)`;
                element.style.opacity = (1 - eased * 0.3).toString();
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        },
        
        // ================================
        // Effects
        // ================================
        
        createArrivalEffect: function(position, config) {
            // Create explosion effect
            const explosion = document.createElement('div');
            explosion.className = 'orkg-explosion';
            explosion.style.cssText = `
                position: fixed !important;
                left: ${position.x - 30}px !important;
                top: ${position.y - 30}px !important;
                width: 60px !important;
                height: 60px !important;
                background: radial-gradient(circle, ${config.defaultColor} 0%, transparent 70%) !important;
                border-radius: 50% !important;
                z-index: 100001 !important;
                pointer-events: none !important;
                opacity: 0 !important;
                transform: scale(0) !important;
            `;
            
            // Create ripple effect
            const ripple = document.createElement('div');
            ripple.className = 'orkg-ripple';
            ripple.style.cssText = `
                position: fixed !important;
                left: ${position.x - 50}px !important;
                top: ${position.y - 50}px !important;
                width: 100px !important;
                height: 100px !important;
                border: 2px solid ${config.defaultColor} !important;
                border-radius: 50% !important;
                z-index: 100000 !important;
                pointer-events: none !important;
                opacity: 0 !important;
                transform: scale(0) !important;
            `;
            
            document.body.appendChild(explosion);
            document.body.appendChild(ripple);
            
            // Animate with CSS transitions
            requestAnimationFrame(() => {
                explosion.style.transition = 'all 0.6s ease-out';
                explosion.style.opacity = '1';
                explosion.style.transform = 'scale(3)';
                
                ripple.style.transition = 'all 0.8s ease-out';
                ripple.style.opacity = '1';
                ripple.style.transform = 'scale(2)';
                
                setTimeout(() => {
                    explosion.style.opacity = '0';
                    ripple.style.opacity = '0';
                }, 300);
            });
            
            // Cleanup
            setTimeout(() => {
                explosion.remove();
                ripple.remove();
            }, 1000);
            
            // Create success flash
            this.createSuccessFlash(position, config);
        },
        
        createSuccessFlash: function(position, config) {
            const flash = document.createElement('div');
            flash.className = 'orkg-success-flash';
            flash.style.cssText = `
                position: fixed !important;
                left: ${position.x - 100}px !important;
                top: ${position.y - 100}px !important;
                width: 200px !important;
                height: 200px !important;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 60%) !important;
                border-radius: 50% !important;
                z-index: 100002 !important;
                pointer-events: none !important;
                opacity: 0 !important;
                mix-blend-mode: screen !important;
            `;
            
            document.body.appendChild(flash);
            
            // Animate
            requestAnimationFrame(() => {
                flash.style.transition = 'opacity 0.3s ease-out';
                flash.style.opacity = '1';
                
                setTimeout(() => {
                    flash.style.transition = 'opacity 0.5s ease-out';
                    flash.style.opacity = '0';
                }, 100);
            });
            
            // Cleanup
            setTimeout(() => {
                flash.remove();
            }, 800);
        },
        
        // ================================
        // Utility Methods
        // ================================
        
        getElementPosition: function(element) {
            if (AnimationCore.getElementPosition) {
                return AnimationCore.getElementPosition(element);
            }
            
            const rect = element.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        },
        
        getExtensionPosition: function() {
            if (AnimationCore.getExtensionPosition) {
                return AnimationCore.getExtensionPosition();
            }
            
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
            
            return {
                x: window.innerWidth - 50,
                y: 50
            };
        },
        
        lerp: function(start, end, progress) {
            if (AnimationCore.lerp) {
                return AnimationCore.lerp(start, end, progress);
            }
            return start + (end - start) * progress;
        },
        
        easeInOutCubic: function(t) {
            if (AnimationCore.easings && AnimationCore.easings.easeInOutCubic) {
                return AnimationCore.easings.easeInOutCubic(t);
            }
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
    };
    
    // Export to global scope
    global.FlyAnimation = FlyAnimation;
    
    // Also expose as AnimationService for backward compatibility
    global.AnimationService = FlyAnimation;
    
    console.log('🚀 FlyAnimation module loaded');
    
})(typeof window !== 'undefined' ? window : this);
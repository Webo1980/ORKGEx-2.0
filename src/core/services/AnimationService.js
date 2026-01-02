// ================================
// src/core/services/AnimationService.js - CONSOLIDATED
// Merged AnimationEngine + FlyAnimation into single service
// ================================

export class AnimationService {
    constructor(config = {}) {
        this.config = {
            duration: 800,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            particleCount: 20,
            particleColors: ['#4CAF50', '#81C784', '#A5D6A7'],
            trailLength: 5,
            showTrail: true,
            targetSelector: '.orkg-extension-panel',
            successDuration: 500,
            ...config
        };
        
        this.activeAnimations = new Map();
        this.animationQueue = [];
        this.isAnimating = false;
        this.animationIdCounter = 0;
    }
    
    async init() {
        console.log('✨ AnimationService initialized');
        this.injectStyles();
    }
    
    /**
     * Main animation method - flies content to extension
     */
    async flyToExtension(sourceElement, contentData) {
        const animationId = `fly_${++this.animationIdCounter}_${Date.now()}`;
        this.activeAnimations.set(animationId, { sourceElement, contentData });
        
        try {
            // Get positions
            const startPos = this.getElementPosition(sourceElement);
            const endPos = this.getExtensionPosition();
            
            // Create animation elements
            const clone = this.createClone(sourceElement, contentData);
            const particleContainer = this.createParticleContainer(animationId);
            
            // Add to DOM
            document.body.appendChild(clone);
            document.body.appendChild(particleContainer);
            
            // Animate
            await this.animateElement(clone, startPos, endPos, particleContainer);
            
            // Cleanup
            this.cleanup(animationId, clone, particleContainer);
            
            return { success: true, animationId };
            
        } catch (error) {
            console.error('Animation failed:', error);
            this.activeAnimations.delete(animationId);
            throw error;
        }
    }
    
    createClone(sourceElement, contentData) {
        const clone = document.createElement('div');
        clone.className = 'orkg-fly-clone';
        clone.dataset.animationId = contentData.id;
        
        const rect = sourceElement.getBoundingClientRect();
        
        // Set initial position
        Object.assign(clone.style, {
            position: 'fixed',
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            zIndex: '999999',
            pointerEvents: 'none',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            background: 'white',
            opacity: '0'
        });
        
        // Add content based on type
        if (sourceElement.tagName === 'IMG') {
            const img = document.createElement('img');
            img.src = contentData.src || sourceElement.src;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            clone.appendChild(img);
        } else if (sourceElement.tagName === 'CANVAS') {
            const canvas = document.createElement('canvas');
            canvas.width = rect.width;
            canvas.height = rect.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(sourceElement, 0, 0, rect.width, rect.height);
            clone.appendChild(canvas);
        } else {
            clone.innerHTML = sourceElement.outerHTML;
        }
        
        return clone;
    }
    
    createParticleContainer(animationId) {
        const container = document.createElement('div');
        container.className = 'orkg-particle-container';
        container.dataset.animationId = animationId;
        Object.assign(container.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: '999998'
        });
        return container;
    }
    
    async animateElement(clone, startPos, endPos, particleContainer) {
        return new Promise((resolve) => {
            // Calculate bezier path
            const path = this.calculateBezierPath(startPos, endPos);
            
            // Phase 1: Fade in
            requestAnimationFrame(() => {
                clone.style.opacity = '1';
                clone.style.transform = 'scale(0.95)';
                clone.style.transition = 'all 200ms ease-out';
                
                // Create particles
                this.createParticles(particleContainer, startPos);
                
                // Phase 2: Main animation
                setTimeout(() => {
                    this.animateAlongPath(clone, path, this.config.duration);
                    this.animateParticles(particleContainer, path);
                    
                    if (this.config.showTrail) {
                        this.createTrailEffect(clone, path);
                    }
                    
                    // Phase 3: Arrival
                    setTimeout(() => {
                        clone.style.transform = 'scale(0.3)';
                        clone.style.opacity = '0';
                        this.createExplosionEffect(endPos, particleContainer);
                        
                        setTimeout(resolve, this.config.successDuration);
                    }, this.config.duration);
                }, 200);
            });
        });
    }
    
    calculateBezierPath(start, end) {
        const distance = Math.sqrt(
            Math.pow(end.x - start.x, 2) + 
            Math.pow(end.y - start.y, 2)
        );
        const curveHeight = Math.min(distance * 0.3, 150);
        
        return {
            start: { x: start.x, y: start.y },
            control1: {
                x: start.x + (end.x - start.x) * 0.25,
                y: start.y - curveHeight
            },
            control2: {
                x: start.x + (end.x - start.x) * 0.75,
                y: end.y - curveHeight / 2
            },
            end: { x: end.x, y: end.y }
        };
    }
    
    animateAlongPath(element, path, duration) {
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = this.easeInOutCubic(progress);
            
            const position = this.getPointOnBezier(path, easedProgress);
            
            element.style.left = `${position.x - parseFloat(element.style.width) / 2}px`;
            element.style.top = `${position.y - parseFloat(element.style.height) / 2}px`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    getPointOnBezier(path, t) {
        const { start, control1, control2, end } = path;
        const mt = 1 - t;
        
        return {
            x: Math.pow(mt, 3) * start.x +
               3 * Math.pow(mt, 2) * t * control1.x +
               3 * mt * Math.pow(t, 2) * control2.x +
               Math.pow(t, 3) * end.x,
            y: Math.pow(mt, 3) * start.y +
               3 * Math.pow(mt, 2) * t * control1.y +
               3 * mt * Math.pow(t, 2) * control2.y +
               Math.pow(t, 3) * end.y
        };
    }
    
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    createParticles(container, position) {
        for (let i = 0; i < this.config.particleCount; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'orkg-particle';
                
                const color = this.config.particleColors[i % this.config.particleColors.length];
                const size = 4 + Math.random() * 4;
                
                Object.assign(particle.style, {
                    position: 'absolute',
                    width: `${size}px`,
                    height: `${size}px`,
                    background: color,
                    borderRadius: '50%',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    opacity: '0',
                    pointerEvents: 'none',
                    boxShadow: `0 0 6px ${color}`
                });
                
                container.appendChild(particle);
                
                setTimeout(() => {
                    particle.style.transition = `all ${this.config.duration}ms ease-out`;
                    particle.style.opacity = '1';
                }, 10);
            }, i * 20);
        }
    }
    
    animateParticles(container, path) {
        const particles = container.querySelectorAll('.orkg-particle');
        particles.forEach((particle, index) => {
            const delay = index * 30;
            const duration = this.config.duration + Math.random() * 200;
            
            setTimeout(() => {
                this.animateAlongPath(particle, path, duration);
                
                setTimeout(() => {
                    particle.style.opacity = '0';
                }, duration - 200);
            }, delay);
        });
    }
    
    createTrailEffect(element, path) {
        for (let i = 0; i < this.config.trailLength; i++) {
            setTimeout(() => {
                const trail = document.createElement('div');
                trail.className = 'orkg-trail';
                
                const rect = element.getBoundingClientRect();
                
                Object.assign(trail.style, {
                    position: 'fixed',
                    width: `${rect.width}px`,
                    height: `${rect.height}px`,
                    left: `${rect.left}px`,
                    top: `${rect.top}px`,
                    background: 'linear-gradient(45deg, #4CAF50, #81C784)',
                    borderRadius: '8px',
                    opacity: `${0.3 - i * 0.05}`,
                    pointerEvents: 'none',
                    zIndex: '999997',
                    transform: `scale(${1 - i * 0.1})`
                });
                
                document.body.appendChild(trail);
                
                setTimeout(() => {
                    trail.style.transition = 'opacity 300ms ease-out';
                    trail.style.opacity = '0';
                    
                    setTimeout(() => trail.remove(), 300);
                }, 100);
            }, i * 50);
        }
    }
    
    createExplosionEffect(position, container) {
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'orkg-explosion-particle';
            
            const angle = (i / 20) * Math.PI * 2;
            const velocity = 50 + Math.random() * 50;
            const size = 3 + Math.random() * 3;
            
            Object.assign(particle.style, {
                position: 'absolute',
                width: `${size}px`,
                height: `${size}px`,
                background: '#4CAF50',
                borderRadius: '50%',
                left: `${position.x}px`,
                top: `${position.y}px`,
                pointerEvents: 'none'
            });
            
            container.appendChild(particle);
            
            requestAnimationFrame(() => {
                particle.style.transition = 'all 500ms ease-out';
                particle.style.transform = `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px)`;
                particle.style.opacity = '0';
            });
            
            setTimeout(() => particle.remove(), 500);
        }
    }
    
    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height
        };
    }
    
    getExtensionPosition() {
        const extensionContainer = document.querySelector(this.config.targetSelector);
        
        if (extensionContainer) {
            const rect = extensionContainer.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                width: 48,
                height: 48
            };
        }
        
        // Default: top-right corner
        return {
            x: window.innerWidth - 50,
            y: 50,
            width: 48,
            height: 48
        };
    }
    
    cleanup(animationId, clone, particleContainer) {
        this.activeAnimations.delete(animationId);
        if (clone) clone.remove();
        if (particleContainer) particleContainer.remove();
    }
    
    injectStyles() {
        const styleId = 'orkg-animation-styles';
        if (document.getElementById(styleId)) return;
        
        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = `
            .orkg-fly-clone { will-change: transform, opacity; }
            .orkg-particle { will-change: transform, opacity; }
            .orkg-trail { will-change: opacity, transform; }
            .orkg-explosion-particle { will-change: transform, opacity; }
        `;
        document.head.appendChild(styles);
    }
    
    cancelAll() {
        this.activeAnimations.forEach((_, id) => {
            const clone = document.querySelector(`[data-animation-id="${id}"]`);
            const container = document.querySelector(`.orkg-particle-container[data-animation-id="${id}"]`);
            if (clone) clone.remove();
            if (container) container.remove();
        });
        this.activeAnimations.clear();
    }
    
    destroy() {
        this.cancelAll();
        const styles = document.getElementById('orkg-animation-styles');
        if (styles) styles.remove();
    }
}
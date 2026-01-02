// ================================
// src/content/modules/animations/ParticleEffects.js
// Advanced particle effects system
// ================================

(function(global) {
    'use strict';
    
    const ParticleEffects = {
        // ================================
        // Configuration
        // ================================
        
        config: {
            maxParticles: 100,
            defaultLifetime: 2000,
            defaultSize: 6,
            defaultSpeed: 2,
            defaultGravity: 0.1,
            defaultFriction: 0.98,
            colors: {
                orkg: ['#e86161', '#FF6B6B', '#FF8A8A'],
                success: ['#4CAF50', '#81C784', '#A5D6A7'],
                info: ['#2196F3', '#64B5F6', '#90CAF9'],
                warning: ['#FFA726', '#FFB74D', '#FFCC80']
            }
        },
        
        activeEmitters: new Map(),
        particles: [],
        animationId: null,
        canvas: null,
        ctx: null,
        
        // ================================
        // Particle Class
        // ================================
        
        Particle: class {
            constructor(x, y, options = {}) {
                this.x = x;
                this.y = y;
                this.vx = options.vx || (Math.random() - 0.5) * 4;
                this.vy = options.vy || (Math.random() - 0.5) * 4;
                this.size = options.size || ParticleEffects.config.defaultSize;
                this.color = options.color || '#e86161';
                this.lifetime = options.lifetime || ParticleEffects.config.defaultLifetime;
                this.age = 0;
                this.gravity = options.gravity || ParticleEffects.config.defaultGravity;
                this.friction = options.friction || ParticleEffects.config.defaultFriction;
                this.opacity = 1;
                this.rotation = 0;
                this.rotationSpeed = options.rotationSpeed || (Math.random() - 0.5) * 0.2;
                this.shape = options.shape || 'circle';
            }
            
            update(deltaTime) {
                this.age += deltaTime;
                
                if (this.age >= this.lifetime) {
                    return false; // Particle is dead
                }
                
                // Apply physics
                this.vy += this.gravity;
                this.vx *= this.friction;
                this.vy *= this.friction;
                
                // Update position
                this.x += this.vx;
                this.y += this.vy;
                
                // Update visual properties
                const lifeRatio = this.age / this.lifetime;
                this.opacity = 1 - lifeRatio;
                this.size *= 0.99; // Shrink over time
                this.rotation += this.rotationSpeed;
                
                return true; // Particle is alive
            }
            
            render(ctx) {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                switch (this.shape) {
                    case 'circle':
                        this.renderCircle(ctx);
                        break;
                    case 'square':
                        this.renderSquare(ctx);
                        break;
                    case 'star':
                        this.renderStar(ctx);
                        break;
                    case 'triangle':
                        this.renderTriangle(ctx);
                        break;
                    default:
                        this.renderCircle(ctx);
                }
                
                ctx.restore();
            }
            
            renderCircle(ctx) {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add glow effect
                ctx.shadowBlur = this.size * 2;
                ctx.shadowColor = this.color;
                ctx.fill();
            }
            
            renderSquare(ctx) {
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
            }
            
            renderStar(ctx) {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                    const x = Math.cos(angle) * this.size;
                    const y = Math.sin(angle) * this.size;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.fill();
            }
            
            renderTriangle(ctx) {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(-this.size, this.size);
                ctx.lineTo(this.size, this.size);
                ctx.closePath();
                ctx.fill();
            }
        },
        
        // ================================
        // Emitter Class
        // ================================
        
        Emitter: class {
            constructor(x, y, options = {}) {
                this.x = x;
                this.y = y;
                this.rate = options.rate || 5; // Particles per second
                this.spread = options.spread || Math.PI * 2; // Emission angle
                this.speed = options.speed || 2;
                this.colors = options.colors || ParticleEffects.config.colors.orkg;
                this.particleOptions = options.particleOptions || {};
                this.active = true;
                this.lastEmit = Date.now();
                this.duration = options.duration || Infinity;
                this.startTime = Date.now();
            }
            
            update() {
                if (!this.active) return [];
                
                const now = Date.now();
                const elapsed = now - this.startTime;
                
                if (this.duration !== Infinity && elapsed > this.duration) {
                    this.active = false;
                    return [];
                }
                
                const timeSinceLastEmit = now - this.lastEmit;
                const particlesToEmit = Math.floor((timeSinceLastEmit * this.rate) / 1000);
                
                const newParticles = [];
                
                if (particlesToEmit > 0) {
                    for (let i = 0; i < particlesToEmit; i++) {
                        const angle = (Math.random() - 0.5) * this.spread;
                        const speed = this.speed * (0.5 + Math.random() * 0.5);
                        
                        const particle = new ParticleEffects.Particle(this.x, this.y, {
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            color: this.colors[Math.floor(Math.random() * this.colors.length)],
                            ...this.particleOptions
                        });
                        
                        newParticles.push(particle);
                    }
                    
                    this.lastEmit = now;
                }
                
                return newParticles;
            }
            
            moveTo(x, y) {
                this.x = x;
                this.y = y;
            }
            
            stop() {
                this.active = false;
            }
        },
        
        // ================================
        // Canvas Management
        // ================================
        
        ensureCanvas: function() {
            if (this.canvas && document.body.contains(this.canvas)) {
                return;
            }
            
            this.canvas = document.createElement('canvas');
            this.canvas.className = 'orkg-particle-canvas';
            this.canvas.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                pointer-events: none !important;
                z-index: 99998 !important;
            `;
            
            this.updateCanvasSize();
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            
            // Handle resize
            window.addEventListener('resize', () => this.updateCanvasSize());
        },
        
        updateCanvasSize: function() {
            if (!this.canvas) return;
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        },
        
        // ================================
        // Particle System
        // ================================
        
        createEmitter: function(x, y, options = {}) {
            this.ensureCanvas();
            
            const emitter = new this.Emitter(x, y, options);
            const emitterId = `emitter_${Date.now()}_${Math.random()}`;
            
            this.activeEmitters.set(emitterId, emitter);
            
            if (!this.animationId) {
                this.startAnimation();
            }
            
            return emitterId;
        },
        
        removeEmitter: function(emitterId) {
            this.activeEmitters.delete(emitterId);
            
            if (this.activeEmitters.size === 0 && this.particles.length === 0) {
                this.stopAnimation();
            }
        },
        
        burst: function(x, y, options = {}) {
            this.ensureCanvas();
            
            const {
                count = 30,
                colors = this.config.colors.orkg,
                speed = 5,
                lifetime = 1500,
                gravity = 0.2,
                shape = 'circle'
            } = options;
            
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                const velocity = speed * (0.5 + Math.random() * 0.5);
                
                const particle = new this.Particle(x, y, {
                    vx: Math.cos(angle) * velocity,
                    vy: Math.sin(angle) * velocity,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    lifetime: lifetime,
                    gravity: gravity,
                    shape: shape
                });
                
                this.particles.push(particle);
            }
            
            if (!this.animationId) {
                this.startAnimation();
            }
        },
        
        trail: function(startX, startY, endX, endY, options = {}) {
            this.ensureCanvas();
            
            const {
                count = 20,
                colors = this.config.colors.orkg,
                lifetime = 1000,
                delay = 50
            } = options;
            
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    const progress = i / count;
                    const x = startX + (endX - startX) * progress;
                    const y = startY + (endY - startY) * progress;
                    
                    const particle = new this.Particle(x, y, {
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        color: colors[i % colors.length],
                        lifetime: lifetime,
                        gravity: 0,
                        size: 4 + (1 - progress) * 4
                    });
                    
                    this.particles.push(particle);
                }, i * delay);
            }
            
            if (!this.animationId) {
                this.startAnimation();
            }
        },
        
        // ================================
        // Animation Loop
        // ================================
        
        startAnimation: function() {
            if (this.animationId) return;
            
            let lastTime = performance.now();
            
            const animate = (currentTime) => {
                const deltaTime = currentTime - lastTime;
                lastTime = currentTime;
                
                // Clear canvas
                if (this.ctx) {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    
                    // Update and spawn particles from emitters
                    for (const emitter of this.activeEmitters.values()) {
                        const newParticles = emitter.update();
                        this.particles.push(...newParticles);
                    }
                    
                    // Update and render particles
                    this.particles = this.particles.filter(particle => {
                        const alive = particle.update(deltaTime);
                        if (alive) {
                            particle.render(this.ctx);
                        }
                        return alive;
                    });
                    
                    // Limit max particles
                    if (this.particles.length > this.config.maxParticles) {
                        this.particles = this.particles.slice(-this.config.maxParticles);
                    }
                }
                
                // Continue animation if needed
                if (this.particles.length > 0 || this.activeEmitters.size > 0) {
                    this.animationId = requestAnimationFrame(animate);
                } else {
                    this.stopAnimation();
                }
            };
            
            this.animationId = requestAnimationFrame(animate);
        },
        
        stopAnimation: function() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            // Clean up canvas if no particles
            if (this.particles.length === 0 && this.canvas) {
                if (this.canvas.parentNode) {
                    this.canvas.remove();
                }
                this.canvas = null;
                this.ctx = null;
            }
        },
        
        // ================================
        // Utility Methods
        // ================================
        
        clear: function() {
            this.particles = [];
            this.activeEmitters.clear();
            this.stopAnimation();
            
            if (this.canvas && this.canvas.parentNode) {
                this.canvas.remove();
            }
            this.canvas = null;
            this.ctx = null;
        },
        
        getStats: function() {
            return {
                particleCount: this.particles.length,
                emitterCount: this.activeEmitters.size,
                isAnimating: !!this.animationId,
                hasCanvas: !!this.canvas
            };
        }
    };
    
    // Export to global scope
    global.ParticleEffects = ParticleEffects;
    
    console.log('✨ ParticleEffects system loaded');
    
})(typeof window !== 'undefined' ? window : this);
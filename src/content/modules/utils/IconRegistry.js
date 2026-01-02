// src/content/modules/utils/IconRegistry.js

(function(global) {
    'use strict';
    
    /**
     * Centralized icon registry for the marker system
     */
    class IconRegistry {
        constructor() {
            // SVG icon definitions
            this.icons = {
                // Navigation
                chevronDown: '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>',
                chevronUp: '<svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5z"/></svg>',
                chevronRight: '<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>',
                
                // Actions
                close: '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
                delete: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
                edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
                send: '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
                sendAll: '<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>',
                info: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
                
                // Content types
                clipboard: '<svg viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>',
                fileText: '<svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>',
                image: '<svg viewBox="0 0 24 24"><path d="M21,3H3C2,3 1,4 1,5V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V5C23,4 22,3 21,3M5,17L8.5,12.5L11,15.5L14.5,11L19,17H5Z"/></svg>',
                table: '<svg viewBox="0 0 24 24"><path d="M5,4H19A2,2 0 0,1 21,6V18A2,2 0 0,1 19,20H5A2,2 0 0,1 3,18V6A2,2 0 0,1 5,4M5,8V12H11V8H5M13,8V12H19V8H13M5,14V18H11V14H5M13,14V18H19V14H13Z"/></svg>',
                
                // UI elements
                minimize: '<svg viewBox="0 0 24 24"><path d="M6 19h12v2H6z"/></svg>',
                maximize: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
                dock: '<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>',
                
                // Status indicators
                success: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
                warning: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
                error: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
                
                // ORKG specific
                orkg: '<svg viewBox="0 0 24 24"><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor">ORKG</text></svg>'
            };
            
            // Icon aliases for backward compatibility
            this.aliases = {
                'file-text': 'fileText',
                'info-circle': 'info',
                'times': 'close',
                'trash': 'delete',
                'pencil': 'edit',
                'paper-plane': 'send',
                'check': 'success',
                'exclamation-triangle': 'warning',
                'times-circle': 'error'
            };
        }
        
        /**
         * Get icon SVG by name
         */
        getIcon(name, className = '', size = 16) {
            // Check for alias
            const iconName = this.aliases[name] || name;
            
            // Get icon definition
            let svg = this.icons[iconName];
            
            if (!svg) {
                console.warn(`Icon not found: ${name}`);
                return this.getPlaceholderIcon(name, className, size);
            }
            
            // Add class and size attributes
            svg = svg.replace('<svg', `<svg class="orkg-icon ${className}" width="${size}" height="${size}" fill="currentColor" stroke="none"`);
            
            return svg;
        }
        
        /**
         * Get placeholder icon for missing icons
         */
        getPlaceholderIcon(name, className, size) {
            return `<svg class="orkg-icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                <text x="12" y="16" text-anchor="middle" font-size="8" fill="currentColor">?</text>
            </svg>`;
        }
        
        /**
         * Register custom icon
         */
        registerIcon(name, svg) {
            this.icons[name] = svg;
        }
        
        /**
         * Register icon alias
         */
        registerAlias(alias, iconName) {
            this.aliases[alias] = iconName;
        }
        
        /**
         * Get all icon names
         */
        getIconNames() {
            return Object.keys(this.icons);
        }
        
        /**
         * Check if icon exists
         */
        hasIcon(name) {
            return !!(this.icons[name] || this.icons[this.aliases[name]]);
        }
    }
    
    // Create singleton instance
    global.IconRegistry = new IconRegistry();
    
    console.log('📢 IconRegistry loaded with', Object.keys(global.IconRegistry.icons).length, 'icons');
    
})(typeof window !== 'undefined' ? window : this);
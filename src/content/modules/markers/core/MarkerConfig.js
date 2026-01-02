// src/content/modules/markers/core/MarkerConfig.js

(function(global) {
    'use strict';
    
    /**
     * Centralized configuration for the marker system
     * Provides default settings and theme management
     */
    class MarkerConfig {
        constructor() {
            // Core settings
            this.core = {
                markerSize: 44,
                markerOffset: 10,
                tooltipDelay: 200,
                menuHideDelay: 300,
                animationDuration: 300,
                defaultMinScore: 0.3,
                maxMarkersPerType: 100,
                enableAnimations: true,
                enableTooltips: true,
                enableMenus: true
            };
            
            // Theme settings
            this.theme = {
                colors: {
                    primary: '#e86161',
                    primaryLight: '#FF6B6B', 
                    primaryDark: '#E04848',
                    success: '#4CAF50',
                    info: '#2196F3',
                    warning: '#FFA726',
                    danger: '#f44336',
                    text: '#2196F3',
                    image: '#4CAF50',
                    table: '#9C27B0'
                },
                shadows: {
                    default: '0 3px 10px rgba(255, 82, 82, 0.3), 0 1px 3px rgba(0, 0, 0, 0.12)',
                    hover: '0 4px 14px rgba(255, 82, 82, 0.4), 0 2px 4px rgba(0, 0, 0, 0.15)',
                    active: '0 5px 15px rgba(255, 82, 82, 0.5)'
                },
                borderRadius: '50%',
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.95)'
            };
            
            // Type-specific configurations
            this.types = {
                text: {
                    color: '#2196F3',
                    icon: 'file-text',
                    minLength: 2,
                    maxLength: 500,
                    enableUpdate: true,
                    particleColor: '#2196F3'
                },
                image: {
                    color: '#4CAF50',
                    icon: 'image',
                    minWidth: 100,
                    minHeight: 100,
                    position: 'top-right',
                    includeBackground: false,
                    includeSVG: false,
                    includeCanvas: false,
                    particleColor: '#4CAF50'
                },
                table: {
                    color: '#9C27B0',
                    icon: 'table',
                    minRows: 2,
                    minColumns: 2,
                    enableUpdate: false,
                    particleColor: '#9C27B0'
                }
            };
            
            // Animation settings
            this.animations = {
                entrance: {
                    duration: 300,
                    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                    scale: { from: 0, to: 1 }
                },
                hover: {
                    duration: 200,
                    scale: 1.1
                },
                click: {
                    duration: 100,
                    scale: 0.95
                },
                removal: {
                    duration: 300,
                    easing: 'ease-out'
                }
            };
            
            // Icon definitions (SVG paths)
            this.icons = {
                delete: 'M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z',
                edit: 'M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231z',
                info: 'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z',
                send: 'M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 492.3 160 478.3V396.4c0-4 1.6-7.8 4.4-10.6L331.8 202.8c5.9-6.3 5.6-16.1-.6-22s-16.1-5.6-22 .6L127 368.1 19.6 307.3c-9.1-5.1-14.8-14.5-14.8-24.7s5.6-19.5 14.6-24.7L483.9 5.6c11.2-6.8 25.1-5.8 35.2 0z',
                sendAll: 'M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z M8 4a.5.5 0 0 1 .5.5V6H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V7H6a.5.5 0 0 1 0-1h1.5V4.5A.5.5 0 0 1 8 4z'
            };
            
            // Message configuration
            this.messages = {
                deleteConfirm: {
                    title: 'Delete {type} Marker',
                    message: 'Are you sure you want to delete this {type} marker?',
                    confirmText: 'Delete',
                    cancelText: 'Cancel'
                },
                sendOptions: {
                    title: 'Send to ORKG',
                    message: 'Choose what to send to the extension',
                    sendThis: 'Send Only This',
                    sendAll: 'Send All Content',
                    cancel: 'Cancel'
                }
            };
        }
        
        /**
         * Get configuration for a specific marker type
         */
        getTypeConfig(type) {
            return {
                ...this.core,
                ...this.types[type],
                theme: this.theme,
                animations: this.animations,
                icons: this.icons
            };
        }
        
        /**
         * Update configuration
         */
        update(updates) {
            if (updates.core) {
                Object.assign(this.core, updates.core);
            }
            if (updates.theme) {
                this.theme = { ...this.theme, ...updates.theme };
            }
            if (updates.types) {
                Object.keys(updates.types).forEach(type => {
                    if (this.types[type]) {
                        Object.assign(this.types[type], updates.types[type]);
                    }
                });
            }
        }
        
        /**
         * Get color for confidence level
         */
        getConfidenceColor(confidence) {
            if (confidence >= 0.8) return '#10b981';
            if (confidence >= 0.5) return '#f59e0b';
            return '#ef4444';
        }
        
        /**
         * Get icon SVG
         */
        getIcon(name, size = 14) {
            const path = this.icons[name];
            if (!path) return '';
            
            return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="currentColor">
                <path d="${path}"/>
            </svg>`;
        }
    }
    
    // Create singleton instance
    global.MarkerConfig = new MarkerConfig();
    
})(typeof window !== 'undefined' ? window : this);
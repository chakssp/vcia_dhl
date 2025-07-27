/**
 * DashboardIntegration.js - Integration layer between Feature Flags UI and KC system
 * 
 * Handles:
 * - Component registration
 * - Event synchronization
 * - Data flow between UI and core system
 * - Theme integration
 * - Menu integration
 * 
 * @module DashboardIntegration
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class DashboardIntegration {
        constructor() {
            this.dashboard = null;
            this.mlFeatureFlags = null;
            this.components = {};
            this.initialized = false;
            
            // AIDEV-NOTE: dashboard-integration; integration layer for KC system
            this._setupEventHandlers();
        }

        /**
         * Initialize the integration
         * @param {Object} config - Configuration options
         */
        async initialize(config = {}) {
            if (this.initialized) {
                KC.Logger.warn('DashboardIntegration already initialized');
                return;
            }

            try {
                // Load required components
                await this._loadComponents();

                // Get MLFeatureFlags instance
                this.mlFeatureFlags = config.mlFeatureFlags || window.MLFeatureFlags;
                if (!this.mlFeatureFlags) {
                    throw new Error('MLFeatureFlags instance not provided');
                }

                // Initialize dashboard
                this.dashboard = new KC.FeatureFlagsDashboard();
                this.dashboard.initialize(this.mlFeatureFlags);

                // Set up component references
                this._setupComponents();

                // Register with KC system
                this._registerWithKC();

                // Add to navigation if available
                this._addToNavigation();

                this.initialized = true;
                KC.Logger.info('DashboardIntegration initialized successfully');

                // Emit initialization event
                if (KC.EventBus) {
                    KC.EventBus.emit('FEATURE_FLAGS_DASHBOARD_READY', {
                        dashboard: this.dashboard,
                        integration: this
                    });
                }

            } catch (error) {
                KC.Logger.error('Failed to initialize DashboardIntegration:', error);
                throw error;
            }
        }

        /**
         * Load required components
         */
        async _loadComponents() {
            // Components are already loaded via script tags
            // This would be where dynamic imports would go if needed
            
            const requiredComponents = [
                'FeatureFlagsDashboard',
                'FlagList',
                'FlagEditor',
                'FlagCard',
                'RolloutVisualizer',
                'TargetingRules'
            ];

            const missingComponents = requiredComponents.filter(comp => !KC[comp]);
            
            if (missingComponents.length > 0) {
                throw new Error(`Missing required components: ${missingComponents.join(', ')}`);
            }
        }

        /**
         * Set up component references
         */
        _setupComponents() {
            // Create component instances
            this.components = {
                flagList: new KC.FlagList({
                    onFlagClick: (key, flag) => this.dashboard._showFlagDetails(key),
                    onFlagToggle: (key, flag) => this.dashboard._toggleFlag(key),
                    onFlagEdit: (key, flag) => this.dashboard._editFlag(key),
                    onFlagDelete: (key, flag) => this.dashboard._deleteFlag(key)
                }),
                flagEditor: new KC.FlagEditor({
                    onSave: (data) => this.dashboard._saveFlag(data.key, data),
                    onCancel: () => KC.Logger.info('Flag editor cancelled')
                }),
                flagCard: KC.FlagCard,
                rolloutVisualizer: KC.RolloutVisualizer,
                targetingRules: KC.TargetingRules
            };

            // Register components with dashboard
            Object.entries(this.components).forEach(([name, instance]) => {
                this.dashboard.setComponent(name, instance);
            });
        }

        /**
         * Set up event handlers
         */
        _setupEventHandlers() {
            if (!KC.EventBus) return;

            // Listen for navigation events
            KC.EventBus.on('NAVIGATE_TO_FEATURE_FLAGS', () => {
                this.showDashboard();
            });

            // Listen for external flag updates
            KC.EventBus.on('ML_FLAG_EXTERNAL_UPDATE', (data) => {
                if (this.dashboard) {
                    this.dashboard._refreshFlags();
                }
            });

            // Listen for theme changes
            KC.EventBus.on('THEME_CHANGED', (data) => {
                this._applyTheme(data.theme);
            });

            // Listen for flag evaluation events from MLFeatureFlags
            KC.EventBus.on('ML_FLAG_EVALUATED', (data) => {
                this._handleFlagEvaluation(data);
            });
        }

        /**
         * Register with KC system
         */
        _registerWithKC() {
            // Register as a KC module
            KC.modules = KC.modules || {};
            KC.modules.featureFlagsDashboard = {
                name: 'Feature Flags Dashboard',
                version: '1.0.0',
                instance: this,
                dashboard: this.dashboard
            };

            // Register global access
            KC.FeatureFlagsIntegration = this;
        }

        /**
         * Add to navigation menu
         */
        _addToNavigation() {
            // Check if navigation system exists
            if (!KC.NavigationManager && !KC.AppController) {
                KC.Logger.warn('No navigation system found');
                return;
            }

            // Add to navigation menu
            const navItem = {
                id: 'feature-flags',
                label: 'Feature Flags',
                icon: 'icon-feature-flag',
                action: () => this.showDashboard(),
                position: 'tools', // or 'main' depending on KC navigation structure
                badge: () => this._getActiveFlagsCount()
            };

            if (KC.NavigationManager && KC.NavigationManager.addItem) {
                KC.NavigationManager.addItem(navItem);
            }

            // Add keyboard shortcut
            if (KC.KeyboardManager && KC.KeyboardManager.register) {
                KC.KeyboardManager.register({
                    key: 'F',
                    ctrl: true,
                    shift: true,
                    description: 'Open Feature Flags Dashboard',
                    handler: () => this.showDashboard()
                });
            }
        }

        /**
         * Show the dashboard
         * @param {Object} options - Display options
         */
        showDashboard(options = {}) {
            if (!this.initialized) {
                KC.Logger.error('DashboardIntegration not initialized');
                return;
            }

            const { 
                container = '#main-content',
                modal = false,
                fullscreen = false
            } = options;

            if (modal || fullscreen) {
                this._showInModal(fullscreen);
            } else {
                this._showInContainer(container);
            }

            // Track usage
            if (KC.Analytics) {
                KC.Analytics.track('feature_flags_dashboard_opened', {
                    method: modal ? 'modal' : 'inline',
                    flagCount: this.dashboard.flags.size
                });
            }
        }

        /**
         * Show dashboard in container
         * @param {string|HTMLElement} container - Container selector or element
         */
        _showInContainer(container) {
            const element = typeof container === 'string' 
                ? document.querySelector(container) 
                : container;

            if (!element) {
                KC.Logger.error('Container not found:', container);
                return;
            }

            // Clear existing content
            element.innerHTML = '';

            // Add dashboard styles if not already loaded
            this._ensureStylesLoaded();

            // Mount dashboard
            this.dashboard.mount(element);

            // Update URL if using routing
            if (KC.Router) {
                KC.Router.navigate('/feature-flags', { replace: true });
            }
        }

        /**
         * Show dashboard in modal
         * @param {boolean} fullscreen - Whether to show fullscreen
         */
        _showInModal(fullscreen = false) {
            if (!KC.ModalManager) {
                KC.Logger.error('ModalManager not available');
                return;
            }

            const modalContainer = document.createElement('div');
            modalContainer.id = 'feature-flags-modal-container';

            KC.ModalManager.show({
                title: 'ML Feature Flags',
                content: modalContainer.outerHTML,
                size: fullscreen ? 'fullscreen' : 'xlarge',
                onOpen: () => {
                    // Mount dashboard after modal opens
                    const container = document.getElementById('feature-flags-modal-container');
                    if (container) {
                        this._ensureStylesLoaded();
                        this.dashboard.mount(container);
                    }
                },
                onClose: () => {
                    // Cleanup if needed
                },
                buttons: [
                    {
                        text: 'Close',
                        class: 'btn-secondary',
                        action: 'close'
                    }
                ]
            });
        }

        /**
         * Ensure styles are loaded
         */
        _ensureStylesLoaded() {
            const styleId = 'feature-flags-styles';
            if (document.getElementById(styleId)) {
                return;
            }

            const link = document.createElement('link');
            link.id = styleId;
            link.rel = 'stylesheet';
            link.href = 'agents_output/wave6/agent_002_feature-flags-ui/src/styles/feature-flags.css';
            document.head.appendChild(link);
        }

        /**
         * Apply theme
         * @param {string} theme - Theme name
         */
        _applyTheme(theme) {
            // The dashboard uses CSS variables that automatically adapt to theme changes
            KC.Logger.info('Theme applied to Feature Flags Dashboard:', theme);
        }

        /**
         * Handle flag evaluation
         * @param {Object} data - Evaluation data
         */
        _handleFlagEvaluation(data) {
            if (!this.dashboard) return;

            // Update evaluation metrics
            const flag = this.dashboard.flags.get(data.flag);
            if (flag) {
                flag.evaluations = (flag.evaluations || 0) + 1;
                flag.lastEvaluation = new Date();
                
                // Update specific flag card if visible
                const cards = document.querySelectorAll(`[data-flag-key="${data.flag}"]`);
                cards.forEach(card => {
                    const cardInstance = card._flagCardInstance;
                    if (cardInstance && cardInstance.recordEvaluation) {
                        cardInstance.recordEvaluation();
                    }
                });
            }

            // Update global stats
            this.dashboard._updateStats();
        }

        /**
         * Get active flags count
         * @returns {number} Count of active flags
         */
        _getActiveFlagsCount() {
            if (!this.dashboard || !this.dashboard.flags) {
                return 0;
            }

            let count = 0;
            this.dashboard.flags.forEach(flag => {
                if (flag.enabled) count++;
            });

            return count;
        }

        /**
         * Create flag programmatically
         * @param {Object} flagData - Flag configuration
         * @returns {Promise} Promise that resolves when flag is created
         */
        async createFlag(flagData) {
            if (!this.initialized) {
                throw new Error('DashboardIntegration not initialized');
            }

            return new Promise((resolve, reject) => {
                try {
                    this.mlFeatureFlags.registerFlag(flagData);
                    this.dashboard._refreshFlags();
                    
                    KC.Logger.info('Flag created via integration:', flagData.key);
                    resolve(flagData);
                } catch (error) {
                    KC.Logger.error('Failed to create flag:', error);
                    reject(error);
                }
            });
        }

        /**
         * Update flag programmatically
         * @param {string} key - Flag key
         * @param {Object} updates - Updates to apply
         * @returns {Promise} Promise that resolves when flag is updated
         */
        async updateFlag(key, updates) {
            if (!this.initialized) {
                throw new Error('DashboardIntegration not initialized');
            }

            return new Promise((resolve, reject) => {
                try {
                    this.mlFeatureFlags.updateFlag(key, updates);
                    this.dashboard._refreshFlags();
                    
                    KC.Logger.info('Flag updated via integration:', key);
                    resolve({ key, ...updates });
                } catch (error) {
                    KC.Logger.error('Failed to update flag:', error);
                    reject(error);
                }
            });
        }

        /**
         * Get flag configuration
         * @param {string} key - Flag key
         * @returns {Object} Flag configuration
         */
        getFlag(key) {
            if (!this.dashboard) return null;
            return this.dashboard.flags.get(key);
        }

        /**
         * Get all flags
         * @returns {Map} All flags
         */
        getAllFlags() {
            if (!this.dashboard) return new Map();
            return new Map(this.dashboard.flags);
        }

        /**
         * Export dashboard state
         * @returns {Object} Dashboard state
         */
        exportState() {
            return {
                flags: Array.from(this.dashboard.flags.entries()),
                filters: this.dashboard.filters,
                sortBy: this.dashboard.sortBy,
                sortOrder: this.dashboard.sortOrder,
                timestamp: new Date().toISOString()
            };
        }

        /**
         * Import dashboard state
         * @param {Object} state - State to import
         */
        importState(state) {
            if (state.flags) {
                // Update flags in MLFeatureFlags
                state.flags.forEach(([key, flag]) => {
                    try {
                        if (this.mlFeatureFlags.storage.get(key)) {
                            this.mlFeatureFlags.updateFlag(key, flag);
                        } else {
                            this.mlFeatureFlags.registerFlag(flag);
                        }
                    } catch (error) {
                        KC.Logger.error(`Failed to import flag ${key}:`, error);
                    }
                });
            }

            if (state.filters) {
                this.dashboard.filters = { ...this.dashboard.filters, ...state.filters };
            }

            if (state.sortBy) {
                this.dashboard.sortBy = state.sortBy;
            }

            if (state.sortOrder) {
                this.dashboard.sortOrder = state.sortOrder;
            }

            this.dashboard._refreshFlags();
            KC.Logger.info('Dashboard state imported');
        }

        /**
         * Destroy integration
         */
        destroy() {
            // Remove from navigation
            if (KC.NavigationManager && KC.NavigationManager.removeItem) {
                KC.NavigationManager.removeItem('feature-flags');
            }

            // Unregister keyboard shortcuts
            if (KC.KeyboardManager && KC.KeyboardManager.unregister) {
                KC.KeyboardManager.unregister('F', true, true);
            }

            // Destroy dashboard
            if (this.dashboard) {
                this.dashboard.destroy();
            }

            // Cleanup components
            Object.values(this.components).forEach(component => {
                if (component && component.destroy) {
                    component.destroy();
                }
            });

            // Remove from KC modules
            if (KC.modules && KC.modules.featureFlagsDashboard) {
                delete KC.modules.featureFlagsDashboard;
            }

            // Remove global reference
            if (KC.FeatureFlagsIntegration === this) {
                delete KC.FeatureFlagsIntegration;
            }

            this.initialized = false;
            KC.Logger.info('DashboardIntegration destroyed');
        }
    }

    // Export to KC namespace
    window.KC = window.KC || {};
    window.KC.DashboardIntegration = DashboardIntegration;

    // Auto-initialize if MLFeatureFlags is available
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.MLFeatureFlags && KC.autoInitFeatureFlags !== false) {
                const integration = new DashboardIntegration();
                integration.initialize({ mlFeatureFlags: window.MLFeatureFlags })
                    .catch(error => {
                        KC.Logger.error('Auto-initialization failed:', error);
                    });
            }
        });
    }

})(window);
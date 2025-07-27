/**
 * FeatureFlagsDashboard.js - Main dashboard component for ML Feature Flags
 * 
 * Provides comprehensive UI for managing feature flags including:
 * - Real-time flag status monitoring
 * - Flag creation, editing, and deletion
 * - Search, filter, and sort capabilities
 * - A/B test results visualization
 * - Flag history and analytics
 * 
 * @module FeatureFlagsDashboard
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class FeatureFlagsDashboard {
        constructor() {
            this.flags = new Map();
            this.filters = {
                search: '',
                type: 'all',
                status: 'all',
                environment: 'all'
            };
            this.sortBy = 'name';
            this.sortOrder = 'asc';
            this.selectedFlags = new Set();
            this.components = {};
            this.mlFeatureFlags = null;
            this.container = null;
            
            // AIDEV-NOTE: dashboard-init; dashboard initialization with KC integration
            this._initializeComponents();
            this._initializeEventListeners();
        }

        /**
         * Initialize child components
         */
        _initializeComponents() {
            // Components will be initialized when imported
            this.components = {
                flagList: null,
                flagEditor: null,
                flagCard: null,
                rolloutVisualizer: null,
                targetingRules: null
            };
        }

        /**
         * Initialize event listeners
         */
        _initializeEventListeners() {
            if (KC && KC.EventBus) {
                // Listen for flag updates
                KC.EventBus.on('ML_FLAG_UPDATED', this._handleFlagUpdate.bind(this));
                KC.EventBus.on('ML_FLAG_CREATED', this._handleFlagCreated.bind(this));
                KC.EventBus.on('ML_FLAG_DELETED', this._handleFlagDeleted.bind(this));
                KC.EventBus.on('ML_FLAG_EVALUATION', this._handleFlagEvaluation.bind(this));
                
                // Listen for theme changes
                KC.EventBus.on('THEME_CHANGED', this._handleThemeChange.bind(this));
            }
        }

        /**
         * Initialize the dashboard with MLFeatureFlags instance
         * @param {MLFeatureFlags} mlFeatureFlags - Instance from Agent 1
         */
        initialize(mlFeatureFlags) {
            this.mlFeatureFlags = mlFeatureFlags;
            
            // Load all flags
            this._loadFlags();
            
            // Initialize components with mlFeatureFlags
            Object.values(this.components).forEach(component => {
                if (component && component.initialize) {
                    component.initialize(mlFeatureFlags);
                }
            });

            KC.Logger.info('FeatureFlagsDashboard initialized');
        }

        /**
         * Mount dashboard to DOM element
         * @param {string|HTMLElement} container - Container element or selector
         */
        mount(container) {
            this.container = typeof container === 'string' 
                ? document.querySelector(container) 
                : container;

            if (!this.container) {
                KC.Logger.error('FeatureFlagsDashboard: Invalid container');
                return;
            }

            this.render();
        }

        /**
         * Render the dashboard
         */
        render() {
            if (!this.container) return;

            this.container.innerHTML = `
                <div class="feature-flags-dashboard">
                    <div class="dashboard-header">
                        <h1 class="dashboard-title">
                            <i class="icon-feature-flag"></i>
                            ML Feature Flags
                        </h1>
                        <div class="header-actions">
                            <button class="btn btn-primary" id="create-flag-btn">
                                <i class="icon-plus"></i>
                                Create Flag
                            </button>
                            <button class="btn btn-secondary" id="refresh-flags-btn">
                                <i class="icon-refresh"></i>
                                Refresh
                            </button>
                            <button class="btn btn-secondary" id="export-flags-btn">
                                <i class="icon-download"></i>
                                Export
                            </button>
                        </div>
                    </div>

                    <div class="dashboard-filters">
                        <div class="filter-group">
                            <div class="search-box">
                                <i class="icon-search"></i>
                                <input 
                                    type="text" 
                                    id="flag-search" 
                                    class="search-input" 
                                    placeholder="Search flags by name, description, or key..."
                                >
                            </div>
                        </div>

                        <div class="filter-group">
                            <label for="filter-type">Type:</label>
                            <select id="filter-type" class="filter-select">
                                <option value="all">All Types</option>
                                <option value="boolean">Boolean</option>
                                <option value="percentage">Percentage</option>
                                <option value="targeting">Targeting</option>
                                <option value="variant">A/B Test</option>
                            </select>

                            <label for="filter-status">Status:</label>
                            <select id="filter-status" class="filter-select">
                                <option value="all">All Status</option>
                                <option value="enabled">Enabled</option>
                                <option value="disabled">Disabled</option>
                                <option value="partial">Partial Rollout</option>
                            </select>

                            <label for="filter-environment">Environment:</label>
                            <select id="filter-environment" class="filter-select">
                                <option value="all">All Environments</option>
                                <option value="development">Development</option>
                                <option value="staging">Staging</option>
                                <option value="production">Production</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label for="sort-by">Sort by:</label>
                            <select id="sort-by" class="filter-select">
                                <option value="name">Name</option>
                                <option value="created">Created Date</option>
                                <option value="updated">Last Updated</option>
                                <option value="evaluations">Evaluations</option>
                            </select>
                            <button id="sort-order-btn" class="btn btn-icon">
                                <i class="icon-sort-${this.sortOrder}"></i>
                            </button>
                        </div>
                    </div>

                    <div class="dashboard-stats">
                        <div class="stat-card">
                            <h3>Total Flags</h3>
                            <div class="stat-value" id="stat-total">0</div>
                        </div>
                        <div class="stat-card">
                            <h3>Active Flags</h3>
                            <div class="stat-value stat-success" id="stat-active">0</div>
                        </div>
                        <div class="stat-card">
                            <h3>Experiments</h3>
                            <div class="stat-value stat-info" id="stat-experiments">0</div>
                        </div>
                        <div class="stat-card">
                            <h3>Evaluations/min</h3>
                            <div class="stat-value" id="stat-evaluations">0</div>
                        </div>
                    </div>

                    <div class="dashboard-content">
                        <div id="flag-list-container" class="flag-list-container">
                            <!-- Flag list will be rendered here -->
                        </div>
                    </div>

                    <div id="flag-editor-modal" class="modal hidden">
                        <!-- Flag editor will be rendered here -->
                    </div>
                </div>
            `;

            this._attachEventHandlers();
            this._renderFlagList();
            this._updateStats();
        }

        /**
         * Attach event handlers to DOM elements
         */
        _attachEventHandlers() {
            // Create flag button
            const createBtn = this.container.querySelector('#create-flag-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => this._createNewFlag());
            }

            // Refresh button
            const refreshBtn = this.container.querySelector('#refresh-flags-btn');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => this._refreshFlags());
            }

            // Export button
            const exportBtn = this.container.querySelector('#export-flags-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => this._exportFlags());
            }

            // Search input
            const searchInput = this.container.querySelector('#flag-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filters.search = e.target.value;
                    this._applyFilters();
                });
            }

            // Filter selects
            ['type', 'status', 'environment'].forEach(filterName => {
                const select = this.container.querySelector(`#filter-${filterName}`);
                if (select) {
                    select.addEventListener('change', (e) => {
                        this.filters[filterName] = e.target.value;
                        this._applyFilters();
                    });
                }
            });

            // Sort controls
            const sortSelect = this.container.querySelector('#sort-by');
            if (sortSelect) {
                sortSelect.addEventListener('change', (e) => {
                    this.sortBy = e.target.value;
                    this._applySort();
                });
            }

            const sortOrderBtn = this.container.querySelector('#sort-order-btn');
            if (sortOrderBtn) {
                sortOrderBtn.addEventListener('click', () => {
                    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
                    sortOrderBtn.querySelector('i').className = `icon-sort-${this.sortOrder}`;
                    this._applySort();
                });
            }
        }

        /**
         * Load flags from MLFeatureFlags
         */
        _loadFlags() {
            if (!this.mlFeatureFlags) return;

            // Get all flags from storage
            const allFlags = this.mlFeatureFlags.storage.getAll();
            
            this.flags.clear();
            Object.entries(allFlags).forEach(([key, flag]) => {
                this.flags.set(key, {
                    ...flag,
                    evaluations: 0,
                    lastEvaluated: null,
                    history: []
                });
            });
        }

        /**
         * Refresh flags from storage
         */
        _refreshFlags() {
            this._loadFlags();
            this._renderFlagList();
            this._updateStats();
            
            KC.Logger.info('Feature flags refreshed');
            
            if (KC.EventBus) {
                KC.EventBus.emit('ML_FLAGS_REFRESHED', { count: this.flags.size });
            }
        }

        /**
         * Create new flag
         */
        _createNewFlag() {
            if (!this.components.flagEditor) {
                KC.Logger.error('Flag editor component not initialized');
                return;
            }

            this.components.flagEditor.open({
                mode: 'create',
                onSave: (flagData) => {
                    this._saveFlag(null, flagData);
                }
            });
        }

        /**
         * Edit existing flag
         * @param {string} flagKey - Flag key
         */
        _editFlag(flagKey) {
            const flag = this.flags.get(flagKey);
            if (!flag) return;

            if (!this.components.flagEditor) {
                KC.Logger.error('Flag editor component not initialized');
                return;
            }

            this.components.flagEditor.open({
                mode: 'edit',
                flag: flag,
                onSave: (flagData) => {
                    this._saveFlag(flagKey, flagData);
                }
            });
        }

        /**
         * Save flag (create or update)
         * @param {string|null} existingKey - Existing flag key for updates
         * @param {Object} flagData - Flag data
         */
        _saveFlag(existingKey, flagData) {
            try {
                if (existingKey) {
                    // Update existing flag
                    this.mlFeatureFlags.updateFlag(existingKey, flagData);
                } else {
                    // Create new flag
                    this.mlFeatureFlags.registerFlag(flagData);
                }

                this._refreshFlags();
                
                KC.Logger.info(`Flag ${existingKey ? 'updated' : 'created'}:`, flagData.key);
            } catch (error) {
                KC.Logger.error('Failed to save flag:', error);
                this._showError(`Failed to save flag: ${error.message}`);
            }
        }

        /**
         * Delete flag
         * @param {string} flagKey - Flag key
         */
        _deleteFlag(flagKey) {
            if (!confirm(`Are you sure you want to delete flag "${flagKey}"?`)) {
                return;
            }

            try {
                this.mlFeatureFlags.deleteFlag(flagKey);
                this._refreshFlags();
                
                KC.Logger.info('Flag deleted:', flagKey);
            } catch (error) {
                KC.Logger.error('Failed to delete flag:', error);
                this._showError(`Failed to delete flag: ${error.message}`);
            }
        }

        /**
         * Toggle flag enabled state
         * @param {string} flagKey - Flag key
         */
        _toggleFlag(flagKey) {
            const flag = this.flags.get(flagKey);
            if (!flag) return;

            try {
                this.mlFeatureFlags.updateFlag(flagKey, {
                    ...flag,
                    enabled: !flag.enabled
                });

                this._refreshFlags();
            } catch (error) {
                KC.Logger.error('Failed to toggle flag:', error);
            }
        }

        /**
         * Export flags to JSON
         */
        _exportFlags() {
            const exportData = {
                version: '1.0',
                exported: new Date().toISOString(),
                environment: this.mlFeatureFlags.evaluationContext.environment || 'unknown',
                flags: Array.from(this.flags.values())
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `feature-flags-export-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            KC.Logger.info('Flags exported');
        }

        /**
         * Apply filters to flag list
         */
        _applyFilters() {
            this._renderFlagList();
        }

        /**
         * Apply sorting to flag list
         */
        _applySort() {
            this._renderFlagList();
        }

        /**
         * Get filtered and sorted flags
         * @returns {Array} Filtered and sorted flags
         */
        _getFilteredFlags() {
            let filteredFlags = Array.from(this.flags.entries());

            // Apply search filter
            if (this.filters.search) {
                const searchLower = this.filters.search.toLowerCase();
                filteredFlags = filteredFlags.filter(([key, flag]) => {
                    return key.toLowerCase().includes(searchLower) ||
                           (flag.description && flag.description.toLowerCase().includes(searchLower)) ||
                           (flag.tags && flag.tags.some(tag => tag.toLowerCase().includes(searchLower)));
                });
            }

            // Apply type filter
            if (this.filters.type !== 'all') {
                filteredFlags = filteredFlags.filter(([_, flag]) => flag.type === this.filters.type);
            }

            // Apply status filter
            if (this.filters.status !== 'all') {
                filteredFlags = filteredFlags.filter(([_, flag]) => {
                    switch (this.filters.status) {
                        case 'enabled':
                            return flag.enabled === true;
                        case 'disabled':
                            return flag.enabled === false;
                        case 'partial':
                            return flag.type === 'percentage' && 
                                   flag.percentage > 0 && 
                                   flag.percentage < 100;
                        default:
                            return true;
                    }
                });
            }

            // Apply environment filter
            if (this.filters.environment !== 'all') {
                filteredFlags = filteredFlags.filter(([_, flag]) => {
                    return !flag.environments || 
                           flag.environments.includes(this.filters.environment);
                });
            }

            // Apply sorting
            filteredFlags.sort((a, b) => {
                let compareValue = 0;
                const [keyA, flagA] = a;
                const [keyB, flagB] = b;

                switch (this.sortBy) {
                    case 'name':
                        compareValue = keyA.localeCompare(keyB);
                        break;
                    case 'created':
                        compareValue = new Date(flagA.created || 0) - new Date(flagB.created || 0);
                        break;
                    case 'updated':
                        compareValue = new Date(flagA.updated || 0) - new Date(flagB.updated || 0);
                        break;
                    case 'evaluations':
                        compareValue = (flagA.evaluations || 0) - (flagB.evaluations || 0);
                        break;
                }

                return this.sortOrder === 'asc' ? compareValue : -compareValue;
            });

            return filteredFlags;
        }

        /**
         * Render flag list
         */
        _renderFlagList() {
            const container = this.container.querySelector('#flag-list-container');
            if (!container) return;

            const filteredFlags = this._getFilteredFlags();

            if (filteredFlags.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="icon-flag-empty"></i>
                        <h3>No flags found</h3>
                        <p>Try adjusting your filters or create a new flag.</p>
                    </div>
                `;
                return;
            }

            // Render flag cards
            container.innerHTML = filteredFlags.map(([key, flag]) => {
                return this._renderFlagCard(key, flag);
            }).join('');

            // Attach card event handlers
            this._attachCardEventHandlers();
        }

        /**
         * Render individual flag card
         * @param {string} key - Flag key
         * @param {Object} flag - Flag data
         * @returns {string} HTML
         */
        _renderFlagCard(key, flag) {
            const statusClass = flag.enabled ? 'enabled' : 'disabled';
            const typeIcon = this._getFlagTypeIcon(flag.type);
            const evaluationRate = this._calculateEvaluationRate(flag);

            return `
                <div class="flag-card ${statusClass}" data-flag-key="${key}">
                    <div class="flag-header">
                        <div class="flag-title">
                            <i class="${typeIcon}"></i>
                            <h3>${key}</h3>
                            <span class="flag-type-badge">${flag.type}</span>
                        </div>
                        <div class="flag-actions">
                            <button class="btn-icon flag-toggle" title="${flag.enabled ? 'Disable' : 'Enable'}">
                                <i class="icon-toggle-${flag.enabled ? 'on' : 'off'}"></i>
                            </button>
                            <button class="btn-icon flag-edit" title="Edit">
                                <i class="icon-edit"></i>
                            </button>
                            <button class="btn-icon flag-delete" title="Delete">
                                <i class="icon-delete"></i>
                            </button>
                        </div>
                    </div>

                    <div class="flag-description">
                        ${flag.description || 'No description'}
                    </div>

                    <div class="flag-details">
                        ${this._renderFlagDetails(flag)}
                    </div>

                    <div class="flag-stats">
                        <div class="stat">
                            <span class="stat-label">Evaluations:</span>
                            <span class="stat-value">${flag.evaluations || 0}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Rate:</span>
                            <span class="stat-value">${evaluationRate}/min</span>
                        </div>
                        ${flag.lastEvaluated ? `
                            <div class="stat">
                                <span class="stat-label">Last eval:</span>
                                <span class="stat-value">${this._formatRelativeTime(flag.lastEvaluated)}</span>
                            </div>
                        ` : ''}
                    </div>

                    ${flag.tags && flag.tags.length > 0 ? `
                        <div class="flag-tags">
                            ${flag.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        /**
         * Render flag-specific details based on type
         * @param {Object} flag - Flag data
         * @returns {string} HTML
         */
        _renderFlagDetails(flag) {
            switch (flag.type) {
                case 'percentage':
                    return `
                        <div class="rollout-bar">
                            <div class="rollout-progress" style="width: ${flag.percentage}%"></div>
                            <span class="rollout-text">${flag.percentage}% rollout</span>
                        </div>
                    `;

                case 'targeting':
                    const ruleCount = flag.rules ? flag.rules.length : 0;
                    return `
                        <div class="targeting-info">
                            <i class="icon-target"></i>
                            ${ruleCount} targeting rule${ruleCount !== 1 ? 's' : ''}
                        </div>
                    `;

                case 'variant':
                    const variantCount = flag.variants ? flag.variants.length : 0;
                    return `
                        <div class="variant-info">
                            <i class="icon-ab-test"></i>
                            ${variantCount} variant${variantCount !== 1 ? 's' : ''}
                        </div>
                    `;

                default:
                    return '';
            }
        }

        /**
         * Attach event handlers to flag cards
         */
        _attachCardEventHandlers() {
            // Toggle buttons
            this.container.querySelectorAll('.flag-toggle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const flagKey = btn.closest('.flag-card').dataset.flagKey;
                    this._toggleFlag(flagKey);
                });
            });

            // Edit buttons
            this.container.querySelectorAll('.flag-edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const flagKey = btn.closest('.flag-card').dataset.flagKey;
                    this._editFlag(flagKey);
                });
            });

            // Delete buttons
            this.container.querySelectorAll('.flag-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const flagKey = btn.closest('.flag-card').dataset.flagKey;
                    this._deleteFlag(flagKey);
                });
            });

            // Card click for details
            this.container.querySelectorAll('.flag-card').forEach(card => {
                card.addEventListener('click', () => {
                    const flagKey = card.dataset.flagKey;
                    this._showFlagDetails(flagKey);
                });
            });
        }

        /**
         * Show detailed flag view
         * @param {string} flagKey - Flag key
         */
        _showFlagDetails(flagKey) {
            const flag = this.flags.get(flagKey);
            if (!flag) return;

            // Open modal with flag details
            if (KC.ModalManager) {
                KC.ModalManager.show({
                    title: `Flag Details: ${flagKey}`,
                    content: this._renderFlagDetailsModal(flagKey, flag),
                    size: 'large',
                    buttons: [
                        {
                            text: 'Edit',
                            class: 'btn-primary',
                            action: () => {
                                KC.ModalManager.closeModal();
                                this._editFlag(flagKey);
                            }
                        },
                        {
                            text: 'Close',
                            class: 'btn-secondary',
                            action: 'close'
                        }
                    ]
                });
            }
        }

        /**
         * Render flag details modal content
         * @param {string} key - Flag key
         * @param {Object} flag - Flag data
         * @returns {string} HTML
         */
        _renderFlagDetailsModal(key, flag) {
            return `
                <div class="flag-details-modal">
                    <div class="detail-section">
                        <h4>Configuration</h4>
                        <pre class="code-block">${JSON.stringify(flag, null, 2)}</pre>
                    </div>

                    ${flag.dependencies && flag.dependencies.length > 0 ? `
                        <div class="detail-section">
                            <h4>Dependencies</h4>
                            <ul class="dependency-list">
                                ${flag.dependencies.map(dep => `
                                    <li>
                                        <span class="dep-flag">${dep.flag}</span>
                                        <span class="dep-condition">must be ${dep.enabled ? 'enabled' : 'disabled'}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    ${flag.type === 'targeting' && flag.rules ? `
                        <div class="detail-section">
                            <h4>Targeting Rules</h4>
                            <div class="rules-list">
                                ${flag.rules.map((rule, index) => `
                                    <div class="rule-item">
                                        <h5>Rule ${index + 1}</h5>
                                        <pre class="code-block">${JSON.stringify(rule, null, 2)}</pre>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${flag.history && flag.history.length > 0 ? `
                        <div class="detail-section">
                            <h4>Recent History</h4>
                            <div class="history-list">
                                ${flag.history.slice(-10).reverse().map(event => `
                                    <div class="history-item">
                                        <span class="history-time">${this._formatTime(event.timestamp)}</span>
                                        <span class="history-action">${event.action}</span>
                                        ${event.user ? `<span class="history-user">by ${event.user}</span>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        /**
         * Update dashboard statistics
         */
        _updateStats() {
            const stats = {
                total: this.flags.size,
                active: 0,
                experiments: 0,
                evaluations: 0
            };

            this.flags.forEach(flag => {
                if (flag.enabled) stats.active++;
                if (flag.type === 'variant') stats.experiments++;
                stats.evaluations += flag.evaluations || 0;
            });

            // Update stat displays
            const statElements = {
                'stat-total': stats.total,
                'stat-active': stats.active,
                'stat-experiments': stats.experiments,
                'stat-evaluations': this._calculateTotalEvaluationRate()
            };

            Object.entries(statElements).forEach(([id, value]) => {
                const element = this.container.querySelector(`#${id}`);
                if (element) {
                    element.textContent = value;
                }
            });
        }

        /**
         * Calculate total evaluation rate across all flags
         * @returns {number} Evaluations per minute
         */
        _calculateTotalEvaluationRate() {
            // This would typically track real-time evaluations
            // For now, return a simulated value
            return Math.floor(Math.random() * 1000);
        }

        /**
         * Calculate evaluation rate for a specific flag
         * @param {Object} flag - Flag data
         * @returns {number} Evaluations per minute
         */
        _calculateEvaluationRate(flag) {
            // This would typically calculate based on actual evaluation history
            // For now, return a simulated value
            return Math.floor(Math.random() * 100);
        }

        /**
         * Get icon class for flag type
         * @param {string} type - Flag type
         * @returns {string} Icon class
         */
        _getFlagTypeIcon(type) {
            const icons = {
                boolean: 'icon-toggle',
                percentage: 'icon-percentage',
                targeting: 'icon-target',
                variant: 'icon-ab-test'
            };
            return icons[type] || 'icon-flag';
        }

        /**
         * Format time for display
         * @param {Date|string} time - Time value
         * @returns {string} Formatted time
         */
        _formatTime(time) {
            const date = new Date(time);
            return date.toLocaleString();
        }

        /**
         * Format relative time
         * @param {Date|string} time - Time value
         * @returns {string} Relative time string
         */
        _formatRelativeTime(time) {
            const date = new Date(time);
            const now = new Date();
            const diff = now - date;

            const minutes = Math.floor(diff / 60000);
            if (minutes < 1) return 'just now';
            if (minutes < 60) return `${minutes}m ago`;

            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;

            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        }

        /**
         * Show error message
         * @param {string} message - Error message
         */
        _showError(message) {
            // Use KC notification system if available
            if (KC.NotificationManager) {
                KC.NotificationManager.error(message);
            } else {
                alert(message);
            }
        }

        /**
         * Handle flag update event
         * @param {Object} data - Event data
         */
        _handleFlagUpdate(data) {
            const { key, flag } = data;
            if (this.flags.has(key)) {
                this.flags.set(key, {
                    ...this.flags.get(key),
                    ...flag
                });
                this._renderFlagList();
                this._updateStats();
            }
        }

        /**
         * Handle flag created event
         * @param {Object} data - Event data
         */
        _handleFlagCreated(data) {
            this._refreshFlags();
        }

        /**
         * Handle flag deleted event
         * @param {Object} data - Event data
         */
        _handleFlagDeleted(data) {
            this._refreshFlags();
        }

        /**
         * Handle flag evaluation event
         * @param {Object} data - Event data
         */
        _handleFlagEvaluation(data) {
            const { flag, result } = data;
            if (this.flags.has(flag)) {
                const flagData = this.flags.get(flag);
                flagData.evaluations = (flagData.evaluations || 0) + 1;
                flagData.lastEvaluated = new Date();
                
                // Update display if this flag is visible
                const flagCard = this.container.querySelector(`[data-flag-key="${flag}"]`);
                if (flagCard) {
                    // Update evaluation count
                    const evalCount = flagCard.querySelector('.flag-stats .stat-value');
                    if (evalCount) {
                        evalCount.textContent = flagData.evaluations;
                    }
                }
            }
        }

        /**
         * Handle theme change event
         * @param {Object} data - Event data
         */
        _handleThemeChange(data) {
            // Dashboard will automatically inherit theme from CSS variables
            KC.Logger.info('Theme changed in Feature Flags Dashboard');
        }

        /**
         * Set component instance
         * @param {string} name - Component name
         * @param {Object} instance - Component instance
         */
        setComponent(name, instance) {
            this.components[name] = instance;
            
            // Initialize component if dashboard is already initialized
            if (this.mlFeatureFlags && instance.initialize) {
                instance.initialize(this.mlFeatureFlags);
            }
        }

        /**
         * Destroy dashboard and cleanup
         */
        destroy() {
            // Remove event listeners
            if (KC && KC.EventBus) {
                KC.EventBus.off('ML_FLAG_UPDATED', this._handleFlagUpdate);
                KC.EventBus.off('ML_FLAG_CREATED', this._handleFlagCreated);
                KC.EventBus.off('ML_FLAG_DELETED', this._handleFlagDeleted);
                KC.EventBus.off('ML_FLAG_EVALUATION', this._handleFlagEvaluation);
                KC.EventBus.off('THEME_CHANGED', this._handleThemeChange);
            }

            // Destroy components
            Object.values(this.components).forEach(component => {
                if (component && component.destroy) {
                    component.destroy();
                }
            });

            // Clear container
            if (this.container) {
                this.container.innerHTML = '';
            }

            // Clear references
            this.flags.clear();
            this.selectedFlags.clear();
            this.mlFeatureFlags = null;
            this.container = null;
        }
    }

    // Export to KC namespace
    window.KC = window.KC || {};
    window.KC.FeatureFlagsDashboard = FeatureFlagsDashboard;

})(window);
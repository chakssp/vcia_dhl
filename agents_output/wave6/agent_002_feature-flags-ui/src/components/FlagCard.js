/**
 * FlagCard.js - Individual flag card component
 * 
 * Features:
 * - Compact flag display
 * - Real-time status updates
 * - Quick actions
 * - Evaluation metrics
 * - Visual indicators
 * 
 * @module FlagCard
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class FlagCard {
        constructor(options = {}) {
            this.key = options.key || '';
            this.flag = options.flag || {};
            this.container = null;
            this.compact = options.compact || false;
            this.showMetrics = options.showMetrics !== false;
            this.showActions = options.showActions !== false;
            
            // Event handlers
            this.onToggle = options.onToggle || null;
            this.onEdit = options.onEdit || null;
            this.onDelete = options.onDelete || null;
            this.onClick = options.onClick || null;
            
            // Metrics tracking
            this.evaluations = 0;
            this.lastEvaluation = null;
            this.evaluationRate = 0;
            
            // AIDEV-NOTE: flag-card-init; card component with real-time updates
            this._initializeMetrics();
        }

        /**
         * Initialize metrics tracking
         */
        _initializeMetrics() {
            // Track evaluation rate over time
            this.evaluationHistory = [];
            this.metricsInterval = null;
        }

        /**
         * Mount card to container
         * @param {HTMLElement} container - Container element
         */
        mount(container) {
            this.container = container;
            this.render();
            this._startMetricsTracking();
        }

        /**
         * Update flag data
         * @param {Object} flag - Flag data
         */
        updateFlag(flag) {
            this.flag = { ...this.flag, ...flag };
            this.render();
        }

        /**
         * Update metrics
         * @param {Object} metrics - Metrics data
         */
        updateMetrics(metrics) {
            if (metrics.evaluations !== undefined) {
                this.evaluations = metrics.evaluations;
            }
            if (metrics.lastEvaluation) {
                this.lastEvaluation = new Date(metrics.lastEvaluation);
            }
            if (metrics.evaluationRate !== undefined) {
                this.evaluationRate = metrics.evaluationRate;
            }
            
            this._updateMetricsDisplay();
        }

        /**
         * Render the flag card
         */
        render() {
            if (!this.container) return;

            const statusClass = this.flag.enabled ? 'enabled' : 'disabled';
            const compactClass = this.compact ? 'compact' : '';

            this.container.innerHTML = `
                <div class="flag-card ${statusClass} ${compactClass}" data-flag-key="${this.key}">
                    ${this._renderHeader()}
                    ${!this.compact ? this._renderBody() : ''}
                    ${this.showMetrics ? this._renderMetrics() : ''}
                    ${this.showActions ? this._renderActions() : ''}
                    ${this._renderStatusIndicator()}
                </div>
            `;

            this._attachEventHandlers();
        }

        /**
         * Render card header
         * @returns {string} HTML
         */
        _renderHeader() {
            const typeIcon = this._getTypeIcon();
            const environmentBadge = this._getEnvironmentBadge();

            return `
                <div class="card-header">
                    <div class="card-title">
                        <i class="${typeIcon}"></i>
                        <h4>${this.key}</h4>
                        ${environmentBadge}
                    </div>
                    <div class="card-badges">
                        <span class="type-badge">${this.flag.type}</span>
                        ${this.flag.tags && this.flag.tags.length > 0 ? 
                            this.flag.tags.slice(0, 2).map(tag => 
                                `<span class="tag-badge">${tag}</span>`
                            ).join('') : ''
                        }
                    </div>
                </div>
            `;
        }

        /**
         * Render card body
         * @returns {string} HTML
         */
        _renderBody() {
            return `
                <div class="card-body">
                    ${this.flag.description ? `
                        <p class="card-description">${this.flag.description}</p>
                    ` : ''}
                    
                    ${this._renderTypeSpecificInfo()}
                    
                    ${this.flag.dependencies && this.flag.dependencies.length > 0 ? `
                        <div class="card-dependencies">
                            <i class="icon-link"></i>
                            <span>${this.flag.dependencies.length} dependencies</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        /**
         * Render type-specific information
         * @returns {string} HTML
         */
        _renderTypeSpecificInfo() {
            switch (this.flag.type) {
                case 'percentage':
                    return `
                        <div class="rollout-info">
                            <div class="rollout-bar-small">
                                <div class="rollout-progress" style="width: ${this.flag.percentage}%"></div>
                            </div>
                            <span class="rollout-label">${this.flag.percentage}% rollout</span>
                        </div>
                    `;

                case 'targeting':
                    const ruleCount = this.flag.rules ? this.flag.rules.length : 0;
                    return `
                        <div class="targeting-info">
                            <i class="icon-target"></i>
                            <span>${ruleCount} targeting rule${ruleCount !== 1 ? 's' : ''}</span>
                        </div>
                    `;

                case 'variant':
                    const variantCount = this.flag.variants ? this.flag.variants.length : 0;
                    return `
                        <div class="variant-info">
                            <i class="icon-ab-test"></i>
                            <span>${variantCount} variant${variantCount !== 1 ? 's' : ''}</span>
                            ${this._renderVariantDistribution()}
                        </div>
                    `;

                default:
                    return '';
            }
        }

        /**
         * Render variant distribution
         * @returns {string} HTML
         */
        _renderVariantDistribution() {
            if (!this.flag.variants || this.flag.variants.length === 0) return '';

            return `
                <div class="variant-distribution">
                    ${this.flag.variants.map(variant => `
                        <div class="variant-bar" 
                             style="width: ${variant.weight}%" 
                             title="${variant.name}: ${variant.weight}%">
                        </div>
                    `).join('')}
                </div>
            `;
        }

        /**
         * Render metrics section
         * @returns {string} HTML
         */
        _renderMetrics() {
            return `
                <div class="card-metrics">
                    <div class="metric">
                        <span class="metric-value">${this._formatNumber(this.evaluations)}</span>
                        <span class="metric-label">evaluations</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">${this._formatNumber(this.evaluationRate)}</span>
                        <span class="metric-label">per min</span>
                    </div>
                    ${this.lastEvaluation ? `
                        <div class="metric">
                            <span class="metric-value">${this._formatRelativeTime(this.lastEvaluation)}</span>
                            <span class="metric-label">last eval</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        /**
         * Render actions section
         * @returns {string} HTML
         */
        _renderActions() {
            return `
                <div class="card-actions">
                    <button class="btn-icon action-toggle" 
                            title="${this.flag.enabled ? 'Disable' : 'Enable'}"
                            aria-label="${this.flag.enabled ? 'Disable flag' : 'Enable flag'}">
                        <i class="icon-toggle-${this.flag.enabled ? 'on' : 'off'}"></i>
                    </button>
                    <button class="btn-icon action-edit" 
                            title="Edit"
                            aria-label="Edit flag">
                        <i class="icon-edit"></i>
                    </button>
                    <button class="btn-icon action-duplicate" 
                            title="Duplicate"
                            aria-label="Duplicate flag">
                        <i class="icon-copy"></i>
                    </button>
                    <button class="btn-icon action-delete" 
                            title="Delete"
                            aria-label="Delete flag">
                        <i class="icon-delete"></i>
                    </button>
                </div>
            `;
        }

        /**
         * Render status indicator
         * @returns {string} HTML
         */
        _renderStatusIndicator() {
            const pulseClass = this.evaluationRate > 0 ? 'pulse' : '';
            
            return `
                <div class="status-indicator ${pulseClass}">
                    <span class="status-dot"></span>
                </div>
            `;
        }

        /**
         * Get type icon
         * @returns {string} Icon class
         */
        _getTypeIcon() {
            const icons = {
                boolean: 'icon-toggle',
                percentage: 'icon-percentage',
                targeting: 'icon-target',
                variant: 'icon-ab-test'
            };
            return icons[this.flag.type] || 'icon-flag';
        }

        /**
         * Get environment badge
         * @returns {string} HTML
         */
        _getEnvironmentBadge() {
            if (!this.flag.environments || this.flag.environments.length === 0) {
                return '';
            }

            const envMap = {
                development: { label: 'DEV', class: 'env-dev' },
                staging: { label: 'STG', class: 'env-staging' },
                production: { label: 'PRD', class: 'env-production' }
            };

            return this.flag.environments.map(env => {
                const envInfo = envMap[env] || { label: env.toUpperCase(), class: 'env-custom' };
                return `<span class="env-badge ${envInfo.class}">${envInfo.label}</span>`;
            }).join('');
        }

        /**
         * Attach event handlers
         */
        _attachEventHandlers() {
            const card = this.container.querySelector('.flag-card');
            if (!card) return;

            // Card click (not on actions)
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.card-actions')) {
                    if (this.onClick) {
                        this.onClick(this.key, this.flag);
                    }
                }
            });

            // Toggle action
            const toggleBtn = card.querySelector('.action-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.onToggle) {
                        this.onToggle(this.key, this.flag);
                    }
                });
            }

            // Edit action
            const editBtn = card.querySelector('.action-edit');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.onEdit) {
                        this.onEdit(this.key, this.flag);
                    }
                });
            }

            // Duplicate action
            const duplicateBtn = card.querySelector('.action-duplicate');
            if (duplicateBtn) {
                duplicateBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._handleDuplicate();
                });
            }

            // Delete action
            const deleteBtn = card.querySelector('.action-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.onDelete) {
                        this.onDelete(this.key, this.flag);
                    }
                });
            }
        }

        /**
         * Handle duplicate action
         */
        _handleDuplicate() {
            const duplicatedFlag = {
                ...this.flag,
                key: `${this.key}-copy`,
                enabled: false,
                created: new Date().toISOString(),
                updated: new Date().toISOString()
            };

            delete duplicatedFlag.evaluations;
            delete duplicatedFlag.lastEvaluation;

            if (this.onEdit) {
                this.onEdit(null, duplicatedFlag);
            }
        }

        /**
         * Start metrics tracking
         */
        _startMetricsTracking() {
            if (!this.showMetrics) return;

            // Update metrics every 10 seconds
            this.metricsInterval = setInterval(() => {
                this._updateEvaluationRate();
            }, 10000);
        }

        /**
         * Update evaluation rate calculation
         */
        _updateEvaluationRate() {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;

            // Remove old entries
            this.evaluationHistory = this.evaluationHistory.filter(
                timestamp => timestamp > oneMinuteAgo
            );

            // Calculate rate
            this.evaluationRate = this.evaluationHistory.length;
            this._updateMetricsDisplay();
        }

        /**
         * Update metrics display
         */
        _updateMetricsDisplay() {
            if (!this.container) return;

            // Update evaluation count
            const evalCount = this.container.querySelector('.metric-value');
            if (evalCount) {
                evalCount.textContent = this._formatNumber(this.evaluations);
            }

            // Update rate
            const rateElements = this.container.querySelectorAll('.metric-value');
            if (rateElements[1]) {
                rateElements[1].textContent = this._formatNumber(this.evaluationRate);
            }

            // Update last evaluation
            if (this.lastEvaluation && rateElements[2]) {
                rateElements[2].textContent = this._formatRelativeTime(this.lastEvaluation);
            }

            // Update pulse animation
            const indicator = this.container.querySelector('.status-indicator');
            if (indicator) {
                if (this.evaluationRate > 0) {
                    indicator.classList.add('pulse');
                } else {
                    indicator.classList.remove('pulse');
                }
            }
        }

        /**
         * Record evaluation
         */
        recordEvaluation() {
            this.evaluations++;
            this.lastEvaluation = new Date();
            this.evaluationHistory.push(Date.now());
            
            this._updateEvaluationRate();
        }

        /**
         * Format number for display
         * @param {number} num - Number to format
         * @returns {string} Formatted number
         */
        _formatNumber(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        }

        /**
         * Format relative time
         * @param {Date} date - Date to format
         * @returns {string} Relative time string
         */
        _formatRelativeTime(date) {
            const now = new Date();
            const diff = now - date;

            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (seconds < 60) return 'just now';
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            return `${days}d ago`;
        }

        /**
         * Highlight card temporarily
         * @param {string} type - Highlight type ('success', 'error', 'warning')
         */
        highlight(type = 'success') {
            const card = this.container.querySelector('.flag-card');
            if (!card) return;

            card.classList.add(`highlight-${type}`);
            setTimeout(() => {
                card.classList.remove(`highlight-${type}`);
            }, 2000);
        }

        /**
         * Show loading state
         */
        showLoading() {
            const card = this.container.querySelector('.flag-card');
            if (card) {
                card.classList.add('loading');
            }
        }

        /**
         * Hide loading state
         */
        hideLoading() {
            const card = this.container.querySelector('.flag-card');
            if (card) {
                card.classList.remove('loading');
            }
        }

        /**
         * Destroy card and cleanup
         */
        destroy() {
            if (this.metricsInterval) {
                clearInterval(this.metricsInterval);
            }

            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    }

    // Export to KC namespace
    window.KC = window.KC || {};
    window.KC.FlagCard = FlagCard;

})(window);
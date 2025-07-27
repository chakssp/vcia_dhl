/**
 * RolloutVisualizer.js - Visualizer for percentage rollouts and A/B tests
 * 
 * Features:
 * - Interactive rollout percentage slider
 * - Real-time user distribution preview
 * - Historical rollout data visualization
 * - A/B test variant distribution
 * - Conversion metrics display
 * 
 * @module RolloutVisualizer
 */

(function(window) {
    'use strict';

    const KC = window.KnowledgeConsolidator;

    class RolloutVisualizer {
        constructor(options = {}) {
            this.flag = options.flag || null;
            this.container = null;
            this.mode = options.mode || 'percentage'; // 'percentage' or 'variant'
            this.interactive = options.interactive !== false;
            this.showHistory = options.showHistory !== false;
            this.onChange = options.onChange || null;
            
            // Chart data
            this.historyData = [];
            this.variantData = [];
            
            // AIDEV-NOTE: rollout-viz-init; visualizer with interactive controls
            this._initializeChartConfig();
        }

        /**
         * Initialize chart configuration
         */
        _initializeChartConfig() {
            this.chartConfig = {
                width: 600,
                height: 300,
                margin: { top: 20, right: 20, bottom: 30, left: 50 },
                colors: {
                    enabled: '#10b981',
                    disabled: '#ef4444',
                    variants: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6']
                }
            };
        }

        /**
         * Mount visualizer to container
         * @param {HTMLElement} container - Container element
         */
        mount(container) {
            this.container = container;
            this.render();
        }

        /**
         * Update flag data
         * @param {Object} flag - Flag data
         */
        updateFlag(flag) {
            this.flag = flag;
            this.mode = flag.type === 'variant' ? 'variant' : 'percentage';
            this.render();
        }

        /**
         * Update history data
         * @param {Array} data - History data points
         */
        updateHistory(data) {
            this.historyData = data;
            if (this.showHistory) {
                this._renderHistoryChart();
            }
        }

        /**
         * Render the visualizer
         */
        render() {
            if (!this.container || !this.flag) return;

            this.container.innerHTML = `
                <div class="rollout-visualizer">
                    ${this.mode === 'percentage' ? 
                        this._renderPercentageVisualizer() : 
                        this._renderVariantVisualizer()
                    }
                    
                    ${this.showHistory ? `
                        <div class="history-section">
                            <h4>Rollout History</h4>
                            <div id="history-chart" class="chart-container"></div>
                        </div>
                    ` : ''}
                    
                    <div class="metrics-section">
                        ${this._renderMetrics()}
                    </div>
                </div>
            `;

            this._attachEventHandlers();
            
            if (this.showHistory) {
                this._renderHistoryChart();
            }
        }

        /**
         * Render percentage rollout visualizer
         * @returns {string} HTML
         */
        _renderPercentageVisualizer() {
            const percentage = this.flag.percentage || 0;
            const userCount = this._estimateUserCount(percentage);

            return `
                <div class="percentage-visualizer">
                    <h3>Rollout Configuration</h3>
                    
                    <div class="rollout-control">
                        <label>Rollout Percentage: <span id="percentage-value">${percentage}%</span></label>
                        ${this.interactive ? `
                            <input type="range" 
                                   id="rollout-slider" 
                                   min="0" 
                                   max="100" 
                                   value="${percentage}"
                                   class="rollout-slider">
                        ` : ''}
                    </div>

                    <div class="rollout-preview">
                        <div class="preview-bar">
                            <div class="enabled-section" style="width: ${percentage}%">
                                <span class="section-label">Enabled</span>
                                <span class="section-value">${percentage}%</span>
                            </div>
                            <div class="disabled-section" style="width: ${100 - percentage}%">
                                <span class="section-label">Disabled</span>
                                <span class="section-value">${100 - percentage}%</span>
                            </div>
                        </div>
                    </div>

                    <div class="user-distribution">
                        <div class="distribution-grid">
                            ${this._renderUserGrid(percentage)}
                        </div>
                        <div class="distribution-stats">
                            <p><strong>Estimated Impact:</strong></p>
                            <p class="stat-enabled">
                                <i class="icon-users"></i>
                                ~${userCount.enabled.toLocaleString()} users enabled
                            </p>
                            <p class="stat-disabled">
                                <i class="icon-users"></i>
                                ~${userCount.disabled.toLocaleString()} users disabled
                            </p>
                        </div>
                    </div>

                    ${this.interactive ? `
                        <div class="rollout-actions">
                            <button class="btn btn-secondary" id="rollout-25">25%</button>
                            <button class="btn btn-secondary" id="rollout-50">50%</button>
                            <button class="btn btn-secondary" id="rollout-75">75%</button>
                            <button class="btn btn-primary" id="rollout-100">100%</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        /**
         * Render variant (A/B test) visualizer
         * @returns {string} HTML
         */
        _renderVariantVisualizer() {
            const variants = this.flag.variants || [];
            const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 0), 0);

            return `
                <div class="variant-visualizer">
                    <h3>Variant Distribution</h3>
                    
                    <div class="variant-chart">
                        <svg id="variant-pie-chart" width="300" height="300"></svg>
                    </div>

                    <div class="variant-list">
                        ${variants.map((variant, index) => `
                            <div class="variant-item">
                                <div class="variant-color" 
                                     style="background-color: ${this.chartConfig.colors.variants[index % this.chartConfig.colors.variants.length]}">
                                </div>
                                <div class="variant-info">
                                    <strong>${variant.name}</strong>
                                    <span class="variant-weight">${variant.weight}%</span>
                                </div>
                                ${this.interactive ? `
                                    <input type="range" 
                                           class="variant-slider" 
                                           data-variant="${index}"
                                           min="0" 
                                           max="100" 
                                           value="${variant.weight}">
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>

                    ${totalWeight !== 100 ? `
                        <div class="weight-warning">
                            <i class="icon-warning"></i>
                            Total weight: ${totalWeight}% (should be 100%)
                        </div>
                    ` : ''}

                    <div class="variant-metrics">
                        ${this._renderVariantMetrics(variants)}
                    </div>
                </div>
            `;
        }

        /**
         * Render user grid visualization
         * @param {number} percentage - Rollout percentage
         * @returns {string} HTML
         */
        _renderUserGrid(percentage) {
            const totalCells = 100;
            const enabledCells = Math.round(totalCells * (percentage / 100));
            
            let cells = [];
            for (let i = 0; i < totalCells; i++) {
                const isEnabled = i < enabledCells;
                cells.push(`<div class="user-cell ${isEnabled ? 'enabled' : 'disabled'}"></div>`);
            }

            return cells.join('');
        }

        /**
         * Render metrics section
         * @returns {string} HTML
         */
        _renderMetrics() {
            return `
                <div class="metrics-grid">
                    <div class="metric-card">
                        <h5>Rollout Status</h5>
                        <div class="metric-value">
                            ${this.flag.enabled ? 
                                `<span class="status-enabled">Active</span>` : 
                                `<span class="status-disabled">Inactive</span>`
                            }
                        </div>
                    </div>

                    <div class="metric-card">
                        <h5>Total Evaluations</h5>
                        <div class="metric-value">
                            ${this._formatNumber(this.flag.evaluations || 0)}
                        </div>
                    </div>

                    <div class="metric-card">
                        <h5>Success Rate</h5>
                        <div class="metric-value">
                            ${this._calculateSuccessRate()}%
                        </div>
                    </div>

                    <div class="metric-card">
                        <h5>Last Updated</h5>
                        <div class="metric-value">
                            ${this.flag.updated ? 
                                this._formatDate(this.flag.updated) : 
                                'Never'
                            }
                        </div>
                    </div>
                </div>
            `;
        }

        /**
         * Render variant metrics
         * @param {Array} variants - Variant configurations
         * @returns {string} HTML
         */
        _renderVariantMetrics(variants) {
            // Simulated metrics for demonstration
            const metrics = variants.map((variant, index) => ({
                name: variant.name,
                conversions: Math.floor(Math.random() * 1000),
                conversionRate: (Math.random() * 20 + 5).toFixed(2)
            }));

            return `
                <table class="variant-metrics-table">
                    <thead>
                        <tr>
                            <th>Variant</th>
                            <th>Conversions</th>
                            <th>Conversion Rate</th>
                            <th>Confidence</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${metrics.map((metric, index) => `
                            <tr>
                                <td>
                                    <div class="variant-color-inline" 
                                         style="background-color: ${this.chartConfig.colors.variants[index % this.chartConfig.colors.variants.length]}">
                                    </div>
                                    ${metric.name}
                                </td>
                                <td>${metric.conversions}</td>
                                <td>${metric.conversionRate}%</td>
                                <td>
                                    ${index === 0 ? 
                                        '<span class="confidence-baseline">Baseline</span>' : 
                                        `<span class="confidence-value">${this._calculateConfidence()}%</span>`
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        /**
         * Attach event handlers
         */
        _attachEventHandlers() {
            if (!this.interactive) return;

            // Percentage slider
            const slider = this.container.querySelector('#rollout-slider');
            if (slider) {
                slider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    this._updatePercentage(value);
                });
            }

            // Quick percentage buttons
            [25, 50, 75, 100].forEach(percent => {
                const btn = this.container.querySelector(`#rollout-${percent}`);
                if (btn) {
                    btn.addEventListener('click', () => {
                        this._updatePercentage(percent);
                        if (slider) slider.value = percent;
                    });
                }
            });

            // Variant sliders
            this.container.querySelectorAll('.variant-slider').forEach(slider => {
                slider.addEventListener('input', (e) => {
                    const variantIndex = parseInt(e.target.dataset.variant);
                    const value = parseInt(e.target.value);
                    this._updateVariantWeight(variantIndex, value);
                });
            });

            // Render variant pie chart if in variant mode
            if (this.mode === 'variant') {
                this._renderVariantPieChart();
            }
        }

        /**
         * Update percentage value
         * @param {number} value - New percentage
         */
        _updatePercentage(value) {
            // Update display
            const valueDisplay = this.container.querySelector('#percentage-value');
            if (valueDisplay) {
                valueDisplay.textContent = `${value}%`;
            }

            // Update preview bar
            const enabledSection = this.container.querySelector('.enabled-section');
            const disabledSection = this.container.querySelector('.disabled-section');
            
            if (enabledSection && disabledSection) {
                enabledSection.style.width = `${value}%`;
                enabledSection.querySelector('.section-value').textContent = `${value}%`;
                disabledSection.style.width = `${100 - value}%`;
                disabledSection.querySelector('.section-value').textContent = `${100 - value}%`;
            }

            // Update user grid
            const gridContainer = this.container.querySelector('.distribution-grid');
            if (gridContainer) {
                gridContainer.innerHTML = this._renderUserGrid(value);
            }

            // Update stats
            const userCount = this._estimateUserCount(value);
            const enabledStat = this.container.querySelector('.stat-enabled');
            const disabledStat = this.container.querySelector('.stat-disabled');
            
            if (enabledStat) {
                enabledStat.innerHTML = `<i class="icon-users"></i> ~${userCount.enabled.toLocaleString()} users enabled`;
            }
            if (disabledStat) {
                disabledStat.innerHTML = `<i class="icon-users"></i> ~${userCount.disabled.toLocaleString()} users disabled`;
            }

            // Trigger onChange callback
            if (this.onChange) {
                this.onChange({
                    type: 'percentage',
                    value: value
                });
            }
        }

        /**
         * Update variant weight
         * @param {number} index - Variant index
         * @param {number} weight - New weight
         */
        _updateVariantWeight(index, weight) {
            if (!this.flag.variants || !this.flag.variants[index]) return;

            this.flag.variants[index].weight = weight;

            // Update weight display
            const variantItems = this.container.querySelectorAll('.variant-item');
            if (variantItems[index]) {
                variantItems[index].querySelector('.variant-weight').textContent = `${weight}%`;
            }

            // Update total weight warning
            const totalWeight = this.flag.variants.reduce((sum, v) => sum + (v.weight || 0), 0);
            const warning = this.container.querySelector('.weight-warning');
            
            if (totalWeight !== 100) {
                if (!warning) {
                    const chartDiv = this.container.querySelector('.variant-chart');
                    chartDiv.insertAdjacentHTML('afterend', `
                        <div class="weight-warning">
                            <i class="icon-warning"></i>
                            Total weight: ${totalWeight}% (should be 100%)
                        </div>
                    `);
                } else {
                    warning.innerHTML = `
                        <i class="icon-warning"></i>
                        Total weight: ${totalWeight}% (should be 100%)
                    `;
                }
            } else if (warning) {
                warning.remove();
            }

            // Re-render pie chart
            this._renderVariantPieChart();

            // Trigger onChange callback
            if (this.onChange) {
                this.onChange({
                    type: 'variant',
                    variants: this.flag.variants
                });
            }
        }

        /**
         * Render variant pie chart
         */
        _renderVariantPieChart() {
            const svg = this.container.querySelector('#variant-pie-chart');
            if (!svg || !this.flag.variants) return;

            const width = 300;
            const height = 300;
            const radius = Math.min(width, height) / 2 - 10;
            const centerX = width / 2;
            const centerY = height / 2;

            // Clear existing chart
            svg.innerHTML = '';

            // Calculate angles
            let currentAngle = 0;
            const variants = this.flag.variants.map((variant, index) => {
                const startAngle = currentAngle;
                const endAngle = currentAngle + (variant.weight / 100) * 2 * Math.PI;
                currentAngle = endAngle;

                return {
                    ...variant,
                    startAngle,
                    endAngle,
                    color: this.chartConfig.colors.variants[index % this.chartConfig.colors.variants.length]
                };
            });

            // Draw pie slices
            variants.forEach(variant => {
                const path = this._createPiePath(centerX, centerY, radius, variant.startAngle, variant.endAngle);
                
                svg.innerHTML += `
                    <path d="${path}" 
                          fill="${variant.color}" 
                          stroke="white" 
                          stroke-width="2"
                          class="pie-slice">
                        <title>${variant.name}: ${variant.weight}%</title>
                    </path>
                `;
            });

            // Draw labels
            variants.forEach(variant => {
                if (variant.weight < 5) return; // Skip small slices

                const labelAngle = (variant.startAngle + variant.endAngle) / 2;
                const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
                const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);

                svg.innerHTML += `
                    <text x="${labelX}" 
                          y="${labelY}" 
                          text-anchor="middle" 
                          dominant-baseline="middle"
                          class="pie-label">
                        ${variant.weight}%
                    </text>
                `;
            });
        }

        /**
         * Create SVG path for pie slice
         * @param {number} cx - Center X
         * @param {number} cy - Center Y
         * @param {number} radius - Radius
         * @param {number} startAngle - Start angle in radians
         * @param {number} endAngle - End angle in radians
         * @returns {string} SVG path
         */
        _createPiePath(cx, cy, radius, startAngle, endAngle) {
            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);

            const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

            return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        }

        /**
         * Render history chart
         */
        _renderHistoryChart() {
            const chartContainer = this.container.querySelector('#history-chart');
            if (!chartContainer || this.historyData.length === 0) return;

            // Simple line chart implementation
            const width = 600;
            const height = 200;
            const margin = { top: 20, right: 20, bottom: 30, left: 50 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            const svg = `
                <svg width="${width}" height="${height}">
                    <g transform="translate(${margin.left},${margin.top})">
                        ${this._renderHistoryLine(innerWidth, innerHeight)}
                        ${this._renderHistoryAxes(innerWidth, innerHeight)}
                    </g>
                </svg>
            `;

            chartContainer.innerHTML = svg;
        }

        /**
         * Render history line
         * @param {number} width - Chart width
         * @param {number} height - Chart height
         * @returns {string} SVG elements
         */
        _renderHistoryLine(width, height) {
            if (this.historyData.length < 2) return '';

            // Scale data
            const xScale = width / (this.historyData.length - 1);
            const maxValue = Math.max(...this.historyData.map(d => d.value));
            const yScale = height / maxValue;

            // Create path
            const pathData = this.historyData.map((point, index) => {
                const x = index * xScale;
                const y = height - (point.value * yScale);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ');

            return `
                <path d="${pathData}" 
                      fill="none" 
                      stroke="${this.chartConfig.colors.enabled}" 
                      stroke-width="2" />
                ${this.historyData.map((point, index) => `
                    <circle cx="${index * xScale}" 
                            cy="${height - (point.value * yScale)}" 
                            r="4" 
                            fill="${this.chartConfig.colors.enabled}">
                        <title>${point.date}: ${point.value}%</title>
                    </circle>
                `).join('')}
            `;
        }

        /**
         * Render history axes
         * @param {number} width - Chart width
         * @param {number} height - Chart height
         * @returns {string} SVG elements
         */
        _renderHistoryAxes(width, height) {
            return `
                <!-- X axis -->
                <line x1="0" y1="${height}" x2="${width}" y2="${height}" 
                      stroke="#ccc" stroke-width="1" />
                
                <!-- Y axis -->
                <line x1="0" y1="0" x2="0" y2="${height}" 
                      stroke="#ccc" stroke-width="1" />
                
                <!-- Y axis labels -->
                <text x="-10" y="0" text-anchor="end" class="axis-label">100%</text>
                <text x="-10" y="${height / 2}" text-anchor="end" class="axis-label">50%</text>
                <text x="-10" y="${height}" text-anchor="end" class="axis-label">0%</text>
            `;
        }

        /**
         * Estimate user count based on percentage
         * @param {number} percentage - Rollout percentage
         * @returns {Object} User counts
         */
        _estimateUserCount(percentage) {
            // This would typically be based on actual user data
            const totalUsers = 100000; // Example total
            const enabledUsers = Math.round(totalUsers * (percentage / 100));
            
            return {
                enabled: enabledUsers,
                disabled: totalUsers - enabledUsers,
                total: totalUsers
            };
        }

        /**
         * Calculate success rate
         * @returns {number} Success rate percentage
         */
        _calculateSuccessRate() {
            // This would typically be calculated from actual metrics
            return (Math.random() * 30 + 70).toFixed(1);
        }

        /**
         * Calculate confidence level
         * @returns {number} Confidence percentage
         */
        _calculateConfidence() {
            // This would typically use statistical calculations
            return (Math.random() * 20 + 75).toFixed(1);
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
         * Format date for display
         * @param {Date|string} date - Date to format
         * @returns {string} Formatted date
         */
        _formatDate(date) {
            const d = new Date(date);
            return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
        }

        /**
         * Destroy visualizer
         */
        destroy() {
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    }

    // Export to KC namespace
    window.KC = window.KC || {};
    window.KC.RolloutVisualizer = RolloutVisualizer;

})(window);
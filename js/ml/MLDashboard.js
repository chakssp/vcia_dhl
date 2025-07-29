/**
 * MLDashboard - Real-time ML metrics dashboard with header integration
 * Extracted from wave8_iteration_002_mldashboard_integration.js
 * 
 * Features:
 * - Real-time metrics with 5-second updates
 * - Compact and expanded views
 * - Performance monitoring
 * - Chart visualization
 * - Mobile-responsive design
 */

class MLDashboard {
    constructor() {
        this.container = null;
        this.metrics = window.KC?.DashboardMetrics ? new window.KC.DashboardMetrics() : null;
        this.charts = window.KC?.DashboardCharts ? new window.KC.DashboardCharts() : null;
        this.updateInterval = null;
        this.isExpanded = false;
        this.performanceMonitor = window.KC?.ML?.MLPerformanceMonitor || { startMeasure: () => {}, endMeasure: () => 0 };
        
        // Update frequency (5 seconds as specified)
        this.updateFrequency = 5000;
        
        // Bind methods
        this.handleUpdate = this.handleUpdate.bind(this);
        this.handleConvergence = this.handleConvergence.bind(this);
        this.toggleExpanded = this.toggleExpanded.bind(this);
    }

    /**
     * Initialize the dashboard widget
     */
    initialize() {
        this.createWidget();
        this.attachToHeader();
        this.startUpdates();
        this.setupEventListeners();
        
        console.log('[MLDashboard] Initialized successfully');
    }

    /**
     * Create the dashboard widget DOM structure
     */
    createWidget() {
        this.container = document.createElement('div');
        this.container.className = 'ml-dashboard-widget';
        this.container.setAttribute('role', 'complementary');
        this.container.setAttribute('aria-label', 'ML Dashboard');
        
        this.container.innerHTML = `
            <div class="dashboard-compact">
                <div class="ml-indicator" role="status" aria-live="polite">
                    <span class="ml-icon" aria-hidden="true">🤖</span>
                    <span class="ml-status">ML: <span id="ml-status-text">Loading...</span></span>
                </div>
                
                <div class="ml-metrics-mini" role="group" aria-label="ML Metrics Summary">
                    <div class="metric-pill" 
                         title="Average confidence score across all analyzed files"
                         aria-label="Average confidence score">
                        <span class="metric-icon" aria-hidden="true">📊</span>
                        <span class="metric-value" id="avg-confidence">--%</span>
                    </div>
                    <div class="metric-pill" 
                         title="Files that have converged to target confidence level"
                         aria-label="Converged files count">
                        <span class="metric-icon" aria-hidden="true">✅</span>
                        <span class="metric-value" id="converged-count">--/--</span>
                    </div>
                    <div class="metric-pill" 
                         title="Improvement rate from ML optimization iterations"
                         aria-label="Improvement rate">
                        <span class="metric-icon" aria-hidden="true">📈</span>
                        <span class="metric-value" id="improvement-rate">--%</span>
                    </div>
                    <div class="metric-pill system-health" 
                         title="Overall ML system health score"
                         aria-label="System health">
                        <span class="metric-icon" aria-hidden="true">💚</span>
                        <span class="metric-value" id="system-health">--%</span>
                    </div>
                </div>
                
                <div class="ml-quick-actions" role="toolbar" aria-label="ML Dashboard Actions">
                    <button class="ml-action-btn btn-expand" 
                            title="Toggle expanded dashboard view"
                            aria-label="Toggle expanded dashboard view"
                            aria-expanded="false">
                        📊
                    </button>
                    <button class="ml-action-btn btn-auto-improve" 
                            title="Toggle automatic ML improvement"
                            aria-label="Toggle automatic improvement">
                        🔄
                    </button>
                    <button class="ml-action-btn btn-settings"
                            title="Open ML settings"
                            aria-label="Open ML settings">
                        ⚙️
                    </button>
                </div>
            </div>
            
            <div class="dashboard-expanded" style="display: none;" aria-hidden="true">
                <div class="expanded-header">
                    <h3>ML Performance Dashboard</h3>
                    <button class="close-expanded" 
                            title="Close expanded view"
                            aria-label="Close expanded view">✕</button>
                </div>
                
                <div class="expanded-content">
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <h4>Confidence Distribution</h4>
                            <div class="confidence-bars">
                                <div class="confidence-bar high">
                                    <span class="bar-label">High (85%+)</span>
                                    <div class="bar-fill" data-metric="high-confidence"></div>
                                    <span class="bar-value" id="high-confidence-count">0</span>
                                </div>
                                <div class="confidence-bar medium">
                                    <span class="bar-label">Medium (70-84%)</span>
                                    <div class="bar-fill" data-metric="medium-confidence"></div>
                                    <span class="bar-value" id="medium-confidence-count">0</span>
                                </div>
                                <div class="confidence-bar low">
                                    <span class="bar-label">Low (50-69%)</span>
                                    <div class="bar-fill" data-metric="low-confidence"></div>
                                    <span class="bar-value" id="low-confidence-count">0</span>
                                </div>
                                <div class="confidence-bar uncertain">
                                    <span class="bar-label">Uncertain (<50%)</span>
                                    <div class="bar-fill" data-metric="uncertain-confidence"></div>
                                    <span class="bar-value" id="uncertain-confidence-count">0</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="metric-card">
                            <h4>Confidence Trend</h4>
                            <div class="chart-container" id="confidence-trend-chart"></div>
                        </div>
                        
                        <div class="metric-card">
                            <h4>Processing Stats</h4>
                            <div class="stat-list">
                                <div class="stat-item">
                                    <span class="stat-label">Processing Speed</span>
                                    <span class="stat-value" id="processing-speed">-- files/min</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Active Iterations</span>
                                    <span class="stat-value" id="active-iterations">--</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Last Processing</span>
                                    <span class="stat-value" id="last-processing">--</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Convergence Rate</span>
                                    <span class="stat-value" id="convergence-rate-detailed">--%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach dashboard to header navigation
     */
    attachToHeader() {
        const nav = document.querySelector('.main-nav') || 
                     document.querySelector('nav') || 
                     document.querySelector('header nav');
                     
        if (nav) {
            // Try to insert after API config button for consistent placement
            const apiButton = nav.querySelector('.btn-api-config') || 
                           nav.querySelector('[data-action="api-config"]');
            
            if (apiButton) {
                apiButton.insertAdjacentElement('afterend', this.container);
            } else {
                // Fallback: append to end of nav
                nav.appendChild(this.container);
            }
            
            console.log('[MLDashboard] Attached to header navigation');
        } else {
            // Fallback: attach to body with absolute positioning
            document.body.appendChild(this.container);
            this.container.style.position = 'fixed';
            this.container.style.top = '10px';
            this.container.style.right = '10px';
            this.container.style.zIndex = '1000';
            
            console.warn('[MLDashboard] Header nav not found, using fallback positioning');
        }
    }

    /**
     * Setup event listeners for the dashboard
     */
    setupEventListeners() {
        // ML system events
        if (window.KC?.EventBus) {
            KC.EventBus.on('ml:confidence:updated', this.handleUpdate);
            KC.EventBus.on('ml:convergence:detected', this.handleConvergence);
            KC.EventBus.on('ml:processing:started', () => this.updateMetrics());
            KC.EventBus.on('ml:processing:completed', () => this.updateMetrics());
        }

        // Dashboard controls
        const expandBtn = this.container.querySelector('.btn-expand');
        if (expandBtn) {
            expandBtn.addEventListener('click', this.toggleExpanded);
        }

        const closeBtn = this.container.querySelector('.close-expanded');
        if (closeBtn) {
            closeBtn.addEventListener('click', this.toggleExpanded);
        }

        const autoImproveBtn = this.container.querySelector('.btn-auto-improve');
        if (autoImproveBtn) {
            autoImproveBtn.addEventListener('click', () => {
                this.toggleAutoImprove();
            });
        }

        const settingsBtn = this.container.querySelector('.btn-settings');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Alt + M to toggle dashboard
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                this.toggleExpanded();
            }
        });

        // Window resize handling
        window.addEventListener('resize', () => {
            if (this.isExpanded) {
                this.repositionExpanded();
            }
        });
    }

    /**
     * Start periodic metric updates
     */
    startUpdates() {
        // Initial update
        this.updateMetrics();
        
        // Set up periodic updates
        this.updateInterval = setInterval(() => {
            this.updateMetrics();
        }, this.updateFrequency);
        
        console.log(`[MLDashboard] Updates started (every ${this.updateFrequency/1000}s)`);
    }

    /**
     * Update dashboard metrics with performance monitoring
     */
    async updateMetrics() {
        this.performanceMonitor.startMeasure('dashboard-update');
        
        try {
            const stats = await this.metrics.calculate();
            
            // Update compact view
            this.updateCompactView(stats);
            
            // Update expanded view if visible
            if (this.isExpanded) {
                this.updateExpandedView(stats);
            }
            
            // Emit update event
            if (window.KC?.EventBus) {
                KC.EventBus.emit('ml:dashboard:updated', stats);
            }
            
        } catch (error) {
            console.error('[MLDashboard] Update error:', error);
            this.showError('Failed to update metrics');
        } finally {
            const updateTime = this.performanceMonitor.endMeasure('dashboard-update');
            
            // Warn if update is too slow (should be < 16.67ms for 60fps)
            if (updateTime > 16.67) {
                console.warn(`[MLDashboard] Slow update: ${updateTime.toFixed(2)}ms`);
            }
        }
    }

    /**
     * Update compact view elements
     * @param {Object} stats - Metrics data
     */
    updateCompactView(stats) {
        // Status indicator
        this.updateElement('ml-status-text', stats.enabled ? 'Active' : 'Inactive');
        
        // Core metrics
        this.updateElement('avg-confidence', `${Math.round(stats.avgConfidence)}%`);
        this.updateElement('converged-count', `${stats.converged}/${stats.total}`);
        
        // Improvement rate with +/- indicator
        const improvementText = stats.improvementRate > 0 ? 
            `+${stats.improvementRate}%` : `${stats.improvementRate}%`;
        this.updateElement('improvement-rate', improvementText);
        
        // System health
        this.updateElement('system-health', `${stats.health.score}%`);
        
        // Update metric styles based on values
        this.updateMetricStyles(stats);
        
        // Update health indicator color
        this.updateHealthIndicator(stats.health);
    }

    /**
     * Update expanded view with detailed metrics
     * @param {Object} stats - Metrics data  
     */
    updateExpandedView(stats) {
        const detailed = this.metrics.getDetailed();
        
        // Update confidence distribution bars
        const total = stats.total || 1; // Avoid division by zero
        
        this.updateProgressBar('high-confidence', stats.converged, total);
        this.updateProgressBar('medium-confidence', stats.improving, total);
        this.updateProgressBar('low-confidence', stats.stagnant, total);
        this.updateProgressBar('uncertain-confidence', stats.needsWork, total);
        
        // Update count displays
        this.updateElement('high-confidence-count', stats.converged);
        this.updateElement('medium-confidence-count', stats.improving);
        this.updateElement('low-confidence-count', stats.stagnant);
        this.updateElement('uncertain-confidence-count', stats.needsWork);
        
        // Update processing stats
        this.updateElement('processing-speed', `${stats.processingSpeed} files/min`);
        this.updateElement('active-iterations', stats.activeIterations);
        this.updateElement('convergence-rate-detailed', `${stats.convergenceRate}%`);
        
        // Update last processing time
        if (stats.lastIterationTime) {
            const lastTime = new Date(stats.lastIterationTime).toLocaleTimeString();
            this.updateElement('last-processing', lastTime);
        }
        
        // Update trend chart
        this.updateTrendChart(detailed.trends);
    }

    /**
     * Update progress bar display
     * @param {string} metricName - Metric identifier
     * @param {number} value - Current value
     * @param {number} total - Total count
     */
    updateProgressBar(metricName, value, total) {
        const percentage = total > 0 ? (value / total) * 100 : 0;
        const barFill = this.container.querySelector(`[data-metric="${metricName}"]`);
        
        if (barFill) {
            barFill.style.width = `${percentage}%`;
            barFill.setAttribute('aria-valuenow', percentage);
        }
    }

    /**
     * Update trend chart with latest data
     * @param {Object} trends - Trend data
     */
    updateTrendChart(trends) {
        if (!trends || !trends.confidence.length) return;
        
        const chartContainer = this.container.querySelector('#confidence-trend-chart');
        if (!chartContainer) return;
        
        // Create or update chart
        if (!this.charts.charts.has('confidence-trend')) {
            this.charts.createTrendChart('confidence-trend', chartContainer, {
                width: 280,
                height: 80,
                color: 'var(--ml-confidence-high-primary)',
                animate: true
            });
        }
        
        this.charts.updateChart('confidence-trend', trends.confidence);
    }

    /**
     * Update element text content with animation
     * @param {string} id - Element ID
     * @param {string} value - New value
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element && element.textContent !== value.toString()) {
            element.textContent = value;
            
            // Add update animation
            element.classList.add('updating');
            setTimeout(() => {
                element.classList.remove('updating');
            }, 300);
        }
    }

    /**
     * Update metric pill styles based on values
     * @param {Object} stats - Metrics data
     */
    updateMetricStyles(stats) {
        // Color code average confidence
        const avgConfElement = document.getElementById('avg-confidence');
        if (avgConfElement) {
            const parent = avgConfElement.closest('.metric-pill');
            if (parent) {
                parent.className = 'metric-pill';
                
                if (stats.avgConfidence >= 85) {
                    parent.classList.add('high');
                } else if (stats.avgConfidence >= 70) {
                    parent.classList.add('medium');
                } else if (stats.avgConfidence >= 50) {
                    parent.classList.add('low');
                } else {
                    parent.classList.add('uncertain');
                }
            }
        }
        
        // Color code improvement rate
        const improvementElement = document.getElementById('improvement-rate');
        if (improvementElement) {
            const parent = improvementElement.closest('.metric-pill');
            if (parent) {
                parent.classList.remove('positive', 'negative', 'neutral');
                
                if (stats.improvementRate > 0) {
                    parent.classList.add('positive');
                } else if (stats.improvementRate < 0) {
                    parent.classList.add('negative');
                } else {
                    parent.classList.add('neutral');
                }
            }
        }
    }

    /**
     * Update health indicator display
     * @param {Object} health - Health metrics
     */
    updateHealthIndicator(health) {
        const healthElement = document.getElementById('system-health');
        if (healthElement) {
            const parent = healthElement.closest('.metric-pill');
            if (parent) {
                parent.style.setProperty('--health-color', health.color);
                parent.setAttribute('title', `System health: ${health.status} (${health.score}%)`);
            }
        }
        
        // Update health icon based on status
        const iconElement = this.container.querySelector('.system-health .metric-icon');
        if (iconElement) {
            const icons = {
                excellent: '💚',
                good: '💛', 
                fair: '🧡',
                poor: '❤️'
            };
            iconElement.textContent = icons[health.status] || '❤️';
        }
    }

    /**
     * Toggle expanded dashboard view
     */
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        
        const compactView = this.container.querySelector('.dashboard-compact');
        const expandedView = this.container.querySelector('.dashboard-expanded');
        const expandBtn = this.container.querySelector('.btn-expand');
        
        if (this.isExpanded) {
            // Show expanded view
            expandedView.style.display = 'block';
            expandedView.setAttribute('aria-hidden', 'false');
            
            // Update button state
            if (expandBtn) {
                expandBtn.setAttribute('aria-expanded', 'true');
                expandBtn.classList.add('active');
            }
            
            // Position expanded view
            this.repositionExpanded();
            
            // Trigger immediate update for expanded metrics
            this.updateMetrics();
            
            // Focus management
            const closeBtn = expandedView.querySelector('.close-expanded');
            if (closeBtn) {
                closeBtn.focus();
            }
            
        } else {
            // Hide expanded view
            expandedView.style.display = 'none';
            expandedView.setAttribute('aria-hidden', 'true');
            
            // Update button state  
            if (expandBtn) {
                expandBtn.setAttribute('aria-expanded', 'false');
                expandBtn.classList.remove('active');
                expandBtn.focus(); // Return focus
            }
        }
        
        // Emit event
        if (window.KC?.EventBus) {
            KC.EventBus.emit('ml:dashboard:toggled', { expanded: this.isExpanded });
        }
    }

    /**
     * Position expanded view optimally
     */
    repositionExpanded() {
        const expandedView = this.container.querySelector('.dashboard-expanded');
        if (!expandedView) return;
        
        const rect = this.container.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Reset positioning
        expandedView.style.position = 'fixed';
        expandedView.style.top = '';
        expandedView.style.left = '';
        expandedView.style.right = '';
        expandedView.style.bottom = '';
        
        // Calculate optimal position
        if (rect.right + 400 <= viewportWidth) {
            // Right of dashboard
            expandedView.style.left = `${rect.right + 10}px`;
            expandedView.style.top = `${rect.top}px`;
        } else if (rect.left - 400 >= 0) {
            // Left of dashboard
            expandedView.style.right = `${viewportWidth - rect.left + 10}px`;
            expandedView.style.top = `${rect.top}px`;
        } else {
            // Below dashboard
            expandedView.style.left = `${Math.max(10, rect.left - 100)}px`;
            expandedView.style.top = `${rect.bottom + 10}px`;
        }
    }

    /**
     * Toggle automatic improvement mode
     */
    toggleAutoImprove() {
        const isEnabled = window.KC?.ML?.flags?.autoImprove || false;
        const newState = !isEnabled;
        
        // Update ML flags
        if (window.KC?.ML) {
            KC.ML.flags = KC.ML.flags || {};
            KC.ML.flags.autoImprove = newState;
        }
        
        // Update button state
        const button = this.container.querySelector('.btn-auto-improve');
        if (button) {
            button.classList.toggle('active', newState);
            button.setAttribute('aria-pressed', newState);
            button.title = newState ? 
                'Disable automatic ML improvement' : 
                'Enable automatic ML improvement';
        }
        
        // Show notification
        this.showNotification(
            newState ? 'Auto-improvement enabled' : 'Auto-improvement disabled'
        );
        
        // Emit event
        if (window.KC?.EventBus) {
            KC.EventBus.emit('ml:auto-improve:toggled', { enabled: newState });
        }
    }

    /**
     * Open ML settings panel
     */
    openSettings() {
        if (window.KC?.EventBus) {
            KC.EventBus.emit('ml:settings:open');
        } else {
            this.showNotification('Settings panel not available');
        }
    }

    /**
     * Handle ML confidence update event
     * @param {Object} data - Event data
     */
    handleUpdate(data) {
        // Invalidate cache to force fresh calculation
        this.metrics.invalidateCache();
        
        // Trigger immediate update
        this.updateMetrics();
    }

    /**
     * Handle ML convergence detection event
     * @param {Object} data - Event data
     */
    handleConvergence(data) {
        // Show convergence notification
        this.showNotification(`File "${data.fileName}" reached target confidence!`);
        
        // Update metrics
        this.updateMetrics();
    }

    /**
     * Show notification message
     * @param {string} message - Notification text
     */
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'ml-notification';
        notification.textContent = message;
        notification.setAttribute('role', 'status');
        notification.setAttribute('aria-live', 'polite');
        
        // Position near dashboard
        notification.style.position = 'fixed';
        const rect = this.container.getBoundingClientRect();
        notification.style.top = `${rect.bottom + 10}px`;
        notification.style.left = `${rect.left}px`;
        notification.style.zIndex = '10001';
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Show error message
     * @param {string} error - Error message
     */
    showError(error) {
        console.error('[MLDashboard]', error);
        
        // Update status indicator
        this.updateElement('ml-status-text', 'Error');
        
        // Show error notification
        this.showNotification(`Error: ${error}`);
    }

    /**
     * Cleanup and destroy dashboard
     */
    destroy() {
        // Stop updates
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Remove event listeners
        if (window.KC?.EventBus) {
            KC.EventBus.off('ml:confidence:updated', this.handleUpdate);
            KC.EventBus.off('ml:convergence:detected', this.handleConvergence);
        }
        
        // Cleanup charts
        this.charts.destroy();
        
        // Remove DOM element
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        console.log('[MLDashboard] Destroyed');
    }
}

// Register with KC
if (window.KC) {
    window.KC.MLDashboard = MLDashboard;
    console.log('[MLDashboard] Registered with KC');
}
/**
 * HealthIndicators - System health status indicators
 */

class HealthIndicators {
    constructor() {
        this.container = document.getElementById('healthIndicators');
        this.indicators = {
            system: {
                name: 'System Status',
                icon: '💻',
                status: 'unknown',
                metrics: []
            },
            ml: {
                name: 'ML Pipeline',
                icon: '🤖',
                status: 'unknown',
                metrics: []
            },
            processing: {
                name: 'Processing',
                icon: '⚙️',
                status: 'unknown',
                metrics: []
            },
            memory: {
                name: 'Memory',
                icon: '💾',
                status: 'unknown',
                metrics: []
            },
            storage: {
                name: 'Storage',
                icon: '📂',
                status: 'unknown',
                metrics: []
            },
            network: {
                name: 'Network',
                icon: '🌐',
                status: 'unknown',
                metrics: []
            }
        };

        this.statusColors = {
            healthy: '#4CAF50',
            warning: '#FF9800',
            critical: '#F44336',
            unknown: '#9E9E9E'
        };

        this.statusIcons = {
            healthy: '✓',
            warning: '⚠️',
            critical: '❌',
            unknown: '?'
        };

        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        if (!this.container) return;

        this.container.innerHTML = '';

        Object.entries(this.indicators).forEach(([key, indicator]) => {
            const element = this.createIndicatorElement(key, indicator);
            this.container.appendChild(element);
        });
    }

    createIndicatorElement(key, indicator) {
        const div = document.createElement('div');
        div.className = 'health-indicator';
        div.id = `health-${key}`;
        
        div.innerHTML = `
            <div class="indicator-header">
                <span class="indicator-icon">${indicator.icon}</span>
                <span class="indicator-name">${indicator.name}</span>
            </div>
            <div class="indicator-status ${indicator.status}">
                <span class="status-icon">${this.statusIcons[indicator.status]}</span>
                <span class="status-text">${this.capitalizeFirst(indicator.status)}</span>
            </div>
            <div class="indicator-metrics">
                ${this.renderMetrics(indicator.metrics)}
            </div>
            <div class="indicator-details" style="display: none;">
                <!-- Details will be populated when expanded -->
            </div>
        `;

        // Add click handler for expansion
        div.addEventListener('click', () => this.toggleDetails(key));

        return div;
    }

    renderMetrics(metrics) {
        if (!metrics || metrics.length === 0) {
            return '<span class="no-metrics">No metrics available</span>';
        }

        return metrics.map(metric => `
            <div class="metric-item">
                <span class="metric-label">${metric.label}:</span>
                <span class="metric-value ${metric.status || ''}">${metric.value}</span>
            </div>
        `).join('');
    }

    updateIndicators(statuses) {
        Object.entries(statuses).forEach(([key, status]) => {
            if (this.indicators[key]) {
                this.updateIndicator(key, { status });
            }
        });
    }

    updateIndicator(key, updates) {
        const indicator = this.indicators[key];
        if (!indicator) return;

        // Update indicator data
        Object.assign(indicator, updates);

        // Update DOM
        const element = document.getElementById(`health-${key}`);
        if (!element) return;

        // Update status
        const statusElement = element.querySelector('.indicator-status');
        if (statusElement && updates.status) {
            statusElement.className = `indicator-status ${updates.status}`;
            statusElement.innerHTML = `
                <span class="status-icon">${this.statusIcons[updates.status]}</span>
                <span class="status-text">${this.capitalizeFirst(updates.status)}</span>
            `;
        }

        // Update metrics
        if (updates.metrics) {
            const metricsElement = element.querySelector('.indicator-metrics');
            if (metricsElement) {
                metricsElement.innerHTML = this.renderMetrics(updates.metrics);
            }
        }

        // Apply visual feedback
        this.applyVisualFeedback(element, updates.status);
    }

    applyVisualFeedback(element, status) {
        // Remove previous status classes
        element.classList.remove('flash-warning', 'flash-critical');

        // Add flash animation for warnings and critical
        if (status === 'warning') {
            element.classList.add('flash-warning');
            setTimeout(() => element.classList.remove('flash-warning'), 2000);
        } else if (status === 'critical') {
            element.classList.add('flash-critical');
            setTimeout(() => element.classList.remove('flash-critical'), 2000);
        }
    }

    toggleDetails(key) {
        const element = document.getElementById(`health-${key}`);
        if (!element) return;

        const details = element.querySelector('.indicator-details');
        const isExpanded = details.style.display !== 'none';

        if (isExpanded) {
            details.style.display = 'none';
            element.classList.remove('expanded');
        } else {
            // Populate details
            this.populateDetails(key, details);
            details.style.display = 'block';
            element.classList.add('expanded');
        }
    }

    populateDetails(key, detailsElement) {
        const indicator = this.indicators[key];
        
        // Generate detailed information based on indicator type
        let detailsHTML = '<h4>Detailed Information</h4>';

        switch (key) {
            case 'system':
                detailsHTML += this.getSystemDetails();
                break;
            case 'ml':
                detailsHTML += this.getMLDetails();
                break;
            case 'processing':
                detailsHTML += this.getProcessingDetails();
                break;
            case 'memory':
                detailsHTML += this.getMemoryDetails();
                break;
            case 'storage':
                detailsHTML += this.getStorageDetails();
                break;
            case 'network':
                detailsHTML += this.getNetworkDetails();
                break;
            default:
                detailsHTML += '<p>No additional details available.</p>';
        }

        detailsElement.innerHTML = detailsHTML;
    }

    getSystemDetails() {
        return `
            <ul>
                <li>Uptime: ${this.getUptime()}</li>
                <li>CPU Usage: ${this.getCPUUsage()}</li>
                <li>Active Processes: ${this.getActiveProcesses()}</li>
                <li>System Load: ${this.getSystemLoad()}</li>
            </ul>
        `;
    }

    getMLDetails() {
        return `
            <ul>
                <li>Models Loaded: ${this.getModelsLoaded()}</li>
                <li>Avg Inference Time: ${this.getAvgInferenceTime()}</li>
                <li>Queue Length: ${this.getQueueLength()}</li>
                <li>Last Training: ${this.getLastTraining()}</li>
            </ul>
        `;
    }

    getProcessingDetails() {
        return `
            <ul>
                <li>Files in Queue: ${this.getFilesInQueue()}</li>
                <li>Processing Rate: ${this.getProcessingRate()}</li>
                <li>Success Rate: ${this.getSuccessRate()}</li>
                <li>Avg Processing Time: ${this.getAvgProcessingTime()}</li>
            </ul>
        `;
    }

    getMemoryDetails() {
        return `
            <ul>
                <li>Total Memory: ${this.getTotalMemory()}</li>
                <li>Used Memory: ${this.getUsedMemory()}</li>
                <li>Free Memory: ${this.getFreeMemory()}</li>
                <li>Cache Size: ${this.getCacheSize()}</li>
            </ul>
        `;
    }

    getStorageDetails() {
        return `
            <ul>
                <li>Total Storage: ${this.getTotalStorage()}</li>
                <li>Used Storage: ${this.getUsedStorage()}</li>
                <li>Free Storage: ${this.getFreeStorage()}</li>
                <li>Database Size: ${this.getDatabaseSize()}</li>
            </ul>
        `;
    }

    getNetworkDetails() {
        return `
            <ul>
                <li>Latency: ${this.getNetworkLatency()}</li>
                <li>Bandwidth: ${this.getBandwidth()}</li>
                <li>Active Connections: ${this.getActiveConnections()}</li>
                <li>API Response Time: ${this.getAPIResponseTime()}</li>
            </ul>
        `;
    }

    // Mock data methods - replace with actual data sources
    getUptime() {
        const uptime = Date.now() - (window.dashboardStartTime || Date.now());
        const hours = Math.floor(uptime / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    getCPUUsage() { return '45%'; }
    getActiveProcesses() { return '12'; }
    getSystemLoad() { return '0.75'; }
    getModelsLoaded() { return '3'; }
    getAvgInferenceTime() { return '125ms'; }
    getQueueLength() { return '8'; }
    getLastTraining() { return '2 hours ago'; }
    getFilesInQueue() { return '15'; }
    getProcessingRate() { return '12 files/min'; }
    getSuccessRate() { return '98.5%'; }
    getAvgProcessingTime() { return '4.2s'; }
    getTotalMemory() { return '8 GB'; }
    getUsedMemory() { return '3.2 GB'; }
    getFreeMemory() { return '4.8 GB'; }
    getCacheSize() { return '512 MB'; }
    getTotalStorage() { return '100 GB'; }
    getUsedStorage() { return '42 GB'; }
    getFreeStorage() { return '58 GB'; }
    getDatabaseSize() { return '2.1 GB'; }
    getNetworkLatency() { return '12ms'; }
    getBandwidth() { return '100 Mbps'; }
    getActiveConnections() { return '24'; }
    getAPIResponseTime() { return '85ms'; }

    setupEventListeners() {
        // Listen for health updates from KC.EventBus if available
        if (window.KC?.EventBus) {
            KC.EventBus.on('HEALTH_UPDATE', (data) => {
                this.handleHealthUpdate(data);
            });
        }
    }

    handleHealthUpdate(data) {
        if (data.indicator && this.indicators[data.indicator]) {
            this.updateIndicator(data.indicator, data);
        }
    }

    // Public API for external updates
    setSystemHealth(status, metrics = []) {
        this.updateIndicator('system', { status, metrics });
    }

    setMLHealth(status, metrics = []) {
        this.updateIndicator('ml', { status, metrics });
    }

    setProcessingHealth(status, metrics = []) {
        this.updateIndicator('processing', { status, metrics });
    }

    setMemoryHealth(status, metrics = []) {
        this.updateIndicator('memory', { status, metrics });
    }

    setStorageHealth(status, metrics = []) {
        this.updateIndicator('storage', { status, metrics });
    }

    setNetworkHealth(status, metrics = []) {
        this.updateIndicator('network', { status, metrics });
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for use in dashboard
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HealthIndicators;
}

// Store dashboard start time
window.dashboardStartTime = Date.now();
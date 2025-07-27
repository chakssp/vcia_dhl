/**
 * ML Monitoring Dashboard Main Controller
 * Coordinates all dashboard components and data flow
 */

class MLDashboard {
    constructor() {
        this.components = new Map();
        this.updateInterval = 5000; // 5 seconds
        this.updateTimer = null;
        this.metricsData = {
            confidence: [],
            processing: [],
            errors: [],
            memory: [],
            convergence: [],
            timeline: []
        };
        
        this.init();
    }

    init() {
        // Initialize components
        this.initializeComponents();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start data collection
        this.startDataCollection();
        
        // Apply theme
        this.applyTheme();
        
        console.log('[MLDashboard] Initialized successfully');
    }

    initializeComponents() {
        // Initialize visualizer
        this.components.set('visualizer', new MetricsVisualizer());
        
        // Initialize alert manager
        this.components.set('alertManager', new AlertManager());
        
        // Initialize chart components
        this.components.set('charts', new ChartComponents());
        
        // Initialize health indicators
        this.components.set('health', new HealthIndicators());
        
        // Initialize alert config UI
        this.components.set('alertConfig', new AlertConfigUI());
        
        // Initialize notification center
        this.components.set('notifications', new NotificationCenter());
        
        // Initialize all charts
        this.initializeCharts();
    }

    initializeCharts() {
        const charts = this.components.get('charts');
        const visualizer = this.components.get('visualizer');
        
        // Confidence chart
        visualizer.createLineChart('confidenceChart', {
            width: 300,
            height: 150,
            color: '#4CAF50',
            label: 'Confidence Score'
        });
        
        // Processing rate chart
        visualizer.createLineChart('processingChart', {
            width: 300,
            height: 150,
            color: '#2196F3',
            label: 'Files/min'
        });
        
        // Error rate chart
        visualizer.createLineChart('errorChart', {
            width: 300,
            height: 150,
            color: '#F44336',
            label: 'Error %'
        });
        
        // Memory usage chart
        visualizer.createAreaChart('memoryChart', {
            width: 300,
            height: 150,
            color: '#FF9800',
            label: 'Memory (MB)'
        });
        
        // Convergence chart
        visualizer.createLineChart('convergenceChart', {
            width: 600,
            height: 200,
            color: '#9C27B0',
            label: 'Convergence Rate',
            showGrid: true
        });
        
        // Feature distribution chart
        visualizer.createBarChart('featureChart', {
            width: 300,
            height: 200,
            colors: ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0']
        });
        
        // Prediction distribution chart
        visualizer.createPieChart('predictionChart', {
            width: 300,
            height: 200,
            colors: ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0']
        });
        
        // Timeline chart
        visualizer.createTimelineChart('timelineChart', {
            width: 900,
            height: 300,
            colors: {
                confidence: '#4CAF50',
                processing: '#2196F3',
                errors: '#F44336',
                memory: '#FF9800'
            }
        });
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });
        
        // Alert config button
        document.getElementById('alertConfigBtn').addEventListener('click', () => {
            this.components.get('alertConfig').show();
        });
        
        // Theme toggle
        document.getElementById('themeToggleBtn').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Time range selector
        document.getElementById('timeRange').addEventListener('change', (e) => {
            this.updateTimeRange(e.target.value);
        });
        
        // Listen to KC events if available
        if (window.KC?.EventBus) {
            KC.EventBus.on('ML_METRICS_UPDATE', (data) => {
                this.handleMetricsUpdate(data);
            });
            
            KC.EventBus.on('ML_ALERT_TRIGGERED', (alert) => {
                this.handleNewAlert(alert);
            });
        }
    }

    startDataCollection() {
        // Initial data fetch
        this.fetchMetrics();
        
        // Start periodic updates
        this.updateTimer = setInterval(() => {
            this.fetchMetrics();
        }, this.updateInterval);
    }

    async fetchMetrics() {
        try {
            // Fetch from PrometheusExporter if available
            if (window.KC?.PrometheusExporter) {
                const metrics = await KC.PrometheusExporter.collectMetrics();
                this.processMetrics(metrics);
            } else {
                // Use mock data for demo
                this.processMockMetrics();
            }
        } catch (error) {
            console.error('[MLDashboard] Error fetching metrics:', error);
            this.components.get('notifications').showError('Failed to fetch metrics');
        }
    }

    processMetrics(metrics) {
        const timestamp = Date.now();
        const visualizer = this.components.get('visualizer');
        
        // Process ML metrics
        if (metrics.ml_confidence_score) {
            const confidence = parseFloat(metrics.ml_confidence_score.value);
            this.metricsData.confidence.push({ x: timestamp, y: confidence });
            document.getElementById('avgConfidence').textContent = confidence.toFixed(2);
            visualizer.updateChart('confidenceChart', this.metricsData.confidence);
        }
        
        // Process processing rate
        if (metrics.ml_files_processed) {
            const rate = metrics.ml_files_processed.rate || 0;
            this.metricsData.processing.push({ x: timestamp, y: rate });
            document.getElementById('processingRate').textContent = `${rate.toFixed(1)} files/min`;
            visualizer.updateChart('processingChart', this.metricsData.processing);
        }
        
        // Process error rate
        if (metrics.ml_processing_errors) {
            const errorRate = (metrics.ml_processing_errors.value / (metrics.ml_files_processed.value || 1)) * 100;
            this.metricsData.errors.push({ x: timestamp, y: errorRate });
            document.getElementById('errorRate').textContent = `${errorRate.toFixed(1)}%`;
            visualizer.updateChart('errorChart', this.metricsData.errors);
        }
        
        // Process memory usage
        if (metrics.system_memory_usage) {
            const memory = metrics.system_memory_usage.value / (1024 * 1024); // Convert to MB
            this.metricsData.memory.push({ x: timestamp, y: memory });
            document.getElementById('memoryUsage').textContent = `${memory.toFixed(0)} MB`;
            visualizer.updateChart('memoryChart', this.metricsData.memory);
        }
        
        // Update health indicators
        this.updateHealthIndicators(metrics);
        
        // Update feature flags
        this.updateFeatureFlags(metrics);
        
        // Update timeline
        this.updateTimeline();
        
        // Check for alerts
        this.checkAlerts(metrics);
    }

    processMockMetrics() {
        const timestamp = Date.now();
        const visualizer = this.components.get('visualizer');
        
        // Generate mock data
        const mockData = {
            confidence: 0.75 + Math.random() * 0.2,
            processingRate: 10 + Math.random() * 5,
            errorRate: Math.random() * 5,
            memory: 256 + Math.random() * 128,
            convergence: 0.85 + Math.random() * 0.1
        };
        
        // Update confidence
        this.metricsData.confidence.push({ x: timestamp, y: mockData.confidence });
        document.getElementById('avgConfidence').textContent = mockData.confidence.toFixed(2);
        visualizer.updateChart('confidenceChart', this.getLimitedData(this.metricsData.confidence));
        
        // Update processing rate
        this.metricsData.processing.push({ x: timestamp, y: mockData.processingRate });
        document.getElementById('processingRate').textContent = `${mockData.processingRate.toFixed(1)} files/min`;
        visualizer.updateChart('processingChart', this.getLimitedData(this.metricsData.processing));
        
        // Update error rate
        this.metricsData.errors.push({ x: timestamp, y: mockData.errorRate });
        document.getElementById('errorRate').textContent = `${mockData.errorRate.toFixed(1)}%`;
        visualizer.updateChart('errorChart', this.getLimitedData(this.metricsData.errors));
        
        // Update memory
        this.metricsData.memory.push({ x: timestamp, y: mockData.memory });
        document.getElementById('memoryUsage').textContent = `${mockData.memory.toFixed(0)} MB`;
        visualizer.updateChart('memoryChart', this.getLimitedData(this.metricsData.memory));
        
        // Update convergence
        this.metricsData.convergence.push({ x: timestamp, y: mockData.convergence });
        document.getElementById('convergenceRate').textContent = `${(mockData.convergence * 100).toFixed(1)}%`;
        document.getElementById('convergenceStatus').textContent = mockData.convergence > 0.9 ? 'Converged' : 'Converging';
        document.getElementById('convergenceStatus').className = `indicator ${mockData.convergence > 0.9 ? 'success' : 'warning'}`;
        visualizer.updateChart('convergenceChart', this.getLimitedData(this.metricsData.convergence));
        
        // Update feature distribution
        visualizer.updateChart('featureChart', [
            { label: 'Technical', value: Math.random() * 100 },
            { label: 'Strategic', value: Math.random() * 100 },
            { label: 'Operational', value: Math.random() * 100 },
            { label: 'Learning', value: Math.random() * 100 },
            { label: 'General', value: Math.random() * 100 }
        ]);
        
        // Update prediction distribution
        visualizer.updateChart('predictionChart', [
            { label: 'High Confidence', value: 35 + Math.random() * 10 },
            { label: 'Medium Confidence', value: 30 + Math.random() * 10 },
            { label: 'Low Confidence', value: 20 + Math.random() * 10 },
            { label: 'Uncertain', value: 10 + Math.random() * 5 }
        ]);
        
        // Update health indicators
        this.components.get('health').updateIndicators({
            system: mockData.errorRate < 2 ? 'healthy' : 'warning',
            ml: mockData.confidence > 0.7 ? 'healthy' : 'warning',
            processing: mockData.processingRate > 8 ? 'healthy' : 'critical',
            memory: mockData.memory < 400 ? 'healthy' : 'warning'
        });
        
        // Update feature flags
        this.updateMockFeatureFlags();
        
        // Update timeline
        this.updateTimeline();
        
        // Simulate occasional alerts
        if (Math.random() < 0.05) {
            this.simulateAlert();
        }
    }

    getLimitedData(data, limit = 50) {
        return data.slice(-limit);
    }

    updateHealthIndicators(metrics) {
        const health = this.components.get('health');
        
        // Calculate health status based on metrics
        const indicators = {
            system: this.calculateSystemHealth(metrics),
            ml: this.calculateMLHealth(metrics),
            processing: this.calculateProcessingHealth(metrics),
            memory: this.calculateMemoryHealth(metrics)
        };
        
        health.updateIndicators(indicators);
    }

    calculateSystemHealth(metrics) {
        // Logic to determine system health
        return 'healthy';
    }

    calculateMLHealth(metrics) {
        // Logic to determine ML health
        return 'healthy';
    }

    calculateProcessingHealth(metrics) {
        // Logic to determine processing health
        return 'healthy';
    }

    calculateMemoryHealth(metrics) {
        // Logic to determine memory health
        return 'healthy';
    }

    updateFeatureFlags(metrics) {
        // Update feature flags display
        const flagsContainer = document.getElementById('featureFlagsGrid');
        flagsContainer.innerHTML = '';
        
        // Get feature flags from MLFeatureFlags if available
        if (window.KC?.MLFeatureFlags) {
            const flags = KC.MLFeatureFlags.getAllFlags();
            Object.entries(flags).forEach(([key, config]) => {
                const flagElement = this.createFeatureFlagElement(key, config);
                flagsContainer.appendChild(flagElement);
            });
        }
    }

    updateMockFeatureFlags() {
        const flagsContainer = document.getElementById('featureFlagsGrid');
        flagsContainer.innerHTML = '';
        
        // Mock feature flags
        const mockFlags = {
            'ml-confidence-analysis': { enabled: true, rollout: 100 },
            'advanced-embeddings': { enabled: true, rollout: 75 },
            'real-time-processing': { enabled: false, rollout: 0 },
            'auto-categorization': { enabled: true, rollout: 50 },
            'semantic-search': { enabled: true, rollout: 100 }
        };
        
        Object.entries(mockFlags).forEach(([key, config]) => {
            const flagElement = this.createFeatureFlagElement(key, config);
            flagsContainer.appendChild(flagElement);
        });
    }

    createFeatureFlagElement(key, config) {
        const div = document.createElement('div');
        div.className = `feature-flag ${config.enabled ? 'enabled' : 'disabled'}`;
        div.innerHTML = `
            <div class="flag-name">${key}</div>
            <div class="flag-status">
                <span class="status-indicator ${config.enabled ? 'active' : 'inactive'}"></span>
                <span class="rollout-percentage">${config.rollout}%</span>
            </div>
        `;
        return div;
    }

    updateTimeline() {
        const visualizer = this.components.get('visualizer');
        const timeRange = document.getElementById('timeRange').value;
        
        // Prepare timeline data
        const timelineData = {
            confidence: this.getLimitedData(this.metricsData.confidence),
            processing: this.getLimitedData(this.metricsData.processing),
            errors: this.getLimitedData(this.metricsData.errors),
            memory: this.getLimitedData(this.metricsData.memory)
        };
        
        visualizer.updateChart('timelineChart', timelineData);
    }

    checkAlerts(metrics) {
        const alertManager = this.components.get('alertManager');
        alertManager.checkThresholds(metrics);
    }

    simulateAlert() {
        const alerts = [
            {
                type: 'warning',
                title: 'High Error Rate',
                message: 'Error rate exceeded 5% threshold',
                metric: 'ml_processing_errors',
                value: 5.2,
                threshold: 5
            },
            {
                type: 'critical',
                title: 'Low Confidence Score',
                message: 'ML confidence dropped below 0.6',
                metric: 'ml_confidence_score',
                value: 0.58,
                threshold: 0.6
            },
            {
                type: 'info',
                title: 'Processing Slowdown',
                message: 'Processing rate decreased by 30%',
                metric: 'ml_files_processed',
                value: 7,
                threshold: 10
            }
        ];
        
        const alert = alerts[Math.floor(Math.random() * alerts.length)];
        this.handleNewAlert(alert);
    }

    handleMetricsUpdate(data) {
        console.log('[MLDashboard] Received metrics update:', data);
        this.processMetrics(data);
    }

    handleNewAlert(alert) {
        const alertManager = this.components.get('alertManager');
        const notifications = this.components.get('notifications');
        
        // Add to alert manager
        alertManager.addAlert(alert);
        
        // Show notification
        notifications.showAlert(alert);
        
        // Update alert count
        const activeAlerts = alertManager.getActiveAlerts();
        document.getElementById('alertCount').textContent = activeAlerts.length;
    }

    refreshData() {
        console.log('[MLDashboard] Refreshing data...');
        this.fetchMetrics();
        
        // Show notification
        this.components.get('notifications').showInfo('Dashboard refreshed');
    }

    updateTimeRange(range) {
        console.log('[MLDashboard] Updating time range to:', range);
        // Update data based on selected time range
        this.updateTimeline();
    }

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        
        // Save preference
        localStorage.setItem('ml-dashboard-theme', isDark ? 'dark' : 'light');
        
        // Update charts theme
        const visualizer = this.components.get('visualizer');
        visualizer.setTheme(isDark ? 'dark' : 'light');
        
        // If KC.ThemeManager is available, sync with it
        if (window.KC?.ThemeManager) {
            KC.ThemeManager.setTheme(isDark ? 'dark' : 'light');
        }
    }

    applyTheme() {
        // Check saved preference or KC.ThemeManager
        let theme = localStorage.getItem('ml-dashboard-theme');
        
        if (!theme && window.KC?.ThemeManager) {
            theme = KC.ThemeManager.getTheme();
        }
        
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }

    destroy() {
        // Clear update timer
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        // Destroy components
        this.components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        
        console.log('[MLDashboard] Destroyed');
    }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mlDashboard = new MLDashboard();
    });
} else {
    window.mlDashboard = new MLDashboard();
}
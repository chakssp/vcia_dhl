/**
 * Custom Metrics Collector
 * ML Confidence Workflow System
 * 
 * Collects and exposes custom metrics for the monitoring dashboard
 * Compatible with Prometheus format
 */

import { EventBus } from '../../../js/core/EventBus.js';
import { Events } from '../../../js/core/Events.js';

export default class MetricsCollector {
    constructor(config = {}) {
        this.config = {
            namespace: 'ml_confidence',
            collectInterval: config.collectInterval || 60000, // 1 minute
            histogramBuckets: config.histogramBuckets || [0.1, 0.5, 1, 2, 5, 10],
            endpoint: config.endpoint || '/metrics',
            ...config
        };
        
        // Metric stores
        this.metrics = {
            counters: new Map(),
            gauges: new Map(),
            histograms: new Map(),
            summaries: new Map()
        };
        
        // Initialize core metrics
        this.initializeMetrics();
        
        // Subscribe to system events
        this.subscribeToEvents();
        
        // Start collection
        if (this.config.autoStart !== false) {
            this.startCollection();
        }
    }
    
    /**
     * Initialize core metrics
     */
    initializeMetrics() {
        // Confidence metrics
        this.createGauge('confidence_score', 'Current confidence score', ['file_id', 'category']);
        this.createHistogram('confidence_distribution', 'Distribution of confidence scores');
        this.createSummary('confidence_summary', 'Summary of confidence scores');
        
        // Performance metrics
        this.createHistogram('processing_duration_seconds', 'Processing time in seconds', ['operation']);
        this.createCounter('items_processed_total', 'Total items processed', ['status']);
        this.createGauge('throughput_items_per_second', 'Current processing throughput');
        
        // Convergence metrics
        this.createHistogram('convergence_iterations', 'Number of iterations to converge');
        this.createCounter('convergence_failures_total', 'Total convergence failures');
        this.createGauge('convergence_success_rate', 'Convergence success rate');
        
        // Cache metrics
        this.createCounter('cache_hits_total', 'Total cache hits', ['segment']);
        this.createCounter('cache_misses_total', 'Total cache misses', ['segment']);
        this.createCounter('cache_evictions_total', 'Total cache evictions', ['reason']);
        this.createGauge('cache_size', 'Current cache size', ['segment']);
        this.createGauge('cache_hit_rate', 'Cache hit rate percentage');
        
        // Worker metrics
        this.createGauge('workers_active', 'Currently active workers');
        this.createGauge('workers_available', 'Available workers');
        this.createCounter('worker_errors_total', 'Total worker errors', ['error_type']);
        this.createHistogram('worker_task_duration_seconds', 'Worker task duration');
        
        // Resource metrics
        this.createGauge('memory_usage_bytes', 'Memory usage in bytes');
        this.createGauge('memory_limit_bytes', 'Memory limit in bytes');
        this.createGauge('cpu_usage_percent', 'CPU usage percentage');
        
        // Error metrics
        this.createCounter('errors_total', 'Total errors', ['type', 'severity']);
        this.createCounter('requests_total', 'Total requests', ['method', 'endpoint']);
        this.createCounter('requests_failed_total', 'Total failed requests', ['method', 'endpoint']);
        
        // Data quality metrics
        this.createCounter('invalid_inputs_total', 'Total invalid inputs', ['reason']);
        this.createCounter('missing_embeddings_total', 'Total files missing embeddings');
        
        // System health
        this.createGauge('health_score', 'Overall system health score');
        this.createGauge('uptime_seconds', 'System uptime in seconds');
        
        // Version info
        this.createGauge('app_info', 'Application version info', ['version', 'environment']);
        this.setGauge('app_info', 1, { 
            version: this.config.version || '4.0.0',
            environment: this.config.environment || 'production'
        });
    }
    
    /**
     * Subscribe to system events
     */
    subscribeToEvents() {
        // Confidence events
        EventBus.on(Events.CONFIDENCE_CALCULATED, (data) => {
            this.recordConfidence(data);
        });
        
        // Processing events
        EventBus.on(Events.PROCESSING_STARTED, (data) => {
            this.startTimer(`processing_${data.id}`);
        });
        
        EventBus.on(Events.PROCESSING_COMPLETED, (data) => {
            this.recordProcessingTime(data);
        });
        
        // Cache events
        EventBus.on(Events.CACHE_HIT, (data) => {
            this.incrementCounter('cache_hits_total', 1, { segment: data.segment });
        });
        
        EventBus.on(Events.CACHE_MISS, (data) => {
            this.incrementCounter('cache_misses_total', 1, { segment: data.segment });
        });
        
        // Worker events
        EventBus.on(Events.WORKER_ACTIVE, () => {
            this.adjustWorkerMetrics();
        });
        
        EventBus.on(Events.WORKER_IDLE, () => {
            this.adjustWorkerMetrics();
        });
        
        // Error events
        EventBus.on(Events.ERROR_OCCURRED, (error) => {
            this.recordError(error);
        });
    }
    
    /**
     * Start metric collection
     */
    startCollection() {
        // Periodic collection
        this.collectionInterval = setInterval(() => {
            this.collectSystemMetrics();
            this.calculateDerivedMetrics();
        }, this.config.collectInterval);
        
        // Initial collection
        this.collectSystemMetrics();
    }
    
    /**
     * Stop metric collection
     */
    stopCollection() {
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
    }
    
    /**
     * Collect system metrics
     */
    collectSystemMetrics() {
        // Memory usage
        if (performance.memory) {
            this.setGauge('memory_usage_bytes', performance.memory.usedJSHeapSize);
            this.setGauge('memory_limit_bytes', performance.memory.jsHeapSizeLimit);
        }
        
        // CPU usage (estimated)
        const cpuUsage = this.estimateCPUUsage();
        this.setGauge('cpu_usage_percent', cpuUsage);
        
        // Uptime
        const uptime = (Date.now() - this.startTime) / 1000;
        this.setGauge('uptime_seconds', uptime);
        
        // Health score
        const healthScore = this.calculateHealthScore();
        this.setGauge('health_score', healthScore);
    }
    
    /**
     * Calculate derived metrics
     */
    calculateDerivedMetrics() {
        // Cache hit rate
        const hits = this.getCounterValue('cache_hits_total');
        const misses = this.getCounterValue('cache_misses_total');
        const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;
        this.setGauge('cache_hit_rate', hitRate * 100);
        
        // Throughput
        const processed = this.getCounterValue('items_processed_total');
        const uptime = this.getGaugeValue('uptime_seconds');
        const throughput = uptime > 0 ? processed / uptime : 0;
        this.setGauge('throughput_items_per_second', throughput);
        
        // Convergence success rate
        const converged = this.getCounterValue('items_processed_total', { status: 'converged' });
        const failed = this.getCounterValue('convergence_failures_total');
        const successRate = converged + failed > 0 ? converged / (converged + failed) : 1;
        this.setGauge('convergence_success_rate', successRate);
    }
    
    /**
     * Record confidence metrics
     */
    recordConfidence(data) {
        const confidence = data.confidence;
        
        // Update gauge
        this.setGauge('confidence_score', confidence, {
            file_id: data.fileId,
            category: data.category || 'unknown'
        });
        
        // Update histogram
        this.observeHistogram('confidence_distribution', confidence);
        
        // Update summary
        this.observeSummary('confidence_summary', confidence);
    }
    
    /**
     * Record processing time
     */
    recordProcessingTime(data) {
        const duration = this.endTimer(`processing_${data.id}`);
        
        if (duration) {
            this.observeHistogram('processing_duration_seconds', duration / 1000, {
                operation: data.operation || 'analysis'
            });
        }
        
        this.incrementCounter('items_processed_total', 1, {
            status: data.status || 'completed'
        });
    }
    
    /**
     * Record error
     */
    recordError(error) {
        this.incrementCounter('errors_total', 1, {
            type: error.type || 'unknown',
            severity: error.severity || 'error'
        });
    }
    
    /**
     * Adjust worker metrics
     */
    adjustWorkerMetrics() {
        // This would be integrated with actual worker pool
        const active = this.config.workerPool?.getActiveCount() || 0;
        const total = this.config.workerPool?.getTotalCount() || 8;
        
        this.setGauge('workers_active', active);
        this.setGauge('workers_available', total - active);
    }
    
    /**
     * Calculate health score
     */
    calculateHealthScore() {
        const scores = {
            confidence: this.getGaugeValue('confidence_score') >= 0.85 ? 1 : 0.5,
            cache: this.getGaugeValue('cache_hit_rate') >= 90 ? 1 : 0.7,
            errors: this.getErrorRate() < 0.01 ? 1 : 0.5,
            performance: this.getAverageLatency() < 1000 ? 1 : 0.7
        };
        
        const weights = {
            confidence: 0.4,
            cache: 0.2,
            errors: 0.2,
            performance: 0.2
        };
        
        let totalScore = 0;
        for (const [metric, weight] of Object.entries(weights)) {
            totalScore += scores[metric] * weight;
        }
        
        return totalScore;
    }
    
    /**
     * Estimate CPU usage (simplified)
     */
    estimateCPUUsage() {
        const active = this.getGaugeValue('workers_active');
        const total = this.getGaugeValue('workers_available') + active;
        
        return total > 0 ? (active / total) * 100 : 0;
    }
    
    /**
     * Get error rate
     */
    getErrorRate() {
        const errors = this.getCounterValue('errors_total');
        const requests = this.getCounterValue('requests_total');
        
        return requests > 0 ? errors / requests : 0;
    }
    
    /**
     * Get average latency
     */
    getAverageLatency() {
        const histogram = this.metrics.histograms.get('processing_duration_seconds');
        if (!histogram) return 0;
        
        return histogram.sum / histogram.count * 1000; // Convert to ms
    }
    
    /**
     * Create counter metric
     */
    createCounter(name, help, labels = []) {
        this.metrics.counters.set(name, {
            name: `${this.config.namespace}_${name}`,
            help,
            labels,
            values: new Map()
        });
    }
    
    /**
     * Create gauge metric
     */
    createGauge(name, help, labels = []) {
        this.metrics.gauges.set(name, {
            name: `${this.config.namespace}_${name}`,
            help,
            labels,
            values: new Map()
        });
    }
    
    /**
     * Create histogram metric
     */
    createHistogram(name, help, labels = []) {
        this.metrics.histograms.set(name, {
            name: `${this.config.namespace}_${name}`,
            help,
            labels,
            buckets: this.config.histogramBuckets,
            values: new Map()
        });
    }
    
    /**
     * Create summary metric
     */
    createSummary(name, help, labels = []) {
        this.metrics.summaries.set(name, {
            name: `${this.config.namespace}_${name}`,
            help,
            labels,
            quantiles: [0.5, 0.9, 0.95, 0.99],
            values: new Map()
        });
    }
    
    /**
     * Increment counter
     */
    incrementCounter(name, value = 1, labels = {}) {
        const counter = this.metrics.counters.get(name);
        if (!counter) return;
        
        const key = this.labelKey(labels);
        const current = counter.values.get(key) || 0;
        counter.values.set(key, current + value);
    }
    
    /**
     * Set gauge value
     */
    setGauge(name, value, labels = {}) {
        const gauge = this.metrics.gauges.get(name);
        if (!gauge) return;
        
        const key = this.labelKey(labels);
        gauge.values.set(key, value);
    }
    
    /**
     * Observe histogram value
     */
    observeHistogram(name, value, labels = {}) {
        const histogram = this.metrics.histograms.get(name);
        if (!histogram) return;
        
        const key = this.labelKey(labels);
        let data = histogram.values.get(key);
        
        if (!data) {
            data = {
                buckets: new Array(histogram.buckets.length).fill(0),
                sum: 0,
                count: 0
            };
            histogram.values.set(key, data);
        }
        
        // Update buckets
        for (let i = 0; i < histogram.buckets.length; i++) {
            if (value <= histogram.buckets[i]) {
                data.buckets[i]++;
            }
        }
        
        data.sum += value;
        data.count++;
    }
    
    /**
     * Observe summary value
     */
    observeSummary(name, value, labels = {}) {
        const summary = this.metrics.summaries.get(name);
        if (!summary) return;
        
        const key = this.labelKey(labels);
        let data = summary.values.get(key);
        
        if (!data) {
            data = {
                values: [],
                sum: 0,
                count: 0
            };
            summary.values.set(key, data);
        }
        
        data.values.push(value);
        data.sum += value;
        data.count++;
        
        // Keep only recent values (last 1000)
        if (data.values.length > 1000) {
            data.values.shift();
        }
    }
    
    /**
     * Timer utilities
     */
    timers = new Map();
    
    startTimer(name) {
        this.timers.set(name, Date.now());
    }
    
    endTimer(name) {
        const start = this.timers.get(name);
        if (!start) return null;
        
        this.timers.delete(name);
        return Date.now() - start;
    }
    
    /**
     * Get counter value
     */
    getCounterValue(name, labels = {}) {
        const counter = this.metrics.counters.get(name);
        if (!counter) return 0;
        
        const key = this.labelKey(labels);
        return counter.values.get(key) || 0;
    }
    
    /**
     * Get gauge value
     */
    getGaugeValue(name, labels = {}) {
        const gauge = this.metrics.gauges.get(name);
        if (!gauge) return 0;
        
        const key = this.labelKey(labels);
        return gauge.values.get(key) || 0;
    }
    
    /**
     * Generate label key
     */
    labelKey(labels) {
        return Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
    }
    
    /**
     * Export metrics in Prometheus format
     */
    exportMetrics() {
        const lines = [];
        
        // Export counters
        for (const [name, counter] of this.metrics.counters) {
            lines.push(`# HELP ${counter.name} ${counter.help}`);
            lines.push(`# TYPE ${counter.name} counter`);
            
            for (const [labels, value] of counter.values) {
                const labelStr = labels ? `{${labels}}` : '';
                lines.push(`${counter.name}${labelStr} ${value}`);
            }
        }
        
        // Export gauges
        for (const [name, gauge] of this.metrics.gauges) {
            lines.push(`# HELP ${gauge.name} ${gauge.help}`);
            lines.push(`# TYPE ${gauge.name} gauge`);
            
            for (const [labels, value] of gauge.values) {
                const labelStr = labels ? `{${labels}}` : '';
                lines.push(`${gauge.name}${labelStr} ${value}`);
            }
        }
        
        // Export histograms
        for (const [name, histogram] of this.metrics.histograms) {
            lines.push(`# HELP ${histogram.name} ${histogram.help}`);
            lines.push(`# TYPE ${histogram.name} histogram`);
            
            for (const [labels, data] of histogram.values) {
                const labelStr = labels ? `{${labels}}` : '';
                
                // Bucket values
                for (let i = 0; i < histogram.buckets.length; i++) {
                    const bucketLabel = labels 
                        ? `{${labels},le="${histogram.buckets[i]}"}`
                        : `{le="${histogram.buckets[i]}"}`;
                    lines.push(`${histogram.name}_bucket${bucketLabel} ${data.buckets[i]}`);
                }
                
                // +Inf bucket
                const infLabel = labels ? `{${labels},le="+Inf"}` : '{le="+Inf"}';
                lines.push(`${histogram.name}_bucket${infLabel} ${data.count}`);
                
                // Sum and count
                lines.push(`${histogram.name}_sum${labelStr} ${data.sum}`);
                lines.push(`${histogram.name}_count${labelStr} ${data.count}`);
            }
        }
        
        return lines.join('\n');
    }
    
    /**
     * HTTP endpoint handler
     */
    handleMetricsRequest(req, res) {
        res.setHeader('Content-Type', 'text/plain; version=0.0.4');
        res.end(this.exportMetrics());
    }
    
    // Track start time
    startTime = Date.now();
}

// Export for use in monitoring
export { MetricsCollector };
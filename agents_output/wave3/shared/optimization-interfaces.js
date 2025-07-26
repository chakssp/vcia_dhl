/**
 * Optimization Interfaces - Shared interfaces for Wave 3 optimization components
 * 
 * These interfaces ensure compatibility between the optimization module
 * and the orchestration system.
 */

/**
 * OptimizedCalculator Interface
 * Extended interface for performance-optimized confidence calculation
 */
export const OptimizedCalculatorInterface = {
    // Core calculation methods (inherited from ConfidenceCalculator)
    calculate: 'function(analysisData) => Promise<ConfidenceMetrics>',
    predictConvergence: 'function(historyData) => ConvergencePrediction',
    optimizeWeights: 'function(feedbackData) => void',
    
    // Optimization-specific methods
    processBatch: 'function(items) => Promise<Array<ConfidenceMetrics>>',
    warmCache: 'function(entries) => Promise<void>',
    cleanup: 'function() => Promise<void>',
    
    // Performance methods
    getPerformanceStats: 'function() => PerformanceStats',
    
    // Configuration
    optimizationConfig: {
        enableWorkers: 'boolean',
        enableCaching: 'boolean',
        enableBatching: 'boolean',
        enableFeatureCaching: 'boolean',
        parallelDimensions: 'boolean',
        vectorizedOperations: 'boolean'
    }
};

/**
 * Performance Stats Interface
 */
export const PerformanceStatsInterface = {
    totalCalculations: 'number',
    avgProcessingTime: 'number',
    avgConfidence: 'number',
    currentWeights: 'object',
    historySize: 'number',
    optimization: {
        cacheHitRate: 'string',
        workerUtilization: 'number',
        memoryUsage: 'number',
        throughput: 'number'
    }
};

/**
 * Cache Entry Interface
 */
export const CacheEntryInterface = {
    key: 'string',
    value: 'any',
    timestamp: 'number',
    accessTime: 'number',
    ttl: 'number',
    size: 'number',
    compressed: 'boolean'
};

/**
 * Worker Task Interface
 */
export const WorkerTaskInterface = {
    id: 'number',
    type: 'string',
    data: 'object',
    priority: 'number',
    createdAt: 'number',
    attempts: 'number'
};

/**
 * Batch Processing Options Interface
 */
export const BatchProcessingOptionsInterface = {
    maxConcurrent: 'number',
    batchSize: 'number',
    timeout: 'number',
    retryAttempts: 'number',
    retryDelay: 'number',
    adaptiveBatching: 'boolean',
    resourceMonitoring: 'boolean',
    progressCallback: 'function(progress) => void'
};

/**
 * Performance Metric Interface
 */
export const PerformanceMetricInterface = {
    component: 'string',
    type: 'string', // 'timing', 'counter', 'gauge', 'error'
    name: 'string',
    value: 'number',
    timestamp: 'number',
    metadata: 'object'
};

/**
 * Optimization Events
 */
export const OptimizationEvents = {
    CACHE_HIT: 'optimization:cache:hit',
    CACHE_MISS: 'optimization:cache:miss',
    CACHE_EVICTION: 'optimization:cache:eviction',
    
    WORKER_READY: 'optimization:worker:ready',
    WORKER_ERROR: 'optimization:worker:error',
    WORKER_TASK_COMPLETE: 'optimization:worker:complete',
    
    BATCH_START: 'optimization:batch:start',
    BATCH_PROGRESS: 'optimization:batch:progress',
    BATCH_COMPLETE: 'optimization:batch:complete',
    
    PERFORMANCE_ALERT: 'optimization:performance:alert',
    PERFORMANCE_METRIC: 'optimization:performance:metric',
    
    MEMORY_PRESSURE: 'optimization:memory:pressure',
    RESOURCE_LIMIT: 'optimization:resource:limit'
};

/**
 * Integration helpers for IterativeOrchestrator
 */
export const OptimizationIntegration = {
    /**
     * Create optimized calculator instance
     */
    createOptimizedCalculator: async () => {
        const { default: OptimizedCalculator } = await import('../optimization/OptimizedCalculator.js');
        return new OptimizedCalculator();
    },
    
    /**
     * Check if optimization is available
     */
    isOptimizationAvailable: () => {
        return typeof Worker !== 'undefined' && 
               navigator.hardwareConcurrency > 1;
    },
    
    /**
     * Get recommended configuration
     */
    getRecommendedConfig: () => {
        const cpuCount = navigator.hardwareConcurrency || 4;
        const memoryAvailable = performance.memory ? 
            performance.memory.jsHeapSizeLimit > 500 * 1024 * 1024 : true;
        
        return {
            workerCount: Math.min(cpuCount, 8),
            maxConcurrent: cpuCount * 5,
            cacheSize: memoryAvailable ? 1000 : 500,
            enableCompression: true,
            adaptiveBatching: true
        };
    }
};
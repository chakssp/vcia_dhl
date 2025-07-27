/**
 * StreamShadowController.js
 * Zero-latency shadow mode with real-time stream comparison and A/B testing
 */

import { EventEmitter } from 'events';
import { StreamComparator } from '../streaming/StreamComparator.js';
import { ABTestManager } from '../utils/ABTestManager.js';
import { StreamMetricsCollector } from '../utils/StreamMetricsCollector.js';
import { CircuitBreaker } from '../utils/CircuitBreaker.js';

export class StreamShadowController extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      enabled: false,
      samplingRate: 0.1,              // 10% sampling
      comparisonWindow: 1000,         // 1 second windows
      divergenceThreshold: 0.05,      // 5% max divergence
      circuitBreakerThreshold: 0.95, // 95% error rate trips breaker
      parallelStreams: 2,             // Traditional + ML
      latencyBudget: 10,              // 10ms max added latency
      ...options
    };
    
    // Stream comparison engine
    this.comparator = new StreamComparator({
      window: this.options.comparisonWindow,
      streams: ['traditional', 'ml']
    });
    
    // A/B test management
    this.abTest = new ABTestManager({
      groups: ['control', 'shadow', 'full'],
      allocation: [0.8, 0.1, 0.1] // 80% control, 10% shadow, 10% full
    });
    
    // Metrics collection
    this.metrics = new StreamMetricsCollector({
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000], // Latency buckets in ms
      percentiles: [0.5, 0.9, 0.95, 0.99]
    });
    
    // Circuit breaker for safety
    this.circuitBreaker = new CircuitBreaker({
      threshold: this.options.circuitBreakerThreshold,
      timeout: 30000, // 30 seconds
      resetTime: 60000 // 1 minute
    });
    
    // Stream processors
    this.processors = new Map();
    
    // Real-time state
    this.activeComparisons = new Map();
    this.streamBuffers = new Map();
  }
  
  /**
   * Initialize shadow controller
   */
  async initialize() {
    // Check feature flags
    await this.loadFeatureFlags();
    
    if (!this.options.enabled) {
      console.log('Shadow mode disabled');
      return;
    }
    
    // Initialize components
    await this.abTest.initialize();
    this.setupStreamProcessors();
    this.attachEventListeners();
    
    // Start monitoring
    this.startMonitoring();
    
    this.emit('shadow.initialized', {
      enabled: true,
      samplingRate: this.options.samplingRate,
      groups: this.abTest.getGroups()
    });
  }
  
  /**
   * Setup parallel stream processors
   */
  setupStreamProcessors() {
    // Traditional processor (existing logic)
    this.processors.set('traditional', {
      process: async (file) => {
        // Simulate traditional analysis
        return {
          type: 'traditional',
          confidence: this.calculateTraditionalScore(file),
          latency: Math.random() * 20 + 10, // 10-30ms
          timestamp: Date.now()
        };
      }
    });
    
    // ML processor (new streaming ML)
    this.processors.set('ml', {
      process: async (file) => {
        const start = performance.now();
        
        // Use streaming ML calculator
        const result = await this.calculateMLScore(file);
        
        return {
          type: 'ml',
          confidence: result.overall,
          dimensions: result.dimensions,
          latency: performance.now() - start,
          timestamp: Date.now()
        };
      }
    });
  }
  
  /**
   * Process file in shadow mode
   */
  async processFile(file) {
    // Determine user group
    const group = this.abTest.getGroup(file.userId || file.id);
    
    switch (group) {
      case 'control':
        // Only traditional processing
        return await this.processTraditional(file);
        
      case 'shadow':
        // Both, but only return traditional
        return await this.processShadow(file);
        
      case 'full':
        // Full ML processing
        return await this.processML(file);
        
      default:
        return await this.processTraditional(file);
    }
  }
  
  /**
   * Process in shadow mode (parallel streams)
   */
  async processShadow(file) {
    const comparisonId = this.generateComparisonId();
    
    // Start comparison
    this.activeComparisons.set(comparisonId, {
      fileId: file.id,
      startTime: Date.now(),
      results: new Map()
    });
    
    // Process in parallel with zero-copy
    const [traditional, ml] = await Promise.all([
      this.processStream('traditional', file, comparisonId),
      this.processStream('ml', file, comparisonId)
    ]);
    
    // Compare results
    await this.compareResults(comparisonId, traditional, ml);
    
    // Clean up
    this.activeComparisons.delete(comparisonId);
    
    // Return only traditional result (shadow mode)
    return traditional;
  }
  
  /**
   * Process single stream
   */
  async processStream(type, file, comparisonId) {
    const processor = this.processors.get(type);
    if (!processor) throw new Error(`Unknown processor: ${type}`);
    
    try {
      // Check circuit breaker
      if (this.circuitBreaker.isOpen()) {
        throw new Error('Circuit breaker open');
      }
      
      // Process with timeout
      const result = await this.withTimeout(
        processor.process(file),
        this.options.latencyBudget
      );
      
      // Record result
      this.recordStreamResult(comparisonId, type, result);
      
      return result;
      
    } catch (error) {
      // Record failure
      this.circuitBreaker.recordFailure();
      this.metrics.recordError(type, error);
      
      throw error;
    }
  }
  
  /**
   * Compare stream results in real-time
   */
  async compareResults(comparisonId, traditional, ml) {
    const comparison = this.activeComparisons.get(comparisonId);
    if (!comparison) return;
    
    // Calculate divergence
    const divergence = Math.abs(traditional.confidence - ml.confidence);
    const agreement = 1 - divergence;
    
    // Record comparison
    const comparisonResult = {
      comparisonId,
      fileId: comparison.fileId,
      traditional: traditional.confidence,
      ml: ml.confidence,
      divergence,
      agreement,
      latencyDiff: ml.latency - traditional.latency,
      timestamp: Date.now()
    };
    
    // Add to comparator for windowed analysis
    this.comparator.addComparison(comparisonResult);
    
    // Record metrics
    this.metrics.recordComparison(comparisonResult);
    
    // Check for high divergence
    if (divergence > this.options.divergenceThreshold) {
      this.handleHighDivergence(comparisonResult);
    }
    
    // Emit comparison event
    this.emit('shadow.comparison', comparisonResult);
  }
  
  /**
   * Handle high divergence cases
   */
  handleHighDivergence(comparison) {
    // Log for analysis
    console.warn('High divergence detected:', comparison);
    
    // Increment counter
    this.metrics.recordDivergence(comparison.divergence);
    
    // Emit alert if pattern detected
    const recentDivergences = this.metrics.getRecentDivergences();
    if (recentDivergences > 10) {
      this.emit('shadow.divergence.alert', {
        count: recentDivergences,
        threshold: this.options.divergenceThreshold,
        recommendation: 'Review ML model parameters'
      });
    }
  }
  
  /**
   * Calculate traditional score (existing logic)
   */
  calculateTraditionalScore(file) {
    // Simulate traditional keyword-based scoring
    const keywords = ['important', 'critical', 'key', 'significant'];
    const content = file.content || '';
    
    let score = 0.5;
    keywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        score += 0.1;
      }
    });
    
    return Math.min(1, score);
  }
  
  /**
   * Calculate ML score using streaming
   */
  async calculateMLScore(file) {
    // In production, use actual ML calculator
    // For demo, simulate streaming ML calculation
    return {
      overall: 0.5 + Math.random() * 0.5,
      dimensions: {
        semantic: Math.random(),
        categorical: Math.random(),
        structural: Math.random(),
        temporal: Math.random()
      }
    };
  }
  
  /**
   * Process with timeout
   */
  async withTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  }
  
  /**
   * Record stream result
   */
  recordStreamResult(comparisonId, type, result) {
    const comparison = this.activeComparisons.get(comparisonId);
    if (!comparison) return;
    
    comparison.results.set(type, result);
    
    // Update metrics
    this.metrics.recordLatency(type, result.latency);
    this.circuitBreaker.recordSuccess();
  }
  
  /**
   * Start monitoring processes
   */
  startMonitoring() {
    // Monitor window statistics
    setInterval(() => {
      const stats = this.comparator.getWindowStats();
      this.emit('shadow.window.stats', stats);
    }, 1000);
    
    // Monitor A/B test performance
    setInterval(() => {
      const performance = this.abTest.getPerformance();
      this.emit('shadow.ab.performance', performance);
    }, 5000);
    
    // Monitor circuit breaker
    this.circuitBreaker.on('open', () => {
      this.emit('shadow.circuit.open', {
        timestamp: Date.now(),
        errorRate: this.circuitBreaker.getErrorRate()
      });
    });
    
    this.circuitBreaker.on('close', () => {
      this.emit('shadow.circuit.close', {
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * Get real-time shadow mode report
   */
  async getReport() {
    const metrics = this.metrics.getSummary();
    const windowStats = this.comparator.getWindowStats();
    const abPerformance = this.abTest.getPerformance();
    
    return {
      enabled: this.options.enabled,
      status: this.circuitBreaker.getState(),
      comparisons: {
        total: metrics.totalComparisons,
        avgDivergence: metrics.avgDivergence,
        maxDivergence: metrics.maxDivergence,
        highDivergenceRate: metrics.highDivergenceRate
      },
      latency: {
        traditional: metrics.latency.traditional,
        ml: metrics.latency.ml,
        overhead: metrics.latency.ml.p50 - metrics.latency.traditional.p50
      },
      windows: windowStats,
      abTest: abPerformance,
      recommendations: this.generateRecommendations(metrics)
    };
  }
  
  /**
   * Generate recommendations based on metrics
   */
  generateRecommendations(metrics) {
    const recommendations = [];
    
    // Check divergence
    if (metrics.avgDivergence < this.options.divergenceThreshold) {
      recommendations.push({
        type: 'promotion',
        confidence: 0.9,
        message: 'ML showing low divergence. Consider increasing shadow traffic.',
        action: 'increase_sampling_rate'
      });
    }
    
    // Check latency
    const latencyOverhead = metrics.latency.ml.p50 - metrics.latency.traditional.p50;
    if (latencyOverhead < 5) {
      recommendations.push({
        type: 'performance',
        confidence: 0.85,
        message: 'ML latency within acceptable range.',
        action: 'maintain_current_settings'
      });
    } else {
      recommendations.push({
        type: 'optimization',
        confidence: 0.8,
        message: 'Consider optimizing ML pipeline for lower latency.',
        action: 'optimize_ml_pipeline'
      });
    }
    
    // Check error rate
    if (metrics.errorRate < 0.01) {
      recommendations.push({
        type: 'stability',
        confidence: 0.95,
        message: 'System stable. Ready for production rollout.',
        action: 'prepare_production_rollout'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Update sampling rate dynamically
   */
  async updateSamplingRate(newRate) {
    this.options.samplingRate = Math.max(0, Math.min(1, newRate));
    
    this.emit('shadow.sampling.updated', {
      oldRate: this.options.samplingRate,
      newRate: newRate,
      timestamp: Date.now()
    });
  }
  
  /**
   * Graduate users from shadow to full ML
   */
  async graduateUsers(percentage) {
    const graduated = await this.abTest.graduateUsers('shadow', 'full', percentage);
    
    this.emit('shadow.users.graduated', {
      count: graduated,
      percentage,
      timestamp: Date.now()
    });
    
    return graduated;
  }
  
  /**
   * Load feature flags
   */
  async loadFeatureFlags() {
    // In production, load from feature flag service
    if (globalThis.KC?.MLFeatureFlags) {
      const flags = await KC.MLFeatureFlags.load();
      this.options.enabled = flags.rollout.strategy === 'shadow';
      this.options.samplingRate = flags.rollout.percentage / 100;
    }
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Listen for analysis requests
    if (globalThis.KC?.EventBus) {
      KC.EventBus.on('analysis:request', async (data) => {
        if (this.shouldProcess(data)) {
          await this.processFile(data.file);
        }
      });
    }
  }
  
  /**
   * Should process based on sampling
   */
  shouldProcess(data) {
    if (!this.options.enabled) return false;
    
    // Use consistent hashing for deterministic sampling
    const hash = this.hashString(data.file.id);
    return (hash % 1000) < (this.options.samplingRate * 1000);
  }
  
  /**
   * Simple string hash
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
  
  /**
   * Generate comparison ID
   */
  generateComparisonId() {
    return `cmp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Process traditional only
   */
  async processTraditional(file) {
    const processor = this.processors.get('traditional');
    return await processor.process(file);
  }
  
  /**
   * Process ML only
   */
  async processML(file) {
    const processor = this.processors.get('ml');
    return await processor.process(file);
  }
  
  /**
   * Get shadow mode metrics
   */
  getMetrics() {
    return {
      enabled: this.options.enabled,
      samplingRate: this.options.samplingRate,
      activeComparisons: this.activeComparisons.size,
      circuitBreakerState: this.circuitBreaker.getState(),
      ...this.metrics.getSummary()
    };
  }
  
  /**
   * Shutdown shadow controller
   */
  async shutdown() {
    // Clear active comparisons
    this.activeComparisons.clear();
    
    // Stop monitoring
    this.comparator.stop();
    this.metrics.stop();
    
    this.emit('shadow.shutdown');
  }
}

export default StreamShadowController;
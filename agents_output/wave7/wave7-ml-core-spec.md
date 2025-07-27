# 📋 Wave 7: ML Core Team Specification
## Feature Branch: `feature/ml-confidence-integration`

### Team Assignment: ML Engineering & Data Science

#### 🎯 Sprint Goal
Migrate ML core components from Waves 1-4 with shadow mode implementation, ensuring < 5% divergence from traditional analysis.

## 📊 Success Metrics (Weeks 2-3)
- [ ] ML running in shadow mode for 10% users
- [ ] Zero production errors
- [ ] < 5% divergence vs traditional analysis
- [ ] 85% convergence rate within 3 iterations
- [ ] Cache hit rate > 80%

## 🛠️ Technical Deliverables

### 1. Confidence Calculator (`js/ml/ConfidenceCalculator.js`)
```javascript
/**
 * Multi-dimensional confidence scoring engine
 * Migrated from Wave 1 with production optimizations
 */
class ConfidenceCalculator {
  constructor() {
    this.algorithms = {
      semantic: new SemanticScorer(),
      categorical: new CategoricalScorer(),
      structural: new StructuralScorer(),
      temporal: new TemporalScorer()
    };
    
    this.weights = {
      semantic: 0.35,
      categorical: 0.30,
      structural: 0.20,
      temporal: 0.15
    };
    
    this.cache = new ConfidenceCache();
    this.validator = new ScoreValidator();
  }
  
  async calculate(file) {
    // Check cache first
    const cached = await this.cache.get(file.id);
    if (cached && !this.isStale(cached)) {
      return cached;
    }
    
    // Calculate dimensions
    const dimensions = await this.calculateDimensions(file);
    
    // Validate scores
    this.validator.validate(dimensions);
    
    // Calculate overall confidence
    const overall = this.calculateWeightedScore(dimensions);
    
    const result = {
      fileId: file.id,
      overall,
      dimensions,
      timestamp: Date.now(),
      version: '7.0.0',
      metadata: {
        algorithm: 'weighted-ensemble',
        weights: this.weights
      }
    };
    
    // Cache result
    await this.cache.set(file.id, result);
    
    // Emit for tracking
    KC.EventBus.emit('ml:confidence:calculated', result);
    
    return result;
  }
  
  async calculateDimensions(file) {
    const dimensions = {};
    
    // Parallel calculation
    const promises = Object.entries(this.algorithms).map(async ([key, scorer]) => {
      try {
        dimensions[key] = await scorer.score(file);
      } catch (error) {
        console.error(`Error in ${key} scorer:`, error);
        dimensions[key] = 0.5; // Neutral fallback
      }
    });
    
    await Promise.all(promises);
    return dimensions;
  }
  
  calculateWeightedScore(dimensions) {
    let sum = 0;
    let totalWeight = 0;
    
    for (const [dimension, score] of Object.entries(dimensions)) {
      const weight = this.weights[dimension] || 0;
      sum += score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? sum / totalWeight : 0.5;
  }
  
  // Dynamic weight optimization
  async optimizeWeights(feedback) {
    const optimizer = new GradientDescentOptimizer({
      learningRate: 0.01,
      iterations: 100
    });
    
    const newWeights = await optimizer.optimize(
      this.weights,
      feedback,
      this.calculateError.bind(this)
    );
    
    // Validate new weights
    if (this.validateWeights(newWeights)) {
      this.weights = newWeights;
      await this.persistWeights();
    }
  }
}

/**
 * Semantic scoring using embeddings
 */
class SemanticScorer {
  async score(file) {
    // Get embeddings from EmbeddingService
    const embedding = await KC.EmbeddingService.generateEmbedding(file.content);
    
    // Compare with category centroids
    const similarities = await this.compareWithCentroids(embedding);
    
    // Calculate semantic coherence
    const coherence = this.calculateCoherence(similarities);
    
    return Math.max(0, Math.min(1, coherence));
  }
  
  async compareWithCentroids(embedding) {
    const centroids = await this.getCategoryCentroids();
    const similarities = {};
    
    for (const [category, centroid] of Object.entries(centroids)) {
      similarities[category] = this.cosineSimilarity(embedding, centroid);
    }
    
    return similarities;
  }
  
  calculateCoherence(similarities) {
    const values = Object.values(similarities);
    if (values.length === 0) return 0.5;
    
    // High coherence = strong match to at least one category
    const maxSimilarity = Math.max(...values);
    const avgSimilarity = values.reduce((a, b) => a + b) / values.length;
    
    // Weighted combination
    return 0.7 * maxSimilarity + 0.3 * avgSimilarity;
  }
}
```

### 2. Confidence Tracker (`js/ml/ConfidenceTracker.js`)
```javascript
/**
 * Tracks confidence evolution and detects convergence
 * Includes IndexedDB persistence
 */
class ConfidenceTracker {
  constructor() {
    this.db = new ConfidenceDB();
    this.history = new Map();
    this.convergenceDetector = new ConvergenceDetector();
    
    this.initialize();
  }
  
  async initialize() {
    await this.db.open();
    await this.loadHistory();
    
    // Listen for confidence updates
    KC.EventBus.on('ml:confidence:calculated', this.track.bind(this));
    KC.EventBus.on('ml:feedback:provided', this.recordFeedback.bind(this));
  }
  
  async track(data) {
    const { fileId, overall, dimensions, timestamp } = data;
    
    // Get or create history
    if (!this.history.has(fileId)) {
      this.history.set(fileId, []);
    }
    
    const fileHistory = this.history.get(fileId);
    
    // Add new entry
    const entry = {
      iteration: fileHistory.length + 1,
      overall,
      dimensions,
      timestamp,
      delta: this.calculateDelta(fileHistory, overall)
    };
    
    fileHistory.push(entry);
    
    // Persist to IndexedDB
    await this.db.saveHistory(fileId, fileHistory);
    
    // Check convergence
    const convergence = this.convergenceDetector.check(fileHistory);
    if (convergence.converged) {
      KC.EventBus.emit('ml:convergence:detected', {
        fileId,
        iterations: convergence.iterations,
        finalConfidence: overall
      });
    }
    
    // Emit update
    KC.EventBus.emit('ml:confidence:updated', {
      fileId,
      current: entry,
      history: fileHistory,
      convergence
    });
  }
  
  calculateDelta(history, currentScore) {
    if (history.length === 0) return 0;
    
    const previousScore = history[history.length - 1].overall;
    return currentScore - previousScore;
  }
  
  async getHistory(fileId) {
    if (this.history.has(fileId)) {
      return this.history.get(fileId);
    }
    
    const stored = await this.db.getHistory(fileId);
    if (stored) {
      this.history.set(fileId, stored);
      return stored;
    }
    
    return [];
  }
  
  async getStats() {
    const stats = {
      totalFiles: this.history.size,
      avgIterations: 0,
      avgConfidence: 0,
      convergenceRate: 0,
      totalIterations: 0
    };
    
    let convergedCount = 0;
    
    for (const [fileId, history] of this.history) {
      const latest = history[history.length - 1];
      if (latest) {
        stats.avgConfidence += latest.overall;
        stats.totalIterations += history.length;
        
        const convergence = this.convergenceDetector.check(history);
        if (convergence.converged) {
          convergedCount++;
        }
      }
    }
    
    if (stats.totalFiles > 0) {
      stats.avgIterations = stats.totalIterations / stats.totalFiles;
      stats.avgConfidence = stats.avgConfidence / stats.totalFiles;
      stats.convergenceRate = convergedCount / stats.totalFiles;
    }
    
    return stats;
  }
}

/**
 * Convergence detection algorithm
 */
class ConvergenceDetector {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.85;
    this.stabilityWindow = options.stabilityWindow || 3;
    this.maxDelta = options.maxDelta || 0.02;
  }
  
  check(history) {
    if (history.length < this.stabilityWindow) {
      return { converged: false, reason: 'insufficient_history' };
    }
    
    // Get recent entries
    const recent = history.slice(-this.stabilityWindow);
    
    // Check if all recent scores meet threshold
    const allAboveThreshold = recent.every(entry => entry.overall >= this.threshold);
    if (!allAboveThreshold) {
      return { converged: false, reason: 'below_threshold' };
    }
    
    // Check stability (small deltas)
    const deltas = recent.map(entry => Math.abs(entry.delta));
    const stable = deltas.every(delta => delta <= this.maxDelta);
    
    if (!stable) {
      return { converged: false, reason: 'unstable' };
    }
    
    return {
      converged: true,
      iterations: history.length,
      finalScore: recent[recent.length - 1].overall,
      confidence: this.calculateConfidence(recent)
    };
  }
  
  calculateConfidence(recent) {
    // How confident are we in the convergence?
    const avgScore = recent.reduce((sum, e) => sum + e.overall, 0) / recent.length;
    const variance = recent.reduce((sum, e) => sum + Math.pow(e.overall - avgScore, 2), 0) / recent.length;
    
    // Lower variance = higher confidence
    return Math.max(0, 1 - (variance * 10));
  }
}
```

### 3. Shadow Mode Controller (`js/ml/ShadowModeController.js`)
```javascript
/**
 * Runs ML calculations in parallel without affecting UI
 * Compares results with traditional analysis
 */
class ShadowModeController {
  constructor() {
    this.enabled = false;
    this.calculator = new ConfidenceCalculator();
    this.tracker = new ConfidenceTracker();
    this.comparator = new AnalysisComparator();
    this.metrics = new ShadowModeMetrics();
  }
  
  async initialize() {
    // Check if user is in shadow mode group
    const flags = await KC.MLFeatureFlags.load();
    this.enabled = flags.components.calculator && 
                  flags.rollout.strategy === 'shadow';
    
    if (this.enabled) {
      this.attachListeners();
      console.log('ML Shadow Mode: Enabled');
    }
  }
  
  attachListeners() {
    // Listen for traditional analysis completion
    KC.EventBus.on('analysis:complete', async (data) => {
      if (!this.shouldProcess(data)) return;
      
      try {
        await this.runShadowAnalysis(data);
      } catch (error) {
        console.error('Shadow analysis error:', error);
        this.metrics.recordError(error);
      }
    });
  }
  
  async runShadowAnalysis(traditionalResult) {
    const startTime = performance.now();
    
    // Run ML calculation
    const mlResult = await this.calculator.calculate(traditionalResult.file);
    
    // Track in background
    this.tracker.track(mlResult);
    
    // Compare results
    const comparison = this.comparator.compare(traditionalResult, mlResult);
    
    // Record metrics
    this.metrics.record({
      fileId: traditionalResult.file.id,
      duration: performance.now() - startTime,
      divergence: comparison.divergence,
      agreement: comparison.agreement,
      timestamp: Date.now()
    });
    
    // Log significant divergences
    if (comparison.divergence > 0.05) {
      console.warn('Shadow Mode: High divergence detected', {
        fileId: traditionalResult.file.id,
        traditional: traditionalResult.confidence,
        ml: mlResult.overall,
        divergence: comparison.divergence
      });
    }
  }
  
  shouldProcess(data) {
    // Sample 10% of files in shadow mode
    const hash = this.hashFileId(data.file.id);
    return (hash % 10) === 0;
  }
  
  async getReport() {
    const metrics = await this.metrics.getSummary();
    
    return {
      enabled: this.enabled,
      filesProcessed: metrics.count,
      avgDivergence: metrics.avgDivergence,
      avgDuration: metrics.avgDuration,
      errorRate: metrics.errorRate,
      recommendations: this.generateRecommendations(metrics)
    };
  }
  
  generateRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.avgDivergence < 0.05) {
      recommendations.push({
        type: 'success',
        message: 'ML analysis shows low divergence. Ready for UI integration.',
        confidence: 0.9
      });
    }
    
    if (metrics.avgDuration > 500) {
      recommendations.push({
        type: 'performance',
        message: 'Consider optimizing ML calculations for better performance.',
        confidence: 0.8
      });
    }
    
    return recommendations;
  }
}

/**
 * Compares ML results with traditional analysis
 */
class AnalysisComparator {
  compare(traditional, ml) {
    // Normalize scores for comparison
    const tradScore = this.normalizeTraditionalScore(traditional);
    const mlScore = ml.overall;
    
    const divergence = Math.abs(tradScore - mlScore);
    const agreement = 1 - divergence;
    
    // Detailed comparison
    const details = {
      traditional: {
        score: tradScore,
        type: traditional.analysisType,
        method: 'keyword-based'
      },
      ml: {
        score: mlScore,
        dimensions: ml.dimensions,
        method: 'multi-dimensional'
      },
      metrics: {
        divergence,
        agreement,
        correlation: this.calculateCorrelation(traditional, ml)
      }
    };
    
    return details;
  }
  
  normalizeTraditionalScore(result) {
    // Convert traditional analysis to 0-1 scale
    const relevance = result.relevanceScore || 50;
    return relevance / 100;
  }
  
  calculateCorrelation(traditional, ml) {
    // Simplified correlation calculation
    // In production, use more sophisticated methods
    const factors = {
      category: traditional.categories?.length > 0 ? 1 : 0,
      confidence: ml.dimensions.categorical || 0
    };
    
    return (factors.category + factors.confidence) / 2;
  }
}
```

### 4. ML Orchestrator (`js/ml/MLOrchestrator.js`)
```javascript
/**
 * Coordinates ML components and manages workflow
 */
class MLOrchestrator {
  constructor() {
    this.state = 'idle';
    this.components = {
      calculator: null,
      tracker: null,
      shadowMode: null,
      optimizer: null
    };
    
    this.queue = new PriorityQueue();
    this.workers = new MLWorkerPool();
  }
  
  async initialize() {
    console.log('Initializing ML Orchestrator...');
    
    // Initialize components based on feature flags
    const flags = await KC.MLFeatureFlags.load();
    
    if (flags.components.calculator) {
      this.components.calculator = new ConfidenceCalculator();
    }
    
    if (flags.components.tracker) {
      this.components.tracker = new ConfidenceTracker();
      await this.components.tracker.initialize();
    }
    
    if (flags.rollout.strategy === 'shadow') {
      this.components.shadowMode = new ShadowModeController();
      await this.components.shadowMode.initialize();
    }
    
    this.attachEventListeners();
    this.state = 'ready';
    
    KC.EventBus.emit('ml:orchestrator:ready');
  }
  
  attachEventListeners() {
    // File analysis requests
    KC.EventBus.on('ml:analyze:request', this.handleAnalysisRequest.bind(this));
    
    // Batch processing
    KC.EventBus.on('ml:batch:request', this.handleBatchRequest.bind(this));
    
    // Optimization triggers
    KC.EventBus.on('ml:optimize:request', this.handleOptimizationRequest.bind(this));
  }
  
  async handleAnalysisRequest(request) {
    if (this.state !== 'ready') {
      console.warn('ML Orchestrator not ready');
      return;
    }
    
    // Add to priority queue
    this.queue.enqueue(request, request.priority || 5);
    
    // Process queue
    this.processQueue();
  }
  
  async processQueue() {
    if (this.state === 'processing') return;
    
    this.state = 'processing';
    
    while (!this.queue.isEmpty()) {
      const request = this.queue.dequeue();
      
      try {
        const result = await this.processRequest(request);
        KC.EventBus.emit('ml:analyze:complete', result);
      } catch (error) {
        console.error('ML processing error:', error);
        KC.EventBus.emit('ml:analyze:error', { request, error });
      }
    }
    
    this.state = 'ready';
  }
  
  async processRequest(request) {
    const { file, options } = request;
    
    // Calculate confidence
    const confidence = await this.components.calculator.calculate(file);
    
    // Track if enabled
    if (this.components.tracker) {
      await this.components.tracker.track(confidence);
    }
    
    // Check for convergence
    const history = await this.components.tracker?.getHistory(file.id);
    const convergence = history ? 
      new ConvergenceDetector().check(history) : 
      { converged: false };
    
    return {
      fileId: file.id,
      confidence,
      convergence,
      history,
      timestamp: Date.now()
    };
  }
}
```

## 📝 Testing Requirements

### 1. Unit Tests (`test/ml/core.test.js`)
```javascript
describe('ML Core Components', () => {
  describe('ConfidenceCalculator', () => {
    it('should calculate multi-dimensional scores', async () => {
      const calculator = new ConfidenceCalculator();
      const file = createMockFile();
      
      const result = await calculator.calculate(file);
      
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(1);
      expect(result.dimensions).toHaveProperty('semantic');
      expect(result.dimensions).toHaveProperty('categorical');
    });
    
    it('should use cache for repeated calculations', async () => {
      const calculator = new ConfidenceCalculator();
      const file = createMockFile();
      
      const result1 = await calculator.calculate(file);
      const result2 = await calculator.calculate(file);
      
      expect(result2.timestamp).toBe(result1.timestamp); // Same cached result
    });
  });
  
  describe('ConvergenceDetector', () => {
    it('should detect convergence correctly', () => {
      const detector = new ConvergenceDetector();
      const history = [
        { overall: 0.82, delta: 0.10 },
        { overall: 0.85, delta: 0.03 },
        { overall: 0.86, delta: 0.01 },
        { overall: 0.86, delta: 0.00 }
      ];
      
      const result = detector.check(history);
      expect(result.converged).toBe(true);
    });
  });
  
  describe('ShadowModeController', () => {
    it('should not affect UI in shadow mode', async () => {
      const controller = new ShadowModeController();
      controller.enabled = true;
      
      const uiSpy = jest.spyOn(KC.FileRenderer, 'updateConfidence');
      
      await controller.runShadowAnalysis(mockAnalysis);
      
      expect(uiSpy).not.toHaveBeenCalled();
    });
  });
});
```

### 2. Performance Tests
```javascript
describe('ML Performance', () => {
  it('should process 100 files in < 2 seconds', async () => {
    const orchestrator = new MLOrchestrator();
    await orchestrator.initialize();
    
    const files = Array(100).fill(null).map(() => createMockFile());
    const start = performance.now();
    
    await orchestrator.processBatch(files);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});
```

## 🚀 Migration Checklist

### Pre-migration
- [ ] Review Wave 1-4 implementations
- [ ] Update algorithms for production scale
- [ ] Implement proper error handling
- [ ] Add comprehensive logging

### Migration Steps
1. Port ConfidenceCalculator with optimizations
2. Implement IndexedDB persistence for tracker
3. Create shadow mode controller
4. Test with sample data
5. Enable for 10% of users

### Validation
- [ ] Shadow mode showing < 5% divergence
- [ ] Convergence achieved in 3-5 iterations
- [ ] No performance degradation
- [ ] Cache working effectively

## 🔍 Monitoring Points

### Key Metrics
```javascript
// Prometheus metrics to track
ml_confidence_calculations_total
ml_convergence_rate
ml_shadow_mode_divergence
ml_cache_hit_rate
ml_calculation_duration_seconds
```

### Alert Thresholds
- Divergence > 10%: Investigation required
- Convergence rate < 70%: Algorithm tuning needed
- Cache hit rate < 60%: Cache optimization required

---

**Team Contact**: @ml-engineering-team
**Review Required By**: ML Lead + Tech Lead
**Deadline**: End of Week 3
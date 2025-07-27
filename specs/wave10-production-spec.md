# 📋 Wave 10: Full Production Team Specification
## Feature Branch: `feature/ml-confidence-integration`

### Team Assignment: DevOps & Production Engineering

#### 🎯 Sprint Goal
Deploy ML Confidence system to 100% of users with canary rollout, comprehensive monitoring, and automated rollback capabilities.

## 📊 Success Metrics (Week 7)
- [ ] 100% feature availability with zero downtime
- [ ] Error rate < 0.1% across all components  
- [ ] P95 response time < 1s under load
- [ ] Rollback capability < 5 minutes
- [ ] User satisfaction score > 4.5/5

## 🛠️ Technical Deliverables

### 1. Canary Deployment Controller (`js/ml/CanaryController.js`)
```javascript
/**
 * Manages progressive rollout with automated health checks
 * Implements circuit breaker pattern for safety
 */
class CanaryController {
  constructor() {
    this.phases = [
      { percentage: 1, duration: '1h', name: 'smoke' },
      { percentage: 5, duration: '2h', name: 'canary' },
      { percentage: 10, duration: '4h', name: 'early-adopters' },
      { percentage: 25, duration: '12h', name: 'quarter' },
      { percentage: 50, duration: '24h', name: 'half' },
      { percentage: 100, duration: 'permanent', name: 'full' }
    ];
    
    this.currentPhase = 0;
    this.startTime = null;
    this.metrics = new RolloutMetrics();
    this.circuitBreaker = new CircuitBreaker();
  }
  
  async initialize() {
    // Load current rollout state
    const state = await this.loadState();
    if (state) {
      this.currentPhase = state.phase;
      this.startTime = state.startTime;
    }
    
    // Start health monitoring
    this.startHealthChecks();
    
    // Setup automated progression
    this.scheduleNextPhase();
    
    console.log(`Canary Controller initialized at phase: ${this.phases[this.currentPhase].name}`);
  }
  
  async progressToNextPhase() {
    const currentPhaseConfig = this.phases[this.currentPhase];
    
    // Validate health before progression
    const healthCheck = await this.validateHealth();
    if (!healthCheck.passed) {
      console.error('Health check failed, halting progression', healthCheck);
      await this.handleFailedProgression(healthCheck);
      return false;
    }
    
    // Check circuit breaker
    if (this.circuitBreaker.isOpen()) {
      console.error('Circuit breaker is open, halting progression');
      return false;
    }
    
    // Progress to next phase
    this.currentPhase++;
    if (this.currentPhase >= this.phases.length) {
      console.log('Rollout complete!');
      return true;
    }
    
    const nextPhase = this.phases[this.currentPhase];
    console.log(`Progressing to phase: ${nextPhase.name} (${nextPhase.percentage}%)`);
    
    // Update feature flags
    await this.updateFeatureFlags(nextPhase.percentage);
    
    // Save state
    await this.saveState();
    
    // Schedule next progression
    this.scheduleNextPhase();
    
    // Notify stakeholders
    this.notifyProgression(nextPhase);
    
    return true;
  }
  
  async validateHealth() {
    const checks = {
      errorRate: await this.checkErrorRate(),
      performance: await this.checkPerformance(),
      userFeedback: await this.checkUserFeedback(),
      systemHealth: await this.checkSystemHealth()
    };
    
    const passed = Object.values(checks).every(check => check.passed);
    
    return {
      passed,
      checks,
      timestamp: Date.now()
    };
  }
  
  async checkErrorRate() {
    const errorRate = await this.metrics.getErrorRate();
    const threshold = 0.001; // 0.1%
    
    return {
      passed: errorRate < threshold,
      value: errorRate,
      threshold,
      metric: 'error_rate'
    };
  }
  
  async checkPerformance() {
    const p95 = await this.metrics.getP95ResponseTime();
    const threshold = 1000; // 1s
    
    return {
      passed: p95 < threshold,
      value: p95,
      threshold,
      metric: 'p95_response_time'
    };
  }
  
  async checkUserFeedback() {
    const feedback = await this.metrics.getUserSatisfaction();
    const threshold = 4.0; // out of 5
    
    return {
      passed: feedback.score >= threshold,
      value: feedback.score,
      threshold,
      metric: 'user_satisfaction',
      sampleSize: feedback.count
    };
  }
  
  async checkSystemHealth() {
    const health = await this.metrics.getSystemHealth();
    
    return {
      passed: health.cpu < 80 && health.memory < 80,
      value: health,
      threshold: { cpu: 80, memory: 80 },
      metric: 'system_health'
    };
  }
  
  async handleFailedProgression(healthCheck) {
    // Log detailed failure
    console.error('Canary progression failed:', JSON.stringify(healthCheck, null, 2));
    
    // Trigger alerts
    await this.alertOncall({
      severity: 'high',
      title: 'Canary Progression Failed',
      details: healthCheck,
      runbook: 'https://docs.example.com/ml-canary-runbook'
    });
    
    // Auto-rollback if critical
    const criticalFailure = healthCheck.checks.errorRate.value > 0.01 ||
                           healthCheck.checks.performance.value > 5000;
    
    if (criticalFailure) {
      await this.emergencyRollback();
    }
  }
  
  async emergencyRollback() {
    console.error('EMERGENCY ROLLBACK INITIATED');
    
    // Disable all ML features immediately
    await KC.MLFeatureFlags.disableAll();
    
    // Revert to previous phase
    this.currentPhase = Math.max(0, this.currentPhase - 1);
    const safePercentage = this.currentPhase === 0 ? 0 : this.phases[this.currentPhase - 1].percentage;
    
    await this.updateFeatureFlags(safePercentage);
    
    // Open circuit breaker
    this.circuitBreaker.open();
    
    // Notify stakeholders
    await this.notifyRollback({
      from: this.phases[this.currentPhase].name,
      to: safePercentage === 0 ? 'disabled' : this.phases[this.currentPhase - 1].name,
      reason: 'Automated rollback due to health check failure'
    });
    
    // Create incident
    await this.createIncident({
      title: 'ML Canary Rollback',
      severity: 'P1',
      autoResolved: false
    });
  }
  
  async updateFeatureFlags(percentage) {
    const flags = {
      enabled: percentage > 0,
      rollout: {
        percentage,
        strategy: 'canary',
        phase: this.phases[this.currentPhase].name
      },
      components: {
        calculator: percentage > 0,
        tracker: percentage > 0,
        orchestrator: percentage > 0,
        ui: {
          badges: percentage >= 5,
          dashboard: percentage >= 10,
          curationPanel: percentage >= 25
        }
      }
    };
    
    await KC.MLFeatureFlags.update(flags);
  }
  
  scheduleNextPhase() {
    const currentPhaseConfig = this.phases[this.currentPhase];
    if (currentPhaseConfig.duration === 'permanent') return;
    
    const duration = this.parseDuration(currentPhaseConfig.duration);
    
    setTimeout(() => {
      this.progressToNextPhase();
    }, duration);
  }
  
  parseDuration(duration) {
    const match = duration.match(/(\d+)([hd])/);
    if (!match) return 3600000; // 1 hour default
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return unit === 'h' ? value * 3600000 : value * 86400000;
  }
}

/**
 * Circuit breaker for automatic failure protection
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.state = 'closed'; // closed, open, half-open
    this.failures = 0;
    this.lastFailure = null;
  }
  
  recordSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.open();
    }
  }
  
  open() {
    this.state = 'open';
    console.error('Circuit breaker opened');
    
    // Schedule half-open attempt
    setTimeout(() => {
      this.state = 'half-open';
    }, this.resetTimeout);
  }
  
  isOpen() {
    return this.state === 'open';
  }
  
  canAttempt() {
    return this.state !== 'open';
  }
}
```

### 2. Production Monitoring Dashboard (`js/ml/ProductionMonitor.js`)
```javascript
/**
 * Real-time production monitoring with alerting
 */
class ProductionMonitor {
  constructor() {
    this.metrics = {};
    this.alerts = [];
    this.dashboardUrl = '/ml-dashboard';
    
    this.collectors = {
      performance: new PerformanceCollector(),
      errors: new ErrorCollector(),
      usage: new UsageCollector(),
      quality: new QualityCollector()
    };
    
    this.alertManager = new AlertManager();
  }
  
  async initialize() {
    // Start all collectors
    await Promise.all(
      Object.values(this.collectors).map(c => c.start())
    );
    
    // Setup real-time updates
    this.startRealtimeUpdates();
    
    // Initialize dashboard
    this.initializeDashboard();
    
    console.log('Production monitoring initialized');
  }
  
  startRealtimeUpdates() {
    // Collect metrics every second
    setInterval(() => {
      this.collectMetrics();
    }, 1000);
    
    // Check alerts every 10 seconds
    setInterval(() => {
      this.checkAlerts();
    }, 10000);
    
    // Push to monitoring service every minute
    setInterval(() => {
      this.pushToMonitoring();
    }, 60000);
  }
  
  async collectMetrics() {
    const timestamp = Date.now();
    
    this.metrics = {
      timestamp,
      performance: await this.collectors.performance.collect(),
      errors: await this.collectors.errors.collect(),
      usage: await this.collectors.usage.collect(),
      quality: await this.collectors.quality.collect()
    };
    
    // Emit for real-time dashboard
    KC.EventBus.emit('production:metrics:updated', this.metrics);
  }
  
  async checkAlerts() {
    const alertRules = [
      {
        name: 'High Error Rate',
        condition: () => this.metrics.errors.rate > 0.001,
        severity: 'critical',
        message: () => `Error rate: ${(this.metrics.errors.rate * 100).toFixed(3)}%`
      },
      {
        name: 'Slow Response Time',
        condition: () => this.metrics.performance.p95 > 2000,
        severity: 'warning',
        message: () => `P95 response time: ${this.metrics.performance.p95}ms`
      },
      {
        name: 'Low Confidence Quality',
        condition: () => this.metrics.quality.avgConfidence < 0.7,
        severity: 'warning',
        message: () => `Average confidence: ${(this.metrics.quality.avgConfidence * 100).toFixed(1)}%`
      },
      {
        name: 'Memory Pressure',
        condition: () => this.metrics.performance.memoryUsage > 150,
        severity: 'warning',
        message: () => `Memory usage: ${this.metrics.performance.memoryUsage}MB`
      }
    ];
    
    for (const rule of alertRules) {
      if (rule.condition()) {
        await this.alertManager.trigger({
          name: rule.name,
          severity: rule.severity,
          message: rule.message(),
          metrics: this.metrics,
          timestamp: Date.now()
        });
      }
    }
  }
  
  async pushToMonitoring() {
    try {
      // Push to Prometheus
      await fetch('/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.formatForPrometheus())
      });
      
      // Push to custom analytics
      await fetch('/api/ml/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.metrics)
      });
    } catch (error) {
      console.error('Failed to push metrics:', error);
    }
  }
  
  formatForPrometheus() {
    const lines = [];
    
    // Performance metrics
    lines.push(`ml_response_time_p95 ${this.metrics.performance.p95}`);
    lines.push(`ml_response_time_p99 ${this.metrics.performance.p99}`);
    lines.push(`ml_memory_usage_mb ${this.metrics.performance.memoryUsage}`);
    
    // Error metrics
    lines.push(`ml_error_rate ${this.metrics.errors.rate}`);
    lines.push(`ml_error_total ${this.metrics.errors.total}`);
    
    // Usage metrics
    lines.push(`ml_active_users ${this.metrics.usage.activeUsers}`);
    lines.push(`ml_files_processed ${this.metrics.usage.filesProcessed}`);
    
    // Quality metrics
    lines.push(`ml_avg_confidence ${this.metrics.quality.avgConfidence}`);
    lines.push(`ml_convergence_rate ${this.metrics.quality.convergenceRate}`);
    
    return lines.join('\n');
  }
  
  getDashboardData() {
    return {
      metrics: this.metrics,
      alerts: this.alerts,
      status: this.getSystemStatus(),
      recommendations: this.getRecommendations()
    };
  }
  
  getSystemStatus() {
    if (this.metrics.errors?.rate > 0.01) return 'critical';
    if (this.metrics.performance?.p95 > 3000) return 'degraded';
    if (this.metrics.quality?.avgConfidence < 0.6) return 'warning';
    return 'healthy';
  }
  
  getRecommendations() {
    const recommendations = [];
    
    if (this.metrics.performance?.memoryUsage > 120) {
      recommendations.push({
        type: 'performance',
        action: 'Consider increasing cache eviction rate',
        priority: 'medium'
      });
    }
    
    if (this.metrics.quality?.convergenceRate < 0.7) {
      recommendations.push({
        type: 'quality',
        action: 'Review ML algorithm parameters',
        priority: 'low'
      });
    }
    
    return recommendations;
  }
}

/**
 * Performance metrics collector
 */
class PerformanceCollector {
  constructor() {
    this.samples = {
      responseTime: [],
      memory: [],
      cpu: []
    };
  }
  
  async start() {
    // Hook into ML events
    KC.EventBus.on('ml:calculation:complete', (event) => {
      this.samples.responseTime.push(event.duration);
      this.trimSamples();
    });
    
    // Monitor memory
    setInterval(() => {
      if (performance.memory) {
        this.samples.memory.push(performance.memory.usedJSHeapSize / 1024 / 1024);
        this.trimSamples();
      }
    }, 1000);
  }
  
  async collect() {
    return {
      p50: this.percentile(this.samples.responseTime, 50),
      p95: this.percentile(this.samples.responseTime, 95),
      p99: this.percentile(this.samples.responseTime, 99),
      memoryUsage: this.average(this.samples.memory),
      throughput: this.samples.responseTime.length // per second
    };
  }
  
  percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p / 100) - 1;
    return sorted[index] || 0;
  }
  
  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b) / arr.length;
  }
  
  trimSamples() {
    // Keep only last 1000 samples
    Object.keys(this.samples).forEach(key => {
      if (this.samples[key].length > 1000) {
        this.samples[key] = this.samples[key].slice(-1000);
      }
    });
  }
}
```

### 3. Rollback System (`js/ml/RollbackManager.js`)
```javascript
/**
 * Automated and manual rollback capabilities
 */
class RollbackManager {
  constructor() {
    this.snapshots = [];
    this.maxSnapshots = 10;
    this.rollbackInProgress = false;
  }
  
  async createSnapshot(reason) {
    const snapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      reason,
      state: {
        featureFlags: await KC.MLFeatureFlags.export(),
        appState: await KC.AppState.mlSnapshot(),
        metrics: await this.captureMetrics()
      }
    };
    
    this.snapshots.push(snapshot);
    
    // Maintain snapshot limit
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
    
    // Persist to storage
    await this.persistSnapshot(snapshot);
    
    console.log(`Snapshot created: ${reason}`);
    return snapshot.id;
  }
  
  async rollback(snapshotId, reason) {
    if (this.rollbackInProgress) {
      throw new Error('Rollback already in progress');
    }
    
    this.rollbackInProgress = true;
    
    try {
      const snapshot = this.snapshots.find(s => s.id === snapshotId);
      if (!snapshot) {
        throw new Error(`Snapshot ${snapshotId} not found`);
      }
      
      console.log(`Starting rollback to snapshot: ${snapshotId}`);
      
      // Create pre-rollback snapshot
      await this.createSnapshot('pre-rollback');
      
      // Disable ML features first
      await KC.MLFeatureFlags.disableAll();
      
      // Wait for in-flight operations
      await this.waitForQuiescence();
      
      // Restore state
      await this.restoreSnapshot(snapshot);
      
      // Verify restoration
      const verified = await this.verifyRollback(snapshot);
      if (!verified) {
        throw new Error('Rollback verification failed');
      }
      
      // Log rollback
      await this.logRollback({
        snapshotId,
        reason,
        timestamp: Date.now(),
        success: true
      });
      
      console.log('Rollback completed successfully');
      
    } catch (error) {
      console.error('Rollback failed:', error);
      
      // Attempt emergency recovery
      await this.emergencyRecovery();
      
      throw error;
      
    } finally {
      this.rollbackInProgress = false;
    }
  }
  
  async waitForQuiescence() {
    // Wait for all ML operations to complete
    const timeout = 30000; // 30 seconds
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const pending = await this.getPendingOperations();
      if (pending === 0) break;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  async restoreSnapshot(snapshot) {
    // Restore feature flags
    await KC.MLFeatureFlags.import(snapshot.state.featureFlags);
    
    // Restore app state
    await KC.AppState.mlRestore(snapshot.state.appState);
    
    // Clear caches
    await this.clearMLCaches();
    
    // Restart ML services
    await this.restartMLServices();
  }
  
  async verifyRollback(snapshot) {
    // Verify feature flags match
    const currentFlags = await KC.MLFeatureFlags.export();
    const flagsMatch = JSON.stringify(currentFlags) === 
                      JSON.stringify(snapshot.state.featureFlags);
    
    // Verify no ML activity
    const mlActive = await this.checkMLActivity();
    
    return flagsMatch && !mlActive;
  }
  
  async emergencyRecovery() {
    console.error('EMERGENCY RECOVERY INITIATED');
    
    try {
      // Disable all ML features at the lowest level
      window.ML_EMERGENCY_DISABLE = true;
      
      // Clear all ML state
      KC.AppState.ml = {};
      
      // Reset feature flags to safe defaults
      await KC.MLFeatureFlags.reset();
      
      // Clear all caches
      await this.clearAllCaches();
      
      // Reload the application
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Emergency recovery failed:', error);
      // Last resort: alert user
      alert('Critical error. Please refresh the page.');
    }
  }
  
  async clearMLCaches() {
    // Clear memory caches
    if (KC.ML?.cacheManager) {
      await KC.ML.cacheManager.clear();
    }
    
    // Clear IndexedDB
    const databases = ['ml-confidence-cache', 'ml-embeddings'];
    for (const db of databases) {
      await this.deleteDatabase(db);
    }
    
    // Clear worker caches
    if (KC.ML?.workerPool) {
      KC.ML.workerPool.terminate();
    }
  }
  
  async deleteDatabase(name) {
    return new Promise((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase(name);
      deleteReq.onsuccess = resolve;
      deleteReq.onerror = reject;
    });
  }
}
```

### 4. A/B Testing Framework (`js/ml/ABTestingFramework.js`)
```javascript
/**
 * A/B testing for ML features with statistical analysis
 */
class ABTestingFramework {
  constructor() {
    this.experiments = new Map();
    this.analytics = new ExperimentAnalytics();
  }
  
  createExperiment(config) {
    const experiment = {
      id: config.id || crypto.randomUUID(),
      name: config.name,
      hypothesis: config.hypothesis,
      variants: config.variants,
      allocation: config.allocation || 'random',
      metrics: config.metrics,
      startDate: Date.now(),
      endDate: config.duration ? Date.now() + config.duration : null,
      status: 'active'
    };
    
    this.experiments.set(experiment.id, experiment);
    
    // Initialize tracking
    this.initializeTracking(experiment);
    
    return experiment;
  }
  
  assignVariant(experimentId, userId) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'active') {
      return 'control';
    }
    
    // Check if user already assigned
    const existing = this.getUserVariant(experimentId, userId);
    if (existing) return existing;
    
    // Assign based on allocation strategy
    let variant;
    if (experiment.allocation === 'random') {
      variant = this.randomAssignment(experiment, userId);
    } else if (experiment.allocation === 'deterministic') {
      variant = this.deterministicAssignment(experiment, userId);
    }
    
    // Store assignment
    this.storeAssignment(experimentId, userId, variant);
    
    // Track assignment
    this.analytics.trackAssignment(experimentId, userId, variant);
    
    return variant;
  }
  
  randomAssignment(experiment, userId) {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const variant of experiment.variants) {
      cumulative += variant.allocation;
      if (rand < cumulative) {
        return variant.id;
      }
    }
    
    return 'control';
  }
  
  deterministicAssignment(experiment, userId) {
    // Hash user ID for consistent assignment
    const hash = this.hashString(userId + experiment.id);
    const normalized = hash / 0xFFFFFFFF;
    
    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.allocation;
      if (normalized < cumulative) {
        return variant.id;
      }
    }
    
    return 'control';
  }
  
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  trackMetric(experimentId, userId, metric, value) {
    const variant = this.getUserVariant(experimentId, userId);
    if (!variant) return;
    
    this.analytics.trackMetric({
      experimentId,
      userId,
      variant,
      metric,
      value,
      timestamp: Date.now()
    });
  }
  
  async getResults(experimentId) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;
    
    const results = await this.analytics.calculateResults(experimentId);
    
    return {
      experiment,
      results,
      recommendations: this.generateRecommendations(results)
    };
  }
  
  generateRecommendations(results) {
    const recommendations = [];
    
    // Check statistical significance
    if (results.pValue < 0.05) {
      recommendations.push({
        type: 'significant',
        message: `Results are statistically significant (p=${results.pValue.toFixed(3)})`
      });
      
      // Check effect size
      if (results.effectSize > 0.2) {
        recommendations.push({
          type: 'launch',
          message: `Strong positive effect detected. Consider launching variant ${results.winner}`
        });
      }
    } else {
      recommendations.push({
        type: 'continue',
        message: 'Continue experiment to gather more data'
      });
    }
    
    // Check for negative effects
    if (results.variants.some(v => v.metrics.errorRate > 0.01)) {
      recommendations.push({
        type: 'warning',
        message: 'High error rate detected in some variants'
      });
    }
    
    return recommendations;
  }
}

/**
 * Statistical analysis for experiments
 */
class ExperimentAnalytics {
  async calculateResults(experimentId) {
    const data = await this.loadExperimentData(experimentId);
    
    // Group by variant
    const variants = this.groupByVariant(data);
    
    // Calculate metrics for each variant
    const variantMetrics = variants.map(variant => ({
      id: variant.id,
      users: variant.users.length,
      metrics: this.calculateVariantMetrics(variant)
    }));
    
    // Statistical analysis
    const stats = this.performStatisticalAnalysis(variantMetrics);
    
    return {
      variants: variantMetrics,
      ...stats
    };
  }
  
  calculateVariantMetrics(variant) {
    return {
      conversionRate: this.calculateConversionRate(variant),
      avgConfidence: this.calculateAverage(variant.data, 'confidence'),
      errorRate: this.calculateErrorRate(variant),
      engagement: this.calculateEngagement(variant)
    };
  }
  
  performStatisticalAnalysis(variants) {
    // Assuming binary outcome for simplicity
    const control = variants.find(v => v.id === 'control');
    const treatment = variants.find(v => v.id === 'treatment');
    
    if (!control || !treatment) {
      return { error: 'Missing control or treatment group' };
    }
    
    // Chi-square test for conversion rate
    const chiSquare = this.chiSquareTest(
      control.metrics.conversionRate * control.users,
      control.users,
      treatment.metrics.conversionRate * treatment.users,
      treatment.users
    );
    
    // Effect size (Cohen's d)
    const effectSize = this.calculateEffectSize(
      control.metrics.avgConfidence,
      treatment.metrics.avgConfidence,
      // Simplified: assume equal variance
      0.1
    );
    
    return {
      pValue: chiSquare.pValue,
      effectSize,
      winner: treatment.metrics.conversionRate > control.metrics.conversionRate ? 
              'treatment' : 'control',
      confidence: 1 - chiSquare.pValue
    };
  }
  
  chiSquareTest(successA, totalA, successB, totalB) {
    // Simplified chi-square test
    const pooledProbability = (successA + successB) / (totalA + totalB);
    const expectedA = totalA * pooledProbability;
    const expectedB = totalB * pooledProbability;
    
    const chiSquare = 
      Math.pow(successA - expectedA, 2) / expectedA +
      Math.pow(successB - expectedB, 2) / expectedB;
    
    // Approximate p-value (would use proper distribution in production)
    const pValue = Math.exp(-chiSquare / 2);
    
    return { chiSquare, pValue };
  }
  
  calculateEffectSize(meanA, meanB, pooledStdDev) {
    return Math.abs(meanA - meanB) / pooledStdDev;
  }
}
```

### 5. Production Checklist Implementation (`js/ml/ProductionChecklist.js`)
```javascript
/**
 * Automated production readiness checklist
 */
class ProductionChecklist {
  constructor() {
    this.checks = [
      // Technical checks
      { id: 'tests', name: 'All tests passing', type: 'automated' },
      { id: 'coverage', name: 'Code coverage > 80%', type: 'automated' },
      { id: 'performance', name: 'Performance benchmarks met', type: 'automated' },
      { id: 'security', name: 'Security scan passed', type: 'automated' },
      
      // Operational checks
      { id: 'monitoring', name: 'Monitoring dashboard active', type: 'manual' },
      { id: 'alerts', name: 'Alert rules configured', type: 'manual' },
      { id: 'runbooks', name: 'Runbooks updated', type: 'manual' },
      { id: 'rollback', name: 'Rollback tested', type: 'manual' },
      
      // Documentation checks
      { id: 'api-docs', name: 'API documentation complete', type: 'automated' },
      { id: 'user-guide', name: 'User guide updated', type: 'manual' },
      { id: 'changelog', name: 'Changelog updated', type: 'automated' },
      
      // Stakeholder checks
      { id: 'qa-signoff', name: 'QA team sign-off', type: 'manual' },
      { id: 'product-signoff', name: 'Product team sign-off', type: 'manual' },
      { id: 'security-review', name: 'Security review complete', type: 'manual' }
    ];
    
    this.results = new Map();
  }
  
  async runChecklist() {
    console.log('Running production checklist...');
    
    for (const check of this.checks) {
      if (check.type === 'automated') {
        await this.runAutomatedCheck(check);
      } else {
        await this.promptManualCheck(check);
      }
    }
    
    return this.generateReport();
  }
  
  async runAutomatedCheck(check) {
    let result = { passed: false, details: '' };
    
    switch (check.id) {
      case 'tests':
        result = await this.checkTests();
        break;
      case 'coverage':
        result = await this.checkCoverage();
        break;
      case 'performance':
        result = await this.checkPerformance();
        break;
      case 'security':
        result = await this.checkSecurity();
        break;
      case 'api-docs':
        result = await this.checkAPIDocs();
        break;
      case 'changelog':
        result = await this.checkChangelog();
        break;
    }
    
    this.results.set(check.id, result);
  }
  
  async checkTests() {
    try {
      const response = await fetch('/api/ci/test-results');
      const data = await response.json();
      
      return {
        passed: data.failed === 0,
        details: `${data.passed} passed, ${data.failed} failed`
      };
    } catch (error) {
      return {
        passed: false,
        details: `Error checking tests: ${error.message}`
      };
    }
  }
  
  async checkCoverage() {
    try {
      const response = await fetch('/api/ci/coverage');
      const data = await response.json();
      
      return {
        passed: data.percentage >= 80,
        details: `Coverage: ${data.percentage}%`
      };
    } catch (error) {
      return {
        passed: false,
        details: `Error checking coverage: ${error.message}`
      };
    }
  }
  
  generateReport() {
    const report = {
      timestamp: Date.now(),
      checks: [],
      passed: true,
      blockers: []
    };
    
    for (const check of this.checks) {
      const result = this.results.get(check.id);
      
      report.checks.push({
        ...check,
        ...result
      });
      
      if (!result.passed) {
        report.passed = false;
        report.blockers.push(check.name);
      }
    }
    
    return report;
  }
}
```

## 📝 Testing Requirements

### 1. Integration Tests (`test/ml/production.test.js`)
```javascript
describe('Production Deployment', () => {
  describe('Canary Controller', () => {
    it('should progress through phases safely', async () => {
      const controller = new CanaryController();
      await controller.initialize();
      
      // Mock healthy metrics
      controller.metrics.getErrorRate = jest.fn().mockResolvedValue(0.0001);
      controller.metrics.getP95ResponseTime = jest.fn().mockResolvedValue(500);
      
      const progressed = await controller.progressToNextPhase();
      expect(progressed).toBe(true);
    });
    
    it('should rollback on health check failure', async () => {
      const controller = new CanaryController();
      await controller.initialize();
      
      // Mock unhealthy metrics
      controller.metrics.getErrorRate = jest.fn().mockResolvedValue(0.02);
      
      const progressed = await controller.progressToNextPhase();
      expect(progressed).toBe(false);
      
      // Verify rollback was triggered
      expect(KC.MLFeatureFlags.isEnabled('calculator')).toBe(false);
    });
  });
  
  describe('Rollback System', () => {
    it('should create and restore snapshots', async () => {
      const rollback = new RollbackManager();
      
      // Create snapshot
      const snapshotId = await rollback.createSnapshot('test');
      expect(snapshotId).toBeDefined();
      
      // Modify state
      KC.MLFeatureFlags.toggle('ui.badges', true);
      
      // Rollback
      await rollback.rollback(snapshotId, 'test rollback');
      
      // Verify restoration
      expect(KC.MLFeatureFlags.isEnabled('ui.badges')).toBe(false);
    });
  });
});
```

### 2. Smoke Tests (`test/ml/smoke.test.js`)
```javascript
describe('Production Smoke Tests', () => {
  it('should load without errors', async () => {
    await KC.initialize();
    expect(KC.ML).toBeDefined();
    expect(KC.MLFeatureFlags).toBeDefined();
  });
  
  it('should handle 10 concurrent calculations', async () => {
    const files = generateMockFiles(10);
    const promises = files.map(f => KC.ML.calculate(f));
    
    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);
    expect(results.every(r => r.confidence)).toBe(true);
  });
});
```

## 🚀 Deployment Sequence

### Week 7 Daily Plan

#### Day 1: Final Preparation
- [ ] Run production checklist
- [ ] Create rollback snapshots
- [ ] Brief on-call team
- [ ] Deploy canary controller

#### Day 2-3: Canary Phase (1-10%)
- [ ] Enable for 1% internal users
- [ ] Monitor metrics closely
- [ ] Collect feedback
- [ ] Progress to 5% then 10%

#### Day 4-5: Expansion Phase (25-50%)
- [ ] Enable UI components
- [ ] A/B test engagement
- [ ] Performance optimization
- [ ] Progress to 50%

#### Day 6-7: Full Rollout (100%)
- [ ] Enable for all users
- [ ] Monitor stability
- [ ] Document lessons learned
- [ ] Celebrate! 🎉

## 🔍 Production Monitoring

### Key Dashboards
1. **Executive Dashboard**: High-level KPIs
2. **Technical Dashboard**: System metrics
3. **User Experience Dashboard**: Engagement metrics
4. **Alert Dashboard**: Active issues

### Alert Runbooks
- [High Error Rate](runbooks/high-error-rate.md)
- [Performance Degradation](runbooks/performance-degradation.md)
- [Rollback Procedure](runbooks/rollback-procedure.md)
- [Incident Response](runbooks/incident-response.md)

---

**Team Contact**: @production-team
**On-Call Rotation**: [Schedule](oncall-schedule.md)
**Escalation**: Tech Lead → VP Engineering → CTO
**Deadline**: End of Week 7
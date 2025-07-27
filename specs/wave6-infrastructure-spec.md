# 📋 Wave 6: Infrastructure Team Specification
## Feature Branch: `feature/ml-confidence-integration`

### Team Assignment: Infrastructure & DevOps

#### 🎯 Sprint Goal
Establish ML infrastructure foundation with zero impact on existing system, implementing feature flags, monitoring, and state extensions.

## 📊 Success Metrics (Week 1)
- [ ] Zero breaking changes (0 errors in regression tests)
- [ ] Feature flag response time < 10ms
- [ ] Metrics collection overhead < 2% CPU
- [ ] State extension memory < 5MB
- [ ] 100% backward compatibility

## 🛠️ Technical Deliverables

### 1. Feature Flag System (`js/ml/MLFeatureFlags.js`)
```javascript
/**
 * ML Feature Flag Manager
 * Controls gradual rollout of ML components
 */
class MLFeatureFlags {
  constructor() {
    this.flags = {
      enabled: false,
      components: {
        calculator: false,
        tracker: false,
        orchestrator: false,
        ui: {
          badges: false,
          dashboard: false,
          curationPanel: false
        }
      },
      rollout: {
        percentage: 0,
        userGroups: [],
        strategy: 'canary' // 'canary' | 'blue-green' | 'feature'
      }
    };
    
    this.storage = new FlagStorage();
    this.validator = new FlagValidator();
  }
  
  async load() {
    // Load from remote config service
    try {
      const remoteFlags = await this.fetchRemoteConfig();
      this.flags = this.validator.validate(remoteFlags);
    } catch (error) {
      console.warn('Using local feature flags:', error);
      this.flags = await this.storage.loadLocal();
    }
    
    return this.flags;
  }
  
  isEnabled(component) {
    if (!this.flags.enabled) return false;
    
    const parts = component.split('.');
    let current = this.flags.components;
    
    for (const part of parts) {
      if (!current[part]) return false;
      current = current[part];
    }
    
    return current === true;
  }
  
  shouldShowForUser(userId) {
    if (this.flags.rollout.percentage === 0) return false;
    if (this.flags.rollout.percentage === 100) return true;
    
    // Consistent hashing for gradual rollout
    const hash = this.hashUserId(userId);
    return (hash % 100) < this.flags.rollout.percentage;
  }
  
  toggle(component, value) {
    // Real-time flag updates
    const event = {
      component,
      oldValue: this.isEnabled(component),
      newValue: value,
      timestamp: Date.now()
    };
    
    this.setComponentFlag(component, value);
    this.emitFlagChange(event);
    this.storage.saveLocal(this.flags);
  }
}
```

### 2. Metrics Collection (`js/ml/PrometheusExporter.js`)
```javascript
/**
 * Prometheus-compatible metrics exporter
 * Collects and exposes ML metrics
 */
class PrometheusExporter {
  constructor() {
    this.metrics = {
      // Counters
      ml_calculations_total: new Counter('ml_calculations_total'),
      ml_errors_total: new Counter('ml_errors_total'),
      
      // Gauges
      ml_confidence_current: new Gauge('ml_confidence_current'),
      ml_memory_usage_bytes: new Gauge('ml_memory_usage_bytes'),
      
      // Histograms
      ml_calculation_duration_seconds: new Histogram('ml_calculation_duration_seconds', {
        buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
      }),
      
      // Custom metrics
      ml_feature_flag_toggles: new Counter('ml_feature_flag_toggles'),
      ml_convergence_iterations: new Histogram('ml_convergence_iterations')
    };
    
    this.startCollection();
  }
  
  startCollection() {
    // Memory metrics
    setInterval(() => {
      if (performance.memory) {
        this.metrics.ml_memory_usage_bytes.set(
          performance.memory.usedJSHeapSize
        );
      }
    }, 5000);
    
    // Listen for ML events
    KC.EventBus.on('ml:calculation:complete', (data) => {
      this.metrics.ml_calculations_total.inc();
      this.metrics.ml_calculation_duration_seconds.observe(data.duration);
      this.metrics.ml_confidence_current.set(data.confidence);
    });
  }
  
  // Prometheus exposition format
  async export() {
    const lines = [];
    
    for (const [name, metric] of Object.entries(this.metrics)) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);
      lines.push(metric.serialize());
    }
    
    return lines.join('\n');
  }
}
```

### 3. State Extension (`js/ml/MLStateExtension.js`)
```javascript
/**
 * Extends AppState with ML namespace
 * Maintains backward compatibility
 */
class MLStateExtension {
  static extend(AppState) {
    // Preserve existing state
    const originalSet = AppState.set.bind(AppState);
    const originalGet = AppState.get.bind(AppState);
    
    // Add ML namespace
    AppState.ml = {
      version: '6.0.0',
      flags: {},
      metrics: {
        performance: {
          calculationTime: [],
          convergenceIterations: [],
          memoryUsage: []
        },
        usage: {
          filesAnalyzed: 0,
          feedbackProvided: 0,
          confidenceImprovement: []
        },
        quality: {
          avgConfidence: 0,
          convergenceRate: 0,
          userAgreement: 0
        }
      },
      history: [],
      cache: new Map()
    };
    
    // Override set to track ML changes
    AppState.set = function(key, value) {
      const oldValue = this.get(key);
      originalSet(key, value);
      
      // Track ML-specific changes
      if (key.startsWith('ml.')) {
        MLStateExtension.trackChange(key, oldValue, value);
      }
    };
    
    // Add ML-specific methods
    AppState.mlSnapshot = function() {
      return {
        timestamp: Date.now(),
        ml: JSON.parse(JSON.stringify(this.ml)),
        files: this.get('files')?.length || 0
      };
    };
    
    AppState.mlRestore = function(snapshot) {
      this.ml = JSON.parse(JSON.stringify(snapshot.ml));
      KC.EventBus.emit('ml:state:restored', snapshot);
    };
  }
  
  static trackChange(key, oldValue, newValue) {
    const change = {
      key,
      oldValue,
      newValue,
      timestamp: Date.now(),
      source: new Error().stack
    };
    
    // Store in circular buffer
    KC.AppState.ml.history.push(change);
    if (KC.AppState.ml.history.length > 100) {
      KC.AppState.ml.history.shift();
    }
    
    // Emit for monitoring
    KC.EventBus.emit('ml:state:changed', change);
  }
}
```

### 4. Infrastructure Configuration (`js/ml/MLConfig.js`)
```javascript
/**
 * Central configuration for ML infrastructure
 */
const MLConfig = {
  // Feature flag service
  featureFlags: {
    endpoint: process.env.ML_FLAGS_ENDPOINT || '/api/ml/flags',
    refreshInterval: 60000, // 1 minute
    cache: {
      enabled: true,
      ttl: 300000 // 5 minutes
    }
  },
  
  // Metrics configuration
  metrics: {
    enabled: true,
    endpoint: '/metrics',
    pushGateway: process.env.PROMETHEUS_GATEWAY,
    interval: 10000, // 10 seconds
    bufferSize: 1000
  },
  
  // State management
  state: {
    persistML: true,
    compressionEnabled: true,
    maxHistorySize: 100,
    snapshotInterval: 300000 // 5 minutes
  },
  
  // Performance limits
  performance: {
    maxMemoryMB: 100,
    maxCalculationTimeMs: 2000,
    workerPoolSize: navigator.hardwareConcurrency || 4
  },
  
  // Rollback configuration
  rollback: {
    enabled: true,
    triggers: {
      errorRate: 0.05,
      memoryThreshold: 150 * 1024 * 1024,
      responseTime: 5000
    }
  }
};
```

### 5. Monitoring Dashboard (`monitoring/ml-dashboard.html`)
```html
<!DOCTYPE html>
<html>
<head>
    <title>ML Infrastructure Monitoring</title>
    <style>
        .metric-card {
            background: #f5f5f5;
            padding: 20px;
            margin: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        
        .status-good { color: #22c55e; }
        .status-warning { color: #f59e0b; }
        .status-error { color: #ef4444; }
    </style>
</head>
<body>
    <div id="dashboard">
        <h1>ML Infrastructure Status</h1>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Feature Flags</h3>
                <div id="feature-flags-status"></div>
            </div>
            
            <div class="metric-card">
                <h3>Performance</h3>
                <div id="performance-metrics"></div>
            </div>
            
            <div class="metric-card">
                <h3>State Health</h3>
                <div id="state-health"></div>
            </div>
        </div>
    </div>
    
    <script src="monitoring/dashboard.js"></script>
</body>
</html>
```

## 📝 Testing Requirements

### 1. Unit Tests (`test/ml/infrastructure.test.js`)
```javascript
describe('ML Infrastructure', () => {
  describe('Feature Flags', () => {
    it('should load flags without errors', async () => {
      const flags = await MLFeatureFlags.load();
      expect(flags).toBeDefined();
      expect(flags.enabled).toBe(false); // Safe default
    });
    
    it('should handle remote config failures gracefully', async () => {
      // Simulate network failure
      fetchMock.mockRejectOnce();
      const flags = await MLFeatureFlags.load();
      expect(flags).toBeDefined(); // Falls back to local
    });
    
    it('should respect rollout percentage', () => {
      const flags = new MLFeatureFlags();
      flags.flags.rollout.percentage = 50;
      
      let included = 0;
      for (let i = 0; i < 1000; i++) {
        if (flags.shouldShowForUser(`user${i}`)) included++;
      }
      
      expect(included).toBeGreaterThan(450);
      expect(included).toBeLessThan(550);
    });
  });
  
  describe('State Extension', () => {
    it('should not break existing AppState', () => {
      const state = { get: jest.fn(), set: jest.fn() };
      MLStateExtension.extend(state);
      
      state.set('existingKey', 'value');
      expect(state.set).toHaveBeenCalled();
    });
    
    it('should track ML changes', () => {
      MLStateExtension.extend(KC.AppState);
      KC.AppState.set('ml.test', 'value');
      
      expect(KC.AppState.ml.history).toHaveLength(1);
      expect(KC.AppState.ml.history[0].key).toBe('ml.test');
    });
  });
});
```

### 2. Integration Tests
```javascript
describe('ML Infrastructure Integration', () => {
  it('should initialize without affecting existing features', async () => {
    // Load existing app
    await KC.initialize();
    
    // Add ML infrastructure
    MLStateExtension.extend(KC.AppState);
    const flags = await MLFeatureFlags.load();
    const exporter = new PrometheusExporter();
    
    // Verify existing features still work
    expect(KC.FileRenderer).toBeDefined();
    expect(KC.FilterManager).toBeDefined();
    
    // Verify ML is disabled by default
    expect(flags.enabled).toBe(false);
  });
});
```

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Zero console errors
- [ ] Memory usage within limits
- [ ] Feature flags defaulting to disabled
- [ ] Monitoring endpoints accessible

### Deployment Steps
1. Create feature branch: `git checkout -b feature/ml-confidence-integration`
2. Deploy infrastructure code with flags disabled
3. Verify monitoring dashboard
4. Test feature flag toggles
5. Document configuration

### Post-deployment
- [ ] Monitor error rates
- [ ] Check memory usage
- [ ] Verify metrics collection
- [ ] Test rollback procedure
- [ ] Update documentation

## 📚 Documentation Links
- [Feature Flag Best Practices](https://docs.example.com/feature-flags)
- [Prometheus Metrics Guide](https://prometheus.io/docs/practices/naming/)
- [State Management Patterns](https://docs.example.com/state-management)

---

**Team Contact**: @infrastructure-team
**Review Required By**: Tech Lead + DevOps Lead
**Deadline**: End of Week 1
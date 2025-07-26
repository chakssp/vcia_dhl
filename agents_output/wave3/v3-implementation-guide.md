# V3 Implementation Guide - Wave 3 Delivery

## Overview

This guide details the specific implementation deliverables for Wave 3, transforming the V3 specification into production-ready components.

## Wave 3 Deliverables Mapping

### From Specification to Implementation

| V3 Specification | Wave 3 Deliverable | Agent Responsible |
|------------------|-------------------|-------------------|
| IterativeOrchestrator | `orchestrator/IterativeOrchestrator.js` | systems-architect |
| WorkflowStateMachine | `orchestrator/WorkflowStateMachine.js` | systems-architect |
| ReanalysisQueue | `orchestrator/ReanalysisQueue.js` | systems-architect |
| ConvergenceMonitor | `orchestrator/ConvergenceMonitor.js` | systems-architect |
| OrchestrationDashboard | `orchestrator/orchestrator-dashboard.html` | systems-architect |
| OptimizedCalculator | `optimization/OptimizedCalculator.js` | performance-optimization |
| MLWorkerPool | `optimization/MLWorkerPool.js` | performance-optimization |
| CacheStrategy | `optimization/CacheStrategy.js` | performance-optimization |
| BatchProcessor | `optimization/BatchProcessor.js` | performance-optimization |
| PerformanceMonitor | `optimization/PerformanceMonitor.js` | performance-optimization |

## Detailed Implementation Requirements

### 1. IterativeOrchestrator.js

```javascript
/**
 * Main orchestration engine managing the automated workflow
 * Integrates with Wave 1-2 components for complete automation
 */
class IterativeOrchestrator {
    constructor() {
        // Initialize with existing components
        this.calculator = window.KC?.ConfidenceCalculator || new ConfidenceCalculator();
        this.tracker = window.KC?.ConfidenceTracker || new ConfidenceTracker();
        this.appState = window.KC?.AppState || {};
        
        // New Wave 3 components
        this.stateMachine = new WorkflowStateMachine();
        this.queue = new ReanalysisQueue();
        this.monitor = new ConvergenceMonitor();
        
        // Configuration
        this.config = {
            maxIterations: 5,
            targetConfidence: 0.85,
            batchSize: 20,
            processingDelay: 100,
            convergenceThreshold: 0.02
        };
        
        this.setupEventListeners();
    }
    
    // Core orchestration methods
    async startIterativeCycle(files, groundTruth = {}) {
        this.stateMachine.transition('analyzing');
        
        const prioritized = this.queue.prioritize(files);
        const batches = this.createBatches(prioritized);
        
        for (const batch of batches) {
            const results = await this.processBatch(batch, groundTruth);
            const converged = this.monitor.checkConvergence(results);
            
            if (converged) {
                this.stateMachine.transition('complete');
                break;
            }
            
            // Schedule re-analysis for non-converged items
            const needsReanalysis = results.filter(r => r.confidence.overall < this.config.targetConfidence);
            this.queue.add(needsReanalysis, 'high');
        }
        
        return this.generateReport();
    }
    
    async processBatch(batch, groundTruth) {
        const results = [];
        
        for (const item of batch) {
            // Check for human feedback
            if (groundTruth[item.fileId]) {
                item.humanFeedback = groundTruth[item.fileId];
            }
            
            // Calculate confidence with optimization
            const confidence = await this.calculator.calculateOptimized(item);
            
            // Track in system
            this.tracker.updateMetrics(item.fileId, confidence);
            
            // Update state
            this.updateAppState(item.fileId, confidence);
            
            results.push({
                fileId: item.fileId,
                confidence,
                iteration: item.iteration || 1
            });
            
            // Emit progress event
            this.emitProgress(results.length, batch.length);
        }
        
        return results;
    }
}
```

### 2. OptimizedCalculator.js

```javascript
/**
 * Performance-enhanced confidence calculator
 * Extends Wave 1 ConfidenceCalculator with optimization
 */
class OptimizedCalculator extends ConfidenceCalculator {
    constructor() {
        super();
        
        // Performance enhancements
        this.workerPool = new MLWorkerPool();
        this.cache = new CacheStrategy({
            maxSize: 1000,
            ttl: 3600000, // 1 hour
            strategy: 'LRU'
        });
        
        // Batch processor for parallel execution
        this.batchProcessor = new BatchProcessor({
            maxConcurrent: 20,
            timeout: 5000
        });
    }
    
    async calculateOptimized(analysisData) {
        // Check cache first
        const cacheKey = this.generateCacheKey(analysisData);
        const cached = this.cache.get(cacheKey);
        
        if (cached && this.isCacheValid(cached, analysisData)) {
            return cached.value;
        }
        
        // Use worker pool for heavy computation
        const result = await this.workerPool.execute('calculateConfidence', {
            data: analysisData,
            weights: this.weights,
            algorithms: this.getAlgorithmConfigs()
        });
        
        // Cache the result
        this.cache.set(cacheKey, {
            value: result,
            timestamp: Date.now(),
            metadata: {
                fileId: analysisData.fileId,
                iteration: analysisData.iteration
            }
        });
        
        return result;
    }
    
    async processBatch(items) {
        return this.batchProcessor.process(items, async (item) => {
            return this.calculateOptimized(item);
        });
    }
}
```

### 3. WorkflowStateMachine.js

```javascript
/**
 * State machine managing workflow transitions
 */
class WorkflowStateMachine {
    constructor(config = {}) {
        this.states = {
            idle: { 
                transitions: ['analyzing'],
                onEnter: () => console.log('Workflow idle')
            },
            analyzing: {
                transitions: ['curating', 'converging'],
                onEnter: () => this.emit('ANALYSIS_STARTED')
            },
            curating: {
                transitions: ['analyzing'],
                onEnter: () => this.emit('CURATION_NEEDED')
            },
            converging: {
                transitions: ['complete', 'analyzing'],
                onEnter: () => this.emit('CONVERGENCE_CHECK')
            },
            complete: {
                transitions: ['idle'],
                onEnter: () => this.emit('WORKFLOW_COMPLETE')
            }
        };
        
        this.currentState = 'idle';
        this.history = [];
    }
    
    transition(newState) {
        const current = this.states[this.currentState];
        
        if (!current.transitions.includes(newState)) {
            throw new Error(`Invalid transition from ${this.currentState} to ${newState}`);
        }
        
        // Exit current state
        if (current.onExit) {
            current.onExit();
        }
        
        // Record transition
        this.history.push({
            from: this.currentState,
            to: newState,
            timestamp: Date.now()
        });
        
        // Enter new state
        this.currentState = newState;
        const next = this.states[newState];
        
        if (next.onEnter) {
            next.onEnter();
        }
        
        this.emit('STATE_CHANGED', {
            from: this.history[this.history.length - 1].from,
            to: newState
        });
    }
}
```

### 4. Dashboard Integration

```html
<!-- orchestrator-dashboard.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ML Confidence Orchestration Dashboard</title>
    <style>
        /* Dashboard styles */
        .dashboard {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 20px;
        }
        
        .workflow-visualizer {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 20px;
        }
        
        .queue-monitor {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .performance-metrics {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        
        .metric-card {
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="workflow-visualizer">
            <h2>Workflow State</h2>
            <div id="state-diagram"></div>
            <div id="current-state">Current: IDLE</div>
        </div>
        
        <div class="queue-monitor">
            <h2>Processing Queue</h2>
            <div id="queue-list"></div>
        </div>
        
        <div class="performance-metrics">
            <div class="metric-card">
                <h3>Avg. Confidence</h3>
                <div id="avg-confidence">72.5%</div>
            </div>
            <div class="metric-card">
                <h3>Cache Hit Rate</h3>
                <div id="cache-hit-rate">0%</div>
            </div>
            <div class="metric-card">
                <h3>Processing Speed</h3>
                <div id="processing-speed">0 items/s</div>
            </div>
        </div>
        
        <div class="convergence-chart">
            <h2>Convergence Progress</h2>
            <canvas id="convergence-canvas"></canvas>
        </div>
    </div>
    
    <script>
        // Dashboard controller
        class DashboardController {
            constructor() {
                this.orchestrator = window.orchestrator;
                this.setupEventListeners();
                this.initializeCharts();
            }
            
            setupEventListeners() {
                this.orchestrator.on('STATE_CHANGED', (data) => {
                    this.updateStateDisplay(data.to);
                });
                
                this.orchestrator.on('QUEUE_UPDATED', (queue) => {
                    this.updateQueueDisplay(queue);
                });
                
                this.orchestrator.on('PERFORMANCE_METRIC', (metrics) => {
                    this.updateMetrics(metrics);
                });
            }
        }
        
        // Initialize on load
        document.addEventListener('DOMContentLoaded', () => {
            new DashboardController();
        });
    </script>
</body>
</html>
```

## Integration with Existing System

### Event Integration
```javascript
// Connect Wave 3 to existing EventBus
KC.EventBus.on(KC.Events.FILES_ANALYZED, (data) => {
    orchestrator.queue.add(data.files.filter(f => f.confidence < 0.85));
});

KC.EventBus.on('CURATION_COMPLETE', (data) => {
    orchestrator.processWithFeedback(data.fileId, data.feedback);
});

// Emit Wave 3 events to existing system
orchestrator.on('CONVERGENCE_ACHIEVED', (data) => {
    KC.EventBus.emit('ANALYSIS_CONVERGED', data);
});
```

### State Persistence
```javascript
// Save orchestration state to AppState
orchestrator.on('STATE_CHANGED', (state) => {
    KC.AppState.set('orchestration.state', state);
    KC.AppState.set('orchestration.lastUpdate', Date.now());
});

// Restore on reload
const savedState = KC.AppState.get('orchestration.state');
if (savedState) {
    orchestrator.restore(savedState);
}
```

## Testing Strategy

### Unit Tests
- Test each component in isolation
- Mock dependencies from Wave 1-2
- Verify state transitions
- Test convergence algorithms

### Integration Tests
- Test orchestrator with real components
- Verify event flow
- Test performance optimizations
- Validate caching behavior

### Performance Tests
- Benchmark with 1000+ items
- Measure cache effectiveness
- Profile memory usage
- Test concurrent processing

## Deployment Checklist

- [ ] All components implemented
- [ ] Tests passing (90%+ coverage)
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Integration verified
- [ ] Dashboard functional
- [ ] Error handling robust

---

*This implementation guide ensures Wave 3 delivers on the V3 specification promises, bringing the ML Confidence system to its 85% target.*
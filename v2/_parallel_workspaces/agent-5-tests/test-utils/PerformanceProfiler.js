/**
 * Performance Profiler for KC V2 Tests
 * Advanced performance measurement and profiling utilities
 */

export class PerformanceProfiler {
  constructor(options = {}) {
    this.profiles = new Map();
    this.options = {
      sampleInterval: options.sampleInterval || 10, // ms
      captureCallStacks: options.captureCallStacks || false,
      trackMemory: options.trackMemory !== false,
      trackCPU: options.trackCPU !== false,
      ...options
    };
    this.observers = new Map();
  }

  start(profileName, options = {}) {
    if (this.profiles.has(profileName)) {
      console.warn(`Profile ${profileName} already running`);
      return;
    }

    const profile = {
      name: profileName,
      startTime: performance.now(),
      startMark: `${profileName}-start`,
      samples: [],
      events: [],
      options: { ...this.options, ...options }
    };

    // Performance marks
    performance.mark(profile.startMark);

    // Start sampling if requested
    if (profile.options.sampleInterval > 0) {
      profile.samplingInterval = setInterval(() => {
        this.takeSample(profile);
      }, profile.options.sampleInterval);
    }

    // Start performance observer
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          profile.events.push({
            type: entry.entryType,
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            timestamp: performance.now()
          });
        }
      });

      observer.observe({ 
        entryTypes: ['measure', 'function', 'resource'] 
      });
      
      this.observers.set(profileName, observer);
    }

    this.profiles.set(profileName, profile);
  }

  stop(profileName) {
    const profile = this.profiles.get(profileName);
    if (!profile) {
      console.warn(`Profile ${profileName} not found`);
      return null;
    }

    // Stop sampling
    if (profile.samplingInterval) {
      clearInterval(profile.samplingInterval);
    }

    // Stop observer
    const observer = this.observers.get(profileName);
    if (observer) {
      observer.disconnect();
      this.observers.delete(profileName);
    }

    // Final measurements
    profile.endTime = performance.now();
    profile.endMark = `${profileName}-end`;
    performance.mark(profile.endMark);
    
    // Create measure
    performance.measure(
      profileName,
      profile.startMark,
      profile.endMark
    );

    // Get the measure
    const measures = performance.getEntriesByName(profileName, 'measure');
    profile.measure = measures[measures.length - 1];

    // Analyze profile
    const analysis = this.analyzeProfile(profile);
    
    // Cleanup
    this.profiles.delete(profileName);
    performance.clearMarks(profile.startMark);
    performance.clearMarks(profile.endMark);
    performance.clearMeasures(profileName);

    return analysis;
  }

  takeSample(profile) {
    const sample = {
      timestamp: performance.now() - profile.startTime,
      memory: this.captureMemory(),
      cpu: this.estimateCPU()
    };

    if (profile.options.captureCallStacks) {
      sample.stack = this.captureCallStack();
    }

    profile.samples.push(sample);
  }

  captureMemory() {
    if (typeof performance.memory === 'undefined') {
      return null;
    }

    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };
  }

  estimateCPU() {
    // CPU estimation based on time spent in JS execution
    const now = performance.now();
    if (!this.lastCPUSample) {
      this.lastCPUSample = { time: now, busy: 0 };
      return 0;
    }

    const elapsed = now - this.lastCPUSample.time;
    const busy = elapsed > 0 ? (elapsed - 16.67) / elapsed * 100 : 0;
    
    this.lastCPUSample = { time: now, busy };
    return Math.max(0, Math.min(100, busy));
  }

  captureCallStack() {
    try {
      throw new Error();
    } catch (e) {
      return e.stack
        ?.split('\n')
        .slice(3) // Remove profiler frames
        .map(line => line.trim())
        .filter(line => line.startsWith('at'));
    }
  }

  analyzeProfile(profile) {
    const duration = profile.endTime - profile.startTime;
    const samples = profile.samples;

    const analysis = {
      name: profile.name,
      duration,
      startTime: profile.startTime,
      endTime: profile.endTime,
      samples: samples.length,
      events: profile.events.length
    };

    // Memory analysis
    if (samples.length > 0 && samples[0].memory) {
      const memoryData = samples.map(s => s.memory).filter(Boolean);
      analysis.memory = {
        initial: memoryData[0]?.usedJSHeapSize || 0,
        final: memoryData[memoryData.length - 1]?.usedJSHeapSize || 0,
        peak: Math.max(...memoryData.map(m => m.usedJSHeapSize)),
        average: memoryData.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / memoryData.length,
        growth: (memoryData[memoryData.length - 1]?.usedJSHeapSize || 0) - (memoryData[0]?.usedJSHeapSize || 0)
      };
    }

    // CPU analysis
    if (samples.length > 0 && typeof samples[0].cpu === 'number') {
      const cpuData = samples.map(s => s.cpu).filter(cpu => cpu !== null);
      analysis.cpu = {
        average: cpuData.reduce((sum, cpu) => sum + cpu, 0) / cpuData.length,
        peak: Math.max(...cpuData),
        samples: cpuData
      };
    }

    // Frame rate analysis
    analysis.fps = this.calculateFPS(profile);

    // Event analysis
    if (profile.events.length > 0) {
      analysis.eventSummary = this.summarizeEvents(profile.events);
    }

    // Jank detection
    analysis.jank = this.detectJank(samples);

    return analysis;
  }

  calculateFPS(profile) {
    const frames = profile.events.filter(e => 
      e.type === 'paint' || e.name === 'frame'
    );

    if (frames.length < 2) {
      return { average: 0, min: 0, max: 0 };
    }

    const frameDeltas = [];
    for (let i = 1; i < frames.length; i++) {
      frameDeltas.push(frames[i].startTime - frames[i - 1].startTime);
    }

    const avgDelta = frameDeltas.reduce((a, b) => a + b, 0) / frameDeltas.length;
    
    return {
      average: 1000 / avgDelta,
      min: 1000 / Math.max(...frameDeltas),
      max: 1000 / Math.min(...frameDeltas),
      droppedFrames: frameDeltas.filter(d => d > 33.33).length // >2 frames
    };
  }

  summarizeEvents(events) {
    const summary = {};
    
    events.forEach(event => {
      const key = `${event.type}:${event.name}`;
      if (!summary[key]) {
        summary[key] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
          maxDuration: 0
        };
      }
      
      summary[key].count++;
      summary[key].totalDuration += event.duration || 0;
      summary[key].maxDuration = Math.max(
        summary[key].maxDuration,
        event.duration || 0
      );
    });

    // Calculate averages
    Object.values(summary).forEach(stat => {
      stat.avgDuration = stat.count > 0 ? stat.totalDuration / stat.count : 0;
    });

    return summary;
  }

  detectJank(samples) {
    if (samples.length < 2) {
      return { count: 0, severity: [] };
    }

    const jankFrames = [];
    let lastTimestamp = samples[0].timestamp;

    for (let i = 1; i < samples.length; i++) {
      const delta = samples[i].timestamp - lastTimestamp;
      
      // Jank if frame took longer than 50ms (3 frames @ 60fps)
      if (delta > 50) {
        jankFrames.push({
          timestamp: samples[i].timestamp,
          duration: delta,
          severity: delta > 100 ? 'severe' : 'moderate'
        });
      }
      
      lastTimestamp = samples[i].timestamp;
    }

    return {
      count: jankFrames.length,
      frames: jankFrames,
      totalJankTime: jankFrames.reduce((sum, f) => sum + f.duration, 0)
    };
  }

  // Advanced profiling methods

  async profileFunction(fn, name = 'anonymous', iterations = 1) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      this.start(`${name}-${i}`);
      
      try {
        const result = await fn();
        const profile = this.stop(`${name}-${i}`);
        results.push({
          iteration: i,
          profile,
          result,
          success: true
        });
      } catch (error) {
        const profile = this.stop(`${name}-${i}`);
        results.push({
          iteration: i,
          profile,
          error: error.message,
          success: false
        });
      }
    }

    return this.aggregateResults(results);
  }

  aggregateResults(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const durations = successful.map(r => r.profile.duration);
    const memories = successful
      .map(r => r.profile.memory?.growth)
      .filter(m => m !== undefined);

    return {
      iterations: results.length,
      successful: successful.length,
      failed: failed.length,
      duration: {
        total: durations.reduce((a, b) => a + b, 0),
        average: durations.length > 0 ? 
          durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        min: Math.min(...durations),
        max: Math.max(...durations),
        median: this.median(durations),
        p95: this.percentile(durations, 95),
        p99: this.percentile(durations, 99)
      },
      memory: memories.length > 0 ? {
        averageGrowth: memories.reduce((a, b) => a + b, 0) / memories.length,
        maxGrowth: Math.max(...memories)
      } : null,
      errors: failed.map(r => r.error)
    };
  }

  median(values) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  percentile(values, p) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Comparative profiling

  async compare(testCases, options = {}) {
    const results = {};
    
    for (const [name, fn] of Object.entries(testCases)) {
      console.log(`Profiling ${name}...`);
      results[name] = await this.profileFunction(
        fn,
        name,
        options.iterations || 10
      );
    }

    return this.generateComparison(results);
  }

  generateComparison(results) {
    const baseline = Object.values(results)[0];
    const comparison = {
      results,
      rankings: {},
      summary: {}
    };

    // Rank by different metrics
    const metrics = ['duration.average', 'duration.p95', 'memory.averageGrowth'];
    
    metrics.forEach(metric => {
      const values = Object.entries(results)
        .map(([name, result]) => ({
          name,
          value: this.getNestedValue(result, metric)
        }))
        .filter(v => v.value !== null && v.value !== undefined)
        .sort((a, b) => a.value - b.value);
      
      comparison.rankings[metric] = values.map((v, i) => ({
        ...v,
        rank: i + 1,
        percentDiff: baseline ? 
          ((v.value - baseline[metric]) / baseline[metric] * 100) : 0
      }));
    });

    // Generate summary
    comparison.summary.fastest = comparison.rankings['duration.average']?.[0]?.name;
    comparison.summary.mostMemoryEfficient = comparison.rankings['memory.averageGrowth']?.[0]?.name;

    return comparison;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => 
      current?.[key], obj
    );
  }

  // Flame graph data generation
  generateFlameGraph(profile) {
    if (!profile.samples || profile.samples.length === 0) {
      return null;
    }

    const stacks = profile.samples
      .map(s => s.stack)
      .filter(Boolean);

    const flameData = {
      name: 'root',
      value: 0,
      children: {}
    };

    stacks.forEach(stack => {
      let current = flameData;
      
      stack.reverse().forEach(frame => {
        if (!current.children[frame]) {
          current.children[frame] = {
            name: frame,
            value: 0,
            children: {}
          };
        }
        current.children[frame].value++;
        current = current.children[frame];
      });
    });

    return this.convertToFlameGraphFormat(flameData);
  }

  convertToFlameGraphFormat(node) {
    const children = Object.values(node.children)
      .map(child => this.convertToFlameGraphFormat(child))
      .filter(child => child.value > 0);

    return {
      name: node.name,
      value: node.value || children.reduce((sum, c) => sum + c.value, 0),
      children: children.length > 0 ? children : undefined
    };
  }
}
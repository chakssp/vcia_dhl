/**
 * explainability-performance.js
 * 
 * Performance benchmarks for explainable AI components.
 */

import { ExplainableConfidenceCalculator } from '../src/core/ExplainableConfidenceCalculator.js';
import { SHAPExplainer } from '../src/explainability/SHAPExplainer.js';
import { LIMEExplainer } from '../src/explainability/LIMEExplainer.js';
import { NaturalLanguageExplainer } from '../src/explainability/NaturalLanguageExplainer.js';

/**
 * Benchmark suite for explainability features
 */
class ExplainabilityBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        cpus: require('os').cpus().length,
        memory: require('os').totalmem()
      },
      benchmarks: {}
    };
  }
  
  /**
   * Run all benchmarks
   */
  async runAll() {
    console.log('🚀 Starting Explainability Performance Benchmarks...\n');
    
    await this.benchmarkSHAP();
    await this.benchmarkLIME();
    await this.benchmarkNaturalLanguage();
    await this.benchmarkFullExplanation();
    await this.benchmarkScalability();
    
    this.printResults();
    return this.results;
  }
  
  /**
   * Benchmark SHAP explanations
   */
  async benchmarkSHAP() {
    console.log('📊 Benchmarking SHAP Explanations...');
    
    const shap = new SHAPExplainer({
      nSamples: 100,
      useKernelSHAP: true
    });
    
    const testCases = [
      { name: 'Small file', features: this.generateFeatures(5) },
      { name: 'Medium file', features: this.generateFeatures(10) },
      { name: 'Large file', features: this.generateFeatures(20) }
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      const start = performance.now();
      
      await shap.explainInstance(
        testCase.features,
        this.mockModel,
        { overall: 0.75 }
      );
      
      const duration = performance.now() - start;
      results.push({
        case: testCase.name,
        features: Object.keys(testCase.features).length,
        duration: duration.toFixed(2),
        throughput: (1000 / duration).toFixed(2)
      });
    }
    
    this.results.benchmarks.shap = results;
    console.log('✅ SHAP benchmarks complete\n');
  }
  
  /**
   * Benchmark LIME explanations
   */
  async benchmarkLIME() {
    console.log('📊 Benchmarking LIME Explanations...');
    
    const lime = new LIMEExplainer({
      nSamples: 500,
      featureSelection: 'forward'
    });
    
    const testFiles = [
      this.generateMockFile(100),    // 100 words
      this.generateMockFile(500),    // 500 words
      this.generateMockFile(1000)    // 1000 words
    ];
    
    const results = [];
    
    for (const file of testFiles) {
      const start = performance.now();
      
      await lime.explainInstance(
        file,
        async (f) => ({ overall: Math.random() }),
        { overall: 0.7 }
      );
      
      const duration = performance.now() - start;
      results.push({
        wordCount: file.content.split(' ').length,
        duration: duration.toFixed(2),
        samplesPerSecond: (500 / (duration / 1000)).toFixed(0)
      });
    }
    
    this.results.benchmarks.lime = results;
    console.log('✅ LIME benchmarks complete\n');
  }
  
  /**
   * Benchmark natural language generation
   */
  async benchmarkNaturalLanguage() {
    console.log('📊 Benchmarking Natural Language Generation...');
    
    const nlExplainer = new NaturalLanguageExplainer({
      language: 'en',
      style: 'professional'
    });
    
    const contexts = [
      this.generateContext('minimal'),
      this.generateContext('standard'),
      this.generateContext('full')
    ];
    
    const results = [];
    
    for (const context of contexts) {
      const start = performance.now();
      
      const summary = await nlExplainer.generateSummary(context);
      const duration = performance.now() - start;
      
      results.push({
        level: context.level,
        outputLength: summary.length,
        duration: duration.toFixed(2),
        charsPerMs: (summary.length / duration).toFixed(2)
      });
    }
    
    this.results.benchmarks.naturalLanguage = results;
    console.log('✅ Natural Language benchmarks complete\n');
  }
  
  /**
   * Benchmark full explanation pipeline
   */
  async benchmarkFullExplanation() {
    console.log('📊 Benchmarking Full Explanation Pipeline...');
    
    const calculator = new ExplainableConfidenceCalculator({
      explainabilityLevel: 'full',
      enableSHAP: true,
      enableLIME: true,
      generateNaturalLanguage: true,
      counterfactualsEnabled: true
    });
    
    const testFiles = [
      this.generateMockFile(100),
      this.generateMockFile(500),
      this.generateMockFile(1000)
    ];
    
    const results = [];
    
    for (const file of testFiles) {
      const metrics = {
        file: `${file.content.split(' ').length} words`,
        components: {}
      };
      
      const start = performance.now();
      const result = await calculator.calculate(file);
      metrics.totalDuration = (performance.now() - start).toFixed(2);
      
      // Measure component times
      if (result.metadata) {
        metrics.components = {
          base: result.metadata.baseCalculationTime || 0,
          shap: result.metadata.shapTime || 0,
          lime: result.metadata.limeTime || 0,
          nl: result.metadata.nlTime || 0
        };
      }
      
      results.push(metrics);
    }
    
    this.results.benchmarks.fullPipeline = results;
    console.log('✅ Full pipeline benchmarks complete\n');
  }
  
  /**
   * Benchmark scalability
   */
  async benchmarkScalability() {
    console.log('📊 Benchmarking Scalability...');
    
    const calculator = new ExplainableConfidenceCalculator({
      explainabilityLevel: 'minimal'
    });
    
    const batchSizes = [1, 10, 50, 100];
    const results = [];
    
    for (const size of batchSizes) {
      const files = Array(size).fill(null).map(() => this.generateMockFile(200));
      
      const start = performance.now();
      
      // Process in parallel
      await Promise.all(files.map(f => calculator.calculate(f)));
      
      const duration = performance.now() - start;
      const throughput = (size / (duration / 1000)).toFixed(2);
      
      results.push({
        batchSize: size,
        totalDuration: duration.toFixed(2),
        avgPerFile: (duration / size).toFixed(2),
        throughput: `${throughput} files/sec`
      });
    }
    
    this.results.benchmarks.scalability = results;
    console.log('✅ Scalability benchmarks complete\n');
  }
  
  /**
   * Helper methods
   */
  
  generateFeatures(count) {
    const features = {};
    for (let i = 0; i < count; i++) {
      features[`feature${i}`] = Math.random();
    }
    return features;
  }
  
  generateMockFile(wordCount) {
    const words = ['important', 'insight', 'breakthrough', 'discovery', 'analysis', 
                   'critical', 'significant', 'research', 'finding', 'conclusion'];
    
    let content = '';
    for (let i = 0; i < wordCount; i++) {
      content += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    
    return {
      id: `file-${wordCount}`,
      name: `test-${wordCount}.md`,
      content: content.trim(),
      categories: ['Test', 'Benchmark'],
      lastModified: new Date().toISOString(),
      relevanceScore: Math.floor(Math.random() * 100)
    };
  }
  
  generateContext(level) {
    const baseContext = {
      level,
      file: this.generateMockFile(300),
      result: {
        overall: 0.75,
        dimensions: {
          semantic: 0.8,
          categorical: 0.7,
          structural: 0.75,
          temporal: 0.7
        }
      }
    };
    
    if (level === 'full') {
      baseContext.explanations = {
        shap: {
          keyContributors: [
            { feature: 'contentLength', impact: 0.3 },
            { feature: 'categories', impact: 0.2 }
          ]
        },
        lime: {
          rules: [
            { description: 'content length > 500', impact: 0.25 }
          ]
        }
      };
    }
    
    return baseContext;
  }
  
  mockModel = {
    calculate: async (features) => ({
      overall: 0.5 + Math.random() * 0.5
    })
  };
  
  /**
   * Print benchmark results
   */
  printResults() {
    console.log('📈 BENCHMARK RESULTS SUMMARY\n');
    console.log('='.repeat(60));
    
    // SHAP Results
    if (this.results.benchmarks.shap) {
      console.log('\n🔍 SHAP Explanation Performance:');
      console.table(this.results.benchmarks.shap);
    }
    
    // LIME Results
    if (this.results.benchmarks.lime) {
      console.log('\n🔍 LIME Explanation Performance:');
      console.table(this.results.benchmarks.lime);
    }
    
    // Natural Language Results
    if (this.results.benchmarks.naturalLanguage) {
      console.log('\n💬 Natural Language Generation:');
      console.table(this.results.benchmarks.naturalLanguage);
    }
    
    // Full Pipeline Results
    if (this.results.benchmarks.fullPipeline) {
      console.log('\n⚡ Full Explanation Pipeline:');
      console.table(this.results.benchmarks.fullPipeline);
    }
    
    // Scalability Results
    if (this.results.benchmarks.scalability) {
      console.log('\n📊 Scalability Analysis:');
      console.table(this.results.benchmarks.scalability);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All benchmarks completed successfully!');
  }
}

/**
 * Memory usage profiler
 */
class MemoryProfiler {
  static profile(fn, label) {
    const before = process.memoryUsage();
    const result = fn();
    const after = process.memoryUsage();
    
    console.log(`\n💾 Memory Profile - ${label}:`);
    console.log(`  RSS: ${((after.rss - before.rss) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Used: ${((after.heapUsed - before.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  External: ${((after.external - before.external) / 1024 / 1024).toFixed(2)} MB`);
    
    return result;
  }
}

// Run benchmarks if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new ExplainabilityBenchmark();
  
  benchmark.runAll()
    .then(results => {
      // Save results
      const fs = require('fs');
      const outputPath = `./benchmark-results-${Date.now()}.json`;
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`\n📁 Results saved to: ${outputPath}`);
    })
    .catch(error => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}

export { ExplainabilityBenchmark, MemoryProfiler };
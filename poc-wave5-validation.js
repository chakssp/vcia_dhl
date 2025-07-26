/**
 * POC Wave 5 - Pre-validation Script
 * Verifica se o ambiente está pronto para iniciar o POC de integração ML
 */

console.log('🚀 Wave 5 POC - Pre-Validation Check\n');
console.log('=' .repeat(50));

// Validation results storage
const validationResults = {
  timestamp: new Date().toISOString(),
  environment: {},
  components: {},
  dependencies: {},
  readiness: {
    score: 0,
    maxScore: 0,
    percentage: 0
  }
};

// 1. Check Core KC Components
console.log('\n📋 Checking Core Knowledge Consolidator Components...\n');

const coreComponents = [
  { name: 'KC Object', check: () => typeof KC !== 'undefined' },
  { name: 'EventBus', check: () => KC.EventBus && KC.EventBus.emit },
  { name: 'AppState', check: () => KC.AppState && KC.AppState.get },
  { name: 'AppController', check: () => KC.AppController !== undefined },
  { name: 'AnalysisManager', check: () => KC.AnalysisManager && KC.AnalysisManager.analyze },
  { name: 'FilterManager', check: () => KC.FilterManager !== undefined },
  { name: 'WorkflowPanel', check: () => KC.WorkflowPanel !== undefined },
  { name: 'FileRenderer', check: () => KC.FileRenderer !== undefined }
];

let coreScore = 0;
coreComponents.forEach(component => {
  try {
    const result = component.check();
    const status = result ? '✅' : '❌';
    console.log(`  ${status} ${component.name}`);
    validationResults.components[component.name] = result;
    if (result) coreScore++;
  } catch (error) {
    console.log(`  ❌ ${component.name} - Error: ${error.message}`);
    validationResults.components[component.name] = false;
  }
});

validationResults.readiness.score += coreScore;
validationResults.readiness.maxScore += coreComponents.length;

// 2. Check Wave 1-4 Assets Availability
console.log('\n📦 Checking Wave 1-4 Assets...\n');

const waveAssets = [
  { 
    wave: 'Wave 1', 
    path: 'agents_output/wave1/',
    files: ['appstate/VersionedAppState.js', 'calculator/ConfidenceCalculator.js', 'tracker/ConfidenceTracker.js']
  },
  { 
    wave: 'Wave 2', 
    path: 'agents_output/wave2/',
    files: ['ui/CurationPanel.js', 'ui/curation-panel.css']
  },
  { 
    wave: 'Wave 3', 
    path: 'agents_output/wave3/',
    files: ['orchestrator/IterativeOrchestrator.js', 'optimization/OptimizedCalculator.js']
  },
  { 
    wave: 'Wave 4', 
    path: 'agents_output/wave4/',
    files: ['deployment/config/production.config.js', 'testing/test-framework.js']
  }
];

console.log('  ℹ️  Note: Wave assets check is simulated for POC');
console.log('  ℹ️  In production, these would be validated via file system');

waveAssets.forEach(wave => {
  console.log(`\n  ${wave.wave}:`);
  wave.files.forEach(file => {
    // Simulated check for POC
    console.log(`    📄 ${file} - [Would check: ${wave.path}${file}]`);
  });
});

// 3. Check Browser Capabilities
console.log('\n🌐 Checking Browser Capabilities...\n');

const browserChecks = [
  { name: 'LocalStorage', check: () => typeof localStorage !== 'undefined' },
  { name: 'SessionStorage', check: () => typeof sessionStorage !== 'undefined' },
  { name: 'IndexedDB', check: () => typeof indexedDB !== 'undefined' },
  { name: 'Web Workers', check: () => typeof Worker !== 'undefined' },
  { name: 'ES6 Support', check: () => {
    try { eval('const test = `template ${1+1}`'); return true; } 
    catch { return false; }
  }},
  { name: 'Async/Await', check: () => {
    try { eval('(async () => {})'); return true; } 
    catch { return false; }
  }}
];

let browserScore = 0;
browserChecks.forEach(check => {
  try {
    const result = check.check();
    const status = result ? '✅' : '❌';
    console.log(`  ${status} ${check.name}`);
    validationResults.environment[check.name] = result;
    if (result) browserScore++;
  } catch (error) {
    console.log(`  ❌ ${check.name} - Error: ${error.message}`);
    validationResults.environment[check.name] = false;
  }
});

validationResults.readiness.score += browserScore;
validationResults.readiness.maxScore += browserChecks.length;

// 4. Check ML Integration Readiness
console.log('\n🤖 Checking ML Integration Readiness...\n');

const mlReadiness = {
  namespaceAvailable: !KC.ML,
  stateExtensible: typeof KC.AppState === 'object',
  eventsWorking: false,
  analysisExtensible: typeof KC.AnalysisManager?.analyze === 'function'
};

// Test event system
try {
  let eventReceived = false;
  KC.EventBus.once('poc:test', () => { eventReceived = true; });
  KC.EventBus.emit('poc:test', {});
  mlReadiness.eventsWorking = eventReceived;
} catch (e) {
  mlReadiness.eventsWorking = false;
}

console.log(`  ${mlReadiness.namespaceAvailable ? '✅' : '⚠️'} ML namespace available (KC.ML)`);
console.log(`  ${mlReadiness.stateExtensible ? '✅' : '❌'} AppState extensible`);
console.log(`  ${mlReadiness.eventsWorking ? '✅' : '❌'} Event system functional`);
console.log(`  ${mlReadiness.analysisExtensible ? '✅' : '❌'} AnalysisManager extensible`);

const mlScore = Object.values(mlReadiness).filter(v => v === true).length;
validationResults.readiness.score += mlScore;
validationResults.readiness.maxScore += 4;

// 5. Performance Baseline
console.log('\n⚡ Establishing Performance Baseline...\n');

const performanceTests = {
  domOperations: () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      const el = document.createElement('div');
      el.className = 'test-' + i;
    }
    return performance.now() - start;
  },
  
  stateOperations: () => {
    const start = performance.now();
    const testData = Array(100).fill({}).map((_, i) => ({
      id: i,
      data: 'test-' + i
    }));
    KC.AppState.set('poc-test', testData);
    KC.AppState.get('poc-test');
    KC.AppState.set('poc-test', null);
    return performance.now() - start;
  },
  
  eventOperations: () => {
    const start = performance.now();
    let counter = 0;
    const handler = () => counter++;
    
    for (let i = 0; i < 100; i++) {
      KC.EventBus.on('poc:perf', handler);
      KC.EventBus.emit('poc:perf', {});
      KC.EventBus.off('poc:perf', handler);
    }
    return performance.now() - start;
  }
};

console.log('  Running performance tests...');
const perfResults = {};

Object.entries(performanceTests).forEach(([name, test]) => {
  try {
    const duration = test();
    perfResults[name] = duration;
    console.log(`  ⏱️  ${name}: ${duration.toFixed(2)}ms`);
  } catch (error) {
    perfResults[name] = -1;
    console.log(`  ❌ ${name}: Error - ${error.message}`);
  }
});

validationResults.environment.performance = perfResults;

// 6. Final Readiness Score
console.log('\n📊 Final Readiness Assessment\n');
console.log('=' .repeat(50));

validationResults.readiness.percentage = 
  (validationResults.readiness.score / validationResults.readiness.maxScore * 100).toFixed(1);

console.log(`\n  Overall Readiness: ${validationResults.readiness.score}/${validationResults.readiness.maxScore} (${validationResults.readiness.percentage}%)\n`);

// Readiness interpretation
let readinessLevel, readinessMessage;
const percentage = parseFloat(validationResults.readiness.percentage);

if (percentage >= 90) {
  readinessLevel = '🟢 READY';
  readinessMessage = 'Environment is fully ready for Wave 5 POC!';
} else if (percentage >= 70) {
  readinessLevel = '🟡 MOSTLY READY';
  readinessMessage = 'Environment is mostly ready. Some components may need attention.';
} else if (percentage >= 50) {
  readinessLevel = '🟠 PARTIALLY READY';
  readinessMessage = 'Environment needs significant preparation before POC.';
} else {
  readinessLevel = '🔴 NOT READY';
  readinessMessage = 'Environment is not ready. Major components are missing.';
}

console.log(`  Status: ${readinessLevel}`);
console.log(`  ${readinessMessage}\n`);

// 7. Recommendations
console.log('💡 Recommendations:\n');

if (!mlReadiness.namespaceAvailable) {
  console.log('  ⚠️  KC.ML namespace already exists. Consider using KC.MLPoc for POC.');
}

const missingCore = coreComponents.filter(c => !validationResults.components[c.name]);
if (missingCore.length > 0) {
  console.log('  ❌ Missing core components:', missingCore.map(c => c.name).join(', '));
  console.log('     → Ensure Knowledge Consolidator is properly loaded');
}

if (percentage < 90) {
  console.log('  📌 Review failed checks above and address issues before starting POC');
}

// 8. Next Steps
console.log('\n🚀 Next Steps:\n');
console.log('  1. Address any failed checks identified above');
console.log('  2. Create POC directory structure: mkdir -p poc-wave5/components');
console.log('  3. Copy POC plan: cp specs/v5-wave5-poc-plan.md poc-wave5/');
console.log('  4. Start implementing core components as per plan');
console.log('  5. Run this validation again to confirm readiness');

// Export results
console.log('\n📄 Validation Report:\n');
console.log(JSON.stringify(validationResults, null, 2));

// Make results available globally for debugging
window.POC_VALIDATION = validationResults;

console.log('\n✅ Validation complete! Results saved to window.POC_VALIDATION');
console.log('=' .repeat(50));
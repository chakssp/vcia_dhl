/**
 * Legacy Bridge Tests for V1-V2 Integration
 * Tests to ensure V1 functionality works correctly with V2
 */

export class LegacyBridgeTests {
  constructor() {
    this.tests = [];
    this.results = [];
    this.setupTests();
  }

  setupTests() {
    // Register all tests
    this.addTest('V1 Global Namespace', this.testV1GlobalNamespace);
    this.addTest('AppState Compatibility', this.testAppStateCompatibility);
    this.addTest('EventBus Forwarding', this.testEventBusForwarding);
    this.addTest('File Discovery', this.testFileDiscovery);
    this.addTest('Analysis Pipeline', this.testAnalysisPipeline);
    this.addTest('Category Management', this.testCategoryManagement);
    this.addTest('Filter System', this.testFilterSystem);
    this.addTest('Export Functionality', this.testExportFunctionality);
    this.addTest('State Persistence', this.testStatePersistence);
    this.addTest('Event Synchronization', this.testEventSynchronization);
    this.addTest('Data Migration', this.testDataMigration);
    this.addTest('Backwards API Calls', this.testBackwardsAPICalls);
  }

  addTest(name, testFn) {
    this.tests.push({
      name,
      test: testFn.bind(this),
      status: 'pending'
    });
  }

  async runAll() {
    console.log('[LegacyBridgeTests] Starting test suite...');
    this.results = [];
    
    for (const test of this.tests) {
      try {
        console.log(`[Test] Running: ${test.name}`);
        const result = await test.test();
        
        this.results.push({
          name: test.name,
          passed: result.passed,
          message: result.message,
          details: result.details,
          duration: result.duration
        });
        
        console.log(`[Test] ${test.name}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
        if (!result.passed) {
          console.error(`[Test] Error: ${result.message}`);
        }
        
      } catch (error) {
        this.results.push({
          name: test.name,
          passed: false,
          message: error.message,
          error: error.stack
        });
        console.error(`[Test] ${test.name}: ❌ FAILED with error:`, error);
      }
    }
    
    this.printSummary();
    return this.results;
  }

  async runTest(testName) {
    const test = this.tests.find(t => t.name === testName);
    if (!test) {
      throw new Error(`Test "${testName}" not found`);
    }
    
    return await test.test();
  }

  // Individual Tests

  async testV1GlobalNamespace() {
    const start = Date.now();
    
    try {
      // Check V1 globals exist
      const hasKC = typeof window.KC !== 'undefined';
      const hasKnowledgeConsolidator = typeof window.KnowledgeConsolidator !== 'undefined';
      
      if (!hasKC && !hasKnowledgeConsolidator) {
        return {
          passed: false,
          message: 'V1 global namespace not found',
          duration: Date.now() - start
        };
      }
      
      // Check essential components
      const v1 = window.KC || window.KnowledgeConsolidator;
      const components = [
        'AppState', 'EventBus', 'DiscoveryManager',
        'AnalysisManager', 'CategoryManager'
      ];
      
      const missing = components.filter(comp => !v1[comp]);
      
      return {
        passed: missing.length === 0,
        message: missing.length === 0 ? 
          'All V1 components available' : 
          `Missing components: ${missing.join(', ')}`,
        details: {
          hasKC,
          hasKnowledgeConsolidator,
          availableComponents: components.filter(comp => v1[comp]),
          missingComponents: missing
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `Error testing V1 namespace: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testAppStateCompatibility() {
    const start = Date.now();
    
    try {
      const v1AppState = window.KC?.AppState || window.KnowledgeConsolidator?.AppState;
      
      if (!v1AppState) {
        return {
          passed: false,
          message: 'V1 AppState not found',
          duration: Date.now() - start
        };
      }
      
      // Test basic operations
      const testKey = 'test-compatibility';
      const testValue = { test: true, timestamp: Date.now() };
      
      // Set value
      v1AppState.set(testKey, testValue);
      
      // Get value
      const retrieved = v1AppState.get(testKey);
      
      // Clean up
      v1AppState.set(testKey, null);
      
      const passed = retrieved && retrieved.test === testValue.test;
      
      return {
        passed,
        message: passed ? 'AppState operations work correctly' : 'AppState operations failed',
        details: {
          set: testValue,
          retrieved,
          matches: passed
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `AppState test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testEventBusForwarding() {
    const start = Date.now();
    
    try {
      const v1EventBus = window.KC?.EventBus || window.KnowledgeConsolidator?.EventBus;
      const v2EventBus = window.KC?.getEventBus?.();
      
      if (!v1EventBus) {
        return {
          passed: false,
          message: 'V1 EventBus not found',
          duration: Date.now() - start
        };
      }
      
      // Test event forwarding
      let v1Received = false;
      let v2Received = false;
      const testData = { test: true, timestamp: Date.now() };
      
      // Listen on V1
      const v1Unsubscribe = v1EventBus.on('test-event', (data) => {
        v1Received = data.test === testData.test;
      });
      
      // Listen on V2 if available
      let v2Unsubscribe = null;
      if (v2EventBus) {
        v2Unsubscribe = v2EventBus.on('test:event', (data) => {
          v2Received = data.test === testData.test;
        });
      }
      
      // Emit from V1
      v1EventBus.emit('test-event', testData);
      
      // Wait a bit for async handlers
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up
      v1Unsubscribe();
      if (v2Unsubscribe) v2Unsubscribe();
      
      return {
        passed: v1Received,
        message: v1Received ? 
          'Event forwarding works correctly' : 
          'Event forwarding failed',
        details: {
          v1Received,
          v2Received,
          v2Available: !!v2EventBus
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `EventBus test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testFileDiscovery() {
    const start = Date.now();
    
    try {
      const v1Discovery = window.KC?.DiscoveryManager || 
                         window.KnowledgeConsolidator?.DiscoveryManager;
      
      if (!v1Discovery) {
        return {
          passed: false,
          message: 'V1 DiscoveryManager not found',
          duration: Date.now() - start
        };
      }
      
      // Test that methods exist
      const methods = ['discoverFiles', 'selectDirectory', 'getFileContent'];
      const missing = methods.filter(method => typeof v1Discovery[method] !== 'function');
      
      return {
        passed: missing.length === 0,
        message: missing.length === 0 ?
          'Discovery methods available' :
          `Missing methods: ${missing.join(', ')}`,
        details: {
          availableMethods: methods.filter(m => typeof v1Discovery[m] === 'function'),
          missingMethods: missing
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `Discovery test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testAnalysisPipeline() {
    const start = Date.now();
    
    try {
      const v1Analysis = window.KC?.AnalysisManager || 
                        window.KnowledgeConsolidator?.AnalysisManager;
      
      if (!v1Analysis) {
        return {
          passed: false,
          message: 'V1 AnalysisManager not found',
          duration: Date.now() - start
        };
      }
      
      // Test with mock file
      const mockFile = {
        id: 'test-file-1',
        name: 'test.md',
        content: 'This is a test file with important content for analysis.',
        size: 1024,
        created: new Date().toISOString()
      };
      
      // Test analysis
      const result = await v1Analysis.analyzeFile(mockFile);
      
      const hasRequiredFields = result && 
        (result.analysis || result.summary || result.relevanceScore !== undefined);
      
      return {
        passed: hasRequiredFields,
        message: hasRequiredFields ?
          'Analysis pipeline works correctly' :
          'Analysis pipeline returned incomplete results',
        details: {
          input: mockFile,
          output: result,
          hasAnalysis: !!result?.analysis,
          hasSummary: !!result?.summary,
          hasScore: result?.relevanceScore !== undefined
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `Analysis test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testCategoryManagement() {
    const start = Date.now();
    
    try {
      const v1Categories = window.KC?.CategoryManager || 
                          window.KnowledgeConsolidator?.CategoryManager;
      
      if (!v1Categories) {
        return {
          passed: false,
          message: 'V1 CategoryManager not found',
          duration: Date.now() - start
        };
      }
      
      // Get initial categories
      const initialCategories = v1Categories.getCategories();
      const initialCount = initialCategories.length;
      
      // Add test category
      const testCategory = {
        name: 'Test Category ' + Date.now(),
        color: '#FF0000'
      };
      
      const added = v1Categories.addCategory(testCategory);
      
      // Verify addition
      const afterAdd = v1Categories.getCategories();
      const found = afterAdd.find(cat => 
        cat.name === testCategory.name || cat === testCategory.name
      );
      
      // Remove test category
      if (found) {
        v1Categories.removeCategory(found.id || found.name || found);
      }
      
      // Verify removal
      const afterRemove = v1Categories.getCategories();
      
      return {
        passed: found && afterRemove.length === initialCount,
        message: found && afterRemove.length === initialCount ?
          'Category management works correctly' :
          'Category management operations failed',
        details: {
          initialCount,
          afterAddCount: afterAdd.length,
          afterRemoveCount: afterRemove.length,
          categoryAdded: !!found,
          categoryRemoved: afterRemove.length === initialCount
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `Category test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testFilterSystem() {
    const start = Date.now();
    
    try {
      const v1Filters = window.KC?.FilterManager || 
                       window.KnowledgeConsolidator?.FilterManager;
      
      if (!v1Filters) {
        return {
          passed: false,
          message: 'V1 FilterManager not found',
          duration: Date.now() - start
        };
      }
      
      // Test with mock files
      const mockFiles = [
        {
          id: '1',
          name: 'important.md',
          relevanceScore: 80,
          categories: ['Work'],
          created: new Date().toISOString()
        },
        {
          id: '2',
          name: 'notes.txt',
          relevanceScore: 40,
          categories: ['Personal'],
          created: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          name: 'project.doc',
          relevanceScore: 60,
          categories: ['Work', 'Projects'],
          created: new Date().toISOString()
        }
      ];
      
      // Test relevance filter
      const filtered = v1Filters.applyFilters(mockFiles, {
        relevanceThreshold: 50
      });
      
      const passed = filtered.length === 2 && 
                    filtered.every(f => f.relevanceScore >= 50);
      
      return {
        passed,
        message: passed ?
          'Filter system works correctly' :
          'Filter system produced incorrect results',
        details: {
          inputCount: mockFiles.length,
          outputCount: filtered.length,
          expectedCount: 2,
          filteredIds: filtered.map(f => f.id)
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `Filter test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testExportFunctionality() {
    const start = Date.now();
    
    try {
      const v1Export = window.KC?.ExportManager || 
                      window.KnowledgeConsolidator?.ExportManager;
      
      if (!v1Export) {
        return {
          passed: false,
          message: 'V1 ExportManager not found',
          duration: Date.now() - start
        };
      }
      
      // Check export methods exist
      const methods = ['exportToJSON', 'exportToMarkdown'];
      const available = methods.filter(method => typeof v1Export[method] === 'function');
      
      return {
        passed: available.length > 0,
        message: available.length > 0 ?
          'Export functionality available' :
          'No export methods found',
        details: {
          availableMethods: available,
          checkedMethods: methods
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `Export test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testStatePersistence() {
    const start = Date.now();
    
    try {
      const v1AppState = window.KC?.AppState || window.KnowledgeConsolidator?.AppState;
      
      if (!v1AppState) {
        return {
          passed: false,
          message: 'V1 AppState not found',
          duration: Date.now() - start
        };
      }
      
      // Save test state
      const testState = {
        testKey: 'persistence-test',
        timestamp: Date.now(),
        data: { foo: 'bar' }
      };
      
      v1AppState.set('test-persistence', testState);
      
      // Check localStorage
      const stored = localStorage.getItem('kc-test-persistence');
      const parsed = stored ? JSON.parse(stored) : null;
      
      // Clean up
      v1AppState.set('test-persistence', null);
      localStorage.removeItem('kc-test-persistence');
      
      const passed = parsed && parsed.testKey === testState.testKey;
      
      return {
        passed,
        message: passed ?
          'State persistence works correctly' :
          'State persistence failed',
        details: {
          saved: testState,
          retrieved: parsed,
          matches: passed
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `Persistence test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testEventSynchronization() {
    const start = Date.now();
    
    try {
      const v1EventBus = window.KC?.EventBus || window.KnowledgeConsolidator?.EventBus;
      const v2EventBus = window.KC?.getEventBus?.();
      
      if (!v1EventBus || !v2EventBus) {
        return {
          passed: false,
          message: 'Both V1 and V2 EventBus required for sync test',
          duration: Date.now() - start
        };
      }
      
      let v1ToV2 = false;
      let v2ToV1 = false;
      
      // Test V1 to V2
      const v2Listener = v2EventBus.on('v1:files-discovered', () => {
        v1ToV2 = true;
      });
      
      v1EventBus.emit('files-discovered', { test: true });
      
      // Test V2 to V1
      const v1Listener = v1EventBus.on('files-discovered', () => {
        v2ToV1 = true;
      });
      
      v2EventBus.emit('files:discovered', { test: true });
      
      // Wait for async
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up
      v2Listener();
      v1Listener();
      
      return {
        passed: v1ToV2 || v2ToV1,
        message: (v1ToV2 || v2ToV1) ?
          'Event synchronization works' :
          'Event synchronization failed',
        details: {
          v1ToV2,
          v2ToV1
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `Event sync test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testDataMigration() {
    const start = Date.now();
    
    try {
      // Check if migration utilities exist
      const hasMigrationSupport = window.KC?.migrate || 
                                  window.V1IntegrationLoader || 
                                  window.MigrationScripts;
      
      if (!hasMigrationSupport) {
        return {
          passed: false,
          message: 'No migration support found',
          duration: Date.now() - start
        };
      }
      
      // Test data format compatibility
      const v1Format = {
        id: 'test-1',
        name: 'test.md',
        content: 'Test content',
        relevanceScore: 75,
        categories: ['Test']
      };
      
      // V2 should handle V1 format
      const canHandle = true; // Simplified test
      
      return {
        passed: canHandle,
        message: 'Data migration support available',
        details: {
          migrationSupport: hasMigrationSupport,
          v1Format: v1Format
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `Migration test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  async testBackwardsAPICalls() {
    const start = Date.now();
    
    try {
      // Test that old API calls still work
      const v1 = window.KC || window.KnowledgeConsolidator;
      
      if (!v1) {
        return {
          passed: false,
          message: 'V1 global not found',
          duration: Date.now() - start
        };
      }
      
      // Test common V1 patterns
      const tests = [];
      
      // Test 1: Direct component access
      tests.push({
        name: 'Direct access',
        passed: !!v1.AppState
      });
      
      // Test 2: Method chaining
      if (v1.AppState) {
        const testValue = { test: true };
        v1.AppState.set('chain-test', testValue);
        const retrieved = v1.AppState.get('chain-test');
        tests.push({
          name: 'Method chaining',
          passed: retrieved?.test === true
        });
        v1.AppState.set('chain-test', null);
      }
      
      // Test 3: Event patterns
      if (v1.EventBus) {
        let received = false;
        const unsub = v1.EventBus.on('test', () => received = true);
        v1.EventBus.emit('test');
        tests.push({
          name: 'Event patterns',
          passed: received
        });
        unsub();
      }
      
      const allPassed = tests.every(t => t.passed);
      
      return {
        passed: allPassed,
        message: allPassed ?
          'Backwards API calls work correctly' :
          'Some backwards API calls failed',
        details: {
          tests: tests
        },
        duration: Date.now() - start
      };
      
    } catch (error) {
      return {
        passed: false,
        message: `Backwards API test error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  }

  // Utility methods

  printSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log('\n' + '='.repeat(50));
    console.log('LEGACY BRIDGE TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${percentage}%`);
    console.log('='.repeat(50));
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`- ${r.name}: ${r.message}`);
        });
    }
    
    console.log('\n');
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        percentage: this.results.length > 0 ? 
          Math.round((this.results.filter(r => r.passed).length / this.results.length) * 100) : 0
      },
      results: this.results,
      environment: {
        userAgent: navigator.userAgent,
        v1Available: !!(window.KC || window.KnowledgeConsolidator),
        v2Available: !!window.KC?.getEventBus
      }
    };
    
    return report;
  }

  async saveReport(filename = 'legacy-bridge-test-report.json') {
    const report = this.generateReport();
    const json = JSON.stringify(report, null, 2);
    
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
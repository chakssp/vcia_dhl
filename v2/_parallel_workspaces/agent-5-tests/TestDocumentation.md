# KC V2 Test Suite Documentation

## Overview

This comprehensive test suite ensures the quality, reliability, and performance of the Knowledge Consolidator V2 system. The suite includes integration tests, unit tests, end-to-end tests, and performance benchmarks.

## Test Structure

```
agent-5-tests/
├── integration/
│   └── V1BridgeTests.js       # Tests V1-V2 integration
├── unit/
│   └── ComponentTests.js      # Unit tests for all components
├── e2e/
│   └── FullWorkflowTests.js   # End-to-end user journeys
├── performance/
│   └── BenchmarkTests.js      # Performance benchmarks
├── test-utils/               # Testing utilities
└── TestDocumentation.md      # This file
```

## Test Categories

### 1. Integration Tests (`V1BridgeTests.js`)

Tests the backwards compatibility layer and integration between V1 and V2 systems.

**Key Test Areas:**
- V1 component loading and compatibility verification
- Data migration from V1 to V2 format
- Service adaptation layer
- Backwards compatibility API
- Legacy bridge functionality
- Migration validation
- Performance with compatibility layer
- Error recovery mechanisms

**Example Test:**
```javascript
test('should migrate V1 files to V2 format', async () => {
  const migrated = await migrationScripts.migrateFiles(v1Data.files);
  expect(migrated[0].metadata.v1Id).toBe('old-file-1');
  expect(migrated[0].relevanceScore).toBe(85);
});
```

### 2. Unit Tests (`ComponentTests.js`)

Comprehensive unit tests for all V2 components.

**Components Tested:**
- **CommandPalette**: Fuzzy search, command execution, keyboard navigation
- **KeyboardShortcuts**: Shortcut parsing, key handling, chords, context
- **Logger**: Log levels, persistence, filtering, formatting
- **ExportView**: Multiple formats, error handling, options
- **APIService**: HTTP methods, caching, rate limiting, authentication
- **BatchOperations**: Batch creation, concurrency, retry logic, progress

**Example Test:**
```javascript
test('should filter commands with fuzzy search', () => {
  const results = commandPalette.fuzzySearch('opfl');
  expect(results[0].name).toBe('Open File');
});
```

### 3. End-to-End Tests (`FullWorkflowTests.js`)

Tests complete user journeys through the application.

**Workflows Tested:**
- Complete file discovery to analysis workflow
- Command palette navigation
- Real-time collaboration across sessions
- Performance under load (1000+ files)
- Full keyboard navigation
- Theme switching and accessibility
- Error handling and recovery
- External service integration (Qdrant)

**Example Test:**
```javascript
test('should complete full discovery to analysis workflow', async () => {
  await page.click('[data-test="start-discovery"]');
  await page.type('#discovery-path', '/test/documents');
  await page.click('[data-test="run-discovery"]');
  await page.waitForSelector('.discovery-complete');
  // ... continues through entire workflow
});
```

### 4. Performance Benchmarks (`BenchmarkTests.js`)

Measures system performance under various conditions.

**Benchmark Categories:**
- **File Discovery**: 1000 files in <2s, linear scaling, deep structures
- **Analysis**: Throughput, concurrent processing, consistency
- **UI Rendering**: Large lists, rapid updates, 60fps maintenance
- **Memory Management**: Leak detection, pressure handling
- **Network**: API batching, WebSocket throughput
- **Search**: Index building, query performance

**Example Benchmark:**
```javascript
test('should discover 1000 files in under 2 seconds', async () => {
  const discoveryTime = await measureDiscovery(1000);
  expect(discoveryTime).toBeLessThan(2000);
});
```

## Running Tests

### Prerequisites
```bash
npm install --save-dev jest @playwright/test
npm install --save-dev @testing-library/dom @testing-library/user-event
```

### Commands

```bash
# Run all tests
npm test

# Run specific test suite
npm test integration
npm test unit
npm test e2e
npm test performance

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run specific test file
npm test V1BridgeTests

# Run with verbose output
npm test -- --verbose
```

### Configuration

Create `jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/v2/js/$1'
  },
  collectCoverageFrom: [
    'v2/**/*.js',
    '!v2/**/*.test.js',
    '!v2/**/test-utils/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Test Utilities

### Performance Profiler
```javascript
const profiler = new PerformanceProfiler();
profiler.start('operation-name');
// ... operation ...
const profile = profiler.stop('operation-name');
console.log(profile.duration, profile.fps, profile.cpuUsage);
```

### Memory Monitor
```javascript
const monitor = new MemoryMonitor();
monitor.start();
monitor.onAlert(alert => console.log('Memory alert:', alert));
const stats = monitor.stop();
```

### Test Data Generator
```javascript
const generator = new TestDataGenerator();
const files = generator.generateFiles(1000, {
  sizeRange: [1000, 50000],
  types: ['md', 'txt', 'doc']
});
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Clean up after tests (close browsers, clear data)
- Use `beforeEach` and `afterEach` for setup/teardown

### 2. Async Testing
```javascript
// Always await async operations
await expect(asyncFunction()).resolves.toBe(expected);
await expect(asyncFunction()).rejects.toThrow(Error);
```

### 3. Mocking
```javascript
// Mock external dependencies
jest.mock('../api/APIService');
const mockAPI = {
  get: jest.fn().mockResolvedValue({ data: 'test' })
};
```

### 4. Data-Driven Tests
```javascript
test.each([
  [100, 2000],
  [500, 5000],
  [1000, 10000]
])('should process %i files in under %ims', async (count, maxTime) => {
  const duration = await processFiles(count);
  expect(duration).toBeLessThan(maxTime);
});
```

### 5. Accessibility Testing
```javascript
// Include accessibility checks
const results = await axe(container);
expect(results.violations).toHaveLength(0);
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v1
```

### Pre-commit Hook
```bash
#!/bin/sh
npm test unit -- --onlyChanged
```

## Performance Benchmarking

### Running Benchmarks
```bash
# Run all benchmarks
npm run bench

# Run specific benchmark
npm run bench -- --grep "File Discovery"

# Save results
npm run bench -- --reporter json > benchmarks/results.json
```

### Analyzing Results
```javascript
const analyzer = new BenchmarkAnalyzer();
analyzer.load('benchmarks/results.json');
analyzer.compareWithBaseline('benchmarks/baseline.json');
analyzer.generateReport();
```

## Debugging Tests

### Visual Debugging (E2E)
```javascript
// Run tests with headed browser
const browser = await Browser.launch({ headless: false });

// Add breakpoints
await page.pause();

// Take screenshots
await page.screenshot({ path: 'debug.png' });
```

### Console Logging
```javascript
// In tests
console.log('Test state:', await page.evaluate(() => window.KC.AppState.get()));

// In components
window.DEBUG = true; // Enable debug logging
```

### Performance Debugging
```javascript
// Enable performance marks
performance.mark('operation-start');
// ... operation ...
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');
```

## Test Coverage

### Target Coverage
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Viewing Coverage Report
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

### Improving Coverage
1. Identify uncovered code: `npm test -- --coverage --coverageReporters=text`
2. Add tests for edge cases
3. Test error conditions
4. Cover all branches in conditionals

## Troubleshooting

### Common Issues

1. **Flaky Tests**
   - Add proper waits: `await page.waitForSelector()`
   - Increase timeouts for slow operations
   - Check for race conditions

2. **Memory Issues**
   - Run tests in smaller batches
   - Force garbage collection between tests
   - Use `--maxWorkers=2` to limit parallelism

3. **WebSocket Tests Failing**
   - Ensure test server is running
   - Check for port conflicts
   - Add connection retry logic

### Debug Commands
```bash
# Run single test with debugging
node --inspect-brk node_modules/.bin/jest ComponentTests --runInBand

# Check for memory leaks
node --expose-gc node_modules/.bin/jest --logHeapUsage

# Profile test performance
node --prof node_modules/.bin/jest BenchmarkTests
```

## Contributing

### Adding New Tests

1. **Choose appropriate test type**
   - Unit: Testing individual functions/methods
   - Integration: Testing component interactions
   - E2E: Testing user workflows
   - Performance: Testing speed/efficiency

2. **Follow naming conventions**
   - Test files: `ComponentName.test.js`
   - Test suites: `describe('ComponentName', ...)`
   - Test cases: `test('should perform expected behavior', ...)`

3. **Write clear assertions**
   ```javascript
   // Good
   expect(result.status).toBe('success');
   expect(result.data).toHaveLength(10);
   
   // Better - with custom messages
   expect(result.status).toBe('success', 'API call should succeed');
   ```

4. **Document complex tests**
   ```javascript
   test('should handle complex scenario', async () => {
     // Arrange: Set up test data
     const testData = createComplexData();
     
     // Act: Perform operations
     const result = await complexOperation(testData);
     
     // Assert: Verify results
     expect(result).toMatchExpectedStructure();
   });
   ```

## Maintenance

### Regular Tasks
- Update test data to reflect current usage patterns
- Review and update performance benchmarks
- Prune obsolete tests
- Update dependencies and test frameworks

### Quarterly Review
- Analyze test coverage trends
- Review flaky test patterns
- Update baseline performance metrics
- Refactor test utilities as needed
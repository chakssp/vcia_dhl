/**
 * Comprehensive Test Suite for ConfidenceTracker
 * 
 * Tests all components of the confidence tracking system including
 * convergence analysis, storage persistence, and real-time updates.
 */

import ConfidenceTracker from './ConfidenceTracker.js';
import ConvergenceAnalyzer from './ConvergenceAnalyzer.js';
import TrackingStorage from './TrackingStorage.js';
import { ConfidenceMetricsInterface } from '../shared/interfaces.js';

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }
    
    async run() {
        console.log('🧪 Starting ConfidenceTracker Test Suite...\n');
        
        // Register all tests
        this.registerTests();
        
        // Run tests
        for (const test of this.tests) {
            await this.runTest(test);
        }
        
        // Display results
        this.displayResults();
    }
    
    registerTests() {
        // ConvergenceAnalyzer tests
        this.addTest('ConvergenceAnalyzer: Variance calculation', this.testVarianceCalculation);
        this.addTest('ConvergenceAnalyzer: Trend analysis', this.testTrendAnalysis);
        this.addTest('ConvergenceAnalyzer: Plateau detection', this.testPlateauDetection);
        this.addTest('ConvergenceAnalyzer: Convergence detection', this.testConvergenceDetection);
        this.addTest('ConvergenceAnalyzer: Prediction accuracy', this.testConvergencePrediction);
        
        // TrackingStorage tests
        this.addTest('TrackingStorage: IndexedDB initialization', this.testIndexedDBInit);
        this.addTest('TrackingStorage: Save and load operations', this.testSaveLoad);
        this.addTest('TrackingStorage: Compression functionality', this.testCompression);
        this.addTest('TrackingStorage: Chunking for large data', this.testChunking);
        this.addTest('TrackingStorage: LocalStorage fallback', this.testLocalStorageFallback);
        this.addTest('TrackingStorage: Quota handling', this.testQuotaHandling);
        
        // ConfidenceTracker tests
        this.addTest('ConfidenceTracker: Initialization', this.testTrackerInit);
        this.addTest('ConfidenceTracker: Start tracking', this.testStartTracking);
        this.addTest('ConfidenceTracker: Metrics update', this.testMetricsUpdate);
        this.addTest('ConfidenceTracker: Convergence history', this.testConvergenceHistory);
        this.addTest('ConfidenceTracker: Re-analysis detection', this.testReanalysisDetection);
        this.addTest('ConfidenceTracker: Performance metrics', this.testPerformanceMetrics);
        this.addTest('ConfidenceTracker: Event handling', this.testEventHandling);
        this.addTest('ConfidenceTracker: Data export', this.testDataExport);
        
        // Integration tests
        this.addTest('Integration: Full workflow', this.testFullWorkflow);
        this.addTest('Integration: Multiple files tracking', this.testMultipleFiles);
        this.addTest('Integration: Performance under load', this.testPerformanceUnderLoad);
    }
    
    addTest(name, testFn) {
        this.tests.push({ name, testFn: testFn.bind(this) });
    }
    
    async runTest(test) {
        try {
            console.log(`Running: ${test.name}`);
            await test.testFn();
            this.results.passed++;
            console.log(`✅ ${test.name}\n`);
        } catch (error) {
            this.results.failed++;
            this.results.errors.push({
                test: test.name,
                error: error.message,
                stack: error.stack
            });
            console.error(`❌ ${test.name}`);
            console.error(`   Error: ${error.message}\n`);
        }
    }
    
    displayResults() {
        console.log('\n' + '='.repeat(60));
        console.log('TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.tests.length}`);
        console.log(`Passed: ${this.results.passed} ✅`);
        console.log(`Failed: ${this.results.failed} ❌`);
        console.log(`Coverage: ${((this.results.passed / this.tests.length) * 100).toFixed(1)}%`);
        
        if (this.results.errors.length > 0) {
            console.log('\nFailed Tests:');
            this.results.errors.forEach(err => {
                console.log(`\n- ${err.test}`);
                console.log(`  ${err.error}`);
            });
        }
    }
    
    // Test implementations
    
    async testVarianceCalculation() {
        const analyzer = new ConvergenceAnalyzer();
        
        // Test with stable values
        const stableValues = [0.8, 0.81, 0.82, 0.81, 0.82];
        const variance = analyzer.calculateVariance(stableValues);
        this.assert(variance < 0.001, 'Stable values should have low variance');
        
        // Test with high variance
        const unstableValues = [0.5, 0.7, 0.4, 0.8, 0.3];
        const highVariance = analyzer.calculateVariance(unstableValues);
        this.assert(highVariance > 0.01, 'Unstable values should have high variance');
    }
    
    async testTrendAnalysis() {
        const analyzer = new ConvergenceAnalyzer();
        
        // Test increasing trend
        const increasingValues = [0.1, 0.2, 0.3, 0.4, 0.5];
        const increasingTrend = analyzer.calculateTrend(increasingValues);
        this.assert(increasingTrend.slope > 0, 'Should detect positive trend');
        this.assert(increasingTrend.rSquared > 0.9, 'Linear trend should have high R-squared');
        
        // Test flat trend
        const flatValues = [0.5, 0.51, 0.49, 0.5, 0.51];
        const flatTrend = analyzer.calculateTrend(flatValues);
        this.assert(Math.abs(flatTrend.slope) < 0.01, 'Should detect flat trend');
    }
    
    async testPlateauDetection() {
        const analyzer = new ConvergenceAnalyzer();
        
        // Test clear plateau
        const plateauValues = [0.3, 0.5, 0.7, 0.85, 0.86, 0.85, 0.86, 0.85, 0.86, 0.85];
        const plateau = analyzer.detectPlateau(plateauValues);
        this.assert(plateau.detected, 'Should detect plateau');
        this.assert(plateau.similarity > 0.95, 'Plateau should have high similarity');
        
        // Test no plateau
        const noPlateauValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
        const noPlateau = analyzer.detectPlateau(noPlateauValues);
        this.assert(!noPlateau.detected, 'Should not detect plateau in increasing values');
    }
    
    async testConvergenceDetection() {
        const analyzer = new ConvergenceAnalyzer();
        
        // Create converged history
        const convergedHistory = this.createMockHistory([
            0.6, 0.7, 0.8, 0.85, 0.86, 0.86, 0.87, 0.86, 0.87, 0.86
        ]);
        
        const analysis = analyzer.analyzeHistory(convergedHistory);
        this.assert(analysis.isConverged, 'Should detect convergence');
        this.assert(analysis.confidence > 0.7, 'Should have high confidence in convergence');
        
        // Test non-converged
        const nonConvergedHistory = this.createMockHistory([
            0.3, 0.4, 0.5, 0.6, 0.7
        ]);
        
        const nonConvergedAnalysis = analyzer.analyzeHistory(nonConvergedHistory);
        this.assert(!nonConvergedAnalysis.isConverged, 'Should not detect convergence');
    }
    
    async testConvergencePrediction() {
        const analyzer = new ConvergenceAnalyzer();
        
        // Test prediction with good trend
        const goodTrendHistory = this.createMockHistory([
            0.4, 0.5, 0.6, 0.7, 0.75, 0.78, 0.80
        ]);
        
        const iterations = analyzer.predictIterationsToConvergence(goodTrendHistory);
        this.assert(iterations > 0 && iterations < 10, 'Should predict reasonable iterations');
        
        // Test already converged
        const convergedHistory = this.createMockHistory([
            0.85, 0.86, 0.86, 0.87, 0.86
        ]);
        
        const convergedIterations = analyzer.predictIterationsToConvergence(convergedHistory);
        this.assert(convergedIterations === 0, 'Should predict 0 iterations for converged data');
    }
    
    async testIndexedDBInit() {
        const storage = new TrackingStorage();
        await storage.initialize();
        
        this.assert(storage.db !== null || !storage.isIndexedDBAvailable, 
            'Should initialize database or fall back to localStorage');
    }
    
    async testSaveLoad() {
        const storage = new TrackingStorage();
        await storage.initialize();
        
        const testData = {
            fileId: 'test-file-1',
            history: [],
            metadata: { fileName: 'test.txt' }
        };
        
        await storage.save(testData.fileId, testData);
        const loaded = await storage.load(testData.fileId);
        
        this.assert(loaded !== null, 'Should load saved data');
        this.assert(loaded.fileId === testData.fileId, 'Should preserve fileId');
        this.assert(loaded.metadata.fileName === testData.metadata.fileName, 
            'Should preserve metadata');
        
        // Cleanup
        await storage.delete(testData.fileId);
    }
    
    async testCompression() {
        const storage = new TrackingStorage();
        
        const testString = 'aaaaaabbbbbbcccccc';
        const compressed = storage.compress(testString);
        const decompressed = storage.decompress(compressed);
        
        this.assert(compressed.length < testString.length, 'Should compress repetitive data');
        this.assert(decompressed === testString, 'Should decompress correctly');
        this.assert(storage.isCompressed(compressed), 'Should detect compressed data');
    }
    
    async testChunking() {
        const storage = new TrackingStorage();
        storage.chunkSize = 100; // Small chunk size for testing
        
        const largeData = {
            fileId: 'large-file',
            content: 'x'.repeat(300) // Larger than chunk size
        };
        
        await storage.saveToLocalStorage(largeData.fileId, largeData);
        
        // Check chunks were created
        const chunkInfo = localStorage.getItem(storage.localStoragePrefix + largeData.fileId + '_chunks');
        this.assert(chunkInfo !== null, 'Should create chunk info');
        
        const loaded = await storage.loadFromLocalStorage(largeData.fileId);
        this.assert(loaded.content === largeData.content, 'Should reassemble chunks correctly');
        
        // Cleanup
        await storage.deleteFromLocalStorage(largeData.fileId);
    }
    
    async testLocalStorageFallback() {
        // Create storage with IndexedDB disabled
        const storage = new TrackingStorage();
        storage.isIndexedDBAvailable = false;
        
        const testData = {
            fileId: 'fallback-test',
            data: 'test'
        };
        
        await storage.save(testData.fileId, testData);
        const loaded = await storage.load(testData.fileId);
        
        this.assert(loaded !== null, 'Should save/load with localStorage');
        this.assert(loaded.data === testData.data, 'Should preserve data');
        
        // Cleanup
        await storage.delete(testData.fileId);
    }
    
    async testQuotaHandling() {
        const storage = new TrackingStorage();
        storage.isIndexedDBAvailable = false;
        
        // Simulate multiple files
        const files = [];
        for (let i = 0; i < 5; i++) {
            files.push({
                fileId: `quota-test-${i}`,
                history: Array(50).fill({ metrics: { overall: 0.5 } }),
                lastUpdated: new Date(Date.now() - i * 1000000)
            });
        }
        
        // Save all files
        for (const file of files) {
            await storage.save(file.fileId, file);
        }
        
        // Test cleanup
        await storage.handleQuotaExceeded();
        
        // Check that oldest files were removed
        const oldestFile = await storage.load(files[4].fileId);
        this.assert(oldestFile === null, 'Should remove oldest files');
        
        // Cleanup remaining
        for (const file of files) {
            await storage.delete(file.fileId);
        }
    }
    
    async testTrackerInit() {
        const mockEventBus = this.createMockEventBus();
        const mockAppState = this.createMockAppState();
        
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        this.assert(tracker.storage !== null, 'Should initialize storage');
        this.assert(tracker.convergenceAnalyzer !== null, 'Should initialize analyzer');
    }
    
    async testStartTracking() {
        const mockEventBus = this.createMockEventBus();
        const mockAppState = this.createMockAppState();
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        const fileData = {
            fileId: 'test-file',
            fileName: 'test.txt',
            fileSize: 1000
        };
        
        tracker.startTracking(fileData.fileId, fileData);
        
        this.assert(tracker.trackedFiles.has(fileData.fileId), 'Should track file');
        const entry = tracker.trackedFiles.get(fileData.fileId);
        this.assert(entry.metadata.fileName === fileData.fileName, 'Should store metadata');
        
        // Cleanup
        tracker.clearTracking(fileData.fileId);
    }
    
    async testMetricsUpdate() {
        const mockEventBus = this.createMockEventBus();
        const mockAppState = this.createMockAppState();
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        const fileId = 'metrics-test';
        tracker.startTracking(fileId, { fileId });
        
        const metrics = {
            fileId,
            dimensions: {
                semantic: 0.7,
                categorical: 0.8,
                structural: 0.6,
                temporal: 0.9
            },
            overall: 0.75,
            convergencePrediction: {
                willConverge: true,
                estimatedIterations: 5,
                confidence: 0.8
            },
            calculatedAt: new Date()
        };
        
        tracker.updateMetrics(fileId, metrics);
        
        const entry = tracker.trackedFiles.get(fileId);
        this.assert(entry.history.length === 1, 'Should add to history');
        this.assert(entry.history[0].metrics.overall === metrics.overall, 
            'Should store metrics correctly');
        
        // Cleanup
        tracker.clearTracking(fileId);
    }
    
    async testConvergenceHistory() {
        const mockEventBus = this.createMockEventBus();
        const mockAppState = this.createMockAppState();
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        const fileId = 'history-test';
        tracker.startTracking(fileId, { fileId });
        
        // Add multiple metrics
        for (let i = 0; i < 10; i++) {
            const metrics = this.createMockMetrics(fileId, 0.5 + i * 0.05);
            tracker.updateMetrics(fileId, metrics);
        }
        
        const history = tracker.getConvergenceHistory(fileId);
        this.assert(history.length === 10, 'Should return full history');
        this.assert(history[0].iteration === 1, 'Should number iterations correctly');
        this.assert(history[9].convergenceData !== null, 
            'Should include convergence analysis after window size');
        
        // Cleanup
        tracker.clearTracking(fileId);
    }
    
    async testReanalysisDetection() {
        const mockEventBus = this.createMockEventBus();
        const mockAppState = this.createMockAppState();
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        // Test file with low confidence
        const lowConfFile = 'low-conf-test';
        tracker.startTracking(lowConfFile, { fileId: lowConfFile });
        tracker.updateMetrics(lowConfFile, this.createMockMetrics(lowConfFile, 0.6));
        
        this.assert(tracker.needsReanalysis(lowConfFile), 
            'Should need re-analysis for low confidence');
        
        // Test converged file
        const convergedFile = 'converged-test';
        tracker.startTracking(convergedFile, { fileId: convergedFile });
        
        // Add converged data
        for (let i = 0; i < 10; i++) {
            tracker.updateMetrics(convergedFile, this.createMockMetrics(convergedFile, 0.86));
        }
        
        this.assert(!tracker.needsReanalysis(convergedFile), 
            'Should not need re-analysis for converged file');
        
        // Cleanup
        tracker.clearTracking(lowConfFile);
        tracker.clearTracking(convergedFile);
    }
    
    async testPerformanceMetrics() {
        const mockEventBus = this.createMockEventBus();
        const mockAppState = this.createMockAppState();
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        const fileId = 'perf-test';
        tracker.startTracking(fileId, { fileId });
        tracker.updateMetrics(fileId, this.createMockMetrics(fileId, 0.7));
        
        const perfMetrics = tracker.getPerformanceMetrics();
        this.assert(perfMetrics.totalUpdates > 0, 'Should track updates');
        this.assert(perfMetrics.averageUpdateTime >= 0, 'Should track update time');
        this.assert(perfMetrics.trackedFiles === 1, 'Should count tracked files');
        
        // Cleanup
        tracker.clearTracking(fileId);
    }
    
    async testEventHandling() {
        let eventFired = false;
        const mockEventBus = {
            events: new Map(),
            on: function(event, handler) {
                if (!this.events.has(event)) {
                    this.events.set(event, []);
                }
                this.events.get(event).push(handler);
            },
            emit: function(event, data) {
                if (event === 'confidence:tracking:started') {
                    eventFired = true;
                }
                if (this.events.has(event)) {
                    this.events.get(event).forEach(handler => handler(data));
                }
            }
        };
        
        const mockAppState = this.createMockAppState();
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        tracker.startTracking('event-test', { fileId: 'event-test' });
        
        this.assert(eventFired, 'Should emit tracking started event');
        
        // Cleanup
        tracker.clearTracking('event-test');
    }
    
    async testDataExport() {
        const mockEventBus = this.createMockEventBus();
        const mockAppState = this.createMockAppState();
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        const fileId = 'export-test';
        tracker.startTracking(fileId, { 
            fileId, 
            fileName: 'export.txt',
            fileSize: 5000
        });
        
        // Add some metrics
        for (let i = 0; i < 5; i++) {
            tracker.updateMetrics(fileId, this.createMockMetrics(fileId, 0.6 + i * 0.05));
        }
        
        const exported = tracker.exportTrackingData(fileId);
        
        this.assert(exported !== null, 'Should export data');
        this.assert(exported.fileId === fileId, 'Should include fileId');
        this.assert(exported.history.length === 5, 'Should include full history');
        this.assert(exported.summary.totalIterations === 5, 'Should calculate summary');
        
        // Cleanup
        tracker.clearTracking(fileId);
    }
    
    async testFullWorkflow() {
        const mockEventBus = this.createMockEventBus();
        const mockAppState = this.createMockAppState();
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        const fileId = 'workflow-test';
        
        // Start tracking
        tracker.startTracking(fileId, {
            fileId,
            fileName: 'workflow.txt',
            fileSize: 10000
        });
        
        // Simulate iterative analysis
        const targetConfidence = 0.85;
        let currentConfidence = 0.4;
        let iterations = 0;
        
        while (currentConfidence < targetConfidence && iterations < 20) {
            // Simulate improvement
            currentConfidence += (targetConfidence - currentConfidence) * 0.2;
            currentConfidence += (Math.random() - 0.5) * 0.05; // Add noise
            
            const metrics = this.createMockMetrics(fileId, currentConfidence);
            tracker.updateMetrics(fileId, metrics);
            
            iterations++;
        }
        
        // Check results
        const summary = tracker.getTrackedFilesSummary();
        const fileSummary = summary.find(f => f.fileId === fileId);
        
        this.assert(fileSummary !== null, 'Should be in summary');
        this.assert(fileSummary.iterations === iterations, 'Should track iterations');
        this.assert(fileSummary.currentConfidence >= 0.8, 'Should reach target confidence');
        
        // Export and verify
        const exported = tracker.exportTrackingData(fileId);
        this.assert(exported.convergenceData !== null, 'Should analyze convergence');
        
        // Cleanup
        tracker.clearTracking(fileId);
    }
    
    async testMultipleFiles() {
        const mockEventBus = this.createMockEventBus();
        const mockAppState = this.createMockAppState();
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        const fileCount = 10;
        const fileIds = [];
        
        // Start tracking multiple files
        for (let i = 0; i < fileCount; i++) {
            const fileId = `multi-test-${i}`;
            fileIds.push(fileId);
            
            tracker.startTracking(fileId, {
                fileId,
                fileName: `file${i}.txt`
            });
            
            // Add varying metrics
            const baseConfidence = 0.5 + (i / fileCount) * 0.4;
            tracker.updateMetrics(fileId, this.createMockMetrics(fileId, baseConfidence));
        }
        
        // Check summary
        const summary = tracker.getTrackedFilesSummary();
        this.assert(summary.length === fileCount, 'Should track all files');
        
        // Check average confidence calculation
        const avgConfidence = summary.reduce((sum, f) => sum + f.currentConfidence, 0) / fileCount;
        this.assert(avgConfidence > 0.5 && avgConfidence < 0.9, 'Should have reasonable average');
        
        // Cleanup
        for (const fileId of fileIds) {
            tracker.clearTracking(fileId);
        }
    }
    
    async testPerformanceUnderLoad() {
        const mockEventBus = this.createMockEventBus();
        const mockAppState = this.createMockAppState();
        const tracker = new ConfidenceTracker(mockEventBus, mockAppState);
        await tracker.initialize();
        
        const fileCount = 100;
        const updatesPerFile = 50;
        const startTime = Date.now();
        
        // Create many files with many updates
        for (let i = 0; i < fileCount; i++) {
            const fileId = `load-test-${i}`;
            tracker.startTracking(fileId, { fileId });
            
            for (let j = 0; j < updatesPerFile; j++) {
                const confidence = 0.5 + (j / updatesPerFile) * 0.4;
                tracker.updateMetrics(fileId, this.createMockMetrics(fileId, confidence));
            }
        }
        
        const totalTime = Date.now() - startTime;
        const totalUpdates = fileCount * updatesPerFile;
        const avgUpdateTime = totalTime / totalUpdates;
        
        console.log(`   Performance: ${totalUpdates} updates in ${totalTime}ms`);
        console.log(`   Average: ${avgUpdateTime.toFixed(2)}ms per update`);
        
        this.assert(avgUpdateTime < 100, 'Should maintain <100ms update latency');
        
        // Check memory usage
        const perfMetrics = tracker.getPerformanceMetrics();
        console.log(`   Memory usage: ${perfMetrics.memoryUsage}`);
        
        // Cleanup
        for (let i = 0; i < fileCount; i++) {
            tracker.clearTracking(`load-test-${i}`);
        }
    }
    
    // Helper methods
    
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }
    
    createMockEventBus() {
        return {
            events: new Map(),
            on: function(event, handler) {
                if (!this.events.has(event)) {
                    this.events.set(event, []);
                }
                this.events.get(event).push(handler);
            },
            emit: function(event, data) {
                if (this.events.has(event)) {
                    this.events.get(event).forEach(handler => handler(data));
                }
            }
        };
    }
    
    createMockAppState() {
        return {
            state: { files: [] },
            get: function(key) { return this.state[key]; },
            set: function(key, value) { this.state[key] = value; }
        };
    }
    
    createMockMetrics(fileId, overall) {
        return {
            fileId,
            dimensions: {
                semantic: overall + (Math.random() - 0.5) * 0.1,
                categorical: overall + (Math.random() - 0.5) * 0.1,
                structural: overall + (Math.random() - 0.5) * 0.1,
                temporal: overall + (Math.random() - 0.5) * 0.1
            },
            overall,
            convergencePrediction: {
                willConverge: overall > 0.7,
                estimatedIterations: Math.max(0, Math.floor((0.85 - overall) * 10)),
                confidence: 0.8
            },
            calculatedAt: new Date()
        };
    }
    
    createMockHistory(values) {
        return values.map((value, index) => ({
            metrics: this.createMockMetrics('test', value),
            timestamp: new Date(Date.now() - (values.length - index) * 60000),
            iteration: index + 1
        }));
    }
}

// Run tests if executed directly
if (typeof window === 'undefined') {
    const runner = new TestRunner();
    runner.run();
} else {
    // Browser environment
    window.TestRunner = TestRunner;
    
    // Auto-run tests
    document.addEventListener('DOMContentLoaded', () => {
        const runner = new TestRunner();
        runner.run();
    });
}

export default TestRunner;
/**
 * test-versioning.js - Comprehensive Test Suite for AppState Versioning
 * 
 * Tests all versioning functionality including snapshots, restoration,
 * comparison, and memory optimization
 */

// Test utilities
const TestRunner = {
    tests: [],
    results: [],
    
    describe(description, testFn) {
        this.tests.push({ description, testFn });
    },
    
    async run() {
        console.log('🧪 Running AppState Versioning Tests...\n');
        
        for (const test of this.tests) {
            try {
                console.log(`📋 ${test.description}`);
                await test.testFn();
                this.results.push({ test: test.description, status: 'PASS' });
                console.log('✅ PASS\n');
            } catch (error) {
                this.results.push({ test: test.description, status: 'FAIL', error: error.message });
                console.error(`❌ FAIL: ${error.message}\n`);
            }
        }
        
        this.showSummary();
    },
    
    showSummary() {
        console.log('📊 Test Summary:');
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Total: ${this.results.length}`);
        console.log(`🎯 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    },
    
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    },
    
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    },
    
    assertDeepEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Objects not equal`);
        }
    }
};

// Test cases
TestRunner.describe('DeltaCompression - Basic Delta Creation', () => {
    const compression = new DeltaCompression();
    
    const oldState = {
        name: 'test',
        value: 42,
        nested: { a: 1, b: 2 }
    };
    
    const newState = {
        name: 'test-modified',
        value: 42,
        nested: { a: 1, b: 3, c: 4 },
        newProp: 'added'
    };
    
    const delta = compression.createDelta(oldState, newState);
    
    TestRunner.assert(delta.additions['newProp'] === 'added', 'Should detect additions');
    TestRunner.assert(delta.modifications['name'].new === 'test-modified', 'Should detect modifications');
    TestRunner.assert(delta.modifications['nested.b'].new === 3, 'Should detect nested modifications');
    TestRunner.assert(delta.additions['nested.c'] === 4, 'Should detect nested additions');
});

TestRunner.describe('DeltaCompression - Apply Delta', () => {
    const compression = new DeltaCompression();
    
    const baseState = { a: 1, b: 2, c: { d: 3 } };
    const targetState = { a: 1, b: 5, c: { d: 3, e: 4 }, f: 6 };
    
    const delta = compression.createDelta(baseState, targetState);
    const reconstructed = compression.applyDelta(baseState, delta);
    
    TestRunner.assertDeepEqual(reconstructed, targetState, 'Should reconstruct state from delta');
});

TestRunner.describe('DeltaCompression - Compression Efficiency', () => {
    const compression = new DeltaCompression();
    
    // Large state with small change
    const largeState = {};
    for (let i = 0; i < 100; i++) {
        largeState[`prop${i}`] = { value: i, data: 'x'.repeat(100) };
    }
    
    const modifiedState = { ...largeState, prop50: { value: 999, data: 'modified' } };
    
    const delta = compression.createDelta(largeState, modifiedState);
    
    TestRunner.assert(delta.metadata.compressionRatio > 0.95, 'Should achieve >95% compression for small changes');
    TestRunner.assertEqual(Object.keys(delta.modifications).length, 1, 'Should only have one modification');
});

TestRunner.describe('VersionedAppState - Create Snapshot', () => {
    const versioned = new VersionedAppState('test-file');
    
    const state = {
        content: 'test content',
        metadata: { author: 'test', date: Date.now() }
    };
    
    const versionId = versioned.createSnapshot(state, { reason: 'initial' });
    
    TestRunner.assert(versionId.startsWith('v_test-file_'), 'Should generate proper version ID');
    TestRunner.assertEqual(versioned.getAllVersions().length, 1, 'Should have one version');
    TestRunner.assertEqual(versioned.metadata.totalSnapshots, 1, 'Should update snapshot count');
});

TestRunner.describe('VersionedAppState - Restore Version', () => {
    const versioned = new VersionedAppState('test-file');
    
    const state1 = { version: 1, data: 'first' };
    const state2 = { version: 2, data: 'second' };
    
    const v1 = versioned.createSnapshot(state1);
    const v2 = versioned.createSnapshot(state2);
    
    const restored = versioned.restoreVersion(v1);
    
    TestRunner.assertDeepEqual(restored, state1, 'Should restore first version');
    TestRunner.assertEqual(versioned.metadata.totalRestores, 1, 'Should update restore count');
});

TestRunner.describe('VersionedAppState - Version Comparison', () => {
    const versioned = new VersionedAppState('test-file');
    
    const state1 = { a: 1, b: 2 };
    const state2 = { a: 1, b: 3, c: 4 };
    
    const v1 = versioned.createSnapshot(state1);
    const v2 = versioned.createSnapshot(state2);
    
    const changeSet = versioned.compareVersions(v1, v2);
    
    TestRunner.assertEqual(changeSet.additions.length, 1, 'Should have one addition');
    TestRunner.assertEqual(changeSet.modifications.length, 1, 'Should have one modification');
    TestRunner.assertEqual(changeSet.deletions.length, 0, 'Should have no deletions');
    TestRunner.assert(changeSet.summary.includes('2 changes'), 'Summary should mention 2 changes');
});

TestRunner.describe('VersionedAppState - Max Versions Cleanup', () => {
    const versioned = new VersionedAppState('test-file');
    versioned.maxVersions = 5; // Set low for testing
    
    // Create more than max versions
    for (let i = 0; i < 7; i++) {
        versioned.createSnapshot({ iteration: i });
    }
    
    TestRunner.assertEqual(versioned.getAllVersions().length, 5, 'Should maintain max versions');
    
    // Verify oldest were removed
    const versions = versioned.getAllVersions();
    TestRunner.assertEqual(versions[0].metadata.iteration, 2, 'Should remove oldest versions');
});

TestRunner.describe('VersionedAppState - Convergence History', () => {
    const versioned = new VersionedAppState('test-file');
    
    // Simulate converging changes
    const states = [
        { values: [1, 2, 3, 4, 5] },
        { values: [1, 2, 3, 4, 6] }, // 1 change
        { values: [1, 2, 3, 4, 6] }, // 0 changes (converged)
    ];
    
    states.forEach(state => versioned.createSnapshot(state));
    
    const history = versioned.getConvergenceHistory();
    
    TestRunner.assertEqual(history.length, 2, 'Should have 2 transitions');
    TestRunner.assert(history[1].convergenceMetrics.isConverging, 'Should detect convergence');
});

TestRunner.describe('AppStateExtension - Integration with KC.AppState', async () => {
    // Mock KC.AppState for testing
    window.KC = {
        AppState: {
            state: { test: 'data' },
            get(path) { return this.state[path]; },
            set(path, value) { this.state[path] = value; },
            update(updates) { Object.assign(this.state, updates); },
            export() { return { state: this.state }; },
            import(data) { this.state = data.state; }
        },
        EventBus: {
            on() {},
            emit() {}
        },
        Events: {},
        Logger: {
            success() {},
            info() {}
        }
    };
    
    // Wait for extension to initialize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Test snapshot creation
    const versionId = KC.AppState.createSnapshot({ reason: 'test' });
    TestRunner.assert(versionId !== null, 'Should create snapshot');
    
    // Test version listing
    const versions = KC.AppState.getAllVersions();
    TestRunner.assert(versions.length > 0, 'Should have versions');
});

TestRunner.describe('AppStateExtension - Auto Snapshot', async () => {
    const extension = window.AppStateExtension;
    
    // Configure for quick auto-snapshot
    extension.configure({
        autoSnapshot: true,
        snapshotInterval: 3
    });
    
    // Reset counter
    extension.changeCounter = 0;
    
    // Make changes
    KC.AppState.set('test1', 1);
    KC.AppState.set('test2', 2);
    KC.AppState.set('test3', 3); // Should trigger auto-snapshot
    
    const versions = extension.getAllGlobalVersions();
    const lastVersion = versions[versions.length - 1];
    
    TestRunner.assert(lastVersion.metadata.reason === 'auto_snapshot', 'Should create auto-snapshot');
});

TestRunner.describe('Memory Optimization - Storage Size', () => {
    const versioned = new VersionedAppState('test-file');
    
    // Create large state
    const largeState = {
        data: new Array(1000).fill(0).map((_, i) => ({
            id: i,
            content: 'x'.repeat(100),
            metadata: { created: Date.now(), tags: ['a', 'b', 'c'] }
        }))
    };
    
    // Create initial snapshot
    versioned.createSnapshot(largeState);
    
    // Make small modification
    const modifiedState = JSON.parse(JSON.stringify(largeState));
    modifiedState.data[500].content = 'modified';
    
    versioned.createSnapshot(modifiedState);
    
    const stats = versioned.metadata;
    const compressionStats = versioned.compression.getStats();
    
    TestRunner.assert(stats.storageUsed < 2 * JSON.stringify(largeState).length, 
        'Storage should be less than 2x original size');
    TestRunner.assert(compressionStats.averageRatio > 0.7, 
        'Should achieve >70% compression on average');
});

TestRunner.describe('Performance - Snapshot Creation Time', async () => {
    const versioned = new VersionedAppState('perf-test');
    
    const state = {
        files: new Array(100).fill(0).map((_, i) => ({
            id: `file-${i}`,
            content: `Content ${i}`,
            metadata: { size: i * 1000 }
        }))
    };
    
    const times = [];
    
    for (let i = 0; i < 10; i++) {
        const start = performance.now();
        versioned.createSnapshot(state);
        times.push(performance.now() - start);
        
        // Modify state slightly
        state.files[i].content = `Modified ${i}`;
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    
    TestRunner.assert(avgTime < 50, `Average snapshot time (${avgTime.toFixed(2)}ms) should be <50ms`);
});

TestRunner.describe('Error Handling - Invalid Version ID', () => {
    const versioned = new VersionedAppState('test-file');
    
    try {
        versioned.restoreVersion('invalid-version-id');
        TestRunner.assert(false, 'Should throw error');
    } catch (error) {
        TestRunner.assert(error.message.includes('not found'), 'Should throw meaningful error');
    }
});

TestRunner.describe('Export/Import Version History', () => {
    const versioned = new VersionedAppState('test-file');
    
    // Create some history
    versioned.createSnapshot({ v: 1 });
    versioned.createSnapshot({ v: 2 });
    versioned.createSnapshot({ v: 3 });
    
    const exported = versioned.exportHistory();
    
    TestRunner.assertEqual(exported.fileId, 'test-file', 'Should export file ID');
    TestRunner.assertEqual(exported.versions.length, 3, 'Should export all versions');
    TestRunner.assert(exported.performanceStats !== undefined, 'Should include performance stats');
    TestRunner.assert(exported.compressionStats !== undefined, 'Should include compression stats');
});

// Additional test cases for 90%+ coverage

TestRunner.describe('DeltaCompression - Edge Cases', () => {
    const compression = new DeltaCompression();
    
    // Test null and undefined handling
    const nullState = { a: null, b: undefined, c: 'value' };
    const modifiedNull = { a: 'notNull', b: null, c: 'value' };
    
    const delta = compression.createDelta(nullState, modifiedNull);
    const reconstructed = compression.applyDelta(nullState, delta);
    
    TestRunner.assertDeepEqual(reconstructed, modifiedNull, 'Should handle null/undefined correctly');
});

TestRunner.describe('DeltaCompression - Array Handling', () => {
    const compression = new DeltaCompression();
    
    const arrayState = { items: [1, 2, 3], nested: { arr: ['a', 'b'] } };
    const modifiedArray = { items: [1, 2, 3, 4], nested: { arr: ['a', 'c'] } };
    
    const delta = compression.createDelta(arrayState, modifiedArray);
    TestRunner.assert(delta.modifications['items'] !== undefined, 'Should detect array changes');
    TestRunner.assert(delta.modifications['nested.arr'] !== undefined, 'Should detect nested array changes');
});

TestRunner.describe('DeltaCompression - Deep Nesting', () => {
    const compression = new DeltaCompression();
    
    const deepState = {
        level1: {
            level2: {
                level3: {
                    level4: {
                        value: 'deep'
                    }
                }
            }
        }
    };
    
    const modifiedDeep = JSON.parse(JSON.stringify(deepState));
    modifiedDeep.level1.level2.level3.level4.value = 'modified';
    modifiedDeep.level1.level2.level3.newProp = 'added';
    
    const delta = compression.createDelta(deepState, modifiedDeep);
    TestRunner.assertEqual(Object.keys(delta.modifications).length, 1, 'Should track deep modifications');
    TestRunner.assertEqual(Object.keys(delta.additions).length, 1, 'Should track deep additions');
});

TestRunner.describe('VersionedAppState - Error Scenarios', () => {
    const versioned = new VersionedAppState('test-errors');
    
    // Test invalid version restore
    try {
        versioned.restoreVersion('non-existent-version');
        TestRunner.assert(false, 'Should throw error for non-existent version');
    } catch (error) {
        TestRunner.assert(error.message.includes('not found'), 'Should have descriptive error');
    }
    
    // Test comparison with invalid versions
    try {
        versioned.compareVersions('invalid1', 'invalid2');
        TestRunner.assert(false, 'Should throw error for invalid versions');
    } catch (error) {
        TestRunner.assert(error.message.includes('not found'), 'Should handle invalid comparison');
    }
});

TestRunner.describe('VersionedAppState - Version Chain Integrity', () => {
    const versioned = new VersionedAppState('test-chain');
    
    // Create a chain of versions
    const states = [];
    const versionIds = [];
    
    for (let i = 0; i < 5; i++) {
        const state = { iteration: i, data: `state-${i}` };
        states.push(state);
        versionIds.push(versioned.createSnapshot(state));
    }
    
    // Verify each version can be restored correctly
    for (let i = 0; i < 5; i++) {
        const restored = versioned.restoreVersion(versionIds[i]);
        TestRunner.assertDeepEqual(restored, states[i], `Should restore version ${i} correctly`);
    }
    
    // Verify delta chain integrity
    const firstVersion = versioned.versions.get(versionIds[0]);
    TestRunner.assertEqual(firstVersion.type, 'full', 'First version should be full snapshot');
});

TestRunner.describe('VersionedAppState - Performance Tracking', () => {
    const versioned = new VersionedAppState('test-performance');
    
    // Create multiple snapshots to generate performance data
    for (let i = 0; i < 10; i++) {
        versioned.createSnapshot({ index: i });
    }
    
    const perfStats = versioned.getPerformanceStats();
    
    TestRunner.assert(perfStats.snapshotTimes !== undefined, 'Should have snapshot times');
    TestRunner.assert(perfStats.snapshotTimes.average > 0, 'Should have positive average time');
    TestRunner.assert(perfStats.snapshotTimes.samples === 10, 'Should have correct sample count');
});

TestRunner.describe('VersionedAppState - Metadata Tracking', () => {
    const versioned = new VersionedAppState('test-metadata');
    
    const initialMetadata = { ...versioned.metadata };
    
    // Create snapshots with custom metadata
    versioned.createSnapshot({ test: 1 }, { author: 'test-user', tags: ['test'] });
    versioned.createSnapshot({ test: 2 }, { author: 'test-user', tags: ['test', 'v2'] });
    
    TestRunner.assert(versioned.metadata.totalSnapshots === 2, 'Should track snapshot count');
    TestRunner.assert(versioned.metadata.lastModified > initialMetadata.lastModified, 'Should update last modified');
    
    // Test metadata in versions
    const versions = versioned.getAllVersions();
    TestRunner.assertEqual(versions[0].metadata.author, 'test-user', 'Should preserve custom metadata');
});

TestRunner.describe('VersionedAppState - Clear History', () => {
    const versioned = new VersionedAppState('test-clear');
    
    // Create some versions
    versioned.createSnapshot({ data: 1 });
    versioned.createSnapshot({ data: 2 });
    
    TestRunner.assertEqual(versioned.getAllVersions().length, 2, 'Should have 2 versions');
    
    // Clear history
    versioned.clearHistory();
    
    TestRunner.assertEqual(versioned.getAllVersions().length, 0, 'Should have no versions after clear');
    TestRunner.assertEqual(versioned.metadata.totalSnapshots, 0, 'Should reset metadata');
    TestRunner.assertEqual(versioned.currentVersionIndex, -1, 'Should reset current version index');
});

TestRunner.describe('AppStateExtension - File Versioning', () => {
    const extension = window.AppStateExtension;
    
    // Mock file data
    const fileId = 'test-file-001';
    const fileData = {
        id: fileId,
        name: 'test.md',
        content: 'original content',
        metadata: { size: 100 }
    };
    
    // Set up mock state
    KC.AppState.state = { files: [fileData] };
    
    // Create file snapshot
    const versionId = KC.AppState.createFileSnapshot(fileId, { reason: 'test' });
    TestRunner.assert(versionId !== null, 'Should create file snapshot');
    
    // Get file versions
    const fileVersions = KC.AppState.getFileVersions(fileId);
    TestRunner.assert(fileVersions.length > 0, 'Should have file versions');
    
    // Modify and restore
    KC.AppState.state.files[0].content = 'modified content';
    KC.AppState.restoreFileVersion(fileId, versionId);
    
    TestRunner.assertEqual(
        KC.AppState.state.files[0].content, 
        'original content', 
        'Should restore file content'
    );
});

TestRunner.describe('AppStateExtension - Configuration', () => {
    const extension = window.AppStateExtension;
    
    // Test configuration
    const config = KC.AppState.configureVersioning({
        autoSnapshot: false,
        snapshotInterval: 10,
        enableFileVersioning: false
    });
    
    TestRunner.assertEqual(config.autoSnapshot, false, 'Should update auto snapshot setting');
    TestRunner.assertEqual(config.snapshotInterval, 10, 'Should update snapshot interval');
    TestRunner.assertEqual(config.enableFileVersioning, false, 'Should update file versioning');
    
    // Reset to defaults
    KC.AppState.configureVersioning({
        autoSnapshot: true,
        snapshotInterval: 5,
        enableFileVersioning: true
    });
});

TestRunner.describe('AppStateExtension - Versioning Stats', () => {
    const stats = KC.AppState.getVersioningStats();
    
    TestRunner.assert(stats.global !== undefined, 'Should have global stats');
    TestRunner.assert(stats.files !== undefined, 'Should have file stats');
    TestRunner.assert(stats.config !== undefined, 'Should have config in stats');
    TestRunner.assert(typeof stats.files.averageVersionsPerFile === 'number', 'Should calculate averages');
});

TestRunner.describe('Integration - Event Emission', () => {
    let snapshotEventFired = false;
    let restoreEventFired = false;
    
    // Mock event listeners
    KC.EventBus.emit = function(event, data) {
        if (event === 'appstate:snapshot:created') snapshotEventFired = true;
        if (event === 'appstate:version:restored') restoreEventFired = true;
    };
    
    const versioned = new VersionedAppState('test-events');
    const versionId = versioned.createSnapshot({ test: true });
    versioned.restoreVersion(versionId);
    
    TestRunner.assert(snapshotEventFired, 'Should emit snapshot created event');
    TestRunner.assert(restoreEventFired, 'Should emit version restored event');
});

TestRunner.describe('Memory Management - Large State Handling', () => {
    const versioned = new VersionedAppState('test-large');
    versioned.maxVersions = 3; // Low limit for testing
    
    // Create large states that vary slightly
    const largeBase = { data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: 'x'.repeat(100) })) };
    
    const versionIds = [];
    for (let i = 0; i < 5; i++) {
        const state = JSON.parse(JSON.stringify(largeBase));
        state.data[500].value = `modified-${i}`;
        versionIds.push(versioned.createSnapshot(state));
    }
    
    // Should only have 3 versions
    TestRunner.assertEqual(versioned.getAllVersions().length, 3, 'Should maintain max versions limit');
    
    // Should still be able to restore latest versions
    const latestVersion = versioned.restoreVersion(versionIds[4]);
    TestRunner.assertEqual(latestVersion.data[500].value, 'modified-4', 'Should restore latest version correctly');
});

TestRunner.describe('Export/Import - Complete State', () => {
    const versioned = new VersionedAppState('test-export');
    
    // Create rich history
    versioned.createSnapshot({ v: 1 }, { author: 'user1' });
    versioned.createSnapshot({ v: 2 }, { author: 'user2' });
    versioned.createSnapshot({ v: 3 }, { author: 'user3' });
    
    const exported = versioned.exportHistory();
    
    TestRunner.assertEqual(exported.fileId, 'test-export', 'Should export file ID');
    TestRunner.assert(exported.convergenceHistory.length === 2, 'Should include convergence history');
    TestRunner.assert(exported.performanceStats.snapshotTimes !== undefined, 'Should include performance stats');
    TestRunner.assert(exported.compressionStats.totalCompressions > 0, 'Should include compression stats');
});

// Run all tests
if (typeof window !== 'undefined') {
    // Browser environment
    window.addEventListener('load', () => {
        TestRunner.run();
    });
} else {
    // Node.js environment
    TestRunner.run();
}
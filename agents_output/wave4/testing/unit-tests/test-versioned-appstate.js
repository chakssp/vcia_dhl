/**
 * Unit Tests for VersionedAppState
 * 
 * Tests for the versioned state management system with delta compression
 * and change tracking capabilities.
 */

import VersionedAppState from '../../../wave1/appstate/VersionedAppState.js';
import DeltaCompression from '../../../wave1/appstate/DeltaCompression.js';

export default class TestVersionedAppState {
    constructor() {
        this.type = 'unit';
        this.name = 'VersionedAppState Unit Tests';
        this.appState = null;
    }
    
    async setup(helpers, mocks) {
        this.helpers = helpers;
        this.mocks = mocks;
        this.appState = null;
    }
    
    async teardown() {
        if (this.appState) {
            this.appState.clear();
        }
        this.appState = null;
    }
    
    getTests() {
        return [
            // Initialization Tests
            {
                name: 'should initialize with file ID',
                fn: async (ctx) => {
                    const fileId = 'test-file-1';
                    const appState = new VersionedAppState(fileId);
                    
                    ctx.assertEqual(appState.fileId, fileId);
                    ctx.assertEqual(appState.versions.length, 0, 'Should start with no versions');
                    ctx.assertEqual(appState.currentVersion, -1, 'Current version should be -1');
                    ctx.assertEqual(appState.maxVersions, 10, 'Default max versions should be 10');
                }
            },
            
            {
                name: 'should initialize with custom configuration',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file', {
                        maxVersions: 20,
                        compressionEnabled: true,
                        autoSave: false
                    });
                    
                    ctx.assertEqual(appState.maxVersions, 20);
                    ctx.assert(appState.config.compressionEnabled);
                    ctx.assert(!appState.config.autoSave);
                }
            },
            
            // Snapshot Creation Tests
            {
                name: 'should create initial snapshot',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-2');
                    const initialState = {
                        content: 'Test content',
                        categories: ['test'],
                        confidence: 0.5
                    };
                    
                    const versionId = appState.createSnapshot(initialState, {
                        agent: 'test',
                        reason: 'Initial state'
                    });
                    
                    ctx.assert(versionId, 'Should return version ID');
                    ctx.assertEqual(appState.versions.length, 1);
                    ctx.assertEqual(appState.currentVersion, 0);
                    
                    const version = appState.getCurrentVersion();
                    ctx.assertDeepEqual(version.state, initialState);
                    ctx.assertEqual(version.metadata.agent, 'test');
                }
            },
            
            {
                name: 'should create subsequent snapshots with deltas',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-3');
                    
                    // Initial state
                    const state1 = {
                        content: 'Initial content',
                        categories: ['category1'],
                        confidence: 0.5
                    };
                    appState.createSnapshot(state1);
                    
                    // Modified state
                    const state2 = {
                        content: 'Modified content',
                        categories: ['category1', 'category2'],
                        confidence: 0.7
                    };
                    appState.createSnapshot(state2);
                    
                    ctx.assertEqual(appState.versions.length, 2);
                    ctx.assertEqual(appState.currentVersion, 1);
                    
                    // Check delta is stored
                    const version2 = appState.versions[1];
                    ctx.assert(version2.delta, 'Should store delta for subsequent versions');
                    ctx.assert(!version2.state, 'Should not store full state when delta is used');
                }
            },
            
            // Version Navigation Tests
            {
                name: 'should navigate between versions',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-4');
                    
                    // Create multiple versions
                    const states = [
                        { value: 1, text: 'First' },
                        { value: 2, text: 'Second' },
                        { value: 3, text: 'Third' }
                    ];
                    
                    states.forEach(state => appState.createSnapshot(state));
                    
                    // Test navigation
                    const current = appState.getCurrentState();
                    ctx.assertEqual(current.value, 3);
                    
                    const previous = appState.getPreviousVersion();
                    ctx.assertEqual(previous.state.value, 2);
                    
                    const next = appState.getNextVersion();
                    ctx.assertEqual(next.state.value, 3);
                    
                    // Navigate to specific version
                    appState.goToVersion(0);
                    ctx.assertEqual(appState.getCurrentState().value, 1);
                }
            },
            
            {
                name: 'should restore specific version',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-5');
                    
                    // Create versions
                    appState.createSnapshot({ count: 1 });
                    const v2Id = appState.createSnapshot({ count: 2 });
                    appState.createSnapshot({ count: 3 });
                    
                    ctx.assertEqual(appState.getCurrentState().count, 3);
                    
                    // Restore version 2
                    const restored = appState.restoreVersion(v2Id);
                    
                    ctx.assert(restored);
                    ctx.assertEqual(appState.getCurrentState().count, 2);
                    ctx.assertEqual(appState.currentVersion, 1);
                }
            },
            
            // Change Tracking Tests
            {
                name: 'should track changes between versions',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-6');
                    
                    const state1 = {
                        title: 'Original',
                        tags: ['tag1'],
                        metadata: { author: 'user1' }
                    };
                    const v1 = appState.createSnapshot(state1);
                    
                    const state2 = {
                        title: 'Modified',
                        tags: ['tag1', 'tag2'],
                        metadata: { author: 'user1', editor: 'user2' },
                        newField: 'added'
                    };
                    const v2 = appState.createSnapshot(state2);
                    
                    const changes = appState.compareVersions(v1, v2);
                    
                    ctx.assert(changes.modifications.length > 0, 'Should detect modifications');
                    ctx.assert(changes.additions.length > 0, 'Should detect additions');
                    
                    // Check specific changes
                    const titleChange = changes.modifications.find(m => m.path === 'title');
                    ctx.assert(titleChange);
                    ctx.assertEqual(titleChange.oldValue, 'Original');
                    ctx.assertEqual(titleChange.newValue, 'Modified');
                    
                    const newFieldAddition = changes.additions.find(a => a.path === 'newField');
                    ctx.assert(newFieldAddition);
                    ctx.assertEqual(newFieldAddition.value, 'added');
                }
            },
            
            // Version Limit Tests
            {
                name: 'should maintain version limit',
                fn: async (ctx) => {
                    const maxVersions = 5;
                    const appState = new VersionedAppState('test-file-7', { maxVersions });
                    
                    // Create more versions than limit
                    for (let i = 0; i < maxVersions + 3; i++) {
                        appState.createSnapshot({ iteration: i });
                    }
                    
                    ctx.assertEqual(appState.versions.length, maxVersions);
                    
                    // Should keep most recent versions
                    const oldestVersion = appState.versions[0];
                    ctx.assert(oldestVersion.state.iteration >= 3, 
                        'Should remove oldest versions');
                }
            },
            
            // Compression Tests
            {
                name: 'should compress large states',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-8', {
                        compressionEnabled: true,
                        compressionThreshold: 1000
                    });
                    
                    const largeState = {
                        content: this.helpers.generateContent(5000),
                        embeddings: this.helpers.generateEmbeddings(768),
                        metadata: {
                            tags: Array(100).fill('tag'),
                            categories: Array(50).fill('category')
                        }
                    };
                    
                    const versionId = appState.createSnapshot(largeState);
                    const version = appState.versions[0];
                    
                    ctx.assert(version.compressed, 'Large state should be compressed');
                    ctx.assert(version.compressedSize < version.originalSize, 
                        'Compressed size should be smaller');
                    
                    // Should decompress correctly
                    const retrieved = appState.getCurrentState();
                    ctx.assertEqual(retrieved.content, largeState.content);
                }
            },
            
            // Delta Compression Tests
            {
                name: 'should use delta compression efficiently',
                fn: async (ctx) => {
                    const compression = new DeltaCompression();
                    
                    const original = {
                        a: 1,
                        b: { c: 2, d: 3 },
                        e: [1, 2, 3]
                    };
                    
                    const modified = {
                        a: 1, // unchanged
                        b: { c: 4, d: 3 }, // c modified
                        e: [1, 2, 3, 4], // item added
                        f: 'new' // new field
                    };
                    
                    const delta = compression.createDelta(original, modified);
                    
                    ctx.assert(delta.modifications.length === 1, 'Should have 1 modification');
                    ctx.assert(delta.additions.length === 2, 'Should have 2 additions');
                    ctx.assert(delta.deletions.length === 0, 'Should have no deletions');
                    
                    // Apply delta
                    const reconstructed = compression.applyDelta(original, delta);
                    ctx.assertDeepEqual(reconstructed, modified, 'Delta should reconstruct correctly');
                }
            },
            
            // Search and Filter Tests
            {
                name: 'should search through version history',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-9');
                    
                    // Create versions with different metadata
                    appState.createSnapshot({ value: 1 }, { agent: 'bot1', tag: 'initial' });
                    appState.createSnapshot({ value: 2 }, { agent: 'bot2', tag: 'update' });
                    appState.createSnapshot({ value: 3 }, { agent: 'bot1', tag: 'fix' });
                    appState.createSnapshot({ value: 4 }, { agent: 'bot3', tag: 'update' });
                    
                    // Search by agent
                    const bot1Versions = appState.findVersions(v => v.metadata.agent === 'bot1');
                    ctx.assertEqual(bot1Versions.length, 2);
                    
                    // Search by tag
                    const updateVersions = appState.findVersions(v => v.metadata.tag === 'update');
                    ctx.assertEqual(updateVersions.length, 2);
                }
            },
            
            // Performance Metrics Tests
            {
                name: 'should track performance metrics',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-10');
                    
                    // Create versions and track time
                    const startTime = Date.now();
                    
                    for (let i = 0; i < 10; i++) {
                        appState.createSnapshot({ 
                            iteration: i,
                            data: this.helpers.generateMockAnalysisData()
                        });
                    }
                    
                    const metrics = appState.getMetrics();
                    
                    ctx.assert(metrics.totalVersions === 10);
                    ctx.assert(metrics.totalSize > 0);
                    ctx.assert(metrics.compressionRatio >= 0 && metrics.compressionRatio <= 1);
                    ctx.assert(metrics.averageVersionSize > 0);
                    ctx.assert(Array.isArray(metrics.versionTimestamps));
                }
            },
            
            // Error Handling Tests
            {
                name: 'should handle invalid version IDs',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-11');
                    appState.createSnapshot({ test: true });
                    
                    const result = appState.restoreVersion('invalid-id');
                    ctx.assert(!result, 'Should return false for invalid version ID');
                    
                    const comparison = appState.compareVersions('invalid-1', 'invalid-2');
                    ctx.assert(comparison === null, 'Should return null for invalid comparison');
                }
            },
            
            {
                name: 'should handle circular references in state',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-12');
                    
                    // Create circular reference
                    const state = { a: 1 };
                    state.circular = state;
                    
                    // Should handle gracefully
                    const versionId = appState.createSnapshot(state);
                    ctx.assert(versionId, 'Should create snapshot despite circular reference');
                    
                    const retrieved = appState.getCurrentState();
                    ctx.assertEqual(retrieved.a, 1);
                }
            },
            
            // Export/Import Tests
            {
                name: 'should export and import version history',
                fn: async (ctx) => {
                    const appState1 = new VersionedAppState('test-file-13');
                    
                    // Create some versions
                    appState1.createSnapshot({ v: 1 });
                    appState1.createSnapshot({ v: 2 });
                    appState1.createSnapshot({ v: 3 });
                    
                    // Export
                    const exported = appState1.export();
                    
                    // Import into new instance
                    const appState2 = new VersionedAppState('test-file-13');
                    appState2.import(exported);
                    
                    ctx.assertEqual(appState2.versions.length, 3);
                    ctx.assertEqual(appState2.getCurrentState().v, 3);
                    ctx.assertEqual(appState2.fileId, appState1.fileId);
                }
            },
            
            // Memory Management Tests
            {
                name: 'should clean up old versions to prevent memory leaks',
                fn: async (ctx) => {
                    const appState = new VersionedAppState('test-file-14', {
                        maxVersions: 5,
                        compressionEnabled: true
                    });
                    
                    // Create many large versions
                    for (let i = 0; i < 20; i++) {
                        const largeState = {
                            iteration: i,
                            largeData: this.helpers.generateContent(10000),
                            embeddings: this.helpers.generateEmbeddings(768)
                        };
                        appState.createSnapshot(largeState);
                    }
                    
                    ctx.assertEqual(appState.versions.length, 5, 'Should maintain version limit');
                    
                    // Check memory usage (approximate)
                    const metrics = appState.getMetrics();
                    ctx.assert(metrics.totalSize < 500000, 
                        'Memory usage should be controlled through compression and limits');
                }
            }
        ];
    }
}

// Export for test framework
export { TestVersionedAppState };
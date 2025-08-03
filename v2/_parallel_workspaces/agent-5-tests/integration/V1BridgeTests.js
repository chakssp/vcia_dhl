/**
 * Integration Tests for V1-V2 Bridge
 * Tests the backwards compatibility and integration layer
 */

import { expect } from '../test-utils/TestFramework.js';
import { V1IntegrationLoader } from '../../agent-2-integration/V1IntegrationLoader.js';
import { MigrationScripts } from '../../agent-2-integration/MigrationScripts.js';
import { V1ServiceAdapters } from '../../agent-2-integration/V1ServiceAdapters.js';
import { BackwardsCompatibility } from '../../agent-2-integration/BackwardsCompatibility.js';
import { LegacyBridge } from '../../js/core/LegacyBridge.js';

describe('V1-V2 Bridge Integration Tests', () => {
  let v1Loader;
  let migrationScripts;
  let serviceAdapters;
  let compatibility;
  let bridge;

  beforeEach(async () => {
    // Initialize components
    v1Loader = new V1IntegrationLoader();
    migrationScripts = new MigrationScripts();
    serviceAdapters = new V1ServiceAdapters();
    compatibility = new BackwardsCompatibility();
    bridge = new LegacyBridge();

    // Mock V1 environment
    window.KnowledgeConsolidator = {
      AppState: {
        get: jest.fn(),
        set: jest.fn()
      },
      FileRenderer: {
        renderFiles: jest.fn()
      },
      AnalysisManager: {
        analyze: jest.fn()
      }
    };
  });

  afterEach(() => {
    // Cleanup
    delete window.KnowledgeConsolidator;
    jest.clearAllMocks();
  });

  describe('V1 Component Loading', () => {
    test('should successfully load V1 components', async () => {
      const result = await v1Loader.loadV1Components();
      
      expect(result.success).toBe(true);
      expect(result.components).toContain('AppState');
      expect(result.components).toContain('FileRenderer');
      expect(result.components).toContain('AnalysisManager');
    });

    test('should handle missing V1 components gracefully', async () => {
      delete window.KnowledgeConsolidator.FileRenderer;
      
      const result = await v1Loader.loadV1Components();
      
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('FileRenderer not found');
    });

    test('should verify V1 compatibility', async () => {
      const isCompatible = await v1Loader.checkV1Compatibility();
      expect(isCompatible).toBe(true);
    });
  });

  describe('Data Migration', () => {
    const v1Data = {
      files: [
        {
          id: 'old-file-1',
          name: 'test.md',
          path: '/old/path/test.md',
          content: 'Test content',
          relevance: 85,
          categories: ['Technical', 'Documentation']
        }
      ],
      settings: {
        theme: 'dark',
        autoSave: true
      }
    };

    test('should migrate V1 files to V2 format', async () => {
      const migrated = await migrationScripts.migrateFiles(v1Data.files);
      
      expect(migrated[0]).toHaveProperty('id');
      expect(migrated[0]).toHaveProperty('metadata');
      expect(migrated[0].metadata.v1Id).toBe('old-file-1');
      expect(migrated[0].metadata.migrationDate).toBeDefined();
      expect(migrated[0].relevanceScore).toBe(85);
    });

    test('should preserve all V1 data during migration', async () => {
      const migrated = await migrationScripts.migrateFiles(v1Data.files);
      
      expect(migrated[0].name).toBe('test.md');
      expect(migrated[0].content).toBe('Test content');
      expect(migrated[0].categories).toEqual(['Technical', 'Documentation']);
    });

    test('should handle batch migration', async () => {
      const largeBatch = Array(100).fill(v1Data.files[0]);
      const migrated = await migrationScripts.migrateBatch(largeBatch);
      
      expect(migrated.length).toBe(100);
      expect(migrated.every(f => f.metadata.v1Id)).toBe(true);
    });

    test('should rollback migration on error', async () => {
      const invalidData = [{ invalid: true }];
      
      await expect(migrationScripts.migrateFiles(invalidData))
        .rejects.toThrow('Migration failed');
      
      // Verify rollback
      const state = await migrationScripts.getMigrationState();
      expect(state.status).toBe('rolled_back');
    });
  });

  describe('Service Adaptation', () => {
    test('should adapt V1 FileRenderer calls to V2', async () => {
      const v1Call = {
        method: 'renderFiles',
        args: [{ files: v1Data.files }]
      };
      
      const adapted = serviceAdapters.adaptFileRenderer(v1Call);
      
      expect(adapted.component).toBe('FileList');
      expect(adapted.method).toBe('render');
      expect(adapted.args[0].items).toBeDefined();
    });

    test('should adapt V1 AnalysisManager to V2', async () => {
      const v1Analysis = {
        fileId: 'old-file-1',
        type: 'Technical Insight',
        confidence: 0.85
      };
      
      const adapted = serviceAdapters.adaptAnalysis(v1Analysis);
      
      expect(adapted.fileId).toBe('old-file-1');
      expect(adapted.analysisType).toBe('technical_insight');
      expect(adapted.confidenceScore).toBe(85);
    });

    test('should handle V1 events in V2', async () => {
      const v1Event = {
        type: 'FILE_ANALYZED',
        data: { fileId: 'old-file-1' }
      };
      
      const eventReceived = new Promise(resolve => {
        window.addEventListener('file:analyzed', resolve);
      });
      
      serviceAdapters.adaptEvent(v1Event);
      
      const event = await eventReceived;
      expect(event.detail.fileId).toBe('old-file-1');
    });
  });

  describe('Backwards Compatibility', () => {
    test('should allow V1 API calls in V2', async () => {
      compatibility.enable();
      
      // V1 style call
      const result = await window.KC.AppState.get('files');
      
      expect(window.KnowledgeConsolidator.AppState.get).toHaveBeenCalledWith('files');
    });

    test('should translate V1 method signatures', async () => {
      const v1Method = 'analyzeFile';
      const v1Args = ['file-id', { advanced: true }];
      
      const v2Call = compatibility.translateMethodCall(v1Method, v1Args);
      
      expect(v2Call.method).toBe('analyze');
      expect(v2Call.args).toEqual({
        fileId: 'file-id',
        options: { advanced: true }
      });
    });

    test('should handle deprecated V1 features', async () => {
      const warnings = [];
      compatibility.onWarning(w => warnings.push(w));
      
      // Call deprecated method
      compatibility.callDeprecated('oldMethod');
      
      expect(warnings[0]).toContain('deprecated');
      expect(warnings[0]).toContain('oldMethod');
    });
  });

  describe('LegacyBridge Integration', () => {
    test('should initialize bridge between V1 and V2', async () => {
      const initialized = await bridge.initialize();
      
      expect(initialized).toBe(true);
      expect(bridge.v1Components).toBeDefined();
      expect(bridge.v2Components).toBeDefined();
    });

    test('should proxy V1 calls to V2', async () => {
      await bridge.initialize();
      
      const v1Result = await bridge.proxy('AppState', 'get', ['theme']);
      
      expect(v1Result).toBeDefined();
    });

    test('should maintain state synchronization', async () => {
      await bridge.initialize();
      
      // Update in V2
      await bridge.v2Components.AppState.set('theme', 'light');
      
      // Check V1
      const v1Theme = await bridge.v1Components.AppState.get('theme');
      expect(v1Theme).toBe('light');
    });

    test('should handle concurrent V1/V2 operations', async () => {
      await bridge.initialize();
      
      const operations = [];
      
      // V1 operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          bridge.v1Components.AppState.set(`key${i}`, `v1-${i}`)
        );
      }
      
      // V2 operations
      for (let i = 10; i < 20; i++) {
        operations.push(
          bridge.v2Components.AppState.set(`key${i}`, `v2-${i}`)
        );
      }
      
      await Promise.all(operations);
      
      // Verify all operations completed
      for (let i = 0; i < 20; i++) {
        const value = await bridge.v2Components.AppState.get(`key${i}`);
        expect(value).toBeDefined();
      }
    });
  });

  describe('Migration Validation', () => {
    test('should validate migrated data integrity', async () => {
      const original = v1Data.files[0];
      const migrated = await migrationScripts.migrateFile(original);
      
      const validation = await migrationScripts.validateMigration(original, migrated);
      
      expect(validation.valid).toBe(true);
      expect(validation.integrity).toBe(100);
    });

    test('should detect data loss during migration', async () => {
      const original = { ...v1Data.files[0], customField: 'important' };
      const migrated = await migrationScripts.migrateFile(original);
      delete migrated.customField;
      
      const validation = await migrationScripts.validateMigration(original, migrated);
      
      expect(validation.valid).toBe(false);
      expect(validation.missingFields).toContain('customField');
    });
  });

  describe('Performance Tests', () => {
    test('should handle large V1 datasets efficiently', async () => {
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        id: `file-${i}`,
        name: `file-${i}.md`,
        content: 'x'.repeat(10000),
        categories: ['cat1', 'cat2', 'cat3']
      }));
      
      const startTime = Date.now();
      const migrated = await migrationScripts.migrateBatch(largeDataset);
      const duration = Date.now() - startTime;
      
      expect(migrated.length).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    test('should maintain performance with V1 compatibility layer', async () => {
      compatibility.enable();
      
      const operations = [];
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        operations.push(
          window.KC.AppState.set(`perf-test-${i}`, { data: i })
        );
      }
      
      await Promise.all(operations);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Error Recovery', () => {
    test('should recover from V1 component failures', async () => {
      // Simulate V1 component failure
      window.KnowledgeConsolidator.AppState.get = jest.fn()
        .mockRejectedValue(new Error('V1 Component Error'));
      
      const result = await bridge.safeCall('AppState', 'get', ['test']);
      
      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      expect(result.error).toContain('V1 Component Error');
    });

    test('should provide fallback for missing V1 features', async () => {
      delete window.KnowledgeConsolidator.NewFeature;
      
      const fallback = compatibility.getFallback('NewFeature');
      
      expect(fallback).toBeDefined();
      expect(typeof fallback.defaultMethod).toBe('function');
    });
  });
});
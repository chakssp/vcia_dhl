/**
 * LegacyBridge - Bridge between V1 and V2 systems
 * CRITICAL: This unlocks V2 development by connecting to V1 data
 */

import ConfigManager from '../managers/ConfigManager.js';
import DiscoveryManager from '../managers/DiscoveryManager.js';

export class LegacyBridge {
  constructor() {
    this.v1 = null;
    this.syncHandlers = new Map();
    this.initialized = false;
  }
  
  /**
   * Check if V1 data exists
   */
  async checkV1Data() {
    try {
      // Check if V1 is available
      if (typeof window.KC === 'undefined' || !window.KC) {
        return false;
      }
      
      // Check if V1 has AppState
      if (!window.KC.AppState) {
        return false;
      }
      
      // Check if there's any data
      const files = window.KC.AppState.get('files');
      const categories = window.KC.AppState.get('categories');
      
      return !!(files || categories);
    } catch (error) {
      console.warn('[LegacyBridge] Error checking V1 data:', error);
      return false;
    }
  }

  /**
   * Initialize bridge with V1 system
   */
  async initialize() {
    try {
      // Check if V1 KC is available (it should be on window.KCV1 or similar)
      // For now, we'll use mock data if V1 is not available
      if (typeof window.KCV1 !== 'undefined') {
        this.v1 = window.KCV1;
        console.log('[LegacyBridge] Connected to V1 system');
      } else {
        console.warn('[LegacyBridge] V1 not found, using mock data mode');
        this.setupMockData();
      }
      
      // Setup event synchronization
      this.setupEventSync();
      
      // Setup data synchronization
      this.setupDataSync();
      
      // Setup service proxies
      this.setupServiceProxies();
      
      this.initialized = true;
      console.log('[LegacyBridge] Bridge initialized successfully');
      
      return true;
    } catch (error) {
      console.error('[LegacyBridge] Initialization failed:', error);
      // Don't throw - allow V2 to work with mock data
      this.setupMockData();
      return true;
    }
  }

  /**
   * Setup event synchronization between V1 and V2
   */
  setupEventSync() {
    if (!this.v1?.EventBus) return;
    
    // Key events to sync from V1 to V2
    const eventsToSync = [
      'FILES_UPDATED',
      'CATEGORIES_CHANGED',
      'ANALYSIS_COMPLETED',
      'STATE_CHANGED'
    ];
    
    eventsToSync.forEach(event => {
      this.v1.EventBus.on(event, (data) => {
        console.log(`[LegacyBridge] V1 Event: ${event}`, data);
        // Emit to V2 EventBus
        if (window.KC?.eventBus) {
          window.KC.eventBus.emit(`v1:${event.toLowerCase()}`, data);
        }
      });
    });
  }

  /**
   * Setup data synchronization
   */
  setupDataSync() {
    if (!this.v1?.AppState) return;
    
    // Initial sync of V1 data to V2
    this.syncV1DataToV2();
    
    // Initial data sync
    this.syncAllData();
    
    // Watch for changes - check if EventBus exists before using 'on'
    if (this.v1.EventBus && typeof this.v1.EventBus.on === 'function') {
      this.v1.EventBus.on('STATE_CHANGED', ({ key, newValue }) => {
        this.syncData(key, newValue);
      });
    } else {
      console.warn('[LegacyBridge] V1 EventBus not available for state change monitoring');
    }
  }

  /**
   * Sync all data from V1 to V2
   */
  syncAllData() {
    const keysToSync = [
      'files',
      'categories',
      'configuration',
      'stats',
      'currentStep'
    ];
    
    keysToSync.forEach(key => {
      const value = this.v1.AppState.get(key);
      if (value !== undefined) {
        this.syncData(key, value);
      }
    });
  }

  /**
   * Sync specific data from V1 to V2
   */
  syncData(key, value) {
    if (!window.KC?.appState) return;
    
    // Transform data if needed
    const transformedValue = this.transformData(key, value);
    
    // Update V2 state
    window.KC.appState.set(`v1_${key}`, transformedValue);
    
    console.log(`[LegacyBridge] Synced ${key}:`, transformedValue);
  }

  /**
   * Transform V1 data structure to V2 format
   */
  transformData(key, value) {
    switch (key) {
      case 'files':
        return this.transformFiles(value);
      case 'categories':
        return this.transformCategories(value);
      default:
        return value;
    }
  }

  /**
   * Transform V1 files to V2 format
   */
  transformFiles(files) {
    if (!Array.isArray(files)) return [];
    
    return files.map(file => ({
      id: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      content: file.content,
      preview: file.preview,
      categories: file.categories || [],
      analyzed: file.analyzed || false,
      analysisType: file.analysisType,
      analysisResult: file.analysisResult,
      relevanceScore: file.relevanceScore || 0,
      confidenceScore: file.confidenceScore || 0,
      metadata: {
        v1_handle: file.handle,
        v1_originalData: file
      }
    }));
  }

  /**
   * Transform V1 categories to V2 format
   */
  transformCategories(categories) {
    if (!Array.isArray(categories)) return [];
    
    return categories.map(cat => ({
      id: cat.id || cat.name.toLowerCase().replace(/\s+/g, '-'),
      name: cat.name,
      color: cat.color || '#4A90E2',
      boost: cat.boost || 0,
      count: cat.count || 0
    }));
  }

  /**
   * Setup service proxies to V1 services
   */
  setupServiceProxies() {
    // Proxy to QdrantService
    this.qdrantService = {
      search: async (query) => {
        if (this.v1?.QdrantService?.searchByText) {
          return await this.v1.QdrantService.searchByText(query);
        }
        return [];
      },
      
      getStats: async () => {
        if (this.v1?.QdrantService?.getStats) {
          return await this.v1.QdrantService.getStats();
        }
        return null;
      }
    };
    
    // Proxy to AnalysisManager
    this.analysisManager = {
      analyzeFile: async (file) => {
        if (this.v1?.AnalysisManager?.analyzeFile) {
          return await this.v1.AnalysisManager.analyzeFile(file);
        }
        return null;
      },
      
      getAnalysisTypes: () => {
        if (this.v1?.AnalysisTypes) {
          return Object.keys(this.v1.AnalysisTypes);
        }
        return [];
      }
    };
    
    // Proxy to EmbeddingService
    this.embeddingService = {
      generateEmbedding: async (text) => {
        if (this.v1?.EmbeddingService?.generateEmbedding) {
          return await this.v1.EmbeddingService.generateEmbedding(text);
        }
        return null;
      }
    };
  }

  /**
   * Get V1 service proxy
   */
  getService(serviceName) {
    switch (serviceName) {
      case 'qdrant':
        return this.qdrantService;
      case 'analysis':
        return this.analysisManager;
      case 'embedding':
        return this.embeddingService;
      default:
        return this.v1?.[serviceName];
    }
  }

  /**
   * Execute V1 function with V2 fallback
   */
  async executeV1Function(path, ...args) {
    // First try V2 managers
    const v2Mapping = {
      'ConfigManager.getAll': () => ConfigManager.getAll(),
      'ConfigManager.get': (key) => ConfigManager.get(key),
      'ConfigManager.set': (key, value) => ConfigManager.set(key, value),
      'DiscoveryManager.startDiscovery': (options) => DiscoveryManager.startDiscovery(options),
      'DiscoveryManager.getFiles': () => DiscoveryManager.getFiles(),
      'DiscoveryManager.getStats': () => DiscoveryManager.getStats()
    };
    
    if (v2Mapping[path]) {
      console.log(`[LegacyBridge] Using V2 implementation for ${path}`);
      return await v2Mapping[path](...args);
    }
    
    // Try V1 if available
    if (this.v1) {
      const parts = path.split('.');
      let target = this.v1;
      
      for (const part of parts) {
        target = target?.[part];
        if (!target) {
          break;
        }
      }
      
      if (target && typeof target === 'function') {
        return await target(...args);
      }
    }
    
    // Fallback to mock implementation
    console.warn(`[LegacyBridge] No implementation found for ${path}, using mock`);
    return this.getMockImplementation(path, ...args);
  }

  /**
   * Get mock implementation for missing functions
   */
  getMockImplementation(path, ...args) {
    const mockImplementations = {
      'CategoryManager.getAll': () => [
        { id: 'insights', name: 'Insights', color: '#4CAF50', count: 0 },
        { id: 'decisions', name: 'Decisões', color: '#2196F3', count: 0 },
        { id: 'technical', name: 'Técnico', color: '#FF9800', count: 0 }
      ],
      'AnalysisManager.getQueue': () => [],
      'FilterManager.getFilters': () => ({
        relevance: 50,
        timeRange: 'all',
        fileTypes: ['md', 'txt', 'doc', 'docx', 'pdf'],
        excludePatterns: []
      })
    };
    
    if (mockImplementations[path]) {
      return mockImplementations[path](...args);
    }
    
    console.warn(`[LegacyBridge] No mock implementation for ${path}`);
    return null;
  }
  
  /**
   * Setup mock data for development/testing
   */
  setupMockData() {
    // Create mock V1 structure
    this.v1 = {
      AppState: {
        data: new Map([
          ['files', this.generateMockFiles()],
          ['categories', this.generateMockCategories()],
          ['stats', { totalFiles: 42, analyzed: 28, pending: 14 }]
        ]),
        get: function(key) { return this.data.get(key); },
        set: function(key, value) { this.data.set(key, value); }
      },
      EventBus: {
        listeners: new Map(),
        on: function(event, callback) {
          if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
          }
          this.listeners.get(event).push(callback);
        },
        emit: function(event, data) {
          if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(cb => cb(data));
          }
        }
      },
      CategoryManager: {
        getCategories: () => this.v1.AppState.get('categories'),
        addCategory: (cat) => {
          const cats = this.v1.AppState.get('categories') || [];
          cats.push(cat);
          this.v1.AppState.set('categories', cats);
        }
      },
      FilterManager: {
        getActiveFilters: () => ({ relevance: 50, timeRange: 'all', fileType: 'all' })
      },
      DiscoveryManager: {
        discoverFiles: async () => {
          console.log('[Mock] Discovering files...');
          return this.generateMockFiles();
        }
      }
    };
  }

  /**
   * Generate mock files for testing
   */
  generateMockFiles() {
    return [
      {
        id: 'file-1',
        name: 'project-roadmap.md',
        path: '/documents/projects/project-roadmap.md',
        size: 15420,
        type: 'md',
        lastModified: new Date('2025-01-15').getTime(),
        content: 'Roadmap completo do projeto com milestones...',
        preview: 'Este documento apresenta o roadmap completo do projeto Knowledge Consolidator...',
        relevanceScore: 95,
        analyzed: true,
        analysisType: 'Momento Decisivo',
        categories: ['Estratégia', 'Planejamento']
      },
      {
        id: 'file-2', 
        name: 'meeting-notes-2025-01.txt',
        path: '/documents/meetings/meeting-notes-2025-01.txt',
        size: 8234,
        type: 'txt',
        lastModified: new Date('2025-01-20').getTime(),
        content: 'Notas da reunião de alinhamento...',
        preview: 'Reunião de alinhamento estratégico com definições importantes...',
        relevanceScore: 78,
        analyzed: true,
        analysisType: 'Insight Estratégico',
        categories: ['Reuniões']
      },
      {
        id: 'file-3',
        name: 'technical-architecture.md',
        path: '/documents/tech/technical-architecture.md',
        size: 32180,
        type: 'md',
        lastModified: new Date('2025-01-10').getTime(),
        content: 'Arquitetura técnica detalhada do sistema...',
        preview: 'Documento técnico com arquitetura completa, padrões e decisões...',
        relevanceScore: 92,
        analyzed: false,
        categories: ['Técnico', 'Arquitetura']
      },
      {
        id: 'file-4',
        name: 'ml-confidence-integration.pdf',
        path: '/documents/specs/ml-confidence-integration.pdf',
        size: 125000,
        type: 'pdf',
        lastModified: new Date('2025-01-25').getTime(),
        preview: 'Especificação da integração do sistema de confiança ML...',
        relevanceScore: 88,
        analyzed: false,
        categories: ['ML/AI', 'Especificações']
      }
    ];
  }

  /**
   * Generate mock categories
   */
  generateMockCategories() {
    return [
      { id: 'cat-1', name: 'Estratégia', color: '#2196F3', count: 5 },
      { id: 'cat-2', name: 'Técnico', color: '#4CAF50', count: 12 },
      { id: 'cat-3', name: 'Reuniões', color: '#FF9800', count: 8 },
      { id: 'cat-4', name: 'ML/AI', color: '#9C27B0', count: 6 },
      { id: 'cat-5', name: 'Arquitetura', color: '#00BCD4', count: 4 },
      { id: 'cat-6', name: 'Planejamento', color: '#FFC107', count: 7 },
      { id: 'cat-7', name: 'Especificações', color: '#E91E63', count: 3 }
    ];
  }

  /**
   * Sync V1 data to V2 AppState
   */
  syncV1DataToV2() {
    // Import V2 appState (avoiding circular dependency)
    import('../core/AppState.js').then(({ default: appState }) => {
      // Sync files
      const files = this.getV1Data('files') || [];
      appState.set('v1_files', files);
      
      // Sync categories
      const categories = this.getV1Data('categories') || [];
      appState.set('v1_categories', categories);
      
      console.log('[LegacyBridge] Synced V1 data to V2:', { 
        files: files.length, 
        categories: categories.length 
      });
    });
  }

  /**
   * Get V1 data
   */
  getV1Data(key) {
    return this.v1?.AppState?.get(key);
  }

  /**
   * Set V1 data (use with caution)
   */
  setV1Data(key, value) {
    if (this.v1?.AppState?.set) {
      this.v1.AppState.set(key, value);
    }
  }
}

// Create singleton instance
export const legacyBridge = new LegacyBridge();
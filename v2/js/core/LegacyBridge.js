/**
 * LegacyBridge - Bridge between V1 and V2 systems
 * CRITICAL: This unlocks V2 development by connecting to V1 data
 */

export class LegacyBridge {
  constructor() {
    this.v1 = null;
    this.syncHandlers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize bridge with V1 system
   */
  async initialize() {
    try {
      // Check if V1 KC is available
      if (typeof window.KC === 'undefined') {
        throw new Error('V1 Knowledge Consolidator not found. Please ensure V1 is loaded.');
      }
      
      this.v1 = window.KC;
      console.log('[LegacyBridge] Connected to V1 system');
      
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
      throw error;
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
    
    // Initial data sync
    this.syncAllData();
    
    // Watch for changes
    this.v1.EventBus.on('STATE_CHANGED', ({ key, newValue }) => {
      this.syncData(key, newValue);
    });
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
   * Execute V1 function
   */
  async executeV1Function(path, ...args) {
    const parts = path.split('.');
    let target = this.v1;
    
    for (const part of parts) {
      target = target?.[part];
      if (!target) {
        throw new Error(`V1 function not found: ${path}`);
      }
    }
    
    if (typeof target === 'function') {
      return await target(...args);
    }
    
    return target;
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
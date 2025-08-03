/**
 * V1 Integration Loader for KC V2
 * Loads and integrates V1 components into V2 system
 */

export class V1IntegrationLoader {
  constructor() {
    this.v1Components = {};
    this.v2Adapters = {};
    this.loaded = false;
    this.v1BasePath = '../../../'; // Path to V1 from V2
  }

  async initialize() {
    console.log('[V1Integration] Initializing V1 integration...');
    
    try {
      // Load V1 configuration
      await this.loadV1Config();
      
      // Load V1 components
      await this.loadV1Components();
      
      // Initialize adapters
      this.initializeAdapters();
      
      // Setup bridge connections
      await this.setupBridgeConnections();
      
      this.loaded = true;
      console.log('[V1Integration] V1 integration initialized successfully');
      
      return true;
    } catch (error) {
      console.error('[V1Integration] Failed to initialize:', error);
      throw error;
    }
  }

  async loadV1Config() {
    try {
      // Check if V1 globals exist
      if (window.KnowledgeConsolidator || window.KC) {
        console.log('[V1Integration] V1 globals detected');
        this.v1Components.global = window.KnowledgeConsolidator || window.KC;
      }
      
      // Load V1 configuration from localStorage
      const v1Config = localStorage.getItem('kc-config');
      if (v1Config) {
        this.v1Config = JSON.parse(v1Config);
        console.log('[V1Integration] V1 config loaded:', this.v1Config);
      }
      
      // Load V1 state
      const v1State = localStorage.getItem('kc-state');
      if (v1State) {
        this.v1State = JSON.parse(v1State);
        console.log('[V1Integration] V1 state loaded');
      }
      
    } catch (error) {
      console.error('[V1Integration] Error loading V1 config:', error);
    }
  }

  async loadV1Components() {
    const componentsToLoad = [
      'AppState',
      'EventBus',
      'DiscoveryManager',
      'FilterManager',
      'CategoryManager',
      'AnalysisManager',
      'PreviewUtils',
      'FileRenderer',
      'StatsPanel',
      'WorkflowPanel'
    ];
    
    for (const component of componentsToLoad) {
      try {
        // First try to get from global KC object
        if (window.KC && window.KC[component]) {
          this.v1Components[component] = window.KC[component];
          console.log(`[V1Integration] Loaded ${component} from window.KC`);
        } 
        // Then try from KnowledgeConsolidator
        else if (window.KnowledgeConsolidator && window.KnowledgeConsolidator[component]) {
          this.v1Components[component] = window.KnowledgeConsolidator[component];
          console.log(`[V1Integration] Loaded ${component} from window.KnowledgeConsolidator`);
        }
        // Finally try dynamic import
        else {
          await this.dynamicLoadComponent(component);
        }
      } catch (error) {
        console.warn(`[V1Integration] Could not load ${component}:`, error);
      }
    }
  }

  async dynamicLoadComponent(componentName) {
    const componentPaths = {
      'AppState': 'js/core/AppState.js',
      'EventBus': 'js/core/EventBus.js',
      'DiscoveryManager': 'js/managers/DiscoveryManager.js',
      'FilterManager': 'js/managers/FilterManager.js',
      'CategoryManager': 'js/managers/CategoryManager.js',
      'AnalysisManager': 'js/managers/AnalysisManager.js',
      'PreviewUtils': 'js/utils/PreviewUtils.js',
      'FileRenderer': 'js/components/FileRenderer.js',
      'StatsPanel': 'js/components/StatsPanel.js',
      'WorkflowPanel': 'js/components/WorkflowPanel.js'
    };
    
    const path = componentPaths[componentName];
    if (!path) return;
    
    try {
      const module = await import(`${this.v1BasePath}${path}`);
      this.v1Components[componentName] = module[componentName] || module.default;
      console.log(`[V1Integration] Dynamically loaded ${componentName}`);
    } catch (error) {
      console.warn(`[V1Integration] Failed to dynamically load ${componentName}:`, error);
    }
  }

  initializeAdapters() {
    // Create adapters for V1 components to work with V2
    this.v2Adapters = {
      AppState: new AppStateAdapter(this.v1Components.AppState),
      EventBus: new EventBusAdapter(this.v1Components.EventBus),
      FileManager: new FileManagerAdapter(this.v1Components),
      CategoryManager: new CategoryManagerAdapter(this.v1Components.CategoryManager),
      AnalysisManager: new AnalysisManagerAdapter(this.v1Components.AnalysisManager)
    };
    
    console.log('[V1Integration] Adapters initialized');
  }

  async setupBridgeConnections() {
    // Setup event forwarding between V1 and V2
    if (this.v1Components.EventBus && window.KC) {
      this.setupEventForwarding();
    }
    
    // Setup state synchronization
    if (this.v1Components.AppState && window.KC) {
      this.setupStateSynchronization();
    }
    
    // Setup data migration hooks
    this.setupDataMigration();
    
    console.log('[V1Integration] Bridge connections established');
  }

  setupEventForwarding() {
    const v1EventBus = this.v1Components.EventBus;
    const v2EventBus = window.KC.getEventBus();
    
    // Forward critical V1 events to V2
    const eventsToForward = [
      'files:discovered',
      'files:analyzed',
      'categories:updated',
      'state:changed',
      'workflow:step-changed'
    ];
    
    eventsToForward.forEach(event => {
      if (v1EventBus && v1EventBus.on) {
        v1EventBus.on(event, (data) => {
          console.log(`[V1Integration] Forwarding event ${event} to V2`);
          v2EventBus.emit(`v1:${event}`, data);
        });
      }
    });
    
    // Forward V2 events back to V1 if needed
    const v2EventsToForward = [
      'navigation:change',
      'action:discover-files',
      'action:analyze-files'
    ];
    
    v2EventsToForward.forEach(event => {
      v2EventBus.on(event, (data) => {
        if (v1EventBus && v1EventBus.emit) {
          console.log(`[V1Integration] Forwarding V2 event ${event} to V1`);
          v1EventBus.emit(event.replace(':', '-'), data);
        }
      });
    });
  }

  setupStateSynchronization() {
    const v1AppState = this.v1Components.AppState;
    const v2AppState = window.KC.getAppState();
    
    // Initial state migration
    if (v1AppState && v1AppState.getAll) {
      const v1State = v1AppState.getAll();
      console.log('[V1Integration] Migrating V1 state to V2:', v1State);
      
      // Migrate relevant state
      if (v1State.files) {
        v2AppState.set('v1Files', v1State.files);
      }
      if (v1State.categories) {
        v2AppState.set('v1Categories', v1State.categories);
      }
      if (v1State.configuration) {
        v2AppState.set('v1Config', v1State.configuration);
      }
    }
    
    // Setup ongoing synchronization
    if (v1AppState && v1AppState.subscribe) {
      v1AppState.subscribe((key, value) => {
        console.log(`[V1Integration] V1 state change: ${key}`);
        v2AppState.set(`v1:${key}`, value);
      });
    }
  }

  setupDataMigration() {
    // Create migration utilities
    this.migrationUtils = {
      migrateFiles: () => this.migrateV1Files(),
      migrateCategories: () => this.migrateV1Categories(),
      migrateAnalysis: () => this.migrateV1Analysis(),
      migrateSettings: () => this.migrateV1Settings()
    };
  }

  async migrateV1Files() {
    const v1Files = this.v1Components.AppState?.get('files') || [];
    const v2API = window.KC.getAPI();
    
    console.log(`[V1Integration] Migrating ${v1Files.length} files from V1`);
    
    const migratedFiles = v1Files.map(file => ({
      id: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
      type: file.type || this.getFileType(file.name),
      created: file.created || file.createdDate,
      modified: file.modified || file.modifiedDate,
      content: file.content,
      preview: file.preview,
      analyzed: file.analyzed || false,
      analysis: file.analysis || null,
      categories: file.categories || [],
      relevanceScore: file.relevanceScore || 0,
      v1Data: {
        originalId: file.id,
        handle: file.handle,
        migrated: new Date().toISOString()
      }
    }));
    
    // Save to V2 system
    for (const file of migratedFiles) {
      await v2API.saveFile(file);
    }
    
    return migratedFiles;
  }

  async migrateV1Categories() {
    const v1Categories = this.v1Components.CategoryManager?.getCategories() || 
                        this.v1Components.AppState?.get('categories') || [];
    
    console.log(`[V1Integration] Migrating ${v1Categories.length} categories from V1`);
    
    const v2API = window.KC.getAPI();
    
    for (const category of v1Categories) {
      await v2API.saveCategory({
        name: category.name || category,
        color: category.color || this.generateCategoryColor(category.name || category),
        description: category.description || '',
        v1Data: {
          original: category,
          migrated: new Date().toISOString()
        }
      });
    }
    
    return v1Categories;
  }

  async migrateV1Analysis() {
    const v1Files = this.v1Components.AppState?.get('files') || [];
    const analyzedFiles = v1Files.filter(f => f.analyzed && f.analysis);
    
    console.log(`[V1Integration] Migrating analysis for ${analyzedFiles.length} files`);
    
    const v2API = window.KC.getAPI();
    
    for (const file of analyzedFiles) {
      const analysis = {
        fileId: file.id,
        type: file.analysisType || 'general',
        summary: file.analysis?.summary || file.analysis,
        insights: file.analysis?.insights || [],
        score: file.analysis?.score || file.relevanceScore || 0,
        timestamp: file.analysis?.timestamp || file.analyzedDate || new Date().toISOString(),
        provider: file.analysis?.provider || 'v1-migration',
        v1Data: {
          originalAnalysis: file.analysis,
          migrated: new Date().toISOString()
        }
      };
      
      await v2API.saveAnalysis(analysis);
    }
    
    return analyzedFiles.length;
  }

  async migrateV1Settings() {
    const v1Config = this.v1Config || {};
    const v1Settings = this.v1Components.AppState?.get('configuration') || {};
    
    const mergedSettings = {
      ...v1Config,
      ...v1Settings,
      v1Migration: {
        migrated: new Date().toISOString(),
        version: 'v1'
      }
    };
    
    console.log('[V1Integration] Migrating V1 settings:', mergedSettings);
    
    const v2API = window.KC.getAPI();
    await v2API.saveSettings('v1-migrated', mergedSettings);
    
    return mergedSettings;
  }

  // Utility methods
  getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const typeMap = {
      'md': 'markdown',
      'txt': 'text',
      'doc': 'document',
      'docx': 'document',
      'pdf': 'pdf',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image'
    };
    return typeMap[ext] || 'other';
  }

  generateCategoryColor(name) {
    // Generate consistent color based on category name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  // Public API
  getV1Component(name) {
    return this.v1Components[name];
  }

  getAdapter(name) {
    return this.v2Adapters[name];
  }

  isLoaded() {
    return this.loaded;
  }

  async runMigration(options = {}) {
    const results = {
      files: 0,
      categories: 0,
      analysis: 0,
      settings: null,
      errors: []
    };
    
    try {
      if (options.migrateFiles !== false) {
        const files = await this.migrateV1Files();
        results.files = files.length;
      }
      
      if (options.migrateCategories !== false) {
        const categories = await this.migrateV1Categories();
        results.categories = categories.length;
      }
      
      if (options.migrateAnalysis !== false) {
        results.analysis = await this.migrateV1Analysis();
      }
      
      if (options.migrateSettings !== false) {
        results.settings = await this.migrateV1Settings();
      }
      
    } catch (error) {
      results.errors.push(error.message);
      console.error('[V1Integration] Migration error:', error);
    }
    
    return results;
  }
}

// Adapter classes
class AppStateAdapter {
  constructor(v1AppState) {
    this.v1AppState = v1AppState;
  }
  
  get(key) {
    if (this.v1AppState && this.v1AppState.get) {
      return this.v1AppState.get(key);
    }
    return null;
  }
  
  set(key, value) {
    if (this.v1AppState && this.v1AppState.set) {
      this.v1AppState.set(key, value);
    }
  }
  
  getAll() {
    if (this.v1AppState && this.v1AppState.getAll) {
      return this.v1AppState.getAll();
    }
    return {};
  }
}

class EventBusAdapter {
  constructor(v1EventBus) {
    this.v1EventBus = v1EventBus;
  }
  
  emit(event, data) {
    if (this.v1EventBus && this.v1EventBus.emit) {
      this.v1EventBus.emit(event, data);
    }
  }
  
  on(event, callback) {
    if (this.v1EventBus && this.v1EventBus.on) {
      return this.v1EventBus.on(event, callback);
    }
    return () => {};
  }
}

class FileManagerAdapter {
  constructor(v1Components) {
    this.v1Components = v1Components;
  }
  
  async discoverFiles(options) {
    if (this.v1Components.DiscoveryManager) {
      return await this.v1Components.DiscoveryManager.discoverFiles(options);
    }
    return [];
  }
  
  getFiles() {
    if (this.v1Components.AppState) {
      return this.v1Components.AppState.get('files') || [];
    }
    return [];
  }
  
  async analyzeFiles(files) {
    if (this.v1Components.AnalysisManager) {
      return await this.v1Components.AnalysisManager.analyzeFiles(files);
    }
    return files;
  }
}

class CategoryManagerAdapter {
  constructor(v1CategoryManager) {
    this.v1CategoryManager = v1CategoryManager;
  }
  
  getCategories() {
    if (this.v1CategoryManager && this.v1CategoryManager.getCategories) {
      return this.v1CategoryManager.getCategories();
    }
    return [];
  }
  
  addCategory(category) {
    if (this.v1CategoryManager && this.v1CategoryManager.addCategory) {
      return this.v1CategoryManager.addCategory(category);
    }
  }
  
  removeCategory(categoryName) {
    if (this.v1CategoryManager && this.v1CategoryManager.removeCategory) {
      return this.v1CategoryManager.removeCategory(categoryName);
    }
  }
}

class AnalysisManagerAdapter {
  constructor(v1AnalysisManager) {
    this.v1AnalysisManager = v1AnalysisManager;
  }
  
  async analyzeFile(file) {
    if (this.v1AnalysisManager && this.v1AnalysisManager.analyzeFile) {
      return await this.v1AnalysisManager.analyzeFile(file);
    }
    return file;
  }
  
  getAnalysisQueue() {
    if (this.v1AnalysisManager && this.v1AnalysisManager.getQueue) {
      return this.v1AnalysisManager.getQueue();
    }
    return [];
  }
}
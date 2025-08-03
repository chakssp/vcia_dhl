/**
 * Backwards Compatibility Layer for V1-V2 Integration
 * Ensures V1 functionality continues to work with V2 system
 */

export class BackwardsCompatibility {
  constructor() {
    this.v1Namespace = 'KnowledgeConsolidator';
    this.initialized = false;
    this.v1Proxies = new Map();
  }

  async initialize() {
    console.log('[BackCompat] Initializing backwards compatibility layer...');
    
    try {
      // Create V1 global namespace if it doesn't exist
      this.createV1Namespace();
      
      // Setup V1 API proxies
      this.setupV1Proxies();
      
      // Patch V1 methods for V2 compatibility
      this.patchV1Methods();
      
      // Setup event forwarding
      this.setupEventForwarding();
      
      // Setup state synchronization
      this.setupStateSynchronization();
      
      // Load V1 plugins if any
      await this.loadV1Plugins();
      
      this.initialized = true;
      console.log('[BackCompat] Backwards compatibility layer initialized');
      
      return true;
    } catch (error) {
      console.error('[BackCompat] Initialization failed:', error);
      throw error;
    }
  }

  createV1Namespace() {
    // Create or verify V1 global namespace
    if (!window[this.v1Namespace]) {
      window[this.v1Namespace] = {};
    }
    
    // Create KC alias if it doesn't exist
    if (!window.KC) {
      window.KC = window[this.v1Namespace];
    }
    
    // Ensure both point to V2 when appropriate
    this.v1Global = window[this.v1Namespace];
  }

  setupV1Proxies() {
    // Create proxies for V1 components that map to V2
    const componentMappings = {
      'AppState': this.createAppStateProxy(),
      'EventBus': this.createEventBusProxy(),
      'DiscoveryManager': this.createDiscoveryManagerProxy(),
      'AnalysisManager': this.createAnalysisManagerProxy(),
      'CategoryManager': this.createCategoryManagerProxy(),
      'FilterManager': this.createFilterManagerProxy(),
      'ExportManager': this.createExportManagerProxy(),
      'PreviewUtils': this.createPreviewUtilsProxy(),
      'FileRenderer': this.createFileRendererProxy(),
      'StatsPanel': this.createStatsPanelProxy(),
      'WorkflowPanel': this.createWorkflowPanelProxy()
    };
    
    // Install proxies
    Object.entries(componentMappings).forEach(([name, proxy]) => {
      this.v1Global[name] = proxy;
      this.v1Proxies.set(name, proxy);
      console.log(`[BackCompat] Installed proxy for ${name}`);
    });
  }

  createAppStateProxy() {
    const v2AppState = window.KC?.getAppState ? window.KC.getAppState() : null;
    
    return {
      get: (key) => {
        if (v2AppState) {
          // Map V1 keys to V2 if needed
          const v2Key = this.mapV1KeyToV2(key);
          return v2AppState.get(v2Key);
        }
        // Fallback to localStorage
        const stored = localStorage.getItem(`kc-${key}`);
        return stored ? JSON.parse(stored) : null;
      },
      
      set: (key, value) => {
        if (v2AppState) {
          const v2Key = this.mapV1KeyToV2(key);
          v2AppState.set(v2Key, value);
        }
        // Also save to localStorage for persistence
        localStorage.setItem(`kc-${key}`, JSON.stringify(value));
      },
      
      getAll: () => {
        if (v2AppState) {
          return v2AppState.getAll();
        }
        // Reconstruct from localStorage
        const state = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('kc-')) {
            const stateKey = key.substring(3);
            try {
              state[stateKey] = JSON.parse(localStorage.getItem(key));
            } catch (e) {
              state[stateKey] = localStorage.getItem(key);
            }
          }
        }
        return state;
      },
      
      subscribe: (callback) => {
        if (v2AppState?.subscribe) {
          return v2AppState.subscribe(callback);
        }
        // Simple subscription mechanism
        const subscribers = this.stateSubscribers || (this.stateSubscribers = []);
        subscribers.push(callback);
        return () => {
          const index = subscribers.indexOf(callback);
          if (index > -1) subscribers.splice(index, 1);
        };
      },
      
      clear: () => {
        if (v2AppState?.clear) {
          v2AppState.clear();
        }
        // Clear V1 localStorage entries
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('kc-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    };
  }

  createEventBusProxy() {
    const v2EventBus = window.KC?.getEventBus ? window.KC.getEventBus() : null;
    
    return {
      on: (event, callback) => {
        // Map V1 events to V2 format
        const v2Event = this.mapV1EventToV2(event);
        
        if (v2EventBus) {
          return v2EventBus.on(v2Event, callback);
        }
        
        // Fallback event system
        this.v1Events = this.v1Events || new Map();
        if (!this.v1Events.has(event)) {
          this.v1Events.set(event, new Set());
        }
        this.v1Events.get(event).add(callback);
        
        return () => {
          this.v1Events.get(event)?.delete(callback);
        };
      },
      
      emit: (event, data) => {
        const v2Event = this.mapV1EventToV2(event);
        
        if (v2EventBus) {
          v2EventBus.emit(v2Event, data);
        }
        
        // Also emit to V1 listeners
        this.v1Events?.get(event)?.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`[BackCompat] Error in V1 event handler for ${event}:`, error);
          }
        });
      },
      
      once: (event, callback) => {
        const unsubscribe = this.on(event, (data) => {
          unsubscribe();
          callback(data);
        });
        return unsubscribe;
      },
      
      off: (event, callback) => {
        this.v1Events?.get(event)?.delete(callback);
      }
    };
  }

  createDiscoveryManagerProxy() {
    const v2API = window.KC?.getAPI ? window.KC.getAPI() : null;
    
    return {
      discoverFiles: async (options) => {
        if (v2API?.discoverFiles) {
          return await v2API.discoverFiles(options);
        }
        
        // Fallback to File System Access API
        return await this.v1DiscoverFiles(options);
      },
      
      selectDirectory: async () => {
        try {
          const handle = await window.showDirectoryPicker({
            mode: 'read'
          });
          return handle;
        } catch (error) {
          if (error.name === 'AbortError') {
            return null;
          }
          throw error;
        }
      },
      
      scanDirectory: async (handle, options = {}) => {
        const files = [];
        await this.v1ScanDirectory(handle, files, '', options);
        return files;
      },
      
      getFileContent: async (file) => {
        if (file.handle && file.handle.getFile) {
          const fileObj = await file.handle.getFile();
          return await fileObj.text();
        }
        return file.content || '';
      }
    };
  }

  createAnalysisManagerProxy() {
    const v2API = window.KC?.getAPI ? window.KC.getAPI() : null;
    
    return {
      analyzeFile: async (file, options = {}) => {
        if (v2API?.analyzeFile) {
          return await v2API.analyzeFile(file, options);
        }
        
        // Fallback analysis
        return this.v1AnalyzeFile(file, options);
      },
      
      analyzeFiles: async (files, options = {}) => {
        const results = [];
        const batchSize = options.batchSize || 5;
        
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(file => this.analyzeFile(file, options))
          );
          results.push(...batchResults);
        }
        
        return results;
      },
      
      getQueue: () => {
        return this.analysisQueue || [];
      },
      
      addToQueue: (files) => {
        this.analysisQueue = this.analysisQueue || [];
        this.analysisQueue.push(...files);
      },
      
      clearQueue: () => {
        this.analysisQueue = [];
      },
      
      processQueue: async () => {
        const queue = this.analysisQueue || [];
        const results = await this.analyzeFiles(queue);
        this.analysisQueue = [];
        return results;
      }
    };
  }

  createCategoryManagerProxy() {
    return {
      categories: [],
      
      getCategories: () => {
        const stored = localStorage.getItem('kc-categories');
        return stored ? JSON.parse(stored) : this.getDefaultCategories();
      },
      
      addCategory: (category) => {
        const categories = this.getCategories();
        const newCat = {
          id: `cat-${Date.now()}`,
          name: typeof category === 'string' ? category : category.name,
          color: category.color || this.generateColor(category.name || category),
          created: new Date().toISOString()
        };
        categories.push(newCat);
        this.saveCategories(categories);
        return newCat;
      },
      
      removeCategory: (categoryId) => {
        const categories = this.getCategories();
        const filtered = categories.filter(cat => 
          cat.id !== categoryId && cat.name !== categoryId
        );
        this.saveCategories(filtered);
      },
      
      updateCategory: (categoryId, updates) => {
        const categories = this.getCategories();
        const index = categories.findIndex(cat => 
          cat.id === categoryId || cat.name === categoryId
        );
        if (index !== -1) {
          categories[index] = { ...categories[index], ...updates };
          this.saveCategories(categories);
        }
      },
      
      saveCategories: (categories) => {
        localStorage.setItem('kc-categories', JSON.stringify(categories));
        // Emit event
        if (this.v1Global.EventBus) {
          this.v1Global.EventBus.emit('categories-updated', { categories });
        }
      },
      
      getDefaultCategories: () => {
        return [
          { name: 'Projects', color: '#4CAF50' },
          { name: 'Personal', color: '#2196F3' },
          { name: 'Work', color: '#FF9800' },
          { name: 'Research', color: '#9C27B0' },
          { name: 'Ideas', color: '#FFEB3B' },
          { name: 'Archive', color: '#607D8B' }
        ];
      },
      
      generateColor: (name) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
          hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 50%)`;
      }
    };
  }

  createFilterManagerProxy() {
    return {
      applyFilters: (files, filters) => {
        let filtered = [...files];
        
        // V1 filter implementation
        if (filters.relevanceThreshold > 0) {
          filtered = filtered.filter(f => 
            (f.relevanceScore || 0) >= filters.relevanceThreshold
          );
        }
        
        if (filters.dateRange && filters.dateRange !== 'all') {
          filtered = this.filterByDateRange(filtered, filters.dateRange);
        }
        
        if (filters.fileTypes?.length > 0) {
          filtered = filtered.filter(f => {
            const ext = f.name.split('.').pop().toLowerCase();
            return filters.fileTypes.includes(ext);
          });
        }
        
        if (filters.categories?.length > 0) {
          filtered = filtered.filter(f => 
            f.categories?.some(cat => filters.categories.includes(cat))
          );
        }
        
        return filtered;
      },
      
      filterByDateRange: (files, range) => {
        const now = Date.now();
        const ranges = {
          '1m': 30 * 24 * 60 * 60 * 1000,
          '3m': 90 * 24 * 60 * 60 * 1000,
          '6m': 180 * 24 * 60 * 60 * 1000,
          '1y': 365 * 24 * 60 * 60 * 1000,
          '2y': 730 * 24 * 60 * 60 * 1000
        };
        
        const cutoff = ranges[range];
        if (!cutoff) return files;
        
        return files.filter(f => {
          const fileDate = new Date(f.modified || f.created).getTime();
          return (now - fileDate) <= cutoff;
        });
      }
    };
  }

  createExportManagerProxy() {
    return {
      exportToJSON: (files, options = {}) => {
        const data = {
          version: '1.0.0',
          exported: new Date().toISOString(),
          files: files,
          metadata: options
        };
        
        const json = JSON.stringify(data, null, 2);
        this.downloadFile(json, 'kc-export.json', 'application/json');
      },
      
      exportToMarkdown: (files, options = {}) => {
        let markdown = '# Knowledge Consolidator Export\n\n';
        files.forEach(file => {
          markdown += `## ${file.name}\n\n`;
          if (file.preview) {
            markdown += `${file.preview}\n\n`;
          }
          markdown += '---\n\n';
        });
        
        this.downloadFile(markdown, 'kc-export.md', 'text/markdown');
      },
      
      downloadFile: (content, filename, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    };
  }

  createPreviewUtilsProxy() {
    return {
      generatePreview: (content, options = {}) => {
        if (!content) return '';
        
        const maxLength = options.maxLength || 500;
        const segments = [];
        
        // Extract meaningful segments
        const lines = content.split('\n');
        
        // First paragraph
        const firstPara = lines.find(line => line.trim().length > 20);
        if (firstPara) segments.push(firstPara);
        
        // Headers
        const header = lines.find(line => line.startsWith('#'));
        if (header) segments.push(header);
        
        // Lists
        const listItem = lines.find(line => line.trim().startsWith('-') || line.trim().startsWith('*'));
        if (listItem) segments.push(listItem);
        
        const preview = segments.join('\n').substring(0, maxLength);
        return preview + (content.length > maxLength ? '...' : '');
      },
      
      calculateRelevance: (content, keywords = []) => {
        const defaultKeywords = ['important', 'critical', 'decision', 'insight'];
        const allKeywords = [...defaultKeywords, ...keywords];
        
        let score = 0;
        allKeywords.forEach(keyword => {
          const regex = new RegExp(keyword, 'gi');
          const matches = content.match(regex);
          if (matches) score += matches.length * 10;
        });
        
        return Math.min(100, score);
      }
    };
  }

  createFileRendererProxy() {
    return {
      renderFiles: (files, container) => {
        if (!container) return;
        
        container.innerHTML = files.map(file => `
          <div class="file-item" data-file-id="${file.id}">
            <div class="file-name">${file.name}</div>
            <div class="file-info">
              <span class="file-size">${this.formatFileSize(file.size)}</span>
              <span class="file-date">${new Date(file.modified || file.created).toLocaleDateString()}</span>
            </div>
            ${file.categories?.length > 0 ? 
              `<div class="file-categories">${file.categories.join(', ')}</div>` : ''}
          </div>
        `).join('');
      },
      
      formatFileSize: (bytes) => {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
      }
    };
  }

  createStatsPanelProxy() {
    return {
      updateStats: (files) => {
        const stats = {
          total: files.length,
          analyzed: files.filter(f => f.analyzed).length,
          categorized: files.filter(f => f.categories?.length > 0).length,
          totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0)
        };
        
        // Update UI if elements exist
        const elements = {
          'total-files': stats.total,
          'analyzed-files': stats.analyzed,
          'categorized-files': stats.categorized,
          'total-size': this.formatFileSize(stats.totalSize)
        };
        
        Object.entries(elements).forEach(([id, value]) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value;
        });
        
        return stats;
      },
      
      formatFileSize: (bytes) => {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
      }
    };
  }

  createWorkflowPanelProxy() {
    return {
      currentStep: 1,
      
      getCurrentStep: () => {
        return this.currentStep;
      },
      
      setCurrentStep: (step) => {
        this.currentStep = step;
        localStorage.setItem('kc-current-step', step);
        
        // Update UI
        this.updateStepUI(step);
        
        // Emit event
        if (this.v1Global.EventBus) {
          this.v1Global.EventBus.emit('workflow-step-changed', { step });
        }
      },
      
      updateStepUI: (step) => {
        // Update step indicators
        document.querySelectorAll('.workflow-step').forEach((el, index) => {
          if (index + 1 === step) {
            el.classList.add('active');
          } else {
            el.classList.remove('active');
          }
        });
      },
      
      canAdvance: (toStep) => {
        // Check if can advance to step
        const files = this.v1Global.AppState?.get('files') || [];
        
        switch (toStep) {
          case 2: // Analysis
            return files.length > 0;
          case 3: // Organization
            return files.some(f => f.analyzed);
          case 4: // Export
            return files.length > 0;
          default:
            return true;
        }
      }
    };
  }

  patchV1Methods() {
    // Patch specific V1 methods that need special handling
    
    // Patch localStorage usage
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      
      // Notify V2 of changes to V1 data
      if (key.startsWith('kc-')) {
        const stateKey = key.substring(3);
        if (window.KC?.getEventBus) {
          window.KC.getEventBus().emit('v1:storage-changed', {
            key: stateKey,
            value: value
          });
        }
      }
    };
  }

  setupEventForwarding() {
    // Map V1 events to V2 and vice versa
    const eventMappings = [
      { v1: 'files-discovered', v2: 'files:discovered' },
      { v1: 'files-analyzed', v2: 'files:analyzed' },
      { v1: 'categories-updated', v2: 'categories:updated' },
      { v1: 'workflow-step-changed', v2: 'workflow:step-changed' },
      { v1: 'filter-applied', v2: 'filter:applied' },
      { v1: 'export-completed', v2: 'export:completed' }
    ];
    
    // Forward V1 to V2
    if (this.v1Global.EventBus) {
      eventMappings.forEach(({ v1, v2 }) => {
        this.v1Global.EventBus.on(v1, (data) => {
          if (window.KC?.getEventBus) {
            window.KC.getEventBus().emit(v2, data);
          }
        });
      });
    }
    
    // Forward V2 to V1
    if (window.KC?.getEventBus) {
      eventMappings.forEach(({ v1, v2 }) => {
        window.KC.getEventBus().on(v2, (data) => {
          if (this.v1Global.EventBus) {
            this.v1Global.EventBus.emit(v1, data);
          }
        });
      });
    }
  }

  setupStateSynchronization() {
    // Sync V1 and V2 state
    const syncKeys = ['files', 'categories', 'currentStep', 'configuration'];
    
    // Initial sync from V1 to V2
    syncKeys.forEach(key => {
      const v1Value = this.v1Global.AppState?.get(key);
      if (v1Value && window.KC?.getAppState) {
        window.KC.getAppState().set(`v1:${key}`, v1Value);
      }
    });
    
    // Ongoing sync
    if (this.v1Global.AppState?.subscribe) {
      this.v1Global.AppState.subscribe((key, value) => {
        if (syncKeys.includes(key) && window.KC?.getAppState) {
          window.KC.getAppState().set(`v1:${key}`, value);
        }
      });
    }
  }

  async loadV1Plugins() {
    // Check for V1 plugins
    const plugins = this.v1Global.plugins || [];
    
    for (const plugin of plugins) {
      try {
        if (plugin.init) {
          await plugin.init(this.v1Global);
          console.log(`[BackCompat] Loaded V1 plugin: ${plugin.name}`);
        }
      } catch (error) {
        console.error(`[BackCompat] Failed to load V1 plugin:`, error);
      }
    }
  }

  // Helper methods for V1 functionality
  async v1DiscoverFiles(options) {
    const files = [];
    
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      await this.v1ScanDirectory(handle, files, '', options);
    } catch (error) {
      if (error.name !== 'AbortError') {
        throw error;
      }
    }
    
    return files;
  }

  async v1ScanDirectory(handle, files, path, options) {
    const entries = handle.values();
    
    for await (const entry of entries) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file') {
        // Check if file matches patterns
        if (this.matchesPatterns(entry.name, options.patterns)) {
          const file = await entry.getFile();
          files.push({
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: entry.name,
            path: entryPath,
            size: file.size,
            type: file.type,
            created: new Date(file.lastModified),
            modified: new Date(file.lastModified),
            handle: entry
          });
        }
      } else if (entry.kind === 'directory' && options.recursive !== false) {
        await this.v1ScanDirectory(entry, files, entryPath, options);
      }
    }
  }

  matchesPatterns(filename, patterns = ['*']) {
    return patterns.some(pattern => {
      const regex = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(`^${regex}$`).test(filename);
    });
  }

  v1AnalyzeFile(file, options) {
    // Basic V1 analysis
    const content = file.content || '';
    
    return {
      fileId: file.id,
      fileName: file.name,
      analyzed: true,
      analysis: {
        summary: content.substring(0, 200) + '...',
        relevanceScore: Math.floor(Math.random() * 100),
        categories: this.suggestCategories(file),
        timestamp: new Date().toISOString()
      }
    };
  }

  suggestCategories(file) {
    const suggestions = [];
    const nameLower = file.name.toLowerCase();
    
    if (nameLower.includes('project')) suggestions.push('Projects');
    if (nameLower.includes('note')) suggestions.push('Notes');
    if (nameLower.includes('todo')) suggestions.push('Tasks');
    
    return suggestions;
  }

  // Key and event mapping helpers
  mapV1KeyToV2(key) {
    const keyMap = {
      'discoveredFiles': 'files',
      'analyzedFiles': 'files',
      'currentWorkflowStep': 'currentStep'
    };
    return keyMap[key] || key;
  }

  mapV1EventToV2(event) {
    const eventMap = {
      'files-discovered': 'files:discovered',
      'files-analyzed': 'files:analyzed',
      'categories-updated': 'categories:updated',
      'workflow-step-changed': 'workflow:step-changed'
    };
    return eventMap[event] || event;
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  // Public API
  isInitialized() {
    return this.initialized;
  }

  getV1Global() {
    return this.v1Global;
  }

  getProxy(componentName) {
    return this.v1Proxies.get(componentName);
  }
}
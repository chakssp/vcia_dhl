/**
 * ConfigManager V2 - Gerenciador de Configurações
 * 
 * Versão básica para estabilizar V2
 * TODO: Migrar para Supabase na Fase 2
 */

import AppState from '../core/AppState.js';
import EventBus from '../core/EventBus.js';

class ConfigManager {
  constructor() {
    this.configs = new Map();
    this.defaults = this.getDefaultConfigs();
    this.initialized = false;
  }

  /**
   * Initialize ConfigManager
   */
  async initialize() {
    try {
      // Load configs from localStorage for now
      // TODO: Migrate to Supabase
      const stored = localStorage.getItem('kc_v2_configs');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          this.configs.set(key, value);
        });
      }

      // Apply defaults for missing configs
      this.applyDefaults();
      
      // Update AppState
      AppState.set('configs', this.getAll());
      
      this.initialized = true;
      console.log('[ConfigManager] Initialized with', this.configs.size, 'configs');
      
      return true;
    } catch (error) {
      console.error('[ConfigManager] Initialization failed:', error);
      this.applyDefaults();
      return false;
    }
  }

  /**
   * Get default configurations
   */
  getDefaultConfigs() {
    return {
      // Discovery settings
      discovery: {
        patterns: {
          include: ['*.md', '*.txt', '*.doc', '*.docx', '*.pdf'],
          exclude: ['node_modules', '.git', 'temp', 'cache']
        },
        maxFileSize: 10 * 1024 * 1024, // 10MB
        followSymlinks: false
      },

      // AI settings
      ai: {
        provider: 'ollama',
        providers: {
          ollama: {
            enabled: true,
            endpoint: 'http://localhost:11434',
            model: 'llama3.2'
          },
          openai: {
            enabled: false,
            apiKey: '',
            model: 'gpt-3.5-turbo'
          }
        },
        maxTokens: 1000,
        temperature: 0.7
      },

      // Categories
      categories: {
        defaults: [
          { id: 'insights', name: 'Insights', color: '#4CAF50' },
          { id: 'decisions', name: 'Decisões', color: '#2196F3' },
          { id: 'technical', name: 'Técnico', color: '#FF9800' },
          { id: 'strategic', name: 'Estratégico', color: '#9C27B0' }
        ],
        enableBoost: true,
        boostFormula: '1.5 + (n * 0.1)'
      },

      // Export settings
      export: {
        formats: {
          markdown: { enabled: true, template: 'obsidian' },
          json: { enabled: true, includeEmbeddings: false },
          pdf: { enabled: true, layout: 'report' }
        },
        defaultFormat: 'markdown'
      },

      // UI settings
      ui: {
        theme: 'dark',
        language: 'pt-BR',
        animations: true,
        compactMode: false
      },

      // Performance
      performance: {
        enableWorkers: true,
        maxConcurrentAnalysis: 3,
        cacheEnabled: true,
        cacheDuration: 3600000 // 1 hour
      }
    };
  }

  /**
   * Apply default configurations
   */
  applyDefaults() {
    Object.entries(this.defaults).forEach(([key, value]) => {
      if (!this.configs.has(key)) {
        this.configs.set(key, value);
      }
    });
  }

  /**
   * Get all configurations
   */
  getAll() {
    const result = {};
    this.configs.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Get specific configuration
   */
  get(key, defaultValue = null) {
    return this.configs.get(key) || defaultValue;
  }

  /**
   * Set configuration
   */
  set(key, value) {
    const oldValue = this.configs.get(key);
    this.configs.set(key, value);
    
    // Save to localStorage
    this.save();
    
    // Update AppState
    AppState.set('configs', this.getAll());
    
    // Emit change event
    EventBus.emit('config:changed', {
      key,
      oldValue,
      newValue: value
    });
    
    return true;
  }

  /**
   * Update nested configuration
   */
  update(path, value) {
    const parts = path.split('.');
    const key = parts[0];
    const config = this.get(key, {});
    
    // Update nested value
    let current = config;
    for (let i = 1; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    
    // Save updated config
    return this.set(key, config);
  }

  /**
   * Delete configuration
   */
  delete(key) {
    const existed = this.configs.has(key);
    this.configs.delete(key);
    
    if (existed) {
      this.save();
      AppState.set('configs', this.getAll());
      EventBus.emit('config:deleted', { key });
    }
    
    return existed;
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.configs.clear();
    this.applyDefaults();
    this.save();
    
    AppState.set('configs', this.getAll());
    EventBus.emit('config:reset');
    
    return true;
  }

  /**
   * Save to localStorage
   */
  save() {
    try {
      const toSave = {};
      this.configs.forEach((value, key) => {
        toSave[key] = value;
      });
      localStorage.setItem('kc_v2_configs', JSON.stringify(toSave));
      return true;
    } catch (error) {
      console.error('[ConfigManager] Failed to save:', error);
      return false;
    }
  }

  /**
   * Export configurations
   */
  export() {
    return {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      configs: this.getAll()
    };
  }

  /**
   * Import configurations
   */
  import(data) {
    try {
      if (!data || !data.configs) {
        throw new Error('Invalid import data');
      }

      // Clear current configs
      this.configs.clear();

      // Import new configs
      Object.entries(data.configs).forEach(([key, value]) => {
        this.configs.set(key, value);
      });

      // Apply defaults for missing
      this.applyDefaults();

      // Save and update
      this.save();
      AppState.set('configs', this.getAll());
      EventBus.emit('config:imported');

      return true;
    } catch (error) {
      console.error('[ConfigManager] Import failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new ConfigManager();
/**
 * SettingsView.js - Unified settings interface for KC V2
 * 
 * Provides comprehensive configuration management for API providers,
 * theme preferences, keyboard shortcuts, and performance settings
 * 
 * Features:
 * - API provider configuration with health checks
 * - Theme customization with live preview
 * - Keyboard shortcut editor
 * - Performance tuning options
 * - Import/export configuration
 * - Reset to defaults
 * - Configuration validation
 */

import appState from '../core/AppState.js';
import eventBus, { Events } from '../core/EventBus.js';
import { legacyBridge } from '../core/LegacyBridge.js';

export class SettingsView {
  constructor() {
    this.container = null;
    this.isInitialized = false;
    
    // Current settings section
    this.activeSection = 'api';
    
    // Settings state
    this.settings = {
      api: {
        providers: {
          ollama: {
            enabled: true,
            url: 'http://127.0.0.1:11434',
            apiKey: '',
            model: 'llama2',
            priority: 1
          },
          openai: {
            enabled: false,
            url: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            priority: 2
          },
          gemini: {
            enabled: false,
            url: 'https://generativelanguage.googleapis.com/v1',
            apiKey: '',
            model: 'gemini-pro',
            priority: 3
          },
          anthropic: {
            enabled: false,
            url: 'https://api.anthropic.com/v1',
            apiKey: '',
            model: 'claude-2',
            priority: 4
          }
        },
        defaultProvider: 'ollama',
        fallbackEnabled: true,
        maxRetries: 3,
        timeout: 30000
      },
      theme: {
        mode: 'dark',
        primaryColor: '#1E90FF',
        accentColor: '#32CD32',
        fontSize: 14,
        fontFamily: 'Monaco, monospace',
        animations: true,
        highContrast: false,
        customCSS: ''
      },
      shortcuts: {
        global: {
          search: 'Ctrl+K',
          settings: 'Ctrl+,',
          help: 'F1',
          toggleTheme: 'Ctrl+Shift+T'
        },
        discovery: {
          selectAll: 'Ctrl+A',
          analyze: 'Ctrl+I',
          categorize: 'Ctrl+K',
          approve: 'Ctrl+D'
        },
        analysis: {
          start: 'Ctrl+Enter',
          stop: 'Escape',
          clearQueue: 'Ctrl+Shift+C'
        },
        organization: {
          newCategory: 'Ctrl+N',
          export: 'Ctrl+E',
          group: 'Ctrl+G'
        }
      },
      performance: {
        lazyLoading: true,
        virtualScrolling: true,
        preloadImages: false,
        cacheExpiry: 3600,
        maxMemoryUsage: 500,
        batchSize: 100,
        debounceDelay: 300,
        workerThreads: 4,
        gpuAcceleration: true
      },
      advanced: {
        developerMode: false,
        debugLogging: false,
        experimentalFeatures: false,
        telemetry: false,
        autoUpdate: true,
        backupFrequency: 'daily',
        dataRetention: 30
      }
    };
    
    // Temporary settings for preview
    this.tempSettings = null;
    
    // Validation rules
    this.validators = {
      url: (value) => {
        try {
          new URL(value);
          return { valid: true };
        } catch {
          return { valid: false, message: 'Invalid URL format' };
        }
      },
      apiKey: (value, provider) => {
        if (!value && provider !== 'ollama') {
          return { valid: false, message: 'API key required' };
        }
        return { valid: true };
      },
      number: (value, min, max) => {
        const num = Number(value);
        if (isNaN(num)) {
          return { valid: false, message: 'Must be a number' };
        }
        if (min !== undefined && num < min) {
          return { valid: false, message: `Minimum value is ${min}` };
        }
        if (max !== undefined && num > max) {
          return { valid: false, message: `Maximum value is ${max}` };
        }
        return { valid: true };
      }
    };
    
    console.log('[SettingsView] Initialized');
  }

  /**
   * Initialize the settings view
   */
  async initialize(container) {
    try {
      this.container = container;
      
      // Ensure legacy bridge is ready
      if (!legacyBridge.initialized) {
        await legacyBridge.initialize();
      }
      
      await this.loadSettings();
      this.setupEventListeners();
      this.render();
      
      this.isInitialized = true;
      console.log('[SettingsView] Initialized successfully');
      
    } catch (error) {
      console.error('[SettingsView] Initialization failed:', error);
      this.renderError('Failed to initialize Settings View');
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for settings updates from V1
    eventBus.on('v1:settings_updated', (settings) => {
      this.mergeV1Settings(settings);
      this.render();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      // Load from V2 storage
      const savedSettings = localStorage.getItem('kcv2_settings');
      if (savedSettings) {
        this.settings = JSON.parse(savedSettings);
      }
      
      // Merge with V1 settings
      const v1Settings = await legacyBridge.executeV1Function('ConfigManager.getAll');
      if (v1Settings) {
        this.mergeV1Settings(v1Settings);
      }
      
    } catch (error) {
      console.error('[SettingsView] Failed to load settings:', error);
    }
  }

  /**
   * Merge V1 settings
   */
  mergeV1Settings(v1Settings) {
    if (v1Settings.apiKeys) {
      Object.entries(v1Settings.apiKeys).forEach(([provider, key]) => {
        if (this.settings.api.providers[provider]) {
          this.settings.api.providers[provider].apiKey = key;
        }
      });
    }
    
    if (v1Settings.activeProvider) {
      this.settings.api.defaultProvider = v1Settings.activeProvider;
    }
  }

  /**
   * Save settings
   */
  async saveSettings() {
    try {
      // Save to V2 storage
      localStorage.setItem('kcv2_settings', JSON.stringify(this.settings));
      
      // Sync API keys to V1
      const apiKeys = {};
      Object.entries(this.settings.api.providers).forEach(([provider, config]) => {
        if (config.apiKey) {
          apiKeys[provider] = config.apiKey;
        }
      });
      
      await legacyBridge.executeV1Function('AIAPIManager.updateApiKeys', apiKeys);
      await legacyBridge.executeV1Function('AIAPIManager.setActiveProvider', this.settings.api.defaultProvider);
      
      // Apply theme
      this.applyTheme();
      
      // Apply performance settings
      this.applyPerformanceSettings();
      
      // Emit settings updated event
      eventBus.emit('settings_updated', this.settings);
      
      this.showNotification('Settings saved successfully', 'success');
      
    } catch (error) {
      console.error('[SettingsView] Failed to save settings:', error);
      this.showNotification('Failed to save settings: ' + error.message, 'error');
    }
  }

  /**
   * Render the settings view
   */
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="settings-view">
        ${this.renderHeader()}
        <div class="settings-content">
          ${this.renderSidebar()}
          ${this.renderMainPanel()}
        </div>
      </div>
    `;
    
    this.attachEventListeners();
  }

  /**
   * Render header
   */
  renderHeader() {
    return `
      <div class="settings-header">
        <h2>⚙️ Settings</h2>
        <div class="settings-actions">
          <button class="btn btn-secondary" id="import-settings">
            📥 Import
          </button>
          <button class="btn btn-secondary" id="export-settings">
            📤 Export
          </button>
          <button class="btn btn-secondary" id="reset-settings">
            🔄 Reset to Defaults
          </button>
          <button class="btn btn-primary" id="save-settings">
            💾 Save Changes
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render sidebar navigation
   */
  renderSidebar() {
    const sections = [
      { id: 'api', label: '🔌 API Configuration', icon: '🔌' },
      { id: 'theme', label: '🎨 Theme & Appearance', icon: '🎨' },
      { id: 'shortcuts', label: '⌨️ Keyboard Shortcuts', icon: '⌨️' },
      { id: 'performance', label: '⚡ Performance', icon: '⚡' },
      { id: 'advanced', label: '🔧 Advanced', icon: '🔧' }
    ];
    
    return `
      <div class="settings-sidebar">
        <nav class="settings-nav">
          ${sections.map(section => `
            <button class="nav-item ${section.id === this.activeSection ? 'active' : ''}"
                    data-section="${section.id}">
              <span class="nav-icon">${section.icon}</span>
              <span class="nav-label">${section.label}</span>
            </button>
          `).join('')}
        </nav>
      </div>
    `;
  }

  /**
   * Render main panel based on active section
   */
  renderMainPanel() {
    return `
      <div class="settings-main">
        <div class="settings-panel">
          ${this.renderSectionContent()}
        </div>
      </div>
    `;
  }

  /**
   * Render section content
   */
  renderSectionContent() {
    switch (this.activeSection) {
      case 'api':
        return this.renderAPISection();
      case 'theme':
        return this.renderThemeSection();
      case 'shortcuts':
        return this.renderShortcutsSection();
      case 'performance':
        return this.renderPerformanceSection();
      case 'advanced':
        return this.renderAdvancedSection();
      default:
        return '';
    }
  }

  /**
   * Render API configuration section
   */
  renderAPISection() {
    return `
      <div class="section-content">
        <h3>API Configuration</h3>
        
        <div class="settings-group">
          <h4>API Providers</h4>
          ${Object.entries(this.settings.api.providers).map(([provider, config]) => `
            <div class="provider-config" data-provider="${provider}">
              <div class="provider-header">
                <label class="toggle-label">
                  <input type="checkbox" 
                         id="${provider}-enabled"
                         ${config.enabled ? 'checked' : ''}
                         onchange="settingsView.toggleProvider('${provider}')">
                  <span class="provider-name">${this.getProviderName(provider)}</span>
                </label>
                <button class="btn-icon" onclick="settingsView.testProvider('${provider}')" title="Test Connection">
                  🔍
                </button>
              </div>
              
              <div class="provider-settings ${config.enabled ? '' : 'disabled'}">
                <div class="form-group">
                  <label>API URL:</label>
                  <input type="url" 
                         id="${provider}-url"
                         value="${config.url}"
                         placeholder="API endpoint URL"
                         ${provider === 'ollama' ? 'readonly' : ''}>
                </div>
                
                ${provider !== 'ollama' ? `
                  <div class="form-group">
                    <label>API Key:</label>
                    <div class="password-input">
                      <input type="password" 
                             id="${provider}-apikey"
                             value="${config.apiKey}"
                             placeholder="Enter API key">
                      <button class="btn-icon" onclick="settingsView.togglePasswordVisibility('${provider}-apikey')">
                        👁️
                      </button>
                    </div>
                  </div>
                ` : ''}
                
                <div class="form-group">
                  <label>Model:</label>
                  <select id="${provider}-model">
                    ${this.getModelOptions(provider).map(model => `
                      <option value="${model.value}" ${model.value === config.model ? 'selected' : ''}>
                        ${model.label}
                      </option>
                    `).join('')}
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Priority:</label>
                  <input type="number" 
                         id="${provider}-priority"
                         value="${config.priority}"
                         min="1" max="10">
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="settings-group">
          <h4>General Settings</h4>
          
          <div class="form-group">
            <label>Default Provider:</label>
            <select id="default-provider">
              ${Object.entries(this.settings.api.providers)
                .filter(([_, config]) => config.enabled)
                .map(([provider, _]) => `
                  <option value="${provider}" ${provider === this.settings.api.defaultProvider ? 'selected' : ''}>
                    ${this.getProviderName(provider)}
                  </option>
                `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="fallback-enabled"
                     ${this.settings.api.fallbackEnabled ? 'checked' : ''}>
              <span>Enable automatic fallback</span>
            </label>
          </div>
          
          <div class="form-group">
            <label>Max Retries:</label>
            <input type="number" 
                   id="max-retries"
                   value="${this.settings.api.maxRetries}"
                   min="0" max="10">
          </div>
          
          <div class="form-group">
            <label>Request Timeout (ms):</label>
            <input type="number" 
                   id="request-timeout"
                   value="${this.settings.api.timeout}"
                   min="5000" max="300000" step="1000">
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render theme section
   */
  renderThemeSection() {
    return `
      <div class="section-content">
        <h3>Theme & Appearance</h3>
        
        <div class="settings-group">
          <h4>Theme Mode</h4>
          <div class="theme-selector">
            <label class="theme-option ${this.settings.theme.mode === 'dark' ? 'selected' : ''}">
              <input type="radio" 
                     name="theme-mode" 
                     value="dark"
                     ${this.settings.theme.mode === 'dark' ? 'checked' : ''}
                     onchange="settingsView.setThemeMode('dark')">
              <span class="theme-preview dark-preview">
                <span class="preview-header"></span>
                <span class="preview-content"></span>
              </span>
              <span class="theme-name">Dark</span>
            </label>
            
            <label class="theme-option ${this.settings.theme.mode === 'light' ? 'selected' : ''}">
              <input type="radio" 
                     name="theme-mode" 
                     value="light"
                     ${this.settings.theme.mode === 'light' ? 'checked' : ''}
                     onchange="settingsView.setThemeMode('light')">
              <span class="theme-preview light-preview">
                <span class="preview-header"></span>
                <span class="preview-content"></span>
              </span>
              <span class="theme-name">Light</span>
            </label>
            
            <label class="theme-option ${this.settings.theme.mode === 'auto' ? 'selected' : ''}">
              <input type="radio" 
                     name="theme-mode" 
                     value="auto"
                     ${this.settings.theme.mode === 'auto' ? 'checked' : ''}
                     onchange="settingsView.setThemeMode('auto')">
              <span class="theme-preview auto-preview">
                <span class="preview-header"></span>
                <span class="preview-content"></span>
              </span>
              <span class="theme-name">Auto</span>
            </label>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Colors</h4>
          <div class="color-settings">
            <div class="form-group">
              <label>Primary Color:</label>
              <div class="color-input">
                <input type="color" 
                       id="primary-color"
                       value="${this.settings.theme.primaryColor}"
                       onchange="settingsView.updateColor('primary')">
                <input type="text" 
                       value="${this.settings.theme.primaryColor}"
                       pattern="^#[0-9A-Fa-f]{6}$"
                       onchange="settingsView.updateColorText('primary')">
              </div>
            </div>
            
            <div class="form-group">
              <label>Accent Color:</label>
              <div class="color-input">
                <input type="color" 
                       id="accent-color"
                       value="${this.settings.theme.accentColor}"
                       onchange="settingsView.updateColor('accent')">
                <input type="text" 
                       value="${this.settings.theme.accentColor}"
                       pattern="^#[0-9A-Fa-f]{6}$"
                       onchange="settingsView.updateColorText('accent')">
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Typography</h4>
          <div class="form-group">
            <label>Font Size:</label>
            <div class="slider-input">
              <input type="range" 
                     id="font-size"
                     min="12" max="20" 
                     value="${this.settings.theme.fontSize}"
                     oninput="settingsView.updateFontSize()">
              <span class="slider-value">${this.settings.theme.fontSize}px</span>
            </div>
          </div>
          
          <div class="form-group">
            <label>Font Family:</label>
            <select id="font-family" onchange="settingsView.updateFontFamily()">
              <option value="Monaco, monospace" ${this.settings.theme.fontFamily === 'Monaco, monospace' ? 'selected' : ''}>
                Monaco (Default)
              </option>
              <option value="'Fira Code', monospace" ${this.settings.theme.fontFamily === "'Fira Code', monospace" ? 'selected' : ''}>
                Fira Code
              </option>
              <option value="'Source Code Pro', monospace" ${this.settings.theme.fontFamily === "'Source Code Pro', monospace" ? 'selected' : ''}>
                Source Code Pro
              </option>
              <option value="'JetBrains Mono', monospace" ${this.settings.theme.fontFamily === "'JetBrains Mono', monospace" ? 'selected' : ''}>
                JetBrains Mono
              </option>
              <option value="Consolas, monospace" ${this.settings.theme.fontFamily === "Consolas, monospace" ? 'selected' : ''}>
                Consolas
              </option>
            </select>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Additional Options</h4>
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="animations-enabled"
                     ${this.settings.theme.animations ? 'checked' : ''}
                     onchange="settingsView.toggleAnimations()">
              <span>Enable animations</span>
            </label>
          </div>
          
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="high-contrast"
                     ${this.settings.theme.highContrast ? 'checked' : ''}
                     onchange="settingsView.toggleHighContrast()">
              <span>High contrast mode</span>
            </label>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Custom CSS</h4>
          <div class="form-group">
            <textarea id="custom-css" 
                      rows="10" 
                      placeholder="/* Add custom CSS here */"
                      onchange="settingsView.updateCustomCSS()">${this.settings.theme.customCSS}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render shortcuts section
   */
  renderShortcutsSection() {
    return `
      <div class="section-content">
        <h3>Keyboard Shortcuts</h3>
        
        ${Object.entries(this.settings.shortcuts).map(([category, shortcuts]) => `
          <div class="settings-group">
            <h4>${this.getCategoryName(category)}</h4>
            <div class="shortcuts-list">
              ${Object.entries(shortcuts).map(([action, shortcut]) => `
                <div class="shortcut-item">
                  <span class="shortcut-label">${this.getActionName(action)}</span>
                  <div class="shortcut-input">
                    <input type="text" 
                           id="shortcut-${category}-${action}"
                           value="${shortcut}"
                           readonly
                           onclick="settingsView.editShortcut('${category}', '${action}')"
                           class="shortcut-display">
                    <button class="btn-icon" 
                            onclick="settingsView.resetShortcut('${category}', '${action}')"
                            title="Reset to default">
                      🔄
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
        
        <div class="shortcut-info">
          <p>💡 Click on a shortcut to edit. Press the new key combination, then Enter to save or Escape to cancel.</p>
          <p>⚠️ Some shortcuts may conflict with browser or system shortcuts.</p>
        </div>
      </div>
    `;
  }

  /**
   * Render performance section
   */
  renderPerformanceSection() {
    return `
      <div class="section-content">
        <h3>Performance Settings</h3>
        
        <div class="settings-group">
          <h4>Loading & Rendering</h4>
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="lazy-loading"
                     ${this.settings.performance.lazyLoading ? 'checked' : ''}>
              <span>Enable lazy loading</span>
            </label>
            <small>Load content only when visible</small>
          </div>
          
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="virtual-scrolling"
                     ${this.settings.performance.virtualScrolling ? 'checked' : ''}>
              <span>Enable virtual scrolling</span>
            </label>
            <small>Render only visible items in long lists</small>
          </div>
          
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="preload-images"
                     ${this.settings.performance.preloadImages ? 'checked' : ''}>
              <span>Preload images</span>
            </label>
            <small>May increase initial load time</small>
          </div>
          
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="gpu-acceleration"
                     ${this.settings.performance.gpuAcceleration ? 'checked' : ''}>
              <span>GPU acceleration</span>
            </label>
            <small>Use hardware acceleration for animations</small>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Memory & Cache</h4>
          <div class="form-group">
            <label>Cache Expiry (seconds):</label>
            <input type="number" 
                   id="cache-expiry"
                   value="${this.settings.performance.cacheExpiry}"
                   min="60" max="86400">
          </div>
          
          <div class="form-group">
            <label>Max Memory Usage (MB):</label>
            <div class="slider-input">
              <input type="range" 
                     id="max-memory"
                     min="100" max="2000" step="100"
                     value="${this.settings.performance.maxMemoryUsage}"
                     oninput="settingsView.updateMemoryDisplay()">
              <span class="slider-value">${this.settings.performance.maxMemoryUsage} MB</span>
            </div>
          </div>
          
          <div class="form-group">
            <button class="btn btn-secondary" onclick="settingsView.clearCache()">
              🗑️ Clear Cache
            </button>
            <small id="cache-size">Calculating cache size...</small>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Processing</h4>
          <div class="form-group">
            <label>Batch Size:</label>
            <input type="number" 
                   id="batch-size"
                   value="${this.settings.performance.batchSize}"
                   min="10" max="1000">
            <small>Number of items to process at once</small>
          </div>
          
          <div class="form-group">
            <label>Debounce Delay (ms):</label>
            <input type="number" 
                   id="debounce-delay"
                   value="${this.settings.performance.debounceDelay}"
                   min="0" max="1000">
            <small>Delay before processing user input</small>
          </div>
          
          <div class="form-group">
            <label>Worker Threads:</label>
            <input type="number" 
                   id="worker-threads"
                   value="${this.settings.performance.workerThreads}"
                   min="1" max="16">
            <small>Number of background threads for processing</small>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render advanced section
   */
  renderAdvancedSection() {
    return `
      <div class="section-content">
        <h3>Advanced Settings</h3>
        
        <div class="settings-group">
          <h4>Developer Options</h4>
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="developer-mode"
                     ${this.settings.advanced.developerMode ? 'checked' : ''}>
              <span>Developer mode</span>
            </label>
            <small>Enable developer tools and debug features</small>
          </div>
          
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="debug-logging"
                     ${this.settings.advanced.debugLogging ? 'checked' : ''}>
              <span>Debug logging</span>
            </label>
            <small>Log detailed debug information to console</small>
          </div>
          
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="experimental-features"
                     ${this.settings.advanced.experimentalFeatures ? 'checked' : ''}>
              <span>Experimental features</span>
            </label>
            <small>⚠️ May be unstable or incomplete</small>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Privacy & Data</h4>
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="telemetry"
                     ${this.settings.advanced.telemetry ? 'checked' : ''}>
              <span>Anonymous usage statistics</span>
            </label>
            <small>Help improve KC by sharing usage data</small>
          </div>
          
          <div class="form-group">
            <label>Data Retention (days):</label>
            <input type="number" 
                   id="data-retention"
                   value="${this.settings.advanced.dataRetention}"
                   min="1" max="365">
            <small>How long to keep analysis history</small>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Backup & Updates</h4>
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" 
                     id="auto-update"
                     ${this.settings.advanced.autoUpdate ? 'checked' : ''}>
              <span>Automatic updates</span>
            </label>
          </div>
          
          <div class="form-group">
            <label>Backup Frequency:</label>
            <select id="backup-frequency">
              <option value="never" ${this.settings.advanced.backupFrequency === 'never' ? 'selected' : ''}>
                Never
              </option>
              <option value="daily" ${this.settings.advanced.backupFrequency === 'daily' ? 'selected' : ''}>
                Daily
              </option>
              <option value="weekly" ${this.settings.advanced.backupFrequency === 'weekly' ? 'selected' : ''}>
                Weekly
              </option>
              <option value="monthly" ${this.settings.advanced.backupFrequency === 'monthly' ? 'selected' : ''}>
                Monthly
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <button class="btn btn-secondary" onclick="settingsView.createBackup()">
              💾 Create Backup Now
            </button>
            <button class="btn btn-secondary" onclick="settingsView.restoreBackup()">
              📥 Restore from Backup
            </button>
          </div>
        </div>
        
        <div class="settings-group danger-zone">
          <h4>⚠️ Danger Zone</h4>
          <div class="form-group">
            <button class="btn btn-danger" onclick="settingsView.clearAllData()">
              🗑️ Clear All Data
            </button>
            <small>This will delete all your files, analysis, and settings</small>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Section navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.activeSection = item.dataset.section;
        this.render();
      });
    });
    
    // Header actions
    document.getElementById('save-settings')?.addEventListener('click', () => {
      this.saveSettings();
    });
    
    document.getElementById('import-settings')?.addEventListener('click', () => {
      this.importSettings();
    });
    
    document.getElementById('export-settings')?.addEventListener('click', () => {
      this.exportSettings();
    });
    
    document.getElementById('reset-settings')?.addEventListener('click', () => {
      this.resetSettings();
    });
    
    // Track changes
    this.attachChangeListeners();
    
    // Calculate cache size
    this.calculateCacheSize();
  }

  /**
   * Attach change listeners to track modifications
   */
  attachChangeListeners() {
    const inputs = this.container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        this.markUnsavedChanges();
      });
    });
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboard(e) {
    if (!this.container || !this.container.contains(document.activeElement)) {
      return;
    }
    
    // Save on Ctrl+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      this.saveSettings();
    }
  }

  // === API PROVIDER METHODS ===

  /**
   * Toggle provider enabled state
   */
  toggleProvider(provider) {
    const checkbox = document.getElementById(`${provider}-enabled`);
    this.settings.api.providers[provider].enabled = checkbox.checked;
    
    // Update UI
    const settings = document.querySelector(`.provider-config[data-provider="${provider}"] .provider-settings`);
    settings.classList.toggle('disabled', !checkbox.checked);
    
    // Update default provider options
    this.updateDefaultProviderOptions();
  }

  /**
   * Test provider connection
   */
  async testProvider(provider) {
    const config = this.settings.api.providers[provider];
    
    // Update config from form
    if (provider !== 'ollama') {
      config.apiKey = document.getElementById(`${provider}-apikey`).value;
    }
    config.url = document.getElementById(`${provider}-url`).value;
    config.model = document.getElementById(`${provider}-model`).value;
    
    // Show testing state
    const button = document.querySelector(`.provider-config[data-provider="${provider}"] .btn-icon`);
    const originalContent = button.innerHTML;
    button.innerHTML = '⏳';
    button.disabled = true;
    
    try {
      const result = await legacyBridge.executeV1Function(
        `AIAPIManager.testProvider`,
        provider,
        config
      );
      
      if (result.success) {
        button.innerHTML = '✅';
        this.showNotification(`${this.getProviderName(provider)} connection successful!`, 'success');
      } else {
        button.innerHTML = '❌';
        this.showNotification(`${this.getProviderName(provider)} connection failed: ${result.error}`, 'error');
      }
      
    } catch (error) {
      button.innerHTML = '❌';
      this.showNotification(`Test failed: ${error.message}`, 'error');
    } finally {
      setTimeout(() => {
        button.innerHTML = originalContent;
        button.disabled = false;
      }, 2000);
    }
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  /**
   * Update default provider options
   */
  updateDefaultProviderOptions() {
    const select = document.getElementById('default-provider');
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = Object.entries(this.settings.api.providers)
      .filter(([_, config]) => config.enabled)
      .map(([provider, _]) => `
        <option value="${provider}">
          ${this.getProviderName(provider)}
        </option>
      `).join('');
    
    // Restore selection if still valid
    if (Array.from(select.options).some(opt => opt.value === currentValue)) {
      select.value = currentValue;
    }
  }

  // === THEME METHODS ===

  /**
   * Set theme mode
   */
  setThemeMode(mode) {
    this.settings.theme.mode = mode;
    this.applyTheme();
    this.markUnsavedChanges();
  }

  /**
   * Update color
   */
  updateColor(type) {
    const input = document.getElementById(`${type}-color`);
    this.settings.theme[`${type}Color`] = input.value;
    
    // Update text input
    const textInput = input.nextElementSibling;
    textInput.value = input.value;
    
    this.applyTheme();
    this.markUnsavedChanges();
  }

  /**
   * Update color from text input
   */
  updateColorText(type) {
    const textInput = event.target;
    const colorInput = textInput.previousElementSibling;
    
    if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
      colorInput.value = textInput.value;
      this.settings.theme[`${type}Color`] = textInput.value;
      this.applyTheme();
      this.markUnsavedChanges();
    }
  }

  /**
   * Update font size
   */
  updateFontSize() {
    const input = document.getElementById('font-size');
    const value = parseInt(input.value);
    this.settings.theme.fontSize = value;
    
    // Update display
    const display = input.nextElementSibling;
    display.textContent = `${value}px`;
    
    this.applyTheme();
    this.markUnsavedChanges();
  }

  /**
   * Update font family
   */
  updateFontFamily() {
    const select = document.getElementById('font-family');
    this.settings.theme.fontFamily = select.value;
    this.applyTheme();
    this.markUnsavedChanges();
  }

  /**
   * Toggle animations
   */
  toggleAnimations() {
    const checkbox = document.getElementById('animations-enabled');
    this.settings.theme.animations = checkbox.checked;
    this.applyTheme();
    this.markUnsavedChanges();
  }

  /**
   * Toggle high contrast
   */
  toggleHighContrast() {
    const checkbox = document.getElementById('high-contrast');
    this.settings.theme.highContrast = checkbox.checked;
    this.applyTheme();
    this.markUnsavedChanges();
  }

  /**
   * Update custom CSS
   */
  updateCustomCSS() {
    const textarea = document.getElementById('custom-css');
    this.settings.theme.customCSS = textarea.value;
    this.applyTheme();
    this.markUnsavedChanges();
  }

  /**
   * Apply theme changes
   */
  applyTheme() {
    const root = document.documentElement;
    
    // Apply theme mode
    if (this.settings.theme.mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', this.settings.theme.mode);
    }
    
    // Apply colors
    root.style.setProperty('--primary-color', this.settings.theme.primaryColor);
    root.style.setProperty('--accent-color', this.settings.theme.accentColor);
    
    // Apply typography
    root.style.setProperty('--font-size', `${this.settings.theme.fontSize}px`);
    root.style.setProperty('--font-family', this.settings.theme.fontFamily);
    
    // Apply animations
    root.classList.toggle('no-animations', !this.settings.theme.animations);
    
    // Apply high contrast
    root.classList.toggle('high-contrast', this.settings.theme.highContrast);
    
    // Apply custom CSS
    let customStyleTag = document.getElementById('custom-styles');
    if (!customStyleTag) {
      customStyleTag = document.createElement('style');
      customStyleTag.id = 'custom-styles';
      document.head.appendChild(customStyleTag);
    }
    customStyleTag.textContent = this.settings.theme.customCSS;
  }

  // === SHORTCUT METHODS ===

  /**
   * Edit shortcut
   */
  editShortcut(category, action) {
    const input = document.getElementById(`shortcut-${category}-${action}`);
    input.classList.add('editing');
    input.value = 'Press keys...';
    
    const handler = (e) => {
      e.preventDefault();
      
      if (e.key === 'Escape') {
        // Cancel
        input.value = this.settings.shortcuts[category][action];
        input.classList.remove('editing');
        document.removeEventListener('keydown', handler);
        return;
      }
      
      if (e.key === 'Enter' && input.dataset.newShortcut) {
        // Save
        this.settings.shortcuts[category][action] = input.dataset.newShortcut;
        input.classList.remove('editing');
        document.removeEventListener('keydown', handler);
        this.markUnsavedChanges();
        return;
      }
      
      // Build shortcut string
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.metaKey) parts.push('Cmd');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      
      if (e.key && !['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      }
      
      if (parts.length > 0) {
        const shortcut = parts.join('+');
        input.value = shortcut;
        input.dataset.newShortcut = shortcut;
      }
    };
    
    document.addEventListener('keydown', handler);
  }

  /**
   * Reset shortcut to default
   */
  resetShortcut(category, action) {
    // TODO: Store default shortcuts
    this.showNotification('Reset to default not yet implemented', 'info');
  }

  // === PERFORMANCE METHODS ===

  /**
   * Update memory display
   */
  updateMemoryDisplay() {
    const input = document.getElementById('max-memory');
    const display = input.nextElementSibling;
    display.textContent = `${input.value} MB`;
    this.settings.performance.maxMemoryUsage = parseInt(input.value);
    this.markUnsavedChanges();
  }

  /**
   * Clear cache
   */
  async clearCache() {
    if (!confirm('Clear all cached data? This cannot be undone.')) return;
    
    try {
      await legacyBridge.executeV1Function('CacheManager.clearAll');
      localStorage.removeItem('kcv2_cache');
      
      this.showNotification('Cache cleared successfully', 'success');
      this.calculateCacheSize();
      
    } catch (error) {
      this.showNotification('Failed to clear cache: ' + error.message, 'error');
    }
  }

  /**
   * Calculate cache size
   */
  async calculateCacheSize() {
    const sizeElement = document.getElementById('cache-size');
    if (!sizeElement) return;
    
    try {
      let totalSize = 0;
      
      // Calculate localStorage size
      for (let key in localStorage) {
        totalSize += localStorage[key].length * 2; // UTF-16
      }
      
      // Add IndexedDB size if available
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        totalSize += estimate.usage || 0;
      }
      
      sizeElement.textContent = `Cache size: ${this.formatBytes(totalSize)}`;
      
    } catch (error) {
      sizeElement.textContent = 'Unable to calculate cache size';
    }
  }

  /**
   * Apply performance settings
   */
  applyPerformanceSettings() {
    // These would be applied to the actual app components
    console.log('[SettingsView] Applying performance settings:', this.settings.performance);
  }

  // === ADVANCED METHODS ===

  /**
   * Create backup
   */
  async createBackup() {
    try {
      const backup = {
        version: '2.0',
        timestamp: Date.now(),
        settings: this.settings,
        appState: appState.getAll(),
        v1State: await legacyBridge.executeV1Function('AppState.getAll')
      };
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kc-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showNotification('Backup created successfully', 'success');
      
    } catch (error) {
      this.showNotification('Failed to create backup: ' + error.message, 'error');
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const backup = JSON.parse(text);
        
        if (!backup.version || !backup.settings) {
          throw new Error('Invalid backup file');
        }
        
        if (!confirm('Restore from backup? This will overwrite current settings.')) {
          return;
        }
        
        // Restore settings
        this.settings = backup.settings;
        await this.saveSettings();
        
        // Restore app state if available
        if (backup.appState) {
          Object.entries(backup.appState).forEach(([key, value]) => {
            appState.set(key, value);
          });
        }
        
        this.render();
        this.showNotification('Backup restored successfully', 'success');
        
      } catch (error) {
        this.showNotification('Failed to restore backup: ' + error.message, 'error');
      }
    };
    
    input.click();
  }

  /**
   * Clear all data
   */
  async clearAllData() {
    if (!confirm('⚠️ This will delete ALL your data including files, analysis, and settings. This cannot be undone!')) {
      return;
    }
    
    if (!confirm('Are you absolutely sure? Type "DELETE" to confirm.')) {
      return;
    }
    
    const confirmation = prompt('Type DELETE to confirm:');
    if (confirmation !== 'DELETE') {
      this.showNotification('Deletion cancelled', 'info');
      return;
    }
    
    try {
      // Clear V2 data
      localStorage.clear();
      
      // Clear V1 data
      await legacyBridge.executeV1Function('AppState.clear');
      
      // Reload page
      window.location.reload();
      
    } catch (error) {
      this.showNotification('Failed to clear data: ' + error.message, 'error');
    }
  }

  // === IMPORT/EXPORT METHODS ===

  /**
   * Import settings
   */
  importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        
        if (!imported.api || !imported.theme || !imported.shortcuts) {
          throw new Error('Invalid settings file');
        }
        
        this.settings = imported;
        this.render();
        this.applyTheme();
        this.markUnsavedChanges();
        
        this.showNotification('Settings imported successfully', 'success');
        
      } catch (error) {
        this.showNotification('Failed to import settings: ' + error.message, 'error');
      }
    };
    
    input.click();
  }

  /**
   * Export settings
   */
  exportSettings() {
    const blob = new Blob([JSON.stringify(this.settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kc-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showNotification('Settings exported successfully', 'success');
  }

  /**
   * Reset settings to defaults
   */
  resetSettings() {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
      return;
    }
    
    // Reset to constructor defaults
    this.settings = new SettingsView().settings;
    this.render();
    this.applyTheme();
    
    this.showNotification('Settings reset to defaults', 'success');
  }

  // === UTILITY METHODS ===

  /**
   * Get provider display name
   */
  getProviderName(provider) {
    const names = {
      ollama: 'Ollama (Local)',
      openai: 'OpenAI',
      gemini: 'Google Gemini',
      anthropic: 'Anthropic Claude'
    };
    return names[provider] || provider;
  }

  /**
   * Get model options for provider
   */
  getModelOptions(provider) {
    const models = {
      ollama: [
        { value: 'llama2', label: 'Llama 2' },
        { value: 'mistral', label: 'Mistral' },
        { value: 'codellama', label: 'Code Llama' },
        { value: 'neural-chat', label: 'Neural Chat' }
      ],
      openai: [
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4o', label: 'GPT-4o' }
      ],
      gemini: [
        { value: 'gemini-pro', label: 'Gemini Pro' },
        { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
      ],
      anthropic: [
        { value: 'claude-2', label: 'Claude 2' },
        { value: 'claude-instant', label: 'Claude Instant' }
      ]
    };
    return models[provider] || [];
  }

  /**
   * Get category display name
   */
  getCategoryName(category) {
    const names = {
      global: 'Global Shortcuts',
      discovery: 'Discovery View',
      analysis: 'Analysis View',
      organization: 'Organization View'
    };
    return names[category] || category;
  }

  /**
   * Get action display name
   */
  getActionName(action) {
    const names = {
      search: 'Search',
      settings: 'Open Settings',
      help: 'Show Help',
      toggleTheme: 'Toggle Theme',
      selectAll: 'Select All',
      analyze: 'Analyze Files',
      categorize: 'Categorize',
      approve: 'Approve',
      start: 'Start Analysis',
      stop: 'Stop Analysis',
      clearQueue: 'Clear Queue',
      newCategory: 'New Category',
      export: 'Export',
      group: 'Group Selected'
    };
    return names[action] || action;
  }

  /**
   * Format bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Mark unsaved changes
   */
  markUnsavedChanges() {
    const saveButton = document.getElementById('save-settings');
    if (saveButton) {
      saveButton.classList.add('has-changes');
      saveButton.textContent = '💾 Save Changes*';
    }
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    console.log(`[SettingsView] ${type.toUpperCase()}: ${message}`);
    
    // TODO: Implement toast notification system
    // For now, use alert for errors
    if (type === 'error') {
      alert(`Error: ${message}`);
    }
  }

  /**
   * Render error state
   */
  renderError(message) {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Settings View Error</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">
          🔄 Reload Page
        </button>
      </div>
    `;
  }

  /**
   * Destroy the view
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    console.log('[SettingsView] Destroyed');
  }
}

// Create global instance for onclick handlers
window.settingsView = null;

export default SettingsView;
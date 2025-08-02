/**
 * KC V2 - Main Application Entry Point
 */

import { EventBus } from './core/EventBus.js';
import { AppState } from './core/AppState.js';
import { APIService } from './services/APIService.js';
import { NavigationController } from './core/NavigationController.js';
import { CommandPalette } from './components/CommandPalette.js';
import { Terminal } from './components/Terminal.js';
import { StatusBar } from './components/StatusBar.js';
import { DiscoveryView } from './views/DiscoveryView.js';
import { AnalysisView } from './views/AnalysisView.js';
import { OrganizationView } from './views/OrganizationView.js';
import { ExportView } from './views/ExportView.js';
import { SettingsView } from './views/SettingsView.js';
import { LogsView } from './views/LogsView.js';
import { StatsView } from './views/StatsView.js';
import { KeyboardShortcuts } from './utils/KeyboardShortcuts.js';
import { Logger } from './utils/Logger.js';

class KnowledgeConsolidatorV2 {
  constructor() {
    this.eventBus = new EventBus();
    this.appState = new AppState();
    this.logger = new Logger('KC V2');
    this.api = null;
    this.components = {};
    this.views = {};
    this.initialized = false;
  }

  async initialize() {
    try {
      this.logger.info('Initializing Knowledge Consolidator V2...');
      
      // Initialize API service
      this.api = new APIService();
      await this.api.initialize();
      
      // Initialize core components
      this.initializeComponents();
      
      // Initialize views
      this.initializeViews();
      
      // Setup navigation
      this.navigation = new NavigationController(this.views);
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Load initial data
      await this.loadInitialData();
      
      // Update status
      this.components.statusBar.updateStatus('api', 'online');
      this.components.statusBar.showMessage('System initialized successfully');
      
      // Show initial view
      this.navigation.navigateTo('discovery');
      
      this.initialized = true;
      this.logger.info('KC V2 initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      this.handleInitializationError(error);
    }
  }

  initializeComponents() {
    // Command Palette
    this.components.commandPalette = new CommandPalette();
    
    // Terminal
    this.components.terminal = new Terminal();
    
    // Status Bar
    this.components.statusBar = new StatusBar();
    
    // Initialize all components
    Object.values(this.components).forEach(component => {
      if (component.initialize) {
        component.initialize();
      }
    });
  }

  initializeViews() {
    this.views = {
      discovery: new DiscoveryView(this.api),
      analysis: new AnalysisView(this.api),
      organization: new OrganizationView(this.api),
      export: new ExportView(this.api),
      settings: new SettingsView(this.api),
      logs: new LogsView(this.api),
      stats: new StatsView(this.api)
    };
    
    // Initialize all views
    Object.values(this.views).forEach(view => {
      if (view.initialize) {
        view.initialize();
      }
    });
  }

  setupKeyboardShortcuts() {
    const shortcuts = new KeyboardShortcuts();
    
    // Command palette
    shortcuts.register('ctrl+k', () => {
      this.components.commandPalette.toggle();
    });
    
    // Navigation shortcuts
    shortcuts.register('ctrl+1', () => this.navigation.navigateTo('discovery'));
    shortcuts.register('ctrl+2', () => this.navigation.navigateTo('analysis'));
    shortcuts.register('ctrl+3', () => this.navigation.navigateTo('organization'));
    shortcuts.register('ctrl+4', () => this.navigation.navigateTo('export'));
    shortcuts.register('ctrl+,', () => this.navigation.navigateTo('settings'));
    shortcuts.register('ctrl+l', () => this.navigation.navigateTo('logs'));
    shortcuts.register('ctrl+s', () => this.navigation.navigateTo('stats'));
    
    // Terminal toggle
    shortcuts.register('ctrl+`', () => {
      this.components.terminal.toggle();
    });
    
    // Focus terminal
    shortcuts.register('ctrl+shift+`', () => {
      this.components.terminal.focus();
    });
  }

  async loadInitialData() {
    try {
      // Load categories
      const categories = await this.api.getCategories();
      this.appState.set('categories', categories);
      
      // Load settings
      const settings = await this.api.getSettings('app');
      if (settings.value) {
        this.appState.set('settings', settings.value);
      }
      
      // Load last state
      const lastState = await this.api.getState('lastSession');
      if (lastState.value) {
        this.appState.merge(lastState.value);
      }
      
    } catch (error) {
      this.logger.error('Failed to load initial data:', error);
    }
  }

  handleInitializationError(error) {
    // Show error in UI
    const errorContainer = document.createElement('div');
    errorContainer.className = 'initialization-error';
    errorContainer.innerHTML = `
      <div class="error-content">
        <h2>Initialization Error</h2>
        <p>Failed to initialize Knowledge Consolidator V2</p>
        <pre>${error.message}</pre>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
    document.body.appendChild(errorContainer);
  }

  // Public API
  getAPI() {
    return this.api;
  }

  getEventBus() {
    return this.eventBus;
  }

  getAppState() {
    return this.appState;
  }

  getLogger() {
    return this.logger;
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  window.KC = new KnowledgeConsolidatorV2();
  await window.KC.initialize();
});

// Export for debugging
export { KnowledgeConsolidatorV2 };
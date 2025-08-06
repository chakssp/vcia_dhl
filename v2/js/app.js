/**
 * KC V2 - Main Application Entry Point
 */

import EventBus from './core/EventBus.js';
import AppState from './core/AppState.js';
import { APIService } from './services/APIService.js';
import { NavigationController } from './core/NavigationController.js';
import { CommandPalette } from './components/CommandPalette.js';
import { StatusBar } from './components/StatusBar.js';
import { FocusMode } from './components/FocusMode.js';
import { DiscoveryView } from './views/DiscoveryView.js';
import { AnalysisView } from './views/AnalysisView.js';
import { OrganizationView } from './views/OrganizationView.js';
import { ExportView } from './views/ExportView.js';
import { SettingsView } from './views/SettingsView.js';
import { LogsView } from './views/LogsView.js';
import { StatsView } from './views/StatsView.js';
import { KeyboardShortcuts } from './utils/KeyboardShortcuts.js';
import { Logger } from './utils/Logger.js';

// V1 Integration Components (Agent 2)
import { LegacyBridge } from './core/LegacyBridge.js';
import { V1IntegrationLoader } from './integration/V1IntegrationLoader.js';
import { V1ServiceAdapters } from './integration/V1ServiceAdapters.js';
import { BackwardsCompatibility } from './integration/BackwardsCompatibility.js';

// Test Data Generator BR (Priority #3)
import TestDataGeneratorBR from './services/TestDataGeneratorBR.js';
import TestDataGeneratorModal from './components/TestDataGeneratorModal.js';

// Backend Services (Agent 4)
import { WebSocketService } from './services/WebSocketService.js';
import { BatchOperations } from './services/BatchOperations.js';
import persistenceService from './services/PersistenceService.js';
import migrationManager from './services/MigrationManager.js';
import compressionUtils from './utils/CompressionUtils.js';

// UI Enhancements (Agent 3)
import { ThemeSwitcher } from './utils/ThemeSwitcher.js';

// V1 Migrated Components
import filterManager from './managers/FilterManager.js';

class KnowledgeConsolidatorV2 {
  constructor() {
    this.eventBus = EventBus; // Use the singleton instance
    this.appState = AppState; // Use the singleton instance
    this.logger = new Logger('KC V2');
    this.api = null;
    this.components = {};
    this.views = {};
    this.services = {};
    this.initialized = false;
    
    // Initialize V1 compatibility
    this.legacyBridge = new LegacyBridge();
    
    // Initialize Test Data Generator BR
    this.testDataGenerator = TestDataGeneratorBR;
  }

  async initialize() {
    try {
      this.logger.info('Initializing Knowledge Consolidator V2...');
      
      // Initialize API service
      this.api = new APIService();
      await this.api.initialize();
      
      // Initialize backend services (don't fail if services unavailable)
      try {
        await this.initializeServices();
      } catch (error) {
        this.logger.warn('Backend services initialization failed:', error);
      }
      
      // Initialize V1 compatibility if needed
      try {
        await this.initializeV1Compatibility();
      } catch (error) {
        this.logger.warn('V1 compatibility initialization failed:', error);
      }
      
      // Initialize core components
      this.initializeComponents();
      
      // Initialize views
      this.initializeViews();
      
      // Setup navigation
      this.navigation = new NavigationController(this.views);
      await this.navigation.initialize(); // Initialize BEFORE using navigateTo
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      // Initialize theme system
      this.themeSwitcher = new ThemeSwitcher();
      
      // Setup Test Data Generator modal handler
      this.setupTestDataGenerator();
      
      // Load initial data
      await this.loadInitialData();
      
      // Update status
      if (this.api.offlineMode) {
        this.components.statusBar.updateStatus('api', 'offline');
        this.components.statusBar.showMessage('System initialized in OFFLINE mode');
      } else {
        this.components.statusBar.updateStatus('api', 'online');
        this.components.statusBar.showMessage('System initialized successfully');
      }
      
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
    
    // Status Bar
    this.components.statusBar = new StatusBar(this.api);
    
    // Focus Mode
    this.components.focusMode = new FocusMode();
    
    // Filter Manager (V1 migrated)
    this.components.filterManager = filterManager;
    
    // Initialize all components
    Object.values(this.components).forEach(component => {
      if (component.initialize && typeof component.initialize === 'function') {
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
    
    // Note: Discovery view sets itself as window._discoveryView for inline handlers
    
    // Initialize all views with their containers
    Object.entries(this.views).forEach(([viewName, view]) => {
      if (view.initialize) {
        const container = document.getElementById(`${viewName}-view`);
        view.initialize(container);
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
  }

  async loadInitialData() {
    try {
      // Load categories
      const categories = await this.api.getCategories();
      this.appState.set('categories', categories);
      
      // Load settings
      const settings = await this.api.getSettings('app');
      if (settings && settings.value) {
        this.appState.set('settings', settings.value);
      }
      
      // Load last state
      const lastState = await this.api.getState('lastSession');
      if (lastState && lastState.value) {
        this.appState.merge(lastState.value);
      }
      
      this.logger.info('Initial data loaded successfully');
      
    } catch (error) {
      this.logger.error('Failed to load initial data:', error);
      // Continue anyway - app can work without initial data
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
  
  async initializeServices() {
    try {
      // Initialize Persistence Service (works both online and offline)
      this.logger.info('Initializing Persistence Layer V2...');
      const persistenceInitialized = await persistenceService.initialize();
      
      if (persistenceInitialized) {
        this.logger.info('Persistence Service initialized successfully');
        
        // Run migration if needed
        try {
          const migrationAnalysis = await migrationManager.migrate({ onlyCheck: true });
          if (migrationAnalysis.plan.total > 0) {
            this.logger.info(`Found ${migrationAnalysis.plan.total} migrations to run`);
            // Migration can be run manually or automatically based on configuration
          }
        } catch (migrationError) {
          this.logger.warn('Migration analysis failed:', migrationError);
        }
      } else {
        this.logger.warn('Persistence Service initialization failed, continuing with limited functionality');
      }
      
      // Bind persistence services to global
      this.services.persistence = persistenceService;
      this.services.migration = migrationManager;
      this.services.compression = compressionUtils;
      
      // Bind to API for backward compatibility
      this.api.persistence = persistenceService;
      
      // Skip WebSocket if in offline mode
      if (this.api.offlineMode) {
        this.logger.info('Skipping WebSocket service in offline mode');
      } else {
        // WebSocket Service
        this.services.websocket = new WebSocketService();
        await this.services.websocket.connect();
        this.api.websocket = this.services.websocket;
      }
      
      // Batch Operations (works both online and offline)
      this.services.batchOps = new BatchOperations(this.api);
      this.api.batchOps = this.services.batchOps;
      
      this.logger.info('Backend services initialized');
    } catch (error) {
      this.logger.warn('Some services failed to initialize:', error);
      throw error; // Re-throw to be caught by caller
    }
  }
  
  async initializeV1Compatibility() {
    try {
      // Check if V1 data exists
      const hasV1Data = await this.legacyBridge.checkV1Data();
      
      if (hasV1Data) {
        this.logger.info('V1 data detected, initializing compatibility layer');
        
        // Load V1 integration
        const v1Loader = new V1IntegrationLoader();
        await v1Loader.initialize();
        
        // Setup service adapters
        const adapters = new V1ServiceAdapters(this.api);
        await adapters.initialize();
        
        // Enable backwards compatibility
        const backCompat = new BackwardsCompatibility();
        backCompat.enable();
        
        // Update status
        this.components.statusBar?.showMessage('V1 compatibility mode enabled');
      }
    } catch (error) {
      this.logger.warn('V1 compatibility initialization failed:', error);
    }
    
    // Initialize V2 managers
    try {
      const ConfigManager = (await import('./managers/ConfigManager.js')).default;
      const DiscoveryManager = (await import('./managers/DiscoveryManager.js')).default;
      const CategoryManager = (await import('./managers/CategoryManager.js')).default;
      
      await ConfigManager.initialize();
      await CategoryManager.initialize(); // PRIORITY #1 - CategoryManager initialization
      await DiscoveryManager.initialize();
      
      // Expose managers globally for debugging
      this.managers = {
        config: ConfigManager,
        category: CategoryManager,
        discovery: DiscoveryManager
      };
      
      this.logger.info('V2 managers initialized successfully:', {
        config: ConfigManager.initialized,
        category: CategoryManager.initialized,
        discovery: DiscoveryManager.initialized
      });
    } catch (error) {
      this.logger.error('Failed to initialize V2 managers:', error);
    }
  }
  
  setupTestDataGenerator() {
    // Setup modal system for Test Data Generator
    this.eventBus.on('modal:show', (data) => {
      if (data.type === 'test-data-generator') {
        this.showTestDataGeneratorModal(data);
      }
    });
    
    this.eventBus.on('modal:close', () => {
      this.closeModal();
    });
    
    // Listen for commands registration from TestDataGeneratorBR
    this.eventBus.on('commands:register', (data) => {
      if (this.components.commandPalette && data.commands) {
        data.commands.forEach(command => {
          this.components.commandPalette.registerCommand(command);
        });
        this.logger.info(`Registered ${data.commands.length} Test Data Generator commands`);
      }
    });
    
    // Expose globally for debugging
    window.TestDataGeneratorBR = this.testDataGenerator;
    
    this.logger.info('Test Data Generator BR initialized and integrated');
  }
  
  showTestDataGeneratorModal(data) {
    // Create modal overlay
    let modalOverlay = document.getElementById('test-data-modal-overlay');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'test-data-modal-overlay';
      modalOverlay.className = 'modal-overlay';
      document.body.appendChild(modalOverlay);
    }
    
    // Create modal content
    const modal = new TestDataGeneratorModal();
    modalOverlay.innerHTML = `
      <div class="modal-container">
        ${modal.getStyles()}
        ${modal.render()}
      </div>
    `;
    
    // Initialize modal
    modal.initialize(modalOverlay);
    
    // Show modal
    modalOverlay.style.display = 'flex';
    modalOverlay.classList.add('show');
    
    // Add ESC key handler
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    this.logger.info('Test Data Generator modal opened');
  }
  
  closeModal() {
    const modalOverlay = document.getElementById('test-data-modal-overlay');
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
      modalOverlay.classList.remove('show');
      modalOverlay.innerHTML = '';
    }
    
    this.logger.info('Modal closed');
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  window.KC = new KnowledgeConsolidatorV2();
  await window.KC.initialize();
});

// Export for debugging
export { KnowledgeConsolidatorV2 };
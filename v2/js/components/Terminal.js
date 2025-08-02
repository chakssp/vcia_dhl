/**
 * Terminal.js - Interactive terminal component for KC V2
 * Provides command-line interface with history, completion, and multi-tab support
 */

import eventBus, { Events } from '../core/EventBus.js';
import appState from '../core/AppState.js';
import { legacyBridge } from '../core/LegacyBridge.js';

export class Terminal {
  constructor() {
    this.container = null;
    this.activeTab = 'console';
    this.history = [];
    this.historyIndex = -1;
    this.currentInput = '';
    this.commandBuffer = [];
    this.isOpen = false;
    this.logBuffer = {
      console: [],
      logs: [],
      api: []
    };
    this.maxLogEntries = 1000;
    this.initialized = false;
    
    // Command definitions
    this.commands = {
      help: {
        description: 'Show available commands',
        usage: 'help [command]',
        handler: this.handleHelp.bind(this)
      },
      clear: {
        description: 'Clear terminal output',
        usage: 'clear [tab]',
        handler: this.handleClear.bind(this)
      },
      status: {
        description: 'Show system status',
        usage: 'status [component]',
        handler: this.handleStatus.bind(this)
      },
      kcdiag: {
        description: 'Run V1 diagnostics',
        usage: 'kcdiag()',
        handler: this.handleKcdiag.bind(this)
      },
      search: {
        description: 'Search files',
        usage: 'search <query>',
        handler: this.handleSearch.bind(this)
      },
      analyze: {
        description: 'Analyze file with AI',
        usage: 'analyze <file>',
        handler: this.handleAnalyze.bind(this)
      },
      category: {
        description: 'Manage categories',
        usage: 'category list|add|remove [name] [color]',
        handler: this.handleCategory.bind(this)
      },
      files: {
        description: 'List and manage files',
        usage: 'files [count] [filter]',
        handler: this.handleFiles.bind(this)
      },
      config: {
        description: 'Show configuration',
        usage: 'config [key] [value]',
        handler: this.handleConfig.bind(this)
      },
      v1: {
        description: 'Execute V1 function',
        usage: 'v1 <function.path> [args...]',
        handler: this.handleV1Execute.bind(this)
      },
      export: {
        description: 'Export data',
        usage: 'export <format> [options]',
        handler: this.handleExport.bind(this)
      },
      theme: {
        description: 'Change terminal theme',
        usage: 'theme [light|dark|auto]',
        handler: this.handleTheme.bind(this)
      },
      history: {
        description: 'Show command history',
        usage: 'history [count]',
        handler: this.handleHistory.bind(this)
      }
    };
    
    this.setupEventListeners();
  }
  
  /**
   * Initialize terminal component
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.createTerminalUI();
      this.setupKeyboardHandlers();
      this.startLogStreaming();
      
      this.initialized = true;
      this.log('console', 'Terminal initialized. Type "help" for available commands.');
      
      // Welcome message
      this.log('console', `KC V2 Terminal v1.0.0`);
      this.log('console', `Available tabs: Console, Logs, API Monitor`);
      this.log('console', `Press Ctrl+\` to toggle terminal`);
      
    } catch (error) {
      console.error('[Terminal] Initialization failed:', error);
    }
  }
  
  /**
   * Create terminal UI structure
   */
  async createTerminalUI() {
    // Check if already exists
    this.container = document.querySelector('.terminal');
    if (this.container) return;
    
    this.container = document.createElement('div');
    this.container.className = 'terminal hidden';
    this.container.innerHTML = `
      <div class="terminal-header">
        <div class="terminal-tabs">
          <button class="terminal-tab active" data-tab="console">Console</button>
          <button class="terminal-tab" data-tab="logs">Logs</button>
          <button class="terminal-tab" data-tab="api">API Monitor</button>
        </div>
        <div class="terminal-controls">
          <button class="terminal-control" id="terminal-clear" title="Clear">🗑️</button>
          <button class="terminal-control" id="terminal-minimize" title="Minimize">−</button>
          <button class="terminal-control" id="terminal-close" title="Close">×</button>
        </div>
      </div>
      
      <div class="terminal-content">
        <div class="terminal-output" id="terminal-console">
          <div class="terminal-log-container"></div>
        </div>
        <div class="terminal-output hidden" id="terminal-logs">
          <div class="terminal-log-container"></div>
        </div>
        <div class="terminal-output hidden" id="terminal-api">
          <div class="terminal-log-container"></div>
        </div>
      </div>
      
      <div class="terminal-input-container">
        <span class="terminal-prompt">kc-v2$</span>
        <input type="text" class="terminal-input" placeholder="Type command..." autocomplete="off" spellcheck="false">
        <div class="terminal-suggestions hidden"></div>
      </div>
    `;
    
    document.body.appendChild(this.container);
    this.setupTerminalStyles();
    this.setupTerminalEvents();
  }
  
  /**
   * Setup terminal-specific styles
   */
  setupTerminalStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .terminal {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 40vh;
        background: var(--bg-primary, #1a1a1a);
        border-top: 1px solid var(--border-primary, #333);
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 14px;
        z-index: 1000;
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
      }
      
      .terminal.hidden {
        transform: translateY(100%);
        pointer-events: none;
      }
      
      .terminal.minimized {
        height: 40px;
      }
      
      .terminal.minimized .terminal-content,
      .terminal.minimized .terminal-input-container {
        display: none;
      }
      
      .terminal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--bg-secondary, #2a2a2a);
        border-bottom: 1px solid var(--border-primary, #333);
        padding: 8px 12px;
        min-height: 40px;
      }
      
      .terminal-tabs {
        display: flex;
        gap: 4px;
      }
      
      .terminal-tab {
        background: transparent;
        border: none;
        color: var(--text-secondary, #888);
        padding: 6px 12px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 12px;
        transition: all 0.2s;
      }
      
      .terminal-tab:hover {
        background: var(--bg-hover, #333);
        color: var(--text-primary, #fff);
      }
      
      .terminal-tab.active {
        background: var(--accent-primary, #007acc);
        color: white;
      }
      
      .terminal-controls {
        display: flex;
        gap: 4px;
      }
      
      .terminal-control {
        background: transparent;
        border: none;
        color: var(--text-secondary, #888);
        width: 24px;
        height: 24px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.2s;
      }
      
      .terminal-control:hover {
        background: var(--bg-hover, #333);
        color: var(--text-primary, #fff);
      }
      
      .terminal-content {
        flex: 1;
        overflow: hidden;
        position: relative;
      }
      
      .terminal-output {
        height: 100%;
        overflow-y: auto;
        padding: 12px;
        background: var(--bg-primary, #1a1a1a);
      }
      
      .terminal-output.hidden {
        display: none;
      }
      
      .terminal-log-container {
        color: var(--text-primary, #fff);
        white-space: pre-wrap;
        word-break: break-word;
      }
      
      .terminal-input-container {
        display: flex;
        align-items: center;
        background: var(--bg-secondary, #2a2a2a);
        border-top: 1px solid var(--border-primary, #333);
        padding: 8px 12px;
        position: relative;
      }
      
      .terminal-prompt {
        color: var(--accent-primary, #007acc);
        margin-right: 8px;
        font-weight: bold;
        user-select: none;
      }
      
      .terminal-input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-primary, #fff);
        outline: none;
        font-family: inherit;
        font-size: inherit;
      }
      
      .terminal-suggestions {
        position: absolute;
        bottom: 100%;
        left: 12px;
        right: 12px;
        background: var(--bg-tertiary, #3a3a3a);
        border: 1px solid var(--border-primary, #333);
        border-radius: 4px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 10;
      }
      
      .terminal-suggestions.hidden {
        display: none;
      }
      
      .terminal-suggestion {
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-primary, #333);
        color: var(--text-primary, #fff);
      }
      
      .terminal-suggestion:last-child {
        border-bottom: none;
      }
      
      .terminal-suggestion:hover,
      .terminal-suggestion.selected {
        background: var(--bg-hover, #333);
      }
      
      .terminal-log-entry {
        margin-bottom: 4px;
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      
      .terminal-log-timestamp {
        color: var(--text-secondary, #888);
        font-size: 11px;
        white-space: nowrap;
        margin-top: 1px;
      }
      
      .terminal-log-level {
        font-weight: bold;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 10px;
        text-transform: uppercase;
        white-space: nowrap;
        margin-top: 1px;
      }
      
      .terminal-log-level.info {
        background: #007acc;
        color: white;
      }
      
      .terminal-log-level.warn {
        background: #ff9800;
        color: white;
      }
      
      .terminal-log-level.error {
        background: #f44336;
        color: white;
      }
      
      .terminal-log-level.success {
        background: #4caf50;
        color: white;
      }
      
      .terminal-log-content {
        flex: 1;
        word-break: break-word;
      }
      
      .terminal-command {
        color: var(--accent-primary, #007acc);
      }
      
      .terminal-error {
        color: #f44336;
      }
      
      .terminal-success {
        color: #4caf50;
      }
      
      .terminal-warning {
        color: #ff9800;
      }
      
      .terminal-json {
        background: var(--bg-tertiary, #3a3a3a);
        padding: 8px;
        border-radius: 4px;
        margin: 4px 0;
        overflow-x: auto;
        font-size: 12px;
      }
      
      @media (max-width: 768px) {
        .terminal {
          height: 50vh;
        }
        
        .terminal-header {
          padding: 6px 8px;
        }
        
        .terminal-output {
          padding: 8px;
        }
        
        .terminal-input-container {
          padding: 6px 8px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Setup terminal event handlers
   */
  setupTerminalEvents() {
    // Tab switching
    this.container.querySelectorAll('.terminal-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    // Control buttons
    document.getElementById('terminal-clear').addEventListener('click', () => {
      this.handleClear();
    });
    
    document.getElementById('terminal-minimize').addEventListener('click', () => {
      this.toggleMinimize();
    });
    
    document.getElementById('terminal-close').addEventListener('click', () => {
      this.hide();
    });
    
    // Input handling
    const input = this.container.querySelector('.terminal-input');
    input.addEventListener('keydown', this.handleKeyDown.bind(this));
    input.addEventListener('input', this.handleInput.bind(this));
  }
  
  /**
   * Setup keyboard handlers
   */
  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+` to toggle terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        this.toggle();
      }
      
      // ESC to hide terminal
      if (e.key === 'Escape' && this.isOpen) {
        this.hide();
      }
    });
  }
  
  /**
   * Setup event listeners for system events
   */
  setupEventListeners() {
    // Listen for V1 events through LegacyBridge
    eventBus.on('v1:files_updated', (data) => {
      this.log('logs', `V1 Files Updated: ${data?.action || 'unknown'}`);
    });
    
    eventBus.on('v1:categories_changed', (data) => {
      this.log('logs', `V1 Categories Changed: ${JSON.stringify(data)}`);
    });
    
    eventBus.on('v1:analysis_completed', (data) => {
      this.log('logs', `V1 Analysis Completed: ${data?.fileId || 'unknown'}`);
    });
    
    // Listen for API events
    eventBus.on(Events.API_REQUEST, (data) => {
      this.log('api', `→ ${data.method} ${data.url}`, 'info');
    });
    
    eventBus.on(Events.API_RESPONSE, (data) => {
      this.log('api', `← ${data.status} ${data.url} (${data.duration}ms)`, 'success');
    });
    
    eventBus.on(Events.API_ERROR, (data) => {
      this.log('api', `✗ ${data.method} ${data.url}: ${data.error}`, 'error');
    });
    
    // Listen for system events
    eventBus.on(Events.SYSTEM_ERROR, (data) => {
      this.log('logs', `System Error: ${data.message}`, 'error');
    });
    
    eventBus.on(Events.SYSTEM_WARNING, (data) => {
      this.log('logs', `System Warning: ${data.message}`, 'warn');
    });
    
    eventBus.on(Events.SYSTEM_INFO, (data) => {
      this.log('logs', `System Info: ${data.message}`, 'info');
    });
  }
  
  /**
   * Start real-time log streaming
   */
  startLogStreaming() {
    // Override console methods to capture logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log = (...args) => {
      originalLog.apply(console, args);
      this.log('logs', args.join(' '), 'info');
    };
    
    console.error = (...args) => {
      originalError.apply(console, args);
      this.log('logs', args.join(' '), 'error');
    };
    
    console.warn = (...args) => {
      originalWarn.apply(console, args);
      this.log('logs', args.join(' '), 'warn');
    };
  }
  
  /**
   * Handle key input
   */
  handleKeyDown(e) {
    const input = e.target;
    
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this.executeCommand(input.value.trim());
        input.value = '';
        this.historyIndex = -1;
        this.hideSuggestions();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.navigateHistory(-1);
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        this.navigateHistory(1);
        break;
        
      case 'Tab':
        e.preventDefault();
        this.handleTabCompletion(input.value);
        break;
        
      case 'Escape':
        this.hideSuggestions();
        break;
    }
  }
  
  /**
   * Handle input changes for suggestions
   */
  handleInput(e) {
    const input = e.target.value;
    this.showSuggestions(input);
  }
  
  /**
   * Navigate command history
   */
  navigateHistory(direction) {
    if (this.history.length === 0) return;
    
    this.historyIndex += direction;
    
    if (this.historyIndex < 0) {
      this.historyIndex = -1;
      this.container.querySelector('.terminal-input').value = this.currentInput;
    } else if (this.historyIndex >= this.history.length) {
      this.historyIndex = this.history.length - 1;
    }
    
    if (this.historyIndex >= 0) {
      this.container.querySelector('.terminal-input').value = this.history[this.historyIndex];
    }
  }
  
  /**
   * Handle tab completion
   */
  handleTabCompletion(input) {
    const parts = input.split(' ');
    const command = parts[0];
    
    if (parts.length === 1) {
      // Complete command name
      const matches = Object.keys(this.commands).filter(cmd => 
        cmd.startsWith(command.toLowerCase())
      );
      
      if (matches.length === 1) {
        this.container.querySelector('.terminal-input').value = matches[0] + ' ';
      } else if (matches.length > 1) {
        this.log('console', `Available commands: ${matches.join(', ')}`);
      }
    } else {
      // Command-specific completion
      this.handleCommandCompletion(command, parts.slice(1));
    }
  }
  
  /**
   * Handle command-specific completion
   */
  handleCommandCompletion(command, args) {
    switch (command) {
      case 'category':
        if (args.length === 1) {
          const subcommands = ['list', 'add', 'remove'];
          const matches = subcommands.filter(sub => sub.startsWith(args[0]));
          if (matches.length === 1) {
            const input = this.container.querySelector('.terminal-input');
            input.value = `category ${matches[0]} `;
          }
        }
        break;
        
      case 'search':
      case 'analyze':
        // Could suggest file names
        break;
    }
  }
  
  /**
   * Show command suggestions
   */
  showSuggestions(input) {
    if (!input.trim()) {
      this.hideSuggestions();
      return;
    }
    
    const suggestions = this.getSuggestions(input);
    if (suggestions.length === 0) {
      this.hideSuggestions();
      return;
    }
    
    const container = this.container.querySelector('.terminal-suggestions');
    container.innerHTML = '';
    
    suggestions.forEach(suggestion => {
      const div = document.createElement('div');
      div.className = 'terminal-suggestion';
      div.textContent = suggestion;
      div.addEventListener('click', () => {
        this.container.querySelector('.terminal-input').value = suggestion;
        this.hideSuggestions();
      });
      container.appendChild(div);
    });
    
    container.classList.remove('hidden');
  }
  
  /**
   * Get command suggestions
   */
  getSuggestions(input) {
    const parts = input.split(' ');
    const command = parts[0].toLowerCase();
    
    if (parts.length === 1) {
      // Suggest command names
      return Object.keys(this.commands)
        .filter(cmd => cmd.startsWith(command))
        .map(cmd => cmd);
    }
    
    // Command-specific suggestions
    switch (command) {
      case 'category':
        const subcommands = ['list', 'add', 'remove'];
        if (parts.length === 2) {
          return subcommands.filter(sub => sub.startsWith(parts[1]));
        }
        break;
        
      case 'theme':
        const themes = ['light', 'dark', 'auto'];
        if (parts.length === 2) {
          return themes.filter(theme => theme.startsWith(parts[1]));
        }
        break;
    }
    
    return [];
  }
  
  /**
   * Hide suggestions
   */
  hideSuggestions() {
    this.container.querySelector('.terminal-suggestions').classList.add('hidden');
  }
  
  /**
   * Execute command
   */
  async executeCommand(commandLine) {
    if (!commandLine) return;
    
    // Add to history
    if (this.history[this.history.length - 1] !== commandLine) {
      this.history.push(commandLine);
      if (this.history.length > 100) {
        this.history = this.history.slice(-100);
      }
    }
    
    // Show command in output
    this.log('console', `$ ${commandLine}`, 'command');
    
    // Parse command
    const parts = commandLine.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    // Execute command
    try {
      if (this.commands[command]) {
        await this.commands[command].handler(args);
      } else {
        // Try V1 function execution
        if (commandLine.includes('()')) {
          await this.executeV1Function(commandLine);
        } else {
          this.log('console', `Unknown command: ${command}. Type "help" for available commands.`, 'error');
        }
      }
    } catch (error) {
      this.log('console', `Error executing command: ${error.message}`, 'error');
      console.error('[Terminal] Command execution error:', error);
    }
  }
  
  /**
   * Execute V1 function
   */
  async executeV1Function(functionCall) {
    try {
      if (!legacyBridge.initialized) {
        throw new Error('V1 system not available');
      }
      
      // Simple function call parsing
      const funcName = functionCall.replace('()', '');
      
      if (funcName === 'kcdiag') {
        const result = await legacyBridge.executeV1Function('kcdiag');
        this.log('console', JSON.stringify(result, null, 2), 'success');
      } else {
        // Try to execute as property access
        const result = await legacyBridge.executeV1Function(funcName);
        this.log('console', JSON.stringify(result, null, 2), 'success');
      }
    } catch (error) {
      this.log('console', `V1 function error: ${error.message}`, 'error');
    }
  }
  
  /**
   * Command handlers
   */
  
  async handleHelp(args) {
    if (args.length > 0) {
      const command = args[0].toLowerCase();
      const cmd = this.commands[command];
      if (cmd) {
        this.log('console', `${command}: ${cmd.description}`);
        this.log('console', `Usage: ${cmd.usage}`);
      } else {
        this.log('console', `Unknown command: ${command}`, 'error');
      }
    } else {
      this.log('console', 'Available commands:');
      Object.entries(this.commands).forEach(([name, cmd]) => {
        this.log('console', `  ${name.padEnd(12)} - ${cmd.description}`);
      });
    }
  }
  
  async handleClear(args) {
    const tab = args[0] || this.activeTab;
    this.clearTab(tab);
  }
  
  async handleStatus(args) {
    const component = args[0];
    
    if (component) {
      // Show specific component status
      this.log('console', `Status for ${component}:`);
      // Implementation depends on component
    } else {
      // Show general status
      this.log('console', 'System Status:');
      this.log('console', `V2 Initialized: ${this.initialized}`);
      this.log('console', `V1 Bridge: ${legacyBridge.initialized ? 'Connected' : 'Disconnected'}`);
      this.log('console', `Active Tab: ${this.activeTab}`);
      this.log('console', `Files Count: ${appState.getFiles().length}`);
      this.log('console', `Categories Count: ${appState.getCategories().length}`);
    }
  }
  
  async handleKcdiag() {
    try {
      if (!legacyBridge.initialized) {
        throw new Error('V1 system not available');
      }
      
      const result = await legacyBridge.executeV1Function('kcdiag');
      this.log('console', 'V1 Diagnostic Results:', 'success');
      this.log('console', JSON.stringify(result, null, 2));
    } catch (error) {
      this.log('console', `Diagnostic failed: ${error.message}`, 'error');
    }
  }
  
  async handleSearch(args) {
    if (args.length === 0) {
      this.log('console', 'Usage: search <query>', 'error');
      return;
    }
    
    const query = args.join(' ');
    this.log('console', `Searching for: "${query}"`);
    
    try {
      if (legacyBridge.initialized) {
        const qdrantService = legacyBridge.getService('qdrant');
        const results = await qdrantService.search(query);
        
        if (results.length > 0) {
          this.log('console', `Found ${results.length} results:`, 'success');
          results.forEach((result, index) => {
            this.log('console', `${index + 1}. ${result.name} (score: ${result.score})`);
          });
        } else {
          this.log('console', 'No results found', 'warning');
        }
      } else {
        this.log('console', 'Search service not available', 'error');
      }
    } catch (error) {
      this.log('console', `Search failed: ${error.message}`, 'error');
    }
  }
  
  async handleAnalyze(args) {
    if (args.length === 0) {
      this.log('console', 'Usage: analyze <file>', 'error');
      return;
    }
    
    const filename = args.join(' ');
    this.log('console', `Analyzing file: ${filename}`);
    
    try {
      const files = appState.getFiles();
      const file = files.find(f => f.name.toLowerCase().includes(filename.toLowerCase()));
      
      if (!file) {
        this.log('console', `File not found: ${filename}`, 'error');
        return;
      }
      
      if (legacyBridge.initialized) {
        const analysisService = legacyBridge.getService('analysis');
        const result = await analysisService.analyzeFile(file);
        
        this.log('console', 'Analysis completed:', 'success');
        this.log('console', JSON.stringify(result, null, 2));
      } else {
        this.log('console', 'Analysis service not available', 'error');
      }
    } catch (error) {
      this.log('console', `Analysis failed: ${error.message}`, 'error');
    }
  }
  
  async handleCategory(args) {
    if (args.length === 0) {
      this.log('console', 'Usage: category list|add|remove [name] [color]', 'error');
      return;
    }
    
    const action = args[0].toLowerCase();
    
    switch (action) {
      case 'list':
        const categories = appState.getCategories();
        this.log('console', `Categories (${categories.length}):`);
        categories.forEach(cat => {
          this.log('console', `  ${cat.name} (${cat.color}) - ${cat.count} files`);
        });
        break;
        
      case 'add':
        if (args.length < 2) {
          this.log('console', 'Usage: category add <name> [color]', 'error');
          return;
        }
        
        const newCategoryName = args[1];
        const newCategoryColor = args[2] || '#4A90E2';
        
        // Add category through V1 if available
        if (legacyBridge.initialized) {
          try {
            await legacyBridge.executeV1Function('CategoryManager.addCategory', {
              name: newCategoryName,
              color: newCategoryColor
            });
            this.log('console', `Category "${newCategoryName}" added`, 'success');
          } catch (error) {
            this.log('console', `Failed to add category: ${error.message}`, 'error');
          }
        } else {
          this.log('console', 'Category management not available', 'error');
        }
        break;
        
      case 'remove':
        if (args.length < 2) {
          this.log('console', 'Usage: category remove <name>', 'error');
          return;
        }
        
        const categoryToRemove = args[1];
        
        if (legacyBridge.initialized) {
          try {
            await legacyBridge.executeV1Function('CategoryManager.removeCategory', categoryToRemove);
            this.log('console', `Category "${categoryToRemove}" removed`, 'success');
          } catch (error) {
            this.log('console', `Failed to remove category: ${error.message}`, 'error');
          }
        } else {
          this.log('console', 'Category management not available', 'error');
        }
        break;
        
      default:
        this.log('console', `Unknown category action: ${action}`, 'error');
    }
  }
  
  async handleFiles(args) {
    const files = appState.getFiles();
    const count = args[0] ? parseInt(args[0]) : 10;
    const filter = args[1] || '';
    
    let filteredFiles = files;
    if (filter) {
      filteredFiles = files.filter(f => 
        f.name.toLowerCase().includes(filter.toLowerCase()) ||
        f.path.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    const displayFiles = filteredFiles.slice(0, count);
    
    this.log('console', `Files (showing ${displayFiles.length} of ${filteredFiles.length}):`);
    displayFiles.forEach((file, index) => {
      const size = file.size ? `${Math.round(file.size / 1024)}KB` : 'Unknown';
      const categories = file.categories?.join(', ') || 'None';
      this.log('console', `${index + 1}. ${file.name} (${size}) - Categories: ${categories}`);
    });
    
    if (filteredFiles.length > count) {
      this.log('console', `... and ${filteredFiles.length - count} more files`);
    }
  }
  
  async handleConfig(args) {
    if (args.length === 0) {
      // Show all configuration
      const config = appState.toObject();
      this.log('console', 'Current Configuration:');
      this.log('console', JSON.stringify(config, null, 2));
    } else if (args.length === 1) {
      // Show specific config value
      const value = appState.get(args[0]);
      this.log('console', `${args[0]}: ${JSON.stringify(value)}`);
    } else {
      // Set config value
      const key = args[0];
      const value = args.slice(1).join(' ');
      
      try {
        const parsedValue = JSON.parse(value);
        appState.set(key, parsedValue);
        this.log('console', `Set ${key} = ${JSON.stringify(parsedValue)}`, 'success');
      } catch (error) {
        // Treat as string if JSON parsing fails
        appState.set(key, value);
        this.log('console', `Set ${key} = "${value}"`, 'success');
      }
    }
  }
  
  async handleV1Execute(args) {
    if (args.length === 0) {
      this.log('console', 'Usage: v1 <function.path> [args...]', 'error');
      return;
    }
    
    const functionPath = args[0];
    const functionArgs = args.slice(1);
    
    try {
      const result = await legacyBridge.executeV1Function(functionPath, ...functionArgs);
      this.log('console', `V1 Result:`, 'success');
      this.log('console', JSON.stringify(result, null, 2));
    } catch (error) {
      this.log('console', `V1 execution failed: ${error.message}`, 'error');
    }
  }
  
  async handleExport(args) {
    if (args.length === 0) {
      this.log('console', 'Usage: export <format> [options]', 'error');
      this.log('console', 'Available formats: json, markdown, csv');
      return;
    }
    
    const format = args[0].toLowerCase();
    this.log('console', `Exporting data in ${format} format...`);
    
    try {
      const files = appState.getFiles();
      const categories = appState.getCategories();
      
      let exportData;
      let filename;
      let mimeType;
      
      switch (format) {
        case 'json':
          exportData = JSON.stringify({ files, categories }, null, 2);
          filename = `kc-export-${Date.now()}.json`;
          mimeType = 'application/json';
          break;
          
        case 'csv':
          const csvHeader = 'Name,Path,Size,Categories,Analyzed,RelevanceScore\n';
          const csvRows = files.map(f => 
            `"${f.name}","${f.path}",${f.size || 0},"${f.categories?.join(';') || ''}",${f.analyzed || false},${f.relevanceScore || 0}`
          ).join('\n');
          exportData = csvHeader + csvRows;
          filename = `kc-export-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
          
        case 'markdown':
          exportData = `# Knowledge Consolidator Export\n\n`;
          exportData += `Generated: ${new Date().toISOString()}\n\n`;
          exportData += `## Files (${files.length})\n\n`;
          files.forEach(f => {
            exportData += `- **${f.name}**\n`;
            exportData += `  - Path: ${f.path}\n`;
            exportData += `  - Categories: ${f.categories?.join(', ') || 'None'}\n`;
            exportData += `  - Analyzed: ${f.analyzed ? 'Yes' : 'No'}\n\n`;
          });
          filename = `kc-export-${Date.now()}.md`;
          mimeType = 'text/markdown';
          break;
          
        default:
          this.log('console', `Unknown format: ${format}`, 'error');
          return;
      }
      
      // Create download
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      this.log('console', `Export completed: ${filename}`, 'success');
      
    } catch (error) {
      this.log('console', `Export failed: ${error.message}`, 'error');
    }
  }
  
  async handleTheme(args) {
    const theme = args[0] || 'auto';
    
    switch (theme) {
      case 'light':
        document.body.setAttribute('data-theme', 'light');
        this.log('console', 'Switched to light theme', 'success');
        break;
        
      case 'dark':
        document.body.setAttribute('data-theme', 'dark');
        this.log('console', 'Switched to dark theme', 'success');
        break;
        
      case 'auto':
        document.body.removeAttribute('data-theme');
        this.log('console', 'Switched to auto theme', 'success');
        break;
        
      default:
        this.log('console', `Unknown theme: ${theme}. Available: light, dark, auto`, 'error');
    }
  }
  
  async handleHistory(args) {
    const count = args[0] ? parseInt(args[0]) : 20;
    const displayHistory = this.history.slice(-count);
    
    this.log('console', `Command History (last ${displayHistory.length}):`);
    displayHistory.forEach((cmd, index) => {
      this.log('console', `${index + 1}. ${cmd}`);
    });
  }
  
  /**
   * Utility methods
   */
  
  /**
   * Switch terminal tab
   */
  switchTab(tabName) {
    // Update active tab
    this.activeTab = tabName;
    
    // Update tab buttons
    this.container.querySelectorAll('.terminal-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update content visibility
    this.container.querySelectorAll('.terminal-output').forEach(output => {
      output.classList.toggle('hidden', !output.id.includes(tabName));
    });
  }
  
  /**
   * Clear terminal tab
   */
  clearTab(tabName = this.activeTab) {
    this.logBuffer[tabName] = [];
    const container = this.container.querySelector(`#terminal-${tabName} .terminal-log-container`);
    if (container) {
      container.innerHTML = '';
    }
  }
  
  /**
   * Log message to terminal
   */
  log(tab, message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
      timestamp,
      message,
      level,
      tab
    };
    
    // Add to buffer
    if (!this.logBuffer[tab]) {
      this.logBuffer[tab] = [];
    }
    
    this.logBuffer[tab].push(entry);
    
    // Maintain buffer size
    if (this.logBuffer[tab].length > this.maxLogEntries) {
      this.logBuffer[tab] = this.logBuffer[tab].slice(-this.maxLogEntries);
    }
    
    // Add to UI
    this.addLogEntry(tab, entry);
  }
  
  /**
   * Add log entry to UI
   */
  addLogEntry(tab, entry) {
    const container = this.container?.querySelector(`#terminal-${tab} .terminal-log-container`);
    if (!container) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'terminal-log-entry';
    
    const timestamp = document.createElement('span');
    timestamp.className = 'terminal-log-timestamp';
    timestamp.textContent = entry.timestamp;
    
    const levelSpan = document.createElement('span');
    levelSpan.className = `terminal-log-level ${entry.level}`;
    levelSpan.textContent = entry.level;
    
    const content = document.createElement('div');
    content.className = `terminal-log-content terminal-${entry.level}`;
    
    // Handle JSON objects
    if (typeof entry.message === 'object') {
      const pre = document.createElement('pre');
      pre.className = 'terminal-json';
      pre.textContent = JSON.stringify(entry.message, null, 2);
      content.appendChild(pre);
    } else {
      content.textContent = entry.message;
    }
    
    logEntry.appendChild(timestamp);
    logEntry.appendChild(levelSpan);
    logEntry.appendChild(content);
    
    container.appendChild(logEntry);
    
    // Auto-scroll to bottom
    const output = container.closest('.terminal-output');
    output.scrollTop = output.scrollHeight;
  }
  
  /**
   * Show terminal
   */
  show() {
    if (!this.container) return;
    
    this.container.classList.remove('hidden');
    this.isOpen = true;
    
    // Focus input
    const input = this.container.querySelector('.terminal-input');
    input?.focus();
    
    eventBus.emit('terminal:shown');
  }
  
  /**
   * Hide terminal
   */
  hide() {
    if (!this.container) return;
    
    this.container.classList.add('hidden');
    this.isOpen = false;
    
    eventBus.emit('terminal:hidden');
  }
  
  /**
   * Toggle terminal visibility
   */
  toggle() {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * Toggle minimize state
   */
  toggleMinimize() {
    if (!this.container) return;
    
    this.container.classList.toggle('minimized');
    
    const button = document.getElementById('terminal-minimize');
    if (button) {
      button.textContent = this.container.classList.contains('minimized') ? '□' : '−';
    }
  }
  
  /**
   * Get terminal state
   */
  getState() {
    return {
      isOpen: this.isOpen,
      activeTab: this.activeTab,
      history: [...this.history],
      logBuffer: { ...this.logBuffer }
    };
  }
  
  /**
   * Restore terminal state
   */
  setState(state) {
    if (state.history) {
      this.history = [...state.history];
    }
    
    if (state.logBuffer) {
      this.logBuffer = { ...state.logBuffer };
      
      // Rebuild UI
      Object.entries(this.logBuffer).forEach(([tab, entries]) => {
        const container = this.container?.querySelector(`#terminal-${tab} .terminal-log-container`);
        if (container) {
          container.innerHTML = '';
          entries.forEach(entry => this.addLogEntry(tab, entry));
        }
      });
    }
    
    if (state.activeTab) {
      this.switchTab(state.activeTab);
    }
    
    if (state.isOpen) {
      this.show();
    }
  }
}

// Create singleton instance
export const terminal = new Terminal();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    terminal.initialize();
  });
} else {
  terminal.initialize();
}

export default terminal;
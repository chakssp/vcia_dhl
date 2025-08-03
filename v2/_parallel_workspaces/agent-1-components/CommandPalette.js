/**
 * Command Palette Component for KC V2
 * Provides quick command access and fuzzy search functionality
 */

import { EventBus } from '../../core/EventBus.js';
import { AppState } from '../../core/AppState.js';

export class CommandPalette {
  constructor() {
    this.container = document.getElementById('command-palette');
    this.input = document.getElementById('command-input');
    this.results = document.getElementById('command-results');
    this.isOpen = false;
    this.commands = [];
    this.recentCommands = [];
    this.selectedIndex = 0;
  }

  initialize() {
    this.registerDefaultCommands();
    this.setupEventListeners();
    this.loadRecentCommands();
  }

  registerDefaultCommands() {
    this.commands = [
      // Navigation commands
      { id: 'nav-discovery', label: 'Go to Discovery', icon: '🔍', action: () => this.navigate('discovery'), category: 'navigation' },
      { id: 'nav-analysis', label: 'Go to Analysis', icon: '🧠', action: () => this.navigate('analysis'), category: 'navigation' },
      { id: 'nav-organization', label: 'Go to Organization', icon: '📂', action: () => this.navigate('organization'), category: 'navigation' },
      { id: 'nav-export', label: 'Go to Export', icon: '📤', action: () => this.navigate('export'), category: 'navigation' },
      { id: 'nav-settings', label: 'Open Settings', icon: '⚙️', action: () => this.navigate('settings'), category: 'navigation' },
      { id: 'nav-logs', label: 'View Logs', icon: '📋', action: () => this.navigate('logs'), category: 'navigation' },
      { id: 'nav-stats', label: 'View Statistics', icon: '📊', action: () => this.navigate('stats'), category: 'navigation' },
      
      // File operations
      { id: 'file-discover', label: 'Discover Files', icon: '🔍', action: () => this.discoverFiles(), category: 'files' },
      { id: 'file-analyze', label: 'Analyze Selected Files', icon: '🧪', action: () => this.analyzeFiles(), category: 'files' },
      { id: 'file-categorize', label: 'Categorize Files', icon: '🏷️', action: () => this.categorizeFiles(), category: 'files' },
      { id: 'file-export', label: 'Export Results', icon: '💾', action: () => this.exportResults(), category: 'files' },
      
      // System commands
      { id: 'sys-reload', label: 'Reload Application', icon: '🔄', action: () => location.reload(), category: 'system' },
      { id: 'sys-clear-cache', label: 'Clear Cache', icon: '🗑️', action: () => this.clearCache(), category: 'system' },
      { id: 'sys-toggle-theme', label: 'Toggle Theme', icon: '🎨', action: () => this.toggleTheme(), category: 'system' },
      { id: 'sys-show-shortcuts', label: 'Show Keyboard Shortcuts', icon: '⌨️', action: () => this.showShortcuts(), category: 'system' },
      
      // API commands
      { id: 'api-test', label: 'Test API Connection', icon: '🔌', action: () => this.testAPI(), category: 'api' },
      { id: 'api-sync', label: 'Sync with Qdrant', icon: '🔄', action: () => this.syncQdrant(), category: 'api' },
      { id: 'api-status', label: 'API Status', icon: '📡', action: () => this.checkAPIStatus(), category: 'api' },
      
      // Help commands
      { id: 'help-docs', label: 'Open Documentation', icon: '📚', action: () => this.openDocs(), category: 'help' },
      { id: 'help-tutorial', label: 'Start Tutorial', icon: '🎓', action: () => this.startTutorial(), category: 'help' },
      { id: 'help-about', label: 'About KC V2', icon: 'ℹ️', action: () => this.showAbout(), category: 'help' }
    ];
  }

  setupEventListeners() {
    // Input events
    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.container.contains(e.target)) {
        this.close();
      }
    });
    
    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  handleInput() {
    const query = this.input.value.toLowerCase().trim();
    
    if (!query) {
      this.showRecentCommands();
      return;
    }
    
    // Fuzzy search commands
    const filtered = this.commands.filter(cmd => {
      const searchText = `${cmd.label} ${cmd.category}`.toLowerCase();
      return this.fuzzyMatch(query, searchText);
    });
    
    this.displayResults(filtered);
  }

  fuzzyMatch(query, text) {
    let queryIndex = 0;
    
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        queryIndex++;
      }
    }
    
    return queryIndex === query.length;
  }

  handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectPrevious();
        break;
      case 'Enter':
        e.preventDefault();
        this.executeSelected();
        break;
      case 'Tab':
        e.preventDefault();
        this.selectNext();
        break;
    }
  }

  selectNext() {
    const items = this.results.querySelectorAll('.command-item');
    if (items.length === 0) return;
    
    this.selectedIndex = (this.selectedIndex + 1) % items.length;
    this.updateSelection(items);
  }

  selectPrevious() {
    const items = this.results.querySelectorAll('.command-item');
    if (items.length === 0) return;
    
    this.selectedIndex = (this.selectedIndex - 1 + items.length) % items.length;
    this.updateSelection(items);
  }

  updateSelection(items) {
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  executeSelected() {
    const items = this.results.querySelectorAll('.command-item');
    if (items[this.selectedIndex]) {
      items[this.selectedIndex].click();
    }
  }

  displayResults(commands) {
    this.results.innerHTML = '';
    this.selectedIndex = 0;
    
    if (commands.length === 0) {
      this.results.innerHTML = '<div class="no-results">No commands found</div>';
      return;
    }
    
    // Group by category
    const grouped = commands.reduce((acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    }, {});
    
    // Display grouped results
    Object.entries(grouped).forEach(([category, cmds]) => {
      const group = document.createElement('div');
      group.className = 'command-group';
      
      const header = document.createElement('div');
      header.className = 'command-group-header';
      header.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      group.appendChild(header);
      
      cmds.forEach((cmd, index) => {
        const item = this.createCommandItem(cmd);
        if (index === 0 && category === Object.keys(grouped)[0]) {
          item.classList.add('selected');
        }
        group.appendChild(item);
      });
      
      this.results.appendChild(group);
    });
  }

  createCommandItem(command) {
    const item = document.createElement('div');
    item.className = 'command-item';
    item.dataset.commandId = command.id;
    
    item.innerHTML = `
      <span class="command-icon">${command.icon}</span>
      <span class="command-label">${command.label}</span>
      <span class="command-category">${command.category}</span>
    `;
    
    item.addEventListener('click', () => {
      this.executeCommand(command);
    });
    
    return item;
  }

  executeCommand(command) {
    // Add to recent commands
    this.addToRecent(command);
    
    // Close palette
    this.close();
    
    // Execute action
    if (command.action) {
      command.action();
    }
    
    // Emit event
    EventBus.emit('command:executed', { command });
  }

  addToRecent(command) {
    // Remove if already exists
    this.recentCommands = this.recentCommands.filter(cmd => cmd.id !== command.id);
    
    // Add to beginning
    this.recentCommands.unshift(command);
    
    // Keep only last 5
    this.recentCommands = this.recentCommands.slice(0, 5);
    
    // Save to storage
    this.saveRecentCommands();
  }

  showRecentCommands() {
    if (this.recentCommands.length === 0) {
      this.displayResults(this.commands.slice(0, 10)); // Show first 10 commands
    } else {
      this.displayResults(this.recentCommands);
    }
  }

  loadRecentCommands() {
    const saved = localStorage.getItem('kc-recent-commands');
    if (saved) {
      const ids = JSON.parse(saved);
      this.recentCommands = ids
        .map(id => this.commands.find(cmd => cmd.id === id))
        .filter(Boolean);
    }
  }

  saveRecentCommands() {
    const ids = this.recentCommands.map(cmd => cmd.id);
    localStorage.setItem('kc-recent-commands', JSON.stringify(ids));
  }

  // Public methods
  open() {
    this.isOpen = true;
    this.container.classList.remove('hidden');
    this.input.value = '';
    this.input.focus();
    this.showRecentCommands();
  }

  close() {
    this.isOpen = false;
    this.container.classList.add('hidden');
    this.input.value = '';
    this.results.innerHTML = '';
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  registerCommand(command) {
    this.commands.push(command);
  }

  // Command actions
  navigate(view) {
    EventBus.emit('navigation:change', { view });
  }

  discoverFiles() {
    EventBus.emit('action:discover-files');
  }

  analyzeFiles() {
    EventBus.emit('action:analyze-files');
  }

  categorizeFiles() {
    EventBus.emit('action:categorize-files');
  }

  exportResults() {
    EventBus.emit('action:export-results');
  }

  clearCache() {
    if (confirm('Clear all cached data?')) {
      localStorage.clear();
      sessionStorage.clear();
      EventBus.emit('cache:cleared');
      location.reload();
    }
  }

  toggleTheme() {
    document.body.classList.toggle('theme-dark');
    document.body.classList.toggle('theme-light');
    const isDark = document.body.classList.contains('theme-dark');
    localStorage.setItem('kc-theme', isDark ? 'dark' : 'light');
    EventBus.emit('theme:changed', { theme: isDark ? 'dark' : 'light' });
  }

  showShortcuts() {
    EventBus.emit('modal:show', { 
      type: 'shortcuts',
      title: 'Keyboard Shortcuts',
      content: this.getShortcutsContent()
    });
  }

  getShortcutsContent() {
    return `
      <div class="shortcuts-list">
        <div class="shortcut-group">
          <h3>General</h3>
          <div class="shortcut-item">
            <span class="shortcut-keys">Ctrl+K</span>
            <span class="shortcut-desc">Open Command Palette</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys">Ctrl+\`</span>
            <span class="shortcut-desc">Toggle Terminal</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys">Ctrl+Shift+\`</span>
            <span class="shortcut-desc">Focus Terminal</span>
          </div>
        </div>
        
        <div class="shortcut-group">
          <h3>Navigation</h3>
          <div class="shortcut-item">
            <span class="shortcut-keys">Ctrl+1</span>
            <span class="shortcut-desc">Go to Discovery</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys">Ctrl+2</span>
            <span class="shortcut-desc">Go to Analysis</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys">Ctrl+3</span>
            <span class="shortcut-desc">Go to Organization</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys">Ctrl+4</span>
            <span class="shortcut-desc">Go to Export</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys">Ctrl+,</span>
            <span class="shortcut-desc">Open Settings</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys">Ctrl+L</span>
            <span class="shortcut-desc">View Logs</span>
          </div>
          <div class="shortcut-item">
            <span class="shortcut-keys">Ctrl+S</span>
            <span class="shortcut-desc">View Statistics</span>
          </div>
        </div>
      </div>
    `;
  }

  async testAPI() {
    EventBus.emit('api:test');
  }

  async syncQdrant() {
    EventBus.emit('api:sync-qdrant');
  }

  async checkAPIStatus() {
    EventBus.emit('api:check-status');
  }

  openDocs() {
    window.open('/docs/user-guide.html', '_blank');
  }

  startTutorial() {
    EventBus.emit('tutorial:start');
  }

  showAbout() {
    EventBus.emit('modal:show', {
      type: 'about',
      title: 'About Knowledge Consolidator V2',
      content: `
        <div class="about-content">
          <h3>Knowledge Consolidator V2</h3>
          <p>Power User Interface for Advanced Knowledge Management</p>
          <br>
          <p><strong>Version:</strong> 2.0.0</p>
          <p><strong>Build:</strong> ${new Date().toISOString().split('T')[0]}</p>
          <br>
          <p>Designed for power users who demand efficiency and control.</p>
        </div>
      `
    });
  }
}
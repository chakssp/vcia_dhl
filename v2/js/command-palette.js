/**
 * Command Palette Module
 * Terminal-inspired command interface with fuzzy search and keyboard navigation
 */

class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.commands = [];
    this.filteredCommands = [];
    this.searchQuery = '';
    
    // DOM references
    this.overlay = null;
    this.input = null;
    this.results = null;
    
    // Bind methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    
    this.init();
  }

  init() {
    this.setupDOM();
    this.setupCommands();
    this.bindEvents();
  }

  setupDOM() {
    this.overlay = document.getElementById('command-palette');
    this.input = document.getElementById('command-input');
    this.results = document.getElementById('command-results');
    
    if (!this.overlay || !this.input || !this.results) {
      console.error('Command palette DOM elements not found');
      return;
    }
  }

  setupCommands() {
    this.commands = [
      // File operations
      {
        id: 'discover',
        title: 'Discover Files',
        description: 'Start automated file discovery process',
        icon: '🔍',
        keywords: ['discover', 'find', 'search', 'scan', 'files'],
        shortcut: ['Ctrl', 'D'],
        category: 'files',
        action: () => this.executeCommand('discover')
      },
      {
        id: 'analyze',
        title: 'Analyze Files',
        description: 'Run AI analysis on selected files',
        icon: '🧠',
        keywords: ['analyze', 'ai', 'process', 'intelligence'],
        shortcut: ['Ctrl', 'A'],
        category: 'analysis',
        action: () => this.executeCommand('analyze')
      },
      {
        id: 'export',
        title: 'Export Data',
        description: 'Export processed data to various formats',
        icon: '📤',
        keywords: ['export', 'save', 'download', 'output'],
        shortcut: ['Ctrl', 'E'],
        category: 'data',
        action: () => this.executeCommand('export')
      },
      
      // Navigation
      {
        id: 'goto-files',
        title: 'Go to Files',
        description: 'Navigate to file list view',
        icon: '📁',
        keywords: ['goto', 'navigate', 'files', 'list'],
        shortcut: ['1'],
        category: 'navigation',
        action: () => this.executeCommand('goto-files')
      },
      {
        id: 'goto-analysis',
        title: 'Go to Analysis',
        description: 'Navigate to analysis dashboard',
        icon: '📊',
        keywords: ['goto', 'navigate', 'analysis', 'dashboard'],
        shortcut: ['2'],
        category: 'navigation',
        action: () => this.executeCommand('goto-analysis')
      },
      {
        id: 'goto-export',
        title: 'Go to Export',
        description: 'Navigate to export interface',
        icon: '📋',
        keywords: ['goto', 'navigate', 'export', 'output'],
        shortcut: ['3'],
        category: 'navigation',
        action: () => this.executeCommand('goto-export')
      },
      
      // Views
      {
        id: 'view-list',
        title: 'List View',
        description: 'Switch to list view mode',
        icon: '☰',
        keywords: ['view', 'list', 'table', 'rows'],
        shortcut: ['1'],
        category: 'view',
        action: () => this.executeCommand('view-list')
      },
      {
        id: 'view-grid',
        title: 'Grid View',
        description: 'Switch to grid view mode',
        icon: '⊞',
        keywords: ['view', 'grid', 'cards', 'tiles'],
        shortcut: ['2'],
        category: 'view',
        action: () => this.executeCommand('view-grid')
      },
      {
        id: 'view-graph',
        title: 'Graph View',
        description: 'Switch to knowledge graph view',
        icon: '⊚',
        keywords: ['view', 'graph', 'network', 'visualization'],
        shortcut: ['3'],
        category: 'view',
        action: () => this.executeCommand('view-graph')
      },
      
      // Filters
      {
        id: 'filter-all',
        title: 'Show All Files',
        description: 'Remove all filters and show everything',
        icon: '🔄',
        keywords: ['filter', 'all', 'reset', 'clear'],
        shortcut: ['Ctrl', 'R'],
        category: 'filter',
        action: () => this.executeCommand('filter-all')
      },
      {
        id: 'filter-pending',
        title: 'Show Pending Files',
        description: 'Filter to show only pending analysis files',
        icon: '⏳',
        keywords: ['filter', 'pending', 'waiting', 'unprocessed'],
        shortcut: [],
        category: 'filter',
        action: () => this.executeCommand('filter-pending')
      },
      {
        id: 'filter-analyzed',
        title: 'Show Analyzed Files',
        description: 'Filter to show only analyzed files',
        icon: '✅',
        keywords: ['filter', 'analyzed', 'processed', 'done'],
        shortcut: [],
        category: 'filter',
        action: () => this.executeCommand('filter-analyzed')
      },
      
      // Selection
      {
        id: 'select-all',
        title: 'Select All Files',
        description: 'Select all visible files',
        icon: '☑️',
        keywords: ['select', 'all', 'everything'],
        shortcut: ['Ctrl', 'A'],
        category: 'selection',
        action: () => this.executeCommand('select-all')
      },
      {
        id: 'select-none',
        title: 'Clear Selection',
        description: 'Deselect all files',
        icon: '☐',
        keywords: ['select', 'none', 'clear', 'deselect'],
        shortcut: ['Escape'],
        category: 'selection',
        action: () => this.executeCommand('select-none')
      },
      
      // Settings and help
      {
        id: 'settings',
        title: 'Settings',
        description: 'Open application settings',
        icon: '⚙️',
        keywords: ['settings', 'config', 'preferences', 'options'],
        shortcut: ['Ctrl', ','],
        category: 'system',
        action: () => this.executeCommand('settings')
      },
      {
        id: 'shortcuts',
        title: 'Keyboard Shortcuts',
        description: 'Show keyboard shortcuts help',
        icon: '⌨️',
        keywords: ['shortcuts', 'keyboard', 'help', 'hotkeys'],
        shortcut: ['?'],
        category: 'help',
        action: () => this.executeCommand('shortcuts')
      },
      {
        id: 'about',
        title: 'About',
        description: 'About Knowledge Consolidator',
        icon: 'ℹ️',
        keywords: ['about', 'info', 'version'],
        shortcut: [],
        category: 'help',
        action: () => this.executeCommand('about')
      },
      
      // Quick actions
      {
        id: 'toggle-sidebar',
        title: 'Toggle Sidebar',
        description: 'Show or hide the navigation sidebar',
        icon: '◧',
        keywords: ['toggle', 'sidebar', 'nav', 'navigation'],
        shortcut: ['Ctrl', 'B'],
        category: 'interface',
        action: () => this.executeCommand('toggle-sidebar')
      },
      {
        id: 'toggle-details',
        title: 'Toggle Details Panel',
        description: 'Show or hide the details panel',
        icon: '◨',
        keywords: ['toggle', 'details', 'panel', 'info'],
        shortcut: ['Ctrl', 'I'],
        category: 'interface',
        action: () => this.executeCommand('toggle-details')
      },
      {
        id: 'focus-search',
        title: 'Focus Search',
        description: 'Focus the search input field',
        icon: '🔍',
        keywords: ['focus', 'search', 'find'],
        shortcut: ['Ctrl', 'F'],
        category: 'interface',
        action: () => this.executeCommand('focus-search')
      }
    ];

    this.filteredCommands = [...this.commands];
  }

  bindEvents() {
    // Global keyboard events are handled by KeyboardManager
    // Local events for the command palette
    if (this.input) {
      this.input.addEventListener('input', this.handleInput);
    }
    
    if (this.overlay) {
      this.overlay.addEventListener('click', this.handleBackdropClick);
    }
  }

  open() {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.searchQuery = '';
    this.selectedIndex = 0;
    
    if (this.overlay) {
      this.overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    
    if (this.input) {
      this.input.value = '';
      // Focus after a brief delay to ensure proper rendering
      setTimeout(() => {
        this.input.focus();
      }, 100);
    }
    
    this.updateResults();
    this.updateSelection();
    
    // Add keyboard event listener
    document.addEventListener('keydown', this.handleKeyDown, true);
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('command-palette:opened'));
  }

  close() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    
    if (this.overlay) {
      this.overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyDown, true);
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('command-palette:closed'));
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  handleKeyDown(event) {
    if (!this.isOpen) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        this.selectNext();
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.selectPrevious();
        break;
        
      case 'Enter':
        event.preventDefault();
        this.executeSelected();
        break;
        
      case 'Tab':
        event.preventDefault();
        this.autocomplete();
        break;
    }
  }

  handleInput(event) {
    this.searchQuery = event.target.value.toLowerCase().trim();
    this.selectedIndex = 0;
    this.updateResults();
    this.updateSelection();
  }

  handleBackdropClick(event) {
    if (event.target === this.overlay) {
      this.close();
    }
  }

  selectNext() {
    if (this.filteredCommands.length === 0) return;
    
    this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
    this.updateSelection();
    this.scrollToSelected();
  }

  selectPrevious() {
    if (this.filteredCommands.length === 0) return;
    
    this.selectedIndex = this.selectedIndex === 0 
      ? this.filteredCommands.length - 1 
      : this.selectedIndex - 1;
    this.updateSelection();
    this.scrollToSelected();
  }

  executeSelected() {
    if (this.filteredCommands.length === 0) return;
    
    const command = this.filteredCommands[this.selectedIndex];
    if (command) {
      this.executeCommand(command.id);
      this.close();
    }
  }

  autocomplete() {
    if (this.filteredCommands.length === 0) return;
    
    const command = this.filteredCommands[this.selectedIndex];
    if (command && this.input) {
      this.input.value = command.title;
      this.searchQuery = command.title.toLowerCase();
      this.updateResults();
    }
  }

  updateResults() {
    this.filteredCommands = this.filterCommands(this.searchQuery);
    this.renderResults();
  }

  filterCommands(query) {
    if (!query) {
      return [...this.commands];
    }

    const words = query.split(/\s+/).filter(word => word.length > 0);
    
    return this.commands.filter(command => {
      // Check title, description, and keywords
      const searchText = [
        command.title,
        command.description,
        ...command.keywords,
        command.category
      ].join(' ').toLowerCase();
      
      // All words must match somewhere in the search text
      return words.every(word => searchText.includes(word));
    }).sort((a, b) => {
      // Sort by relevance score
      const scoreA = this.calculateRelevanceScore(a, query);
      const scoreB = this.calculateRelevanceScore(b, query);
      return scoreB - scoreA;
    });
  }

  calculateRelevanceScore(command, query) {
    let score = 0;
    const queryLower = query.toLowerCase();
    
    // Exact title match
    if (command.title.toLowerCase() === queryLower) {
      score += 100;
    }
    
    // Title starts with query
    if (command.title.toLowerCase().startsWith(queryLower)) {
      score += 50;
    }
    
    // Title contains query
    if (command.title.toLowerCase().includes(queryLower)) {
      score += 25;
    }
    
    // Keywords match
    command.keywords.forEach(keyword => {
      if (keyword.toLowerCase().includes(queryLower)) {
        score += 10;
      }
    });
    
    // Description contains query
    if (command.description.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    return score;
  }

  renderResults() {
    if (!this.results) return;
    
    if (this.filteredCommands.length === 0) {
      this.results.innerHTML = `
        <div class="no-results">
          <div class="empty-icon">🔍</div>
          <p>No commands found</p>
        </div>
      `;
      return;
    }

    const html = this.filteredCommands.map((command, index) => `
      <div class="command-item" 
           data-index="${index}" 
           data-command-id="${command.id}"
           role="option"
           aria-selected="${index === this.selectedIndex}">
        <div class="command-icon">${command.icon}</div>
        <div class="command-text">
          <div class="command-title">${this.highlightMatches(command.title, this.searchQuery)}</div>
          <div class="command-description">${command.description}</div>
        </div>
        ${command.shortcut.length > 0 ? `
          <div class="command-shortcut">
            ${command.shortcut.map(key => `<kbd>${key}</kbd>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');

    this.results.innerHTML = html;
    
    // Add click handlers
    this.results.querySelectorAll('.command-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.selectedIndex = index;
        this.executeSelected();
      });
    });
  }

  highlightMatches(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  updateSelection() {
    if (!this.results) return;
    
    const items = this.results.querySelectorAll('.command-item');
    items.forEach((item, index) => {
      item.setAttribute('aria-selected', index === this.selectedIndex);
    });
  }

  scrollToSelected() {
    if (!this.results) return;
    
    const selectedItem = this.results.querySelector(`[data-index="${this.selectedIndex}"]`);
    if (selectedItem) {
      selectedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }

  executeCommand(commandId) {
    const command = this.commands.find(cmd => cmd.id === commandId);
    if (!command) {
      console.warn(`Command not found: ${commandId}`);
      return;
    }

    console.log(`Executing command: ${command.title}`);
    
    // Dispatch custom event with command details
    window.dispatchEvent(new CustomEvent('command-palette:execute', {
      detail: { commandId, command }
    }));
    
    // Execute the command action
    if (typeof command.action === 'function') {
      try {
        command.action();
      } catch (error) {
        console.error(`Error executing command ${commandId}:`, error);
      }
    }
  }

  // Public API methods
  addCommand(command) {
    this.commands.push(command);
    if (!this.searchQuery) {
      this.filteredCommands = [...this.commands];
    }
  }

  removeCommand(commandId) {
    this.commands = this.commands.filter(cmd => cmd.id !== commandId);
    this.filteredCommands = this.filteredCommands.filter(cmd => cmd.id !== commandId);
  }

  getCommands() {
    return [...this.commands];
  }

  // Utility method to check if palette is open
  isOpened() {
    return this.isOpen;
  }
}

// CSS for highlighting matches
const style = document.createElement('style');
style.textContent = `
  .command-item mark {
    background-color: var(--color-terminal-yellow);
    color: var(--color-text-inverse);
    border-radius: 2px;
    padding: 1px 2px;
  }
  
  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-8);
    color: var(--color-text-tertiary);
  }
  
  .no-results .empty-icon {
    font-size: 2rem;
    margin-bottom: var(--space-3);
    opacity: 0.5;
  }
`;
document.head.appendChild(style);

// Export for module usage
export default CommandPalette;
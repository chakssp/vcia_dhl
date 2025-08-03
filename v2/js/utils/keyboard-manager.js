/**
 * Keyboard Manager Module
 * Comprehensive keyboard shortcut system for power user interface
 */

class KeyboardManager {
  constructor() {
    this.shortcuts = new Map();
    this.sequences = new Map();
    this.currentSequence = [];
    this.sequenceTimeout = null;
    this.sequenceTimeoutMs = 1000;
    this.isEnabled = true;
    this.modifierKeys = new Set();
    
    // Bind methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    
    this.init();
  }

  init() {
    this.setupDefaultShortcuts();
    this.bindEvents();
  }

  bindEvents() {
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('keyup', this.handleKeyUp, true);
    window.addEventListener('blur', this.handleBlur);
    
    // Handle focus loss
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clearModifiers();
        this.clearSequence();
      }
    });
  }

  setupDefaultShortcuts() {
    // Command Palette
    this.register('cmd+k', () => this.executeAction('toggle-command-palette'));
    this.register('ctrl+k', () => this.executeAction('toggle-command-palette'));
    
    // Navigation
    this.register('ctrl+b', () => this.executeAction('toggle-sidebar'));
    this.register('ctrl+i', () => this.executeAction('toggle-details'));
    this.register('ctrl+f', () => this.executeAction('focus-search'));
    
    // File operations
    this.register('ctrl+d', () => this.executeAction('discover-files'));
    this.register('ctrl+a', () => this.executeAction('analyze-files'));
    this.register('ctrl+e', () => this.executeAction('export-data'));
    
    // View switching
    this.register('1', () => this.executeAction('switch-view-list'));
    this.register('2', () => this.executeAction('switch-view-grid'));
    this.register('3', () => this.executeAction('switch-view-graph'));
    
    // Selection
    this.register('ctrl+a', () => this.executeAction('select-all'), { context: 'file-list' });
    this.register('escape', () => this.executeAction('clear-selection'));
    
    // Bulk actions
    this.register('shift+a', () => this.executeAction('bulk-analyze'));
    this.register('shift+c', () => this.executeAction('bulk-categorize'));
    this.register('shift+x', () => this.executeAction('bulk-archive'));
    
    // Settings and help
    this.register('ctrl+comma', () => this.executeAction('open-settings'));
    this.register('shift+slash', () => this.executeAction('show-shortcuts'));
    this.register('?', () => this.executeAction('show-shortcuts'));
    
    // Quick filters
    this.register('ctrl+r', () => this.executeAction('reset-filters'));
    this.register('ctrl+1', () => this.executeAction('filter-pending'));
    this.register('ctrl+2', () => this.executeAction('filter-analyzed'));
    this.register('ctrl+3', () => this.executeAction('filter-categorized'));
    
    // Graph view controls
    this.register('r', () => this.executeAction('graph-reset-zoom'), { context: 'graph-view' });
    this.register('c', () => this.executeAction('graph-center'), { context: 'graph-view' });
    this.register('p', () => this.executeAction('graph-toggle-physics'), { context: 'graph-view' });
    
    // List navigation
    this.register('j', () => this.executeAction('navigate-down'), { context: 'file-list' });
    this.register('k', () => this.executeAction('navigate-up'), { context: 'file-list' });
    this.register('enter', () => this.executeAction('open-selected'), { context: 'file-list' });
    this.register('space', () => this.executeAction('toggle-selected'), { context: 'file-list' });
    
    // Sequences (vim-like)
    this.registerSequence(['g', 'g'], () => this.executeAction('go-to-top'));
    this.registerSequence(['shift+g'], () => this.executeAction('go-to-bottom'));
    this.registerSequence(['/', '/'], () => this.executeAction('focus-search'));
    
    // Dev tools
    this.register('f12', () => this.executeAction('toggle-dev-tools'));
    this.register('ctrl+shift+i', () => this.executeAction('toggle-dev-tools'));
  }

  handleKeyDown(event) {
    if (!this.isEnabled) return;
    
    // Skip if typing in input fields (unless it's a global shortcut)
    if (this.isTypingContext(event.target) && !this.isGlobalShortcut(event)) {
      return;
    }

    const key = this.normalizeKey(event);
    
    // Track modifier keys
    if (this.isModifierKey(event.key)) {
      this.modifierKeys.add(event.key.toLowerCase());
    }
    
    // Build shortcut string
    const shortcut = this.buildShortcutString(event);
    
    // Handle sequence shortcuts
    if (this.handleSequence(key)) {
      event.preventDefault();
      return;
    }
    
    // Handle direct shortcuts
    const handler = this.shortcuts.get(shortcut);
    if (handler) {
      // Check context if specified
      if (handler.context && !this.isInContext(handler.context)) {
        return;
      }
      
      event.preventDefault();
      event.stopPropagation();
      
      try {
        handler.action();
      } catch (error) {
        console.error(`Error executing shortcut ${shortcut}:`, error);
      }
      
      // Dispatch event
      this.dispatchShortcutEvent(shortcut, handler);
    }
  }

  handleKeyUp(event) {
    const key = event.key.toLowerCase();
    if (this.isModifierKey(event.key)) {
      this.modifierKeys.delete(key);
    }
  }

  handleBlur() {
    this.clearModifiers();
    this.clearSequence();
  }

  normalizeKey(event) {
    let key = event.key.toLowerCase();
    
    // Normalize special keys
    const keyMappings = {
      ' ': 'space',
      'arrowup': 'up',
      'arrowdown': 'down',
      'arrowleft': 'left',
      'arrowright': 'right',
      'delete': 'del',
      'escape': 'esc'
    };
    
    return keyMappings[key] || key;
  }

  buildShortcutString(event) {
    const parts = [];
    
    // Add modifiers in consistent order
    if (event.ctrlKey || event.metaKey) {
      parts.push(this.isMac() ? 'cmd' : 'ctrl');
    }
    if (event.altKey) {
      parts.push('alt');
    }
    if (event.shiftKey) {
      parts.push('shift');
    }
    
    // Add the main key
    const key = this.normalizeKey(event);
    if (!this.isModifierKey(event.key)) {
      parts.push(key);
    }
    
    return parts.join('+');
  }

  isModifierKey(key) {
    return ['Control', 'Alt', 'Shift', 'Meta', 'CapsLock'].includes(key);
  }

  isMac() {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }

  isTypingContext(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();
    const isContentEditable = element.isContentEditable;
    
    return (
      tagName === 'input' && 
      ['text', 'password', 'email', 'search', 'url', 'tel'].includes(type)
    ) || 
    tagName === 'textarea' || 
    isContentEditable;
  }

  isGlobalShortcut(event) {
    const shortcut = this.buildShortcutString(event);
    const globalShortcuts = [
      'ctrl+k', 'cmd+k',  // Command palette
      'f12', 'ctrl+shift+i',  // Dev tools
      'ctrl+r', 'cmd+r',  // Refresh (browser)
      'ctrl+w', 'cmd+w'   // Close tab (browser)
    ];
    
    return globalShortcuts.includes(shortcut);
  }

  handleSequence(key) {
    // Add to current sequence
    this.currentSequence.push(key);
    
    // Clear timeout
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }
    
    // Check for matching sequences
    const sequenceKey = this.currentSequence.join(' ');
    const handler = this.sequences.get(sequenceKey);
    
    if (handler) {
      // Found complete sequence
      this.clearSequence();
      try {
        handler.action();
      } catch (error) {
        console.error(`Error executing sequence ${sequenceKey}:`, error);
      }
      this.dispatchSequenceEvent(sequenceKey, handler);
      return true;
    }
    
    // Check if this could be the start of a sequence
    const hasPartialMatch = Array.from(this.sequences.keys()).some(seq => 
      seq.startsWith(sequenceKey)
    );
    
    if (hasPartialMatch) {
      // Wait for more keys
      this.sequenceTimeout = setTimeout(() => {
        this.clearSequence();
      }, this.sequenceTimeoutMs);
      return true;
    }
    
    // No match, clear sequence
    this.clearSequence();
    return false;
  }

  clearSequence() {
    this.currentSequence = [];
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }
  }

  clearModifiers() {
    this.modifierKeys.clear();
  }

  isInContext(context) {
    switch (context) {
      case 'file-list':
        return document.querySelector('.file-list:focus-within') || 
               document.activeElement?.closest('.file-list');
      
      case 'graph-view':
        return document.querySelector('#graph-view.active');
      
      case 'command-palette':
        return document.querySelector('#command-palette[aria-hidden="false"]');
      
      default:
        return true;
    }
  }

  register(shortcut, action, options = {}) {
    this.shortcuts.set(shortcut, {
      action,
      context: options.context,
      description: options.description,
      category: options.category
    });
  }

  registerSequence(sequence, action, options = {}) {
    const sequenceKey = sequence.join(' ');
    this.sequences.set(sequenceKey, {
      action,
      context: options.context,
      description: options.description,
      category: options.category
    });
  }

  unregister(shortcut) {
    return this.shortcuts.delete(shortcut);
  }

  unregisterSequence(sequence) {
    const sequenceKey = Array.isArray(sequence) ? sequence.join(' ') : sequence;
    return this.sequences.delete(sequenceKey);
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
    this.clearModifiers();
    this.clearSequence();
  }

  executeAction(actionId) {
    // Dispatch to the main app
    window.dispatchEvent(new CustomEvent('keyboard:action', {
      detail: { actionId }
    }));
  }

  dispatchShortcutEvent(shortcut, handler) {
    window.dispatchEvent(new CustomEvent('keyboard:shortcut', {
      detail: { shortcut, handler }
    }));
  }

  dispatchSequenceEvent(sequence, handler) {
    window.dispatchEvent(new CustomEvent('keyboard:sequence', {
      detail: { sequence, handler }
    }));
  }

  getShortcuts() {
    return new Map(this.shortcuts);
  }

  getSequences() {
    return new Map(this.sequences);
  }

  getAllShortcuts() {
    const all = [];
    
    // Regular shortcuts
    for (const [shortcut, handler] of this.shortcuts) {
      all.push({
        type: 'shortcut',
        keys: shortcut,
        description: handler.description,
        category: handler.category,
        context: handler.context
      });
    }
    
    // Sequences
    for (const [sequence, handler] of this.sequences) {
      all.push({
        type: 'sequence',
        keys: sequence,
        description: handler.description,
        category: handler.category,
        context: handler.context
      });
    }
    
    return all;
  }

  formatShortcut(shortcut) {
    return shortcut
      .split('+')
      .map(key => {
        // Capitalize and format keys for display
        const keyMappings = {
          'ctrl': this.isMac() ? '⌃' : 'Ctrl',
          'cmd': '⌘',
          'alt': this.isMac() ? '⌥' : 'Alt',
          'shift': this.isMac() ? '⇧' : 'Shift',
          'space': 'Space',
          'esc': 'Esc',
          'enter': 'Enter',
          'tab': 'Tab',
          'up': '↑',
          'down': '↓',
          'left': '←',
          'right': '→'
        };
        
        return keyMappings[key] || key.toUpperCase();
      })
      .join(this.isMac() ? '' : '+');
  }

  // Debug helpers
  getCurrentSequence() {
    return [...this.currentSequence];
  }

  getActiveModifiers() {
    return new Set(this.modifierKeys);
  }

  isEnabled() {
    return this.isEnabled;
  }
}

// Export for module usage
export default KeyboardManager;
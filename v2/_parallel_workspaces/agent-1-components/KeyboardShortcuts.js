/**
 * Keyboard Shortcuts Manager for KC V2
 * Handles global keyboard shortcuts and key combinations
 */

export class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map();
    this.activeShortcuts = new Set();
    this.enabled = true;
    this.debug = false;
    this.setupGlobalListener();
  }

  setupGlobalListener() {
    // Keydown listener
    document.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      
      const shortcut = this.getShortcutString(e);
      
      if (this.debug) {
        console.log('Shortcut pressed:', shortcut);
      }
      
      // Check if this shortcut is registered
      if (this.shortcuts.has(shortcut)) {
        const handler = this.shortcuts.get(shortcut);
        
        // Prevent default unless specified
        if (handler.preventDefault !== false) {
          e.preventDefault();
        }
        
        // Check if we should execute (not in input field unless allowed)
        if (this.shouldExecute(e, handler)) {
          this.activeShortcuts.add(shortcut);
          handler.callback(e);
        }
      }
    });
    
    // Keyup listener to track released keys
    document.addEventListener('keyup', (e) => {
      const shortcut = this.getShortcutString(e);
      this.activeShortcuts.delete(shortcut);
    });
    
    // Blur listener to reset active shortcuts
    window.addEventListener('blur', () => {
      this.activeShortcuts.clear();
    });
  }

  getShortcutString(event) {
    const parts = [];
    
    // Order matters: Ctrl, Alt, Shift, Meta, Key
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    // Get the key
    let key = event.key.toLowerCase();
    
    // Normalize special keys
    const keyMap = {
      ' ': 'space',
      'arrowup': 'up',
      'arrowdown': 'down',
      'arrowleft': 'left',
      'arrowright': 'right',
      'escape': 'esc',
      'delete': 'del',
      'insert': 'ins',
      'pageup': 'pgup',
      'pagedown': 'pgdown'
    };
    
    if (keyMap[key]) {
      key = keyMap[key];
    }
    
    // Don't add modifier keys as the main key
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key);
    }
    
    return parts.join('+');
  }

  shouldExecute(event, handler) {
    // Check if we're in an input field
    const target = event.target;
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    const isContentEditable = target.contentEditable === 'true';
    
    // If we're in an input and handler doesn't allow it, don't execute
    if ((isInput || isContentEditable) && !handler.allowInInput) {
      return false;
    }
    
    // Check custom condition if provided
    if (handler.condition && !handler.condition(event)) {
      return false;
    }
    
    return true;
  }

  /**
   * Register a keyboard shortcut
   * @param {string} shortcut - The shortcut string (e.g., 'ctrl+k', 'alt+shift+p')
   * @param {Function} callback - The function to call when shortcut is pressed
   * @param {Object} options - Additional options
   */
  register(shortcut, callback, options = {}) {
    const normalizedShortcut = this.normalizeShortcut(shortcut);
    
    this.shortcuts.set(normalizedShortcut, {
      callback,
      preventDefault: options.preventDefault !== false,
      allowInInput: options.allowInInput || false,
      condition: options.condition || null,
      description: options.description || '',
      category: options.category || 'general'
    });
    
    if (this.debug) {
      console.log(`Registered shortcut: ${normalizedShortcut}`);
    }
  }

  /**
   * Unregister a keyboard shortcut
   * @param {string} shortcut - The shortcut string to unregister
   */
  unregister(shortcut) {
    const normalizedShortcut = this.normalizeShortcut(shortcut);
    this.shortcuts.delete(normalizedShortcut);
  }

  /**
   * Normalize shortcut string for consistency
   * @param {string} shortcut - The shortcut string
   * @returns {string} Normalized shortcut string
   */
  normalizeShortcut(shortcut) {
    const parts = shortcut.toLowerCase().split('+').map(p => p.trim());
    const modifiers = [];
    let key = '';
    
    // Separate modifiers and key
    parts.forEach(part => {
      if (['ctrl', 'alt', 'shift', 'meta', 'cmd'].includes(part)) {
        // Normalize cmd to meta
        modifiers.push(part === 'cmd' ? 'meta' : part);
      } else {
        key = part;
      }
    });
    
    // Sort modifiers for consistency
    modifiers.sort((a, b) => {
      const order = ['ctrl', 'alt', 'shift', 'meta'];
      return order.indexOf(a) - order.indexOf(b);
    });
    
    // Combine modifiers and key
    if (key) {
      modifiers.push(key);
    }
    
    return modifiers.join('+');
  }

  /**
   * Enable/disable all shortcuts
   * @param {boolean} enabled - Whether shortcuts should be enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Check if a shortcut is currently active (being pressed)
   * @param {string} shortcut - The shortcut to check
   * @returns {boolean} Whether the shortcut is active
   */
  isActive(shortcut) {
    const normalizedShortcut = this.normalizeShortcut(shortcut);
    return this.activeShortcuts.has(normalizedShortcut);
  }

  /**
   * Get all registered shortcuts
   * @returns {Array} Array of shortcut objects
   */
  getAll() {
    const shortcuts = [];
    
    this.shortcuts.forEach((handler, shortcut) => {
      shortcuts.push({
        shortcut,
        description: handler.description,
        category: handler.category,
        allowInInput: handler.allowInInput
      });
    });
    
    return shortcuts;
  }

  /**
   * Get shortcuts by category
   * @param {string} category - The category to filter by
   * @returns {Array} Array of shortcuts in the category
   */
  getByCategory(category) {
    return this.getAll().filter(s => s.category === category);
  }

  /**
   * Create a chord (sequence of shortcuts)
   * @param {Array} shortcuts - Array of shortcut strings
   * @param {Function} callback - Function to call when chord is completed
   * @param {Object} options - Additional options
   */
  registerChord(shortcuts, callback, options = {}) {
    let currentIndex = 0;
    let chordTimeout = null;
    
    const resetChord = () => {
      currentIndex = 0;
      if (chordTimeout) {
        clearTimeout(chordTimeout);
        chordTimeout = null;
      }
    };
    
    shortcuts.forEach((shortcut, index) => {
      this.register(shortcut, (e) => {
        if (index === currentIndex) {
          currentIndex++;
          
          // Reset timeout
          if (chordTimeout) {
            clearTimeout(chordTimeout);
          }
          
          // Set new timeout
          chordTimeout = setTimeout(resetChord, options.timeout || 1000);
          
          // Check if chord is complete
          if (currentIndex === shortcuts.length) {
            resetChord();
            callback(e);
          }
        } else {
          resetChord();
        }
      }, {
        ...options,
        description: options.description || `Chord: ${shortcuts.join(' then ')}`
      });
    });
  }

  /**
   * Enable debug mode
   * @param {boolean} enabled - Whether debug mode should be enabled
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * Trigger a shortcut programmatically
   * @param {string} shortcut - The shortcut to trigger
   */
  trigger(shortcut) {
    const normalizedShortcut = this.normalizeShortcut(shortcut);
    
    if (this.shortcuts.has(normalizedShortcut)) {
      const handler = this.shortcuts.get(normalizedShortcut);
      handler.callback(new KeyboardEvent('keydown', {
        key: shortcut.split('+').pop(),
        ctrlKey: shortcut.includes('ctrl'),
        altKey: shortcut.includes('alt'),
        shiftKey: shortcut.includes('shift'),
        metaKey: shortcut.includes('meta')
      }));
    }
  }

  /**
   * Get a formatted string representation of a shortcut
   * @param {string} shortcut - The shortcut string
   * @returns {string} Formatted shortcut string
   */
  format(shortcut) {
    const parts = shortcut.split('+');
    const formatted = parts.map(part => {
      const formatMap = {
        'ctrl': 'Ctrl',
        'alt': 'Alt',
        'shift': 'Shift',
        'meta': '⌘',
        'cmd': '⌘',
        'space': 'Space',
        'esc': 'Esc',
        'enter': 'Enter',
        'tab': 'Tab',
        'up': '↑',
        'down': '↓',
        'left': '←',
        'right': '→'
      };
      
      return formatMap[part] || part.toUpperCase();
    });
    
    return formatted.join('+');
  }
}
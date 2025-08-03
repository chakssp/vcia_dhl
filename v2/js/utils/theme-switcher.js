/**
 * Theme Switcher for KC V2
 * Handles dark/light theme switching with smooth transitions
 */

export class ThemeSwitcher {
  constructor() {
    this.themes = {
      dark: {
        name: 'Dark',
        class: 'theme-dark',
        icon: '🌙',
        colors: {
          '--bg-primary': '#0d0d0d',
          '--bg-secondary': '#1a1a1a',
          '--bg-tertiary': '#262626',
          '--text-primary': '#e0e0e0',
          '--text-secondary': '#a0a0a0',
          '--text-tertiary': '#666666',
          '--border-color': '#333333',
          '--primary-color': '#50fa7b',
          '--primary-rgb': '80, 250, 123',
          '--secondary-color': '#8be9fd',
          '--accent-color': '#ff79c6',
          '--error-color': '#ff5555',
          '--warning-color': '#f1fa8c',
          '--success-color': '#50fa7b',
          '--info-color': '#6272a4'
        }
      },
      light: {
        name: 'Light',
        class: 'theme-light',
        icon: '☀️',
        colors: {
          '--bg-primary': '#ffffff',
          '--bg-secondary': '#f5f5f5',
          '--bg-tertiary': '#e0e0e0',
          '--text-primary': '#1a1a1a',
          '--text-secondary': '#666666',
          '--text-tertiary': '#999999',
          '--border-color': '#d0d0d0',
          '--primary-color': '#00a86b',
          '--primary-rgb': '0, 168, 107',
          '--secondary-color': '#0088cc',
          '--accent-color': '#ff1493',
          '--error-color': '#dc143c',
          '--warning-color': '#ffa500',
          '--success-color': '#00a86b',
          '--info-color': '#4169e1'
        }
      },
      midnight: {
        name: 'Midnight',
        class: 'theme-midnight',
        icon: '🌌',
        colors: {
          '--bg-primary': '#0a0e27',
          '--bg-secondary': '#151a3a',
          '--bg-tertiary': '#1f2550',
          '--text-primary': '#e4e7f4',
          '--text-secondary': '#9ca3d4',
          '--text-tertiary': '#6b72a7',
          '--border-color': '#2a3155',
          '--primary-color': '#60a5fa',
          '--primary-rgb': '96, 165, 250',
          '--secondary-color': '#a78bfa',
          '--accent-color': '#f472b6',
          '--error-color': '#f87171',
          '--warning-color': '#fbbf24',
          '--success-color': '#34d399',
          '--info-color': '#60a5fa'
        }
      },
      solarized: {
        name: 'Solarized',
        class: 'theme-solarized',
        icon: '🌅',
        colors: {
          '--bg-primary': '#002b36',
          '--bg-secondary': '#073642',
          '--bg-tertiary': '#004052',
          '--text-primary': '#839496',
          '--text-secondary': '#657b83',
          '--text-tertiary': '#586e75',
          '--border-color': '#073642',
          '--primary-color': '#268bd2',
          '--primary-rgb': '38, 139, 210',
          '--secondary-color': '#2aa198',
          '--accent-color': '#d33682',
          '--error-color': '#dc322f',
          '--warning-color': '#b58900',
          '--success-color': '#859900',
          '--info-color': '#268bd2'
        }
      }
    };
    
    this.currentTheme = this.loadTheme();
    this.transitioning = false;
    this.callbacks = new Set();
  }

  initialize() {
    // Apply saved theme
    this.applyTheme(this.currentTheme, false);
    
    // Listen for system theme changes
    this.setupSystemThemeListener();
    
    // Setup keyboard shortcut
    this.setupKeyboardShortcut();
    
    // Create theme toggle button
    this.createThemeToggle();
  }

  loadTheme() {
    const saved = localStorage.getItem('kc-theme');
    if (saved && this.themes[saved]) {
      return saved;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    
    return 'dark';
  }

  saveTheme(theme) {
    localStorage.setItem('kc-theme', theme);
  }

  applyTheme(themeName, animate = true) {
    if (!this.themes[themeName] || this.transitioning) return;
    
    const theme = this.themes[themeName];
    const oldTheme = this.currentTheme;
    
    if (animate) {
      this.transitioning = true;
      document.documentElement.classList.add('theme-transitioning');
    }
    
    // Remove all theme classes
    Object.values(this.themes).forEach(t => {
      document.body.classList.remove(t.class);
    });
    
    // Add new theme class
    document.body.classList.add(theme.class);
    
    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    
    // Update current theme
    this.currentTheme = themeName;
    this.saveTheme(themeName);
    
    // Update UI elements
    this.updateThemeUI(themeName);
    
    // Notify listeners
    this.notifyListeners(themeName, oldTheme);
    
    if (animate) {
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
        this.transitioning = false;
      }, 300);
    }
  }

  toggleTheme() {
    const themes = Object.keys(this.themes);
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.applyTheme(themes[nextIndex]);
  }

  cycleTheme() {
    this.toggleTheme();
  }

  setTheme(themeName) {
    if (this.themes[themeName]) {
      this.applyTheme(themeName);
    }
  }

  setupSystemThemeListener() {
    if (!window.matchMedia) return;
    
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    darkModeQuery.addEventListener('change', (e) => {
      if (this.followSystem) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + T for theme toggle
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.toggleTheme();
      }
    });
  }

  createThemeToggle() {
    // Create floating theme toggle button
    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle-btn';
    toggle.setAttribute('aria-label', 'Toggle theme');
    toggle.innerHTML = this.themes[this.currentTheme].icon;
    
    toggle.addEventListener('click', () => {
      this.toggleTheme();
    });
    
    document.body.appendChild(toggle);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .theme-toggle-btn {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--bg-secondary);
        border: 2px solid var(--border-color);
        font-size: 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        z-index: 100;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      
      .theme-toggle-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      }
      
      .theme-toggle-btn:active {
        transform: scale(0.95);
      }
      
      .theme-transitioning * {
        transition: color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease !important;
      }
      
      @media (max-width: 768px) {
        .theme-toggle-btn {
          bottom: 70px;
        }
      }
    `;
    document.head.appendChild(style);
    
    this.toggleButton = toggle;
  }

  updateThemeUI(themeName) {
    const theme = this.themes[themeName];
    
    // Update toggle button
    if (this.toggleButton) {
      this.toggleButton.innerHTML = theme.icon;
    }
    
    // Update meta theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = theme.colors['--bg-primary'];
    
    // Update status bar style for mobile
    let metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaStatusBar) {
      metaStatusBar = document.createElement('meta');
      metaStatusBar.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(metaStatusBar);
    }
    metaStatusBar.content = themeName === 'light' ? 'default' : 'black-translucent';
  }

  // Theme presets for specific use cases
  applyPreset(preset) {
    switch (preset) {
      case 'presentation':
        this.setTheme('light');
        document.documentElement.style.fontSize = '18px';
        break;
      case 'coding':
        this.setTheme('midnight');
        break;
      case 'reading':
        this.setTheme('solarized');
        break;
      case 'default':
        this.setTheme('dark');
        document.documentElement.style.fontSize = '16px';
        break;
    }
  }

  // Custom theme creation
  createCustomTheme(name, colors) {
    const customTheme = {
      name,
      class: `theme-${name.toLowerCase().replace(/\s+/g, '-')}`,
      icon: '🎨',
      colors
    };
    
    this.themes[name.toLowerCase()] = customTheme;
    return customTheme;
  }

  // Export theme configuration
  exportTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return null;
    
    return {
      name: theme.name,
      colors: theme.colors,
      exportDate: new Date().toISOString()
    };
  }

  // Import theme configuration
  importTheme(themeData) {
    if (!themeData.name || !themeData.colors) {
      throw new Error('Invalid theme data');
    }
    
    return this.createCustomTheme(themeData.name, themeData.colors);
  }

  // Subscribe to theme changes
  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  notifyListeners(newTheme, oldTheme) {
    this.callbacks.forEach(callback => {
      try {
        callback(newTheme, oldTheme);
      } catch (error) {
        console.error('Theme change listener error:', error);
      }
    });
  }

  // Get current theme info
  getCurrentTheme() {
    return {
      name: this.currentTheme,
      ...this.themes[this.currentTheme]
    };
  }

  // Get all available themes
  getAvailableThemes() {
    return Object.entries(this.themes).map(([key, theme]) => ({
      key,
      ...theme
    }));
  }

  // Check if system theme following is enabled
  setFollowSystem(follow) {
    this.followSystem = follow;
    if (follow) {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.applyTheme(isDark ? 'dark' : 'light');
    }
  }

  // Generate theme preview
  generatePreview(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return null;
    
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    preview.style.cssText = `
      width: 200px;
      height: 150px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    `;
    
    // Apply theme colors to preview
    Object.entries(theme.colors).forEach(([key, value]) => {
      preview.style.setProperty(key, value);
    });
    
    preview.innerHTML = `
      <div style="background: var(--bg-primary); height: 30px; display: flex; align-items: center; padding: 0 10px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--error-color); margin-right: 4px;"></div>
        <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--warning-color); margin-right: 4px;"></div>
        <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--success-color);"></div>
      </div>
      <div style="background: var(--bg-secondary); padding: 10px; height: calc(100% - 30px);">
        <div style="background: var(--bg-tertiary); height: 20px; margin-bottom: 8px; border-radius: 4px;"></div>
        <div style="background: var(--primary-color); height: 4px; width: 60%; margin-bottom: 8px; border-radius: 2px;"></div>
        <div style="background: var(--text-primary); height: 2px; width: 80%; margin-bottom: 4px; opacity: 0.5;"></div>
        <div style="background: var(--text-primary); height: 2px; width: 70%; margin-bottom: 4px; opacity: 0.5;"></div>
        <div style="background: var(--text-primary); height: 2px; width: 75%; opacity: 0.5;"></div>
      </div>
    `;
    
    return preview;
  }
}
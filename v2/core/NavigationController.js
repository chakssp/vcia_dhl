/**
 * NavigationController - Manages view navigation and routing
 * #FE-001 - Frontend Engineers Team
 */

import eventBus, { Events } from './EventBus.js';
import appState from './AppState.js';

export class NavigationController {
  constructor(views = {}) {
    this.views = views;
    this.currentView = null;
    this.history = [];
    this.maxHistorySize = 50;
    this.viewContainer = null;
    this.navItems = null;
  }

  /**
   * Initialize navigation controller
   */
  initialize() {
    // Get DOM elements
    this.viewContainer = document.getElementById('view-container');
    this.navItems = document.querySelectorAll('.nav-item[data-view]');
    
    if (!this.viewContainer) {
      console.error('[NavigationController] View container not found');
      return;
    }
    
    // Setup navigation click handlers
    this.setupNavigation();
    
    // Listen for navigation events
    eventBus.on(Events.VIEW_CHANGE, ({ view }) => {
      this.navigateTo(view);
    });
    
    // Restore last view from state
    const lastView = appState.get('lastView', 'discovery');
    this.navigateTo(lastView);
    
    console.log('[NavigationController] Initialized with views:', Object.keys(this.views));
  }

  /**
   * Setup navigation click handlers
   */
  setupNavigation() {
    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.dataset.view;
        this.navigateTo(view);
      });
    });
    
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.view) {
        this.navigateTo(e.state.view, { skipHistory: true });
      }
    });
  }

  /**
   * Navigate to a view
   * @param {string} viewName - Name of the view to navigate to
   * @param {Object} options - Navigation options
   */
  navigateTo(viewName, options = {}) {
    // Check if view exists
    if (!this.views[viewName]) {
      console.error(`[NavigationController] View '${viewName}' not found`);
      return false;
    }
    
    // Don't navigate if already on this view
    if (this.currentView === viewName && !options.force) {
      return false;
    }
    
    // Deactivate current view
    if (this.currentView && this.views[this.currentView]) {
      this.deactivateView(this.currentView);
    }
    
    // Update navigation state
    const previousView = this.currentView;
    this.currentView = viewName;
    
    // Add to history
    if (!options.skipHistory) {
      this.addToHistory(viewName);
      
      // Update browser history
      window.history.pushState(
        { view: viewName },
        '',
        `#${viewName}`
      );
    }
    
    // Activate new view
    this.activateView(viewName);
    
    // Update UI
    this.updateNavigationUI(viewName);
    
    // Save to state
    appState.set('lastView', viewName);
    appState.set('currentView', viewName);
    
    // Emit navigation event
    eventBus.emit(Events.VIEW_CHANGE, {
      view: viewName,
      previousView,
      timestamp: Date.now()
    });
    
    // Update status bar
    this.updateStatusBar(viewName);
    
    console.log(`[NavigationController] Navigated to '${viewName}'`);
    return true;
  }

  /**
   * Activate a view
   */
  activateView(viewName) {
    const view = this.views[viewName];
    
    // Call view's activate method if exists
    if (view && typeof view.activate === 'function') {
      view.activate();
    }
    
    // Show view in DOM
    const viewElement = document.getElementById(`${viewName}-view`);
    if (viewElement) {
      // Hide all views first
      this.viewContainer.querySelectorAll('.view').forEach(el => {
        el.classList.remove('active');
      });
      
      // Show target view
      viewElement.classList.add('active');
      
      // Focus first focusable element
      setTimeout(() => {
        const focusable = viewElement.querySelector('button, input, select, textarea');
        if (focusable) {
          focusable.focus();
        }
      }, 100);
    }
  }

  /**
   * Deactivate a view
   */
  deactivateView(viewName) {
    const view = this.views[viewName];
    
    // Call view's deactivate method if exists
    if (view && typeof view.deactivate === 'function') {
      view.deactivate();
    }
    
    // Hide view in DOM
    const viewElement = document.getElementById(`${viewName}-view`);
    if (viewElement) {
      viewElement.classList.remove('active');
    }
  }

  /**
   * Update navigation UI
   */
  updateNavigationUI(activeView) {
    this.navItems.forEach(item => {
      if (item.dataset.view === activeView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * Update status bar with current mode
   */
  updateStatusBar(viewName) {
    const statusMode = document.getElementById('status-mode');
    if (statusMode) {
      const modeNames = {
        discovery: 'DISCOVERY',
        analysis: 'ANALYSIS',
        organization: 'ORGANIZATION',
        export: 'EXPORT',
        settings: 'SETTINGS',
        logs: 'LOGS',
        stats: 'STATISTICS'
      };
      
      statusMode.textContent = modeNames[viewName] || viewName.toUpperCase();
    }
  }

  /**
   * Add view to history
   */
  addToHistory(viewName) {
    this.history.push({
      view: viewName,
      timestamp: Date.now()
    });
    
    // Maintain history size
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Navigate back in history
   */
  navigateBack() {
    if (this.history.length > 1) {
      // Remove current view
      this.history.pop();
      
      // Get previous view
      const previous = this.history[this.history.length - 1];
      if (previous) {
        this.navigateTo(previous.view, { skipHistory: true });
        window.history.back();
      }
    }
  }

  /**
   * Navigate forward (if possible)
   */
  navigateForward() {
    window.history.forward();
  }

  /**
   * Get current view
   */
  getCurrentView() {
    return this.currentView;
  }

  /**
   * Get navigation history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Register a view
   */
  registerView(name, view) {
    this.views[name] = view;
    console.log(`[NavigationController] Registered view '${name}'`);
  }

  /**
   * Unregister a view
   */
  unregisterView(name) {
    if (this.views[name]) {
      delete this.views[name];
      console.log(`[NavigationController] Unregistered view '${name}'`);
    }
  }

  /**
   * Check if view exists
   */
  hasView(name) {
    return name in this.views;
  }

  /**
   * Get all registered views
   */
  getViews() {
    return Object.keys(this.views);
  }
}

// Create singleton instance
export const navigationController = new NavigationController();
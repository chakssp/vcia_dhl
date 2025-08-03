/**
 * LazyLoader.js
 * 
 * Component lazy loading and route-based splitting for Knowledge Consolidator V2
 * Implements progressive enhancement and preload strategies
 * 
 * Performance features:
 * - Component lazy loading with intersection observer
 * - Route-based code splitting
 * - Intelligent preloading based on user behavior
 * - Progressive enhancement for slow connections
 */

export class LazyLoader {
  constructor(config = {}) {
    this.config = {
      rootMargin: config.rootMargin || '50px',
      threshold: config.threshold || 0.01,
      enablePreload: config.enablePreload !== false,
      preloadDelay: config.preloadDelay || 2000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };

    // Component registry
    this.components = new Map();
    this.loadedComponents = new Set();
    this.loadingComponents = new Map();
    this.preloadQueue = new Set();
    
    // Route registry
    this.routes = new Map();
    this.currentRoute = null;
    
    // Performance tracking
    this.loadTimes = new Map();
    this.errors = new Map();
    
    // Intersection observer for viewport-based loading
    this.observer = null;
    this.observedElements = new WeakMap();
    
    // Network speed detection
    this.connectionSpeed = this.detectConnectionSpeed();
    
    this.init();
  }

  /**
   * Initialize lazy loader
   */
  init() {
    // Setup intersection observer
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        entries => this.handleIntersection(entries),
        {
          rootMargin: this.config.rootMargin,
          threshold: this.config.threshold
        }
      );
    }

    // Setup network change listener
    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', () => {
        this.connectionSpeed = this.detectConnectionSpeed();
        this.adjustLoadingStrategy();
      });
    }

    // Setup route change listener
    window.addEventListener('popstate', () => this.handleRouteChange());
    
    // Start preload timer
    if (this.config.enablePreload) {
      setTimeout(() => this.startPreloading(), this.config.preloadDelay);
    }
  }

  /**
   * Register a component for lazy loading
   */
  registerComponent(name, importFn, options = {}) {
    this.components.set(name, {
      import: importFn,
      options: {
        priority: options.priority || 'normal',
        preload: options.preload || false,
        retries: options.retries || this.config.retryAttempts,
        placeholder: options.placeholder || null,
        ...options
      }
    });

    // Add to preload queue if specified
    if (options.preload) {
      this.preloadQueue.add(name);
    }
  }

  /**
   * Register a route for lazy loading
   */
  registerRoute(path, componentName, options = {}) {
    this.routes.set(path, {
      component: componentName,
      preload: options.preload || [],
      prefetch: options.prefetch || [],
      ...options
    });
  }

  /**
   * Load a component dynamically
   */
  async loadComponent(name, retryCount = 0) {
    // Check if already loaded
    if (this.loadedComponents.has(name)) {
      return this.components.get(name).module;
    }

    // Check if currently loading
    if (this.loadingComponents.has(name)) {
      return this.loadingComponents.get(name);
    }

    const component = this.components.get(name);
    if (!component) {
      throw new Error(`Component ${name} not registered`);
    }

    const startTime = performance.now();
    
    // Create loading promise
    const loadPromise = this.performComponentLoad(name, component, retryCount, startTime);
    this.loadingComponents.set(name, loadPromise);

    try {
      const module = await loadPromise;
      return module;
    } finally {
      this.loadingComponents.delete(name);
    }
  }

  /**
   * Perform the actual component loading
   */
  async performComponentLoad(name, component, retryCount, startTime) {
    try {
      // Show placeholder if available
      if (component.options.placeholder) {
        this.showPlaceholder(name, component.options.placeholder);
      }

      // Dynamic import
      const module = await component.import();
      
      // Store loaded module
      component.module = module;
      this.loadedComponents.add(name);
      
      // Track load time
      const loadTime = performance.now() - startTime;
      this.loadTimes.set(name, loadTime);
      
      // Log performance
      if (loadTime > 1000) {
        console.warn(`⚠️ Slow component load: ${name} took ${loadTime.toFixed(2)}ms`);
      }

      // Hide placeholder
      this.hidePlaceholder(name);
      
      return module;
    } catch (error) {
      // Retry logic
      if (retryCount < component.options.retries) {
        console.warn(`Retrying component load: ${name} (attempt ${retryCount + 1})`);
        await this.delay(this.config.retryDelay * (retryCount + 1));
        return this.performComponentLoad(name, component, retryCount + 1, startTime);
      }

      // Track error
      this.errors.set(name, { error, attempts: retryCount + 1 });
      
      // Hide placeholder and show error
      this.hidePlaceholder(name);
      this.showError(name, error);
      
      throw error;
    }
  }

  /**
   * Lazy load component when visible
   */
  lazyLoadWhenVisible(element, componentName) {
    if (!this.observer) {
      // Fallback for browsers without IntersectionObserver
      return this.loadComponent(componentName);
    }

    // Store component name for element
    this.observedElements.set(element, componentName);
    
    // Start observing
    this.observer.observe(element);
    
    return new Promise((resolve, reject) => {
      // Store resolve/reject for later use
      element._lazyLoadResolve = resolve;
      element._lazyLoadReject = reject;
    });
  }

  /**
   * Handle intersection observer entries
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const componentName = this.observedElements.get(element);
        
        if (componentName) {
          // Stop observing
          this.observer.unobserve(element);
          
          // Load component
          this.loadComponent(componentName)
            .then(module => {
              if (element._lazyLoadResolve) {
                element._lazyLoadResolve(module);
              }
            })
            .catch(error => {
              if (element._lazyLoadReject) {
                element._lazyLoadReject(error);
              }
            });
        }
      }
    });
  }

  /**
   * Handle route changes for route-based splitting
   */
  async handleRouteChange(path = window.location.pathname) {
    const route = this.routes.get(path);
    if (!route) return;

    this.currentRoute = path;

    try {
      // Load main component
      await this.loadComponent(route.component);

      // Preload related components
      if (route.preload.length > 0) {
        this.preloadComponents(route.preload);
      }

      // Prefetch next likely routes
      if (route.prefetch.length > 0) {
        setTimeout(() => {
          this.prefetchRoutes(route.prefetch);
        }, 1000);
      }
    } catch (error) {
      console.error(`Failed to load route ${path}:`, error);
      // Could redirect to error page
    }
  }

  /**
   * Preload components based on priority
   */
  async startPreloading() {
    // Don't preload on slow connections
    if (this.connectionSpeed === 'slow') {
      return;
    }

    const componentsToPreload = Array.from(this.preloadQueue)
      .map(name => ({
        name,
        priority: this.components.get(name)?.options.priority || 'normal'
      }))
      .sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    for (const { name } of componentsToPreload) {
      if (!this.loadedComponents.has(name)) {
        try {
          await this.loadComponent(name);
          // Delay between preloads to avoid blocking
          await this.delay(100);
        } catch (error) {
          console.warn(`Failed to preload ${name}:`, error);
        }
      }
    }
  }

  /**
   * Preload multiple components
   */
  preloadComponents(componentNames) {
    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        componentNames.forEach(name => {
          if (!this.loadedComponents.has(name)) {
            this.loadComponent(name).catch(() => {});
          }
        });
      });
    } else {
      // Fallback with setTimeout
      setTimeout(() => {
        componentNames.forEach(name => {
          if (!this.loadedComponents.has(name)) {
            this.loadComponent(name).catch(() => {});
          }
        });
      }, 2000);
    }
  }

  /**
   * Prefetch route components
   */
  prefetchRoutes(paths) {
    paths.forEach(path => {
      const route = this.routes.get(path);
      if (route && !this.loadedComponents.has(route.component)) {
        // Create link prefetch
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'script';
        link.href = this.getComponentUrl(route.component);
        document.head.appendChild(link);
      }
    });
  }

  /**
   * Get component URL for prefetching
   */
  getComponentUrl(componentName) {
    // This would be determined by your build process
    return `/v2/dist/components/${componentName}.js`;
  }

  /**
   * Detect connection speed
   */
  detectConnectionSpeed() {
    if (!('connection' in navigator)) {
      return 'unknown';
    }

    const connection = navigator.connection;
    const effectiveType = connection.effectiveType;

    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 'slow';
    } else if (effectiveType === '3g') {
      return 'medium';
    } else {
      return 'fast';
    }
  }

  /**
   * Adjust loading strategy based on connection
   */
  adjustLoadingStrategy() {
    if (this.connectionSpeed === 'slow') {
      // Disable preloading on slow connections
      this.config.enablePreload = false;
      
      // Increase retry delays
      this.config.retryDelay = 2000;
      
      // Clear preload queue
      this.preloadQueue.clear();
    } else {
      // Re-enable preloading
      this.config.enablePreload = true;
      this.config.retryDelay = 1000;
    }
  }

  /**
   * Show loading placeholder
   */
  showPlaceholder(componentName, placeholder) {
    const elements = document.querySelectorAll(`[data-lazy-component="${componentName}"]`);
    elements.forEach(element => {
      if (typeof placeholder === 'string') {
        element.innerHTML = placeholder;
      } else if (typeof placeholder === 'function') {
        element.innerHTML = placeholder();
      }
      element.classList.add('lazy-loading');
    });
  }

  /**
   * Hide loading placeholder
   */
  hidePlaceholder(componentName) {
    const elements = document.querySelectorAll(`[data-lazy-component="${componentName}"]`);
    elements.forEach(element => {
      element.classList.remove('lazy-loading');
    });
  }

  /**
   * Show error state
   */
  showError(componentName, error) {
    const elements = document.querySelectorAll(`[data-lazy-component="${componentName}"]`);
    elements.forEach(element => {
      element.innerHTML = `
        <div class="lazy-error">
          <p>Failed to load component</p>
          <button onclick="window.lazyLoader.retryComponent('${componentName}')">Retry</button>
        </div>
      `;
      element.classList.add('lazy-error-state');
    });
  }

  /**
   * Retry loading a failed component
   */
  async retryComponent(componentName) {
    this.errors.delete(componentName);
    this.loadedComponents.delete(componentName);
    
    try {
      await this.loadComponent(componentName);
      // Reload the page or update the component
      window.location.reload();
    } catch (error) {
      console.error(`Retry failed for ${componentName}:`, error);
    }
  }

  /**
   * Get loading statistics
   */
  getStats() {
    const stats = {
      loaded: this.loadedComponents.size,
      loading: this.loadingComponents.size,
      errors: this.errors.size,
      averageLoadTime: 0,
      slowestComponent: null,
      fastestComponent: null
    };

    if (this.loadTimes.size > 0) {
      const times = Array.from(this.loadTimes.entries());
      const totalTime = times.reduce((sum, [, time]) => sum + time, 0);
      stats.averageLoadTime = totalTime / times.length;

      times.sort((a, b) => b[1] - a[1]);
      stats.slowestComponent = {
        name: times[0][0],
        time: times[0][1]
      };
      stats.fastestComponent = {
        name: times[times.length - 1][0],
        time: times[times.length - 1][1]
      };
    }

    return stats;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.components.clear();
    this.loadedComponents.clear();
    this.loadingComponents.clear();
    this.preloadQueue.clear();
    this.routes.clear();
    this.loadTimes.clear();
    this.errors.clear();
  }
}

// Export singleton instance
const lazyLoader = new LazyLoader();
window.lazyLoader = lazyLoader; // For retry button
export default lazyLoader;
/**
 * Wave 8 - Iteration 001: Foundation Components
 * Sub-Wave 8.1: ML Confidence UI Foundation
 * 
 * This file combines deliverables from 3 parallel agents:
 * - Agent 1: ConfidenceBadge component with full accessibility
 * - Agent 2: Design system tokens and CSS variables for ML confidence levels
 * - Agent 3: Performance utilities for GPU acceleration and monitoring
 * 
 * Requirements:
 * - Badge render time < 1ms
 * - Complete ARIA and keyboard navigation support
 * - GPU-accelerated animations
 * - Design tokens for all confidence levels
 * 
 * @author Senior Frontend Engineers Team
 * @iteration 001
 * @date 2025-07-27
 */

// ============================================================================
// AGENT 2 DELIVERABLE: Design System Tokens
// ============================================================================

/**
 * ML Confidence Design Tokens
 * Defines the visual language for confidence levels across the UI
 */
const MLDesignTokens = {
  // Color tokens for confidence levels
  colors: {
    confidence: {
      high: {
        primary: '#10B981',    // Emerald 500
        secondary: '#059669',  // Emerald 600
        accent: '#6EE7B7',     // Emerald 300
        bg: '#D1FAE5',         // Emerald 100
        text: '#064E3B'        // Emerald 900
      },
      medium: {
        primary: '#F59E0B',    // Amber 500
        secondary: '#D97706',  // Amber 600
        accent: '#FCD34D',     // Amber 300
        bg: '#FEF3C7',         // Amber 100
        text: '#78350F'        // Amber 900
      },
      low: {
        primary: '#EF4444',    // Red 500
        secondary: '#DC2626',  // Red 600
        accent: '#FCA5A5',     // Red 300
        bg: '#FEE2E2',         // Red 100
        text: '#7F1D1D'        // Red 900
      },
      uncertain: {
        primary: '#6B7280',    // Gray 500
        secondary: '#4B5563',  // Gray 600
        accent: '#D1D5DB',     // Gray 300
        bg: '#F3F4F6',         // Gray 100
        text: '#111827'        // Gray 900
      }
    }
  },
  
  // Animation tokens
  animation: {
    easing: {
      standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    },
    duration: {
      instant: '100ms',
      fast: '200ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms'
    }
  },
  
  // Size tokens
  sizes: {
    badge: {
      small: '24px',
      medium: '32px',
      large: '40px',
      xlarge: '48px'
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px'
    }
  },
  
  // Typography tokens
  typography: {
    confidence: {
      value: {
        fontSize: '0.875rem',
        fontWeight: '600',
        lineHeight: '1'
      },
      label: {
        fontSize: '0.625rem',
        fontWeight: '500',
        lineHeight: '1.2'
      }
    }
  },
  
  // Shadow tokens
  shadows: {
    badge: {
      default: '0 2px 8px rgba(0, 0, 0, 0.1)',
      hover: '0 4px 12px rgba(0, 0, 0, 0.15)',
      active: '0 1px 4px rgba(0, 0, 0, 0.1)'
    }
  }
};

/**
 * CSS Variables Generator
 * Converts design tokens to CSS custom properties
 */
class CSSVariablesGenerator {
  static generate() {
    const cssVars = [];
    
    // Generate color variables
    Object.entries(MLDesignTokens.colors.confidence).forEach(([level, colors]) => {
      Object.entries(colors).forEach(([key, value]) => {
        cssVars.push(`--ml-confidence-${level}-${key}: ${value};`);
      });
    });
    
    // Generate animation variables
    Object.entries(MLDesignTokens.animation.easing).forEach(([name, value]) => {
      cssVars.push(`--ml-easing-${name}: ${value};`);
    });
    
    Object.entries(MLDesignTokens.animation.duration).forEach(([name, value]) => {
      cssVars.push(`--ml-duration-${name}: ${value};`);
    });
    
    // Generate size variables
    Object.entries(MLDesignTokens.sizes.badge).forEach(([size, value]) => {
      cssVars.push(`--ml-badge-size-${size}: ${value};`);
    });
    
    return cssVars.join('\n    ');
  }
}

// ============================================================================
// AGENT 3 DELIVERABLE: Performance Utilities
// ============================================================================

/**
 * Performance Monitor
 * Tracks render times and performance metrics for ML components
 */
class MLPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.enabled = true;
    
    // Initialize Performance Observer for long tasks
    if ('PerformanceObserver' in window) {
      this.setupPerformanceObserver();
    }
  }
  
  setupPerformanceObserver() {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Long task threshold
            console.warn(`Long task detected: ${entry.name} (${entry.duration}ms)`);
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask', 'measure'] });
      this.observers.set('longtask', observer);
    } catch (e) {
      console.log('PerformanceObserver not supported');
    }
  }
  
  startMeasure(name) {
    if (!this.enabled) return;
    
    performance.mark(`${name}-start`);
    this.metrics.set(name, {
      startTime: performance.now(),
      marks: [`${name}-start`]
    });
  }
  
  endMeasure(name) {
    if (!this.enabled || !this.metrics.has(name)) return;
    
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const metric = this.metrics.get(name);
    const duration = performance.now() - metric.startTime;
    
    // Store metric
    metric.duration = duration;
    metric.timestamp = Date.now();
    
    // Check against threshold (1ms for badges)
    if (name.includes('badge') && duration > 1) {
      console.warn(`Badge render exceeded 1ms threshold: ${duration.toFixed(2)}ms`);
    }
    
    // Emit event for monitoring
    KC.EventBus.emit('ml:performance:metric', {
      name,
      duration,
      timestamp: metric.timestamp
    });
    
    return duration;
  }
  
  getMetrics(name) {
    if (name) {
      return this.metrics.get(name);
    }
    return Object.fromEntries(this.metrics);
  }
  
  clearMetrics() {
    this.metrics.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

/**
 * GPU Acceleration Helper
 * Utilities for optimizing GPU performance
 */
class GPUAccelerationHelper {
  static willChangeProperties = ['transform', 'opacity'];
  
  static prepareElement(element) {
    // Enable GPU acceleration
    element.style.willChange = this.willChangeProperties.join(', ');
    element.style.transform = 'translateZ(0)'; // Force GPU layer
    element.style.backfaceVisibility = 'hidden'; // Prevent flickering
    
    // Use CSS containment for better performance
    element.style.contain = 'layout style paint';
  }
  
  static cleanupElement(element) {
    // Remove will-change after animation
    element.style.willChange = 'auto';
  }
  
  static requestIdleCallback(callback) {
    if ('requestIdleCallback' in window) {
      return requestIdleCallback(callback);
    }
    // Fallback to setTimeout
    return setTimeout(callback, 1);
  }
  
  static scheduleAnimation(callback) {
    // Use RAF for smooth animations
    return requestAnimationFrame(() => {
      // Double RAF technique for better timing
      requestAnimationFrame(callback);
    });
  }
}

// ============================================================================
// AGENT 1 DELIVERABLE: ConfidenceBadge Component
// ============================================================================

/**
 * Accessibility Helper
 * Provides ARIA attributes and keyboard navigation support
 */
class AccessibilityHelper {
  /**
   * Add ARIA attributes to an element
   * @param {HTMLElement} element - Target element
   * @param {Object} attributes - ARIA attributes to add
   */
  static addAttributes(element, attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  /**
   * Update ARIA attributes on an element
   * @param {HTMLElement} element - Target element
   * @param {Object} attributes - ARIA attributes to update
   */
  static updateAttributes(element, attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (element.getAttribute(key) !== value.toString()) {
        element.setAttribute(key, value);
      }
    });
  }
  
  /**
   * Setup keyboard navigation
   * @param {HTMLElement} element - Target element
   * @param {Function} onActivate - Callback for activation
   */
  static setupKeyboardNav(element, onActivate) {
    element.tabIndex = 0;
    
    element.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          onActivate(e);
          break;
        case 'Escape':
          element.blur();
          break;
      }
    });
  }
  
  /**
   * Announce to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   */
  static announce(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}

/**
 * Badge Template
 * Generates HTML for confidence badges with SVG ring
 */
class BadgeTemplate {
  /**
   * Render the badge HTML
   * @param {Object} data - Badge data
   * @returns {string} HTML string
   */
  render(data) {
    const { percentage, level, iteration, showBreakdown } = data;
    const circumference = 100; // Normalized for stroke-dasharray
    
    return `
      <div class="badge-content">
        <svg class="confidence-ring" viewBox="0 0 36 36" aria-hidden="true">
          <!-- Background ring -->
          <circle class="ring-background"
                  cx="18" cy="18" r="15.9155"
                  fill="none"
                  stroke-width="3"
                  stroke="currentColor"
                  opacity="0.2"/>
          <!-- Progress ring -->
          <circle class="ring-progress"
                  cx="18" cy="18" r="15.9155"
                  fill="none"
                  stroke-width="3"
                  stroke="currentColor"
                  stroke-dasharray="${percentage} ${circumference}"
                  stroke-dashoffset="0"
                  stroke-linecap="round"
                  transform="rotate(-90 18 18)"/>
        </svg>
        <div class="badge-value">
          <span class="percentage">${percentage}</span>
          <span class="percentage-sign">%</span>
          ${iteration > 1 ? `<span class="iteration" aria-label="Iteration ${iteration}">v${iteration}</span>` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Render breakdown tooltip content
   * @param {Object} confidence - Confidence data
   * @returns {string} HTML string
   */
  renderBreakdown(confidence) {
    const dimensions = confidence.dimensions || {};
    
    return `
      <div class="confidence-breakdown">
        <h4>Confidence Breakdown</h4>
        <ul class="dimension-list">
          ${Object.entries(dimensions).map(([name, score]) => `
            <li class="dimension-item">
              <span class="dimension-name">${this.formatDimensionName(name)}</span>
              <span class="dimension-score">${Math.round(score * 100)}%</span>
              <div class="dimension-bar">
                <div class="dimension-fill" style="width: ${score * 100}%"></div>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
  
  /**
   * Format dimension name for display
   * @param {string} name - Raw dimension name
   * @returns {string} Formatted name
   */
  formatDimensionName(name) {
    const nameMap = {
      categorical: 'Categories',
      semantic: 'Content',
      structural: 'Structure',
      temporal: 'Timeline',
      relational: 'Relations'
    };
    return nameMap[name] || name.charAt(0).toUpperCase() + name.slice(1);
  }
}

/**
 * Badge Animator
 * Handles animations for confidence badges
 */
class BadgeAnimator {
  constructor() {
    this.animationFrames = new Map();
    this.performanceMonitor = new MLPerformanceMonitor();
  }
  
  /**
   * Animate badge appearance
   * @param {HTMLElement} badge - Badge element
   */
  animateIn(badge) {
    this.performanceMonitor.startMeasure('badge-animate-in');
    
    // Prepare for GPU acceleration
    GPUAccelerationHelper.prepareElement(badge);
    
    // Initial state
    badge.style.opacity = '0';
    badge.style.transform = 'translateZ(0) scale(0.8)';
    
    // Schedule animation
    GPUAccelerationHelper.scheduleAnimation(() => {
      badge.style.transition = `all ${MLDesignTokens.animation.duration.normal} ${MLDesignTokens.animation.easing.decelerate}`;
      badge.style.opacity = '1';
      badge.style.transform = 'translateZ(0) scale(1)';
      
      // Cleanup after animation
      badge.addEventListener('transitionend', () => {
        GPUAccelerationHelper.cleanupElement(badge);
        this.performanceMonitor.endMeasure('badge-animate-in');
      }, { once: true });
    });
  }
  
  /**
   * Animate value change
   * @param {HTMLElement} badge - Badge element
   * @param {number} from - Starting value
   * @param {number} to - Target value
   */
  animateValue(badge, from, to) {
    this.performanceMonitor.startMeasure('badge-animate-value');
    
    const duration = 500;
    const start = performance.now();
    const valueElement = badge.querySelector('.percentage');
    const ringElement = badge.querySelector('.ring-progress');
    
    // Cancel existing animation if any
    if (this.animationFrames.has(badge)) {
      cancelAnimationFrame(this.animationFrames.get(badge));
    }
    
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function
      const eased = this.easeOutCubic(progress);
      const current = Math.round(from + (to - from) * eased);
      
      // Update value
      valueElement.textContent = current;
      
      // Update ring
      if (ringElement) {
        ringElement.setAttribute('stroke-dasharray', `${current} 100`);
      }
      
      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.set(badge, frameId);
      } else {
        this.animationFrames.delete(badge);
        this.performanceMonitor.endMeasure('badge-animate-value');
        
        // Announce change to screen readers
        AccessibilityHelper.announce(`Confidence updated to ${to} percent`);
      }
    };
    
    const frameId = requestAnimationFrame(animate);
    this.animationFrames.set(badge, frameId);
  }
  
  /**
   * Pulse animation for updates
   * @param {HTMLElement} badge - Badge element
   */
  pulse(badge) {
    badge.classList.add('updating');
    setTimeout(() => {
      badge.classList.remove('updating');
    }, 300);
  }
  
  /**
   * Easing function for smooth animations
   * @param {number} t - Progress (0-1)
   * @returns {number} Eased value
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
}

/**
 * ConfidenceBadge Component
 * Main component for displaying ML confidence scores
 */
class ConfidenceBadge {
  constructor(options = {}) {
    this.options = {
      size: options.size || 'medium',
      showTooltip: options.showTooltip !== false,
      animated: options.animated !== false,
      interactive: options.interactive !== false,
      theme: options.theme || 'auto', // auto, light, dark
      ...options
    };
    
    this.template = new BadgeTemplate();
    this.animator = new BadgeAnimator();
    this.performanceMonitor = new MLPerformanceMonitor();
    this.tooltips = new Map();
  }
  
  /**
   * Render a confidence badge
   * @param {Object} confidence - Confidence data
   * @param {string} fileId - File identifier
   * @returns {HTMLElement} Badge element
   */
  render(confidence, fileId) {
    this.performanceMonitor.startMeasure(`badge-render-${fileId}`);
    
    const level = this.getConfidenceLevel(confidence.overall);
    const percentage = Math.round(confidence.overall * 100);
    
    // Create badge element
    const badge = document.createElement('div');
    badge.className = `confidence-badge ${level} ${this.options.size}`;
    badge.setAttribute('data-file-id', fileId);
    badge.setAttribute('data-confidence', percentage);
    badge.setAttribute('data-theme', this.options.theme);
    
    // Add accessibility attributes
    AccessibilityHelper.addAttributes(badge, {
      role: 'meter',
      'aria-label': `ML confidence score: ${percentage} percent`,
      'aria-valuenow': percentage,
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuetext': `${percentage}% confidence, ${level} level`,
      'aria-describedby': this.options.showTooltip ? `tooltip-${fileId}` : null
    });
    
    // Render content
    badge.innerHTML = this.template.render({
      percentage,
      level,
      iteration: confidence.iteration || 1,
      showBreakdown: this.options.showTooltip
    });
    
    // Setup interactions
    if (this.options.interactive) {
      this.attachInteractions(badge, confidence, fileId);
    }
    
    // Animate if enabled
    if (this.options.animated) {
      this.animator.animateIn(badge);
    }
    
    const renderTime = this.performanceMonitor.endMeasure(`badge-render-${fileId}`);
    
    // Warn if render time exceeds threshold
    if (renderTime > 1) {
      console.warn(`Badge render time exceeded 1ms: ${renderTime.toFixed(2)}ms for file ${fileId}`);
    }
    
    return badge;
  }
  
  /**
   * Update an existing badge
   * @param {HTMLElement} badge - Badge element to update
   * @param {Object} newConfidence - New confidence data
   */
  update(badge, newConfidence) {
    const oldPercentage = parseInt(badge.dataset.confidence);
    const newPercentage = Math.round(newConfidence.overall * 100);
    
    if (oldPercentage === newPercentage && 
        newConfidence.iteration === parseInt(badge.dataset.iteration || 1)) {
      return; // No change
    }
    
    this.performanceMonitor.startMeasure('badge-update');
    
    // Animate value change
    if (this.options.animated && oldPercentage !== newPercentage) {
      this.animator.animateValue(badge, oldPercentage, newPercentage);
    } else {
      badge.querySelector('.percentage').textContent = newPercentage;
    }
    
    // Update attributes
    badge.dataset.confidence = newPercentage;
    badge.dataset.iteration = newConfidence.iteration || 1;
    
    AccessibilityHelper.updateAttributes(badge, {
      'aria-valuenow': newPercentage,
      'aria-valuetext': `${newPercentage}% confidence, ${this.getConfidenceLevel(newConfidence.overall)} level`
    });
    
    // Update visual state
    const newLevel = this.getConfidenceLevel(newConfidence.overall);
    const oldLevel = Array.from(badge.classList).find(c => 
      ['high', 'medium', 'low', 'uncertain'].includes(c)
    );
    
    if (oldLevel !== newLevel) {
      badge.classList.remove(oldLevel);
      badge.classList.add(newLevel);
    }
    
    // Pulse animation
    this.animator.pulse(badge);
    
    // Update iteration indicator
    if (newConfidence.iteration > 1) {
      const iterationEl = badge.querySelector('.iteration');
      if (iterationEl) {
        iterationEl.textContent = `v${newConfidence.iteration}`;
      } else {
        // Add iteration indicator
        const valueEl = badge.querySelector('.badge-value');
        const iterSpan = document.createElement('span');
        iterSpan.className = 'iteration';
        iterSpan.setAttribute('aria-label', `Iteration ${newConfidence.iteration}`);
        iterSpan.textContent = `v${newConfidence.iteration}`;
        valueEl.appendChild(iterSpan);
      }
    }
    
    // Emit update event
    KC.EventBus.emit('ml:badge:updated', {
      fileId: badge.dataset.fileId,
      oldConfidence: oldPercentage,
      newConfidence: newPercentage,
      iteration: newConfidence.iteration
    });
    
    this.performanceMonitor.endMeasure('badge-update');
  }
  
  /**
   * Attach interactive behaviors
   * @param {HTMLElement} badge - Badge element
   * @param {Object} confidence - Confidence data
   * @param {string} fileId - File identifier
   */
  attachInteractions(badge, confidence, fileId) {
    // Tooltip on hover
    if (this.options.showTooltip) {
      this.setupTooltip(badge, confidence, fileId);
    }
    
    // Click handler
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      KC.EventBus.emit('ml:badge:clicked', { 
        fileId, 
        confidence,
        element: badge 
      });
    });
    
    // Keyboard navigation
    AccessibilityHelper.setupKeyboardNav(badge, (e) => {
      badge.click();
    });
    
    // Focus styles
    badge.addEventListener('focus', () => {
      badge.classList.add('focused');
    });
    
    badge.addEventListener('blur', () => {
      badge.classList.remove('focused');
    });
  }
  
  /**
   * Setup tooltip functionality
   * @param {HTMLElement} badge - Badge element
   * @param {Object} confidence - Confidence data
   * @param {string} fileId - File identifier
   */
  setupTooltip(badge, confidence, fileId) {
    let tooltip = null;
    let showTimeout = null;
    let hideTimeout = null;
    
    const showTooltip = () => {
      clearTimeout(hideTimeout);
      
      if (!tooltip) {
        tooltip = this.createTooltip(confidence, fileId);
        document.body.appendChild(tooltip);
        this.tooltips.set(fileId, tooltip);
      }
      
      // Position tooltip
      const rect = badge.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      // Calculate position (prefer top, fallback to bottom)
      let top = rect.top - tooltipRect.height - 8;
      let left = rect.left + (rect.width - tooltipRect.width) / 2;
      
      // Keep within viewport
      if (top < 8) {
        top = rect.bottom + 8;
        tooltip.classList.add('bottom');
      }
      
      if (left < 8) {
        left = 8;
      } else if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }
      
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
      tooltip.classList.add('visible');
    };
    
    const hideTooltip = () => {
      clearTimeout(showTimeout);
      
      if (tooltip) {
        tooltip.classList.remove('visible');
        hideTimeout = setTimeout(() => {
          if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
            this.tooltips.delete(fileId);
            tooltip = null;
          }
        }, 200);
      }
    };
    
    // Mouse events
    badge.addEventListener('mouseenter', () => {
      showTimeout = setTimeout(showTooltip, 500);
    });
    
    badge.addEventListener('mouseleave', hideTooltip);
    
    // Touch events
    let touchTimer = null;
    badge.addEventListener('touchstart', (e) => {
      touchTimer = setTimeout(() => {
        e.preventDefault();
        showTooltip();
      }, 500);
    });
    
    badge.addEventListener('touchend', () => {
      clearTimeout(touchTimer);
      hideTooltip();
    });
  }
  
  /**
   * Create tooltip element
   * @param {Object} confidence - Confidence data
   * @param {string} fileId - File identifier
   * @returns {HTMLElement} Tooltip element
   */
  createTooltip(confidence, fileId) {
    const tooltip = document.createElement('div');
    tooltip.className = 'confidence-tooltip';
    tooltip.id = `tooltip-${fileId}`;
    tooltip.setAttribute('role', 'tooltip');
    
    tooltip.innerHTML = this.template.renderBreakdown(confidence);
    
    return tooltip;
  }
  
  /**
   * Get confidence level from score
   * @param {number} score - Confidence score (0-1)
   * @returns {string} Confidence level
   */
  getConfidenceLevel(score) {
    if (score >= 0.85) return 'high';
    if (score >= 0.70) return 'medium';
    if (score >= 0.50) return 'low';
    return 'uncertain';
  }
  
  /**
   * Destroy badge and cleanup
   * @param {HTMLElement} badge - Badge element
   */
  destroy(badge) {
    const fileId = badge.dataset.fileId;
    
    // Remove tooltip if exists
    const tooltip = this.tooltips.get(fileId);
    if (tooltip && tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip);
      this.tooltips.delete(fileId);
    }
    
    // Cancel animations
    if (this.animator.animationFrames.has(badge)) {
      cancelAnimationFrame(this.animator.animationFrames.get(badge));
      this.animator.animationFrames.delete(badge);
    }
    
    // Remove element
    if (badge.parentNode) {
      badge.parentNode.removeChild(badge);
    }
  }
}

// ============================================================================
// EMBEDDED CSS STYLES
// ============================================================================

/**
 * Inject foundation CSS styles
 * This includes all styles for confidence badges and tooltips
 */
const injectFoundationStyles = () => {
  if (document.getElementById('ml-foundation-styles')) return;
  
  const styleSheet = document.createElement('style');
  styleSheet.id = 'ml-foundation-styles';
  
  // Generate CSS variables from design tokens
  const cssVariables = CSSVariablesGenerator.generate();
  
  styleSheet.textContent = `
    /* CSS Variables from Design Tokens */
    :root {
      ${cssVariables}
      
      /* Additional custom properties */
      --ml-badge-bg: white;
      --ml-badge-border: rgba(0, 0, 0, 0.1);
      --ml-tooltip-bg: rgba(0, 0, 0, 0.9);
      --ml-tooltip-text: white;
      --ml-transition-speed: 200ms;
      --ml-animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Dark theme variables */
    [data-theme="dark"] {
      --ml-badge-bg: #1f2937;
      --ml-badge-border: rgba(255, 255, 255, 0.1);
      --ml-tooltip-bg: rgba(255, 255, 255, 0.95);
      --ml-tooltip-text: #111827;
    }
    
    /* Base badge styles with GPU acceleration */
    .confidence-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      width: var(--ml-badge-size-medium);
      height: var(--ml-badge-size-medium);
      
      /* GPU acceleration */
      will-change: transform, opacity;
      transform: translateZ(0);
      contain: layout style paint;
      
      /* Visual design */
      background: var(--ml-badge-bg);
      border: 1px solid var(--ml-badge-border);
      border-radius: 50%;
      box-shadow: var(--ml-shadow-badge-default);
      cursor: pointer;
      
      /* Transitions */
      transition: all var(--ml-duration-fast) var(--ml-easing-standard);
    }
    
    /* Size variants */
    .confidence-badge.small { 
      width: var(--ml-badge-size-small); 
      height: var(--ml-badge-size-small);
    }
    
    .confidence-badge.large { 
      width: var(--ml-badge-size-large); 
      height: var(--ml-badge-size-large);
    }
    
    /* Confidence levels */
    .confidence-badge.high {
      color: var(--ml-confidence-high-primary);
      background: var(--ml-confidence-high-bg);
      border-color: var(--ml-confidence-high-accent);
    }
    
    .confidence-badge.medium {
      color: var(--ml-confidence-medium-primary);
      background: var(--ml-confidence-medium-bg);
      border-color: var(--ml-confidence-medium-accent);
    }
    
    .confidence-badge.low {
      color: var(--ml-confidence-low-primary);
      background: var(--ml-confidence-low-bg);
      border-color: var(--ml-confidence-low-accent);
    }
    
    .confidence-badge.uncertain {
      color: var(--ml-confidence-uncertain-primary);
      background: var(--ml-confidence-uncertain-bg);
      border-color: var(--ml-confidence-uncertain-accent);
    }
    
    /* Badge content */
    .badge-content {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* SVG ring styles */
    .confidence-ring {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    
    .ring-background,
    .ring-progress {
      fill: none;
      stroke-width: 3;
    }
    
    .ring-progress {
      transition: stroke-dasharray var(--ml-duration-slow) var(--ml-easing-standard);
    }
    
    /* Badge value */
    .badge-value {
      position: relative;
      font-weight: 600;
      text-align: center;
      line-height: 1;
      z-index: 1;
    }
    
    .percentage {
      font-size: 0.75em;
    }
    
    .percentage-sign {
      font-size: 0.625em;
      opacity: 0.8;
    }
    
    .iteration {
      font-size: 0.5em;
      opacity: 0.6;
      display: block;
      margin-top: 2px;
    }
    
    /* Hover effects */
    .confidence-badge:hover {
      transform: translateZ(0) scale(1.05);
      box-shadow: var(--ml-shadow-badge-hover);
    }
    
    /* Focus styles for accessibility */
    .confidence-badge:focus {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }
    
    .confidence-badge.focused {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }
    
    /* Animation states */
    .confidence-badge.updating {
      animation: pulseUpdate var(--ml-duration-normal) var(--ml-easing-standard);
    }
    
    @keyframes pulseUpdate {
      0%, 100% { 
        transform: translateZ(0) scale(1); 
      }
      50% { 
        transform: translateZ(0) scale(1.08); 
      }
    }
    
    /* Tooltip styles */
    .confidence-tooltip {
      position: fixed;
      background: var(--ml-tooltip-bg);
      color: var(--ml-tooltip-text);
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.4;
      max-width: 280px;
      opacity: 0;
      transform: translateY(-4px);
      transition: all var(--ml-duration-fast) var(--ml-easing-decelerate);
      pointer-events: none;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }
    
    .confidence-tooltip.visible {
      opacity: 1;
      transform: translateY(0);
    }
    
    .confidence-tooltip.bottom {
      transform: translateY(4px);
    }
    
    .confidence-tooltip.bottom.visible {
      transform: translateY(0);
    }
    
    .confidence-breakdown h4 {
      margin: 0 0 8px 0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.8;
    }
    
    .dimension-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    
    .dimension-item {
      display: flex;
      align-items: center;
      margin-bottom: 6px;
    }
    
    .dimension-name {
      flex: 1;
      font-size: 13px;
    }
    
    .dimension-score {
      font-weight: 600;
      margin-left: 8px;
      font-size: 13px;
    }
    
    .dimension-bar {
      position: relative;
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      margin-top: 4px;
      overflow: hidden;
    }
    
    .dimension-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: currentColor;
      border-radius: 2px;
      transition: width var(--ml-duration-normal) var(--ml-easing-standard);
    }
    
    /* Mobile optimizations */
    @media (max-width: 768px) {
      .confidence-badge {
        --ml-badge-size-small: 20px;
        --ml-badge-size-medium: 24px;
        --ml-badge-size-large: 32px;
      }
      
      .confidence-badge .iteration {
        display: none;
      }
      
      .confidence-tooltip {
        max-width: 240px;
        font-size: 13px;
      }
    }
    
    /* High contrast mode */
    @media (prefers-contrast: high) {
      .confidence-badge {
        border-width: 2px;
      }
      
      .confidence-tooltip {
        border: 2px solid currentColor;
      }
    }
    
    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .confidence-badge {
        transition: none;
      }
      
      .confidence-badge.updating {
        animation: none;
      }
      
      .ring-progress {
        transition: none;
      }
      
      .confidence-tooltip {
        transition: opacity var(--ml-duration-instant) ease;
      }
    }
  `;
  
  document.head.appendChild(styleSheet);
};

// ============================================================================
// MODULE EXPORTS AND INITIALIZATION
// ============================================================================

/**
 * Initialize foundation components
 * Call this once when the application starts
 */
const initializeMLFoundation = () => {
  // Inject styles
  injectFoundationStyles();
  
  // Register with KC if available
  if (window.KC) {
    // Register components
    KC.ML = KC.ML || {};
    KC.ML.ConfidenceBadge = ConfidenceBadge;
    KC.ML.AccessibilityHelper = AccessibilityHelper;
    KC.ML.MLPerformanceMonitor = MLPerformanceMonitor;
    KC.ML.GPUAccelerationHelper = GPUAccelerationHelper;
    KC.ML.DesignTokens = MLDesignTokens;
    
    // Register CSS injection
    KC.ML.injectStyles = injectFoundationStyles;
    
    console.log('[ML Foundation] Components initialized successfully');
  }
  
  // Return components for standalone usage
  return {
    ConfidenceBadge,
    AccessibilityHelper,
    BadgeTemplate,
    BadgeAnimator,
    MLPerformanceMonitor,
    GPUAccelerationHelper,
    MLDesignTokens,
    CSSVariablesGenerator,
    injectFoundationStyles
  };
};

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMLFoundation);
} else {
  initializeMLFoundation();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ConfidenceBadge,
    AccessibilityHelper,
    BadgeTemplate,
    BadgeAnimator,
    MLPerformanceMonitor,
    GPUAccelerationHelper,
    MLDesignTokens,
    CSSVariablesGenerator,
    initializeMLFoundation
  };
}
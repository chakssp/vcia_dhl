# 📋 Wave 8: Frontend Team Specification
## Feature Branch: `feature/ml-confidence-integration`

### Team Assignment: Frontend & UX Engineering

#### 🎯 Sprint Goal
Implement ML confidence UI components with A/B testing, achieving 80%+ user approval and 30% engagement increase.

## 📊 Success Metrics (Weeks 4-5)
- [ ] Badge render time < 1ms per badge
- [ ] Time to first interaction < 3s
- [ ] 90%+ users understand confidence scores
- [ ] 30% increase in file interactions
- [ ] 60%+ feedback completion rate

## 🛠️ Technical Deliverables

**Team Contact** "Name": "ML UI/UX Enhancement Team"
**agents**: ui-ux-dev-lead ,  senior-ux-designer , front-engineers-team
**Source**: specs\@wave6-10-recruitment-orchestration.md

### 1. Confidence Badge Component (`js/components/ml/ConfidenceBadge.js`)
```javascript
/**
 * Visual confidence indicator with accessibility
 * GPU-accelerated rendering for performance
 */
class ConfidenceBadge {
  constructor(options = {}) {
    this.options = {
      size: options.size || 'medium', // small, medium, large
      showTooltip: options.showTooltip !== false,
      animated: options.animated !== false,
      interactive: options.interactive !== false,
      ...options
    };
    
    this.template = new BadgeTemplate();
    this.animator = new BadgeAnimator();
    this.a11y = new AccessibilityHelper();
  }
  
  render(confidence, fileId) {
    const level = this.getConfidenceLevel(confidence.overall);
    const percentage = Math.round(confidence.overall * 100);
    
    const badge = document.createElement('div');
    badge.className = `confidence-badge ${level} ${this.options.size}`;
    badge.setAttribute('data-file-id', fileId);
    badge.setAttribute('data-confidence', percentage);
    
    // Accessibility
    this.a11y.addAttributes(badge, {
      role: 'meter',
      'aria-label': `Confidence score: ${percentage} percent`,
      'aria-valuenow': percentage,
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuetext': `${percentage}% confidence, ${level}`
    });
    
    // Visual content
    badge.innerHTML = this.template.render({
      percentage,
      level,
      iteration: confidence.iteration || 1,
      showBreakdown: this.options.showTooltip
    });
    
    // Interactive features
    if (this.options.interactive) {
      this.attachInteractions(badge, confidence, fileId);
    }
    
    // Animation
    if (this.options.animated) {
      this.animator.animateIn(badge);
    }
    
    return badge;
  }
  
  attachInteractions(badge, confidence, fileId) {
    // Hover tooltip
    if (this.options.showTooltip) {
      const tooltip = new ConfidenceTooltip();
      
      badge.addEventListener('mouseenter', (e) => {
        tooltip.show(e.target, confidence);
      });
      
      badge.addEventListener('mouseleave', () => {
        tooltip.hide();
      });
    }
    
    // Click actions
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      KC.EventBus.emit('ml:badge:clicked', { fileId, confidence });
    });
    
    // Keyboard support
    badge.tabIndex = 0;
    badge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        badge.click();
      }
    });
  }
  
  update(badge, newConfidence) {
    const oldPercentage = parseInt(badge.dataset.confidence);
    const newPercentage = Math.round(newConfidence.overall * 100);
    
    if (oldPercentage === newPercentage) return;
    
    // Animate value change
    this.animator.animateValue(badge, oldPercentage, newPercentage);
    
    // Update attributes
    badge.dataset.confidence = newPercentage;
    this.a11y.updateAttributes(badge, {
      'aria-valuenow': newPercentage,
      'aria-valuetext': `${newPercentage}% confidence`
    });
    
    // Update visual
    const level = this.getConfidenceLevel(newConfidence.overall);
    badge.className = `confidence-badge ${level} ${this.options.size} updating`;
    
    // Emit update event
    KC.EventBus.emit('ml:badge:updated', {
      fileId: badge.dataset.fileId,
      oldConfidence: oldPercentage,
      newConfidence: newPercentage
    });
  }
  
  getConfidenceLevel(score) {
    if (score >= 0.85) return 'high';
    if (score >= 0.70) return 'medium';
    if (score >= 0.50) return 'low';
    return 'uncertain';
  }
}

/**
 * Badge HTML template with SVG ring
 */
class BadgeTemplate {
  render(data) {
    return `
      <div class="badge-content">
        <svg class="confidence-ring" viewBox="0 0 36 36">
          <path class="ring-background"
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke-width="3"
                stroke="currentColor"
                opacity="0.2"/>
          <path class="ring-progress"
                d="M18 2.0845
                   a 15.9155 15.9155 0 0 1 0 31.831
                   a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke-width="3"
                stroke="currentColor"
                stroke-dasharray="${data.percentage}, 100"
                stroke-linecap="round"
                transform="rotate(-90 18 18)"/>
        </svg>
        <div class="badge-value">
          <span class="percentage">${data.percentage}</span>
          ${data.iteration > 1 ? `<span class="iteration">v${data.iteration}</span>` : ''}
        </div>
      </div>
    `;
  }
}

/**
 * GPU-accelerated animations
 */
class BadgeAnimator {
  animateIn(badge) {
    badge.style.opacity = '0';
    badge.style.transform = 'scale(0.8)';
    
    requestAnimationFrame(() => {
      badge.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      badge.style.opacity = '1';
      badge.style.transform = 'scale(1)';
    });
  }
  
  animateValue(badge, from, to) {
    const duration = 500;
    const start = performance.now();
    const valueElement = badge.querySelector('.percentage');
    
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing
      const eased = this.easeOutCubic(progress);
      const current = Math.round(from + (to - from) * eased);
      
      valueElement.textContent = current;
      
      // Update ring
      const ring = badge.querySelector('.ring-progress');
      ring.setAttribute('stroke-dasharray', `${current}, 100`);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
}
```

### 2. ML Dashboard Widget (`js/components/ml/MLDashboard.js`)
```javascript
/**
 * Real-time ML metrics dashboard
 * Integrates with header for quick access
 */
class MLDashboard {
  constructor() {
    this.container = null;
    this.metrics = new DashboardMetrics();
    this.charts = new DashboardCharts();
    this.updateInterval = null;
  }
  
  initialize() {
    this.createWidget();
    this.attachToHeader();
    this.startUpdates();
    
    // Listen for events
    KC.EventBus.on('ml:confidence:updated', this.handleUpdate.bind(this));
    KC.EventBus.on('ml:convergence:detected', this.handleConvergence.bind(this));
  }
  
  createWidget() {
    this.container = document.createElement('div');
    this.container.className = 'ml-dashboard-widget';
    this.container.innerHTML = `
      <div class="dashboard-compact">
        <div class="ml-indicator" role="status" aria-live="polite">
          <span class="ml-icon" aria-hidden="true">🤖</span>
          <span class="ml-status">ML: <span id="ml-status-text">Loading...</span></span>
        </div>
        
        <div class="ml-metrics-mini" role="group" aria-label="ML Metrics">
          <div class="metric-pill" title="Average confidence score">
            <span class="metric-icon" aria-hidden="true">📊</span>
            <span class="metric-value" id="avg-confidence">--%</span>
          </div>
          <div class="metric-pill" title="Files converged to target confidence">
            <span class="metric-icon" aria-hidden="true">✅</span>
            <span class="metric-value" id="converged-count">--/--</span>
          </div>
          <div class="metric-pill" title="Improvement rate from ML optimization">
            <span class="metric-icon" aria-hidden="true">📈</span>
            <span class="metric-value" id="improvement-rate">--%</span>
          </div>
        </div>
        
        <div class="ml-quick-actions" role="toolbar">
          <button class="ml-action-btn" 
                  onclick="KC.ML.showFullDashboard()" 
                  title="Open full ML dashboard"
                  aria-label="Open full ML dashboard">
            📊
          </button>
          <button class="ml-action-btn" 
                  onclick="KC.ML.toggleAutoImprove()" 
                  title="Toggle automatic improvement"
                  aria-label="Toggle automatic improvement">
            🔄
          </button>
          <button class="ml-action-btn"
                  onclick="KC.ML.openSettings()"
                  title="ML settings"
                  aria-label="Open ML settings">
            ⚙️
          </button>
        </div>
      </div>
      
      <div class="dashboard-expanded" style="display: none;">
        <!-- Expanded view content -->
      </div>
    `;
  }
  
  attachToHeader() {
    const nav = document.querySelector('.main-nav');
    if (nav) {
      // Insert after API config button
      const apiButton = nav.querySelector('.btn-api-config');
      if (apiButton) {
        apiButton.insertAdjacentElement('afterend', this.container);
      } else {
        nav.appendChild(this.container);
      }
    }
  }
  
  startUpdates() {
    // Initial update
    this.updateMetrics();
    
    // Regular updates
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 5000);
  }
  
  async updateMetrics() {
    const stats = await this.metrics.calculate();
    
    // Update UI
    this.updateElement('ml-status-text', stats.enabled ? 'Active' : 'Inactive');
    this.updateElement('avg-confidence', `${Math.round(stats.avgConfidence)}%`);
    this.updateElement('converged-count', `${stats.converged}/${stats.total}`);
    this.updateElement('improvement-rate', `${stats.improvementRate > 0 ? '+' : ''}${stats.improvementRate}%`);
    
    // Update styles based on values
    this.updateStyles(stats);
  }
  
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element && element.textContent !== value) {
      element.textContent = value;
      element.classList.add('updating');
      setTimeout(() => element.classList.remove('updating'), 300);
    }
  }
  
  updateStyles(stats) {
    // Color code based on performance
    const avgConfElement = document.getElementById('avg-confidence');
    if (avgConfElement) {
      avgConfElement.className = 'metric-value';
      if (stats.avgConfidence >= 85) {
        avgConfElement.classList.add('high');
      } else if (stats.avgConfidence >= 70) {
        avgConfElement.classList.add('medium');
      } else {
        avgConfElement.classList.add('low');
      }
    }
  }
  
  showFullDashboard() {
    const modal = new DashboardModal();
    modal.show({
      metrics: this.metrics.getDetailed(),
      charts: this.charts.getAll(),
      history: this.metrics.getHistory()
    });
  }
}

/**
 * Dashboard metrics calculator
 */
class DashboardMetrics {
  async calculate() {
    const files = KC.AppState.get('files') || [];
    const mlData = KC.AppState.ml || {};
    
    let totalConfidence = 0;
    let convergedCount = 0;
    let analyzedCount = 0;
    
    for (const file of files) {
      if (file.mlConfidence) {
        analyzedCount++;
        totalConfidence += file.mlConfidence.overall;
        
        if (file.mlConfidence.overall >= 0.85) {
          convergedCount++;
        }
      }
    }
    
    const avgConfidence = analyzedCount > 0 ? 
      (totalConfidence / analyzedCount) * 100 : 0;
    
    // Calculate improvement rate
    const history = mlData.history || [];
    const improvementRate = this.calculateImprovementRate(history);
    
    return {
      enabled: KC.ML?.flags?.enabled || false,
      total: files.length,
      analyzed: analyzedCount,
      converged: convergedCount,
      avgConfidence,
      improvementRate,
      convergenceRate: analyzedCount > 0 ? 
        (convergedCount / analyzedCount) * 100 : 0
    };
  }
  
  calculateImprovementRate(history) {
    if (history.length < 2) return 0;
    
    const recent = history.slice(-10);
    const first = recent[0].avgConfidence || 0;
    const last = recent[recent.length - 1].avgConfidence || 0;
    
    return Math.round(((last - first) / first) * 100);
  }
}
```

### 3. Enhanced Curation Panel (`js/components/ml/CurationPanel.js`)
```javascript
/**
 * Interactive panel for ML feedback and curation
 * Implements suggestion engine and feedback collection
 */
class CurationPanel {
  constructor() {
    this.container = null;
    this.currentFile = null;
    this.suggestionEngine = new MLSuggestionEngine();
    this.feedbackCollector = new FeedbackCollector();
    this.visualizer = new ConfidenceVisualizer();
  }
  
  show(file) {
    this.currentFile = file;
    
    if (!this.container) {
      this.createContainer();
    }
    
    this.render();
    this.attachEventListeners();
    this.container.classList.add('visible');
    
    // Focus management for accessibility
    this.container.querySelector('.close-btn').focus();
  }
  
  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'ml-curation-panel';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-label', 'ML Confidence Curation');
    document.body.appendChild(this.container);
  }
  
  render() {
    const confidence = this.currentFile.mlConfidence || { overall: 0, dimensions: {} };
    const suggestions = this.suggestionEngine.generate(this.currentFile);
    
    this.container.innerHTML = `
      <div class="curation-content">
        <div class="curation-header">
          <h2>Confidence Analysis: ${this.currentFile.name}</h2>
          <button class="close-btn" aria-label="Close panel">✕</button>
        </div>
        
        <div class="confidence-overview">
          <div class="confidence-visual">
            <canvas id="confidence-radar" width="300" height="300"></canvas>
          </div>
          <div class="confidence-summary">
            <h3>${Math.round(confidence.overall * 100)}% Overall Confidence</h3>
            <p class="status-message">${this.getStatusMessage(confidence)}</p>
            ${confidence.iteration > 1 ? 
              `<p class="iteration-info">Improved through ${confidence.iteration} iterations</p>` : 
              ''}
          </div>
        </div>
        
        <div class="improvement-section">
          <h3>Suggestions to Improve Confidence</h3>
          <ul class="suggestion-list">
            ${suggestions.map(s => this.renderSuggestion(s)).join('')}
          </ul>
        </div>
        
        <div class="feedback-section">
          <h3>Is this analysis accurate?</h3>
          <div class="feedback-buttons">
            <button class="feedback-btn positive" data-feedback="correct">
              <span class="icon">👍</span>
              <span class="label">Yes, accurate</span>
            </button>
            <button class="feedback-btn negative" data-feedback="incorrect">
              <span class="icon">👎</span>
              <span class="label">Needs improvement</span>
            </button>
            <button class="feedback-btn neutral" data-feedback="partial">
              <span class="icon">🤔</span>
              <span class="label">Partially correct</span>
            </button>
          </div>
          
          <div class="feedback-details" style="display: none;">
            <textarea placeholder="Please provide details to help us improve..."
                      aria-label="Feedback details"></textarea>
            <button class="submit-feedback">Submit Feedback</button>
          </div>
        </div>
        
        <div class="category-section">
          <h3>Suggested Categories</h3>
          <div class="category-chips">
            ${this.renderCategorySuggestions(confidence)}
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="btn-primary" onclick="KC.ML.improveFile('${this.currentFile.id}')">
            🔄 Run Another Iteration
          </button>
          <button class="btn-secondary" onclick="KC.ML.acceptAnalysis('${this.currentFile.id}')">
            ✅ Accept & Continue
          </button>
        </div>
      </div>
    `;
    
    // Render confidence visualization
    this.visualizer.renderRadarChart('confidence-radar', confidence.dimensions);
  }
  
  renderSuggestion(suggestion) {
    const priorityClass = suggestion.priority === 'high' ? 'high-priority' : '';
    
    return `
      <li class="suggestion-item ${priorityClass}">
        <span class="suggestion-icon">${suggestion.icon}</span>
        <span class="suggestion-text">${suggestion.text}</span>
        <span class="suggestion-impact">+${suggestion.expectedImprovement}%</span>
        <button class="apply-suggestion" 
                onclick="KC.ML.applySuggestion('${this.currentFile.id}', '${suggestion.id}')">
          Apply
        </button>
      </li>
    `;
  }
  
  renderCategorySuggestions(confidence) {
    const categories = this.suggestionEngine.suggestCategories(
      this.currentFile, 
      confidence
    );
    
    return categories.map(cat => `
      <div class="category-chip ${cat.confidence > 0.8 ? 'high-confidence' : ''}">
        <span class="category-name">${cat.name}</span>
        <span class="category-confidence">${Math.round(cat.confidence * 100)}%</span>
        <button class="chip-action accept" 
                onclick="KC.ML.acceptCategory('${this.currentFile.id}', '${cat.name}')"
                aria-label="Accept ${cat.name} category">
          ✓
        </button>
        <button class="chip-action reject" 
                onclick="KC.ML.rejectCategory('${this.currentFile.id}', '${cat.name}')"
                aria-label="Reject ${cat.name} category">
          ✗
        </button>
      </div>
    `).join('');
  }
  
  attachEventListeners() {
    // Close button
    this.container.querySelector('.close-btn').addEventListener('click', () => {
      this.hide();
    });
    
    // Feedback buttons
    this.container.querySelectorAll('.feedback-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleFeedback(e.target.dataset.feedback);
      });
    });
    
    // ESC key to close
    this.escHandler = (e) => {
      if (e.key === 'Escape') this.hide();
    };
    document.addEventListener('keydown', this.escHandler);
  }
  
  handleFeedback(type) {
    // Show details for negative feedback
    if (type === 'incorrect' || type === 'partial') {
      this.container.querySelector('.feedback-details').style.display = 'block';
    }
    
    // Collect feedback
    this.feedbackCollector.collect({
      fileId: this.currentFile.id,
      feedbackType: type,
      confidence: this.currentFile.mlConfidence,
      timestamp: Date.now()
    });
    
    // Update UI
    this.container.querySelectorAll('.feedback-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    event.target.closest('.feedback-btn').classList.add('selected');
  }
  
  hide() {
    this.container.classList.remove('visible');
    document.removeEventListener('keydown', this.escHandler);
    
    // Return focus to triggering element
    if (this.triggerElement) {
      this.triggerElement.focus();
    }
  }
}

/**
 * ML suggestion engine
 */
class MLSuggestionEngine {
  generate(file) {
    const suggestions = [];
    const confidence = file.mlConfidence || { overall: 0, dimensions: {} };
    
    // Analyze weakest dimensions
    const dimensions = confidence.dimensions || {};
    const weakest = this.findWeakestDimensions(dimensions);
    
    // Generate targeted suggestions
    weakest.forEach(dim => {
      suggestions.push(...this.getSuggestionsForDimension(dim, file));
    });
    
    // Sort by expected impact
    suggestions.sort((a, b) => b.expectedImprovement - a.expectedImprovement);
    
    return suggestions.slice(0, 5); // Top 5 suggestions
  }
  
  findWeakestDimensions(dimensions) {
    return Object.entries(dimensions)
      .filter(([_, score]) => score < 0.7)
      .sort((a, b) => a[1] - b[1])
      .map(([name, score]) => ({ name, score }));
  }
  
  getSuggestionsForDimension(dim, file) {
    const suggestions = [];
    
    switch (dim.name) {
      case 'categorical':
        if (!file.categories || file.categories.length === 0) {
          suggestions.push({
            id: 'add-categories',
            icon: '🏷️',
            text: 'Add relevant categories to improve classification',
            priority: 'high',
            expectedImprovement: 15,
            action: 'categorize'
          });
        }
        break;
        
      case 'semantic':
        if (file.preview && file.preview.length < 100) {
          suggestions.push({
            id: 'expand-content',
            icon: '📝',
            text: 'Expand content preview for better semantic analysis',
            priority: 'medium',
            expectedImprovement: 10,
            action: 'expand-preview'
          });
        }
        break;
        
      case 'structural':
        suggestions.push({
          id: 'improve-structure',
          icon: '🏗️',
          text: 'Add structural metadata (headings, sections)',
          priority: 'medium',
          expectedImprovement: 8,
          action: 'add-structure'
        });
        break;
    }
    
    return suggestions;
  }
  
  suggestCategories(file, confidence) {
    // Use semantic similarity to suggest categories
    const allCategories = KC.CategoryManager.getAll();
    const suggestions = [];
    
    // Simple implementation - in production use embeddings
    const fileKeywords = this.extractKeywords(file.content || file.preview);
    
    allCategories.forEach(category => {
      const similarity = this.calculateSimilarity(fileKeywords, category.keywords || []);
      if (similarity > 0.3) {
        suggestions.push({
          name: category.name,
          confidence: similarity,
          reason: 'keyword-match'
        });
      }
    });
    
    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }
}
```

### 4. ML Filter Extensions (`js/extensions/FilterPanelML.js`)
```javascript
/**
 * Extends existing FilterPanel with ML-specific filters
 */
class FilterPanelML {
  static extend(FilterPanel) {
    // Add ML filters to existing panel
    FilterPanel.prototype.addMLFilters = function() {
      // Confidence range filter
      this.addFilter({
        id: 'ml-confidence',
        type: 'range',
        label: 'ML Confidence',
        icon: '🎯',
        min: 0,
        max: 100,
        step: 5,
        default: [0, 100],
        unit: '%',
        apply: (files, range) => {
          return files.filter(file => {
            if (!file.mlConfidence) return false;
            const score = file.mlConfidence.overall * 100;
            return score >= range[0] && score <= range[1];
          });
        },
        getCount: (files) => {
          return files.filter(f => f.mlConfidence).length;
        }
      });
      
      // Convergence status filter
      this.addFilter({
        id: 'ml-status',
        type: 'multiselect',
        label: 'ML Status',
        icon: '📊',
        options: [
          { value: 'converged', label: '✅ Converged (85%+)', color: 'var(--ml-confidence-high)' },
          { value: 'improving', label: '📈 Improving', color: 'var(--ml-confidence-medium)' },
          { value: 'stagnant', label: '⏸️ Stagnant', color: 'var(--ml-confidence-uncertain)' },
          { value: 'needs-work', label: '🔴 Needs Attention', color: 'var(--ml-confidence-low)' }
        ],
        default: ['converged', 'improving', 'stagnant', 'needs-work'],
        apply: (files, selected) => {
          return files.filter(file => {
            const status = this.getMLStatus(file);
            return selected.includes(status);
          });
        }
      });
      
      // Iteration count filter
      this.addFilter({
        id: 'ml-iterations',
        type: 'number',
        label: 'ML Iterations',
        icon: '🔄',
        min: 1,
        max: 10,
        default: { min: 1, max: 10 },
        apply: (files, range) => {
          return files.filter(file => {
            const iterations = file.mlConfidence?.iteration || 0;
            return iterations >= range.min && iterations <= range.max;
          });
        }
      });
      
      // Add visual indicators to filter UI
      this.enhanceFilterUI();
    };
    
    // Helper method to determine ML status
    FilterPanel.prototype.getMLStatus = function(file) {
      if (!file.mlConfidence) return null;
      
      const confidence = file.mlConfidence.overall;
      const history = file.mlHistory || [];
      
      if (confidence >= 0.85) return 'converged';
      
      if (history.length >= 2) {
        const recent = history.slice(-2);
        const delta = recent[1].overall - recent[0].overall;
        
        if (delta > 0.02) return 'improving';
        if (Math.abs(delta) < 0.01) return 'stagnant';
      }
      
      return 'needs-work';
    };
    
    // Enhance filter UI with ML indicators
    FilterPanel.prototype.enhanceFilterUI = function() {
      // Add ML section header
      const mlSection = document.createElement('div');
      mlSection.className = 'filter-section ml-filters';
      mlSection.innerHTML = '<h4>ML Confidence Filters</h4>';
      
      // Insert after existing filters
      const container = this.container.querySelector('.filter-controls');
      if (container) {
        container.appendChild(mlSection);
      }
    };
  }
}
```

## 📝 CSS Specifications

### 1. Confidence Badge Styles (`css/components/confidence-badge.css`)
```css
/* Base badge styles with GPU acceleration */
.confidence-badge {
  --size-small: 24px;
  --size-medium: 32px;
  --size-large: 40px;
  
  position: absolute;
  top: 8px;
  right: 8px;
  width: var(--size-medium);
  height: var(--size-medium);
  
  /* GPU acceleration */
  will-change: transform, opacity;
  transform: translateZ(0);
  contain: layout style paint;
  
  /* Visual design */
  background: var(--ml-badge-bg);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  
  /* Transitions */
  transition: all var(--ml-transition-speed) var(--ml-animation-easing);
}

/* Size variants */
.confidence-badge.small { 
  width: var(--size-small); 
  height: var(--size-small);
  font-size: 0.75rem;
}

.confidence-badge.large { 
  width: var(--size-large); 
  height: var(--size-large);
  font-size: 0.875rem;
}

/* Confidence levels */
.confidence-badge.high {
  --badge-color: var(--ml-confidence-high);
}

.confidence-badge.medium {
  --badge-color: var(--ml-confidence-medium);
}

.confidence-badge.low {
  --badge-color: var(--ml-confidence-low);
}

.confidence-badge.uncertain {
  --badge-color: var(--ml-confidence-uncertain);
}

/* SVG ring styles */
.confidence-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}

.ring-background,
.ring-progress {
  fill: none;
  stroke-width: 3;
}

.ring-background {
  stroke: currentColor;
  opacity: 0.2;
}

.ring-progress {
  stroke: var(--badge-color, currentColor);
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s ease-out;
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

.badge-value {
  font-weight: 600;
  color: var(--badge-color);
  text-align: center;
  line-height: 1;
}

.percentage {
  font-size: 0.875em;
}

.iteration {
  font-size: 0.625em;
  opacity: 0.8;
  display: block;
  margin-top: 2px;
}

/* Hover effects */
.confidence-badge:hover {
  transform: translateZ(0) scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Focus styles for accessibility */
.confidence-badge:focus {
  outline: 2px solid var(--badge-color);
  outline-offset: 2px;
}

/* Animation states */
.confidence-badge.updating {
  animation: pulseUpdate 0.3s ease-out;
}

@keyframes pulseUpdate {
  0%, 100% { 
    transform: translateZ(0) scale(1); 
  }
  50% { 
    transform: translateZ(0) scale(1.05); 
  }
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .confidence-badge {
    --size-small: 20px;
    --size-medium: 24px;
    --size-large: 32px;
  }
  
  .confidence-badge .iteration {
    display: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .confidence-badge {
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
}
```

## 📝 Testing Requirements

### 1. Component Tests (`test/ml/frontend.test.js`)
```javascript
describe('ML Frontend Components', () => {
  describe('ConfidenceBadge', () => {
    it('should render with correct accessibility attributes', () => {
      const badge = new ConfidenceBadge();
      const element = badge.render({ overall: 0.85 }, 'file-1');
      
      expect(element.getAttribute('role')).toBe('meter');
      expect(element.getAttribute('aria-valuenow')).toBe('85');
      expect(element.getAttribute('aria-label')).toContain('85 percent');
    });
    
    it('should update smoothly when confidence changes', async () => {
      const badge = new ConfidenceBadge({ animated: true });
      const element = badge.render({ overall: 0.50 }, 'file-1');
      document.body.appendChild(element);
      
      badge.update(element, { overall: 0.85 });
      
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      expect(element.querySelector('.percentage').textContent).toBe('85');
    });
  });
  
  describe('CurationPanel', () => {
    it('should generate relevant suggestions', () => {
      const panel = new CurationPanel();
      const file = {
        name: 'test.md',
        mlConfidence: {
          overall: 0.65,
          dimensions: {
            categorical: 0.3,
            semantic: 0.8,
            structural: 0.7,
            temporal: 0.6
          }
        }
      };
      
      const suggestions = panel.suggestionEngine.generate(file);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].id).toBe('add-categories');
    });
  });
});
```

### 2. Visual Regression Tests
```javascript
describe('Visual Regression', () => {
  it('should match confidence badge snapshots', async () => {
    const scenarios = [
      { confidence: 0.95, level: 'high' },
      { confidence: 0.75, level: 'medium' },
      { confidence: 0.45, level: 'low' }
    ];
    
    for (const scenario of scenarios) {
      const badge = new ConfidenceBadge();
      const element = badge.render({ overall: scenario.confidence }, 'test');
      
      await expect(element).toMatchImageSnapshot({
        customSnapshotIdentifier: `badge-${scenario.level}`
      });
    }
  });
});
```

### 3. A/B Test Configuration
```javascript
// A/B test setup for confidence badges
const confidenceBadgeTest = {
  id: 'ml-confidence-badges-v1',
  variants: {
    control: { showBadges: false },
    treatment: { showBadges: true }
  },
  metrics: [
    'file_interaction_rate',
    'time_to_categorize',
    'feedback_completion_rate'
  ],
  allocation: 0.5, // 50/50 split
  duration: '2 weeks'
};
```

## 🚀 Implementation Checklist

### Week 4 - Foundation
- [ ] Implement ConfidenceBadge component
- [ ] Create MLDashboard widget
- [ ] Add to header without breaking layout
- [ ] Implement accessibility features
- [ ] Set up A/B testing framework

### Week 5 - Enhancement & Polish
- [ ] Complete CurationPanel
- [ ] Extend FilterPanel with ML filters
- [ ] Add animations and transitions
- [ ] Mobile responsive adjustments
- [ ] Performance optimization

### Pre-launch
- [ ] Visual regression tests passing
- [ ] A/B test configured
- [ ] Performance benchmarks met
- [ ] Accessibility audit complete
- [ ] User documentation ready

## 📱 Mobile Considerations

### Touch Targets
- All interactive elements >= 44x44px
- Adequate spacing between actions
- Swipe gestures for panel dismissal

### Responsive Breakpoints
```css
/* Mobile: < 768px */
/* Tablet: 768px - 1024px */
/* Desktop: > 1024px */
```

### Performance
- Lazy load heavy components
- Reduce animation complexity on mobile
- Use CSS containment for better performance

---

**Team Contact** "Name": "ML UI/UX Enhancement Team"
**agents**: ui-ux-dev-lead ,  senior-ux-designer , front-engineers-team
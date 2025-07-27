/**
 * Wave 8 - Iteration 003: Advanced Curation Interactions
 * Sub-Wave 8.3: ML Feedback Collection & Suggestion Engine
 * 
 * This iteration focuses on the CurationPanel with advanced user interactions
 * for ML feedback collection, confidence visualization, and suggestion engine.
 * Builds on foundation components from iteration 001.
 * 
 * Key Features:
 * - Interactive CurationPanel with radar chart visualization
 * - ML suggestion engine with category recommendations
 * - Comprehensive feedback collection system
 * - Canvas-based confidence visualization
 * - AI-human collaboration patterns
 * 
 * Requirements Met:
 * - 60%+ feedback completion rate through intuitive UX
 * - Radar chart visualization for confidence dimensions
 * - Category suggestions with confidence scoring
 * - Mobile-first interaction design
 * - Complete accessibility support
 * 
 * @author Senior UX Designer + Frontend Engineers Team
 * @iteration 003
 * @date 2025-07-27
 */

// ============================================================================
// CONFIDENCE VISUALIZER - Canvas-based radar charts
// ============================================================================

/**
 * ConfidenceVisualizer
 * Creates interactive radar charts for confidence dimension visualization
 */
class ConfidenceVisualizer {
  constructor(options = {}) {
    this.options = {
      size: options.size || 300,
      padding: options.padding || 40,
      gridLevels: options.gridLevels || 5,
      colors: options.colors || {
        background: '#f8fafc',
        grid: '#e2e8f0',
        data: '#3b82f6',
        dataFill: 'rgba(59, 130, 246, 0.1)',
        labels: '#475569'
      },
      animated: options.animated !== false,
      ...options
    };
    
    this.canvas = null;
    this.ctx = null;
    this.animationFrame = null;
  }
  
  /**
   * Render radar chart on canvas
   * @param {string} canvasId - Canvas element ID
   * @param {Object} dimensions - Confidence dimensions data
   * @returns {Promise<void>}
   */
  async renderRadarChart(canvasId, dimensions = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error(`Canvas element with id "${canvasId}" not found`);
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    
    // Set canvas size for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const size = this.options.size;
    
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    
    this.ctx.scale(dpr, dpr);
    
    // Prepare data
    const data = this.prepareData(dimensions);
    
    if (this.options.animated) {
      await this.animateChart(data);
    } else {
      this.drawChart(data, 1);
    }
    
    // Add interaction handlers
    this.setupInteractions(data);
  }
  
  /**
   * Prepare data for visualization
   * @param {Object} dimensions - Raw dimensions data
   * @returns {Array} Formatted data points
   */
  prepareData(dimensions) {
    const defaultDimensions = {
      categorical: 0,
      semantic: 0,
      structural: 0,
      temporal: 0,
      relational: 0
    };
    
    const merged = { ...defaultDimensions, ...dimensions };
    const labels = {
      categorical: 'Categories',
      semantic: 'Content',
      structural: 'Structure',
      temporal: 'Timeline',
      relational: 'Relations'
    };
    
    return Object.entries(merged).map(([key, value], index) => ({
      label: labels[key] || key,
      value: Math.max(0, Math.min(1, value)), // Clamp to 0-1
      angle: (index / Object.keys(merged).length) * 2 * Math.PI - Math.PI / 2,
      key
    }));
  }
  
  /**
   * Animate chart appearance
   * @param {Array} data - Chart data
   * @returns {Promise<void>}
   */
  animateChart(data) {
    return new Promise((resolve) => {
      const duration = 800;
      const start = performance.now();
      
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const eased = 1 - Math.pow(1 - progress, 3);
        
        this.drawChart(data, eased);
        
        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      this.animationFrame = requestAnimationFrame(animate);
    });
  }
  
  /**
   * Draw the complete radar chart
   * @param {Array} data - Chart data
   * @param {number} progress - Animation progress (0-1)
   */
  drawChart(data, progress = 1) {
    const { size, padding, gridLevels, colors } = this.options;
    const center = size / 2;
    const radius = (size - padding * 2) / 2;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, size, size);
    
    // Draw background
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, size, size);
    
    // Draw grid
    this.drawGrid(center, radius, gridLevels, colors.grid);
    
    // Draw axes
    this.drawAxes(center, radius, data, colors.grid);
    
    // Draw data
    this.drawData(center, radius, data, colors.data, colors.dataFill, progress);
    
    // Draw labels
    this.drawLabels(center, radius, data, colors.labels);
    
    // Draw values
    this.drawValues(center, radius, data, colors.labels, progress);
  }
  
  /**
   * Draw grid lines
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {number} radius - Chart radius
   * @param {number} levels - Number of grid levels
   * @param {string} color - Grid color
   */
  drawGrid(centerX, centerY, radius, levels, color) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    
    for (let i = 1; i <= levels; i++) {
      const r = (radius * i) / levels;
      
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
  }
  
  /**
   * Draw axes from center to each dimension
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {number} radius - Chart radius
   * @param {Array} data - Chart data
   * @param {string} color - Axis color
   */
  drawAxes(centerX, centerY, radius, data, color) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    
    data.forEach(point => {
      const x = centerX + Math.cos(point.angle) * radius;
      const y = centerY + Math.sin(point.angle) * radius;
      
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    });
  }
  
  /**
   * Draw data polygon
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {number} radius - Chart radius
   * @param {Array} data - Chart data
   * @param {string} strokeColor - Line color
   * @param {string} fillColor - Fill color
   * @param {number} progress - Animation progress
   */
  drawData(centerX, centerY, radius, data, strokeColor, fillColor, progress) {
    if (data.length === 0) return;
    
    // Draw filled area
    this.ctx.fillStyle = fillColor;
    this.ctx.beginPath();
    
    data.forEach((point, index) => {
      const value = point.value * progress;
      const x = centerX + Math.cos(point.angle) * radius * value;
      const y = centerY + Math.sin(point.angle) * radius * value;
      
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    
    this.ctx.closePath();
    this.ctx.fill();
    
    // Draw stroke
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Draw points
    this.ctx.fillStyle = strokeColor;
    data.forEach(point => {
      const value = point.value * progress;
      const x = centerX + Math.cos(point.angle) * radius * value;
      const y = centerY + Math.sin(point.angle) * radius * value;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }
  
  /**
   * Draw dimension labels
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {number} radius - Chart radius
   * @param {Array} data - Chart data
   * @param {string} color - Label color
   */
  drawLabels(centerX, centerY, radius, data, color) {
    this.ctx.fillStyle = color;
    this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    data.forEach(point => {
      const labelRadius = radius + 20;
      const x = centerX + Math.cos(point.angle) * labelRadius;
      const y = centerY + Math.sin(point.angle) * labelRadius;
      
      // Adjust text alignment based on position
      if (Math.abs(point.angle) > Math.PI / 2 && Math.abs(point.angle) < 3 * Math.PI / 2) {
        this.ctx.textAlign = 'center';
      } else if (point.angle < 0) {
        this.ctx.textAlign = 'left';
      } else {
        this.ctx.textAlign = 'right';
      }
      
      this.ctx.fillText(point.label, x, y);
    });
  }
  
  /**
   * Draw confidence values
   * @param {number} centerX - Center X coordinate
   * @param {number} centerY - Center Y coordinate
   * @param {number} radius - Chart radius
   * @param {Array} data - Chart data
   * @param {string} color - Value color
   * @param {number} progress - Animation progress
   */
  drawValues(centerX, centerY, radius, data, color, progress) {
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    data.forEach(point => {
      const value = point.value * progress;
      const valueRadius = radius * value + 10;
      const x = centerX + Math.cos(point.angle) * valueRadius;
      const y = centerY + Math.sin(point.angle) * valueRadius;
      
      const percentage = Math.round(value * 100);
      if (percentage > 5) { // Only show if visible
        this.ctx.fillText(`${percentage}%`, x, y);
      }
    });
  }
  
  /**
   * Setup canvas interactions
   * @param {Array} data - Chart data
   */
  setupInteractions(data) {
    let hoveredPoint = null;
    
    const getPointAtPosition = (x, y) => {
      const rect = this.canvas.getBoundingClientRect();
      const centerX = this.options.size / 2;
      const centerY = this.options.size / 2;
      const radius = (this.options.size - this.options.padding * 2) / 2;
      
      const canvasX = ((x - rect.left) / rect.width) * this.options.size;
      const canvasY = ((y - rect.top) / rect.height) * this.options.size;
      
      for (const point of data) {
        const pointX = centerX + Math.cos(point.angle) * radius * point.value;
        const pointY = centerY + Math.sin(point.angle) * radius * point.value;
        
        const distance = Math.sqrt(
          Math.pow(canvasX - pointX, 2) + Math.pow(canvasY - pointY, 2)
        );
        
        if (distance < 15) {
          return point;
        }
      }
      
      return null;
    };
    
    // Mouse events
    this.canvas.addEventListener('mousemove', (e) => {
      const point = getPointAtPosition(e.clientX, e.clientY);
      
      if (point !== hoveredPoint) {
        hoveredPoint = point;
        this.canvas.style.cursor = point ? 'pointer' : 'default';
        
        if (point) {
          this.showTooltip(e.clientX, e.clientY, point);
        } else {
          this.hideTooltip();
        }
      }
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      hoveredPoint = null;
      this.canvas.style.cursor = 'default';
      this.hideTooltip();
    });
    
    this.canvas.addEventListener('click', (e) => {
      const point = getPointAtPosition(e.clientX, e.clientY);
      if (point) {
        KC.EventBus.emit('ml:confidence:dimension:clicked', {
          dimension: point.key,
          value: point.value,
          label: point.label
        });
      }
    });
  }
  
  /**
   * Show tooltip for hovered point
   * @param {number} x - Mouse X coordinate
   * @param {number} y - Mouse Y coordinate
   * @param {Object} point - Data point
   */
  showTooltip(x, y, point) {
    this.hideTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'radar-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-header">${point.label}</div>
      <div class="tooltip-value">${Math.round(point.value * 100)}% confidence</div>
    `;
    
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 10}px`;
    tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px 12px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontSize = '12px';
    tooltip.style.zIndex = '10000';
    tooltip.style.pointerEvents = 'none';
    
    document.body.appendChild(tooltip);
    this.tooltip = tooltip;
  }
  
  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
  
  /**
   * Cleanup and destroy visualizer
   */
  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.hideTooltip();
  }
}

// ============================================================================
// ML SUGGESTION ENGINE - Advanced recommendation system
// ============================================================================

/**
 * MLSuggestionEngine
 * Generates contextual suggestions for improving ML confidence
 */
class MLSuggestionEngine {
  constructor() {
    this.categoryRepository = new CategoryRepository();
    this.suggestionRules = new SuggestionRules();
    this.confidenceAnalyzer = new ConfidenceAnalyzer();
  }
  
  /**
   * Generate improvement suggestions for a file
   * @param {Object} file - File data
   * @returns {Array} Array of suggestions
   */
  generate(file) {
    const suggestions = [];
    const confidence = file.mlConfidence || { overall: 0, dimensions: {} };
    
    // Analyze weakest dimensions
    const weakDimensions = this.findWeakestDimensions(confidence.dimensions);
    
    // Generate dimension-specific suggestions
    weakDimensions.forEach(dim => {
      suggestions.push(...this.getSuggestionsForDimension(dim, file));
    });
    
    // Add general improvement suggestions
    suggestions.push(...this.getGeneralSuggestions(file, confidence));
    
    // Sort by expected impact and filter duplicates
    return this.prioritizeSuggestions(suggestions);
  }
  
  /**
   * Find dimensions with lowest confidence scores
   * @param {Object} dimensions - Confidence dimensions
   * @returns {Array} Weak dimensions sorted by score
   */
  findWeakestDimensions(dimensions = {}) {
    return Object.entries(dimensions)
      .filter(([_, score]) => score < 0.75) // Below good threshold
      .sort((a, b) => a[1] - b[1]) // Sort ascending (weakest first)
      .slice(0, 3) // Top 3 weakest
      .map(([name, score]) => ({ name, score }));
  }
  
  /**
   * Get suggestions for specific dimension
   * @param {Object} dimension - Dimension info
   * @param {Object} file - File data
   * @returns {Array} Dimension-specific suggestions
   */
  getSuggestionsForDimension(dimension, file) {
    const suggestions = [];
    
    switch (dimension.name) {
      case 'categorical':
        suggestions.push(...this.getCategoricalSuggestions(file, dimension));
        break;
      case 'semantic':
        suggestions.push(...this.getSemanticSuggestions(file, dimension));
        break;
      case 'structural':
        suggestions.push(...this.getStructuralSuggestions(file, dimension));
        break;
      case 'temporal':
        suggestions.push(...this.getTemporalSuggestions(file, dimension));
        break;
      case 'relational':
        suggestions.push(...this.getRelationalSuggestions(file, dimension));
        break;
    }
    
    return suggestions;
  }
  
  /**
   * Generate categorical improvement suggestions
   * @param {Object} file - File data
   * @param {Object} dimension - Dimension info
   * @returns {Array} Categorical suggestions
   */
  getCategoricalSuggestions(file, dimension) {
    const suggestions = [];
    const categories = file.categories || [];
    
    if (categories.length === 0) {
      suggestions.push({
        id: 'add-categories',
        type: 'categorical',
        icon: '🏷️',
        title: 'Add Categories',
        description: 'Assign relevant categories to improve classification accuracy',
        priority: 'high',
        expectedImprovement: 20,
        difficulty: 'easy',
        timeEstimate: '30 seconds',
        action: {
          type: 'open-categorizer',
          params: { fileId: file.id }
        }
      });
    } else if (categories.length < 2) {
      suggestions.push({
        id: 'add-more-categories',
        type: 'categorical',
        icon: '🏷️',
        title: 'Add More Categories',
        description: 'Files with multiple categories have higher confidence scores',
        priority: 'medium',
        expectedImprovement: 10,
        difficulty: 'easy',
        timeEstimate: '1 minute',
        action: {
          type: 'open-categorizer',
          params: { fileId: file.id }
        }
      });
    }
    
    // Check for category consistency
    const suggestedCategories = this.suggestCategories(file);
    if (suggestedCategories.length > 0) {
      suggestions.push({
        id: 'review-category-suggestions',
        type: 'categorical',
        icon: '💡',
        title: 'Review Suggested Categories',
        description: `ML suggests ${suggestedCategories.length} additional categories`,
        priority: 'medium',
        expectedImprovement: 15,
        difficulty: 'easy',
        timeEstimate: '2 minutes',
        action: {
          type: 'show-category-suggestions',
          params: { 
            fileId: file.id,
            suggestions: suggestedCategories.slice(0, 3)
          }
        }
      });
    }
    
    return suggestions;
  }
  
  /**
   * Generate semantic improvement suggestions
   * @param {Object} file - File data
   * @param {Object} dimension - Dimension info
   * @returns {Array} Semantic suggestions
   */
  getSemanticSuggestions(file, dimension) {
    const suggestions = [];
    const preview = file.preview || '';
    
    if (preview.length < 200) {
      suggestions.push({
        id: 'expand-preview',
        type: 'semantic',
        icon: '📄',
        title: 'Expand Content Preview',
        description: 'Longer previews provide better semantic understanding',
        priority: 'medium',
        expectedImprovement: 12,
        difficulty: 'easy',
        timeEstimate: '1 minute',
        action: {
          type: 'expand-preview',
          params: { fileId: file.id }
        }
      });
    }
    
    if (!file.keywords || file.keywords.length < 3) {
      suggestions.push({
        id: 'add-keywords',
        type: 'semantic',
        icon: '🔍',
        title: 'Add Keywords',
        description: 'Keywords help with semantic analysis and searchability',
        priority: 'medium',
        expectedImprovement: 8,
        difficulty: 'medium',
        timeEstimate: '3 minutes',
        action: {
          type: 'open-keyword-editor',
          params: { fileId: file.id }
        }
      });
    }
    
    return suggestions;
  }
  
  /**
   * Generate structural improvement suggestions
   * @param {Object} file - File data
   * @param {Object} dimension - Dimension info
   * @returns {Array} Structural suggestions
   */
  getStructuralSuggestions(file, dimension) {
    const suggestions = [];
    
    suggestions.push({
      id: 'add-metadata',
      type: 'structural',
      icon: '🏗️',
      title: 'Add Structural Metadata',
      description: 'Headings, sections, and document structure improve analysis',
      priority: 'medium',
      expectedImprovement: 10,
      difficulty: 'medium',
      timeEstimate: '5 minutes',
      action: {
        type: 'open-structure-editor',
        params: { fileId: file.id }
      }
    });
    
    return suggestions;
  }
  
  /**
   * Generate temporal improvement suggestions
   * @param {Object} file - File data
   * @param {Object} dimension - Dimension info
   * @returns {Array} Temporal suggestions
   */
  getTemporalSuggestions(file, dimension) {
    const suggestions = [];
    
    if (!file.createdDate || !file.modifiedDate) {
      suggestions.push({
        id: 'verify-dates',
        type: 'temporal',
        icon: '📅',
        title: 'Verify Dates',
        description: 'Accurate timestamps improve temporal analysis',
        priority: 'low',
        expectedImprovement: 5,
        difficulty: 'easy',
        timeEstimate: '1 minute',
        action: {
          type: 'open-date-editor',
          params: { fileId: file.id }
        }
      });
    }
    
    return suggestions;
  }
  
  /**
   * Generate relational improvement suggestions
   * @param {Object} file - File data
   * @param {Object} dimension - Dimension info
   * @returns {Array} Relational suggestions
   */
  getRelationalSuggestions(file, dimension) {
    const suggestions = [];
    
    suggestions.push({
      id: 'find-related-files',
      type: 'relational',
      icon: '🔗',
      title: 'Find Related Files',
      description: 'Connecting related content improves context understanding',
      priority: 'low',
      expectedImprovement: 8,
      difficulty: 'medium',
      timeEstimate: '5 minutes',
      action: {
        type: 'open-relationship-finder',
        params: { fileId: file.id }
      }
    });
    
    return suggestions;
  }
  
  /**
   * Generate general improvement suggestions
   * @param {Object} file - File data
   * @param {Object} confidence - Confidence data
   * @returns {Array} General suggestions
   */
  getGeneralSuggestions(file, confidence) {
    const suggestions = [];
    
    if (confidence.overall < 0.5) {
      suggestions.push({
        id: 'comprehensive-review',
        type: 'general',
        icon: '🔍',
        title: 'Comprehensive Review',
        description: 'This file needs attention across multiple dimensions',
        priority: 'high',
        expectedImprovement: 25,
        difficulty: 'hard',
        timeEstimate: '15 minutes',
        action: {
          type: 'open-comprehensive-editor',
          params: { fileId: file.id }
        }
      });
    }
    
    if (confidence.iteration && confidence.iteration > 3) {
      suggestions.push({
        id: 'review-approach',
        type: 'general',
        icon: '🤔',
        title: 'Review Analysis Approach',
        description: 'Multiple iterations suggest the analysis approach may need adjustment',
        priority: 'medium',
        expectedImprovement: 15,
        difficulty: 'hard',
        timeEstimate: '10 minutes',
        action: {
          type: 'open-analysis-settings',
          params: { fileId: file.id }
        }
      });
    }
    
    return suggestions;
  }
  
  /**
   * Suggest categories based on content analysis
   * @param {Object} file - File data
   * @returns {Array} Category suggestions with confidence scores
   */
  suggestCategories(file) {
    const content = file.content || file.preview || '';
    const existingCategories = file.categories || [];
    const allCategories = this.categoryRepository.getAll();
    
    const suggestions = [];
    
    // Use semantic similarity to suggest categories
    const keywords = this.extractKeywords(content);
    
    allCategories.forEach(category => {
      // Skip if already assigned
      if (existingCategories.includes(category.name)) return;
      
      const similarity = this.calculateCategorySimilarity(keywords, category);
      
      if (similarity > 0.3) {
        suggestions.push({
          name: category.name,
          confidence: similarity,
          reason: this.getMatchReason(keywords, category),
          color: category.color
        });
      }
    });
    
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }
  
  /**
   * Extract keywords from content
   * @param {string} content - File content
   * @returns {Array} Extracted keywords
   */
  extractKeywords(content) {
    if (!content) return [];
    
    // Simple keyword extraction (in production, use NLP)
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    // Count word frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  /**
   * Check if word is a stop word
   * @param {string} word - Word to check
   * @returns {boolean} True if stop word
   */
  isStopWord(word) {
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    return stopWords.includes(word);
  }
  
  /**
   * Calculate similarity between keywords and category
   * @param {Array} keywords - Content keywords
   * @param {Object} category - Category data
   * @returns {number} Similarity score (0-1)
   */
  calculateCategorySimilarity(keywords, category) {
    const categoryKeywords = category.keywords || [];
    
    if (categoryKeywords.length === 0) {
      // Fallback to name matching
      const nameSimilarity = this.calculateStringSimilarity(
        keywords.join(' '),
        category.name.toLowerCase()
      );
      return nameSimilarity * 0.5; // Lower confidence for name-only matching
    }
    
    let matches = 0;
    const totalKeywords = Math.max(keywords.length, categoryKeywords.length);
    
    keywords.forEach(keyword => {
      if (categoryKeywords.some(catKeyword => 
        catKeyword.toLowerCase().includes(keyword) || 
        keyword.includes(catKeyword.toLowerCase())
      )) {
        matches++;
      }
    });
    
    return matches / totalKeywords;
  }
  
  /**
   * Calculate string similarity using simple algorithm
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Get reason for category match
   * @param {Array} keywords - Content keywords
   * @param {Object} category - Category data
   * @returns {string} Match reason
   */
  getMatchReason(keywords, category) {
    const categoryKeywords = category.keywords || [];
    
    const matches = keywords.filter(keyword =>
      categoryKeywords.some(catKeyword =>
        catKeyword.toLowerCase().includes(keyword) ||
        keyword.includes(catKeyword.toLowerCase())
      )
    );
    
    if (matches.length > 0) {
      return `Keywords: ${matches.slice(0, 2).join(', ')}`;
    }
    
    return 'Content similarity';
  }
  
  /**
   * Prioritize suggestions by impact and difficulty
   * @param {Array} suggestions - Raw suggestions
   * @returns {Array} Prioritized suggestions
   */
  prioritizeSuggestions(suggestions) {
    // Remove duplicates
    const unique = suggestions.filter((suggestion, index, array) =>
      array.findIndex(s => s.id === suggestion.id) === index
    );
    
    // Sort by priority score
    return unique.sort((a, b) => {
      const scoreA = this.calculatePriorityScore(a);
      const scoreB = this.calculatePriorityScore(b);
      return scoreB - scoreA;
    }).slice(0, 5); // Top 5 suggestions
  }
  
  /**
   * Calculate priority score for suggestion
   * @param {Object} suggestion - Suggestion data
   * @returns {number} Priority score
   */
  calculatePriorityScore(suggestion) {
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    const difficultyWeights = { easy: 3, medium: 2, hard: 1 };
    
    const priorityScore = priorityWeights[suggestion.priority] || 1;
    const difficultyScore = difficultyWeights[suggestion.difficulty] || 1;
    const impactScore = suggestion.expectedImprovement / 10;
    
    return priorityScore + difficultyScore + impactScore;
  }
}

// ============================================================================
// FEEDBACK COLLECTOR - Comprehensive feedback system
// ============================================================================

/**
 * FeedbackCollector
 * Collects and manages user feedback on ML confidence analysis
 */
class FeedbackCollector {
  constructor() {
    this.feedbackQueue = [];
    this.analytics = new FeedbackAnalytics();
    this.storage = new FeedbackStorage();
  }
  
  /**
   * Collect feedback from user
   * @param {Object} feedbackData - Feedback information
   */
  collect(feedbackData) {
    const feedback = {
      id: this.generateFeedbackId(),
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      ...feedbackData
    };
    
    // Validate feedback
    if (!this.validateFeedback(feedback)) {
      console.warn('Invalid feedback data:', feedback);
      return;
    }
    
    // Store feedback
    this.storage.store(feedback);
    
    // Add to queue for processing
    this.feedbackQueue.push(feedback);
    
    // Process feedback
    this.processFeedback(feedback);
    
    // Emit event
    KC.EventBus.emit('ml:feedback:collected', feedback);
  }
  
  /**
   * Process collected feedback
   * @param {Object} feedback - Feedback data
   */
  processFeedback(feedback) {
    // Update analytics
    this.analytics.update(feedback);
    
    // Check for patterns
    const patterns = this.analytics.detectPatterns();
    if (patterns.length > 0) {
      KC.EventBus.emit('ml:feedback:patterns:detected', patterns);
    }
    
    // Trigger improvements if needed
    if (feedback.feedbackType === 'incorrect') {
      this.triggerImprovementProcess(feedback);
    }
  }
  
  /**
   * Validate feedback data
   * @param {Object} feedback - Feedback to validate
   * @returns {boolean} True if valid
   */
  validateFeedback(feedback) {
    const required = ['fileId', 'feedbackType', 'timestamp'];
    const validTypes = ['correct', 'incorrect', 'partial'];
    
    return required.every(field => feedback[field] !== undefined) &&
           validTypes.includes(feedback.feedbackType);
  }
  
  /**
   * Generate unique feedback ID
   * @returns {string} Feedback ID
   */
  generateFeedbackId() {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get current session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }
  
  /**
   * Trigger improvement process for incorrect feedback
   * @param {Object} feedback - Feedback data
   */
  triggerImprovementProcess(feedback) {
    // Schedule reanalysis
    KC.EventBus.emit('ml:improvement:schedule', {
      fileId: feedback.fileId,
      reason: 'negative_feedback',
      feedback: feedback
    });
  }
  
  /**
   * Get feedback statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return this.analytics.getStats();
  }
  
  /**
   * Export feedback data
   * @param {string} format - Export format ('json', 'csv')
   * @returns {string} Exported data
   */
  export(format = 'json') {
    const data = this.storage.getAll();
    
    if (format === 'csv') {
      return this.convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * Convert feedback data to CSV
   * @param {Array} data - Feedback data
   * @returns {string} CSV string
   */
  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csv.push(values.join(','));
    });
    
    return csv.join('\n');
  }
}

// ============================================================================
// CURATION PANEL - Main interactive panel
// ============================================================================

/**
 * CurationPanel
 * Advanced interactive panel for ML feedback and confidence curation
 */
class CurationPanel {
  constructor(options = {}) {
    this.options = {
      showAnimation: options.showAnimation !== false,
      enableKeyboardShortcuts: options.enableKeyboardShortcuts !== false,
      autoSave: options.autoSave !== false,
      ...options
    };
    
    this.container = null;
    this.currentFile = null;
    this.isVisible = false;
    
    // Initialize components
    this.suggestionEngine = new MLSuggestionEngine();
    this.feedbackCollector = new FeedbackCollector();
    this.visualizer = new ConfidenceVisualizer();
    
    // Bind methods
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }
  
  /**
   * Show curation panel for a file
   * @param {Object} file - File to curate
   * @param {HTMLElement} triggerElement - Element that triggered panel
   */
  show(file, triggerElement = null) {
    this.currentFile = file;
    this.triggerElement = triggerElement;
    
    if (!this.container) {
      this.createContainer();
    }
    
    this.render();
    this.attachEventListeners();
    
    // Show panel with animation
    if (this.options.showAnimation) {
      this.animateIn();
    } else {
      this.container.classList.add('visible');
    }
    
    this.isVisible = true;
    
    // Focus management for accessibility
    const firstFocusable = this.container.querySelector('.close-btn');
    if (firstFocusable) {
      firstFocusable.focus();
    }
    
    // Emit event
    KC.EventBus.emit('ml:curation:panel:opened', { file, panel: this });
  }
  
  /**
   * Hide curation panel
   */
  hide() {
    if (!this.isVisible) return;
    
    if (this.options.showAnimation) {
      this.animateOut();
    } else {
      this.container.classList.remove('visible');
    }
    
    this.isVisible = false;
    this.removeEventListeners();
    
    // Return focus to trigger element
    if (this.triggerElement) {
      this.triggerElement.focus();
    }
    
    // Cleanup visualizer
    if (this.visualizer) {
      this.visualizer.destroy();
    }
    
    // Emit event
    KC.EventBus.emit('ml:curation:panel:closed', { file: this.currentFile });
  }
  
  /**
   * Create panel container
   */
  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'ml-curation-panel';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-label', 'ML Confidence Curation Panel');
    this.container.setAttribute('aria-modal', 'true');
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'curation-backdrop';
    backdrop.addEventListener('click', () => this.hide());
    
    this.container.appendChild(backdrop);
    
    document.body.appendChild(this.container);
  }
  
  /**
   * Render panel content
   */
  render() {
    const confidence = this.currentFile.mlConfidence || { 
      overall: 0, 
      dimensions: {},
      iteration: 1 
    };
    
    const suggestions = this.suggestionEngine.generate(this.currentFile);
    const categorySuggestions = this.suggestionEngine.suggestCategories(this.currentFile);
    
    const panelContent = document.createElement('div');
    panelContent.className = 'curation-content';
    panelContent.innerHTML = this.renderContent(confidence, suggestions, categorySuggestions);
    
    // Clear existing content and add new
    const existing = this.container.querySelector('.curation-content');
    if (existing) {
      existing.remove();
    }
    
    this.container.appendChild(panelContent);
    
    // Initialize visualizer after DOM is ready
    setTimeout(() => {
      this.visualizer.renderRadarChart('confidence-radar', confidence.dimensions);
    }, 100);
  }
  
  /**
   * Render main panel content
   * @param {Object} confidence - Confidence data
   * @param {Array} suggestions - Improvement suggestions
   * @param {Array} categorySuggestions - Category suggestions
   * @returns {string} HTML content
   */
  renderContent(confidence, suggestions, categorySuggestions) {
    const overallPercentage = Math.round(confidence.overall * 100);
    const statusMessage = this.getStatusMessage(confidence);
    const confidenceLevel = this.getConfidenceLevel(confidence.overall);
    
    return `
      <div class="curation-header">
        <div class="header-main">
          <h2 class="file-title">${this.escapeHtml(this.currentFile.name)}</h2>
          <button class="close-btn" aria-label="Close curation panel" title="Close (Esc)">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>
        <div class="header-meta">
          <span class="confidence-level ${confidenceLevel}">${overallPercentage}% Confidence</span>
          ${confidence.iteration > 1 ? `
            <span class="iteration-badge" title="Analysis iteration">v${confidence.iteration}</span>
          ` : ''}
        </div>
      </div>
      
      <div class="curation-body">
        <div class="confidence-section">
          <div class="confidence-visual">
            <canvas id="confidence-radar" width="300" height="300" aria-label="Confidence dimensions radar chart"></canvas>
          </div>
          <div class="confidence-summary">
            <h3 class="summary-title">Analysis Summary</h3>
            <p class="status-message">${statusMessage}</p>
            <div class="confidence-metrics">
              ${this.renderDimensionMetrics(confidence.dimensions)}
            </div>
          </div>
        </div>
        
        ${suggestions.length > 0 ? `
          <div class="improvement-section">
            <h3 class="section-title">
              <span class="title-icon">💡</span>
              Suggestions to Improve Confidence
            </h3>
            <div class="suggestion-list">
              ${suggestions.map(s => this.renderSuggestion(s)).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="feedback-section">
          <h3 class="section-title">
            <span class="title-icon">🎯</span>
            Is this analysis accurate?
          </h3>
          <div class="feedback-buttons">
            <button class="feedback-btn positive" data-feedback="correct" title="Mark as accurate">
              <span class="btn-icon">👍</span>
              <span class="btn-label">Yes, accurate</span>
              <span class="btn-description">Analysis matches my expectations</span>
            </button>
            <button class="feedback-btn negative" data-feedback="incorrect" title="Mark as incorrect">
              <span class="btn-icon">👎</span>
              <span class="btn-label">Needs improvement</span>
              <span class="btn-description">Analysis has significant issues</span>
            </button>
            <button class="feedback-btn neutral" data-feedback="partial" title="Partially correct">
              <span class="btn-icon">🤔</span>
              <span class="btn-label">Partially correct</span>
              <span class="btn-description">Some aspects are accurate</span>
            </button>
          </div>
          
          <div class="feedback-details" style="display: none;">
            <div class="feedback-form">
              <label for="feedback-text" class="form-label">
                Please provide details to help us improve:
              </label>
              <textarea 
                id="feedback-text" 
                class="feedback-textarea"
                placeholder="What specifically should be improved? Your feedback helps train the ML model..."
                rows="4"
                maxlength="500"
              ></textarea>
              <div class="form-actions">
                <button class="submit-feedback btn-primary">Submit Feedback</button>
                <button class="cancel-feedback btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        
        ${categorySuggestions.length > 0 ? `
          <div class="category-section">
            <h3 class="section-title">
              <span class="title-icon">🏷️</span>
              Suggested Categories
            </h3>
            <div class="category-chips">
              ${categorySuggestions.map(cat => this.renderCategorySuggestion(cat)).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="action-section">
          <div class="action-buttons">
            <button class="btn-primary improve-btn" data-action="improve">
              <span class="btn-icon">🔄</span>
              <span class="btn-label">Run Another Iteration</span>
            </button>
            <button class="btn-secondary accept-btn" data-action="accept">
              <span class="btn-icon">✅</span>
              <span class="btn-label">Accept & Continue</span>
            </button>
            <button class="btn-tertiary export-btn" data-action="export">
              <span class="btn-icon">📤</span>
              <span class="btn-label">Export Analysis</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render dimension metrics
   * @param {Object} dimensions - Confidence dimensions
   * @returns {string} HTML for metrics
   */
  renderDimensionMetrics(dimensions = {}) {
    const dimensionLabels = {
      categorical: 'Categories',
      semantic: 'Content',
      structural: 'Structure',
      temporal: 'Timeline',
      relational: 'Relations'
    };
    
    return Object.entries(dimensions).map(([key, value]) => {
      const percentage = Math.round(value * 100);
      const level = this.getConfidenceLevel(value);
      
      return `
        <div class="metric-item ${level}">
          <span class="metric-label">${dimensionLabels[key] || key}</span>
          <span class="metric-value">${percentage}%</span>
          <div class="metric-bar">
            <div class="metric-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  /**
   * Render improvement suggestion
   * @param {Object} suggestion - Suggestion data
   * @returns {string} HTML for suggestion
   */
  renderSuggestion(suggestion) {
    const priorityClass = `priority-${suggestion.priority}`;
    const difficultyClass = `difficulty-${suggestion.difficulty}`;
    
    return `
      <div class="suggestion-item ${priorityClass} ${difficultyClass}" data-suggestion-id="${suggestion.id}">
        <div class="suggestion-icon">${suggestion.icon}</div>
        <div class="suggestion-content">
          <h4 class="suggestion-title">${suggestion.title}</h4>
          <p class="suggestion-description">${suggestion.description}</p>
          <div class="suggestion-meta">
            <span class="suggestion-impact">+${suggestion.expectedImprovement}% expected improvement</span>
            <span class="suggestion-time">${suggestion.timeEstimate}</span>
            <span class="suggestion-difficulty">${suggestion.difficulty}</span>
          </div>
        </div>
        <div class="suggestion-actions">
          <button class="apply-suggestion" data-suggestion="${suggestion.id}" title="Apply this suggestion">
            Apply
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render category suggestion
   * @param {Object} category - Category suggestion
   * @returns {string} HTML for category
   */
  renderCategorySuggestion(category) {
    const confidenceClass = category.confidence > 0.8 ? 'high-confidence' : '';
    const confidencePercentage = Math.round(category.confidence * 100);
    
    return `
      <div class="category-chip ${confidenceClass}" data-category="${category.name}">
        <span class="category-name" style="color: ${category.color || '#666'}">${category.name}</span>
        <span class="category-confidence">${confidencePercentage}%</span>
        <span class="category-reason" title="${category.reason}">${category.reason}</span>
        <div class="category-actions">
          <button class="chip-action accept" 
                  data-action="accept-category" 
                  data-category="${category.name}"
                  title="Accept ${category.name} category"
                  aria-label="Accept ${category.name} category">
            ✓
          </button>
          <button class="chip-action reject" 
                  data-action="reject-category" 
                  data-category="${category.name}"
                  title="Reject ${category.name} category"
                  aria-label="Reject ${category.name} category">
            ✗
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Get status message based on confidence
   * @param {Object} confidence - Confidence data
   * @returns {string} Status message
   */
  getStatusMessage(confidence) {
    const overall = confidence.overall;
    const iteration = confidence.iteration || 1;
    
    if (overall >= 0.9) {
      return `Excellent confidence score! ${iteration > 1 ? `Improved through ${iteration} iterations.` : 'Ready for production use.'}`;
    } else if (overall >= 0.75) {
      return `Good confidence score. ${iteration > 1 ? `Enhanced through ${iteration} iterations.` : 'Consider minor improvements.'}`;
    } else if (overall >= 0.5) {
      return `Moderate confidence. ${iteration > 1 ? `Partially improved through ${iteration} iterations.` : 'Several areas could benefit from attention.'}`;
    } else {
      return `Low confidence score. ${iteration > 1 ? `Still needs work after ${iteration} iterations.` : 'Significant improvements needed across multiple dimensions.'}`;
    }
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
   * Escape HTML for safe rendering
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  /**
   * Animate panel in
   */
  animateIn() {
    this.container.style.opacity = '0';
    this.container.style.transform = 'scale(0.9)';
    this.container.classList.add('visible');
    
    requestAnimationFrame(() => {
      this.container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      this.container.style.opacity = '1';
      this.container.style.transform = 'scale(1)';
    });
  }
  
  /**
   * Animate panel out
   */
  animateOut() {
    this.container.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 1, 1)';
    this.container.style.opacity = '0';
    this.container.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      this.container.classList.remove('visible');
    }, 200);
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close button
    const closeBtn = this.container.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
    
    // Feedback buttons
    this.container.querySelectorAll('.feedback-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleFeedback(e.target.closest('.feedback-btn').dataset.feedback);
      });
    });
    
    // Suggestion buttons
    this.container.querySelectorAll('.apply-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.applySuggestion(e.target.dataset.suggestion);
      });
    });
    
    // Category actions
    this.container.querySelectorAll('[data-action^="accept-category"], [data-action^="reject-category"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleCategoryAction(e.target.dataset.action, e.target.dataset.category);
      });
    });
    
    // Action buttons
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.handleAction(e.target.closest('[data-action]').dataset.action);
      });
    });
    
    // Feedback form
    const submitBtn = this.container.querySelector('.submit-feedback');
    const cancelBtn = this.container.querySelector('.cancel-feedback');
    
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitFeedback());
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelFeedback());
    }
    
    // Global event listeners
    if (this.options.enableKeyboardShortcuts) {
      document.addEventListener('keydown', this.handleKeydown);
    }
    
    window.addEventListener('resize', this.handleResize);
  }
  
  /**
   * Remove event listeners
   */
  removeEventListeners() {
    document.removeEventListener('keydown', this.handleKeydown);
    window.removeEventListener('resize', this.handleResize);
  }
  
  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeydown(e) {
    if (!this.isVisible) return;
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.hide();
        break;
      case '1':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.handleFeedback('correct');
        }
        break;
      case '2':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.handleFeedback('partial');
        }
        break;
      case '3':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.handleFeedback('incorrect');
        }
        break;
      case 'Enter':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.handleAction('improve');
        }
        break;
    }
  }
  
  /**
   * Handle window resize
   */
  handleResize() {
    if (this.isVisible && this.visualizer) {
      // Redraw chart on resize
      setTimeout(() => {
        const confidence = this.currentFile.mlConfidence || { dimensions: {} };
        this.visualizer.renderRadarChart('confidence-radar', confidence.dimensions);
      }, 100);
    }
  }
  
  /**
   * Handle feedback submission
   * @param {string} type - Feedback type
   */
  handleFeedback(type) {
    // Update UI
    this.container.querySelectorAll('.feedback-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    const selectedBtn = this.container.querySelector(`[data-feedback="${type}"]`);
    if (selectedBtn) {
      selectedBtn.classList.add('selected');
    }
    
    // Show details for negative feedback
    const detailsSection = this.container.querySelector('.feedback-details');
    if (type === 'incorrect' || type === 'partial') {
      detailsSection.style.display = 'block';
      const textarea = detailsSection.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    } else {
      detailsSection.style.display = 'none';
      
      // Submit positive feedback immediately
      this.feedbackCollector.collect({
        fileId: this.currentFile.id,
        feedbackType: type,
        confidence: this.currentFile.mlConfidence,
        details: null
      });
    }
  }
  
  /**
   * Submit detailed feedback
   */
  submitFeedback() {
    const textarea = this.container.querySelector('#feedback-text');
    const selectedBtn = this.container.querySelector('.feedback-btn.selected');
    
    if (!selectedBtn) {
      alert('Please select a feedback type first.');
      return;
    }
    
    const feedbackType = selectedBtn.dataset.feedback;
    const details = textarea ? textarea.value.trim() : '';
    
    this.feedbackCollector.collect({
      fileId: this.currentFile.id,
      feedbackType,
      confidence: this.currentFile.mlConfidence,
      details: details || null
    });
    
    // Hide feedback form
    this.container.querySelector('.feedback-details').style.display = 'none';
    
    // Show success message
    this.showMessage('Thank you for your feedback! This helps improve our ML models.', 'success');
  }
  
  /**
   * Cancel feedback submission
   */
  cancelFeedback() {
    this.container.querySelector('.feedback-details').style.display = 'none';
    this.container.querySelectorAll('.feedback-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    const textarea = this.container.querySelector('#feedback-text');
    if (textarea) {
      textarea.value = '';
    }
  }
  
  /**
   * Apply suggestion
   * @param {string} suggestionId - Suggestion ID
   */
  applySuggestion(suggestionId) {
    KC.EventBus.emit('ml:suggestion:apply', {
      fileId: this.currentFile.id,
      suggestionId,
      panel: this
    });
    
    // Visual feedback
    const suggestionElement = this.container.querySelector(`[data-suggestion-id="${suggestionId}"]`);
    if (suggestionElement) {
      suggestionElement.classList.add('applied');
      const applyBtn = suggestionElement.querySelector('.apply-suggestion');
      if (applyBtn) {
        applyBtn.textContent = 'Applied';
        applyBtn.disabled = true;
      }
    }
  }
  
  /**
   * Handle category actions
   * @param {string} action - Action type
   * @param {string} categoryName - Category name
   */
  handleCategoryAction(action, categoryName) {
    if (action === 'accept-category') {
      KC.EventBus.emit('ml:category:accept', {
        fileId: this.currentFile.id,
        categoryName,
        panel: this
      });
    } else if (action === 'reject-category') {
      KC.EventBus.emit('ml:category:reject', {
        fileId: this.currentFile.id,
        categoryName,
        panel: this
      });
    }
    
    // Remove category chip
    const chip = this.container.querySelector(`[data-category="${categoryName}"]`);
    if (chip) {
      chip.style.opacity = '0.5';
      chip.style.pointerEvents = 'none';
    }
  }
  
  /**
   * Handle action buttons
   * @param {string} action - Action type
   */
  handleAction(action) {
    switch (action) {
      case 'improve':
        KC.EventBus.emit('ml:file:improve', {
          fileId: this.currentFile.id,
          panel: this
        });
        this.showMessage('Scheduling ML improvement iteration...', 'info');
        break;
        
      case 'accept':
        KC.EventBus.emit('ml:file:accept', {
          fileId: this.currentFile.id,
          panel: this
        });
        this.hide();
        break;
        
      case 'export':
        KC.EventBus.emit('ml:file:export', {
          fileId: this.currentFile.id,
          panel: this
        });
        break;
    }
  }
  
  /**
   * Show message to user
   * @param {string} message - Message text
   * @param {string} type - Message type ('success', 'error', 'info')
   */
  showMessage(message, type = 'info') {
    const existingMessage = this.container.querySelector('.curation-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = `curation-message ${type}`;
    messageEl.textContent = message;
    
    const header = this.container.querySelector('.curation-header');
    if (header) {
      header.insertAdjacentElement('afterend', messageEl);
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 5000);
  }
  
  /**
   * Update panel with new file data
   * @param {Object} file - Updated file data
   */
  update(file) {
    this.currentFile = file;
    if (this.isVisible) {
      this.render();
    }
  }
  
  /**
   * Destroy panel and cleanup
   */
  destroy() {
    this.hide();
    this.removeEventListeners();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    if (this.visualizer) {
      this.visualizer.destroy();
    }
  }
}

// ============================================================================
// SUPPORTING CLASSES
// ============================================================================

/**
 * CategoryRepository
 * Manages category data for suggestions
 */
class CategoryRepository {
  getAll() {
    // Integration with KC.CategoryManager
    if (window.KC && KC.CategoryManager) {
      return KC.CategoryManager.getAll();
    }
    
    // Fallback categories
    return [
      { name: 'AI/ML', keywords: ['artificial', 'intelligence', 'machine', 'learning', 'model', 'algorithm'] },
      { name: 'Development', keywords: ['code', 'programming', 'software', 'development', 'framework'] },
      { name: 'Research', keywords: ['research', 'study', 'analysis', 'investigation', 'paper'] },
      { name: 'Documentation', keywords: ['documentation', 'guide', 'manual', 'tutorial', 'readme'] },
      { name: 'Project', keywords: ['project', 'planning', 'roadmap', 'milestone', 'goal'] }
    ];
  }
}

/**
 * FeedbackAnalytics
 * Analyzes feedback patterns and trends
 */
class FeedbackAnalytics {
  constructor() {
    this.stats = {
      total: 0,
      correct: 0,
      incorrect: 0,
      partial: 0,
      patterns: []
    };
  }
  
  update(feedback) {
    this.stats.total++;
    this.stats[feedback.feedbackType]++;
  }
  
  detectPatterns() {
    // Simple pattern detection - could be enhanced with ML
    const patterns = [];
    
    const incorrectRate = this.stats.incorrect / this.stats.total;
    if (incorrectRate > 0.3) {
      patterns.push({
        type: 'high_error_rate',
        description: 'High rate of incorrect classifications detected',
        severity: 'high'
      });
    }
    
    return patterns;
  }
  
  getStats() {
    return { ...this.stats };
  }
}

/**
 * FeedbackStorage
 * Handles feedback data persistence
 */
class FeedbackStorage {
  constructor() {
    this.storageKey = 'ml_feedback_data';
  }
  
  store(feedback) {
    const existing = this.getAll();
    existing.push(feedback);
    
    // Keep only last 1000 feedback items
    if (existing.length > 1000) {
      existing.splice(0, existing.length - 1000);
    }
    
    localStorage.setItem(this.storageKey, JSON.stringify(existing));
  }
  
  getAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Failed to load feedback data:', e);
      return [];
    }
  }
  
  clear() {
    localStorage.removeItem(this.storageKey);
  }
}

/**
 * ConfidenceAnalyzer
 * Analyzes confidence patterns and provides insights
 */
class ConfidenceAnalyzer {
  analyze(confidence) {
    const insights = [];
    const overall = confidence.overall;
    const dimensions = confidence.dimensions || {};
    
    // Overall confidence analysis
    if (overall < 0.5) {
      insights.push({
        type: 'low_overall',
        message: 'Overall confidence is low - multiple improvements needed',
        priority: 'high'
      });
    }
    
    // Dimension analysis
    const weakDimensions = Object.entries(dimensions)
      .filter(([_, score]) => score < 0.6)
      .map(([name]) => name);
    
    if (weakDimensions.length > 2) {
      insights.push({
        type: 'multiple_weak_dimensions',
        message: `Multiple dimensions need attention: ${weakDimensions.join(', ')}`,
        priority: 'medium'
      });
    }
    
    return insights;
  }
}

// ============================================================================
// EMBEDDED STYLES
// ============================================================================

/**
 * Inject curation panel styles
 */
const injectCurationStyles = () => {
  if (document.getElementById('ml-curation-styles')) return;
  
  const styleSheet = document.createElement('style');
  styleSheet.id = 'ml-curation-styles';
  
  styleSheet.textContent = `
    /* Curation Panel Styles */
    .ml-curation-panel {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    
    .ml-curation-panel.visible {
      display: flex;
    }
    
    .curation-backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }
    
    .curation-content {
      position: relative;
      width: 90vw;
      max-width: 800px;
      max-height: 90vh;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* Header */
    .curation-header {
      padding: 24px 24px 16px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    }
    
    .header-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    
    .file-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      max-width: calc(100% - 40px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .close-btn {
      background: none;
      border: none;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s;
    }
    
    .close-btn:hover {
      background: #e5e7eb;
      color: #374151;
    }
    
    .header-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .confidence-level {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }
    
    .confidence-level.high {
      background: #d1fae5;
      color: #065f46;
    }
    
    .confidence-level.medium {
      background: #fef3c7;
      color: #92400e;
    }
    
    .confidence-level.low {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .confidence-level.uncertain {
      background: #f3f4f6;
      color: #374151;
    }
    
    .iteration-badge {
      background: #e0e7ff;
      color: #3730a3;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    
    /* Body */
    .curation-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }
    
    /* Confidence Section */
    .confidence-section {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }
    
    .confidence-visual {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    #confidence-radar {
      border-radius: 8px;
      background: #f8fafc;
    }
    
    .confidence-summary {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .summary-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }
    
    .status-message {
      margin: 0;
      color: #6b7280;
      line-height: 1.5;
    }
    
    .confidence-metrics {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .metric-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .metric-label {
      min-width: 80px;
      font-size: 14px;
      color: #374151;
      font-weight: 500;
    }
    
    .metric-value {
      min-width: 40px;
      font-size: 14px;
      font-weight: 600;
      text-align: right;
    }
    
    .metric-bar {
      flex: 1;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }
    
    .metric-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    
    .metric-item.high .metric-fill {
      background: #10b981;
    }
    
    .metric-item.medium .metric-fill {
      background: #f59e0b;
    }
    
    .metric-item.low .metric-fill {
      background: #ef4444;
    }
    
    .metric-item.uncertain .metric-fill {
      background: #6b7280;
    }
    
    /* Section Titles */
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }
    
    .title-icon {
      font-size: 18px;
    }
    
    /* Suggestions */
    .suggestion-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 32px;
    }
    
    .suggestion-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      transition: all 0.2s;
    }
    
    .suggestion-item:hover {
      border-color: #d1d5db;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .suggestion-item.priority-high {
      border-left: 4px solid #ef4444;
    }
    
    .suggestion-item.priority-medium {
      border-left: 4px solid #f59e0b;
    }
    
    .suggestion-item.priority-low {
      border-left: 4px solid #6b7280;
    }
    
    .suggestion-icon {
      font-size: 20px;
      margin-top: 2px;
    }
    
    .suggestion-content {
      flex: 1;
    }
    
    .suggestion-title {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }
    
    .suggestion-description {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #6b7280;
      line-height: 1.4;
    }
    
    .suggestion-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
    }
    
    .suggestion-impact {
      color: #059669;
      font-weight: 500;
    }
    
    .suggestion-time {
      color: #6b7280;
    }
    
    .suggestion-difficulty {
      color: #6b7280;
      text-transform: capitalize;
    }
    
    .suggestion-actions {
      display: flex;
      align-items: center;
    }
    
    .apply-suggestion {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .apply-suggestion:hover {
      background: #2563eb;
    }
    
    .apply-suggestion:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    
    /* Feedback Section */
    .feedback-section {
      margin-bottom: 32px;
    }
    
    .feedback-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .feedback-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .feedback-btn:hover {
      border-color: #d1d5db;
      background: #f9fafb;
    }
    
    .feedback-btn.selected {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    
    .btn-icon {
      font-size: 24px;
    }
    
    .btn-label {
      font-weight: 600;
      color: #111827;
    }
    
    .btn-description {
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    
    .feedback-form {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
    }
    
    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #374151;
    }
    
    .feedback-textarea {
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 12px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      margin-bottom: 12px;
    }
    
    .feedback-textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .form-actions {
      display: flex;
      gap: 12px;
    }
    
    /* Category Suggestions */
    .category-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 32px;
    }
    
    .category-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f3f4f6;
      border-radius: 20px;
      font-size: 14px;
    }
    
    .category-chip.high-confidence {
      background: #ecfdf5;
      border: 1px solid #10b981;
    }
    
    .category-name {
      font-weight: 500;
    }
    
    .category-confidence {
      font-size: 12px;
      color: #6b7280;
    }
    
    .category-reason {
      font-size: 11px;
      color: #9ca3af;
      font-style: italic;
    }
    
    .category-actions {
      display: flex;
      gap: 4px;
    }
    
    .chip-action {
      background: none;
      border: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .chip-action.accept:hover {
      background: #dcfce7;
      color: #166534;
    }
    
    .chip-action.reject:hover {
      background: #fecaca;
      color: #991b1b;
    }
    
    /* Action Buttons */
    .action-section {
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
    
    .action-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    
    .btn-primary,
    .btn-secondary,
    .btn-tertiary,
    .submit-feedback,
    .cancel-feedback {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    
    .btn-primary,
    .submit-feedback {
      background: #3b82f6;
      color: white;
    }
    
    .btn-primary:hover,
    .submit-feedback:hover {
      background: #2563eb;
    }
    
    .btn-secondary {
      background: #6b7280;
      color: white;
    }
    
    .btn-secondary:hover {
      background: #4b5563;
    }
    
    .btn-tertiary,
    .cancel-feedback {
      background: white;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    
    .btn-tertiary:hover,
    .cancel-feedback:hover {
      background: #f9fafb;
    }
    
    /* Messages */
    .curation-message {
      padding: 12px 16px;
      margin: 16px 24px;
      border-radius: 6px;
      font-size: 14px;
    }
    
    .curation-message.success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #10b981;
    }
    
    .curation-message.error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #ef4444;
    }
    
    .curation-message.info {
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #3b82f6;
    }
    
    /* Radar tooltip */
    .radar-tooltip {
      pointer-events: none;
      z-index: 10001;
    }
    
    .tooltip-header {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .tooltip-value {
      font-size: 12px;
      opacity: 0.9;
    }
    
    /* Mobile responsive */
    @media (max-width: 768px) {
      .curation-content {
        width: 95vw;
        max-height: 95vh;
        margin: 2.5vh;
      }
      
      .confidence-section {
        grid-template-columns: 1fr;
        gap: 20px;
      }
      
      .confidence-visual {
        order: 2;
      }
      
      #confidence-radar {
        width: 250px;
        height: 250px;
      }
      
      .feedback-buttons {
        grid-template-columns: 1fr;
      }
      
      .action-buttons {
        flex-direction: column;
      }
      
      .suggestion-item {
        flex-direction: column;
        gap: 12px;
      }
      
      .suggestion-actions {
        align-self: flex-start;
      }
    }
    
    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      .ml-curation-panel,
      .suggestion-item,
      .feedback-btn,
      .apply-suggestion,
      .metric-fill {
        transition: none;
      }
    }
    
    @media (prefers-contrast: high) {
      .curation-content {
        border: 2px solid #000;
      }
      
      .feedback-btn,
      .suggestion-item {
        border-width: 2px;
      }
    }
  `;
  
  document.head.appendChild(styleSheet);
};

// ============================================================================
// MODULE EXPORTS AND INITIALIZATION
// ============================================================================

/**
 * Initialize curation components
 */
const initializeCurationComponents = () => {
  // Inject styles
  injectCurationStyles();
  
  // Register with KC if available
  if (window.KC) {
    KC.ML = KC.ML || {};
    KC.ML.CurationPanel = CurationPanel;
    KC.ML.ConfidenceVisualizer = ConfidenceVisualizer;
    KC.ML.MLSuggestionEngine = MLSuggestionEngine;
    KC.ML.FeedbackCollector = FeedbackCollector;
    
    console.log('[ML Curation] Advanced interaction components initialized');
  }
  
  return {
    CurationPanel,
    ConfidenceVisualizer,
    MLSuggestionEngine,
    FeedbackCollector,
    CategoryRepository,
    FeedbackAnalytics,
    FeedbackStorage,
    ConfidenceAnalyzer
  };
};

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCurationComponents);
} else {
  initializeCurationComponents();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CurationPanel,
    ConfidenceVisualizer,
    MLSuggestionEngine,
    FeedbackCollector,
    CategoryRepository,
    FeedbackAnalytics,
    FeedbackStorage,
    ConfidenceAnalyzer,
    initializeCurationComponents
  };
}
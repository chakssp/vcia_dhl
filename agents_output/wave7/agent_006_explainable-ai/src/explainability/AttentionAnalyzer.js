/**
 * AttentionAnalyzer.js
 * 
 * Analyzes attention mechanisms in ML models to understand focus areas.
 * Provides visualization of attention weights and patterns.
 */

export class AttentionAnalyzer {
  constructor(options = {}) {
    this.config = {
      method: options.method || 'integrated_gradients', // integrated_gradients, gradient_input, deeplift
      nSteps: options.nSteps || 50,
      baseline: options.baseline || 'zero', // zero, mean, random
      smoothing: options.smoothing || true,
      smoothingWindow: options.smoothingWindow || 3,
      topK: options.topK || 10
    };
    
    // Attention pattern detector
    this.patternDetector = new AttentionPatternDetector();
    
    // Temporal attention analyzer
    this.temporalAnalyzer = new TemporalAttentionAnalyzer();
    
    // Cross-dimensional analyzer
    this.crossDimensionalAnalyzer = new CrossDimensionalAnalyzer();
  }
  
  /**
   * Analyze attention patterns for an instance
   */
  async analyze(instance, dimensions) {
    // Calculate attention weights for each dimension
    const attentionWeights = await this.calculateAttentionWeights(
      instance,
      dimensions
    );
    
    // Identify focus areas
    const focusAreas = this.identifyFocusAreas(attentionWeights);
    
    // Detect attention patterns
    const patterns = this.patternDetector.detect(attentionWeights);
    
    // Analyze temporal attention if applicable
    const temporalAttention = await this.analyzeTemporalAttention(
      instance,
      attentionWeights
    );
    
    // Cross-dimensional analysis
    const crossDimensional = this.crossDimensionalAnalyzer.analyze(
      dimensions,
      attentionWeights
    );
    
    // Calculate attention statistics
    const statistics = this.calculateStatistics(attentionWeights);
    
    return {
      weights: attentionWeights,
      focusAreas,
      patterns,
      temporalAttention,
      crossDimensional,
      statistics,
      visualization: await this.prepareVisualization(attentionWeights)
    };
  }
  
  /**
   * Calculate attention weights using selected method
   */
  async calculateAttentionWeights(instance, dimensions) {
    switch (this.config.method) {
      case 'integrated_gradients':
        return await this.integratedGradients(instance, dimensions);
        
      case 'gradient_input':
        return await this.gradientInput(instance, dimensions);
        
      case 'deeplift':
        return await this.deeplift(instance, dimensions);
        
      default:
        return await this.integratedGradients(instance, dimensions);
    }
  }
  
  /**
   * Integrated Gradients method for attention calculation
   */
  async integratedGradients(instance, dimensions) {
    const baseline = this.createBaseline(instance);
    const nSteps = this.config.nSteps;
    const weights = {};
    
    // Extract features
    const features = await this.extractFeatures(instance);
    const baselineFeatures = await this.extractFeatures(baseline);
    
    // For each feature, calculate integrated gradient
    for (const feature of Object.keys(features)) {
      let integratedGradient = 0;
      
      // Interpolate between baseline and instance
      for (let step = 0; step <= nSteps; step++) {
        const alpha = step / nSteps;
        const interpolated = this.interpolate(
          baselineFeatures[feature],
          features[feature],
          alpha
        );
        
        // Calculate gradient at interpolated point
        const gradient = await this.calculateGradient(
          instance,
          feature,
          interpolated,
          dimensions
        );
        
        integratedGradient += gradient / nSteps;
      }
      
      // Multiply by input difference
      const inputDiff = features[feature] - baselineFeatures[feature];
      weights[feature] = Math.abs(integratedGradient * inputDiff);
    }
    
    // Normalize weights
    return this.normalizeWeights(weights);
  }
  
  /**
   * Gradient × Input method
   */
  async gradientInput(instance, dimensions) {
    const features = await this.extractFeatures(instance);
    const weights = {};
    
    for (const feature of Object.keys(features)) {
      // Calculate gradient
      const gradient = await this.calculateGradient(
        instance,
        feature,
        features[feature],
        dimensions
      );
      
      // Multiply by input
      weights[feature] = Math.abs(gradient * features[feature]);
    }
    
    return this.normalizeWeights(weights);
  }
  
  /**
   * DeepLIFT method (simplified)
   */
  async deeplift(instance, dimensions) {
    const baseline = this.createBaseline(instance);
    const weights = {};
    
    const features = await this.extractFeatures(instance);
    const baselineFeatures = await this.extractFeatures(baseline);
    
    // Calculate reference activations
    const baselineOutput = await this.getModelOutput(baseline, dimensions);
    const instanceOutput = await this.getModelOutput(instance, dimensions);
    
    for (const feature of Object.keys(features)) {
      // Calculate contribution score
      const contribution = await this.calculateContribution(
        feature,
        features[feature],
        baselineFeatures[feature],
        instanceOutput,
        baselineOutput
      );
      
      weights[feature] = Math.abs(contribution);
    }
    
    return this.normalizeWeights(weights);
  }
  
  /**
   * Identify areas of high attention
   */
  identifyFocusAreas(weights) {
    const sorted = Object.entries(weights)
      .sort(([,a], [,b]) => b - a);
    
    const focusAreas = [];
    const threshold = this.calculateDynamicThreshold(weights);
    
    for (const [feature, weight] of sorted) {
      if (weight >= threshold) {
        focusAreas.push({
          area: feature,
          weight,
          intensity: this.categorizeIntensity(weight),
          rank: focusAreas.length + 1
        });
      }
      
      if (focusAreas.length >= this.config.topK) break;
    }
    
    return focusAreas;
  }
  
  /**
   * Analyze temporal attention patterns
   */
  async analyzeTemporalAttention(instance, weights) {
    // Check if instance has temporal data
    if (!instance.history || instance.history.length < 2) {
      return null;
    }
    
    return this.temporalAnalyzer.analyze(
      instance.history,
      weights
    );
  }
  
  /**
   * Calculate attention statistics
   */
  calculateStatistics(weights) {
    const values = Object.values(weights);
    
    return {
      mean: this.mean(values),
      std: this.std(values),
      max: Math.max(...values),
      min: Math.min(...values),
      entropy: this.calculateEntropy(values),
      gini: this.calculateGini(values),
      concentration: this.calculateConcentration(values),
      sparsity: this.calculateSparsity(values)
    };
  }
  
  /**
   * Generate attention heatmap
   */
  async generateHeatmap(weights) {
    const heatmapData = {
      type: 'attention_heatmap',
      data: [],
      colorScale: {
        min: 0,
        max: 1,
        colormap: 'viridis'
      },
      annotations: []
    };
    
    // Convert weights to heatmap format
    const features = Object.keys(weights);
    const gridSize = Math.ceil(Math.sqrt(features.length));
    
    let index = 0;
    for (let row = 0; row < gridSize; row++) {
      const rowData = [];
      for (let col = 0; col < gridSize; col++) {
        if (index < features.length) {
          const feature = features[index];
          rowData.push({
            value: weights[feature],
            label: this.abbreviateFeature(feature),
            fullName: feature
          });
          index++;
        } else {
          rowData.push({ value: 0, label: '', fullName: '' });
        }
      }
      heatmapData.data.push(rowData);
    }
    
    // Add annotations for high attention areas
    const focusAreas = this.identifyFocusAreas(weights);
    for (const area of focusAreas.slice(0, 3)) {
      const position = this.findFeaturePosition(area.area, features, gridSize);
      if (position) {
        heatmapData.annotations.push({
          x: position.col,
          y: position.row,
          text: `${(area.weight * 100).toFixed(0)}%`,
          style: 'bold'
        });
      }
    }
    
    return heatmapData;
  }
  
  /**
   * Prepare visualization data
   */
  async prepareVisualization(weights) {
    return {
      heatmap: await this.generateHeatmap(weights),
      barChart: this.createBarChart(weights),
      radialChart: this.createRadialChart(weights),
      flowDiagram: this.createFlowDiagram(weights)
    };
  }
  
  /**
   * Create bar chart visualization
   */
  createBarChart(weights) {
    const sorted = Object.entries(weights)
      .sort(([,a], [,b]) => b - a)
      .slice(0, this.config.topK);
    
    return {
      type: 'bar_chart',
      data: sorted.map(([feature, weight]) => ({
        feature: this.humanizeFeature(feature),
        weight,
        percentage: (weight * 100).toFixed(1)
      })),
      options: {
        title: 'Attention Weights by Feature',
        xLabel: 'Attention Weight',
        yLabel: 'Features',
        color: '#4CAF50'
      }
    };
  }
  
  /**
   * Create radial chart visualization
   */
  createRadialChart(weights) {
    const features = Object.keys(weights);
    const angleStep = (2 * Math.PI) / features.length;
    
    return {
      type: 'radial_chart',
      data: features.map((feature, index) => ({
        angle: index * angleStep,
        radius: weights[feature],
        label: this.abbreviateFeature(feature),
        feature
      })),
      options: {
        title: 'Attention Distribution',
        maxRadius: 1,
        rings: [0.2, 0.4, 0.6, 0.8, 1.0]
      }
    };
  }
  
  /**
   * Create flow diagram showing attention flow
   */
  createFlowDiagram(weights) {
    const nodes = [];
    const edges = [];
    
    // Create input node
    nodes.push({
      id: 'input',
      type: 'input',
      label: 'Input'
    });
    
    // Create feature nodes
    const topFeatures = Object.entries(weights)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    for (const [feature, weight] of topFeatures) {
      const nodeId = `feature_${feature}`;
      nodes.push({
        id: nodeId,
        type: 'feature',
        label: this.humanizeFeature(feature),
        weight
      });
      
      // Add edge from input
      edges.push({
        from: 'input',
        to: nodeId,
        weight,
        label: `${(weight * 100).toFixed(0)}%`
      });
    }
    
    // Create output node
    nodes.push({
      id: 'output',
      type: 'output',
      label: 'Output'
    });
    
    // Add edges to output
    for (const [feature, weight] of topFeatures) {
      edges.push({
        from: `feature_${feature}`,
        to: 'output',
        weight: weight * 0.8
      });
    }
    
    return {
      type: 'flow_diagram',
      nodes,
      edges,
      layout: 'hierarchical'
    };
  }
  
  /**
   * Helper methods
   */
  
  createBaseline(instance) {
    switch (this.config.baseline) {
      case 'zero':
        return this.createZeroBaseline(instance);
      case 'mean':
        return this.createMeanBaseline(instance);
      case 'random':
        return this.createRandomBaseline(instance);
      default:
        return this.createZeroBaseline(instance);
    }
  }
  
  createZeroBaseline(instance) {
    return {
      ...instance,
      content: '',
      categories: [],
      relevanceScore: 0
    };
  }
  
  createMeanBaseline(instance) {
    // In practice, would use dataset statistics
    return {
      ...instance,
      content: 'average content placeholder',
      categories: ['General'],
      relevanceScore: 50
    };
  }
  
  createRandomBaseline(instance) {
    return {
      ...instance,
      content: this.generateRandomContent(100),
      categories: [],
      relevanceScore: Math.random() * 100
    };
  }
  
  async extractFeatures(instance) {
    return {
      contentLength: instance.content?.length || 0,
      wordCount: this.countWords(instance.content),
      categoryPresence: instance.categories?.length > 0 ? 1 : 0,
      categoryCount: instance.categories?.length || 0,
      relevanceScore: instance.relevanceScore || 0,
      hasKeywords: this.hasKeywords(instance.content) ? 1 : 0,
      sentenceCount: this.countSentences(instance.content),
      avgWordLength: this.avgWordLength(instance.content)
    };
  }
  
  interpolate(baseline, instance, alpha) {
    if (typeof baseline === 'number') {
      return baseline + alpha * (instance - baseline);
    }
    return alpha > 0.5 ? instance : baseline;
  }
  
  async calculateGradient(instance, feature, value, dimensions) {
    // Simplified gradient calculation
    // In practice, would use automatic differentiation
    
    const epsilon = 0.001;
    const original = await this.getFeatureValue(instance, feature);
    
    // Set feature to value + epsilon
    const instancePlus = await this.setFeatureValue(instance, feature, value + epsilon);
    const outputPlus = await this.getModelOutput(instancePlus, dimensions);
    
    // Set feature to value - epsilon
    const instanceMinus = await this.setFeatureValue(instance, feature, value - epsilon);
    const outputMinus = await this.getModelOutput(instanceMinus, dimensions);
    
    // Restore original
    await this.setFeatureValue(instance, feature, original);
    
    // Calculate gradient
    return (outputPlus - outputMinus) / (2 * epsilon);
  }
  
  async getModelOutput(instance, dimensions) {
    // Simulate model output
    let output = 0;
    
    for (const [dim, value] of Object.entries(dimensions)) {
      output += value;
    }
    
    return output / Object.keys(dimensions).length;
  }
  
  async calculateContribution(feature, instanceValue, baselineValue, instanceOutput, baselineOutput) {
    const outputDiff = instanceOutput - baselineOutput;
    const inputDiff = instanceValue - baselineValue;
    
    if (inputDiff === 0) return 0;
    
    // Simplified contribution calculation
    return outputDiff * (inputDiff / (Math.abs(inputDiff) + 1));
  }
  
  normalizeWeights(weights) {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    
    if (sum === 0) return weights;
    
    const normalized = {};
    for (const [feature, weight] of Object.entries(weights)) {
      normalized[feature] = weight / sum;
    }
    
    // Apply smoothing if configured
    if (this.config.smoothing) {
      return this.smoothWeights(normalized);
    }
    
    return normalized;
  }
  
  smoothWeights(weights) {
    const smoothed = {};
    const features = Object.keys(weights);
    const window = this.config.smoothingWindow;
    
    for (let i = 0; i < features.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - window); j <= Math.min(features.length - 1, i + window); j++) {
        sum += weights[features[j]];
        count++;
      }
      
      smoothed[features[i]] = sum / count;
    }
    
    return smoothed;
  }
  
  calculateDynamicThreshold(weights) {
    const values = Object.values(weights);
    const mean = this.mean(values);
    const std = this.std(values);
    
    // Dynamic threshold: mean + 1 standard deviation
    return Math.min(mean + std, 0.9);
  }
  
  categorizeIntensity(weight) {
    if (weight >= 0.8) return 'very_high';
    if (weight >= 0.6) return 'high';
    if (weight >= 0.4) return 'medium';
    if (weight >= 0.2) return 'low';
    return 'very_low';
  }
  
  calculateEntropy(values) {
    if (values.length === 0) return 0;
    
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0;
    
    let entropy = 0;
    for (const value of values) {
      if (value > 0) {
        const p = value / sum;
        entropy -= p * Math.log2(p);
      }
    }
    
    return entropy / Math.log2(values.length); // Normalize to [0, 1]
  }
  
  calculateGini(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    if (sum === 0) return 0;
    
    let giniSum = 0;
    for (let i = 0; i < n; i++) {
      giniSum += (2 * (i + 1) - n - 1) * sorted[i];
    }
    
    return giniSum / (n * sum);
  }
  
  calculateConcentration(values) {
    const sorted = [...values].sort((a, b) => b - a);
    const total = sorted.reduce((a, b) => a + b, 0);
    
    if (total === 0) return 0;
    
    // Percentage of attention in top 20% of features
    const topK = Math.ceil(sorted.length * 0.2);
    const topSum = sorted.slice(0, topK).reduce((a, b) => a + b, 0);
    
    return topSum / total;
  }
  
  calculateSparsity(values) {
    const threshold = 0.01;
    const sparse = values.filter(v => v < threshold).length;
    return sparse / values.length;
  }
  
  abbreviateFeature(feature) {
    const words = feature.split(/(?=[A-Z])|\s+/);
    if (words.length > 1) {
      return words.map(w => w[0].toUpperCase()).join('');
    }
    return feature.substring(0, 3).toUpperCase();
  }
  
  findFeaturePosition(feature, features, gridSize) {
    const index = features.indexOf(feature);
    if (index === -1) return null;
    
    return {
      row: Math.floor(index / gridSize),
      col: index % gridSize
    };
  }
  
  humanizeFeature(feature) {
    return feature
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  async getFeatureValue(instance, feature) {
    const features = await this.extractFeatures(instance);
    return features[feature];
  }
  
  async setFeatureValue(instance, feature, value) {
    // This is simplified - in practice would properly modify instance
    const modified = { ...instance };
    
    switch (feature) {
      case 'contentLength':
        modified.content = 'x'.repeat(Math.max(0, Math.round(value)));
        break;
      case 'categoryCount':
        modified.categories = Array(Math.max(0, Math.round(value))).fill('Category');
        break;
      case 'relevanceScore':
        modified.relevanceScore = value;
        break;
    }
    
    return modified;
  }
  
  generateRandomContent(length) {
    const words = ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog'];
    let content = '';
    
    while (content.length < length) {
      content += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    
    return content.substring(0, length);
  }
  
  countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }
  
  countSentences(text) {
    if (!text) return 0;
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }
  
  avgWordLength(text) {
    if (!text) return 0;
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 0;
    
    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    return totalLength / words.length;
  }
  
  hasKeywords(text) {
    if (!text) return false;
    const keywords = ['important', 'critical', 'key', 'essential', 'significant'];
    const lowerText = text.toLowerCase();
    
    return keywords.some(kw => lowerText.includes(kw));
  }
  
  mean(values) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  std(values) {
    const m = this.mean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

/**
 * Attention pattern detector
 */
class AttentionPatternDetector {
  detect(weights) {
    const patterns = [];
    
    // Detect focused attention
    if (this.isFocused(weights)) {
      patterns.push({
        type: 'focused',
        description: 'Attention is highly concentrated on few features',
        confidence: 0.9
      });
    }
    
    // Detect distributed attention
    if (this.isDistributed(weights)) {
      patterns.push({
        type: 'distributed',
        description: 'Attention is spread across multiple features',
        confidence: 0.8
      });
    }
    
    // Detect hierarchical attention
    if (this.isHierarchical(weights)) {
      patterns.push({
        type: 'hierarchical',
        description: 'Attention follows a hierarchical pattern',
        confidence: 0.7
      });
    }
    
    return patterns;
  }
  
  isFocused(weights) {
    const values = Object.values(weights);
    const sorted = [...values].sort((a, b) => b - a);
    
    // Check if top 2 features have > 50% of attention
    const topTwo = sorted.slice(0, 2).reduce((a, b) => a + b, 0);
    return topTwo > 0.5;
  }
  
  isDistributed(weights) {
    const values = Object.values(weights);
    const std = this.calculateStd(values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Low coefficient of variation indicates distribution
    return std / mean < 0.5;
  }
  
  isHierarchical(weights) {
    const values = Object.values(weights);
    const sorted = [...values].sort((a, b) => b - a);
    
    // Check for exponential decay pattern
    let isExponential = true;
    for (let i = 1; i < Math.min(5, sorted.length); i++) {
      if (sorted[i] > sorted[i-1] * 0.8) {
        isExponential = false;
        break;
      }
    }
    
    return isExponential;
  }
  
  calculateStd(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

/**
 * Temporal attention analyzer
 */
class TemporalAttentionAnalyzer {
  analyze(history, currentWeights) {
    const temporal = {
      trend: this.analyzeTrend(history),
      stability: this.analyzeStability(history),
      peaks: this.findPeaks(history),
      cycles: this.detectCycles(history)
    };
    
    return temporal;
  }
  
  analyzeTrend(history) {
    // Simple linear trend analysis
    const weights = history.map(h => h.overallWeight || 0.5);
    const n = weights.length;
    
    if (n < 2) return { direction: 'stable', strength: 0 };
    
    // Calculate slope
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += weights[i];
      sumXY += i * weights[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return {
      direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
      strength: Math.abs(slope),
      slope
    };
  }
  
  analyzeStability(history) {
    const weights = history.map(h => h.overallWeight || 0.5);
    
    if (weights.length < 2) return { stable: true, volatility: 0 };
    
    // Calculate volatility
    let sumDiff = 0;
    for (let i = 1; i < weights.length; i++) {
      sumDiff += Math.abs(weights[i] - weights[i-1]);
    }
    
    const volatility = sumDiff / (weights.length - 1);
    
    return {
      stable: volatility < 0.1,
      volatility
    };
  }
  
  findPeaks(history) {
    const weights = history.map(h => h.overallWeight || 0.5);
    const peaks = [];
    
    for (let i = 1; i < weights.length - 1; i++) {
      if (weights[i] > weights[i-1] && weights[i] > weights[i+1]) {
        peaks.push({
          index: i,
          value: weights[i],
          timestamp: history[i].timestamp
        });
      }
    }
    
    return peaks;
  }
  
  detectCycles(history) {
    // Simple cycle detection using autocorrelation
    const weights = history.map(h => h.overallWeight || 0.5);
    
    if (weights.length < 10) return { hasCycles: false };
    
    const maxLag = Math.floor(weights.length / 2);
    let maxCorrelation = 0;
    let bestLag = 0;
    
    for (let lag = 1; lag < maxLag; lag++) {
      const correlation = this.autocorrelation(weights, lag);
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestLag = lag;
      }
    }
    
    return {
      hasCycles: maxCorrelation > 0.5,
      period: bestLag,
      strength: maxCorrelation
    };
  }
  
  autocorrelation(data, lag) {
    const n = data.length - lag;
    if (n <= 0) return 0;
    
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean);
    }
    
    for (let i = 0; i < data.length; i++) {
      denominator += Math.pow(data[i] - mean, 2);
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }
}

/**
 * Cross-dimensional analyzer
 */
class CrossDimensionalAnalyzer {
  analyze(dimensions, weights) {
    return {
      correlation: this.calculateCorrelation(dimensions, weights),
      dominantDimension: this.findDominantDimension(dimensions),
      balance: this.calculateBalance(dimensions),
      interactions: this.findInteractions(dimensions, weights)
    };
  }
  
  calculateCorrelation(dimensions, weights) {
    // Calculate correlation between attention weights and dimension scores
    const dimValues = Object.values(dimensions);
    const weightValues = Object.values(weights);
    
    // Ensure arrays are same length
    const minLength = Math.min(dimValues.length, weightValues.length);
    const dimSlice = dimValues.slice(0, minLength);
    const weightSlice = weightValues.slice(0, minLength);
    
    return this.pearsonCorrelation(dimSlice, weightSlice);
  }
  
  findDominantDimension(dimensions) {
    let maxDim = null;
    let maxValue = -1;
    
    for (const [dim, value] of Object.entries(dimensions)) {
      if (value > maxValue) {
        maxValue = value;
        maxDim = dim;
      }
    }
    
    return {
      dimension: maxDim,
      value: maxValue,
      percentage: (maxValue * 100).toFixed(1)
    };
  }
  
  calculateBalance(dimensions) {
    const values = Object.values(dimensions);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    // Lower variance indicates better balance
    const balance = 1 - Math.min(1, Math.sqrt(variance));
    
    return {
      score: balance,
      isBalanced: balance > 0.7,
      variance
    };
  }
  
  findInteractions(dimensions, weights) {
    const interactions = [];
    const dims = Object.keys(dimensions);
    
    // Find dimension pairs with high combined attention
    for (let i = 0; i < dims.length; i++) {
      for (let j = i + 1; j < dims.length; j++) {
        const interaction = {
          dimensions: [dims[i], dims[j]],
          strength: (dimensions[dims[i]] + dimensions[dims[j]]) / 2,
          type: this.classifyInteraction(dimensions[dims[i]], dimensions[dims[j]])
        };
        
        if (interaction.strength > 0.6) {
          interactions.push(interaction);
        }
      }
    }
    
    return interactions;
  }
  
  pearsonCorrelation(x, y) {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  classifyInteraction(score1, score2) {
    const diff = Math.abs(score1 - score2);
    
    if (diff < 0.1) return 'synergistic';
    if (score1 > 0.7 && score2 > 0.7) return 'reinforcing';
    if (score1 < 0.3 || score2 < 0.3) return 'compensating';
    return 'independent';
  }
}

export default AttentionAnalyzer;